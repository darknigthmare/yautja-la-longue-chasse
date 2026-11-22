import type { SaveGame } from "../types";
import { inspectElderAssembly, elderAssemblyProofs } from "./elderAssemblyV168";
import { inspectClanShipOperations } from "./clanShipOperations";
import { clanResidenceCrewPostRooms } from "./companionResidence";
import { tribunalAccessV147 } from "./honorTribunalV147";

export const ELDER_WORKSHOP_ACTIONS_V172 = ["observe", "inspect", "repair", "support", "align", "fit", "handover"] as const;
export type ElderWorkshopActionV172 = (typeof ELDER_WORKSHOP_ACTIONS_V172)[number];
type WorkshopMethod = "repair" | "support";
type WorkshopPhase = "observe" | "inspect" | "decide" | "align" | "fit" | "handover" | "complete";

export interface ElderWorkshopV172 {
  version: 1;
  ownerCreatedAt: string;
  history: ElderWorkshopActionV172[];
}

export interface ElderWorkshopCommandV172 {
  action: ElderWorkshopActionV172;
  expectedRevision: number;
}

interface WorkshopView {
  phase: WorkshopPhase;
  method: WorkshopMethod | null;
  alignment: number;
  target: number;
}

const INITIAL: WorkshopView = { phase: "observe", method: null, alignment: 0, target: 0 };
const ACTIONS = {
  observe: ["observe"], inspect: ["inspect"], decide: ["repair", "support"],
  align: ["align"], fit: ["fit"], handover: ["handover"], complete: [],
} satisfies Record<WorkshopPhase, ElderWorkshopActionV172[]>;

export const allowedElderWorkshopActionsV172 = (view: WorkshopView): readonly ElderWorkshopActionV172[] => ACTIONS[view.phase];

function step(view: WorkshopView, action: ElderWorkshopActionV172): WorkshopView | null {
  if (!allowedElderWorkshopActionsV172(view).includes(action)) return null;
  switch (action) {
    case "observe": return { ...view, phase: "inspect" };
    case "inspect": return { ...view, phase: "decide" };
    case "repair":
    case "support": return { ...view, phase: "align", method: action, target: action === "repair" ? 3 : 2 };
    case "align": {
      const alignment = view.alignment + 1;
      return { ...view, alignment, phase: alignment === view.target ? "fit" : "align" };
    }
    case "fit": return { ...view, phase: "handover" };
    case "handover": return { ...view, phase: "complete" };
  }
}

type Inspection = { status: "absent" | "invalid-save" | "future-version" | "valid"; state: ElderWorkshopV172 | null; view: WorkshopView };

export function inspectElderWorkshopV172(raw: unknown, owner: string): Inspection {
  const empty = (status: Inspection["status"]): Inspection => ({ status, state: null, view: INITIAL });
  if (raw == null) return empty("absent");
  if (typeof raw !== "object" || Array.isArray(raw)) return empty("invalid-save");
  const value = raw as Record<string, unknown>;
  if (value.ownerCreatedAt !== owner || !owner) return empty("invalid-save");
  if (typeof value.version === "number" && Number.isInteger(value.version) && value.version > 1) return empty("future-version");
  if (value.version !== 1 || Object.keys(value).length !== 3 || !Array.isArray(value.history) ||
      value.history.length < 1 || value.history.length > 8) return empty("invalid-save");
  let view = INITIAL;
  const history: ElderWorkshopActionV172[] = [];
  for (const command of value.history) {
    if (!(ELDER_WORKSHOP_ACTIONS_V172 as readonly unknown[]).includes(command)) return empty("invalid-save");
    const action = command as ElderWorkshopActionV172;
    const next = step(view, action);
    if (!next) return empty("invalid-save");
    view = next;
    history.push(action);
  }
  return { status: "valid", state: { version: 1, ownerCreatedAt: owner, history }, view };
}

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
  const next = step(current.view, command.action);
  if (!next) return refused("Ce geste n’est pas disponible à cette étape.");
  const message = next.phase === "complete" ? "Griffe de Fer reprend la conduite de son atelier."
    : next.phase === "handover" ? "Le montage tient. Remets la pièce à Griffe de Fer."
    : "L’intervention est enregistrée.";
  return { ok: true, message, state: { version: 1, ownerCreatedAt: save.createdAt, history: [...history, command.action] } };
}
