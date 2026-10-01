import { HOMEWORLD_ACTOR, type HomeworldVec2 } from './homeworldCity';
import { homeworldProjectGroundV64, homeworldBuildingSpritePlacementV64, homeworldBuildingSpriteScaleV64, type HomeworldGeometryBuildingV64 } from './homeworldGeometryV64';

/** Native painted bounds, not the whole foundation or an arbitrary village
 * group. Source transparency is excluded from this conservative alpha box. */
export function villageBuildingPaintV70(building: HomeworldGeometryBuildingV64) {
  const image = homeworldBuildingSpritePlacementV64(building), alpha = building.art?.alphaBounds, scale = homeworldBuildingSpriteScaleV64(building);
  return alpha ? { left: image.left + alpha.x * scale, top: image.top + alpha.y * scale, right: image.left + (alpha.x + alpha.width) * scale, bottom: image.top + (alpha.y + alpha.height) * scale }
    : { left: image.left, top: image.top, right: image.left + image.width, bottom: image.top + image.height };
}
/** Same rule as the city: a facade fades only where it actually covers the
 * hunter on the rear ground plane. The saved point and collision stay intact. */
export function villageFacadeFadedV70(building: HomeworldGeometryBuildingV64, actor: HomeworldVec2, actorHeight: number = HOMEWORLD_ACTOR.height) {
  const p = homeworldProjectGroundV64(actor), r = villageBuildingPaintV70(building);
  return actor.y < building.y && p.x + HOMEWORLD_ACTOR.halfWidth > r.left && p.x - HOMEWORLD_ACTOR.halfWidth < r.right && p.y > r.top && p.y - actorHeight < r.bottom;
}
export function villagePaintOccludedV70(buildings: readonly HomeworldGeometryBuildingV64[], point: HomeworldVec2, actor: HomeworldVec2,
  options: { depth?: number; altitude?: number; actorHeight?: number; isHero?: boolean } = {}) {
  if (options.isHero) return false;
  const depth = options.depth ?? point.y, p = homeworldProjectGroundV64(point, options.altitude ?? 0);
  return buildings.some(b => {
    if (depth >= b.y || !villageFacadeFadedV70(b, actor, options.actorHeight)) return false;
    const r = villageBuildingPaintV70(b);
    return p.x > r.left && p.x < r.right && p.y > r.top && p.y < r.bottom;
  });
}
