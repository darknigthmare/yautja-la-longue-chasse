import admissions from './data/pitWorkbookAnimationsV100.json';
import {PIT_SPRITE_SHEET_REGISTRY} from './pitSpriteSheetRegistry';
import {
  PIT_WORKBOOK_AND_LEGACY_REGISTRY_V105, PIT_WORKBOOK_BODY_MOVES_V105,
  PIT_WORKBOOK_BODY_PRESENTATIONS_V105, PIT_WORKBOOK_MOVE_REGISTRY_V105,
  getPitWorkbookRuntimeBindingV105,
} from './pitWorkbookRegistryV105';
import {PIT_WORKBOOK_MOVES_V105} from './systems/pitWorkbookMovesV105';
import {getPitWorkbookSuperFramePlanV106} from './systems/pitWorkbookSuperSourceV106';
import type {PitWorkbookNativeAdmissionV100} from './pitWorkbookAnimationV100';
import type {HunterSpriteAtlasClip, HunterSpriteAtlasFrame} from './hunterSpriteAtlas';
import type {PitSpriteSheetAnimationDefinition} from './pitSpriteSheetAnimation';

/** Only the two projectile BODY actions have new render bindings. Their flight,
 * damage, meter and release point belong to the opt-in V106 simulation. */
export const PIT_WORKBOOK_PROJECTILE_MOVES_V106 = PIT_WORKBOOK_MOVES_V105.filter(move =>
  move.fighterId === 'feral-hunter' && move.key === 'S1' || move.fighterId === 'scar' && move.key === 'S3');
export const PIT_WORKBOOK_ADDITIONAL_MOVES_V106 = [...PIT_WORKBOOK_PROJECTILE_MOVES_V106,
  ...PIT_WORKBOOK_MOVES_V105.filter(move => move.fighterId === 'feral-hunter' && move.key === 'S2'),
  ...PIT_WORKBOOK_MOVES_V105.filter(move => move.key === 'SUPER')];
export const PIT_WORKBOOK_BODY_MOVES_V106 = [...PIT_WORKBOOK_BODY_MOVES_V105, ...PIT_WORKBOOK_ADDITIONAL_MOVES_V106];
export const PIT_WORKBOOK_BODY_PRESENTATIONS_V106 = PIT_WORKBOOK_BODY_PRESENTATIONS_V105;

export function getPitWorkbookRuntimeBindingV106(fighterId: string, actionId: string): 'normal' | 'move' | 'presentation' | null {
  return PIT_WORKBOOK_ADDITIONAL_MOVES_V106.some(move => move.fighterId === fighterId && move.actionId === actionId)
    ? 'move' : getPitWorkbookRuntimeBindingV105(fighterId, actionId);
}

function retainedDefinition(definition: PitSpriteSheetAnimationDefinition, clips: HunterSpriteAtlasClip[]): PitSpriteSheetAnimationDefinition {
  const usedPages = new Set(clips.flatMap(clip => clip.frames.map(frame => frame.pageId)));
  const visibleFrameBounds = definition.visibleFrameBounds?.filter(bound => clips.some(clip => clip.frames.some(frame =>
    frame.pageId === bound.pageId && frame.rect.every((value, index) => value === bound.rect[index]))));
  const pageBodyHeightPx = definition.pageBodyHeightPx && Object.fromEntries(Object.entries(definition.pageBodyHeightPx).filter(([page]) => usedPages.has(page)));
  return {...definition, ...(visibleFrameBounds ? {visibleFrameBounds} : {}), ...(pageBodyHeightPx ? {pageBodyHeightPx} : {}),
    heldPoseClips: undefined, atlas: {...definition.atlas, id: definition.atlas.id + '-action-v106',
      pages: definition.atlas.pages.filter(page => usedPages.has(page.id)), clips}};
}

/** Preserve each original drawing and its order. This retimes the already
 * admitted V59 launcher phases, rather than claiming its old 9/5/18 timing was
 * the workbook's 23/6/30 timing. The V59 definition itself remains unchanged. */
function retimeNativePhase(frames: readonly HunterSpriteAtlasFrame[], target: number): HunterSpriteAtlasFrame[] {
  const total = frames.reduce((sum, frame) => sum + frame.durationTicks, 0);
  let elapsed = 0, boundary = 0;
  return frames.map((frame, index) => {
    elapsed += frame.durationTicks;
    const end = index === frames.length - 1 ? target : Math.floor(elapsed * target / total);
    const durationTicks = end - boundary;
    if (durationTicks < 1) throw new Error('V106 retiming would discard a native drawing');
    boundary = end;
    return {...frame, durationTicks};
  });
}

