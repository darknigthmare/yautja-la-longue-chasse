import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {createHash} from 'node:crypto';
import {validateExecutedResultV111, verifyExecutedSourcesV111} from '../scripts/publish-validation-homeworld-v111.mjs';
import {collectV111RecipeInputs, snapshotRuntimeV111, verifyV111NativeInputs, V111_RECIPE, V110_FREEZE_INPUT_V111} from '../scripts/snapshot-runtime-v111.mjs';

const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const options = {driver: V111_RECIPE, opened: ['played.png'], runtimeCommit: 'a'.repeat(40), buildId: 'actual-compiled-build'};
const result = () => ({
  status: 'PASS', mode: 'compiled-app', runtimeCommit: options.runtimeCommit, buildId: options.buildId,
  checks: [{name: 'A bounded executed interaction', status: 'PASS'}], errors: [], consoleErrors: [], workerErrors: [],
  scope: 'Actual UI interaction with declared initial model fixtures and no source closure claim',
  servedBuilds: [{status: 200, expectedBuildId: options.buildId, foundInHtml: true, htmlSha256: 'b'.repeat(64)}],
  sourceBefore: [{file: options.driver, sha256: 'c'.repeat(64), bytes: 11}],
  sourceAfter: [{file: options.driver, sha256: 'c'.repeat(64), bytes: 11}],
  captures: [{file: 'played.png', sha256: 'd'.repeat(64), bytes: 42}],
  invocation: {command: 'node ' + options.driver, environment: {
    YAUTJA_QA_MODE: 'compiled-app', YAUTJA_QA_RUNTIME_COMMIT: options.runtimeCommit,
    YAUTJA_QA_BUILD_ID: options.buildId, YAUTJA_QA_JOURNEYS: 'Continuation,Recovery,MobileGuide,LegacyA',
  }},
});

test('V111 evidence: only a complete compiled recipe with every opened PNG can be certified', () => {
  assert.equal(validateExecutedResultV111(result(), options).production.buildId, options.buildId);
  const mutations = [
    raw => raw.status = 'PASS_EXPLORATORY', raw => raw.mode = 'development',
    raw => raw.mode = 'production', raw => raw.runtimeCommit = 'e'.repeat(40),
    raw => raw.buildId = 'unrelated-build', raw => raw.checks[0].status = 'FAIL',
    raw => raw.errors.push({message: 'Uncaught runtime error'}),
    raw => raw.consoleErrors.push({text: 'Hydration failed', location: {url: 'app.js'}}),
    raw => raw.workerErrors.push({kind: 'error-event', message: 'Navigation Worker failed'}),
    raw => delete raw.workerErrors,
    raw => delete raw.consoleErrors, raw => delete raw.errors,
    raw => raw.sourceAfter[0].sha256 = 'e'.repeat(64),
    raw => raw.sourceAfter[0].bytes = 12,
    raw => {raw.sourceBefore = raw.sourceAfter = [...raw.sourceBefore, {...raw.sourceBefore[0]}];},
    raw => raw.captures.push({...raw.captures[0], file: 'never-opened.png'}),
    raw => raw.captures[0].file = '../escape.png',
    raw => raw.scope = {resumedFrom: 'some-prior-stage'},
    raw => raw.invocation.command = 'node scripts/qa-homeworld-coherence-v110.mjs',
    raw => raw.invocation.environment.YAUTJA_QA_MODE = 'development',
    raw => raw.invocation.environment.YAUTJA_QA_BUILD_ID = 'other-build',
    raw => raw.invocation.environment.YAUTJA_QA_JOURNEYS = 'Continuation',
  ];
  for (const mutate of mutations) {
    const raw = result(); mutate(raw); assert.throws(() => validateExecutedResultV111(raw, options));
  }
  assert.throws(() => validateExecutedResultV111(result(), {...options, opened: []}));
  assert.throws(() => validateExecutedResultV111(result(), {...options, opened: ['played.png', 'played.png']}));
});

test('V111 evidence: served HTML identity and nested production counters cannot contradict raw execution', () => {
  for (const mutate of [
    raw => delete raw.servedBuilds[0].htmlSha256,
    raw => raw.servedBuilds[0].foundInHtml = false,
    raw => raw.servedBuilds[0].status = 404,
    raw => raw.servedBuilds[0].expectedBuildId = 'other-build',
    raw => raw.servedBuilds[0].buildId = 'contradictory-build',
    raw => raw.servedBuilds[0].sha256 = 'e'.repeat(64),
    raw => raw.browserErrors = 1, raw => raw.checksFailed = 1, raw => raw.checksPassed = 10,
  ]) {
    const raw = result(); mutate(raw); assert.throws(() => validateExecutedResultV111(raw, options));
  }
  const raw = result(); raw.production = {
    mode: 'compiled-app', runtimeCommit: options.runtimeCommit, buildId: options.buildId,
    servedBuilds: raw.servedBuilds, browserErrors: 0, checksFailed: 0, checksPassed: 1,
  };
  assert.equal(validateExecutedResultV111(raw, options).production.checksPassed, 1);
  raw.mode = 'development'; assert.throws(() => validateExecutedResultV111(raw, options), /Ambiguous/);
});

