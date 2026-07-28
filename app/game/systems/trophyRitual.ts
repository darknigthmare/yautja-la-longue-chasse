/**
 * Deterministic trophy-rite and drop-ship state machines.
 *
 * These functions deliberately avoid clocks and random APIs: callers provide
 * a stable seed and fixed deltas, so the same inputs can later be replayed in
 * tests, saves or a multiplayer authority simulation.
 */

export const TROPHY_RITUAL_ACTIONS = [
  "left",
  "right",
  "melee",
  "interact",
] as const;

export type TrophyRitualAction = (typeof TROPHY_RITUAL_ACTIONS)[number];
export type TrophyRitualStatus = "active" | "complete" | "failed";
export type TrophyRitualPhase = "ready" | "cue";
export type TrophyRitualFeedback =
  | "ready"
  | "perfect"
  | "good"
  | "early"
  | "wrong"
  | "missed";

export interface TrophyRitualState {
  phase: TrophyRitualPhase;
  seed: number;
  sequence: readonly TrophyRitualAction[];
  cueIndex: number;
  cueElapsedSeconds: number;
  readyElapsedSeconds: number;
  elapsedSeconds: number;
  mistakes: number;
  status: TrophyRitualStatus;
  feedback: TrophyRitualFeedback;
  lastAccuracy: number;
}

export interface TrophyRitualStep {
  state: TrophyRitualState;
  accepted: boolean;
  mistakeAdded: boolean;
}

export const TROPHY_RITUAL_TIMING = Object.freeze({
  cueCount: 6,
  /** Observation time before cue one can be missed. */
  readyDurationSeconds: 1.8,
  earliestHitSeconds: 0.18,
  perfectHitSeconds: 0.5,
  latestHitSeconds: 0.84,
  cueTimeoutSeconds: 1.08,
  maximumMistakes: 3,
});

function clamp(value: number, minimum = 0, maximum = 1): number {
  return Math.max(minimum, Math.min(maximum, value));
}

function smoothstep(value: number): number {
  const clamped = clamp(value);
  return clamped * clamped * (3 - 2 * clamped);
}

