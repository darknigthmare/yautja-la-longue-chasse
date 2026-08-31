import type { WorldPlatform, WorldRect } from "./worldBlueprints";

export interface PlatformMotionBody extends WorldRect {
  velocityX: number;
  velocityY: number;
}

export interface PlatformMotionResult {
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  grounded: boolean;
  hitCeiling: boolean;
  hitWall: boolean;
}

type Contact = { time: number; normalX: -1 | 0 | 1; normalY: -1 | 0 | 1 };
const EPSILON = 1e-7;

function overlaps(start: number, size: number, otherStart: number, otherSize: number): boolean {
  return start + size > otherStart + EPSILON && start < otherStart + otherSize - EPSILON;
}

function overlapsRect(body: WorldRect, platform: WorldRect): boolean {
  return overlaps(body.x, body.width, platform.x, platform.width) &&
    overlaps(body.y, body.height, platform.y, platform.height);
}

/** Restore callers must reject embedded checkpoints before starting simulation. */
export function overlapsSolidPlatform(body: WorldRect, platforms: readonly WorldPlatform[]): boolean {
  return platforms.some((platform) => platform.collision === "solid" && overlapsRect(body, platform));
}

function axisTimes(start: number, size: number, delta: number, wall: number, wallSize: number): [number, number] | null {
  if (Math.abs(delta) < EPSILON) {
    return overlaps(start, size, wall, wallSize) ? [-Infinity, Infinity] : null;
  }
  return delta > 0
    ? [(wall - start - size) / delta, (wall + wallSize - start) / delta]
    : [(wall + wallSize - start) / delta, (wall - start - size) / delta];
}

function solidContact(body: WorldRect, dx: number, dy: number, wall: WorldPlatform): Contact | null {
  const horizontal = axisTimes(body.x, body.width, dx, wall.x, wall.width);
  const vertical = axisTimes(body.y, body.height, dy, wall.y, wall.height);
  if (!horizontal || !vertical) return null;
  const enter = Math.max(horizontal[0], vertical[0]);
  const leave = Math.min(horizontal[1], vertical[1]);
  const timeEpsilon = EPSILON / Math.max(1, Math.abs(dx), Math.abs(dy));
  // An isolated corner touch is tangent motion, not entry into the rectangle.
  if (enter < -timeEpsilon || enter > 1 + timeEpsilon || leave <= enter + timeEpsilon || leave < 0) return null;
  // A corner on one rectangle is a landing/ceiling contact first. Treating
  // both axes as blocked catches a grounded walker on every coplanar tile seam.
  // A separate wall at the same travel time still contributes its own normal.
  const verticalFirst = vertical[0] >= horizontal[0] - timeEpsilon;
  return {
    time: Math.max(0, Math.min(1, enter)),
    normalX: verticalFirst ? 0 : (dx > 0 ? -1 : 1),
    normalY: verticalFirst ? (dy > 0 ? -1 : 1) : 0,
  };
}

function topContact(body: WorldRect, dx: number, dy: number, top: number, platform?: WorldPlatform): Contact | null {
  if (dy <= EPSILON || body.y + body.height > top + EPSILON) return null;
  const time = (top - body.y - body.height) / dy;
  if (time < -EPSILON || time > 1 + EPSILON) return null;
  if (platform && !overlaps(body.x + dx * time, body.width, platform.x, platform.width)) return null;
  return { time: Math.max(0, Math.min(1, time)), normalX: 0, normalY: -1 };
}

/**
 * Sweep the original player box to the desired position, including climb pulls.
 * Solid geometry blocks every face; one-way geometry only catches a descent
 * that starts above its top. Contacts are resolved in travel order, then the
 * remaining motion slides along the unblocked axis. No frame subdivision or
 * fixed movement cap is needed, so fast falls cannot skip a thin platform.
 *
 * Old saves embedded in new solid geometry are never silently teleported out.
 * They may move only toward the nearest separating face until clear; multiple
 * conflicting overlaps stop motion. Callers should detect such a checkpoint
 * with overlapsSolidPlatform and explicitly restore a known safe spawn. This
 * fallback also prevents climb attraction from pushing an embedded body through
 * the far side of a gate. The global floor alone clamps legacy positions below it.
 */
