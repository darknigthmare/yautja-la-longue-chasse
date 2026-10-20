import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {build} from 'esbuild';
import sharp from 'sharp';

const root=fileURLToPath(new URL('..',import.meta.url));
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const built=await build({stdin:{contents:`export * from './app/game/pitWorkbookAnimationV100.ts';
 export * from './app/game/pitWorkbookCombatRegistryV100.ts'; export * from './app/game/pitSpriteSheetAnimation.ts';
 export * from './app/game/pitSpriteSheetRegistry.ts'; export * from './app/game/hunterSpriteAtlas.ts';
 export {getSpriteContact} from './app/game/spriteContact.ts';
 export {createPitCombatState,stepPitCombat,getPitCombatFighterDefinition} from './app/game/systems/pitCombat.ts';`,resolveDir:root},bundle:true,platform:'node',format:'esm',write:false,logLevel:'silent'});
const api=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));
const native=api.getPitWorkbookNativeV100('feral-hunter','M_F006_5L');
assert.ok(native);
const definition=native.definition;
const page=definition.atlas.pages[0];
const sourceBytes=await readFile(path.join(root,'public',page.src));
const {data,info}=await sharp(sourceBytes).ensureAlpha().raw().toBuffer({resolveWithObject:true});
const decoded={pixels:new Uint8ClampedArray(data),width:info.width,height:info.height};
const decodedByUrl=new Map([[page.src,decoded]]);
function crop(pixels,width,[x,y,w,h]){
 const result=new Uint8ClampedArray(w*h*4);
 for(let row=0;row<h;row++)result.set(pixels.subarray(((y+row)*width+x)*4,((y+row)*width+x+w)*4),row*w*4);
 return result;
}
const previous={Image:globalThis.Image,document:globalThis.document},requests=[];
globalThis.Image=class{
 set src(value){if(!value)return;requests.push(value);const source=decodedByUrl.get(value);if(!source){queueMicrotask(()=>this.onerror?.());return;}
  Object.assign(this,source);this.complete=true;this.naturalWidth=source.width;this.naturalHeight=source.height;queueMicrotask(()=>this.onload?.());}
};
globalThis.document={createElement(){const canvas={width:0,height:0,pixels:null};canvas.getContext=()=>({
 clearRect(){canvas.pixels=new Uint8ClampedArray(canvas.width*canvas.height*4);},
 drawImage(image,...args){const rect=args.length===8?args.slice(0,4):[0,0,image.width,image.height];
  assert.deepEqual(rect.slice(2),[canvas.width,canvas.height],'PNG readback never resizes source art');canvas.pixels=crop(image.pixels,image.width,rect);},
 getImageData(){return{data:canvas.pixels.slice()};},putImageData(value){canvas.pixels=value.data.slice();}});return canvas;}};
test.after(()=>Object.assign(globalThis,previous));
const bank=await api.loadPitSpriteSheetAnimations(['feral-hunter'],[definition]);
function inspect(facing,index){const timeline=api.getPitWorkbookTimelineV100(native,facing),frame=timeline[index];
 return api.resolvePitSpriteSheetInspectionV100(bank,{fighterId:'feral-hunter',atlasId:definition.atlas.id,clipId:frame.clipId,facing,elapsedTicks:frame.nativeTick});}
function context(){const calls=[],forbidden=()=>assert.fail('Native body art cannot mirror, rotate or transform');return{calls,globalAlpha:1,
 save(){},restore(){},drawImage(...args){calls.push(args);},scale:forbidden,rotate:forbidden,transform:forbidden,setTransform:forbidden,translate:forbidden};}

