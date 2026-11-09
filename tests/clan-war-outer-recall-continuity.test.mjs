import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {build} from "esbuild";

const packed=await build({stdin:{contents:[
  "export * from './app/game/systems/clanWarOuterWeightedProgressV141';",
  "export * from './app/game/systems/clanWarTravelLedgerV145';",
  "export * from './app/game/systems/clanWarOperationsV115';",
  "export * from './app/game/systems/clanWarBibleV6';",
  "export * from './app/game/systems/clanWarOuterChoicesV142';",
  "export * from './app/game/systems/clanWarOuterRerouteV144';",
].join("\n"),resolveDir:process.cwd()},bundle:true,write:false,
format:"esm",platform:"node",target:"es2022",logLevel:"silent"});
const api=await import("data:text/javascript;base64,"+Buffer.from(packed.outputFiles[0].text).toString("base64"));
const source=api.DEFAULT_WAR_RULES_V6;
const [first,second]=source.passages.slice(0,2);
const rules={...source,passages:source.passages.map(p=>({...p,
  movementCost:p.id===first.id?2:p.id===second.id?18:p.movementCost}))};
const mission={id:"continuity-exercise",targetId:source.territories[1].id,
  teamIds:[],focus:"recon",routeIds:[first.id,second.id],startedAt:1000,dueAt:11000};
const recall=(order,at,end=at+10000)=>({...order,dueAt:end,
  recall:{orderedAt:at,originalDueAt:order.dueAt}});
const near=(actual,expected,message)=>assert.ok(Math.abs(actual-expected)<1e-10,
  message+": "+actual+" != "+expected);

test("a recall turns around at the reached position inside the first weighted passage",()=>{
  const outbound=api.warOuterWeightedProgressV141(mission,1200,rules);
  const returning=api.warOuterWeightedProgressV141(recall(mission,1200),1200,rules);
  assert.equal(outbound.currentPassageId,first.id);
  assert.equal(returning.currentPassageId,first.id);
  near(outbound.currentPassageProgress,.2,"outbound point");
  near(returning.currentPassageProgress,.8,"same point in reverse direction");
  near(returning.totalWeight,.4,"only the reached part is retraced");
  near(returning.completedWeight,0,"no return distance is already walked");
  assert.deepEqual(returning.remainingPassageIds,[]);
});

test("a recall retraces a partial second passage before the complete first one",()=>{
  const returning=recall(mission,6000,16000);
  const before=api.warOuterWeightedProgressV141(mission,6000,rules);
  const turn=api.warOuterWeightedProgressV141(returning,6000,rules);
  assert.equal(turn.currentPassageId,second.id);
  near(before.currentPassageProgress,8/18,"outbound second passage");
  near(turn.currentPassageProgress,10/18,"same point on reverse second passage");
  near(turn.totalWeight,10,"return route excludes unreached weight");
  const halfway=api.warOuterWeightedProgressV141(returning,11000,rules);
  assert.equal(halfway.currentPassageId,second.id);
  near(halfway.currentPassageProgress,15/18,"five weight units retraced");
  near(halfway.completedWeight,5,"five weight units retraced");
  const junction=api.warOuterWeightedProgressV141(returning,14000,rules);
  assert.equal(junction.currentPassageId,first.id);
  near(junction.currentPassageProgress,0,"first passage begins at the true junction");
  assert.deepEqual(junction.visitedPassageIds,[second.id]);
});

test("an exact junction never adds an untouched passage to the return itinerary",()=>{
  const returning=recall(mission,2000);
  const at=api.warOuterWeightedProgressV141(returning,2000,rules);
  assert.equal(at.currentPassageId,first.id);
  near(at.currentPassageProgress,0,"turn at the reached end of first passage");
  assert.equal(at.totalWeight,2);
  assert.equal(at.totalPassages,1);
  assert.deepEqual(api.warOuterWeightedProgressV141(returning,returning.dueAt,rules)
    .visitedPassageIds,[first.id]);
});

test("a recall at departure invents no travelled passage while retaining its existing return deadline",()=>{
  const returning=recall(mission,mission.startedAt);
  const at=api.warOuterWeightedProgressV141(returning,1000,rules);
  assert.equal(at.phase,"returning");
  assert.equal(at.currentPassageId,null);
  assert.equal(at.totalWeight,0);
  assert.deepEqual(at.visitedPassageIds,[]);
  assert.deepEqual(api.warOuterWeightedProgressV141(returning,returning.dueAt,rules).visitedPassageIds,[]);
  assert.equal(returning.dueAt,11000);
});

test("historical observations before the recall still show the original outbound position",()=>{
  const recalled=recall(mission,6000);
  assert.deepEqual(api.warOuterWeightedProgressV141(recalled,3500,rules),
    api.warOuterWeightedProgressV141(mission,3500,rules));
});

