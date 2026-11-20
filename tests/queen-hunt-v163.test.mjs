import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { homeworldSceneSsrV78 } from "./helpers/homeworld-scene-ssr-v78.mjs";

// Graphe TypeScript réel du projet ; aucune fonction de jeu n'est simulée.
const source = homeworldSceneSsrV78();
const { defaultSave, normalizeSave, parseSaveImport, exportSave } = source.load("app/game/save.ts");
const Q = source.load("app/game/systems/queenHuntV163.ts");
const { createClanChronicle } = source.load("app/game/systems/clanChronicle.ts");

const owner = "2026-11-20T08:00:00.000Z";
const at = "2026-11-20T09:00:00.000Z";
const ship = { personalShipAvailable: true };

function eliteLegacySave() {
  const save = defaultSave(owner);
  delete save.prologue;
  save.profile = { ...save.profile, rankId: "elite", honor: 5000 };
  save.missionProgress["ice-cryostalker"] = { ...save.missionProgress["ice-cryostalker"], status: "available", attempts: 4 };
  return save;
}
function settle(state, outcome, score, runId, attemptsAfter, extra = {}) {
  return Q.settleQueenHuntMissionV163(state,
    { missionId: "ice-cryostalker", outcome, score, completedAt: at, discoveredEnemyIds: extra.ids ?? [] },
    { runId, missionId: "ice-cryostalker", encounterRun: extra.run ?? 4, ownerSaveCreatedAt: owner }, attemptsAfter);
}

test("accès : Elite + vaisseau requis ; Blooded refusé ; campagne révisée par la chronique", () => {
  const save = eliteLegacySave();
  assert.equal(Q.evaluateQueenHuntAccessV163(save, ship).allowed, true);
  assert.equal(Q.evaluateQueenHuntAccessV163(save, { personalShipAvailable: false }).allowed, false);
  const blooded = { ...save, profile: { ...save.profile, rankId: "blooded" } };
  const refused = Q.evaluateQueenHuntAccessV163(blooded, ship);
  assert.equal(refused.allowed, false);
  assert.ok(refused.missing.some(m => m.includes("Elite")));
  const taken = Q.takeQueenHuntContractV163(null, blooded, ship, "queen-hunt-petite", at);
  assert.equal(taken.accepted, false);
  // Campagne révisée : un Youngling de la chronique n'a pas accès, même avec un profil « elite ».
  const revised = { ...save, prologue: { chronicle: createClanChronicle() } };
  assert.equal(Q.evaluateQueenHuntAccessV163(revised, ship).allowed, false);
});

test("trois tailles reprises de la bible, Descente en données non jouable", () => {
  assert.deepEqual(Q.QUEEN_HUNT_CONTRACTS_V163.map(c => c.size), ["petite", "moyenne", "grande"]);
  assert.deepEqual(Q.QUEEN_HUNT_CONTRACTS_V163.map(c => c.durationMinutes), [10, 18, 25]);
  assert.deepEqual(Q.QUEEN_HUNT_CONTRACTS_V163.map(c => c.rewardHonorProposed), [400, 700, 1100]);
  assert.match(Q.QUEEN_HUNT_CONTRACTS_V163[0].content, /reine jeune/);
  assert.match(Q.QUEEN_HUNT_CONTRACTS_V163[2].queen, /reine adulte/);
  assert.equal(Q.QUEEN_HUNT_DESCENT_V163.playable, false);
  assert.equal(Q.QUEEN_HUNT_DESCENT_V163.queenEveryFloors, 5);
  const save = eliteLegacySave();
  for (const contract of Q.QUEEN_HUNT_CONTRACTS_V163) {
    const taken = Q.takeQueenHuntContractV163(null, save, ship, contract.id, at);
    assert.equal(taken.accepted, true, contract.id);
    assert.equal(taken.state.activeContract.contractId, contract.id);
    assert.equal(taken.state.activeContract.encounterRun, 4);
  }
  assert.equal(Q.takeQueenHuntContractV163(null, save, ship, "queen-hunt-descente", at).accepted, false);
});

