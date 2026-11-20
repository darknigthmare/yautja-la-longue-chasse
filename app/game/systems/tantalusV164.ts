/**
 * V164 — Branche Warp « Tantalus 2204 » (crossover USS Tantalus, station Asphodèle).
 *
 * Source : docs/campagne/BIBLE_DE_CAMPAGNE.md, « Crossover : USS Tantalus »
 * (décisions du 6 novembre : 2204 s'atteint par le Warp ; le sort de l'Echo-8
 * est le choix du joueur), « Warp gate d'après le lore NECA » et le classeur V6
 * (WARP-R01, R05, R22 ; V5 États communs STATE5-25 → STATE5-30).
 *
 * Module isolé : la base Warp commune (R2-M030 → M032, quête commune et
 * installation du module) n'existe pas encore dans la sauvegarde. Ce module ne
 * la recrée pas. Il lit les conditions par l'accès existant `warp-universe` de
 * la chronique et ne conserve que l'état propre à la branche Tantalus
 * (STATE5-27 → STATE5-30 pour ce seul voyage). Tant qu'aucun contenu du jeu ne
 * produit « quête commune réussie » et « module installé », le départ reste refusé.
 */
import { evaluateChronicleAccess, type ChronicleRequirement } from "./clanChronicle";
import { shipAcquisitionOwnedHullV89 } from "./shipAcquisitionV89";

export const TANTALUS_LEDGER_VERSION_V164 = 1 as const;
/** STATE5-27 : identifiant de branche. Le présent et la branche gardent des populations distinctes. */
export const TANTALUS_BRANCH_ID_V164 = "warp-tantalus-2204" as const;
export const TANTALUS_YEAR_V164 = 2204 as const;

export type WarpQuestOutcomeV164 = "non_commence" | "en_cours" | "reussi" | "echoue"; // STATE5-25
export type WarpReturnReservationV164 = "inactive" | "reservee" | "utilisee"; // STATE5-29
export type TantalusEcho8ChoiceV164 = "emporte" | "marque";

export interface TantalusTripV164 {
  /** STATE5-28 : un trajet engagé garde son dossier jusqu'au retour. */
  tripId: string;
  branchId: typeof TANTALUS_BRANCH_ID_V164;
  returnReservation: WarpReturnReservationV164;
}
export interface TantalusEcho8RecordV164 {
  choice: TantalusEcho8ChoiceV164;
  eventId: string;
  tripId: string;
}
export interface TantalusLedgerV164 {
  version: typeof TANTALUS_LEDGER_VERSION_V164;
  ownerSaveCreatedAt: string;
  /** Voyage en cours (null : aucun voyage engagé). */
  activeTrip: TantalusTripV164 | null;
  /** STATE5-30 : l'état de la branche survit au retour et aux revisites. */
  echo8: TantalusEcho8RecordV164 | null;
  completedTripIds: readonly string[];
  /** Événements consommés : un événement déjà appliqué ne s'applique pas à nouveau. */
  consumedEventIds: readonly string[];
}

/** Conditions de départ, dans le vocabulaire du classeur (WARP-R01, STATE5-25/26). */
export interface TantalusWarpGateInputV164 {
  chronicle: unknown;
  personalShipAvailable: boolean;
  /** STATE5-25. Sans base Warp, dérivé de la preuve de chronique `warp-module-quest`. */
  warpQuestOutcome?: WarpQuestOutcomeV164;
  /** STATE5-26 : installation matérielle vérifiée. Aucune source dans la sauvegarde actuelle. */
  warpModuleInstalled: boolean;
  /** STATE5-28 : un voyage engagé dans une autre branche Warp (base Warp, PR #162) bloque ce départ. */
  otherWarpTripActive?: boolean;
}
export interface TantalusGateV164 {
  allowed: boolean;
  missing: readonly ChronicleRequirement[];
}

