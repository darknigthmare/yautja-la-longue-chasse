import type { SaveGame } from '../types';
import { HOMEWORLD_POINT_POSITIONS, type HomeworldVec2 } from './homeworldCity';
import { homeworldCityArrivalV67 } from './homeworldArrivalV67';
import { HOMEWORLD_GEOMETRY_V64 } from './homeworldGeometryV64';
import { HOMEWORLD_REGION_IDS_V68, HOMEWORLD_REGIONS_V68, canEnterHomeworldRegionV68, type HomeworldRegionIdV68 } from './homeworldRegionsV68';

/** Atlas entries use the actual arrival socket and corridor nodes. Reading or
 * tracing these entries never changes access, discovery or an actor position. */
export interface HomeworldAtlasRouteV70 {
  id: string; regionId: HomeworldRegionIdV68; name: string; description: string;
  village: string; clan: string; approach: HomeworldVec2; beacon: HomeworldVec2;
  panorama: string; accent: string; routeTitle: string; corridorMetres: number;
  sourceId: null; buildingId: null; lore: 'original-adaptation';
  access: string; connectors: string;
}
export const HOMEWORLD_ATLAS_ROUTES_V70: readonly HomeworldAtlasRouteV70[] = HOMEWORLD_REGION_IDS_V68.map(regionId => {
  const region = HOMEWORLD_REGIONS_V68[regionId];
  const socket = homeworldCityArrivalV67(regionId);
  if (!socket) throw new Error(`Missing walkable Homeworld threshold: ${regionId}`);
  const corridorLength = region.route.slice(1).reduce((sum, p, i) => sum + Math.hypot(p.x - region.route[i].x, p.y - region.route[i].y), 0);
  return {
    id: `route-${regionId}`, regionId, name: region.name, description: region.introduction,
    village: region.village, clan: region.clan, approach: { x: socket.x, y: socket.y },
    beacon: HOMEWORLD_POINT_POSITIONS[`region-${regionId}` as keyof typeof HOMEWORLD_POINT_POSITIONS],
    panorama: region.panorama, accent: region.accent, routeTitle: region.routeTitle,
    corridorMetres: corridorLength * HOMEWORLD_GEOMETRY_V64.adultMetres / HOMEWORLD_GEOMETRY_V64.adultHeight,
    sourceId: null, buildingId: null, lore: 'original-adaptation',
    access: 'Le repère mène au seuil de la cité. Le passage, le village et le terrain se parcourent ensuite à pied ; consulter la carte ne déverrouille aucun accès.',
    connectors: `${region.routeTitle} → ${region.village}. Risque local : ${region.hazard.toLocaleLowerCase('fr')}.`,
  };
});
export function homeworldAtlasRouteAccessV70(save: SaveGame | undefined, regionId: HomeworldRegionIdV68) {
  return save ? canEnterHomeworldRegionV68(save, regionId) : { allowed: false, reason: 'Les conditions sont vérifiées au seuil depuis ta partie active.' };
}
