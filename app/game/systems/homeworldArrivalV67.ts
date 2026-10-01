import { HOMEWORLD_POINT_POSITIONS, createHomeworldActor, isHomeworldWalkable } from './homeworldCity';
import type { HomeworldRegionIdV68 } from './homeworldRegionsV68';

/** Arrive in front of the painted beacon, never inside its solid base. The same
 * footprint and walkability rules as ordinary city movement validate the socket. */
export function homeworldCityArrivalV67(regionId: HomeworldRegionIdV68 | string) {
  if (!Object.hasOwn(HOMEWORLD_POINT_POSITIONS, `region-${regionId}`)) return null;
  const point = HOMEWORLD_POINT_POSITIONS[`region-${regionId}` as keyof typeof HOMEWORLD_POINT_POSITIONS];
  for (const distance of [40, 60, 80]) {
    const approach = { x: point.x, y: point.y + distance };
    if (isHomeworldWalkable(approach)) return { ...createHomeworldActor(), ...approach };
  }
  return null;
}
