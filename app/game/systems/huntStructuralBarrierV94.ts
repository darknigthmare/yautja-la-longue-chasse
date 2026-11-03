/** Structural collision only: one-way ledges and decorative props are not walls.
 * Cover attenuation/destruction remains owned by the existing combat rules.
 */
export interface HuntBarrierPointV94 { x: number; y: number }
export interface HuntBarrierPlatformV94 {
  x: number; y: number; width: number; height: number; collision?: string;
}

/** True when the open attack segment enters the interior of a solid platform.
 * A tangent/corner contact or an endpoint merely touching a wall is not a crossing.
 * Starting inside a solid volume is blocked, including a zero-length segment.
 */
export function huntStructuralBarrierV94(
  source: HuntBarrierPointV94,
  target: HuntBarrierPointV94,
  platforms: readonly HuntBarrierPlatformV94[] = [],
): boolean {
  if (![source.x, source.y, target.x, target.y].every(Number.isFinite)) return true;
  return platforms.some(platform => {
    if (platform.collision !== 'solid') return false;
    if (![platform.x, platform.y, platform.width, platform.height].every(Number.isFinite) ||
        platform.width <= 0 || platform.height <= 0) return true;
    let enter = 0, leave = 1;
    for (const [origin, delta, low, high] of [
      [source.x, target.x - source.x, platform.x, platform.x + platform.width],
      [source.y, target.y - source.y, platform.y, platform.y + platform.height],
    ]) {
      if (delta === 0) {
        if (origin <= low || origin >= high) return false;
      } else {
        const a = (low - origin) / delta, b = (high - origin) / delta;
        enter = Math.max(enter, Math.min(a, b));
        leave = Math.min(leave, Math.max(a, b));
        if (enter >= leave) return false;
      }
    }
    return enter < leave;
  });
}
