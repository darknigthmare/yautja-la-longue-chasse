/** Adult training hand-over: real fixed-step delivery, campaign writer, no free repair. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {homeworldSceneSsrV78} from './helpers/homeworld-scene-ssr-v78.mjs';
import {mobilityQaGuidance} from '../scripts/mobility-qa-driver.mjs';
const qa=homeworldSceneSsrV78(), m=qa.load('app/game/systems/mobility/ledger.ts');
const c=qa.load('app/game/systems/mobility/course.ts'),d=qa.load('app/game/systems/mobility/catalogue.ts');
const saves=qa.load('app/game/save.ts'), archives=qa.load('app/game/systems/completeArchive.ts');
const {MobilityDriveController}=qa.load('app/game/systems/mobility/controller.ts');
const OWNER='2026-11-08T17:00:00.000Z',MAIN=saves.SAVE_STORAGE_KEY;
const IDLE={throttle:0,steer:0,brake:false,boost:false,interact:false};
function seed(){const s=saves.defaultSave(OWNER);s.profile.honor=300;s.profile.rankId='blooded';s.profile.clanMarks=10000;return s;}
function act(s,command,expected=true){const before=JSON.stringify(s);const r=m.actMobility(s,{ownerCreatedAt:s.createdAt,expectedRevision:s.mobilityV1?.revision??0,...command});assert.equal(r.accepted,expected,r.message);assert.equal(JSON.stringify(s),before);return r.accepted?{...s,mobilityV1:r.state,profile:{...s.profile,clanMarks:r.clanMarks}}:s;}
function train(s=seed()){
 s=act(s,{type:'start',modelId:'scout_grav_sled',loaned:true});let course=s.mobilityV1.active.course,stage=0,batch=[];
 for(let n=0;n<15000;n++){
  const g=mobilityQaGuidance(course,stage);
  const input={throttle:g.throttle,steer:g.steer,brake:g.brake,boost:g.boost,interact:g.interact};
  if(g.advance){if(stage===1){if(course.cargoKg===25)stage++;}else if(stage!==5)stage++;}
  course=c.stepMobilityCourse(course,input,'scout_grav_sled',d.emptyMobilityLevels());batch.push(input);
  const passed=c.mobilityCoursePassed(course);
  if(batch.length===30||passed){s=act(s,{type:'drive',runId:s.mobilityV1.active.id,inputs:batch});batch=[];assert.deepEqual(course,s.mobilityV1.active.course);}
  if(passed)return act(s,{type:'return',runId:s.mobilityV1.active.id});
 }
 throw Error('Actual training route did not finish');
}
const earned=train();
const claim=(s=structuredClone(earned))=>act(s,{type:'claim-training',rewardRunId:s.mobilityV1.trainingReward.runId});
function db(){const values=new Map();return {values,fail:false,uncertain:false,readback:false,get length(){return values.size;},key(i){return [...values.keys()][i]??null;},getItem(k){if(k===MAIN&&this.readback){this.readback=false;throw Error('readback');}return values.get(k)??null;},setItem(k,v){if(k===MAIN&&this.fail)throw new DOMException('quota','QuotaExceededError');values.set(k,v);if(k===MAIN&&this.uncertain){this.uncertain=false;this.readback=true;}},removeItem(k){values.delete(k);}};}
function written(s,storage){const r=saves.writeSaveWithStatus(s,storage);assert(r.persisted,r.failure);return r.save;}

test('actual training awards permit and unclaimed receipt, no property or rank',()=>{
 assert(earned.mobilityV1.circulationPermit);assert.equal(earned.mobilityV1.owned.length,0);
 const r=earned.mobilityV1.trainingReward;assert.equal(r.status,'available');assert(c.mobilityCoursePassed(r.course));
 assert(r.course.condition<100&&r.course.energy<100);assert.equal(earned.profile.clanMarks,10000);assert.equal(earned.profile.rankId,'blooded');assert.equal(earned.profile.honor,300);
});
test('explicit hand-over transfers the exact inspected hull, no currency or orbital side effect',()=>{
 const s=claim(),v=s.mobilityV1.owned[0],r=earned.mobilityV1.trainingReward;
 assert.equal(v.id,'scout_grav_sled');assert.equal(v.acquiredBy,'quest');assert.equal(v.condition,r.course.condition);assert.equal(v.energy,r.course.energy);assert.equal(v.distance,r.course.distance);assert.deepEqual(v.upgrades,d.emptyMobilityLevels());
 assert.deepEqual(s.profile,earned.profile);const {mobilityV1:a,...rest}=s,{mobilityV1:b,...before}=earned;assert.deepEqual(rest,before);assert.equal(s.mobilityV1.trainingReward.status,'claimed');
});
test('confirmation is unique even with a fresh ledger revision',()=>{const s=claim();act(s,{type:'claim-training',rewardRunId:1},false);assert.equal(s.mobilityV1.owned.length,1);});
test('permitted but unearned campaign cannot claim; old report never fabricates a receipt',()=>{
 const raw=structuredClone(earned.mobilityV1);delete raw.trainingReward;const result=m.inspectMobilityLedger(raw,OWNER);assert.equal(result.status,'valid');assert.equal(result.state.trainingReward,null);
 const old={...earned,mobilityV1:raw};act(old,{type:'claim-training',rewardRunId:1},false);assert.equal(Object.hasOwn(raw,'trainingReward'),false);
});
for(const [name,mutate,command] of [
 ['wrong run',()=>{}, {rewardRunId:99}],['string run',()=>{}, {rewardRunId:'1'}],
 ['stale revision',()=>{}, {expectedRevision:0}],['foreign owner',()=>{}, {ownerCreatedAt:'2025-01-01T00:00:00.000Z'}],
 ['young rank',s=>s.profile.rankId='young-blood',{}],['recovery debt',s=>s.mobilityV1.recoveryDebt=20,{}],
 ['active sortie',s=>Object.assign(s,act(s,{type:'start',modelId:'scout_grav_sled',loaned:true})),{}],
])test('hand-over refuses '+name,()=>{const s=structuredClone(earned);mutate(s);act(s,{type:'claim-training',rewardRunId:1,...command},false);});
test('no marques required for earned hand-over, and no negative or imaginary debit',()=>{const s=structuredClone(earned);s.profile.clanMarks=0;const after=claim(s);assert.equal(after.profile.clanMarks,0);assert.equal(after.mobilityV1.spentMarks,0);});
test('recovery and immediate parking do not earn receipt',()=>{for(const type of ['recover','return']){let s=act(seed(),{type:'start',modelId:'scout_grav_sled',loaned:true});s=act(s,{type,runId:1});assert.equal(s.mobilityV1.trainingReward,null);}});
test('repeating training preserves first hand-over record, including after it is claimed',()=>{
 const before=structuredClone(earned.mobilityV1.trainingReward);const again=train(earned);assert.deepEqual(again.mobilityV1.trainingReward,before);
 const claimed=claim(),twice=train(claimed);assert.deepEqual(twice.mobilityV1.trainingReward,claimed.mobilityV1.trainingReward);assert.deepEqual(twice.mobilityV1.owned,claimed.mobilityV1.owned);
});
for(const [name,mutate]of [
 ['invalid outcome',r=>r.course.cargoDelivered=false],['cargo still aboard',r=>r.course.cargoKg=25],
 ['unfinished checkpoints',r=>r.course.checkpoint=2],['not at depot',r=>r.course.x=820],
 ['moving hull',r=>r.course.speed=100],['too short',r=>r.course.tick=100],
 ['destroyed hull',r=>r.course.condition=0],['invalid reserve',r=>r.course.energy=Infinity],
 ['future run',r=>r.runId=999],['wrong status',r=>r.status='released'],['unknown receipt key',r=>r.bad=true],
])test('receipt validation rejects '+name,()=>{const s=structuredClone(earned);mutate(s.mobilityV1.trainingReward);assert.equal(m.inspectMobilityLedger(s.mobilityV1,OWNER).status,'invalid-save');});
test('future nested receipt is protected rather than dropped',()=>{const s=structuredClone(earned);s.mobilityV1.trainingReward.version=2;assert.equal(m.inspectMobilityLedger(s.mobilityV1,OWNER).status,'future-version');});
test('claim and physical ownership must agree in both directions',()=>{
 const missing=claim();missing.mobilityV1.owned=[];assert.equal(m.inspectMobilityLedger(missing.mobilityV1,OWNER).status,'invalid-save');
 const premature=claim();premature.mobilityV1.trainingReward.status='available';assert.equal(m.inspectMobilityLedger(premature.mobilityV1,OWNER).status,'invalid-save');
 const purchase=claim();purchase.mobilityV1.owned[0].acquiredBy='purchase';assert.equal(m.inspectMobilityLedger(purchase.mobilityV1,OWNER).status,'invalid-save');
});
test('personal sled actually drives, wears, recharges and upgrades separately from loan',()=>{
 let s=claim();s=act(s,{type:'upgrade',modelId:'scout_grav_sled',module:'drive',expectedCost:80});
 s=act(s,{type:'start',modelId:'scout_grav_sled',loaned:false});s=act(s,{type:'drive',runId:s.mobilityV1.active.id,inputs:Array(30).fill({...IDLE,throttle:1})});
 assert(s.mobilityV1.owned[0].energy<earned.mobilityV1.trainingReward.course.energy);
 s=act(s,{type:'recover',runId:s.mobilityV1.active.id});s=act(s,{type:'settle-recovery',expectedCost:s.mobilityV1.recoveryDebt});
 const cost=m.mobilityServiceQuote(s.mobilityV1,'scout_grav_sled','recharge'),condition=s.mobilityV1.owned[0].condition;
 s=act(s,{type:'recharge',modelId:'scout_grav_sled',expectedCost:cost});assert.equal(s.mobilityV1.owned[0].energy,100);assert.equal(s.mobilityV1.owned[0].condition,condition);
});
test('loan never borrows personal upgrade stats and controller stays in sync',()=>{
 let s=claim();s=act(s,{type:'upgrade',modelId:'scout_grav_sled',module:'drive',expectedCost:80});const personal=structuredClone(s.mobilityV1.owned);
 s=act(s,{type:'start',modelId:'scout_grav_sled',loaned:true});const controller=new MobilityDriveController(s.mobilityV1);let baseline=c.createMobilityCourse();
 for(let i=0;i<30;i++){const input={...IDLE,throttle:1};assert(controller.step(input));baseline=c.stepMobilityCourse(baseline,input,'scout_grav_sled',d.emptyMobilityLevels());}
 assert.deepEqual(controller.predicted,baseline);
 assert(controller.flush(command=>{const r=m.actMobility(s,command);assert(r.accepted);s={...s,mobilityV1:r.state};return r;}));
 assert.deepEqual(s.mobilityV1.owned,personal);assert.deepEqual(s.mobilityV1.active.course,baseline);
});
test('both machines coexist; maintenance and upgrades affect only selected hull',()=>{
 let s=act(claim(),{type:'buy',modelId:'clan_hoverbike',expectedCost:420});const sled=structuredClone(s.mobilityV1.owned[0]);
 s=act(s,{type:'upgrade',modelId:'clan_hoverbike',module:'armor',expectedCost:70});assert.equal(s.mobilityV1.owned.length,2);assert.deepEqual(s.mobilityV1.owned[0],sled);
});
test('acquired hull and unclaimed receipt survive real writer, reload and complete archive',()=>{
 for(const s of [earned,claim()]){const storage=db(),writtenSave=written(s,storage);assert.deepEqual(saves.loadSaveWithStatus(storage).save.mobilityV1,writtenSave.mobilityV1);
 const portable=saves.parseSaveImport(saves.exportSave(writtenSave));assert.deepEqual(portable.save.mobilityV1,writtenSave.mobilityV1);
 const packed=archives.createCompleteArchive(writtenSave,storage,OWNER),parsed=archives.parseCompleteArchive(packed.serialized);assert.deepEqual(parsed.archive.campaign.mobilityV1,writtenSave.mobilityV1);}
});
test('storage failure grants nothing; reconciled readback never duplicates the reward',()=>{
 const storage=db();let s=written(earned,storage),before=storage.getItem(MAIN);storage.fail=true;
 const failed=saves.writeSaveWithStatus(claim(s),storage);assert(!failed.persisted);assert.equal(storage.getItem(MAIN),before);
 storage.fail=false;storage.uncertain=true;const uncertain=saves.writeSaveWithStatus(claim(s),storage);assert(!uncertain.persisted);
 const confirmed=saves.reconcileSaveWrite(uncertain,OWNER,storage);assert.equal(confirmed.status,'confirmed');assert.equal(confirmed.save.mobilityV1.owned.length,1);
 act(confirmed.save,{type:'claim-training',rewardRunId:1},false);
});
test('garage exposes earned hand-over and marks completed transfer without auto-actions',()=>{
 const html=s=>qa.render('app/game/MobilityGarage.tsx',{save:s,onCommand:()=>{throw Error('SSR never writes');},onClose:()=>{}});
 assert.match(html(earned),/Recevoir le Grav-Sled du clan/);assert.match(html(claim()),/data-mobility-training-reward="claimed"/);
 assert.doesNotMatch(html(seed()),/Recevoir le Grav-Sled du clan/);
});
