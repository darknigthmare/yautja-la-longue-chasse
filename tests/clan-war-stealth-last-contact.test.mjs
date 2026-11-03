import assert from "node:assert/strict";
import test from "node:test";
import {build} from "esbuild";

const built=await build({stdin:{contents:[
 "export * from './app/game/systems/clanWarOperationsV115';",
 "export * from './app/game/systems/clanWarStealthPatrolV140';",
 "export * from './app/game/systems/clanWarMissionTerrainV116';",
 "export * from './app/game/systems/clanWarBibleV6';",
].join("\n"),resolveDir:process.cwd()},bundle:true,write:false,
 platform:"node",format:"esm",target:"es2022",logLevel:"silent"});
const api=await import("data:text/javascript;base64,"+Buffer.from(built.outputFiles[0].text).toString("base64"));
const rules=api.DEFAULT_WAR_RULES_V6;
const coord=p=>`${p.x},${p.y}`;
function mission(){
 const state=api.createWarOperationsV115(rules),team=state.teams[0].id;
 const site=rules.territories.find(t=>t.id!==state.baseId&&
  !api.warMissionEligibleV115(state,rules,t.id,[team]));
 const started=api.beginWarOperationV115(state,"stealth",site.id,[team],rules,1000);
 assert.equal(started.accepted,true,started.message);
 return started.state;
}
function actualContact(){
 const initial=mission();
 for(const territory of rules.territories){
  const terrain=api.warMissionTerrainV116(territory.id,rules),guard=api.warStealthPatrolSpawnV140(terrain);
  const adjacent=[{x:guard.guardX-1,y:guard.guardY},{x:guard.guardX+1,y:guard.guardY},
   {x:guard.guardX,y:guard.guardY-1},{x:guard.guardX,y:guard.guardY+1}]
   .find(p=>!api.warTerrainCellBlockedV116(terrain,p.x,p.y));
  if(!adjacent)continue;
  const staged={...initial,active:{...initial.active,targetId:territory.id,
   stealth:{...initial.active.stealth,...adjacent,...guard,alarm:0,cloaked:false,energy:5}}};
  const result=api.commandStealthV115(staged,"wait",rules);
  if(result.accepted&&result.state.active?.stealth?.guardInvestigation)return {state:result.state,terrain};
 }
 assert.fail("A source W3 region needs a real observed contact");
}
test("primary guard investigates its last real sighting, not the hidden hunter's current location",()=>{
 const {state,terrain}=actualContact(),memo=state.active.stealth.guardInvestigation;
 assert.deepEqual(memo,{x:state.active.stealth.x,y:state.active.stealth.y,turns:2});
 assert.ok(api.readWarOperationsV115(JSON.stringify(state),rules));
 const free=[];
 for(let y=0;y<=5;y++)for(let x=0;x<=8;x++)
  if(!api.warTerrainCellBlockedV116(terrain,x,y))free.push({x,y});
 const hidden=free.slice(0,2).map(p=>({...state,active:{...state.active,stealth:{
  ...state.active.stealth,...p,cloaked:true,energy:5}}}));
 assert.equal(hidden.length,2);
 const [a,b]=hidden.map(s=>api.commandStealthV115(s,"wait",rules));
 assert.equal(a.accepted,true);assert.equal(b.accepted,true);
 assert.equal(coord({x:a.state.active.stealth.guardX,y:a.state.active.stealth.guardY}),
  coord({x:b.state.active.stealth.guardX,y:b.state.active.stealth.guardY}));
 assert.equal(a.state.active.stealth.guardInvestigation?.turns,1);
 assert.equal(b.state.active.stealth.guardInvestigation?.turns,1);
});
test("PR55 investigation survives reload and invalid records are rejected",()=>{
 const {state}=actualContact(),raw=JSON.stringify(state),loaded=api.readWarOperationsV115(raw,rules);
 assert.deepEqual(loaded.active.stealth.guardInvestigation,state.active.stealth.guardInvestigation);
 for(const invalid of [{x:999,y:2,turns:1},{x:1,y:4,turns:0},{x:1,y:4,turns:3},{x:1,y:4,turns:"2"}]){
  const bad={...state,active:{...state.active,stealth:{...state.active.stealth,guardInvestigation:invalid}}};
  assert.equal(api.readWarOperationsV115(JSON.stringify(bad),rules),null);
 }
 const legacy=mission();delete legacy.active.stealth.guardInvestigation;
 assert.ok(api.readWarOperationsV115(JSON.stringify(legacy),rules));
});
test("an active sound decoy takes priority over the guard's stored sighting",()=>{
 const {state,terrain}=actualContact();
 const points=[];
 for(let y=0;y<=5;y++)for(let x=0;x<=8;x++)
  if(!api.warTerrainCellBlockedV116(terrain,x,y))points.push({x,y});
 const choices=points.slice(0,2).map(p=>({...state,active:{...state.active,stealth:{
  ...state.active.stealth,x:1,y:4,cloaked:true,energy:5,decoyUsed:true,
  decoyX:3,decoyY:4,decoyTurns:2,guardInvestigation:{...p,turns:2}}}}));
 const [a,b]=choices.map(s=>api.commandStealthV115(s,"wait",rules));
 assert.equal(a.accepted,true);assert.equal(b.accepted,true);
 assert.equal(coord({x:a.state.active.stealth.guardX,y:a.state.active.stealth.guardY}),
  coord({x:b.state.active.stealth.guardX,y:b.state.active.stealth.guardY}));
});
test("contact seen only by the second guard never creates a first-guard memory",()=>{
 const base=mission(),terrain=api.warMissionTerrainV116(base.active.targetId,rules),guards=[],players=[];
 for(let y=0;y<=5;y++)for(let x=0;x<=8;x++)if(!api.warTerrainCellBlockedV116(terrain,x,y)){
  players.push({x,y});if(x>=4&&x<=7&&y>=1&&y<=3)guards.push({x,y});
 }
 for(const first of guards)for(const second of guards){
  if(coord(first)===coord(second))continue;
  for(const player of players){
   if(coord(player)===coord(first)||coord(player)===coord(second))continue;
   const staged={...base,active:{...base.active,stealth:{...base.active.stealth,
    ...player,guardX:first.x,guardY:first.y,guardDirection:-1,
    supportGuard:{...second,direction:-1},reinforcementIssued:true,alarm:0}}};
   const result=api.commandStealthV115(staged,"wait",rules);
   const out=result.state.active?.stealth;
   if(result.accepted&&out?.alarm===1&&!out.guardInvestigation){
    assert.ok(out.supportGuard,"the witnessing second guard remains present");
    return;
   }
  }
 }
 assert.fail("No source-terrain scenario with contact observed by the second guard alone");
});
