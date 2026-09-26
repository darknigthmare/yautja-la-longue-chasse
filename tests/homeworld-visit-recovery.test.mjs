import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { build } from "esbuild";
import { createHomeworldGamepadState, stepHomeworldGamepad, nextHomeworldDialogChoice } from "../app/game/systems/homeworldInput.ts";

const source = await readFile(new URL("../app/game/HomeworldHub.tsx", import.meta.url), "utf8");
const tree = ts.createSourceFile("HomeworldHub.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const bundle = await build({ entryPoints: ["app/game/systems/homeworld.ts"], bundle: true, write: false, format: "esm", platform: "node" });
const world = await import("data:text/javascript;base64," + Buffer.from(bundle.outputFiles[0].text).toString("base64"));

function liveCallback(name, environment) {
  let implementation;
  function visit(node) {
    if (name === "poll" && ts.isCallExpression(node) && node.expression.getText(tree) === "useEffect"
      && node.arguments[0]?.getText(tree).includes("stepHomeworldGamepad")) implementation = node.arguments[0];
    if (name === "sync" && ts.isCallExpression(node) && node.expression.getText(tree) === "useEffect"
      && node.arguments[0]?.getText(tree).includes("progressRef.current = save.homeworld")) implementation = node.arguments[0];
    if (ts.isVariableDeclaration(node) && node.name.getText(tree) === name) implementation = node.initializer.arguments[0];
    ts.forEachChild(node, visit);
  }
  visit(tree); assert.ok(implementation, `executes the live ${name} callback`);
  const compiled = ts.transpileModule(`const handler = ${implementation.getText(tree)};`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None },
  }).outputText;
  return runInNewContext(`(() => { ${compiled}; return handler; })()`, environment);
}

function fixture() {
  let frame, time = 0, cleanup;
  const initial = world.defaultHomeworldProgress(), attempts = [], messages = [], actor = world.createHomeworldActor();
  const owner = "2026-09-20T12:00:00.000Z";
  const pad = { connected: false, id: "visit-recovery-qa", index: 0, axes: [0, 0], buttons: Array.from({ length: 16 }, () => ({ pressed: false })) };
  const env = {
    ...world, createHomeworldGamepadState, stepHomeworldGamepad, nextHomeworldDialogChoice,
    bindings: {}, held: { current: new Set() }, touch: { current: {} }, matchesControlAction: () => false,
    gamepadStateRef: { current: createHomeworldGamepadState() }, suspendedRef: { current: false },
    pausedRef: { current: false }, dialogStateRef: { current: null }, actorRef: { current: actor },
    visitedAttempt: { current: null }, pendingVisitOwnerRef: { current: owner }, pendingVisitsRef: { current: new Set() }, pendingVisitCount: 0,
    saveRef: { current: { createdAt: owner, profile: { rankId: "youngblood" }, trophies: [] } }, progressRef: { current: initial },
    rootRef: { current: { contains: () => true } }, document: { hidden: false, hasFocus: () => true },
    navigator: { getGamepads: () => [pad] }, requestAnimationFrame(fn) { frame = fn; return 1; }, cancelAnimationFrame() {},
    setActor() {}, setPhase() {}, setPaused() {}, setInactive() {}, closeDialog() {}, interact() {},
    clearInputs() { env.held.current.clear(); env.touch.current = {}; env.gamepadStateRef.current = createHomeworldGamepadState(); },
    setPendingVisitCount(value) { env.pendingVisitCount = value; }, setAnnouncement() {}, onNotify(message) { messages.push(message); },
    setDialog(update) { env.dialogStateRef.current = typeof update === "function" ? update(env.dialogStateRef.current) : update; },
    onYouthTraining: () => true,
    persist: () => false,
    onProgress(progress) { attempts.push(structuredClone(progress)); return env.persist(progress); },
  };
  env.save = { ...env.saveRef.current, homeworld: initial };
  env.viewportRef = { current: { focus() { env.document.activeElement = env.viewportRef.current; } } };
  env.dialogRef = { current: { focus() { env.document.activeElement = env.dialogRef.current; }, querySelectorAll: () => [] } };
  for (const name of ["persistAction", "persistVisit", "retryPendingVisits", "enterYouthTraining"]) env[name] = liveCallback(name, env);
  const effect = liveCallback("poll", env);
  const render = () => { cleanup?.(); cleanup = effect(); };
  const tick = (count = 1) => { for (let i = 0; i < count; i++) { time += 1000 / 60; frame(time); } };
  render();
  return { env, initial, attempts, messages, tick, render, pad };
}