test('V111 evidence: unchanged raw observations still refuse changed, absent or unfrozen source bytes', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'homeworld-evidence-v111-'));
  t.after(() => fs.rm(root, {recursive: true, force: true}));
  const file = V111_RECIPE, original = Buffer.from('played source\n');
  await fs.mkdir(path.dirname(path.join(root, file)), {recursive: true});
  await fs.writeFile(path.join(root, file), original);
  const observed = {file, sha256: sha(original), bytes: original.length};
  const raw = {sourceAfter: [observed]}, freeze = {entries: [{path: file, sha256: observed.sha256, bytes: observed.bytes}]};
  await verifyExecutedSourcesV111(raw, freeze, {root});
  await fs.writeFile(path.join(root, file), 'edited after run\n');
  await assert.rejects(verifyExecutedSourcesV111(raw, freeze, {root}), /changed after/);
  await fs.writeFile(path.join(root, file), original);
  await assert.rejects(verifyExecutedSourcesV111(raw, {entries: [{...freeze.entries[0], sha256: 'e'.repeat(64)}]}, {root}), /differs from freeze/);
  await assert.rejects(verifyExecutedSourcesV111(raw, {entries: [{path: 'app/other.ts', sha256: 'f'.repeat(64), bytes: 1}]}, {root}), /absent from freeze/);
  await fs.rm(path.join(root, file)); await assert.rejects(verifyExecutedSourcesV111(raw, freeze, {root}), /ENOENT/);
});

test('V111 evidence: original V110 freeze cannot be replaced to authorize different historical native inputs', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'homeworld-freeze-v111-'));
  t.after(() => fs.rm(root, {recursive: true, force: true}));
  await fs.mkdir(path.join(root, 'docs'));
  const original = await fs.readFile(V110_FREEZE_INPUT_V111.path);
  assert.equal(sha(original), V110_FREEZE_INPUT_V111.sha256);
  const altered = Buffer.from(original); altered[0] ^= 1;
  await fs.writeFile(path.join(root, V110_FREEZE_INPUT_V111.path), altered);
  await assert.rejects(snapshotRuntimeV111({root}), /historical V110 freeze/);
});

test('V111 evidence: the recipe freeze follows the real transitive played fixture loaders', async () => {
  const files = await collectV111RecipeInputs();
  assert.equal(new Set(files).size, files.length);
  for (const file of [V111_RECIPE,
    'tests/helpers/archive-plaque-v109-route.mjs', 'tests/helpers/archive-continuation-v111-route.mjs',
    'tests/helpers/arrival-recovery-v111-route.mjs', 'tests/helpers/cargo-doorway-v110-route.mjs', 'tests/helpers/cargo-v108-route.mjs',
    'tests/helpers/homeworld-scene-ssr-v78.mjs', 'tests/helpers/solo-v67-campaign-route.mjs',
    'scripts/homeworld-qa-model-v64.mjs',
  ]) assert(files.includes(file), 'Missing actual recipe dependency: ' + file);
});


test('V111 evidence: new native inputs cannot replace old artwork or lose their source receipt', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'homeworld-native-v111-'));
  t.after(() => fs.rm(root, {recursive: true, force: true}));
  const asset = {path: 'public/game/homeworld/v111/test-source.png', sha256: sha(Buffer.from('native fixture')), bytes: 14};
  const receipt = {path: 'art-source/v111/test-receipt.json', sha256: sha(Buffer.from('{}')), bytes: 2};
  for (const row of [asset, receipt]) await fs.mkdir(path.dirname(path.join(root, row.path)), {recursive: true});
  await fs.writeFile(path.join(root, asset.path), 'native fixture'); await fs.writeFile(path.join(root, receipt.path), '{}');
  const inventory = {schemaVersion: 1, release: 'V111', assets: [asset], provenance: [receipt], sourceDocuments: []};
  assert.equal((await verifyV111NativeInputs(root, [], inventory)).length, 2);
  await assert.rejects(verifyV111NativeInputs(root, [], {...inventory, assets: [], provenance: []}), /absent from the inventory/);
  await assert.rejects(verifyV111NativeInputs(root, [asset], inventory), /must not replace/);
  await assert.rejects(verifyV111NativeInputs(root, [], {...inventory, provenance: []}), /require source provenance/);
  await assert.rejects(verifyV111NativeInputs(root, [], {...inventory, assets: [asset, asset]}));
  await fs.writeFile(path.join(root, asset.path), 'edited fixture');
  await assert.rejects(verifyV111NativeInputs(root, [], inventory), /Pinned V111 native input changed/);
});
