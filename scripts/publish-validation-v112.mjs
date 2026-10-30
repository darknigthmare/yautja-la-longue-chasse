/** Publish only a complete, immutable compiled-app recipe with opened captures. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import {execFileSync} from 'node:child_process';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {local, proofShape, normalizeServedBuilds} from './lib/excel-followup-evidence.mjs';
import {snapshotRuntimeV112, V112_RECIPES, V112_JOURNEYS} from './snapshot-runtime-v112.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const evidencePath = row => row.path ?? row.file;
const FREEZE = 'docs/v112-runtime-freeze.json';
const baseFor = domain => 'docs/qa/v112-' + domain.toLowerCase();
const reportFor = domain => 'docs/v112-' + domain.toLowerCase() + '-validation.json';
const pin = async (root, file) => {
  assert.ok(local(file)); const bytes = await fs.readFile(path.join(root, file));
  return {path: file, sha256: sha(bytes), bytes: bytes.length};
};

export function validateExecutedResultV112(raw, {domain, driver = V112_RECIPES[domain], opened, runtimeCommit, buildId}) {
  assert.ok(Object.hasOwn(V112_RECIPES, domain), 'An explicit V112 domain is required');
  assert.equal(driver, V112_RECIPES[domain], 'The complete V112 domain recipe is required');
  assert.equal(raw.domain, domain);
  assert.equal(raw.completeRecipe, true, 'Partial exploratory journeys cannot certify the recipe');
  assert.ok(Array.isArray(raw.completedJourneys) && raw.completedJourneys.length > 0);
  assert.equal(new Set(raw.completedJourneys).size, raw.completedJourneys.length);
  assert.deepEqual(raw.completedJourneys, [...V112_JOURNEYS[domain]], 'All required domain journeys must complete in the published order');
  assert.match(runtimeCommit ?? '', /^[a-f0-9]{40}$/);
  assert.ok(typeof buildId === 'string' && buildId.trim() === buildId && buildId.length > 0);
  const production = raw.production ?? raw;
  assert.equal(raw.status, 'PASS'); assert.equal(production.mode, 'compiled-app', 'Only a compiled app run can be published');
  assert.equal(production.runtimeCommit, runtimeCommit); assert.equal(production.buildId, buildId);
  for (const field of ['mode', 'runtimeCommit', 'buildId', 'servedBuilds']) {
    if (production !== raw && Object.hasOwn(raw, field)) assert.deepEqual(raw[field], production[field], 'Ambiguous production identity: ' + field);
  }
  assert.ok(Array.isArray(raw.checks) && raw.checks.length > 0 && raw.checks.every(row => row.status === 'PASS'));
  for (const [field, expected] of [['checksPassed', raw.checks.length], ['checksFailed', 0], ['browserErrors', 0]]) {
    if (Object.hasOwn(production, field)) assert.equal(production[field], expected);
  }
  assert.deepEqual(raw.errors, [], 'Uncaught browser errors must remain unfiltered and empty');
  assert.deepEqual(raw.consoleErrors, [], 'All console.error records must remain unfiltered and empty');
  assert.deepEqual(raw.workerErrors, [], 'Native Worker construction and error events must remain empty');
  assert.deepEqual(raw.requestsFailed, [], 'All failed network requests must remain unfiltered and empty');
  const servedBuilds = normalizeServedBuilds(production.servedBuilds, buildId);
  for (const response of servedBuilds) {
    if (Object.hasOwn(response, 'sha256') && Object.hasOwn(response, 'htmlSha256')) assert.equal(response.sha256, response.htmlSha256, 'Ambiguous served HTML fingerprint');
  }
  assert.ok(typeof raw.scope === 'string' && raw.scope.trim()
    || raw.scope && typeof raw.scope === 'object' && !Array.isArray(raw.scope));
  if (raw.scope && typeof raw.scope === 'object' && Object.hasOwn(raw.scope, 'resumedFrom')) assert.equal(raw.scope.resumedFrom, null);
  assert.ok(Array.isArray(raw.sourceBefore) && raw.sourceBefore.length > 0);
  assert.deepEqual(raw.sourceBefore, raw.sourceAfter, 'Executed sources changed during the browser recipe');
  const sourceFiles = raw.sourceAfter.map(row => {
    proofShape(row);
    if (Object.hasOwn(row, 'path') && Object.hasOwn(row, 'file')) assert.equal(row.path, row.file);
    return evidencePath(row);
  });
  assert.equal(new Set(sourceFiles).size, sourceFiles.length, 'Executed source inputs must be unique');
  assert.ok(sourceFiles.includes(driver));
  assert.ok(Array.isArray(opened) && opened.length > 0 && new Set(opened).size === opened.length);
  assert.ok(Array.isArray(raw.captures) && raw.captures.length > 0);
  raw.captures.forEach(proofShape);
  const names = raw.captures.map(row => {
    assert.equal(row.path, undefined, 'Raw capture paths must use file names');
    assert.ok(local(row.file) && row.file.endsWith('.png')); return row.file;
  });
  assert.equal(new Set(names).size, names.length);
  assert.deepEqual([...opened].sort(), [...names].sort(), 'Open every executed capture before publication');
  assert.equal(raw.invocation?.command, 'node ' + driver, 'The executed command must identify the complete recipe');
  const environment = raw.invocation.environment;
  assert.ok(environment && typeof environment === 'object');
  for (const [field, expected] of [['YAUTJA_QA_MODE', 'compiled-app'], ['YAUTJA_QA_RUNTIME_COMMIT', runtimeCommit], ['YAUTJA_QA_BUILD_ID', buildId]]) assert.equal(environment[field], expected);
  assert.equal(environment.YAUTJA_QA_JOURNEYS, raw.completedJourneys.join(','), 'The complete executed journey list must remain explicit');
  return {production, servedBuilds};
}

/** All executed inputs, including fixture loaders and proof tools, must occur
 * in the frozen inventory and still match their actual current bytes. */
