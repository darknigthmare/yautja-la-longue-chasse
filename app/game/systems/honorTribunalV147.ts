/**
 * V147 — Tribunal et sanctions (bible de campagne : « Honneur, Bad Blood et
 * Enforcer » et « Tribunal et sanctions »).
 *
 * - Les infractions du code canon sont enregistrées avec leurs témoins et leurs
 *   traces (JUST-19 : le statut dépend d'actes établis et d'un jugement, pas
 *   d'une jauge cachée). Ce module ne crée jamais d'infraction à partir de
 *   l'honneur, des échecs de chasse ou de THE PIT : un système de jeu doit
 *   appeler `recordInfractionV147` avec l'acte réellement commis.
 * - Le procès est joué : accusation, preuves de la défense, témoins, verdict.
 * - Peines : blâme, épreuve de réparation, gel du rang, exil (voie Bad Blood).
 *   Le gel bloque la montée de rang jusqu'à l'épreuve de réparation ; le rang
 *   acquis reste, même si l'honneur repasse sous le seuil.
 * - Rédemption : se rendre (JUST-09), subir l'épreuve imposée et revenir ; une
 *   seule seconde chance, une seconde faute rend l'exil définitif.
 *
 * Articulation avec l'audience C-37 (`clanShipTrophyHearing.ts`,
 * `clanShipTrophyCase.ts`) : cette audience règle l'attribution d'un trophée
 * exposé entre deux membres d'équipage ; elle n'a ni accusé, ni peine, ni perte
 * d'honneur. Ce module ne la lit pas, ne l'écrit pas et n'en tire aucune
 * infraction ; les deux registres sont deux champs distincts de la sauvegarde.
 * Seul lien : l'exil ferme le navire de clan, donc l'audience y reste en l'état
 * jusqu'au retour.
 *
 * Les valeurs marquées « (proposé) » le sont dans la bible. Les choix marqués
 * « interprétation » comblent une formulation ambiguë de la bible ; ils sont
 * isolés ici pour être revus.
 */
import type { JusticeDeclaration } from "./justice";
import type { RankId } from "../types";

export const HONOR_TRIBUNAL_VERSION_V147 = 1 as const;

// ---------------------------------------------------------------------------
// Infractions (code canon) — tableau de la bible
// ---------------------------------------------------------------------------

/** blâme < jugement < exil immédiat. */
export type TribunalGravityV147 = "blame" | "judgment" | "exile";
const GRAVITY_ORDER: readonly TribunalGravityV147[] = ["blame", "judgment", "exile"];

export const INFRACTION_KINDS_V147 = [
  "kill-pregnant-or-child",
  "kill-yautja-outside-duel",
  "forbidden-hybrid-or-tech",
  "unblooded-hunts-humans",
  "kill-defenseless-or-unworthy",
  "leave-tech-or-fallen",
  "self-destruct-inhabited",
  "steal-merit-or-trophy",
] as const;
export type InfractionKindV147 = (typeof INFRACTION_KINDS_V147)[number];

export interface InfractionDefinitionV147 {
  readonly id: InfractionKindV147;
  readonly label: string;
  readonly canonSource: string;
  /** Gravité proposée par la bible. `repeatGravity` : « blâme, puis jugement si répété ». */
  readonly gravity: TribunalGravityV147;
  readonly repeatGravity?: TribunalGravityV147;
}

export const INFRACTIONS_V147: readonly InfractionDefinitionV147[] = Object.freeze([
  { id: "kill-pregnant-or-child", label: "Tuer une femme enceinte ou un enfant", canonSource: "code d'honneur", gravity: "exile" },
  { id: "kill-yautja-outside-duel", label: "Tuer un Yautja hors duel sanctionné ou hors traque d'un Bad Blood", canonSource: "code d'honneur", gravity: "exile" },
  { id: "forbidden-hybrid-or-tech", label: "Hybridation ou technologie interdite", canonSource: "code d'honneur ; Rogue Space Tribe (NECA)", gravity: "exile" },
  { id: "unblooded-hunts-humans", label: "Unblooded qui chasse des humains", canonSource: "Prey : la viande molle est interdite aux unBlooded", gravity: "judgment" },
  { id: "kill-defenseless-or-unworthy", label: "Tuer une proie sans défense ou indigne", canonSource: "code d'honneur", gravity: "judgment" },
  { id: "leave-tech-or-fallen", label: "Laisser sa technologie ou un frère tombé à l'ennemi", canonSource: "code d'honneur", gravity: "blame", repeatGravity: "judgment" },
  { id: "self-destruct-inhabited", label: "Autodestruction dans une zone habitée", canonSource: "exil de Scarface (100 ans)", gravity: "judgment" },
  { id: "steal-merit-or-trophy", label: "Voler un mérite ou un trophée", canonSource: "Two-Stripes devient Bad Blood pour une prise qui n'était pas la sienne", gravity: "judgment" },
]);
const INFRACTION_BY_ID = Object.fromEntries(INFRACTIONS_V147.map(d => [d.id, d])) as Record<InfractionKindV147, InfractionDefinitionV147>;

