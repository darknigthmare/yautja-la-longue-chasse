import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { runInNewContext } from "node:vm";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { build } from "esbuild";

const bundle = await build({
  stdin: { contents: `
    export {canopyNavigationV112} from "./systems/canopyNavigationV112";
    export {attachCanopySwingV112,canopySupportReachableV112} from "./systems/canopyTraversalV112";
    export {WORLD_BLUEPRINTS_BY_MISSION} from "./systems/worldBlueprints";
    export {DEFAULT_CONTROL_BINDINGS} from "./systems/controlBindings";
    export {DEFAULT_HUNT_GAMEPAD_V112,rebindHuntGamepadV112,normalizeHuntAccessibilityV112} from "./systems/huntAccessibilityV112";
    export {default as Hud} from "./HuntCanopyHudV112";
  `, resolveDir: fileURLToPath(new URL("../app/game/", import.meta.url)), loader: "tsx" },
  bundle: true, write: false, platform: "node", format: "cjs", jsx: "automatic",
  loader: { ".module.css": "empty" }, external: ["react", "react/jsx-runtime"], logLevel: "silent",
});
const compiled = { exports: {} };
runInNewContext(bundle.outputFiles[0].text, { module: compiled, exports: compiled.exports, require: createRequire(import.meta.url) });
const api = compiled.exports;
const tree = { id: "tree-a", x: 300, y: 40, width: 48, height: 584, kind: "tree", routeId: "canopy-transfer", climbSpeedMultiplier: 1, staminaPerSecond: 3, dismounts: [] };
const vine = { ...tree, id: "vine-b", x: 480, height: 300, kind: "vine", staminaPerSecond: 4 };
const player = { x: 286, y: 508, width: 76, height: 116, facing: 1, grounded: true, climbing: false, stamina: 100, climbZoneId: null };
const platform = (id, x, y, width = 130, collision = "one-way") => ({ id, x, y, width, height: 18, routeId: "canopy-transfer", material: "root", noiseMultiplier: .7, trackPersistence: .3, collision });
const rest = platform("branch-a", 259, 270);
const defaults = { player, climbables: [tree, vine], platforms: [rest], hazards: [], floorY: 624, minimumGripStamina: 8 };
const navigate = (patch = {}) => api.canopyNavigationV112({ ...defaults, ...patch });
const render = (navigation, props = {}) => renderToStaticMarkup(createElement(api.Hud, { navigation, bindings: api.DEFAULT_CONTROL_BINDINGS, ...props }));
const plain = value => JSON.parse(JSON.stringify(value));

test("a nearby real tree is ready exactly when the native support predicate admits it", () => {
  for (const x of [100, 247, 248, 286, 334, 410]) {
    const body = { ...player, x };
    const view = navigate({ player: body, climbables: [tree], platforms: [] });
    const marker = view.availableGrip ?? view.nextGrip;
    const physicallyReady = api.canopySupportReachableV112(body, tree, []);
    assert.equal(!!view.availableGrip, physicallyReady, `x=${x}`);
    if (marker?.state === "ready") assert.equal(physicallyReady, true);
  }
});

test("an actual intervening wall is shown as an obstacle and never as a ready grasp", () => {
  const wall = platform("thin-wall", 240, 200, 3, "solid");
  wall.height = 424;
  const view = navigate({ player: { ...player, x: 100 }, platforms: [wall], climbables: [tree] });
  assert.equal(view.availableGrip, null);
  assert.equal(view.nextGrip.state, "blocked");
  assert.match(view.nextGrip.reason, /Obstacle solide/);
});

