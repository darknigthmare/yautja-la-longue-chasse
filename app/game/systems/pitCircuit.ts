/**
 * Pure, deterministic Clan Circuit progression for THE PIT.
 *
 * The module owns no storage and never touches campaign progression. Every
 * permanent output is an explicitly PIT-only cosmetic id from the published
 * five-chapter first-edition contract.
 */

import {
  PIT_CLAN_CIRCUIT_CHAPTERS,
  PIT_FIRST_EDITION_ARENA_IDS,
  PIT_FIRST_EDITION_FIGHTER_IDS,
  PIT_FIRST_EDITION_FIGHTERS,
  type PitClanCircuitChapter,
  type PitFirstEditionArenaId,
  type PitFirstEditionCombatantId,
  type PitFirstEditionFighterId,
  isPitFirstEditionFighterId,
} from "./pitFirstEdition";

export {
  PIT_CLAN_CIRCUIT_CHAPTERS,
  PIT_FIRST_EDITION_ARENA_IDS,
  PIT_FIRST_EDITION_FIGHTER_IDS,
  PIT_FIRST_EDITION_FIGHTERS,
} from "./pitFirstEdition";

export const PIT_CIRCUIT_CONTENT_VERSION = 1 as const;
export const PIT_CIRCUIT_RUN_VERSION = 1 as const;
export const PIT_CIRCUIT_FIGHT_COUNT = 12 as const;
export const PIT_CIRCUIT_MAX_RESULTS = 64 as const;

export type PitCircuitChapterId = PitClanCircuitChapter["id"];
export type PitCircuitFightKind =
  | "opening-duel"
  | "path-guardian"
  | "trophy-trace"
  | "pit-survival"
  | "rival"
  | "boss";

export interface PitCircuitFight {
  /** One-based position in the complete Circuit. */
  readonly index: number;
  readonly id: string;
  readonly chapterId: PitCircuitChapterId;
  readonly chapterFightIndex: number;
  readonly kind: PitCircuitFightKind;
  readonly opponentId: PitFirstEditionCombatantId;
  readonly arenaId: PitFirstEditionArenaId;
  readonly bestOf: 3;
}

export interface PitCircuitChapterPlan {
  /** Exact object from PIT_CLAN_CIRCUIT_CHAPTERS, kept in published order. */
  readonly chapter: PitClanCircuitChapter;
  readonly fights: readonly PitCircuitFight[];
}

export interface PitCircuitDefinition {
  readonly version: typeof PIT_CIRCUIT_CONTENT_VERSION;
  readonly id: string;
  readonly fighterId: PitFirstEditionFighterId;
  readonly chapters: readonly PitCircuitChapterPlan[];
  readonly fights: readonly PitCircuitFight[];
}

export interface PitCircuitCosmeticReward {
  readonly id: string;
  readonly chapterId: PitCircuitChapterId;
  readonly source: "clan-circuit";
  readonly scope: "pit-only";
  readonly kind: "cosmetic";
  readonly final: boolean;
}

export const PIT_CIRCUIT_COSMETIC_REWARDS: readonly PitCircuitCosmeticReward[] =
  PIT_CLAN_CIRCUIT_CHAPTERS.map((chapter, index) => ({
    id: chapter.cosmeticRewardId,
    chapterId: chapter.id,
    source: "clan-circuit",
    scope: "pit-only",
    kind: "cosmetic",
    final: index === PIT_CLAN_CIRCUIT_CHAPTERS.length - 1,
  }));

export const PIT_CIRCUIT_FINAL_COSMETIC: PitCircuitCosmeticReward =
  PIT_CIRCUIT_COSMETIC_REWARDS[PIT_CIRCUIT_COSMETIC_REWARDS.length - 1];

const CHAPTER_FIGHT_COUNTS = [1, 3, 2, 4, 2] as const;
const CIRCUIT_ARENA_SEQUENCE: readonly PitFirstEditionArenaId[] = [
  "the-pit",
  "canopy-causeway",
  "frost-chamber",
  "ash-courtyard",
  "trophy-hall",
  "glass-terrace",
  "abyssal-bridge",
  "canopy-causeway",
  "frost-chamber",
  "ash-courtyard",
  "the-pit",
  "ruins-tribunal",
];

function rotate<T>(values: readonly T[], offset: number): T[] {
  if (values.length === 0) return [];
  const start = ((offset % values.length) + values.length) % values.length;
  return [...values.slice(start), ...values.slice(0, start)];
}

