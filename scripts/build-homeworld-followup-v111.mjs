#!/usr/bin/env node
/** Append Homeworld findings to the certified V110 workbook without rebuilding its history. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {gunzipSync} from 'node:zlib';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {local, proofShape, evidencePath, normalizeServedBuilds, verifyCaptureCoverage} from './lib/excel-followup-evidence.mjs';
import {validateExecutedResultV111} from './publish-validation-homeworld-v111.mjs';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const REGISTRY_V111 = 'docs/v111-homeworld-source.json';
export const BASELINE_V111 = {path: 'docs/YAUTJA_V110_SUIVI.xlsx', sha256: '0b7d7890c8d235a9cda0f6d61c62001efe150f2c4022924c20d88196afcdbd7c'};
export const WORKSTREAM_IDS_V111 = ['HW111-ARCHIVE-CONTINUATION', 'HW111-ARRIVAL-RECOVERY', 'HW111-OBJECTIVE-CONTINUITY', 'HW111-ART-INVENTORY'];
export const REMAINING_IDS_V111 = ['HW111-ART-PRODUCTION', 'HW111-OTHER-HOMEWORLD-SCOPES'];
export const OUTPUTS_V111 = ['v111-homeworld-followup.json', 'YAUTJA_V111_SUIVI.xlsx', 'v111-homeworld-followup-qa.json'];
const WRITER = 'scripts/build-homeworld-followup-v111.py';
const SOURCE_ITEMS = 'docs/v110-workstreams.json';
const HISTORICAL_METADATA = [
  {path: SOURCE_ITEMS, sha256: 'c7a58c4146a68db85d26e8b4b592bb853ad11f1ffc2e71e61b5fae2380bf2339'},
  {path: 'docs/v110-excel-followup-qa.json', sha256: '3e15edfb7b5ffd38ba8dacda2d43993e3e8018e7a425aa8f594082cb4a9fb9c1'},
];
const ART_TARGETS = 'app/game/data/homeworldAssetCatalogueTargetV81.json';
const DRIVER = 'scripts/qa-homeworld-continuation-v111.mjs';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const read = file => fs.readFile(path.join(ROOT, file));
const json = async file => JSON.parse(await read(file));
const fingerprint = async files => Promise.all([...new Set(files)].sort().map(async file => {assert.ok(local(file)); const bytes = await read(file); return {path: file, sha256: sha(bytes), bytes: bytes.length};}));
async function verifyProof(proof) {proofShape(proof); const bytes = await read(evidencePath(proof)); assert.equal(bytes.length, proof.bytes); assert.equal(sha(bytes), proof.sha256, 'Changed evidence: ' + evidencePath(proof)); return bytes;}


/** A recorded Git object identity is only a bounded substitute for absent
 * historical image bytes. Present bytes still have to match both hashes.
 * This never admits a new asset, proves rendering or closes an art target. */
export function verifyArtBlobIdentityV111(row, treeRecord, bytes = undefined) {
  proofShape(row); assert.ok(row.path.startsWith('public/'));
  assert.match(row.gitBlobOid ?? '', /^[a-f0-9]{40}$/);
  assert.ok(treeRecord && treeRecord.type === 'blob' && ['100644', '100755'].includes(treeRecord.mode), 'Historical art path is absent or not a regular Git blob');
  assert.equal(treeRecord.oid, row.gitBlobOid, 'Historical art Git identity changed: ' + row.path);
  if (bytes !== undefined) {
    assert.equal(bytes.length, row.bytes, 'Historical art byte size changed: ' + row.path);
    assert.equal(sha(bytes), row.sha256, 'Historical art SHA256 changed: ' + row.path);
    const oid = createHash('sha1').update(Buffer.from('blob ' + bytes.length + '\0')).update(bytes).digest('hex');
    assert.equal(oid, row.gitBlobOid, 'Audited bytes do not belong to their recorded Git blob');
  }
  return bytes === undefined ? 'GIT_TREE_IDENTITY' : 'BYTES_AND_GIT_TREE_IDENTITY';
}
function currentGitTree() {
  const raw = execFileSync('git', ['ls-tree', '-r', '-z', 'HEAD'], {cwd: ROOT, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024});
  return new Map(raw.split('\0').filter(Boolean).map(line => {const at = line.indexOf('\t'), [mode, type, oid] = line.slice(0, at).split(' '); return [line.slice(at + 1), {mode, type, oid}];}));
}

