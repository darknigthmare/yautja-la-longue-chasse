import type { SaveGame } from "../types";
import { youthCityAdmissionReadyM003 } from "./youthCityErrandV172";
import type { YouthWorkshopOpeningV176 } from "./youthWorkshopV174";

export const CHILDHOOD_LEDGER_VERSION_V175 = 4;
export const CHILDHOOD_RACK_ACCESS_M006 = "campaign.r2-m006.rack-access";
export const CHILDHOOD_POST_V175 = { roomId: "training-hall", pointId: "training-service" } as const;
export const CHILDHOOD_DRILLS_V175 = {
  ring: { title: "Prise de l’anneau", companionHint: "L’anneau traverse les deux dalles. Attrape-le lorsqu’il est à portée.",
    presentation: "attend le retour de l’anneau, le saisit à portée puis le laisse repartir" },
  beam: { title: "Appuis sur la poutre", companionHint: "Avance jusqu’au bout. Recentre tes appuis quand la poutre te déporte.",
    presentation: "fléchit les genoux et recentre son appui quand la poutre bascule" },
  spring: { title: "Lecture de la cible", companionHint: "Rejoins la ligne de frappe. Observe un battement puis attends l’ouverture.",
    presentation: "garde les lames au repos jusqu’à l’ouverture de la cible, puis frappe" },
} as const;
export function childhoodRingPositionV175(beat: number) { return beat % 4 < 2 ? 3 : 4; }
export function childhoodSpringOpenV175(beat: number) { return beat % 5 === 2 || beat % 5 === 3; }

const COMPANIONS = ["Yena", "Harek", "Tov"] as const;
const DRILL_ORDER = ["ring", "beam", "spring"] as const;
const JOURNAL_LIMIT = 384;
const GATE_POSITION = 7;
const RACK_POSITION = 8;
const ACTOR_END = { ring: 5, beam: 7, spring: 6, track: 10, handoff: RACK_POSITION } as const;
export const CHILDHOOD_TRAIL_SIGNS_V175 = [
  { x: 3, name: "Empreintes", actual: "Deux traces légères s’enfoncent en direction du bois.", decoy: "Les grandes marques sèches traversent la piste." },
  { x: 6, name: "Branches", actual: "Un rameau bas vient de plier du côté du bosquet.", decoy: "Le haut de la souche est cassé depuis longtemps." },
  { x: 8, name: "Sons", actual: "Un bref appel se répète au pied du perchoir.", decoy: "L’écho vient du mur à gauche, au-delà de la borne." },
] as const;
const vocabulary = ["ring", "beam", "spring", "track", "east", "west", "observe", "use", "track-sign",
  "track-decoy", "show-map", "show-passage", "handoff", "cohort-gesture", "cohort-stow",
  "accept-rack-access", "first-mask", "first-blades", "reset-current"] as const;
export type ChildhoodCommandV175 = typeof vocabulary[number];
export type ChildhoodCueV175 = "ceremony-rack" | "objective";
type ChildhoodEvent = Exclude<ChildhoodCommandV175, "reset-current"> | "begin-ceremony" | "begin-rack-admission";
type Drill = keyof typeof CHILDHOOD_DRILLS_V175;
type Trial = keyof typeof ACTOR_END;
type TrackPhase = "outward" | "perched" | "returning";
export type ChildhoodLedgerV175 = { version: 1 | 2 | 3 | 4; ownerCreatedAt: string; revision: number; journal: ChildhoodEvent[] };
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
  cohortPresentations: number;
  cohortStowed: number;
  ceremony: boolean;
  stowed: boolean;
  passed: boolean;
  rackAccess: "pending" | "received" | null;
  firstWorkshop: YouthWorkshopOpeningV176 | null;
  message: string;
};
type ChildhoodSave = Pick<SaveGame, "createdAt" | "homeworld" | "prologue">;
type ChildhoodPlace = { roomId: string | null; pointId: string | null; suspended: boolean };
const initial = (): ChildhoodViewV175 => ({
  trial: null, position: 0, beat: 0, drift: 0, finished: [], companion: null, track: null,
  report: null, demonstrated: false, cohortPresentations: 0, cohortStowed: 0, ceremony: false,
  stowed: false, passed: false, rackAccess: null, firstWorkshop: null,
  message: "Choisis le premier atelier. Son camarade t’attendra à l’entrée.",
});

