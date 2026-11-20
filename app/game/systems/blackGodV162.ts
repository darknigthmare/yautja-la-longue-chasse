/**
 * V162 · Black God (Level 10) : épreuve finale, statut quasi divin et sacrifice au choix.
 *
 * HORS CANON. Le canon ne prévoit pas qu'un Yautja devienne le Black Warrior (Cetanu) ; la bible du
 * projet le dit elle-même et demande d'annoncer le statut « hors canon ». Rien ici n'est présenté comme
 * canon.
 *
 * Source : docs/campagne/BIBLE_DE_CAMPAGNE.md
 * - « Échelle des rangs », Level 10 : « épreuve finale jouable : une chasse mythique digne du Black
 *   Warrior ; la victoire donne un statut quasi divin (hors canon, annoncé comme tel) ; ensuite, quand le
 *   joueur le décide, le sacrifice ultime : il est « réclamé » par le Black Warrior » (case marquée
 *   proposée dans la bible) ; débloque « après le sacrifice : épilogue (R2-M060), masque au mausolée,
 *   héritage transmis à la partie suivante ».
 * - « Seuils d'honneur » : « atteindre le seuil d'honneur débloque l'épreuve du rang ; seule l'épreuve
 *   réussie fait monter » ; Level 10 Black God : 40 000 (valeur proposée dans la bible) ; « l'honneur
 *   perdu peut faire repasser sous le seuil : l'épreuve redevient verrouillée, le rang acquis reste ».
 * - « Combat du Black God : déroulé » : décision de trois phases, la troisième enchaînant combat mental,
 *   avatar géant, arène vivante (détails proposés dans la bible).
 * - « Fin de la voie Bad Blood » : un joueur resté Bad Blood n'accède pas au Black God.
 * - « Héritage vers la partie suivante » : les quatre, après le sacrifice ou une mort en hardcore.
 * - R2-M060 « La longue chasse demeure » : choix « partir, accueillir ou transmettre ».
 * Classeur V6, STATE5-02 et STATE5-08 : enregistrer l'événement avant d'annoncer sa conséquence ; un
 * événement déjà consommé ne s'applique pas à nouveau.
 *
 * Le jeu n'a ni les rangs Clan Leader → Philosopher (L7 → L9) ni la Reine Mère : l'accès retient le seul
 * seuil d'honneur de la bible, plus le rang Elder du jeu (proposé). Tout le reste non fixé est « proposé ».
 */
import type { BiomaskId, SaveGame, WeaponId } from "../types";
import { getChronicleRank } from "./clanChronicle";
import { hardcoreDeathRecordedV155, isFutureHardcoreV155 } from "./hardcoreV155";
import {
  isFutureHeritageV152, normalizeHeritageV152, sealBlackGodSacrificeTestamentV152, type HeritageStateV152,
} from "./heritageV152";

export const BLACK_GOD_V162_VERSION = 1 as const;
/** Bible, « Seuils d'honneur » : Level 10 Black God, 40 000 d'honneur cumulé (valeur proposée dans la bible). */
export const BLACK_GOD_HONOR_THRESHOLD_V162 = 40_000 as const;
/** Proposé : trois blessures graves mettent fin à la tentative (retraite, nouvelle tentative possible). */
export const BLACK_GOD_MAX_WOUNDS_V162 = 3 as const;

export const BLACK_GOD_SOURCE_V162 = {
  document: "docs/campagne/BIBLE_DE_CAMPAGNE.md · Échelle des rangs, Seuils d’honneur, Combat du Black God",
  rank: "Level 10 · Black God : épreuve finale jouable, une chasse mythique digne du Black Warrior ; la victoire donne un statut quasi divin (hors canon, annoncé comme tel) ; ensuite, quand le joueur le décide, le sacrifice ultime : il est « réclamé » par le Black Warrior.",
  threshold: "Seuil d’honneur cumulé (proposé dans la bible) : 40 000 ; atteindre le seuil débloque l’épreuve, seule l’épreuve réussie fait monter.",
  canon: "Black Warrior (Cetanu) : dieu de la chasse, de la mort et de l’honneur, qui « réclame » les morts honorables ; le canon ne prévoit pas qu’un Yautja le devienne.",
  prey: "La proie mythique : une Ancienne déchue qui a modifié son propre ADN ; elle tient deux reines en laisse. Une ruche devenue planète vivante et télépathe est une invention du projet.",
  heritage: "Héritage vers la partie suivante : les quatre, après le sacrifice ou une mort en hardcore.",
  epilogue: "R2-M060 · La longue chasse demeure : traverser son lieu actuel ; un dernier geste. Choix : partir, accueillir ou transmettre.",
  badBlood: "Un joueur resté Bad Blood n’accède pas au Black God.",
} as const;

