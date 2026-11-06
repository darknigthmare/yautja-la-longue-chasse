import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { runInNewContext } from "node:vm";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import ts from "typescript";
import { mergeExplorationProgress, isExplorationMission } from "../app/game/systems/explorationProgress.ts";
import { deliverHarvestV112 } from "../app/game/systems/harvestInventoryV112.ts";

const source = await readFile(new URL("../app/game/GameClient.tsx", import.meta.url), "utf8");
const ast = ts.createSourceFile("GameClient.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const MISSION_ID = "jungle-vey";
// Run strict arrival validators and the actual catalogue/save normalization in
// the callback's VM realm. Cross-realm Object.prototype values would otherwise
// be rejected as non-plain objects, unlike the real single-realm application.
const dependencies = await build({
  stdin: { contents: [
    'export { defaultSave, normalizeSave, reconcileSaveWrite, RANK_THRESHOLDS, SAVE_STORAGE_KEY, writeSaveWithStatus as durableSaveWrite, loadSaveWithStatus } from "./app/game/save.ts";',
    'export { MISSIONS } from "./app/game/data.ts";',
    'export { loadShipProgression } from "./app/game/systems/progression.ts";',
    'export { isShipId } from "./app/game/shipCatalogue.ts";',
    'export { TRIO_MEMBERS, assignExpeditionMember, recruitExpeditionMember, reserveExpeditionMember, expeditionTrioReady, normalizePlanetInsertionPlan, samePlanetInsertion, settleExpeditionOutcome, shipSupportsSurfaceInsertion } from "./app/game/systems/planetInsertion.ts";',
    'export { SHIP_INSERTION_ENERGY, debitShipInsertionCloak, hasShipInsertionDebit, shipInsertionCharge, rechargeShipInsertionEnergy } from "./app/game/systems/shipInsertionEnergy.ts";',
    'export { createHuntInsertion, hurtHuntCompanion, beginHuntCompanionBoarding, completeHuntCompanionBoarding, huntInsertionOutcome } from "./app/game/systems/huntInsertion.ts";',
    'export { worldBlueprintFor } from "./app/game/systems/worldBlueprints.ts";',
    'export { createPlanetArrival, inspectPlanetArrival, requestPlanetArrivalHandoff, completePlanetArrivalHandoff } from "./app/game/systems/planetArrival.ts";',
    'export { inspectPlanetArrivalRun } from "./app/game/systems/planetArrivalRun.ts";',
    'export { createWolfCastleVisit, actWolfCastle, applyWolfCastleCheckpoint } from "./app/game/systems/wolfCastle.ts";',
    'export * as castle from "./app/game/systems/wolfCastle.ts";',
    'export * as castleCombat from "./app/game/systems/wolfCastleCombat.ts";',
    'export { captureHuntGauntletV142, resumeHuntGauntletV142 } from "./app/game/systems/huntGauntletIdentityV142.ts";',
    'export { normalizeHuntAccessibilityV112 } from "./app/game/systems/huntAccessibilityV112.ts";',
    'export { actClanShipOperations, bindClanShipMission, clanShipContract, createClanShipOperations, evaluateClanShipAccess, inspectClanShipOperations, releaseClanShipMissionBinding, settleClanShipMission, CLAN_SHIP_ONBOARDING_STEPS } from "./app/game/systems/clanShipOperations.ts";',
    'export { applyMissionResult as applyRealMissionResult } from "./app/game/save.ts";',
  ].join('\n'), resolveDir: fileURLToPath(new URL('../', import.meta.url)), loader: 'ts' },
  bundle: true, write: false, format: 'iife', globalName: 'ShipFlowDependencies', platform: 'node', logLevel: 'silent',
});
const dependencyScript = dependencies.outputFiles[0].text;
function findNode(predicate) {
  let result;
  const visit = (node) => { if (predicate(node)) result = node; else ts.forEachChild(node, visit); };
  visit(ast);
  assert.ok(result, "runtime handler exists");
  return result;
}
function callback(name, environment) {
  const declaration = findNode((node) => ts.isVariableDeclaration(node) && node.name.getText(ast) === name);
  const implementation = declaration.initializer.arguments[0];
  const compiled = ts.transpileModule(`const handler = ${implementation.getText(ast)};`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None },
  }).outputText;
  return runInNewContext(`(() => { ${compiled}; return handler; })()`, environment);
}
function namedFunction(name, environment) {
  const declaration = findNode(node => ts.isFunctionDeclaration(node) && node.name?.text === name);
  const compiled = ts.transpileModule(declaration.getText(ast), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None },
  }).outputText;
  return runInNewContext(`(() => { ${compiled}; return ${name}; })()`, environment);
}
function fixture() {
  const observations = { writes: 0, clears: 0, rewards: 0, sidecars: [], screen: "deck", sequence: 0, events: [] };
  const environment = {
    TextEncoder,
    cloneJsonDto: value => JSON.stringify(structuredClone(value)),
    sessionAliveRef: { current: true },
    pendingTrophyCommitRef: { current: null },
    // Adult campaign fixture has no uncertain nursery transaction.
    nurseryWriteAttemptRef: { current: null },
    pendingSocialWriteRef: { current: null },
    setNurseryPersistenceError() {},
    missionSettlementRef: { current: false },
    arrivalStartupRef: { current: false }, arrivalMountedRunRef: { current: null },
    screen: 'deck', settingsOpen: false, archiveTransferBusy: false, archiveRecoveryIssue: null, campaignSaveBusy: false,
    hunterGauntlet: { equippedId: "jungle-hunter" },
    resumableHunt: null,
    activeHuntSessionRef: { current: null }, activeHuntWriteFailureRef: { current: null }, pendingTerminalRunRef: { current: null },
    mergeExplorationProgress, isExplorationMission, deliverHarvestV112,
    writeSaveWithStatus(save) { observations.writes++; observations.events.push("write"); return { save, persisted: true, failure: null }; },
    clearActiveHuntSave(options) { observations.clears++; observations.events.push(["clear", options?.expectedRunId]); observations.currentHunt = null; return { cleared: true, failure: null }; },
    loadActiveHuntSave() { return { save: observations.currentHunt ?? null, failure: null }; },
    createHuntRunId: () => `run-${++observations.sequence}`,
    playSound() {}, setSave(save) { environment.save = save; }, setSaveFailure(value) { observations.saveFailure = value; },
    setResumableHunt() {}, setHuntResumePayload(value) { observations.huntResumePayload = value; }, setHuntRuntimeSave() {}, setSelectedMission() {},
    setPendingHuntResult(value) { observations.pendingResult = value; },
    setLastResult(value) { observations.lastResult = value; }, setLastRewardSummary(value) { observations.lastRewardSummary = value; }, setToast(value) { observations.toast = value; },
    setNewGamePhase() {}, setSelectedShipId(value) { observations.selectedShipId = value; },
    setScreen(screen) { observations.screen = screen; environment.screen = screen; },
    persist(save) { environment.save = save; },
    applyMissionResult(save) {
      observations.rewards++;
      return { ...save, profile: { ...save.profile, honor: save.profile.honor + 5, clanMarks: save.profile.clanMarks + 1 }, missionProgress: { ...save.missionProgress, [MISSION_ID]: { ...save.missionProgress[MISSION_ID], status: "completed", attempts: save.missionProgress[MISSION_ID].attempts + 1 } } };
    },
    ACTIVE_HUNT_SAVE_VERSION: 1, ACTIVE_HUNT_RUNTIME_REVISION: 1,
    writeActiveHuntSave(value) { observations.currentHunt = value; observations.sidecars.push(value); return { persisted: true, save: value, failure: null }; },
  };
  Object.assign(environment, runInNewContext(`(() => { ${dependencyScript}; return ShipFlowDependencies; })()`, environment));
  // Node VM contexts omit the browser's structuredClone global. Use the native
  // clone for these JSON DTOs, then reconstruct their prototypes in this realm.
  runInNewContext('globalThis.structuredClone = value => JSON.parse(cloneJsonDto(value));', environment);
  environment.save = environment.defaultSave("2026-08-31T10:00:00.000Z");
  environment.insertionPlan = environment.normalizePlanetInsertionPlan(undefined);
  environment.save.settings.difficultyId = 'hunter';
  environment.selectedMission = environment.MISSIONS.find(item => item.id === MISSION_ID);
  environment.entry = { ownerCreatedAt: environment.save.createdAt };
  environment.saveRef = { current: environment.save };
  for (const name of ['isJsonObject', 'huntConfiguration', 'normalizeHuntConfiguration', 'explorationWriteFailure']) environment[name] = namedFunction(name, environment);
  environment.clearHuntSession = callback("clearHuntSession", environment);
  environment.reconcileHuntWrite = callback("reconcileHuntWrite", environment);
  environment.persistSocialProgress = callback("persistSocialProgress", environment);
  environment.retireArrivalRecovery = callback("retireArrivalRecovery", environment);
  environment.mountArrivalHunt = callback("mountArrivalHunt", environment);
  environment.checkHuntSessionForSettlement = callback("checkHuntSessionForSettlement", environment);
  const depart = callback('launchMission', environment), finishArrival = callback('finishPlanetArrival', environment);
  const arrive = () => {
    if (environment.screen !== 'planet-arrival' || !environment.save.planetArrival) return false;
    return finishArrival(environment.requestPlanetArrivalHandoff(environment.save.planetArrival, 'skipped'));
  };
  // Legacy mission lifecycle cases explicitly pass through the new production
  // departure and handoff callbacks; no fake active session is injected.
  const launch = () => { depart(); arrive(); };
  return { observations, environment, depart, arrive, launch, finish: callback("completeMission", environment), autosave: callback("persistActiveHunt", environment) };
}

