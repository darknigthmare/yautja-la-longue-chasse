import type {
  HonorRuleCondition,
  HonorRuleDefinition,
  MissionDefinition,
} from "./types";

export interface MissionHonorFacts {
  completedObjectiveIds: ReadonlySet<string>;
  targetScannedBeforeStrike: boolean;
  plasmaUsedOnRegularPrey: boolean;
  environmentalArmorBreaks: number;
  duelViolated: boolean;
  purgeStopped: boolean;
  secondWindUsed: boolean;
}

export interface HonorRuleResolution {
  ruleId: string;
  label: string;
  honored: boolean;
  value: number;
}

export function honorRuleEventId(
  rule: Pick<HonorRuleDefinition, "id">,
): string {
  return `honor-rule:${rule.id}`;
}

function objectiveComplete(
  mission: MissionDefinition,
  facts: MissionHonorFacts,
  kind: "scan" | "recover",
): boolean {
  const objective = mission.objectives.find((entry) => entry.kind === kind);
  return !objective || facts.completedObjectiveIds.has(objective.id);
}

function conditionSatisfied(
  mission: MissionDefinition,
  condition: HonorRuleCondition,
  facts: MissionHonorFacts,
): boolean {
  switch (condition) {
    case "target-scanned-before-strike":
      return facts.targetScannedBeforeStrike;
    case "scan-objective-complete":
      return objectiveComplete(mission, facts, "scan");
    case "recover-objective-complete":
      return objectiveComplete(mission, facts, "recover");
    case "no-plasma-on-regular-prey":
      return !facts.plasmaUsedOnRegularPrey;
    case "environmental-armor-break":
      return facts.environmentalArmorBreaks > 0;
    case "duel-kept":
      return !facts.duelViolated;
    case "purge-stopped":
      return facts.purgeStopped;
    case "no-second-wind":
      return !facts.secondWindUsed;
  }
}

export function evaluateMissionHonorRules(
  mission: MissionDefinition,
  facts: MissionHonorFacts,
): HonorRuleResolution[] {
  return mission.honorRules.map((rule) => {
    const honored = conditionSatisfied(mission, rule.condition, facts);
    return {
      ruleId: rule.id,
      label: rule.label,
      honored,
      value: honored ? rule.bonus : -rule.violationPenalty,
    };
  });
}
