import {
  ARMORS,
  DIFFICULTIES,
  DIFFICULTY_BY_ID,
  GEAR,
  MISSIONS,
  MISSION_BY_ID,
  WEAPONS,
} from "./data";
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

export const SAVE_VERSION = 2;
export const SAVE_STORAGE_KEY = "yautja-long-hunt.save";

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
  skinId: "ochre-mottle",
  biomaskId: "jungle",
  dreadStyleId: "classic",
  dreadTintId: "obsidian",
  armorTintId: "gunmetal",
  trophyAdornmentId: "none",
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
const BIOMASK_IDS = ["jungle", "scarred", "elder"] as const;
const DREAD_STYLE_IDS = ["classic", "braided", "elder"] as const;
const DREAD_TINT_IDS = ["obsidian", "umber", "ashen"] as const;
const ARMOR_TINT_IDS = ["gunmetal", "bronze", "obsidian"] as const;
const TROPHY_ADORNMENT_IDS = ["none", "skull-spine"] as const;
const TROPHY_PART_IDS = ["skull", "skull-and-spine", "mask"] as const;
const TROPHY_CONDITIONS = ["damaged", "intact", "pristine"] as const;
const MAX_TROPHY_RECORDS = 200;

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
    missionProgress: {
      "jungle-vey": emptyMissionProgress("available"),
      "ice-cryostalker": emptyMissionProgress("locked"),
      "volcano-bad-blood": emptyMissionProgress("locked"),
    },
    trophies: [],
    codex: {
      unlockedEntryIds: [
        "yautja-honor",
        "biomask",
        "cloaking-device",
      ],
      scanCounts: {},
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
    },
    storyCompleted: false,
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
  return Math.max(0, Math.round(finiteNumber(value, fallback)));
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

  return {
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
    armorTintId: isOneOf(source.armorTintId, ARMOR_TINT_IDS)
      ? source.armorTintId
      : DEFAULT_HUNTER_APPEARANCE.armorTintId,
    trophyAdornmentId: isOneOf(
      source.trophyAdornmentId,
      TROPHY_ADORNMENT_IDS,
    )
      ? source.trophyAdornmentId
      : DEFAULT_HUNTER_APPEARANCE.trophyAdornmentId,
  };
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
  const repaired = {
    "jungle-vey": { ...progress["jungle-vey"] },
    "ice-cryostalker": { ...progress["ice-cryostalker"] },
    "volcano-bad-blood": { ...progress["volcano-bad-blood"] },
  };

  if (repaired["jungle-vey"].status === "locked") {
    repaired["jungle-vey"].status = "available";
  }
  if (repaired["jungle-vey"].completions > 0) {
    repaired["jungle-vey"].status = "completed";
    if (repaired["ice-cryostalker"].status === "locked") {
      repaired["ice-cryostalker"].status = "available";
    }
  }
  if (repaired["ice-cryostalker"].completions > 0) {
    repaired["ice-cryostalker"].status = "completed";
    if (repaired["volcano-bad-blood"].status === "locked") {
      repaired["volcano-bad-blood"].status = "available";
    }
  }
  if (repaired["volcano-bad-blood"].completions > 0) {
    repaired["volcano-bad-blood"].status = "completed";
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
  return MISSION_BY_ID[missionId].trophy.icon.includes("mask")
    ? "mask"
    : "skull";
}