test("grip threshold, action lock, release cooldown and airborne exhaustion use distinct refusals", () => {
  const cases = [
    [{ stamina: 7.99 }, {}, "low-stamina"],
    [{ stamina: 8 }, {}, "ready"],
    [{ climbReattachSeconds: .001 }, {}, "cooldown"],
    [{ climbGripExhausted: true, grounded: false }, {}, "exhausted"],
    [{}, { actionLocked: true }, "locked"],
  ];
  for (const [actor, extra, expected] of cases) {
    const view = navigate({ player: { ...player, ...actor }, climbables: [tree], ...extra });
    const marker = view.availableGrip ?? view.markers.find(m => m.id === tree.id);
    assert.equal(marker?.state, expected);
    assert.equal(!!view.availableGrip, expected === "ready");
  }
  const landed = navigate({ player: { ...player, climbGripExhausted: true }, climbables: [tree] });
  assert.equal(landed.recoveryBlocked, false, "a real landing is the simulation's rearm condition");
  assert.equal(landed.availableGrip?.state, "ready");
});

test("a legitimate pendulum retains its exact grasp, current charge drain and flexible controls", () => {
  const support = { ...vine, x: 300, y: 100, height: 340 };
  const actor = { ...player, x: 286, y: 267.52, velocityX: 120, velocityY: 0, grounded: false, climbing: true, climbZoneId: support.id, stamina: 3 };
  actor.canopySwing = api.attachCanopySwingV112(actor, support);
  assert.ok(actor.canopySwing);
  const view = navigate({ player: actor, climbables: [support], platforms: [], staminaMultiplier: 1.6 });
  assert.equal(view.mode, "swinging");
  assert.equal(view.heldGrip.state, "held", "holding below the new-grasp threshold remains legal");
  assert.equal(view.heldGrip.flexible, true);
  assert.equal(view.heldGrip.staminaPerSecond, 6.4);
  assert.ok(Math.abs(view.heldGrip.point.x - (actor.x + actor.width / 2)) < 1e-6);
  assert.ok(Math.abs(view.heldGrip.point.y - (actor.y + actor.height * .28)) < 1e-6);
  const bad = navigate({ player: { ...actor, canopySwing: { ...actor.canopySwing, supportId: "phantom" } }, climbables: [support] });
  assert.equal(bad.heldGrip, null);
  assert.notEqual(bad.mode, "swinging");
});

test("only a genuine grounded contact is described as recovering on an appui", () => {
  const onBranch = { ...player, y: rest.y - player.height, grounded: true };
  const standing = navigate({ player: onBranch });
  assert.equal(standing.rest.id, rest.id);
  assert.equal(standing.rest.state, "resting");
  assert.equal(standing.mode, "resting");
  for (const actor of [{ ...onBranch, grounded: false }, { ...onBranch, climbing: true, climbZoneId: tree.id }]) {
    assert.notEqual(navigate({ player: actor }).rest?.state, "resting");
  }
  const floor = navigate();
  assert.equal(floor.rest.id, "canopy-world-floor");
  assert.equal(floor.rest.label, "Sol");
});

test("rest landmarks exclude undersized, embedded and damaging reception spaces", () => {
  const actor = { ...player, y: 140, grounded: false };
  const branch = platform("safe-branch", 500, 330);
  const unsafe = platform("too-small", 300, 280, 40);
  const dangerous = platform("damaging-branch", 259, 290);
  const hazard = { id: "plume", x: 250, y: 170, width: 150, height: 121, damagePerSecond: 5 };
  const view = navigate({ player: actor, platforms: [branch, dangerous, unsafe], hazards: [hazard] });
  assert.equal(view.rest.id, branch.id);
  assert.equal(view.rest.state, "waypoint");
  const ceiling = platform("solid-enclosure", 500, 210, 200, "solid");
  ceiling.height = 110;
  ceiling.routeId = "ground";
  const embedded = navigate({ player: actor, platforms: [branch, ceiling] });
  assert.equal(embedded.rest, null);
});

test("a grounded hazard contact remains visibly dangerous rather than a safe rest claim", () => {
  const view = navigate({ hazards: [{ id: "mud-danger", x: 250, y: 500, width: 150, height: 124, damagePerSecond: 4 }] });
  assert.equal(view.rest.state, "resting");
  assert.match(view.rest.reason, /zone dangereuse/);
});

