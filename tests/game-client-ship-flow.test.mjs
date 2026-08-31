import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { mergeExplorationProgress } from "../app/game/systems/explorationProgress.ts";

const source = await readFile(new URL("../app/game/GameClient.tsx", import.meta.url), "utf8");
const ast = ts.createSourceFile("GameClient.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
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
function fixture() {
  const observations = { writes: 0, clears: 0, rewards: 0, sidecars: [], screen: "deck", sequence: 0, events: [] };
  const environment = {
    save: { createdAt: "2026-08-31T10:00:00Z", profile: { honor: 0, clanMarks: 0 }, settings: { difficultyId: "hunter" }, missionProgress: { first: { status: "available", attempts: 0 } } },
    selectedMission: { id: "first" }, missionSettlementRef: { current: false },
    activeHuntSessionRef: { current: null }, activeHuntWriteFailureRef: { current: null }, pendingTerminalRunRef: { current: null },
    mergeExplorationProgress,
    normalizeSave: (save) => structuredClone(save),
    writeSaveWithStatus(save) { observations.writes++; observations.events.push("write"); return { save, persisted: true, failure: null }; },
    clearActiveHuntSave(options) { observations.clears++; observations.events.push(["clear", options?.expectedRunId]); observations.currentHunt = null; return { cleared: true, failure: null }; },
    loadActiveHuntSave() { return { save: observations.currentHunt ?? null, failure: null }; },
    createHuntRunId: () => `run-${++observations.sequence}`,
    huntConfiguration: (save) => ({ difficulty: save.settings.difficultyId }),
    playSound() {}, setSave(save) { environment.save = save; }, setSaveFailure() {},
    setResumableHunt() {}, setHuntResumePayload() {}, setHuntRuntimeSave() {}, setSelectedMission() {},
    setPendingHuntResult(value) { observations.pendingResult = value; },
    setLastResult(value) { observations.lastResult = value; }, setLastRewardSummary(value) { observations.lastRewardSummary = value; }, setToast() {},
    setScreen(screen) { observations.screen = screen; },
    persist(save) { environment.save = save; },
    applyMissionResult(save) {
      observations.rewards++;
      return { ...save, profile: { honor: save.profile.honor + 5, clanMarks: save.profile.clanMarks + 1 }, missionProgress: { first: { status: "completed", attempts: save.missionProgress.first.attempts + 1 } } };
    },
    ACTIVE_HUNT_SAVE_VERSION: 1, ACTIVE_HUNT_RUNTIME_REVISION: 1,
    writeActiveHuntSave(value) { observations.currentHunt = value; observations.sidecars.push(value); return { persisted: true, save: value, failure: null }; },
  };
  environment.saveRef = { current: environment.save };
  environment.clearHuntSession = callback("clearHuntSession", environment);
  environment.reconcileHuntWrite = callback("reconcileHuntWrite", environment);
  environment.checkHuntSessionForSettlement = callback("checkHuntSessionForSettlement", environment);
  return { observations, environment, launch: callback("launchMission", environment), finish: callback("completeMission", environment), autosave: callback("persistActiveHunt", environment) };
}

test("first launch persists the campaign owner and each replay opens a fresh autosave run", () => {
  const { environment, observations, launch, finish, autosave } = fixture();
  launch();
  assert.equal(observations.screen, "mission");
  assert.equal(observations.writes, 1);
  assert.equal(environment.activeHuntSessionRef.current.ownerSaveCreatedAt, environment.save.createdAt);
  autosave({ elapsed: 12, snapshot: { health: 80 }, retryCheckpoint: null });
  finish({ outcome: "failure" });
  assert.equal(observations.screen, "debrief");
  assert.equal(environment.activeHuntSessionRef.current, null);
  // Follow the real debrief button, not a separately reproduced replay routine.
  const replayButton = findNode((node) => ts.isJsxElement(node) && node.openingElement.tagName.getText(ast) === "button" && node.children.some((child) => ts.isJsxText(child) && child.text.includes("Rejouer la chasse")));
  const click = replayButton.openingElement.attributes.properties.find((attr) => attr.name?.getText(ast) === "onClick");
  const replay = callback(click.initializer.expression.getText(ast), environment);
  replay();
  autosave({ elapsed: 1, snapshot: { health: 100 }, retryCheckpoint: null });
  assert.equal(observations.writes, 3);
  assert.notEqual(observations.sidecars[0].runId, observations.sidecars[1].runId);
  assert.equal(observations.sidecars[1].sequence, 1);
  assert.equal(observations.sidecars[1].encounterRun, 1);
  assert.equal(observations.sidecars[1].snapshot.health, 100);
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
  environment.save.missionProgress.first.status = "locked";
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