test('V54 extraction preserves the exact52 cell identities and proposed timings without certifying mechanics',async()=>{
 const plan=api.PIT_WORKBOOK_PLAN_V100;
 assert.equal(hash(await readFile(path.join(root,plan.source.extractionPath))),plan.source.extractionSha256);
 assert.equal(plan.source.originalAvailable,false);
 assert.equal(new Set(api.PIT_WORKBOOK_ADMISSIONS_V100.map(entry=>JSON.stringify([entry.fighterId,entry.actionId,entry.appearanceId]))).size,api.PIT_WORKBOOK_ADMISSIONS_V100.length);
 assert.ok(api.PIT_WORKBOOK_ADMISSIONS_V100.every(entry=>api.getPitWorkbookActionV100(entry.fighterId,entry.actionId)),'every admitted gesture keeps one exact source identity');
 assert.deepEqual(plan.fighters.map(item=>[item.fighterId,item.sourceRow,item.actions.length]),[['feral-hunter',10,26],['scar',7,26]]);
 for(const fighter of plan.fighters){
  assert.equal(new Set(fighter.actions.map(action=>action.id)).size,26);
  const moves=fighter.actions.filter(action=>action.category==='move'),presentations=fighter.actions.filter(action=>action.category==='presentation');
  assert.deepEqual(moves.map(action=>action.cell),Array.from({length:18},(_,i)=>String.fromCharCode(68+i)+fighter.sourceRow));
  assert.equal(presentations.length,8);assert.ok(fighter.actions.every(action=>action.sourceText.length>0));
  const superAction=moves.find(action=>action.key==='SUPER');
  assert.equal(api.getPitWorkbookCombatLinkV100(fighter.fighterId,superAction).status,'source-choreography-not-linked');
  const unlinkedMoves=moves.filter(action=>['TH_F','TH_B','6M','S2','S4','EQUIP'].includes(action.key));
  assert.equal(unlinkedMoves.length,6,'both source throws and the other unsupported commands are actually checked');
  for(const action of unlinkedMoves)
   assert.equal(api.getPitWorkbookCombatLinkV100(fighter.fighterId,action).clipIds.length,0);
 }
 const scar=plan.fighters[1];
 assert.equal(api.getPitWorkbookCombatLinkV100('scar',scar.actions.find(action=>action.key==='5M')).status,'source-choreography-not-linked');
 assert.equal(api.getPitWorkbookCombatLinkV100('scar',scar.actions.find(action=>action.key==='5H')).status,'source-choreography-not-linked');
 assert.equal(api.getPitCombatFighterDefinition(api.createPitCombatState('feral-hunter','scar').fighters[0]).attacks.light.startup,4);
});

test('admitted aerial light uses real jump altitude and preserves the authored virtual pelvis anchors',async()=>{
 const entry=api.getPitWorkbookNativeV100('feral-hunter','M_F006_jL');assert.ok(entry);
 for(const sourcePage of entry.definition.atlas.pages){const result=await sharp(await readFile(path.join(root,'public',sourcePage.src))).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  decodedByUrl.set(sourcePage.src,{pixels:new Uint8ClampedArray(result.data),width:result.info.width,height:result.info.height});}
 const selectedBank=await api.loadPitSpriteSheetAnimations(['feral-hunter'],[entry.definition]);assert.deepEqual(selectedBank.failedAtlasIds,[]);
 for(const facing of ['right','left']){
  let state=api.createPitCombatState('feral-hunter','scar',{mode:'training'});
  state.fighters[0].x=facing==='right'?200:760;state.fighters[1].x=facing==='right'?760:200;state.fighters[0].facing=facing==='right'?1:-1;
  state=api.stepPitCombat(state,[{jump:true},{}]);assert.equal(state.fighters[0].grounded,false);
  const timing=api.getPitCombatFighterDefinition(state.fighters[0]).attacks.light,phases={startup:0,active:0,recovery:0};
  for(let tick=0;tick<timing.startup+timing.active+timing.recovery;tick++){
   state=api.stepPitCombat(state,[tick===0?{attack:'light'}:{},{}]);const fighter=state.fighters[0];
   assert.ok(fighter.y>0);assert.equal(fighter.grounded,false);assert.ok(fighter.phase in phases);phases[fighter.phase]++;
   const before=JSON.stringify(state),options={simulationFrame:state.frame,combat:state};
   const sample=api.resolvePitSpriteSheetAnimation(selectedBank,fighter,options);assert.ok(sample);
   assert.equal(sample.resolved.frame.clip.id,'pit.air.light.'+fighter.phase);assert.equal(sample.resolved.frame.clip.facing,facing);
   const frame=sample.resolved.frame.frame,contact=api.getSpriteContact(sample.source,frame.rect,frame.pivot[1]);assert.ok(contact);
   assert.equal(contact.offsetY,0,'a deliberate gap under folded feet is never snapped to the floor');
   const ctx=context();assert.equal(api.drawPitSpriteSheetAnimation(ctx,selectedBank,fighter,440,options),true);
   const reference=entry.definition.pageBodyHeightPx[frame.pageId],scale=api.getPitCombatFighterDefinition(fighter).bodyHeight/reference;
   assert.equal(ctx.calls[0][6],440-fighter.y-frame.pivot[1]*scale);
   assert.equal(JSON.stringify(state),before,'art leaves real altitude, collisions and replay state unchanged');
  }
  assert.deepEqual(phases,{startup:timing.startup,active:timing.active,recovery:timing.recovery});
 }
});

