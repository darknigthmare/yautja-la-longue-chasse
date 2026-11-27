export const YOUTH_CITY_STOPS_V172 = {
  "forge-service": { label: "Remettre la pièce à la forge", detail: "Rejoins la maîtresse des parures à la Teinturerie des Forges." },
  "memory-service": { label: "Relever le repère des archives", detail: "Rejoins l’entrée des Archives de chasse dans le quartier de la Mémoire." },
  "kennel": { label: "Repérer l’accès au chenil", detail: "Parle à la personne de service au Chenil des Pisteurs." },
  "training-service": { label: "Repérer le foyer et les baraquements", detail: "Rejoins l’instructeur des terrasses et prends ses indications sur le foyer." },
} as const;
export type YouthCityStopV172 = keyof typeof YOUTH_CITY_STOPS_V172;
export const YOUTH_CITY_ROUTES_V172 = {
  escort: ["forge-service", "memory-service", "kennel", "training-service"],
  archives: ["memory-service", "forge-service", "kennel", "training-service"],
} as const satisfies Record<string, readonly YouthCityStopV172[]>;
export type YouthCityRouteV172 = keyof typeof YOUTH_CITY_ROUTES_V172;
export interface YouthCityErrandV172 {
  version: 1;
  ownerCreatedAt: string;
  route: YouthCityRouteV172;
  reached: number;
  delivery?: DeliveryDetour;
}
export function startYouthCityErrandV172(ownerCreatedAt: string, route: YouthCityRouteV172, withDelivery = false): YouthCityErrandV172 {
  return { version: 1, ownerCreatedAt, route, reached: 0, ...(withDelivery ? { delivery: { revision: 0, commands: [] } } : {}) };
}
export function normalizeYouthCityErrandV172(value: unknown): YouthCityErrandV172 | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const { version, ownerCreatedAt, route, reached, delivery } = value as Partial<YouthCityErrandV172>;
  if (version !== 1 || typeof ownerCreatedAt !== "string" || !Number.isFinite(Date.parse(ownerCreatedAt)) ||
      (route !== "escort" && route !== "archives") || typeof reached !== "number" || !Number.isInteger(reached) ||
      reached < 0 || reached > YOUTH_CITY_ROUTES_V172[route].length) return null;
  const detour = delivery === undefined ? undefined : normalizeDetour(delivery);
  if (detour === null) return null;
  const clean: YouthCityErrandV172 = { version, ownerCreatedAt, route, reached, ...(detour ? { delivery: detour } : {}) };
  if (detour?.revision && reached < YOUTH_CITY_ROUTES_V172[route].indexOf("forge-service")) return null;
  return clean.delivery && !youthCityCarriesPieceV172(clean) && !youthCityDeliveryClearedV176(clean) ? null : clean;
}
export function nextYouthCityStopV172(errand: YouthCityErrandV172): YouthCityStopV172 | undefined {
  return YOUTH_CITY_ROUTES_V172[errand.route][errand.reached];
}
export function youthCityCarriesPieceV172(errand: YouthCityErrandV172): boolean {
  return !YOUTH_CITY_ROUTES_V172[errand.route].slice(0, errand.reached).includes("forge-service");
}
export function acknowledgeYouthCityStopV172(errand: YouthCityErrandV172, stop: YouthCityStopV172): YouthCityErrandV172 | null {
  if (nextYouthCityStopV172(errand) !== stop ||
      (stop === "forge-service" && errand.delivery && !youthCityDeliveryClearedV176(errand))) return null;
  return { ...errand, reached: errand.reached + 1 };
}

export const YOUTH_CITY_DELIVERY_END_V176 = 7;
const steps = ["east", "west", "side"] as const;
export type YouthCityDeliveryStepV176 = typeof steps[number];
interface DeliveryDetour {
  revision: number;
  commands: YouthCityDeliveryStepV176[];
}
type DeliveryPosition = { x: number; lane: "main" | "side" };
const initialDelivery: DeliveryPosition = { x: 0, lane: "main" };
const atDeliveryExit = (position: DeliveryPosition) => position.x === YOUTH_CITY_DELIVERY_END_V176 && position.lane === "main";
const blockedByCart = (position: DeliveryPosition) => position.lane === "main" && position.x >= 3 && position.x <= 4;

function stepDelivery(position: DeliveryPosition, command: YouthCityDeliveryStepV176): DeliveryPosition | null {
  if (atDeliveryExit(position)) return null;
  if (command === "side") {
    return position.x === 2 || position.x === 5
      ? { ...position, lane: position.lane === "main" ? "side" : "main" }
      : null;
  }
  const next = { ...position, x: position.x + (command === "east" ? 1 : -1) };
  const withinLane = position.lane === "main" ? next.x >= 0 && next.x <= YOUTH_CITY_DELIVERY_END_V176 : next.x >= 2 && next.x <= 5;
  return withinLane && !blockedByCart(next) ? next : null;
}
function deliveryHistory(commands: readonly YouthCityDeliveryStepV176[]) {
  const history = [initialDelivery];
  for (const command of commands) {
    if (!steps.includes(command)) return null;
    const next = stepDelivery(history.at(-1)!, command);
    if (!next || history.some(prior => prior.x === next.x && prior.lane === next.lane)) return null;
    history.push(next);
  }
  return history;
}
function normalizeDetour(value: unknown): DeliveryDetour | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const { revision, commands } = value as Partial<DeliveryDetour>;
  if (!Array.isArray(commands) || commands.length > 11 || !Number.isSafeInteger(revision) ||
      typeof revision !== "number" || revision < commands.length || !deliveryHistory(commands)) return null;
  return { revision, commands: [...commands] };
}
export function youthCityDeliveryPositionV176(errand: YouthCityErrandV172) {
  return errand.delivery ? deliveryHistory(errand.delivery.commands)?.at(-1) ?? null : null;
}
export function youthCityDeliveryClearedV176(errand: YouthCityErrandV172): boolean {
  const position = youthCityDeliveryPositionV176(errand);
  return !!position && atDeliveryExit(position);
}

export function walkYouthCityDeliveryV176(errand: YouthCityErrandV172, command: YouthCityDeliveryStepV176): YouthCityErrandV172 | null {
  if (!errand.delivery || nextYouthCityStopV172(errand) !== "forge-service" || !steps.includes(command)) return null;
  const history = deliveryHistory(errand.delivery.commands);
  if (!history) return null;
  const next = stepDelivery(history.at(-1)!, command);
  if (!next) return null;
  const earlier = history.findIndex(position => position.x === next.x && position.lane === next.lane);
  const commands = earlier < 0 ? [...errand.delivery.commands, command] : errand.delivery.commands.slice(0, earlier);
  return { ...errand, delivery: { revision: errand.delivery.revision + 1, commands } };
}

/** A stale city write may neither erase the detour nor deliver the piece early. */
export function youthCityDeliveryMatchesWriteV176(before: YouthCityErrandV172 | undefined, after: YouthCityErrandV172 | undefined): boolean {
  if (!before?.delivery && !after?.delivery) return true;
  if (!before) return after?.delivery?.revision === 0 && after.reached === 0;
  if (!before.delivery || !after?.delivery) return false;
  const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
  if (same(before, after)) return true;
  if (steps.some(command => same(walkYouthCityDeliveryV176(before, command), after))) return true;
  const stop = nextYouthCityStopV172(before);
  return stop !== undefined && same(acknowledgeYouthCityStopV172(before, stop), after);
}
