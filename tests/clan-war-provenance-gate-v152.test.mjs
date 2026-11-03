import assert from "node:assert/strict";
import test from "node:test";
import {build} from "esbuild";

const result=await build({stdin:{contents:[
 "export * from './app/game/systems/clanWarProvenanceGateV152';",
 "export * from './app/game/systems/clanWarCouncilAuditV146';",
 "export * from './app/game/systems/clanWarOperationsV115';",
 "export * from './app/game/systems/clanWarRtsSquadsV133';",
 "export * from './app/game/systems/clanWarBibleV6';",
 "export * from './app/game/systems/clanWarV85';",
 "export * from './app/game/systems/clanWarPlanetsV96';",
 "export * from './app/game/systems/clanWarRtsSourceMissionsV129';",
].join("\n"),resolveDir:process.cwd()},bundle:true,write:false,
 platform:"node",format:"esm",target:"es2022",logLevel:"silent"});
const api=await import("data:text/javascript;base64,"+
 Buffer.from(result.outputFiles[0].text).toString("base64"));
const rules=api.DEFAULT_WAR_RULES_V6;

function complete(mode){
 const state=api.createWarOperationsV115(rules),team=state.teams[0].id;
 const territory=rules.territories.find(t=>t.id!==state.baseId&&
   !api.warMissionEligibleV115(state,rules,t.id,[team]));
 assert.ok(territory,"source V6 route missing");
 const start=api.beginWarOperationV115(state,mode,territory.id,[team],rules,1000);
 assert.equal(start.accepted,true,start.message);
 let next;
 if(mode==="outer"){
  const order=start.state.outer[0];
  const done=api.settleWarOuterOpsV115(start.state,order.dueAt,rules);
  assert.equal(done.accepted,true,done.message);next=done.state;
 }else{
  const done=api.leaveWarOperationV115(start.state,rules);
  assert.equal(done.accepted,true,done.message);next=done.state;
 }
 assert.equal(next.reports.length,1);
 return {raw:JSON.stringify(next),state:next,team,territory:territory.id};
}
function completedW3(){
 const original=api.createWarRtsSquadsV133("W3-RTS01",rules);
 const start=api.launchWarRtsSquadsV133(original);
 assert.equal(start.accepted,true,start.message);
 const s=start.state,ally=s.squads[0];
 const staged={...s,squads:s.squads.map(u=>u.id===ally.id?
  {...u,x:s.map.extraction.x,y:s.map.extraction.y}:u)};
 const done=api.commandWarRtsSquadsV133(staged,{kind:"retreat",squadId:ally.id});
 assert.equal(done.accepted,true,done.message);
 return done.state;
}

test("V152: no source requires explicit read and produces no secret information or V85 write",()=>{
 const world=api.createWarSimulationV85(),before=JSON.stringify(world);
 const audit=api.reviewWarProvenanceV152(null,world,rules);
 assert.equal(audit.status,"no-source");
 assert.deepEqual(audit.dossiers,[]);
 assert.deepEqual(audit.territoryChecks,[]);
 assert.equal(audit.canConquer,false);
 assert.equal(audit.canTransferTroops,false);
 assert.equal(audit.serverAuthenticated,false);
 assert.equal(JSON.stringify(world),before);
});

test("V152: exact W3-K vs CON-T comparison never silently joins matching suffixes",()=>{
 const world=api.createWarSimulationV85();
 const data=api.compareWarTerritoriesV152(rules,world);
 assert.equal(data.length,rules.territories.length);
 assert.ok(data.length>=24);
 assert.equal(new Set(data.map(d=>d.sourceId)).size,data.length);
 assert.ok(data.every(d=>d.sourceId.startsWith("W3-K")));
 assert.ok(data.every(d=>d.status==="no-id-match"&&d.strategicId===null));
 assert.ok(data.every(d=>d.verifiedCoordinates===false&&d.mayConquer===false));
 assert.ok(data.some(d=>/^W3-K0[1-9]$/.test(d.sourceId)));
});

test("V152: even matching ID, name and region is a candidate, NOT authoritative sovereignty",()=>{
 const world=api.createWarSimulationV85();
 const destination=api.warTerritoriesForSimulationV96(world)[0];
 const fake={...rules,territories:[{...rules.territories[0],
  id:destination.id,name:destination.name,region:destination.region}]};
 const comparison=api.compareWarTerritoriesV152(fake,world)[0];
 assert.equal(comparison.strategicId,destination.id);
 assert.equal(comparison.status,"id-name-region-match-unverified");
 assert.equal(comparison.mayConquer,false);
 const changed={...fake,territories:[{...fake.territories[0],name:"unrelated site"}]};
 assert.equal(api.compareWarTerritoriesV152(changed,world)[0].status,"id-conflict-unverified");
});

