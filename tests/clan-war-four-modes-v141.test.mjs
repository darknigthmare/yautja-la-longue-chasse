import assert from "node:assert/strict";
import test from "node:test";
import {build} from "esbuild";
const packed=await build({stdin:{contents:[
 "export * from './app/game/systems/clanWarAssaultContactV141';",
 "export * from './app/game/systems/clanWarOuterWeightedProgressV141';",
 "export * from './app/game/systems/clanWarStealthDecoyV141';",
 "export * from './app/game/systems/clanWarOperationsV115';",
 "export * from './app/game/systems/clanWarRtsSquadsV133';",
 "export * from './app/game/systems/clanWarMissionTerrainV116';",
 "export * from './app/game/systems/clanWarStealthPatrolV140';",
 "export * from './app/game/systems/clanWarSourceMapsV128';",
 "export * from './app/game/systems/clanWarBibleV6';",
 "export * from './app/game/systems/clanWarRtsSourceMissionsV129';",
 ].join("\n"),resolveDir:process.cwd()},bundle:true,write:false,
 format:"esm",platform:"node",target:"es2022",logLevel:"silent"});
const api=await import("data:text/javascript;base64,"+Buffer.from(packed.outputFiles[0].text).toString("base64"));
const rules=api.DEFAULT_WAR_RULES_V6;
const coord=p=>p.x+","+p.y;
const distance=(a,b)=>Math.abs(a.x-b.x)+Math.abs(a.y-b.y);
const start=mode=>{
 const base=api.createWarOperationsV115(rules),id=base.teams[0].id;
 const target=rules.territories.find(t=>t.id!==base.baseId&&
  !api.warMissionEligibleV115(base,rules,t.id,[id]));
 assert.ok(target);
 const begun=api.beginWarOperationV115(base,mode,target.id,[id],rules,1000);
 assert.equal(begun.accepted,true,begun.message);
 return {state:begun.state,id,site:target.id};
};
const sourceRts=(id="W3-RTS01")=>{
 const result=api.launchWarRtsSquadsV133(api.createWarRtsSquadsV133(id,rules));
 assert.equal(result.accepted,true,result.message);
 return result.state;
};

test("Assault V141: simultaneous combat does not let the array's first fighter kill before a riposte",()=>{
 const unit=rules.units.find(u=>u.fullMembers>0&&u.commandPoints>0);
 assert.ok(unit);
 const a={id:"ALLY",teamId:"W3-team",side:"ally",unitId:unit.id,x:40,hp:2};
 const b={id:"RIVAL",teamId:null,side:"rival",unitId:unit.id,x:42,hp:2};
 const result=api.warAssaultContactV141([a,b],rules,{},1);
 const reverse=api.warAssaultContactV141([b,a],rules,{},1);
 assert.deepEqual(result.actors.map(u=>[u.id,u.hp]).sort(),reverse.actors.map(u=>[u.id,u.hp]).sort());
 assert.deepEqual(result.actors.map(u=>u.hp),[0,0],"both physically fired within same tick");
 assert.equal(result.shots.length,2);
 assert.equal(result.ownBaseDamage,0);
 assert.equal(result.rivalBaseDamage,0);
 assert.equal(a.hp,2,"original roster remains immutable");
});

test("Assault V141: movement never crosses a living rival, stays in side boundaries, and respects hold",()=>{
 const unit=rules.units.find(u=>u.fullMembers>0&&u.commandPoints>0);
 const ally={id:"a",teamId:"t",side:"ally",unitId:unit.id,x:32,hp:11};
 const rival={id:"r",teamId:null,side:"rival",unitId:unit.id,x:47,hp:11};
 const far=api.warAssaultContactV141([ally,rival],rules,{},2);
 assert.ok(far.actors.find(u=>u.id==="a").x<far.actors.find(u=>u.id==="r").x);
 assert.ok(far.advancements.every(m=>Math.abs(m.to-m.from)<=5));
 const held=api.warAssaultContactV141([ally,rival],rules,{t:5},2);
 assert.equal(held.actors.find(u=>u.id==="a").x,32);
 const base={...ally,x:93};
 const delivered=api.warAssaultContactV141([base],rules,{},2);
 assert.ok(delivered.rivalBaseDamage>0);
 assert.ok(delivered.actors.every(u=>u.x<=94));
});

