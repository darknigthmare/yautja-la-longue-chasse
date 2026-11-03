import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {build} from 'esbuild';
import sharp from 'sharp';

// Real original PNG readback + the actual production bank/resolver/draw adapter.
// This is deterministic headless verification, not a browser/anatomical review.
const root=fileURLToPath(new URL('..',import.meta.url));
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const entries=JSON.parse(await readFile(path.join(root,'app/game/data/pitLifecycleAnimationsV93.json'),'utf8'));
const admission=JSON.parse(await readFile(path.join(root,'art-source/v93/pit/lifecycle-admission.json'),'utf8'));
const bundled=await build({stdin:{contents:`export * from './app/game/pitSpriteSheetRegistry.ts';
 export * from './app/game/pitSpriteSheetAnimation.ts'; export * from './app/game/hunterSpriteAtlas.ts';
 export {getSpriteContact} from './app/game/spriteContact.ts';
 export {describePitHunterSpriteMotion} from './app/game/hunterSpriteMotion.ts';
 export {createPitCombatState,stepPitCombat,PIT_FIGHTERS} from './app/game/systems/pitCombat.ts';`,resolveDir:root},bundle:true,platform:'node',format:'esm',write:false,logLevel:'silent'});
const api=await import('data:text/javascript;base64,'+Buffer.from(bundled.outputFiles[0].text).toString('base64'));
const appearances=new Map(entries.map(entry=>[entry.fighterId,entry.variantId]));
const selected=api.PIT_SPRITE_SHEET_REGISTRY.filter(entry=>appearances.get(entry.fighterId)===entry.variantId);
const decoded=new Map();
for(const page of selected.flatMap(entry=>entry.atlas.pages))if(!decoded.has(page.src)){
 const bytes=await readFile(path.join(root,'public',page.src));
 const {data,info}=await sharp(bytes).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 decoded.set(page.src,{bytes,pixels:new Uint8ClampedArray(data),width:info.width,height:info.height});
}
function crop(pixels,pageWidth,[x,y,width,height],canonical=false){
 const result=new Uint8ClampedArray(width*height*4);
 for(let row=0;row<height;row++)result.set(pixels.subarray(((y+row)*pageWidth+x)*4,((y+row)*pageWidth+x+width)*4),row*width*4);
 if(canonical)for(let i=0;i<result.length;i+=4)if(!result[i+3])result.fill(0,i,i+4);
 return result;
}
const prior={Image:globalThis.Image,document:globalThis.document},requested=[];
globalThis.Image=class{set src(url){
 if(!url)return;requested.push(url);const source=decoded.get(url);
 if(!source){queueMicrotask(()=>this.onerror?.());return;}
 Object.assign(this,source);this.complete=true;this.naturalWidth=source.width;this.naturalHeight=source.height;
 queueMicrotask(()=>this.onload?.());
}};
globalThis.document={createElement(){
 const canvas={width:0,height:0,pixels:null};canvas.getContext=()=>({
  clearRect(){canvas.pixels=new Uint8ClampedArray(canvas.width*canvas.height*4);},
  drawImage(source,...args){const rect=args.length===8?args.slice(0,4):[0,0,source.width,source.height];
   assert.deepEqual(rect.slice(2),[canvas.width,canvas.height],'source readback never changes pixel scale');canvas.pixels=crop(source.pixels,source.width,rect);},
  getImageData(){return{data:canvas.pixels.slice()};},putImageData(value){canvas.pixels=value.data.slice();},
 });return canvas;
}};
test.after(()=>Object.assign(globalThis,prior));
const banks=new Map();
for(const [fighterId,variantId]of appearances)banks.set(fighterId,await api.loadPitSpriteSheetAnimations([fighterId],api.PIT_SPRITE_SHEET_REGISTRY,{variants:[variantId]}));
const canonicalCells=new Map();

