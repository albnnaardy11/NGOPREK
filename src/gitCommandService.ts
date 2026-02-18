import * as cp from 'child_process';
import * as vscode from 'vscode';
import * as path from 'path';

export interface FileStatus {
    path: string;
    status: 'modified' | 'staged' | 'untracked' | 'deleted' | 'added';
}

export class GitCommandService {
    private static exec(command: string, cwd: string): Promise<{ stdout: string, stderr: string }> {
        return new Promise((resolve, reject) => {
            cp.exec(command, { cwd }, (error, stdout, stderr) => {
                if (error) {
                    reject({ error, stderr });
                } else {
                    resolve({ stdout, stderr });
                }
            });
        });
    }

    public static async getStatus(cwd: string): Promise<FileStatus[]> {
        try {
            const { stdout } = await this.exec('git status --porcelain', cwd);
            const lines = stdout.split('\n').filter(line => line.trim() !== '');
            
            return lines.map(line => {
                const x = line[0];
                const y = line[1];
                const filePath = line.substring(3);
                
                let status: FileStatus['status'] = 'modified';
                if (x === 'M' || x === 'A') status = 'staged';
                else if (y === 'M') status = 'modified';
                else if (x === '?' && y === '?') status = 'untracked';
                else if (x === 'D' || y === 'D') status = 'deleted';
                
                return { path: filePath, status };
            });
        } catch (e) {
            console.error('Failed to get git status:', e);
            return [];
        }
    }

    public static async add(cwd: string, filePath: string) {
        return this.exec(`git add "${filePath}"`, cwd);
    }

    public static async unstage(cwd: string, filePath: string) {
        return this.exec(`git reset HEAD "${filePath}"`, cwd);
    }

    public static async commit(cwd: string, message: string) {
        return this.exec(`git commit -m "${message}"`, cwd);
    }

    public static async push(cwd: string) {
        return this.exec('git push', cwd);
    }

    public static async pull(cwd: string) {
        try {
            return await this.exec('git pull', cwd);
        } catch (e: any) {
            if (e.stderr && e.stderr.includes('conflict')) {
                vscode.window.showErrorMessage('NGOPREK: Merge Conflict Detected! Please resolve manually.');
            }
            throw e;
        }
    }

    public static async openGitk(cwd: string) {
        // Run gitk in background without waiting for it to finish
        cp.exec('gitk', { cwd }, (error) => {
            if (error) {
                vscode.window.showErrorMessage('NGOPREK: Could not open gitk. Make sure it is installed and in your PATH.');
            }
        });
    }
}
