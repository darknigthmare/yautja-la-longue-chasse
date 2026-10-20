import type { SaveGame } from '../types';
import type { HomeworldVec2 } from './homeworldCity';
import { homeworldAtlasLandmarksV83, homeworldAtlasTargetV83, homeworldAtlasFloorLinksV83 } from './homeworldAtlasLandmarksV83';
import { HOMEWORLD_BUILDINGS_V77, HOMEWORLD_CONNECTORS_V77, HOMEWORLD_LEVELS_V77, type HomeworldLevelV77 } from './homeworldWorldV77';
import { homeworldWorldRouteV77, homeworldRouteSegmentV77, type HomeworldWalkRouteV77 } from './homeworldNavigationV77';
import { homeworldWalkRouteV99, homeworldSimplifyRouteV99 } from './homeworldNavigationV99';
import { homeworldInteriorForBuildingV64, isHomeworldInteriorWalkableV64 } from './homeworldInteriorsV64';
import { homeworldBuildingDoorwayV64, HOMEWORLD_GEOMETRY_V64 } from './homeworldGeometryV64';
import { homeworldWayfindingInteriorRouteV75, homeworldWayfindingInteriorSegmentV75 } from './homeworldWayfindingV75';
// The isolated worker must mount the same late street collision collections as
// the scene. It cannot inherit module initialization from the browser window.
import './homeworldStreetCompositionMountV92';

export interface HomeworldRouteOriginV98 {
  actor: HomeworldVec2;
  levelId: HomeworldLevelV77;
  interiorId: string | null;
}
export interface HomeworldRouteStageV98 {
  levelId: HomeworldLevelV77;
  interiorId: string | null;
  points: HomeworldVec2[];
  distance: number;
  kind: 'connector' | 'enter' | 'exit' | 'interact' | 'building';
  radius: number;
  instruction: string;
  connectorId?: string;
  nextLevelId?: HomeworldLevelV77;
}
export interface HomeworldRoutePlanV98 {
  ownerCreatedAt: string;
  destinationId: string;
  status: 'reachable' | 'unavailable' | 'locked';
  reason: string;
  distance: number;
  stages: HomeworldRouteStageV98[];
}

/** Verify the direct floor chain first instead of searching unrelated lower
 * quarters on a trip to the acropolis. Every leg still uses the full live
 * collision solver; the general world search remains the blocked-leg fallback. */
function worldRoute(from: { levelId: HomeworldLevelV77; point: HomeworldVec2 }, to: { levelId: HomeworldLevelV77; point: HomeworldVec2 }): {status: 'reachable' | 'unavailable'; segments: (HomeworldWalkRouteV77 | {connectorId: string; reverse: boolean})[]} {
  const links = homeworldAtlasFloorLinksV83(from.levelId, to.levelId);
  if (!links) return { status: 'unavailable', segments: [] };
  const segments: (HomeworldWalkRouteV77 | {connectorId: string; reverse: boolean})[] = [];
  const fallback = () => {
    const result = homeworldWorldRouteV77(from, to);
    return { ...result, segments: result.segments.map(segment => 'connectorId' in segment ? segment : homeworldSimplifyRouteV99(segment)) };
  };
  let cursor = from;
  for (const link of links) {
    const connector = HOMEWORLD_CONNECTORS_V77.find(entry => entry.id === link.id)!;
    const reverse = connector.to.levelId === cursor.levelId, start = reverse ? connector.to : connector.from, end = reverse ? connector.from : connector.to;
    const walk = homeworldWalkRouteV99(cursor.levelId, cursor.point, start.point);
    if (walk.status !== 'reachable') return fallback();
    segments.push(walk, { connectorId: connector.id, reverse }); cursor = end;
  }
  const final = homeworldWalkRouteV99(cursor.levelId, cursor.point, to.point);
  if (final.status !== 'reachable') return fallback();
  return { status: 'reachable', segments: [...segments, final] };
}

/** Read-only walking plan using the exact live floors, doors, furniture and
 * public connectors. A planned interaction never executes a world action. */
