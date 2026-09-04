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
import { MISSION_BY_ID } from "../app/game/data.ts";

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

let apexClaimSequence = 0;

function requiredObjectiveIds(missionId) {
  return MISSION_BY_ID[missionId].objectives
    .filter(({ required, kind }) => required || kind === "extract")
    .map(({ id }) => id);
}

function successfulResult(overrides = {}) {
  const missionId = overrides.missionId ?? "jungle-vey";
  const mission = MISSION_BY_ID[missionId];
  const trophyQuality = overrides.trophyQuality ?? "flawless";
  const condition =
    trophyQuality === "worthy"
      ? "damaged"
      : trophyQuality === "blooded"
        ? "intact"
        : "pristine";
  const defaults = {
    missionId,
    difficultyId: "hunter",
    outcome: "success",
    score: 100,
    elapsedSeconds: 240,
    completedObjectiveIds: requiredObjectiveIds(missionId),
    honorEvents: [],
    trophyQuality,
    trophyClaims: [
      {
        id: `${missionId}-apex-${++apexClaimSequence}`,
        definitionId: mission.trophy.id,
        targetName: mission.targetName,
        targetKind: mission.targetKind,
        partId: mission.trophy.partId,
        condition,
        quality: trophyQuality,
      },
    ],
    kills: 4,
    scans: 3,
    secondWindUsed: false,
    completedAt: "2026-01-03T00:00:00.000Z",
  };
  return { ...defaults, ...overrides };
}

function assertSuccessRejected(save, result) {
  const before = structuredClone(save);
  const returned = applyMissionResult(save, result);

  assert.deepEqual(returned, before);
  assert.deepEqual(save, before);
}

