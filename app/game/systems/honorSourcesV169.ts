/**
 * V169 — sources d'honneur durables hors des 8 chasses de campagne.
 *
 * Bible (`docs/campagne/BIBLE_DE_CAMPAGNE.md`) : « Honneur — décision : gagné
 * par la manière » ; « Seuils d'honneur — décision » (l'honneur perdu peut
 * repasser sous le seuil, le rang acquis reste) ; « Tribunal et sanctions »
 * (blâme 100, jugement 500 à 1 500, exil immédiat : tout l'honneur du rang en
 * cours — valeurs marquées « proposées » dans la bible).
 *
 * Principe : chaque événement réel déjà validé par son propre registre
 * durable (contrat remis, chapitre de chronique, mission de PNJ livrée,
 * verdict, déclaration Bad Blood, rites d'une chasse terminée) verse ou retire
 * un honneur borné, une seule fois. L'identifiant de l'événement est inscrit
 * dans `honorSourcesV169` et n'est plus jamais compté. Ce module ne crée aucun
 * événement : il lit des registres déjà validés par leurs modules.
 *
 * Le rang n'est jamais retiré : une perte ne touche que l'honneur ; un gain
 * passe par `promoteRankV166` (logique de montée existante, inchangée ici).
 *
 * Toute valeur absente de la bible est « proposée » ; son calcul est donné à
 * côté de la constante.
 */
import type { MissionId, MissionResult, RankId, SaveGame } from "../types";
import { HOMEWORLD_ALL_CONTRACTS_V69, normalizeHomeworldContractsV68 } from "./homeworldContractsV68";
import { CHRONICLE_EVIDENCE, normalizeClanChronicle, type ChronicleEvidenceId } from "./clanChronicle";
import { normalizeNpcMissionsV66 } from "./homeworldNpcMissionsV66";
import { normalizeHomeworldSideStoryV66 } from "./homeworldSideStoryV66";
import { normalizeJusticeProgress } from "./justice";
import { HONOR_RANK_THRESHOLDS_V166, promoteRankV166, type HonorPaceActivity, type HonorPaceExtraSources } from "./honorProgressionV166";

export const HONOR_SOURCES_LEDGER_VERSION_V169 = 1 as const;

export type HonorSourceKindV169 =
  | "chronicle"
  | "solo"
  | "contract"
  | "npc-mission"
  | "side-story"
  | "justice"
  | "bad-blood";

export interface HonorSourceEntryV169 {
  /** Identifiant unique de l'événement réel ; jamais compté deux fois. */
  id: string;
  source: HonorSourceKindV169;
  /** Variation appliquée à l'honneur (0 pour un événement inscrit sans effet). */
  delta: number;
}

export interface HonorRiteTotalsV169 {
  /** Chasses dont les rites ont été réglés. */
  runs: number;
  gained: number;
  lost: number;
}

export interface HonorSourceLedgerV169 {
  version: typeof HONOR_SOURCES_LEDGER_VERSION_V169;
  entries: HonorSourceEntryV169[];
  /**
   * Rites : dernière rencontre réglée par chasse (index monotone, comme le
   * registre de prélèvements V112). Une rencontre n'est réglée qu'une fois.
   */
  riteSettledRuns: Partial<Record<MissionId, number>>;
  riteTotals: HonorRiteTotalsV169;
}

// ---------------------------------------------------------------------------
// Valeurs
// ---------------------------------------------------------------------------

/**
 * Chronique (receipts `save.prologue.chronicle.evidence`).
 * - `intro-completed` : 100 — bible, Level 1 Unblooded, seuil 100 atteint à
 *   la « fin de l'intro (R2-M006) ».
 * - `first-queen-hunt` : 400 — bible, « reine Xénomorphe : base 400 » et
 *   « Contrat de ruche petite : 400 d'honneur ».
 * - Autres chapitres accomplis : 50 *(proposé)*. Calcul : la bible place
 *   Young Blood à 500 et dit que « le pack et les sorties d'entraînement
 *   rapportent assez pour atteindre 500 en une dizaine de missions » ;
 *   (500 − 100 de l'intro) / 8 chapitres de jeunesse et d'initiation
 *   (premières pistes, formation, piste sans guide, Quatza-Rij en triade,
 *   trois épreuves du temple, retour de la triade) = 50.
 * - Débuts, préparations, coordonnées et ellipses narratives : 0, ce ne sont
 *   pas des actes de chasse (non inscrits).
 */
