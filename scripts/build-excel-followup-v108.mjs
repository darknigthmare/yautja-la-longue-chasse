#!/usr/bin/env node
/** Append a current, evidence-bounded follow-up to the immutable V107 workbook. */
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {gunzipSync} from 'node:zlib';
export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const REGISTRY = 'docs/v108-workstreams-source.json';
export const OUTPUTS = ['v108-workstreams.json', 'YAUTJA_V108_SUIVI.xlsx', 'v108-excel-followup-qa.json'];
export const BASELINE_V108 = {path: 'docs/YAUTJA_V107_SUIVI.xlsx', sha256: 'a9a2419702387868f6f54efd068008422609bc880b58e9a85c35a51e5fdfb66d'};
const HISTORICAL = {path: 'docs/v107-workstreams.json', sha256: '224ecb016256d03589cfcd3bc5d32a3237e810ede0f449f9e611603696051fc5'};
const WRITER = 'scripts/build-excel-followup-v108.py';
export const FAMILY_IDS_V108 = ['pit-roster-kits', 'war-structures', 'enforcer-pngs', 'preserve-expansion', 'enforcer-provenance', 'pit-actions', 'pit-campaigns', 'pit-variants'];
export const PRODUCTION_RECIPES_V108 = {Pit: 'scripts/qa-pit-campaign-v108.mjs', Homeworld: 'scripts/qa-homeworld-cargo-v108.mjs', Clans: 'scripts/qa-clan-logistics-v108.mjs', Preserve: 'scripts/qa-preserve-expedition-v108.mjs'};
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const read = file => fs.readFile(path.join(ROOT, file));
const json = async file => JSON.parse(await read(file));
const local = file => typeof file === 'string' && file && !path.isAbsolute(file) && !file.includes('\\') && !file.includes('\0') && file.split('/').every(part => part && part !== '.' && part !== '..');
const fingerprint = files => Promise.all([...new Set(files)].sort().map(async file => {assert.ok(local(file)); const bytes = await read(file); return {path: file, sha256: sha(bytes), bytes: bytes.length};}));
const proofShape = row => {assert.ok(local(row.path ?? row.file)); assert.match(row.sha256 ?? '', /^[a-f0-9]{64}$/); assert.ok(Number.isSafeInteger(row.bytes) && row.bytes > 0);};
const evidencePath = row => row.path ?? row.file;

/** Every inspected image must remain portable and correspond to exactly one
 * actual raw capture, with unchanged bytes. Other portable JSON is separate. */