export type TantalusContentStatusV164 = "implemente" | "non_implemente";
export interface TantalusBeatV164 {
  id: string;
  label: string;
  /** Texte tiré de la bible (mission annexe elle-même marquée « proposée »). */
  source: string;
  status: TantalusContentStatusV164;
}
/** Déroulé de la mission annexe « Le silence d'Asphodèle » (bible, mission proposée). */
export const TANTALUS_BEATS_V164: readonly TantalusBeatV164[] = Object.freeze([
  { id: "acces-warp", label: "Branche Warp vers 2204", source: "2204 s'atteint par le Warp (décision du 6 novembre).", status: "implemente" },
  { id: "abordage", label: "Abordage par l'anneau extérieur", source: "Le chasseur aborde Asphodèle par l'anneau extérieur, avant l'arrivée du Tantalus.", status: "non_implemente" },
  { id: "chasse-ponts", label: "Chasse dans les ponts inférieurs", source: "Il chasse les Xénomorphes nés du conteneur QZ17 dans les ponts inférieurs.", status: "non_implemente" },
  { id: "discretion", label: "Rester caché de Crucible et de CASSIUS", source: "En restant caché des récupérateurs Crucible et de CASSIUS.", status: "non_implemente" },
  { id: "echo8", label: "Choix d'honneur : l'Echo-8", source: "Emporter son corps pour lui rendre honneur, ou le laisser avec une marque d'honneur gravée.", status: "implemente" },
  { id: "trophee-interdit", label: "Prendre l'Echo-8 comme trophée", source: "Infraction : il n'a pas été tué par le joueur. Non proposé ; la sanction n'est pas branchée sur l'honneur.", status: "non_implemente" },
  { id: "bad-blood-cassius", label: "Voie Bad Blood : chasser CASSIUS", source: "La Rogue Space Tribe peut proposer de « chasser » CASSIUS (cœur de la station comme trophée).", status: "non_implemente" },
  { id: "sortie", label: "Départ à l'approche du Tantalus", source: "Le chasseur part au moment où le Tantalus approche ; les Marines trouvent les traces sans comprendre.", status: "non_implemente" },
  { id: "retour", label: "Retour par la fenêtre réservée", source: "WARP-R05 / STATE5-29 : le retour est réservé au départ.", status: "implemente" },
]);

export const TANTALUS_ECHO8_CHOICES_V164: readonly { id: TantalusEcho8ChoiceV164; label: string; consequence: string }[] = Object.freeze([
  { id: "emporte", label: "Emporter le corps de l'Echo-8 pour l'honorer", consequence: "Côté Tantalus, on ne retrouve que sa plaque, jamais son corps." },
  { id: "marque", label: "Le laisser avec une marque d'honneur gravée", consequence: "La marque reste sur place, comme l'Ancien d'AVP 2004 honore Lex." },
]);

const record = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === "object" && !Array.isArray(v);
const ident = (v: unknown): v is string => typeof v === "string" && /^[a-z0-9][a-z0-9:._-]{0,95}$/.test(v);
const iso = (v: unknown): v is string => typeof v === "string" && v.length <= 64 && /^\d{4}-\d{2}-\d{2}T/.test(v) && Number.isFinite(Date.parse(v));
const MAX_IDS = 256;

export function createTantalusLedgerV164(owner: string): TantalusLedgerV164 | null {
  if (!iso(owner)) return null;
  return { version: TANTALUS_LEDGER_VERSION_V164, ownerSaveCreatedAt: owner, activeTrip: null, echo8: null, completedTripIds: [], consumedEventIds: [] };
}

