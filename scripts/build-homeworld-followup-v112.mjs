#!/usr/bin/env node
/** Current V112 follow-up; V111 runtime proofs remain historical and byte-exact. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {gunzipSync} from 'node:zlib';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {local, proofShape, evidencePath, normalizeServedBuilds, verifyCaptureCoverage} from './lib/excel-followup-evidence.mjs';
import {validateExecutedResultV112} from './publish-validation-v112.mjs';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const BASELINE_V112 = {path: 'docs/YAUTJA_V111_SUIVI.xlsx', sha256: 'fa5ebf78a08c36b4a567246dfae41de535a8e36c7294ba33190e3e1e2ec9ad05'};
export const REGISTRY_V112 = 'docs/v112-homeworld-source.json';
export const OUTPUTS_V112 = ['v112-homeworld-followup.json', 'YAUTJA_V112_SUIVI.xlsx', 'v112-homeworld-followup-qa.json'];
const WRITER = 'scripts/build-homeworld-followup-v112.py';
const SNAPSHOT = 'docs/v111-homeworld-followup.json';
const AUDIT = 'docs/v112-open-workstreams-audit.json';
const HISTORICAL_METADATA = [
  {path: SNAPSHOT, sha256: '2c71e1d09de23d3adeef64ef10cc2065bcc8d9733dbc26670c862e59c28a7a3f'},
  {path: 'docs/v111-homeworld-followup-qa.json', sha256: '67a7b1e47747ad0509d18dd85188c048ecb67ec949001bb65917cb1ba4ac711c'},
  {path: 'docs/v111-homeworld-source.json', sha256: 'f9520b0ab88b0e41fe2dfc5bdbbe5cc756b5b013bd2c25dd4d7adb5f6ed70043'},
];
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const read = file => fs.readFile(path.join(ROOT, file));
const json = async file => JSON.parse(await read(file));
const fingerprint = async files => Promise.all([...new Set(files)].sort().map(async file => {
  assert.ok(local(file)); const bytes = await read(file); return {path: file, sha256: sha(bytes), bytes: bytes.length};
}));
async function verifyProof(proof) {
  proofShape(proof); const file = evidencePath(proof), stat = await fs.lstat(path.join(ROOT, file));
  assert.ok(stat.isFile() && !stat.isSymbolicLink(), 'Proof must be a regular local file: ' + file);
  const bytes = await read(file); assert.equal(bytes.length, proof.bytes, 'Changed evidence size: ' + file);
  assert.equal(sha(bytes), proof.sha256, 'Changed evidence SHA256: ' + file); return bytes;
}

export function normalizeSourceIdentityV112(row) {
  proofShape(row);
  if (Object.hasOwn(row, 'path') && Object.hasOwn(row, 'file')) assert.equal(row.path, row.file, 'Conflicting source path/file aliases');
  return {path: evidencePath(row), bytes: row.bytes, sha256: row.sha256};
}

export function verifySourceFreezeCoverageV112(observed, freeze) {
  assert.ok(Array.isArray(observed) && observed.length);
  assert.ok(Array.isArray(freeze.entries) && freeze.entries.length);
  assert.equal(freeze.files, freeze.entries.length);
  const entries = freeze.entries.map(normalizeSourceIdentityV112), sources = observed.map(normalizeSourceIdentityV112);
  assert.equal(new Set(entries.map(row => row.path)).size, entries.length, 'Duplicate frozen source path');
  assert.equal(new Set(sources.map(row => row.path)).size, sources.length, 'Duplicate executed source path');
  assert.equal(freeze.bytes, entries.reduce((sum, row) => sum + row.bytes, 0));
  const frozen = new Map(entries.map(row => [row.path, row]));
  for (const row of sources) assert.deepEqual(row, frozen.get(row.path), 'Executed source absent or different from current freeze');
  assert.equal(sources.length, entries.length, 'Whole declared freeze must be captured before and after');
  return {sourcesVerified: sources.length, frozenSources: entries.length};
}

export function verifyRegistryV112(registry, inherited) {
  assert.equal(registry.schemaVersion, 1); assert.equal(registry.release, 'V112');
  assert.match(registry.asOf, /^\d{4}-\d{2}-\d{2}$/); assert.deepEqual(registry.baseline, BASELINE_V112);
  assert.equal(registry.baselineSheets, 113); assert.equal(registry.sourceCompletion, false);
  const sourceIds = new Set(inherited.sourceItems.map(row => row.id));
  assert.equal(sourceIds.size, 56);
  for (const key of ['closedSourceIds', 'sourceProgress', 'workstreams', 'remaining', 'validations', 'limits']) assert.ok(Array.isArray(registry[key]), key);
  assert.equal(new Set(registry.closedSourceIds).size, registry.closedSourceIds.length);
  assert.equal(new Set(registry.sourceProgress.map(row => row.id)).size, registry.sourceProgress.length);
  for (const row of registry.sourceProgress) {
    assert.ok(sourceIds.has(row.id), 'Unknown source requirement: ' + row.id);
    assert.ok(['LIVRE_PARTIEL', 'CLOTURE_CIBLE'].includes(row.status));
    assert.ok(row.progress && row.remaining && Array.isArray(row.proof) && row.proof.length);
    row.proof.forEach(proofShape);
    if (row.status === 'CLOTURE_CIBLE') {
      assert.ok(registry.closedSourceIds.includes(row.id));
      assert.ok(row.closure?.scope === 'FULL_SOURCE_REQUIREMENT' && row.closure.criteria?.length && row.closure.limit);
      assert.ok(row.production && row.proof.some(proof => evidencePath(proof) === evidencePath(row.production)), 'Source closure needs its own current production proof');
      proofShape(row.production);
    } else assert.ok(!registry.closedSourceIds.includes(row.id), 'Partial progress cannot close a source requirement');
  }
  for (const id of registry.closedSourceIds) assert.ok(sourceIds.has(id) && registry.sourceProgress.some(row => row.id === id && row.status === 'CLOTURE_CIBLE'), 'Unsupported source closure: ' + id);
  assert.ok(registry.workstreams.length && new Set(registry.workstreams.map(row => row.id)).size === registry.workstreams.length);
  for (const row of registry.workstreams) {
    assert.match(row.id, /^(HW|PIT|CW|PRESERVE)112-/);
    assert.ok(row.title && row.source && row.behavior && row.remaining);
    assert.ok(['EN_COURS', 'LIVRE_PARTIEL', 'VALIDE_CIBLE'].includes(row.status));
    assert.ok(Array.isArray(row.implementation) && row.implementation.every(file => local(file) && /^(app|scripts|docs|tests)\//.test(file)));
    assert.ok(Array.isArray(row.proof)); row.proof.forEach(proofShape);
    if (row.status !== 'EN_COURS') assert.ok(row.implementation.length && row.proof.length, 'Delivered work requires implementation and proof');
    if (row.production) {proofShape(row.production); assert.ok(registry.runtimeFreeze, 'Workstream production requires the current source freeze');}
    if (row.status === 'VALIDE_CIBLE') {
      const production = row.production ?? registry.production;
      assert.ok(production && row.proof.some(proof => evidencePath(proof) === evidencePath(production)), 'No current browser promotion without production proof');
    }
  }
  assert.ok(registry.remaining.length && new Set(registry.remaining.map(row => row.id)).size === registry.remaining.length);
  for (const row of registry.remaining) assert.ok(row.id && row.title && row.source && row.status === 'OUVERT' && row.detail);
  for (const row of registry.validations) {
    assert.ok(row.id && row.status && row.scope && row.command && row.limit && Array.isArray(row.evidence));
    row.evidence.forEach(proofShape); if (row.status.startsWith('PASS')) assert.ok(row.evidence.length);
  }
  assert.ok(registry.limits.length && registry.limits.every(value => typeof value === 'string' && value));
  if (registry.production) {proofShape(registry.production); assert.equal(evidencePath(registry.production), 'docs/v112-homeworld-validation.json'); assert.ok(registry.runtimeFreeze);}
  if (registry.runtimeFreeze) {proofShape(registry.runtimeFreeze); assert.equal(evidencePath(registry.runtimeFreeze), 'docs/v112-runtime-freeze.json');}
}

/** Require current, stable sources and inspected captures before browser promotion. */
export async function verifyProductionV112(proof, expectedFreeze = undefined) {
  const report = JSON.parse(await verifyProof(proof));
  assert.equal(report.release, 'V112'); assert.equal(report.status, 'PASS_CIBLE');
  assert.equal(report.production?.mode, 'compiled-app');
  assert.match(report.production.runtimeCommit, /^[a-f0-9]{40}$/); assert.ok(report.production.buildId);
  assert.equal(report.production.browserErrors, 0); assert.equal(report.production.checksFailed, 0);
  assert.ok(report.checks?.length && report.checks.every(row => row.status === 'PASS'));
  assert.equal(report.production.checksPassed, report.checks.length);
  normalizeServedBuilds(report.production.servedBuilds, report.production.buildId);
  for (const key of ['errors', 'consoleErrors', 'workerErrors', 'requestsFailed']) assert.deepEqual(report[key], [], 'Production errors must be explicitly empty: ' + key);
  assert.ok(report.sourceBefore?.length); assert.deepEqual(report.sourceBefore, report.sourceAfter, 'Production sources changed during execution');
  assert.equal(evidencePath(report.sourceFreeze), 'docs/v112-runtime-freeze.json');
  if (expectedFreeze) assert.deepEqual(report.sourceFreeze, expectedFreeze);
  const freeze = JSON.parse(await verifyProof(report.sourceFreeze));
  verifySourceFreezeCoverageV112(report.sourceAfter, freeze);
  for (const row of freeze.entries) await verifyProof(row);
  assert.ok(report.captures?.length && report.capturesOpened?.length === report.captures.length);
  const capturePaths = report.captures.map(evidencePath);
  assert.equal(new Set(capturePaths).size, capturePaths.length);
  assert.deepEqual([...report.capturesOpened].sort(), [...capturePaths].sort(), 'Every declared capture must be inspected');
  for (const row of report.captures) await verifyProof(row);
  assert.ok(report.invocation?.command?.includes('v112'), 'A current V112 command must be recorded');
  assert.ok(report.rawEvidence, 'Complete executed raw evidence is required');
  assert.ok(Number.isSafeInteger(report.rawEvidence.decodedBytes) && report.rawEvidence.decodedBytes > 0 && report.rawEvidence.decodedBytes <= 256 * 1024 * 1024);
  assert.match(report.rawEvidence.decodedSha256 ?? '', /^[a-f0-9]{64}$/);
  const rawBytes = gunzipSync(await verifyProof(report.rawEvidence), {maxOutputLength: report.rawEvidence.decodedBytes});
  assert.equal(rawBytes.length, report.rawEvidence.decodedBytes); assert.equal(sha(rawBytes), report.rawEvidence.decodedSha256);
  const raw = JSON.parse(rawBytes), actual = raw.production ?? raw;
  assert.equal(raw.status, 'PASS'); if (raw.release !== undefined) assert.equal(raw.release, 'V112');
  assert.equal(actual.mode, 'compiled-app'); assert.equal(actual.runtimeCommit, report.production.runtimeCommit); assert.equal(actual.buildId, report.production.buildId);
  assert.deepEqual(normalizeServedBuilds(actual.servedBuilds, report.production.buildId), normalizeServedBuilds(report.production.servedBuilds, report.production.buildId));
  assert.deepEqual(raw.sourceBefore, report.sourceBefore); assert.deepEqual(raw.sourceAfter, report.sourceAfter);
  assert.deepEqual(raw.checks, report.checks); assert.deepEqual(raw.invocation, report.invocation);
  for (const key of ['errors', 'consoleErrors', 'workerErrors', 'requestsFailed']) assert.deepEqual(raw[key], report[key], 'Raw production errors differ: ' + key);
  assert.deepEqual(raw.scope, report.scope, 'Executed fixtures and scope must remain declared');
  assert.ok(raw.scope && (typeof raw.scope === 'object' || typeof raw.scope === 'string'));
  assert.deepEqual(report.completedJourneys, raw.completedJourneys);
  validateExecutedResultV112(raw, {domain: report.domain, opened: raw.captures.map(row => row.file),
    runtimeCommit: report.production.runtimeCommit, buildId: report.production.buildId});
  verifyCaptureCoverage({opened: report.capturesOpened, portableFiles: [report.rawEvidence, ...report.captures], recordedCaptures: report.captures, rawCaptures: raw.captures});
  return {domain: report.domain, runtimeCommit: report.production.runtimeCommit, buildId: report.production.buildId, browserChecks: report.checks.length,
    inspectedCaptures: report.captures.length, freezeEntriesVerified: freeze.entries.length,
    inputs: [evidencePath(proof), evidencePath(report.sourceFreeze), evidencePath(report.rawEvidence), ...freeze.entries.map(evidencePath), ...capturePaths],
    inputFingerprints: [proof, report.sourceFreeze, report.rawEvidence, ...freeze.entries, ...report.captures].map(normalizeSourceIdentityV112)};
}

