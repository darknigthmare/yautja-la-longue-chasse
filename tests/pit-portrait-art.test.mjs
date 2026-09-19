import assert from 'node:assert/strict';
import test from 'node:test';
import {build} from 'esbuild';
const built=await build({stdin:{contents:"export * from './app/game/pitPortraitArt';export {PIT_SPRITE_SHEET_REGISTRY} from './app/game/pitSpriteSheetRegistry';export {validateHunterSpriteAtlas} from './app/game/hunterSpriteAtlas';",resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'esm',write:false,logLevel:'silent'});
const p=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));
const ids=['tracker','greyback','theta','machiko-noguchi'];
test('portrait registry keeps only requested authored idle clips and their validated page references',()=>{
 const before=JSON.stringify(p.PIT_SPRITE_SHEET_REGISTRY);
 for(const id of ids)for(const facing of ['left','right']){
  const definitions=p.pitPortraitAnimationRegistry(id,facing,p.PIT_SPRITE_SHEET_REGISTRY);assert(definitions.length>0);
  for(const definition of definitions){
   assert.equal(definition.fighterId,id);assert(p.validateHunterSpriteAtlas(definition.atlas).valid);
   assert(definition.atlas.clips.every(clip=>clip.id==='idle'&&clip.facing===facing&&clip.status==='validated'));
   const used=new Set(definition.atlas.clips.flatMap(clip=>clip.frames.map(frame=>frame.pageId)));
   assert.equal(definition.atlas.pages.length,used.size);assert(definition.atlas.pages.every(page=>used.has(page.id)));
   assert(Object.keys(definition.pageBodyHeightPx||{}).every(id=>used.has(id)));
  }
 }
 assert.equal(JSON.stringify(p.PIT_SPRITE_SHEET_REGISTRY),before,'combat registry unchanged');
});
test('four extension icons avoid decoding combat-only pages; missing authored side remains unavailable',()=>{
 const pixels=entries=>entries.reduce((sum,entry)=>sum+entry.atlas.pages.reduce((sum,page)=>sum+page.width*page.height*4,0),0);
 const full=p.PIT_SPRITE_SHEET_REGISTRY.filter(entry=>ids.includes(entry.fighterId));
 const idle=ids.flatMap(id=>p.pitPortraitAnimationRegistry(id,'right',p.PIT_SPRITE_SHEET_REGISTRY));
 assert.equal(idle.reduce((sum,entry)=>sum+entry.atlas.pages.length,0),4);assert(pixels(idle)<=pixels(full)/5);
 const partial=structuredClone(idle);assert.deepEqual(p.pitPortraitAnimationRegistry('tracker','left',partial),[],'never mirror an unavailable orientation');
});