test('admitted V93 pages retain exact original RGBA bytes and six separated distinct native drawings each',async()=>{
 assert.equal(entries.length,11,'bounded V93 intake has eleven explicitly reviewed original pages');assert.equal(admission.entries.length,entries.length);
 const references={wolf:420,'jungle-hunter':420,scar:460,'city-hunter':473};
 const allDrawings=new Set(),ids=new Set();
 for(const entry of entries){
  const {atlas}=entry,page=atlas.pages[0],source=decoded.get(page.src),record=admission.entries.find(item=>item.atlasId===atlas.id);
  assert.ok(record);assert.equal(record.reviewDecision,'accepted-visual-native-alpha-no-crop-export');
  assert.equal(record.canonicalFidelityCertified,false);assert.equal(record.pixelTransformation,'none-byte-identical-copy');
  assert.equal(digest(source.bytes),record.sha256);assert.equal(source.bytes.length,record.bytes);
  assert.deepEqual(await readFile(path.join(root,record.sourcePath)),source.bytes,'source archive and public PNG remain byte-identical');
  assert.equal((await sharp(source.bytes).metadata()).hasAlpha,true);assert.equal(api.validateHunterSpriteAtlas(atlas).valid,true);
  assert.equal(atlas.sourceKind,'authored-frames');assert.equal(page.transparency.mode,'alpha');assert.equal(page.transparency.noiseFloor,2);
  assert.equal(atlas.pages.length,1);assert.equal(atlas.clips.length,2);assert.deepEqual(atlas.clips.map(clip=>clip.facing),['right','left']);
  assert.equal(entry.variantId,record.variantId);assert.equal(entry.fighterId,record.fighterId);assert.equal(entry.bodyHeightPx,record.bodyHeightPx);
  assert.equal(entry.bodyHeightPx,references[entry.fighterId],'same standing-body scale shared by every family of this costume');
  assert.equal(entry.pageBodyHeightPx,undefined,'one fixed body scale per costume, no per-pose fit');
  const processed=api.processHunterSpriteTransparency(source.pixels,source.width,source.height,page.transparency),hashes=[];
  for(const clip of atlas.clips){
   assert.equal(clip.frames.length,3);assert.equal(clip.ticksPerSecond,60);
   for(const frame of clip.frames){
    const pixels=crop(processed.pixels,source.width,frame.rect,true),[x0,y0,width,height]=frame.rect;
    let minX=width,minY=height,maxX=-1,maxY=-1,count=0;
    for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(pixels[(y*width+x)*4+3]){
     count++;assert.ok(x>0&&y>0&&x<width-1&&y<height-1,'all foreground stays within its real native cell');
     minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);
    }
    assert.ok(count>10000&&count<width*height*.6);
    const bounds=entry.visibleFrameBounds.find(value=>JSON.stringify(value.rect)===JSON.stringify(frame.rect));assert.ok(bounds);
    assert.deepEqual(bounds.visibleRect,[x0+minX,y0+minY,maxX-minX+1,maxY-minY+1]);
    assert.equal(frame.pivot[1],maxY);assert.ok(frame.pivot[0]>=minX&&frame.pivot[0]<=maxX);
    const proof=record.cells.find(value=>JSON.stringify(value.rect)===JSON.stringify(frame.rect));assert.ok(proof);
    const cellHash=digest(pixels);assert.equal(cellHash,proof.drawingSha256);assert.deepEqual(frame.pivot,proof.pivot);
    assert.equal(proof.facing,clip.facing);hashes.push(cellHash);allDrawings.add(cellHash);
   }
  }
  assert.equal(new Set(hashes).size,6);canonicalCells.set(atlas.id,hashes);assert.ok(!ids.has(atlas.id));ids.add(atlas.id);
  for(const reference of record.references)assert.equal(digest(await readFile(path.join(root,reference.path))),reference.sha256);
 }
 assert.equal(allDrawings.size,entries.length*6);
});

test('production registry admits only reviewed exact costumes and retains prior Wolf idle and V51 ceremonies',()=>{
 for(const entry of entries)assert.deepEqual(api.PIT_SPRITE_SHEET_REGISTRY.find(item=>item.atlas.id===entry.atlas.id),entry);
 assert.ok(api.PIT_SPRITE_SHEET_REGISTRY.some(entry=>entry.atlas.id==='wolf-masked-idle-right-v91'));
 assert.ok(api.PIT_SPRITE_SHEET_REGISTRY.some(entry=>entry.atlas.id==='wolf-masked-idle-left-v91'));
 assert.ok(api.PIT_SPRITE_SHEET_REGISTRY.some(entry=>entry.atlas.id==='jungle-hunter-masked-round-presentation-v51'));
 const refused=['v93-wolf-001','v93-wolf-002','v93-wolf-004','v93-wolf-005','v93-wolf-007','v93-wolf-008','v93-wolf-009','v93-wolf-010'];
 for(const id of refused)assert.ok(!api.PIT_SPRITE_SHEET_REGISTRY.some(entry=>entry.atlas.pages.some(page=>page.src.includes(id))),'refused original never renderable '+id);
 assert.ok(entries.every(entry=>entry.variantId&&entry.atlas.variantId===entry.variantId));
 const publicText=JSON.stringify(entries);assert.doesNotMatch(publicText,/generated_images|C:[\\/]|originalToolPath|prompt|sourceArchive/);
});

