import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { runInNewContext } from "node:vm";
import { build } from "esbuild";
import ts from "typescript";

const source = await readFile(new URL("../app/game/GameClient.tsx", import.meta.url), "utf8");
const ast = ts.createSourceFile("GameClient.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
function findNode(predicate) {
  let result;
  const visit = (node) => { if (predicate(node)) result = node; else ts.forEachChild(node, visit); };
  visit(ast);
  assert.ok(result, "production handler exists");
  return result;
}
function productionFunction(name, environment) {
  const node = findNode((node) => (ts.isVariableDeclaration(node) || ts.isFunctionDeclaration(node)) && node.name?.getText(ast) === name);
  const implementation = ts.isFunctionDeclaration(node) ? node.getText(ast) : `const ${name} = ${node.initializer.arguments[0].getText(ast)};`;
  const compiled = ts.transpileModule(implementation, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } }).outputText;
  return runInNewContext(`(() => { ${compiled}; return ${name}; })()`, environment);
}
const bundled = await build({
  stdin: {
    contents: 'export * from "./app/game/save"; export * from "./app/game/systems/activeHuntSave"; export * from "./app/game/systems/explorationProgress";',
    resolveDir: process.cwd(), loader: "ts",
  },
  bundle: true, write: false, format: "esm", platform: "node", logLevel: "silent",
});
const real = await import(`data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text).toString("base64")}`);
const room = { discoveredRoomIds: ["jungle-pilot-module"] };
const ability = { abilityIds: ["aerial-boost"] };
const cache = { secretIds: ["jungle-clan-cache"] };
const plain = value => JSON.parse(JSON.stringify(value));

function fixture() {
  const values = new Map();
  const observed = { saveUpdates: [], runtimeUpdates: [], campaignWrites: 0, mainReads: 0, failure: null };
  const storage = {
    values, denyCampaignWrites: false, denyHuntReads: false,
    getItem(key) {
      if (key === real.SAVE_STORAGE_KEY) observed.mainReads++;
      if (key === real.ACTIVE_HUNT_STORAGE_KEY && storage.denyHuntReads) throw Error("read unavailable");
      return values.get(key) ?? null;
    },
    setItem(key, value) {
      if (key === real.SAVE_STORAGE_KEY) {
        if (storage.denyCampaignWrites) throw Error("quota");
        observed.campaignWrites++;
      }
      values.set(key, value);
    },
    removeItem(key) { values.delete(key); },
  };
  const first = real.writeSaveWithStatus(real.defaultSave("2026-08-31T09:00:00.000Z"), storage).save;
  const session = {
    ownerSaveCreatedAt: first.createdAt, missionId: "jungle-vey", difficultyId: "hunter",
    encounterRun: 0, runId: "pilot-run", sequence: 0, startedAt: "2026-08-31T09:01:00.000Z",
    configuration: {}, lastPersisted: null, lastAttempted: null,
  };
  const environment = {
    save: first, saveRef: { current: first }, activeHuntSessionRef: { current: session },
    activeHuntWriteFailureRef: { current: null }, missionSettlementRef: { current: false }, pendingTerminalRunRef: { current: null },
    mergeExplorationProgress: real.mergeExplorationProgress,
    writeSaveWithStatus: (save) => real.writeSaveWithStatus(save, storage),
    loadActiveHuntSave: () => real.loadActiveHuntSave({ storage }),
    writeActiveHuntSave: (save) => real.writeActiveHuntSave(plain(save), { storage }),
    clearActiveHuntSave: (options) => real.clearActiveHuntSave({ ...options, storage }),
    applyMissionResult: real.applyMissionResult,
    ACTIVE_HUNT_SAVE_VERSION: real.ACTIVE_HUNT_SAVE_VERSION,
    ACTIVE_HUNT_RUNTIME_REVISION: real.ACTIVE_HUNT_RUNTIME_REVISION,
    // Deliberately keep environment.save stale: React has not rendered again.
    setSave: (save) => observed.saveUpdates.push(save),
    setSaveFailure: (failure) => { observed.failure = failure; },
    setHuntRuntimeSave: (save) => observed.runtimeUpdates.push(save),
    setPendingHuntResult() {}, setHuntResumePayload() {}, setResumableHunt() {},
    setSelectedMission() {}, setScreen() {}, setLastResult() {}, setLastRewardSummary() {}, setToast() {}, playSound() {},
  };
  for (const name of ["explorationWriteFailure", "reconcileHuntWrite", "clearHuntSession", "checkHuntSessionForSettlement", "persistActiveHunt", "persistExplorationProgress", "persist", "completeMission"]) {
    environment[name] = productionFunction(name, environment);
  }
  const checkpoint = () => environment.persistActiveHunt({ elapsed: 2, snapshot: { health: 100 }, retryCheckpoint: null });
  return { observed, storage, environment, session, checkpoint, discover: environment.persistExplorationProgress,
    readCampaign: () => JSON.parse(values.get(real.SAVE_STORAGE_KEY)),
  };
}

