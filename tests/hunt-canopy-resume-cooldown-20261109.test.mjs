import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { runInNewContext } from "node:vm";
import test from "node:test";
import { build } from "esbuild";

const sourceUrl = new URL("../app/game/HuntCanvas.tsx", import.meta.url);
const source = await readFile(sourceUrl, "utf8");
const bundle = await build({
  stdin: {
    contents: `${source.replace("export default function HuntCanvas", "function HuntCanvas")}
export {makeGameState,updatePlayer,captureCheckpoint,restoreCheckpoint,serializeActiveHuntCheckpoint,deserializeActiveHuntCheckpoint};
export {defaultSave} from "./save"; export {MISSION_BY_ID} from "./data";
export function decodeStoredSnapshotForTest(serialized: string) {
  return deserializeActiveHuntCheckpoint(JSON.parse(serialized));
}`,
    resolveDir: fileURLToPath(new URL("../app/game/", import.meta.url)),
    sourcefile: fileURLToPath(sourceUrl),
    loader: "tsx",
  },
  bundle: true,
  write: false,
  format: "cjs",
  platform: "node",
  jsx: "automatic",
  loader: { ".module.css": "empty" },
  external: ["react", "react/jsx-runtime", "react-dom"],
  logLevel: "silent",
});
const compiled = { exports: {} };
runInNewContext(bundle.outputFiles[0].text, {
  module: compiled, exports: compiled.exports, require: createRequire(import.meta.url),
});
const runtime = compiled.exports;
const delta = 1 / 120;

function inputHub() {
  return {
    keyboardHeld: new Set(), touchHeld: new Set(), gamepadHeld: new Set(),
    pressed: new Set(), previousGamepadButtons: [], activeGamepadIndex: null,
    gamepadNeedsNeutral: true, gamepadDialogActions: [], pointerScreen: null,
  };
}

function fixture(device = "keyboardHeld") {
  const save = runtime.defaultSave("2026-11-09T00:00:00Z");
  const mission = runtime.MISSION_BY_ID["jungle-vey"];
  const create = () => runtime.makeGameState(mission, save.loadout, save.inventory,
    "hunter", save.appearance, false, false, "resume-cooldown-review", save.exploration);
  const state = create();
  const support = state.world.climbables.find(zone =>
    zone.id.startsWith("v112-canopy-") && zone.id.endsWith("-2-grip") && zone.kind === "vine");
  assert.ok(support);
  // This vine has a lower resting branch, leaving room for the whole airborne
  // delay. Only the initial grasp is positioned by the fixture. The authored world,
  // release, fall, cooldown and reacquisition use the production physics.
  Object.assign(state.player, {
    x: support.x + support.width / 2 - state.player.width / 2,
    y: support.y + 80 - state.player.height * 0.28,
    previousY: support.y + 80 - state.player.height * 0.28,
    velocityX: 0, velocityY: 0, grounded: false,
    climbing: true, climbZoneId: support.id, canopySwing: null, stamina: 100,
  });
  const input = inputHub();
  const step = (game, controls = input) => runtime.updatePlayer(game, mission,
    save.loadout, save.inventory, save.appearance, "hunter", controls, delta, () => {});
  const held = input[device];
  held.add("right"); step(state);
  assert.ok(state.player.canopySwing, "a real direction input creates the pendulum");
  held.add("jump"); input.pressed.add("jump"); step(state);
  assert.equal(state.player.climbing, false);
  assert.ok(state.player.climbReattachSeconds > 0, "the real release starts its delay");
  held.clear(); held.add("up"); input.pressed.clear();
  return { state, support, input, create, step, device };
}

function checkpointRoundTrip(state) {
  const checkpoint = runtime.captureCheckpoint(state, "resume");
  const serialized = runtime.serializeActiveHuntCheckpoint(checkpoint, 0);
  assert.ok(serialized);
  // Parse storage bytes in the same realm as the native bounded-object guard,
  // just as browser JSON.parse does; cross-VM prototypes are rightly refused.
  const decoded = runtime.decodeStoredSnapshotForTest(JSON.stringify(serialized));
  assert.ok(decoded, "the actual checksum/schema accepts this released pose");
  return decoded.checkpoint;
}

for (const device of ["keyboardHeld", "touchHeld", "gamepadHeld"]) {
  test(`a resumed release keeps its real reacquisition delay: ${device}`, () => {
    const f = fixture(device);
    const checkpoint = checkpointRoundTrip(f.state);
    const resumed = runtime.restoreCheckpoint(f.create(), checkpoint, "resume");
    assert.equal(resumed.paused, true, "resume keeps the existing explicit pause");
    assert.equal(resumed.player.climbReattachSeconds, checkpoint.player.climbReattachSeconds);
    assert.equal(resumed.player.velocityX, checkpoint.player.velocityX);
    assert.equal(resumed.player.velocityY, checkpoint.player.velocityY);
    assert.equal(resumed.player.stamina, checkpoint.player.stamina);
    resumed.paused = false;
    const resumedInput = inputHub(); resumedInput[device].add("up");

    let waitedTicks = 0;
    while (f.state.player.climbReattachSeconds > delta + 1e-8) {
      f.step(f.state); f.step(resumed, resumedInput); waitedTicks++;
      assert.equal(f.state.player.grounded, false, "the fixture stays above a real resting branch: " +
        JSON.stringify({waitedTicks, support: f.support, y: f.state.player.y, height: f.state.player.height}));
      assert.equal(f.state.player.climbing, false);
      assert.equal(resumed.player.climbing, false, "reloading must not bypass the remaining delay");
      assert.equal(resumed.player.climbReattachSeconds, f.state.player.climbReattachSeconds);
      assert.equal(resumed.player.x, f.state.player.x);
      assert.equal(resumed.player.y, f.state.player.y);
      assert.ok(waitedTicks < 60);
    }
    assert.ok(waitedTicks > 20, "a meaningful interval elapses under actual airborne physics");
    for (let tick = 0; tick < 3 && !resumed.player.climbing; tick++) {
      f.step(f.state); f.step(resumed, resumedInput);
    }
    assert.equal(f.state.player.climbing, true);
    assert.equal(resumed.player.climbing, true, "the retained delay must expire, not permanently block a grip");
    assert.equal(resumed.player.climbZoneId, f.support.id);
    f.input[device].add("right"); resumedInput[device].add("right");
    f.step(f.state); f.step(resumed, resumedInput);
    assert.equal(resumed.player.canopySwing?.supportId, f.support.id);
  });
}

test("retry retains its distinct reset instead of inheriting the suspended release", () => {
  const f = fixture();
  const retried = runtime.restoreCheckpoint(f.state, checkpointRoundTrip(f.state), "retry");
  assert.equal(retried.player.climbReattachSeconds, 0);
  assert.equal(retried.player.climbing, false);
  assert.equal(retried.player.canopySwing, null);
});

test("legacy checkpoints without a release delay still restore a usable finite player", () => {
  const f = fixture();
  const checkpoint = runtime.captureCheckpoint(f.state, "resume");
  delete checkpoint.player.climbReattachSeconds;
  const serialized = runtime.serializeActiveHuntCheckpoint(checkpoint, 0);
  const decoded = runtime.decodeStoredSnapshotForTest(JSON.stringify(serialized));
  assert.ok(decoded);
  const resumed = runtime.restoreCheckpoint(f.create(), decoded.checkpoint, "resume");
  assert.equal(resumed.player.climbReattachSeconds, 0);
  resumed.paused = false;
  f.step(resumed);
  assert.equal(Number.isFinite(resumed.player.x), true);
  assert.equal(Number.isFinite(resumed.player.y), true);
});
