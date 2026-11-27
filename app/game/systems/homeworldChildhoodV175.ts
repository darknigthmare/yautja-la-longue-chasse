import type { SaveGame } from "../types";
import { nextYouthCityStopV172 } from "./youthCityErrandV172";

export const CHILDHOOD_POST_V175 = { roomId: "training-hall", pointId: "training-service" } as const;
export const CHILDHOOD_DRILLS_V175 = {
  ring: { title: "Prise de l’anneau", companionHint: "L’anneau traverse les deux dalles. Attrape-le lorsqu’il est à portée." },
  beam: { title: "Appuis sur la poutre", companionHint: "Avance jusqu’au bout. Recentre tes appuis quand la poutre te déporte." },
  spring: { title: "Lecture de la cible", companionHint: "Rejoins la ligne de frappe. Observe un battement puis attends l’ouverture." },
} as const;
export function childhoodRingPositionV175(beat: number) { return beat % 4 < 2 ? 3 : 4; }
export function childhoodSpringOpenV175(beat: number) { return beat % 5 === 2 || beat % 5 === 3; }

const COMPANIONS = ["Yena", "Harek", "Tov"] as const;
const JOURNAL_LIMIT = 384;
const ACTOR_END = { ring: 5, beam: 7, spring: 6, track: 10, "handoff": 7 } as const;
export const CHILDHOOD_TRAIL_SIGNS_V175 = [
  { x: 3, name: "Empreintes", actual: "Deux traces légères s’enfoncent en direction du bois.", decoy: "Les grandes marques sèches traversent la piste." },
  { x: 6, name: "Branches", actual: "Un rameau bas vient de plier du côté du bosquet.", decoy: "Le haut de la souche est cassé depuis longtemps." },
  { x: 8, name: "Sons", actual: "Un bref appel se répète au pied du perchoir.", decoy: "L’écho vient du mur à gauche, au-delà de la borne." },
] as const;
const vocabulary = ["ring", "beam", "spring", "track", "east", "west", "observe", "use", "track-sign",
  "track-decoy", "show-map", "show-passage", "handoff", "reset-current"] as const;
export type ChildhoodCommandV175 = typeof vocabulary[number];
type ChildhoodEvent = Exclude<ChildhoodCommandV175, "reset-current">;
type Drill = keyof typeof CHILDHOOD_DRILLS_V175;
type Trial = keyof typeof ACTOR_END;
type TrackPhase = "outward" | "perched" | "returning";
export type ChildhoodLedgerV175 = { version: 1; ownerCreatedAt: string; revision: number; journal: ChildhoodEvent[] };
type Observation = { phase: TrackPhase; signs: number; comparing: boolean };
export type ChildhoodViewV175 = {
  trial: Trial | null;
  position: number;
  beat: number;
  drift: number;
  finished: Drill[];
  companion: (typeof COMPANIONS)[number] | null;
  track: Observation | null;
  report: "map" | "passage" | null;
  demonstrated: boolean;
  stowed: boolean;
  passed: boolean;
  message: string;
};
type ChildhoodSave = Pick<SaveGame, "createdAt" | "homeworld" | "prologue">;
type ChildhoodPlace = { roomId: string | null; pointId: string | null; suspended: boolean };
const initial = (): ChildhoodViewV175 => ({
  trial: null, position: 0, beat: 0, drift: 0, finished: [], companion: null, track: null,
  report: null, demonstrated: false, stowed: false, passed: false,
  message: "Choisis le premier atelier. Son camarade t’attendra à l’entrée.",
});

export function childhoodTrackSignV175(view: ChildhoodViewV175) {
  return view.track ? CHILDHOOD_TRAIL_SIGNS_V175[view.track.signs] : undefined;
}
export function childhoodLengthV175(view: ChildhoodViewV175) {
  return view.trial ? ACTOR_END[view.trial] + 1 : 0;
}