export const GRAVITY_LABELS_V147: Readonly<Record<TribunalGravityV147, string>> = {
  blame: "Blâme", judgment: "Jugement", exile: "Exil immédiat",
};

// ---------------------------------------------------------------------------
// Barème — « Tribunal et sanctions »
// ---------------------------------------------------------------------------

/** (proposé) Perte d'honneur du blâme. */
export const BLAME_HONOR_LOSS_V147 = 100;
/** (proposé) Fourchette de perte d'honneur d'un jugement. */
export const JUDGMENT_HONOR_LOSS_RANGE_V147 = { min: 500, max: 1_500 } as const;
/**
 * (proposé, répartition) La bible donne la fourchette 500 à 1 500 sans dire
 * comment le juge la parcourt. Ici : 500 par élément présenté par l'accusation
 * (trace de l'acte ou témoin à charge), borné à la fourchette. « Le juge
 * tranche selon le barème et ce qui a été montré. »
 */
export const JUDGMENT_LOSS_PER_ACCUSATION_ITEM_V147 = 500;

// ---------------------------------------------------------------------------
// Dossiers, procès, verdicts
// ---------------------------------------------------------------------------

/** Affaire interne : un Elder du clan juge. Affaire entre clans : l'Adjudicator. */
export type TribunalJurisdictionV147 = "internal" | "inter-clan";
export type TribunalJudgeV147 = "clan-elder" | "adjudicator";
export const JUDGE_LABELS_V147: Readonly<Record<TribunalJudgeV147, string>> = {
  "clan-elder": "Un Elder du clan", adjudicator: "L'Adjudicator",
};
export const judgeForJurisdictionV147 = (j: TribunalJurisdictionV147): TribunalJudgeV147 =>
  j === "inter-clan" ? "adjudicator" : "clan-elder";

/** Preuves citées par la bible : trophées et leur provenance, traces, enregistrements du masque. */
export type TribunalTraceKindV147 = "trophy-provenance" | "trace" | "mask-recording";
export const TRACE_KIND_LABELS_V147: Readonly<Record<TribunalTraceKindV147, string>> = {
  "trophy-provenance": "Trophée et provenance", trace: "Trace", "mask-recording": "Enregistrement du masque",
};
/** Ce que la pièce établit : l'acte (pièce à charge), une contrainte, ou le contraire de l'accusation. */
export type TribunalTraceShowsV147 = "act" | "constraint" | "contrary";
export interface TribunalTraceV147 {
  id: string; kind: TribunalTraceKindV147; label: string; shows: TribunalTraceShowsV147;
}
/** Témoins appelables par le joueur : compagnons et membres du pack. L'accusateur est le témoin de l'accusation. */
export type TribunalWitnessRoleV147 = "companion" | "pack" | "accuser";
export interface TribunalWitnessV147 {
  id: string; name: string; role: TribunalWitnessRoleV147;
  account: "confirms-player" | "confirms-accusation";
}

export interface InfractionRecordV147 {
  id: string; kind: InfractionKindV147; jurisdiction: TribunalJurisdictionV147;
  recordedAt: string; witnesses: TribunalWitnessV147[]; traces: TribunalTraceV147[];
  /** Id du verdict rendu, ou null tant que l'affaire attend son procès. */
  verdictId: string | null;
}

export type TribunalTrialStepV147 = "accusation" | "defense" | "witnesses" | "deliberation";
export interface TribunalTrialV147 {
  infractionId: string; judge: TribunalJudgeV147; step: TribunalTrialStepV147;
  presentedTraceIds: string[]; calledWitnessIds: string[]; openedAt: string;
}

export type TribunalOutcomeV147 = "acquitted" | "blame" | "judgment" | "exile";
export interface TribunalVerdictV147 {
  id: string; infractionId: string; judge: TribunalJudgeV147;
  baseGravity: TribunalGravityV147; outcome: TribunalOutcomeV147;
  /** Peine descendue d'un cran par un procès bien mené. */
  reduced: boolean;
  /** Seconde faute après la seconde chance : l'exil est définitif. */
  definitive: boolean;
  honorLost: number; deliveredAt: string;
}

export interface TribunalReparationV147 {
  verdictId: string;
  /** "reparation" : peine d'un jugement ; "imposed" : épreuve imposée après reddition d'un exilé. */
  kind: "reparation" | "imposed";
  /** Compteur de chasses terminées au moment de la peine. */
  missionsCompletedAtSentence: number;
}

