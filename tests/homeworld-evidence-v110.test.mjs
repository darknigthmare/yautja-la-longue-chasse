import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {createHash} from 'node:crypto';
import {validateExecutedResultV110, verifyExecutedSourcesV110} from '../scripts/publish-validation-homeworld-v110.mjs';
import {collectV110RecipeInputs, snapshotRuntimeV110, V110_RECIPE, V109_FREEZE_INPUT_V110} from '../scripts/snapshot-runtime-v110.mjs';

const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const options = {driver: V110_RECIPE, opened: ['played.png'], runtimeCommit: 'a'.repeat(40), buildId: 'actual-compiled-build'};
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
    YAUTJA_QA_BUILD_ID: options.buildId, YAUTJA_QA_JOURNEYS: 'K17,Residents,BlockedArrival,Doorway',
  }},
});

test('V110 evidence: only a complete compiled recipe with every opened PNG can be certified', () => {
  assert.equal(validateExecutedResultV110(result(), options).production.buildId, options.buildId);
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
    raw => raw.invocation.command = 'node scripts/qa-homeworld-plaque-v109.mjs',
    raw => raw.invocation.environment.YAUTJA_QA_MODE = 'development',
    raw => raw.invocation.environment.YAUTJA_QA_BUILD_ID = 'other-build',
    raw => raw.invocation.environment.YAUTJA_QA_JOURNEYS = 'K17',
  ];
  for (const mutate of mutations) {
    const raw = result(); mutate(raw); assert.throws(() => validateExecutedResultV110(raw, options));
  }
  assert.throws(() => validateExecutedResultV110(result(), {...options, opened: []}));
  assert.throws(() => validateExecutedResultV110(result(), {...options, opened: ['played.png', 'played.png']}));
});

test('V110 evidence: served HTML identity and nested production counters cannot contradict raw execution', () => {
  for (const mutate of [
    raw => delete raw.servedBuilds[0].htmlSha256,
    raw => raw.servedBuilds[0].foundInHtml = false,
    raw => raw.servedBuilds[0].status = 404,
    raw => raw.servedBuilds[0].expectedBuildId = 'other-build',
    raw => raw.servedBuilds[0].buildId = 'contradictory-build',
    raw => raw.servedBuilds[0].sha256 = 'e'.repeat(64),
    raw => raw.browserErrors = 1, raw => raw.checksFailed = 1, raw => raw.checksPassed = 10,
  ]) {
    const raw = result(); mutate(raw); assert.throws(() => validateExecutedResultV110(raw, options));
  }
  const raw = result(); raw.production = {
    mode: 'compiled-app', runtimeCommit: options.runtimeCommit, buildId: options.buildId,
    servedBuilds: raw.servedBuilds, browserErrors: 0, checksFailed: 0, checksPassed: 1,
  };
  assert.equal(validateExecutedResultV110(raw, options).production.checksPassed, 1);
  raw.mode = 'development'; assert.throws(() => validateExecutedResultV110(raw, options), /Ambiguous/);
});

test('V110 evidence: unchanged raw observations still refuse changed, absent or unfrozen source bytes', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'homeworld-evidence-v110-'));
  t.after(() => fs.rm(root, {recursive: true, force: true}));
  const file = V110_RECIPE, original = Buffer.from('played source\n');
  await fs.mkdir(path.dirname(path.join(root, file)), {recursive: true});
  await fs.writeFile(path.join(root, file), original);
  const observed = {file, sha256: sha(original), bytes: original.length};
  const raw = {sourceAfter: [observed]}, freeze = {entries: [{path: file, sha256: observed.sha256, bytes: observed.bytes}]};
  await verifyExecutedSourcesV110(raw, freeze, {root});
  await fs.writeFile(path.join(root, file), 'edited after run\n');
  await assert.rejects(verifyExecutedSourcesV110(raw, freeze, {root}), /changed after/);
  await fs.writeFile(path.join(root, file), original);
  await assert.rejects(verifyExecutedSourcesV110(raw, {entries: [{...freeze.entries[0], sha256: 'e'.repeat(64)}]}, {root}), /differs from freeze/);
  await assert.rejects(verifyExecutedSourcesV110(raw, {entries: [{path: 'app/other.ts', sha256: 'f'.repeat(64), bytes: 1}]}, {root}), /absent from freeze/);
  await fs.rm(path.join(root, file)); await assert.rejects(verifyExecutedSourcesV110(raw, freeze, {root}), /ENOENT/);
});

test('V110 evidence: original V109 freeze cannot be replaced to authorize different historical native inputs', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'homeworld-freeze-v110-'));
  t.after(() => fs.rm(root, {recursive: true, force: true}));
  await fs.mkdir(path.join(root, 'docs'));
  const original = await fs.readFile(V109_FREEZE_INPUT_V110.path);
  assert.equal(sha(original), V109_FREEZE_INPUT_V110.sha256);
  const altered = Buffer.from(original); altered[0] ^= 1;
  await fs.writeFile(path.join(root, V109_FREEZE_INPUT_V110.path), altered);
  await assert.rejects(snapshotRuntimeV110({root}), /historical V109 freeze/);
});

test('V110 evidence: the recipe freeze follows the real transitive played fixture loaders', async () => {
  const files = await collectV110RecipeInputs();
  assert.equal(new Set(files).size, files.length);
  for (const file of [V110_RECIPE,
    'tests/helpers/cargo-council-v110-route.mjs', 'tests/helpers/cargo-doorway-v110-route.mjs', 'tests/helpers/cargo-v108-route.mjs',
    'tests/helpers/archive-plaque-v109-route.mjs', 'tests/helpers/homeworld-scene-ssr-v78.mjs',
    'tests/helpers/solo-v67-campaign-route.mjs', 'tests/helpers/solo-v66-played-route.mjs',
    'tests/helpers/solo-v67-played-route.mjs', 'tests/helpers/youth-cage-played-route.mjs',
    'tests/helpers/youth-patrol-played-route.mjs', 'scripts/homeworld-qa-model-v64.mjs',
  ]) assert(files.includes(file), 'Missing actual recipe dependency: ' + file);
});
