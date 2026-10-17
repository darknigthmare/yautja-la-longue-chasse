import assert from 'node:assert/strict';
import test from 'node:test';
import { fixture, deferred } from './helpers/ship-training-ack-harness-v94.mjs';
const drain = async f => { for (let i=0;i<5;i++) { await Promise.resolve(); f.flush(); } };
function setup() {
  const d=deferred();let candidate,calls=0;
  const f=fixture({controlled:true,onDelegated:s=>{candidate=s;calls++;return d.promise;}});
  return {f,d,get candidate(){return candidate;},get calls(){return calls;}};
}
for(const discipline of ['targeting','wristblades','cloaking','mobility','honor-duel']) test(`${discipline}: explicit delayed host acknowledgement closes once without a local fallback write`,async()=>{
  const x=setup(),{f,d}=x;await f.start(discipline);f.current.completeAutonomousTraining(87);f.flush();
  assert.ok(f.current.trainingSession);assert.ok(f.current.hasPendingResult());assert.equal(f.current.canRetryTraining,false);
  f.current.completeAutonomousTraining(100);await f.start('mobility');assert.equal(x.calls,1);
  d.resolve({persisted:true,state:x.candidate,failure:null});await drain(f);
  assert.equal(f.current.trainingSession,null);assert.equal(f.current.hasPendingResult(),false);
  assert.match(f.messages.at(-1),/confirmée par le gestionnaire externe/);assert.equal(f.writes.length,0);
});
test('an asynchronous host rejection is consumed and remains uncertain, never retried locally',async()=>{
  const x=setup(),{f,d}=x;await f.start();f.current.completeAutonomousTraining(90);f.flush();
  d.reject(Error('host write may already exist'));await drain(f);
  assert.ok(f.current.saveIssue);assert.ok(f.current.hasPendingResult());assert.equal(f.current.canRetryTraining,false);
  f.current.retryTrainingSave();await f.start('mobility');assert.equal(x.calls,1);assert.equal(f.writes.length,0);
});
test('a resolved void callback is delivery only, not a durable acknowledgement',async()=>{
  const {f,d}=setup();await f.start();f.current.completeAutonomousTraining(80);f.flush();d.resolve();await drain(f);
  assert.equal(f.current.trainingSession,null);assert.match(f.messages.at(-1),/sauvegarde non vérifiée/);assert.equal(f.writes.length,0);
});
for(const change of ['foreign-owner','different-score','extra-attempt','failed-readback','future-version','missing-state','truthy-persisted','receiver-mutated-request'])test(`host acknowledgement rejects ${change}`,async()=>{
  const x=setup(),{f,d}=x;await f.start();f.current.completeAutonomousTraining(80);f.flush();
  const state=JSON.parse(JSON.stringify(x.candidate));const response={state,persisted:true,failure:null};
  if(change==='foreign-owner')state.ownerSaveCreatedAt='2026-01-01T00:00:00.000Z';
  if(change==='different-score')state.training.targeting.lastScore=50;
  if(change==='extra-attempt')state.training.mobility.attempts++;
  if(change==='failed-readback')response.failure='write-failed';
  if(change==='future-version')state.version=999;
  if(change==='missing-state')delete response.state;
  if(change==='truthy-persisted')response.persisted='yes';
  if(change==='receiver-mutated-request'){x.candidate.training.targeting.lastScore=50;response.state=x.candidate;}
  d.resolve(response);await drain(f);assert.ok(f.current.saveIssue);assert.ok(f.current.hasPendingResult());
  assert.equal(f.writes.length,0);assert.ok(!f.messages.some(m=>m.includes('confirmée par le gestionnaire externe')));
});
test('closing a submitted drill does not cancel the host write or duplicate it',async()=>{
  const x=setup(),{f,d}=x;await f.start();f.current.completeAutonomousTraining(80);f.flush();f.current.cancelAutonomousTraining();f.flush();
  assert.equal(f.current.trainingSession,null);assert.ok(f.current.hasPendingResult());
  d.resolve({persisted:true,state:x.candidate,failure:null});await drain(f);
  assert.equal(f.current.hasPendingResult(),false);assert.equal(x.calls,1);assert.equal(f.writes.length,0);
});
for(const finish of ['resolve','reject'])test(`late host ${finish} after unmount has no effects`,async()=>{
  const x=setup(),{f,d}=x;await f.start();f.current.completeAutonomousTraining(80);f.flush();f.unmount();const count=f.messages.length;
  d[finish](finish==='resolve'?{persisted:true,state:x.candidate,failure:null}:Error('late'));await Promise.resolve();await Promise.resolve();
  assert.equal(f.messages.length,count);assert.equal(f.writes.length,0);
});
test('an acknowledgement belonging to the previous owner cannot close a new drill',async()=>{
  const x=setup(),{f,d}=x;await f.start();f.current.completeAutonomousTraining(80);f.flush();
  const save=f.a.defaultSave('2026-10-17T00:00:00.000Z');f.update({save,progression:f.a.createDefaultShipProgression(save,save.updatedAt),onDelegated:()=>{}});await drain(f);
  await f.start('mobility');d.resolve({persisted:true,state:x.candidate,failure:null});await drain(f);
  assert.equal(f.current.trainingSession.disciplineId,'mobility');assert.equal(f.writes.length,0);
});
test('legacy synchronous callbacks still make no durable claim',async()=>{
  const sent=[],f=fixture({controlled:true,onDelegated:s=>sent.push(s)});await f.start();f.current.completeAutonomousTraining(80);f.flush();
  assert.equal(sent.length,1);assert.equal(f.current.trainingSession,null);assert.match(f.messages.at(-1),/non vérifiée/);
});
test('synchronous matching host acknowledgement is supported',async()=>{
  const f=fixture({controlled:true,onDelegated:state=>({persisted:true,state,failure:null})});await f.start();f.current.completeAutonomousTraining(80);f.flush();
  assert.equal(f.current.trainingSession,null);assert.match(f.messages.at(-1),/confirmée par le gestionnaire externe/);assert.equal(f.writes.length,0);
});
