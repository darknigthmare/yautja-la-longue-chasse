import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {build} from "esbuild";
const root=fileURLToPath(new URL("../",import.meta.url));
const read=path=>readFileSync(root+path,"utf8");
const built=await build({stdin:{contents:[
 "export * from './app/game/systems/clanWarOperationsV115';",
 "export * from './app/game/systems/clanWarBibleV6';"
].join("\n"),resolveDir:root},bundle:true,write:false,format:"esm",platform:"node",logLevel:"silent"});
const api=await import("data:text/javascript;base64,"+Buffer.from(built.outputFiles[0].text).toString("base64"));
const rules=api.DEFAULT_WAR_RULES_V6;
const findLegal=(state)=>{const team=state.teams[0].id;return {
 team,target:rules.territories.find(site=>site.id!==state.baseId&&
  !api.warMissionEligibleV115(state,rules,site.id,[team]))?.id
};};
test("V150 V115 contact and Outer Ops forced pace coexist without overwriting mission contexts",()=>{
 const first=api.createWarOperationsV115(rules);
 const {team,target}=findLegal(first);
 assert.ok(team&&target);
 const stealth=api.beginWarOperationV115(first,"stealth",target,[team],rules,1000);
 assert.equal(stealth.accepted,true,stealth.message);
 assert.equal(stealth.state.active.mode,"stealth");
 assert.equal(stealth.state.active.stealth.guardInvestigation,undefined);
 const original=JSON.stringify(stealth.state);
 assert.equal(api.readWarOperationsV115(original,rules)?.active?.mode,"stealth");
 const outer=api.beginWarOperationV115(first,"outer",target,[team],rules,2000,"recon");
 assert.equal(outer.accepted,true,outer.message);
 assert.equal(outer.state.outer.length,1);
 assert.equal(outer.state.active,null);
 assert.equal(api.readWarOperationsV115(JSON.stringify(outer.state),rules)?.outer.length,1);
 assert.equal(JSON.stringify(stealth.state),original,"Outer Ops must not mutate a stealth archive");
 assert.equal(outer.state.rav,stealth.state.rav,"Same team should pay exactly one identical RAV mission debit");
});
test("V150 source guards still bind persistent V115 writes to Web Lock and do not trust a stale reset",()=>{
 const src=read("app/game/ClanWarOperationsV115.tsx");
 const engine=read("app/game/systems/clanWarOperationsV115.ts");
 assert.match(src,/guardVisible&&stealth.guardInvestigation/);
 assert.match(src,/Web Lock|navigator.locks|request\(/);
 assert.match(src,/verifyOwnV115ArchiveV148|knownArchiveBytesRef/);
 assert.match(engine,/guardInvestigation\?:\{x:number;y:number;turns:number\}/);
 assert.match(engine,/decoyTarget\?\?memoryTarget/);
 assert.match(engine,/if\(primarySeen\)investigation=\{x,y,turns:2\}/);
 assert.match(engine,/guardInvestigation:investigation/);
 assert.match(engine,/v1.guardInvestigation.turns<1\|\|v1.guardInvestigation.turns>2/);
 assert.match(engine,/force|pace|Outer|outer/);
});
