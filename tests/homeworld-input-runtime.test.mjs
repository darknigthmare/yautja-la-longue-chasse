import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { build } from "esbuild";
import { createHomeworldGamepadState, stepHomeworldGamepad, nextHomeworldDialogChoice } from "../app/game/systems/homeworldInput.ts";

const source = await readFile(new URL("../app/game/HomeworldHub.tsx", import.meta.url), "utf8");
const tree = ts.createSourceFile("HomeworldHub.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const bundle = await build({ entryPoints: ["app/game/systems/homeworldCity.ts"], bundle: true, write: false, format: "esm", platform: "node" });
const city = await import("data:text/javascript;base64," + Buffer.from(bundle.outputFiles[0].text).toString("base64"));

function pollingEffect(environment) {
  let implementation;
  const visit = node => {
    if (ts.isCallExpression(node) && node.expression.getText(tree) === "useEffect"
      && node.arguments[0]?.getText(tree).includes("stepHomeworldGamepad")) implementation = node.arguments[0];
    else ts.forEachChild(node, visit);
  };
  visit(tree);
  assert.ok(implementation, "test executes the live Homeworld polling effect");
  const compiled = ts.transpileModule(`const handler = ${implementation.getText(tree)};`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None },
  }).outputText;
  return runInNewContext(`(() => { ${compiled}; return handler; })()`, environment);
}

function fixture() {
  const frames = new Map(), events = [];
  const pad = { connected: true, id: "virtual-qa", index: 0, axes: [0, 0], buttons: Array.from({ length: 16 }, () => ({ pressed: false })) };
  const world = {}, outside = {}, dialog = {};
  const choices = Array.from({ length: 3 }, (_, index) => ({
    focus() { env.document.activeElement = choices[index]; events.push(["focus", index]); },
    click() { events.push(["choose", index]); },
  }));
  let sequence = 0, time = 0, cleanup, paused = false, inactive = false;
  const env = {
    createHomeworldGamepadState, stepHomeworldGamepad, nextHomeworldDialogChoice,
    matchesControlAction: () => false, bindings: {}, held: { current: new Set() },
    touch: { current: { left: false, right: false, up: false, down: false, jump: false } },
    gamepadStateRef: { current: createHomeworldGamepadState() },
    suspendedRef: { current: false }, pausedRef: { current: false }, dialogStateRef: { current: null },
    actorRef: { current: city.createHomeworldActor() }, visitedAttempt: { current: null },
    rootRef: { current: { contains: element => [world, dialog, ...choices].includes(element) } },
    dialogRef: { current: { querySelectorAll: () => choices } },
    document: { hidden: false, activeElement: world, hasFocus: () => env.windowFocused }, windowFocused: true,
    navigator: { getGamepads: () => [pad] },
    requestAnimationFrame(fn) { const id = ++sequence; frames.set(id, fn); return id; },
    cancelAnimationFrame(id) { frames.delete(id); },
    stepHomeworldActor: city.stepHomeworldActor, districtAtHomeworldActor: city.districtAtHomeworldPosition,
    persistAction() {}, setActor() {}, setPhase() {},
    setInactive(value) { inactive = value; env.pausedRef.current = paused || inactive; },
    setPaused(value) { paused = typeof value === "function" ? value(paused) : value; env.pausedRef.current = paused || inactive; events.push(["paused", paused]); },
    clearInputs() { env.held.current.clear(); for (const key of Object.keys(env.touch.current)) env.touch.current[key] = false; env.gamepadStateRef.current = createHomeworldGamepadState(); },
    interact() { events.push(["interact"]); env.clearInputs(); env.dialogStateRef.current = { point: "nearby" }; env.document.activeElement = dialog; },
    closeDialog() { events.push(["close"]); env.clearInputs(); env.dialogStateRef.current = null; env.document.activeElement = world; },
  };
  const effect = pollingEffect(env);
  const render = () => { cleanup?.(); cleanup = effect(); };
  const tick = (count = 1) => { for (let i = 0; i < count; i += 1) {
    const next = frames.entries().next().value; assert.ok(next); frames.delete(next[0]); time += 1000 / 60; next[1](time);
  } };
  const release = () => { pad.axes = [0, 0]; for (const button of pad.buttons) button.pressed = false; tick(); };
  render();
  return { env, pad, tick, release, render, events, world, outside, dialog, choices };
}

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