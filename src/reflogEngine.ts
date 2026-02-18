import * as fs from 'fs';
import * as path from 'path';

export interface ReflogEntry {
    oldSha: string;
    newSha: string;
    user: string;
    timestamp: number;
    action: string;
    message: string;
}

export class ReflogHunter {
    /**
     * Reads the .git/logs/HEAD file and parses its content.
     */
    public static hunt(gitRoot: string): ReflogEntry[] {
        const logPath = path.join(gitRoot, '.git', 'logs', 'HEAD');
        if (!fs.existsSync(logPath)) {
            return [];
        }

        try {
            const content = fs.readFileSync(logPath, 'utf8');
            const lines = content.trim().split('\n');
            
            return lines.map(line => {
                // Format: <old-sha> <new-sha> <user> <<email>> <timestamp> <timezone> <action>: <message>
                const match = line.match(/^([0-9a-f]{40}) ([0-9a-f]{40}) (.*?) <.*?> (\d+) (.*?) (.*?): (.*)$/);
                if (match) {
                    return {
                        oldSha: match[1],
                        newSha: match[2],
                        user: match[3],
                        timestamp: parseInt(match[4], 10),
                        action: match[6],
                        message: match[7]
                    };
                }
                return null;
            }).filter((entry): entry is ReflogEntry => entry !== null).reverse();
        } catch (error) {
            console.error('Failed to hunt reflog:', error);
            return [];
        }
    }

    /**
     * Identifies dangling commits (commits in reflog not reachable from common refs).
     * For now, we'll treat any reflog entry as a potential ghost.
     */
    public static findGhosts(entries: ReflogEntry[]): ReflogEntry[] {
        // Simple logic: unique newShas in reflog
        const seen = new Set<string>();
        return entries.filter(e => {
            if (seen.has(e.newSha)) return false;
            seen.add(e.newSha);
            return true;
        });
    }
}