test("v1 saves migrate to the current schema without losing legacy trophy data", () => {
  const legacy = defaultSave("2026-01-01T00:00:00.000Z");
  legacy.version = 1;
  delete legacy.appearance;
  delete legacy.settings.controlBindings;
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
  assert.deepEqual(
    migrated.settings.controlBindings,
    defaultSave("2026-01-01T00:00:00.000Z").settings.controlBindings,
  );
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

test("keyboard bindings persist custom keys and repair malformed profiles", () => {
  const source = defaultSave("2026-01-01T00:00:00.000Z");
  assert.equal(Object.keys(source.settings.controlBindings).length, 73);
  assert.deepEqual(source.settings.controlBindings["hunt.moveLeft"], [
    "KeyQ",
    "ArrowLeft",
  ]);

  source.settings.controlBindings = {
    ...source.settings.controlBindings,
    "hunt.moveLeft": ["F24"],
  };
  const customized = normalizeSave(source);
  assert.deepEqual(customized.settings.controlBindings["hunt.moveLeft"], [
    "F24",
  ]);

  const corrupted = structuredClone(source);
  corrupted.settings.controlBindings = {
    "hunt.moveLeft": [],
    "unknown.action": ["KeyA"],
  };
  const repaired = normalizeSave(corrupted);
  assert.deepEqual(
    repaired.settings.controlBindings,
    defaultSave("2026-01-01T00:00:00.000Z").settings.controlBindings,
  );

  const conflicting = structuredClone(source);
  conflicting.settings.controlBindings["hunt.moveRight"] = ["F24"];
  assert.deepEqual(
    normalizeSave(conflicting).settings.controlBindings,
    defaultSave("2026-01-01T00:00:00.000Z").settings.controlBindings,
  );
});

test("bestiary discoveries normalize to unique authored V7 and V8 roster ids", () => {
  const source = defaultSave("2026-01-01T00:00:00.000Z");
  assert.deepEqual(source.codex.discoveredEnemyIds, []);
  source.codex.discoveredEnemyIds = [
    "hell-hound-stalker",
    "missing-enemy",
    "common--colonial-patrol",
    "hell-hound-stalker",
    42,
    null,
    "oseris-iv--vey-jungle-marine",
  ];

  const normalized = normalizeSave(source);

  assert.deepEqual(normalized.codex.discoveredEnemyIds, [
    "hell-hound-stalker",
    "common--colonial-patrol",
    "oseris-iv--vey-jungle-marine",
  ]);

  delete source.codex.discoveredEnemyIds;
  assert.deepEqual(normalizeSave(source).codex.discoveredEnemyIds, []);
});

test("legacy saves derive defeated V8 bosses without replacing an explicit discovery list", () => {
  const legacy = defaultSave("2026-01-01T00:00:00.000Z");
  legacy.missionProgress["swamp-hydra"].status = "completed";
  legacy.missionProgress["swamp-hydra"].completions = 1;
  delete legacy.codex.discoveredEnemyIds;

  const migrated = normalizeSave(legacy);
  assert.deepEqual(migrated.codex.discoveredEnemyIds, [
    "naraka-delta--delta-hydra-juvenile",
  ]);

  legacy.codex.discoveredEnemyIds = ["hell-hound-stalker"];
  const explicit = normalizeSave(legacy);
  assert.deepEqual(explicit.codex.discoveredEnemyIds, [
    "hell-hound-stalker",
  ]);
});

test("mission results persistently merge only valid bestiary discoveries", () => {
  const source = defaultSave("2026-01-01T00:00:00.000Z");
  source.codex.discoveredEnemyIds = ["hell-hound-stalker"];
  const completed = applyMissionResult(
    source,
    successfulResult({
      discoveredEnemyIds: [
        "hell-hound-stalker",
        "common--colonial-patrol",
        "not-in-either-roster",
        "common--colonial-patrol",
      ],
    }),
  );

  assert.deepEqual(completed.codex.discoveredEnemyIds, [
    "hell-hound-stalker",
    "common--colonial-patrol",
  ]);
  assert.deepEqual(source.codex.discoveredEnemyIds, ["hell-hound-stalker"]);

  const failed = applyMissionResult(
    completed,
    successfulResult({
      outcome: "failed",
      completedObjectiveIds: [],
      trophyQuality: null,
      trophyClaims: [],
      discoveredEnemyIds: [
        "oseris-iv--vey-jungle-marine",
        "unknown-failure-contact",
      ],
    }),
  );
  assert.deepEqual(failed.codex.discoveredEnemyIds, [
    "hell-hound-stalker",
    "common--colonial-patrol",
    "oseris-iv--vey-jungle-marine",
  ]);
});

test("v3 completion at Cinder reopens the five-mission V4 campaign extension", () => {
  const legacy = defaultSave("2026-01-01T00:00:00.000Z");
  legacy.version = 3;
  legacy.storyCompleted = true;
  legacy.settings.difficultyId = "elder";
  legacy.missionProgress["jungle-vey"].status = "completed";
  legacy.missionProgress["jungle-vey"].completions = 1;
  legacy.missionProgress["ice-cryostalker"].status = "completed";
  legacy.missionProgress["ice-cryostalker"].completions = 1;
  legacy.missionProgress["volcano-bad-blood"].status = "completed";
  legacy.missionProgress["volcano-bad-blood"].completions = 1;

  const migrated = normalizeSave(legacy);

  assert.equal(migrated.version, SAVE_VERSION);
  assert.equal(migrated.storyCompleted, false);
  assert.equal(migrated.settings.difficultyId, "elite");
  assert.equal(migrated.missionProgress["swamp-hydra"].status, "available");
  assert.equal(migrated.missionProgress["ruins-ancient-guardian"].status, "locked");
});

test("a current save cannot retain Elder before the extended story is complete", () => {
  const corrupted = defaultSave("2026-01-01T00:00:00.000Z");
  corrupted.settings.difficultyId = "elder";
  corrupted.storyCompleted = false;

  const normalized = normalizeSave(corrupted);

  assert.equal(normalized.storyCompleted, false);
  assert.equal(normalized.settings.difficultyId, "elite");
});

test("Elder remains selected when final mission progress proves the unlock", () => {
  const completed = defaultSave("2026-01-01T00:00:00.000Z");
  completed.settings.difficultyId = "elder";
  completed.storyCompleted = false;
  completed.missionProgress["ruins-ancient-guardian"].completions = 1;

  const normalized = normalizeSave(completed);

  assert.equal(normalized.storyCompleted, true);
  assert.equal(normalized.settings.difficultyId, "elder");
});

test("a corrupted completed status without a completion cannot unlock the campaign", () => {
  const corrupted = defaultSave("2026-01-01T00:00:00.000Z");
  for (const progress of Object.values(corrupted.missionProgress)) {
    progress.status = "completed";
    progress.completions = 0;
  }

  const repaired = normalizeSave(corrupted);

  assert.equal(repaired.missionProgress["jungle-vey"].status, "available");
  assert.equal(repaired.missionProgress["ice-cryostalker"].status, "locked");
  assert.equal(repaired.missionProgress["swamp-hydra"].status, "locked");
  assert.equal(repaired.missionProgress["ruins-ancient-guardian"].status, "locked");
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

test("dedicated V14 biomasks survive an exact normalized save round-trip", () => {
  const dedicatedMasks = {
    boar: "boar",
    snake: "snake",
    falconer: "falconer",
  };

  for (const [presetId, biomaskId] of Object.entries(dedicatedMasks)) {
    const source = defaultSave("2026-01-01T00:00:00.000Z");
    source.appearance = appearanceForPreset(presetId);

    const normalized = normalizeSave(source);
    assert.equal(
      normalized.appearance.biomaskId,
      biomaskId,
      `${presetId}: dedicated biomask must survive normalization`,
    );
    assert.deepEqual(
      normalizeSave(structuredClone(normalized)).appearance,
      normalized.appearance,
      `${presetId}: dedicated biomask must remain stable after a second pass`,
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

test("a locked mission cannot accept an otherwise complete success", () => {
  const save = defaultSave("2026-01-01T00:00:00.000Z");
  assert.equal(save.missionProgress["ice-cryostalker"].status, "locked");

  assertSuccessRejected(
    save,
    successfulResult({ missionId: "ice-cryostalker" }),
  );
});

test("Elder success is rejected before the story is complete", () => {
  const save = defaultSave("2026-01-01T00:00:00.000Z");

  assertSuccessRejected(
    save,
    successfulResult({ difficultyId: "elder" }),
  );
});

test("success requires every required objective including extraction", () => {
  const save = defaultSave("2026-01-01T00:00:00.000Z");
  const mission = MISSION_BY_ID["jungle-vey"];
  const requiredIds = requiredObjectiveIds(mission.id);
  const extractionId = mission.objectives.find(
    ({ kind }) => kind === "extract",
  ).id;

  assertSuccessRejected(
    save,
    successfulResult({
      completedObjectiveIds: requiredIds.filter(
        (id) => id !== requiredIds[0],
      ),
    }),
  );
  assertSuccessRejected(
    save,
    successfulResult({
      completedObjectiveIds: requiredIds.filter(
        (id) => id !== extractionId,
      ),
    }),
  );
});

test("modern success requires an explicit Apex claim", () => {
  const save = defaultSave("2026-01-01T00:00:00.000Z");
  const result = successfulResult();
  result.trophyClaims = result.trophyClaims.map((claim) => ({
    ...claim,
    definitionId: "human-skull",
  }));

  assertSuccessRejected(save, result);
});

test("mission claims persist separately and deduplicate only by claim id", () => {
  const result = {
    missionId: "jungle-vey",
    difficultyId: "hunter",
    outcome: "success",
    score: 83,
    elapsedSeconds: 240,
    completedObjectiveIds: requiredObjectiveIds("jungle-vey"),
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
        sourceEnemyId: "colonial-heavy",
        targetName: "Commandante Vey",
        targetKind: "human",
        partId: "skull-and-spine",
        condition: "pristine",
        quality: "flawless",
      },
      {
        id: "vey-apex",
        definitionId: "trophy-vey",
        targetName: "Commandante Vey",
        targetKind: "human",
        partId: "insignia",
        condition: "intact",
        quality: "blooded",
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

  assert.equal(progressed.trophies.length, 3);
  assert.deepEqual(
    progressed.trophies.map(({ id }) => id).sort(),
    ["vey-apex", "vey-skull", "vey-spine"],
  );
  assert.equal(
    progressed.trophies.find(({ id }) => id === "vey-skull").definitionId,
    "duplicate-is-replaced",
  );
  assert.equal(
    progressed.trophies.find(({ id }) => id === "vey-spine").sourceEnemyId,
    "colonial-heavy",
  );
});

test("legacy mission results infer a complete claim from trophyQuality", () => {
  const legacyResult = successfulResult({
    difficultyId: "elite",
    score: 94,
    trophyQuality: "elite",
    completedAt: "2026-01-04T00:00:00.000Z",
  });
  delete legacyResult.trophyClaims;
  const progressed = applyMissionResult(defaultSave(), legacyResult);

  assert.deepEqual(progressed.trophies[0], {
    id: "trophy-vey",
    definitionId: "trophy-vey",
    targetName: "Commandante Vey",
    targetKind: "human",
    partId: "insignia",
    condition: "pristine",
    quality: "elite",
    missionId: "jungle-vey",
    difficultyId: "elite",
    score: 94,
    claimedAt: "2026-01-04T00:00:00.000Z",
  });
});

test("perfect replays award renewable but bounded mastery honor", () => {
  const firstCompletion = applyMissionResult(
    defaultSave("2026-01-01T00:00:00.000Z"),
    successfulResult(),
  );
  const withoutEvents = applyMissionResult(
    firstCompletion,
    successfulResult(),
  );
  const withoutEventsReward =
    withoutEvents.profile.honor - firstCompletion.profile.honor;
  assert.equal(withoutEventsReward, 17);

  const withSecondaryTrophy = applyMissionResult(
    withoutEvents,
    successfulResult({
      honorEvents: [
        {
          id: "secondary-trophy",
          label: "Prise secondaire",
          value: 2,
          kind: "objective",
        },
      ],
    }),
  );
  const secondaryTrophyReward =
    withSecondaryTrophy.profile.honor - withoutEvents.profile.honor;
  assert.equal(secondaryTrophyReward, 18);
  assert.ok(secondaryTrophyReward > withoutEventsReward);

  const dishonorableReplay = applyMissionResult(
    withSecondaryTrophy,
    successfulResult({
      honorEvents: [
        {
          id: "major-violation",
          label: "Code rompu",
          value: -100,
          kind: "violation",
        },
      ],
    }),
  );
  assert.equal(
    dishonorableReplay.profile.honor - withSecondaryTrophy.profile.honor,
    0,
  );

  const elderReady = {
    ...dishonorableReplay,
    storyCompleted: true,
  };
  const cappedReplay = applyMissionResult(
    elderReady,
    successfulResult({
      difficultyId: "elder",
      honorEvents: [
        {
          id: "mastery-a",
          label: "Maîtrise",
          value: 50,
          kind: "objective",
        },
        {
          id: "mastery-b",
          label: "Rite",
          value: 50,
          kind: "objective",
        },
      ],
    }),
  );
  assert.equal(cappedReplay.profile.honor - elderReady.profile.honor, 64);
  assert.ok(
    cappedReplay.profile.honor - elderReady.profile.honor <
      firstCompletion.profile.honor,
  );
});

test("trophy normalization retains the newest 500 unique claim ids", () => {
  const source = defaultSave("2026-01-01T00:00:00.000Z");
  source.trophies = Array.from({ length: 505 }, (_, index) => ({
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

  assert.equal(normalized.trophies.length, 500);
  assert.equal(normalized.trophies[0].id, "claim-5");
  assert.equal(normalized.trophies.at(-1).id, "claim-504");
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