function fightKind(chapterIndex: number, globalFightIndex: number): PitCircuitFightKind {
  if (globalFightIndex === PIT_CIRCUIT_FIGHT_COUNT - 1) return "boss";
  if (globalFightIndex === PIT_CIRCUIT_FIGHT_COUNT - 2) return "rival";
  return [
    "opening-duel",
    "path-guardian",
    "trophy-trace",
    "pit-survival",
  ][chapterIndex] as PitCircuitFightKind;
}

function buildPitCircuit(fighterId: PitFirstEditionFighterId): PitCircuitDefinition {
  const fighterIndex = PIT_FIRST_EDITION_FIGHTER_IDS.indexOf(fighterId);
  const rivalId = PIT_FIRST_EDITION_FIGHTERS[fighterId].rivalId;
  if (!rivalId || rivalId === fighterId) {
    throw new Error("A Clan Circuit fighter requires a distinct first-edition rival.");
  }

  const otherHunters = PIT_FIRST_EDITION_FIGHTER_IDS.filter(
    (candidate) => candidate !== fighterId && candidate !== rivalId,
  );
  const opponents: readonly PitFirstEditionCombatantId[] = [
    ...rotate(otherHunters, fighterIndex * 3 + 1),
    rivalId,
    "kok-warlord",
  ];

  let globalFightIndex = 0;
  const chapters = PIT_CLAN_CIRCUIT_CHAPTERS.map((chapter, chapterIndex) => {
    const fights = Array.from(
      { length: CHAPTER_FIGHT_COUNTS[chapterIndex] },
      (_, localFightIndex): PitCircuitFight => {
        const index = globalFightIndex;
        const fight: PitCircuitFight = {
          index: index + 1,
          id: `${fighterId}-circuit-${String(index + 1).padStart(2, "0")}`,
          chapterId: chapter.id,
          chapterFightIndex: localFightIndex + 1,
          kind: fightKind(chapterIndex, index),
          opponentId: opponents[index],
          arenaId: CIRCUIT_ARENA_SEQUENCE[index],
          bestOf: 3,
        };
        globalFightIndex += 1;
        return fight;
      },
    );
    return { chapter, fights };
  });
  const fights = chapters.flatMap((chapter) => chapter.fights);

  if (
    fights.length !== PIT_CIRCUIT_FIGHT_COUNT ||
    new Set(fights.map((fight) => fight.arenaId)).size !==
      PIT_FIRST_EDITION_ARENA_IDS.length
  ) {
    throw new Error("Invalid first-edition Clan Circuit content contract.");
  }

  return {
    version: PIT_CIRCUIT_CONTENT_VERSION,
    id: `pit-clan-circuit-${fighterId}-v${PIT_CIRCUIT_CONTENT_VERSION}`,
    fighterId,
    chapters,
    fights,
  };
}

export const PIT_CLAN_CIRCUITS: Readonly<
  Record<PitFirstEditionFighterId, PitCircuitDefinition>
> = Object.fromEntries(
  PIT_FIRST_EDITION_FIGHTER_IDS.map((fighterId) => [fighterId, buildPitCircuit(fighterId)]),
) as unknown as Readonly<Record<PitFirstEditionFighterId, PitCircuitDefinition>>;

export type PitCircuitRunPhase = "active" | "completed";
export type PitCircuitOutcome = "victory" | "defeat" | "draw";

export interface PitCircuitAppliedResult {
  readonly resultId: string;
  readonly fightId: string;
  readonly outcome: PitCircuitOutcome;
}

export type PitCircuitFightResult = PitCircuitAppliedResult;

export interface PitCircuitRun {
  readonly version: typeof PIT_CIRCUIT_RUN_VERSION;
  readonly circuitId: string;
  readonly fighterId: PitFirstEditionFighterId;
  readonly phase: PitCircuitRunPhase;
  /** Zero-based position of the next fight; 12 means the Circuit is complete. */
  readonly fightIndex: number;
  readonly currentChapterId: PitCircuitChapterId | null;
  readonly selectedFightId: string | null;
  readonly victories: number;
  readonly defeats: number;
  readonly draws: number;
  readonly completedChapterIds: readonly PitCircuitChapterId[];
  readonly appliedResults: readonly PitCircuitAppliedResult[];
  readonly unlockedPitCosmeticIds: readonly string[];
}