function fixture(entry,facing){
 const opponent=entry.fighterId==='jungle-hunter'?'wolf':'jungle-hunter';
 let state=api.createPitCombatState(entry.fighterId,opponent,{mode:'training',movesets:'current',variants:[entry.variantId,null]});
 const fighter=state.fighters[0];fighter.facing=facing==='right'?1:-1;fighter.x=440;fighter.y=37;
 state.fighters[1].x=facing==='right'?760:160;
 return{get state(){return state;},get fighter(){return state.fighters[0];},step(){state=api.stepPitCombat(state,[{},{}]);},bank:banks.get(entry.fighterId)};
}
function options(clip,elapsedTicks,reducedMotion=false){
 const family=clip.id.replace('pit.presentation.','');
 const phase=family==='dizzy'?'finisher-window':family==='taunt'?'taunt':family==='intro'?'intro-left':'round-result';
 const total=clip.frames.reduce((sum,frame)=>sum+frame.durationTicks,0);
 return{reducedMotion,presentation:{phase,elapsedMs:(elapsedTicks+.05)*1000/60,durationMs:family==='dizzy'?5000:total*1000/60,
  round:2,fighterSlot:0,winnerSlot:family==='dizzy'||family==='defeat'?1:0,blocksSimulation:true,resultVisible:false}};
}
test('actual decoded presentation resolver and floor draw consume every three-frame side without transforms or simulation writes',()=>{
 for(const entry of entries)for(const clip of entry.atlas.clips){
  if(clip.id==='idle')continue;
  const f=fixture(entry,clip.facing),before=JSON.stringify(f.state);assert.ok(f.bank);
  assert.ok(!f.bank.failedAtlasIds.includes(entry.atlas.id));let elapsed=0;
  for(const [index,frame]of clip.frames.entries()){
   const opts=options(clip,elapsed),sample=api.resolvePitSpriteSheetPresentation(f.bank,f.fighter,opts);
   assert.ok(sample);assert.equal(sample.status,'dedicated-animation');assert.equal(sample.definition.atlas.id,entry.atlas.id);
   assert.equal(sample.frame.clip.facing,clip.facing);assert.equal(sample.frame.frameIndex,index);assert.deepEqual(sample.frame.frame,frame);
   assert.equal(digest(crop(sample.source.pixels,sample.source.width,frame.rect,true)),canonicalCells.get(entry.atlas.id)[(clip.facing==='right'?0:3)+index]);
   const calls=[],stack=[],forbidden=()=>assert.fail('native lifecycle cannot mirror, rotate, tween or transform a cell');
   const context={globalAlpha:1,save(){stack.push(this.globalAlpha);},restore(){this.globalAlpha=stack.pop();},scale:forbidden,rotate:forbidden,translate:forbidden,transform:forbidden,setTransform:forbidden,drawImage(...args){calls.push(args);}};
   assert.equal(api.drawPitSpriteSheetPresentation(context,f.bank,f.fighter,440,opts),true);assert.equal(calls.length,1);
   assert.deepEqual(calls[0].slice(1,5),frame.rect);assert.equal(calls[0][0],sample.source);
   const scale=api.PIT_FIGHTERS[entry.fighterId].bodyHeight/entry.bodyHeightPx;
   const contact=api.getSpriteContact(sample.source,frame.rect,frame.pivot[1]);assert.ok(contact);
   assert.equal(calls[0][5],f.fighter.x-frame.pivot[0]*scale);
   assert.equal(calls[0][6],440-(frame.pivot[1]-contact.offsetY)*scale,'airborne final simulation y never makes a theatre sprite float');
   assert.deepEqual(calls[0].slice(7),[frame.rect[2]*scale,frame.rect[3]*scale]);assert.equal(context.filter,'none');assert.equal(context.globalAlpha,1);assert.deepEqual(stack,[]);
   assert.equal(JSON.stringify(f.state),before);elapsed+=frame.durationTicks;
  }
 }
});