test("consecutive discovery callbacks union before React rerenders and never restart the frozen runtime", () => {
  const f = fixture();
  const frozen = f.environment.save;
  f.discover(room);
  f.discover(ability);
  f.discover(cache);
  assert.deepEqual(f.readCampaign().exploration, real.mergeExplorationProgress(room, ability, cache));
  assert.equal(f.environment.save, frozen, "test exercises stale render closure");
  assert.deepEqual(f.observed.runtimeUpdates, []);
  assert.deepEqual(frozen.exploration, real.defaultExplorationProgress());
  assert.equal(f.readCampaign().createdAt, frozen.createdAt);
  assert.equal(f.readCampaign().missionProgress["jungle-vey"].attempts, 0);
  assert.equal(f.readCampaign().profile.honor, 0);
  assert.equal(f.readCampaign().profile.clanMarks, 0);
  const writes = f.observed.campaignWrites;
  f.discover({ ...ability, debug: true });
  assert.equal(f.observed.campaignWrites, writes, "duplicate snapshots cause no disk writes");
});

test("an immediate campaign discovery write remains compatible with the first and later hunt checkpoints", () => {
  const f = fixture();
  f.discover(ability);
  const first = f.checkpoint();
  assert.equal(first.sequence, 1);
  f.discover(cache);
  const second = f.checkpoint();
  assert.equal(second.sequence, 2);
  assert.equal(second.runId, first.runId);
  const saved = f.readCampaign();
  assert.equal(real.checkActiveHuntCompatibility(second, {
    ownerSaveCreatedAt: saved.createdAt,
    encounterRun: saved.missionProgress["jungle-vey"].attempts,
    missionAvailable: true,
  }).compatible, true);
  assert.deepEqual(saved.exploration, real.mergeExplorationProgress(ability, cache));
});

test("a terminal callback in the same frame retains discoveries even with a legacy result snapshot", () => {
  const f = fixture();
  f.discover(ability);
  f.discover(cache);
  f.environment.completeMission({
    missionId: "jungle-vey", difficultyId: "hunter", outcome: "abandoned",
    score: 0, elapsedSeconds: 5, completedObjectiveIds: [], honorEvents: [],
    trophyQuality: null, trophyClaims: [], kills: 0, scans: 0,
    secondWindUsed: false, completedAt: "2026-08-31T09:05:00.000Z",
  }, true);
  assert.deepEqual(f.readCampaign().exploration, real.mergeExplorationProgress(ability, cache));
  assert.equal(f.readCampaign().missionProgress["jungle-vey"].attempts, 1);
  assert.equal(f.readCampaign().profile.honor, 0);
});

test("quota keeps discoveries in memory and the explicit retry persists their union", () => {
  const f = fixture();
  f.storage.denyCampaignWrites = true;
  f.discover(ability);
  f.discover(cache);
  assert.equal(f.observed.failure, "write-failed");
  assert.deepEqual(f.readCampaign().exploration, real.defaultExplorationProgress());
  assert.deepEqual(plain(f.environment.saveRef.current.exploration), real.mergeExplorationProgress(ability, cache));
  f.storage.denyCampaignWrites = false;
  f.environment.persist(f.environment.saveRef.current);
  assert.equal(f.observed.failure, null);
  assert.deepEqual(f.readCampaign().exploration, real.mergeExplorationProgress(ability, cache));
  assert.deepEqual(f.observed.runtimeUpdates, []);
});

test("a stale settings or retry payload cannot erase a discovery from the same render", () => {
  const f = fixture();
  f.discover(ability);
  f.environment.persist({ ...f.environment.save, settings: { ...f.environment.save.settings, musicVolume: 0.1 } });
  assert.deepEqual(f.readCampaign().exploration.abilityIds, ["aerial-boost"]);
  assert.equal(f.readCampaign().settings.musicVolume, 0.1);
});

test("newer same-owner and replacement campaigns are never blessed by a reload or overwritten", () => {
  for (const replaceOwner of [false, true]) {
    const f = fixture();
    const foreign = f.readCampaign();
    foreign.profile.honor = 999;
    if (replaceOwner) foreign.createdAt = "2026-08-31T11:00:00.000Z";
    const bytes = JSON.stringify(foreign);
    f.storage.values.set(real.SAVE_STORAGE_KEY, bytes);
    const writes = f.observed.campaignWrites;
    f.discover(ability);
    assert.equal(f.storage.values.get(real.SAVE_STORAGE_KEY), bytes);
    assert.equal(f.observed.campaignWrites, writes);
    assert.equal(f.observed.failure, "save-conflict");
    assert.deepEqual(f.environment.saveRef.current.exploration, real.defaultExplorationProgress());
  }
});

