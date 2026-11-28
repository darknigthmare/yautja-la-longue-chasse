import type { SaveGame } from "../types";
import { CHRONICLE_EVIDENCE, getChronicleRank, performChronicleRite, recordChronicleEvidence } from "./clanChronicle";
import { normalizeSoloV70Campaign } from "./campaignSoloV70";
import { rankTrialsBlockedV147 } from "./honorTribunalV147";
import { hasQuatzaReturn, inspectQuatzaRij } from "./quatzaRij";

export const BLOODED_ROOMS = [
  { name: "Descente des Contrepoids", objective: "Libérer le passage des contrepoids", lane: 1 },
  { name: "Galerie des Coques", objective: "Lire les traces près des œufs", lane: 0, hunter: "joueur" },
  { name: "Puits de Résine", objective: "Poser l’ancre de rappel", lane: 1, hunter: "pisteur" },
  { name: "Chambre de Confinement", objective: "Interposer la grille de secours", lane: 0, hunter: "garde" },
  { name: "Nef de la Reine", objective: "Armer le verrou depuis la console", lane: 1 },
  { name: "Sas de Purge", objective: "Prendre en charge le membre blessé", lane: 0 },
] as const;

type Hunter = "joueur" | "pisteur" | "garde";
export type TempleStage = "council" | "temple" | "mark" | "complete";
const ACTIONS = ["present", "left", "right", "lane", "interact", "guard", "strike",
  "next", "retry", "clear-mark", "seal-mark", "return-tools", "celebrate-cohort", "visit-quietly", "greet-witness"] as const;
type ActionKind = (typeof ACTIONS)[number];
export type TempleActionV174 = ActionKind | { mark: number };
export type TempleCommandV174 = { action: TempleActionV174; expectedRevision: number };
type Event = { action: TempleActionV174; at: number };
export interface BloodedTempleV174 {
  version: 1;
  owner: string;
  events: Event[];
}
export interface TempleViewV174 {
  stage: TempleStage;
  room: number;
  column: number;
  lane: number;
  plate: boolean;
  prepared: boolean;
  guarded: boolean;
  enemy: number;
  vitality: number;
  proofs: Hunter[];
  deadline: number | null;
  carriesWounded: boolean;
  marks: number[][];
  ceremony: "cohort" | "quiet" | null;
  witnessGreeted: boolean;
  courtPosition: number;
}

export function templePassageLaneV174(view: TempleViewV174): number {
  const lane = BLOODED_ROOMS[view.room].lane;
  return view.room === 0 && view.plate ? 1 - lane : lane;
}

const initial = (): TempleViewV174 => ({
  stage: "council", room: 0, column: 0, lane: 0, plate: false, prepared: false,
  guarded: false, enemy: 0, vitality: 3, proofs: [], deadline: null, carriesWounded: false, marks: [[]],
  ceremony: null, witnessGreeted: false, courtPosition: 0,
});
const reject = (notice: string) => ({ ok: false as const, notice });
const accepted = (view: TempleViewV174) => ({ ok: true as const, view });

function enterRoom(view: TempleViewV174, room: number): TempleViewV174 {
  return {
    ...view, room, column: 0, lane: 0, prepared: false, guarded: false,
    enemy: "hunter" in BLOODED_ROOMS[room] ? 2 : 0, vitality: 3,
  };
}

