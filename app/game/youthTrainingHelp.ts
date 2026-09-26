import { isYouthCagePhase } from "./systems/youthCage";
import { isYouthPatrolPhase } from "./systems/youthPatrol";
import type { YouthTouchAction } from "./systems/youthControls";
import type { YouthState } from "./systems/youthTraining";

/** Presentation only: never grants a weapon or changes the combat rules. */
export function youthActionUnavailableReason(state: Pick<YouthState, "phase" | "milestones">, action: YouthTouchAction): string | null {
  if (state.phase.startsWith("desert-") && ["light", "blade", "throw", "dodge"].includes(action)) return "Indisponible : cette reconnaissance se joue par déplacement, saut et observation.";
  if (isYouthPatrolPhase(state.phase) && ["light", "blade", "throw"].includes(action)) return "Indisponible : éviter l’animal sans l’attaquer.";
  if (isYouthPatrolPhase(state.phase) && state.phase !== "patrol-ambush" && action === "dodge") return "Disponible uniquement pendant les charges du brouteur.";
  if (action === "blade" && isYouthCagePhase(state.phase)) return "Interdite dans ce duel non létal de novices.";
  if (action === "blade" && state.milestones["youth-first-blade"] === undefined) return "Indisponible : la première lame n’a pas encore été reçue.";
  return null;
}

export function youthGamepadHelp(state: Pick<YouthState, "phase" | "milestones">): string {
  const common = "Manette : stick/croix déplacement · A saut · LB interaction · Menu pause.";
  if (state.phase.startsWith("desert-")) return `${common} Reconnaissance sans combat : observe les indices avec le maître.`;
  if (isYouthPatrolPhase(state.phase)) return `${common}${state.phase === "patrol-ambush" ? " B esquive." : ""} Poing, lame et projection désactivés pendant la patrouille : observe et évite les charges.`;
  if (isYouthCagePhase(state.phase)) return `${common} B esquive · X poing · RB projection. La lame est interdite dans la petite Fosse.`;
  if (state.milestones["youth-first-blade"] === undefined) return `${common} B esquive · X poing · RB projection. La lame sera disponible après sa remise par le maître.`;
  return `${common} B esquive · X poing · Y lame · RB projection.`;
}
