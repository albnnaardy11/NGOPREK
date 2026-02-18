/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "./src/extension.ts"
/*!**************************!*\
  !*** ./src/extension.ts ***!
  \**************************/
(__unused_webpack_module, exports, __webpack_require__) {


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
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(__webpack_require__(/*! vscode */ "vscode"));
const gitEngine_1 = __webpack_require__(/*! ./gitEngine */ "./src/gitEngine.ts");
function activate(context) {
    console.log('NGOPREK is now active!');
    // Register Command to Open Dashboard
    let disposable = vscode.commands.registerCommand('ngoprek.openDashboard', () => {
        NgoPrekPanel.createOrShow(context.extensionUri);
    });
    context.subscriptions.push(disposable);
    // Watcher: Monitor .git/objects for changes
    const gitWatcher = vscode.workspace.createFileSystemWatcher('**/.git/objects/**');
    const handleGitObjectChange = (uri) => {
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
                    const gitObject = gitEngine_1.GitPlumbing.readObject(workspaceFolder.uri.fsPath, oid);
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
    constructor(panel, extensionUri) {
        this._panel = panel;
        this._extensionUri = extensionUri;
        // Set the webview's initial html content
        this._update();
        // Listen for when the panel is disposed
        // This happens when the user closes the panel or when the panel is closed programmatically
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
        // Handle messages from the webview
        this._panel.webview.onDidReceiveMessage(message => {
            switch (message.command) {
                case 'alert':
                    vscode.window.showErrorMessage(message.text);
                    return;
                case 'webviewReady':
                    vscode.window.showInformationMessage('NGOPREK: View Ready!');
                    return;
            }
        }, null, this._disposables);
    }
    static createOrShow(extensionUri) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;
        // If we already have a panel, show it.
        if (NgoPrekPanel.currentPanel) {
            NgoPrekPanel.currentPanel._panel.reveal(column);
            return;
        }
        // Otherwise, create a new panel.
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
        // Clean up our resources
        this._panel.dispose();
        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) {
                x.dispose();
            }
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


/***/ },

/***/ "./src/gitEngine.ts"
/*!**************************!*\
  !*** ./src/gitEngine.ts ***!
  \**************************/
(__unused_webpack_module, exports, __webpack_require__) {


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
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.GitPlumbing = exports.GitObjectType = void 0;
const zlib = __importStar(__webpack_require__(/*! zlib */ "zlib"));
const fs = __importStar(__webpack_require__(/*! fs */ "fs"));
const path = __importStar(__webpack_require__(/*! path */ "path"));
var GitObjectType;
(function (GitObjectType) {
    GitObjectType["Blob"] = "blob";
    GitObjectType["Tree"] = "tree";
    GitObjectType["Commit"] = "commit";
    GitObjectType["Tag"] = "tag";
    GitObjectType["Unknown"] = "unknown";
})(GitObjectType || (exports.GitObjectType = GitObjectType = {}));
class GitPlumbing {
    /**
     * Reads and decodes a Git object from the .git/objects directory.
     * This is the "Ngoprek" operation - breaking down the binary.
     * @param gitRootPath The root path of the repository (containing .git)
     * @param oid The SHA-1 Object ID to read
     */
    static readObject(gitRootPath, oid) {
        const objectPath = path.join(gitRootPath, '.git', 'objects', oid.substring(0, 2), oid.substring(2));
        if (!fs.existsSync(objectPath)) {
            console.error(`Git object not found: ${oid}`);
            return null;
        }
        try {
            const compressedParams = fs.readFileSync(objectPath);
            const buffer = zlib.inflateSync(compressedParams);
            // The format is: <type> <size>\0<content>
            const spaceIndex = buffer.indexOf(' ');
            const nullIndex = buffer.indexOf('\0', spaceIndex);
            if (spaceIndex === -1 || nullIndex === -1) {
                throw new Error('Invalid Git object format');
            }
            const typeStr = buffer.toString('utf8', 0, spaceIndex);
            const sizeStr = buffer.toString('utf8', spaceIndex + 1, nullIndex);
            const size = parseInt(sizeStr, 10);
            // Content starts after the null byte
            const contentBuffer = buffer.subarray(nullIndex + 1);
            let type;
            switch (typeStr) {
                case 'blob':
                    type = GitObjectType.Blob;
                    break;
                case 'tree':
                    type = GitObjectType.Tree;
                    break;
                case 'commit':
                    type = GitObjectType.Commit;
                    break;
                case 'tag':
                    type = GitObjectType.Tag;
                    break;
                default: type = GitObjectType.Unknown;
            }
            // For display purposes, we might want string for commits/trees, but Buffer for blobs
            // For now, let's treat everything as UTF-8 string, assuming text files.
            // In a real generic tool, we'd handle binary blobs carefully.
            const content = type === GitObjectType.Blob ? contentBuffer.toString('utf8') : contentBuffer.toString('utf8');
            return {
                type,
                size,
                content,
                oid
            };
        }
        catch (error) {
            console.error(`Failed to inflate or parse git object ${oid}:`, error);
            return null;
        }
    }
    /**
     * Reconstructs the raw content of a tree object for visualization.
     * Tree content is: <mode> <filename>\0<SHA-1 (binary)>
     */
    static parseTreeContent(buffer) {
        // TODO: Implement parsing for Tree objects to show file structure
        return [];
    }
}
exports.GitPlumbing = GitPlumbing;


/***/ },

/***/ "vscode"
/*!*************************!*\
  !*** external "vscode" ***!
  \*************************/
(module) {

module.exports = require("vscode");

/***/ },

/***/ "fs"
/*!*********************!*\
  !*** external "fs" ***!
  \*********************/
(module) {

module.exports = require("fs");

/***/ },

/***/ "path"
/*!***********************!*\
  !*** external "path" ***!
  \***********************/
(module) {

module.exports = require("path");

/***/ },

/***/ "zlib"
/*!***********************!*\
  !*** external "zlib" ***!
  \***********************/
(module) {

module.exports = require("zlib");

/***/ }

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Check if module exists (development only)
/******/ 		if (__webpack_modules__[moduleId] === undefined) {
/******/ 			var e = new Error("Cannot find module '" + moduleId + "'");
/******/ 			e.code = 'MODULE_NOT_FOUND';
/******/ 			throw e;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module is referenced by other modules so it can't be inlined
/******/ 	var __webpack_exports__ = __webpack_require__("./src/extension.ts");
/******/ 	var __webpack_export_target__ = exports;
/******/ 	for(var __webpack_i__ in __webpack_exports__) __webpack_export_target__[__webpack_i__] = __webpack_exports__[__webpack_i__];
/******/ 	if(__webpack_exports__.__esModule) Object.defineProperty(__webpack_export_target__, "__esModule", { value: true });
/******/ 	
/******/ })()
;
//# sourceMappingURL=extension.js.map