function insertionFixture(method = 'ship', team = 'triad', shipCloak = false) {
  const result = fixture(), { environment } = result;
  environment.fixtureMethod = method; environment.fixtureTeam = team;
  environment.fixtureCloak = shipCloak;
  runInNewContext(`
    insertionPlan = { version: 1, method: fixtureMethod, team: fixtureTeam, ...(fixtureCloak ? { shipCloak: true } : {}) };
    if (insertionPlan.team === 'triad') {
      const shipId = loadShipProgression(save).selectedShipId;
      let roster = recruitExpeditionMember(save.expeditionRoster, save.createdAt, 'karhek');
      roster = assignExpeditionMember(roster, save.createdAt, shipId, 'karhek');
      roster = recruitExpeditionMember(roster, save.createdAt, 'saketh');
      roster = assignExpeditionMember(roster, save.createdAt, shipId, 'saketh');
      save = { ...save, expeditionRoster: roster };
      saveRef.current = save;
    }
    applyMissionResult = applyRealMissionResult;
    makeInsertionResult = (outcome = 'success') => {
      const session = activeHuntSessionRef.current;
      const world = worldBlueprintFor(selectedMission.id);
      const insertion = createHuntInsertion(session.configuration.insertion, session.runId, world);
      if (insertion.companions.length) hurtHuntCompanion(insertion.companions[0], 30);
      if (outcome === 'success') {
        // This transaction fixture positions both bodies at the authored return
        // point; the actual boarding and outcome functions decide their status.
        for (const member of insertion.companions) member.x = world.extraction.x - member.width / 2;
        if (!beginHuntCompanionBoarding(insertion, world)) throw Error('The real extraction must accept these bodies');
        completeHuntCompanionBoarding(insertion);
      }
      return {
        missionId: selectedMission.id, difficultyId: 'hunter', outcome, score: 80, scans: 3, elapsedSeconds: 180,
        completedObjectiveIds: selectedMission.objectives.filter(item => item.required || item.kind === 'extract').map(item => item.id),
        honorEvents: [], trophyQuality: 'elite', kills: 3, secondWindUsed: false,
        completedAt: '2026-11-05T14:00:00.000Z', insertionOutcome: huntInsertionOutcome(insertion, session.runId),
      };
    };
  `, environment);
  return result;
}

test('real briefing callbacks keep recruitment, assignment and reserve as separate campaign actions', () => {
  const { environment, observations } = fixture();
  environment.screen = 'briefing';
  const recruit = callback('recruitExpeditionHunter', environment);
  const assign = callback('assignExpeditionHunter', environment);
  const reserve = callback('reserveExpeditionHunter', environment);
  const shipId = environment.loadShipProgression(environment.save).selectedShipId;
  assign('karhek', shipId);
  assert.equal(observations.writes, 0, 'assignment cannot create an agreement');
  recruit('karhek');
  assert.equal(environment.save.expeditionRoster.members[0].assignedShipId, null);
  assert.equal(environment.expeditionTrioReady(environment.save.expeditionRoster, environment.save.createdAt, shipId), false);
  assign('karhek', 'wolf-ship');
  assert.equal(observations.writes, 1, 'a stale hull displayed by the briefing cannot receive an assignment');
  assign('karhek', shipId);
  assert.equal(environment.save.expeditionRoster.members[0].assignedShipId, shipId);
  reserve('karhek', 'wolf-ship');
  assert.equal(observations.writes, 2, 'a stale reserve command cannot remove a newer assignment');
  reserve('karhek', shipId);
  assert.equal(observations.writes, 3);
  assert.equal(environment.save.expeditionRoster.members.length, 1);
  assert.equal(environment.save.expeditionRoster.members[0].assignedShipId, null);
  assert.equal(environment.save.expeditionRoster.members[0].availability, 'ready');
  const beforeRepeat = JSON.stringify(environment.save.expeditionRoster);
  recruit('karhek');
  assert.equal(JSON.stringify(environment.save.expeditionRoster), beforeRepeat, 'recruit again cannot reboard the hunter');
});

test('retained roster commands cannot reassign companions once the actual departure is underway', () => {
  const { environment, observations, depart, arrive } = insertionFixture('pod', 'triad');
  const recruit = callback('recruitExpeditionHunter', environment);
  const assign = callback('assignExpeditionHunter', environment);
  const reserve = callback('reserveExpeditionHunter', environment);
  const shipId = environment.loadShipProgression(environment.save).selectedShipId;
  depart();
  const before = environment.save.expeditionRoster, writes = observations.writes;
  // Even a retained briefing event cannot replace the manifest frozen at departure.
  environment.screen = 'briefing';
  recruit('karhek'); assign('karhek', shipId); reserve('karhek', shipId);
  assert.equal(environment.save.expeditionRoster, before);
  assert.equal(observations.writes, writes);
  environment.screen = 'planet-arrival';
  assert.equal(arrive(), true);
  environment.screen = 'briefing';
  const huntWrites = observations.writes;
  reserve('karhek', shipId);
  assert.equal(environment.save.expeditionRoster, before);
  assert.equal(observations.writes, huntWrites, 'an active hunt keeps the return assignment');
});

for (const command of ['assign', 'reserve']) for (const failureMode of ['before-setItem', 'after-setItem']) {
  test(`roster ${command}: ${failureMode} preserves the previous confirmed state then recovers one durable transition`, () => {
    const { environment, observations } = fixture();
    environment.screen = 'briefing';
    const shipId = environment.loadShipProgression(environment.save).selectedShipId;
    callback('recruitExpeditionHunter', environment)('karhek');
    if (command === 'reserve') callback('assignExpeditionHunter', environment)('karhek', shipId);
    const values = new Map(), writes = [];
    let rejectWrite = false, rejectConfirmation = false;
    const storage = {
      getItem(key) {
        if (key === environment.SAVE_STORAGE_KEY && rejectConfirmation) {
          rejectConfirmation = false;
          throw Error('The write confirmation cannot be read yet');
        }
        return values.get(key) ?? null;
      },
      setItem(key, value) {
        if (key === environment.SAVE_STORAGE_KEY && rejectWrite) {
          rejectWrite = false;
          if (failureMode === 'before-setItem') throw new DOMException('Full', 'QuotaExceededError');
          values.set(key, value); writes.push(value); rejectConfirmation = true; return;
        }
        values.set(key, value);
        if (key === environment.SAVE_STORAGE_KEY) writes.push(value);
      },
      removeItem(key) { values.delete(key); },
    };
    environment.window = { localStorage: storage };
    const initial = environment.durableSaveWrite(environment.save);
    assert.equal(initial.persisted, true);
    environment.save = initial.save; environment.saveRef.current = initial.save;
    environment.writeSaveWithStatus = save => { observations.writes++; return environment.durableSaveWrite(save); };
    writes.length = 0; rejectWrite = true;
    const change = callback(command === 'assign' ? 'assignExpeditionHunter' : 'reserveExpeditionHunter', environment);
    const before = environment.save, marks = before.profile.clanMarks;
    change('karhek', shipId);
    assert.equal(environment.save, before, 'an unconfirmed action cannot change the active campaign');
    assert.equal(observations.saveFailure, 'write-failed');
    assert(environment.pendingSocialWriteRef.current);
    change('karhek', shipId);
    assert.equal(environment.pendingSocialWriteRef.current, null);
    assert.equal(environment.save.expeditionRoster.members[0].assignedShipId, command === 'assign' ? shipId : null);
    assert.equal(environment.save.profile.clanMarks, marks);
    assert.equal(writes.length, 1, 'confirmation recovery must not persist the same transition twice');
    const loaded = environment.loadSaveWithStatus(storage);
    assert.equal(JSON.stringify(loaded.save.expeditionRoster), JSON.stringify(environment.save.expeditionRoster));
  });
}

function paidDepartureTransactionFixture(failureMode) {
  const result = insertionFixture('ship', 'solo', true);
  const { environment, observations } = result;
  const values = new Map(), writes = [];
  let rejectDeparture = true, rejectConfirmation = false;
  const storage = {
    getItem(key) {
      if (key === environment.SAVE_STORAGE_KEY && rejectConfirmation) {
        rejectConfirmation = false;
        throw Error('The confirmed bytes cannot be read back yet');
      }
      return values.get(key) ?? null;
    },
    setItem(key, value) {
      if (key === environment.SAVE_STORAGE_KEY && rejectDeparture && JSON.parse(value).planetArrival) {
        rejectDeparture = false;
        if (failureMode === 'before-setItem') throw new DOMException('Full', 'QuotaExceededError');
        values.set(key, value); writes.push({ key, value });
        rejectConfirmation = true;
        return;
      }
      values.set(key, value); writes.push({ key, value });
    },
    removeItem(key) { values.delete(key); },
  };
  environment.window = { localStorage: storage };
  const initial = environment.durableSaveWrite(environment.save);
  assert.equal(initial.persisted, true, initial.failure);
  environment.save = initial.save; environment.saveRef.current = initial.save;
  environment.writeSaveWithStatus = save => {
    observations.writes++;
    return environment.durableSaveWrite(save);
  };
  const durable = () => JSON.parse(values.get(environment.SAVE_STORAGE_KEY));
  const charge = () => environment.shipInsertionCharge(environment.save.shipInsertionEnergy,
    environment.save.createdAt, 'classic-predator-spaceship');
  const departureWrites = () => writes.filter(write => write.key === environment.SAVE_STORAGE_KEY && JSON.parse(write.value).planetArrival);
  return { ...result, durable, charge, departureWrites };
}

function castleCheckpointFixture() {
  const result = fixture(), { environment } = result;
  environment.screen = 'wolf-castle';
  runInNewContext(`
    const owner = saveRef.current.createdAt;
    const context = { ownerCreatedAt: owner, personalShipId: 'classic-predator-spaceship' };
    const visit = actWolfCastle(createWolfCastleVisit(owner, context.personalShipId), { type: 'board' }, context).state;
    saveRef.current = { ...saveRef.current, wolfCastle: visit };
    save = saveRef.current;
    castleCheckpoint = { ...context, roomId: visit.roomId, expectedRevision: visit.revision,
      position: { x: 602.5, y: 616.25, facing: -1 }, combat: null };
  `, environment);
  return { ...result, checkpoint: callback('checkpointWolfCastle', environment) };
}