test("a refused actual Port entry stays pending without a frame-write loop, then retries in place", () => {
  const f = fixture(), original = structuredClone(f.initial), actor = structuredClone(f.env.actorRef.current);
  assert.equal(world.districtAtHomeworldActor(actor).id, "port");
  f.tick(); assert.equal(f.attempts.length, 1); assert.equal(f.env.pendingVisitCount, 1);
  assert.deepEqual(f.env.progressRef.current, original, "refusal cannot announce local discovery success");
  f.env.persist = () => true; f.render(); f.tick(180);
  assert.equal(f.attempts.length, 1, "restoring storage does not cause repeated background writes");
  f.env.retryPendingVisits();
  assert.equal(f.attempts.length, 2); assert.deepEqual(f.env.progressRef.current.visitedDistrictIds, ["port"]);
  assert.equal(f.env.pendingVisitCount, 0); assert.equal(f.env.pendingVisitsRef.current.size, 0);
  assert.deepEqual(f.env.actorRef.current, actor, "retry never moves or respawns the actor");
  assert.deepEqual(f.initial, original, "source progress remains immutable");
  f.env.retryPendingVisits(); f.tick(90); assert.equal(f.attempts.length, 2, "successful retry is idempotent");
  assert.equal(f.messages.filter(message => message === "Visites de quartiers enregistrées.").length, 1);
});

test("repeated refusal keeps the same visit available and writes at most once per explicit retry", () => {
  const f = fixture(); f.tick();
  for (let i = 0; i < 3; i++) { f.env.retryPendingVisits(); f.tick(60); }
  assert.equal(f.attempts.length, 4); assert.equal(f.env.pendingVisitCount, 1);
  assert.deepEqual([...f.env.pendingVisitsRef.current], ["port"]);
  assert.deepEqual(f.env.progressRef.current.visitedDistrictIds, []);
  assert(!f.messages.includes("Visites de quartiers enregistrées."));
});

test("several refused visited districts recover progressively; a second refusal does not erase the first ack", () => {
  const f = fixture(); f.tick();
  // A valid second actor-position fixture drives the same polling callback.
  f.env.actorRef.current = { ...f.env.actorRef.current, x: 1750, y: 2000 };
  assert.equal(world.districtAtHomeworldActor(f.env.actorRef.current).id, "market");
  f.tick(); assert.deepEqual([...f.env.pendingVisitsRef.current], ["port", "market"]);
  let writes = 0; f.env.persist = () => ++writes === 1;
  f.env.retryPendingVisits();
  assert.deepEqual(f.env.progressRef.current.visitedDistrictIds, ["port"]);
  assert.deepEqual([...f.env.pendingVisitsRef.current], ["market"]); assert.equal(f.env.pendingVisitCount, 1);
  assert(!f.messages.includes("Visites de quartiers enregistrées."));
  f.env.persist = () => true; f.env.retryPendingVisits();
  assert.deepEqual(f.env.progressRef.current.visitedDistrictIds, ["port", "market"]);
  assert.equal(f.env.pendingVisitCount, 0);
});