function preferredTrophy(
  current: TrophyRecord,
  candidate: TrophyRecord,
): TrophyRecord {
  const currentQuality = TROPHY_QUALITY_ORDER[current.quality];
  const candidateQuality = TROPHY_QUALITY_ORDER[candidate.quality];
  if (candidateQuality !== currentQuality) {
    return candidateQuality > currentQuality ? candidate : current;
  }
  if (candidate.score !== current.score) {
    return candidate.score > current.score ? candidate : current;
  }
  return Date.parse(candidate.claimedAt) >= Date.parse(current.claimedAt)
    ? candidate
    : current;
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
    const trophy: TrophyRecord = {
      id,
      definitionId: identifierValue(
        value.definitionId,
        mission.trophy.id,
      ),
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
      claimedAt: validIsoDate(
        value.claimedAt,
        new Date(0).toISOString(),
      ),
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
    ARMORS.find((armor) => armor.id === armorId)?.carryingCapacity ?? 8;
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
    return {
      armorId: DEFAULT_LOADOUT.armorId,
      weaponIds: [...DEFAULT_LOADOUT.weaponIds],
      gearIds: [...DEFAULT_LOADOUT.gearIds],
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

  const missionProgress = repairMissionOrder({
    "jungle-vey": normalizeMissionProgress(
      rawMissionProgress["jungle-vey"],
      fallback.missionProgress["jungle-vey"],
      "jungle-vey",
    ),
    "ice-cryostalker": normalizeMissionProgress(
      rawMissionProgress["ice-cryostalker"],
      fallback.missionProgress["ice-cryostalker"],
      "ice-cryostalker",
    ),
    "volcano-bad-blood": normalizeMissionProgress(
      rawMissionProgress["volcano-bad-blood"],
      fallback.missionProgress["volcano-bad-blood"],
      "volcano-bad-blood",
    ),
  });
  const honor = nonNegativeInteger(
    rawProfile.honor,
    fallback.profile.honor,
  );
  const difficultyId = isOneOf(
    rawSettings.difficultyId,
    DIFFICULTY_IDS,
  )
    ? rawSettings.difficultyId
    : fallback.settings.difficultyId;
  const unlockedEntryIds = uniqueAllowedIds(
    rawCodex.unlockedEntryIds,
    [
      "yautja-honor",
      "biomask",
      "cloaking-device",
      "osiris-jungle",
      "commandante-vey",
      "nivalis-ice",
      "cryostalker",
      "cinder-volcano",
      "bad-blood",
    ] satisfies readonly CodexEntryId[],
    fallback.codex.unlockedEntryIds,
  );
  const rawScanCounts = isRecord(rawCodex.scanCounts)
    ? rawCodex.scanCounts
    : {};
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
      weaponUpgrades: normalizeUpgradeRecord(
        rawInventory.weaponUpgrades,
        WEAPON_IDS,
        fallback.inventory.weaponUpgrades,
      ),
      gearUpgrades: normalizeUpgradeRecord(
        rawInventory.gearUpgrades,
        GEAR_IDS,
        fallback.inventory.gearUpgrades,
      ),
      armorUpgrades: normalizeUpgradeRecord(
        rawInventory.armorUpgrades,
        ARMOR_IDS,
        fallback.inventory.armorUpgrades,
      ),
    },
    loadout: normalizeLoadout(
      source.loadout,
      unlockedWeaponIds,
      unlockedGearIds,
      unlockedArmorIds,
    ),
    appearance: normalizeAppearance(source.appearance),
    missionProgress,
    trophies: normalizeTrophies(source.trophies),
    codex: { unlockedEntryIds, scanCounts },
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
    },
    storyCompleted:
      booleanValue(source.storyCompleted, false) ||
      missionProgress["volcano-bad-blood"].completions > 0,
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

/**
 * Load a save without throwing. Server rendering, privacy mode, corrupted JSON
 * and future-version saves all safely return a fresh game.
 */
export function loadSave(
  storage: Storage | null = browserStorage(),
  key = SAVE_STORAGE_KEY,
): SaveGame {
  if (!storage) {
    return defaultSave();
  }

  try {
    const serialized = storage.getItem(key);
    return serialized ? normalizeSave(JSON.parse(serialized)) : defaultSave();
  } catch {
    return defaultSave();
  }
}

/**
 * Normalize before writing so callers cannot persist transient Canvas values.
 * The returned object is exactly the snapshot placed in localStorage.
 */
export function writeSave(
  save: SaveGame,
  storage: Storage | null = browserStorage(),
  key = SAVE_STORAGE_KEY,
): SaveGame {
  const normalized = normalizeSave(save);
  const snapshot: SaveGame = {
    ...normalized,
    updatedAt: new Date().toISOString(),
  };

  if (storage) {
    try {
      storage.setItem(key, JSON.stringify(snapshot));
    } catch {
      // The in-memory snapshot remains usable when storage is unavailable/full.
    }
  }

  return snapshot;
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
    completedObjectiveIds,
    trophyQuality,
    trophyClaims,
    completedAt,
  };

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
      profile: {
        ...save.profile,
        playTimeSeconds:
          save.profile.playTimeSeconds + elapsedSeconds,
      },
      missionProgress: {
        ...save.missionProgress,
        [mission.id]: baseProgress,
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
  const rawHonorReward = firstCompletion
    ? mission.baseRewards.honor + eventHonor + qualityBonus
    : scoreImprovement * 2 +
      (result.trophyQuality &&
      !save.trophies.some(
        (trophy) =>
          trophy.missionId === mission.id &&
          TROPHY_QUALITY_ORDER[trophy.quality] >=
            TROPHY_QUALITY_ORDER[result.trophyQuality as TrophyQuality],
      )
        ? Math.round(qualityBonus / 2)
        : 0);
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
      save.storyCompleted || mission.id === "volcano-bad-blood",
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
