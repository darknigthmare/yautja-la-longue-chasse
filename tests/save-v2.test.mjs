import assert from "node:assert/strict";
import { after, test } from "node:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "vite";

import {
  HUNTER_PRESETS,
  appearanceForPreset,
  loadoutForPreset,
} from "../app/game/hunterLore.ts";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputDirectory = await mkdtemp(join(tmpdir(), "yautja-save-v2-"));

after(async () => {
  await rm(outputDirectory, { force: true, recursive: true });
});

await build({
  configFile: false,
  logLevel: "silent",
  publicDir: false,
  build: {
    emptyOutDir: true,
    outDir: outputDirectory,
    ssr: resolve(projectRoot, "app/game/save.ts"),
    rollupOptions: {
      output: { entryFileNames: "save.mjs" },
    },
  },
});

const { SAVE_VERSION, applyMissionResult, defaultSave, normalizeSave } =
  await import(pathToFileURL(join(outputDirectory, "save.mjs")).href);

test("v1 saves migrate to v3 without losing legacy trophy data", () => {
  const legacy = defaultSave("2026-01-01T00:00:00.000Z");
  legacy.version = 1;
  delete legacy.appearance;
  legacy.profile.hunterName = "Kra'vak";
  legacy.trophies = [
    {
      id: "legacy-vey-claim",
      missionId: "jungle-vey",
      targetName: "Commandante Vey",
      quality: "elite",
      difficultyId: "elite",
      score: 91,
      claimedAt: "2026-01-02T00:00:00.000Z",
    },
  ];

  const migrated = normalizeSave(legacy);

  assert.equal(migrated.version, SAVE_VERSION);
  assert.equal(migrated.profile.hunterName, "Kra'vak");
  assert.deepEqual(migrated.appearance, {
    presetId: "jungle-hunter",
    bodyMorphId: "classic",
    skinId: "ochre-mottle",
    biomaskId: "jungle",
    dreadStyleId: "classic",
    dreadTintId: "obsidian",
    armorStyleId: "classic",
    armorTintId: "bronze",
    trophyAdornmentId: "skull-spine",
    laserColorId: "crimson",
  });
  assert.deepEqual(migrated.trophies[0], {
    id: "legacy-vey-claim",
    definitionId: "trophy-vey",
    targetName: "Commandante Vey",
    targetKind: "human",
    partId: "insignia",
    condition: "pristine",
    missionId: "jungle-vey",
    targetName: "Commandante Vey",
    quality: "elite",
    difficultyId: "elite",
    score: 91,
    claimedAt: "2026-01-02T00:00:00.000Z",
  });
});

test("appearance normalization accepts an unmasked hunter and repairs invalid ids", () => {
  const normalized = normalizeSave({
    ...defaultSave("2026-01-01T00:00:00.000Z"),
    appearance: {
      presetId: "custom",
      bodyMorphId: "classic",
      skinId: "invalid",
      biomaskId: null,
      dreadStyleId: "braided",
      dreadTintId: "umber",
      armorStyleId: "avp",
      armorTintId: "bronze",
      trophyAdornmentId: "skull-spine",
    },
  });

  assert.deepEqual(normalized.appearance, {
    presetId: "custom",
    bodyMorphId: "classic",
    skinId: "ochre-mottle",
    biomaskId: null,
    dreadStyleId: "braided",
    dreadTintId: "umber",
    armorStyleId: "avp",
    armorTintId: "bronze",
    trophyAdornmentId: "skull-spine",
    laserColorId: "crimson",
  });
});

test("every production hunter preset survives save normalization", () => {
  for (const preset of HUNTER_PRESETS) {
    const source = defaultSave("2026-01-01T00:00:00.000Z");
    source.appearance = appearanceForPreset(preset.id);

    assert.deepEqual(
      normalizeSave(source).appearance,
      appearanceForPreset(preset.id),
      `${preset.id}: save normalization must preserve the selected plate`,
    );
  }
});

