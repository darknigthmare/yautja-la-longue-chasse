import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {homeworldSceneSsrV78} from './helpers/homeworld-scene-ssr-v78.mjs';

const qa = homeworldSceneSsrV78();
const t = qa.load('app/game/systems/tantalusV164.ts');
const chron = qa.load('app/game/systems/clanChronicle.ts');
const saves = qa.load('app/game/save.ts');
const owner = '2026-11-20T10:00:00.000Z';

/** Chronique Blooded + Adjutant + quête du module, obtenue par les reçus réels. */
function warpReadyChronicle() {
  const all = chron.CHRONICLE_EVIDENCE.filter(e => !['elder-time-passage', 'ancient-time-passage'].includes(e.id));
  const evidence = all.map(e => ({id: e.id, sourceId: e.sourceId}));
  const rites = chron.CHRONICLE_RITES.filter(r => ['nursery-recognition', 'unguided-hunt-recognition', 'blooding-mark', 'adjutant-appointment'].includes(r.id))
    .map(r => ({id: r.id, sourceId: r.sourceId}));
  const c = chron.normalizeClanChronicle({version: 1, evidence, rites, legacyRecognition: null});
  assert.equal(chron.getChronicleRank(c), 'blooded');
  return c;
}
const ready = () => ({chronicle: warpReadyChronicle(), personalShipAvailable: true, warpModuleInstalled: true});

function play(steps, gate = ready()) {
  let ledger = null; const results = [];
  for (const action of steps) {
    const r = t.actTantalusV164(ledger, owner, action, typeof gate === 'function' ? gate(action) : gate);
    results.push(r); ledger = r.ledger;
  }
  return {ledger, results};
}

test('refus sans conditions Warp, avec chaque condition manquante nommée', () => {
  const empty = t.actTantalusV164(null, owner, {kind: 'depart', eventId: 'd1'}, {chronicle: null, personalShipAvailable: false, warpModuleInstalled: false});
  assert.equal(empty.accepted, false); assert.equal(empty.changed, false);
  const ids = t.evaluateTantalusGateV164({chronicle: null, personalShipAvailable: false, warpModuleInstalled: false}).missing.map(m => m.id);
  for (const id of ['required-rank', 'personal-ship', 'warp-module-quest', 'adjutant', 'warp-installed']) assert(ids.includes(id), id);
  // Toutes les conditions sauf le module installé (STATE5-26) : toujours refusé.
  const noModule = t.actTantalusV164(null, owner, {kind: 'depart', eventId: 'd1'}, {...ready(), warpModuleInstalled: false});
  assert.equal(noModule.accepted, false); assert.match(noModule.message, /Module Warp Universe installé/);
  // STATE5-25 : une quête commune non réussie bloque même si la preuve existe.
  assert.equal(t.evaluateTantalusGateV164({...ready(), warpQuestOutcome: 'echoue'}).allowed, false);
  assert.equal(t.evaluateTantalusGateV164({...ready(), warpQuestOutcome: 'reussi'}).allowed, true);
  assert.equal(t.evaluateTantalusGateV164({...ready(), otherWarpTripActive: true}).allowed, false, 'un voyage d’une autre branche bloque le départ');
  // Pas de choix Echo-8 ni de retour sans voyage engagé.
  assert.equal(t.actTantalusV164(null, owner, {kind: 'echo8', eventId: 'e1', choice: 'marque'}, ready()).accepted, false);
  assert.equal(t.actTantalusV164(null, owner, {kind: 'return', eventId: 'r1'}, ready()).accepted, false);
});

test('la sauvegarde actuelle ne fournit aucun module installé : départ refusé en jeu réel', () => {
  const save = saves.defaultSave(owner);
  const gate = t.tantalusGateFromSaveV164(save);
  assert.equal(gate.warpModuleInstalled, false);
  assert.equal(t.evaluateTantalusGateV164(gate).allowed, false);
});

test('arrivée en 2204 avec branche, voyage et retour réservé', () => {
  const {ledger, results} = play([{kind: 'depart', eventId: 'd1'}]);
  assert(results[0].accepted && results[0].changed); assert.match(results[0].message, /2204/);
  assert.deepEqual(ledger.activeTrip, {tripId: 'd1', branchId: 'warp-tantalus-2204', returnReservation: 'reservee'});
  const view = t.tantalusViewV164(ledger);
  assert.equal(view.warpBranchId, 'warp-tantalus-2204'); assert.equal(view.activeWarpTripId, 'd1'); assert.equal(view.warpReturnReservation, 'reservee');
  assert.equal(t.actTantalusV164(ledger, owner, {kind: 'depart', eventId: 'd2'}, ready()).accepted, false, 'pas de second départ concurrent');
});

test('choix Echo-8 enregistré une seule fois, rejeu idempotent, conservé après retour', () => {
  const {ledger, results} = play([{kind: 'depart', eventId: 'd1'}, {kind: 'echo8', eventId: 'e1', choice: 'emporte'}]);
  assert(results[1].accepted); assert.deepEqual(ledger.echo8, {choice: 'emporte', eventId: 'e1', tripId: 'd1'});
  const replay = t.actTantalusV164(ledger, owner, {kind: 'echo8', eventId: 'e1', choice: 'emporte'}, ready());
  assert.equal(replay.changed, false); assert.deepEqual(replay.ledger, ledger);
  const second = t.actTantalusV164(ledger, owner, {kind: 'echo8', eventId: 'e2', choice: 'marque'}, ready());
  assert.equal(second.accepted, false); assert.equal(second.ledger.echo8.choice, 'emporte');
  const back = t.actTantalusV164(ledger, owner, {kind: 'return', eventId: 'r1'}, ready()).ledger;
  const again = t.actTantalusV164(back, owner, {kind: 'depart', eventId: 'd2'}, ready()).ledger;
  assert.equal(again.echo8.choice, 'emporte', 'STATE5-30 : la revisite poursuit l’état');
  assert.equal(t.actTantalusV164(again, owner, {kind: 'echo8', eventId: 'e3', choice: 'marque'}, ready()).accepted, false);
});

