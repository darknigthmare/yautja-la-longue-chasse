import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { after, test } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "vite";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputDirectory = await mkdtemp(join(tmpdir(), "yautja-ship-catalogue-"));

await Promise.all([
  build({
    configFile: false,
    logLevel: "silent",
    build: {
      emptyOutDir: true,
      outDir: join(outputDirectory, "catalogue"),
      ssr: resolve(projectRoot, "app/game/shipCatalogue.ts"),
      rollupOptions: { output: { entryFileNames: "catalogue.mjs" } },
    },
  }),
  build({
    configFile: false,
    logLevel: "silent",
    build: {
      emptyOutDir: true,
      outDir: join(outputDirectory, "progression"),
      ssr: resolve(projectRoot, "app/game/systems/progression.ts"),
      rollupOptions: { output: { entryFileNames: "progression.mjs" } },
    },
  }),
  build({
    configFile: false,
    logLevel: "silent",
    build: {
      emptyOutDir: true,
      outDir: join(outputDirectory, "save"),
      ssr: resolve(projectRoot, "app/game/save.ts"),
      rollupOptions: { output: { entryFileNames: "save.mjs" } },
    },
  }),
]);

const catalogue = await import(
  pathToFileURL(join(outputDirectory, "catalogue", "catalogue.mjs")).href
);
const progression = await import(
  pathToFileURL(join(outputDirectory, "progression", "progression.mjs")).href
);
const { defaultSave } = await import(
  pathToFileURL(join(outputDirectory, "save", "save.mjs")).href
);

after(async () => {
  await rm(outputDirectory, { force: true, recursive: true });
});

const FIXED_TIME = "2026-07-22T10:00:00.000Z";

function richSave() {
  const save = defaultSave(FIXED_TIME);
  save.profile.honor = 10_000;
  for (const mission of Object.values(save.missionProgress)) {
    mission.status = "completed";
    mission.completions = 1;
  }
  save.trophies = Array.from({ length: 12 }, (_, index) => ({
    id: `fleet-trophy-${index}`,
  }));
  return save;
}

