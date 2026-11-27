import type { SaveGame } from "../types";
import { normalizeHomeworldCheckpointV77, type HomeworldCheckpointV77 } from "./homeworldCheckpointV77";
import { homeworldCivicWalkableV80 } from "./homeworldCivicWorldV80";
import { homeworldRouteSegmentV109 } from "./homeworldNavigationV109";
import { HOMEWORLD_COUNCIL_STAIR_LANDINGS_V77, nearestHomeworldDoorV77, type HomeworldLevelV77 } from "./homeworldWorldV77";
import { beforeLaterProgressO6 } from "./originLittleTrailO6";
import { RIVAL_WORKSHOP_O6 } from "./originRivalRacePlaceO6";

export const TWILIGHT_COMPANIONS_O6 = ["saar", "yena", "harek", "tov"] as const;
export const TWILIGHT_AMBITIONS_O6 = ["technique", "exploration", "power", "protection"] as const;
export type TwilightCompanionO6 = typeof TWILIGHT_COMPANIONS_O6[number];
type TwilightAmbitionO6 = typeof TWILIGHT_AMBITIONS_O6[number];
type TwilightChoiceO6 = TwilightAmbitionO6 | "defer";
type TwilightActionO6 = "lift-marker" | "stow-marker" | "lift-rope" | "stow-rope" | TwilightCompanionO6 | "declare";
export type TwilightOrderO6 =
  | { action: Exclude<TwilightActionO6, "declare"> }
  | { action: "declare"; choice: TwilightChoiceO6 };
type TwilightEventO6 = TwilightOrderO6 & { at: HomeworldCheckpointV77 };
type TrailWitnessO6 = { success: boolean; choice: "map" | "behavior" };
type Point = { x: number; y: number };
type Site = { levelId: HomeworldLevelV77; point: Point };

export interface TwilightReturnRecordO6 {
  version: 1;
  ownerCreatedAt: string;
  trail: TrailWitnessO6;
  journal: TwilightEventO6[];
  resolved: boolean;
  success: boolean;
  choice: TwilightChoiceO6 | null;
  observations: TwilightCompanionO6[];
  transfers: ("marker" | "rope")[];
}

const forge = RIVAL_WORKSHOP_O6;
const terrace = HOMEWORLD_COUNCIL_STAIR_LANDINGS_V77.to;
const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
const reach = 44;
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const data = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);

function clearPost(levelId: HomeworldLevelV77, start: Point, points: readonly Point[], occupied: readonly Point[]) {
  const point = points.find(p => occupied.every(q => distance(p, q) > 2 * reach) &&
    !nearestHomeworldDoorV77(levelId, p) && homeworldCivicWalkableV80(levelId, p) &&
    homeworldRouteSegmentV109(levelId, start, p));
  if (!point) throw Error("Le retour de la cohorte exige un accès public praticable.");
  return { levelId, point };
}

const rack = clearPost(forge.levelId, forge.point,
  [[125, 0], [-125, 0], [0, 125], [0, -125], [88, 88], [-88, 88], [88, -88], [-88, -88]]
    .map(([x, y]) => ({ x: forge.point.x + x, y: forge.point.y + y })), [forge.point]);
const terraceGrid = [-174, -58, 58, 174, 0, -232, 232].flatMap(x =>
  [-156, -272, -388, -40].map(y => ({ x: terrace.point.x + x, y: terrace.point.y + y })));
const terracePosts: Partial<Record<TwilightCompanionO6, Site>> = {};
const occupied = [terrace.point];
for (const id of TWILIGHT_COMPANIONS_O6) {
  const post = clearPost(terrace.levelId, terrace.point, terraceGrid, occupied);
  terracePosts[id] = post;
  occupied.push(post.point);
}
const posts = terracePosts as Record<TwilightCompanionO6, Site>;

export function twilightSiteO6(action: TwilightActionO6): Site {
  switch (action) {
    case "lift-marker": case "lift-rope": return forge;
    case "stow-marker": case "stow-rope": return rack;
    case "declare": return posts.saar;
    default: return posts[action];
  }
}

