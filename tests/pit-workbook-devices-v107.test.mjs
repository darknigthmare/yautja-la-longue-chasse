import test, {after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
const directory=await fs.mkdtemp(path.join(os.tmpdir(),'pit-v107-devices-'));
after(()=>fs.rm(directory,{recursive:true,force:true}));
const output=path.join(directory,'engine.mjs');
await build({stdin:{contents:['pitCombat','pitReplay','pitTraining','pitWorkbookCombatV107','pitWorkbookDeviceSourceV107'].map(name=>`export * from './app/game/systems/${name}.ts';`).join('\n'),resolveDir:process.cwd()},bundle:true,outfile:output,platform:'node',format:'esm',logLevel:'silent'});
const p=await import(pathToFileURL(output));
const clone=value=>JSON.parse(JSON.stringify(value));
const step=(state,left={},right={})=>p.stepPitCombat(state,[left,right]);
function advance(state,count,left={},right={}){for(let n=0;n<count;n++)state=step(state,left,right);return state;}
function fresh(id='feral-hunter',facing=1,near=false){
 const state=p.createPitCombatState(id,id==='scar'?'feral-hunter':'scar',{mode:'training',normalMoves:'workbook-v107'});
 Object.assign(state.fighters[0],{x:facing===1?300:900,facing,traque:1000});
 Object.assign(state.fighters[1],{x:state.fighters[0].x+facing*(near?110:450),facing:-facing});return state;
}
const roundtrip=state=>assert.deepEqual(p.deserializePitCombat(p.serializePitCombat(state)),state);
const hits=(state,id)=>state.events.filter(event=>event.type==='hit'&&event.attackerId===id);

test('mine and shuriken own exact source clocks/costs and first physically detached native drawing in both directions',()=>{
 for(const [id,input,key,release,cost,duration] of [['feral-hunter','mine','S4',20,350,154],['scar','shuriken','S2',27,250,56]])for(const facing of [1,-1]){
  let state=step(fresh(id,facing),{workbookAction:input});assert.equal(state.version,15);assert.equal(state.fighters[0].traque,1000-cost);
  assert.equal(state.fighters[0].action.workbookMove,key);assert.equal(state.fighters[0].workbookDeviceV107.status,'held');
  for(let frame=0;frame<duration;frame++){
   assert.equal(state.fighters[0].action.frame,frame);assert.ok(state.fighters[0].traque>=1000-cost);
   assert.equal(p.getPitFighterBoxes(state.fighters[0]).hitbox,null,'BODY never fabricates an offensive hand hitbox');
   if(frame<release)assert.equal(state.workbookDevicesV107.length,0);
   if(frame===release){
    assert.equal(state.workbookDevicesV107.length,1);const device=state.workbookDevicesV107[0];assert.equal(device.age,0);
    const anchor=input==='mine'?p.getPitWorkbookMinePlacementV107(facing):p.getPitWorkbookShurikenLaunchV107(facing);
    const point=p.projectPitWorkbookDeviceAnchorV107(anchor,state.fighters[0].x,0,p.PIT_FIGHTERS[id].bodyHeight),box=p.getPitWorkbookDeviceBoxV107(device);
    assert.equal(box.x+box.width/2,point.x);assert.equal(box.y,input==='mine'?0:point.y-box.height/2);
   }
   roundtrip(state);state=step(state,{workbookAction:input});
  }
  assert.equal(state.fighters[0].action,null);assert.equal(state.fighters[0].workbookDeviceV107.status,'spent');
 }
});

test('mine arming colors cause no free hit; only a real ground proximity at94 detonates once for105 base',()=>{
 for(const facing of [1,-1]){
  let state=step(fresh('feral-hunter',facing,true),{workbookAction:'mine'});const initial=state.fighters[1].health;let count=0;
  for(let frame=1;frame<=94;frame++){
   state=step(state);count+=hits(state,'feral-hunter').length;
   if(frame>=20&&frame<94){const device=state.workbookDevicesV107[0];assert.equal(device.phase,frame<64?'amber':'off');assert.equal(state.fighters[1].health,initial);}
  }
  assert.equal(count,1);assert.equal(state.fighters[1].health,initial-Math.round(105*p.PIT_FIGHTERS['feral-hunter'].power));
  assert.equal(state.workbookDevicesV107.length,0);assert.equal(state.fighters[0].workbookDeviceV107.status,'spent');
  assert.ok(state.events.some(event=>event.type==='workbook-device-v107'&&event.event==='detonated'));
  state=advance(state,170);assert.equal(state.fighters[1].health,initial-Math.round(105*p.PIT_FIGHTERS['feral-hunter'].power));
 }
});

test('mine arming alone never attacks a distant actor, and a genuine jump evades its low proximity',()=>{
 let state=step(fresh(),{workbookAction:'mine'});state=advance(state,94);
 assert.equal(state.workbookDevicesV107[0].phase,'armed');assert.equal(hits(state,'feral-hunter').length,0);roundtrip(state);
 state=advance(state,59);assert.equal(state.workbookDevicesV107.length,1);state=step(state);assert.equal(state.workbookDevicesV107.length,0);
 assert.equal(state.fighters[0].workbookDeviceV107.status,'spent');assert.ok(state.events.some(event=>event.event==='expired'));
 state=step(fresh('feral-hunter',1,true),{workbookAction:'mine'});state=advance(state,78);state=step(state,{}, {jump:true});state=advance(state,15);
 assert.ok(state.fighters[1].y>70);assert.equal(state.workbookDevicesV107[0].phase,'armed');assert.equal(state.fighters[1].health,p.PIT_FIGHTERS.scar.maxHealth);
});

test('the mine requires a frontal low guard, and a new round issues exactly one fresh object',()=>{
 for(const facing of [1,-1])for(const low of [false,true]){
  let state=step(fresh('feral-hunter',facing,true),{workbookAction:'mine'},low?{guardLow:true}:{guardHigh:true});const health=state.fighters[1].health;let blocks=0;
  for(let n=0;n<110;n++){state=step(state,{},low?{guardLow:true}:{guardHigh:true});blocks+=state.events.filter(event=>event.type==='block').length;}
  assert.equal(blocks,low?1:0);assert.equal(state.fighters[1].health,health-(low?0:Math.round(105*p.PIT_FIGHTERS['feral-hunter'].power)));assert.equal(state.workbookDevicesV107.length,0);
 }
 let state=p.createPitCombatState('feral-hunter','scar',{normalMoves:'workbook-v107'});state.fighters[0].traque=1000;
 state=step(state,{workbookAction:'mine'});state=advance(state,170);assert.equal(state.fighters[0].workbookDeviceV107.status,'spent');
 for(let n=0;n<3000&&state.phase==='round';n++){
  const [actor,enemy]=state.fighters;const input=actor.phase!=='idle'?{}:Math.abs(enemy.x-actor.x)>85?{left:enemy.x<actor.x,right:enemy.x>actor.x}:{attack:'heavy'};
  state=step(state,input);
 }
 assert.equal(state.phase,'round-over');assert.equal(state.fighters[0].roundsWon,1);roundtrip(state);
 state=advance(state,p.PIT_ROUND_TRANSITION_FRAMES);assert.equal(state.round,2);assert.equal(state.workbookDevicesV107.length,0);
 assert.equal(state.fighters[0].workbookDeviceV107.status,'ready');assert.equal(state.fighters[1].workbookDeviceV107.status,'ready');roundtrip(state);
});

test('a low physical strike destroys the independent mine without damage or free Traque',()=>{
 for(const facing of [1,-1]){
  let state=step(fresh('feral-hunter',facing),{workbookAction:'mine'});state=advance(state,25);
  const device=state.workbookDevicesV107[0];state.fighters[1].x=device.x+11+facing*65;state.fighters[1].facing=-facing;
  const before=state.fighters.map(fighter=>({health:fighter.health,traque:fighter.traque}));let destroyed=false;
  state=step(state,{}, {down:true,attack:'light'});
  for(let n=0;n<35;n++){state=step(state,{}, {down:true});destroyed ||=state.events.some(event=>event.type==='workbook-device-v107'&&event.event==='destroyed');roundtrip(state);}
  assert.equal(destroyed,true);assert.equal(state.workbookDevicesV107.length,0);
  assert.deepEqual(state.fighters.map(fighter=>({health:fighter.health,traque:fighter.traque})),before);
 }
});

test('shuriken is one autonomous physical flight, blocked without chip and bounded on a whiff',()=>{
 for(const facing of [1,-1])for(const guard of [false,true]){
  let state=step(fresh('scar',facing),{workbookAction:'shuriken'},guard?{guardHigh:true}:{});let hitCount=0,blocks=0;
  for(let frame=1;frame<90;frame++){state=step(state,{},guard?{guardHigh:true}:{});hitCount+=hits(state,'scar').length;blocks+=state.events.filter(event=>event.type==='block'&&event.attackerId==='scar').length;roundtrip(state);}
  assert.equal(hitCount,guard?0:1);assert.equal(blocks,guard?1:0);assert.equal(state.fighters[1].health,p.PIT_FIGHTERS['feral-hunter'].maxHealth-(guard?0:Math.round(90*p.PIT_FIGHTERS.scar.power)));
  assert.equal(state.fighters[0].workbookDeviceV107.status,'spent');assert.equal(state.workbookDevicesV107.length,0);
 }
 let state=fresh('scar');state.fighters[0].x=120;state.fighters[1].x=60;state=step(state,{workbookAction:'shuriken'});state=advance(state,76);
 assert.equal(state.workbookDevicesV107.length,1);assert.equal(state.workbookDevicesV107[0].age,49);assert.equal(state.workbookDevicesV107[0].direction,1);assert.equal(state.fighters[0].facing,-1,'owner turns independently after its BODY action');
 state=step(state);assert.equal(state.workbookDevicesV107.length,0);assert.equal(hits(state,'scar').length,0);assert.ok(state.events.some(event=>event.event==='expired'));roundtrip(state);
});

test('single possession survives only unreleased interruption; deployed mine/star persists through a real enemy hit',()=>{
 for(const [id,input,release] of [['feral-hunter','mine',20],['scar','shuriken',27]])for(const after of [false,true]){
  let state=step(fresh(id),{workbookAction:input});state=advance(state,after?release:2);
  state.fighters[1].x=state.fighters[0].x-72;state.fighters[1].facing=1;
  state=step(state,{}, {attack:'light'});let interrupted=false;
  for(let n=0;n<12;n++){state=step(state);interrupted ||=hits(state,state.fighters[1].definitionId).length>0;}
  assert.ok(interrupted);assert.equal(state.fighters[0].workbookDeviceV107.status,after?'deployed':'ready');
  assert.equal(state.workbookDevicesV107.length,after?1:0);assert.ok(state.fighters[0].traque<1000,'spent cost is never refunded');roundtrip(state);
 }
});

test('insufficient gauge, wrong character command and EQUIP never create or replenish an item',()=>{
 for(const [id,input,cost] of [['feral-hunter','mine',350],['scar','shuriken',250]]){
  let state=fresh(id);state.fighters[0].traque=cost-1;state=step(state,{workbookAction:input});assert.equal(state.fighters[0].action,null);assert.equal(state.fighters[0].traque,cost-1);
  state=step(fresh(id),{workbookAction:input==='mine'?'shuriken':'mine'});assert.equal(state.fighters[0].action,null);assert.equal(state.fighters[0].traque,1000);
  state=step(fresh(id),{workbookAction:input});state=advance(state,170);assert.equal(state.fighters[0].workbookDeviceV107.status,'spent');
  state=step(state,{workbookAction:'equipment'});state=advance(state,100);assert.equal(state.fighters[0].workbookDeviceV107.status,'spent');
  const before=state.fighters[0].traque;state=step(state,{workbookAction:input});assert.equal(state.fighters[0].action,null);assert.equal(state.fighters[0].traque,before);
 }
});

test('new source motions22Feral/214Scar are recognized only under V15, at both facings',()=>{
 for(const id of ['feral-hunter','scar'])for(const facing of [1,-1])for(const recipe of ['workbook-v106','workbook-v107']){
  let state=fresh(id,facing);if(recipe==='workbook-v106'){state=p.createPitCombatState(id,id==='scar'?'feral-hunter':'scar',{normalMoves:recipe,mode:'training'});state.fighters[0].traque=1000;Object.assign(state.fighters[0],{x:facing===1?300:900,facing});state.fighters[1].x=facing===1?800:200;}
  const backward=facing===1?{left:true}:{right:true};const pattern=id==='feral-hunter'?[{down:true},{},{down:true}]:[{down:true},{...backward,down:true},backward];
  for(const input of pattern)state=step(state,input);state=step(state,{attack:'technique'});
  assert.equal(state.fighters[0].action?.workbookMove,recipe==='workbook-v107'?(id==='scar'?'S2':'S4'):undefined);
 }
});

test('snapshots preserve both device lifecycles at native boundaries and reject possession/codec forgery',()=>{
 for(const [id,input,ticks] of [['feral-hunter','mine',[0,19,20,33,34,63,64,93,94,153,154]],['scar','shuriken',[0,26,27,28,55,56,76,77]]]){
  for(const tick of ticks){let state=step(fresh(id),{workbookAction:input});state=advance(state,tick);let restored=p.deserializePitCombat(p.serializePitCombat(state));for(let n=0;n<160;n++){state=step(state);restored=step(restored);assert.deepEqual(restored,state);}}
 }
 const state=advance(step(fresh(),{workbookAction:'mine'}),30);
 for(const mutate of [s=>s.version=14,s=>s.rules.normalMoves='workbook-v106',s=>s.fighters[0].workbookDeviceV107.status='ready',s=>{s.workbookDevicesV107=[];s.fighters[0].workbookDeviceV107={item:'mine',status:'ready',effectId:null};},s=>s.fighters[0].workbookDeviceV107.effectId=999,s=>s.workbookDevicesV107[0].ownerSlot=1,s=>s.workbookDevicesV107[0].kind='shuriken',s=>s.workbookDevicesV107[0].phase='armed',s=>s.workbookDevicesV107[0].age=134,s=>s.workbookDevicesV107[0].y=1,s=>s.workbookDevicesV107.push(clone(s.workbookDevicesV107[0])),s=>s.workbookDevicesV107[0].id=s.nextTechniqueEffectId]){
  const forged=clone(state);mutate(forged);assert.throws(()=>p.deserializePitCombat(JSON.stringify(forged)));
 }
 const old=p.createPitCombatState('feral-hunter','scar',{normalMoves:'workbook-v106'});old.workbookDevicesV107=[];assert.throws(()=>p.deserializePitCombat(JSON.stringify(old)));
 for(const id of ['feral-hunter','scar']){
  const input=id==='scar'?'shuriken':'mine';const released=advance(step(fresh(id),{workbookAction:input}),30);
  const forged=clone(released);forged.workbookDevicesV107=[];forged.fighters[0].workbookDeviceV107={item:input,status:'ready',effectId:null};assert.throws(()=>p.deserializePitCombat(JSON.stringify(forged)));
  const future=clone(released);future.version=16;assert.throws(()=>p.deserializePitCombat(JSON.stringify(future)));
 }
});

test('V15 replay/training inputs admit only the two new codes and preserve old resource bits during recorder promotion',()=>{
 for(const input of [{workbookAction:'mine',resource:true},{workbookAction:'shuriken',down:true}]){
  assert.deepEqual(p.decodePitReplayInput(p.encodePitReplayInput(input,15),15),input);assert.deepEqual(p.decodePitTrainingInput(p.encodePitTrainingInput(input,4),4),input);
  assert.throws(()=>p.encodePitReplayInput(input,14));assert.throws(()=>p.decodePitReplayInput(p.encodePitReplayInput(input,15),14));assert.throws(()=>p.encodePitTrainingInput(input,3));
 }
 assert.throws(()=>p.decodePitReplayInput(13<<7,15));assert.throws(()=>p.decodePitTrainingInput(13<<7,4));
 // The current replay codec now supports V17; the next unknown engine must still fail closed.
 assert.throws(()=>p.encodePitReplayInput({},p.PIT_REPLAY_MAX_ENGINE_VERSION+1));assert.throws(()=>p.decodePitReplayInput(0,p.PIT_REPLAY_MAX_ENGINE_VERSION+1));assert.throws(()=>p.encodePitTrainingInput({},5));assert.throws(()=>p.decodePitTrainingInput(0,5));
 const sequence=p.recordPitTrainingSequence([{resource:true},{workbookAction:'projectile'},{workbookAction:'mine'},{workbookAction:'super'},{workbookAction:'shuriken'}]);
 assert.equal(sequence.version,4);assert.equal(sequence.encoding,'dummy-input-rle-v4');assert.ok(p.normalizePitTrainingSequence(sequence));
 assert.deepEqual(sequence.segments.map(segment=>p.decodePitTrainingInput(segment[1],4)),[{resource:true},{workbookAction:'projectile'},{workbookAction:'mine'},{workbookAction:'super'},{workbookAction:'shuriken'}]);
 assert.equal(p.normalizePitTrainingSequence({...sequence,version:3,encoding:'dummy-input-rle-v3'}),null);
});

test('a real recorded V15 duel earns its gauge, deploys both physical objects and replays byte-exactly',()=>{
 const options={fighters:['feral-hunter','scar'],rules:{mode:'training',normalMoves:'workbook-v107'},seed:107};
 const recorder=p.createPitReplayRecorder(options);let state=p.createPitCombatState(...options.fighters,options.rules),deployed=false,releases=new Set();
 const append=(inputs)=>{recorder.append(inputs);state=p.stepPitCombat(state,inputs);for(const event of state.events)if(event.type==='workbook-device-v107'&&(event.event==='placed'||event.event==='launched'))releases.add(event.kind);};
 for(let frame=0;frame<900;frame++){
  const [a,b]=state.fighters,distance=Math.abs(b.x-a.x);let inputs=[{},{}];
  if(a.traque>=350&&b.traque>=250){
   if(distance<300&&!deployed)inputs=[{left:true},{right:true}];
   else if(!deployed){inputs=[{workbookAction:'mine'},{workbookAction:'shuriken'}];deployed=true;}
  }else for(const slot of [0,1]){
   const fighter=state.fighters[slot],other=state.fighters[1-slot];
   if(fighter.phase==='idle')inputs[slot]=distance>85?{left:other.x<fighter.x,right:other.x>fighter.x}:{attack:'heavy'};
  }
  append(inputs);
  if(deployed&&releases.size===2&&state.workbookDevicesV107.length===0)break;
 }
 assert.equal(deployed,true);assert.deepEqual([...releases].sort(),['mine','shuriken']);
 const replay=recorder.finish();assert.equal(replay.engineVersion,15);
 const validated=p.deserializePitReplay(p.serializePitReplay(replay));assert.ok(validated);
 assert.equal(p.serializePitCombat(p.playPitReplay(validated)),p.serializePitCombat(state));
 assert.equal(p.normalizePitReplay({...clone(replay),engineVersion:14}),null);
 assert.throws(()=>p.stepPitReplayCombat(state,[{},{}],14));
});

function trace(frame,slot){const n=frame%240;if(n<30)return slot===0?{right:true}:{left:true};if(n>=200)return slot===0?{left:true}:{right:true};if(n===35)return{workbookAction:'super'};if(n===125)return{workbookAction:'projectile'};if(n===170)return{workbookAction:slot===0?'shield':'counter'};if(n%23===0)return{workbookAction:'contact'};if(n%17===0)return{attack:'heavy'};if(n%13===0)return{down:true,attack:'light'};if(n%11===0)return{attack:'medium'};if(n%7===0)return{guardHigh:true};return{};}
test('both V14 traces remain byte-exact to the captured pre-device engine through960ticks each',async()=>{
 const fixture=JSON.parse(await fs.readFile('tests/fixtures/pit-workbook-v14-compat-v107.json','utf8'));assert.equal(fixture.baseline,'main92e7c824-before-V107-combat-mutations');
 for(const entry of fixture.cases){let state=p.createPitCombatState(entry.fighterId,entry.fighterId==='scar'?'feral-hunter':'scar',{normalMoves:'workbook-v106',mode:'training'});state.fighters.forEach(fighter=>fighter.traque=1000);const hash=createHash('sha256');hash.update(p.serializePitCombat(state));for(let frame=0;frame<entry.frames;frame++){state=step(state,trace(frame,0),trace(frame+9,1));hash.update(p.serializePitCombat(state));}assert.equal(hash.digest('hex'),entry.sha256);}
});