test("a legendary id is downgraded to custom after any module changes", () => {
  for (const preset of HUNTER_PRESETS) {
    const exact = appearanceForPreset(preset.id);
    const mutations = {
      bodyMorphId: exact.bodyMorphId === "elder" ? "classic" : "elder",
      skinId:
        exact.skinId === "ashen-mottle" ? "ochre-mottle" : "ashen-mottle",
      biomaskId: exact.biomaskId === null ? "jungle" : null,
      dreadStyleId:
        exact.dreadStyleId === "braided" ? "classic" : "braided",
      dreadTintId: exact.dreadTintId === "umber" ? "obsidian" : "umber",
      armorStyleId:
        exact.armorStyleId === "avp" ? "classic" : "avp",
      armorTintId:
        exact.armorTintId === "bronze" ? "gunmetal" : "bronze",
      trophyAdornmentId:
        exact.trophyAdornmentId === "none" ? "skull-spine" : "none",
      laserColorId:
        exact.laserColorId === "electric" ? "crimson" : "electric",
    };

    for (const [moduleId, value] of Object.entries(mutations)) {
      const source = defaultSave("2026-01-01T00:00:00.000Z");
      source.appearance = { ...exact, [moduleId]: value };

      assert.equal(
        normalizeSave(source).appearance.presetId,
        "custom",
        `${preset.id}: changing ${moduleId} must break legendary identity`,
      );
    }

    for (const moduleId of Object.keys(mutations).filter(
      (id) => id !== "laserColorId",
    )) {
      const source = defaultSave("2026-01-01T00:00:00.000Z");
      source.appearance = { ...exact };
      delete source.appearance[moduleId];

      assert.equal(
        normalizeSave(source).appearance.presetId,
        "custom",
        `${preset.id}: missing ${moduleId} must break legendary identity`,
      );
    }
  }
});

test("legacy v3 legendary saves may omit only the former optional laser color", () => {
  const source = defaultSave("2026-01-01T00:00:00.000Z");
  source.appearance = appearanceForPreset("wolf");
  delete source.appearance.laserColorId;

  assert.deepEqual(
    normalizeSave(source).appearance,
    appearanceForPreset("wolf"),
  );
});

test("every legendary playable kit survives a normalized save round-trip", () => {
  for (const preset of HUNTER_PRESETS) {
    const source = defaultSave("2026-01-01T00:00:00.000Z");
    const loadout = loadoutForPreset(preset.id);
    source.appearance = appearanceForPreset(preset.id);
    source.loadout = loadout;
    source.inventory.unlockedArmorIds = [
      ...new Set([
        ...source.inventory.unlockedArmorIds,
        loadout.armorId,
      ]),
    ];
    source.inventory.unlockedWeaponIds = [
      ...new Set([
        ...source.inventory.unlockedWeaponIds,
        ...loadout.weaponIds,
      ]),
    ];
    source.inventory.unlockedGearIds = [
      ...new Set([
        ...source.inventory.unlockedGearIds,
        ...loadout.gearIds,
      ]),
    ];

    const normalized = normalizeSave(source);
    assert.deepEqual(
      normalized.appearance,
      appearanceForPreset(preset.id),
      `${preset.id}: exact appearance must survive`,
    );
    assert.deepEqual(
      normalized.loadout,
      loadout,
      `${preset.id}: signature projection must survive`,
    );
  }
});

test("Scout loadouts use upgraded capacity and never fall back to Hunter", () => {
  const source = defaultSave("2026-01-01T00:00:00.000Z");
  source.inventory.unlockedArmorIds.push("scout");
  source.inventory.armorUpgrades.scout = 1;
  source.loadout = {
    armorId: "scout",
    weaponIds: ["combistick", "plasma-caster"],
    gearIds: ["motion-sensor", "audio-decoy"],
  };

  const upgraded = normalizeSave(source);
  assert.equal(upgraded.loadout.armorId, "scout");
  assert.deepEqual(upgraded.loadout.weaponIds, [
    "combistick",
    "plasma-caster",
  ]);

  source.inventory.armorUpgrades.scout = 0;
  const repaired = normalizeSave(source);
  assert.equal(repaired.loadout.armorId, "scout");
  assert.deepEqual(repaired.loadout.weaponIds, [
    "wristblades",
    "combistick",
  ]);
});

