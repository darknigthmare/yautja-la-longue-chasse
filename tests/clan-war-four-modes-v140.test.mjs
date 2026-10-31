import assert from "node:assert/strict";
import test from "node:test";
import {build} from "esbuild";

const compiled=await build({stdin:{contents:[
 "export * from './app/game/systems/clanWarOperationsV115';",
 "export * from './app/game/systems/clanWarParallelModesV137';",
 "export * from './app/game/systems/clanWarOuterRouteProgressV140';",
 "export * from './app/game/systems/clanWarStealthPatrolV140';",
 "export * from './app/game/systems/clanWarRtsSquadsV133';",
 "export * from './app/game/systems/clanWarRtsSourceMissionsV129';",
 "export * from './app/game/systems/clanWarBibleV6';",
 "export * from './app/game/systems/clanWarMissionTerrainV116';",
].join("\n"),resolveDir:process.cwd()},bundle:true,write:false,
 platform:"node",format:"esm",target:"es2022",logLevel:"silent"});
const api=await import("data:text/javascript;base64,"+Buffer.from(compiled.outputFiles[0].text).toString("base64"));
const rules=api.DEFAULT_WAR_RULES_V6;
const dist=(a,b)=>Math.abs(a.x-b.x)+Math.abs(a.y-b.y);
const start=(mode)=>{
 const base=api.createWarOperationsV115(rules),team=base.teams[0].id;
 const target=rules.territories.find(t=>t.id!==base.baseId&&!api.warMissionEligibleV115(base,rules,t.id,[team]));
 assert.ok(target,"an actually reachable V6 source territory must exist");
 const launched=api.beginWarOperationV115(base,mode,target.id,[team],rules,1000);
 assert.equal(launched.accepted,true,mode+": "+launched.message);
 return {s:launched.state,team,target:target.id};
};
const tactical=(id="W3-RTS01")=>{
 const state=api.launchWarRtsSquadsV133(api.createWarRtsSquadsV133(id,rules));
 assert.equal(state.accepted,true,state.message);
 return state.state;
};

test("Assault: all regional profiles use only distinct source W3 teams and finite authored wave caps",()=>{
 const regions=new Set();
 for(const t of rules.territories){
  const one=api.warAssaultWaveProfileV140(t.id,rules);
  const two=api.warAssaultWaveProfileV140(t.id,rules);
  assert.deepEqual(one,two,"non-deterministic source roster");
  assert.equal(one.regionId,t.region);
  assert.ok(one.maximumWaves>=6&&one.maximumWaves<=9);
  assert.ok(one.unitIds.length>=1&&one.unitIds.length<=4);
  assert.equal(new Set(one.unitIds).size,one.unitIds.length);
  assert.ok(one.unitIds.every(id=>rules.units.some(u=>u.id===id&&u.fullMembers>0&&u.commandPoints>0)));
  regions.add(t.region);
 }
 assert.ok(regions.size>=6,"six distinct W3 source regions must remain available");
});

test("Assault: a real V6 wave arrives on cadence, once, without overlapping live entry",()=>{
 const {s,target}=start("assault"),profile=api.warAssaultWaveProfileV140(target,rules);
 const staged={...s,active:{...s.active,tick:7,assault:{
  ...s.active.assault,actors:[],wavesIssued:0,ap:90,ownBase:80,rivalBase:80}}};
 const next=api.stepAssaultV115(staged,rules);
 assert.equal(next.accepted,true,next.message);
 assert.equal(next.state.active.tick,8);
 const field=next.state.active.assault;
 assert.equal(field.wavesIssued,1);
 assert.equal(field.actors.filter(a=>a.side==="rival").length,1);
 assert.ok(profile.unitIds.includes(field.actors.find(a=>a.side==="rival").unitId));
 assert.ok(api.readWarOperationsV115(JSON.stringify(next.state),rules));
 const occupied={...staged,active:{...staged.active,assault:{...staged.active.assault,
  actors:[{id:"preexisting-rival",teamId:null,unitId:profile.unitIds[0],side:"rival",x:95,hp:9}]}}};
 const blocked=api.stepAssaultV115(occupied,rules);
 assert.equal(blocked.accepted,true);
 assert.equal(blocked.state.active.assault.wavesIssued,0,"source entry should not clone on an occupied tile");
 const forged={...next.state,active:{...next.state.active,
  assault:{...field,rivalRosterIds:["alien-non-source"],wavesIssued:25}}};
 assert.equal(api.readWarOperationsV115(JSON.stringify(forged),rules),null);
});

