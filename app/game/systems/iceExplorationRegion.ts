import type { ExplorationProgress, MissionId } from "../types";
import { mergeExplorationProgress, normalizeExplorationProgress } from "./explorationProgress";
import type { WorldBlueprint, WorldClimbable, WorldPlatform, WorldRect } from "./worldBlueprints";

export const ICE_MISSION_ID: MissionId = "ice-cryostalker";
export const ICE_RELAY_ID = "ice-mine-relay";
export const ICE_HATCH_ID = "ice-return-hatch";
export const ICE_SECRET_ID = "ice-clan-cache";
export const ICE_THERMAL_RETURN_GATE_ID = "ice-region-thermal-return-gate";
export const ICE_THERMAL_RETURN_ROUTE_ID = "ice-region-thermal-return-route";
export const ICE_GROUND_Y = 624;
export const ICE_RELAY_FLOOR_Y = 304;
export const ICE_VAULT_FLOOR_Y = 392;
// All bounds are in the expanded 8400px runtime world, never the source blueprint's scale.
export const ICE_STEP: Readonly<WorldRect> = { x: 520, y: 512, width: 240, height: 22 };
export const ICE_HIGH_PLATFORM: Readonly<WorldRect> = { x: 820, y: 304, width: 280, height: 24 };
export const ICE_RELAY: Readonly<WorldRect> = { x: 1020, y: 248, width: 48, height: 56 };
export const ICE_DOOR: Readonly<WorldRect> = { x: 1100, y: 0, width: 28, height: 416 };
export const ICE_BRIDGE: Readonly<WorldRect> = { x: 1100, y: 304, width: 90, height: 24 };
export const ICE_VAULT: Readonly<WorldRect> = { x: 1190, y: 392, width: 130, height: 24 };
export const ICE_CACHE: Readonly<WorldRect> = { x: 1240, y: 344, width: 48, height: 48 };
export const ICE_HATCH: Readonly<WorldRect> = { x: 1320, y: 392, width: 110, height: 24 };
export const ICE_RIGHT_WALL: Readonly<WorldRect> = { x: 1430, y: 0, width: 28, height: 416 };
export const ICE_LADDER: Readonly<WorldRect> = { x: 1348, y: 212, width: 44, height: 412 };
export const ICE_THERMAL_RETURN_STARTER: Readonly<WorldRect> = { x: 1510, y: 510, width: 260, height: 22 };
export const ICE_THERMAL_RETURN_LEDGE: Readonly<WorldRect> = { x: 1770, y: 304, width: 320, height: 24 };
export const ICE_THERMAL_RETURN_GATE: Readonly<WorldRect> = { x: 2090, y: 0, width: 28, height: 328 };
export const ICE_THERMAL_RETURN_BRIDGE: Readonly<WorldRect> = { x: 2118, y: 304, width: 250, height: 24 };
export const ICE_REPLACEMENT_SPAN = { minX: 400, maxX: 1460 } as const;

export interface IceRegionRoom extends WorldRect {
  id: string;
  label: string;
  level: "lower" | "middle" | "upper";
}
export const ICE_ROOMS: readonly IceRegionRoom[] = [
  { id: "ice-region-approach", label: "Gradin de glace", level: "lower", x: 440, y: 0, width: 320, height: 624 },
  { id: "ice-region-shaft", label: "Puits minier", level: "middle", x: 760, y: 0, width: 180, height: 624 },
  { id: "ice-region-relay", label: "Relais supérieur", level: "upper", x: 940, y: 0, width: 250, height: 328 },
  { id: "ice-region-vault", label: "Chambre du clan", level: "middle", x: 1190, y: 0, width: 130, height: 416 },
  { id: "ice-region-return", label: "Échelle de retour", level: "lower", x: 1320, y: 0, width: 138, height: 624 },
];

