import type { MissionDefinition, MissionProgress } from "./types";

export const MISSION_MASTERY_SEAL_IDS = [
  "hunt-completed",
  "required-objectives",
  "grade-a",
  "under-par",
  "elite-difficulty",
] as const;

export type MissionMasterySealId = (typeof MISSION_MASTERY_SEAL_IDS)[number];

export interface MissionMasterySeal {
  id: MissionMasterySealId;
  label: string;
  earned: boolean;
}

export interface MissionMasterySnapshot {
  seals: MissionMasterySeal[];
  count: number;
  total: number;
  ratio: number;
  mastered: boolean;
}

const SEAL_LABELS: Record<MissionMasterySealId, string> = {
  "hunt-completed": "Chasse terminée",
  "required-objectives": "Objectifs requis consignés",
  "grade-a": "Grade A",
  "under-par": "Temps au par ou mieux",
  "elite-difficulty": "Difficulté Elite ou Elder",
};

export const MISSION_MASTERY_TOTAL = MISSION_MASTERY_SEAL_IDS.length;

export function calculateMissionMastery(
  mission: MissionDefinition,
  progress: MissionProgress,
): MissionMasterySnapshot {
  const completedObjectiveIds = new Set(progress.completedObjectiveIds);
  const requiredObjectiveIds = mission.objectives
    .filter((objective) => objective.required)
    .map((objective) => objective.id);

  const conditions = [
    progress.completions > 0,
    requiredObjectiveIds.every((objectiveId) =>
      completedObjectiveIds.has(objectiveId),
    ),
    progress.bestScore >= 80,
    progress.bestTimeSeconds !== null &&
      progress.bestTimeSeconds > 0 &&
      progress.bestTimeSeconds <= mission.parTimeSeconds,
    progress.bestDifficultyId === "elite" ||
      progress.bestDifficultyId === "elder",
  ];

  let previousSealEarned = true;
  const seals = MISSION_MASTERY_SEAL_IDS.map((id, index) => {
    const earned = previousSealEarned && conditions[index];
    previousSealEarned = earned;

    return {
      id,
      label: SEAL_LABELS[id],
      earned,
    };
  });

  const count = seals.filter((seal) => seal.earned).length;

  return {
    seals,
    count,
    total: MISSION_MASTERY_TOTAL,
    ratio: count / MISSION_MASTERY_TOTAL,
    mastered: count === MISSION_MASTERY_TOTAL,
  };
}

export interface MissionReplayGoal {
  id: string;
  kind: "mastery" | "optional";
  title: string;
  instruction: string;
  progressLabel: string;
  /** Existing evidence only; this helper never awards currency or mutates saves. */
  objectiveId?: string;
}

function formatMasteryTime(seconds: number): string {
  const wholeSeconds = Math.max(0, Math.floor(seconds));
  return `${Math.floor(wholeSeconds / 60)} min ${String(wholeSeconds % 60).padStart(2, "0")} s`;
}

/**
 * Next concrete replay targets from the existing cumulative campaign record.
 * No new save field or retroactive reward is necessary: extraction updates the
 * same completion, objective, score, time and difficulty evidence as before.
 */
export function getMissionReplayGoals(
  mission: MissionDefinition,
  progress: MissionProgress,
): MissionReplayGoal[] {
  if (progress.status === "locked") return [];
  const mastery = calculateMissionMastery(mission, progress);
  const nextSeal = mastery.seals.find((seal) => !seal.earned);
  const completed = new Set(progress.completedObjectiveIds);
  const goals: MissionReplayGoal[] = [];
  if (nextSeal) {
    const missingRequired = mission.objectives.filter(
      (objective) => objective.required && !completed.has(objective.id),
    );
    const instructions: Record<MissionMasterySealId, string> = {
      "hunt-completed": "Accomplir la chasse, récupérer la prise et réussir l’extraction.",
      "required-objectives": `Consigner les objectifs encore manquants : ${missingRequired.map((objective) => objective.label).join(", ")}. Terminer la chasse pour enregistrer la progression.`,
      "grade-a": "Atteindre au moins 80 points au débrief d’une chasse réussie. Les objectifs et le respect du Code contribuent au résultat.",
      "under-par": `Réussir l’extraction en ${formatMasteryTime(mission.parTimeSeconds)} maximum. Préparer les outils et utiliser les raccourcis déjà ouverts.`,
      "elite-difficulty": "Choisir Elite ou Elder au briefing (Elder se déverrouille après la campagne), puis réussir la chasse et l’extraction.",
    };
    const progressLabels: Record<MissionMasterySealId, string> = {
      "hunt-completed": `${progress.completions} chasse(s) réussie(s)`,
      "required-objectives": `${missingRequired.length} objectif(s) requis à consigner`,
      "grade-a": `Meilleur score : ${progress.bestScore}/100 · objectif : 80`,
      "under-par": progress.bestTimeSeconds !== null && progress.bestTimeSeconds > 0
        ? `Record : ${formatMasteryTime(progress.bestTimeSeconds)} · par : ${formatMasteryTime(mission.parTimeSeconds)}`
        : `Par : ${formatMasteryTime(mission.parTimeSeconds)} · aucun temps réussi enregistré`,
      "elite-difficulty": `Meilleure difficulté réussie : ${progress.bestDifficultyId ?? "aucune"}`,
    };
    goals.push({
      id: `mastery:${nextSeal.id}`,
      kind: "mastery",
      title: nextSeal.label,
      instruction: instructions[nextSeal.id],
      progressLabel: progressLabels[nextSeal.id],
    });
  }
  // Optional objectives provide a second concrete reason to revisit even after five seals.
  const missingOptional = mission.objectives.filter(
    (objective) => !objective.required && !completed.has(objective.id),
  );
  const optional = missingOptional[0];
  if (optional) goals.push({
    id: `objective:${optional.id}`,
    kind: "optional",
    title: optional.label,
    instruction: `${optional.description} Réussir l’extraction pour consigner cet objectif.`,
    progressLabel: `${missingOptional.length} objectif(s) secondaire(s) encore non consignés`,
    objectiveId: optional.id,
  });
  return goals;
}
