import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
const built=await build({stdin:{contents:[
 "export * from './app/game/systems/pitCombat.ts';",
 "export * from './app/game/systems/pitWorkbookCombatV105.ts';",
 "export * from './app/game/systems/pitWorkbookMovesV105.ts';",
 "export * from './app/game/systems/pitReplay.ts';",
 "export * from './app/game/systems/pitTraining.ts';",
 "export * from './app/game/systems/pitUserRoster.ts';",
].join('\n'),resolveDir:process.cwd()},bundle:true,write:false,platform:'node',format:'esm',logLevel:'silent'});
const p=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));
const recipe='workbook-v105',clone=x=>JSON.parse(JSON.stringify(x));
function fresh(fighter='scar'){
 const state=p.createPitCombatState(fighter,fighter==='scar'?'feral-hunter':'scar',{mode:'training',normalMoves:recipe});
 state.fighters[0].x=250;state.fighters[1].x=800;state.fighters[0].traque=1000;return state;
}
function begin(id,key){
 let state=fresh(id);
 const input=key==='6M'?{attack:'medium',right:true}:{workbookAction:key==='EQUIP'?'equipment':key==='S4'?'counter':'contact'};
 return p.stepPitCombat(state,[input,{}]);
}
const targets=[['scar','6M'],['feral-hunter','6M'],['scar','EQUIP'],['feral-hunter','EQUIP'],['scar','S1'],['feral-hunter','S3'],['scar','S4']];
test('seven source actions own exact deadlines, damage and bounded gauge costs in V13 only',()=>{
 for(const [id,key] of targets){
  const move=p.getPitWorkbookMoveV105(id,key);let state=begin(id,key);
  assert.equal(state.version,13);assert.equal(state.fighters[0].action.workbookMove,key);
  assert.equal(state.fighters[0].traque,1000-move.costPercent*10);
  const total=move.startup+move.active+move.recovery;
  const x=state.fighters[0].x;
  for(let frame=0;frame<total;frame++){
   const fighter=state.fighters[0];
   assert.equal(fighter.action.frame,frame,`${id}/${key}`);
   assert.equal(fighter.phase,frame<move.startup?'startup':frame<move.startup+move.active?'active':'recovery');
   assert.deepEqual(p.deserializePitCombat(p.serializePitCombat(state)),state);
   assert.equal(state.techniqueEffects.length,0,'contact never launches legacy plasma or bolts');
   if(key==='EQUIP') {assert.equal(p.getPitFighterBoxes(fighter).hitbox,null);assert.equal(fighter.action.attack,null);}
   else {const attack=p.getPitCombatAttackDefinition(fighter,fighter.action.attack);assert.equal(attack.damage,move.damage);}
   state=p.stepPitCombat(state,[{},{}]);
  }
  assert.equal(state.fighters[0].action,null);assert.equal(state.fighters[0].phase,'idle');
  if(key==='6M')assert.ok(state.fighters[0].x>x,'source step advances before the strike');
 }
});
test('6M is forward-relative and latched; backward, down and air medium keep normal source keys',()=>{
 let state=fresh('scar');state.fighters[0].facing=-1;state.fighters[0].x=800;state.fighters[1].x=250;
 state=p.stepPitCombat(state,[{attack:'medium',left:true},{}]);assert.equal(state.fighters[0].action.workbookMove,'6M');
 state=p.stepPitCombat(state,[{down:true,right:true},{}]);assert.equal(state.fighters[0].action.workbookMove,'6M');
 for(const [input,key,air] of [[{attack:'medium',left:true},'5M'],[{attack:'medium',down:true,right:true},'2M'],[{attack:'medium',right:true},'jM',true]]){
  state=fresh('scar');if(air)Object.assign(state.fighters[0],{grounded:false,y:100,velocityY:1});
  state=p.stepPitCombat(state,[input,{}]);assert.equal(state.fighters[0].action.normalMove,key);assert.equal(state.fighters[0].action.workbookMove,undefined);
 }
});
test('contact specials deal source damage and obey both guards with no projectile substitute',()=>{
 for(const [id,key] of [['scar','S1'],['feral-hunter','S3']])for(const guard of [null,'high','low']){
  let state=begin(id,key);state.fighters[0].x=300;state.fighters[1].x=365;const events=[];
  for(let n=0;n<30;n++){state=p.stepPitCombat(state,[{},guard==='high'?{guardHigh:true}:guard==='low'?{guardLow:true,down:true}:{}]);events.push(...state.events);assert.equal(state.techniqueEffects.length,0);}
  const event=events.find(e=>e.type===(guard?'block':'hit')&&e.attackerId===id);assert.ok(event,`${id}/${guard}`);
  if(!guard)assert.equal(event.damage,Math.round(p.getPitWorkbookMoveV105(id,key).damage*p.PIT_FIGHTERS[id].power));
 }
});
test('equipment cannot attack, evade damage or repeat while held; insufficient gauge never starts a paid command',()=>{
 let state=begin('scar','EQUIP');state.fighters[0].x=300;state.fighters[1].x=365;
 state=p.stepPitCombat(state,[{workbookAction:'equipment'},{attack:'light'}]);
 const events=[];for(let n=0;n<20;n++){state=p.stepPitCombat(state,[{workbookAction:'equipment',attack:'heavy'},{}]);events.push(...state.events);}
 assert.ok(events.some(e=>e.type==='hit'&&e.defenderId==='scar'));
 for(const action of ['contact','counter']){state=fresh(action==='contact'?'feral-hunter':'scar');state.fighters[0].traque=99;state=p.stepPitCombat(state,[{workbookAction:action},{}]);assert.equal(state.fighters[0].action,null);assert.equal(state.fighters[0].traque,99);}
 let held=begin('scar','EQUIP');for(let n=0;n<45;n++)held=p.stepPitCombat(held,[{workbookAction:'equipment'},{}]);assert.equal(held.fighters[0].action,null,'holding equipment never repeats');
 state=fresh();state.fighters[0].traque=0;state=p.stepPitCombat(state,[{workbookAction:'contact'},{}]);assert.equal(state.fighters[0].action.workbookMove,'S1');
});
function strikeAgainstCounter({counterFrame=5,behind=false,kind='light'}={}){
 let state=begin('scar','S4');
 state.fighters[0].x=400;state.fighters[1].x=behind?340:460;state.fighters[0].facing=1;state.fighters[1].facing=behind?1:-1;
 state.fighters[0].action.frame=counterFrame-1;
 const phase=counterFrame-1<5?'startup':counterFrame-1<19?'active':'recovery';state.fighters[0].phase=phase;
 if(kind==='throw')state.fighters[1].action={kind:'throw',attack:null,frame:6,connected:false};
 else state.fighters[1].action={kind:'attack',attack:kind,normalMove:'5L',frame:p.getPitWorkbookMoveV105('feral-hunter','5L').startup-1,connected:false};
 state.fighters[1].phase='startup';
 return p.stepPitCombat(state,[{},{}]);
}
test('Scar S4 catches frontal contact only within its exact fourteen active ticks',()=>{
 for(const counterFrame of [5,18]){
  const state=strikeAgainstCounter({counterFrame});const hit=state.events.find(e=>e.type==='hit');assert.ok(hit);assert.equal(hit.attackerId,'scar');assert.equal(hit.damage,Math.round(85*p.PIT_FIGHTERS.scar.power));assert.equal(state.fighters[0].health,p.PIT_FIGHTERS.scar.maxHealth);assert.equal(state.fighters[0].action.connected,true);
 }
 for(const options of [{counterFrame:4},{counterFrame:19},{behind:true}]){const state=strikeAgainstCounter(options);assert.ok(state.events.some(e=>e.type==='hit'&&e.defenderId==='scar'),JSON.stringify(options));}
 let once=strikeAgainstCounter();
 once.fighters[1].action={kind:'attack',attack:'light',normalMove:'5L',frame:p.getPitWorkbookMoveV105('feral-hunter','5L').startup-1,connected:false};once.fighters[1].phase='startup';once.fighters[1].stunFrames=0;
 once=p.stepPitCombat(once,[{},{}]);assert.ok(once.events.some(e=>e.type==='hit'&&e.defenderId==='scar'),'one parry only; connected guard cannot catch again');
 const thrown=strikeAgainstCounter({kind:'throw'});assert.ok(thrown.pendingThrow||thrown.events.some(e=>e.type==='hit'&&e.attack==='throw'));assert.equal(thrown.events.some(e=>e.type==='hit'&&e.attackerId==='scar'),false);
 let idle=begin('scar','S4');for(let n=0;n<30;n++)idle=p.stepPitCombat(idle,[{},{}]);assert.equal(idle.events.some(e=>e.type==='hit'),false);
});
test('Scar S4 leaves an incoming world projectile hostile and does not reflect it',()=>{
 let state=p.createPitCombatState('scar','jungle-hunter',{mode:'training',normalMoves:recipe});
 Object.assign(state.fighters[0],{x:400,traque:1000});state.fighters[1].x=800;
 state=p.stepPitCombat(state,[{workbookAction:'counter'},{}]);state.fighters[0].action.frame=4;state.fighters[0].phase='startup';
 const technique=p.PIT_FIGHTERS['jungle-hunter'].technique;
 state.techniqueEffects=[{id:1,ownerSlot:1,techniqueId:technique.id,x:400-technique.width/2+technique.speed,y:40,direction:-1,age:0,phase:'active',hitCount:0,rehitFrames:0}];state.nextTechniqueEffectId=2;
 state=p.stepPitCombat(state,[{},{}]);
 assert.ok(state.events.some(e=>e.type==='hit'&&e.defenderId==='scar'&&e.attackerId==='jungle-hunter'));
 assert.equal(state.events.some(e=>e.type==='hit'&&e.attackerId==='scar'),false);
 assert.equal(state.techniqueEffects.some(e=>e.ownerSlot===0),false);
});
test('V13 command replay and V2 training sequence survive recording, serialization and playback; older codecs reject reserved codes',()=>{
 const frames=[[{workbookAction:'equipment'},{}],...Array.from({length:45},()=>[{},{}]),[{attack:'medium',right:true},{}],...Array.from({length:52},()=>[{},{}]),[{workbookAction:'contact'},{}],...Array.from({length:50},()=>[{},{}])];
 const replay=p.recordPitReplay(frames,{fighters:['scar','feral-hunter'],rules:{mode:'training',normalMoves:recipe}});
 assert.equal(replay.engineVersion,13);const decoded=p.normalizePitReplay(JSON.parse(p.serializePitReplay(replay)));assert.ok(decoded);
 let expected=p.createPitCombatState('scar','feral-hunter',{mode:'training',normalMoves:recipe});for(const frame of frames)expected=p.stepPitCombat(expected,frame);
 assert.equal(p.serializePitCombat(p.playPitReplay(decoded)),p.serializePitCombat(expected));
 for(const action of ['equipment','contact','counter']){const mask=p.encodePitReplayInput({workbookAction:action},13);assert.deepEqual(p.decodePitReplayInput(mask,13),{workbookAction:action});assert.throws(()=>p.decodePitReplayInput(mask));assert.throws(()=>p.encodePitReplayInput({workbookAction:action},12));}
 assert.throws(()=>p.encodePitReplayInput({workbookAction:'contact',attack:'heavy'},13));
 const sequence=p.recordPitTrainingSequence([{workbookAction:'equipment'},{},{workbookAction:'counter'}]);assert.equal(sequence.version,2);assert.equal(sequence.encoding,'dummy-input-rle-v2');assert.ok(p.normalizePitTrainingSequence(sequence));const reader=p.createPitTrainingSequenceReader(sequence);assert.deepEqual(reader.next().value.input,{workbookAction:'equipment'});reader.next();assert.deepEqual(reader.next().value.input,{workbookAction:'counter'});
 assert.equal(p.normalizePitTrainingSequence({...sequence,version:1}),null);
 const future=clone(replay);future.engineVersion=14;assert.equal(p.normalizePitReplay(future),null);
});
test('snapshots refuse forged recipe/action ownership, future versions and composite throw studies',()=>{
 const valid=begin('scar','S4');
 for(const mutate of [s=>s.version=12,s=>s.version=14,s=>s.rules.normalMoves='workbook-v104',s=>delete s.fighters[0].normalMovesRecipe,s=>s.fighters[0].action.workbookMove='S3',s=>s.fighters[0].action.workbookMove='TH_F',s=>s.fighters[0].action.normalMove='5M',s=>s.fighters[0].action.feralLauncherOrigin='native']){const value=clone(valid);mutate(value);assert.throws(()=>p.deserializePitCombat(JSON.stringify(value)));}
 const equipment=begin('scar','EQUIP');equipment.fighters[0].action.connected=true;assert.throws(()=>p.deserializePitCombat(JSON.stringify(equipment)));
 const costume=p.getPitFighterVariants('scar')[0];const mixed=p.createPitCombatState('scar','feral-hunter',{normalMoves:recipe,variants:[costume.id,null]});assert.equal(mixed.fighters[0].normalMovesRecipe,undefined);assert.equal(mixed.fighters[0].inputLatch.workbookAction,undefined);assert.deepEqual(p.deserializePitCombat(p.serializePitCombat(mixed)),mixed);
 for(const version of [undefined,'workbook-v104']){let state=p.createPitCombatState('scar','feral-hunter',{...(version?{normalMoves:version}:{})});state=p.stepPitCombat(state,[{workbookAction:'equipment'},{}]);assert.equal(state.fighters[0].action,null);assert.equal(state.fighters[0].inputLatch.workbookAction,undefined);}
});