export type BlackGodGestureV162 = "partir" | "accueillir" | "transmettre";
export const BLACK_GOD_GESTURES_V162: readonly { id: BlackGodGestureV162; label: string }[] = [
  { id: "partir", label: "Partir" }, { id: "accueillir", label: "Accueillir" }, { id: "transmettre", label: "Transmettre" },
];
export interface BlackGodSacrificeV162 { sacrificedAt: string; gesture: BlackGodGestureV162 }
export interface BlackGodStateV162 {
  version: typeof BLACK_GOD_V162_VERSION;
  ownerCreatedAt: string;
  /** Tentatives perdues (retraite). */
  failedAttempts: number;
  /** Victoire sur la proie mythique : statut quasi divin (hors canon). Gardé même si l'honneur redescend. */
  victoryAt: string | null;
  /** Sacrifice : la chronique est close (lecture seule). Irréversible. */
  sacrifice: BlackGodSacrificeV162 | null;
}
export type BlackGodStatusV162 = "none" | "victory" | "sacrificed" | "future" | "invalid";
export type BlackGodChangeV162 =
  | { ok: true; state: BlackGodStateV162; heritage: HeritageStateV152 | null; message: string }
  | { ok: false; reason: string };

const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const iso = (v: unknown): v is string => typeof v === "string" && v.length <= 64 && /^\d{4}-\d{2}-\d{2}T/.test(v) && Number.isFinite(Date.parse(v));
const count = (v: unknown): v is number => typeof v === "number" && Number.isSafeInteger(v) && v >= 0 && v <= 100_000;
const isGesture = (v: unknown): v is BlackGodGestureV162 => BLACK_GOD_GESTURES_V162.some(g => g.id === v);

export const isFutureBlackGodV162 = (value: unknown): boolean =>
  record(value) && typeof value.version === "number" && value.version > BLACK_GOD_V162_VERSION;
export const emptyBlackGodV162 = (ownerCreatedAt: string): BlackGodStateV162 =>
  ({ version: BLACK_GOD_V162_VERSION, ownerCreatedAt, failedAttempts: 0, victoryAt: null, sacrifice: null });

/** null = document invalide, futur ou recopié depuis une autre partie. */
export function normalizeBlackGodV162(value: unknown, ownerCreatedAt: string): BlackGodStateV162 | null {
  if (!record(value) || value.version !== BLACK_GOD_V162_VERSION || value.ownerCreatedAt !== ownerCreatedAt || !iso(ownerCreatedAt) ||
    !count(value.failedAttempts) || !(value.victoryAt === null || iso(value.victoryAt))) return null;
  let sacrifice: BlackGodSacrificeV162 | null = null;
  if (value.sacrifice !== null) {
    const s = value.sacrifice;
    // Pas de sacrifice sans victoire préalable.
    if (!record(s) || !iso(s.sacrificedAt) || !isGesture(s.gesture) || value.victoryAt === null) return null;
    sacrifice = { sacrificedAt: s.sacrificedAt, gesture: s.gesture };
  }
  return { version: BLACK_GOD_V162_VERSION, ownerCreatedAt, failedAttempts: value.failedAttempts, victoryAt: value.victoryAt as string | null, sacrifice };
}

