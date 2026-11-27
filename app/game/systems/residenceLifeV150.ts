/**
 * V150 — Vie domestique (BUILD5-08, classeur V6 « Maison et clan »).
 *
 * Critère du lot : « Un invité arrive et repart par une route réelle. »
 * Sources : HOME-R06 (maison inactive), R08 (les scènes de visite utilisent
 * les mêmes passages que le joueur), R11 (droit de recevoir), R16 (visiteurs
 * persistants, rendez-vous annoncé), R17 (absence longue : temps piloté par
 * les événements de partie), R19 (le visiteur choisit une place accessible et
 * annonce son départ ; il ne devient pas occupant), R21 (incidents sur des
 * pièces identifiées) et les événements HOME-E01 à E24.
 *
 * Choix du jeu « proposé » :
 *   - les invités sont les habitants nommés du village (pisteur, artisane,
 *     soigneuse, gardienne des récits) ; les témoins de la bible (charpentière,
 *     passeur…) n'existent pas encore comme personnages ;
 *   - la route est calculée sur le sol réel du village (grille de 60 unités,
 *     même test de passage que le joueur), du lieu de l'habitant au seuil de
 *     la Demeure, puis parcourue dans l'autre sens au départ ;
 *   - vitesse 70 unités/s, visite de 30 s dans la maison, une visite à la fois
 *     (deux invités à partir du seuil « recevoir », HOME-E10) ;
 *   - l'absence se compte en sorties de région faites ailleurs : trois sorties
 *     sans revenir laissent une marque au seuil (poussière stylisée, R17).
 */
import {
  HOMEWORLD_REGIONS_V68, HOMEWORLD_VILLAGE_WORLD_V68, isHomeworldRegionWalkableV68, regionResidentPositionV68,
  type HomeworldRegionIdV68, type RegionResidentV68,
} from "./homeworldRegionsV68";
import { homeworldBuildingDoorwayV64 } from "./homeworldGeometryV64";
import {
  houseBuildingIdV149, houseV149, residenceAccessV149, type ResidenceContextV149, type ResidenceStateV149,
} from "./residenceV149";

type Point = { x: number; y: number };

// ---------------------------------------------------------------------------
// Real route on the village floor
// ---------------------------------------------------------------------------

export const GUEST_GRID_V150 = 60;
const SAMPLE_STEP = 20;

const walkable = (regionId: HomeworldRegionIdV68, point: Point) => isHomeworldRegionWalkableV68(regionId, "village", point, 0, null);

/** Every point of the segment is walkable for an actor of the player's size. */
export function segmentWalkableV150(regionId: HomeworldRegionIdV68, a: Point, b: Point): boolean {
  const steps = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / SAMPLE_STEP));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    if (!walkable(regionId, { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t })) return false;
  }
  return true;
}

const routeCache = new Map<string, Point[] | null>();

/**
 * Shortest walkable path (A* on a 60-unit grid, then shortened where a
 * straight segment stays walkable). Null when no route exists.
 */
