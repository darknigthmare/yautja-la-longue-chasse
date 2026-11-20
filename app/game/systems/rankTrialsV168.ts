/**
 * V168 — épreuves de rang de la piste de carrière (Blooded, Elite, Elder).
 *
 * Source : `docs/campagne/BIBLE_DE_CAMPAGNE.md`, « Seuils d'honneur —
 * décision » : « atteindre le seuil d'honneur débloque l'épreuve du rang ;
 * seule l'épreuve réussie fait monter. L'honneur perdu peut faire repasser
 * sous le seuil : l'épreuve redevient verrouillée, le rang acquis reste. »
 * Épreuves de la bible : Blooded = la pyramide (L-04) ; Elite = crâne de reine
 * + Quatza-Rij seul (L-05, L-07) ; Elder = transmission observée, elle-même
 * *(proposée)* dans la bible (former un pack, juger un différend : R2-M049,
 * R2-M050).
 *
 * Ce que le jeu contient (constaté dans le code) :
 * - crâne de reine : le Berceau enfoui (systems/buriedCradleCampaign.ts,
 *   R2-M025 → M027, XP-Z12) ; la crête rapportée est `crownDelivered` ;
 * - pyramide : seul l'acte I du Temple des Trois Ombres existe (V70, 9 salles),
 *   réservé au parcours de jeunesse et qui n'est pas le rite complet
 *   (firstHuntSoloV70.ts : « No AVP replica or completed Blooded rite ») ;
 * - Quatza-Rij : aucune créature ni chasse ; R2-M042 est « texte seul » ;
 * - transmission : aucun novice, mentor ni successeur ; R2-M049, M050 sont
 *   « texte seul ».
 *
 * Choix *(proposé)* : chaque contenu absent est remplacé par une « chasse
 * d'épreuve » jouable, une chasse existante rejouée sous conditions. Le
 * substitut est annoncé comme tel et nomme ce qui manque ; le rang ne monte
 * jamais automatiquement au seuil.
 *
 * Module pur : aucune lecture de stockage.
 */
import type { DifficultyId, MissionId, MissionResult, RankId, SaveGame } from "../types";
import { HONOR_RANK_THRESHOLDS_V166, GAME_RANK_SEQUENCE_V166, higherRankV166, isGameRankIdV166, rankIndexV166 } from "./honorProgressionV166";

export type TrialRankIdV168 = "blooded" | "elite" | "elder";
export const TRIAL_RANK_IDS_V168: readonly TrialRankIdV168[] = ["blooded", "elite", "elder"];

export type RankTrialPartIdV168 =
  | "blooded-sanctuary-hunt"
  | "elite-queen-crest"
  | "elite-solitary-hunt"
  | "elder-led-triad-hunt";

export interface HuntTrialConditionsV168 {
  missionId: MissionId;
  /** "solo" : sans la triade ; "triad" : partie en triade ; "any" : au choix. */
  team: "solo" | "triad" | "any";
  /** Les deux membres de la triade doivent être extraits. */
  bringEveryoneBack: boolean;
  /** Aucun événement d'honneur de type « violation » pendant la chasse. */
  noViolation: boolean;
  /** Pas de second souffle. */
  noSecondWind: boolean;
}

export interface RankTrialPartV168 {
  id: RankTrialPartIdV168;
  label: string;
  /** "bible" : contenu demandé par la bible et présent ; "substitut proposé" : remplace un contenu absent. */
  origin: "bible" | "substitut proposé";
  /** Ce que la bible demande pour ce volet. */
  bibleRequirement: string;
  /** Contenu de la bible absent du jeu, remplacé par ce volet ; null si rien ne manque. */
  missingContent: string | null;
  kind: "hunt" | "proof";
  hunt?: HuntTrialConditionsV168;
  /** Preuve relue dans la sauvegarde. */
  proof?: "buried-cradle-crown";
}

export interface RankTrialDefinitionV168 {
  rankId: TrialRankIdV168;
  bibleLevel: number;
  bibleRank: string;
  bibleTrial: string;
  threshold: number;
  parts: readonly RankTrialPartV168[];
}

/** Libellés de la piste de carrière (progression.ts). */
export const TRIAL_RANK_LABELS_V168: Readonly<Record<TrialRankIdV168, string>> = {
  blooded: "Blooded",
  elite: "Élite",
  elder: "Ancien",
};

