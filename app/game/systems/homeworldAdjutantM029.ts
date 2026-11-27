import { MISSIONS } from "../data";
import type { MissionId, SaveGame } from "../types";
import { CHRONICLE_EVIDENCE, CHRONICLE_RITES, getChronicleFunctions, performChronicleRite, recordChronicleEvidence } from "./clanChronicle";
import { homeworldPackAdmissionM029, homeworldPackViewM029 } from "./homeworldPackTrialM029";
import { COORDINATION_OFFICER_M028, COORDINATION_WORKSHOP_M028, homeworldCoordinationWorkshopReachedM028 } from "./homeworldCoordinationM028";
import { ROUTE_BOARDING_M034 } from "./homeworldRouteM034";

export const ADJUTANT_DOCK_M029 = COORDINATION_OFFICER_M028;
export const ADJUTANT_RELAY_M029 = COORDINATION_WORKSHOP_M028;
export const ADJUTANT_SAS_M029 = ROUTE_BOARDING_M034;
export const ADJUTANT_LEADER_M029 = { roomId: "throne-audience", pointId: "audience-point" } as const;

const phases = ["dossier", "relay", "reported", "deferred", "appointed"] as const;
type AdjutantPhase = typeof phases[number];
const histories: Readonly<Record<AdjutantPhase, readonly HomeworldAdjutantActionM029[]>> = {
  dossier: ["study"],
  relay: ["study", "place-relay"],
  reported: ["study", "place-relay", "confirm-signal"],
  deferred: ["study", "place-relay", "confirm-signal", "defer"],
  appointed: ["study", "place-relay", "confirm-signal", "accept"],
};
type AdjutantSave = Pick<SaveGame, "createdAt" | "profile" | "prologue" | "homeworld" | "missionProgress">;

export type HomeworldAdjutantM029 = {
  version: 1;
  ownerCreatedAt: string;
  phase: AdjutantPhase;
  witnessedWorlds: [MissionId, MissionId];
  events: HomeworldAdjutantActionM029[];
};
export type HomeworldAdjutantActionM029 = "study" | "place-relay" | "confirm-signal" | "defer" | "accept";
type AdjutantPlace = { roomId: string | null; pointId: string | null; actor: { x: number; y: number }; suspended: boolean };

const appointment = CHRONICLE_RITES.find(rite => rite.id === "adjutant-appointment")!;

function completedWorlds(save: AdjutantSave): [MissionId, MissionId] | null {
  const witnesses = new Map<string, MissionId>();
  for (const mission of MISSIONS) {
    const progress = save.missionProgress[mission.id];
    if (progress?.status === "completed" && progress.completions > 0 && !witnesses.has(mission.planetName)) {
      witnesses.set(mission.planetName, mission.id);
    }
  }
  const [first, second] = witnesses.values();
  return first && second ? [first, second] : null;
}

function worldWitnessesMatch(save: AdjutantSave, ids: [MissionId, MissionId]) {
  const planets = ids.map(id => MISSIONS.find(mission => mission.id === id)?.planetName);
  return !!planets[0] && !!planets[1] && planets[0] !== planets[1] && ids.every(id =>
    save.missionProgress[id]?.status === "completed" && save.missionProgress[id].completions > 0);
}

function returnedPack(save: AdjutantSave) {
  return homeworldPackViewM029(save.homeworld.packTrialM029, save.createdAt)?.phase === "returned";
}

export function normalizeHomeworldAdjutantM029(raw: unknown): HomeworldAdjutantM029 | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const { version, ownerCreatedAt, phase, witnessedWorlds, events } = raw as Record<string, unknown>;
  if (version !== 1 || typeof ownerCreatedAt !== "string" || !Number.isFinite(Date.parse(ownerCreatedAt)) ||
      !phases.some(value => value === phase) || !Array.isArray(witnessedWorlds) || witnessedWorlds.length !== 2 ||
      witnessedWorlds[0] === witnessedWorlds[1] || !witnessedWorlds.every(id => MISSIONS.some(mission => mission.id === id))) return null;
  const stage = phase as AdjutantPhase;
  const expected = histories[stage];
  if (!Array.isArray(events) || !(events.length === expected.length && expected.every((key, i) => events[i] === key)) &&
      !(stage === "appointed" && events.length === 5 && histories.deferred.every((key, i) => events[i] === key) &&
        events[4] === "accept")) return null;
  return { version, ownerCreatedAt, phase: stage, events: [...events] as HomeworldAdjutantActionM029[],
    witnessedWorlds: [witnessedWorlds[0], witnessedWorlds[1]] as [MissionId, MissionId] };
}

export function homeworldAdjutantViewM029(raw: unknown, save: AdjutantSave) {
  const record = normalizeHomeworldAdjutantM029(raw);
  const coordination = save.homeworld.coordinationM028;
  return record?.ownerCreatedAt === save.createdAt && worldWitnessesMatch(save, record.witnessedWorlds) && returnedPack(save) &&
    coordination?.ownerCreatedAt === save.createdAt && coordination.phase === "returned" ? record : null;
}

