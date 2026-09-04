"use strict";

export type HuntMeleePhase = "idle" | "startup" | "active" | "recovery";
export type HuntMeleeFacing = -1 | 1;
export type HuntMeleeComboIndex = 0 | 1 | 2;

export interface HuntMeleeProfile {
  weaponId: string;
  damage: number;
  cooldownSeconds: number;
  reachPx: number;
  maxTargetHits: number;
  noiseLoudness: number;
  noiseRadius: number;
}

export interface HuntMeleeState {
  phase: HuntMeleePhase;
  phaseRemainingSeconds: number;
  comboIndex: HuntMeleeComboIndex;
  actionSequence: number;
  facing: HuntMeleeFacing;
  buffered: boolean;
  queuedFacing: HuntMeleeFacing;
  hitTargetIds: string[];
  profile: HuntMeleeProfile | null;
  queuedProfile: HuntMeleeProfile | null;
}

export interface HuntMeleeAttackSpec {
  startupSeconds: number;
  activeSeconds: number;
  recoverySeconds: number;
  damage: number;
  damageMultiplier: number;
  hitStunSeconds: number;
  knockbackSpeed: number;
  reachPx: number;
  maxTargetHits: number;
}

export interface HuntMeleeActorBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface HuntMeleeActor extends HuntMeleeActorBox {
  facing: HuntMeleeFacing;
}

export interface HuntMeleeHitbox extends HuntMeleeActorBox {
  actionSequence: number;
  facing: HuntMeleeFacing;
}

export interface HuntMeleeRequestResult {
  state: HuntMeleeState;
  accepted: boolean;
  started: boolean;
}

export interface HuntMeleeStepResult {
  state: HuntMeleeState;
  enteredActiveActionIds: number[];
  startedComboIndexes: HuntMeleeComboIndex[];
}

export const HUNT_MELEE_COMBO_LENGTH = 3 as const;
export const HUNT_MELEE_ACTIVE_BUFFER_SECONDS = 0.05;
export const HUNT_MELEE_RECOVERY_BUFFER_SECONDS = 0.12;

const COMBO_TIMING = [
  {
    startupSeconds: 0.1,
    activeSeconds: 0.08,
    recoverySeconds: 0.08,
    damageMultiplier: 1,
    hitStunSeconds: 0.16,
    knockbackSpeed: 210,
  },
  {
    startupSeconds: 0.085,
    activeSeconds: 0.09,
    recoverySeconds: 0.095,
    damageMultiplier: 1.12,
    hitStunSeconds: 0.2,
    knockbackSpeed: 270,
  },
  {
    startupSeconds: 0.13,
    activeSeconds: 0.105,
    recoverySeconds: 0.23,
    damageMultiplier: 1.38,
    hitStunSeconds: 0.3,
    knockbackSpeed: 430,
  },
] as const;

const MAX_ACTION_SEQUENCE = 1_000_000_000;
const MAX_SAVED_TARGET_IDS = 12;

function resolvedComboTiming(
  comboIndex: HuntMeleeComboIndex,
  profile: HuntMeleeProfile,
) {
  const timing = COMBO_TIMING[comboIndex];
  const cadenceMultiplier = comboIndex === 2 ? 1.4 : comboIndex === 1 ? 1.04 : 1;
  return {
    ...timing,
    recoverySeconds: Math.max(
      timing.recoverySeconds,
      profile.cooldownSeconds * cadenceMultiplier -
        timing.startupSeconds -
        timing.activeSeconds,
    ),
  };
}

