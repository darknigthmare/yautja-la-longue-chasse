import { normalizeSave, parseSaveImport, RANK_THRESHOLDS, SAVE_STORAGE_KEY } from "../save";
import {
  DEFAULT_SHIP_ID,
  availableShipIds,
  getShipAvailability,
  isShipId,
  type ShipAvailability,
  type ShipId,
} from "../shipCatalogue";
import type {
  HunterAppearance,
  Loadout,
  RankId,
  SaveGame,
  TrophyCondition,
  TrophyPartId,
  TrophyQuality,
  TrophyRecord,
} from "../types";

/**
 * Ship progression deliberately lives beside the core campaign save instead of
 * inside it. normalizeSave() discards unknown fields by design, so a sidecar
 * keeps the current save backward-compatible while the ship systems evolve.
 */
export const SHIP_PROGRESSION_VERSION = 3;
const SHIP_PROGRESSION_MAX_SERIALIZED_BYTES = 1024 * 1024;
export const SHIP_PROGRESSION_STORAGE_KEY =
  "yautja-long-hunt.ship-progression";

export type ShipRoomId =
  | "bridge-map"
  | "hangar"
  | "armory"
  | "trophy-hall"
  | "medbay"
  | "training"
  | "archives";

export type TrophySpeciesId =
  | "human"
  | "cryostalker"
  | "yautja"
  | "apex-beast";

export type TrophyHuntMethodId =
  | "unknown"
  | "wristblades"
  | "combistick"
  | "plasma-caster"
  | "smart-disc"
  | "yautja-bow"
  | "trap"
  | "environment";

export type TrophyPreparationStage =
  | "raw"
  | "cleaning"
  | "cleaned"
  | "mounting"
  | "mounted"
  | "displayed";

export type ClanRiteId =
  | "first-trophy"
  | "blooded-rank"
  | "trophy-artisan"
  | "hall-keeper"
  | "many-paths"
  | "clan-judgement"
  | "elder-ascension";

export type ShipLoadoutSlotId =
  | "hunt-1"
  | "hunt-2"
  | "hunt-3"
  | "hunt-4";

export type TrainingDisciplineId =
  | "targeting"
  | "wristblades"
  | "cloaking"
  | "mobility"
  | "honor-duel";

export type MedbayTreatmentId =
  | "minor-wounds"
  | "acid-burn"
  | "fracture"
  | "neural-shock";

export interface TrophyWorkshopRecord {
  claimId: string;
  targetName: string;
  speciesId: TrophySpeciesId;
  huntMethodId: TrophyHuntMethodId;
  partId: TrophyPartId;
  condition: TrophyCondition;
  quality: TrophyQuality;
  stage: TrophyPreparationStage;
  cleaningSeconds: number;
  requiredCleaningSeconds: number;
  mountingSeconds: number;
  requiredMountingSeconds: number;
  displaySlotId: string | null;
  updatedAt: string;
}

export interface TrophyDisplaySlot {
  id: string;
  label: string;
  claimId: string | null;
}

export interface ShipLoadoutPreset {
  id: ShipLoadoutSlotId;
  name: string;
  loadout: Loadout | null;
  appearance: HunterAppearance | null;
  savedAt: string | null;
}

export interface TrainingRecord {
  disciplineId: TrainingDisciplineId;
  attempts: number;
  bestScore: number;
  lastScore: number;
  lastCompletedAt: string | null;
}

export interface MedbayProgress {
  status: "ready" | "treating";
  treatmentId: MedbayTreatmentId | null;
  startedAt: string | null;
  completesAt: string | null;
  treatmentsCompleted: number;
}

export interface ShipProgressionState {
  version: number;
  /** Stable identity of the campaign that earned this sidecar progression. */
  ownerSaveCreatedAt: string;
  updatedAt: string;
  selectedShipId: ShipId;
  unlockedShipIds: ShipId[];
  completedRiteIds: ClanRiteId[];
  trophies: TrophyWorkshopRecord[];
  displaySlots: TrophyDisplaySlot[];
  loadoutPresets: ShipLoadoutPreset[];
  training: Record<TrainingDisciplineId, TrainingRecord>;
  medbay: MedbayProgress;
}

export interface RiteProgress {
  id: ClanRiteId;
  name: string;
  description: string;
  current: number;
  target: number;
  ratio: number;
  completed: boolean;
}

export interface ClanProgressSnapshot {
  rankId: RankId;
  rankLabel: string;
  honor: number;
  clanMarks: number;
  nextRankId: RankId | null;
  nextRankLabel: string | null;
  honorForNextRank: number | null;
  rankProgress: number;
  prestige: number;
  completedRites: RiteProgress[];
  pendingRites: RiteProgress[];
  trophiesBySpecies: Record<TrophySpeciesId, number>;
  trophiesByMethod: Record<TrophyHuntMethodId, number>;
}

const RANK_SEQUENCE: readonly RankId[] = [
  "young-blood",
  "blooded",
  "elite",
  "elder",
];

const RANK_LABELS: Readonly<Record<RankId, string>> = {
  "young-blood": "Jeune Sang",
  blooded: "Blooded",
  elite: "Élite",
  elder: "Ancien",
};

export const TROPHY_METHOD_LABELS: Readonly<
  Record<TrophyHuntMethodId, string>
> = {
  unknown: "Méthode non consignée",
  wristblades: "Wristblades",
  combistick: "Combistick",
  "plasma-caster": "Plasmacaster",
  "smart-disc": "Smart Disc",
  "yautja-bow": "Arc Yautja",
  trap: "Piège",
  environment: "Environnement",
};

export const TROPHY_SPECIES_LABELS: Readonly<
  Record<TrophySpeciesId, string>
> = {
  human: "Humain",
  cryostalker: "Cryostalker",
  yautja: "Yautja",
  "apex-beast": "Bête Apex",
};

export const TRAINING_LABELS: Readonly<
  Record<TrainingDisciplineId, string>
> = {
  targeting: "Ciblage biomask",
  wristblades: "Enchaînements wristblades",
  cloaking: "Approche camouflée",
  mobility: "Mobilité verticale",
  "honor-duel": "Duel d’honneur",
};

