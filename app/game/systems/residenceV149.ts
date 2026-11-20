/**
 * V149 — Première résidence (BUILD5-07, bible V6 « Maison et clan »).
 *
 * Source : classeur V6, onglets « Résidences des tribus », « Pièces des
 * maisons », « Règles de résidence » (HOME-R01 à R24), « Simuler Résidence »,
 * « Vie dans la maison » (HOME-E01, E20), « V5 Recette du jeu » (QA5-05) et
 * « Gestes de l'atelier » (TR-A084). Les textes des maisons et des pièces sont
 * repris tels quels dans `data/residencesV149.json`.
 *
 * Ce que le classeur fixe et qui est appliqué ici :
 *   - une seule résidence active (HOME-R01) ; les droits gagnés ailleurs restent ;
 *   - respect local 0–100 par communauté (HOME-R02), seuils habiter /
 *     aménager / recevoir propres à chaque maison ;
 *   - mission de seuil réelle, échec ou abandon ne comptent pas (HOME-R03) ;
 *   - rang minimal et accès réel à la région évalués ensemble (HOME-R04) ;
 *   - déménagement : choisir, emballer, transporter ; chaque bien garde un seul
 *     emplacement ; l'activation se confirme au seuil de la nouvelle maison ;
 *     l'ancienne devient inactive seulement à ce moment (HOME-R05, R01, E20) ;
 *   - une reprise de sauvegarde ne crée ni objet doublé ni seconde maison
 *     active (HOME-R24, QA5-05).
 *
 * Choix du jeu marqués « proposé » (le classeur ne les chiffre pas) :
 *   - gain de respect : +5 par action visible du territoire, une fois par
 *     sortie et par action, pour chaque communauté de la région ; +10 pour la
 *     communauté dont la mission de seuil est vérifiée ;
 *   - la mission de seuil se joue sur les actions réelles de la sortie de
 *     région V68 (relevés, balises, coffret, rapport) selon le type de
 *     territoire, toutes dans la même sortie, après l'acceptation ;
 *   - maison 1 de la région → « Demeure 1 » du village, maison 2 → « Demeure 2 » ;
 *   - emplacements des pièces (arrivée, mémoire, coffre, établi, exposition).
 */
import source from "../data/residencesV149.json" with { type: "json" };

export type ResidenceRankV149 = "unblooded" | "young-blood" | "blooded" | "elite";
export type ResidenceProofActionV149 = "survey" | "track" | "recover" | "ward" | "challenge" | "report";

export interface ResidenceHouseV149 {
  id: string;
  title: string;
  communityId: string;
  clanId: string;
  regionId: string;
  minimumRank: ResidenceRankV149;
  respect: { inhabit: number; furnish: number; receive: number };
  mission: { title: string; actions: string; choices: string[]; choiceText: string };
  plan: string;
  witnesses: string;
  ownership: string;
  sourceRow: number;
}
export interface ResidenceRoomV149 {
  id: string; title: string; houseId: string; location: string; access: string;
  interactions: string; equipment: string; constraint: string; sourceRow: number;
}
export interface ResidenceSceneV149 {
  id: string; title: string; houseId: string; trigger: string; sequence: string;
  choices: string; consequence: string; sourceRow: number;
}

export const RESIDENCE_HOUSES_V149 = source.houses as ResidenceHouseV149[];
export const RESIDENCE_ROOMS_V149 = source.rooms as ResidenceRoomV149[];
export const RESIDENCE_SCENES_V149 = source.scenes as ResidenceSceneV149[];
export const RESIDENCE_SOURCE_V149 = source.source;

export const houseV149 = (id: unknown): ResidenceHouseV149 | null =>
  RESIDENCE_HOUSES_V149.find(house => house.id === id) ?? null;
export const roomsForHouseV149 = (houseId: string): ResidenceRoomV149[] =>
  RESIDENCE_ROOMS_V149.filter(room => room.houseId === houseId);
export const scenesForHouseV149 = (houseId: string): ResidenceSceneV149[] =>
  RESIDENCE_SCENES_V149.filter(scene => scene.houseId === houseId);

// ---------------------------------------------------------------------------
// Place in the world (proposé)
// ---------------------------------------------------------------------------