function finite(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function normalizeFacing(value: unknown): HuntMeleeFacing {
  return value === -1 ? -1 : 1;
}

function normalizeComboIndex(value: unknown): HuntMeleeComboIndex {
  return value === 1 || value === 2 ? value : 0;
}

function normalizeProfile(value: unknown): HuntMeleeProfile | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const profile = value as Partial<HuntMeleeProfile>;
  if (
    typeof profile.weaponId !== "string" ||
    profile.weaponId.length === 0 ||
    typeof profile.damage !== "number" ||
    !Number.isFinite(profile.damage) ||
    profile.damage <= 0 ||
    typeof profile.cooldownSeconds !== "number" ||
    !Number.isFinite(profile.cooldownSeconds) ||
    profile.cooldownSeconds <= 0 ||
    typeof profile.reachPx !== "number" ||
    !Number.isFinite(profile.reachPx) ||
    profile.reachPx <= 0 ||
    typeof profile.maxTargetHits !== "number" ||
    !Number.isFinite(profile.maxTargetHits) ||
    profile.maxTargetHits < 1
  ) {
    return null;
  }
  return {
    weaponId: profile.weaponId.slice(0, 80),
    damage: clamp(finite(profile.damage, 0), 0, 1_000_000),
    cooldownSeconds: clamp(finite(profile.cooldownSeconds, 0.26), 0.08, 3),
    reachPx: clamp(finite(profile.reachPx, 1), 1, 2_048),
    maxTargetHits: Math.round(clamp(finite(profile.maxTargetHits, 1), 1, 12)),
    noiseLoudness: clamp(finite(profile.noiseLoudness, 0), 0, 1),
    noiseRadius: clamp(finite(profile.noiseRadius, 0), 0, 10_000),
  };
}

function idleState(actionSequence: number): HuntMeleeState {
  return {
    phase: "idle",
    phaseRemainingSeconds: 0,
    comboIndex: 0,
    actionSequence,
    facing: 1,
    buffered: false,
    queuedFacing: 1,
    hitTargetIds: [],
    profile: null,
    queuedProfile: null,
  };
}

export function createHuntMeleeState(): HuntMeleeState {
  return idleState(0);
}

export function normalizeHuntMeleeState(value: unknown): HuntMeleeState {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return createHuntMeleeState();
  }
  const candidate = value as Partial<HuntMeleeState>;
  const actionSequence = Math.round(
    clamp(finite(candidate.actionSequence, 0), 0, MAX_ACTION_SEQUENCE),
  );
  if (
    candidate.phase !== "startup" &&
    candidate.phase !== "active" &&
    candidate.phase !== "recovery"
  ) {
    return idleState(actionSequence);
  }
  const profile = normalizeProfile(candidate.profile);
  if (!profile) return idleState(actionSequence);
  const comboIndex = normalizeComboIndex(candidate.comboIndex);
  const timing = resolvedComboTiming(comboIndex, profile);
  const maximumPhaseSeconds =
    candidate.phase === "startup"
      ? timing.startupSeconds
      : candidate.phase === "active"
        ? timing.activeSeconds
        : timing.recoverySeconds;
  const hitTargetIds = Array.isArray(candidate.hitTargetIds)
    ? [...new Set(
        candidate.hitTargetIds.filter(
          (targetId): targetId is string =>
            typeof targetId === "string" && targetId.length > 0,
        ),
      )].slice(0, Math.min(profile.maxTargetHits, MAX_SAVED_TARGET_IDS))
    : [];
  const buffered = Boolean(candidate.buffered) && comboIndex < HUNT_MELEE_COMBO_LENGTH - 1;
  const queuedProfile = buffered
    ? normalizeProfile(candidate.queuedProfile) ?? profile
    : null;
  return {
    phase: candidate.phase,
    phaseRemainingSeconds: clamp(
      finite(candidate.phaseRemainingSeconds, maximumPhaseSeconds),
      Number.EPSILON,
      maximumPhaseSeconds,
    ),
    comboIndex,
    actionSequence,
    facing: normalizeFacing(candidate.facing),
    buffered,
    queuedFacing: normalizeFacing(candidate.queuedFacing),
    hitTargetIds,
    profile,
    queuedProfile,
  };
}

