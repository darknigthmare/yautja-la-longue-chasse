/**
 * V166 — progression d'honneur alignée sur la bible.
 *
 * Source : `docs/campagne/BIBLE_DE_CAMPAGNE.md`, « Seuils d'honneur — décision »
 * (6 novembre 2026). Seuils cumulés L1 → L10 (valeurs marquées « proposées »
 * dans la bible) ; « atteindre le seuil d'honneur débloque l'épreuve du rang ;
 * seule l'épreuve réussie fait monter. L'honneur perdu peut faire repasser sous
 * le seuil : l'épreuve redevient verrouillée, le rang acquis reste. »
 *
 * Décision de l'utilisateur (20 novembre 2026) : Black God reste à 40 000,
 * récompense ultime ; les paliers intermédiaires doivent être atteignables,
 * de façon progressive, pas en deux heures.
 *
 * Ce module est pur : aucune lecture de sauvegarde, aucun stockage. Les gains
 * de rejouabilité et l'objectif de rythme sont des choix « proposés »
 * (calculs dans les commentaires et dans la PR), pas des valeurs de la bible.
 */
import type { MissionDefinition, RankId } from "../types";

export interface BibleHonorTierV166 {
  /** Level de l'échelle des rangs de la bible. */
  level: number;
  /** Nom du rang dans la bible. */
  bibleRank: string;
  /** Seuil d'honneur cumulé de la bible (valeur proposée dans la bible). */
  threshold: number;
  /** Épreuve débloquée selon la bible. */
  trial: string;
  /** Rang de la piste de carrière du jeu, ou null si le jeu ne le connaît pas. */
  gameRankId: RankId | null;
}

/** Tableau « Seuils d'honneur — décision » de la bible, recopié tel quel. */
export const BIBLE_HONOR_TIERS_V166: readonly BibleHonorTierV166[] = [
  { level: 1, bibleRank: "Unblooded", threshold: 100, trial: "fin de l'intro (R2-M006)", gameRankId: null },
  { level: 2, bibleRank: "Young Blood", threshold: 500, trial: "Quatza-Rij en trio", gameRankId: null },
  { level: 3, bibleRank: "Blooded", threshold: 1_500, trial: "la pyramide", gameRankId: "blooded" },
  { level: 4, bibleRank: "Adjutant", threshold: 3_000, trial: "mener et ramener un pack", gameRankId: null },
  { level: 5, bibleRank: "Elite", threshold: 5_000, trial: "crâne de reine + Quatza-Rij seul", gameRankId: "elite" },
  { level: 6, bibleRank: "Elder", threshold: 8_000, trial: "transmission observée", gameRankId: "elder" },
  { level: 7, bibleRank: "Clan Leader", threshold: 12_000, trial: "3 ruches nettoyées puis une des trois voies", gameRankId: null },
  { level: 8, bibleRank: "Adjudicator", threshold: 18_000, trial: "5 ruches + Reine Mère", gameRankId: null },
  { level: 9, bibleRank: "Philosopher", threshold: 25_000, trial: "l'épreuve de la longue mémoire", gameRankId: null },
  { level: 10, bibleRank: "Black God", threshold: 40_000, trial: "la chasse mythique", gameRankId: null },
];

/** Bible, Level 10 ; inchangé sur décision de l'utilisateur (récompense ultime). */
export const BLACK_GOD_HONOR_THRESHOLD_V166 = 40_000 as const;

/** Ordre de la piste de carrière du jeu (types.ts : RankId). */
export const GAME_RANK_SEQUENCE_V166: readonly RankId[] = ["young-blood", "blooded", "elite", "elder"];

/**
 * Seuils du jeu après V166. Blooded, Elite et Elder reprennent la bible.
 * Young Blood reste à 0 *(proposé)* : c'est le rang de départ de la piste de
 * carrière ; la bible le place à 500 mais la piste n'a aucun rang inférieur
 * (Unblooded n'existe que dans la chronique narrative), et le passer à 500
 * laisserait une nouvelle partie sans rang.
 */
