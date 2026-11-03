/**
 * Deterministic first-edition progression for THE PIT.
 *
 * Arcade runs and Descent runs are self-contained. Their only permanent
 * outputs are PIT cosmetic ids; no campaign currency, inventory or mission
 * reducer is imported here.
 */

import {
  PIT_CHRONICLE_BOSS_IDS,
  PIT_FIRST_EDITION_ARENA_IDS,
  PIT_FIRST_EDITION_FIGHTER_IDS,
  PIT_FIRST_EDITION_FIGHTERS,
  type PitFirstEditionArenaId,
  type PitFirstEditionCombatantId,
  type PitFirstEditionFighterId,
  isPitFirstEditionFighterId,
} from "./pitFirstEdition";

export {
  PIT_FIRST_EDITION_FIGHTER_IDS,
  PIT_FIRST_EDITION_FIGHTERS,
} from "./pitFirstEdition";

export const PIT_ARCADE_LADDER_VERSION = 1 as const;
export const PIT_ARCADE_RUN_VERSION = 1 as const;
export const PIT_ARCADE_ENCOUNTER_COUNT = 8 as const;
export const PIT_ARCADE_STARTING_CONTINUES = 2 as const;
export const PIT_ARCADE_MAX_RESULT_IDS = 32 as const;

export type PitArcadeEncounterKind = "opener" | "hunt" | "elite" | "rival" | "boss";

export interface PitArcadeEncounter {
  readonly index: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
  readonly id: string;
  readonly kind: PitArcadeEncounterKind;
  readonly opponentId: PitFirstEditionCombatantId;
  readonly arenaId: PitFirstEditionArenaId;
  readonly bestOf: 3;
  readonly storyBeat: string;
}

export interface PitArcadeLadder {
  readonly version: typeof PIT_ARCADE_LADDER_VERSION;
  readonly id: string;
  readonly fighterId: PitFirstEditionFighterId;
  readonly intro: string;
  readonly ending: string;
  readonly encounters: readonly PitArcadeEncounter[];
  readonly cosmeticRewardId: string;
}

export type PitArcadeRunPhase = "active" | "completed" | "failed";

export interface PitArcadeRun {
  readonly version: typeof PIT_ARCADE_RUN_VERSION;
  readonly fighterId: PitFirstEditionFighterId;
  readonly ladderId: string;
  readonly phase: PitArcadeRunPhase;
  /** Zero-based index of the encounter currently waiting to be played. */
  readonly encounterIndex: number;
  readonly victories: number;
  readonly defeats: number;
  readonly continuesRemaining: number;
  readonly appliedResultIds: readonly string[];
  readonly cosmeticRewardIds: readonly string[];
}

export interface PitArcadeEncounterResult {
  readonly id: string;
  readonly encounterIndex: number;
  readonly outcome: "victory" | "defeat";
}

export interface PitArcadeResultApplication {
  readonly run: PitArcadeRun;
  readonly applied: boolean;
}

const ARCADE_STORY_BEATS = [
  "Entrer dans le Cercle et imposer son rythme.",
  "Suivre la première trace laissée par le profanateur.",
  "Traverser une arène hors de sa voie de maîtrise.",
  "Briser la garde d’un vétéran du Circuit.",
  "Protéger la marque obtenue au combat précédent.",
  "Atteindre le Tribunal malgré la dernière embuscade.",
  "Régler le duel que le clan refusait de nommer.",
  "Affronter Warlord et clore sa Chronique.",
] as const;

function rotated<T>(values: readonly T[], offset: number): T[] {
  if (values.length === 0) return [];
  const start = ((offset % values.length) + values.length) % values.length;
  return [...values.slice(start), ...values.slice(0, start)];
}

function buildArcadeLadder(fighterId: PitFirstEditionFighterId): PitArcadeLadder {
  const fighterIndex = PIT_FIRST_EDITION_FIGHTER_IDS.indexOf(fighterId);
  const fighter = PIT_FIRST_EDITION_FIGHTERS[fighterId];
  const rivalId = fighter.rivalId;
  if (!rivalId) throw new Error("A first-edition fighter requires an arcade rival.");

  const huntPool = PIT_FIRST_EDITION_FIGHTER_IDS.filter(
    (candidate) => candidate !== fighterId && candidate !== rivalId,
  );
  const opponents: PitFirstEditionCombatantId[] = [
    ...rotated(huntPool, fighterIndex * 3 + 1).slice(0, 6),
    rivalId,
    "kok-warlord",
  ];
  const arenas = rotated(PIT_FIRST_EDITION_ARENA_IDS, fighterIndex);
  const encounters = opponents.map((opponentId, index): PitArcadeEncounter => {
    const encounterIndex = (index + 1) as PitArcadeEncounter["index"];
    const kind: PitArcadeEncounterKind = index === 0
      ? "opener"
      : index < 5
        ? "hunt"
        : index === 5
          ? "elite"
          : index === 6
            ? "rival"
            : "boss";
    return {
      index: encounterIndex,
      id: `${fighterId}-arcade-${String(encounterIndex).padStart(2, "0")}`,
      kind,
      opponentId,
      arenaId: arenas[index],
      bestOf: 3,
      storyBeat: ARCADE_STORY_BEATS[index],
    };
  });

  return {
    version: PIT_ARCADE_LADDER_VERSION,
    id: `pit-arcade-${fighterId}-v${PIT_ARCADE_LADDER_VERSION}`,
    fighterId,
    intro: fighter.arcadeIntro,
    ending: fighter.arcadeEnding,
    encounters,
    cosmeticRewardId: `pit-palette-${fighterId}-judgment`,
  };
}

