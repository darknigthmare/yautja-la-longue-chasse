import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {homeworldSceneSsrV78} from './helpers/homeworld-scene-ssr-v78.mjs';

// V164 adapté en V167 : la porte isolée (actTantalusV164, evaluateTantalusGateV164,
// tantalusGateFromSaveV164) est supprimée ; départ, voyage et retour passent par
// la base Warp (warpEpochsV165). Les dossiers `tantalusV164` restent lisibles.
const qa = homeworldSceneSsrV78();
const t = qa.load('app/game/systems/tantalusV164.ts');
const warp = qa.load('app/game/systems/warpEpochsV165.ts');
const saves = qa.load('app/game/save.ts');
const owner = '2026-11-20T10:00:00.000Z';
const full = {blooded: true, personalShip: true, adjutant: true};
const ok = u => { assert.equal(u.accepted, true, u.message); return u.state; };

function ready() {
  let s = warp.createWarpEpochsV165(owner);
  s = ok(warp.startWarpCommonQuestV165(s, full, 'stabilite'));
  for (const c of warp.WARP_COMPONENTS_V165) s = ok(warp.verifyWarpComponentV165(s, c.id, 'reparer'));
  s = ok(warp.installWarpModuleV165(s, 'marge'));
  return ok(warp.selectWarpBranchV165(s, t.TANTALUS_BRANCH_ID_V164));
}
/** Ancien dossier V164 (forme exacte de la PR #163). */
const legacyLedger = (extra = {}) => ({version: 1, ownerSaveCreatedAt: owner, activeTrip: {tripId: 'd1', branchId: 'warp-tantalus-2204', returnReservation: 'reservee'},
  echo8: null, completedTripIds: [], consumedEventIds: ['d1'], ...extra});

test('refus sans conditions Warp (conditions de warpConditionsV165)', () => {
  const empty = warp.createWarpEpochsV165(owner);
  const ids = warp.evaluateWarpDepartureV165({...empty, warpBranchId: t.TANTALUS_BRANCH_ID_V164}, {blooded: false, personalShip: false, adjutant: false}).missing.map(m => m.id);
  for (const id of ['blooded', 'ship', 'adjutant', 'quest', 'module']) assert(ids.includes(id), id);
  assert.equal(warp.evaluateWarpDepartureV165(ready(), {...full, adjutant: false}).allowed, false);
  // Pas de choix Echo-8 sans voyage engagé vers 2204.
  assert.equal(t.chooseTantalusEcho8V167(ready(), 'marque').accepted, false);
  // La porte isolée n'existe plus.
  for (const name of ['actTantalusV164', 'evaluateTantalusGateV164', 'tantalusGateFromSaveV164']) assert.equal(t[name], undefined, name);
});

test('arrivée en 2204 avec branche, voyage et retour réservé', () => {
  const s = ok(warp.departWarpV165(ready(), full));
  assert.equal(s.activeTripBranchId, 'warp-tantalus-2204'); assert.equal(s.warpReturnReservation, 'reservee');
  const view = t.tantalusViewV167(s);
  assert.equal(view.inBranch, true); assert.equal(view.activeWarpTripId, 'warp-trip-1'); assert.equal(view.visits, 1);
  assert.equal(warp.departWarpV165(s, full).accepted, false, 'pas de second départ concurrent');
});

test('choix Echo-8 enregistré une seule fois, conservé après retour et revisite (STATE5-30)', () => {
  const s = ok(warp.departWarpV165(ready(), full));
  const chosen = t.chooseTantalusEcho8V167(s, 'emporte');
  assert(chosen.accepted && chosen.changed);
  assert.deepEqual(warp.branchVisitV165(chosen.state, 'warp-tantalus-2204').echo8, {choice: 'emporte', tripId: 'warp-trip-1'});
  const second = t.chooseTantalusEcho8V167(chosen.state, 'marque');
  assert.equal(second.changed, false); assert.equal(warp.branchVisitV165(second.state, 'warp-tantalus-2204').echo8.choice, 'emporte');
  const back = ok(warp.returnFromWarpV165(chosen.state));
  const again = ok(warp.departWarpV165(back, full));
  assert.equal(t.tantalusViewV167(again).echo8, 'emporte');
  assert.equal(t.chooseTantalusEcho8V167(again, 'marque').accepted, false);
});

