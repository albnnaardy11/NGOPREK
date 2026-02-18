import * as zlib from 'zlib';
import * as fs from 'fs';
import * as path from 'path';

export enum GitObjectType {
    Blob = 'blob',
    Tree = 'tree',
    Commit = 'commit',
    Tag = 'tag',
    Unknown = 'unknown'
}

export interface GitObject {
    type: GitObjectType;
    size: number;
    content: string | Buffer;
    oid: string; // Object ID (SHA-1)
    
    // Parent/Child relationship data
    parents?: string[]; // For commits: parent OIDs
    tree?: string;      // For commits: root tree OID
    entries?: TreeEntry[]; // For trees: children items
}

export interface TreeEntry {
    mode: string;
    path: string;
    oid: string;
    type?: GitObjectType; // Derived later if possible, or guessed from mode
}

export class GitPlumbing {
    /**
     * Reads and decodes a Git object from the .git/objects directory.
     * This is the "Ngoprek" operation - breaking down the binary.
     * @param gitRootPath The root path of the repository (containing .git)
     * @param oid The SHA-1 Object ID to read
     */
    public static readObject(gitRootPath: string, oid: string): GitObject | null {
        const objectPath = path.join(gitRootPath, '.git', 'objects', oid.substring(0, 2), oid.substring(2));
        
        if (!fs.existsSync(objectPath)) {
            // Check for packed objects? For now, simplication.
            // console.error(`Git object not found: ${oid}`);
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

            let type: GitObjectType;
            switch(typeStr) {
                case 'blob': type = GitObjectType.Blob; break;
                case 'tree': type = GitObjectType.Tree; break;
                case 'commit': type = GitObjectType.Commit; break;
                case 'tag': type = GitObjectType.Tag; break;
                default: type = GitObjectType.Unknown;
            }

            // Enhanced Parsing logic
            let parsedData: Partial<GitObject> = {};

            if (type === GitObjectType.Tree) {
                parsedData.entries = this.parseTreeContent(contentBuffer);
                parsedData.content = JSON.stringify(parsedData.entries, null, 2); // Readable representation
            } else if (type === GitObjectType.Commit) {
                const text = contentBuffer.toString('utf8');
                parsedData = this.parseCommitContent(text);
                parsedData.content = text;
            } else {
                // Blob
                const isBinary = this.isBinary(contentBuffer);
                parsedData.content = isBinary ? '<Binary Data>' : contentBuffer.toString('utf8');
            }

            return {
                type,
                size,
                oid,
                content: parsedData.content || '',
                ...parsedData
            };

        } catch (error) {
            console.error(`Failed to inflate or parse git object ${oid}:`, error);
            return null;
        }
    }

    /**
     * Reconstructs the raw content of a tree object for visualization.
     * Tree content is: <mode> <filename>\0<SHA-1 (binary)> repeated
     */
    public static parseTreeContent(buffer: Buffer): TreeEntry[] {
        const entries: TreeEntry[] = [];
        let cursor = 0;

        while (cursor < buffer.length) {
            // 1. Read mode (up to space)
            const spaceIndex = buffer.indexOf(' ', cursor);
            if (spaceIndex === -1) break;
            
            const mode = buffer.toString('utf8', cursor, spaceIndex);
            cursor = spaceIndex + 1;

            // 2. Read filename (up to null byte)
            const nullIndex = buffer.indexOf('\0', cursor);
            if (nullIndex === -1) break;

            const filename = buffer.toString('utf8', cursor, nullIndex);
            cursor = nullIndex + 1;

            // 3. Read 20-byte binary SHA-1
            if (cursor + 20 > buffer.length) break;
            const oidBuffer = buffer.subarray(cursor, cursor + 20);
            const oid = oidBuffer.toString('hex');
            cursor += 20;

            // Infer type from mode
            // 100644 (blob), 100755 (exec blob), 040000 (tree), 160000 (commit/submodule), 120000 (symlink)
            let type = GitObjectType.Blob;
            if (mode === '40000' || mode === '040000') {
                type = GitObjectType.Tree;
            }

            entries.push({ mode, path: filename, oid, type });
        }
        return entries;
    }

    /**
     * Parses the raw text content of a commit object.
     * Format:
     * tree <sha1>
     * parent <sha1> (optional, multiple)
     * author ...
     * committer ...
     * 
     * <message>
     */
    public static parseCommitContent(content: string): Partial<GitObject> {
        const lines = content.split('\n');
        const parents: string[] = [];
        let tree = '';
        
        for (const line of lines) {
            if (line === '') break; // End of header
            
            if (line.startsWith('tree ')) {
                tree = line.substring(5).trim();
            } else if (line.startsWith('parent ')) {
                parents.push(line.substring(7).trim());
            }
        }

        return { tree, parents };
    }

    private static isBinary(buffer: Buffer): boolean {
        // Simple heuristic: look for null bytes or extensive non-printable characters
        // Checking first 8000 bytes
        const checkLen = Math.min(buffer.length, 8000);
        for (let i = 0; i < checkLen; i++) {
            if (buffer[i] === 0) return true;
        }
        return false;
    }
    /**
     * Reads the reflog to find "Ghost" (unreachable) commits.
     */
    public static readReflog(gitRootPath: string): any[] {
        const reflogPath = path.join(gitRootPath, '.git', 'logs', 'HEAD');
        if (!fs.existsSync(reflogPath)) return [];

        try {
            const content = fs.readFileSync(reflogPath, 'utf8');
            const lines = content.trim().split('\n');
            
            // Format: <old-sha> <new-sha> <user> <timestamp> <message>
            return lines.map(line => {
                const parts = line.split(' ');
                return {
                    oldSha: parts[0],
                    newSha: parts[1],
                    message: parts.slice(5).join(' ')
                };
            }).reverse(); // Latest first
        } catch (e) {
            console.error("Failed to read reflog:", e);
            return [];
        }
    }
}
