import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const bundle = await build({
  entryPoints: [fileURLToPath(new URL("../app/game/systems/pitSave.ts", import.meta.url))],
  bundle: true,
  format: "esm",
  platform: "node",
  target: "es2022",
  write: false,
});
const runtime = await import(
  "data:text/javascript;base64," + Buffer.from(bundle.outputFiles[0].text).toString("base64")
);

async function loadSystem(relativePath) {
  const systemBundle = await build({
    entryPoints: [fileURLToPath(new URL(relativePath, import.meta.url))],
    bundle: true,
    format: "esm",
    platform: "node",
    target: "es2022",
    write: false,
  });
  return import(
    "data:text/javascript;base64," +
      Buffer.from(systemBundle.outputFiles[0].text).toString("base64")
  );
}

const [arcadeRuntime, circuitRuntime] = await Promise.all([
  loadSystem("../app/game/systems/pitArcade.ts"),
  loadSystem("../app/game/systems/pitCircuit.ts"),
]);

const {
  PIT_SAVE_ALLOWED_COSMETIC_IDS,
  PIT_SAVE_CIRCUIT_COSMETIC_IDS,
  PIT_SAVE_DESCENT_COSMETIC_ID,
  PIT_SAVE_MAX_SERIALIZED_BYTES,
  PIT_SAVE_RUNTIME_REVISION,
  PIT_SAVE_STORAGE_KEY,
  PIT_SAVE_VERSION,
  applyPitResult,
  clearPitSave,
  createPitSave,
  getPitCircuitRun,
  getPitDescentRun,
  loadPitSave,
  normalizePitSave,
  persistPitCircuitRun,
  persistPitDescentRun,
  pitSaveStorageKey,
  removePitCircuitRun,
  removePitDescentRun,
  replacePitCircuitRun,
  replacePitDescentRun,
  serializePitSave,
  updatePitTrainingPreferences,
  writePitSave,
} = runtime;

const OWNER = "2026-09-04T10:00:00.000Z";

function memoryStorage(initial = []) {
  const values = new Map(initial);
  return {
    values,
    getItem(key) {
      return values.get(key) ?? null;
    },
    setItem(key, value) {
      values.set(key, value);
    },
    removeItem(key) {
      values.delete(key);
    },
  };
}

function result(overrides = {}) {
  return {
    id: "pit-result-001",
    mode: "cpu",
    outcome: "victory",
    fighterId: "jungle-hunter",
    roundsWon: 2,
    roundsLost: 1,
    completedAt: "2026-09-04T10:05:00.000Z",
    ...overrides,
  };
}

const CIRCUIT_ARENAS = [
  "the-pit",
  "canopy-causeway",
  "frost-chamber",
  "ash-courtyard",
  "trophy-hall",
  "glass-terrace",
  "abyssal-bridge",
  "canopy-causeway",
  "frost-chamber",
  "ash-courtyard",
  "the-pit",
  "ruins-tribunal",
];
const CIRCUIT_REWARDS = new Map([
  [0, "pit-emblem-circle-call"],
  [3, "pit-banner-three-paths"],
  [5, "pit-title-trophy-keeper"],
  [9, "pit-palette-ashen-circle"],
  [11, "pit-intro-elder-verdict"],
]);

function circuitResult(fightIndex, overrides = {}) {
  const rewardId = CIRCUIT_REWARDS.get(fightIndex);
  return result({
    id: "circuit-valkyrie-" + (fightIndex + 1),
    mode: "circuit",
    fighterId: "valkyrie",
    arenaId: CIRCUIT_ARENAS[fightIndex],
    circuitFightIndex: fightIndex,
    circuitCompleted: fightIndex === 11,
    cosmeticRewardIds: rewardId ? [rewardId] : [],
    completedAt: "2026-09-04T11:" + String(fightIndex).padStart(2, "0") + ":00.000Z",
    ...overrides,
  });
}

function completedCircuitSave() {
  let save = createPitSave(OWNER);
  for (let fightIndex = 0; fightIndex < 12; fightIndex += 1) {
    save = applyPitResult(save, circuitResult(fightIndex)).save;
  }
  return save;
}

test("a PIT V5 save round-trips through its dedicated storage key", () => {
  const storage = memoryStorage();
  const initial = createPitSave(OWNER);
  const first = applyPitResult(initial, result()).save;
  const changed = updatePitTrainingPreferences(
    first,
    { guard: "alternating", showFrameData: true },
    "2026-09-04T10:06:00.000Z",
  );

  assert.equal(writePitSave(changed, { storage }).persisted, true);
  assert.equal(storage.values.has(PIT_SAVE_STORAGE_KEY), true);
  const loaded = loadPitSave({ storage, expectedOwnerSaveCreatedAt: OWNER });
  assert.equal(loaded.loaded, true);
  assert.equal(loaded.failure, null);
  assert.deepEqual(loaded.save, changed);
  assert.equal(loaded.save.sequence, 1);
  assert.equal(loaded.save.revision, 2);
  assert.equal(loaded.save.stats.cpu.matches, 1);
  assert.equal(loaded.save.stats.cpu.roundsPlayed, 3);
  assert.equal(loaded.save.trainingPreferences.guard, "alternating");
  assert.doesNotMatch(JSON.stringify(loaded.save), /honor|clanMarks|trophies|inventory/);
  assert.deepEqual(JSON.parse(serializePitSave(changed)), changed);
});

