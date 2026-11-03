import data from '../data/pitLifecycleReviewV94.json';
import { PIT_SPRITE_SHEET_REGISTRY } from '../pitSpriteSheetRegistry';
import type { PitSpriteSheetAnimationDefinition } from '../pitSpriteSheetAnimation';

/** Bounded V94 proof. Changed metadata cannot borrow the review of an old source.
 * This reports drawing counts, never film fidelity or animation fluidity. */
export function getPitLifecycleReviewV94(fighterId: string, variantId: string | null | undefined, clipId: string, facing: 'left' | 'right',
 registry: readonly PitSpriteSheetAnimationDefinition[] = PIT_SPRITE_SHEET_REGISTRY) {
 for(const proof of data.entries){
  if(proof.fighterId!==fighterId||proof.variantId!==(variantId??null)||proof.clipId!==clipId||proof.facing!==facing)continue;
  const definition=registry.find(entry=>entry.atlas.id===proof.atlasId&&entry.fighterId===fighterId&&entry.variantId===(variantId??undefined));
  const clip=definition?.atlas.clips.find(item=>item.id===clipId&&item.facing===facing&&item.status==='validated');
  if(!definition||!clip||clip.frames.length!==proof.frames.length||clip.loop!==proof.loop||clip.ticksPerSecond!==proof.ticksPerSecond||
   definition.bodyHeightPx!==proof.bodyHeightPx||JSON.stringify(definition.pageBodyHeightPx??null)!==JSON.stringify(proof.pageBodyHeightPx))continue;
  if(!clip.frames.every((frame,i)=>{
   const old=proof.frames[i],page=definition.atlas.pages.find(item=>item.id===frame.pageId),source=proof.sourcePages.find(item=>item.id===frame.pageId);
   return page&&source&&page.src===source.src&&page.width===source.width&&page.height===source.height&&
    JSON.stringify(page.transparency)===JSON.stringify(source.transparency)&&frame.pageId===old.pageId&&
    JSON.stringify(frame.rect)===JSON.stringify(old.rect)&&JSON.stringify(frame.pivot)===JSON.stringify(old.pivot)&&frame.durationTicks===old.durationTicks;
  }))continue;
  return {atlasId:proof.atlasId,distinctDrawings:proof.distinctDrawings,minimumDistinctDrawings:proof.minimumDistinctDrawings,
   nativeCountTargetReached:proof.nativeCountTargetReached,status:proof.nativeCountTargetReached?'native-count-reached':'partial-native',
   oneToOneCertified:false as const,fluidityCertified:false as const};
 }
 return null;
}
