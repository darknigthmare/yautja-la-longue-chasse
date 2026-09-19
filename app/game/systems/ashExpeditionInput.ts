import type { HomeworldPad } from "./homeworldInput";

export type AshPadContext = "inactive" | "world" | "paused" | "dialog";
interface AshPadSample {
  moveX: number; jump: boolean; scan: boolean; interact: boolean;
  cancel: boolean; pause: boolean; up: boolean; down: boolean;
}
export interface AshGamepadState {
  readonly context: AshPadContext;
  readonly controller: string | null;
  readonly ready: boolean;
  readonly previous: Readonly<AshPadSample>;
}
const neutral = (): AshPadSample => ({ moveX: 0, jump: false, scan: false, interact: false,
  cancel: false, pause: false, up: false, down: false });
export function createAshGamepadState(): AshGamepadState {
  return { context: "inactive", controller: null, ready: false, previous: neutral() };
}

/** Each focus/modal/controller transition requires all used controls to be released. */
export function stepAshGamepad(state: AshGamepadState, pad: HomeworldPad | null, context: AshPadContext) {
  const empty = { moveX: 0, jump: false, scan: false, interact: false, confirm: false,
    cancel: false, pause: false, menuDirection: 0 as -1 | 0 | 1 };
  if (context === "inactive" || !pad?.connected) return { state: createAshGamepadState(), ...empty };
  const button = (index: number) => pad.buttons[index]?.pressed === true;
  const x = Number.isFinite(pad.axes[0]) ? Math.max(-1, Math.min(1, pad.axes[0])) : 0;
  const y = Number.isFinite(pad.axes[1]) ? pad.axes[1] : 0;
  const left = button(14), right = button(15);
  const sample: AshPadSample = {
    moveX: left === right ? Math.abs(x) > .2 ? x : 0 : left ? -1 : 1,
    jump: button(0), scan: button(2), interact: button(3), cancel: button(1), pause: button(9),
    up: button(12) || y < -.5, down: button(13) || y > .5,
  };
  const controller = `${pad.index}:${pad.id}`;
  const same = state.context === context && state.controller === controller;
  const released = Math.abs(x) <= .2 && Math.abs(y) <= .2
    && ![0, 1, 2, 3, 9, 12, 13, 14, 15].some(button);
  const ready = same && state.ready || released;
  const previous = same ? state.previous : neutral();
  const next: AshGamepadState = { context, controller, ready, previous: sample };
  if (!ready) return { state: next, ...empty };
  const world = context === "world", menu = context === "dialog" || context === "paused";
  const edge = (name: Exclude<keyof AshPadSample, "moveX">) => sample[name] && !previous[name];
  const menuDirection: -1 | 0 | 1 = !menu || sample.up === sample.down ? 0
    : edge("down") ? 1 : edge("up") ? -1 : 0;
  return { state: next, moveX: world ? sample.moveX : 0,
    jump: world && edge("jump"), scan: world && edge("scan"), interact: world && edge("interact"),
    confirm: menu && edge("jump"), cancel: edge("cancel"),
    pause: (world || context === "paused") && edge("pause"), menuDirection };
}