export function atTwilightSiteO6(action: TwilightActionO6, level: HomeworldLevelV77, actor: Point, interiorId: string | null) {
  const site = twilightSiteO6(action);
  return !interiorId && site.levelId === level && distance(actor, site.point) <= reach &&
    homeworldCivicWalkableV80(level, actor) && homeworldRouteSegmentV109(level, actor, site.point);
}

function witnessO6(save: SaveGame): TrailWitnessO6 | null {
  const origin = save.originV151, trail = origin?.littleTrailO6;
  if (origin?.originId !== "O6" || origin.source !== "creation" || !trail?.resolved || !trail.choice ||
      trail.ownerCreatedAt !== save.createdAt || save.prologue?.status !== "completed" ||
      save.prologue.checkpoint.cohortV172?.steps !== 7) return null;
  return { success: trail.success, choice: trail.choice };
}

const STORAGE = ["lift-marker", "stow-marker", "lift-rope", "stow-rope"] as const;
export function twilightActionsO6(save: SaveGame): TwilightActionO6[] {
  if (!witnessO6(save) || !beforeLaterProgressO6(save)) return [];
  return nextActions(save.originV151?.twilightReturnO6?.journal ?? []);
}

function nextActions(journal: TwilightEventO6[]): TwilightActionO6[] {
  if (journal.length < STORAGE.length) return [STORAGE[journal.length]];
  if (journal.some(event => event.action === "declare")) return [];
  const missing = TWILIGHT_COMPANIONS_O6.filter(id => !journal.some(event => event.action === id));
  return missing.length ? missing : ["declare"];
}

export function twilightInteractionO6(save: SaveGame, level: HomeworldLevelV77, actor: Point, interiorId: string | null) {
  const actions = twilightActionsO6(save);
  const advance = actions.find(action => atTwilightSiteO6(action, level, actor, interiorId));
  if (advance || !actions.length) return advance;
  const heard = save.originV151?.twilightReturnO6?.observations ?? [];
  return heard.find(action => atTwilightSiteO6(action, level, actor, interiorId));
}

function readEvent(raw: unknown, owner: string): TwilightEventO6 | null {
  if (!data(raw)) return null;
  const at = normalizeHomeworldCheckpointV77(raw.at);
  if (!at || at.ownerCreatedAt !== owner) return null;
  const action = raw.action;
  if (action === "declare") {
    const choice = raw.choice;
    return (choice === "defer" || TWILIGHT_AMBITIONS_O6.some(key => key === choice)) &&
      atTwilightSiteO6(action, at.levelId, at.exterior, at.interiorId) ? { action, choice: choice as TwilightChoiceO6, at } : null;
  }
  const found = [...STORAGE, ...TWILIGHT_COMPANIONS_O6].find(item => item === action);
  return found && atTwilightSiteO6(found, at.levelId, at.exterior, at.interiorId) ? { action: found, at } : null;
}

function describe(ownerCreatedAt: string, trail: TrailWitnessO6, journal: TwilightEventO6[]): TwilightReturnRecordO6 {
  const last = journal.at(-1);
  const resolved = last?.action === "declare";
  const observations = journal.flatMap(event => TWILIGHT_COMPANIONS_O6.filter(id => id === event.action));
  const transfers: TwilightReturnRecordO6["transfers"] = [];
  if (journal.some(event => event.action === "stow-marker")) transfers.push("marker");
  if (journal.some(event => event.action === "stow-rope")) transfers.push("rope");
  return { version: 1, ownerCreatedAt, trail, journal, resolved,
    success: resolved && transfers.length === 2 && observations.length === TWILIGHT_COMPANIONS_O6.length,
    choice: last?.action === "declare" ? last.choice : null, observations, transfers };
}

export function recordTwilightReturnO6(save: SaveGame, order: TwilightOrderO6, location: HomeworldCheckpointV77) {
  const trail = witnessO6(save), current = save.originV151?.twilightReturnO6;
  if (!trail || !twilightActionsO6(save).includes(order.action) || !twilightReturnMatchesSaveO6(save)) return null;
  const event = readEvent({ ...order, at: location }, save.createdAt);
  return event ? describe(save.createdAt, trail, [...(current?.journal ?? []), event]) : null;
}

