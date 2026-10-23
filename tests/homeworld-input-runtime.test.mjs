import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { build } from "esbuild";
import { createHomeworldGamepadState, stepHomeworldGamepad, nextHomeworldDialogChoice } from "../app/game/systems/homeworldInput.ts";
import { DEFAULT_CONTROL_BINDINGS, matchesControlAction } from "../app/game/systems/controlBindings.ts";
import {homeworldSceneSsrV78} from './helpers/homeworld-scene-ssr-v78.mjs';
import { animationFrameFixture } from "./helpers/animation-frame-fixture.mjs";
import {archiveComparisonRouteV107} from './helpers/archive-comparison-v107-route.mjs';

const source = await readFile(new URL("../app/game/HomeworldHub.tsx", import.meta.url), "utf8");
const tree = ts.createSourceFile("HomeworldHub.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const bundle = await build({ stdin: { contents: "export * from './app/game/systems/homeworldCity.ts'; export * from './app/game/systems/homeworldWorldV77.ts'; export {stepHomeworldCivicActorV80 as stepHomeworldWorldActorV77} from './app/game/systems/homeworldCivicWorldV80.ts'; export * from './app/game/systems/homeworldInteriorsV64.ts'; export * from './app/game/hunterDreadsV63.ts'; export * from './app/game/systems/homeworldYouthMotionV74.ts'; export * from './app/game/systems/homeworldLiftStationV83.ts'; export * from './app/game/systems/homeworldCartographyLedgerV104.ts'; export * from './app/game/systems/homeworldCartographyV104.ts'; export * from './app/game/systems/homeworldCartographyLedgerV105.ts'; export * from './app/game/systems/homeworldCartographyV105.ts'; export * from './app/game/systems/homeworldArchiveLedgerV106.ts'; export * from './app/game/systems/homeworldArchiveV106.ts'; export * from './app/game/systems/homeworldArchiveDefinitionV106.ts'; export * from './app/game/systems/homeworldArchiveComparisonLedgerV107.ts'; export * from './app/game/systems/homeworldArchiveComparisonV107.ts'; export * from './app/game/systems/homeworldArchiveComparisonDefinitionV107.ts';", resolveDir: process.cwd() }, bundle: true, write: false, format: "esm", platform: "node" });
const city = await import("data:text/javascript;base64," + Buffer.from(bundle.outputFiles[0].text).toString("base64"));

function liveLiftOrPollingCallback(environment, name = 'poll') {
  let implementation;
  const visit = node => {
    if ((name === 'poll' || name === 'liftHydration') && ts.isCallExpression(node) && node.expression.getText(tree) === "useEffect"
      && node.arguments[0]?.getText(tree).includes(name === 'poll' ? "stepHomeworldGamepad" : "restoreHomeworldLiftStationV83")) implementation = node.arguments[0];
    else if (['updateLiftStationV83', 'cartographyContextV104', 'sampleCartographyV104', 'interruptCartographyV104', 'cartographyContextV105', 'sampleCartographyV105', 'interruptCartographyV105', 'recordCartographyTransitV105','archiveContextV106','sampleArchiveV106','interruptArchiveV106','comparisonContextV107','sampleComparisonV107','interruptComparisonV107'].includes(name)
      && ts.isVariableDeclaration(node) && node.name.getText(tree) === name) implementation = node.initializer.arguments[0];
    else ts.forEachChild(node, visit);
  };
  visit(tree);
  assert.ok(implementation, "test executes the live Homeworld " + name + " callback");
  const compiled = ts.transpileModule(`const handler = ${implementation.getText(tree)};`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None },
  }).outputText;
  return runInNewContext(`(() => { ${compiled}; return handler; })()`, environment);
}

function liveSprintHandler(kind, environment) {
  let implementation;
  const visit = node => {
    if (kind === 'keyboard' && ts.isVariableDeclaration(node) && node.name.getText(tree) === 'onWorldKey') implementation = node.initializer;
    if (kind === 'touch' && ts.isJsxOpeningElement(node)
      && node.attributes.properties.some(prop => ts.isJsxAttribute(prop) && prop.name.getText(tree) === 'data-homeworld-run-toggle-v81')) {
      const click = node.attributes.properties.find(prop => ts.isJsxAttribute(prop) && prop.name.getText(tree) === 'onClick');
      implementation = click?.initializer?.expression;
    }
    ts.forEachChild(node, visit);
  };
  visit(tree); assert(implementation, 'test executes the live ' + kind + ' sprint handler');
  const compiled = ts.transpileModule(`const handler = ${implementation.getText(tree)};`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None },
  }).outputText;
  return runInNewContext(`(() => { ${compiled}; return handler; })()`, environment);
}