/** Strict : null pour toute forme inconnue, y compris une version future (voir inspect). */
export function normalizeTantalusLedgerV164(raw: unknown, owner?: string): TantalusLedgerV164 | null {
  if (!record(raw) || raw.version !== TANTALUS_LEDGER_VERSION_V164 || !iso(raw.ownerSaveCreatedAt)) return null;
  if (owner !== undefined && raw.ownerSaveCreatedAt !== owner) return null;
  const keys = Object.keys(raw).sort().join(",");
  if (keys !== "activeTrip,completedTripIds,consumedEventIds,echo8,ownerSaveCreatedAt,version") return null;
  const ids = (v: unknown) => Array.isArray(v) && v.length <= MAX_IDS && v.every(ident) && new Set(v).size === v.length ? [...v] as string[] : null;
  const completed = ids(raw.completedTripIds), consumed = ids(raw.consumedEventIds);
  if (!completed || !consumed) return null;
  let activeTrip: TantalusTripV164 | null = null;
  if (raw.activeTrip !== null) {
    const t = raw.activeTrip;
    if (!record(t) || Object.keys(t).length !== 3 || !ident(t.tripId) || t.branchId !== TANTALUS_BRANCH_ID_V164 ||
        t.returnReservation !== "reservee" || completed.includes(t.tripId) || !consumed.includes(t.tripId)) return null;
    activeTrip = { tripId: t.tripId, branchId: TANTALUS_BRANCH_ID_V164, returnReservation: "reservee" };
  }
  let echo8: TantalusEcho8RecordV164 | null = null;
  if (raw.echo8 !== null) {
    const e = raw.echo8;
    if (!record(e) || Object.keys(e).length !== 3 || (e.choice !== "emporte" && e.choice !== "marque") || !ident(e.eventId) ||
        !ident(e.tripId) || !consumed.includes(e.eventId) || !(completed.includes(e.tripId) || activeTrip?.tripId === e.tripId)) return null;
    echo8 = { choice: e.choice, eventId: e.eventId, tripId: e.tripId };
  }
  if (completed.some(id => !consumed.includes(id))) return null;
  return { version: TANTALUS_LEDGER_VERSION_V164, ownerSaveCreatedAt: raw.ownerSaveCreatedAt, activeTrip, echo8, completedTripIds: completed, consumedEventIds: consumed };
}

export type TantalusInspectionV164 = "absent" | "valid" | "future-version" | "invalid";
export function inspectTantalusLedgerV164(raw: unknown, owner: unknown): TantalusInspectionV164 {
  if (raw === undefined || raw === null) return "absent";
  if (record(raw) && typeof raw.version === "number" && raw.version > TANTALUS_LEDGER_VERSION_V164) return "future-version";
  return typeof owner === "string" && normalizeTantalusLedgerV164(raw, owner) ? "valid" : "invalid";
}

/** WARP-R01 par l'accès existant `warp-universe` (Blooded, vaisseau, Adjutant, quête commune, module). */
export function evaluateTantalusGateV164(input: TantalusWarpGateInputV164): TantalusGateV164 {
  const access = evaluateChronicleAccess(input.chronicle, "warp-universe", {
    personalShipAvailable: input.personalShipAvailable === true,
    warpModuleInstalled: input.warpModuleInstalled === true,
  });
  const missing = [...access.missing];
  // STATE5-25 : réussite requise, pas une simple entrée de journal.
  if (input.warpQuestOutcome !== undefined && input.warpQuestOutcome !== "reussi" && !missing.some(m => m.id === "warp-module-quest")) {
    missing.push({ id: "warp-module-quest", label: "Quête commune du Warp réussie" });
  }
  if (input.otherWarpTripActive === true) missing.push({ id: "trip-active", label: "Un autre voyage Warp est déjà engagé" });
  return { allowed: missing.length === 0, missing };
}

export type TantalusActionV164 =
  | { kind: "depart"; eventId: string }
  | { kind: "echo8"; eventId: string; choice: TantalusEcho8ChoiceV164 }
  | { kind: "return"; eventId: string };
export interface TantalusResultV164 {
  accepted: boolean;
  changed: boolean;
  ledger: TantalusLedgerV164 | null;
  message: string;
}

/**
 * Transition unique. Le départ vérifie les conditions ; le choix et le retour ne
 * les revérifient pas (WARP-R01 : une condition perdue après départ ne supprime
 * jamais le retour engagé ; STATE5-29).
 */
