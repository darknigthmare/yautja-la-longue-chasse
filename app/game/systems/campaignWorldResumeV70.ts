import type { SaveGame } from '../types';
import type { CampaignResumeLocation } from './campaignSlots';
import { youthCampaignNeedsScene } from './youthCampaign';
import { soloV66NeedsScene } from './campaignSoloV66';
import { soloV67NeedsScene } from './campaignSoloV67';
import { soloV68NeedsScene } from './campaignSoloV68';
import { soloV69NeedsScene } from './campaignSoloV69';
import { soloV70NeedsScene } from './campaignSoloV70';

export type CampaignWorldResumeV70 = 'homeworld' | 'game-reserve' | 'homeworld-region-v68' | 'homeworld-passage-v67' | 'homeworld-expedition' | 'glass-desert-expedition';

/** An old terminal arrival is not an active journey. In particular, it must
 * never replace the screen of a currently owned youth chapter at hydration. */
export function campaignWorldResumeV70(save: SaveGame, location: CampaignResumeLocation): CampaignWorldResumeV70 | null {
  if (save.prologue?.status === 'active' || youthCampaignNeedsScene(save.youthTraining) ||
    soloV66NeedsScene(save.soloV66) || soloV67NeedsScene(save.soloV67) || soloV68NeedsScene(save.soloV68) ||
    soloV69NeedsScene(save.soloV69) || soloV70NeedsScene(save.soloV70)) return null;
  if (save.homeworldRegionV68 && save.homeworldRegionV68.status !== 'at-city') return 'homeworld-region-v68';
  const passage = save.homeworldPassageV67;
  if (passage && passage.status !== 'at-city') return passage.status === 'at-biome'
    ? passage.regionId === 'ash-marches' ? 'homeworld-expedition' : 'glass-desert-expedition'
    : 'homeworld-passage-v67';
  if (location === 'game-reserve' && save.gameReserveV66 && !save.prologue) return 'game-reserve';
  if (save.homeworldRegionV68?.status === 'at-city' || passage?.status === 'at-city') return 'homeworld';
  return null;
}