export const CHRONICLE_HONOR_V169: Readonly<Record<ChronicleEvidenceId, number>> = {
  "intro-begun": 0,
  "intro-completed": 100,
  "first-tracks": 50,
  "training-completed": 50,
  "unguided-hunt": 50,
  "quatza-rij-triad-hunt": 50,
  "temple-three-shadows-triad": 50,
  "temple-three-shadows-changing-layout": 50,
  "temple-three-shadows-no-energy": 50,
  "initiation-return": 50,
  "multiple-world-hunts": 50,
  "team-extraction": 50,
  "warp-module-quest": 50,
  "reserve-coordinates": 0,
  "queen-mission-briefing": 0,
  "first-queen-hunt": 400,
  "diverse-mastery": 50,
  "solitary-trial": 50,
  "long-hunt-history": 50,
  "next-generation": 50,
  "elder-time-passage": 0,
  "ancient-time-passage": 0,
  "lasting-legacy": 50,
  "forgotten-debt": 50,
};

/** Valeur d'un chapitre accompli *(proposé, voir CHRONICLE_HONOR_V169)*. */
export const CHAPTER_HONOR_V169 = 50 as const;

/**
 * Campagnes solo terminées sans receipt de chronique propre (V68, V69, V70,
 * V90) : 50 chacune *(proposé, valeur d'un chapitre)*. V66 et V67 ne sont pas
 * listées : leur réussite est déjà le receipt `first-tracks` / `unguided-hunt`
 * de la chronique, compté une seule fois là.
 */
export const SOLO_CAMPAIGN_KEYS_V169 = ["soloV68", "soloV69", "soloV70", "soloV90"] as const;

/**
 * Contrats V68/V69 remis : 1 honneur par marque de clan de la remise
 * *(proposé)*. 32 contrats, 18 à 78 marques, 1 142 au total ; chaque contrat
 * ne se remet qu'une fois (le registre V68 refuse une seconde remise).
 */
export const CONTRACT_HONOR_PER_MARK_V169 = 1 as const;

/** Missions de PNJ V66 (2) et histoire annexe V66 (1) : 50 *(proposé, chapitre)*. */
export const HOMEWORLD_STORY_HONOR_V169 = 50 as const;

/**
 * Rites de chasse V77 (marquer, dépecer, suspendre), réglés à la fin d'une
 * chasse réussie *(proposé)* :
 * - par proie digne et non protégée : marque 1, dépeçage 3, suspension 3.
 *   Calcul : la bible donne « trophée prélevé et rapporté : + 20 % » de la
 *   base de la proie ; 20 % × 15 (humain armé) = 3.
 * - plafond par chasse : 20 (≈ 3 proies entièrement préparées), pour qu'une
 *   chasse ne rapporte pas davantage en rites qu'en mission rejouée.
 * - violation (dépecer ou suspendre une proie indigne ou protégée) : − 15
 *   par geste, valeur déjà écrite dans ritesOfHuntV77 (`honorDelta`), qui
 *   n'était appliquée nulle part ; comptée même si la chasse échoue.
 */
export const RITE_HONOR_V169 = { mark: 1, flay: 3, hang: 3, capPerRun: 20, violation: -15 } as const;

/**
 * Justice (`save.justice`) : seule une affaire où le joueur est l'auteur réel
 * et que le prévôt a résolue est un verdict. L'exonération ne coûte rien.
 * - revente d'un trophée rituel (« Voler un mérite ou un trophée » : jugement,
 *   500 à 1 500 dans la bible) : restitution 500 (borne basse : la prise est
 *   rendue) ; libération conditionnelle sans restitution 1 000 (milieu)
 *   *(proposé)*.
 * - évasion de détention (absente du tableau des infractions) : 100, la
 *   valeur du blâme *(proposé)*.
 */
