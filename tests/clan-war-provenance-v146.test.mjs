import assert from "node:assert/strict";
import test from "node:test";
import {build} from "esbuild";

const compiled=await build({stdin:{contents:[
 "export * from './app/game/systems/clanWarSourceAuditV146';",
 "export * from './app/game/systems/clanWarProofSyncV145';",
 "export * from './app/game/systems/clanWarDebriefV144';",
 "export * from './app/game/systems/clanWarOperationsV115';",
 "export * from './app/game/systems/clanWarV85';",
 "export * from './app/game/systems/clanWarV85Data';",
 "export * from './app/game/systems/clanWarPlanetsV96';",
 "export * from './app/game/systems/clanWarBibleV6';",
 "export * from './app/game/systems/clanWarRtsSquadsV133';",
].join("\n"),resolveDir:process.cwd()},bundle:true,write:false,
 format:"esm",platform:"node",target:"es2022",logLevel:"silent"});
const api=await import("data:text/javascript;base64,"+
 Buffer.from(compiled.outputFiles[0].text).toString("base64"));
const rules=api.DEFAULT_WAR_RULES_V6;
function complete(mode){
 const begin=api.createWarOperationsV115(rules),team=begin.teams[0].id;
 const site=rules.territories.find(t=>t.id!==begin.baseId&&
  !api.warMissionEligibleV115(begin,rules,t.id,[team]));
 assert.ok(site,"No source V6 site");
 const launched=api.beginWarOperationV115(begin,mode,site.id,[team],rules,1000);
 assert.equal(launched.accepted,true,launched.message);
 let done;
 if(mode==="outer"){
  const order=launched.state.outer[0];
  const recall=api.recallWarOuterMissionV116(launched.state,order.id,order.startedAt+100,rules);
  assert.equal(recall.accepted,true);
  const resolved=api.settleWarOuterOpsV115(recall.state,recall.state.outer[0].dueAt,rules);
  assert.equal(resolved.accepted,true,resolved.message);
  done=resolved.state;
 }else{
  const leave=api.leaveWarOperationV115(launched.state,rules);
  assert.equal(leave.accepted,true,leave.message);
  done=leave.state;
 }
 return {done,raw:JSON.stringify(done),teamId:team,siteId:site.id};
}
const war=()=>api.createWarSimulationV85();

test("V146: geographic origin audit never joins W3-K and CON-T by matching numeric suffix",()=>{
 const v85=war(),rows=api.auditWarTerritorySourcesV146(rules,v85);
 assert.equal(rows.length,rules.territories.length);
 assert.ok(rows.length>=12);
 assert.equal(new Set(rows.map(x=>x.sourceId)).size,rows.length);
 assert.equal(rows.filter(x=>x.status==="unmapped").length,rows.length);
 assert.ok(rows.every(x=>x.destinationId===null&&x.militaryLinkAuthorized===false));
 assert.ok(rows.every(x=>Number.isFinite(x.sourceCell.column)&&Number.isFinite(x.sourceCell.row)));
 const v85ids=new Set(api.warTerritoriesForSimulationV96(v85).map(x=>x.id));
 assert.ok(rows.some(x=>v85ids.has(x.sourceId.replace("W3-K","CON-T"))),
  "similar numbering is not geographical evidence");
});

test("V146: even identical ID/name/region metadata is only a candidate, not proof",()=>{
 const v85=war(),site=api.warTerritoriesForSimulationV96(v85)[0];
 const fake={...rules,territories:[{...rules.territories[0],
  id:site.id,name:site.name,region:site.region}]};
 const result=api.auditWarTerritorySourcesV146(fake,v85);
 assert.equal(result[0].status,"same-id-needs-evidence");
 assert.equal(result[0].destinationId,site.id);
 assert.equal(result[0].militaryLinkAuthorized,false);
 const conflicting={...fake,territories:[{...fake.territories[0],
  name:"homonymous unrelated location"}]};
 assert.equal(api.auditWarTerritorySourcesV146(conflicting,v85)[0].status,"conflicting-metadata");
});

test("V146: distinct actor catalogs remain separate despite spoofed equality of one person ID",()=>{
 const {done}=complete("assault"),v85=war();
 const unchanged=api.auditWarRosterSourcesV146(done,v85);
 assert.equal(unchanged.sourceTeamCount,done.teams.length);
 assert.equal(unchanged.strategyCombatantCount,v85.combatants.length);
 assert.equal(unchanged.status,"separate-rosters");
 assert.equal(unchanged.soldierTransferAuthorized,false);
 assert.ok(unchanged.sourcePersonCount>=done.teams.length);
 if(v85.combatants.length){
  const forge=structuredClone(done);
  forge.teams[0].members[0].id=v85.combatants[0].id;
  const collided=api.auditWarRosterSourcesV146(forge,v85);
  assert.deepEqual(collided.exactPersonIdCollisions,[v85.combatants[0].id]);
  assert.equal(collided.soldierTransferAuthorized,false);
 }
});