test("ship register has 47 unique curated craft entries and no environment or shapeshifter", () => {
  assert.equal(catalogue.SHIP_CATALOGUE.length, 47);
  assert.equal(new Set(catalogue.SHIP_IDS).size, 47);
  assert.equal(catalogue.SHIP_IDS.includes("plastic-man-plane"), false);
  assert.equal(
    catalogue.SHIP_IDS.some((id) => /interior/i.test(id)),
    false,
  );

  const kinds = new Set();
  for (const ship of catalogue.SHIP_CATALOGUE) {
    kinds.add(ship.kind);
    assert.equal(
      ship.provenance.runtimeAssetPath,
      `/game/ships/v12/${ship.id}.webp`,
    );
    assert.equal(
      ship.provenance.topRuntimeAssetPath,
      `/game/ships/v13/${ship.id}-top.webp`,
    );
    assert.equal(ship.provenance.status, "project-original");
    assert.equal(ship.provenance.generationPromptId, `v13-top-${ship.id}`);
    assert.equal(
      ship.provenance.generationNotesPath,
      "art-source/v13/ships-top/README.md",
    );
    assert.ok(
      ["screen", "licensed-game", "expanded-universe", "crossover", "literary"]
        .includes(ship.canonTier),
    );
    assert.ok(
      ["reference-locked", "silhouette-inferred", "text-inspired"]
        .includes(ship.visualConfidence),
    );
    const verifiedReference = ship.provenance.referenceSlots.find(
      ({ status }) => status === "verified",
    );
    assert.match(verifiedReference?.url ?? "", /^https:\/\//);
    assert.ok(ship.aliases.length > 0);
  }
  assert.deepEqual([...kinds].sort(), [
    "auxiliary",
    "class",
    "identity",
    "variant",
  ]);
  assert.equal(
    catalogue.shipForId("fortnite-predator-ship").canonTier,
    "crossover",
  );
  assert.equal(catalogue.shipForId("blade-fighter").media, "collectible");
});

test("pods, gliders, ground craft and fleets stay in the auxiliary catalogue", () => {
  const auxiliaryIds = [
    "avp-predator-drop-pod",
    "feral-clan-ships",
    "emergency-escape-pod",
    "blade-fighter",
    "new-york-enforcer-ship",
    "predator-fleet",
  ];
  const save = richSave();

  for (const shipId of auxiliaryIds) {
    const ship = catalogue.shipForId(shipId);
    const availability = catalogue.getShipAvailability(shipId, save);
    assert.equal(ship.kind, "auxiliary");
    assert.equal(ship.selectable, false);
    assert.equal(availability.selectable, false);
    assert.equal(availability.available, false);
  }
  assert.equal(
    catalogue.availableShipIds(save).some((id) => auxiliaryIds.includes(id)),
    false,
  );
});

test("unlock curve is gradual and a fresh sidecar starts on the classic ship", () => {
  const save = defaultSave(FIXED_TIME);
  const state = progression.createDefaultShipProgression(save, FIXED_TIME);

  assert.equal(state.version, 2);
  assert.equal(state.selectedShipId, "classic-predator-spaceship");
  assert.deepEqual(state.unlockedShipIds, ["classic-predator-spaceship"]);

  const selectable = catalogue.SHIP_CATALOGUE.filter(
    ({ selectable: canSelect }) => canSelect,
  );
  for (let index = 1; index < selectable.length; index += 1) {
    assert.ok(
      selectable[index].unlock.minimumHonor >=
        selectable[index - 1].unlock.minimumHonor,
    );
  }
  assert.equal(
    catalogue.availableShipIds(richSave()).length,
    selectable.length,
  );
});

test("v1 migration preserves sidecar progress and repairs fleet fields safely", () => {
  const save = defaultSave(FIXED_TIME);
  const current = progression.createDefaultShipProgression(save, FIXED_TIME);
  const legacy = {
    ...current,
    version: 1,
    completedRiteIds: ["first-trophy"],
    training: {
      ...current.training,
      targeting: {
        ...current.training.targeting,
        attempts: 4,
        bestScore: 88,
      },
    },
  };
  delete legacy.selectedShipId;
  delete legacy.unlockedShipIds;

  const migrated = progression.normalizeShipProgression(
    legacy,
    save,
    FIXED_TIME,
  );
  assert.equal(migrated.version, 2);
  assert.equal(migrated.selectedShipId, "classic-predator-spaceship");
  assert.deepEqual(migrated.unlockedShipIds, ["classic-predator-spaceship"]);
  assert.equal(migrated.training.targeting.attempts, 4);
  assert.equal(migrated.training.targeting.bestScore, 88);
  assert.ok(migrated.completedRiteIds.includes("first-trophy"));

  const repaired = progression.normalizeShipProgression(
    {
      ...migrated,
      selectedShipId: "removed-ship",
      unlockedShipIds: ["removed-ship", "avp-predator-drop-pod"],
    },
    save,
    FIXED_TIME,
  );
  assert.equal(repaired.selectedShipId, "classic-predator-spaceship");
  assert.deepEqual(repaired.unlockedShipIds, ["classic-predator-spaceship"]);
});

test("locked or auxiliary hulls cannot be selected, earned hulls persist", () => {
  const baseSave = defaultSave(FIXED_TIME);
  const initial = progression.createDefaultShipProgression(baseSave, FIXED_TIME);
  assert.equal(
    progression.unlockShip(
      initial,
      baseSave,
      "lost-tribe-spaceship",
      FIXED_TIME,
    ),
    initial,
  );
  assert.equal(
    progression.selectShip(initial, "wolf-ship", FIXED_TIME),
    initial,
  );

  const firstUnlockSave = defaultSave(FIXED_TIME);
  firstUnlockSave.profile.honor = 200;
  firstUnlockSave.missionProgress["jungle-vey"].status = "completed";
  firstUnlockSave.missionProgress["jungle-vey"].completions = 1;
  firstUnlockSave.trophies = [{ id: "first-fleet-trophy" }];
  const firstUnlocked = progression.unlockShip(
    initial,
    firstUnlockSave,
    "lost-tribe-spaceship",
    FIXED_TIME,
  );
  assert.ok(firstUnlocked.unlockedShipIds.includes("lost-tribe-spaceship"));

  const completedSave = richSave();
  const unlocked = progression.unlockAvailableShips(
    initial,
    completedSave,
    FIXED_TIME,
  );
  assert.ok(unlocked.unlockedShipIds.includes("advanced-predator-ship"));
  assert.equal(unlocked.unlockedShipIds.includes("predator-fleet"), false);

  const selected = progression.selectShip(
    unlocked,
    "advanced-predator-ship",
    FIXED_TIME,
  );
  assert.equal(selected.selectedShipId, "advanced-predator-ship");
  assert.equal(
    progression.selectShip(selected, "predator-fleet", FIXED_TIME),
    selected,
  );

  const retained = progression.normalizeShipProgression(
    selected,
    baseSave,
    FIXED_TIME,
  );
  assert.equal(retained.selectedShipId, "advanced-predator-ship");
  assert.ok(retained.unlockedShipIds.includes("advanced-predator-ship"));
});

test("hangar is paginated and propagates the selected hull to the galaxy map", async () => {
  const [hubSource, clientSource, mapSource] = await Promise.all([
    readFile(resolve(projectRoot, "app/game/ShipHub.tsx"), "utf8"),
    readFile(resolve(projectRoot, "app/game/GameClient.tsx"), "utf8"),
    readFile(resolve(projectRoot, "app/game/GalaxyMapPanel.tsx"), "utf8"),
  ]);

  assert.match(hubSource, /id: "hangar"/);
  assert.match(hubSource, /SHIP_CATALOGUE_PAGE_SIZE/);
  assert.match(hubSource, /`hangar-filter-\$\{media\}`/);
  assert.match(hubSource, /"novel"/);
  assert.match(hubSource, /ship-visual-comparison/);
  assert.match(hubSource, /topRuntimeAssetPath/);
  assert.match(hubSource, /selectShip\(/);
  assert.match(hubSource, /onSelectedShipChange/);
  assert.match(clientSource, /selectedShipId=\{selectedShipId\}/);
  assert.match(clientSource, /onSelectedShipChange=\{setSelectedShipId\}/);
  assert.match(mapSource, /data-selected-ship=\{selectedShipId\}/);
  assert.match(mapSource, /Vaisseau · \{selectedShip\.shortName\}/);
  assert.match(mapSource, /selectedShip\.provenance\.topRuntimeAssetPath/);
  assert.doesNotMatch(mapSource, /V6_SHIP_VISUAL_BY_ROLE/);
});