export function blackGodStatusV162(campaign: unknown): BlackGodStatusV162 {
  if (!record(campaign) || campaign.blackGodV162 === undefined || campaign.blackGodV162 === null) return "none";
  if (isFutureBlackGodV162(campaign.blackGodV162)) return "future";
  const state = typeof campaign.createdAt === "string" ? normalizeBlackGodV162(campaign.blackGodV162, campaign.createdAt) : null;
  if (!state) return "invalid";
  return state.sacrifice ? "sacrificed" : state.victoryAt ? "victory" : "none";
}
export const blackGodSacrificedV162 = (campaign: unknown): boolean => blackGodStatusV162(campaign) === "sacrificed";

type AccessSource = Pick<SaveGame, "createdAt" | "profile" | "prologue"> & { blackGodV162?: unknown; hardcoreV155?: unknown };
/** Accès à l'épreuve finale. La victoire déjà acquise n'a plus besoin du seuil (« le rang acquis reste »). */
export function blackGodTrialAccessV162(save: AccessSource): { allowed: boolean; reasons: string[] } {
  const reasons: string[] = [];
  if (isFutureBlackGodV162(save.blackGodV162) || isFutureHardcoreV155(save.hardcoreV155)) return { allowed: false, reasons: ["Registre d’une version plus récente : rien n’est modifié."] };
  const state = readState(save);
  if (!state) return { allowed: false, reasons: ["Registre Black God illisible : rien n’est modifié."] };
  if (state.sacrifice) return { allowed: false, reasons: ["La chronique est close par le sacrifice."] };
  if (state.victoryAt) return { allowed: false, reasons: ["L’épreuve finale est déjà remportée."] };
  if (hardcoreDeathRecordedV155(save)) reasons.push("Chronique Hardcore : la mort est définitive.");
  if (save.profile.honor < BLACK_GOD_HONOR_THRESHOLD_V162)
    reasons.push(`Honneur cumulé : ${save.profile.honor} / ${BLACK_GOD_HONOR_THRESHOLD_V162} (seuil de la bible, valeur proposée).`);
  const chronicle = save.prologue ? getChronicleRank(save.prologue.chronicle) : null;
  if (save.profile.rankId !== "elder" && chronicle !== "elder" && chronicle !== "ancient")
    reasons.push("Rang Elder requis (proposé : les rangs Clan Leader → Philosopher n’existent pas encore dans le jeu).");
  return { allowed: reasons.length === 0, reasons };
}
function readState(save: Pick<SaveGame, "createdAt"> & { blackGodV162?: unknown }): BlackGodStateV162 | null {
  return save.blackGodV162 === undefined || save.blackGodV162 === null ? emptyBlackGodV162(save.createdAt) : normalizeBlackGodV162(save.blackGodV162, save.createdAt);
}

// ---------------------------------------------------------------------------
// Épreuve finale en texte (proposé : le combat 2,5D n'est pas produit). Phases et ordre : bible
// (« trois phases ; la troisième enchaîne combat mental, avatar géant, arène vivante »). Les actions et
// leurs effets sont proposés ; ceux qui s'appuient sur une ligne de la bible la citent.
// La tentative en cours n'est pas sauvegardée (proposé) : quitter recommence l'épreuve au début.
// ---------------------------------------------------------------------------
export type BlackGodPhaseIdV162 = "reines" | "ancienne" | "mental" | "avatar" | "arene";
export const BLACK_GOD_PHASES_V162: readonly { id: BlackGodPhaseIdV162; label: string; bible: string }[] = [
  { id: "reines", label: "1. Les reines libérées", bible: "L’Ancienne lâche ses deux reines ensemble et tire au plasma depuis un promontoire ; tuer une reine enrage l’autre (plus rapide, plus d’acide)." },
  { id: "ancienne", label: "2. L’Ancienne seule", bible: "Duel contre une Yautja plus grande et plus forte, armée et modifiée ; ses hybridations lui donnent des attaques Xénomorphes (queue, sang acide, cri)." },
  { id: "mental", label: "3a. Combat mental", bible: "La planète entre dans l’esprit du joueur : visions des rangs passés ; il doit retrouver sa propre piste au milieu des fausses." },
  { id: "avatar", label: "3b. Avatar géant", bible: "La planète forme un colosse de résine et de chair autour de l’Ancienne ; points faibles à détruire pour l’en arracher." },
  { id: "arene", label: "3c. Arène vivante", bible: "L’Ancienne, fusionnée au sol ; murs, sol et tentacules attaquent, l’interface se brouille ; le coup final la détache et la planète meurt avec elle." },
];
export type BlackGodAttackV162 = "queue" | "sang-acide" | "cri";
const ATTACK_ORDER: readonly BlackGodAttackV162[] = ["queue", "sang-acide", "cri"];
export const BLACK_GOD_ATTACK_LABELS_V162: Record<BlackGodAttackV162, string> = {
  queue: "Elle ramène sa queue en arc", "sang-acide": "Ses plaies modifiées suintent d’acide", cri: "Elle ouvre la mâchoire pour un cri",
};
/** Proposé : parade de chaque attaque Xénomorphe. */
const ATTACK_COUNTER: Record<BlackGodAttackV162, string> = { queue: "esquiver", "sang-acide": "frapper-a-distance", cri: "tenir-la-position" };