export const JUSTICE_VERDICT_LOSS_V169 = {
  "ritual-trophy-resale": { restitution: 500, "conditional-release": 1_000 },
  "detention-escape": { restitution: 100, "conditional-release": 100 },
} as const;

/**
 * Déclaration Bad Blood (refus public du retour, justice.ts) : bible, exil
 * immédiat → « tout l'honneur du rang en cours ». Lecture *(proposée)* :
 * l'honneur au-dessus du seuil du rang acquis est perdu ; le rang reste.
 */
export function badBloodLossV169(honor: number, acquiredRankId: RankId): number {
  return Math.max(0, honor - HONOR_RANK_THRESHOLDS_V166[acquiredRankId]);
}

// ---------------------------------------------------------------------------
// Registre
// ---------------------------------------------------------------------------

const MISSION_IDS_V169: readonly MissionId[] = [
  "jungle-vey", "ice-cryostalker", "volcano-bad-blood", "swamp-hydra",
  "desert-sandmaw", "ocean-leviathan", "fungal-hivemind", "ruins-ancient-guardian",
];
const SOURCE_KINDS: readonly HonorSourceKindV169[] = ["chronicle", "solo", "contract", "npc-mission", "side-story", "justice", "bad-blood"];
const MAX_ENTRIES = 256;
const MAX_DELTA = 1_000_000;

const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const safeInteger = (value: unknown, min: number, max: number): value is number =>
  typeof value === "number" && Number.isSafeInteger(value) && value >= min && value <= max;

export function emptyHonorSourcesV169(): HonorSourceLedgerV169 {
  return { version: HONOR_SOURCES_LEDGER_VERSION_V169, entries: [], riteSettledRuns: {}, riteTotals: { runs: 0, gained: 0, lost: 0 } };
}

/** Lecture stricte : null si le registre n'est pas exactement de ce format. */
export function inspectHonorSourcesV169(raw: unknown): HonorSourceLedgerV169 | null {
  if (!record(raw) || raw.version !== HONOR_SOURCES_LEDGER_VERSION_V169) return null;
  if (!Array.isArray(raw.entries) || raw.entries.length > MAX_ENTRIES) return null;
  const entries: HonorSourceEntryV169[] = [];
  for (const entry of raw.entries) {
    if (!record(entry) || typeof entry.id !== "string" || entry.id.length === 0 || entry.id.length > 128 ||
        !SOURCE_KINDS.includes(entry.source as HonorSourceKindV169) || !safeInteger(entry.delta, -MAX_DELTA, MAX_DELTA) ||
        entries.some(({ id }) => id === entry.id)) return null;
    entries.push({ id: entry.id, source: entry.source as HonorSourceKindV169, delta: entry.delta });
  }
  if (!record(raw.riteSettledRuns)) return null;
  const riteSettledRuns: Partial<Record<MissionId, number>> = {};
  for (const [key, value] of Object.entries(raw.riteSettledRuns)) {
    if (!MISSION_IDS_V169.includes(key as MissionId) || !safeInteger(value, 0, Number.MAX_SAFE_INTEGER)) return null;
    riteSettledRuns[key as MissionId] = value;
  }
  const totals = raw.riteTotals;
  if (!record(totals) || !safeInteger(totals.runs, 0, Number.MAX_SAFE_INTEGER) ||
      !safeInteger(totals.gained, 0, Number.MAX_SAFE_INTEGER) || !safeInteger(totals.lost, 0, Number.MAX_SAFE_INTEGER)) return null;
  return { version: HONOR_SOURCES_LEDGER_VERSION_V169, entries, riteSettledRuns,
    riteTotals: { runs: totals.runs, gained: totals.gained, lost: totals.lost } };
}

/** Événement candidat lu dans un registre durable. */
export interface HonorSourceEventV169 {
  id: string;
  source: HonorSourceKindV169;
  label: string;
  /** Gain (> 0) ou perte (< 0) nominale, avant plancher à 0. */
  delta: number;
}

