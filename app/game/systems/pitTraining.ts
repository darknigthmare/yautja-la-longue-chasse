import {
  createPitCombatState,
  PIT_FIGHTERS,
  PIT_TICK_RATE,
  type PitAttackKind,
  type PitCombatPhase,
  type PitCombatState,
  type PitInput,
} from "./pitCombat";

export const PIT_TRAINING_SETTINGS_VERSION = 1;
export const PIT_TRAINING_SEQUENCE_VERSION = 1;
export const PIT_TRAINING_SEQUENCE_ENCODING = "dummy-input-rle-v1";
export const PIT_TRAINING_SEQUENCE_MAX_TICKS = PIT_TICK_RATE * 12;
export const PIT_TRAINING_SEQUENCE_MAX_SEGMENTS = PIT_TRAINING_SEQUENCE_MAX_TICKS;
export const PIT_TRAINING_ALTERNATE_GUARD_FRAMES = PIT_TICK_RATE * 2;

const INVALID_SETTINGS_MESSAGE = "Invalid or incompatible THE PIT training settings.";
const INVALID_SEQUENCE_MESSAGE = "Invalid or incompatible THE PIT training sequence.";
const MAX_PACKED_INPUT = (1 << 11) - 1;

export const PIT_TRAINING_DUMMY_BEHAVIORS = [
  "idle",
  "guard-high",
  "guard-low",
  "guard-alternate",
  "cpu",
] as const;

export const PIT_TRAINING_SEQUENCE_PLAYBACKS = ["once", "loop"] as const;

export type PitTrainingDummyBehavior = (typeof PIT_TRAINING_DUMMY_BEHAVIORS)[number];
export type PitTrainingSequencePlayback = (typeof PIT_TRAINING_SEQUENCE_PLAYBACKS)[number];

export interface PitTrainingSettings {
  version: typeof PIT_TRAINING_SETTINGS_VERSION;
  dummyBehavior: PitTrainingDummyBehavior;
  showHitboxes: boolean;
  showFrameData: boolean;
  sequencePlayback: PitTrainingSequencePlayback;
}

export type PitTrainingSettingsPatch = Partial<Omit<PitTrainingSettings, "version">>;

export interface PitTrainingOption<T extends string> {
  value: T;
  label: string;
  description: string;
}

export const PIT_TRAINING_DUMMY_OPTIONS: readonly PitTrainingOption<PitTrainingDummyBehavior>[] = [
  {
    value: "idle",
    label: "Immobile",
    description: "Le mannequin reste neutre pour travailler les portées et les enchaînements.",
  },
  {
    value: "guard-high",
    label: "Garde haute",
    description: "Le mannequin bloque les attaques hautes et médianes sans riposter.",
  },
  {
    value: "guard-low",
    label: "Garde basse",
    description: "Le mannequin reste accroupi et protège les attaques basses.",
  },
  {
    value: "guard-alternate",
    label: "Garde alternée",
    description: "La garde change toutes les deux secondes pour entraîner la lecture visuelle.",
  },
  {
    value: "cpu",
    label: "CPU déterministe",
    description: "Le rival suit un cycle prévisible sans lire les commandes du joueur.",
  },
];

export const PIT_TRAINING_PLAYBACK_OPTIONS: readonly PitTrainingOption<PitTrainingSequencePlayback>[] = [
  {
    value: "once",
    label: "Une fois",
    description: "La séquence s’arrête après sa dernière image.",
  },
  {
    value: "loop",
    label: "En boucle",
    description: "La séquence recommence jusqu’à son arrêt manuel.",
  },
];

export const PIT_TRAINING_ACTION_LABELS = {
  resetPositions: "Réinitialiser les positions",
  startRecording: "Enregistrer le mannequin",
  stopRecording: "Arrêter l’enregistrement",
  playSequence: "Lire la séquence",
  stopPlayback: "Arrêter la lecture",
  showHitboxes: "Afficher les hitboxes",
  showFrameData: "Afficher les données d’images",
} as const;

export const PIT_TRAINING_PHASE_LABELS: Readonly<Record<PitCombatPhase, string>> = {
  idle: "Neutre",
  startup: "Démarrage",
  active: "Actif",
  recovery: "Récupération",
  hitstun: "Impact reçu",
  blockstun: "Blocage",
  knockdown: "Au sol",
};

export const PIT_TRAINING_DEFAULT_SETTINGS: Readonly<PitTrainingSettings> = Object.freeze({
  version: PIT_TRAINING_SETTINGS_VERSION,
  dummyBehavior: "guard-alternate",
  showHitboxes: false,
  showFrameData: true,
  sequencePlayback: "loop",
});

