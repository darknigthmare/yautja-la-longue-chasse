import assert from "node:assert/strict";
import { test } from "node:test";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import { build } from "esbuild";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

const bundle = await build({
  stdin: {
    contents: 'export * from "./app/game/systems/metroidvaniaPilot"; export * from "./app/game/systems/explorationProgress"; export * from "./app/game/PilotExplorationMap"; export { worldBlueprintFor } from "./app/game/systems/worldBlueprints";',
    resolveDir: process.cwd(), loader: "ts",
  },
  bundle: true, write: false, platform: "node", format: "cjs", jsx: "automatic", external: ["react", "react-dom"],
});
const compiled = { exports: {} };
runInNewContext(bundle.outputFiles[0].text, { module: compiled, exports: compiled.exports, require: createRequire(import.meta.url) });
const {
  PILOT_MISSION_ID, PILOT_ROOMS, PILOT_SEAL_ID, PILOT_HATCH_ID, PILOT_SECRET_ID,
  PILOT_HATCH, PILOT_RIGHT_WALL, PILOT_ROPE,
  defaultExplorationProgress, explorationBonuses, mergeExplorationProgress,
  pilotInteract, pilotHint, pilotPlatforms, pilotClimbables, applyPilotWorld,
  discoverPilotRooms, pilotRoomAt, PilotExplorationMap, worldBlueprintFor,
} = compiled.exports;
const plain = (value) => JSON.parse(JSON.stringify(value));
const player = (x, floorY = 624) => ({ x, y: floorY - 116, width: 72, height: 116 });
const install = (progress = defaultExplorationProgress()) => pilotInteract(progress, player(2510)).progress;
const openSeal = (progress = install()) => pilotInteract(progress, player(1035, 392)).progress;
const render = (props = {}) => renderToStaticMarkup(createElement(PilotExplorationMap, {
  progress: defaultExplorationProgress(), playerX: 0, playerY: 566, ...props,
}));

test("the optional loop targets the actual jungle mission and uses solid barriers", () => {
  assert.equal(PILOT_MISSION_ID, "jungle-vey");
  const platforms = pilotPlatforms(defaultExplorationProgress());
  assert.ok(platforms.every((entry) => entry.collision === "solid"));
  const hatch = platforms.find((entry) => entry.id === PILOT_HATCH_ID);
  assert.deepEqual(plain({ x: hatch.x, y: hatch.y, width: hatch.width, height: hatch.height }), plain(PILOT_HATCH));
  const wall = platforms.find((entry) => entry.id === "jungle-pilot-right-wall");
  assert.deepEqual(plain({ x: wall.x, y: wall.y, width: wall.width, height: wall.height }), plain(PILOT_RIGHT_WALL));
  assert.ok(platforms.every((entry) => entry.y + entry.height <= 416), "the 624px ground corridor retains 208px of headroom");
});

test("the ability is acquired only near the physical module and cannot be paid twice", () => {
  const original = defaultExplorationProgress();
  for (const rect of [player(100), player(2510, 392), player(2350), { ...player(2510), x: NaN }]) {
    assert.equal(pilotInteract(original, rect), null);
  }
  const result = pilotInteract(original, player(2510));
  assert.equal(result.changed, true);
  assert.equal(result.event, "ability");
  assert.deepEqual(plain(result.progress.abilityIds), ["aerial-boost"]);
  assert.deepEqual(plain(original), plain(defaultExplorationProgress()), "interaction is immutable");
  const repeated = pilotInteract(result.progress, player(2510));
  assert.equal(repeated.changed, false);
  assert.equal(repeated.event, null);
  assert.deepEqual(plain(repeated.progress), plain(result.progress));
});