test("Assault V141: source V140 regional waves and V115 receipt still function after synchronous exchange",()=>{
 const {state}=start("assault"),s={...state,active:{...state.active,tick:7,
  assault:{...state.active.assault,ap:100,rivalRosterIds:
   api.warAssaultWaveProfileV140(state.active.targetId,rules).unitIds,wavesIssued:0}}};
 const stepped=api.stepAssaultV115(s,rules);
 assert.equal(stepped.accepted,true,stepped.message);
 assert.equal(stepped.state.active.assault.wavesIssued,1);
 assert.ok(api.readWarOperationsV115(JSON.stringify(stepped.state),rules));
 assert.equal(stepped.state.rav,s.rav);
});

test("Outer Ops V141: source movementCost rather than equal passage slots controls segment position",()=>{
 const passages=rules.passages.filter(v=>v.movementCost>0).slice(0,2);
 assert.equal(passages.length,2);
 const ids=passages.map(p=>p.id);
 const weighted={...rules,passages:rules.passages.map(p=>({...p,
  movementCost:p.id===ids[0]?1:p.id===ids[1]?19:p.movementCost}))};
 const order={id:"O141",targetId:rules.territories[1].id,teamIds:[],focus:"recon",
  routeIds:ids,startedAt:1000,dueAt:11000};
 const point=api.warOuterWeightedProgressV141(order,4000,weighted);
 assert.equal(point.phase,"outbound");
 assert.equal(point.legProgress,.3);
 assert.equal(point.currentPassageId,ids[1],"short first passage already complete");
 assert.deepEqual(point.visitedPassageIds,[ids[0]]);
 assert.equal(point.currentMovementCost,19);
 assert.ok(point.currentPassageProgress>.2&&point.currentPassageProgress<.3);
 assert.equal(point.totalWeight,20);
 assert.ok(!("enemyId" in point)&&!("outcome" in point));
});

test("Outer Ops V141: recall reverses only reached passages; earlier halt costs real time",()=>{
 const [p0,p1]=rules.passages.slice(0,2);
 const costs={...rules,passages:rules.passages.map(p=>({...p,
  movementCost:p.id===p0.id?2:p.id===p1.id?18:p.movementCost}))};
 const mission={id:"O141",targetId:rules.territories[1].id,teamIds:[],
  routeIds:[p0.id,p1.id],focus:"recon",startedAt:1000,dueAt:11000};
 const paused={...mission,dueAt:26000,reconHalt:{
  orderedAt:2000,originalDueAt:11000,extraMs:15000}};
 const before=api.warOuterWeightedProgressV141(paused,2000,costs);
 const during=api.warOuterWeightedProgressV141(paused,12500,costs);
 assert.equal(before.legProgress,during.legProgress,"field halt advanced for free");
 const recalled={...mission,recall:{orderedAt:1200,originalDueAt:11000},dueAt:3000};
 const current=api.warOuterWeightedProgressV141(recalled,1201,costs);
 assert.equal(current.phase,"returning");
 assert.equal(current.currentPassageId,p0.id);
 const ended=api.warOuterWeightedProgressV141(recalled,3000,costs);
 assert.deepEqual(ended.visitedPassageIds,[p0.id],"never traversed long second leg");
 assert.equal(ended.remainingPassageIds.length,0);
});

test("Outer Ops V141: actual V115 routes remain sourced, no reveal of opponents, and no double settlement",()=>{
 const {state}=start("outer"),order=state.outer[0];
 const mid=api.warOuterWeightedProgressV141(order,Math.floor((order.startedAt+order.dueAt)/2),rules);
 assert.ok(order.routeIds.includes(mid.currentPassageId));
 assert.equal(mid.currentPassageName,rules.passages.find(p=>p.id===mid.currentPassageId).name);
 const received=api.settleWarOuterOpsV115(state,order.dueAt,rules);
 assert.equal(received.accepted,true,received.message);
 assert.equal(api.settleWarOuterOpsV115(received.state,order.dueAt,rules).accepted,false);
});