function step(view: TempleViewV174, event: Event) {
  const { action, at } = event;
  if (view.stage === "complete") {
    if (!view.ceremony && (action === "celebrate-cohort" || action === "visit-quietly")) {
      return accepted({ ...view, ceremony: action === "celebrate-cohort" ? "cohort" : "quiet" });
    }
    if (view.ceremony && !view.witnessGreeted && action === "right" && view.courtPosition < 2) {
      return accepted({ ...view, courtPosition: view.courtPosition + 1 });
    }
    if (view.ceremony && view.courtPosition === 2 && !view.witnessGreeted && action === "greet-witness") {
      return accepted({ ...view, witnessGreeted: true });
    }
    return reject("La reconnaissance est déjà consignée.");
  }
  if (view.stage === "council") {
    return action === "present" ? accepted({ ...view, stage: "temple" }) : reject("Présente le crâne rapporté par le trio.");
  }
  if (view.stage === "mark") {
    const mask = view.marks[0];
    const current = view.marks.at(-1)!;
    if (action === "return-tools" && view.marks.length === 3) return accepted({ ...view, stage: "complete" });
    if (view.marks.length === 3) return reject("Rends les outils du rite aux témoins.");
    if (action === "clear-mark" && current.length) return accepted({ ...view, marks: [...view.marks.slice(0, -1), []] });
    if (action === "seal-mark") {
      if (current.length < 4 || (view.marks.length === 2 && current.length !== mask.length)) {
        return reject("Trace le motif en reliant au moins quatre points puis reproduis-le sur le front.");
      }
      return accepted({ ...view, marks: [...view.marks, []] });
    }
    if (typeof action !== "object" || current.includes(action.mark)) return reject("Choisis un nouveau point du tracé.");
    const last = current.at(-1);
    if (last !== undefined && Math.abs(action.mark % 3 - last % 3) +
        Math.abs(Math.floor(action.mark / 3) - Math.floor(last / 3)) !== 1) return reject("Relie un point voisin du dernier.");
    if (view.marks.length === 2 && mask[current.length] !== action.mark) return reject("Reproduis le même trait sur le front.");
    return accepted({ ...view, marks: [...view.marks.slice(0, -1), [...current, action.mark]] });
  }

  const expired = view.deadline !== null && at >= view.deadline;
  if (expired || view.vitality <= 0) {
    if (action !== "retry") return reject(expired ? "La purge a fermé le sas. Reprends depuis la nef." : "Le trio a décroché. Reformez-le à l’entrée de la salle.");
    return accepted(enterRoom({ ...view, carriesWounded: false, deadline: null }, expired ? 4 : view.room));
  }

  const place = BLOODED_ROOMS[view.room];
  const atMechanism = view.column === 2 && view.lane === place.lane;
  const atTension = view.column === 3 && view.lane === place.lane;
  if (action === "lane") {
    if (view.column > 2 && view.column < 5) return reject("Change de voie devant les mécanismes ou près de la sortie.");
    return accepted({ ...view, lane: 1 - view.lane, guarded: false });
  }
  if (action === "left" || action === "right") {
    const column = view.column + (action === "right" ? 1 : -1);
    if (column < 0 || column > 5) return reject("La salle se termine ici.");
    if (view.column === 2 && column === 3 && (!view.prepared || (view.room === 0 && !view.plate) || view.lane !== templePassageLaneV174(view))) {
      return reject("Le passage est fermé. Travaille au mécanisme sur l’autre voie si nécessaire.");
    }
    if (view.column === 3 && column === 4 && view.enemy) return reject("La créature tient la traversée.");
    return accepted({ ...view, column, guarded: false });
  }
  if (action === "interact") {
    if (!view.prepared && atMechanism) {
      return accepted({ ...view, prepared: true, carriesWounded: view.carriesWounded || view.room === 5 });
    }
    if (view.room === 0 && atMechanism && !view.plate) return accepted({ ...view, plate: true });
    if (view.room === 4 && atTension && view.prepared && view.proofs.length === 3 && view.deadline === null) {
      return accepted({ ...view, deadline: at + 60000 });
    }
    return reject("Approche du mécanisme signalé.");
  }
  if (action === "guard" || action === "strike") {
    if (!atTension || !view.enemy || !("hunter" in place)) return reject("Le chasseur doit être face à la créature.");
    if (action === "guard") {
      return view.guarded ? reject("La fenêtre d’ouverture est déjà prête.") : accepted({ ...view, guarded: true });
    }
    if (!view.guarded) return accepted({ ...view, vitality: view.vitality - 1 });
    const enemy = view.enemy - 1;
    return accepted({ ...view, enemy, guarded: false, proofs: enemy ? view.proofs : [...view.proofs, place.hunter] });
  }
  if (action === "next" && view.column === 5 && view.prepared && !view.enemy) {
    if (view.room < 4) return accepted(enterRoom(view, view.room + 1));
    if (view.room === 4 && view.deadline !== null) return accepted(enterRoom(view, 5));
    if (view.room === 5 && view.carriesWounded && view.deadline !== null && view.proofs.length === 3 && view.plate) {
      return accepted({ ...view, stage: "mark", deadline: null });
    }
  }
  return reject("Le signal du passage attend encore un geste dans la salle.");
}

function canonicalAction(value: unknown): TempleActionV174 | null {
  if (typeof value === "string" && (ACTIONS as readonly string[]).includes(value)) return value as ActionKind;
  if (value && typeof value === "object" && !Array.isArray(value) && Object.keys(value).length === 1 &&
      "mark" in value && typeof value.mark === "number" && Number.isInteger(value.mark) && value.mark >= 0 && value.mark < 9) {
    return { mark: value.mark };
  }
  return null;
}