test("the seal requires the ability and cannot be activated from the corridor below", () => {
  const locked = pilotInteract(defaultExplorationProgress(), player(1035, 392));
  assert.equal(locked.changed, false);
  assert.equal(locked.event, null);
  assert.equal(pilotInteract(install(), player(1080)), null);
  const opened = pilotInteract(install(), player(1035, 392));
  assert.equal(opened.event, "gate");
  assert.ok(opened.progress.openedGateIds.includes(PILOT_SEAL_ID));
  assert.ok(!pilotPlatforms(opened.progress).some((entry) => entry.id === PILOT_SEAL_ID));
  assert.ok(pilotPlatforms(opened.progress).some((entry) => entry.id === PILOT_HATCH_ID));
});

test("the clan cache grants one permanent +15 energy bonus, including after revisits and merges", () => {
  assert.equal(pilotInteract(openSeal(), player(1640)), null, "no collection through the ceiling");
  assert.equal(pilotInteract(install(), player(1640, 392)).changed, false, "opening the seal is required");
  const result = pilotInteract(openSeal(), player(1640, 392));
  assert.equal(result.event, "secret");
  assert.deepEqual(plain(result.progress.secretIds), [PILOT_SECRET_ID]);
  assert.equal(explorationBonuses(result.progress).maxEnergy, 15);
  const repeated = pilotInteract(result.progress, player(1640, 392));
  assert.equal(repeated.changed, false);
  assert.equal(repeated.event, null);
  assert.equal(explorationBonuses(mergeExplorationProgress(result.progress, repeated.progress, result.progress)).maxEnergy, 15);
});

test("the hatch opens from above only and creates a reversible free rope route", () => {
  const state = openSeal();
  for (const rect of [player(2024), { x: 2024, y: 416, width: 72, height: 116 }, { x: 2024, y: 380, width: 72, height: 116 }]) {
    assert.equal(pilotInteract(state, rect), null);
  }
  assert.equal(pilotInteract(install(), player(2024, 392)).changed, false);
  assert.equal(pilotClimbables(state).length, 0);
  const opened = pilotInteract(state, player(2024, 392));
  assert.equal(opened.event, "gate");
  assert.ok(opened.progress.openedGateIds.includes(PILOT_HATCH_ID));
  assert.ok(!pilotPlatforms(opened.progress).some((entry) => entry.id === PILOT_HATCH_ID));
  const [rope] = pilotClimbables(opened.progress);
  assert.equal(rope.staminaPerSecond, 0);
  assert.deepEqual(plain({ x: rope.x, y: rope.y, width: rope.width, height: rope.height }), plain(PILOT_ROPE));
  assert.ok(rope.y < 276 && rope.y + rope.height === 624, "rope extends above the gallery and reaches the ground");
  assert.equal(pilotInteract(opened.progress, player(2024, 392)).changed, false);
});

test("world application replaces bypass geometry without mutating the authored world and is idempotent", () => {
  const world = worldBlueprintFor(PILOT_MISSION_ID);
  const before = JSON.stringify(world);
  const applied = applyPilotWorld(world, defaultExplorationProgress());
  assert.equal(JSON.stringify(world), before);
  assert.equal(applied.width, world.width);
  assert.equal(applied.floorY, world.floorY);
  assert.equal(applied.hazards, world.hazards);
  assert.ok(!applied.platforms.some((entry) => entry.id === "j-root-01"));
  assert.ok(!applied.climbables.some((entry) => entry.x < 2240 && entry.x + entry.width > 400 && !entry.id.startsWith("jungle-pilot-")));
  assert.deepEqual(plain(applyPilotWorld(applied, defaultExplorationProgress())), plain(applied));
  const opened = pilotInteract(openSeal(), player(2024, 392)).progress;
  const rebuilt = applyPilotWorld(applied, opened);
  assert.equal(rebuilt.climbables.filter((entry) => entry.id === "jungle-pilot-return-rope").length, 1);
  assert.deepEqual(plain(applyPilotWorld(rebuilt, opened)), plain(rebuilt));
  assert.ok(rebuilt.platforms.some((entry) => entry.id === "jungle-pilot-right-wall"), "the right vine never bypasses the upper branch");
  const other = worldBlueprintFor("ice-cryostalker");
  assert.equal(applyPilotWorld(other, opened), other);
});

