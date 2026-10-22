import admissions from './data/pitWorkbookAnimationsV100.json';
import { PIT_SPRITE_SHEET_REGISTRY } from './pitSpriteSheetRegistry';
import { PIT_WORKBOOK_NORMALS_V104 } from './systems/pitWorkbookNormalsV104';
import type { PitWorkbookNativeAdmissionV100 } from './pitWorkbookAnimationV100';
import type { HunterSpriteAtlasClip } from './hunterSpriteAtlas';
import type { PitSpriteSheetAnimationDefinition } from './pitSpriteSheetAnimation';

/** Separate phase IDs and opt-in bank leave all historical clip selection intact.
 * Every frame is an existing admitted native rectangle; no pixels are generated,
 * transformed, mirrored or interpolated by this mechanical binding. */
export const PIT_WORKBOOK_NORMAL_REGISTRY_V104: readonly PitSpriteSheetAnimationDefinition[] =
  PIT_WORKBOOK_NORMALS_V104.map(move => {
    const admission = (admissions as unknown as readonly PitWorkbookNativeAdmissionV100[]).find(item =>
      item.fighterId === move.fighterId && item.actionId === move.actionId && item.review.status === 'validated' &&
      item.appearanceId === 'runtime-default');
    const definition = admission?.definition ?? PIT_SPRITE_SHEET_REGISTRY.find(item =>
      item.fighterId === move.fighterId && item.variantId === undefined && item.atlas.id === admission?.atlasId);
    if (!admission || !definition || definition.variantId !== undefined) throw new Error('Missing native normal admission: ' + move.actionId);
    const phases = ['startup', 'active', 'recovery'] as const;
    const clips: HunterSpriteAtlasClip[] = [];
    for (const facing of ['right', 'left'] as const) {
      const workbook = definition.atlas.clips.find(clip => clip.id === 'workbook.' + move.actionId && clip.facing === facing);
      let boundary = 0;
      for (const phase of phases) {
        const start = boundary; boundary += move[phase];
        const historical = !workbook && definition.atlas.clips.find(clip =>
          clip.id === `pit.${move.posture}.${move.attack}.${phase}` && clip.facing === facing);
        let elapsed = 0;
        const frames = workbook ? workbook.frames.flatMap(frame => {
          const from = elapsed; elapsed += frame.durationTicks;
          const durationTicks = Math.max(0, Math.min(elapsed, boundary) - Math.max(from, start));
          return durationTicks > 0 ? [{...frame, durationTicks}] : [];
        }) : historical ? historical.frames.map(frame => ({...frame})) : [];
        const template = workbook || historical;
        if (!template || template.status !== 'validated' || template.loop || !frames.length) {
          throw new Error('Missing native phase: ' + move.actionId + '/' + facing + '/' + phase);
        }
        clips.push({...template, id: `pit.${move.posture}.workbook-v104.${move.key}.${phase}`, frames, loop: false});
      }
    }
    const usedPages = new Set(clips.flatMap(clip => clip.frames.map(frame => frame.pageId)));
    const visibleFrameBounds = definition.visibleFrameBounds?.filter(bound => clips.some(clip => clip.frames.some(frame =>
      frame.pageId === bound.pageId && frame.rect.every((value, index) => value === bound.rect[index]))));
    const pageBodyHeightPx = definition.pageBodyHeightPx && Object.fromEntries(Object.entries(definition.pageBodyHeightPx).filter(([id]) => usedPages.has(id)));
    const heldPoseClips = definition.heldPoseClips?.filter(pose => clips.some(clip => clip.id === pose.id && clip.facing === pose.facing));
    return {...definition, ...(visibleFrameBounds ? {visibleFrameBounds} : {}), ...(pageBodyHeightPx ? {pageBodyHeightPx} : {}),
      ...(heldPoseClips ? {heldPoseClips} : {}), atlas: {...definition.atlas, id: definition.atlas.id + '-normal-v104-' + move.key,
      pages: definition.atlas.pages.filter(page => usedPages.has(page.id)), clips}};
  });

export const PIT_WORKBOOK_NORMAL_AND_LEGACY_REGISTRY_V104: readonly PitSpriteSheetAnimationDefinition[] =
  [...PIT_WORKBOOK_NORMAL_REGISTRY_V104, ...PIT_SPRITE_SHEET_REGISTRY];
