import definitions from "./pitScreenArenasV43.generated.json";
import { PIT_LORE_STAGE_DEFINITIONS, PIT_LORE_STAGE_WORKS } from "./pitLoreStages";

export interface PitScreenArenaMetadata {
  readonly kind: "film" | "game" | "comic";
  readonly workId: string;
  readonly workTitle: string;
  readonly referenceStatus: string;
}
/** Reference metadata describes planned works; it never unlocks a playable arena. */
export const PIT_SCREEN_ARENA_WORKS = definitions.works as readonly { readonly id: string; readonly title: string; readonly kind: "film" | "game" }[];
export const PIT_SCREEN_ARENA_DEFINITIONS = definitions.arenas;
export const PIT_STAGE_REFERENCE_WORKS = [...PIT_SCREEN_ARENA_WORKS, ...PIT_LORE_STAGE_WORKS];
export function getPitScreenArenaMetadata(id: unknown): PitScreenArenaMetadata | null {
  if (typeof id !== "string") return null;
  const definition = [...PIT_SCREEN_ARENA_DEFINITIONS, ...PIT_LORE_STAGE_DEFINITIONS].find(arena => arena.id === id);
  return definition ? { kind: definition.kind as "film" | "game" | "comic", workId: definition.workId,
    workTitle: definition.workTitle, referenceStatus: definition.referenceStatus } : null;
}