test("normalization migrates the V0 draft and repairs derived counters", () => {
  const migrated = normalizePitSave({
    version: 0,
    ownerSaveCreatedAt: OWNER,
    stats: {
      cpu: { wins: 3, losses: 2, matches: 1, rounds: 2, roundsWon: 6, roundsLost: 4 },
      local: { victories: 1 },
    },
    lastFighterId: "berserker",
    trainingPreferences: { opponentId: "jungle-hunter", guard: "low", showHitboxes: true },
    appliedResultIds: ["one", "one", "two", ""],
  });

  assert.ok(migrated);
  assert.equal(migrated.version, PIT_SAVE_VERSION);
  assert.equal(migrated.runtimeRevision, PIT_SAVE_RUNTIME_REVISION);
  assert.equal(migrated.createdAt, OWNER);
  assert.equal(migrated.revision, 6);
  assert.equal(migrated.sequence, 6);
  assert.deepEqual(migrated.appliedResultIds, ["one", "two"]);
  assert.equal(migrated.stats.cpu.matches, 5);
  assert.equal(migrated.stats.cpu.roundsPlayed, 10);
  assert.equal(migrated.stats.training.matches, 0);
  assert.equal(migrated.trainingPreferences.showHitboxes, true);
  assert.equal(normalizePitSave({ version: 1 }), null, "owner is mandatory");
});

test("V1 saves migrate to the complete twelve-fighter and eight-arena schema", () => {
  const legacy = {
    version: 1,
    runtimeRevision: 1,
    ownerSaveCreatedAt: OWNER,
    revision: 4,
    sequence: 2,
    createdAt: OWNER,
    updatedAt: OWNER,
    stats: {
      cpu: { wins: 1 },
      local: {},
      training: {},
    },
    lastFighterId: "berserker",
    trainingPreferences: { opponentId: "jungle-hunter" },
    appliedResultIds: ["legacy-one", "legacy-two"],
  };
  const migrated = normalizePitSave(legacy);
  assert.ok(migrated);
  assert.equal(migrated.version, PIT_SAVE_VERSION);
  assert.equal(migrated.runtimeRevision, PIT_SAVE_RUNTIME_REVISION);
  assert.equal(Object.keys(migrated.arcadeProgress).length, 12);
  assert.ok(Object.values(migrated.arcadeProgress).every(
    (progress) =>
      progress.bestEncounter === 0 &&
      progress.completions === 0 &&
      progress.nextEncounter === 0,
  ));
  assert.equal(migrated.stats.arcade.matches, 0);
  assert.equal(migrated.lastArenaId, "the-pit");
  assert.deepEqual(migrated.unlockedCosmeticIds, []);
});

test("V2 saves migrate their best run to the persistent Arcade cursor", () => {
  const legacy = JSON.parse(JSON.stringify(createPitSave(OWNER)));
  legacy.version = 2;
  legacy.runtimeRevision = 2;
  legacy.revision = 2;
  legacy.sequence = 2;
  legacy.stats.arcade = {
    matches: 2,
    victories: 2,
    defeats: 0,
    draws: 0,
    roundsPlayed: 4,
    roundsWon: 4,
    roundsLost: 0,
    roundsDrawn: 0,
  };
  legacy.arcadeProgress.wolf.bestEncounter = 2;
  legacy.appliedResultIds = ["legacy-arcade-one", "legacy-arcade-two"];
  for (const progress of Object.values(legacy.arcadeProgress)) {
    delete progress.nextEncounter;
  }

  const migrated = normalizePitSave(legacy);
  assert.ok(migrated);
  assert.equal(migrated.version, PIT_SAVE_VERSION);
  assert.equal(migrated.runtimeRevision, PIT_SAVE_RUNTIME_REVISION);
  assert.equal(migrated.arcadeProgress.wolf.bestEncounter, 2);
  assert.equal(migrated.arcadeProgress.wolf.nextEncounter, 2);
  assert.ok(Object.values(migrated.arcadeProgress).every(
    (progress) => Number.isInteger(progress.nextEncounter),
  ));
});

test("V3 migration preserves Arcade exactly and initializes Clan Circuit empty", () => {
  let arcade = createPitSave(OWNER);
  for (let encounterIndex = 0; encounterIndex < 8; encounterIndex += 1) {
    const final = encounterIndex === 7;
    arcade = applyPitResult(arcade, result({
      id: "legacy-v3-arcade-" + encounterIndex,
      mode: "arcade",
      fighterId: "wolf",
      arenaId: final ? "ruins-tribunal" : "frost-chamber",
      arcadeEncounterIndex: encounterIndex,
      arcadeCompleted: final,
      cosmeticRewardIds: final ? ["pit-palette-wolf-judgment"] : [],
      completedAt: "2026-09-04T10:" + String(20 + encounterIndex).padStart(2, "0") + ":00.000Z",
    })).save;
  }
  const expectedArcadeProgress = structuredClone(arcade.arcadeProgress);
  const expectedCosmetics = [...arcade.unlockedCosmeticIds];
  const legacy = structuredClone(arcade);
  legacy.version = 3;
  legacy.runtimeRevision = 3;
  delete legacy.stats.circuit;
  delete legacy.circuitProgress;

  const migrated = normalizePitSave(legacy);
  assert.ok(migrated);
  assert.equal(migrated.version, PIT_SAVE_VERSION);
  assert.deepEqual(migrated.arcadeProgress, expectedArcadeProgress);
  assert.deepEqual(migrated.unlockedCosmeticIds, expectedCosmetics);
  assert.deepEqual(migrated.stats.circuit, {
    matches: 0,
    victories: 0,
    defeats: 0,
    draws: 0,
    roundsPlayed: 0,
    roundsWon: 0,
    roundsLost: 0,
    roundsDrawn: 0,
  });
  assert.ok(Object.values(migrated.circuitProgress).every(
    (progress) =>
      progress.bestFight === 0 &&
      progress.completions === 0 &&
      progress.nextFight === 0,
  ));

  assert.equal(normalizePitSave({
    ...legacy,
    unlockedCosmeticIds: [...legacy.unlockedCosmeticIds, "pit-emblem-circle-call"],
  }), null, "pre-V4 saves cannot inject a future Circuit reward");
});

