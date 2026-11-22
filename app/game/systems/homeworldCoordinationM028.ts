import type { SaveGame } from "../types";
import { inspectBuriedCradleCampaign } from "./buriedCradleCampaign";

export const COORDINATION_OFFICER_M028 = { roomId: "dock-control", pointId: "dock-officer-point" } as const;
export const COORDINATION_WORKSHOP_M028 = {
  roomId: "convoy-workshop",
  position: { x: 225, y: 205 },
  reach: 22,
} as const;

const phases = ["briefed", "jammed", "delayed", "surveyed", "cleared", "recovering", "returned"] as const;
type CoordinationPhase = (typeof phases)[number];
type CoordinationRole = "field" | "delegate";

export interface HomeworldCoordinationM028 {
  version: 1;
  ownerCreatedAt: string;
  phase: CoordinationPhase;
  role: CoordinationRole;
  delays: number;
}

export type HomeworldCoordinationActionM028 =
  | { kind: "begin"; role: CoordinationRole }
  | { kind: "dispatch" | "clear" | "order-clear" | "signal" | "recall" | "retry" };

export function normalizeHomeworldCoordinationM028(raw: unknown): HomeworldCoordinationM028 | null {
  if (!raw || typeof raw !== "object") return null;
  const { version, ownerCreatedAt, phase, role, delays } = raw as Record<string, unknown>;
  if (version !== 1 || typeof ownerCreatedAt !== "string" || !Number.isFinite(Date.parse(ownerCreatedAt)) ||
      !phases.some(value => value === phase) || (role !== "field" && role !== "delegate") ||
      typeof delays !== "number" || !Number.isSafeInteger(delays) || delays < 0 ||
      (phase === "delayed" && delays === 0) || (phase === "surveyed" && role !== "delegate")) return null;
  return { version: 1, ownerCreatedAt, phase: phase as CoordinationPhase, role, delays };
}

type CoordinationSave = Pick<SaveGame, "createdAt" | "buriedCradle">;

export function homeworldCoordinationOpenM028(save: CoordinationSave) {
  return inspectBuriedCradleCampaign(save.buriedCradle, save.createdAt).state?.status === "reported";
}

export function homeworldCoordinationWorkshopReachedM028(roomId: string | null, actor: { x: number; y: number }) {
  const { position, reach } = COORDINATION_WORKSHOP_M028;
  return roomId === COORDINATION_WORKSHOP_M028.roomId &&
    Math.hypot(actor.x - position.x, actor.y - position.y) <= reach;
}

export function actHomeworldCoordinationM028(
  state: HomeworldCoordinationM028 | undefined,
  save: CoordinationSave,
  action: HomeworldCoordinationActionM028,
  context: { roomId: string | null; pointId: string | null; actor: { x: number; y: number }; suspended: boolean },
): { state?: HomeworldCoordinationM028; message: string } {
  const control = context.roomId === COORDINATION_OFFICER_M028.roomId && context.pointId === COORDINATION_OFFICER_M028.pointId;
  const onSite = action.kind === "clear"
    ? homeworldCoordinationWorkshopReachedM028(context.roomId, context.actor)
    : control;
  if (context.suspended || !onSite) return { message: "Rejoins le poste concerné pour transmettre cet ordre." };
  if (!homeworldCoordinationOpenM028(save) || (state && state.ownerCreatedAt !== save.createdAt)) {
    return { message: "Remets d’abord le bilan du Berceau à ton équipage." };
  }
  if (!state && action.kind === "begin" && (action.role === "field" || action.role === "delegate")) {
    return {
      state: { version: 1, ownerCreatedAt: save.createdAt, phase: "briefed", role: action.role, delays: 0 },
      message: "Équipe du passage au départ. Équipe de récupération en attente du signal.",
    };
  }
  if (!state) return { message: "L’exercice doit être préparé au Contrôle d’amarrage." };

  const advance = (phase: CoordinationPhase, message: string) => ({ state: { ...state, phase }, message });
  if (action.kind === "dispatch" && state.phase === "briefed") {
    return advance("jammed", "L’équipe du passage est en place. La commande a atteint la porte, dont le verrou est coincé.");
  }
  if (action.kind === "signal" && (state.phase === "jammed" || state.phase === "surveyed")) {
    if (state.delays === Number.MAX_SAFE_INTEGER) return { message: "Le registre des retards a atteint sa limite." };
    return {
      state: { ...state, phase: "delayed", delays: state.delays + 1 },
      message: "Le signal est parti avant l’ouverture. La récupération s’arrête au quai. Repars du dernier ordre.",
    };
  }
  if (action.kind === "retry" && state.phase === "delayed") {
    return advance("jammed", "L’équipe du passage reste devant le verrou. Confirme l’ouverture sur place avant le signal.");
  }
  if (action.kind === "clear" && state.phase === "jammed") {
    return state.role === "field"
      ? advance("cleared", "Tu as libéré le verrou. Signale l’ouverture depuis le poste de coordination.")
      : advance("surveyed", "Le verrou à libérer est repéré. Retourne à la console pour transmettre l’ordre à l’équipe.");
  }
  if (action.kind === "order-clear" && state.phase === "surveyed") {
    return advance("cleared", "L’équipe du passage a libéré le verrou repéré sur place.");
  }
  if (action.kind === "signal" && state.phase === "cleared") {
    return advance("recovering", "Signal reçu. L’équipe de récupération a franchi la porte et chargé la caisse.");
  }
  if (action.kind === "recall" && state.phase === "recovering") {
    return advance("returned", "L’équipe de récupération est revenue avec la caisse. L’équipe du passage est rentrée à son tour.");
  }
  return { message: "Le dernier rapport des équipes ne permet pas cet ordre." };
}

const dock = "Contrôle d’amarrage";
const wait = "Quai · en attente";
const workshop = "Atelier des convois";

const teams: Record<CoordinationPhase, readonly [string, string]> = {
  briefed: [dock, wait],
  jammed: [workshop + " · verrou bloqué", wait],
  delayed: [workshop + " · verrou bloqué", "Quai · retour sans la caisse"],
  surveyed: [workshop + " · verrou repéré, attend l’ordre", wait],
  cleared: [workshop + " · porte dégagée", wait],
  recovering: [workshop + " · tient le passage", "Aire de chargement · caisse prise"],
  returned: [dock, "Quai · caisse remise"],
};

export function homeworldCoordinationTeamsM028(state: HomeworldCoordinationM028) {
  return teams[state.phase];
}
