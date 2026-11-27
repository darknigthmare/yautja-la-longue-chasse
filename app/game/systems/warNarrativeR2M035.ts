import { MISSIONS } from "../data";
import type { SaveGame } from "../types";
import { getChronicleRank } from "./clanChronicle";
import { clanHullProjectMatchesOwnedHull, inspectClanHullProject } from "./clanHullProjectV171";
import { inspectClanShipDocking } from "./clanShipDocking";

export const WAR_NARRATIVE_SITE_R2_M035 = "CON-T09" as const;
export const WAR_NARRATIVE_WIDTH_R2_M035 = 13;
export const WAR_NARRATIVE_ACTIONS_R2_M035 = [
  "diplomacy", "faction", "rescue", "left", "right", "lane", "wait", "inspect", "stabilize", "signal", "cover",
  "pursue", "protect", "track", "extract", "return", "record", "retry",
] as const;
export type WarNarrativeActionR2M035 = typeof WAR_NARRATIVE_ACTIONS_R2_M035[number];
export type WarNarrativeCommandR2M035 = { action: WarNarrativeActionR2M035; expectedRevision: number };
export interface WarNarrativeR2M035 {
  version: 1;
  owner: string;
  orders: WarNarrativeActionR2M035[];
}

type Duty = "faction" | "rescue";
type Decision = "pursue" | "protect";
type Phase = "diplomacy" | "briefing" | "field" | "withdrawn" | "return" | "complete";
type Lane = 0 | 1;
type Point = { x: number; lane: Lane };
export interface WarNarrativeViewR2M035 {
  phase: Phase;
  duty: Duty | null;
  decision: Decision | null;
  player: Point;
  scout: Point;
  passageRead: boolean;
  following: boolean;
  cover: number;
  scoutHealth: number;
  trailRead: boolean;
  returnStarted: boolean;
}

const initial = (): WarNarrativeViewR2M035 => ({
  phase: "diplomacy", duty: null, decision: null, player: { x: 0, lane: 0 }, scout: { x: 4, lane: 0 },
  passageRead: false, following: false, cover: 0, scoutHealth: 2, trailRead: false, returnStarted: false,
});
const crossing = (x: number) => x === 2 || x === 4 || x === 8 || x === 10 || x === 12;
const distance = (a: Point, b: Point) => Math.abs(a.x - b.x) + Math.abs(a.lane - b.lane);
const accept = (view: WarNarrativeViewR2M035) => ({ ok: true as const, view });
const refuse = (message: string) => ({ ok: false as const, message });

export function warNarrativeThreatR2M035(x: number, view: WarNarrativeViewR2M035): boolean {
  return view.phase === "field" && (x === 5 || x === 6 || (view.decision === "pursue" && (x === 9 || x === 10)));
}

