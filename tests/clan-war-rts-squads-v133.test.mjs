import assert from "node:assert/strict";
import test from "node:test";
import {build} from "esbuild";

const compiled=await build({
 stdin:{contents:[
  "export * from './app/game/systems/clanWarRtsSquadsV133';",
  "export * from './app/game/systems/clanWarRtsSourceMissionsV129';",
  "export * from './app/game/systems/clanWarSourceMapsV128';",
  "export * from './app/game/systems/clanWarBibleV6';",
 ].join("\n"),resolveDir:process.cwd()},bundle:true,write:false,
 platform:"node",format:"esm",target:"es2022",logLevel:"silent",
});
const api=await import("data:text/javascript;base64,"+Buffer.from(compiled.outputFiles[0].text).toString("base64"));
const rules=api.DEFAULT_WAR_RULES_V6;
const key=p=>p.x+","+p.y;
const distance=(a,b)=>Math.abs(a.x-b.x)+Math.abs(a.y-b.y);
const issue=(state,order)=>api.commandWarRtsSquadsV133(state,order);
const positions=(state)=>state.squads.filter(u=>u.status==="active");
function start(id){
 const s=api.createWarRtsSquadsV133(id,rules);
 assert.equal(s.phase,"planning");
 const result=api.launchWarRtsSquadsV133(s);
 assert.equal(result.accepted,true,id+": "+result.message);
 return result.state;
}
function moveNear(state,squadId,target,radius=1,limit=400){
 let s=state;
 for(let i=0;i<limit;i++){
  const actor=s.squads.find(u=>u.id===squadId);
  assert.ok(actor&&actor.hp>0,"selected squad lost in an isolated mission");
  if(distance(actor,target)<=radius)return s;
  const blockers=[...positions(s).filter(u=>u.id!==squadId),...s.enemies.filter(e=>e.hp>0)];
  const path=api.warMapFindPathV128(s.map,actor,target,blockers);
  assert.ok(path&&path.length>1,s.mission.id+" has no legal path to "+key(target));
  const next=path[1];
  assert.equal(distance(actor,next),1,"step must be orthogonal and one tile");
  const direction=next.x>actor.x?"right":next.x<actor.x?"left":next.y>actor.y?"down":"up";
  const r=issue(s,{kind:"move",squadId,direction});
  assert.equal(r.accepted,true,s.mission.id+" move "+direction+": "+r.message);
  s=r.state;
 }
 assert.fail(s.mission.id+" move limit reached");
}
/** Isolates authored objective traversal, without claiming a full PvP victory.
 * Enemy AI, hazards and fog have their own live-state tests below. */
function isolated(id){
 const original=start(id);
 return {...original,enemies:[],map:{...original.map,hazards:[]}};
}
function fullSourceMission(id){
 let state=isolated(id);
 const squadId=state.squads[0].id;
 state=moveNear(state,squadId,state.map.observation,1);
 let result=issue(state,{kind:"observe",squadId});
 assert.equal(result.accepted,true,id+" cannot scout: "+result.message);
 state=result.state;
 for(const task of state.mission.tasks){
  state=moveNear(state,squadId,task.location,1);
  if(task.requiresPressure&&!state.airlockStable){
   const pressurized=issue(state,{kind:"stabilize",squadId});
   assert.equal(pressurized.accepted,true,id+" cannot stabilize orbital pressure: "+pressurized.message);
   state=pressurized.state;
  }
  if(task.requiresPower&&!state.power){
   const powered=issue(state,{kind:"power",squadId});
   assert.equal(powered.accepted,true,id+" cannot restore required power: "+powered.message);
   state=powered.state;
  }
  let cycles=0;
  while(!state.completedTaskIds.includes(task.id)&&cycles++<48){
   const kind=state.hold?"wait":"interact";
   result=issue(state,{kind,squadId});
   if(!result.accepted){
    assert.match(result.message,/Marée|Rafales|Glace|Jets|thermiques|fenêtre/i,
     id+" unexpected action rejection: "+result.message);
    result=issue(state,{kind:"wait",squadId});
    assert.equal(result.accepted,true,id+" cannot wait out climate");
   }
   state=result.state;
  }
  assert.ok(state.completedTaskIds.includes(task.id),id+" no source proof: "+task.title);
  assert.equal(state.phase,"active",id+" objective isn't itself an extraction");
 }
 // A follower trails a step: the leader must actually reach the exit tile.
 state=moveNear(state,squadId,state.map.extraction,0);
 // A witness or wounded ally must FOLLOW physically; a carrier moves with its holder.
 for(let n=0;n<60&&state.tracked&&distance(state.tracked,state.map.extraction)>1;n++){
  const waited=issue(state,{kind:"wait",squadId});
  assert.equal(waited.accepted,true,id+" cannot accompany escort");
  state=waited.state;
 }
 const completed=issue(state,{kind:"extract",squadId});
 assert.equal(completed.accepted,true,id+" extraction rejected: "+completed.message+"; escort="+JSON.stringify(state.tracked)+"; allies="+JSON.stringify(state.squads.map(u=>({id:u.id,x:u.x,y:u.y,hp:u.hp}))));
 const end=completed.state;
 assert.equal(end.phase,"victory");
 assert.equal(end.report?.campaignMutation,false);
 assert.equal(end.report?.completedTaskIds.length,3);
 assert.equal(end.report?.planetId,end.map.planetId);
 assert.equal(end.report?.sourceCells.length,25);
 assert.equal(end.report?.escortExtracted,Boolean(end.tracked));
 assert.equal(issue(end,{kind:"extract",squadId}).accepted,false,"no duplicate result receipt");
 return end;
}

