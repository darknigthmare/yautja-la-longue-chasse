import type { SaveGame } from "../types";
import { getChronicleRank } from "./clanChronicle";
import { normalizeYouthCampaign } from "./youthCampaign";
import { YOUTH_WORKSHOP_LESSONS } from "./youthWorkshopV174";

export const REGIONAL_LOOP_M014 = [
  {
    id: "glass-desert", name: "Désert de Verre", halt: "Abri des citernes", prey: "Fouisseur du verre",
    high: { barrier: "Dalle réfléchissante", tool: "mask", resource: "Marque de vent sur la dalle", quiet: 2 },
    sheltered: { barrier: "Couloir de sable ouvert", tool: "cloak", resource: "Niveau de l’eau sous le vent", quiet: 1 },
  },
  {
    id: "pillar-jungle", name: "Jungle des Piliers", halt: "Halte des racines", prey: "Traqueur des piliers",
    high: { barrier: "Passerelle à stabiliser", tool: "staff", resource: "Tension du câble de treuil", quiet: 2 },
    sheltered: { barrier: "Racines dégagées", tool: "cloak", resource: "Empreinte fraîche dans la boue", quiet: 1 },
  },
  {
    id: "city-border", name: "Quartier de bordure", halt: "Poste du muret", prey: "Brouteur cuirassé",
    high: { barrier: "Vapeur au-dessus de la chaussée", tool: "mask", resource: "Lecture des conduites", quiet: 2 },
    sheltered: { barrier: "Écran du poste de soins", tool: "medicomp", resource: "Repère du poste de repli", quiet: 1 },
  },
] as const;

export const LOOP_M014_LAST = 7;
export const LOOP_M014_BARRIER = 2;
export const LOOP_M014_RESOURCE = 4;
export const LOOP_M014_TOOLS = {
  mask: "Lire avec le masque",
  cloak: "Passer sous camouflage",
  staff: "Caler avec le combistick",
  medicomp: "Vérifier le repli avec le medicomp",
} as const;
const routes = ["high", "sheltered"] as const;
export type RegionalLoopRouteM014 = typeof routes[number];
type Tool = keyof typeof LOOP_M014_TOOLS;
type Passage = {
  route: RegionalLoopRouteM014 | null;
  position: number;
  gateOpen: boolean;
  sample: boolean;
  still: number;
  observation: "none" | "alert" | "observed";
};
export type RegionalLoopCommandM014 =
  | { type: "choose"; route: RegionalLoopRouteM014 }
  | { type: "walk"; direction: -1 | 1 }
  | { type: "tool"; tool: Tool }
  | { type: "sample" | "wait" | "observe" | "retry" | "report" | "return-bag" };

export interface HomeworldRegionalLoopM014 {
  version: 1;
  ownerCreatedAt: string;
  revision: number;
  phase: "circuit" | "return-to-instructor" | "complete";
  passage: Passage | null;
  reports: { route: RegionalLoopRouteM014; sample: boolean }[];
  lastCommand: RegionalLoopCommandM014 | null;
}
type CourseSave = Pick<SaveGame, "createdAt" | "prologue" | "youthTraining" | "homeworld">;

const freshPassage = (): Passage => ({ route: null, position: 0, gateOpen: false, sample: false, still: 0, observation: "none" });

export function hasRegionalLoopFoundationM014(save: CourseSave): boolean {
  const training = normalizeYouthCampaign(save.youthTraining);
  return save.prologue?.status === "completed" && save.homeworld.greetedNpcIds.includes("terrace-instructor") &&
    training?.checkpoint.workshopV174?.reports.length === YOUTH_WORKSHOP_LESSONS.length &&
    training.checkpoint.medicompV172?.stage === "complete";
}

export function regionalLoopAdmissionM014(save: CourseSave): boolean {
  if (!hasRegionalLoopFoundationM014(save)) return false;
  if (save.homeworld.regionalLoopM014) return save.homeworld.regionalLoopM014.ownerCreatedAt === save.createdAt;
  return getChronicleRank(save.prologue?.chronicle) === "unblooded";
}

export function startRegionalLoopM014(save: CourseSave): HomeworldRegionalLoopM014 | null {
  if (!regionalLoopAdmissionM014(save)) return null;
  return save.homeworld.regionalLoopM014 ?? {
    version: 1, ownerCreatedAt: save.createdAt, revision: 0, phase: "circuit",
    passage: freshPassage(), reports: [], lastCommand: null,
  };
}

