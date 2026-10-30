import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import {build} from "esbuild";
const compiled=await build({stdin:{contents:`export * from "./app/game/save";export * from "./app/game/systems/harvestInventoryV112";`,resolveDir:process.cwd(),loader:"ts"},bundle:true,write:false,platform:"node",format:"esm",logLevel:"silent"});
const api=await import("data:text/javascript;base64,"+Buffer.from(compiled.outputFiles[0].text).toString("base64"));
const source=await readFile(new URL("../app/game/GameClient.tsx",import.meta.url),"utf8");
const ast=ts.createSourceFile("GameClient.tsx",source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
function callback(name,bindings) {
  let declaration;
  function visit(node){if(ts.isVariableDeclaration(node)&&ts.isIdentifier(node.name)&&node.name.text===name)declaration=node;ts.forEachChild(node,visit);}
  visit(ast);assert.ok(declaration&&ts.isCallExpression(declaration.initializer),name);
  const expression=declaration.initializer.arguments[0];assert.ok(ts.isArrowFunction(expression)||ts.isFunctionExpression(expression));
  const compiled=ts.transpileModule("("+expression.getText(ast)+")",{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}});
  return vm.runInNewContext(compiled.outputText,bindings);
}
const specimen={id:"jungle-vey:0:prey:hide",sourceId:"jungle-vey:0:prey",speciesId:"rifle-soldier",partId:"hide",
  label:"Peau préparée",quality:80,massKg:3,volumeUnits:2,stage:"raw"};
function harness(confirm=true){
  const base=api.defaultSave("2026-10-28T00:00:00.000Z");base.profile.clanMarks=100;base.inventory.fieldToolIds=["flaying-tool"];
  base.inventory.harvestV112.specimens=[{...specimen}];
  const saveRef={current:base},updates=[];
  const bindings={...api,saveRef,screen:"trophies",settingsOpen:false,archiveTransferBusy:false,archiveRecoveryIssue:null,campaignSaveBusy:false,
    persistSocialProgress(update){updates.push(update);if(!confirm)return false;saveRef.current={...saveRef.current,...update};return true;}};
  const handler=callback("performConservationActionV112",bindings);
  return {handler,bindings,saveRef,updates,base};
}
test("the actual station callback reports no success and changes no campaign after refused storage acknowledgement",()=>{
  const h=harness(false),r=h.handler("start",specimen.id);
  assert.equal(r.ok,false);assert.match(r.message,/non confirmé/);assert.equal(h.saveRef.current,h.base);
  assert.equal(h.saveRef.current.profile.clanMarks,100);assert.equal(h.saveRef.current.inventory.harvestV112.jobs.length,0);
  assert.equal(h.updates.length,1);assert.equal(h.updates[0].profile.clanMarks,98);
  assert.equal(h.updates[0].inventory.harvestV112.jobs.length,1);
});
test("the same pre-render callback uses the updated authoritative ref and cannot pay twice",()=>{
  const h=harness(),fn=h.handler;
  assert.equal(fn("start",specimen.id).ok,true);assert.equal(fn("start",specimen.id).ok,false);
  assert.equal(h.updates.length,1);assert.equal(h.saveRef.current.profile.clanMarks,98);
  const job=h.saveRef.current.inventory.harvestV112.jobs[0];
  for(let i=0;i<3;i++)assert.equal(fn("work",job.id).ok,true);
  assert.equal(fn("work",job.id).ok,false);assert.equal(h.saveRef.current.profile.clanMarks,98);
  assert.equal(h.saveRef.current.inventory.harvestV112.specimens[0].stage,"cleaned");
});
test("hidden, suspended or busy stations refuse every action before persistence",()=>{
  for(const [key,value]of [["settingsOpen",true],["archiveTransferBusy",true],["archiveRecoveryIssue","blocked"],["campaignSaveBusy",true],["screen","mission"]]){
    const h=harness();h.bindings[key]=value;
    const fn=callback("performConservationActionV112",h.bindings),r=fn("start",specimen.id);
    assert.equal(r.ok,false);assert.equal(h.updates.length,0);assert.equal(h.saveRef.current,h.base);
  }
});
test("tool repair is acknowledged with the same inventory write and preserves its immutable usage watermark",()=>{
  const h=harness();h.base.inventory.harvestV112.toolCondition=5;h.base.inventory.harvestV112.settledEncounterRuns={"jungle-vey":4};
  const r=h.handler("repair","flaying-tool");assert.equal(r.ok,true);
  assert.equal(h.saveRef.current.inventory.harvestV112.toolCondition,100);
  assert.deepEqual(h.saveRef.current.inventory.harvestV112.settledEncounterRuns,{"jungle-vey":4});
  assert.equal(h.saveRef.current.profile.clanMarks,100);assert.equal(h.handler("repair","flaying-tool").ok,false);
});
test("terminal delivery preflight retains an incompatible result without retiring the active hunt or writing campaign rewards",()=>{
  const s=api.defaultSave(),saveRef={current:s},pending=[],toasts=[];
  let writes=0,clears=0;
  const bindings={saveRef,pendingTrophyCommitRef:{current:null},sessionAliveRef:{current:true},missionSettlementRef:{current:false},
    checkHuntSessionForSettlement:()=>true,activeHuntSessionRef:{current:{runId:"live"}},
    deliverHarvestV112:api.deliverHarvestV112,setPendingHuntResult:x=>pending.push(x),setToast:x=>toasts.push(x),
    writeSaveWithStatus:()=>{writes++;throw Error("must not write");},clearHuntSession:()=>{clears++;}};
  const finish=callback("completeMission",bindings);
  const result={missionId:"jungle-vey",outcome:"success",harvestEncounterRunV112:0,specimensV112:[specimen],toolUseIdsV112:["jungle-vey:0:flay:prey"]};
  finish(result,false);
  assert.equal(writes,0);assert.equal(clears,0);assert.equal(bindings.missionSettlementRef.current,false);
  assert.equal(saveRef.current,s);assert.equal(pending.length,1);assert.equal(pending[0].result,result);
  assert.match(toasts[0],/outil acquis/);
});

