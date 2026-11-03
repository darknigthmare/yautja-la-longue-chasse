#!/usr/bin/env node
/** Append Homeworld findings to the certified V109 workbook without rebuilding its history. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {gunzipSync} from 'node:zlib';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {local, proofShape, evidencePath, normalizeServedBuilds, verifyCaptureCoverage} from './lib/excel-followup-evidence.mjs';
import {validateExecutedResultV110} from './publish-validation-homeworld-v110.mjs';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const REGISTRY_V110 = 'docs/v110-homeworld-source.json';
export const BASELINE_V110 = {path: 'docs/YAUTJA_V109_SUIVI.xlsx', sha256: 'e80fcea5fdf768d5c9b6fd1874f89bc42badee24fbac9a3cf7cecb447c49ed3f'};
export const WORKSTREAM_IDS_V110 = ['HW110-RESIDENTS', 'HW110-ARRIVALS', 'HW110-OBJECTIVES', 'HW110-ARCHIVE-CLARITY'];
export const REMAINING_IDS_V110 = ['HW110-ROLE03-DEFERRED-CONTINUATION', 'HW110-ART-CATALOGUE'];
export const OUTPUTS_V110 = ['v110-workstreams.json', 'YAUTJA_V110_SUIVI.xlsx', 'v110-excel-followup-qa.json'];
const WRITER = 'scripts/build-excel-followup-v110.py';
const SOURCE_ITEMS = 'docs/v109-workstreams.json';
const HISTORICAL_METADATA = [
  {path: SOURCE_ITEMS, sha256: '0e834f7f8e04a1c2d52004749b750a005d4ab14858328b297a95586eb3a92f7b'},
  {path: 'docs/v109-excel-followup-qa.json', sha256: '1a1e81892ab89d3436a16a8bc707363fba2a9d4dc4cf82abd99788f58b38d298'},
];
const ART_TARGETS = 'app/game/data/homeworldAssetCatalogueTargetV81.json';
const DRIVER = 'scripts/qa-homeworld-coherence-v110.mjs';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const read = file => fs.readFile(path.join(ROOT, file));
const json = async file => JSON.parse(await read(file));
const fingerprint = async files => Promise.all([...new Set(files)].sort().map(async file => {assert.ok(local(file)); const bytes = await read(file); return {path: file, sha256: sha(bytes), bytes: bytes.length};}));
async function verifyProof(proof) {proofShape(proof); const bytes = await read(evidencePath(proof)); assert.equal(bytes.length, proof.bytes); assert.equal(sha(bytes), proof.sha256, 'Changed evidence: ' + evidencePath(proof)); return bytes;}

export function verifyRegistryV110(registry) {
  assert.equal(registry.schemaVersion, 1); assert.equal(registry.release, 'V110'); assert.match(registry.asOf, /^\d{4}-\d{2}-\d{2}$/);
  assert.deepEqual(registry.baseline, BASELINE_V110); assert.equal(registry.baselineSheets, 97);
  assert.equal(registry.runtimeFreeze?.path, 'docs/v110-runtime-freeze.json'); proofShape(registry.runtimeFreeze);
  assert.deepEqual(registry.closedSourceIds, [], 'Homeworld fixes cannot close unrelated source requirements');
  assert.equal(registry.newArtAssets, 0); assert.equal(registry.sourceCompletion, false);
  assert.deepEqual(registry.workstreams.map(row => row.id), WORKSTREAM_IDS_V110);
  for (const row of registry.workstreams) {
    assert.ok(row.title && row.source && row.behavior && row.remaining);
    assert.ok(['EN_COURS', 'LIVRE_PARTIEL', 'VALIDE_CIBLE'].includes(row.status));
    assert.ok(Array.isArray(row.implementation) && row.implementation.length && row.implementation.every(file => local(file) && file.startsWith('app/')));
    assert.ok(Array.isArray(row.proof)); row.proof.forEach(proofShape);
    if (row.status === 'VALIDE_CIBLE') {assert.ok(registry.production, 'No production promotion without an executed report'); assert.ok(row.proof.some(p => evidencePath(p) === registry.production.path));}
  }
  assert.deepEqual(registry.remaining.map(row => row.id), REMAINING_IDS_V110);
  for (const row of registry.remaining) {assert.equal(row.status, 'OUVERT'); assert.ok(row.title && row.source && row.detail);}
  assert.ok(Array.isArray(registry.validations) && Array.isArray(registry.limits) && registry.limits.length);
  for (const row of registry.validations) {
    assert.ok(row.id && row.status && row.scope && row.command && row.limit && Array.isArray(row.evidence)); row.evidence.forEach(proofShape);
    if (row.status.startsWith('PASS')) assert.ok(row.evidence.length);
  }
  if (registry.production) {assert.equal(registry.production.path, 'docs/v110-homeworld-validation.json'); proofShape(registry.production);}
}

/** The workbook only certifies portable, inspected captures from the actual V110 driver. */
export async function verifyProductionV110(proof) {
  const report = JSON.parse(await verifyProof(proof));
  assert.equal(report.release, 'V110'); assert.equal(report.status, 'PASS_CIBLE');
  const production = report.production;
  assert.ok(production && ['production', 'compiled-app'].includes(production.mode));
  assert.match(production.runtimeCommit, /^[a-f0-9]{40}$/); assert.ok(typeof production.buildId === 'string' && production.buildId);
  assert.equal(production.browserErrors, 0); assert.equal(production.checksFailed, 0);
  assert.ok(Array.isArray(report.checks) && report.checks.length && report.checks.every(row => row.status === 'PASS'));
  assert.equal(production.checksPassed, report.checks.length); normalizeServedBuilds(production.servedBuilds, production.buildId);
  assert.ok(report.invocation?.command?.includes('node ' + DRIVER), 'Explicit V110 Homeworld recipe required');
  assert.ok(Array.isArray(report.sourceBefore) && report.sourceBefore.length); assert.deepEqual(report.sourceBefore, report.sourceAfter);
  assert.ok(report.sourceAfter.some(row => evidencePath(row) === DRIVER));
  for (const row of report.sourceAfter) await verifyProof(row);
  assert.ok(report.rawEvidence); const rawBytes = gunzipSync(await verifyProof(report.rawEvidence));
  if (report.rawEvidence.decodedBytes !== undefined) assert.equal(rawBytes.length, report.rawEvidence.decodedBytes);
  if (report.rawEvidence.decodedSha256 !== undefined) assert.equal(sha(rawBytes), report.rawEvidence.decodedSha256);
  const raw = JSON.parse(rawBytes), actual = raw.production ?? raw;
  validateExecutedResultV110(raw, {driver: DRIVER, opened: raw.captures.map(row => row.file), runtimeCommit: production.runtimeCommit, buildId: production.buildId});
  assert.deepEqual(raw.workerErrors, []);
  assert.equal(raw.invocation.environment.YAUTJA_QA_JOURNEYS, 'K17,Residents,BlockedArrival,Doorway');
  assert.equal(raw.status, 'PASS'); assert.equal(actual.mode, 'compiled-app');
  assert.equal(actual.runtimeCommit, production.runtimeCommit); assert.equal(actual.buildId, production.buildId);
  for (const [field, expected] of [['checksPassed', report.checks.length], ['checksFailed', 0], ['browserErrors', 0]]) if (Object.hasOwn(actual, field)) assert.equal(actual[field], expected);
  if (raw.consoleErrors !== undefined) assert.deepEqual(raw.consoleErrors, []);
  assert.deepEqual(normalizeServedBuilds(actual.servedBuilds, production.buildId), normalizeServedBuilds(production.servedBuilds, production.buildId));
  assert.deepEqual(raw.checks, report.checks); assert.deepEqual(raw.errors ?? raw.browserErrors, []);
  assert.deepEqual(raw.sourceBefore, report.sourceBefore); assert.deepEqual(raw.sourceAfter, report.sourceAfter);
  assert.deepEqual(raw.invocation, report.invocation);
  const portable = [report.rawEvidence, ...report.captures];
  verifyCaptureCoverage({opened: report.capturesOpened, portableFiles: portable, recordedCaptures: report.captures, rawCaptures: raw.captures});
  for (const row of report.captures) await verifyProof(row);
  const sourceFreeze = report.sourceFreeze;
  assert.equal(sourceFreeze?.path, 'docs/v110-runtime-freeze.json', 'An exact V110 runtime freeze is required');
  const frozenInputs = [];
  let freezeEntriesVerified = 0;
  {
    const freeze = JSON.parse(await verifyProof(sourceFreeze));
    assert.ok(Array.isArray(freeze.entries) && freeze.entries.length); assert.equal(new Set(freeze.entries.map(evidencePath)).size, freeze.entries.length);
    assert.equal(freeze.files, freeze.entries.length); assert.equal(freeze.bytes, freeze.entries.reduce((sum, row) => sum + row.bytes, 0));
    freezeEntriesVerified = freeze.entries.length;
    for (const row of freeze.entries) {await verifyProof(row); frozenInputs.push(evidencePath(row));}
    const index = new Map(freeze.entries.map(row => [evidencePath(row), row]));
    for (const row of report.sourceAfter) {
      const expected = index.get(evidencePath(row)); assert.ok(expected, 'Executed source absent from freeze');
      assert.equal(expected.sha256, row.sha256, 'Executed source differs from freeze'); assert.equal(expected.bytes, row.bytes);
    }
    frozenInputs.push(evidencePath(sourceFreeze));
  }
  return {runtimeCommit: production.runtimeCommit, buildId: production.buildId, browserChecks: report.checks.length, inspectedCaptures: report.captures.length, freezeEntriesVerified,
    inputs: [proof.path, ...portable.map(evidencePath), ...report.sourceAfter.map(evidencePath), ...frozenInputs]};
}

