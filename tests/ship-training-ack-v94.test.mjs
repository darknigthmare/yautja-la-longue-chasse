import assert from 'node:assert/strict';
import test from 'node:test';
import { fixture, deferred, acknowledgementClock } from './helpers/ship-training-ack-harness-v94.mjs';
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


// The deadline qualifies an unknown result; it never authorizes replay or
// pretends to cancel a write owned by another component.
function waiting() {
 const clock=acknowledgementClock(), d=deferred();let candidate,calls=0;
 const f=fixture({controlled:true,onDelegated:s=>{candidate=s;calls++;return d.promise;}},clock);
 return {clock,d,f,get candidate(){return candidate;},get calls(){return calls;}};
}
async function submitWaiting(x) {await x.f.start();x.f.current.completeAutonomousTraining(83);x.f.flush();}
const confirmation=x=>({persisted:true,state:x.candidate,failure:null});

test('a silent host produces a bounded warning, never a second submission or local save',async()=>{
 const x=waiting();await submitWaiting(x);
 assert.equal(x.clock.pending,1);
 x.clock.advance(14999);x.f.flush();assert.match(x.f.current.saveIssue,/en cours/);
 x.clock.advance(1);x.f.flush();assert.match(x.f.current.saveIssue,/ne répond pas/);
 assert.equal(x.clock.pending,0);assert.ok(x.f.current.hasPendingResult());assert.equal(x.f.current.canRetryTraining,false);
 x.f.current.retryTrainingSave();x.f.current.completeAutonomousTraining(100);await x.f.start('mobility');
 assert.equal(x.calls,1);assert.equal(x.f.writes.length,0);x.f.unmount();
});
test('a matching late acknowledgement after the warning closes exactly one operation',async()=>{
 const x=waiting();await submitWaiting(x);x.clock.advance(15000);x.f.flush();
 x.d.resolve(confirmation(x));await drain(x.f);assert.equal(x.f.current.hasPendingResult(),false);
 assert.equal(x.f.current.trainingSession,null);assert.equal(x.f.current.saveIssue,null);assert.equal(x.calls,1);
 assert.equal(x.f.messages.filter(m=>m.includes('confirmée par le gestionnaire externe')).length,1);
 assert.equal(x.f.writes.length,0);x.f.unmount();
});
test('a late rejection after the warning remains uncertain without unhandled rejection or replay',async()=>{
 const x=waiting();await submitWaiting(x);x.clock.advance(15000);x.f.flush();
 x.d.reject(Error('May have committed'));await drain(x.f);
 assert.match(x.f.current.saveIssue,/Transmission externe non confirmée/);
 assert.equal(x.f.current.canRetryTraining,false);assert.ok(x.f.current.hasPendingResult());
 assert.equal(x.clock.pending,0);assert.equal(x.f.writes.length,0);x.f.unmount();
});
test('closing a delegated result does not incorrectly instruct a local retry',async()=>{
 const x=waiting();await submitWaiting(x);x.f.current.cancelAutonomousTraining();x.f.flush();
 assert.equal(x.f.current.trainingSession,null);assert.match(x.f.messages.at(-1),/gestionnaire externe/);
 assert.doesNotMatch(x.f.messages.at(-1),/Réessayez sa sauvegarde/);
 x.clock.advance(15000);x.f.flush();assert.match(x.f.current.saveIssue,/ne répond pas/);
 x.d.resolve(confirmation(x));await drain(x.f);assert.equal(x.f.current.hasPendingResult(),false);x.f.unmount();
});
test('early confirmation cancels its deadline and a captured expired callback is inert',async()=>{
 const x=waiting();await submitWaiting(x);assert.equal(x.clock.pending,1);const old=x.clock.scheduled[0];
 x.d.resolve(confirmation(x));await drain(x.f);assert.equal(x.clock.pending,0);
 old();x.clock.advance(30000);x.f.flush();assert.equal(x.f.current.saveIssue,null);assert.equal(x.f.current.hasPendingResult(),false);x.f.unmount();
});
test('a rejected acknowledgement retires its timer without losing the uncertain result',async()=>{
 const x=waiting();await submitWaiting(x);assert.equal(x.clock.pending,1);
 x.d.resolve({persisted:false,state:x.candidate,failure:'write-failed'});await drain(x.f);
 const issue=x.f.current.saveIssue;assert.equal(x.clock.pending,0);x.clock.advance(15000);x.f.flush();
 assert.equal(x.f.current.saveIssue,issue);assert.ok(x.f.current.hasPendingResult());x.f.unmount();
});
for(const action of ['unmount','owner','controlled-mode'])test(`${action} cancels the old wait and all its late effects`,async()=>{
 const x=waiting();await submitWaiting(x);assert.equal(x.clock.pending,1);const timer=x.clock.scheduled[0];
 if(action==='unmount')x.f.unmount();
 if(action==='controlled-mode')x.f.update({controlled:false});
 if(action==='owner'){const save=x.f.a.defaultSave('2026-10-17T12:00:00.000Z');x.f.update({save,progression:x.f.a.createDefaultShipProgression(save,save.updatedAt)});}
 await Promise.resolve();x.f.flush();assert.equal(x.clock.pending,0);
 const messages=x.f.messages.length;timer();x.d.reject(Error('late'));await Promise.resolve();await Promise.resolve();
 assert.equal(x.f.messages.length,messages);assert.equal(x.f.writes.length,0);x.f.unmount();
});
test('ordinary parent renders do not restart the acknowledgement deadline',async()=>{
 const x=waiting();await submitWaiting(x);assert.equal(x.clock.pending,1);x.clock.advance(8000);
 for(let i=0;i<12;i++)x.f.update({notify:m=>x.f.messages.push(m)});
 x.clock.advance(7000);x.f.flush();assert.match(x.f.current.saveIssue,/ne répond pas/);
 assert.equal(x.clock.scheduled.length,1);x.f.unmount();
});
test('suspending gameplay does not grant, retry or discard a timed-out host score',async()=>{
 const x=waiting();await submitWaiting(x);x.f.update({suspended:true});x.clock.advance(15000);x.f.flush();
 assert.match(x.f.current.saveIssue,/ne répond pas/);assert.ok(x.f.current.hasPendingResult());
 assert.equal(x.f.writes.length,0);x.f.update({suspended:false});await x.f.start('mobility');assert.equal(x.calls,1);x.f.unmount();
});
test('a synchronous receiver needs no acknowledgement timer',async()=>{
 const clock=acknowledgementClock();const f=fixture({controlled:true,onDelegated:state=>({persisted:true,state,failure:null})},clock);
 await f.start();f.current.completeAutonomousTraining(83);f.flush();assert.equal(clock.pending,0);assert.equal(f.current.hasPendingResult(),false);f.unmount();
});
test('a receiver that unmounts synchronously cannot leave a live deadline behind',async()=>{
 const x=waiting();x.f.update({onDelegated:()=>{x.f.unmount();return x.d.promise;}});
 await submitWaiting(x);assert.equal(x.clock.pending,0);
 const count=x.f.messages.length;x.d.reject(Error('late rejected host'));await Promise.resolve();await Promise.resolve();
 assert.equal(x.f.messages.length,count);assert.equal(x.f.writes.length,0);
});
