import type { CoverNode, WorldBlueprint, WorldPlatform, WorldRect } from "./worldBlueprints";

/**
 * V157 hunt level-design coherence pass.
 *
 * Hunting worlds are assembled from layers that were authored separately: a
 * base template, room-plan features (worldScreens), regional exploration
 * overlays and the Oseris pilot. Each layer is valid alone, but stacked they
 * produced z-fighting double ledges, a deck with no head room under a cave
 * roof and a cover standing inside lava. This pass resolves those conflicts on
 * the final geometry. It only moves existing elements (ids, materials and
 * routes are kept, nothing is added or removed) and is idempotent.
 */

/** Hunter collision body used by HuntCanvas (72 x 116). */
export const HUNTER_BODY_V157 = { width: 72, height: 116 } as const;
/** Heights already used by room-plan ledges; a moved ledge stays on this grid. */
const LEDGE_TIERS = [512, 430, 366, 300] as const;
/** Live jump apex is 720^2 / (2 * 1850) ≈ 140 px; keep a safety margin. */
const REACHABLE_RISE = 130;
const DOUBLE_LEDGE_DY = 30;

const isGenerated = (id: string) => id.startsWith("v112-canopy-");

function horizontalOverlap(a: WorldRect, b: WorldRect): number {
  return Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x));
}
function intersects(a: WorldRect, b: WorldRect): boolean {
  return horizontalOverlap(a, b) > 0 && Math.min(a.y + a.height, b.y + b.height) > Math.max(a.y, b.y);
}

/** Two ledges at almost the same height over the same span read as one
 * flickering ledge and the lower one can never be landed on. */
export function isDoubleLedgeV157(a: WorldRect, b: WorldRect): boolean {
  return Math.abs(a.y - b.y) < DOUBLE_LEDGE_DY && horizontalOverlap(a, b) > 0.4 * Math.min(a.width, b.width);
}

/** Free height above a standing surface under solid geometry (Infinity if open). */
export function headroomV157(surface: WorldRect, platforms: readonly WorldPlatform[]): number {
  let room = Infinity;
  for (const roof of platforms) {
    if (roof === surface || roof.collision !== "solid") continue;
    const gap = surface.y - (roof.y + roof.height);
    if (gap >= 0 && horizontalOverlap(surface, roof) >= HUNTER_BODY_V157.width) room = Math.min(room, gap);
  }
  return room;
}

function ledgeFits(candidate: WorldPlatform, others: readonly WorldPlatform[], world: WorldBlueprint): boolean {
  if (candidate.y < (world.minY ?? 0) + HUNTER_BODY_V157.height) return false;
  if (others.some(other => isDoubleLedgeV157(candidate, other))) return false;
  if (others.some(other => other.collision === "solid" && intersects(candidate, other))) return false;
  if (headroomV157(candidate, others) < HUNTER_BODY_V157.height + 4) return false;
  return reachableFromBelowV157(candidate, others, world);
}

/** A ledge can be climbed to from underneath: a single jump from the floor or
 * a lower ledge, or a climbable that spans its height close by. Dropping from
 * an upper canopy does not count, so arena and story ledges never depend on it. */
export function reachableFromBelowV157(ledge: WorldRect, others: readonly WorldRect[], world: WorldBlueprint): boolean {
  const below = [{ x: 0, y: world.floorY, width: world.width, height: 1 }, ...others];
  const gap = (a: WorldRect) => Math.max(a.x, ledge.x) - Math.min(a.x + a.width, ledge.x + ledge.width);
  // A tall solid wall standing between the two spans (e.g. a region's outer
  // wall) blocks the jump even when the ledges are close.
  const walled = (surface: WorldRect) => others.some(wall => "collision" in wall && wall.collision === "solid" &&
    wall.height >= HUNTER_BODY_V157.height && wall !== surface &&
    wall.x >= Math.min(surface.x + surface.width, ledge.x + ledge.width) - 1 &&
    wall.x + wall.width <= Math.max(surface.x, ledge.x) + 1 &&
    wall.y < surface.y && wall.y + wall.height > ledge.y - HUNTER_BODY_V157.height);
  return below.some(surface => surface.y > ledge.y && surface.y - ledge.y <= REACHABLE_RISE && gap(surface) <= 160 && !walled(surface)) ||
    world.climbables.some(climb => !isGenerated(climb.id) && climb.y <= ledge.y + 24 &&
      climb.y + climb.height >= ledge.y && gap(climb) <= 120);
}

function retierRoomLedges(world: WorldBlueprint, platforms: WorldPlatform[]): void {
  for (let index = 0; index < platforms.length; index++) {
    const ledge = platforms[index];
    if (!ledge.id.startsWith("feature-") || ledge.collision !== "one-way") continue;
    const others = platforms.filter((_, other) => other !== index && !isGenerated(platforms[other].id));
    // Re-evaluated on the final world: a later overlay (pilot caves, regions)
    // may have made an earlier, valid tier collide with new solid geometry.
    if (ledgeFits(ledge, others, world)) continue;
    const tiers = [...LEDGE_TIERS].sort((a, b) => Math.abs(a - ledge.y) - Math.abs(b - ledge.y) || a - b);
    for (const y of tiers) {
      const candidate = { ...ledge, y };
      if (ledgeFits(candidate, others, world)) { platforms[index] = candidate; break; }
    }
  }
}

function clearHeadroom(world: WorldBlueprint, platforms: WorldPlatform[]): void {
  for (let index = 0; index < platforms.length; index++) {
    const ledge = platforms[index];
    if (ledge.collision !== "one-way" || isGenerated(ledge.id)) continue;
    const room = headroomV157(ledge, platforms);
    if (room >= HUNTER_BODY_V157.height) continue;
    // Lower the ledge just enough to stand under the roof, if that still
    // leaves a real step above the floor; otherwise leave it for review.
    const y = ledge.y + (HUNTER_BODY_V157.height + 2 - room);
    if (y <= world.floorY - 24) platforms[index] = { ...ledge, y };
  }
}

function relocateCoversOutOfDamage(world: WorldBlueprint): CoverNode[] {
  const damaging = world.hazards.filter(hazard => !hazard.cycle && hazard.damagePerSecond > 0);
  const inDamage = (rect: WorldRect) => damaging.some(hazard => intersects(rect, hazard));
  return world.covers.map(cover => {
    if (!inDamage(cover) || Math.abs(cover.y + cover.height - world.floorY) > 8) return cover;
    const hazard = damaging.find(item => intersects(cover, item))!;
    const options = [hazard.x - cover.width - 12, hazard.x + hazard.width + 12]
      .filter(x => x >= 0 && x + cover.width <= world.width)
      .sort((a, b) => Math.abs(a - cover.x) - Math.abs(b - cover.x));
    for (const x of options) {
      const moved = { ...cover, x };
      if (!inDamage(moved)) return moved;
    }
    return cover;
  });
}

export function resolveHuntGeometryConflictsV157(world: WorldBlueprint): WorldBlueprint {
  const platforms = [...world.platforms];
  clearHeadroom(world, platforms);
  retierRoomLedges(world, platforms);
  const covers = relocateCoversOutOfDamage(world);
  const unchanged = platforms.every((platform, index) => platform === world.platforms[index]) &&
    covers.every((cover, index) => cover === world.covers[index]);
  return unchanged ? world : { ...world, platforms, covers };
}