async function python(payload, mode = '') {
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'yautja-excel-v110-'));
  try {
    if (payload.workbook) {await fs.writeFile(path.join(temporary, 'verify.xlsx'), payload.workbook); payload = {...payload, workbook: undefined, workbookPath: path.join(temporary, 'verify.xlsx')};}
    const request = path.join(temporary, 'request.json'); await fs.writeFile(request, JSON.stringify(payload));
    return execFileSync('python3', [path.join(ROOT, WRITER), ...(mode ? [mode] : []), '--request', request], {timeout: 30000, maxBuffer: 60 * 1024 * 1024});
  } finally {await fs.rm(temporary, {recursive: true, force: true});}
}
export const writeWorkbookV110 = (baseline, sheets) => python({root: ROOT, baseline, sheets});
export const verifyWorkbookV110 = async (workbook, baseline = BASELINE_V110) => JSON.parse(await python({root: ROOT, baseline, workbook}, '--verify'));

export async function collectFollowupV110(registry = undefined) {
  registry ??= await json(REGISTRY_V110); verifyRegistryV110(registry);
  assert.equal(sha(await read(BASELINE_V110.path)), BASELINE_V110.sha256);
  for (const previous of HISTORICAL_METADATA) assert.equal(sha(await read(previous.path)), previous.sha256, 'Certified V109 metadata changed: ' + previous.path);
  const previous = await json(SOURCE_ITEMS), previousQa = await json('docs/v109-excel-followup-qa.json');
  assert.equal(previous.release, 'V109'); assert.equal(previous.openItems.length, 56); assert.equal(previous.facts.sourceActionsRemaining, 9);
  assert.equal(previousQa.sha256, BASELINE_V110.sha256); assert.equal(previousQa.sheetNames.length, 97); assert.equal(previousQa.result, 'PASS_STRUCTURE');
  const targets = await json(ART_TARGETS); assert.equal(targets.entries.length, 354); assert.equal(new Set(targets.entries.map(row => row.id)).size, 354);
  const guarded = [REGISTRY_V110, 'docs/excel-followup-v110.md', 'tests/excel-followup-v110.test.mjs', BASELINE_V110.path, SOURCE_ITEMS, 'docs/v109-excel-followup-qa.json', ART_TARGETS, 'docs/homeworld-asset-gap-v81.md', 'docs/specifications/homeworld-v81/mission-homeworld-original.txt', 'app/game/data/bibleArchiveSceneV106.json', WRITER, 'scripts/build-excel-followup-v110.mjs', 'scripts/lib/excel_followup_append.py', 'scripts/build-excel-followup-v100.py', 'scripts/lib/excel-followup-evidence.mjs', 'scripts/publish-validation-homeworld-v110.mjs', 'scripts/snapshot-runtime-v110.mjs', ...registry.workstreams.flatMap(row => row.implementation)];
  const before = await fingerprint(guarded), proof = [registry.runtimeFreeze, ...registry.workstreams.flatMap(row => row.proof), ...registry.validations.flatMap(row => row.evidence)];
  for (const row of proof) await verifyProof(row);
  const production = registry.production ? await verifyProductionV110(registry.production) : null;
  const sourceItems = previous.openItems.map(row => ({...row, statusV110: 'OUVERT_SOURCE', progressV110: 'Exigence héritée V109 conservée ; ces correctifs Homeworld ne la clôturent pas.'}));
  const artTargets = targets.entries.map(row => ({...row, statusV110: 'OUVERT_ART', scopeV110: 'Cible du catalogue, non revue ni clôturée par les correctifs V110. Répartition V81 historique :313 variantes,40 manquants,1 animation ; aucune nouvelle admission.'}));
  const inputs = await fingerprint([...guarded, ...proof.map(evidencePath), ...(production?.inputs ?? [])]);
  assert.deepEqual(await fingerprint(guarded), before, 'Sources changed during V110 collection');
  return {schemaVersion: 1, release: 'V110', asOf: registry.asOf, baseline: BASELINE_V110, historicalSheetCount: 97, runtimeFreeze: registry.runtimeFreeze,
    method: 'Append-only extension of the exact certified V109 workbook. The 97 historical worksheets remain byte-identical. Homeworld defects, 56 inherited source requirements and 354 artistic targets remain separate. No historical generator, browser or native spreadsheet engine is run by this tool.',
    facts: {inheritedSourceRequirementsOpen: sourceItems.length, sourceActionsRemaining: 9, newlyClosedSourceRequirements: 0, homeworldBoundedWorkstreams: registry.workstreams.length, homeworldDeferredWorkstreamsOpen: registry.remaining.length, artisticTargetsNotClosed: artTargets.length, newArtAssets: 0, sourceCompletion: false},
    workstreams: registry.workstreams, remaining: registry.remaining, sourceItems, artTargets, closedSourceIds: [], inputs,
    production: production ? {runtimeCommit: production.runtimeCommit, buildId: production.buildId, browserChecks: production.browserChecks, inspectedCaptures: production.inspectedCaptures, freezeEntriesVerified: production.freezeEntriesVerified} : null,
    validations: registry.validations, limits: registry.limits};
}

