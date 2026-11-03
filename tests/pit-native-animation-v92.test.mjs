import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {build} from 'esbuild';
import sharp from 'sharp';

// Decode the original PNG bytes. The deterministic Canvas adapter tests the
// actual production loader/renderer, not a real browser or anatomical review.
const root=fileURLToPath(new URL('..',import.meta.url));
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const definitions=JSON.parse(await readFile(path.join(root,'app/game/data/pitUserAnimationsV92.json'),'utf8'));
const intake=JSON.parse(await readFile(path.join(root,'art-source/v92/pit/intake/manifest.json'),'utf8'));
const admittedIds=['v92-003','v92-004','v92-007','v92-008','v92-009','v92-011','v92-012','v92-013','v92-014','v92-015','v92-016','v92-017'];
const splitById={'v92-003':509,'v92-004':520,'v92-007':502,'v92-008':508,'v92-009':515,'v92-011':768,'v92-012':768,'v92-013':768,'v92-014':752,'v92-015':750,'v92-016':742,'v92-017':725};
const recoverySources={
 'v92-014':{height:730,headWindow:[380,752,200,210]},
 'v92-015':{height:708,headWindow:[405,750,210,240]},
 'v92-016':{height:724,headWindow:[440,742,190,240]},
 'v92-017':{height:745,headWindow:[360,725,200,250]},
};
const intakeId=item=>item.id??'v92-'+item.fileName.slice(0,3);
const variants={'user-ahab':'ahab-avec-casque-0c8ceb1c95','user-samurai':'samurai-avec-casque-d75f93b15e'};
const built=await build({stdin:{contents:`export * from './app/game/pitSpriteSheetRegistry.ts';
 export * from './app/game/pitSpriteSheetAnimation.ts'; export * from './app/game/hunterSpriteAtlas.ts';
 export {getSpriteContact} from './app/game/spriteContact.ts';
 export {describePitHunterSpriteMotion} from './app/game/hunterSpriteMotion.ts';
 export {drawPitCombatBitmapFighter} from './app/game/pitCombatBitmapArt.ts';
 export {createPitCombatState,stepPitCombat,getPitCombatFighterDefinition} from './app/game/systems/pitCombat.ts';`,resolveDir:root},bundle:true,platform:'node',format:'esm',write:false,logLevel:'silent'});
