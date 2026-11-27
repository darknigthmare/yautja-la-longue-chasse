import type { ShipId } from "../shipCatalogue";
import type { SaveGame } from "../types";
import { advanceLionSurveyV174, createLionSurveyV174, readLionSurveyOrderV174,
  type LionSurveyOrderV174, type LionSurveyViewV174 } from "./earthLionSurveyV174";
import { firstInterstellarReceiptV173 } from "./firstInterstellarV173";
import { shipAcquisitionEligibleV89 } from "./shipAcquisitionV89";
import { shipReceiptV161 } from "./shipReceiptV161";
import { createShipFlightV87, stepShipFlightV87, type ShipFlightActionV87, type ShipFlightStateV87 } from "./shipFlightV87";

export const OKAVANGO_SECTORS_V171 = [
  { name: "Îlot de papyrus", end: 2 }, { name: "Chenaux", end: 6 }, { name: "Lisière du camp", end: 9 },
] as const;
export const OKAVANGO_ZONES_V171 = {
  papyrus: { name: "Îlot de papyrus", detail: "Dépôt abrité sur la berge basse.", x: 0, lane: 1 },
  bank: { name: "Banc du chenal", detail: "Dépôt extérieur près de la piste haute.", x: 0, lane: 0 },
} as const;
type Zone = keyof typeof OKAVANGO_ZONES_V171;
const directions = ["west", "east", "north", "south"] as const;
type Direction = typeof directions[number];
type Lane = 0 | 1;

export const OKAVANGO_TRACES_V171 = [
  { id: "tyres", name: "Traces de 4×4", x: 2, lane: 1, detail: "Les roues suivent le chenal qui rejoint le camp." },
  { id: "carcass", name: "Carcasse d’éléphant", x: 5, lane: 0, detail: "La piste de prélèvement remonte vers la rive haute." },
  { id: "cases", name: "Douilles", x: 8, lane: 1, detail: "Les derniers départs convergent vers l’île du Baobab mort." },
] as const;
type Trace = typeof OKAVANGO_TRACES_V171[number]["id"];
type TyreReading = "ford" | "levee";
type Water = "historical" | "low" | "rising" | "high";

const tyreDetours = {
  ford: { ...OKAVANGO_TRACES_V171[0], x: 4, detail: "Les roues suivent le gué en direction du camp." },
  levee: { ...OKAVANGO_TRACES_V171[0], name: "Ornières sur la levée", x: 3, lane: 0,
    detail: "Le gué recouvre la trace basse. Les ornières plus haut confirment la direction du camp." },
} as const;
const warningAfter = 5;
const highAfter = 8;

export const OKAVANGO_ORBIT_SITES_V171 = {
  papyrus: "Couvert de papyrus côté ouest. La berge s’interrompt au gué quand la crue atteint le chenal.",
  bank: "Banc en lisière de chenal. La voie haute rejoint le dépôt même quand le gué ferme.",
} as const;
const outboundRoute = { originId: "Pont personnel", relayId: "Balise de Sol", destinationId: "Fenêtre Okavango" };
const inboundRoute = { originId: "Fenêtre Okavango", relayId: "Balise de Sol", destinationId: "Pont personnel" };

type EarthSurveyVersion = 1 | 2;
export type EarthOrbitManeuverV171 = Extract<ShipFlightActionV87,
  { type: "lateral" | "align" | "speed" | "advance" | "retreat" }>;
export type EarthOrbitViewV171 = {
  stage: "outbound" | "observed" | "return" | "complete";
  flight: ShipFlightStateV87;
  scannedZone: Zone | null;
};
export type EarthOkavangoOrderV171 =
  | { kind: "choose-zone"; zone: Zone }
  | { kind: "move"; direction: Direction }
  | { kind: "insert" | "analyse" | "scan" | "extract" | "begin-orbit" | "return-orbit" | "finish-orbit" }
  | { kind: "pilot-orbit"; action: EarthOrbitManeuverV171 }
  | { kind: "scan-orbit"; zone: Zone }
  | LionSurveyOrderV174;
export type EarthOkavangoStateV171 = {
  owner: string; hullInstanceId: string; orders: EarthOkavangoOrderV171[];
} & ({ version: EarthSurveyVersion } | { version: 3 | 4; surveyVersion: EarthSurveyVersion });
export type EarthOkavangoViewV171 = {
  phase: "registry" | "orbit" | "ground" | "returned";
  zone: Zone | null;
  x: number;
  lane: Lane;
  visor: "normal" | "analyse";
  traces: Trace[];
  waterSteps: number | null;
  tyreReading: TyreReading | null;
  orbit: EarthOrbitViewV171 | null;
  lionSurvey: LionSurveyViewV174 | null;
};
const initialView = (version: EarthSurveyVersion = 2): EarthOkavangoViewV171 => ({
  phase: "registry", zone: null, x: 0, lane: 1, visor: "normal", traces: [],
  waterSteps: version === 2 ? 0 : null, tyreReading: null, orbit: null, lionSurvey: null,
});

