import {PIT_WORKBOOK_BACKWARD_THROW_LANDING_AGE_V112} from './systems/pitWorkbookCombatV112';
import { getPitWorkbookNormalV104 } from './systems/pitWorkbookNormalsV104';
import { PIT_WORKBOOK_THROW_LANDING_AGE_V109 } from './systems/pitWorkbookCombatV109';
import { getPitCombatActionTimingV105, getPitCombatAttackDefinition, getPitCombatFighterDefinition } from './systems/pitCombat';
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
  PIT_THROW_TECH_WINDOW_FRAMES,
  PIT_THROW_TECH_RECOVERY_FRAMES,
  type PitCombatState,
  type PitFighterState,
  type PitAttackKind,
} from "./systems/pitCombat";

export type PitHunterSpritePosture = "stand" | "crouch" | "air";
export type PitHunterSpritePhase =
  "locomotion" | "hold" | "startup" | "active" | "recovery" |
  "hitstun" | "blockstun" | "capture" | "knockdown" | "ko";
export type PitHunterSpriteClock = "action-phase" | "cloak-phase" | "throw-phase" | "observed-entry";

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
  readonly action: PitAttackKind | "throw" | "equipment" | null;
  readonly techniqueId: string | null;
  readonly throwOutcome: "pending" | "connected" | "whiff" | "teched" | null;
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

/** Historical V4 throw timing; V5 retains it for startup, whiffs and recovery. */
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
 * V5 callers must use describePitCombatHunterSpriteMotion for capture context.
 * No landing, run or discrete backstep is invented; missing clips stay missing.
 */
