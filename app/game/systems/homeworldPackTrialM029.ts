import type { SaveGame } from "../types";
import { CHRONICLE_RANK_IDS, getChronicleRank } from "./clanChronicle";

export const PACK_POST_M029 = { roomId: "training-hall", pointId: "training-service" } as const;
export const PACK_SIZE_M029 = 12;
export const PACK_FARTHEST_M029 = 16;
export const PACK_SHELTERS_M029 = { outward: 6, returning: 12 } as const;
const JOURNAL_LIMIT = 512;
const MAX_LEAD = 4;

type PackCommand = "east" | "west" | "regroup" | "shelter" | "turn" | "count";
export type HomeworldPackTrialM029 = { version: 1; ownerCreatedAt: string; journal: PackCommand[] };
type PackView = {
  player: number;
  pupils: number[];
  phase: "outward" | "returning" | "returned";
  shelteredOutward: boolean;
  shelteredReturning: boolean;
  ticks: number;
};
export type HomeworldPackActionM029 = PackCommand | "start" | "restart";
type TrialSave = Pick<SaveGame, "createdAt" | "homeworld" | "prologue" | "profile">;
type PackPlace = { roomId: string | null; pointId: string | null; suspended: boolean };

const commands = ["east", "west", "regroup", "shelter", "turn", "count"] as const;
function packCommand(value: unknown): value is PackCommand {
  return commands.some(command => command === value);
}
function initialPack(): PackView {
  return { player: 0, pupils: Array(PACK_SIZE_M029).fill(0), phase: "outward",
    shelteredOutward: false, shelteredReturning: false, ticks: 0 };
}

function atShelter(view: PackView) {
  return view.phase !== "returned" && view.player === PACK_SHELTERS_M029[view.phase] &&
    view.pupils.every(position => position === view.player);
}

function movePack(view: PackView, player: number, signal: boolean) {
  return view.pupils.map((position, index) => {
    if (signal || (view.ticks + index) % 3 !== 0) {
      return position + Math.sign(player - position);
    }
    return position;
  });
}

function stepPack(view: PackView, command: PackCommand): PackView | null {
  if (view.phase === "returned") return null;
  const together = view.pupils.every(position => position === view.player);
  if (command === "shelter") {
    if (!atShelter(view)) return null;
    if (view.phase === "outward" && !view.shelteredOutward) return { ...view, shelteredOutward: true };
    if (view.phase === "returning" && !view.shelteredReturning) return { ...view, shelteredReturning: true };
    return null;
  }
  if (command === "turn") {
    return view.phase === "outward" && view.player === PACK_FARTHEST_M029 && together
      ? { ...view, phase: "returning" } : null;
  }
  if (command === "count") {
    return view.phase === "returning" && view.player === 0 && together
      ? { ...view, phase: "returned" } : null;
  }
  if (command === "regroup") {
    return together ? null : { ...view, pupils: movePack(view, view.player, true), ticks: view.ticks + 1 };
  }
  const player = view.player + (command === "east" ? 1 : -1);
  if (player < 0 || player > PACK_FARTHEST_M029 ||
      (view.phase === "outward" && player > PACK_SHELTERS_M029.outward && !view.shelteredOutward) ||
      (view.phase === "returning" && player < PACK_SHELTERS_M029.returning && !view.shelteredReturning)) return null;
  const pupils = movePack(view, player, false);
  if (pupils.some(position => Math.abs(position - player) > MAX_LEAD)) return null;
  return { ...view, player, pupils, ticks: view.ticks + 1 };
}

function inspectPack(raw: unknown) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const { version, ownerCreatedAt, journal } = raw as Record<string, unknown>;
  if (version !== 1 || typeof ownerCreatedAt !== "string" || !Number.isFinite(Date.parse(ownerCreatedAt)) ||
      !Array.isArray(journal) || journal.length > JOURNAL_LIMIT) return null;
  let view = initialPack();
  const verified: PackCommand[] = [];
  for (const command of journal) {
    if (!packCommand(command)) return null;
    const next = stepPack(view, command);
    if (!next) return null;
    view = next;
    verified.push(command);
  }
  return { state: { version, ownerCreatedAt, journal: verified } as HomeworldPackTrialM029, view };
}
export function normalizeHomeworldPackTrialM029(raw: unknown) {
  return inspectPack(raw)?.state ?? null;
}
export function homeworldPackViewM029(raw: unknown, ownerCreatedAt: string) {
  const trial = inspectPack(raw);
  return trial?.state.ownerCreatedAt === ownerCreatedAt ? trial.view : null;
}

export function homeworldPackAdmissionM029(save: TrialSave) {
  const rank = getChronicleRank(save.prologue?.chronicle);
  if (!rank || CHRONICLE_RANK_IDS.indexOf(rank) < CHRONICLE_RANK_IDS.indexOf("blooded")) {
    return "La sortie demande la reconnaissance Blooded de ta chronique.";
  }
  if (save.profile.honor < 3000) return "Le Leader exige 3 000 points d’honneur pour confier un pack.";
  const coordination = save.homeworld.coordinationM028;
  if (coordination?.ownerCreatedAt !== save.createdAt || coordination.phase !== "returned") {
    return "Termine d’abord l’essai de coordination au Contrôle d’amarrage.";
  }
  return null;
}

export function homeworldPackActionsM029(view: PackView) {
  return commands.filter(command => stepPack(view, command) !== null);
}

export function actHomeworldPackTrialM029(
  raw: unknown, save: TrialSave, action: HomeworldPackActionM029, place: PackPlace,
): { state?: HomeworldPackTrialM029; message: string } {
  if (place.suspended || place.roomId !== PACK_POST_M029.roomId || place.pointId !== PACK_POST_M029.pointId) {
    return { message: "Rejoins le Maître des terrasses pour reprendre la sortie avec les élèves." };
  }
  const admission = homeworldPackAdmissionM029(save);
  if (admission) return { message: admission };
  const trial = inspectPack(raw);
  if (raw != null && (!trial || trial.state.ownerCreatedAt !== save.createdAt)) {
    return { message: "Le carnet de sortie appartient à une autre séance." };
  }
  if (trial?.view.phase === "returned") return { message: "Le retour du pack est déjà consigné." };
  if ((!trial && action === "start") || (trial && action === "restart")) {
    return { state: { version: 1, ownerCreatedAt: save.createdAt, journal: [] },
      message: "Les douze élèves attendent ton signal au départ." };
  }
  if (!trial || !packCommand(action)) return { message: "Rassemble le pack avant la sortie." };
  if (trial.state.journal.length >= JOURNAL_LIMIT) {
    return { message: "Le carnet est plein. Recommence la sortie avec les mêmes élèves." };
  }
  const next = stepPack(trial.view, action);
  if (!next) return { message: "Regroupe les élèves et attends leur mise à l’abri avant de franchir le passage." };
  const message = action === "count" ? "Les douze élèves sont rentrés et comptés."
    : action === "shelter" ? "Les douze élèves ont pris appui à couvert. Tu peux mener le franchissement."
      : action === "turn" ? "Le pack est au complet sur la crête. Ramène-le au point de départ."
        : "La position du pack est consignée.";
  return { state: { ...trial.state, journal: [...trial.state.journal, action] }, message };
}
