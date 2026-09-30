import type { PitBox, PitFighterState } from './pitCombat';

/** Measured active frame 2 of the two independently authored V59 PNG pages.
 * Coordinates are local to their atlas cells, not inferred from alpha bounds.
 * Both the native drawings and combat use the unchanged 119-unit Feral body.
 */
export const PIT_FERAL_NATIVE_MUZZLES = Object.freeze({
  right: { pivot: [365, 463], muzzle: [848, 174], sourceBodyHeight: 470 },
  left: { pivot: [559, 471], muzzle: [33, 156], sourceBodyHeight: 470 },
});

export function pitFeralUsesNativeLauncher(fighter: PitFighterState): boolean {
  return fighter.definitionId === 'feral-hunter' && !fighter.variantId &&
    fighter.grounded && !fighter.crouching && fighter.guard !== 'low';
}

export function getPitFeralNativeMuzzle(fighter: PitFighterState, bodyHeight: number): {
  x: number; y: number; railSpacing: number;
} {
  const pose = PIT_FERAL_NATIVE_MUZZLES[fighter.facing === 1 ? 'right' : 'left'];
  const scale = bodyHeight / pose.sourceBodyHeight;
  return { x: fighter.x + (pose.muzzle[0] - pose.pivot[0]) * scale,
    y: fighter.y + (pose.pivot[1] - pose.muzzle[1]) * scale,
    railSpacing: 6 * scale };
}

/** Swept axis-aligned projectile versus a hurtbox. Testing the union rectangle
 * alone would incorrectly hit targets outside a diagonal flight segment.
 * This launch-only sweep is consumed within one tick; it is never serialized.
 */
export function pitFeralLaunchSweepTouches(start: PitBox, end: PitBox, target: PitBox): boolean {
  let enter = 0;
  let exit = 1;
  for (const axis of ['x', 'y'] as const) {
    const size = axis === 'x' ? 'width' : 'height';
    const delta = end[axis] - start[axis];
    const min = target[axis] - start[size];
    const max = target[axis] + target[size];
    if (delta === 0) {
      if (start[axis] <= min || start[axis] >= max) return false;
      continue;
    }
    const a = (min - start[axis]) / delta;
    const b = (max - start[axis]) / delta;
    enter = Math.max(enter, Math.min(a, b));
    exit = Math.min(exit, Math.max(a, b));
    if (enter >= exit) return false;
  }
  return enter < exit;
}