export function verifyCaptureCoverageV108({opened, portableFiles, recordedCaptures, rawCaptures}) {
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

export function verifyRegistryV108(registry) {
  assert.equal(registry.schemaVersion, 1); assert.equal(registry.release, 'V108');
  assert.match(registry.asOf, /^\d{4}-\d{2}-\d{2}$/); assert.deepEqual(registry.baseline, BASELINE_V108);
  assert.ok(['PENDING_RUNTIME_FREEZE', 'FROZEN'].includes(registry.baselineFreeze));
  assert.deepEqual(registry.workstreams.map(row => row.id).sort(), [...FAMILY_IDS_V108, 'homeworld-cargo'].sort());
  for (const row of registry.workstreams) {
    assert.ok(['OUVERT', 'EN_COURS', 'A_VALIDER', 'LIVRE_PARTIEL', 'VALIDE_CIBLE', 'HERITE_STATIQUE'].includes(row.status));
    assert.ok(row.title && row.source && row.runtime && row.remaining && row.validationScope);
    assert.ok(Array.isArray(row.implementation) && row.implementation.every(local) && Array.isArray(row.proof));
    for (const proof of row.proof) proofShape(proof);
    if (row.status === 'VALIDE_CIBLE') {
      assert.equal(registry.baselineFreeze, 'FROZEN', 'Freeze the actual runtime before promotion');
      assert.ok(row.tests?.startsWith('PASS') && row.browser?.startsWith('PASS_CIBLE_PRODUCTION'));
      assert.ok(row.proof.some(proof => proof.path === 'docs/v108-validation-summary.json'));
      assert.ok(row.proof.length >= 2, 'Domain and master proof required');
    }
  }
  // This iteration adds exercises and physical handling. None of those closes
  // a full source kit, source campaign, source variant, acquisition or 80/100 target.
  assert.deepEqual(registry.closedOpenItemIds, [], 'Bounded V108 improvements cannot close full source rows');
  assert.ok(Array.isArray(registry.runtimeModules) && Array.isArray(registry.factProbes));
  const ids = new Set();
  for (const row of registry.runtimeModules) {assert.match(row.id, /^[A-Za-z][A-Za-z0-9]*$/); assert.ok(!ids.has(row.id)); ids.add(row.id); assert.ok(local(row.path) && /^app\/.+\.(ts|tsx)$/.test(row.path));}
  assert.equal(new Set(registry.factProbes.map(row => row.id)).size, registry.factProbes.length);
  for (const row of registry.factProbes) {assert.match(row.id, /^[A-Za-z][A-Za-z0-9]*$/); assert.ok(['value', 'length', 'uniqueIds'].includes(row.operation)); assert.ok(Array.isArray(row.calls) && row.calls.length > 0);}
  assert.ok(Array.isArray(registry.validations) && Array.isArray(registry.limits));
  for (const row of registry.validations) {assert.ok(row.id && row.command && row.scope && row.limit && Array.isArray(row.evidence)); if (row.status.startsWith('PASS')) {assert.ok(row.evidence.length); row.evidence.forEach(proofShape);}}
  if (registry.baselineFreeze === 'FROZEN') {assert.equal(registry.runtimeFreeze?.path, 'docs/v108-runtime-freeze.json'); proofShape(registry.runtimeFreeze); assert.ok(registry.runtimeModules.length >= 3 && registry.factProbes.length > 0);}
}

/** Bounded calls against the actual current application exports. Counts are
 * definition measurements; this function does not certify a browser journey. */
export async function collectDefinitionFactsV108(registry) {
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
    else {assert.equal(results.length, 1); value = results[0]; assert.ok(['number', 'string', 'boolean'].includes(typeof value) || value === null); if (typeof value === 'number') assert.ok(Number.isFinite(value));}
    if (Object.hasOwn(probe, 'expected')) assert.deepEqual(value, probe.expected, 'Definition measurement changed: ' + probe.id);
    facts[probe.id] = value;
  }
  assert.deepEqual(await fingerprint(imports), before, 'Application definitions changed during collection');
  return {facts, inputs: before};
}

async function python(payload, mode = '') {
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'yautja-excel-v108-'));
  try {
    if (payload.workbook) {await fs.writeFile(path.join(temporary, 'verify.xlsx'), payload.workbook); payload = {...payload, workbook: undefined, workbookPath: path.join(temporary, 'verify.xlsx')};}
    const request = path.join(temporary, 'request.json'); await fs.writeFile(request, JSON.stringify(payload));
    return execFileSync('python3', [path.join(ROOT, WRITER), ...(mode ? [mode] : []), '--request', request], {timeout: 30000, maxBuffer: 50 * 1024 * 1024});
  } finally {await fs.rm(temporary, {recursive: true, force: true});}
}
export const writeWorkbookV108 = (baseline, sheets) => python({root: ROOT, baseline, sheets});
export const verifyWorkbookV108 = async (workbook, baseline = BASELINE_V108) => JSON.parse(await python({root: ROOT, baseline, workbook}, '--verify'));

/** Actual reports, their executed drivers, captures and served build must agree.
 * Source probes or a textual PASS cannot substitute for a production recipe. */
