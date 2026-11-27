import test from 'node:test';
import assert from 'node:assert/strict';
import {homeworldSceneSsrV78} from './helpers/homeworld-scene-ssr-v78.mjs';

// V167 : Tantalus 2204 raccordé au Warp (exception écrite dans la bible le
// 20 novembre 2026). Modules réels, aucun mock de logique de jeu.
const qa = homeworldSceneSsrV78();
const t = qa.load('app/game/systems/tantalusV164.ts');
const warp = qa.load('app/game/systems/warpEpochsV165.ts');
const saves = qa.load('app/game/save.ts');
const chron = qa.load('app/game/systems/clanChronicle.ts');
const owner = '2026-11-20T10:00:00.000Z';
const T = 'warp-tantalus-2204';
const ok = u => { assert.equal(u.accepted, true, u.message); return u.state; };

/** Chronique Blooded + Adjutant par les reçus réels (même méthode que la PR #163). */
function readySave() {
  const evidence = chron.CHRONICLE_EVIDENCE.filter(e => !['elder-time-passage', 'ancient-time-passage'].includes(e.id)).map(e => ({id: e.id, sourceId: e.sourceId}));
  const rites = chron.CHRONICLE_RITES.filter(r => ['nursery-recognition', 'unguided-hunt-recognition', 'blooding-mark', 'adjutant-appointment'].includes(r.id))
    .map(r => ({id: r.id, sourceId: r.sourceId}));
  const chronicle = chron.normalizeClanChronicle({version: 1, evidence, rites, legacyRecognition: null});
  const save = saves.defaultSave(owner);
  return {...save, prologue: {...save.prologue, chronicle}};
}
function questDone(ctx) {
  let s = warp.createWarpEpochsV165(owner);
  s = ok(warp.startWarpCommonQuestV165(s, ctx, 'energie'));
  for (const c of warp.WARP_COMPONENTS_V165) s = ok(warp.verifyWarpComponentV165(s, c.id, 'variante'));
  return ok(warp.installWarpModuleV165(s, 'fenetre-courte'));
}

test('2204 est une branche du Warp, jouable, distincte de W-02', () => {
  const branch = warp.WARP_BRANCHES_V165.find(b => b.id === T);
  assert.equal(branch.year, 2204); assert.equal(branch.status, 'jouable');
  assert(warp.WARP_BRANCH_IDS_V165.includes(T));
  assert.equal(t.TANTALUS_BRANCH_ID_V164, T, 'identifiant repris de #163');
  assert.match(branch.canonFrame, /absente du classeur V6/);
});

test('bout en bout : conditions Warp réunies depuis la sauvegarde → départ 2204 → Echo-8 → retour', () => {
  const save = readySave();
  const ctx = warp.warpAccessContextFromSaveV165(save, {personalShipAvailable: true});
  assert.deepEqual(ctx, {blooded: true, personalShip: true, adjutant: true});
  let s = warp.createWarpEpochsV165(owner);
  assert.equal(warp.departWarpV165({...s, warpBranchId: T}, ctx).accepted, false, 'sans quête ni module');
  s = ok(warp.selectWarpBranchV165(questDone(ctx), T));
  assert.deepEqual(warp.warpConditionsV165(s, ctx), []);
  s = ok(warp.departWarpV165(s, ctx));
  assert.equal(s.activeTripBranchId, T); assert.equal(s.warpReturnReservation, 'reservee');
  s = ok(t.chooseTantalusEcho8V167(s, 'emporte'));
  // Écriture réelle : export puis import (sauvegarde de base ; la chronique
  // fabriquée pour le test n'est pas une campagne exportable complète).
  const mid = saves.parseSaveImport(saves.exportSave({...saves.defaultSave(owner), warpEpochsV165: s}));
  assert(mid.save, mid.failure);
  s = mid.save.warpEpochsV165;
  // Perte d'Adjutant après le départ : le retour réservé reste valable.
  assert.equal(warp.canReturnFromWarpV165(s), true);
  s = ok(warp.returnFromWarpV165(s));
  assert.equal(s.activeWarpTripId, null); assert.equal(s.warpReturnReservation, 'utilisee');
  const visit = warp.branchVisitV165(s, T);
  assert.equal(visit.visits, 1); assert.deepEqual(visit.echo8, {choice: 'emporte', tripId: 'warp-trip-1'});
  assert.equal(warp.branchVisitV165(s, 'W-02').visits, 0, 'W-02 non touchée');
  // SSR du panneau Warp complet : section 2204 présente, sort conservé.
  const html = qa.render('app/game/WarpEpochsPanelV165.tsx', {save: {...save, warpEpochsV165: s}, onPersist: () => true, onClose: () => {}});
  assert.match(html, /data-warp-branch-card="warp-tantalus-2204" data-status="jouable"/);
  assert.match(html, /data-tantalus-v164/); assert.match(html, /data-echo8-recorded="emporte"/);
});