export async function verifyExecutedSourcesV112(raw, freeze, {root = ROOT} = {}) {
  assert.ok(Array.isArray(freeze.entries) && freeze.entries.length > 0);
  freeze.entries.forEach(proofShape);
  const frozen = new Map(freeze.entries.map(row => [row.path, row]));
  assert.equal(frozen.size, freeze.entries.length);
  assert.equal(raw.sourceAfter.length, frozen.size, 'The complete frozen inventory must remain observed');
  for (const row of raw.sourceAfter) {
    proofShape(row); const file = evidencePath(row), expected = frozen.get(file);
    assert.ok(expected, 'Executed source absent from freeze: ' + file);
    assert.equal(expected.sha256, row.sha256, 'Executed source differs from freeze: ' + file);
    assert.equal(expected.bytes, row.bytes, 'Executed source size differs from freeze: ' + file);
    const actual = await pin(root, file);
    assert.equal(actual.sha256, row.sha256, 'Executed source changed after the browser recipe: ' + file);
    assert.equal(actual.bytes, row.bytes);
  }
}

/** A supplied hexadecimal label is not a source identity. Every frozen file
 * must also be the actual regular blob stored in that exact runtime commit. */
export async function verifyRuntimeCommitV112(freeze, runtimeCommit, {root = ROOT} = {}) {
  assert.match(runtimeCommit ?? '', /^[a-f0-9]{40}$/);
  assert.equal(execFileSync('git', ['cat-file', '-t', runtimeCommit], {cwd: root, encoding: 'utf8'}).trim(), 'commit', 'Runtime identity must be a commit object');
  const tree = execFileSync('git', ['ls-tree', '-r', '-z', '--full-tree', runtimeCommit], {
    cwd: root, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024,
  });
  const blobs = new Map(tree.split('\0').filter(Boolean).flatMap(record => {
    const match = /^(100644|100755) blob ([a-f0-9]{40})\t([\s\S]+)$/.exec(record);
    return match ? [[match[3], match[2]]] : [];
  }));
  for (const row of freeze.entries) {
    proofShape(row); assert.ok(blobs.has(row.path), 'Frozen input absent from runtime commit: ' + row.path);
    const bytes = await fs.readFile(path.join(root, row.path));
    assert.equal(bytes.length, row.bytes); assert.equal(sha(bytes), row.sha256);
    const blob = createHash('sha1').update('blob ' + bytes.length + '\0').update(bytes).digest('hex');
    assert.equal(blob, blobs.get(row.path), 'Runtime commit contains different input bytes: ' + row.path);
  }
}

