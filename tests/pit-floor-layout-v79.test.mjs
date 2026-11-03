import test from 'node:test';
import assert from 'node:assert/strict';
import {homeworldQaModelV64} from '../scripts/homeworld-qa-model-v64.mjs';
const api=homeworldQaModelV64(process.cwd(),['pitCombat.ts','pitCamera.ts','../pitArenaRendering.ts','../pitArenaProduction.ts','../pitStageCompositionV65.ts','../pitStageLayoutV79.ts']);
const v65Ids=api.PIT_STAGE_COMPOSITION_V65.stages.map(s=>s.stageId);
const near=(a,b)=>assert(Math.abs(a-b)<1e-9,`${a} != ${b}`);
function actualBackdrop(id,zoom=1,reducedMotion=false,legacy=false){
 const kit=api.resolvePitArenaProductionKit(id),state=api.createPitCombatState('city-hunter','scar',{arenaId:id}),before=JSON.stringify(state);
 const imageEntries=kit.planes.flatMap(p=>p.assets.flatMap(a=>a.frames.map(f=>[f.path,{src:f.path,naturalWidth:f.generation.width,naturalHeight:f.generation.height}])));
 if(legacy){const art=api.PIT_ARENA_ART_DEFINITIONS[id];imageEntries.push([art.floor.src,{src:art.floor.src,naturalWidth:2172,naturalHeight:724}]);for(const plane of Object.values(art.planes))for(const a of plane)imageEntries.push([a.src,{src:a.src,naturalWidth:100,naturalHeight:100}]);}
 const images=new Map(imageEntries),bank={arenaId:id,images,requestedPaths:new Set(images.keys()),failedPaths:new Set(),cancelled:false,...(!legacy?{productionKit:kit}:{})};
 const calls=[],stack=[];let clip=null,lastRect=null;
 const context={globalAlpha:1,save(){stack.push({clip,alpha:this.globalAlpha});},restore(){const last=stack.pop();clip=last.clip;this.globalAlpha=last.alpha;},translate(){},scale(){},fillRect(){},beginPath(){},rect(x,y,width,height){lastRect={x,y,width,height};},clip(){clip=lastRect;},drawImage(...args){calls.push({args,clip});}};
 const camera={arenaId:id,frame:0,mode:reducedMotion?'fixed':'follow',centerX:480,centerY:270,zoom,targetZoom:zoom};
 api.drawPitArenaBackdrop(context,state,camera,bank,{reducedMotion});assert.equal(JSON.stringify(state),before);
 return{kit,calls,camera,state};
}
const matches=(call,asset)=>{const s=asset.sourceCrop??asset.frames[0].generation.contentBounds,a=call.args;return a[0].src===asset.frames[0].path&&a.length===9&&a[1]===s.x&&a[2]===s.y&&a[3]===s.width&&a[4]===s.height;};

test('only six provenance-applied V65 floor corrections gain explicit height; historical crops retain width sizing',()=>{
 let corrected=0;
 for(const stage of api.PIT_ARENA_PRODUCTION_MANIFEST.stages){
  const id=stage.legacyRuntimeArenaId??stage.runtimeExtension?.arenaId,kit=api.resolvePitArenaProductionKit(id);assert(kit);
  for(const asset of kit.planes.find(p=>p.id==='P4').assets.filter(a=>a.mode==='repeat-x')){
   const placement=asset.placements[0],source=asset.sourceCrop??asset.frames[0].generation.contentBounds,size=api.getPitFloorTileSizeV79(asset,placement,source,kit);assert(size);
   if(v65Ids.includes(stage.catalogueId)){assert.equal(size.heightAuthority,'v65-height');near(size.height,35);corrected++;}
   else{assert.equal(size.heightAuthority,'legacy-width');near(size.width,placement.width);}
   near(size.width/source.width,size.height/source.height);
  }
 }
 assert.equal(corrected,6);
 const kit=api.resolvePitArenaProductionKit(v65Ids[0]),asset=kit.planes.find(p=>p.id==='P4').assets.find(a=>a.mode==='repeat-x');
 const unapplied={...kit,planes:kit.planes.map(p=>p.id==='P0'?{...p,assets:p.assets.map(a=>({...a,id:'historical-p0'}))}:p)};
 assert.equal(api.getPitFloorTileSizeV79(asset,asset.placements[0],asset.sourceCrop,unapplied).heightAuthority,'legacy-width');
});

test('actual renderer draws the six corrected contact floors at35 times camera scale without changing combat',()=>{
 for(const id of v65Ids)for(const zoom of [.8,1,1.95])for(const reduced of [false,true]){
  const {kit,calls}=actualBackdrop(id,zoom,reduced),floor=kit.planes.find(p=>p.id==='P4').assets.find(a=>a.mode==='repeat-x');
  const drawn=calls.filter(c=>!c.clip&&matches(c,floor));assert(drawn.length>0);
  for(const call of drawn){near(call.args[8],35*zoom);near((call.args[7]-.5)/call.args[3],call.args[8]/call.args[4]);}
 }
 for(const id of ['the-pit','arena-140-bad-blood-pine-barrens']){
  const {kit,calls}=actualBackdrop(id),floor=kit.planes.find(p=>p.id==='P4').assets.find(a=>a.mode==='repeat-x'),source=floor.sourceCrop??floor.frames[0].generation.contentBounds;
  for(const call of calls.filter(c=>!c.clip&&matches(c,floor)))near(call.args[8],floor.placements[0].width*source.height/source.width);
 }
});

test('rear material occupies384..430 before every P1 actor/prop, never reuses front fascias and restores clipping',()=>{
 for(const id of [...v65Ids,'the-pit'])for(const zoom of [.8,1,1.95]){
  const {kit,calls,camera,state}=actualBackdrop(id,zoom),arena=api.PIT_ARENAS[id],ground=api.getPitArenaLayerTransform(id,'P4',camera),band=api.getPitStageRearGroundBandV79(arena,ground);
  near(band.height,46*zoom);near(band.top,384*zoom+ground.translateY);near(band.bottom,430*zoom+ground.translateY);
  const floor=kit.planes.find(p=>p.id==='P4').assets.find(a=>a.mode==='repeat-x'),rear=calls.filter(c=>c.clip&&matches(c,floor));assert(rear.length>0);
  const firstP1=calls.findIndex(c=>kit.planes.find(p=>p.id==='P1').assets.some(a=>matches(c,a)));assert(firstP1>=0);
  for(const c of rear){assert(calls.indexOf(c)<firstP1);near(c.args[6],band.top);near(c.args[8],band.height);assert.deepEqual(c.clip,band.clip);near((c.args[7]-.5)/c.args[3],c.args[8]/c.args[4]);}
  for(const fascia of kit.planes.find(p=>p.id==='P4').assets.filter(a=>a.mode==='strip-x'))assert(!calls.some(c=>c.clip&&matches(c,fascia)));
  assert(calls.some(c=>!c.clip&&matches(c,floor)));assert.equal(state.fighters[0].y,0);
 }
 const legacy=actualBackdrop('the-pit',1,false,true),art=api.PIT_ARENA_ART_DEFINITIONS['the-pit'];
 assert(legacy.calls.some(c=>c.clip&&c.args[0].src===art.floor.src));assert(legacy.calls.some(c=>!c.clip&&c.args[0].src===art.floor.src));
 const outside=api.getPitStageRearGroundBandV79({width:960,height:540,groundY:430},{scale:1,translateX:0,translateY:1000});assert.equal(outside.clip.height,0);
});
