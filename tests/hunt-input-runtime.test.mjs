import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const source = await readFile(new URL("../app/game/HuntCanvas.tsx", import.meta.url), "utf8");
const ast = ts.createSourceFile("HuntCanvas.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
function runtimeFunction(name, dependencies) {
  const declaration = ast.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === name);
  assert.ok(declaration);
  const code = ts.transpileModule(declaration.getText(ast), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } }).outputText;
  return runInNewContext(`${code}\n${name};`, dependencies);
}
function fixture() {
  const pad = index => ({ index, connected: true, axes: [0, 0], buttons: Array.from({ length: 16 }, () => ({ pressed: false, value: 0 })) });
  const primary = pad(2);
  const pads = [null, null, primary];
  const document = { hidden: false, hasFocus: () => true };
  const navigator = { getGamepads: () => pads };
  const input = { keyboardHeld: new Set(), touchHeld: new Set(), gamepadHeld: new Set(), pressed: new Set(), previousGamepadButtons: [], activeGamepadIndex: null, gamepadNeedsNeutral: true, gamepadDialogActions: [] };
  const poll = runtimeFunction("pollGamepad", { document, navigator });
  const messages = [];
  const step = runtimeFunction("stepGame", { pollGamepad: poll, consume: (hub, action) => hub.pressed.delete(action), announce: (_state, message) => messages.push(message) });
  return { pad, primary, pads, document, navigator, input, poll: () => poll(input), messages, step: state => step(state, {}, {}, {}, {}, "hunter", input, 1 / 60, () => {}) };
}

test("a connected pad outside slot zero controls the hunt and keeps its slot", () => {
  const f = fixture();
  assert.equal(f.poll(), null);
  assert.equal(f.input.activeGamepadIndex, 2);
  f.primary.buttons[2].pressed = true; f.poll();
  assert.equal(f.input.pressed.delete("melee"), true);
  f.poll(); assert.equal(f.input.pressed.size, 0, "holding does not create repeated actions");
  f.pads[0] = f.pad(0); f.pads[0].buttons[7].pressed = true;
  f.primary.buttons[2].pressed = false; f.poll();
  assert.equal(f.input.activeGamepadIndex, 2);
  assert.equal(f.input.pressed.has("weapon"), false);
});

test("connecting while an attack is held requires neutral before accepting it", () => {
  const f = fixture();
  f.primary.buttons[7].pressed = true;
  f.poll(); f.poll();
  assert.equal(f.input.pressed.size, 0);
  f.primary.buttons[7].pressed = false; f.poll();
  f.primary.buttons[7].pressed = true; f.poll();
  assert.equal(f.input.pressed.has("weapon"), true);
});

test("active gamepad loss pauses before simulation time can advance", () => {
  const f = fixture(); f.poll();
  f.primary.axes[0] = 1; f.poll();
  f.pads[2] = null;
  const state = { phase: "tracking", paused: false, elapsed: 20 };
  f.step(state);
  assert.equal(state.paused, true);
  assert.equal(state.elapsed, 20);
  assert.equal(f.input.gamepadHeld.size, 0);
  assert.equal(f.input.pressed.size, 0);
  assert.match(f.messages[0], /déconnectée/);
});

test("focus loss cannot be bypassed by Start and requires neutral on return", () => {
  const f = fixture(); f.poll();
  f.document.hidden = true;
  f.primary.buttons[9].pressed = true;
  const state = { phase: "tracking", paused: false, elapsed: 20 };
  f.step(state);
  assert.equal(state.paused, true);
  f.document.hidden = false;
  f.step(state);
  assert.equal(state.paused, true, "held Start cannot resume immediately");
  assert.equal(f.input.pressed.size, 0);
  f.primary.buttons[9].pressed = false; f.poll();
  f.primary.buttons[9].pressed = true; f.poll();
  assert.equal(f.input.pressed.has("pause"), true);
});

test("a denied gamepad API never crashes or clears keyboard controls", () => {
  const f = fixture(); f.poll();
  f.navigator.getGamepads = () => { throw new Error("SecurityError"); };
  f.input.keyboardHeld.add("left");
  assert.equal(f.poll(), "gamepad-disconnected");
  assert.equal(f.input.keyboardHeld.has("left"), true);
  assert.equal(f.poll(), null, "disconnection is reported once");
});

test("Start cannot change the paused state of a finished or dead hunt", () => {
  for (const phase of ["dead", "finished"]) {
    const f = fixture(); f.poll();
    f.primary.buttons[9].pressed = true;
    const state = { phase, paused: true, elapsed: 30 };
    f.step(state);
    assert.equal(state.paused, true);
    assert.equal(state.elapsed, 30);
    assert.equal(f.input.pressed.size, 0);
  }
});


test("gamepad dialog actions are edge-triggered and do not repeat while held", () => {
  const f = fixture(); f.poll();
  f.primary.axes[1] = 1; f.poll(); f.poll();
  assert.deepEqual(Array.from(f.input.gamepadDialogActions), ["next"]);
  f.primary.buttons[0].pressed = true; f.poll(); f.poll();
  assert.deepEqual(Array.from(f.input.gamepadDialogActions), ["next", "activate"]);
});

test("pause and death dialogs can move focus and activate a button entirely from the pad", () => {
  const activate = [];
  const ownerDocument = { activeElement: null };
  const buttons = ["retry", "suspend", "return"].map(name => ({ focus() { ownerDocument.activeElement = this; }, click() { activate.push(name); } }));
  ownerDocument.activeElement = buttons[0];
  const dialog = { ownerDocument, querySelectorAll: () => buttons };
  const navigate = runtimeFunction("navigateHuntDialogWithGamepad", {});
  navigate(dialog, ["previous"]);
  assert.equal(ownerDocument.activeElement, buttons[2], "navigation wraps in the dialog");
  navigate(dialog, ["next", "activate"]);
  assert.deepEqual(activate, ["retry"]);
  navigate(null, ["activate"]);
  assert.equal(activate.length, 1, "no background action without an open dialog");
});


test("controller aim ignores a stale mouse position while pointer aim remains precise", () => {
  const updateAim = runtimeFunction("updateAimState", {
    isHeld: (input, action) => input.keyboardHeld.has(action) || input.gamepadHeld.has(action),
    equippedWeapon: () => ({ id: "plasma-caster" }), selectedHandWeapon: () => null,
    solvePlayerRigFrame: () => ({ anchors: { muzzle: { x: 0, y: 50 } } }),
    distance: (a, b) => Math.hypot(a.x - b.x, a.y - b.y),
    clamp: (n, min, max) => Math.max(min, Math.min(max, n)), VIEW_HEIGHT: 720,
  });
  const input = { keyboardHeld: new Set(["aim"]), gamepadHeld: new Set(), pointerScreen: { x: 100, y: 100 } };
  const state = { player: { aiming: false, activeWeaponSlot: 1, weaponCooldown: 0, weaponChargeSeconds: 0, aimPoint: { x: 0, y: 0 }, facing: 1 }, cameraX: 0, world: { width: 8400 }, boss: { active: false }, enemies: [{ x: 600, y: 30, width: 40, height: 40, alive: true, active: true }] };
  updateAim(state, input, {}, 1 / 60);
  assert.deepEqual(state.player.aimPoint, { x: 100, y: 100 });
  input.keyboardHeld.clear(); input.gamepadHeld.add("aim");
  updateAim(state, input, {}, 1 / 60);
  assert.deepEqual(state.player.aimPoint, { x: 620, y: 46.8 });
});
