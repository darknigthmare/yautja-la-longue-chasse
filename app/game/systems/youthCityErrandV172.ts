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
}
export function startYouthCityErrandV172(ownerCreatedAt: string, route: YouthCityRouteV172): YouthCityErrandV172 {
  return { version: 1, ownerCreatedAt, route, reached: 0 };
}
export function normalizeYouthCityErrandV172(value: unknown): YouthCityErrandV172 | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const { version, ownerCreatedAt, route, reached } = value as Partial<YouthCityErrandV172>;
  if (version !== 1 || typeof ownerCreatedAt !== "string" || !Number.isFinite(Date.parse(ownerCreatedAt)) ||
      (route !== "escort" && route !== "archives") || typeof reached !== "number" || !Number.isInteger(reached) ||
      reached < 0 || reached > YOUTH_CITY_ROUTES_V172[route].length) return null;
  return { version, ownerCreatedAt, route, reached };
}
export function nextYouthCityStopV172(errand: YouthCityErrandV172): YouthCityStopV172 | undefined {
  return YOUTH_CITY_ROUTES_V172[errand.route][errand.reached];
}
export function youthCityCarriesPieceV172(errand: YouthCityErrandV172): boolean {
  return !YOUTH_CITY_ROUTES_V172[errand.route].slice(0, errand.reached).includes("forge-service");
}
export function acknowledgeYouthCityStopV172(errand: YouthCityErrandV172, stop: YouthCityStopV172): YouthCityErrandV172 | null {
  if (nextYouthCityStopV172(errand) !== stop) return null;
  return { ...errand, reached: errand.reached + 1 };
}
