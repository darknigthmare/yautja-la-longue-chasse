import {getPitWorkbookNativeV100} from './pitWorkbookAnimationV100';
import type {PitSpriteSheetAnimationDefinition} from './pitSpriteSheetAnimation';
import {PIT_WORKBOOK_MOVES_V105} from './systems/pitWorkbookMovesV105';
import {getPitWorkbookRuntimeBindingV106, PIT_WORKBOOK_AND_LEGACY_REGISTRY_V106, PIT_WORKBOOK_BODY_MOVES_V106} from './pitWorkbookRegistryV106';
import type {HunterSpriteAtlasClip} from './hunterSpriteAtlas';

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
/** This original source bank supplies the independent inert objective prop.
 * Offensive S4 admission is separately owned by the V107 device registry. */
export const PIT_WORKBOOK_OBJECTIVE_REGISTRY_V107 = [objectiveNative.definition] as const;
export const PIT_WORKBOOK_CONCLUSION_SCENE_REGISTRY_V107 = [...PIT_WORKBOOK_CONCLUSION_REGISTRY_V107, ...PIT_WORKBOOK_OBJECTIVE_REGISTRY_V107];

export const PIT_WORKBOOK_DEVICE_MOVES_V107 = PIT_WORKBOOK_MOVES_V105.filter(move =>
  move.fighterId === 'feral-hunter' && move.key === 'S4' || move.fighterId === 'scar' && move.key === 'S2');
export const PIT_WORKBOOK_BODY_MOVES_V107 = [...PIT_WORKBOOK_BODY_MOVES_V106, ...PIT_WORKBOOK_DEVICE_MOVES_V107];
export function getPitWorkbookRuntimeBindingV107(fighterId: string, actionId: string): 'normal' | 'move' | 'presentation' | 'conditional-scene' | 'partial-scene' | null {
  return getPitWorkbookConclusionSupportV107(fighterId,actionId) ??
    (PIT_WORKBOOK_DEVICE_MOVES_V107.some(move => move.fighterId === fighterId && move.actionId === actionId) ? 'move' : getPitWorkbookRuntimeBindingV106(fighterId,actionId));
}
export const PIT_WORKBOOK_DEVICE_REGISTRY_V107: readonly PitSpriteSheetAnimationDefinition[] = PIT_WORKBOOK_DEVICE_MOVES_V107.map(move => {
  const native = getPitWorkbookNativeV100(move.fighterId, move.actionId);
  if (!native) throw new Error('Missing native device BODY: ' + move.actionId);
  const clips: HunterSpriteAtlasClip[] = [];
  for (const facing of ['right', 'left'] as const) {
    const source = native.definition.atlas.clips.find(clip => clip.facing === facing && clip.id === 'workbook.' + move.actionId);
    if (!source || source.loop || source.frames.reduce((sum, frame) => sum + frame.durationTicks, 0) !== move.startup + move.active + move.recovery)
      throw new Error('Incomplete native device BODY timeline');
    let boundary = 0;
    for (const phase of ['startup', 'active', 'recovery'] as const) {
      const start = boundary; boundary += move[phase]; let elapsed = 0;
      const frames = source.frames.flatMap(frame => {
        const from = elapsed; elapsed += frame.durationTicks;
        const durationTicks = Math.max(0, Math.min(elapsed, boundary) - Math.max(from, start));
        return durationTicks ? [{...frame, durationTicks}] : [];
      });
      clips.push({...source, id: `pit.stand.workbook-v107.${move.key}.${phase}`, frames, loop: false});
    }
  }
  return {...native.definition, atlas: {...native.definition.atlas, id: native.definition.atlas.id + '-action-v107', clips}};
});
export const PIT_WORKBOOK_AND_LEGACY_REGISTRY_V107 = [...PIT_WORKBOOK_DEVICE_REGISTRY_V107, ...PIT_WORKBOOK_AND_LEGACY_REGISTRY_V106];
