import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";

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
  const observations = { writes: 0, clears: 0, rewards: 0, sidecars: [], screen: "deck", sequence: 0 };
  const environment = {
    save: { createdAt: "2026-08-31T10:00:00Z", profile: { honor: 0, clanMarks: 0 }, settings: { difficultyId: "hunter" }, missionProgress: { first: { status: "available", attempts: 0 } } },
    selectedMission: { id: "first" }, missionSettlementRef: { current: false },
    activeHuntSessionRef: { current: null }, activeHuntWriteFailureRef: { current: null },
    normalizeSave: (save) => structuredClone(save),
    writeSaveWithStatus(save) { observations.writes++; return { save, persisted: true, failure: null }; },
    clearActiveHuntSave() { observations.clears++; return { cleared: true, failure: null }; },
    createHuntRunId: () => `run-${++observations.sequence}`,
    huntConfiguration: (save) => ({ difficulty: save.settings.difficultyId }),
    playSound() {}, setSave(save) { environment.save = save; }, setSaveFailure() {},
    setResumableHunt() {}, setHuntResumePayload() {}, setHuntRuntimeSave() {},
    setLastResult() {}, setLastRewardSummary() {},
    setScreen(screen) { observations.screen = screen; },
    persist(save) { environment.save = save; },
    applyMissionResult(save) {
      observations.rewards++;
      return { ...save, profile: { honor: save.profile.honor + 5, clanMarks: save.profile.clanMarks + 1 }, missionProgress: { first: { status: "completed", attempts: save.missionProgress.first.attempts + 1 } } };
    },
    ACTIVE_HUNT_SAVE_VERSION: 1, ACTIVE_HUNT_RUNTIME_REVISION: 1,
    writeActiveHuntSave(value) { observations.sidecars.push(value); return { persisted: true, save: value, failure: null }; },
  };
  environment.clearHuntSession = callback("clearHuntSession", environment);
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
  assert.equal(observations.writes, 2);
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