function begin(view: ChildhoodViewV175, trial: Trial, message: string): ChildhoodViewV175 {
  return { ...view, trial, position: 0, beat: 0, drift: 0, message };
}
function completeDrill(view: ChildhoodViewV175, drill: Drill): ChildhoodViewV175 {
  return { ...view, trial: null, finished: [...view.finished, drill], companion: null,
    message: view.finished.length === 2 ? "Les trois gestes sont reconnus. La petite réserve d’exercice peut ouvrir."
      : "Le geste est consigné. Choisis un autre atelier." };
}

function move(view: ChildhoodViewV175, trial: Trial, direction: number): ChildhoodViewV175 | null {
  const position = view.position + direction;
  if (position < 0 || position > ACTOR_END[trial] || view.passed ||
      trial === "track" && (view.track?.comparing || view.track?.phase === "perched")) return null;
  if (trial === "track") {
    const track = view.track!;
    const nextSign = CHILDHOOD_TRAIL_SIGNS_V175[track.signs];
    if (track.phase === "outward" && position > (nextSign?.x ?? 9)) return null;
    if (track.phase === "returning" && direction > 0) return null;
    return { ...view, position, message: track.phase === "returning" ? "Reviens par le chemin bas, en deçà de la borne."
      : position === 9 ? "Le dernier appel vient de la branche haute. Monte au perchoir." : "Lis les indices du passage." };
  }
  if (trial === "handoff") {
    const limit = view.stowed ? 7 : view.demonstrated ? 4 : 2;
    return position > limit ? null : { ...view, position, message: "Rejoins le prochain poste de la passation." };
  }
  if (trial === "beam") {
    const drift = position < 2 || position > 6 ? 0 : view.drift + (position % 3 === 0 ? -1 : 1);
    if (Math.abs(drift) > 1) return begin(view, trial, "Tu quittes la poutre. Reprends à son entrée, puis recentre tes appuis.");
    if (position === 7) return completeDrill(view, trial);
    return { ...view, position, drift, message: drift !== 0 ? "L’appui se déporte. Recentre-toi avant le prochain pas." : "Garde le pied sur la poutre." };
  }
  return { ...view, position, beat: (view.beat + 1) % 20, message: trial === "ring"
    ? "Observe le mouvement de l’anneau." : "Approche la cible par la ligne de frappe." };
}

function trackStep(view: ChildhoodViewV175, event: ChildhoodEvent): ChildhoodViewV175 | null {
  const track = view.track!;
  if (event === "show-map" || event === "show-passage") {
    if (track.phase !== "returning" || view.position !== 0) return null;
    return { ...view, trial: null, track: null, report: event === "show-map" ? "map" : "passage",
      message: event === "show-map" ? "Les trois indices et les deux chemins sont reportés sur la carte."
        : "Tu indiques au maître le perchoir et le dernier passage de la proie." };
  }
  const sign = CHILDHOOD_TRAIL_SIGNS_V175[track.signs];
  if (event === "use") {
    if (track.phase === "perched") return { ...view, position: 10, track: { ...track, phase: "returning" },
      message: "La proie broute en amont. Descends par le revers du perchoir." };
    if (track.phase !== "outward" || track.comparing) return null;
    if (view.position === 9 && !sign) return { ...view, position: 10, track: { ...track, phase: "perched" },
      message: "D’ici, tu observes la proie sans l’alerter. La borne indique la limite du territoire." };
    return sign && view.position === sign.x ? { ...view, track: { ...track, comparing: true },
      message: "Compare les deux traces avant de poursuivre." } : null;
  }
  if (!track.comparing || !sign) return null;
  if (event === "track-sign") return { ...view, track: { ...track, signs: track.signs + 1, comparing: false },
    message: "Indice confirmé. La petite proie est passée par ici." };
  if (event === "track-decoy") return { ...view, position: CHILDHOOD_TRAIL_SIGNS_V175[track.signs - 1]?.x ?? 0,
    track: { ...track, comparing: false }, message: "Cette piste s’efface. Repars du dernier indice confirmé." };
  return null;
}

