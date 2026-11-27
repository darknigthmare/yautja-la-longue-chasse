/**
 * V164 → V167 — Branche Warp « Tantalus 2204 » (crossover USS Tantalus, station Asphodèle).
 *
 * Source : docs/campagne/BIBLE_DE_CAMPAGNE.md, « Crossover : USS Tantalus »
 * (décisions du 6 novembre : 2204 s'atteint par le Warp ; le sort de l'Echo-8
 * est le choix du joueur ; décision du 20 novembre 2026 : exception — le Warp
 * peut aussi atteindre 2204, branche du Warp ; le classeur V6 n'a pas d'époque
 * 2204), « Warp gate d'après le lore NECA » et le classeur V6 (WARP-R01, R05,
 * R22 ; V5 États communs STATE5-25 → STATE5-30).
 *
 * V167 : la branche est raccordée à la base Warp (`warpEpochsV165.ts`). Le
 * départ, le voyage engagé (un seul à la fois, toutes branches confondues),
 * le retour réservé et l'état de branche sont ceux de `warpEpochsV165`. La
 * porte isolée de V164 (lecture `warp-universe` de la chronique) est
 * supprimée. Ce module garde : les données de la mission, le choix de
 * l'Echo-8, et la lecture des anciens dossiers `tantalusV164`, importés dans
 * l'état Warp à la première écriture.
 */
import {
  WARP_TANTALUS_BRANCH_ID_V165, branchVisitV165, createWarpEpochsV165, emptyBranchVisitV165, normalizeWarpEpochsV165,
  type WarpEpochsStateV165, type WarpUpdateV165,
} from "./warpEpochsV165";

export const TANTALUS_LEDGER_VERSION_V164 = 1 as const;
/** STATE5-27 : identifiant de branche. Le présent et la branche gardent des populations distinctes. */
export const TANTALUS_BRANCH_ID_V164 = WARP_TANTALUS_BRANCH_ID_V165;
export const TANTALUS_YEAR_V164 = 2204 as const;

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
  { id: "acces-warp", label: "Branche Warp vers 2204", source: "2204 s'atteint par le Warp (décision du 6 novembre) ; exception écrite dans la bible : 2204 est une branche du Warp (décision du 20 novembre 2026).", status: "implemente" },
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

/** Ancien format V164 (lecture seule). Strict : null pour toute forme inconnue, y compris une version future (voir inspect). */
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

// ---------------------------------------------------------------------------
// V167 — raccordement à la base Warp
// ---------------------------------------------------------------------------

/** Événement de la branche (`trip:<voyage>:echo8`) : un même voyage ne choisit qu'une fois. */
export function chooseTantalusEcho8V167(state: WarpEpochsStateV165, choice: TantalusEcho8ChoiceV164): WarpUpdateV165 {
  const refuse = (message: string): WarpUpdateV165 => ({ accepted: false, changed: false, state, message });
  if (!state.activeWarpTripId || state.activeTripBranchId !== TANTALUS_BRANCH_ID_V164)
    return refuse("L'Echo-8 se trouve dans la branche 2204 : engager d'abord le voyage vers 2204.");
  if (choice !== "emporte" && choice !== "marque") return refuse("Choix inconnu.");
  const eventId = `trip:${state.activeWarpTripId}:echo8`;
  if (state.consumedEventIds.includes(eventId)) return { accepted: true, changed: false, state, message: "Événement déjà appliqué." };
  const visit = branchVisitV165(state, TANTALUS_BRANCH_ID_V164);
  if (visit.echo8) return refuse("Le sort de l'Echo-8 est déjà décidé dans cette branche.");
  const label = TANTALUS_ECHO8_CHOICES_V164.find(c => c.id === choice)!;
  return { accepted: true, changed: true, message: label.label + ". " + label.consequence, state: {
    ...state,
    branchVisitState: { ...state.branchVisitState, [TANTALUS_BRANCH_ID_V164]: { ...visit, echo8: { choice, tripId: state.activeWarpTripId } } },
    consumedEventIds: [...state.consumedEventIds, eventId],
  } };
}

