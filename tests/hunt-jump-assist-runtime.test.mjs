import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { runInNewContext } from "node:vm";
import test from "node:test";
import { build } from "esbuild";
import ts from "typescript";

const canvasUrl = new URL("../app/game/HuntCanvas.tsx", import.meta.url);
const source = await readFile(canvasUrl, "utf8");
const ast = ts.createSourceFile("HuntCanvas.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
// Export production functions only in this in-memory bundle. No movement,
// collision, jump decision or actor initialization is reimplemented by the test.
const bundled = await build({
  stdin: {
    contents: `${source.replace("export default function HuntCanvas", "function HuntCanvas")}
export { makeGameState, applyPlayerJump, updatePlayerJump, updatePlayer, stepGame, pollGamepad, isHeldKeyboardAction, HUNT_CONTROL_ACTIONS, captureCheckpoint, restoreCheckpoint, snapshot, discoverWorldScreen, freshJumpAssistState, matchingControlActions }; export { defaultSave } from "./save"; export { MISSION_BY_ID } from "./data"; export { DEFAULT_CONTROL_BINDINGS } from "./systems/controlBindings";`,
    resolveDir: fileURLToPath(new URL("../app/game/", import.meta.url)),
    sourcefile: fileURLToPath(canvasUrl), loader: "tsx",
  },
  bundle: true, write: false, format: "cjs", platform: "node", jsx: "automatic",
  external: ["react", "react/jsx-runtime"], logLevel: "silent",
});
const browser = { hidden: false, focused: true, pads: [] };
const compiled = { exports: {} };
runInNewContext(bundled.outputFiles[0].text, {
  module: compiled, exports: compiled.exports, require: createRequire(import.meta.url),
  document: { get hidden() { return browser.hidden; }, hasFocus: () => browser.focused },
  navigator: { getGamepads: () => browser.pads },
});
const runtime = compiled.exports;
const plain = value => JSON.parse(JSON.stringify(value));
const close = (actual, expected, tolerance = 1e-6) => assert.ok(Math.abs(actual - expected) < tolerance, `${actual} expected ${expected}`);

function lifecycle(name, environment) {
  let declaration;
  const visit = (node) => {
    if (ts.isVariableDeclaration(node) && node.name.getText(ast) === name) declaration = node;
    else ts.forEachChild(node, visit);
  };
  visit(ast);
  assert.ok(declaration, `production ${name} handler exists`);
  const code = ts.transpileModule(`const handler = ${declaration.initializer.getText(ast)};`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None },
  }).outputText;
  return runInNewContext(`(() => { ${code}; return handler; })()`, environment);
}
function flatWorld(state, platforms = []) {
  state.world = { ...state.world, floorY: 624, platforms, climbables: [], hazards: [] };
  state.enemies = [];
  Object.assign(state.player, { x: 100, y: 508, previousY: 508, velocityX: 0, velocityY: 0, grounded: true, climbing: false });
}
function fixture({ boost = false, missionId = "jungle-vey" } = {}) {
  browser.hidden = false; browser.focused = true; browser.pads = [];
  const save = runtime.defaultSave("2026-08-31T00:00:00.000Z");
  if (boost) save.exploration.abilityIds.push("aerial-boost");
  const mission = runtime.MISSION_BY_ID[missionId];
  const state = runtime.makeGameState(mission, save.loadout, save.inventory, "hunter", save.appearance, false, false, "jump-runtime-test", save.exploration);
  flatWorld(state);
  const input = { keyboardHeld: new Set(), touchHeld: new Set(), gamepadHeld: new Set(), pressed: new Set(), previousGamepadButtons: [], activeGamepadIndex: null, gamepadNeedsNeutral: true, gamepadDialogActions: [], pointerScreen: null };
  const environment = {
    ...runtime, input, game: state, mission, loadout: save.loadout, inventory: save.inventory,
    appearance: save.appearance, difficulty: "hunter", reducedGore: false, screenShake: false,
    ecologyRunSeed: "jump-retry", activeBindings: runtime.DEFAULT_CONTROL_BINDINGS,
    Element: class Element {}, lastObservedPaused: false, lastTime: 0, accumulator: 0,
    lastObservedPhase: state.phase, lastPersistedElapsed: 0, lastPersistedCheckpointIndex: 0,
    performance: { now: () => 1234 }, setUi() {}, emitPersistence() {}, persistHuntRef: { current: undefined },
  };
  environment.isInteractiveControl = lifecycle("isInteractiveControl", environment);
  const keyDown = lifecycle("onKeyDown", environment);
  const keyUp = lifecycle("onKeyUp", environment);
  const event = (code = "Space", repeat = false) => ({ code, key: code === "Space" ? " " : code, repeat, defaultPrevented: false, ctrlKey: false, altKey: false, metaKey: false, target: null, preventDefault() { this.defaultPrevented = true; } });
  const frame = (delta = 1 / 120) => runtime.updatePlayer(environment.game, mission, save.loadout, save.inventory, save.appearance, "hunter", input, delta, () => {});
  const step = (delta = 1 / 120) => runtime.stepGame(environment.game, mission, save.loadout, save.inventory, save.appearance, "hunter", input, delta, () => {});
  return {
    state, input, environment, frame, step,
    down: (repeat = false) => keyDown(event("Space", repeat)), up: () => keyUp(event()),
    blur: lifecycle("onBlur", environment), restart: lifecycle("restart", environment),
    poll: () => runtime.pollGamepad(input),
  };
}
const jumps = state => state.soundEvents.filter(sound => sound === "jump").length;
const pad = () => ({ index: 2, connected: true, axes: [0, 0], buttons: Array.from({ length: 16 }, () => ({ pressed: false, value: 0 })) });
const ledge = (collision = "solid") => ({ id: "test-ledge", x: 0, y: 400, width: 240, height: 24, collision, routeId: "ground", material: "stone", noiseMultiplier: 1, trackPersistence: 1 });

