import { MISSIONS } from "../data.ts";
import type { SaveGame } from "../types";
import type { TrainingDisciplineId } from "./progression";

export const TRAINING_DRILL_ACTIONS = [
  "left",
  "right",
  "primary",
  "secondary",
] as const;

export type TrainingDrillAction =
  (typeof TRAINING_DRILL_ACTIONS)[number];

export type TrainingDrillStatus =
  | "ready"
  | "playing"
  | "complete";

export type TrainingDrillFeedback =
  | "ready"
  | "perfect"
  | "correct"
  | "wrong"
  | "missed"
  | "complete";

export interface TrainingDrillConfig {
  title: string;
  instruction: string;
  cueCount: number;
  cueDurationSeconds: number;
  actionLabels: Readonly<Record<TrainingDrillAction, string>>;
}

export interface TrainingDrillState {
  disciplineId: TrainingDisciplineId;
  seed: number;
  status: TrainingDrillStatus;
  sequence: readonly TrainingDrillAction[];
  cueIndex: number;
  cueElapsedSeconds: number;
  hits: number;
  missedCues: number;
  wrongInputs: number;
  totalReactionSeconds: number;
  feedback: TrainingDrillFeedback;
  unsafeFire?: boolean;
}

export interface TrainingDrillInputResult {
  state: TrainingDrillState;
  outcome: "ignored" | "perfect" | "correct" | "wrong";
}

type ClanHuntPhase = "track" | "blades" | "plasma";
interface ClanHuntCue {
  phase: ClanHuntPhase;
  action: TrainingDrillAction;
  label: string;
  mirroredLabel?: string;
}

const CLAN_HUNT_CUES: readonly ClanHuntCue[] = [
  { phase: "track", action: "left", label: "Les empreintes fraîches tournent à gauche.", mirroredLabel: "Les empreintes fraîches tournent à droite." },
  { phase: "track", action: "secondary", label: "La trace devant toi s’efface sous les dépôts anciens." },
  { phase: "track", action: "primary", label: "Une empreinte nette confirme la piste." },
  { phase: "track", action: "right", label: "La piste reprend à droite du rocher.", mirroredLabel: "La piste reprend à gauche du rocher." },
  { phase: "blades", action: "secondary", label: "La cible est à portée et lève sa garde pour frapper." },
  { phase: "blades", action: "left", label: "La cible balaie le côté droit. Le passage gauche est libre.", mirroredLabel: "La cible balaie le côté gauche. Le passage droit est libre." },
  { phase: "blades", action: "primary", label: "La cible perd l’équilibre et expose son flanc." },
  { phase: "blades", action: "secondary", label: "La cible revient avec une attaque frontale." },
  { phase: "plasma", action: "right", label: "La cible s’éloigne à droite du viseur.", mirroredLabel: "La cible s’éloigne à gauche du viseur." },
  { phase: "plasma", action: "secondary", label: "Une silhouette protégée traverse la ligne de tir." },
  { phase: "plasma", action: "left", label: "La cible est seule à gauche du viseur.", mirroredLabel: "La cible est seule à droite du viseur." },
  { phase: "plasma", action: "primary", label: "La cible est alignée. La ligne de tir est dégagée." },
];

const CLAN_HUNT_TRACK_ACTIONS: Readonly<Record<TrainingDrillAction, string>> = {
  left: "Suivre la piste à gauche",
  right: "Suivre la piste à droite",
  primary: "Marquer la trace",
  secondary: "Écarter la trace",
};

const CLAN_HUNT_BLADE_ACTIONS: Readonly<Record<TrainingDrillAction, string>> = {
  left: "Esquiver à gauche",
  right: "Esquiver à droite",
  primary: "Frapper aux lames",
  secondary: "Parer",
};

export const TRAINING_DRILL_CONFIGS: Readonly<
  Record<TrainingDisciplineId, TrainingDrillConfig>
