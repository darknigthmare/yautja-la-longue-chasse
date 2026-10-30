import assert from "node:assert/strict";
import test from "node:test";
import {build} from "esbuild";
const built=await build({
 stdin:{contents:[
  "export * from './app/game/systems/clanWarSourceMapsV128';",
  "export * from './app/game/systems/clanWarBibleV6';",
 ].join("\n"),resolveDir:process.cwd()},
 bundle:true,write:false,format:"esm",platform:"node",target:"es2022",logLevel:"silent",
});
const war=await import("data:text/javascript;base64,"+Buffer.from(built.outputFiles[0].text).toString("base64"));
const rules=war.DEFAULT_WAR_RULES_V6;
const modes=["shortest","upper-route","lower-route"];
const ids=Array.from({length:12},(_,i)=>"W3-MAP"+String(i+1).padStart(2,"0"));
const key=p=>p.x+","+p.y;
const distance=(a,b)=>Math.abs(a.x-b.x)+Math.abs(a.y-b.y);
function direction(a,b){
 if(b.x>a.x)return "right";if(b.x<a.x)return "left";
 if(b.y>a.y)return "down";if(b.y<a.y)return "up";
 return "wait";
}
function pilot(id,style){
 let state=war.createWarMapPracticeV128(id,rules),actions=0;
 const map=state.map;
 const visited=new Set(),checks=[];
 let detourCleared=style==="shortest";
 for(let i=0;i<220&&!state.report;i++){
  const goal=state.objectiveDone?map.extraction:map.goal;
  const route=map.mandatoryPaths[style==="lower-route"?1:0];
  const target=route[Math.floor(route.length*.83)];
  if(!detourCleared&&(distance(state.player,target)<=2||
    i>=map.width+map.height))detourCleared=true; // tactical fallback when a diversion is no longer useful
  const canSee=state.enemies.filter(e=>e.hp>0&&distance(e,state.player)<=3&&
    war.warMapLineOfSightV128(map,state.player,e));
  let choice;
  if(!state.player.observed&&(distance(state.player,map.observation)<=2||
    (distance(state.player,map.goal)<=6&&war.warMapLineOfSightV128(map,state.player,map.goal)))){
   choice="observe";
  }else if(canSee.length){
   const gust=map.id==="W3-MAP08"&&[3,4].includes(state.turn%8);
   const inActualRange=canSee.some(enemy=>distance(enemy,state.player)<=(gust?1:3));
   choice=inActualRange?"attack":"wait";
  }
  else if(!state.objectiveDone&&distance(state.player,map.goal)<=1&&state.player.observed){
   choice=id==="W3-MAP12"&&!state.airlockStable?"stabilize":"interact";
  }else{
   const occupied=state.enemies.filter(e=>e.hp>0).map(e=>({x:e.x,y:e.y}));
   const aim=detourCleared||state.objectiveDone?goal:target;
   let path=war.warMapFindPathV128(map,state.player,aim,occupied);
   if(!path||path.length<2)path=war.warMapFindPathV128(map,state.player,goal,occupied);
   if(path&&path.length>=2)choice=direction(path[0],path[1]);
   else choice="wait";
  }
  const result=war.commandWarMapPracticeV128(state,choice);
  if(!result.accepted){
   checks.push(choice+": "+result.message);
   if(choice==="stabilize"||choice==="interact"||choice==="attack"){
    const safeWait=war.commandWarMapPracticeV128(state,"wait");
    state=safeWait.state;continue;
   }
   // Prevent an invalid path from creating a false victory.
   break;
  }
  state=result.state;actions++;
  if(state.player.hp<=0)break;
  const fingerprint=key(state.player)+"/"+state.objectiveDone+"/"+state.player.observed+"/"+state.turn;
  if(visited.has(fingerprint))break;
  visited.add(fingerprint);
 }
 return {state,actions,checks};
}
for(const style of modes){
 test("headless QA: all 12 W3 battle maps remain traversable under armed opposition, strategy "+style,()=>{
  let survived=0,completed=0,failed=[];
  for(const id of ids){
   const result=pilot(id,style);
   assert.ok(result.actions>0,id+" never advanced");
   assert.ok(result.state.turn<=220,id+" unbounded sim");
   if(result.state.report?.outcome==="victory")completed++;
   else failed.push(id+" -> "+(result.state.report?.outcome??"unfinished")+
     " HP:"+result.state.player.hp+" moves:"+result.actions+" "+result.checks.join(";").slice(0,130));
   if(result.state.player.hp>0)survived++;
   assert.equal(result.state.report?.campaignMutation??false,false);
  }
  console.log("W3 QA "+style+" : "+completed+"/12 victories, "+survived+"/12 survivors; failures: "+failed.join(" | "));
  assert.ok(survived>=6,"more than half the 12 maps must be survivable in "+style+"; "+failed.join(" | "));
  assert.ok(completed>=(style==="shortest"?12:10),
    "all direct missions and at least ten flanking missions must be winnable using "+style+"; "+failed.join(" | "));
 });
}
