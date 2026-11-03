import assert from "node:assert/strict";
import test from "node:test";
import {build} from "esbuild";
const built=await build({stdin:{contents:[
 "export * from './app/game/systems/clanWarDebriefV144';",
 "export * from './app/game/systems/clanWarOperationsV115';",
 "export * from './app/game/systems/clanWarRtsSquadsV133';",
 "export * from './app/game/systems/clanWarBibleV6';",
 "export * from './app/game/systems/clanWarV85Data';",
].join("\n"),resolveDir:process.cwd()},bundle:true,write:false,
 format:"esm",platform:"node",target:"es2022",logLevel:"silent"});
const api=await import("data:text/javascript;base64,"+
 Buffer.from(built.outputFiles[0].text).toString("base64"));
const rules=api.DEFAULT_WAR_RULES_V6;
function started(mode){
 const state=api.createWarOperationsV115(rules),team=state.teams[0].id;
 const site=rules.territories.find(t=>t.id!==state.baseId&&
  !api.warMissionEligibleV115(state,rules,t.id,[team]));
 assert.ok(site,"V6 source route absent");
 const response=api.beginWarOperationV115(state,mode,site.id,[team],rules,1000);
 assert.equal(response.accepted,true,response.message);
 return {state:response.state,site:site.id,team};
}
function completed(mode){
 const a=started(mode);
 if(mode!=="outer"){
  const r=api.leaveWarOperationV115(a.state,rules);
  assert.equal(r.accepted,true,r.message);return r.state;
 }
 const order=a.state.outer[0];
 const recalled=api.recallWarOuterMissionV116(a.state,order.id,order.startedAt+100,rules);
 assert.equal(recalled.accepted,true,recalled.message);
 const final=api.settleWarOuterOpsV115(recalled.state,recalled.state.outer[0].dueAt,rules);
 assert.equal(final.accepted,true,final.message);
 return final.state;
}
function finishedRts(){
 const l=api.launchWarRtsSquadsV133(api.createWarRtsSquadsV133("W3-RTS01",rules));
 assert.equal(l.accepted,true,l.message);
 const s=l.state,unit=s.squads[0];
 const arranged={...s,squads:s.squads.map(u=>u.id===unit.id?
  {...u,x:s.map.extraction.x,y:s.map.extraction.y}:u)};
 const final=api.commandWarRtsSquadsV133(arranged,{kind:"retreat",squadId:unit.id});
 assert.equal(final.accepted,true,final.message);
 assert.ok(final.state.report);return final.state;
}

test("V144 assault produces source-linked read-only debrief, not campaign capture",()=>{
 const state=completed("assault");
 const before=JSON.stringify(state),r=api.auditWarOperationsDebriefsV144(state,rules);
 assert.equal(r.rejectedIds.length,0);
 assert.equal(r.debriefs.length,1);
 const d=r.debriefs[0];
 assert.equal(d.version,144);assert.equal(d.mode,"assault");
 assert.equal(d.source,"V115-EXERCISE");
 assert.equal(d.missionId,state.reports[0].id);
 assert.equal(d.outcome,"retreat");
 assert.equal(d.territoryId,state.reports[0].targetId);
 assert.deepEqual(d.teamIds,state.reports[0].teamIds);
 assert.equal(d.campaignMutation,false);
 assert.equal(d.requiresAuthorizedCampaignBridge,true);
 assert.equal(JSON.stringify(state),before,"no mutation of V115 save");
});

test("V144 Outer Ops final report is deferred, idempotent and source-traceable",()=>{
 const operation=started("outer");
 assert.equal(api.auditWarOperationsDebriefsV144(operation.state,rules).debriefs.length,0);
 const result=completed("outer");
 const audit=api.auditWarOperationsDebriefsV144(result,rules);
 assert.deepEqual(audit.rejectedIds,[]);
 assert.equal(audit.debriefs.length,1);
 assert.equal(audit.debriefs[0].mode,"outer");
 assert.equal(audit.debriefs[0].outcome,"retreat");
 assert.ok(audit.debriefs[0].proofCount>=1);
 const second=api.auditWarOperationsDebriefsV144(result,rules);
 assert.deepEqual(second,audit);
});