> = {
  targeting: {
    title: "Acquisition biomask",
    instruction:
      "Corrige la visée puis verrouille ou écarte chaque signature avant la rupture de la fenêtre.",
    cueCount: 10,
    cueDurationSeconds: 1.35,
    actionLabels: {
      left: "Corriger à gauche",
      right: "Corriger à droite",
      primary: "Verrouiller",
      secondary: "Écarter",
    },
  },
  wristblades: {
    title: "Kata wristblades",
    instruction:
      "Enchaîne déplacements, frappe et parade sans rompre le rythme rituel.",
    cueCount: 10,
    cueDurationSeconds: 1.2,
    actionLabels: {
      left: "Pas à gauche",
      right: "Pas à droite",
      primary: "Tailler",
      secondary: "Parer",
    },
  },
  cloaking: {
    title: "Approche camouflée",
    instruction:
      "Adapte ton angle, immobilise le camouflage ou relance-le selon les balayages adverses.",
    cueCount: 9,
    cueDurationSeconds: 1.55,
    actionLabels: {
      left: "Contourner à gauche",
      right: "Contourner à droite",
      primary: "Se figer",
      secondary: "Relancer la cape",
    },
  },
  mobility: {
    title: "Parcours vertical",
    instruction:
      "Lis la trajectoire et réponds avec l’esquive ou l’impulsion adaptée.",
    cueCount: 10,
    cueDurationSeconds: 1.25,
    actionLabels: {
      left: "Appui gauche",
      right: "Appui droit",
      primary: "Bondir",
      secondary: "S’agripper",
    },
  },
  "honor-duel": {
    title: "Duel d’honneur",
    instruction:
      "Réponds aux ouvertures sans rompre les règles du duel : angle, attaque et garde.",
    cueCount: 12,
    cueDurationSeconds: 1.15,
    actionLabels: {
      left: "Décaler à gauche",
      right: "Décaler à droite",
      primary: "Frapper",
      secondary: "Garder",
    },
  },
  "clan-hunt": {
    title: "Simulation de chasse du clan",
    instruction: "Lis les traces, puis engage la cible aux lames et au plasma. Un tir devant une silhouette protégée plafonne le score à 49.",
    cueCount: CLAN_HUNT_CUES.length,
    cueDurationSeconds: 2.8,
    actionLabels: CLAN_HUNT_TRACK_ACTIONS,
  },
};

export const CLAN_PLASMA_DRILL: TrainingDrillConfig & {
  cueLabels: Readonly<Record<TrainingDrillAction, string>>;
} = {
  ...TRAINING_DRILL_CONFIGS.targeting,
  title: "Maîtrise du plasma",
  instruction: "Préparation aux rites du clan. Recentre le viseur sur la cible d’exercice, tire lorsqu’elle est alignée et retiens le tir devant une silhouette protégée.",
  actionLabels: {
    left: "Recentrer à gauche",
    right: "Recentrer à droite",
    primary: "Tirer au plasma",
    secondary: "Retenir le tir",
  },
  cueLabels: {
    left: "Cible d’exercice à gauche",
    right: "Cible d’exercice à droite",
    primary: "Cible d’exercice alignée",
    secondary: "Silhouette protégée en ligne de tir",
  },
};

const CLAN_HUNT_PHASES = {
  track: { title: "Pistage", actionLabels: CLAN_HUNT_TRACK_ACTIONS },
  blades: { title: "Corps à corps", actionLabels: CLAN_HUNT_BLADE_ACTIONS },
  plasma: { title: "Plasma", actionLabels: CLAN_PLASMA_DRILL.actionLabels },
};

function clanHuntCue(index: number, seed: number): ClanHuntCue | undefined {
  const cue = CLAN_HUNT_CUES[index];
  if (!cue?.mirroredLabel || !(seed & 1)) return cue;
  return { ...cue, label: cue.mirroredLabel, action: cue.action === "left" ? "right" : "left" };
}