export const RANK_TRIALS_V168: readonly RankTrialDefinitionV168[] = [
  {
    rankId: "blooded",
    bibleLevel: 3,
    bibleRank: "Blooded",
    bibleTrial: "la pyramide",
    threshold: HONOR_RANK_THRESHOLDS_V166.blooded,
    parts: [
      {
        id: "blooded-sanctuary-hunt",
        label: "Le dernier rite, rejoué comme épreuve (Cinder-12)",
        origin: "substitut proposé",
        bibleRequirement:
          "L-04 : un trio dans une pyramide contre les Kainde Amedha ; chaque membre tue au moins un Xénomorphe ; marque à l'acide ; un trio qui triche devient Bad Blood.",
        missingContent:
          "Pyramide complète : six salles profondes après la Vanne de Quarantaine, Nef de la Reine, purge de 60 s, retour et marque à l'acide (bible, « Comblement des vides » § 2). L'acte I du Temple des Trois Ombres (V70) existe mais reste au parcours de jeunesse et n'est pas le rite complet.",
        kind: "hunt",
        hunt: { missionId: "volcano-bad-blood", team: "any", bringEveryoneBack: false, noViolation: true, noSecondWind: false },
      },
    ],
  },
  {
    rankId: "elite",
    bibleLevel: 5,
    bibleRank: "Elite",
    bibleTrial: "crâne de reine + Quatza-Rij seul",
    threshold: HONOR_RANK_THRESHOLDS_V166.elite,
    parts: [
      {
        id: "elite-queen-crest",
        label: "Crête de reine rapportée du Berceau enfoui",
        origin: "bible",
        bibleRequirement: "L-07 : tuer la reine de Xeno Prime et rapporter sa crête ; sans crête, pas de rang.",
        missingContent: null,
        kind: "proof",
        proof: "buried-cradle-crown",
      },
      {
        id: "elite-solitary-hunt",
        label: "Traque solitaire du Cryostalker, sans second souffle (Nivalis-K)",
        origin: "substitut proposé",
        bibleRequirement: "L-05 / R2-M042 : un Quatza-Rij adulte tué seul, sans partenaire, puis retour.",
        missingContent:
          "Créature Quatza-Rij (sprite et variante adulte à produire) et chasse R2-M042 « Le Quatza-Rij solitaire » (texte seul dans la bible).",
        kind: "hunt",
        hunt: { missionId: "ice-cryostalker", team: "solo", bringEveryoneBack: false, noViolation: true, noSecondWind: true },
      },
    ],
  },
  {
    rankId: "elder",
    bibleLevel: 6,
    bibleRank: "Elder",
    bibleTrial: "transmission observée",
    threshold: HONOR_RANK_THRESHOLDS_V166.elder,
    parts: [
      {
        id: "elder-led-triad-hunt",
        label: "Mener la triade aux Chasseurs de pierre et la ramener entière (Acheron-Sigma)",
        origin: "substitut proposé",
        bibleRequirement:
          "Échelle des rangs, Level 6 (proposé dans la bible) : transmission observée — former un pack, juger un différend (R2-M049, R2-M050).",
        missingContent:
          "R2-M049 « Former sans remplacer » (novice, mentor observateur, `elder.mentoringObserved`) et R2-M050 « Un désaccord à résoudre sur le terrain » (`elder.judgmentObserved`) : texte seul, PNJ novice et successeur à produire.",
        kind: "hunt",
        hunt: { missionId: "ruins-ancient-guardian", team: "triad", bringEveryoneBack: true, noViolation: true, noSecondWind: false },
      },
    ],
  },
];

export const RANK_TRIAL_BY_ID_V168: Readonly<Record<TrialRankIdV168, RankTrialDefinitionV168>> = Object.fromEntries(
  RANK_TRIALS_V168.map((trial) => [trial.rankId, trial]),
) as Record<TrialRankIdV168, RankTrialDefinitionV168>;

const ALL_PARTS = RANK_TRIALS_V168.flatMap((trial) => trial.parts.map((part) => ({ trial, part })));
export function rankTrialPartV168(partId: unknown): { trial: RankTrialDefinitionV168; part: RankTrialPartV168 } | null {
  return ALL_PARTS.find(({ part }) => part.id === partId) ?? null;
}

