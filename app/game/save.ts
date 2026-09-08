import { defaultJusticeProgress, normalizeJusticeProgress } from "./systems/justice";
import { defaultHomeworldProgress, normalizeHomeworldProgress } from "./systems/homeworld";
import {
  ARMORS,
  CODEX_ENTRIES,
  DIFFICULTIES,
  DIFFICULTY_BY_ID,
  GEAR,
  MISSIONS,
  MISSION_BY_ID,
  WEAPONS,
} from "./data";
import {
  HUNTER_PRESETS,
  appearanceForPreset,
  type HunterLorePresetId,
} from "./hunterLore";
import { ENEMY_V7_DEFINITIONS } from "./enemyRosterV7";
import {
  ECOLOGY_V8_BOSS_ENEMY_IDS,
  ECOLOGY_V8_ENEMIES,
} from "./ecologyV8";
import {
  DEFAULT_CONTROL_BINDINGS,
  normalizeControlBindings,
} from "./systems/controlBindings";
import {
  defaultExplorationProgress,
  explorationForMission,
  mergeExplorationProgress,
  normalizeExplorationProgress,
} from "./systems/explorationProgress";
import type {
  ArmorId,
  CodexEntryId,
  DifficultyId,
  GearId,
  HunterAppearance,
  Loadout,
  MissionId,
  MissionProgress,
  MissionProgressStatus,
  MissionResult,
  RankId,
  SaveGame,
  TrophyClaim,
  TrophyCondition,
  TrophyPartId,
  TrophyQuality,
  TrophyRecord,
  UpgradeLevel,
  WeaponId,
} from "./types";

// ---------------------------------------------------------------------------
// Storage schema and defaults
// ---------------------------------------------------------------------------

export const SAVE_VERSION = 7;
export const SAVE_STORAGE_KEY = "yautja-long-hunt.save";
export const SAVE_MAX_SERIALIZED_BYTES = 1024 * 1024;
const SAVE_EXPORT_FORMAT = "yautja-long-hunt.save-export";
const FINAL_STORY_MISSION_ID: MissionId = "ruins-ancient-guardian";

export const RANK_THRESHOLDS: Readonly<Record<RankId, number>> = {
  "young-blood": 0,
  blooded: 250,
  elite: 650,
  elder: 1_800,
};

const DEFAULT_LOADOUT: Loadout = {
  armorId: "hunter",
  weaponIds: ["combistick", "plasma-caster"],
  gearIds: ["motion-sensor", "audio-decoy"],
};

export const DEFAULT_HUNTER_APPEARANCE: Readonly<HunterAppearance> = {
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
};

const WEAPON_IDS = WEAPONS.map((weapon) => weapon.id);
const GEAR_IDS = GEAR.map((gear) => gear.id);
const ARMOR_IDS = ARMORS.map((armor) => armor.id);
const DIFFICULTY_IDS = DIFFICULTIES.map((difficulty) => difficulty.id);
const MISSION_IDS = MISSIONS.map((mission) => mission.id);
const HUNTER_SKIN_IDS = [
  "ochre-mottle",
  "ashen-mottle",
  "dark-mottle",
] as const;
const LASER_COLOR_IDS = [
  "crimson",
  "electric",
  "amber",
  "violet",
  "cyan",
] as const;
const HUNTER_PRESET_IDS = [
  "custom",
  ...HUNTER_PRESETS.map(({ id }) => id),
] as const;
const HUNTER_BODY_MORPH_IDS = [
  "classic",
  "elder",
  "super",
  "feral",
  "huntress",
  "young",
] as const;
const HUNTER_ARMOR_STYLE_IDS = [
  "classic",
  "city",
  "avp",
  "super",
  "feral",
] as const;
const BIOMASK_IDS = [
  "jungle",
  "city",
  "elder",
  "scar",
  "celtic",
  "chopper",
  "wolf",
  "feral",
  "boar",
  "snake",
  "falconer",
  "berserker",
  "fugitive",
  "dek",
  "enforcer",
] as const;
const DREAD_STYLE_IDS = [
  "classic",
  "ringed",
  "braided",
  "veteran",
  "elder",
  "temple",
  "feral",
  "huntress",
] as const;
const DREAD_TINT_IDS = ["obsidian", "umber", "ashen"] as const;
const ARMOR_TINT_IDS = ["gunmetal", "bronze", "obsidian"] as const;
const TROPHY_ADORNMENT_IDS = ["none", "skull-spine"] as const;
const TROPHY_PART_IDS = [
  "skull",
  "skull-and-spine",
  "mask",
  "insignia",
] as const;
const TROPHY_CONDITIONS = ["damaged", "intact", "pristine"] as const;
const TROPHY_WORKSHOP_ACTION_IDS = [
  "clean",
  "prepare",
  "display",
  "rite",
] as const;
const DISCOVERABLE_ENEMY_IDS = [
  ...new Set([
    ...ENEMY_V7_DEFINITIONS.map(({ id }) => id),
    ...ECOLOGY_V8_ENEMIES.map(({ id }) => id),
  ]),
] as readonly string[];
const DISCOVERABLE_ENEMY_ID_SET = new Set(DISCOVERABLE_ENEMY_IDS);
// There cannot be more persisted discoveries than authored roster entries.
// The wider input cap also bounds work on hostile/corrupt payloads while
// tolerating duplicates from long mission sessions.
const MAX_DISCOVERED_ENEMY_IDS = DISCOVERABLE_ENEMY_IDS.length;
const MAX_DISCOVERED_ENEMY_INPUT_ITEMS = Math.max(
  512,
  MAX_DISCOVERED_ENEMY_IDS * 4,
);
// The V18 field guide exposes 228 enemy identities in addition to the eight
// Apex claims. Keep enough physical slots to complete that collection while
// still bounding malformed or endlessly replayed saves.
const MAX_TROPHY_RECORDS = 500;
const REPLAY_HONOR_BASE_RATE = 0.05;
const REPLAY_HONOR_SCORE_RATE = 0.1;
const REPLAY_HONOR_EVENT_RATE = 0.5;
const REPLAY_HONOR_PROGRESS_CAP = 20;
const REPLAY_HONOR_RAW_CAP = 40;

const TROPHY_QUALITY_ORDER: Readonly<Record<TrophyQuality, number>> = {
  worthy: 1,
  blooded: 2,
  elite: 3,
  flawless: 4,
};

const DIFFICULTY_ORDER: Readonly<Record<DifficultyId, number>> = {
  "young-blood": 0,
  hunter: 1,
  elite: 2,
  elder: 3,
};

function initialWeaponUpgrades(): Record<WeaponId, UpgradeLevel> {
  return {
    wristblades: 0,
    combistick: 0,
    "plasma-caster": 0,
    "smart-disc": 0,
    "yautja-bow": 0,
  };
}

function initialGearUpgrades(): Record<GearId, UpgradeLevel> {
  return {
    netgun: 0,
    "motion-sensor": 0,
    "audio-decoy": 0,
    snare: 0,
  };
}

function initialArmorUpgrades(): Record<ArmorId, UpgradeLevel> {
  return {
    scout: 0,
    hunter: 0,
    berserker: 0,
  };
}

function emptyMissionProgress(
  status: MissionProgressStatus,
): MissionProgress {
  return {
    status,
    attempts: 0,
    completions: 0,
    bestScore: 0,
    bestTimeSeconds: null,
    bestDifficultyId: null,
    completedObjectiveIds: [],
    lastPlayedAt: null,
  };
}

function initialMissionProgress(): Record<MissionId, MissionProgress> {
  return Object.fromEntries(
    MISSIONS.map((mission) => [
      mission.id,
      emptyMissionProgress(
        mission.prerequisiteMissionId === null ? "available" : "locked",
      ),
    ]),
  ) as Record<MissionId, MissionProgress>;
}

/**
 * Create a fresh save. The optional timestamp makes deterministic tests easy
 * without forcing production callers to provide a clock.
 */