/**
 * Local training input. `resource` is already reserved for the dedicated PIT
 * resource action, while remaining structurally compatible with today's
 * combat input contract.
 */
export interface PitTrainingInput extends PitInput {
  resource?: boolean;
}

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
const TRAINING_INPUT_KEYS = [...BOOLEAN_INPUT_KEYS, "attack"] as const;
const SETTINGS_KEYS = [
  "version",
  "dummyBehavior",
  "showHitboxes",
  "showFrameData",
  "sequencePlayback",
] as const;
const SETTINGS_PATCH_KEYS = [
  "dummyBehavior",
  "showHitboxes",
  "showFrameData",
  "sequencePlayback",
] as const;
const SEQUENCE_KEYS = ["version", "tickRate", "encoding", "segments", "metadata"] as const;
const SEQUENCE_METADATA_KEYS = ["ticks", "durationMs", "checksum"] as const;

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

export type PitTrainingSequenceSegment = readonly [ticks: number, packedInput: number];

export interface PitTrainingSequenceMetadata {
  ticks: number;
  durationMs: number;
  checksum: string;
}

export interface PitTrainingSequence {
  version: typeof PIT_TRAINING_SEQUENCE_VERSION;
  tickRate: typeof PIT_TICK_RATE;
  encoding: typeof PIT_TRAINING_SEQUENCE_ENCODING;
  segments: readonly PitTrainingSequenceSegment[];
  metadata: PitTrainingSequenceMetadata;
}

export interface PitTrainingSequenceRecorder {
  readonly tickCount: number;
  readonly finished: boolean;
  append(input?: PitTrainingInput): void;
  finish(): PitTrainingSequence;
}

export interface PitTrainingSequenceTick {
  tick: number;
  cycle: number;
  input: PitTrainingInput;
}

export type PitTrainingSequenceReadResult =
  | { done: false; value: PitTrainingSequenceTick }
  | { done: true; value: null };

export interface PitTrainingSequenceReader {
  readonly tick: number;
  readonly cycle: number;
  readonly totalTicks: number;
  readonly remainingTicks: number;
  readonly done: boolean;
  next(): PitTrainingSequenceReadResult;
  reset(): void;
}