// ---------------------------------------------------------------------------
// État sauvegardé (profile.rankTrialsV168)
// ---------------------------------------------------------------------------

export interface RankTrialPassV168 {
  rankId: TrialRankIdV168;
  /** "trial" : épreuve réussie ; "migration" : rang acquis avant V168, réputé épreuve réussie. */
  via: "trial" | "migration";
  at: string;
}

export interface RankTrialAttemptV168 {
  partId: RankTrialPartIdV168;
  outcome: "success" | "failure";
  /** Conditions non remplies (vide en cas de réussite). */
  reasons: string[];
  difficultyId: DifficultyId;
  at: string;
}

export interface RankTrialArmedV168 {
  rankId: TrialRankIdV168;
  partId: RankTrialPartIdV168;
  missionId: MissionId;
  armedAt: string;
}

export interface RankTrialsStateV168 {
  version: 1;
  passed: RankTrialPassV168[];
  /** Volets de chasse réussis pendant que l'épreuve était débloquée. */
  completedPartIds: RankTrialPartIdV168[];
  /** Tentatives par volet (réussites et échecs). */
  attemptCounts: Partial<Record<RankTrialPartIdV168, number>>;
  /** Dernières tentatives, bornées. */
  attempts: RankTrialAttemptV168[];
  /** Épreuve engagée : la prochaine chasse de cette mission compte comme tentative. */
  armed: RankTrialArmedV168 | null;
}

export const MAX_RANK_TRIAL_ATTEMPTS_LOG_V168 = 12;

export function createRankTrialsV168(): RankTrialsStateV168 {
  return { version: 1, passed: [], completedPartIds: [], attemptCounts: {}, attempts: [], armed: null };
}

const record = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);
const isoDate = (value: unknown): value is string =>
  typeof value === "string" && value.length <= 64 && /^\d{4}-\d{2}-\d{2}T/.test(value) && Number.isFinite(Date.parse(value));
const isTrialRank = (value: unknown): value is TrialRankIdV168 =>
  typeof value === "string" && (TRIAL_RANK_IDS_V168 as readonly string[]).includes(value);
const isDifficulty = (value: unknown): value is DifficultyId =>
  value === "young-blood" || value === "hunter" || value === "elite" || value === "elder";

/**
 * Relit l'état V168. Renvoie null si le champ est absent ou n'est pas un objet
 * version 1 : la sauvegarde est alors traitée comme antérieure (migration).
 * Les entrées inconnues sont ignorées.
 */
export function normalizeRankTrialsV168(value: unknown): RankTrialsStateV168 | null {
  if (!record(value) || value.version !== 1) return null;
  const state = createRankTrialsV168();
  if (Array.isArray(value.passed)) {
    for (const raw of value.passed.slice(0, 16)) {
      if (!record(raw) || !isTrialRank(raw.rankId) || (raw.via !== "trial" && raw.via !== "migration") || !isoDate(raw.at)) continue;
      if (state.passed.some((entry) => entry.rankId === raw.rankId)) continue;
      state.passed.push({ rankId: raw.rankId, via: raw.via, at: raw.at });
    }
    state.passed.sort((a, b) => rankIndexV166(a.rankId) - rankIndexV166(b.rankId));
  }
  if (Array.isArray(value.completedPartIds)) {
    for (const id of value.completedPartIds.slice(0, 16)) {
      const found = rankTrialPartV168(id);
      if (found && found.part.kind === "hunt" && !state.completedPartIds.includes(found.part.id)) state.completedPartIds.push(found.part.id);
    }
  }
  if (record(value.attemptCounts)) {
    for (const [id, count] of Object.entries(value.attemptCounts)) {
      const found = rankTrialPartV168(id);
      if (found && typeof count === "number" && Number.isSafeInteger(count) && count > 0) {
        state.attemptCounts[found.part.id] = Math.min(count, 1_000_000);
      }
    }
  }
  if (Array.isArray(value.attempts)) {
    for (const raw of value.attempts.slice(-MAX_RANK_TRIAL_ATTEMPTS_LOG_V168)) {
      const found = record(raw) ? rankTrialPartV168(raw.partId) : null;
      if (!record(raw) || !found || (raw.outcome !== "success" && raw.outcome !== "failure") ||
          !isDifficulty(raw.difficultyId) || !isoDate(raw.at) || !Array.isArray(raw.reasons)) continue;
      const reasons = raw.reasons.filter((reason): reason is string => typeof reason === "string").slice(0, 8).map((reason) => reason.slice(0, 200));
      state.attempts.push({ partId: found.part.id, outcome: raw.outcome, reasons: raw.outcome === "success" ? [] : reasons, difficultyId: raw.difficultyId, at: raw.at });
    }
  }
  if (record(value.armed)) {
    const found = rankTrialPartV168(value.armed.partId);
    if (found && found.part.kind === "hunt" && found.trial.rankId === value.armed.rankId &&
        value.armed.missionId === found.part.hunt!.missionId && isoDate(value.armed.armedAt)) {
      state.armed = { rankId: found.trial.rankId, partId: found.part.id, missionId: found.part.hunt!.missionId, armedAt: value.armed.armedAt };
    }
  }
  return state;
}