async function python(payload, mode = '') {
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'yautja-excel-v112-'));
  try {
    if (payload.workbook) {await fs.writeFile(path.join(temporary, 'verify.xlsx'), payload.workbook); payload = {...payload, workbook: undefined, workbookPath: path.join(temporary, 'verify.xlsx')};}
    const request = path.join(temporary, 'request.json'); await fs.writeFile(request, JSON.stringify(payload));
    return execFileSync('python3', [path.join(ROOT, WRITER), ...(mode ? [mode] : []), '--request', request], {timeout: 30000, maxBuffer: 64 * 1024 * 1024});
  } finally {await fs.rm(temporary, {recursive: true, force: true});}
}
export const writeWorkbookV112 = sheets => python({root: ROOT, baseline: BASELINE_V112, sheets});
export const verifyWorkbookV112 = async workbook => JSON.parse(await python({root: ROOT, baseline: BASELINE_V112, workbook}, '--verify'));

export async function collectFollowupV112(registry = undefined) {
  registry ??= await json(REGISTRY_V112);
  for (const row of HISTORICAL_METADATA) assert.equal(sha(await read(row.path)), row.sha256, 'Published V111 metadata changed: ' + row.path);
  const inherited = await json(SNAPSHOT), audit = await json(AUDIT);
  verifyRegistryV112(registry, inherited);
  assert.equal(sha(await read(BASELINE_V112.path)), BASELINE_V112.sha256);
  assert.equal(inherited.release, 'V111'); assert.equal(inherited.sourceItems.length, 56); assert.equal(inherited.artTargets.length, 354);
  assert.equal(audit.sourceSnapshot.path, SNAPSHOT); assert.equal(audit.sourceSnapshot.sha256, sha(await read(SNAPSHOT)));
  assert.equal(audit.sourceSnapshot.bytes, (await read(SNAPSHOT)).length);
  assert.deepEqual(audit.sourceItems.map(row => row.id), inherited.sourceItems.map(row => row.id));
  assert.deepEqual(audit.artTargets.map(row => row.id), inherited.artTargets.map(row => row.id));
  const guarded = [REGISTRY_V112, AUDIT, 'docs/v112-open-workstreams-audit.md', 'docs/excel-followup-homeworld-v112.md', 'scripts/audit-open-workstreams-v112.py',
    BASELINE_V112.path, ...HISTORICAL_METADATA.map(row => row.path), WRITER, 'scripts/build-homeworld-followup-v112.mjs',
    'scripts/lib/excel_followup_append.py', 'scripts/build-excel-followup-v100.py', 'scripts/lib/excel-followup-evidence.mjs',
    'scripts/publish-validation-v112.mjs', 'scripts/snapshot-runtime-v112.mjs',
    'tests/homeworld-excel-followup-v112.test.mjs', 'tests/homeworld-excel-history-v112.test.mjs',
    'tests/homeworld-ecotones-v90.test.mjs', 'scripts/historical-excel-context-homeworld-v112.mjs',
    'scripts/check-excel-history-homeworld-v112.mjs', 'scripts/build-excel-history-homeworld-v112.py',
    ...registry.workstreams.flatMap(row => row.implementation)];
  const before = await fingerprint(guarded);
  const proofs = [...(registry.runtimeFreeze ? [registry.runtimeFreeze] : []), ...(registry.production ? [registry.production] : []),
    ...registry.workstreams.flatMap(row => row.proof), ...registry.sourceProgress.flatMap(row => row.proof), ...registry.validations.flatMap(row => row.evidence)];
  for (const row of proofs) await verifyProof(row);
  const production = registry.production ? await verifyProductionV112(registry.production, registry.runtimeFreeze) : null;
  const productions = [];
  for (const row of registry.workstreams.filter(row => row.production)) {
    const verified = await verifyProductionV112(row.production, registry.runtimeFreeze);
    if (row.id.startsWith('HW112-')) assert.equal(verified.domain, 'Homeworld', 'Homeworld workstream requires Homeworld production evidence');
    if (row.id.startsWith('PIT112-')) assert.equal(verified.domain, 'Pit', 'Pit workstream requires Pit production evidence');
    productions.push({id: row.id, report: row.production, ...verified});
  }
  for (const row of registry.sourceProgress.filter(row => row.status === 'CLOTURE_CIBLE')) await verifyProductionV112(row.production);
  const progress = new Map(registry.sourceProgress.map(row => [row.id, row]));
  const sourceItems = inherited.sourceItems.map(row => ({...row,
    statusV112: registry.closedSourceIds.includes(row.id) ? 'CLOTURE_CIBLE' : 'OUVERT_SOURCE',
    progressV112: progress.get(row.id)?.progress ?? 'Exigence source héritée conservée ; aucune clôture déduite des avancées Homeworld.',
    remainingV112: progress.get(row.id)?.remaining ?? audit.sourceItems.find(value => value.id === row.id).latestRecordedRemaining,
    evidenceV112: progress.get(row.id)?.proof ?? []}));
  const artTargets = inherited.artTargets.map(row => ({...row, statusV112: 'NON_CLOTURE_ART',
    scopeV112: 'Cible et inventaire V111 historiques conservés. Le réemploi, le placement ou une correction gameplay ne valent pas admission de dessin ou animation native.'}));
  const inputs = await fingerprint([...guarded, ...proofs.map(evidencePath), ...(production?.inputs ?? []), ...productions.flatMap(row => row.inputs)]);
  const collected = new Map(inputs.map(row => [row.path, row]));
  for (const expected of [...proofs, ...(production?.inputFingerprints ?? []), ...productions.flatMap(row => row.inputFingerprints)].map(normalizeSourceIdentityV112))
    assert.deepEqual(collected.get(expected.path), expected, 'Verified evidence changed during collection: ' + expected.path);
  assert.deepEqual(await fingerprint(guarded), before, 'Sources changed during V112 follow-up collection');
  return {schemaVersion: 1, release: 'V112', asOf: registry.asOf, baseline: BASELINE_V112, historicalSheetCount: 113,
    method: 'Append-only extension of the exact certified V111 workbook. All 113 historical worksheets remain byte-identical. Source requirements, their included nine actions, Homeworld improvements and the 354 art targets remain distinct. No historical generator or native spreadsheet application runs against the current game.',
    facts: {inheritedSourceRequirements: sourceItems.length, sourceRequirementsOpen: sourceItems.filter(row => row.statusV112 === 'OUVERT_SOURCE').length,
      sourceActionsIncluded: sourceItems.filter(row => row.familyId === 'pit-actions').length,
      sourceActionsRemaining: sourceItems.filter(row => row.familyId === 'pit-actions' && row.statusV112 === 'OUVERT_SOURCE').length,
      newlyClosedSourceRequirements: registry.closedSourceIds.length, boundedWorkstreams: registry.workstreams.length,
      deferredWorkstreamsOpen: registry.remaining.length, artisticTargetsNotClosed: artTargets.length, sourceCompletion: false},
    workstreams: registry.workstreams, remaining: registry.remaining, priorities: audit.sourceItems,
    homeworldNeeds: audit.homeworldNeeds, sourceItems, artTargets, closedSourceIds: registry.closedSourceIds,
    runtimeFreeze: registry.runtimeFreeze ?? null, production: production ? {runtimeCommit: production.runtimeCommit, buildId: production.buildId,
      browserChecks: production.browserChecks, inspectedCaptures: production.inspectedCaptures, freezeEntriesVerified: production.freezeEntriesVerified} : null,
    productions: productions.map(row => ({id: row.id, domain: row.domain, report: row.report, runtimeCommit: row.runtimeCommit, buildId: row.buildId,
      browserChecks: row.browserChecks, inspectedCaptures: row.inspectedCaptures, freezeEntriesVerified: row.freezeEntriesVerified})),
    inputs, validations: registry.validations, limits: registry.limits};
}

