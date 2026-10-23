import {getPitWorkbookNativeV100} from './pitWorkbookAnimationV100';
import type {PitSpriteSheetAnimationDefinition} from './pitSpriteSheetAnimation';

export const PIT_WORKBOOK_CONCLUSION_KEYS_V107 = ['FATALITE_2', 'CLEMENCE'] as const;
export type PitWorkbookConclusionBodyKeyV107 = typeof PIT_WORKBOOK_CONCLUSION_KEYS_V107[number];

/** These independent native Scar actors have no painted partner. The scene
 * controller still owns eligibility, contacts, the other actor and every prop.
 * Merely decoding this bank never authorizes a conclusion or an inventory gain. */
export const PIT_WORKBOOK_CONCLUSION_REGISTRY_V107: readonly PitSpriteSheetAnimationDefinition[] =
  PIT_WORKBOOK_CONCLUSION_KEYS_V107.map(key => {
    const native = getPitWorkbookNativeV100('scar', 'CIN_F003_' + key);
    if (!native) throw new Error('Missing native Scar conclusion: ' + key);
    for (const facing of ['right', 'left'] as const) {
      const clip = native.definition.atlas.clips.find(candidate => candidate.id === 'workbook.CIN_F003_' + key && candidate.facing === facing);
      if (!clip || clip.loop || clip.status !== 'validated' || clip.ticksPerSecond !== 60 || clip.frames.length !== 6 ||
          clip.frames.reduce((total, frame) => total + frame.durationTicks, 0) !== 300)
        throw new Error('Incomplete native Scar conclusion timeline: ' + key + '/' + facing);
    }
    return native.definition;
  });

export function getPitWorkbookConclusionDefinitionV107(key: PitWorkbookConclusionBodyKeyV107): PitSpriteSheetAnimationDefinition {
  return PIT_WORKBOOK_CONCLUSION_REGISTRY_V107[PIT_WORKBOOK_CONCLUSION_KEYS_V107.indexOf(key)];
}

/** A scene binding is not a claim that every source requirement is complete. */
export function getPitWorkbookConclusionSupportV107(fighterId: string, actionId: string): 'conditional-scene' | 'partial-scene' | null {
  if (fighterId !== 'scar') return null;
  return actionId === 'CIN_F003_FATALITE_2' ? 'conditional-scene' : actionId === 'CIN_F003_CLEMENCE' ? 'partial-scene' : null;
}

const objectiveNative = getPitWorkbookNativeV100('feral-hunter', 'M_F006_S4');
if (!objectiveNative) throw new Error('Missing native source for the alternative objective device');
/** The S4 BODY remains a study. Only its physically separate ground object is
 * sampled for this session prop; this does not implement the S4 combat mine. */
export const PIT_WORKBOOK_OBJECTIVE_REGISTRY_V107 = [objectiveNative.definition] as const;
export const PIT_WORKBOOK_CONCLUSION_SCENE_REGISTRY_V107 = [...PIT_WORKBOOK_CONCLUSION_REGISTRY_V107, ...PIT_WORKBOOK_OBJECTIVE_REGISTRY_V107];