test('admitted Feral5L uses six original alpha-contained drawings and one standing body reference',async()=>{
 assert.equal(hash(sourceBytes),native.admission.review.sourceSha256);
 assert.deepEqual(await readFile(path.join(root,'art-source/v100/pit/feral/intake/001-normals-5l-5m.png')),sourceBytes);
 assert.equal((await sharp(sourceBytes).metadata()).hasAlpha,true);
 assert.equal(definition.bodyHeightPx,246);assert.equal(definition.variantId,undefined);
 assert.equal(api.validateHunterSpriteAtlas(definition.atlas).valid,true);
 assert.deepEqual(bank.failedAtlasIds,[]);
 const processed=api.processHunterSpriteTransparency(decoded.pixels,info.width,info.height,page.transparency),drawings=new Set();
 for(const facing of ['right','left']){
  const timeline=api.getPitWorkbookTimelineV100(native,facing);assert.equal(timeline.length,3);
  assert.deepEqual(timeline.map(frame=>frame.durationTicks60),[5,3,10]);
  for(let index=0;index<3;index++){
   const result=inspect(facing,index);assert.ok(result);assert.equal(result.frame.frameIndex,index);
   const pixels=crop(processed.pixels,info.width,result.frame.frame.rect),[, ,width,height]=result.frame.frame.rect;
   const canonical=Buffer.from(pixels);let visible=0;
   for(let row=0;row<height;row++)for(let column=0;column<width;column++){
    const offset=(row*width+column)*4;
    if(pixels[offset+3]){visible++;assert.ok(row>0&&column>0&&row<height-1&&column<width-1,'true alpha gutters isolate each admitted drawing');}
    else canonical.fill(0,offset,offset+4);
   }
   assert.ok(visible>1000);drawings.add(hash(canonical));
  }
 }
 assert.equal(drawings.size,6,'both sides contain independently drawn art');
 assert.equal(hash(await readFile(path.join(root,'public',page.src))),hash(sourceBytes));
});

test('inspection draws the exact authored cells at a fixed scale without mutating a duel or observation cursor',()=>{
 const state=api.createPitCombatState('feral-hunter','scar',{mode:'training'}),fighter=state.fighters[0];
 Object.assign(fighter,{phase:'startup',action:{kind:'attack',attack:'light',frame:0,connected:false}});
 const before=JSON.stringify(state),options={simulationFrame:0,combat:state};
 const combatBefore=api.resolvePitSpriteSheetAnimation(bank,fighter,options);assert.ok(combatBefore);
 for(const facing of ['right','left'])for(let index=0;index<3;index++){
  const result=inspect(facing,index),ctx=context();
  assert.equal(api.drawPitWorkbookFrameV100(ctx,bank,native,facing,index,480,460),true);
  assert.equal(ctx.calls.length,1);assert.equal(ctx.calls[0][0],result.source);
  assert.deepEqual(ctx.calls[0].slice(1,5),result.frame.frame.rect);
  const scale=api.getPitCombatFighterDefinition(fighter).bodyHeight/246;
  assert.equal(ctx.calls[0][7],result.frame.frame.rect[2]*scale);assert.equal(ctx.calls[0][8],result.frame.frame.rect[3]*scale);
  assert.equal(ctx.imageSmoothingEnabled,false);
 }
 assert.equal(JSON.stringify(state),before);
 assert.deepEqual(api.resolvePitSpriteSheetAnimation(bank,fighter,options).resolved.frame.frame,combatBefore.resolved.frame.frame);
 assert.equal(api.drawPitWorkbookFrameV100(context(),bank,native,'right',-1,480,460),false);
 assert.equal(api.drawPitWorkbookFrameV100(context(),bank,native,'right',3,480,460),false);
});

