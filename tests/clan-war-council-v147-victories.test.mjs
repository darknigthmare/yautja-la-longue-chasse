import assert from "node:assert/strict";
import test from "node:test";
import {build} from "esbuild";

const compiled=await build({
 stdin:{contents:[
  "export * from './app/game/systems/clanWarRtsSquadsV133';",
  "export * from './app/game/systems/clanWarRtsSourceMissionsV129';",
  "export * from './app/game/systems/clanWarSourceMapsV128';",
  "export * from './app/game/systems/clanWarBibleV6';",
  "export * from './app/game/systems/clanWarCouncilReviewV147';",
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
 // The objective-only test temporarily removed environmental hazards to
 // isolate mission routing. A modified map MUST NOT pass the Council source
 // gate; restore the immutable authored map solely for receipt QA. This does
 // NOT certify any real gameplay history or a server-authenticated victory.
 const tampered=api.buildWarCouncilAuditV147(null,end,rules);
 assert.equal(tampered.total,0,id+" altered map must not be source-certified");
 const sourceMap=api.createWarRtsSquadsV133(id,rules).map;
 return {...end,map:sourceMap};
}


test("Council accepts 24 isolated W3 victories with the unauthenticated-source caveat",()=>{
 const outcomes=api.WAR_SOURCE_RTS_IDS_V129.map(fullSourceMission);
 assert.equal(outcomes.length,24);
 for(const state of outcomes){
  const audit=api.buildWarCouncilAuditV147(null,state,rules);
  assert.equal(audit.total,1,state.mission.id+": "+audit.issues.join(", "));
  assert.equal(audit.dossiers[0].status,"source-checked");
  assert.ok(audit.dossiers[0].missingEvidence.some(x=>x.includes("non authentifiée")));
 }
});
