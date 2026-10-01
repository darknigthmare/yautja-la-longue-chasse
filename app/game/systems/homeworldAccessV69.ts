import { getChronicleRank } from './clanChronicle';
import { normalizeSoloV66Campaign, soloV66MatchesSave } from './campaignSoloV66';
import { normalizeYouthCampaign } from './youthCampaign';
import type { SaveGame } from '../types';
export type HomeworldAccessSaveV69 = Pick<SaveGame,'prologue'> & Partial<Pick<SaveGame,'youthTraining'|'soloV66'|'soloV67'|'soloV68'|'homeworld'>>;
/** Visual continuity only: this never grants access, gear, age or rank. Keep
 * the established city policy for every youth visit, including old saves. */
export function usesHomeworldYouthAppearanceV69(save: Pick<SaveGame,'prologue'>) {
  return Boolean(save.prologue) && !['blooded','elite','elder','ancient'].includes(getChronicleRank(save.prologue?.chronicle) ?? '');
}
export const HOMEWORLD_YOUTH_PLATE_V69 = {
  src: '/game/prologue/v47/unblooded-player.png', plateId: 'unblooded-player-v47',
  physicalHeight: 82, exactPreset: false, status: 'authored-unblooded-still',
  provenanceStatus: 'noncanonical-project-interpretation',
} as const;
/** The source progression opens ordinary homeworld villages during youth.
 * This permission never opens personal ships, off-world hunts or the Reserve.
 * Old independent campaigns keep their established access policy. */
export function canVisitHomeworldVillagesV69(save: HomeworldAccessSaveV69) {
  if(!save.prologue) return true;
  const rank=getChronicleRank(save.prologue.chronicle);
  if(['blooded','elite','elder','ancient'].includes(rank??'')) return true;
  if(!['unblooded','young-blood'].includes(rank??'')) return false;
  const youth=normalizeYouthCampaign(save.youthTraining),tracks=normalizeSoloV66Campaign(save.soloV66);
  return youth?.checkpoint.phase==='cage-complete' && tracks?.status==='completed' && soloV66MatchesSave(save);
}