export interface HonorTribunalV147 {
  version: 1;
  nextId: number;
  infractions: InfractionRecordV147[];
  trial: TribunalTrialV147 | null;
  verdicts: TribunalVerdictV147[];
  /** Rang le plus haut acquis au moment d'une peine : « le rang acquis reste ». */
  rankFloor: RankId | null;
  /** Gel du rang : le rang affiché reste celui-ci tant que la réparation n'est pas faite. */
  freeze: { verdictId: string; rankId: RankId } | null;
  reparation: TribunalReparationV147 | null;
  exile: {
    verdictId: string; definitive: boolean; surrendered: boolean;
    /** Déclaration de justice d'avant l'exil, rendue au retour. */
    previousDeclaration: JusticeDeclaration;
  } | null;
  /** Une seule seconde chance après une punition sévère. */
  secondChanceUsed: boolean;
}

export const RANK_ORDER_V147: readonly RankId[] = ["young-blood", "blooded", "elite", "elder"];
const rankIndex = (r: RankId) => RANK_ORDER_V147.indexOf(r);
const maxRank = (a: RankId, b: RankId) => (rankIndex(a) >= rankIndex(b) ? a : b);

const MAX_INFRACTIONS = 32, MAX_VERDICTS = 32, MAX_WITNESSES = 8, MAX_TRACES = 8;
const record = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === "object" && !Array.isArray(v);
const idOk = (v: unknown): v is string => typeof v === "string" && v.length > 0 && v.length <= 64 && !/[\u0000-\u001f]/.test(v);
const textOk = (v: unknown): v is string => typeof v === "string" && v.trim().length > 0 && v.length <= 120 && !/[\u0000-\u001f]/.test(v);
const isoOk = (v: unknown): v is string => typeof v === "string" && Number.isFinite(Date.parse(v));
const oneOf = <T extends string>(v: unknown, values: readonly T[]): v is T => values.includes(v as T);
const DECLARATIONS: readonly JusticeDeclaration[] = ["recognized", "exiled", "accused", "bad-blood", "conditional"];

export function emptyHonorTribunalV147(): HonorTribunalV147 {
  return { version: 1, nextId: 1, infractions: [], trial: null, verdicts: [], rankFloor: null,
    freeze: null, reparation: null, exile: null, secondChanceUsed: false };
}

function normalizeWitness(v: unknown): TribunalWitnessV147 | null {
  if (!record(v) || !idOk(v.id) || !textOk(v.name) || !oneOf(v.role, ["companion", "pack", "accuser"] as const) ||
      !oneOf(v.account, ["confirms-player", "confirms-accusation"] as const)) return null;
  return { id: v.id, name: v.name.trim(), role: v.role, account: v.account };
}
function normalizeTrace(v: unknown): TribunalTraceV147 | null {
  if (!record(v) || !idOk(v.id) || !textOk(v.label) || !oneOf(v.kind, ["trophy-provenance", "trace", "mask-recording"] as const) ||
      !oneOf(v.shows, ["act", "constraint", "contrary"] as const)) return null;
  return { id: v.id, kind: v.kind, label: v.label.trim(), shows: v.shows };
}
function uniqueById<T extends { id: string }>(items: (T | null)[], max: number): T[] {
  const out: T[] = [];
  for (const item of items) if (item && !out.some(o => o.id === item.id) && out.length < max) out.push(item);
  return out;
}

