import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {createHash} from 'node:crypto';
import {gitBlobHashV111, restorePinnedSourceV111, verifyFrozenInputsV111, V110_PREIMAGES_V111, V110_ORIGINAL_TESTS_V111, SOURCE_COMMIT_V111} from '../scripts/check-excel-history-v111.mjs';
const sha256 = value => createHash('sha256').update(value).digest('hex');
const fixture = bytes => ({files: 1, bytes: bytes.length, entries: [{path: 'app/original.ts', bytes: bytes.length, sha256: sha256(bytes)}]});

test('V110 preimages are copied privately and later tampering fails the original freeze', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'hunt-history-v111-test-'));
  try {
    const current = path.join(root, 'current'), historical = path.join(root, 'historical');
    const oldBytes = Buffer.from('export const behavior = "published";\n');
    const newBytes = Buffer.from('export const behavior = "current";\n');
    await fs.mkdir(path.join(current, 'app'), {recursive: true});
    await fs.mkdir(path.join(historical, 'app'), {recursive: true});
    await fs.writeFile(path.join(current, 'app/original.ts'), newBytes);
    await fs.writeFile(path.join(historical, 'app/original.ts'), newBytes);
    await restorePinnedSourceV111(historical, {path: 'app/original.ts', gitBlobSha: gitBlobHashV111(oldBytes)}, async () => oldBytes);
    assert.deepEqual(await fs.readFile(path.join(current, 'app/original.ts')), newBytes);
    assert.deepEqual(await fs.readFile(path.join(historical, 'app/original.ts')), oldBytes);
    assert.equal((await fs.lstat(path.join(historical, 'app/original.ts'))).isSymbolicLink(), false);
    assert.equal((await fs.stat(path.join(historical, 'app/original.ts'))).mode & 0o222, 0);
    assert.equal(await verifyFrozenInputsV111(historical, fixture(oldBytes)), 1);
    await fs.chmod(path.join(historical, 'app/original.ts'), 0o644);
    await fs.appendFile(path.join(historical, 'app/original.ts'), 'changed');
    await assert.rejects(verifyFrozenInputsV111(historical, fixture(oldBytes)), /Frozen V110 size changed/);
    assert.deepEqual(await fs.readFile(path.join(current, 'app/original.ts')), newBytes);
  } finally {await fs.rm(root, {recursive: true, force: true});}
});

test('a wrong Git blob, escaping path or symlink cannot overwrite a source', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'hunt-history-v111-refusal-'));
  try {
    const original = Buffer.from('unchanged');
    await fs.writeFile(path.join(root, 'target.ts'), original);
    await assert.rejects(restorePinnedSourceV111(root, {path: 'target.ts', gitBlobSha: '0'.repeat(40)}, async () => Buffer.from('wrong')), /Historical Git source differs/);
    await assert.rejects(restorePinnedSourceV111(root, {path: '../target.ts', gitBlobSha: gitBlobHashV111(original)}, async () => original), /Unsafe historical source path/);
    await fs.symlink(path.join(root, 'target.ts'), path.join(root, 'linked.ts'));
    await assert.rejects(restorePinnedSourceV111(root, {path: 'linked.ts', gitBlobSha: gitBlobHashV111(original)}, async () => original), /source target is a symlink/);
    assert.deepEqual(await fs.readFile(path.join(root, 'target.ts')), original);
  } finally {await fs.rm(root, {recursive: true, force: true});}
});

test('all original V110 assertion files and changed preimages have explicit Git identities', () => {
  assert.match(SOURCE_COMMIT_V111, /^[a-f0-9]{40}$/);
  assert.equal(V110_ORIGINAL_TESTS_V111.length, 8);
  assert.equal(new Set(V110_ORIGINAL_TESTS_V111.map(row => row.path)).size, 8);
  assert.equal(new Set(V110_PREIMAGES_V111.map(row => row.path)).size, V110_PREIMAGES_V111.length);
  for (const row of [...V110_PREIMAGES_V111, ...V110_ORIGINAL_TESTS_V111]) assert.match(row.gitBlobSha, /^[a-f0-9]{40}$/);
  assert.ok(V110_PREIMAGES_V111.some(row => row.path === 'app/game/HuntCanvas.tsx'));
  assert.ok(V110_PREIMAGES_V111.some(row => row.path === 'app/game/GameClient.tsx'));
});