/** Catalogue fini de tous les événements uniques possibles (contrôle de taille). */
export function honorSourceCatalogueSizeV169(): number {
  return CHRONICLE_EVIDENCE.filter(({ id }) => CHRONICLE_HONOR_V169[id] > 0).length + SOLO_CAMPAIGN_KEYS_V169.length +
    HOMEWORLD_ALL_CONTRACTS_V69.length + 3 + 3 + 1;
}

/**
 * Événements réels présents dans les registres de la sauvegarde. Les
 * registres sont relus par leurs normaliseurs : une donnée qu'ils refusent ne
 * produit aucun événement.
 */
export function collectHonorSourceEventsV169(save: SaveGame): HonorSourceEventV169[] {
  const events: HonorSourceEventV169[] = [];
  if (save.prologue) {
    const chronicle = normalizeClanChronicle(save.prologue.chronicle);
    for (const definition of CHRONICLE_EVIDENCE) {
      const value = CHRONICLE_HONOR_V169[definition.id];
      if (value > 0 && chronicle.evidence.some(({ id }) => id === definition.id)) {
        events.push({ id: `chronicle:${definition.id}`, source: "chronicle", label: definition.label, delta: value });
      }
    }
  }
  for (const key of SOLO_CAMPAIGN_KEYS_V169) {
    const campaign = save[key] as unknown;
    if (record(campaign) && campaign.status === "completed" && typeof campaign.completedAt === "string") {
      events.push({ id: `solo:${key}`, source: "solo", label: `Campagne solo ${key.slice(4)} terminée`, delta: CHAPTER_HONOR_V169 });
    }
  }
  const homeworld = save.homeworld;
  if (homeworld) {
    const contracts = normalizeHomeworldContractsV68(homeworld.contractsV68);
    for (const entry of contracts.entries) {
      if (entry.status !== "completed") continue;
      const definition = HOMEWORLD_ALL_CONTRACTS_V69.find(({ id }) => id === entry.id);
      if (definition) {
        events.push({ id: `contract:${definition.id}`, source: "contract", label: `Contrat remis : ${definition.title}`,
          delta: definition.rewardMarks * CONTRACT_HONOR_PER_MARK_V169 });
      }
    }
    const npc = normalizeNpcMissionsV66(homeworld.npcMissionsV66);
    if (npc.ash.delivered) events.push({ id: "npc-mission:ash", source: "npc-mission", label: "Mission de PNJ livrée : Marches de Cendre", delta: HOMEWORLD_STORY_HONOR_V169 });
    if (npc.glass.delivered) events.push({ id: "npc-mission:glass", source: "npc-mission", label: "Mission de PNJ livrée : Désert de Verre", delta: HOMEWORLD_STORY_HONOR_V169 });
    if (normalizeHomeworldSideStoryV66(homeworld.sideStoryV66).completed) {
      events.push({ id: "side-story:v66", source: "side-story", label: "Histoire annexe de la cité conclue", delta: HOMEWORLD_STORY_HONOR_V169 });
    }
  }
  if (save.justice) {
    const justice = normalizeJusticeProgress(save.justice);
    for (const incident of justice.incidents) {
      if (!incident.resolved || incident.actualOffender !== "player" || incident.resolution === null || incident.resolution === "exoneration") continue;
      if (incident.kind !== "ritual-trophy-resale" && incident.kind !== "detention-escape") continue;
      const loss = JUSTICE_VERDICT_LOSS_V169[incident.kind][incident.resolution];
      events.push({ id: `justice:verdict:${incident.id}`, source: "justice",
        label: incident.kind === "ritual-trophy-resale" ? "Verdict : revente d'un trophée rituel" : "Verdict : évasion de détention", delta: -loss });
    }
    if (justice.declaration === "bad-blood") {
      events.push({ id: "justice:bad-blood", source: "bad-blood", label: "Déclaré Bad Blood : honneur du rang en cours perdu",
        delta: -badBloodLossV169(save.profile.honor, save.profile.rankId) });
    }
  }
  return events;
}

