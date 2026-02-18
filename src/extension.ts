import * as vscode from 'vscode';
import * as path from 'path';
import { GitPlumbing, GitObject } from './gitEngine';

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

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
        this._panel = panel;
        this._extensionUri = extensionUri;

        // Set the webview's initial html content
        this._update();

        // Listen for when the panel is disposed
        // This happens when the user closes the panel or when the panel is closed programmatically
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

        // Handle messages from the webview
        this._panel.webview.onDidReceiveMessage(
            message => {
                switch (message.command) {
                    case 'alert':
                        vscode.window.showErrorMessage(message.text);
                        return;
                    case 'webviewReady':
                        vscode.window.showInformationMessage('NGOPREK: View Ready!');
                        return;
                }
            },
            null,
            this._disposables
        );
    }

    public static createOrShow(extensionUri: vscode.Uri) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        // If we already have a panel, show it.
        if (NgoPrekPanel.currentPanel) {
            NgoPrekPanel.currentPanel._panel.reveal(column);
            return;
        }

        // Otherwise, create a new panel.
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

        // Clean up our resources
        this._panel.dispose();

        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) {
                x.dispose();
            }
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
