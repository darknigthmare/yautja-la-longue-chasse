import type { ShipId } from "../shipCatalogue";
import type { SaveGame } from "../types";
import { firstInterstellarReceiptV173 } from "./firstInterstellarV173";
import { shipAcquisitionEligibleV89 } from "./shipAcquisitionV89";
import { shipReceiptV161 } from "./shipReceiptV161";

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

export type EarthOkavangoOrderV171 =
  | { kind: "choose-zone"; zone: Zone }
  | { kind: "move"; direction: Direction }
  | { kind: "insert" | "analyse" | "scan" | "extract" };
export type EarthOkavangoStateV171 = {
  version: 1 | 2; owner: string; hullInstanceId: string; orders: EarthOkavangoOrderV171[];
};
export type EarthOkavangoViewV171 = {
  phase: "registry" | "orbit" | "ground" | "returned";
  zone: Zone | null;
  x: number;
  lane: Lane;
  visor: "normal" | "analyse";
  traces: Trace[];
  waterSteps: number | null;
  tyreReading: TyreReading | null;
};
const initialView = (version: EarthOkavangoStateV171["version"] = 2): EarthOkavangoViewV171 => ({
  phase: "registry", zone: null, x: 0, lane: 1, visor: "normal", traces: [],
  waterSteps: version === 2 ? 0 : null, tyreReading: null,
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

function advance(view: EarthOkavangoViewV171, order: EarthOkavangoOrderV171): EarthOkavangoViewV171 | null {
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
function orderFrom(value: unknown): EarthOkavangoOrderV171 | null {
  if (!record(value)) return null;
  if (value.kind === "choose-zone" && (value.zone === "papyrus" || value.zone === "bank")) {
    return { kind: value.kind, zone: value.zone };
  }
  if (value.kind === "move" && directions.some(direction => direction === value.direction)) {
    return { kind: value.kind, direction: value.direction as Direction };
  }
  if (value.kind === "insert" || value.kind === "analyse" || value.kind === "scan" || value.kind === "extract") {
    return { kind: value.kind };
  }
  return null;
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
  if (typeof value.version === "number" && value.version > 2) return { status: "future-version", ...invalid };
  if ((value.version !== 1 && value.version !== 2) || value.owner !== owner || !Number.isFinite(Date.parse(owner)) ||
      typeof value.hullInstanceId !== "string" || value.hullInstanceId.length < 1 || value.hullInstanceId.length > 160 ||
      !Array.isArray(value.orders) || value.orders.length < 1 || value.orders.length > maxOrders) {
    return { status: "invalid", ...invalid };
  }
  const orders: EarthOkavangoOrderV171[] = [];
  // A V1 journal replays the original geometry and trace locations, even mid-survey.
  let view = initialView(value.version);
  for (const raw of value.orders) {
    const order = orderFrom(raw);
    const next = order && advance(view, order);
    if (!order || !next) return { status: "invalid", ...invalid };
    orders.push(order);
    view = next;
  }
  return { status: "valid", state: { version: value.version, owner, hullInstanceId: value.hullInstanceId, orders }, view };
}
export function commitEarthOkavangoV171(value: unknown, order: EarthOkavangoOrderV171, access: EarthOkavangoAccessV171) {
  if (!access.allowed) return { accepted: false as const, reason: access.reason };
  const parsed = inspectEarthOkavangoV171(value, access.owner);
  const current = parsed.state;
  if ((parsed.status !== "valid" && parsed.status !== "absent") || (current && current.hullInstanceId !== access.hullInstanceId)) {
    return { accepted: false as const, reason: "Le relevé ne correspond pas au journal de cette coque." };
  }
  const clean = orderFrom(order);
  const view = clean && advance(parsed.view, clean);
  if (!view || !clean || (current?.orders.length ?? 0) >= maxOrders) {
    return { accepted: false as const, reason: "Geste indisponible à ce repère." };
  }
  const state: EarthOkavangoStateV171 = {
    version: current?.version ?? 2, owner: access.owner, hullInstanceId: access.hullInstanceId, orders: [...(current?.orders ?? []), clean],
  };
  return { accepted: true as const, state, view };
}
export function earthOkavangoHistoryMatchesV171(save: EarthSave, state: EarthOkavangoStateV171) {
  return state.owner === save.createdAt && completedHull(save)?.instanceId === state.hullInstanceId;
}
export function earthOkavangoSuccessorV171(before: EarthOkavangoStateV171 | null | undefined, after: EarthOkavangoStateV171) {
  const prior = before?.orders ?? [];
  return (!before || (before.version === after.version && before.owner === after.owner && before.hullInstanceId === after.hullInstanceId)) &&
    after.orders.length === prior.length + 1 && prior.every((order, index) =>
      JSON.stringify(order) === JSON.stringify(after.orders[index]));
}