type EarthSave = Pick<SaveGame, "createdAt" | "profile" | "prologue" | "shipAcquisitionV89" |
  "firstInterstellarV173" | "clanShipDocking" | "spaceRoutesV159">;
export type EarthOkavangoAccessV171 =
  | { allowed: true; owner: string; hullInstanceId: string }
  | { allowed: false; reason: string };

function completedHull(save: EarthSave) {
  return firstInterstellarReceiptV173(save, save.firstInterstellarV173) ? shipReceiptV161(save).receipt : null;
}
export function earthOkavangoAccessV171(save: EarthSave, selectedShip: ShipId): EarthOkavangoAccessV171 {
  if (!shipAcquisitionEligibleV89(save)) return { allowed: false, reason: "Le Registre terrestre s’ouvre au rang Blooded acquis." };
  const hull = completedHull(save);
  if (!hull || hull.shipId !== selectedShip) {
    return { allowed: false, reason: "Ramène au pont la coque personnelle après le premier trajet (R2-M023)." };
  }
  if (save.spaceRoutesV159?.trip || (save.clanShipDocking && save.clanShipDocking.status !== "free-flight")) {
    return { allowed: false, reason: "Termine l’autre route ou le désamarrage avant de partir vers Sol." };
  }
  return { allowed: true, owner: save.createdAt, hullInstanceId: hull.instanceId };
}

export function earthOkavangoWaterV171(view: EarthOkavangoViewV171): Water {
  if (view.waterSteps === null) return "historical";
  if (view.waterSteps >= highAfter) return "high";
  return view.waterSteps >= warningAfter ? "rising" : "low";
}
export const earthOkavangoWalkableV171 = (x: number, lane: Lane, water: Water = "historical") =>
  Number.isInteger(x) && x >= 0 && x <= 9 &&
  (lane === 0 || x < 4 || x > 6 || water === "low" || water === "rising");
export function earthOkavangoMoveV171(view: EarthOkavangoViewV171, direction: Direction) {
  const water = earthOkavangoWaterV171(view);
  if (!earthOkavangoWalkableV171(view.x, view.lane, water) && direction !== "north") return null;
  const x = view.x + (direction === "east" ? 1 : direction === "west" ? -1 : 0);
  const lane = direction === "north" ? 0 : direction === "south" ? 1 : view.lane;
  return earthOkavangoWalkableV171(x, lane, water) && (x !== view.x || lane !== view.lane) ? { x, lane } as const : null;
}
export function earthOkavangoTraceLocationsV171(view: EarthOkavangoViewV171) {
  if (view.waterSteps === null) return OKAVANGO_TRACES_V171;
  const reading = view.tyreReading ?? (earthOkavangoWaterV171(view) === "high" ? "levee" : "ford");
  return [tyreDetours[reading], ...OKAVANGO_TRACES_V171.slice(1)];
}
export function earthOkavangoTraceAtV171(view: EarthOkavangoViewV171) {
  return earthOkavangoTraceLocationsV171(view).find(trace => trace.x === view.x && trace.lane === view.lane);
}
export function earthOkavangoCanExtractV171(view: EarthOkavangoViewV171) {
  if (view.phase !== "ground" || !view.zone || view.traces.length !== OKAVANGO_TRACES_V171.length) return false;
  const landing = OKAVANGO_ZONES_V171[view.zone];
  return view.x === landing.x && view.lane === landing.lane;
}

function advanceOrbit(view: EarthOkavangoViewV171, orbit: EarthOrbitViewV171,
  order: EarthOkavangoOrderV171, owner: string): EarthOkavangoViewV171 | null {
  if (order.kind === "pilot-orbit") {
    if ((orbit.stage !== "outbound" && orbit.stage !== "return") || orbit.flight.phase === "locks") return null;
    const flight = stepShipFlightV87(orbit.flight, order.action, orbit.stage === "return" ? inboundRoute : outboundRoute);
    return flight.accepted && flight.changed ? { ...view, orbit: { ...orbit, flight: flight.state } } : null;
  }
  if (order.kind === "scan-orbit" && orbit.stage === "outbound" && orbit.flight.phase === "locks") {
    return { ...view, orbit: { ...orbit, stage: "observed", scannedZone: order.zone } };
  }
  if (order.kind === "return-orbit" && orbit.stage === "observed") {
    const flight = { ...createShipFlightV87(owner, "earth-okavango-orbit-return"), lateral: -3 };
    return { ...view, orbit: { ...orbit, stage: "return", flight } };
  }
  if (order.kind === "finish-orbit" && orbit.stage === "return" && orbit.flight.phase === "locks") {
    return { ...view, phase: "returned", orbit: { ...orbit, stage: "complete" } };
  }
  return null;
}

