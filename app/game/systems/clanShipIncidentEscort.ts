import type { ClanShipRoomId } from './clanShipDocking';
import { clanShipIncidentTarget, getClanShipIncidentEscort, getClanShipIncidentStep, type ClanShipIncidentsState } from './clanShipIncidents';
import {
  CLAN_SHIP_INTERIOR_METRICS,
  isClanShipInteriorWalkable,
  planClanShipInteriorPath,
  stepClanShipInteriorPath,
  type ClanShipInteriorActor,
  type ClanShipInteriorPoint,
} from './clanShipInterior';

/** The returning scout uses the same floor and collision motor as the hunter.
 * This local controller never grants a checkpoint or writes a campaign save. */
export const CLAN_SHIP_ESCORT_MOTION = Object.freeze({
  speed: 240,
  followDistance: 46,
  repathDistance: 38,
  repathSeconds: 0.3,
});

export interface ClanShipEscortMotion {
  actor: ClanShipInteriorActor;
  waypoints: ClanShipInteriorPoint[];
  leaderTarget: ClanShipInteriorPoint | null;
  repathElapsed: number;
  phase: number;
  moving: boolean;
  blocked: boolean;
  pathBuilds: number;
}

export interface ClanShipEscortScene {
  key: string;
  checkpointId: 'waiting' | 'hangar-pickup' | 'hangar-door' | 'medical-entry' | 'medical-station';
  position: ClanShipInteriorPoint;
  follows: boolean;
  arrived: boolean;
}

/** The room save records a successful passage before the interior checkpoint.
 * Resuming that gap places both actors at the paired doorway. Between these
 * boundaries a reload intentionally returns the scout to its last safe point. */
export function clanShipIncidentEscortScene(state: ClanShipIncidentsState | null | undefined, roomId: ClanShipRoomId): ClanShipEscortScene | null {
  const active = state?.activeIncident;
  const safe = getClanShipIncidentEscort(state);
  if (active?.incidentId === 'return-transfer') {
    const key = `${active.acceptedRevision}:${roomId}`;
    if (active.stepIndex < 3 && roomId === 'hangar') {
      return { key, checkpointId: 'waiting', position: { ...clanShipIncidentTarget('return-transfer')!.position }, follows: false, arrived: false };
    }
    if (safe && safe.roomId === roomId) return { ...safe, key, position: { ...safe.position } };
    if (active.stepIndex === 4 && roomId === 'soins') {
      return { key, checkpointId: 'hangar-door', position: { ...clanShipIncidentTarget('return-medical-entry')!.position }, follows: true, arrived: false };
    }
  }
  const receipt = state?.completedIncidents.find(entry => entry.incidentId === 'return-transfer');
  return receipt && roomId === 'soins'
    ? { key: `arrived:${receipt.completedRevision}`, checkpointId: 'medical-station', position: { ...clanShipIncidentTarget('return-medical')!.position }, follows: false, arrived: true }
    : null;
}

export function clanShipIncidentEscortDoorAccess(
  state: ClanShipIncidentsState | null | undefined,
  from: ClanShipRoomId,
  to: ClanShipRoomId,
  actor: ClanShipInteriorPoint,
  escort: ClanShipInteriorPoint | null,
): { allowed: boolean; message: string } {
  const safe = getClanShipIncidentEscort(state);
  if (!safe?.follows || (from !== 'hangar' && from !== 'soins')) return { allowed: true, message: '' };
  const step = getClanShipIncidentStep(state);
  if (from === 'hangar' && to === 'soins' && step?.id === 'medical-entry') {
    const threshold = clanShipIncidentTarget('return-hangar-door')!.position;
    const together = escort && span(escort, threshold) <= CLAN_SHIP_INTERIOR_METRICS.interactionReach &&
      span(actor, threshold) <= CLAN_SHIP_INTERIOR_METRICS.interactionReach;
    return together ? { allowed: true, message: '' }
      : { allowed: false, message: 'Attends le membre accompagné au seuil avant de franchir la porte des soins.' };
  }
  return { allowed: false, message: from === 'hangar'
    ? 'Conduis le membre accompagné au seuil de gauche et confirme le point de passage avant de rejoindre les soins.'
    : 'Le groupe doit atteindre le poste préparé avant de quitter la baie médicale.' };
}

