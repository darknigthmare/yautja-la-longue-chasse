import assert from 'node:assert/strict';
import { test } from 'node:test';
import { thresholdsTemple as p, playTemple, templeInput, templeEnvironment as env } from './helpers/solo-v70-played-route.mjs';

let route;
const played=()=>route??=playTemple();

test('nine physical rooms, reversible doors, three configurations and five real combat hits complete the opening only',()=>{
 const r=played();assert.equal(r.receipts.length,15);assert.deepEqual(r.receipts.map(x=>x.id),p.SOLO_V70_PROOFS);assert(r.state.visited.every(Boolean));assert.equal(r.state.configuration,3);assert.equal(r.state.doorCrossings,16);assert(r.state.walked>18000);assert.equal(r.state.drone.hp,0);assert.equal(r.state.drone.hits,5);assert(r.state.health<6&&r.state.health>0);
 const upper=r.transitions.find(t=>t.receipts[0]?.id==='upper-entry');assert.equal(upper.after.player.y,270);assert.equal(p.soloV70Support(upper.after),270);
 const lift=r.transitions.find(t=>t.receipts[0]?.id==='counterweight-aligned');assert.equal(lift.after.liftTicks,100);assert.equal(lift.after.player.y,300);assert.equal(p.soloV70Support(lift.after),300);
 assert.equal(r.transitions.filter(t=>t.before.room!==t.after.room&&t.after.configuration===3).length,8);assert.match(p.soloV70Objective(r.state).instruction,/restent à accomplir/);
});

test('cold restoration every 83 ticks clears held inputs and still traverses galleries, moving lift and native drone challenge',()=>{
 const r=playTemple({restoreEvery:83});assert.equal(r.state.phase,'complete');assert(r.state.visited.every(Boolean));assert.equal(r.receipts.length,15);assert.equal(r.state.drone.hp,0);assert.equal(r.state.attempts,0);
 const held=structuredClone(played().snapshots.drone);held.inputArmed=true;held.previousInteract=held.previousJump=held.previousCommand=true;const restored=p.normalizeSoloV70State(held);assert(restored);assert.equal(restored.inputArmed,false);assert.equal(restored.previousCommand,false);
});

test('pause, absent bitmaps or a hidden page freeze every clock, companion and hazard rather than banking elapsed time',()=>{
 for(const phase of ['counterweight','drone','quarantine'])for(const override of [{paused:true},{assetsReady:false},{pageVisible:false}]){
  let state=structuredClone(played().snapshots[phase]);const initial=structuredClone(state);for(let i=0;i<200;i++)state=p.stepSoloV70(state,{move:1,jump:true,interact:true,command:true},{...env,...override}).state;
  for(const k of ['tick','player','companions','drone','acid','health','liftTicks','valveTimer','milestones'])assert.deepEqual(state[k],initial[k],phase+':'+k);assert.equal(state.inputArmed,false);
 }
});

test('standing in a charge without attacking causes a real defeat; retry waits, restores the chamber and keeps earlier receipts',()=>{
 let state=playTemple({stop:'drone'}).state;for(let i=0;i<5000&&state.failedAt===null;i++){const controls=state.room<8?templeInput(state):state.inputArmed?{move:state.player.x<780?1:0}:{};state=p.stepSoloV70(state,controls,env).state;}
 assert.notEqual(state.failedAt,null);assert.equal(state.health,0);assert.equal(state.drone.hp,5);const proofs=structuredClone(state.milestones),at=state.failedAt;
 state=p.stepSoloV70(state,{},env).state;state=p.stepSoloV70(state,{interact:true},env).state;assert.equal(state.failedAt,at);assert.equal(state.attempts,0);
 while(state.tick-at<90)state=p.stepSoloV70(state,{},env).state;
 state=p.stepSoloV70(state,{interact:true},env).state;assert.equal(state.failedAt,null);assert.equal(state.health,6);assert.equal(state.attempts,1);assert.equal(state.player.x,125);assert.deepEqual(state.milestones,proofs);
 const r=playTemple({initial:state});assert.equal(r.state.phase,'complete');assert.equal(r.state.attempts,1);assert.equal(r.receipts.length,5);
});

test('invalid future versions, disconnected visits, fabricated milestone time and nonboolean held controls cannot restore',()=>{
 const initial=p.createSoloV70State();for(const change of [s=>s.version=2,s=>s.room=8,s=>s.visited[8]=true,s=>s.inputArmed='true',s=>s.phaseStartedAt=1]){const raw=structuredClone(initial);change(raw);assert.equal(p.normalizeSoloV70State(raw),null);}
 const known=structuredClone(played().snapshots.signs);known.phaseStartedAt++;assert.equal(p.normalizeSoloV70State(known),null);
});