function advance(view: ChildhoodViewV175, event: ChildhoodEvent): ChildhoodViewV175 | null {
  const trial = view.trial;
  if (!trial) {
    if (event === "ring" || event === "beam" || event === "spring") {
      return view.finished.includes(event) ? null : begin({ ...view, companion: COMPANIONS[view.finished.length] },
        event, CHILDHOOD_DRILLS_V175[event].companionHint);
    }
    if (event === "track" && view.finished.length === 3 && view.report === null) {
      return begin({ ...view, track: { phase: "outward", signs: 0, comparing: false } }, "track",
        "Entre dans la réserve et suis les indices. Reste en deçà de la borne.");
    }
    if (event === "handoff" && view.report && !view.passed) return begin(view, "handoff", "Saar t’attend devant le poste de démonstration.");
    return null;
  }
  if (event === "east" || event === "west") return move(view, trial, event === "east" ? 1 : -1);
  if (trial === "track") return trackStep(view, event);
  if (trial === "handoff") {
    if (event !== "use" || view.passed) return null;
    if (view.position === 2 && !view.demonstrated) return { ...view, demonstrated: true, message: "Tu montres ton appui et Saar le reprend." };
    if (view.position === 4 && view.demonstrated && !view.stowed) return { ...view, stowed: true, message: "L’outil d’enfance est rangé dans son coffre." };
    if (view.position === 7 && view.stowed) return { ...view, passed: true, message: "Saar t’accompagne de l’autre côté du râtelier." };
    return null;
  }
  if (event === "observe" && trial !== "beam") return { ...view, beat: (view.beat + 1) % 20,
    message: trial === "ring" ? "L’anneau poursuit son oscillation." : "Le ressort change de position au battement suivant." };
  if (event !== "use") return null;
  if (trial === "beam") return view.drift === 0 ? null : { ...view, drift: 0, message: "Appuis recentrés." };
  if (trial === "ring") {
    if (view.position !== 3 && view.position !== 4) return null;
    return view.position === childhoodRingPositionV175(view.beat) ? completeDrill(view, trial)
      : begin(view, trial, "L’anneau glisse hors de portée. Reprends à l’entrée de cet atelier.");
  }
  if (view.position !== 5) return null;
  return childhoodSpringOpenV175(view.beat) ? completeDrill(view, trial)
    : { ...view, position: 3, message: "La cible résiste. Reviens à la ligne après un battement." };
}

function markCheckpoint(before: ChildhoodViewV175, after: ChildhoodViewV175) {
  return before.trial !== after.trial || before.track?.phase !== after.track?.phase || before.track?.signs !== after.track?.signs
    || before.demonstrated !== after.demonstrated || before.stowed !== after.stowed || before.passed !== after.passed;
}

// Equivalent positions and trial states need only one history. A player can
// retry indefinitely without filling the journal or losing a completed drill.
function stateKey(view: ChildhoodViewV175) {
  return JSON.stringify([view.trial, view.position, view.beat, view.drift, view.finished, view.companion,
    view.track, view.report, view.demonstrated, view.stowed, view.passed]);
}

