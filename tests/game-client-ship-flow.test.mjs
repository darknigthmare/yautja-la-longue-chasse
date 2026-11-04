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
    'export { defaultSave, normalizeSave, reconcileSaveWrite, RANK_THRESHOLDS } from "./app/game/save.ts";',
    'export { MISSIONS } from "./app/game/data.ts";',
    'export { loadShipProgression } from "./app/game/systems/progression.ts";',
    'export { createPlanetArrival, inspectPlanetArrival, requestPlanetArrivalHandoff, completePlanetArrivalHandoff } from "./app/game/systems/planetArrival.ts";',
    'export { inspectPlanetArrivalRun } from "./app/game/systems/planetArrivalRun.ts";',
    'export { createWolfCastleVisit, actWolfCastle, applyWolfCastleCheckpoint } from "./app/game/systems/wolfCastle.ts";',
    'export { captureHuntGauntletV142 } from "./app/game/systems/huntGauntletIdentityV142.ts";',
    'export { normalizeHuntAccessibilityV112 } from "./app/game/systems/huntAccessibilityV112.ts";',
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
    activeHuntSessionRef: { current: null }, activeHuntWriteFailureRef: { current: null }, pendingTerminalRunRef: { current: null },
    mergeExplorationProgress, isExplorationMission, deliverHarvestV112,
    writeSaveWithStatus(save) { observations.writes++; observations.events.push("write"); return { save, persisted: true, failure: null }; },
    clearActiveHuntSave(options) { observations.clears++; observations.events.push(["clear", options?.expectedRunId]); observations.currentHunt = null; return { cleared: true, failure: null }; },
    loadActiveHuntSave() { return { save: observations.currentHunt ?? null, failure: null }; },
    createHuntRunId: () => `run-${++observations.sequence}`,
    playSound() {}, setSave(save) { environment.save = save; }, setSaveFailure(value) { observations.saveFailure = value; },
    setResumableHunt() {}, setHuntResumePayload() {}, setHuntRuntimeSave() {}, setSelectedMission() {},
    setPendingHuntResult(value) { observations.pendingResult = value; },
    setLastResult(value) { observations.lastResult = value; }, setLastRewardSummary(value) { observations.lastRewardSummary = value; }, setToast(value) { observations.toast = value; },
    setNewGamePhase() {}, setSelectedShipId() {},
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
  environment.save = environment.defaultSave("2026-08-31T10:00:00.000Z");
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
