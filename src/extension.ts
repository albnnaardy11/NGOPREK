import * as vscode from 'vscode';
import * as path from 'path';
import { GitPlumbing, GitObject } from './gitEngine';
import { AuthManager } from './auth';
import { GitHubService } from './githubService';

export function activate(context: vscode.ExtensionContext) {
    console.log('NGOPREK is now active!');

    // Register Command to Open Dashboard
    let disposable = vscode.commands.registerCommand('ngoprek.openDashboard', () => {
        NgoPrekPanel.createOrShow(context.extensionUri);
    });

    context.subscriptions.push(disposable);

    // Watcher: Monitor .git/objects for changes
    const gitWatcher = vscode.workspace.createFileSystemWatcher('**/.git/objects/**');

    const handleGitObjectChange = (uri: vscode.Uri) => {
        try {
            // Extract OID from path: .git/objects/12/3456789...
            // Win path: .git\objects\12\3456789...
            const match = uri.fsPath.match(/objects[\/\\]([0-9a-f]{2})[\/\\]([0-9a-f]{38})/i);
            
            if (match) {
                const oid = match[1] + match[2];
                // Find git root (assuming standard layout for now) or travel up
                // For simplicity, we use the workspace folder logic or assume it is proportional to the uri
                const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);
                
                if (workspaceFolder) {
                    const gitObject = GitPlumbing.readObject(workspaceFolder.uri.fsPath, oid);
                    
                    if (gitObject) {
                         NgoPrekPanel.currentPanel?.sendMessage({ 
                             command: 'gitObjectChanged', 
                             text: 'New Git Object detected!',
                             data: gitObject 
                         });

                         // Sprint 4: Educational Tidbits
                         if (gitObject.type === 'commit') {
                             NgoPrekPanel.currentPanel?.sendMessage({
                                 command: 'educationalTidbit',
                                 title: 'Apa itu SHA-1?',
                                 content: `Hash '${oid.substring(0, 7)}...' bukan sekadar nama unik. Ia adalah hasil perhitungan biner (SHA-1) dari isi file Anda. Jika isi file berubah 1 bit saja, SHA-1 akan berubah total! Inilah yang menjaga integritas data Git.`
                             });
                         } else if (gitObject.type === 'blob') {
                             NgoPrekPanel.currentPanel?.sendMessage({
                                 command: 'educationalTidbit',
                                 title: 'Blob Detected!',
                                 content: `File Anda sekarang menjadi 'Blob' (Binary Large Object). Git tidak peduli nama file Anda saat ini, ia hanya peduli pada ISINYA yang dipadatkan ke dalam format biner ini.`
                             });
                         }

                         vscode.window.showInformationMessage(`NGOPREK: Parsed ${gitObject.type} ${oid.substring(0, 7)}`);
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
                }
            },
            null,
            this._disposables
        );
    }

    private handleFetchReflog() {
        // Assuming current workspace
        const folders = vscode.workspace.workspaceFolders;
        if (folders && folders.length > 0) {
            const reflog = GitPlumbing.readReflog(folders[0].uri.fsPath);
            this.sendMessage({
                command: 'reflogData',
                data: reflog
            });
            vscode.window.showInformationMessage(`NGOPREK: Found ${reflog.length} Reflog entries!`);
        }
    }

    private async initCloudLayer() {
        const token = await AuthManager.getSession();
        if (token) {
            this._githubService = new GitHubService(token.accessToken);
            // Initial fetch
            this.pushCloudStatus();
            
            // Start polling
            this._pollInterval = setInterval(() => {
                this.pushCloudStatus();
            }, 10000);
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
                <!--
                    Use a content security policy to only allow loading images from https or from our extension directory,
                    and only allow scripts that have a specific nonce.
                -->
                <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <link href="${styleUri}" rel="stylesheet">
                <title>NGOPREK Dashboard</title>
            </head>
            <body>
                <div id="root"></div>
                <script nonce="${nonce}" src="${scriptUri}"></script>
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