function fixture() {
  const frames = animationFrameFixture(), events = [], cartographySamples = [], cartographySamplesV105 = [];
  const owner = "2026-10-07T12:00:00.000Z";
  const pad = { connected: true, id: "virtual-qa", index: 0, axes: [0, 0], buttons: Array.from({ length: 16 }, () => ({ pressed: false })) };
  const world = {}, outside = {}, dialog = {};
  const choices = Array.from({ length: 3 }, (_, index) => ({
    focus() { env.document.activeElement = choices[index]; events.push(["focus", index]); },
    click() { events.push(["choose", index]); },
  }));
  let cleanup, paused = false, inactive = false;
  const env = {
    ...city,
    createHomeworldGamepadState, stepHomeworldGamepad, nextHomeworldDialogChoice,
    matchesControlAction: () => false, bindings: {}, held: { current: new Set() },
    touch: { current: { left: false, right: false, up: false, down: false, jump: false, sprint: false } },
    gamepadStateRef: { current: createHomeworldGamepadState() },
    suspendedRef: { current: false }, pausedRef: { current: false }, dialogStateRef: { current: null },
    spatialCodexOpenRef: { current: false },
    wayfindingOpenRefV75: { current: false },
    comparisonWritePausedRefV107:{current:false},
    comparisonDraftRefV107:{current:city.defaultHomeworldArchiveComparisonV107(owner)},
    submitComparisonV107(){throw new Error('No active V107 comparison in these declared input cases');},
    archiveWritePausedRefV106: {current:false},
    archiveDraftRefV106: {current:city.defaultHomeworldArchiveV106(owner)},
    submitArchiveV106(){throw new Error('No active V106 archive receipt in these declared world input cases');},
    cartographyWritePausedRefV104: { current: false },
    cartographyWritePausedRefV105: { current: false },
    cartographyDraftRefV105: { current: city.defaultHomeworldCartographyV105(owner) },
    cartographyDraftRefV104: { current: city.defaultHomeworldCartographyV104(owner) },
    progressRef: { current: { visitedDistrictIds: [] } },
    sampleCartographyWalkV104(ledger, before, after, seconds, context) {
      cartographySamples.push({ before: { ...before }, after: { ...after }, seconds });
      return city.sampleCartographyWalkV104(ledger, before, after, seconds, context);
    },
    sampleCartographyWalkV105(ledger, before, after, seconds, context) {
      cartographySamplesV105.push({ before: { ...before }, after: { ...after }, seconds });
      return city.sampleCartographyWalkV105(ledger, before, after, seconds, context);
    },
    submitCartographyV105() { throw new Error('No active V105 receipt in these declared world input cases'); },
    setCartographyMessageV105() { throw new Error('A dormant V105 receipt cannot award a checkpoint'); },
    cartographyWriteRefusedV105() { throw new Error('A dormant V105 receipt cannot attempt a durable write'); },
    submitCartographyV104() { throw new Error('No active cartography receipt in these declared world input cases'); },
    onProgress() { throw new Error('A dormant cartography receipt cannot write campaign progress'); },
    setCartographyMessageV104() { throw new Error('A dormant cartography receipt cannot award a checkpoint'); },
    cartographyWriteRefusedV104() { throw new Error('A dormant cartography receipt cannot attempt a durable write'); },
    cityClockV68: { current: 0 },
    HOMEWORLD_ACTOR: city.HOMEWORLD_ACTOR, homeworldYouthDirectionV74: city.homeworldYouthDirectionV74,
    youthMotionRefV74: { current: { direction: 's', distanceWorld: 0 } }, setYouthMotionV74() {},
    actorRef: { current: city.createHomeworldWorldActorV77() }, visitedAttempt: { current: null },
    levelRefV77: {current:'0'}, transitRefV77: {current:null}, skiffRefV77: {current:null}, cntlipMovementRefV77: {current:1},
    save: { createdAt: owner }, saveRef: { current: { createdAt: owner } },
    liftRefV83: { current: city.createHomeworldLiftStationV83(owner) }, liftSessionReadyRefV83: { current: false }, liftSessionOwnerV83: null,
    setLiftStateV83(value) { env.liftStateV83 = value; }, setLiftSessionOwnerV83(value) { env.liftSessionOwnerV83 = value; },
    exteriorAnchorRef: {current:city.createHomeworldWorldActorV77()},
    setSkiffV77() {}, setTransitV77() {}, setElevationV77() {}, setLevelIdV77() {}, setAnnouncement() {},
    recordLocationV77() { throw new Error('No completed connector or skiff in these declared world input cases'); },
    interiorRef: { current: null }, stepHomeworldActorOnFloor: city.stepHomeworldActorOnFloor,
    dreadMotionRef: { current: { angles: city.HUNTER_DREAD_STRANDS_V63.map(() => 0), velocities: city.HUNTER_DREAD_STRANDS_V63.map(() => 0) } },
    stepHunterDreadsV63: city.stepHunterDreadsV63,
    dreadAngles: city.HUNTER_DREAD_STRANDS_V63.map(() => 0),
    rootRef: { current: { contains: element => [world, dialog, ...choices].includes(element) } },
    dialogRef: { current: { querySelectorAll: () => choices } },
    document: { hidden: false, activeElement: world, hasFocus: () => env.windowFocused }, windowFocused: true,
    navigator: { getGamepads: () => [pad] },
    requestAnimationFrame: frames.requestAnimationFrame, cancelAnimationFrame: frames.cancelAnimationFrame,
    stepHomeworldActor: city.stepHomeworldActor, districtAtHomeworldActor: city.districtAtHomeworldPosition,
    persistVisit() {}, setActor() {}, setPhase() {}, setArchiveViewV106() {}, setComparisonViewV107() {},
    setDreadAngles(value) { env.dreadAngles = value; },
    setInactive(value) { inactive = value; env.pausedRef.current = paused || inactive || env.spatialCodexOpenRef.current || env.wayfindingOpenRefV75.current; },
    setPaused(value) { paused = typeof value === "function" ? value(paused) : value; env.pausedRef.current = paused || inactive || env.spatialCodexOpenRef.current || env.wayfindingOpenRefV75.current; events.push(["paused", paused]); },
    clearInputs() { env.held.current.clear(); for (const key of Object.keys(env.touch.current)) env.touch.current[key] = false; env.gamepadStateRef.current = createHomeworldGamepadState(); },
    interact() { events.push(["interact"]); env.clearInputs(); env.dialogStateRef.current = { point: "nearby" }; env.document.activeElement = dialog; },
    closeDialog() { events.push(["close"]); env.clearInputs(); env.dialogStateRef.current = null; env.document.activeElement = world; },
  };
  env.updateLiftStationV83 = liveLiftOrPollingCallback(env, 'updateLiftStationV83');
  for (const name of ['comparisonContextV107','sampleComparisonV107','interruptComparisonV107','archiveContextV106','sampleArchiveV106','interruptArchiveV106','cartographyContextV104', 'interruptCartographyV104', 'sampleCartographyV104', 'cartographyContextV105', 'interruptCartographyV105', 'sampleCartographyV105', 'recordCartographyTransitV105']) env[name] = liveLiftOrPollingCallback(env, name);
  liveLiftOrPollingCallback(env, 'liftHydration')();
  const effect = liveLiftOrPollingCallback(env);
  const render = () => { cleanup?.(); cleanup = effect(); };
  const tick = (count = 1) => { assert.ok(frames.size, 'an active browser frame exists'); frames.tick(count); };
  const release = () => { pad.axes = [0, 0]; for (const button of pad.buttons) button.pressed = false; tick(); };
  render();
  return { env, pad, tick, release, render, events, world, outside, dialog, choices, cartographySamples, cartographySamplesV105 };
}