export function describePitHunterSpriteMotion(
  fighter: PitFighterState,
  simulationFrame: number,
  previous?: PitHunterSpriteCursor | null,
  combat?: Pick<PitCombatState, "frame" | "pendingThrow" | "events" | "sourceThrowV109" | "sourceThrowV112">,
): PitHunterSpriteMotion | null {
  if ((combat && combat.frame !== simulationFrame) || !tick(simulationFrame) ||
    !Object.prototype.hasOwnProperty.call(PIT_FIGHTERS, fighter.definitionId) ||
    (fighter.facing !== -1 && fighter.facing !== 1) ||
    ![fighter.health, fighter.velocityX, fighter.velocityY, fighter.comboLastHitFrame].every(finite) ||
    !phases.has(fighter.phase) ||
    !tick(fighter.stunFrames) || !tick(fighter.knockdownFrames) ||
    !tick(fighter.cloakFramesRemaining)) return null;
  const definition = getPitCombatFighterDefinition(fighter);
  const facing = fighter.facing === 1 ? "right" : "left";
  const normal = (fighter.normalMovesRecipe === 'workbook-v104' || fighter.normalMovesRecipe === 'workbook-v105' || fighter.normalMovesRecipe === 'workbook-v106' || fighter.normalMovesRecipe === 'workbook-v107' || fighter.normalMovesRecipe === 'workbook-v109' || fighter.normalMovesRecipe === 'workbook-v112') && fighter.action?.normalMove
    ? getPitWorkbookNormalV104(fighter.definitionId, fighter.action.normalMove) : undefined;
  const workbookTimingV105 = getPitCombatActionTimingV105(fighter);
  const backwardThrow = fighter.normalMovesRecipe === 'workbook-v112' ? combat?.sourceThrowV112 : null;
  const sourceThrow = backwardThrow ?? ((fighter.normalMovesRecipe === 'workbook-v109' || fighter.normalMovesRecipe === 'workbook-v112') ? combat?.sourceThrowV109 : null);
  const sourceVictim = sourceThrow && sourceThrow.attackerSlot !== fighter.slot ? sourceThrow : null;
  const posture: PitHunterSpritePosture = sourceVictim ? 'stand' : normal?.posture ?? (workbookTimingV105 ? 'stand' :
    !fighter.grounded ? "air" : fighter.crouching || fighter.guard === "low" ? "crouch" : "stand");
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

  if (sourceVictim) {
    // This independent body follows the serialised capture clock, including a
    // mid-flight replay seek. Its actual x/y belongs to the combat model.
    const knockedOut = fighter.health <= 0;
    const landingAge = backwardThrow ? PIT_WORKBOOK_BACKWARD_THROW_LANDING_AGE_V112 : PIT_WORKBOOK_THROW_LANDING_AGE_V109;
    clipId = (backwardThrow ? 'pit.stand.workbook-v112.TH_B.victim' : 'pit.stand.workbook-v109.TH_F.victim') + (knockedOut ? '.ko' : '');
    phase = knockedOut ? 'ko' : sourceVictim.age >= landingAge ? 'knockdown' : 'capture';
    action = 'throw';
    throwOutcome = 'connected';
    clock = 'throw-phase';
    elapsedTicks = knockedOut ? sourceVictim.age - landingAge : sourceVictim.age;
    durationTicks = knockedOut ? 60 : backwardThrow ? 67 : 61;
  } else if (fighter.health <= 0) {
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
    const pending = combat?.pendingThrow;
    const tech = combat?.events.some(event => event.frame === simulationFrame &&
      event.type === "throw-tech" &&
      (event.attackerId === fighter.definitionId || event.defenderId === fighter.definitionId));
    const connected = combat?.events.some(event => event.frame === simulationFrame &&
      event.type === "hit" && event.attack === "throw" && event.attackerId === fighter.definitionId);
    // Keep only an observed, uninterrupted recovery. A mid-recovery seek cannot
    // identify a throw from an ambiguous blockstun counter or invent its art.
    const continuing = combat && previous && previous.characterId === fighter.definitionId &&
      previous.slot === fighter.slot && previous.simulationFrame <= simulationFrame &&
      previous.health === fighter.health && previous.hitMarker === fighter.comboLastHitFrame &&
      previous.remainingTicks !== null &&
      previous.remainingTicks - (simulationFrame - previous.simulationFrame) === fighter.stunFrames &&
      !combat.events.some(event => event.frame === simulationFrame &&
        (event.type === "hit" || event.type === "block") && event.defenderId === fighter.definitionId)
      ? previous.clipId : null;
    const backwardTech = combat?.events.some(event => event.type === 'throw-tech' && event.sourceAction === 'TH_B') || previous?.clipId.includes('workbook-v112.TH_B.');
    const techClip = prefix + (fighter.normalMovesRecipe === 'workbook-v112' && backwardTech ? 'workbook-v112.TH_B.' : fighter.normalMovesRecipe === 'workbook-v109' || fighter.normalMovesRecipe === 'workbook-v112' ? 'workbook-v109.TH_F.' : 'throw.') + 'recovery.teched';
    const techedRecovery = tech || continuing === techClip;
    const connectedRecovery = connected || continuing === prefix + "throw.recovery.connected";
    if (pending) {
      if (fighter.action || !fighter.grounded || fighter.stunFrames !== 1 ||
        !tick(pending.capturedFrame) || !tick(pending.framesRemaining) ||
        pending.framesRemaining < 1 || pending.framesRemaining > PIT_THROW_TECH_WINDOW_FRAMES ||
        simulationFrame - pending.capturedFrame !== PIT_THROW_TECH_WINDOW_FRAMES - pending.framesRemaining) return null;
      clipId = prefix + "throw.capture." + (pending.attackerSlot === fighter.slot ? "attacker" : "defender");
      phase = "capture";
      action = "throw";
      throwOutcome = "pending";
      clock = "throw-phase";
      durationTicks = PIT_THROW_TECH_WINDOW_FRAMES;
      elapsedTicks = durationTicks - pending.framesRemaining;
    } else if (combat && !fighter.action && (techedRecovery || connectedRecovery)) {
      throwOutcome = techedRecovery ? "teched" : "connected";
      clipId = techedRecovery ? techClip : prefix + "throw.recovery." + throwOutcome;
      phase = "recovery";
      action = "throw";
      clock = "throw-phase";
      durationTicks = techedRecovery ? PIT_THROW_TECH_RECOVERY_FRAMES : PIT_HUNTER_SPRITE_THROW_TIMING.recovery;
      if (fighter.stunFrames < 1 || fighter.stunFrames > durationTicks) return null;
      elapsedTicks = durationTicks - fighter.stunFrames;
      remainingTicks = fighter.stunFrames;
    } else {
      if (combat && fighter.guard === null && !fighter.crouching) return null;
      clipId = prefix + "blockstun." + (fighter.guard === "low" || fighter.crouching ? "low" : "high");
      phase = "blockstun";
      remainingTicks = fighter.stunFrames;
    }
  } else if (fighter.action) {
    const current = fighter.action;
    const workbookTiming = workbookTimingV105;
    if (current.workbookMove !== undefined && (!workbookTiming || fighter.variantId !== undefined || current.normalMove !== undefined ||
      ((current.workbookMove === 'TH_F' || current.workbookMove === 'TH_B') ? current.kind !== 'throw' || current.attack !== null : current.workbookMove === 'EQUIP' ? current.kind !== 'equipment' || current.attack !== null :
        current.kind !== 'attack' || current.attack !== (current.workbookMove === '6M' ? 'medium' : 'technique')))) return null;
    if (!tick(current.frame) ||
      (current.kind !== "throw" && current.kind !== "attack" && current.kind !== "equipment") ||
      (current.kind === 'equipment' && (!workbookTiming || current.workbookMove !== 'EQUIP' || current.attack !== null || current.connected)) ||
      (current.kind === "attack" && (!current.attack || !attackKinds.has(current.attack)))) return null;
    action = current.kind === "throw" ? "throw" : current.kind === 'equipment' ? 'equipment' : current.attack!;
    const timing = workbookTiming ?? (current.kind === "throw" ? PIT_HUNTER_SPRITE_THROW_TIMING : getPitCombatAttackDefinition(fighter, current.attack!));
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
    techniqueId = action === "technique" && !workbookTiming ? definition.technique.id : null;
    const additionalV106 = (fighter.normalMovesRecipe === 'workbook-v106' || fighter.normalMovesRecipe === 'workbook-v107' || fighter.normalMovesRecipe === 'workbook-v109' || fighter.normalMovesRecipe === 'workbook-v112') &&
      (current.workbookMove === 'SUPER' || fighter.definitionId === 'feral-hunter' && (current.workbookMove === 'S1' || current.workbookMove === 'S2') ||
        fighter.definitionId === 'scar' && current.workbookMove === 'S3');
    const additionalV107 = (fighter.normalMovesRecipe === 'workbook-v107' || fighter.normalMovesRecipe === 'workbook-v109' || fighter.normalMovesRecipe === 'workbook-v112') &&
      (fighter.definitionId === 'feral-hunter' && current.workbookMove === 'S4' || fighter.definitionId === 'scar' && current.workbookMove === 'S2');
    const actionId = workbookTiming ? (current.workbookMove === 'TH_B' ? 'workbook-v112.' : current.workbookMove === 'TH_F' ? 'workbook-v109.' : additionalV107 ? 'workbook-v107.' : additionalV106 ? 'workbook-v106.' : 'workbook-v105.') + current.workbookMove : normal ? "workbook-v104." + normal.key : techniqueId ? "technique." + techniqueId : action;
    clipId = prefix + actionId + "." + phase;
    if (additionalV106 && current.workbookMove === 'SUPER' && phase === 'recovery' && current.workbookSuperV106) clipId += '.confirmed';
    if (action === "throw") {
      throwOutcome = phase === "recovery" ? current.connected ? "connected" : "whiff" : "pending";
      if (phase === "recovery") clipId += "." + throwOutcome;
      if ((current.workbookMove === 'TH_F' || current.workbookMove === 'TH_B') && phase === 'active' && !current.connected) clipId += '.whiff';
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
 * V5 entry point: capture has an exact clock; recovery identity needs its real
 * event or an uninterrupted cursor. An ambiguous mid-recovery seek returns null.
 * This metadata does not certify any authored capture or tech frames.
 */
export function describePitCombatHunterSpriteMotion(
  state: PitCombatState,
  slot: 0 | 1,
  previous?: PitHunterSpriteCursor | null,
): PitHunterSpriteMotion | null {
  return describePitHunterSpriteMotion(state.fighters[slot], state.frame, previous, state);
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