export function homeworldRoutePlanV98(save: SaveGame, origin: HomeworldRouteOriginV98, destinationId: string): HomeworldRoutePlanV98 {
  const refusal = (status: 'unavailable' | 'locked', reason: string): HomeworldRoutePlanV98 => ({ ownerCreatedAt: save.createdAt, destinationId, status, reason, distance: 0, stages: [] });
  const target = homeworldAtlasTargetV83(homeworldAtlasLandmarksV83(save), destinationId);
  if (!target) return refusal('unavailable', 'Ce repère ne fait pas partie des lieux visibles de ta partie.');
  if (target.access === 'locked') return refusal('locked', target.reason);
  if (!HOMEWORLD_LEVELS_V77.some(level => level.id === origin.levelId) || ![origin.actor.x, origin.actor.y].every(Number.isFinite)) return refusal('unavailable', 'Position indisponible. Rejoins un passage et réessaie.');
  const currentRoom = origin.interiorId ? homeworldInteriorForBuildingV64(origin.interiorId) : null;
  const currentBuilding = currentRoom && HOMEWORLD_BUILDINGS_V77.find(building => building.id === currentRoom.buildingId);
  if (origin.interiorId && (!currentRoom || !currentBuilding || currentBuilding.levelId !== origin.levelId)) return refusal('unavailable', 'Intérieur inconnu à cet étage. Aucun passage supposé.');
  if (currentRoom && !isHomeworldInteriorWalkableV64(currentRoom, origin.actor)) return refusal('unavailable', 'Position hors du passage intérieur. Aucun itinéraire supposé.');
  const stages: HomeworldRouteStageV98[] = [];
  const addInterior = (room: NonNullable<typeof currentRoom>, from: HomeworldVec2, pointId: string | 'exit', kind: 'interact' | 'exit') => {
    const route = homeworldWayfindingInteriorRouteV75(room, from, pointId);
    if (route.status !== 'reachable') return false;
    stages.push({ levelId: origin.levelId === currentBuilding?.levelId && room.buildingId === currentBuilding.id ? origin.levelId : target.levelId,
      interiorId: room.buildingId, points: route.points, distance: route.distance, kind, radius: kind === 'exit' ? 10 : 24,
      instruction: kind === 'exit' ? 'Au seuil, interagis pour sortir vers la cité.' : 'Interlocuteur à portée : interagis sur place.' });
    return true;
  };
  if (currentRoom?.buildingId === target.buildingId) {
    if (target.pointId) {
      if (!addInterior(currentRoom, origin.actor, target.pointId, 'interact')) return refusal('unavailable', 'Aucun passage sûr jusqu’au poste. Rejoins le couloir et recalcule.');
    } else stages.push({ levelId: origin.levelId, interiorId: currentRoom.buildingId, points: [{ ...origin.actor }], distance: 0, kind: 'building', radius: 24, instruction: 'Tu es dans ce bâtiment. Explore la salle à pied.' });
  } else {
    let exteriorFrom = origin.actor;
    if (currentRoom && currentBuilding) {
      if (!addInterior(currentRoom, origin.actor, 'exit', 'exit')) return refusal('unavailable', 'Aucun passage sûr vers la sortie. Rejoins le couloir et recalcule.');
      exteriorFrom = homeworldBuildingDoorwayV64(currentBuilding).approach;
    }
    // Exterior people/objects are solid. The same +55 public approach used by
    // runtime proximity reaches them without placing the hunter at their centre.
    const approach = !target.buildingId && target.category !== 'region' ? { x: target.position.x, y: target.position.y + 55 } : target.position;
    const world = worldRoute({ levelId: origin.levelId, point: exteriorFrom }, { levelId: target.levelId, point: approach });
    if (world.status !== 'reachable') return refusal('unavailable', 'Aucun passage sûr calculé. Rejoins une rue ou un palier et recalcule.');
    for (let index = 0; index < world.segments.length; index++) {
      const segment = world.segments[index];
      if ('connectorId' in segment) continue;
      const next = world.segments[index + 1];
      if (next && 'connectorId' in next) {
        const connector = HOMEWORLD_CONNECTORS_V77.find(entry => entry.id === next.connectorId)!;
        const end = next.reverse ? connector.from : connector.to;
        stages.push({ levelId: segment.levelId, interiorId: null, points: segment.points.map(point => ({ ...point })), distance: segment.distance, kind: 'connector', radius: 28,
          connectorId: connector.id, nextLevelId: end.levelId,
          instruction: `${connector.kind === 'lift' ? 'Interagis pour appeler la cabine ou embarquer' : 'Interagis pour emprunter le passage'} : ${connector.name} → ${end.levelId}.` });
      } else stages.push({ levelId: segment.levelId, interiorId: null, points: segment.points.map(point => ({ ...point })), distance: segment.distance, kind: target.buildingId ? 'enter' : 'interact', radius: 24,
        instruction: target.buildingId ? 'À la porte éclairée, interagis pour entrer.' : target.category === 'region' ? 'Au seuil, interagis pour demander le passage.' : 'Interagis sur place pour consulter ce poste.' });
    }
    if (target.buildingId && target.pointId) {
      const room = homeworldInteriorForBuildingV64(target.buildingId);
      if (!room || !addInterior(room, room.spawn, target.pointId, 'interact')) return refusal('unavailable', 'Aucun passage sûr dans la salle. Recalcule après avoir rejoint le couloir.');
    }
  }
  return { ownerCreatedAt: save.createdAt, destinationId: target.id, status: 'reachable', reason: target.reason, distance: stages.reduce((sum, stage) => sum + stage.distance, 0), stages };
}