function resolveMove(view: WarNarrativeViewR2M035, action: "left" | "right" | "lane" | "wait") {
  const { player, scout, following, decision, trailRead } = view;
  if (action === "lane" && !crossing(player.x)) return refuse("Le talus se franchit aux rampes.");
  if (action === "wait" && (view.phase !== "field" || !following || distance(player, scout) === 0 || (decision === "pursue" && !trailRead))) {
    return refuse("L’éclaireur est déjà au poste ou attend le signal.");
  }
  const next: Point = action === "wait" ? player : action === "lane"
    ? { ...player, lane: player.lane === 0 ? 1 : 0 }
    : { ...player, x: player.x + (action === "right" ? 1 : -1) };
  if (next.x < 0 || next.x >= WAR_NARRATIVE_WIDTH_R2_M035) return refuse("Tu touches la limite du passage.");
  if (view.phase === "return") return view.returnStarted ? accept({ ...view, player: next })
    : refuse("Repars de l’entrée pour relever le passage transformé.");
  if (next.x > 2 && !view.passageRead) return refuse("Relève d’abord l’accès depuis la première balise.");
  if (next.x > 4 && !following) return refuse("Préviens l’éclaireur et couvre sa traversée.");
  if (next.x > 8 && !decision) return refuse("Choisis ici la poursuite ou la couverture du sas.");
  if (next.x > 10 && decision === "pursue" && !trailRead) return refuse("Il faut vérifier la piste depuis la corniche.");
  if (!following) return accept({ ...view, player: next });

  const pausedForTrail = decision === "pursue" && !trailRead;
  if (Math.abs(next.x - scout.x) > 2 && !pausedForTrail) return refuse("Attends l’éclaireur. Rapproche-toi pour couvrir son déplacement.");
  let follower = scout;
  let health = view.scoutHealth;
  if (!pausedForTrail) {
    const candidate: Point = { x: scout.x + Math.sign(next.x - scout.x), lane: scout.lane };
    if (crossing(scout.x) && scout.lane !== next.lane) candidate.lane = next.lane;
    if (candidate.x !== scout.x && warNarrativeThreatR2M035(candidate.x, view) && view.cover < 1) health--;
    else follower = candidate;
  }
  return accept({ ...view, player: next, scout: follower, scoutHealth: health,
    cover: Math.max(0, view.cover - 1), phase: health > 0 ? "field" : "withdrawn" });
}

function reduce(view: WarNarrativeViewR2M035, action: WarNarrativeActionR2M035) {
  const { phase, player, scout, duty, decision } = view;
  if (phase === "complete") return refuse("Le retour est déjà consigné.");
  if (phase === "diplomacy") {
    return action === "diplomacy" ? accept({ ...view, phase: "briefing" })
      : refuse("Écoute d’abord le dernier signal des Gardes du Temple.");
  }
  if (phase === "briefing") {
    return action === "faction" || action === "rescue"
      ? accept({ ...view, phase: "field", duty: action, scoutHealth: action === "rescue" ? 1 : 2 }) : refuse("Choisis ton engagement au seuil du canyon.");
  }
  if (phase === "withdrawn") {
    return action === "retry" ? accept({ ...initial(), duty, phase: "field", scoutHealth: duty === "rescue" ? 1 : 2 })
      : refuse("L’éclaireur a décroché. Reprends depuis l’entrée du passage.");
  }
  if (action === "left" || action === "right" || action === "lane" || action === "wait") return resolveMove(view, action);
  if (phase === "return") {
    if (action === "return" && !view.returnStarted) return accept({ ...view, player: { x: 0, lane: 0 }, returnStarted: true });
    if (action === "record" && view.returnStarted && player.x === 6 && player.lane === 0) return accept({ ...view, phase: "complete" });
    return refuse("Reprends le passage depuis l’entrée et approche de la balise déplacée.");
  }
  if (action === "inspect" && player.x === 2 && !view.passageRead) return accept({ ...view, passageRead: true });
  if (action === "stabilize" && duty === "rescue" && view.passageRead && !view.following &&
      distance(player, scout) === 0 && view.scoutHealth === 1) return accept({ ...view, scoutHealth: 2 });
  if (action === "signal" && view.passageRead && !view.following && distance(player, scout) === 0 &&
      (duty !== "rescue" || view.scoutHealth === 2)) {
    return accept({ ...view, following: true });
  }
  if (action === "cover" && view.following && distance(player, scout) <= 2 && view.cover < 3) {
    return accept({ ...view, cover: 3 });
  }
  if ((action === "pursue" || action === "protect") && !decision && player.x === 8 && scout.x === 8 && (action === "pursue" || view.cover > 0)) {
    return accept({ ...view, decision: action });
  }
  if (action === "track" && decision === "pursue" && !view.trailRead && player.x === 9 && player.lane === 1) {
    return accept({ ...view, trailRead: true });
  }
  if (action === "extract" && player.x === 12 && scout.x === 12 && player.lane === scout.lane &&
      decision && (decision === "protect" || view.trailRead)) {
    return accept({ ...view, phase: "return", cover: 0, following: false });
  }
  return refuse("Le geste exige le poste ou l’éclaireur à portée.");
}