export const HONOR_RANK_THRESHOLDS_V166: Readonly<Record<RankId, number>> = {
  "young-blood": 0,
  blooded: 1_500,
  elite: 5_000,
  elder: 8_000,
};

/** Seuils en vigueur avant V166 (save.ts jusqu'à la V165) ; servent à la migration. */
export const LEGACY_RANK_THRESHOLDS_V35: Readonly<Record<RankId, number>> = {
  "young-blood": 0,
  blooded: 250,
  elite: 650,
  elder: 1_800,
};

export function rankIndexV166(rankId: RankId): number {
  return GAME_RANK_SEQUENCE_V166.indexOf(rankId);
}

export function isGameRankIdV166(value: unknown): value is RankId {
  return typeof value === "string" && (GAME_RANK_SEQUENCE_V166 as readonly string[]).includes(value);
}

function rankForThresholds(honor: number, thresholds: Readonly<Record<RankId, number>>): RankId {
  let result: RankId = "young-blood";
  for (const rankId of GAME_RANK_SEQUENCE_V166) {
    if (honor >= thresholds[rankId]) result = rankId;
  }
  return result;
}

/** Rang que l'honneur actuel atteint avec les seuils V166. */
export function rankForHonorV166(honor: number): RankId {
  return rankForThresholds(honor, HONOR_RANK_THRESHOLDS_V166);
}

/** Rang qu'une sauvegarde affichait avant V166 (dérivé de l'honneur, anciens seuils). */
export function legacyRankForHonorV35(honor: number): RankId {
  return rankForThresholds(honor, LEGACY_RANK_THRESHOLDS_V35);
}

export function higherRankV166(left: RankId, right: RankId): RankId {
  return rankIndexV166(left) >= rankIndexV166(right) ? left : right;
}

/**
 * Rang acquis : jamais perdu (bible : « le rang acquis reste »).
 * - Sauvegarde V166 (champ `acquiredRankIdV166` valide) : le plus haut entre
 *   ce rang et celui que l'honneur actuel atteint.
 * - Sauvegarde antérieure (champ absent) : son rang était toujours recalculé
 *   depuis l'honneur avec les anciens seuils ; ce rang est conservé, et
 *   remplacé seulement si les nouveaux seuils donnent plus haut (impossible
 *   avec les valeurs actuelles, gardé pour la sûreté).
 */
export function resolveAcquiredRankV166(honor: number, storedAcquiredRankId: unknown): RankId {
  const earned = rankForHonorV166(honor);
  if (isGameRankIdV166(storedAcquiredRankId)) return higherRankV166(storedAcquiredRankId, earned);
  return higherRankV166(legacyRankForHonorV35(honor), earned);
}

/**
 * Promotion de la piste de carrière. Le jeu n'a pas d'épreuve de rang sur
 * cette piste : la promotion reste automatique au seuil (comportement déjà en
 * place) et la descente d'honneur ne retire jamais le rang.
 */
export function promoteRankV166(acquiredRankId: RankId, honor: number): RankId {
  return higherRankV166(acquiredRankId, rankForHonorV166(honor));
}

/** Prochain palier de la bible au-dessus de l'honneur donné, ou null après Black God. */
export function nextBibleTierV166(honor: number): BibleHonorTierV166 | null {
  return BIBLE_HONOR_TIERS_V166.find((tier) => tier.threshold > honor) ?? null;
}

// ---------------------------------------------------------------------------
// Gains d'honneur d'une mission réussie (formule appliquée par save.ts)
// ---------------------------------------------------------------------------

