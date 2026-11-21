import type { SaveGame } from "../types";
import { getChronicleRank } from "./clanChronicle";
import { rankTrialsBlockedV147 } from "./honorTribunalV147";

export type MasteryPoint = { column: number; row: number };
export const MASTERY_DISCIPLINES = ["track", "mobility", "trap", "duel"] as const;
export type MasteryDiscipline = typeof MASTERY_DISCIPLINES[number];
export type MasteryProfile = { primary: MasteryDiscipline; secondary: MasteryDiscipline | null };

type Stage = 0 | 1 | 2;
export type EliteMasteryV170 = {
  version: 1;
  ownerCreatedAt: string;
  revision: number;
  stages: Record<MasteryDiscipline, Stage>;
  profile: MasteryProfile | null;
};
type MasterySave = Pick<SaveGame, "createdAt" | "prologue" | "profile" | "tribunalV147" | "eliteMasteryV170">;
type Inspection = { status: "absent" | "valid" | "invalid-save" | "future-version"; state: EliteMasteryV170 | null };
type StationId = "trace" | "quarry" | "vault" | "descend" | "set-trap" | "lure" | "dodge" | "counter";
export type MasteryCommand = {
  expectedRevision: number;
  position: MasteryPoint;
  operation: { type: "station"; station: StationId } | { type: "profile"; profile: MasteryProfile };
};
export type MasteryResponse = { ok: boolean; message: string; destination?: MasteryPoint };
type Result = { ok: true; message: string; state: EliteMasteryV170; destination?: MasteryPoint } | { ok: false; message: string };
type Station = {
  id: StationId;
  discipline: MasteryDiscipline;
  stage: 0 | 1;
  point: MasteryPoint;
  label: string;
  mark: string;
  outcome: string;
  destination?: MasteryPoint;
};

export const MASTERY_START: MasteryPoint = { column: 4, row: 5 };
export const MASTERY_LEDGE: MasteryPoint = { column: 8, row: 1 };
export const MASTERY_MAP = [
  "#########",
  "#..###.#.",
  "#.####.##",
  "#........",
  "#..#...##",
  "#........",
  "######..#",
] as const;

export const MASTERY_LABELS: Record<MasteryDiscipline, string> = {
  track: "Piste",
  mobility: "Mobilité",
  trap: "Piège",
  duel: "Confrontation",
};

export const MASTERY_STATIONS: readonly Station[] = [
  { id: "trace", discipline: "track", stage: 0, point: { column: 1, row: 3 },
    label: "Relever l’empreinte fraîche", mark: "Empreinte", outcome: "L’empreinte pointe vers l’observatoire au nord." },
  { id: "quarry", discipline: "track", stage: 1, point: { column: 1, row: 1 },
    label: "Identifier la proie depuis le couvert", mark: "Couvert", outcome: "La piste est confirmée depuis le couvert." },
  { id: "vault", discipline: "mobility", stage: 0, point: { column: 6, row: 1 }, destination: MASTERY_LEDGE,
    label: "Franchir la brèche", mark: "Appui", outcome: "L’appui opposé est atteint. Une liane descend vers le terrain." },
  { id: "descend", discipline: "mobility", stage: 1, point: MASTERY_LEDGE, destination: { column: 8, row: 3 },
    label: "Descendre par la liane", mark: "Liane", outcome: "Retour au sol par la liane." },
  { id: "set-trap", discipline: "trap", stage: 0, point: { column: 2, row: 5 },
    label: "Armer le piège d’exercice", mark: "Piège", outcome: "Le filet est tendu. Rejoins le leurre à l’ouest." },
  { id: "lure", discipline: "trap", stage: 1, point: { column: 1, row: 5 },
    label: "Actionner le leurre", mark: "Leurre", outcome: "Le leurre a amené la cible dans le filet." },
  { id: "dodge", discipline: "duel", stage: 0, point: { column: 7, row: 5 }, destination: { column: 7, row: 6 },
    label: "Esquiver la frappe du mannequin", mark: "Mannequin", outcome: "La frappe est passée. Le flanc du mannequin est ouvert." },
  { id: "counter", discipline: "duel", stage: 1, point: { column: 7, row: 6 },
    label: "Toucher le flanc ouvert", mark: "Flanc", outcome: "La riposte a touché le flanc après l’esquive." },
];

export function sameMasteryPoint(a: MasteryPoint, b: MasteryPoint): boolean {
  return a.column === b.column && a.row === b.row;
}

export function canWalkMastery(point: MasteryPoint): boolean {
  return Number.isInteger(point.column) && Number.isInteger(point.row) &&
    MASTERY_MAP[point.row]?.[point.column] === ".";
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);
const isStage = (value: unknown): value is Stage => value === 0 || value === 1 || value === 2;
const isDiscipline = (value: unknown): value is MasteryDiscipline =>
  MASTERY_DISCIPLINES.some(discipline => discipline === value);

