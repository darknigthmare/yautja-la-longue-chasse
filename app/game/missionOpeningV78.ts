import type { MissionDefinition } from "./types";

/** Presentation only: use authored mission facts, never grant progress or rewards. */
export function missionOpeningV78(mission: MissionDefinition) {
  return {
    id: `${mission.id}:opening`,
    title: mission.title,
    subtitle: mission.subtitle,
    location: mission.planetName,
    context: mission.briefing,
    steps: mission.objectives
      .filter((objective) => objective.required)
      .map(({ id, label }) => ({ id, label })),
  };
}

/** Legacy objective strings remain save-compatible; only their visible shortcuts change. */
export function missionActionTextV78(
  text: string,
  labels: { scan: string; interact: string },
): string {
  return text
    .replace(/\[V\]/g, `[${labels.scan}]`)
    .replace(/\[E\]/g, `[${labels.interact}]`);
}
