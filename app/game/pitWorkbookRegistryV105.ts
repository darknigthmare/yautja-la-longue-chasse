import admissions from './data/pitWorkbookAnimationsV100.json';
import { PIT_SPRITE_SHEET_REGISTRY } from './pitSpriteSheetRegistry';
import { PIT_WORKBOOK_NORMAL_REGISTRY_V104 } from './pitWorkbookNormalRegistryV104';
import { PIT_WORKBOOK_NORMALS_V104 } from './systems/pitWorkbookNormalsV104';
import { PIT_WORKBOOK_MOVES_V105, PIT_WORKBOOK_PRESENTATIONS_V105 } from './systems/pitWorkbookMovesV105';
import type { PitWorkbookNativeAdmissionV100 } from './pitWorkbookAnimationV100';
import type { HunterSpriteAtlasClip } from './hunterSpriteAtlas';
import type { PitSpriteSheetAnimationDefinition } from './pitSpriteSheetAnimation';

/** Only BODY actions with an implemented V105 trigger belong in the duel bank.
 * Throw and finisher studies contain a painted mannequin and remain in the
 * workbook viewer: playing them over a live opponent would duplicate a victim. */
export const PIT_WORKBOOK_BODY_MOVES_V105 = PIT_WORKBOOK_MOVES_V105.filter(move =>
  move.key === '6M' || move.key === 'EQUIP' ||
  (move.fighterId === 'scar' && (move.key === 'S1' || move.key === 'S4')) ||
  (move.fighterId === 'feral-hunter' && move.key === 'S3'));
export const PIT_WORKBOOK_BODY_PRESENTATIONS_V105 = PIT_WORKBOOK_PRESENTATIONS_V105.filter(scene =>
  ['INTRO', 'VICTOIRE', 'DEFAITE', 'TAUNT_1', 'TAUNT_2'].includes(scene.key));

/** Reports bindings, not source completion: entity, synchronized partner,
 * campaign and costume requirements remain separately tracked. */
export function getPitWorkbookRuntimeBindingV105(fighterId: string, actionId: string): 'normal' | 'move' | 'presentation' | null {
  if (PIT_WORKBOOK_NORMALS_V104.some(move => move.fighterId === fighterId && move.actionId === actionId)) return 'normal';
  if (PIT_WORKBOOK_BODY_MOVES_V105.some(move => move.fighterId === fighterId && move.actionId === actionId)) return 'move';
  if (PIT_WORKBOOK_BODY_PRESENTATIONS_V105.some(scene => scene.fighterId === fighterId && scene.actionId === actionId)) return 'presentation';
  return null;
}

function nativeDefinition(fighterId: string, actionId: string): PitSpriteSheetAnimationDefinition {
  const admission = (admissions as unknown as readonly PitWorkbookNativeAdmissionV100[]).find(item =>
    item.fighterId === fighterId && item.actionId === actionId && item.review.status === 'validated' &&
    item.appearanceId === 'runtime-default');
  const definition = admission?.definition ?? PIT_SPRITE_SHEET_REGISTRY.find(item =>
    item.fighterId === fighterId && item.variantId === undefined && item.atlas.id === admission?.atlasId);
  if (!admission || !definition || definition.variantId !== undefined) throw new Error('Missing native V105 admission: ' + actionId);
  return definition;
}

/** Metadata must describe exactly the retained rectangles/pages. The admission
 * validator intentionally rejects stale bounds and body references. */
function withClips(definition: PitSpriteSheetAnimationDefinition, id: string, clips: HunterSpriteAtlasClip[]): PitSpriteSheetAnimationDefinition {
  const usedPages = new Set(clips.flatMap(clip => clip.frames.map(frame => frame.pageId)));
  const visibleFrameBounds = definition.visibleFrameBounds?.filter(bound => clips.some(clip => clip.frames.some(frame =>
    frame.pageId === bound.pageId && frame.rect.every((value, index) => value === bound.rect[index]))));
  const pageBodyHeightPx = definition.pageBodyHeightPx && Object.fromEntries(Object.entries(definition.pageBodyHeightPx).filter(([page]) => usedPages.has(page)));
  const heldPoseClips = definition.heldPoseClips?.filter(pose => clips.some(clip => clip.id === pose.id && clip.facing === pose.facing));
  return {...definition, ...(visibleFrameBounds ? {visibleFrameBounds} : {}), ...(pageBodyHeightPx ? {pageBodyHeightPx} : {}),
    ...(heldPoseClips ? {heldPoseClips} : {}), atlas: {...definition.atlas, id,
      pages: definition.atlas.pages.filter(page => usedPages.has(page.id)), clips}};
}

