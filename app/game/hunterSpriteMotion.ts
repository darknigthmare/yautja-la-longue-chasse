/**
 * Pure PIT-to-authored-sprite adapter. No Canvas, rig, interpolation, gameplay
 * mutation or hidden clock. Each phase selects an independently drawn clip.
 */
import {
  resolveHunterSpriteAtlasFrame,
  type HunterSpriteAtlas,
  type HunterSpriteAtlasFrameLookup,
  type HunterSpriteFacing,
} from "./hunterSpriteAtlas";
import {
  PIT_FIGHTERS,
  PIT_TICK_RATE,
  PIT_CLOAK_STARTUP_FRAMES,
  PIT_CLOAK_ACTIVE_FRAMES,
  PIT_CLOAK_RECOVERY_FRAMES,
  type PitFighterState,
  type PitAttackKind,
} from "./systems/pitCombat";

export type PitHunterSpritePosture = "stand" | "crouch" | "air";
export type PitHunterSpritePhase =
  "locomotion" | "hold" | "startup" | "active" | "recovery" |
  "hitstun" | "blockstun" | "knockdown" | "ko";
export type PitHunterSpriteClock = "action-phase" | "cloak-phase" | "observed-entry";

/**
 * Optional presentation history supplied by the caller, never saved into PIT.
 * Forward it on every observed tick, including ticks with missing art. On seek
 * or a new round, reset it or replay it from the same observation point.
 */
export interface PitHunterSpriteCursor {
  readonly characterId: string;
  readonly slot: 0 | 1;
  readonly clipId: string;
  readonly startedAtFrame: number;
  readonly simulationFrame: number;
  readonly remainingTicks: number | null;
  readonly health: number;
  readonly hitMarker: number;
}
export interface PitHunterSpriteMotion {
  readonly characterId: string;
  readonly clipId: string;
  readonly facing: HunterSpriteFacing;
  readonly posture: PitHunterSpritePosture;
  readonly phase: PitHunterSpritePhase;
  readonly action: PitAttackKind | "throw" | null;
  readonly techniqueId: string | null;
  readonly throwOutcome: "pending" | "connected" | "whiff" | null;
  readonly clock: PitHunterSpriteClock;
  readonly elapsedTicks: number;
  /** A real simulation phase duration; null means natural authored playback. */
  readonly durationTicks: number | null;
  readonly cursor: PitHunterSpriteCursor;
  /** Concurrent effects must never replace an ongoing attack with a resource pose. */
  readonly effects: {
    readonly cloakPhase: PitFighterState["cloakPhase"];
    readonly cloakProgress: number | null;
    readonly survivalInstinctActive: boolean;
    readonly techniqueStatus: string | null;
  };
}
export interface PitHunterSpriteFrame {
  readonly motion: PitHunterSpriteMotion;
  readonly atlasElapsedTicks: number;
  readonly frame: HunterSpriteAtlasFrameLookup;
}

/** Presentation copy of private PIT V4 throw timing, checked against live ticks. */
export const PIT_HUNTER_SPRITE_THROW_TIMING = Object.freeze({
  startup: 7, active: 2, recovery: 21,
});

const finite = (value: number): boolean => Number.isFinite(value);
const tick = (value: number): boolean => Number.isSafeInteger(value) && value >= 0;
const phases = new Set<PitFighterState["phase"]>([
  "idle", "startup", "active", "recovery", "hitstun", "blockstun", "knockdown",
]);
const attackKinds = new Set<PitAttackKind>(["light", "medium", "heavy", "technique"]);
const cloakDuration = (phase: PitFighterState["cloakPhase"]): number | null =>
  phase === "startup" ? PIT_CLOAK_STARTUP_FRAMES :
    phase === "active" ? PIT_CLOAK_ACTIVE_FRAMES :
      phase === "recovery" ? PIT_CLOAK_RECOVERY_FRAMES : null;

/**
 * Describes required art even when none exists. Attacks use action.frame, never
 * the render clock. Entry clocks for guards/jumps/reactions cannot be fully
 * reconstructed from an arbitrary PIT snapshot; first observation starts at 0.
 * No landing, synchronized victim, run or discrete backstep is invented.
 */