export const PIT_ARCADE_LADDERS: Readonly<Record<PitFirstEditionFighterId, PitArcadeLadder>> =
  Object.fromEntries(
    PIT_FIRST_EDITION_FIGHTER_IDS.map((fighterId) => [fighterId, buildArcadeLadder(fighterId)]),
  ) as unknown as Readonly<Record<PitFirstEditionFighterId, PitArcadeLadder>>;

export interface PitArcadeCosmeticDefinition {
  readonly id: string;
  readonly fighterId: PitFirstEditionFighterId;
  readonly label: string;
  readonly palette: {
    readonly primary: string;
    readonly secondary: string;
    readonly accent: string;
  };
}

/**
 * Every Arcade reward resolves to a real alternate fighter palette. The palette
 * remains local to THE PIT and never modifies the campaign appearance.
 */
export const PIT_ARCADE_COSMETICS: Readonly<
  Record<PitFirstEditionFighterId, PitArcadeCosmeticDefinition>
> = Object.fromEntries(
  PIT_FIRST_EDITION_FIGHTER_IDS.map((fighterId) => {
    const fighter = PIT_FIRST_EDITION_FIGHTERS[fighterId];
    return [
      fighterId,
      {
        id: PIT_ARCADE_LADDERS[fighterId].cosmeticRewardId,
        fighterId,
        label: fighter.name + " · Armure du Jugement",
        palette: {
          primary: fighter.palette.accent,
          secondary: fighter.palette.primary,
          accent: "#f3e7b4",
        },
      },
    ];
  }),
) as unknown as Readonly<Record<PitFirstEditionFighterId, PitArcadeCosmeticDefinition>>;

function validIdentifier(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= 96;
}

function integerBetween(value: unknown, min: number, max: number): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= min && value <= max;
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

function uniqueIdentifiers(value: unknown, maximum: number): string[] | null {
  if (!Array.isArray(value) || value.length > maximum) return null;
  const values: string[] = [];
  const seen = new Set<string>();
  for (const candidate of value) {
    if (!validIdentifier(candidate)) return null;
    const id = candidate.trim();
    if (seen.has(id)) return null;
    seen.add(id);
    values.push(id);
  }
  return values;
}

function cloneArcadeRun(run: PitArcadeRun): PitArcadeRun {
  return {
    ...run,
    appliedResultIds: [...run.appliedResultIds],
    cosmeticRewardIds: [...run.cosmeticRewardIds],
  };
}

export function createPitArcadeRun(fighterId: PitFirstEditionFighterId): PitArcadeRun {
  if (!isPitFirstEditionFighterId(fighterId)) {
    throw new Error("THE PIT arcade requires a first-edition fighter.");
  }
  const ladder = PIT_ARCADE_LADDERS[fighterId];
  return {
    version: PIT_ARCADE_RUN_VERSION,
    fighterId,
    ladderId: ladder.id,
    phase: "active",
    encounterIndex: 0,
    victories: 0,
    defeats: 0,
    continuesRemaining: PIT_ARCADE_STARTING_CONTINUES,
    appliedResultIds: [],
    cosmeticRewardIds: [],
  };
}

export function normalizePitArcadeRun(value: unknown): PitArcadeRun | null {
  try {
    if (!isRecord(value) || value.version !== PIT_ARCADE_RUN_VERSION) return null;
    if (!isPitFirstEditionFighterId(value.fighterId)) return null;
    const ladder = PIT_ARCADE_LADDERS[value.fighterId];
    if (value.ladderId !== ladder.id) return null;
    if (value.phase !== "active" && value.phase !== "completed" && value.phase !== "failed") {
      return null;
    }
    if (!integerBetween(value.encounterIndex, 0, PIT_ARCADE_ENCOUNTER_COUNT)) return null;
    if (!integerBetween(value.victories, 0, PIT_ARCADE_ENCOUNTER_COUNT)) return null;
    if (!integerBetween(value.defeats, 0, PIT_ARCADE_STARTING_CONTINUES + 1)) return null;
    if (!integerBetween(value.continuesRemaining, 0, PIT_ARCADE_STARTING_CONTINUES)) return null;
    if (value.encounterIndex !== value.victories) return null;
    const expectedContinues = Math.max(0, PIT_ARCADE_STARTING_CONTINUES - value.defeats);
    if (value.continuesRemaining !== expectedContinues) return null;
    const hasExhaustedContinues = value.defeats === PIT_ARCADE_STARTING_CONTINUES + 1;
    if ((value.phase === "failed") !== hasExhaustedContinues) return null;
    if (value.phase === "active" && value.encounterIndex >= PIT_ARCADE_ENCOUNTER_COUNT) return null;
    if (value.phase === "failed" && value.encounterIndex >= PIT_ARCADE_ENCOUNTER_COUNT) return null;
    if (value.phase === "completed" && value.encounterIndex !== PIT_ARCADE_ENCOUNTER_COUNT) return null;

    const appliedResultIds = uniqueIdentifiers(value.appliedResultIds, PIT_ARCADE_MAX_RESULT_IDS);
    if (!appliedResultIds || appliedResultIds.length !== value.victories + value.defeats) return null;
    const cosmeticRewardIds = uniqueIdentifiers(value.cosmeticRewardIds, 1);
    if (!cosmeticRewardIds) return null;
    const expectedRewards = value.phase === "completed" ? [ladder.cosmeticRewardId] : [];
    if (
      cosmeticRewardIds.length !== expectedRewards.length ||
      cosmeticRewardIds.some((rewardId, index) => rewardId !== expectedRewards[index])
    ) {
      return null;
    }

    return {
      version: PIT_ARCADE_RUN_VERSION,
      fighterId: value.fighterId,
      ladderId: ladder.id,
      phase: value.phase,
      encounterIndex: value.encounterIndex,
      victories: value.victories,
      defeats: value.defeats,
      continuesRemaining: value.continuesRemaining,
      appliedResultIds,
      cosmeticRewardIds,
    };
  } catch {
    return null;
  }
}

