import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import {purchaseFieldToolV111} from "../app/game/systems/fieldToolsV111.ts";

const source = await readFile(new URL("../app/game/GameClient.tsx", import.meta.url), "utf8");
const ast = ts.createSourceFile("GameClient.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
function callback(name, bindings) {
  let found;
  function visit(node) {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === name) found = node;
    ts.forEachChild(node, visit);
  }
  visit(ast);
  assert.ok(found && ts.isCallExpression(found.initializer), name + " must be a real callback");
  const expression = found.initializer.arguments[0];
  assert.ok(expression && (ts.isArrowFunction(expression) || ts.isFunctionExpression(expression)));
  const compiled = ts.transpileModule("(" + expression.getText(ast) + ")", {
    compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext},
    fileName:"callback.ts",reportDiagnostics:true,
  });
  assert.deepEqual((compiled.diagnostics ?? []).filter(item=>item.category===ts.DiagnosticCategory.Error),[]);
  return vm.runInNewContext(compiled.outputText, bindings);
}
const plain = value => JSON.parse(JSON.stringify(value));
const saved = (balance=240) => ({
  createdAt:"2026-10-26T00:00:00.000Z",
  profile:{clanMarks:balance,honor:0,rankId:"young-blood"},
  inventory:{fieldToolIds:[],unlockedGearIds:["motion-sensor","audio-decoy"]},
  loadout:{gearIds:["motion-sensor","audio-decoy"]},
  statistics:{totalKills:7},
});
function handlerHarness({balance=240,confirm=true}={}) {
  const saveRef={current:saved(balance)}, original=saveRef.current, updates=[],toasts=[],sounds=[];
  const handler=callback("purchasePermanentFieldTool",{
    saveRef,purchaseFieldToolV111,setToast:value=>toasts.push(value),playSound:value=>sounds.push(value),
    persistSocialProgress(update) {
      updates.push(plain(update));
      if(!confirm)return false;
      saveRef.current={...saveRef.current,...update};
      return true;
    },
  });
  return {handler,saveRef,original,updates,toasts,sounds};
}
test("a refused purchase acknowledgement never announces acquisition or grants a tool",()=>{
  const h=handlerHarness({confirm:false});h.handler("flaying-tool");
  assert.equal(h.saveRef.current,h.original);
  assert.deepEqual(h.saveRef.current.inventory.fieldToolIds,[]);
  assert.equal(h.saveRef.current.profile.clanMarks,240);
  assert.equal(h.updates.length,1);
  assert.deepEqual(Object.keys(h.updates[0]).sort(),["inventory","profile"]);
  assert.deepEqual(h.updates[0].inventory.fieldToolIds,["flaying-tool"]);
  assert.equal(h.updates[0].profile.clanMarks,120);
  assert.match(h.toasts.at(-1),/Achat non confirmé/);
  assert.equal(h.toasts.some(value=>/acquis pour/.test(value)),false);
  assert.deepEqual(h.sounds,[]);
});
test("the same pre-render purchase closure reads the updated ref and debits exactly once",()=>{
  const h=handlerHarness();const sameHandler=h.handler;
  sameHandler("flaying-tool");sameHandler("flaying-tool");
  assert.equal(h.updates.length,1);
  assert.equal(h.saveRef.current.profile.clanMarks,120);
  assert.deepEqual(h.saveRef.current.inventory.fieldToolIds,["flaying-tool"]);
  assert.deepEqual(h.saveRef.current.loadout,h.original.loadout);
  assert.deepEqual(h.saveRef.current.statistics,h.original.statistics);
  assert.equal(h.toasts.filter(value=>/acquis pour/.test(value)).length,1);
  assert.match(h.toasts.at(-1),/déjà acquis/);
  assert.deepEqual(h.sounds,["select"]);
});
test("the UI refuses unknown tools or insufficient funds before persistence",()=>{
  for(const [id,balance] of [["unknown",240],["flaying-tool",119],["flaying-tool",NaN]]) {
    const h=handlerHarness({balance});h.handler(id);
    assert.equal(h.saveRef.current,h.original);
    assert.equal(h.updates.length,0);
    assert.deepEqual(h.sounds,[]);
    assert.equal(h.toasts.some(value=>/acquis pour/.test(value)),false);
  }
});
function persistenceHarness() {
  const saveRef={current:saved()},pendingSocialWriteRef={current:null};
  const sessionAliveRef={current:true},pendingTrophyCommitRef={current:null},pendingTerminalRunRef={current:null};
  const activeHuntSessionRef={current:null},writes=[],toasts=[],reactSaves=[],failures=[],sounds=[];
  let confirmWrite=false,reconcileStatus="confirmed";
  const persist=callback("persistSocialProgress",{
    saveRef,pendingSocialWriteRef,sessionAliveRef,pendingTrophyCommitRef,pendingTerminalRunRef,activeHuntSessionRef,
    setToast:value=>toasts.push(value),setSaveFailure:value=>failures.push(value),setSave:value=>reactSaves.push(value),
    reconcileSaveWrite(attempt,owner) {
      assert.equal(owner,attempt.save.createdAt);
      return reconcileStatus==="confirmed"?{status:"confirmed",save:attempt.save}:{status:"refused",failure:"save-conflict"};
    },
    writeSaveWithStatus(next) {
      writes.push(plain(next));
      return {save:next,persisted:confirmWrite,failure:confirmWrite?null:"write-failed"};
    },
    isExplorationMission:()=>false,reconcileHuntWrite:()=>null,
    explorationWriteFailure:()=>assert.fail("no active exploration was provided"),
  });
  const handler=callback("purchasePermanentFieldTool",{
    saveRef,purchaseFieldToolV111,persistSocialProgress:persist,setToast:value=>toasts.push(value),playSound:value=>sounds.push(value),
  });
  return {persist,handler,saveRef,pendingSocialWriteRef,sessionAliveRef,pendingTrophyCommitRef,pendingTerminalRunRef,writes,toasts,reactSaves,failures,sounds,
    setConfirm:value=>{confirmWrite=value;},setReconcileStatus:value=>{reconcileStatus=value;}};
}
test("a pending purchase reconciles the exact inventory and profile without a second primary write",()=>{
  const h=persistenceHarness(),before=h.saveRef.current;
  h.handler("flaying-tool");
  assert.equal(h.saveRef.current,before);
  assert.equal(h.writes.length,1);
  assert.deepEqual(h.sounds,[]);
  const pending=h.pendingSocialWriteRef.current;
  assert.ok(pending);
  const update=JSON.parse(pending.updateSerialized);
  assert.deepEqual(Object.keys(update).sort(),["inventory","profile"]);
  assert.deepEqual(update.inventory.fieldToolIds,["flaying-tool"]);
  assert.equal(update.profile.clanMarks,120);
  h.handler("flaying-tool");
  assert.equal(h.pendingSocialWriteRef.current,null);
  assert.equal(h.writes.length,1);
  assert.equal(h.saveRef.current.profile.clanMarks,120);
  assert.deepEqual(plain(h.saveRef.current.inventory.fieldToolIds),["flaying-tool"]);
  assert.equal(h.reactSaves.length,1);
  assert.deepEqual(h.sounds,["select"]);
  h.handler("flaying-tool");
  assert.equal(h.writes.length,1);
  assert.equal(h.saveRef.current.profile.clanMarks,120);
  assert.deepEqual(h.sounds,["select"]);
});
test("pending updates with identical balances but different inventory cannot be mistaken for the same purchase",()=>{
  const h=persistenceHarness();
  const bought=purchaseFieldToolV111(h.saveRef.current,"flaying-tool").save;
  assert.equal(h.persist({profile:bought.profile,inventory:bought.inventory}),false);
  const differentInventory={...bought.inventory,fieldToolIds:[]};
  assert.equal(h.persist({profile:bought.profile,inventory:differentInventory}),false);
  assert.equal(h.writes.length,1,"recovery must not write a stale inventory over the confirmed purchase");
  assert.equal(h.saveRef.current.profile.clanMarks,120);
  assert.deepEqual(plain(h.saveRef.current.inventory.fieldToolIds),["flaying-tool"]);
  assert.match(h.toasts.at(-1),/dossier actualisé/);
});
test("an unresolved pending write or another campaign transaction cannot falsely confirm acquisition",()=>{
  const h=persistenceHarness();h.handler("flaying-tool");
  h.setReconcileStatus("refused");h.handler("flaying-tool");
  assert.equal(h.writes.length,1);
  assert.deepEqual(h.saveRef.current.inventory.fieldToolIds,[]);
  assert.deepEqual(h.sounds,[]);
  assert.ok(h.pendingSocialWriteRef.current);
  for(const guard of ["sessionAliveRef","pendingTrophyCommitRef","pendingTerminalRunRef"]) {
    const g=persistenceHarness();g.setConfirm(true);
    g[guard].current=guard==="sessionAliveRef"?false:{pending:true};
    g.handler("flaying-tool");
    assert.equal(g.writes.length,0);
    assert.deepEqual(g.saveRef.current.inventory.fieldToolIds,[]);
    assert.deepEqual(g.sounds,[]);
  }
});