export function inspectBloodedTempleV174(value: unknown, owner: string) {
  const empty = (status: "absent" | "invalid-save" | "future-version") => ({ status, state: null, view: initial() });
  if (value == null) return empty("absent");
  if (typeof value !== "object" || Array.isArray(value)) return empty("invalid-save");
  const raw = value as Record<string, unknown>;
  if (raw.owner !== owner || !Number.isFinite(Date.parse(owner))) return empty("invalid-save");
  if (typeof raw.version === "number" && Number.isInteger(raw.version) && raw.version > 1) return empty("future-version");
  if (raw.version !== 1 || Object.keys(raw).length !== 3 || !Array.isArray(raw.events) || !raw.events.length || raw.events.length > 512) return empty("invalid-save");
  let previousAt = Date.parse(owner);
  let view = initial();
  const events: Event[] = [];
  for (const event of raw.events) {
    if (!event || typeof event !== "object" || Object.keys(event).length !== 2) return empty("invalid-save");
    const action = canonicalAction(event.action);
    if (!action || !Number.isSafeInteger(event.at) || event.at < previousAt || event.at > 8640000000000000) return empty("invalid-save");
    const parsed = { action, at: event.at };
    const result = step(view, parsed);
    if (!result.ok) return empty("invalid-save");
    view = result.view;
    previousAt = parsed.at;
    events.push(parsed);
  }
  const state: BloodedTempleV174 = { version: 1, owner, events };
  return { status: "valid" as const, state, view };
}

export function templeHasFoundationV174(save: SaveGame): boolean {
  const trio = inspectQuatzaRij(save.quatzaRij, save.createdAt).state?.expeditions.triad;
  return save.prologue?.status === "completed" && normalizeSoloV70Campaign(save.soloV70)?.status === "completed" && save.soloV90?.status === "completed" &&
    hasQuatzaReturn(save.quatzaRij, save.createdAt, "triad") &&
    trio?.presentations?.includes("companions") === true && trio.presentations.includes("trophy");
}

export function templeAvailableV174(save: SaveGame): boolean {
  return templeHasFoundationV174(save) && getChronicleRank(save.prologue?.chronicle) === "young-blood" &&
    !rankTrialsBlockedV147(save.tribunalV147);
}

export function templeJournalSuccessorV174(before: BloodedTempleV174 | null | undefined, next: BloodedTempleV174): boolean {
  const events = before?.events ?? [];
  return (!before || before.owner === next.owner) && next.events.length === events.length + 1 &&
    events.every((event, i) => JSON.stringify(event) === JSON.stringify(next.events[i]));
}

const proofIds = ["quatza-rij-triad-hunt", "temple-three-shadows-triad", "temple-three-shadows-changing-layout",
  "temple-three-shadows-no-energy", "initiation-return"] as const;

export function advanceBloodedTempleV174(save: SaveGame, command: TempleCommandV174, at: number) {
  const current = inspectBloodedTempleV174(save.bloodedTempleV174, save.createdAt);
  const returned = current.view.stage === "complete" && templeHasFoundationV174(save) &&
    save.prologue?.chronicle.rites.some(rite => rite.id === "blooding-mark");
  if (!save.prologue || (!returned && !templeAvailableV174(save))) {
    return reject("Le compte rendu complet du trio et la Vanne de Quarantaine doivent être validés.");
  }
  if (current.status !== "valid" && current.status !== "absent") return reject("Le registre du temple est incompatible.");
  const events = current.state?.events ?? [];
  const action = canonicalAction(command.action);
  if (!action || command.expectedRevision !== events.length || events.length >= 512 ||
      !Number.isSafeInteger(at) || at < (events.at(-1)?.at ?? Date.parse(save.createdAt))) {
    return reject("Le temple a changé. Reviens au dernier geste consigné.");
  }
  const event = { action, at };
  const result = step(current.view, event);
  if (!result.ok) return result;
  const bloodedTempleV174: BloodedTempleV174 = { version: 1, owner: save.createdAt, events: [...events, event] };
  let prologue = save.prologue;
  if (current.view.stage !== "complete" && result.view.stage === "complete") {
    let chronicle = prologue.chronicle;
    for (const id of proofIds) {
      if (chronicle.evidence.some(e => e.id === id)) continue;
      const proof = CHRONICLE_EVIDENCE.find(p => p.id === id)!;
      const filed = recordChronicleEvidence(chronicle, { id, sourceId: proof.sourceId });
      if (!filed.accepted) return reject("Le témoin refuse un reçu incomplet.");
      chronicle = filed.state;
    }
    const rite = performChronicleRite(chronicle, { id: "blooding-mark", sourceId: "chronicle.rite.blooding" });
    if (!rite.accepted) return reject("La reconnaissance du trio demande les cinq preuves.");
    prologue = { ...prologue, chronicle: rite.state };
  }
  return { ok: true as const, update: { bloodedTempleV174, prologue },
    notice: action === "return-tools" ? "Les témoins reconnaissent ta marque Blooded." : "Geste consigné." };
}
