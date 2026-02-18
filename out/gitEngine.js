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
exports.GitPlumbing = exports.GitObjectType = void 0;
const zlib = __importStar(require("zlib"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
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
     * This is the "Geprek" operation - breaking down the binary.
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
//# sourceMappingURL=gitEngine.js.map