function cohortGestureAt(view: ChildhoodViewV175, index: number) {
  const name = COMPANIONS[index];
  const drill = view.finished[index];
  return name && drill ? { name, drill } : null;
}

export function nextCohortGestureV175(view: ChildhoodViewV175) {
  return cohortGestureAt(view, view.cohortPresentations);
}

export function nextCohortStowV175(view: ChildhoodViewV175) {
  if (!view.ceremony || view.cohortStowed >= view.cohortPresentations) return null;
  return cohortGestureAt(view, view.cohortStowed);
}

function ceremonyReady(view: ChildhoodViewV175) {
  return !view.ceremony || view.cohortStowed === COMPANIONS.length;
}

function ledgerVersion(view: ChildhoodViewV175): ChildhoodLedgerV175["version"] {
  return view.rackAccess ? CHILDHOOD_LEDGER_VERSION_V175
    : view.ceremony ? 3 : view.cohortPresentations > 0 ? 2 : 1;
}

function journeyEvent(event: Exclude<ChildhoodCommandV175, "reset-current">, trainingStarted: boolean): ChildhoodEvent {
  return event === "handoff" && !trainingStarted ? "begin-rack-admission" : event;
}

export function childhoodTrackSignV175(view: ChildhoodViewV175) {
  return view.track ? CHILDHOOD_TRAIL_SIGNS_V175[view.track.signs] : undefined;
}
export function childhoodLengthV175(view: ChildhoodViewV175) {
  return view.trial === "handoff" && !view.ceremony ? GATE_POSITION + 1 : view.trial ? ACTOR_END[view.trial] + 1 : 0;
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
    const limit = view.stowed ? GATE_POSITION : view.demonstrated && ceremonyReady(view) ? 4 : 2;
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
    if ((event === "handoff" || event === "begin-ceremony" || event === "begin-rack-admission") && view.report && !view.passed) {
      return begin({ ...view, ceremony: event !== "handoff", rackAccess: event === "begin-rack-admission" ? "pending" : null },
        "handoff", "Saar t’attend devant le poste de démonstration.");
    }
    return null;
  }
  if (trial === "handoff" && view.passed) {
    if (view.rackAccess === "pending") {
      if (event !== "accept-rack-access" || view.position !== RACK_POSITION) return null;
      return { ...view, rackAccess: "received",
        message: "Saar te remet la plaque d’admission. Les gestes de ta cohorte ouvrent l’accès aux ateliers Unblooded." };
    }
    if (view.firstWorkshop || view.position !== (view.ceremony ? RACK_POSITION : GATE_POSITION) ||
        (event !== "first-mask" && event !== "first-blades")) return null;
    const firstWorkshop = event === "first-mask" ? "mask" : "blades";
    return { ...view, firstWorkshop, message: firstWorkshop === "mask"
      ? "Le masque t’attend au premier atelier des baraquements."
      : "Les lames t’attendent au premier atelier des baraquements." };
  }
  if (event === "east" || event === "west") return move(view, trial, event === "east" ? 1 : -1);
  if (trial === "track") return trackStep(view, event);
  if (trial === "handoff") {
    if (event === "cohort-gesture") {
      const performer = nextCohortGestureV175(view);
      if (!performer || !view.demonstrated || view.stowed || view.position !== 2 || nextCohortStowV175(view)) return null;
      return { ...view, cohortPresentations: view.cohortPresentations + 1,
        message: performer.name + " " + CHILDHOOD_DRILLS_V175[performer.drill].presentation + "." };
    }
    if (event === "cohort-stow") {
      const companion = nextCohortStowV175(view);
      if (!companion || view.position !== 2) return null;
      const cohortStowed = view.cohortStowed + 1;
      return { ...view, cohortStowed, message: companion.name + " dépose son outil dans le coffre. " +
        (cohortStowed === COMPANIONS.length ? "Saar t’invite à y ranger le tien." : "Le jeune suivant approche du poste.") };
    }
    if (event !== "use") return null;
    if (view.position === 2 && !view.demonstrated) return { ...view, demonstrated: true,
      message: view.ceremony ? "Tu montres ton appui à Saar. Reste au poste pour la passation des trois camarades."
        : "Tu montres ton appui et Saar le reprend." };
    if (view.position === 4 && view.demonstrated && ceremonyReady(view) && !view.stowed) return { ...view, stowed: true,
      message: view.ceremony ? "Tu ranges l’outil d’enfance. Saar déverrouille la porte du râtelier."
        : "L’outil d’enfance est rangé dans son coffre." };
    if (view.position === GATE_POSITION && view.stowed) return { ...view, passed: true,
      position: view.ceremony ? RACK_POSITION : GATE_POSITION,
      message: view.rackAccess === "pending" ? "Saar te rejoint derrière le râtelier. Reçois la plaque qui ouvre les ateliers."
        : view.ceremony ? "Saar te rejoint de l’autre côté de la porte. La cohorte a accès aux ateliers Unblooded."
        : "Saar franchit le râtelier avec toi et te laisse choisir ton premier atelier." };
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
    || before.cohortPresentations !== after.cohortPresentations || before.cohortStowed !== after.cohortStowed
    || before.demonstrated !== after.demonstrated || before.stowed !== after.stowed || before.passed !== after.passed
    || before.rackAccess !== after.rackAccess;
}

