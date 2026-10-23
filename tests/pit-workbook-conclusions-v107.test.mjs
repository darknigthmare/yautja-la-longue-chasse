import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
const directory=await fs.mkdtemp(path.join(os.tmpdir(),'pit-v107-conclusions-'));after(()=>fs.rm(directory,{recursive:true,force:true}));
await build({stdin:{contents:["export * from './app/game/systems/pitWorkbookConclusionsV107';","export * from './app/game/systems/pitWorkbookConclusionSourceV107';","export * from './app/game/systems/pitCombat';","export * from './app/game/systems/pitFinishersV80';"].join('\n'),resolveDir:process.cwd()},bundle:true,outfile:path.join(directory,'model.mjs'),platform:'node',format:'esm',logLevel:'silent'});
const p=await import(pathToFileURL(path.join(directory,'model.mjs')));
const copy=x=>JSON.parse(JSON.stringify(x));
const options={mode:'stylized',reducedGore:false,reducedMotion:false,narrative:false,replay:false,cpuWinner:false};
function objective(combat,scarSlot=0,patch={}){return p.createPitWorkbookConclusionSessionV107(combat,{sessionId:'real-prematch-objective-'+scarSlot,targetSlot:1-scarSlot,sourceWeaponAvailable:true,targetWeapon:{id:'physical-adverse-device',sourceId:'explicit-native-source-S10',poseId:'declared-victim-pose',offensiveMechanicId:null,disarmedPoseAdmitted:false,attachment:{offsetX:16,offsetY:90,width:20,height:13}},missionObject:{id:'existing-session-beacon',sourceId:'public-objective-choice-before-match',appearance:'scar-red-beacon-v100',x:600,y:0},...patch});}
const terminals=new Map();
function won(scarSlot=0){if(terminals.has(scarSlot))return copy(terminals.get(scarSlot));const identities=scarSlot===0?['scar','feral-hunter']:['feral-hunter','scar'];let combat=p.createPitCombatState(...identities,{normalMoves:'workbook-v106'});const session=objective(combat,scarSlot);let attacks=0;
 for(let tick=0;tick<12000&&combat.phase!=='match-over';tick++){const hero=combat.fighters[scarSlot],enemy=combat.fighters[1-scarSlot],inputs=[{},{}];if(combat.phase==='round'&&hero.phase==='idle'){const distance=enemy.x-hero.x;if(Math.abs(distance)>80)inputs[scarSlot]={right:distance>0,left:distance<0};else{inputs[scarSlot]={attack:'heavy'};attacks++;}}combat=p.stepPitCombat(combat,inputs);}
 assert.equal(combat.phase,'match-over');assert.equal(combat.matchWinnerId,'scar');assert.ok(attacks>10);const result={combat,session};terminals.set(scarSlot,copy(result));return result;}
function window(scarSlot=0,patch={}){const{combat,session}=won(scarSlot),context={enabled:true,relation:'hostile-adult',reducedGore:false,reducedMotion:false,narrative:false,replay:false,session,...patch};let v80=p.observePitFinisherV80(p.createPitFinisherViewV80(),combat,'actual-earned-final-'+scarSlot,options);v80=p.advancePitFinisherV80(v80,16,true);assert.equal(v80.phase,'window');const state=p.observePitWorkbookConclusionV107(p.createPitWorkbookConclusionV107(),combat,v80,context);return{state,combat,context,v80};}
function run(state,callback=()=>{}){for(let n=0;n<1200&&state.phase!=='complete';n++){callback(state);state=p.advancePitWorkbookConclusionV107(state,1000/60);}callback(state);assert.equal(state.phase,'complete');return state;}
const roundtrip=state=>assert.deepEqual(p.deserializePitWorkbookConclusionV107(p.serializePitWorkbookConclusionV107(state)),state);