/** Lecture tolérante : les éléments invalides sont écartés, une version inconnue donne null. */
export function normalizeHonorTribunalV147(value: unknown): HonorTribunalV147 | null {
  if (!record(value) || value.version !== HONOR_TRIBUNAL_VERSION_V147) return null;
  const t = emptyHonorTribunalV147();
  const rawVerdicts = Array.isArray(value.verdicts) ? value.verdicts.slice(0, MAX_VERDICTS) : [];
  if (Array.isArray(value.infractions)) for (const raw of value.infractions.slice(0, MAX_INFRACTIONS)) {
    if (!record(raw) || !idOk(raw.id) || !oneOf(raw.kind, INFRACTION_KINDS_V147) || !oneOf(raw.jurisdiction, ["internal", "inter-clan"] as const) ||
        !isoOk(raw.recordedAt) || t.infractions.some(i => i.id === raw.id)) continue;
    t.infractions.push({
      id: raw.id, kind: raw.kind, jurisdiction: raw.jurisdiction, recordedAt: raw.recordedAt,
      witnesses: uniqueById(Array.isArray(raw.witnesses) ? raw.witnesses.map(normalizeWitness) : [], MAX_WITNESSES),
      traces: uniqueById(Array.isArray(raw.traces) ? raw.traces.map(normalizeTrace) : [], MAX_TRACES),
      verdictId: null,
    });
  }
  for (const raw of rawVerdicts) {
    if (!record(raw) || !idOk(raw.id) || t.verdicts.some(v => v.id === raw.id)) continue;
    const infraction = t.infractions.find(i => i.id === raw.infractionId);
    if (!infraction || infraction.verdictId || !oneOf(raw.judge, ["clan-elder", "adjudicator"] as const) ||
        !oneOf(raw.baseGravity, GRAVITY_ORDER) || !oneOf(raw.outcome, ["acquitted", "blame", "judgment", "exile"] as const) ||
        !isoOk(raw.deliveredAt) || typeof raw.honorLost !== "number" || !Number.isInteger(raw.honorLost) || raw.honorLost < 0) continue;
    const verdict: TribunalVerdictV147 = { id: raw.id, infractionId: infraction.id, judge: raw.judge, baseGravity: raw.baseGravity,
      outcome: raw.outcome, reduced: raw.reduced === true, definitive: raw.definitive === true && raw.outcome === "exile",
      honorLost: raw.honorLost, deliveredAt: raw.deliveredAt };
    infraction.verdictId = verdict.id;
    t.verdicts.push(verdict);
  }
  const counter = typeof value.nextId === "number" && Number.isInteger(value.nextId) && value.nextId > 0 ? value.nextId : 1;
  t.nextId = Math.max(counter, t.infractions.length + t.verdicts.length + 1);
  if (oneOf(value.rankFloor, RANK_ORDER_V147)) t.rankFloor = value.rankFloor;
  const verdictOf = (id: unknown) => t.verdicts.find(v => v.id === id);
  const freezing = verdictOf(record(value.freeze) ? value.freeze.verdictId : null);
  if (record(value.freeze) && oneOf(value.freeze.rankId, RANK_ORDER_V147) && (freezing?.outcome === "judgment" || freezing?.outcome === "exile"))
    t.freeze = { verdictId: value.freeze.verdictId as string, rankId: value.freeze.rankId };
  if (record(value.exile)) {
    const v = verdictOf(value.exile.verdictId);
    if (v?.outcome === "exile") t.exile = {
      verdictId: v.id, definitive: v.definitive || value.exile.definitive === true,
      surrendered: value.exile.surrendered === true && !v.definitive,
      previousDeclaration: oneOf(value.exile.previousDeclaration, DECLARATIONS) && value.exile.previousDeclaration !== "bad-blood"
        ? value.exile.previousDeclaration : "recognized",
    };
  }
  if (record(value.reparation) && oneOf(value.reparation.kind, ["reparation", "imposed"] as const) &&
      typeof value.reparation.missionsCompletedAtSentence === "number" && Number.isInteger(value.reparation.missionsCompletedAtSentence) &&
      value.reparation.missionsCompletedAtSentence >= 0) {
    const v = verdictOf(value.reparation.verdictId);
    const consistent = value.reparation.kind === "imposed"
      ? t.exile?.verdictId === v?.id && t.exile?.surrendered === true
      : v?.outcome === "judgment";
    if (v && consistent) t.reparation = { verdictId: v.id, kind: value.reparation.kind, missionsCompletedAtSentence: value.reparation.missionsCompletedAtSentence };
  }
  // A surrendered exile always carries its imposed trial.
  if (t.exile?.surrendered && t.reparation?.kind !== "imposed") t.exile.surrendered = false;
  // A freeze without its pending reparation or exile could never be lifted.
  if (t.freeze && !t.exile && t.reparation?.verdictId !== t.freeze.verdictId) t.freeze = null;
  t.secondChanceUsed = value.secondChanceUsed === true;
  if (record(value.trial)) {
    const raw = value.trial;
    const infraction = t.infractions.find(i => i.id === raw.infractionId);
    if (infraction && !infraction.verdictId && oneOf(raw.step, ["accusation", "defense", "witnesses", "deliberation"] as const) && isoOk(raw.openedAt)) {
      const defense = defenseTraces(infraction).map(tr => tr.id), callable = callableWitnesses(infraction).map(w => w.id);
      t.trial = { infractionId: infraction.id, judge: judgeForJurisdictionV147(infraction.jurisdiction), step: raw.step, openedAt: raw.openedAt,
        presentedTraceIds: Array.isArray(raw.presentedTraceIds) ? defense.filter(id => (raw.presentedTraceIds as unknown[]).includes(id)) : [],
        calledWitnessIds: Array.isArray(raw.calledWitnessIds) ? callable.filter(id => (raw.calledWitnessIds as unknown[]).includes(id)) : [] };
    }
  }
  return t;
}

/** Une sauvegarde ne peut pas réécrire un tribunal d'une version future. */
export function tribunalVersionStatusV147(value: unknown): "absent" | "ok" | "future-version" | "invalid" {
  if (value === undefined || value === null) return "absent";
  if (!record(value)) return "invalid";
  if (typeof value.version === "number" && value.version > HONOR_TRIBUNAL_VERSION_V147) return "future-version";
  return value.version === HONOR_TRIBUNAL_VERSION_V147 ? "ok" : "invalid";
}