export function planVillageRouteV150(regionId: HomeworldRegionIdV68, from: Point, to: Point): Point[] | null {
  const key = `${regionId}:${Math.round(from.x)},${Math.round(from.y)}>${Math.round(to.x)},${Math.round(to.y)}`;
  if (routeCache.has(key)) return routeCache.get(key)!;
  const done = (route: Point[] | null) => { routeCache.set(key, route); return route; };
  if (!walkable(regionId, from) || !walkable(regionId, to)) return done(null);
  if (segmentWalkableV150(regionId, from, to)) return done([from, to]);
  const g = GUEST_GRID_V150, cols = Math.ceil(HOMEWORLD_VILLAGE_WORLD_V68.width / g), rows = Math.ceil(HOMEWORLD_VILLAGE_WORLD_V68.depth / g);
  const cell = (p: Point) => ({ c: Math.max(0, Math.min(cols - 1, Math.round(p.x / g))), r: Math.max(0, Math.min(rows - 1, Math.round(p.y / g))) });
  const center = (c: number, r: number): Point => ({ x: c * g, y: r * g });
  const open = new Map<number, number>(), cost = new Map<number, number>(), parent = new Map<number, number>();
  const id = (c: number, r: number) => r * cols + c;
  const okCell = new Map<number, boolean>();
  const isOk = (c: number, r: number) => { const k = id(c, r); if (!okCell.has(k)) okCell.set(k, walkable(regionId, center(c, r))); return okCell.get(k)!; };
  // Start/goal: nearest walkable cells reachable in a straight line from the real points.
  const nearest = (p: Point) => {
    const base = cell(p);
    let best: { c: number; r: number; d: number } | null = null;
    for (let dr = -3; dr <= 3; dr++) for (let dc = -3; dc <= 3; dc++) {
      const c = base.c + dc, r = base.r + dr;
      if (c < 0 || r < 0 || c >= cols || r >= rows || !isOk(c, r) || !segmentWalkableV150(regionId, p, center(c, r))) continue;
      const d = Math.hypot(center(c, r).x - p.x, center(c, r).y - p.y);
      if (!best || d < best.d) best = { c, r, d };
    }
    return best;
  };
  const start = nearest(from), goal = nearest(to);
  if (!start || !goal) return done(null);
  const h = (c: number, r: number) => Math.hypot(c - goal.c, r - goal.r);
  const s = id(start.c, start.r), t = id(goal.c, goal.r);
  cost.set(s, 0); open.set(s, h(start.c, start.r));
  let found = false;
  for (let guard = 0; open.size && guard < cols * rows; guard++) {
    let current = -1, best = Infinity;
    for (const [k, f] of open) if (f < best) { best = f; current = k; }
    open.delete(current);
    if (current === t) { found = true; break; }
    const c = current % cols, r = Math.floor(current / cols);
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      const nc = c + dc, nr = r + dr;
      if (nc < 0 || nr < 0 || nc >= cols || nr >= rows || !isOk(nc, nr)) continue;
      if (dc && dr && (!isOk(c + dc, r) || !isOk(c, r + dr))) continue;
      const k = id(nc, nr), next = cost.get(current)! + Math.hypot(dc, dr);
      if (next < (cost.get(k) ?? Infinity)) { cost.set(k, next); parent.set(k, current); open.set(k, next + h(nc, nr)); }
    }
  }
  if (!found) return done(null);
  const cells: Point[] = [];
  for (let k = t; ; k = parent.get(k)!) { cells.unshift(center(k % cols, Math.floor(k / cols))); if (k === s) break; }
  const raw = [from, ...cells, to];
  // Shorten: keep a point only when the straight line to a later one is blocked.
  const route: Point[] = [raw[0]];
  let i = 0;
  while (i < raw.length - 1) {
    let j = raw.length - 1;
    while (j > i + 1 && !segmentWalkableV150(regionId, raw[i], raw[j])) j--;
    route.push(raw[j]);
    i = j;
  }
  return done(route);
}

export function routeLengthV150(route: readonly Point[]): number {
  let length = 0;
  for (let i = 1; i < route.length; i++) length += Math.hypot(route[i].x - route[i - 1].x, route[i].y - route[i - 1].y);
  return length;
}
export function pointAlongV150(route: readonly Point[], distance: number): Point {
  let left = Math.max(0, distance);
  for (let i = 1; i < route.length; i++) {
    const a = route[i - 1], b = route[i], d = Math.hypot(b.x - a.x, b.y - a.y);
    if (left <= d) return d === 0 ? { ...a } : { x: a.x + (b.x - a.x) * left / d, y: a.y + (b.y - a.y) * left / d };
    left -= d;
  }
  return { ...route[route.length - 1] };
}

// ---------------------------------------------------------------------------
// Guests
// ---------------------------------------------------------------------------

export const GUEST_IDS_V150 = ["guide", "artisan", "healer", "keeper"] as const;
export type GuestIdV150 = (typeof GUEST_IDS_V150)[number];
export const GUEST_SPEED_V150 = 70;
export const GUEST_STAY_SECONDS_V150 = 30;
/** Places a guest may take, in order of preference (R19: a free, accessible place). */
export const GUEST_PLACES_V150 = [
  { id: "threshold", label: "Banc du seuil", interior: { x: 300, y: 520 } },
  { id: "workshop", label: "Place près de l’établi", interior: { x: 540, y: 380 } },
] as const;
export type GuestPlaceIdV150 = (typeof GUEST_PLACES_V150)[number]["id"];

