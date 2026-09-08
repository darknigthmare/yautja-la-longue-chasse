import {
  createPitCombatState, PIT_ARENAS, PIT_CLOAK_COST, PIT_FIGHTERS, PIT_TICK_RATE,
  type PitCombatState, type PitInput,
} from "./pitCombat";

export const PIT_TRAINING_LESSONS = [
  { id: "guard-low", label: "Garde basse", objective: "Bloquer trois attaques basses sans encaisser de coup.", hint: "Maintenez la garde basse. La garde haute ne protège pas de cette attaque basse." },
  { id: "anti-air", label: "Anti-air", objective: "Intercepter trois sauts avec une frappe lourde anti-air.", hint: "Anticipez le décollage du mannequin avec la frappe lourde. Un coup au sol ne compte pas." },
  { id: "corner-escape", label: "Sortie du coin", objective: "Repousser le mannequin et retrouver le contrôle hors du coin sans être touché.", hint: "Créez de l’espace avec vos frappes lourdes, avancez vers le centre entre les coups, puis retrouvez une posture neutre." },
  { id: "traque", label: "Utiliser la Traque", objective: "Activer le camouflage, l’interrompre par une attaque et toucher.", hint: "350 points fournis pour cet exercice. Activez Traque au sol, sans garde ni autre action, puis approchez et frappez." },
] as const;

export type PitTrainingLessonId = (typeof PIT_TRAINING_LESSONS)[number]["id"];
export interface PitTrainingLesson {
  readonly id: PitTrainingLessonId;
  readonly status: "running" | "success" | "failed";
  readonly progress: number;
  readonly target: number;
  readonly elapsedTicks: number;
  readonly observedFrame: number;
  readonly openingCreated: boolean;
  readonly message: string;
}
export const PIT_TRAINING_LESSON_LIMIT = PIT_TICK_RATE * 30;

/** Dedicated situations are transient training state, never replay seeds or campaign rewards. */
export function preparePitTrainingLesson(current: PitCombatState, id: PitTrainingLessonId) {
  if (current.rules.mode !== "training" || !PIT_TRAINING_LESSONS.some((lesson) => lesson.id === id)) {
    throw new Error("A guided lesson requires a valid training session.");
  }
  const playerId = current.fighters[0].definitionId;
  const dummyId = playerId === "jungle-hunter" ? "city-hunter" : "jungle-hunter";
  const state = createPitCombatState(playerId, dummyId, {
    mode: "training", arenaId: current.arenaId,
  });
  const arena = PIT_ARENAS[state.arenaId];
  const left = state.fighters[0];
  const right = state.fighters[1];
  left.x = id === "corner-escape" ? arena.leftWall + PIT_FIGHTERS[left.definitionId].bodyWidth / 2 + 4 : 380;
  right.x = left.x + (id === "guard-low" ? 115 : id === "corner-escape" ? 95 : 78);
  if (id === "traque") left.traque = PIT_CLOAK_COST;
  const lesson: PitTrainingLesson = {
    id, status: "running", progress: 0, target: id === "corner-escape" ? 15 : 3,
    elapsedTicks: 0, observedFrame: state.frame, openingCreated: false,
    message: PIT_TRAINING_LESSONS.find((definition) => definition.id === id)!.hint,
  };
  return { state, lesson };
}

/** Authored CPU reads the previous world and lesson clock only, never live player input. */
export function resolvePitTrainingLessonInput(lesson: PitTrainingLesson, state: PitCombatState): PitInput {
  if (lesson.status !== "running" || state.rules.mode !== "training") return {};
  const player = state.fighters[0];
  const dummy = state.fighters[1];
  const distance = player.x - dummy.x;
  const toward = distance < 0 ? { left: true } : { right: true };
  const tick = lesson.elapsedTicks;
  if (lesson.id === "guard-low") {
    if (Math.abs(distance) > 120 && dummy.phase === "idle") return toward;
    return tick % 150 === 30 ? { attack: "technique" } : {};
  }
  if (lesson.id === "anti-air") {
    if (dummy.grounded && Math.abs(distance) > 82 && dummy.phase === "idle") return toward;
    return tick % 120 === 30 ? { jump: true } : {};
  }
  if (lesson.id === "corner-escape") {
    // The dummy holds the exit and strikes on a readable 90-tick cadence.
    return tick % 90 === 30 ? { attack: "light" } : {};
  }
  return {};
}