test("V4 migration preserves Circuit summaries and initializes resumable runs plus Descente", () => {
  const current = completedCircuitSave();
  const legacy = structuredClone(current);
  legacy.version = 4;
  legacy.runtimeRevision = 4;
  delete legacy.stats.descent;
  delete legacy.circuitRuns;
  delete legacy.descentProgress;
  delete legacy.descentRuns;

  const migrated = normalizePitSave(legacy);
  assert.ok(migrated);
  assert.equal(migrated.version, PIT_SAVE_VERSION);
  assert.equal(migrated.runtimeRevision, PIT_SAVE_RUNTIME_REVISION);
  assert.deepEqual(migrated.circuitProgress, current.circuitProgress);
  assert.deepEqual(migrated.stats.circuit, current.stats.circuit);
  assert.ok(Object.values(migrated.circuitRuns).every((run) => run === null));
  assert.ok(Object.values(migrated.descentRuns).every((run) => run === null));
  assert.ok(Object.values(migrated.descentProgress).every(
    (progress) => progress.bestFloor === 0 && progress.completions === 0,
  ));
  assert.deepEqual(migrated.stats.descent, {
    matches: 0,
    victories: 0,
    defeats: 0,
    draws: 0,
    roundsPlayed: 0,
    roundsWon: 0,
    roundsLost: 0,
    roundsDrawn: 0,
  });

  assert.equal(normalizePitSave({
    ...legacy,
    unlockedCosmeticIds: [
      ...legacy.unlockedCosmeticIds,
      PIT_SAVE_DESCENT_COSMETIC_ID,
    ],
  }), null, "V4 cannot inject the future permanent Descent reward");
});
test("Clan Circuit persists all twelve fights, chapter rewards, completion and restart", () => {
  const completed = completedCircuitSave();

  assert.equal(completed.stats.circuit.matches, 12);
  assert.equal(completed.stats.circuit.victories, 12);
  assert.equal(completed.stats.arcade.matches, 0);
  assert.deepEqual(completed.circuitProgress.valkyrie, {
    bestFight: 12,
    completions: 1,
    nextFight: 0,
  });
  assert.deepEqual(completed.unlockedCosmeticIds, [
    "pit-emblem-circle-call",
    "pit-banner-three-paths",
    "pit-title-trophy-keeper",
    "pit-palette-ashen-circle",
    "pit-intro-elder-verdict",
  ]);
  assert.deepEqual(PIT_SAVE_CIRCUIT_COSMETIC_IDS, completed.unlockedCosmeticIds);
  assert.ok(completed.unlockedCosmeticIds.every(
    (rewardId) => PIT_SAVE_ALLOWED_COSMETIC_IDS.includes(rewardId),
  ));
  assert.ok(Buffer.byteLength(serializePitSave(completed), "utf8") < PIT_SAVE_MAX_SERIALIZED_BYTES);

  const restarted = applyPitResult(completed, circuitResult(0, {
    id: "circuit-valkyrie-restart-loss",
    outcome: "defeat",
    roundsWon: 1,
    roundsLost: 2,
    circuitCompleted: false,
    cosmeticRewardIds: [],
    completedAt: "2026-09-04T11:20:00.000Z",
  })).save;
  assert.deepEqual(restarted.circuitProgress.valkyrie, {
    bestFight: 12,
    completions: 1,
    nextFight: 0,
  });
  assert.equal(restarted.stats.circuit.defeats, 1);

  const wonRestart = applyPitResult(restarted, circuitResult(0, {
    id: "circuit-valkyrie-restart-win",
    completedAt: "2026-09-04T11:21:00.000Z",
  })).save;
  assert.equal(wonRestart.circuitProgress.valkyrie.nextFight, 1);
  assert.equal(wonRestart.circuitProgress.valkyrie.completions, 1);
  assert.equal(
    wonRestart.unlockedCosmeticIds.filter((id) => id === "pit-emblem-circle-call").length,
    1,
  );
});

test("Clan Circuit result contract rejects skips, forged rewards and mismatched metadata", () => {
  const fresh = createPitSave(OWNER);

  assert.throws(
    () => applyPitResult(fresh, circuitResult(1)),
    /skips an unreached fight/,
  );
  assert.throws(
    () => applyPitResult(fresh, circuitResult(11)),
    /skips an unreached fight/,
  );
  assert.throws(
    () => applyPitResult(fresh, circuitResult(0, { arenaId: "frost-chamber" })),
    /contract or reward/,
  );
  assert.throws(
    () => applyPitResult(fresh, circuitResult(0, { circuitCompleted: true })),
    /contract or reward/,
  );
  assert.throws(
    () => applyPitResult(fresh, circuitResult(0, { cosmeticRewardIds: [] })),
    /contract or reward/,
  );
  assert.throws(
    () => applyPitResult(fresh, circuitResult(0, {
      cosmeticRewardIds: ["pit-palette-wolf-judgment"],
    })),
    /contract or reward/,
  );
  assert.throws(
    () => applyPitResult(fresh, circuitResult(0, {
      outcome: "defeat",
      roundsWon: 0,
      roundsLost: 2,
    })),
    /contract or reward/,
  );
  assert.throws(
    () => applyPitResult(fresh, result({
      id: "missing-circuit-index",
      mode: "circuit",
      circuitCompleted: false,
      cosmeticRewardIds: [],
    })),
    /Clan Circuit result/,
  );
  assert.throws(
    () => applyPitResult(fresh, circuitResult(0, { circuitCompleted: undefined })),
    /Clan Circuit result/,
  );
  assert.throws(
    () => applyPitResult(fresh, circuitResult(0, {
      arcadeEncounterIndex: 0,
      arcadeCompleted: false,
    })),
    /Arcade result/,
  );
  assert.throws(
    () => applyPitResult(fresh, result({
      circuitFightIndex: 0,
      circuitCompleted: false,
    })),
    /Clan Circuit result/,
  );
  assert.throws(
    () => applyPitResult(fresh, circuitResult(0, {
      roundsWon: 1,
      roundsLost: 0,
    })),
    /round outcome/,
  );
});

