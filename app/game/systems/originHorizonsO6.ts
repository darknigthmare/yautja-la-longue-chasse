import type { SaveGame } from "../types";
import { completedEliteClanRites } from "./eliteClanRitesV175";
import { normalizeHomeworldCheckpointV77, type HomeworldCheckpointV77 } from "./homeworldCheckpointV77";
import { homeworldCivicWalkableV80 } from "./homeworldCivicWorldV80";
import { homeworldRouteSegmentV109 } from "./homeworldNavigationV109";
import type { HomeworldLevelV77 } from "./homeworldWorldV77";
import { twilightSiteO6 } from "./originTwilightReturnO6";
import { shipAcquisitionOwnedHullV89 } from "./shipAcquisitionV89";

export const HORIZON_IDS_O6 = ["teaching", "circle", "exploration"] as const;
type HorizonIdO6 = typeof HORIZON_IDS_O6[number];
type HorizonSiteO6 = "saar" | HorizonIdO6;
type HorizonOrderO6 = { kind: "listen" } | { kind: "prepare" | "choose"; horizon: HorizonIdO6 };
type HorizonEventO6 =
  | { kind: "listen"; at: HomeworldCheckpointV77 }
  | { kind: "prepare"; horizon: HorizonIdO6; reduced: boolean; at: HomeworldCheckpointV77 }
  | { kind: "choose"; horizon: HorizonIdO6; at: HomeworldCheckpointV77 };

export interface HorizonsRecordO6 {
  version: 1;
  ownerCreatedAt: string;
  journal: HorizonEventO6[];
}

const POST_O6 = {
  saar: "saar", teaching: "yena", circle: "harek", exploration: "tov",
} as const;

export const HORIZON_LABELS_O6 = {
  teaching: "Cour d’enseignement", circle: "Cercle de chasse", exploration: "Coffre de transmission",
} satisfies Record<HorizonIdO6, string>;

const HORIZON_ACTIONS_O6 = {
  teaching: "Éprouver l’appui de la cour",
  circle: "Identifier le départ et le point de retour",
  exploration: "Vérifier l’attache du coffre",
} satisfies Record<HorizonIdO6, string>;

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const isObject = (value: unknown): value is Record<string, unknown> => Boolean(value && typeof value === "object" && !Array.isArray(value));

export function horizonIdO6(value: unknown): HorizonIdO6 | undefined {
  return HORIZON_IDS_O6.find(id => id === value);
}

export function horizonSiteO6(site: HorizonSiteO6) {
  return twilightSiteO6(POST_O6[site]);
}

export function horizonActionLabelO6(site: HorizonSiteO6, choose: boolean) {
  return site === "saar" ? (choose ? "Comparer les trois projets avec Saar" : "Écouter Saar sur la terrasse")
    : HORIZON_ACTIONS_O6[site];
}

function hasHorizonWitnessO6(save: SaveGame) {
  const origin = save.originV151, elite = save.eliteRecognitionV174;
  return origin?.originId === "O6" && origin.source === "creation" &&
    save.prologue?.status === "completed" &&
    save.prologue.chronicle.evidence.some(receipt => receipt.id === "solitary-trial") &&
    save.prologue.chronicle.rites.some(rite => rite.id === "elite-recognition") &&
    elite?.recognized === true && elite.ownerCreatedAt === save.createdAt && completedEliteClanRites(elite.trials);
}

function horizonSites(journal: readonly HorizonEventO6[]): HorizonSiteO6[] {
  if (journal.length === 0) return ["saar"];
  if (journal.at(-1)?.kind === "choose") return [];
  const pending = HORIZON_IDS_O6.filter(id => !journal.some(event => event.kind === "prepare" && event.horizon === id));
  return pending.length ? pending : ["saar"];
}

export function horizonSitesO6(save: SaveGame): HorizonSiteO6[] {
  if (!hasHorizonWitnessO6(save) || save.originV151?.ending?.endingChoiceConfirmed) return [];
  return horizonSites(save.originV151?.horizonsO6?.journal ?? []);
}

