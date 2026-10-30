import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {execFileSync} from 'node:child_process';
import {validateExecutedResultV112, verifyExecutedSourcesV112, verifyRuntimeCommitV112} from '../scripts/publish-validation-v112.mjs';
import {V112_RECIPES, V112_JOURNEYS, verifyNativeInputsV112, fingerprintV112} from '../scripts/snapshot-runtime-v112.mjs';

const options = {domain: 'Homeworld', opened: ['played.png'], runtimeCommit: 'a'.repeat(40), buildId: 'compiled-v112'};
const rawResult = () => ({
  domain: options.domain, status: 'PASS', mode: 'compiled-app', completeRecipe: true,
  runtimeCommit: options.runtimeCommit, buildId: options.buildId, completedJourneys: [...V112_JOURNEYS.Homeworld],
  checks: [{name: 'Executed interaction', status: 'PASS'}], errors: [], consoleErrors: [], workerErrors: [], requestsFailed: [],
  scope: 'Declared initial checkpoint; actual keyboard displacement in the compiled app',
  servedBuilds: [{status: 200, expectedBuildId: options.buildId, foundInHtml: true, htmlSha256: 'b'.repeat(64)}],
  sourceBefore: [{file: V112_RECIPES.Homeworld, sha256: 'c'.repeat(64), bytes: 11}],
  sourceAfter: [{file: V112_RECIPES.Homeworld, sha256: 'c'.repeat(64), bytes: 11}],
  captures: [{file: 'played.png', sha256: 'd'.repeat(64), bytes: 42}],
  invocation: {command: 'node ' + V112_RECIPES.Homeworld, environment: {
    YAUTJA_QA_MODE: 'compiled-app', YAUTJA_QA_RUNTIME_COMMIT: options.runtimeCommit,
    YAUTJA_QA_BUILD_ID: options.buildId, YAUTJA_QA_JOURNEYS: V112_JOURNEYS.Homeworld.join(','),
  }},
});

test('V112 refuses incomplete, relabeled, erroneous or changed browser results', () => {
  assert.equal(validateExecutedResultV112(rawResult(), options).production.buildId, options.buildId);
  const mutations = [
    r => r.domain = 'Pit', r => r.completeRecipe = false, r => r.completedJourneys.push('PublicLife'),
    r => r.completedJourneys.pop(), r => r.completedJourneys.reverse(),
    r => r.mode = 'development', r => r.runtimeCommit = 'e'.repeat(40), r => r.buildId = 'other-build',
    r => r.checks[0].status = 'FAIL', r => r.errors.push({message: 'Uncaught exception'}),
    r => r.consoleErrors.push({message: 'Hydration error'}), r => r.workerErrors.push({message: 'Worker failed'}),
    r => r.requestsFailed.push({url: 'http://127.0.0.1/native.png'}), r => delete r.requestsFailed,
    r => r.sourceAfter[0].sha256 = 'e'.repeat(64), r => r.sourceAfter.push({...r.sourceAfter[0]}),
    r => r.servedBuilds[0].foundInHtml = false, r => r.servedBuilds[0].htmlSha256 = 'invalid',
    r => r.invocation.environment.YAUTJA_QA_JOURNEYS = 'Foundations',
    r => r.invocation.command = 'node ' + V112_RECIPES.Pit,
    r => r.captures[0].file = '../outside.png',
  ];
  for (const mutate of mutations) {const raw = rawResult(); mutate(raw); assert.throws(() => validateExecutedResultV112(raw, options));}
  assert.throws(() => validateExecutedResultV112(rawResult(), {...options, opened: []}));
});

