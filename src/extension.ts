import * as vscode from 'vscode';
import * as path from 'path';
import { GitPlumbing } from './gitEngine';
import { AuthManager } from './auth';
import { GitHubService } from './githubService';
import { ReflogHunter } from './reflogEngine';
import { EducationalEngine } from './educationalEngine';
import { GitCommandService } from './gitCommandService';
import * as cp from 'child_process';

export function activate(context: vscode.ExtensionContext) {
    console.log('NGOPREK is now active!');

    // Register Command to Open Dashboard
    context.subscriptions.push(vscode.commands.registerCommand('ngoprek.openDashboard', () => {
        NgoPrekPanel.createOrShow(context.extensionUri);
    }));

    // Resurrection Command
    context.subscriptions.push(vscode.commands.registerCommand('ngoprek.resurrect', async (oid: string) => {
        const folders = vscode.workspace.workspaceFolders;
        if (folders && folders.length > 0) {
            const terminal = vscode.window.activeTerminal || vscode.window.createTerminal('NGOPREK');
            terminal.show();
            const branchName = `recovered-${oid.substring(0, 7)}-${Math.floor(Date.now() / 1000)}`;
            terminal.sendText(`git checkout -b ${branchName} ${oid}`);
            vscode.window.showInformationMessage(`Resurrecting commit ${oid.substring(0, 7)} as ${branchName}...`);
        }
    }));

    // Watcher: Monitor .git/objects for changes
    const gitWatcher = vscode.workspace.createFileSystemWatcher('**/.git/objects/**');

    const handleGitObjectChange = (uri: vscode.Uri) => {
        try {
            const match = uri.fsPath.match(/objects[\/\\]([0-9a-f]{2})[\/\\]([0-9a-f]{38})/i);
            
            if (match) {
                const oid = match[1] + match[2];
                const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);
                
                if (workspaceFolder) {
                    const gitObject = GitPlumbing.readObject(workspaceFolder.uri.fsPath, oid);
                    
                    if (gitObject) {
                         NgoPrekPanel.currentPanel?.sendMessage({ 
                             command: 'gitObjectChanged', 
                             data: gitObject 
                         });

                         // Educational Tidbits
                         if (gitObject.type === 'commit') {
                             EducationalEngine.sendTidbit(NgoPrekPanel.currentPanel, 'commit');
                         } else if (gitObject.type === 'blob') {
                             EducationalEngine.sendTidbit(NgoPrekPanel.currentPanel, 'add');
                         }
                    }
                }
            }
        } catch (e) {
            console.error("Error handling git object change:", e);
        }
    };

    gitWatcher.onDidCreate(handleGitObjectChange);
    gitWatcher.onDidChange(handleGitObjectChange);
    context.subscriptions.push(gitWatcher);
}

class NgoPrekPanel {
    public static currentPanel: NgoPrekPanel | undefined;
    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private _disposables: vscode.Disposable[] = [];
    private _githubService: GitHubService | undefined;
    private _pollInterval: NodeJS.Timeout | undefined;

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
        this._panel = panel;
        this._extensionUri = extensionUri;

        // Set the webview's initial html content
        this._update();

        // Listen for when the panel is disposed
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