export interface PitCircuitResultApplication {
  readonly run: PitCircuitRun;
  readonly applied: boolean;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  try {
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
  } catch {
    return false;
  }
}

function validIdentifier(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= 96;
}

function sameStrings(left: readonly string[], right: unknown): boolean {
  return (
    Array.isArray(right) &&
    left.length === right.length &&
    left.every((value, index) => right[index] === value)
  );
}

function cloneResult(result: PitCircuitAppliedResult): PitCircuitAppliedResult {
  return { ...result };
}

function cloneRun(run: PitCircuitRun): PitCircuitRun {
  return {
    ...run,
    completedChapterIds: [...run.completedChapterIds],
    appliedResults: run.appliedResults.map(cloneResult),
    unlockedPitCosmeticIds: [...run.unlockedPitCosmeticIds],
  };
}

function completedChapterCount(circuit: PitCircuitDefinition, fightIndex: number): number {
  let completedFights = 0;
  let completedChapters = 0;
  for (const chapter of circuit.chapters) {
    completedFights += chapter.fights.length;
    if (fightIndex < completedFights) break;
    completedChapters += 1;
  }
  return completedChapters;
}

function deriveRun(
  fighterId: PitFirstEditionFighterId,
  appliedResults: readonly PitCircuitAppliedResult[],
  selectedFightId: string | null,
): PitCircuitRun | null {
  const circuit = PIT_CLAN_CIRCUITS[fighterId];
  let fightIndex = 0;
  let victories = 0;
  let defeats = 0;
  let draws = 0;
  const seenResultIds = new Set<string>();
  const canonicalResults: PitCircuitAppliedResult[] = [];

  for (const candidate of appliedResults) {
    if (!isRecord(candidate)) return null;
    if (!validIdentifier(candidate.resultId) || !validIdentifier(candidate.fightId)) return null;
    if (
      candidate.outcome !== "victory" &&
      candidate.outcome !== "defeat" &&
      candidate.outcome !== "draw"
    ) {
      return null;
    }
    const resultId = candidate.resultId.trim();
    if (seenResultIds.has(resultId)) return null;
    const fight = circuit.fights[fightIndex];
    if (!fight || candidate.fightId.trim() !== fight.id) return null;

    seenResultIds.add(resultId);
    canonicalResults.push({
      resultId,
      fightId: fight.id,
      outcome: candidate.outcome,
    });
    if (candidate.outcome === "victory") {
      victories += 1;
      fightIndex += 1;
    } else if (candidate.outcome === "defeat") {
      defeats += 1;
    } else {
      draws += 1;
    }
  }

  const phase: PitCircuitRunPhase =
    fightIndex === PIT_CIRCUIT_FIGHT_COUNT ? "completed" : "active";
  const chapterCount = completedChapterCount(circuit, fightIndex);
  const completedChapterIds = PIT_CLAN_CIRCUIT_CHAPTERS.slice(0, chapterCount).map(
    (chapter) => chapter.id,
  );
  const unlockedPitCosmeticIds = PIT_CLAN_CIRCUIT_CHAPTERS.slice(0, chapterCount).map(
    (chapter) => chapter.cosmeticRewardId,
  );
  const currentFight = circuit.fights[fightIndex] ?? null;
  if (
    (phase === "completed" && selectedFightId !== null) ||
    (selectedFightId !== null && selectedFightId !== currentFight?.id)
  ) {
    return null;
  }

  return {
    version: PIT_CIRCUIT_RUN_VERSION,
    circuitId: circuit.id,
    fighterId,
    phase,
    fightIndex,
    currentChapterId: currentFight?.chapterId ?? null,
    selectedFightId,
    victories,
    defeats,
    draws,
    completedChapterIds,
    appliedResults: canonicalResults,
    unlockedPitCosmeticIds,
  };
}

export function createPitCircuitRun(fighterId: PitFirstEditionFighterId): PitCircuitRun {
  if (!isPitFirstEditionFighterId(fighterId)) {
    throw new Error("THE PIT Clan Circuit requires a first-edition fighter.");
  }
  const run = deriveRun(fighterId, [], null);
  if (!run) throw new Error("Unable to create THE PIT Clan Circuit run.");
  return run;
}