test("retry uses latest acknowledged evidence and relations, never a stale failed snapshot", () => {
  const f = fixture(); f.tick(); f.env.persist = () => true;
  assert.equal(f.env.persistAction({ type: "greet", npcId: "dock-officer" }, false).ok, true);
  assert.equal(f.env.persistAction({ type: "inspect", evidenceId: "suspect-trophy" }, false).ok, true);
  const current = structuredClone(f.env.progressRef.current);
  f.env.retryPendingVisits();
  const expected = world.applyHomeworldAction(current, { type: "visit", districtId: "port" }, { rankId: "youngblood", ownedTrophyCount: 0 }).progress;
  assert.deepEqual(f.env.progressRef.current, expected);
  assert.deepEqual(f.env.progressRef.current.relations, current.relations, "visits do not grant relationship rewards");
  assert.deepEqual(f.env.progressRef.current.expeditions, current.expeditions, "visits cannot complete an expedition");
  assert.deepEqual(f.env.progressRef.current.evidenceIds, ["suspect-trophy"]);
  assert.deepEqual(f.attempts.at(-1), expected);
});

test("a visit already durably acknowledged elsewhere clears pending state without another write", () => {
  const f = fixture(); f.tick();
  f.env.progressRef.current = world.applyHomeworldAction(f.env.progressRef.current, { type: "visit", districtId: "port" }, { rankId: "youngblood", ownedTrophyCount: 0 }).progress;
  f.env.retryPendingVisits(); assert.equal(f.attempts.length, 1); assert.equal(f.env.pendingVisitCount, 0);
  assert.deepEqual(f.env.progressRef.current.visitedDistrictIds, ["port"]);
});

test("the retry is inert behind a suspended city and resumes only on a new explicit action", () => {
  const f = fixture(); f.tick(); f.env.persist = () => true; f.env.suspendedRef.current = true;
  f.env.retryPendingVisits(); f.tick(20); assert.equal(f.attempts.length, 1); assert.equal(f.env.pendingVisitCount, 1);
  f.env.suspendedRef.current = false; f.tick(20); assert.equal(f.attempts.length, 1);
  f.env.retryPendingVisits(); assert.equal(f.attempts.length, 2); assert.equal(f.env.pendingVisitCount, 0);
});


test("owner replacement cannot replay pending visits before or after the live save-sync effect", () => {
  const f = fixture(); f.tick(); assert.equal(f.env.pendingVisitCount, 1);
  f.env.save = { ...f.env.save, createdAt: "2026-09-20T13:00:00.000Z", homeworld: world.defaultHomeworldProgress() };
  f.env.persist = () => true; f.env.retryPendingVisits();
  assert.equal(f.attempts.length, 1, "stale queue must be inert even before effects synchronize props");
  liveCallback("sync", f.env)();
  assert.equal(f.env.pendingVisitCount, 0); assert.equal(f.env.pendingVisitsRef.current.size, 0);
  assert.equal(f.env.pendingVisitOwnerRef.current, f.env.save.createdAt);
  assert.equal(f.env.visitedAttempt.current, null);
  f.env.retryPendingVisits(); assert.equal(f.attempts.length, 1);
  assert.deepEqual(f.env.progressRef.current.visitedDistrictIds, []);
});

test("successful inline retry restores world focus and dialog retry stays navigable without held-A spill", () => {
  const inline = fixture(); inline.tick(); inline.env.persist = () => true; inline.env.retryPendingVisits();
  assert.equal(inline.env.document.activeElement, inline.env.viewportRef.current);
  const f = fixture(); f.tick(); f.env.persist = () => true;
  f.env.dialogStateRef.current = { point: null }; f.pad.connected = true;
  const retry = { click() { f.env.retryPendingVisits(); }, focus() { f.env.document.activeElement = retry; } };
  let closed = 0;
  const back = { click() { closed++; }, focus() { f.env.document.activeElement = back; } };
  f.env.dialogRef.current.querySelectorAll = () => f.env.pendingVisitCount ? [retry, back] : [back];
  f.env.dialogRef.current.focus(); f.tick();
  f.pad.buttons[13].pressed = true; f.tick(); assert.equal(f.env.document.activeElement, retry);
  f.pad.buttons[13].pressed = false; f.tick(); f.pad.buttons[0].pressed = true; f.tick(5);
  assert.equal(f.env.pendingVisitCount, 0); assert.equal(f.attempts.length, 2);
  assert.equal(f.env.document.activeElement, f.env.dialogRef.current);
  assert.equal(closed, 0, "held A after recovery must not activate the next dialog action");
});