const column = (key, label, width = 36) => ({key, label, width});
const printable = value => value == null ? '' : typeof value === 'object' && !('formula' in value && 'cached' in value) ? JSON.stringify(value) : value;
const sheet = (name, title, columns, rows) => ({name, title, subtitle: 'V110 · Homeworld : actions physiques, cohérence et limites suivies', columns, rows: rows.map(row => Object.fromEntries(Object.entries(row).map(([key, value]) => [key, printable(value)])))});
export function buildSheetsV110(snapshot) {
  const metric = (label, value, scope, formula) => ({label, value: formula ? {formula, cached: value} : value, scope});
  const statuses = ['EN_COURS', 'LIVRE_PARTIEL', 'VALIDE_CIBLE'];
  const summary = [metric('Feuilles historiques préservées', 97, BASELINE_V110.path), metric('Exigences source héritées encore ouvertes', 56, 'Toutes les exigences V109 restent individuellement visibles.', 'COUNTIF(\'ManquantsSourceV110\'!E5:E60,"OUVERT_SOURCE")'), metric('Nouvelles clôtures source', 0, 'Les correctifs Homeworld ne clôturent pas les kits, campagnes ou autres exigences héritées.'), metric('Actions source héritées restantes', 9, 'Mesure héritée V109, aucune action source clôturée par ces correctifs.'), metric('Cibles artistiques non clôturées', 354, 'Catalogue complet distinct ; ce nombre ne signifie pas354 nouveaux assets manquants.', 'COUNTIF(\'CatalogueArtV110\'!F5:F358,"OUVERT_ART")'), metric('Nouveaux assets artistiques V110', 0, 'Aucun PNG, BODY, variante ou animation nouvellement admis.'), ...statuses.map(status => metric('Correctifs ' + status, snapshot.workstreams.filter(row => row.status === status).length, 'Portée bornée de chaque correctif.', `COUNTIF('ChantiersV110'!E5:E8,"${status}")`)), metric('Chantiers différés ouverts', 2, 'Continuation B→A et production artistique restent ouvertes.'), metric('Contrôles navigateur V110', snapshot.production?.browserChecks ?? 'A_VALIDER', 'Uniquement une recette réellement exécutée du build V110 ; aucun résultat V109 additionné.'), metric('Captures V110 inspectées', snapshot.production?.inspectedCaptures ?? 'A_VALIDER', 'Inventaire de captures portables correspondant au résultat brut exécuté.'), metric('Excel natif exécuté', 'NON', 'Contrôles ZIP/XML et caches de formules uniquement.')];
  const streams = [column('id', 'ID', 46), column('title', 'Correctif', 80), column('source', 'Source et reproduction', 145), column('behavior', 'Comportement V110', 145), column('status', 'État', 28), column('implementation', 'Fichiers du jeu', 145), column('proof', 'Preuves SHA', 145), column('remaining', 'Limites', 145)];
  return [sheet('SyntheseV110', 'YAUTJA · suivi Homeworld V110', [column('label', 'Indicateur', 65), column('value', 'Valeur', 35), column('scope', 'Portée', 145)], summary),
    sheet('ChantiersV110', 'Quatre correctifs situés et vérifiables', streams, snapshot.workstreams),
    sheet('HomeworldV110', 'Chantiers différés restant ouverts', [column('id', 'ID', 55), column('title', 'Chantier', 85), column('source', 'Source exacte', 145), column('status', 'État', 28), column('detail', 'Besoin et limite', 145)], snapshot.remaining),
    sheet('ManquantsSourceV110', 'Les56 exigences source héritées restent ouvertes', [column('id', 'ID', 60), column('familyId', 'Famille', 40), column('source', 'Cellule source', 145), column('sourceStatusV108', 'État historique', 30), column('statusV110', 'État source V110', 30), column('remaining', 'Besoin original', 145), column('progressV110', 'Portée V110', 145)], snapshot.sourceItems),
    sheet('CatalogueArtV110', '354 cibles artistiques, sans nouvelle admission', [column('id', 'ID', 40), column('section', 'Section du brief', 20), column('family', 'Famille', 65), column('label', 'Cible exacte', 85), column('lore', 'Portée lore', 40), column('statusV110', 'État V110', 28), column('scopeV110', 'Limite de suivi', 145)], snapshot.artTargets),
    sheet('SourcesV110', 'Entrées exactes du suivi courant', [column('path', 'Chemin', 130), column('sha256', 'SHA256', 74), column('bytes', 'Octets', 24)], snapshot.inputs),
    sheet('ValidationsV110', 'Preuves exécutées et limites', [column('id', 'ID', 48), column('status', 'État', 32), column('scope', 'Portée', 145), column('command', 'Commande', 145), column('evidence', 'Preuves SHA', 145), column('limit', 'Limite', 145)], snapshot.validations),
    sheet('JournalV110', 'Méthode et limites du suivi Homeworld', [column('subject', 'Sujet', 50), column('detail', 'Décision / limite', 145)], [{subject: 'Méthode', detail: snapshot.method}, {subject: 'Historique', detail: BASELINE_V110.path + ' · SHA256 ' + BASELINE_V110.sha256}, {subject: 'Reproduction', detail: 'node scripts/build-excel-followup-v110.mjs --check'}, ...snapshot.limits.map((detail, index) => ({subject: 'Limite ' + (index + 1), detail}))])];
}