export function applyPitArcadeEncounterResult(
  current: PitArcadeRun,
  result: PitArcadeEncounterResult,
): PitArcadeResultApplication {
  const run = normalizePitArcadeRun(current);
  if (!run) throw new Error("Invalid or incompatible THE PIT arcade run.");
  if (validIdentifier(result.id) && run.appliedResultIds.includes(result.id.trim())) {
    return { run: cloneArcadeRun(run), applied: false };
  }
  if (run.phase !== "active") throw new Error("THE PIT arcade run is not active.");
  if (
    !validIdentifier(result.id) ||
    result.encounterIndex !== run.encounterIndex ||
    (result.outcome !== "victory" && result.outcome !== "defeat")
  ) {
    throw new Error("Invalid THE PIT arcade result.");
  }
  if (run.appliedResultIds.length >= PIT_ARCADE_MAX_RESULT_IDS) {
    throw new Error("THE PIT arcade result window is exhausted.");
  }

  const next = cloneArcadeRun(run) as {
    -readonly [Key in keyof PitArcadeRun]: PitArcadeRun[Key];
  };
  next.appliedResultIds = [...next.appliedResultIds, result.id.trim()];
  if (result.outcome === "victory") {
    next.victories += 1;
    next.encounterIndex += 1;
    if (next.encounterIndex === PIT_ARCADE_ENCOUNTER_COUNT) {
      next.phase = "completed";
      next.cosmeticRewardIds = [PIT_ARCADE_LADDERS[next.fighterId].cosmeticRewardId];
    }
  } else {
    next.defeats += 1;
    if (next.continuesRemaining > 0) {
      next.continuesRemaining -= 1;
    } else {
      next.phase = "failed";
    }
  }
  return { run: next, applied: true };
}

export function serializePitArcadeRun(value: PitArcadeRun): string {
  const run = normalizePitArcadeRun(value);
  if (!run) throw new Error("Cannot serialize an invalid THE PIT arcade run.");
  return JSON.stringify(run);
}

export const PIT_DESCENT_RUN_VERSION = 2 as const;
export const PIT_DESCENT_LEGACY_RUN_VERSION = 1 as const;
export const PIT_DESCENT_FLOOR_COUNT = 8 as const;
export const PIT_DESCENT_MAX_RECOVERIES = 2 as const;
export const PIT_DESCENT_RECOVERY_HEALTH = 260 as const;
export const PIT_DESCENT_MAX_HEALTH = 1_000 as const;
export const PIT_DESCENT_MAX_RESOLUTION_IDS = PIT_DESCENT_FLOOR_COUNT;

export const PIT_DESCENT_MODIFIER_IDS = [
  "black-mist",
  "thin-air",
  "shattered-guard",
  "predator-tempo",
  "unstable-floor",
  "silent-crowd",
] as const;
export type PitDescentModifierId = (typeof PIT_DESCENT_MODIFIER_IDS)[number];

export const PIT_DESCENT_RELIC_IDS = [
  "elder-knot",
  "tempered-mesh",
  "hunter-rhythm",
  "sealed-capacitor",
] as const;
export type PitDescentRelicId = (typeof PIT_DESCENT_RELIC_IDS)[number];

export interface PitDescentModifierDefinition {
  readonly id: PitDescentModifierId;
  readonly name: string;
  readonly description: string;
}

export interface PitDescentRelicDefinition {
  readonly id: PitDescentRelicId;
  readonly name: string;
  readonly description: string;
  readonly scope: "descent-run-only";
}

export const PIT_DESCENT_MODIFIERS: Readonly<
  Record<PitDescentModifierId, PitDescentModifierDefinition>
> = {
  "black-mist": { id: "black-mist", name: "Brume noire", description: "Les silhouettes perdent du contraste à longue portée." },
  "thin-air": { id: "thin-air", name: "Air raréfié", description: "Les sauts demandent une gestion plus stricte de l’espace." },
  "shattered-guard": { id: "shattered-guard", name: "Garde fendue", description: "Le blockstun augmente pendant ce duel." },
  "predator-tempo": { id: "predator-tempo", name: "Tempo prédateur", description: "La pression de Traque monte plus vite pour les deux camps." },
  "unstable-floor": { id: "unstable-floor", name: "Sol instable", description: "Les poussées rapprochent plus vite des limites de l’arène." },
  "silent-crowd": { id: "silent-crowd", name: "Tribunes muettes", description: "Les signaux sonores de ressource sont raccourcis." },
};