test("a different or newer hunt sidecar cannot write discoveries, including an explicit quota retry", () => {
  for (const field of ["runId", "sequence", "ownerSaveCreatedAt", "encounterRun"]) {
    const f = fixture();
    const first = f.checkpoint();
    f.storage.denyCampaignWrites = true;
    f.discover(ability);
    f.storage.denyCampaignWrites = false;
    const newer = { ...first, [field]: typeof first[field] === "number" ? first[field] + 1 : `${first[field]}-other` };
    if (field === "ownerSaveCreatedAt") newer.ownerSaveCreatedAt = "2026-08-31T11:00:00.000Z";
    f.storage.values.set(real.ACTIVE_HUNT_STORAGE_KEY, JSON.stringify(newer));
    const campaign = f.storage.values.get(real.SAVE_STORAGE_KEY);
    const writes = f.observed.campaignWrites;
    f.discover(cache);
    f.environment.persist(f.environment.saveRef.current);
    assert.equal(f.observed.failure, "save-conflict");
    assert.equal(f.observed.campaignWrites, writes);
    assert.equal(f.storage.values.get(real.SAVE_STORAGE_KEY), campaign);
    assert.equal(f.storage.values.get(real.ACTIVE_HUNT_STORAGE_KEY), JSON.stringify(newer));
  }
});

test("unreadable or future hunt ownership cannot mutate the campaign", () => {
  for (const failure of ["unreadable", "future"]) {
    const f = fixture();
    const initial = f.checkpoint();
    const bytes = f.storage.values.get(real.SAVE_STORAGE_KEY);
    if (failure === "unreadable") f.storage.denyHuntReads = true;
    else f.storage.values.set(real.ACTIVE_HUNT_STORAGE_KEY, JSON.stringify({ ...initial, runtimeRevision: real.ACTIVE_HUNT_RUNTIME_REVISION + 1 }));
    f.discover(ability);
    assert.equal(f.storage.values.get(real.SAVE_STORAGE_KEY), bytes);
    assert.equal(f.observed.failure, failure === "unreadable" ? "read-failed" : "protected-save");
    if (failure === "unreadable") {
      assert.deepEqual(plain(f.environment.saveRef.current.exploration.abilityIds), ["aerial-boost"]);
      f.storage.denyHuntReads = false;
      f.environment.persist(f.environment.saveRef.current);
      assert.deepEqual(f.readCampaign().exploration.abilityIds, ["aerial-boost"]);
    }
  }
});

test("a stale local owner, settled run, missing session or non-pilot hunt cannot inject exploration", () => {
  for (const change of ["owner", "attempt", "locked", "settled", "pending", "missing", "mission"]) {
    const f = fixture();
    if (change === "owner") f.environment.saveRef.current = real.defaultSave("2026-08-31T12:00:00.000Z");
    if (change === "attempt") f.environment.saveRef.current.missionProgress["jungle-vey"].attempts++;
    if (change === "locked") f.environment.saveRef.current.missionProgress["jungle-vey"].status = "locked";
    if (change === "settled") f.environment.missionSettlementRef.current = true;
    if (change === "pending") f.environment.pendingTerminalRunRef.current = "prior-run";
    if (change === "missing") f.environment.activeHuntSessionRef.current = null;
    if (change === "mission") f.environment.activeHuntSessionRef.current.missionId = "ice-cryostalker";
    const writes = f.observed.campaignWrites;
    f.discover(ability);
    assert.equal(f.observed.campaignWrites, writes);
    assert.deepEqual(f.environment.saveRef.current.exploration, real.defaultExplorationProgress());
  }
});

test("our exact unconfirmed checkpoint is reconciled before persisting exploration", () => {
  const f = fixture();
  const writer = f.environment.writeActiveHuntSave;
  f.environment.writeActiveHuntSave = (value) => {
    const result = writer(value);
    assert.equal(result.persisted, true);
    return { ...result, persisted: false, failure: "write-failed" };
  };
  f.checkpoint();
  assert.equal(f.session.sequence, 0);
  assert.ok(f.session.lastAttempted);
  f.discover(ability);
  assert.equal(f.session.sequence, 1);
  assert.equal(f.observed.failure, null);
  assert.deepEqual(f.readCampaign().exploration.abilityIds, ["aerial-boost"]);
});

test("a vanished previously confirmed checkpoint cannot be treated as a fresh unsaved hunt", () => {
  const f = fixture();
  assert.ok(f.checkpoint());
  f.storage.values.delete(real.ACTIVE_HUNT_STORAGE_KEY);
  const bytes = f.storage.values.get(real.SAVE_STORAGE_KEY);
  f.discover(ability);
  assert.equal(f.observed.failure, "save-conflict");
  assert.equal(f.storage.values.get(real.SAVE_STORAGE_KEY), bytes);
});

test("HuntCanvas receives the frozen exploration state and the persistence callback", () => {
  const canvas = findNode(node => ts.isJsxSelfClosingElement(node) && node.tagName.getText(ast) === "HuntCanvas");
  const prop = (name) => canvas.attributes.properties.find(node => node.name?.getText(ast) === name)?.initializer?.expression?.getText(ast);
  assert.equal(prop("explorationProgress"), "activeMissionSave.exploration");
  assert.equal(prop("onExplorationProgress"), "persistExplorationProgress");
});