export async function verifyProductionSummaryV108(master, freeze) {
  assert.equal(master.release, 'V108'); assert.equal(master.status, 'PASS_CIBLE');
  assert.match(master.runtimeCommit, /^[a-f0-9]{40}$/); assert.ok(master.productionBuildId);
  assert.deepEqual(master.production.map(row => row.domain).sort(), ['Clans', 'Homeworld', 'Pit', 'Preserve']);
  assert.equal(new Set(master.production.map(row => row.report.path)).size, 4);
  const frozen = new Map(freeze.entries.map(row => [row.path, row]));
  const evidence = [];
  const verify = async row => {proofShape(row); const file = evidencePath(row); assert.ok(file.startsWith('docs/')); const bytes = await read(file); assert.equal(bytes.length, row.bytes); assert.equal(sha(bytes), row.sha256); evidence.push(file); return bytes;};
  for (const row of master.production) {
    assert.equal(row.status, 'PASS_CIBLE'); assert.equal(row.buildId, master.productionBuildId); assert.equal(row.runtimeCommit, master.runtimeCommit);
    assert.ok(local(row.driver) && /^scripts\/qa-.+-v108\.mjs$/.test(row.driver), 'An explicit V108 domain driver is required');
    assert.equal(row.driver, PRODUCTION_RECIPES_V108[row.domain], 'Recipe does not match its domain: ' + row.domain);
    assert.ok(row.command?.includes('node ' + row.driver));
    const report = JSON.parse(await verify(row.report)); const production = report.production ?? report;
    assert.ok(['PASS', 'PASS_CIBLE'].includes(report.status)); assert.ok(['production', 'compiled-app'].includes(production.mode ?? report.mode));
    assert.equal(production.runtimeCommit, master.runtimeCommit); assert.equal(production.buildId ?? report.buildId, master.productionBuildId);
    assert.equal(production.browserErrors, 0); assert.equal(production.checksFailed, 0); assert.ok(production.checksPassed > 0); assert.equal(row.browserChecksPassed, production.checksPassed);
    const served = production.servedBuilds ?? report.servedBuilds; assert.ok(served?.length);
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
    assert.deepEqual(raw.sourceBefore, before); assert.deepEqual(raw.sourceAfter, after); assert.deepEqual(rawProduction.servedBuilds, served);
    assert.deepEqual(raw.errors ?? raw.browserErrors, []); assert.ok(Array.isArray(raw.checks) && raw.checks.length === production.checksPassed && raw.checks.every(check => check.status === 'PASS'));
    for (const [field, expected] of [['checksPassed', raw.checks.length], ['checksFailed', 0], ['browserErrors', 0]]) if (Object.hasOwn(rawProduction, field)) assert.equal(rawProduction[field], expected);
    if (row.domain === 'Clans') {assert.equal(raw.scope.context, 'linked-physical-logistics-v108'); assert.equal(raw.scope.stateInjection, false); assert.equal(raw.scope.resumedFrom, null, 'Exploratory resumed runs cannot certify the final full convoy');}
    assert.deepEqual(report.checks, raw.checks);
    if (raw.invocation) {assert.ok(raw.invocation.command?.includes('node ' + row.driver), 'Executed raw invocation must match its domain'); assert.deepEqual(report.invocation, raw.invocation);}
    else {if (raw.command?.script) assert.equal(raw.command.script, row.driver, 'Executed raw script must match its domain'); assert.deepEqual(report.invocation, {command: 'node ' + row.driver}, 'A wrapper fallback must identify exactly the source-pinned driver');}
    assert.ok(Array.isArray(raw.captures) && raw.captures.length === report.capturesOpened.length);
    const captureName = capture => typeof capture === 'string' ? capture : capture.file ?? capture.path;
    const captureInventory = inventories.find(item => Array.isArray(item.captures) && item.captures.length && report.capturesOpened.every(name => item.captures.some(capture => captureName(capture) === name)));
    assert.ok(captureInventory); assert.deepEqual(captureInventory.captures.map(captureName).sort(), [...report.capturesOpened].sort());
    verifyCaptureCoverageV108({opened: report.capturesOpened, portableFiles: row.portableFiles, recordedCaptures: captureInventory.captures, rawCaptures: raw.captures});
  }
  return [...new Set(evidence)];
}