test('the live V104 cartography hook samples resolved movement while dormant, and a refused write freezes the city clock', () => {
  const f = fixture(), ledger = f.env.cartographyDraftRefV104.current;
  f.release(); f.pad.axes[0] = 1; f.tick(3);
  assert(f.cartographySamples.some(({ before, after }) => after.x > before.x), 'the live callback receives real integrated travel');
  assert.equal(f.env.cartographyDraftRefV104.current, ledger, 'the real dormant sampler preserves the ledger without awarding progress');
  assert.equal(ledger.receipt, null);
  const before = { ...f.env.actorRef.current }, clock = f.env.cityClockV68.current, samples = f.cartographySamples.length;
  f.env.cartographyWritePausedRefV104.current = true; f.tick(12);
  assert.deepEqual(f.env.actorRef.current, before, 'held direction cannot advance an actor after a refused cartography write');
  assert.equal(f.env.cityClockV68.current, clock);
  assert.equal(f.cartographySamples.length, samples, 'the blocked motor cannot sample movement');
  f.env.cartographyWritePausedRefV104.current = false; f.tick(3);
  assert(f.env.actorRef.current.x > before.x, 'successful write recovery restores the existing motor');
});

test('the live V105 cartography hook stays dormant and its refused write freezes the physical city', () => {
  const f = fixture(), ledger = f.env.cartographyDraftRefV105.current;
  f.release(); f.pad.axes[0] = 1; f.tick(3);
  assert(f.cartographySamplesV105.some(({ before, after }) => after.x > before.x));
  assert.equal(f.env.cartographyDraftRefV105.current, ledger);
  assert.equal(ledger.receipt, null);
  const before = { ...f.env.actorRef.current }, clock = f.env.cityClockV68.current, samples = f.cartographySamplesV105.length;
  f.env.cartographyWritePausedRefV105.current = true; f.tick(12);
  assert.deepEqual(f.env.actorRef.current, before);
  assert.equal(f.env.cityClockV68.current, clock);
  assert.equal(f.cartographySamplesV105.length, samples);
  f.env.cartographyWritePausedRefV105.current = false; f.tick(3);
  assert(f.env.actorRef.current.x > before.x);
});

test("held stick and A on first focus cannot move or open a dialogue until a neutral frame", () => {
  const f = fixture(), start = { ...f.env.actorRef.current };
  f.pad.axes[0] = 1; f.pad.buttons[0].pressed = true; f.tick(4);
  assert.equal(f.env.actorRef.current.x, start.x);
  assert.deepEqual(f.events, []);
  f.release(); f.pad.axes[0] = 1; f.tick(3);
  assert.ok(f.env.actorRef.current.x > start.x);
  f.release(); f.pad.buttons[0].pressed = true; f.tick(4);
  assert.deepEqual(f.events, [["interact"]], "holding A cannot also choose the first dialog action");
});