test("Clan Circuit results are idempotent and current saves reject forged progression", () => {
  const payload = circuitResult(0);
  const first = applyPitResult(createPitSave(OWNER), payload);
  const duplicate = applyPitResult(first.save, payload);
  assert.equal(first.applied, true);
  assert.equal(duplicate.applied, false);
  assert.deepEqual(duplicate.save, first.save);

  assert.equal(normalizePitSave({
    ...createPitSave(OWNER),
    unlockedCosmeticIds: ["pit-emblem-circle-call"],
  }), null, "a Circuit reward needs earned progress");

  assert.equal(normalizePitSave({
    ...first.save,
    unlockedCosmeticIds: [],
  }), null, "an earned chapter reward cannot be removed");

  assert.equal(normalizePitSave({
    ...first.save,
    circuitProgress: {
      ...first.save.circuitProgress,
      valkyrie: { bestFight: 2, completions: 0, nextFight: 1 },
    },
  }), null, "best progress cannot exceed recorded Circuit victories");

  const completed = completedCircuitSave();
  assert.equal(normalizePitSave({
    ...completed,
    circuitProgress: {
      ...completed.circuitProgress,
      valkyrie: { bestFight: 11, completions: 1, nextFight: 0 },
    },
  }), null, "completion and best-fight invariants must agree");
  assert.equal(normalizePitSave({
    ...completed,
    unlockedCosmeticIds: completed.unlockedCosmeticIds.slice(0, -1),
  }), null, "the final reward is derived from a completed Circuit");
  assert.equal(normalizePitSave({
    ...completed,
    sequence: 11,
  }), null, "Circuit aggregate matches cannot exceed global sequence");
});

test("V5 stores a canonical Circuit run for real reload/resume without duplicating match stats", () => {
  let save = createPitSave(OWNER);
  let run = circuitRuntime.createPitCircuitRun("valkyrie");

  let snapshot = persistPitCircuitRun(
    save,
    run,
    "2026-09-04T12:00:00.000Z",
  );
  assert.equal(snapshot.applied, true);
  save = snapshot.save;

  run = circuitRuntime.selectPitCircuitFight(
    run,
    circuitRuntime.PIT_CLAN_CIRCUITS.valkyrie.fights[0].id,
  );
  save = persistPitCircuitRun(
    save,
    run,
    "2026-09-04T12:00:01.000Z",
  ).save;

  run = circuitRuntime.applyPitCircuitFightResult(run, {
    resultId: "circuit-valkyrie-1",
    fightId: circuitRuntime.PIT_CLAN_CIRCUITS.valkyrie.fights[0].id,
    outcome: "victory",
  }).run;
  save = applyPitResult(save, circuitResult(0)).save;
  save = persistPitCircuitRun(
    save,
    run,
    "2026-09-04T12:00:02.000Z",
  ).save;

  assert.deepEqual(getPitCircuitRun(save, "valkyrie"), run);
  assert.equal(save.stats.circuit.matches, 1);
  assert.equal(save.sequence, 1);
  assert.equal(
    persistPitCircuitRun(save, run, "2026-09-04T12:00:03.000Z").applied,
    false,
  );

  const storage = memoryStorage();
  assert.equal(writePitSave(save, { storage }).persisted, true);
  const loaded = loadPitSave({ storage, expectedOwnerSaveCreatedAt: OWNER }).save;
  assert.ok(loaded);
  assert.deepEqual(getPitCircuitRun(loaded, "valkyrie"), run);

  const forged = { ...run, victories: 99 };
  assert.throws(
    () => persistPitCircuitRun(save, forged, "2026-09-04T12:00:04.000Z"),
    /snapshot/,
  );

  let skipped = circuitRuntime.selectPitCircuitFight(
    run,
    circuitRuntime.PIT_CLAN_CIRCUITS.valkyrie.fights[1].id,
  );
  skipped = circuitRuntime.applyPitCircuitFightResult(skipped, {
    resultId: "circuit-valkyrie-2",
    fightId: circuitRuntime.PIT_CLAN_CIRCUITS.valkyrie.fights[1].id,
    outcome: "victory",
  }).run;
  assert.throws(
    () => persistPitCircuitRun(save, skipped, "2026-09-04T12:00:05.000Z"),
    /durably applied|transition/,
    "a snapshot cannot skip the durable match reducer",
  );

  const removed = removePitCircuitRun(
    save,
    "valkyrie",
    "2026-09-04T12:00:06.000Z",
  );
  assert.equal(removed.applied, true);
  assert.equal(getPitCircuitRun(removed.save, "valkyrie"), null);
  assert.equal(removed.save.stats.circuit.matches, 1);

  const fresh = circuitRuntime.createPitCircuitRun("valkyrie");
  const replaced = replacePitCircuitRun(
    save,
    fresh,
    "2026-09-04T12:00:07.000Z",
  );
  assert.equal(replaced.applied, true);
  assert.deepEqual(getPitCircuitRun(replaced.save, "valkyrie"), fresh);
  assert.equal(replaced.save.circuitProgress.valkyrie.bestFight, 1);
  assert.equal(replaced.save.circuitProgress.valkyrie.nextFight, 0);
});