test("a halted or accelerated outward trip keeps its actual point at the moment of recall",()=>{
  const orders=[
    {...mission,dueAt:26000,reconHalt:{orderedAt:1800,originalDueAt:11000,extraMs:15000}},
    {...mission,dueAt:10000,forcedPace:{orderedAt:2000,originalDueAt:11000,savedMs:1000}},
    {...mission,dueAt:16000,routeDiversion:{changedAt:1500,originalDueAt:11000,fromPassageIds:[first.id,second.id],paidRav:1}},
  ];
  for (const order of orders) {
    const time=3500,outbound=api.warOuterWeightedProgressV141(order,time,rules);
    const returning=api.warOuterWeightedProgressV141(recall(order,time),time,rules);
    assert.equal(returning.currentPassageId,outbound.currentPassageId);
    near(returning.currentPassageProgress,1-outbound.currentPassageProgress,"same physical point after route timing changes");
    near(returning.totalWeight,outbound.completedWeight,"only the actual distance is retraced");
  }
});

test("original PR55 and PR57 recalled archives remain unchanged, readable and settle once",()=>{
  for (const file of ["outer-inspection-pr55/outer-pr55-inspected-recall.json",
    "outer-pace-pr57/outer-pr57-paced-recall.json"]) {
    const raw=fs.readFileSync(new URL("./fixtures/"+file,import.meta.url),"utf8");
    const state=api.readWarOperationsV115(raw,source);
    assert.ok(state,"historical source archive must remain readable: "+file);
    const before=JSON.stringify(state),order=state.outer[0];
    const outward={...order,recall:undefined,dueAt:order.recall.originalDueAt};
    const out=api.warOuterWeightedProgressV141(outward,order.recall.orderedAt,source);
    const turn=api.warOuterWeightedProgressV141(order,order.recall.orderedAt,source);
    near(turn.totalWeight,out.completedWeight,"historical return begins at the actual reached point");
    const ledger=api.warOuterTravelLedgerV145(order,order.recall.orderedAt,source);
    assert.equal(ledger.currentPassageId,turn.currentPassageId);
    assert.equal(ledger.currentPassageProgress,turn.currentPassageProgress);
    assert.equal(JSON.stringify(state),before,"read-only progress must preserve archive bytes");
    const settled=api.settleWarOuterOpsV115(state,order.dueAt,source);
    assert.equal(settled.accepted,true,settled.message);
    assert.equal(api.settleWarOuterOpsV115(settled.state,order.dueAt,source).accepted,false);
    assert.deepEqual(settled.state.teams,state.teams);
    assert.equal(settled.state.rav,state.rav);
  }
});

test("an actual authorized reroute returns through its reached passages and never through the replaced itinerary",()=>{
  const state=api.createWarOperationsV115(source),team=state.teams[0];
  const pc=source.units.find(unit=>unit.id===team.unitId).commandPoints;
  const choice=source.territories.map(target=>({target,
    options:api.warOuterRouteChoicesV142(state.baseId,target.id,pc,source)}))
    .find(row=>row.target.id!==state.baseId&&row.options.length>1&&
      !api.warMissionEligibleV115(state,source,row.target.id,[team.id]));
  assert.ok(choice,"a real V6 route alternative is required");
  const launched=api.beginWarOperationV115(state,"outer",choice.target.id,[team.id],source,1000);
  assert.equal(launched.accepted,true,launched.message);
  const initial=launched.state.outer[0];
  const alternative=choice.options.find(row=>row.passageIds.join("|")!==initial.routeIds.join("|"));
  const rerouted=api.commandWarOuterRerouteV144(launched.state,initial.id,alternative.passageIds,1000,source);
  assert.equal(rerouted.accepted,true,rerouted.message);
  const order=rerouted.state.outer[0],at=order.startedAt+6000;
  const outward=api.warOuterWeightedProgressV141(order,at,source);
  const recalled=api.recallWarOuterMissionV116(rerouted.state,order.id,at,source);
  assert.equal(recalled.accepted,true,recalled.message);
  const back=recalled.state.outer[0];
  const turn=api.warOuterWeightedProgressV141(back,at,source);
  assert.equal(turn.currentPassageId,outward.currentPassageId);
  near(turn.currentPassageProgress,1-outward.currentPassageProgress,"rerouted turn at the same point");
  near(turn.totalWeight,outward.completedWeight,"rerouted distance actually reached");
  const end=api.warOuterWeightedProgressV141(back,back.dueAt,source);
  assert.deepEqual(end.visitedPassageIds,[...outward.visitedPassageIds,outward.currentPassageId].reverse());
  assert(end.visitedPassageIds.every(id=>alternative.passageIds.includes(id)));
  assert.deepEqual(api.readWarOperationsV115(JSON.stringify(recalled.state),source),recalled.state);
  assert.deepEqual(back.teamIds,initial.teamIds);
});