test("directional landmarks are bounded, deduplicated and never imply a successful jump", () => {
  const supports = Array.from({ length: 60 }, (_, i) => ({ ...vine, id: `grip-${i}`, x: 60 + i * 30 }));
  const view = navigate({ climbables: supports, player: { ...player, grounded: false, y: 160 } });
  assert.ok(view.markers.length <= 4);
  assert.equal(new Set(view.markers.map(m => m.id)).size, view.markers.length);
  assert.ok(view.nextGrip.point.x > player.x + player.width / 2);
  const left = navigate({ climbables: supports, player: { ...player, facing: -1, grounded: false, y: 160 } });
  assert.ok(left.nextGrip.point.x < player.x + player.width / 2);
  assert.doesNotMatch(view.nextGrip.reason, /saut (garanti|possible|réussi)/);
});

test("the floor alone never opens a permanent navigation HUD far from climbable geometry", () => {
  const view = navigate({ player: { ...player, x: 4000 } });
  assert.equal(view.visible, false);
  assert.equal(view.mode, "distant");
  assert.equal(view.markers.length, 0);
  assert.equal(render(view), "");
});

test("navigation is deterministic and leaves all eight real mission geometries unchanged", () => {
  for (const world of Object.values(api.WORLD_BLUEPRINTS_BY_MISSION)) {
    const input = { player: { ...player, x: world.spawn.x, y: world.floorY - player.height }, climbables: world.climbables,
      platforms: world.platforms, hazards: world.hazards, floorY: world.floorY, minimumGripStamina: 8 };
    const before = JSON.stringify(input);
    const first = api.canopyNavigationV112(input), second = api.canopyNavigationV112(input);
    assert.deepEqual(plain(first), plain(second));
    assert.equal(JSON.stringify(input), before);
    assert.ok(first.markers.length <= 4);
    for (const item of first.markers) assert.ok([item.point.x, item.point.y, item.distancePx].every(Number.isFinite));
  }
});

test("an invalid threshold fails explicitly and non-finite stamina never grants a grasp", () => {
  assert.throws(() => navigate({ minimumGripStamina: NaN }), /runtime grip threshold/);
  const view = navigate({ player: { ...player, stamina: NaN }, climbables: [tree] });
  assert.equal(view.stamina, 0);
  assert.equal(view.availableGrip, null);
  assert.equal(view.nextGrip, null, "a support level with the actor is not invented as a forward waypoint");
  assert.equal(view.markers.find(m => m.id === tree.id)?.state, "low-stamina");
});

test("the actual HUD uses remapped keyboard and pad actions in its current swing cue", () => {
  const support = { ...vine, x: 300, y: 100, height: 340 };
  const actor = { ...player, x: 286, y: 267.52, velocityX: 0, velocityY: 0, grounded: false, climbing: true, climbZoneId: support.id };
  actor.canopySwing = api.attachCanopySwingV112(actor, support);
  const view = navigate({ player: actor, climbables: [support], platforms: [], staminaMultiplier: 1.6 });
  let settings = api.normalizeHuntAccessibilityV112(undefined);
  settings = api.rebindHuntGamepadV112(settings, "jump", 2);
  const bindings = { ...api.DEFAULT_CONTROL_BINDINGS, "hunt.moveUp": ["F1"], "hunt.moveDown": ["F2"], "hunt.jump": ["F3"] };
  const html = render(view, { bindings, gamepadButtons: settings.gamepadButtons, gripInput: "toggle" });
  const cue = html.match(/<p[^>]*data-canopy-cue-v112[^>]*>(.*?)<\/p>/s)?.[1];
  assert.match(cue, /Direction pour pomper/);
  assert.match(html, /F1 \/ F2/);
  assert.match(cue, /F3 \/ X \/ Carré/);
  assert.match(html, /6\.4 points\/s/);
  assert.match(html, /une autre la relâche/);
  assert.match(html, /sans garantir un saut/);
  assert.doesNotMatch(html, /Espace/);
  assert.match(html, /aria-label="Navigation de canopée"/);
  assert.match(html, /role="status" aria-live="polite" aria-atomic="true"/);
  assert.match(html, /<details[^>]*><summary>Commandes et repères de traversée/);
});
