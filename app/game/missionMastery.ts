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
  "under-par": "Temps sous le par",
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