test("V54 spatial atlas owns controller input exclusively and closing requires a neutral world frame", () => {
  const f = fixture(); f.release();
  f.env.spatialCodexOpenRef.current = true; f.env.pausedRef.current = true; f.env.clearInputs();
  const before = { ...f.env.actorRef.current };
  f.pad.axes[0] = 1; f.pad.buttons[0].pressed = true; f.pad.buttons[9].pressed = true;
  f.tick(10);
  assert.deepEqual(f.env.actorRef.current, before);
  assert.deepEqual(f.events, [], "city must not consume atlas confirm/start or toggle its underlying pause");
  f.env.spatialCodexOpenRef.current = false; f.env.pausedRef.current = false; f.env.clearInputs();
  f.tick(4);
  assert.deepEqual(f.env.actorRef.current, before);
  assert.deepEqual(f.events, [], "held atlas buttons cannot leak into city interactions");
  f.release(); f.pad.axes[0] = 1; f.tick(3);
  assert(f.env.actorRef.current.x > before.x);
});

test("V75 destination finder consumes no city controller action and requires release after closing", () => {
  const f = fixture(); f.release();
  f.env.wayfindingOpenRefV75.current = true; f.env.pausedRef.current = true; f.env.clearInputs();
  const before = { ...f.env.actorRef.current }, clock = f.env.cityClockV68.current;
  f.pad.axes[0] = 1; f.pad.buttons[0].pressed = true; f.pad.buttons[9].pressed = true;
  f.tick(20);
  assert.deepEqual(f.env.actorRef.current, before);
  assert.equal(f.env.cityClockV68.current, clock);
  assert.deepEqual(f.events, [], "finder confirmation must not also interact with or pause the city");
  f.env.wayfindingOpenRefV75.current = false; f.env.pausedRef.current = false; f.env.clearInputs();
  f.tick(4);
  assert.deepEqual(f.env.actorRef.current, before);
  assert.deepEqual(f.events, [], "held menu controls must remain neutralized on return");
  f.release(); f.pad.axes[0] = 1; f.tick(3);
  assert(f.env.actorRef.current.x > before.x);
});

for (const transition of ["focus", "window", "hidden", "service"]) test(`Homeworld ${transition} return requires release, without losing position`, () => {
  const f = fixture(); f.tick(); f.pad.axes[0] = 1; f.tick(3);
  const before = f.env.actorRef.current.x;
  if (transition === "focus") f.env.document.activeElement = f.outside;
  if (transition === "window") f.env.windowFocused = false;
  if (transition === "hidden") f.env.document.hidden = true;
  if (transition === "service") { f.env.suspendedRef.current = true; f.env.document.activeElement = f.outside; }
  f.pad.buttons[0].pressed = true; f.tick(3);
  assert.equal(f.env.actorRef.current.x, before);
  f.env.document.activeElement = f.world; f.env.windowFocused = true; f.env.document.hidden = false; f.env.suspendedRef.current = false;
  f.tick(3);
  assert.equal(f.env.actorRef.current.x, before);
  assert.deepEqual(f.events, []);
  f.release(); f.pad.axes[0] = 1; f.tick(3);
  assert.ok(f.env.actorRef.current.x > before);
});

test("Start pauses and resumes intentionally but held Start/stick never repeats across the transition", () => {
  const f = fixture(); f.tick(); f.pad.buttons[9].pressed = true; f.tick(4);
  assert.equal(f.env.pausedRef.current, true);
  assert.deepEqual(f.events, [["paused", true]]);
  const before = f.env.actorRef.current.x;
  f.release(); f.pad.buttons[9].pressed = true; f.tick(2);
  assert.equal(f.env.pausedRef.current, false);
  f.pad.axes[0] = 1; f.tick(3);
  assert.equal(f.env.actorRef.current.x, before);
  assert.deepEqual(f.events, [["paused", true], ["paused", false]]);
  f.release(); f.pad.axes[0] = 1; f.tick(3);
  assert.ok(f.env.actorRef.current.x > before);
});

test("dialog up starts at the last enabled choice, wraps and never repeats on render", () => {
  const f = fixture(); f.env.dialogStateRef.current = { point: "service" }; f.env.document.activeElement = f.dialog; f.tick();
  f.pad.buttons[12].pressed = true; f.tick();
  assert.equal(f.env.document.activeElement, f.choices[2]);
  f.render(); f.tick(3); assert.deepEqual(f.events, [["focus", 2]]);
  f.release(); f.pad.buttons[13].pressed = true; f.tick();
  assert.equal(f.env.document.activeElement, f.choices[0]);
  f.release(); f.pad.buttons[0].pressed = true; f.tick(4);
  assert.deepEqual(f.events, [["focus", 2], ["focus", 0], ["choose", 0]]);
  assert.equal(nextHomeworldDialogChoice(-1, 0, -1), -1);
});

test("navigation dialog remains controller-accessible above an already paused city", () => {
  const f = fixture(); f.env.pausedRef.current = true;
  f.env.dialogStateRef.current = { point: null, navigation: true }; f.env.document.activeElement = f.dialog;
  const before = { ...f.env.actorRef.current }; f.tick();
  f.pad.buttons[13].pressed = true; f.tick();
  assert.equal(f.env.document.activeElement, f.choices[0]);
  f.release(); f.pad.buttons[0].pressed = true; f.tick(2);
  assert.deepEqual(f.events, [["focus", 0], ["choose", 0]]);
  assert.deepEqual(f.env.actorRef.current, before, "menu input cannot advance the paused actor");
});

