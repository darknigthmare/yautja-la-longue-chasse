import type { ControlActionId, ControlBindings } from "./controlBindings";
import type { YouthInput } from "./youthTraining";

export const YOUTH_CONTROL_ACTIONS = {
  left: "pit.p1MoveLeft", right: "pit.p1MoveRight", jump: "pit.p1Jump", light: "pit.p1AttackLight",
  blade: "pit.p1AttackMedium", dodge: "pit.p1AttackTechnique", throw: "pit.p1Throw",
  interact: "pit.p1Resource", pause: "pit.pause",
} as const satisfies Record<string, ControlActionId>;
export type YouthTouchAction = "left" | "right" | "jump" | "light" | "blade" | "dodge" | "throw" | "interact" | "confirm" | "retry";
export interface YouthPadLike { connected: boolean; mapping?: string; axes: readonly number[]; buttons: readonly { pressed: boolean; value?: number }[] }
export function sampleYouthControls(codes: ReadonlySet<string>, touch: ReadonlySet<YouthTouchAction>, bindings: ControlBindings, pad: YouthPadLike | null) {
  const bound = (id: ControlActionId) => bindings[id].some(code => codes.has(code));
  const button = (index: number) => pad?.connected === true && pad.mapping === "standard" && pad.buttons[index]?.pressed === true;
  const axis = pad?.connected === true && pad.mapping === "standard" && Number.isFinite(pad.axes[0]) ? pad.axes[0] : 0;
  const left = bound(YOUTH_CONTROL_ACTIONS.left) || touch.has("left") || button(14) || axis < -0.35;
  const right = bound(YOUTH_CONTROL_ACTIONS.right) || touch.has("right") || button(15) || axis > 0.35;
  const actions: YouthInput = {
    move: left === right ? 0 : left ? -1 : 1,
    jump: bound(YOUTH_CONTROL_ACTIONS.jump) || touch.has("jump") || button(0),
    light: bound(YOUTH_CONTROL_ACTIONS.light) || touch.has("light") || button(2),
    blade: bound(YOUTH_CONTROL_ACTIONS.blade) || touch.has("blade") || button(3),
    dodge: bound(YOUTH_CONTROL_ACTIONS.dodge) || touch.has("dodge") || button(1),
    throw: bound(YOUTH_CONTROL_ACTIONS.throw) || touch.has("throw") || button(5),
    interact: bound(YOUTH_CONTROL_ACTIONS.interact) || touch.has("interact") || button(4),
    confirm: codes.has("Enter") || touch.has("confirm") || button(0),
    retry: codes.has("Enter") || touch.has("retry") || button(0),
  };
  const pause = bound(YOUTH_CONTROL_ACTIONS.pause) || button(9);
  const choiceStep = button(12) === button(13) ? 0 : button(12) ? -1 : 1;
  return { actions, pause, choiceStep, neutral: !left && !right && !pause && !button(12) && !button(13) && !Object.values(actions).some(Boolean) };
}