/** Migration : les rangs déjà acquis sont réputés épreuve réussie. */
export function migratedRankTrialsV168(acquiredRankId: RankId, at: string): RankTrialsStateV168 {
  const state = createRankTrialsV168();
  for (const rankId of TRIAL_RANK_IDS_V168) {
    if (rankIndexV166(rankId) <= rankIndexV166(acquiredRankId)) state.passed.push({ rankId, via: "migration", at });
  }
  return state;
}

function highestPassedRank(state: RankTrialsStateV168): RankId {
  return state.passed.reduce<RankId>((best, entry) => higherRankV166(best, entry.rankId), "young-blood");
}

// ---------------------------------------------------------------------------
// Statut d'une épreuve
// ---------------------------------------------------------------------------

export type RankTrialStatusV168 =
  /** Rang déjà acquis (par l'épreuve ou par migration). */
  | "passed"
  /** Le rang précédent n'est pas encore acquis. */
  | "locked-previous-rank"
  /** Honneur sous le seuil (jamais atteint, ou repassé dessous). */
  | "locked-honor"
  /** Débloquée : au moins un volet reste à réussir. */
  | "unlocked";

export type RankTrialSaveViewV168 = Pick<SaveGame, "profile"> & Partial<Pick<SaveGame, "buriedCradle" | "missionProgress">>;

function trialsOf(save: RankTrialSaveViewV168): RankTrialsStateV168 {
  return normalizeRankTrialsV168(save.profile.rankTrialsV168) ?? createRankTrialsV168();
}

export function rankTrialPartDoneV168(save: RankTrialSaveViewV168, part: RankTrialPartV168, state = trialsOf(save)): boolean {
  if (part.kind === "proof") {
    return part.proof === "buried-cradle-crown" && save.buriedCradle?.crownDelivered === true;
  }
  return state.completedPartIds.includes(part.id);
}

export function rankTrialStatusV168(save: RankTrialSaveViewV168, rankId: TrialRankIdV168, honor = save.profile.honor): RankTrialStatusV168 {
  const acquired = isGameRankIdV166(save.profile.rankId) ? save.profile.rankId : "young-blood";
  const index = rankIndexV166(rankId);
  if (rankIndexV166(acquired) >= index) return "passed";
  if (rankIndexV166(acquired) < index - 1) return "locked-previous-rank";
  if (honor < RANK_TRIAL_BY_ID_V168[rankId].threshold) return "locked-honor";
  return "unlocked";
}

/** Épreuve du rang suivant le rang acquis, ou null après Ancien. */
export function nextRankTrialV168(save: RankTrialSaveViewV168): RankTrialDefinitionV168 | null {
  const acquired = isGameRankIdV166(save.profile.rankId) ? save.profile.rankId : "young-blood";
  const next = GAME_RANK_SEQUENCE_V166[rankIndexV166(acquired) + 1];
  return next && isTrialRank(next) ? RANK_TRIAL_BY_ID_V168[next] : null;
}

// ---------------------------------------------------------------------------
// Engager / retirer une épreuve
// ---------------------------------------------------------------------------

export interface RankTrialProfileUpdateV168 {
  ok: boolean;
  profile: SaveGame["profile"];
  message: string;
}

