import assert from "node:assert/strict";
import { test } from "node:test";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import { build } from "esbuild";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

const bundle = await build({
  stdin: {
    contents: 'export * from "./app/game/systems/explorationMap"; export * from "./app/game/ExplorationMap"; export { WORLD_SCREENS_BY_MISSION } from "./app/game/worldScreens";',
    resolveDir: process.cwd(), loader: "ts",
  },
  bundle: true, write: false, platform: "node", format: "cjs", jsx: "automatic",
  external: ["react", "react-dom"],
});
const compiled = { exports: {} };
runInNewContext(bundle.outputFiles[0].text, { module: compiled, exports: compiled.exports, require: createRequire(import.meta.url) });
const { normalizeVisitedScreenIds, discoverWorldScreen, explorationMapSnapshot, ExplorationMap, WORLD_SCREENS_BY_MISSION } = compiled.exports;
const plain = (value) => JSON.parse(JSON.stringify(value));
const missionId = "jungle-vey";
const layout = WORLD_SCREENS_BY_MISSION[missionId];
const render = (props) => renderToStaticMarkup(createElement(ExplorationMap, { missionId, playerX: 150, visitedScreenIds: [], ...props }));

test("saved discovery filters foreign, duplicate and malformed sector ids", () => {
  assert.deepEqual(plain(normalizeVisitedScreenIds(missionId, [layout.screens[2].id, "ice-entry", null, layout.screens[0].id, layout.screens[2].id])), [layout.screens[0].id, layout.screens[2].id]);
  for (const value of [null, {}, "jungle-lisiere", 23]) {
    assert.deepEqual(plain(normalizeVisitedScreenIds(missionId, value)), []);
  }
});

test("discovery follows actual room boundaries and clamps overscan", () => {
  const boundary = layout.screens[0].endX;
  assert.deepEqual(plain(discoverWorldScreen(missionId, [], boundary - 0.1)), [layout.screens[0].id]);
  assert.deepEqual(plain(discoverWorldScreen(missionId, [], boundary)), [layout.screens[1].id]);
  assert.deepEqual(plain(discoverWorldScreen(missionId, [], 100000)), [layout.screens.at(-1).id]);
  assert.deepEqual(plain(discoverWorldScreen(missionId, [], NaN)), [layout.screens[0].id]);
});

test("backtracking preserves discovery without inferring unvisited intermediate rooms", () => {
  const ids = [layout.screens[4].id];
  const before = [...ids];
  const discovered = discoverWorldScreen(missionId, ids, 0);
  assert.deepEqual(plain(discovered), [layout.screens[0].id, layout.screens[4].id]);
  assert.deepEqual(ids, before);
  assert.equal(explorationMapSnapshot(missionId, 0, discovered).visitedCount, 2);
});

test("map hides unreached names and reveals only actual connected frontiers", () => {
  const snapshot = explorationMapSnapshot(missionId, 150, []);
  assert.equal(snapshot.visitedCount, 1);
  assert.equal(snapshot.percent, 17);
  assert.equal(snapshot.rooms[0].label, layout.screens[0].label);
  assert.ok(snapshot.rooms.slice(1).every((room) => room.label === null));
  assert.deepEqual(plain(snapshot.connections.map((edge) => edge.id)), [layout.connections[0].id]);
  assert.equal(snapshot.connections[0].explored, false);
});

test("all mission maps preserve authored spans, connections and full completion", () => {
  for (const entry of Object.values(WORLD_SCREENS_BY_MISSION)) {
    const snapshot = explorationMapSnapshot(entry.missionId, entry.worldWidth, entry.screens.map((screen) => screen.id));
    assert.equal(snapshot.percent, 100);
    assert.equal(snapshot.visitedCount, entry.screens.length);
    assert.equal(snapshot.playerRatio, 1);
    assert.equal(snapshot.currentScreenId, entry.screens.at(-1).id);
    assert.deepEqual(plain(snapshot.connections.map((edge) => edge.id)), plain(entry.connections.map((edge) => edge.id)));
    assert.ok(snapshot.connections.every((edge) => edge.explored));
    assert.equal(snapshot.rooms[0].startRatio, 0);
    assert.equal(snapshot.rooms.at(-1).endRatio, 1);
  }
});

test("the rendered pause map is accessible and does not leak unexplored labels", () => {
  const html = render({ objectiveLabel: "Reprendre le transpondeur" });
  assert.match(html, /Carte de chasse/);
  assert.match(html, /<progress aria-label="Secteurs explorés" value="1" max="6"/);
  assert.match(html, /aria-current="location"/);
  assert.match(html, /Objectif actif/);
  assert.match(html, /Reprendre le transpondeur/);
  assert.equal((html.match(/Secteur inexploré/g) ?? []).length, 5);
  for (const screen of layout.screens.slice(1)) assert.ok(!html.includes(screen.label));
  assert.doesNotMatch(html, /<button|<a /, "read-only map must not compete with pause controls");
});

test("legacy empty discovery still shows the saved current room after resume", () => {
  const screen = layout.screens[3];
  const html = render({ playerX: screen.startX + 30 });
  assert.ok(html.includes(screen.label));
  assert.equal((html.match(/Secteur inexploré/g) ?? []).length, 5);
  assert.ok(!html.includes(layout.screens[0].label));
});