export function defaultSave(now = new Date().toISOString()): SaveGame {
  return {
    version: SAVE_VERSION,
    createdAt: now,
    updatedAt: now,
    profile: {
      hunterName: "Chasseur sans nom",
      rankId: "young-blood",
      honor: 0,
      clanMarks: 0,
      playTimeSeconds: 0,
    },
    inventory: {
      unlockedWeaponIds: [
        "wristblades",
        "combistick",
        "plasma-caster",
      ],
      unlockedGearIds: ["motion-sensor", "audio-decoy"],
      unlockedArmorIds: ["hunter"],
      weaponUpgrades: initialWeaponUpgrades(),
      gearUpgrades: initialGearUpgrades(),
      armorUpgrades: initialArmorUpgrades(),
    },
    loadout: {
      armorId: DEFAULT_LOADOUT.armorId,
      weaponIds: [...DEFAULT_LOADOUT.weaponIds],
      gearIds: [...DEFAULT_LOADOUT.gearIds],
    },
    appearance: { ...DEFAULT_HUNTER_APPEARANCE },
    missionProgress: initialMissionProgress(),
    trophies: [],
    exploration: defaultExplorationProgress(),
    codex: {
      unlockedEntryIds: [
        "yautja-honor",
        "biomask",
        "cloaking-device",
      ],
      scanCounts: {},
      discoveredEnemyIds: [],
    },
    statistics: {
      missionsStarted: 0,
      missionsCompleted: 0,
      missionsFailed: 0,
      totalKills: 0,
      totalScans: 0,
      secondWindsUsed: 0,
      bestHuntStreak: 0,
      currentHuntStreak: 0,
    },
    settings: {
      difficultyId: "hunter",
      masterVolume: 0.8,
      musicVolume: 0.65,
      effectsVolume: 0.85,
      screenShake: true,
      reducedGore: false,
      highContrastVision: false,
      controlBindings: DEFAULT_CONTROL_BINDINGS,
    },
    storyCompleted: false,
    homeworld: defaultHomeworldProgress(),
    justice: defaultJusticeProgress(),
  };
}

// ---------------------------------------------------------------------------
// Defensive parsing and schema migration
// ---------------------------------------------------------------------------

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function finiteNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : fallback;
}

function nonNegativeInteger(value: unknown, fallback: number): number {
  return Math.min(Number.MAX_SAFE_INTEGER, Math.max(0, Math.round(finiteNumber(value, fallback))));
}

function boundedNumber(
  value: unknown,
  fallback: number,
  minimum: number,
  maximum: number,
): number {
  return clamp(finiteNumber(value, fallback), minimum, maximum);
}