test("Stealth V141: source guard always follows a physical one-step route toward a real 2D decoy",()=>{
 const regions=new Set();
 let differentY=0;
 for(const site of rules.territories){
  const terrain=api.warMissionTerrainV116(site.id,rules);
  regions.add(site.region);
  const initial=api.warStealthPatrolSpawnV140(terrain);
  for(const lure of [{x:1,y:1},{x:1,y:4}]){
   let guard=initial;
   for(let tick=0;tick<5;tick++){
    const moved=api.warStealthDecoyPatrolV141(terrain,guard,lure);
    assert.ok(distance({x:guard.guardX,y:guard.guardY},
      {x:moved.guardX,y:moved.guardY})<=1,site.id+" decoy teleported guard");
    assert.equal(api.warTerrainCellBlockedV116(terrain,moved.guardX,moved.guardY),false,
     site.id+" decoy crossed wall");
    guard=moved;
   }
  }
  const simulate=y=>{
   let guard=initial;
   for(let j=0;j<4;j++)guard=api.warStealthDecoyPatrolV141(terrain,guard,{x:1,y});
   return guard.guardY;
  };
  if(simulate(1)!==simulate(4))differentY++;
 }
 assert.ok(regions.size>=6);
 assert.ok(differentY>=1,"guard must respond to the decoy Y, not just its X");
});

test("Stealth V141: decoy saves exact emitted Y while archived older decoy without Y still loads",()=>{
 const {state}=start("stealth");
 const fired=api.commandStealthV115(state,"decoy",rules);
 assert.equal(fired.accepted,true,fired.message);
 const current=fired.state.active.stealth;
 assert.equal(current.decoyX,state.active.stealth.x);
 assert.equal(current.decoyY,state.active.stealth.y);
 assert.equal(current.decoyUsed,true);
 assert.equal(current.energy,state.active.stealth.energy-2);
 assert.ok(api.readWarOperationsV115(JSON.stringify(fired.state),rules));
 const legacy={...fired.state,active:{...fired.state.active,
  stealth:{...current}}};delete legacy.active.stealth.decoyY;
 assert.ok(api.readWarOperationsV115(JSON.stringify(legacy),rules));
 const wrong={...fired.state,active:{...fired.state.active,
  stealth:{...current,decoyY:99}}};
 assert.equal(api.readWarOperationsV115(JSON.stringify(wrong),rules),null);
});

test("RTS V141: enemy planning avoids next-turn active hazard cells instead of deliberately entering them",()=>{
 let checked=false;
 for(const id of api.WAR_SOURCE_RTS_IDS_V129){
  const original=sourceRts(id),hero=original.squads[0],base={
   ...original,turn:1,map:{...original.map,hazards:[]},
   squads:original.squads.map((u,i)=>i===0?u:{...u,hp:0,status:"down"}),
  };
  const candidates=original.map.tiles.filter(tile=>api.warMapWalkableV128(original.map,tile)&&
   distance(tile,hero)>=3&&distance(tile,hero)<=7&&
   api.warMapLineOfSightV128(original.map,tile,hero)&&
   !base.squads.some(u=>u.id!==hero.id&&u.status==="active"&&coord(u)===coord(tile)));
  for(const tile of candidates.slice(0,40)){
   const enemy={...original.enemies[0],x:tile.x,y:tile.y,hp:9,status:"active"};
   const staged={...base,enemies:[enemy]};
   const baseline=api.commandWarRtsSquadsV133(staged,{kind:"wait",squadId:hero.id});
   if(!baseline.accepted||baseline.state.phase!=="active"||
      coord(baseline.state.enemies[0])===coord(enemy))continue;
   const unsafe=baseline.state.enemies[0];
   const hazarded={...staged,map:{...staged.map,hazards:[{x:unsafe.x,y:unsafe.y}]}};
   const guarded=api.commandWarRtsSquadsV133(hazarded,{kind:"wait",squadId:hero.id});
   assert.equal(guarded.accepted,true,guarded.message);
   assert.equal(guarded.state.turn,2);
   assert.notEqual(coord(guarded.state.enemies[0]),coord(unsafe),
    "AI knowingly entered active T3 hazard while safe alternatives exist");
   assert.equal(guarded.state.ravRemaining,staged.ravRemaining);
   assert.equal(guarded.state.map.planetId,original.map.planetId);
   checked=true;
   break;
  }
  if(checked)break;
 }
 assert.equal(checked,true,"at least one of 24 source worlds should support an actual enemy chase");
});

test("RTS V141: regular source hazards still damage both factions; 24 maps keep their 72 tasks",()=>{
 const audit=api.auditWarRtsSquadsV133(rules);
 assert.equal(audit.missions,24);assert.equal(audit.steps,72);
 assert.deepEqual(audit.issues,[]);
 const world=api.createWarOperationsV115(rules);
 assert.equal(world.context,"free");
 assert.equal(world.reports.length,0);
});