export function resolvePlatformMotion(
  body: PlatformMotionBody,
  desired: { x: number; y: number },
  platforms: readonly WorldPlatform[],
  floorY: number,
): PlatformMotionResult {
  if (![body.x, body.y, body.width, body.height, body.velocityX, body.velocityY, desired.x, desired.y, floorY].every(Number.isFinite) ||
      body.width <= 0 || body.height <= 0) {
    throw new RangeError("Platform motion requires finite coordinates and a positive body size");
  }
  let x = body.x;
  let y = Math.min(body.y, floorY - body.height);
  let dx = desired.x - x;
  let dy = desired.y - y;
  if (!Number.isFinite(dx) || !Number.isFinite(dy)) throw new RangeError("Platform motion displacement overflow");
  let velocityX = body.velocityX;
  let velocityY = body.velocityY;
  let hitWall = false;
  let hitCeiling = false;
  const embedded = new Set<WorldPlatform>();

  for (const platform of platforms) {
    if (![platform.x, platform.y, platform.width, platform.height].every(Number.isFinite) ||
        platform.width <= 0 || platform.height <= 0) {
      throw new RangeError("Platforms require finite coordinates and positive dimensions");
    }
    if (platform.collision !== "solid" || !overlapsRect({ ...body, x, y }, platform)) continue;
    embedded.add(platform);
    const exits = [
      { axis: "x", amount: platform.x - x - body.width },
      { axis: "x", amount: platform.x + platform.width - x },
      { axis: "y", amount: platform.y - y - body.height },
      { axis: "y", amount: platform.y + platform.height - y },
    ] as const;
    const exit = exits.reduce((nearest, candidate) => Math.abs(candidate.amount) < Math.abs(nearest.amount) ? candidate : nearest);
    const nextDx = exit.axis === "x" ? (exit.amount < 0 ? Math.min(0, dx) : Math.max(0, dx)) : 0;
    const nextDy = exit.axis === "y" ? (exit.amount < 0 ? Math.min(0, dy) : Math.max(0, dy)) : 0;
    if (nextDx !== dx) { velocityX = 0; hitWall = true; }
    if (nextDy !== dy) { velocityY = 0; hitCeiling ||= dy < 0; }
    dx = nextDx;
    dy = nextDy;
  }

  // Each blocking contact removes at least one moving axis: at most two slides.
  for (let step = 0; step < 3 && (Math.abs(dx) > EPSILON || Math.abs(dy) > EPSILON); step += 1) {
    const current = { x, y, width: body.width, height: body.height };
    let contact = topContact(current, dx, dy, floorY);
    const timeEpsilon = EPSILON / Math.max(1, Math.abs(dx), Math.abs(dy));
    for (const platform of platforms) {
      if (embedded.has(platform)) continue;
      const next = platform.collision === "solid"
        ? solidContact(current, dx, dy, platform)
        : topContact(current, dx, dy, platform.y, platform);
      if (!next) continue;
      if (!contact || next.time < contact.time - timeEpsilon) contact = next;
      else if (Math.abs(next.time - contact.time) <= timeEpsilon) {
        contact = { time: Math.min(contact.time, next.time), normalX: contact.normalX || next.normalX, normalY: contact.normalY || next.normalY };
      }
    }
    if (!contact) { x += dx; y += dy; break; }
    x += dx * contact.time;
    y += dy * contact.time;
    dx *= 1 - contact.time;
    dy *= 1 - contact.time;
    if (contact.normalX !== 0) { dx = 0; velocityX = 0; hitWall = true; }
    if (contact.normalY !== 0) { dy = 0; velocityY = 0; hitCeiling ||= contact.normalY > 0; }
  }

  // A body can slide off the edge after landing in this frame; only its final
  // support counts as grounded. A later frame resumes gravity normally.
  const bottom = y + body.height;
  const grounded = velocityY >= 0 && (
    Math.abs(bottom - floorY) <= EPSILON ||
    platforms.some((platform) => !embedded.has(platform) && Math.abs(bottom - platform.y) <= EPSILON &&
      overlaps(x, body.width, platform.x, platform.width))
  );
  if (grounded) velocityY = 0;
  return { x, y, velocityX, velocityY, grounded, hitCeiling, hitWall };
}