export interface BlackGodTrailV162 { id: string; text: string; true: boolean }
export interface BlackGodTrialRunV162 {
  ownerCreatedAt: string; attempt: number;
  phase: BlackGodPhaseIdV162 | "victoire" | "defaite";
  wounds: number;
  /** Phase 1 : reines tombées et reine enragée. */
  queensDown: number; enraged: boolean;
  /** Phase 2 : attaques déjà parées. */
  ancientRound: number;
  /** Phase 3a : pistes proposées (une seule vraie, tirée de la sauvegarde). */
  trails: BlackGodTrailV162[];
  /** Phase 3b : points faibles restants. */
  weakPoints: number;
  log: string[];
}
export interface BlackGodActionV162 { id: string; label: string }

type RunSource = AccessSource & Pick<SaveGame, "trophies" | "statistics">;
/** Pistes de la phase 3a : la vraie reprend les chiffres réels de la chronique ; les fausses les altèrent (proposé). */
function trailsOf(save: RunSource, attempt: number): BlackGodTrailV162[] {
  const real = { missions: save.statistics.missionsCompleted, trophies: save.trophies.length };
  const text = (m: number, t: number) => `${m} chasse(s) réussie(s), ${t} trophée(s) rapporté(s)`;
  const list: BlackGodTrailV162[] = [
    { id: "piste-vraie", text: text(real.missions, real.trophies), true: true },
    { id: "piste-fausse-1", text: text(real.missions + 7, real.trophies), true: false },
    { id: "piste-fausse-2", text: text(real.missions, real.trophies + 5), true: false },
  ];
  const shift = attempt % list.length;
  return [...list.slice(shift), ...list.slice(0, shift)];
}

export function startBlackGodTrialV162(save: RunSource): { ok: true; run: BlackGodTrialRunV162 } | { ok: false; reason: string } {
  const access = blackGodTrialAccessV162(save);
  if (!access.allowed) return { ok: false, reason: access.reasons.join(" ") };
  const attempt = (readState(save)?.failedAttempts ?? 0) + 1;
  return { ok: true, run: { ownerCreatedAt: save.createdAt, attempt, phase: "reines", wounds: 0, queensDown: 0, enraged: false,
    ancientRound: 0, trails: trailsOf(save, attempt), weakPoints: 3, log: ["Retour sur le monde-ruche. La planète respire sous les pieds."] } };
}

export function blackGodCurrentAttackV162(run: BlackGodTrialRunV162): BlackGodAttackV162 {
  return ATTACK_ORDER[(run.ancientRound + run.attempt) % ATTACK_ORDER.length];
}

