import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { after, test } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "vite";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputDirectory = await mkdtemp(join(tmpdir(), "yautja-planets-v8-"));

await build({
  configFile: false,
  publicDir: false,
  logLevel: "silent",
  build: {
    emptyOutDir: true,
    outDir: outputDirectory,
    ssr: resolve(projectRoot, "tests/fixtures/planet-expansion-entry.ts"),
    rollupOptions: { output: { entryFileNames: "planet-expansion.mjs" } },
  },
});

const game = await import(
  pathToFileURL(join(outputDirectory, "planet-expansion.mjs")).href
);

after(async () => {
  await rm(outputDirectory, { force: true, recursive: true });
});

const expectedIds = [
  "jungle-vey",
  "ice-cryostalker",
  "volcano-bad-blood",
  "swamp-hydra",
  "desert-sandmaw",
  "ocean-leviathan",
  "fungal-hivemind",
  "ruins-ancient-guardian",
];

const expansionBiomeMatrix = {
  "swamp-hydra": {
    surfaces: ["mud", "soil", "water"],
    platforms: ["metal", "root", "stone"],
    hazards: ["deep-mud", "predatory-flora", "tidal-surge"],
    screenHazard: "tidal-surge",
  },
  "desert-sandmaw": {
    surfaces: ["sand", "stone"],
    platforms: ["ruin", "sand", "stone"],
    hazards: ["glass-storm", "heat-burst", "sand-collapse"],
    screenHazard: "sand-collapse",
  },
  "ocean-leviathan": {
    surfaces: ["coral", "water"],
    platforms: ["coral", "metal", "stone"],
    hazards: ["abyssal-vent", "electrical-surge", "rogue-wave"],
    screenHazard: "rogue-wave",
  },
  "fungal-hivemind": {
    surfaces: ["mud", "mycelium", "water"],
    platforms: ["metal", "mycelium", "stone"],
    hazards: ["acid-bloom", "mycelial-snare", "spore-cloud"],
    screenHazard: "spore-cloud",
  },
  "ruins-ancient-guardian": {
    surfaces: ["obsidian", "ruin"],
    platforms: ["obsidian", "ruin"],
    hazards: ["gravity-pulse", "laser-grid", "nanite-field"],
    screenHazard: "gravity-pulse",
  },
};

test("the long hunt exposes eight ordered planets with a valid unlock chain", () => {
  assert.deepEqual(game.MISSIONS.map(({ id }) => id), expectedIds);
  assert.equal(new Set(game.MISSIONS.map(({ planetName }) => planetName)).size, 8);
  assert.equal(new Set(game.MISSIONS.map(({ biome }) => biome)).size, 8);

  game.MISSIONS.forEach((mission, index) => {
    assert.equal(mission.order, index + 1);
    assert.equal(
      mission.prerequisiteMissionId,
      index === 0 ? null : game.MISSIONS[index - 1].id,
    );
    assert.ok(mission.objectives.length >= 4);
    assert.ok(mission.enemyWaves.length >= 3);
    assert.ok(mission.boss.attacks.length >= 3);
    assert.equal(mission.boss.phases.length, 3);
  });
});

test("expanded galaxy keeps each of the eight playable hunts exactly once", () => {
  const planets = game.GALAXY_NAVIGATION.systems.flatMap(
    (system) => system.planets,
  );
  const missionIds = planets.flatMap((planet) =>
    planet.missions.map(({ id }) => id),
  );
  assert.equal(game.GALAXY_NAVIGATION.missionCount, 8);
  assert.equal(planets.length, 24);
  assert.deepEqual(missionIds, expectedIds);
});

test("all eight missions own connected rooms, playable geometry and loadable art", () => {
  for (const mission of game.MISSIONS) {
    const screens = game.WORLD_SCREENS_BY_MISSION[mission.id];
    const blueprint = game.WORLD_BLUEPRINTS_BY_MISSION[mission.id];
    assert.equal(screens.biome, mission.biome);
    assert.equal(screens.screens.length, 6);
    assert.deepEqual(game.validateWorldScreens(screens), []);
    assert.equal(blueprint.missionId, mission.id);
    assert.equal(blueprint.biome, mission.biome);
    assert.equal(blueprint.width, 8_400);
    assert.deepEqual(game.validateWorldBlueprint(blueprint), []);
    assert.ok(blueprint.platforms.length >= 12);
    assert.ok(blueprint.climbables.length >= 6);
    const background = game.BIOME_BACKGROUND_PATHS[mission.biome];
    assert.ok(background.startsWith("/game/backgrounds/"));
    assert.ok(
      existsSync(resolve(projectRoot, "public", background.slice(1))),
      `${mission.id}: missing ${background}`,
    );
  }
});

