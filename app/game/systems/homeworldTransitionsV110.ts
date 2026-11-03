import './homeworldStreetCompositionMountV92';
import type { HomeworldActor, HomeworldVec2 } from './homeworldCity';
import { homeworldCivicWalkableV80 } from './homeworldCivicWorldV80';
import { cargoCaseCollisionV108 } from './homeworldCargoV108';
import { normalizeHomeworldCargoV108, type HomeworldCargoV108 } from './homeworldCargoLedgerV108';
import {
  HOMEWORLD_POINTS_V77, createHomeworldWorldActorV77, homeworldLevelV77,
  stepHomeworldTransitV77, type HomeworldLevelV77, type HomeworldTransitV77,
} from './homeworldWorldV77';

/** An exterior transition admits the same full body as ordinary walking.
 * Cargo exists only on floor zero; sharing XY with it on another floor does
 * not create a collision. The current ledger is read at admission, uncached. */
export function homeworldExteriorArrivalAllowedV110(level: HomeworldLevelV77, point: HomeworldVec2, cargo?: HomeworldCargoV108, ownerCreatedAt?: string): boolean {
  const checked = cargo === undefined ? undefined : normalizeHomeworldCargoV108(cargo);
  if (cargo !== undefined && (!checked || ownerCreatedAt !== undefined && checked.ownerCreatedAt !== ownerCreatedAt)) return false;
  return [point.x, point.y].every(Number.isFinite)
    && homeworldCivicWalkableV80(level, point)
    && (level !== '0' || !cargoCaseCollisionV108(checked ?? undefined, point));
}

/** Preserve the authored ride, its pause semantics and continuous trajectory.
 * Only its final admission adds the live ground loads. A refused arrival goes
 * back to the recorded departure, exactly as the historical static refusal;
 * the load, operation receipt, cabin and campaign are never written here. */
export function stepHomeworldTransitV110(transit: HomeworldTransitV77, actor: HomeworldActor, seconds: number, cargo?: HomeworldCargoV108, suspended = false, ownerCreatedAt?: string) {
  const moving = stepHomeworldTransitV77(transit, actor, seconds, suspended);
  if (!moving.done || homeworldExteriorArrivalAllowedV110(moving.levelId, moving.actor, cargo, ownerCreatedAt)) return moving;
  return {
    transit: null, actor: { ...actor, ...transit.source, vx: 0, vy: 0 },
    levelId: transit.sourceLevel, elevation: homeworldLevelV77(transit.sourceLevel).elevation,
    done: false, error: 'Le palier est occupé par une charge. Retour au départ ; dégage ce passage avant de réessayer.',
  };
}

/** A regional return uses the same three authored public approach sockets.
 * An occupied socket is skipped, never snapped across a wall or through a
 * load. If none is free, the host retains its safe checkpoint and announces
 * the refusal. No region, discovery, delivery or progress is awarded here. */
export function homeworldWorldArrivalV110(regionId: string, cargo?: HomeworldCargoV108, ownerCreatedAt?: string) {
  const point = HOMEWORLD_POINTS_V77.find(entry => entry.regionId === regionId);
  if (!point) return null;
  for (const distance of [70, 100, 140]) {
    const arrival = { x: point.x, y: point.y + distance };
    if (homeworldExteriorArrivalAllowedV110(point.levelId, arrival, cargo, ownerCreatedAt)) {
      return { actor: { ...createHomeworldWorldActorV77(), ...arrival }, levelId: point.levelId };
    }
  }
  return null;
}

/** A doorway exit retains its exact saved public approach. A blocked anchor
 * keeps the hunter inside; neither an approximate replacement nor an object
 * displacement can silently grant a path through the obstruction. */
export function homeworldInteriorExitV110(level: HomeworldLevelV77, exterior: HomeworldActor, cargo?: HomeworldCargoV108, ownerCreatedAt?: string): HomeworldActor | null {
  return homeworldExteriorArrivalAllowedV110(level, exterior, cargo, ownerCreatedAt) ? { ...exterior, vx: 0, vy: 0 } : null;
}
