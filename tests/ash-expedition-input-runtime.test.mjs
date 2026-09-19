import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { build } from "esbuild";
import { createAshGamepadState, stepAshGamepad } from "../app/game/systems/ashExpeditionInput.ts";
import { nextHomeworldDialogChoice } from "../app/game/systems/homeworldInput.ts";
import { DEFAULT_CONTROL_BINDINGS, matchesControlAction } from "../app/game/systems/controlBindings.ts";

const source = await readFile(new URL("../app/game/HomeworldExpedition.tsx", import.meta.url), "utf8");
const tree = ts.createSourceFile("HomeworldExpedition.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const bundle = await build({ entryPoints: ["app/game/systems/homeworldExpedition.ts"], bundle: true, write: false, format: "esm", platform: "node" });
const ash = await import("data:text/javascript;base64," + Buffer.from(bundle.outputFiles[0].text).toString("base64"));

function liveCallback(name, environment) {
  let implementation;
  function visit(node) {
    if (name === "poll" && ts.isCallExpression(node) && node.expression.getText(tree) === "useEffect"
      && node.arguments[0]?.getText(tree).includes("stepAshGamepad")) implementation = node.arguments[0];
    if (ts.isVariableDeclaration(node) && node.name.getText(tree) === name) implementation = node.initializer;
    ts.forEachChild(node, visit);
  }
  visit(tree); assert.ok(implementation, `executes live ${name} callback`);
  const compiled = ts.transpileModule(`const handler = ${implementation.getText(tree)};`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None },
  }).outputText;
  return runInNewContext(`(() => { ${compiled}; return handler; })()`, environment);
}

function fixture() {
  let nextFrame, time = 0, cleanup;
  const events = [], world = {}, outside = {}, modal = {};
  const pad = { connected: true, id: "virtual-ash", index: 2, axes: [0, 0], buttons: Array.from({ length: 16 }, () => ({ pressed: false })) };
  const context = { suspended: false, paused: false, exitConfirm: false, delivery: "idle" };
  const env = {
    ...ash, createAshGamepadState, stepAshGamepad, nextHomeworldDialogChoice,
    bindings: DEFAULT_CONTROL_BINDINGS, held: { current: new Set() }, touches: { current: new Set() }, queued: { current: {} },
    gamepadStateRef: { current: createAshGamepadState() }, inputContextRef: { current: context },
    blockedRef: { current: false }, stateRef: { current: ash.createAshExpedition() },
    document: { activeElement: world, hidden: false, hasFocus: () => env.windowFocused }, windowFocused: true,
    rootRef: { current: { contains: element => element !== outside } }, modalRef: { current: { querySelectorAll: () => choices } },
    performance: { now: () => time }, navigator: { getGamepads: () => [null, null, pad] },
    requestAnimationFrame(fn) { nextFrame = fn; return 1; }, cancelAnimationFrame() {}, setState() {},
    clearInputs() { env.held.current.clear(); env.touches.current.clear(); env.queued.current = {}; env.gamepadStateRef.current = createAshGamepadState(); },
    setPaused(value) { context.paused = typeof value === "function" ? value(context.paused) : value; events.push(["paused", context.paused]); sync(); },
    setExitConfirm(value) { context.exitConfirm = value; events.push(["exit", value]); sync(); },
    setDelivery(value) { context.delivery = value.status; events.push(["delivery", value.status]); sync(); },
    deliverRef: { current: () => events.push(["report"]) },
  };
  const choices = [0, 1].map(index => ({
    focus() { env.document.activeElement = choices[index]; events.push(["focus", index]); },
    click() { events.push(["choice", index]); if (index === 0 && context.exitConfirm) env.setExitConfirm(false); },
  }));
  function sync() {
    env.blockedRef.current = context.suspended || context.paused || context.exitConfirm || context.delivery !== "idle";
    env.document.activeElement = env.blockedRef.current ? choices[0] : world;
  }
  const effect = liveCallback("poll", env);
  function render() { cleanup?.(); cleanup = effect(); }
  function tick(count = 1) { for (let index = 0; index < count; index++) { time += 1000 / 60; nextFrame(time); } }
  function release() { pad.axes = [0, 0]; for (const button of pad.buttons) button.pressed = false; tick(); }
  render();
  return { env, pad, context, events, choices, world, outside, modal, tick, release, render, sync };
}

test("connected slot two works, while A/stick held at entry cannot move or jump", () => {
  const f = fixture(); f.pad.axes[0] = 1; f.pad.buttons[0].pressed = true; f.tick(3);
  assert.equal(f.env.stateRef.current.actor.x, 100); assert.equal(f.env.stateRef.current.actor.y, 920);
  f.release(); f.pad.axes[0] = 1; f.tick(3); assert.equal(f.env.stateRef.current.actor.x, 115);
  f.release(); f.pad.buttons[0].pressed = true; f.tick(); assert(f.env.stateRef.current.actor.vy < 0);
});

for (const transition of ["focus", "window", "hidden", "suspended"]) test(`${transition} interruption freezes simulation and requires neutral on return`, () => {
  const f = fixture(); f.tick(); f.pad.axes[0] = 1; f.tick(3);
  const before = structuredClone(f.env.stateRef.current);
  if (transition === "focus") f.env.document.activeElement = f.outside;
  if (transition === "window") f.env.windowFocused = false;
  if (transition === "hidden") f.env.document.hidden = true;
  if (transition === "suspended") f.context.suspended = true;
  f.pad.buttons[3].pressed = true; f.tick(4); assert.deepEqual(f.env.stateRef.current, before);
  f.env.document.activeElement = f.world; f.env.windowFocused = true; f.env.document.hidden = false; f.context.suspended = false;
  f.tick(4); assert.equal(f.env.stateRef.current.actor.x, before.actor.x);
  f.release(); f.pad.axes[0] = 1; f.tick(2); assert(f.env.stateRef.current.actor.x > before.actor.x);
});