test("V146: all four mode receipts expose stable source fingerprints, not military rights",()=>{
 const modes=["assault","outer","stealth","rts"],fingerprints=[];
 for(const mode of modes){
  const src=complete(mode),v85=war(),original=JSON.stringify(v85);
  const audit=api.inspectWarSourcesV146(src.raw,v85,rules);
  assert.equal(audit.status,"ready-documentary-only",mode+" "+audit.message);
  assert.deepEqual(audit.rejectedIds,[]);
  assert.equal(audit.proofs.length,1);
  const p=audit.proofs[0];
  assert.equal(p.mode,mode);
  assert.equal(p.outcome,"retreat");
  assert.equal(p.sourceTerritoryId,src.siteId);
  assert.deepEqual(p.sourceTeamIds,[src.teamId]);
  assert.match(p.sourceFingerprint,/^[0-9a-f]{32}$/);
  assert.equal(p.documentaryCanImport,true);
  assert.equal(p.documentaryAlreadyImported,false);
  assert.equal(p.destinationTerritoryId,null);
  assert.equal(p.sourceTeamMappedToV85,false);
  assert.equal(p.needsGeographicEvidence,true);
  assert.equal(p.needsIdentityEvidence,true);
  assert.equal(audit.allowTerritoryMutation,false);
  assert.equal(audit.allowCasualtyMutation,false);
  assert.equal(audit.allowXpOrStockMutation,false);
  assert.equal(JSON.stringify(v85),original);
  assert.deepEqual(api.inspectWarSourcesV146(src.raw,v85,rules),audit);
  fingerprints.push(p.sourceFingerprint);
 }
 assert.equal(fingerprints.length,4);
});

test("V146: fingerprint changes for different modes, outcomes, summaries or source SHA",()=>{
 const base=complete("assault").done.reports[0];
 const fp=api.warSourceReceiptFingerprintV146(base,rules.metadata.sha256);
 assert.equal(fp,api.warSourceReceiptFingerprintV146({...base},rules.metadata.sha256));
 for(const modified of [
  {...base,mode:"stealth"},
  {...base,outcome:"victory"},
  {...base,summary:base.summary+" revised"},
  {...base,clock:base.clock+1},
 ]){
  assert.notEqual(api.warSourceReceiptFingerprintV146(modified,rules.metadata.sha256),fp);
 }
 assert.notEqual(api.warSourceReceiptFingerprintV146(base,"different source"),fp);
});

test("V146: after a V145 documentary import, the audit reports imported but no territory/XP effect",()=>{
 const source=complete("outer"),v85=war(),read=api.inspectWarSourcesV146(source.raw,v85,rules);
 assert.equal(read.proofs.length,1);
 const result=api.importWarProofV145(v85,source.raw,read.proofs[0].receiptKey,v85.revision,rules);
 assert.equal(result.accepted,true,result.message);
 const next=api.inspectWarSourcesV146(source.raw,result.state,rules);
 assert.equal(next.proofs.length,1);
 assert.equal(next.proofs[0].documentaryAlreadyImported,true);
 assert.equal(next.proofs[0].documentaryCanImport,false);
 assert.deepEqual(result.state.territories,v85.territories);
 assert.deepEqual(result.state.combatants,v85.combatants);
 assert.deepEqual(result.state.stocks,v85.stocks);
 assert.equal(next.allowTerritoryMutation,false);
 assert.equal(next.allowXpOrStockMutation,false);
});

test("V146: invalid sources and other planets cannot leak reports or mapping",()=>{
 const src=complete("stealth"),v85=war();
 for(const raw of ["", "{bad", "x".repeat(450001)]){
  const a=api.inspectWarSourcesV146(raw,v85,rules);
  assert.equal(a.status,"source-unavailable");
  assert.deepEqual(a.proofs,[]);
  assert.deepEqual(a.territories,[]);
 }
 const wrongSha={...src.done,sourceSha:"unknown"};
 const bad=api.inspectWarSourcesV146(JSON.stringify(wrongSha),v85,rules);
 assert.equal(bad.status,"source-unavailable");
 const elsewhere=api.WAR_PLANETS_V96.find(p=>p.id!=="korthas");
 assert.ok(elsewhere);
 const alienWar=api.createWarSimulationV85(undefined,elsewhere.id);
 const rejected=api.inspectWarSourcesV146(src.raw,alienWar,rules);
 assert.equal(rejected.status,"world-rejected");
 assert.deepEqual(rejected.proofs,[]);
 assert.equal(rejected.allowTerritoryMutation,false);
});

test("V146: anonymous W3 RTS independent map receipts are never silently converted to CON-T sovereignty",()=>{
 const launch=api.launchWarRtsSquadsV133(api.createWarRtsSquadsV133("W3-RTS01",rules));
 assert.equal(launch.accepted,true);
 const s=launch.state,unit=s.squads[0];
 const positioned={...s,squads:s.squads.map(u=>u.id===unit.id?{
  ...u,x:s.map.extraction.x,y:s.map.extraction.y}:u)};
 const done=api.commandWarRtsSquadsV133(positioned,{kind:"retreat",squadId:unit.id});
 assert.equal(done.accepted,true);
 const proof=api.auditWarRtsDebriefV144(done.state,rules).debriefs[0];
 assert.ok(proof.mapId&&proof.planetId);
 assert.equal(proof.campaignCandidateTerritoryId,null);
 assert.equal(proof.campaignMutation,false);
 const empty=api.inspectWarSourcesV146("",war(),rules);
 assert.equal(empty.proofs.length,0);
});