/** Mechanical phase windows retain the original rectangles, pivots, page body
 * references and native direction. No new drawing or mirrored side is implied. */
export const PIT_WORKBOOK_MOVE_REGISTRY_V105: readonly PitSpriteSheetAnimationDefinition[] = PIT_WORKBOOK_BODY_MOVES_V105.map(move => {
  const definition = nativeDefinition(move.fighterId, move.actionId);
  const clips: HunterSpriteAtlasClip[] = [];
  for (const facing of ['right', 'left'] as const) {
    const workbook = definition.atlas.clips.find(clip => clip.id === 'workbook.' + move.actionId && clip.facing === facing);
    if (!workbook || workbook.status !== 'validated' || workbook.loop ||
        workbook.frames.reduce((sum, frame) => sum + frame.durationTicks, 0) !== move.startup + move.active + move.recovery) {
      throw new Error('Incomplete native V105 timeline: ' + move.actionId + '/' + facing);
    }
    let boundary = 0;
    for (const phase of ['startup', 'active', 'recovery'] as const) {
      const start = boundary; boundary += move[phase];
      // EQUIP has exactly zero active ticks in the source and never attacks.
      if (move[phase] === 0) continue;
      let elapsed = 0;
      const frames = workbook.frames.flatMap(frame => {
        const from = elapsed; elapsed += frame.durationTicks;
        const durationTicks = Math.max(0, Math.min(elapsed, boundary) - Math.max(from, start));
        return durationTicks > 0 ? [{...frame, durationTicks}] : [];
      });
      if (!frames.length) throw new Error('Missing native V105 phase: ' + move.actionId + '/' + phase);
      clips.push({...workbook, id: `pit.stand.workbook-v105.${move.key}.${phase}`, frames, loop: false});
    }
  }
  return withClips(definition, definition.atlas.id + '-move-v105-' + move.key, clips);
});

const presentationIds = {INTRO: 'intro', VICTOIRE: 'victory', DEFAITE: 'defeat', TAUNT_1: 'taunt.1', TAUNT_2: 'taunt.2'} as const;
export const PIT_WORKBOOK_PRESENTATION_REGISTRY_V105: readonly PitSpriteSheetAnimationDefinition[] = PIT_WORKBOOK_BODY_PRESENTATIONS_V105.map(scene => {
  const definition = nativeDefinition(scene.fighterId, scene.actionId);
  const id = presentationIds[scene.key as keyof typeof presentationIds];
  const clips = (['right', 'left'] as const).map(facing => {
    const native = definition.atlas.clips.find(clip => clip.id === 'workbook.' + scene.actionId && clip.facing === facing);
    if (!native || native.status !== 'validated' || native.loop) throw new Error('Missing native V105 presentation: ' + scene.actionId + '/' + facing);
    return {...native, id: 'pit.presentation.workbook-v105.' + id, frames: native.frames.map(frame => ({...frame}))};
  });
  return withClips(definition, definition.atlas.id + '-presentation-v105-' + scene.key, clips);
});

/** Normal V104 clip IDs/pixels stay intact in V105; older banks never import the
 * new bindings and therefore retain their original presentation selection. */
export const PIT_WORKBOOK_AND_LEGACY_REGISTRY_V105: readonly PitSpriteSheetAnimationDefinition[] = [
  ...PIT_WORKBOOK_MOVE_REGISTRY_V105, ...PIT_WORKBOOK_PRESENTATION_REGISTRY_V105,
  ...PIT_WORKBOOK_NORMAL_REGISTRY_V104, ...PIT_SPRITE_SHEET_REGISTRY,
];
