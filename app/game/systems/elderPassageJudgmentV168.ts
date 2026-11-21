/** R2-M050, the clan passage and witnessed solution from the campaign Bible. */
import type { SaveGame } from "../types";
import { getChronicleRank } from "./clanChronicle";
import { HONOR_RANK_THRESHOLDS_V166 } from "./honorProgressionV166";
import { honorForCampaignRankV169 } from "./honorSourcesV169";

export type PassagePoint = { column: number; row: number };
type PassageSide = "west" | "east";
export type PassageTrial = { method: "schedule"; delay: number } | { method: "bridge" };
export type PassageOperation =
  | { type: "read-trace"; side: PassageSide }
  | { type: "replay" }
  | { type: "anchor"; side: PassageSide }
  | { type: "test"; trial: PassageTrial }
  | { type: "settle" };

export interface ElderPassageJudgmentV168 {
  version: 1;
  ownerCreatedAt: string;
  revision: number;
  traces: number;
  anchors: number;
  replayed: boolean;
  trial: PassageTrial | null;
  resolved: boolean;
}
export type PassageCommand = {
  expectedRevision: number;
  position: PassagePoint;
  operation: PassageOperation;
};
export type PassageResponse = { ok: boolean; message: string };
type JobSave = Pick<SaveGame, "createdAt" | "profile" | "prologue" | "honorSourcesV169" | "elderPassageJudgmentV168">;
type Inspection = { status: "absent" | "valid" | "invalid-save" | "future-version"; state: ElderPassageJudgmentV168 | null };

export const PASSAGE_START: PassagePoint = { column: 4, row: 3 };
export const PASSAGE_WITNESS: PassagePoint = { column: 4, row: 4 };
export const PASSAGE_TRACES: Record<PassageSide, PassagePoint> = {
  west: { column: 2, row: 2 },
  east: { column: 6, row: 2 },
};
export const PASSAGE_ANCHORS: Record<PassageSide, PassagePoint> = {
  west: { column: 2, row: 0 },
  east: { column: 6, row: 0 },
};
const sideBit = (side: PassageSide) => side === "west" ? 1 : 2;
const isSide = (side: unknown): side is PassageSide => side === "west" || side === "east";
export const samePassagePoint = (a: PassagePoint, b: PassagePoint) => a.column === b.column && a.row === b.row;

export function passageTile(column: number, row: number, anchors: number) {
  if (!Number.isInteger(column) || column < 0 || column > 8 || !Number.isInteger(row) || row < 0 || row > 4) return "wall";
  if (row === 2) return column >= 3 && column <= 5 ? "narrows" : "path";
  if (row === 1 && (column === 1 || column === 7)) return "path";
  if (row === 0 && (column === 1 || column === 2 || column === 6 || column === 7)) return "path";
  if (row === 0 && column >= 3 && column <= 5) return anchors === 3 ? "bridge" : "gap";
  if ((row === 3 || row === 4) && column === 4) return "path";
  return "wall";
}

const eastbound = Array.from({ length: 9 }, (_, column) => ({ column, row: 2 }));
const westbound = eastbound.slice().reverse();
const northbound = [
  { column: 8, row: 2 }, { column: 7, row: 2 }, { column: 7, row: 1 },
  ...Array.from({ length: 7 }, (_, index) => ({ column: 7 - index, row: 0 })),
  { column: 1, row: 1 }, { column: 1, row: 2 }, { column: 0, row: 2 },
];

export function canMoveInPassage(point: PassagePoint, anchors: number): boolean {
  const tile = passageTile(point.column, point.row, anchors);
  return tile !== "wall" && tile !== "gap";
}

export function simulateElderPassage(trial: PassageTrial, anchors: number) {
  const alternate = trial.method === "bridge";
  const secondRoute = alternate ? northbound : westbound;
  const delay = trial.method === "schedule" ? trial.delay : 0;
  const span = Math.max(eastbound.length, delay + secondRoute.length);
  const frames = Array.from({ length: span }, (_, tick) => {
    const west = eastbound[tick] ?? null;
    const east = secondRoute[tick - delay] ?? null;
    const crowded = west && east && passageTile(west.column, west.row, anchors) === "narrows" &&
      passageTile(east.column, east.row, anchors) === "narrows";
    return { west, east, blocked: Boolean(crowded) || (east !== null && !canMoveInPassage(east, anchors)) };
  });
  return { frames, passed: !frames.some(frame => frame.blocked) };
}

const record = (raw: unknown): raw is Record<string, unknown> =>
  raw !== null && typeof raw === "object" && !Array.isArray(raw);
const mask = (value: unknown): value is number => typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 3;

function parseTrial(raw: unknown): PassageTrial | null {
  if (!record(raw)) return null;
  if (raw.method === "bridge" && Object.keys(raw).length === 1) return { method: "bridge" };
  if (raw.method === "schedule" && Object.keys(raw).length === 2 && typeof raw.delay === "number" &&
      Number.isInteger(raw.delay) && raw.delay >= 0 && raw.delay <= 8) {
    return { method: "schedule", delay: raw.delay };
  }
  return null;
}