const span = (a: ClanShipInteriorPoint, b: ClanShipInteriorPoint) => Math.hypot(a.x - b.x, a.y - b.y);
const point = ({ x, y }: ClanShipInteriorPoint): ClanShipInteriorPoint => ({ x, y });

export function createClanShipEscortMotion(position: ClanShipInteriorPoint, facing: -1 | 1 = 1): ClanShipEscortMotion {
  return { actor: { ...position, facing }, waypoints: [], leaderTarget: null, repathElapsed: 0, phase: 0, moving: false, blocked: false, pathBuilds: 0 };
}

/** Stop short along the actual navigable path, including its corners. Merely
 * subtracting a vector from the leader can put a follower inside a fixture. */
function stopBeforeLeader(points: readonly ClanShipInteriorPoint[]): ClanShipInteriorPoint[] {
  const result = points.map(point);
  let remaining = CLAN_SHIP_ESCORT_MOTION.followDistance;
  while (result.length > 1) {
    const end = result[result.length - 1];
    const previous = result[result.length - 2];
    const length = span(previous, end);
    if (length <= remaining) { result.pop(); remaining -= length; }
    else {
      const ratio = (length - remaining) / length;
      result[result.length - 1] = { x: previous.x + (end.x - previous.x) * ratio, y: previous.y + (end.y - previous.y) * ratio };
      break;
    }
  }
  return result.slice(1);
}

export function stepClanShipEscortMotion(
  roomId: ClanShipRoomId,
  before: ClanShipEscortMotion,
  leader: ClanShipInteriorPoint,
  elapsedSeconds: number,
  following = true,
): ClanShipEscortMotion {
  if (!following || !Number.isFinite(elapsedSeconds) || elapsedSeconds <= 0) {
    return before.moving ? { ...before, moving: false } : before;
  }
  if (!isClanShipInteriorWalkable(roomId, before.actor) || !isClanShipInteriorWalkable(roomId, leader)) {
    return { ...before, moving: false, blocked: true, waypoints: [] };
  }
  const seconds = Math.min(CLAN_SHIP_INTERIOR_METRICS.maxFrameSeconds, elapsedSeconds);
  if (span(before.actor, leader) <= CLAN_SHIP_ESCORT_MOTION.followDistance + 0.5) {
    return { ...before, moving: false, blocked: false, waypoints: [], repathElapsed: before.repathElapsed + seconds };
  }
  let waypoints = before.waypoints;
  let leaderTarget = before.leaderTarget;
  let repathElapsed = before.repathElapsed + seconds;
  let pathBuilds = before.pathBuilds;
  if (!leaderTarget || span(leaderTarget, leader) >= CLAN_SHIP_ESCORT_MOTION.repathDistance ||
      (repathElapsed >= CLAN_SHIP_ESCORT_MOTION.repathSeconds && (before.blocked || !waypoints.length || span(leaderTarget, leader) > 2))) {
    const path = planClanShipInteriorPath(roomId, before.actor, leader);
    pathBuilds += 1;
    repathElapsed = 0;
    leaderTarget = point(leader);
    if (!path) return { ...before, waypoints: [], leaderTarget, repathElapsed, moving: false, blocked: true, pathBuilds };
    waypoints = stopBeforeLeader(path.points);
  }
  const step = stepClanShipInteriorPath(roomId, before.actor, waypoints,
    seconds * CLAN_SHIP_ESCORT_MOTION.speed / CLAN_SHIP_INTERIOR_METRICS.speed);
  const travelled = span(before.actor, step.actor);
  return {
    actor: step.actor, waypoints: step.remaining, leaderTarget, repathElapsed,
    phase: (before.phase + travelled / 130) % 1,
    moving: travelled > 0.001, blocked: step.blocked, pathBuilds,
  };
}