test("mission claims persist separately and deduplicate only by claim id", () => {
  const result = {
    missionId: "jungle-vey",
    difficultyId: "hunter",
    outcome: "success",
    score: 83,
    elapsedSeconds: 240,
    completedObjectiveIds: [],
    honorEvents: [],
    trophyQuality: "blooded",
    trophyClaims: [
      {
        id: "vey-skull",
        definitionId: "human-skull",
        targetName: "Commandante Vey",
        targetKind: "human",
        partId: "skull",
        condition: "intact",
        quality: "blooded",
      },
      {
        id: "vey-spine",
        definitionId: "human-skull-spine",
        targetName: "Commandante Vey",
        targetKind: "human",
        partId: "skull-and-spine",
        condition: "pristine",
        quality: "flawless",
      },
      {
        id: "vey-skull",
        definitionId: "duplicate-is-replaced",
        targetName: "Commandante Vey",
        targetKind: "human",
        partId: "skull",
        condition: "damaged",
        quality: "worthy",
      },
    ],
    kills: 4,
    scans: 1,
    secondWindUsed: false,
    completedAt: "2026-01-03T00:00:00.000Z",
  };

  const progressed = applyMissionResult(defaultSave(), result);

  assert.equal(progressed.trophies.length, 2);
  assert.deepEqual(
    progressed.trophies.map(({ id }) => id).sort(),
    ["vey-skull", "vey-spine"],
  );
  assert.equal(
    progressed.trophies.find(({ id }) => id === "vey-skull").definitionId,
    "duplicate-is-replaced",
  );
});

test("legacy mission results infer a complete claim from trophyQuality", () => {
  const progressed = applyMissionResult(defaultSave(), {
    missionId: "volcano-bad-blood",
    difficultyId: "elite",
    outcome: "success",
    score: 94,
    elapsedSeconds: 300,
    completedObjectiveIds: [],
    honorEvents: [],
    trophyQuality: "elite",
    kills: 1,
    scans: 2,
    secondWindUsed: false,
    completedAt: "2026-01-04T00:00:00.000Z",
  });

  assert.deepEqual(progressed.trophies[0], {
    id: "trophy-bad-blood",
    definitionId: "trophy-bad-blood",
    targetName: "Le Bad Blood",
    targetKind: "yautja",
    partId: "mask",
    condition: "pristine",
    quality: "elite",
    missionId: "volcano-bad-blood",
    difficultyId: "elite",
    score: 94,
    claimedAt: "2026-01-04T00:00:00.000Z",
  });
});

test("trophy normalization retains the newest 200 unique claim ids", () => {
  const source = defaultSave("2026-01-01T00:00:00.000Z");
  source.trophies = Array.from({ length: 205 }, (_, index) => ({
    id: `claim-${index}`,
    definitionId: "human-skull",
    targetName: "Commandante Vey",
    targetKind: "human",
    partId: "skull",
    condition: "intact",
    missionId: "jungle-vey",
    targetName: "Commandante Vey",
    quality: "blooded",
    difficultyId: "hunter",
    score: 50,
    claimedAt: new Date(Date.UTC(2026, 0, 1, 0, 0, index)).toISOString(),
  }));

  const normalized = normalizeSave(source);

  assert.equal(normalized.trophies.length, 200);
  assert.equal(normalized.trophies[0].id, "claim-5");
  assert.equal(normalized.trophies.at(-1).id, "claim-204");
});

test("trophy workshop progress survives normalization", () => {
  const source = defaultSave("2026-01-01T00:00:00.000Z");
  source.trophies = [
    {
      id: "ritual-vey",
      definitionId: "trophy-vey",
      targetName: "Commandante Vey",
      targetKind: "human",
      partId: "skull",
      condition: "pristine",
      missionId: "jungle-vey",
      quality: "flawless",
      difficultyId: "elder",
      score: 100,
      claimedAt: "2026-01-02T00:00:00.000Z",
      workshop: {
        completedActions: ["clean", "prepare", "display", "rite"],
        bestScore: 8_400,
        lastCompletedAt: "2026-01-03T00:00:00.000Z",
      },
    },
  ];

  assert.deepEqual(normalizeSave(source).trophies[0].workshop, {
    completedActions: ["clean", "prepare", "display", "rite"],
    bestScore: 8_400,
    lastCompletedAt: "2026-01-03T00:00:00.000Z",
  });
});
