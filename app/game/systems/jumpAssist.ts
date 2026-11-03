import type { WorldPlatform } from "./worldBlueprints";
import { resolvePlatformMotion, type PlatformMotionBody } from "./platformCollision";

export const COYOTE_SECONDS = 0.1;
export const JUMP_BUFFER_SECONDS = 0.12;
export const JUMP_VELOCITY = -720;
export const CLIMB_JUMP_VELOCITY = -560;
export const RELEASE_JUMP_VELOCITY = -300;
const TIME_EPSILON = 1e-9;

/** Transient control state: never restore these timers from a saved hunt. */
export interface JumpAssistState {
  coyoteSeconds: number;
  bufferSeconds: number;
  cutArmed: boolean;
  requiresRelease: boolean;
}

export interface JumpAssistInput {
  deltaSeconds: number;
  /** Fresh action edge, separate from the combined held state of all devices. */
  pressed: boolean;
  held: boolean;
  grounded: boolean;
  climbing: boolean;
  /** Acquisition AND the current airborne cycle's unspent boost, owned by PlayerState. */
  canBoost: boolean;
  velocityY: number;
  /** Actual downward collision predicted within the buffer window. */
  landingSoon?: boolean;
  actionLocked?: boolean;
  suspended?: boolean;
}

export interface JumpAssistResult {
  state: JumpAssistState;
  velocityY: number;
  jump: "ground" | "coyote" | "climb" | "boost" | null;
  cut: boolean;
}

/** Pause/focus/retry/resume callers pass requireRelease:true before accepting input. */
export function freshJumpAssistState(options: { requireRelease?: boolean } = {}): JumpAssistState {
  return { coyoteSeconds: 0, bufferSeconds: 0, cutArmed: false, requiresRelease: options.requireRelease ?? false };
}

function timer(value: number, maximum: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.min(maximum, value)) : 0;
}

/**
 * Call once per simulation step before gravity and collision integration.
 * Ground/coyote and climb jumps take priority over a boost. A buffered press
 * can only launch from support (or a climb), never become a deferred aerial
 * boost. A fresh descending press near a real landing queues that ground jump
 * instead of spending the optional boost. The caller alone spends/resets boosts.
 */
export function stepJumpAssist(previous: JumpAssistState, input: JumpAssistInput): JumpAssistResult {
  if (!Number.isFinite(input.deltaSeconds) || input.deltaSeconds < 0 || !Number.isFinite(input.velocityY)) {
    throw new RangeError("Jump assistance requires finite velocity and non-negative delta");
  }
  const idle = (state: JumpAssistState): JumpAssistResult => ({ state, velocityY: input.velocityY, jump: null, cut: false });
  if (input.suspended || input.actionLocked) return idle(freshJumpAssistState({ requireRelease: true }));
  if (previous.requiresRelease) return idle(freshJumpAssistState({ requireRelease: input.held }));

  const oldCoyote = timer(previous.coyoteSeconds, COYOTE_SECONDS);
  const oldBuffer = timer(previous.bufferSeconds, JUMP_BUFFER_SECONDS);
  const coyoteAvailable = oldCoyote > 0 && oldCoyote - input.deltaSeconds >= -TIME_EPSILON;
  const bufferedAvailable = oldBuffer > 0 && oldBuffer - input.deltaSeconds >= -TIME_EPSILON;
  const state: JumpAssistState = {
    coyoteSeconds: input.grounded ? COYOTE_SECONDS : Math.max(0, oldCoyote - input.deltaSeconds),
    bufferSeconds: input.pressed ? JUMP_BUFFER_SECONDS : Math.max(0, oldBuffer - input.deltaSeconds),
    cutArmed: previous.cutArmed,
    requiresRelease: false,
  };
  let velocityY = input.velocityY;
  let jump: JumpAssistResult["jump"] = null;
  let cut = false;
  const request = input.pressed || bufferedAvailable;
  if (request && input.climbing) jump = "climb";
  else if (request && input.grounded) jump = "ground";
  else if (request && coyoteAvailable) jump = "coyote";
  else if (input.pressed && input.canBoost && !(input.velocityY >= 0 && input.landingSoon)) jump = "boost";

  if (jump) {
    velocityY = jump === "climb" ? CLIMB_JUMP_VELOCITY : JUMP_VELOCITY;
    state.coyoteSeconds = 0; // A deliberate launch cannot create another free coyote jump.
    state.bufferSeconds = 0;
    state.cutArmed = true;
  } else if (state.cutArmed && !input.held) {
    if (velocityY < RELEASE_JUMP_VELOCITY) {
      velocityY = RELEASE_JUMP_VELOCITY;
      cut = true;
    }
    state.cutArmed = false; // Release changes ascent only once, never later knockback/falling.
  } else if (velocityY >= 0) {
    state.cutArmed = false;
  }
  return { state, velocityY, jump, cut };
}

/**
 * Run only on a fresh descending press when a boost is available. Prediction
 * uses the same swept geometry as movement, including walls and one-way floors;
 * short steps retain gravity curvature and detect an early
 * landing even if horizontal momentum would leave that ledge before 120 ms.
 */
export function predictLandingWithinBuffer(
  body: PlatformMotionBody,
  platforms: readonly WorldPlatform[],
  floorY: number,
  gravity = 1850,
): boolean {
  if (!Number.isFinite(gravity) || gravity <= 0) throw new RangeError("Landing prediction requires positive finite gravity");
  if (body.velocityY < 0) return false;
  let predicted = { ...body };
  let elapsed = 0;
  while (elapsed < JUMP_BUFFER_SECONDS - TIME_EPSILON) {
    const delta = Math.min(1 / 120, JUMP_BUFFER_SECONDS - elapsed);
    const velocityY = predicted.velocityY + gravity * delta;
    const result = resolvePlatformMotion({ ...predicted, velocityY }, {
      x: predicted.x + predicted.velocityX * delta,
      y: predicted.y + velocityY * delta,
    }, platforms, floorY);
    if (result.grounded) return true;
    predicted = { ...predicted, ...result };
    elapsed += delta;
  }
  return false;
}
