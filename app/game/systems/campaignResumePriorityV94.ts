export type CampaignWorldDestinationV94 = 'homeworld' | 'game-reserve' | 'homeworld-region-v68' | 'homeworld-passage-v67' | 'homeworld-expedition' | 'glass-desert-expedition';

/** Read-only world routing after the caller has protected active youth chapters.
 * Completed arrivals are history; they cannot override an explicit ship/hunt checkpoint.
 */
export function campaignResumePriorityV94({location, region, passage, reserveAvailable}: {
  location: string;
  region?: {status: string} | null;
  passage?: {status: string; regionId: string} | null;
  reserveAvailable: boolean;
}): CampaignWorldDestinationV94 | null {
  if (region && region.status !== 'at-city') return 'homeworld-region-v68';
  if (passage && passage.status !== 'at-city') return passage.status === 'at-biome'
    ? passage.regionId === 'ash-marches' ? 'homeworld-expedition' : 'glass-desert-expedition'
    : 'homeworld-passage-v67';
  if (location === 'game-reserve' && reserveAvailable) return 'game-reserve';
  if (location === 'homeworld' && (region?.status === 'at-city' || passage?.status === 'at-city')) return 'homeworld';
  return null;
}