const RANK_ORDER_V149: readonly ResidenceRankV149[] = ["unblooded", "young-blood", "blooded", "elite"];
/** Profile ranks start at Young Blood; Unblooded houses are open to every profile rank. */
export function rankAtLeastV149(rank: string, minimum: ResidenceRankV149): boolean {
  const have = RANK_ORDER_V149.indexOf(rank as ResidenceRankV149);
  const need = RANK_ORDER_V149.indexOf(minimum);
  const elderOrAbove = rank === "elder";
  return elderOrAbove || (have >= 0 && have >= need);
}

/** Demeure building of the region village that holds this house (proposé). */
export function houseBuildingIdV149(house: ResidenceHouseV149): string {
  const regionHouses = RESIDENCE_HOUSES_V149.filter(entry => entry.regionId === house.regionId);
  return `house-n-${Math.max(0, regionHouses.findIndex(entry => entry.id === house.id))}`;
}
export function houseForBuildingV149(regionId: string, buildingId: string | null | undefined): ResidenceHouseV149 | null {
  if (!buildingId) return null;
  return RESIDENCE_HOUSES_V149.find(house => house.regionId === regionId && houseBuildingIdV149(house) === buildingId) ?? null;
}

const WARD_REGIONS = ["pillar-jungle", "luminous-marshes", "storm-chain"];
const SURVEY_REGIONS = ["thermal-caves", "first-city-ruins", "forbidden-reserve"];
/**
 * Field actions of one region run that stand for the house's threshold
 * mission (proposé). Every list ends with the report: the witnesses verify the
 * result before the key is handed over (HOME-R03).
 */