export function verifyRegistryV111(registry) {
  assert.equal(registry.schemaVersion, 1); assert.equal(registry.release, 'V111'); assert.match(registry.asOf, /^\d{4}-\d{2}-\d{2}$/);
  assert.deepEqual(registry.baseline, BASELINE_V111); assert.equal(registry.baselineSheets, 105);
  if (registry.runtimeFreeze) {assert.equal(registry.runtimeFreeze.path, 'docs/v111-runtime-freeze.json'); proofShape(registry.runtimeFreeze);}
  assert.deepEqual(registry.closedSourceIds, [], 'Homeworld fixes cannot close unrelated source requirements');
  assert.ok(Array.isArray(registry.nativeAssets)); assert.equal(registry.newArtAssets, registry.nativeAssets.length); assert.equal(registry.sourceCompletion, false);
  assert.equal(new Set(registry.nativeAssets.map(row => row.id)).size, registry.nativeAssets.length);
  assert.equal(new Set(registry.nativeAssets.map(row => row.png?.path)).size, registry.nativeAssets.length, 'Distinct admitted PNG paths required');
  assert.equal(new Set(registry.nativeAssets.map(row => row.png?.sha256)).size, registry.nativeAssets.length, 'A copied PNG cannot be counted as a new native drawing');
  for (const row of registry.nativeAssets) {assert.ok(row.id && row.status === 'ADMITTED'); for (const kind of ['png', 'receipt', 'runtime']) proofShape(row[kind]); assert.ok(row.png.path.startsWith('public/') && row.png.path.endsWith('.png'));}
  if (registry.artInventory) proofShape(registry.artInventory);
  assert.deepEqual(registry.workstreams.map(row => row.id), WORKSTREAM_IDS_V111);
  for (const row of registry.workstreams) {
    assert.ok(row.title && row.source && row.behavior && row.remaining);
    assert.ok(['EN_COURS', 'LIVRE_PARTIEL', 'VALIDE_CIBLE'].includes(row.status));
    assert.ok(Array.isArray(row.implementation) && row.implementation.length && row.implementation.every(file => local(file) && /^(app|scripts|docs)\//.test(file)));
    assert.ok(Array.isArray(row.proof)); row.proof.forEach(proofShape);
    if (row.status === 'VALIDE_CIBLE') {assert.ok(registry.production, 'No production promotion without an executed report'); assert.ok(row.proof.some(p => evidencePath(p) === registry.production.path));}
  }
  assert.deepEqual(registry.remaining.map(row => row.id), REMAINING_IDS_V111);
  for (const row of registry.remaining) {assert.equal(row.status, 'OUVERT'); assert.ok(row.title && row.source && row.detail);}
  assert.ok(Array.isArray(registry.validations) && Array.isArray(registry.limits) && registry.limits.length);
  for (const row of registry.validations) {
    assert.ok(row.id && row.status && row.scope && row.command && row.limit && Array.isArray(row.evidence)); row.evidence.forEach(proofShape);
    if (row.status.startsWith('PASS')) assert.ok(row.evidence.length);
  }
  if (registry.production) {assert.equal(registry.production.path, 'docs/v111-homeworld-validation.json'); proofShape(registry.production); assert.ok(registry.runtimeFreeze, 'Production requires the current runtime freeze');}
}

/** The workbook only certifies portable, inspected captures from the actual V111 driver. */
export async function verifyProductionV111(proof) {
  const report = JSON.parse(await verifyProof(proof));
  assert.equal(report.release, 'V111'); assert.equal(report.status, 'PASS_CIBLE');
  const production = report.production;
  assert.ok(production && ['production', 'compiled-app'].includes(production.mode));
  assert.match(production.runtimeCommit, /^[a-f0-9]{40}$/); assert.ok(typeof production.buildId === 'string' && production.buildId);
  assert.equal(production.browserErrors, 0); assert.equal(production.checksFailed, 0);
  assert.ok(Array.isArray(report.checks) && report.checks.length && report.checks.every(row => row.status === 'PASS'));
  assert.equal(production.checksPassed, report.checks.length); normalizeServedBuilds(production.servedBuilds, production.buildId);
  assert.ok(report.invocation?.command?.includes('node ' + DRIVER), 'Explicit V111 Homeworld recipe required');
  assert.ok(Array.isArray(report.sourceBefore) && report.sourceBefore.length); assert.deepEqual(report.sourceBefore, report.sourceAfter);
  assert.ok(report.sourceAfter.some(row => evidencePath(row) === DRIVER));
  for (const row of report.sourceAfter) await verifyProof(row);
  assert.ok(report.rawEvidence); const rawBytes = gunzipSync(await verifyProof(report.rawEvidence));
  if (report.rawEvidence.decodedBytes !== undefined) assert.equal(rawBytes.length, report.rawEvidence.decodedBytes);
  if (report.rawEvidence.decodedSha256 !== undefined) assert.equal(sha(rawBytes), report.rawEvidence.decodedSha256);
  const raw = JSON.parse(rawBytes), actual = raw.production ?? raw;
  validateExecutedResultV111(raw, {driver: DRIVER, opened: raw.captures.map(row => row.file), runtimeCommit: production.runtimeCommit, buildId: production.buildId});
  assert.deepEqual(raw.workerErrors, []);
  assert.equal(raw.invocation.environment.YAUTJA_QA_JOURNEYS, 'Continuation,Recovery,MobileGuide,LegacyA');
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
  assert.equal(sourceFreeze?.path, 'docs/v111-runtime-freeze.json', 'An exact V111 runtime freeze is required');
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
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'yautja-excel-v111-'));
  try {
    if (payload.workbook) {await fs.writeFile(path.join(temporary, 'verify.xlsx'), payload.workbook); payload = {...payload, workbook: undefined, workbookPath: path.join(temporary, 'verify.xlsx')};}
    const request = path.join(temporary, 'request.json'); await fs.writeFile(request, JSON.stringify(payload));
    return execFileSync('python3', [path.join(ROOT, WRITER), ...(mode ? [mode] : []), '--request', request], {timeout: 30000, maxBuffer: 60 * 1024 * 1024});
  } finally {await fs.rm(temporary, {recursive: true, force: true});}
}
export const writeWorkbookV111 = (baseline, sheets) => python({root: ROOT, baseline, sheets});
export const verifyWorkbookV111 = async (workbook, baseline = BASELINE_V111) => JSON.parse(await python({root: ROOT, baseline, workbook}, '--verify'));