/**
 * Première réussite : inchangée (base + événements bornés + qualité).
 * Rejouer : *(proposé)* taux et plafond relevés pour que les paliers de la
 * bible soient atteignables.
 * Avant V166 : 0,05 × base, 0,1 × score, 0,5 × événements, plafond brut 40.
 * Après V166 : 0,15 × base, 0,2 × score, 0,5 × événements, plafond brut 80.
 * Calcul (rotation des 8 chasses en Hunter, run sans infraction, score 70) :
 * le plafond de 80 est atteint par toutes les chasses (jungle-vey : 15 + 14 +
 * 50 = 79, + progrès ≥ 0) → 80 × 1,15 = 92 d'honneur par chasse rejouée.
 */
export const REPLAY_HONOR_RULES_V166 = {
  baseRate: 0.15,
  scoreRate: 0.2,
  eventRate: 0.5,
  progressCap: 20,
  rawCap: 80,
} as const;

export const LEGACY_REPLAY_HONOR_RULES_V35 = {
  baseRate: 0.05,
  scoreRate: 0.1,
  eventRate: 0.5,
  progressCap: 20,
  rawCap: 40,
} as const;

export type ReplayHonorRules = {
  readonly baseRate: number;
  readonly scoreRate: number;
  readonly eventRate: number;
  readonly progressCap: number;
  readonly rawCap: number;
};

export interface MissionHonorRewardInput {
  baseHonor: number;
  firstCompletion: boolean;
  /** Somme des événements de chasse, déjà bornée à [-100, 100]. */
  eventHonor: number;
  /** Score 0–100. */
  score: number;
  /** Bonus de qualité de trophée (10 × rang de qualité) ; 0 sans trophée. */
  qualityBonus: number;
  /** Bonus de qualité en rejouant (moitié du bonus si meilleure qualité). */
  replayQualityBonus: number;
  /** Amélioration du meilleur score. */
  scoreImprovement: number;
  rewardMultiplier: number;
}

export function missionHonorRewardV166(
  input: MissionHonorRewardInput,
  rules: ReplayHonorRules = REPLAY_HONOR_RULES_V166,
): number {
  const replayMasteryHonor =
    Math.max(5, Math.round(input.baseHonor * rules.baseRate)) +
    Math.round(input.score * rules.scoreRate) +
    Math.round(input.eventHonor * rules.eventRate);
  const replayProgressHonor = Math.min(
    rules.progressCap,
    input.scoreImprovement * 2 + input.replayQualityBonus,
  );
  const rawHonorReward = input.firstCompletion
    ? input.baseHonor + input.eventHonor + input.qualityBonus
    : Math.min(rules.rawCap, replayMasteryHonor + replayProgressHonor);
  return Math.round(
    Math.max(input.firstCompletion ? -50 : 0, rawHonorReward) * input.rewardMultiplier,
  );
}

// ---------------------------------------------------------------------------
// Estimation du temps de jeu par palier (fonction pure, testée)
// ---------------------------------------------------------------------------

export interface HonorPaceAssumptions {
  /** Multiplicateur de difficulté des chasses rejouées (data.ts : 1 / 1,15 / 1,35 / 1,6). */
  rewardMultiplier: number;
  /**
   * Multiplicateur pendant la campagne (premières réussites) ; par défaut le
   * même. La difficulté Elder (1,6) n'ouvre qu'après la campagne.
   */
  campaignRewardMultiplier?: number;
  /**
   * Événements par chasse réussie. Une réussite exige les objectifs requis
   * (90 à 145 d'honneur selon la chasse) et le trophée Apex (+12) : sans
   * infraction, la somme dépasse 100 et la borne de save.ts donne 100.
   */
  eventHonor: number;
  /** Bonus de qualité de trophée (worthy 10, blooded 20, elite 30, flawless 40). */
  qualityBonus: number;
  /** Score moyen 0–100. */
  score: number;
  /**
   * Après la campagne : "rotation" rejoue les 8 chasses à tour de rôle ;
   * "shortest" rejoue toujours la plus courte (borne rapide).
   */
  replayStrategy: "rotation" | "shortest";
  /** Durée d'une chasse en secondes = parTimeSeconds × ce facteur (1 = temps de référence). */
  durationFactor: number;
  rules: ReplayHonorRules;
  thresholds?: readonly { label: string; threshold: number }[];
}