type Outcome = { state: HomeworldRegionalLoopM014 | null; message: string };
export function advanceRegionalLoopM014(state: HomeworldRegionalLoopM014, command: RegionalLoopCommandM014): Outcome {
  const refuse = (message: string): Outcome => ({ state: null, message });
  const commit = (patch: Partial<Pick<HomeworldRegionalLoopM014, "passage" | "phase" | "reports">>, message = ""): Outcome =>
    ({ state: { ...state, ...patch, revision: state.revision + 1, lastCommand: command }, message });
  if (state.phase === "complete") return refuse("La bourse est déjà rendue.");
  if (command.type === "return-bag") {
    return state.phase === "return-to-instructor"
      ? commit({ phase: "complete" }, "Bourse rendue. Le maître valide tes trois rapports.")
      : refuse("Le maître attend les trois rapports du circuit.");
  }
  const passage = state.passage, region = REGIONAL_LOOP_M014[state.reports.length];
  if (!passage || !region) return refuse("Reviens auprès du maître pour rendre la bourse.");
  if (command.type === "choose") {
    return !passage.route
      ? commit({ passage: { ...passage, route: command.route } })
      : refuse("Reviens à la halte et recommence pour changer de passage.");
  }
  if (command.type === "retry") {
    return passage.position === 0 && passage.route && passage.observation !== "observed"
      ? commit({ passage: freshPassage() }, "Reprise depuis la halte. Les rapports déjà remis sont conservés.")
      : refuse("Rejoins la halte avant de reprendre ton passage.");
  }
  if (!passage.route) return refuse("Choisis un passage à la halte.");
  const lane = region[passage.route];

  switch (command.type) {
    case "walk": {
      const position = passage.position + command.direction;
      if (position < 0 || position > LOOP_M014_LAST) return refuse("Tu as atteint le bout du passage.");
      if (command.direction === 1 && passage.observation === "alert") return refuse("La proie t’a repéré. Reviens pas à pas à la halte.");
      if (position > LOOP_M014_BARRIER && !passage.gateOpen) return refuse("Utilise l’outil adapté au franchissement.");
      return commit({ passage: { ...passage, position, still: passage.observation === "observed" ? passage.still : 0 } });
    }
    case "tool":
      if (passage.position !== LOOP_M014_BARRIER || passage.gateOpen) return refuse("Rejoins l’obstacle du passage.");
      if (command.tool !== lane.tool) return refuse("Cet outil ne sécurise pas le passage.");
      return commit({ passage: { ...passage, gateOpen: true } }, "Passage sécurisé.");
    case "sample":
      if (passage.position !== LOOP_M014_RESOURCE || passage.sample || passage.observation === "alert") return refuse("Rejoins le relevé de cette route.");
      return commit({ passage: { ...passage, sample: true } }, lane.resource);
    case "wait":
      if (passage.position !== LOOP_M014_LAST || passage.observation !== "none" || passage.still >= lane.quiet) return refuse("L’attente se fait au poste d’observation.");
      return commit({ passage: { ...passage, still: passage.still + 1 } });
    case "observe":
      if (passage.position !== LOOP_M014_LAST || passage.observation !== "none") return refuse("La proie doit être observée depuis le poste.");
      return passage.still < lane.quiet
        ? commit({ passage: { ...passage, observation: "alert" } }, "La proie t’a repéré. Reviens à la halte.");
        : commit({ passage: { ...passage, observation: "observed" } }, region.prey + " observé. Rapporte le relevé à la halte.");
    case "report": {
      if (passage.position !== 0 || passage.observation !== "observed") return refuse("Observe la proie puis retourne à la halte.");
      const reports = [...state.reports, { route: passage.route, sample: passage.sample }];
      return reports.length === REGIONAL_LOOP_M014.length
        ? commit({ reports, passage: null, phase: "return-to-instructor" }, "Les trois postes ont validé tes relevés.")
        : commit({ reports, passage: freshPassage() }, "Rapport inscrit. Le sentier du prochain secteur est ouvert.");
    }
  }
}

const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const isRoute = (v: unknown): v is RegionalLoopRouteM014 => routes.some(route => route === v);
const isInteger = (v: unknown): v is number => typeof v === "number" && Number.isSafeInteger(v);
const isTool = (v: unknown): v is Tool => typeof v === "string" && Object.hasOwn(LOOP_M014_TOOLS, v);

