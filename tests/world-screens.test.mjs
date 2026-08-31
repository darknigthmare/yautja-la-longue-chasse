import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { after, test } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "vite";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputDirectory = await mkdtemp(join(tmpdir(), "yautja-world-screens-"));

await build({
  configFile: false,
  publicDir: false,
  logLevel: "silent",
  build: {
    emptyOutDir: true,
    outDir: outputDirectory,
    ssr: resolve(projectRoot, "app/game/worldScreens.ts"),
    rollupOptions: { output: { entryFileNames: "world-screens.mjs" } },
  },
});

const world = await import(
  pathToFileURL(join(outputDirectory, "world-screens.mjs")).href
);

after(async () => {
  await rm(outputDirectory, { force: true, recursive: true });
});

test("each mission has six connected screens covering the expanded 8,400 px world", () => {
  assert.deepEqual(Object.keys(world.WORLD_SCREENS_BY_MISSION), [
    "jungle-vey",
    "ice-cryostalker",
    "volcano-bad-blood",
    "swamp-hydra",
    "desert-sandmaw",
    "ocean-leviathan",
    "fungal-hivemind",
    "ruins-ancient-guardian",
  ]);

  for (const layout of Object.values(world.WORLD_SCREENS_BY_MISSION)) {
    assert.equal(layout.worldWidth, world.WORLD_SCREEN_WORLD_WIDTH);
    assert.equal(layout.screens.length, 6);
    assert.equal(layout.connections.length, 5);
    assert.deepEqual(world.validateWorldScreens(layout), []);
    assert.equal(layout.screens[0].startX, 0);
    assert.equal(layout.worldWidth, 8_400);
    assert.equal(layout.screens.at(-1).endX, 8_400);
    assert.ok(
      layout.screens.every((screen) => screen.endX - screen.startX >= 1_300),
      `${layout.missionId} still contains a short legacy-sized sector`,
    );

    for (let index = 1; index < layout.screens.length; index += 1) {
      assert.equal(layout.screens[index - 1].endX, layout.screens[index].startX);
    }
  }
});

test("room lookup clamps overscan and assigns exact boundaries to the next room", () => {
  const layout = world.WORLD_SCREENS_BY_MISSION["jungle-vey"];
  const firstBoundary = layout.screens[0].endX;
  assert.equal(world.getWorldScreenAtX(layout, -50).id, "jungle-lisiere");
  assert.equal(world.getWorldScreenAtX(layout, Number.NaN).id, "jungle-lisiere");
  assert.equal(world.getWorldScreenAtX("jungle-vey", firstBoundary - 0.01).id, "jungle-lisiere");
  assert.equal(world.getWorldScreenAtX("jungle-vey", firstBoundary).id, "jungle-canopy");
  assert.equal(world.getWorldScreenAtX(layout, 8_400).id, "jungle-arena");
  assert.equal(world.getWorldScreenAtX(layout, 99_999).id, "jungle-arena");
});

test("every room specifies background, foreground, traversal and narrative direction", () => {
  for (const layout of Object.values(world.WORLD_SCREENS_BY_MISSION)) {
    for (const screen of layout.screens) {
      assert.ok(screen.layers.background.assetPath.startsWith("/game/"));
      assert.ok(screen.layers.background.motifs.length >= 3);
      assert.ok(screen.layers.foreground.motifs.length >= 3);
      assert.ok(screen.features.some((item) => item.role === "platform"));
      assert.ok(screen.mood.length > 20);
      assert.ok(screen.objectiveCue.length > 20);
    }
  }
});

test("biome traversal remains specific instead of reusing a generic corridor", () => {
  const featureKinds = (missionId) =>
    new Set(
      world.WORLD_SCREENS_BY_MISSION[missionId].screens.flatMap((screen) =>
        screen.features.map((item) => item.kind),
      ),
    );

  const jungle = featureKinds("jungle-vey");
  assert.ok(jungle.has("tree"));
  assert.ok(jungle.has("vine"));
  assert.ok(jungle.has("water"));
  assert.equal(
    world.WORLD_SCREENS_BY_MISSION["jungle-vey"].screens.every(
      (screen) =>
        screen.layers.background.assetPath ===
        "/game/backgrounds/jungle-multiscreen-v6.png",
    ),
    true,
  );

  const ice = featureKinds("ice-cryostalker");
  assert.ok(ice.has("ice-wall"));
  assert.ok(ice.has("thin-ice"));
  assert.ok(ice.has("metal-gantry"));

  const volcano = featureKinds("volcano-bad-blood");
  assert.ok(volcano.has("lava"));
  assert.ok(volcano.has("steam-vent"));
  assert.ok(volcano.has("chain"));
});

test("validator reports gaps, invalid boundaries and disconnected graphs", () => {
  const valid = world.WORLD_SCREENS_BY_MISSION["ice-cryostalker"];
  const brokenScreens = valid.screens.map((screen, index) =>
    index === 2 ? { ...screen, startX: screen.startX + 8 } : screen,
  );
  const broken = {
    ...valid,
    screens: brokenScreens,
    connections: valid.connections.slice(0, -1),
  };
  const errors = world.validateWorldScreens(broken);
  assert.ok(errors.some((message) => message.includes("gap or overlap")));
  assert.ok(errors.some((message) => message.includes("shared boundary")));
  assert.ok(errors.some((message) => message.includes("disconnected")));
});


test("non-finite room anchors, boundaries and layer motion fail validation", () => {
  for (const value of [NaN, Infinity, -Infinity]) {
    const broken = structuredClone(world.worldScreensFor("jungle-vey"));
    broken.screens[0].features[0].x = value;
    broken.screens[1].startX = value;
    broken.screens[0].layers.background.parallax = value;
    const errors = world.validateWorldScreens(broken);
    assert.ok(errors.some((error) => error.includes("non-finite anchor")));
    assert.ok(errors.some((error) => error.includes("non-finite screen bounds")));
    assert.ok(errors.some((error) => error.includes("invalid layer parallax")));
  }
});

test("feature identity remains unique across the whole mission", () => {
  const broken = structuredClone(world.worldScreensFor("ice-cryostalker"));
  broken.screens[1].features[0].id = broken.screens[0].features[0].id;
  assert.ok(world.validateWorldScreens(broken).some((error) => error.includes("duplicate feature id")));
});

test("renaming a reverse connection cannot hide a duplicated physical passage", () => {
  const broken = structuredClone(world.worldScreensFor("volcano-bad-blood"));
  const connection = broken.connections[0];
  broken.connections.push({
    ...connection, id: "different-id-for-same-edge",
    fromScreenId: connection.toScreenId, toScreenId: connection.fromScreenId,
  });
  assert.ok(world.validateWorldScreens(broken).some((error) => error.includes("duplicate screen edge")));
});
