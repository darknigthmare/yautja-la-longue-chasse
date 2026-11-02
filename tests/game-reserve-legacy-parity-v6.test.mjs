import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs/promises';
import {build} from 'esbuild';
import {captureLegacyReserveSnapshotV6} from './helpers/preserve-legacy-snapshot-v6.mjs';

const expected = JSON.parse(await fs.readFile(new URL('./fixtures/preserve-v6-history-20261102/legacy-baseline-03cf.json', import.meta.url), 'utf8'));
assert.equal(expected.sourceCommit, '03cf51badd450338d748da55599a317a71debd28');
const built = await build({stdin: {contents: "export * from './app/game/systems/gameReserveV66';export * from './app/game/systems/gameReserveExpeditionV109';export * from './app/game/gameReserveV66Rendering';", resolveDir: process.cwd()}, bundle: true, write: false, format: 'esm', platform: 'node', logLevel: 'silent'});
const api = await import('data:text/javascript;base64,' + Buffer.from(built.outputFiles[0].text).toString('base64'));
const actual = captureLegacyReserveSnapshotV6(api);
for (const baseline of expected.snapshot) test(baseline.id + ': exact main03cf serialized state, terrain, 10001-frame trace and legacy drawing commands', () => {
  const current = actual.find(item => item.id === baseline.id);
  for (const key of ['factorySerialized', 'normalizedSerialized', 'geometry', 'traceSha256', 'samples', 'liveTraceSha256', 'render']) {
    assert.deepEqual(current[key], baseline[key], baseline.id + ' ' + key);
  }
});
