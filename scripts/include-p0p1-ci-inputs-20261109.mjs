/** Include and verify the exact non-source files exercised by the regression
 * suite, without checking out the multi-gigabyte public asset tree. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { buildAudioManifest } from './build-audio-manifest.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const currentAudio = args[1] === '--current-audio';
assert.ok(['--include', '--check'].includes(args[0]) && (args.length === 1 || args.length === 2 && currentAudio));
const audioManifestPath = 'public/audio/manifest.json';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const manifestFile = process.env.P0P1_CI_MANIFEST || 'production/p0p1-20261109/qa/ci/runtime-file-inputs.json';
assert.match(manifestFile, /^production\/(?:p0p1-20261109\/qa\/ci|clan-war-command-20261109\/qa\/ci)\/[A-Za-z0-9._-]+\.json$/);
const manifest = JSON.parse(fs.readFileSync(path.join(root, manifestFile), 'utf8'));
assert.equal(manifest.schemaVersion, 1);
assert.match(manifest.selection, /^production\/(?:p0p1-20261109\/qa\/root|clan-war-command-20261109\/qa\/ci)\/[A-Za-z0-9._-]+\.json$/);
assert.equal(sha(fs.readFileSync(path.join(root, manifest.selection))), manifest.selectionSha256);
assert.ok(Array.isArray(manifest.files) && manifest.files.length > 0);
assert.equal(new Set(manifest.files.map(file => file.path)).size, manifest.files.length);
for (const file of manifest.files) {
  assert.match(file.path, /^(public|docs|art-source|production)\/[A-Za-z0-9._/-]+$/);
  assert.ok(file.path.split('/').every(part => part && part !== '.' && part !== '..'));
  assert.match(file.sha256, /^[a-f0-9]{64}$/); assert.ok(Number.isSafeInteger(file.bytes) && file.bytes > 0);
}
if (currentAudio) assert.ok(manifest.files.some(file => file.path === audioManifestPath), 'Audio manifest must be selected');
if (args[0] === '--include') {
  const paths = manifest.files.map(file => '/' + file.path);
  if (currentAudio) paths.push('/public/audio/');
  execFileSync('git', ['sparse-checkout', 'add', '--stdin'], { cwd: root,
    input: paths.join('\n') + '\n', stdio: ['pipe', 'inherit', 'inherit'] });
}
let verifiedBytes = 0;
for (const file of manifest.files) {
  const data = fs.readFileSync(path.join(root, file.path));
  if (currentAudio && file.path === audioManifestPath) {
    // This workflow tests current source and the audio it actually serves.
    // Historical readers still verify the original size and digest below.
    const { manifest: generated } = await buildAudioManifest({
      root: path.join(root, 'public/audio'), publicBase: '/audio', write: false,
    });
    assert.ok(data.equals(Buffer.from(JSON.stringify(generated, null, 2) + '\n')),
      'Current audio manifest does not match its source and tracked audio files');
  } else {
    assert.equal(data.length, file.bytes, file.path);
    assert.equal(sha(data), file.sha256, file.path);
  }
  verifiedBytes += data.length;
}
console.log(JSON.stringify({ passed: true, files: manifest.files.length, bytes: verifiedBytes, scope: manifest.scope }));