test("V5 resumes a full branched Descent and applies only real combat statistics", () => {
  let save = createPitSave(OWNER);
  let run = arcadeRuntime.createPitDescentRun("enforcer", 72);
  save = persistPitDescentRun(
    save,
    run,
    "2026-09-04T13:00:00.000Z",
  ).save;

  let combatCount = 0;
  let nonCombatCount = 0;
  for (let floorIndex = 0; floorIndex < arcadeRuntime.PIT_DESCENT_FLOOR_COUNT; floorIndex += 1) {
    const floor = arcadeRuntime.createPitDescentPlan(run.fighterId, run.seed).floors[floorIndex];
    const preferredKind = floorIndex === 2 ? "relic" : floorIndex === 5 ? "recovery" : null;
    const node = preferredKind
      ? floor.options.find((candidate) => candidate.kind === preferredKind)
      : floor.options[0];
    run = arcadeRuntime.selectPitDescentNode(run, node.id);
    save = persistPitDescentRun(
      save,
      run,
      "2026-09-04T13:" + String(floorIndex * 2 + 1).padStart(2, "0") + ":00.000Z",
    ).save;

    const beforeSequence = save.sequence;
    if (node.kind === "fight" || node.kind === "boss") {
      combatCount += 1;
      run = arcadeRuntime.applyPitDescentResolution(run, {
        id: "descent-enforcer-" + (floorIndex + 1),
        nodeId: node.id,
        victory: true,
        remainingHealth: Math.max(100, run.health - 70),
        roundsWon: 1,
        roundsLost: 0,
        roundsDrawn: floorIndex === 4 ? 1 : 0,
      }).run;
    } else {
      nonCombatCount += 1;
      run = arcadeRuntime.applyPitDescentResolution(run, {
        id: "descent-enforcer-" + (floorIndex + 1),
        nodeId: node.id,
      }).run;
    }
    save = persistPitDescentRun(
      save,
      run,
      "2026-09-04T13:" + String(floorIndex * 2 + 2).padStart(2, "0") + ":00.000Z",
    ).save;
    assert.equal(
      save.sequence,
      beforeSequence + (node.kind === "fight" || node.kind === "boss" ? 1 : 0),
    );
  }

  assert.equal(combatCount, 6);
  assert.equal(nonCombatCount, 2);
  assert.equal(run.phase, "completed");
  assert.deepEqual(getPitDescentRun(save, "enforcer"), run);
  assert.equal(save.stats.descent.matches, 6);
  assert.equal(save.stats.descent.victories, 6);
  assert.equal(save.stats.descent.defeats, 0);
  assert.equal(save.stats.descent.roundsWon, combatCount);
  assert.equal(save.stats.descent.roundsLost, 0);
  assert.equal(save.stats.descent.roundsDrawn, 1);
  assert.equal(save.stats.descent.roundsPlayed, combatCount + 1);
  assert.equal(save.sequence, 6);
  assert.deepEqual(save.descentProgress.enforcer, {
    bestFloor: 8,
    completions: 1,
  });
  assert.equal(
    save.unlockedCosmeticIds.filter(
      (rewardId) => rewardId === PIT_SAVE_DESCENT_COSMETIC_ID,
    ).length,
    1,
  );
  assert.deepEqual(run.temporaryRelicIds, []);
  assert.equal(
    persistPitDescentRun(save, run, "2026-09-04T13:30:00.000Z").applied,
    false,
  );

  const storage = memoryStorage();
  assert.equal(writePitSave(save, { storage }).persisted, true);
  const loaded = loadPitSave({ storage, expectedOwnerSaveCreatedAt: OWNER }).save;
  assert.ok(loaded);
  assert.deepEqual(getPitDescentRun(loaded, "enforcer"), run);

  const restartedRun = arcadeRuntime.createPitDescentRun("enforcer", 73);
  const restarted = replacePitDescentRun(
    loaded,
    restartedRun,
    "2026-09-04T13:31:00.000Z",
  );
  assert.equal(restarted.applied, true);
  assert.deepEqual(getPitDescentRun(restarted.save, "enforcer"), restartedRun);
  assert.equal(restarted.save.stats.descent.matches, 6);
  assert.equal(restarted.save.descentProgress.enforcer.completions, 1);
  assert.ok(restarted.save.unlockedCosmeticIds.includes(PIT_SAVE_DESCENT_COSMETIC_ID));

  const removed = removePitDescentRun(
    restarted.save,
    "enforcer",
    "2026-09-04T13:32:00.000Z",
  );
  assert.equal(removed.applied, true);
  assert.equal(getPitDescentRun(removed.save, "enforcer"), null);
  assert.equal(removed.save.stats.descent.matches, 6);
});

