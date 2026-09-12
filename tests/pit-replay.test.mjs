import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";

const bundle = await build({
  stdin: {
    contents: [
      'export * from "./app/game/systems/pitReplay";',
      'export { createPitCombatState, PIT_FIGHTERS, serializePitCombat, stepPitCombat } from "./app/game/systems/pitCombat";',
    ].join("\n"),
    resolveDir: process.cwd(),
    loader: "ts",
  },
  bundle: true,
  write: false,
  platform: "node",
  format: "esm",
});
const pit = await import(
  `data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString("base64")}`
);

const plain = (value) => JSON.parse(JSON.stringify(value));

function runInputs(inputs, options = {}) {
  const fighters = options.fighters ?? ["jungle-hunter", "berserker"];
  const rules = options.rules ?? { mode: "match" };
  return inputs.reduce(
    (state, frameInputs) => pit.stepPitCombat(state, frameInputs),
    pit.createPitCombatState(fighters[0], fighters[1], rules),
  );
}

function completeMatch() {
  const recorder = pit.createPitReplayRecorder({ seed: 0x51a7 });
  let state = pit.createPitCombatState();
  for (let guard = 0; guard < pit.PIT_REPLAY_MAX_TICKS && state.phase !== "match-over"; guard += 1) {
    let inputs = [{}, {}];
    if (state.phase === "round") {
      const [attacker, defender] = state.fighters;
      const distance = defender.x - attacker.x;
      if (distance > 72) inputs = [{ right: true }, {}];
      else if (defender.phase !== "knockdown" && defender.wakeInvulnerabilityFrames === 0 && attacker.phase === "idle") {
        inputs = [{ attack: "heavy" }, {}];
      }
    }
    recorder.append(inputs);
    state = pit.stepPitCombat(state, inputs);
  }
  assert.equal(state.phase, "match-over", "scripted deterministic bout should reach a terminal state");
  return { replay: recorder.finish(), state };
}

test("input packing round-trips both players without storing unrelated fields", () => {
  const inputs = [
    { left: true, down: true, jump: true, guardLow: true, attack: "technique", throw: true, resource: true },
    { right: true, guardHigh: true, attack: "heavy", resource: true },
  ];
  const packed = pit.encodePitReplayInputs(inputs);
  assert.ok(Number.isInteger(packed));
  assert.ok(packed >= 0 && packed < 2 ** 22);
  assert.equal(pit.encodePitReplayInput({ resource: true }), 1 << 10);
  assert.deepEqual(plain(pit.decodePitReplayInputs(packed)), inputs);
  assert.throws(
    () => pit.encodePitReplayInput({ attack: "fatality" }),
    /Invalid or incompatible THE PIT replay/,
  );
  assert.throws(
    () => pit.encodePitReplayInput({ left: true, campaignReward: 50 }),
    /Invalid or incompatible THE PIT replay/,
  );
});

test("RLE replay is compact, deterministic and equivalent to a direct simulation", () => {
  const inputs = Array.from({ length: 360 }, (_, frame) => [
    {
      right: frame < 80,
      jump: frame === 90,
      attack: frame === 130 ? "medium" : frame === 220 ? "technique" : undefined,
      resource: frame === 300,
    },
    {
      left: frame < 65,
      guardHigh: frame >= 120 && frame < 160,
      attack: frame === 215 ? "heavy" : undefined,
      resource: frame === 310,
    },
  ]);
  const replay = pit.recordPitReplay(inputs, { seed: 42 });
  const direct = runInputs(inputs);
  const replayed = pit.playPitReplay(replay);
  assert.equal(pit.serializePitCombat(replayed), pit.serializePitCombat(direct));
  assert.ok(replay.segments.length < replay.metadata.ticks);
  assert.equal(replay.metadata.ticks, inputs.length);
  assert.equal(replay.metadata.durationMs, 6_000);
  assert.equal(replay.seed, 42);
  assert.equal(replay.version, 3);
  assert.equal(replay.engineVersion, 5);
  assert.equal(replay.encoding, "input-rle-v3");
  assert.doesNotMatch(JSON.stringify(replay), /campaign|reward/i);
});

test("the selected fighter roster and arena survive deterministic replay", () => {
  const inputs = Array.from({ length: 90 }, (_, frame) => [
    frame < 30 ? { right: true } : frame === 45 ? { attack: "light" } : {},
    frame < 30 ? { left: true } : {},
  ]);
  const replay = pit.recordPitReplay(inputs, {
    fighters: ["wolf", "falconer"],
    arenaId: "abyssal-bridge",
    seed: 81,
  });
  assert.deepEqual(replay.fighters, ["wolf", "falconer"]);
  assert.equal(replay.arenaId, "abyssal-bridge");
  assert.equal(pit.playPitReplay(replay).arenaId, "abyssal-bridge");
  assert.equal(
    pit.normalizePitReplay({ ...plain(replay), arenaId: "forged-arena" }),
    null,
  );
});

