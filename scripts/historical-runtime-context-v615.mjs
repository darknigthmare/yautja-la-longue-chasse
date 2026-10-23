import assert from 'node:assert/strict';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {snapshotRuntimeV106} from './snapshot-runtime-v106.mjs';
import {assertStaticRegistryV614} from './historical-runtime-context-v614.mjs';

const REPOSITORY = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const HISTORICAL_RUNTIME_COMMIT_V106 = 'db22b36aaa0bcbf6d31d2ed08c75b44c4570c4c2';
export const SOURCE_MAIN_COMMIT_V615 = '92e7c824fd80d6b8152855b3d66560448f8c48c0';
const FIXTURE = 'tests/fixtures/runtime-history-v106-v615.json';
const FIXTURE_SHA256 = 'df29bc7520ee3437cb53f26cd4c638567204588c91464cf9907dc032f04d0f22';
const MODIFIED = ['app/game/RecentSpriteLibraryV85.tsx', 'app/game/systems/recentSpriteLibraryV85.ts'];
const ADDED = ['app/game/data/enforcerProductionV614.json', 'app/game/data/npcProductionV615.json'];
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const fingerprint = row => ({path: row.path, bytes: row.bytes, sha256: row.sha256});
let pending;

function local(relative) {
  assert.equal(typeof relative, 'string', 'Historical path must be a string');
  assert.ok(relative.length && !relative.includes('\\') && !relative.includes('\0') && !path.posix.isAbsolute(relative)
    && relative.split('/').every(part => part && part !== '.' && part !== '..'), 'Unsafe historical path: ' + relative);
  return relative;
}

function verifyBytes(bytes, row, label) {
  assert.equal(bytes.length, row.bytes, label + ' size changed: ' + row.path);
  assert.equal(sha(bytes), row.sha256, label + ' changed: ' + row.path);
}

async function readVerified(root, row, label = 'Historical input') {
  const bytes = await fsp.readFile(path.join(root, local(row.path)));
  verifyBytes(bytes, row, label);
  return bytes;
}

/** Permit the reviewed literal insertions, never a general removal/normalization. */
export function assertAllowedSourceV615(relative, bytes, fixture) {
  const original = fixture.historicalSources.find(row => row.path === relative);
  const change = fixture.currentDelta.modified.find(row => row.path === relative);
  assert.ok(original && change, 'No reviewed V6.15 source change: ' + relative);
  let expected = original.text;
  for (const insertion of change.insertions) {
    assert.ok(insertion.after.length && insertion.text.length, 'Empty V6.15 insertion');
    assert.equal(expected.split(insertion.after).length, 2, 'V6.15 insertion anchor must occur exactly once: ' + relative);
    expected = expected.replace(insertion.after, insertion.after + insertion.text);
  }
  assert.deepEqual(bytes, Buffer.from(expected), 'Unexpected V6.15 source bytes: ' + relative);
  verifyBytes(bytes, change, 'Reviewed V6.15 source');
}

/** The live snapshot has exactly two reviewed replacements and the V6.14 / V6.15 static registries.
 * It is deliberately NOT compared as though the V106 browser QA covered V6.15. */
export function assertCurrentRuntimeDeltaV615(current, freeze, fixture) {
  assert.equal(fixture.currentDelta.currentRuntimeCoveredByHistoricalQA, false);
  assert.equal(current.scope, freeze.scope, 'Runtime snapshot scope changed');
  assert.equal(current.entries.length, current.files, 'Current runtime count changed');
  assert.equal(current.entries.reduce((sum, row) => sum + row.bytes, 0), current.bytes, 'Current runtime byte count changed');
  const before = new Map(freeze.entries.map(row => [row.path, row]));
  const after = new Map(current.entries.map(row => [row.path, row]));
  assert.equal(before.size, freeze.entries.length, 'Duplicate historical runtime path');
  assert.equal(after.size, current.entries.length, 'Duplicate current runtime path');
  const removed = [...before.keys()].filter(relative => !after.has(relative)).sort();
  const added = [...after.keys()].filter(relative => !before.has(relative)).sort();
  const modified = [...before.keys()].filter(relative => after.has(relative)
    && (before.get(relative).bytes !== after.get(relative).bytes || before.get(relative).sha256 !== after.get(relative).sha256)).sort();
  assert.deepEqual(removed, [], 'No V106 runtime input may be removed');
  assert.deepEqual(added, ADDED, 'Only the V6.14 and V6.15 static registries may be added');
  assert.deepEqual(modified, MODIFIED, 'Only the two reviewed V6.15 library sources may change');
  assert.deepEqual(fixture.currentDelta.modified.map(row => row.path), MODIFIED);
  assert.deepEqual(fixture.currentDelta.added.map(row => row.path), ADDED);
  for (const change of [...fixture.currentDelta.modified, ...fixture.currentDelta.added]) {
    assert.deepEqual(after.get(change.path), fingerprint(change), 'Reviewed V6.15 fingerprint changed: ' + change.path);
    if (change.historicalSha256) assert.equal(before.get(change.path).sha256, change.historicalSha256);
  }
  for (const row of freeze.entries) {
    if (!MODIFIED.includes(row.path)) assert.deepEqual(after.get(row.path), row, 'Unchanged V106 input differs: ' + row.path);
  }
  return {historicalFiles: freeze.files, unchangedFiles: freeze.files - MODIFIED.length,
    modifiedPaths: [...MODIFIED], addedPaths: [...ADDED], currentRuntimeCoveredByHistoricalQA: false};
}

