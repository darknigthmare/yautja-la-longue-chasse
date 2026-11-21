/** R2-M049 — the novice reads the exercise prey's tracks and chooses an approach. */
import type { SaveGame } from "../types";
import { canJudgeElderPassage, samePassagePoint, type PassagePoint } from "./elderPassageJudgmentV168";

type Side = "west" | "east";
type Choice = "hint" | "alone";
type Attempt = { choice: Choice; observed: 0 | 1 | 2 };
export type ElderMentoringV168 = {
  version: 1;
  ownerCreatedAt: string;
  revision: number;
  supports: Side[];
  attempt: Attempt | null;
  resolved: boolean;
};
export type MentoringOperation =
  | { type: "prepare"; side: Side }
  | { type: "begin"; choice: Choice }
  | { type: "watch" }
  | { type: "report" };
export type MentoringCommand = {
  expectedRevision: number;
  position: PassagePoint;
  operation: MentoringOperation;
};
export type MentoringResponse = { ok: boolean; message: string };
type MentoringSave = Pick<SaveGame, keyof Parameters<typeof canJudgeElderPassage>[0] | "elderMentoringV168">;
type Inspection = {
  status: "absent" | "valid" | "invalid-save" | "future-version";
  state: ElderMentoringV168 | null;
};

export const MENTORING_MAP = [
  "##.....##",
  "##..#..##",
  "##..#..##",
  "#.......#",
  "#.......#",
  "###...###",
] as const;
export const MENTORING_START = { column: 4, row: 5 };
export const MENTORING_MENTOR = { column: 5, row: 5 };
export const MENTORING_NOVICE = { column: 4, row: 3 };
export const MENTORING_POST = { column: 4, row: 4 };
export const MENTORING_SUPPORTS = { west: { column: 2, row: 3 }, east: { column: 6, row: 3 } };
export const MENTORING_SIDE_LABEL = { west: "ouest", east: "est" };
const EXERCISE_PREY = { column: 4, row: 0 };

export function isMentoringPath(point: PassagePoint): boolean {
  return Number.isInteger(point.column) && Number.isInteger(point.row) &&
    MENTORING_MAP[point.row]?.[point.column] === ".";
}

export function initialElderMentoring(owner: string): ElderMentoringV168 {
  return { version: 1, ownerCreatedAt: owner, revision: 0, supports: [], attempt: null, resolved: false };
}

function isSide(value: unknown): value is Side {
  return value === "west" || value === "east";
}