test("room discovery distinguishes vertically overlapping routes and retains backtracking", () => {
  const below = discoverPilotRooms(defaultExplorationProgress(), player(1640));
  assert.deepEqual(plain(below.discoveredRoomIds), ["jungle-pilot-underpass"]);
  const upper = discoverPilotRooms(below, player(1640, 392));
  assert.deepEqual(plain(upper.discoveredRoomIds), ["jungle-pilot-underpass", "jungle-pilot-archive"]);
  const back = discoverPilotRooms(upper, player(500));
  assert.equal(back.discoveredRoomIds.length, 3);
  assert.equal(pilotRoomAt(1676, 566).level, "lower");
  assert.equal(pilotRoomAt(1676, 334).level, "upper");
  assert.equal(pilotRoomAt(10000, 334), null);
  assert.equal(pilotRoomAt(NaN, 334), null);
  assert.deepEqual(plain(discoverPilotRooms(back, { ...player(500), height: -1 })), plain(back));
});

test("interaction hints respect the floor and never hard-code a remappable key", () => {
  assert.match(pilotHint(defaultExplorationProgress(), player(2510)), /Installer/);
  assert.equal(pilotHint(openSeal(), player(1640)), null);
  assert.equal(pilotHint(openSeal(), { ...player(1640), x: Infinity }), null);
  for (const [state, rect] of [[install(), player(2510)], [install(), player(500)], [openSeal(), player(1640, 392)], [openSeal(), player(2024, 392)]]) {
    assert.doesNotMatch(pilotHint(state, rect), /\bE\b|\bF\b|Entrée|Espace/);
  }
});

test("SSR map masks all unknown names and connections, including accessible content", () => {
  const html = render();
  for (const room of PILOT_ROOMS) assert.ok(!html.includes(room.label), `hidden name ${room.label}`);
  assert.ok(!html.includes(PILOT_SEAL_ID));
  assert.ok(!html.includes(PILOT_SECRET_ID));
  assert.equal((html.match(/Salle inconnue/g) ?? []).length, 6);
  assert.equal((html.match(/data-pilot-connection=/g) ?? []).length, 0);
  assert.ok(!html.includes("data-pilot-player"));
  assert.doesNotMatch(html, /<button|<a |tabindex=/);
});

test("SSR map reveals the current room at the right level, preserving unknown branches", () => {
  const lower = render({ playerX: 1676, playerY: 566 });
  assert.ok(lower.includes("Passage inférieur"));
  assert.ok(!lower.includes("Archives du clan"));
  assert.ok(lower.includes('data-pilot-player="lower"'));
  assert.ok(lower.includes("1/6 salles"));
  const upper = render({ playerX: 1676, playerY: 334 });
  assert.ok(upper.includes("Archives du clan"));
  assert.ok(!upper.includes("Passage inférieur"));
  assert.ok(upper.includes('data-pilot-player="upper"'));
  assert.ok(upper.includes('aria-current="location"'));
});

test("SSR map displays unlocked gates and a return rope without creating map interactions", () => {
  const opened = pilotInteract(openSeal(), player(2024, 392)).progress;
  const state = mergeExplorationProgress(opened, { discoveredRoomIds: PILOT_ROOMS.map((room) => room.id) });
  const html = render({ progress: state, playerX: 2060, playerY: 334 });
  assert.ok(html.includes("6/6 salles"));
  assert.ok(html.includes("Sceau ouvert"));
  assert.ok(html.includes("corde disponible"));
  assert.equal((html.match(/data-pilot-connection=/g) ?? []).length, 6);
  assert.ok(html.includes('viewBox="0 0 720 160"'));
  assert.doesNotMatch(html, /<button|<a |tabindex=/);
});
