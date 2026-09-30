import { PIT_ROUND_FRAMES, type PitCombatState } from "./systems/pitCombat";
import type { PitRoundPresentationView } from "./systems/pitRoundPresentation";
import type { PitStageStoryCueV61, PitStageStoryEventV61, PitStageStoryStageV61 } from "./pitStageStoryV61";

/** Future scenario input only. No current V57 encounter emits these four narrative cues. */
export interface PitStageNarrativeCuesV61 {
  readonly encounterId: string;
  readonly stageId: string;
  readonly cues: readonly {
    readonly cue: PitStageStoryCueV61;
    readonly occurrenceId: string;
    /** Scenario-owned, pausable elapsed ticks; never Date.now or a hit counter. */
    readonly elapsedFrames: number;
  }[];
}
export interface PitStageStoryContextV61 {
  readonly round: number;
  readonly roundFrame: number;
  readonly phase: PitCombatState["phase"];
  readonly training: boolean;
  readonly presentationPhase?: PitRoundPresentationView["phase"];
  readonly presentationRound?: number;
  readonly resultRound?: number;
  readonly resultElapsedFrames?: number;
  readonly winnerId?: string | null;
  readonly fighterIds: readonly string[];
  readonly narrative?: PitStageNarrativeCuesV61;
}
export interface PitStageStoryPoseV61 {
  readonly eventId: string;
  readonly nativeFrame: number;
  readonly active: boolean;
  readonly visible: boolean;
  readonly held: boolean;
  readonly trigger: PitStageStoryEventV61["trigger"];
  readonly occurrence: string | null;
  readonly elapsedFrames: number | null;
}

/** Reads existing clocks only. The finished match alone uses its existing pausable presentation clock. */
export function createPitStageStoryContextV61(state: PitCombatState, presentation?: PitRoundPresentationView,
  narrative?: PitStageNarrativeCuesV61): PitStageStoryContextV61 {
  return {
    round: state.round, roundFrame: PIT_ROUND_FRAMES - state.roundFramesRemaining, phase: state.phase,
    training: state.rules.mode === "training", presentationPhase: presentation?.phase, presentationRound: presentation?.round,
    resultRound: state.lastRoundResult?.round,
    resultElapsedFrames: state.phase === "match-over"
      ? presentation?.phase === "match-result" ? presentation.elapsedMs * .06 : undefined
      : state.lastRoundResult ? state.frame - state.lastRoundResult.frame : undefined,
    winnerId: state.lastRoundResult?.winnerId, fighterIds: state.fighters.map(fighter => fighter.definitionId), narrative,
  };
}
const safeClock = (value: number | undefined): value is number => value !== undefined && Number.isFinite(value) && value >= 0 && value <= Number.MAX_SAFE_INTEGER;
function occurrence(event: PitStageStoryEventV61, stageId: string, context?: PitStageStoryContextV61): { key: string; elapsed: number } | null {
  if (!context || context.training || !Number.isSafeInteger(context.round) || context.round < 1
    || event.excludedFighterIds?.some(id => context.fighterIds.includes(id))) return null;
  if (event.trigger === "narrative-cue") {
    const narrative = context.narrative;
    if (!narrative || narrative.stageId !== stageId || narrative.encounterId !== event.encounterId) return null;
    const matches = narrative.cues.filter(cue => cue.cue === event.cue);
    const cue = matches.length === 1 ? matches[0] : undefined;
    return cue && typeof cue.occurrenceId === "string" && cue.occurrenceId.trim() && Number.isSafeInteger(cue.elapsedFrames) && safeClock(cue.elapsedFrames)
      ? { key: `${narrative.encounterId}:${cue.occurrenceId}`, elapsed: cue.elapsedFrames } : null;
  }
  if (context.presentationRound !== context.round) return null;
  if (event.trigger === "round-start") {
    return context.phase === "round" && context.presentationPhase === "fight" && Number.isSafeInteger(context.roundFrame) && safeClock(context.roundFrame)
      ? { key: `round:${context.round}:start`, elapsed: context.roundFrame } : null;
  }
  if (context.resultRound !== context.round || !safeClock(context.resultElapsedFrames)
    || event.trigger === "match-end" && context.phase !== "match-over"
    || !(context.phase === "round-over" && context.presentationPhase === "round-result"
      || context.phase === "match-over" && context.presentationPhase === "match-result")
    || event.trigger === "round-victory" && !context.winnerId) return null;
  return { key: `round:${context.round}:result`, elapsed: context.resultElapsedFrames };
}

/** One-shot projection; pause/replay seeking never consumes a random stream or queues another cue. */
export function getPitStageStoryPosesV61(stage: PitStageStoryStageV61, context?: PitStageStoryContextV61,
  reducedMotion = false): readonly PitStageStoryPoseV61[] {
  return stage.events.map(event => {
    const current = occurrence(event, stage.stageId, context);
    const frame = current ? Math.floor(current.elapsed * event.fps / 60) : -1;
    const active = frame >= 0 && frame < event.frames.length;
    const held = frame >= event.frames.length && event.afterPlayback === "hold-last";
    const excluded = event.excludedFighterIds?.some(id => context?.fighterIds.includes(id));
    return { eventId: event.id, trigger: event.trigger, active: active && !excluded,
      visible: !excluded && (active || held || event.idleVisibility === "rest"), held: held && !excluded,
      nativeFrame: reducedMotion ? event.reducedMotionFrame : active ? frame : held ? event.frames.length - 1 : event.restFrame,
      occurrence: current?.key ?? null, elapsedFrames: current?.elapsed ?? null };
  });
}
