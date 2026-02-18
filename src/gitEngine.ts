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

            let type: GitObjectType;
            switch(typeStr) {
                case 'blob': type = GitObjectType.Blob; break;
                case 'tree': type = GitObjectType.Tree; break;
                case 'commit': type = GitObjectType.Commit; break;
                case 'tag': type = GitObjectType.Tag; break;
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

        } catch (error) {
            console.error(`Failed to inflate or parse git object ${oid}:`, error);
            return null;
        }
    }

    /**
     * Reconstructs the raw content of a tree object for visualization.
     * Tree content is: <mode> <filename>\0<SHA-1 (binary)>
     */
    public static parseTreeContent(buffer: Buffer): any[] {
        // TODO: Implement parsing for Tree objects to show file structure
        return [];
    }
}
