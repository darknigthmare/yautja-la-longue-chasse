import assert from 'node:assert/strict';
import {test} from 'node:test';
import {thresholdsTemple as p,templeCampaignRoute,templeInput,templeEnvironment as env,stamp} from './helpers/solo-v70-played-route.mjs';
import {homeworldQaModelV64} from '../scripts/homeworld-qa-model-v64.mjs';
let route;const played=()=>route??=templeCampaignRoute();

test('fifteen ordered opening receipts preserve Young Blood, all prior chapters, armament, rank and global kill evidence',()=>{
 const r=played();assert.equal(r.save.soloV70.status,'completed');assert.equal(r.save.soloV70.receipts.length,15);assert(p.soloV70MatchesSave(r.save));
 for(const key of ['prologue','soloV66','soloV67','soloV68','soloV69','youthTraining','inventory','loadout','statistics','missionProgress','homeworld'])assert.deepEqual(r.save[key],r.origin[key]);
 assert.deepEqual({...r.save.profile,playTimeSeconds:0},{...r.origin.profile,playTimeSeconds:0});assert(r.save.profile.playTimeSeconds>r.origin.profile.playTimeSeconds);assert.equal(p.withSoloV70Checkpoint(r.save,r.state,stamp).profile.playTimeSeconds,r.save.profile.playTimeSeconds);
});

test('incomplete prior chapters, fabricated rank and concurrent physical journeys cannot start the temple',()=>{
 const origin=played().origin;for(const change of [s=>s.soloV69=null,s=>s.soloV69.receipts.pop(),s=>s.prologue.chronicle.rites.pop(),s=>s.youthTraining=null,s=>s.soloV68=null]){const s=structuredClone(origin);change(s);assert.equal(p.canStartSoloV70(s),false);assert.equal(p.startSoloV70Campaign(s,stamp),null);}
 const q=homeworldQaModelV64(process.cwd(),['homeworldRegionsV68.ts','homeworldPassageV67.ts','gameReserveV66.ts']);
 for(const [key,value] of [['homeworldRegionV68',q.createHomeworldRegionV68('ash-marches','other')],['homeworldPassageV67',q.createHomeworldPassageV67('ash-marches','outbound','other')],['gameReserveV66',q.createGameReserveV66(17)]]){
  assert.equal(p.canStartSoloV70({...origin,[key]:value}),false);assert.equal(p.soloV70MatchesSave({...p.startSoloV70Campaign(origin,stamp),[key]:value}),false);assert(p.soloV70MatchesSave({...played().save,[key]:value}));
 }
});

test('fresh progress requires its exact local receipt; replay is idempotent and older rooms cannot rewind a certified run',()=>{
 const r=played();for(const commit of r.commits){assert.equal(p.withSoloV70Checkpoint(commit.before,commit.state,stamp),null);assert.equal(p.withSoloV70Progress(commit.before,[{...commit.receipts[0],sourceId:'chronicle.rite.first-blood'}],commit.state,stamp),null);assert.deepEqual(p.withSoloV70Progress(commit.after,commit.receipts,commit.state,stamp).soloV70,commit.after.soloV70);}
 for(let i=1;i<r.commits.length;i++)assert.equal(p.withSoloV70Progress(r.commits[i].after,r.commits[i-1].receipts,r.commits[i-1].state,stamp),null);
 const future=structuredClone(r.save.soloV70);future.version=2;assert.equal(p.normalizeSoloV70Campaign(future),null);
});

test('fabricated endpoints and door teleportation cannot certify receipts despite superficially ordered milestones',()=>{
 const r=played();for(const commit of r.commits){const bad=structuredClone(commit.state);bad.player.x=65;assert.equal(p.withSoloV70Progress(commit.before,commit.receipts,bad,stamp),null);}
 const initial=p.startSoloV70Campaign(r.origin,stamp),bad=structuredClone(initial.soloV70.checkpoint);bad.tick=1;bad.player.x=1000;assert.equal(p.withSoloV70Checkpoint(initial,bad,stamp),null);
 const forged=structuredClone(r.commits[3].state);forged.visited[8]=true;assert.equal(p.normalizeSoloV70State(forged),null);
});

