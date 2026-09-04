import {
  createPitCombatState,
  PIT_STATE_VERSION,
  PIT_TICK_RATE,
  serializePitCombat,
  stepPitCombat,
  type PitAttackKind,
  type PitCombatMode,
  type PitCombatState,
  type PitFighterId,
  type PitInput,
  type PitMatchPhase,
} from "./pitCombat";

export const PIT_REPLAY_VERSION = 2;
export const PIT_REPLAY_ENCODING = "input-rle-v2";
export const PIT_REPLAY_MAX_SERIALIZED_BYTES = 64 * 1024;
export const PIT_REPLAY_MAX_TICKS = PIT_TICK_RATE * 60 * 10;
export const PIT_REPLAY_MAX_SEGMENTS = 5_000;

const PIT_REPLAY_INPUT_BITS = 11;
const PIT_REPLAY_INPUT_MASK = (1 << PIT_REPLAY_INPUT_BITS) - 1;
const PIT_REPLAY_INPUT_PAIR_MAX = (1 << (PIT_REPLAY_INPUT_BITS * 2)) - 1;
const PIT_REPLAY_MAX_SEED = 0xffff_ffff;
const INVALID_REPLAY_MESSAGE = "Invalid or incompatible THE PIT replay.";

const INPUT_FLAGS = {
  left: 1 << 0,
  right: 1 << 1,
  down: 1 << 2,
  jump: 1 << 3,
  guardHigh: 1 << 4,
  guardLow: 1 << 5,
  throw: 1 << 6,
  resource: 1 << 10,
} as const;

const ATTACK_SHIFT = 7;
const ATTACK_CODE: Readonly<Record<PitAttackKind, number>> = {
  light: 1,
  medium: 2,
  heavy: 3,
  technique: 4,
};
const ATTACK_BY_CODE: Readonly<Record<number, PitAttackKind>> = {
  1: "light",
  2: "medium",
  3: "heavy",
  4: "technique",
};

const INPUT_KEYS = [
  "left",
  "right",
  "down",
  "jump",
  "guardHigh",
  "guardLow",
  "attack",
  "throw",
  "resource",
] as const;
const BOOLEAN_INPUT_KEYS = [
  "left",
  "right",
  "down",
  "jump",
  "guardHigh",
  "guardLow",
  "throw",
  "resource",
] as const;
const REPLAY_KEYS = [
  "version",
  "engineVersion",
  "tickRate",
  "arenaId",
  "encoding",
  "seed",
  "rules",
  "fighters",
  "segments",
  "metadata",
] as const;
const METADATA_KEYS = [
  "ticks",
  "durationMs",
  "winnerId",
  "finalPhase",
  "completed",
  "finalFrame",
  "checksum",
] as const;

export type PitReplaySegment = readonly [ticks: number, inputPair: number];

export interface PitReplayMetadata {
  ticks: number;
  durationMs: number;
  winnerId: PitFighterId | null;
  finalPhase: PitMatchPhase;
  completed: boolean;
  finalFrame: number;
  checksum: string;
}

export interface PitReplay {
  version: typeof PIT_REPLAY_VERSION;
  engineVersion: typeof PIT_STATE_VERSION;
  tickRate: typeof PIT_TICK_RATE;
  arenaId: "the-pit";
  encoding: typeof PIT_REPLAY_ENCODING;
  seed: number;
  rules: { mode: PitCombatMode };
  fighters: readonly [PitFighterId, PitFighterId];
  segments: readonly PitReplaySegment[];
  metadata: PitReplayMetadata;
}

export interface PitReplayRecordingOptions {
  fighters?: readonly [PitFighterId, PitFighterId];
  rules?: { mode: PitCombatMode };
  seed?: number;
}

export interface PitReplayRecorder {
  readonly tickCount: number;
  readonly completed: boolean;
  readonly finished: boolean;
  append(inputs: readonly [PitInput, PitInput]): void;
  finish(): PitReplay;
}

export interface PitReplayTick {
  tick: number;
  inputs: readonly [PitInput, PitInput];
}

export type PitReplayReadResult =
  | { done: false; value: PitReplayTick }
  | { done: true; value: null };