export function getClanHuntCue(state: TrainingDrillState) {
  if (state.disciplineId !== "clan-hunt") return null;
  const cue = clanHuntCue(state.cueIndex, state.seed);
  return cue ? { ...CLAN_HUNT_PHASES[cue.phase], phase: cue.phase, label: cue.label } : null;
}

const CLAN_PLASMA_OPENING: readonly TrainingDrillAction[] = ["left", "primary", "right", "secondary"];
const CLAN_RITE_HUNTS = MISSIONS.slice(0, 8);

export function canPracticeClanPlasma(progress: SaveGame["missionProgress"]): boolean {
  return CLAN_RITE_HUNTS.length === 8 &&
    CLAN_RITE_HUNTS.every(({ id }) => progress[id]?.completions > 0);
}

type SeededTrainingDiscipline = Exclude<TrainingDisciplineId, "clan-hunt">;

const DISCIPLINE_SALTS: Readonly<Record<SeededTrainingDiscipline, number>> = {
  targeting: 0x31a57e21,
  wristblades: 0x7a1d5e9b,
  cloaking: 0x4c0a4ed1,
  mobility: 0x6d0b1179,
  "honor-duel": 0x0d0e1107,
};

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}

function normalizedSeed(
  disciplineId: SeededTrainingDiscipline,
  seed: number,
): number {
  const integerSeed = Number.isFinite(seed) ? Math.trunc(seed) : 0;
  return (DISCIPLINE_SALTS[disciplineId] ^ integerSeed) >>> 0;
}

function nextSeed(seed: number): number {
  return (Math.imul(seed, 1_664_525) + 1_013_904_223) >>> 0;
}

function buildSequence(
  disciplineId: SeededTrainingDiscipline,
  seed: number,
  cueCount: number,
  opening: readonly TrainingDrillAction[],
): readonly TrainingDrillAction[] {
  const sequence: TrainingDrillAction[] = [...opening];
  let generator = normalizedSeed(disciplineId, seed);

  for (let index = sequence.length; index < cueCount; index += 1) {
    generator = nextSeed(generator);
    let actionIndex =
      (generator >>> 24) % TRAINING_DRILL_ACTIONS.length;
    const previous = sequence[sequence.length - 1];
    if (TRAINING_DRILL_ACTIONS[actionIndex] === previous) {
      actionIndex =
        (actionIndex + 1 + ((generator >>> 8) % 3)) %
        TRAINING_DRILL_ACTIONS.length;
    }
    sequence.push(TRAINING_DRILL_ACTIONS[actionIndex]);
  }

  return sequence;
}

export function createTrainingDrill(
  disciplineId: TrainingDisciplineId,
  seed = 0,
  clanPlasma = false,
): TrainingDrillState {
  const config = TRAINING_DRILL_CONFIGS[disciplineId];
  const safeSeed = Number.isFinite(seed) ? Math.trunc(seed) : 0;
  return {
    disciplineId,
    seed: safeSeed,
    status: "ready",
    sequence: disciplineId === "clan-hunt"
      ? CLAN_HUNT_CUES.map((cue, index) => clanHuntCue(index, safeSeed)?.action ?? cue.action)
      : buildSequence(
          disciplineId,
          safeSeed,
          config.cueCount,
          clanPlasma && disciplineId === "targeting" ? CLAN_PLASMA_OPENING : [],
        ),
    cueIndex: 0,
    cueElapsedSeconds: 0,
    hits: 0,
    missedCues: 0,
    wrongInputs: 0,
    totalReactionSeconds: 0,
    feedback: "ready",
  };
}

export function startTrainingDrill(
  state: TrainingDrillState,
): TrainingDrillState {
  if (state.status !== "ready") return state;
  return {
    ...state,
    status: "playing",
    feedback: "ready",
  };
}

