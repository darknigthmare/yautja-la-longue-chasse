import { HOMEWORLD_GEOMETRY_V64, homeworldProjectGroundV64, type HomeworldGroundPointV64 } from './homeworldGeometryV64';
import { HOMEWORLD_CONNECTION_WORLD_V72 } from './homeworldRegionConnectionsV72';

/** Small rooms fit as a whole; larger halls and narrow screens keep the actors
 * legible and scroll on the same ground projection as the city. No saved state. */
export function homeworldCameraV72({ actor, viewport, width, depth, interior }: {
  actor: HomeworldGroundPointV64;
  viewport: { width: number; height: number };
  width: number; depth: number; interior: boolean;
}) {
  const screen = { width: Math.max(1, viewport.width), height: Math.max(1, viewport.height) };
  const projectedDepth = depth * HOMEWORLD_GEOMETRY_V64.depthScale;
  const fit = Math.min(1.35, screen.width / (width + 90), screen.height / (projectedDepth + 220));
  const follow = !interior || fit < HOMEWORLD_GEOMETRY_V64.zoom;
  const zoom = interior ? Math.max(HOMEWORLD_GEOMETRY_V64.zoom, fit) : HOMEWORLD_GEOMETRY_V64.zoom;
  const viewWidth = screen.width / zoom, viewHeight = screen.height / zoom;
  const ground = homeworldProjectGroundV64(actor);
  const clampOrCentre = (value: number, low: number, high: number) => high < low ? (low + high) / 2 : Math.max(low, Math.min(high, value));
  // V75: frame the continuous natural shoulders at the western/eastern exits.
  // This changes observation only; actor bounds, route permissions and scale
  // remain the existing physical plan. The extended terrain covers this apron.
  const x = follow ? clampOrCentre(actor.x - viewWidth * .5, interior ? -45 : -480, width + (interior ? 45 : 480) - viewWidth)
    : (width - viewWidth) / 2;
  // Near the northern edge, leave more sky above the actor for the tall gateway
  // silhouettes. This changes framing only; physical bounds remain the floor.
  const actorScreenY = interior ? .62 : .62 + Math.max(0, 1 - actor.y / 700) * .28;
  const y = follow ? clampOrCentre(ground.y - viewHeight * actorScreenY, interior ? -160 : HOMEWORLD_CONNECTION_WORLD_V72.cameraTop, projectedDepth + (interior ? 40 : 0) - viewHeight)
    : (projectedDepth - 128 - viewHeight) / 2;
  return { x, y, zoom, mode: follow ? 'follow' as const : 'whole-room' as const, viewWidth, viewHeight };
}
