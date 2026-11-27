import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";

const bundle = await build({
  stdin: { contents: ["pitPrecisionTrialV1", "pitPrecisionRecordsV1", "pitBonusTrialV1", "pitBonusRecordsV1",
    "pitBonusSessionV2", "pitCombat", "pitTrainingBriefing", "pitTrainingClock", "pitEquipmentV57", "archiveTransferGuard"]
    .map(name => `export * from "./app/game/systems/${name}";`).join("\n"), resolveDir: process.cwd(), loader: "ts" },
  bundle: true, write: false, platform: "node", format: "esm",
});
const pit = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text + "\n//# sourceURL=pit-precision-test-bundle.mjs").toString("base64")}`);
const OWNER = "2026-11-27T08:00:00.000Z", OTHER = "2026-11-26T08:00:00.000Z", AT = "2026-11-27T16:00:00.000Z";
const source = (fighter = "jungle-hunter", options = {}) => pit.createPitCombatState(fighter,
  fighter === "berserker" ? "city-hunter" : "berserker", { mode: "training", arenaId: "the-pit", ...options });
const goodInput = (_state, trial) => trial.stage === "aim" ? { attack: "technique" } : {};
function play({ fighter = "jungle-hunter", difficulty = "standard", policy = goodInput } = {}) {
  let { state, trial } = pit.preparePitPrecisionTrialV1(source(fighter), difficulty);
  trial = pit.beginPitPrecisionTrialV1(trial, state, true);
  const inputs = [], events = [], positions = new Set(), directions = new Set();
  for (let i = 0; i < 5000 && trial.status === "running"; i++) {
    const input = policy(state, trial);
    inputs.push(input);
    ({ state, trial } = pit.stepPitPrecisionTrialV1(trial, state, input));
    events.push(...state.events);
    for (const effect of state.techniqueEffects) {
      if (effect.ownerSlot === 0) { positions.add(effect.x); directions.add(effect.direction); }
    }
  }
  return { state, trial, inputs, events, positions, directions };
}
function storage() {
  const values = new Map(), writes = [];
  return { values, writes, getItem: key => values.get(key) ?? null,
    setItem(key, value) { values.set(key, value); writes.push([key, value]); } };
}

test("preparation is non-destructive and frozen; unavailable equipment and modes do not acquire a projectile", () => {
  const original = source(), before = structuredClone(original);
  const { state, trial } = pit.preparePitPrecisionTrialV1(original);
  assert.deepEqual(original, before);
  assert.deepEqual(state.techniqueEffects, []);
  assert.equal(state.fighters[0].definitionId, "jungle-hunter");
  assert.equal(state.fighters[1].definitionId, "berserker");
  assert.equal(pit.beginPitPrecisionTrialV1(trial, state, false), trial);
  assert.deepEqual(pit.stepPitPrecisionTrialV1(trial, state, { attack: "technique" }), { state, trial });
  for (const fighter of ["falconer", "city-hunter", "berserker", "wolf", "tracker", "feral-hunter"]) {
    assert.equal(pit.getPitPrecisionAvailabilityV1(source(fighter)).available, false, fighter);
    assert.throws(() => pit.preparePitPrecisionTrialV1(source(fighter)), /Jungle Hunter et Scar/);
  }
  const finalDuel = source("jungle-hunter", { variants: [pit.PIT_JUNGLE_FINAL_DUEL_VARIANT, null] });
  assert.equal(pit.getPitPrecisionAvailabilityV1(finalDuel).available, false);
  assert.match(pit.getPitPrecisionAvailabilityV1(finalDuel).reason, /canon et harnais retirés/);
  assert.throws(() => pit.preparePitPrecisionTrialV1(source("jungle-hunter", { mode: "match" })), /Entraînement/);
  assert.throws(() => pit.preparePitPrecisionTrialV1(original, "invalid"), /difficulty/);
});

test("both supported kits earn four hits through travelling plasma in both directions", () => {
  for (const fighter of pit.PIT_PRECISION_FIGHTERS_V1) {
    const run = play({ fighter });
    assert.equal(run.trial.status, "success", JSON.stringify(run.trial));
    assert.equal(run.trial.completed, 4);
    assert.equal(run.trial.mistakes, 0);
    assert.equal(run.events.filter(e => e.type === "attack-start" && e.attack === "technique").length, 4);
    assert.equal(run.events.filter(e => e.type === "hit" && e.attack === "technique" && e.attackerId === fighter && e.damage > 0).length, 4);
    assert.ok(run.positions.size > 20, "physical flight spans many world positions");
    assert.deepEqual([...run.directions].sort(), [-1, 1]);
    assert.equal(run.events.filter(e => e.type === "round-end" || e.type === "match-end").length, 0);
    assert.equal(run.state.matchWinnerId, null);
    assert.deepEqual(run.state.fighters.map(f => f.roundsWon), [0, 0]);
    assert.equal(run.state.frame, run.trial.elapsedTicks);
    assert.equal(pit.pitPrecisionResultV1(run.trial).rank, "S");
    assert.deepEqual(pit.stepPitPrecisionTrialV1(run.trial, run.state, { attack: "technique" }), { state: run.state, trial: run.trial });
  }
});

test("no input, preemptive shots, melee and point-blank shots cannot counterfeit precision", () => {
  const policies = {
    "no shot": () => ({}),
    "too early": (_state, trial) => trial.stage === "signal" ? { attack: "technique" } : {},
    "normal attack": (_state, trial) => trial.stage === "aim" ? { attack: "light" } : {},
    "point blank": (state, trial) => trial.stage === "signal" && Math.abs(state.fighters[0].x - state.fighters[1].x) > 100
      ? { right: state.fighters[0].x < state.fighters[1].x, left: state.fighters[0].x > state.fighters[1].x }
      : trial.stage === "aim" ? { attack: "technique" } : {},
  };
  for (const [label, policy] of Object.entries(policies)) {
    const run = play({ policy });
    assert.equal(run.trial.status, "failed", label);
    assert.equal(run.trial.completed, 0, label);
    assert.equal(run.trial.mistakes, 3, label);
  }
});

test("a high airborne shot can miss the hurtbox; pressing the correct button alone never awards progress", () => {
  const run = play({ policy: (_state, trial) => trial.stage === "signal" && trial.stageTicks === 56
    ? { jump: true } : trial.stage === "aim" ? { attack: "technique" } : {} });
  assert.ok(run.events.some(e => e.type === "attack-start" && e.attack === "technique"));
  assert.ok(run.positions.size > 10);
  assert.equal(run.trial.status, "failed");
  assert.equal(run.trial.completed, 0);
});

test("stale state pairs are rejected and a recorded input stream replays deterministically", () => {
  const first = play();
  let { state, trial } = pit.preparePitPrecisionTrialV1(source());
  trial = pit.beginPitPrecisionTrialV1(trial, state, true);
  const stepped = pit.stepPitPrecisionTrialV1(trial, state, {});
  assert.equal(pit.stepPitPrecisionTrialV1(trial, stepped.state, {}).trial, trial);
  assert.equal(pit.beginPitPrecisionTrialV1(trial, state, true), trial);
  for (const input of first.inputs) ({ state, trial } = pit.stepPitPrecisionTrialV1(trial, state, input));
  assert.deepEqual({ state, trial }, { state: first.state, trial: first.trial });
  const reset = pit.preparePitPrecisionTrialV1(state, "assisted");
  assert.equal(reset.state.frame, 0);
  assert.equal(reset.trial.completed, 0);
  assert.equal(reset.trial.difficulty, "assisted");
  assert.deepEqual(reset.state.techniqueEffects, []);
});

test("briefing and pause discard wall time; assistance changes the actual timing recipe and rank", () => {
  const prepared = pit.preparePitPrecisionTrialV1(source());
  let clock = pit.createPitTrainingClock(true);
  assert.equal(pit.advancePitTrainingSessionClock(pit.requestPitTrainingTick(clock), 60000, prepared.trial).ticks, 0);
  clock = pit.createPitTrainingClock();
  clock = pit.pausePitTrainingClock(clock, true);
  assert.equal(pit.advancePitTrainingSessionClock(clock, 60000, { ...prepared.trial, status: "running" }).ticks, 0);
  clock = pit.pausePitTrainingClock(clock, false);
  assert.equal(pit.advancePitTrainingSessionClock(clock, 1, { ...prepared.trial, status: "running" }).ticks, 0);
  const assisted = play({ difficulty: "assisted" });
  assert.equal(assisted.trial.status, "success");
  assert.equal(pit.pitPrecisionResultV1(assisted.trial).rank, "Maîtrise accompagnée");
  assert.ok(assisted.trial.elapsedTicks > play().trial.elapsedTicks);
  assert.ok(pit.pitPrecisionRulesV1("assisted").aimTicks > pit.pitPrecisionRulesV1("standard").aimTicks);
});

test("precision records are explicit, idempotent and isolated from riposte, difficulty and another owner", () => {
  const memory = storage(), run = play();
  const riposteKey = pit.pitBonusRecordsStorageKeyV1(OWNER);
  const sentinel = JSON.stringify({ version: 1, trialId: pit.PIT_BONUS_TRIAL_ID_V1, ownerSaveCreatedAt: OWNER, best: {} });
  memory.values.set(riposteKey, sentinel);
  assert.equal(memory.writes.length, 0);
  const saved = pit.savePitBonusSessionRecordV2(OWNER, run.trial, AT, memory);
  assert.equal(saved.saved, true); assert.equal(saved.improved, true); assert.equal(memory.writes.length, 1);
  assert.equal(memory.getItem(riposteKey), sentinel);
  assert.notEqual(pit.pitPrecisionRecordsStorageKeyV1(OWNER), riposteKey);
  assert.equal(pit.loadPitBonusSessionRecordsV2(OWNER, "precision", memory).records.best.standard.score, saved.records.best.standard.score);
  assert.equal(pit.loadPitBonusSessionRecordsV2(OWNER, "riposte", memory).records.best.standard, undefined);
  assert.equal(pit.loadPitPrecisionRecordsV1(OTHER, memory).status, "empty");
  assert.equal(pit.savePitPrecisionRecordV1(OWNER, run.trial, AT, memory).improved, false);
  assert.equal(memory.writes.length, 1);
  assert.equal(pit.savePitPrecisionRecordV1(OWNER, play({ difficulty: "assisted" }).trial, AT, memory).saved, true);
  assert.deepEqual(Object.keys(pit.loadPitPrecisionRecordsV1(OWNER, memory).records.best).sort(), ["assisted", "standard"]);
});

test("invalid, future, foreign and oversized archives are preserved; no failed trial is stored", () => {
  for (const raw of ["{broken", JSON.stringify({ version: 2 }), JSON.stringify({ version: 1,
    trialId: pit.PIT_PRECISION_TRIAL_ID_V1, ownerSaveCreatedAt: OTHER, best: {} }), " ".repeat(8193)]) {
    const memory = storage(), key = pit.pitPrecisionRecordsStorageKeyV1(OWNER);
    memory.values.set(key, raw);
    assert.equal(pit.savePitPrecisionRecordV1(OWNER, play().trial, AT, memory).saved, false);
    assert.equal(memory.getItem(key), raw); assert.equal(memory.writes.length, 0);
  }
  const memory = storage();
  assert.equal(pit.savePitPrecisionRecordV1(OWNER, play({ policy: () => ({}) }).trial, AT, memory).saved, false);
  assert.equal(pit.savePitPrecisionRecordV1(undefined, play().trial, AT, memory).saved, false);
  assert.equal(memory.writes.length, 0);
});

test("the shared presentation adapter preserves the riposte V1 recipe and its archive contract", () => {
  let direct = pit.preparePitBonusTrialV1(source()), adapted = pit.preparePitBonusSessionV2(source(), "standard", "riposte");
  assert.deepEqual(direct, adapted);
  direct.trial = pit.beginPitBonusTrialV1(direct.trial, direct.state, true);
  adapted.trial = pit.beginPitBonusSessionV2(adapted.trial, adapted.state, true);
  for (let i = 0; i < 160; i++) {
    const input = { guardLow: true };
    direct = pit.stepPitBonusTrialV1(direct.trial, direct.state, input);
    adapted = pit.stepPitBonusSessionV2(adapted.trial, adapted.state, input);
  }
  assert.deepEqual(adapted, direct);
  assert.deepEqual(pit.pitBonusSessionResultV2(adapted.trial), pit.pitBonusResultV1(direct.trial));
});

test("precision never claims a record during archive transfer, failed writes or an unreadable size expansion", () => {
  const run = play(), blocked = storage(); blocked.values.set(pit.ARCHIVE_TRANSFER_JOURNAL_KEY, "");
  assert.equal(pit.savePitPrecisionRecordV1(OWNER, run.trial, AT, blocked).saved, false);
  assert.equal(blocked.writes.length, 0);
  assert.equal(pit.savePitPrecisionRecordV1(OWNER, run.trial, AT, null).saved, false);
  assert.equal(pit.savePitPrecisionRecordV1(OWNER, run.trial, AT,
    { getItem: () => null, setItem: () => { throw new Error("quota"); } }).saved, false);
  const memory = storage(), key = pit.pitPrecisionRecordsStorageKeyV1(OWNER);
  const empty = { version: 1, trialId: pit.PIT_PRECISION_TRIAL_ID_V1, ownerSaveCreatedAt: OWNER, best: {}, extra: "" };
  const raw = JSON.stringify({ ...empty, extra: "x".repeat(pit.PIT_PRECISION_RECORDS_MAX_LENGTH_V1 - 2 - JSON.stringify(empty).length) });
  memory.values.set(key, raw);
  assert.equal(pit.loadPitPrecisionRecordsV1(OWNER, memory).status, "ready");
  assert.equal(pit.savePitPrecisionRecordV1(OWNER, run.trial, AT, memory).saved, false);
  assert.equal(memory.getItem(key), raw); assert.equal(memory.writes.length, 0);
});

test("the time boundary stops at the authored limit without an extra simulated frame", () => {
  let { state, trial } = pit.preparePitPrecisionTrialV1(source());
  trial = pit.beginPitPrecisionTrialV1(trial, state, true);
  const limit = pit.pitPrecisionRulesV1(trial.difficulty).limitTicks;
  state = { ...state, frame: limit - 1 };
  trial = { ...trial, observedFrame: limit - 1, elapsedTicks: limit - 1 };
  ({ state, trial } = pit.stepPitPrecisionTrialV1(trial, state, {}));
  assert.equal(trial.status, "failed"); assert.equal(trial.elapsedTicks, limit);
  assert.equal(pit.pitPrecisionResultV1(trial).remainingTicks, 0);
  assert.equal(pit.stepPitPrecisionTrialV1(trial, state, {}).trial, trial);
});