// This fixture earns its pending receipt through the actual authored objectives,
// combat simulation and checkpoints. It runs in the callback's own VM realm.
function victoriousMandate(castle, combat, ownerCreatedAt, personalShipId) {
  const context = { ownerCreatedAt, personalShipId };
  const act = (state, action) => {
    const result = castle.actWolfCastle(state, action, context);
    if (!result.accepted) throw Error(`${action.type}: ${result.reason}`);
    return result.state;
  };
  const move = (state, destination) => {
    for (const roomId of castle.wolfCastleRoute(state.roomId, destination).slice(1)) state = act(state, { type: 'move-room', roomId });
    return state;
  };
  const checkpoint = (state, position, dungeonCombat = state.dungeon?.combat ?? null) => {
    const result = castle.applyWolfCastleCheckpoint(state, { ...context, roomId: state.roomId, expectedRevision: state.revision,
      position, combat: state.combat, dungeonCombat }, context);
    if (!result.accepted) throw Error(`checkpoint: ${result.reason}`);
    return result.state;
  };
  const station = (state, kind) => {
    const target = castle.wolfCastleRoom(state.roomId).stations.find(item => item.kind === kind);
    return checkpoint(state, { x: target.x, y: target.y, facing: 1 });
  };
  let state = act(castle.createWolfCastleVisit(ownerCreatedAt, personalShipId, { invitationId: 'wolf-protocol:introduction' }), { type: 'board' });
  state = act(move(state, 'royal-audience'), { type: 'hear-audience' });
  state = act(move(state, 'royal-council'), { type: 'decide-audience', decision: 'accepted' });
  state = act(station(move(state, 'royal-audience'), 'audience'), { type: 'accept-dungeon' });
  for (const [room, kind, type] of [['royal-archives', 'archive', 'inspect-dungeon-archive'], ['royal-gallery', 'gallery', 'inspect-dungeon-gallery'], ['royal-council', 'council', 'inspect-dungeon-council']]) {
    state = act(station(move(state, room), kind), { type });
  }
  state = act(station(move(state, 'royal-court'), 'combat'), { type: 'start-dungeon-combat' });
  for (let phase = 0; phase < 3; phase++) {
    let live = state.dungeon.combat;
    for (let frame = 0; frame < 20_000 && live.status === 'active'; frame++) {
      const p = live.player, e = live.enemy, dx = e.x - p.x, dy = e.y - p.y;
      const imminent = e.phase === 'windup' && e.phaseMs < 185 && p.attackMs === 0 && p.defenseCooldownMs === 0;
      live = combat.stepWolfCastleCombat(live, {
        moveX: Math.abs(dx) > 130 || Math.sign(dx) !== p.facing ? Math.sign(dx) : 0,
        moveY: Math.abs(dy) > 10 ? Math.sign(dy) : 0,
        attack: e.phase === 'recovery' && Math.abs(dx) < 145 && Math.abs(dy) < 35 && p.attackCooldownMs === 0,
        parry: imminent && e.strike === 'thrust', evade: imminent && e.strike === 'sweep',
      }, 20);
    }
    if (live.status !== (phase === 2 ? 'victory' : 'intermission')) throw Error('The fixture must win the real mandate fight');
    state = checkpoint(state, { x: live.player.x, y: live.player.y, facing: live.player.facing }, live);
    if (phase < 2) state = act(state, { type: 'next-dungeon-phase' });
  }
  return station(move(state, 'royal-audience'), 'audience');
}

let mandateVictorySerialized;
function castleTransactionFixture() {
  const result = fixture(), { environment, observations } = result;
  const values = new Map();
  const storage = {
    values, writes: [], rejectPrimary: false, failReadback: false, pendingReadback: false,
    get length() { return values.size; }, key(index) { return [...values.keys()][index] ?? null; },
    getItem(key) {
      if (key === environment.SAVE_STORAGE_KEY && this.pendingReadback) { this.pendingReadback = false; throw Error('readback refused'); }
      return values.get(key) ?? null;
    },
    setItem(key, value) {
      if (key === environment.SAVE_STORAGE_KEY && this.rejectPrimary) throw new DOMException('Full', 'QuotaExceededError');
      values.set(key, value); this.writes.push({ key, value });
      if (key === environment.SAVE_STORAGE_KEY && this.failReadback) { this.failReadback = false; this.pendingReadback = true; }
    },
    removeItem(key) { values.delete(key); },
  };
  environment.window = { localStorage: storage };
  environment.screen = 'wolf-castle'; observations.screen = 'wolf-castle'; environment.gameFocusedV89 = true;
  if (!mandateVictorySerialized) {
    mandateVictorySerialized = JSON.stringify(runInNewContext(`(${victoriousMandate.toString()})(castle, castleCombat, saveRef.current.createdAt, 'classic-predator-spaceship')`, environment));
  }
  environment.mandateVictorySerialized = mandateVictorySerialized;
  runInNewContext(`saveRef.current = { ...saveRef.current, profile: { ...saveRef.current.profile, clanMarks: 7 }, wolfCastle: JSON.parse(mandateVictorySerialized) }; save = saveRef.current;`, environment);
  const initial = environment.durableSaveWrite(environment.saveRef.current);
  assert.equal(initial.persisted, true, initial.failure);
  environment.save = initial.save; environment.saveRef.current = initial.save;
  storage.writes.length = 0;
  environment.writeSaveWithStatus = save => { observations.writes++; observations.events.push('write'); return environment.durableSaveWrite(save); };
  const handler = callback('commitWolfCastleAction', environment);
  const commit = (action = { type: 'extract-dungeon' }) => {
    environment.actionSerialized = JSON.stringify(action);
    return handler(runInNewContext('JSON.parse(actionSerialized)', environment));
  };
  const durable = () => JSON.parse(storage.values.get(environment.SAVE_STORAGE_KEY));
  const primaryWrites = () => storage.writes.filter(write => write.key === environment.SAVE_STORAGE_KEY);
  return { ...result, storage, commit, durable, primaryWrites };
}

test('castle checkpoint persists the last visible position while opening settings or losing focus', () => {
  const { environment, observations, checkpoint } = castleCheckpointFixture();
  environment.settingsOpen = true;
  environment.gameFocusedV89 = false;
  const revision = environment.saveRef.current.wolfCastle.revision;
  assert.equal(checkpoint(environment.castleCheckpoint), true);
  assert.equal(observations.writes, 1);
  assert.equal(environment.saveRef.current.wolfCastle.position.x, 602.5);
  assert.equal(environment.saveRef.current.wolfCastle.position.facing, -1);
  assert.equal(environment.saveRef.current.wolfCastle.revision, revision + 1);
  assert.equal(checkpoint(environment.castleCheckpoint), false, 'a stale scene cannot overwrite the confirmed position');
  assert.equal(observations.writes, 1);
});

test('castle checkpoint refuses a replaced campaign, inactive screen, busy writer and archive recovery without writes', () => {
  const blocks = [
    env => { env.sessionAliveRef.current = false; },
    env => { env.entry.ownerCreatedAt = 'another-campaign'; },
    env => { env.screen = 'deck'; },
    env => { env.archiveTransferBusy = true; },
    env => { env.archiveRecoveryIssue = { reason: 'restore-required' }; },
    env => { env.campaignSaveBusy = true; },
    env => { env.castleCheckpoint.expectedRevision += 1; },
    env => { env.castleCheckpoint.position.x = -10; },
  ];
  for (const block of blocks) {
    const { environment, observations, checkpoint } = castleCheckpointFixture();
    const before = JSON.stringify(environment.saveRef.current);
    block(environment);
    assert.equal(checkpoint(environment.castleCheckpoint), false);
    assert.equal(observations.writes, 0);
    assert.equal(JSON.stringify(environment.saveRef.current), before);
  }
});

test('an unconfirmed castle checkpoint never advances the visible saved revision', () => {
  const { environment, observations, checkpoint } = castleCheckpointFixture();
  const before = JSON.stringify(environment.saveRef.current);
  environment.writeSaveWithStatus = save => ({ save, persisted: false, failure: 'write-failed' });
  assert.equal(checkpoint(environment.castleCheckpoint), false);
  assert.equal(JSON.stringify(environment.saveRef.current), before);
  assert.equal(observations.saveFailure, 'write-failed');
  assert.ok(environment.pendingSocialWriteRef.current, 'the existing uncertain-write recovery keeps the pending position');
});

test('the real castle commit writes the mandate receipt and two clan marks in one confirmed primary snapshot', () => {
  const { environment, observations, commit, durable, primaryWrites } = castleTransactionFixture();
  const before = environment.saveRef.current;
  assert.equal(before.wolfCastle.dungeon.status, 'victory');
  assert.equal(commit(), true);
  const after = environment.saveRef.current;
  assert.equal(observations.writes, 1); assert.equal(primaryWrites().length, 1);
  for (const value of [after, durable(), JSON.parse(primaryWrites()[0].value)]) {
    assert.equal(value.profile.clanMarks, before.profile.clanMarks + 2);
    assert.equal(value.wolfCastle.dungeon.status, 'completed');
    assert.equal(value.wolfCastle.dungeon.reward.claimed, true);
    assert.ok(value.wolfCastle.dungeon.reward.receipt.endsWith(value.createdAt));
  }
  for (const field of ['honor', 'rankId', 'hunterName', 'playTimeSeconds']) assert.equal(after.profile[field], before.profile[field]);
  for (const field of ['inventory', 'loadout', 'missionProgress', 'trophies']) assert.equal(JSON.stringify(after[field]), JSON.stringify(before[field]));
  assert.equal(observations.rewards, 0, 'the mandate is not a mission-settlement reward');
  assert.equal(commit(), true);
  assert.equal(observations.writes, 1); assert.equal(primaryWrites().length, 1);
  assert.equal(environment.saveRef.current.profile.clanMarks, 9);
  const reloaded = environment.loadSaveWithStatus();
  assert.equal(reloaded.loaded, true, reloaded.failure);
  environment.saveRef.current = reloaded.save; environment.save = reloaded.save;
  assert.equal(commit(), true);
  assert.equal(observations.writes, 1, 'a restored receipt also makes the action idempotent');
});