test('native training light retains the actual4/3/9 simulation phases in both orientations',()=>{
 for(const facing of ['right','left']){
  let state=api.createPitCombatState('feral-hunter','scar',{mode:'training'});
  state.fighters[0].x=facing==='right'?200:760;state.fighters[1].x=facing==='right'?760:200;
  state.fighters[0].facing=facing==='right'?1:-1;
  const phases={startup:0,active:0,recovery:0};
  for(let tick=0;tick<18;tick++){
   state=api.stepPitCombat(state,[tick===0?{attack:'light'}:{},{}]);const fighter=state.fighters[0];
   if(!(fighter.phase in phases))continue;
   phases[fighter.phase]++;
   const result=api.resolvePitSpriteSheetAnimation(bank,fighter,{simulationFrame:state.frame,combat:state});
   assert.ok(result);assert.equal(result.definition.atlas.id,definition.atlas.id);
   assert.equal(result.resolved.frame.clip.facing,facing);
   assert.equal(result.resolved.frame.clip.id,'pit.stand.light.'+fighter.phase);
   assert.deepEqual(result.resolved.frame.frame.rect,definition.atlas.clips.find(clip=>clip.id===result.resolved.frame.clip.id&&clip.facing===facing).frames[0].rect);
  }
  assert.deepEqual(phases,{startup:4,active:3,recovery:9});assert.equal(state.fighters[0].phase,'idle');
 }
 const registered=api.PIT_WORKBOOK_COMBAT_REGISTRY_V100.find(entry=>entry.atlas.id===definition.atlas.id);assert.ok(registered);
 assert.ok(registered.atlas.clips.every(clip=>clip.id.startsWith('pit.stand.light.')));
 assert.ok(!api.PIT_SPRITE_SHEET_REGISTRY.some(entry=>entry.atlas.clips.some(clip=>clip.id.startsWith('workbook.'))),'inspection timelines never become gameplay attacks');
});

test('wrong owners, costumes, absent side, fake banks and aborted decode cannot borrow drawings',async()=>{
 const requestStart=requests.length;
 const selection={fighterId:'feral-hunter',atlasId:definition.atlas.id,clipId:native.admission.clipIds[0],facing:'right',elapsedTicks:0};
 for(const override of [{fighterId:'scar'},{variantId:'any-supplied-costume'},{atlasId:'missing'},{facing:'up'},{elapsedTicks:-1},{elapsedTicks:.5}])
  assert.equal(api.resolvePitSpriteSheetInspectionV100(bank,{...selection,...override}),null);
 assert.equal(api.resolvePitSpriteSheetInspectionV100({...bank},selection),null,'only private decoded evidence is trusted');
 const oneSide={...definition,atlas:{...definition.atlas,clips:definition.atlas.clips.filter(clip=>clip.facing==='right')}};
 const sideBank=await api.loadPitSpriteSheetAnimations(['feral-hunter'],[oneSide]);
 assert.equal(api.resolvePitSpriteSheetInspectionV100(sideBank,{...selection,facing:'left'}),null);
 const abort=new AbortController(),abortedBank=await api.loadPitSpriteSheetAnimations(['feral-hunter'],[definition],{signal:abort.signal});
 abort.abort();assert.equal(api.resolvePitSpriteSheetInspectionV100(abortedBank,selection),null);
 const bad=structuredClone(native.admission);bad.definition.variantId='costume';
 assert.equal(api.getPitWorkbookNativeV100('feral-hunter','M_F006_5L',[bad],[]),null);
 bad.definition.variantId=undefined;bad.definition.bodyHeightPx=0;
 assert.equal(api.getPitWorkbookNativeV100('feral-hunter','M_F006_5L',[bad],[]),null);
 assert.deepEqual(requests.slice(requestStart).filter(url=>url!==page.src),[],'selected inspection never requests another fighter or costume');
});