export interface PitTrainingFrameReadout {
  globalFrame: number;
  fighterSlot: 0 | 1;
  phase: PitCombatPhase;
  phaseLabel: string;
  actionKind: "attack" | "throw" | null;
  attack: PitAttackKind | null;
  actionLabel: string | null;
  actionFrame: number | null;
  actionTotalFrames: number | null;
  phaseFrame: number | null;
  phaseTotalFrames: number | null;
  framesRemaining: number | null;
  connected: boolean;
  wakeInvulnerabilityFrames: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function hasOnlyKeys(value: Record<string, unknown>, allowed: readonly string[]): boolean {
  const keys = new Set(allowed);
  return Object.keys(value).every((key) => keys.has(key));
}

function isIntegerBetween(value: unknown, minimum: number, maximum: number): value is number {
  return Number.isInteger(value) && (value as number) >= minimum && (value as number) <= maximum;
}

function isDummyBehavior(value: unknown): value is PitTrainingDummyBehavior {
  return typeof value === "string" && PIT_TRAINING_DUMMY_BEHAVIORS.includes(value as PitTrainingDummyBehavior);
}

function isSequencePlayback(value: unknown): value is PitTrainingSequencePlayback {
  return typeof value === "string" && PIT_TRAINING_SEQUENCE_PLAYBACKS.includes(value as PitTrainingSequencePlayback);
}

function settingsError(): Error {
  return new Error(INVALID_SETTINGS_MESSAGE);
}

function sequenceError(): Error {
  return new Error(INVALID_SEQUENCE_MESSAGE);
}

export function normalizePitTrainingSettings(value: unknown): PitTrainingSettings | null {
  if (!isRecord(value) || !hasOnlyKeys(value, SETTINGS_KEYS) ||
    value.version !== PIT_TRAINING_SETTINGS_VERSION ||
    !isDummyBehavior(value.dummyBehavior) ||
    typeof value.showHitboxes !== "boolean" ||
    typeof value.showFrameData !== "boolean" ||
    !isSequencePlayback(value.sequencePlayback)) {
    return null;
  }
  return {
    version: PIT_TRAINING_SETTINGS_VERSION,
    dummyBehavior: value.dummyBehavior,
    showHitboxes: value.showHitboxes,
    showFrameData: value.showFrameData,
    sequencePlayback: value.sequencePlayback,
  };
}

export function createPitTrainingSettings(
  patch: PitTrainingSettingsPatch = {},
): PitTrainingSettings {
  if (!isRecord(patch) || !hasOnlyKeys(patch, SETTINGS_PATCH_KEYS)) throw settingsError();
  const settings = normalizePitTrainingSettings({ ...PIT_TRAINING_DEFAULT_SETTINGS, ...patch });
  if (!settings) throw settingsError();
  return settings;
}

export function updatePitTrainingSettings(
  current: PitTrainingSettings,
  patch: PitTrainingSettingsPatch,
): PitTrainingSettings {
  const normalized = normalizePitTrainingSettings(current);
  if (!normalized || !isRecord(patch) || !hasOnlyKeys(patch, SETTINGS_PATCH_KEYS)) throw settingsError();
  const updated = normalizePitTrainingSettings({ ...normalized, ...patch });
  if (!updated) throw settingsError();
  return updated;
}

function emptyInput(): PitTrainingInput {
  return {};
}

function directionInput(signedDistance: number): PitTrainingInput {
  return signedDistance < 0 ? { left: true } : { right: true };
}

function awayInput(signedDistance: number): PitTrainingInput {
  return signedDistance < 0 ? { right: true } : { left: true };
}

/**
 * Deterministic CPU authored from the previous combat state only. The function
 * receives no live player input, so an integration cannot accidentally give it
 * input-reading reactions.
 */
function resolveCpuInput(state: PitCombatState, dummySlot: 0 | 1): PitTrainingInput {
  const dummy = state.fighters[dummySlot];
  const opponent = state.fighters[dummySlot === 0 ? 1 : 0];
  if (state.phase !== "round" || dummy.phase !== "idle") return emptyInput();

  const signedDistance = opponent.x - dummy.x;
  const distance = Math.abs(signedDistance);
  const cycle = state.frame % (PIT_TICK_RATE * 3);
  if (distance > 92) return directionInput(signedDistance);
  if (cycle < 24) return { guardHigh: true };
  if (cycle < 40) return { down: true, guardLow: true };
  if (distance < 48 && cycle >= 150) return awayInput(signedDistance);
  if (cycle === 60) return { attack: "light" };
  if (cycle === 100) return { attack: "technique" };
  if (cycle === 140) return { attack: "medium" };
  return emptyInput();
}

export function resolvePitTrainingDummyInput(
  settings: PitTrainingSettings,
  state: PitCombatState,
  dummySlot: 0 | 1 = 1,
): PitTrainingInput {
  const normalized = normalizePitTrainingSettings(settings);
  if (!normalized || (dummySlot !== 0 && dummySlot !== 1)) throw settingsError();
  if (state.rules.mode !== "training" || state.phase !== "round") return emptyInput();

  switch (normalized.dummyBehavior) {
    case "idle":
      return emptyInput();
    case "guard-high":
      return { guardHigh: true };
    case "guard-low":
      return { down: true, guardLow: true };
    case "guard-alternate":
      return Math.floor(state.frame / PIT_TRAINING_ALTERNATE_GUARD_FRAMES) % 2 === 0
        ? { guardHigh: true }
        : { down: true, guardLow: true };
    case "cpu":
      return resolveCpuInput(state, dummySlot);
  }
}

/** Resets the whole training situation, including health and transient actions. */
export function resetPitTrainingPositions(state: PitCombatState): PitCombatState {
  if (state.rules.mode !== "training") {
    throw new Error("THE PIT positions can only be reset during training.");
  }
  return createPitCombatState(
    state.fighters[0].definitionId,
    state.fighters[1].definitionId,
    { mode: "training" },
  );
}

export function getPitTrainingFrameReadout(
  state: PitCombatState,
  fighterSlot: 0 | 1,
): PitTrainingFrameReadout {
  if (fighterSlot !== 0 && fighterSlot !== 1) throw new Error("Invalid THE PIT fighter slot.");
  const fighter = state.fighters[fighterSlot];
  const action = fighter.action;
  let actionLabel: string | null = null;
  let actionTotalFrames: number | null = null;
  let phaseFrame: number | null = null;
  let phaseTotalFrames: number | null = null;
  let framesRemaining: number | null = null;

  if (action?.kind === "attack" && action.attack) {
    const definition = PIT_FIGHTERS[fighter.definitionId].attacks[action.attack];
    actionLabel = definition.label;
    actionTotalFrames = definition.startup + definition.active + definition.recovery;
    const phaseStart = fighter.phase === "active"
      ? definition.startup
      : fighter.phase === "recovery"
        ? definition.startup + definition.active
        : 0;
    phaseTotalFrames = fighter.phase === "startup"
      ? definition.startup
      : fighter.phase === "active"
        ? definition.active
        : fighter.phase === "recovery"
          ? definition.recovery
          : null;
    phaseFrame = phaseTotalFrames === null ? null : Math.max(1, action.frame - phaseStart + 1);
    framesRemaining = Math.max(0, actionTotalFrames - action.frame);
  } else if (action?.kind === "throw") {
    actionLabel = "Projection";
    phaseFrame = action.frame + 1;
  } else if (fighter.phase === "hitstun" || fighter.phase === "blockstun") {
    framesRemaining = fighter.stunFrames;
  } else if (fighter.phase === "knockdown") {
    framesRemaining = fighter.knockdownFrames;
  }

  return {
    globalFrame: state.frame,
    fighterSlot,
    phase: fighter.phase,
    phaseLabel: PIT_TRAINING_PHASE_LABELS[fighter.phase],
    actionKind: action?.kind ?? null,
    attack: action?.attack ?? null,
    actionLabel,
    actionFrame: action ? action.frame + 1 : null,
    actionTotalFrames,
    phaseFrame,
    phaseTotalFrames,
    framesRemaining,
    connected: action?.connected ?? false,
    wakeInvulnerabilityFrames: fighter.wakeInvulnerabilityFrames,
  };
}

function assertTrainingInput(input: unknown): asserts input is PitTrainingInput {
  if (!isRecord(input) || !hasOnlyKeys(input, TRAINING_INPUT_KEYS)) throw sequenceError();
  for (const key of BOOLEAN_INPUT_KEYS) {
    if (input[key] !== undefined && typeof input[key] !== "boolean") throw sequenceError();
  }
  if (input.attack !== undefined &&
    (typeof input.attack !== "string" || !(input.attack in ATTACK_CODE))) {
    throw sequenceError();
  }
}

export function encodePitTrainingInput(input: PitTrainingInput = {}): number {
  assertTrainingInput(input);
  let packed = 0;
  for (const key of BOOLEAN_INPUT_KEYS) {
    if (input[key]) packed |= INPUT_FLAGS[key];
  }
  if (input.attack !== undefined) packed |= ATTACK_CODE[input.attack] << ATTACK_SHIFT;
  return packed;
}

export function decodePitTrainingInput(packed: number): PitTrainingInput {
  if (!isIntegerBetween(packed, 0, MAX_PACKED_INPUT)) throw sequenceError();
  const attackCode = (packed >> ATTACK_SHIFT) & 0b111;
  if (attackCode > 4) throw sequenceError();
  const input: PitTrainingInput = {};
  for (const key of BOOLEAN_INPUT_KEYS) {
    if ((packed & INPUT_FLAGS[key]) !== 0) input[key] = true;
  }
  if (attackCode !== 0) input.attack = ATTACK_BY_CODE[attackCode];
  return input;
}

function checksumSegments(segments: readonly PitTrainingSequenceSegment[]): string {
  let hash = 0x811c9dc5;
  for (const [ticks, packed] of segments) {
    for (let tick = 0; tick < ticks; tick += 1) {
      hash ^= packed & 0xff;
      hash = Math.imul(hash, 0x01000193);
      hash ^= (packed >>> 8) & 0xff;
      hash = Math.imul(hash, 0x01000193);
    }
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function metadataFor(segments: readonly PitTrainingSequenceSegment[]): PitTrainingSequenceMetadata {
  const ticks = segments.reduce((total, segment) => total + segment[0], 0);
  return {
    ticks,
    durationMs: Math.round(ticks * 1_000 / PIT_TICK_RATE),
    checksum: checksumSegments(segments),
  };
}

export function normalizePitTrainingSequence(value: unknown): PitTrainingSequence | null {
  if (!isRecord(value) || !hasOnlyKeys(value, SEQUENCE_KEYS) ||
    value.version !== PIT_TRAINING_SEQUENCE_VERSION ||
    value.tickRate !== PIT_TICK_RATE ||
    value.encoding !== PIT_TRAINING_SEQUENCE_ENCODING ||
    !Array.isArray(value.segments) || value.segments.length > PIT_TRAINING_SEQUENCE_MAX_SEGMENTS ||
    !isRecord(value.metadata) || !hasOnlyKeys(value.metadata, SEQUENCE_METADATA_KEYS)) {
    return null;
  }

  const segments: PitTrainingSequenceSegment[] = [];
  let ticks = 0;
  let previousPacked: number | null = null;
  for (const candidate of value.segments) {
    if (!Array.isArray(candidate) || candidate.length !== 2 ||
      !isIntegerBetween(candidate[0], 1, PIT_TRAINING_SEQUENCE_MAX_TICKS) ||
      !isIntegerBetween(candidate[1], 0, MAX_PACKED_INPUT) ||
      candidate[1] === previousPacked || ticks + candidate[0] > PIT_TRAINING_SEQUENCE_MAX_TICKS) {
      return null;
    }
    try {
      decodePitTrainingInput(candidate[1]);
    } catch {
      return null;
    }
    ticks += candidate[0];
    previousPacked = candidate[1];
    segments.push([candidate[0], candidate[1]]);
  }

  const metadata = metadataFor(segments);
  if (value.metadata.ticks !== metadata.ticks ||
    value.metadata.durationMs !== metadata.durationMs ||
    value.metadata.checksum !== metadata.checksum) {
    return null;
  }
  return {
    version: PIT_TRAINING_SEQUENCE_VERSION,
    tickRate: PIT_TICK_RATE,
    encoding: PIT_TRAINING_SEQUENCE_ENCODING,
    segments,
    metadata,
  };
}

export function createPitTrainingSequenceRecorder(): PitTrainingSequenceRecorder {
  const segments: Array<[number, number]> = [];
  let tickCount = 0;
  let result: PitTrainingSequence | null = null;

  return {
    get tickCount() {
      return tickCount;
    },
    get finished() {
      return result !== null;
    },
    append(input: PitTrainingInput = {}) {
      if (result || tickCount >= PIT_TRAINING_SEQUENCE_MAX_TICKS) throw sequenceError();
      const packed = encodePitTrainingInput(input);
      const previous = segments[segments.length - 1];
      if (previous?.[1] === packed) previous[0] += 1;
      else segments.push([1, packed]);
      tickCount += 1;
    },
    finish() {
      if (result) return result;
      const readonlySegments = segments.map(([ticks, packed]) => [ticks, packed] as const);
      result = {
        version: PIT_TRAINING_SEQUENCE_VERSION,
        tickRate: PIT_TICK_RATE,
        encoding: PIT_TRAINING_SEQUENCE_ENCODING,
        segments: readonlySegments,
        metadata: metadataFor(readonlySegments),
      };
      return result;
    },
  };
}

export function recordPitTrainingSequence(
  inputs: Iterable<PitTrainingInput>,
): PitTrainingSequence {
  const recorder = createPitTrainingSequenceRecorder();
  for (const input of inputs) recorder.append(input);
  return recorder.finish();
}

export function createPitTrainingSequenceReader(
  value: PitTrainingSequence,
  playback: PitTrainingSequencePlayback = "once",
): PitTrainingSequenceReader {
  const sequence = normalizePitTrainingSequence(value);
  if (!sequence || !isSequencePlayback(playback)) throw sequenceError();
  let absoluteTick = 0;
  let sequenceTick = 0;
  let cycle = 0;
  let segmentIndex = 0;
  let segmentTick = 0;
  let ended = sequence.metadata.ticks === 0;

  const resetCursor = () => {
    sequenceTick = 0;
    segmentIndex = 0;
    segmentTick = 0;
  };

  return {
    get tick() {
      return absoluteTick;
    },
    get cycle() {
      return cycle;
    },
    get totalTicks() {
      return sequence.metadata.ticks;
    },
    get remainingTicks() {
      return ended ? 0 : sequence.metadata.ticks - sequenceTick;
    },
    get done() {
      return ended;
    },
    next(): PitTrainingSequenceReadResult {
      if (ended) return { done: true, value: null };
      const segment = sequence.segments[segmentIndex];
      const valueAtTick: PitTrainingSequenceTick = {
        tick: absoluteTick,
        cycle,
        input: decodePitTrainingInput(segment[1]),
      };
      absoluteTick += 1;
      sequenceTick += 1;
      segmentTick += 1;
      if (segmentTick >= segment[0]) {
        segmentIndex += 1;
        segmentTick = 0;
      }
      if (sequenceTick >= sequence.metadata.ticks) {
        if (playback === "loop") {
          cycle += 1;
          resetCursor();
        } else {
          ended = true;
        }
      }
      return { done: false, value: valueAtTick };
    },
    reset() {
      absoluteTick = 0;
      cycle = 0;
      ended = sequence.metadata.ticks === 0;
      resetCursor();
    },
  };
}
