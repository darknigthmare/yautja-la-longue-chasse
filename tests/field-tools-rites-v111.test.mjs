import assert from "node:assert/strict";
import test from "node:test";
import {build} from "esbuild";

const compiled = await build({
  stdin: {contents: `export * from "./app/game/save"; export * from "./app/game/systems/fieldToolsV111"; export * from "./app/game/systems/ritesOfHuntV77"; export * from "./app/game/systems/huntRitesRuntimeV77";`,
    resolveDir: process.cwd(), loader: "ts"},
  bundle: true, write: false, platform: "node", format: "esm", logLevel: "silent",
});
const api = await import("data:text/javascript;base64," + Buffer.from(compiled.outputFiles[0].text).toString("base64"));

test("a field tool is purchased once with clan marks and does not use either charged gear slot", () => {
  const save = api.defaultSave("2026-10-26T00:00:00.000Z");
  save.profile.clanMarks = 120;
  const before = structuredClone(save);
  const purchase = api.purchaseFieldToolV111(save, "flaying-tool");
  assert.equal(purchase.ok, true);
  assert.equal(purchase.spentClanMarks, 120);
  assert.equal(purchase.save.profile.clanMarks, 0);
  assert.deepEqual(purchase.save.inventory.fieldToolIds, ["flaying-tool"]);
  assert.deepEqual(purchase.save.loadout, before.loadout);
  assert.deepEqual(purchase.save.statistics, before.statistics);
  assert.deepEqual(purchase.save.trophies, before.trophies);
  assert.equal(purchase.save.profile.honor, before.profile.honor);
  assert.deepEqual(save, before, "the pure purchase must not mutate its caller");
  const repeat = api.purchaseFieldToolV111(purchase.save, "flaying-tool");
  assert.equal(repeat.ok, false);
  assert.equal(repeat.quote.failure, "already-owned");
  assert.equal(repeat.save, purchase.save);
});
test("unknown tools, invalid balances and insufficient funds never grant or debit anything", () => {
  for (const [id, balance, reason] of [
    ["missing-tool", 120, "unknown-tool"], ["flaying-tool", 119, "insufficient-clan-marks"],
    ["flaying-tool", NaN, "invalid-balance"], ["flaying-tool", -1, "invalid-balance"],
    ["flaying-tool", 120.5, "invalid-balance"],
  ]) {
    const save = api.defaultSave(); save.profile.clanMarks = balance;
    const result = api.purchaseFieldToolV111(save, id);
    assert.equal(result.ok, false); assert.equal(result.quote.failure, reason);
    assert.equal(result.save, save); assert.equal(result.spentClanMarks, 0);
    assert.deepEqual(result.save.inventory.fieldToolIds, []);
  }
});
test("save normalization preserves a purchased tool, deduplicates it, and grants none to older campaigns", () => {
  const save = api.defaultSave("2026-10-26T00:00:00.000Z");
  assert.deepEqual(save.inventory.fieldToolIds, []);
  delete save.inventory.fieldToolIds;
  assert.deepEqual(api.normalizeSave(save).inventory.fieldToolIds, []);
  for (const raw of [null, {}, "flaying-tool", ["unknown"]]) {
    save.inventory.fieldToolIds = raw;
    assert.deepEqual(api.normalizeSave(save).inventory.fieldToolIds, []);
  }
  save.inventory.fieldToolIds = ["flaying-tool", "unknown", "flaying-tool"];
  const normalized = api.normalizeSave(save);
  assert.deepEqual(normalized.inventory.fieldToolIds, ["flaying-tool"]);
  assert.deepEqual(api.parseSaveImport(JSON.stringify(normalized)).save.inventory.fieldToolIds, ["flaying-tool"]);
});
function scene() {
  const label = id => id === "armed-guard" ? "Garde armé" : id;
  const actors = [
    {id:"prey",archetype:"armed-guard",kind:"human",x:400,y:540,width:40,height:60,
      health:0,maxHealth:100,alive:false,active:true,boss:false,riteDefeatedAt:8},
    ...["early-witness","late-witness"].map(id=>({id,archetype:"armed-guard",kind:"human",x:460,y:540,width:40,height:60,
      health:100,maxHealth:100,alive:true,active:true,boss:false})),
  ];
  const player = {x:400,y:540,width:40,height:60,health:100};
  const options = {flayingToolOwned:true};
  let state = api.createRitesOfHuntV77("run", "jungle-vey");
  const context = api.riteRuntimeContextV77(state,player,actors,label,false,options);
  state = api.registerRitePreyV77(state, context.prey[0], context).state;
  return {state,context,actors,label,player,options};
}
function complete(state, action, context) {
  const started = api.startHuntRiteV77(state, "prey", action, context);
  assert.equal(started.accepted, true, started.message);
  let current = started.state;
  for(let i=0;i<100&&current.operation;i++) current = api.stepHuntRiteV77(current,.05,context).state;
  assert.equal(current.operation,null);
  return current;
}
const witness = id => ({id,kind:"human",position:{x:470,y:570},alive:true,lineOfSight:true});
test("the real runtime only unlocks flaying with a purchased tool and keeps suspension locked", () => {
  const {state,context,actors,label,player,options} = scene();
  const locked = api.riteRuntimeContextV77(state,player,actors,label,false);
  assert.equal(locked.flayingToolOwned,false);
  assert.equal(api.startHuntRiteV77(state,"prey","flay",locked).accepted,false);
  assert.equal(api.huntRiteMenuSnapshotV77(state,context.actor,"prey",true).canFlay,false);
  assert.equal(api.huntRiteMenuSnapshotV77(state,context.actor,"prey",true,options).canFlay,true);
  const flayed = complete(state,"flay",context);
  assert.equal(flayed.corpses[0].flayed,true);
  assert.equal(flayed.honorDelta,0);
  assert.equal(api.huntRiteMenuSnapshotV77(flayed,context.actor,"prey",true,options).canFlay,false);
  assert.deepEqual(context.supports,[]);
  assert.equal(api.startHuntRiteV77(flayed,"prey","hang",context).accepted,false);
});
test("damage or departure cancels flaying; pause preserves its exact unfinished progress", () => {
  const {state,context} = scene();
  const active = api.startHuntRiteV77(state,"prey","flay",context).state;
  const stepped = api.stepHuntRiteV77(active,.05,context).state;
  assert.equal(api.stepHuntRiteV77(stepped,.05,{...context,suspended:true}).state,stepped);
  for(const changed of [{health:99},{actor:{x:1000,y:600}},{flayingToolOwned:false}]) {
    const interrupted = api.stepHuntRiteV77(stepped,.05,{...context,...changed}).state;
    assert.equal(interrupted.operation,null);
    assert.equal(interrupted.corpses[0].flayed,false);
    assert.deepEqual(interrupted.completedEventIds,[]);
  }
});
test("marked and flayed discoveries retain their actual different fear through checkpoint restore", () => {
  const {state,context,actors,label,options} = scene();
  let current = complete(state,"mark",context);
  current = api.discoverHuntRiteV77(current,"prey",witness("early-witness"),context).state;
  current = complete(current,"flay",context);
  current = api.discoverHuntRiteV77(current,"prey",witness("late-witness"),context).state;
  assert.deepEqual(current.corpses[0].witnessFear,[8,20]);
  assert.equal(current.fear,28); assert.equal(current.awareness,16);
  assert.deepEqual(api.restoreRitesRuntimeV77(current,"run","jungle-vey",actors,30,label,options),current);
  assert.equal(api.restoreRitesRuntimeV77(current,"run","jungle-vey",actors,30,label),null);
  assert.equal(api.discoverHuntRiteV77(current,"prey",witness("late-witness"),context).state,current);
  for(const mutate of [
    copy=>copy.fear=40, copy=>copy.corpses[0].witnessFear=[20,20],
    copy=>copy.corpses[0].witnessFear=[8], copy=>copy.corpses[0].witnessFear=[8,35],
    copy=>copy.corpses[0].sourceEnemyId="forged",
  ]) {
    const copy=structuredClone(current);mutate(copy);
    assert.equal(api.restoreRitesRuntimeV77(copy,"run","jungle-vey",actors,30,label,options),null);
  }
});
test("legacy marks restore without a tool or invented historic corpses", () => {
  const {state,context,actors,label} = scene();
  let marked = complete(state,"mark",context);
  marked = api.discoverHuntRiteV77(marked,"prey",witness("early-witness"),context).state;
  delete marked.corpses[0].witnessFear;
  assert.deepEqual(api.restoreRitesRuntimeV77(marked,"run","jungle-vey",actors,30,label),marked);
  const legacy = api.restoreRitesRuntimeV77(undefined,"run","jungle-vey",actors,30,label);
  assert.deepEqual(legacy.corpses,[]);
});
test("an unfinished flaying gesture only resumes under the same real owner with the tool", () => {
  const {state,context,actors,label,options} = scene();
  const active = api.startHuntRiteV77(state,"prey","flay",context).state;
  assert.deepEqual(api.restoreRitesRuntimeV77(active,"run","jungle-vey",actors,30,label,options),active);
  assert.equal(api.restoreRitesRuntimeV77(active,"run","jungle-vey",actors,30,label),null);
  assert.equal(api.restoreRitesRuntimeV77(active,"foreign","jungle-vey",actors,30,label,options),null);
});