test("Assault: source profiles persist and finite wave counter never exceeds regional maximum",()=>{
 const {s,target}=start("assault"),max=api.warAssaultWaveProfileV140(target,rules).maximumWaves;
 let state={...s,active:{...s.active,assault:{...s.active.assault,ap:100}}};
 for(let i=0;i<88;i++){
  const stepped=api.stepAssaultV115(state,rules);
  assert.equal(stepped.accepted,true,stepped.message);
  state=stepped.state;
  if(!state.active)break;
  assert.ok((state.active.assault.wavesIssued??0)<=max);
  assert.ok(state.active.assault.actors.filter(a=>a.side==="rival"&&a.hp>0).length<=7);
  assert.ok(state.active.assault.actors.filter(a=>a.side==="rival")
    .every(a=>state.active.assault.rivalRosterIds.includes(a.unitId)));
 }
});

test("Outer Ops: active progress displays only true V6 passage names and never a hidden garrison",()=>{
 const {s}=start("outer"),order=s.outer[0];
 assert.ok(order.routeIds.length>0);
 const a=api.warOuterRouteProgressV140(order,order.startedAt,rules);
 const b=api.warOuterRouteProgressV140(order,Math.floor((order.startedAt+order.dueAt)/2),rules);
 const end=api.warOuterRouteProgressV140(order,order.dueAt,rules);
 assert.equal(a.phase,"outbound");assert.equal(a.legProgress,0);
 assert.equal(end.phase,"arrived");assert.equal(end.currentPassageId,null);
 assert.equal(end.legProgress,1);
 assert.ok(b.legProgress>=a.legProgress);
 for(const p of [a,b]){
  assert.ok(order.routeIds.includes(p.currentPassageId));
  assert.equal(p.currentPassageName,rules.passages.find(v=>v.id===p.currentPassageId).name);
  assert.ok(!("enemyId" in p)&&!("outcome" in p)&&!("enemyCoordinates" in p));
  assert.ok(p.visitedPassageIds.every(id=>order.routeIds.includes(id)));
 }
});

test("Outer Ops: a halt actually pauses passage travel and recalled teams traverse source IDs back",()=>{
 const {s}=start("outer"),original=s.outer[0];
 const halted=api.orderWarOuterReconHaltV137(s,original.id,original.startedAt+200,rules);
 assert.equal(halted.accepted,true,halted.message);
 const h=halted.state.outer[0];
 assert.equal(h.dueAt,original.dueAt+15000);
 const before=api.warOuterRouteProgressV140(h,h.reconHalt.orderedAt,rules);
 const during=api.warOuterRouteProgressV140(h,h.reconHalt.orderedAt+10000,rules);
 assert.equal(before.legProgress,during.legProgress,"halt moved an Outer Ops vehicle");
 const extended=api.warOuterRouteProgressV140(h,original.dueAt,rules);
 assert.ok(extended.legProgress<1,"early report should not claim arrival");
 const reached=api.warOuterRouteProgressV140(h,h.dueAt,rules);
 assert.equal(reached.phase,"arrived");
 const recalled=api.recallWarOuterMissionV116(halted.state,h.id,h.startedAt+2000,rules);
 assert.equal(recalled.accepted,true,recalled.message);
 const rec=recalled.state.outer[0];
 const retreat=api.warOuterRouteProgressV140(rec,rec.recall.orderedAt+1,rules);
 assert.equal(retreat.phase,"returning");
 assert.ok(rec.routeIds.includes(retreat.currentPassageId));
 assert.ok(retreat.visitedPassageIds.every(id=>rec.routeIds.includes(id)));
 assert.equal(api.warOuterRouteProgressV140(rec,rec.dueAt,rules).phase,"arrived");
 assert.deepEqual(recalled.state.outer[0].teamIds,h.teamIds,"no invented crew");
});

test("Infiltration: all 6 W3 regions spawn guards on walkable ground, patrol one tile and avoid all walls",()=>{
 const regions=new Set();
 for(const site of rules.territories){
  const terrain=api.warMissionTerrainV116(site.id,rules);
  regions.add(site.region);
  let pos=api.warStealthPatrolSpawnV140(terrain);
  assert.equal(api.warTerrainCellBlockedV116(terrain,pos.guardX,pos.guardY),false,site.id);
  for(let turn=0;turn<28;turn++){
   const before={x:pos.guardX,y:pos.guardY};
   const next=api.warStealthPatrolStepV140(terrain,pos);
   assert.ok(dist(before,{x:next.guardX,y:next.guardY})<=1,
     site.id+" guard teleported at turn "+turn);
   assert.equal(api.warTerrainCellBlockedV116(terrain,next.guardX,next.guardY),false,
     site.id+" guard stepped inside wall");
   assert.ok(next.guardX>=4&&next.guardX<=7&&next.guardY>=1&&next.guardY<=3);
   pos=next;
  }
 }
 assert.ok(regions.size>=6);
});

