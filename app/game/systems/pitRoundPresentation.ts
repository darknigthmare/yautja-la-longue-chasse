import { PIT_ROUND_TRANSITION_FRAMES, PIT_TICK_RATE, type PitCombatState } from "./pitCombat";

/** Presentation only: never serialized into combat state, saves or replay ticks. */
export type PitRoundPresentationPhase = "idle" | "intro-left" | "intro-right" | "countdown" | "fight" | "round-result" | "match-result";
export interface PitRoundPresentationView {
  phase: PitRoundPresentationPhase;
  elapsedMs: number;
  durationMs: number;
  round: number;
  fighterSlot?: 0 | 1;
  countdown?: 3 | 2 | 1;
  winnerSlot?: 0 | 1 | null;
  blocksSimulation: boolean;
  resultVisible: boolean;
}
export const PIT_PRESENTATION_INTRO_MS = 1_200;
export const PIT_PRESENTATION_COUNTDOWN_MS = 3_000;
export const PIT_PRESENTATION_FIGHT_SIGNAL_MS = 650;
export const PIT_PRESENTATION_RESULT_MS = 2_200;
export const PIT_PRESENTATION_MAX_STEP_MS = 100;

function view(phase: PitRoundPresentationPhase, round: number, winnerSlot?: 0 | 1 | null): PitRoundPresentationView {
  const durationMs = phase === "intro-left" || phase === "intro-right" ? PIT_PRESENTATION_INTRO_MS
    : phase === "countdown" ? PIT_PRESENTATION_COUNTDOWN_MS
    : phase === "fight" ? PIT_PRESENTATION_FIGHT_SIGNAL_MS
    : phase === "round-result" ? PIT_ROUND_TRANSITION_FRAMES * 1_000 / PIT_TICK_RATE
    : phase === "match-result" ? PIT_PRESENTATION_RESULT_MS : 0;
  return { phase, elapsedMs: 0, durationMs, round,
    ...(phase === "intro-left" ? { fighterSlot: 0 as const } : phase === "intro-right" ? { fighterSlot: 1 as const } : {}),
    ...(phase === "countdown" ? { countdown: 3 as const } : {}),
    ...(winnerSlot !== undefined ? { winnerSlot } : {}),
    blocksSimulation: phase === "intro-left" || phase === "intro-right" || phase === "countdown" || phase === "match-result" || phase === "idle",
    resultVisible: false,
  };
}
function winner(combat: PitCombatState): 0 | 1 | null {
  const id = combat.matchWinnerId ?? combat.lastRoundResult?.winnerId;
  if (!id) return null;
  const [left, right] = combat.fighters;
  if (left.definitionId !== right.definitionId) return left.definitionId === id ? 0 : 1;
  if (combat.phase === "match-over" && left.roundsWon !== right.roundsWon) return left.roundsWon > right.roundsWon ? 0 : 1;
  if (left.health !== right.health) return left.health > right.health ? 0 : 1;
  return null; // Ambiguous old data must not invent a winner for slot one.
}
export function createPitRoundPresentation(combat: PitCombatState | null): PitRoundPresentationView {
  if (!combat) return view("idle", 0);
  if (combat.phase === "match-over") return view("match-result", combat.round, winner(combat));
  if (combat.phase === "round-over") return view("round-result", combat.round, winner(combat));
  // The lab owns an exact tick clock and guided briefing. It has no cinematic delay.
  if (combat.rules.mode === "training") return { ...view("fight", combat.round), elapsedMs: PIT_PRESENTATION_FIGHT_SIGNAL_MS };
  return view(combat.round === 1 && combat.frame === 0 ? "intro-left" : "countdown", combat.round);
}

/** Observe deterministic transitions without advancing their engine clock. */
export function observePitRoundPresentation(current: PitRoundPresentationView, combat: PitCombatState | null): PitRoundPresentationView {
  if (!combat) return current.phase === "idle" ? current : view("idle", 0);
  if (combat.phase === "match-over") return current.phase === "match-result" && current.round === combat.round ? current : view("match-result", combat.round, winner(combat));
  if (combat.phase === "round-over") return current.phase === "round-result" && current.round === combat.round ? current : view("round-result", combat.round, winner(combat));
  if (current.phase === "idle") return createPitRoundPresentation(combat);
  if (current.round !== combat.round || current.phase === "round-result") {
    return combat.rules.mode === "training" ? createPitRoundPresentation(combat) : view("countdown", combat.round);
  }
  return current;
}

/** Bounded wall-clock updates; the caller freezes this for pause/hidden/loading. */
export function advancePitRoundPresentation(current: PitRoundPresentationView, combat: PitCombatState | null, elapsedMs: number, frozen = false): PitRoundPresentationView {
  const observed = observePitRoundPresentation(current, combat);
  if (frozen || observed.phase === "idle" || !Number.isFinite(elapsedMs) || elapsedMs <= 0) return observed;
  const elapsed = Math.min(observed.durationMs, observed.elapsedMs + Math.min(PIT_PRESENTATION_MAX_STEP_MS, elapsedMs));
  if (elapsed === observed.elapsedMs) return observed;
  if (elapsed >= observed.durationMs) {
    if (observed.phase === "intro-left") return view("intro-right", observed.round);
    if (observed.phase === "intro-right") return view("countdown", observed.round);
    if (observed.phase === "countdown") return view("fight", observed.round);
  }
  return { ...observed, elapsedMs: elapsed,
    ...(observed.phase === "countdown" ? { countdown: Math.max(1, 3 - Math.floor(elapsed / 1_000)) as 3 | 2 | 1 } : {}),
    resultVisible: observed.phase === "match-result" && elapsed >= observed.durationMs,
  };
}
export function canPitPresentationAcceptInput(presentation: PitRoundPresentationView): boolean {
  return presentation.phase === "fight";
}
