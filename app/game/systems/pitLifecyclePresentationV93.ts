import { PIT_TICK_RATE, type PitCombatState, type PitInput } from "./pitCombat";
import type { PitFinisherViewV80 } from "./pitFinishersV80";
import type { PitRoundPresentationView } from "./pitRoundPresentation";

/** A voluntary native gesture inside the existing terminal choice window.
 * No input, fighter, replay, reward or engine version is created here. */
export interface PitLifecyclePresentationV93 {
  readonly key: string;
  readonly taunt: { readonly slot: 0 | 1; readonly elapsedMs: number; readonly durationMs: number } | null;
  readonly combatTaunts: readonly [PitCombatTauntV93 | null, PitCombatTauntV93 | null];
}
export interface PitCombatTauntV93 {
  readonly startFrame: number;
  readonly durationMs: number;
  readonly round: number;
  readonly identity: string;
  readonly x: number;
  readonly y: number;
  readonly facing: -1 | 1;
  readonly health: number;
}
export const createPitLifecyclePresentationV93 = (): PitLifecyclePresentationV93 => ({ key: "", taunt: null, combatTaunts: [null, null] });

function isNeutral(input: PitInput): boolean {
  return !input.left && !input.right && !input.down && !input.jump && !input.guardHigh && !input.guardLow &&
    !input.attack && !input.throw && !input.resource;
}
function canGesture(combat: PitCombatState, slot: 0 | 1): boolean {
  const fighter = combat.fighters[slot];
  return combat.phase === "round" && fighter.health > 0 && fighter.grounded && fighter.phase === "idle" &&
    !fighter.action && !fighter.guard && !fighter.crouching && fighter.velocityX === 0 && fighter.velocityY === 0 &&
    fighter.cloakPhase === "inactive" && !combat.pendingThrow;
}
function liveGesture(gesture: PitCombatTauntV93 | null, combat: PitCombatState, slot: 0 | 1): boolean {
  if (!gesture || !canGesture(combat, slot)) return false;
  const fighter = combat.fighters[slot];
  return gesture.round === combat.round && gesture.identity === `${fighter.definitionId}:${fighter.variantId ?? ""}` &&
    gesture.x === fighter.x && gesture.y === fighter.y && gesture.health === fighter.health && gesture.facing === fighter.facing &&
    combat.frame >= gesture.startFrame && (combat.frame - gesture.startFrame) * 1000 / PIT_TICK_RATE < gesture.durationMs;
}

/** A native voluntary pose, not an engine action. It grants no invulnerability,
 * meter or input lock. Both human sides can gesture while the engine keeps ticking. */
export function beginPitCombatTauntV93(current: PitLifecyclePresentationV93, combat: PitCombatState | null,
  round: PitRoundPresentationView, slot: 0 | 1, durationMs: number, dedicatedAvailable: boolean,
  input: PitInput = {}, frozen = false): PitLifecyclePresentationV93 {
  if (frozen || !dedicatedAvailable || !combat || round.phase !== "fight" || round.blocksSimulation || !canGesture(combat, slot) ||
      !isNeutral(input) || liveGesture(current.combatTaunts[slot], combat, slot) || !Number.isFinite(durationMs) || durationMs <= 0 || durationMs > 10_000) return current;
  const fighter = combat.fighters[slot];
  const combatTaunts: [PitCombatTauntV93 | null, PitCombatTauntV93 | null] = [...current.combatTaunts];
  combatTaunts[slot] = { startFrame: combat.frame, durationMs, round: combat.round,
    identity: `${fighter.definitionId}:${fighter.variantId ?? ""}`, x: fighter.x, y: fighter.y, facing: fighter.facing, health: fighter.health };
  return { ...current, combatTaunts };
}

/** Observe real ticks and attempted inputs: an attack even at a wall, damage,
 * movement, guard or round transition cancels only that side's presentation. */
export function observePitCombatTauntsV93(current: PitLifecyclePresentationV93, combat: PitCombatState,
  inputs: readonly [PitInput, PitInput]): PitLifecyclePresentationV93 {
  const combatTaunts = current.combatTaunts.map((gesture, slot) =>
    liveGesture(gesture, combat, slot as 0 | 1) && isNeutral(inputs[slot]) ? gesture : null) as [PitCombatTauntV93 | null, PitCombatTauntV93 | null];
  return combatTaunts.every((gesture, slot) => gesture === current.combatTaunts[slot]) ? current : { ...current, combatTaunts };
}

/** Require the actual decisive KO, not a round victory, timeout or forged side.
 * The V80 owner still decides eligibility and consumes its own five-second window. */