test('refus croisé : un voyage W-02 engagé bloque 2204, et inversement', () => {
  const ctx = {blooded: true, personalShip: true, adjutant: true};
  const inW02 = ok(warp.departWarpV165(ok(warp.selectWarpBranchV165(questDone(ctx), 'W-02')), ctx));
  assert.equal(warp.selectWarpBranchV165(inW02, T).accepted, false);
  const forced = {...inW02, warpBranchId: T};
  assert.equal(warp.departWarpV165(forced, ctx).accepted, false);
  assert(warp.evaluateWarpDepartureV165(forced, ctx).missing.some(m => m.id === 'trip-active'));
  assert.equal(t.chooseTantalusEcho8V167(inW02, 'marque').accepted, false, 'Echo-8 hors branche 2204');
  assert.equal(t.tantalusViewV167(inW02).otherTripBranchId, 'W-02');
  const in2204 = ok(warp.departWarpV165(ok(warp.selectWarpBranchV165(questDone(ctx), T)), ctx));
  assert.equal(warp.resolveW02StepV165(in2204, 'WARP-M16', 'contourner').accepted, false);
  assert.equal(warp.canLaunchW02HuntV165(in2204).allowed, false);
  assert.equal(warp.departWarpV165({...in2204, warpBranchId: 'W-02'}, ctx).accepted, false);
  // Un ancien voyage 2204 engagé n'est pas repris pendant un voyage W-02 (règle proposée).
  const legacy = {version: 1, ownerSaveCreatedAt: owner, activeTrip: {tripId: 'd1', branchId: T, returnReservation: 'reservee'}, echo8: null, completedTripIds: [], consumedEventIds: ['d1']};
  const merge = t.mergeLegacyTantalusV167(inW02, legacy, owner);
  assert.equal(merge.pendingLegacy, true); assert.equal(merge.importedLegacy, false); assert.equal(merge.state.activeTripBranchId, 'W-02');
  const after = t.mergeLegacyTantalusV167(ok(warp.returnFromWarpV165(inW02)), legacy, owner);
  assert.equal(after.importedLegacy, true); assert.equal(after.state.activeWarpTripId, 'd1');
});