test("the live city clock freezes strand position and velocity in pause, then settles after release", () => {
  const f = fixture(); f.release(); f.pad.axes[0] = 1; f.tick(30);
  assert(f.env.dreadAngles.some(angle => angle > .01), "real movement drives the actual spring function");
  assert(f.env.cityClockV68.current > 0, "the shared resident and strand clock advances from actual simulation frames");
  f.pad.buttons[9].pressed = true; f.tick(2);
  assert.equal(f.env.pausedRef.current, true);
  const paused = structuredClone(f.env.dreadMotionRef.current), drawn = [...f.env.dreadAngles], cityTime = f.env.cityClockV68.current;
  f.tick(60);
  assert.equal(f.env.cityClockV68.current, cityTime, "paused citizen routines cannot drift while the actor and strands are frozen");
  assert.deepEqual(f.env.dreadMotionRef.current, paused, "pause preserves spring velocities as well as angles");
  assert.deepEqual(f.env.dreadAngles, drawn, "no paused frame changes rendered strands");
  f.release(); f.pad.buttons[9].pressed = true; f.tick(2);
  assert.equal(f.env.pausedRef.current, false);
  f.release(); f.tick(240);
  assert(f.env.dreadAngles.every(angle => Math.abs(angle) < .001), "released motion decays to the scalp's rest orientation");
  assert(f.env.dreadMotionRef.current.velocities.every(velocity => Math.abs(velocity) < .001));
});

test("closing a dialogue by B cannot start walking on its still-held stick", () => {
  const f = fixture(); f.env.dialogStateRef.current = { point: "service" }; f.env.document.activeElement = f.dialog; f.tick();
  const before = f.env.actorRef.current.x;
  f.pad.buttons[1].pressed = true; f.pad.axes[0] = 1; f.tick(4);
  assert.deepEqual(f.events, [["close"]]); assert.equal(f.env.actorRef.current.x, before);
  f.release(); f.pad.axes[0] = 1; f.tick(3); assert.ok(f.env.actorRef.current.x > before);
});

test("controller replacement and reconnect require neutral; harmless dead-zone drift remains neutral", () => {
  const f = fixture(); f.pad.axes = [.1, -.1]; f.tick();
  assert.equal(f.env.gamepadStateRef.current.ready, true);
  const before = f.env.actorRef.current.x;
  f.pad.id = "replacement"; f.pad.axes[0] = 1; f.tick(3); assert.equal(f.env.actorRef.current.x, before);
  f.release(); f.pad.axes[0] = 1; f.tick(3); assert.ok(f.env.actorRef.current.x > before);
  const connectedPosition = f.env.actorRef.current.x;
  f.pad.connected = false; f.tick(); f.pad.connected = true; f.tick(3);
  assert.equal(f.env.actorRef.current.x, connectedPosition);
});

test("Start resumes after window inactivity in one intentional press, without toggling into another pause", () => {
  const f = fixture(); f.tick(); f.env.setInactive(true); f.tick();
  assert.equal(f.env.pausedRef.current, true);
  f.pad.buttons[9].pressed = true; f.tick(3);
  assert.equal(f.env.pausedRef.current, false);
  assert.deepEqual(f.events, [["paused", false]]);
});

test("real Council transit selects native walking from resolved XY without changing motor velocity; pause freezes its gait", () => {
  const f = fixture(); f.release();
  const connector = city.HOMEWORLD_CONNECTORS_V77.find(item => item.id === 'council-stair');
  f.env.actorRef.current = { ...city.createHomeworldWorldActorV77(), ...connector.from.point };
  f.env.transitRefV77.current = city.beginHomeworldTransitV77('0', f.env.actorRef.current);
  assert(f.env.transitRefV77.current);
  const poses = new Set();
  for (let frame = 0; frame < 180; frame++) {
    const before = { ...f.env.actorRef.current }; f.tick();
    const actual = f.env.actorRef.current, motion = f.env.youthMotionRefV74.current;
    assert.equal(actual.vx, 0); assert.equal(actual.vy, 0);
    assert(Math.abs(actual.x - connector.from.point.x) < 1e-7);
    assert(Math.abs(actual.y - (connector.from.point.y + (connector.to.point.y - connector.from.point.y) * f.env.transitRefV77.current.elapsed / connector.duration)) < 1e-7);
    assert(Math.abs(motion.velocity.y - (actual.y - before.y) * 60) < 1e-7, 'the native visual speed is measured from this real RAF step');
    const native = city.homeworldYouthFrameV74({seconds:f.env.cityClockV68.current,moving:true,velocity:motion.velocity,lastDirection:motion.direction,distanceWorld:motion.distanceWorld});
    assert.equal(native.clipId, 'walk'); assert.equal(native.direction, 'n'); poses.add(native.frame.id);
  }
  assert(poses.size >= 3, 'real travel selects several original drawings, not an idle plate or invented limb animation');
  const beforePause = structuredClone({actor:f.env.actorRef.current,transit:f.env.transitRefV77.current,motion:f.env.youthMotionRefV74.current,clock:f.env.cityClockV68.current});
  f.env.pausedRef.current = true; f.tick(120);
  assert.deepEqual(structuredClone({actor:f.env.actorRef.current,transit:f.env.transitRefV77.current,motion:f.env.youthMotionRefV74.current,clock:f.env.cityClockV68.current}), beforePause);
});