export function actTantalusV164(raw: unknown, owner: string, action: TantalusActionV164, gate: TantalusWarpGateInputV164): TantalusResultV164 {
  const base = raw === undefined || raw === null ? createTantalusLedgerV164(owner) : normalizeTantalusLedgerV164(raw, owner);
  const refuse = (message: string): TantalusResultV164 => ({ accepted: false, changed: false, ledger: base, message });
  if (!base) return refuse("Dossier Tantalus illisible ou d'une autre campagne : rien n'est modifié.");
  if (!record(action) || !ident(action.eventId)) return refuse("Événement sans identifiant.");
  if (base.consumedEventIds.includes(action.eventId)) {
    return { accepted: true, changed: false, ledger: base, message: "Événement déjà enregistré : il ne s'applique pas à nouveau." };
  }
  if (base.consumedEventIds.length >= MAX_IDS - 2) return refuse("Journal de branche plein.");
  const consumed = [...base.consumedEventIds, action.eventId];
  switch (action.kind) {
    case "depart": {
      if (base.activeTrip) return refuse("Un voyage est déjà engagé : rentrer d'abord par la fenêtre réservée.");
      const evaluation = evaluateTantalusGateV164(gate);
      if (!evaluation.allowed) return refuse("Départ refusé : " + evaluation.missing.map(m => m.label).join(" ; ") + ".");
      return { accepted: true, changed: true, message: "Seuil franchi. Arrivée en 2204, Tantalus Reach, en vue de la station Asphodèle. Retour réservé.",
        ledger: { ...base, consumedEventIds: consumed, activeTrip: { tripId: action.eventId, branchId: TANTALUS_BRANCH_ID_V164, returnReservation: "reservee" } } };
    }
    case "echo8": {
      if (!base.activeTrip) return refuse("L'Echo-8 se trouve dans la branche 2204 : engager d'abord le voyage.");
      if (base.echo8) return refuse("Le sort de l'Echo-8 est déjà décidé dans cette branche.");
      if (action.choice !== "emporte" && action.choice !== "marque") return refuse("Choix inconnu.");
      const label = TANTALUS_ECHO8_CHOICES_V164.find(c => c.id === action.choice)!;
      return { accepted: true, changed: true, message: label.label + ". " + label.consequence,
        ledger: { ...base, consumedEventIds: consumed, echo8: { choice: action.choice, eventId: action.eventId, tripId: base.activeTrip.tripId } } };
    }
    case "return": {
      const trip = base.activeTrip;
      if (!trip || trip.returnReservation !== "reservee") return refuse("Aucun retour réservé.");
      return { accepted: true, changed: true, message: "Retour par la fenêtre réservée. La branche 2204 garde son état.",
        ledger: { ...base, consumedEventIds: consumed, activeTrip: null, completedTripIds: [...base.completedTripIds, trip.tripId] } };
    }
    default: return refuse("Action inconnue.");
  }
}

/** Vue lisible pour l'interface (STATE5-28/29 dérivés du dossier). */
export function tantalusViewV164(ledger: TantalusLedgerV164 | null) {
  return {
    activeWarpTripId: ledger?.activeTrip?.tripId ?? null,
    warpBranchId: ledger?.activeTrip ? TANTALUS_BRANCH_ID_V164 : null,
    warpReturnReservation: (ledger?.activeTrip ? "reservee" : ledger?.completedTripIds.length ? "utilisee" : "inactive") as WarpReturnReservationV164,
    echo8: ledger?.echo8?.choice ?? null,
    trips: ledger?.completedTripIds.length ?? 0,
  };
}

/**
 * Lecture des conditions dans la sauvegarde actuelle. Chronique dans
 * `prologue.chronicle` ; vaisseau par le reçu d'acquisition V89. STATE5-26 n'a
 * aucune source : `warpModuleInstalled` vaut faux tant que la base Warp ne
 * l'écrit pas (signalé comme limite, non contourné).
 */
export function tantalusGateFromSaveV164(save: { createdAt: string; prologue?: { chronicle?: unknown } | null; shipAcquisitionV89?: unknown }): TantalusWarpGateInputV164 {
  return {
    chronicle: save.prologue?.chronicle ?? null,
    personalShipAvailable: shipAcquisitionOwnedHullV89(save.shipAcquisitionV89 ?? null, save.createdAt) !== null,
    warpModuleInstalled: false,
  };
}