function advance(view: EarthOkavangoViewV171, order: EarthOkavangoOrderV171, owner: string): EarthOkavangoViewV171 | null {
  if (lionSurveyOrder(order)) {
    if (view.lionSurvey) {
      const lionSurvey = advanceLionSurveyV174(view.lionSurvey, order);
      if (!lionSurvey) return null;
      const phase = lionSurvey.stage === "complete" ? "returned" : lionSurvey.stage === "survey" ? "ground" : "orbit";
      return { ...view, phase, lionSurvey };
    }
    return order.kind === "lion-prepare" && view.phase === "returned" && view.orbit?.stage === "complete"
      ? { ...view, phase: "orbit", lionSurvey: createLionSurveyV174() } : null;
  }
  if (view.lionSurvey) return null;
  if (view.orbit) return advanceOrbit(view, view.orbit, order, owner);
  if (order.kind === "begin-orbit" && view.phase === "returned") {
    const flight = createShipFlightV87(owner, "earth-okavango-orbit-outbound");
    return { ...view, phase: "orbit", orbit: { stage: "outbound", flight, scannedZone: null } };
  }
  if (order.kind === "choose-zone") {
    if ((view.phase !== "registry" && view.phase !== "orbit") || view.zone === order.zone) return null;
    return { ...view, phase: "orbit", zone: order.zone };
  }
  if (order.kind === "insert") {
    if (view.phase !== "orbit" || !view.zone) return null;
    const { x, lane } = OKAVANGO_ZONES_V171[view.zone];
    return { ...view, phase: "ground", x, lane };
  }
  if (view.phase !== "ground") return null;
  if (order.kind === "move") {
    const point = earthOkavangoMoveV171(view, order.direction);
    return point ? { ...view, ...point,
      waterSteps: view.waterSteps === null ? null : Math.min(highAfter, view.waterSteps + 1),
    } : null;
  }
  if (order.kind === "analyse") return { ...view, visor: view.visor === "analyse" ? "normal" : "analyse" };
  if (order.kind === "scan") {
    const trace = earthOkavangoTraceAtV171(view);
    if (view.visor !== "analyse" || !trace || view.traces.includes(trace.id)) return null;
    const tyreReading = trace.id === "tyres" && view.waterSteps !== null
      ? earthOkavangoWaterV171(view) === "high" ? "levee" : "ford" : view.tyreReading;
    return { ...view, traces: [...view.traces, trace.id], tyreReading };
  }
  if (order.kind === "extract" && earthOkavangoCanExtractV171(view)) {
    return { ...view, phase: "returned" };
  }
  return null;
}
const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
function orbitManeuverFrom(value: unknown): EarthOrbitManeuverV171 | null {
  if (!record(value)) return null;
  if ((value.type === "lateral" || value.type === "speed") && (value.direction === -1 || value.direction === 1)) {
    return { type: value.type, direction: value.direction };
  }
  if (value.type === "align" || value.type === "advance" || value.type === "retreat") return { type: value.type };
  return null;
}
const orbitalOrder = (order: EarthOkavangoOrderV171) => order.kind === "begin-orbit" || order.kind === "pilot-orbit" ||
  order.kind === "scan-orbit" || order.kind === "return-orbit" || order.kind === "finish-orbit";
