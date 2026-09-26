import type { PitRoundPresentationView } from "./systems/pitRoundPresentation";

export type PitFighterPresentationKind = "intro" | "victory" | "defeat" | "draw" | "waiting" | "ready";
export interface PitFighterPresentationCue {
  readonly kind: PitFighterPresentationKind;
  readonly elapsedMs: number;
  readonly elapsedTicks: number;
  readonly progress: number;
  readonly reducedMotion: boolean;
}
export interface PitFighterPresentationOptions {
  readonly presentation?: PitRoundPresentationView;
  readonly reducedMotion?: boolean;
}

/** Read-only bridge from the round theatre clock, never a forged combat state. */
export function getPitFighterPresentationCue(
  slot: 0 | 1,
  presentation?: PitRoundPresentationView,
  reducedMotion = false,
): PitFighterPresentationCue | null {
  if (!presentation || !Number.isFinite(presentation.elapsedMs) || !Number.isFinite(presentation.durationMs) ||
      presentation.elapsedMs < 0 || presentation.durationMs <= 0 || (slot !== 0 && slot !== 1)) return null;
  let kind: PitFighterPresentationKind;
  if (presentation.phase === "intro-left" || presentation.phase === "intro-right") {
    const active = presentation.fighterSlot ?? (presentation.phase === "intro-left" ? 0 : 1);
    kind = slot === active ? "intro" : presentation.phase === "intro-left" ? "waiting" : "ready";
  } else if (presentation.phase === "countdown") kind = "ready";
  else if (presentation.phase === "round-result" || presentation.phase === "match-result") {
    kind = presentation.winnerSlot === 0 || presentation.winnerSlot === 1
      ? presentation.winnerSlot === slot ? "victory" : "defeat" : "draw";
  } else return null;
  const elapsedMs = Math.min(presentation.elapsedMs, presentation.durationMs);
  return { kind, elapsedMs, elapsedTicks: Math.floor(elapsedMs * 60 / 1000),
    progress: Math.min(1, elapsedMs / presentation.durationMs), reducedMotion };
}

export interface PitFighterPresentationTreatment {
  readonly scale: number;
  readonly alpha: number;
  readonly filter: string;
  readonly glow: string | null;
  readonly glowBlur: number;
}

/** Whole-image stage treatment, explicitly not articulated character animation.
 * Uniform scale never exceeds the normal body envelope, so existing camera bounds
 * still contain the figure; all transforms pivot on the same ground contact.
 */
export function getPitFighterPresentationTreatment(
  cue: PitFighterPresentationCue,
  dedicated = false,
): PitFighterPresentationTreatment {
  const t = cue.reducedMotion ? 1 : Math.min(1, cue.progress * 3);
  const eased = t * t * (3 - 2 * t);
  if (dedicated) return { scale: 1, alpha: 1, filter: "none", glow: null, glowBlur: 0 };
  if (cue.kind === "intro") return { scale: .96 + .04 * eased, alpha: .65 + .35 * eased,
    filter: "none", glow: "#d2fff0", glowBlur: 7 };
  if (cue.kind === "victory") return { scale: .97 + .03 * eased, alpha: 1,
    filter: "none", glow: "#f6d881", glowBlur: 10 };
  if (cue.kind === "defeat") return { scale: 1 - .08 * eased, alpha: 1,
    filter: "grayscale(.72) brightness(.58)", glow: null, glowBlur: 0 };
  if (cue.kind === "waiting") return { scale: 1, alpha: .65, filter: "none", glow: null, glowBlur: 0 };
  return { scale: 1, alpha: 1, filter: "none", glow: null, glowBlur: 0 };
}