test('quota failure before the primary write leaves both mandate and balance available until a single successful retry', () => {
  const { environment, observations, storage, commit, durable, primaryWrites } = castleTransactionFixture();
  const before = JSON.stringify(environment.saveRef.current), raw = storage.values.get(environment.SAVE_STORAGE_KEY);
  storage.rejectPrimary = true;
  assert.equal(commit(), false);
  assert.equal(observations.writes, 1); assert.equal(primaryWrites().length, 0);
  assert.equal(JSON.stringify(environment.saveRef.current), before);
  assert.equal(storage.values.get(environment.SAVE_STORAGE_KEY), raw);
  assert.equal(durable().wolfCastle.dungeon.status, 'victory');
  assert.equal(durable().profile.clanMarks, 7);
  assert.ok(environment.pendingSocialWriteRef.current);
  storage.rejectPrimary = false;
  assert.equal(commit(), true);
  assert.equal(observations.writes, 2); assert.equal(primaryWrites().length, 1);
  assert.equal(durable().profile.clanMarks, 9); assert.equal(durable().wolfCastle.dungeon.status, 'completed');
  assert.equal(environment.pendingSocialWriteRef.current, null);
  assert.equal(commit(), true); assert.equal(observations.writes, 2);
});

test('an uncertain mandate readback reconciles the exact atomic write without applying or writing the reward twice', () => {
  const { environment, observations, storage, commit, durable, primaryWrites } = castleTransactionFixture();
  storage.failReadback = true;
  assert.equal(commit(), false);
  assert.equal(observations.writes, 1); assert.equal(primaryWrites().length, 1);
  assert.equal(environment.saveRef.current.profile.clanMarks, 7);
  assert.equal(environment.saveRef.current.wolfCastle.dungeon.status, 'victory');
  assert.equal(durable().profile.clanMarks, 9);
  assert.equal(durable().wolfCastle.dungeon.status, 'completed');
  assert.equal(environment.pendingSocialWriteRef.current.attempt.persisted, false);
  const written = storage.values.get(environment.SAVE_STORAGE_KEY);
  assert.equal(commit(), true);
  assert.equal(environment.saveRef.current.profile.clanMarks, 9);
  assert.equal(environment.saveRef.current.wolfCastle.dungeon.status, 'completed');
  assert.equal(environment.pendingSocialWriteRef.current, null);
  assert.equal(observations.saveFailure, null);
  assert.equal(storage.values.get(environment.SAVE_STORAGE_KEY), written);
  assert.equal(commit(), true);
  assert.equal(observations.writes, 1); assert.equal(primaryWrites().length, 1);
});

test('invalid clan-mark balances are refused before writing or consuming the victorious mandate', () => {
  for (const balance of [-1, 1.5, NaN, Number.MAX_SAFE_INTEGER - 1, Number.MAX_SAFE_INTEGER]) {
    const { environment, observations, storage, commit, primaryWrites } = castleTransactionFixture();
    environment.saveRef.current.profile.clanMarks = balance;
    const before = JSON.stringify(environment.saveRef.current), raw = storage.values.get(environment.SAVE_STORAGE_KEY);
    assert.equal(commit(), false, String(balance));
    assert.equal(observations.writes, 0); assert.equal(primaryWrites().length, 0);
    assert.equal(JSON.stringify(environment.saveRef.current), before);
    assert.equal(storage.values.get(environment.SAVE_STORAGE_KEY), raw);
    assert.equal(environment.pendingSocialWriteRef.current, null);
  }
});

test('replaced campaigns, inactive screens and blocked writers refuse mandate settlement before touching storage', () => {
  const blocks = [
    env => { env.sessionAliveRef.current = false; },
    env => { env.entry.ownerCreatedAt = 'replacement-owner'; },
    env => { env.saveRef.current = env.defaultSave('2026-11-05T10:00:00.000Z'); },
    env => { env.screen = 'deck'; },
    env => { env.gameFocusedV89 = false; },
    env => { env.settingsOpen = true; },
    env => { env.archiveTransferBusy = true; },
    env => { env.archiveRecoveryIssue = { reason: 'restore-required' }; },
    env => { env.campaignSaveBusy = true; },
    env => { env.pendingTrophyCommitRef.current = {}; },
    env => { env.pendingTerminalRunRef.current = 'unsettled-hunt'; },
  ];
  for (const block of blocks) {
    const { environment, observations, storage, commit, primaryWrites } = castleTransactionFixture();
    block(environment);
    const before = JSON.stringify(environment.saveRef.current), raw = storage.values.get(environment.SAVE_STORAGE_KEY);
    assert.equal(commit(), false);
    assert.equal(observations.writes, 0); assert.equal(primaryWrites().length, 0);
    assert.equal(JSON.stringify(environment.saveRef.current), before);
    assert.equal(storage.values.get(environment.SAVE_STORAGE_KEY), raw);
  }
});

test('an uncertain mandate receipt cannot overwrite a replacement campaign on disk', () => {
  const { environment, observations, storage, commit, primaryWrites } = castleTransactionFixture();
  storage.failReadback = true;
  assert.equal(commit(), false);
  const replacement = JSON.stringify(environment.defaultSave('2026-11-05T10:00:00.000Z'));
  storage.values.set(environment.SAVE_STORAGE_KEY, replacement);
  const before = JSON.stringify(environment.saveRef.current);
  assert.equal(commit(), false);
  assert.equal(observations.saveFailure, 'save-conflict');
  assert.equal(observations.writes, 1); assert.equal(primaryWrites().length, 1);
  assert.equal(storage.values.get(environment.SAVE_STORAGE_KEY), replacement);
  assert.equal(JSON.stringify(environment.saveRef.current), before);
  assert.equal(environment.saveRef.current.wolfCastle.dungeon.reward.claimed, false);
});

test('a different action after an uncertain mandate write first recovers the receipt and leaves the new request unapplied', () => {
  const { environment, observations, storage, commit } = castleTransactionFixture();
  storage.failReadback = true;
  assert.equal(commit(), false);
  assert.equal(commit({ type: 'move-room', roomId: 'royal-council' }), false);
  assert.equal(environment.saveRef.current.wolfCastle.roomId, 'royal-audience');
  assert.equal(environment.saveRef.current.wolfCastle.dungeon.status, 'completed');
  assert.equal(environment.saveRef.current.profile.clanMarks, 9);
  assert.equal(observations.writes, 1);
  assert.equal(commit({ type: 'move-room', roomId: 'royal-council' }), true);
  assert.equal(environment.saveRef.current.wolfCastle.roomId, 'royal-council');
  assert.equal(environment.saveRef.current.profile.clanMarks, 9);
  assert.equal(observations.writes, 2);
});

test("first launch persists the campaign owner and each replay opens a fresh autosave run", () => {
  const { environment, observations, depart, arrive, finish, autosave } = fixture();
  depart();
  assert.equal(observations.screen, 'planet-arrival');
  assert.equal(observations.writes, 2);
  assert.equal(environment.save.planetArrival.status, 'prepared');
  assert.equal(environment.activeHuntSessionRef.current, null, 'the montage owns no playable runtime yet');
  assert.equal(arrive(), true);
  assert.equal(observations.screen, "mission");
  assert.equal(observations.writes, 3);
  assert.equal(environment.activeHuntSessionRef.current.ownerSaveCreatedAt, environment.save.createdAt);
  assert.equal(environment.activeHuntSessionRef.current.configuration.gauntletVariantId, "jungle-hunter");
  environment.hunterGauntlet.equippedId = "city-hunter";
  autosave({ elapsed: 12, snapshot: { health: 80 }, retryCheckpoint: null });
  assert.equal(observations.sidecars[0].configuration.gauntletVariantId, "jungle-hunter", "the running hunt keeps its launch equipment snapshot");
  finish({ outcome: "failure" });
  assert.equal(observations.screen, "debrief");
  assert.equal(environment.activeHuntSessionRef.current, null);
  // This separate replay fixture has earned the catalogue's required rank.
  environment.save.profile.honor = environment.RANK_THRESHOLDS.blooded;
  // Follow the real debrief button, not a separately reproduced replay routine.
  const replayButton = findNode((node) => ts.isJsxElement(node) && node.openingElement.tagName.getText(ast) === "button" && node.children.some((child) => ts.isJsxText(child) && child.text.includes("Rejouer la chasse")));
  const click = replayButton.openingElement.attributes.properties.find((attr) => attr.name?.getText(ast) === "onClick");
  const replay = callback(click.initializer.expression.getText(ast), environment);
  replay();
  assert.equal(observations.screen, 'planet-arrival');
  assert.equal(arrive(), true);
  autosave({ elapsed: 1, snapshot: { health: 100 }, retryCheckpoint: null });
  assert.equal(observations.writes, 7);
  assert.notEqual(observations.sidecars[0].runId, observations.sidecars[1].runId);
  assert.equal(observations.sidecars[1].sequence, 1);
  assert.equal(observations.sidecars[1].encounterRun, 1);
  assert.equal(observations.sidecars[1].snapshot.health, 100);
  assert.equal(observations.sidecars[1].configuration.gauntletVariantId, "city-hunter", "a deliberate replay captures the newly equipped gauntlet");
});

test("duplicate terminal callbacks settle once; a deliberate next run can earn its own result", () => {
  const { environment, observations, launch, finish } = fixture();
  launch(); finish({ outcome: "success" }); finish({ outcome: "success" });
  assert.equal(observations.rewards, 1);
  assert.equal(environment.save.profile.honor, 5);
  launch(); finish({ outcome: "success" });
  assert.equal(observations.rewards, 2);
  assert.equal(environment.save.profile.honor, 10);
});