function beginAction(
  previousActionSequence: number,
  comboIndex: HuntMeleeComboIndex,
  profile: HuntMeleeProfile,
  facing: HuntMeleeFacing,
): HuntMeleeState {
  const nextSequence =
    previousActionSequence >= MAX_ACTION_SEQUENCE
      ? 1
      : previousActionSequence + 1;
  return {
    phase: "startup",
    phaseRemainingSeconds: COMBO_TIMING[comboIndex].startupSeconds,
    comboIndex,
    actionSequence: nextSequence,
    facing,
    buffered: false,
    queuedFacing: facing,
    hitTargetIds: [],
    profile,
    queuedProfile: null,
  };
}

export function isHuntMeleeBufferWindowOpen(
  current: HuntMeleeState,
): boolean {
  const state = normalizeHuntMeleeState(current);
  if (
    state.phase === "idle" ||
    state.phase === "startup" ||
    state.comboIndex >= HUNT_MELEE_COMBO_LENGTH - 1 ||
    state.buffered ||
    !state.profile
  ) {
    return false;
  }
  const timing = resolvedComboTiming(state.comboIndex, state.profile);
  const windowSeconds =
    state.phase === "active"
      ? Math.min(
          HUNT_MELEE_ACTIVE_BUFFER_SECONDS,
          timing.activeSeconds * 0.65,
        )
      : Math.min(
          HUNT_MELEE_RECOVERY_BUFFER_SECONDS,
          timing.recoverySeconds * 0.8,
        );
  return state.phaseRemainingSeconds <= windowSeconds + 1e-9;
}

export function requestHuntMeleeAttack(
  current: HuntMeleeState,
  requestedProfile: HuntMeleeProfile,
  facing: HuntMeleeFacing,
): HuntMeleeRequestResult {
  const state = normalizeHuntMeleeState(current);
  const profile = normalizeProfile(requestedProfile);
  if (!profile || profile.damage <= 0) {
    return { state, accepted: false, started: false };
  }
  if (state.phase === "idle") {
    return {
      state: beginAction(state.actionSequence, 0, profile, facing),
      accepted: true,
      started: true,
    };
  }
  if (!isHuntMeleeBufferWindowOpen(state)) {
    return { state, accepted: false, started: false };
  }
  return {
    state: {
      ...state,
      buffered: true,
      queuedFacing: facing,
      queuedProfile: profile,
    },
    accepted: true,
    started: false,
  };
}

export function cancelHuntMeleeAttack(
  current: HuntMeleeState,
): HuntMeleeState {
  const state = normalizeHuntMeleeState(current);
  return idleState(state.actionSequence);
}

export function currentHuntMeleeAttack(
  current: HuntMeleeState,
): HuntMeleeAttackSpec | null {
  const state = normalizeHuntMeleeState(current);
  if (state.phase === "idle" || !state.profile) return null;
  const timing = resolvedComboTiming(state.comboIndex, state.profile);
  return {
    ...timing,
    damage: state.profile.damage * timing.damageMultiplier,
    reachPx: state.profile.reachPx,
    maxTargetHits: state.profile.maxTargetHits,
  };
}

