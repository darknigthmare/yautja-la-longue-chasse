/** Selection state is presentation only: no save, replay or progression data. */
export type PitSelectionStep = "fighters" | "stage";
export type PitSelectionSlot = "player" | "opponent";
export interface PitSelectionState {
  readonly step: PitSelectionStep;
  readonly slot: PitSelectionSlot;
  readonly confirmedPlayer: string | null;
  readonly confirmedOpponent: string | null;
}
export const createPitSelectionState = (): PitSelectionState => ({ step: "fighters", slot: "player", confirmedPlayer: null, confirmedOpponent: null });
export type PitSelectionAction =
  | { readonly type: "pick"; readonly slot: PitSelectionSlot }
  | { readonly type: "confirm"; readonly player: string; readonly opponent: string; readonly eventOnly?: boolean }
  | { readonly type: "back" }
  | { readonly type: "edit"; readonly slot: PitSelectionSlot };
export function reducePitSelection(state: PitSelectionState, action: PitSelectionAction): PitSelectionState {
  if (action.type === "edit" || action.type === "pick") return {
    ...state, step: "fighters", slot: action.slot,
    confirmedPlayer: action.slot === "player" ? null : state.confirmedPlayer,
    confirmedOpponent: null,
  };
  if (action.type === "back") return state.step === "stage"
    ? { ...state, step: "fighters", slot: "opponent" }
    : { ...state, slot: "player", confirmedPlayer: null, confirmedOpponent: null };
  if (state.step === "stage" || !action.player || !action.opponent || (!action.eventOnly && action.player === action.opponent)) return state;
  if (state.slot === "player" || state.confirmedPlayer !== action.player) return {
    step: "fighters", slot: "opponent", confirmedPlayer: action.player, confirmedOpponent: null,
  };
  return { ...state, step: "stage", confirmedOpponent: action.opponent };
}

/** Roving grid navigation skips unavailable choices, including the duplicate rival. */
export function movePitSelectionIndex(index: number, direction: "left" | "right" | "up" | "down", columns: number, available: readonly boolean[]): number {
  if (!available.length || !available.some(Boolean)) return -1;
  const current = Math.max(0, Math.min(available.length - 1, index));
  const delta = direction === "left" ? -1 : direction === "right" ? 1 : direction === "up" ? -Math.max(1, columns) : Math.max(1, columns);
  for (let distance = 1; distance <= available.length; distance++) {
    const next = (current + delta * distance % available.length + available.length) % available.length;
    if (available[next]) return next;
  }
  return current;
}