export interface PitReplayReader {
  readonly tick: number;
  readonly totalTicks: number;
  readonly remainingTicks: number;
  readonly done: boolean;
  next(): PitReplayReadResult;
}

interface ValidatedReplay {
  replay: PitReplay;
  finalState: PitCombatState;
}

interface NormalizedRecordingOptions {
  fighters: readonly [PitFighterId, PitFighterId];
  rules: { mode: PitCombatMode };
  seed: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function hasOnlyKeys(value: Record<string, unknown>, allowed: readonly string[]): boolean {
  const allowedKeys = new Set(allowed);
  return Object.keys(value).every((key) => allowedKeys.has(key));
}

function isIntegerBetween(value: unknown, minimum: number, maximum: number): value is number {
  return Number.isInteger(value) && (value as number) >= minimum && (value as number) <= maximum;
}

function isFighterId(value: unknown): value is PitFighterId {
  return value === "jungle-hunter" || value === "berserker";
}

function isCombatMode(value: unknown): value is PitCombatMode {
  return value === "match" || value === "training";
}

function isMatchPhase(value: unknown): value is PitMatchPhase {
  return value === "round" || value === "round-over" || value === "match-over";
}

function serializedByteLength(serialized: string): number {
  return new TextEncoder().encode(serialized).byteLength;
}

/** V1 archives are intentionally rejected: their V1 engine checksum cannot be verified by the V2 simulator. */
export type PitReplayRejectionCode =
  | "invalid-replay"
  | "legacy-version"
  | "future-version"
  | "incompatible-engine";

export class PitReplayCompatibilityError extends Error {
  readonly code: PitReplayRejectionCode;

