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

test("ship register has 47 curated craft and 7 autonomous project originals", () => {
  assert.equal(catalogue.SHIP_CATALOGUE.length, 54);
  assert.equal(new Set(catalogue.SHIP_IDS).size, 54);
  assert.equal(catalogue.SHIP_IDS.includes("plastic-man-plane"), false);
  assert.equal(
    catalogue.SHIP_IDS.some((id) => /interior/i.test(id)),
    false,
  );

  const v14CanonicalIds = [
    "avp-predator-drop-pod",
    "avp-predator-mothership",
    "avpr-scout-ship",
    "feral-spaceship",
    "fugitive-spaceship",
    "upgrade-spaceship",
    "wolf-ship",
  ];
  const v14ApproximationIds = [
    "game-preserve-ship",
  ];
  const projectOriginalAssetSources = {
    "project-original-avp-predator-mothership":
      "avp-predator-mothership",
    "project-original-avpr-scout-ship": "avpr-scout-ship",
    "project-original-wolf-ship": "wolf-ship",
    "project-original-fugitive-spaceship": "fugitive-spaceship",
    "project-original-upgrade-spaceship": "upgrade-spaceship",
    "project-original-feral-spaceship": "feral-spaceship",
    "project-original-avp-predator-drop-pod":
      "avp-predator-drop-pod",
  };
  const projectOriginalIds = Object.keys(projectOriginalAssetSources);
  assert.deepEqual(
    [...catalogue.V14_CANONICAL_SHIP_IDS].sort(),
    v14CanonicalIds,
  );
  assert.deepEqual(
    [...catalogue.V14_APPROXIMATION_SHIP_IDS].sort(),
    v14ApproximationIds,
  );
  assert.deepEqual(
    [...catalogue.V14_GENERATED_SHIP_IDS].sort(),
    [...v14CanonicalIds, ...v14ApproximationIds].sort(),
  );
  assert.deepEqual(
    [...catalogue.PROJECT_ORIGINAL_SHIP_IDS],
    projectOriginalIds,
  );
  assert.deepEqual(
    catalogue.PROJECT_ORIGINAL_ASSET_SOURCE_BY_ID,
    projectOriginalAssetSources,
  );
  assert.equal(
    new Set(Object.values(projectOriginalAssetSources)).size,
    projectOriginalIds.length,
  );

  const kinds = new Set();
  for (const ship of catalogue.SHIP_CATALOGUE) {
    kinds.add(ship.kind);
    const isV14Canonical = v14CanonicalIds.includes(ship.id);
    const isV14Approximation = v14ApproximationIds.includes(ship.id);
    const isProjectOriginal = projectOriginalIds.includes(ship.id);
    const assetSourceId =
      projectOriginalAssetSources[ship.id] ?? ship.id;
    assert.equal(
      ship.provenance.runtimeAssetPath,
      isV14Canonical
        ? `/game/ships/v14/${ship.id}.webp`
        : `/game/ships/v12/${assetSourceId}.webp`,
    );
    assert.equal(
      ship.provenance.topRuntimeAssetPath,
      isV14Canonical
        ? `/game/ships/v14/${ship.id}-top.webp`
        : `/game/ships/v13/${assetSourceId}-top.webp`,
    );
    assert.equal(catalogue.shipAssetSourceId(ship.id), assetSourceId);
    assert.equal(
      catalogue.shipProfileAssetPath(ship.id),
      ship.provenance.runtimeAssetPath,
    );
    assert.equal(
      catalogue.shipTopAssetPath(ship.id),
      ship.provenance.topRuntimeAssetPath,
    );
    assert.equal(
      ship.provenance.status,
      isV14Canonical ? "references-locked" : "project-original",
    );
    assert.equal(
      ship.provenance.primaryAssetVersion,
      isV14Canonical ? "V14" : "V12/V13",
    );
    assert.deepEqual(
      ship.provenance.generationPromptIds,
      isV14Canonical
        ? [`v14-profile-${ship.id}`, `v14-top-${ship.id}`]
        : [`v13-top-${assetSourceId}`],
    );
    assert.equal(
      ship.provenance.generationNotesPath,
      isV14Canonical
        ? "art-source/v14/ships/README.md"
        : "art-source/v13/ships-top/README.md",
    );
    assert.equal(
      ship.provenance.assetManifestPath,
      isV14Canonical
        ? "art-source/v14/ships/ship-asset-manifest.json"
        : null,
    );
    if (isV14Approximation) {
      assert.equal(ship.provenance.supplementalAssets.length, 1);
      const [study] = ship.provenance.supplementalAssets;
      assert.equal(study.status, "approximation");
      assert.equal(
        study.profileRuntimeAssetPath,
        `/game/ships/v14/${ship.id}.webp`,
      );
      assert.equal(
        study.topRuntimeAssetPath,
        `/game/ships/v14/${ship.id}-top.webp`,
      );
      assert.match(
        study.note,
        /étude non promue.*profil reste insuffisant/i,
      );
    } else {
      assert.deepEqual(ship.provenance.supplementalAssets, []);
    }
    assert.ok(
      [
        "screen",
        "licensed-game",
        "expanded-universe",
        "crossover",
        "literary",
        "project-original",
      ]
        .includes(ship.canonTier),
    );
    assert.ok(
      [
        "reference-locked",
        "source-guided-approximation",
        "silhouette-inferred",
        "text-inspired",
        "project-original",
      ]
        .includes(ship.visualConfidence),
    );
    if (isV14Canonical) {
      assert.equal(ship.visualConfidence, "reference-locked");
    } else {
      assert.notEqual(ship.visualConfidence, "reference-locked");
    }
    if (isV14Approximation) {
      assert.equal(ship.visualConfidence, "source-guided-approximation");
    }
    const verifiedReference = ship.provenance.referenceSlots.find(
      ({ status }) => status === "verified",
    );
    if (isProjectOriginal) {
      const inspiration = catalogue.shipForId(assetSourceId);
      assert.equal(ship.projectOriginal, true);
      assert.equal(ship.inspirationShipId, assetSourceId);
      assert.equal(ship.media, "project");
      assert.equal(ship.canonTier, "project-original");
      assert.equal(ship.visualConfidence, "project-original");
      assert.equal(ship.provenance.status, "project-original");
      assert.equal(ship.provenance.assetManifestPath, null);
      assert.equal(ship.selectable, inspiration.selectable);
      assert.equal(
        ship.kind,
        inspiration.selectable ? "variant" : "auxiliary",
      );
      assert.equal(verifiedReference?.url, null);
      assert.match(verifiedReference?.title ?? "", /création originale/i);
      assert.match(
        ship.description,
        /créés indépendamment.*aucune des deux vues ne prétend reproduire/i,
      );
      assert.equal(v14CanonicalIds.includes(ship.id), false);
      assert.equal(v14ApproximationIds.includes(ship.id), false);
    } else {
      assert.equal(ship.projectOriginal, false);
      assert.equal(ship.inspirationShipId, null);
      assert.match(verifiedReference?.url ?? "", /^https:\/\//);
    }
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
  assert.equal(
    catalogue.SHIP_CATALOGUE.filter(({ media }) => media === "project").length,
    7,
  );
  assert.equal(
    catalogue.SHIP_CATALOGUE.filter(({ selectable }) => selectable).length,
    47,
  );
  assert.equal(
    catalogue.SHIP_CATALOGUE.filter(({ selectable }) => !selectable).length,
    7,
  );
  assert.equal(
    Math.ceil(catalogue.SHIP_CATALOGUE.length / catalogue.SHIP_CATALOGUE_PAGE_SIZE),
    7,
  );
});

test("pods, gliders, ground craft and fleets stay in the auxiliary catalogue", () => {
  const auxiliaryIds = [
    "avp-predator-drop-pod",
    "feral-clan-ships",
    "emergency-escape-pod",
    "blade-fighter",
    "new-york-enforcer-ship",
    "predator-fleet",
    "project-original-avp-predator-drop-pod",
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

  assert.equal(state.version, 3);
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

test("a selectable project original survives a sidecar storage round-trip", () => {
  const save = richSave();
  const initial = progression.createDefaultShipProgression(save, FIXED_TIME);
  const unlocked = progression.unlockAvailableShips(
    initial,
    save,
    FIXED_TIME,
  );
  const extraId = "project-original-avp-predator-mothership";
  assert.ok(unlocked.unlockedShipIds.includes(extraId));
  assert.equal(
    unlocked.unlockedShipIds.includes(
      "project-original-avp-predator-drop-pod",
    ),
    false,
  );

  const selected = progression.selectShip(unlocked, extraId, FIXED_TIME);
  assert.equal(selected.selectedShipId, extraId);

  const values = new Map();
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
  progression.writeShipProgression(selected, save, storage);
  const roundTrip = progression.loadShipProgression(save, storage);
  assert.equal(roundTrip.selectedShipId, extraId);
  assert.ok(roundTrip.unlockedShipIds.includes(extraId));
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
  assert.equal(migrated.version, 3);
  assert.equal(migrated.ownerSaveCreatedAt, save.createdAt);
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
  assert.match(hubSource, /"project"/);
  assert.match(hubSource, /Créations du projet/);
  assert.match(hubSource, /ship-visual-comparison/);
  assert.match(hubSource, /shipTopAssetPath/);
  assert.match(hubSource, /supplementalAssets/);
  assert.match(hubSource, /ÉTUDE NON CANONIQUE/);
  assert.match(hubSource, /selectShip\(/);
  assert.match(hubSource, /onSelectedShipChange/);
  assert.match(clientSource, /selectedShipId=\{selectedShipId\}/);
  assert.match(clientSource, /onSelectedShipChange=\{setSelectedShipId\}/);
  assert.match(mapSource, /data-selected-ship=\{selectedShipId\}/);
  assert.match(mapSource, /Vaisseau · \{selectedShip\.shortName\}/);
  assert.match(mapSource, /shipTopAssetPath\(selectedShip\.id\)/);
  assert.doesNotMatch(mapSource, /V6_SHIP_VISUAL_BY_ROLE/);
});