test("V5 rejects skipped or forged Descent snapshots and persists a real defeat once", () => {
  let save = createPitSave(OWNER);
  let run = arcadeRuntime.createPitDescentRun("wolf", 101);
  save = persistPitDescentRun(save, run, "2026-09-04T14:00:00.000Z").save;
  const plan = arcadeRuntime.createPitDescentPlan("wolf", 101);

  let selected = arcadeRuntime.selectPitDescentNode(run, plan.floors[0].options[0].id);
  save = persistPitDescentRun(save, selected, "2026-09-04T14:00:01.000Z").save;
  let skipped = arcadeRuntime.applyPitDescentResolution(selected, {
    id: "descent-wolf-skip-1",
    nodeId: plan.floors[0].options[0].id,
    victory: true,
    remainingHealth: 900,
    roundsWon: 2,
    roundsLost: 0,
  }).run;
  skipped = arcadeRuntime.selectPitDescentNode(skipped, plan.floors[1].options[0].id);
  skipped = arcadeRuntime.applyPitDescentResolution(skipped, {
    id: "descent-wolf-skip-2",
    nodeId: plan.floors[1].options[0].id,
    victory: true,
    remainingHealth: 800,
    roundsWon: 2,
    roundsLost: 1,
  }).run;
  assert.throws(
    () => persistPitDescentRun(save, skipped, "2026-09-04T14:00:02.000Z"),
    /transition/,
  );

  const defeated = arcadeRuntime.applyPitDescentResolution(selected, {
    id: "descent-wolf-defeat",
    nodeId: plan.floors[0].options[0].id,
    victory: false,
    remainingHealth: 0,
    roundsWon: 0,
    roundsLost: 1,
    roundsDrawn: 0,
  }).run;
  const defeatApplication = persistPitDescentRun(
    save,
    defeated,
    "2026-09-04T14:00:03.000Z",
  );
  assert.equal(defeatApplication.applied, true);
  assert.equal(defeatApplication.save.stats.descent.matches, 1);
  assert.equal(defeatApplication.save.stats.descent.defeats, 1);
  assert.equal(defeatApplication.save.stats.descent.roundsWon, 0);
  assert.equal(defeatApplication.save.stats.descent.roundsLost, 1);
  assert.equal(defeatApplication.save.stats.descent.roundsPlayed, 1);
  assert.equal(defeatApplication.save.sequence, 1);
  assert.deepEqual(defeatApplication.save.unlockedCosmeticIds, []);
  assert.equal(
    persistPitDescentRun(
      defeatApplication.save,
      defeated,
      "2026-09-04T14:00:04.000Z",
    ).applied,
    false,
  );

  assert.throws(
    () => persistPitDescentRun(
      save,
      {
        ...defeated,
        health: 500,
      },
      "2026-09-04T14:00:05.000Z",
    ),
    /snapshot/,
  );
  assert.equal(normalizePitSave({
    ...defeatApplication.save,
    unlockedCosmeticIds: [PIT_SAVE_DESCENT_COSMETIC_ID],
  }), null);
  assert.equal(normalizePitSave({
    ...defeatApplication.save,
    descentProgress: {
      ...defeatApplication.save.descentProgress,
      wolf: { bestFloor: 8, completions: 1 },
    },
    unlockedCosmeticIds: [PIT_SAVE_DESCENT_COSMETIC_ID],
  }), null, "completion progress needs six recorded victories");
});
test("Arcade results persist per-fighter records and only the registered PIT cosmetic", () => {
  const initial = createPitSave(OWNER);
  assert.throws(() => applyPitResult(initial, result({
    id: "arcade-wolf-skip",
    mode: "arcade",
    fighterId: "wolf",
    arcadeEncounterIndex: 7,
    arcadeCompleted: true,
    cosmeticRewardIds: ["pit-palette-wolf-judgment"],
  })), /skips an unreached encounter/);

  let completed = initial;
  for (let encounterIndex = 0; encounterIndex < 8; encounterIndex += 1) {
    const isFinal = encounterIndex === 7;
    completed = applyPitResult(completed, result({
      id: "arcade-wolf-" + (encounterIndex + 1),
      mode: "arcade",
      fighterId: "wolf",
      arenaId: isFinal ? "ruins-tribunal" : "frost-chamber",
      arcadeEncounterIndex: encounterIndex,
      arcadeCompleted: isFinal,
      cosmeticRewardIds: isFinal ? ["pit-palette-wolf-judgment"] : [],
      completedAt: "2026-09-04T10:" + String(11 + encounterIndex).padStart(2, "0") + ":00.000Z",
    })).save;
  }

  assert.equal(completed.stats.arcade.matches, 8);
  assert.equal(completed.arcadeProgress.wolf.bestEncounter, 8);
  assert.equal(completed.arcadeProgress.wolf.completions, 1);
  assert.equal(completed.arcadeProgress.wolf.nextEncounter, 0);
  assert.equal(completed.lastArenaId, "ruins-tribunal");
  assert.deepEqual(completed.unlockedCosmeticIds, ["pit-palette-wolf-judgment"]);
  assert.ok(PIT_SAVE_ALLOWED_COSMETIC_IDS.includes("pit-palette-wolf-judgment"));
  assert.throws(() => applyPitResult(completed, result({
    id: "forged-second-completion",
    mode: "arcade",
    fighterId: "wolf",
    arcadeEncounterIndex: 7,
    arcadeCompleted: true,
    cosmeticRewardIds: ["pit-palette-wolf-judgment"],
    completedAt: "2026-09-04T10:30:00.000Z",
  })), /skips an unreached encounter/);

  const restarted = applyPitResult(completed, result({
    id: "arcade-wolf-restart-1",
    mode: "arcade",
    fighterId: "wolf",
    arcadeEncounterIndex: 0,
    arcadeCompleted: false,
    cosmeticRewardIds: [],
    completedAt: "2026-09-04T10:31:00.000Z",
  })).save;
  assert.equal(restarted.arcadeProgress.wolf.nextEncounter, 1);
  assert.equal(restarted.arcadeProgress.wolf.completions, 1);

  const defeated = applyPitResult(restarted, result({
    id: "arcade-wolf-restart-defeat",
    mode: "arcade",
    outcome: "defeat",
    fighterId: "wolf",
    roundsWon: 0,
    roundsLost: 2,
    arcadeEncounterIndex: 1,
    arcadeCompleted: false,
    cosmeticRewardIds: [],
    completedAt: "2026-09-04T10:32:00.000Z",
  })).save;
  assert.equal(defeated.arcadeProgress.wolf.nextEncounter, 1);

  const retried = applyPitResult(defeated, result({
    id: "arcade-wolf-restart-retry",
    mode: "arcade",
    fighterId: "wolf",
    arcadeEncounterIndex: 1,
    arcadeCompleted: false,
    cosmeticRewardIds: [],
    completedAt: "2026-09-04T10:33:00.000Z",
  })).save;
  assert.equal(retried.arcadeProgress.wolf.nextEncounter, 2);
  assert.equal(retried.arcadeProgress.wolf.completions, 1);
  assert.throws(() => applyPitResult(initial, result({
    id: "forged-arcade-reward",
    mode: "arcade",
    fighterId: "wolf",
    arcadeEncounterIndex: 0,
    arcadeCompleted: false,
    cosmeticRewardIds: ["campaign-honor"],
  })));
  assert.equal(normalizePitSave({
    ...completed,
    unlockedCosmeticIds: ["campaign-honor"],
  }), null);
  assert.equal(normalizePitSave({
    ...completed,
    arcadeProgress: {
      ...completed.arcadeProgress,
      wolf: { bestEncounter: 7, completions: 1, nextEncounter: 0 },
    },
  }), null);
  assert.equal(normalizePitSave({
    ...completed,
    unlockedCosmeticIds: [],
  }), null);
  assert.equal(normalizePitSave({
    ...initial,
    unlockedCosmeticIds: ["pit-palette-wolf-judgment"],
  }), null);
});

