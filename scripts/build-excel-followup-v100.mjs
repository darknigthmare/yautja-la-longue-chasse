#!/usr/bin/env node
/** Current V100 exports and reviewed pixels, appended to the immutable V99
 * history. Test/browser declarations stay explicit, never inferred from files. */
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import sharp from 'sharp';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { collectFollowupV99 } from './build-excel-followup-v99.mjs';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const REGISTRY = 'docs/v100-workstreams-source.json';
export const OUTPUTS = ['v100-workstreams.json', 'YAUTJA_V100_SUIVI.xlsx', 'v100-excel-followup-qa.json'];
const WRITER = 'scripts/build-excel-followup-v100.py';
const PLAN = 'app/game/data/pitWorkbookAnimationPlanV100.json';
const ADMISSIONS = 'app/game/data/pitWorkbookAnimationsV100.json';
const BASELINE = { path: 'docs/YAUTJA_V99_SUIVI.xlsx', sha256: '53116e8f0fe10867702cccdb2d7bf2c8bbc5baa7c6a9c528085c12f780392a15' };
const sha = data => createHash('sha256').update(data).digest('hex');
const read = relative => fs.readFile(path.join(ROOT, relative));
const json = async relative => JSON.parse(await read(relative));
const fingerprint = async files => Promise.all([...new Set(files)].sort().map(async file => ({ path: file, sha256: sha(await read(file)) })));

async function python(payload, mode = '') {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'yautja-excel-v100-'));
  try {
    const request = path.join(directory, 'request.json');
    if (payload.workbook) { await fs.writeFile(path.join(directory, 'verify.xlsx'), payload.workbook); payload = { ...payload, workbook: undefined, workbookPath: path.join(directory, 'verify.xlsx') }; }
    await fs.writeFile(request, JSON.stringify(payload));
    return execFileSync('python3', [path.join(ROOT, WRITER), ...(mode ? [mode] : []), '--request', request], { stdio: ['ignore', 'pipe', 'pipe'], timeout: 30000, maxBuffer: 32 * 1024 * 1024 });
  } finally { await fs.rm(directory, { recursive: true, force: true }); }
}

export function verifyPlanV100(plan, extraction, extractionHash) {
  assert.equal(plan.schemaVersion, 1, 'Schéma du plan V100');
  assert.equal(plan.source.extractionSha256, extractionHash, 'Extraction source modifiée');
  assert.equal(plan.source.workbookSha256, extraction.source.sha256, 'SHA du classeur source incohérent');
  assert.equal(plan.source.originalAvailable, false, 'Ne pas déclarer l’original privé présent');
  assert.deepEqual(plan.fighters.map(fighter => [fighter.fighterId, fighter.sourceRow]), [['feral-hunter', 10], ['scar', 7]], 'Identités/lignes Feral et Scar');
  const ids = new Set();
  for (const fighter of plan.fighters) {
    const source = extraction.p0Specifications.find(item => item.fighterId === fighter.fighterId);
    assert.ok(source, `Source absente : ${fighter.fighterId}`);
    assert.equal(fighter.appearanceId, 'runtime-default');
    assert.equal(source.identity.cells[`B${fighter.sourceRow}`], fighter.fighterId);
    assert.equal(fighter.actions.length, 26, '26 cellules par personnage');
    for (const [category, section, first, count] of [['move', source.moves, 68, 18], ['presentation', source.presentations, 67, 8]]) {
      const actions = fighter.actions.filter(action => action.category === category);
      assert.deepEqual(actions.map(action => action.cell), Array.from({ length: count }, (_, index) => String.fromCharCode(first + index) + fighter.sourceRow), 'Cellules source manquantes ou déplacées');
      for (const action of actions) {
        assert.ok(!ids.has(action.id), `Geste dupliqué : ${action.id}`); ids.add(action.id);
        assert.equal(action.sheet, section.sheet, 'Feuille source incorrecte');
        assert.equal(action.sourceText, section.cells[action.cell], `Texte/cellule source incorrect : ${action.id}`);
        assert.equal(action.id, `${category === 'move' ? 'M' : 'CIN'}_${source.identity.cells[`A${fighter.sourceRow}`]}_${action.key}`, 'Identité source incorrecte');
        assert.equal(action.sourceText.split('\n')[0], `${action.id} · ${action.label}`, 'Libellé source incorrect');
        if (category === 'move') {
          const ticks = /Préparation \/ actif \/ récupération : (\d+) \/ (\d+) \/ (\d+)/.exec(action.sourceText);
          assert.ok(ticks, `Timings source absents : ${action.id}`);
          assert.deepEqual(action.phaseTicks, Object.fromEntries(['startup', 'active', 'recovery'].map((phase, index) => [phase, Number(ticks[index + 1])])), 'Timings proposés altérés');
        }
      }
    }
  }
  assert.equal(ids.size, 52);
}