test('all four insertion choices freeze the accepted plan and hull through arrival, mounting and the first autosave', () => {
  for (const method of ['pod', 'ship']) for (const team of ['solo', 'triad']) {
    const { environment, observations, depart, arrive, autosave } = insertionFixture(method, team);
    const plan = { version: 1, method, team };
    depart();
    assert.equal(observations.screen, 'planet-arrival');
    const run = environment.save.planetArrivalRun;
    assert.deepEqual(JSON.parse(JSON.stringify(environment.save.planetArrival.insertion)), plan);
    assert.deepEqual(JSON.parse(JSON.stringify(run.configuration.insertion)), plan);
    assert.equal(run.configuration.insertionShipId, 'classic-predator-spaceship');
    runInNewContext(`insertionPlan.method = insertionPlan.method === 'pod' ? 'ship' : 'pod';
      insertionPlan.team = insertionPlan.team === 'solo' ? 'triad' : 'solo';`, environment);
    assert.equal(arrive(), true, 'later briefing changes cannot replace the accepted departure');
    assert.deepEqual(JSON.parse(JSON.stringify(observations.huntResumePayload.insertionPlan)), plan);
    assert.equal(observations.huntResumePayload.insertionRunId, run.runId);
    assert.equal(observations.huntResumePayload.insertionShipId, run.configuration.insertionShipId);
    autosave({ elapsed: 1, snapshot: { health: 100 }, retryCheckpoint: null });
    assert.deepEqual(JSON.parse(JSON.stringify(observations.sidecars[0].configuration.insertion)), plan);
    assert.equal(observations.sidecars[0].configuration.insertionShipId, run.configuration.insertionShipId);
  }
});

test('the real departure refuses an absent, incomplete, reassigned or recovering triad before any write', () => {
  for (const change of [
    'save.expeditionRoster = null;',
    'save.expeditionRoster.members.pop();',
    "save.expeditionRoster = assignExpeditionMember(save.expeditionRoster, save.createdAt, 'wolf-ship', 'saketh');",
    "save.expeditionRoster.members[0].availability = 'recovering';",
  ]) {
    const { environment, observations, depart } = insertionFixture();
    runInNewContext(change, environment);
    const before = JSON.stringify(environment.save);
    depart();
    assert.equal(observations.writes, 0, change);
    assert.equal(observations.clears, 0, change);
    assert.equal(environment.activeHuntSessionRef.current, null);
    assert.equal(observations.screen, 'deck');
    assert.match(observations.toast, /aptes et affectés/);
    assert.equal(JSON.stringify(environment.save), before);
  }
});

test('a cloaked departure commits its energy receipt with the frozen run and never pays again on mounting or autosave', () => {
  const { environment, observations, depart, arrive, autosave } = insertionFixture('ship', 'triad', true);
  const shipId = 'classic-predator-spaceship', written = [];
  const charge = () => environment.shipInsertionCharge(environment.save.shipInsertionEnergy, environment.save.createdAt, shipId);
  const write = environment.writeSaveWithStatus;
  environment.writeSaveWithStatus = save => { written.push(save); return write(save); };
  assert.equal(charge(), 100);
  depart();
  const { planetArrival: arrival, planetArrivalRun: run } = environment.save;
  assert.equal(written.length, 2, 'owner bootstrap and one atomic departure write');
  assert.equal(written[0].planetArrival ?? null, null);
  assert.equal(written[0].shipInsertionEnergy ?? null, null);
  assert.equal(written[1].planetArrivalRun.configuration.insertionEnergyRunId, arrival.runId);
  assert.equal(written[1].shipInsertionEnergy.departures[0].runId, arrival.runId);
  assert.equal(charge(), 70);
  assert.equal(environment.hasShipInsertionDebit(environment.save.shipInsertionEnergy, environment.save.createdAt, arrival.runId, shipId), true);
  const ledger = JSON.stringify(environment.save.shipInsertionEnergy);
  depart();
  assert.equal(written.length, 2, 'a second departure gesture keeps the accepted montage');
  assert.equal(arrive(), true);
  assert.equal(environment.mountArrivalHunt(environment.save.planetArrival, run), true);
  environment.insertionPlan.shipCloak = false;
  autosave({ elapsed: 1, snapshot: { health: 100 }, retryCheckpoint: null });
  assert.equal(observations.huntResumePayload.insertionPlan.shipCloak, true);
  assert.equal(observations.sidecars[0].configuration.insertion.shipCloak, true);
  assert.equal(observations.sidecars[0].configuration.insertionEnergyRunId, arrival.runId);
  assert.equal(JSON.stringify(environment.save.shipInsertionEnergy), ledger);
  assert.equal(charge(), 70);
});

test('refused owner or departure storage never spends the campaign auxiliary budget', () => {
  for (const failureStage of ['owner', 'departure']) {
    const { environment, observations, depart } = insertionFixture('ship', 'triad', true);
    const write = environment.writeSaveWithStatus;
    environment.writeSaveWithStatus = save => failureStage === 'owner' || save.planetArrival
      ? { save, persisted: false, failure: 'write-failed' } : write(save);
    depart();
    assert.equal(environment.shipInsertionCharge(environment.save.shipInsertionEnergy, environment.save.createdAt, 'classic-predator-spaceship'), 100);
    assert.equal(environment.save.shipInsertionEnergy ?? null, null);
    assert.equal(environment.save.planetArrival ?? null, null);
    assert.equal(environment.activeHuntSessionRef.current, null);
    assert.equal(observations.screen, 'deck');
    if (failureStage === 'departure') {
      const pending = environment.pendingSocialWriteRef.current.attempt.save;
      assert.equal(pending.shipInsertionEnergy.hulls[0].charge, 70, 'the unconfirmed proposal remains recoverable, separate from campaign state');
      assert.equal(pending.shipInsertionEnergy.departures[0].runId, pending.planetArrival.runId);
    }
  }
});

for (const failureMode of ['before-setItem', 'after-setItem-before-confirmation']) {
  test(`the real paid departure recovers ${failureMode} without a second charge or an arrival substitution`, () => {
    const { environment, observations, depart, durable, charge, departureWrites } = paidDepartureTransactionFixture(failureMode);
    depart();
    assert.equal(observations.saveFailure, 'write-failed');
    assert.equal(charge(), 100, 'an unconfirmed departure cannot replace the in-memory campaign');
    assert.equal(observations.screen, 'deck');
    const pending = environment.pendingSocialWriteRef.current;
    assert.ok(pending);
    const attemptedRun = pending.attempt.save.planetArrival.runId;
    if (failureMode === 'before-setItem') {
      assert.equal(durable().planetArrival ?? null, null);
      assert.equal(durable().shipInsertionEnergy ?? null, null);
    } else {
      assert.equal(durable().planetArrival.runId, attemptedRun);
      assert.equal(durable().shipInsertionEnergy.hulls[0].charge, 70);
    }
    // These are the actual retry gestures. The first reconciles uncertain
    // bytes before any baseline write; confirmed recovery refreshes the UI
    // before the second gesture opens the original saved montage.
    depart();
    assert.equal(environment.pendingSocialWriteRef.current, null);
    assert.equal(observations.saveFailure, null);
    if (failureMode === 'after-setItem-before-confirmation') {
      assert.equal(durable().planetArrival.runId, attemptedRun);
      assert.equal(departureWrites().length, 1, 'confirmation recovery must not write another departure');
    }
    depart();
    assert.equal(observations.screen, 'planet-arrival');
    assert.equal(charge(), 70);
    assert.equal(durable().shipInsertionEnergy.hulls[0].charge, 70);
    assert.equal(durable().shipInsertionEnergy.departures.length, 1);
    assert.equal(durable().shipInsertionEnergy.departures[0].runId, durable().planetArrival.runId);
    assert.equal(durable().planetArrivalRun.configuration.insertionEnergyRunId, durable().planetArrival.runId);
    assert.equal(departureWrites().length, 1);
    assert.equal(environment.hasShipInsertionDebit(environment.save.shipInsertionEnergy, environment.save.createdAt,
      environment.save.planetArrival.runId, 'classic-predator-spaceship'), true);
    const accepted = JSON.stringify(durable());
    depart();
    assert.equal(JSON.stringify(durable()), accepted, 'a repeated launch must preserve the same paid departure');
    assert.equal(departureWrites().length, 1);
  });
}

test('two actual cloaked sorties consume 100 to 70 to 40, then the real recharge callback charges twenty marks once', () => {
  const { environment, observations, launch, depart, finish } = insertionFixture('ship', 'solo', true);
  environment.save.profile.clanMarks = 40;
  const shipId = 'classic-predator-spaceship';
  const charge = () => environment.shipInsertionCharge(environment.save.shipInsertionEnergy, environment.save.createdAt, shipId);
  for (const expectedCharge of [70, 40]) {
    launch();
    assert.ok(environment.activeHuntSessionRef.current);
    assert.equal(charge(), expectedCharge);
    finish(environment.makeInsertionResult());
    assert.equal(charge(), expectedCharge);
    assert.equal(environment.activeHuntSessionRef.current, null);
  }
  assert.equal(environment.save.shipInsertionEnergy.departures.length, 2);
  const beforeRefusal = observations.writes;
  depart();
  assert.equal(observations.writes, beforeRefusal);
  assert.equal(environment.save.planetArrival, null);
  assert.match(observations.toast, /Énergie insuffisante/);
  environment.screen = 'briefing';
  const marks = environment.save.profile.clanMarks;
  const recharge = callback('rechargeInsertionShip', environment);
  recharge('wolf-ship', 40);
  assert.equal(charge(), 40, 'a stale button from a different selected hull cannot recharge this ship');
  assert.equal(observations.selectedShipId, shipId, 'the stale button must refresh the actual selected hull in the briefing');
  assert.equal(environment.save.profile.clanMarks, marks);
  assert.equal(observations.writes, beforeRefusal);
  recharge(shipId, 40);
  assert.equal(charge(), 100);
  assert.equal(environment.save.profile.clanMarks, marks - 20);
  assert.equal(environment.save.shipInsertionEnergy.departures.length, 2);
  assert.equal(observations.writes, beforeRefusal + 1);
  recharge(shipId, 40);
  assert.equal(charge(), 100);
  assert.equal(environment.save.profile.clanMarks, marks - 20);
  assert.equal(observations.writes, beforeRefusal + 1, 'the stale charge cannot buy the same recharge twice');
});