const api=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));
const decoded=new Map(),cellHashes=new Map();
for(const entry of definitions)for(const page of entry.atlas.pages){
 const bytes=await readFile(path.join(root,'public',page.src));
 const {data,info}=await sharp(bytes).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 decoded.set(page.src,{pixels:new Uint8ClampedArray(data),width:info.width,height:info.height,bytes});
}
function crop(pixels,pageWidth,[x,y,width,height],canonical=false){
 const result=new Uint8ClampedArray(width*height*4);
 for(let row=0;row<height;row++){
  const offset=((y+row)*pageWidth+x)*4;
  result.set(pixels.subarray(offset,offset+width*4),row*width*4);
 }
 if(canonical)for(let i=0;i<result.length;i+=4)if(!result[i+3])result.fill(0,i,i+4);
 return result;
}
const prior={Image:globalThis.Image,document:globalThis.document},requested=[];
globalThis.Image=class{
 set src(url){
  if(!url)return;requested.push(url);const source=decoded.get(url);
  if(!source){queueMicrotask(()=>this.onerror?.());return;}
  Object.assign(this,source);this.complete=true;this.naturalWidth=source.width;this.naturalHeight=source.height;
  queueMicrotask(()=>this.onload?.());
 }
};
globalThis.document={createElement(){
 const canvas={width:0,height:0,pixels:null};
 canvas.getContext=()=>({clearRect(){canvas.pixels=new Uint8ClampedArray(canvas.width*canvas.height*4);},
  drawImage(source,...args){const rect=args.length===8?args.slice(0,4):[0,0,source.width,source.height];
   assert.deepEqual(rect.slice(2),[canvas.width,canvas.height],'source readback is never resized');canvas.pixels=crop(source.pixels,source.width,rect);},
  getImageData(){return{data:canvas.pixels.slice()};},putImageData(data){canvas.pixels=data.data.slice();}});
 return canvas;
}};
test.after(()=>Object.assign(globalThis,prior));
const banks=new Map();
for(const [fighterId,variant]of Object.entries(variants))banks.set(fighterId,await api.loadPitSpriteSheetAnimations([fighterId],definitions,{variants:[variant]}));
function duel(id,facing,legacy=false){
 let state=api.createPitCombatState(id,'jungle-hunter',{mode:'training',movesets:legacy?'legacy':'current',variants:[variants[id],null]});
 state.fighters[0].x=facing==='right'?200:760;state.fighters[1].x=facing==='right'?760:200;state.fighters[0].facing=facing==='right'?1:-1;
 return{get state(){return state;},get fighter(){return state.fighters[0];},
  options(){return{simulationFrame:state.frame,combat:state};},
  step(input={}){state=api.stepPitCombat(state,[input,{}]);}};
}
function drawNative(fixture,entry,index){
 const before=JSON.stringify(fixture.state),bank=banks.get(entry.fighterId),options=fixture.options();
 const sample=api.resolvePitSpriteSheetAnimation(bank,fixture.fighter,options);
 assert.ok(sample);assert.equal(sample.definition.atlas.id,entry.atlas.id);assert.equal(sample.resolved.frame.frameIndex,index);
 assert.equal(sample.resolved.frame.clip.facing,entry.atlas.clips[0].facing);
 const expected=entry.atlas.clips[0].frames[index];
 assert.deepEqual(sample.resolved.frame.frame,expected);
 assert.equal(hash(crop(sample.source.pixels,sample.source.width,expected.rect,true)),cellHashes.get(entry.atlas.id)[index]);
 const calls=[],alphas=[],forbidden=()=>assert.fail('native drawing cannot be mirrored, rotated, tweened or transformed');
 const context={globalAlpha:1,save(){alphas.push(this.globalAlpha);},restore(){this.globalAlpha=alphas.pop();},
  scale:forbidden,rotate:forbidden,transform:forbidden,setTransform:forbidden,translate:forbidden,drawImage(...args){calls.push(args);}};
 assert.equal(api.drawPitCombatBitmapFighter(context,{spriteSheets:bank,cancelled:false},fixture.fighter,440,options),true);
 assert.equal(calls.length,1);assert.equal(calls[0][0],sample.source);assert.deepEqual(calls[0].slice(1,5),expected.rect);
 const reference=entry.pageBodyHeightPx?.[expected.pageId]??entry.bodyHeightPx;
 const scale=api.getPitCombatFighterDefinition(fixture.fighter).bodyHeight/reference;
 assert.equal(calls[0][7],expected.rect[2]*scale);assert.equal(calls[0][8],expected.rect[3]*scale);
 const contact=api.getSpriteContact(sample.source,expected.rect,expected.pivot[1]);assert.ok(contact);
 assert.equal(calls[0][5],fixture.fighter.x-expected.pivot[0]*scale);
 assert.equal(calls[0][6],440-fixture.fighter.y-(expected.pivot[1]-contact.offsetY)*scale);
 assert.equal(context.filter,'none');assert.equal(context.imageSmoothingEnabled,false);
 assert.equal(context.globalAlpha,1);assert.deepEqual(alphas,[]);assert.equal(JSON.stringify(fixture.state),before);
}