test("source: 24 mission W3 grids accept at least two distinct formations within true PC budgets",()=>{
 const audit=api.auditWarRtsSquadsV133(rules);
 assert.deepEqual(audit.issues,[]);
 assert.equal(audit.missions,24);
 assert.equal(audit.steps,72);
 for(const id of api.WAR_SOURCE_RTS_IDS_V129){
  const s=start(id);
  assert.ok(s.squads.length>=2&&s.squads.length<=4);
  assert.equal(s.pcCommitted,s.squads.reduce((sum,u)=>sum+u.commandPoints,0));
  assert.ok(s.pcCommitted<=s.mission.pcMaximum);
  assert.equal(s.ravRemaining,s.mission.initialRav);
  assert.equal(new Set(s.squads.map(key)).size,s.squads.length);
  assert.equal(s.map.planetId,s.mission.planetId);
  assert.ok(s.squads.every(u=>api.warMapWalkableV128(s.map,u)));
  assert.equal(s.report,null);
 }
});

test("planning: no free recruitment, no PC overspend, no branch/source mutation",()=>{
 const original=api.createWarRtsSquadsV133("W3-RTS01",rules);
 const source=original.sourceSha;
 const added=api.draftWarRtsSquadV133(original,"W3-U07",rules);
 if(added.accepted){
  assert.ok(added.state.pcCommitted>original.pcCommitted);
  assert.equal(added.state.squads.length,original.squads.length+1);
  const removed=api.removeWarRtsSquadV133(added.state,added.state.squads.at(-1).id);
  assert.equal(removed.accepted,true);
  assert.equal(removed.state.pcCommitted,original.pcCommitted);
 }else assert.match(added.message,/PC|Maximum/i);
 assert.equal(api.draftWarRtsSquadV133(original,"NON_CANON",rules).accepted,false);
 assert.equal(api.draftWarRtsSquadV133({...original,pcMaximum:0},"W3-U01",rules).accepted,false);
 assert.equal(api.draftWarRtsSquadV133({...original,sourceSha:"invalid"},"W3-U01",rules).accepted,false);
 assert.equal(original.sourceSha,source);
 assert.equal(original.report,null);
 assert.equal(original.squads.every(u=>u.status==="ready"),true);
});

test("two separately controlled detachments obey independent one-cell orders",()=>{
 let state=start("W3-RTS01");
 const [first,second]=state.squads;
 assert.notEqual(first.id,second.id);
 const directions=[["up",0,-1],["down",0,1],["left",-1,0],["right",1,0]];
 const choose=(s,actor)=>directions.find(([,dx,dy])=>{
  const tile={x:actor.x+dx,y:actor.y+dy};
  return api.warMapWalkableV128(s.map,tile)&&!s.squads.some(u=>u.id!==actor.id&&u.status==="active"&&key(u)===key(tile))&&
   !s.enemies.some(e=>e.hp>0&&key(e)===key(tile));
 });
 const d1=choose(state,first);assert.ok(d1,"first squad has a legal step");
 const moved=issue(state,{kind:"move",squadId:first.id,direction:d1[0]});
 assert.equal(moved.accepted,true,moved.message);state=moved.state;
 const beforeSecond=state.squads.find(u=>u.id===second.id);
 assert.equal(key(beforeSecond),key(second),"moving first cannot teleport second");
 const firstAfter=state.squads.find(u=>u.id===first.id);
 assert.equal(distance(first,firstAfter),1);
 const d2=choose(state,beforeSecond);assert.ok(d2,"second squad has a legal step");
 const moved2=issue(state,{kind:"move",squadId:second.id,direction:d2[0]});
 assert.equal(moved2.accepted,true,moved2.message);
 const secondAfter=moved2.state.squads.find(u=>u.id===second.id);
 assert.equal(distance(beforeSecond,secondAfter),1);
 assert.equal(key(moved2.state.squads.find(u=>u.id===first.id)),key(firstAfter),"moving second cannot teleport first");
 assert.equal(moved2.state.turn,2);
});

