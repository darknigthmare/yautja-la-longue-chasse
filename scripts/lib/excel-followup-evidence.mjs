/** Stable source probes and lossless production evidence checks for versioned follow-ups. */
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
export const local = file => typeof file === 'string' && file && !path.isAbsolute(file) && !file.includes('\\') && !file.includes('\0') && file.split('/').every(part => part && part !== '.' && part !== '..');
export const evidencePath = row => row.path ?? row.file;
export const proofShape = row => {assert.ok(local(evidencePath(row))); assert.match(row.sha256 ?? '', /^[a-f0-9]{64}$/); assert.ok(Number.isSafeInteger(row.bytes) && row.bytes > 0);};
export function normalizeServedBuilds(responses, buildId) {
  assert.ok(Array.isArray(responses) && responses.length);
  return responses.map(response => {
    assert.equal(response.status, 200); assert.equal(response.foundInHtml, true);
    assert.equal(response.expectedBuildId ?? response.buildId, buildId);
    if (Object.hasOwn(response, 'expectedBuildId') && Object.hasOwn(response, 'buildId')) assert.equal(response.expectedBuildId, response.buildId);
    assert.match(response.htmlSha256 ?? response.sha256 ?? '', /^[a-f0-9]{64}$/, 'The served production HTML must have a recorded SHA256');
    return {...response, expectedBuildId: buildId};
  });
}
export function verifyCaptureCoverage({opened, portableFiles, recordedCaptures, rawCaptures}) {
  assert.ok(Array.isArray(opened) && opened.length && new Set(opened).size === opened.length, 'Inspected capture names must be unique');
  const png = portableFiles.filter(row => evidencePath(row).endsWith('.png'));
  assert.deepEqual(png.map(evidencePath).sort(), [...opened].sort(), 'Every inspected PNG must be present exactly once in portable evidence');
  for (const captures of [recordedCaptures, rawCaptures]) {
    assert.ok(Array.isArray(captures) && captures.length === opened.length);
    captures.forEach(proofShape);
    assert.equal(new Set(captures.map(evidencePath)).size, captures.length, 'Executed capture names must be unique');
  }
  assert.deepEqual(recordedCaptures.map(evidencePath).sort(), [...opened].sort(), 'Recorded capture inventory must equal the inspection list');
  const usedRaw = new Set();
  for (const image of png) {
    const file = evidencePath(image), recorded = recordedCaptures.find(row => evidencePath(row) === file);
    assert.ok(recorded); assert.equal(recorded.sha256, image.sha256); assert.equal(recorded.bytes, image.bytes);
    const original = rawCaptures.filter(row => file === evidencePath(row) || file.endsWith('/' + evidencePath(row))).sort((a, b) => evidencePath(b).length - evidencePath(a).length)[0];
    assert.ok(original, 'Portable image absent from the executed raw capture inventory'); assert.equal(original.sha256, image.sha256); assert.equal(original.bytes, image.bytes);
    assert.ok(!usedRaw.has(evidencePath(original)), 'One raw capture cannot account for two portable images'); usedRaw.add(evidencePath(original));
  }
  assert.equal(usedRaw.size, rawCaptures.length, 'Every raw capture must remain portable');
}