test('the actual hunt configuration refuses cloak without its saved energy receipt and original departure identity', () => {
  const { environment, depart } = insertionFixture('ship', 'triad', true);
  depart();
  assert.ok(environment.normalizeHuntConfiguration(environment.save, environment.save.planetArrivalRun));
  for (const change of [
    'campaign.shipInsertionEnergy = null;',
    'delete run.configuration.insertionEnergyRunId;',
    "run.configuration.insertionEnergyRunId = 'another-departure';",
    "run.configuration.insertionShipId = 'wolf-ship';",
  ]) {
    const accepted = runInNewContext(`(() => { const campaign = structuredClone(save); const run = structuredClone(save.planetArrivalRun); ${change} return normalizeHuntConfiguration(campaign, run); })()`, environment);
    assert.equal(accepted, null, change);
  }
});

test('arrival checkpoint and handoff reject a substituted insertion plan without replacing the frozen run', () => {
  const { environment, observations, depart, arrive } = insertionFixture();
  depart();
  const before = environment.save, run = before.planetArrivalRun, writes = observations.writes;
  runInNewContext(`
    substitutedArrival = { ...save.planetArrival, insertion: { version: 1, method: 'pod', team: 'solo' } };
    substitutedHandoff = requestPlanetArrivalHandoff(substitutedArrival, 'skipped');
  `, environment);
  assert.equal(callback('checkpointPlanetArrival', environment)(environment.substitutedArrival), false);
  assert.equal(callback('finishPlanetArrival', environment)(environment.substitutedHandoff), false);
  assert.equal(environment.save, before);
  assert.equal(environment.save.planetArrivalRun, run);
  assert.equal(observations.writes, writes);
  assert.equal(environment.activeHuntSessionRef.current, null);
  assert.equal(arrive(), true, 'the original accepted plan remains recoverable');
});

test('real triad extraction or abandonment settles availability with mission rewards once in the same campaign write', () => {
  for (const outcome of ['success', 'abandoned']) {
    const { environment, observations, launch, finish } = insertionFixture();
    launch();
    const before = environment.save, runId = environment.activeHuntSessionRef.current.runId;
    const result = environment.makeInsertionResult(outcome);
    const ordinary = environment.applyRealMissionResult(before, result);
    const written = [];
    const write = environment.writeSaveWithStatus;
    environment.writeSaveWithStatus = save => { written.push(save); return write(save); };
    observations.events.length = 0;
    finish(result);
    assert.equal(written.length, 1);
    assert.equal(written[0], environment.save);
    assert.equal(environment.save.profile.honor, ordinary.profile.honor);
    assert.equal(environment.save.profile.clanMarks, ordinary.profile.clanMarks);
    assert.deepEqual(JSON.parse(JSON.stringify(environment.save.expeditionRoster.members.map(member => member.availability))),
      outcome === 'success' ? ['recovering', 'ready'] : ['missing', 'missing']);
    assert.deepEqual([...environment.save.expeditionRoster.settledRunIds], [runId]);
    assert.equal(environment.save.planetArrival, null);
    assert.equal(environment.save.planetArrivalRun, null);
    assert.deepEqual(observations.events, ['write', ['clear', runId]]);
    const accepted = environment.save;
    finish(result);
    assert.equal(written.length, 1);
    assert.equal(environment.save, accepted);
  }
});

test('a missing or mismatched triad report retains the live hunt and campaign until a matching actual outcome arrives', () => {
  const { environment, observations, launch, finish } = insertionFixture();
  launch();
  environment.validInsertionResult = environment.makeInsertionResult();
  const before = environment.save, session = environment.activeHuntSessionRef.current;
  const writes = observations.writes, clears = observations.clears;
  for (const change of [
    'delete candidate.insertionOutcome;',
    "candidate.insertionOutcome.runId = 'another-run';",
    "candidate.insertionOutcome.plan.method = 'pod';",
    'candidate.insertionOutcome.members.pop();',
    'candidate.insertionOutcome.injured = [];',
  ]) {
    const candidate = runInNewContext(`(() => { const candidate = structuredClone(validInsertionResult); ${change} return candidate; })()`, environment);
    finish(candidate);
    assert.equal(environment.save, before, change);
    assert.equal(environment.activeHuntSessionRef.current, session);
    assert.equal(environment.missionSettlementRef.current, false);
    assert.equal(observations.pendingResult.result, candidate);
    assert.equal(observations.writes, writes);
    assert.equal(observations.clears, clears);
  }
  finish(environment.validInsertionResult);
  assert.equal(observations.pendingResult, null);
  assert.equal(environment.activeHuntSessionRef.current, null);
  assert.deepEqual([...environment.save.expeditionRoster.settledRunIds], [session.runId]);
});

test("a locked destination cannot create or replace an active session", () => {
  const { environment, observations, launch } = fixture();
  environment.save.missionProgress[MISSION_ID].status = "locked";
  launch();
  assert.equal(observations.writes, 0);
  assert.equal(observations.clears, 0);
  assert.equal(environment.activeHuntSessionRef.current, null);
});

test("failed campaign storage never creates an orphan autosave owner", () => {
  const { environment, observations, launch, autosave } = fixture();
  environment.writeSaveWithStatus = (save) => ({ save, persisted: false, failure: "write-failed" });
  launch();
  assert.equal(environment.activeHuntSessionRef.current, null);
  assert.equal(environment.activeHuntWriteFailureRef.current, "write-failed");
  assert.equal(autosave({ elapsed: 1, snapshot: {}, retryCheckpoint: null }), null);
  assert.equal(observations.sidecars.length, 0);
});


test("terminal reward storage precedes hunt retirement and quota failure preserves recovery", () => {
  const { environment, observations, launch, finish } = fixture();
  launch();
  const runId = environment.activeHuntSessionRef.current.runId;
  const clears = observations.clears;
  environment.writeSaveWithStatus = save => ({ save, persisted: false, failure: "write-failed" });
  finish({ outcome: "success" });
  assert.equal(observations.clears, clears, "failed reward storage must not erase a recoverable hunt");
  assert.equal(environment.save.profile.honor, 5, "earned result remains available to export in memory");
  assert.equal(environment.pendingTerminalRunRef.current, runId);
  assert.equal(environment.activeHuntSessionRef.current, null, "unmounted runtime cannot keep autosaving over recovery");
  finish({ outcome: "success" });
  assert.equal(observations.rewards, 1, "failed storage does not cause duplicate rewards");
  environment.writeSaveWithStatus = save => ({ save, persisted: true, failure: null });
  callback("persist", environment)(environment.save);
  assert.equal(environment.pendingTerminalRunRef.current, null);
  assert.deepEqual(observations.events.at(-1), ["clear", runId]);
});

test("a successful terminal write is followed by retirement of that run only", () => {
  const { environment, observations, launch, finish } = fixture();
  launch();
  const runId = environment.activeHuntSessionRef.current.runId;
  observations.events.length = 0;
  finish({ outcome: "success" });
  assert.deepEqual(observations.events, ["write", ["clear", runId]]);
});

test("a failed campaign bootstrap leaves a previous suspended hunt untouched", () => {
  const { environment, observations, launch } = fixture();
  environment.writeSaveWithStatus = save => ({ save, persisted: false, failure: "protected-save" });
  launch();
  assert.equal(observations.clears, 0);
  assert.equal(observations.screen, "deck");
});


test("failed replay preserves the debrief and its settled guard", () => {
  const { environment, observations, launch } = fixture();
  observations.screen = "debrief";
  observations.lastResult = { outcome: "success" };
  observations.lastRewardSummary = { honor: 5 };
  environment.missionSettlementRef.current = true;
  environment.writeSaveWithStatus = save => ({ save, persisted: false, failure: "write-failed" });
  launch();
  assert.equal(observations.screen, "debrief");
  assert.equal(observations.lastResult.outcome, "success");
  assert.equal(observations.lastRewardSummary.honor, 5);
  assert.equal(environment.missionSettlementRef.current, true);
});


test("a resumed or newer runtime cannot be settled by an obsolete tab", () => {
  for (const change of ["run", "sequence"]) {
    const { environment, observations, launch, autosave, finish } = fixture();
    launch();
    autosave({ elapsed: 12, snapshot: { health: 80 }, retryCheckpoint: null });
    const original = observations.currentHunt;
    observations.currentHunt = { ...original, runId: change === "run" ? "claimed-elsewhere" : original.runId, sequence: original.sequence + 1 };
    const clears = observations.clears, writes = observations.writes;
    finish({ outcome: "success" });
    assert.equal(observations.writes, writes, "obsolete result cannot write the campaign");
    assert.equal(observations.clears, clears, "newer recovery stays on disk");
    assert.equal(observations.rewards, 0);
    assert.equal(observations.screen, "title");
    assert.equal(environment.activeHuntSessionRef.current, null);
  }
});


test("a hunt write confirmed only later is not mistaken for a competing session", () => {
  for (const action of ["finish", "autosave"]) {
    const { environment, observations, launch, autosave, finish } = fixture();
    launch();
    environment.writeActiveHuntSave = value => {
      observations.currentHunt = value;
      return { persisted: false, save: value, failure: "write-failed" };
    };
    autosave({ elapsed: 12, snapshot: { health: 80 }, retryCheckpoint: null });
    assert.equal(environment.activeHuntSessionRef.current.sequence, 0);
    if (action === "finish") {
      finish({ outcome: "success" });
      assert.equal(observations.rewards, 1, "our exact confirmed attempt can settle");
      assert.equal(observations.screen, "debrief");
    } else {
      environment.writeActiveHuntSave = value => {
        observations.currentHunt = value;
        return { persisted: true, save: value, failure: null };
      };
      autosave({ elapsed: 24, snapshot: { health: 70 }, retryCheckpoint: null });
      assert.equal(observations.currentHunt.sequence, 2, "continue from the confirmed uncertain write");
      assert.equal(observations.currentHunt.snapshot.health, 70);
    }
  }
});


