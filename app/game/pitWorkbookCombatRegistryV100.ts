import admissionData from './data/pitWorkbookAnimationsV100.json';
import type { PitWorkbookNativeAdmissionV100 } from './pitWorkbookAnimationV100';
import type { PitSpriteSheetAnimationDefinition } from './pitSpriteSheetAnimation';

/** Inspection-only gestures are never loaded as a pretend combat move. Only
 * the explicitly reviewed phase IDs enter the normal native animation bank. */
export const PIT_WORKBOOK_COMBAT_REGISTRY_V100: readonly PitSpriteSheetAnimationDefinition[] =
  (admissionData as unknown as readonly PitWorkbookNativeAdmissionV100[]).flatMap(entry => {
    const definition = entry.definition;
    if (!definition || entry.review?.status !== 'validated' || entry.appearanceId !== 'runtime-default' ||
      definition.variantId !== undefined || definition.fighterId !== entry.fighterId || definition.atlas.id !== entry.atlasId ||
      !entry.combatClipIds?.length || entry.combatClipIds.some(id => !/^pit\.(stand|crouch|air)\./.test(id))) return [];
    const clips = definition.atlas.clips.filter(clip => entry.combatClipIds!.includes(clip.id));
    if (entry.combatClipIds.some(id => !clips.some(clip => clip.id === id))) return [];
    return [{ ...definition, atlas: { ...definition.atlas, clips } }];
  });
