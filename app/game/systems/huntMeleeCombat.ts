"use strict";

export type HuntMeleePhase = "idle" | "startup" | "active" | "recovery";
export type HuntMeleeFacing = -1 | 1;
export type HuntMeleeComboIndex = 0 | 1 | 2;
export type HuntMeleeActionKind =
  | "light"
  | "heavy"
  | "aerial"
  | "guard-break"
  | "throw"
  | "execution";
export type HuntMeleeDefensePhase = "neutral" | "parry" | "dodge";

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
  /** V2 fields default safely when a V1 campaign checkpoint is restored. */
  actionKind: HuntMeleeActionKind;
  lockedTargetId: string | null;
  defensePhase: HuntMeleeDefensePhase;
  defenseRemainingSeconds: number;
  defenseCooldownSeconds: number;
  dodgeDirection: HuntMeleeFacing;
  parryConsumed: boolean;
}

export interface HuntMeleeAttackSpec {
  kind: HuntMeleeActionKind;
  startupSeconds: number;
  activeSeconds: number;
  recoverySeconds: number;
  damage: number;
  damageMultiplier: number;
  hitStunSeconds: number;
  knockbackSpeed: number;
  reachPx: number;
  maxTargetHits: number;
  verticalKnockbackSpeed: number;
  breaksGuard: boolean;
  isThrow: boolean;
  isExecution: boolean;
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

export interface HuntMeleeTechniqueContext {
  grounded: boolean;
  targetId?: string | null;
  targetHealthRatio?: number | null;
  targetIsBoss?: boolean;
  targetInRange?: boolean;
  targetTelegraphing?: boolean;
}

export interface HuntMeleeDefenseRequestResult {
  state: HuntMeleeState;
  accepted: boolean;
}

export interface HuntMeleeVerticalReactionState {
  y: number;
  velocityY: number;
  restY: number;
}

export interface HuntMeleeVerticalReactionStep {
  state: HuntMeleeVerticalReactionState;
  active: boolean;
}

export const HUNT_MELEE_COMBO_LENGTH = 3 as const;
export const HUNT_MELEE_ACTIVE_BUFFER_SECONDS = 0.05;
export const HUNT_MELEE_RECOVERY_BUFFER_SECONDS = 0.12;
export const HUNT_MELEE_EXECUTION_HEALTH_RATIO = 0.2;
export const HUNT_MELEE_PARRY_ACTIVE_SECONDS = 0.14;
export const HUNT_MELEE_DODGE_INVULNERABILITY_SECONDS = 0.18;
export const HUNT_MELEE_DODGE_SPEED = 620;

const HUNT_MELEE_PARRY_TOTAL_SECONDS = 0.24;
const HUNT_MELEE_PARRY_COOLDOWN_SECONDS = 0.52;
const HUNT_MELEE_DODGE_TOTAL_SECONDS = 0.3;
const HUNT_MELEE_DODGE_COOLDOWN_SECONDS = 0.48;

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

const TECHNIQUE_TIMING: Readonly<
  Record<
    Exclude<HuntMeleeActionKind, "light">,
    {
      startupSeconds: number;
      activeSeconds: number;
      recoverySeconds: number;
      damageMultiplier: number;
      hitStunSeconds: number;
      knockbackSpeed: number;
      verticalKnockbackSpeed: number;
      reachMultiplier: number;
      maxTargetHits: number;
      breaksGuard: boolean;
      isThrow: boolean;
      isExecution: boolean;
    }
  >
> = {
  heavy: {
    startupSeconds: 0.22,
    activeSeconds: 0.12,
    recoverySeconds: 0.34,
    damageMultiplier: 1.82,
    hitStunSeconds: 0.46,
    knockbackSpeed: 560,
    verticalKnockbackSpeed: -170,
    reachMultiplier: 1.12,
    maxTargetHits: 2,
    breaksGuard: false,
    isThrow: false,
    isExecution: false,
  },
  aerial: {
    startupSeconds: 0.07,
    activeSeconds: 0.17,
    recoverySeconds: 0.2,
    damageMultiplier: 1.32,
    hitStunSeconds: 0.28,
    knockbackSpeed: 330,
    verticalKnockbackSpeed: 260,
    reachMultiplier: 1.04,
    maxTargetHits: 2,
    breaksGuard: false,
    isThrow: false,
    isExecution: false,
  },
  "guard-break": {
    startupSeconds: 0.18,
    activeSeconds: 0.1,
    recoverySeconds: 0.3,
    damageMultiplier: 1.4,
    hitStunSeconds: 0.62,
    knockbackSpeed: 470,
    verticalKnockbackSpeed: -110,
    reachMultiplier: 0.96,
    maxTargetHits: 1,
    breaksGuard: true,
    isThrow: false,
    isExecution: false,
  },
  throw: {
    startupSeconds: 0.12,
    activeSeconds: 0.08,
    recoverySeconds: 0.38,
    damageMultiplier: 0.72,
    hitStunSeconds: 0.58,
    knockbackSpeed: 720,
    verticalKnockbackSpeed: -250,
    reachMultiplier: 0.68,
    maxTargetHits: 1,
    breaksGuard: true,
    isThrow: true,
    isExecution: false,
  },
  execution: {
    startupSeconds: 0.36,
    activeSeconds: 0.1,
    recoverySeconds: 0.56,
    damageMultiplier: 4,
    hitStunSeconds: 0.8,
    knockbackSpeed: 180,
    verticalKnockbackSpeed: 0,
    reachMultiplier: 0.62,
    maxTargetHits: 1,
    breaksGuard: true,
    isThrow: false,
    isExecution: true,
  },
};

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

function resolvedActionTiming(
  actionKind: HuntMeleeActionKind,
  comboIndex: HuntMeleeComboIndex,
  profile: HuntMeleeProfile,
) {
  if (actionKind === "light") {
    const timing = resolvedComboTiming(comboIndex, profile);
    return {
      ...timing,
      verticalKnockbackSpeed: 0,
      reachMultiplier: 1,
      maxTargetHits: profile.maxTargetHits,
      breaksGuard: false,
      isThrow: false,
      isExecution: false,
    };
  }
  return TECHNIQUE_TIMING[actionKind];
}

function finite(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

/** Integrates a launched target until it returns exactly to its captured rest height. */
export function stepHuntMeleeVerticalReaction(
  current: HuntMeleeVerticalReactionState,
  deltaSeconds: number,
): HuntMeleeVerticalReactionStep {
  const currentY = finite(current.y, 0);
  const restY = finite(current.restY, currentY);
  const velocityY = clamp(finite(current.velocityY, 0), -2_500, 2_500);
  const delta = clamp(finite(deltaSeconds, 0), 0, 0.05);
  if (currentY >= restY && velocityY >= 0) {
    return {
      state: { y: restY, velocityY: 0, restY },
      active: false,
    };
  }
  if (delta <= 0) {
    return {
      state: { y: currentY, velocityY, restY },
      active: currentY < restY || velocityY < 0,
    };
  }
  const nextVelocityY = velocityY + 1_180 * delta;
  const nextY = currentY + nextVelocityY * delta;
  if (nextY >= restY && nextVelocityY >= 0) {
    return {
      state: { y: restY, velocityY: 0, restY },
      active: false,
    };
  }
  return {
    state: { y: nextY, velocityY: nextVelocityY, restY },
    active: true,
  };
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

function normalizeActionKind(value: unknown): HuntMeleeActionKind {
  return value === "heavy" ||
    value === "aerial" ||
    value === "guard-break" ||
    value === "throw" ||
    value === "execution"
    ? value
    : "light";
}

function normalizeTargetId(value: unknown): string | null {
  return typeof value === "string" && value.length > 0
    ? value.slice(0, 120)
    : null;
}

function techniqueRequiresTarget(kind: HuntMeleeActionKind): boolean {
  return kind === "guard-break" || kind === "throw" || kind === "execution";
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
    actionKind: "light",
    lockedTargetId: null,
    defensePhase: "neutral",
    defenseRemainingSeconds: 0,
    defenseCooldownSeconds: 0,
    dodgeDirection: 1,
    parryConsumed: false,
  };
}

function normalizeIdleState(
  candidate: Partial<HuntMeleeState>,
  actionSequence: number,
): HuntMeleeState {
  const base = idleState(actionSequence);
  const requestedDefense =
    candidate.defensePhase === "parry" || candidate.defensePhase === "dodge"
      ? candidate.defensePhase
      : "neutral";
  const maximumDefenseSeconds =
    requestedDefense === "parry"
      ? HUNT_MELEE_PARRY_TOTAL_SECONDS
      : requestedDefense === "dodge"
        ? HUNT_MELEE_DODGE_TOTAL_SECONDS
        : 0;
  const defenseRemainingSeconds = clamp(
    finite(candidate.defenseRemainingSeconds, 0),
    0,
    maximumDefenseSeconds,
  );
  const defensePhase =
    requestedDefense !== "neutral" && defenseRemainingSeconds > Number.EPSILON
      ? requestedDefense
      : "neutral";
  return {
    ...base,
    facing: normalizeFacing(candidate.facing),
    queuedFacing: normalizeFacing(candidate.queuedFacing),
    defensePhase,
    defenseRemainingSeconds:
      defensePhase === "neutral" ? 0 : defenseRemainingSeconds,
    defenseCooldownSeconds: clamp(
      finite(candidate.defenseCooldownSeconds, 0),
      0,
      2,
    ),
    dodgeDirection: normalizeFacing(candidate.dodgeDirection),
    parryConsumed:
      defensePhase === "parry" ? Boolean(candidate.parryConsumed) : false,
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
  if (candidate.phase === "idle") {
    return normalizeIdleState(candidate, actionSequence);
  }
  if (
    candidate.phase !== "startup" &&
    candidate.phase !== "active" &&
    candidate.phase !== "recovery"
  ) {
    return idleState(actionSequence);
  }
  const profile = normalizeProfile(candidate.profile);
  if (!profile) return idleState(actionSequence);
  const actionKind = normalizeActionKind(candidate.actionKind);
  const lockedTargetId = normalizeTargetId(candidate.lockedTargetId);
  if (techniqueRequiresTarget(actionKind) && !lockedTargetId) {
    return idleState(actionSequence);
  }
  const comboIndex =
    actionKind === "light" ? normalizeComboIndex(candidate.comboIndex) : 0;
  const timing = resolvedActionTiming(actionKind, comboIndex, profile);
  const maximumPhaseSeconds =
    candidate.phase === "startup"
      ? timing.startupSeconds
      : candidate.phase === "active"
        ? timing.activeSeconds
        : timing.recoverySeconds;
  const hitLimit = Math.min(
    profile.maxTargetHits,
    timing.maxTargetHits,
    MAX_SAVED_TARGET_IDS,
  );
  const hitTargetIds = Array.isArray(candidate.hitTargetIds)
    ? [...new Set(
        candidate.hitTargetIds.filter(
          (targetId): targetId is string =>
            typeof targetId === "string" && targetId.length > 0,
        ),
      )].slice(0, hitLimit)
    : [];
  const buffered =
    actionKind === "light" &&
    Boolean(candidate.buffered) &&
    comboIndex < HUNT_MELEE_COMBO_LENGTH - 1;
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
    actionKind,
    lockedTargetId,
    defensePhase: "neutral",
    defenseRemainingSeconds: 0,
    defenseCooldownSeconds: clamp(
      finite(candidate.defenseCooldownSeconds, 0),
      0,
      2,
    ),
    dodgeDirection: normalizeFacing(candidate.dodgeDirection),
    parryConsumed: false,
  };
}

function beginAction(
  previousActionSequence: number,
  comboIndex: HuntMeleeComboIndex,
  profile: HuntMeleeProfile,
  facing: HuntMeleeFacing,
  actionKind: HuntMeleeActionKind = "light",
  lockedTargetId: string | null = null,
  defenseCooldownSeconds = 0,
): HuntMeleeState {
  const nextSequence =
    previousActionSequence >= MAX_ACTION_SEQUENCE
      ? 1
      : previousActionSequence + 1;
  const timing = resolvedActionTiming(actionKind, comboIndex, profile);
  return {
    phase: "startup",
    phaseRemainingSeconds: timing.startupSeconds,
    comboIndex,
    actionSequence: nextSequence,
    facing,
    buffered: false,
    queuedFacing: facing,
    hitTargetIds: [],
    profile,
    queuedProfile: null,
    actionKind,
    lockedTargetId,
    defensePhase: "neutral",
    defenseRemainingSeconds: 0,
    defenseCooldownSeconds,
    dodgeDirection: facing,
    parryConsumed: false,
  };
}

export function isHuntMeleeBufferWindowOpen(
  current: HuntMeleeState,
): boolean {
  const state = normalizeHuntMeleeState(current);
  if (
    state.phase === "idle" ||
    state.phase === "startup" ||
    state.actionKind !== "light" ||
    state.defensePhase !== "neutral" ||
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
  if (state.phase === "idle" && state.defensePhase === "neutral") {
    return {
      state: beginAction(
        state.actionSequence,
        0,
        profile,
        facing,
        "light",
        null,
        state.defenseCooldownSeconds,
      ),
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

export function requestHuntMeleeTechniqueAttack(
  current: HuntMeleeState,
  requestedProfile: HuntMeleeProfile,
  facing: HuntMeleeFacing,
  actionKind: Exclude<HuntMeleeActionKind, "light">,
  context: HuntMeleeTechniqueContext,
): HuntMeleeRequestResult {
  const state = normalizeHuntMeleeState(current);
  const profile = normalizeProfile(requestedProfile);
  if (
    !profile ||
    !context ||
    typeof context !== "object" ||
    state.phase !== "idle" ||
    state.defensePhase !== "neutral"
  ) {
    return { state, accepted: false, started: false };
  }

  const targetId = normalizeTargetId(context.targetId);
  const targetInRange = context.targetInRange === true;
  const targetIsBoss = context.targetIsBoss === true;
  const healthRatio =
    typeof context.targetHealthRatio === "number" &&
    Number.isFinite(context.targetHealthRatio)
      ? context.targetHealthRatio
      : null;
  const allowed =
    (actionKind === "heavy" && context.grounded) ||
    (actionKind === "aerial" && !context.grounded) ||
    (actionKind === "guard-break" &&
      context.grounded &&
      targetId !== null &&
      targetInRange &&
      context.targetTelegraphing === true) ||
    (actionKind === "throw" &&
      context.grounded &&
      targetId !== null &&
      targetInRange &&
      !targetIsBoss) ||
    (actionKind === "execution" &&
      context.grounded &&
      targetId !== null &&
      targetInRange &&
      !targetIsBoss &&
      healthRatio !== null &&
      healthRatio > 0 &&
      healthRatio <= HUNT_MELEE_EXECUTION_HEALTH_RATIO);
  if (!allowed) return { state, accepted: false, started: false };

  return {
    state: beginAction(
      state.actionSequence,
      0,
      profile,
      facing,
      actionKind,
      techniqueRequiresTarget(actionKind) ? targetId : null,
      state.defenseCooldownSeconds,
    ),
    accepted: true,
    started: true,
  };
}

export function requestHuntMeleeParry(
  current: HuntMeleeState,
): HuntMeleeDefenseRequestResult {
  const state = normalizeHuntMeleeState(current);
  if (
    state.phase !== "idle" ||
    state.defensePhase !== "neutral" ||
    state.defenseCooldownSeconds > Number.EPSILON
  ) {
    return { state, accepted: false };
  }
  return {
    accepted: true,
    state: {
      ...state,
      defensePhase: "parry",
      defenseRemainingSeconds: HUNT_MELEE_PARRY_TOTAL_SECONDS,
      defenseCooldownSeconds: HUNT_MELEE_PARRY_COOLDOWN_SECONDS,
      parryConsumed: false,
    },
  };
}

export function requestHuntMeleeDodge(
  current: HuntMeleeState,
  direction: HuntMeleeFacing,
): HuntMeleeDefenseRequestResult {
  const state = normalizeHuntMeleeState(current);
  if (
    state.phase !== "idle" ||
    state.defensePhase !== "neutral" ||
    state.defenseCooldownSeconds > Number.EPSILON
  ) {
    return { state, accepted: false };
  }
  const dodgeDirection = normalizeFacing(direction);
  return {
    accepted: true,
    state: {
      ...state,
      facing: dodgeDirection,
      defensePhase: "dodge",
      defenseRemainingSeconds: HUNT_MELEE_DODGE_TOTAL_SECONDS,
      defenseCooldownSeconds: HUNT_MELEE_DODGE_COOLDOWN_SECONDS,
      dodgeDirection,
      parryConsumed: false,
    },
  };
}

export function canHuntMeleeParry(current: HuntMeleeState): boolean {
  const state = normalizeHuntMeleeState(current);
  return Boolean(
    state.phase === "idle" &&
      state.defensePhase === "parry" &&
      !state.parryConsumed &&
      state.defenseRemainingSeconds >=
        HUNT_MELEE_PARRY_TOTAL_SECONDS - HUNT_MELEE_PARRY_ACTIVE_SECONDS - 1e-9,
  );
}

export function consumeHuntMeleeParry(
  current: HuntMeleeState,
): HuntMeleeState {
  const state = normalizeHuntMeleeState(current);
  if (!canHuntMeleeParry(state)) return state;
  return {
    ...state,
    defensePhase: "neutral",
    defenseRemainingSeconds: 0,
    defenseCooldownSeconds: Math.max(state.defenseCooldownSeconds, 0.28),
    parryConsumed: true,
  };
}

export function isHuntMeleeDodgeInvulnerable(
  current: HuntMeleeState,
): boolean {
  const state = normalizeHuntMeleeState(current);
  return Boolean(
    state.phase === "idle" &&
      state.defensePhase === "dodge" &&
      state.defenseRemainingSeconds >=
        HUNT_MELEE_DODGE_TOTAL_SECONDS -
          HUNT_MELEE_DODGE_INVULNERABILITY_SECONDS -
          1e-9,
  );
}

export function huntMeleeDodgeVelocity(current: HuntMeleeState): number {
  const state = normalizeHuntMeleeState(current);
  if (state.phase !== "idle" || state.defensePhase !== "dodge") return 0;
  const speedRatio = clamp(
    state.defenseRemainingSeconds / HUNT_MELEE_DODGE_TOTAL_SECONDS,
    0.35,
    1,
  );
  return state.dodgeDirection * HUNT_MELEE_DODGE_SPEED * speedRatio;
}

export function huntMeleeStaminaMultiplier(
  actionKind: HuntMeleeActionKind,
): number {
  if (actionKind === "heavy") return 1.65;
  if (actionKind === "aerial") return 1.15;
  if (actionKind === "guard-break") return 1.4;
  if (actionKind === "throw") return 1.25;
  if (actionKind === "execution") return 0.8;
  return 1;
}

export function cancelHuntMeleeAttack(
  current: HuntMeleeState,
): HuntMeleeState {
  const state = normalizeHuntMeleeState(current);
  return {
    ...idleState(state.actionSequence),
    defenseCooldownSeconds: state.defenseCooldownSeconds,
    facing: state.facing,
    queuedFacing: state.facing,
  };
}

export function currentHuntMeleeAttack(
  current: HuntMeleeState,
): HuntMeleeAttackSpec | null {
  const state = normalizeHuntMeleeState(current);
  if (state.phase === "idle" || !state.profile) return null;
  const timing = resolvedActionTiming(
    state.actionKind,
    state.comboIndex,
    state.profile,
  );
  return {
    kind: state.actionKind,
    ...timing,
    damage: state.profile.damage * timing.damageMultiplier,
    reachPx: state.profile.reachPx * timing.reachMultiplier,
    maxTargetHits: Math.min(
      state.profile.maxTargetHits,
      timing.maxTargetHits,
    ),
  };
}

function stepDefenseClock(
  current: HuntMeleeState,
  deltaSeconds: number,
): HuntMeleeState {
  const elapsed = clamp(finite(deltaSeconds, 0), 0, 2);
  const defenseCooldownSeconds = Math.max(
    0,
    current.defenseCooldownSeconds - elapsed,
  );
  if (current.defensePhase === "neutral") {
    return { ...current, defenseCooldownSeconds };
  }
  const defenseRemainingSeconds = Math.max(
    0,
    current.defenseRemainingSeconds - elapsed,
  );
  if (defenseRemainingSeconds <= Number.EPSILON) {
    return {
      ...current,
      defensePhase: "neutral",
      defenseRemainingSeconds: 0,
      defenseCooldownSeconds,
      parryConsumed: false,
    };
  }
  return {
    ...current,
    defenseRemainingSeconds,
    defenseCooldownSeconds,
  };
}

export function stepHuntMeleeCombat(
  current: HuntMeleeState,
  deltaSeconds: number,
): HuntMeleeStepResult {
  const elapsed = clamp(finite(deltaSeconds, 0), 0, 2);
  let state = stepDefenseClock(normalizeHuntMeleeState(current), elapsed);
  if (state.phase === "idle") {
    return {
      state,
      enteredActiveActionIds: [],
      startedComboIndexes: [],
    };
  }

  let remaining = elapsed;
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
    const timing = resolvedActionTiming(
      state.actionKind,
      state.comboIndex,
      state.profile!,
    );
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
        "light",
        null,
        state.defenseCooldownSeconds,
      );
      startedComboIndexes.push(nextComboIndex);
    } else {
      const completedFacing = state.facing;
      const cooldown = state.defenseCooldownSeconds;
      state = {
        ...idleState(state.actionSequence),
        facing: completedFacing,
        queuedFacing: completedFacing,
        defenseCooldownSeconds: cooldown,
      };
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
  const insetY =
    state.actionKind === "aerial"
      ? actorHeight * 0.28
      : state.actionKind === "throw" || state.actionKind === "execution"
        ? actorHeight * 0.08
        : actorHeight * 0.14;
  const hitboxHeight =
    state.actionKind === "aerial"
      ? actorHeight * 1.16
      : actorHeight - insetY * 2;
  const width = attack.reachPx;
  const forwardEdge =
    state.facing > 0
      ? actorX + actorWidth * 0.54
      : actorX + actorWidth * 0.46;
  return {
    x: state.facing > 0 ? forwardEdge : forwardEdge - width,
    y: actorY + insetY,
    width,
    height: hitboxHeight,
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
      (state.lockedTargetId === null || state.lockedTargetId === targetId) &&
      !state.hitTargetIds.includes(targetId) &&
      state.hitTargetIds.length <
        Math.min(
          state.profile.maxTargetHits,
          currentHuntMeleeAttack(state)?.maxTargetHits ??
            state.profile.maxTargetHits,
        ),
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

export function huntMeleeActionLabel(
  actionKind: HuntMeleeActionKind,
): string {
  if (actionKind === "heavy") return "LOURDE";
  if (actionKind === "aerial") return "AÉRIENNE";
  if (actionKind === "guard-break") return "BRISE-GARDE";
  if (actionKind === "throw") return "PROJECTION";
  if (actionKind === "execution") return "EXÉCUTION";
  return "LAMES";
}

export function huntMeleeMovementMultiplier(
  current: HuntMeleeState,
): number {
  const state = normalizeHuntMeleeState(current);
  if (state.defensePhase === "dodge") return 0;
  if (state.defensePhase === "parry") return 0.2;
  if (state.phase === "startup") {
    return state.actionKind === "heavy" || state.actionKind === "execution"
      ? 0.28
      : 0.62;
  }
  if (state.phase === "active") return 0.38;
  if (state.phase === "recovery") {
    return state.actionKind === "execution" ? 0.42 : 0.72;
  }
  return 1;
}

export function huntMeleePhaseLabel(
  current: HuntMeleeState,
): string | null {
  const state = normalizeHuntMeleeState(current);
  if (state.defensePhase === "parry") return "PARADE";
  if (state.defensePhase === "dodge") return "ESQUIVE";
  const prefix =
    state.actionKind === "light"
      ? ""
      : huntMeleeActionLabel(state.actionKind) + " · ";
  if (state.phase === "startup") return prefix + "ARMEMENT";
  if (state.phase === "active") return prefix + "FRAPPE";
  if (state.phase === "recovery") return prefix + "REPRISE";
  return null;
}
