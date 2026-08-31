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

test("explicit registry exposes 5 sectors, 12 systems, 44 bodies, 24 worlds and 8 hunts", () => {
  const bodies = GALAXY_NAVIGATION.systems.flatMap((system) => system.bodies);
  const planets = bodies.filter(({ bodyKind }) => bodyKind === "planet");
  const missionIds = GALAXY_NAVIGATION.systems.flatMap((system) =>
    system.bodies.flatMap((planet) =>
      planet.missions.map((mission) => mission.id),
    ),
  );

  assert.equal(GALAXY_NAVIGATION.sectorCount, 5);
  assert.equal(GALAXY_NAVIGATION.systemCount, 12);
  assert.equal(GALAXY_NAVIGATION.bodyCount, 44);
  assert.equal(GALAXY_NAVIGATION.planetCount, 24);
  assert.equal(GALAXY_NAVIGATION.huntWorldCount, 8);
  assert.equal(GALAXY_NAVIGATION.sectors.length, 5);
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
  assert.deepEqual(
    GALAXY_NAVIGATION.sectors.map(({ name, systems }) => ({
      name,
      systems: systems.map(({ id }) => id),
    })),
    [
      {
        name: "Couronne d’Oseris",
        systems: ["system-oseris", "system-nivalis", "system-cinder"],
      },
      {
        name: "Faille de Naraka",
        systems: ["system-naraka", "system-serekh"],
      },
      {
        name: "Amas de Pelagos",
        systems: ["system-pelagos", "system-mycora"],
      },
      {
        name: "Marches d’Acheron",
        systems: ["system-acheron", "system-kaail", "system-vardos"],
      },
      {
        name: "Voile de Tempest",
        systems: ["system-umbra", "system-tempest"],
      },
    ],
  );
  assert.equal(GALAXY_BIOME_LABELS.swamp, "Marais acide");
  assert.equal(GALAXY_BIOME_LABELS.ruins, "Mégalopole en ruines");
  assert.equal(GALAXY_BODY_KIND_LABELS.station, "Station");
  assert.equal(GALAXY_BODY_STATUS_LABELS.surveyed, "Monde prospecté");

  const sectorSystemIds = [];
  const backgroundKeys = new Set();
  for (const sector of GALAXY_NAVIGATION.sectors) {
    assert.ok(sector.position.x >= 0 && sector.position.x <= 100);
    assert.ok(sector.position.y >= 0 && sector.position.y <= 100);
    assert.ok(sector.description.length > 20);
    assert.ok(sector.accent.startsWith("#"));
    for (const system of sector.systems) {
      sectorSystemIds.push(system.id);
      assert.equal(system.sectorId, sector.id);
      assert.ok(system.position.x >= 0 && system.position.x <= 100);
      assert.ok(system.position.y >= 0 && system.position.y <= 100);
      assert.ok(system.bodies.length >= 3);
      assert.equal(system.planets.length, 2);
      assert.ok(system.description.length > 20);
      assert.ok(system.starClass.length > 3);
      assert.ok(system.visualProfile.backgroundKey.length > 3);
      assert.equal(
        backgroundKeys.has(system.visualProfile.backgroundKey),
        false,
        `${system.id}: background key must be unique`,
      );
      backgroundKeys.add(system.visualProfile.backgroundKey);
      assert.ok(system.visualProfile.orbitScale >= 0.65);
      assert.ok(system.visualProfile.orbitScale <= 1.35);
      assert.ok(system.visualProfile.orbitEccentricity >= 0);
      assert.ok(system.visualProfile.orbitEccentricity <= 0.45);
      assert.ok(Math.abs(system.visualProfile.orbitTiltDegrees) <= 35);
      assert.match(system.visualProfile.starGlow, /^#[\da-f]{6}$/i);
      const radii = new Set();
      for (const body of system.bodies) {
        assert.ok(body.position.x >= 0 && body.position.x <= 100);
        assert.ok(body.position.y >= 0 && body.position.y <= 100);
        assert.ok(body.orbit.radius >= 0.15 && body.orbit.radius <= 1);
        assert.ok(body.orbit.angleDegrees >= 0);
        assert.ok(body.orbit.angleDegrees < 360);
        assert.ok(Math.abs(body.orbit.inclinationDegrees) <= 30);
        assert.equal(
          radii.has(body.orbit.radius),
          false,
          `${system.id}: every mapped body needs its own orbital radius`,
        );
        radii.add(body.orbit.radius);
        const angle = (body.orbit.angleDegrees * Math.PI) / 180;
        const inclination =
          (body.orbit.inclinationDegrees * Math.PI) / 180;
        const expectedX =
          Math.round((40 + Math.cos(angle) * 36 * body.orbit.radius) * 100) /
          100;
        const expectedY =
          Math.round(
            (50 +
              Math.sin(angle) *
                31 *
                body.orbit.radius *
                Math.cos(inclination)) *
              100,
          ) / 100;
        assert.equal(body.position.x, expectedX);
        assert.equal(body.position.y, expectedY);
        assert.ok(body.summary.length > 20);
        assert.ok(body.population.length > 2);
        assert.ok(body.signal.length > 2);
        assert.ok(body.hazard.length > 2);
      }
    }
  }
  assert.equal(sectorSystemIds.length, 12);
  assert.equal(backgroundKeys.size, 12);
  assert.equal(new Set(sectorSystemIds).size, 12);
  assert.deepEqual(
    sectorSystemIds,
    GALAXY_NAVIGATION.systems.map(({ id }) => id),
  );
});

test("authored orbital radii preserve meaningful inner-to-outer system order", () => {
  const system = (id) =>
    GALAXY_NAVIGATION.systems.find((candidate) => candidate.id === id);
  const radius = (systemId, bodyId) =>
    system(systemId).bodies.find((body) => body.id === bodyId).orbit.radius;

  assert.ok(
    radius("system-oseris", "planet-oseris-ii") <
      radius("system-oseris", "planet-oseris-iv"),
  );
  assert.ok(
    radius("system-oseris", "planet-oseris-iv") <
      radius("system-oseris", "belt-saal"),
  );
  assert.ok(
    radius("system-nivalis", "planet-nivalis-c") <
      radius("system-nivalis", "planet-nivalis-k"),
  );
  assert.ok(
    radius("system-nivalis", "planet-nivalis-k") <
      radius("system-nivalis", "giant-boreal"),
  );
  assert.ok(
    radius("system-tempest", "planet-aeris") <
      radius("system-tempest", "planet-fulmen"),
  );
  assert.ok(
    radius("system-tempest", "planet-fulmen") <
      radius("system-tempest", "giant-core"),
  );
});

function registryFromNavigation() {
  return GALAXY_NAVIGATION.systems.map((system) => ({
    id: system.id,
    name: system.name,
    starName: system.starName,
    starClass: system.starClass,
    summary: system.description,
    position: { x: 50, y: 50 },
    accent: system.accent,
    visualProfile: { ...system.visualProfile },
    bodies: system.bodies.map((body) => ({
      id: body.id,
      name: body.name,
      type: body.bodyKind,
      status: body.status,
      biome: body.biome,
      environment: body.environment,
      summary: body.summary,
      population: body.population,
      signal: body.signal,
      hazard: body.hazard,
      position: { ...body.position },
      orbit: { ...body.orbit },
      accent: body.accent,
      missionPlanetName: null,
    })),
  }));
}

function sectorsFromNavigation() {
  return GALAXY_NAVIGATION.sectors.map((sector) => ({
    id: sector.id,
    name: sector.name,
    description: sector.description,
    accent: sector.accent,
    position: { ...sector.position },
    systems: sector.systems.map((system) => ({
      systemId: system.id,
      position: { ...system.position },
    })),
  }));
}

test("registry rejects duplicate system identities and incoherent orbital data", () => {
  const sectors = sectorsFromNavigation();

  const duplicateBackground = registryFromNavigation();
  duplicateBackground[1].visualProfile.backgroundKey =
    duplicateBackground[0].visualProfile.backgroundKey;
  assert.throws(
    () => buildGalaxyNavigation([], duplicateBackground, sectors),
    /Duplicate galaxy system background key/,
  );

  const duplicateRadius = registryFromNavigation();
  duplicateRadius[0].bodies[1].orbit.radius =
    duplicateRadius[0].bodies[0].orbit.radius;
  assert.throws(
    () => buildGalaxyNavigation([], duplicateRadius, sectors),
    /Duplicate galaxy orbit radius/,
  );

  const invalidOrbit = registryFromNavigation();
  invalidOrbit[0].bodies[0].orbit.radius = 1.5;
  assert.throws(
    () => buildGalaxyNavigation([], invalidOrbit, sectors),
    /Invalid galaxy body orbit/,
  );

  const incoherentPosition = registryFromNavigation();
  incoherentPosition[0].bodies[0].position.x += 3;
  assert.throws(
    () => buildGalaxyNavigation([], incoherentPosition, sectors),
    /Incoherent galaxy body orbit position/,
  );
});

test("pure navigation reducer drills galaxy to mission and restores breadcrumbs", () => {
  let state = createGalaxyNavigationState();
  assert.equal(state.level, "galaxy");
  assert.equal(state.sectorId, null);
  assert.deepEqual(
    getGalaxyNavigationItems(GALAXY_NAVIGATION, state).map(({ kind }) => kind),
    ["sector", "sector", "sector", "sector", "sector"],
  );

  state = reduceGalaxyNavigation(GALAXY_NAVIGATION, state, {
    type: "activate",
  });
  assert.equal(state.level, "sector");
  assert.equal(state.sectorId, "sector-oseris-crown");
  assert.deepEqual(
    getGalaxyNavigationItems(GALAXY_NAVIGATION, state).map(
      ({ kind, id }) => `${kind}:${id}`,
    ),
    [
      "system:system-oseris",
      "system:system-nivalis",
      "system:system-cinder",
    ],
  );

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
    "Couronne d’Oseris",
    "Système Oseris",
    "Oseris-IV",
    "Sang dans la canopée",
  ]);

  state = reduceGalaxyNavigation(GALAXY_NAVIGATION, state, { type: "back" });
  assert.equal(state.level, "planet");
  state = reduceGalaxyNavigation(GALAXY_NAVIGATION, state, { type: "back" });
  assert.equal(state.level, "system");
  state = reduceGalaxyNavigation(GALAXY_NAVIGATION, state, { type: "back" });
  assert.equal(state.level, "sector");
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
  assert.equal(state.sectorId, "sector-oseris-crown");
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
  assert.equal(emptyTree.sectorCount, 5);
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
  assert.equal(wrapped.cursorIndex, GALAXY_NAVIGATION.sectors.length - 1);

  const invalidSector = reduceGalaxyNavigation(GALAXY_NAVIGATION, wrapped, {
    type: "open-sector",
    sectorId: "sector-inconnu",
  });
  assert.equal(invalidSector, wrapped);

  const invalid = reduceGalaxyNavigation(GALAXY_NAVIGATION, wrapped, {
    type: "open-system",
    systemId: "system-inconnu",
  });
  assert.equal(invalid, wrapped);

  const invalidPlanet = reduceGalaxyNavigation(GALAXY_NAVIGATION, wrapped, {
    type: "open-planet",
    planetId: "planet-inconnue",
  });
  assert.equal(invalidPlanet, wrapped);

  const invalidMission = reduceGalaxyNavigation(GALAXY_NAVIGATION, wrapped, {
    type: "open-mission",
    missionId: "mission-inconnue",
  });
  assert.equal(invalidMission, wrapped);

  const directSystem = reduceGalaxyNavigation(GALAXY_NAVIGATION, initial, {
    type: "open-system",
    systemId: "system-vardos",
  });
  assert.equal(directSystem.level, "system");
  assert.equal(directSystem.sectorId, "sector-acheron-marches");
  assert.equal(
    getGalaxyNavigationSelection(GALAXY_NAVIGATION, directSystem).sector?.name,
    "Marches d’Acheron",
  );

  const missionState = reduceGalaxyNavigation(GALAXY_NAVIGATION, initial, {
    type: "open-mission",
    missionId: "volcano-bad-blood",
  });
  const path = findGalaxyMission(
    GALAXY_NAVIGATION,
    missionState.missionId,
  );
  assert.equal(missionState.level, "mission");
  assert.equal(missionState.sectorId, "sector-oseris-crown");
  assert.equal(path?.sector.name, "Couronne d’Oseris");
  assert.equal(path?.system.name, "Système Cinder");
  assert.equal(path?.planet.name, "Cinder-12");
});