test("V144 stealth, even on retreat, leaves no phantom lore reward or territory",()=>{
 const s=completed("stealth");
 const record=api.auditWarOperationsDebriefsV144(s,rules).debriefs[0];
 assert.equal(record.mode,"stealth");
 assert.equal(record.planetId,null);
 assert.equal(record.mapId,null);
 assert.equal(record.completedObjectiveIds.length,0);
 assert.equal(record.campaignMutation,false);
 assert.equal(record.receiptKey,"V115:"+s.reports[0].id);
});

test("V144 physical RTS W3 receipt records real planet/map IDs but no V85 candidate",()=>{
 const s=finishedRts(),original=JSON.stringify(s);
 const r=api.auditWarRtsDebriefV144(s,rules);
 assert.deepEqual(r.rejectedIds,[]);
 assert.equal(r.debriefs.length,1);
 const d=r.debriefs[0];
 assert.equal(d.mode,"rts");assert.equal(d.source,"V133-W3-EXERCISE");
 assert.equal(d.mapId,s.map.id);assert.equal(d.planetId,s.map.planetId);
 assert.equal(d.campaignCandidateTerritoryId,null);
 assert.equal(d.outcome,"retreat");
 assert.deepEqual(d.teamIds,s.report.squadIds);
 assert.equal(d.campaignMutation,false);
 assert.equal(JSON.stringify(s),original);
});

test("V144 source SHA mismatch and forged casualty / foreign mission are rejected",()=>{
 const state=completed("assault"),report=state.reports[0];
 const wrongSource={...state,sourceSha:"evil"};
 assert.deepEqual(api.auditWarOperationsDebriefsV144(wrongSource,rules).debriefs,[]);
 const forged={...state,reports:[{...report,targetId:"EARTH-GUNNISON"}]};
 assert.equal(api.auditWarOperationsDebriefsV144(forged,rules).debriefs.length,0);
 const bogusWounded={...state,reports:[{...report,woundedIds:["NOT-A-MEMBER"]}]};
 assert.equal(api.auditWarOperationsDebriefsV144(bogusWounded,rules).debriefs.length,0);
 const rts=finishedRts();
 const forgedRts={...rts,report:{...rts.report,mapId:"IMPOSTOR"}};
 assert.equal(api.auditWarRtsDebriefV144(forgedRts,rules).debriefs.length,0);
 const powered={...rts,report:{...rts.report,campaignMutation:true}};
 assert.equal(api.auditWarRtsDebriefV144(powered,rules).debriefs.length,0);
});

test("V144 duplicate receipts retain one trusted result and surface a rejected ID",()=>{
 const s=completed("outer"),receipt=s.reports[0];
 const repeated={...s,reports:[receipt,{...receipt}]};
 const a=api.auditWarOperationsDebriefsV144(repeated,rules);
 assert.equal(a.debriefs.length,1);
 assert.deepEqual(a.rejectedIds,["V115:"+receipt.id]);
});

test("V144 merged four-mode audit includes all reported modes without writes",()=>{
 const base=completed("assault"),s=finishedRts();
 const a=api.collectWarDebriefsV144(base,s,rules);
 assert.equal(a.debriefs.length,2);
 assert.deepEqual(a.debriefs.map(d=>d.mode),["assault","rts"]);
 assert.equal(new Set(a.debriefs.map(d=>d.receiptKey)).size,2);
 assert.ok(a.debriefs.every(d=>d.campaignMutation===false&&
  d.requiresAuthorizedCampaignBridge));
 assert.equal(base.context,"free");assert.equal(s.mode,"free-exercise");
});

test("V144 all V6 debrief territory links only exact existing V85 IDs",()=>{
 const s=completed("assault"),audit=api.auditWarOperationsDebriefsV144(s,rules);
 const d=audit.debriefs[0],matching=api.WAR_TERRITORIES_V85.find(t=>t.id===d.territoryId);
 assert.equal(d.campaignCandidateTerritoryId,matching?.id??null);
 const rts=finishedRts();
 assert.equal(api.auditWarRtsDebriefV144(rts,rules).debriefs[0].campaignCandidateTerritoryId,null);
 assert.equal(rts.report.campaignMutation,false);
});