export function createFollowupEvidence({root: ROOT, release, recipes}) {
  assert.match(release, /^V[0-9]+$/);
  const read = file => fs.readFile(path.join(ROOT, file));
  const fingerprint = files => Promise.all([...new Set(files)].sort().map(async file => {assert.ok(local(file)); const bytes = await read(file); return {path: file, sha256: sha(bytes), bytes: bytes.length};}));
async function collectDefinitionFacts(registry) {
  if (!registry.runtimeModules.length) return {facts: {}, inputs: []};
  const compiled = await build({stdin: {contents: registry.runtimeModules.map(row => `import * as ${row.id} from ${JSON.stringify('./' + row.path)}; export {${row.id}};`).join('\n'), resolveDir: ROOT}, absWorkingDir: ROOT, bundle: true, write: false, metafile: true, platform: 'node', format: 'esm', logLevel: 'silent'});
  const imports = Object.keys(compiled.metafile.inputs).filter(file => file !== '<stdin>');
  const before = await fingerprint(imports);
  const api = await import('data:text/javascript;base64,' + Buffer.from(compiled.outputFiles[0].text).toString('base64'));
  const invoke = (call, depth = 0) => {
    assert.ok(depth <= 3 && registry.runtimeModules.some(row => row.id === call.module));
    assert.match(call.export, /^[A-Za-z][A-Za-z0-9_]*$/); assert.ok(Object.hasOwn(api[call.module], call.export));
    const target = api[call.module][call.export];
    const args = (call.args ?? []).map(arg => arg && typeof arg === 'object' && Object.hasOwn(arg, 'call') ? invoke(arg.call, depth + 1) : arg);
    if (call.args !== undefined) assert.equal(typeof target, 'function', 'A fact call requires an exported function');
    let result = call.args === undefined ? target : target(...args);
    for (const key of call.path ?? []) {assert.ok(typeof key === 'string' && !['__proto__', 'constructor', 'prototype'].includes(key)); assert.ok(result && Object.hasOwn(result, key)); result = result[key];}
    return result;
  };
  const facts = {};
  for (const probe of registry.factProbes) {
    const results = probe.calls.map(call => invoke(call));
    let value;
    if (probe.operation === 'length') {assert.equal(results.length, 1); assert.ok(Array.isArray(results[0])); value = results[0].length;}
    else if (probe.operation === 'uniqueIds') {assert.ok(results.every(Array.isArray)); const rows = results.flat(); assert.ok(rows.every(row => row && typeof row.id === 'string' && row.id)); value = new Set(rows.map(row => row.id)).size;}
    else if (probe.operation === 'ids') {assert.ok(results.every(Array.isArray)); const ids = results.flat().map(row => typeof row === 'string' ? row : row?.id); assert.ok(ids.every(id => typeof id === 'string' && id)); value = [...new Set(ids)].sort();}
    else {assert.equal(results.length, 1); value = results[0]; assert.ok(['number', 'string', 'boolean'].includes(typeof value) || value === null); if (typeof value === 'number') assert.ok(Number.isFinite(value));}
    if (Object.hasOwn(probe, 'expected')) assert.deepEqual(value, probe.expected, 'Definition measurement changed: ' + probe.id);
    facts[probe.id] = value;
  }
  assert.deepEqual(await fingerprint(imports), before, 'Application definitions changed during collection');
  return {facts, inputs: before};
}

async function verifyProductionSummary(master, freeze) {
  assert.equal(master.release, release); assert.equal(master.status, 'PASS_CIBLE');
  assert.match(master.runtimeCommit, /^[a-f0-9]{40}$/); assert.ok(master.productionBuildId);
  assert.deepEqual(master.production.map(row => row.domain).sort(), ['Clans', 'Homeworld', 'Pit', 'Preserve']);
  assert.equal(new Set(master.production.map(row => row.report.path)).size, 4);
  const frozen = new Map(freeze.entries.map(row => [row.path, row]));
  const evidence = [];
  const verify = async row => {proofShape(row); const file = evidencePath(row); assert.ok(file.startsWith('docs/')); const bytes = await read(file); assert.equal(bytes.length, row.bytes); assert.equal(sha(bytes), row.sha256); evidence.push(file); return bytes;};
  for (const row of master.production) {
    assert.equal(row.status, 'PASS_CIBLE'); assert.equal(row.buildId, master.productionBuildId); assert.equal(row.runtimeCommit, master.runtimeCommit);
    assert.ok(local(row.driver) && new RegExp('^scripts/qa-.+-' + release.toLowerCase() + '\\.mjs$').test(row.driver), 'An explicit ' + release + ' domain driver is required');
    assert.equal(row.driver, recipes[row.domain], 'Recipe does not match its domain: ' + row.domain);
    assert.ok(row.command?.includes('node ' + row.driver));
    const report = JSON.parse(await verify(row.report)); const production = report.production ?? report;
    assert.ok(['PASS', 'PASS_CIBLE'].includes(report.status)); assert.ok(['production', 'compiled-app'].includes(production.mode ?? report.mode));
    assert.equal(production.runtimeCommit, master.runtimeCommit); assert.equal(production.buildId ?? report.buildId, master.productionBuildId);
    assert.equal(production.browserErrors, 0); assert.equal(production.checksFailed, 0); assert.ok(production.checksPassed > 0); assert.equal(row.browserChecksPassed, production.checksPassed);
    const served = production.servedBuilds ?? report.servedBuilds; assert.ok(served?.length);
    assert.deepEqual(normalizeServedBuilds(served, master.productionBuildId), served);
    for (const response of served) {assert.equal(response.status, 200); assert.equal(response.expectedBuildId, master.productionBuildId); assert.equal(response.foundInHtml, true);}
    const before = report.sourceBefore ?? production.sourceBefore, after = report.sourceAfter ?? production.sourceAfter;
    assert.ok(before?.length); assert.deepEqual(before, after); assert.ok(after.some(source => evidencePath(source) === row.driver));
    for (const source of after) {
      const file = evidencePath(source); assert.ok(local(file)); const bytes = await read(file); assert.equal(sha(bytes), source.sha256, 'Executed source changed: ' + file); if (source.bytes !== undefined) assert.equal(bytes.length, source.bytes); evidence.push(file);
      if (file.startsWith('app/') || file.startsWith('public/')) {assert.ok(frozen.has(file), 'Observed runtime input absent from freeze'); assert.equal(frozen.get(file).sha256, source.sha256);}
    }
    assert.ok(row.portableFiles?.length && report.capturesOpened?.length);
    assert.equal(new Set(report.capturesOpened).size, report.capturesOpened.length); assert.equal(row.capturesInspected, report.capturesOpened.length);
    const inventories = [report], portableJson = new Map();
    for (const portable of row.portableFiles) {
      const bytes = await verify(portable), file = evidencePath(portable);
      if (file.endsWith('.json')) {const value = JSON.parse(bytes); inventories.push(value); portableJson.set(file, value);}
      if (file.endsWith('.json.gz')) {
        assert.ok(Number.isSafeInteger(portable.decodedBytes) && portable.decodedBytes > 0 && portable.decodedBytes <= 256 * 1024 * 1024); assert.match(portable.decodedSha256 ?? '', /^[a-f0-9]{64}$/);
        const raw = gunzipSync(bytes, {maxOutputLength: portable.decodedBytes}); assert.equal(raw.length, portable.decodedBytes); assert.equal(sha(raw), portable.decodedSha256); const value = JSON.parse(raw); inventories.push(value); portableJson.set(file, value);
      }
    }
    proofShape(report.rawEvidence);
    const rawReference = row.portableFiles.find(item => evidencePath(item) === evidencePath(report.rawEvidence));
    assert.ok(rawReference, 'Complete executed raw evidence is required'); assert.deepEqual(rawReference, report.rawEvidence);
    const raw = portableJson.get(evidencePath(rawReference)); assert.ok(raw, 'Raw evidence must be a portable JSON result');
    const rawProduction = raw.production ?? raw;
    assert.equal(raw.status, 'PASS'); assert.ok(['compiled-app', 'production'].includes(rawProduction.mode));
    assert.equal(rawProduction.runtimeCommit, master.runtimeCommit); assert.equal(rawProduction.buildId, master.productionBuildId);
    for (const field of ['mode', 'runtimeCommit', 'buildId', 'servedBuilds']) if (rawProduction !== raw && Object.hasOwn(raw, field)) assert.deepEqual(raw[field], rawProduction[field], 'Ambiguous executed production identity: ' + field);
    assert.deepEqual(raw.sourceBefore, before); assert.deepEqual(raw.sourceAfter, after); assert.deepEqual(normalizeServedBuilds(rawProduction.servedBuilds, master.productionBuildId), served);
    assert.deepEqual(raw.errors ?? raw.browserErrors, []); assert.ok(Array.isArray(raw.checks) && raw.checks.length === production.checksPassed && raw.checks.every(check => check.status === 'PASS'));
    if (Object.hasOwn(raw, 'consoleErrors')) assert.deepEqual(raw.consoleErrors, []);
    for (const [field, expected] of [['checksPassed', raw.checks.length], ['checksFailed', 0], ['browserErrors', 0]]) if (Object.hasOwn(rawProduction, field)) assert.equal(rawProduction[field], expected);
    assert.ok(typeof raw.scope === 'string' && raw.scope.trim() || raw.scope && typeof raw.scope === 'object', 'The executed scope and fixtures must remain declared');
    assert.deepEqual(report.scope, raw.scope, 'The published scope must equal the executed scope');
    if (raw.scope && typeof raw.scope === 'object' && Object.hasOwn(raw.scope, 'resumedFrom')) assert.equal(raw.scope.resumedFrom, null, 'Exploratory resumed runs cannot certify the final journey');
    assert.deepEqual(report.checks, raw.checks);
    if (raw.invocation) {assert.ok(raw.invocation.command?.includes('node ' + row.driver), 'Executed raw invocation must match its domain'); assert.deepEqual(report.invocation, raw.invocation);}
    else {if (raw.command?.script) assert.equal(raw.command.script, row.driver, 'Executed raw script must match its domain'); assert.deepEqual(report.invocation, {command: 'node ' + row.driver}, 'A wrapper fallback must identify exactly the source-pinned driver');}
    assert.ok(Array.isArray(raw.captures) && raw.captures.length === report.capturesOpened.length);
    const captureName = capture => typeof capture === 'string' ? capture : capture.file ?? capture.path;
    const captureInventory = inventories.find(item => Array.isArray(item.captures) && item.captures.length && report.capturesOpened.every(name => item.captures.some(capture => captureName(capture) === name)));
    assert.ok(captureInventory); assert.deepEqual(captureInventory.captures.map(captureName).sort(), [...report.capturesOpened].sort());
    verifyCaptureCoverage({opened: report.capturesOpened, portableFiles: row.portableFiles, recordedCaptures: captureInventory.captures, rawCaptures: raw.captures});
  }
  return [...new Set(evidence)];
}

  return {collectDefinitionFacts, verifyProductionSummary, fingerprint};
}