export async function collectFollowupV111(registry = undefined) {
  registry ??= await json(REGISTRY_V111); verifyRegistryV111(registry);
  assert.equal(sha(await read(BASELINE_V111.path)), BASELINE_V111.sha256);
  for (const previous of HISTORICAL_METADATA) assert.equal(sha(await read(previous.path)), previous.sha256, 'Certified V110 metadata changed: ' + previous.path);
  const previous = await json(SOURCE_ITEMS), previousQa = await json('docs/v110-excel-followup-qa.json');
  assert.equal(previous.release, 'V110'); assert.equal(previous.sourceItems.length, 56); assert.equal(previous.facts.sourceActionsRemaining, 9);
  assert.equal(previousQa.sha256, BASELINE_V111.sha256); assert.equal(previousQa.sheetNames.length, 105); assert.equal(previousQa.result, 'PASS_STRUCTURE');
  const targets = await json(ART_TARGETS); assert.equal(targets.entries.length, 354); assert.equal(new Set(targets.entries.map(row => row.id)).size, 354);
  const guarded = [REGISTRY_V111, 'docs/excel-followup-homeworld-v111.md', 'tests/homeworld-excel-followup-v111.test.mjs', BASELINE_V111.path, SOURCE_ITEMS, 'docs/v110-excel-followup-qa.json', ART_TARGETS, 'docs/homeworld-asset-gap-v81.md', 'docs/specifications/homeworld-v81/mission-homeworld-original.txt', 'app/game/data/bibleArchiveSceneV106.json', WRITER, 'scripts/build-homeworld-followup-v111.mjs', 'scripts/lib/excel_followup_append.py', 'scripts/build-excel-followup-v100.py', 'scripts/lib/excel-followup-evidence.mjs', 'scripts/publish-validation-homeworld-v111.mjs', 'scripts/snapshot-runtime-v111.mjs', ...registry.workstreams.flatMap(row => row.implementation)];
  const before = await fingerprint(guarded), proof = [...(registry.runtimeFreeze ? [registry.runtimeFreeze] : []), ...(registry.artInventory ? [registry.artInventory] : []), ...registry.nativeAssets.flatMap(row => [row.png, row.receipt, row.runtime]), ...registry.workstreams.flatMap(row => row.proof), ...registry.validations.flatMap(row => row.evidence)];
  for (const row of proof) await verifyProof(row);
  const production = registry.production ? await verifyProductionV111(registry.production) : null;
  if (registry.production) assert.deepEqual(JSON.parse(await verifyProof(registry.production)).sourceFreeze, registry.runtimeFreeze);
  const inventoryInputs = [], artTreeInputs = [];
  let inventory = null;
  if (registry.artInventory) {
    inventory = JSON.parse(await verifyProof(registry.artInventory));
    assert.equal(inventory.release, 'V111'); assert.ok(Array.isArray(inventory.entries));
    assert.deepEqual(inventory.entries.map(row => row.id).sort(), targets.entries.map(row => row.id).sort(), 'Art census must retain the exact 354 target IDs');
    assert.deepEqual(inventory.sourceClosures, [], 'A census cannot close source requirements');
    assert.ok(inventory.sourceInputs?.length && inventory.installedFiles?.length, 'An art census needs source and installed evidence');
    const tree = currentGitTree(), installed = new Map();
    for (const row of inventory.installedFiles) {
      assert.ok(!installed.has(row.path), 'Duplicate installed art path');
      let bytes; try {bytes = await read(row.path);} catch (error) {if (error.code !== 'ENOENT') throw error;}
      verifyArtBlobIdentityV111(row, tree.get(row.path), bytes); installed.set(row.path, row);
      // Canonical output uses the same bounded identity profile on full and
      // sparse checkouts; opportunistic extra byte checks do not change XLSX.
      artTreeInputs.push({path: row.path, sha256: row.sha256, bytes: row.bytes, gitBlobOid: row.gitBlobOid, verification: 'GIT_TREE_IDENTITY'});
    }
    const unique = new Map();
    for (const row of inventory.sourceInputs) {
      proofShape(row); await verifyProof(row); unique.set(evidencePath(row), row); inventoryInputs.push(evidencePath(row));
    }
    for (const row of inventory.entries.flatMap(row => row.candidateEvidence ?? [])) {
      proofShape(row); const file = evidencePath(row), original = installed.get(file), existing = unique.get(file);
      if (original) {
        assert.equal(original.sha256, row.sha256); assert.equal(original.bytes, row.bytes); assert.equal(original.gitBlobOid, row.gitBlobOid);
      } else if (existing) {assert.equal(existing.sha256, row.sha256, 'Conflicting census evidence'); assert.equal(existing.bytes, row.bytes);}
      else {await verifyProof(row); unique.set(file, row); inventoryInputs.push(file);}
    }
    assert.ok(Array.isArray(inventory.nativeDrawingAssets));
    assert.equal(inventory.nativeDrawingAssets.length, registry.nativeAssets.length, 'The census and admitted native asset count differ');
    const declaredNative = new Map(registry.nativeAssets.map(row => [row.png.path, row]));
    for (const row of inventory.nativeDrawingAssets) {
      assert.ok(row.actual && !row.actual.gitBlobOid && row.actual.path === 'public' + row.source, 'New native drawings require their own exact bytes');
      await verifyProof(row.actual); inventoryInputs.push(row.actual.path);
      const admitted = declaredNative.get(row.actual.path); assert.ok(admitted && admitted.id === row.id);
      assert.equal(admitted.png.sha256, row.actual.sha256); assert.equal(admitted.png.bytes, row.actual.bytes);
    }
    assert.ok(inventory.entries.every(row => typeof row.status === 'string' && row.status.length));
  }
  const sourceItems = previous.sourceItems.map(row => ({...row, statusV111: 'OUVERT_SOURCE', progressV111: 'Exigence héritée V110 conservée ; les avancées Homeworld ne clôturent pas cette exigence.'}));
  const census = new Map((inventory?.entries ?? []).map(row => [row.id, row]));
  const artTargets = targets.entries.map(row => ({...row, statusV111: 'NON_CLOTURE_ART', inventoryStatusV111: census.get(row.id)?.status ?? 'NON_REVU_V111', inventoryEvidenceV111: census.has(row.id) ? {report: registry.artInventory.path, targetId: row.id, candidateCount: census.get(row.id).candidateEvidence?.length ?? 0} : null, scopeV111: 'Cible du catalogue conservée. Un inventaire de présence et des candidats ne constituent pas une admission artistique ni une certification visuelle.'}));
  for (const asset of registry.nativeAssets) {
    const bytes = await verifyProof(asset.png);
    assert.ok(bytes.length >= 33 && bytes.subarray(0, 8).toString('hex') === '89504e470d0a1a0a', 'Native asset must be original PNG bytes');
    assert.ok(bytes.readUInt32BE(16) > 0 && bytes.readUInt32BE(20) > 0);
    const runtime = await verifyProof(asset.runtime);
    assert.ok(runtime.toString('utf8').includes('/' + asset.png.path.slice('public/'.length)), 'Native drawing is absent from its declared runtime definition');
  }
  const inputs = await fingerprint([...guarded, ...proof.map(evidencePath), ...inventoryInputs, ...(production?.inputs ?? [])]);
  assert.deepEqual(await fingerprint(guarded), before, 'Sources changed during V111 collection');
  return {schemaVersion: 1, release: 'V111', asOf: registry.asOf, baseline: BASELINE_V111, historicalSheetCount: 105, runtimeFreeze: registry.runtimeFreeze,
    method: 'Append-only extension of the exact certified V110 workbook. All 105 historical worksheets remain byte-identical. Bounded Homeworld continuations, 56 inherited requirements and the 354 artistic targets are separate. A presence census does not declare all targets missing or delivered. No historical generator, browser or native spreadsheet application is run by this tool.',
    facts: {inheritedSourceRequirementsOpen: sourceItems.length, sourceActionsRemaining: 9, newlyClosedSourceRequirements: 0, homeworldBoundedWorkstreams: registry.workstreams.length, homeworldDeferredWorkstreamsOpen: registry.remaining.length, artisticTargetsNotClosed: artTargets.length, artisticTargetsInventoried: census.size, newArtAssets: registry.nativeAssets.length, sourceCompletion: false},
    workstreams: registry.workstreams, remaining: registry.remaining, sourceItems, artTargets, nativeAssets: registry.nativeAssets, closedSourceIds: [], inputs,
    artInventoryVerification: {scope: 'Historical images in the presence census only; the four new native conversation drawings have separate admission evidence.', method: 'GIT_TREE_IDENTITY_FOR_HISTORICAL_IMAGES', images: artTreeInputs, presentBytesAlsoChecked: true, sourceInputsAlwaysByteChecked: true, newNativeAssetsAlwaysByteChecked: true, renderingOrQualityCertified: false},
    production: production ? {runtimeCommit: production.runtimeCommit, buildId: production.buildId, browserChecks: production.browserChecks, inspectedCaptures: production.inspectedCaptures, freezeEntriesVerified: production.freezeEntriesVerified} : null,
    validations: registry.validations, limits: registry.limits};
}