export function armRankTrialV168(save: RankTrialSaveViewV168, partId: RankTrialPartIdV168, now: string): RankTrialProfileUpdateV168 {
  const refuse = (message: string): RankTrialProfileUpdateV168 => ({ ok: false, profile: save.profile, message });
  const found = rankTrialPartV168(partId);
  if (!found || found.part.kind !== "hunt" || !found.part.hunt) return refuse("Ce volet ne se joue pas comme une chasse.");
  const status = rankTrialStatusV168(save, found.trial.rankId);
  if (status === "passed") return refuse(`Le rang ${TRIAL_RANK_LABELS_V168[found.trial.rankId]} est déjà acquis.`);
  if (status === "locked-previous-rank") return refuse("Le rang précédent doit être acquis avant cette épreuve.");
  if (status === "locked-honor") {
    return refuse(`Épreuve verrouillée : ${found.trial.threshold.toLocaleString("fr-FR")} honneur requis, ${save.profile.honor.toLocaleString("fr-FR")} actuellement.`);
  }
  const state = trialsOf(save);
  if (state.completedPartIds.includes(found.part.id)) return refuse("Ce volet de l'épreuve est déjà réussi.");
  const missionStatus = save.missionProgress?.[found.part.hunt.missionId]?.status;
  if (missionStatus === undefined || missionStatus === "locked") return refuse("La chasse de cette épreuve n'est pas encore ouverte.");
  if (!isoDate(now)) return refuse("Date d'engagement invalide.");
  const armed: RankTrialArmedV168 = { rankId: found.trial.rankId, partId: found.part.id, missionId: found.part.hunt.missionId, armedAt: now };
  return {
    ok: true,
    profile: { ...save.profile, rankTrialsV168: { ...state, armed } },
    message: `Épreuve ${TRIAL_RANK_LABELS_V168[found.trial.rankId]} engagée : la prochaine chasse « ${found.part.label} » compte comme tentative.`,
  };
}

export function disarmRankTrialV168(save: RankTrialSaveViewV168): RankTrialProfileUpdateV168 {
  const state = trialsOf(save);
  if (!state.armed) return { ok: false, profile: save.profile, message: "Aucune épreuve engagée." };
  return { ok: true, profile: { ...save.profile, rankTrialsV168: { ...state, armed: null } }, message: "Épreuve retirée : la prochaine chasse sera une chasse ordinaire." };
}

// ---------------------------------------------------------------------------
// Résultat d'une chasse d'épreuve
// ---------------------------------------------------------------------------

/** Conditions non remplies par un résultat de chasse ; vide = volet réussi. */
export function huntTrialFailuresV168(conditions: HuntTrialConditionsV168, result: Pick<MissionResult, "missionId" | "outcome" | "honorEvents" | "secondWindUsed" | "insertionOutcome">): string[] {
  const reasons: string[] = [];
  if (result.missionId !== conditions.missionId) return ["Chasse différente de celle de l'épreuve."];
  if (result.outcome !== "success") {
    reasons.push(result.outcome === "abandoned" ? "Chasse abandonnée." : "Chasse échouée.");
    return reasons;
  }
  const outcome = result.insertionOutcome;
  const team = record(outcome) && record(outcome.plan) && outcome.plan.team === "triad" ? "triad" : "solo";
  if (conditions.team === "solo" && team !== "solo") reasons.push("L'épreuve se passe seul : la triade est partie.");
  if (conditions.team === "triad" && team !== "triad") reasons.push("L'épreuve demande de mener la triade.");
  if (conditions.bringEveryoneBack && team === "triad") {
    const members = record(outcome) && Array.isArray(outcome.members) ? outcome.members : [];
    const leftBehind = record(outcome) && Array.isArray(outcome.leftBehind) ? outcome.leftBehind : [];
    if (members.length < 2 || leftBehind.length > 0) reasons.push("Un membre de la triade n'a pas été ramené.");
  }
  if (conditions.noViolation && Array.isArray(result.honorEvents) && result.honorEvents.some((event) => record(event) && event.kind === "violation")) {
    reasons.push("Le code a été enfreint pendant la chasse.");
  }
  if (conditions.noSecondWind && result.secondWindUsed === true) reasons.push("Le second souffle a été utilisé.");
  return reasons;
}

