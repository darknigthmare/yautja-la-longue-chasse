import {HOMEWORLD_CONNECTORS_V77,homeworldLevelV77,type HomeworldLevelV77,type HomeworldTransitV77} from './homeworldWorldV77';
import {HOMEWORLD_GEOMETRY_V64} from './homeworldGeometryV64';

/** One occupied floor is painted as a playable scene. During an actual vertical
 * trip both endpoint floors are visible. Painting every overlapping footprint
 * at once exposed unrelated lower facades through the active facade fade.
 * This changes observation only, never ground support, collision or access. */
export function homeworldPaintedLevelsV78(level:HomeworldLevelV77,transit:HomeworldTransitV77|null=null):readonly HomeworldLevelV77[]{
 const connector=transit&&HOMEWORLD_CONNECTORS_V77.find(item=>item.id===transit.connectorId);
 return connector?[...new Set([level,connector.from.levelId,connector.to.levelId])]:[level];
}

/** Same projected foot for scenery and the interpolated player. An occupied
 * floor switch must not move a facade by25000 stacking units at the landing. */
export function homeworldSceneDepthV78(groundY:number,elevation:number):number{
 return Math.round(groundY-elevation/HOMEWORLD_GEOMETRY_V64.depthScale);
}
/** During a physical trip the higher pavement is above the lower one, while
 * both remain below silhouettes. Other floors are only background ground. */
export function homeworldGroundDepthV78(level:HomeworldLevelV77,occupied:HomeworldLevelV77,transit:HomeworldTransitV77|null=null):number{
 return homeworldPaintedLevelsV78(occupied,transit).includes(level)?-11000+homeworldLevelV77(level).elevation:-35000;
}
export const HOMEWORLD_CONNECTOR_DRAW_DEPTH_V78=-9000;