/** FNV-1a gives a stable unsigned seed for a mission and trophy id. */
export function trophyRitualSeed(value: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function nextSeed(seed: number): number {
  // Numerical Recipes LCG; sufficient here because it is only a cue shuffler.
  return (Math.imul(seed, 1_664_525) + 1_013_904_223) >>> 0;
}

export function createTrophyRitual(
  stableId: string,
  cueCount: number = TROPHY_RITUAL_TIMING.cueCount,
): TrophyRitualState {
  const sequence: TrophyRitualAction[] = [];
  let seed = trophyRitualSeed(stableId);
  const length = Math.max(3, Math.floor(cueCount));
  for (let index = 0; index < length; index += 1) {
    seed = nextSeed(seed);
    let actionIndex = seed % TROPHY_RITUAL_ACTIONS.length;
    if (
      sequence.length > 0 &&
      TROPHY_RITUAL_ACTIONS[actionIndex] === sequence[sequence.length - 1]
    ) {
      actionIndex = (actionIndex + 1 + (seed >>> 8) % 2) %
        TROPHY_RITUAL_ACTIONS.length;
    }
    sequence.push(TROPHY_RITUAL_ACTIONS[actionIndex]);
  }
  return {
    phase: "ready",
    seed: trophyRitualSeed(stableId),
    sequence,
    cueIndex: 0,
    cueElapsedSeconds: 0,
    readyElapsedSeconds: 0,
    elapsedSeconds: 0,
    mistakes: 0,
    status: "active",
    feedback: "ready",
    lastAccuracy: 0,
  };
}

function addMistake(
  state: TrophyRitualState,
  feedback: Extract<TrophyRitualFeedback, "early" | "wrong" | "missed">,
): TrophyRitualState {
  const mistakes = state.mistakes + 1;
  return {
    ...state,
    mistakes,
    cueElapsedSeconds: 0,
    feedback,
    lastAccuracy: 0,
    status:
      mistakes >= TROPHY_RITUAL_TIMING.maximumMistakes
        ? "failed"
        : "active",
  };
}

export function stepTrophyRitual(
  previous: TrophyRitualState,
  deltaSeconds: number,
  action: TrophyRitualAction | null,
): TrophyRitualStep {
  if (previous.status !== "active") {
    return { state: previous, accepted: false, mistakeAdded: false };
  }

  const delta = Math.max(0, deltaSeconds);
  const readyRemaining =
    previous.phase === "ready"
      ? Math.max(
          0,
          TROPHY_RITUAL_TIMING.readyDurationSeconds -
            previous.readyElapsedSeconds,
        )
      : 0;
  const readyDelta = Math.min(delta, readyRemaining);
  const cueDelta = Math.max(0, delta - readyDelta);
  const readyElapsedSeconds = Math.min(
    TROPHY_RITUAL_TIMING.readyDurationSeconds,
    previous.readyElapsedSeconds + readyDelta,
  );
  const phase: TrophyRitualPhase =
    readyElapsedSeconds >= TROPHY_RITUAL_TIMING.readyDurationSeconds
      ? "cue"
      : "ready";
  let state: TrophyRitualState = {
    ...previous,
    phase,
    cueElapsedSeconds: previous.cueElapsedSeconds + cueDelta,
    readyElapsedSeconds,
    elapsedSeconds: previous.elapsedSeconds + delta,
  };

  if (state.phase === "ready") {
    return { state, accepted: false, mistakeAdded: false };
  }

  if (state.cueElapsedSeconds > TROPHY_RITUAL_TIMING.cueTimeoutSeconds) {
    state = addMistake(state, "missed");
    return { state, accepted: false, mistakeAdded: true };
  }
  if (!action) {
    return { state, accepted: false, mistakeAdded: false };
  }
  if (action !== state.sequence[state.cueIndex]) {
    state = addMistake(state, "wrong");
    return { state, accepted: false, mistakeAdded: true };
  }
  if (state.cueElapsedSeconds < TROPHY_RITUAL_TIMING.earliestHitSeconds) {
    state = addMistake(state, "early");
    return { state, accepted: false, mistakeAdded: true };
  }
  if (state.cueElapsedSeconds > TROPHY_RITUAL_TIMING.latestHitSeconds) {
    state = addMistake(state, "missed");
    return { state, accepted: false, mistakeAdded: true };
  }

  const distanceFromPerfect = Math.abs(
    state.cueElapsedSeconds - TROPHY_RITUAL_TIMING.perfectHitSeconds,
  );
  const accuracy = clamp(1 - distanceFromPerfect / 0.34);
  const cueIndex = state.cueIndex + 1;
  state = {
    ...state,
    cueIndex,
    cueElapsedSeconds: 0,
    status: cueIndex >= state.sequence.length ? "complete" : "active",
    feedback: accuracy >= 0.76 ? "perfect" : "good",
    lastAccuracy: accuracy,
  };
  return { state, accepted: true, mistakeAdded: false };
}

export function trophyRitualProgress(state: TrophyRitualState): number {
  return clamp(state.cueIndex / Math.max(1, state.sequence.length));
}

export function trophyRitualReadyRemaining(
  state: TrophyRitualState,
): number {
  return Math.max(
    0,
    TROPHY_RITUAL_TIMING.readyDurationSeconds - state.readyElapsedSeconds,
  );
}

export interface TrophyVictoryState {
  elapsedSeconds: number;
  durationSeconds: number;
  complete: boolean;
}

export function createTrophyVictory(durationSeconds = 2.8): TrophyVictoryState {
  return {
    elapsedSeconds: 0,
    durationSeconds: Math.max(0.5, durationSeconds),
    complete: false,
  };
}

export function stepTrophyVictory(
  previous: TrophyVictoryState,
  deltaSeconds: number,
): TrophyVictoryState {
  if (previous.complete) return previous;
  const elapsedSeconds = Math.min(
    previous.durationSeconds,
    previous.elapsedSeconds + Math.max(0, deltaSeconds),
  );
  return {
    ...previous,
    elapsedSeconds,
    complete: elapsedSeconds >= previous.durationSeconds,
  };
}

/** 0..1 extraction-pose amount: lift, hold the trophy, then settle. */
export function trophyVictoryPose(state: TrophyVictoryState): number {
  const progress = clamp(state.elapsedSeconds / state.durationSeconds);
  if (progress < 0.34) return smoothstep(progress / 0.34);
  if (progress < 0.8) return 1;
  return 1 - smoothstep((progress - 0.8) / 0.2) * 0.72;
}

export type DropShipPhase =
  | "approach"
  | "hover"
  | "boarding"
  | "departure"
  | "complete";

export interface TrophyExtractionProtectionInput {
  phase: string;
  trophySecured: boolean;
  victoryPoseActive: boolean;
  dropShipPhase: DropShipPhase | null;
}

/**
 * Protect only moments where control is deliberately locked: the victory pose
 * and the physical boarding/departure animation. The run to the beacon and
 * the ship's approach/hover remain dangerous gameplay.
 */
export function isTrophyExtractionProtected(
  input: TrophyExtractionProtectionInput,
): boolean {
  return (
    input.trophySecured &&
    (input.victoryPoseActive ||
      (input.phase === "extraction" &&
        (input.dropShipPhase === "boarding" ||
          input.dropShipPhase === "departure")))
  );
}

export interface DropShipState {
  phase: DropShipPhase;
  phaseElapsedSeconds: number;
  totalElapsedSeconds: number;
}

export interface DropShipStepInput {
  deltaSeconds: number;
  playerAtBeacon: boolean;
  requestBoarding: boolean;
}

export interface DropShipStep {
  state: DropShipState;
  boardingAccepted: boolean;
  completed: boolean;
}

export interface DropShipVisual {
  x: number;
  y: number;
  beamStrength: number;
  doorOpen: number;
  boardingProgress: number;
  visible: boolean;
}

export const DROP_SHIP_TIMING = Object.freeze({
  approachSeconds: 3.8,
  boardingSeconds: 2.2,
  departureSeconds: 1.8,
});

export function createDropShipArrival(): DropShipState {
  return {
    phase: "approach",
    phaseElapsedSeconds: 0,
    totalElapsedSeconds: 0,
  };
}

export function stepDropShip(
  previous: DropShipState,
  input: DropShipStepInput,
): DropShipStep {
  if (previous.phase === "complete") {
    return { state: previous, boardingAccepted: false, completed: true };
  }
  const delta = Math.max(0, input.deltaSeconds);
  let state: DropShipState = {
    ...previous,
    phaseElapsedSeconds: previous.phaseElapsedSeconds + delta,
    totalElapsedSeconds: previous.totalElapsedSeconds + delta,
  };
  let boardingAccepted = false;

  if (
    state.phase === "approach" &&
    state.phaseElapsedSeconds >= DROP_SHIP_TIMING.approachSeconds
  ) {
    state = { ...state, phase: "hover", phaseElapsedSeconds: 0 };
  }
  if (
    state.phase === "hover" &&
    input.requestBoarding &&
    input.playerAtBeacon
  ) {
    state = { ...state, phase: "boarding", phaseElapsedSeconds: 0 };
    boardingAccepted = true;
  }
  if (
    state.phase === "boarding" &&
    state.phaseElapsedSeconds >= DROP_SHIP_TIMING.boardingSeconds
  ) {
    state = { ...state, phase: "departure", phaseElapsedSeconds: 0 };
  }
  if (
    state.phase === "departure" &&
    state.phaseElapsedSeconds >= DROP_SHIP_TIMING.departureSeconds
  ) {
    state = { ...state, phase: "complete", phaseElapsedSeconds: 0 };
  }
  return {
    state,
    boardingAccepted,
    completed: state.phase === "complete",
  };
}

export function dropShipVisual(
  state: DropShipState,
  beaconX: number,
): DropShipVisual {
  if (state.phase === "complete") {
    return {
      x: beaconX + 300,
      y: -220,
      beamStrength: 0,
      doorOpen: 0,
      boardingProgress: 1,
      visible: false,
    };
  }

  if (state.phase === "approach") {
    const progress = smoothstep(
      state.phaseElapsedSeconds / DROP_SHIP_TIMING.approachSeconds,
    );
    return {
      x: beaconX + (1 - progress) * 430,
      y: -170 + progress * 258,
      beamStrength: smoothstep(clamp((progress - 0.5) / 0.5)) * 0.82,
      doorOpen: 0,
      boardingProgress: 0,
      visible: true,
    };
  }

  if (state.phase === "departure") {
    const progress = smoothstep(
      state.phaseElapsedSeconds / DROP_SHIP_TIMING.departureSeconds,
    );
    return {
      x: beaconX + progress * 260,
      y: 88 - progress * 300,
      beamStrength: 1 - progress,
      doorOpen: 1 - progress,
      boardingProgress: 1,
      visible: true,
    };
  }

  const boardingProgress =
    state.phase === "boarding"
      ? smoothstep(
          state.phaseElapsedSeconds / DROP_SHIP_TIMING.boardingSeconds,
        )
      : 0;
  return {
    x: beaconX,
    y: 88 + Math.sin(state.totalElapsedSeconds * 2.3) * 3,
    beamStrength: 1,
    doorOpen: state.phase === "boarding" ? 1 : 0.72,
    boardingProgress,
    visible: true,
  };
}
