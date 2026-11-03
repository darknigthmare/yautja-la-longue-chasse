import type { ControlActionId, ControlBindings } from "./controlBindings";
import type { NurseryActions } from "./nurseryPrologue";

export const NURSERY_CONTROL_ACTIONS = {
  left: "pit.p1MoveLeft", right: "pit.p1MoveRight", light: "pit.p1AttackLight",
  blade: "pit.p1AttackMedium", dodge: "pit.p1AttackTechnique", throw: "pit.p1Throw",
  pickup: "pit.p1Resource", pause: "pit.pause",
} as const satisfies Record<string, ControlActionId>;
export type NurseryTouchAction = "left" | "right" | "confirm" | "ready" | "light" | "blade" | "dodge" | "throw" | "pickup" | "retry";
export interface NurseryPadLike { connected: boolean; mapping?: string; axes: readonly number[]; buttons: readonly { pressed: boolean; value?: number }[] }
export interface NurseryInputSample { actions: NurseryActions; pause: boolean; neutral: boolean }
/** The prologue uses existing P1 mappings; it never silently restores default keys. */
export function sampleNurseryControls(codes: ReadonlySet<string>, touch: ReadonlySet<NurseryTouchAction>,
  bindings: ControlBindings, pad: NurseryPadLike | null, anyKeyConfirm = false): NurseryInputSample {
  const bound = (id: ControlActionId) => bindings[id].some(code => codes.has(code));
  const button = (index: number) => pad?.connected === true && pad.buttons[index]?.pressed === true;
  const axis = pad?.connected === true && Number.isFinite(pad.axes[0]) ? pad.axes[0] : 0;
  const left = bound(NURSERY_CONTROL_ACTIONS.left) || touch.has("left") || button(14) || axis < -0.35;
  const right = bound(NURSERY_CONTROL_ACTIONS.right) || touch.has("right") || button(15) || axis > 0.35;
  const confirm = codes.has("Enter") || touch.has("confirm") || button(0) || anyKeyConfirm;
  const actions: NurseryActions = {
    move: left === right ? 0 : left ? -1 : 1,
    confirm,
    ready: codes.has("Enter") || touch.has("ready") || button(0),
    light: bound(NURSERY_CONTROL_ACTIONS.light) || touch.has("light") || button(2),
    blade: bound(NURSERY_CONTROL_ACTIONS.blade) || touch.has("blade") || button(3),
    dodge: bound(NURSERY_CONTROL_ACTIONS.dodge) || touch.has("dodge") || button(1),
    throw: bound(NURSERY_CONTROL_ACTIONS.throw) || touch.has("throw") || button(5),
    pickup: bound(NURSERY_CONTROL_ACTIONS.pickup) || touch.has("pickup") || button(4),
    retry: codes.has("Enter") || touch.has("retry") || button(0),
  };
  const pause = bound(NURSERY_CONTROL_ACTIONS.pause) || button(9);
  // Opposing directions are still held input and cannot arm a resumed session.
  const neutral = !left && !right && !pause && !Object.values(actions).some(Boolean);
  return { actions, pause, neutral };
}