export async function collectFollowupV108(registry = undefined) {
  registry ??= await json(REGISTRY); verifyRegistryV108(registry);
  assert.equal(sha(await read(BASELINE_V108.path)), BASELINE_V108.sha256);
  assert.equal(sha(await read(HISTORICAL.path)), HISTORICAL.sha256, 'Published V107 snapshot changed');
  const historical = await json(HISTORICAL.path); assert.equal(historical.openItems.length, 56);
  const definitions = await collectDefinitionFactsV108(registry);
  const guarded = [REGISTRY, WRITER, 'scripts/build-excel-followup-v108.mjs', 'scripts/lib/excel_followup_append.py', 'scripts/build-excel-followup-v100.py', BASELINE_V108.path, HISTORICAL.path, ...definitions.inputs.map(row => row.path), ...registry.workstreams.flatMap(row => row.implementation)];
  const before = await fingerprint(guarded), references = [...registry.workstreams.flatMap(row => row.proof), ...registry.validations.flatMap(row => row.evidence)];
  for (const proof of references) {const bytes = await read(evidencePath(proof)); assert.equal(bytes.length, proof.bytes); assert.equal(sha(bytes), proof.sha256);}
  let productionEvidence = [], freezeEntriesVerified = 0, production = null;
  if (registry.baselineFreeze === 'FROZEN') {
    const bytes = await read(registry.runtimeFreeze.path); assert.equal(bytes.length, registry.runtimeFreeze.bytes); assert.equal(sha(bytes), registry.runtimeFreeze.sha256);
    const freeze = JSON.parse(bytes); assert.equal(freeze.files, freeze.entries.length); assert.equal(new Set(freeze.entries.map(row => row.path)).size, freeze.files); assert.equal(freeze.bytes, freeze.entries.reduce((sum, row) => sum + row.bytes, 0));
    for (const row of freeze.entries) {assert.ok(local(row.path)); const input = await read(row.path); assert.equal(input.length, row.bytes); assert.equal(sha(input), row.sha256, 'Frozen V108 input changed: ' + row.path);}
    const frozen = new Map(freeze.entries.map(row => [row.path, row]));
    for (const row of definitions.inputs.filter(row => row.path.startsWith('app/'))) {assert.equal(frozen.get(row.path)?.sha256, row.sha256, 'Measured app source absent from production freeze');}
    production = await json('docs/v108-validation-summary.json'); assert.deepEqual(production.sourceFreeze, registry.runtimeFreeze); productionEvidence = await verifyProductionSummaryV108(production, freeze); freezeEntriesVerified = freeze.files;
  }
  const openItems = historical.openItems.map(row => {const stream = registry.workstreams.find(stream => stream.id === row.familyId); assert.ok(stream); return {...row, sourceStatusV107: row.status, statusV108: 'OUVERT_SOURCE', progressV108: stream.runtime, remainingV108: stream.remaining, evidenceV108: stream.proof};});
  const families = historical.families.map(row => ({...row, remainingCountV108: openItems.filter(item => item.familyId === row.id).length, progressV108: registry.workstreams.find(stream => stream.id === row.id).runtime}));
  const inputs = await fingerprint([...guarded, ...references.map(evidencePath), ...productionEvidence, ...(production ? [registry.runtimeFreeze.path, 'docs/v108-validation-summary.json'] : [])]);
  assert.deepEqual(await fingerprint(guarded), before, 'Sources changed during follow-up collection');
  return {schemaVersion: 1, release: 'V108', asOf: registry.asOf, baseline: registry.baseline, historicalSnapshot: HISTORICAL, baselineFreeze: registry.baselineFreeze, runtimeFreeze: registry.runtimeFreeze ?? null, freezeEntriesVerified,
    method: 'Append-only continuation of the 73 published V107 worksheets. All 56 remaining source rows are retained; current definition measurements, executed tests and actual production recipes have separate scopes. The generator never runs a browser or native Excel.',
    facts: {trackedOriginalOpenItems: 77, inheritedClosedItems: historical.closedOpenItemIds.length, inheritedOpenItems: 56, openItems: openItems.length, newlyClosedItems: 0, completeCharacters: 0, sourceCampaignsComplete: 0, variantConstraintsComplete: 0, warCampaignAcquisitions: 0, sourceRuntimeBindingsInherited: 43, sourceActionsRemaining: 9, newNativeBodyDrawings: 0},
    definitionFacts: definitions.facts, production: production ? {runtimeCommit: production.runtimeCommit, buildId: production.productionBuildId, browserChecks: production.production.reduce((sum, row) => sum + row.browserChecksPassed, 0), inspectedCaptures: production.production.reduce((sum, row) => sum + row.capturesInspected, 0)} : null,
    delivery: {completeKits: 'OUVERT', sourceCampaigns: 'OUVERT', variantAnimations: 'OUVERT', canonicalFidelity: 'NON_CERTIFIE'}, families, workstreams: registry.workstreams, originalOpenItems: historical.openItems, openItems, closedOpenItemIds: [], inputs, validations: registry.validations, limits: registry.limits};
}