test("V152: all four completed V115 game modes are documentary, not a live campaign result",()=>{
 const before=api.createWarSimulationV85(),start=JSON.stringify(before);
 for(const mode of ["assault","outer","stealth","rts"]){
  const source=complete(mode);
  const audit=api.reviewWarProvenanceV152(source.raw,before,rules);
  assert.equal(audit.status,"local-evidence-only");
  assert.deepEqual(audit.issues,[]);
  assert.equal(audit.dossiers.length,1,mode);
  const dossier=audit.dossiers[0];
  assert.equal(dossier.mode,mode);
  assert.equal(dossier.sourceType,"V115-exercise");
  assert.equal(dossier.sourceSha,rules.metadata.sha256);
  assert.equal(dossier.sourceTargetId,source.territory);
  assert.equal(dossier.casualtyCount,source.state.reports[0].woundedIds.length);
  assert.equal(dossier.mayModifyV85,false);
  assert.equal(dossier.mayClaimFilmFidelity,false);
  assert.ok(dossier.blockerCodes.includes("NO_SIGNED_SERVER_MATCH"));
  assert.ok(dossier.blockerCodes.includes("NO_VERIFIED_GEOGRAPHIC_MAPPING"));
  assert.ok(dossier.blockerCodes.includes("NO_VALIDATED_CHARACTER_IDENTITY"));
  assert.equal(audit.dossierCounts[mode],1);
  assert.equal(audit.canConquer,false);
  assert.equal(audit.canAwardXp,false);
  assert.equal(audit.canUpdateWounds,false);
  assert.equal(audit.roster.matchedPersons,0);
  assert.equal(audit.roster.v115Teams,source.state.teams.length);
  assert.deepEqual(api.reviewWarProvenanceV152(source.raw,before,rules),audit,
   "source-only read should be deterministic");
 }
 assert.equal(JSON.stringify(before),start,"no world mutation");
});

test("V152: identical person IDs are a collision warning, not authorization to transfer a casualty",()=>{
 const ops=complete("stealth").state,world=api.createWarSimulationV85();
 const initial=api.compareWarPersonIdentitiesV152(ops,world);
 assert.equal(initial.matchedPersons,0);
 assert.equal(initial.mayTransferInjuries,false);
 if(world.combatants.length){
  const spoof=structuredClone(ops);
  spoof.teams[0].members[0].id=world.combatants[0].id;
  const alert=api.compareWarPersonIdentitiesV152(spoof,world);
  assert.deepEqual(alert.duplicateIdentifiers,[world.combatants[0].id]);
  assert.equal(alert.matchedPersons,0);
  assert.equal(alert.mayTransferXp,false);
 }
});

test("V152: malformed foreign archive, source SHA tampering and oversized payload all reject",()=>{
 const world=api.createWarSimulationV85(),source=complete("outer");
 for(const raw of ["{invalid", "x".repeat(450001),
                  JSON.stringify({...source.state,sourceSha:"forged"})]){
  const audit=api.reviewWarProvenanceV152(raw,world,rules);
  assert.equal(audit.status,"source-invalid");
  assert.deepEqual(audit.dossiers,[]);
  assert.equal(audit.canConquer,false);
 }
});

test("V152: a Korthas practice debrief cannot enter a different strategic planet",()=>{
 const planet=api.WAR_PLANETS_V96.find(p=>p.id!=="korthas");
 assert.ok(planet,"multiple source planets expected");
 const other=api.createWarSimulationV85(undefined,planet.id);
 const source=complete("assault");
 const audit=api.reviewWarProvenanceV152(source.raw,other,rules);
 assert.equal(audit.status,"world-incompatible");
 assert.deepEqual(audit.dossiers,[]);
 assert.equal(audit.canConquer,false);
});

test("V152: actual W133 source study stays on its planet and cannot become Korthas sovereignty",()=>{
 const rts=completedW3(),world=api.createWarSimulationV85();
 const audit=api.reviewWarProvenanceV152(null,world,rules,rts);
 assert.equal(audit.status,"local-evidence-only");
 assert.equal(audit.dossierCounts.rts,1);
 const dossier=audit.dossiers[0];
 assert.equal(dossier.sourceType,"W133-source-study");
 assert.equal(dossier.sourceTargetId,rts.mission.id);
 assert.equal(dossier.sourcePlanetId,rts.map.planetId);
 assert.equal(dossier.mayModifyV85,false);
 assert.equal(dossier.completedTaskIds.length,rts.report.completedTaskIds.length);
 assert.equal(audit.canConquer,false);
 assert.equal(audit.serverAuthenticated,false);
});

test("V152: modifying the map along with its receipt does not qualify as source-checked",()=>{
 const rts=completedW3(),world=api.createWarSimulationV85();
 const invalid={...rts,map:{...rts.map,
  tiles:rts.map.tiles.map((t,i)=>i===0?{...t,cover:!t.cover}:t)}};
 const audit=api.reviewWarProvenanceV152(null,world,rules,invalid);
 assert.equal(audit.dossiers.length,0);
 assert.equal(audit.dossierCounts.rts,0);
 assert.ok(audit.issues.some(e=>/W133|source/i.test(e)));
 assert.equal(audit.canConquer,false);
});

test("V152: all 24 W3 missions and 72 source tasks remain available",()=>{
 const audit=api.auditWarRtsSquadsV133(rules);
 assert.equal(audit.missions,24);
 assert.equal(audit.steps,72);
 assert.deepEqual(audit.issues,[]);
});
