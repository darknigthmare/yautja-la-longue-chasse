import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs/promises';
import {build} from 'esbuild';
import {captureLegacyReserveSnapshotV6} from './helpers/preserve-legacy-snapshot-v6.mjs';

// Current freeze: corrected V1–V5 level design and render-only decor, rebuilt by scripts/build-preserve-legacy-baseline.mjs.
const expected = JSON.parse(await fs.readFile(new URL('./fixtures/preserve-v6-history-20261102/legacy-baseline-40bfeccd.json', import.meta.url), 'utf8'));
assert.equal(expected.sourceCommit, '40bfeccd18c6f651937b4689379815c5785a80ad');
// Historical freeze kept intact: saves and simulated traces must still match it byte for byte.
const historical = JSON.parse(await fs.readFile(new URL('./fixtures/preserve-v6-history-20261102/legacy-baseline-03cf.json', import.meta.url), 'utf8'));
assert.equal(historical.sourceCommit, '03cf51badd450338d748da55599a317a71debd28');
const built = await build({stdin: {contents: "export * from './app/game/systems/gameReserveV66';export * from './app/game/systems/gameReserveExpeditionV109';export * from './app/game/gameReserveV66Rendering';", resolveDir: process.cwd()}, bundle: true, write: false, format: 'esm', platform: 'node', logLevel: 'silent'});
const api = await import('data:text/javascript;base64,' + Buffer.from(built.outputFiles[0].text).toString('base64'));
const actual = captureLegacyReserveSnapshotV6(api);
for (const baseline of expected.snapshot) test(baseline.id + ': exact frozen serialized state, terrain, 10001-frame trace and drawing commands', () => {
  const current = actual.find(item => item.id === baseline.id);
  for (const key of ['factorySerialized', 'normalizedSerialized', 'geometry', 'traceSha256', 'samples', 'liveTraceSha256', 'render']) {
    assert.deepEqual(current[key], baseline[key], baseline.id + ' ' + key);
  }
});

for (const baseline of historical.snapshot) test(baseline.id + ': the level design correction keeps main03cf saves and simulated traces unchanged', () => {
  const current = actual.find(item => item.id === baseline.id);
  for (const key of ['factorySerialized', 'normalizedSerialized', 'traceSha256', 'samples', 'liveTraceSha256']) assert.deepEqual(current[key], baseline[key], baseline.id + ' ' + key);
  // Only terrain geometry and drawing are allowed to differ from the historical freeze.
  assert.notDeepEqual(current.render, baseline.render, baseline.id + ' render-only decor is drawn');
});
