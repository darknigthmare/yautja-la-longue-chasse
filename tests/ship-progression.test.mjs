import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { after, test } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "vite";

const projectRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "..",
);
const outputDirectory = await mkdtemp(
  join(tmpdir(), "yautja-ship-progression-"),
);

await Promise.all([
  build({
    configFile: false,
    publicDir: false,
    logLevel: "silent",
    build: {
      emptyOutDir: true,
      outDir: join(outputDirectory, "save"),
      ssr: resolve(projectRoot, "app/game/save.ts"),
      rollupOptions: {
        output: { entryFileNames: "save.mjs" },
      },
    },
  }),
  build({
    configFile: false,
    publicDir: false,
    logLevel: "silent",
    build: {
      emptyOutDir: true,
      outDir: join(outputDirectory, "progression"),
      ssr: resolve(
        projectRoot,
        "app/game/systems/progression.ts",
      ),
      rollupOptions: {
        output: { entryFileNames: "progression.mjs" },
      },
    },
  }),
]);

const { defaultSave } = await import(
  pathToFileURL(join(outputDirectory, "save", "save.mjs")).href
);
const {
  SHIP_PROGRESSION_STORAGE_KEY,
  advanceShipProgression,
  advanceTrophyWorkshop,
  createDefaultShipProgression,
  evaluateClanProgression,
  huntMethodForTrophy,
  loadLoadoutPreset,
  loadShipProgression,
  normalizeShipProgression,
  placeTrophyOnDisplay,
  saveLoadoutPreset,
  setTrophyHuntMethod,
  speciesForTrophy,
  startMedbayTreatment,
  startTrophyCleaning,
  startTrophyMounting,
  synchronizeShipProgression,
  writeShipProgression,
} = await import(
  pathToFileURL(
    join(outputDirectory, "progression", "progression.mjs"),
  ).href
);

const FIXED_TIME = "2026-07-19T12:00:00.000Z";

after(async () => {
  await rm(outputDirectory, { force: true, recursive: true });
});

function trophy(overrides = {}) {
  return {
    id: "claim-cryo-1",
    definitionId: "cryostalker-skull",
    targetName: "Cryostalker Alpha",
    targetKind: "beast",
    partId: "skull",
    condition: "intact",
    missionId: "ice-cryostalker",
    quality: "elite",
    difficultyId: "elite",
    score: 92,
    claimedAt: FIXED_TIME,
    ...overrides,
  };
}

function memoryStorage() {
  const values = new Map();
  return {
    getItem(key) {
      return values.get(key) ?? null;
    },
    setItem(key, value) {
      values.set(key, value);
    },
    removeItem(key) {
      values.delete(key);
    },
    clear() {
      values.clear();
    },
    key(index) {
      return [...values.keys()][index] ?? null;
    },
    get length() {
      return values.size;
    },
  };
}

test("ship progression is a sidecar and leaves the current v3 save untouched", () => {
  const save = defaultSave(FIXED_TIME);
  save.trophies = [trophy()];
  const before = JSON.stringify(save);

  const sidecar = createDefaultShipProgression(save, FIXED_TIME);

  assert.equal(JSON.stringify(save), before);
  assert.equal(sidecar.version, 2);
  assert.equal(sidecar.selectedShipId, "classic-predator-spaceship");
  assert.deepEqual(sidecar.unlockedShipIds, ["classic-predator-spaceship"]);
  assert.equal(sidecar.trophies.length, 1);
  assert.equal(sidecar.trophies[0].speciesId, "cryostalker");
  assert.equal(sidecar.trophies[0].huntMethodId, "combistick");
  assert.equal(sidecar.trophies[0].stage, "raw");
  assert.equal(sidecar.displaySlots.length, 12);
  assert.equal(sidecar.loadoutPresets.length, 4);
});