// ---------------------------------------------------------------------------
// Lecture du dossier
// ---------------------------------------------------------------------------

/** Pièces de l'accusation : traces de l'acte et témoins à charge. */
export function accusationCaseV147(i: InfractionRecordV147) {
  return {
    traces: i.traces.filter(t => t.shows === "act"),
    witnesses: i.witnesses.filter(w => w.role === "accuser"),
  };
}
/** Pièces que le joueur peut présenter : toutes celles que l'accusation n'utilise pas. */
export function defenseTraces(i: InfractionRecordV147): TribunalTraceV147[] {
  return i.traces.filter(t => t.shows !== "act");
}
/** Témoins appelables : compagnons et membres du pack. */
export function callableWitnesses(i: InfractionRecordV147): TribunalWitnessV147[] {
  return i.witnesses.filter(w => w.role === "companion" || w.role === "pack");
}

function priorEstablishedCount(t: HonorTribunalV147, i: InfractionRecordV147): number {
  const index = t.infractions.findIndex(x => x.id === i.id);
  return t.infractions.slice(0, index).filter(x => x.kind === i.kind &&
    t.verdicts.find(v => v.id === x.verdictId)?.outcome !== "acquitted").length;
}

/** Gravité du barème pour ce dossier, répétition comprise. */
export function baseGravityV147(t: HonorTribunalV147, i: InfractionRecordV147): TribunalGravityV147 {
  const d = INFRACTION_BY_ID[i.kind];
  return d.repeatGravity && priorEstablishedCount(t, i) > 0 ? d.repeatGravity : d.gravity;
}

export interface TribunalDeliberationV147 {
  baseGravity: TribunalGravityV147;
  contraryShown: boolean; constraintShown: boolean; witnessConfirms: boolean;
  wellConducted: boolean; outcome: TribunalOutcomeV147; reduced: boolean; definitive: boolean;
  accusationItems: number;
}

/** Ce que le juge retient de ce qui a été montré. Pur : ne modifie rien. */
export function deliberateV147(t: HonorTribunalV147, trial: TribunalTrialV147): TribunalDeliberationV147 | null {
  const i = t.infractions.find(x => x.id === trial.infractionId);
  if (!i) return null;
  const presented = i.traces.filter(tr => trial.presentedTraceIds.includes(tr.id));
  const called = i.witnesses.filter(w => trial.calledWitnessIds.includes(w.id));
  const baseGravity = baseGravityV147(t, i);
  const contraryShown = presented.some(tr => tr.shows === "contrary");
  const constraintShown = presented.some(tr => tr.shows === "constraint");
  const witnessConfirms = called.some(w => w.account === "confirms-player");
  // Interprétation : « Un procès bien mené (preuve d'une contrainte, témoin qui
  // confirme) » demande ici les deux éléments réunis.
  const wellConducted = constraintShown && witnessConfirms;
  const accusation = accusationCaseV147(i);
  const accusationItems = accusation.traces.length + accusation.witnesses.length;
  let outcome: TribunalOutcomeV147; let reduced = false;
  if (contraryShown) {
    // « exil, sauf preuve contraire présentée au procès ». Interprétation : la
    // preuve contraire établit que l'acte n'a pas eu lieu (JUST-19 : pas d'acte
    // établi, pas de statut), pour toutes les gravités.
    outcome = "acquitted";
  } else {
    let index = GRAVITY_ORDER.indexOf(baseGravity);
    // « peut faire descendre la peine d'un cran » ; le blâme est la peine la plus basse.
    if (wellConducted && index > 0) { index -= 1; reduced = true; }
    outcome = GRAVITY_ORDER[index];
  }
  // « une seconde faute rend l'exil définitif » (après la seule seconde chance).
  // Interprétation : une faute jugée au-delà du blâme.
  let definitive = false;
  if (t.secondChanceUsed && (outcome === "judgment" || outcome === "exile")) { outcome = "exile"; definitive = true; }
  return { baseGravity, contraryShown, constraintShown, witnessConfirms, wellConducted, outcome, reduced, definitive, accusationItems };
}

// ---------------------------------------------------------------------------
// Rang : gel et rang acquis
// ---------------------------------------------------------------------------

/** Rang affiché : gelé tant que la peine dure, jamais sous le rang acquis. */
export function effectiveRankV147(honorRank: RankId, t: HonorTribunalV147 | null | undefined): RankId {
  if (!t) return honorRank;
  if (t.freeze) return t.freeze.rankId;
  return t.rankFloor ? maxRank(honorRank, t.rankFloor) : honorRank;
}
/** Le gel (ou l'exil) bloque les épreuves de rang. */
export function rankTrialsBlockedV147(t: HonorTribunalV147 | null | undefined): boolean {
  return !!t && (t.freeze !== null || t.exile !== null);
}
/** Exil : perte de l'accès à la cité et au navire de clan. */
export function tribunalAccessV147(t: HonorTribunalV147 | null | undefined): { city: boolean; clanShip: boolean } {
  const exiled = !!t?.exile;
  return { city: !exiled, clanShip: !exiled };
}