export function initialEliteMastery(owner: string): EliteMasteryV170 {
  return { version: 1, ownerCreatedAt: owner, revision: 0, stages: { track: 0, mobility: 0, trap: 0, duel: 0 }, profile: null };
}

function readProfile(value: unknown, stages: EliteMasteryV170["stages"]): MasteryProfile | null {
  if (!isRecord(value) || Object.keys(value).length !== 2 || !isDiscipline(value.primary) || stages[value.primary] !== 2 ||
      (value.secondary !== null && (!isDiscipline(value.secondary) || value.secondary === value.primary || stages[value.secondary] !== 2))) return null;
  return { primary: value.primary, secondary: value.secondary };
}

export function inspectEliteMastery(raw: unknown, owner: string): Inspection {
  if (raw == null) return { status: "absent", state: null };
  const invalid = { status: "invalid-save", state: null } as const;
  if (!isRecord(raw) || !owner || raw.ownerCreatedAt !== owner) return invalid;
  if (typeof raw.version === "number" && Number.isInteger(raw.version) && raw.version > 1) {
    return { status: "future-version", state: null };
  }
  const { stages } = raw;
  if (raw.version !== 1 || Object.keys(raw).length !== 5 || !isRecord(stages) || Object.keys(stages).length !== 4 ||
      !isStage(stages.track) || !isStage(stages.mobility) || !isStage(stages.trap) || !isStage(stages.duel)) return invalid;
  const cleanStages = { track: stages.track, mobility: stages.mobility, trap: stages.trap, duel: stages.duel };
  const profile = readProfile(raw.profile, cleanStages);
  const revision = stages.track + stages.mobility + stages.trap + stages.duel + (profile ? 1 : 0);
  if ((raw.profile !== null && !profile) || raw.revision !== revision || revision < 1) return invalid;
  return { status: "valid", state: { version: 1, ownerCreatedAt: owner, revision, stages: cleanStages, profile } };
}

export function isEliteMasterySuccessor(previous: EliteMasteryV170, next: EliteMasteryV170): boolean {
  if (previous.ownerCreatedAt !== next.ownerCreatedAt || next.revision !== previous.revision + 1) return false;
  if (previous.profile && (previous.profile.primary !== next.profile?.primary || previous.profile.secondary !== next.profile?.secondary)) return false;
  return MASTERY_DISCIPLINES.every(discipline => next.stages[discipline] >= previous.stages[discipline]);
}

export function canEnterEliteMastery(save: MasterySave): boolean {
  const rank = save.prologue ? getChronicleRank(save.prologue.chronicle) : save.profile.rankId;
  return (rank === "blooded" || rank === "elite" || rank === "elder" || rank === "ancient") && !rankTrialsBlockedV147(save.tribunalV147);
}

export function masteryActionAt(state: EliteMasteryV170, point: MasteryPoint): Station | undefined {
  return MASTERY_STATIONS.find(station => sameMasteryPoint(point, station.point) && state.stages[station.discipline] === station.stage);
}

export function commitEliteMastery(save: MasterySave, command: MasteryCommand): Result {
  const refuse = (message: string) => ({ ok: false as const, message });
  if (!canEnterEliteMastery(save)) return refuse("Le terrain de maîtrise s’ouvre après la reconnaissance Blooded.");
  const inspected = inspectEliteMastery(save.eliteMasteryV170, save.createdAt);
  if (inspected.status !== "valid" && inspected.status !== "absent") return refuse("Le registre de maîtrise est incompatible.");
  const state = inspected.state ?? initialEliteMastery(save.createdAt);
  if (state.revision !== command.expectedRevision || !canWalkMastery(command.position)) return refuse("Reprends l’action depuis la case actuelle.");
  const { operation } = command;
  if (operation.type === "station") {
    const station = masteryActionAt(state, command.position);
    if (!station || station.id !== operation.station) return refuse("Rejoins le poste et prépare son exercice.");
    const next = { ...state, revision: state.revision + 1, stages: { ...state.stages, [station.discipline]: station.stage === 0 ? 1 : 2 } } as EliteMasteryV170;
    return { ok: true, state: next, message: station.outcome, destination: station.destination };
  }
  if (state.profile || !sameMasteryPoint(command.position, MASTERY_START)) return refuse("Le mentor attend sur le terrain central.");
  const profile = readProfile(operation.profile, state.stages);
  if (!profile) return refuse("Choisis une ou deux disciplines effectivement démontrées.");
  return { ok: true, state: { ...state, profile, revision: state.revision + 1 }, message: "Le mentor a inscrit ton profil de maîtrise." };
}
