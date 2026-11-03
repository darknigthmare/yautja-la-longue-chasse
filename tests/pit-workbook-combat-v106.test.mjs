import test, {after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
const directory=await fs.mkdtemp(path.join(os.tmpdir(),'pit-v106-engine-'));
after(()=>fs.rm(directory,{recursive:true,force:true}));
const output=path.join(directory,'engine.mjs');
await build({stdin:{contents:["export * from './app/game/systems/pitCombat.ts';","export * from './app/game/systems/pitWorkbookMovesV105.ts';","export * from './app/game/systems/pitWorkbookCombatV106.ts';","export * from './app/game/systems/pitWorkbookMotionV106.ts';","export * from './app/game/systems/pitWorkbookProjectileSourceV106.ts';","export * from './app/game/systems/pitReplay.ts';","export * from './app/game/systems/pitTraining.ts';"].join('\n'),resolveDir:process.cwd()},bundle:true,outfile:output,platform:'node',format:'esm',logLevel:'silent'});
const p=await import(pathToFileURL(output));
const clone=x=>JSON.parse(JSON.stringify(x));
function fresh(id='feral-hunter',recipe='workbook-v106') {const state=p.createPitCombatState(id,id==='scar'?'feral-hunter':'scar',{mode:'training',...(recipe?{normalMoves:recipe}:{})});Object.assign(state.fighters[0],{x:200,traque:1000});state.fighters[1].x=850;return state;}
const step=(state,left={},right={})=>p.stepPitCombat(state,[left,right]);
function begin(id,action){return step(fresh(id),{workbookAction:action});}
function advance(state,count,left={},right={}){for(let n=0;n<count;n++)state=step(state,left,right);return state;}
const checkRoundtrip=state=>assert.deepEqual(p.deserializePitCombat(p.serializePitCombat(state)),state);

test('three source entity actions own V14 deadlines and one exact gauge debit, including snapshots during their action',()=>{
 for(const [id,key,input] of [['feral-hunter','S1','projectile'],['feral-hunter','S2','shield'],['scar','S3','projectile']]) {
  const source=p.getPitWorkbookMoveV105(id,key);let state=begin(id,input);
  assert.equal(state.version,14);assert.equal(state.fighters[0].action.workbookMove,key);
  assert.equal(state.fighters[0].traque,1000-source.costPercent*10);
  const duration=source.startup+source.active+source.recovery;
  for(let frame=0;frame<duration;frame++) {
   assert.equal(state.fighters[0].action.frame,frame,id+'/'+key);assert.equal(state.fighters[0].phase,frame<source.startup?'startup':frame<source.startup+source.active?'active':'recovery');
   checkRoundtrip(state);state=step(state,{workbookAction:input});
  }
  assert.equal(state.fighters[0].action,null,'holding the accessible command never starts another action');
 }
});

test('Feral salve releases at23/25/27, reserves unique IDs, and keeps one fixed acquired point after a jump',()=>{
 let state=begin('feral-hunter','projectile');state=advance(state,23);
 assert.equal(state.fighters[0].action.frame,23);assert.equal(state.techniqueEffects.length,1);assert.equal(state.nextTechniqueEffectId,4);
 const target=clone(state.fighters[0].action.workbookVolleyV106);assert.deepEqual(state.techniqueEffects.map(e=>e.bolt.index),[0]);
 const saved=p.deserializePitCombat(p.serializePitCombat(state));
 const inputs=[[{}, {jump:true}], [{},{}], [{},{}], [{},{}]];
 let restored=saved;
 for(const [a,b] of inputs){state=step(state,a,b);restored=step(restored,a,b);assert.deepEqual(restored,state);checkRoundtrip(state);}
 assert.deepEqual(state.techniqueEffects.map(e=>e.bolt.index),[0,1,2]);
 assert.ok(state.fighters[1].y>0,'the target really jumped through the native motor');
 for(const effect of state.techniqueEffects) {assert.equal(effect.bolt.targetX,target.targetX);assert.equal(effect.bolt.targetY,target.targetY);assert.equal(effect.workbookMove,'S1');assert.equal(effect.id,target.volleyId+effect.bolt.index);}
 assert.deepEqual(state.techniqueEffects.map(e=>e.age),[5,3,1]);
 assert.equal(state.fighters[0].traque,700,'one debit for the complete salve');
});

test('Feral115 is one salve budget split39/38/38 before ordinary power and combo scaling',()=>{
 let state=begin('feral-hunter','projectile');state.fighters[1].x=650;const hits=[];
 for(let n=0;n<85;n++){state=step(state);hits.push(...state.events.filter(e=>e.type==='hit'&&e.attackerId==='feral-hunter'));}
 assert.equal(hits.length,3);assert.deepEqual(hits.map(e=>e.combo),[1,2,3]);
 const power=p.PIT_FIGHTERS['feral-hunter'].power;
 assert.deepEqual(hits.map(e=>e.damage),[Math.round(39*power),Math.round(38*power*.88),Math.round(38*power*.76)]);
 assert.ok(hits.reduce((sum,e)=>sum+e.damage,0)<150,'never115 damage three times');
});

test('Scar cannon is emitted once from each independently calibrated muzzle and can be ducked',()=>{
 for(const facing of [1,-1])for(const duck of [false,true]){
  let state=begin('scar','projectile');state.fighters[0].facing=facing;state.fighters[0].x=facing===1?250:900;state.fighters[1].x=facing===1?700:450;state.fighters[1].facing=-facing;
  state=advance(state,20,{},duck?{down:true}:{});assert.equal(state.techniqueEffects.length,1);
  const effect=state.techniqueEffects[0],anchor=p.getPitWorkbookProjectileAnchorV106('scar',facing),muzzle=p.projectPitWorkbookAnchorV106(anchor,state.fighters[0].x,0,p.PIT_FIGHTERS.scar.bodyHeight);
  assert.equal(effect.workbookMove,'S3');assert.equal(effect.direction,facing);assert.equal(effect.y+p.PIT_FIGHTERS.scar.technique.height/2,muzzle.y);
  assert.equal(effect.x+p.PIT_FIGHTERS.scar.technique.width/2,muzzle.x+facing*p.PIT_FIGHTERS.scar.technique.speed);
  const hits=[];for(let n=0;n<65;n++){state=step(state,{},duck?{down:true}:{});hits.push(...state.events.filter(e=>e.type==='hit'&&e.attackerId==='scar'));}
  assert.equal(hits.length,duck?0:1);if(!duck)assert.equal(hits[0].damage,Math.round(105*p.PIT_FIGHTERS.scar.power));
 }
});

test('236/623/214/22 are real facing-relative motions for the delivered source commands',()=>{
 const cases=[['feral-hunter','236','S1'],['feral-hunter','623','S3'],['feral-hunter','214','S2'],['scar','236','S1'],['scar','623','S3'],['scar','22','S4']];
 for(const [id,motion,key] of cases)for(const facing of [1,-1]){
  let state=fresh(id);Object.assign(state.fighters[0],{x:facing===1?200:900,facing});Object.assign(state.fighters[1],{x:facing===1?850:250,facing:-facing});
  const directions=motion==='22'?[2,5,2]:motion.split('').map(Number);
  for(let i=0;i<directions.length;i++){
   const d=directions[i],horizontal=d===1||d===4?-facing:d===3||d===6?facing:0;
   state=step(state,{...(d<=3?{down:true}:{}),...(horizontal===1?{right:true}:horizontal===-1?{left:true}:{}),...(i===directions.length-1?{attack:'technique'}:{})});
   checkRoundtrip(state);
  }
  assert.equal(state.fighters[0].action?.workbookMove,key,id+'/'+motion+'/'+facing);
 }
});

test('invalid, held, expired and facing-crossed motions never become hidden legacy shots',()=>{
 let state=fresh();state=step(state,{attack:'technique'});assert.equal(state.fighters[0].action,null);
 state=fresh('scar');state=step(state,{down:true});state=step(state,{down:true,attack:'technique'});assert.equal(state.fighters[0].action,null,'holding2 is not22');
 state=fresh();state=step(state,{down:true});state=advance(state,25,{down:true});state=step(state,{down:true,right:true});state=step(state,{right:true,attack:'technique'});assert.equal(state.fighters[0].action,null);
 let motion=p.freshPitWorkbookMotionV106(1);motion=p.samplePitWorkbookMotionV106(motion,{down:true},1,1,true);motion=p.samplePitWorkbookMotionV106(motion,{right:true,down:true},1,2,true);motion=p.samplePitWorkbookMotionV106(motion,{right:true},1,3,true);
 assert.equal(p.resolvePitWorkbookMotionV106(motion,3),'236');assert.equal(p.resolvePitWorkbookMotionV106(motion,10),null);
 motion=p.samplePitWorkbookMotionV106(motion,{left:true},-1,4,true);assert.equal(p.resolvePitWorkbookMotionV106(motion,4),null);
 for(const action of ['projectile','shield']){state=fresh();state.fighters[0].traque=149;state=step(state,{workbookAction:action});assert.equal(state.fighters[0].action,null);assert.equal(state.fighters[0].traque,149);}
});

function shieldIncoming(frame,{behind=false,throwing=false}={}){
 let state=begin('feral-hunter','shield');state=advance(state,frame-1);state.fighters[0].x=400;state.fighters[0].facing=1;state.fighters[1].x=throwing?455:behind?305:495;state.fighters[1].facing=behind?1:-1;
 if(throwing)state.fighters[1].action={kind:'throw',attack:null,frame:6,connected:false};
 else state.fighters[1].action={kind:'attack',attack:'light',normalMove:'5L',frame:p.getPitWorkbookMoveV105('scar','5L').startup-1,connected:false};
 state.fighters[1].phase='startup';checkRoundtrip(state);return step(state);
}
test('Feral shield is the native forward surface for9 ticks, then one short edge; flank and throws win',()=>{
 for(const frame of [9,17]){const state=shieldIncoming(frame);assert.ok(state.events.some(e=>e.type==='block'&&e.defenderId==='feral-hunter'&&e.damage===0));assert.equal(state.fighters[0].action.workbookMove,'S2');assert.equal(state.fighters[0].phase,'active');assert.ok(p.getPitWorkbookShieldBoxV106(state.fighters[0]));}
 for(const [frame,options] of [[8,{}],[18,{}],[9,{behind:true}],[9,{throwing:true}]]){const state=shieldIncoming(frame,options);assert.ok(state.events.some(e=>e.type==='hit'&&e.defenderId==='feral-hunter'),JSON.stringify([frame,options]));}
 let state=begin('feral-hunter','shield');state.fighters[0].x=400;state.fighters[1].x=495;const hits=[];
 for(let n=0;n<30;n++){state=step(state);hits.push(...state.events.filter(e=>e.type==='hit'&&e.attackerId==='feral-hunter'));if(n<8)assert.equal(p.getPitFighterBoxes(state.fighters[0]).hitbox,null);}
 assert.equal(hits.length,1);assert.equal(hits[0].damage,Math.round(70*p.PIT_FIGHTERS['feral-hunter'].power));
});

test('V14 replay inputs use twelve bits per actor without stealing the resource bit or changing V13 bytes',()=>{
 for(const version of [11,12,13,14])for(const action of [undefined,'light','technique','equipment','contact','counter','projectile','shield','super']) {
  if(version<13&&['equipment','contact','counter','projectile','shield','super'].includes(action)||version===13&&['projectile','shield','super'].includes(action))continue;
  const input={left:true,down:true,resource:true,...(action?['light','technique'].includes(action)?{attack:action}:{workbookAction:action}:{})};
  const mask=p.encodePitReplayInput(input,version);assert.deepEqual(p.decodePitReplayInput(mask,version),input);
  const pair=p.encodePitReplayInputs([input,{right:true}],version);assert.deepEqual(p.decodePitReplayInputs(pair,version),[input,{right:true}]);
 }
 assert.equal(p.encodePitReplayInput({resource:true},13),1024);assert.equal(p.encodePitReplayInput({resource:true},14),2048);
 assert.throws(()=>p.encodePitReplayInput({workbookAction:'projectile'},13));assert.throws(()=>p.decodePitReplayInput(11<<7,14));assert.throws(()=>p.decodePitReplayInputs(1<<24,14));
 const inputs=[{resource:true},{workbookAction:'equipment'},{workbookAction:'projectile'},{workbookAction:'shield'},{resource:true,attack:'medium'}];
 const sequence=p.recordPitTrainingSequence(inputs);assert.equal(sequence.version,3);assert.equal(sequence.encoding,'dummy-input-rle-v3');assert.ok(p.normalizePitTrainingSequence(sequence));
 assert.deepEqual(sequence.segments.map(s=>p.decodePitTrainingInput(s[1],3)),inputs);
});

test('V14 snapshots reject foreign motion history, forged salves and incompatible recipe versions',()=>{
 let state=begin('feral-hunter','projectile');state=advance(state,23);checkRoundtrip(state);
 for(const mutate of [s=>s.version=13,s=>s.fighters[0].workbookMotion.steps.push({direction:2,frame:s.frame+1}),s=>s.fighters[0].action.workbookVolleyV106.volleyId=999,s=>s.techniqueEffects[0].workbookMove='S3',s=>s.techniqueEffects[0].bolt.targetY+=1]){const broken=clone(state);mutate(broken);assert.throws(()=>p.deserializePitCombat(JSON.stringify(broken)));}
 const legacy=fresh('feral-hunter','workbook-v105');legacy.fighters[0].workbookMotion={facing:1,steps:[]};assert.throws(()=>p.deserializePitCombat(JSON.stringify(legacy)));
});

test('V14 deterministic replay reproduces a real earned-gauge projectile and its full salve state',()=>{
 const options={fighters:['feral-hunter','scar'],rules:{mode:'training',normalMoves:'workbook-v106'},seed:106};
 const recorder=p.createPitReplayRecorder(options);let state=p.createPitCombatState(...options.fighters,{mode:'training',normalMoves:'workbook-v106'});let shots=0;
 for(let n=0;n<1400;n++){
  const f=state.fighters[0],other=state.fighters[1];let input={};
  if(f.phase==='idle')input=f.traque>=300?(shots++,{workbookAction:'projectile'}):Math.abs(other.x-f.x)>58?{right:other.x>f.x,left:other.x<f.x}:n%3===0?{attack:'light'}:{};
  recorder.append([input,{}]);state=step(state,input);
 }
 assert.ok(shots>0,'the recording earned its gauge through ordinary pressure and contact');
 const replay=recorder.finish();assert.equal(replay.engineVersion,14);const validated=p.deserializePitReplay(p.serializePitReplay(replay));assert.ok(validated);
 const playback=p.playPitReplay(validated);assert.equal(createHash('sha256').update(p.serializePitCombat(playback)).digest('hex'),createHash('sha256').update(p.serializePitCombat(state)).digest('hex'));
});

function legacyTrace(frame,slot){const n=frame%180;if(n<35)return slot===0?{right:true}:{left:true};if(n>=145)return slot===0?{left:true}:{right:true};if(n%27===0)return{attack:'technique'};if(n%23===0)return{workbookAction:'contact'};if(n%31===0)return{workbookAction:'equipment'};if(n%37===0)return{workbookAction:'counter'};if(n%19===0)return{throw:true};if(n%17===0)return{resource:true};if(n%13===0)return{jump:true,attack:'light'};if(n%11===0)return{down:true,attack:'medium'};if(n%7===0)return{attack:'heavy'};if(n%5===0)return{attack:'light'};return slot===1?{guardHigh:true}:{};}
test('V11/V12/V13 remain byte-identical to pinned main through six720-tick contact/equipment/projectile traces',async()=>{
 const fixture=JSON.parse(await fs.readFile('tests/fixtures/pit-workbook-legacy-v106.json','utf8'));
 assert.equal(fixture.baselineCommit,'28e9b6360ae30530525d55e307380d46d0eef8e1');
 for(const entry of fixture.cases){let state=p.createPitCombatState(entry.fighterId,entry.fighterId==='scar'?'feral-hunter':'scar',{mode:'training',...(entry.recipe?{normalMoves:entry.recipe}:{})});state.fighters[0].traque=1000;state.fighters[1].traque=1000;
  const hash=createHash('sha256');hash.update(p.serializePitCombat(state));
  for(let frame=0;frame<entry.frames;frame++){let inputs=[legacyTrace(frame,0),legacyTrace(frame+9,1)];if(!entry.recipe||entry.recipe==='workbook-v104')inputs=inputs.map(({workbookAction,...rest})=>workbookAction?{}:rest);state=p.stepPitCombat(state,inputs);hash.update(p.serializePitCombat(state));}
  assert.equal(hash.digest('hex'),entry.sha256,entry.recipe+'/'+entry.fighterId);
 }
});

function superStart(id,facing=1,{block=false,whiff=false}={}) {
 let state=fresh(id);Object.assign(state.fighters[0],{x:facing===1?400:800,facing});Object.assign(state.fighters[1],{x:facing===1?(whiff?900:490):(whiff?250:710),facing:-facing});
 state=step(state,{workbookAction:'super'},block?{guardHigh:true}:{});assert.equal(state.fighters[0].action.workbookMove,'SUPER');assert.equal(state.fighters[0].traque,0);
 return state;
}
test('both source supers keep24/8/48 deadlines and abort the scene on guard or whiff',()=>{
 for(const id of ['feral-hunter','scar'])for(const facing of [1,-1])for(const options of [{block:true},{whiff:true}]){
  let state=superStart(id,facing,options),blocks=0;
  for(let frame=0;frame<80;frame++){
   assert.equal(state.fighters[0].action.frame,frame);assert.equal(state.fighters[0].action.workbookSuperV106,undefined);assert.equal(p.getPitSuperCameraV106(state),null);assert.equal(state.techniqueEffects.length,0);checkRoundtrip(state);
   state=step(state,{},options.block?{guardHigh:true}:{});blocks+=state.events.filter(e=>e.type==='block').length;
  }
  assert.equal(state.fighters[0].action,null);if(options.block)assert.equal(blocks,1,id+'/'+facing);
 }
});
test('confirmed supers use a real independent victim, bounded camera and physical source follow-ups with a280 base budget',()=>{
 for(const id of ['feral-hunter','scar'])for(const facing of [1,-1]){
  let state=superStart(id,facing),hits=[],launches=new Set(),saved;
  const before=state.fighters.map(f=>({x:f.x,y:f.y,health:f.health}));
  for(let frame=0;frame<80;frame++){
   assert.equal(state.fighters[0].action.frame,frame);checkRoundtrip(state);
   if(frame>=24){assert.ok(state.fighters[0].action.workbookSuperV106,id+'/'+facing+'/'+frame);assert.equal(state.fighters[0].x,before[0].x);assert.equal(state.fighters[1].x,before[1].x);assert.equal(state.fighters[1].y,before[1].y);assert.equal(state.fighters[1].guard,null);}
   const camera=p.getPitSuperCameraV106(state);if(frame>=24&&frame<72){assert.ok(camera);assert.ok(camera.zoom>=1&&camera.zoom<=1.08);assert.ok(camera.x>=0&&camera.x<=p.PIT_ARENA.width);}else assert.equal(camera,null);
   if(frame===44)saved=p.deserializePitCombat(p.serializePitCombat(state));
   for(const effect of state.techniqueEffects)if(effect.workbookMove==='SUPER')launches.add(effect.id);
   state=step(state);hits.push(...state.events.filter(e=>e.type==='hit'&&e.attackerId===id));
   if(frame>=44){saved=step(saved);assert.deepEqual(saved,state,'a mid-recovery save reproduces all later collisions and camera');}
  }
  const bases=id==='feral-hunter'?[40,80,80,80]:[80,200],power=p.PIT_FIGHTERS[id].power;
  assert.deepEqual(hits.map(e=>e.damage),bases.map((base,index)=>Math.round(base*power*(1-index*.12))),id+'/'+facing);
  assert.equal(bases.reduce((a,b)=>a+b),280);assert.equal(state.nextTechniqueEffectId,id==='feral-hunter'?4:1);if(id==='feral-hunter')assert.deepEqual(hits.slice(1).map(e=>e.frame),[49,51,53]);assert.ok(launches.size<=3);assert.equal(state.fighters[0].action,null);assert.equal(p.getPitSuperCameraV106(state),null);
 }
});
test('a real contact interruption cancels unlaunched super continuation and immediately restores ordinary focus',()=>{
 for(const id of ['feral-hunter','scar']){
  let state=superStart(id);state=advance(state,35);assert.ok(state.fighters[0].action.workbookSuperV106);assert.ok(p.getPitSuperCameraV106(state));
  const opponent=state.fighters[1];Object.assign(opponent,{phase:'startup',stunFrames:0,action:{kind:'attack',attack:'light',normalMove:'5L',frame:p.getPitWorkbookMoveV105(opponent.definitionId,'5L').startup-1,connected:false}});
  state=step(state);assert.ok(state.events.some(e=>e.type==='hit'&&e.defenderId===id));assert.equal(state.fighters[0].action,null);assert.equal(p.getPitSuperCameraV106(state),null);const damage=state.fighters[1].health;
  state=advance(state,55);assert.equal(state.fighters[1].health,damage);assert.equal(state.techniqueEffects.length,0);checkRoundtrip(state);
 }
});
test('236236+S has precedence over236 and super input survives V14 replay and V3 dummy recording',()=>{
 for(const id of ['feral-hunter','scar'])for(const facing of [1,-1]){
  let state=fresh(id);Object.assign(state.fighters[0],{x:facing===1?200:900,facing});state.fighters[1].x=facing===1?850:250;
  for(const [index,d] of [2,3,6,2,3,6].entries())state=step(state,{...(d<4?{down:true}:{}),...(d===3||d===6?facing===1?{right:true}:{left:true}:{}),...(index===5?{attack:'technique'}:{})});
  assert.equal(state.fighters[0].action.workbookMove,'SUPER');assert.equal(state.fighters[0].traque,0);checkRoundtrip(state);
 }
 const input={resource:true,workbookAction:'super'};assert.deepEqual(p.decodePitReplayInput(p.encodePitReplayInput(input,14),14),input);assert.throws(()=>p.encodePitReplayInput(input,13));
 const sequence=p.recordPitTrainingSequence([{resource:true},input]);assert.equal(sequence.version,3);assert.deepEqual(sequence.segments.map(s=>p.decodePitTrainingInput(s[1],3)),[{resource:true},input]);
 let state=advance(superStart('scar'),25);for(const mutate of [s=>s.fighters[0].action.workbookSuperV106.confirmedFrame=s.frame+1,s=>s.fighters[0].action.workbookSuperV106.confirmedFrame=1,s=>s.fighters[0].action.workbookSuperV106.followupConnected=true]){const forged=clone(state);mutate(forged);assert.throws(()=>p.deserializePitCombat(JSON.stringify(forged)));}
});


test('native forward shields consume real plasma flights; the same plasma is high-blockable without hidden chip or knockdown',()=>{
 for(const facing of [1,-1]){
  let state=begin('feral-hunter','shield');state=advance(state,8);Object.assign(state.fighters[0],{x:facing===1?400:800,facing});
  const scar=state.fighters[1];Object.assign(scar,{x:facing===1?495:705,facing:-facing,phase:'startup',action:{kind:'attack',attack:'technique',workbookMove:'S3',frame:19,connected:false}});checkRoundtrip(state);
  const hp=state.fighters[0].health;let absorbed=false;for(let n=0;n<8;n++){state=step(state);if(state.events.some(e=>e.type==='block'&&e.defenderId==='feral-hunter'&&e.damage===0)){absorbed=true;break;}}assert.ok(absorbed,JSON.stringify({facing,events:state.events,effects:state.techniqueEffects,shield:p.getPitWorkbookShieldBoxV106(state.fighters[0])}));assert.equal(state.fighters[0].health,hp);assert.equal(state.fighters[0].action.workbookMove,'S2');assert.equal(state.techniqueEffects.length,0);
  state=begin('scar','projectile');Object.assign(state.fighters[0],{x:facing===1?250:900,facing});Object.assign(state.fighters[1],{x:facing===1?700:450,facing:-facing});const blocks=[];
  for(let n=0;n<65;n++){state=step(state,{}, {guardHigh:true});blocks.push(...state.events.filter(e=>e.type==='block'));assert.notEqual(state.fighters[1].phase,'knockdown');}
  assert.equal(blocks.length,1);assert.equal(blocks[0].damage,0);assert.equal(state.fighters[1].health,p.PIT_FIGHTERS['feral-hunter'].maxHealth);
 }
});
test('interrupting a partially launched ordinary salve cancels only its unlaunched bolts',()=>{
 let state=advance(begin('feral-hunter','projectile'),23);assert.equal(state.techniqueEffects.length,1);const first=state.techniqueEffects[0].id;
 const scar=state.fighters[1];Object.assign(scar,{x:300,facing:-1,phase:'startup',action:{kind:'attack',attack:'light',normalMove:'5L',frame:p.getPitWorkbookMoveV105('scar','5L').startup-1,connected:false}});
 state=step(state);assert.ok(state.events.some(e=>e.type==='hit'&&e.defenderId==='feral-hunter'));assert.equal(state.fighters[0].action,null);
 for(let n=0;n<8;n++){assert.ok(state.techniqueEffects.every(effect=>effect.id===first));checkRoundtrip(state);state=step(state);}
});