const column = (key, label, width = 36) => ({key, label, width});
const printable = value => value == null ? '' : typeof value === 'object' && !('formula' in value && 'cached' in value) ? JSON.stringify(value) : value;
const sheet = (name, title, columns, rows) => ({name, title, subtitle: 'V111 · Homeworld : actions physiques, cohérence et limites suivies', columns, rows: rows.map(row => Object.fromEntries(Object.entries(row).map(([key, value]) => [key, printable(value)])))});
export function buildSheetsV111(snapshot) {
  const metric = (label, value, scope, formula) => ({label, value: formula ? {formula, cached: value} : value, scope});
  const statuses = ['EN_COURS', 'LIVRE_PARTIEL', 'VALIDE_CIBLE'];
  const summary = [metric('Feuilles historiques préservées', 105, BASELINE_V111.path), metric('Exigences source héritées encore ouvertes', 56, 'Les exigences V110 restent individuellement visibles.', 'COUNTIF(\'ManquantsSourceV111\'!E5:E60,"OUVERT_SOURCE")'), metric('Nouvelles clôtures source', 0, 'Une continuation Homeworld ne clôture pas les autres kits, campagnes ou exigences.'), metric('Actions source héritées restantes', 9, 'Mesure V110 conservée.'), metric('Cibles artistiques non clôturées', 354, 'Catalogue distinct, sans assimilation à 354 éléments manquants.', 'COUNTIF(\'CatalogueArtV111\'!F5:F358,"NON_CLOTURE_ART")'), metric('Cibles inventoriées V111', snapshot.facts.artisticTargetsInventoried, 'Présence et candidats vérifiés distincts d’une admission artistique.'), metric('Nouveaux assets admis V111', snapshot.facts.newArtAssets, 'Seulement les assets munis de PNG, reçu et liaison runtime explicitement admis.'), ...statuses.map(status => metric('Chantiers ' + status, snapshot.workstreams.filter(row => row.status === status).length, 'Portée bornée.', `COUNTIF('ChantiersV111'!E5:E8,"${status}")`)), metric('Chantiers différés ouverts', snapshot.remaining.length, 'Les limites non couvertes restent visibles.'), metric('Contrôles navigateur V111', snapshot.production?.browserChecks ?? 'A_VALIDER', 'Uniquement la recette complète réellement exécutée sur le build V111.'), metric('Captures V111 inspectées', snapshot.production?.inspectedCaptures ?? 'A_VALIDER', 'Captures portables ouvertes et reliées au brut.'), metric('Excel natif exécuté', 'NON', 'ZIP/XML et caches de formules uniquement.')];
  const streams = [column('id', 'ID', 46), column('title', 'Chantier', 80), column('source', 'Source et besoin', 145), column('behavior', 'Comportement V111', 145), column('status', 'État', 28), column('implementation', 'Fichiers', 145), column('proof', 'Preuves SHA', 145), column('remaining', 'Limites', 145)];
  return [sheet('SyntheseV111', 'YAUTJA · suivi Homeworld V111', [column('label', 'Indicateur', 65), column('value', 'Valeur', 35), column('scope', 'Portée', 145)], summary),
    sheet('ChantiersV111', 'Avancées Homeworld bornées et vérifiables', streams, snapshot.workstreams),
    sheet('HomeworldV111', 'Chantiers différés restant ouverts', [column('id', 'ID', 55), column('title', 'Chantier', 85), column('source', 'Source exacte', 145), column('status', 'État', 28), column('detail', 'Besoin et limite', 145)], snapshot.remaining),
    sheet('ManquantsSourceV111', '56 exigences source héritées conservées', [column('id', 'ID', 60), column('familyId', 'Famille', 40), column('source', 'Cellule source', 145), column('sourceStatusV108', 'État historique', 30), column('statusV111', 'État source V111', 30), column('remaining', 'Besoin original', 145), column('progressV111', 'Portée V111', 145)], snapshot.sourceItems),
    sheet('CatalogueArtV111', '354 cibles : inventaire et admission restent distincts', [column('id', 'ID', 40), column('section', 'Section', 20), column('family', 'Famille', 65), column('label', 'Cible exacte', 85), column('lore', 'Portée lore', 40), column('statusV111', 'Clôture V111', 28), column('inventoryStatusV111', 'État de présence', 45), column('inventoryEvidenceV111', 'Candidats et preuves', 145), column('scopeV111', 'Limite', 145)], snapshot.artTargets),
    sheet('SourcesV111', 'Entrées exactes du suivi courant', [column('path', 'Chemin', 130), column('sha256', 'SHA256', 74), column('bytes', 'Octets', 24), column('verification', 'Vérification', 45), column('gitBlobOid', 'Objet Git historique', 50)], [...snapshot.inputs.map(row => ({...row, verification: 'SHA256_BYTES'})), ...snapshot.artInventoryVerification.images]),
    sheet('ValidationsV111', 'Preuves exécutées et limites', [column('id', 'ID', 48), column('status', 'État', 32), column('scope', 'Portée', 145), column('command', 'Commande', 145), column('evidence', 'Preuves SHA', 145), column('limit', 'Limite', 145)], snapshot.validations),
    sheet('JournalV111', 'Méthode et limites', [column('subject', 'Sujet', 50), column('detail', 'Décision / limite', 145)], [{subject: 'Méthode', detail: snapshot.method}, {subject: 'Historique', detail: BASELINE_V111.path + ' · SHA256 ' + BASELINE_V111.sha256}, {subject: 'Reproduction', detail: 'node scripts/build-homeworld-followup-v111.mjs --check'}, ...snapshot.limits.map((detail, index) => ({subject: 'Limite ' + (index + 1), detail}))])];
}

