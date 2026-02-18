import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as zlib from 'zlib';
import { GitPlumbing, GitObjectType } from '../../gitEngine';

describe('GitPlumbing Unit Tests', () => {
    let tempDir: string;

    beforeEach(() => {
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'git-test-'));
        fs.mkdirSync(path.join(tempDir, '.git'));
        fs.mkdirSync(path.join(tempDir, '.git', 'objects'));
    });

    afterEach(() => {
        fs.rmSync(tempDir, { recursive: true, force: true });
    });

    it('should correctly parse a simple commit object', () => {
        const content = 'tree 76a74ef12f97157c91d4e7d442a8bbf37c68a4e1\nparent a2c3b4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1\n\nInitial commit';
        const header = `commit ${content.length}\0`;
        const buffer = Buffer.concat([Buffer.from(header), Buffer.from(content)]);
        const compressed = zlib.deflateSync(buffer);
        
        const oid = 'c0ffee0123456789abcdef0123456789abcdef01';
        const objDir = path.join(tempDir, '.git', 'objects', oid.substring(0, 2));
        fs.mkdirSync(objDir, { recursive: true });
        fs.writeFileSync(path.join(objDir, oid.substring(2)), compressed);

        const result = GitPlumbing.readObject(tempDir, oid);
        
        assert.notStrictEqual(result, null);
        assert.strictEqual(result?.type, GitObjectType.Commit);
        assert.strictEqual(result?.tree, '76a74ef12f97157c91d4e7d442a8bbf37c68a4e1');
        assert.deepStrictEqual(result?.parents, ['a2c3b4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1']);
    });

    it('should return null for non-existent object', () => {
        const result = GitPlumbing.readObject(tempDir, 'nonexistentoid');
        assert.strictEqual(result, null);
    });
});