test('the two conclusions keep six existing drawings per independent face, exact300ticks and unchanged source PNGs',async()=>{
 const plan=JSON.parse(await fs.readFile('app/game/data/pitWorkbookAnimationPlanV100.json','utf8'));
 for(const source of p.PIT_WORKBOOK_CONCLUSION_SOURCES_V107){assert.equal(source.durationTicks,300);assert.equal(source.actionId,'CIN_F003_'+source.key);assert.equal(plan.fighters.find(f=>f.fighterId==='scar').actions.find(a=>a.key===source.key).cell,source.sourceCell.split('!')[1]);for(const facing of ['right','left']){const frames=source.frames.filter(f=>f.facing===facing);assert.deepEqual(frames.map(f=>f.durationTicks),[30,30,60,60,60,60]);for(const frame of frames)assert.ok(frame.rect.every(Number.isFinite)&&frame.pivot.every(Number.isFinite)&&frame.bodyHeightPx>0);}for(const[file,sha]of Object.entries(source.sourceHashes))assert.equal(createHash('sha256').update(await fs.readFile('public'+file)).digest('hex'),sha);}
 assert.deepEqual([0,29,30,59,60,119,120,179,180,239,240,299,300].map(p.getPitWorkbookConclusionFrameIndexV107),[0,0,1,1,2,2,3,3,4,4,5,5,-1]);
});
test('the recoverable beacon and physical target are introduced before the duel, not spawned at its conclusion',()=>{
 const combat=p.createPitCombatState('scar','feral-hunter',{normalMoves:'workbook-v106'}),session=objective(combat);assert.equal(session.createdAtFrame,0);assert.equal(session.missionObject.state,'ground');assert.equal(session.missionObject.ownerSlot,null);assert.equal(session.targetWeapon.state,'held');assert.equal(session.fighterIds[1],'feral-hunter');assert.deepEqual(p.deserializePitWorkbookConclusionSessionV107(p.serializePitWorkbookConclusionSessionV107(session)),session);
 assert.throws(()=>objective(p.stepPitCombat(combat)));assert.throws(()=>objective(combat,0,{missionObject:{id:'physical-adverse-device',sourceId:'same',appearance:'scar-red-beacon-v100',x:600,y:0}}));
 const moved=p.stepPitCombat(combat,[{},{left:true}]),updated=p.advancePitWorkbookConclusionSessionV107(session,moved);assert.notEqual(updated.targetWeapon.x,session.targetWeapon.x);assert.deepEqual(updated.missionObject,session.missionObject);
});
test('a real earned final Scar victory triggers physical native staff contact against the actual independent opponent in both facings',()=>{
 for(const slot of [0,1]){const{state,combat}=window(slot),snapshot=p.serializePitCombat(combat);assert.equal(state.available.FATALITE_2,true);let firstSequence;const ended=run(p.triggerPitWorkbookConclusionV107(state,'FATALITE_2'),s=>{roundtrip(s);if(s.phase==='sequence'){firstSequence??=copy(s);const scene=p.samplePitWorkbookConclusionV107(s);assert.equal(scene.actors[slot].definitionId,'scar');assert.equal(scene.actors[1-slot].definitionId,'feral-hunter');assert.equal(scene.actors[1-slot].health,combat.fighters[1-slot].health);assert.ok(scene.actors.every((actor,index)=>actor.health===combat.fighters[index].health));}});
  assert.ok(firstSequence);assert.equal(ended.clipTick,300);assert.equal(ended.outcome,'finished');assert.equal(ended.contacts.filter(c=>c.type==='guard-contact').length,1);assert.equal(ended.contacts.filter(c=>c.type==='thrust-contact').length,1);assert.ok(p.getPitWorkbookConclusionQualificationV107(ended).sourceActionComplete);assert.equal(p.serializePitCombat(combat),snapshot,'the earned combat result, wounds and archive remain unchanged');assert.equal(p.samplePitWorkbookConclusionV107(ended).clipTick,299);assert.equal(p.pitWorkbookConclusionBlocksResultV107(ended),false);
 }
});
test('the real fatal thrust drops the unique inert alternative-duel prop, which falls to the floor without disarm, recovery or gain in both facings',()=>{
 for(const slot of [0,1]){
  const{state:windowState,combat}=window(slot),originalCombat=p.serializePitCombat(combat),originalObject=copy(windowState.session.missionObject);
  let state=p.triggerPitWorkbookConclusionV107(windowState,'FATALITE_2');
  while(state.phase!=='sequence'||state.clipTick<60)state=p.advancePitWorkbookConclusionV107(state,1000/60);
  assert.equal(state.session.targetWeapon.state,'held');assert.equal(state.contacts.some(event=>event.type==='thrust-contact'),false);
  state=p.advancePitWorkbookConclusionV107(state,1000/60);assert.equal(state.clipTick,61);assert.equal(state.session.targetWeapon.state,'flying');assert.ok(state.session.targetWeapon.y>0);roundtrip(state);
  const airborne=copy(state),pauseSnapshot=p.serializePitWorkbookConclusionV107(state);
  assert.equal(p.advancePitWorkbookConclusionV107(state,1000,{frozen:true}),state);assert.equal(p.serializePitWorkbookConclusionV107(state),pauseSnapshot);
  let restored=p.deserializePitWorkbookConclusionV107(pauseSnapshot),falling=false,previousY=state.session.targetWeapon.y,landed=false;
  while(state.phase!=='complete'){
   state=p.advancePitWorkbookConclusionV107(state,1000/60);restored=p.advancePitWorkbookConclusionV107(restored,1000/60);assert.deepEqual(restored,state);roundtrip(state);
   const weapon=state.session.targetWeapon,scene=p.samplePitWorkbookConclusionV107(state);
   if(weapon.y<previousY)falling=true;previousY=weapon.y;if(weapon.state==='ground'){landed=true;assert.equal(weapon.y,0);assert.equal(weapon.velocityX,0);assert.equal(weapon.velocityY,0);}
   assert.equal(weapon.id,airborne.session.targetWeapon.id);assert.equal(scene.props.targetWeapon.id,weapon.id);assert.equal(scene.props.targetWeapon.y,weapon.y);
   assert.deepEqual(state.session.missionObject,originalObject);assert.equal(state.session.receiptId,null);assert.deepEqual(state.contacts.map(event=>event.type),['guard-contact','thrust-contact']);
   assert.equal(state.combatSnapshot,originalCombat);for(const[index,actor]of state.actors.entries()){assert.equal(actor.health,combat.fighters[index].health);assert.equal(actor.traque,combat.fighters[index].traque);assert.equal(actor.roundsWon,combat.fighters[index].roundsWon);}
  }
  assert.ok(falling&&landed);assert.equal(state.outcome,'finished');assert.deepEqual(p.getPitWorkbookConclusionQualificationV107(state),{sourceActionComplete:true,missing:[]});
  assert.equal(p.samplePitWorkbookConclusionV107(state).props.targetWeapon.state,'ground');assert.equal(p.advancePitWorkbookConclusionV107(state,1000),state);assert.equal(p.serializePitCombat(combat),originalCombat);
  assert.deepEqual(p.deserializePitWorkbookConclusionSessionV107(p.serializePitWorkbookConclusionSessionV107(airborne.session)),airborne.session);
 }
});
test('fatal-prop snapshots require the true thrust cause and its exact resumed trajectory, without a fabricated disarm event',()=>{
 for(const slot of [0,1]){
  let state=p.triggerPitWorkbookConclusionV107(window(slot).state,'FATALITE_2');while(state.phase!=='sequence'||state.clipTick<61)state=p.advancePitWorkbookConclusionV107(state,1000/60);roundtrip(state);
  for(const mutate of [s=>s.contacts=s.contacts.filter(event=>event.type!=='thrust-contact'),s=>s.session.targetWeapon.state='held',s=>s.session.targetWeapon.x++,s=>s.session.targetWeapon.y++,s=>s.session.targetWeapon.velocityX=0,s=>s.session.targetWeapon.velocityY=0,s=>{Object.assign(s.session.targetWeapon,{state:'ground',y:0,velocityX:0,velocityY:0});},s=>{const contact=copy(s.contacts[1]);contact.type='device-detached';contact.objectId=s.session.targetWeapon.id;s.contacts.push(contact);}]){
   const forged=copy(state);mutate(forged);assert.throws(()=>p.deserializePitWorkbookConclusionV107(JSON.stringify(forged)));
  }
 }
});
test('final victory, exact source BODY and hostile adult equipment context are required; safer contexts never start the lethal branch',()=>{
 for(const patch of [{relation:'ally'},{relation:'training'},{relation:'unknown'},{relation:'unarmed-civil'},{reducedGore:true},{narrative:true},{replay:true},{session:null}]){const{state}=window(0,patch);assert.equal(state.available.FATALITE_2,false);assert.equal(p.triggerPitWorkbookConclusionV107(state,'FATALITE_2'),state);}
 const{combat,session}=won();let fake=copy(combat);fake.phase='round-over';const v80={...p.createPitFinisherViewV80(),phase:'window',winnerSlot:0,key:'not-final'};const ctx={enabled:true,relation:'hostile-adult',reducedGore:false,reducedMotion:false,narrative:false,replay:false,session};assert.equal(p.observePitWorkbookConclusionV107(p.createPitWorkbookConclusionV107(),fake,v80,ctx).phase,'idle');
 fake=copy(combat);fake.fighters[0].variantId='scar-unregistered-costume';assert.equal(p.observePitWorkbookConclusionV107(p.createPitWorkbookConclusionV107(),fake,v80,ctx).available.FATALITE_2,false);
});
test('mercy requires the pre-existing physical objective and its target owner; missing props do not become a new mission reward',()=>{
 for(const patch of [{session:null},{session:{...won().session,createdAtFrame:25}},{session:{...won().session,targetWeapon:{...won().session.targetWeapon,ownerSlot:0}}}]){const{state}=window(0,patch);assert.equal(state.available.CLEMENCE,false);assert.equal(p.triggerPitWorkbookConclusionV107(state,'CLEMENCE'),state);}
});
test('a detached inert device and a recovered real beacon deliver a partial source result, not an armed disarm',()=>{
 for(const slot of [0,1]){const{state,combat}=window(slot,{reducedGore:true});const before=p.serializePitCombat(combat);let groundSeen=false,recoveredSeen=false;const ended=run(p.triggerPitWorkbookConclusionV107(state,'CLEMENCE'),s=>{roundtrip(s);if(s.phase==='sequence'){assert.equal(s.session.missionObject.id,'existing-session-beacon');if(s.clipTick<240)assert.equal(s.session.missionObject.state,'ground');if(s.session.targetWeapon.state==='ground')groundSeen=true;if(s.session.missionObject.state==='recovered')recoveredSeen=true;}});
  assert.ok(groundSeen&&recoveredSeen);assert.equal(ended.contacts.filter(c=>c.type==='device-detached').length,1);assert.equal(ended.contacts.filter(c=>c.type==='disarm').length,0);assert.equal(ended.contacts.filter(c=>c.type==='object-recovered').length,1);assert.equal(ended.session.missionObject.ownerSlot,slot);assert.equal(ended.outcome,'partial-source');assert.deepEqual(p.getPitWorkbookConclusionQualificationV107(ended),{sourceActionComplete:false,missing:['OFFENSIVE_WEAPON_DISARM_NOT_DELIVERED']});assert.equal(ended.session.receiptId,ended.session.id+':recover:'+ended.session.missionObject.id);assert.equal(p.serializePitCombat(combat),before);assert.deepEqual(p.advancePitWorkbookConclusionV107(ended,1000),ended,'completion cannot duplicate the transfer');
 }
});
test('no retrieval occurs when the physically attached target is outside the native disarm volume',()=>{
 const{session}=won();session.targetWeapon.attachment.offsetY=250;const{state}=window(0,{session,reducedGore:true});const ended=run(p.triggerPitWorkbookConclusionV107(state,'CLEMENCE'));assert.equal(ended.outcome,'contact-missed');assert.equal(ended.contacts.length,0);assert.equal(ended.session.missionObject.state,'ground');assert.equal(ended.session.receiptId,null);
});
test('caller-supplied mechanism and pose flags cannot fabricate the still-missing offensive weapon and disarmed BODY admissions',()=>{
 for(const[mechanic,pose,expected]of [[p.PIT_FIGHTERS['feral-hunter'].technique.id,true,'partial-source'],[p.PIT_FIGHTERS['feral-hunter'].technique.id,false,'partial-source'],['wrong-mechanic',true,'partial-source']]){const{session}=won();Object.assign(session.targetWeapon,{offensiveMechanicId:mechanic,disarmedPoseAdmitted:pose});const{state}=window(0,{session,reducedGore:true});const ended=run(p.triggerPitWorkbookConclusionV107(state,'CLEMENCE'));assert.equal(ended.outcome,expected);assert.equal(p.getPitWorkbookConclusionQualificationV107(ended).sourceActionComplete,expected==='finished');}
});
test('pause, bounded clock, live safer preference and skip cannot restart the scene or heal the defeated opponent',()=>{
 let state=p.triggerPitWorkbookConclusionV107(window().state,'FATALITE_2');const frozen=p.serializePitWorkbookConclusionV107(state);for(const ms of [0,-1,NaN,Infinity])assert.equal(p.advancePitWorkbookConclusionV107(state,ms),state);assert.equal(p.advancePitWorkbookConclusionV107(state,60000,{frozen:true}),state);assert.equal(p.serializePitWorkbookConclusionV107(state),frozen);
 const bounded=p.advancePitWorkbookConclusionV107(state,60000);assert.ok(bounded.approachTick<=6);state=p.advancePitWorkbookConclusionV107(bounded,16,{reducedGore:true});assert.equal(state.outcome,'skipped');assert.equal(state.phase,'complete');assert.equal(p.skipPitWorkbookConclusionV107(state),state);
});
test('a mid-contact save resumes the same physical prop flight, recovery receipt and source qualification',()=>{
 let state=p.triggerPitWorkbookConclusionV107(window(1,{reducedGore:true}).state,'CLEMENCE');while(state.phase!=='sequence'||state.clipTick<45)state=p.advancePitWorkbookConclusionV107(state,1000/60);let restored=p.deserializePitWorkbookConclusionV107(p.serializePitWorkbookConclusionV107(state));assert.equal(state.session.targetWeapon.state,'ground');while(state.phase!=='complete'){state=p.advancePitWorkbookConclusionV107(state,1000/60);restored=p.advancePitWorkbookConclusionV107(restored,1000/60);assert.deepEqual(restored,state);}assert.equal(restored.session.receiptId,state.session.receiptId);
});