export interface TribunalStatusV147 {
  pendingCount: number; trialOpen: boolean; frozen: boolean; exiled: boolean; definitiveExile: boolean;
  reparationPending: boolean; canSurrender: boolean; label: string;
}
export function tribunalStatusV147(t: HonorTribunalV147 | null | undefined): TribunalStatusV147 {
  const s = t ?? emptyHonorTribunalV147();
  const pendingCount = s.infractions.filter(i => !i.verdictId).length;
  const exiled = !!s.exile, definitiveExile = !!s.exile?.definitive;
  const canSurrender = exiled && !definitiveExile && !s.exile!.surrendered && !s.secondChanceUsed;
  const label = definitiveExile ? "Exil définitif" : exiled ? (s.exile!.surrendered ? "Exilé · épreuve imposée en cours" : "Exilé · voie Bad Blood")
    : s.freeze ? "Rang gelé · épreuve de réparation due" : s.trial ? "Procès en cours" : pendingCount ? "Affaire en attente de procès" : "Aucune affaire";
  return { pendingCount, trialOpen: !!s.trial, frozen: !!s.freeze, exiled, definitiveExile,
    reparationPending: !!s.reparation, canSurrender, label };
}

// ---------------------------------------------------------------------------
// Enregistrement d'une infraction
// ---------------------------------------------------------------------------

export interface RecordInfractionInputV147 {
  kind: InfractionKindV147; jurisdiction: TribunalJurisdictionV147;
  witnesses: readonly TribunalWitnessV147[]; traces: readonly TribunalTraceV147[];
  recordedAt: string;
}
/** Enregistre un acte réellement commis. Retourne null si l'entrée est invalide ou le registre plein. */
export function recordInfractionV147(value: HonorTribunalV147 | null | undefined, input: RecordInfractionInputV147):
    { tribunal: HonorTribunalV147; infractionId: string } | null {
  const t = clone(value ?? emptyHonorTribunalV147());
  if (!oneOf(input.kind, INFRACTION_KINDS_V147) || !oneOf(input.jurisdiction, ["internal", "inter-clan"] as const) || !isoOk(input.recordedAt)) return null;
  if (t.infractions.length >= MAX_INFRACTIONS) return null;
  const witnesses = input.witnesses.map(normalizeWitness), traces = input.traces.map(normalizeTrace);
  if (witnesses.some(w => !w) || traces.some(tr => !tr)) return null;
  const w = uniqueById(witnesses, MAX_WITNESSES), tr = uniqueById(traces, MAX_TRACES);
  if (w.length !== input.witnesses.length || tr.length !== input.traces.length) return null;
  // « Chaque infraction est enregistrée avec ses témoins et ses traces. »
  if (!w.length && !tr.length) return null;
  const id = "inf-" + t.nextId++;
  t.infractions.push({ id, kind: input.kind, jurisdiction: input.jurisdiction, recordedAt: input.recordedAt, witnesses: w, traces: tr, verdictId: null });
  return { tribunal: t, infractionId: id };
}

// ---------------------------------------------------------------------------
// Actions jouées
// ---------------------------------------------------------------------------

export type TribunalActionV147 =
  | { type: "open-trial"; infractionId: string }
  | { type: "hear-accusation" }
  | { type: "present-evidence"; traceId: string }
  | { type: "close-evidence" }
  | { type: "call-witness"; witnessId: string }
  | { type: "close-witnesses" }
  | { type: "hear-verdict" }
  | { type: "complete-reparation" }
  | { type: "surrender" };

/** Ce que l'action lit et écrit de la campagne, sans dépendre de save.ts. */
export interface TribunalContextV147 {
  honor: number;
  /** Rang affiché au moment de l'action (déjà effectif). */
  rankId: RankId;
  /** Seuil d'honneur du rang en cours : l'exil retire « tout l'honneur du rang en cours ». */
  currentRankThreshold: number;
  missionsCompleted: number;
  declaration: JusticeDeclaration;
  now: string;
}
export interface TribunalActionResultV147 {
  tribunal: HonorTribunalV147; honor: number; declaration: JusticeDeclaration;
  ok: boolean; changed: boolean; message: string; verdict: TribunalVerdictV147 | null;
}

function clone(t: HonorTribunalV147): HonorTribunalV147 {
  return JSON.parse(JSON.stringify(t)) as HonorTribunalV147;
}

/**
 * Honneur retiré par une peine. Les montants sont ceux du barème (proposé) de la
 * bible. Interprétation : « tout l'honneur du rang en cours » = l'honneur
 * accumulé au-dessus du seuil du rang en cours ; l'exilé retombe à ce seuil.
 */
