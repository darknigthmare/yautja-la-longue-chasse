import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";

const bundle = await build({
  stdin: { contents: ["pitBonusTrialV1", "pitBonusRecordsV1", "pitCombat", "pitTrainingClock", "pitTrainingBriefing", "pitFirstEdition", "archiveTransferGuard"]
    .map(name => `export * from "./app/game/systems/${name}";`).join("\n"), resolveDir: process.cwd(), loader: "ts" },
  bundle: true, write: false, platform: "node", format: "esm",
});
const pit = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString("base64")}`);
const OWNER = "2026-11-27T08:00:00.000Z", AT = "2026-11-27T08:30:00.000Z";
const source = (fighter = "jungle-hunter") => pit.createPitCombatState(fighter, fighter === "berserker" ? "wolf" : "berserker", { mode: "training", arenaId: "the-pit" });
const goodInput = (state, trial) => trial.stage === "counter"
  ? { right: state.fighters[1].x - state.fighters[0].x > 80, attack: trial.stageTicks % 30 === 20 ? "light" : undefined }
  : { guardLow: true };
function play({ fighter = "jungle-hunter", difficulty = "standard", policy = goodInput } = {}) {
  let { state, trial } = pit.preparePitBonusTrialV1(source(fighter), difficulty);
  trial = pit.beginPitBonusTrialV1(trial, state, true);
  const events = [], inputs = [];
  for (let index = 0; index < 3600 && trial.status === "running"; index++) {
    const input = policy(state, trial);
    inputs.push(input);
    ({ state, trial } = pit.stepPitBonusTrialV1(trial, state, input));
    events.push(...state.events);
  }
  return { state, trial, events, inputs };
}
function storage() {
  const values = new Map(), writes = [];
  return { values, writes, getItem: key => values.get(key) ?? null, setItem: (key, value) => { values.set(key, value); writes.push([key, value]); } };
}

test("bonus preparation preserves identity and source state, clears combat objects and freezes until explicit ready start", () => {
  const original = source(), before = structuredClone(original);
  const { state, trial } = pit.preparePitBonusTrialV1(original);
  assert.deepEqual(original, before);
  assert.equal(state.fighters[0].definitionId, original.fighters[0].definitionId);
  assert.equal(state.rules.mode, "training");
  assert.equal(state.phase, "round");
  assert.equal(state.matchWinnerId, null);
  assert.deepEqual(state.techniqueEffects, []);
  assert.equal(trial.status, "briefing");
  assert.equal(pit.beginPitBonusTrialV1(trial, state, false), trial);
  assert.deepEqual(pit.stepPitBonusTrialV1(trial, state, { attack: "heavy" }), { state, trial });
  const begun = pit.beginPitBonusTrialV1(trial, state, true);
  assert.equal(begun.status, "running");
  assert.equal(pit.beginPitBonusTrialV1(begun, state, true), begun);
  assert.throws(() => pit.preparePitBonusTrialV1(pit.createPitCombatState()), /Entraînement/);
  assert.throws(() => pit.preparePitBonusTrialV1(original, "invalid"), /difficulty/);
});

test("four genuine low blocks and normal counters finish a bonus without rounds, victories or rewards", () => {
  const run = play();
  assert.equal(run.trial.status, "success", JSON.stringify(run.trial));
  assert.equal(run.trial.completed, 4);
  assert.equal(run.trial.mistakes, 0);
  assert.equal(run.events.filter(event => event.type === "block").length, 4);
  assert.equal(run.events.filter(event => event.type === "hit" && event.attackerId === "jungle-hunter").length, 4);
  assert.equal(run.events.filter(event => event.type === "round-end" || event.type === "match-end").length, 0);
  assert.equal(run.state.phase, "round");
  assert.equal(run.state.matchWinnerId, null);
  assert.deepEqual(run.state.fighters.map(fighter => fighter.roundsWon), [0, 0]);
  assert.equal(run.state.frame, run.trial.elapsedTicks);
  assert.equal(pit.pitBonusResultV1(run.trial).rank, "S");
  assert.deepEqual(pit.stepPitBonusTrialV1(run.trial, run.state, { attack: "heavy" }), { state: run.state, trial: run.trial });
});

test("the twelve historical fighters use real compatible attacks, including a distinct dummy for City Hunter", () => {
  for (const fighter of pit.PIT_FIRST_EDITION_FIGHTER_IDS) {
    const run = play({ fighter });
    assert.equal(run.trial.status, "success", fighter + ": " + JSON.stringify(run.trial));
    assert.notEqual(run.trial.playerId, run.trial.dummyId);
    assert.equal(run.state.fighters[0].definitionId, fighter);
  }
});

test("high guard, preemptive attacks and a guard held through the opening cannot counterfeit success", () => {
  for (const [label, policy] of [
    ["high guard", () => ({ guardHigh: true })],
    ["no input", () => ({})],
    ["guard without counter", () => ({ guardLow: true })],
    ["attack before block", (_state, trial) => ({ right: true, attack: trial.elapsedTicks % 30 === 0 ? "light" : undefined })],
  ]) {
    const run = play({ policy });
    assert.equal(run.trial.status, "failed", label);
    assert.equal(run.trial.completed, 0, label);
    assert.equal(run.trial.mistakes, 3, label);
    assert.equal(run.state.phase, "round", label);
  }
});

test("technical moves and throws do not replace the required normal riposte; assistance changes limits and rank explicitly", () => {
  for (const attack of ["technique", "throw"]) {
    const wrong = play({ policy: (state, trial) => trial.stage === "counter"
      ? { right: state.fighters[1].x - state.fighters[0].x > 40,
        ...(attack === "throw" ? { throw: trial.stageTicks % 40 === 20 } : { attack: trial.stageTicks % 40 === 20 ? "technique" : undefined }) }
      : { guardLow: true } });
    assert.equal(wrong.trial.status, "failed", attack);
    assert.equal(wrong.trial.completed, 0, attack);
    assert.ok(wrong.events.some(event => event.type === "hit" && event.attackerId === "jungle-hunter" && event.attack === attack), attack + " made real contact but did not qualify");
  }
  const assisted = play({ difficulty: "assisted" });
  assert.equal(assisted.trial.status, "success");
  assert.equal(pit.pitBonusResultV1(assisted.trial).rank, "Maîtrise accompagnée");
  assert.deepEqual(pit.pitBonusRulesV1("assisted"), { limitTicks: 3600, signalTicks: 90, counterTicks: 240, maxMistakes: 5 });
});

test("frame ownership, terminal states and replaying the same actual input stream are deterministic", () => {
  const first = play();
  let { state, trial } = pit.preparePitBonusTrialV1(source());
  trial = pit.beginPitBonusTrialV1(trial, state, true);
  const step = pit.stepPitBonusTrialV1(trial, state, {});
  assert.equal(pit.stepPitBonusTrialV1(trial, step.state, {}).trial, trial);
  for (const input of first.inputs) ({ state, trial } = pit.stepPitBonusTrialV1(trial, state, input));
  assert.deepEqual({ state, trial }, { state: first.state, trial: first.trial });
  const restarted = pit.preparePitBonusTrialV1(state);
  assert.equal(restarted.trial.elapsedTicks, 0);
  assert.equal(restarted.trial.completed, 0);
  assert.equal(restarted.state.frame, 0);
  assert.deepEqual(restarted.state.fighters.map(fighter => fighter.health), restarted.state.fighters.map(fighter => pit.PIT_FIGHTERS[fighter.definitionId].maxHealth));
});

test("pause/blur transport discards wall time and stale steps, and resumes the same combat and objective tick", () => {
  let { state, trial } = pit.preparePitBonusTrialV1(source());
  let clock = pit.createPitTrainingClock(true);
  assert.equal(pit.advancePitTrainingSessionClock(pit.requestPitTrainingTick(clock), 60_000, trial).ticks, 0);
  trial = pit.beginPitBonusTrialV1(trial, state, true);
  clock = pit.createPitTrainingClock();
  for (let i = 0; i < 100; i++) ({ state, trial } = pit.stepPitBonusTrialV1(trial, state, goodInput(state, trial)));
  const frozen = structuredClone({ state, trial });
  clock = pit.pausePitTrainingClock(clock, true);
  assert.equal(pit.advancePitTrainingSessionClock(clock, 60_000, trial).ticks, 0);
  assert.deepEqual({ state, trial }, frozen);
  clock = pit.pausePitTrainingClock(clock, false);
  assert.equal(pit.advancePitTrainingSessionClock(clock, 1, trial).ticks, 0);
  ({ state, trial } = pit.stepPitBonusTrialV1(trial, state, goodInput(state, trial)));
  assert.equal(state.frame, frozen.state.frame + 1);
  assert.equal(trial.elapsedTicks, frozen.trial.elapsedTicks + 1);
});

test("the terminal time boundary never ticks beyond the authored duration", () => {
  let { state, trial } = pit.preparePitBonusTrialV1(source());
  trial = pit.beginPitBonusTrialV1(trial, state, true);
  const limit = pit.pitBonusRulesV1(trial.difficulty).limitTicks;
  state = { ...state, frame: limit - 1 };
  trial = { ...trial, observedFrame: limit - 1, elapsedTicks: limit - 1 };
  ({ state, trial } = pit.stepPitBonusTrialV1(trial, state, { guardLow: true }));
  assert.equal(trial.status, "failed");
  assert.equal(trial.elapsedTicks, limit);
  assert.equal(pit.pitBonusResultV1(trial).remainingTicks, 0);
  assert.equal(pit.stepPitBonusTrialV1(trial, state, {}).trial, trial);
});

test("a personal record is written only on explicit success opt-in, roundtrips and does not duplicate", () => {
  const memory = storage(), run = play();
  assert.equal(memory.writes.length, 0);
  const loaded = pit.loadPitBonusRecordsV1(OWNER, memory);
  assert.equal(loaded.status, "empty");
  assert.equal(memory.writes.length, 0);
  const saved = pit.savePitBonusRecordV1(OWNER, run.trial, AT, memory);
  assert.equal(saved.saved, true);
  assert.equal(saved.improved, true);
  assert.equal(memory.writes.length, 1);
  assert.deepEqual(pit.loadPitBonusRecordsV1(OWNER, memory).records, saved.records);
  assert.equal(pit.savePitBonusRecordV1(OWNER, run.trial, AT, memory).improved, false);
  assert.equal(memory.writes.length, 1);
  assert.equal(memory.writes[0][0], pit.pitBonusRecordsStorageKeyV1(OWNER));
  assert.doesNotMatch(memory.writes[0][1], /unlocked|honor|campaignStats|roundsWon/);
  const assisted = play({ difficulty: "assisted" });
  assert.equal(pit.savePitBonusRecordV1(OWNER, assisted.trial, AT, memory).saved, true);
  assert.deepEqual(Object.keys(pit.loadPitBonusRecordsV1(OWNER, memory).records.best).sort(), ["assisted", "standard"]);
});

test("corrupt, future or foreign records are preserved; failed writes, absent owner and archive transfer cannot claim persistence", () => {
  const run = play(), key = pit.pitBonusRecordsStorageKeyV1(OWNER);
  const valid = pit.savePitBonusRecordV1(OWNER, run.trial, AT, storage()).records;
  for (const [raw, status] of [
    ["{broken", "invalid"], [JSON.stringify({ ...valid, version: 7 }), "unsupported"],
    [JSON.stringify({ ...valid, ownerSaveCreatedAt: "2026-11-26T08:00:00.000Z" }), "owner-mismatch"],
    [JSON.stringify({ ...valid, best: { standard: { ...valid.best.standard, score: 99999 } } }), "invalid"],
  ]) {
    const memory = storage(); memory.values.set(key, raw);
    assert.equal(pit.loadPitBonusRecordsV1(OWNER, memory).status, status);
    assert.equal(pit.savePitBonusRecordV1(OWNER, run.trial, AT, memory).saved, false);
    assert.equal(memory.values.get(key), raw);
    assert.equal(memory.writes.length, 0);
  }
  const blocked = storage(); blocked.values.set(pit.ARCHIVE_TRANSFER_JOURNAL_KEY, "");
  assert.equal(pit.savePitBonusRecordV1(OWNER, run.trial, AT, blocked).saved, false);
  assert.equal(blocked.writes.length, 0);
  assert.equal(pit.savePitBonusRecordV1(undefined, run.trial, AT, storage()).saved, false);
  assert.equal(pit.savePitBonusRecordV1(OWNER, run.trial, AT, null).saved, false);
  assert.equal(pit.savePitBonusRecordV1(OWNER, run.trial, AT, { getItem: () => null, setItem: () => { throw new Error("quota"); } }).saved, false);
  const memory = storage();
  assert.equal(pit.savePitBonusRecordV1(OWNER, play({ policy: () => ({}) }).trial, AT, memory).saved, false);
  assert.equal(pit.savePitBonusRecordV1(OWNER, { ...run.trial, difficulty: "forged" }, AT, memory).saved, false);
  assert.equal(memory.writes.length, 0);
});

test("an accepted archive near the size bound is preserved byte for byte if the new best would exceed the readable limit", () => {
  const memory = storage(), key = pit.pitBonusRecordsStorageKeyV1(OWNER);
  const blank = { version: 1, trialId: pit.PIT_BONUS_TRIAL_ID_V1, ownerSaveCreatedAt: OWNER, best: {}, extra: "" };
  const raw = JSON.stringify({ ...blank, extra: "x".repeat(pit.PIT_BONUS_RECORDS_MAX_LENGTH_V1 - 2 - JSON.stringify(blank).length) });
  assert.equal(raw.length, 8190);
  memory.values.set(key, raw);
  assert.equal(pit.loadPitBonusRecordsV1(OWNER, memory).status, "ready");
  const saved = pit.savePitBonusRecordV1(OWNER, play().trial, AT, memory);
  assert.equal(saved.saved, false);
  assert.equal(saved.improved, false);
  assert.match(saved.message, /taille maximale/);
  assert.equal(memory.values.get(key), raw);
  assert.equal(memory.writes.length, 0);
  assert.equal(pit.loadPitBonusRecordsV1(OWNER, memory).status, "ready");
});
