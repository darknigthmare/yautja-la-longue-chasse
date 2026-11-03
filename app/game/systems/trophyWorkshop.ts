/**
 * Pure, deterministic trophy-workshop mini-game.
 *
 * The state machine owns no clock, DOM or random source. A caller supplies
 * deltas and inputs, which makes a workshop attempt replayable and easy to
 * validate before mutating the persistent ship progression.
 */

export const TROPHY_WORKSHOP_INPUTS = [
  "left",
  "up",
  "down",
  "right",
  "confirm",
] as const;

export type TrophyWorkshopInput = (typeof TROPHY_WORKSHOP_INPUTS)[number];
export type TrophyWorkshopAction =
  | "clean"
  | "prepare"
  | "display"
  | "rite";
export type TrophyWorkshopStatus = "playing" | "success" | "failed";
export type TrophyWorkshopPhase = "ready" | "countdown" | "cue";
export type TrophyWorkshopFeedback =
  | "ready"
  | "perfect"
  | "good"
  | "early"
  | "late"
  | "wrong"
  | "missed";

export interface TrophyWorkshopActionConfig {
  label: string;
  title: string;
  instruction: string;
  cueCount: number;
  maximumMistakes: number;
  allowedInputs: readonly TrophyWorkshopInput[];
}

export const TROPHY_WORKSHOP_ACTIONS: Readonly<
  Record<TrophyWorkshopAction, TrophyWorkshopActionConfig>
> = Object.freeze({
  clean: {
    label: "Nettoyer",
    title: "Décontamination du trophée",
    instruction:
      "Suis les gestes de raclage lorsque le curseur traverse la zone verte.",
    cueCount: 6,
    maximumMistakes: 3,
    allowedInputs: ["left", "up", "down", "right"],
  },
  prepare: {
    label: "Préparer",
    title: "Montage rituel",
    instruction:
      "Aligne les attaches puis verrouille chaque point dans la fenêtre lumineuse.",
    cueCount: 7,
    maximumMistakes: 3,
    allowedInputs: ["left", "up", "down", "right", "confirm"],
  },
  display: {
    label: "Exposer",
    title: "Mise en alcôve",
    instruction:
      "Équilibre la prise et confirme son ancrage sans heurter le support.",
    cueCount: 5,
    maximumMistakes: 2,
    allowedInputs: ["left", "right", "up", "confirm"],
  },
  rite: {
    label: "Accomplir le rite",
    title: "Rite du clan",
    instruction:
      "Reproduis la cadence des glyphes pour consacrer la prise devant le clan.",
    cueCount: 8,
    maximumMistakes: 2,
    allowedInputs: ["left", "up", "down", "right", "confirm"],
  },
});

export const TROPHY_WORKSHOP_TIMING = Object.freeze({
  /** The first cue remains readable before its timing window can expire. */
  readyDurationSeconds: 1.8,
  earliestHitSeconds: 0.3,
  perfectHitSeconds: 0.66,
  latestHitSeconds: 1.02,
  cueTimeoutSeconds: 1.25,
});

export interface TrophyWorkshopState {
  action: TrophyWorkshopAction;
  phase: TrophyWorkshopPhase;
  seed: number;
  sequence: readonly TrophyWorkshopInput[];
  cueIndex: number;
  cueElapsedSeconds: number;
  readyElapsedSeconds: number;
  elapsedSeconds: number;
  mistakes: number;
  score: number;
  accuracyTotal: number;
  status: TrophyWorkshopStatus;
  feedback: TrophyWorkshopFeedback;
  lastAccuracy: number;
}

export interface TrophyWorkshopStep {
  state: TrophyWorkshopState;
  accepted: boolean;
  mistakeAdded: boolean;
}

export interface TrophyWorkshopResult {
  action: TrophyWorkshopAction;
  score: number;
  accuracy: number;
  mistakes: number;
  elapsedSeconds: number;
  grade: "worthy" | "blooded" | "elite" | "flawless";
}

function clamp(value: number, minimum = 0, maximum = 1): number {
  return Math.max(minimum, Math.min(maximum, value));
}