export const PIT_DESCENT_RELICS: Readonly<Record<PitDescentRelicId, PitDescentRelicDefinition>> = {
  "elder-knot": { id: "elder-knot", name: "Nœud d’ancien", description: "Conserve davantage de Traque entre deux étages.", scope: "descent-run-only" },
  "tempered-mesh": { id: "tempered-mesh", name: "Maille trempée", description: "Réduit le premier dégât confirmé de chaque duel.", scope: "descent-run-only" },
  "hunter-rhythm": { id: "hunter-rhythm", name: "Rythme du chasseur", description: "Accélère brièvement la marche après une parade.", scope: "descent-run-only" },
  "sealed-capacitor": { id: "sealed-capacitor", name: "Capaciteur scellé", description: "Raccourcit une récupération de camouflage par duel.", scope: "descent-run-only" },
};

export type PitDescentNodeKind = "fight" | "relic" | "recovery" | "boss";

export interface PitDescentNode {
  readonly id: string;
  readonly floor: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
  readonly label: string;
  readonly kind: PitDescentNodeKind;
  readonly arenaId: PitFirstEditionArenaId;
  readonly opponentId: PitFirstEditionCombatantId | null;
  readonly modifierIds: readonly PitDescentModifierId[];
  readonly relicId: PitDescentRelicId | null;
  readonly recoveryHealth: number;
}

export interface PitDescentFloor {
  readonly index: PitDescentNode["floor"];
  readonly options: readonly PitDescentNode[];
}

export interface PitDescentPlan {
  readonly fighterId: PitFirstEditionFighterId;
  readonly seed: number;
  readonly floors: readonly PitDescentFloor[];
}

export type PitDescentRunPhase = "active" | "completed" | "failed";

export interface PitDescentRun {
  readonly version: typeof PIT_DESCENT_RUN_VERSION;
  readonly fighterId: PitFirstEditionFighterId;
  readonly seed: number;
  readonly phase: PitDescentRunPhase;
  readonly completedFloors: number;
  readonly selectedNodeId: string | null;
  readonly health: number;
  readonly recoveriesRemaining: number;
  readonly temporaryRelicIds: readonly PitDescentRelicId[];
  readonly resolvedNodeIds: readonly string[];
  readonly appliedResolutionIds: readonly string[];
  /** Canonical, replayable history used to validate health and progression. */
  readonly resolutionHistory: readonly PitDescentResolutionRecord[];
  readonly cosmeticRewardIds: readonly string[];
}

export interface PitDescentResolution {
  readonly id: string;
  readonly nodeId: string;
readonly victory?: boolean;
  readonly remainingHealth?: number;
  /** Real best-of-three totals. Omit every round field on relic/recovery nodes. */
  readonly roundsWon?: number;
  readonly roundsLost?: number;
  readonly roundsDrawn?: number;
}

export interface PitDescentResolutionRecord {
  readonly id: string;
  readonly nodeId: string;
  readonly healthBefore: number;
  readonly healthAfter: number;
  readonly victory?: boolean;
  readonly roundsWon?: number;
  readonly roundsLost?: number;
  readonly roundsDrawn?: number;
}

export interface PitDescentResolutionApplication {
  readonly run: PitDescentRun;
  readonly applied: boolean;
}

const DESCENT_FLOOR_LABELS = [
  "Le Seuil",
  "La Fourche",
  "Le Répit trompeur",
  "Les Voies basses",
  "La Pression",
  "Le Dernier choix",
  "Les Gardiens",
  "La Chronique scellée",
] as const;

function nextSeed(seed: number): number {
  let value = seed >>> 0;
  value ^= value << 13;
  value ^= value >>> 17;
  value ^= value << 5;
  return value >>> 0;
}

function hashFighterSeed(fighterId: PitFirstEditionFighterId, seed: number): number {
  let hash = (2166136261 ^ (seed >>> 0)) >>> 0;
  for (const character of fighterId) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return hash === 0 ? 0x9e3779b9 : hash;
}