export function stepTrainingDrill(
  state: TrainingDrillState,
  deltaSeconds: number,
): TrainingDrillState {
  if (state.status !== "playing") return state;
  const safeDelta = Number.isFinite(deltaSeconds)
    ? Math.max(0, deltaSeconds)
    : 0;
  if (safeDelta === 0) return state;

  const duration =
    TRAINING_DRILL_CONFIGS[state.disciplineId].cueDurationSeconds;
  let cueElapsedSeconds = state.cueElapsedSeconds + safeDelta;
  let cueIndex = state.cueIndex;
  let missedCues = state.missedCues;
  let feedback = state.feedback;

  while (
    cueIndex < state.sequence.length &&
    cueElapsedSeconds >= duration
  ) {
    cueElapsedSeconds -= duration;
    cueIndex += 1;
    missedCues += 1;
    feedback = "missed";
  }

  if (cueIndex >= state.sequence.length) {
    return {
      ...state,
      status: "complete",
      cueIndex: state.sequence.length,
      cueElapsedSeconds: 0,
      missedCues,
      feedback: "complete",
    };
  }

  return {
    ...state,
    cueIndex,
    cueElapsedSeconds,
    missedCues,
    feedback,
  };
}

export function submitTrainingDrillAction(
  state: TrainingDrillState,
  action: TrainingDrillAction,
): TrainingDrillInputResult {
  if (state.status !== "playing") {
    return { state, outcome: "ignored" };
  }

  const expected = state.sequence[state.cueIndex];
  const config = TRAINING_DRILL_CONFIGS[state.disciplineId];
  const correct = expected === action;
  const perfect =
    correct &&
    state.cueElapsedSeconds <= config.cueDurationSeconds * 0.38;
  const unsafeFire = state.disciplineId === "clan-hunt" && action === "primary" &&
    getClanHuntCue(state)?.phase === "plasma" && expected === "secondary";
  const nextCueIndex = state.cueIndex + 1;
  const complete = nextCueIndex >= state.sequence.length;
  const outcome = correct
    ? perfect
      ? "perfect"
      : "correct"
    : "wrong";

  return {
    outcome,
    state: {
      ...state,
      ...(unsafeFire ? { unsafeFire: true } : {}),
      status: complete ? "complete" : "playing",
      cueIndex: complete ? state.sequence.length : nextCueIndex,
      cueElapsedSeconds: 0,
      hits: state.hits + (correct ? 1 : 0),
      wrongInputs: state.wrongInputs + (correct ? 0 : 1),
      totalReactionSeconds:
        state.totalReactionSeconds +
        (correct
          ? clamp(
              state.cueElapsedSeconds,
              0,
              config.cueDurationSeconds,
            )
          : 0),
      feedback: complete ? "complete" : outcome,
    },
  };
}

export function trainingDrillProgress(
  state: TrainingDrillState,
): number {
  if (state.sequence.length === 0) return 1;
  return clamp(state.cueIndex / state.sequence.length, 0, 1);
}

export function trainingDrillCueRemaining(
  state: TrainingDrillState,
): number {
  if (state.status === "ready") return 1;
  if (state.status === "complete") return 0;
  const duration =
    TRAINING_DRILL_CONFIGS[state.disciplineId].cueDurationSeconds;
  return clamp(1 - state.cueElapsedSeconds / duration, 0, 1);
}

export function trainingDrillAccuracy(
  state: TrainingDrillState,
): number {
  if (state.sequence.length === 0) return 0;
  return clamp(state.hits / state.sequence.length, 0, 1);
}

export function trainingDrillScore(state: TrainingDrillState): number {
  if (state.sequence.length === 0) return 0;
  const config = TRAINING_DRILL_CONFIGS[state.disciplineId];
  const accuracy = trainingDrillAccuracy(state);
  const averageReaction =
    state.hits > 0
      ? state.totalReactionSeconds / state.hits
      : config.cueDurationSeconds;
  const speed = clamp(
    1 - averageReaction / config.cueDurationSeconds,
    0,
    1,
  );
  return clamp(Math.round(accuracy * 75 + speed * 25), 0, state.unsafeFire ? 49 : 100);
}
