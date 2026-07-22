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
  GALAXY_BODY_KIND_LABELS,
  GALAXY_BODY_STATUS_LABELS,
  GALAXY_NAVIGATION,
  buildGalaxyNavigation,
  createGalaxyNavigationState,
  findGalaxyMission,
  getGalaxyNavigationBreadcrumbs,
  getGalaxyNavigationItems,
  getGalaxyNavigationSelection,
  reduceGalaxyNavigation,
} = await import(
  pathToFileURL(join(outputDirectory, "galaxy-navigation.mjs")).href
);

after(async () => {
  await rm(outputDirectory, { force: true, recursive: true });
});

test("explicit registry exposes 12 systems, 44 bodies, 24 worlds and 8 hunts", () => {
  const bodies = GALAXY_NAVIGATION.systems.flatMap((system) => system.bodies);
  const planets = bodies.filter(({ bodyKind }) => bodyKind === "planet");
  const missionIds = GALAXY_NAVIGATION.systems.flatMap((system) =>
    system.bodies.flatMap((planet) =>
      planet.missions.map((mission) => mission.id),
    ),
  );

  assert.equal(GALAXY_NAVIGATION.systemCount, 12);
  assert.equal(GALAXY_NAVIGATION.bodyCount, 44);
  assert.equal(GALAXY_NAVIGATION.planetCount, 24);
  assert.equal(GALAXY_NAVIGATION.huntWorldCount, 8);
  assert.equal(GALAXY_NAVIGATION.systems.length, 12);
  assert.equal(bodies.length, 44);
  assert.equal(planets.length, 24);
  assert.equal(bodies.filter(({ missions }) => missions.length === 0).length, 36);
  assert.equal(
    planets.filter(({ status }) => status === "surveyed").length,
    16,
  );
  assert.equal(
    bodies.filter(({ bodyKind }) => bodyKind !== "planet").length,
    20,
  );
  assert.equal(missionIds.length, GALAXY_NAVIGATION.missionCount);
  assert.equal(GALAXY_NAVIGATION.missionCount, 8);
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
  assert.equal(GALAXY_NAVIGATION.systems[0].bodies.length, 4);
  assert.equal(GALAXY_NAVIGATION.systems[0].planets.length, 2);
  assert.equal(GALAXY_NAVIGATION.systems.at(-1).name, "Système Tempest");
  assert.equal(GALAXY_NAVIGATION.systems.at(-1).bodies.length, 3);
  assert.equal(GALAXY_BIOME_LABELS.swamp, "Marais acide");
  assert.equal(GALAXY_BIOME_LABELS.ruins, "Mégalopole en ruines");
  assert.equal(GALAXY_BODY_KIND_LABELS.station, "Station");
  assert.equal(GALAXY_BODY_STATUS_LABELS.surveyed, "Monde prospecté");

  for (const system of GALAXY_NAVIGATION.systems) {
    assert.ok(system.position.x >= 0 && system.position.x <= 100);
    assert.ok(system.position.y >= 0 && system.position.y <= 100);
    assert.ok(system.bodies.length >= 3);
    assert.equal(system.planets.length, 2);
    assert.ok(system.description.length > 20);
    assert.ok(system.starClass.length > 3);
    for (const body of system.bodies) {
      assert.ok(body.position.x >= 0 && body.position.x <= 100);
      assert.ok(body.position.y >= 0 && body.position.y <= 100);
      assert.ok(body.summary.length > 20);
      assert.ok(body.population.length > 2);
      assert.ok(body.signal.length > 2);
      assert.ok(body.hazard.length > 2);
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
  assert.equal(getGalaxyNavigationItems(GALAXY_NAVIGATION, state).length, 12);

  state = reduceGalaxyNavigation(GALAXY_NAVIGATION, state, {
    type: "activate",
  });
  assert.equal(state.level, "system");
  assert.equal(state.systemId, "system-oseris");
  assert.equal(getGalaxyNavigationItems(GALAXY_NAVIGATION, state).length, 4);

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

test("surveyed worlds and auxiliary bodies remain inspectable without hiding siblings", () => {
  const initial = createGalaxyNavigationState();
  let state = reduceGalaxyNavigation(GALAXY_NAVIGATION, initial, {
    type: "open-planet",
    planetId: "planet-oseris-ii",
  });

  assert.equal(state.level, "planet");
  assert.equal(state.systemId, "system-oseris");
  assert.equal(state.planetId, "planet-oseris-ii");
  assert.equal(state.missionId, null);
  assert.equal(state.cursorIndex, 1);
  assert.equal(
    getGalaxyNavigationSelection(GALAXY_NAVIGATION, state).planet?.status,
    "surveyed",
  );
  assert.deepEqual(
    getGalaxyNavigationItems(GALAXY_NAVIGATION, state).map(({ id }) => id),
    ["planet-oseris-iv", "planet-oseris-ii", "moon-khepri", "belt-saal"],
  );

  state = reduceGalaxyNavigation(GALAXY_NAVIGATION, state, {
    type: "open-planet",
    planetId: "moon-khepri",
  });
  assert.equal(state.level, "planet");
  assert.equal(state.cursorIndex, 2);
  assert.equal(
    getGalaxyNavigationSelection(GALAXY_NAVIGATION, state).planet?.bodyKind,
    "moon",
  );
  assert.equal(getGalaxyNavigationItems(GALAXY_NAVIGATION, state).length, 4);

  state = reduceGalaxyNavigation(GALAXY_NAVIGATION, state, { type: "back" });
  assert.equal(state.level, "system");
  assert.equal(state.cursorIndex, 2);
});

test("registry navigation supports a temporarily empty mission catalogue", () => {
  const emptyTree = buildGalaxyNavigation([]);
  assert.equal(emptyTree.systemCount, 12);
  assert.equal(emptyTree.bodyCount, 44);
  assert.equal(emptyTree.planetCount, 24);
  assert.equal(emptyTree.huntWorldCount, 8);
  assert.equal(emptyTree.missionCount, 0);
  assert.equal(
    emptyTree.systems.flatMap(({ bodies }) => bodies).every(
      ({ missions }) => missions.length === 0,
    ),
    true,
  );

  const inspected = reduceGalaxyNavigation(
    emptyTree,
    createGalaxyNavigationState(),
    { type: "open-planet", planetId: "planet-oseris-iv" },
  );
  assert.equal(inspected.level, "planet");
  assert.equal(getGalaxyNavigationItems(emptyTree, inspected).length, 4);
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
