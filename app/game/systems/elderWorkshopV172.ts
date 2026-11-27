import type { SaveGame } from "../types";
import { inspectElderAssembly, elderAssemblyProofs } from "./elderAssemblyV168";
import { inspectClanShipOperations } from "./clanShipOperations";
import { clanResidenceCrewPostRooms } from "./companionResidence";
import { tribunalAccessV147 } from "./honorTribunalV147";

import { advanceElderWorkshopView, inspectElderWorkshopV172,
  type ElderWorkshopV172, type ElderWorkshopCommandV172 } from "./elderWorkshopRecordV172";

export { ELDER_WORKSHOP_ACTIONS_V172, allowedElderWorkshopActionsV172, inspectElderWorkshopV172 } from "./elderWorkshopRecordV172";
export type { ElderWorkshopV172, ElderWorkshopCommandV172, ElderWorkshopActionV172 } from "./elderWorkshopRecordV172";

export function hasElderWorkshopFoundationV172(save: SaveGame): boolean {
  const assembly = inspectElderAssembly(save.elderAssemblyV168, save.createdAt).state;
  if (!assembly?.responsibility) return false;
  const proofs = elderAssemblyProofs(save);
  const operations = inspectClanShipOperations(save.clanShipOperations, save.createdAt).state;
  return proofs.mentoring && proofs.judgment && operations?.recruitedNpcIds.includes("iron-claw") === true;
}

export function canWorkWithClanArmorerV172(save: SaveGame): boolean {
  return hasElderWorkshopFoundationV172(save) && tribunalAccessV147(save.tribunalV147).clanShip &&
    save.clanShipDocking?.ownerCreatedAt === save.createdAt && save.clanShipDocking.status === "aboard" &&
    save.clanShipDocking.roomId === "armurerie" && clanResidenceCrewPostRooms(save)["iron-claw"] === "armurerie";
}

export function isElderWorkshopSuccessorV172(before: ElderWorkshopV172 | null | undefined, next: ElderWorkshopV172): boolean {
  const history = before?.history ?? [];
  return (!before || before.ownerCreatedAt === next.ownerCreatedAt) && next.history.length === history.length + 1 &&
    history.every((action, index) => next.history[index] === action);
}

export type ElderWorkshopResponseV172 = { ok: true; message: string; state: ElderWorkshopV172 } | { ok: false; message: string };

export function commitElderWorkshopV172(save: SaveGame, command: ElderWorkshopCommandV172): ElderWorkshopResponseV172 {
  const refused = (message: string) => ({ ok: false as const, message });
  if (!canWorkWithClanArmorerV172(save)) return refused("Rejoins Griffe de Fer à son atelier après la reconnaissance Elder.");
  const current = inspectElderWorkshopV172(save.elderWorkshopV172, save.createdAt);
  if (current.status !== "absent" && current.status !== "valid") return refused("Le registre d’atelier est incompatible.");
  const history = current.state?.history ?? [];
  if (history.length !== command.expectedRevision) return refused("L’établi a changé. Vérifie son état avant de reprendre.");
  const next = advanceElderWorkshopView(current.view, command.action);
  if (!next) return refused("Ce geste n’est pas disponible à cette étape.");
  const message = next.phase === "complete" ? "Griffe de Fer reprend la conduite de son atelier."
    : next.phase === "handover" ? "Le montage tient. Remets la pièce à Griffe de Fer."
    : "L’intervention est enregistrée.";
  return { ok: true, message, state: { version: 1, ownerCreatedAt: save.createdAt, history: [...history, command.action] } };
}
