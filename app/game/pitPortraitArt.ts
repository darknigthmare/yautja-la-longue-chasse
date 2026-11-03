import type {PitFighterId} from './systems/pitCombat';
import type {PitSpriteSheetAnimationDefinition} from './pitSpriteSheetAnimation';

/** Portraits decode only the authored idle side. Combat keeps the full registry. */
export function pitPortraitAnimationRegistry(
 fighterId:PitFighterId, facing:'left'|'right', registry:readonly PitSpriteSheetAnimationDefinition[],
):PitSpriteSheetAnimationDefinition[]{
 return registry.filter(definition=>definition.fighterId===fighterId).flatMap(definition=>{
  const clips=definition.atlas.clips.filter(clip=>clip.id==='idle'&&clip.facing===facing&&clip.status==='validated');
  if(!clips.length)return [];
  const pageIds=new Set(clips.flatMap(clip=>clip.frames.map(frame=>frame.pageId)));
  const pages=definition.atlas.pages.filter(page=>pageIds.has(page.id));
  const pageBodyHeightPx=definition.pageBodyHeightPx
   ?Object.fromEntries(Object.entries(definition.pageBodyHeightPx).filter(([id])=>pageIds.has(id))):undefined;
  return [{...definition,...(pageBodyHeightPx?{pageBodyHeightPx}:{}),atlas:{...definition.atlas,pages,clips}}];
 });
}