function verifyRegistry(registry) {
  assert.equal(registry.schemaVersion, 1); assert.equal(registry.release, 'V100');
  assert.deepEqual(registry.baseline, BASELINE, 'La base V99 épinglée doit rester intacte');
  assert.match(registry.asOf, /^\d{4}-\d{2}-\d{2}$/);
  const ids = new Set(), allowed = new Set(['EN_COURS', 'A_VALIDER', 'OUVERT', 'MANQUANT', 'LIVRE_PARTIEL', 'VALIDE_CIBLE']);
  for (const item of registry.workstreams) {
    assert.ok(!ids.has(item.id) && allowed.has(item.status), `Identifiant/statut invalide : ${item.id}`); ids.add(item.id);
    assert.ok(item.source && item.remaining && item.runtime, `Périmètre incomplet : ${item.id}`);
    if (item.status === 'VALIDE_CIBLE') assert.ok(item.proof?.length && item.tests.startsWith('PASS'), `Validation sans preuve explicite : ${item.id}`);
    if (item.id.startsWith('PIT-') && item.status === 'VALIDE_CIBLE') {
      assert.equal(item.validationScope, 'BODY_STUDIES_ONLY', 'Une validation Pit doit limiter sa portée aux études BODY ; aucune clôture globale des personnages');
      assert.ok(item.browser?.startsWith('PASS'), 'Les études BODY consultables demandent une preuve navigateur explicite');
    }
  }
  for (const item of registry.validations) assert.ok(item.scope && item.limit && item.command && item.evidence?.length, `Validation sans portée : ${item.id}`);
}

