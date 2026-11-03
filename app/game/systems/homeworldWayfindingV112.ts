import type { SaveGame } from '../types';
import {
  homeworldDestinationKeyV109,
  homeworldRouteGuidanceV111,
  homeworldRoutePlanV111,
  homeworldRouteResponseCurrentV111,
  type HomeworldRouteOriginV109,
  type HomeworldRoutePlanV109,
} from './homeworldWayfindingV111';
import { homeworldAtlasTargetV83 } from './homeworldAtlasLandmarksV83';
import { homeworldAtlasLandmarksV111 } from './homeworldObjectivesV111';
import { homeworldInteriorForBuildingV64, nearestHomeworldInteriorTargetV64 } from './homeworldInteriorsV64';
import { HOMEWORLD_ARCHIVE_V106 } from './homeworldArchiveDefinitionV106';
import { archivePostReachedV106 } from './homeworldArchiveV106';
import { homeworldInteriorRouteV112, homeworldInteriorSegmentV112 } from './homeworldInteriorNavigationV112';
import { homeworldCargoGeometryKeyV109 } from './homeworldNavigationV109';
import { HOMEWORLD_GEOMETRY_V64 } from './homeworldGeometryV64';

export type {
  HomeworldRouteOriginV109,
  HomeworldRouteStageV109,
  HomeworldRoutePlanV109,
  HomeworldRouteRequestV109,
} from './homeworldWayfindingV111';
export { homeworldDestinationKeyV109 };
/** Keep every exterior path, door anchor and action endpoint. Only unsafe
 * simplified interior legs are replaced by an independently verified route. */
export function homeworldRoutePlanV112(save: SaveGame, origin: HomeworldRouteOriginV109, destinationId: string): HomeworldRoutePlanV109 {
  const plan = homeworldRoutePlanV111(save, origin, destinationId);
  if (plan.status !== 'reachable') return plan;
  const target = homeworldAtlasTargetV83(homeworldAtlasLandmarksV111(save), plan.destinationId);
  const stages = [];
  for (const stage of plan.stages) {
    const room = stage.interiorId && homeworldInteriorForBuildingV64(stage.interiorId);
    if (!room || !['interact', 'exit'].includes(stage.kind)
      || stage.points.slice(1).every((point, index) => homeworldInteriorSegmentV112(room, stage.points[index], point))) {stages.push(stage); continue;}
    const pointId = stage.kind === 'exit' ? 'exit' : target?.pointId;
    const route = pointId && homeworldInteriorRouteV112(room, stage.points[0], pointId);
    if (!route || route.status !== 'reachable') return {...plan, status: 'unavailable', reason: 'Aucun passage intérieur sûr calculé. Rejoins le couloir et recalcule.', stages: [], distance: 0};
    stages.push({...stage, points: route.points, distance: route.distance});
  }
  return {...plan, stages, distance: stages.reduce((distance, stage) => distance + stage.distance, 0)};
}
export const homeworldRouteResponseCurrentV112 = homeworldRouteResponseCurrentV111;

const distance = (a: {x: number; y: number}, b: {x: number; y: number}) => Math.hypot(a.x - b.x, a.y - b.y);
const directions = ['→ Droite · est', '↘ Avant et droite', '↓ Avant · sud', '↙ Avant et gauche', '← Gauche · ouest', '↖ Fond et gauche', '↑ Fond · nord', '↗ Fond et droite'];
const lost = () => ({state: 'off-route' as const, direction: 'Recalculer depuis ce lieu',
  instruction: 'Rejoins le couloir et recalcule le repère.', remaining: 0, stage: null});

/** Interior look-ahead uses the same finer full-body sampler as its route.
 * A short final step before a bend stays eligible, including when it is under
 * five units; skipping that bend must never cut the wall behind it. */
