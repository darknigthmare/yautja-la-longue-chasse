import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { build } from "esbuild";

const bundled = await build({ stdin: { contents: [
  'export * from "./app/game/systems/pitTrainingBriefing";',
  'export * from "./app/game/systems/pitTrainingLessons";',
  'export * from "./app/game/systems/pitTrainingClock";',
  'export * from "./app/game/systems/pitCombat";',
].join("\n"), resolveDir: process.cwd(), loader: "ts" }, bundle: true, write: false, platform: "node", format: "esm" });
const p = await import("data:text/javascript;base64," + Buffer.from(bundled.outputFiles[0].text).toString("base64"));
const session = () => p.createPitCombatState("jungle-hunter", "berserker", { mode: "training", arenaId: "the-pit" });
const ready = () => p.getPitTrainingBriefingReadiness(["ready", "ready"], "ready");

test("cold preparation freezes the real lesson, dummy, resources and countdown without modifying the old session", () => {
  const old = session(), before = JSON.stringify(old);
  const prepared = p.preparePitTrainingBriefing(old, "guard-low");
  assert.equal(JSON.stringify(old), before);
  assert.equal(prepared.lesson.status, "briefing");
  assert.equal(prepared.state.frame, 0);
  assert.equal(prepared.lesson.elapsedTicks, 0);
  assert.equal(prepared.state.fighters[1].definitionId, "city-hunter");
  assert.equal(prepared.clock.paused, true);
  const frozen = JSON.stringify(prepared);
  for (const elapsed of [16, 250, 15_000, 60_000, Number.NaN]) {
    assert.deepEqual(p.resolvePitTrainingLessonInput(prepared.lesson, prepared.state), {});
    const clock = p.requestPitTrainingTick(prepared.clock);
    assert.equal(p.advancePitTrainingSessionClock(clock, elapsed, prepared.lesson).ticks, 0);
    assert.equal(p.advancePitTrainingSessionClock(p.createPitTrainingClock(), elapsed, prepared.lesson).ticks, 0);
  }
  assert.equal(JSON.stringify(prepared), frozen);
});

test("loading cannot start, while a disclosed failure or bounded timeout permits explicit start", () => {
  const prepared = p.preparePitTrainingBriefing(session(), "guard-low");
  for (const states of [["loading", "ready"], ["failed", "loading"]]) {
    const readiness = p.getPitTrainingBriefingReadiness(states, "ready");
    assert.equal(readiness.status, "loading");
    assert.equal(p.beginPitTrainingBriefing(prepared.state, prepared.lesson, readiness), null);
  }
  assert.equal(p.getPitTrainingBriefingReadiness(["ready", "ready"], "loading").canBegin, false);
  for (const readiness of [
    p.getPitTrainingBriefingReadiness(["failed", "ready"], "ready"),
    p.getPitTrainingBriefingReadiness(["ready", "ready"], "failed"),
    p.getPitTrainingBriefingReadiness(["loading", "ready"], "loading", true),
  ]) {
    assert.equal(readiness.status, "degraded");
    assert.match(readiness.message, /indisponibles|délai/);
    assert(p.beginPitTrainingBriefing(prepared.state, prepared.lesson, readiness));
    assert.equal(prepared.lesson.status, "briefing", "availability never auto-starts a lesson");
  }
  assert.equal(p.PIT_TRAINING_BRIEFING_TIMEOUT_MS, 15_000);
});

test("explicit start is single-use and completes with real inputs/events, not elapsed briefing time", () => {
  const prepared = p.preparePitTrainingBriefing(session(), "guard-low");
  const started = p.beginPitTrainingBriefing(prepared.state, prepared.lesson, ready());
  assert(started);
  assert.equal(started.clock.paused, false);
  assert.equal(started.lesson.elapsedTicks, 0);
  assert.equal(p.beginPitTrainingBriefing(prepared.state, started.lesson, ready()), null);
  let state = prepared.state, lesson = started.lesson;
  const events = [];
  for (let tick = 0; tick < 800 && lesson.status === "running"; tick++) {
    const next = p.stepPitCombat(state, [{ guardLow: true }, p.resolvePitTrainingLessonInput(lesson, state)]);
    events.push(...next.events);
    lesson = p.evaluatePitTrainingLesson(lesson, state, next); state = next;
  }
  assert.equal(lesson.status, "success");
  assert.equal(events.filter(event => event.type === "block").length, 3);
  assert.equal(lesson.elapsedTicks, 343);
});

