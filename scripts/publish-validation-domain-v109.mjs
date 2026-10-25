/** Publish a complete executed production recipe only after every capture was opened. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {snapshotRuntimeV109, V109_RECIPES} from './snapshot-runtime-v109.mjs';
import {local, normalizeServedBuilds} from './lib/excel-followup-evidence.mjs';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const pin = async file => {const bytes = await fs.readFile(path.join(ROOT, file)); return {path: file, sha256: sha(bytes), bytes: bytes.length};};
export function validateExecutedResultV109(raw, {domain, driver, opened, runtimeCommit, buildId}) {
  assert.equal(driver, V109_RECIPES[domain], 'An exact V109 domain recipe is required');
  assert.match(runtimeCommit ?? '', /^[a-f0-9]{40}$/); assert.ok(typeof buildId === 'string' && buildId);
  const production = raw.production ?? raw;
  assert.equal(raw.status, 'PASS'); assert.ok(['compiled-app', 'production'].includes(production.mode), 'Only a compiled production run can be published');
  assert.equal(production.runtimeCommit, runtimeCommit); assert.equal(production.buildId, buildId);
  for (const field of ['mode', 'runtimeCommit', 'buildId', 'servedBuilds']) if (production !== raw && Object.hasOwn(raw, field)) assert.deepEqual(raw[field], production[field], 'Ambiguous executed production identity: ' + field);
  assert.ok(raw.checks?.length && raw.checks.every(row => row.status === 'PASS'));
  for (const [field, expected] of [['checksPassed', raw.checks.length], ['checksFailed', 0], ['browserErrors', 0]]) if (Object.hasOwn(production, field)) assert.equal(production[field], expected);
  assert.deepEqual(raw.errors ?? raw.browserErrors, []); if (Object.hasOwn(raw, 'consoleErrors')) assert.deepEqual(raw.consoleErrors, []);
  const servedBuilds = normalizeServedBuilds(production.servedBuilds, buildId);
  assert.ok(typeof raw.scope === 'string' && raw.scope.trim() || raw.scope && typeof raw.scope === 'object');
  if (raw.scope && typeof raw.scope === 'object' && Object.hasOwn(raw.scope, 'resumedFrom')) assert.equal(raw.scope.resumedFrom, null);
  assert.ok(raw.sourceBefore?.length); assert.deepEqual(raw.sourceBefore, raw.sourceAfter);
  assert.ok(raw.sourceAfter.some(row => (row.path ?? row.file) === driver));
  assert.ok(Array.isArray(opened) && opened.length && new Set(opened).size === opened.length);
  assert.ok(Array.isArray(raw.captures) && raw.captures.length); const names = raw.captures.map(row => row.file);
  assert.equal(new Set(names).size, names.length); assert.ok(names.every(file => local(file) && file.endsWith('.png')));
  assert.deepEqual([...opened].sort(), [...names].sort(), 'Open every executed capture before publication');
  assert.ok(raw.invocation?.command?.includes('node ' + driver));
  for (const [field, expected] of [['YAUTJA_QA_MODE', production.mode], ['YAUTJA_QA_RUNTIME_COMMIT', runtimeCommit], ['YAUTJA_QA_BUILD_ID', buildId]]) if (Object.hasOwn(raw.invocation.environment ?? {}, field)) assert.equal(raw.invocation.environment[field], expected);
  return {production, servedBuilds};
}
export async function publishValidationDomainV109(options) {
  const {domain, input, driver, opened, runtimeCommit, buildId} = options;
  assert.equal((await fs.readFile(path.join(ROOT, '.next/BUILD_ID'), 'utf8')).trim(), buildId);
  const freeze = JSON.parse(await fs.readFile(path.join(ROOT, 'docs/v109-runtime-freeze.json'), 'utf8'));
  assert.deepEqual(await snapshotRuntimeV109(), freeze, 'Runtime changed since the production freeze');
  const bytes = await fs.readFile(input); assert.ok(bytes.length > 0 && bytes.length <= 256 * 1024 * 1024);
  const raw = JSON.parse(bytes), {servedBuilds} = validateExecutedResultV109(raw, options);
  const frozen = new Map(freeze.entries.map(row => [row.path, row]));
  for (const row of raw.sourceAfter) {
    const file = row.path ?? row.file; assert.ok(local(file)); const actual = await pin(file);
    assert.equal(actual.sha256, row.sha256, 'Executed source changed: ' + file); if (row.bytes !== undefined) assert.equal(actual.bytes, row.bytes);
    if (file.startsWith('app/') || file.startsWith('public/') || file === driver) assert.equal(frozen.get(file)?.sha256, row.sha256, 'Executed input absent from freeze: ' + file);
  }
  // Validate all source PNGs before writing any publishable report.
  const captureBytes = await Promise.all(raw.captures.map(async capture => {
    const source = await fs.readFile(path.resolve(path.dirname(input), capture.file));
    assert.equal(sha(source), capture.sha256); assert.equal(source.length, capture.bytes); return source;
  }));
  const base = 'docs/qa/v109-' + domain.toLowerCase(); await fs.mkdir(path.join(ROOT, base), {recursive: true});
  const rawFile = base + '/browser-result.json.gz'; await fs.writeFile(path.join(ROOT, rawFile), gzipSync(bytes, {level: 9, mtime: 0}));
  const portableFiles = [{...await pin(rawFile), decodedSha256: sha(bytes), decodedBytes: bytes.length}], captures = [];
  for (const [index, capture] of raw.captures.entries()) {
    const file = base + '/' + capture.file; await fs.mkdir(path.dirname(path.join(ROOT, file)), {recursive: true}); await fs.writeFile(path.join(ROOT, file), captureBytes[index]);
    const fingerprint = await pin(file); portableFiles.push(fingerprint); captures.push({file, sha256: fingerprint.sha256, bytes: fingerprint.bytes});
  }
  const command = raw.invocation.command;
  const report = {schemaVersion: 1, release: 'V109', status: 'PASS_CIBLE', scope: raw.scope,
    production: {mode: 'production', runtimeCommit, buildId, browserErrors: 0, checksFailed: 0, checksPassed: raw.checks.length, servedBuilds},
    invocation: raw.invocation, sourceBefore: raw.sourceBefore, sourceAfter: raw.sourceAfter,
    checks: raw.checks, captures, capturesOpened: captures.map(row => row.file), rawEvidence: portableFiles[0]};
  const reportFile = 'docs/v109-' + domain.toLowerCase() + '-validation.json'; await fs.writeFile(path.join(ROOT, reportFile), JSON.stringify(report, null, 2) + '\n');
  const entry = {domain, status: 'PASS_CIBLE', buildId, runtimeCommit, driver, command, report: await pin(reportFile), browserChecksPassed: raw.checks.length, capturesInspected: opened.length, portableFiles};
  await fs.writeFile(path.join(ROOT, base, 'entry.json'), JSON.stringify(entry, null, 2) + '\n'); return entry;
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const options = {}; for (let i = 2; i < process.argv.length; i += 2) {const key = process.argv[i].slice(2); assert.ok(process.argv[i].startsWith('--') && process.argv[i + 1] && ['domain', 'input', 'driver', 'opened', 'runtimeCommit', 'buildId'].includes(key) && !Object.hasOwn(options, key)); options[key] = process.argv[i + 1];}
  options.opened = JSON.parse(await fs.readFile(options.opened, 'utf8')); const result = await publishValidationDomainV109(options); console.log(JSON.stringify({domain: result.domain, checks: result.browserChecksPassed, captures: result.capturesInspected, report: result.report}));
}