function recoveryHarness(){
  const base=api.defaultSave("2026-10-28T00:00:00.000Z");base.profile.clanMarks=100;base.inventory.fieldToolIds=["flaying-tool"];
  base.inventory.harvestV112.specimens=[{...specimen},{...specimen,id:"jungle-vey:0:other:hide",sourceId:"jungle-vey:0:other"}];
  const saveRef={current:base},pendingSocialWriteRef={current:null},writes=[],toasts=[],reactSaves=[];
  let confirm=false,reconciles=0;
  const bindings={...api,saveRef,pendingSocialWriteRef,sessionAliveRef:{current:true},pendingTrophyCommitRef:{current:null},
    pendingTerminalRunRef:{current:null},activeHuntSessionRef:{current:null},
    screen:"trophies",settingsOpen:false,archiveTransferBusy:false,archiveRecoveryIssue:null,campaignSaveBusy:false,
    setToast:x=>toasts.push(x),setSaveFailure:()=>{},setSave:x=>reactSaves.push(x),
    reconcileSaveWrite(attempt,owner){reconciles++;assert.equal(owner,attempt.save.createdAt);return {status:"confirmed",save:attempt.save};},
    writeSaveWithStatus(next){writes.push(next);return {save:next,persisted:confirm,failure:confirm?null:"write-failed"};},
    isExplorationMission:()=>false,reconcileHuntWrite:()=>null,explorationWriteFailure:()=>assert.fail("no active hunt"),
  };
  bindings.persistSocialProgress=callback("persistSocialProgress",bindings);
  const handler=callback("performConservationActionV112",bindings);
  return {handler,saveRef,pendingSocialWriteRef,writes,toasts,reactSaves,setConfirm:x=>{confirm=x;},reconciles:()=>reconciles};
}
test("a failed conservation start reconciles its exact paid job on the same gesture and never writes or debits twice",()=>{
  const h=recoveryHarness(),before=h.saveRef.current;
  assert.equal(h.handler("start",specimen.id).ok,false);assert.equal(h.saveRef.current,before);
  assert.ok(h.pendingSocialWriteRef.current);assert.equal(h.writes.length,1);assert.equal(h.saveRef.current.profile.clanMarks,100);
  assert.equal(h.handler("start",specimen.id).ok,true);
  assert.equal(h.pendingSocialWriteRef.current,null);assert.equal(h.reconciles(),1);assert.equal(h.writes.length,1);
  assert.equal(h.saveRef.current.profile.clanMarks,98);assert.equal(h.saveRef.current.inventory.harvestV112.jobs.length,1);
  assert.equal(h.handler("start",specimen.id).ok,false);assert.equal(h.writes.length,1);
});
test("recovery of one paid work order cannot overwrite it with a stale different order",()=>{
  const h=recoveryHarness();
  assert.equal(h.handler("start",specimen.id).ok,false);
  assert.equal(h.handler("start","jungle-vey:0:other:hide").ok,false);
  assert.equal(h.writes.length,1);assert.equal(h.saveRef.current.profile.clanMarks,98);
  assert.equal(h.saveRef.current.inventory.harvestV112.jobs[0].specimenId,specimen.id);
  h.setConfirm(true);
  assert.equal(h.handler("start","jungle-vey:0:other:hide").ok,true);
  assert.equal(h.writes.length,2);assert.equal(h.saveRef.current.profile.clanMarks,96);
  assert.equal(h.saveRef.current.inventory.harvestV112.jobs.length,2);
});
