/** Include and verify the exact non-source files exercised by the regression
 * suite, without checking out the multi-gigabyte public asset tree. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
assert.ok(args.length === 1 && ['--include', '--check'].includes(args[0]));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'production/p0p1-20261109/qa/ci/runtime-file-inputs.json'), 'utf8'));
assert.equal(manifest.schemaVersion, 1);
assert.match(manifest.selection, /^production\/p0p1-20261109\/qa\/root\/[A-Za-z0-9._-]+\.json$/);
assert.equal(sha(fs.readFileSync(path.join(root, manifest.selection))), manifest.selectionSha256);
assert.ok(Array.isArray(manifest.files) && manifest.files.length > 0);
assert.equal(new Set(manifest.files.map(file => file.path)).size, manifest.files.length);
for (const file of manifest.files) {
  assert.match(file.path, /^(public|docs|art-source|production)\/[A-Za-z0-9._/-]+$/);
  assert.ok(file.path.split('/').every(part => part && part !== '.' && part !== '..'));
  assert.match(file.sha256, /^[a-f0-9]{64}$/); assert.ok(Number.isSafeInteger(file.bytes) && file.bytes > 0);
}
if (args[0] === '--include') {
  execFileSync('git', ['sparse-checkout', 'add', '--stdin'], { cwd: root,
    input: manifest.files.map(file => '/' + file.path).join('\n') + '\n', stdio: ['pipe', 'inherit', 'inherit'] });
}
for (const file of manifest.files) {
  const data = fs.readFileSync(path.join(root, file.path));
  assert.equal(data.length, file.bytes, file.path);
  assert.equal(sha(data), file.sha256, file.path);
}
console.log(JSON.stringify({ passed: true, files: manifest.files.length,
  bytes: manifest.files.reduce((sum, file) => sum + file.bytes, 0), scope: manifest.scope }));