test('120-tick writes persist physical subobjectives immediately and exact refused arguments remain valid while all simulation freezes',()=>{
 let save=p.startSoloV70Campaign(played().origin,stamp),state=p.createSoloV70State(),last=0,writes=0;const refusals=new Set();
 for(let i=0;i<16000&&state.phase!=='complete';i++){
  const before=state,out=p.stepSoloV70(state,templeInput(state),env);state=out.state;if(!p.soloV70NeedsImmediateCheckpoint(before,state)&&state.tick-last<120)continue;
  const argument=state,serialized=JSON.stringify(argument),write=()=>out.receipts.length?p.withSoloV70Progress(save,out.receipts,argument,stamp):p.withSoloV70Checkpoint(save,argument,stamp),candidate=write();assert(candidate,'refused '+state.phase+' tick '+state.tick);
  const kind=before.room!==state.room?'door':state.signs>before.signs?'sign':state.liftTicks>before.liftTicks&&before.liftTicks===0?'lift':state.valveTimer>before.valveTimer?'valve':state.drone.hp<before.drone.hp?'drone-hit':state.companionMode!==before.companionMode?'triad':'';
  if(kind&&!refusals.has(kind)){refusals.add(kind);const durable=JSON.stringify(save);for(let j=0;j<180;j++)state=p.stepSoloV70(state,{move:1,jump:true,command:true,interact:true},{...env,paused:true}).state;for(const key of ['tick','player','companions','drone','health','scan','liftTicks','valveTimer','milestones'])assert.deepEqual(state[key],argument[key],kind+':'+key);assert.equal(JSON.stringify(save),durable);assert.equal(JSON.stringify(argument),serialized);assert.deepEqual(write(),candidate);}
  save=candidate;last=argument.tick;writes++;
 }
 assert.equal(state.phase,'complete');assert.equal(save.soloV70.receipts.length,15);assert.deepEqual([...refusals].sort(),['door','drone-hit','lift','sign','triad','valve']);assert(writes<120,'periodic ordinary movement remains bounded '+writes);
});

test('a genuinely defeated chamber cannot be healed through an early retry or fabricated extra combat hits',()=>{
 const run=played(),entry=run.commits.find(c=>c.state.phase==='drone');let save=entry.after,state=structuredClone(entry.state),last=state.tick;
 for(let i=0;i<5000&&state.failedAt===null;i++){
  const before=state,controls=state.room<8?templeInput(state):state.inputArmed?{move:state.player.x<780?1:0}:{},out=p.stepSoloV70(state,controls,env);state=out.state;
  if(p.soloV70NeedsImmediateCheckpoint(before,state)||state.tick-last>=120){save=p.withSoloV70Checkpoint(save,state,stamp);assert(save);last=state.tick;}
 }
 assert(state.failedAt!==null);assert.equal(save.soloV70.checkpoint.health,0);
 const forged=structuredClone(state);forged.tick++;forged.health=6;forged.failedAt=null;forged.attempts++;forged.player={x:125,y:430,vx:0,vy:0,facing:1};forged.acid.ttl=0;forged.drone={...state.drone,x:925,hp:5,mode:'watch',age:0};
 assert(p.normalizeSoloV70State(forged));assert.equal(p.withSoloV70Checkpoint(save,forged,stamp),null,'retry before the actual ninety-tick boundary');
 while(state.tick-state.failedAt<90)state=p.stepSoloV70(state,{},env).state;
 state=p.stepSoloV70(state,{interact:true},env).state;const accepted=p.withSoloV70Checkpoint(save,state,stamp);assert(accepted);assert.equal(accepted.soloV70.checkpoint.attempts,1);assert.deepEqual(accepted.soloV70.receipts,save.soloV70.receipts);
 const invented=structuredClone(state);invented.drone.hits++;assert.equal(p.withSoloV70Checkpoint(save,invented,stamp),null,'retry cannot manufacture additional hits');
});