test("successful workshop actions project to the hall stage and a stable alcove", async () => {
  const baseSave = defaultSave(FIXED_TIME);
  baseSave.trophies = [trophy()];
  let state = createDefaultShipProgression(baseSave, FIXED_TIME);
  assert.equal(state.trophies[0].stage, "raw");

  const saveAfter = (completedActions) => ({
    ...baseSave,
    trophies: [
      trophy({
        workshop: {
          completedActions,
          bestScore: 600,
          lastCompletedAt: FIXED_TIME,
        },
      }),
    ],
  });

  state = synchronizeShipProgression(
    state,
    saveAfter(["clean"]),
    FIXED_TIME,
  );
  assert.equal(state.trophies[0].stage, "cleaned");
  assert.equal(state.trophies[0].displaySlotId, null);

  state = synchronizeShipProgression(
    state,
    saveAfter(["clean", "prepare"]),
    FIXED_TIME,
  );
  assert.equal(state.trophies[0].stage, "mounted");

  state = synchronizeShipProgression(
    state,
    saveAfter(["clean", "prepare", "display"]),
    FIXED_TIME,
  );
  assert.equal(state.trophies[0].stage, "displayed");
  assert.equal(state.trophies[0].displaySlotId, "display-1");
  assert.equal(state.displaySlots[0].claimId, "claim-cryo-1");

  const stableSlot = state.trophies[0].displaySlotId;
  state = synchronizeShipProgression(
    state,
    saveAfter(["clean", "prepare", "display", "rite"]),
    "2026-07-19T12:10:00.000Z",
  );
  assert.equal(state.trophies[0].stage, "displayed");
  assert.equal(state.trophies[0].displaySlotId, stableSlot);

  const hubSource = await readFile(
    resolve(projectRoot, "app/game/ShipHub.tsx"),
    "utf8",
  );
  assert.match(hubSource, /STAGE_LABELS\[trophy\.stage\]/);
});

test("trophy preparation enforces clean, mount, then display order", () => {
  const save = defaultSave(FIXED_TIME);
  save.trophies = [trophy()];
  let state = createDefaultShipProgression(save, FIXED_TIME);

  state = startTrophyMounting(state, "claim-cryo-1", FIXED_TIME);
  assert.equal(state.trophies[0].stage, "raw");

  state = startTrophyCleaning(state, "claim-cryo-1", FIXED_TIME);
  assert.equal(state.trophies[0].stage, "cleaning");
  state = advanceTrophyWorkshop(
    state,
    state.trophies[0].requiredCleaningSeconds,
    FIXED_TIME,
  );
  assert.equal(state.trophies[0].stage, "cleaned");

  state = startTrophyMounting(state, "claim-cryo-1", FIXED_TIME);
  state = advanceTrophyWorkshop(
    state,
    state.trophies[0].requiredMountingSeconds,
    FIXED_TIME,
  );
  assert.equal(state.trophies[0].stage, "mounted");

  state = placeTrophyOnDisplay(
    state,
    "claim-cryo-1",
    "display-1",
    FIXED_TIME,
  );
  assert.equal(state.trophies[0].stage, "displayed");
  assert.equal(state.trophies[0].displaySlotId, "display-1");
  assert.equal(state.displaySlots[0].claimId, "claim-cryo-1");

  const clan = evaluateClanProgression(save, state);
  assert.ok(
    clan.completedRites.some(({ id }) => id === "first-trophy"),
  );
  assert.ok(
    clan.completedRites.some(({ id }) => id === "trophy-artisan"),
  );
});

test("campaign context assigns deterministic hunt methods and unlocks many paths", () => {
  const save = defaultSave(FIXED_TIME);
  save.trophies = [
    trophy(),
    trophy({
      id: "claim-human-1",
      targetName: "Commandante Vey",
      targetKind: "human",
      missionId: "jungle-vey",
    }),
    trophy({
      id: "claim-yautja-1",
      targetName: "Le Bad Blood",
      targetKind: "yautja",
      missionId: "volcano-bad-blood",
      partId: "mask",
    }),
  ];
  const state = createDefaultShipProgression(save, FIXED_TIME);

  const clan = evaluateClanProgression(save, state);

  assert.equal(clan.trophiesBySpecies.cryostalker, 1);
  assert.equal(clan.trophiesBySpecies.human, 1);
  assert.equal(clan.trophiesBySpecies.yautja, 1);
  assert.equal(clan.trophiesByMethod.combistick, 1);
  assert.equal(clan.trophiesByMethod.wristblades, 1);
  assert.equal(clan.trophiesByMethod["plasma-caster"], 1);
  assert.equal(clan.trophiesByMethod.unknown, 0);
  assert.ok(clan.completedRites.some(({ id }) => id === "many-paths"));
  assert.equal(
    huntMethodForTrophy(save.trophies[0]),
    "combistick",
  );
});

