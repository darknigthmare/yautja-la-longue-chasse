export const NURSERY_COHORT_STOPS = [
  { x: 162, label: "Outil", prompt: "Récupérer l’outil", reply: "L’outil d’exercice est en main. Tu pourras le rendre au râtelier." },
  { x: 278, label: "Barrière", prompt: "Fermer la barrière", reply: "La petite barrière tient. Les jeunes peuvent s’approcher du filet." },
  { x: 394, label: "Harek", prompt: "Observer Harek", reply: "Harek éprouve le loquet des deux mains. « J’aurais dû vérifier l’appui avant de forcer. »" },
  { x: 510, label: "Yena", prompt: "Rejoindre Yena", reply: "Yena remet les cordes en ordre. « Laisse du jeu à gauche, je pourrai détendre le filet. »" },
  { x: 626, label: "Tov", prompt: "Écouter Tov", reply: "Tov cale la caisse du pied pour dégager l’allée. « J’ai entendu le choc. Après, je ne trouvais plus la sortie. »" },
  { x: 741, label: "Saar", prompt: "Faire le point avec Saar", reply: "Saar vérifie les appuis de chacun. « La tension fausse le geste. Regarde qui tient la sortie avant de reprendre. »" },
  { x: 857, label: "Sortie", prompt: "Rendre l’outil et rejoindre le passage", reply: "" },
] as const;

export const NURSERY_COHORT_RADIUS = 39;
const LEFT_BOUND = 96;
const RIGHT_BOUND = 864;
type CohortProgress = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;
export type NurseryCohortChoice = "review" | "help";
export const NURSERY_COHORT_CHOICES = {
  review: { x: NURSERY_COHORT_STOPS[2].x, label: "Revoir le mouvement avec Harek", reply: "Harek reprend le mouvement à côté de toi et confirme le nouvel appui." },
  help: { x: NURSERY_COHORT_STOPS[3].x, label: "Aider Yena à ranger les cordes", reply: "Yena te confie le dernier tour de corde. Vous remettez le filet ensemble." },
} as const;

export interface NurseryCohortProgress {
  version: 1;
  x: number;
  facing: -1 | 1;
  steps: CohortProgress;
  choice: NurseryCohortChoice | null;
}

export function createNurseryCohort(): NurseryCohortProgress {
  return { version: 1, x: 106, facing: 1, steps: 0, choice: null };
}

export function normalizeNurseryCohort(value: unknown): NurseryCohortProgress | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const { version, x, facing, steps, choice } = value as Partial<NurseryCohortProgress>;
  if (version !== 1 || typeof x !== "number" || !Number.isInteger(x) || x < LEFT_BOUND || x > RIGHT_BOUND ||
      (facing !== -1 && facing !== 1) || typeof steps !== "number" || !Number.isInteger(steps) || steps < 0 || steps > 7 ||
      (choice !== null && choice !== "review" && choice !== "help") || (choice !== null && steps < 6)) return null;
  if (steps === 7 && Math.abs(x - NURSERY_COHORT_STOPS[6].x) > NURSERY_COHORT_RADIUS) return null;
  return { version, x, facing, steps, choice };
}

export function nurseryCohortInteraction(state: NurseryCohortProgress) {
  const near = (x: number) => Math.abs(state.x - x) <= NURSERY_COHORT_RADIUS;
  if (state.steps === 7) return null;
  const stop = NURSERY_COHORT_STOPS[state.steps];
  if (stop && near(stop.x)) return { kind: "required", label: stop.prompt } as const;
  if (state.steps !== 6 || state.choice) return null;
  if (near(NURSERY_COHORT_CHOICES.review.x)) return { kind: "review", label: NURSERY_COHORT_CHOICES.review.label } as const;
  if (near(NURSERY_COHORT_CHOICES.help.x)) return { kind: "help", label: NURSERY_COHORT_CHOICES.help.label } as const;
  return null;
}

export function stepNurseryCohort(previous: NurseryCohortProgress, move: -1 | 0 | 1, interact: boolean): NurseryCohortProgress {
  if (previous.steps === 7) return previous;
  if (interact) {
    const interaction = nurseryCohortInteraction(previous);
    if (interaction?.kind === "required") return { ...previous, steps: (previous.steps + 1) as CohortProgress };
    if (interaction) return { ...previous, choice: interaction.kind };
  }
  if (!move) return previous;
  return { ...previous, x: Math.max(LEFT_BOUND, Math.min(RIGHT_BOUND, previous.x + move * 3)), facing: move };
}