// Equivalent positions and trial states need only one history. A player can
// retry indefinitely without filling the journal or losing a completed drill.
function stateKey(view: ChildhoodViewV175) {
  return JSON.stringify([view.trial, view.position, view.beat, view.drift, view.finished, view.companion,
    view.track, view.report, view.demonstrated, view.ceremony, view.cohortPresentations, view.cohortStowed,
    view.stowed, view.passed, view.rackAccess, view.firstWorkshop]);
}

function inspect(raw: unknown) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const { version, ownerCreatedAt, revision, journal } = raw as Record<string, unknown>;
  if ((version !== 1 && version !== 2 && version !== 3 && version !== CHILDHOOD_LEDGER_VERSION_V175) ||
      typeof ownerCreatedAt !== "string" || !Number.isFinite(Date.parse(ownerCreatedAt)) ||
      typeof revision !== "number" || !Number.isSafeInteger(revision) || revision < 1 ||
      !Array.isArray(journal) || journal.length === 0 || journal.length > JOURNAL_LIMIT || revision < journal.length) return null;
  let view = initial();
  let recovery: ChildhoodEvent[] = [];
  const verified: ChildhoodEvent[] = [];
  const visited = new Map([[stateKey(view), 0]]);
  for (const event of journal) {
    if (event !== "begin-ceremony" && event !== "begin-rack-admission" &&
        (!vocabulary.includes(event) || event === "reset-current")) return null;
    const next = advance(view, event);
    if (!next) return null;
    verified.push(event);
    const key = stateKey(next);
    if (!visited.has(key)) visited.set(key, verified.length);
    if (markCheckpoint(view, next)) recovery = verified.slice();
    view = next;
  }
  if (version !== ledgerVersion(view)) return null;
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
    errand?.ownerCreatedAt === save.createdAt && youthCityAdmissionReadyM003(errand);
}

export function childhoodRackReceiptV175(view: ChildhoodViewV175) {
  if (view.rackAccess !== "received") return null;
  return { sourceId: CHILDHOOD_RACK_ACCESS_M006, instructor: "Saar", gestures: view.cohortPresentations, tools: view.cohortStowed + Number(view.stowed) } as const;
}

export function canEnterYouthAfterChildhoodV175(
  save: ChildhoodSave & Pick<SaveGame, "youthTraining">,
  view = childhoodViewV175(save.homeworld.childhoodV175, save.createdAt),
) {
  if (save.youthTraining) return true;
  if (!view || (save.prologue?.ceremonyM006 && !view.ceremony)) return false;
  if (view.passed) return view.rackAccess !== "pending" && view.firstWorkshop !== null;
  return !view.ceremony;
}

export function childhoodCeremonyRequirementV175(view: ChildhoodViewV175) {
  if (view.trial === "handoff" || view.report) return null;
  return view.trial ?? DRILL_ORDER.find(drill => !view.finished.includes(drill)) ?? "track";
}

