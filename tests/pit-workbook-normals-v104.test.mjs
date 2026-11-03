import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {build} from 'esbuild';
import sharp from 'sharp';

const built=await build({stdin:{contents:[
  "export * from './app/game/systems/pitCombat.ts';",
  "export * from './app/game/systems/pitWorkbookNormalsV104.ts';",
  "export * from './app/game/systems/pitReplay.ts';",
  "export * from './app/game/systems/pitUserRoster.ts';",
  "export * from './app/game/systems/pitTraining.ts';",
  "export * from './app/game/pitWorkbookNormalRegistryV104.ts';",
  "export * from './app/game/pitWorkbookAnimationV100.ts';",
  "export * from './app/game/hunterSpriteMotion.ts';",
  "export * from './app/game/hunterSpriteAtlas.ts';",
  "export * from './app/game/pitSpriteSheetAnimation.ts';",
].join('\n'),resolveDir:process.cwd()},bundle:true,write:false,platform:'node',format:'esm',logLevel:'silent'});
const p=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));
const recipe='workbook-v104';
const clone=value=>JSON.parse(JSON.stringify(value));
function start(move,options={}){
 let state=p.createPitCombatState(move.fighterId,move.fighterId==='scar'?'feral-hunter':'scar',{mode:'training',normalMoves:recipe,...options});
 state.fighters[0].x=150;state.fighters[1].x=800;
 const input={attack:move.attack,down:move.key.startsWith('2')};
 if(move.key.startsWith('j'))Object.assign(state.fighters[0],{grounded:false,y:240,velocityY:1});
 return p.stepPitCombat(state,[input,{}]);
}
test('18 source normals preserve the exact cells, timings, base damage and guard height',()=>{
 assert.equal(p.PIT_WORKBOOK_NORMALS_V104.length,18);
 for(const move of p.PIT_WORKBOOK_NORMALS_V104){
  const action=p.getPitWorkbookActionV100(move.fighterId,move.actionId);
  assert.equal(move.sourceText,action.sourceText);assert.equal(move.cell,action.cell);
  assert.deepEqual([move.startup,move.active,move.recovery],Object.values(action.phaseTicks));
  assert.match(action.sourceText,new RegExp('dégâts '+move.damage+' · coût 0 %'));
  const state=start(move),fighter=state.fighters[0],actual=p.getPitCombatAttackDefinition(fighter,move.attack);
  assert.equal(fighter.action.normalMove,move.key);assert.equal(state.version,12);
  for(const key of ['startup','active','recovery','damage','hitLevel','antiAir'])assert.equal(actual[key],move[key],move.actionId+'/'+key);
 }
});
test('every normal follows its authored phase deadlines and completes once on a whiff',()=>{
 for(const move of p.PIT_WORKBOOK_NORMALS_V104){
  let state=start(move);const total=move.startup+move.active+move.recovery;
  for(let frame=0;frame<total;frame++){
   const fighter=state.fighters[0];assert.equal(fighter.action.frame,frame,move.actionId);
   assert.equal(fighter.phase,frame<move.startup?'startup':frame<move.startup+move.active?'active':'recovery');
   state=p.stepPitCombat(state,[{},{}]);
  }
  assert.equal(state.fighters[0].action,null);assert.equal(state.fighters[0].phase,'idle');
 }
});
test('air normals retain their source key, phase and native posture after physical landing',()=>{
 for(const move of p.PIT_WORKBOOK_NORMALS_V104.filter(move=>move.posture==='air')){
  let state=start(move);Object.assign(state.fighters[0],{y:1,velocityY:-8});
  state=p.stepPitCombat(state,[{down:true},{}]);
  const fighter=state.fighters[0];assert.equal(fighter.grounded,true);assert.equal(fighter.action.normalMove,move.key);
  const motion=p.describePitHunterSpriteMotion(fighter,state.frame);
  assert.equal(motion.posture,'air');assert.match(motion.clipId,new RegExp('workbook-v104\\.'+move.key+'\\.startup$'));
  assert.equal(motion.durationTicks,move.startup);
 }
});
test('low, mid and high source normals obey the actual opposing guard',()=>{
 for(const key of ['5L','5M','2L','2M'])for(const guard of ['high','low']){
  const move=p.getPitWorkbookNormalV104('feral-hunter',key);let state=start(move);
  state.fighters[0].x=300;state.fighters[1].x=340;
  const events=[];
  for(let n=0;n<move.startup+move.active;n++){
   state=p.stepPitCombat(state,[{},guard==='high'?{guardHigh:true}:{guardLow:true,down:true}]);events.push(...state.events);
  }
  const blocked=move.hitLevel==='mid'||move.hitLevel===guard;
  assert.ok(events.some(event=>event.type===(blocked?'block':'hit')&&event.attackerId==='feral-hunter'),key+'/'+guard);
  const hit=events.find(event=>event.type==='hit'&&event.attackerId==='feral-hunter');
  if(hit)assert.equal(hit.damage,Math.round(move.damage*p.PIT_FIGHTERS['feral-hunter'].power));
 }
});
test('the recipe owns BODY only and leaves costumes, other hunters and historical attacks unchanged',()=>{
 const variant=p.getPitFighterVariants('scar')[0];assert.ok(variant);
 let state=p.createPitCombatState('scar','feral-hunter',{normalMoves:recipe,variants:[variant.id,null]});
 assert.equal(state.fighters[0].normalMovesRecipe,undefined);assert.equal(state.fighters[1].normalMovesRecipe,recipe);
 state=p.stepPitCombat(state,[{attack:'heavy',down:true},{}]);
 assert.equal(state.fighters[0].action.normalMove,undefined);
 assert.deepEqual(p.getPitCombatAttackDefinition(state.fighters[0],'heavy'),p.getPitCombatFighterDefinition(state.fighters[0]).attacks.heavy);
 assert.throws(()=>p.createPitCombatState('jungle-hunter','berserker',{normalMoves:recipe}));
 assert.throws(()=>p.createPitCombatState('feral-hunter','scar',{normalMoves:'future-v105'}));
 const old=p.stepPitCombat(p.createPitCombatState('feral-hunter','scar'),[{attack:'medium',down:true},{}]);
 assert.equal(old.version,11);assert.equal(old.rules.normalMoves,undefined);assert.equal(old.fighters[0].normalMovesRecipe,undefined);assert.equal(old.fighters[0].action.normalMove,undefined);
 assert.deepEqual(p.getPitCombatAttackDefinition(old.fighters[0],'medium'),p.PIT_FIGHTERS['feral-hunter'].attacks.medium);
});
test('snapshot ownership rejects stripped, forged, foreign and future normal recipes',()=>{
 const move=p.getPitWorkbookNormalV104('feral-hunter','2M'),state=start(move);
 assert.deepEqual(p.deserializePitCombat(p.serializePitCombat(state)),state);
 for(const mutate of [
  s=>delete s.rules.normalMoves,
  s=>s.rules.normalMoves='future-v105',
  s=>delete s.fighters[0].normalMovesRecipe,
  s=>s.fighters[0].normalMovesRecipe='future-v105',
  s=>delete s.fighters[0].action.normalMove,
  s=>s.fighters[0].action.normalMove='2H',
  s=>s.fighters[0].action.normalMove='S1',
  s=>s.version=10,
  s=>s.version=11,
  s=>s.version=13,
 ]){const bad=clone(state);mutate(bad);assert.throws(()=>p.deserializePitCombat(JSON.stringify(bad)));}
});
test('rematches, round resets and training reset retain the explicitly selected normal recipe',()=>{
 let state=start(p.getPitWorkbookNormalV104('scar','5H'));
 for(const next of [p.rematchPitCombat(state),p.resetPitTrainingPositions(state)]){
  assert.equal(next.rules.normalMoves,recipe);assert.ok(next.fighters.every(fighter=>fighter.normalMovesRecipe===recipe));
 }
 state.phase='round-over';state.transitionFramesRemaining=1;
 state=p.stepPitCombat(state);
 assert.equal(state.round,2);assert.ok(state.fighters.every(fighter=>fighter.normalMovesRecipe===recipe));
});
test('new recorded recipes replay deterministically while mutations are rejected',()=>{
 const frames=Array.from({length:180},(_,tick)=>[{attack:tick%35===0?'medium':undefined,down:tick%70<35},{guardHigh:true}]);
 const replay=p.recordPitReplay(frames,{fighters:['feral-hunter','scar'],rules:{mode:'match',normalMoves:recipe},seed:104});
 assert.equal(replay.rules.normalMoves,recipe);assert.equal(replay.engineVersion,12);
 assert.deepEqual(p.deserializePitReplay(p.serializePitReplay(replay)),replay);
 let live=p.createPitCombatState('feral-hunter','scar',{normalMoves:recipe});for(const inputs of frames)live=p.stepPitCombat(live,inputs);
 const reader=p.createPitReplayReader(replay);let playback=p.createPitReplayCombatState(replay);
 while(!reader.done)playback=p.stepPitReplayCombat(playback,reader.next().value.inputs,replay.engineVersion);
 assert.deepEqual(playback,live);
 assert.throws(()=>p.stepPitReplayCombat(live,[{},{}],11));
 assert.throws(()=>p.stepPitReplayCombat(p.createPitCombatState('feral-hunter','scar'),[{},{}],12));
 const bad=clone(replay);delete bad.rules.normalMoves;assert.equal(p.normalizePitReplay(bad),null);
 const past=clone(replay);past.engineVersion=11;assert.equal(p.normalizePitReplay(past),null);
});
test('published V4 through V10 archives retain their checksums and the documented V54 closed rejection',()=>{
 for(const file of fs.readdirSync('tests/fixtures').filter(file=>/^pit-replay-.*\.json$/.test(file))){
  const fixture=JSON.parse(fs.readFileSync('tests/fixtures/'+file));const old=fixture.replay??fixture;
  const before=JSON.stringify(old),replay=p.normalizePitReplay(old);
  if(file==='pit-replay-v54-equipment.json'){assert.equal(old.metadata.checksum,'4d7dd050');assert.equal(replay,null);}
  else {assert.ok(replay,file);assert.equal(replay.metadata.checksum,old.metadata.checksum,file);}
  assert.equal(JSON.stringify(old),before,file);
 }
});
test('108 native phase bindings contain only admitted original rectangles in both orientations',()=>{
 assert.equal(p.PIT_WORKBOOK_NORMAL_REGISTRY_V104.length,18);
 for(const [index,definition] of p.PIT_WORKBOOK_NORMAL_REGISTRY_V104.entries()){
  const move=p.PIT_WORKBOOK_NORMALS_V104[index],native=p.getPitWorkbookNativeV100(move.fighterId,move.actionId);
  assert.equal(p.validateHunterSpriteAtlas(definition.atlas).valid,true,move.actionId);
  assert.equal(definition.variantId,undefined);assert.equal(definition.atlas.clips.length,6);
  for(const clip of definition.atlas.clips){
   assert.equal(clip.loop,false);assert.equal(clip.status,'validated');
   assert.match(clip.id,new RegExp('^pit\\.'+move.posture+'\\.workbook-v104\\.'+move.key+'\\.(startup|active|recovery)$'));
   for(const frame of clip.frames)assert.ok(native.definition.atlas.clips.some(original=>original.facing===clip.facing&&original.frames.some(item=>
    item.pageId===frame.pageId&&JSON.stringify(item.rect)===JSON.stringify(frame.rect)&&JSON.stringify(item.pivot)===JSON.stringify(frame.pivot))),move.actionId);
  }
 }
});