test("Falconer reconnaissance marking stays deterministic in training replays", () => {
  const inputs = Array.from({ length: 100 }, (_, frame) => [
    frame === 0 ? { attack: "technique" } : {},
    frame < 78 ? { guardHigh: true } : {},
  ]);
  const options = {
    fighters: ["falconer", "berserker"],
    rules: { mode: "training" },
    seed: 82,
  };
  const replay = pit.recordPitReplay(inputs, options);
  const direct = runInputs(inputs, options);
  const replayed = pit.playPitReplay(replay);

  assert.equal(pit.serializePitCombat(replayed), pit.serializePitCombat(direct));
  assert.equal(replayed.fighters[1].health, pit.PIT_FIGHTERS.berserker.maxHealth);
  assert.equal(replayed.fighters[1].phase, "idle");
  assert.equal(replayed.fighters[1].stunFrames, 0);
  assert.equal(replayed.fighters[1].comboHitsReceived, 0);
  assert.deepEqual(replayed.fighters[1].techniqueStatus, {
    kind: "tracked",
    sourceFighterId: "falconer",
    framesRemaining: direct.fighters[1].techniqueStatus.framesRemaining,
  });
  assert.equal(replay.engineVersion, 5);
  assert.ok(pit.normalizePitReplay(replay));
});

test("published engine V3 Falconer replays are rejected as incompatible", () => {
  // Captured from engine V3 before the armed-drone damage was corrected to marking.
  const publishedV3FalconerReplay = {
    version: 3,
    engineVersion: 3,
    tickRate: 60,
    arenaId: "the-pit",
    encoding: "input-rle-v3",
    seed: 82,
    rules: { mode: "training" },
    fighters: ["falconer", "berserker"],
    segments: [[1, 33280], [77, 32768], [22, 0]],
    metadata: {
      ticks: 100,
      durationMs: 1667,
      winnerId: null,
      finalPhase: "round",
      completed: false,
      finalFrame: 100,
      checksum: "42dd6ae3",
    },
  };

  assert.equal(pit.normalizePitReplay(publishedV3FalconerReplay), null);
  for (const load of [
    () => pit.deserializePitReplay(JSON.stringify(publishedV3FalconerReplay)),
    () => pit.createPitReplayReader(publishedV3FalconerReplay),
    () => pit.playPitReplay(publishedV3FalconerReplay),
  ]) {
    assert.throws(
      load,
      (error) =>
        error instanceof pit.PitReplayCompatibilityError &&
        error.code === "incompatible-engine",
    );
  }
});

test("JSON serialization round-trips canonically inside the 64 KiB sidecar budget", () => {
  const inputs = Array.from({ length: 900 }, (_, frame) => [
    frame < 400 ? { right: true } : frame === 500 ? { attack: "light" } : {},
    frame < 400 ? { left: true } : { guardHigh: true },
  ]);
  const replay = pit.recordPitReplay(inputs, { seed: 0xffff_ffff });
  const serialized = pit.serializePitReplay(replay);
  const restored = pit.deserializePitReplay(serialized);
  assert.deepEqual(plain(restored), plain(replay));
  assert.equal(pit.serializePitReplay(restored), serialized);
  assert.ok(Buffer.byteLength(serialized, "utf8") <= pit.PIT_REPLAY_MAX_SERIALIZED_BYTES);
});

test("incremental reader yields the current P1/P2 inputs and reports its exact end", () => {
  const frames = [
    [{ right: true }, {}],
    [{ right: true }, {}],
    [{ attack: "light" }, { guardHigh: true }],
    [{}, {}],
  ];
  const replay = pit.recordPitReplay(frames);
  const reader = pit.createPitReplayReader(replay);
  const decoded = [];
  while (!reader.done) {
    const result = reader.next();
    assert.equal(result.done, false);
    assert.equal(result.value.tick, decoded.length);
    decoded.push(plain(result.value.inputs));
    assert.equal(reader.remainingTicks, frames.length - decoded.length);
  }
  assert.deepEqual(decoded, frames);
  assert.equal(reader.tick, frames.length);
  assert.deepEqual(reader.next(), { done: true, value: null });
});