export interface HonorSettlementV169 {
  save: SaveGame;
  /** Événements réglés par cet appel (vides si rien de nouveau). */
  settled: HonorSourceEntryV169[];
  changed: boolean;
}

function withHonor(save: SaveGame, honor: number, ledger: HonorSourceLedgerV169): SaveGame {
  const rankId = honor > save.profile.honor ? promoteRankV166(save.profile.rankId, honor) : save.profile.rankId;
  return {
    ...save,
    profile: { ...save.profile, honor, rankId, acquiredRankIdV166: rankId },
    honorSourcesV169: ledger,
  };
}

/**
 * Règle chaque événement réel une seule fois. Sauvegarde antérieure à V169
 * (registre absent) : ses gains déjà acquis sont versés une fois ; ses pertes
 * sont inscrites sans effet, parce qu'elles ont été décidées quand la justice
 * ne touchait pas l'honneur (pas de sanction rétroactive) *(proposé)*.
 * Le rang n'est jamais retiré.
 */
export function settleHonorSourcesV169(save: SaveGame): HonorSettlementV169 {
  const legacy = save.honorSourcesV169 === undefined || save.honorSourcesV169 === null;
  const ledger = legacy ? emptyHonorSourcesV169() : inspectHonorSourcesV169(save.honorSourcesV169);
  // Un registre illisible n'est jamais réécrit : aucun gain sans preuve qu'il n'a pas déjà été versé.
  if (!ledger) return { save, settled: [], changed: false };
  const known = new Set(ledger.entries.map(({ id }) => id));
  const fresh = collectHonorSourceEventsV169(save).filter(({ id }) => !known.has(id));
  if (fresh.length === 0) {
    return legacy ? { save: { ...save, honorSourcesV169: ledger }, settled: [], changed: true } : { save, settled: [], changed: false };
  }
  let honor = save.profile.honor;
  const settled: HonorSourceEntryV169[] = [];
  for (const event of fresh) {
    if (ledger.entries.length + settled.length >= MAX_ENTRIES) break;
    // Bad Blood : l'honneur du rang en cours se lit après les gains de ce règlement.
    const delta = event.source === "bad-blood" ? -badBloodLossV169(honor, promoteRankV166(save.profile.rankId, honor)) : event.delta;
    const nominal = legacy && delta < 0 ? 0 : delta;
    const next = Math.max(0, honor + nominal);
    settled.push({ id: event.id, source: event.source, delta: next - honor });
    honor = next;
  }
  const nextLedger: HonorSourceLedgerV169 = { ...ledger, entries: [...ledger.entries, ...settled] };
  return { save: withHonor(save, honor, nextLedger), settled, changed: true };
}

// ---------------------------------------------------------------------------
// Rites d'une chasse terminée
// ---------------------------------------------------------------------------

export type RiteHonorKindV169 = "honored" | "violation";
export interface RiteHonorEventV169 {
  /** `${missionId}:${rencontre}:${geste}:${proie}` */
  id: string;
  kind: RiteHonorKindV169;
}

const RITE_ACTIONS = ["mark", "flay", "hang"] as const;
type RiteAction = typeof RITE_ACTIONS[number];

/**
 * Projection, côté chasse, des gestes réellement terminés (ritesOfHuntV77 :
 * `completedEventIds`). Une marque sur une proie indigne n'est ni un gain ni
 * une infraction dans V77 : elle n'est pas transmise.
 */
export function riteHonorEventsFromHuntV169(rites: {
  runId: string;
  completedEventIds: readonly string[];
  corpses: readonly { id: string; worthy: boolean; protectedPrey: boolean }[];
} | null | undefined): RiteHonorEventV169[] {
  if (!rites) return [];
  const events: RiteHonorEventV169[] = [];
  for (const corpse of rites.corpses) {
    const honored = corpse.worthy && !corpse.protectedPrey;
    for (const action of RITE_ACTIONS) {
      if (!rites.completedEventIds.includes(`${action}:${corpse.id}`)) continue;
      if (action === "mark" && !honored) continue;
      events.push({ id: `${rites.runId}:${action}:${corpse.id}`, kind: honored ? "honored" : "violation" });
    }
  }
  return events;
}