export function stepHuntMeleeCombat(
  current: HuntMeleeState,
  deltaSeconds: number,
): HuntMeleeStepResult {
  let state = normalizeHuntMeleeState(current);
  if (state.phase === "idle") {
    return {
      state,
      enteredActiveActionIds: [],
      startedComboIndexes: [],
    };
  }

  let remaining = clamp(finite(deltaSeconds, 0), 0, 2);
  const enteredActiveActionIds: number[] = [];
  const startedComboIndexes: HuntMeleeComboIndex[] = [];

  for (let transition = 0; transition < 12 && state.phase !== "idle"; transition += 1) {
    if (remaining + 1e-9 < state.phaseRemainingSeconds) {
      state = {
        ...state,
        phaseRemainingSeconds: state.phaseRemainingSeconds - remaining,
      };
      remaining = 0;
      break;
    }

    remaining -= state.phaseRemainingSeconds;
    const timing = resolvedComboTiming(state.comboIndex, state.profile!);
    if (state.phase === "startup") {
      state = {
        ...state,
        phase: "active",
        phaseRemainingSeconds: timing.activeSeconds,
      };
      enteredActiveActionIds.push(state.actionSequence);
    } else if (state.phase === "active") {
      state = {
        ...state,
        phase: "recovery",
        phaseRemainingSeconds: timing.recoverySeconds,
      };
    } else if (
      state.buffered &&
      state.comboIndex < HUNT_MELEE_COMBO_LENGTH - 1 &&
      state.queuedProfile
    ) {
      const nextComboIndex = (state.comboIndex + 1) as HuntMeleeComboIndex;
      state = beginAction(
        state.actionSequence,
        nextComboIndex,
        state.queuedProfile,
        state.queuedFacing,
      );
      startedComboIndexes.push(nextComboIndex);
    } else {
      state = idleState(state.actionSequence);
    }

    if (remaining <= Number.EPSILON) break;
  }

  return { state, enteredActiveActionIds, startedComboIndexes };
}

export function resolveHuntMeleeHitbox(
  current: HuntMeleeState,
  actor: HuntMeleeActor,
): HuntMeleeHitbox | null {
  const state = normalizeHuntMeleeState(current);
  const attack = currentHuntMeleeAttack(state);
  if (state.phase !== "active" || !attack) return null;
  const actorX = finite(actor.x, 0);
  const actorY = finite(actor.y, 0);
  const actorWidth = clamp(finite(actor.width, 1), 1, 2_048);
  const actorHeight = clamp(finite(actor.height, 1), 1, 2_048);
  const insetY = actorHeight * 0.14;
  const width = attack.reachPx;
  const forwardEdge =
    state.facing > 0
      ? actorX + actorWidth * 0.54
      : actorX + actorWidth * 0.46;
  return {
    x: state.facing > 0 ? forwardEdge : forwardEdge - width,
    y: actorY + insetY,
    width,
    height: actorHeight - insetY * 2,
    actionSequence: state.actionSequence,
    facing: state.facing,
  };
}

export function huntMeleeHitboxOverlaps(
  hitbox: HuntMeleeHitbox,
  target: HuntMeleeActorBox,
): boolean {
  return (
    hitbox.x < target.x + target.width &&
    hitbox.x + hitbox.width > target.x &&
    hitbox.y < target.y + target.height &&
    hitbox.y + hitbox.height > target.y
  );
}

export function canHuntMeleeHitTarget(
  current: HuntMeleeState,
  targetId: string,
): boolean {
  const state = normalizeHuntMeleeState(current);
  return Boolean(
    state.phase === "active" &&
      state.profile &&
      targetId.length > 0 &&
      !state.hitTargetIds.includes(targetId) &&
      state.hitTargetIds.length < state.profile.maxTargetHits,
  );
}

export function registerHuntMeleeTargetHit(
  current: HuntMeleeState,
  targetId: string,
): HuntMeleeState {
  const state = normalizeHuntMeleeState(current);
  if (!canHuntMeleeHitTarget(state, targetId)) return state;
  return {
    ...state,
    hitTargetIds: [...state.hitTargetIds, targetId],
  };
}

export function huntMeleeMovementMultiplier(
  current: HuntMeleeState,
): number {
  const phase = normalizeHuntMeleeState(current).phase;
  if (phase === "startup") return 0.62;
  if (phase === "active") return 0.38;
  if (phase === "recovery") return 0.72;
  return 1;
}

export function huntMeleePhaseLabel(
  current: HuntMeleeState,
): string | null {
  const phase = normalizeHuntMeleeState(current).phase;
  if (phase === "startup") return "ARMEMENT";
  if (phase === "active") return "FRAPPE";
  if (phase === "recovery") return "REPRISE";
  return null;
}
