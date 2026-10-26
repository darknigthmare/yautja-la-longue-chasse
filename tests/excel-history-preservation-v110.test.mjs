import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {createHash} from 'node:crypto';
import {gitBlobHashV110, restorePinnedSourceV110, verifyFrozenInputsV110, V109_PREIMAGES, V109_ORIGINAL_TESTS, SOURCE_COMMIT_V110} from '../scripts/check-excel-history-v110.mjs';
const sha256 = value => createHash('sha256').update(value).digest('hex');
const fixture = bytes => ({files: 1, bytes: bytes.length, entries: [{path: 'app/original.ts', bytes: bytes.length, sha256: sha256(bytes)}]});

test('V109 preimages are copied privately and later tampering fails the original freeze', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'hunt-history-v110-test-'));
  try {
    const current = path.join(root, 'current'), historical = path.join(root, 'historical');
    const oldBytes = Buffer.from('export const behavior = "published";\n');
    const newBytes = Buffer.from('export const behavior = "current";\n');
    await fs.mkdir(path.join(current, 'app'), {recursive: true});
    await fs.mkdir(path.join(historical, 'app'), {recursive: true});
    await fs.writeFile(path.join(current, 'app/original.ts'), newBytes);
    await fs.writeFile(path.join(historical, 'app/original.ts'), newBytes);
    await restorePinnedSourceV110(historical, {path: 'app/original.ts', gitBlobSha: gitBlobHashV110(oldBytes)}, async () => oldBytes);
    assert.deepEqual(await fs.readFile(path.join(current, 'app/original.ts')), newBytes);
    assert.deepEqual(await fs.readFile(path.join(historical, 'app/original.ts')), oldBytes);
    assert.equal((await fs.lstat(path.join(historical, 'app/original.ts'))).isSymbolicLink(), false);
    assert.equal((await fs.stat(path.join(historical, 'app/original.ts'))).mode & 0o222, 0);
    assert.equal(await verifyFrozenInputsV110(historical, fixture(oldBytes)), 1);
    await fs.chmod(path.join(historical, 'app/original.ts'), 0o644);
    await fs.appendFile(path.join(historical, 'app/original.ts'), 'changed');
    await assert.rejects(verifyFrozenInputsV110(historical, fixture(oldBytes)), /Frozen V109 size changed/);
    assert.deepEqual(await fs.readFile(path.join(current, 'app/original.ts')), newBytes);
  } finally {await fs.rm(root, {recursive: true, force: true});}
});

test('a wrong Git blob, escaping path or symlink cannot overwrite a source', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'hunt-history-v110-refusal-'));
  try {
    const original = Buffer.from('unchanged');
    await fs.writeFile(path.join(root, 'target.ts'), original);
    await assert.rejects(restorePinnedSourceV110(root, {path: 'target.ts', gitBlobSha: '0'.repeat(40)}, async () => Buffer.from('wrong')), /Historical Git source differs/);
    await assert.rejects(restorePinnedSourceV110(root, {path: '../target.ts', gitBlobSha: gitBlobHashV110(original)}, async () => original), /Unsafe historical source path/);
    await fs.symlink(path.join(root, 'target.ts'), path.join(root, 'linked.ts'));
    await assert.rejects(restorePinnedSourceV110(root, {path: 'linked.ts', gitBlobSha: gitBlobHashV110(original)}, async () => original), /source target is a symlink/);
    assert.deepEqual(await fs.readFile(path.join(root, 'target.ts')), original);
  } finally {await fs.rm(root, {recursive: true, force: true});}
});

test('all original V109 assertion files and changed preimages have explicit Git identities', () => {
  assert.match(SOURCE_COMMIT_V110, /^[a-f0-9]{40}$/);
  assert.equal(V109_ORIGINAL_TESTS.length, 12);
  assert.equal(new Set(V109_ORIGINAL_TESTS.map(row => row.path)).size, 12);
  assert.equal(new Set(V109_PREIMAGES.map(row => row.path)).size, V109_PREIMAGES.length);
  for (const row of [...V109_PREIMAGES, ...V109_ORIGINAL_TESTS]) assert.match(row.gitBlobSha, /^[a-f0-9]{40}$/);
  assert.ok(V109_PREIMAGES.some(row => row.path === 'app/game/HuntCanvas.tsx'));
  assert.ok(V109_PREIMAGES.some(row => row.path === 'app/game/GameClient.tsx'));
});
