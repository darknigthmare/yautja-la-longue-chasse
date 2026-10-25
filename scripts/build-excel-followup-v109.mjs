#!/usr/bin/env node
/** Append current V109 progress to the exact published V108 workbook. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {createFollowupEvidence, local, proofShape, evidencePath, verifyCaptureCoverage} from './lib/excel-followup-evidence.mjs';
import {verifyHistoricalExcelContextV109} from './historical-excel-context-v109.mjs';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const REGISTRY = 'docs/v109-workstreams-source.json';
export const OUTPUTS = ['v109-workstreams.json', 'YAUTJA_V109_SUIVI.xlsx', 'v109-excel-followup-qa.json'];
export const BASELINE_V109 = {path: 'docs/YAUTJA_V108_SUIVI.xlsx', sha256: '2a9490d4e37ff63405039f4f7e7b8c473373f15f83414ca5ff46e142ca5cdaba'};
const HISTORICAL = {path: 'docs/v108-workstreams.json', sha256: '42f1d9113cbee405c483aa7720c01e6f5bb0b158c725834a9855c7dacb020c3b'};
const WRITER = 'scripts/build-excel-followup-v109.py';
export const FAMILY_IDS_V109 = ['pit-roster-kits', 'war-structures', 'enforcer-pngs', 'preserve-expansion', 'enforcer-provenance', 'pit-actions', 'pit-campaigns', 'pit-variants'];
export const PRODUCTION_RECIPES_V109 = {Pit: 'scripts/qa-pit-forward-throws-v109.mjs', Homeworld: 'scripts/qa-homeworld-plaque-v109.mjs', Clans: 'scripts/qa-clan-supply-route-v109.mjs', Preserve: 'scripts/qa-preserve-biomes-v109.mjs'};
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const read = file => fs.readFile(path.join(ROOT, file));
const json = async file => JSON.parse(await read(file));
const evidence = createFollowupEvidence({root: ROOT, release: 'V109', recipes: PRODUCTION_RECIPES_V109});
export const collectDefinitionFactsV109 = evidence.collectDefinitionFacts;
export const verifyProductionSummaryV109 = evidence.verifyProductionSummary;
export const verifyCaptureCoverageV109 = verifyCaptureCoverage;
const fingerprint = evidence.fingerprint;

export function verifyRegistryV109(registry) {
  assert.equal(registry.schemaVersion, 1); assert.equal(registry.release, 'V109'); assert.match(registry.asOf, /^\d{4}-\d{2}-\d{2}$/); assert.deepEqual(registry.baseline, BASELINE_V109);
  assert.ok(['PENDING_RUNTIME_FREEZE', 'FROZEN'].includes(registry.baselineFreeze));
  assert.deepEqual(registry.workstreams.map(row => row.id).sort(), [...FAMILY_IDS_V109, 'homeworld-cargo'].sort());
  for (const row of registry.workstreams) {
    assert.ok(['OUVERT', 'EN_COURS', 'A_VALIDER', 'LIVRE_PARTIEL', 'VALIDE_CIBLE', 'HERITE_STATIQUE'].includes(row.status));
    assert.ok(row.title && row.source && row.runtime && row.remaining && row.validationScope);
    assert.ok(Array.isArray(row.implementation) && row.implementation.every(local) && Array.isArray(row.proof)); row.proof.forEach(proofShape);
    if (row.status === 'VALIDE_CIBLE') {
      assert.equal(registry.baselineFreeze, 'FROZEN', 'Freeze the executed V109 build before promotion');
      assert.ok(row.tests?.startsWith('PASS') && row.browser?.startsWith('PASS_CIBLE_PRODUCTION'));
      assert.ok(row.proof.some(proof => proof.path === 'docs/v109-validation-summary.json')); assert.ok(row.proof.length >= 2, 'Domain and master proof required');
    }
  }
  // Pair-limited throws, tours, props and original reserves cannot by themselves
  // close complete source campaigns, target counts, kits or variant constraints.
  assert.deepEqual(registry.closedOpenItemIds, [], 'Bounded V109 progress cannot close a full source requirement by count');
  assert.ok(Array.isArray(registry.runtimeModules) && Array.isArray(registry.factProbes));
  const ids = new Set();
  for (const row of registry.runtimeModules) {assert.match(row.id, /^[A-Za-z][A-Za-z0-9]*$/); assert.ok(!ids.has(row.id)); ids.add(row.id); assert.ok(local(row.path) && /^app\/.+\.(ts|tsx)$/.test(row.path));}
  assert.equal(new Set(registry.factProbes.map(row => row.id)).size, registry.factProbes.length);
  for (const row of registry.factProbes) {assert.match(row.id, /^[A-Za-z][A-Za-z0-9]*$/); assert.ok(['value', 'length', 'uniqueIds', 'ids'].includes(row.operation)); assert.ok(Array.isArray(row.calls) && row.calls.length > 0);}
  assert.ok(Array.isArray(registry.validations) && Array.isArray(registry.limits));
  for (const row of registry.validations) {assert.ok(row.id && row.command && row.scope && row.limit && Array.isArray(row.evidence)); if (row.status.startsWith('PASS')) {assert.ok(row.evidence.length); row.evidence.forEach(proofShape);}}
  if (registry.baselineFreeze === 'FROZEN') {assert.equal(registry.runtimeFreeze?.path, 'docs/v109-runtime-freeze.json'); proofShape(registry.runtimeFreeze); assert.ok(registry.runtimeModules.length >= 3 && registry.factProbes.length > 0);}
}

async function python(payload, mode = '') {
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'yautja-excel-v109-'));
  try {
    if (payload.workbook) {await fs.writeFile(path.join(temporary, 'verify.xlsx'), payload.workbook); payload = {...payload, workbook: undefined, workbookPath: path.join(temporary, 'verify.xlsx')};}
    const request = path.join(temporary, 'request.json'); await fs.writeFile(request, JSON.stringify(payload));
    return execFileSync('python3', [path.join(ROOT, WRITER), ...(mode ? [mode] : []), '--request', request], {timeout: 30000, maxBuffer: 50 * 1024 * 1024});
  } finally {await fs.rm(temporary, {recursive: true, force: true});}
}
export const writeWorkbookV109 = (baseline, sheets) => python({root: ROOT, baseline, sheets});
export const verifyWorkbookV109 = async (workbook, baseline = BASELINE_V109) => JSON.parse(await python({root: ROOT, baseline, workbook}, '--verify'));

export async function collectFollowupV109(registry = undefined) {
  registry ??= await json(REGISTRY); verifyRegistryV109(registry);
  assert.equal(sha(await read(BASELINE_V109.path)), BASELINE_V109.sha256); assert.equal(sha(await read(HISTORICAL.path)), HISTORICAL.sha256, 'Published V108 snapshot changed');
  const historicalIntegrity = await verifyHistoricalExcelContextV109();
  const historical = await json(HISTORICAL.path); assert.equal(historical.openItems.length, 56);
  const definitions = await collectDefinitionFactsV109(registry);
  const guarded = [REGISTRY, WRITER, 'scripts/build-excel-followup-v109.mjs', 'scripts/lib/excel-followup-evidence.mjs', 'scripts/snapshot-runtime-v109.mjs', 'scripts/publish-validation-domain-v109.mjs', 'scripts/build-validation-summary-v109.mjs', 'docs/v109-runtime-public-inputs.json', 'scripts/lib/excel_followup_append.py', 'scripts/build-excel-followup-v100.py', 'scripts/historical-excel-context-v109.mjs', 'scripts/lib/historical-excel-context.mjs', 'tests/fixtures/excel-history-v108-v109.json', 'tests/fixtures/excel-history-v108-v109.json.gz', BASELINE_V109.path, HISTORICAL.path, ...definitions.inputs.map(row => row.path), ...registry.workstreams.flatMap(row => row.implementation)];
  const before = await fingerprint(guarded), references = [...registry.workstreams.flatMap(row => row.proof), ...registry.validations.flatMap(row => row.evidence)];
  for (const proof of references) {const bytes = await read(evidencePath(proof)); assert.equal(bytes.length, proof.bytes); assert.equal(sha(bytes), proof.sha256);}
  let productionEvidence = [], freezeEntriesVerified = 0, production = null;
  if (registry.baselineFreeze === 'FROZEN') {
    const bytes = await read(registry.runtimeFreeze.path); assert.equal(bytes.length, registry.runtimeFreeze.bytes); assert.equal(sha(bytes), registry.runtimeFreeze.sha256);
    const freeze = JSON.parse(bytes); assert.equal(freeze.files, freeze.entries.length); assert.equal(new Set(freeze.entries.map(row => row.path)).size, freeze.files); assert.equal(freeze.bytes, freeze.entries.reduce((sum, row) => sum + row.bytes, 0));
    for (const row of freeze.entries) {assert.ok(local(row.path)); const input = await read(row.path); assert.equal(input.length, row.bytes); assert.equal(sha(input), row.sha256, 'Frozen V109 input changed: ' + row.path);}
    const frozen = new Map(freeze.entries.map(row => [row.path, row]));
    for (const row of definitions.inputs.filter(row => row.path.startsWith('app/'))) assert.equal(frozen.get(row.path)?.sha256, row.sha256, 'Measured application source absent from production freeze');
    production = await json('docs/v109-validation-summary.json'); assert.deepEqual(production.sourceFreeze, registry.runtimeFreeze); productionEvidence = await verifyProductionSummaryV109(production, freeze); freezeEntriesVerified = freeze.files;
  }
  const sourceItems = historical.openItems.map(row => {const stream = registry.workstreams.find(stream => stream.id === row.familyId); assert.ok(stream); return {...row, sourceStatusV108: row.statusV108, statusV109: 'OUVERT_SOURCE', progressV109: stream.runtime, remainingV109: stream.remaining, evidenceV109: stream.proof};});
  const families = historical.families.map(row => ({...row, remainingCountV109: sourceItems.filter(item => item.familyId === row.id).length, progressV109: registry.workstreams.find(stream => stream.id === row.id).runtime}));
  const inputs = await fingerprint([...guarded, ...references.map(evidencePath), ...productionEvidence, ...(production ? [registry.runtimeFreeze.path, 'docs/v109-validation-summary.json'] : [])]);
  assert.deepEqual(await fingerprint(guarded), before, 'Sources changed during V109 collection');
  return {schemaVersion: 1, release: 'V109', asOf: registry.asOf, baseline: registry.baseline, historicalSnapshot: HISTORICAL, historicalIntegrity, baselineFreeze: registry.baselineFreeze, runtimeFreeze: registry.runtimeFreeze ?? null, freezeEntriesVerified,
    method: 'Append-only continuation of 85 published V108 worksheets. All 56 original source requirements stay visible. Current application definitions, native art admissions, tests and actually executed journeys have distinct scopes. No browser or native Excel is launched by the generator.',
    facts: {inheritedOpenItems: 56, openItems: sourceItems.length, newlyClosedItems: 0, sourceRuntimeBindingsInherited: 43, sourceActionsRemaining: 9, newNativeBodyDrawings: definitions.facts.pitForwardNativeBodyDrawings ?? 0},
    inheritedDefinitionFacts: historical.definitionFacts, definitionFacts: definitions.facts,
    production: production ? {runtimeCommit: production.runtimeCommit, buildId: production.productionBuildId, browserChecks: production.production.reduce((sum, row) => sum + row.browserChecksPassed, 0), inspectedCaptures: production.production.reduce((sum, row) => sum + row.capturesInspected, 0)} : null,
    delivery: {completeKits: 'OUVERT', sourceCampaigns: 'OUVERT', variantAnimations: 'OUVERT', warCampaignAcquisitions: 'OUVERT', canonicalFidelity: 'NON_CERTIFIE'}, families, workstreams: registry.workstreams, originalOpenItems: historical.openItems, sourceItems, openItems: sourceItems, closedOpenItemIds: [], inputs, validations: registry.validations, limits: registry.limits};
}

const column = (key, label, width = 36) => ({key, label, width});
const printable = value => value == null ? '' : typeof value === 'object' && !('formula' in value && 'cached' in value) ? JSON.stringify(value) : value;
const sheet = (name, title, columns, rows) => ({name, title, subtitle: 'V109 · sources conservées, progrès bornés, art et preuves distinctes', columns, rows: rows.map(row => Object.fromEntries(Object.entries(row).map(([key, value]) => [key, printable(value)])))});
export function buildSheetsV109(snapshot) {
  const metric = (label, value, scope, formula) => ({label, value: formula ? {formula, cached: value} : value, scope});
  const summary = [metric('Lignes source encore ouvertes', snapshot.openItems.length, 'Les 56 exigences source restent individuellement suivies.', "COUNTIF('ManquantsV109'!E5:E60,\"OUVERT_SOURCE\")"), metric('Feuilles historiques conservées', 85, BASELINE_V109.path), metric('Nouvelles clôtures source', 0, 'Aucune clôture par simple quantité, nouvelle fixture ou liaison limitée.'), metric('Liaisons source héritées / actions restantes', '43 / 9', 'Les prises bornées et leurs dessins sont mesurés séparément.'), metric('Nouveaux dessins BODY admis', snapshot.facts.newNativeBodyDrawings, 'Uniquement les rectangles natifs admis et mesurés dans le registre courant.'), metric('État du gel production', snapshot.baselineFreeze, 'Une définition ne certifie pas un parcours.'), metric('Contrôles navigateur V109', snapshot.production?.browserChecks ?? 'À VALIDER', 'Les contrôles V108 ne sont pas additionnés.'), metric('Captures V109 réellement inspectées', snapshot.production?.inspectedCaptures ?? 'À VALIDER', 'Captures du build V109 exécuté uniquement.'), ...['OUVERT', 'EN_COURS', 'A_VALIDER', 'LIVRE_PARTIEL', 'VALIDE_CIBLE', 'HERITE_STATIQUE'].map(status => metric('Chantiers ' + status, snapshot.workstreams.filter(row => row.status === status).length, 'Validation de la portée exacte de la ligne.', `COUNTIF('ChantiersV109'!E5:E13,"${status}")`)), metric('Excel natif exécuté', 'NON', 'Vérifications ZIP/XML, cellules, caches et formules.')];
  const streams = [column('id', 'ID', 38), column('domain', 'Domaine', 28), column('title', 'Chantier', 65), column('source', 'Sources exactes', 120), column('status', 'État', 30), column('validationScope', 'Périmètre', 110), column('runtime', 'ProgrèsV109', 145), column('tests', 'Tests exécutés', 120), column('browser', 'Production réelle', 120), column('proof', 'Preuves SHA', 145), column('remaining', 'Reste ouvert', 145)];
  const subset = (name, title, ids, prefix) => sheet(name, title, streams, [...snapshot.workstreams.filter(row => ids.includes(row.id)), ...Object.entries(snapshot.definitionFacts).filter(([id]) => (Array.isArray(prefix) ? prefix : [prefix]).some(value => id.startsWith(value))).map(([id, value]) => ({id, domain: 'Mesure du code courant', title: id, source: REGISTRY + ' · factProbes', status: 'DEFINITION_MESUREE', runtime: String(value), validationScope: 'Valeur mesurée dans les véritables exports du jeu courant.', remaining: 'La mesure seule ne clôt aucune cible source.'}))]);
  return [sheet('SyntheseV109', 'YAUTJA · suivi actif V109', [column('label', 'Indicateur', 60), column('value', 'Valeur', 35), column('scope', 'Portée', 145)], summary), sheet('ChantiersV109', 'Continuité des huit familles et du Homeworld', streams, snapshot.workstreams), sheet('FamillesV109', 'Les huit familles source conservées', [column('id', 'Famille'), column('label', 'Libellé', 60), column('count', 'Lignes initiales', 20), column('remainingCountV109', 'Lignes ouvertes', 24), column('progressV109', 'Progrès courant', 145), column('target', 'Cible source', 145), column('itemIds', 'IDs', 145)], snapshot.families), sheet('ManquantsV109', 'Chaque exigence source reste visible', [column('id', 'ID', 60), column('familyId', 'Famille', 38), column('source', 'Cellule source', 120), column('sourceStatusV108', 'Statut hérité V108', 35), column('statusV109', 'Statut source V109', 35), column('remaining', 'Besoin original', 145), column('progressV109', 'Progrès V109', 145), column('remainingV109', 'Limite actuelle', 145), column('evidenceV109', 'Preuves', 145)], snapshot.sourceItems), subset('PitV109', 'Projections et personnages, campagnes et variantes', ['pit-roster-kits', 'pit-actions', 'pit-campaigns', 'pit-variants'], 'pit'), subset('HomeworldV109', 'Plaque et empreinte ROLE03, navigation physique', ['homeworld-cargo'], 'homeworld'), subset('ClansV109', 'Tournée physique de ravitaillement et montures', ['war-structures'], 'clan'), subset('PreserveV109', 'Géographies désert et glace, objectifs physiques', ['preserve-expansion'], 'preserve'), subset('ArtV109', 'Art natif, admissions et provenance', ['pit-actions', 'homeworld-cargo', 'enforcer-pngs', 'enforcer-provenance'], ['art', 'pitForwardNative', 'pitForwardAttacker', 'pitForwardVictim', 'homeworldPlaqueNative']), sheet('SourcesV109', 'Entrées vérifiées du suivi courant', [column('path', 'Chemin', 125), column('sha256', 'SHA256', 72), column('bytes', 'Octets', 22)], snapshot.inputs), sheet('ValidationsV109', 'Vérifications exécutées et leurs limites', [column('id', 'ID', 48), column('status', 'État', 32), column('scope', 'Portée', 130), column('command', 'Commande', 145), column('evidence', 'Preuves SHA', 145), column('limit', 'Limites', 145)], snapshot.validations), sheet('JournalV109', 'Méthode et limites', [column('subject', 'Sujet', 50), column('detail', 'Décision / limite', 145)], [{subject: 'Méthode', detail: snapshot.method}, {subject: 'Historique V108', detail: 'node scripts/check-excel-history-v109.mjs --check --tests'}, {subject: 'V109 courant', detail: 'node scripts/build-excel-followup-v109.mjs --check'}, ...snapshot.limits.map((detail, index) => ({subject: 'Limite ' + (index + 1), detail}))])];
}
export async function generateFollowupV109({outputDir = path.join(ROOT, 'docs'), check = false} = {}) {
  const snapshot = await collectFollowupV109(), workbook = await writeWorkbookV109(snapshot.baseline, buildSheetsV109(snapshot)), structural = await verifyWorkbookV109(workbook, snapshot.baseline);
  const qa = {schemaVersion: 1, release: 'V109', result: 'PASS_STRUCTURE', workbook: 'docs/YAUTJA_V109_SUIVI.xlsx', sha256: sha(workbook), bytes: workbook.length, inputFingerprintsVerified: snapshot.inputs.length, freezeEntriesVerified: snapshot.freezeEntriesVerified, facts: snapshot.facts, definitionFacts: snapshot.definitionFacts, production: snapshot.production, historicalIntegrity: snapshot.historicalIntegrity, ...structural, nativeExcelApplicationVerified: false, nativeExcelCalculationEngineExecuted: false};
  const products = [Buffer.from(JSON.stringify(snapshot, null, 2) + '\n'), workbook, Buffer.from(JSON.stringify(qa, null, 2) + '\n')];
  if (!check) await fs.mkdir(outputDir, {recursive: true});
  for (const [index, name] of OUTPUTS.entries()) {const file = path.join(outputDir, name); if (check) assert.deepEqual(await fs.readFile(file), products[index], 'Stale V109 follow-up: ' + name); else await fs.writeFile(file, products[index]);}
  return {snapshot, qa, workbookSha256: sha(workbook), bytes: workbook.length};
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const args = process.argv.slice(2), at = args.indexOf('--output-dir');
  assert.ok(args.every((arg, index) => ['--check', '--output-dir'].includes(arg) || at >= 0 && index === at + 1) && (at < 0 || args[at + 1]));
  const result = await generateFollowupV109({check: args.includes('--check'), ...(at >= 0 ? {outputDir: path.resolve(args[at + 1])} : {})});
  console.log(JSON.stringify({result: 'PASS_STRUCTURE', sha256: result.workbookSha256, bytes: result.bytes, inputs: result.snapshot.inputs.length, facts: result.snapshot.facts, definitionFacts: result.snapshot.definitionFacts}));
}
