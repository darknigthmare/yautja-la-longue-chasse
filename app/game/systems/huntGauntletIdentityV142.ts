import {
  DEFAULT_GAUNTLET_ID_V132,
  normalizeGauntletV132,
  type HunterRankV132,
} from "./clanWarGauntletCatalogV132.ts";

/**
 * V142: optional cosmetic identity in the existing V1 active-hunt sidecar.
 * Never accepts the sidecar as a trophy/entitlement receipt. The owner's
 * current campaign rank and already claimed studies remain authoritative.
 * Old sidecars without this key keep their previous selected-model behavior.
 */
export const HUNT_GAUNTLET_CONFIG_KEY_V142 = "gauntletVariantId";

export function captureHuntGauntletV142(
  selectedId: unknown,
  rank: HunterRankV132,
  claimedStudies: readonly string[] = [],
): string {
  return normalizeGauntletV132(
    typeof selectedId === "string" ? selectedId : DEFAULT_GAUNTLET_ID_V132,
    rank,
    claimedStudies,
  );
}

export function resumeHuntGauntletV142(
  configuration: Readonly<Record<string, unknown>>,
  currentEquippedId: unknown,
  rank: HunterRankV132,
  claimedStudies: readonly string[] = [],
): string {
  // V141/legacy saves did not capture the cosmetic; never invalidate them.
  const selected = Object.hasOwn(configuration,HUNT_GAUNTLET_CONFIG_KEY_V142)
    ? configuration[HUNT_GAUNTLET_CONFIG_KEY_V142]
    : currentEquippedId;
  return captureHuntGauntletV142(selected,rank,claimedStudies);
}
