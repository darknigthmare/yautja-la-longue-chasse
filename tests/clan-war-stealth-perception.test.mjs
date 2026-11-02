import assert from "node:assert/strict";
import test from "node:test";
import {build} from "esbuild";

const bundle=await build({stdin:{contents:[
 "export * from './app/game/systems/clanWarOperationsV115';",
 "export * from './app/game/systems/clanWarStealthDecoyV141';",
 "export * from './app/game/systems/clanWarMissionTerrainV116';",
 "export * from './app/game/systems/clanWarBibleV6';",
].join("\n"),resolveDir:process.cwd()},bundle:true,write:false,
 platform:"node",format:"esm",target:"es2022",logLevel:"silent"});
const api=await import("data:text/javascript;base64,"+Buffer.from(bundle.outputFiles[0].text).toString("base64"));
const rules=api.DEFAULT_WAR_RULES_V6;
const position=p=>`${p.x},${p.y}`;

function scenario({second=false,cloak=false,hide=false,visible=false}={}){
 const base=api.createWarOperationsV115(rules),team=base.teams[0].id;
 const site=rules.territories.find(t=>t.id!==base.baseId&&!api.warMissionEligibleV115(base,rules,t.id,[team]));
 const launch=api.beginWarOperationV115(base,"stealth",site.id,[team],rules,1000);
 assert.equal(launch.accepted,true,launch.message);
 const terrain=api.warMissionTerrainV116(site.id,rules),guardCells=[],players=[];
 for(let y=0;y<terrain.height;y++)for(let x=0;x<terrain.width;x++){
  if(api.warTerrainCellBlockedV116(terrain,x,y))continue;
  players.push({x,y});if(x>=4&&x<=7&&y>=1&&y<=3)guardCells.push({x,y});
 }
 for(const g of guardCells)for(const p of players){
  const dist=Math.abs(p.x-g.x)+Math.abs(p.y-g.y);
  if(cloak||hide||visible){
   if(!(p.y===g.y&&dist===2))continue;
   if(hide&&!terrain.cover.includes(position(p)))continue;
  }else if(!(p.x!==g.x&&p.y!==g.y&&dist<=3))continue;
  if(!api.warTerrainLineOfSightV116(terrain,g,p))continue;
  for(const memory of players){
   const guard={guardX:g.x,guardY:g.y,guardDirection:1};
   const regular=api.warStealthDecoyPatrolV141(terrain,guard,null);
   const expected=api.warStealthDecoyPatrolV141(terrain,guard,memory);
   if(regular.guardX===expected.guardX&&regular.guardY===expected.guardY)continue;
   const support=second?guardCells.find(q=>position(q)!==position(g)&&
    position(q)!==`${expected.guardX},${expected.guardY}`&&
    position(q)!==`${regular.guardX},${regular.guardY}`):null;
   if(second&&!support)continue;
   const s={...launch.state,active:{...launch.state.active,stealth:{
    ...launch.state.active.stealth,...p,guardX:g.x,guardY:g.y,guardDirection:1,
    cloaked:cloak,energy:hide?4:5,guardInvestigation:{...memory,turns:2},
    ...(support?{supportGuard:{...support,direction:-1},reinforcementIssued:true}:{})}}};
   if(api.readWarOperationsV115(JSON.stringify(s),rules))return {state:s,expected,regular};
  }
 }
 assert.fail("No valid source-terrain scenario distinguishes patrol from investigation");
}

for(const [name,options] of [["diagonal",{}],["diagonal with second guard",{second:true}],["cloaked",{cloak:true}],["concealed by cover",{hide:true}]]){
 test(`lost ${name} contact follows the last observed tile`,()=>{
  const {state,expected}=scenario(options);
  const result=api.commandStealthV115(state,options.hide?"hide":"wait",rules);
  assert.equal(result.accepted,true,result.message);
  const after=result.state.active.stealth;
  assert.deepEqual({x:after.guardX,y:after.guardY},{x:expected.guardX,y:expected.guardY});
  if(options.second){
   const before=state.active.stealth.supportGuard, support=after.supportGuard;
   assert.ok(support,"the support guard remains present");
   assert.ok(Math.abs(support.x-before.x)+Math.abs(support.y-before.y)<=1,
    "the support guard does not teleport");
   assert.notEqual(`${support.x},${support.y}`,`${after.guardX},${after.guardY}`,
    "the two guards cannot occupy the same tile");
  }
 });
}
test("still-visible contact keeps the ordinary patrol rather than chasing stale memory",()=>{
 const {state,regular}=scenario({visible:true});
 const result=api.commandStealthV115(state,"wait",rules);
 assert.equal(result.accepted,true,result.message);
 assert.deepEqual({x:result.state.active.stealth.guardX,y:result.state.active.stealth.guardY},
  {x:regular.guardX,y:regular.guardY});
});