const column = (key, label, width = 36) => ({key, label, width});
const printable = value => value == null ? '' : typeof value === 'object' && !('formula' in value && 'cached' in value) ? JSON.stringify(value) : value;
const sheet = (name, title, columns, rows) => ({name, title, subtitle: 'V112 · placements, accès, vides et ouverts source : preuves et limites distinctes', columns,
  rows: rows.map(row => Object.fromEntries(Object.entries(row).map(([key, value]) => [key, printable(value)])))});
export function buildSheetsV112(snapshot) {
  const metric = (label, value, scope, formula) => ({label, value: formula ? {formula, cached: value} : value, scope});
  const summary = [metric('Feuilles historiques préservées', 113, BASELINE_V112.path),
    metric('Exigences source ouvertes', snapshot.facts.sourceRequirementsOpen, 'Les neuf actions sont incluses dans ces lignes.', 'COUNTIF(\'ManquantsSourceV112\'!E5:E60,"OUVERT_SOURCE")'),
    metric('Nouvelles clôtures source', snapshot.facts.newlyClosedSourceRequirements, 'Seulement les exigences dotées de leurs propres preuves complètes.'),
    metric('Actions source incluses / restantes', `${snapshot.facts.sourceActionsIncluded} / ${snapshot.facts.sourceActionsRemaining}`, 'Sous-ensemble des exigences ; pas un total supplémentaire.'),
    metric('Cibles artistiques non clôturées', 354, 'Inventaire V111 historique, pas une déclaration d’absences.', 'COUNTIF(\'CatalogueArtV112\'!E5:E358,"NON_CLOTURE_ART")'),
    ...['EN_COURS', 'LIVRE_PARTIEL', 'VALIDE_CIBLE'].map(status => metric('Chantiers ' + status, snapshot.workstreams.filter(row => row.status === status).length,
      'Portée limitée aux cas et preuves déclarés.', `COUNTIF('ChantiersV112'!E5:E${snapshot.workstreams.length + 4},"${status}")`)),
    metric('Contrôles navigateur V112', snapshot.production?.browserChecks ?? 'A_VALIDER', 'Recette compilée courante, indépendante des preuves V111.'),
    metric('Captures V112 inspectées', snapshot.production?.inspectedCaptures ?? 'A_VALIDER', 'Toutes les captures publiées doivent être inspectées.'),
    metric('Excel natif exécuté', 'NON', 'ZIP/XML et caches de formules uniquement.')];
  return [sheet('SyntheseV112', 'YAUTJA · suivi V112', [column('label', 'Indicateur', 65), column('value', 'Valeur', 35), column('scope', 'Portée', 145)], summary),
    sheet('ChantiersV112', 'Avancées bornées et vérifiables', [column('id', 'ID', 50), column('title', 'Chantier', 80), column('source', 'Besoin exact', 145), column('behavior', 'Comportement V112', 145), column('status', 'État', 30), column('implementation', 'Fichiers', 145), column('proof', 'Preuves SHA', 145), column('remaining', 'Limites', 145)], snapshot.workstreams),
    sheet('PrioritesV112', 'Ouverts interdomaines et critères', [column('id', 'ID', 60), column('family', 'Famille', 65), column('priority', 'Priorité', 20), column('source', 'Cellules exactes', 100), column('originalNeed', 'Besoin initial', 145), column('latestRecordedRemaining', 'Reste historique', 145), column('acceptance', 'Critères de livraison', 145)], snapshot.priorities),
    sheet('HomeworldV112', 'Besoins Homeworld et périmètres différés', [column('id', 'ID', 55), column('title', 'Chantier', 85), column('source', 'Source exacte', 145), column('status', 'État', 28), column('detail', 'Besoin et limite', 145)], [...snapshot.homeworldNeeds.map(row => ({id: row.id, title: row.need, source: 'Brief V81 §§' + row.section, status: 'SUIVI_BORNE', detail: row.acceptance})), ...snapshot.remaining]),
    sheet('ManquantsSourceV112', 'Exigences source : progrès et clôtures justifiés', [column('id', 'ID', 60), column('familyId', 'Famille', 40), column('source', 'Cellule source', 120), column('statusV111', 'État V111', 30), column('statusV112', 'État source V112', 30), column('progressV112', 'Progrès V112', 145), column('remainingV112', 'Reste à livrer', 145), column('evidenceV112', 'Preuves V112', 145)], snapshot.sourceItems),
    sheet('CatalogueArtV112', '354 cibles artistiques historiques conservées', [column('id', 'ID', 42), column('family', 'Famille', 70), column('label', 'Cible exacte', 80), column('inventoryStatusV111', 'Présence historique V111', 45), column('statusV112', 'Clôture V112', 30), column('scopeV112', 'Limite', 145)], snapshot.artTargets),
    sheet('SourcesV112', 'Entrées exactes du suivi courant', [column('path', 'Chemin', 130), column('sha256', 'SHA256', 74), column('bytes', 'Octets', 24)], snapshot.inputs),
    sheet('ValidationsV112', 'Commandes exécutées et limites', [column('id', 'ID', 50), column('status', 'État', 32), column('scope', 'Portée', 145), column('command', 'Commande', 145), column('evidence', 'Preuves SHA', 145), column('limit', 'Limite', 145)], snapshot.validations),
    sheet('JournalV112', 'Méthode et limites', [column('subject', 'Sujet', 50), column('detail', 'Décision / limite', 145)], [{subject: 'Méthode', detail: snapshot.method}, {subject: 'Historique', detail: BASELINE_V112.path + ' · SHA256 ' + BASELINE_V112.sha256}, {subject: 'Reproduction', detail: 'node scripts/build-homeworld-followup-v112.mjs --check'}, ...snapshot.limits.map((detail, index) => ({subject: 'Limite ' + (index + 1), detail}))])];
}