test("completed match metadata carries duration, winner and a verified final checksum", () => {
  const { replay, state } = completeMatch();
  assert.equal(replay.metadata.completed, true);
  assert.equal(replay.metadata.finalPhase, "match-over");
  assert.equal(replay.metadata.winnerId, "jungle-hunter");
  assert.equal(replay.metadata.finalFrame, replay.metadata.ticks);
  assert.equal(replay.metadata.durationMs, Math.round(replay.metadata.ticks * 1_000 / 60));
  assert.equal(pit.serializePitCombat(pit.playPitReplay(replay)), pit.serializePitCombat(state));
});

test("normalization rejects future, corrupt, non-canonical and reward-bearing payloads", () => {
  const replay = pit.recordPitReplay([
    [{ right: true }, {}],
    [{ right: true }, {}],
    [{}, { left: true }],
  ]);
  const corruptions = [
    { ...plain(replay), version: replay.version + 1 },
    { ...plain(replay), engineVersion: replay.engineVersion + 1 },
    { ...plain(replay), encoding: "input-rle-v99" },
    { ...plain(replay), campaignReward: { honor: 9_999 } },
    { ...plain(replay), arenaId: "constructor" },
    { ...plain(replay), fighters: ["toString", "berserker"] },
    { ...plain(replay), metadata: { ...plain(replay.metadata), winnerId: "berserker" } },
    { ...plain(replay), metadata: { ...plain(replay.metadata), checksum: "00000000" } },
    { ...plain(replay), segments: [[1, 5 << 7]] },
    { ...plain(replay), segments: [[1, 0], [1, 0]], metadata: { ...plain(replay.metadata), ticks: 2 } },
  ];
  for (const candidate of corruptions) {
    assert.equal(pit.normalizePitReplay(candidate), null);
    assert.throws(() => pit.serializePitReplay(candidate), /Invalid or incompatible/);
  }
  assert.throws(() => pit.deserializePitReplay("not-json"), /Invalid or incompatible/);
});

test("hard tick, segment and serialized byte limits fail closed", () => {
  const recorder = pit.createPitReplayRecorder({ rules: { mode: "training" } });
  for (let tick = 0; tick < pit.PIT_REPLAY_MAX_TICKS; tick += 1) recorder.append([{}, {}]);
  assert.equal(recorder.tickCount, pit.PIT_REPLAY_MAX_TICKS);
  assert.throws(() => recorder.append([{}, {}]), /Invalid or incompatible/);
  assert.ok(pit.normalizePitReplay(recorder.finish()));

  const valid = plain(pit.recordPitReplay([]));
  const tooManySegments = {
    ...valid,
    segments: Array.from({ length: pit.PIT_REPLAY_MAX_SEGMENTS + 1 }, (_, index) => [1, index % 2]),
    metadata: { ...valid.metadata, ticks: pit.PIT_REPLAY_MAX_SEGMENTS + 1 },
  };
  assert.equal(pit.normalizePitReplay(tooManySegments), null);
  assert.throws(
    () => pit.deserializePitReplay(" ".repeat(pit.PIT_REPLAY_MAX_SERIALIZED_BYTES + 1)),
    /Invalid or incompatible/,
  );
});

test("current schema supports training and reversed fighters while future schemas are rejected", () => {
  const inputs = Array.from({ length: 240 }, (_, frame) => [
    frame < 80 ? { left: true } : {},
    frame < 80 ? { right: true } : frame === 120 ? { attack: "medium" } : {},
  ]);
  const replay = pit.recordPitReplay(inputs, {
    fighters: ["berserker", "jungle-hunter"],
    rules: { mode: "training" },
    seed: 73,
  });
  const restored = pit.deserializePitReplay(pit.serializePitReplay(replay));
  assert.deepEqual(restored.rules, { mode: "training" });
  assert.deepEqual(restored.fighters, ["berserker", "jungle-hunter"]);
  assert.equal(restored.metadata.finalPhase, "round");
  assert.equal(restored.metadata.winnerId, null);
  assert.equal(restored.metadata.completed, false);
  assert.equal(pit.normalizePitReplay({ ...plain(restored), version: pit.PIT_REPLAY_VERSION + 1 }), null);
});

