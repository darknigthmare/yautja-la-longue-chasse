import assert from "node:assert/strict";
import test from "node:test";
import {build} from "esbuild";

const built=await build({stdin:{contents:[
 "export * from './app/game/systems/clanWarOperationsV115';",
 "export * from './app/game/systems/clanWarStealthReinforcementV144';",
 "export * from './app/game/systems/clanWarMissionTerrainV116';",
 "export * from './app/game/systems/clanWarBibleV6';",
].join("\n"),resolveDir:process.cwd()},bundle:true,write:false,
 platform:"node",format:"esm",target:"es2022",logLevel:"silent"});
const api=await import("data:text/javascript;base64,"+Buffer.from(built.outputFiles[0].text).toString("base64"));
const rules=api.DEFAULT_WAR_RULES_V6;
function mission(){
 const state=api.createWarOperationsV115(rules),team=state.teams[0].id;
 const territory=rules.territories.find(t=>t.id!==state.baseId&&
  !api.warMissionEligibleV115(state,rules,t.id,[team]));
 const result=api.beginWarOperationV115(state,"stealth",territory.id,[team],rules,1000);
 assert.equal(result.accepted,true,result.message);
 return result.state;
}
function addLegacy(state){
 const s=state.active.stealth,terrain=api.warMissionTerrainV116(state.active.targetId,rules);
 for(let y=1;y<=3;y++)for(let x=4;x<=7;x++){
  if(api.warTerrainCellBlockedV116(terrain,x,y)||x===s.guardX&&y===(s.guardY??2))continue;
  return {...state,active:{...state.active,stealth:{...s,secondGuard:{guardX:x,guardY:y,guardDirection:-1}}}};
 }
 assert.fail("source territory needs a second guard tile");
}
test("PR57 archive becomes canonical PR56 guard without losing location or old archives",()=>{
 const original=mission(),legacy=addLegacy(original),old=legacy.active.stealth.secondGuard;
 assert.ok(api.readWarOperationsV115(JSON.stringify(original),rules));
 const loaded=api.readWarOperationsV115(JSON.stringify(legacy),rules);
 assert.deepEqual(loaded.active.stealth.supportGuard,{x:old.guardX,y:old.guardY,direction:old.guardDirection});
 assert.equal(loaded.active.stealth.reinforcementIssued,true);
 assert.equal("secondGuard" in loaded.active.stealth,false);
 assert.deepEqual(api.readWarOperationsV115(JSON.stringify(loaded),rules),loaded);
});
test("conflicting or invalid legacy guard archives are refused without rewriting caller data",()=>{
 const legacy=addLegacy(mission()),s=legacy.active.stealth;
 const conflict={...legacy,active:{...legacy.active,stealth:{...s,reinforcementIssued:true,
  supportGuard:{x:s.secondGuard.guardX,y:s.secondGuard.guardY,direction:1}}}};
 const raw=JSON.stringify(conflict);
 assert.equal(api.readWarOperationsV115(raw,rules),null);
 assert.equal(JSON.stringify(conflict),raw);
 const bad={...legacy,active:{...legacy.active,stealth:{...s,secondGuard:{...s.secondGuard,guardY:99}}}};
 assert.equal(api.readWarOperationsV115(JSON.stringify(bad),rules),null);
});
test("reinforcement never appears within two steps of the player",()=>{
 const base=mission(),staged={...base,active:{...base.active,stealth:{...base.active.stealth,alarm:1}}};
 const outcome=api.commandWarStealthAlertReinforcementV144(staged,rules);
 assert.equal(outcome.accepted,true,outcome.message);
 const s=outcome.state.active?.stealth;
 assert.ok(s);
 assert.ok(Math.abs(s.supportGuard.x-s.x)+Math.abs(s.supportGuard.y-s.y)>=2);
});
test("automatic diversion rule is opt-in, persistent and spawns only one local guard",()=>{
 const initial=mission();
 const chosen=api.setStealthReinforcementMode(initial,rules,"decoy");
 assert.equal(chosen.accepted,true);
 assert.equal(chosen.state.clock,initial.clock);
 const loaded=api.readWarOperationsV115(JSON.stringify(chosen.state),rules);
 assert.equal(loaded.active.stealth.reinforcementMode,"decoy");
 const s=loaded.active.stealth;
 const beforeDecoy={...loaded,active:{...loaded.active,stealth:{...s,alarm:1}}};
 assert.equal(api.commandWarStealthAlertReinforcementV144(beforeDecoy,rules).accepted,false);
 const alerted={...loaded,active:{...loaded.active,stealth:{...s,alarm:1,decoyUsed:true}}};
 const result=api.commandStealthV115(alerted,"wait",rules);
 assert.equal(result.accepted,true,result.message);
 assert.ok(result.state.active.stealth.supportGuard);
 assert.equal(result.state.active.stealth.reinforcementIssued,true);
 assert.equal(api.setStealthReinforcementMode(result.state,rules,"manual").accepted,false);
 assert.equal(api.commandWarStealthAlertReinforcementV144(result.state,rules).accepted,false);
 const manual={...initial,active:{...initial.active,stealth:{...initial.active.stealth,alarm:1,decoyUsed:true}}};
 const old=api.commandStealthV115(manual,"wait",rules);
 assert.equal(old.state.active.stealth.supportGuard,undefined);
});