test("résultat enregistré une seule fois, lié à la sortie et au score de la taille", () => {
  const save = eliteLegacySave();
  let state = Q.takeQueenHuntContractV163(null, save, ship, "queen-hunt-moyenne", at).state;
  assert.equal(Q.takeQueenHuntContractV163(state, save, ship, "queen-hunt-petite", at).accepted, false, "un seul contrat à la fois");
  // Autre mission : rien ne change.
  const other = Q.settleQueenHuntMissionV163(state, { missionId: "jungle-vey", outcome: "success", score: 99, completedAt: at },
    { runId: "run-x", missionId: "jungle-vey", encounterRun: 0, ownerSaveCreatedAt: owner }, 1);
  assert.equal(other.changed, false);
  // Progression non confirmée : refus.
  assert.equal(settle(state, "success", 90, "run-a", 4).accepted, false);
  const first = settle(state, "success", 70, "run-a", 5, { ids: ["xeno-drone"] });
  assert.equal(first.changed, true);
  assert.equal(first.state.activeContract, null);
  assert.deepEqual(first.state.results.map(r => [r.eventId, r.outcome, r.xenoEncountered]), [["run-a", "reussi", true]]);
  const again = settle(first.state, "success", 70, "run-a", 5);
  assert.equal(again.changed, false);
  assert.equal(again.state.results.length, 1);
  // Score insuffisant pour la Grande ruche -> échec ; abandon -> repli.
  state = Q.takeQueenHuntContractV163(first.state, { ...save, missionProgress: { ...save.missionProgress,
    "ice-cryostalker": { ...save.missionProgress["ice-cryostalker"], attempts: 5 } } }, ship, "queen-hunt-grande", at).state;
  const low = settle(state, "success", 70, "run-b", 6, { run: 5 });
  assert.equal(low.state.results.at(-1).outcome, "echoue");
  assert.equal(low.state.firstQueenResolved.value, "non_resolu", "un contrat n'écrit jamais le jalon");
  const rendered = Q.abandonQueenHuntContractV163(Q.takeQueenHuntContractV163(low.state, { ...save, missionProgress: { ...save.missionProgress,
    "ice-cryostalker": { ...save.missionProgress["ice-cryostalker"], attempts: 6 } } }, ship, "queen-hunt-petite", at).state);
  assert.equal(rendered.state.activeContract, null);
  assert.equal(rendered.state.results.length, 2, "rendre un contrat sans sortie n'enregistre rien");
});

test("firstQueenResolved : seule la reine ACTIVE de XP-Z12 l'écrit, jamais le vestige XP-Z09", () => {
  const state = Q.emptyQueenHuntV163(owner);
  const vestige = Q.recordFirstQueenV163(state, { eventId: "xp-z09", zoneId: "XP-Z09", queenState: "vestige", value: "reussi", at });
  assert.equal(vestige.accepted, false);
  assert.match(vestige.message, /XP-Z09/);
  assert.equal(Q.recordFirstQueenV163(state, { eventId: "xp-z09b", zoneId: "XP-Z09", queenState: "active", value: "reussi", at }).accepted, false);
  assert.equal(Q.recordFirstQueenV163(state, { eventId: "contract", zoneId: "queen-hunt", queenState: "active", value: "reussi", at }).accepted, false);
  const retreat = Q.recordFirstQueenV163(state, { eventId: "cradle-1", zoneId: "XP-Z12", queenState: "active", value: "replie", at });
  assert.equal(retreat.state.firstQueenResolved.value, "replie");
  assert.equal(Q.recordFirstQueenV163(retreat.state, { eventId: "cradle-1", zoneId: "XP-Z12", queenState: "active", value: "reussi", at }).changed, false,
    "événement déjà consommé");
  const win = Q.recordFirstQueenV163(retreat.state, { eventId: "cradle-2", zoneId: "XP-Z12", queenState: "active", value: "reussi", at });
  assert.equal(win.state.firstQueenResolved.value, "reussi");
  assert.equal(Q.recordFirstQueenV163(win.state, { eventId: "cradle-3", zoneId: "XP-Z12", queenState: "active", value: "replie", at }).changed, false);
  // Synchronisation depuis le Berceau enfoui (reine active existante).
  const save = eliteLegacySave();
  assert.equal(Q.syncFirstQueenFromCradleV163(state, { ...save, buriedCradle: { ownerCreatedAt: owner, status: "active", outcome: "unresolved" } }, at).changed, false);
  const synced = Q.syncFirstQueenFromCradleV163(state, { ...save, buriedCradle: { ownerCreatedAt: owner, status: "reported", outcome: "victory-without-crown" } }, at);
  assert.equal(synced.state.firstQueenResolved.value, "reussi");
  assert.equal(synced.state.firstQueenResolved.zoneId, "XP-Z12");
});