test("Infiltration: old legacy patrol inside a wall makes one legal step and saved guardY remains optional",()=>{
 const sites=rules.territories.filter(t=>t.region==="W3-KR04");
 assert.ok(sites.length,"source shoreline theatre missing");
 const terrain=api.warMissionTerrainV116(sites[0].id,rules);
 assert.equal(api.warTerrainCellBlockedV116(terrain,6,2),true);
 const recovered=api.warStealthPatrolStepV140(terrain,{guardX:6,guardY:2,guardDirection:-1});
 assert.ok(dist({x:6,y:2},{x:recovered.guardX,y:recovered.guardY})<=1);
 assert.equal(api.warTerrainCellBlockedV116(terrain,recovered.guardX,recovered.guardY),false);
 const {s}=start("stealth");
 const legacy={...s,active:{...s.active,stealth:{...s.active.stealth}}};
 delete legacy.active.stealth.guardY;
 assert.ok(api.readWarOperationsV115(JSON.stringify(legacy),rules),"prior V115 save must continue loading");
 const advanced=api.commandStealthV115(legacy,"wait",rules);
 assert.equal(advanced.accepted,true,advanced.message);
 assert.equal(api.warTerrainCellBlockedV116(api.warMissionTerrainV116(legacy.active.targetId,rules),
  advanced.state.active?.stealth.guardX,advanced.state.active?.stealth.guardY),false);
});

test("RTS: environmental hazard hits real active enemy and ally on the same world tick",()=>{
 const all=api.WAR_SOURCE_RTS_IDS_V129.map(id=>tactical(id));
 const s=all.find(v=>v.map.hazards.length>0);
 assert.ok(s,"at least one W3 source hazard map required");
 const tile=s.map.hazards[0],first=s.squads[0],enemy=s.enemies[0];
 const rival={...enemy,x:tile.x,y:tile.y,hp:9,status:"active"};
 const safe={...s,enemies:[rival],turn:2,
   squads:s.squads.map(u=>u.id===first.id?{...u,x:s.map.start.x,y:s.map.start.y}:u)};
 const next=api.commandWarRtsSquadsV133(safe,{kind:"wait",squadId:first.id});
 assert.equal(next.accepted,true,next.message);
 assert.equal(next.state.turn,3);
 assert.equal(next.state.enemies[0].hp,7,"rival received same hazard as a hunter");
 assert.equal(safe.enemies[0].hp,9);
 const ally={...s,turn:2,enemies:[],
   squads:s.squads.map(u=>u.id===first.id?{...u,x:tile.x,y:tile.y}:u)};
 const wounded=api.commandWarRtsSquadsV133(ally,{kind:"wait",squadId:first.id});
 assert.equal(wounded.accepted,true);
 assert.equal(wounded.state.squads[0].hp,first.hp-2,"ally hazard should remain consistent");
 assert.equal(wounded.state.report,null);
});

test("RTS: environment preview gives only source window, not an enemy position",()=>{
 for(const id of api.WAR_SOURCE_RTS_IDS_V129){
  const s=tactical(id),forecast=api.warRtsEnvironmentalWindowV140({...s,turn:2});
  assert.equal(forecast.nextTurn,3);
  assert.equal(forecast.activeNextTurn,true);
  assert.equal(forecast.mapId,s.map.id);
  assert.equal(forecast.worldStratum,s.map.worldStratum);
  assert.equal(forecast.hazardTileCount,s.map.hazards.length);
  assert.equal("enemyId" in forecast,false);
  assert.equal("enemyLocation" in forecast,false);
 }
});

test("Source boundary: no V85 mutation, all 24 scripts and 72 objectives remain",()=>{
 const audit=api.auditWarRtsSquadsV133(rules);
 assert.equal(audit.missions,24);assert.equal(audit.steps,72);
 assert.deepEqual(audit.issues,[]);
 const a=api.createWarOperationsV115(rules);
 assert.equal(a.context,"free");assert.equal(a.reports.length,0);
 assert.equal(Object.keys(a.pressure).length,0);
});