test('new sidecar snapshots reject forged wounds, contact rectangles, duplicate receipts, ownership and fake disarm admissions',()=>{
 const ended=run(p.triggerPitWorkbookConclusionV107(window(0,{reducedGore:true}).state,'CLEMENCE'));roundtrip(ended);
 for(const mutate of [s=>s.version=14,s=>s.actors[0].health++,s=>s.initialActors[1].health=1,s=>s.contacts.push(copy(s.contacts[0])),s=>s.contacts[0].box.width++,s=>s.contacts[0].type='disarm',s=>s.session.receiptId='second-reward',s=>s.session.targetWeapon.ownerSlot=0,s=>s.session.targetWeapon.sourceId='unreviewed-replacement',s=>s.clipTick=301,s=>s.session.createdAtFrame=100,s=>s.remainderMs=99]){
  const forged=copy(ended);mutate(forged);assert.throws(()=>p.deserializePitWorkbookConclusionV107(JSON.stringify(forged)));
 }
 assert.deepEqual(p.deserializePitWorkbookConclusionV107(p.serializePitWorkbookConclusionV107(p.createPitWorkbookConclusionV107())),p.createPitWorkbookConclusionV107());
});
test('a missing physical pickup never paints the final token, while a completed objective retains its native final hand at the result',()=>{
 let state=p.triggerPitWorkbookConclusionV107(window(0,{reducedGore:true}).state,'CLEMENCE');while(state.phase!=='sequence'||state.clipTick<240)state=p.advancePitWorkbookConclusionV107(state,1000/60);
 assert.equal(state.session.missionObject.state,'ground');assert.equal(p.samplePitWorkbookConclusionV107(state).clipTick,239,'one renderer tick cannot create the token before the actual pickup');state=p.advancePitWorkbookConclusionV107(state,1000/60);assert.equal(state.session.missionObject.state,'recovered');assert.equal(p.samplePitWorkbookConclusionV107(state).clipTick,241);
 state=run(state);const final=p.samplePitWorkbookConclusionV107(state);assert.equal(final.clipTick,299);assert.equal(final.props.missionObject.ownerSlot,state.winnerSlot);assert.equal(p.pitWorkbookConclusionBlocksResultV107(state),false);
});