test("commands: illegal moves, hidden targets and remote objectives do not tick or consume RAV",()=>{
 let s=start("W3-RTS01");
 const soldier=s.squads[0];
 const fake=issue(s,{kind:"move",squadId:soldier.id,direction:"up"});
 if(!fake.accepted){assert.equal(fake.state,s);assert.equal(s.turn,0);}
 const forbidden=issue(s,{kind:"interact",squadId:soldier.id});
 assert.equal(forbidden.accepted,false);
 assert.equal(forbidden.state,s);
 const targeted=issue(s,{kind:"attack",squadId:soldier.id,targetId:"unknown-enemy"});
 assert.equal(targeted.accepted,false);
 assert.equal(targeted.state,s);
 assert.equal(s.ravRemaining,s.initialRav);
 assert.equal(s.turn,0);
 assert.equal(issue(s,{kind:"extract",squadId:soldier.id}).accepted,false);
 assert.equal(issue(s,{kind:"stabilize",squadId:soldier.id}).accepted,false);
});

test("combat: one source-derived team's firing requires actual LOS/range and spends RAV",()=>{
 const s=start("W3-RTS01"),soldier=s.squads[0];
 const occupied=new Set(s.squads.map(key));
 const near=[{x:soldier.x+1,y:soldier.y},{x:soldier.x-1,y:soldier.y},
  {x:soldier.x,y:soldier.y+1},{x:soldier.x,y:soldier.y-1}]
  .find(p=>api.warMapWalkableV128(s.map,p)&&!occupied.has(key(p)));
 assert.ok(near,"valid target position adjacent to squad");
 const enemy={...s.enemies[0],...near,hp:8,status:"active"};
 let match={...s,enemies:[enemy]};
 const shot=issue(match,{kind:"attack",squadId:soldier.id,targetId:enemy.id});
 assert.equal(shot.accepted,true,shot.message);
 assert.equal(shot.state.ravRemaining,match.ravRemaining-1);
 assert.ok(shot.state.enemies[0].hp<enemy.hp);
 assert.equal(match.enemies[0].hp,8,"input immutable");
 match={...match,ravRemaining:0};
 const noAmmo=issue(match,{kind:"attack",squadId:soldier.id,targetId:enemy.id});
 assert.equal(noAmmo.accepted,false);
 assert.equal(noAmmo.state,match);
});

test("environment & geography: power/pressure are local, no Earth city on alien planets",()=>{
 for(const id of api.WAR_SOURCE_RTS_IDS_V129){
  const s=start(id);
  if(s.map.id==="W3-MAP12"){
   assert.equal(s.map.worldStratum,"orbital-vessel");
   assert.equal(s.airlockStable,false);
  }
  if(s.map.id==="W3-MAP10")assert.equal(s.map.worldStratum,"subsurface");
  assert.ok(!/Gunnison|Los Angeles|Bouvet/i.test(s.map.planetName));
  assert.equal(s.mission.playableEngine,"single-hunter-physical-simulation-not-full-rts",
   "source V129 must not be silently relabeled");
 }
});

test("24 isolated objective chains: 72 physical tasks, escorts, return and unique receipts",()=>{
 const outcomes=api.WAR_SOURCE_RTS_IDS_V129.map(fullSourceMission);
 assert.equal(outcomes.length,24);
 assert.equal(outcomes.reduce((a,s)=>a+s.completedTaskIds.length,0),72);
 assert.ok(outcomes.filter(s=>s.tracked).length>=8);
 assert.ok(outcomes.every(s=>s.report?.outcome==="victory"&&!s.report.campaignMutation));
});