test('twelve reviewed V92 pages preserve original bytes, real row dividers and twenty-four distinct alpha-contained drawings',async()=>{
 assert.equal(definitions.length,12);assert.equal(intake.items.length,17);
 const usedIds=[],drawingHashes=new Set(),bodySizes=new Map(),familySizes=new Map();
 for(const entry of definitions){
  const page=entry.atlas.pages[0],clip=entry.atlas.clips[0],source=decoded.get(page.src);
  const record=intake.items.find(item=>page.src.endsWith('/'+item.fileName));assert.ok(record);const id=intakeId(record);usedIds.push(id);
  assert.equal(entry.fighterId,'user-'+record.fighterId);assert.equal(entry.variantId,record.variantId);
  assert.equal(hash(source.bytes),record.sha256);assert.equal(source.bytes.length,record.bytes);
  assert.deepEqual(await readFile(path.join(root,record.path)),source.bytes,'public copy is exactly the unedited source');
  assert.equal((await sharp(source.bytes).metadata()).hasAlpha,true);
  assert.equal(api.validateHunterSpriteAtlas(entry.atlas).valid,true);assert.equal(entry.atlas.sourceKind,'authored-frames');
  assert.equal(page.transparency.noiseFloor,2);assert.equal(clip.facing,record.facing);
  assert.equal(clip.loop,false);assert.equal(clip.frames.length,2);assert.deepEqual(clip.frames.map(f=>f.durationTicks),[1,1]);
  assert.equal(clip.frames[0].rect[3],splitById[id]);assert.equal(clip.frames[1].rect[1],splitById[id]);
  const sizes=bodySizes.get(entry.fighterId)??new Set();sizes.add(entry.bodyHeightPx);bodySizes.set(entry.fighterId,sizes);
  if(page.width===1024){assert.deepEqual([page.width,page.height],[1024,1536]);assert.deepEqual(entry.pageBodyHeightPx,{[page.id]:recoverySources[id]?.height??(entry.fighterId==='user-ahab'?654:662)});}
  else assert.equal(entry.pageBodyHeightPx,undefined,'historical source reference remains unchanged');
  const familyKey=JSON.stringify([entry.fighterId,page.width,page.height,recoverySources[id]?id:null]);const family=familySizes.get(familyKey)??new Set();
  family.add(entry.pageBodyHeightPx?.[page.id]??entry.bodyHeightPx);familySizes.set(familyKey,family);
  const processed=api.processHunterSpriteTransparency(source.pixels,source.width,source.height,page.transparency);
  const hashes=clip.frames.map(frame=>{
   const pixels=crop(processed.pixels,source.width,frame.rect,true),[x,y,width,height]=frame.rect;
   const bounds=entry.visibleFrameBounds.find(bound=>JSON.stringify(bound.rect)===JSON.stringify(frame.rect));assert.ok(bounds);
   let minX=source.width,minY=source.height,maxX=-1,maxY=-1,visible=0;
   for(let row=0;row<height;row++)for(let col=0;col<width;col++)if(pixels[(row*width+col)*4+3]){
    visible++;assert.ok(row>0&&col>0&&row<height-1&&col<width-1,'no native foreground crosses its cell border');
    minX=Math.min(minX,x+col);minY=Math.min(minY,y+row);maxX=Math.max(maxX,x+col);maxY=Math.max(maxY,y+row);
   }
   assert.ok(visible>50000&&visible<width*height);assert.deepEqual(bounds.visibleRect,[minX,minY,maxX-minX+1,maxY-minY+1]);
   assert.equal(y+frame.pivot[1],maxY,'ground pivot is measured from the actual lower alpha bound');
   const digest=hash(pixels);drawingHashes.add(digest);return digest;
  });
  assert.equal(new Set(hashes).size,2);cellHashes.set(entry.atlas.id,hashes);
 }
 assert.deepEqual(usedIds.sort(),admittedIds);assert.equal(drawingHashes.size,24);
 assert.deepEqual([...bodySizes.values()].map(set=>set.size),[1,1]);
 assert.ok([...familySizes.values()].every(set=>set.size===1),'one fixed reference per old source family or new recovery page, never per pose');
 assert.equal(requested.length,12);assert.deepEqual([...banks.values()].map(bank=>bank.failedAtlasIds),[[],[]]);
});

test('the actual production registry owns twelve native clips and excludes all five refused original pages',()=>{
 for(const entry of definitions){
  const clip=entry.atlas.clips[0],registered=api.PIT_SPRITE_SHEET_REGISTRY.find(candidate=>candidate.atlas.id===entry.atlas.id);
  assert.deepEqual(registered,entry);
  const first=api.PIT_SPRITE_SHEET_REGISTRY.find(candidate=>candidate.fighterId===entry.fighterId&&candidate.variantId===entry.variantId&&candidate.atlas.clips.some(other=>other.id===clip.id&&other.facing===clip.facing));
  assert.equal(first.atlas.id,entry.atlas.id);
 }
 const refusedPages=intake.items.filter(item=>!admittedIds.includes(intakeId(item)));assert.equal(refusedPages.length,5);
 for(const refused of refusedPages)
  assert.ok(!api.PIT_SPRITE_SHEET_REGISTRY.some(entry=>entry.atlas.pages.some(page=>page.src.endsWith('/'+refused.fileName))));
});

