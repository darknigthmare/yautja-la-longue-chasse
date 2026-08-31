import assert from "node:assert/strict";
import { test } from "node:test";
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import { build } from "esbuild";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
const bundle = await build({
  stdin: { contents: 'export * from "./app/game/systems/iceExplorationRegion"; export * from "./app/game/systems/explorationProgress"; export * from "./app/game/IceExplorationMap"; export * from "./app/game/iceExplorationRendering"; export {worldBlueprintFor} from "./app/game/systems/worldBlueprints";', resolveDir: process.cwd(), loader: "ts" },
  bundle: true, write: false, platform: "node", format: "cjs", jsx: "automatic", external: ["react", "react-dom"],
});
const compiled = { exports: {} };
runInNewContext(bundle.outputFiles[0].text, { module: compiled, exports: compiled.exports, require: createRequire(import.meta.url) });
const { ICE_MISSION_ID, ICE_ROOMS, ICE_RELAY_ID, ICE_HATCH_ID, ICE_SECRET_ID, ICE_RELAY_FLOOR_Y, ICE_REGION_TEXTURE_PATHS,
  defaultExplorationProgress, mergeExplorationProgress, explorationBonuses, iceInteract, iceHint,
  iceRegionPlatforms, iceRegionClimbables, applyIceExplorationWorld, discoverIceRooms, iceRoomAt, IceExplorationMap, worldBlueprintFor } = compiled.exports;
const plain = value => JSON.parse(JSON.stringify(value));
const body = (x, floor = 624) => ({ x, y: floor - 116, width: 72, height: 116 });
const boosted = () => mergeExplorationProgress(defaultExplorationProgress(), { abilityIds: ["aerial-boost"], secretIds: ["jungle-clan-cache"] });
const power = () => iceInteract(boosted(), body(984, ICE_RELAY_FLOOR_Y)).progress;
const render = (props = {}) => renderToStaticMarkup(createElement(IceExplorationMap, { progress: defaultExplorationProgress(), playerX: 0, playerY: 566, ...props }));

test("relay requires the jungle ability and upper physical contact, never granting a new ability", () => {
  const locked = iceInteract(defaultExplorationProgress(), body(984, ICE_RELAY_FLOOR_Y));
  assert.equal(locked.changed, false);
  assert.equal(locked.event, null);
  for (const rect of [body(984), body(984, 512), body(2000, ICE_RELAY_FLOOR_Y), { ...body(984), x: Infinity }]) assert.equal(iceInteract(boosted(), rect), null);
  const initial = boosted();
  const result = iceInteract(initial, body(984, ICE_RELAY_FLOOR_Y));
  assert.equal(result.changed, true);
  assert.equal(result.event, "gate");
  assert.ok(result.progress.openedGateIds.includes(ICE_RELAY_ID));
  assert.deepEqual(plain(initial.openedGateIds), []);
  assert.deepEqual(plain(result.progress.abilityIds), ["aerial-boost"]);
  assert.equal(iceInteract(result.progress, body(984, ICE_RELAY_FLOOR_Y)).changed, false);
});

test("the ice cache is spatially gated and adds only its own permanent +15 bonus", () => {
  assert.equal(iceInteract(power(), body(1220)), null);
  assert.equal(iceInteract(boosted(), body(1220, 392)).changed, false);
  const result = iceInteract(power(), body(1220, 392));
  assert.equal(result.event, "secret");
  assert.deepEqual(plain(result.progress.secretIds), ["jungle-clan-cache", ICE_SECRET_ID]);
  assert.equal(explorationBonuses(result.progress).maxEnergy, 30);
  const repeat = iceInteract(result.progress, body(1220, 392));
  assert.equal(repeat.changed, false);
  assert.equal(repeat.event, null);
  assert.equal(explorationBonuses(mergeExplorationProgress(result.progress, repeat.progress)).maxEnergy, 30);
});

test("hatch cannot be activated from below and deploys a permanent free return ladder", () => {
  const state = power();
  for (const rect of [body(1334), { x: 1334, y: 416, width: 72, height: 116 }, { x: 1334, y: 380, width: 72, height: 116 }]) assert.equal(iceInteract(state, rect), null);
  assert.equal(iceRegionClimbables(state).length, 0);
  const result = iceInteract(state, body(1334, 392));
  assert.equal(result.event, "gate");
  assert.ok(result.progress.openedGateIds.includes(ICE_HATCH_ID));
  assert.ok(!iceRegionPlatforms(result.progress).some(p => p.id === ICE_HATCH_ID));
  const [ladder] = iceRegionClimbables(result.progress);
  assert.equal(ladder.kind, "ladder");
  assert.equal(ladder.staminaPerSecond, 0);
  assert.equal(ladder.y + ladder.height, 624);
  assert.ok(ladder.y < 276);
  assert.equal(iceInteract(result.progress, body(1334, 392)).changed, false);
});