test("sauvegarde : aller-retour, ancienne forme intacte, version future et registre étranger refusés", () => {
  const save = eliteLegacySave();
  const taken = Q.takeQueenHuntContractV163(null, save, ship, "queen-hunt-petite", at).state;
  const settled = settle(taken, "success", 80, "run-z", 5).state;
  const next = { ...save, queenHuntV163: settled };
  const imported = parseSaveImport(exportSave(next));
  assert.equal(imported.failure, null);
  assert.deepEqual(imported.save.queenHuntV163, settled);
  assert.deepEqual(normalizeSave(next).queenHuntV163, settled);
  // Ancienne sauvegarde sans le champ : rien n'est ajouté ni modifié.
  const old = defaultSave(owner);
  old.profile.hunterName = "Ancien chasseur";
  delete old.queenHuntV163;
  const oldImported = parseSaveImport(JSON.stringify(old));
  assert.equal(oldImported.failure, null);
  assert.equal(oldImported.save.queenHuntV163, undefined);
  assert.equal(oldImported.save.profile.hunterName, "Ancien chasseur");
  assert.equal(defaultSave(owner).queenHuntV163, undefined);
  // Version future et propriétaire étranger.
  assert.equal(parseSaveImport(JSON.stringify({ ...next, queenHuntV163: { ...settled, version: 2 } })).failure, "future-version");
  assert.equal(parseSaveImport(JSON.stringify({ ...next, queenHuntV163: { ...settled, ownerCreatedAt: "2020-01-01T00:00:00.000Z" } })).failure, "invalid-save");
  assert.equal(Q.inspectQueenHuntV163({ ...settled, version: 2 }, owner).status, "future-version");
  const forged = { ...settled, firstQueenResolved: { value: "reussi", eventId: "x", zoneId: "XP-Z09", at } };
  assert.equal(Q.inspectQueenHuntV163(forged, owner).status, "invalid", "un jalon attribué au vestige est rejeté");
});

test("rendu SSR du panneau et intégration au pont et au règlement de chasse", () => {
  const Panel = "app/game/QueenHuntPanelV163.tsx";
  const save = eliteLegacySave();
  const state = settle(Q.takeQueenHuntContractV163(null, save, ship, "queen-hunt-petite", at).state, "success", 80, "run-ssr", 5).state;
  const html = source.render(Panel, { access: { allowed: true, missing: [] }, state, nextEncounterShowsXeno: false, busy: false,
    onTake() {}, onAbandon() {}, onLaunch() {}, onClose() {} });
  for (const size of ["petite", "moyenne", "grande"]) assert.match(html, new RegExp(`data-queen-hunt-size="${size}"`));
  assert.match(html, /Non jouable dans cette version/);
  assert.match(html, /aucune reine n’apparaît/);
  assert.match(html, /data-first-queen-resolved="non_resolu"/);
  assert.match(html, /Petite ruche · réussi · score 80/);
  const locked = source.render(Panel, { access: { allowed: false, missing: ["Rang requis : Elite"] }, state: null, nextEncounterShowsXeno: true,
    busy: false, onTake() {}, onAbandon() {}, onLaunch() {}, onClose() {} });
  assert.match(locked, /Rang requis : Elite/);
  assert.match(locked, /disabled=""/);
  const client = readFileSync(new URL("../app/game/GameClient.tsx", import.meta.url), "utf8");
  assert.match(client, /const QueenHuntPanelV163 = React\.lazy\(\(\) => import\("\.\/QueenHuntPanelV163"\)\)/);
  assert.match(client, /data-open-queen-hunt-v163/);
  assert.match(client, /settleQueenHuntMissionV163\(current\.queenHuntV163, result,/);
});