function inspect(raw: unknown) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const { version, ownerCreatedAt, revision, journal } = raw as Record<string, unknown>;
  if (version !== 1 || typeof ownerCreatedAt !== "string" || !Number.isFinite(Date.parse(ownerCreatedAt)) ||
      typeof revision !== "number" || !Number.isSafeInteger(revision) || revision < 1 ||
      !Array.isArray(journal) || journal.length === 0 || journal.length > JOURNAL_LIMIT || revision < journal.length) return null;
  let view = initial();
  let recovery: ChildhoodEvent[] = [];
  const verified: ChildhoodEvent[] = [];
  const visited = new Map([[stateKey(view), 0]]);
  for (const event of journal) {
    if (!vocabulary.includes(event) || event === "reset-current") return null;
    const next = advance(view, event);
    if (!next) return null;
    verified.push(event);
    const key = stateKey(next);
    if (!visited.has(key)) visited.set(key, verified.length);
    if (markCheckpoint(view, next)) recovery = verified.slice();
    view = next;
  }
  return { ledger: { version, ownerCreatedAt, revision, journal: verified } as ChildhoodLedgerV175, view, recovery, visited };
}
export function normalizeChildhoodV175(raw: unknown) {
  return inspect(raw)?.ledger ?? null;
}
export function childhoodViewV175(raw: unknown, ownerCreatedAt: string) {
  const trial = inspect(raw);
  return raw == null ? initial() : trial?.ledger.ownerCreatedAt === ownerCreatedAt ? trial.view : null;
}
export function hasChildhoodFoundationV175(save: ChildhoodSave) {
  const errand = save.homeworld.youthCityErrandV172;
  return save.prologue?.status === "completed" && save.prologue.checkpoint.cohortV172?.steps === 7 &&
    errand?.ownerCreatedAt === save.createdAt && !nextYouthCityStopV172(errand);
}

export function childhoodOptionsV175(view: ChildhoodViewV175) {
  return vocabulary.filter(event => event === "reset-current" ? !!view.trial && !view.passed : advance(view, event) !== null);
}
function selectJournal(result: ReturnType<typeof inspect>, event: ChildhoodCommandV175, next: ChildhoodViewV175) {
  if (event === "reset-current") return result!.recovery;
  const previous = result?.ledger.journal ?? [];
  const equivalent = result?.visited.get(stateKey(next));
  return equivalent !== undefined && equivalent > 0 ? previous.slice(0, equivalent) : [...previous, event];
}

export function actChildhoodV175(save: ChildhoodSave, raw: unknown, event: ChildhoodCommandV175, place: ChildhoodPlace) {
  const result = inspect(raw);
  if (!hasChildhoodFoundationV175(save) || place.suspended ||
      place.roomId !== CHILDHOOD_POST_V175.roomId || place.pointId !== CHILDHOOD_POST_V175.pointId) {
    return { message: "Remets la pièce, relève les repères de Saar puis retrouve le maître aux terrasses." };
  }
  if (raw != null && (!result || result.ledger.ownerCreatedAt !== save.createdAt)) {
    return { message: "Ce carnet d’exercice appartient à une autre jeunesse." };
  }
  const revision = (result?.ledger.revision ?? 0) + 1;
  if (event === "reset-current") {
    if (!result?.view.trial || result.view.passed || result.ledger.journal.length === result.recovery.length) {
      return { message: "Tu te trouves déjà au dernier repère de cet atelier." };
    }
    return { state: { ...result.ledger, revision, journal: result.recovery },
      message: "Dernier repère repris. Les gestes et indices reconnus sont conservés." };
  }
  const next = advance(result?.view ?? initial(), event);
  if (!next) return { message: "Rejoins le poste de ce geste." };
  const journal = selectJournal(result, event, next);
  if (journal.length > JOURNAL_LIMIT) return { message: "Reprends au dernier repère pour continuer." };
  return { state: { version: 1, ownerCreatedAt: save.createdAt, revision, journal } satisfies ChildhoodLedgerV175, message: next.message };
}

export function isChildhoodSuccessorV175(prior: ChildhoodLedgerV175 | undefined, next: ChildhoodLedgerV175 | undefined) {
  if (!next || next.revision !== (prior?.revision ?? 0) + 1) return false;
  if (!prior) return next.journal.length === 1;
  if (prior.ownerCreatedAt !== next.ownerCreatedAt) return false;
  const checked = inspect(prior);
  if (!checked) return false;
  return childhoodOptionsV175(checked.view).some(event => {
    const view = event === "reset-current" ? checked.view : advance(checked.view, event);
    if (!view) return false;
    const expected = selectJournal(checked, event, view);
    return expected.length === next.journal.length && expected.every((entry, i) => entry === next.journal[i]);
  });
}