export async function collectFollowupV100(registry = undefined) {
  registry ??= await json(REGISTRY); verifyRegistry(registry);
  const guardedFiles = [REGISTRY, 'scripts/build-excel-followup-v100.mjs', WRITER, PLAN, ADMISSIONS, 'app/game/pitWorkbookAnimationV100.ts', 'app/game/pitWorkbookCombatRegistryV100.ts', 'app/game/pitSpriteSheetRegistry.ts', 'app/game/systems/homeworldStreetContactsV100.ts', 'app/game/systems/clanWarEvacuationV100.ts', ...registry.workstreams.flatMap(item => item.implementation)];
  const guardedBefore = await fingerprint(guardedFiles);
  const [historical, plan, admissionData] = await Promise.all([collectFollowupV99(), json(PLAN), json(ADMISSIONS)]);
  const extractionBytes = await read(plan.source.extractionPath);
  verifyPlanV100(plan, JSON.parse(extractionBytes), sha(extractionBytes));
  const compiled = await build({ stdin: { contents: `export * from './app/game/pitWorkbookAnimationV100'; export { PIT_SPRITE_SHEET_REGISTRY } from './app/game/pitSpriteSheetRegistry'; export { processHunterSpriteTransparency } from './app/game/hunterSpriteAtlas'; export { HOMEWORLD_STREET_CONTACTS_V100, HOMEWORLD_STREET_CONTACT_RADIUS_V100 } from './app/game/systems/homeworldStreetContactsV100'; export { WAR_EVACUATION_COST_V100, WAR_EVACUATION_ESCORTS_V100 } from './app/game/systems/clanWarEvacuationV100';`, resolveDir: ROOT }, absWorkingDir: ROOT, bundle: true, write: false, metafile: true, platform: 'node', format: 'esm', logLevel: 'silent' });
  const api = await import('data:text/javascript;base64,' + Buffer.from(compiled.outputFiles[0].text).toString('base64'));
  assert.deepEqual(api.PIT_WORKBOOK_PLAN_V100, plan, 'Plan modifié pendant la collecte');
  assert.deepEqual(api.PIT_WORKBOOK_ADMISSIONS_V100, admissionData, 'Admissions modifiées pendant la collecte');
  const expectedIds = new Set(plan.fighters.flatMap(fighter => fighter.actions.map(action => `${fighter.fighterId}/${action.id}`))), admissionIds = new Set();
  for (const entry of admissionData) {
    const id = `${entry.fighterId}/${entry.actionId}`;
    assert.ok(expectedIds.has(id) && !admissionIds.has(id), `Admission orpheline ou dupliquée : ${id}`); admissionIds.add(id);
    assert.ok(api.getPitWorkbookNativeV100(entry.fighterId, entry.actionId), `Admission runtime refusée : ${id}`);
  }
  const assets = new Map(), orientations = [], animations = [];
  async function asset(page, admission) {
    const relative = path.posix.join('public', page.src);
    assert.ok(page.src.startsWith('/game/') && !page.src.split('/').includes('..'), 'Chemin PNG local attendu');
    const bytes = await read(relative), digest = sha(bytes), approved = admission.review.sourceHashes?.[page.src] ?? admission.review.sourceSha256;
    assert.match(approved ?? '', /^[a-f0-9]{64}$/, `SHA d’admission manquant : ${page.src}`);
    assert.equal(digest, approved, `PNG admis modifié : ${page.src}`);
    const key = JSON.stringify([relative, digest, page.transparency]);
    if (!assets.has(key)) {
      const decoded = await sharp(bytes).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      assert.equal(decoded.info.width, page.width, 'Largeur PNG admis'); assert.equal(decoded.info.height, page.height, 'Hauteur PNG admis');
      const processed = api.processHunterSpriteTransparency(new Uint8ClampedArray(decoded.data), page.width, page.height, page.transparency);
      assets.set(key, { path: relative, src: page.src, sha256: digest, width: page.width, height: page.height, pixels: processed.pixels });
    }
    return assets.get(key);
  }
  for (const fighter of plan.fighters) for (const action of fighter.actions) {
    const native = api.getPitWorkbookNativeV100(fighter.fighterId, action.id), entry = native?.admission, link = api.getPitWorkbookCombatLinkV100(fighter.fighterId, action);
    const combatIds = entry?.combatClipIds ?? (native ? link.clipIds : []);
    const combatDefinition = native && combatIds.length ? api.PIT_SPRITE_SHEET_REGISTRY.find(definition => definition.fighterId === fighter.fighterId && definition.variantId === undefined && definition.atlas.id === native.definition.atlas.id && combatIds.every(id => ['right', 'left'].every(facing => definition.atlas.clips.some(clip => clip.id === id && clip.facing === facing && clip.status === 'validated')))) : null;
    if (entry?.combatClipIds?.length) {
      assert.ok(combatDefinition, `Raccordement combat déclaré mais absent du runtime : ${action.id}`);
      assert.deepEqual([...new Set(combatIds.map(id => id.split('.').at(-1)))].sort(), ['active', 'recovery', 'startup'], `Phases combat incomplètes : ${action.id}`);
    }
    const directions = [];
    for (const facing of ['right', 'left']) {
      const timeline = native ? api.getPitWorkbookTimelineV100(native, facing) : [], hashes = new Set(), frames = [], sourcePages = new Map();
      for (const item of timeline) {
        const frame = item.clip.frames[item.clipFrameIndex], page = native.definition.atlas.pages.find(page => page.id === frame.pageId), pixels = await asset(page, entry), [x, y, width, height] = frame.rect;
        const cropped = Buffer.alloc(width * height * 4); let visiblePixels = 0;
        for (let row = 0; row < height; row++) for (let column = 0; column < width; column++) {
          const source = ((y + row) * page.width + x + column) * 4, target = (row * width + column) * 4;
          if (pixels.pixels[source + 3]) { cropped.set(pixels.pixels.subarray(source, source + 4), target); visiblePixels++; }
        }
        assert.ok(visiblePixels > 0, `Dessin admis vide : ${action.id}/${facing}/${item.clipId}/${item.clipFrameIndex}`);
        const pixelSha256 = sha(Buffer.concat([Buffer.from(`${width}x${height}:`), cropped])); hashes.add(pixelSha256);
        sourcePages.set(page.src, pixels.sha256);
        frames.push({ clipId: item.clipId, frameIndex: item.clipFrameIndex, src: page.src, rect: frame.rect, pivot: frame.pivot, ticks60: item.durationTicks60, pixelSha256 });
      }
      if (timeline.length) assert.ok(hashes.size >= (combatDefinition ? 3 : 2), `Dessins visibles insuffisants pour l’animation native : ${action.id}/${facing}`);
      const direction = { fighterId: fighter.fighterId, actionId: action.id, sheet: action.sheet, cell: action.cell, facing, status: timeline.length ? 'ADMIS_ETUDE' : 'MANQUANT_ART', timelineFrames: timeline.length, distinctDrawings: hashes.size, nativeClipIds: [...new Set(timeline.map(frame => frame.clipId))], sourcePages: [...sourcePages].map(([src, sha256]) => ({ src, sha256 })), frames };
      orientations.push(direction); directions.push(direction);
    }
    const combatStatus = combatDefinition ? (entry.combatClipIds ? 'RACCORDE_VISUEL' : 'HISTORIQUE_LIE') : native ? 'ETUDE_SEULE' : 'NON_RACCORDE';
    animations.push({ fighterId: fighter.fighterId, appearanceId: fighter.appearanceId, actionId: action.id, category: action.category, key: action.key, label: action.label, sheet: action.sheet, cell: action.cell, sourceText: action.sourceText, sourceWorkbook: plan.source.workbookName, sourceSha256: plan.source.workbookSha256, extractionPath: plan.source.extractionPath, extractionSha256: plan.source.extractionSha256, proposedTicks: action.phaseTicks ?? null, artStatus: directions.every(direction => direction.timelineFrames > 0) ? 'ADMIS_DEUX_SENS' : native ? 'INCOMPLET' : 'MANQUANT_ART', rightFrames: directions[0].timelineFrames, leftFrames: directions[1].timelineFrames, rightDrawings: directions[0].distinctDrawings, leftDrawings: directions[1].distinctDrawings, atlasId: entry?.atlasId ?? '', reviewScope: entry?.review.scope ?? '', reviewNotes: entry?.review.notes ?? '', combatStatus, combatClipIds: combatDefinition ? combatIds : [], combatPhases: combatDefinition ? [...new Set(combatIds.map(id => id.split('.').at(-1)))] : [], browserStatus: 'A_VALIDER', mechanicsStatus: 'NON_CERTIFIE_CLASSEUR', remaining: native ? 'Admission visuelle de portée limitée. Entités, accessoires, variantes, mécanique source et preuve finale restent distincts. ' + entry.review.notes : 'Dessins natifs de ce geste et des deux orientations à produire ; aucune pose empruntée ne clôt cette cellule.' });
  }
  const inventory = JSON.parse(await python({ root: ROOT, paths: [...historical.workbookInventory.map(item => item.path), BASELINE.path] }, '--inventory'));
  assert.equal(inventory.at(-1).sha256, BASELINE.sha256, 'Classeur historique V99 modifié');
  assert.equal(inventory.at(-1).sheets.length, 15, 'Les15 feuilles historiques V99 doivent être présentes');
  const contacts = api.HOMEWORLD_STREET_CONTACTS_V100.map(contact => ({ id: contact.id, name: contact.name ?? 'Nom propre non renseigné', role: contact.role, levelId: contact.levelId, districtId: contact.districtId, radius: api.HOMEWORLD_STREET_CONTACT_RADIUS_V100, scope: 'Habitant déjà dessiné et conservé ; approche réelle sur même étage et sol libre. Un contact navigateur ciblé, pas 16 parcours navigateur.' }));
  const assetRows = [...new Map([...assets.values()].map(item => [item.path, { path: item.path, src: item.src, sha256: item.sha256, width: item.width, height: item.height }])).values()];
  const required = [...historical.inputs.map(item => item.path), REGISTRY, 'scripts/build-excel-followup-v100.mjs', WRITER, BASELINE.path, PLAN, ADMISSIONS, plan.source.extractionPath, ...Object.keys(compiled.metafile.inputs).filter(file => file !== '<stdin>'), ...registry.workstreams.flatMap(item => item.implementation), ...assetRows.map(item => item.path)];
  const inputs = await fingerprint(required);
  assert.deepEqual(await fingerprint(guardedFiles), guardedBefore, 'Entrées runtime modifiées pendant la collecte V100 ; régénérer après gel');
  const facts = { ...historical.facts, requestedActions: animations.length, requestedOrientations: orientations.length, admittedActions: animations.filter(item => item.artStatus === 'ADMIS_DEUX_SENS').length, admittedOrientations: orientations.filter(item => item.timelineFrames > 0).length, timelineFrames: orientations.reduce((sum, item) => sum + item.timelineFrames, 0), distinctDrawingsByOrientation: orientations.reduce((sum, item) => sum + item.distinctDrawings, 0), newCombatActions: animations.filter(item => item.combatStatus === 'RACCORDE_VISUEL').length, historicalCombatActions: animations.filter(item => item.combatStatus === 'HISTORIQUE_LIE').length, studyOnlyActions: animations.filter(item => item.combatStatus === 'ETUDE_SEULE').length, missingActions: animations.filter(item => item.artStatus !== 'ADMIS_DEUX_SENS').length, homeworldContacts: contacts.length, evacuationEscortsPerPatient: api.WAR_EVACUATION_ESCORTS_V100, evacuationSupplyCost: api.WAR_EVACUATION_COST_V100.s };
  const all52BodyStudiesAdmitted = facts.admittedActions === facts.requestedActions && facts.admittedOrientations === facts.requestedOrientations;
  for (const item of registry.workstreams.filter(item => item.id.startsWith('PIT-') && item.status === 'VALIDE_CIBLE')) {
    const target = item.bodyStudyFighterId;
    assert.ok(target === undefined || plan.fighters.some(fighter => fighter.fighterId === target), 'Personnage cible BODY inconnu');
    const studies = animations.filter(action => !target || action.fighterId === target);
    assert.ok(studies.every(action => action.artStatus === 'ADMIS_DEUX_SENS'), `Études BODY incomplètes pour la validation ciblée : ${item.id}`);
    for (const study of studies) study.browserStatus = 'PASS_CIBLE_BODY';
  }
  const all52BodyStudiesProven = all52BodyStudiesAdmitted && animations.every(action => action.browserStatus === 'PASS_CIBLE_BODY');
  return { schemaVersion: 1, release: 'V100', asOf: registry.asOf, method: 'Compilation des exports runtime actuels ; cellules et textes comparés à l’extraction V56 épinglée ; empreintes des PNG admis et de leurs dessins visibles ; ajout ZIP/XML aux 15 feuilles V99 conservées.', baseline: BASELINE, workbookInventory: inventory, absentOriginals: historical.absentOriginals, facts, delivery: { status: all52BodyStudiesProven ? 'VALIDE_CIBLE_BODY' : all52BodyStudiesAdmitted ? 'BODY_ADMIS_PREUVE_A_VALIDER' : 'LIVRE_PARTIEL', all52BodyStudiesAdmitted, all52GesturesDelivered: all52BodyStudiesAdmitted, all52BodyStudiesProven, gestureDeliveryScope: 'Études BODY natives admises dans les deux sens uniquement ; ne signifie pas personnages ou mécaniques complets.', browser: all52BodyStudiesProven ? 'PASS_CIBLE_BODY' : 'A_VALIDER', characters: 'OUVERT', mechanics: 'NON_CERTIFIE_CLASSEUR', entities: 'OUVERT', variants: 'OUVERT', scope: 'Catalogue de 52 cellules, complétude art calculée et raccords existants seulement ; preuves, mécaniques, personnages, entités et variantes ont des états séparés.' }, workstreams: registry.workstreams, animations, orientations, assets: assetRows, contacts, planets: historical.planets, structures: historical.structures, pitOpen: historical.pitOpen.map(item => ({ ...item, provenance: 'Dossier historique V63 encore ouvert ; aucune clôture V100' })), validations: registry.validations, inputs, limits: registry.limits };
}

