/** Extension 01 §32. Presentation events never change combat, saves or readiness.
 * Native select/deselect drawings are not available yet: this is the UI lifecycle,
 * not an admission of idle/intro frames as new character animation.
 */
export const PIT_SELECTION_PRESENTATION_PHASES_V1 = [
  "hover", "preview", "confirm", "waiting", "costume", "deselect", "team", "depart",
] as const;
export type PitSelectionPresentationPhaseV1 = typeof PIT_SELECTION_PRESENTATION_PHASES_V1[number];
export type PitPresentationSlotV1 = "player" | "opponent";

export interface PitSelectionIdentityV1 {
  readonly fighterId: string;
  readonly variantId: string | null;
  readonly personal: boolean;
}
export interface PitSelectionCueV1 {
  readonly identity: PitSelectionIdentityV1;
  readonly phase: PitSelectionPresentationPhaseV1;
  /** A callback for an old generation must never settle a newer selection. */
  readonly generation: number;
}
export interface PitSelectionPresentationV1 {
  readonly generation: number;
  readonly player: PitSelectionCueV1;
  readonly opponent: PitSelectionCueV1;
}
export type PitSelectionPresentationActionV1 =
  | { readonly type: "present"; readonly slot: PitPresentationSlotV1; readonly identity: PitSelectionIdentityV1; readonly phase: PitSelectionPresentationPhaseV1 }
  | { readonly type: "settle"; readonly slot: PitPresentationSlotV1; readonly generation: number }
  | { readonly type: "team" | "depart"; readonly player: PitSelectionIdentityV1; readonly opponent: PitSelectionIdentityV1 };

export function samePitSelectionIdentityV1(a: PitSelectionIdentityV1, b: PitSelectionIdentityV1): boolean {
  return a.fighterId === b.fighterId && a.variantId === b.variantId && a.personal === b.personal;
}

export function createPitSelectionPresentationV1(
  player: PitSelectionIdentityV1,
  opponent: PitSelectionIdentityV1,
): PitSelectionPresentationV1 {
  return {
    generation: 0,
    player: { identity: { ...player }, phase: "preview", generation: 0 },
    opponent: { identity: { ...opponent }, phase: "preview", generation: 0 },
  };
}

/** Durations belong to the interface only; no simulation tick or resource is spent. */
export function pitSelectionCueDurationV1(phase: PitSelectionPresentationPhaseV1): number | null {
  if (phase === "confirm" || phase === "team") return 360;
  if (phase === "deselect" || phase === "costume") return 240;
  if (phase === "hover") return 160;
  return null;
}

export function reducePitSelectionPresentationV1(
  state: PitSelectionPresentationV1,
  action: PitSelectionPresentationActionV1,
): PitSelectionPresentationV1 {
  if (action.type === "settle") {
    const cue = state[action.slot];
    if (cue.generation !== action.generation || pitSelectionCueDurationV1(cue.phase) === null) return state;
    return { ...state, [action.slot]: { ...cue, phase: cue.phase === "confirm" || cue.phase === "team" ? "waiting" : "preview" } };
  }
  const generation = state.generation + 1;
  if (action.type !== "present") return {
    generation,
    player: { identity: { ...action.player }, phase: action.type, generation },
    opponent: { identity: { ...action.opponent }, phase: action.type, generation },
  };
  // Pointer movement must not interrupt a confirmation, costume change or exit.
  const previous = state[action.slot];
  if (action.phase === "hover" && samePitSelectionIdentityV1(previous.identity, action.identity) &&
      previous.phase !== "preview" && previous.phase !== "hover") return state;
  if (previous.phase === action.phase && samePitSelectionIdentityV1(previous.identity, action.identity)) return state;
  return { ...state, generation, [action.slot]: { identity: { ...action.identity }, phase: action.phase, generation } };
}

/** External mode/identity changes cannot display a stale actor's gesture. */
export function currentPitSelectionCueV1(cue: PitSelectionCueV1, identity: PitSelectionIdentityV1): PitSelectionCueV1 {
  return samePitSelectionIdentityV1(cue.identity, identity) ? cue : { identity, phase: "preview", generation: cue.generation };
}

export function pitSelectionCueLabelV1(phase: PitSelectionPresentationPhaseV1, confirmed: boolean): string {
  if (phase === "confirm") return "CHOIX CONFIRMÉ";
  if (phase === "costume") return "APPARENCE CHOISIE";
  if (phase === "deselect") return "CHOIX ROUVERT";
  if (phase === "team") return "RENCONTRE PRÊTE";
  if (phase === "depart") return "VERS L’ARÈNE";
  return confirmed ? "PRÊT" : "SÉLECTION";
}
