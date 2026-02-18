import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { ReflogHunter } from '../../reflogEngine';

describe('ReflogHunter Unit Tests', () => {
    let tempDir: string;

    beforeEach(() => {
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'reflog-test-'));
        fs.mkdirSync(path.join(tempDir, '.git', 'logs'), { recursive: true });
    });

    afterEach(() => {
        fs.rmSync(tempDir, { recursive: true, force: true });
    });

    it('should parse reflog entries correctly', () => {
        const reflogContent = 
            '0000000000000000000000000000000000000000 f345d912a90368aa295ef51b7d44c4463a625005 User <user@mail.com> 1771432854 +0700\tcommit (initial): message 1\n' +
            'f345d912a90368aa295ef51b7d44c4463a625005 a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2 User <user@mail.com> 1771432900 +0700\tcheckout: moving from master to dev';
        
        fs.writeFileSync(path.join(tempDir, '.git', 'logs', 'HEAD'), reflogContent);

        const results = ReflogHunter.hunt(tempDir);
        
        assert.strictEqual(results.length, 2);
        // Latest first due to .reverse() in implementation
        assert.strictEqual(results[0].action, 'checkout');
        assert.strictEqual(results[0].message, 'moving from master to dev');
        assert.strictEqual(results[1].action, 'commit (initial)');
        assert.strictEqual(results[1].message, 'message 1');
    });

    it('should handle entries without explicit action colon', () => {
        const reflogContent = '0000000000000000000000000000000000000000 f345d912a90368aa295ef51b7d44c4463a625005 User <user@mail.com> 1771432854 +0700\tSimple message without colon';
        fs.writeFileSync(path.join(tempDir, '.git', 'logs', 'HEAD'), reflogContent);

        const results = ReflogHunter.hunt(tempDir);
        assert.strictEqual(results.length, 1);
        assert.strictEqual(results[0].action, 'unknown');
        assert.strictEqual(results[0].message, 'Simple message without colon');
    });
});