test("unreadable hunt ownership defers results and retries after storage returns", () => {
  for (const abort of [false, true]) {
    const { environment, observations, launch, autosave, finish } = fixture();
    launch();
    autosave({ elapsed: 12, snapshot: { health: 80 }, retryCheckpoint: null });
    const writes = observations.writes, clears = observations.clears;
    environment.loadActiveHuntSave = () => ({ save: null, failure: "read-failed" });
    finish({ outcome: abort ? "failed" : "success" }, abort);
    assert.equal(observations.rewards, 0);
    assert.equal(observations.writes, writes);
    assert.equal(observations.clears, clears);
    assert.equal(observations.screen, "mission");
    assert.equal(observations.pendingResult.returnToDeck, abort);
    assert.ok(environment.activeHuntSessionRef.current, "retry context must remain alive");
    environment.loadActiveHuntSave = () => ({ save: observations.currentHunt, failure: null });
    finish(observations.pendingResult.result, observations.pendingResult.returnToDeck);
    assert.equal(observations.rewards, 1);
    assert.equal(observations.pendingResult, null);
    assert.equal(observations.screen, abort ? "deck" : "debrief");
  }
});

test("death reconciles an uncertain write before retiring the living snapshot", () => {
  const { environment, observations, launch, autosave } = fixture();
  launch();
  environment.writeActiveHuntSave = value => { observations.currentHunt = value; return { persisted: false, save: value, failure: "write-failed" }; };
  autosave({ elapsed: 12, snapshot: { health: 80 }, retryCheckpoint: null });
  let expectedSequence;
  environment.clearActiveHuntSave = options => { expectedSequence = options.expectedSequence; observations.currentHunt = null; return { cleared: true, failure: null }; };
  callback("invalidateActiveHuntPersistence", environment)();
  assert.equal(expectedSequence, 1);
  assert.equal(observations.currentHunt, null);
  assert.equal(environment.activeHuntSessionRef.current.lastPersisted, null);
});


test("a rejected retry cannot discard proof of a previous uncertain autosave", () => {
  const { environment, observations, launch, autosave, finish } = fixture();
  launch();
  environment.writeActiveHuntSave = value => { observations.currentHunt = value; return { persisted: false, save: value, failure: "write-failed" }; };
  autosave({ elapsed: 12, snapshot: { health: 80 }, retryCheckpoint: null });
  const uncertain = observations.currentHunt;
  environment.loadActiveHuntSave = () => ({ save: null, failure: "read-failed" });
  environment.writeActiveHuntSave = value => ({ persisted: false, save: value, failure: "stale-sequence" });
  autosave({ elapsed: 24, snapshot: { health: 70 }, retryCheckpoint: null });
  assert.equal(environment.activeHuntSessionRef.current.lastAttempted, uncertain);
  environment.loadActiveHuntSave = () => ({ save: uncertain, failure: null });
  finish({ outcome: "success" });
  assert.equal(observations.rewards, 1);
  assert.equal(observations.screen, "debrief");
});


test("deferred reward retry cannot invalidate a hunt claimed elsewhere after quota failure", () => {
  for (const outcome of ["claimed", "unreadable"]) {
    const { environment, observations, launch, autosave, finish } = fixture();
    launch();
    autosave({ elapsed: 12, snapshot: { health: 80 }, retryCheckpoint: null });
    environment.writeSaveWithStatus = save => ({ save, persisted: false, failure: "write-failed" });
    finish({ outcome: "success" });
    const pendingRun = environment.pendingTerminalRunRef.current;
    assert.ok(pendingRun);
    const clears = observations.clears;
    if (outcome === "claimed") observations.currentHunt = { ...observations.currentHunt, runId: "resumed-elsewhere" };
    else environment.loadActiveHuntSave = () => ({ save: null, failure: "read-failed" });
    let retryWrites = 0, failure;
    environment.writeSaveWithStatus = save => { retryWrites++; return { save, persisted: true, failure: null }; };
    environment.setSaveFailure = value => { failure = value; };
    callback("persist", environment)(environment.save);
    assert.equal(retryWrites, 0);
    assert.equal(observations.clears, clears);
    assert.equal(environment.pendingTerminalRunRef.current, pendingRun);
    assert.equal(environment.save.profile.honor, 5, "result remains exportable in memory");
    assert.equal(failure, outcome === "claimed" ? "save-conflict" : "read-failed");
  }
});


test("unmounted campaign callbacks cannot launch, autosave, settle or clear a replacement owner", () => {
  const { environment, observations, launch, finish, autosave } = fixture();
  launch();
  const before = JSON.stringify(observations);
  environment.sessionAliveRef.current = false;
  launch();
  assert.equal(autosave({ elapsed: 4, snapshot: { health: 80 }, retryCheckpoint: null }), null);
  finish({ outcome: "success" });
  assert.equal(environment.clearHuntSession(), false);
  callback("persist", environment)(environment.save);
  assert.equal(JSON.stringify(observations), before);
});


test("a pending rite blocks hunt launch and terminal rewards until its receipt is resolved", () => {
  const { environment, observations, launch, finish } = fixture(), receipt = {};
  environment.pendingTrophyCommitRef.current = receipt;
  launch();
  assert.equal(observations.writes, 0);
  assert.equal(observations.clears, 0);
  assert.equal(environment.activeHuntSessionRef.current, null);
  environment.pendingTrophyCommitRef.current = null;
  launch();
  const session = environment.activeHuntSessionRef.current, writes = observations.writes, clears = observations.clears;
  environment.pendingTrophyCommitRef.current = receipt;
  finish({ outcome: "success" });
  assert.equal(observations.writes, writes);
  assert.equal(observations.clears, clears);
  assert.equal(observations.rewards, 0);
  assert.equal(environment.activeHuntSessionRef.current, session);
  assert.equal(environment.pendingTrophyCommitRef.current, receipt);
  environment.pendingTrophyCommitRef.current = null;
  finish({ outcome: "success" });
  assert.equal(observations.rewards, 1);
});

test('death and a rejected canvas snapshot retire the arrival recovery point before clearing the living snapshot', () => {
  for (const handler of ['invalidateActiveHuntPersistence', 'rejectActiveHuntResume']) {
    const { environment, observations, launch, autosave } = fixture();
    launch(); autosave({ elapsed: 12, snapshot: { health: 1 }, retryCheckpoint: null });
    const runId = environment.activeHuntSessionRef.current.runId;
    assert.equal(environment.save.planetArrival.status, 'complete');
    observations.events.length = 0;
    callback(handler, environment)();
    assert.equal(environment.save.planetArrival, null, 'reload cannot mistake death or rejection for the first-frame crash window');
    assert.equal(environment.save.planetArrivalRun, null);
    assert.equal(observations.currentHunt, null);
    assert.deepEqual(observations.events, ['write', ['clear', runId]], 'the campaign recovery point is durably retired first');
    assert.equal(observations.rewards, 0, 'retirement is not a mission reward');
    if (handler === 'rejectActiveHuntResume') {
      assert.equal(environment.activeHuntSessionRef.current, null);
      assert.equal(observations.screen, 'title');
    } else {
      assert.equal(environment.activeHuntSessionRef.current.lastPersisted, null, 'explicit retry can keep the existing runtime');
    }
    const writes = observations.writes;
    assert.equal(environment.retireArrivalRecovery(), true, 'retirement is idempotent');
    assert.equal(observations.writes, writes);
  }
});

test('a failed arrival-retirement write preserves both recovery records and the current screen', () => {
  for (const handler of ['invalidateActiveHuntPersistence', 'rejectActiveHuntResume']) {
    const { environment, observations, launch, autosave } = fixture();
    launch(); autosave({ elapsed: 12, snapshot: { health: 1 }, retryCheckpoint: null });
    const beforeSave = environment.save, beforeHunt = observations.currentHunt, clears = observations.clears;
    environment.writeSaveWithStatus = save => ({ save, persisted: false, failure: 'write-failed' });
    callback(handler, environment)();
    assert.equal(environment.save, beforeSave);
    assert.equal(environment.saveRef.current, beforeSave);
    assert.equal(observations.currentHunt, beforeHunt);
    assert.equal(observations.clears, clears);
    assert.equal(observations.screen, 'mission');
    assert.equal(observations.saveFailure, 'write-failed');
    assert.ok(environment.activeHuntSessionRef.current);
    assert.equal(environment.save.planetArrival.status, 'complete');
    assert.equal(observations.rewards, 0);
  }
});

test('arrival retirement rejects a changed owner, destination, encounter, claimed run or sequence before any write', () => {
  for (const change of ['owner', 'destination', 'encounter', 'claimed-run', 'new-sequence', 'unreadable']) {
    const { environment, observations, launch, autosave } = fixture();
    launch(); autosave({ elapsed: 12, snapshot: { health: 1 }, retryCheckpoint: null });
    if (change === 'owner') environment.saveRef.current = { ...environment.save, createdAt: '2026-11-04T18:00:00.000Z' };
    if (change === 'destination') environment.save.planetArrival.missionId = 'ice-colony';
    if (change === 'encounter') environment.save.planetArrival.encounterRun++;
    if (change === 'claimed-run') observations.currentHunt = { ...observations.currentHunt, runId: 'claimed-elsewhere' };
    if (change === 'new-sequence') observations.currentHunt = { ...observations.currentHunt, sequence: observations.currentHunt.sequence + 1 };
    if (change === 'unreadable') environment.loadActiveHuntSave = () => ({ save: null, failure: 'read-failed' });
    const save = environment.saveRef.current, sidecar = observations.currentHunt, writes = observations.writes, clears = observations.clears;
    assert.equal(environment.retireArrivalRecovery(), false, change);
    callback('invalidateActiveHuntPersistence', environment)();
    assert.equal(environment.saveRef.current, save, change);
    assert.equal(observations.currentHunt, sidecar, change);
    assert.equal(observations.writes, writes, change);
    assert.equal(observations.clears, clears, change);
    assert.equal(observations.saveFailure, change === 'unreadable' ? 'read-failed' : 'save-conflict');
  }
});