export async function generateFollowupV111({outputDir = path.join(ROOT, 'docs'), check = false} = {}) {
  const snapshot = await collectFollowupV111(), workbook = await writeWorkbookV111(BASELINE_V111, buildSheetsV111(snapshot)), structural = await verifyWorkbookV111(workbook);
  const qa = {schemaVersion: 1, release: 'V111', result: 'PASS_STRUCTURE', workbook: 'docs/YAUTJA_V111_SUIVI.xlsx', sha256: sha(workbook), bytes: workbook.length, inputFingerprintsVerified: snapshot.inputs.length, facts: snapshot.facts, production: snapshot.production, ...structural, nativeExcelApplicationVerified: false, nativeExcelCalculationEngineExecuted: false, historicalArtGitIdentitiesVerified: snapshot.artInventoryVerification.images.length, historicalArtByteChecksWhenPresent: true};
  const products = [Buffer.from(JSON.stringify(snapshot, null, 2) + '\n'), workbook, Buffer.from(JSON.stringify(qa, null, 2) + '\n')];
  if (!check) await fs.mkdir(outputDir, {recursive: true});
  for (const [index, name] of OUTPUTS_V111.entries()) {const file = path.join(outputDir, name); if (check) assert.deepEqual(await fs.readFile(file), products[index], 'Stale V111 follow-up: ' + name); else await fs.writeFile(file, products[index]);}
  return {snapshot, qa, workbookSha256: sha(workbook), bytes: workbook.length};
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const args = process.argv.slice(2), at = args.indexOf('--output-dir');
  assert.ok(args.every((arg, index) => ['--check', '--output-dir'].includes(arg) || at >= 0 && index === at + 1) && (at < 0 || args[at + 1]));
  const result = await generateFollowupV111({check: args.includes('--check'), ...(at >= 0 ? {outputDir: path.resolve(args[at + 1])} : {})});
  console.log(JSON.stringify({result: 'PASS_STRUCTURE', sha256: result.workbookSha256, bytes: result.bytes, inputs: result.snapshot.inputs.length, facts: result.snapshot.facts, production: result.snapshot.production}));
}