export interface RiteHonorOutcomeV169 {
  accepted: boolean;
  gained: number;
  lost: number;
  reason: string;
}

/** Calcul pur des rites d'une rencontre (plafond, violations). */
export function riteHonorForRunV169(events: readonly RiteHonorEventV169[], success: boolean): { gained: number; lost: number } {
  let raw = 0;
  let violations = 0;
  for (const event of events) {
    const action = /:(mark|flay|hang):/.exec(event.id)?.[1] as RiteAction | undefined;
    if (!action) continue;
    if (event.kind === "violation") violations += 1;
    else raw += RITE_HONOR_V169[action];
  }
  return { gained: success ? Math.min(RITE_HONOR_V169.capPerRun, raw) : 0, lost: violations * -RITE_HONOR_V169.violation };
}

/**
 * Règle les rites d'un résultat de chasse. `before` est la sauvegarde au
 * lancement du règlement (sa rencontre doit être la tentative en cours, comme
 * pour les prélèvements V112) ; `after` reçoit l'honneur. Une rencontre déjà
 * réglée n'est jamais recomptée.
 */
export function applyRiteHonorV169(
  before: SaveGame,
  after: SaveGame,
  result: Pick<MissionResult, "missionId" | "outcome" | "riteEventsV169" | "harvestEncounterRunV112">,
): { save: SaveGame; outcome: RiteHonorOutcomeV169 } {
  const refuse = (reason: string) => ({ save: after, outcome: { accepted: false, gained: 0, lost: 0, reason } });
  const raw = result.riteEventsV169;
  if (raw === undefined || (Array.isArray(raw) && raw.length === 0)) return refuse("Aucun rite transmis.");
  if (!Array.isArray(raw) || raw.length > 384) return refuse("Rites invalides.");
  const run = result.harvestEncounterRunV112;
  const missionId = result.missionId;
  if (!MISSION_IDS_V169.includes(missionId) || typeof run !== "number" || !Number.isSafeInteger(run) || run < 0) return refuse("Rencontre inconnue.");
  const legacy = after.honorSourcesV169 === undefined || after.honorSourcesV169 === null;
  const ledger = legacy ? emptyHonorSourcesV169() : inspectHonorSourcesV169(after.honorSourcesV169);
  if (!ledger) return refuse("Registre d'honneur illisible.");
  const watermark = ledger.riteSettledRuns[missionId] ?? -1;
  if (run <= watermark) return refuse("Rites de cette rencontre déjà réglés.");
  if (run !== before.missionProgress[missionId]?.attempts) return refuse("Cette rencontre ne correspond plus à la campagne.");
  const prefix = `${missionId}:${run}:`;
  const ids = new Set<string>();
  const events: RiteHonorEventV169[] = [];
  for (const event of raw as unknown[]) {
    if (!record(event) || typeof event.id !== "string" || event.id.length > 256 || !event.id.startsWith(prefix) ||
        (event.kind !== "honored" && event.kind !== "violation") || ids.has(event.id)) return refuse("Rites invalides.");
    const rest = event.id.slice(prefix.length);
    const separator = rest.indexOf(":");
    const action = separator < 0 ? "" : rest.slice(0, separator);
    const corpseId = separator < 0 ? "" : rest.slice(separator + 1);
    if (!RITE_ACTIONS.includes(action as RiteAction) || !corpseId) return refuse("Rites invalides.");
    ids.add(event.id);
    events.push({ id: event.id, kind: event.kind });
  }
  const { gained, lost } = riteHonorForRunV169(events, result.outcome === "success");
  const honor = Math.max(0, after.profile.honor + gained - lost);
  const nextLedger: HonorSourceLedgerV169 = {
    ...ledger,
    riteSettledRuns: { ...ledger.riteSettledRuns, [missionId]: run },
    riteTotals: { runs: ledger.riteTotals.runs + 1, gained: ledger.riteTotals.gained + gained, lost: ledger.riteTotals.lost + lost },
  };
  return { save: withHonor(after, honor, nextLedger), outcome: { accepted: true, gained, lost, reason: "" } };
}

