import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs/promises';
import sharp from 'sharp';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
const result=await build({stdin:{contents:'export * from "./app/game/systems/pitCharacterStages"; export * from "./app/game/systems/pitLoreStages"; export * from "./app/game/systems/pitScreenArenas"; export * from "./app/game/pitArenaLife"; export * from "./app/game/pitArenaLifeRendering"; export * from "./app/game/systems/pitRosterExpansion"; export { createPitCombatState, serializePitCombat } from "./app/game/systems/pitCombat";',resolveDir:process.cwd()},bundle:true,write:false,format:'esm',platform:'node',logLevel:'silent'});
const api=await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));

test('all 195 identities receive an explicit stage association or a reason; variants do not inflate coverage',()=>{
 const coverage=api.PIT_CHARACTER_STAGE_COVERAGE;
 assert.equal(coverage.length,195);assert.equal(new Set(coverage.map(c=>c.fighterId)).size,195);
 assert.deepEqual(coverage.map(c=>c.fighterId),api.PIT_VERSUS_FIGHTER_IDS);
 assert(coverage.every(c=>c.reason.length>15&&c.exactGeometryCertified===false));
 assert.equal(api.getPitCharacterStageAssociation('constructor'),null);
 assert.equal(api.getPitCharacterStageAssociation('user-fake'),null);
 assert.equal(api.getPitCharacterStageAssociation('theta').stageId,null);
 assert.equal(api.getPitCharacterStageAssociation('user-ahab').coverage,'reference-needed');
});
test('Scarface and the Machiko cycle get two dedicated settings with primary evidence, without changing V43 works',()=>{
 assert.equal(api.PIT_LORE_STAGE_DEFINITIONS.length,2);
 assert.equal(api.getPitCharacterStageAssociation('scarface').stageId,'arena-137-concrete-jungle-neonopolis');
 for(const id of ['machiko-noguchi','user-broken-tusk'])assert.equal(api.getPitCharacterStageAssociation(id).stageId,'arena-138-avp-ryushi-prosperity-wells');
 assert(api.PIT_LORE_STAGE_DEFINITIONS.every(s=>/^https:\/\/(store\.necaonline\.com|titanbooks\.com)\//.test(s.sourceUrl)));
 assert.equal(api.PIT_SCREEN_ARENA_DEFINITIONS.length,36);assert.equal(api.PIT_SCREEN_ARENA_WORKS.length,12);
 assert.equal(api.getPitScreenArenaMetadata('arena-138-avp-ryushi-prosperity-wells').kind,'comic');
});
test('cosmetic classes use shared game venue, while unknown supplied images never acquire an invented canon location',()=>{
 assert.equal(api.getPitCharacterStageAssociation('user-bionic-phg').coverage,'cosmetic-no-exclusive-location');
 assert.equal(api.getPitCharacterStageAssociation('user-yuahro').stageId,null);
 assert.equal(api.getPitCharacterStageAssociation('user-yuahro').coverage,'identity-unverified');
});
test('background cast is explicit and culturally scoped: colony humans only on Ryushi, Yautja only original exhibition arenas',()=>{
 assert.equal(api.getPitArenaLifeCast('arena-138-avp-ryushi-prosperity-wells')[0].sheetId,'colony-watchers');
 assert.equal(api.getPitArenaLifeCast('arena-137-concrete-jungle-neonopolis').length,0);
 for(const stage of api.PIT_SCREEN_ARENA_DEFINITIONS)assert.equal(api.getPitArenaLifeCast(stage.id).length,0,'No invented film crowd');
 assert(api.PIT_ARENA_LIFE_SHEETS.every(s=>!s.src.includes('fighters')&&!s.src.includes('hunter')));
});
test('six native poses advance only by simulation ticks; pause is stable and reduced motion always holds pose zero',()=>{
 assert.deepEqual([0,19,20,39,40,60,80,100,119,120].map(f=>api.getPitArenaLifeFrame(f)),[0,0,1,1,2,3,4,5,5,0]);
 for(const f of [0,20,100,1000,NaN,Infinity,-5])assert.equal(api.getPitArenaLifeFrame(f,41,true),0);
 assert.equal(api.getPitArenaLifeFrame(82),api.getPitArenaLifeFrame(82));
 assert.equal(api.getPitArenaLifeFrame(Infinity),0);
});
test('invalid grids are rejected, not silently stretched or treated as animation',()=>{
 assert(api.isPitArenaLifeSheetSize(1536,1024));
 for(const [w,h] of [[1024,1024],[1535,1024],[0,0],[NaN,1024],[1536,1000]])assert.equal(api.isPitArenaLifeSheetSize(w,h),false);
});
function context(){const calls=[];return {calls,globalAlpha:1,save(){calls.push(['save']);},restore(){calls.push(['restore']);},translate(...p){calls.push(['translate',...p]);},scale(...p){calls.push(['scale',...p]);},drawImage(...p){calls.push(['draw',...p]);}};}
test('P3 renderer uses source-cell changes and authored foot pivots, never translates a static pose as animation',()=>{
 const sheet=api.PIT_ARENA_LIFE_SHEETS[0],images=new Map([[sheet.src,{naturalWidth:1536,naturalHeight:1024}]]);
 const input={arenaId:'arena-138-avp-ryushi-prosperity-wells',frame:0,groundY:430,images,transform:()=>({scale:1,translateX:0,translateY:0})};
 const before=context(),after=context();const a=api.drawPitArenaLife(before,input),b=api.drawPitArenaLife(after,{...input,frame:20});
 assert.equal(a.actorsDrawn,1);assert.equal(b.actorsDrawn,1);assert.deepEqual(a.nativeFrames,[0]);assert.deepEqual(b.nativeFrames,[1]);
 assert.deepEqual(before.calls.find(c=>c[0]==='translate'),after.calls.find(c=>c[0]==='translate'));
 const drawA=before.calls.find(c=>c[0]==='draw'),drawB=after.calls.find(c=>c[0]==='draw');
 assert.equal(drawA[2],0);assert.equal(drawB[2],512);assert.equal(drawA[3],0);assert.equal(drawA[4],512);
 assert.equal(drawA[7]+92*sheet.nativePivots[0][1]/512,0,'Native feet anchor exactly at background contact horizon');
});
test('missing and malformed life bitmap is exposed; unknown scenes draw nothing',()=>{
 const input={arenaId:'arena-138-avp-ryushi-prosperity-wells',frame:20,groundY:430,images:new Map(),transform:()=>({scale:1,translateX:0,translateY:0})};
 const missing=api.drawPitArenaLife(context(),input);assert.equal(missing.actorsDrawn,0);assert.deepEqual(missing.missingPaths,[api.PIT_ARENA_LIFE_SHEETS[0].src]);
 assert.equal(api.drawPitArenaLife(context(),{...input,arenaId:'the-pit'}).actorsDrawn,0);
});
test('rendering keeps replay and save-neutral combat snapshots unchanged',()=>{
 const state=api.createPitCombatState('jungle-hunter','city-hunter',{mode:'match'}),before=api.serializePitCombat(state);
 api.drawPitArenaLife(context(),{arenaId:'arena-016-terrasse-des-jeunes-sangs',frame:state.frame,groundY:430,images:new Map(),transform:()=>({scale:.8,translateX:10,translateY:15})});
 assert.equal(api.serializePitCombat(state),before);
});
test('reviewed native sheets exist as six distinct drawings with an alpha channel and no opaque grid margin',async()=>{
 for(const sheet of api.PIT_ARENA_LIFE_SHEETS.filter(s=>s.reviewed)){
  const image=sharp(await fs.readFile('public'+sheet.src)),meta=await image.metadata();assert(meta.hasAlpha);assert(api.isPitArenaLifeSheetSize(meta.width,meta.height));
  const cell=meta.width/3,hashes=[];
  for(let i=0;i<6;i++){const bytes=await image.clone().extract({left:i%3*cell,top:Math.floor(i/3)*cell,width:cell,height:cell}).raw().toBuffer();hashes.push(createHash('sha256').update(bytes).digest('hex'));
   const pivot=sheet.nativePivots?.[i];assert(pivot&&pivot[0]>0&&pivot[0]<cell&&pivot[1]>0&&pivot[1]<=cell);
  }assert.equal(new Set(hashes).size,6);
 }
});

test('the two new stage crates anchor their visible alpha silhouette, not invisible generation residue',async()=>{
 const manifest=JSON.parse(await fs.readFile('art-source/v33/pit-arenas/production-manifest.json','utf8'));
 for(const stage of manifest.stages.filter(s=>[137,138].includes(s.number))){
  const asset=stage.planes.find(p=>p.id==='P3').assets.find(a=>a.id==='p3-utility-case');assert(asset.anchorToGround);
  const {data,info}=await sharp('public'+asset.frames[0].path).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  let left=info.width,top=info.height,right=-1,bottom=-1;
  for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++)if(data[(y*info.width+x)*4+3]>=16){left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y);}
  assert.equal(asset.sourceCrop,undefined,'A library alias must preserve its owner crop');
  const source=asset.frames[0].generation.contentBounds;
  assert.deepEqual({x:left,y:top,width:right-left+1,height:bottom-top+1},{x:44,y:224,width:1686,height:448});
  for(const p of asset.placements){const fit=Math.min(p.width/source.width,p.height/source.height);assert(Math.abs(p.y+p.height-(source.y+source.height-bottom-1)*fit-430)<.00001,'Placement corrects measured native alpha residue, never an arbitrary screen height');}
 }
});