test("real keyboard handlers keep jump held, create only fresh edges and release the upward jump", () => {
  const f = fixture();
  f.down();
  assert.equal(f.input.keyboardHeld.has("jump"), true);
  assert.equal(f.input.pressed.has("jump"), true);
  f.frame();
  assert.equal(f.input.pressed.has("jump"), false);
  const launchedVelocity = f.state.player.velocityY;
  f.down(true); f.frame();
  assert.equal(jumps(f.state), 1);
  assert.ok(f.state.player.velocityY > launchedVelocity, "only gravity acts while held");
  assert.ok(f.state.player.velocityY < -600);
  f.up();
  assert.equal(f.input.keyboardHeld.has("jump"), false);
  f.frame();
  assert.ok(f.state.player.velocityY >= -300 && f.state.player.velocityY < 0);
  assert.equal(f.state.jumpAssist.cutArmed, false);
});

test("real movement and swept floor collision produce a higher held jump and no repeated jump on landing", () => {
  function trajectory(releaseFrame) {
    const f = fixture(); f.down();
    let minimumY = f.state.player.y;
    for (let tick = 0; tick < 180; tick++) {
      if (tick === releaseFrame) f.up();
      f.frame(); minimumY = Math.min(minimumY, f.state.player.y);
    }
    assert.equal(f.state.player.grounded, true);
    close(f.state.player.y + f.state.player.height, 624);
    close(f.state.player.velocityY, 0);
    assert.equal(jumps(f.state), 1);
    return 508 - minimumY;
  }
  const heldHeight = trajectory(Infinity);
  const shortHeight = trajectory(3);
  assert.ok(heldHeight > 130 && heldHeight < 141);
  assert.ok(shortHeight > 25 && shortHeight < 65);
  assert.ok(heldHeight > shortHeight * 2);
});

test("real gamepad A supplies held jump separately from the edge and release cuts ascent", () => {
  const f = fixture(); const controller = pad(); browser.pads = [null, null, controller];
  f.poll();
  controller.buttons[0].pressed = true; f.poll();
  assert.equal(f.input.gamepadHeld.has("jump"), true);
  assert.equal(f.input.pressed.has("jump"), true);
  f.frame(); f.poll();
  assert.equal(f.input.pressed.has("jump"), false);
  assert.equal(f.input.gamepadHeld.has("jump"), true);
  f.frame();
  assert.equal(jumps(f.state), 1);
  controller.buttons[0].pressed = false; f.poll(); f.frame();
  assert.equal(f.input.gamepadHeld.has("jump"), false);
  assert.ok(f.state.player.velocityY >= -300 && f.state.player.velocityY < 0);
});

test("walking off a real ledge grants coyote time without spending boost, then expires", () => {
  function leaveLedge(boost) {
    const f = fixture({ boost }); flatWorld(f.state, [ledge()]);
    Object.assign(f.state.player, { x: 230, y: 284, previousY: 284, velocityX: 300, grounded: true });
    f.input.keyboardHeld.add("right");
    for (let frame = 0; frame < 20 && f.state.player.grounded; frame++) f.frame();
    assert.equal(f.state.player.grounded, false);
    assert.ok(f.state.player.x >= 240);
    assert.ok(f.state.jumpAssist.coyoteSeconds > 0);
    return f;
  }
  const early = leaveLedge(true);
  for (let frame = 0; frame < 4; frame++) early.frame();
  early.down(); early.frame();
  assert.ok(early.state.player.velocityY < -650);
  assert.equal(early.state.player.aerialBoostUsed, false);
  assert.equal(jumps(early.state), 1);
  const late = leaveLedge(false);
  for (let frame = 0; frame < 14; frame++) late.frame();
  late.down(); late.frame();
  assert.ok(late.state.player.velocityY > 0);
  assert.equal(jumps(late.state), 0);
});