test("secondary enemy identity prevents ice-world trophies from becoming Cryostalkers", () => {
  const iceMarine = trophy({
    id: "claim-ice-marine",
    missionId: "ice-cryostalker",
    sourceEnemyId: "colonial-sniper",
    targetName: "Tireur colonial",
    targetKind: "human",
  });
  const iceBeast = trophy({
    id: "claim-ice-beast",
    missionId: "ice-cryostalker",
    sourceEnemyId: "bonecrest-ravager",
    targetName: "Ravageur à crête osseuse",
    targetKind: "beast",
  });
  const cryostalker = trophy({
    id: "claim-regular-cryo",
    missionId: "ice-cryostalker",
    sourceEnemyId: "cryostalker-alpha",
    targetName: "Cryostalker Alpha",
    targetKind: "beast",
  });

  assert.equal(speciesForTrophy(iceMarine), "human");
  assert.equal(huntMethodForTrophy(iceMarine), "plasma-caster");
  assert.equal(speciesForTrophy(iceBeast), "apex-beast");
  assert.equal(huntMethodForTrophy(iceBeast), "combistick");
  assert.equal(speciesForTrophy(cryostalker), "cryostalker");
});

test("legacy unknown methods migrate while explicit telemetry remains authoritative", () => {
  const save = defaultSave(FIXED_TIME);
  save.trophies = [trophy()];
  const state = createDefaultShipProgression(save, FIXED_TIME);
  const legacy = {
    ...state,
    trophies: state.trophies.map((record) => ({
      ...record,
      huntMethodId: "unknown",
    })),
  };
  const migrated = normalizeShipProgression(
    legacy,
    save,
    "2026-07-19T12:00:10.000Z",
  );
  assert.equal(migrated.trophies[0].huntMethodId, "combistick");

  const overridden = setTrophyHuntMethod(
    migrated,
    "claim-cryo-1",
    "environment",
    "2026-07-19T12:00:11.000Z",
  );
  assert.equal(overridden.trophies[0].huntMethodId, "environment");
});

test("loadout slots keep equipment and appearance together", () => {
  const save = defaultSave(FIXED_TIME);
  let state = createDefaultShipProgression(save, FIXED_TIME);
  const customAppearance = {
    ...save.appearance,
    presetId: "custom",
    biomaskId: null,
    armorTintId: "bronze",
  };

  state = saveLoadoutPreset(
    state,
    "hunt-2",
    "Duel sans masque",
    save.loadout,
    customAppearance,
    FIXED_TIME,
  );
  const snapshot = loadLoadoutPreset(state, "hunt-2");

  assert.ok(snapshot);
  assert.notEqual(snapshot.loadout, save.loadout);
  assert.notEqual(snapshot.appearance, customAppearance);
  assert.equal(snapshot.appearance.biomaskId, null);
  assert.equal(snapshot.appearance.armorTintId, "bronze");
});

test("sidecar storage uses its own key and resynchronizes new core trophies", () => {
  const storage = memoryStorage();
  const save = defaultSave(FIXED_TIME);
  let state = createDefaultShipProgression(save, FIXED_TIME);

  writeShipProgression(state, save, storage);
  assert.ok(storage.getItem(SHIP_PROGRESSION_STORAGE_KEY));
  assert.equal(storage.getItem("yautja-long-hunt.save"), null);

  const progressedSave = {
    ...save,
    trophies: [trophy()],
  };
  state = loadShipProgression(progressedSave, storage);
  state = synchronizeShipProgression(
    state,
    progressedSave,
    FIXED_TIME,
  );

  assert.equal(state.trophies.length, 1);
  assert.equal(state.trophies[0].claimId, "claim-cryo-1");
});

