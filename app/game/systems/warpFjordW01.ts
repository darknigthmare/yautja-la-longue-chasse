/** W-01 / WU-E05 · « Une voile dans la brume », expédition originale de la Bible. */
export const W01_FJORD_BRANCH = "W-01";
export const W01_FJORD_LIMIT = 13;
export const W01_FJORD_FORK = 4;
export const W01_FJORD_ART = {
  shore: "/game/sprites/v60/pit-arenas/arena-186-snow-hunt/p0-depth.png",
  winch: "/game/warp-universe/20261109-p1/191_viking_treuil.png",
} as const;

export const W01_FJORD_ROUTES = {
  quai: {
    label: "Quais",
    checkpoint: 11,
    action: "Relever la manœuvre de la voile",
    finding: "Les manœuvres au treuil désignent la voile de l’équipage. Le guerrier qui dirige sa mise à l’eau monte ensuite vers la tour.",
  },
  falaise: {
    label: "Corniche",
    checkpoint: 12,
    action: "Observer le retour des guetteurs",
    finding: "De la corniche, le trajet des guetteurs relie la voile à la tour. Leur chef s’y entraîne à l’écart du fort.",
  },
} as const;

export type WarpFjordRoute = keyof typeof W01_FJORD_ROUTES;
export type WarpFjordPosition = "grotte" | WarpFjordRoute;
export type WarpFjordAction =
  | { kind: "observe"; route: WarpFjordRoute; at: number }
  | { kind: "report"; route: "grotte"; at: number };
export interface WarpFjordRecord {
  tripId: string;
  route: WarpFjordRoute;
  returned: boolean;
}

export function isWarpFjordRoute(value: unknown): value is WarpFjordRoute {
  return value === "quai" || value === "falaise";
}

export function warpFjordWithinReach(at: number, target: number): boolean {
  return Number.isInteger(at) && at >= 0 && at <= W01_FJORD_LIMIT && Math.abs(at - target) <= 1;
}

export function normalizeWarpFjordRecord(value: unknown): WarpFjordRecord | null {
  if (!value || typeof value !== "object" || Array.isArray(value) || Object.keys(value).length !== 3 ||
      !("tripId" in value) || typeof value.tripId !== "string" || !/^warp-trip-[1-9]\d{0,5}$/.test(value.tripId) ||
      !("route" in value) || !isWarpFjordRoute(value.route) ||
      !("returned" in value) || typeof value.returned !== "boolean") return null;
  return { tripId: value.tripId, route: value.route, returned: value.returned };
}
