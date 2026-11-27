import type { SaveGame } from "../types";
import { getChronicleRank } from "./clanChronicle";
import {
  canyonDecisionM037, changeCanyonLevelM037, checkCanyonSignM037, initialCanyonPositionM037, walkCanyonM037,
  type CanyonDecisionM037, type CanyonPositionM037,
} from "./clanWarCanyonPathM037";
import { firstInterstellarReceiptV173 } from "./firstInterstellarV173";
import { shipReceiptV161 } from "./shipReceiptV161";

export const CONQUEST_ORIGIN_R2_M037 = "CON-T02";
export const CONQUEST_PASS_R2_M037 = "CON-T09";

const actions = [
  "reserve-guard", "resolve-cession", "plan-convoy", "reserve-convoy", "deliver-convoy", "enter",
  "left", "right", "level", "sign", "exit-canyon", "debrief",
] as const;
const journalLimit = 240;
type Action = typeof actions[number];
export type ConquestActionR2M037 = Action | "withdraw";
export type ConquestCommandR2M037 = { action: ConquestActionR2M037; expectedRevision: number };
export interface WarConquestR2M037 {
  version: 1;
  owner: string;
  hullInstanceId: string;
  revision: number;
  orders: Action[];
}
type Phase = "brief" | "guard" | "held" | "convoy" | "reserved" | "delivered" | "field" | "report" | "complete";

export interface ConquestViewR2M037 {
  phase: Phase;
  patrol: CanyonPositionM037 | null;
}
type ConquestSave = Pick<SaveGame, "createdAt" | "profile" | "prologue" | "shipAcquisitionV89" |
  "clanShipDocking" | "spaceRoutesV159" | "firstInterstellarV173" | "warConquestR2M037">;

const accepted = (view: ConquestViewR2M037) => ({ ok: true as const, view });
const refused = (message: string) => ({ ok: false as const, message });
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const isAction = (value: unknown): value is Action => actions.some(action => value === action);

export function conquestAccessR2M037(save: ConquestSave) {
  const rank = save.prologue ? getChronicleRank(save.prologue.chronicle) : save.profile.rankId;
  if (!["blooded", "elite", "elder", "ancient"].includes(rank)) {
    return refused("Le conseil attend que le rite Blooded soit reconnu.");
  }
  const { receipt } = shipReceiptV161(save);
  if (!receipt) return refused("Reçois et rejoins ton vaisseau personnel avant de commander sur Korthas.");
  if (!firstInterstellarReceiptV173(save, save.firstInterstellarV173)) {
    return refused("Termine le premier trajet interstellaire et rends le vaisseau au pont.");
  }
  return { ok: true as const, hullInstanceId: receipt.instanceId };
}

export function conquestMatchesCampaignR2M037(save: ConquestSave, record: WarConquestR2M037) {
  // Once established, a later tribunal/rank change suspends new orders without forgetting the trip.
  return record.owner === save.createdAt &&
    shipReceiptV161(save).receipt?.instanceId === record.hullInstanceId &&
    firstInterstellarReceiptV173(save, save.firstInterstellarV173) !== null;
}

const campaignSteps = {
  brief: ["reserve-guard", "guard"],
  guard: ["resolve-cession", "held"],
  held: ["plan-convoy", "convoy"],
  convoy: ["reserve-convoy", "reserved"],
  reserved: ["deliver-convoy", "delivered"],
} as const;
export type ConquestStrategyPhaseR2M037 = keyof typeof campaignSteps | "delivered";

function apply(view: ConquestViewR2M037, action: Action) {
  const { phase, patrol } = view;
  const step = phase in campaignSteps ? campaignSteps[phase as keyof typeof campaignSteps] : null;
  if (step?.[0] === action) return accepted({ ...view, phase: step[1] });
  if (phase === "delivered" && action === "enter") {
    return accepted({ phase: "field", patrol: initialCanyonPositionM037() });
  }
  if (phase === "field" && patrol) {
    if (action === "exit-canyon") return canyonDecisionM037(patrol) ? accepted({ ...view, phase: "report" })
      : refused("Vérifie les deux balises puis regagne l’une des sorties.");
    const next = action === "left" ? walkCanyonM037(patrol, -1) : action === "right" ? walkCanyonM037(patrol, 1)
      : action === "level" ? changeCanyonLevelM037(patrol) : action === "sign" ? checkCanyonSignM037(patrol) : null;
    if (next && (next.x !== patrol.x || next.level !== patrol.level || next.checked.length !== patrol.checked.length)) {
      return accepted({ ...view, patrol: next });
    }
    return refused("La paroi ou la position du porteur empêche ce geste.");
  }
  if (phase === "report" && action === "debrief") return accepted({ ...view, phase: "complete" });
  return refused("Suis les ordres de la liaison avant de poursuivre.");
}

const start = (): ConquestViewR2M037 => ({ phase: "brief", patrol: null });