export function honorLossV147(outcome: TribunalOutcomeV147, accusationItems: number, honor: number, currentRankThreshold: number): number {
  const raw = outcome === "blame" ? BLAME_HONOR_LOSS_V147
    : outcome === "judgment" ? Math.min(JUDGMENT_HONOR_LOSS_RANGE_V147.max, Math.max(JUDGMENT_HONOR_LOSS_RANGE_V147.min, accusationItems * JUDGMENT_LOSS_PER_ACCUSATION_ITEM_V147))
    : outcome === "exile" ? Math.max(0, honor - Math.max(0, currentRankThreshold))
    : 0;
  return Math.max(0, Math.min(honor, raw));
}

export function applyTribunalActionV147(value: HonorTribunalV147 | null | undefined, action: TribunalActionV147, context: TribunalContextV147): TribunalActionResultV147 {
  const before = value ?? emptyHonorTribunalV147();
  const t = clone(before);
  let honor = Math.max(0, Math.trunc(context.honor));
  let declaration = context.declaration;
  let verdict: TribunalVerdictV147 | null = null;
  const reply = (ok: boolean, message: string): TribunalActionResultV147 => ({
    tribunal: ok ? t : before, honor: ok ? honor : context.honor, declaration: ok ? declaration : context.declaration,
    ok, changed: ok && (JSON.stringify(t) !== JSON.stringify(before) || honor !== context.honor || declaration !== context.declaration),
    message, verdict: ok ? verdict : null,
  });
  const trial = t.trial;
  const infraction = trial ? t.infractions.find(i => i.id === trial.infractionId) : undefined;
  switch (action.type) {
    case "open-trial": {
      if (t.trial) return reply(false, "Un procès est déjà ouvert : il doit aller jusqu'au verdict.");
      if (t.exile?.definitive) return reply(false, "L'exil est définitif : le clan ne te juge plus.");
      const i = t.infractions.find(x => x.id === action.infractionId);
      if (!i || i.verdictId) return reply(false, "Aucune affaire en attente sous ce nom.");
      t.trial = { infractionId: i.id, judge: judgeForJurisdictionV147(i.jurisdiction), step: "accusation", presentedTraceIds: [], calledWitnessIds: [], openedAt: context.now };
      return reply(true, `${JUDGE_LABELS_V147[t.trial.judge]} ouvre le procès : ${INFRACTION_BY_ID[i.kind].label}. L'accusation parle d'abord.`);
    }
    case "hear-accusation": {
      if (!trial || !infraction || trial.step !== "accusation") return reply(false, "L'accusation n'a rien à présenter maintenant.");
      trial.step = "defense";
      const a = accusationCaseV147(infraction);
      return reply(true, `L'accusation présente ${a.traces.length} pièce(s) et ${a.witnesses.length} témoin(s). À toi de présenter tes preuves.`);
    }
    case "present-evidence": {
      if (!trial || !infraction || trial.step !== "defense") return reply(false, "Ce n'est pas le moment de présenter une preuve.");
      const trace = defenseTraces(infraction).find(tr => tr.id === action.traceId);
      if (!trace) return reply(false, "Cette pièce n'est pas au dossier de la défense.");
      if (trial.presentedTraceIds.includes(trace.id)) return reply(false, "Cette pièce a déjà été présentée.");
      trial.presentedTraceIds.push(trace.id);
      return reply(true, trace.shows === "contrary" ? `« ${trace.label} » contredit l'accusation.`
        : `« ${trace.label} » montre une contrainte au moment des faits.`);
    }
    case "close-evidence": {
      if (!trial || trial.step !== "defense") return reply(false, "Aucune présentation de preuves en cours.");
      trial.step = "witnesses";
      return reply(true, "Les preuves sont versées au dossier. Tu peux appeler tes témoins.");
    }
    case "call-witness": {
      if (!trial || !infraction || trial.step !== "witnesses") return reply(false, "Ce n'est pas le moment d'appeler un témoin.");
      const witness = callableWitnesses(infraction).find(w => w.id === action.witnessId);
      if (!witness) return reply(false, "Ce témoin ne peut pas être appelé par la défense.");
      if (trial.calledWitnessIds.includes(witness.id)) return reply(false, "Ce témoin a déjà parlé.");
      trial.calledWitnessIds.push(witness.id);
      return reply(true, witness.account === "confirms-player" ? `${witness.name} confirme ta version.` : `${witness.name} ne confirme pas ta version.`);
    }
    case "close-witnesses": {
      if (!trial || trial.step !== "witnesses") return reply(false, "Aucune audition de témoins en cours.");
      trial.step = "deliberation";
      return reply(true, `${JUDGE_LABELS_V147[trial.judge]} se retire pour trancher selon le barème et ce qui a été montré.`);
    }
    case "hear-verdict": {
      if (!trial || !infraction || trial.step !== "deliberation") return reply(false, "Le juge n'a pas encore tout entendu.");
      const d = deliberateV147(t, trial)!;
      const lost = honorLossV147(d.outcome, d.accusationItems, honor, context.currentRankThreshold);
      if (t.verdicts.length >= MAX_VERDICTS) return reply(false, "Le registre des verdicts est plein.");
      verdict = { id: "ver-" + t.nextId++, infractionId: infraction.id, judge: trial.judge, baseGravity: d.baseGravity,
        outcome: d.outcome, reduced: d.reduced, definitive: d.definitive, honorLost: lost, deliveredAt: context.now };
      t.verdicts.push(verdict); infraction.verdictId = verdict.id; t.trial = null;
      if (d.outcome === "acquitted") return reply(true, "Preuve contraire présentée : l'acte n'est pas établi. Aucune peine.");
      honor -= lost;
      // « le rang acquis reste » : le rang du moment devient un plancher.
      t.rankFloor = t.rankFloor ? maxRank(t.rankFloor, context.rankId) : context.rankId;
      if (d.outcome === "blame") return reply(true, `Blâme : ${lost} points d'honneur perdus. Aucune autre peine.`);
      if (d.outcome === "judgment") {
        // Interprétation : un jugement rendu pendant un exil retire l'honneur mais
        // ne remplace ni le gel ni l'épreuve imposée de l'exil, déjà plus sévères.
        if (t.exile) return reply(true, `Jugement${d.reduced ? " (peine descendue d'un cran)" : ""} : ${lost} points d'honneur perdus. L'exil en cours tient déjà le rang gelé.`);
        t.freeze = { verdictId: verdict.id, rankId: context.rankId };
        t.reparation = { verdictId: verdict.id, kind: "reparation", missionsCompletedAtSentence: Math.max(0, Math.trunc(context.missionsCompleted)) };
        return reply(true, `Jugement${d.reduced ? " (peine descendue d'un cran)" : ""} : ${lost} points d'honneur perdus, rang gelé jusqu'à l'épreuve de réparation. Le rang acquis reste.`);
      }
      // Exil : voie Bad Blood.
      const previous = t.exile?.previousDeclaration ?? (declaration === "bad-blood" ? "recognized" : declaration);
      t.exile = { verdictId: verdict.id, definitive: d.definitive, surrendered: false, previousDeclaration: previous };
      t.freeze = { verdictId: verdict.id, rankId: context.rankId };
      t.reparation = null;
      declaration = "bad-blood";
      return reply(true, d.definitive
        ? `Seconde faute après la seconde chance : exil définitif. ${lost} points d'honneur perdus. Tes rangs restent écrits.`
        : `Exil : ${lost} points d'honneur perdus (l'honneur du rang en cours). Tu perds l'accès à la cité et au navire de clan ; tes rangs restent écrits mais tu ne peux plus en gagner dans le clan.`);
    }
    case "complete-reparation": {
      const r = t.reparation;
      if (!r) return reply(false, "Aucune épreuve n'est due.");
      if (Math.trunc(context.missionsCompleted) <= r.missionsCompletedAtSentence)
        return reply(false, "L'épreuve n'est pas accomplie : termine une chasse après le verdict, puis reviens devant le tribunal.");
      t.reparation = null; t.freeze = null;
      if (r.kind === "imposed" && t.exile) {
        declaration = t.exile.previousDeclaration;
        t.exile = null; t.secondChanceUsed = true;
        return reply(true, "Épreuve imposée accomplie : tu reviens au clan. C'était ta seule seconde chance ; une seconde faute rendrait l'exil définitif.");
      }
      return reply(true, "Épreuve de réparation accomplie : le gel du rang est levé.");
    }
    case "surrender": {
      if (!t.exile) return reply(false, "Tu n'es pas exilé.");
      if (t.exile.definitive) return reply(false, "L'exil est définitif : aucune reddition n'est reçue.");
      if (t.secondChanceUsed) return reply(false, "La seule seconde chance a déjà été donnée.");
      if (t.exile.surrendered) return reply(false, "Ta reddition est déjà reçue ; l'épreuve imposée attend.");
      t.exile.surrendered = true;
      t.reparation = { verdictId: t.exile.verdictId, kind: "imposed", missionsCompletedAtSentence: Math.max(0, Math.trunc(context.missionsCompleted)) };
      return reply(true, "Reddition reçue (JUST-09). Subis l'épreuve imposée pour revenir au clan.");
    }
    default: return reply(false, "Action inconnue du tribunal.");
  }
}

/**
 * Contenu de l'épreuve de réparation et de l'épreuve imposée : la bible ne le
 * fixe pas. Provisoire : une chasse de la campagne terminée après le verdict.
 */
export const REPARATION_TRIAL_PLACEHOLDER_V147 =
  "Épreuve provisoire : terminer une chasse après le verdict (contenu non fixé par la bible).";