/**
 * Applique une chasse terminée à l'état des épreuves (appelé par
 * applyMissionResult avec le résultat déjà validé). Seule une épreuve engagée
 * sur cette mission compte ; une épreuve verrouillée au retour (honneur sous
 * le seuil) n'est pas comptée et se désengage.
 */
export function recordRankTrialHuntV168(
  save: RankTrialSaveViewV168,
  result: Pick<MissionResult, "missionId" | "outcome" | "honorEvents" | "secondWindUsed" | "insertionOutcome" | "difficultyId">,
  at: string,
): RankTrialsStateV168 {
  const state = trialsOf(save);
  const armed = state.armed;
  if (!armed || armed.missionId !== result.missionId) return state;
  const found = rankTrialPartV168(armed.partId);
  if (!found || !found.part.hunt || rankTrialStatusV168(save, found.trial.rankId) !== "unlocked" || state.completedPartIds.includes(found.part.id)) {
    return { ...state, armed: null };
  }
  const reasons = huntTrialFailuresV168(found.part.hunt, result);
  const attempt: RankTrialAttemptV168 = {
    partId: found.part.id,
    outcome: reasons.length === 0 ? "success" : "failure",
    reasons,
    difficultyId: isDifficulty(result.difficultyId) ? result.difficultyId : "hunter",
    at,
  };
  return {
    ...state,
    armed: null,
    completedPartIds: reasons.length === 0 ? [...state.completedPartIds, found.part.id] : state.completedPartIds,
    attemptCounts: { ...state.attemptCounts, [found.part.id]: (state.attemptCounts[found.part.id] ?? 0) + 1 },
    attempts: [...state.attempts, attempt].slice(-MAX_RANK_TRIAL_ATTEMPTS_LOG_V168),
  };
}

// ---------------------------------------------------------------------------
// Rang acquis et reconnaissance
// ---------------------------------------------------------------------------

/**
 * Rang acquis et état des épreuves pour normalizeSave.
 * - Sans état V168 (sauvegarde antérieure ou champ illisible) : le rang que
 *   V166 donnait (`resolvedV166`) est conservé et chaque rang acquis est
 *   inscrit « migration ».
 * - Avec état V168 : rang stocké ou plus haut rang inscrit ; l'honneur seul ne
 *   fait plus monter.
 */
export function resolveRankTrialsV168(
  rawState: unknown,
  storedAcquiredRankId: unknown,
  resolvedV166: RankId,
  at: string,
): { rankId: RankId; state: RankTrialsStateV168 } {
  const state = normalizeRankTrialsV168(rawState);
  if (!state) return { rankId: resolvedV166, state: migratedRankTrialsV168(resolvedV166, at) };
  const stored = isGameRankIdV166(storedAcquiredRankId) ? storedAcquiredRankId : "young-blood";
  return { rankId: higherRankV166(stored, highestPassedRank(state)), state };
}

/**
 * Reconnaît le rang suivant quand son épreuve est débloquée et que tous ses
 * volets sont réussis. Un seul rang à la fois ; idempotent.
 */
export function settleRankTrialsV168<T extends RankTrialSaveViewV168>(save: T, at: string): T {
  let current = save;
  for (;;) {
    const trial = nextRankTrialV168(current);
    if (!trial || rankTrialStatusV168(current, trial.rankId) !== "unlocked") return current;
    const state = trialsOf(current);
    if (!trial.parts.every((part) => rankTrialPartDoneV168(current, part, state))) return current;
    const passed = [...state.passed.filter((entry) => entry.rankId !== trial.rankId), { rankId: trial.rankId, via: "trial" as const, at }];
    current = {
      ...current,
      profile: {
        ...current.profile,
        rankId: trial.rankId,
        acquiredRankIdV166: trial.rankId,
        rankTrialsV168: { ...state, passed, armed: state.armed?.rankId === trial.rankId ? null : state.armed },
      },
    };
  }
}

// ---------------------------------------------------------------------------
// Présentation
// ---------------------------------------------------------------------------

export interface RankTrialPartViewV168 {
  part: RankTrialPartV168;
  done: boolean;
  attempts: number;
  armed: boolean;
  /** Raisons d'échec de la dernière tentative ratée de ce volet. */
  lastFailureReasons: string[];
  /** Conditions lisibles du volet. */
  conditions: string[];
  /** Obstacles connus avant de pouvoir jouer ce volet (fournis par l'appelant). */
  blockers: string[];
}