        // Handle messages from the webview
        this._panel.webview.onDidReceiveMessage(
            async message => {
                switch (message.command) {
                    case 'alert':
                        vscode.window.showErrorMessage(message.text);
                        return;
                    case 'webviewReady':
                        this.initCloudLayer();
                        return;
                    case 'deployToCloud':
                        await this.handleDeploy();
                        return;
                    case 'fetchReflog':
                        this.handleFetchReflog();
                        return;
                    case 'resurrectCommit':
                        vscode.commands.executeCommand('ngoprek.resurrect', message.oid);
                        return;
                    case 'gitAdd':
                        await this.handleGitAdd(message.path);
                        return;
                    case 'gitUnstage':
                        await this.handleGitUnstage(message.path);
                        return;
                    case 'gitCommit':
                        await this.handleGitCommit(message.message);
                        return;
                    case 'gitPush':
                        await this.handleGitPush();
                        return;
                    case 'gitPull':
                        await this.handleGitPull();
                        return;
                    case 'openGitk':
                        await this.handleOpenGitk();
                        return;
                    case 'refreshState':
                        this.pushGitStatus();
                        return;
                    case 'terminalCommand':
                        this.handleTerminalCommand(message.text);
                        return;
                }
            },
            null,
            this._disposables
        );
    }

    private handleTerminalCommand(text: string) {
        const folders = vscode.workspace.workspaceFolders;
        if (!folders) return;

        const cwd = folders[0].uri.fsPath;

        // Send echo of the command back
        this.sendMessage({
            command: 'terminalOutput',
            data: `\u001b[32m$ ${text}\u001b[0m`
        });

        cp.exec(text, { cwd }, (error: any, stdout: string, stderr: string) => {
            if (stdout) {
                this.sendMessage({
                    command: 'terminalOutput',
                    data: stdout
                });
            }
            if (stderr) {
                this.sendMessage({
                    command: 'terminalOutput',
                    data: `\u001b[31m${stderr}\u001b[0m`
                });
            }
            if (error && !stderr) {
                this.sendMessage({
                    command: 'terminalOutput',
                    data: `\u001b[31mError: ${error.message}\u001b[0m`
                });
            }
            
            // Auto refresh status if git command
            if (text.trim().startsWith('git ')) {
                this.pushGitStatus();
                this.pushInitialGitObjects();
            }
        });
    }

    private async handleGitAdd(filePath: string) {
        const folders = vscode.workspace.workspaceFolders;
        if (folders) {
            await GitCommandService.add(folders[0].uri.fsPath, filePath);
            this.pushGitStatus();
        }
    }

    private async handleGitUnstage(filePath: string) {
        const folders = vscode.workspace.workspaceFolders;
        if (folders) {
            await GitCommandService.unstage(folders[0].uri.fsPath, filePath);
            this.pushGitStatus();
        }
    }

    private async handleGitCommit(message: string) {
        const folders = vscode.workspace.workspaceFolders;
        if (folders) {
            try {
                await GitCommandService.commit(folders[0].uri.fsPath, message);
                vscode.window.showInformationMessage(`NGOPREK: Committed "${message}"`);
                this.pushGitStatus();
            } catch (e: any) {
                vscode.window.showErrorMessage(`Commit Failed: ${e.stderr || e.message}`);
            }
        }
    }

    private async handleGitPush() {
        const folders = vscode.workspace.workspaceFolders;
        if (folders) {
            vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: "NGOPREK: Pushing to Remote..." }, async () => {
                try {
                    await GitCommandService.push(folders[0].uri.fsPath);
                    vscode.window.showInformationMessage("NGOPREK: Push Successful!");
                } catch (e: any) {
                    vscode.window.showErrorMessage(`Push Failed: ${e.stderr || e.message}`);
                }
            });
        }
    }

    private async handleGitPull() {
        const folders = vscode.workspace.workspaceFolders;
        if (folders) {
            vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: "NGOPREK: Pulling Changes..." }, async () => {
                try {
                    await GitCommandService.pull(folders[0].uri.fsPath);
                    vscode.window.showInformationMessage("NGOPREK: Pull Successful!");
                    this.pushGitStatus();
                } catch (e: any) {
                    // Conflict handled by service
                }
            });
        }
    }

    private async handleOpenGitk() {
        const folders = vscode.workspace.workspaceFolders;
        if (folders) {
            await GitCommandService.openGitk(folders[0].uri.fsPath);
        }
    }

    private async pushGitStatus() {
        const folders = vscode.workspace.workspaceFolders;
        if (folders) {
            try {
                const status = await GitCommandService.getStatus(folders[0].uri.fsPath);
                this.sendMessage({
                    command: 'gitStatusUpdate',
                    status: status
                });
            } catch (e) {
                console.error("Failed to push git status:", e);
            }
        }
    }

    private async pushInitialGitObjects() {
        const folders = vscode.workspace.workspaceFolders;
        if (folders) {
            const gitRoot = folders[0].uri.fsPath;
            const oids = await GitCommandService.getRecentCommitOids(gitRoot, 15);
            
            for (const oid of oids) {
                const gitObject = GitPlumbing.readObject(gitRoot, oid);
                if (gitObject) {
                    this.sendMessage({
                        command: 'gitObjectChanged',
                        data: gitObject
                    });
                }
            }
        }
    }

    private handleFetchReflog() {
        const folders = vscode.workspace.workspaceFolders;
        if (folders && folders.length > 0) {
            const gitRoot = folders[0].uri.fsPath;
            const entries = ReflogHunter.hunt(gitRoot);
            const ghosts = ReflogHunter.findGhosts(entries);
            this.sendMessage({
                command: 'reflogData',
                data: ghosts
            });
            EducationalEngine.sendTidbit(this, 'ghost');
        }
    }

    private async initCloudLayer() {
        // ALWAYS push git status, regardless of GitHub auth
        this.pushGitStatus();
        this.pushInitialGitObjects();
        
        // Initial polling for local status
        this._pollInterval = setInterval(() => {
            this.pushGitStatus();
        }, 5000);

        const token = await AuthManager.getSession();
        if (token) {
            this._githubService = new GitHubService(token.accessToken);
            // Initial fetch of cloud data
            this.pushCloudStatus();
            
            // Add cloud polling to the interval
            const cloudInterval = setInterval(() => {
                this.pushCloudStatus();
            }, 15000);

            this._disposables.push({ dispose: () => clearInterval(cloudInterval) });
        }
    }

    private async pushCloudStatus() {
        if (!this._githubService) return;
        try {
            const user = await this._githubService.getUser();
            // Assuming current workspace corresponds to a repo with the same name as the folder
            // In a real app, we would parse .git/config to find the remote
            const workspaceName = vscode.workspace.name || 'ngoprek-repo';
            const runs = await this._githubService.getRecentWorkflowRuns(user.login, workspaceName);

            this.sendMessage({
                command: 'cloudStatusUpdate',
                user: { login: user.login, avatar_url: user.avatar_url },
                workflows: runs,
                repoUrl: `https://github.com/${user.login}/${workspaceName}`
            });
        } catch (e) {
            console.error("Cloud status update failed:", e);
        }
    }

    private async handleDeploy() {
        const token = await AuthManager.getGitHubToken();
        if (!token) return;

        this._githubService = new GitHubService(token);
        const workspaceName = vscode.workspace.name || 'ngoprek-demo';

        vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "NGOPREK: Flying to Cloud...",
            cancellable: false
        }, async (progress) => {
            try {
                progress.report({ message: "Checking Repository..." });
                const repoUrl = await this._githubService!.createRepoIfNotExists(workspaceName, false);
                
                progress.report({ message: "Enabling GitHub Pages..." });
                // Assuming the user is the owner
                const user = await this._githubService!.getUser();
                await this._githubService!.enablePages(user.login, workspaceName);

                progress.report({ message: `Deployed to ${repoUrl}` });
                vscode.window.showInformationMessage(`NGOPREK: Repository Ready at ${repoUrl}`);
                
                // Immediately update status
                this.pushCloudStatus();
            } catch (error: any) {
                vscode.window.showErrorMessage(`Deployment Failed: ${error.message}`);
            }
        });
    }

    public static createOrShow(extensionUri: vscode.Uri) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        if (NgoPrekPanel.currentPanel) {
            NgoPrekPanel.currentPanel._panel.reveal(column);
            return;
        }

        const panel = vscode.window.createWebviewPanel(
            'ngoprekDashboard',
            'NGOPREK Dashboard',
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'webview-ui', 'dist')]
            }
        );

        NgoPrekPanel.currentPanel = new NgoPrekPanel(panel, extensionUri);
    }

    public sendMessage(message: any) {
        this._panel.webview.postMessage(message);
    }

    public dispose() {
        NgoPrekPanel.currentPanel = undefined;
        if (this._pollInterval) clearInterval(this._pollInterval);
        this._panel.dispose();
        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) x.dispose();
        }
    }

    private _update() {
        const webview = this._panel.webview;
        this._panel.title = "NGOPREK Dashboard";
        this._panel.webview.html = this._getHtmlForWebview(webview);
    }

    private _getHtmlForWebview(webview: vscode.Webview) {
        // Local path to main script run in the webview
        const scriptPathOnDisk = vscode.Uri.joinPath(this._extensionUri, 'webview-ui', 'dist', 'assets', 'index.js');
        const stylePathOnDisk = vscode.Uri.joinPath(this._extensionUri, 'webview-ui', 'dist', 'assets', 'index.css');

        // And the uri we use to load this script in the webview
        const scriptUri = webview.asWebviewUri(scriptPathOnDisk);
        const styleUri = webview.asWebviewUri(stylePathOnDisk);
        
        // Use a nonce to only allow specific scripts to be run
        const nonce = getNonce();

        return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta http-equiv="Content-Security-Policy" content="default-src 'none'; 
                    style-src ${webview.cspSource} 'unsafe-inline'; 
                    script-src 'nonce-${nonce}' ${webview.cspSource} 'unsafe-eval'; 
                    img-src ${webview.cspSource} https: data:; 
                    font-src ${webview.cspSource} https: data:;
                    connect-src ${webview.cspSource} https:;">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <link href="${styleUri}" rel="stylesheet">
                <title>NGOPREK Dashboard</title>
            </head>
            <body>
                <div id="root"></div>
                <script nonce="${nonce}" type="module" src="${scriptUri}"></script>
            </body>
            </html>`;
    }
}

function getNonce() {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}

export function deactivate() {}