test("workshop and medbay catch up wall time across hub unmounts and reloads", () => {
  const save = defaultSave(FIXED_TIME);
  save.trophies = [trophy()];
  let state = createDefaultShipProgression(save, FIXED_TIME);
  state = startTrophyCleaning(state, "claim-cryo-1", FIXED_TIME);

  const tenSecondsLater = "2026-07-19T12:00:10.000Z";
  state = normalizeShipProgression(state, save, tenSecondsLater);
  assert.equal(state.trophies[0].cleaningSeconds, 10);
  assert.equal(state.updatedAt, tenSecondsLater);

  const visualTick = advanceShipProgression(
    state,
    1,
    "2026-07-19T12:00:11.000Z",
  );
  assert.equal(visualTick.trophies[0].cleaningSeconds, 11);
  assert.equal(
    visualTick.updatedAt,
    "2026-07-19T12:00:11.000Z",
  );

  const afterReload = normalizeShipProgression(
    visualTick,
    save,
    "2026-07-19T12:01:40.000Z",
  );
  assert.equal(afterReload.trophies[0].stage, "cleaned");

  const mounting = startTrophyMounting(
    afterReload,
    "claim-cryo-1",
    "2026-07-19T12:01:40.000Z",
  );
  const mountingCatchUp = normalizeShipProgression(
    mounting,
    save,
    "2026-07-19T12:02:00.000Z",
  );
  assert.equal(mountingCatchUp.trophies[0].stage, "mounting");
  assert.equal(mountingCatchUp.trophies[0].mountingSeconds, 20);
  const mountedAfterReload = normalizeShipProgression(
    mountingCatchUp,
    save,
    "2026-07-19T12:04:40.000Z",
  );
  assert.equal(mountedAfterReload.trophies[0].stage, "mounted");

  const saveWithoutTrophies = defaultSave(FIXED_TIME);
  let medbayState = createDefaultShipProgression(
    saveWithoutTrophies,
    FIXED_TIME,
  );
  medbayState = startMedbayTreatment(
    medbayState,
    "minor-wounds",
    30,
    FIXED_TIME,
  );
  const medbayVisualTick = advanceShipProgression(
    medbayState,
    1,
    "2026-07-19T12:00:01.000Z",
  );
  assert.equal(medbayVisualTick.medbay.status, "treating");
  assert.equal(
    medbayVisualTick.updatedAt,
    "2026-07-19T12:00:01.000Z",
  );
  const medbayAfterReload = normalizeShipProgression(
    medbayVisualTick,
    saveWithoutTrophies,
    "2026-07-19T12:01:00.000Z",
  );
  assert.equal(medbayAfterReload.medbay.status, "ready");
  assert.equal(medbayAfterReload.medbay.treatmentsCompleted, 1);
  const stableReload = normalizeShipProgression(
    medbayAfterReload,
    saveWithoutTrophies,
    "2026-07-19T12:02:00.000Z",
  );
  assert.equal(stableReload.medbay.treatmentsCompleted, 1);
});

test("ShipHub declares seven rooms and keyboard, gamepad, and touch controls", async () => {
  const source = await readFile(
    resolve(projectRoot, "app/game/ShipHub.tsx"),
    "utf8",
  );
  const trainingSource = await readFile(
    resolve(projectRoot, "app/game/TrainingDrill.tsx"),
    "utf8",
  );
  const clientSource = await readFile(
    resolve(projectRoot, "app/game/GameClient.tsx"),
    "utf8",
  );
  const roomIds = [
    "bridge-map",
    "hangar",
    "armory",
    "trophy-hall",
    "medbay",
    "training",
    "archives",
  ];

  for (const roomId of roomIds) {
    assert.match(source, new RegExp(`id: "${roomId}"`));
  }
  assert.match(source, /navigator\.getGamepads/);
  assert.match(source, /event\.key === "ArrowLeft"/);
  assert.match(source, /onPointerDown=/);
  assert.match(source, /onOpenCustomization/);
  assert.match(source, /<TrainingDrill/);
  assert.match(source, /if \(!onTrainingRequested\)/);
  assert.doesNotMatch(source, /save\.statistics\.totalScans \* 2/);
  assert.match(trainingSource, /role="dialog"/);
  assert.match(trainingSource, /aria-label="Commandes tactiles"/);
  assert.match(trainingSource, /event\.key === "Escape"/);
  assert.match(clientSource, /<ShipHub/);
  assert.match(clientSource, /inventory=\{save\.inventory\}/);
  assert.match(
    clientSource,
    /highContrastVision=\{save\.settings\.highContrastVision\}/,
  );
  assert.match(clientSource, /onSound=\{playGameplaySound\}/);
  assert.match(clientSource, /audio\.startAmbience\(ambience/);
});