/** FNV-1a provides a stable unsigned seed from the trophy and action ids. */
export function trophyWorkshopSeed(value: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function nextSeed(seed: number): number {
  return (Math.imul(seed, 1_664_525) + 1_013_904_223) >>> 0;
}

export function createTrophyWorkshopSequence(
  action: TrophyWorkshopAction,
  stableId: string,
  cueCount = TROPHY_WORKSHOP_ACTIONS[action].cueCount,
): readonly TrophyWorkshopInput[] {
  const config = TROPHY_WORKSHOP_ACTIONS[action];
  const sequence: TrophyWorkshopInput[] = [];
  let seed = trophyWorkshopSeed(`${action}:${stableId}`);
  const length = Math.max(3, Math.floor(cueCount));

  for (let index = 0; index < length; index += 1) {
    seed = nextSeed(seed);
    let inputIndex = seed % config.allowedInputs.length;
    if (
      sequence.length > 0 &&
      config.allowedInputs[inputIndex] === sequence[sequence.length - 1]
    ) {
      inputIndex = (inputIndex + 1 + ((seed >>> 9) % 2)) %
        config.allowedInputs.length;
    }
    sequence.push(config.allowedInputs[inputIndex]);
  }
  return sequence;
}

export function createTrophyWorkshopGame(
  action: TrophyWorkshopAction,
  stableId: string,
  sequenceOverride?: readonly TrophyWorkshopInput[],
): TrophyWorkshopState {
  const config = TROPHY_WORKSHOP_ACTIONS[action];
  const sequence = sequenceOverride
    ? sequenceOverride.filter((input) => config.allowedInputs.includes(input))
    : createTrophyWorkshopSequence(action, stableId);

  if (sequence.length < 3) {
    throw new Error("Un atelier de trophée exige au moins trois gestes valides.");
  }

  return {
    action,
    phase: "ready",
    seed: trophyWorkshopSeed(`${action}:${stableId}`),
    sequence,
    cueIndex: 0,
    cueElapsedSeconds: 0,
    readyElapsedSeconds: 0,
    elapsedSeconds: 0,
    mistakes: 0,
    score: 0,
    accuracyTotal: 0,
    status: "playing",
    feedback: "ready",
    lastAccuracy: 0,
  };
}

/** The workshop clock never starts before an explicit player confirmation. */
export function startTrophyWorkshopGame(
  previous: TrophyWorkshopState,
): TrophyWorkshopState {
  if (previous.status !== "playing" || previous.phase !== "ready") {
    return previous;
  }
  return {
    ...previous,
    phase: "countdown",
    readyElapsedSeconds: 0,
    cueElapsedSeconds: 0,
    feedback: "ready",
  };
}

function addMistake(
  state: TrophyWorkshopState,
  feedback: Extract<
    TrophyWorkshopFeedback,
    "early" | "late" | "wrong" | "missed"
  >,
): TrophyWorkshopState {
  const mistakes = state.mistakes + 1;
  const maximumMistakes =
    TROPHY_WORKSHOP_ACTIONS[state.action].maximumMistakes;
  return {
    ...state,
    cueElapsedSeconds: 0,
    mistakes,
    feedback,
    lastAccuracy: 0,
    status: mistakes >= maximumMistakes ? "failed" : "playing",
  };
}

export function stepTrophyWorkshopGame(
  previous: TrophyWorkshopState,
  deltaSeconds: number,
  input: TrophyWorkshopInput | null = null,
): TrophyWorkshopStep {
  if (previous.status !== "playing") {
    return { state: previous, accepted: false, mistakeAdded: false };
  }

  // Opening the modal is not gameplay input. The machine remains inert until
  // the player presses the dedicated Start control or Enter.
  if (previous.phase === "ready") {
    return { state: previous, accepted: false, mistakeAdded: false };
  }

  const delta = Math.max(0, deltaSeconds);
  const readyRemaining =
    previous.phase === "countdown"
      ? Math.max(
          0,
          TROPHY_WORKSHOP_TIMING.readyDurationSeconds -
            previous.readyElapsedSeconds,
        )
      : 0;
  const readyDelta = Math.min(delta, readyRemaining);
  const cueDelta = Math.max(0, delta - readyDelta);
  const readyElapsedSeconds = Math.min(
    TROPHY_WORKSHOP_TIMING.readyDurationSeconds,
    previous.readyElapsedSeconds + readyDelta,
  );
  const phase: TrophyWorkshopPhase =
    readyElapsedSeconds >= TROPHY_WORKSHOP_TIMING.readyDurationSeconds
      ? "cue"
      : "countdown";
  let state: TrophyWorkshopState = {
    ...previous,
    phase,
    cueElapsedSeconds: previous.cueElapsedSeconds + cueDelta,
    readyElapsedSeconds,
    elapsedSeconds: previous.elapsedSeconds + delta,
  };

  // Inputs are deliberately ignored during the observation countdown. This
  // prevents an automatic miss while the player is still reading cue one.
  if (state.phase === "countdown") {
    return { state, accepted: false, mistakeAdded: false };
  }

  if (state.cueElapsedSeconds > TROPHY_WORKSHOP_TIMING.cueTimeoutSeconds) {
    state = addMistake(state, "missed");
    return { state, accepted: false, mistakeAdded: true };
  }

  if (!input) {
    return { state, accepted: false, mistakeAdded: false };
  }

  if (input !== state.sequence[state.cueIndex]) {
    state = addMistake(state, "wrong");
    return { state, accepted: false, mistakeAdded: true };
  }

  if (state.cueElapsedSeconds < TROPHY_WORKSHOP_TIMING.earliestHitSeconds) {
    state = addMistake(state, "early");
    return { state, accepted: false, mistakeAdded: true };
  }

  if (state.cueElapsedSeconds > TROPHY_WORKSHOP_TIMING.latestHitSeconds) {
    state = addMistake(state, "late");
    return { state, accepted: false, mistakeAdded: true };
  }

  const distance = Math.abs(
    state.cueElapsedSeconds - TROPHY_WORKSHOP_TIMING.perfectHitSeconds,
  );
  const accuracy = clamp(1 - distance / 0.36);
  const cueIndex = state.cueIndex + 1;
  const score = state.score + Math.round(accuracy * 100);
  state = {
    ...state,
    cueIndex,
    cueElapsedSeconds: 0,
    score,
    accuracyTotal: state.accuracyTotal + accuracy,
    status: cueIndex >= state.sequence.length ? "success" : "playing",
    feedback: accuracy >= 0.82 ? "perfect" : "good",
    lastAccuracy: accuracy,
  };
  return { state, accepted: true, mistakeAdded: false };
}

export function trophyWorkshopProgress(state: TrophyWorkshopState): number {
  return clamp(state.cueIndex / Math.max(1, state.sequence.length));
}

export function trophyWorkshopTimingPosition(
  state: TrophyWorkshopState,
): number {
  if (state.phase !== "cue") return 0;
  return clamp(
    state.cueElapsedSeconds / TROPHY_WORKSHOP_TIMING.cueTimeoutSeconds,
  );
}

export function trophyWorkshopReadyRemaining(
  state: TrophyWorkshopState,
): number {
  return Math.max(
    0,
    TROPHY_WORKSHOP_TIMING.readyDurationSeconds - state.readyElapsedSeconds,
  );
}

export function trophyWorkshopResult(
  state: TrophyWorkshopState,
): TrophyWorkshopResult | null {
  if (state.status !== "success") return null;
  const accuracy = clamp(
    state.accuracyTotal / Math.max(1, state.sequence.length),
  );
  const adjustedScore = Math.max(
    0,
    state.score - state.mistakes * 45,
  );
  const grade =
    state.mistakes === 0 && accuracy >= 0.96
      ? "flawless"
      : state.mistakes <= 1 && accuracy >= 0.82
        ? "elite"
        : accuracy >= 0.62
          ? "blooded"
          : "worthy";
  return {
    action: state.action,
    score: adjustedScore,
    accuracy,
    mistakes: state.mistakes,
    elapsedSeconds: state.elapsedSeconds,
    grade,
  };
}
