import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";

const bundle = await build({
  stdin: {
    contents: 'export * from "./app/game/systems/explorationProgress"; export * from "./app/game/save"; export { MISSION_BY_ID } from "./app/game/data";',
    resolveDir: process.cwd(), loader: "ts",
  },
  bundle: true, write: false, format: "esm", platform: "node", logLevel: "silent",
});
const {
  defaultExplorationProgress, normalizeExplorationProgress,
  mergeExplorationProgress, explorationBonuses, explorationForMission, isExplorationMission, SAVE_VERSION,
  defaultSave, normalizeSave, applyMissionResult, writeSaveWithStatus,
  loadSaveWithStatus, exportSave, parseSaveImport, MISSION_BY_ID,
} = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString("base64")}`);

const createdAt = "2026-08-31T08:00:00.000Z";
const acquired = {
  abilityIds: ["aerial-boost"],
  openedGateIds: ["jungle-resonance-seal"],
  secretIds: ["jungle-clan-cache"],
  discoveredRoomIds: ["jungle-pilot-approach", "jungle-pilot-module", "jungle-pilot-archive"],
};
function result(overrides = {}) {
  const mission = MISSION_BY_ID[overrides.missionId ?? "jungle-vey"];
  return {
    missionId: mission.id, difficultyId: "hunter", outcome: "failed", score: 65,
    elapsedSeconds: 120, completedObjectiveIds: [], honorEvents: [],
    trophyQuality: null, trophyClaims: [], kills: 0, scans: 0,
    secondWindUsed: false, completedAt: "2026-08-31T08:02:00.000Z",
    ...overrides,
  };
}
function victory(exploration) {
  const mission = MISSION_BY_ID["jungle-vey"];
  return result({
    outcome: "success", exploration, trophyQuality: "blooded",
    completedObjectiveIds: mission.objectives.filter(({ required, kind }) => required || kind === "extract").map(({ id }) => id),
    trophyClaims: [{
      id: "pilot-apex-trophy", definitionId: mission.trophy.id,
      targetName: mission.targetName, targetKind: mission.targetKind,
      partId: mission.trophy.partId, condition: "intact", quality: "blooded",
    }],
  });
}
function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
}

test("new campaign exploration is empty and all default collections have separate ownership", () => {
  const first = defaultExplorationProgress();
  const second = defaultExplorationProgress();
  first.abilityIds.push("aerial-boost");
  first.openedGateIds.push("jungle-resonance-seal");
  first.secretIds.push("jungle-clan-cache");
  first.discoveredRoomIds.push("jungle-pilot-module");
  assert.deepEqual(second, { abilityIds: [], openedGateIds: [], secretIds: [], discoveredRoomIds: [] });
  assert.deepEqual(defaultSave(createdAt).exploration, second);
  assert.equal(SAVE_VERSION, 6);
});

test("exploration normalization rejects malformed collections and arbitrary ids or fields", () => {
  for (const input of [null, undefined, 0, true, "aerial-boost", [acquired]]) {
    assert.deepEqual(normalizeExplorationProgress(input), defaultExplorationProgress());
  }
  const input = {
    abilityIds: [null, "aerial-boost", "admin-flight", "aerial-boost", 1],
    openedGateIds: ["jungle-canopy-hatch", "jungle-resonance-seal", "ice-gate", "jungle-canopy-hatch"],
    secretIds: ["jungle-clan-cache", "jungle-clan-cache", "grant-currency", {}],
    discoveredRoomIds: ["jungle-pilot-descent", "jungle-pilot-approach", "jungle-pilot-descent", "__proto__"],
    honor: 1000000, maxEnergy: 5000, debugUnlocked: true,
  };
  const before = structuredClone(input);
  assert.deepEqual(normalizeExplorationProgress(input), {
    abilityIds: ["aerial-boost"],
    openedGateIds: ["jungle-resonance-seal", "jungle-canopy-hatch"],
    secretIds: ["jungle-clan-cache"],
    discoveredRoomIds: ["jungle-pilot-approach", "jungle-pilot-descent"],
  });
  assert.deepEqual(input, before);
  assert.deepEqual(normalizeExplorationProgress({ abilityIds: "aerial-boost", openedGateIds: {}, secretIds: true, discoveredRoomIds: 8 }), defaultExplorationProgress());
});

test("exploration merges preserve both routes and are deterministic, idempotent and immutable", () => {
  const branch = { openedGateIds: ["jungle-canopy-hatch"], discoveredRoomIds: ["jungle-pilot-underpass", "jungle-pilot-gallery", "jungle-pilot-descent"] };
  const before = structuredClone(acquired);
  const merged = mergeExplorationProgress(null, acquired, branch, acquired);
  assert.deepEqual(merged, mergeExplorationProgress(branch, acquired));
  assert.deepEqual(merged, mergeExplorationProgress(merged, merged));
  assert.deepEqual(merged.openedGateIds, ["jungle-resonance-seal", "jungle-canopy-hatch"]);
  assert.equal(merged.discoveredRoomIds.length, 6);
  assert.deepEqual(acquired, before);
  merged.abilityIds.length = 0;
  assert.deepEqual(acquired.abilityIds, ["aerial-boost"]);
  assert.deepEqual(mergeExplorationProgress(), defaultExplorationProgress());
});

test("the clan cache adds exactly fifteen maximum energy once without accepting serialized bonus values", () => {
  assert.deepEqual(explorationBonuses(null), { maxEnergy: 0 });
  assert.deepEqual(explorationBonuses({ maxEnergy: 9999, secretIds: ["fake-cache"] }), { maxEnergy: 0 });
  assert.deepEqual(explorationBonuses({ secretIds: Array(100).fill("jungle-clan-cache"), maxEnergy: 9999 }), { maxEnergy: 15 });
  assert.deepEqual(explorationBonuses(mergeExplorationProgress(acquired, acquired)), { maxEnergy: 15 });
});

test("schema four migration preserves the campaign but cannot infer or inject exploration unlocks", () => {
  const current = defaultSave(createdAt);
  current.profile.hunterName = "Kra'vak";
  current.profile.honor = 47;
  current.profile.clanMarks = 123;
  current.statistics.totalScans = 29;
  current.settings.masterVolume = 0.25;
  const legacy = structuredClone(current);
  legacy.version = 4;
  legacy.exploration = acquired;
  const before = structuredClone(legacy);
  const migrated = normalizeSave(legacy);
  assert.equal(migrated.version, 6);
  assert.deepEqual(migrated.exploration, defaultExplorationProgress());
  assert.deepEqual(migrated, normalizeSave(current));
  assert.deepEqual(legacy, before);
  delete legacy.exploration;
  assert.deepEqual(normalizeSave(legacy).exploration, defaultExplorationProgress());
});

test("schema six normalization retains authored exploration and strips unknown data", () => {
  const save = defaultSave(createdAt);
  save.exploration = { ...acquired, abilityIds: ["aerial-boost", "flight"], secretIds: ["jungle-clan-cache", "money-cache"], runtimePosition: { x: 900 } };
  const normalized = normalizeSave(save);
  assert.deepEqual(normalized.exploration, acquired);
  assert.deepEqual(normalizeSave({ ...save, exploration: null }).exploration, defaultExplorationProgress());
});

test("failed and abandoned hunts retain discoveries while preserving previous gates and currency", () => {
  for (const outcome of ["failed", "abandoned"]) {
    const save = defaultSave(createdAt);
    save.profile.honor = 100;
    save.profile.clanMarks = 200;
    save.exploration.openedGateIds = ["jungle-canopy-hatch"];
    const settled = applyMissionResult(save, result({ outcome, exploration: acquired }));
    assert.deepEqual(settled.exploration, mergeExplorationProgress(save.exploration, acquired));
    assert.equal(settled.profile.honor, 100);
    assert.equal(settled.profile.clanMarks, 200);
    assert.equal(settled.missionProgress["jungle-vey"].completions, 0);
    assert.deepEqual(explorationBonuses(settled.exploration), { maxEnergy: 15 });
    const repeated = applyMissionResult(settled, result({ outcome, exploration: acquired }));
    assert.deepEqual(repeated.exploration, settled.exploration);
    assert.equal(repeated.profile.honor, 100);
    assert.equal(repeated.profile.clanMarks, 200);
    assert.deepEqual(explorationBonuses(repeated.exploration), { maxEnergy: 15 });
  }
});

test("a legitimate victory merges exploration without altering its honor or clan-mark settlement", () => {
  const save = defaultSave(createdAt);
  const withoutCache = applyMissionResult(save, victory());
  const withCache = applyMissionResult(save, victory(acquired));
  assert.equal(withCache.missionProgress["jungle-vey"].completions, 1);
  assert.equal(withCache.missionProgress["ice-cryostalker"].status, "available");
  assert.deepEqual(withCache.exploration, acquired);
  assert.equal(withCache.profile.honor, withoutCache.profile.honor);
  assert.equal(withCache.profile.clanMarks, withoutCache.profile.clanMarks);
  assert.deepEqual(withCache.trophies, withoutCache.trophies);
  assert.deepEqual(save.exploration, defaultExplorationProgress());
});

test("rejected successes cannot smuggle in an ability or secret, and legacy results preserve acquisitions", () => {
  const save = defaultSave(createdAt);
  const rejected = applyMissionResult(save, result({ outcome: "success", exploration: acquired }));
  assert.deepEqual(rejected, save);
  save.exploration = structuredClone(acquired);
  assert.deepEqual(applyMissionResult(save, result()).exploration, acquired);
});

test("another mission cannot claim pilot discoveries but never erases existing acquisitions", () => {
  const save = defaultSave(createdAt);
  const foreign = result({ missionId: "ice-cryostalker", exploration: acquired });
  assert.deepEqual(applyMissionResult(save, foreign).exploration, defaultExplorationProgress());
  save.exploration = structuredClone(acquired);
  assert.deepEqual(applyMissionResult(save, foreign).exploration, acquired);
});

test("campaign storage and exported save round-trip permanent unlocks with existing owner metadata", () => {
  const save = defaultSave(createdAt);
  save.exploration = structuredClone(acquired);
  const storage = memoryStorage();
  const written = writeSaveWithStatus(save, storage, "exploration-save");
  assert.equal(written.persisted, true);
  const loaded = loadSaveWithStatus(storage, "exploration-save");
  assert.equal(loaded.loaded, true);
  assert.equal(loaded.save.createdAt, createdAt);
  assert.deepEqual(loaded.save.exploration, acquired);
  const imported = parseSaveImport(exportSave(loaded.save));
  assert.equal(imported.failure, null);
  assert.equal(imported.save.version, 6);
  assert.deepEqual(imported.save.exploration, acquired);
});

const iceAcquired = {
  abilityIds: [],
  openedGateIds: ["ice-mine-relay", "ice-return-hatch"],
  secretIds: ["ice-clan-cache"],
  discoveredRoomIds: ["ice-region-approach", "ice-region-shaft", "ice-region-relay", "ice-region-vault", "ice-region-return"],
};

test("exploration mission provenance separates authored missions from malformed ids", () => {
  for (const id of ["jungle-vey", "ice-cryostalker", "volcano-bad-blood"]) assert.equal(isExplorationMission(id), true);
  for (const id of [undefined, null, {}, true, 1, "unknown-hunt", "jungle-vey "]) {
    assert.equal(isExplorationMission(id), false);
    assert.deepEqual(explorationForMission(id, acquired), defaultExplorationProgress());
  }
  const both = mergeExplorationProgress(acquired, iceAcquired);
  const before = structuredClone(both);
  assert.deepEqual(explorationForMission("jungle-vey", both), acquired);
  assert.deepEqual(explorationForMission("ice-cryostalker", both), iceAcquired);
  assert.deepEqual(both, before);
  assert.deepEqual(explorationForMission("ice-cryostalker", { abilityIds: ["aerial-boost"] }), defaultExplorationProgress());
});

test("two authored caches provide thirty energy once while either individual cache provides fifteen", () => {
  assert.deepEqual(explorationBonuses(iceAcquired), { maxEnergy: 15 });
  const both = mergeExplorationProgress(acquired, iceAcquired, acquired, iceAcquired);
  assert.deepEqual(explorationBonuses(both), { maxEnergy: 30 });
  assert.deepEqual(explorationBonuses({ secretIds: Array(50).fill("ice-clan-cache") }), { maxEnergy: 15 });
  assert.deepEqual(explorationBonuses({ secretIds: [...Array(50).fill("ice-clan-cache"), ...Array(50).fill("jungle-clan-cache"), "fake-cache"], maxEnergy: 999 }), { maxEnergy: 30 });
});

test("schema five migrates existing jungle discoveries without granting future ice fields", () => {
  const legacy = applyMissionResult(defaultSave(createdAt), victory(acquired));
  legacy.version = 5;
  legacy.settings.masterVolume = 0.37;
  legacy.exploration = mergeExplorationProgress(acquired, iceAcquired);
  const before = structuredClone(legacy);
  const migrated = normalizeSave(legacy);
  assert.equal(migrated.version, 6);
  assert.deepEqual(migrated.exploration, acquired);
  assert.deepEqual(migrated, normalizeSave({ ...legacy, version: 6, exploration: acquired }));
  assert.deepEqual(legacy, before);
  assert.deepEqual(parseSaveImport(JSON.stringify(legacy)).save.exploration, acquired);
});

test("ice failure or abandonment unions both regions without awarding the jungle ability or repeated currency", () => {
  for (const outcome of ["failed", "abandoned"]) {
    const noBoost = applyMissionResult(defaultSave(createdAt), victory());
    const poisoned = mergeExplorationProgress(acquired, iceAcquired);
    const iceResult = result({ missionId: "ice-cryostalker", outcome, exploration: poisoned });
    const settled = applyMissionResult(noBoost, iceResult);
    assert.deepEqual(settled.exploration, iceAcquired);
    assert.equal(settled.profile.honor, noBoost.profile.honor);
    assert.equal(settled.profile.clanMarks, noBoost.profile.clanMarks);
    assert.deepEqual(applyMissionResult(settled, iceResult).exploration, iceAcquired);

    const inherited = { ...noBoost, exploration: structuredClone(acquired) };
    const withBoth = applyMissionResult(inherited, iceResult);
    assert.deepEqual(withBoth.exploration, poisoned);
    assert.deepEqual(explorationBonuses(withBoth.exploration), { maxEnergy: 30 });
  }
});

test("jungle and locked ice results cannot smuggle in discoveries outside their playable mission", () => {
  const fresh = defaultSave(createdAt);
  const both = mergeExplorationProgress(acquired, iceAcquired);
  assert.deepEqual(applyMissionResult(fresh, result({ exploration: both })).exploration, acquired);
  assert.deepEqual(applyMissionResult(fresh, result({ missionId: "ice-cryostalker", exploration: both })).exploration, defaultExplorationProgress());
  const unlocked = applyMissionResult(fresh, victory());
  assert.deepEqual(applyMissionResult(unlocked, result({ missionId: "ice-cryostalker", difficultyId: "elder", exploration: both })).exploration, defaultExplorationProgress());
});