test("stationary lift and moving skiff retain native idle; vehicle translation cannot activate walking", () => {
  for (const kind of ['lift', 'skiff']) {
    const f = fixture(); f.release();
    const connector = city.HOMEWORLD_CONNECTORS_V77.find(item => item.id === 'clan-lift');
    f.env.actorRef.current = { ...city.createHomeworldWorldActorV77(), ...(kind === 'lift' ? connector.from.point : {x:460,y:3600}) };
    const start = { ...f.env.actorRef.current };
    if (kind === 'lift') f.env.transitRefV77.current = city.beginHomeworldTransitV77('0', start);
    else f.env.skiffRefV77.current = city.beginHomeworldSkiffV77('0', start, true);
    assert(kind === 'lift' ? f.env.transitRefV77.current : f.env.skiffRefV77.current);
    f.tick(120);
    const actual = f.env.actorRef.current, motion = f.env.youthMotionRefV74.current;
    assert.equal(motion.velocity.x, 0); assert.equal(motion.velocity.y, 0);
    assert.equal(actual.vx, 0); assert.equal(actual.vy, 0);
    assert.equal(city.homeworldYouthFrameV74({seconds:f.env.cityClockV68.current,moving:Math.hypot(motion.velocity.x,motion.velocity.y)>5,velocity:motion.velocity,distanceWorld:motion.distanceWorld}).clipId, 'idle');
    if (kind === 'lift') { assert.equal(actual.x, start.x); assert.equal(actual.y, start.y); }
    else assert(Math.hypot(actual.x-start.x,actual.y-start.y)>5, 'the real skiff moved while its passenger stayed in the native idle pose');
  }
});

test("the mounted RAF makes L3 1.8 times faster and advances native gait by resolved travel", () => {
  const walk = fixture(), run = fixture(); walk.release(); run.release();
  const startWalk = { ...walk.env.actorRef.current }, startRun = { ...run.env.actorRef.current };
  walk.pad.axes[0] = 1; run.pad.axes[0] = 1; run.pad.buttons[10].pressed = true;
  walk.tick(8); run.tick(8);
  const walked = walk.env.actorRef.current.x - startWalk.x, ran = run.env.actorRef.current.x - startRun.x;
  assert(walked > 0);
  assert(Math.abs(ran / walked - 1.8) < 1e-8, 'the live city motor consumes L3, not only a controller model');
  assert(Math.abs(run.env.youthMotionRefV74.current.distanceWorld - ran) < 1e-8);
  assert.equal(run.env.youthMotionRefV74.current.velocity.x, run.env.actorRef.current.vx);
  run.pad.buttons[10].pressed = false; run.tick();
  assert(Math.abs(run.env.actorRef.current.vx - city.HOMEWORLD_ACTOR.walkSpeed) < 1e-8, 'release immediately restores walking');
});

test("keyboard sprint uses the configured hold action, and touch sprint shares the same motor", () => {
  for (const device of ['keyboard', 'touch']) {
    const f = fixture(); f.release();
    const start = { ...f.env.actorRef.current };
    if (device === 'keyboard') {
      f.env.matchesControlAction = (action, code) => action === 'hunt.aim' && code === 'KeyT' || action === 'hunt.moveRight' && code === 'KeyD';
      f.env.held.current.add('KeyT'); f.env.held.current.add('KeyD');
    } else { f.env.touch.current.sprint = true; f.env.touch.current.right = true; }
    f.tick(5);
    assert(Math.abs(f.env.actorRef.current.vx - city.HOMEWORLD_ACTOR.walkSpeed * 1.8) < 1e-8, device);
    assert(f.env.actorRef.current.x > start.x);
    f.env.clearInputs(); f.tick(2);
    assert.equal(f.env.actorRef.current.vx, 0, device + ' stops after blur/modal input clearing');
  }
});

test("held L3 alone cannot arm sprint across pause, dialog or focus ownership changes", () => {
  for (const target of ['pause', 'dialog', 'focus']) {
    const f = fixture(); f.release(); f.pad.axes[0] = 1; f.pad.buttons[10].pressed = true; f.tick(3);
    f.env.clearInputs();
    if (target === 'pause') f.env.pausedRef.current = true;
    if (target === 'dialog') { f.env.dialogStateRef.current = {}; f.env.document.activeElement = f.dialog; }
    if (target === 'focus') f.env.document.activeElement = f.outside;
    const position = { x: f.env.actorRef.current.x, y: f.env.actorRef.current.y };
    f.tick(20);
    assert.deepEqual({ x: f.env.actorRef.current.x, y: f.env.actorRef.current.y }, position);
    f.env.pausedRef.current = false; f.env.dialogStateRef.current = null; f.env.document.activeElement = f.world;
    f.env.clearInputs(); f.tick(5);
    assert.deepEqual({ x: f.env.actorRef.current.x, y: f.env.actorRef.current.y }, position, target + ' requires neutral after the context change');
    f.release(); f.pad.axes[0] = 1; f.pad.buttons[10].pressed = true; f.tick(3);
    assert(Math.abs(f.env.actorRef.current.vx - city.HOMEWORLD_ACTOR.walkSpeed * 1.8) < 1e-8, target + ' deliberately resumes running');
  }
});