test('retour respecté même après perte des conditions de départ (WARP-R01, STATE5-29)', () => {
  const s = ok(warp.departWarpV165(ready(), full));
  assert.equal(warp.canReturnFromWarpV165(s), true);
  const back = ok(warp.returnFromWarpV165(s));
  assert.equal(back.warpReturnReservation, 'utilisee');
  assert.equal(warp.returnFromWarpV165(back).accepted, false, 'un retour ne se consomme pas deux fois');
  assert.equal(warp.departWarpV165(back, {...full, personalShip: false}).accepted, false, 'les prochains départs restent soumis aux conditions');
});

test('sauvegarde aller-retour : ancien dossier tantalusV164 et état Warp conservés', () => {
  const ledger = legacyLedger({echo8: {choice: 'marque', eventId: 'e1', tripId: 'd1'}, consumedEventIds: ['d1', 'e1']});
  const save = {...saves.defaultSave(owner), tantalusV164: ledger};
  const imported = saves.parseSaveImport(saves.exportSave(save));
  assert(imported.save, imported.failure); assert.deepEqual(imported.save.tantalusV164, ledger);
  const s = t.chooseTantalusEcho8V167(ok(warp.departWarpV165(ready(), full)), 'marque').state;
  const round = saves.parseSaveImport(saves.exportSave({...saves.defaultSave(owner), warpEpochsV165: s}));
  assert(round.save, round.failure); assert.deepEqual(round.save.warpEpochsV165, s);
});

test('anciennes sauvegardes intactes ; version future et dossier étranger refusés', () => {
  const old = saves.defaultSave(owner);
  const r = saves.parseSaveImport(JSON.stringify(old)); assert(r.save, r.failure);
  assert.equal(Object.hasOwn(r.save, 'tantalusV164'), false);
  assert.equal(saves.parseSaveImport(JSON.stringify({...old, tantalusV164: null})).save.tantalusV164, null);
  const ledger = legacyLedger();
  assert.equal(saves.parseSaveImport(JSON.stringify({...old, tantalusV164: {...ledger, version: 2}})).failure, 'future-version');
  assert.equal(saves.parseSaveImport(JSON.stringify({...old, tantalusV164: {...ledger, ownerSaveCreatedAt: '2026-01-01T00:00:00.000Z'}})).failure, 'invalid-save');
  assert.equal(saves.parseSaveImport(JSON.stringify({...old, tantalusV164: {...ledger, echo8: {choice: 'trophee', eventId: 'x', tripId: 'd1'}}})).failure, 'invalid-save');
  // Un Echo-8 hors de la branche 2204 est refusé dans l'état Warp.
  const s = ok(warp.departWarpV165(ready(), full));
  const forged = JSON.parse(JSON.stringify(s)); forged.branchVisitState['W-02'] = {...warp.emptyBranchVisitV165(), echo8: {choice: 'marque', tripId: 'x'}};
  assert.equal(warp.inspectWarpEpochsV165(forged, owner).status, 'invalid-save');
});

test('rendu SSR de la section : choix Echo-8 puis état conservé', () => {
  const closed = qa.render('app/game/TantalusPanelV164.tsx', {state: ready(), onApply: () => true});
  assert.match(closed, /Branche Warp · Tantalus 2204/); assert.match(closed, /non implémenté/);
  assert.doesNotMatch(closed, /data-echo8-choice=/);
  const arrived = ok(warp.departWarpV165(ready(), full));
  const html = qa.render('app/game/TantalusPanelV164.tsx', {state: arrived, onApply: () => true});
  assert.match(html, /Asphodèle, 2204/); assert.match(html, /data-echo8-choice="emporte"/); assert.match(html, /data-echo8-choice="marque"/);
  const after = qa.render('app/game/TantalusPanelV164.tsx', {state: t.chooseTantalusEcho8V167(arrived, 'marque').state, onApply: () => true});
  assert.match(after, /data-echo8-recorded="marque"/); assert.doesNotMatch(after, /data-echo8-choice=/);
});

test('intégration : section dans le panneau Warp, plus de porte isolée sur la carte', () => {
  const src = fs.readFileSync('app/game/GameClient.tsx', 'utf8');
  assert.doesNotMatch(src, /TantalusPanelV164/);
  assert.doesNotMatch(src, /actTantalusV164|tantalusGateFromSaveV164/);
  assert.match(src, /tantalusV164: update\.tantalusV164/);
  assert.match(src, /clearLegacyTantalus \? \{ warpEpochsV165: state, tantalusV164: null \} : \{ warpEpochsV165: state \}/);
  const panel = fs.readFileSync('app/game/WarpEpochsPanelV165.tsx', 'utf8');
  assert.match(panel, /<TantalusPanelV164 state=\{state\} onApply=\{apply\}/);
});