export interface RankTrialViewV168 {
  trial: RankTrialDefinitionV168;
  status: RankTrialStatusV168;
  statusLabel: string;
  passedVia: RankTrialPassV168["via"] | null;
  parts: RankTrialPartViewV168[];
}

export interface RankTrialViewContextV168 {
  /** Motifs qui empêchent de partir au Berceau (evaluateBuriedCradleAccess). */
  cradleMissing?: readonly string[];
  /** Accès réel à la triade (evaluateClanShipAccess). */
  triadAccess?: { allowed: boolean; reason: string };
}

const MISSION_LABELS: Partial<Record<MissionId, string>> = {
  "volcano-bad-blood": "Le dernier rite (Cinder-12)",
  "ice-cryostalker": "Chaleur sous la glace (Nivalis-K)",
  "ruins-ancient-guardian": "Les chasseurs de pierre (Acheron-Sigma)",
};

export function huntTrialConditionLabelsV168(conditions: HuntTrialConditionsV168): string[] {
  const labels = [`Réussir « ${MISSION_LABELS[conditions.missionId] ?? conditions.missionId} »`];
  if (conditions.team === "solo") labels.push("seul, sans la triade");
  if (conditions.team === "triad") labels.push("en menant la triade");
  if (conditions.bringEveryoneBack) labels.push("les deux membres de la triade ramenés");
  if (conditions.noViolation) labels.push("sans enfreindre le code");
  if (conditions.noSecondWind) labels.push("sans second souffle");
  return labels;
}

export function rankTrialViewsV168(save: RankTrialSaveViewV168, context: RankTrialViewContextV168 = {}): RankTrialViewV168[] {
  const state = trialsOf(save);
  return RANK_TRIALS_V168.map((trial) => {
    const status = rankTrialStatusV168(save, trial.rankId);
    const passed = state.passed.find((entry) => entry.rankId === trial.rankId) ?? null;
    const label = TRIAL_RANK_LABELS_V168[trial.rankId];
    const statusLabel =
      status === "passed"
        ? passed?.via === "migration"
          ? `Rang ${label} acquis avant les épreuves : réputé épreuve réussie.`
          : `Rang ${label} acquis.`
        : status === "locked-previous-rank"
          ? "Verrouillée : le rang précédent n'est pas acquis."
          : status === "locked-honor"
            ? `Verrouillée : ${trial.threshold.toLocaleString("fr-FR")} honneur requis (${save.profile.honor.toLocaleString("fr-FR")} actuellement).`
            : `Débloquée : ${trial.threshold.toLocaleString("fr-FR")} honneur atteint. Seule l'épreuve réussie fait monter.`;
    const parts = trial.parts.map((part): RankTrialPartViewV168 => {
      const blockers: string[] = [];
      if (part.kind === "proof" && part.proof === "buried-cradle-crown" && !rankTrialPartDoneV168(save, part, state)) {
        blockers.push(...(context.cradleMissing ?? []));
      }
      if (part.kind === "hunt" && part.hunt) {
        const missionStatus = save.missionProgress?.[part.hunt.missionId]?.status;
        if (missionStatus === "locked") blockers.push("La chasse de cette épreuve n'est pas encore ouverte.");
        if (part.hunt.team === "triad" && context.triadAccess && !context.triadAccess.allowed) blockers.push(context.triadAccess.reason);
      }
      const lastFailure = [...state.attempts].reverse().find((attempt) => attempt.partId === part.id && attempt.outcome === "failure");
      const lastAttempt = [...state.attempts].reverse().find((attempt) => attempt.partId === part.id);
      return {
        part,
        done: rankTrialPartDoneV168(save, part, state),
        attempts: state.attemptCounts[part.id] ?? 0,
        armed: state.armed?.partId === part.id,
        lastFailureReasons: lastAttempt?.outcome === "failure" && lastFailure ? lastFailure.reasons : [],
        conditions: part.kind === "hunt" && part.hunt ? huntTrialConditionLabelsV168(part.hunt) : ["Rapporter la crête de la reine du Berceau enfoui (XP-Z12)."],
        blockers,
      };
    });
    return { trial, status, statusLabel, passedVia: passed?.via ?? null, parts };
  });
}