export function describePitHunterSpriteMotion(
  fighter: PitFighterState,
  simulationFrame: number,
  previous?: PitHunterSpriteCursor | null,
): PitHunterSpriteMotion | null {
  if (!tick(simulationFrame) ||
    !Object.prototype.hasOwnProperty.call(PIT_FIGHTERS, fighter.definitionId) ||
    (fighter.facing !== -1 && fighter.facing !== 1) ||
    ![fighter.health, fighter.velocityX, fighter.velocityY, fighter.comboLastHitFrame].every(finite) ||
    !phases.has(fighter.phase) ||
    !tick(fighter.stunFrames) || !tick(fighter.knockdownFrames) ||
    !tick(fighter.cloakFramesRemaining)) return null;
  const definition = PIT_FIGHTERS[fighter.definitionId];
  const facing = fighter.facing === 1 ? "right" : "left";
  const posture: PitHunterSpritePosture =
    !fighter.grounded ? "air" : fighter.crouching || fighter.guard === "low" ? "crouch" : "stand";
  const prefix = "pit." + posture + ".";
  let clipId = "idle";
  let phase: PitHunterSpritePhase = "hold";
  let action: PitHunterSpriteMotion["action"] = null;
  let techniqueId: string | null = null;
  let throwOutcome: PitHunterSpriteMotion["throwOutcome"] = null;
  let clock: PitHunterSpriteClock = "observed-entry";
  let elapsedTicks = 0;
  let durationTicks: number | null = null;
  let remainingTicks: number | null = null;
  const cloakTicks = cloakDuration(fighter.cloakPhase);
  if (cloakTicks !== null && (fighter.cloakFramesRemaining < 1 || fighter.cloakFramesRemaining > cloakTicks)) return null;
  const cloakProgress = cloakTicks === null ? null : (cloakTicks - fighter.cloakFramesRemaining) / cloakTicks;

  if (fighter.health <= 0) {
    clipId = prefix + "ko";
    phase = "ko";
  } else if (fighter.phase === "knockdown") {
    clipId = prefix + "knockdown";
    phase = "knockdown";
    remainingTicks = fighter.knockdownFrames;
  } else if (fighter.phase === "hitstun") {
    clipId = prefix + "hitstun";
    phase = "hitstun";
    remainingTicks = fighter.stunFrames;
  } else if (fighter.phase === "blockstun") {
    clipId = prefix + "blockstun." + (fighter.guard === "low" || fighter.crouching ? "low" : "high");
    phase = "blockstun";
    remainingTicks = fighter.stunFrames;
  } else if (fighter.action) {
    const current = fighter.action;
    if (!tick(current.frame) ||
      (current.kind !== "throw" && current.kind !== "attack") ||
      (current.kind === "attack" && (!current.attack || !attackKinds.has(current.attack)))) return null;
    action = current.kind === "throw" ? "throw" : current.attack!;
    const timing = current.kind === "throw" ? PIT_HUNTER_SPRITE_THROW_TIMING : definition.attacks[current.attack!];
    const total = timing.startup + timing.active + timing.recovery;
    if (current.frame >= total) return null;
    phase = current.frame < timing.startup ? "startup" :
      current.frame < timing.startup + timing.active ? "active" : "recovery";
    // Invalid/stale snapshots do not silently receive an apparently valid pose.
    if (fighter.phase !== phase) return null;
    const start = phase === "startup" ? 0 : phase === "active" ? timing.startup : timing.startup + timing.active;
    elapsedTicks = current.frame - start;
    durationTicks = timing[phase];
    clock = "action-phase";
    techniqueId = action === "technique" ? definition.technique.id : null;
    const actionId = techniqueId ? "technique." + techniqueId : action;
    clipId = prefix + actionId + "." + phase;
    if (action === "throw") {
      throwOutcome = phase === "recovery" ? current.connected ? "connected" : "whiff" : "pending";
      if (phase === "recovery") clipId += "." + throwOutcome;
    }
  } else {
    if (fighter.phase !== "idle") return null;
    if (!fighter.grounded) {
      clipId = prefix + "jump." + (fighter.velocityY > 0 ? "rise" : fighter.velocityY < 0 ? "fall" : "apex");
      phase = "locomotion";
    } else if (fighter.guard !== null) {
      clipId = fighter.guard === "low" || fighter.crouching ? "low-guard" : "high-guard";
    } else if (fighter.cloakPhase === "startup" || fighter.cloakPhase === "recovery") {
      const movement = fighter.velocityX === 0 ? "idle" :
        fighter.velocityX * fighter.facing > 0 ? "walk-forward" : "walk-backward";
      clipId = prefix + "cloak." + fighter.cloakPhase + "." + movement;
      phase = fighter.cloakPhase;
      clock = "cloak-phase";
      durationTicks = cloakTicks;
      elapsedTicks = cloakTicks! - fighter.cloakFramesRemaining;
    } else if (fighter.crouching) {
      clipId = fighter.velocityX === 0 ? "crouch" :
        fighter.velocityX * fighter.facing > 0 ? "crouch-walk-forward" : "crouch-walk-backward";
      phase = fighter.velocityX === 0 ? "hold" : "locomotion";
    } else if (fighter.velocityX !== 0) {
      clipId = fighter.velocityX * fighter.facing > 0 ? "walk" : "walk-backward";
      phase = "locomotion";
    }
  }

  let startedAtFrame = simulationFrame - elapsedTicks;
  if (clock === "observed-entry" && previous &&
    previous.characterId === fighter.definitionId && previous.slot === fighter.slot &&
    previous.clipId === clipId && tick(previous.startedAtFrame) &&
    tick(previous.simulationFrame) && previous.startedAtFrame <= previous.simulationFrame &&
    previous.simulationFrame <= simulationFrame) {
    const delta = simulationFrame - previous.simulationFrame;
    const newImpact = (phase === "hitstun" || phase === "blockstun" || phase === "knockdown") &&
      (previous.hitMarker !== fighter.comboLastHitFrame || previous.health > fighter.health ||
        (remainingTicks !== null && previous.remainingTicks !== null &&
          remainingTicks > Math.max(0, previous.remainingTicks - delta)));
    if (!newImpact) startedAtFrame = previous.startedAtFrame;
    elapsedTicks = simulationFrame - startedAtFrame;
  }
  // These are remaining simulation counters, not guessed animation durations.
  if (remainingTicks !== null) {
    if (remainingTicks <= 0) return null;
    durationTicks = elapsedTicks + remainingTicks;
  }
  const cursor: PitHunterSpriteCursor = {
    characterId: fighter.definitionId, slot: fighter.slot, clipId, startedAtFrame,
    simulationFrame, remainingTicks, health: fighter.health, hitMarker: fighter.comboLastHitFrame,
  };
  return {
    characterId: fighter.definitionId, clipId, facing, posture, phase, action,
    techniqueId, throwOutcome, clock, elapsedTicks, durationTicks, cursor,
    effects: {
      cloakPhase: fighter.cloakPhase, cloakProgress,
      survivalInstinctActive: fighter.survivalInstinctFrames > 0,
      techniqueStatus: fighter.techniqueStatus?.kind ?? null,
    },
  };
}