/** Hash-pin the entire added record and check its static, non-replacing meaning. */
export function assertStaticRegistryV615(bytes, fixture, manifest) {
  verifyBytes(bytes, fixture.currentDelta.added[1], 'Reviewed V6.15 registry');
  const registry = JSON.parse(bytes);
  assert.equal(registry.version, 'V6.15');
  assert.equal(registry.summary.nativePngFiles, 18);
  assert.equal(registry.packs.length, 1);
  assert.equal(registry.packs[0].id, 'npc-v615');
  assert.equal(registry.packs[0].priority, 46);
  assert.equal(registry.packs[0].pngEntriesImported, 18);
  assert.equal(registry.packs[0].recordEntries, 18);
  assert.equal(registry.assets.length, 18);
  assert.equal(new Set(registry.assets.map(row => row.groupId)).size, 18);
  assert.equal(new Set(registry.assets.map(row => row.sha256)).size, 18);
  assert.equal(manifest.sourceMainCommit, SOURCE_MAIN_COMMIT_V615);
  assert.equal(manifest.assets.length, 18);
  assert.deepEqual(registry.assets.map(row => row.identityId).sort(), manifest.assets.map(row => row.id).sort());
  for (const asset of registry.assets) {
    const produced = manifest.assets.find(row => row.id === asset.identityId);
    assert.equal(asset.identityId, asset.groupId + '--sucklings-02');
    assert.equal(asset.id, 'production-v615:' + asset.identityId + ':' + asset.sha256.slice(0, 12));
    assert.equal(asset.sourcePath, 'public/game/production/sucklings-v615/' + asset.groupId + '/sucklings-02.png');
    assert.equal(asset.sourcePath, produced.repoPngPath);
    assert.equal(asset.src, '/' + asset.sourcePath.slice('public/'.length));
    assert.equal(asset.bytes, produced.bytes);
    assert.equal(asset.sha256, produced.sha256);
    assert.equal(asset.width, 1024);
    assert.equal(asset.height, 1536);
    assert.equal(asset.packId, 'npc-v615');
    assert.equal(asset.priority, 46);
    assert.equal(asset.kind, 'npc');
    assert.equal(asset.role, 'sucklings');
    assert.equal(asset.lifeStage, 'infant');
    assert.equal(asset.motionStatus, 'single-pose-static');
    assert.equal(asset.canonicalFidelity, 'not-certified-1-to-1');
    assert.equal(asset.supersedesIdentityId, '');
    assert.equal(asset.supersededByIdentityId, '');
    assert.equal(asset.regionId, '');
    assert.equal(asset.fullBody, true);
    assert.equal(asset.bodyComposition, 'single-individual');
    assert.equal(typeof asset.sourceNote, 'string');
    assert.ok(asset.sourceLimits.every(item => typeof item === 'string'));
    assert.equal(produced.animated, false);
    assert.equal(produced.newMapPlacement, false);
  }
}