function normalizeCommand(raw: unknown): RegionalLoopCommandM014 | null {
  if (!record(raw)) return null;
  switch (raw.type) {
    case "choose": return isRoute(raw.route) ? { type: raw.type, route: raw.route } : null;
    case "walk": return raw.direction === -1 || raw.direction === 1 ? { type: raw.type, direction: raw.direction } : null;
    case "tool": return isTool(raw.tool) ? { type: raw.type, tool: raw.tool } : null;
    case "sample": case "wait": case "observe": case "retry": case "report": case "return-bag": return { type: raw.type };
    default: return null;
  }
}

function normalizePassage(raw: unknown, region: typeof REGIONAL_LOOP_M014[number]): Passage | null {
  if (!record(raw)) return null;
  const { route, position, gateOpen, sample, still, observation } = raw;
  if (route === null) return position === 0 && gateOpen === false && sample === false && still === 0 && observation === "none" ? freshPassage() : null;
  if (!isRoute(route) || !isInteger(position) || position < 0 || position > LOOP_M014_LAST ||
      typeof gateOpen !== "boolean" || typeof sample !== "boolean" || !isInteger(still) || still < 0 || still > region[route].quiet ||
      (observation !== "none" && observation !== "alert" && observation !== "observed")) return null;
  if ((!gateOpen && (position > LOOP_M014_BARRIER || sample || still > 0 || observation !== "none")) ||
      (observation === "observed" && still !== region[route].quiet) ||
      (observation === "alert" && still >= region[route].quiet) ||
      (observation !== "observed" && position !== LOOP_M014_LAST && still !== 0)) return null;
  return { route, position, gateOpen, sample, still, observation };
}

export function isFutureRegionalLoopM014(raw: unknown): boolean {
  return record(raw) && typeof raw.version === "number" && raw.version > 1;
}

export function normalizeRegionalLoopM014(raw: unknown): HomeworldRegionalLoopM014 | null {
  if (!record(raw)) return null;
  const { ownerCreatedAt, phase, version, revision } = raw;
  if (version !== 1 || typeof ownerCreatedAt !== "string" || ownerCreatedAt.length > 128 ||
      !Number.isFinite(Date.parse(ownerCreatedAt)) || !isInteger(revision) || revision < 0 ||
      !Array.isArray(raw.reports) || raw.reports.length > REGIONAL_LOOP_M014.length ||
      (phase !== "circuit" && phase !== "return-to-instructor" && phase !== "complete")) return null;
  const reports: HomeworldRegionalLoopM014["reports"] = [];
  for (const reported of raw.reports) {
    if (!record(reported) || !isRoute(reported.route) || typeof reported.sample !== "boolean") return null;
    reports.push({ route: reported.route, sample: reported.sample });
  }
  const lastCommand = normalizeCommand(raw.lastCommand);
  const start = reports.length === 0 && revision === 0;
  if (start ? raw.lastCommand !== null : !lastCommand) return null;
  const region = REGIONAL_LOOP_M014[reports.length];
  if ((phase === "circuit") !== Boolean(region) || (!region && raw.passage !== null)) return null;
  const passage = region ? normalizePassage(raw.passage, region) : null;
  if (region && (!passage || (start && passage.route !== null))) return null;
  if ((phase === "complete") !== (lastCommand?.type === "return-bag") ||
      (phase === "return-to-instructor" && lastCommand?.type !== "report")) return null;
  const earliest = reports.reduce((count, report, index) => count + 18 + REGIONAL_LOOP_M014[index][report.route].quiet + Number(report.sample), 0);
  if (revision < earliest + Number(phase === "complete")) return null;
  return { version, ownerCreatedAt, phase, revision, reports, passage, lastCommand };
}

export function regionalLoopMatchesSaveM014(save: CourseSave): boolean {
  const loop = save.homeworld.regionalLoopM014;
  return !loop || loop.ownerCreatedAt === save.createdAt && hasRegionalLoopFoundationM014(save);
}

export function isRegionalLoopSuccessorM014(previous: CourseSave, next: CourseSave): boolean {
  const prior = previous.homeworld.regionalLoopM014, candidate = next.homeworld.regionalLoopM014;
  if (JSON.stringify(prior) === JSON.stringify(candidate)) return true;
  if (!candidate || !regionalLoopMatchesSaveM014(next)) return false;
  if (!prior) return JSON.stringify(candidate) === JSON.stringify(startRegionalLoopM014(previous));
  if (!candidate.lastCommand) return false;
  return JSON.stringify(candidate) === JSON.stringify(advanceRegionalLoopM014(prior, candidate.lastCommand).state);
}
