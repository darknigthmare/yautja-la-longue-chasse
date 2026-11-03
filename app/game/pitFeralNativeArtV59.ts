import { getPitSpriteSheetAtlasReadiness, type PitSpriteSheetAnimationBank,
  type PitSpriteSheetAtlasReadiness } from './pitSpriteSheetAnimation';
import type { PitFighterId } from './systems/pitCombat';

export const PIT_FERAL_NATIVE_ACTION_ATLAS = 'feral-actions-v59';

const launcherClips = (['left', 'right'] as const).flatMap(facing =>
  ['startup', 'active', 'recovery'].map(phase => ({
    id: `pit.stand.technique.feral-guided-bolts-v58.${phase}`, facing,
  })));

/** These masked drawings belong only to the default appearance, never a user costume. */
export function getPitFeralNativeArtStatus(
  bank: PitSpriteSheetAnimationBank | null | undefined,
  fighterId: PitFighterId,
  variantId?: string | null,
): PitSpriteSheetAtlasReadiness | 'not-required' {
  if (fighterId !== 'feral-hunter' || variantId) return 'not-required';
  return getPitSpriteSheetAtlasReadiness(bank, PIT_FERAL_NATIVE_ACTION_ATLAS,
    fighterId, variantId, launcherClips);
}