function validAction(action: unknown): action is WarNarrativeActionR2M035 {
  return typeof action === "string" && (WAR_NARRATIVE_ACTIONS_R2_M035 as readonly string[]).includes(action);
}

export function inspectWarNarrativeR2M035(raw: unknown, owner: string) {
  const missing = (status: "absent" | "invalid-save" | "future-version") => ({ status, state: null, view: initial() });
  if (raw == null) return missing("absent");
  if (typeof raw !== "object" || Array.isArray(raw)) return missing("invalid-save");
  const value = raw as Record<string, unknown>;
  if (typeof value.version === "number" && value.version > 1) return missing("future-version");
  if (Object.keys(value).length !== 3 || value.version !== 1 || value.owner !== owner ||
      !Number.isFinite(Date.parse(owner)) || !Array.isArray(value.orders) || !value.orders.length ||
      value.orders.length > 120) return missing("invalid-save");
  const orders: WarNarrativeActionR2M035[] = [];
  let view = initial();
  for (const action of value.orders) {
    if (!validAction(action)) return missing("invalid-save");
    const result = reduce(view, action);
    if (!result.ok) return missing("invalid-save");
    orders.push(action);
    view = result.view;
  }
  const state: WarNarrativeR2M035 = { version: 1, owner, orders };
  return { status: "valid" as const, state, view };
}

export function hasWarNarrativeCampaignR2M035(save: SaveGame): boolean {
  const project = inspectClanHullProject(save.clanHullProjectV171, save.createdAt).state;
  return save.clanShipOperations?.mandateAccepted === true && project?.pledge === "shared-watch" &&
    clanHullProjectMatchesOwnedHull(project, save.shipAcquisitionV89, save.createdAt) &&
    MISSIONS.every(mission => save.missionProgress[mission.id]?.status === "completed");
}

export function canStartWarNarrativeR2M035(save: SaveGame): boolean {
  const rank = save.prologue ? getChronicleRank(save.prologue.chronicle) : save.profile.rankId;
  const docking = inspectClanShipDocking(save.clanShipDocking, save.createdAt).state;
  return (rank === "elite" || rank === "elder" || rank === "ancient") &&
    docking?.status === "aboard" && docking.roomId === "conseil" &&
    !save.clanShipOperations?.activeContract && hasWarNarrativeCampaignR2M035(save);
}

export function advanceWarNarrativeR2M035(save: SaveGame, command: WarNarrativeCommandR2M035) {
  if (!canStartWarNarrativeR2M035(save)) return refuse("Rejoins le conseil après les huit chasses, la reconnaissance Elite et l’engagement de la Veille Partagée.");
  const checked = inspectWarNarrativeR2M035(save.warNarrativeR2M035, save.createdAt);
  if (checked.status !== "valid" && checked.status !== "absent") return refuse("Le journal du passage est incompatible.");
  const orders = checked.state?.orders ?? [];
  if (!validAction(command.action) || command.expectedRevision !== orders.length || orders.length >= 120) {
    return refuse("Le passage a changé. Reviens au dernier geste enregistré.");
  }
  const result = reduce(checked.view, command.action);
  if (!result.ok) return result;
  const state: WarNarrativeR2M035 = { version: 1, owner: save.createdAt, orders: [...orders, command.action] };
  return { ok: true as const, state, message: result.view.phase === "complete"
    ? "Le nouveau passage et le retour de l’éclaireur sont consignés." : "Geste consigné." };
}

export function isWarNarrativeSuccessorR2M035(before: WarNarrativeR2M035 | null | undefined, next: WarNarrativeR2M035): boolean {
  const past = before?.orders ?? [];
  return (!before || before.owner === next.owner) && next.orders.length === past.length + 1 &&
    past.every((entry, index) => entry === next.orders[index]);
}
