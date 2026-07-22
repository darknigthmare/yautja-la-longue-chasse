import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { after, test } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "vite";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputDirectory = await mkdtemp(
  join(tmpdir(), "yautja-galaxy-navigation-"),
);

await build({
  configFile: false,
  publicDir: false,
  logLevel: "silent",
  build: {
    emptyOutDir: true,
    outDir: outputDirectory,
    ssr: resolve(projectRoot, "app/game/galaxyNavigation.ts"),
    rollupOptions: {
      output: { entryFileNames: "galaxy-navigation.mjs" },
    },
  },
});

const {
  GALAXY_BIOME_LABELS,
  GALAXY_NAVIGATION,
  createGalaxyNavigationState,
  findGalaxyMission,
  getGalaxyNavigationBreadcrumbs,
  getGalaxyNavigationItems,
  reduceGalaxyNavigation,
} = await import(
  pathToFileURL(join(outputDirectory, "galaxy-navigation.mjs")).href
);

after(async () => {
  await rm(outputDirectory, { force: true, recursive: true });
});

test("galaxy tree derives every mission once through system and planet levels", () => {
  const missionIds = GALAXY_NAVIGATION.systems.flatMap((system) =>
    system.planets.flatMap((planet) =>
      planet.missions.map((mission) => mission.id),
    ),
  );

  assert.equal(missionIds.length, GALAXY_NAVIGATION.missionCount);
  assert.equal(new Set(missionIds).size, missionIds.length);
  assert.deepEqual(missionIds, [
    "jungle-vey",
    "ice-cryostalker",
    "volcano-bad-blood",
    "swamp-hydra",
    "desert-sandmaw",
    "ocean-leviathan",
    "fungal-hivemind",
    "ruins-ancient-guardian",
  ]);
  assert.equal(GALAXY_NAVIGATION.systems[0].name, "Système Oseris");
  assert.equal(GALAXY_NAVIGATION.systems[0].planets[0].name, "Oseris-IV");
  assert.equal(GALAXY_BIOME_LABELS.swamp, "Marais acide");
  assert.equal(GALAXY_BIOME_LABELS.ruins, "Mégalopole en ruines");

  for (const system of GALAXY_NAVIGATION.systems) {
    assert.ok(system.position.x >= 0 && system.position.x <= 100);
    assert.ok(system.position.y >= 0 && system.position.y <= 100);
    assert.ok(system.planets.length > 0);
    for (const planet of system.planets) {
      assert.ok(planet.missions.length > 0);
    }
  }

  for (let left = 0; left < GALAXY_NAVIGATION.systems.length; left += 1) {
    for (let right = left + 1; right < GALAXY_NAVIGATION.systems.length; right += 1) {
      const a = GALAXY_NAVIGATION.systems[left].position;
      const b = GALAXY_NAVIGATION.systems[right].position;
      assert.ok(Math.hypot(a.x - b.x, a.y - b.y) >= 20, `${left}/${right}`);
    }
  }
});

test("pure navigation reducer drills galaxy to mission and restores breadcrumbs", () => {
  let state = createGalaxyNavigationState();
  assert.equal(state.level, "galaxy");
  assert.equal(getGalaxyNavigationItems(GALAXY_NAVIGATION, state).length, 8);

  state = reduceGalaxyNavigation(GALAXY_NAVIGATION, state, {
    type: "activate",
  });
  assert.equal(state.level, "system");
  assert.equal(state.systemId, "system-oseris");

  state = reduceGalaxyNavigation(GALAXY_NAVIGATION, state, {
    type: "activate",
  });
  assert.equal(state.level, "planet");
  assert.equal(state.planetId, "planet-oseris-iv");

  state = reduceGalaxyNavigation(GALAXY_NAVIGATION, state, {
    type: "activate",
  });
  assert.equal(state.level, "mission");
  assert.equal(state.missionId, "jungle-vey");
  assert.deepEqual(getGalaxyNavigationBreadcrumbs(GALAXY_NAVIGATION, state), [
    "Étendue de la Longue Chasse",
    "Système Oseris",
    "Oseris-IV",
    "Sang dans la canopée",
  ]);

  state = reduceGalaxyNavigation(GALAXY_NAVIGATION, state, { type: "back" });
  assert.equal(state.level, "planet");
  state = reduceGalaxyNavigation(GALAXY_NAVIGATION, state, { type: "back" });
  assert.equal(state.level, "system");
  state = reduceGalaxyNavigation(GALAXY_NAVIGATION, state, { type: "back" });
  assert.equal(state.level, "galaxy");
});