test('a pending trophy rite blocks death and corrupt-resume retirement without consuming any receipt', () => {
  for (const handler of ['invalidateActiveHuntPersistence', 'rejectActiveHuntResume']) {
    const { environment, observations, launch, autosave } = fixture();
    launch(); autosave({ elapsed: 12, snapshot: { health: 1 }, retryCheckpoint: null });
    const receipt = {}, save = environment.save, sidecar = observations.currentHunt;
    const writes = observations.writes, clears = observations.clears;
    environment.pendingTrophyCommitRef.current = receipt;
    callback(handler, environment)();
    assert.equal(observations.writes, writes);
    assert.equal(observations.clears, clears);
    assert.equal(environment.save, save);
    assert.equal(observations.currentHunt, sidecar);
    assert.equal(environment.pendingTrophyCommitRef.current, receipt);
    assert.equal(observations.rewards, 0);
  }
});

test('arrival handoff refuses failed campaign writes and mounts exactly once after confirmation', () => {
  const { environment, observations, depart, arrive } = fixture();
  depart();
  const before = environment.save, writer = environment.writeSaveWithStatus;
  environment.writeSaveWithStatus = save => ({ save, persisted: false, failure: 'storage-unavailable' });
  assert.equal(arrive(), false);
  assert.equal(environment.save, before);
  assert.equal(environment.activeHuntSessionRef.current, null);
  assert.equal(environment.arrivalMountedRunRef.current, null);
  assert.equal(observations.screen, 'planet-arrival');
  environment.writeSaveWithStatus = writer;
  assert.equal(arrive(), true);
  const session = environment.activeHuntSessionRef.current, writes = observations.writes;
  assert.equal(environment.save.planetArrival.status, 'complete');
  assert.equal(arrive(), false, 'a callback repeated after mounting cannot finish another runtime');
  assert.equal(environment.activeHuntSessionRef.current, session);
  assert.equal(observations.writes, writes);
});

test('arrival recovery before the first canvas snapshot can be retired by its own zero-sequence runtime', () => {
  const { environment, observations, launch } = fixture();
  launch();
  assert.equal(environment.activeHuntSessionRef.current.sequence, 0);
  assert.equal(observations.currentHunt, null);
  assert.equal(environment.retireArrivalRecovery(), true);
  assert.equal(environment.save.planetArrival, null);
  assert.equal(environment.save.planetArrivalRun, null);
  assert.equal(observations.rewards, 0);
});

function clanContractFixture() {
  const result = fixture(), { environment } = result;
  runInNewContext(`
    let operations = createClanShipOperations(save.createdAt);
    const operate = (type, detail = {}, roomId = 'conseil') => {
      const outcome = actClanShipOperations(operations, { type, expectedRevision: operations.revision, ...detail }, {
        ownerCreatedAt: save.createdAt, campaign: save,
        docking: { ownerCreatedAt: save.createdAt, status: 'aboard', roomId },
      });
      if (!outcome.accepted) throw Error(outcome.message);
      operations = outcome.state;
    };
    for (const step of CLAN_SHIP_ONBOARDING_STEPS) operate('onboard-step', { stepId: step.id }, step.roomId);
    operate('accept-mandate');
    operate('accept-contract', { contractId: 'field-jungle-survey' });
    save = { ...save, clanShipOperations: operations };
    saveRef.current = save;
    applyMissionResult = applyRealMissionResult;
    makeClanMissionResult = (outcome = 'success', score = 80, scans = 3) => ({
      missionId: selectedMission.id, difficultyId: 'hunter', outcome, score, scans, elapsedSeconds: 180,
      completedObjectiveIds: selectedMission.objectives.filter(item => item.required || item.kind === 'extract').map(item => item.id),
      honorEvents: [], trophyQuality: 'elite', kills: 3, secondWindUsed: false,
      completedAt: '2026-11-05T14:00:00.000Z',
    });
  `, environment);
  return result;
}

test('the real departure and result callbacks bind one clan encounter and commit its reward with the accepted hunt', () => {
  const { environment, observations, depart, arrive, finish } = clanContractFixture();
  depart();
  const arrival = environment.save.planetArrival;
  assert.equal(environment.save.clanShipOperations.activeContract.missionEncounterRun, arrival.encounterRun);
  assert.equal(environment.save.clanShipOperations.completedContracts.length, 1, 'only onboarding is complete at departure');
  assert.equal(arrive(), true);
  const before = environment.save, result = environment.makeClanMissionResult();
  const regularReward = environment.applyRealMissionResult(before, result).profile.clanMarks;
  finish(result);
  assert.equal(environment.save.clanShipOperations.activeContract, null);
  const receipt = environment.save.clanShipOperations.completedContracts.find(item => item.contractId === 'field-jungle-survey');
  assert.equal(receipt.proof.encounterRun, arrival.encounterRun);
  assert.equal(environment.save.profile.clanMarks, regularReward + 40);
  assert.equal(environment.save.planetArrival, null);
  assert.equal(environment.activeHuntSessionRef.current, null);
  const writes = observations.writes, finalSave = environment.save;
  finish(result);
  assert.equal(observations.writes, writes);
  assert.equal(environment.save, finalSave, 'a duplicate result cannot pay twice');
});

test('failed, abandoned and insufficient clan sorties release their binding and accept a new actual departure', () => {
  for (const outcome of ['failed', 'abandoned', 'success']) {
    const { environment, launch, finish } = clanContractFixture();
    launch();
    const before = environment.save;
    const result = environment.makeClanMissionResult(outcome, outcome === 'success' ? 20 : 80);
    const ordinary = environment.applyRealMissionResult(before, result);
    finish(result);
    assert.equal(environment.save.clanShipOperations.activeContract.contractId, 'field-jungle-survey');
    assert.equal(environment.save.clanShipOperations.activeContract.missionEncounterRun, null);
    assert.equal(environment.save.clanShipOperations.completedContracts.length, 1);
    assert.equal(environment.save.profile.clanMarks, ordinary.profile.clanMarks, 'no clan bonus without its requirements');
    launch();
    assert.equal(environment.save.clanShipOperations.activeContract.missionEncounterRun, 1);
    assert.equal(environment.activeHuntSessionRef.current.encounterRun, 1);
  }
});

test('a refused clan result retains the session and the result for a valid retry without consuming the hunt', () => {
  const { environment, observations, launch, finish } = clanContractFixture();
  launch();
  const badResult = environment.makeClanMissionResult(); badResult.completedObjectiveIds = [];
  const before = environment.save, session = environment.activeHuntSessionRef.current;
  const writes = observations.writes, clears = observations.clears;
  finish(badResult);
  assert.equal(environment.save, before);
  assert.equal(environment.activeHuntSessionRef.current, session);
  assert.equal(environment.missionSettlementRef.current, false);
  assert.equal(observations.pendingResult.result, badResult);
  assert.equal(observations.writes, writes);
  assert.equal(observations.clears, clears);
  finish(environment.makeClanMissionResult());
  assert.equal(environment.save.clanShipOperations.activeContract, null);
  assert.equal(observations.pendingResult, null);
});

test('an impossible clan balance leaves the whole mission pending until it can be recorded', () => {
  const { environment, observations, launch, finish } = clanContractFixture();
  launch();
  runInNewContext(`
    applyMissionResult = (current, result) => {
      const next = applyRealMissionResult(current, result);
      return { ...next, profile: { ...next.profile, clanMarks: Number.MAX_SAFE_INTEGER - 1 } };
    };
  `, environment);
  const before = environment.save, session = environment.activeHuntSessionRef.current, writes = observations.writes;
  finish(environment.makeClanMissionResult());
  assert.equal(environment.save, before);
  assert.equal(environment.activeHuntSessionRef.current, session);
  assert.equal(environment.missionSettlementRef.current, false);
  assert.equal(observations.writes, writes);
  assert.ok(observations.pendingResult);
  environment.applyMissionResult = environment.applyRealMissionResult;
  finish(observations.pendingResult.result);
  assert.equal(environment.save.clanShipOperations.activeContract, null);
});

test('rejected clan hunt recovery releases its contract atomically, while death preserves it for the same-run retry', () => {
  for (const handler of ['invalidateActiveHuntPersistence', 'rejectActiveHuntResume']) {
    const { environment, observations, launch, autosave } = clanContractFixture();
    launch(); autosave({ elapsed: 12, snapshot: { health: 1 }, retryCheckpoint: null });
    const beforeMarks = environment.save.profile.clanMarks;
    const run = environment.activeHuntSessionRef.current.encounterRun;
    callback(handler, environment)();
    assert.equal(environment.save.planetArrival, null);
    assert.equal(environment.save.profile.clanMarks, beforeMarks);
    assert.equal(environment.save.clanShipOperations.activeContract.missionEncounterRun,
      handler === 'rejectActiveHuntResume' ? null : run);
    assert.equal(environment.save.clanShipOperations.completedContracts.length, 1);
    if (handler === 'rejectActiveHuntResume') assert.equal(observations.screen, 'title');
  }
});

test('clan contract release waits for a confirmed campaign write before deleting its recoverable hunt', () => {
  const { environment, observations, launch, autosave } = clanContractFixture();
  launch(); autosave({ elapsed: 12, snapshot: { health: 1 }, retryCheckpoint: null });
  const before = environment.save, sidecar = observations.currentHunt, clears = observations.clears;
  const writer = environment.writeSaveWithStatus;
  environment.writeSaveWithStatus = save => ({ save, persisted: false, failure: 'write-failed' });
  callback('rejectActiveHuntResume', environment)();
  assert.equal(environment.save, before);
  assert.equal(environment.save.clanShipOperations.activeContract.missionEncounterRun, 0);
  assert.equal(observations.currentHunt, sidecar);
  assert.equal(observations.clears, clears);
  environment.pendingSocialWriteRef.current = null; // Refusal fixture wrote no bytes; model the confirmed failed-write recovery.
  environment.writeSaveWithStatus = writer;
  callback('rejectActiveHuntResume', environment)();
  assert.equal(environment.save.clanShipOperations.activeContract.missionEncounterRun, null);
  assert.equal(environment.activeHuntSessionRef.current, null);
});
