import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {validateExecutedResultV109} from '../scripts/publish-validation-domain-v109.mjs';
import {snapshotRuntimeV109, V109_RECIPES} from '../scripts/snapshot-runtime-v109.mjs';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const options = {domain: 'Pit', driver: V109_RECIPES.Pit, opened: ['played.png'], runtimeCommit: 'a'.repeat(40), buildId: 'actual-build'};
const result = () => ({status: 'PASS', mode: 'compiled-app', runtimeCommit: options.runtimeCommit, buildId: options.buildId,
  checks: [{status: 'PASS'}], errors: [], consoleErrors: [], scope: 'One explicitly bounded played journey',
  servedBuilds: [{status: 200, buildId: options.buildId, foundInHtml: true, sha256: 'b'.repeat(64)}],
  sourceBefore: [{file: options.driver, sha256: 'c'.repeat(64), bytes: 1}], sourceAfter: [{file: options.driver, sha256: 'c'.repeat(64), bytes: 1}],
  captures: [{file: 'played.png', sha256: 'd'.repeat(64), bytes: 42}], invocation: {command: 'node ' + options.driver}});

test('publication rejects exploratory modes, console errors, changed sources, wrong builds and incomplete inspection', () => {
  assert.equal(validateExecutedResultV109(result(), options).servedBuilds[0].expectedBuildId, options.buildId);
  for (const mutate of [raw => raw.status = 'PASS_EXPLORATORY', raw => raw.mode = 'development', raw => raw.consoleErrors.push('renderer failure'), raw => raw.errors.push('uncaught'), raw => raw.sourceAfter[0].sha256 = 'e'.repeat(64), raw => raw.buildId = 'other', raw => raw.checks[0].status = 'FAIL', raw => raw.scope = {resumedFrom: 'prior-checkpoint'}, raw => raw.captures.push({...raw.captures[0], file: 'unopened.png'}), raw => raw.invocation.command = 'node scripts/qa-old-v108.mjs']) {
    const raw = result(); mutate(raw); assert.throws(() => validateExecutedResultV109(raw, options));
  }
  const ambiguous = result(); ambiguous.production = {mode: 'compiled-app', runtimeCommit: options.runtimeCommit, buildId: options.buildId, servedBuilds: ambiguous.servedBuilds}; ambiguous.mode = 'development';
  assert.throws(() => validateExecutedResultV109(ambiguous, options), /Ambiguous executed production identity/);
});

test('served HTML evidence retains its actual SHA and refuses missing or contradictory identity', () => {
  for (const mutate of [raw => delete raw.servedBuilds[0].sha256, raw => raw.servedBuilds[0].expectedBuildId = 'different', raw => raw.servedBuilds[0].foundInHtml = false, raw => raw.servedBuilds[0].status = 404]) {
    const raw = result(); mutate(raw); assert.throws(() => validateExecutedResultV109(raw, options));
  }
  const raw = result(); raw.servedBuilds[0] = {status: 200, expectedBuildId: options.buildId, foundInHtml: true, htmlSha256: 'f'.repeat(64)};
  assert.deepEqual(validateExecutedResultV109(raw, options).servedBuilds, raw.servedBuilds);
});

test('current runtime inventory contains all native deliveries, four source-only references and every real receipt', async () => {
  const inventory = JSON.parse(await fs.readFile('docs/v109-runtime-public-inputs.json', 'utf8'));
  const delivery = JSON.parse(await fs.readFile('docs/suivi-production/v109-pit-forward/native-frame-delivery.json', 'utf8'));
  const gutters = JSON.parse(await fs.readFile('docs/suivi-production/v109-pit-forward/native-gutter-delivery.json', 'utf8'));
  assert.equal(inventory.assets.length, 39); assert.equal(inventory.provenance.filter(row => row.path.startsWith('art-source/')).length, 4);
  assert.equal(inventory.provenance.filter(row => row.path.includes('/receipts/')).length, 35);
  const frozen = new Map((await snapshotRuntimeV109()).entries.map(row => [row.path, row]));
  for (const job of delivery.jobs) {
    assert.ok(frozen.has(job.receiptPath));
    if (job.output) {const bytes = await fs.readFile(job.output.path); assert.equal(frozen.get(job.output.path).sha256, sha(bytes)); assert.equal(frozen.get(job.output.path).bytes, bytes.length);}
  }
  for (const entry of gutters.frames) {
    assert.ok(frozen.has(entry.page.receiptPath)); const bytes = await fs.readFile(entry.page.path);
    assert.equal(frozen.get(entry.page.path).sha256, sha(bytes)); assert.equal(frozen.get(entry.page.path).bytes, bytes.length);
  }
  for (const file of await fs.readdir('docs/suivi-production/v109-pit-forward')) if (file.endsWith('.json')) assert.ok(frozen.has('docs/suivi-production/v109-pit-forward/' + file));
  assert.ok(frozen.has('docs/suivi-production/v109-homeworld-plaque/receipt.json'));
  for (const driver of Object.values(V109_RECIPES)) assert.ok(frozen.has(driver));
});