test('the actual viewport key handler accepts remapped sprint and rejects the old key, blocked input and browser shortcuts', () => {
  const f = fixture(); f.release();
  f.env.matchesControlAction = matchesControlAction;
  f.env.bindings = { ...DEFAULT_CONTROL_BINDINGS, 'hunt.aim': ['KeyT'] };
  f.env.blocked = false; f.env.viewportRef = { current: f.world };
  const handler = liveSprintHandler('keyboard', f.env);
  const send = (code, extra = {}) => {
    const event = { target: f.world, nativeEvent: { code }, code, altKey: false, ctrlKey: false, metaKey: false,
      preventDefault() {}, stopPropagation() {}, ...extra };
    handler(event);
  };
  send('ShiftLeft'); assert.equal(f.env.held.current.has('ShiftLeft'), false);
  send('KeyT', { ctrlKey: true }); assert.equal(f.env.held.current.has('KeyT'), false);
  f.env.blocked = true; send('KeyT'); assert.equal(f.env.held.current.has('KeyT'), false);
  f.env.blocked = false; send('KeyT'); send('KeyD'); f.tick(3);
  assert(Math.abs(f.env.actorRef.current.vx - city.HOMEWORLD_ACTOR.walkSpeed * 1.8) < 1e-8);
});

test('the actual tactile Course button toggles the input without movement, announces state, and respects modal blocking', () => {
  const f = fixture(); f.release(); f.env.blocked = false;
  let pressed = false; f.env.setTouchRunningV81 = value => { pressed = value; };
  const click = liveSprintHandler('touch', f.env);
  const start = { ...f.env.actorRef.current };
  click(); assert.equal(pressed, true); assert.equal(f.env.touch.current.sprint, true);
  f.tick(3); assert.equal(f.env.actorRef.current.x, start.x, 'Course without a direction is stationary');
  f.env.touch.current.right = true; f.tick(3);
  assert(Math.abs(f.env.actorRef.current.vx - city.HOMEWORLD_ACTOR.walkSpeed * 1.8) < 1e-8);
  click(); assert.equal(pressed, false); f.tick();
  assert(Math.abs(f.env.actorRef.current.vx - city.HOMEWORLD_ACTOR.walkSpeed) < 1e-8);
  f.env.blocked = true; click(); assert.equal(f.env.touch.current.sprint, false);
});

for (const mode of ['method-throws', 'getter-throws']) test(`V94 gamepad policy ${mode} cannot stop the live city clock or keyboard movement`, () => {
  const f = fixture(); f.release();
  f.env.matchesControlAction = matchesControlAction;
  f.env.bindings = DEFAULT_CONTROL_BINDINGS;
  f.env.held.current.add('ArrowRight');
  const before = f.env.actorRef.current.x, clock = f.env.cityClockV68.current;
  const deny = () => { throw new DOMException('Gamepad policy denied', 'SecurityError'); };
  f.env.navigator = mode === 'getter-throws' ? Object.defineProperty({}, 'getGamepads', { get: deny }) : { getGamepads: deny };
  assert.doesNotThrow(() => f.tick(6));
  assert(f.env.actorRef.current.x > before, 'keyboard still moves the actual city actor');
  assert(f.env.cityClockV68.current > clock, 'the motor reschedules its frames');
  assert.equal(f.env.gamepadStateRef.current.ready, false);
  assert.deepEqual(f.events, []);
});

test('V94 gamepad recovery requires neutral after a denied poll instead of replaying a held interaction', () => {
  const f = fixture(); f.release();
  f.env.navigator.getGamepads = () => { throw new DOMException('Denied', 'SecurityError'); };
  assert.doesNotThrow(() => f.tick());
  f.env.navigator.getGamepads = () => [f.pad];
  f.pad.buttons[0].pressed = true; f.tick(3); assert.deepEqual(f.events, []);
  f.release(); f.pad.buttons[0].pressed = true; f.tick();
  assert.deepEqual(f.events, [['interact']]);
});

test('the live V106 archive hook remains dormant during ordinary movement and a refused archive write freezes and resumes the physical clock',()=>{
 const f=fixture(),ledger=f.env.archiveDraftRefV106.current;f.release();f.pad.axes[0]=1;f.tick(3);
 assert.equal(f.env.archiveDraftRefV106.current,ledger,'the actual dormant archive sampler preserves identity');assert.equal(ledger.receipt,null);
 const before={...f.env.actorRef.current},clock=f.env.cityClockV68.current;f.env.archiveWritePausedRefV106.current=true;f.tick(12);
 assert.deepEqual(f.env.actorRef.current,before,'held gamepad direction cannot move after a refused archive write');assert.equal(f.env.cityClockV68.current,clock);
 f.env.archiveWritePausedRefV106.current=false;f.tick(3);assert(f.env.actorRef.current.x>before.x,'successful retry can release the same live input loop');assert(f.env.cityClockV68.current>clock);
});