export function guestResidentV150(regionId: HomeworldRegionIdV68, guestId: string): RegionResidentV68 | null {
  return HOMEWORLD_REGIONS_V68[regionId]?.residents.find(resident => resident.id === guestId) ?? null;
}
export function houseDoorApproachV150(houseId: string): Point | null {
  const house = houseV149(houseId);
  if (!house) return null;
  const building = HOMEWORLD_REGIONS_V68[house.regionId as HomeworldRegionIdV68]?.buildings.find(b => b.id === houseBuildingIdV149(house));
  return building ? homeworldBuildingDoorwayV64(building).approach : null;
}
/**
 * Where the guest steps out from: its usual post, or the nearest walkable
 * point beside it (residents count as obstacles, including the guest itself).
 */
export function guestStartV150(regionId: HomeworldRegionIdV68, resident: RegionResidentV68): Point | null {
  const home = regionResidentPositionV68(resident, 0);
  if (walkable(regionId, home)) return home;
  for (let radius = 60; radius <= 240; radius += 30)
    for (let a = 0; a < 16; a++) {
      const p = { x: Math.round(home.x + Math.cos(a / 16 * Math.PI * 2) * radius), y: Math.round(home.y + Math.sin(a / 16 * Math.PI * 2) * radius) };
      if (walkable(regionId, p)) return p;
    }
  return null;
}
/** Real route from where the guest stands at home to the house's door. */
export function guestRouteV150(houseId: string, guestId: string): Point[] | null {
  const house = houseV149(houseId), resident = house ? guestResidentV150(house.regionId as HomeworldRegionIdV68, guestId) : null;
  const door = houseDoorApproachV150(houseId);
  if (!house || !resident || !door) return null;
  const start = guestStartV150(house.regionId as HomeworldRegionIdV68, resident);
  return start ? planVillageRouteV150(house.regionId as HomeworldRegionIdV68, start, door) : null;
}

export type VisitStageV150 = "invited" | "arriving" | "present" | "leaving" | "gone";
export interface VisitV150 {
  id: string;
  houseId: string;
  guestId: GuestIdV150;
  /** Region run in which the walk is played; null until the hunter is in the village. */
  runId: string | null;
  /** Region tick at which the guest leaves home. */
  startTick: number | null;
  place: GuestPlaceIdV150 | null;
  stage: "invited" | "under-way" | "done";
}

export interface VisitViewV150 {
  stage: VisitStageV150;
  position: Point | null;
  inside: boolean;
  remainingSeconds: number;
}