export const PIT_WORKBOOK_ADDITIONAL_REGISTRY_V106: readonly PitSpriteSheetAnimationDefinition[] = PIT_WORKBOOK_ADDITIONAL_MOVES_V106.map(move => {
  const admission = (admissions as unknown as readonly PitWorkbookNativeAdmissionV100[]).find(item =>
    item.fighterId === move.fighterId && item.actionId === move.actionId && item.appearanceId === 'runtime-default' && item.review.status === 'validated');
  const definition = admission?.definition ?? PIT_SPRITE_SHEET_REGISTRY.find(item =>
    item.fighterId === move.fighterId && item.variantId === undefined && item.atlas.id === admission?.atlasId);
  if (!definition || definition.variantId !== undefined) throw new Error('Missing native V106 BODY admission: ' + move.actionId);
  const clips: HunterSpriteAtlasClip[] = [];
  for (const facing of ['right', 'left'] as const) {
    if (move.key === 'SUPER') {
      const original = definition.atlas.clips.find(clip => clip.facing === facing && clip.id === 'workbook.' + move.actionId);
      const plan = getPitWorkbookSuperFramePlanV106(move.fighterId);
      if (!original || !plan) throw new Error('Missing confirmed SUPER source plan: ' + move.actionId);
      for (const phase of ['startup', 'active', 'recovery', 'recovery.confirmed'] as const) {
        const sequence = phase === 'recovery.confirmed' ? plan.recoveryConfirmed : phase === 'recovery' ? plan.recoveryMiss : plan[phase];
        const frames = sequence.map(item => {
          const frame = original.frames[item.index];
          if (!frame) throw new Error('Invalid SUPER native drawing index');
          return {...frame, durationTicks: item.durationTicks};
        });
        const expectedDuration = phase.startsWith('recovery') ? move.recovery : move[phase as 'startup' | 'active'];
        if (frames.reduce((sum, frame) => sum + frame.durationTicks, 0) !== expectedDuration)
          throw new Error('Invalid SUPER source phase duration');
        clips.push({...original, id: `pit.stand.workbook-v106.SUPER.${phase}`, frames, loop: false});
      }
      continue;
    }
    let boundary = 0;
    for (const phase of ['startup', 'active', 'recovery'] as const) {
      const start = boundary; boundary += move[phase];
      const original = definition.atlas.clips.find(clip => clip.facing === facing && clip.id ===
        (move.fighterId === 'feral-hunter' && move.key === 'S1' ? 'pit.stand.technique.feral-guided-bolts-v58.' + phase : 'workbook.' + move.actionId));
      if (!original || original.status !== 'validated' || original.loop) throw new Error('Missing native V106 phase: ' + move.actionId + '/' + facing + '/' + phase);
      let frames: HunterSpriteAtlasFrame[];
      if (move.fighterId === 'feral-hunter' && move.key === 'S1') frames = retimeNativePhase(original.frames, move[phase]);
      else {
        if (original.frames.reduce((sum, frame) => sum + frame.durationTicks, 0) !== move.startup + move.active + move.recovery)
          throw new Error('Stale native V106 source timeline: ' + move.actionId);
        let elapsed = 0;
        frames = original.frames.flatMap(frame => {
          const from = elapsed; elapsed += frame.durationTicks;
          const durationTicks = Math.max(0, Math.min(elapsed, boundary) - Math.max(from, start));
          return durationTicks ? [{...frame, durationTicks}] : [];
        });
      }
      clips.push({...original, id: `pit.stand.workbook-v106.${move.key}.${phase}`, frames, loop: false});
    }
  }
  return retainedDefinition(definition, clips);
});

export const PIT_WORKBOOK_PROJECTILE_REGISTRY_V106 = PIT_WORKBOOK_ADDITIONAL_REGISTRY_V106.slice(0, PIT_WORKBOOK_PROJECTILE_MOVES_V106.length);
export const PIT_WORKBOOK_MOVE_REGISTRY_V106 = [...PIT_WORKBOOK_MOVE_REGISTRY_V105, ...PIT_WORKBOOK_ADDITIONAL_REGISTRY_V106];
export const PIT_WORKBOOK_AND_LEGACY_REGISTRY_V106: readonly PitSpriteSheetAnimationDefinition[] = [
  ...PIT_WORKBOOK_ADDITIONAL_REGISTRY_V106, ...PIT_WORKBOOK_AND_LEGACY_REGISTRY_V105,
];