export function pitLifecycleWindowWinnerV93(combat: PitCombatState | null, finisher: PitFinisherViewV80): 0 | 1 | null {
  if (!combat || combat.phase !== "match-over" || combat.rules.mode === "training" || combat.rules.stageJourney ||
      finisher.phase !== "window" || !finisher.key || !finisher.profile || finisher.options.replay || finisher.options.mode === "off" ||
      ![0, 1].includes(finisher.winnerSlot as number) || !Number.isFinite(finisher.elapsedMs) || finisher.elapsedMs < 0 ||
      !Number.isFinite(finisher.durationMs) || finisher.durationMs <= 0 || finisher.elapsedMs >= finisher.durationMs ||
      combat.lastRoundResult?.reason !== "ko" || combat.lastRoundResult.round !== combat.round ||
      combat.lastRoundResult.winnerId !== combat.matchWinnerId) return null;
  const slot = finisher.winnerSlot!, winner = combat.fighters[slot], loser = combat.fighters[slot === 0 ? 1 : 0];
  return winner.definitionId === combat.matchWinnerId && winner.definitionId === finisher.profile.fighterId &&
    winner.roundsWon >= 2 && winner.health > 0 && loser.health <= 0 && loser.roundsWon < winner.roundsWon ? slot : null;
}

/** Availability means a real reviewed, decoded dedicated clip for this exact
 * costume and native side. A reused idle or procedural pose never enables it. */
export function beginPitLifecycleTauntV93(current: PitLifecyclePresentationV93, combat: PitCombatState | null,
  finisher: PitFinisherViewV80, slot: 0 | 1, nativeDurationMs: number, dedicatedAvailable: boolean, frozen = false): PitLifecyclePresentationV93 {
  if (frozen || !dedicatedAvailable || finisher.options.cpuWinner || pitLifecycleWindowWinnerV93(combat, finisher) !== slot ||
      (current.key === finisher.key && current.taunt) || !Number.isFinite(nativeDurationMs) || nativeDurationMs <= 0 || nativeDurationMs > 10_000) return current;
  return { ...current, key: finisher.key, taunt: { slot, elapsedMs: 0, durationMs: nativeDurationMs } };
}

/** The caller advances this on the existing finisher RAF, with the same pause,
 * hidden and loading gate. A gesture never extends or restarts that window. */
export function advancePitLifecyclePresentationV93(current: PitLifecyclePresentationV93, combat: PitCombatState | null,
  finisher: PitFinisherViewV80, elapsedMs: number, frozen = false): PitLifecyclePresentationV93 {
  const winner = pitLifecycleWindowWinnerV93(combat, finisher);
  if (current.key !== finisher.key || winner === null) return current.key === finisher.key && !current.taunt
    ? current : { ...current, key: finisher.key, taunt: null };
  if (!current.taunt || frozen || !Number.isFinite(elapsedMs) || elapsedMs <= 0) return current;
  if (current.taunt.slot !== winner) return { ...current, key: finisher.key, taunt: null };
  const elapsed = Math.min(current.taunt.durationMs, current.taunt.elapsedMs + Math.min(100, elapsedMs));
  return elapsed >= current.taunt.durationMs ? { ...current, taunt: null }
    : { ...current, taunt: { ...current.taunt, elapsedMs: elapsed } };
}

/** Read-only render projection. A loser retains KO vitality while the renderer
 * can show native dizzy drawings; their clock never restarts when the winner taunts. */
export function pitLifecyclePresentationViewV93(round: PitRoundPresentationView, combat: PitCombatState | null,
  finisher: PitFinisherViewV80, lifecycle: PitLifecyclePresentationV93): PitRoundPresentationView {
  if (round.phase === "fight" && combat?.phase === "round") {
    const active = lifecycle.combatTaunts.map((gesture, slot) => liveGesture(gesture, combat, slot as 0 | 1)) as [boolean, boolean];
    if (!active.some(Boolean)) return round;
    return { ...round, fighterTaunts: active,
      fighterElapsedMs: lifecycle.combatTaunts.map((gesture, slot) => active[slot] && gesture
        ? (combat.frame - gesture.startFrame) * 1000 / PIT_TICK_RATE : round.elapsedMs) as [number, number],
      fighterDurationMs: lifecycle.combatTaunts.map((gesture, slot) => active[slot] && gesture
        ? gesture.durationMs : round.durationMs) as [number, number] };
  }
  const winner = pitLifecycleWindowWinnerV93(combat, finisher);
  if (winner === null || round.phase !== "match-result" || !round.resultVisible) return round;
  const gesture = lifecycle.key === finisher.key && lifecycle.taunt?.slot === winner ? lifecycle.taunt : null;
  const elapsed: [number, number] = [finisher.elapsedMs, finisher.elapsedMs];
  const durations: [number, number] = [finisher.durationMs, finisher.durationMs];
  if (gesture) { elapsed[winner] = gesture.elapsedMs; durations[winner] = gesture.durationMs; }
  return { phase: gesture ? "taunt" : "finisher-window", elapsedMs: finisher.elapsedMs, durationMs: finisher.durationMs,
    round: round.round, winnerSlot: winner, ...(gesture ? { fighterSlot: winner } : {}),
    fighterElapsedMs: elapsed, fighterDurationMs: durations, blocksSimulation: true, resultVisible: false };
}
