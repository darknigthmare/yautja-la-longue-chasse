import assert from "node:assert/strict";
import { test } from "node:test";
import { build } from "esbuild";

const compiled = await build({
  entryPoints: ["app/game/systems/pitArenaCatalogue.ts"],
  bundle: true,
  write: false,
  format: "esm",
  platform: "node",
  logLevel: "silent",
});
const catalogue = await import(
  "data:text/javascript;base64," + Buffer.from(compiled.outputFiles[0].text).toString("base64")
);

test("the recovered conversation contract contains exactly 100 uniquely named arena designs", () => {
  assert.equal(catalogue.PIT_ARENA_CATALOGUE.length, 100);
  assert.equal(new Set(catalogue.PIT_ARENA_CATALOGUE.map(({ id }) => id)).size, 100);
  assert.equal(new Set(catalogue.PIT_ARENA_CATALOGUE.map(({ name }) => name)).size, 100);
  assert.deepEqual(
    catalogue.PIT_ARENA_CATALOGUE_WAVES.map(({ count }) => count),
    [20, 30, 10, 20, 20],
  );
  assert.equal(catalogue.PIT_ARENA_CATALOGUE_SUMMARY.total, 100);
});

test("only the real eight runtime arenas are marked playable", () => {
  const playable = catalogue.PIT_ARENA_CATALOGUE.filter(({ runtimeStatus }) => runtimeStatus === "playable");
  const concepts = catalogue.PIT_ARENA_CATALOGUE.filter(({ runtimeStatus }) => runtimeStatus === "concept");
  assert.equal(playable.length, 8);
  assert.equal(concepts.length, 92);
  assert(playable.every(({ runtimeArenaId, runtimeVisualPlanes }) => runtimeArenaId && runtimeVisualPlanes === 6));
  assert(concepts.every(({ runtimeArenaId, runtimeVisualPlanes }) => runtimeArenaId === null && runtimeVisualPlanes === 0));
  assert.equal(catalogue.PIT_ARENA_CATALOGUE_SUMMARY.playable, 8);
  assert.equal(catalogue.PIT_ARENA_CATALOGUE_SUMMARY.concept, 92);
});

test("all arena designs carry the six-plane, fair-transition and competitive-hazard contracts", () => {
  for (const arena of catalogue.PIT_ARENA_CATALOGUE) {
    assert.equal(arena.authoredTargetPlanes, 6, arena.name);
    assert.deepEqual(arena.layers.map(({ id }) => id), ["P0", "P1", "P2", "P3", "P4", "P5"]);
    assert(arena.layers.every((layer, index) => index === 0 || layer.parallax > arena.layers[index - 1].parallax));
    assert.equal(arena.transitionPolicy.carriesBothFighters, true);
    assert.equal(arena.transitionPolicy.trigger, "confirmed-rupture-or-throw");
    assert.equal(arena.transitionPolicy.blockedHitCanTrigger, false);
    assert.equal(arena.hazardPolicy.competitive, "neutral");
  }
});

test("heritage entries remain composition studies requiring original project art", () => {
  const heritage = catalogue.PIT_ARENA_CATALOGUE.filter(({ wave }) => wave === "heritage-study");
  assert.equal(heritage.length, 10);
  assert(heritage.every(({ referenceStudy }) => typeof referenceStudy === "string" && referenceStudy.length > 0));
  assert(heritage.every(({ rightsNote }) => rightsNote === "composition-study-original-art-required"));
  assert(heritage.every(({ runtimeStatus }) => runtimeStatus === "concept"));
  assert.match(catalogue.getPitArenaCatalogueEntry(51).name, /Jaguar/);
  assert.match(catalogue.getPitArenaCatalogueEntry(60).name, /Isolation/);
  assert.equal(catalogue.getPitArenaCatalogueEntry(0), null);
  assert.equal(catalogue.getPitArenaCatalogueEntry(101), null);
});


test("the first catalogue entry uses the same name and location as the playable orbital ring", async () => {
  const runtime = await build({ entryPoints: ["app/game/systems/pitCombat.ts"], bundle: true,
    write: false, format: "esm", platform: "node", logLevel: "silent" });
  const { PIT_ARENAS } = await import("data:text/javascript;base64," + Buffer.from(runtime.outputFiles[0].text).toString("base64"));
  const entry = catalogue.getPitArenaCatalogueEntry(1);
  assert.equal(entry.runtimeArenaId, "the-pit");
  assert.equal(entry.name, PIT_ARENAS["the-pit"].name);
  assert.equal(entry.setting, PIT_ARENAS["the-pit"].setting);
  assert.match(entry.name, /basalte/);
  assert.match(entry.setting, /Cinder.*annexe orbitale/);
});