test('retour respecté même après perte des conditions de départ (WARP-R01, STATE5-29)', () => {
  const lost = {chronicle: null, personalShipAvailable: false, warpModuleInstalled: false};
  const {ledger} = play([{kind: 'depart', eventId: 'd1'}]);
  const back = t.actTantalusV164(ledger, owner, {kind: 'return', eventId: 'r1'}, lost);
  assert(back.accepted && back.changed, back.message);
  assert.equal(back.ledger.activeTrip, null); assert.deepEqual(back.ledger.completedTripIds, ['d1']);
  assert.equal(t.tantalusViewV164(back.ledger).warpReturnReservation, 'utilisee');
  const twice = t.actTantalusV164(back.ledger, owner, {kind: 'return', eventId: 'r2'}, lost);
  assert.equal(twice.accepted, false, 'un retour ne se consomme pas deux fois');
  assert.equal(t.actTantalusV164(back.ledger, owner, {kind: 'depart', eventId: 'd2'}, lost).accepted, false, 'les prochains départs restent fermés');
});

test('sauvegarde aller-retour : écriture, chargement et export conservent le dossier', () => {
  const {ledger} = play([{kind: 'depart', eventId: 'd1'}, {kind: 'echo8', eventId: 'e1', choice: 'marque'}]);
  const save = {...saves.defaultSave(owner), tantalusV164: ledger};
  const imported = saves.parseSaveImport(saves.exportSave(save));
  assert(imported.save, imported.failure); assert.deepEqual(imported.save.tantalusV164, ledger);
  assert.deepEqual(saves.normalizeSave(JSON.parse(JSON.stringify(save))).tantalusV164, ledger);
});

test('anciennes sauvegardes intactes ; version future et dossier étranger refusés', () => {
  const old = saves.defaultSave(owner);
  const r = saves.parseSaveImport(JSON.stringify(old)); assert(r.save, r.failure);
  assert.equal(Object.hasOwn(r.save, 'tantalusV164'), false);
  assert.equal(saves.parseSaveImport(JSON.stringify({...old, tantalusV164: null})).save.tantalusV164, null);
  const {ledger} = play([{kind: 'depart', eventId: 'd1'}]);
  assert.equal(saves.parseSaveImport(JSON.stringify({...old, tantalusV164: {...ledger, version: 2}})).failure, 'future-version');
  assert.equal(saves.parseSaveImport(JSON.stringify({...old, tantalusV164: {...ledger, ownerSaveCreatedAt: '2026-01-01T00:00:00.000Z'}})).failure, 'invalid-save');
  assert.equal(saves.parseSaveImport(JSON.stringify({...old, tantalusV164: {...ledger, echo8: {choice: 'trophee', eventId: 'x', tripId: 'd1'}}})).failure, 'invalid-save');
  assert.equal(t.actTantalusV164({...ledger, version: 2}, owner, {kind: 'return', eventId: 'r1'}, ready()).accepted, false);
});

test('rendu SSR : refus listé hors conditions, choix Echo-8 puis état conservé', () => {
  const base = saves.defaultSave(owner);
  const closed = qa.render('app/game/TantalusPanelV164.tsx', {save: base, onCommit: () => ({}), initiallyOpen: true});
  assert.match(closed, /Branche Warp · Tantalus 2204/); assert.match(closed, /Départ refusé/);
  assert.match(closed, /Module Warp Universe installé/); assert.match(closed, /disabled=""/);
  assert.match(closed, /non implémenté/);
  const {ledger} = play([{kind: 'depart', eventId: 'd1'}]);
  const arrived = qa.render('app/game/TantalusPanelV164.tsx', {save: {...base, tantalusV164: ledger}, onCommit: () => ({})});
  assert.match(arrived, /Asphodèle, 2204/); assert.match(arrived, /data-echo8-choice="emporte"/); assert.match(arrived, /data-echo8-choice="marque"/);
  const chosen = t.actTantalusV164(ledger, owner, {kind: 'echo8', eventId: 'e1', choice: 'marque'}, ready()).ledger;
  const after = qa.render('app/game/TantalusPanelV164.tsx', {save: {...base, tantalusV164: chosen}, onCommit: () => ({})});
  assert.match(after, /data-echo8-recorded="marque"/); assert.doesNotMatch(after, /data-echo8-choice=/);
});

test('intégration : panneau monté sur la carte et écriture par la transaction de campagne', () => {
  const src = fs.readFileSync('app/game/GameClient.tsx', 'utf8');
  assert.match(src, /const TantalusPanelV164 = React\.lazy\(\(\) => import\("\.\/TantalusPanelV164"\)\)/);
  assert.match(src, /screen === "map" && \(\s*<Suspense fallback=\{null\}>\s*<TantalusPanelV164/);
  assert.match(src, /persistSocialProgress\(\{ tantalusV164: result\.ledger \}\)/);
  assert.match(src, /tantalusV164: update\.tantalusV164/);
});