test("expansion blueprints obey an exact endemic surface and hazard matrix", () => {
  const inheritedSurfaceMaterials = new Set(["ash", "basalt", "ice", "snow"]);
  const inheritedHazards = new Set([
    "ash-squall",
    "falling-ice",
    "lava",
    "steam-vent",
    "thin-ice",
    "whiteout",
  ]);

  for (const [missionId, expected] of Object.entries(expansionBiomeMatrix)) {
    const blueprint = game.WORLD_BLUEPRINTS_BY_MISSION[missionId];
    const screens = game.WORLD_SCREENS_BY_MISSION[missionId];
    const surfaces = [...new Set(blueprint.surfaces.map(({ material }) => material))].sort();
    const platforms = [...new Set(blueprint.platforms.map(({ material }) => material))].sort();
    const hazards = [...new Set(blueprint.hazards.map(({ kind }) => kind))].sort();
    const screenHazards = [
      ...new Set(
        screens.screens.flatMap((screen) =>
          screen.features
            .filter(({ role }) => role === "hazard")
            .map(({ kind }) => kind),
        ),
      ),
    ];

    assert.deepEqual(surfaces, expected.surfaces, `${missionId}: surfaces`);
    assert.deepEqual(platforms, expected.platforms, `${missionId}: platforms`);
    assert.deepEqual(hazards, expected.hazards, `${missionId}: hazards`);
    assert.deepEqual(screenHazards, [expected.screenHazard], `${missionId}: room hazard`);
    assert.equal(
      blueprint.climbables.some(({ kind }) =>
        kind === "ice-wall" || kind === "basalt-column"
      ),
      false,
      `${missionId}: inherited climbable`,
    );
    assert.equal(
      [...surfaces, ...platforms].some((material) =>
        inheritedSurfaceMaterials.has(material),
      ),
      false,
      `${missionId}: inherited surface material`,
    );
    assert.equal(
      hazards.some((kind) => inheritedHazards.has(kind)),
      false,
      `${missionId}: inherited hazard`,
    );
  }
});

test("fresh and legacy saves receive all planet progress slots safely", () => {
  const fresh = game.defaultSave("2026-07-22T00:00:00.000Z");
  assert.deepEqual(Object.keys(fresh.missionProgress), expectedIds);
  assert.equal(fresh.missionProgress["jungle-vey"].status, "available");
  assert.equal(fresh.missionProgress["swamp-hydra"].status, "locked");

  const legacy = game.normalizeSave({
    ...fresh,
    missionProgress: {
      "jungle-vey": { ...fresh.missionProgress["jungle-vey"], completions: 1 },
      "ice-cryostalker": fresh.missionProgress["ice-cryostalker"],
      "volcano-bad-blood": fresh.missionProgress["volcano-bad-blood"],
    },
  });
  assert.deepEqual(Object.keys(legacy.missionProgress), expectedIds);
  assert.equal(legacy.missionProgress["ice-cryostalker"].status, "available");
  assert.equal(legacy.missionProgress["swamp-hydra"].status, "locked");
});

test("the expanded campaign completes on Acheron while the Bad Blood rite remains an intermediate hunt", () => {
  const resultFor = (missionId) => {
    const mission = game.MISSIONS.find(({ id }) => id === missionId);
    assert.ok(mission);
    return {
      missionId,
      difficultyId: "hunter",
      outcome: "success",
      score: 80,
      elapsedSeconds: 600,
      completedObjectiveIds: mission.objectives
        .filter(({ required, kind }) => required || kind === "extract")
        .map(({ id }) => id),
      honorEvents: [],
      trophyQuality: "elite",
      trophyClaims: [
        {
          id: `${missionId}-apex-test`,
          definitionId: mission.trophy.id,
          targetName: mission.targetName,
          targetKind: mission.targetKind,
          partId: mission.trophy.partId,
          condition: "intact",
          quality: "elite",
        },
      ],
      kills: 1,
      scans: 1,
      secondWindUsed: false,
      completedAt: "2026-07-22T00:00:00.000Z",
    };
  };
  let coreArc = game.defaultSave("2026-07-22T00:00:00.000Z");
  for (const missionId of expectedIds.slice(0, 3)) {
    coreArc = game.applyMissionResult(coreArc, resultFor(missionId));
  }
  assert.equal(coreArc.storyCompleted, false);
  assert.equal(coreArc.missionProgress["swamp-hydra"].status, "available");

  let finale = coreArc;
  for (const missionId of expectedIds.slice(3)) {
    finale = game.applyMissionResult(finale, resultFor(missionId));
  }
  assert.equal(finale.storyCompleted, true);
});
