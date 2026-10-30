import assert from "node:assert/strict";
import test from "node:test";
import {build} from "esbuild";
const built=await build({
 stdin:{contents:[
  "export * from './app/game/systems/clanWarRtsSourceMissionsV129';",
  "export * from './app/game/systems/clanWarSourceMapsV128';",
  "export * from './app/game/systems/clanWarBibleV6';",
 ].join("\n"),resolveDir:process.cwd()},
 bundle:true,write:false,platform:"node",format:"esm",target:"es2022",logLevel:"silent",
});
const api=await import("data:text/javascript;base64,"+Buffer.from(built.outputFiles[0].text).toString("base64"));
const rules=api.DEFAULT_WAR_RULES_V6;
const ids=api.WAR_SOURCE_RTS_IDS_V129;
const coord=(p)=>p.x+","+p.y;
const dist=(a,b)=>Math.abs(a.x-b.x)+Math.abs(a.y-b.y);
const dir=(a,b)=>b.x>a.x?"right":b.x<a.x?"left":b.y>a.y?"down":b.y<a.y?"up":"wait";
const command=(s,action)=>api.commandWarRtsSourceMissionV129(s,action);

function moveTo(state,target,limit=300){
 for(let i=0;i<limit&&coord(state.base.player)!==coord(target);i++){
  const blocked=state.base.enemies.filter(e=>e.hp>0).map(e=>({x:e.x,y:e.y}));
  const path=api.warMapFindPathV128(state.base.map,state.base.player,target,blocked);
  assert.ok(path&&path.length>1,state.mission.id+" no physical path from "+
    coord(state.base.player)+" to "+coord(target));
  const step=dir(path[0],path[1]);
  const result=command(state,step);
  assert.equal(result.accepted,true,state.mission.id+" "+step+" "+result.message);
  state=result.state;
  assert.notEqual(state.status,"defeat",state.mission.id+" player died before the objective");
 }
 assert.equal(coord(state.base.player),coord(target),state.mission.id+" never arrived at "+coord(target));
 return state;
}
function fullMission(id){
 let state=api.createWarRtsMissionStateV129(id,rules);
 state={...state,base:{...state.base,enemies:[]}};
 state=moveTo(state,state.base.map.observation);
 let result=command(state,"observe");
 assert.equal(result.accepted,true,id+" cannot scout "+result.message);
 state=result.state;
 for(const task of state.mission.tasks){
  state=moveTo(state,task.location);
  if(task.requiresPressure&&!state.base.airlockStable){
   const stabilized=command(state,"stabilize");
   assert.equal(stabilized.accepted,true,id+" pressure "+stabilized.message);
   state=stabilized.state;
  }
  if(task.requiresPower&&!state.base.power){
   const powered=command(state,"power");
   assert.equal(powered.accepted,true,id+" power "+powered.message);
   state=powered.state;
  }
  result=command(state,"interact");
  assert.equal(result.accepted,true,id+" physical task "+task.id+": "+result.message);
  state=result.state;
  let guard=0;
  while(!state.completedTaskIds.includes(task.id)&&guard++<8){
   result=command(state,"wait");
   assert.equal(result.accepted,true,id+" hold "+result.message);
   state=result.state;
  }
  assert.ok(state.completedTaskIds.includes(task.id),id+" step not completed: "+task.title);
 }
 assert.equal(state.completedTaskIds.length,3,id+" missing source stages");
 assert.equal(state.status,"active",id+" must extract instead of auto-win at last interaction");
 state=moveTo(state,state.base.map.extraction);
 let waits=0;
 while(state.status==="active"&&waits++<100){
  result=command(state,"wait");
  assert.equal(result.accepted,true,id+" escort follow "+result.message);
  state=result.state;
 }
 assert.equal(state.status,"victory",id+" did not finish after source phases and physical return");
 assert.equal(state.base.report?.outcome,"victory");
 assert.equal(state.base.report?.campaignMutation,false);
 if(state.mission.escortKind){
  assert.ok(state.tracked?.secured,id+" did not secure actual charge/ally");
  assert.equal(state.tracked?.extracted,true,id+" companion/cargo did not reach actual extraction");
  assert.ok(dist(state.tracked,state.base.map.extraction)<=1);
 }
 assert.equal(command(state,"wait").accepted,false,"cannot claim the receipt twice");
 return state;
}
test("all 24 source RTS narratives map to exactly 12 proper W3 planets and 72 explicit objectives",()=>{
 const audit=api.auditWarRtsSourceMissionsV129(rules);
 assert.deepEqual(audit.issues,[]);
 assert.equal(audit.scripts,24);
 assert.equal(audit.sourceMaps,12);
 assert.equal(audit.steps,72);
 assert.equal(ids.length,24);
 assert.equal(new Set(ids).size,24);
 for(let i=0;i<ids.length;i++){
  const id=ids[i],mission=api.buildWarRtsMissionV129(id,rules);
  const src=rules.entries.find(row=>row.id===id);
  const original=(key)=>String(src.fields.find(x=>x.column===key)?.value??"").trim();
  assert.equal(mission.name,String(src.title));
  assert.equal(mission.mapId,"W3-MAP"+String(Math.ceil((i+1)/2)).padStart(2,"0"));
  assert.equal(mission.rank,original("D"));
  assert.equal(mission.sourceObjective,original("E"));
  assert.equal(mission.sourceConditions,original("I"));
  assert.equal(mission.sourceVictory,original("L"));
  assert.equal(mission.sourceReentry,original("M"));
  assert.equal(mission.sourceCampaignLink,original("N"));
  assert.equal(mission.pcMaximum,Number(original("G")));
  assert.equal(mission.initialRav,Number(original("H")));
  assert.equal(mission.sourceRewardXpDesign,Number(original("O")));
  assert.equal(mission.sourceProvenance,original("P"));
  assert.equal(mission.sourceCells.length,14);
  assert.equal(mission.tasks.length,3);
  assert.equal(mission.status,"source-faithful-objective-study");
  assert.equal(mission.playableEngine,"single-hunter-physical-simulation-not-full-rts");
 }
 assert.ok(audit.escortedScripts>=8);
});
test("every W3 RTS brief has its own V6 rival detachments and physically distinct initial positions",()=>{
 const profiles=[];
 for(const id of ids){
  const source=api.buildWarRtsMissionV129(id,rules);
  const study=api.createWarRtsMissionStateV129(id,rules);
  assert.ok(source.opponentTeams>=3&&source.opponentTeams<=4,id);
  assert.equal(source.opponentTeams,study.base.enemies.length,id);
  assert.equal(source.opponentUnitIds.length,source.opponentTeams);
  const matching=source.opponentUnitIds.map(u=>rules.units.find(x=>x.id===u));
  assert.ok(matching.every(Boolean),id+" references nonexistent W3 caste");
  assert.equal(source.opponentBudgetPc,matching.reduce((sum,u)=>sum+u.commandPoints,0));
  assert.equal(source.opponentCombatants,matching.reduce((sum,u)=>sum+u.fullMembers,0));
  assert.ok(source.opponentBudgetPc<=source.pcMaximum);
  assert.deepEqual(study.base.enemies.map(e=>e.unitId),source.opponentUnitIds);
  assert.equal(new Set(study.base.enemies.map(e=>coord(e))).size,source.opponentTeams);
  assert.ok(study.base.enemies.every(e=>api.warMapWalkableV128(study.base.map,e)),id+" rival embedded in a wall");
  assert.ok(study.base.enemies.every(e=>!source.tasks.some(task=>coord(task.location)===coord(e))));
  assert.ok(study.base.enemies.every(e=>e.id.startsWith(id+"-RIVAL-")));
  profiles.push(source.opponentUnitIds.join("|"));
 }
 assert.ok(new Set(profiles).size>=20,"rival mixes should meaningfully vary by scenario");
});
test("missions involving human tracks never manufacture a hostile human faction",()=>{
 for(const id of ["W3-RTS11","W3-RTS12","W3-RTS24"]){
  const game=api.createWarRtsMissionStateV129(id,rules);
  assert.ok(game.base.enemies.every(e=>/^W3-U\d\d$/.test(e.unitId)));
  assert.equal(game.tracked?.isNeutral??false,id==="W3-RTS24");
 }
});
test("24 different titles, three distinct source-positioned tasks per mission, no fake city/planet",()=>{
 const plans=ids.map(id=>api.buildWarRtsMissionV129(id,rules));
 assert.equal(new Set(plans.map(v=>v.name)).size,24);
 for(const mission of plans){
  const map=api.createWarSourceMapV128(mission.mapId,rules);
  assert.equal(mission.planetId,map.planetId);
  assert.notEqual(mission.planetId,"earth");
  assert.equal(mission.tasks[2].location.x,map.goal.x);
  assert.equal(mission.tasks[2].location.y,map.goal.y);
  assert.equal(new Set(mission.tasks.map(t=>coord(t.location))).size,3);
  assert.ok(mission.tasks.every(t=>api.warMapWalkableV128(map,t.location)));
  assert.ok(mission.tasks.every(t=>t.title.length>12));
 }
 assert.equal(api.buildWarRtsMissionV129("W3-RTS24",rules).rank,"Elite");
 assert.equal(api.buildWarRtsMissionV129("W3-RTS01",rules).rank,"Blooded");
 assert.throws(()=>api.buildWarRtsMissionV129("W3-RTS25",rules),/inconnue/);
});
test("source-map and task association cannot be tampered into another planet",()=>{
 const clone={...rules,entries:rules.entries.map(e=>e.id==="W3-RTS01"?{
  ...e,fields:e.fields.map(f=>f.column==="C"?{...f,value:"W3-MAP03"}:f)
 }:e)};
 assert.throws(()=>api.buildWarRtsMissionV129("W3-RTS01",clone),/doit référencer/);
});
test("cannot win mission by remote switch, incomplete tasks, invisible guard or simulated teleport",()=>{
 const state=api.createWarRtsMissionStateV129("W3-RTS03",rules);
 const before=JSON.stringify(state);
 assert.equal(command(state,"interact").accepted,false);
 assert.equal(command(state,"observe").accepted,false);
 assert.equal(state.completedTaskIds.length,0);
 assert.equal(JSON.stringify(state),before,"rejected command must preserve immutable snapshot");
 let game={...state,base:{...state.base,player:{
  ...state.base.player,x:state.base.map.goal.x,y:state.base.map.goal.y,observed:true
 },enemies:[]}};
 assert.equal(command(game,"interact").accepted,false,"last step cannot be solved first");
 assert.equal(game.base.report,null);
});
test("hold orders consume real consecutive turns and stepping off breaks the hold",()=>{
 let s=api.createWarRtsMissionStateV129("W3-RTS02",rules);
 const last=s.mission.tasks[2];
 s={...s,completedTaskIds:s.mission.tasks.slice(0,2).map(t=>t.id),
  base:{...s.base,enemies:[],player:{...s.base.player,...last.location,observed:true}}};
 let x=command(s,"interact");
 assert.equal(x.accepted,true);
 assert.equal(x.state.completedTaskIds.length,2);
 assert.equal(x.state.holdProgress,1);
 let moved=command(x.state,"left");
 assert.equal(moved.accepted,true);
 assert.equal(moved.state.holdProgress,0,"movement breaks an uninterrupted hold");
 // The post must be held for three separate ticks, never three instant triggers.
 s={...s,base:{...s.base,player:{...s.base.player,...last.location,observed:true}}};
 for(let i=1;i<=3;i++){
  x=command(s,i===1?"interact":"wait");
  assert.equal(x.accepted,true);
  s=x.state;
  assert.equal(s.completedTaskIds.length,i===3?3:2);
 }
 assert.equal(s.status,"active","holding a post at the far end does not replace extraction");
});
test("vacuum pressure and power can disable the right W3 devices without blocking alternate corridors",()=>{
 let state=api.createWarRtsMissionStateV129("W3-RTS23",rules);
 const third=state.mission.tasks[2];
 state={...state,completedTaskIds:state.mission.tasks.slice(0,2).map(t=>t.id),
  base:{...state.base,enemies:[],player:{...state.base.player,...third.location,observed:true}}};
 assert.equal(state.base.airlockStable,false);
 assert.match(command(state,"interact").message,/pression/i);
 const stable=command(state,"stabilize");
 assert.equal(stable.accepted,true,stable.message);
 assert.equal(command(stable.state,"interact").accepted,true);
 let power=api.createWarRtsMissionStateV129("W3-RTS19",rules);
 power={...power,completedTaskIds:power.mission.tasks.slice(0,2).map(t=>t.id),
  base:{...power.base,power:false,enemies:[],
   player:{...power.base.player,...power.mission.tasks[2].location,observed:true}}};
 assert.equal(command(power,"interact").accepted,false);
 assert.equal(command(power,"power").accepted,true);
});
test("companion is placed at a real source tile, never duplicates, then walks one tile per tick",()=>{
 let state=api.createWarRtsMissionStateV129("W3-RTS09",rules);
 assert.ok(state.tracked);
 assert.equal(state.tracked.secured,false);
 const spawn={x:state.tracked.x,y:state.tracked.y};
 let x=command(state,"wait");
 assert.equal(x.accepted,true);
 assert.deepEqual({x:x.state.tracked.x,y:x.state.tracked.y},spawn,
  "the unrescued survivor cannot spawn by the player");
 const tasks=state.mission.tasks;
 state={...state,completedTaskIds:[tasks[0].id],
  base:{...state.base,enemies:[],player:{...state.base.player,...tasks[1].location,observed:true}}};
 x=command(state,"interact");
 assert.equal(x.accepted,true,x.message);
 assert.equal(x.state.tracked.secured,true);
 const before={...x.state.tracked};
 const next=command(x.state,"right");
 if(next.accepted)assert.ok(dist(before,next.state.tracked)<=1,"wounded never teleports after pickup");
});
test("24 source missions all allow physical full-round-trip victory in a civilian-safe lab",()=>{
 const results=ids.map(id=>fullMission(id));
 assert.equal(results.filter(v=>v.status==="victory").length,24);
 const receipts=results.map(v=>v.base.report.id);
 assert.equal(new Set(receipts).size,24);
 assert.ok(receipts.every(r=>r.startsWith("RECEIPT-W129-W3-RTS")));
});
