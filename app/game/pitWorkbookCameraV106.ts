import {getPitSuperCameraV106, PIT_ARENAS, type PitCombatState} from './systems/pitCombat';
import {advancePitPresentationCamera, getPitPresentationBounds, type PitPresentationCamera} from './systems/pitCamera';

export type PitWorkbookCameraV106 = PitPresentationCamera & {readonly workbookSuperV106?: true};
export function isPitWorkbookSuperCameraV106(camera: PitPresentationCamera): boolean {
  return 'workbookSuperV106' in camera && camera.workbookSuperV106 === true;
}

/** A confirmed source signature briefly widens the existing duel framing. The
 * native silhouettes, weapon tips and live entities still fit. Ending or
 * interrupting the sequence restores the ordinary camera on that same tick. */
export function advancePitWorkbookCameraV106(
  previous: PitPresentationCamera | null, state: PitCombatState, reducedMotion: boolean,
): PitWorkbookCameraV106 {
  const focus = reducedMotion ? null : getPitSuperCameraV106(state);
  const baseline = advancePitPresentationCamera(previous && isPitWorkbookSuperCameraV106(previous) ? null : previous,
    state, {reducedMotion});
  if (!focus) return baseline;
  const arena = PIT_ARENAS[state.arenaId], bounds = getPitPresentationBounds(state);
  const zoom = Math.min(baseline.zoom, focus.zoom);
  const halfWidth = arena.width / (2 * zoom), halfHeight = arena.height / (2 * zoom);
  const clamp = (value: number, low: number, high: number) => Math.max(low, Math.min(high, value));
  return {...baseline, zoom, targetZoom: zoom,
    centerX: clamp(focus.x, bounds.right - halfWidth, bounds.left + halfWidth),
    centerY: clamp(arena.groundY - focus.y, bounds.bottom - halfHeight, bounds.top + halfHeight),
    workbookSuperV106: true};
}