const LOADOUT_SLOT_IDS: readonly ShipLoadoutSlotId[] = [
  "hunt-1",
  "hunt-2",
  "hunt-3",
  "hunt-4",
];

const TRAINING_IDS: readonly TrainingDisciplineId[] = [
  "targeting",
  "wristblades",
  "cloaking",
  "mobility",
  "honor-duel",
];

const SPECIES_IDS: readonly TrophySpeciesId[] = [
  "human",
  "cryostalker",
  "yautja",
  "apex-beast",
];

const HUNT_METHOD_IDS: readonly TrophyHuntMethodId[] = [
  "unknown",
  "wristblades",
  "combistick",
  "plasma-caster",
  "smart-disc",
  "yautja-bow",
  "trap",
  "environment",
];

const PREPARATION_STAGES: readonly TrophyPreparationStage[] = [
  "raw",
  "cleaning",
  "cleaned",
  "mounting",
  "mounted",
  "displayed",
];

const RITE_IDS: readonly ClanRiteId[] = [
  "first-trophy",
  "blooded-rank",
  "trophy-artisan",
  "hall-keeper",
  "many-paths",
  "clan-judgement",
  "elder-ascension",
];

const MEDBAY_TREATMENT_IDS: readonly MedbayTreatmentId[] = [
  "minor-wounds",
  "acid-burn",
  "fracture",
  "neural-shock",
];

const DISPLAY_SLOT_COUNT = 12;

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isOneOf<T extends string>(
  value: unknown,
  allowed: readonly T[],
): value is T {
  return typeof value === "string" && allowed.includes(value as T);
}

function finiteNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : fallback;
}

