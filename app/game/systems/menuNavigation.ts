/** Controller menu navigation, independent from combat bindings and browser state. */
export type MenuDirection = "up" | "down" | "left" | "right";
export interface MenuPoint { x: number; y: number; }

export function menuFocusIndex(points: readonly MenuPoint[], current: number, direction: MenuDirection): number {
  if (!points.length) return -1;
  if (current < 0 || current >= points.length) return 0;
  const origin = points[current];
  const horizontal = direction === "left" || direction === "right";
  const sign = direction === "left" || direction === "up" ? -1 : 1;
  let best = -1;
  let bestScore = Infinity;
  points.forEach((point, index) => {
    if (index === current) return;
    const along = ((horizontal ? point.x - origin.x : point.y - origin.y)) * sign;
    const across = Math.abs(horizontal ? point.y - origin.y : point.x - origin.x);
    if (along <= 1) return;
    const score = along + across * 3;
    if (score < bestScore) { bestScore = score; best = index; }
  });
  // DOM order remains an escape route from irregular grids or equal centres.
  return best >= 0 ? best : (current + sign + points.length) % points.length;
}

export interface MenuPadFrame { direction: MenuDirection | null; confirm: boolean; back: boolean; }
export interface MenuPadState { armed: boolean; direction: MenuDirection | null; nextRepeat: number; confirm: boolean; back: boolean; }
export const freshMenuPadState = (): MenuPadState => ({ armed: false, direction: null, nextRepeat: 0, confirm: false, back: false });

export function menuPadStep(state: MenuPadState, frame: MenuPadFrame, now: number) {
  if (!state.armed) {
    const armed = !frame.direction && !frame.confirm && !frame.back;
    return { state: { ...freshMenuPadState(), armed }, direction: null, confirm: false, back: false };
  }
  const changed = frame.direction !== state.direction;
  const move = frame.direction && (changed || now >= state.nextRepeat) ? frame.direction : null;
  return {
    direction: move,
    confirm: frame.confirm && !state.confirm,
    back: frame.back && !state.back,
    state: { armed: true, direction: frame.direction, confirm: frame.confirm, back: frame.back,
      nextRepeat: move ? now + (changed ? 340 : 120) : state.nextRepeat },
  };
}
