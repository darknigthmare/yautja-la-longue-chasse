import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { DEFAULT_CONTROL_BINDINGS, matchesControlAction, matchingControlActions } from "../app/game/systems/controlBindings.ts";

async function sourceTree(file) {
  const source = await readFile(new URL(file, import.meta.url), "utf8");
  return ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
}
const hub = await sourceTree("../app/game/ShipHub.tsx");
const client = await sourceTree("../app/game/GameClient.tsx");
function runtimeCallback(tree, predicate, environment) {
  let implementation;
  const visit = (node) => {
    if (ts.isCallExpression(node) && predicate(node, tree)) implementation = node.arguments[0];
    else ts.forEachChild(node, visit);
  };
  visit(tree);
  assert.ok(implementation, "the live callback must exist");
  const compiled = ts.transpileModule(`const handler = ${implementation.getText(tree)};`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None },
  }).outputText;
  return runInNewContext(`(() => { ${compiled}; return handler; })()`, environment);
}
function fixture() {
  const events = [];
  const frames = new Map();
  const focusedElement = {};
  const pad = { axes: [0, 0], buttons: Array.from({ length: 16 }, () => ({ pressed: false })) };
  let frameId = 0;
  const environment = {
    gamepadEnabled: true, suspended: false, trainingSession: null,
    embedded: true, safeActionIndex: 0, activeRoomId: "training",
    controlBindings: DEFAULT_CONTROL_BINDINGS, matchingControlActions,
    gamepadStateRef: { current: { previous: Array(6).fill(false), ready: false } },
    rootRef: { current: { contains: (node) => node === focusedElement, focus() {} } },
    document: { hidden: false, hasFocus: () => true, activeElement: focusedElement },
    navigator: { getGamepads: () => [pad] },
    window: { requestAnimationFrame(fn) { const id = ++frameId; frames.set(id, fn); return id; }, cancelAnimationFrame(id) { frames.delete(id); } },
    focusAction: (index) => events.push(["focus", index]),
    invokeAction: (index) => events.push(["invoke", index]),
    moveRoom: (direction) => events.push(["move", direction]),
    selectRoom: (room) => events.push(["select", room]),
    onOpenDeck: () => events.push(["deck"]),
    HTMLInputElement: class {}, HTMLSelectElement: class {}, HTMLTextAreaElement: class {}, HTMLButtonElement: class {},
  };
  const effect = runtimeCallback(hub, (node, tree) => node.expression.getText(tree) === "useEffect" && node.arguments[0]?.getText(tree).includes("navigator.getGamepads"), environment);
  let cleanup;
  const render = () => { cleanup?.(); cleanup = effect(); };
  const tick = () => {
    const next = frames.entries().next().value;
    assert.ok(next, "an active polling frame exists");
    frames.delete(next[0]); next[1]();
  };
  const keyDown = runtimeCallback(hub, (node, tree) => node.expression.getText(tree) === "useCallback" && node.parent.name?.getText(tree) === "handleKeyDown", environment);
  render();
  return { events, frames, environment, pad, render, tick, keyDown };
}
function keyEvent(code, key = code, extra = {}) {
  return { code, key, nativeEvent: { code, key }, repeat: false, defaultPrevented: false, target: {},
    preventDefault() { this.defaultPrevented = true; }, stopPropagation() { this.stopped = true; }, ...extra };
}

test("holding the pad across a ShipHub render triggers one action until release", () => {
  const f = fixture();
  f.tick();
  f.pad.buttons[13].pressed = true;
  f.tick();
  assert.deepEqual(f.events, [["focus", 1]]);
  f.environment.safeActionIndex = 1;
  f.render(); f.tick(); f.tick();
  assert.deepEqual(f.events, [["focus", 1]], "a render cannot recreate a d-pad press");
  f.pad.buttons[13].pressed = false; f.tick();
  f.pad.buttons[13].pressed = true; f.tick();
  assert.deepEqual(f.events, [["focus", 1], ["focus", 2]]);
});

test("ShipHub pause and focus loss require neutral before a held pad can act again", () => {
  const f = fixture();
  f.tick();
  f.environment.suspended = true; f.render();
  assert.equal(f.frames.size, 0);
  f.pad.buttons[0].pressed = true;
  f.environment.suspended = false; f.render(); f.tick();
  assert.deepEqual(f.events, []);
  f.pad.buttons[0].pressed = false; f.tick();
  f.pad.buttons[0].pressed = true; f.tick();
  assert.deepEqual(f.events, [["invoke", 0]]);
  f.environment.document.hidden = true; f.tick();
  f.environment.document.hidden = false; f.tick();
  assert.equal(f.events.length, 1);
});