function atSite(site: HorizonSiteO6, level: HomeworldLevelV77, actor: { x: number; y: number }, interiorId: string | null) {
  const post = horizonSiteO6(site);
  return !interiorId && level === post.levelId && Math.hypot(actor.x - post.point.x, actor.y - post.point.y) <= 44 &&
    homeworldCivicWalkableV80(level, actor) && homeworldRouteSegmentV109(level, actor, post.point);
}

export function horizonInteractionO6(save: SaveGame, level: HomeworldLevelV77, actor: { x: number; y: number }, interiorId: string | null) {
  return horizonSitesO6(save).find(site => atSite(site, level, actor, interiorId));
}

export function horizonSummaryO6(horizon: HorizonIdO6, reduced: boolean): string {
  if (horizon === "teaching") return reduced ? "Une place pour une leçon dans la cour commune." : "L’appui peut rejoindre un atelier dans la demeure.";
  if (horizon === "exploration") return reduced ? "Le premier relais se prépare à pied avec un coffre allégé." : "Le coffre peut être arrimé près du sas de la coque personnelle.";
  return "La boucle prévoit un retour commun et des sorties libres pour les volontaires.";
}

function shorterO6(save: SaveGame, horizon: HorizonIdO6): boolean {
  if (horizon === "teaching") return !save.residenceV149?.rights.length;
  if (horizon === "exploration") return !shipAcquisitionOwnedHullV89(save.shipAcquisitionV89, save.createdAt);
  return false;
}

function readEvent(raw: unknown, owner: string, prior: HorizonEventO6[]): HorizonEventO6 | null {
  if (!isObject(raw)) return null;
  const at = normalizeHomeworldCheckpointV77(raw.at);
  if (!at || at.ownerCreatedAt !== owner) return null;
  if (raw.kind === "listen" && !prior.length && atSite("saar", at.levelId, at.exterior, at.interiorId))
    return { kind: "listen", at };
  const horizon = horizonIdO6(raw.horizon);
  if (!horizon) return null;
  if (raw.kind === "prepare" && prior.length && horizonSites(prior).includes(horizon) &&
      atSite(horizon, at.levelId, at.exterior, at.interiorId) && typeof raw.reduced === "boolean" &&
      (horizon !== "circle" || !raw.reduced)) return { kind: "prepare", horizon, at, reduced: raw.reduced };
  if (raw.kind === "choose" && prior.length === 4 && atSite("saar", at.levelId, at.exterior, at.interiorId))
    return { kind: "choose", horizon, at };
  return null;
}

export function normalizeHorizonsO6(raw: unknown): HorizonsRecordO6 | null {
  if (!isObject(raw) || raw.version !== 1 || typeof raw.ownerCreatedAt !== "string" ||
      !Array.isArray(raw.journal) || raw.journal.length < 1 || raw.journal.length > 5) return null;
  const journal: HorizonEventO6[] = [];
  for (const input of raw.journal) {
    const event = readEvent(input, raw.ownerCreatedAt, journal);
    if (!event) return null;
    journal.push(event);
  }
  return { version: 1, ownerCreatedAt: raw.ownerCreatedAt, journal };
}

export function recordHorizonsO6(save: SaveGame, order: HorizonOrderO6, at: HomeworldCheckpointV77) {
  if (!horizonSitesO6(save).length) return null;
  const journal = save.originV151?.horizonsO6?.journal ?? [];
  const event = readEvent({
    ...order, at, ...(order.kind === "prepare" ? { reduced: shorterO6(save, order.horizon) } : {}),
  }, save.createdAt, journal);
  return event ? { version: 1 as const, ownerCreatedAt: save.createdAt, journal: [...journal, event] } : null;
}

export function horizonsMatchSaveO6(save: SaveGame): boolean {
  const receipt = save.originV151?.horizonsO6;
  return !receipt || (receipt.ownerCreatedAt === save.createdAt && hasHorizonWitnessO6(save));
}

export function keepsHorizonsO6(previous: SaveGame, next: SaveGame): boolean {
  const before = previous.originV151?.horizonsO6, after = next.originV151?.horizonsO6;
  if (same(before, after)) return true;
  const event = after?.journal.at(-1);
  return !!event && same(event.at, next.homeworld.locationV77) && same(recordHorizonsO6(previous, event, event.at), after);
}