  constructor(code: PitReplayRejectionCode = "invalid-replay") {
    super(INVALID_REPLAY_MESSAGE);
    this.name = "PitReplayCompatibilityError";
    this.code = code;
  }
}

function replayRejectionCode(value: unknown): PitReplayRejectionCode {
  if (!isRecord(value)) return "invalid-replay";
  if (typeof value.version === "number" && Number.isInteger(value.version)) {
    if (value.version < PIT_REPLAY_VERSION) return "legacy-version";
    if (value.version > PIT_REPLAY_VERSION) return "future-version";
  }
  if (value.version === PIT_REPLAY_VERSION &&
    value.engineVersion !== undefined &&
    value.engineVersion !== PIT_STATE_VERSION) {
    return "incompatible-engine";
  }
  return "invalid-replay";
}

function replayError(code: PitReplayRejectionCode = "invalid-replay"): PitReplayCompatibilityError {
  return new PitReplayCompatibilityError(code);
}

function assertInput(input: unknown): asserts input is PitInput {
  if (!isRecord(input) || !hasOnlyKeys(input, INPUT_KEYS)) throw replayError();
  for (const key of BOOLEAN_INPUT_KEYS) {
    if (input[key] !== undefined && typeof input[key] !== "boolean") throw replayError();
  }
  if (input.attack !== undefined &&
    (typeof input.attack !== "string" || !(input.attack in ATTACK_CODE))) {
    throw replayError();
  }
}

function validPackedInput(mask: unknown): mask is number {
  if (!isIntegerBetween(mask, 0, PIT_REPLAY_INPUT_MASK)) return false;
  const attackCode = (mask >> ATTACK_SHIFT) & 0b111;
  return attackCode <= 4;
}

export function encodePitReplayInput(input: PitInput = {}): number {
  assertInput(input);
  let mask = 0;
  for (const key of BOOLEAN_INPUT_KEYS) {
    if (input[key]) mask |= INPUT_FLAGS[key];
  }
  if (input.attack !== undefined) mask |= ATTACK_CODE[input.attack] << ATTACK_SHIFT;
  return mask;
}

export function decodePitReplayInput(mask: number): PitInput {
  if (!validPackedInput(mask)) throw replayError();
  const input: PitInput = {};
  for (const key of BOOLEAN_INPUT_KEYS) {
    if ((mask & INPUT_FLAGS[key]) !== 0) input[key] = true;
  }
  const attackCode = (mask >> ATTACK_SHIFT) & 0b111;
  if (attackCode !== 0) input.attack = ATTACK_BY_CODE[attackCode];
  return input;
}

export function encodePitReplayInputs(inputs: readonly [PitInput, PitInput]): number {
  if (!Array.isArray(inputs) || inputs.length !== 2) throw replayError();
  const playerOne = encodePitReplayInput(inputs[0]);
  const playerTwo = encodePitReplayInput(inputs[1]);
  return playerOne | (playerTwo << PIT_REPLAY_INPUT_BITS);
}

export function decodePitReplayInputs(inputPair: number): readonly [PitInput, PitInput] {
  if (!isIntegerBetween(inputPair, 0, PIT_REPLAY_INPUT_PAIR_MAX)) throw replayError();
  const playerOne = inputPair & PIT_REPLAY_INPUT_MASK;
  const playerTwo = inputPair >>> PIT_REPLAY_INPUT_BITS;
  if (!validPackedInput(playerOne) || !validPackedInput(playerTwo)) throw replayError();
  return [decodePitReplayInput(playerOne), decodePitReplayInput(playerTwo)];
}

function checksumCombatState(state: PitCombatState): string {
  const serialized = serializePitCombat(state);
  let hash = 0x811c9dc5;
  for (let index = 0; index < serialized.length; index += 1) {
    hash ^= serialized.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function metadataFor(state: PitCombatState, ticks: number): PitReplayMetadata {
  return {
    ticks,
    durationMs: Math.round((ticks * 1_000) / PIT_TICK_RATE),
    winnerId: state.matchWinnerId,
    finalPhase: state.phase,
    completed: state.phase === "match-over",
    finalFrame: state.frame,
    checksum: checksumCombatState(state),
  };
}

function equalMetadata(left: PitReplayMetadata, right: PitReplayMetadata): boolean {
  return left.ticks === right.ticks &&
    left.durationMs === right.durationMs &&
    left.winnerId === right.winnerId &&
    left.finalPhase === right.finalPhase &&
    left.completed === right.completed &&
    left.finalFrame === right.finalFrame &&
    left.checksum === right.checksum;
}

function normalizeRecordingOptions(options: PitReplayRecordingOptions): NormalizedRecordingOptions {
  if (!isRecord(options) || !hasOnlyKeys(options, ["fighters", "rules", "seed"])) throw replayError();
  const fighters = options.fighters ?? ["jungle-hunter", "berserker"];
  if (!Array.isArray(fighters) || fighters.length !== 2 || !isFighterId(fighters[0]) ||
    !isFighterId(fighters[1]) || fighters[0] === fighters[1]) {
    throw replayError();
  }
  const rules = options.rules ?? { mode: "match" };
  if (!isRecord(rules) || !hasOnlyKeys(rules, ["mode"]) || !isCombatMode(rules.mode)) throw replayError();
  const seed = options.seed ?? 0;
  if (!isIntegerBetween(seed, 0, PIT_REPLAY_MAX_SEED)) throw replayError();
  return {
    fighters: [fighters[0], fighters[1]],
    rules: { mode: rules.mode },
    seed,
  };
}

function structuralReplay(value: unknown): PitReplay | null {
  if (!isRecord(value) || !hasOnlyKeys(value, REPLAY_KEYS) ||
    value.version !== PIT_REPLAY_VERSION ||
    value.engineVersion !== PIT_STATE_VERSION ||
    value.tickRate !== PIT_TICK_RATE ||
    value.arenaId !== "the-pit" ||
    value.encoding !== PIT_REPLAY_ENCODING ||
    !isIntegerBetween(value.seed, 0, PIT_REPLAY_MAX_SEED)) {
    return null;
  }

  if (!isRecord(value.rules) || !hasOnlyKeys(value.rules, ["mode"]) || !isCombatMode(value.rules.mode)) return null;
  if (!Array.isArray(value.fighters) || value.fighters.length !== 2 ||
    !isFighterId(value.fighters[0]) || !isFighterId(value.fighters[1]) ||
    value.fighters[0] === value.fighters[1]) {
    return null;
  }
  if (!Array.isArray(value.segments) || value.segments.length > PIT_REPLAY_MAX_SEGMENTS) return null;

  let ticks = 0;
  let previousInputPair: number | null = null;
  const segments: PitReplaySegment[] = [];
  for (const segment of value.segments) {
    if (!Array.isArray(segment) || segment.length !== 2 ||
      !isIntegerBetween(segment[0], 1, PIT_REPLAY_MAX_TICKS) ||
      !isIntegerBetween(segment[1], 0, PIT_REPLAY_INPUT_PAIR_MAX)) {
      return null;
    }
    const [runTicks, inputPair] = segment;
    if (previousInputPair === inputPair || ticks + runTicks > PIT_REPLAY_MAX_TICKS) return null;
    try {
      decodePitReplayInputs(inputPair);
    } catch {
      return null;
    }
    ticks += runTicks;
    previousInputPair = inputPair;
    segments.push([runTicks, inputPair]);
  }

  if (!isRecord(value.metadata) || !hasOnlyKeys(value.metadata, METADATA_KEYS) ||
    !isIntegerBetween(value.metadata.ticks, 0, PIT_REPLAY_MAX_TICKS) ||
    value.metadata.ticks !== ticks ||
    !isIntegerBetween(value.metadata.durationMs, 0, Math.ceil((PIT_REPLAY_MAX_TICKS * 1_000) / PIT_TICK_RATE)) ||
    !(value.metadata.winnerId === null || isFighterId(value.metadata.winnerId)) ||
    !isMatchPhase(value.metadata.finalPhase) ||
    typeof value.metadata.completed !== "boolean" ||
    !isIntegerBetween(value.metadata.finalFrame, 0, PIT_REPLAY_MAX_TICKS) ||
    typeof value.metadata.checksum !== "string" || !/^[0-9a-f]{8}$/.test(value.metadata.checksum)) {
    return null;
  }
  if (value.metadata.winnerId !== null && !value.fighters.includes(value.metadata.winnerId)) return null;

  const replay: PitReplay = {
    version: PIT_REPLAY_VERSION,
    engineVersion: PIT_STATE_VERSION,
    tickRate: PIT_TICK_RATE,
    arenaId: "the-pit",
    encoding: PIT_REPLAY_ENCODING,
    seed: value.seed,
    rules: { mode: value.rules.mode },
    fighters: [value.fighters[0], value.fighters[1]],
    segments,
    metadata: {
      ticks: value.metadata.ticks,
      durationMs: value.metadata.durationMs,
      winnerId: value.metadata.winnerId,
      finalPhase: value.metadata.finalPhase,
      completed: value.metadata.completed,
      finalFrame: value.metadata.finalFrame,
      checksum: value.metadata.checksum,
    },
  };
  if (serializedByteLength(JSON.stringify(replay)) > PIT_REPLAY_MAX_SERIALIZED_BYTES) return null;
  return replay;
}

function validateAndReplay(value: unknown): ValidatedReplay | null {
  const replay = structuralReplay(value);
  if (!replay) return null;
  let state = createPitCombatState(replay.fighters[0], replay.fighters[1], replay.rules);
  let processedTicks = 0;
  for (const [runTicks, inputPair] of replay.segments) {
    const inputs = decodePitReplayInputs(inputPair);
    for (let runTick = 0; runTick < runTicks; runTick += 1) {
      if (state.phase === "match-over") return null;
      state = stepPitCombat(state, inputs);
      processedTicks += 1;
    }
  }
  const actualMetadata = metadataFor(state, processedTicks);
  if (!equalMetadata(replay.metadata, actualMetadata)) return null;
  return { replay, finalState: state };
}

export function normalizePitReplay(value: unknown): PitReplay | null {
  return validateAndReplay(value)?.replay ?? null;
}

export function serializePitReplay(value: unknown): string {
  const replay = normalizePitReplay(value);
  if (!replay) throw replayError(replayRejectionCode(value));
  const serialized = JSON.stringify(replay);
  if (serializedByteLength(serialized) > PIT_REPLAY_MAX_SERIALIZED_BYTES) throw replayError();
  return serialized;
}

export function deserializePitReplay(serialized: string): PitReplay {
  if (typeof serialized !== "string" || serializedByteLength(serialized) > PIT_REPLAY_MAX_SERIALIZED_BYTES) {
    throw replayError();
  }
  let candidate: unknown;
  try {
    candidate = JSON.parse(serialized);
  } catch {
    throw replayError();
  }
  const replay = normalizePitReplay(candidate);
  if (!replay) throw replayError(replayRejectionCode(candidate));
  return replay;
}

class ReplayRecorder implements PitReplayRecorder {
  private readonly options: NormalizedRecordingOptions;
  private readonly segments: Array<[number, number]> = [];
  private state: PitCombatState;
  private sealedReplay: PitReplay | null = null;

  constructor(options: PitReplayRecordingOptions) {
    this.options = normalizeRecordingOptions(options);
    this.state = createPitCombatState(
      this.options.fighters[0],
      this.options.fighters[1],
      this.options.rules,
    );
  }

  get tickCount(): number {
    return this.state.frame;
  }

  get completed(): boolean {
    return this.state.phase === "match-over";
  }

  get finished(): boolean {
    return this.sealedReplay !== null;
  }

  append(inputs: readonly [PitInput, PitInput]): void {
    if (this.sealedReplay || this.completed || this.tickCount >= PIT_REPLAY_MAX_TICKS) throw replayError();
    const inputPair = encodePitReplayInputs(inputs);
    const last = this.segments.at(-1);
    if (last?.[1] === inputPair) {
      last[0] += 1;
    } else {
      if (this.segments.length >= PIT_REPLAY_MAX_SEGMENTS) throw replayError();
      this.segments.push([1, inputPair]);
    }
    this.state = stepPitCombat(this.state, inputs);
  }

  finish(): PitReplay {
    if (this.sealedReplay) return this.sealedReplay;
    const replay: PitReplay = {
      version: PIT_REPLAY_VERSION,
      engineVersion: PIT_STATE_VERSION,
      tickRate: PIT_TICK_RATE,
      arenaId: "the-pit",
      encoding: PIT_REPLAY_ENCODING,
      seed: this.options.seed,
      rules: { ...this.options.rules },
      fighters: [...this.options.fighters],
      segments: this.segments.map(([ticks, inputPair]) => [ticks, inputPair]),
      metadata: metadataFor(this.state, this.tickCount),
    };
    const validated = validateAndReplay(replay);
    if (!validated) throw replayError();
    this.sealedReplay = validated.replay;
    return this.sealedReplay;
  }
}

export function createPitReplayRecorder(options: PitReplayRecordingOptions = {}): PitReplayRecorder {
  return new ReplayRecorder(options);
}

export function recordPitReplay(
  frames: Iterable<readonly [PitInput, PitInput]>,
  options: PitReplayRecordingOptions = {},
): PitReplay {
  const recorder = createPitReplayRecorder(options);
  for (const inputs of frames) recorder.append(inputs);
  return recorder.finish();
}

class ReplayReader implements PitReplayReader {
  private segmentIndex = 0;
  private segmentTick = 0;
  private consumedTicks = 0;

  constructor(private readonly replay: PitReplay) {}

  get tick(): number {
    return this.consumedTicks;
  }

  get totalTicks(): number {
    return this.replay.metadata.ticks;
  }

  get remainingTicks(): number {
    return this.totalTicks - this.consumedTicks;
  }

  get done(): boolean {
    return this.consumedTicks >= this.totalTicks;
  }

  next(): PitReplayReadResult {
    if (this.done) return { done: true, value: null };
    const segment = this.replay.segments[this.segmentIndex];
    const value: PitReplayTick = {
      tick: this.consumedTicks,
      inputs: decodePitReplayInputs(segment[1]),
    };
    this.consumedTicks += 1;
    this.segmentTick += 1;
    if (this.segmentTick >= segment[0]) {
      this.segmentIndex += 1;
      this.segmentTick = 0;
    }
    return { done: false, value };
  }
}

export function createPitReplayReader(value: unknown): PitReplayReader {
  const replay = normalizePitReplay(value);
  if (!replay) throw replayError(replayRejectionCode(value));
  return new ReplayReader(replay);
}

export function playPitReplay(value: unknown): PitCombatState {
  const validated = validateAndReplay(value);
  if (!validated) throw replayError(replayRejectionCode(value));
  return validated.finalState;
}
