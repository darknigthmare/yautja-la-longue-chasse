/** UI preference only: never serialize this into a war simulation or campaign save. */
export const WAR_PRESENTATION_KEY_V131 = "yautja.clan-war.presentation.v1";
export type ClanWarPresentationV131 = "gauntlet" | "classic";
export const DEFAULT_WAR_PRESENTATION_V131: ClanWarPresentationV131 = "gauntlet";

/** Unknown, corrupted or previous preference values safely use the new default. */
export function parseClanWarPresentationV131(value: unknown): ClanWarPresentationV131 {
  return value === "classic" ? "classic" : DEFAULT_WAR_PRESENTATION_V131;
}
