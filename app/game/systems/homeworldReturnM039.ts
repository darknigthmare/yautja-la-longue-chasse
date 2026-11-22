import { MISSIONS } from "../data";
import type { MissionId, SaveGame } from "../types";
import { getChronicleRank } from "./clanChronicle";

export const HOMEWORLD_RETURN_CONTACTS_M039 = {
  officer: { roomId: "dock-control", pointId: "dock-officer-point" },
  artisan: { roomId: "deep-forge", pointId: "forge-service" },
} as const;

export const HOMEWORLD_RETURN_LINKS_M039 = [
  { id: "cohort", label: "Retrouver la cohorte", reply: "La cohorte saura où la retrouver. Elle gardera ce quai accessible à son groupe." },
  { id: "path-family", label: "Retrouver la famille de voie", reply: "La famille de voie recevra ton rapport. Elle saura auprès de qui entretenir le relais." },
  { id: "community", label: "Rester auprès de la communauté", reply: "Le rapport restera au quai, à la disposition des habitants et de ceux qui assurent la relève." },
] as const;

export type HomeworldReturnLinkM039 = (typeof HOMEWORLD_RETURN_LINKS_M039)[number]["id"];

type ReturnPhaseM039 = "assigned" | "part-ready" | "mounted" | "commissioned";

export type HomeworldReturnM039 = {
  version: 1;
  ownerCreatedAt: string;
  huntIds: MissionId[];
} & (
  | { phase: ReturnPhaseM039; link?: never }
  | { phase: "reported"; link: HomeworldReturnLinkM039 }
);

export type HomeworldReturnActionM039 =
  | { kind: "accept" | "receive-part" | "mount" | "test" }
  | { kind: "report"; link: HomeworldReturnLinkM039 };

export type HomeworldReturnSaveM039 = Pick<SaveGame, "createdAt" | "profile" | "prologue" | "missionProgress">;

const missionIds = new Set(MISSIONS.map(mission => mission.id));
const readLink = (id: unknown) => HOMEWORLD_RETURN_LINKS_M039.find(link => link.id === id);

export function normalizeHomeworldReturnM039(raw: unknown): HomeworldReturnM039 | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Record<string, unknown>;
  const { ownerCreatedAt, huntIds, phase, link } = value;
  if (value.version !== 1 || typeof ownerCreatedAt !== "string" || !Number.isFinite(Date.parse(ownerCreatedAt)) ||
      !Array.isArray(huntIds) || huntIds.length === 0 || huntIds.length > missionIds.size ||
      new Set(huntIds).size !== huntIds.length || !huntIds.every(id => missionIds.has(id))) return null;
  const state = { version: 1 as const, ownerCreatedAt, huntIds: huntIds.slice() as MissionId[] };
  if (phase === "reported") {
    const choice = readLink(link);
    return choice ? { ...state, phase, link: choice.id } : null;
  }
  if (link !== undefined) return null;
  switch (phase) {
    case "assigned":
    case "part-ready":
    case "mounted":
    case "commissioned":
      return { ...state, phase };
    default:
      return null;
  }
}

export function homeworldReturnHuntsM039(save: HomeworldReturnSaveM039) {
  const rank = save.prologue ? getChronicleRank(save.prologue.chronicle) : save.profile.rankId;
  if (rank !== "blooded" && rank !== "elite" && rank !== "elder" && rank !== "ancient") return [];
  return MISSIONS.filter(mission => save.missionProgress[mission.id]?.status === "completed");
}

interface ReturnContactM039 {
  roomId: string | null;
  pointId: string | null;
  suspended: boolean;
}

export function homeworldReturnContactM039(roomId: string | null, pointId: string | null) {
  const { officer, artisan } = HOMEWORLD_RETURN_CONTACTS_M039;
  if (roomId === officer.roomId && pointId === officer.pointId) return "officer";
  if (roomId === artisan.roomId && pointId === artisan.pointId) return "artisan";
  return null;
}

export function actHomeworldReturnM039(
  state: HomeworldReturnM039 | undefined,
  save: HomeworldReturnSaveM039,
  action: HomeworldReturnActionM039,
  context: ReturnContactM039,
): { state?: HomeworldReturnM039; message: string } {
  const contact = homeworldReturnContactM039(context.roomId, context.pointId);
  if (context.suspended || contact !== (action.kind === "receive-part" ? "artisan" : "officer")) {
    return { message: "Approche du poste concerné pour poursuivre la remise en service." };
  }
  const hunts = homeworldReturnHuntsM039(save).map(mission => mission.id);
  if (!hunts.length) return { message: "Il faut revenir d’une chasse enregistrée après la reconnaissance Blooded." };
  if (state && (state.ownerCreatedAt !== save.createdAt || !state.huntIds.every(id => hunts.includes(id)))) {
    return { message: "Le rapport de chasse du poste n’appartient pas à cette campagne." };
  }
  if (action.kind === "accept" && !state) {
    return {
      state: { version: 1, ownerCreatedAt: save.createdAt, huntIds: hunts, phase: "assigned" },
      message: "Le disjoncteur du relais a lâché. Rejoins la maîtresse des parures dans l’Atelier des parures.",
    };
  }
  if (state?.phase === "assigned" && action.kind === "receive-part") {
    return {
      state: { ...state, phase: "part-ready" },
      message: "La pièce a été ajustée à la platine du relais. Ramène-la au Contrôle d’amarrage.",
    };
  }
  if (state?.phase === "part-ready" && action.kind === "mount") {
    return { state: { ...state, phase: "mounted" }, message: "La pièce est montée. Vérifie l’alimentation avant de rendre le passage." };
  }
  if (state?.phase === "mounted" && action.kind === "test") {
    return { state: { ...state, phase: "commissioned" }, message: "Le test sous charge est stable. Le relais du quai fonctionne." };
  }
  if (state?.phase === "commissioned" && action.kind === "report") {
    const choice = readLink(action.link);
    if (choice) return { state: { ...state, phase: "reported", link: choice.id }, message: choice.reply };
  }
  return { message: "Le registre indique une autre étape. Consulte le suivi du relais." };
}