export function normalizeTwilightReturnO6(raw: unknown): TwilightReturnRecordO6 | null {
  if (!data(raw) || raw.version !== 1 || typeof raw.ownerCreatedAt !== "string" ||
      !Array.isArray(raw.journal) || !raw.journal.length || raw.journal.length > 9 || !data(raw.trail)) return null;
  const { success, choice } = raw.trail;
  if (typeof success !== "boolean" || (choice !== "map" && choice !== "behavior")) return null;
  const journal: TwilightEventO6[] = [];
  for (const row of raw.journal) {
    const event = readEvent(row, raw.ownerCreatedAt);
    if (!event || !nextActions(journal).includes(event.action)) return null;
    journal.push(event);
  }
  const result = describe(raw.ownerCreatedAt, { success, choice }, journal);
  return result.resolved === raw.resolved && result.success === raw.success && result.choice === raw.choice &&
    same(result.observations, raw.observations) && same(result.transfers, raw.transfers) ? result : null;
}

export function twilightReturnMatchesSaveO6(save: SaveGame) {
  const record = save.originV151?.twilightReturnO6;
  return !record || (record.ownerCreatedAt === save.createdAt && same(record.trail, witnessO6(save)));
}

export function keepsTwilightReturnO6(previous: SaveGame, requested: SaveGame) {
  const before = previous.originV151?.twilightReturnO6, after = requested.originV151?.twilightReturnO6;
  if (!after) return !before;
  if (!twilightReturnMatchesSaveO6(requested)) return false;
  if (same(before, after)) return true;
  const event = after.journal.at(-1);
  return !!event && same(requested.homeworld.locationV77, event.at) && same(recordTwilightReturnO6(previous, event, event.at), after);
}

export const TWILIGHT_LABELS_O6: Record<TwilightActionO6, string> = {
  "lift-marker": "Ramasser l’outil de repérage",
  "stow-marker": "Ranger l’outil sur l’établi",
  "lift-rope": "Ramasser le cordage d’exercice",
  "stow-rope": "Ranger le cordage sur l’établi",
  saar: "Écouter Saar", yena: "Écouter Yena", harek: "Écouter Harek", tov: "Écouter Tov",
  declare: "Parler de la suite avec Saar",
};
export const TWILIGHT_NAMES_O6 = { saar: "Saar", yena: "Yena", harek: "Harek", tov: "Tov" };
export const TWILIGHT_CHOICES_O6: Record<TwilightChoiceO6, string> = {
  technique: "Parler de technique", exploration: "Parler d’exploration", power: "Parler de puissance",
  protection: "Parler de protection", defer: "Je préfère essayer avant de le promettre.",
};

export function twilightReplyO6(save: SaveGame, order: TwilightOrderO6) {
  if (order.action === "declare") return order.choice === "defer"
    ? "Harek · Bien. Je te demanderai après la prochaine course."
    : "Saar · Alors nous regarderons comment elle grandit avec les essais.";
  switch (order.action) {
    case "lift-marker": return save.originV151?.littleTrailO6?.success
      ? "Tu ramasses l’outil utilisé pour le relevé. Porte-le jusqu’à l’établi."
      : "La recherche a déplacé les repères. Tu ramasses l’outil resté au retour des Forges.";
    case "stow-marker": return "L’outil repose sur l’établi. Retourne chercher le cordage d’exercice.";
    case "lift-rope": return "Tu portes le cordage d’exercice. Son emplacement est libre sur l’établi.";
    case "stow-rope": return "Le matériel est rangé. Monte sur la Terrasse du Conseil retrouver la cohorte.";
    case "saar": return "Saar · Demain les ateliers nous attendent. Je veux que chacun trouve une technique qu’il peut reprendre et expliquer.";
    case "yena": return "Yena · Je voudrais voir plus loin. Il reste des passages que nous ne connaissons que par les cartes.";
    case "harek": return "Harek · Je veux frapper plus fort. Je vérifierai mon appui avant de demander un nouvel essai.";
    case "tov": return "Tov · Tout est rangé. Harek veut frapper plus fort ; Yena veut voir plus loin. Je veux laisser le passage sûr pour les autres. Et toi ?";
  }
}
