import definitions from "./pitScreenArenasV43.generated.json";

export interface PitScreenArenaMetadata {
  readonly kind: "film" | "game";
  readonly workId: string;
  readonly workTitle: string;
  readonly referenceStatus: string;
}
/** Reference metadata describes planned works; it never unlocks a playable arena. */
export const PIT_SCREEN_ARENA_WORKS = definitions.works as readonly { readonly id: string; readonly title: string; readonly kind: "film" | "game" }[];
export const PIT_SCREEN_ARENA_DEFINITIONS = definitions.arenas;
export function getPitScreenArenaMetadata(id: unknown): PitScreenArenaMetadata | null {
  if (typeof id !== "string") return null;
  const definition = definitions.arenas.find(arena => arena.id === id);
  return definition ? { kind: definition.kind as "film" | "game", workId: definition.workId,
    workTitle: definition.workTitle, referenceStatus: definition.referenceStatus } : null;
}