test('the live V106 archive callback rolls an invalid proposed step back before interruption and preserves an importable carried pair',()=>{
 const f=fixture(),b=city.HOMEWORLD_ARCHIVE_V106,owner=f.env.save.createdAt;
 const context=actor=>({ownerCreatedAt:owner,currentOwnerCreatedAt:owner,actor:{x:actor.x,y:actor.y},levelId:'0',visitedDistrictIds:['port'],active:true});
 let ledger;for(const action of['choose-b','reply','start']){const out=city.applyArchiveActionV106(ledger,action,ledger?.revision??0,context(b.post));assert(out.ok);ledger=out.ledger;}
 let actor={...city.createHomeworldWorldActorV77(),...b.post};const target=b.cases[0].stand;
 for(let i=0;i<300&&Math.hypot(actor.x-target.x,actor.y-target.y)>5;i++){
  const before=actor,span=Math.max(Math.abs(target.x-actor.x)/330,Math.abs(target.y-actor.y)/260,1/60);actor=city.stepHomeworldArchiveActorV106(actor,{moveX:(target.x-actor.x)/(330*span),climb:(target.y-actor.y)/(260*span),jumpPressed:false},1/60,'0');const out=city.sampleArchiveWalkV106(ledger,before,actor,1/60,context(actor));assert(!out.invalid);ledger=out.ledger;
 }
 const take=city.applyArchiveActionV106(ledger,'take-a',ledger.revision,context(actor));assert(take.ok);ledger=take.ledger;
 f.env.progressRef.current.visitedDistrictIds=['port'];f.env.archiveDraftRefV106.current=ledger;
 const before={...actor},proposal={...actor,x:actor.x+300};f.env.actorRef.current=proposal;let interrupted=false;
 f.env.submitArchiveV106=(action,revision)=>{assert.equal(action,'interrupt');assert.equal(f.env.actorRef.current.x,before.x,'the actor rolls back before any durable transaction');const out=city.applyArchiveActionV106(f.env.archiveDraftRefV106.current,action,revision,context(f.env.actorRef.current));assert(out.ok);f.env.archiveDraftRefV106.current=out.ledger;interrupted=true;return true;};
 assert.equal(f.env.sampleArchiveV106(before,proposal,1/60),false);assert(interrupted);assert.equal(f.env.actorRef.current.x,before.x);assert.equal(f.env.actorRef.current.vx,0);assert.equal(f.env.actorRef.current.vy,0);
 const qa=homeworldSceneSsrV78(),saves=qa.load('app/game/save.ts'),location=qa.load('app/game/systems/homeworldLocationV77.ts'),save=saves.normalizeSave({});save.createdAt=owner;save.homeworld.visitedDistrictIds=['port'];save.homeworld.archiveV106=f.env.archiveDraftRefV106.current;save.homeworld.locationV77=location.createHomeworldCheckpointV77(owner,'0',f.env.actorRef.current,null,f.env.actorRef.current);
 assert(saves.parseSaveImport(JSON.stringify(save)).save,'interruption and Retry can persist the restored actor/dossier pair');
});

test('the live V107 comparison remains dormant and a refused write freezes and resumes the physical clock',()=>{
 const f=fixture(),ledger=f.env.comparisonDraftRefV107.current;f.release();f.pad.axes[0]=1;f.tick(3);assert.equal(f.env.comparisonDraftRefV107.current,ledger);assert.equal(ledger.receipt,null);
 const before={...f.env.actorRef.current},clock=f.env.cityClockV68.current;f.env.comparisonWritePausedRefV107.current=true;f.tick(12);assert.deepEqual(f.env.actorRef.current,before);assert.equal(f.env.cityClockV68.current,clock);f.env.comparisonWritePausedRefV107.current=false;f.tick(3);assert(f.env.actorRef.current.x>before.x);assert(f.env.cityClockV68.current>clock);
});

test('the live V107 comparison callback rolls an invalid step back before interruption and saves the exact carried pair',()=>{
 const f=fixture(),route=archiveComparisonRouteV107(f.env.save.createdAt),state=route.carried(),before={...state.actor},proposal={...state.actor,x:state.actor.x+300};
 f.env.progressRef.current.visitedDistrictIds=['port'];f.env.archiveDraftRefV106.current=state.legacyArchive;f.env.comparisonDraftRefV107.current=state.ledger;f.env.actorRef.current=proposal;let interrupted=false;
 f.env.submitComparisonV107=(action,revision)=>{assert.equal(action,'interrupt');assert.equal(f.env.actorRef.current.x,before.x,'rollback precedes the durable comparison transaction');const out=city.applyArchiveComparisonV107(f.env.comparisonDraftRefV107.current,action,revision,route.context(f.env.actorRef.current));assert(out.ok);f.env.comparisonDraftRefV107.current=out.ledger;interrupted=true;return true;};
 assert.equal(f.env.sampleComparisonV107(before,proposal,1/60),false);assert(interrupted);assert.equal(f.env.actorRef.current.x,before.x);assert.equal(f.env.actorRef.current.vx,0);assert.equal(f.env.actorRef.current.vy,0);
 const saves=route.qa.load('app/game/save.ts'),location=route.qa.load('app/game/systems/homeworldLocationV77.ts'),save=saves.normalizeSave({});save.createdAt=route.owner;save.homeworld.visitedDistrictIds=['port'];save.homeworld.archiveV106=state.legacyArchive;save.homeworld.archiveComparisonV107=f.env.comparisonDraftRefV107.current;save.homeworld.locationV77=location.createHomeworldCheckpointV77(route.owner,'0',f.env.actorRef.current,null,f.env.actorRef.current);assert(saves.parseSaveImport(JSON.stringify(save)).save,'rollback restores the complete actor/object pair before Retry can persist it');
});