async function prepare() {
  const fixtureBytes = await fsp.readFile(path.join(REPOSITORY, FIXTURE));
  assert.equal(sha(fixtureBytes), FIXTURE_SHA256, 'Historical V106/V6.15 fixture changed');
  const fixture = JSON.parse(fixtureBytes);
  assert.equal(fixture.schemaVersion, 1);
  assert.equal(fixture.historicalRelease, 'V106');
  assert.equal(fixture.runtimeCommit, HISTORICAL_RUNTIME_COMMIT_V106);
  assert.equal(fixture.sourceMainCommit, SOURCE_MAIN_COMMIT_V615);
  assert.deepEqual(fixture.historicalSources.map(row => row.path), MODIFIED);
  const previousFixture = JSON.parse(await readVerified(REPOSITORY, fixture.previousFixture, 'Preserved V6.14 fixture'));
  await readVerified(REPOSITORY, fixture.previousHelper, 'Preserved V6.14 helper');
  assert.deepEqual(fixture.historicalSources, previousFixture.historicalSources, 'Original archived V106 sources must remain exact');
  assert.deepEqual(fixture.sourceFreeze, previousFixture.sourceFreeze);
  assert.deepEqual(fixture.validationSummary, previousFixture.validationSummary);
  assert.deepEqual(fixture.currentDelta.added[0], previousFixture.currentDelta.added[0], 'Preserved V6.14 registry fingerprint');
  const freeze = JSON.parse(await readVerified(REPOSITORY, fixture.sourceFreeze, 'Original V106 freeze'));
  const summary = JSON.parse(await readVerified(REPOSITORY, fixture.validationSummary, 'Original V106 summary'));
  assert.equal(freeze.files, 963);
  assert.equal(freeze.entries.length, freeze.files);
  assert.equal(freeze.bytes, 268531140);
  assert.equal(summary.runtimeCommit, HISTORICAL_RUNTIME_COMMIT_V106);
  assert.deepEqual(summary.sourceFreeze, fixture.sourceFreeze);
  const historical = new Map();
  for (const row of fixture.historicalSources) {
    const bytes = Buffer.from(row.text);
    verifyBytes(bytes, row, 'Archived V106 source');
    assert.deepEqual(freeze.entries.find(entry => entry.path === row.path), fingerprint(row));
    historical.set(row.path, bytes);
    assertAllowedSourceV615(row.path, await fsp.readFile(path.join(REPOSITORY, row.path)), fixture);
  }
  const current = await snapshotRuntimeV106();
  const boundary = assertCurrentRuntimeDeltaV615(current, freeze, fixture);
  assertStaticRegistryV614(await fsp.readFile(path.join(REPOSITORY, ADDED[0])), previousFixture,
    JSON.parse(await fsp.readFile(path.join(REPOSITORY, 'docs/suivi-production/v614/data/production-manifest.json'), 'utf8')));
  assertStaticRegistryV615(await fsp.readFile(path.join(REPOSITORY, ADDED[1])), fixture,
    JSON.parse(await fsp.readFile(path.join(REPOSITORY, 'docs/suivi-production/v615/data/production-manifest.json'), 'utf8')));
  const root = await fsp.mkdtemp(path.join(os.tmpdir(), 'yautja-runtime-history-v106-'));
  try {
    for (const row of freeze.entries) {
      const bytes = historical.get(row.path) ?? await readVerified(REPOSITORY, row);
      const target = path.join(root, local(row.path));
      await fsp.mkdir(path.dirname(target), {recursive: true});
      if (row.path.startsWith('public/')) {
        // The original public bytes are shared only after their frozen hash passes.
        await fsp.symlink(path.join(REPOSITORY, row.path), target);
      } else {
        // Copies are required: the unmodified V106 snapshot walks regular app files.
        await fsp.writeFile(target, bytes, {mode: 0o444, flag: 'wx'});
      }
    }
    process.once('exit', () => fs.rmSync(root, {recursive: true, force: true}));
    return {root, fixture, freeze, current, boundary};
  } catch (error) {
    await fsp.rm(root, {recursive: true, force: true});
    throw error;
  }
}

/** Opt-in historical context: normal imports keep using the current runtime. */
export function getHistoricalRuntimeContextV615() {
  return pending ??= prepare();
}

export async function loadHistoricalRuntimeSnapshotV615() {
  const context = await getHistoricalRuntimeContextV615();
  return import(pathToFileURL(path.join(context.root, 'scripts/snapshot-runtime-v106.mjs')).href);
}

/** Check private historical copies and unchanged shared inputs after the snapshot. */
export async function verifyHistoricalRuntimeContextV615() {
  const context = await getHistoricalRuntimeContextV615();
  for (const row of context.freeze.entries) {
    await readVerified(context.root, row);
    const target = path.join(context.root, row.path);
    if (row.path.startsWith('public/')) {
      assert.equal(await fsp.readlink(target), path.join(REPOSITORY, row.path), 'Historical public link changed: ' + row.path);
    } else {
      assert.equal((await fsp.lstat(target)).isSymbolicLink(), false, 'Historical source must be private: ' + row.path);
      assert.equal((await fsp.stat(target)).mode & 0o222, 0, 'Historical source must be read-only: ' + row.path);
    }
  }
  return {runtimeCommit: HISTORICAL_RUNTIME_COMMIT_V106, inputsVerified: context.freeze.files, archivedSources: MODIFIED.length};
}
