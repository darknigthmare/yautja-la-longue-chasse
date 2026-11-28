const PASSAGE_COUNT = 3;
const MOVES_PER_PASSAGE = 3;
const PROOF = /^[0-9a-f]{64}$/;

export const CAMPAIGN_COOP_PASSAGES = [
  { name: "Galerie des pistes", left: "Corniche", right: "Rigole", anchor: "Anneau du seuil", brace: "Traverse" },
  { name: "Balise basse", left: "Talus", right: "Dalles", anchor: "Anneau de la balise", brace: "Montant" },
  { name: "Passage de relève", left: "Rampe", right: "Perré", anchor: "Anneau de la sortie", brace: "Appui de rive" },
] as const;

type Move = "trace-left" | "trace-right" | "take-anchor" | "take-brace" | "advance";
type Step = "track" | "support" | "lead";

export interface CampaignCoopExercise {
  id: number;
  roster: string[];
  journal: { actor: string; move: Move }[];
  abandoned: boolean;
}

export type CampaignCoopExerciseCommand =
  | { type: "exercise-start"; roomId: string }
  | { type: "exercise-move"; roomId: string; exerciseId: number; passage: number; move: Move }
  | { type: "exercise-abandon"; roomId: string; exerciseId: number };

export type CampaignCoopExerciseFailure = "exercise" | "assignment" | "order" | "route" | "support";

export function campaignCoopExerciseComplete(exercise: CampaignCoopExercise): boolean {
  return exercise.journal.length === PASSAGE_COUNT * MOVES_PER_PASSAGE;
}

export function campaignCoopExerciseActive(exercise: CampaignCoopExercise): boolean {
  return !exercise.abandoned && !campaignCoopExerciseComplete(exercise);
}

export function campaignCoopExerciseView(exercise: CampaignCoopExercise) {
  const index = exercise.journal.length;
  const passage = Math.min(PASSAGE_COUNT - 1, Math.floor(index / MOVES_PER_PASSAGE));
  const step: Step = index % MOVES_PER_PASSAGE === 0 ? "track" : index % MOVES_PER_PASSAGE === 1 ? "support" : "lead";
  return {
    passage,
    step,
    station: CAMPAIGN_COOP_PASSAGES[passage],
    trackLeft: (exercise.id + passage) % 2 === 0,
    anchored: (exercise.id + passage * 2) % 3 !== 1,
    lead: exercise.roster[0],
    track: exercise.roster[1],
    support: exercise.roster[2] ?? exercise.roster[0],
  };
}

export function playCampaignCoopExercise(exercise: CampaignCoopExercise, actor: string, passage: number, move: Move):
  { ok: true; exercise: CampaignCoopExercise } | { ok: false; reason: CampaignCoopExerciseFailure } {
  if (!campaignCoopExerciseActive(exercise)) return { ok: false, reason: "exercise" };
  if (!exercise.roster.includes(actor)) return { ok: false, reason: "assignment" };
  const view = campaignCoopExerciseView(exercise);
  const step = move === "trace-left" || move === "trace-right" ? "track" :
    move === "take-anchor" || move === "take-brace" ? "support" : move === "advance" ? "lead" : null;
  if (step === null || passage !== view.passage || view.step !== step) return { ok: false, reason: "order" };
  if (actor !== view[step]) return { ok: false, reason: "assignment" };
  if (step === "track" && (move === "trace-left") !== view.trackLeft) return { ok: false, reason: "route" };
  if (step === "support" && (move === "take-anchor") !== view.anchored) return { ok: false, reason: "support" };
  return { ok: true, exercise: { ...exercise, journal: [...exercise.journal, { actor, move }] } };
}

export function validCampaignCoopExercise(raw: unknown): raw is CampaignCoopExercise {
  if (typeof raw !== "object" || !raw || Array.isArray(raw)) return false;
  const { id, roster, journal, abandoned } = raw as Partial<CampaignCoopExercise>;
  if (typeof id !== "number" || !Number.isSafeInteger(id) || id < 1 || typeof abandoned !== "boolean" ||
      !Array.isArray(roster) || roster.length < 2 || roster.length > 3 ||
      !roster.every(proof => typeof proof === "string" && PROOF.test(proof)) || new Set(roster).size !== roster.length ||
      !Array.isArray(journal) || journal.length > PASSAGE_COUNT * MOVES_PER_PASSAGE) return false;
  let replay: CampaignCoopExercise = { id, roster, journal: [], abandoned: false };
  for (const action of journal) {
    if (!action || typeof action !== "object") return false;
    const result = playCampaignCoopExercise(replay, action.actor, campaignCoopExerciseView(replay).passage, action.move);
    if (!result.ok) return false;
    replay = result.exercise;
  }
  return !abandoned || !campaignCoopExerciseComplete(replay);
}
