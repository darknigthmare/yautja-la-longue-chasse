import assert from "node:assert/strict";
import test from "node:test";
import {build} from "esbuild";

const bundle=await build({stdin:{contents:[
 "export * from './app/game/systems/clanWarAssaultContactV141';",
 "export * from './app/game/systems/clanWarOperationsV115';",
 "export * from './app/game/systems/clanWarOuterPaceV144';",
 "export * from './app/game/systems/clanWarStealthReinforcementV144';",
 "export * from './app/game/systems/clanWarCouncilAuditV146';",
 "export * from './app/game/systems/clanWarBibleV6';",
].join("\n"),resolveDir:process.cwd()},bundle:true,write:false,
 platform:"node",format:"esm",target:"es2022",logLevel:"silent"});
const api=await import("data:text/javascript;base64,"+Buffer.from(bundle.outputFiles[0].text).toString("base64"));
const rules=api.DEFAULT_WAR_RULES_V6;
const unit=rules.units.find(u=>u.fullMembers>0&&u.attack>0);
assert.ok(unit,"The V6 Bible must contain a living assault unit");
const actor=(id,side,x,hp)=>({id,teamId:side==="ally"?id:null,unitId:unit.id,side,x,hp});
function run(actors,protect=true,tick=1) {
 return api.warAssaultContactV141(actors,rules,{},tick,{}, {},protect?
  {LEAD:{guardianTeamId:"GUARD",expiresAtTick:3}}:{});
}
test("V147 assault: one-HP guardian cannot swallow three simultaneous damage transfers",()=>{
 const actors=[
  actor("GUARD","ally",10,1),actor("LEAD","ally",13,30),
  actor("RIVAL-A","rival",14,30),
  actor("RIVAL-B","rival",15,30),
  actor("RIVAL-C","rival",16,30),
 ];
 const normal=run(actors,false),guarded=run(actors,true);
 const get=(value,id)=>value.actors.find(a=>a.id===id);
 const heal=get(guarded,"LEAD").hp-get(normal,"LEAD").hp;
 assert.equal(heal,1,"only one actual HP capacity can be transferred");
 assert.equal(get(guarded,"GUARD").hp,0);
 assert.equal(get(guarded,"GUARD").hp+get(guarded,"LEAD").hp,
  get(normal,"GUARD").hp+get(normal,"LEAD").hp,
  "No injury point may disappear when the guardian is down");
 assert.equal(actors[0].hp,1,"Input roster must remain immutable");
});
test("V147 assault: reversing actor insertion order leaves effective damage unchanged",()=>{
 const actors=[
  actor("GUARD","ally",10,1),actor("LEAD","ally",13,30),
  actor("RIVAL-A","rival",14,30),
  actor("RIVAL-B","rival",15,30),
  actor("RIVAL-C","rival",16,30),
 ];
 const stable=run(actors,true),reverse=run([...actors].reverse(),true);
 const byId=x=>Object.fromEntries(x.actors.map(a=>[a.id,{hp:a.hp,x:a.x}]));
 assert.deepEqual(byId(stable),byId(reverse));
 assert.equal(stable.ownBaseDamage,reverse.ownBaseDamage);
 assert.equal(stable.rivalBaseDamage,reverse.rivalBaseDamage);
});
test("V147 assault: old two-team protection and expiry remain possible without free HP",()=>{
 const guard=actor("GUARD","ally",10,30);
 const lead=actor("LEAD","ally",12,30);
 const rival=actor("RIVAL","rival",13,30);
 const fresh=run([guard,lead,rival],true,1);
 const late=run([guard,lead,rival],true,4);
 const unprotected=run([guard,lead,rival],false,1);
 const hp=(result,id)=>result.actors.find(u=>u.id===id).hp;
 assert.equal(hp(fresh,"LEAD")-hp(unprotected,"LEAD"),1);
 assert.equal(hp(unprotected,"LEAD"),hp(late,"LEAD"));
 assert.equal(api.createWarOperationsV115(rules).context,"free");
});
test("V147 cross-mode: source V6, closed receipts and V85 write protection are preserved",()=>{
 const base=api.createWarOperationsV115(rules);
 const id=base.teams[0].id;
 const territory=rules.territories.find(t=>t.id!==base.baseId&&
  !api.warMissionEligibleV115(base,rules,t.id,[id]));
 assert.ok(territory);
 const begun=api.beginWarOperationV115(base,"outer",territory.id,[id],rules,1000);
 assert.equal(begun.accepted,true,begun.message);
 const mission=begun.state.outer[0];
 const pace=api.commandWarOuterPaceV144(begun.state,mission.id,mission.startedAt,rules);
 assert.equal(pace.accepted,true,pace.message);
 assert.equal(pace.state.rav,begun.state.rav-3);
 assert.equal(pace.state.outer[0].dueAt,mission.dueAt-8000);
 assert.ok(api.readWarOperationsV115(JSON.stringify(pace.state),rules));
 const audit=api.buildWarCouncilAuditV146(pace.state,null,rules);
 assert.equal(audit.total,0,"No prematurely completed Council dossier");
 assert.equal(audit.campaignMutation,false);
});