const column = (key, label, width = 36) => ({key, label, width});
const printable = value => value == null ? '' : typeof value === 'object' && !('formula' in value && 'cached' in value) ? JSON.stringify(value) : value;
const sheet = (name, title, columns, rows) => ({name, title, subtitle: 'V108 · sources conservées, progrès partiels et preuves distinctes', columns, rows: rows.map(row => Object.fromEntries(Object.entries(row).map(([key, value]) => [key, printable(value)])))});
export function buildSheetsV108(snapshot) {
  const metric = (label, value, scope, formula) => ({label, value: formula ? {formula, cached: value} : value, scope});
  const summary = [metric('Lignes source restant ouvertes', snapshot.openItems.length, 'Les 56 lignes V107 restantes sont conservées.', "COUNTA('ManquantsV108'!A5:A60)"), metric('Feuilles historiques conservées', 73, BASELINE_V108.path), metric('Nouvelles clôtures source', 0, 'Exercices et améliorations partielles ne ferment pas les cibles complètes.'), metric('Liaisons source héritées / actions restantes', '43 / 9', 'Aucune admission par compteur ou ancienne preuve relabellée.'), metric('Kits / campagnes / variantes complets', '0 / 0 / 0', 'Les cellules source restent suivies.'), metric('Acquisitions de campagne des six ouvrages', 0, 'Exercices spécialisés séparés des droits de campagne.'), metric('Nouveaux BODY natifs', 0, 'Réemploi des dessins existants déclaré.'), metric('État du gel production', snapshot.baselineFreeze, 'Les mesures de définition ne sont pas un parcours navigateur.'), metric('Contrôles navigateur exécutés', snapshot.production?.browserChecks ?? 'À VALIDER', 'Uniquement les rapports courants épinglés.'), metric('Captures réellement inspectées', snapshot.production?.inspectedCaptures ?? 'À VALIDER', 'Les captures historiques ne sont pas comptées comme V108.'), ...['OUVERT', 'EN_COURS', 'A_VALIDER', 'LIVRE_PARTIEL', 'VALIDE_CIBLE', 'HERITE_STATIQUE'].map(status => metric('Chantiers ' + status, snapshot.workstreams.filter(row => row.status === status).length, 'Périmètre limité de la ligne.', `COUNTIF('ChantiersV108'!E5:E13,"${status}")`)), metric('Excel natif exécuté', 'NON', 'Vérifications ZIP/XML, valeurs, caches et formules seulement.')];
  const streamColumns = [column('id', 'ID', 38), column('domain', 'Domaine', 28), column('title', 'Chantier', 65), column('source', 'Sources exactes', 120), column('status', 'État', 30), column('validationScope', 'Périmètre livré', 100), column('runtime', 'AméliorationV108', 145), column('tests', 'Tests exécutés', 120), column('browser', 'Production réelle', 120), column('proof', 'Preuves SHA', 145), column('remaining', 'Reste ouvert', 145)];
  const subset = (name, title, ids, prefix) => sheet(name, title, streamColumns, [...snapshot.workstreams.filter(row => ids.includes(row.id)), ...Object.entries(snapshot.definitionFacts).filter(([id]) => prefix && id.startsWith(prefix)).map(([id, value]) => ({id, domain: 'Mesure de définition', title: id, source: REGISTRY + ' · factProbes', status: 'DEFINITION_MESUREE', runtime: String(value), validationScope: 'Valeur mesurée dans les exports réels du code courant.', remaining: 'La mesure seule ne valide aucune scène, acquisition ou variante complète.'}))]);
  return [sheet('SyntheseV108', 'YAUTJA · suivi actif V108', [column('label', 'Indicateur', 60), column('value', 'Valeur', 35), column('scope', 'Portée', 145)], summary), sheet('ChantiersV108', 'Les huit familles et le chantier Homeworld', streamColumns, snapshot.workstreams), sheet('FamillesV108', 'Continuité des huit familles source', [column('id', 'Famille'), column('label', 'Libellé', 60), column('count', 'Lignes initiales', 20), column('remainingCountV108', 'Lignes restantes', 24), column('progressV108', 'Progrès courant', 145), column('target', 'Cible source', 145), column('itemIds', 'IDs source', 145)], snapshot.families), sheet('ManquantsV108', 'Chaque ligne source encore ouverte', [column('id', 'ID', 60), column('familyId', 'Famille', 38), column('source', 'Cellule / ligne source', 120), column('sourceStatusV107', 'Statut hérité', 35), column('statusV108', 'Statut sourceV108', 35), column('remaining', 'Besoin source hérité', 145), column('progressV108', 'Progrès partielV108', 145), column('remainingV108', 'Limite actuelle', 145), column('evidenceV108', 'Preuves courantes', 145)], snapshot.openItems), subset('PitV108', 'Actions, continuité, campagnes et variantes', ['pit-roster-kits', 'pit-actions', 'pit-campaigns', 'pit-variants'], 'pit'), subset('HomeworldV108', 'Intendante et tri physique des lots', ['homeworld-cargo'], 'homeworld'), subset('ClansV108', 'Six ouvrages et continuité des opérations', ['war-structures'], 'clan'), sheet('PreserveV108', 'Nouvelle réserve et catalogue sans doublons', [column('id', 'Mesure', 55), column('value', 'Définition courante', 30), column('scope', 'Portée', 145)], Object.entries(snapshot.definitionFacts).filter(([id]) => id.startsWith('preserve')).map(([id, value]) => ({id, value, scope: 'Mesure du code courant ; les preuves production sont consignées séparément.'}))), subset('ArtV108', 'Production statique et preuves de provenance', ['enforcer-pngs', 'enforcer-provenance']), sheet('SourcesV108', 'Entrées réellement vérifiées', [column('path', 'Chemin', 125), column('sha256', 'SHA256', 72), column('bytes', 'Octets', 22)], snapshot.inputs), sheet('ValidationsV108', 'Vérifications exécutées et leurs limites', [column('id', 'ID', 48), column('status', 'État', 32), column('scope', 'Portée', 130), column('command', 'Commande', 145), column('evidence', 'Preuves SHA', 145), column('limit', 'Limites', 145)], snapshot.validations.length ? snapshot.validations : [{id: 'V108-PRODUCTION-PENDING', status: 'A_VALIDER', scope: 'Implémentation en cours ; aucun parcours production revendiqué.', command: 'À consigner après exécution réelle', evidence: [], limit: 'Le générateur ne lance pas le navigateur.'}]), sheet('JournalV108', 'Méthode et limites', [column('subject', 'Sujet', 50), column('detail', 'Décision / limite', 145)], [{subject: 'Méthode', detail: snapshot.method}, {subject: 'V107 historique', detail: 'node scripts/check-excel-history-v108.mjs --check --tests'}, {subject: 'V108 courant', detail: 'node scripts/build-excel-followup-v108.mjs --check'}, ...snapshot.limits.map((detail, index) => ({subject: 'Limite ' + (index + 1), detail}))])];
}
export async function generateFollowupV108({outputDir = path.join(ROOT, 'docs'), check = false} = {}) {
  const snapshot = await collectFollowupV108(), workbook = await writeWorkbookV108(snapshot.baseline, buildSheetsV108(snapshot)), structural = await verifyWorkbookV108(workbook, snapshot.baseline);
  const qa = {schemaVersion: 1, release: 'V108', result: 'PASS_STRUCTURE', workbook: 'docs/YAUTJA_V108_SUIVI.xlsx', sha256: sha(workbook), bytes: workbook.length, inputFingerprintsVerified: snapshot.inputs.length, freezeEntriesVerified: snapshot.freezeEntriesVerified, facts: snapshot.facts, definitionFacts: snapshot.definitionFacts, production: snapshot.production, ...structural, nativeExcelApplicationVerified: false, nativeExcelCalculationEngineExecuted: false};
  const products = [Buffer.from(JSON.stringify(snapshot, null, 2) + '\n'), workbook, Buffer.from(JSON.stringify(qa, null, 2) + '\n')];
  if (!check) await fs.mkdir(outputDir, {recursive: true});
  for (const [index, name] of OUTPUTS.entries()) {const file = path.join(outputDir, name); if (check) assert.deepEqual(await fs.readFile(file), products[index], 'Stale V108 follow-up: ' + name); else await fs.writeFile(file, products[index]);}
  return {snapshot, qa, workbookSha256: sha(workbook), bytes: workbook.length};
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const args = process.argv.slice(2), at = args.indexOf('--output-dir');
  assert.ok(args.every((arg, index) => ['--check', '--output-dir'].includes(arg) || at >= 0 && index === at + 1) && (at < 0 || args[at + 1]));
  const result = await generateFollowupV108({check: args.includes('--check'), ...(at >= 0 ? {outputDir: path.resolve(args[at + 1])} : {})});
  console.log(JSON.stringify({result: 'PASS_STRUCTURE', sha256: result.workbookSha256, bytes: result.bytes, inputs: result.snapshot.inputs.length, facts: result.snapshot.facts, definitionFacts: result.snapshot.definitionFacts}));
}
