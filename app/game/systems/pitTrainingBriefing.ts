import type { PitCombatState } from "./pitCombat";
import { createPitTrainingClock, advancePitTrainingClock, type PitTrainingClock } from "./pitTrainingClock";
import { preparePitTrainingLesson, type PitTrainingLesson, type PitTrainingLessonId } from "./pitTrainingLessons";

export const PIT_TRAINING_BRIEFING_TIMEOUT_MS = 15_000;
export type PitTrainingAssetState = "loading" | "ready" | "failed";
export interface PitTrainingBriefingReadiness {
  readonly status: "loading" | "ready" | "degraded";
  readonly canBegin: boolean;
  readonly message: string;
}

/** A settled image failure is disclosed; it neither fabricates art nor blocks training forever. */
export function getPitTrainingBriefingReadiness(
  fighterStates: readonly [PitTrainingAssetState, PitTrainingAssetState],
  arenaState: PitTrainingAssetState,
  timedOut = false,
): PitTrainingBriefingReadiness {
  const states = [...fighterStates, arenaState];
  if (states.includes("loading") && !timedOut) {
    return { status: "loading", canBegin: false, message: "Chargement des visuels : le mannequin et le chronomètre restent arrêtés." };
  }
  if (states.some(state => state !== "ready")) {
    return { status: "degraded", canBegin: true, message: "Certains visuels sont indisponibles ou leur chargement a dépassé le délai. Vous pouvez commencer avec les visuels disponibles ; les animations manquantes ne sont pas remplacées par de nouvelles animations." };
  }
  return { status: "ready", canBegin: true, message: "Visuels chargés. Lisez les consignes, puis commencez quand vous êtes prêt." };
}

/** Preparing/retrying a lesson always creates a fresh frozen situation, never a running countdown. */
export function preparePitTrainingBriefing(current: PitCombatState, id: PitTrainingLessonId) {
  const prepared = preparePitTrainingLesson(current, id);
  return {
    ...prepared,
    lesson: { ...prepared.lesson, status: "briefing" as const },
    clock: createPitTrainingClock(true),
  };
}

/** A briefing consumes neither elapsed time nor queued manual ticks, even from a stale clock. */
export function advancePitTrainingSessionClock(clock: PitTrainingClock, elapsedMs: number, lesson: Pick<PitTrainingLesson, "status"> | null) {
  return lesson?.status === "briefing"
    ? { clock: createPitTrainingClock(true), ticks: 0 }
    : advancePitTrainingClock(clock, elapsedMs);
}

/** Explicit, idempotent start; unrelated/stale or already played situations cannot be restarted here. */
export function beginPitTrainingBriefing(
  current: PitCombatState,
  lesson: PitTrainingLesson,
  readiness: Pick<PitTrainingBriefingReadiness, "status" | "canBegin">,
): { lesson: PitTrainingLesson; clock: ReturnType<typeof createPitTrainingClock> } | null {
  if (!readiness.canBegin || readiness.status === "loading" || lesson.status !== "briefing" ||
    current.rules.mode !== "training" || current.frame !== 0 || lesson.observedFrame !== 0 ||
    lesson.elapsedTicks !== 0 || lesson.progress !== 0) return null;
  return { lesson: { ...lesson, status: "running" }, clock: createPitTrainingClock() };
}

type BriefingKeys = Readonly<Record<"guardLow" | "heavy" | "right" | "left" | "throw" | "resource" | "light" | "medium", string>>;
/** Labels come from the active keyboard profile; gamepad and touch describe the real controls. */
export function getPitTrainingBriefingControls(id: PitTrainingLessonId, keys: BriefingKeys): string {
  switch (id) {
    case "guard-low": return `${keys.guardLow} / LT / GARDE ↓ : maintenir la garde basse.`;
    case "anti-air": return `${keys.heavy} / B / L : anticiper le saut avec une frappe lourde.`;
    case "corner-escape": return `${keys.heavy} / B / L : repousser ; ${keys.right} / stick ou croix à droite / ▶ : revenir au centre.`;
    case "throw-tech": return `${keys.throw} / RT / PROJ. : relâcher, puis nouvel appui après la saisie.`;
    case "traque": return `${keys.resource} / Select / TRAQUE : camouflage ; ${keys.left}/${keys.right} / stick ou croix / ◀ ▶ : approcher ; ${keys.light}/${keys.medium}/${keys.heavy} / X Y B / R M L : frapper.`;
  }
}