function stringValue(value: unknown, fallback: string): string {
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

function identifierValue(value: unknown, fallback: string): string {
  if (typeof value !== "string") {
    return fallback;
  }
  const trimmed = value.trim();
  return (trimmed.length > 0 ? trimmed : fallback).slice(0, 128);
}

function booleanValue(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function isOneOf<T extends string>(
  value: unknown,
  allowed: readonly T[],
): value is T {
  return typeof value === "string" && allowed.includes(value as T);
}

function uniqueAllowedIds<T extends string>(
  value: unknown,
  allowed: readonly T[],
  fallback: readonly T[],
): T[] {
  if (!Array.isArray(value)) {
    return [...fallback];
  }

  return [
    ...new Set(
      value.filter((item): item is T => isOneOf(item, allowed)),
    ),
  ];
}

function normalizeDiscoveredEnemyIds(
  value: unknown,
  fallback: readonly string[] = [],
): string[] {
  const source = Array.isArray(value) ? value : fallback;
  const discoveredEnemyIds: string[] = [];
  const seen = new Set<string>();
  const inputLength = Math.min(
    source.length,
    MAX_DISCOVERED_ENEMY_INPUT_ITEMS,
  );

  for (let index = 0; index < inputLength; index += 1) {
    const id = source[index];
    if (
      typeof id !== "string" ||
      seen.has(id) ||
      !DISCOVERABLE_ENEMY_ID_SET.has(id)
    ) {
      continue;
    }
    seen.add(id);
    discoveredEnemyIds.push(id);
    if (discoveredEnemyIds.length >= MAX_DISCOVERED_ENEMY_IDS) {
      break;
    }
  }

  return discoveredEnemyIds;
}

function validIsoDate(value: unknown, fallback: string): string {
  if (typeof value !== "string") {
    return fallback;
  }

  return Number.isNaN(Date.parse(value)) ? fallback : value;
}

/**
 * Version zero was the pre-release shape used by early local builds. It used
 * the same top-level names but carried no explicit version, so migration only
 * needs to stamp the first public schema before normalization fills gaps.
 */
const SAVE_MIGRATIONS: Readonly<
  Record<number, (input: UnknownRecord) => UnknownRecord>
> = {
  0: (input) => ({ ...input, version: 1 }),
  1: (input) => ({
    ...input,
    version: 2,
    appearance: isRecord(input.appearance)
      ? input.appearance
      : { ...DEFAULT_HUNTER_APPEARANCE },
  }),
  2: (input) => ({
    ...input,
    version: 3,
    appearance: isRecord(input.appearance)
      ? {
          ...input.appearance,
          presetId: "jungle-hunter",
          bodyMorphId: "classic",
          armorStyleId: "classic",
          biomaskId:
            input.appearance.biomaskId === "scarred"
              ? "scar"
              : input.appearance.biomaskId,
        }
      : { ...DEFAULT_HUNTER_APPEARANCE },
  }),
  3: (input) => {
    const missionProgress = isRecord(input.missionProgress)
      ? input.missionProgress
      : {};
    const finalProgress = isRecord(missionProgress[FINAL_STORY_MISSION_ID])
      ? missionProgress[FINAL_STORY_MISSION_ID]
      : {};
    return {
      ...input,
      version: 4,
      // V3 ended at Cinder. V4 extends the campaign by five hunts, so the old
      // finale flag must not skip the new progression chain.
      storyCompleted: Number(finalProgress.completions) > 0,
    };
  },
  4: (input) => ({
    ...input,
    version: 5,
    // V4 had no permanent exploration. Never infer unlocks from mission wins.
    exploration: defaultExplorationProgress(),
  }),
  5: (input) => ({
    ...input,
    version: 6,
    // V5 authored only jungle exploration. Preserve those permanent unlocks;
    // future/foreign ice fields cannot pre-award a newly introduced branch.
    exploration: explorationForMission("jungle-vey", input.exploration),
  }),
  6: (input) => ({
    ...input,
    version: 7,
    // V6 had no social world. Never infer city proofs or affiliations from rank.
    homeworld: defaultHomeworldProgress(),
    justice: defaultJusticeProgress(),
  }),
};

function migrateSavePayload(value: unknown): UnknownRecord | null {
  if (!isRecord(value)) {
    return null;
  }

  const detectedVersion = Number.isInteger(value.version)
    ? Number(value.version)
    : 0;

  // Never reinterpret a save made by a newer game build.
  if (detectedVersion > SAVE_VERSION || detectedVersion < 0) {
    return null;
  }

  let migrated: UnknownRecord = { ...value, version: detectedVersion };
  let version = detectedVersion;

  while (version < SAVE_VERSION) {
    const migration = SAVE_MIGRATIONS[version];
    if (!migration) {
      return null;
    }
    migrated = migration(migrated);
    version += 1;
  }

  return migrated;
}

function normalizeUpgradeRecord<T extends string>(
  source: unknown,
  ids: readonly T[],
  fallback: Record<T, UpgradeLevel>,
): Record<T, UpgradeLevel> {
  if (!isRecord(source)) {
    return { ...fallback };
  }

  const normalized = { ...fallback };
  for (const id of ids) {
    const level = source[id];
    normalized[id] =
      level === 1 || level === 2 ? level : level === 0 ? 0 : fallback[id];
  }
  return normalized;
}

function normalizeAppearance(source: unknown): HunterAppearance {
  if (!isRecord(source)) {
    return { ...DEFAULT_HUNTER_APPEARANCE };
  }

  const appearance: HunterAppearance = {
    presetId: isOneOf(source.presetId, HUNTER_PRESET_IDS)
      ? source.presetId
      : DEFAULT_HUNTER_APPEARANCE.presetId,
    bodyMorphId: isOneOf(source.bodyMorphId, HUNTER_BODY_MORPH_IDS)
      ? source.bodyMorphId
      : DEFAULT_HUNTER_APPEARANCE.bodyMorphId,
    skinId: isOneOf(source.skinId, HUNTER_SKIN_IDS)
      ? source.skinId
      : DEFAULT_HUNTER_APPEARANCE.skinId,
    biomaskId:
      source.biomaskId === null
        ? null
        : isOneOf(source.biomaskId, BIOMASK_IDS)
          ? source.biomaskId
          : DEFAULT_HUNTER_APPEARANCE.biomaskId,
    dreadStyleId: isOneOf(source.dreadStyleId, DREAD_STYLE_IDS)
      ? source.dreadStyleId
      : DEFAULT_HUNTER_APPEARANCE.dreadStyleId,
    dreadTintId: isOneOf(source.dreadTintId, DREAD_TINT_IDS)
      ? source.dreadTintId
      : DEFAULT_HUNTER_APPEARANCE.dreadTintId,
    armorStyleId: isOneOf(
      source.armorStyleId,
      HUNTER_ARMOR_STYLE_IDS,
    )
      ? source.armorStyleId
      : DEFAULT_HUNTER_APPEARANCE.armorStyleId,
    armorTintId: isOneOf(source.armorTintId, ARMOR_TINT_IDS)
      ? source.armorTintId
      : DEFAULT_HUNTER_APPEARANCE.armorTintId,
    trophyAdornmentId: isOneOf(
      source.trophyAdornmentId,
      TROPHY_ADORNMENT_IDS,
    )
      ? source.trophyAdornmentId
      : DEFAULT_HUNTER_APPEARANCE.trophyAdornmentId,
    laserColorId: isOneOf(source.laserColorId, LASER_COLOR_IDS)
      ? source.laserColorId
      : DEFAULT_HUNTER_APPEARANCE.laserColorId,
  };

  if (appearance.presetId !== "custom") {
    const expected = appearanceForPreset(
      appearance.presetId as HunterLorePresetId,
    );
    const matchesAuthoredModules =
      source.presetId === expected.presetId &&
      source.bodyMorphId === expected.bodyMorphId &&
      source.skinId === expected.skinId &&
      source.biomaskId === expected.biomaskId &&
      source.dreadStyleId === expected.dreadStyleId &&
      source.dreadTintId === expected.dreadTintId &&
      source.armorStyleId === expected.armorStyleId &&
      source.armorTintId === expected.armorTintId &&
      source.trophyAdornmentId === expected.trophyAdornmentId &&
      // laserColorId was optional in already-written v3 saves. Its only
      // legacy meaning is the authored crimson default.
      (source.laserColorId === undefined
        ? expected.laserColorId === "crimson"
        : source.laserColorId === expected.laserColorId);

    // A legendary id describes the complete authored plate, never a label
    // that can remain attached to a manually altered combination of modules.
    if (!matchesAuthoredModules) appearance.presetId = "custom";
  }

  return appearance;
}

function normalizeMissionProgress(
  source: unknown,
  fallback: MissionProgress,
  missionId: MissionId,
): MissionProgress {
  if (!isRecord(source)) {
    return { ...fallback, completedObjectiveIds: [] };
  }

  const mission = MISSION_BY_ID[missionId];
  const validObjectiveIds = mission.objectives.map((objective) => objective.id);
  const rawStatus = source.status;
  const status: MissionProgressStatus =
    rawStatus === "available" ||
    rawStatus === "completed" ||
    rawStatus === "locked"
      ? rawStatus
      : fallback.status;
  const bestDifficultyId = isOneOf(
    source.bestDifficultyId,
    DIFFICULTY_IDS,
  )
    ? source.bestDifficultyId
    : null;

  return {
    status,
    attempts: nonNegativeInteger(source.attempts, fallback.attempts),
    completions: nonNegativeInteger(
      source.completions,
      fallback.completions,
    ),
    bestScore: boundedNumber(source.bestScore, fallback.bestScore, 0, 100),
    bestTimeSeconds:
      source.bestTimeSeconds === null
        ? null
        : nonNegativeInteger(source.bestTimeSeconds, 0) || null,
    bestDifficultyId,
    completedObjectiveIds: uniqueAllowedIds(
      source.completedObjectiveIds,
      validObjectiveIds,
      [],
    ),
    lastPlayedAt:
      source.lastPlayedAt === null
        ? null
        : validIsoDate(source.lastPlayedAt, fallback.lastPlayedAt ?? ""),
  };
}

function repairMissionOrder(
  progress: Record<MissionId, MissionProgress>,
): Record<MissionId, MissionProgress> {
  const repaired = Object.fromEntries(
    MISSIONS.map((mission) => [mission.id, { ...progress[mission.id] }]),
  ) as Record<MissionId, MissionProgress>;

  // Run in campaign order so an imported legacy save unlocks the whole chain
  // deterministically, including planets added after that save was written.
  for (const mission of MISSIONS.toSorted((left, right) => left.order - right.order)) {
    const current = repaired[mission.id];
    if (current.completions > 0) {
      current.status = "completed";
      continue;
    }
    const prerequisiteId = mission.prerequisiteMissionId;
    if (
      prerequisiteId === null ||
      repaired[prerequisiteId].status === "completed"
    ) {
      current.status = "available";
    } else {
      current.status = "locked";
    }
  }

  return repaired;
}

function conditionForQuality(quality: TrophyQuality): TrophyCondition {
  if (quality === "worthy") {
    return "damaged";
  }
  if (quality === "blooded") {
    return "intact";
  }
  return "pristine";
}

function qualityForCondition(condition: TrophyCondition): TrophyQuality {
  if (condition === "damaged") {
    return "worthy";
  }
  if (condition === "intact") {
    return "blooded";
  }
  return "flawless";
}

function defaultTrophyPart(missionId: MissionId): TrophyPartId {
  return MISSION_BY_ID[missionId].trophy.partId;
}

function preferredTrophy(
  current: TrophyRecord,
  candidate: TrophyRecord,
): TrophyRecord {
  const currentQuality = TROPHY_QUALITY_ORDER[current.quality];
  const candidateQuality = TROPHY_QUALITY_ORDER[candidate.quality];
  const preferred = candidateQuality !== currentQuality
    ? candidateQuality > currentQuality ? candidate : current
    : candidate.score !== current.score
      ? candidate.score > current.score ? candidate : current
      : Date.parse(candidate.claimedAt) >= Date.parse(current.claimedAt)
        ? candidate
        : current;
  const other = preferred === current ? candidate : current;
  if (!preferred.workshop && !other.workshop) return preferred;
  const completedActions = [
    ...new Set([
      ...(preferred.workshop?.completedActions ?? []),
      ...(other.workshop?.completedActions ?? []),
    ]),
  ];
  const preferredWorkshopTime = Date.parse(
    preferred.workshop?.lastCompletedAt ?? new Date(0).toISOString(),
  );
  const otherWorkshopTime = Date.parse(
    other.workshop?.lastCompletedAt ?? new Date(0).toISOString(),
  );
  return {
    ...preferred,
    workshop: {
      completedActions,
      bestScore: Math.max(
        preferred.workshop?.bestScore ?? 0,
        other.workshop?.bestScore ?? 0,
      ),
      lastCompletedAt:
        otherWorkshopTime > preferredWorkshopTime
          ? other.workshop?.lastCompletedAt ?? preferred.claimedAt
          : preferred.workshop?.lastCompletedAt ?? preferred.claimedAt,
    },
  };
}

function normalizeTrophies(source: unknown): TrophyRecord[] {
  if (!Array.isArray(source)) {
    return [];
  }

  const bestById = new Map<string, TrophyRecord>();
  for (const value of source) {
    if (!isRecord(value)) {
      continue;
    }

    if (
      !isOneOf(value.missionId, MISSION_IDS) ||
      !isOneOf(value.difficultyId, DIFFICULTY_IDS)
    ) {
      continue;
    }

    const mission = MISSION_BY_ID[value.missionId];
    const id = identifierValue(value.id, mission.trophy.id);
    const storedQuality: TrophyQuality | null =
      value.quality === "worthy" ||
      value.quality === "blooded" ||
      value.quality === "elite" ||
      value.quality === "flawless"
        ? value.quality
        : null;
    const condition = isOneOf(value.condition, TROPHY_CONDITIONS)
      ? value.condition
      : conditionForQuality(storedQuality ?? "worthy");
    const quality = storedQuality ?? qualityForCondition(condition);
    const claimedAt = validIsoDate(
      value.claimedAt,
      new Date(0).toISOString(),
    );
    const rawWorkshop = isRecord(value.workshop) ? value.workshop : null;
    const completedWorkshopActions = rawWorkshop
      ? uniqueAllowedIds(
          rawWorkshop.completedActions,
          TROPHY_WORKSHOP_ACTION_IDS,
          [],
        )
      : [];
    const trophy: TrophyRecord = {
      id,
      definitionId: identifierValue(
        value.definitionId,
        mission.trophy.id,
      ),
      ...(typeof value.sourceEnemyId === "string" &&
      value.sourceEnemyId.trim().length > 0
        ? {
            sourceEnemyId: value.sourceEnemyId.trim().slice(0, 128),
          }
        : {}),
      targetName: stringValue(value.targetName, mission.targetName).slice(
        0,
        96,
      ),
      targetKind:
        value.targetKind === "human" ||
        value.targetKind === "beast" ||
        value.targetKind === "yautja"
          ? value.targetKind
          : mission.targetKind,
      partId: isOneOf(value.partId, TROPHY_PART_IDS)
        ? value.partId
        : defaultTrophyPart(value.missionId),
      condition,
      missionId: value.missionId,
      quality,
      difficultyId: value.difficultyId,
      score: boundedNumber(value.score, 0, 0, 100),
      claimedAt,
      ...(completedWorkshopActions.length > 0
        ? {
            workshop: {
              completedActions: completedWorkshopActions,
              bestScore: boundedNumber(rawWorkshop?.bestScore, 0, 0, 10_000),
              lastCompletedAt: validIsoDate(
                rawWorkshop?.lastCompletedAt,
                claimedAt,
              ),
            },
          }
        : {}),
    };
    const existing = bestById.get(id);
    bestById.set(
      id,
      existing ? preferredTrophy(existing, trophy) : trophy,
    );
  }

  return [...bestById.values()]
    .sort(
      (left, right) =>
        Date.parse(left.claimedAt) - Date.parse(right.claimedAt),
    )
    .slice(-MAX_TROPHY_RECORDS);
}

function rankForHonor(honor: number): RankId {
  if (honor >= RANK_THRESHOLDS.elder) {
    return "elder";
  }
  if (honor >= RANK_THRESHOLDS.elite) {
    return "elite";
  }
  if (honor >= RANK_THRESHOLDS.blooded) {
    return "blooded";
  }
  return "young-blood";
}

function normalizeLoadout(
  source: unknown,
  unlockedWeaponIds: readonly WeaponId[],
  unlockedGearIds: readonly GearId[],
  unlockedArmorIds: readonly ArmorId[],
  armorUpgrades: Readonly<Record<ArmorId, UpgradeLevel>>,
): Loadout {
  if (!isRecord(source)) {
    return {
      armorId: DEFAULT_LOADOUT.armorId,
      weaponIds: [...DEFAULT_LOADOUT.weaponIds],
      gearIds: [...DEFAULT_LOADOUT.gearIds],
    };
  }

  const armorId =
    isOneOf(source.armorId, ARMOR_IDS) &&
    unlockedArmorIds.includes(source.armorId)
      ? source.armorId
      : DEFAULT_LOADOUT.armorId;
  const rawWeapons = uniqueAllowedIds(
    source.weaponIds,
    unlockedWeaponIds,
    DEFAULT_LOADOUT.weaponIds,
  );
  const rawGear = uniqueAllowedIds(
    source.gearIds,
    unlockedGearIds,
    DEFAULT_LOADOUT.gearIds,
  );
  const weaponIds: [WeaponId, WeaponId] =
    rawWeapons.length >= 2
      ? [rawWeapons[0], rawWeapons[1]]
      : [...DEFAULT_LOADOUT.weaponIds];
  const gearIds: [GearId, GearId] =
    rawGear.length >= 2
      ? [rawGear[0], rawGear[1]]
      : [...DEFAULT_LOADOUT.gearIds];
  const capacity =
    (ARMORS.find((armor) => armor.id === armorId)?.carryingCapacity ??
      8) + armorUpgrades[armorId];
  const weight =
    weaponIds.reduce(
      (sum, id) =>
        sum + (WEAPONS.find((weapon) => weapon.id === id)?.weight ?? 0),
      0,
    ) +
    gearIds.reduce(
      (sum, id) => sum + (GEAR.find((gear) => gear.id === id)?.weight ?? 0),
      0,
    );

  if (weight > capacity) {
    // Keep the requested armor instead of silently switching back to Hunter.
    // Wristblades have no carried weight, so replacing the heaviest selected
    // weapon with them always yields a coherent two-weapon Scout loadout.
    const secondaryWeapon =
      weaponIds
        .filter((id) => id !== "wristblades")
        .sort(
          (left, right) =>
            (WEAPONS.find((weapon) => weapon.id === left)?.weight ?? 0) -
            (WEAPONS.find((weapon) => weapon.id === right)?.weight ?? 0),
        )[0] ??
      unlockedWeaponIds.find((id) => id !== "wristblades") ??
      "combistick";
    return {
      armorId,
      weaponIds: ["wristblades", secondaryWeapon],
      gearIds,
    };
  }

  return { armorId, weaponIds, gearIds };
}

/**
 * Normalize both migrated and partially corrupt saves into the current schema.
 * Unknown fields are intentionally discarded so runtime state never leaks into
 * persistence.
 */
export function normalizeSave(value: unknown): SaveGame {
  const now = new Date().toISOString();
  const fallback = defaultSave(now);
  const source = migrateSavePayload(value);
  if (!source) {
    return fallback;
  }

  const rawProfile = isRecord(source.profile) ? source.profile : {};
  const rawInventory = isRecord(source.inventory)
    ? source.inventory
    : {};
  const rawMissionProgress = isRecord(source.missionProgress)
    ? source.missionProgress
    : {};
  const rawCodex = isRecord(source.codex) ? source.codex : {};
  const rawStatistics = isRecord(source.statistics)
    ? source.statistics
    : {};
  const rawSettings = isRecord(source.settings) ? source.settings : {};
  const normalizedControlBindings = normalizeControlBindings(
    rawSettings.controlBindings,
  );

  // Core starter tools can never disappear from a damaged or old save.
  const unlockedWeaponIds = [
    ...new Set<WeaponId>([
      "wristblades",
      "combistick",
      "plasma-caster",
      ...uniqueAllowedIds(
        rawInventory.unlockedWeaponIds,
        WEAPON_IDS,
        fallback.inventory.unlockedWeaponIds,
      ),
    ]),
  ];
  const unlockedGearIds = [
    ...new Set<GearId>([
      "motion-sensor",
      "audio-decoy",
      ...uniqueAllowedIds(
        rawInventory.unlockedGearIds,
        GEAR_IDS,
        fallback.inventory.unlockedGearIds,
      ),
    ]),
  ];
  const unlockedArmorIds = [
    ...new Set<ArmorId>([
      "hunter",
      ...uniqueAllowedIds(
        rawInventory.unlockedArmorIds,
        ARMOR_IDS,
        fallback.inventory.unlockedArmorIds,
      ),
    ]),
  ];

  const missionProgress = repairMissionOrder(
    Object.fromEntries(
      MISSIONS.map((mission) => [
        mission.id,
        normalizeMissionProgress(
          rawMissionProgress[mission.id],
          fallback.missionProgress[mission.id],
          mission.id,
        ),
      ]),
    ) as Record<MissionId, MissionProgress>,
  );
  const storyCompleted =
    booleanValue(source.storyCompleted, false) ||
    missionProgress[FINAL_STORY_MISSION_ID].completions > 0;
  const honor = nonNegativeInteger(
    rawProfile.honor,
    fallback.profile.honor,
  );
  const requestedDifficultyId = isOneOf(
    rawSettings.difficultyId,
    DIFFICULTY_IDS,
  )
    ? rawSettings.difficultyId
    : fallback.settings.difficultyId;
  // Elder is a post-campaign rite. Legacy V3 saves can retain that setting
  // while V4 reopens the extended story, and malformed current payloads can
  // create the same impossible state. Keep the strongest unlocked difficulty.
  const difficultyId =
    requestedDifficultyId === "elder" && !storyCompleted
      ? "elite"
      : requestedDifficultyId;
  const unlockedEntryIds = uniqueAllowedIds(
    rawCodex.unlockedEntryIds,
    CODEX_ENTRIES.map(({ id }) => id) satisfies readonly CodexEntryId[],
    fallback.codex.unlockedEntryIds,
  );
  const rawScanCounts = isRecord(rawCodex.scanCounts)
    ? rawCodex.scanCounts
    : {};
  const completedLegacyBossEnemyIds = MISSIONS.flatMap((mission) => {
    if (missionProgress[mission.id].completions <= 0) return [];
    const enemyId = ECOLOGY_V8_BOSS_ENEMY_IDS[mission.id];
    return enemyId ? [enemyId] : [];
  });
  const discoveredEnemyIds = normalizeDiscoveredEnemyIds(
    rawCodex.discoveredEnemyIds,
    completedLegacyBossEnemyIds,
  );
  const weaponUpgrades = normalizeUpgradeRecord(
    rawInventory.weaponUpgrades,
    WEAPON_IDS,
    fallback.inventory.weaponUpgrades,
  );
  const gearUpgrades = normalizeUpgradeRecord(
    rawInventory.gearUpgrades,
    GEAR_IDS,
    fallback.inventory.gearUpgrades,
  );
  const armorUpgrades = normalizeUpgradeRecord(
    rawInventory.armorUpgrades,
    ARMOR_IDS,
    fallback.inventory.armorUpgrades,
  );
  const scanCounts: Partial<Record<CodexEntryId, number>> = {};
  for (const id of unlockedEntryIds) {
    const count = nonNegativeInteger(rawScanCounts[id], 0);
    if (count > 0) {
      scanCounts[id] = count;
    }
  }

  return {
    version: SAVE_VERSION,
    createdAt: validIsoDate(source.createdAt, fallback.createdAt),
    updatedAt: validIsoDate(source.updatedAt, fallback.updatedAt),
    profile: {
      hunterName: stringValue(
        rawProfile.hunterName,
        fallback.profile.hunterName,
      ).slice(0, 32),
      rankId: rankForHonor(honor),
      honor,
      clanMarks: nonNegativeInteger(
        rawProfile.clanMarks,
        fallback.profile.clanMarks,
      ),
      playTimeSeconds: nonNegativeInteger(
        rawProfile.playTimeSeconds,
        fallback.profile.playTimeSeconds,
      ),
    },
    inventory: {
      unlockedWeaponIds,
      unlockedGearIds,
      unlockedArmorIds,
      weaponUpgrades,
      gearUpgrades,
      armorUpgrades,
    },
    loadout: normalizeLoadout(
      source.loadout,
      unlockedWeaponIds,
      unlockedGearIds,
      unlockedArmorIds,
      armorUpgrades,
    ),
    appearance: normalizeAppearance(source.appearance),
    missionProgress,
    trophies: normalizeTrophies(source.trophies),
    codex: { unlockedEntryIds, scanCounts, discoveredEnemyIds },
    exploration: normalizeExplorationProgress(source.exploration),
    statistics: {
      missionsStarted: nonNegativeInteger(
        rawStatistics.missionsStarted,
        fallback.statistics.missionsStarted,
      ),
      missionsCompleted: nonNegativeInteger(
        rawStatistics.missionsCompleted,
        fallback.statistics.missionsCompleted,
      ),
      missionsFailed: nonNegativeInteger(
        rawStatistics.missionsFailed,
        fallback.statistics.missionsFailed,
      ),
      totalKills: nonNegativeInteger(
        rawStatistics.totalKills,
        fallback.statistics.totalKills,
      ),
      totalScans: nonNegativeInteger(
        rawStatistics.totalScans,
        fallback.statistics.totalScans,
      ),
      secondWindsUsed: nonNegativeInteger(
        rawStatistics.secondWindsUsed,
        fallback.statistics.secondWindsUsed,
      ),
      bestHuntStreak: nonNegativeInteger(
        rawStatistics.bestHuntStreak,
        fallback.statistics.bestHuntStreak,
      ),
      currentHuntStreak: nonNegativeInteger(
        rawStatistics.currentHuntStreak,
        fallback.statistics.currentHuntStreak,
      ),
    },
    settings: {
      difficultyId,
      masterVolume: boundedNumber(
        rawSettings.masterVolume,
        fallback.settings.masterVolume,
        0,
        1,
      ),
      musicVolume: boundedNumber(
        rawSettings.musicVolume,
        fallback.settings.musicVolume,
        0,
        1,
      ),
      effectsVolume: boundedNumber(
        rawSettings.effectsVolume,
        fallback.settings.effectsVolume,
        0,
        1,
      ),
      screenShake: booleanValue(
        rawSettings.screenShake,
        fallback.settings.screenShake,
      ),
      reducedGore: booleanValue(
        rawSettings.reducedGore,
        fallback.settings.reducedGore,
      ),
      highContrastVision: booleanValue(
        rawSettings.highContrastVision,
        fallback.settings.highContrastVision,
      ),
      controlBindings: normalizedControlBindings.valid
        ? normalizedControlBindings.bindings
        : fallback.settings.controlBindings,
    },
    storyCompleted,
    homeworld: normalizeHomeworldProgress(source.homeworld),
    justice: normalizeJusticeProgress(source.justice),
  };
}

function browserStorage(): Storage | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export type SaveImportFailure =
  | "invalid-json"
  | "invalid-save"
  | "too-large"
  | "future-version";

export interface SaveImportParseResult {
  save: SaveGame | null;
  failure: SaveImportFailure | null;
}

export type SaveLoadFailure =
  | "storage-unavailable"
  | "read-failed"
  | "invalid-save"
  | "future-version"
  | "backup-recovered";

export interface SaveLoadResult {
  save: SaveGame;
  loaded: boolean;
  source: "primary" | "backup" | "fresh";
  failure: SaveLoadFailure | null;
}

export type SaveWriteFailure =
  | "storage-unavailable"
  | "read-failed"
  | "protected-save"
  | "save-conflict"
  | "invalid-save"
  | "write-failed";

export interface SaveWriteResult {
  save: SaveGame;
  persisted: boolean;
  failure: SaveWriteFailure | null;
}

export type SaveWriteReconciliation =
  | { status: "confirmed"; save: SaveGame; failure: null }
  | { status: "retry"; save: null; failure: null }
  | { status: "refused"; save: null; failure: SaveWriteFailure };

export interface SaveImportWriteResult {
  save: SaveGame | null;
  persisted: boolean;
  failure: SaveImportFailure | SaveWriteFailure | null;
}

function saveBackupKey(key: string): string {
  return `${key}.backup`;
}

// Each tab remembers the exact primary it loaded/wrote. A subsequent write
// from another tab is a conflict, never an invitation to replace its progress.
const observedCampaigns = new WeakMap<Storage, Map<string, string | null>>();
// Only an actual attempted write can be reconciled. Keep immutable bytes here,
// rather than trusting a caller's mutable SaveGame or accepting a newer save.
const unconfirmedCampaignWrites = new WeakMap<SaveWriteResult, {
  storage: Storage;
  key: string;
  ownerCreatedAt: string;
  serialized: string;
  previousSerialized: string | null;
  observedBefore: string | null | undefined;
}>();
function observeCampaign(storage: Storage, key: string, serialized: string | null): void {
  const observed = observedCampaigns.get(storage) ?? new Map<string, string | null>();
  observed.set(key, serialized);
  observedCampaigns.set(storage, observed);
}

/** Confirm one exact attempted primary without writing or loading another owner. */
export function reconcileSaveWrite(
  attempt: SaveWriteResult,
  ownerCreatedAt: string,
  storage: Storage | null = browserStorage(),
  key = SAVE_STORAGE_KEY,
): SaveWriteReconciliation {
  const refused = (failure: SaveWriteFailure): SaveWriteReconciliation => ({ status: "refused", save: null, failure });
  if (!storage) return refused("storage-unavailable");
  const receipt = unconfirmedCampaignWrites.get(attempt);
  if (!receipt || receipt.storage !== storage || receipt.key !== key || receipt.ownerCreatedAt !== ownerCreatedAt) {
    return refused("save-conflict");
  }
  // Another local load/write can also supersede this attempt. Do not rewind its
  // observation, even if the primary has since been restored to older bytes.
  if (observedCampaigns.get(storage)?.get(key) !== receipt.observedBefore) return refused("save-conflict");
  let serialized: string | null;
  try { serialized = storage.getItem(key); } catch { return refused("read-failed"); }
  if (serialized === receipt.serialized) {
    const parsed = parseSaveImport(serialized);
    if (!parsed.save || parsed.save.createdAt !== ownerCreatedAt) return refused("save-conflict");
    observeCampaign(storage, key, serialized);
    unconfirmedCampaignWrites.delete(attempt);
    return { status: "confirmed", save: parsed.save, failure: null };
  }
  if (serialized === receipt.previousSerialized) {
    unconfirmedCampaignWrites.delete(attempt);
    return { status: "retry", save: null, failure: null };
  }
  return refused("save-conflict");
}

function inspectSavePayload(value: unknown): SaveImportParseResult {
  if (!isRecord(value)) return { save: null, failure: "invalid-save" };
  if (value.version !== undefined &&
      (!Number.isInteger(value.version) || Number(value.version) < 0)) {
    return { save: null, failure: "invalid-save" };
  }
  if (Number(value.version) > SAVE_VERSION) {
    return { save: null, failure: "future-version" };
  }
  // Partial fields inside a campaign are repairable. An arbitrary JSON object
  // is not a campaign and must never replace the player's existing progress.
  if (!isRecord(value.profile) || !isRecord(value.missionProgress)) {
    return { save: null, failure: "invalid-save" };
  }
  return { save: normalizeSave(value), failure: null };
}

/** Parse first, without writing anything; callers can confirm a valid import. */
export function parseSaveImport(serialized: string): SaveImportParseResult {
  if (typeof serialized !== "string") return { save: null, failure: "invalid-json" };
  if (serialized.length > SAVE_MAX_SERIALIZED_BYTES ||
      new TextEncoder().encode(serialized).byteLength > SAVE_MAX_SERIALIZED_BYTES) {
    return { save: null, failure: "too-large" };
  }
  let value: unknown;
  try {
    value = JSON.parse(serialized.replace(/^\uFEFF/, ""));
  } catch {
    return { save: null, failure: "invalid-json" };
  }
  if (isRecord(value) && value.format === SAVE_EXPORT_FORMAT) {
    if (value.exportVersion !== 1) return { save: null, failure: "future-version" };
    value = value.save;
  }
  return inspectSavePayload(value);
}

/** Portable campaign export. Active hunts and ship sidecars are separate. */
export function exportSave(save: SaveGame): string {
  const validated = inspectSavePayload(save);
  if (!validated.save) throw new Error("Cannot export an invalid campaign save");
  const serialized = JSON.stringify({
    format: SAVE_EXPORT_FORMAT,
    exportVersion: 1,
    exportedAt: new Date().toISOString(),
    save: validated.save,
  }, null, 2);
  if (!parseSaveImport(serialized).save) throw new Error("Campaign export exceeds its size budget");
  return serialized;
}

/** Read-only recovery: never erase corrupt or newer data during hydration. */
export function loadSaveWithStatus(
  storage: Storage | null = browserStorage(),
  key = SAVE_STORAGE_KEY,
): SaveLoadResult {
  const fresh = (failure: SaveLoadFailure | null): SaveLoadResult => ({
    save: defaultSave(), loaded: false, source: "fresh", failure,
  });
  if (!storage) return fresh("storage-unavailable");
  let serialized: string | null;
  try {
    serialized = storage.getItem(key);
    observeCampaign(storage, key, serialized);
  } catch {
    return fresh("read-failed");
  }
  const primary = serialized === null ? null : parseSaveImport(serialized);
  if (primary?.save) return { save: primary.save, loaded: true, source: "primary", failure: null };
  // Falling back to an older backup on a downgraded client could silently roll
  // back a valid future campaign. Keep both files untouched instead.
  if (primary?.failure === "future-version") return fresh("future-version");
  try {
    const backup = storage.getItem(saveBackupKey(key));
    const recovered = backup === null ? null : parseSaveImport(backup).save;
    if (recovered) return { save: recovered, loaded: true, source: "backup", failure: "backup-recovered" };
  } catch {
    return fresh(serialized === null ? "read-failed" : "invalid-save");
  }
  return fresh(serialized === null ? null : "invalid-save");
}

export function loadSave(
  storage: Storage | null = browserStorage(),
  key = SAVE_STORAGE_KEY,
): SaveGame {
  return loadSaveWithStatus(storage, key).save;
}

function persistCampaign(
  save: SaveGame,
  storage: Storage | null,
  key: string,
  replaceExisting: boolean,
): SaveWriteResult {
  const validated = inspectSavePayload(save);
  const snapshot: SaveGame = {
    ...(validated.save ?? normalizeSave(save)),
    updatedAt: new Date().toISOString(),
  };
  const failed = (failure: SaveWriteFailure): SaveWriteResult => ({ save: snapshot, persisted: false, failure });
  if (!validated.save) return failed("invalid-save");
  if (!storage) return failed("storage-unavailable");

  let previousSerialized: string | null;
  let previousPrimarySerialized: string | null;
  let previous: SaveGame | null = null;
  try {
    previousSerialized = storage.getItem(key);
    previousPrimarySerialized = previousSerialized;
    const observed = observedCampaigns.get(storage);
    if (!replaceExisting && observed?.has(key) && observed.get(key) !== previousSerialized) {
      return failed("save-conflict");
    }
    if (previousSerialized !== null) {
      const parsed = parseSaveImport(previousSerialized);
      previous = parsed.save;
      if (!replaceExisting && !previous) {
        if (parsed.failure === "future-version") return failed("protected-save");
        const recovered = loadSaveWithStatus(storage, key);
        if (recovered.source !== "backup" || recovered.save.createdAt !== snapshot.createdAt) {
          return failed("protected-save");
        }
        previous = recovered.save;
        previousSerialized = JSON.stringify(previous);
      }
    }
    if (!replaceExisting && previous && previous.createdAt !== snapshot.createdAt) {
      return failed("save-conflict");
    }
  } catch {
    return failed("read-failed");
  }

  const serialized = JSON.stringify(snapshot);
  if (new TextEncoder().encode(serialized).byteLength > SAVE_MAX_SERIALIZED_BYTES) return failed("invalid-save");
  const observedBefore = observedCampaigns.get(storage)?.get(key);
  const unconfirmed = (): SaveWriteResult => {
    const result = failed("write-failed");
    unconfirmedCampaignWrites.set(result, {
      storage, key, ownerCreatedAt: snapshot.createdAt, serialized,
      previousSerialized: previousPrimarySerialized, observedBefore,
    });
    return result;
  };
  try {
    // A Storage setItem is atomic for this key. Do not consume quota with the
    // optional backup until the new primary snapshot has succeeded.
    storage.setItem(key, serialized);
    if (storage.getItem(key) !== serialized) return unconfirmed();
    observeCampaign(storage, key, serialized);
  } catch {
    return unconfirmed();
  }
  try {
    // A reset/import with a different owner must not resurrect the former
    // campaign through automatic recovery. Its initial backup is the new save.
    const backup = previous && previous.createdAt === snapshot.createdAt && previousSerialized
      ? previousSerialized
      : serialized;
    storage.setItem(saveBackupKey(key), backup);
  } catch {
    // Preserve the recovery copy until the replacement primary is confirmed.
    // If a reset's new backup cannot be written, retire a foreign recovery copy
    // only now: the new campaign already has a verified durable primary.
    if (replaceExisting && previous?.createdAt !== snapshot.createdAt) {
      try { storage.removeItem(saveBackupKey(key)); } catch {
        // Both cleanup operations can be blocked. Prefer retained data to loss;
        // the old recovery copy may remain until storage access is restored.
      }
    }
  }
  return { save: snapshot, persisted: true, failure: null };
}

/** Normal gameplay writes preserve unreadable/future campaigns and owners. */
export function writeSaveWithStatus(
  save: SaveGame,
  storage: Storage | null = browserStorage(),
  key = SAVE_STORAGE_KEY,
): SaveWriteResult {
  return persistCampaign(save, storage, key, false);
}

/** Only for an explicit, confirmed reset or replacement chosen by the player. */
export function replaceSaveWithStatus(
  save: SaveGame,
  storage: Storage | null = browserStorage(),
  key = SAVE_STORAGE_KEY,
): SaveWriteResult {
  return persistCampaign(save, storage, key, true);
}

/**
 * Invalid imports never write. A failed write confirmation is inconclusive:
 * setItem may have succeeded before a readback error, so retain/export memory.
 */
export function importSaveWithStatus(
  serialized: string,
  storage: Storage | null = browserStorage(),
  key = SAVE_STORAGE_KEY,
): SaveImportWriteResult {
  const parsed = parseSaveImport(serialized);
  if (!parsed.save) return { save: null, persisted: false, failure: parsed.failure };
  return replaceSaveWithStatus(parsed.save, storage, key);
}

export function writeSave(
  save: SaveGame,
  storage: Storage | null = browserStorage(),
  key = SAVE_STORAGE_KEY,
): SaveGame {
  return writeSaveWithStatus(save, storage, key).save;
}

// ---------------------------------------------------------------------------
// Mission rewards, progression and unlocks
// ---------------------------------------------------------------------------

function union<T>(current: readonly T[], additions: readonly T[]): T[] {
  return [...new Set([...current, ...additions])];
}

function betterDifficulty(
  current: DifficultyId | null,
  candidate: DifficultyId,
): DifficultyId {
  if (!current || DIFFICULTY_ORDER[candidate] > DIFFICULTY_ORDER[current]) {
    return candidate;
  }
  return current;
}

function normalizeTrophyClaims(
  source: unknown,
  missionId: MissionId,
  fallbackQuality: TrophyQuality | null,
): TrophyClaim[] {
  if (!Array.isArray(source)) {
    return [];
  }

  const mission = MISSION_BY_ID[missionId];
  const claimsById = new Map<string, TrophyClaim>();
  for (const value of source) {
    if (!isRecord(value) || typeof value.id !== "string") {
      continue;
    }
    const id = value.id.trim().slice(0, 128);
    if (!id) {
      continue;
    }
    const condition = isOneOf(value.condition, TROPHY_CONDITIONS)
      ? value.condition
      : conditionForQuality(fallbackQuality ?? "worthy");
    const quality: TrophyQuality =
      value.quality === "worthy" ||
      value.quality === "blooded" ||
      value.quality === "elite" ||
      value.quality === "flawless"
        ? value.quality
        : fallbackQuality ?? qualityForCondition(condition);
    claimsById.set(id, {
      id,
      definitionId: identifierValue(
        value.definitionId,
        mission.trophy.id,
      ),
      ...(typeof value.sourceEnemyId === "string" &&
      value.sourceEnemyId.trim().length > 0
        ? {
            sourceEnemyId: value.sourceEnemyId.trim().slice(0, 128),
          }
        : {}),
      targetName: stringValue(value.targetName, mission.targetName).slice(
        0,
        96,
      ),
      targetKind:
        value.targetKind === "human" ||
        value.targetKind === "beast" ||
        value.targetKind === "yautja"
          ? value.targetKind
          : mission.targetKind,
      partId: isOneOf(value.partId, TROPHY_PART_IDS)
        ? value.partId
        : defaultTrophyPart(missionId),
      condition,
      quality,
    });
  }

  return [...claimsById.values()].slice(-MAX_TROPHY_RECORDS);
}

function updatedTrophies(
  current: readonly TrophyRecord[],
  result: MissionResult,
): TrophyRecord[] {
  const mission = MISSION_BY_ID[result.missionId];
  const claims = normalizeTrophyClaims(
    result.trophyClaims,
    result.missionId,
    result.trophyQuality,
  );

  // A v1 runtime supplies only trophyQuality. Keep that aggregate trophy under
  // its historical stable id while v2 runtimes may submit many physical claims.
  if (claims.length === 0 && result.trophyQuality) {
    claims.push({
      id: mission.trophy.id,
      definitionId: mission.trophy.id,
      targetName: mission.targetName,
      targetKind: mission.targetKind,
      partId: defaultTrophyPart(mission.id),
      condition: conditionForQuality(result.trophyQuality),
      quality: result.trophyQuality,
    });
  }
  if (claims.length === 0) {
    return [...current];
  }

  const claimedAt = validIsoDate(
    result.completedAt,
    new Date().toISOString(),
  );
  const score = clamp(Math.round(result.score), 0, 100);
  const additions: TrophyRecord[] = claims.map((claim) => ({
    ...claim,
    missionId: mission.id,
    difficultyId: result.difficultyId,
    score,
    claimedAt,
  }));

  return normalizeTrophies([...current, ...additions]);
}

function unlockContent(
  save: SaveGame,
  honor: number,
  missionProgress: Record<MissionId, MissionProgress>,
): SaveGame["inventory"] {
  const isMissionComplete = (missionId: MissionId | null): boolean =>
    missionId === null ||
    missionProgress[missionId].status === "completed";
  const newWeaponIds = WEAPONS.filter(
    (weapon) =>
      weapon.unlock.minimumHonor <= honor &&
      isMissionComplete(weapon.unlock.requiredMissionId),
  ).map((weapon) => weapon.id);
  const newGearIds = GEAR.filter(
    (gear) =>
      gear.unlock.minimumHonor <= honor &&
      isMissionComplete(gear.unlock.requiredMissionId),
  ).map((gear) => gear.id);
  const newArmorIds = ARMORS.filter(
    (armor) =>
      armor.unlock.minimumHonor <= honor &&
      isMissionComplete(armor.unlock.requiredMissionId),
  ).map((armor) => armor.id);

  return {
    ...save.inventory,
    unlockedWeaponIds: union(
      save.inventory.unlockedWeaponIds,
      newWeaponIds,
    ),
    unlockedGearIds: union(save.inventory.unlockedGearIds, newGearIds),
    unlockedArmorIds: union(
      save.inventory.unlockedArmorIds,
      newArmorIds,
    ),
  };
}

/**
 * Pure progression reducer. It does not touch localStorage; React can show the
 * debrief first, then explicitly pass the returned value to writeSave().
 */
type MissionResultInput = Omit<MissionResult, "trophyClaims"> & {
  trophyClaims?: TrophyClaim[];
};

export function applyMissionResult(
  currentSave: SaveGame,
  rawResult: MissionResultInput,
): SaveGame {
  const save = normalizeSave(currentSave);
  const mission = MISSION_BY_ID[rawResult.missionId];
  const difficulty = DIFFICULTY_BY_ID[rawResult.difficultyId];
  const now = new Date().toISOString();
  const completedAt = validIsoDate(rawResult.completedAt, now);
  const score = clamp(Math.round(rawResult.score), 0, 100);
  const elapsedSeconds = nonNegativeInteger(rawResult.elapsedSeconds, 0);
  const kills = nonNegativeInteger(rawResult.kills, 0);
  const scans = nonNegativeInteger(rawResult.scans, 0);
  const reportedDiscoveredEnemyIds = normalizeDiscoveredEnemyIds(
    rawResult.discoveredEnemyIds,
  );
  const discoveredEnemyIds = normalizeDiscoveredEnemyIds([
    ...save.codex.discoveredEnemyIds,
    ...reportedDiscoveredEnemyIds,
  ]);
  const previous = save.missionProgress[mission.id];
  const validObjectiveIds = mission.objectives.map(
    (objective) => objective.id,
  );
  const completedObjectiveIds = uniqueAllowedIds(
    rawResult.completedObjectiveIds,
    validObjectiveIds,
    [],
  );
  const trophyQuality: TrophyQuality | null =
    rawResult.trophyQuality === "worthy" ||
    rawResult.trophyQuality === "blooded" ||
    rawResult.trophyQuality === "elite" ||
    rawResult.trophyQuality === "flawless"
      ? rawResult.trophyQuality
      : null;
  const trophyClaims = normalizeTrophyClaims(
    rawResult.trophyClaims,
    mission.id,
    trophyQuality,
  );
  const result: MissionResult = {
    ...rawResult,
    score,
    elapsedSeconds,
    kills,
    scans,
    discoveredEnemyIds: reportedDiscoveredEnemyIds,
    completedObjectiveIds,
    trophyQuality,
    trophyClaims,
    completedAt,
  };

  if (result.outcome === "success") {
    const completedObjectiveIdSet = new Set(completedObjectiveIds);
    const missesRequiredObjective = mission.objectives.some(
      (objective) =>
        (objective.required || objective.kind === "extract") &&
        !completedObjectiveIdSet.has(objective.id),
    );
    const hasExplicitApexClaim =
      Array.isArray(rawResult.trophyClaims) &&
      rawResult.trophyClaims.some(
        (claim) =>
          isRecord(claim) && claim.definitionId === mission.trophy.id,
      ) &&
      trophyClaims.some(
        (claim) => claim.definitionId === mission.trophy.id,
      );
    // Legacy runtimes submitted only the aggregate quality. A modern result
    // with an explicit claim list must always identify the Apex trophy itself.
    const hasLegacyApexClaim =
      rawResult.trophyClaims === undefined && trophyQuality !== null;

    if (
      previous.status === "locked" ||
      (result.difficultyId === "elder" && !save.storyCompleted) ||
      missesRequiredObjective ||
      (!hasExplicitApexClaim && !hasLegacyApexClaim)
    ) {
      return save;
    }
  }

  const exploration = mergeExplorationProgress(
    save.exploration,
    // A terminal snapshot cannot discover another biome or introduce an
    // ability that this mission does not award. Locked attempts add no unlocks.
    previous.status !== "locked" && (result.difficultyId !== "elder" || save.storyCompleted)
      ? explorationForMission(mission.id, rawResult.exploration)
      : undefined,
  );
  const baseProgress: MissionProgress = {
    ...previous,
    attempts: previous.attempts + 1,
    lastPlayedAt: completedAt,
  };
  const baseStatistics = {
    ...save.statistics,
    missionsStarted: save.statistics.missionsStarted + 1,
    totalKills: save.statistics.totalKills + kills,
    totalScans: save.statistics.totalScans + scans,
    secondWindsUsed:
      save.statistics.secondWindsUsed + (result.secondWindUsed ? 1 : 0),
  };

  if (result.outcome !== "success") {
    return {
      ...save,
      updatedAt: now,
      exploration,
      profile: {
        ...save.profile,
        playTimeSeconds:
          save.profile.playTimeSeconds + elapsedSeconds,
      },
      missionProgress: {
        ...save.missionProgress,
        [mission.id]: baseProgress,
      },
      codex: {
        ...save.codex,
        discoveredEnemyIds,
      },
      statistics: {
        ...baseStatistics,
        missionsFailed:
          baseStatistics.missionsFailed +
          (result.outcome === "failed" ? 1 : 0),
        currentHuntStreak: 0,
      },
    };
  }

  const firstCompletion = previous.completions === 0;
  const scoreImprovement = Math.max(0, score - previous.bestScore);
  const eventHonor = clamp(
    result.honorEvents.reduce(
      (total, event) =>
        total + clamp(Math.round(finiteNumber(event.value, 0)), -50, 50),
      0,
    ),
    -100,
    100,
  );
  const qualityBonus = result.trophyQuality
    ? TROPHY_QUALITY_ORDER[result.trophyQuality] * 10
    : 0;
  const replayQualityBonus =
    result.trophyQuality &&
    !save.trophies.some(
      (trophy) =>
        trophy.missionId === mission.id &&
        TROPHY_QUALITY_ORDER[trophy.quality] >=
          TROPHY_QUALITY_ORDER[result.trophyQuality as TrophyQuality],
    )
      ? Math.round(qualityBonus / 2)
      : 0;
  const replayMasteryHonor =
    Math.max(
      5,
      Math.round(mission.baseRewards.honor * REPLAY_HONOR_BASE_RATE),
    ) +
    Math.round(score * REPLAY_HONOR_SCORE_RATE) +
    Math.round(eventHonor * REPLAY_HONOR_EVENT_RATE);
  const replayProgressHonor = Math.min(
    REPLAY_HONOR_PROGRESS_CAP,
    scoreImprovement * 2 + replayQualityBonus,
  );
  const rawHonorReward = firstCompletion
    ? mission.baseRewards.honor + eventHonor + qualityBonus
    : Math.min(
        REPLAY_HONOR_RAW_CAP,
        replayMasteryHonor + replayProgressHonor,
      );
  const honorReward = Math.round(
    Math.max(firstCompletion ? -50 : 0, rawHonorReward) *
      difficulty.rewardMultiplier,
  );
  const replayMultiplier = firstCompletion ? 1 : 0.35;
  const clanMarksReward = Math.round(
    (mission.baseRewards.clanMarks + score * 1.5) *
      difficulty.rewardMultiplier *
      replayMultiplier,
  );
  const nextHonor = Math.max(0, save.profile.honor + honorReward);
  const nextMission = MISSIONS.find(
    (candidate) => candidate.order === mission.order + 1,
  );
  const updatedProgress: MissionProgress = {
    ...baseProgress,
    status: "completed",
    completions: previous.completions + 1,
    bestScore: Math.max(previous.bestScore, score),
    bestTimeSeconds:
      previous.bestTimeSeconds === null
        ? elapsedSeconds
        : Math.min(previous.bestTimeSeconds, elapsedSeconds),
    bestDifficultyId: betterDifficulty(
      previous.bestDifficultyId,
      result.difficultyId,
    ),
    completedObjectiveIds: union(
      previous.completedObjectiveIds,
      completedObjectiveIds,
    ),
  };
  const missionProgress: Record<MissionId, MissionProgress> = {
    ...save.missionProgress,
    [mission.id]: updatedProgress,
  };

  if (
    nextMission &&
    missionProgress[nextMission.id].status === "locked"
  ) {
    missionProgress[nextMission.id] = {
      ...missionProgress[nextMission.id],
      status: "available",
    };
  }

  const currentHuntStreak = save.statistics.currentHuntStreak + 1;
  const progressedSave: SaveGame = {
    ...save,
    updatedAt: now,
    exploration,
    profile: {
      ...save.profile,
      rankId: rankForHonor(nextHonor),
      honor: nextHonor,
      clanMarks: save.profile.clanMarks + clanMarksReward,
      playTimeSeconds: save.profile.playTimeSeconds + elapsedSeconds,
    },
    missionProgress,
    trophies: updatedTrophies(save.trophies, result),
    codex: {
      unlockedEntryIds: union(
        save.codex.unlockedEntryIds,
        mission.codexUnlockIds,
      ),
      discoveredEnemyIds,
      scanCounts: {
        ...save.codex.scanCounts,
        ...Object.fromEntries(
          mission.codexUnlockIds.map((id) => [
            id,
            (save.codex.scanCounts[id] ?? 0) + scans,
          ]),
        ),
      },
    },
    statistics: {
      ...baseStatistics,
      missionsCompleted: baseStatistics.missionsCompleted + 1,
      currentHuntStreak,
      bestHuntStreak: Math.max(
        baseStatistics.bestHuntStreak,
        currentHuntStreak,
      ),
    },
    storyCompleted:
      save.storyCompleted || mission.id === FINAL_STORY_MISSION_ID,
  };

  return {
    ...progressedSave,
    inventory: unlockContent(
      progressedSave,
      nextHonor,
      missionProgress,
    ),
  };
}