test("physical deck exposes eight traversable stations and three input families", async () => {
  const source = await readFile(
    resolve(projectRoot, "app/game/PhysicalShipDeck.tsx"),
    "utf8",
  );
  const { ship: { PHYSICAL_SHIP_STATIONS } } = await import("./helpers/ship-level-runtime.mjs");
  const stationIds = [
    "galaxy-map",
    "wall-armory",
    "trophy-hall",
    "clan-archives",
    "appearance-forge",
    "medical-bay",
    "training-arena",
    "launch-airlock",
  ];

  for (const stationId of stationIds) {
    assert.ok(PHYSICAL_SHIP_STATIONS.some((station) => station.id === stationId));
  }
  assert.match(source, /window\.requestAnimationFrame/);
  assert.match(source, /navigator\.getGamepads/);
  assert.match(source, /matchesControlAction\("hunt\.moveLeft"/);
  assert.match(source, /matchesControlAction\("hunt\.interact"/);
  assert.match(source, /onPointerDown/);
  assert.match(source, /nearestStationFor/);
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
  assert.match(source, /onOpenTraining/);
  assert.match(source, /onOpenAirlock/);
  assert.doesNotMatch(source, /combat rituel/);
});

test("the physical medbay reuses the functional ShipHub treatment room and returns to deck", async () => {
  const source = await readFile(
    resolve(projectRoot, "app/game/GameClient.tsx"),
    "utf8",
  );

  assert.match(source, /onOpenMedbay=\{\(\) => openStationScreen\("medbay", "deck"\)\}/);
  assert.match(source, /screen === "medbay"/);
  assert.match(source, /initialRoomId=\{screen === "training" \? "training" : "medbay"\}/);
  assert.match(source, /← Retour au pont physique/);
  assert.match(
    source,
    /physical-medbay-entry__back[\s\S]*onClick=\{\(\) => go\("deck"\)\}/,
  );
});