test("Start pauses and resumes once; held movement cannot leak through either transition", () => {
  const f = fixture(); f.tick(); f.pad.buttons[9].pressed = true; f.pad.axes[0] = 1; f.tick(4);
  assert.equal(f.context.paused, true); assert.equal(f.env.stateRef.current.actor.x, 100);
  f.release(); f.pad.buttons[9].pressed = true; f.tick(3); assert.equal(f.context.paused, false);
  f.pad.axes[0] = 1; f.tick(4); assert.equal(f.env.stateRef.current.actor.x, 100);
  assert.deepEqual(f.events, [["paused", true], ["paused", false]]);
  f.release(); f.pad.axes[0] = 1; f.tick(2); assert(f.env.stateRef.current.actor.x > 100);
});

test("B opens a safe return confirmation; held A cannot choose it; dialog cycles and A clicks once", () => {
  const f = fixture(); f.tick(); f.pad.buttons[1].pressed = true; f.pad.buttons[0].pressed = true; f.tick(4);
  assert.equal(f.context.exitConfirm, true); assert.deepEqual(f.events, [["exit", true]]);
  f.release(); f.env.document.activeElement = f.modal; f.pad.buttons[12].pressed = true; f.tick();
  assert.equal(f.env.document.activeElement, f.choices[1]);
  f.render(); f.tick(3); assert.equal(f.events.filter(([name]) => name === "focus").length, 1);
  f.release(); f.pad.buttons[13].pressed = true; f.tick(); assert.equal(f.env.document.activeElement, f.choices[0]);
  f.release(); f.pad.buttons[0].pressed = true; f.tick(4); assert.equal(f.context.exitConfirm, false);
  assert.deepEqual(f.events.filter(([name]) => name === "choice"), [["choice", 0]]);
  assert.equal(f.env.stateRef.current.actor.y, 920, "A used by dialog cannot become a terrain jump");
});

test("B cancels return or save failure without abandoning or retrying; saving consumes all input", () => {
  for (const mode of ["exit", "failed", "saving"]) {
    const f = fixture(); f.context.exitConfirm = mode === "exit"; f.context.delivery = mode === "exit" ? "idle" : mode; f.sync(); f.tick();
    const before = structuredClone(f.env.stateRef.current);
    f.pad.buttons[1].pressed = true; f.pad.buttons[9].pressed = true; f.pad.axes[0] = 1; f.tick(3);
    assert.deepEqual(f.env.stateRef.current.actor, before.actor);
    if (mode === "saving") assert.deepEqual(f.env.stateRef.current, before);
    assert(!f.events.some(([name]) => name === "report" || name === "choice"));
    if (mode === "saving") assert.deepEqual(f.events, []);
    else assert.equal(f.env.blockedRef.current, false);
  }
});

test("Y/X edges operate real nearby inspection and held inputs cannot repeat across a render", () => {
  const f = fixture(); f.tick(); f.pad.axes[0] = 1; f.tick(70); f.release();
  assert.equal(f.env.stateRef.current.actor.x, 450);
  f.pad.buttons[2].pressed = true; f.pad.buttons[3].pressed = true; f.tick();
  assert.equal(f.env.stateRef.current.trueTrailInspected, true);
  const scan = f.env.stateRef.current.scanTicks; f.render(); f.tick(4);
  assert(f.env.stateRef.current.scanTicks < scan, "holding X must not restart scanner on rerender");
});

test("controller replacement/reconnect requires neutral, nonfinite axes cannot move the real actor", () => {
  const f = fixture(); f.tick(); f.pad.axes[0] = 1; f.pad.id = "replacement"; f.tick(3); assert.equal(f.env.stateRef.current.actor.x, 100);
  f.release(); f.pad.axes[0] = Number.NaN; f.tick(3); assert.equal(f.env.stateRef.current.actor.x, 100);
  f.pad.connected = false; f.tick(); f.pad.connected = true; f.pad.axes[0] = 1; f.tick(3); assert.equal(f.env.stateRef.current.actor.x, 100);
  f.release(); f.pad.axes[0] = 1; f.tick(); assert.equal(f.env.stateRef.current.actor.x, 105);
});

test("live keyboard callback honors remapped pause on modal buttons, ignores repeat and external suspension", () => {
  class Element { closest() { return this.button ? this : null; } }
  const target = new Element(); target.button = true;
  const events = [], environment = { HTMLElement: Element, matchesControlAction,
    bindings: { ...DEFAULT_CONTROL_BINDINGS, "hunt.pause": ["KeyP"] }, suspended: false, exitConfirm: false,
    delivery: { status: "idle" }, blocked: false, clearInputs() {}, setPaused() { events.push("pause"); } };
  const callback = liveCallback("keyDown", environment);
  const key = (code, repeat = false) => callback({ target, code, repeat, nativeEvent: { code }, preventDefault() {}, stopPropagation() {} });
  key("Escape"); assert.equal(events.length, 0); key("KeyP"); assert.equal(events.length, 1);
  key("KeyP", true); assert.equal(events.length, 1);
  environment.suspended = true; key("KeyP"); assert.equal(events.length, 1);
  environment.suspended = false; environment.exitConfirm = true; key("KeyP"); assert.equal(events.length, 1);
  environment.exitConfirm = false; environment.delivery.status = "saving"; key("KeyP"); assert.equal(events.length, 1);
});