test("world rebuilding removes old bypasses, preserves the campaign and is idempotent", () => {
  assert.equal(ICE_MISSION_ID, "ice-cryostalker");
  const world = worldBlueprintFor(ICE_MISSION_ID);
  const original = JSON.stringify(world);
  const first = applyIceExplorationWorld(world, boosted());
  assert.equal(JSON.stringify(world), original);
  assert.ok(!first.platforms.some(p => ["i-shelf-01", "i-shelf-02", "feature-i-landing-shelf"].includes(p.id)));
  assert.ok(!first.climbables.some(p => ["i-wall-west", "feature-i-landing-wall"].includes(p.id)));
  assert.equal(first.hazards, world.hazards);
  assert.equal(first.bossArena, world.bossArena);
  assert.equal(first.spawn, world.spawn);
  assert.equal(first.floorY, 624);
  assert.deepEqual(plain(applyIceExplorationWorld(first, boosted())), plain(first));
  const unlocked = iceInteract(power(), body(1334, 392)).progress;
  const second = applyIceExplorationWorld(first, unlocked);
  assert.deepEqual(plain(applyIceExplorationWorld(second, unlocked)), plain(second));
  assert.equal(second.climbables.filter(p => p.id === "ice-region-return-ladder").length, 1);
  const jungle = worldBlueprintFor("jungle-vey");
  assert.equal(applyIceExplorationWorld(jungle, unlocked), jungle);
});

test("discovery follows body centres and does not reveal the vault through the floor", () => {
  const below = discoverIceRooms(defaultExplorationProgress(), body(1220));
  assert.deepEqual(plain(below.discoveredRoomIds), []);
  const shaft = discoverIceRooms(below, body(790));
  const vault = discoverIceRooms(shaft, body(1220, 392));
  assert.deepEqual(plain(vault.discoveredRoomIds), ["ice-region-shaft", "ice-region-vault"]);
  assert.equal(iceRoomAt(1256, 334).id, "ice-region-vault");
  assert.equal(iceRoomAt(1256, 566), null);
  assert.equal(iceRoomAt(NaN, 334), null);
  assert.deepEqual(plain(discoverIceRooms(vault, { ...body(790), width: -1 })), plain(vault));
  assert.doesNotMatch(iceHint(boosted(), body(620, 512)), /\bE\b|Entrée|Espace/);
});

test("SSR map masks unknown labels, including accessible content, and exposes no traversal action", () => {
  const html = render();
  for (const room of ICE_ROOMS) assert.ok(!html.includes(room.label));
  assert.equal((html.match(/Salle inconnue/g) ?? []).length, 5);
  assert.equal((html.match(/data-ice-connection=/g) ?? []).length, 0);
  assert.ok(!html.includes(ICE_SECRET_ID));
  assert.ok(!html.includes("data-ice-player"));
  assert.doesNotMatch(html, /<button|<a |tabindex=/);
});

test("SSR map separates relay and vault levels and displays the permanent return connection", () => {
  const relay = render({ playerX: 1030, playerY: ICE_RELAY_FLOOR_Y - 58 });
  assert.ok(relay.includes("Relais supérieur"));
  assert.ok(!relay.includes("Chambre du clan"));
  assert.ok(relay.includes('data-ice-player="2"'));
  assert.ok(relay.includes("1/5 salles"));
  const opened = iceInteract(power(), body(1334, 392)).progress;
  const state = mergeExplorationProgress(opened, { discoveredRoomIds: ICE_ROOMS.map(room => room.id) });
  const html = render({ progress: state, playerX: 1260, playerY: 334 });
  assert.ok(html.includes("5/5 salles"));
  assert.ok(html.includes("pont déployé"));
  assert.ok(html.includes("Échelle ouverte dans les deux sens"));
  assert.ok(html.includes('data-ice-player="3"'));
  assert.equal((html.match(/data-ice-connection=/g) ?? []).length, 5);
  assert.ok(html.includes('aria-current="location"'));
  for (const path of Object.values(ICE_REGION_TEXTURE_PATHS)) assert.ok(existsSync(`public${path}`), path);
});
