import type { WarPlanetV96 } from "./clanWarPlanetsV96";
import { validPlanetVisualProfileV134, type PlanetVisualProfileV134 } from "./clanWarPlanetVisualProfileV134";

export interface WarAtlasVisualSelectionV142 {
  readonly profile: PlanetVisualProfileV134 | null;
  readonly source: "editor" | "local" | "native";
}

/** The editor's explicit null means "return to native" and overrides a prior
 * local choice. Only an absent external prop permits a manual local load.
 * This is presentation state, never part of territory or campaign saves. */
export function resolveWarAtlasVisualV142(
  planet: WarPlanetV96,
  editorProfile: PlanetVisualProfileV134 | null | undefined,
  manualLocalProfile: PlanetVisualProfileV134 | null,
): WarAtlasVisualSelectionV142 {
  const externallyManaged = editorProfile !== undefined;
  const chosen = externallyManaged ? editorProfile : manualLocalProfile;
  if (!validPlanetVisualProfileV134(planet, chosen))
    return { profile: null, source: "native" };
  return { profile: chosen, source: externallyManaged ? "editor" : "local" };
}