export interface HonorTierEstimate {
  label: string;
  threshold: number;
  /** Heures de jeu cumulées depuis une nouvelle partie. */
  hours: number;
  /** Heures depuis le palier précédent de la liste. */
  gapHours: number;
  /** Chasses réussies jouées au total. */
  runs: number;
}

export const DEFAULT_PACE_ASSUMPTIONS_V166: HonorPaceAssumptions = {
  rewardMultiplier: 1.15,
  eventHonor: 100,
  qualityBonus: 20,
  score: 70,
  replayStrategy: "rotation",
  durationFactor: 1,
  rules: REPLAY_HONOR_RULES_V166,
};

export interface EstimatedMission {
  id: string;
  baseHonor: number;
  parTimeSeconds: number;
}

/** Les chasses de campagne (data.ts : MISSIONS) dans l'ordre, pour l'estimation. */
export function campaignForEstimateV166(
  missions: readonly Pick<MissionDefinition, "id" | "order" | "baseRewards" | "parTimeSeconds">[],
): EstimatedMission[] {
  return [...missions]
    .sort((a, b) => a.order - b.order)
    .map((mission) => ({ id: mission.id, baseHonor: mission.baseRewards.honor, parTimeSeconds: mission.parTimeSeconds }));
}

const MAX_ESTIMATED_RUNS = 100_000;

/**
 * Simule une partie : la campagne dans l'ordre (premières réussites), puis des
 * chasses rejouées, jusqu'au dernier seuil. Hypothèses : chaque chasse réussit,
 * dure parTimeSeconds × durationFactor, sans menus ni échecs ; le score ne
 * s'améliore plus après la première réussite (bonus de progrès nul).
 */
export function estimateHonorPaceV166(
  missions: readonly EstimatedMission[],
  partial: Partial<HonorPaceAssumptions> = {},
): HonorTierEstimate[] {
  if (missions.length === 0) return [];
  const a: HonorPaceAssumptions = { ...DEFAULT_PACE_ASSUMPTIONS_V166, ...partial };
  const targets = [...(a.thresholds ?? BIBLE_HONOR_TIERS_V166.map((tier) => ({ label: tier.bibleRank, threshold: tier.threshold })))]
    .sort((x, y) => x.threshold - y.threshold);
  const shortest = missions.reduce((best, m) => (m.parTimeSeconds < best.parTimeSeconds ? m : best), missions[0]);
  const results: HonorTierEstimate[] = [];
  let honor = 0;
  let seconds = 0;
  let runs = 0;
  let previousHours = 0;
  let targetIndex = 0;
  const record = () => {
    while (targetIndex < targets.length && honor >= targets[targetIndex].threshold) {
      const hours = seconds / 3600;
      results.push({ ...targets[targetIndex], hours, gapHours: hours - previousHours, runs });
      previousHours = hours;
      targetIndex += 1;
    }
  };
  record();
  while (targetIndex < targets.length && runs < MAX_ESTIMATED_RUNS) {
    const firstCompletion = runs < missions.length;
    const mission = firstCompletion
      ? missions[runs]
      : a.replayStrategy === "shortest"
        ? shortest
        : missions[(runs - missions.length) % missions.length];
    const gain = missionHonorRewardV166(
      {
        baseHonor: mission.baseHonor,
        firstCompletion,
        eventHonor: a.eventHonor,
        score: a.score,
        qualityBonus: a.qualityBonus,
        replayQualityBonus: 0,
        scoreImprovement: 0,
        rewardMultiplier: firstCompletion ? a.campaignRewardMultiplier ?? a.rewardMultiplier : a.rewardMultiplier,
      },
      a.rules,
    );
    if (!firstCompletion && gain <= 0) break;
    honor += gain;
    seconds += mission.parTimeSeconds * a.durationFactor;
    runs += 1;
    record();
  }
  return results;
}