test('every new admitted workbook cycle decodes original PNG pixels with separate sides and clear crop borders',async()=>{
 for(const admission of api.PIT_WORKBOOK_ADMISSIONS_V100.filter(item=>item.definition)){
  const entry=api.getPitWorkbookNativeV100(admission.fighterId,admission.actionId);assert.ok(entry,admission.actionId);
  assert.equal(new Set(entry.definition.atlas.clips.map(clip=>JSON.stringify([clip.id,clip.facing]))).size,entry.definition.atlas.clips.length);
  const pixelsByPage=new Map();
  for(const sourcePage of entry.definition.atlas.pages){
   const bytes=await readFile(path.join(root,'public',sourcePage.src)),decodedPage=await sharp(bytes).ensureAlpha().raw().toBuffer({resolveWithObject:true});
   assert.deepEqual([decodedPage.info.width,decodedPage.info.height],[sourcePage.width,sourcePage.height]);
   assert.equal(hash(bytes),admission.review.sourceHashes?.[sourcePage.src]??admission.review.sourceSha256);
   assert.equal((await sharp(bytes).metadata()).hasAlpha,true);
   const source={pixels:new Uint8ClampedArray(decodedPage.data),width:decodedPage.info.width,height:decodedPage.info.height};
   decodedByUrl.set(sourcePage.src,source);
   pixelsByPage.set(sourcePage.id,api.processHunterSpriteTransparency(source.pixels,source.width,source.height,sourcePage.transparency).pixels);
   assert.ok(sourcePage.transparency.noiseFloor<=2);
  }
  const selectedBank=await api.loadPitSpriteSheetAnimations([admission.fighterId],[entry.definition]);assert.deepEqual(selectedBank.failedAtlasIds,[],admission.actionId);
  const cameras=[[720,400,2.5,350],[960,540,2.8,460]].map(([width,height,zoom,groundY])=>({width,height,...api.getPitWorkbookCameraV100(entry,selectedBank,width,height,zoom,groundY)}));
  for(const camera of cameras)assert.ok(camera.zoom>0&&Number.isFinite(camera.x)&&Number.isFinite(camera.groundY),admission.actionId+' has one finite camera for the entire action');
  const sides=[];
  for(const facing of ['right','left']){
   const timeline=api.getPitWorkbookTimelineV100(entry,facing);
   if(!timeline.length){
    assert.ok(!entry.definition.atlas.clips.some(clip=>admission.clipIds.includes(clip.id)&&clip.facing===facing),admission.actionId+' absent direction stays absent');
    assert.equal(api.drawPitWorkbookFrameV100(context(),selectedBank,entry,facing,0,480,460),false,'never borrow the produced opposite direction');
    continue;
   }
   assert.ok(timeline.length>=3,admission.actionId+' '+facing);
   const drawingHashes=new Set();
   for(let index=0;index<timeline.length;index++){
    const frame=timeline[index],resolved=api.resolvePitSpriteSheetInspectionV100(selectedBank,{fighterId:admission.fighterId,atlasId:admission.atlasId,clipId:frame.clipId,facing,elapsedTicks:frame.nativeTick});
    assert.ok(resolved,admission.actionId+' '+facing+' '+index);assert.equal(resolved.frame.frameIndex,frame.clipFrameIndex);
    const [, ,width,height]=resolved.frame.frame.rect,sourcePixels=pixelsByPage.get(resolved.frame.page.id);
    const pixels=crop(sourcePixels,resolved.frame.page.width,resolved.frame.frame.rect),canonical=Buffer.from(pixels);
    let inkLeft=width,inkTop=height,inkRight=-1,inkBottom=-1;
    for(let y=0;y<height;y++)for(let x=0;x<width;x++){
     const offset=(y*width+x)*4;
     if(!pixels[offset+3])canonical.fill(0,offset,offset+4);
     else{assert.ok(y>0&&x>0&&y<height-1&&x<width-1,admission.actionId+' clear border');inkLeft=Math.min(inkLeft,x);inkTop=Math.min(inkTop,y);inkRight=Math.max(inkRight,x);inkBottom=Math.max(inkBottom,y);}
    }
    drawingHashes.add(hash(canonical));
    const ctx=context();assert.equal(api.drawPitWorkbookFrameV100(ctx,selectedBank,entry,facing,index,0,0),true);
    const [,,,,,dx,dy,dw,dh]=ctx.calls[0],sx=dw/width,sy=dh/height;
    for(const camera of cameras){
     const bounds=[camera.x+(dx+inkLeft*sx)*camera.zoom,camera.groundY+(dy+inkTop*sy)*camera.zoom,camera.x+(dx+(inkRight+1)*sx)*camera.zoom,camera.groundY+(dy+(inkBottom+1)*sy)*camera.zoom];
     assert.ok(bounds[0]>=24-1e-6&&bounds[1]>=24-1e-6&&bounds[2]<=camera.width-24+1e-6&&bounds[3]<=camera.height-24+1e-6,admission.actionId+' '+facing+' '+index+' entire actual artwork fits a constant sequence camera '+JSON.stringify(bounds));
    }
   }
   assert.ok(drawingHashes.size>=3,admission.actionId+' has articulated native drawings per side');sides.push([...drawingHashes]);
  }
  assert.ok(sides.length>=1,admission.actionId+' has at least one actually admitted direction');
  if(sides.length===2)assert.ok(sides[0].every(value=>!sides[1].includes(value)),admission.actionId+' cannot borrow or mirror the other side');
 }
});

