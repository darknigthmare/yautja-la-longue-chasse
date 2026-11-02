import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {collectRecipeInputsV113, V113_RECIPES, V113_JOURNEYS} from '../scripts/snapshot-runtime-v113.mjs';
import {validateExecutedResultV113} from '../scripts/publish-validation-v113.mjs';

test('V113 accepts its own complete recipe and rejects historical, partial, erroneous or relabeled evidence', () => {
  // Unit data only; no compiled app, image or committed runtime is certified here.
  const options = {domain: 'Homeworld', opened: ['played.png'], runtimeCommit: 'a'.repeat(40), buildId: 'compiled-v113-unit'};
  const result = () => ({
    release: 'V113', domain: 'Homeworld', status: 'PASS', mode: 'compiled-app', completeRecipe: true,
    runtimeCommit: options.runtimeCommit, buildId: options.buildId, completedJourneys: [...V113_JOURNEYS.Homeworld],
    checks: [{name: 'Unit interaction fixture', status: 'PASS'}], errors: [], consoleErrors: [], workerErrors: [], requestsFailed: [],
    scope: 'Pure validation unit fixture, not executed gameplay evidence',
    servedBuilds: [{status: 200, expectedBuildId: options.buildId, foundInHtml: true, htmlSha256: 'b'.repeat(64)}],
    sourceBefore: [{file: V113_RECIPES.Homeworld, sha256: 'c'.repeat(64), bytes: 11}],
    sourceAfter: [{file: V113_RECIPES.Homeworld, sha256: 'c'.repeat(64), bytes: 11}],
    captures: [{file: 'played.png', sha256: 'd'.repeat(64), bytes: 42}],
    invocation: {command: 'node ' + V113_RECIPES.Homeworld, environment: {
      YAUTJA_QA_MODE: 'compiled-app', YAUTJA_QA_RUNTIME_COMMIT: options.runtimeCommit,
      YAUTJA_QA_BUILD_ID: options.buildId, YAUTJA_QA_JOURNEYS: V113_JOURNEYS.Homeworld.join(','),
    }},
  });
  assert.equal(validateExecutedResultV113(result(), options).production.buildId, options.buildId);
  const mutations = [
    r => r.release = 'V112', r => r.domain = 'Pit', r => r.completeRecipe = false,
    r => r.completedJourneys.pop(), r => r.completedJourneys.reverse(),
    r => r.mode = 'development', r => r.runtimeCommit = 'e'.repeat(40), r => r.buildId = 'other-build',
    r => r.checks[0].status = 'FAIL', r => r.errors.push({message: 'Uncaught exception'}),
    r => r.consoleErrors.push({message: 'Console error'}), r => r.workerErrors.push({message: 'Worker error'}),
    r => r.requestsFailed.push({url: '/native.png'}), r => delete r.requestsFailed,
    r => r.sourceAfter[0].sha256 = 'e'.repeat(64), r => r.sourceAfter.push({...r.sourceAfter[0]}),
    r => r.servedBuilds[0].foundInHtml = false, r => r.servedBuilds[0].htmlSha256 = 'invalid',
    r => r.invocation.command = 'node scripts/qa-homeworld-public-spaces-v112.mjs',
    r => r.invocation.environment.YAUTJA_QA_JOURNEYS = 'Foundations',
    r => r.captures[0].file = '../outside.png',
  ];
  for (const mutate of mutations) { const raw = result(); mutate(raw); assert.throws(() => validateExecutedResultV113(raw, options)); }
  assert.throws(() => validateExecutedResultV113(result(), {...options, opened: []}));
});

test('V113 recipe inventory follows actual relative fixture imports through cycles and records JSON inputs', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'v113-source-closure-'));
  try {
    await fs.mkdir(path.join(root, 'scripts'));
    await fs.mkdir(path.join(root, 'tests'));
    await fs.writeFile(path.join(root, 'scripts/recipe.mjs'), "import '../tests/fixture.mjs'; export {value} from './settings.json';");
    await fs.writeFile(path.join(root, 'tests/fixture.mjs'), "import '../scripts/recipe.mjs'; import './parameters.json'; export const lazy=()=>import('./deferred.mjs');");
    await fs.writeFile(path.join(root, 'tests/deferred.mjs'), "export const read=()=>import('./lazy.json',{with:{type:'json'}});");
    await fs.writeFile(path.join(root, 'scripts/settings.json'), '{"value":1}');
    await fs.writeFile(path.join(root, 'tests/parameters.json'), '{"count":2}');
    await fs.writeFile(path.join(root, 'tests/lazy.json'), '{"value":3}');
    assert.deepEqual(await collectRecipeInputsV113(root, ['scripts/recipe.mjs']), [
      'scripts/recipe.mjs', 'scripts/settings.json', 'tests/deferred.mjs', 'tests/fixture.mjs', 'tests/lazy.json', 'tests/parameters.json',
    ]);
    await fs.rm(path.join(root, 'tests/parameters.json'));
    await assert.rejects(collectRecipeInputsV113(root, ['scripts/recipe.mjs']), /Missing real recipe dependency/);
  } finally {
    await fs.rm(root, {recursive: true, force: true});
  }
});

test('V113 source closure refuses path escapes and symlinked evidence rather than silently omitting them', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'v113-source-boundary-'));
  try {
    await fs.mkdir(path.join(root, 'scripts'));
    await fs.writeFile(path.join(root, 'scripts/source.mjs'), 'export const value=1;');
    await fs.symlink(path.join(root, 'scripts/source.mjs'), path.join(root, 'scripts/link.mjs'));
    await assert.rejects(collectRecipeInputsV113(root, ['../outside.mjs']), /Unsafe recipe source/);
    await assert.rejects(collectRecipeInputsV113(root, ['scripts/link.mjs']), /regular files/);
    await fs.mkdir(path.join(root, 'original'));
    await fs.writeFile(path.join(root, 'original/nested.mjs'), 'export const value=2;');
    await fs.symlink(path.join(root, 'original'), path.join(root, 'alias'), 'dir');
    await assert.rejects(collectRecipeInputsV113(root, ['alias/nested.mjs']), /symlinked directory/);
    await fs.writeFile(path.join(root, 'scripts/recipe.mjs'), "import '../../outside.mjs';");
    await assert.rejects(collectRecipeInputsV113(root, ['scripts/recipe.mjs']), /Unsafe real recipe dependency/);
  } finally {
    await fs.rm(root, {recursive: true, force: true});
  }
});