function validBody(body: WorldRect): boolean {
  return [body.x, body.y, body.width, body.height].every(Number.isFinite) && body.width > 0 && body.height > 0;
}
export function iceRoomAt(playerX: number, playerY: number): IceRegionRoom | null {
  if (!Number.isFinite(playerX) || !Number.isFinite(playerY)) return null;
  return ICE_ROOMS.find(room => playerX >= room.x && playerX < room.x + room.width && playerY >= room.y && playerY < room.y + room.height) ?? null;
}
export function discoverIceRooms(progress: ExplorationProgress, body: WorldRect): ExplorationProgress {
  const room = validBody(body) ? iceRoomAt(body.x + body.width / 2, body.y + body.height / 2) : null;
  return mergeExplorationProgress(progress, { discoveredRoomIds: room ? [room.id] : [] });
}
function slab(id: string, rect: Readonly<WorldRect>, material: "ice" | "metal" = "metal", collision: "solid" | "one-way" = "solid"): WorldPlatform {
  return { ...rect, id, material, collision, routeId: "mining-gantry", noiseMultiplier: material === "metal" ? 1.25 : 0.9, trackPersistence: 0.12 };
}
export function iceRegionPlatforms(progress: ExplorationProgress): WorldPlatform[] {
  const state = normalizeExplorationProgress(progress);
  return [
    // This starter ledge is semi-solid; walking along the campaign floor never requires the upgrade.
    slab("ice-region-starter-ledge", ICE_STEP, "ice", "one-way"),
    slab("ice-region-high-gantry", ICE_HIGH_PLATFORM),
    slab("ice-region-vault-floor", ICE_VAULT, "ice"),
    slab("ice-region-outer-wall", ICE_RIGHT_WALL, "ice"),
    slab("ice-region-thermal-return-starter", ICE_THERMAL_RETURN_STARTER, "ice", "one-way"),
    slab("ice-region-thermal-return-ledge", ICE_THERMAL_RETURN_LEDGE, "ice", "one-way"),
    ...(state.abilityIds.includes("thermal-resistance")
      ? [slab(ICE_THERMAL_RETURN_ROUTE_ID, ICE_THERMAL_RETURN_BRIDGE, "metal", "one-way")]
      : [slab(ICE_THERMAL_RETURN_GATE_ID, ICE_THERMAL_RETURN_GATE, "metal")]),
    ...(state.openedGateIds.includes(ICE_RELAY_ID)
      ? [slab("ice-region-deployed-bridge", ICE_BRIDGE)] : [slab(ICE_RELAY_ID, ICE_DOOR)]),
    ...(!state.openedGateIds.includes(ICE_HATCH_ID) ? [slab(ICE_HATCH_ID, ICE_HATCH)] : []),
  ];
}
export function iceRegionClimbables(progress: ExplorationProgress): WorldClimbable[] {
  if (!normalizeExplorationProgress(progress).openedGateIds.includes(ICE_HATCH_ID)) return [];
  return [{ ...ICE_LADDER, id: "ice-region-return-ladder", kind: "ladder", routeId: "mining-gantry", climbSpeedMultiplier: 1.05, staminaPerSecond: 0,
    dismounts: [{ x: 1240, y: ICE_VAULT_FLOOR_Y }, { x: 1334, y: ICE_GROUND_Y }],
  }];
}
export function applyIceExplorationWorld(base: WorldBlueprint, progress: ExplorationProgress): WorldBlueprint {
  if (base.missionId !== ICE_MISSION_ID) return base;
  const keep = (entry: WorldRect & { id: string }) => !entry.id.startsWith("ice-region-") && entry.id !== ICE_RELAY_ID && entry.id !== ICE_HATCH_ID
    && !(entry.x < ICE_REPLACEMENT_SPAN.maxX && entry.x + entry.width > ICE_REPLACEMENT_SPAN.minX && entry.y < ICE_GROUND_Y);
  return { ...base, platforms: [...base.platforms.filter(keep), ...iceRegionPlatforms(progress)], climbables: [...base.climbables.filter(keep), ...iceRegionClimbables(progress)] };
}
function distanceX(a: WorldRect, b: WorldRect): number { return Math.max(0, a.x - b.x - b.width, b.x - a.x - a.width); }
function near(a: WorldRect, b: WorldRect, radius = 38): boolean {
  return Math.hypot(distanceX(a, b), Math.max(0, a.y - b.y - b.height, b.y - a.y - a.height)) <= radius;
}
function onFloor(body: WorldRect, floor: number): boolean {
  const feet = body.y + body.height;
  return body.y < floor && feet >= floor - 22 && feet <= floor + 4;
}
export interface IceRegionInteraction {
  progress: ExplorationProgress;
  changed: boolean;
  message: string;
  event: "gate" | "secret" | null;
}
/** Activation is spatial: neither the relay nor the hatch can be operated through a ceiling. */
export function iceInteract(progress: ExplorationProgress, body: WorldRect): IceRegionInteraction | null {
  if (!validBody(body)) return null;
  const state = normalizeExplorationProgress(progress);
  const boost = state.abilityIds.includes("aerial-boost");
  const relay = state.openedGateIds.includes(ICE_RELAY_ID);
  const reply = (message: string): IceRegionInteraction => ({ progress: state, changed: false, message, event: null });
  const unlock = (event: "gate" | "secret", delta: Partial<ExplorationProgress>, message: string): IceRegionInteraction => ({ progress: mergeExplorationProgress(state, delta), changed: true, message, event });
  if (onFloor(body, ICE_RELAY_FLOOR_Y) && near(body, ICE_RELAY)) {
    if (!boost) return reply("Le relais requiert l’impulsion aérienne obtenue dans la jungle.");
    return relay ? reply("Relais alimenté : la passerelle est déployée.")
      : unlock("gate", { openedGateIds: [ICE_RELAY_ID] }, "Relais alimenté. Porte ouverte et passerelle déployée vers la chambre du clan.");
  }
  if (!onFloor(body, ICE_VAULT_FLOOR_Y)) return null;
  if (near(body, ICE_CACHE, 24)) {
    if (!boost || !relay) return reply("Le relais supérieur doit être alimenté.");
    return state.secretIds.includes(ICE_SECRET_ID) ? reply("Réserve du clan déjà récupérée.")
      : unlock("secret", { secretIds: [ICE_SECRET_ID] }, "Réserve du clan récupérée : énergie maximale +15.");
  }
  if (distanceX(body, ICE_HATCH) <= 14) {
    if (!boost || !relay) return reply("Le relais supérieur doit être alimenté.");
    return state.openedGateIds.includes(ICE_HATCH_ID) ? reply("Échelle déployée : le raccourci relie la chambre au sol.")
      : unlock("gate", { openedGateIds: [ICE_HATCH_ID] }, "Trappe déverrouillée. L’échelle de retour est maintenant permanente.");
  }
  return null;
}
export function iceHint(progress: ExplorationProgress, body: WorldRect): string | null {
  if (!validBody(body)) return null;
  const state = normalizeExplorationProgress(progress);
  if (onFloor(body, ICE_THERMAL_RETURN_LEDGE.y)
    && distanceX(body, ICE_THERMAL_RETURN_GATE) <= 44) {
    return state.abilityIds.includes("thermal-resistance")
      ? "Résistance thermique active : route supérieure vers le relais ouverte."
      : "Passage cryothermique scellé : résistance thermique du volcan requise";
  }
  if (onFloor(body, ICE_RELAY_FLOOR_Y) && near(body, ICE_RELAY)) {
    return state.openedGateIds.includes(ICE_RELAY_ID) ? "Passerelle déployée : la chambre se trouve en contrebas." : "Alimenter le relais supérieur";
  }
  if (onFloor(body, ICE_VAULT_FLOOR_Y)) {
    if (near(body, ICE_CACHE, 24) && !state.secretIds.includes(ICE_SECRET_ID)) return "Récupérer la réserve énergétique du clan";
    if (distanceX(body, ICE_HATCH) <= 14 && !state.openedGateIds.includes(ICE_HATCH_ID)) return "Déployer l’échelle depuis le dessus de la trappe";
  }
  const room = iceRoomAt(body.x + body.width / 2, body.y + body.height / 2);
  if (room?.id === "ice-region-approach" || room?.id === "ice-region-shaft") {
    return state.abilityIds.includes("aerial-boost") ? "Depuis le gradin, l’impulsion aérienne atteint le relais minier." : "Montée facultative : impulsion aérienne de la jungle requise. Le chemin au sol reste libre.";
  }
  return null;
}