test('the newly admitted low strikes follow actual crouching inputs and preserve each historical attack duration',async()=>{
 for(const [fighterId,actionId,attack]of [['feral-hunter','M_F006_2L','light'],['feral-hunter','M_F006_2M','medium'],['feral-hunter','M_F006_2H','heavy'],['scar','M_F003_2L','light'],['scar','M_F003_2M','medium']]){
  const entry=api.getPitWorkbookNativeV100(fighterId,actionId);assert.ok(entry);
  const selectedBank=await api.loadPitSpriteSheetAnimations([fighterId],[entry.definition]);
  for(const facing of ['right','left']){
   let state=api.createPitCombatState(fighterId,fighterId==='scar'?'feral-hunter':'scar',{mode:'training'});
   state.fighters[0].x=facing==='right'?200:760;state.fighters[1].x=facing==='right'?760:200;
   state.fighters[0].facing=facing==='right'?1:-1;
   const timing=api.getPitCombatFighterDefinition(state.fighters[0]).attacks[attack],counts={startup:0,active:0,recovery:0};
   for(let tick=0;tick<timing.startup+timing.active+timing.recovery+2;tick++){
    state=api.stepPitCombat(state,[{down:true,...(tick===0?{attack}:{})},{}]);const fighter=state.fighters[0];
    if(!(fighter.phase in counts))continue;
    assert.equal(fighter.crouching,true);counts[fighter.phase]++;
    const sample=api.resolvePitSpriteSheetAnimation(selectedBank,fighter,{simulationFrame:state.frame,combat:state});assert.ok(sample);
    assert.equal(sample.resolved.frame.clip.id,'pit.crouch.'+attack+'.'+fighter.phase);
    assert.equal(sample.resolved.frame.clip.facing,facing);
   }
   assert.deepEqual(counts,{startup:timing.startup,active:timing.active,recovery:timing.recovery});
  }
 }
});