test("published V2 Jungle/Berserker basalt replays migrate to V3 after checksum verification", () => {
  const current = pit.recordPitReplay([
    [{ right: true }, {}],
    [{ attack: "light" }, { guardHigh: true }],
    [{}, {}],
  ], {
    fighters: ["jungle-hunter", "berserker"],
    arenaId: "the-pit",
    seed: 19,
  });
  const finalState = pit.playPitReplay(current);
  const legacyState = JSON.parse(pit.serializePitCombat(finalState));
  legacyState.version = 2;
  delete legacyState.pendingThrow;
  delete legacyState.techniqueEffects;
  delete legacyState.nextTechniqueEffectId;
  for (const fighter of legacyState.fighters) delete fighter.techniqueStatus;
  assert.equal("techniqueEffects" in legacyState, false);
  assert.equal("nextTechniqueEffectId" in legacyState, false);
  assert.equal(legacyState.fighters.some((fighter) => "techniqueStatus" in fighter), false);
  let hash = 0x811c9dc5;
  const serializedLegacyState = JSON.stringify(legacyState);
  for (let index = 0; index < serializedLegacyState.length; index += 1) {
    hash ^= serializedLegacyState.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  const legacy = {
    ...plain(current),
    version: 2,
    engineVersion: 2,
    encoding: "input-rle-v2",
    metadata: {
      ...plain(current.metadata),
      checksum: (hash >>> 0).toString(16).padStart(8, "0"),
    },
  };

  const migrated = pit.normalizePitReplay(legacy);
  assert.ok(migrated);
  assert.equal(migrated.version, 3);
  assert.equal(migrated.engineVersion, 4);
  assert.equal(migrated.encoding, "input-rle-v3");
  assert.deepEqual(migrated.fighters, legacy.fighters);
  assert.equal(migrated.arenaId, "the-pit");
  assert.equal(
    pit.serializePitCombat(pit.playPitReplay(migrated)),
    pit.serializePitCombat(finalState),
  );
  assert.equal(pit.normalizePitReplay({
    ...legacy,
    metadata: { ...legacy.metadata, checksum: "00000000" },
  }), null);
});

test("a published V2 technique replay validates with V2 melee semantics before V3 resimulation", () => {
  let randomState = 1;
  const random = () => (
    (randomState = (Math.imul(randomState, 1_664_525) + 1_013_904_223) >>> 0) /
    2 ** 32
  );
  const inputs = Array.from({ length: 300 }, (_, frame) => {
    const playerInput = (slot) => {
      const roll = random();
      if (frame < 35) return slot === 0 ? { right: true } : { left: true };
      if (roll < 0.025) return { attack: "technique" };
      if (roll < 0.04) return { attack: "light" };
      if (roll < 0.05) return { attack: "heavy" };
      if (roll < 0.07) return { guardLow: true, down: true };
      if (roll < 0.09) return { guardHigh: true };
      return {};
    };
    return [playerInput(0), playerInput(1)];
  });
  const current = pit.recordPitReplay(inputs, { seed: 1 });
  const legacy = {
    ...plain(current),
    version: 2,
    engineVersion: 2,
    encoding: "input-rle-v2",
    metadata: {
      ticks: 300,
      durationMs: 5_000,
      winnerId: null,
      finalPhase: "round",
      completed: false,
      finalFrame: 300,
      // Captured from the published V2 engine before world techniques existed.
      checksum: "bf4337d5",
    },
  };

  const migrated = pit.normalizePitReplay(legacy);
  assert.ok(migrated);
  assert.equal(migrated.engineVersion, 4);
  assert.equal(migrated.metadata.checksum, "eb9a5a41");
  assert.notEqual(migrated.metadata.checksum, current.metadata.checksum);
  assert.notEqual(migrated.metadata.checksum, legacy.metadata.checksum);
  assert.deepEqual(pit.playPitReplay(migrated), pit.playPitReplay(current));
});

test("legacy V1 and future replay envelopes are rejected with explicit compatibility codes", () => {
  const replay = plain(pit.recordPitReplay([
    [{ right: true }, {}],
    [{ resource: true }, {}],
  ]));
  const legacy = {
    ...replay,
    version: 1,
    engineVersion: 1,
    encoding: "input-rle-v1",
  };
  const future = {
    ...replay,
    version: pit.PIT_REPLAY_VERSION + 1,
  };
  const incompatibleEngine = {
    ...replay,
    engineVersion: replay.engineVersion + 1,
  };

  assert.equal(pit.normalizePitReplay(legacy), null);
  assert.throws(
    () => pit.deserializePitReplay(JSON.stringify(legacy)),
    (error) =>
      error instanceof pit.PitReplayCompatibilityError &&
      error.code === "legacy-version",
  );
  assert.throws(
    () => pit.playPitReplay(future),
    (error) =>
      error instanceof pit.PitReplayCompatibilityError &&
      error.code === "future-version",
  );
  assert.throws(
    () => pit.createPitReplayReader(incompatibleEngine),
    (error) =>
      error instanceof pit.PitReplayCompatibilityError &&
      error.code === "incompatible-engine",
  );
  assert.throws(
    () => pit.deserializePitReplay(JSON.stringify({ version: pit.PIT_REPLAY_VERSION, segments: "bad" })),
    (error) =>
      error instanceof pit.PitReplayCompatibilityError &&
      error.code === "invalid-replay",
  );
});