const distance = (a: HomeworldVec2, b: HomeworldVec2) => Math.hypot(a.x - b.x, a.y - b.y);
const directions = ['→ Droite · est', '↘ Avant et droite', '↓ Avant · sud', '↙ Avant et gauche', '← Gauche · ouest', '↖ Fond et gauche', '↑ Fond · nord', '↗ Fond et droite'];

/** Cheap poll: no A*, no save and no movement. Only a short, verified section
 * near the hunter is inspected; a distant visible point cannot skip a wall. */
export function homeworldRouteGuidanceV98(plan: HomeworldRoutePlanV98, origin: HomeworldRouteOriginV98) {
  if (plan.status !== 'reachable' || ![origin.actor.x, origin.actor.y].every(Number.isFinite)) return null;
  const index = plan.stages.findIndex(stage => stage.levelId === origin.levelId && stage.interiorId === origin.interiorId), stage = plan.stages[index];
  const lost = { state: 'off-route' as const, direction: 'Recalculer depuis ce lieu', instruction: 'Rejoins une rue ou un couloir et recalcule le repère.', remaining: 0, stage: null };
  if (!stage || !stage.points.length) return lost;
  const room = origin.interiorId ? homeworldInteriorForBuildingV64(origin.interiorId) : null;
  const safe = (point: HomeworldVec2) => room ? homeworldWayfindingInteriorSegmentV75(room, origin.actor, point) : homeworldRouteSegmentV77(origin.levelId, origin.actor, point);
  const end = stage.points.at(-1)!;
  const laterDistance = plan.stages.slice(index + 1).reduce((sum, later) => sum + later.distance, 0);
  if (distance(origin.actor, end) <= stage.radius && safe(end)) return { state: 'arrived' as const, direction: 'À portée', instruction: stage.instruction, remaining: laterDistance, stage };
  // Project onto every segment: after consolidation, the nearest vertex can
  // belong to another street even while the hunter is on a long safe segment.
  let nearest = -1, nearestRatio = 0, nearestDistance = Infinity;
  for (let n = 0; n < stage.points.length - 1; n++) {
    const a = stage.points[n], b = stage.points[n + 1], dx = b.x - a.x, dy = b.y - a.y;
    const ratio = Math.max(0, Math.min(1, ((origin.actor.x - a.x) * dx + (origin.actor.y - a.y) * dy) / (dx * dx + dy * dy || 1)));
    const projected = { x: a.x + dx * ratio, y: a.y + dy * ratio };
    const candidateDistance = distance(origin.actor, projected);
    if (candidateDistance < nearestDistance) { nearest = n; nearestRatio = ratio; nearestDistance = candidateDistance; }
  }
  if (nearest < 0 || nearestDistance > 180) return lost;
  const candidates: { point: HomeworldVec2; after: number }[] = [];
  let walking = 0;
  for (let n = nearest; n < stage.points.length - 1; n++) {
    const a = stage.points[n], b = stage.points[n + 1], dx = b.x - a.x, dy = b.y - a.y;
    const ratio = n === nearest ? nearestRatio : 0, length = Math.hypot(dx, dy);
    const advance = Math.min(1, ratio + Math.min(160, 240 - walking) / (length || 1));
    candidates.push({ point: { x: a.x + dx * advance, y: a.y + dy * advance }, after: n + 1 });
    walking += length * (1 - ratio);
    if (walking >= 240) break;
  }
  const waypoint = candidates.reverse().find(candidate => distance(origin.actor, candidate.point) > 5 && safe(candidate.point));
  if (!waypoint) return lost;
  const angle = Math.atan2((waypoint.point.y - origin.actor.y) * HOMEWORLD_GEOMETRY_V64.depthScale, waypoint.point.x - origin.actor.x);
  const remaining = distance(origin.actor, waypoint.point) + stage.points.slice(waypoint.after).reduce((sum, point, n) => sum + distance(n ? stage.points[waypoint.after + n - 1] : waypoint.point, point), 0) + laterDistance;
  return { state: 'walking' as const, direction: directions[(Math.round(angle / (Math.PI / 4)) + 8) % 8], instruction: stage.kind === 'connector' ? `Prochain passage : ${HOMEWORLD_CONNECTORS_V77.find(connector => connector.id === stage.connectorId)!.name} → ${stage.nextLevelId}.` : stage.interiorId ? 'Suis le couloir jusqu’au poste ou au seuil.' : 'Suis les rues et les cours jusqu’au repère.', remaining, stage };
}