test("entering youth training keeps refused visits alive until an explicit successful retry", () => {
  const f = fixture(); f.tick();
  let entries = 0;
  f.env.onYouthTraining = () => { entries++; return true; };
  f.env.dialogStateRef.current = { point: { npcId: "terrace-instructor" } };
  f.env.persist = () => true;
  f.env.enterYouthTraining();
  assert.equal(entries, 0, "restored storage alone cannot bypass unacknowledged visits");
  assert.equal(f.attempts.length, 1, "entry does not retry writes without the retry action");
  assert.deepEqual([...f.env.pendingVisitsRef.current], ["port"]);
  assert.match(f.env.dialogStateRef.current.message, /visites de quartiers restent non enregistrées/i);
  assert.equal(f.messages.at(-1), f.env.dialogStateRef.current.message);
  f.env.retryPendingVisits();
  assert.equal(f.env.pendingVisitCount, 0);
  assert.deepEqual(f.env.progressRef.current.visitedDistrictIds, ["port"]);
  f.env.enterYouthTraining();
  assert.equal(entries, 1, "acknowledged visits allow the normal youth transition");
  assert.equal(f.attempts.length, 2);
});

test("a partially recovered visit queue still blocks departure for youth training", () => {
  const f = fixture(); f.tick();
  f.env.actorRef.current = { ...f.env.actorRef.current, x: 1750, y: 2000 }; f.tick();
  let writes = 0, entries = 0;
  f.env.persist = () => ++writes === 1;
  f.env.onYouthTraining = () => { entries++; return true; };
  f.env.dialogStateRef.current = { point: { npcId: "terrace-instructor" } };
  f.env.retryPendingVisits(); f.env.enterYouthTraining();
  assert.equal(entries, 0);
  assert.deepEqual(f.env.progressRef.current.visitedDistrictIds, ["port"]);
  assert.deepEqual([...f.env.pendingVisitsRef.current], ["market"]);
  f.env.persist = () => true; f.env.retryPendingVisits(); f.env.enterYouthTraining();
  assert.equal(entries, 1);
  assert.deepEqual(f.env.progressRef.current.visitedDistrictIds, ["port", "market"]);
});

test("youth entry ignores a suspended or stale-owner city even with no pending visits", () => {
  const f = fixture(); let entries = 0;
  f.env.onYouthTraining = () => { entries++; return true; };
  f.env.suspendedRef.current = true; f.env.enterYouthTraining();
  assert.equal(entries, 0);
  f.env.suspendedRef.current = false;
  f.env.save = { ...f.env.save, createdAt: "2026-09-26T09:00:00.000Z" };
  f.env.enterYouthTraining(); assert.equal(entries, 0, "new props cannot use the old owner queue before sync");
  liveCallback("sync", f.env)(); f.env.enterYouthTraining(); assert.equal(entries, 1);
  f.env.saveRef.current = { ...f.env.saveRef.current, createdAt: "2026-09-26T10:00:00.000Z" };
  f.env.enterYouthTraining(); assert.equal(entries, 1, "a ref owner mismatch also keeps the callback inert");
});

test("with no pending visits youth entry preserves the existing save-refusal feedback", () => {
  const f = fixture(); let entries = 0;
  f.env.onYouthTraining = () => { entries++; return false; };
  f.env.dialogStateRef.current = { point: { npcId: "terrace-instructor" } };
  f.env.enterYouthTraining();
  assert.equal(entries, 1);
  assert.match(f.env.dialogStateRef.current.message, /n’a pas pu être sauvegardée/);
  assert.equal(f.attempts.length, 0, "entry neither grants a visit nor fakes a storage acknowledgement");
});