test('the actual native PNG decoder and complete admission validator accept all18 atlases and108 phases',async()=>{
 const definitions=p.PIT_WORKBOOK_NORMAL_REGISTRY_V104;
 const pages=[...new Map(definitions.flatMap(definition=>definition.atlas.pages).map(page=>[page.src,page])).values()];
 const decoded=new Map();
 for(const page of pages){const {data,info}=await sharp('public'+page.src).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  decoded.set(page.src,{pixels:new Uint8ClampedArray(data),width:info.width,height:info.height});}
 const previous={Image:globalThis.Image,document:globalThis.document};
 globalThis.Image=class{set src(value){if(!value)return;const source=decoded.get(value);if(!source){queueMicrotask(()=>this.onerror?.());return;}
  Object.assign(this,source);this.complete=true;this.naturalWidth=source.width;this.naturalHeight=source.height;queueMicrotask(()=>this.onload?.());}};
 globalThis.document={createElement(){const canvas={width:0,height:0,pixels:null};canvas.getContext=()=>({
  clearRect(){canvas.pixels=new Uint8ClampedArray(canvas.width*canvas.height*4);},
  drawImage(image,...args){const [x,y,w,h]=args.length===8?args.slice(0,4):[0,0,image.width,image.height];
   assert.equal(w,canvas.width);assert.equal(h,canvas.height);canvas.pixels=new Uint8ClampedArray(w*h*4);
   for(let row=0;row<h;row++)canvas.pixels.set(image.pixels.subarray(((y+row)*image.width+x)*4,((y+row)*image.width+x+w)*4),row*w*4);},
  getImageData(){return{data:canvas.pixels.slice()};},putImageData(image){canvas.pixels=image.data.slice();}});return canvas;}};
 try{
  const bank=await p.loadPitSpriteSheetAnimations(['feral-hunter','scar'],definitions);
  assert.deepEqual(bank.failedAtlasIds,[]);assert.equal(bank.readyClipCount,108);
  for(const move of p.PIT_WORKBOOK_NORMALS_V104)for(const facing of [-1,1]){
   let state=start(move);state.fighters[0].facing=facing;
   for(const phase of ['startup','active','recovery']){
    while(state.fighters[0].phase!==phase)state=p.stepPitCombat(state,[{},{}]);
    const frame=p.resolvePitSpriteSheetAnimation(bank,state.fighters[0],{simulationFrame:state.frame,combat:state});
    assert.ok(frame,move.actionId+'/'+facing+'/'+phase);
    assert.equal(frame.resolved.frame.clip.id,`pit.${move.posture}.workbook-v104.${move.key}.${phase}`);
   }
  }
 }finally{Object.assign(globalThis,previous);}
});