const column = (key, label, width = 24) => ({ key, label, width });
const joined = value => Array.isArray(value) ? value.join('\n') : value;
export function buildSheetsV100(snapshot) {
  const metric = (label, value, scope, formula) => ({ label, value: formula ? { formula, cached: value } : value, scope });
  const counts = ['EN_COURS', 'A_VALIDER', 'OUVERT', 'LIVRE_PARTIEL', 'VALIDE_CIBLE'];
  const summary = [metric('Gestes source prévus', 52, '26 par personnage ;18 gestes et8 présentations.', "COUNTA('AnimationsV100'!B5:B56)"), metric('Orientations demandées', 104, 'Chaque geste garde deux orientations natives distinctes.', "COUNTA('OrientationsV100'!B5:B108)"), metric('Gestes admis dans les deux sens', snapshot.facts.admittedActions, 'Admission art seulement, pas personnage complet.', 'COUNTIF(\'AnimationsV100\'!G5:G56,"ADMIS_DEUX_SENS")'), metric('Orientations admises', snapshot.facts.admittedOrientations, 'Aucun miroir ne remplace une orientation absente.', 'COUNTIF(\'OrientationsV100\'!E5:E108,"ADMIS_ETUDE")'), metric('Frames référencées', snapshot.facts.timelineFrames, 'Inclut les tenues répétées ; voir dessins réellement distincts.'), metric('Dessins distincts par orientation', snapshot.facts.distinctDrawingsByOrientation, 'Pixels visibles SHA natifs, sans agrandir ni interpoler ; ne pas confondre avec frames.'), metric('Nouveaux gestes raccordés visuellement au duel', snapshot.facts.newCombatActions, 'Phases existantes du runtime ; cible Excel non imposée.', 'COUNTIF(\'AnimationsV100\'!L5:L56,"RACCORDE_VISUEL")'), metric('Gestes historiques conservés au duel', snapshot.facts.historicalCombatActions, 'P10 Feral V59 garde sa portée historique.', 'COUNTIF(\'AnimationsV100\'!L5:L56,"HISTORIQUE_LIE")'), metric('Études admises sans raccord duel', snapshot.facts.studyOnlyActions, 'Étude visuelle : aucun état de combat inventé.', 'COUNTIF(\'AnimationsV100\'!L5:L56,"ETUDE_SEULE")'), metric('Gestes encore sans admission complète', snapshot.facts.missingActions, 'Manques calculés ; zéro quand les 52 études BODY sont admises dans les deux sens.'), metric('Études BODY admises pour les 52 gestes', snapshot.delivery.all52BodyStudiesAdmitted ? 'OUI' : 'NON', snapshot.delivery.gestureDeliveryScope), metric('Preuve navigateur des études BODY', snapshot.delivery.browser, 'Lecteur, vrai duel et costumes à prouver après gel.'), metric('Habitants urbains abordables existants', snapshot.facts.homeworldContacts, '16 habitants conservés ; pas16 nouveaux personnages.', `COUNTA('ContactsV100'!A5:A${snapshot.contacts.length + 4})`), metric('Escortes aptes par patient', snapshot.facts.evacuationEscortsPerPatient, 'Adaptation logistique libre, pas valeur source canonique.'), metric('Coût local évacuation S', snapshot.facts.evacuationSupplyCost, 'Débit à la résolution, après réservation des personnes.'), metric('Planètes runtime', snapshot.facts.planets, '30 cartes du projet,16 classiques et14 exotiques ; canon 1:1 non déduit.', `COUNTA('PlanetesV100'!A5:A${snapshot.planets.length + 4})`), metric('Ouvrages encore ouverts', snapshot.facts.openStructures, '18 ouvrages source,12 acceptés en contexte libre.', `COUNTIF('OuvragesV100'!F5:F${snapshot.structures.length + 4},"OUVERT")`), metric('Dossiers Pit historiques encore ouverts', snapshot.pitOpen.length, 'Aucune clôture de ces six dossiers V63.', `COUNTA('PitOuvertV100'!A5:A${snapshot.pitOpen.length + 4})`), ...counts.map(status => metric(`Chantiers ${status}`, snapshot.workstreams.filter(item => item.status === status).length, 'Validation limitée au périmètre explicite du registre.', `COUNTIF('ChantiersV100'!F5:F${snapshot.workstreams.length + 4},"${status}")`)), metric('Feuilles historiques V99 conservées', 15, snapshot.baseline.path), metric('Application Excel native vérifiée', 'NON', 'ZIP/XML, formules et caches vérifiés ; aucun moteur Excel exécuté.')];
  const sheets = [
    { name: 'SyntheseV100', title: 'YAUTJA · suivi actif V100', subtitle: `Arrêté au ${snapshot.asOf} · sources, art, étude, combat, preuves et reste séparés`, columns: [column('label', 'Indicateur', 50), column('value', 'Valeur', 24), column('scope', 'Portée / limite', 110)], rows: summary },
    { name: 'ChantiersV100', title: 'Chantiers V100 · livraison et preuves ciblées', subtitle: 'Les validations de développement ne deviennent pas des preuves production ; lire chaque reste.', columns: [column('id','ID',30),column('domain','Domaine'),column('title','Chantier',45),column('source','Source / cellules',65),column('implementation','Implémentation',70),column('status','Statut',24),column('runtime','Périmètre',95),column('tests','Tests déclarés',48),column('browser','Navigateur',48),column('proof','Preuves / références',78),column('remaining','Reste ouvert',110),column('owner','Responsable')], rows: snapshot.workstreams.map(item => Object.fromEntries(Object.entries(item).map(([key, value]) => [key, joined(value)]))) },
    { name: 'AnimationsV100', title: '52 gestes source · Feral et Scar', subtitle: '26 cellules exactes par personnage ; admission BODY native ≠ mécanique du classeur achevée.', columns: [column('fighterId','Personnage'),column('actionId','Geste source',30),column('key','Commande source',18),column('label','Libellé',40),column('sheet','Feuille source',25),column('cell','Cellule',15),column('artStatus','Admission art',25),column('rightFrames','Frames droite',18),column('leftFrames','Frames gauche',18),column('rightDrawings','Dessins distincts droite',25),column('leftDrawings','Dessins distincts gauche',25),column('combatStatus','Étude / combat',26),column('combatClipIds','Phases runtime raccordées',75),column('browserStatus','Preuve finale',24),column('atlasId','Atlas natif',38),column('sourceSha256','SHA classeur V54',70),column('extractionSha256','SHA extraction V56',70),column('proposedTicksText','Timings proposés Excel',30),column('reviewScope','Portée admission',65),column('sourceText','Texte source exact',110),column('remaining','Reste / limite',110)], rows: snapshot.animations.map(item => ({ ...item, combatClipIds: item.combatClipIds.join('\n'), proposedTicksText: item.proposedTicks ? Object.values(item.proposedTicks).join(' / ') : 'Présentation : durées source proposées' })) },
    { name: 'OrientationsV100', title: '104 orientations natives · frames et pixels distincts', subtitle: 'Une tenue répétée ne crée pas un dessin inédit ; les pages et leurs empreintes restent explicites.', columns: [column('fighterId','Personnage'),column('actionId','Geste source',30),column('cell','Cellule',14),column('facing','Orientation',18),column('status','État art',24),column('timelineFrames','Frames référencées',23),column('distinctDrawings','Dessins distincts',22),column('nativeClipIds','Clips natifs',70),column('pagesText','Pages et SHA-256',100),column('framesText','Clips, rectangles, pivots, durées et pixels SHA',120)], rows: snapshot.orientations.map(item => ({ ...item, nativeClipIds: item.nativeClipIds.join('\n'), pagesText: item.sourcePages.map(page => `${page.src} · ${page.sha256}`).join('\n'), framesText: item.frames.map(frame => `${frame.clipId}[${frame.frameIndex}] · ${frame.src} · rect ${frame.rect.join(',')} · pivot ${frame.pivot.join(',')} · ${frame.ticks60} ticks60 · ${frame.pixelSha256}`).join('\n') })) },
    { name: 'ContactsV100', title: 'Homeworld · habitants déjà présents devenus abordables', subtitle: 'Distance, niveau, visibilité et sol sont recontrôlés à l’interaction ; aucune nouvelle identité créée.', columns: [column('id','ID habitant',40),column('name','Nom',38),column('role','Travail',25),column('levelId','Étage',15),column('districtId','Quartier',20),column('radius','Rayon strict',18),column('scope','Portée / preuve',110)], rows: snapshot.contacts },
    { name: 'PlanetesV100', title: '30 planètes · export courant conservant la provenance', subtitle: 'Cartes originales du projet ; continents physiques et régions administratives restent distincts.', columns: [column('id','ID'),column('name','Planète'),column('style','Famille',18),column('biome','Biome'),column('surface','Surface non jouable',32),column('continents','Continents',18),column('regions','Régions',16),column('territories','Territoires',18),column('connected','Routes connectées',23),column('provenance','Provenance',100)], rows: snapshot.planets },
    { name: 'OuvragesV100', title: 'Ouvrages V6 · six dossiers toujours ouverts', subtitle: 'L’évacuation V100 ne clôt ni montures, ni quai, ni escale, ni les autres prérequis matériels.', columns: [column('id','ID source'),column('name','Ouvrage',35),column('sheet','Feuille',30),column('row','Ligne',14),column('cells','Cellules source',70),column('status','État runtime',24),column('kind','Adaptateur'),column('remaining','Reste / périmètre',110),column('sourceSha256','SHA source V6',70)], rows: snapshot.structures.map(item => ({ ...item, cells: item.cells.join(', ') })) },
    { name: 'PitOuvertV100', title: 'Six dossiers Pit historiques encore ouverts', subtitle: 'Les animations Feral/Scar ne ferment aucun de ces dossiers V63 ; cellules historiques conservées.', columns: [column('workbookId','ID source',35),column('name','Dossier',40),column('sourceCells','Cellules source',55),column('missingSheetCells','Feuille des manques',48),column('status','État historique',35),column('note','Reste ouvert',110),column('sourceSha256','SHA source V54',70)], rows: snapshot.pitOpen },
    { name: 'SourcesV100', title: 'Sources historiques et assets natifs admis', subtitle: 'Les originaux privés sont signalés absents ; aucune image ou classeur privé n’est reconstitué.', columns: [column('path','Fichier / extraction',85),column('status','Disponibilité',28),column('sha256','SHA-256',70),column('scope','Portée',110)], rows: [...snapshot.workbookInventory.map(item => ({ path: item.path, status: 'PRESENT_CONSERVE', sha256: item.sha256, scope: `${item.sheets.length} feuilles conservées` })), ...snapshot.absentOriginals.map(item => ({ path: item.extractions.join('\n'), status: 'ORIGINAL_MANQUANT', sha256: item.sha256, scope: item.scope })), ...snapshot.assets.map(item => ({ ...item, status: 'PNG_ADMIS_VERIFIE', scope: `${item.width}×${item.height} pixels ; SHA de l’admission explicite` }))] },
    { name: 'ValidationsV100', title: 'Validations déclarées · portée et limites', subtitle: 'Les preuves citées sous outputs restent des références ; aucun PASS déduit d’un nom de fichier.', columns: [column('id','Validation',35),column('status','État',24),column('scope','Portée',105),column('command','Commande / procédure',100),column('evidence','Preuves / références',95),column('limit','Limite',120)], rows: snapshot.validations.map(item => ({ ...item, evidence: item.evidence.join('\n') })) },
    { name: 'EntreesV100', title: 'Manifeste exhaustif des entrées lues', subtitle: 'SHA-256 des imports runtime, registres, scripts, historiques et PNG utilisés ; requis par le checkout CI partiel.', columns: [column('path','Fichier',105),column('sha256','SHA-256',75)], rows: snapshot.inputs },
    { name: 'JournalV100', title: 'Méthode et travail restant', subtitle: 'Les15 feuilles précédentes demeurent historiques ; cette synthèse V100 est l’onglet actif.', columns: [column('subject','Sujet',42),column('detail','Décision / limite',140)], rows: [{ subject:'Méthode', detail:snapshot.method },{ subject:'Registre éditable', detail:REGISTRY },{ subject:'Régénération', detail:'node scripts/build-excel-followup-v100.mjs' },{ subject:'Vérification CI', detail:'node scripts/build-excel-followup-v100.mjs --check' },{ subject:'Base historique', detail:`${BASELINE.path} · SHA-256 ${BASELINE.sha256}` },...snapshot.limits.map((detail, index) => ({ subject:`Limite ${index + 1}`, detail }))] },
  ];
  return sheets;
}