export function normalizePitCircuitRun(value: unknown): PitCircuitRun | null {
  try {
    if (!isRecord(value) || value.version !== PIT_CIRCUIT_RUN_VERSION) return null;
    if (!isPitFirstEditionFighterId(value.fighterId)) return null;
    const circuit = PIT_CLAN_CIRCUITS[value.fighterId];
    if (value.circuitId !== circuit.id) return null;
    if (!Array.isArray(value.appliedResults) || value.appliedResults.length > PIT_CIRCUIT_MAX_RESULTS) {
      return null;
    }
    if (value.selectedFightId !== null && !validIdentifier(value.selectedFightId)) return null;

    const derived = deriveRun(
      value.fighterId,
      value.appliedResults as readonly PitCircuitAppliedResult[],
      value.selectedFightId === null ? null : value.selectedFightId.trim(),
    );
    if (!derived) return null;
    if (
      value.phase !== derived.phase ||
      value.fightIndex !== derived.fightIndex ||
      value.currentChapterId !== derived.currentChapterId ||
      value.victories !== derived.victories ||
      value.defeats !== derived.defeats ||
      value.draws !== derived.draws ||
      !sameStrings(derived.completedChapterIds, value.completedChapterIds) ||
      !sameStrings(derived.unlockedPitCosmeticIds, value.unlockedPitCosmeticIds)
    ) {
      return null;
    }
    return derived;
  } catch {
    return null;
  }
}

export function getPitCircuitAvailableFights(runValue: PitCircuitRun): readonly PitCircuitFight[] {
  const run = normalizePitCircuitRun(runValue);
  if (!run) throw new Error("Invalid or incompatible THE PIT Clan Circuit run.");
  if (run.phase === "completed") return [];
  return [PIT_CLAN_CIRCUITS[run.fighterId].fights[run.fightIndex]];
}

export function selectPitCircuitFight(
  current: PitCircuitRun,
  fightId: string,
): PitCircuitRun {
  const run = normalizePitCircuitRun(current);
  if (!run) throw new Error("Invalid or incompatible THE PIT Clan Circuit run.");
  if (run.phase !== "active") throw new Error("THE PIT Clan Circuit run is complete.");
  const expectedFight = PIT_CLAN_CIRCUITS[run.fighterId].fights[run.fightIndex];
  if (!validIdentifier(fightId) || fightId.trim() !== expectedFight.id) {
    throw new Error("The selected Clan Circuit fight is unavailable or skips progression.");
  }
  return { ...cloneRun(run), selectedFightId: expectedFight.id };
}

export function applyPitCircuitFightResult(
  current: PitCircuitRun,
  result: PitCircuitFightResult,
): PitCircuitResultApplication {
  const run = normalizePitCircuitRun(current);
  if (!run) throw new Error("Invalid or incompatible THE PIT Clan Circuit run.");
  if (!isRecord(result) || !validIdentifier(result.resultId)) {
    throw new Error("Invalid THE PIT Clan Circuit result.");
  }

  const resultId = result.resultId.trim();
  const duplicate = run.appliedResults.find((applied) => applied.resultId === resultId);
  if (duplicate) {
    if (duplicate.fightId !== result.fightId || duplicate.outcome !== result.outcome) {
      throw new Error("Conflicting THE PIT Clan Circuit result id.");
    }
    return { run: cloneRun(run), applied: false };
  }
  if (run.phase !== "active") throw new Error("THE PIT Clan Circuit run is complete.");
  if (run.appliedResults.length >= PIT_CIRCUIT_MAX_RESULTS) {
    throw new Error("THE PIT Clan Circuit result window is exhausted.");
  }
  const expectedFight = PIT_CLAN_CIRCUITS[run.fighterId].fights[run.fightIndex];
  if (
    !validIdentifier(result.fightId) ||
    result.fightId.trim() !== expectedFight.id ||
    run.selectedFightId !== expectedFight.id ||
    (result.outcome !== "victory" && result.outcome !== "defeat" && result.outcome !== "draw")
  ) {
    throw new Error("Invalid or unselected THE PIT Clan Circuit fight result.");
  }

  const next = deriveRun(
    run.fighterId,
    [
      ...run.appliedResults,
      { resultId, fightId: expectedFight.id, outcome: result.outcome },
    ],
    null,
  );
  if (!next) throw new Error("Unable to apply THE PIT Clan Circuit result.");
  return { run: next, applied: true };
}

export function serializePitCircuitRun(value: PitCircuitRun): string {
  const run = normalizePitCircuitRun(value);
  if (!run) throw new Error("Cannot serialize an invalid THE PIT Clan Circuit run.");
  return JSON.stringify(run);
}