const newJudgment = (ownerCreatedAt: string): ElderPassageJudgmentV168 => ({
  version: 1, ownerCreatedAt, revision: 0, traces: 0, anchors: 0, replayed: false, trial: null, resolved: false,
});

export function inspectElderPassageJudgment(raw: unknown, owner: string): Inspection {
  if (raw == null) return { status: "absent", state: null };
  if (record(raw) && typeof raw.version === "number" && raw.version > 1) return { status: "future-version", state: null };
  const invalid: Inspection = { status: "invalid-save", state: null };
  if (!record(raw) || raw.version !== 1 || !owner || raw.ownerCreatedAt !== owner ||
      Object.keys(raw).length !== 8 || !Number.isSafeInteger(raw.revision) || Number(raw.revision) < 1 ||
      !mask(raw.traces) || !mask(raw.anchors) || typeof raw.replayed !== "boolean" || typeof raw.resolved !== "boolean") return invalid;
  const trial = parseTrial(raw.trial);
  if ((raw.trial !== null && !trial) || (raw.replayed && raw.traces !== 3) ||
      (!raw.replayed && (raw.anchors !== 0 || trial !== null)) ||
      (raw.resolved && (!trial || !simulateElderPassage(trial, raw.anchors).passed))) return invalid;
  return { status: "valid", state: {
    version: 1, ownerCreatedAt: owner, revision: Number(raw.revision), traces: raw.traces,
    anchors: raw.anchors, replayed: raw.replayed, trial, resolved: raw.resolved,
  } };
}

export function canJudgeElderPassage(save: JobSave): boolean {
  const rank = save.prologue ? getChronicleRank(save.prologue.chronicle) : save.profile.rankId;
  return (rank === "elite" || rank === "elder" || rank === "ancient") &&
    honorForCampaignRankV169(save.profile.honor, save.honorSourcesV169) >= HONOR_RANK_THRESHOLDS_V166.elder;
}

export function commitElderPassageJudgment(save: JobSave, command: PassageCommand) {
  const current = inspectElderPassageJudgment(save.elderPassageJudgmentV168, save.createdAt);
  const refuse = (message: string) => ({ ok: false as const, message, state: current.state });
  if (!canJudgeElderPassage(save)) return refuse("La reconnaissance Elite et le seuil de l’épreuve Elder ouvrent le dossier.");
  if (current.status !== "absent" && current.status !== "valid") return refuse("Le dossier enregistré est incompatible.");
  const state = current.state ?? newJudgment(save.createdAt);
  if (state.revision !== command.expectedRevision || state.revision === Number.MAX_SAFE_INTEGER) return refuse("Le dossier a changé. Reprends l’action.");
  if (!canMoveInPassage(command.position, state.anchors)) return refuse("Rejoins un appui praticable.");
  if (state.resolved) return refuse("Le règlement a été consigné.");
  const { operation, position } = command;
  const apply = (patch: Partial<ElderPassageJudgmentV168>, message: string) =>
    ({ ok: true as const, message, state: { ...state, ...patch, revision: state.revision + 1 } });

  switch (operation.type) {
    case "read-trace": {
      const { side } = operation;
      if (!isSide(side) || !samePassagePoint(position, PASSAGE_TRACES[side])) return refuse("Rejoins la trace de ce chasseur.");
      const bit = sideBit(side);
      if (state.traces & bit) return refuse("Cette trace figure déjà au dossier.");
      return apply({ traces: state.traces | bit }, "Trace relevée.");
    }
    case "replay":
      return state.traces === 3 && !state.replayed
        ? apply({ replayed: true }, "Les deux chasseurs atteignent le goulet au même moment.")
        : refuse("Relève les deux traces avant de rejouer le trajet initial.");
    case "anchor": {
      const { side } = operation;
      if (!isSide(side) || !state.replayed || !samePassagePoint(position, PASSAGE_ANCHORS[side])) return refuse("Rejoins un ancrage après la relecture des traces.");
      const bit = sideBit(side);
      if (state.anchors & bit) return refuse("Cet ancrage est déjà posé.");
      return apply({ anchors: state.anchors | bit, trial: null }, (state.anchors | bit) === 3 ? "La passerelle est ouverte. Essaie le second trajet." : "Ancrage posé.");
    }
    case "test": {
      const trial = parseTrial(operation.trial);
      if (!state.replayed || !trial) return refuse("Rejoue les traces avant de tester un arrangement.");
      const passed = simulateElderPassage(trial, state.anchors).passed;
      return apply({ trial }, passed ? "Les deux trajets passent. Présente ce résultat au témoin." : "Le trajet reste impraticable. Le désaccord reste ouvert.");
    }
    case "settle":
      if (!samePassagePoint(position, PASSAGE_WITNESS)) return refuse("Rejoins le témoin au point de règlement.");
      if (!state.trial || !simulateElderPassage(state.trial, state.anchors).passed) return refuse("Le témoin attend un arrangement vérifié sur le terrain.");
      return apply({ resolved: true }, "Le témoin consigne le règlement du désaccord.");
    default:
      return refuse("Cette action est inconnue.");
  }
}

export const initialElderPassageJudgment = newJudgment;