test("cursor wraps and invalid routes cannot corrupt the selected hierarchy", () => {
  const initial = createGalaxyNavigationState();
  const wrapped = reduceGalaxyNavigation(GALAXY_NAVIGATION, initial, {
    type: "move",
    delta: -1,
  });
  assert.equal(wrapped.cursorIndex, GALAXY_NAVIGATION.systems.length - 1);

  const invalid = reduceGalaxyNavigation(GALAXY_NAVIGATION, wrapped, {
    type: "open-system",
    systemId: "system-inconnu",
  });
  assert.equal(invalid, wrapped);

  const missionState = reduceGalaxyNavigation(GALAXY_NAVIGATION, initial, {
    type: "open-mission",
    missionId: "volcano-bad-blood",
  });
  const path = findGalaxyMission(
    GALAXY_NAVIGATION,
    missionState.missionId,
  );
  assert.equal(missionState.level, "mission");
  assert.equal(path?.system.name, "Système Cinder");
  assert.equal(path?.planet.name, "Cinder-12");
});

test("physical deck exposes six truthful traversable stations and three input families", async () => {
  const source = await readFile(
    resolve(projectRoot, "app/game/PhysicalShipDeck.tsx"),
    "utf8",
  );
  const stationIds = [
    "galaxy-map",
    "wall-armory",
    "trophy-hall",
    "clan-archives",
    "appearance-forge",
    "medical-bay",
  ];

  for (const stationId of stationIds) {
    assert.match(source, new RegExp(`id: "${stationId}"`));
  }
  assert.match(source, /window\.requestAnimationFrame/);
  assert.match(source, /navigator\.getGamepads/);
  assert.match(source, /event\.key\.toLowerCase/);
  assert.match(source, /onPointerDown/);
  assert.match(source, /INTERACTION_RADIUS/);
  assert.match(source, /LADDERS/);
  assert.match(source, /role="region"/);
  assert.match(source, /physical-ship-deck__station-shortcuts/);
  assert.match(source, /aria-live="polite"/);
  assert.match(source, /onOpenMap/);
  assert.match(source, /onOpenArmory/);
  assert.match(source, /onOpenTrophies/);
  assert.match(source, /onOpenArchives/);
  assert.match(source, /onOpenAppearanceForge/);
  assert.match(source, /onOpenMedbay/);
  assert.match(source, /Forge des parures/);
  assert.match(source, /Ajuster corps, biomask, dreads, plaques et ornements/);
  assert.doesNotMatch(source, /Cercle d’entraînement/);
  assert.doesNotMatch(source, /combat rituel/);
});

test("the physical medbay reuses the functional ShipHub treatment room and returns to deck", async () => {
  const source = await readFile(
    resolve(projectRoot, "app/game/GameClient.tsx"),
    "utf8",
  );

  assert.match(source, /onOpenMedbay=\{\(\) => openStationScreen\("medbay", "deck"\)\}/);
  assert.match(source, /screen === "medbay"/);
  assert.match(source, /initialRoomId="medbay"/);
  assert.match(source, /← Retour au pont physique/);
  assert.match(
    source,
    /physical-medbay-entry__back[\s\S]*onClick=\{\(\) => go\("deck"\)\}/,
  );
});
