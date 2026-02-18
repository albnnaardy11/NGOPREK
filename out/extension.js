"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const gitEngine_1 = require("./gitEngine");
const auth_1 = require("./auth");
const githubService_1 = require("./githubService");
const reflogEngine_1 = require("./reflogEngine");
const educationalEngine_1 = require("./educationalEngine");
function activate(context) {
    console.log('NGOPREK is now active!');
    // Register Command to Open Dashboard
    context.subscriptions.push(vscode.commands.registerCommand('ngoprek.openDashboard', () => {
        NgoPrekPanel.createOrShow(context.extensionUri);
    }));
    // Resurrection Command
    context.subscriptions.push(vscode.commands.registerCommand('ngoprek.resurrect', async (oid) => {
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
    const handleGitObjectChange = (uri) => {
        try {
            const match = uri.fsPath.match(/objects[\/\\]([0-9a-f]{2})[\/\\]([0-9a-f]{38})/i);
            if (match) {
                const oid = match[1] + match[2];
                const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);
                if (workspaceFolder) {
                    const gitObject = gitEngine_1.GitPlumbing.readObject(workspaceFolder.uri.fsPath, oid);
                    if (gitObject) {
                        NgoPrekPanel.currentPanel?.sendMessage({
                            command: 'gitObjectChanged',
                            data: gitObject
                        });
                        // Educational Tidbits
                        if (gitObject.type === 'commit') {
                            educationalEngine_1.EducationalEngine.sendTidbit(NgoPrekPanel.currentPanel, 'commit');
                        }
                        else if (gitObject.type === 'blob') {
                            educationalEngine_1.EducationalEngine.sendTidbit(NgoPrekPanel.currentPanel, 'add');
                        }
                    }
                }
            }
        }
        catch (e) {
            console.error("Error handling git object change:", e);
        }
    };
    gitWatcher.onDidCreate(handleGitObjectChange);
    gitWatcher.onDidChange(handleGitObjectChange);
    context.subscriptions.push(gitWatcher);
}
class NgoPrekPanel {
    static currentPanel;
    _panel;
    _extensionUri;
    _disposables = [];
    _githubService;
    _pollInterval;
    constructor(panel, extensionUri) {
        this._panel = panel;
        this._extensionUri = extensionUri;
        // Set the webview's initial html content
        this._update();
        // Listen for when the panel is disposed
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
        // Handle messages from the webview
        this._panel.webview.onDidReceiveMessage(async (message) => {
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
            }
        }, null, this._disposables);
    }
    handleFetchReflog() {
        const folders = vscode.workspace.workspaceFolders;
        if (folders && folders.length > 0) {
            const gitRoot = folders[0].uri.fsPath;
            const entries = reflogEngine_1.ReflogHunter.hunt(gitRoot);
            const ghosts = reflogEngine_1.ReflogHunter.findGhosts(entries);
            this.sendMessage({
                command: 'reflogData',
                data: ghosts
            });
            educationalEngine_1.EducationalEngine.sendTidbit(this, 'ghost');
        }
    }
    async initCloudLayer() {
        const token = await auth_1.AuthManager.getSession();
        if (token) {
            this._githubService = new githubService_1.GitHubService(token.accessToken);
            // Initial fetch
            this.pushCloudStatus();
            // Start polling
            this._pollInterval = setInterval(() => {
                this.pushCloudStatus();
            }, 10000);
        }
    }
    async pushCloudStatus() {
        if (!this._githubService)
            return;
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
        }
        catch (e) {
            console.error("Cloud status update failed:", e);
        }
    }
    async handleDeploy() {
        const token = await auth_1.AuthManager.getGitHubToken();
        if (!token)
            return;
        this._githubService = new githubService_1.GitHubService(token);
        const workspaceName = vscode.workspace.name || 'ngoprek-demo';
        vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "NGOPREK: Flying to Cloud...",
            cancellable: false
        }, async (progress) => {
            try {
                progress.report({ message: "Checking Repository..." });
                const repoUrl = await this._githubService.createRepoIfNotExists(workspaceName, false);
                progress.report({ message: "Enabling GitHub Pages..." });
                // Assuming the user is the owner
                const user = await this._githubService.getUser();
                await this._githubService.enablePages(user.login, workspaceName);
                progress.report({ message: `Deployed to ${repoUrl}` });
                vscode.window.showInformationMessage(`NGOPREK: Repository Ready at ${repoUrl}`);
                // Immediately update status
                this.pushCloudStatus();
            }
            catch (error) {
                vscode.window.showErrorMessage(`Deployment Failed: ${error.message}`);
            }
        });
    }
    static createOrShow(extensionUri) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;
        if (NgoPrekPanel.currentPanel) {
            NgoPrekPanel.currentPanel._panel.reveal(column);
            return;
        }
        const panel = vscode.window.createWebviewPanel('ngoprekDashboard', 'NGOPREK Dashboard', column || vscode.ViewColumn.One, {
            enableScripts: true,
            localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'webview-ui', 'dist')]
        });
        NgoPrekPanel.currentPanel = new NgoPrekPanel(panel, extensionUri);
    }
    sendMessage(message) {
        this._panel.webview.postMessage(message);
    }
    dispose() {
        NgoPrekPanel.currentPanel = undefined;
        if (this._pollInterval)
            clearInterval(this._pollInterval);
        this._panel.dispose();
        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x)
                x.dispose();
        }
    }
    _update() {
        const webview = this._panel.webview;
        this._panel.title = "NGOPREK Dashboard";
        this._panel.webview.html = this._getHtmlForWebview(webview);
    }
    _getHtmlForWebview(webview) {
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
function deactivate() { }
//# sourceMappingURL=extension.js.map