/**
 * Resolve reviewed atlas metadata only; the existing Canvas drawer still requires
 * prepared alpha/color-key pixel evidence. This is not asset approval or coverage.
 * Phase clips use frame-duration weights fitted to their real simulation phase.
 * Other clips honor their declared timebase, with no tweening between cells.
 */
export function resolvePitHunterSpriteFrame(
  atlas: HunterSpriteAtlas,
  motion: PitHunterSpriteMotion | null,
): PitHunterSpriteFrame | null {
  if (!motion || atlas.characterId !== motion.characterId ||
    !finite(motion.elapsedTicks) || motion.elapsedTicks < 0 ||
    (motion.durationTicks !== null && (!finite(motion.durationTicks) ||
      motion.durationTicks <= 0 || motion.elapsedTicks >= motion.durationTicks))) return null;
  const initial = resolveHunterSpriteAtlasFrame(atlas, motion.clipId, motion.facing, 0);
  if (!initial) return null;
  // A finite contact/reaction phase cannot repeat an attack or impact loop.
  if (motion.durationTicks !== null && initial.clip.loop) return null;
  const atlasElapsedTicks = motion.durationTicks === null
    ? motion.elapsedTicks / PIT_TICK_RATE * initial.clip.ticksPerSecond
    : motion.elapsedTicks / motion.durationTicks * initial.totalTicks;
  const frame = resolveHunterSpriteAtlasFrame(atlas, motion.clipId, motion.facing, atlasElapsedTicks);
  return frame ? { motion, atlasElapsedTicks, frame } : null;
}