test('ancienne sauvegarde tantalusV164 relue : voyage engagé, Echo-8 et retour', () => {
  const legacy = {version: 1, ownerSaveCreatedAt: owner, activeTrip: {tripId: 'd2', branchId: T, returnReservation: 'reservee'},
    echo8: {choice: 'marque', eventId: 'e1', tripId: 'd1'}, completedTripIds: ['d1'], consumedEventIds: ['d1', 'e1', 'r1', 'd2']};
  const save = {...saves.defaultSave(owner), tantalusV164: legacy};
  const loaded = saves.parseSaveImport(JSON.stringify(save));
  assert(loaded.save, loaded.failure); assert.deepEqual(loaded.save.tantalusV164, legacy);
  const merge = t.mergeLegacyTantalusV167(loaded.save.warpEpochsV165, loaded.save.tantalusV164, owner);
  assert.equal(merge.importedLegacy, true);
  let s = merge.state;
  assert.equal(s.activeWarpTripId, 'd2'); assert.equal(s.activeTripBranchId, T); assert.equal(s.warpReturnReservation, 'reservee');
  assert.deepEqual(warp.branchVisitV165(s, T).echo8, {choice: 'marque', tripId: 'd1'});
  assert.equal(warp.branchVisitV165(s, T).visits, 2);
  // Retour honoré sans module installé (STATE5-29) ; Echo-8 non rechoisi.
  assert.equal(s.warpModuleInstalled, false);
  assert.equal(t.chooseTantalusEcho8V167(s, 'emporte').accepted, false);
  s = ok(warp.returnFromWarpV165(s));
  assert.equal(warp.departWarpV165({...s, warpBranchId: T}, {blooded: true, personalShip: true, adjutant: true}).accepted, false, 'nouveau départ : module requis');
  // Écriture : état Warp + effacement de l'ancien dossier, relu sans perte.
  const written = saves.parseSaveImport(saves.exportSave({...loaded.save, warpEpochsV165: s, tantalusV164: null}));
  assert(written.save, written.failure);
  assert.equal(written.save.tantalusV164, null);
  assert.deepEqual(t.mergeLegacyTantalusV167(written.save.warpEpochsV165, written.save.tantalusV164, owner).state, s);
  // Panneau : l'ancien voyage apparaît engagé dans 2204 avant toute écriture.
  const html = qa.render('app/game/WarpEpochsPanelV165.tsx', {save: loaded.save, onPersist: () => true, onClose: () => {}});
  assert.match(html, /data-warp-trip="d2"/); assert.match(html, /data-tantalus-in-branch="true"/);
  // Dossier illisible : aucune fusion.
  assert.equal(t.mergeLegacyTantalusV167(null, {...legacy, version: 2}, owner).importedLegacy, false);
});

test('une partie Elder antérieure à V166 conserve son honneur et le retour Tantalus sans gagner Adjutant', () => {
  const tripId = 'tantalus-before-v166';
  const legacy = {
    ...t.createTantalusLedgerV164(owner),
    activeTrip: {tripId, branchId: T, returnReservation: 'reservee'},
    consumedEventIds: [tripId],
  };
  // L'enveloppe vient de l'export portable. Son payload représente une
  // ancienne partie, car un export actuel normaliserait déjà le rang acquis.
  const portable = JSON.parse(saves.exportSave(saves.defaultSave(owner)));
  portable.save.profile.rankId = 'elder';
  portable.save.profile.honor = 3_000;
  delete portable.save.profile.acquiredRankIdV166;
  portable.save.tantalusV164 = legacy;

  const loaded = saves.parseSaveImport(JSON.stringify(portable));
  assert(loaded.save, loaded.failure);
  assert.equal(loaded.save.profile.honor, 3_000);
  assert.equal(loaded.save.profile.rankId, 'elder');
  assert.equal(loaded.save.profile.acquiredRankIdV166, 'elder');
  assert.deepEqual(loaded.save.tantalusV164, legacy);

  const ctx = warp.warpAccessContextFromSaveV165(loaded.save, {personalShipAvailable: true});
  assert.equal(ctx.adjutant, false, 'l’honneur ne produit pas de reçu de nomination');
  assert(warp.warpConditionsV165(loaded.save.warpEpochsV165 ?? null, ctx).some(condition => condition.id === 'adjutant'));

  const merged = t.mergeLegacyTantalusV167(loaded.save.warpEpochsV165, loaded.save.tantalusV164, owner);
  assert.equal(merged.importedLegacy, true);
  assert(merged.state);
  const checkpoint = saves.parseSaveImport(saves.exportSave({
    ...loaded.save,
    warpEpochsV165: merged.state,
    tantalusV164: null,
  }));
  assert(checkpoint.save, checkpoint.failure);
  assert.equal(checkpoint.save.tantalusV164, null);
  assert.equal(checkpoint.save.profile.honor, 3_000);
  assert.equal(checkpoint.save.profile.rankId, 'elder');
  assert.equal(checkpoint.save.profile.acquiredRankIdV166, 'elder');
  const resumed = checkpoint.save.warpEpochsV165;
  assert.equal(resumed.activeWarpTripId, tripId);
  assert.equal(resumed.activeTripBranchId, T);
  assert.equal(resumed.warpReturnReservation, 'reservee');
  assert.equal(warp.canReturnFromWarpV165(resumed), true);
  const returned = ok(warp.returnFromWarpV165(resumed));
  assert.equal(returned.activeWarpTripId, null);
  assert.equal(returned.warpReturnReservation, 'utilisee');
});