function shuffled<T>(values: readonly T[], initialSeed: number): { values: T[]; seed: number } {
  const result = [...values];
  let seed = initialSeed;
  for (let index = result.length - 1; index > 0; index -= 1) {
    seed = nextSeed(seed);
    const swapIndex = seed % (index + 1);
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return { values: result, seed };
}

function descentNode(
  floor: PitDescentNode["floor"],
  option: 1 | 2,
  kind: PitDescentNodeKind,
  arenaId: PitFirstEditionArenaId,
  opponentId: PitFirstEditionCombatantId | null,
  modifierIds: readonly PitDescentModifierId[] = [],
  relicId: PitDescentRelicId | null = null,
): PitDescentNode {
  return {
    id: `descent-${floor}-${option}`,
    floor,
    label: DESCENT_FLOOR_LABELS[floor - 1],
    kind,
    arenaId,
    opponentId,
    modifierIds,
    relicId,
    recoveryHealth: kind === "recovery" ? PIT_DESCENT_RECOVERY_HEALTH : 0,
  };
}

export function createPitDescentPlan(
  fighterId: PitFirstEditionFighterId,
  seed: number,
): PitDescentPlan {
  if (!isPitFirstEditionFighterId(fighterId) || !integerBetween(seed, 0, 0xffffffff)) {
    throw new Error("THE PIT Descent requires a fighter and an unsigned 32-bit seed.");
  }
  let mixedSeed = hashFighterSeed(fighterId, seed);
  const opponentShuffle = shuffled(
    PIT_FIRST_EDITION_FIGHTER_IDS.filter((candidate) => candidate !== fighterId),
    mixedSeed,
  );
  mixedSeed = opponentShuffle.seed;
  const arenaShuffle = shuffled(PIT_FIRST_EDITION_ARENA_IDS, mixedSeed);
  mixedSeed = arenaShuffle.seed;
  const modifierShuffle = shuffled(PIT_DESCENT_MODIFIER_IDS, mixedSeed);
  mixedSeed = modifierShuffle.seed;
  const relicShuffle = shuffled(PIT_DESCENT_RELIC_IDS, mixedSeed);

  const opponents = opponentShuffle.values;
  const arenas = arenaShuffle.values;
  const modifiers = modifierShuffle.values;
  const relics = relicShuffle.values;
  const fight = (
    floor: PitDescentNode["floor"],
    option: 1 | 2,
    opponentIndex: number,
    modifierIndex: number,
  ) => descentNode(
    floor,
    option,
    "fight",
    arenas[floor - 1],
    opponents[opponentIndex],
    floor === 1 ? [] : [modifiers[modifierIndex % modifiers.length]],
  );

  return {
    fighterId,
    seed,
    floors: [
      { index: 1, options: [fight(1, 1, 0, 0)] },
      { index: 2, options: [fight(2, 1, 1, 0), fight(2, 2, 2, 1)] },
      {
        index: 3,
        options: [
          descentNode(3, 1, "relic", arenas[2], null, [], relics[0]),
          descentNode(3, 2, "recovery", arenas[2], null),
        ],
      },
      { index: 4, options: [fight(4, 1, 3, 2), fight(4, 2, 4, 3)] },
      { index: 5, options: [fight(5, 1, 5, 4), fight(5, 2, 6, 5)] },
      {
        index: 6,
        options: [
          descentNode(6, 1, "relic", arenas[5], null, [], relics[1]),
          descentNode(6, 2, "recovery", arenas[5], null),
        ],
      },
      { index: 7, options: [fight(7, 1, 7, 1), fight(7, 2, 8, 3)] },
      {
        index: 8,
        options: PIT_CHRONICLE_BOSS_IDS.map((bossId, index) => descentNode(
          8,
          (index + 1) as 1 | 2,
          "boss",
          arenas[7],
          bossId,
          [modifiers[(index + 4) % modifiers.length], modifiers[(index + 5) % modifiers.length]],
        )),
      },
    ],
  };
}

function cloneDescentRun(run: PitDescentRun): PitDescentRun {
  return {
    ...run,
    temporaryRelicIds: [...run.temporaryRelicIds],
    resolvedNodeIds: [...run.resolvedNodeIds],
    appliedResolutionIds: [...run.appliedResolutionIds],
    resolutionHistory: run.resolutionHistory.map((resolution) => ({ ...resolution })),
    cosmeticRewardIds: [...run.cosmeticRewardIds],
  };
}

export function createPitDescentRun(
  fighterId: PitFirstEditionFighterId,
  seed: number,
): PitDescentRun {
  createPitDescentPlan(fighterId, seed);
  return {
    version: PIT_DESCENT_RUN_VERSION,
    fighterId,
    seed,
    phase: "active",
    completedFloors: 0,
    selectedNodeId: null,
    health: PIT_DESCENT_MAX_HEALTH,
    recoveriesRemaining: PIT_DESCENT_MAX_RECOVERIES,
    temporaryRelicIds: [],
    resolvedNodeIds: [],
    appliedResolutionIds: [],
    resolutionHistory: [],
    cosmeticRewardIds: [],
  };
}

function relicIds(value: unknown): PitDescentRelicId[] | null {
  const ids = uniqueIdentifiers(value, PIT_DESCENT_RELIC_IDS.length);
  if (!ids || ids.some((id) => !PIT_DESCENT_RELIC_IDS.includes(id as PitDescentRelicId))) {
    return null;
  }
  return ids as PitDescentRelicId[];
}

function sameIdentifiers(left: readonly string[], right: unknown): boolean {
  return (
    Array.isArray(right) &&
    left.length === right.length &&
    left.every((value, index) => right[index] === value)
  );
}

function validDescentRounds(
  victory: boolean,
  roundsWon: unknown,
  roundsLost: unknown,
  roundsDrawn: unknown,
): roundsWon is number {
  if (
    !integerBetween(roundsWon, 0, 2) ||
    !integerBetween(roundsLost, 0, 2) ||
    !integerBetween(roundsDrawn, 0, 3)
  ) {
    return false;
  }
  const decisiveRound = victory
    ? roundsWon === 1 && roundsLost === 0
    : roundsLost === 1 && roundsWon === 0;
  const legacyBestOfThree = victory
    ? roundsWon === 2 && roundsLost < 2
    : roundsLost === 2 && roundsWon < 2;
  return decisiveRound || legacyBestOfThree;
}

function derivePitDescentRun(
  fighterId: PitFirstEditionFighterId,
  seed: number,
  selectedNodeId: string | null,
  resolutionHistory: readonly unknown[],
): PitDescentRun | null {
  if (resolutionHistory.length > PIT_DESCENT_FLOOR_COUNT) return null;
  const plan = createPitDescentPlan(fighterId, seed);
  const canonicalHistory: PitDescentResolutionRecord[] = [];
  const seenIds = new Set<string>();
  const resolvedNodeIds: string[] = [];
  const appliedResolutionIds: string[] = [];
  const temporaryRelicIds: PitDescentRelicId[] = [];
  let health: number = PIT_DESCENT_MAX_HEALTH;
  let recoveriesRemaining = PIT_DESCENT_MAX_RECOVERIES;
  let failed = false;

  for (let index = 0; index < resolutionHistory.length; index += 1) {
    const candidate = resolutionHistory[index];
    if (!isRecord(candidate) || !validIdentifier(candidate.id) || !validIdentifier(candidate.nodeId)) {
      return null;
    }
    const id = candidate.id.trim();
    const nodeId = candidate.nodeId.trim();
    if (seenIds.has(id)) return null;
    const node = plan.floors[index]?.options.find(
      (option) => option.id === nodeId,
    );
    if (!node || failed || candidate.healthBefore !== health) return null;

    let record: PitDescentResolutionRecord;
    if (node.kind === "fight" || node.kind === "boss") {
      if (
        typeof candidate.victory !== "boolean" ||
        !integerBetween(candidate.healthAfter, 0, health) ||
        !validDescentRounds(
          candidate.victory,
          candidate.roundsWon,
          candidate.roundsLost,
          candidate.roundsDrawn,
        )
      ) {
        return null;
      }
      if (
        (candidate.victory && candidate.healthAfter === 0) ||
        (!candidate.victory && candidate.healthAfter !== 0)
      ) {
        return null;
      }
      record = {
        id,
        nodeId: node.id,
        healthBefore: health,
        healthAfter: candidate.healthAfter,
        victory: candidate.victory,
        roundsWon: candidate.roundsWon,
        roundsLost: candidate.roundsLost as number,
        roundsDrawn: candidate.roundsDrawn as number,
      };
      health = candidate.healthAfter;
      failed = !candidate.victory;
    } else {
      if (
        candidate.victory !== undefined ||
        candidate.roundsWon !== undefined ||
        candidate.roundsLost !== undefined ||
        candidate.roundsDrawn !== undefined
      ) {
        return null;
      }
      const expectedHealth = node.kind === "recovery"
        ? Math.min(PIT_DESCENT_MAX_HEALTH, health + node.recoveryHealth)
        : health;
      if (candidate.healthAfter !== expectedHealth) return null;
      if (node.kind === "recovery") {
        if (recoveriesRemaining <= 0) return null;
        recoveriesRemaining -= 1;
      } else {
        if (!node.relicId) return null;
        if (!temporaryRelicIds.includes(node.relicId)) {
          temporaryRelicIds.push(node.relicId);
        }
      }
      record = {
        id,
        nodeId: node.id,
        healthBefore: health,
        healthAfter: expectedHealth,
      };
      health = expectedHealth;
    }

    seenIds.add(id);
    canonicalHistory.push(record);
    resolvedNodeIds.push(node.id);
    appliedResolutionIds.push(id);
    if (failed && index !== resolutionHistory.length - 1) return null;
  }

  const completedFloors = canonicalHistory.length;
  const phase: PitDescentRunPhase = failed
    ? "failed"
    : completedFloors === PIT_DESCENT_FLOOR_COUNT
      ? "completed"
      : "active";
  const canonicalSelectedNodeId = selectedNodeId === null ? null : selectedNodeId.trim();
  if (
    (phase !== "active" && canonicalSelectedNodeId !== null) ||
    (canonicalSelectedNodeId !== null &&
      (!validIdentifier(selectedNodeId) ||
        !plan.floors[completedFloors]?.options.some(
          (node) => node.id === canonicalSelectedNodeId,
        )))
  ) {
    return null;
  }

  return {
    version: PIT_DESCENT_RUN_VERSION,
    fighterId,
    seed,
    phase,
    completedFloors,
    selectedNodeId: canonicalSelectedNodeId,
    health,
    recoveriesRemaining,
    temporaryRelicIds: phase === "completed" ? [] : temporaryRelicIds,
    resolvedNodeIds,
    appliedResolutionIds,
    resolutionHistory: canonicalHistory,
    cosmeticRewardIds: phase === "completed" ? ["pit-banner-descent-survivor"] : [],
  };
}

function migratePitDescentRunV1(value: Record<string, unknown>): PitDescentRun | null {
  if (!isPitFirstEditionFighterId(value.fighterId)) return null;
  if (!integerBetween(value.seed, 0, 0xffffffff)) return null;
  if (value.phase !== "active" && value.phase !== "completed" && value.phase !== "failed") {
    return null;
  }
  if (!integerBetween(value.completedFloors, 0, PIT_DESCENT_FLOOR_COUNT)) return null;
  if (!integerBetween(value.health, 0, PIT_DESCENT_MAX_HEALTH)) return null;
  const resolvedNodeIds = uniqueIdentifiers(value.resolvedNodeIds, PIT_DESCENT_FLOOR_COUNT);
  const appliedResolutionIds = uniqueIdentifiers(
    value.appliedResolutionIds,
    PIT_DESCENT_MAX_RESOLUTION_IDS,
  );
  const temporaryRelicIds = relicIds(value.temporaryRelicIds);
  const cosmeticRewardIds = uniqueIdentifiers(value.cosmeticRewardIds, 1);
  if (
    !resolvedNodeIds ||
    !appliedResolutionIds ||
    !temporaryRelicIds ||
    !cosmeticRewardIds ||
    resolvedNodeIds.length !== value.completedFloors ||
    appliedResolutionIds.length !== value.completedFloors
  ) {
    return null;
  }

  const plan = createPitDescentPlan(value.fighterId, value.seed);
  const nodes = resolvedNodeIds.map((nodeId, index) =>
    plan.floors[index]?.options.find((node) => node.id === nodeId) ?? null
  );
  if (nodes.some((node) => node === null)) return null;
  const canonicalNodes = nodes as PitDescentNode[];
  const recoveryCount = canonicalNodes.filter((node) => node.kind === "recovery").length;
  if (
    value.recoveriesRemaining !== PIT_DESCENT_MAX_RECOVERIES - recoveryCount ||
    (value.phase === "active" &&
      (value.health === 0 || value.completedFloors >= PIT_DESCENT_FLOOR_COUNT)) ||
    (value.phase === "completed" &&
      (value.completedFloors !== PIT_DESCENT_FLOOR_COUNT || value.health === 0)) ||
    (value.phase === "failed" &&
      (value.health !== 0 ||
        canonicalNodes.length === 0 ||
        !["fight", "boss"].includes(canonicalNodes[canonicalNodes.length - 1].kind)))
  ) {
    return null;
  }
  const expectedRelics = value.phase === "completed"
    ? []
    : canonicalNodes.flatMap((node) =>
        node.kind === "relic" && node.relicId ? [node.relicId] : []
      );
  const expectedRewards = value.phase === "completed" ? ["pit-banner-descent-survivor"] : [];
  if (
    !sameIdentifiers([...new Set(expectedRelics)], temporaryRelicIds) ||
    !sameIdentifiers(expectedRewards, cosmeticRewardIds)
  ) {
    return null;
  }

  const lastCombatIndex = canonicalNodes.findLastIndex(
    (node) => node.kind === "fight" || node.kind === "boss",
  );
  if (lastCombatIndex < 0) {
    if (value.health !== PIT_DESCENT_MAX_HEALTH || value.phase !== "active") return null;
  }
  let targetAfterLastCombat: number = value.health;
  if (value.phase !== "failed") {
    for (let index = canonicalNodes.length - 1; index > lastCombatIndex; index -= 1) {
      const node = canonicalNodes[index];
      if (node.kind === "recovery") {
        if (targetAfterLastCombat === PIT_DESCENT_MAX_HEALTH) {
          targetAfterLastCombat = PIT_DESCENT_MAX_HEALTH - node.recoveryHealth;
        } else {
          targetAfterLastCombat -= node.recoveryHealth;
          if (targetAfterLastCombat <= 0) return null;
        }
      }
    }
  }

  const history: PitDescentResolutionRecord[] = [];
  let currentHealth: number = PIT_DESCENT_MAX_HEALTH;
  for (let index = 0; index < canonicalNodes.length; index += 1) {
    const node = canonicalNodes[index];
    const id = appliedResolutionIds[index];
    if (node.kind === "fight" || node.kind === "boss") {
      const victory = value.phase !== "failed" || index !== canonicalNodes.length - 1;
      const healthAfter = victory
        ? index === lastCombatIndex
          ? targetAfterLastCombat
          : currentHealth
        : 0;
      if (healthAfter < 0 || healthAfter > currentHealth || (victory && healthAfter === 0)) {
        return null;
      }
      history.push({
        id,
        nodeId: node.id,
        healthBefore: currentHealth,
        healthAfter,
        victory,
        roundsWon: victory ? 1 : 0,
        roundsLost: victory ? 0 : 1,
        roundsDrawn: 0,
      });
      currentHealth = healthAfter;
    } else {
      const healthAfter = node.kind === "recovery"
        ? Math.min(PIT_DESCENT_MAX_HEALTH, currentHealth + node.recoveryHealth)
        : currentHealth;
      history.push({
        id,
        nodeId: node.id,
        healthBefore: currentHealth,
        healthAfter,
      });
      currentHealth = healthAfter;
    }
  }
  if (currentHealth !== value.health) return null;

  const selectedNodeId = value.selectedNodeId === null
    ? null
    : validIdentifier(value.selectedNodeId)
      ? value.selectedNodeId.trim()
      : null;
  if (value.selectedNodeId !== null && selectedNodeId === null) return null;
  const migrated = derivePitDescentRun(
    value.fighterId,
    value.seed,
    selectedNodeId,
    history,
  );
  if (
    !migrated ||
    migrated.phase !== value.phase ||
    migrated.completedFloors !== value.completedFloors ||
    migrated.health !== value.health ||
    migrated.recoveriesRemaining !== value.recoveriesRemaining ||
    !sameIdentifiers(migrated.temporaryRelicIds, temporaryRelicIds) ||
    !sameIdentifiers(migrated.resolvedNodeIds, resolvedNodeIds) ||
    !sameIdentifiers(migrated.appliedResolutionIds, appliedResolutionIds) ||
    !sameIdentifiers(migrated.cosmeticRewardIds, cosmeticRewardIds)
  ) {
    return null;
  }
  return migrated;
}

export function normalizePitDescentRun(value: unknown): PitDescentRun | null {
  try {
    if (!isRecord(value)) return null;
    if (value.version === PIT_DESCENT_LEGACY_RUN_VERSION) {
      return migratePitDescentRunV1(value);
    }
    if (value.version !== PIT_DESCENT_RUN_VERSION) return null;
    if (!isPitFirstEditionFighterId(value.fighterId)) return null;
    if (!integerBetween(value.seed, 0, 0xffffffff)) return null;
    if (!Array.isArray(value.resolutionHistory)) return null;
    if (value.selectedNodeId !== null && !validIdentifier(value.selectedNodeId)) return null;
    const derived = derivePitDescentRun(
      value.fighterId,
      value.seed,
      value.selectedNodeId === null ? null : value.selectedNodeId.trim(),
      value.resolutionHistory,
    );
    if (
      !derived ||
      value.phase !== derived.phase ||
      value.completedFloors !== derived.completedFloors ||
      value.health !== derived.health ||
      value.recoveriesRemaining !== derived.recoveriesRemaining ||
      !sameIdentifiers(derived.temporaryRelicIds, value.temporaryRelicIds) ||
      !sameIdentifiers(derived.resolvedNodeIds, value.resolvedNodeIds) ||
      !sameIdentifiers(derived.appliedResolutionIds, value.appliedResolutionIds) ||
      !sameIdentifiers(derived.cosmeticRewardIds, value.cosmeticRewardIds)
    ) {
      return null;
    }
    return derived;
  } catch {
    return null;
  }
}
export function selectPitDescentNode(
  current: PitDescentRun,
  nodeId: string,
): PitDescentRun {
  const run = normalizePitDescentRun(current);
  if (!run) throw new Error("Invalid or incompatible THE PIT Descent run.");
  if (run.phase !== "active") throw new Error("THE PIT Descent run is not active.");
  const floor = createPitDescentPlan(run.fighterId, run.seed).floors[run.completedFloors];
  if (!validIdentifier(nodeId) || !floor.options.some((node) => node.id === nodeId)) {
    throw new Error("Invalid THE PIT Descent branch.");
  }
  return { ...cloneDescentRun(run), selectedNodeId: nodeId };
}

export function applyPitDescentResolution(
  current: PitDescentRun,
  resolution: PitDescentResolution,
): PitDescentResolutionApplication {
  const run = normalizePitDescentRun(current);
  if (!run) throw new Error("Invalid or incompatible THE PIT Descent run.");
  if (!isRecord(resolution) || !validIdentifier(resolution.id)) {
    throw new Error("Invalid THE PIT Descent resolution.");
  }
  const resolutionId = resolution.id.trim();
  const duplicate = run.resolutionHistory.find((applied) => applied.id === resolutionId);
  if (duplicate) {
    const roundsDrawn = resolution.roundsDrawn ?? 0;
    const sameResolution =
      duplicate.nodeId === resolution.nodeId &&
      duplicate.victory === resolution.victory &&
      (duplicate.victory === undefined ||
        (duplicate.healthAfter === resolution.remainingHealth &&
          duplicate.roundsWon === resolution.roundsWon &&
          duplicate.roundsLost === resolution.roundsLost &&
          duplicate.roundsDrawn === roundsDrawn));
    if (!sameResolution) {
      throw new Error("Conflicting THE PIT Descent resolution id.");
    }
    return { run: cloneDescentRun(run), applied: false };
  }
  if (run.phase !== "active" || !run.selectedNodeId) {
    throw new Error("THE PIT Descent requires a selected active branch.");
  }
  if (
    !validIdentifier(resolution.nodeId) ||
    resolution.nodeId.trim() !== run.selectedNodeId ||
    run.resolutionHistory.length >= PIT_DESCENT_MAX_RESOLUTION_IDS
  ) {
    throw new Error("Invalid THE PIT Descent resolution.");
  }
  const plan = createPitDescentPlan(run.fighterId, run.seed);
  const node = plan.floors[run.completedFloors].options.find(
    (candidate) => candidate.id === run.selectedNodeId,
  );
  if (!node) throw new Error("Invalid THE PIT Descent branch.");

  let record: PitDescentResolutionRecord;
  if (node.kind === "fight" || node.kind === "boss") {
    const roundsDrawn = resolution.roundsDrawn ?? 0;
    if (
      typeof resolution.victory !== "boolean" ||
      !integerBetween(resolution.remainingHealth, 0, run.health) ||
      !validDescentRounds(
        resolution.victory,
        resolution.roundsWon,
        resolution.roundsLost,
        roundsDrawn,
      ) ||
      (resolution.victory && resolution.remainingHealth === 0) ||
      (!resolution.victory && resolution.remainingHealth !== 0)
    ) {
      throw new Error("A Descent combat requires a deterministic combat result.");
    }
    record = {
      id: resolutionId,
      nodeId: node.id,
      healthBefore: run.health,
      healthAfter: resolution.remainingHealth,
      victory: resolution.victory,
      roundsWon: resolution.roundsWon,
      roundsLost: resolution.roundsLost,
      roundsDrawn,
    };
  } else {
    if (
      resolution.victory !== undefined ||
      resolution.remainingHealth !== undefined ||
      resolution.roundsWon !== undefined ||
      resolution.roundsLost !== undefined ||
      resolution.roundsDrawn !== undefined
    ) {
      throw new Error("A non-combat Descent node cannot carry a forged match result.");
    }
    record = {
      id: resolutionId,
      nodeId: node.id,
      healthBefore: run.health,
      healthAfter: node.kind === "recovery"
        ? Math.min(PIT_DESCENT_MAX_HEALTH, run.health + node.recoveryHealth)
        : run.health,
    };
  }

  const next = derivePitDescentRun(
    run.fighterId,
    run.seed,
    null,
    [...run.resolutionHistory, record],
  );
  if (!next) throw new Error("Unable to apply THE PIT Descent resolution.");
  return { run: next, applied: true };
}
export function serializePitDescentRun(value: PitDescentRun): string {
  const run = normalizePitDescentRun(value);
  if (!run) throw new Error("Cannot serialize an invalid THE PIT Descent run.");
  return JSON.stringify(run);
}