/** Vue lisible (STATE5-27 → 30) tirée de l'état Warp commun. */
export function tantalusViewV167(state: WarpEpochsStateV165 | null) {
  const visit = state ? branchVisitV165(state, TANTALUS_BRANCH_ID_V164) : emptyBranchVisitV165();
  const inBranch = !!state?.activeWarpTripId && state.activeTripBranchId === TANTALUS_BRANCH_ID_V164;
  return {
    inBranch,
    activeWarpTripId: inBranch ? state!.activeWarpTripId : null,
    otherTripBranchId: state?.activeWarpTripId && !inBranch ? state.activeTripBranchId : null,
    echo8: visit.echo8?.choice ?? null,
    visits: visit.visits,
  };
}

export interface TantalusLegacyMergeV167 {
  /** null : état Warp illisible (rien n'est fusionné ni écrit). */
  state: WarpEpochsStateV165 | null;
  /** Vrai si le dossier `tantalusV164` a été repris : il peut être effacé dans la même écriture. */
  importedLegacy: boolean;
  /** Vrai si un ancien voyage 2204 engagé attend la fin d'un autre voyage pour être repris (proposé). */
  pendingLegacy: boolean;
}

/**
 * Lit un ancien dossier `tantalusV164` dans l'état Warp, sans perte :
 * voyages terminés → visites ; Echo-8 → état de branche ; voyage engagé →
 * voyage Warp engagé avec retour réservé (STATE5-29, honoré même sans module).
 * Si un autre voyage Warp est déjà engagé, l'ancien dossier reste tel quel et
 * sera repris après ce retour (règle proposée : ce cas n'existe que dans une
 * sauvegarde ayant fait tourner séparément les deux PR).
 */
export function mergeLegacyTantalusV167(warpRaw: unknown, legacyRaw: unknown, owner: string): TantalusLegacyMergeV167 {
  const warpPresent = warpRaw !== undefined && warpRaw !== null;
  const warp = warpPresent ? normalizeWarpEpochsV165(warpRaw, owner) : null;
  if (warpPresent && !warp) return { state: null, importedLegacy: false, pendingLegacy: false };
  const legacy = legacyRaw === undefined || legacyRaw === null ? null : normalizeTantalusLedgerV164(legacyRaw, owner);
  if (!legacy) return { state: warp, importedLegacy: false, pendingLegacy: false };
  const base = warp ?? createWarpEpochsV165(owner);
  if (legacy.activeTrip && base.activeWarpTripId) return { state: base, importedLegacy: false, pendingLegacy: true };
  const visit = branchVisitV165(base, TANTALUS_BRANCH_ID_V164);
  const trips = legacy.completedTripIds.length + (legacy.activeTrip ? 1 : 0);
  const echo8 = visit.echo8 ?? (legacy.echo8 ? { choice: legacy.echo8.choice, tripId: legacy.echo8.tripId } : undefined);
  const next: WarpEpochsStateV165 = {
    ...base,
    tripCount: base.tripCount + trips,
    branchVisitState: { ...base.branchVisitState, [TANTALUS_BRANCH_ID_V164]: { ...visit, visits: visit.visits + trips, ...(echo8 ? { echo8 } : {}) } },
    ...(legacy.activeTrip ? {
      warpBranchId: TANTALUS_BRANCH_ID_V164, activeWarpTripId: legacy.activeTrip.tripId,
      activeTripBranchId: TANTALUS_BRANCH_ID_V164, warpReturnReservation: "reservee" as const,
    } : {}),
    consumedEventIds: [...base.consumedEventIds, ...legacy.consumedEventIds.filter(id => !base.consumedEventIds.includes(id))],
  };
  // Le résultat doit rester un état Warp valide ; sinon rien n'est repris.
  const checked = normalizeWarpEpochsV165(next, owner);
  return checked ? { state: checked, importedLegacy: true, pendingLegacy: false } : { state: base, importedLegacy: false, pendingLegacy: true };
}