test("B returns an embedded installation to deck and preserves the standalone bridge behavior", () => {
  const f = fixture(); f.tick();
  f.pad.buttons[1].pressed = true; f.tick();
  assert.deepEqual(f.events, [["deck"]]);
  f.pad.buttons[1].pressed = false; f.tick();
  f.environment.embedded = false; f.render();
  f.pad.buttons[1].pressed = true; f.tick();
  assert.deepEqual(f.events, [["deck"], ["select", "bridge-map"]]);
});

test("remapped installation return respects a nested drill and suspension", () => {
  const f = fixture();
  f.environment.controlBindings = { ...DEFAULT_CONTROL_BINDINGS, "shipHub.returnToBridge": ["F8"] };
  const back = keyEvent("F8", "F8"); f.keyDown(back);
  assert.deepEqual(f.events, [["deck"]]); assert.equal(back.stopped, true);
  f.environment.trainingSession = { disciplineId: "targeting", seed: 1 }; f.render();
  assert.equal(f.frames.size, 0);
  f.keyDown(keyEvent("F8", "F8"));
  f.environment.trainingSession = null; f.environment.suspended = true;
  f.keyDown(keyEvent("F8", "F8"));
  assert.equal(f.events.length, 1);
});

test("a drill notifies the host when it owns input and clears the flag on unmount", () => {
  const states = [];
  const environment = { trainingSession: { disciplineId: "mobility", seed: 1 }, onTrainingActiveChange: (active) => states.push(active) };
  const effect = runtimeCallback(hub, (node, tree) => node.expression.getText(tree) === "useEffect" && node.arguments[0]?.getText(tree).includes("onTrainingActiveChange"), environment);
  const cleanup = effect(); assert.deepEqual(states, [true]);
  cleanup(); assert.deepEqual(states, [true, false]);
});

test("deck pause follows saved keyboard bindings without repeat activation", () => {
  const listeners = new Map(); const opened = [];
  const environment = { screen: "deck", settingsOpen: false, matchesControlAction,
    save: { settings: { controlBindings: { ...DEFAULT_CONTROL_BINDINGS, "hunt.pause": ["KeyP"] } } },
    document: { addEventListener: (type, handler) => listeners.set(type, handler), removeEventListener: (type) => listeners.delete(type) },
    setSettingsOpen: (value) => opened.push(value),
  };
  const effect = runtimeCallback(client, (node, tree) => node.expression.getText(tree) === "useEffect" && node.arguments[0]?.getText(tree).includes("const onPause"), environment);
  const cleanup = effect();
  const handler = listeners.get("keydown");
  handler(keyEvent("Escape", "Escape"));
  handler(keyEvent("KeyP", "p", { repeat: true }));
  handler(keyEvent("KeyP", "p", { defaultPrevented: true }));
  assert.deepEqual(opened, []);
  handler(keyEvent("KeyP", "p")); assert.deepEqual(opened, [true]);
  cleanup(); assert.equal(listeners.size, 0);
});


test("holding Escape to open pause does not immediately close its settings dialog", () => {
  const listeners = new Map(); const closed = [];
  class Element {}
  const environment = { settingsOpen: true, HTMLElement: Element,
    settingsDialogRef: { current: { querySelectorAll: () => [] } },
    document: { activeElement: null, addEventListener: (type, fn) => listeners.set(type, fn), removeEventListener: (type) => listeners.delete(type) },
    window: { requestAnimationFrame: () => 1, cancelAnimationFrame() {} },
    setSettingsOpen: (value) => closed.push(value), setResetArmed() {},
  };
  const effect = runtimeCallback(client, (node, tree) => node.expression.getText(tree) === "useEffect" && node.arguments[0]?.getText(tree).includes("const previouslyFocused"), environment);
  const cleanup = effect(); const handler = listeners.get("keydown");
  handler(keyEvent("Escape", "Escape", { repeat: true }));
  handler(keyEvent("Escape", "Escape", { defaultPrevented: true }));
  assert.deepEqual(closed, []);
  handler(keyEvent("Escape", "Escape")); assert.deepEqual(closed, [false]);
  cleanup(); assert.equal(listeners.size, 0);
});