const lionSurveyOrder = (order: EarthOkavangoOrderV171): order is LionSurveyOrderV174 => order.kind.startsWith("lion-");
function orderFrom(value: unknown): EarthOkavangoOrderV171 | null {
  if (!record(value)) return null;
  if ((value.kind === "choose-zone" || value.kind === "scan-orbit") && (value.zone === "papyrus" || value.zone === "bank")) {
    return { kind: value.kind, zone: value.zone };
  }
  if (value.kind === "pilot-orbit") {
    const action = orbitManeuverFrom(value.action);
    return action ? { kind: "pilot-orbit", action } : null;
  }
  if (value.kind === "move" && directions.some(direction => direction === value.direction)) {
    return { kind: value.kind, direction: value.direction as Direction };
  }
  if (value.kind === "insert" || value.kind === "analyse" || value.kind === "scan" || value.kind === "extract" ||
      value.kind === "begin-orbit" || value.kind === "return-orbit" || value.kind === "finish-orbit") {
    return { kind: value.kind };
  }
  return readLionSurveyOrderV174(value);
}
const maxOrders = 2048;
type EarthInspectionV171 = {
  status: "valid" | "absent" | "invalid" | "future-version";
  state: EarthOkavangoStateV171 | null;
  view: EarthOkavangoViewV171;
};
export function inspectEarthOkavangoV171(value: unknown, owner: string): EarthInspectionV171 {
  const invalid = { state: null, view: initialView() };
  if (value === undefined || value === null) return { status: "absent", ...invalid };
  if (!record(value)) return { status: "invalid", ...invalid };
  if (typeof value.version === "number" && value.version > 4) return { status: "future-version", ...invalid };
  if ((value.version !== 1 && value.version !== 2 && value.version !== 3 && value.version !== 4) || value.owner !== owner || !Number.isFinite(Date.parse(owner)) ||
      typeof value.hullInstanceId !== "string" || value.hullInstanceId.length < 1 || value.hullInstanceId.length > 160 ||
      !Array.isArray(value.orders) || value.orders.length < 1 || value.orders.length > maxOrders) {
    return { status: "invalid", ...invalid };
  }
  const orders: EarthOkavangoOrderV171[] = [];
  // The orbital addendum replays the earlier ground survey in its recorded regime.
  const hasOrbitJournal = value.version === 3 || value.version === 4;
  const surveyVersion = hasOrbitJournal ? value.surveyVersion : value.version;
  if (surveyVersion !== 1 && surveyVersion !== 2) return { status: "invalid", ...invalid };
  let view = initialView(surveyVersion);
  for (const raw of value.orders) {
    const order = orderFrom(raw);
    const next = order && (!orbitalOrder(order) || hasOrbitJournal)
      && (!lionSurveyOrder(order) || value.version === 4) && advance(view, order, owner);
    if (!order || !next) return { status: "invalid", ...invalid };
    orders.push(order);
    view = next;
  }
  if ((hasOrbitJournal && !view.orbit) || (value.version === 4 && !view.lionSurvey)) return { status: "invalid", ...invalid };
  const binding = { owner, hullInstanceId: value.hullInstanceId, orders };
  const state: EarthOkavangoStateV171 = value.version === 3 || value.version === 4
    ? { version: value.version, surveyVersion, ...binding } : { version: value.version, ...binding };
  return { status: "valid", state, view };
}
export function commitEarthOkavangoV171(value: unknown, order: EarthOkavangoOrderV171, access: EarthOkavangoAccessV171) {
  if (!access.allowed) return { accepted: false as const, reason: access.reason };
  const parsed = inspectEarthOkavangoV171(value, access.owner);
  const current = parsed.state;
  if ((parsed.status !== "valid" && parsed.status !== "absent") || (current && current.hullInstanceId !== access.hullInstanceId)) {
    return { accepted: false as const, reason: "Le relevé ne correspond pas au journal de cette coque." };
  }
  const clean = orderFrom(order);
  const view = clean && advance(parsed.view, clean, access.owner);
  if (!view || !clean || (current?.orders.length ?? 0) >= maxOrders) {
    return { accepted: false as const, reason: "Geste indisponible à ce repère." };
  }
  const binding = { owner: access.owner, hullInstanceId: access.hullInstanceId, orders: [...(current?.orders ?? []), clean] };
  const state: EarthOkavangoStateV171 = current?.version === 3 || current?.version === 4
    ? { version: clean.kind === "lion-prepare" ? 4 : current.version, surveyVersion: current.surveyVersion, ...binding }
    : clean.kind === "begin-orbit" && current ? { version: 3, surveyVersion: current.version, ...binding }
      : { version: current?.version ?? 2, ...binding };
  return { accepted: true as const, state, view };
}
export function earthOkavangoHistoryMatchesV171(save: EarthSave, state: EarthOkavangoStateV171) {
  return state.owner === save.createdAt && completedHull(save)?.instanceId === state.hullInstanceId;
}
export function earthOkavangoSuccessorV171(before: EarthOkavangoStateV171 | null | undefined, after: EarthOkavangoStateV171) {
  const prior = before?.orders ?? [];
  if (after.orders.length !== prior.length + 1 || !prior.every((order, index) =>
    JSON.stringify(order) === JSON.stringify(after.orders[index]))) return false;
  if (!before) return after.version === 1 || after.version === 2;
  if (before.owner !== after.owner || before.hullInstanceId !== after.hullInstanceId) return false;
  if (before.version === 4) return after.version === 4 && after.surveyVersion === before.surveyVersion;
  if (before.version === 3) {
    if ((after.version !== 3 && after.version !== 4) || after.surveyVersion !== before.surveyVersion) return false;
    return after.version === 3 || after.orders.at(-1)?.kind === "lion-prepare";
  }
  if (after.version !== 3) return after.version === before.version;
  return after.surveyVersion === before.version && after.orders.at(-1)?.kind === "begin-orbit";
}
