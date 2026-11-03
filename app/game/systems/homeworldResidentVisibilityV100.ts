import type { HomeworldVec2 } from './homeworldCity';
import { homeworldBuildingRenderDepthV76, homeworldBuildingVisibleBoundsV72 } from './homeworldCity';
import { homeworldBuildingCoversPaintV76, homeworldProjectGroundV64 } from './homeworldGeometryV64';
import { HOMEWORLD_BUILDINGS_V77, type HomeworldLevelV77 } from './homeworldWorldV77';
import { HOMEWORLD_URBAN_FACADES_V78 } from './homeworldUrbanFacadesV78';

const facades = [...HOMEWORLD_BUILDINGS_V77, ...HOMEWORLD_URBAN_FACADES_V78];

/** Shared with the actual resident draw pass. A person hidden by the opaque
 * painting of a foreground building must not expose a conversation prompt. */
export function homeworldResidentOccludedV100(levelId: HomeworldLevelV77, pose: HomeworldVec2): boolean {
  return facades.some(building => {
    if (building.levelId !== levelId || pose.y >= homeworldBuildingRenderDepthV76(building, pose)) return false;
    if (building.art.opaqueRowsV76) return homeworldBuildingCoversPaintV76(building, pose);
    const bounds = homeworldBuildingVisibleBoundsV72(building), foot = homeworldProjectGroundV64(pose);
    return foot.x > bounds.left && foot.x < bounds.left + bounds.width && foot.y > bounds.top && foot.y < bounds.top + bounds.height;
  });
}