export function childhoodOptionsV175(view: ChildhoodViewV175) {
  return vocabulary.filter(event => {
    if (event === "reset-current") return !!view.trial && !view.passed;
    if (event === "handoff" && childhoodCeremonyRequirementV175(view)) return true;
    return advance(view, event) !== null;
  });
}
function selectJournal(result: ReturnType<typeof inspect>, event: ChildhoodEvent | "reset-current", next: ChildhoodViewV175) {
  if (event === "reset-current") return result!.recovery;
  const previous = result?.ledger.journal ?? [];
  const equivalent = result?.visited.get(stateKey(next));
  return equivalent !== undefined && equivalent > 0 ? previous.slice(0, equivalent) : [...previous, event];
}

export function actChildhoodV175(
  save: ChildhoodSave & Pick<SaveGame, "youthTraining">, raw: unknown, event: ChildhoodCommandV175, place: ChildhoodPlace,
) {
  const result = inspect(raw);
  if (!hasChildhoodFoundationV175(save) || place.suspended ||
      place.roomId !== CHILDHOOD_POST_V175.roomId || place.pointId !== CHILDHOOD_POST_V175.pointId) {
    return { message: "Remets la pièce, relève les repères de Saar puis retrouve le maître aux terrasses." };
  }
  if (raw != null && (!result || result.ledger.ownerCreatedAt !== save.createdAt)) {
    return { message: "Ce carnet d’exercice appartient à une autre jeunesse." };
  }
  if (event === "accept-rack-access" && !save.prologue?.chronicle.rites.some(rite =>
    rite.id === "nursery-recognition" && rite.sourceId === "chronicle.rite.nursery")) {
    return { message: "Saar attend la reconnaissance inscrite lors de l’audience." };
  }
  if ((event === "first-mask" || event === "first-blades") && save.youthTraining) {
    return { message: "Ton ordre de formation est déjà établi." };
  }
  const revision = (result?.ledger.revision ?? 0) + 1;
  if (event === "reset-current") {
    if (!result?.view.trial || result.view.passed || result.ledger.journal.length === result.recovery.length) {
      return { message: "Tu te trouves déjà au dernier repère de cet atelier." };
    }
    return { state: { ...result.ledger, revision, journal: result.recovery },
      message: "Dernier repère repris. Les gestes et indices reconnus sont conservés." };
  }
  const view = result?.view ?? initial();
  const required = event === "handoff" ? childhoodCeremonyRequirementV175(view) : null;
  if (required && view.trial) {
    return { message: "Saar attend la fin de l’exercice. Reprends à ta position actuelle. " + view.message };
  }
  const recordedEvent = required ?? journeyEvent(event, !!save.youthTraining);
  const next = advance(view, recordedEvent);
  if (!next) return { message: "Rejoins le poste de ce geste." };
  const journal = selectJournal(result, recordedEvent, next);
  if (journal.length > JOURNAL_LIMIT) return { message: "Reprends au dernier repère pour continuer." };
  const cue: ChildhoodCueV175 | undefined = !next.ceremony ? undefined
    : next.stowed && !view.stowed ? "ceremony-rack"
    : (next.rackAccess === "received" && view.rackAccess !== "received") || (!next.rackAccess && next.passed && !view.passed)
      ? "objective" : undefined;
  return { state: { version: ledgerVersion(next), ownerCreatedAt: save.createdAt, revision, journal } satisfies ChildhoodLedgerV175, cue,
    message: required ? "Saar reporte la passation le temps de cet exercice. " + next.message : next.message };
}

export function isChildhoodSuccessorV175(
  prior: ChildhoodLedgerV175 | undefined, next: ChildhoodLedgerV175 | undefined, trainingStarted: boolean,
) {
  if (!next || next.revision !== (prior?.revision ?? 0) + 1) return false;
  if (!prior) return next.version === 1 && next.journal.length === 1;
  if (prior.ownerCreatedAt !== next.ownerCreatedAt) return false;
  const checked = inspect(prior);
  if (!checked) return false;
  return childhoodOptionsV175(checked.view).some(command => {
    const event = command === "reset-current" ? command : journeyEvent(command, trainingStarted);
    const view = event === "reset-current" ? checked.view : advance(checked.view, event);
    if (!view) return false;
    const expected = selectJournal(checked, event, view);
    return next.version === ledgerVersion(view) && expected.length === next.journal.length &&
      expected.every((entry, i) => entry === next.journal[i]);
  });
}