test('Ahab consumes exact native startup, active and recovery cells through real11/3/20 phases in both facings',()=>{
 for(const facing of ['left','right']){
  const fixture=duel('user-ahab',facing),entry=definitions.find(d=>d.fighterId==='user-ahab'&&d.atlas.clips[0].facing===facing&&d.atlas.clips[0].id==='pit.stand.medium.startup');
  const active=definitions.find(d=>d.fighterId==='user-ahab'&&d.atlas.clips[0].facing===facing&&d.atlas.clips[0].id==='pit.stand.medium.active');
  const recovery=definitions.find(d=>d.fighterId==='user-ahab'&&d.atlas.clips[0].facing===facing&&d.atlas.clips[0].id==='pit.stand.medium.recovery');
  const phases=[],indices=[],activeIndices=[],recoveryIndices=[];
  for(let tick=0;tick<35;tick++){
   fixture.step(tick===0?{attack:'medium'}:{});const motion=api.describePitHunterSpriteMotion(fixture.fighter,fixture.state.frame,undefined,fixture.state);
   if(fixture.fighter.phase==='startup'){
    assert.equal(motion.durationTicks,11);assert.equal(motion.clipId,'pit.stand.medium.startup');
    const index=motion.elapsedTicks<6?0:1;drawNative(fixture,entry,index);indices.push(index);
   }else if(fixture.fighter.phase==='active'){
    assert.equal(motion.durationTicks,3);assert.equal(motion.clipId,'pit.stand.medium.active');
    const index=motion.elapsedTicks<2?0:1;drawNative(fixture,active,index);activeIndices.push(index);
   }else if(fixture.fighter.phase==='recovery'){
    assert.equal(motion.durationTicks,20);assert.equal(motion.clipId,'pit.stand.medium.recovery');
    const index=motion.elapsedTicks<10?0:1;drawNative(fixture,recovery,index);recoveryIndices.push(index);
   }
   phases.push(fixture.fighter.phase);
  }
  assert.equal(phases.filter(p=>p==='startup').length,11);assert.equal(phases.filter(p=>p==='active').length,3);
  assert.deepEqual(indices,[0,0,0,0,0,0,1,1,1,1,1]);
  assert.deepEqual(activeIndices,[0,0,1]);
  assert.equal(phases.filter(p=>p==='recovery').length,20);
  assert.deepEqual(recoveryIndices,[...Array(10).fill(0),...Array(10).fill(1)]);
  assert.equal(fixture.fighter.phase,'idle');assert.equal(fixture.fighter.action,null);
 }
});

test('Samurai right counter consumes exact6/8/26 native phase cells and returns to idle in the actual stepped duel',()=>{
 const fixture=duel('user-samurai','right'),startup=definitions.find(d=>d.atlas.id.endsWith('counter-startup-right-v92'));
 const active=definitions.find(d=>d.atlas.id.endsWith('counter-active-right-v92'));
 const recovery=definitions.find(d=>d.atlas.id.endsWith('technique-recovery-right-v92'));
 const indices={startup:[],active:[],recovery:[]},durations={startup:6,active:8,recovery:26};
 for(let tick=0;tick<43;tick++){
  fixture.step(tick===0?{attack:'technique'}:{});
  if(!(fixture.fighter.phase in indices))continue;
  const motion=api.describePitHunterSpriteMotion(fixture.fighter,fixture.state.frame,undefined,fixture.state),phase=fixture.fighter.phase;
  assert.equal(motion.clipId,'pit.stand.technique.samurai-katana-contact-v92.'+phase);
  assert.equal(motion.durationTicks,durations[phase]);
  const index=motion.elapsedTicks<durations[phase]/2?0:1;drawNative(fixture,{startup,active,recovery}[phase],index);indices[phase].push(index);
 }
 assert.deepEqual(indices,{startup:[0,0,0,1,1,1],active:[0,0,0,0,1,1,1,1],recovery:[...Array(13).fill(0),...Array(13).fill(1)]});
 assert.equal(fixture.fighter.phase,'idle');assert.equal(fixture.fighter.action,null);
});