function nonNegativeInteger(value: unknown, fallback = 0): number {
  return Math.max(0, Math.round(finiteNumber(value, fallback)));
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function validIsoDate(value: unknown, fallback: string): string {
  return typeof value === "string" && !Number.isNaN(Date.parse(value))
    ? value
    : fallback;
}

function safeName(value: unknown, fallback: string, maxLength = 64): string {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return (trimmed || fallback).slice(0, maxLength);
}

function cloneLoadout(loadout: Loadout): Loadout {
  return {
    armorId: loadout.armorId,
    weaponIds: [...loadout.weaponIds],
    gearIds: [...loadout.gearIds],
  };
}

function cloneAppearance(appearance: HunterAppearance): HunterAppearance {
  return { ...appearance };
}

function defaultTraining(): Record<
  TrainingDisciplineId,
  TrainingRecord
> {
  return Object.fromEntries(
    TRAINING_IDS.map((disciplineId) => [
      disciplineId,
      {
        disciplineId,
        attempts: 0,
        bestScore: 0,
        lastScore: 0,
        lastCompletedAt: null,
      },
    ]),
  ) as Record<TrainingDisciplineId, TrainingRecord>;
}

function defaultDisplaySlots(
  count = DISPLAY_SLOT_COUNT,
): TrophyDisplaySlot[] {
  return Array.from(
    { length: Math.max(DISPLAY_SLOT_COUNT, count) },
    (_, index) => ({
      id: `display-${index + 1}`,
      label: `Alcôve ${(index + 1).toString().padStart(2, "0")}`,
      claimId: null,
    }),
  );
}

function defaultLoadoutPresets(
  save: SaveGame,
  now: string,
): ShipLoadoutPreset[] {
  return LOADOUT_SLOT_IDS.map((id, index) => ({
    id,
    name: index === 0 ? "Chasse active" : `Configuration ${index + 1}`,
    loadout: index === 0 ? cloneLoadout(save.loadout) : null,
    appearance: index === 0 ? cloneAppearance(save.appearance) : null,
    savedAt: index === 0 ? now : null,
  }));
}

export function speciesForTrophy(
  trophy: Pick<
    TrophyRecord,
    "missionId" | "sourceEnemyId" | "targetKind" | "targetName"
  >,
): TrophySpeciesId {
  if (trophy.sourceEnemyId) {
    if (trophy.targetKind === "human") return "human";
    if (trophy.targetKind === "yautja") return "yautja";
    return /cryostalker/i.test(
      `${trophy.sourceEnemyId} ${trophy.targetName}`,
    )
      ? "cryostalker"
      : "apex-beast";
  }
  if (
    trophy.missionId === "ice-cryostalker" ||
    /cryostalker/i.test(trophy.targetName)
  ) {
    return "cryostalker";
  }
  if (trophy.targetKind === "human") return "human";
  if (trophy.targetKind === "yautja") return "yautja";
  return "apex-beast";
}

function preparationDurations(
  trophy: Pick<TrophyRecord, "partId" | "condition">,
): { cleaning: number; mounting: number } {
  const partCleaning: Record<TrophyPartId, number> = {
    skull: 90,
    "skull-and-spine": 150,
    mask: 45,
    insignia: 35,
  };
  const partMounting: Record<TrophyPartId, number> = {
    skull: 80,
    "skull-and-spine": 140,
    mask: 60,
    insignia: 50,
  };
  const conditionMultiplier: Record<TrophyCondition, number> = {
    damaged: 1.2,
    intact: 1,
    pristine: 0.85,
  };
  const multiplier = conditionMultiplier[trophy.condition];
  return {
    cleaning: Math.round(partCleaning[trophy.partId] * multiplier),
    mounting: Math.round(partMounting[trophy.partId] * multiplier),
  };
}

function workshopRecordForTrophy(
  trophy: TrophyRecord,
  now: string,
): TrophyWorkshopRecord {
  const durations = preparationDurations(trophy);
  const stage = projectedPreparationStage(trophy);
  return {
    claimId: trophy.id,
    targetName: trophy.targetName,
    speciesId: speciesForTrophy(trophy),
    huntMethodId: huntMethodForTrophy(trophy),
    partId: trophy.partId,
    condition: trophy.condition,
    quality: trophy.quality,
    stage,
    cleaningSeconds:
      stage === "raw" || stage === "cleaning" ? 0 : durations.cleaning,
    requiredCleaningSeconds: durations.cleaning,
    mountingSeconds:
      stage === "mounted" || stage === "displayed"
        ? durations.mounting
        : 0,
    requiredMountingSeconds: durations.mounting,
    displaySlotId: null,
    updatedAt: now,
  };
}

function projectedPreparationStage(
  trophy: TrophyRecord,
): TrophyPreparationStage {
  const actions = trophy.workshop?.completedActions ?? [];
  if (actions.includes("display") || actions.includes("rite")) {
    return "displayed";
  }
  if (actions.includes("prepare")) return "mounted";
  if (actions.includes("clean")) return "cleaned";
  return "raw";
}

function hasCoreWorkshopProgress(trophy: TrophyRecord): boolean {
  return (trophy.workshop?.completedActions.length ?? 0) > 0;
}

function reconcileTrophyDisplays(
  trophies: readonly TrophyWorkshopRecord[],
  rawSlots: readonly unknown[] = [],
): {
  trophies: TrophyWorkshopRecord[];
  displaySlots: TrophyDisplaySlot[];
} {
  const displayableClaimIds = new Set(
    trophies
      .filter(({ stage }) => stage === "displayed")
      .map(({ claimId }) => claimId),
  );
  const slotCount = Math.max(
    DISPLAY_SLOT_COUNT,
    displayableClaimIds.size,
    Math.min(rawSlots.length, 64),
  );
  const usedClaimIds = new Set<string>();
  const displaySlots = defaultDisplaySlots(slotCount).map(
    (fallback, index) => {
      const raw = isRecord(rawSlots[index]) ? rawSlots[index] : {};
      const claimId =
        typeof raw.claimId === "string" &&
        displayableClaimIds.has(raw.claimId) &&
        !usedClaimIds.has(raw.claimId)
          ? raw.claimId
          : null;
      if (claimId) usedClaimIds.add(claimId);
      return {
        ...fallback,
        label: safeName(raw.label, fallback.label, 32),
        claimId,
      };
    },
  );

  for (const trophy of trophies) {
    if (
      trophy.stage !== "displayed" ||
      usedClaimIds.has(trophy.claimId)
    ) {
      continue;
    }
    const freeSlot = displaySlots.find(({ claimId }) => claimId === null);
    if (!freeSlot) continue;
    freeSlot.claimId = trophy.claimId;
    usedClaimIds.add(trophy.claimId);
  }

  const slotByClaimId = new Map(
    displaySlots
      .filter(
        (slot): slot is TrophyDisplaySlot & { claimId: string } =>
          slot.claimId !== null,
      )
      .map((slot) => [slot.claimId, slot.id]),
  );
  return {
    displaySlots,
    trophies: trophies.map((record) => {
      const displaySlotId = slotByClaimId.get(record.claimId) ?? null;
      return {
        ...record,
        displaySlotId,
        ...(record.stage === "displayed"
          ? {
              cleaningSeconds: record.requiredCleaningSeconds,
              mountingSeconds: record.requiredMountingSeconds,
            }
          : {}),
      };
    }),
  };
}

/**
 * The core trophy schema predates per-kill weapon telemetry. Until that field
 * exists, campaign context provides a deterministic, lore-coherent method:
 * an armed human is hunted at range, the apex beast with a reach weapon, and
 * the Bad Blood through a close honor duel. setTrophyHuntMethod() remains an
 * explicit override for future runtime telemetry.
 */
export function huntMethodForTrophy(
  trophy: Pick<
    TrophyRecord,
    "missionId" | "sourceEnemyId" | "targetKind"
  >,
): TrophyHuntMethodId {
  if (trophy.sourceEnemyId) {
    if (trophy.targetKind === "yautja") return "wristblades";
    if (trophy.targetKind === "beast") return "combistick";
    return "plasma-caster";
  }
  if (
    trophy.missionId === "volcano-bad-blood" ||
    trophy.targetKind === "yautja"
  ) {
    return "wristblades";
  }
  if (
    trophy.missionId === "ice-cryostalker" ||
    trophy.targetKind === "beast"
  ) {
    return "combistick";
  }
  return "plasma-caster";
}

function rankIndex(rankId: RankId): number {
  return RANK_SEQUENCE.indexOf(rankId);
}

function metricForRite(
  id: ClanRiteId,
  save: SaveGame,
  state: ShipProgressionState,
): { current: number; target: number } {
  const displayedCount = state.trophies.filter(
    ({ stage }) => stage === "displayed",
  ).length;
  const mountedCount = state.trophies.filter(({ stage }) =>
    stage === "mounted" || stage === "displayed",
  ).length;
  const distinctKnownMethods = new Set(
    state.trophies
      .map(({ huntMethodId }) => huntMethodId)
      .filter((methodId) => methodId !== "unknown"),
  ).size;
  const flawlessCount = state.trophies.filter(
    ({ quality }) => quality === "flawless",
  ).length;

  switch (id) {
    case "first-trophy":
      return { current: save.trophies.length, target: 1 };
    case "blooded-rank":
      return {
        current: rankIndex(save.profile.rankId),
        target: rankIndex("blooded"),
      };
    case "trophy-artisan":
      return { current: mountedCount, target: 1 };
    case "hall-keeper":
      return { current: displayedCount, target: 3 };
    case "many-paths":
      return { current: distinctKnownMethods, target: 3 };
    case "clan-judgement":
      return {
        current:
          save.missionProgress["volcano-bad-blood"].completions > 0
            ? 1
            : 0,
        target: 1,
      };
    case "elder-ascension":
      return {
        current:
          (save.profile.rankId === "elder" ? 1 : 0) +
          (flawlessCount > 0 ? 1 : 0),
        target: 2,
      };
  }
}

const RITE_COPY: Readonly<
  Record<ClanRiteId, { name: string; description: string }>
> = {
  "first-trophy": {
    name: "Première prise",
    description: "Rapporter un trophée digne au vaisseau.",
  },
  "blooded-rank": {
    name: "Marque de sang",
    description: "Atteindre le rang Blooded selon l’honneur accumulé.",
  },
  "trophy-artisan": {
    name: "Main du conservateur",
    description: "Nettoyer puis monter un trophée.",
  },
  "hall-keeper": {
    name: "Mémoire du clan",
    description: "Exposer trois prises dans la salle des trophées.",
  },
  "many-paths": {
    name: "Arsenal maîtrisé",
    description: "Consigner trois méthodes de chasse distinctes.",
  },
  "clan-judgement": {
    name: "Jugement du Paria",
    description: "Achever le rite contre le Bad Blood.",
  },
  "elder-ascension": {
    name: "Voie de l’Ancien",
    description: "Atteindre le rang Ancien avec une prise sans défaut.",
  },
};

export function evaluateRites(
  save: SaveGame,
  state: ShipProgressionState,
): RiteProgress[] {
  return RITE_IDS.map((id) => {
    const metric = metricForRite(id, save, state);
    const current = Math.min(metric.current, metric.target);
    const completed =
      state.completedRiteIds.includes(id) || current >= metric.target;
    return {
      id,
      ...RITE_COPY[id],
      current,
      target: metric.target,
      ratio: metric.target <= 0 ? 1 : clamp(current / metric.target, 0, 1),
      completed,
    };
  });
}

function earnedRiteIds(
  save: SaveGame,
  state: ShipProgressionState,
): ClanRiteId[] {
  const earnedNow = evaluateRites(save, state)
    .filter(({ current, target }) => current >= target)
    .map(({ id }) => id);
  return [
    ...new Set<ClanRiteId>([
      ...state.completedRiteIds,
      ...earnedNow,
    ]),
  ];
}

export function createDefaultShipProgression(
  save: SaveGame,
  now = new Date().toISOString(),
): ShipProgressionState {
  const projectedTrophies = reconcileTrophyDisplays(
    save.trophies.map((trophy) => workshopRecordForTrophy(trophy, now)),
  );
  const state: ShipProgressionState = {
    version: SHIP_PROGRESSION_VERSION,
    ownerSaveCreatedAt: save.createdAt,
    updatedAt: now,
    selectedShipId: DEFAULT_SHIP_ID,
    unlockedShipIds: availableShipIds(save),
    completedRiteIds: [],
    trophies: projectedTrophies.trophies,
    displaySlots: projectedTrophies.displaySlots,
    loadoutPresets: defaultLoadoutPresets(save, now),
    training: defaultTraining(),
    medbay: {
      status: "ready",
      treatmentId: null,
      startedAt: null,
      completesAt: null,
      treatmentsCompleted: 0,
    },
  };
  return {
    ...state,
    completedRiteIds: earnedRiteIds(save, state),
  };
}

function normalizeWorkshopRecord(
  source: unknown,
  trophy: TrophyRecord,
  now: string,
): TrophyWorkshopRecord {
  const fallback = workshopRecordForTrophy(trophy, now);
  if (!isRecord(source)) return fallback;

  // Successful mini-games live in the core save and are authoritative. The
  // sidecar stage is only retained for saves created before workshop actions
  // were persisted in TrophyRecord.
  const stage = hasCoreWorkshopProgress(trophy)
    ? projectedPreparationStage(trophy)
    : isOneOf(source.stage, PREPARATION_STAGES)
      ? source.stage
      : fallback.stage;
  const cleaningSeconds = clamp(
    finiteNumber(source.cleaningSeconds, 0),
    0,
    fallback.requiredCleaningSeconds,
  );
  const mountingSeconds = clamp(
    finiteNumber(source.mountingSeconds, 0),
    0,
    fallback.requiredMountingSeconds,
  );

  const updatedAt = validIsoDate(source.updatedAt, now);
  const record: TrophyWorkshopRecord = {
    ...fallback,
    huntMethodId: isOneOf(source.huntMethodId, HUNT_METHOD_IDS)
      ? source.huntMethodId === "unknown"
        ? fallback.huntMethodId
        : source.huntMethodId
      : fallback.huntMethodId,
    stage,
    cleaningSeconds:
      stage === "raw" ? 0 : stage === "cleaning" ? cleaningSeconds : fallback.requiredCleaningSeconds,
    mountingSeconds:
      stage === "mounting"
        ? mountingSeconds
        : stage === "mounted" || stage === "displayed"
          ? fallback.requiredMountingSeconds
        : 0,
    displaySlotId:
      stage === "displayed" && typeof source.displaySlotId === "string"
        ? source.displaySlotId
        : null,
    updatedAt,
  };
  const elapsedSeconds = Math.max(
    0,
    (Date.parse(now) - Date.parse(updatedAt)) / 1_000,
  );
  return advanceWorkshopRecord(record, elapsedSeconds, now);
}

function normalizeLoadoutPreset(
  source: unknown,
  id: ShipLoadoutSlotId,
  index: number,
  save: SaveGame,
  now: string,
): ShipLoadoutPreset {
  const fallback = defaultLoadoutPresets(save, now)[index];
  if (!isRecord(source)) return fallback;
  const hasSnapshot =
    isRecord(source.loadout) && isRecord(source.appearance);
  if (!hasSnapshot) {
    return {
      id,
      name: safeName(source.name, fallback.name, 32),
      loadout: null,
      appearance: null,
      savedAt: null,
    };
  }

  const normalizedSnapshot = normalizeSave({
    ...save,
    loadout: source.loadout,
    appearance: source.appearance,
  });
  return {
    id,
    name: safeName(source.name, fallback.name, 32),
    loadout: cloneLoadout(normalizedSnapshot.loadout),
    appearance: cloneAppearance(normalizedSnapshot.appearance),
    savedAt: validIsoDate(source.savedAt, now),
  };
}

function normalizeTraining(
  source: unknown,
): Record<TrainingDisciplineId, TrainingRecord> {
  const record = isRecord(source) ? source : {};
  return Object.fromEntries(
    TRAINING_IDS.map((disciplineId) => {
      const raw = isRecord(record[disciplineId])
        ? record[disciplineId]
        : {};
      return [
        disciplineId,
        {
          disciplineId,
          attempts: nonNegativeInteger(raw.attempts, 0),
          bestScore: clamp(nonNegativeInteger(raw.bestScore, 0), 0, 100),
          lastScore: clamp(nonNegativeInteger(raw.lastScore, 0), 0, 100),
          lastCompletedAt:
            raw.lastCompletedAt === null
              ? null
              : validIsoDate(raw.lastCompletedAt, "") || null,
        },
      ];
    }),
  ) as Record<TrainingDisciplineId, TrainingRecord>;
}

function normalizeMedbay(source: unknown, now: string): MedbayProgress {
  if (!isRecord(source)) {
    return {
      status: "ready",
      treatmentId: null,
      startedAt: null,
      completesAt: null,
      treatmentsCompleted: 0,
    };
  }
  const treatmentId = isOneOf(
    source.treatmentId,
    MEDBAY_TREATMENT_IDS,
  )
    ? source.treatmentId
    : null;
  const startedAt =
    treatmentId &&
    typeof source.startedAt === "string" &&
    !Number.isNaN(Date.parse(source.startedAt))
      ? source.startedAt
      : null;
  const completesAt =
    treatmentId &&
    typeof source.completesAt === "string" &&
    !Number.isNaN(Date.parse(source.completesAt))
      ? source.completesAt
      : null;
  const treatmentsCompleted = nonNegativeInteger(
    source.treatmentsCompleted,
    0,
  );
  const isTreating =
    source.status === "treating" &&
    treatmentId !== null &&
    startedAt !== null &&
    completesAt !== null;
  if (isTreating && Date.parse(now) >= Date.parse(completesAt)) {
    return {
      status: "ready",
      treatmentId: null,
      startedAt: null,
      completesAt: null,
      treatmentsCompleted: treatmentsCompleted + 1,
    };
  }
  if (!isTreating) {
    return {
      status: "ready",
      treatmentId: null,
      startedAt: null,
      completesAt: null,
      treatmentsCompleted,
    };
  }
  return {
    status: "treating",
    treatmentId,
    startedAt,
    completesAt,
    treatmentsCompleted,
  };
}

export function normalizeShipProgression(
  value: unknown,
  save: SaveGame,
  now = new Date().toISOString(),
): ShipProgressionState {
  if (
    !isRecord(value) ||
    (value.version !== 1 && value.version !== 2 && value.version !== SHIP_PROGRESSION_VERSION)
  ) {
    return createDefaultShipProgression(save, now);
  }

  if (value.ownerSaveCreatedAt !== undefined) {
    if (value.ownerSaveCreatedAt !== save.createdAt) return createDefaultShipProgression(save, now);
  } else if (value.version === SHIP_PROGRESSION_VERSION) {
    return createDefaultShipProgression(save, now);
  } else {
    // V1/V2 have no provable owner. Adopt an existing campaign's legacy state
    // only when it does not predate that campaign. A fresh reset must not
    // inherit old fleet unlocks, training, rites or presets.
    const legacyUpdatedAt = typeof value.updatedAt === "string" ? Date.parse(value.updatedAt) : NaN;
    if (!Number.isFinite(legacyUpdatedAt) || legacyUpdatedAt < Date.parse(save.createdAt)) {
      return createDefaultShipProgression(save, now);
    }
  }

  // V1 sidecars predate the fleet fields. Invalid/deleted IDs are discarded,
  // while ships previously earned by this same campaign remain unlocked.
  const persistedUnlockedShipIds = Array.isArray(value.unlockedShipIds)
    ? value.unlockedShipIds.filter(isShipId)
    : [];
  const unlockedShipIds = availableShipIds(
    save,
    persistedUnlockedShipIds,
  );
  const requestedShipId = isShipId(value.selectedShipId)
    ? value.selectedShipId
    : DEFAULT_SHIP_ID;
  const selectedShipId = unlockedShipIds.includes(requestedShipId)
    ? requestedShipId
    : DEFAULT_SHIP_ID;

  const rawTrophies = Array.isArray(value.trophies)
    ? value.trophies
    : [];
  const rawByClaimId = new Map<string, unknown>();
  for (const raw of rawTrophies) {
    if (isRecord(raw) && typeof raw.claimId === "string") {
      rawByClaimId.set(raw.claimId, raw);
    }
  }
  const trophies = save.trophies.map((trophy) =>
    normalizeWorkshopRecord(rawByClaimId.get(trophy.id), trophy, now),
  );

  const rawSlots = Array.isArray(value.displaySlots)
    ? value.displaySlots
    : [];
  const projectedTrophies = reconcileTrophyDisplays(trophies, rawSlots);

  const rawPresets = Array.isArray(value.loadoutPresets)
    ? value.loadoutPresets
    : [];
  const presetById = new Map<string, unknown>();
  for (const raw of rawPresets) {
    if (isRecord(raw) && typeof raw.id === "string") {
      presetById.set(raw.id, raw);
    }
  }

  const state: ShipProgressionState = {
    version: SHIP_PROGRESSION_VERSION,
    ownerSaveCreatedAt: save.createdAt,
    // updatedAt doubles as the UI clock snapshot for countdown rendering.
    updatedAt: now,
    selectedShipId,
    unlockedShipIds,
    completedRiteIds: Array.isArray(value.completedRiteIds)
      ? [
          ...new Set(
            value.completedRiteIds.filter(
              (id): id is ClanRiteId => isOneOf(id, RITE_IDS),
            ),
          ),
        ]
      : [],
    trophies: projectedTrophies.trophies,
    displaySlots: projectedTrophies.displaySlots,
    loadoutPresets: LOADOUT_SLOT_IDS.map((id, index) =>
      normalizeLoadoutPreset(
        presetById.get(id),
        id,
        index,
        save,
        now,
      ),
    ),
    training: normalizeTraining(value.training),
    medbay: normalizeMedbay(value.medbay, now),
  };
  return {
    ...state,
    completedRiteIds: earnedRiteIds(save, state),
  };
}

export function synchronizeShipProgression(
  state: ShipProgressionState,
  save: SaveGame,
  now = new Date().toISOString(),
): ShipProgressionState {
  return normalizeShipProgression(
    {
      ...state,
      version: SHIP_PROGRESSION_VERSION,
      updatedAt: now,
    },
    save,
    now,
  );
}

export function isShipUnlocked(
  state: Pick<ShipProgressionState, "unlockedShipIds">,
  shipId: ShipId,
): boolean {
  return isShipId(shipId) && state.unlockedShipIds.includes(shipId);
}

export function evaluateShipAvailability(
  state: Pick<ShipProgressionState, "unlockedShipIds">,
  save: SaveGame,
  shipId: ShipId,
): ShipAvailability {
  return getShipAvailability(shipId, save, state.unlockedShipIds);
}

/** Unlock one earned hull; requirements cannot be bypassed by malformed UI. */
export function unlockShip(
  state: ShipProgressionState,
  save: SaveGame,
  shipId: ShipId,
  now = new Date().toISOString(),
): ShipProgressionState {
  if (!isShipId(shipId) || state.unlockedShipIds.includes(shipId)) {
    return state;
  }
  const availability = evaluateShipAvailability(state, save, shipId);
  if (!availability.requirementsMet) return state;
  return {
    ...state,
    unlockedShipIds: availableShipIds(save, [
      ...state.unlockedShipIds,
      shipId,
    ]),
    updatedAt: now,
  };
}

/** Reconcile every newly satisfied requirement after a hunt or save import. */
export function unlockAvailableShips(
  state: ShipProgressionState,
  save: SaveGame,
  now = new Date().toISOString(),
): ShipProgressionState {
  const unlockedShipIds = availableShipIds(save, state.unlockedShipIds);
  if (
    unlockedShipIds.length === state.unlockedShipIds.length &&
    unlockedShipIds.every(
      (shipId, index) => state.unlockedShipIds[index] === shipId,
    )
  ) {
    return state;
  }
  return { ...state, unlockedShipIds, updatedAt: now };
}

/** Select only a permanently unlocked hull; locked IDs leave state untouched. */
export function selectShip(
  state: ShipProgressionState,
  shipId: ShipId,
  now = new Date().toISOString(),
): ShipProgressionState {
  if (
    !isShipId(shipId) ||
    !state.unlockedShipIds.includes(shipId) ||
    state.selectedShipId === shipId
  ) {
    return state;
  }
  return { ...state, selectedShipId: shipId, updatedAt: now };
}

function updateTrophy(
  state: ShipProgressionState,
  claimId: string,
  updater: (record: TrophyWorkshopRecord) => TrophyWorkshopRecord,
  now: string,
): ShipProgressionState {
  let changed = false;
  const trophies = state.trophies.map((record) => {
    if (record.claimId !== claimId) return record;
    const next = updater(record);
    changed = next !== record;
    return next;
  });
  return changed ? { ...state, trophies, updatedAt: now } : state;
}

export function setTrophyHuntMethod(
  state: ShipProgressionState,
  claimId: string,
  huntMethodId: TrophyHuntMethodId,
  now = new Date().toISOString(),
): ShipProgressionState {
  if (!HUNT_METHOD_IDS.includes(huntMethodId)) return state;
  return updateTrophy(
    state,
    claimId,
    (record) =>
      record.huntMethodId === huntMethodId
        ? record
        : { ...record, huntMethodId, updatedAt: now },
    now,
  );
}

export function startTrophyCleaning(
  state: ShipProgressionState,
  claimId: string,
  now = new Date().toISOString(),
): ShipProgressionState {
  return updateTrophy(
    state,
    claimId,
    (record) =>
      record.stage === "raw"
        ? { ...record, stage: "cleaning", updatedAt: now }
        : record,
    now,
  );
}

export function startTrophyMounting(
  state: ShipProgressionState,
  claimId: string,
  now = new Date().toISOString(),
): ShipProgressionState {
  return updateTrophy(
    state,
    claimId,
    (record) =>
      record.stage === "cleaned"
        ? { ...record, stage: "mounting", updatedAt: now }
        : record,
    now,
  );
}

export function advanceTrophyWorkshop(
  state: ShipProgressionState,
  elapsedSeconds: number,
  now = new Date().toISOString(),
): ShipProgressionState {
  const delta = Math.max(0, finiteNumber(elapsedSeconds, 0));
  if (delta <= 0) return state;
  let changed = false;
  const trophies = state.trophies.map((record) => {
    const next = advanceWorkshopRecord(record, delta, now);
    if (next !== record) changed = true;
    return next;
  });
  return changed ? { ...state, trophies, updatedAt: now } : state;
}

function advanceWorkshopRecord(
  record: TrophyWorkshopRecord,
  elapsedSeconds: number,
  now: string,
): TrophyWorkshopRecord {
  const delta = Math.max(0, finiteNumber(elapsedSeconds, 0));
  if (delta <= 0) return record;
  if (record.stage === "cleaning") {
    const cleaningSeconds = Math.min(
      record.requiredCleaningSeconds,
      record.cleaningSeconds + delta,
    );
    return {
      ...record,
      stage:
        cleaningSeconds >= record.requiredCleaningSeconds
          ? "cleaned"
          : record.stage,
      cleaningSeconds,
      updatedAt: now,
    };
  }
  if (record.stage === "mounting") {
    const mountingSeconds = Math.min(
      record.requiredMountingSeconds,
      record.mountingSeconds + delta,
    );
    return {
      ...record,
      stage:
        mountingSeconds >= record.requiredMountingSeconds
          ? "mounted"
          : record.stage,
      mountingSeconds,
      updatedAt: now,
    };
  }
  return record;
}

export function placeTrophyOnDisplay(
  state: ShipProgressionState,
  claimId: string,
  displaySlotId: string,
  now = new Date().toISOString(),
): ShipProgressionState {
  const trophy = state.trophies.find(
    (record) => record.claimId === claimId,
  );
  const slot = state.displaySlots.find(
    (candidate) => candidate.id === displaySlotId,
  );
  if (
    !trophy ||
    !slot ||
    (trophy.stage !== "mounted" && trophy.stage !== "displayed")
  ) {
    return state;
  }

  const evictedClaimId = slot.claimId;
  const displaySlots = state.displaySlots.map((candidate) => {
    if (candidate.id === displaySlotId) {
      return { ...candidate, claimId };
    }
    if (candidate.claimId === claimId) {
      return { ...candidate, claimId: null };
    }
    return candidate;
  });
  const trophies = state.trophies.map((record) => {
    if (record.claimId === claimId) {
      return {
        ...record,
        stage: "displayed" as const,
        displaySlotId,
        updatedAt: now,
      };
    }
    if (record.claimId === evictedClaimId) {
      return {
        ...record,
        stage: "mounted" as const,
        displaySlotId: null,
        updatedAt: now,
      };
    }
    return record;
  });
  return { ...state, trophies, displaySlots, updatedAt: now };
}

export function removeTrophyFromDisplay(
  state: ShipProgressionState,
  claimId: string,
  now = new Date().toISOString(),
): ShipProgressionState {
  const trophy = state.trophies.find(
    (record) => record.claimId === claimId,
  );
  if (!trophy || trophy.stage !== "displayed") return state;
  return {
    ...state,
    updatedAt: now,
    trophies: state.trophies.map((record) =>
      record.claimId === claimId
        ? {
            ...record,
            stage: "mounted" as const,
            displaySlotId: null,
            updatedAt: now,
          }
        : record,
    ),
    displaySlots: state.displaySlots.map((slot) =>
      slot.claimId === claimId ? { ...slot, claimId: null } : slot,
    ),
  };
}

export function saveLoadoutPreset(
  state: ShipProgressionState,
  slotId: ShipLoadoutSlotId,
  name: string,
  loadout: Loadout,
  appearance: HunterAppearance,
  now = new Date().toISOString(),
): ShipProgressionState {
  if (!LOADOUT_SLOT_IDS.includes(slotId)) return state;
  return {
    ...state,
    updatedAt: now,
    loadoutPresets: state.loadoutPresets.map((preset) =>
      preset.id === slotId
        ? {
            id: slotId,
            name: safeName(name, preset.name, 32),
            loadout: cloneLoadout(loadout),
            appearance: cloneAppearance(appearance),
            savedAt: now,
          }
        : preset,
    ),
  };
}

export function loadLoadoutPreset(
  state: ShipProgressionState,
  slotId: ShipLoadoutSlotId,
): { loadout: Loadout; appearance: HunterAppearance } | null {
  const preset = state.loadoutPresets.find(
    (candidate) => candidate.id === slotId,
  );
  if (!preset?.loadout || !preset.appearance) return null;
  return {
    loadout: cloneLoadout(preset.loadout),
    appearance: cloneAppearance(preset.appearance),
  };
}

export function recordTrainingResult(
  state: ShipProgressionState,
  disciplineId: TrainingDisciplineId,
  score: number,
  now = new Date().toISOString(),
): ShipProgressionState {
  if (!TRAINING_IDS.includes(disciplineId)) return state;
  const normalizedScore = clamp(Math.round(finiteNumber(score, 0)), 0, 100);
  const previous = state.training[disciplineId];
  return {
    ...state,
    updatedAt: now,
    training: {
      ...state.training,
      [disciplineId]: {
        disciplineId,
        attempts: previous.attempts + 1,
        bestScore: Math.max(previous.bestScore, normalizedScore),
        lastScore: normalizedScore,
        lastCompletedAt: now,
      },
    },
  };
}

export function startMedbayTreatment(
  state: ShipProgressionState,
  treatmentId: MedbayTreatmentId,
  durationSeconds: number,
  now = new Date().toISOString(),
): ShipProgressionState {
  if (
    !MEDBAY_TREATMENT_IDS.includes(treatmentId) ||
    state.medbay.status === "treating"
  ) {
    return state;
  }
  const duration = clamp(
    Math.round(finiteNumber(durationSeconds, 0)),
    5,
    3_600,
  );
  return {
    ...state,
    updatedAt: now,
    medbay: {
      ...state.medbay,
      status: "treating",
      treatmentId,
      startedAt: now,
      completesAt: new Date(Date.parse(now) + duration * 1_000).toISOString(),
    },
  };
}

export function resolveMedbayTreatment(
  state: ShipProgressionState,
  now = new Date().toISOString(),
): ShipProgressionState {
  if (
    state.medbay.status !== "treating" ||
    !state.medbay.completesAt ||
    Date.parse(now) < Date.parse(state.medbay.completesAt)
  ) {
    return state;
  }
  return {
    ...state,
    updatedAt: now,
    medbay: {
      status: "ready",
      treatmentId: null,
      startedAt: null,
      completesAt: null,
      treatmentsCompleted: state.medbay.treatmentsCompleted + 1,
    },
  };
}

export function advanceShipProgression(
  state: ShipProgressionState,
  elapsedSeconds: number,
  now = new Date().toISOString(),
): ShipProgressionState {
  const hasTimedWork =
    state.medbay.status === "treating" ||
    state.trophies.some(
      ({ stage }) => stage === "cleaning" || stage === "mounting",
    );
  const next = resolveMedbayTreatment(
    advanceTrophyWorkshop(state, elapsedSeconds, now),
    now,
  );
  return hasTimedWork && next.updatedAt !== now
    ? { ...next, updatedAt: now }
    : next;
}

export function evaluateClanProgression(
  save: SaveGame,
  state: ShipProgressionState,
): ClanProgressSnapshot {
  const rites = evaluateRites(save, state);
  const currentRankIndex = rankIndex(save.profile.rankId);
  const nextRankId =
    RANK_SEQUENCE[currentRankIndex + 1] ?? null;
  const currentThreshold = RANK_THRESHOLDS[save.profile.rankId];
  const nextThreshold = nextRankId
    ? RANK_THRESHOLDS[nextRankId]
    : null;
  const rankProgress =
    nextThreshold === null
      ? 1
      : clamp(
          (save.profile.honor - currentThreshold) /
            Math.max(1, nextThreshold - currentThreshold),
          0,
          1,
        );
  const trophiesBySpecies = Object.fromEntries(
    SPECIES_IDS.map((id) => [id, 0]),
  ) as Record<TrophySpeciesId, number>;
  const trophiesByMethod = Object.fromEntries(
    HUNT_METHOD_IDS.map((id) => [id, 0]),
  ) as Record<TrophyHuntMethodId, number>;
  for (const trophy of state.trophies) {
    trophiesBySpecies[trophy.speciesId] += 1;
    trophiesByMethod[trophy.huntMethodId] += 1;
  }
  const completedRites = rites.filter(({ completed }) => completed);
  const displayedTrophies = state.trophies.filter(
    ({ stage }) => stage === "displayed",
  ).length;
  const trainingMastery = Object.values(state.training).reduce(
    (total, record) => total + record.bestScore,
    0,
  );

  return {
    rankId: save.profile.rankId,
    rankLabel: RANK_LABELS[save.profile.rankId],
    honor: save.profile.honor,
    clanMarks: save.profile.clanMarks,
    nextRankId,
    nextRankLabel: nextRankId ? RANK_LABELS[nextRankId] : null,
    honorForNextRank: nextThreshold,
    rankProgress,
    prestige: Math.round(
      save.profile.honor +
        save.profile.clanMarks * 0.25 +
        completedRites.length * 100 +
        displayedTrophies * 50 +
        trainingMastery * 0.2,
    ),
    completedRites,
    pendingRites: rites.filter(({ completed }) => !completed),
    trophiesBySpecies,
    trophiesByMethod,
  };
}

function browserStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export type ShipProgressionWriteFailure =
  | "storage-unavailable"
  | "read-failed"
  | "save-owner"
  | "protected-save"
  | "write-failed";

export interface ShipProgressionWriteResult {
  state: ShipProgressionState;
  persisted: boolean;
  failure: ShipProgressionWriteFailure | null;
}

function parseShipSidecar(serialized: string): Record<string, unknown> | null {
  if (serialized.length > SHIP_PROGRESSION_MAX_SERIALIZED_BYTES ||
      new TextEncoder().encode(serialized).byteLength > SHIP_PROGRESSION_MAX_SERIALIZED_BYTES) return null;
  try {
    const parsed: unknown = JSON.parse(serialized);
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function currentCampaignFailure(storage: Storage, save: SaveGame): ShipProgressionWriteFailure | null {
  const serialized = storage.getItem(SAVE_STORAGE_KEY);
  if (serialized === null) return null;
  const primary = parseSaveImport(serialized);
  if (!primary.save) return "protected-save";
  return primary.save.createdAt === save.createdAt ? null : "save-owner";
}

export function loadShipProgression(
  save: SaveGame,
  storage: Storage | null = browserStorage(),
  key = SHIP_PROGRESSION_STORAGE_KEY,
): ShipProgressionState {
  if (!storage) return createDefaultShipProgression(save);
  try {
    const serialized = storage.getItem(key);
    const parsed = serialized === null ? null : parseShipSidecar(serialized);
    if (!parsed) return createDefaultShipProgression(save);
    const state = normalizeShipProgression(parsed, save);
    if ((parsed.version === 1 || parsed.version === 2) &&
        (parsed.ownerSaveCreatedAt === save.createdAt ||
         (parsed.ownerSaveCreatedAt === undefined && typeof parsed.updatedAt === "string" &&
          Date.parse(parsed.updatedAt) >= Date.parse(save.createdAt)))) {
      // Bind an adopted legacy sidecar now, before a later reset can change
      // campaigns. Failure preserves the original data and usable memory state.
      writeShipProgressionWithStatus(state, save, storage, key);
    }
    return state;
  } catch {
    return createDefaultShipProgression(save);
  }
}

export function writeShipProgressionWithStatus(
  state: ShipProgressionState,
  save: SaveGame,
  storage: Storage | null = browserStorage(),
  key = SHIP_PROGRESSION_STORAGE_KEY,
): ShipProgressionWriteResult {
  const now = new Date().toISOString();
  const snapshot = normalizeShipProgression({ ...state, updatedAt: now }, save, now);
  const failed = (failure: ShipProgressionWriteFailure): ShipProgressionWriteResult => ({
    state: snapshot, persisted: false, failure,
  });
  if (state.ownerSaveCreatedAt !== save.createdAt) return failed("save-owner");
  if (!storage) return failed("storage-unavailable");
  try {
    const campaignFailure = currentCampaignFailure(storage, save);
    if (campaignFailure) return failed(campaignFailure);
    const previous = storage.getItem(key);
    const parsed = previous === null ? null : parseShipSidecar(previous);
    if (parsed && Number(parsed.version) > SHIP_PROGRESSION_VERSION) return failed("protected-save");
    // Without a stored campaign to establish a new owner, do not let an old
    // tab overwrite a foreign sidecar merely by supplying another SaveGame.
    if (typeof parsed?.ownerSaveCreatedAt === "string" && parsed.ownerSaveCreatedAt !== save.createdAt &&
        storage.getItem(SAVE_STORAGE_KEY) === null) return failed("save-owner");
  } catch {
    return failed("read-failed");
  }
  try {
    const serialized = JSON.stringify(snapshot);
    if (new TextEncoder().encode(serialized).byteLength > SHIP_PROGRESSION_MAX_SERIALIZED_BYTES) return failed("write-failed");
    storage.setItem(key, serialized);
    if (storage.getItem(key) !== serialized) return failed("write-failed");
    return { state: snapshot, persisted: true, failure: null };
  } catch {
    return failed("write-failed");
  }
}

/** Explicitly retire the prior sidecar after a durable campaign reset/import. */
export function resetShipProgressionWithStatus(
  save: SaveGame,
  storage: Storage | null = browserStorage(),
  key = SHIP_PROGRESSION_STORAGE_KEY,
): ShipProgressionWriteResult {
  const state = createDefaultShipProgression(save);
  const failed = (failure: ShipProgressionWriteFailure): ShipProgressionWriteResult => ({ state, persisted: false, failure });
  if (!storage) return failed("storage-unavailable");
  try {
    const campaignFailure = currentCampaignFailure(storage, save);
    if (campaignFailure) return failed(campaignFailure);
  } catch {
    return failed("read-failed");
  }
  try {
    const serialized = JSON.stringify(state);
    storage.setItem(key, serialized);
    if (storage.getItem(key) === serialized) return { state, persisted: true, failure: null };
  } catch {
    // A quota can reject replacement while removal still succeeds.
  }
  try {
    storage.removeItem(key);
    if (storage.getItem(key) === null) return { state, persisted: true, failure: null };
  } catch {
    // A foreign V3 owner remains ignored even when every mutation is blocked.
  }
  return failed("write-failed");
}

export function writeShipProgression(
  state: ShipProgressionState,
  save: SaveGame,
  storage: Storage | null = browserStorage(),
  key = SHIP_PROGRESSION_STORAGE_KEY,
): ShipProgressionState {
  return writeShipProgressionWithStatus(state, save, storage, key).state;
}