function interiorGuidance(plan: HomeworldRoutePlanV109, origin: HomeworldRouteOriginV109, targetPointId: string | null) {
  const index = plan.stages.findIndex(stage => stage.levelId === origin.levelId && stage.interiorId === origin.interiorId), stage = plan.stages[index];
  const room = origin.interiorId && homeworldInteriorForBuildingV64(origin.interiorId);
  if (!room || !stage?.points.length) return lost();
  const end = stage.points.at(-1)!, nearestTarget = nearestHomeworldInteriorTargetV64(room, origin.actor);
  const reached = stage.kind === 'exit' ? nearestTarget?.kind === 'exit'
    : stage.kind === 'building' || nearestTarget?.kind === 'point' && nearestTarget.pointId === targetPointId;
  const laterDistance = plan.stages.slice(index + 1).reduce((sum, later) => sum + later.distance, 0);
  if (reached && distance(origin.actor, end) <= stage.radius && homeworldInteriorSegmentV112(room, origin.actor, end)) {
    return {state: 'arrived' as const, direction: 'À portée', instruction: stage.instruction, remaining: laterDistance, stage};
  }
  let nearest = -1, nearestRatio = 0, nearestDistance = Infinity;
  for (let n = 0; n < stage.points.length - 1; n++) {
    const a = stage.points[n], b = stage.points[n + 1], dx = b.x - a.x, dy = b.y - a.y;
    const ratio = Math.max(0, Math.min(1, ((origin.actor.x - a.x) * dx + (origin.actor.y - a.y) * dy) / (dx * dx + dy * dy || 1)));
    const projected = {x: a.x + dx * ratio, y: a.y + dy * ratio}, candidateDistance = distance(origin.actor, projected);
    if (candidateDistance < nearestDistance) {nearest = n; nearestRatio = ratio; nearestDistance = candidateDistance;}
  }
  if (nearest < 0 || nearestDistance > 180) return lost();
  const candidates: {point: {x: number; y: number}; after: number}[] = [];
  let walking = 0;
  for (let n = nearest; n < stage.points.length - 1; n++) {
    const a = stage.points[n], b = stage.points[n + 1], dx = b.x - a.x, dy = b.y - a.y;
    const ratio = n === nearest ? nearestRatio : 0, length = Math.hypot(dx, dy);
    const advance = Math.min(1, ratio + Math.min(160, 240 - walking) / (length || 1));
    candidates.push({point: {x: a.x + dx * advance, y: a.y + dy * advance}, after: n + 1});
    walking += length * (1 - ratio);
    if (walking >= 240) break;
  }
  const waypoint = candidates.reverse().find(candidate => distance(origin.actor, candidate.point) > .000001
    && homeworldInteriorSegmentV112(room, origin.actor, candidate.point));
  if (!waypoint) return lost();
  const angle = Math.atan2((waypoint.point.y - origin.actor.y) * HOMEWORLD_GEOMETRY_V64.depthScale, waypoint.point.x - origin.actor.x);
  const remaining = distance(origin.actor, waypoint.point) + stage.points.slice(waypoint.after).reduce((sum, point, n) => sum
    + distance(n ? stage.points[waypoint.after + n - 1] : waypoint.point, point), 0) + laterDistance;
  return {state: 'walking' as const, direction: directions[(Math.round(angle / (Math.PI / 4)) + 8) % 8],
    instruction: 'Suis le couloir jusqu’au poste ou au seuil.', remaining, stage, waypoint: {...waypoint.point}};
}

/** Arrival reads the same public interaction authority as the Hub. The
 * exterior planner, doorway provenance and stale-result refusals stay V111. */
export function homeworldRouteGuidanceV112(plan: HomeworldRoutePlanV109, origin: HomeworldRouteOriginV109, save: SaveGame) {
  const guidance = homeworldRouteGuidanceV111(plan, origin, save);
  if (!guidance) return guidance;
  const target = homeworldAtlasTargetV83(homeworldAtlasLandmarksV111(save), plan.destinationId);
  if (!target || target.access === 'locked' || plan.destinationKey !== homeworldDestinationKeyV109(target)
    || plan.geometryKey !== homeworldCargoGeometryKeyV109(save.homeworld.cargoV108)) return guidance;
  if (origin.interiorId) return interiorGuidance(plan, origin, target.pointId);
  if (guidance.state !== 'arrived' || target.id !== HOMEWORLD_ARCHIVE_V106.npcId) return guidance;
  if (archivePostReachedV106({ownerCreatedAt: save.createdAt, currentOwnerCreatedAt: save.createdAt,
    actor: origin.actor, levelId: origin.levelId, interiorId: origin.interiorId,
    visitedDistrictIds: save.homeworld.visitedDistrictIds, active: true})) return guidance;
  const precise = {...plan, stages: plan.stages.map(stage => stage === guidance.stage ? {...stage, radius: 0} : stage)};
  const continued = homeworldRouteGuidanceV111(precise, origin, save);
  return continued?.state === 'arrived' ? lost() : continued;
}