test('Samurai left consumes native6/8/26 cells and neither missing costumes nor historical techniques borrow its clips',()=>{
 const fixture=duel('user-samurai','left'),entry=definitions.find(d=>d.atlas.id.endsWith('counter-startup-left-v92'));
 const active=definitions.find(d=>d.atlas.id.endsWith('technique-active-left-v92'));
 const recovery=definitions.find(d=>d.atlas.id.endsWith('technique-recovery-left-v92'));
 const bank=banks.get('user-samurai');let startupTicks=0,activeTicks=0,recoveryTicks=0;
 for(let tick=0;tick<41;tick++){
  fixture.step(tick===0?{attack:'technique'}:{});
  if(fixture.fighter.phase==='startup'){
   const motion=api.describePitHunterSpriteMotion(fixture.fighter,fixture.state.frame,undefined,fixture.state);
   drawNative(fixture,entry,motion.elapsedTicks<3?0:1);startupTicks++;
   for(const variantId of [undefined,'samurai-sans-casque-fe1ba25104','ahab-avec-casque-0c8ceb1c95'])
    assert.equal(api.resolvePitSpriteSheetAnimation(bank,{...fixture.fighter,variantId},fixture.options()),null);
  }else if(fixture.fighter.phase==='active'){
   const motion=api.describePitHunterSpriteMotion(fixture.fighter,fixture.state.frame,undefined,fixture.state);
   activeTicks++;assert.equal(motion.durationTicks,8);drawNative(fixture,active,motion.elapsedTicks<4?0:1);
  }else if(fixture.fighter.phase==='recovery'){
   const motion=api.describePitHunterSpriteMotion(fixture.fighter,fixture.state.frame,undefined,fixture.state);
   recoveryTicks++;assert.equal(motion.durationTicks,26);drawNative(fixture,recovery,motion.elapsedTicks<13?0:1);
   for(const variantId of [undefined,'samurai-sans-casque-fe1ba25104','ahab-avec-casque-0c8ceb1c95'])
    assert.equal(api.resolvePitSpriteSheetAnimation(bank,{...fixture.fighter,variantId},fixture.options()),null);
  }
 }
 assert.equal(startupTicks,6);assert.equal(activeTicks,8);assert.equal(recoveryTicks,26);
 assert.equal(fixture.fighter.phase,'idle');assert.equal(fixture.fighter.action,null);
 const legacy=duel('user-samurai','right',true);legacy.step({attack:'technique'});
 assert.equal(api.describePitHunterSpriteMotion(legacy.fighter,legacy.state.frame,undefined,legacy.state).techniqueId,'user-balanced-contact-counter');
 assert.equal(api.resolvePitSpriteSheetAnimation(bank,legacy.fighter,legacy.options()),null);
});

test('portrait scale comes from a standing source once per family and never from the lower bent pose',()=>{
 const ahab=definitions.find(entry=>entry.atlas.pages[0].src.endsWith('/011-ahab-medium-active-right.png'));
 const samurai=definitions.find(entry=>entry.atlas.pages[0].src.endsWith('/013-samurai-counter-active-left.png'));
 for(const [entry,headWindow,expected]of [[ahab,[360,0,190,180],654],[samurai,[380,20,160,160],662]]){
  const page=entry.atlas.pages[0],source=decoded.get(page.src);let minHeadY=source.height,maxFootY=-1;
  for(let y=headWindow[1];y<headWindow[1]+headWindow[3];y++)for(let x=headWindow[0];x<headWindow[0]+headWindow[2];x++)
   if(source.pixels[(y*source.width+x)*4+3]>2)minHeadY=Math.min(minHeadY,y);
  for(let y=500;y<768;y++)for(let x=0;x<source.width;x++)if(source.pixels[(y*source.width+x)*4+3]>2)maxFootY=Math.max(maxFootY,y);
  assert.equal(maxFootY-minHeadY+1,expected);assert.equal(entry.pageBodyHeightPx[page.id],expected);
  const lower=entry.visibleFrameBounds[1].visibleRect;
  assert.notEqual(lower[3],expected,'the bent or sword-bearing lower rectangle cannot replace the standing reference');
  const fixture=duel(entry.fighterId,entry.atlas.clips[0].facing),bodyHeight=api.getPitCombatFighterDefinition(fixture.fighter).bodyHeight;
  assert.ok(Math.abs(expected*(bodyHeight/entry.pageBodyHeightPx[page.id])-bodyHeight)<1e-12,'source standing reference maps to the same physical engine height within floating-point precision');
 }
});