// ---------------------------------------------------------------------------
// Estimation du temps de jeu (entrée de estimateHonorPaceV166)
// ---------------------------------------------------------------------------

/**
 * Durées *(proposées, non mesurées)* :
 * - intro : 37,5 min (bible : enfance de 30 à 45 min, milieu) ;
 * - chapitre de chronique ou campagne solo : 20 min ;
 * - contrat : 10 min par objectif (1 à 3 objectifs) ;
 * - mission de PNJ : 15 min ; histoire annexe : 30 min ;
 * - première reine : 10 min (bible : ruche petite, 10 min, 400 d'honneur).
 * Seuls les événements que le jeu enregistre aujourd'hui sont comptés (les
 * receipts de chronique encore sans chapitre jouable ne le sont pas).
 */
export const PACE_DURATIONS_V169 = {
  introSeconds: 37.5 * 60,
  chapterSeconds: 20 * 60,
  contractSecondsPerObjective: 10 * 60,
  npcMissionSeconds: 15 * 60,
  sideStorySeconds: 30 * 60,
  firstQueenSeconds: 10 * 60,
} as const;

/** Receipts de chronique qu'un module du jeu inscrit réellement (recensement V169). */
export const RECORDED_CHRONICLE_EVIDENCE_V169: readonly ChronicleEvidenceId[] = [
  "intro-completed", "training-completed", "first-tracks", "unguided-hunt", "first-queen-hunt",
];

export interface PaceSourceOptionsV169 {
  /** Honneur de rites par chasse réussie ; par défaut le plafond (borne rapide). */
  riteHonorPerRun?: number;
  /** Inclure les receipts de chronique encore non jouables (projection). */
  includeUnplayedChronicle?: boolean;
}

export function paceSourcesV169(options: PaceSourceOptionsV169 = {}): HonorPaceExtraSources {
  const d = PACE_DURATIONS_V169;
  const prelude: HonorPaceActivity[] = [
    { id: "chronicle:intro-completed", honor: CHRONICLE_HONOR_V169["intro-completed"], seconds: d.introSeconds },
    ...(["training-completed", "first-tracks", "unguided-hunt"] as const).map((id) => ({ id: `chronicle:${id}`, honor: CHRONICLE_HONOR_V169[id], seconds: d.chapterSeconds })),
    ...SOLO_CAMPAIGN_KEYS_V169.map((key) => ({ id: `solo:${key}`, honor: CHAPTER_HONOR_V169, seconds: d.chapterSeconds })),
  ];
  const interleaved: HonorPaceActivity[] = [
    ...HOMEWORLD_ALL_CONTRACTS_V69.map((contract) => ({ id: `contract:${contract.id}`, honor: contract.rewardMarks * CONTRACT_HONOR_PER_MARK_V169,
      seconds: contract.objectives.length * d.contractSecondsPerObjective })),
    { id: "npc-mission:ash", honor: HOMEWORLD_STORY_HONOR_V169, seconds: d.npcMissionSeconds },
    { id: "npc-mission:glass", honor: HOMEWORLD_STORY_HONOR_V169, seconds: d.npcMissionSeconds },
    { id: "side-story:v66", honor: HOMEWORLD_STORY_HONOR_V169, seconds: d.sideStorySeconds },
    { id: "chronicle:first-queen-hunt", honor: CHRONICLE_HONOR_V169["first-queen-hunt"], seconds: d.firstQueenSeconds },
  ];
  if (options.includeUnplayedChronicle) {
    for (const { id } of CHRONICLE_EVIDENCE) {
      if (CHRONICLE_HONOR_V169[id] > 0 && !RECORDED_CHRONICLE_EVIDENCE_V169.includes(id)) {
        interleaved.push({ id: `chronicle:${id}`, honor: CHRONICLE_HONOR_V169[id], seconds: d.chapterSeconds });
      }
    }
  }
  return { prelude, interleaved, perRunHonor: options.riteHonorPerRun ?? RITE_HONOR_V169.capPerRun };
}