export function homeworldAdjutantEligibilityM029(save: AdjutantSave) {
  const packGate = homeworldPackAdmissionM029(save);
  if (packGate) return packGate;
  if (!returnedPack(save)) return "Ramène et recompte les douze élèves auprès du Maître des terrasses.";
  if (!completedWorlds(save)) return "Le Leader attend deux chasses réussies sur des mondes différents.";
  return null;
}

export function homeworldAdjutantMatchesSaveM029(save: AdjutantSave) {
  const chronicle = save.prologue?.chronicle;
  const named = getChronicleFunctions(chronicle).includes("adjutant");
  const teamProof = chronicle?.evidence.some(evidence => evidence.id === "team-extraction") === true;
  const worldProof = chronicle?.evidence.some(evidence => evidence.id === "multiple-world-hunts") === true;
  const record = homeworldAdjutantViewM029(save.homeworld.adjutantM029, save);
  if (save.homeworld.adjutantM029 && !record) return false;
  return named === (record?.phase === "appointed") && teamProof === named && worldProof === named;
}

export function isHomeworldAdjutantSuccessorM029(previous: HomeworldAdjutantM029 | undefined, next: HomeworldAdjutantM029 | undefined) {
  if (!next) return false;
  if (!previous) return next.phase === "dossier";
  return previous.ownerCreatedAt === next.ownerCreatedAt &&
    previous.witnessedWorlds.every((id, index) => id === next.witnessedWorlds[index]) &&
    next.events.length === previous.events.length + 1 &&
    previous.events.every((action, index) => action === next.events[index]);
}

function placeMatches(action: HomeworldAdjutantActionM029, place: AdjutantPlace) {
  if (place.suspended) return false;
  if (action === "place-relay") return homeworldCoordinationWorkshopReachedM028(place.roomId, place.actor);
  const post = action === "study" ? ADJUTANT_DOCK_M029
    : action === "confirm-signal" ? ADJUTANT_SAS_M029 : ADJUTANT_LEADER_M029;
  return place.roomId === post.roomId && place.pointId === post.pointId;
}

export function actHomeworldAdjutantM029(
  raw: unknown, save: AdjutantSave, action: HomeworldAdjutantActionM029, place: AdjutantPlace,
): { state?: HomeworldAdjutantM029; prologue?: NonNullable<SaveGame["prologue"]>; message: string } {
  if (!placeMatches(action, place)) return { message: "Rejoins le poste de cette étape." };
  const missing = homeworldAdjutantEligibilityM029(save);
  if (missing) return { message: missing };
  const prior = homeworldAdjutantViewM029(raw, save);
  if (raw != null && !prior) return { message: "Le dossier ne correspond pas à ce pack ou à cette campagne." };
  const witnessedWorlds = completedWorlds(save);
  if (!witnessedWorlds) return { message: "Deux mondes restent à inscrire au dossier." };
  if (!prior && action === "study") {
    return { state: { version: 1, ownerCreatedAt: save.createdAt, phase: "dossier", witnessedWorlds, events: ["study"] },
      message: "Dossier confié. Mets le relais sur son support dans l’Atelier des convois." };
  }
  if (!prior) return { message: "L’officier doit d’abord te remettre le dossier du quai." };
  if (action === "place-relay" && prior.phase === "dossier") {
    return { state: { ...prior, phase: "relay", events: [...prior.events, action] },
      message: "Relais posé. Rejoins le sas orbital pour relayer le signal au convoi." };
  }
  if (action === "confirm-signal" && prior.phase === "relay") {
    return { state: { ...prior, phase: "reported", events: [...prior.events, action] },
      message: "Le convoi a reçu le signal. Présente le retour des élèves et le service du quai au Leader." };
  }
  if (action === "defer" && prior.phase === "reported") {
    return { state: { ...prior, phase: "deferred", events: [...prior.events, action] },
      message: "Le Leader garde ton dossier à disposition. La fonction reste à accepter." };
  }
  if (action !== "accept" || (prior.phase !== "reported" && prior.phase !== "deferred") || !save.prologue) {
    return { message: "Le dossier actuel ne permet pas cette décision." };
  }
  let chronicle = save.prologue.chronicle;
  if (getChronicleFunctions(chronicle).includes("adjutant")) return { message: "La fonction est déjà enregistrée." };
  for (const id of appointment.requiredEvidenceIds) {
    const definition = CHRONICLE_EVIDENCE.find(evidence => evidence.id === id)!;
    const result = recordChronicleEvidence(chronicle, { id: definition.id, sourceId: definition.sourceId });
    if (!result.accepted) return { message: "Une preuve du dossier n’a pas pu être vérifiée." };
    chronicle = result.state;
  }
  const result = performChronicleRite(chronicle, { id: appointment.id, sourceId: appointment.sourceId });
  if (!result.accepted || !result.changed) return { message: "La chronique n’a pas confirmé la nomination." };
  return { state: { ...prior, phase: "appointed", events: [...prior.events, action] }, prologue: { ...save.prologue, chronicle: result.state },
    message: "Le Leader confirme ta fonction d’Adjutant. Les preuves et le service du quai sont inscrits." };
}