test('four recovery sources use one returned-guard reference for both drawings and hidden RGB never creates a background',()=>{
 for(const [id,reference]of Object.entries(recoverySources)){
  const entry=definitions.find(entry=>entry.atlas.pages[0].src.split('/').at(-1).startsWith(id.slice(4)+'-'));
  const page=entry.atlas.pages[0],source=decoded.get(page.src),window=reference.headWindow,lower=entry.atlas.clips[0].frames[1];
  let headY=source.height,footY=-1;
  for(let y=window[1];y<window[1]+window[3];y++)for(let x=window[0];x<window[0]+window[2];x++)
   if(source.pixels[(y*source.width+x)*4+3]>2)headY=Math.min(headY,y);
  for(let y=lower.rect[1];y<source.height;y++)for(let x=0;x<source.width;x++)
   if(source.pixels[(y*source.width+x)*4+3]>2)footY=Math.max(footY,y);
  assert.equal(footY-headY+1,reference.height);assert.equal(entry.pageBodyHeightPx[page.id],reference.height);
  assert.deepEqual(Object.keys(entry.pageBodyHeightPx),[page.id],'reference belongs to a source page, never to a pose');
  const fixture=duel(entry.fighterId,entry.atlas.clips[0].facing),height=api.getPitCombatFighterDefinition(fixture.fighter).bodyHeight;
  assert.ok(Math.abs(reference.height*(height/entry.pageBodyHeightPx[page.id])-height)<1e-12);
 }
 const entry=definitions.find(entry=>entry.atlas.pages[0].src.endsWith('/014-ahab-medium-recovery-right.png'));
 const source=decoded.get(entry.atlas.pages[0].src);
 const processed=api.processHunterSpriteTransparency(source.pixels,source.width,source.height,entry.atlas.pages[0].transparency);
 let hiddenRGB=0;
 for(let offset=0;offset<source.pixels.length;offset+=4)if(source.pixels[offset+3]===0){
  assert.equal(processed.pixels[offset+3],0,'RGB hidden under native alpha0 cannot become a visible halo');
  if(source.pixels[offset]||source.pixels[offset+1]||source.pixels[offset+2])hiddenRGB++;
 }
 assert.ok(hiddenRGB>100000,'the original retains hidden RGB without rewriting its pixels');
});

test('other actions remain uncovered and a bank with one authored facing never manufactures the opposite',async()=>{
 for(const [id,attack]of [['user-ahab','medium'],['user-samurai','technique']]){
  const unrelated=duel(id,'right');unrelated.step({attack:id==='user-ahab'?'technique':'heavy'});
  assert.equal(api.resolvePitSpriteSheetAnimation(banks.get(id),unrelated.fighter,unrelated.options()),null);
  assert.equal(api.resolvePitSpriteSheetHold(banks.get(id),unrelated.fighter,unrelated.options()),null);
  const entry=definitions.find(d=>d.fighterId===id&&d.atlas.clips[0].facing==='right'&&d.atlas.clips[0].id.endsWith('.startup'));
  const oneSide=await api.loadPitSpriteSheetAnimations([id],[entry],{variants:[variants[id]]});
  const opposite=duel(id,'left');opposite.step({attack});
  assert.equal(api.resolvePitSpriteSheetAnimation(oneSide,opposite.fighter,opposite.options()),null);
  assert.equal(api.drawPitSpriteSheetAnimation({drawImage(){assert.fail('no opposite source in this bank');}},oneSide,opposite.fighter,440,opposite.options()),false);
 }
 const unrelated=duel('user-ahab','right');unrelated.step({attack:'technique'});
 assert.equal(api.resolvePitSpriteSheetAnimation(banks.get('user-ahab'),unrelated.fighter,unrelated.options()),null,'medium spear cannot become an unreviewed technique animation');
});
