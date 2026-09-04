import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";

const bundle = await build({
  stdin: {
    contents: [
      'export * from "./app/game/systems/pitTraining";',
      'export { createPitCombatState, PIT_ARENA, PIT_FIGHTERS, stepPitCombat } from "./app/game/systems/pitCombat";',
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

test("professional defaults and French labels expose every training control", () => {
  const settings = pit.createPitTrainingSettings();
  assert.deepEqual(settings, {
    version: 1,
    dummyBehavior: "guard-alternate",
    showHitboxes: false,
    showFrameData: true,
    sequencePlayback: "loop",
  });
  assert.deepEqual(
    pit.PIT_TRAINING_DUMMY_OPTIONS.map((option) => option.value),
    pit.PIT_TRAINING_DUMMY_BEHAVIORS,
  );
  assert.ok(pit.PIT_TRAINING_DUMMY_OPTIONS.every(
    (option) => option.label.length > 0 && option.description.length > 20,
  ));
  assert.match(pit.PIT_TRAINING_ACTION_LABELS.resetPositions, /positions/i);
  assert.match(pit.PIT_TRAINING_ACTION_LABELS.showFrameData, /données/i);
});

test("versioned settings normalize defensively and reject unrelated campaign data", () => {
  const source = {
    version: 1,
    dummyBehavior: "guard-low",
    showHitboxes: true,
    showFrameData: false,
    sequencePlayback: "once",
  };
  const normalized = pit.normalizePitTrainingSettings(source);
  assert.deepEqual(normalized, source);
  assert.notEqual(normalized, source);
  assert.deepEqual(
    pit.updatePitTrainingSettings(normalized, { dummyBehavior: "cpu", showFrameData: true }),
    { ...source, dummyBehavior: "cpu", showFrameData: true },
  );

  const invalid = [
    { ...source, version: 2 },
    { ...source, dummyBehavior: "counter-all" },
    { ...source, showHitboxes: "yes" },
    { ...source, campaignReward: { honor: 9_999 } },
    { ...source, progression: "unlocked" },
  ];
  for (const candidate of invalid) assert.equal(pit.normalizePitTrainingSettings(candidate), null);
  assert.throws(
    () => pit.createPitTrainingSettings({ campaignReward: true }),
    /Invalid or incompatible THE PIT training settings/,
  );
  assert.doesNotMatch(JSON.stringify(normalized), /campaign|reward|progression/i);
});

test("dummy presets are deterministic and the CPU never receives live player input", () => {
  const state = pit.createPitCombatState("jungle-hunter", "berserker", { mode: "training" });
  assert.deepEqual(
    plain(pit.resolvePitTrainingDummyInput(pit.createPitTrainingSettings({ dummyBehavior: "idle" }), state)),
    {},
  );
  assert.deepEqual(
    plain(pit.resolvePitTrainingDummyInput(pit.createPitTrainingSettings({ dummyBehavior: "guard-high" }), state)),
    { guardHigh: true },
  );
  assert.deepEqual(
    plain(pit.resolvePitTrainingDummyInput(pit.createPitTrainingSettings({ dummyBehavior: "guard-low" }), state)),
    { down: true, guardLow: true },
  );

  const alternating = pit.createPitTrainingSettings({ dummyBehavior: "guard-alternate" });
  assert.deepEqual(plain(pit.resolvePitTrainingDummyInput(alternating, state)), { guardHigh: true });
  const lowWindow = plain(state);
  lowWindow.frame = pit.PIT_TRAINING_ALTERNATE_GUARD_FRAMES;
  assert.deepEqual(
    plain(pit.resolvePitTrainingDummyInput(alternating, lowWindow)),
    { down: true, guardLow: true },
  );

  const cpuSettings = pit.createPitTrainingSettings({ dummyBehavior: "cpu" });
  const farInput = pit.resolvePitTrainingDummyInput(cpuSettings, state);
  assert.deepEqual(plain(farInput), { left: true });
  assert.deepEqual(
    plain(pit.resolvePitTrainingDummyInput(cpuSettings, state)),
    plain(farInput),
    "identical prior state must always produce identical CPU input",
  );
  const attackWindow = plain(state);
  attackWindow.fighters[0].x = 440;
  attackWindow.fighters[1].x = 500;
  attackWindow.frame = 60;
  assert.deepEqual(
    plain(pit.resolvePitTrainingDummyInput(cpuSettings, attackWindow)),
    { attack: "light" },
  );

  const match = pit.createPitCombatState();
  assert.deepEqual(plain(pit.resolvePitTrainingDummyInput(alternating, match)), {});
});

test("position reset creates a clean training situation without mutating the source", () => {
  const source = pit.createPitCombatState("berserker", "jungle-hunter", { mode: "training" });
  source.fighters[0].x = 501;
  source.fighters[0].health = 175;
  source.fighters[0].phase = "hitstun";
  source.fighters[0].stunFrames = 9;
  source.frame = 423;
  const reset = pit.resetPitTrainingPositions(source);

  assert.notEqual(reset, source);
  assert.equal(source.fighters[0].health, 175);
  assert.deepEqual(reset.fighters.map((fighter) => fighter.definitionId), ["berserker", "jungle-hunter"]);
  assert.deepEqual(reset.fighters.map((fighter) => fighter.x), [...pit.PIT_ARENA.spawnX]);
  assert.deepEqual(reset.fighters.map((fighter) => fighter.phase), ["idle", "idle"]);
  assert.deepEqual(
    reset.fighters.map((fighter) => fighter.health),
    [pit.PIT_FIGHTERS.berserker.maxHealth, pit.PIT_FIGHTERS["jungle-hunter"].maxHealth],
  );
  assert.equal(reset.frame, 0);
  assert.deepEqual(reset.rules, { mode: "training" });
  assert.throws(() => pit.resetPitTrainingPositions(pit.createPitCombatState()), /only be reset during training/);
});

test("frame readout derives startup totals and defensive recovery without changing combat", () => {
  let state = pit.createPitCombatState("jungle-hunter", "berserker", { mode: "training" });
  state = pit.stepPitCombat(state, [{ attack: "medium" }, {}]);
  const readout = pit.getPitTrainingFrameReadout(state, 0);
  const move = pit.PIT_FIGHTERS["jungle-hunter"].attacks.medium;
  assert.equal(readout.globalFrame, 1);
  assert.equal(readout.phase, "startup");
  assert.equal(readout.phaseLabel, "Démarrage");
  assert.equal(readout.attack, "medium");
  assert.equal(readout.actionFrame, 1);
  assert.equal(readout.phaseFrame, 1);
  assert.equal(readout.phaseTotalFrames, move.startup);
  assert.equal(readout.actionTotalFrames, move.startup + move.active + move.recovery);
  assert.equal(readout.framesRemaining, readout.actionTotalFrames);

  const stunned = plain(state);
  stunned.fighters[1].phase = "blockstun";
  stunned.fighters[1].stunFrames = 7;
  const defense = pit.getPitTrainingFrameReadout(stunned, 1);
  assert.equal(defense.phaseLabel, "Blocage");
  assert.equal(defense.framesRemaining, 7);
  assert.equal(defense.actionKind, null);
});

test("short sequence recording is compact, exact and contains no reward surface", () => {
  const frames = [
    ...Array.from({ length: 90 }, () => ({ guardHigh: true })),
    { attack: "medium" },
    { resource: true },
    ...Array.from({ length: 30 }, () => ({})),
  ];
  const sequence = pit.recordPitTrainingSequence(frames);
  assert.equal(sequence.metadata.ticks, frames.length);
  assert.equal(sequence.metadata.durationMs, Math.round(frames.length * 1_000 / 60));
  assert.ok(sequence.segments.length < frames.length);
  assert.match(sequence.metadata.checksum, /^[0-9a-f]{8}$/);
  assert.deepEqual(plain(pit.normalizePitTrainingSequence(sequence)), plain(sequence));
  assert.doesNotMatch(JSON.stringify(sequence), /campaign|reward|honor|progression/i);

  const decoded = [];
  const reader = pit.createPitTrainingSequenceReader(sequence, "once");
  while (!reader.done) decoded.push(plain(reader.next().value.input));
  assert.deepEqual(decoded, frames);
  assert.equal(reader.remainingTicks, 0);
  assert.deepEqual(reader.next(), { done: true, value: null });
});

test("sequence normalization rejects future, corrupt, noncanonical and foreign payloads", () => {
  const valid = plain(pit.recordPitTrainingSequence([
    { left: true },
    { attack: "heavy" },
    { resource: true },
  ]));
  const invalid = [
    { ...valid, version: valid.version + 1 },
    { ...valid, encoding: "dummy-input-rle-v2" },
    { ...valid, campaignReward: 500 },
    { ...valid, metadata: { ...valid.metadata, checksum: "00000000" } },
    { ...valid, metadata: { ...valid.metadata, ticks: 99 } },
    { ...valid, segments: [[1, 5 << 7]], metadata: { ...valid.metadata, ticks: 1 } },
    { ...valid, segments: [[1, 0], [1, 0]], metadata: { ...valid.metadata, ticks: 2 } },
  ];
  for (const candidate of invalid) assert.equal(pit.normalizePitTrainingSequence(candidate), null);
  assert.throws(
    () => pit.recordPitTrainingSequence([{ attack: "fatality" }]),
    /Invalid or incompatible THE PIT training sequence/,
  );
  assert.throws(
    () => pit.recordPitTrainingSequence([{ left: true, honorReward: 10 }]),
    /Invalid or incompatible THE PIT training sequence/,
  );
});

test("once and loop readers expose exact cycle boundaries and reset cleanly", () => {
  const frames = [{ left: true }, { left: true }, { attack: "light" }];
  const sequence = pit.recordPitTrainingSequence(frames);
  const once = pit.createPitTrainingSequenceReader(sequence, "once");
  assert.equal(once.totalTicks, 3);
  assert.equal(once.remainingTicks, 3);
  assert.deepEqual(plain(once.next().value.input), frames[0]);
  assert.equal(once.remainingTicks, 2);
  once.reset();
  assert.equal(once.tick, 0);
  assert.equal(once.remainingTicks, 3);

  const loop = pit.createPitTrainingSequenceReader(sequence, "loop");
  const ticks = Array.from({ length: 5 }, () => loop.next().value);
  assert.deepEqual(ticks.map((entry) => entry.tick), [0, 1, 2, 3, 4]);
  assert.deepEqual(ticks.map((entry) => entry.cycle), [0, 0, 0, 1, 1]);
  assert.deepEqual(ticks.map((entry) => plain(entry.input)), [
    frames[0], frames[1], frames[2], frames[0], frames[1],
  ]);
  assert.equal(loop.done, false);
  assert.equal(loop.cycle, 1);
  assert.equal(loop.remainingTicks, 1);
});

test("recording hard-stops at twelve seconds and an empty recording stays inert", () => {
  const recorder = pit.createPitTrainingSequenceRecorder();
  for (let frame = 0; frame < pit.PIT_TRAINING_SEQUENCE_MAX_TICKS; frame += 1) {
    recorder.append(frame % 2 === 0 ? { left: true } : { right: true });
  }
  assert.equal(recorder.tickCount, pit.PIT_TRAINING_SEQUENCE_MAX_TICKS);
  assert.throws(() => recorder.append({}), /Invalid or incompatible/);
  const sequence = recorder.finish();
  assert.equal(sequence.segments.length, pit.PIT_TRAINING_SEQUENCE_MAX_SEGMENTS);
  assert.equal(recorder.finish(), sequence, "finish must be idempotent for React cleanup paths");
  assert.throws(() => recorder.append({}), /Invalid or incompatible/);

  const empty = pit.recordPitTrainingSequence([]);
  assert.equal(empty.metadata.ticks, 0);
  const reader = pit.createPitTrainingSequenceReader(empty, "loop");
  assert.equal(reader.done, true);
  assert.deepEqual(reader.next(), { done: true, value: null });
});