function isChoice(value: unknown): value is Choice {
  return value === "hint" || value === "alone";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function inspectElderMentoring(raw: unknown, owner: string): Inspection {
  if (raw === undefined || raw === null) return { status: "absent", state: null };
  const invalid: Inspection = { status: "invalid-save", state: null };
  if (!isRecord(raw)) return invalid;
  if (typeof raw.version === "number" && raw.version > 1) return { status: "future-version", state: null };
  if (raw.version !== 1 || !owner || raw.ownerCreatedAt !== owner || typeof raw.resolved !== "boolean" ||
      !Array.isArray(raw.supports) || raw.supports.length > 2 || !raw.supports.every(isSide) ||
      new Set(raw.supports).size !== raw.supports.length) return invalid;
  let attempt: Attempt | null = null;
  if (raw.attempt !== null) {
    if (!isRecord(raw.attempt) || raw.supports.length !== 2 || !isChoice(raw.attempt.choice) ||
        (raw.attempt.observed !== 0 && raw.attempt.observed !== 1 && raw.attempt.observed !== 2)) return invalid;
    attempt = { choice: raw.attempt.choice, observed: raw.attempt.observed };
  }
  if (raw.resolved && attempt?.observed !== 2) return invalid;
  const revision = raw.supports.length + (attempt ? 1 + attempt.observed : 0) + Number(raw.resolved);
  if (raw.revision !== revision) return invalid;
  return { status: "valid", state: {
    version: 1, ownerCreatedAt: owner, revision, supports: [...raw.supports], attempt, resolved: raw.resolved,
  } };
}

/** Compare the confirmed archive with the next durable milestone from another tab. */
export function isElderMentoringSuccessor(
  previous: ElderMentoringV168,
  next: ElderMentoringV168,
): boolean {
  if (previous.resolved || previous.ownerCreatedAt !== next.ownerCreatedAt ||
      next.revision !== previous.revision + 1 ||
      !previous.supports.every((side, index) => side === next.supports[index])) return false;
  if (!previous.attempt) {
    return previous.supports.length === 2
      ? next.attempt?.observed === 0
      : next.supports.length === previous.supports.length + 1 && next.attempt === null;
  }
  if (!next.attempt || previous.attempt.choice !== next.attempt.choice) return false;
  return previous.attempt.observed === 2
    ? next.resolved
    : next.attempt.observed === previous.attempt.observed + 1;
}

export function canMentorElderNovice(save: MentoringSave): boolean {
  return canJudgeElderPassage(save);
}

export function mentoringPreySide(state: ElderMentoringV168): Side {
  // The first support's noise leaves a track on the other bank when the prey turns.
  return state.supports[0] === "west" ? "east" : "west";
}

export function mentoringNoviceSide(state: ElderMentoringV168): Side {
  // Both supports are ready. The novice chooses cover on the bank with older tracks.
  return mentoringPreySide(state) === "west" ? "east" : "west";
}

export function mentoringLookout(state: ElderMentoringV168): PassagePoint {
  const { column } = MENTORING_SUPPORTS[mentoringNoviceSide(state)];
  return { column: column === 2 ? 1 : 7, row: 3 };
}

export type MentoringFrame = { novice: PassagePoint; prey: PassagePoint; cue?: string };

export function mentoringFrames(state: ElderMentoringV168, stage: 0 | 1): MentoringFrame[] {
  const side = mentoringNoviceSide(state);
  const { column } = MENTORING_SUPPORTS[side];
  const preyColumn = MENTORING_SUPPORTS[mentoringPreySide(state)].column;
  const preyTrail = { column: preyColumn, row: 1 };
  const preyBank = { column: preyColumn, row: 0 };
  const nearerColumn = side === "west" ? 3 : 5;
  const path: PassagePoint[] = stage === 0
    ? [...(state.attempt?.choice === "alone" ? [MENTORING_NOVICE, MENTORING_NOVICE] : [MENTORING_NOVICE]),
       { column: nearerColumn, row: 3 }, { column, row: 3 }]
    : [{ column, row: 2 }, { column, row: 1 }, { column, row: 0 }, { column: nearerColumn, row: 0 }];
  return path.map((novice, index) => {
    let prey = preyBank;
    if (stage === 0 && index < 2) prey = preyTrail;
    if (stage === 1 && index >= 2) {
      const distance = index - 1;
      const towardCenter = Math.sign(EXERCISE_PREY.column - preyColumn);
      prey = { column: preyColumn + towardCenter * distance, row: 0 };
    }
    if (index !== 0 || stage === 1) return { novice, prey };
    const cue = state.attempt?.choice === "hint"
      ? "Le novice vérifie le bruit signalé et choisit le couvert."
      : "Le novice compare les empreintes seul avant de choisir le couvert.";
    return { novice, prey, cue };
  });
}

export function currentMentoringFrame(state: ElderMentoringV168): MentoringFrame {
  const observed = state.attempt?.observed ?? 0;
  if (observed === 0) {
    return { novice: MENTORING_NOVICE, prey: { column: MENTORING_SUPPORTS[mentoringPreySide(state)].column, row: 1 } };
  }
  const frames = mentoringFrames(state, observed === 1 ? 0 : 1);
  return frames[frames.length - 1];
}

export function commitElderMentoring(save: MentoringSave, command: MentoringCommand) {
  const current = inspectElderMentoring(save.elderMentoringV168, save.createdAt);
  const refuse = (message: string) => ({ ok: false as const, message, state: current.state });
  if (!canMentorElderNovice(save)) return refuse("La reconnaissance Elite et le seuil Elder ouvrent cet exercice.");
  if (current.status !== "absent" && current.status !== "valid") return refuse("Le dossier enregistré est incompatible.");
  const state = current.state ?? initialElderMentoring(save.createdAt);
  const { operation, position } = command;
  if (command.expectedRevision !== state.revision) return refuse("Le dossier a changé. Reprends l’action.");
  if (!isMentoringPath(position)) return refuse("Rejoins un appui praticable.");
  if (state.resolved) return refuse("Le témoin a déjà consigné la chasse.");

  function advance(change: Partial<ElderMentoringV168>, message: string) {
    return { ok: true as const, message, state: { ...state, ...change, revision: state.revision + 1 } };
  }

  switch (operation.type) {
    case "prepare": {
      const { side } = operation;
      if (!isSide(side) || !samePassagePoint(position, MENTORING_SUPPORTS[side])) return refuse("Rejoins l’appui.");
      if (state.supports.includes(side) || state.attempt) return refuse("Cet appui est déjà prêt.");
      return advance({ supports: [...state.supports, side] }, "Appui calé et couvert préparé.");
    }
    case "begin": {
      if (!samePassagePoint(position, MENTORING_POST)) return refuse("Rejoins le poste de départ.");
      if (state.attempt || state.supports.length !== 2 || !isChoice(operation.choice)) return refuse("Prépare les deux appuis.");
      const bank = MENTORING_SIDE_LABEL[mentoringPreySide(state)];
      const message = operation.choice === "hint" ? "Tu signales un bruit à l’" + bank + "." : "Le novice va lire les traces seul.";
      return advance({ attempt: { choice: operation.choice, observed: 0 } }, message);
    }
    case "watch": {
      const attempt = state.attempt;
      if (!attempt || attempt.observed === 2) return refuse("Aucun déplacement à observer ici.");
      const post = attempt.observed === 0 ? MENTORING_POST : mentoringLookout(state);
      if (!samePassagePoint(position, post)) return refuse("Rejoins le poste d’observation.");
      const observed = attempt.observed === 0 ? 1 : 2;
      const message = observed === 1
        ? "Le novice a choisi l’appui " + MENTORING_SIDE_LABEL[mentoringNoviceSide(state)] + "."
        : "Le novice a repéré la proie depuis le couvert. Rends compte au témoin.";
      return advance({ attempt: { ...attempt, observed } }, message);
    }
    case "report": {
      if (!samePassagePoint(position, MENTORING_MENTOR) || state.attempt?.observed !== 2) {
        return refuse("Observe toute la chasse puis reviens auprès du témoin.");
      }
      return advance({ resolved: true }, "Le témoin a consigné la décision et la réussite du novice.");
    }
  }
}