export async function generateFollowupV100({ outputDir = path.join(ROOT, 'docs'), check = false } = {}) {
  const snapshot = await collectFollowupV100(), sheets = buildSheetsV100(snapshot);
  const workbook = await python({ root: ROOT, baseline: snapshot.baseline, sheets });
  const structural = JSON.parse(await python({ root: ROOT, baseline: snapshot.baseline, workbook }, '--verify'));
  const qa = { schemaVersion: 1, release: 'V100', result: 'PASS_STRUCTURE', scope: 'Génération et contrôles structurels réels ZIP/XML, préservation historique, cellules/formules/caches et intégrité des admissions ; ne déclare aucun test modèle ou navigateur exécuté par ce générateur.', workbook: 'docs/YAUTJA_V100_SUIVI.xlsx', sha256: sha(workbook), bytes: workbook.length, inputFingerprintsVerified: snapshot.inputs.length, assetsVerified: snapshot.assets.length, facts: snapshot.facts, delivery: snapshot.delivery, ...structural, nativeExcelApplicationVerified: false, nativeExcelCalculationEngineExecuted: false };
  const products = [Buffer.from(JSON.stringify(snapshot, null, 2) + '\n'), workbook, Buffer.from(JSON.stringify(qa, null, 2) + '\n')];
  if (!check) await fs.mkdir(outputDir, { recursive: true });
  for (const [index, name] of OUTPUTS.entries()) {
    const target = path.join(outputDir, name);
    if (check) { const current = await fs.readFile(target); if (!current.equals(products[index])) throw new Error(`Suivi V100 périmé : ${name}. Relancer node scripts/build-excel-followup-v100.mjs.`); }
    else await fs.writeFile(target, products[index]);
  }
  return { snapshot, qa, workbookSha256: sha(workbook), bytes: workbook.length, outputDir };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const args = process.argv.slice(2), index = args.indexOf('--output-dir');
  assert.ok(args.every((arg, at) => ['--check', '--output-dir'].includes(arg) || index >= 0 && at === index + 1) && (index < 0 || args[index + 1]), 'Usage : node scripts/build-excel-followup-v100.mjs [--check] [--output-dir chemin]');
  const result = await generateFollowupV100({ check: args.includes('--check'), ...(index >= 0 ? { outputDir: path.resolve(args[index + 1]) } : {}) });
  console.log(JSON.stringify({ result: 'PASS_STRUCTURE', mode: args.includes('--check') ? 'check' : 'generate', bytes: result.bytes, sha256: result.workbookSha256, inputs: result.snapshot.inputs.length, facts: result.snapshot.facts, delivery: result.snapshot.delivery }));
}
