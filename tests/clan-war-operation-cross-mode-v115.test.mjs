import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";

const bundle = await build({
  stdin: { contents: "export * from './app/game/systems/clanWarOperationsV115'; export * from './app/game/systems/clanWarBibleV6';", resolveDir: process.cwd() },
  bundle: true, write: false, format: "esm", platform: "node", target: "es2022", logLevel: "silent",
});
const api = await import("data:text/javascript;base64," + Buffer.from(bundle.outputFiles[0].text).toString("base64"));
const rules = api.DEFAULT_WAR_RULES_V6;
test("reconnaissance, sabotage, pressure and escorts visibly affect other V115 formats",()=>{
  const s=api.createWarOperationsV115(rules);
  const t=s.teams[0].id, target=rules.territories.find(v=>v.id!==s.baseId && !api.warMissionEligibleV115(s,rules,v.id,[t]))?.id;
  assert.ok(target,"a real V6 route must exist");
  const staged={...s,intelIds:[target],weakenedIds:[target],escortedIds:[target],pressure:{[target]:2}};
  const side=api.beginWarOperationV115(staged,"assault",target,[t],rules,1000);
  assert.equal(side.accepted,true);
  assert.equal(side.state.active.assault.ap,36);
  assert.equal(side.state.active.assault.rivalBase,62);
  const p=api.beginWarOperationV115(staged,"rts",target,[t],rules,1000);
  const v=api.beginWarOperationV115(s,"rts",target,[t],rules,1000);
  assert.equal(p.accepted,true);
  assert.ok(p.state.active.rts.actors.find(a=>a.side==="rival").hp < v.state.active.rts.actors.find(a=>a.side==="rival").hp);
  const a=api.beginWarOperationV115(s,"outer",target,[t],rules,1000);
  const b=api.beginWarOperationV115(staged,"outer",target,[t],rules,1000);
  assert.equal(a.state.outer[0].dueAt-b.state.outer[0].dueAt,10000);
});
