import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { build } from 'esbuild';
const manifest=JSON.parse(await readFile(new URL('../app/game/data/pitUserHuntersV44.json',import.meta.url),'utf8'));
const bundle=await build({stdin:{contents:['pitUserRoster','pitCombat','pitRosterExpansion','pitReplay','pitFirstEdition'].map(n=>`export * from './app/game/systems/${n}';`).join('\n')+"\nexport * from './app/game/pitCombatBitmapArt';",resolveDir:process.cwd(),loader:'ts'},bundle:true,write:false,platform:'node',format:'esm',logLevel:'silent'});
const p=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
test('every supplied identity and appearance resolves to the registered combat owner',()=>{
 assert.equal(manifest.schemaVersion,1);assert(manifest.fighters.length>100);
 assert.equal(new Set(manifest.fighters.map(f=>f.id)).size,manifest.fighters.length);
 for(const entry of manifest.fighters){
  assert(p.PIT_FIGHTERS[entry.id],entry.id);assert(p.PIT_VERSUS_FIGHTER_IDS.includes(entry.id),entry.id);assert(entry.variants.length>0,entry.id);
  assert.equal(new Set(entry.variants.map(v=>v.id)).size,entry.variants.length,entry.id);
  assert.equal(p.getPitFighterVariants(entry.id).length,entry.variants.length,entry.id);
  for(const variant of entry.variants){
   const match=p.createPitCombatState(entry.id,entry.id==='jungle-hunter'?'city-hunter':'jungle-hunter',{variants:[variant.id,null]});
   assert.equal(match.fighters[0].variantId,variant.id);
   assert.deepEqual(p.deserializePitCombat(p.serializePitCombat(match)),match);
   assert.equal(p.rematchPitCombat(match).fighters[0].variantId,variant.id);
   assert.equal(p.getPitUserVariant(entry.id,variant.id).sha256,variant.sha256);
  }
 }
});
test('every new supplied hunter can finish a real deterministic duel without modifying first-edition progression',()=>{
 assert.equal(p.PIT_FIRST_EDITION_FIGHTER_IDS.length,12);
 for(const id of p.PIT_USER_FIGHTER_IDS){
  assert(p.PIT_VERSUS_FIGHTER_IDS.includes(id));
  let state=p.createPitCombatState(id,'jungle-hunter');
  for(let tick=0;tick<10000&&state.phase!=='match-over';tick++){
   const[a,b]=state.fighters;const inputs=state.phase!=='round'?[{},{}]:b.x-a.x>60?[{right:true},{}]:b.phase!=='knockdown'&&b.wakeInvulnerabilityFrames===0&&a.phase==='idle'?[{attack:'heavy'},{}]:[{},{}];
   state=p.stepPitCombat(state,inputs);
  }
  assert.equal(state.phase,'match-over',id);assert.equal(state.matchWinnerId,id,id);
  assert.equal(state.fighters[0].variantId,p.getPitFighterVariants(id)[0].id,id);
 }
});
test('supplied chronicle bosses appear once in free duels without becoming progression fighters',()=>{
 for(const id of p.PIT_CHRONICLE_BOSS_IDS){
  assert.equal(p.PIT_VERSUS_FIGHTER_IDS.filter(candidate=>candidate===id).length,1);
  for(const mode of ['cpu','local','training'])assert(p.canPitFighterEnterMode(id,mode));
  for(const mode of ['arcade','circuit','descent'])assert.equal(p.canPitFighterEnterMode(id,mode),false);
  assert.equal(p.PIT_PLAYABLE_FIGHTER_IDS.includes(id),false);
  assert.equal(p.PIT_FIRST_EDITION_FIGHTER_IDS.includes(id),false);
  assert.equal(p.getPitFighterProfile(id).runtimeStatus,'chronicle-boss');
 }
});
test('all supplied static source rectangles remain inside measured camera bounds in both facings',()=>{
 for(const entry of manifest.fighters)for(const variant of entry.variants){
  const art=p.getPitCombatBitmapArtDefinition(entry.id,variant.id);
  assert.equal(art.kind,'static-bitmap');assert.equal(art.src,variant.src);
  assert(Number.isFinite(art.pivot[0])&&art.pivot[0]>0&&art.pivot[0]<art.width,variant.id);
  assert(Number.isFinite(art.pivot[1])&&art.pivot[1]>art.bodyTopY&&art.pivot[1]<=art.height,variant.id);
  assert(Number.isFinite(art.bodyTopY)&&art.bodyTopY>=0,variant.id);
  for(const facing of [-1,1]){
   const fighter={...p.createPitCombatState(entry.id,entry.id==='jungle-hunter'?'city-hunter':'jungle-hunter',{variants:[variant.id,null]}).fighters[0],x:350,y:23,facing};
   const bitmap={complete:true,naturalWidth:art.width,naturalHeight:art.height};
   const bank={images:new Map([[entry.id,bitmap]]),requestedIds:new Set([entry.id]),readyIds:new Set([entry.id]),failedIds:new Set(),variants:new Map([[entry.id,variant.id]]),cancelled:false};
   let translate,scale,rectangle;
   const context={globalAlpha:1,save(){},restore(){},translate(x,y){translate=[x,y];},scale(x,y){scale=[x,y];},drawImage(image,...rect){assert.equal(image,bitmap);rectangle=rect;}};
   assert(p.drawPitCombatBitmapFighter(context,bank,fighter,500),variant.id);
   const actual={x:translate[0]+Math.min(rectangle[0]*scale[0],(rectangle[0]+rectangle[2])*scale[0]),y:translate[1]+rectangle[1]*scale[1],width:Math.abs(rectangle[2]*scale[0]),height:rectangle[3]*scale[1]};
   const bounds=p.getPitCombatBitmapVisualBounds(fighter,500,[]);
   for(const key of ['x','y','width','height'])assert(Math.abs(actual[key]-bounds[key])<1e-7,variant.id+' '+key);
   assert.equal(scale[0]>0,art.nativeFacing==='neutral'||(art.nativeFacing==='right'?facing===1:facing===-1),variant.id+' mirror');
   assert.equal(translate[1],500-fighter.y,variant.id+' jump support');
   assert.equal(rectangle[1],-art.pivot[1],variant.id+' foot pivot');
  }
 }
});