test('dizzy loops throughout the real five-second window; taunt and ceremonies finish and reduced motion holds last native drawing',()=>{
 for(const entry of entries)for(const clip of entry.atlas.clips){
  const total=clip.frames.reduce((sum,frame)=>sum+frame.durationTicks,0);
  assert.equal(clip.loop,clip.id==='idle'||clip.id==='pit.presentation.dizzy');
  if(clip.id==='idle')continue;const f=fixture(entry,clip.facing);
  for(const tick of [total,total+1,total*2+1,299]){
   const sample=api.resolvePitSpriteSheetPresentation(f.bank,f.fighter,options(clip,tick));assert.ok(sample);
   assert.equal(sample.frame.frameIndex,clip.loop?api.resolveHunterSpriteAtlasFrame(entry.atlas,clip.id,clip.facing,Math.min(299,tick)).frameIndex:2);
  }
  const reduced=api.resolvePitSpriteSheetPresentation(f.bank,f.fighter,options(clip,0,true));assert.equal(reduced.frame.frameIndex,2);
  if(clip.id==='pit.presentation.intro')assert.ok(total*1000/60<=1200);
  if(clip.id==='pit.presentation.victory'||clip.id==='pit.presentation.defeat')assert.ok(total*1000/60<=2000);
 }
});

test('taunt capability comes only from the real loaded exact-side clip, while uncovered costumes retain explicit missing coverage',async()=>{
 const wrongVariant='wolf-sans-casque-cd5b844506';
 const wrongBank=await api.loadPitSpriteSheetAnimations(['wolf'],entries,{variants:[wrongVariant]});assert.equal(wrongBank.readyClipCount,0);
 const wolfEntry=entries.find(entry=>entry.fighterId==='wolf'&&entry.atlas.clips[0].id==='pit.presentation.taunt');assert.ok(wolfEntry);
 for(const facing of ['right','left']){
  const f=fixture(wolfEntry,facing),before=JSON.stringify(f.state);
  assert.equal(api.pitNativeTauntDurationV93(f.bank,f.fighter),64*1000/60);
  assert.equal(api.resolvePitSpriteSheetPresentation(wrongBank,f.fighter,options(wolfEntry.atlas.clips[0],0)),null);
  f.fighter.variantId=wrongVariant;assert.equal(api.pitNativeTauntDurationV93(f.bank,f.fighter),null);
  f.fighter.variantId=wolfEntry.variantId;assert.equal(JSON.stringify(f.state),before);
 }
 for(const family of ['intro','victory','defeat'])assert.ok(!entries.some(entry=>entry.fighterId==='wolf'&&entry.atlas.clips.some(clip=>clip.id==='pit.presentation.'+family)),'missing Wolf family is not fabricated '+family);
});

test('all three new masked idle loops consume real engine ticks, including measured nonuniform Jungle dividers',()=>{
 const idleEntries=entries.filter(value=>value.atlas.clips[0].id==='idle');assert.deepEqual(idleEntries.map(entry=>entry.fighterId).sort(),['city-hunter','jungle-hunter','scar']);
 for(const entry of idleEntries)for(const clip of entry.atlas.clips){
  if(entry.fighterId==='jungle-hunter'){assert.deepEqual(clip.frames.map(frame=>frame.rect[1]),[0,560,1040]);assert.deepEqual(clip.frames.map(frame=>frame.rect[3]),[560,480,496]);}
  const f=fixture(entry,clip.facing);f.fighter.y=0;let start=0;
  for(const [index,frame]of clip.frames.entries()){
   while(f.state.frame<start)f.step();
   const before=JSON.stringify(f.state),sample=api.resolvePitSpriteSheetAnimation(f.bank,f.fighter,{simulationFrame:f.state.frame,combat:f.state});
   assert.ok(sample);assert.equal(sample.definition.atlas.id,entry.atlas.id);assert.equal(sample.resolved.frame.frameIndex,index);assert.equal(JSON.stringify(f.state),before);start+=frame.durationTicks;
  }
 }
});