export async function publishValidationV112(options) {
  const {input, opened, runtimeCommit, buildId, domain, driver = V112_RECIPES[domain], root = ROOT} = options;
  assert.ok(Object.hasOwn(V112_RECIPES, domain));
  const BASE = baseFor(domain), REPORT = reportFor(domain);
  assert.equal((await fs.readFile(path.join(root, '.next/BUILD_ID'), 'utf8')).trim(), buildId);
  const freezeBytes = await fs.readFile(path.join(root, FREEZE)), freeze = JSON.parse(freezeBytes);
  assert.deepEqual(await snapshotRuntimeV112({root}), freeze, 'Runtime changed since the V112 production freeze');
  await verifyRuntimeCommitV112(freeze, runtimeCommit, {root});
  const rawBytes = await fs.readFile(input);
  assert.ok(rawBytes.length > 0 && rawBytes.length <= 256 * 1024 * 1024);
  const raw = JSON.parse(rawBytes);
  const {servedBuilds} = validateExecutedResultV112(raw, {...options, driver});
  await verifyExecutedSourcesV112(raw, freeze, {root});
  const inputDirectory = await fs.realpath(path.dirname(path.resolve(input)));
  const images = await Promise.all(raw.captures.map(async capture => {
    const file = await fs.realpath(path.join(inputDirectory, capture.file));
    assert.ok(file.startsWith(inputDirectory + path.sep), 'Capture leaves its executed output directory');
    const bytes = await fs.readFile(file);
    assert.equal(bytes.length, capture.bytes); assert.equal(sha(bytes), capture.sha256);
    assert.ok(bytes.length >= 33 && bytes.subarray(0, 8).toString('hex') === '89504e470d0a1a0a', 'A capture must contain original PNG bytes');
    assert.ok(bytes.readUInt32BE(16) > 0 && bytes.readUInt32BE(20) > 0); return bytes;
  }));
  assert.deepEqual(await snapshotRuntimeV112({root}), freeze, 'Runtime changed while preparing the V112 publication');
  // Finish every read/check before creating any publishable evidence.
  const sourceFreeze = {path: FREEZE, sha256: sha(freezeBytes), bytes: freezeBytes.length};
  await fs.mkdir(path.join(root, BASE), {recursive: true});
  const rawFile = BASE + '/browser-result.json.gz';
  await fs.writeFile(path.join(root, rawFile), gzipSync(rawBytes, {level: 9, mtime: 0}));
  const portableFiles = [{...await pin(root, rawFile), decodedSha256: sha(rawBytes), decodedBytes: rawBytes.length}];
  const captures = [];
  for (const [index, capture] of raw.captures.entries()) {
    const file = BASE + '/' + capture.file;
    await fs.mkdir(path.dirname(path.join(root, file)), {recursive: true});
    await fs.writeFile(path.join(root, file), images[index]);
    const fingerprint = await pin(root, file); portableFiles.push(fingerprint);
    captures.push({file, sha256: fingerprint.sha256, bytes: fingerprint.bytes});
  }
  const report = {
    schemaVersion: 1, release: 'V112', status: 'PASS_CIBLE', scope: raw.scope, sourceFreeze, domain, completedJourneys: raw.completedJourneys,
    production: {mode: 'compiled-app', runtimeCommit, buildId, browserErrors: 0, checksFailed: 0, checksPassed: raw.checks.length, servedBuilds},
    invocation: raw.invocation, sourceBefore: raw.sourceBefore, sourceAfter: raw.sourceAfter,
    errors: raw.errors, consoleErrors: raw.consoleErrors, workerErrors: raw.workerErrors, requestsFailed: raw.requestsFailed,
    checks: raw.checks, captures, capturesOpened: captures.map(row => row.file), rawEvidence: portableFiles[0],
  };
  await fs.writeFile(path.join(root, REPORT), JSON.stringify(report, null, 2) + '\n');
  const entry = {
    domain, status: 'PASS_CIBLE', buildId, runtimeCommit, driver,
    command: raw.invocation.command, sourceFreeze, report: await pin(root, REPORT),
    browserChecksPassed: raw.checks.length, capturesInspected: opened.length, portableFiles,
  };
  await fs.writeFile(path.join(root, BASE, 'entry.json'), JSON.stringify(entry, null, 2) + '\n');
  return entry;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const options = {};
  for (let index = 2; index < process.argv.length; index += 2) {
    const key = process.argv[index].slice(2);
    assert.ok(process.argv[index].startsWith('--') && process.argv[index + 1]
      && ['input', 'driver', 'opened', 'runtimeCommit', 'buildId', 'domain'].includes(key) && !Object.hasOwn(options, key));
    options[key] = process.argv[index + 1];
  }
  for (const field of ['input', 'opened', 'runtimeCommit', 'buildId', 'domain']) assert.ok(options[field], 'Missing --' + field);
  options.opened = JSON.parse(await fs.readFile(options.opened, 'utf8'));
  const result = await publishValidationV112(options);
  console.log(JSON.stringify({domain: result.domain, checks: result.browserChecksPassed, captures: result.capturesInspected, report: result.report}));
}