test("current saves reject completion rewards unsupported by Arcade stats or sequence", () => {
  const fresh = createPitSave(OWNER);
  const forgedProgress = {
    ...fresh.arcadeProgress,
    wolf: { bestEncounter: 8, completions: 1, nextEncounter: 0 },
  };
  const forgedReward = ["pit-palette-wolf-judgment"];
  const completedStats = {
    matches: 8,
    victories: 8,
    defeats: 0,
    draws: 0,
    roundsPlayed: 16,
    roundsWon: 16,
    roundsLost: 0,
    roundsDrawn: 0,
  };

  assert.equal(normalizePitSave({
    ...fresh,
    revision: 8,
    sequence: 8,
    arcadeProgress: forgedProgress,
    unlockedCosmeticIds: forgedReward,
  }), null, "completion cannot exist without eight recorded Arcade victories");

  assert.equal(normalizePitSave({
    ...fresh,
    revision: 8,
    sequence: 0,
    stats: { ...fresh.stats, arcade: completedStats },
    arcadeProgress: forgedProgress,
    unlockedCosmeticIds: forgedReward,
  }), null, "Arcade aggregate matches cannot exceed the global result sequence");
});

test("match outcomes must agree with first-to-two round totals", () => {
  const invalid = [
    { outcome: "victory", roundsWon: 1, roundsLost: 0, roundsDrawn: 0 },
    { outcome: "victory", roundsWon: 2, roundsLost: 2, roundsDrawn: 0 },
    { outcome: "defeat", roundsWon: 0, roundsLost: 1, roundsDrawn: 0 },
    { outcome: "defeat", roundsWon: 2, roundsLost: 2, roundsDrawn: 0 },
    { outcome: "draw", roundsWon: 1, roundsLost: 1, roundsDrawn: 0 },
    { outcome: "draw", roundsWon: 2, roundsLost: 0, roundsDrawn: 1 },
  ];
  for (const [index, totals] of invalid.entries()) {
    assert.throws(
      () => applyPitResult(createPitSave(OWNER), result({
        id: "invalid-round-outcome-" + index,
        ...totals,
      })),
      /round outcome/,
    );
  }

  assert.equal(applyPitResult(createPitSave(OWNER), result({
    id: "valid-victory",
    outcome: "victory",
    roundsWon: 2,
    roundsLost: 1,
  })).applied, true);
  assert.equal(applyPitResult(createPitSave(OWNER), result({
    id: "valid-defeat",
    outcome: "defeat",
    roundsWon: 1,
    roundsLost: 2,
  })).applied, true);
  assert.equal(applyPitResult(createPitSave(OWNER), result({
    id: "valid-draw",
    outcome: "draw",
    roundsWon: 1,
    roundsLost: 1,
    roundsDrawn: 1,
  })).applied, true);
});

test("corrupt and future sidecars have distinct load statuses", () => {
  const corrupt = memoryStorage([[PIT_SAVE_STORAGE_KEY, "{broken"]]);
  assert.equal(loadPitSave({ storage: corrupt }).failure, "corrupt-save");

  for (const payload of [
    { ...createPitSave(OWNER), version: PIT_SAVE_VERSION + 1 },
    { ...createPitSave(OWNER), runtimeRevision: PIT_SAVE_RUNTIME_REVISION + 1 },
  ]) {
    const storage = memoryStorage([[PIT_SAVE_STORAGE_KEY, JSON.stringify(payload)]]);
    assert.equal(loadPitSave({ storage }).failure, "future-version");
    assert.equal(writePitSave({ ...createPitSave(OWNER), revision: 1 }, { storage }).failure, "future-version");
    assert.equal(storage.getItem(PIT_SAVE_STORAGE_KEY), JSON.stringify(payload));
  }
});

test("load and write enforce campaign ownership", () => {
  const storage = memoryStorage();
  const save = { ...createPitSave(OWNER), revision: 1 };
  assert.equal(writePitSave(save, { storage }).persisted, true);
  assert.equal(
    loadPitSave({ storage, expectedOwnerSaveCreatedAt: "2026-09-01T00:00:00.000Z" }).failure,
    "owner-conflict",
  );
  const foreign = {
    ...createPitSave("2026-09-02T00:00:00.000Z"),
    revision: 2,
    sequence: 1,
  };
  assert.equal(writePitSave(foreign, { storage }).failure, "owner-conflict");
  assert.equal(JSON.parse(storage.getItem(PIT_SAVE_STORAGE_KEY)).ownerSaveCreatedAt, OWNER);
});

