import {
  huntStructuralBarrierV94,
  type HuntBarrierPlatformV94,
} from "./huntStructuralBarrierV94";

export const SECONDARY_TROPHY_REACH = 110;
export const APEX_TROPHY_REACH = 125;

export interface TrophyHarvestBody {
  x: number; y: number; width: number; height: number;
}
export interface TrophyHarvestPlayer extends TrophyHarvestBody {
  grounded: boolean; climbing: boolean;
}
export interface TrophyHarvestSource extends TrophyHarvestBody {
  id: string; archetype: string; health: number;
  alive: boolean; active: boolean; boss: boolean;
}
export interface TrophyHarvestDropSource {
  enemyRuntimeId: string; sourceEnemyId: string; collected: boolean;
  claim: { sourceEnemyId?: string };
}

function physicalBody(body: TrophyHarvestBody): boolean {
  return [body.x, body.y, body.width, body.height].every(Number.isFinite) &&
    body.width > 0 && body.height > 0;
}

/** The removable part stays with its actual body on the current ledge.
 * This point never projects a canopy kill onto the global floor. */
export function trophyHarvestPoint(
  body: TrophyHarvestBody,
  heightAboveFeet = 24,
): { x: number; y: number } {
  return { x: body.x + body.width / 2, y: body.y + body.height - heightAboveFeet };
}

/** A secondary claim belongs to exactly one real defeated regular actor.
 * Collected claims cannot become another source after a retry or second input. */
export function trophyHarvestSourceForDrop<T extends TrophyHarvestSource>(
  drop: TrophyHarvestDropSource,
  actors: readonly T[],
): T | null {
  if (drop.collected !== false) return null;
  return actors.find(actor =>
    actor.id === drop.enemyRuntimeId &&
    actor.archetype === drop.sourceEnemyId &&
    drop.claim?.sourceEnemyId === actor.archetype &&
    actor.alive === false && actor.active === true && actor.boss === false && actor.health === 0 &&
    physicalBody(actor)
  ) ?? null;
}

/** Used for the prompt, start, every gesture and final collection.
 * A field rite needs stable footing and cannot reach through a solid wall.
 * One-way platforms remain traversable and do not act as sight walls. */
export function trophyHarvestInReach(
  player: TrophyHarvestPlayer,
  target: { x: number; y: number },
  platforms: readonly HuntBarrierPlatformV94[],
  reach = SECONDARY_TROPHY_REACH,
): boolean {
  if (!physicalBody(player) || player.grounded !== true || player.climbing !== false ||
      ![target.x, target.y, reach].every(Number.isFinite) || reach <= 0) return false;
  const center = { x: player.x + player.width / 2, y: player.y + player.height / 2 };
  return Math.hypot(center.x - target.x, center.y - target.y) <= reach &&
    !huntStructuralBarrierV94(center, target, platforms);
}