export function blackGodActionsV162(run: BlackGodTrialRunV162): BlackGodActionV162[] {
  switch (run.phase) {
    case "reines": return run.queensDown === 0
      ? [{ id: "tuer-une-reine", label: "Abattre une reine d’abord" }, { id: "blesser-les-deux", label: "Blesser les deux reines à parts égales" }, { id: "charger-promontoire", label: "Charger le promontoire de l’Ancienne" }]
      : [{ id: "achever-reine", label: run.enraged ? "Achever la reine enragée" : "Achever la seconde reine" }];
    case "ancienne": return [{ id: "esquiver", label: "Esquiver" }, { id: "frapper-a-distance", label: "Reculer et frapper au plasma" }, { id: "tenir-la-position", label: "Tenir la position, masque baissé" }];
    case "mental": return run.trails.map(t => ({ id: t.id, label: `Suivre la piste : ${t.text}` }));
    case "avatar": return [{ id: "point-faible", label: `Détruire un point faible (${run.weakPoints} restant·s)` }, { id: "frapper-colosse", label: "Frapper le colosse de front" }];
    case "arene": return [{ id: "coup-final", label: "Porter le coup final qui la détache" }];
    default: return [];
  }
}

/** Fonction pure : une action, un nouvel état de tentative. */
export function actBlackGodTrialV162(run: BlackGodTrialRunV162, actionId: string): BlackGodTrialRunV162 {
  if (!blackGodActionsV162(run).some(a => a.id === actionId)) return run;
  const next: BlackGodTrialRunV162 = { ...run, log: [...run.log] };
  const wound = (text: string) => { next.wounds++; next.log.push(`${text} Blessure ${next.wounds} / ${BLACK_GOD_MAX_WOUNDS_V162}.`); };
  const go = (phase: BlackGodTrialRunV162["phase"], text: string) => { next.phase = phase; next.log.push(text); };
  switch (run.phase) {
    case "reines":
      if (actionId === "charger-promontoire") wound("Le plasma de l’Ancienne te cloue au sol ; les reines restent libres.");
      else if (actionId === "tuer-une-reine") { next.queensDown = 1; next.enraged = true; next.log.push("Une reine tombe. L’autre enrage : plus rapide, plus d’acide (bible)."); }
      else if (actionId === "blesser-les-deux") { next.queensDown = 1; next.enraged = false; next.log.push("Les deux reines saignent ; la première tombe, la seconde n’a pas le temps d’enrager (proposé)."); }
      else if (actionId === "achever-reine") {
        if (run.enraged) wound("La reine enragée te couvre d’acide avant de tomber.");
        go("ancienne", "Les deux reines sont mortes. L’Ancienne descend du promontoire.");
      }
      break;
    case "ancienne": {
      const attack = blackGodCurrentAttackV162(run);
      if (actionId !== ATTACK_COUNTER[attack]) wound(`${BLACK_GOD_ATTACK_LABELS_V162[attack]} : la parade ne convient pas.`);
      else next.log.push(`${BLACK_GOD_ATTACK_LABELS_V162[attack]} : parée.`);
      next.ancientRound = run.ancientRound + 1;
      if (next.ancientRound >= 3) go("mental", "L’Ancienne vacille. La planète entre dans ton esprit.");
      break;
    }
    case "mental": {
      const trail = run.trails.find(t => t.id === actionId)!;
      if (!trail.true) wound("Fausse piste : la planète t’a montré une vie qui n’est pas la tienne.");
      else go("avatar", "Tu retrouves ta propre piste. La planète forme un colosse autour de l’Ancienne.");
      break;
    }
    case "avatar":
      if (actionId === "frapper-colosse") wound("La résine encaisse ; le colosse te rejette.");
      else { next.weakPoints = run.weakPoints - 1; next.log.push("Un point faible cède."); if (next.weakPoints === 0) go("arene", "L’Ancienne est arrachée au colosse et fusionne au sol : l’arène vit."); }
      break;
    case "arene":
      go("victoire", "Le coup final la détache ; la planète meurt avec elle.");
      break;
  }
  if (next.wounds >= BLACK_GOD_MAX_WOUNDS_V162 && next.phase !== "victoire") go("defaite", "Trop de blessures : retraite. L’épreuve pourra être tentée de nouveau (proposé).");
  return next;
}