export function inspectConquestR2M037(raw: unknown, owner: string): {
  status: "absent" | "valid" | "future-version" | "invalid-save";
  state: WarConquestR2M037 | null;
  view: ConquestViewR2M037 | null;
} {
  if (raw == null) return { status: "absent", state: null, view: null };
  const invalid = { status: "invalid-save", state: null, view: null } as const;
  if (!isRecord(raw)) return invalid;
  if (typeof raw.version === "number" && raw.version > 1) return { status: "future-version", state: null, view: null };
  if (Object.keys(raw).length !== 5 || raw.version !== 1 || raw.owner !== owner || !Number.isFinite(Date.parse(owner)) ||
      typeof raw.hullInstanceId !== "string" || raw.hullInstanceId.length === 0 || raw.hullInstanceId.length > 200 ||
      typeof raw.revision !== "number" || !Number.isSafeInteger(raw.revision) || raw.revision >= Number.MAX_SAFE_INTEGER ||
      !Array.isArray(raw.orders) || raw.orders.length === 0 || raw.orders.length > journalLimit + 2 ||
      raw.revision < raw.orders.length) return invalid;
  let view = start();
  const orders: Action[] = [];
  for (const action of raw.orders) {
    if (!isAction(action) || (orders.length >= journalLimit && action !== "exit-canyon" && action !== "debrief")) return invalid;
    const result = apply(view, action);
    if (!result.ok) return invalid;
    view = result.view;
    orders.push(action);
  }
  return { status: "valid", state: { version: 1, owner, hullInstanceId: raw.hullInstanceId, revision: raw.revision, orders }, view };
}

export function conquestViewR2M037(save: ConquestSave) {
  return inspectConquestR2M037(save.warConquestR2M037, save.createdAt).view ?? start();
}

export function conquestReceiptR2M037(save: ConquestSave): {
  missionId: "R2-M037"; conquestIntroductionResolved: true; decision: CanyonDecisionM037;
} | null {
  const { state, view } = inspectConquestR2M037(save.warConquestR2M037, save.createdAt);
  if (!state || view?.phase !== "complete" || !view.patrol || !conquestMatchesCampaignR2M037(save, state)) return null;
  const decision = canyonDecisionM037(view.patrol);
  return decision ? { missionId: "R2-M037", conquestIntroductionResolved: true, decision } : null;
}

export function advanceConquestR2M037(save: ConquestSave, command: ConquestCommandR2M037) {
  const access = conquestAccessR2M037(save);
  if (!access.ok) return access;
  const { status, state: prior, view } = inspectConquestR2M037(save.warConquestR2M037, save.createdAt);
  if (status !== "absent" && status !== "valid" || (prior && prior.hullInstanceId !== access.hullInstanceId)) {
    return refused("Le journal ne correspond pas au trajet confirmé de cette campagne.");
  }
  const revision = prior?.revision ?? 0;
  if (command.expectedRevision !== revision || revision >= Number.MAX_SAFE_INTEGER - 1) {
    return refused("L’ordre appartient à un état plus ancien. Relis le rapport affiché.");
  }
  const orders = prior?.orders ?? [];
  let nextOrders: Action[];
  let message: string;
  if (command.action === "withdraw" && view?.phase === "field") {
    nextOrders = orders.slice(0, orders.indexOf("enter"));
    message = "Retour au poste. La garnison et le convoi restent en place.";
  } else {
    if (!isAction(command.action)) return refused("Ce geste n’est pas disponible ici.");
    if (orders.length >= journalLimit && command.action !== "exit-canyon" && command.action !== "debrief") {
      return refused("Reviens au poste pour reprendre le relevé. Le convoi reste livré.");
    }
    const result = apply(view ?? start(), command.action);
    if (!result.ok) return result;
    nextOrders = [...orders, command.action];
    message = result.view.phase === "complete" ? "Rapport du Passage des Lames Plates confirmé dans la campagne." : "Ordre consigné.";
  }
  const state: WarConquestR2M037 = {
    version: 1, owner: save.createdAt, hullInstanceId: access.hullInstanceId, revision: revision + 1, orders: nextOrders,
  };
  return { ok: true as const, state, message };
}

export function isConquestSuccessorR2M037(save: ConquestSave, next: WarConquestR2M037): boolean {
  const previous = save.warConquestR2M037;
  const phaseBack = previous && next.orders.length < previous.orders.length;
  const action = phaseBack ? "withdraw" : next.orders.at(-1);
  if (!action) return false;
  const result = advanceConquestR2M037(save, { action, expectedRevision: previous?.revision ?? 0 });
  return result.ok && result.state.revision === next.revision && result.state.owner === next.owner &&
    result.state.hullInstanceId === next.hullInstanceId && result.state.orders.length === next.orders.length &&
    result.state.orders.every((order, index) => order === next.orders[index]);
}
