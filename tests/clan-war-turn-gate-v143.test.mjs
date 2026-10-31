import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {
  inspectWarTurnGateV143,WAR_TURN_GATE_MESSAGES_V143,
} from "../app/game/systems/clanWarTurnGateV143.ts";
const root=fileURLToPath(new URL("../",import.meta.url));
const read=path=>readFileSync(root+path,"utf8");

test("V143 turn gate rejects an inactive, loading, writing, or stale war session",()=>{
  const good={loaded:true,pendingWrites:0,staleWar:false,simulation:{revision:7,turn:3}};
  assert.deepEqual(inspectWarTurnGateV143(good,7,true,false),{allowed:true,reason:"ready"});
  assert.equal(inspectWarTurnGateV143(good,7,true,true).reason,"inactive");
  assert.equal(inspectWarTurnGateV143(good,7,false,false).reason,"inactive");
  assert.equal(inspectWarTurnGateV143({...good,loaded:false},7,true,false).reason,"loading");
  assert.equal(inspectWarTurnGateV143({...good,pendingWrites:1},7,true,false).reason,"writing");
  assert.equal(inspectWarTurnGateV143({...good,pendingWrites:10},7,true,false).reason,"writing");
  assert.equal(inspectWarTurnGateV143({...good,staleWar:true},7,true,false).reason,"conflict");
  for(const rev of [null,1,6,8,NaN,Infinity,-Infinity,7.1]){
    assert.equal(inspectWarTurnGateV143(good,rev,true,false).reason,"stale");
  }
  assert.equal(inspectWarTurnGateV143({...good,simulation:{revision:8,turn:4}},7,true,false).reason,"stale");
  assert.ok(Object.values(WAR_TURN_GATE_MESSAGES_V143).every(x=>x.length>20));
});
test("the real strategic panel uses V143 guard on BOTH review and resolution, with one live atlas",()=>{
  const source=read("app/game/ClanWarPanelV85.tsx");
  assert.match(source,/function requestWarTurnReview\(\)/);
  assert.match(source,/function resolveReviewedWarTurn\(\)/);
  assert.match(source,/function removeReservedWarOrder\(orderId:string\)/);
  assert.equal((source.match(/inspectWarTurnGateV143\(/g)||[]).length,2);
  assert.match(source,/data-testid="war-end-turn-review-v143"/);
  assert.match(source,/data-testid="war-end-turn-commit-v143"/);
  assert.match(source,/const live=planetSession\.getSnapshot\(\);\s+const gate=inspectWarTurnGateV143\(live,confirmTurnRevision\.current/);
  assert.match(source,/if\(result\.accepted\)setSimulation\(result\.state\)/);
  assert.match(source,/strategic\.pendingWrites > 0/);
  assert.equal((source.match(/<ClanWarAtlasV95\b/g)||[]).length,1);
  assert.match(source,/data-war-presentation=\{presentation\}/);
});
test("no war reset, campaign save mutation or double sidecar is added by the turn gate",()=>{
  const gate=read("app/game/systems/clanWarTurnGateV143.ts");
  assert.ok(!gate.includes("localStorage"));
  assert.ok(!gate.includes("writeSaveWithStatus"));
  assert.ok(!gate.includes("advanceWarTurnV85"));
  assert.ok(!gate.includes("Math.random"));
  const panel=read("app/game/ClanWarPanelV85.tsx");
  assert.match(panel,/data-war-campaign-write="none"/);
  assert.match(panel,/const result=advanceWarTurnV85\(live\.simulation\)/);
  assert.ok(!panel.includes("onClick={() => { const result = advanceWarTurnV85(simulation)"));
});