export function houseMissionActionsV149(house: ResidenceHouseV149): ResidenceProofActionV149[] {
  if (WARD_REGIONS.includes(house.regionId)) return ["ward", "recover", "report"];
  if (SURVEY_REGIONS.includes(house.regionId)) return ["survey", "recover", "report"];
  return ["recover", "report"];
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

export const RESIDENCE_VERSION_V149 = 1 as const;
export const RESPECT_PER_ACTION_V149 = 5;
export const RESPECT_FOR_MISSION_V149 = 10;
const MAX_RECEIPTS = 600;
const MAX_OBJECTS = 200;

export type ResidenceSlotIdV149 = "arrival" | "memory-1" | "memory-2" | "chest" | "bench" | "display";
/** Room suffix (P1/P2/P3) → slots and the right each slot needs (proposé from the room texts). */
export const RESIDENCE_SLOTS_V149: Readonly<Record<ResidenceSlotIdV149, { room: "P1" | "P2" | "P3"; label: string; capacity: number; right: "inhabit" | "furnish" }>> = {
  arrival: { room: "P1", label: "Place du contenant arrivé", capacity: 1, right: "inhabit" },
  "memory-1": { room: "P2", label: "Emplacement de mémoire 1", capacity: 1, right: "inhabit" },
  "memory-2": { room: "P2", label: "Emplacement de mémoire 2", capacity: 1, right: "inhabit" },
  chest: { room: "P2", label: "Coffre personnel", capacity: Infinity, right: "inhabit" },
  bench: { room: "P3", label: "Établi local", capacity: 1, right: "inhabit" },
  display: { room: "P3", label: "Meuble d’exposition", capacity: 1, right: "furnish" },
};
export const RESIDENCE_SLOT_IDS_V149 = Object.keys(RESIDENCE_SLOTS_V149) as ResidenceSlotIdV149[];

export type ResidenceLocationV149 =
  | { kind: "carried" }
  | { kind: "room"; houseId: string; slotId: ResidenceSlotIdV149 }
  | { kind: "transfer"; returnTo: { houseId: string; slotId: ResidenceSlotIdV149 } };

export interface ResidenceObjectV149 {
  /** Unique original (HOME-R09): one id, one owner, one location. */
  id: string;
  label: string;
  origin: string;
  location: ResidenceLocationV149;
}
export interface ResidenceMissionV149 {
  status: "active" | "completed";
  /** Run in which the current attempt is played; actions from another run do not add up. */
  runId: string | null;
  done: ResidenceProofActionV149[];
  /** Index in house.mission.choices, chosen when the key is handed over. */
  choice: number | null;
}
export interface ResidenceTransferV149 {
  fromHouseId: string;
  toHouseId: string;
  stage: "packing" | "in-transit";
}
export interface ResidenceStateV149 {
  version: typeof RESIDENCE_VERSION_V149;
  respect: Record<string, number>;
  respectReceipts: string[];
  missions: Record<string, ResidenceMissionV149>;
  /** Residence rights earned (mission verified and route chosen). Never removed by a move. */
  rights: string[];
  activeResidenceId: string | null;
  objects: ResidenceObjectV149[];
  transfer: ResidenceTransferV149 | null;
  /** P2 sleeping place chosen from the two fixed positions (0/1), per house. */
  bed: Record<string, 0 | 1>;
}

export const emptyResidenceV149 = (): ResidenceStateV149 => ({
  version: 1, respect: {}, respectReceipts: [], missions: {}, rights: [], activeResidenceId: null,
  objects: [], transfer: null, bed: {},
});

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const PROOF_ACTIONS: readonly ResidenceProofActionV149[] = ["survey", "track", "recover", "ward", "challenge", "report"];

export function isFutureResidenceV149(raw: unknown): boolean {
  return isRecord(raw) && typeof raw.version === "number" && raw.version > RESIDENCE_VERSION_V149;
}

function normalizeLocation(raw: unknown): ResidenceLocationV149 | null {
  if (!isRecord(raw)) return null;
  const slot = (value: unknown): value is ResidenceSlotIdV149 => typeof value === "string" && value in RESIDENCE_SLOTS_V149;
  if (raw.kind === "carried") return { kind: "carried" };
  if (raw.kind === "room" && houseV149(raw.houseId) && slot(raw.slotId)) return { kind: "room", houseId: String(raw.houseId), slotId: raw.slotId };
  if (raw.kind === "transfer" && isRecord(raw.returnTo) && houseV149(raw.returnTo.houseId) && slot(raw.returnTo.slotId))
    return { kind: "transfer", returnTo: { houseId: String(raw.returnTo.houseId), slotId: raw.returnTo.slotId } };
  return null;
}

/** Tolerant reader: unknown entries are dropped, never invented. Null for a future version. */
export function normalizeResidenceV149(raw: unknown): ResidenceStateV149 | null {
  if (!isRecord(raw)) return null;
  if (isFutureResidenceV149(raw)) return null;
  const state = emptyResidenceV149();
  if (isRecord(raw.respect)) for (const [id, value] of Object.entries(raw.respect)) {
    if (RESIDENCE_HOUSES_V149.some(house => house.communityId === id) && typeof value === "number" && Number.isFinite(value))
      state.respect[id] = Math.max(0, Math.min(100, Math.round(value)));
  }
  if (Array.isArray(raw.respectReceipts))
    state.respectReceipts = [...new Set(raw.respectReceipts.filter((r): r is string => typeof r === "string" && r.length <= 200))].slice(-MAX_RECEIPTS);
  if (isRecord(raw.missions)) for (const [id, value] of Object.entries(raw.missions)) {
    const house = houseV149(id);
    if (!house || !isRecord(value) || (value.status !== "active" && value.status !== "completed")) continue;
    const done = Array.isArray(value.done) ? [...new Set(value.done.filter((a): a is ResidenceProofActionV149 =>
      PROOF_ACTIONS.includes(a as ResidenceProofActionV149) && (a !== "report" || value.status === "completed")))] : [];
    const choice = typeof value.choice === "number" && Number.isInteger(value.choice) && value.choice >= 0 && value.choice < house.mission.choices.length ? value.choice : null;
    state.missions[id] = { status: value.status, runId: typeof value.runId === "string" ? value.runId : null, done, choice };
  }
  if (Array.isArray(raw.rights))
    state.rights = [...new Set(raw.rights.filter(id => houseV149(id) && state.missions[String(id)]?.status === "completed"
      && state.missions[String(id)]?.choice !== null))] as string[];
  if (typeof raw.activeResidenceId === "string" && state.rights.includes(raw.activeResidenceId)) state.activeResidenceId = raw.activeResidenceId;
  if (Array.isArray(raw.objects)) {
    const seen = new Set<string>();
    for (const entry of raw.objects.slice(0, MAX_OBJECTS)) {
      if (!isRecord(entry) || typeof entry.id !== "string" || seen.has(entry.id) || typeof entry.label !== "string") continue;
      const location = normalizeLocation(entry.location);
      if (!location) continue;
      seen.add(entry.id);
      state.objects.push({ id: entry.id, label: entry.label, origin: typeof entry.origin === "string" ? entry.origin : "", location });
    }
  }
  if (isRecord(raw.transfer) && state.activeResidenceId && raw.transfer.fromHouseId === state.activeResidenceId &&
      typeof raw.transfer.toHouseId === "string" && state.rights.includes(raw.transfer.toHouseId) &&
      raw.transfer.toHouseId !== state.activeResidenceId && (raw.transfer.stage === "packing" || raw.transfer.stage === "in-transit"))
    state.transfer = { fromHouseId: state.activeResidenceId, toHouseId: raw.transfer.toHouseId, stage: raw.transfer.stage };
  // Without a transfer, a packed object goes back to its recorded place (never lost, never doubled).
  if (!state.transfer) state.objects = state.objects.map(object => object.location.kind === "transfer"
    ? { ...object, location: { kind: "room", ...object.location.returnTo } } : object);
  if (isRecord(raw.bed)) for (const [id, value] of Object.entries(raw.bed))
    if (houseV149(id) && (value === 0 || value === 1)) state.bed[id] = value;
  return state;
}

// ---------------------------------------------------------------------------
// Rights
// ---------------------------------------------------------------------------

export interface ResidenceContextV149 {
  rankId: string;
  /** Real access to the region now (canEnterHomeworldRegionV68). */
  regionAllowed(regionId: string): boolean;
  /** House whose interior the player stands in, if any. */
  atHouseId: string | null;
}

export interface ResidenceAccessV149 {
  rank: boolean;
  region: boolean;
  respect: number;
  mission: "none" | "active" | "completed";
  right: boolean;
  inhabit: boolean;
  furnish: boolean;
  receive: boolean;
  active: boolean;
  missing: string[];
}

export function respectForV149(state: ResidenceStateV149, communityId: string): number {
  return state.respect[communityId] ?? 0;
}

/** Same reading as the workbook's « Simuler Résidence » sheet. */
export function residenceAccessV149(state: ResidenceStateV149, houseId: string, context: ResidenceContextV149): ResidenceAccessV149 {
  const house = houseV149(houseId);
  if (!house) return { rank: false, region: false, respect: 0, mission: "none", right: false, inhabit: false, furnish: false, receive: false, active: false, missing: ["Maison inconnue."] };
  const rank = rankAtLeastV149(context.rankId, house.minimumRank);
  const region = context.regionAllowed(house.regionId);
  const respect = respectForV149(state, house.communityId);
  const mission = state.missions[house.id]?.status ?? "none";
  const right = state.rights.includes(house.id);
  const active = state.activeResidenceId === house.id;
  const inhabit = rank && region && respect >= house.respect.inhabit && right;
  const missing: string[] = [];
  if (!rank) missing.push(`Rang minimal : ${house.minimumRank}.`);
  if (!region) missing.push("Accès réel à la région requis.");
  if (respect < house.respect.inhabit) missing.push(`Respect pour habiter : ${respect}/${house.respect.inhabit}.`);
  if (mission !== "completed") missing.push(`Mission de seuil : ${house.mission.title}.`);
  else if (!right) missing.push("Choisir l’itinéraire que le quartier conservera.");
  return { rank, region, respect, mission, right, inhabit, missing, active,
    furnish: inhabit && active && respect >= house.respect.furnish,
    receive: inhabit && active && respect >= house.respect.receive };
}

// ---------------------------------------------------------------------------
// Changes
// ---------------------------------------------------------------------------

export type ResidenceChangeV149 = { ok: true; state: ResidenceStateV149; message: string } | { ok: false; reason: string };
const refuse = (reason: string): ResidenceChangeV149 => ({ ok: false, reason });
const clone = (state: ResidenceStateV149): ResidenceStateV149 => structuredClone(state);

export const CM07_LAMP_ID_V149 = "HOME-CM07:lampe-du-passeur";
export const TRAVEL_CONTAINER_ID_V149 = "residence:contenant-de-voyage";

/** Accept the threshold mission, at the house itself. */
export function acceptHouseMissionV149(current: ResidenceStateV149, houseId: string, context: ResidenceContextV149): ResidenceChangeV149 {
  const house = houseV149(houseId);
  if (!house) return refuse("Maison inconnue.");
  if (context.atHouseId !== house.id) return refuse("La mission se reçoit sur place, devant la maison.");
  if (!rankAtLeastV149(context.rankId, house.minimumRank)) return refuse("Rang insuffisant pour cette demeure.");
  if (!context.regionAllowed(house.regionId)) return refuse("Cette région n’est pas accessible.");
  if (current.missions[house.id]) return refuse(current.missions[house.id].status === "completed" ? "Mission déjà vérifiée." : "Mission déjà en cours.");
  const state = clone(current);
  state.missions[house.id] = { status: "active", runId: null, done: [], choice: null };
  return { ok: true, state, message: `${house.mission.title} : ${house.mission.actions}` };
}

export interface ResidenceFieldEventV149 { regionId: string; runId: string; action: string }

/**
 * Records one acknowledged field event of a region run: local respect for the
 * region's communities and progress of active missions in that region.
 */
export function recordResidenceFieldEventV149(current: ResidenceStateV149, event: ResidenceFieldEventV149): { state: ResidenceStateV149; completed: string[] } {
  const action = event.action as ResidenceProofActionV149;
  if (!PROOF_ACTIONS.includes(action) || typeof event.runId !== "string" || !event.runId) return { state: current, completed: [] };
  const regionHouses = RESIDENCE_HOUSES_V149.filter(house => house.regionId === event.regionId);
  if (regionHouses.length === 0) return { state: current, completed: [] };
  const state = clone(current);
  const receipt = `${event.runId}:${action}`;
  if (!state.respectReceipts.includes(receipt)) {
    state.respectReceipts = [...state.respectReceipts, receipt].slice(-MAX_RECEIPTS);
    for (const community of new Set(regionHouses.map(house => house.communityId)))
      state.respect[community] = Math.min(100, respectForV149(state, community) + RESPECT_PER_ACTION_V149);
  }
  const completed: string[] = [];
  for (const house of regionHouses) {
    const mission = state.missions[house.id];
    if (!mission || mission.status !== "active") continue;
    if (mission.runId !== event.runId) { mission.runId = event.runId; mission.done = []; }
    const required = houseMissionActionsV149(house);
    if (action !== "report") {
      if (!mission.done.includes(action)) mission.done.push(action);
      continue;
    }
    if (required.every(entry => entry === "report" || mission.done.includes(entry))) {
      if (!mission.done.includes("report")) mission.done.push("report");
      mission.status = "completed";
      state.respect[house.communityId] = Math.min(100, respectForV149(state, house.communityId) + RESPECT_FOR_MISSION_V149);
      completed.push(house.id);
      // « récupérer une lampe sur un îlot accessible » : the lamp is an original (S2).
      if (house.id === "HOME-CM07" && !state.objects.some(object => object.id === CM07_LAMP_ID_V149))
        state.objects.push({ id: CM07_LAMP_ID_V149, label: "Lampe du passeur", origin: "HOME-CM07 · Trois appuis avant la crue", location: { kind: "carried" } });
    }
  }
  return { state, completed };
}

/** The key is handed over after verification; the quarter keeps the chosen route. */
export function chooseHouseRouteV149(current: ResidenceStateV149, houseId: string, choice: number, context: ResidenceContextV149): ResidenceChangeV149 {
  const house = houseV149(houseId);
  if (!house) return refuse("Maison inconnue.");
  if (context.atHouseId !== house.id) return refuse("La clé se remet sur place.");
  const mission = current.missions[house.id];
  if (!mission || mission.status !== "completed") return refuse("La mission de seuil n’est pas vérifiée.");
  if (mission.choice !== null) return refuse("Le quartier a déjà retenu un itinéraire.");
  if (!Number.isInteger(choice) || choice < 0 || choice >= house.mission.choices.length) return refuse("Choix inconnu.");
  const state = clone(current);
  state.missions[house.id].choice = choice;
  state.rights = [...new Set([...state.rights, house.id])];
  return { ok: true, state, message: `${house.witnesses} : « ${house.mission.choices[choice]} ». Droit local de résidence remis.` };
}

const slotOccupants = (state: ResidenceStateV149, houseId: string, slotId: ResidenceSlotIdV149) =>
  state.objects.filter(object => object.location.kind === "room" && object.location.houseId === houseId && object.location.slotId === slotId);

/** First residence: activation at the threshold (HOME-R01, HOME-E01). */
export function activateFirstResidenceV149(current: ResidenceStateV149, houseId: string, context: ResidenceContextV149): ResidenceChangeV149 {
  const house = houseV149(houseId);
  if (!house) return refuse("Maison inconnue.");
  if (current.activeResidenceId) return refuse("Une résidence est déjà active : un transfert confirmé est nécessaire.");
  if (context.atHouseId !== house.id) return refuse("L’activation se confirme au seuil de la maison.");
  const access = residenceAccessV149(current, house.id, context);
  if (!access.inhabit) return refuse(access.missing.join(" "));
  const state = clone(current);
  state.activeResidenceId = house.id;
  if (!state.objects.some(object => object.id === TRAVEL_CONTAINER_ID_V149))
    state.objects.push({ id: TRAVEL_CONTAINER_ID_V149, label: "Contenant de voyage", origin: "Premier soir au seuil", location: { kind: "room", houseId: house.id, slotId: "arrival" } });
  // Originals carried in arrive in the personal chest.
  state.objects = state.objects.map(object => object.location.kind === "carried"
    ? { ...object, location: { kind: "room", houseId: house.id, slotId: "chest" } } : object);
  return { ok: true, state, message: `${house.title} est ta résidence active.` };
}

/** Place an original in a slot of the active house (one location per original). */
export function placeObjectV149(current: ResidenceStateV149, objectId: string, slotId: ResidenceSlotIdV149, context: ResidenceContextV149): ResidenceChangeV149 {
  const houseId = current.activeResidenceId;
  if (!houseId) return refuse("Aucune résidence active.");
  if (context.atHouseId !== houseId) return refuse("Les objets se placent sur place.");
  if (current.transfer) return refuse("Un déménagement est en cours.");
  const slot = RESIDENCE_SLOTS_V149[slotId];
  if (!slot) return refuse("Emplacement inconnu.");
  const object = current.objects.find(entry => entry.id === objectId);
  if (!object) return refuse("Objet inconnu.");
  if (object.location.kind !== "room" && object.location.kind !== "carried") return refuse("Cet objet est emballé.");
  if (object.location.kind === "room" && object.location.houseId !== houseId) return refuse("Cet objet est resté dans une autre maison.");
  const access = residenceAccessV149(current, houseId, context);
  if (slot.right === "furnish" ? !access.furnish : !access.inhabit) {
    const house = houseV149(houseId)!;
    return refuse(slot.right === "furnish" ? `Respect pour aménager requis : ${access.respect}/${house.respect.furnish}.` : access.missing.join(" "));
  }
  if (object.location.kind === "room" && object.location.slotId === slotId) return refuse("Déjà à cet emplacement.");
  if (slotOccupants(current, houseId, slotId).length >= slot.capacity) return refuse(`${slot.label} : déjà occupé.`);
  const state = clone(current);
  state.objects = state.objects.map(entry => entry.id === objectId ? { ...entry, location: { kind: "room", houseId, slotId } } : entry);
  return { ok: true, state, message: `${object.label} → ${slot.label}.` };
}

export function chooseBedPositionV149(current: ResidenceStateV149, position: 0 | 1, context: ResidenceContextV149): ResidenceChangeV149 {
  const houseId = current.activeResidenceId;
  if (!houseId || context.atHouseId !== houseId) return refuse("Choisis le couchage sur place, dans ta résidence active.");
  if (position !== 0 && position !== 1) return refuse("Position inconnue.");
  if (!residenceAccessV149(current, houseId, context).inhabit) return refuse("Droit d’habiter requis.");
  const state = clone(current);
  state.bed[houseId] = position;
  return { ok: true, state, message: position === 0 ? "Couchage près du mur intérieur." : "Couchage face à l’ouverture." };
}

// ---------------------------------------------------------------------------
// Move (HOME-R05, HOME-E20, TR-A084, QA5-05)
// ---------------------------------------------------------------------------

export function startTransferV149(current: ResidenceStateV149, toHouseId: string, context: ResidenceContextV149): ResidenceChangeV149 {
  const from = current.activeResidenceId;
  const house = houseV149(toHouseId);
  if (!from) return refuse("Aucune résidence active : l’installation se fait directement au seuil.");
  if (!house || house.id === from) return refuse("Choisis une autre maison.");
  if (current.transfer) return refuse("Un déménagement est déjà en cours.");
  if (context.atHouseId !== from) return refuse("Les caisses se préparent dans la maison que tu quittes.");
  if (!current.rights.includes(house.id)) return refuse(`Aucun droit de résidence à ${house.title}.`);
  const access = residenceAccessV149(current, house.id, context);
  if (!access.inhabit) return refuse(access.missing.join(" "));
  const state = clone(current);
  state.transfer = { fromHouseId: from, toHouseId: house.id, stage: "packing" };
  return { ok: true, state, message: `Déménagement vers ${house.title} : choisis et emballe les originaux.` };
}

/** One original joins the single transfer charge; it leaves its slot at once. */
export function packObjectV149(current: ResidenceStateV149, objectId: string, context: ResidenceContextV149): ResidenceChangeV149 {
  const transfer = current.transfer;
  if (!transfer || transfer.stage !== "packing") return refuse("Aucun emballage en cours.");
  if (context.atHouseId !== transfer.fromHouseId) return refuse("L’emballage se fait dans la maison que tu quittes.");
  const object = current.objects.find(entry => entry.id === objectId);
  if (!object || object.location.kind !== "room" || object.location.houseId !== transfer.fromHouseId) return refuse("Cet objet n’est pas dans la maison que tu quittes.");
  const state = clone(current);
  const returnTo = { houseId: object.location.houseId, slotId: object.location.slotId };
  state.objects = state.objects.map(entry => entry.id === objectId ? { ...entry, location: { kind: "transfer", returnTo } } : entry);
  return { ok: true, state, message: `${object.label} emballé dans la charge de transfert.` };
}

export function unpackObjectV149(current: ResidenceStateV149, objectId: string, context: ResidenceContextV149): ResidenceChangeV149 {
  const transfer = current.transfer;
  if (!transfer || transfer.stage !== "packing") return refuse("La charge est déjà partie.");
  if (context.atHouseId !== transfer.fromHouseId) return refuse("Le déballage se fait sur place.");
  const object = current.objects.find(entry => entry.id === objectId);
  if (!object || object.location.kind !== "transfer") return refuse("Cet objet n’est pas emballé.");
  const back = object.location.returnTo;
  const state = clone(current);
  const occupied = slotOccupants(state, back.houseId, back.slotId).length >= RESIDENCE_SLOTS_V149[back.slotId].capacity;
  const slotId: ResidenceSlotIdV149 = occupied ? "chest" : back.slotId;
  state.objects = state.objects.map(entry => entry.id === objectId ? { ...entry, location: { kind: "room", houseId: back.houseId, slotId } } : entry);
  return { ok: true, state, message: `${object.label} reprend sa place.` };
}

/** Last departure confirmed: the charge travels; the old house stays active until arrival. */
export function confirmDepartureV149(current: ResidenceStateV149, context: ResidenceContextV149): ResidenceChangeV149 {
  const transfer = current.transfer;
  if (!transfer || transfer.stage !== "packing") return refuse("Aucun départ à confirmer.");
  if (context.atHouseId !== transfer.fromHouseId) return refuse("Le dernier départ se confirme au seuil.");
  const state = clone(current);
  state.transfer = { ...transfer, stage: "in-transit" };
  const count = state.objects.filter(object => object.location.kind === "transfer").length;
  return { ok: true, state, message: `Départ confirmé : ${count} original(aux) dans la charge de transfert.` };
}

/** Before departure the move can be abandoned: every packed original returns to its place. */
export function cancelTransferV149(current: ResidenceStateV149, context: ResidenceContextV149): ResidenceChangeV149 {
  const transfer = current.transfer;
  if (!transfer) return refuse("Aucun déménagement en cours.");
  if (transfer.stage !== "packing") return refuse("La charge est en route : termine l’arrivée au seuil de la nouvelle maison.");
  if (context.atHouseId !== transfer.fromHouseId) return refuse("L’annulation se fait sur place.");
  let state = clone(current);
  for (const object of current.objects.filter(entry => entry.location.kind === "transfer")) {
    const result = unpackObjectV149(state, object.id, context);
    if (result.ok) state = result.state;
  }
  state.transfer = null;
  return { ok: true, state, message: "Déménagement annulé ; la résidence et les biens restent en place." };
}

/** Arrival at the new threshold: activation, unpacking, old address inactive (HOME-R01, E20). */
export function confirmArrivalV149(current: ResidenceStateV149, context: ResidenceContextV149): ResidenceChangeV149 {
  const transfer = current.transfer;
  if (!transfer || transfer.stage !== "in-transit") return refuse("Aucune charge en route.");
  if (context.atHouseId !== transfer.toHouseId) return refuse("L’arrivée se confirme au seuil de la nouvelle maison.");
  const access = residenceAccessV149(current, transfer.toHouseId, context);
  if (!access.inhabit) return refuse(access.missing.join(" "));
  const state = clone(current);
  let arrivalFree = slotOccupants(state, transfer.toHouseId, "arrival").length === 0;
  state.objects = state.objects.map(object => {
    if (object.location.kind !== "transfer") return object;
    const slotId: ResidenceSlotIdV149 = arrivalFree ? "arrival" : "chest";
    arrivalFree = false;
    return { ...object, location: { kind: "room", houseId: transfer.toHouseId, slotId } };
  });
  state.activeResidenceId = transfer.toHouseId;
  state.transfer = null;
  return { ok: true, state, message: `${houseV149(transfer.toHouseId)!.title} est ta résidence active. ${houseV149(transfer.fromHouseId)!.title} garde ses pièces et ton droit de retour.` };
}

// ---------------------------------------------------------------------------
// Reading helpers
// ---------------------------------------------------------------------------

export function objectsInHouseV149(state: ResidenceStateV149, houseId: string): ResidenceObjectV149[] {
  return state.objects.filter(object => object.location.kind === "room" && object.location.houseId === houseId);
}
export function packedObjectsV149(state: ResidenceStateV149): ResidenceObjectV149[] {
  return state.objects.filter(object => object.location.kind === "transfer");
}
/** Scenes of the house the state allows now (S1 active + mission, S2 at furnish, S3 at receive). */
export function availableScenesV149(state: ResidenceStateV149, houseId: string, context: ResidenceContextV149): ResidenceSceneV149[] {
  const access = residenceAccessV149(state, houseId, context);
  if (!access.active || !access.inhabit) return [];
  return scenesForHouseV149(houseId).filter(scene => scene.id.endsWith("-S1") || (scene.id.endsWith("-S2") && access.furnish) || (scene.id.endsWith("-S3") && access.receive));
}

// ---------------------------------------------------------------------------
// One entry point for the interface
// ---------------------------------------------------------------------------

export type ResidenceActionV149 =
  | { kind: "accept" }
  | { kind: "route"; choice: number }
  | { kind: "activate" }
  | { kind: "place"; objectId: string; slotId: ResidenceSlotIdV149 }
  | { kind: "bed"; position: 0 | 1 }
  | { kind: "start-transfer"; toHouseId: string }
  | { kind: "pack"; objectId: string }
  | { kind: "unpack"; objectId: string }
  | { kind: "depart" }
  | { kind: "arrive" }
  | { kind: "cancel-transfer" };

/** `houseId` is the house the panel shows (the one the player stands in). */
export function applyResidenceActionV149(current: ResidenceStateV149, houseId: string, action: ResidenceActionV149, context: ResidenceContextV149): ResidenceChangeV149 {
  switch (action.kind) {
    case "accept": return acceptHouseMissionV149(current, houseId, context);
    case "route": return chooseHouseRouteV149(current, houseId, action.choice, context);
    case "activate": return activateFirstResidenceV149(current, houseId, context);
    case "place": return placeObjectV149(current, action.objectId, action.slotId, context);
    case "bed": return chooseBedPositionV149(current, action.position, context);
    case "start-transfer": return startTransferV149(current, action.toHouseId, context);
    case "pack": return packObjectV149(current, action.objectId, context);
    case "unpack": return unpackObjectV149(current, action.objectId, context);
    case "depart": return confirmDepartureV149(current, context);
    case "arrive": return confirmArrivalV149(current, context);
    case "cancel-transfer": return cancelTransferV149(current, context);
    default: return refuse("Action inconnue.");
  }
}