/** Progress is derived from actual combat events/positions once per simulated tick. */
export function evaluatePitTrainingLesson(
  lesson: PitTrainingLesson,
  previous: PitCombatState,
  next: PitCombatState,
): PitTrainingLesson {
  if (lesson.status !== "running" || next.rules.mode !== "training" || previous.rules.mode !== "training" ||
    next.frame !== previous.frame + 1 || previous.frame !== lesson.observedFrame) return lesson;
  const player = next.fighters[0];
  const dummy = next.fighters[1];
  const elapsedTicks = lesson.elapsedTicks + 1;
  let progress = lesson.progress;
  const openingCreated = lesson.openingCreated || (lesson.id === "corner-escape" &&
    next.events.some((event) => event.type === "hit" && event.attackerId === player.definitionId &&
      dummy.health < previous.fighters[1].health));
  const playerHit = next.events.some((event) => event.type === "hit" &&
    event.defenderId === player.definitionId && player.health < previous.fighters[0].health);
  if ((lesson.id === "guard-low" || lesson.id === "corner-escape") && playerHit) {
    return { ...lesson, elapsedTicks, observedFrame: next.frame, status: "failed", message: "Coup reçu. Recommencez la situation et ajustez votre timing." };
  }
  if (lesson.id === "guard-low") {
    if (next.events.some((event) => event.type === "block" &&
      event.attackerId === dummy.definitionId && event.defenderId === player.definitionId &&
      PIT_FIGHTERS[dummy.definitionId].attacks[event.attack].hitLevel === "low") &&
      player.guard === "low") progress += 1;
  } else if (lesson.id === "anti-air") {
    if (next.events.some((event) => event.type === "hit" && event.attackerId === player.definitionId &&
      event.antiAir && dummy.health < previous.fighters[1].health)) progress += 1;
  } else if (lesson.id === "corner-escape") {
    const free = openingCreated && player.x >= PIT_ARENAS[next.arenaId].leftWall + 260 &&
      player.grounded && player.phase === "idle";
    progress = free ? progress + 1 : 0;
  } else {
    if (progress === 0 && next.events.some((event) => event.type === "cloak-start" && event.fighterId === player.definitionId)) progress = 1;
    if (progress === 1 && next.events.some((event) => event.type === "cloak-end" && event.fighterId === player.definitionId &&
      event.reason === "action") && next.events.some((event) => event.type === "attack-start" && event.fighterId === player.definitionId)) progress = 2;
    if (progress === 2 && next.events.some((event) => event.type === "hit" && event.attackerId === player.definitionId &&
      dummy.health < previous.fighters[1].health)) progress = 3;
  }
  const success = progress >= lesson.target;
  const failed = !success && elapsedTicks >= PIT_TRAINING_LESSON_LIMIT;
  return {
    ...lesson, progress: Math.min(progress, lesson.target), elapsedTicks, observedFrame: next.frame, openingCreated,
    status: success ? "success" : failed ? "failed" : "running",
    message: success ? "Exercice réussi dans la simulation. Aucune récompense ni statistique de campagne."
      : failed ? "Temps écoulé. Recommencez pour ajuster votre timing."
      : lesson.id === "traque" && progress > 0
        ? progress === 1 ? "Camouflage actif : interrompez-le avec une attaque, puis touchez le mannequin."
          : "Camouflage interrompu par l’attaque : touchez le mannequin pour terminer."
        : lesson.message,
  };
}