export async function generateFollowupV112({outputDir = path.join(ROOT, 'docs'), check = false} = {}) {
  const snapshot = await collectFollowupV112(), workbook = await writeWorkbookV112(buildSheetsV112(snapshot)), structural = await verifyWorkbookV112(workbook);
  const qa = {schemaVersion: 1, release: 'V112', result: 'PASS_STRUCTURE', workbook: 'docs/YAUTJA_V112_SUIVI.xlsx', sha256: sha(workbook), bytes: workbook.length,
    inputFingerprintsVerified: snapshot.inputs.length, facts: snapshot.facts, production: snapshot.production, ...structural,
    nativeExcelApplicationVerified: false, nativeExcelCalculationEngineExecuted: false};
  const products = [Buffer.from(JSON.stringify(snapshot, null, 2) + '\n'), workbook, Buffer.from(JSON.stringify(qa, null, 2) + '\n')];
  if (!check) await fs.mkdir(outputDir, {recursive: true});
  for (const [index, name] of OUTPUTS_V112.entries()) {
    const file = path.join(outputDir, name);
    if (check) assert.deepEqual(await fs.readFile(file), products[index], 'Stale V112 follow-up: ' + name);
    else await fs.writeFile(file, products[index]);
  }
  return {snapshot, qa, workbookSha256: sha(workbook), bytes: workbook.length};
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const args = process.argv.slice(2), at = args.indexOf('--output-dir');
  assert.ok(args.every((arg, index) => ['--check', '--output-dir'].includes(arg) || at >= 0 && index === at + 1) && (at < 0 || args[at + 1]));
  const result = await generateFollowupV112({check: args.includes('--check'), ...(at >= 0 ? {outputDir: path.resolve(args[at + 1])} : {})});
  console.log(JSON.stringify({result: 'PASS_STRUCTURE', sha256: result.workbookSha256, bytes: result.bytes, inputs: result.snapshot.inputs.length, facts: result.snapshot.facts, production: result.snapshot.production}));
}