test("storage rejects stale sequence and revision while accepting preference revisions", () => {
  const storage = memoryStorage();
  const base = applyPitResult(createPitSave(OWNER), result()).save;
  assert.equal(writePitSave(base, { storage }).persisted, true);
  assert.equal(
    writePitSave(
      { ...createPitSave(OWNER), revision: base.revision + 1 },
      { storage },
    ).failure,
    "stale-sequence",
  );
  assert.equal(
    writePitSave({ ...base }, { storage }).failure,
    "stale-revision",
  );
  const preferenceOnly = updatePitTrainingPreferences(
    base,
    { showHitboxes: true },
    "2026-09-04T10:07:00.000Z",
  );
  assert.equal(preferenceOnly.sequence, base.sequence);
  assert.equal(writePitSave(preferenceOnly, { storage }).persisted, true);
});

test("quota and denied writes are reported and never claimed as persisted", () => {
  const quota = {
    getItem() { return null; },
    setItem() {
      const error = new Error("full");
      error.name = "QuotaExceededError";
      throw error;
    },
  };
  const denied = {
    getItem() { return null; },
    setItem() { throw new Error("blocked"); },
  };
  const dropped = { getItem() { return null; }, setItem() {} };
  const save = createPitSave(OWNER);

  assert.equal(writePitSave(save, { storage: null }).failure, "storage-unavailable");
  assert.equal(writePitSave(save, { storage: quota }).failure, "quota-exceeded");
  assert.equal(writePitSave(save, { storage: denied }).failure, "write-denied");
  assert.equal(writePitSave(save, { storage: dropped }).failure, "write-denied");
});

test("applying a result is idempotent and isolates statistics by mode", () => {
  const initial = createPitSave(OWNER);
  const first = applyPitResult(initial, result());
  const duplicate = applyPitResult(first.save, result({ outcome: "defeat", roundsWon: 0, roundsLost: 2 }));
  const local = applyPitResult(first.save, result({
    id: "pit-result-002",
    mode: "local",
    outcome: "draw",
    fighterId: "berserker",
    roundsWon: 1,
    roundsLost: 1,
    roundsDrawn: 1,
    completedAt: "2026-09-04T10:10:00.000Z",
  }));

  assert.equal(first.applied, true);
  assert.equal(duplicate.applied, false);
  assert.deepEqual(duplicate.save, first.save);
  assert.equal(local.save.sequence, 2);
  assert.equal(local.save.revision, 2);
  assert.equal(local.save.stats.cpu.victories, 1);
  assert.equal(local.save.stats.cpu.defeats, 0);
  assert.equal(local.save.stats.local.draws, 1);
  assert.equal(local.save.stats.local.roundsPlayed, 3);
  assert.equal(local.save.lastFighterId, "berserker");
  assert.deepEqual(local.save.appliedResultIds, ["pit-result-001", "pit-result-002"]);
  assert.equal(initial.stats.cpu.matches, 0, "the reducer does not mutate its input");
});

test("campaign owners use isolated PIT storage namespaces", () => {
  const otherOwner = "2026-09-05T10:00:00.000Z";
  const ownerKey = pitSaveStorageKey(OWNER);
  const otherKey = pitSaveStorageKey(otherOwner);
  const storage = memoryStorage();

  assert.notEqual(ownerKey, otherKey);
  assert.match(ownerKey, new RegExp(`^${PIT_SAVE_STORAGE_KEY}\.`));
  assert.equal(
    writePitSave({ ...createPitSave(OWNER), revision: 1 }, { storage, key: ownerKey }).persisted,
    true,
  );
  assert.equal(loadPitSave({
    storage,
    key: otherKey,
    expectedOwnerSaveCreatedAt: otherOwner,
  }).save, null);
  assert.equal(storage.values.has(ownerKey), true);
  assert.equal(storage.values.has(otherKey), false);
  assert.throws(() => pitSaveStorageKey("not-a-date"));
});

test("namespace validation and confirmed reset protect campaign ownership", () => {
  const ownerKey = pitSaveStorageKey(OWNER);
  const wrongKey = pitSaveStorageKey("2026-09-06T10:00:00.000Z");
  const storage = memoryStorage();
  const save = { ...createPitSave(OWNER), revision: 1 };

  assert.equal(
    writePitSave(save, {
      storage,
      key: wrongKey,
      expectedOwnerSaveCreatedAt: OWNER,
    }).failure,
    "owner-conflict",
  );
  assert.equal(
    writePitSave(save, { storage, key: wrongKey }).failure,
    "owner-conflict",
  );
  assert.equal(
    loadPitSave({
      storage,
      key: wrongKey,
      expectedOwnerSaveCreatedAt: OWNER,
    }).failure,
    "owner-conflict",
  );

  assert.equal(writePitSave(save, {
    storage,
    key: ownerKey,
    expectedOwnerSaveCreatedAt: OWNER,
  }).persisted, true);
  assert.equal(clearPitSave(OWNER, { storage }).cleared, true);
  assert.equal(storage.getItem(ownerKey), null);
  assert.equal(clearPitSave(OWNER, { storage }).cleared, true);

  storage.setItem(
    ownerKey,
    JSON.stringify(createPitSave("2026-09-07T10:00:00.000Z")),
  );
  const conflict = clearPitSave(OWNER, { storage });
  assert.equal(conflict.cleared, false);
  assert.equal(conflict.failure, "owner-conflict");
  assert.notEqual(storage.getItem(ownerKey), null);
});