test("restart discards the old result and progression; stale or match-mode starts are rejected", () => {
  const prepared = p.preparePitTrainingBriefing(session(), "guard-low");
  const stale = p.stepPitCombat(prepared.state, [{}, {}]);
  assert.equal(p.beginPitTrainingBriefing(stale, prepared.lesson, ready()), null);
  assert.equal(p.beginPitTrainingBriefing(p.createPitCombatState(), prepared.lesson, ready()), null);
  assert.equal(p.beginPitTrainingBriefing(prepared.state, { ...prepared.lesson, progress: 1 }, ready()), null);
  const retry = p.preparePitTrainingBriefing(stale, "throw-tech");
  assert.equal(retry.lesson.id, "throw-tech");
  assert.equal(retry.lesson.status, "briefing");
  assert.equal(retry.lesson.progress, 0);
  assert.equal(retry.state.frame, 0);
  assert.equal(retry.state.pendingThrow, null);
  const incompatible = p.createPitCombatState("tracker", "jungle-hunter", { mode: "training" });
  assert.throws(() => p.preparePitTrainingBriefing(incompatible, "anti-air"), /indisponible/);
});

test("free training and manual pause preserve their previous timing outside a briefing", () => {
  for (const lesson of [null, { status: "running" }]) {
    assert.equal(p.advancePitTrainingSessionClock(p.createPitTrainingClock(), 1000 / 60, lesson).ticks, 1);
    const paused = p.requestPitTrainingTick(p.createPitTrainingClock(true));
    assert.equal(p.advancePitTrainingSessionClock(paused, 60000, lesson).ticks, 1);
  }
});

test("briefing gives the active remapped key for each required action", () => {
  const keys = { guardLow: "F1", heavy: "F2", right: "F3", left: "F4", throw: "F5", resource: "F6", light: "F7", medium: "F8" };
  assert.match(p.getPitTrainingBriefingControls("guard-low", keys), /F1.*LT.*GARDE ↓/);
  assert.match(p.getPitTrainingBriefingControls("anti-air", keys), /F2.*B.*L/);
  assert.match(p.getPitTrainingBriefingControls("corner-escape", keys), /F2.*F3/);
  assert.match(p.getPitTrainingBriefingControls("throw-tech", keys), /F5.*RT.*PROJ/);
  assert.match(p.getPitTrainingBriefingControls("traque", keys), /F6.*F4\/F3.*F7\/F8\/F2/);
});

test("UI uses resolved drawing status including atlas-only fighters, and cannot bypass the start gate with transport", async () => {
  const canvas = await readFile(new URL("../app/game/PitCanvas.tsx", import.meta.url), "utf8");
  assert.match(canvas, /const status = getPitCombatBitmapFighterArtStatus\(fighterArt, fighter/);
  assert.doesNotMatch(canvas, /fighterArt\.failedIds/);
  assert.match(canvas, /advancePitTrainingSessionClock\(trainingClockRef\.current, elapsed, trainingLessonRef\.current\)/);
  assert.match(canvas, /disabled=\{!canBeginTrainingLesson\}/);
  assert.match(canvas, /trainingBriefingRef\.current\?\.focus/);
  const begin = canvas.slice(canvas.indexOf("const beginPreparedTrainingLesson ="), canvas.indexOf("const beginRecording ="));
  assert.match(begin, /if \(!started\) return/);
  assert.match(begin, /resetLiveInputs\(\)/);
  assert.match(begin, /focusCombatRoot\(\)/);
  assert.match(begin, /pad\.buttons\.every/);
  assert.match(begin, /else if \(b && !previousB\) resetTraining\(\)/);
});