type WriteSource = AccessSource;
/** Enregistre l'issue d'une tentative terminée. La victoire est écrite avant d'être annoncée (STATE5-02). */
export function recordBlackGodTrialV162(save: WriteSource & Pick<SaveGame, "trophies" | "statistics">, run: BlackGodTrialRunV162, now: string): BlackGodChangeV162 {
  if (run.ownerCreatedAt !== save.createdAt) return { ok: false, reason: "Tentative d’une autre partie." };
  if (run.phase !== "victoire" && run.phase !== "defaite") return { ok: false, reason: "L’épreuve n’est pas terminée." };
  const access = blackGodTrialAccessV162(save);
  if (!access.allowed) return { ok: false, reason: access.reasons.join(" ") };
  if (!iso(now)) return { ok: false, reason: "Horodatage invalide." };
  const state = readState(save)!;
  if (run.attempt !== state.failedAttempts + 1) return { ok: false, reason: "Cette tentative a déjà été inscrite." };
  if (run.phase === "defaite") return { ok: true, state: { ...state, failedAttempts: state.failedAttempts + 1 }, heritage: null, message: "Retraite inscrite. L’épreuve reste ouverte." };
  return { ok: true, state: { ...state, victoryAt: now }, heritage: null,
    message: "Victoire inscrite. Statut quasi divin de Black God (hors canon). Le sacrifice reste à ton choix, quand tu le décides." };
}

type SacrificeSource = Parameters<typeof sealBlackGodSacrificeTestamentV152>[0] & { blackGodV162?: unknown; hardcoreV155?: unknown };
/**
 * Sacrifice au choix, après la victoire. Clôt la chronique (lecture seule, rien n'est effacé) et scelle
 * le legs « black-god-sacrifice » (masque, arme choisie avant la fin, légende ; bonus à l'héritier) par
 * la fonction commune de scellement. Un legs déjà scellé (retraite à Elder, proposée) reste le seul.
 */
export function sacrificeBlackGodV162(save: SacrificeSource, choice: { weaponId: WeaponId | null; maskId: BiomaskId | null; gesture: BlackGodGestureV162 }, now: string): BlackGodChangeV162 {
  if (isFutureBlackGodV162(save.blackGodV162) || isFutureHeritageV152(save.heritageV152) || isFutureHardcoreV155(save.hardcoreV155))
    return { ok: false, reason: "Registre d’une version plus récente : rien n’est modifié." };
  const state = readState(save);
  if (!state) return { ok: false, reason: "Registre Black God illisible : rien n’est modifié." };
  if (state.sacrifice) return { ok: false, reason: "Le sacrifice est déjà accompli ; la chronique est close." };
  if (!state.victoryAt) return { ok: false, reason: "Le sacrifice suit la victoire de l’épreuve finale." };
  if (hardcoreDeathRecordedV155(save)) return { ok: false, reason: "Chronique Hardcore : la mort est déjà inscrite." };
  if (!isGesture(choice.gesture)) return { ok: false, reason: "Choisis le dernier geste de l’épilogue." };
  if (!iso(now)) return { ok: false, reason: "Horodatage invalide." };
  const existing = save.heritageV152 === undefined || save.heritageV152 === null ? null : normalizeHeritageV152(save.heritageV152, save.createdAt);
  if (save.heritageV152 !== undefined && save.heritageV152 !== null && !existing) return { ok: false, reason: "Registre d’héritage illisible : rien n’est modifié." };
  let heritage: HeritageStateV152 | null = null;
  if (!existing?.testament) {
    const sealed = sealBlackGodSacrificeTestamentV152(save, { weaponId: choice.weaponId, maskId: choice.maskId }, now);
    if (!sealed.ok) return { ok: false, reason: sealed.reason };
    heritage = sealed.state;
  }
  return { ok: true, state: { ...state, sacrifice: { sacrificedAt: now, gesture: choice.gesture } }, heritage,
    message: heritage ? "Le Black Warrior a réclamé ce chasseur. Chronique close ; son masque et sa légende attendent la partie suivante au mausolée."
      : "Le Black Warrior a réclamé ce chasseur. Chronique close ; le legs déjà scellé reste le seul legs de ce chasseur." };
}
