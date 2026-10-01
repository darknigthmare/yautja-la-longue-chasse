import { HOMEWORLD_POINT_POSITIONS, createHomeworldActor, isHomeworldWalkable } from './homeworldCity';
import type { HomeworldPlayableRegionId } from './homeworld';

/** Arrive in front of the painted beacon, never inside its solid base. The same
 * footprint and walkability rules as ordinary city movement validate the socket. */
export function homeworldCityArrivalV67(regionId: HomeworldPlayableRegionId) {
  const point = HOMEWORLD_POINT_POSITIONS[`region-${regionId}`];
  for (const distance of [40, 60, 80]) {
    const approach = { x: point.x, y: point.y + distance };
    if (isHomeworldWalkable(approach)) return { ...createHomeworldActor(), ...approach };
  }
  return null;
}