test('V112 validates immutable executed bytes against the runtime freeze', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'v112-executed-input-'));
  t.after(() => fs.rm(root, {recursive: true, force: true}));
  const file = V112_RECIPES.Homeworld;
  await fs.mkdir(path.dirname(path.join(root, file)), {recursive: true});
  const {createHash} = await import('node:crypto'); const bytes = Buffer.from('original recipe\n');
  await fs.writeFile(path.join(root, file), bytes);
  const source = {file, sha256: createHash('sha256').update(bytes).digest('hex'), bytes: bytes.length};
  const raw = {sourceAfter: [source]}, freeze = {entries: [{path: file, sha256: source.sha256, bytes: source.bytes}]};
  await verifyExecutedSourcesV112(raw, freeze, {root});
  await fs.writeFile(path.join(root, file), 'changed recipe\n');
  await assert.rejects(verifyExecutedSourcesV112(raw, freeze, {root}), /changed after/);
  await assert.rejects(verifyExecutedSourcesV112(raw, {entries: [{...freeze.entries[0], path: 'app/other.ts'}]}, {root}), /absent from freeze/);
  await assert.rejects(verifyExecutedSourcesV112(raw, {entries: [...freeze.entries, {...freeze.entries[0], path: 'app/omitted.ts'}]}, {root}), /complete frozen inventory/);
});

test('V112 native inventory rejects replaced artwork, missing provenance, undeclared pages and edited source bytes', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'v112-native-input-'));
  t.after(() => fs.rm(root, {recursive: true, force: true}));
  const assetFile = 'public/game/sprites/v112/test-source.png', receiptFile = 'docs/suivi-production/v112-test/receipt.json';
  for (const file of [assetFile, receiptFile]) await fs.mkdir(path.dirname(path.join(root, file)), {recursive: true});
  // Deliberately small source-byte fixtures; this test certifies no image or art admission.
  await fs.writeFile(path.join(root, assetFile), 'original native bytes'); await fs.writeFile(path.join(root, receiptFile), '{}');
  const asset = await fingerprintV112(root, assetFile), receipt = await fingerprintV112(root, receiptFile);
  const inventory = {schemaVersion: 1, release: 'V112', assets: [asset], provenance: [receipt], runtimeAssets: []};
  assert.equal((await verifyNativeInputsV112(root, [], inventory)).length, 2);
  await assert.rejects(verifyNativeInputsV112(root, [asset], inventory), /cannot replace/);
  await assert.rejects(verifyNativeInputsV112(root, [], {...inventory, provenance: []}), /original provenance/);
  await assert.rejects(verifyNativeInputsV112(root, [], {...inventory, assets: [], provenance: []}), /absent from inventory/);
  await fs.writeFile(path.join(root, assetFile), 'edited native bytes');
  await assert.rejects(verifyNativeInputsV112(root, [], inventory), /Declared native bytes changed/);
});

test('V112 runtime identity must name the actual committed source, including newly added files', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'v112-runtime-commit-'));
  t.after(() => fs.rm(root, {recursive: true, force: true}));
  const git = (...args) => execFileSync('git', args, {cwd: root, encoding: 'utf8'}).trim();
  git('init', '--quiet'); await fs.mkdir(path.join(root, 'app'));
  await fs.writeFile(path.join(root, 'app/game.ts'), 'export const version = 112;\n');
  git('add', 'app/game.ts');
  git('-c', 'user.name=V112 Local Test', '-c', 'user.email=v112-test@example.invalid', 'commit', '--quiet', '-m', 'Local runtime fixture');
  const commit = git('rev-parse', 'HEAD');
  const original = await fingerprintV112(root, 'app/game.ts');
  await verifyRuntimeCommitV112({entries: [original]}, commit, {root});
  await assert.rejects(verifyRuntimeCommitV112({entries: [original]}, git('rev-parse', 'HEAD^{tree}'), {root}), /commit object/);
  await fs.writeFile(path.join(root, 'app/game.ts'), 'export const version = 113;\n');
  await assert.rejects(verifyRuntimeCommitV112({entries: [await fingerprintV112(root, 'app/game.ts')]}, commit, {root}), /different input bytes/);
  await fs.writeFile(path.join(root, 'app/new.ts'), 'new input\n');
  await assert.rejects(verifyRuntimeCommitV112({entries: [await fingerprintV112(root, 'app/new.ts')]}, commit, {root}), /absent from runtime commit/);
});