test("buffered landing launches on the collision frame without consuming the optional boost", () => {
  for (const collision of ["solid", "one-way"]) {
    const f = fixture({ boost: true }); flatWorld(f.state, [ledge(collision)]);
    Object.assign(f.state.player, { x: 100, y: 280, previousY: 280, velocityY: 300, grounded: false });
    f.down(); f.frame(1 / 60);
    close(f.state.player.y, 284);
    close(f.state.player.velocityY, -720);
    assert.equal(f.state.player.grounded, false, "ground jump already launched this frame");
    assert.equal(f.state.player.aerialBoostUsed, false);
    assert.equal(f.state.jumpAssist.bufferSeconds, 0);
    assert.equal(jumps(f.state), 1);
    f.frame();
    assert.ok(f.state.player.y < 284);
    assert.equal(jumps(f.state), 1);
  }
});

test("ground and coyote assistance cannot invent the persistent ability or allow repeated airborne boosts", () => {
  for (const boost of [false, true]) {
    const f = fixture({ boost, missionId: "ice-cryostalker" });
    const originalProgress = plain(f.state.exploration);
    f.down(); f.frame(); f.up(); f.frame(); f.down(); f.frame();
    assert.equal(jumps(f.state), boost ? 2 : 1);
    assert.equal(f.state.player.aerialBoostUsed, boost);
    f.up(); f.frame(); f.down(); f.frame();
    assert.equal(jumps(f.state), boost ? 2 : 1);
    assert.deepEqual(plain(f.state.exploration), originalProgress);
  }
});

test("stepGame clears pending jump on pause and requires release before accepting another press", () => {
  const f = fixture({ boost: true });
  f.down(); f.input.pressed.add("pause"); f.step();
  assert.equal(f.state.paused, true);
  assert.equal(f.state.elapsed, 0);
  assert.equal(f.state.jumpAssist.requiresRelease, true);
  assert.equal(jumps(f.state), 0);
  f.input.pressed.add("pause"); f.step();
  assert.equal(f.state.paused, false);
  assert.equal(jumps(f.state), 0);
  f.down(true); f.step();
  assert.equal(jumps(f.state), 0, "held/repeated key cannot launch after resume");
  f.up(); f.step(); f.down(); f.step();
  assert.equal(jumps(f.state), 1);
  assert.equal(f.state.player.aerialBoostUsed, false);
});

test("focus loss clears all input devices and ignores held A until neutral on return", () => {
  const f = fixture(); const controller = pad(); browser.pads = [null, null, controller];
  f.poll(); f.down(); f.input.touchHeld.add("jump");
  controller.buttons[0].pressed = true; f.poll();
  f.blur();
  assert.equal(f.state.paused, true);
  assert.equal(f.state.jumpAssist.requiresRelease, true);
  for (const field of ["keyboardHeld", "touchHeld", "gamepadHeld", "pressed"]) assert.equal(f.input[field].size, 0);
  f.input.pressed.add("pause"); f.step();
  f.step(); assert.equal(jumps(f.state), 0);
  controller.buttons[0].pressed = false; f.step();
  controller.buttons[0].pressed = true; f.step();
  assert.equal(jumps(f.state), 1);
});

test("real retry handler clears buffered and held inputs while preserving acquired traversal", () => {
  const f = fixture({ boost: true });
  const inherited = plain(f.state.exploration);
  f.state.lastCheckpoint = runtime.captureCheckpoint(f.state);
  f.down(); f.state.jumpAssist.bufferSeconds = 0.1;
  f.input.touchHeld.add("jump"); f.input.gamepadHeld.add("jump");
  f.restart();
  const restarted = f.environment.game;
  assert.equal(restarted.jumpAssist.requiresRelease, true);
  assert.equal(restarted.jumpAssist.bufferSeconds, 0);
  assert.equal(restarted.jumpAssist.coyoteSeconds, 0);
  for (const field of ["keyboardHeld", "touchHeld", "gamepadHeld", "pressed"]) assert.equal(f.input[field].size, 0);
  assert.equal(f.input.gamepadNeedsNeutral, true);
  assert.deepEqual(plain(restarted.exploration), inherited);
  flatWorld(restarted); const before = jumps(restarted);
  f.down(); f.frame(); assert.equal(jumps(restarted), before);
  f.up(); f.frame(); f.down(); f.frame();
  assert.equal(jumps(restarted), before + 1);
  assert.equal(restarted.player.aerialBoostUsed, false);
});