export async function generateFollowupV110({outputDir = path.join(ROOT, 'docs'), check = false} = {}) {
  const snapshot = await collectFollowupV110(), workbook = await writeWorkbookV110(BASELINE_V110, buildSheetsV110(snapshot)), structural = await verifyWorkbookV110(workbook);
  const qa = {schemaVersion: 1, release: 'V110', result: 'PASS_STRUCTURE', workbook: 'docs/YAUTJA_V110_SUIVI.xlsx', sha256: sha(workbook), bytes: workbook.length, inputFingerprintsVerified: snapshot.inputs.length, facts: snapshot.facts, production: snapshot.production, ...structural, nativeExcelApplicationVerified: false, nativeExcelCalculationEngineExecuted: false};
  const products = [Buffer.from(JSON.stringify(snapshot, null, 2) + '\n'), workbook, Buffer.from(JSON.stringify(qa, null, 2) + '\n')];
  if (!check) await fs.mkdir(outputDir, {recursive: true});
  for (const [index, name] of OUTPUTS_V110.entries()) {const file = path.join(outputDir, name); if (check) assert.deepEqual(await fs.readFile(file), products[index], 'Stale V110 follow-up: ' + name); else await fs.writeFile(file, products[index]);}
  return {snapshot, qa, workbookSha256: sha(workbook), bytes: workbook.length};
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const args = process.argv.slice(2), at = args.indexOf('--output-dir');
  assert.ok(args.every((arg, index) => ['--check', '--output-dir'].includes(arg) || at >= 0 && index === at + 1) && (at < 0 || args[at + 1]));
  const result = await generateFollowupV110({check: args.includes('--check'), ...(at >= 0 ? {outputDir: path.resolve(args[at + 1])} : {})});
  console.log(JSON.stringify({result: 'PASS_STRUCTURE', sha256: result.workbookSha256, bytes: result.bytes, inputs: result.snapshot.inputs.length, facts: result.snapshot.facts, production: result.snapshot.production}));
}
