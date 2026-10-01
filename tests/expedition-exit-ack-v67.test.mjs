import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import ts from 'typescript';
import { runInNewContext } from 'node:vm';

// Execute the actual component delivery callback: the report transaction succeeds,
// but the following connector write refuses once. Neither input nor result is replaced.
for(const [file,proofName,nearestName] of [['HomeworldExpedition','ashMarchesCompletion','nearestAshPoint'],['GlassDesertExpedition','glassDesertCompletion','nearestGlassPoint']]){
 test(file+': a failed second write leaves a retry instead of an endless saving dialog',async()=>{
  const source=readFileSync('app/game/'+file+'.tsx','utf8'),tree=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);let implementation;
  function visit(node){if(ts.isVariableDeclaration(node)&&node.name.getText(tree)==='deliver')implementation=node.initializer.arguments[0];ts.forEachChild(node,visit);}visit(tree);assert(implementation);
  let delivery,refuse=true,reportCalls=0,exitCalls=0;
  const env={deliveryBusy:{current:false},stateRef:{current:{}},mounted:{current:true},clearInputs(){},setDelivery(next){delivery=next;},[proofName]:()=>({regionId:file}),[nearestName]:()=>({id:'extraction'}),async onComplete(){reportCalls++;return {persisted:true};},onExit(){exitCalls++;return !refuse;}};
  const js=ts.transpileModule(`const handler=${implementation.getText(tree)};`,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
  const deliver=runInNewContext(`(()=>{${js};return handler;})()`,env);
  await deliver();assert.equal(delivery.status,'failed');assert.match(delivery.message,/rapport est sauvegardé/);assert.equal(env.deliveryBusy.current,false);
  refuse=false;await deliver();assert.equal(reportCalls,2);assert.equal(exitCalls,2);assert.equal(env.deliveryBusy.current,false);
 });
}