test('historical guided bolts, shield and retained Scar V34 reference inspect exact original pages while native Scar heavy stays a separate study',async()=>{
 const scarNative=api.getPitWorkbookNativeV100('scar','M_F003_5H');assert.ok(scarNative?.admission.definition);
 assert.equal(scarNative.admission.atlasId,'scar-workbook-5h-v100');assert.equal(scarNative.definition.atlas.pages.length,2);
 assert.deepEqual(scarNative.admission.combatClipIds??[],[]);assert.ok(scarNative.definition.atlas.clips.every(clip=>clip.id==='workbook.M_F003_5H'));
 const historicalScar=JSON.parse(await readFile(path.join(root,'art-source/v100/pit/scar/heavy-alpha/intake/reference-and-foot-review.json'),'utf8')).replacedStudy;
 assert.equal(historicalScar.atlasId,'scar-pit-v34');
 assert.equal(hash(await readFile(path.join(root,'public/game/sprites/v34/pit/scar/scar-heavy-v34.png'))),'3bd289a8ddcb5dfd483f4e5dc5eaaf028b5dca02c565d1cb85f54bfbf5e498e3','the original duel artwork remains unchanged');
 const duelScar=api.PIT_SPRITE_SHEET_REGISTRY.find(item=>item.fighterId==='scar'&&!item.variantId&&item.atlas.id==='scar-pit-v34');assert.ok(duelScar);
 assert.ok(duelScar.atlas.clips.some(clip=>clip.id==='pit.stand.heavy.active'),'the actual duel keeps its historical heavy clip');
 assert.ok(!api.PIT_WORKBOOK_COMBAT_REGISTRY_V100.some(item=>item.atlas.id===scarNative.admission.atlasId),'native study never enters the duel registry');
 for(const [fighterId,actionId,expectedPages]of [['feral-hunter','M_F006_S1',2],['feral-hunter','M_F006_5H',2],['scar','M_F003_5H',1]]){
  const entry=fighterId==='scar'?api.getPitWorkbookNativeV100(fighterId,actionId,[historicalScar]):api.getPitWorkbookNativeV100(fighterId,actionId);assert.ok(entry);assert.equal(entry.admission.definition,undefined);
  assert.equal(entry.definition.atlas.pages.length,expectedPages,'unrelated original pages are not preloaded');
  assert.ok(entry.definition.atlas.clips.every(clip=>entry.admission.clipIds.includes(clip.id)));
  const start=requests.length;
  for(const sourcePage of entry.definition.atlas.pages){
   const bytes=await readFile(path.join(root,'public',sourcePage.src));assert.equal(hash(bytes),entry.admission.review.sourceHashes[sourcePage.src]);
   const result=await sharp(bytes).ensureAlpha().raw().toBuffer({resolveWithObject:true});
   decodedByUrl.set(sourcePage.src,{pixels:new Uint8ClampedArray(result.data),width:result.info.width,height:result.info.height});
  }
  const selectedBank=await api.loadPitSpriteSheetAnimations([fighterId],[entry.definition]);assert.deepEqual(selectedBank.failedAtlasIds,[]);
  assert.deepEqual(new Set(requests.slice(start)),new Set(entry.definition.atlas.pages.map(sourcePage=>sourcePage.src)));
  for(const facing of ['right','left']){
   const timeline=api.getPitWorkbookTimelineV100(entry,facing);assert.ok(timeline.length>=4);
   const rects=new Set();
   for(let index=0;index<timeline.length;index++){
    assert.equal(api.drawPitWorkbookFrameV100(context(),selectedBank,entry,facing,index,480,460),true);
    const frame=timeline[index].clip.frames[timeline[index].clipFrameIndex];rects.add(JSON.stringify([frame.pageId,frame.rect]));
   }
   assert.equal(rects.size,4,'phase references do not manufacture additional historical drawings');
  }
  if(fighterId==='scar')assert.equal(api.getPitWorkbookCombatLinkV100(fighterId,entry.action).status,'source-choreography-not-linked');
 }
});