/** Stage and place of a visit at a given region tick (deterministic, no hidden clock). */
export function visitViewV150(visit: VisitV150, tick: number): VisitViewV150 {
  if (visit.stage === "done") return { stage: "gone", position: null, inside: false, remainingSeconds: 0 };
  const route = guestRouteV150(visit.houseId, visit.guestId);
  if (visit.stage === "invited" || visit.startTick === null || !route) return { stage: "invited", position: null, inside: false, remainingSeconds: 0 };
  const length = routeLengthV150(route), walk = length / GUEST_SPEED_V150;
  const t = Math.max(0, (tick - visit.startTick) / 60);
  if (t < walk) return { stage: "arriving", position: pointAlongV150(route, t * GUEST_SPEED_V150), inside: false, remainingSeconds: walk - t };
  if (t < walk + GUEST_STAY_SECONDS_V150) return { stage: "present", position: null, inside: true, remainingSeconds: walk + GUEST_STAY_SECONDS_V150 - t };
  const back = t - walk - GUEST_STAY_SECONDS_V150;
  if (back < walk) return { stage: "leaving", position: pointAlongV150(route, length - back * GUEST_SPEED_V150), inside: false, remainingSeconds: walk - back };
  return { stage: "gone", position: null, inside: false, remainingSeconds: 0 };
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

export type RoomConditionV150 = "ordered" | "dusty" | "disturbed";
export interface ResidenceLifeV150 {
  version: 1;
  visits: VisitV150[];
  /** Region runs played since the hunter was last at each house (R17). */
  absence: Record<string, { runs: string[] }>;
  /** House threshold state; the mark is read on return (R17). */
  rooms: Record<string, { threshold: RoomConditionV150; note: string | null }>;
  /** Reminder (HOME-E…) ids already read. */
  read: string[];
  /** Visits completed, newest last (kept short). */
  history: { houseId: string; guestId: GuestIdV150; place: GuestPlaceIdV150 | null; runId: string }[];
}
export const emptyResidenceLifeV150 = (): ResidenceLifeV150 => ({ version: 1, visits: [], absence: {}, rooms: {}, read: [], history: [] });
export const ABSENCE_RUNS_V150 = 3;
const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
export const isFutureResidenceLifeV150 = (raw: unknown) => isRecord(raw) && typeof raw.version === "number" && raw.version > 1;

export function normalizeResidenceLifeV150(raw: unknown): ResidenceLifeV150 | null {
  if (!isRecord(raw) || isFutureResidenceLifeV150(raw)) return null;
  const state = emptyResidenceLifeV150();
  const guest = (v: unknown): v is GuestIdV150 => (GUEST_IDS_V150 as readonly unknown[]).includes(v);
  const place = (v: unknown): v is GuestPlaceIdV150 => GUEST_PLACES_V150.some(p => p.id === v);
  if (Array.isArray(raw.visits)) for (const v of raw.visits.slice(0, 4)) {
    if (!isRecord(v) || typeof v.id !== "string" || !houseV149(v.houseId) || !guest(v.guestId)) continue;
    if (v.stage !== "invited" && v.stage !== "under-way" && v.stage !== "done") continue;
    const underWay = v.stage === "under-way" && typeof v.runId === "string" && Number.isSafeInteger(v.startTick);
    state.visits.push({ id: v.id, houseId: String(v.houseId), guestId: v.guestId, place: place(v.place) ? v.place : null,
      stage: v.stage === "under-way" && !underWay ? "invited" : v.stage,
      runId: underWay ? String(v.runId) : null, startTick: underWay ? Number(v.startTick) : null });
  }
  if (isRecord(raw.absence)) for (const [id, v] of Object.entries(raw.absence))
    if (houseV149(id) && isRecord(v) && Array.isArray(v.runs)) state.absence[id] = { runs: [...new Set(v.runs.filter((r): r is string => typeof r === "string"))].slice(-10) };
  if (isRecord(raw.rooms)) for (const [id, v] of Object.entries(raw.rooms))
    if (houseV149(id) && isRecord(v) && ["ordered", "dusty", "disturbed"].includes(String(v.threshold)))
      state.rooms[id] = { threshold: v.threshold as RoomConditionV150, note: typeof v.note === "string" ? v.note.slice(0, 400) : null };
  if (Array.isArray(raw.read)) state.read = [...new Set(raw.read.filter((r): r is string => typeof r === "string"))].slice(-100);
  if (Array.isArray(raw.history)) for (const h of raw.history.slice(-20))
    if (isRecord(h) && houseV149(h.houseId) && guest(h.guestId) && typeof h.runId === "string")
      state.history.push({ houseId: String(h.houseId), guestId: h.guestId, place: place(h.place) ? h.place : null, runId: h.runId });
  return state;
}

export type LifeChangeV150 = { ok: true; state: ResidenceLifeV150; message: string } | { ok: false; reason: string };
const refuse = (reason: string): LifeChangeV150 => ({ ok: false, reason });

/** Invitation from the house (R16): a local rendezvous, never a new occupant. */
export function inviteGuestV150(life: ResidenceLifeV150, residence: ResidenceStateV149, guestId: string, context: ResidenceContextV149): LifeChangeV150 {
  const houseId = residence.activeResidenceId;
  if (!houseId || context.atHouseId !== houseId) return refuse("On invite depuis sa résidence active.");
  const access = residenceAccessV149(residence, houseId, context);
  if (!access.inhabit) return refuse("Droit d’habiter requis.");
  const house = houseV149(houseId)!;
  if (!(GUEST_IDS_V150 as readonly string[]).includes(guestId)) return refuse("Invité inconnu.");
  const resident = guestResidentV150(house.regionId as HomeworldRegionIdV68, guestId);
  if (!resident || !guestRouteV150(houseId, guestId)) return refuse("Aucun chemin praticable jusqu’à ta porte pour cet habitant.");
  const pending = life.visits.filter(v => v.houseId === houseId && v.stage !== "done");
  if (pending.some(v => v.guestId === guestId)) return refuse(`${resident.name} est déjà attendu.`);
  if (pending.length >= (access.receive ? 2 : 1)) return refuse(access.receive ? "Deux invités sont déjà attendus." : "Une visite à la fois tant que le seuil « recevoir » n’est pas atteint.");
  const state = structuredClone(life);
  state.visits = [...state.visits.filter(v => v.stage !== "done"), { id: `${houseId}:${guestId}:${life.history.length + pending.length}`, houseId, guestId: guestId as GuestIdV150, runId: null, startTick: null, place: null, stage: "invited" }];
  return { ok: true, state, message: `${resident.name} (${resident.role}) viendra à ${house.title} ; reste au village pour l’accueillir.` };
}

function arrivalOccupied(residence: ResidenceStateV149, houseId: string): boolean {
  return residence.objects.some(o => o.location.kind === "room" && o.location.houseId === houseId && o.location.slotId === "arrival");
}

/** The guest's choice of place (R19): the first free one, never an occupied slot. */
export function chooseGuestPlaceV150(life: ResidenceLifeV150, residence: ResidenceStateV149, houseId: string): GuestPlaceIdV150 | null {
  const taken = new Set(life.visits.filter(v => v.houseId === houseId && v.stage === "under-way" && v.place).map(v => v.place));
  const arrivalUsed = arrivalOccupied(residence, houseId);
  for (const place of GUEST_PLACES_V150) {
    if (taken.has(place.id)) continue;
    if (place.id === "threshold" && arrivalUsed) continue;
    return place.id;
  }
  return null;
}

/**
 * Advances visits with the region scene (called on checkpoints): an invited
 * guest sets out when the hunter is in that house's village; a walk that ends
 * becomes history. Also counts absence and leaves/reads the threshold mark.
 */
export function settleResidenceLifeV150(
  life: ResidenceLifeV150, residence: ResidenceStateV149,
  region: { regionId: string; runId: string; tick: number; zone: string; buildingId: string | null },
): { state: ResidenceLifeV150; events: string[] } {
  const state = structuredClone(life);
  const events: string[] = [];
  for (const visit of state.visits) {
    const house = houseV149(visit.houseId)!;
    if (residence.activeResidenceId !== visit.houseId) { visit.stage = "done"; continue; } // moved away: the invitation lapses
    if (house.regionId !== region.regionId || region.zone === "passage") continue;
    if (visit.stage === "done") continue;
    const continuing = visit.stage === "under-way" && visit.runId === region.runId;
    if (continuing && visitViewV150(visit, region.tick).stage === "gone") {
      visit.stage = "done";
      state.history = [...state.history, { houseId: visit.houseId, guestId: visit.guestId, place: visit.place, runId: region.runId }].slice(-20);
      events.push(`${guestResidentV150(region.regionId as HomeworldRegionIdV68, visit.guestId)?.name ?? "L’invité"} est rentré chez lui.`);
      continue;
    }
    if (continuing && visit.place && !(visit.place === "threshold" && arrivalOccupied(residence, visit.houseId))) continue;
    visit.place = null;
    const seat = chooseGuestPlaceV150(state, residence, visit.houseId);
    if (!seat) {
      visit.stage = "invited"; visit.runId = null; visit.startTick = null;
      continue;
    }
    visit.place = seat;
    if (!continuing) {
      visit.stage = "under-way"; visit.runId = region.runId; visit.startTick = region.tick;
      events.push(`${guestResidentV150(region.regionId as HomeworldRegionIdV68, visit.guestId)?.name ?? "L’invité"} quitte sa maison et prend le chemin de ta porte.`);
    }
  }
  state.visits = state.visits.filter(v => v.stage !== "done");
  // Absence (R17): runs played in other regions while a house is active.
  const active = residence.activeResidenceId;
  if (active) {
    const house = houseV149(active)!;
    const atHome = region.regionId === house.regionId && region.zone === "interior" && region.buildingId === houseBuildingIdV149(house);
    const entry = state.absence[active] ?? { runs: [] };
    if (atHome) {
      if (entry.runs.length >= ABSENCE_RUNS_V150 && (state.rooms[active]?.threshold ?? "ordered") === "ordered") {
        state.rooms[active] = { threshold: "dusty", note: `Pendant ${entry.runs.length} sorties, ${house.witnesses} ont gardé le passage libre et laissé une marque au seuil.` };
        events.push("Une marque attend au seuil.");
      }
      entry.runs = [];
    } else if (region.regionId !== house.regionId && !entry.runs.includes(region.runId)) entry.runs = [...entry.runs, region.runId].slice(-10);
    state.absence[active] = entry;
  }
  return { state, events };
}

export function inspectThresholdMarkV150(life: ResidenceLifeV150, residence: ResidenceStateV149, context: ResidenceContextV149): LifeChangeV150 {
  const houseId = residence.activeResidenceId;
  if (!houseId || context.atHouseId !== houseId) return refuse("La marque se lit au seuil de ta résidence.");
  const room = life.rooms[houseId];
  if (!room || room.threshold === "ordered") return refuse("Rien n’a changé au seuil.");
  const state = structuredClone(life);
  state.rooms[houseId] = { threshold: "ordered", note: null };
  return { ok: true, state, message: room.note ?? "Le seuil est remis en ordre." };
}

// ---------------------------------------------------------------------------
// Narrative reminders (HOME-E…)
// ---------------------------------------------------------------------------

export interface ReminderV150 { id: string; title: string; text: string }
/** Workbook life events whose trigger the game can read today. */
export function remindersV150(life: ResidenceLifeV150, residence: ResidenceStateV149, context: ResidenceContextV149): ReminderV150[] {
  const houseId = residence.activeResidenceId;
  if (!houseId) return [];
  const access = residenceAccessV149(residence, houseId, context);
  const out: ReminderV150[] = [
    { id: `HOME-E01:${houseId}`, title: "Premier soir au seuil", text: "Déposer la marque d’accès, ouvrir la chambre et choisir où poser le contenant de voyage. Accueillir le voisin sur le seuil ou fixer une visite après installation." },
  ];
  if (access.furnish) out.push({ id: `HOME-E07:${houseId}`, title: "L’apprenti trop pressé", text: "Montrer à l’apprenti le passage utile et lui faire essayer un meuble d’exercice." });
  if (access.receive) out.push({ id: `HOME-E10:${houseId}`, title: "Une invitation à plusieurs", text: "Disposer des sièges compatibles, vérifier les accès et placer le repère d’accueil. Petit cercle de proches ou présentation publique autorisée." });
  const otherRight = residence.rights.find(id => id !== houseId);
  if (otherRight) out.push({ id: `HOME-E20:${otherRight}`, title: "Changer de communauté", text: `Droit obtenu à ${houseV149(otherRight)?.title}. Choisir les caisses, emballer les originaux et confirmer le dernier départ.` });
  return out.filter(reminder => !life.read.includes(reminder.id));
}
export function readReminderV150(life: ResidenceLifeV150, id: string): ResidenceLifeV150 {
  return life.read.includes(id) ? life : { ...life, read: [...life.read, id].slice(-100) };
}

/**
 * Guests to show in the region scene. A guest inside the house is listed in
 * the village too (so its usual figure is hidden) but drawn only indoors.
 */
export function guestsInSceneV150(
  life: ResidenceLifeV150,
  view: { regionId: string; runId: string; tick: number; zone: string; buildingId: string | null },
): { residentId: string; x: number; y: number; inside: boolean; moving: boolean; label: string }[] {
  const out: { residentId: string; x: number; y: number; inside: boolean; moving: boolean; label: string }[] = [];
  for (const visit of life.visits) {
    const house = houseV149(visit.houseId);
    if (!house || house.regionId !== view.regionId || visit.stage !== "under-way" || visit.runId !== view.runId || view.zone === "passage") continue;
    const seen = visitViewV150(visit, view.tick);
    const label = guestResidentV150(view.regionId as HomeworldRegionIdV68, visit.guestId)?.name ?? visit.guestId;
    if ((seen.stage === "arriving" || seen.stage === "leaving") && seen.position) {
      if (view.zone === "village") out.push({ residentId: visit.guestId, ...seen.position, inside: false, moving: true, label });
    } else if (seen.stage === "present") {
      const atHouse = view.zone === "interior" && view.buildingId === houseBuildingIdV149(house);
      if (view.zone === "village" || atHouse) {
        const place = GUEST_PLACES_V150.find(p => p.id === visit.place);
        if (place) out.push({ residentId: visit.guestId, ...place.interior, inside: true, moving: false, label });
      }
    }
  }
  return out;
}
