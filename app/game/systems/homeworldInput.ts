/** Homeworld owns a pad only while focused; every context change needs neutral. */
export type HomeworldPadContext = "inactive" | "world" | "dialog" | "paused";
export interface HomeworldPad {
  readonly connected: boolean;
  readonly id: string;
  readonly index: number;
  readonly axes: readonly number[];
  readonly buttons: readonly { readonly pressed: boolean }[];
}
interface HomeworldPadSample {
  left: boolean; right: boolean; up: boolean; down: boolean; jump: boolean;
  confirm: boolean; cancel: boolean; pause: boolean; menuUp: boolean; menuDown: boolean;
}
export interface HomeworldGamepadState {
  readonly context: HomeworldPadContext;
  readonly controller: string | null;
  readonly ready: boolean;
  readonly previous: Readonly<HomeworldPadSample>;
}
const neutral = (): HomeworldPadSample => ({ left: false, right: false, up: false, down: false,
  jump: false, confirm: false, cancel: false, pause: false, menuUp: false, menuDown: false });

export function createHomeworldGamepadState(): HomeworldGamepadState {
  return { context: "inactive", controller: null, ready: false, previous: neutral() };
}

/** Polling is pure: no DOM, storage, rewards or timing-dependent auto-repeat. */
export function stepHomeworldGamepad(state: HomeworldGamepadState, pad: HomeworldPad | null, context: HomeworldPadContext) {
  const empty = { movement: { left: false, right: false, up: false, down: false, jump: false },
    actions: { confirm: false, cancel: false, pause: false, menuDirection: 0 as -1 | 0 | 1 } };
  if (context === "inactive" || !pad?.connected) return { state: createHomeworldGamepadState(), ...empty };
  const button = (index: number) => pad.buttons[index]?.pressed === true;
  const x = Number.isFinite(pad.axes[0]) ? pad.axes[0] : 0;
  const y = Number.isFinite(pad.axes[1]) ? pad.axes[1] : 0;
  const sample: HomeworldPadSample = {
    left: button(14) || x < -.22, right: button(15) || x > .22,
    up: button(12) || y < -.35, down: button(13) || y > .35,
    jump: button(2), confirm: button(0), cancel: button(1), pause: button(9),
    menuUp: button(12) || y < -.5, menuDown: button(13) || y > .5,
  };
  const controller = `${pad.index}:${pad.id}`;
  const sameContext = state.context === context && state.controller === controller;
  const ready = sameContext && state.ready || Object.values(sample).every(value => !value);
  const previous = sameContext ? state.previous : neutral();
  const next: HomeworldGamepadState = { context, controller, ready, previous: sample };
  if (!ready) return { state: next, ...empty };
  const dialog = context === "dialog", world = context === "world";
  const menuDirection: -1 | 0 | 1 = !dialog || sample.menuDown === sample.menuUp ? 0
    : sample.menuDown && !previous.menuDown ? 1 : sample.menuUp && !previous.menuUp ? -1 : 0;
  return {
    state: next,
    movement: world ? { left: sample.left, right: sample.right, up: sample.up, down: sample.down, jump: sample.jump } : empty.movement,
    actions: {
      confirm: (world || dialog) && sample.confirm && !previous.confirm,
      cancel: dialog && sample.cancel && !previous.cancel,
      pause: (world || context === "paused") && sample.pause && !previous.pause,
      menuDirection,
    },
  };
}

export function nextHomeworldDialogChoice(current: number, count: number, direction: -1 | 1): number {
  if (count <= 0) return -1;
  if (current < 0 || current >= count) return direction === 1 ? 0 : count - 1;
  return (current + direction + count) % count;
}
