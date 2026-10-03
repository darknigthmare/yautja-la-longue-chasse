import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { build } from "esbuild";
import { createHomeworldGamepadState, stepHomeworldGamepad, nextHomeworldDialogChoice } from "../app/game/systems/homeworldInput.ts";

const source = await readFile(new URL("../app/game/HomeworldHub.tsx", import.meta.url), "utf8");
const tree = ts.createSourceFile("HomeworldHub.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const bundle = await build({ stdin: { contents: "export * from './app/game/systems/homeworld.ts'; export * from './app/game/systems/homeworldWorldV77.ts'; export * from './app/game/systems/homeworldLocationV77.ts'; export * from './app/game/systems/homeworldInteriorsV64.ts'; export * from './app/game/hunterDreadsV63.ts'; export * from './app/game/systems/homeworldYouthMotionV74.ts';", resolveDir: process.cwd() }, bundle: true, write: false, format: "esm", platform: "node" });
const world = await import("data:text/javascript;base64," + Buffer.from(bundle.outputFiles[0].text).toString("base64"));

function walkableDistrictPosition(id) {
  const district = world.HOMEWORLD_DISTRICTS_V77.find(item => item.id === id);
  for (let y = district.y + 30; y < district.y + district.height - 30; y += 30)
    for (let x = district.x + 30; x < district.x + district.width - 30; x += 30)
      if (world.homeworldWalkableV77(district.levelId,{ x, y }) && world.districtAtHomeworldActorV77(district.levelId,{ x, y })?.id === id) return { x, y };
  throw new Error(`No usable fixture position in ${id}`);
}

function liveCallback(name, environment) {
  let implementation;
  function visit(node) {
    if (ts.isFunctionDeclaration(node) && node.name?.text === name) implementation = node;
    if (name === "soloEntry" && ts.isJsxOpeningElement(node) && node.attributes.properties.some(attribute => ts.isJsxAttribute(attribute) && attribute.name.getText(tree) === "data-solo-v66-enter")) {
      const click = node.attributes.properties.find(attribute => ts.isJsxAttribute(attribute) && attribute.name.getText(tree) === "onClick");
      implementation = click?.initializer?.expression;
    }
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
  // The V77 spaceport spawn is outside the visited Port district. These
  // recovery cases declare an actor already at an actual walkable Port entry.
  const initial = world.defaultHomeworldProgress(), attempts = [], messages = [], actor = {...world.createHomeworldWorldActorV77(),...walkableDistrictPosition('port')};
  const owner = "2026-09-20T12:00:00.000Z";
  const pad = { connected: false, id: "visit-recovery-qa", index: 0, axes: [0, 0], buttons: Array.from({ length: 16 }, () => ({ pressed: false })) };
  const env = {
    ...world, createHomeworldGamepadState, stepHomeworldGamepad, nextHomeworldDialogChoice,
    bindings: {}, held: { current: new Set() }, touch: { current: {} }, matchesControlAction: () => false,
    gamepadStateRef: { current: createHomeworldGamepadState() }, suspendedRef: { current: false },
    pausedRef: { current: false }, dialogStateRef: { current: null }, actorRef: { current: actor },
    levelRefV77: {current:'0'}, transitRefV77: {current:null}, skiffRefV77: {current:null}, cntlipMovementRefV77: {current:1},
    exteriorAnchorRef: {current:actor},
    setSkiffV77() {}, setTransitV77() {}, setElevationV77() {}, setLevelIdV77() {},
    interiorRef: { current: null },
    dreadMotionRef: { current: { angles: world.HUNTER_DREAD_STRANDS_V63.map(() => 0), velocities: world.HUNTER_DREAD_STRANDS_V63.map(() => 0) } },
    dreadAngles: world.HUNTER_DREAD_STRANDS_V63.map(() => 0),
    spatialCodexOpenRef: { current: false },
    wayfindingOpenRefV75: { current: false },
    setWayfindingOpenV75(value) { env.wayfindingOpenRefV75.current = value; }, setWayfindingRequestV75() {},
    cityClockV68: { current: 0 },
    youthMotionRefV74: { current: { direction: 's', distanceWorld: 0 } }, setYouthMotionV74() {},
    visitedAttempt: { current: null }, pendingVisitOwnerRef: { current: owner }, pendingVisitsRef: { current: new Set() }, pendingVisitCount: 0,
    saveRef: { current: { createdAt: owner, profile: { rankId: "young-blood" }, trophies: [] } }, progressRef: { current: initial },
    rootRef: { current: { contains: () => true } }, document: { hidden: false, hasFocus: () => true },
    navigator: { getGamepads: () => [pad] }, requestAnimationFrame(fn) { frame = fn; return 1; }, cancelAnimationFrame() {},
    setActor() {}, setPhase() {}, setPaused() {}, setInactive() {}, closeDialog() {}, interact() {},
    setDreadAngles(value) { env.dreadAngles = value; },
    clearInputs() { env.held.current.clear(); env.touch.current = {}; env.gamepadStateRef.current = createHomeworldGamepadState(); },
    setPendingVisitCount(value) { env.pendingVisitCount = value; }, setAnnouncement() {}, onNotify(message) { messages.push(message); },
    setDialog(update) { env.dialogStateRef.current = typeof update === "function" ? update(env.dialogStateRef.current) : update; },
    onYouthTraining: () => true,
    onSoloV66: () => true,
    persist: () => false,
    persistProgress(progress) { attempts.push(structuredClone(progress)); return env.persist(progress); },
  };
  env.save = { ...env.saveRef.current, homeworld: initial };
  env.viewportRef = { current: { focus() { env.document.activeElement = env.viewportRef.current; } } };
  env.dialogRef = { current: { focus() { env.document.activeElement = env.dialogRef.current; }, querySelectorAll: () => [] } };
  for (const name of ["pointInCurrentSpace", "onProgress", "recordLocationV77", "persistAction", "persistVisit", "retryPendingVisits", "enterYouthTraining", "soloEntry"]) env[name] = liveCallback(name, env);
  const effect = liveCallback("poll", env);
  const render = () => { cleanup?.(); cleanup = effect(); };
  const tick = (count = 1) => { for (let i = 0; i < count; i++) { time += 1000 / 60; frame(time); } };
  render();
  return { env, initial, attempts, messages, tick, render, pad };
}

test("a refused actual Port entry stays pending without a frame-write loop, then retries in place", () => {
  const f = fixture(), original = structuredClone(f.initial), actor = structuredClone(f.env.actorRef.current);
  assert.equal(world.districtAtHomeworldActorV77('0',actor).id, "port");
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
  f.env.actorRef.current = { ...f.env.actorRef.current, ...walkableDistrictPosition('market') };
  assert.equal(world.districtAtHomeworldActorV77('0',f.env.actorRef.current).id, "market");
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
  const expected = world.applyHomeworldAction(current, { type: "visit", districtId: "port" }, { rankId: "young-blood", ownedTrophyCount: 0 }).progress;
  // The live durable wrapper creates a new object in the isolated VM realm;
  // compare every serialized save field, not that realm's Object prototype.
  assert.deepEqual(structuredClone(f.env.progressRef.current), expected);
  assert.deepEqual(f.env.progressRef.current.relations, current.relations, "visits do not grant relationship rewards");
  assert.deepEqual(f.env.progressRef.current.expeditions, current.expeditions, "visits cannot complete an expedition");
  assert.deepEqual(f.env.progressRef.current.evidenceIds, ["suspect-trophy"]);
  assert.deepEqual(f.attempts.at(-1), expected);
});

test("a visit already durably acknowledged elsewhere clears pending state without another write", () => {
  const f = fixture(); f.tick();
  f.env.progressRef.current = world.applyHomeworldAction(f.env.progressRef.current, { type: "visit", districtId: "port" }, { rankId: "young-blood", ownedTrophyCount: 0 }).progress;
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
  f.env.actorRef.current = { ...f.env.actorRef.current, ...walkableDistrictPosition('market') }; f.tick();
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

function meetSoloMentor(f) {
  const room = world.homeworldInteriorForBuildingV64("training-hall");
  const point = room.points.find(point => point.pointId === "training-service");
  const candidates = Array.from({ length: 8 }, (_, i) => ({ x: point.x, y: point.y + 36 + i * 3 }));
  const position = candidates.find(p => world.isHomeworldInteriorWalkableV64(room, p) && world.nearestHomeworldInteriorTargetV64(room, p)?.pointId === point.pointId);
  assert(position, "fixture reaches a real walkable mentor interaction point");
  f.env.interiorRef.current = room;
  f.env.actorRef.current = { ...f.env.actorRef.current, ...position };
  f.env.dialogStateRef.current = { point: world.HOMEWORLD_POINTS.find(p => p.id === point.pointId) };
}

test("Solo physical departure retains refused visits, then retries and handles a refused chapter save", () => {
  const f = fixture(); f.tick(); meetSoloMentor(f);
  let entries = 0;
  f.env.onSoloV66 = () => { entries++; return false; };
  f.env.persist = () => true;
  f.env.soloEntry();
  assert.equal(entries, 0, "restored storage cannot bypass the pending visit queue");
  assert.equal(f.attempts.length, 1, "departure does not silently retry visit writes");
  assert.deepEqual([...f.env.pendingVisitsRef.current], ["port"]);
  assert.match(f.env.dialogStateRef.current.message, /visites de quartiers restent non enregistrées/i);
  f.env.retryPendingVisits();
  assert.deepEqual(f.env.progressRef.current.visitedDistrictIds, ["port"]);
  assert.equal(f.env.pendingVisitCount, 0);
  f.env.soloEntry();
  assert.equal(entries, 1); assert.match(f.env.dialogStateRef.current.message, /Départ non sauvegardé/);
  f.env.onSoloV66 = () => { entries++; return true; };
  f.env.soloEntry();
  assert.equal(entries, 2); assert.equal(f.attempts.length, 2);
  assert.deepEqual(f.env.progressRef.current.visitedDistrictIds, ["port"]);
});

test("Solo entry stays blocked while one of several refused visits remains pending", () => {
  const f = fixture(); f.tick();
  f.env.actorRef.current = { ...f.env.actorRef.current, ...walkableDistrictPosition("market") }; f.tick(); meetSoloMentor(f);
  let entries = 0, writes = 0;
  f.env.onSoloV66 = () => { entries++; return true; }; f.env.persist = () => ++writes === 1;
  f.env.retryPendingVisits(); f.env.soloEntry();
  assert.equal(entries, 0); assert.deepEqual([...f.env.pendingVisitsRef.current], ["market"]);
  f.env.persist = () => true; f.env.retryPendingVisits(); f.env.soloEntry();
  assert.equal(entries, 1); assert.deepEqual(f.env.progressRef.current.visitedDistrictIds, ["port", "market"]);
});

test("Solo departure keeps its physical, suspension and owner guards even after visit recovery", () => {
  const f = fixture(); meetSoloMentor(f); let entries = 0;
  f.env.onSoloV66 = () => { entries++; return true; };
  f.env.suspendedRef.current = true; f.env.soloEntry(); f.env.suspendedRef.current = false;
  f.env.pausedRef.current = true; f.env.soloEntry(); f.env.pausedRef.current = false;
  f.env.actorRef.current.x += 200; f.env.soloEntry(); meetSoloMentor(f);
  f.env.save = { ...f.env.save, createdAt: "2026-10-01T03:30:00.000Z" }; f.env.soloEntry();
  assert.equal(entries, 0);
  liveCallback("sync", f.env)(); f.env.soloEntry(); assert.equal(entries, 1);
});
