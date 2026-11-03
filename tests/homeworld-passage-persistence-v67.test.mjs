import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import { homeworldQaModelV64 } from '../scripts/homeworld-qa-model-v64.mjs';
const api=homeworldQaModelV64(process.cwd(),['homeworldPassageV67.ts','homeworldArrivalV67.ts','homeworldCity.ts','../save.ts']);
const source=readFileSync('app/game/GameClient.tsx','utf8'),tree=ts.createSourceFile('GameClient.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
function callback(name,env){let fn;function visit(node){if(ts.isVariableDeclaration(node)&&node.name.getText(tree)===name)fn=node.initializer.arguments[0];ts.forEachChild(node,visit);}visit(tree);assert(fn);const js=ts.transpileModule(`const handler=${fn.getText(tree)};`,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;return runInNewContext(`(()=>{${js};return handler;})()`,env);}
function fixture(){
 const save=api.defaultSave('2026-10-01T00:00:00.000Z');save.homeworld.evidenceIds=['suspect-trophy'];
 const values=new Map(),key='passage-test';const storage={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};
 let blocked=false; const initial=api.writeSaveWithStatus(save,storage,key);assert(initial.persisted);
 const env={...api,globalThis:{crypto:{randomUUID:()=> 'journey-v67-test'}},entry:{ownerCreatedAt:save.createdAt},sessionAliveRef:{current:true},expeditionOwnerRef:{current:null},saveRef:{current:initial.save},screens:[],setScreen(screen){env.screens.push(screen);},setHubLocation(){},setToast(){},setHomeworldArrivalV67(value){env.arrival=value;},persistSocialProgress(update){if(blocked)return false;const r=api.writeSaveWithStatus({...env.saveRef.current,...update},storage,key);if(r.persisted)env.saveRef.current=r.save;return r.persisted;}};
 return {env,storage,key,block:value=>blocked=value,call:name=>callback(name,env)};
}
test('legacy saves stay readable; malformed/future passage and unearned Ash access are rejected without rewriting bytes',()=>{
 const save=api.defaultSave('2026-10-01T00:00:00.000Z');delete save.homeworldPassageV67;
 assert.equal(api.parseSaveImport(JSON.stringify(save)).failure,null);
 const passage=api.createHomeworldPassageV67('ash-marches');
 assert.equal(api.parseSaveImport(JSON.stringify({...save,homeworldPassageV67:passage})).failure,'invalid-save');
 save.homeworld.evidenceIds=['suspect-trophy'];
 assert.equal(api.parseSaveImport(JSON.stringify({...save,homeworldPassageV67:passage})).failure,null);
 for(const altered of [{...passage,version:2},{...passage,actor:{...passage.actor,x:10000}},{...passage,status:'at-biome'}]){
   const bytes=JSON.stringify({...save,homeworldPassageV67:altered});assert(api.parseSaveImport(bytes).failure);
   let raw=bytes;const storage={getItem:()=>raw,setItem:(_k,v)=>raw=v,removeItem(){throw Error('must not delete');}};
   api.loadSaveWithStatus(storage,'protected-passage');assert.equal(raw,bytes);
 }
});
test('actual departure and checkpoint callbacks acknowledge storage before changing screen or accepting movement',()=>{
 const f=fixture(),open=f.call('openHomeworldExpedition');f.block(true);open('ash-marches');assert.equal(f.env.screens.length,0);assert.equal(f.env.saveRef.current.homeworldPassageV67,null);
 f.block(false);open('ash-marches');assert.equal(f.env.screens.at(-1),'homeworld-passage-v67');
 const previous=structuredClone(f.env.saveRef.current.homeworldPassageV67),next=api.stepHomeworldPassageV67(previous,{x:1});
 const checkpoint=f.call('checkpointHomeworldPassageV67');f.block(true);assert.equal(checkpoint(next),false);assert.deepEqual(f.env.saveRef.current.homeworldPassageV67,previous);
 f.block(false);assert.equal(checkpoint(next),true);assert.deepEqual(api.loadSave(f.storage,f.key).homeworldPassageV67,next);
 f.env.entry.ownerCreatedAt='another-campaign';assert.equal(checkpoint(api.stepHomeworldPassageV67(next,{x:1})),false);
});
test('actual biome callback refuses an unwalked connector and a different region',()=>{
 const f=fixture();f.call('openHomeworldExpedition')('ash-marches');const reach=f.call('reachHomeworldBiomeV67');const before=JSON.stringify(f.env.saveRef.current),screens=f.env.screens.length;
 assert.equal(reach('ash-marches'),false);assert.equal(reach('glass-desert'),false);assert.equal(f.env.screens.length,screens);assert.equal(JSON.stringify(f.env.saveRef.current),before);
});
test('physical retreat to the city threshold clears the connector only after an acknowledged write and records the correct city anchor',()=>{
 const f=fixture();f.call('openHomeworldExpedition')('ash-marches');
 // Aborting at the near threshold is an explicit physical interaction, not a far-end shortcut.
 const atCity=api.stepHomeworldPassageV67(f.env.saveRef.current.homeworldPassageV67,{interact:true});assert.equal(atCity.status,'at-city');
 assert(f.call('checkpointHomeworldPassageV67')(atCity));const reach=f.call('reachHomeworldCityV67');f.block(true);assert.equal(reach(),false);assert.equal(f.env.saveRef.current.homeworldPassageV67.status,'at-city');
 f.block(false);assert(reach());assert.equal(f.env.saveRef.current.homeworldPassageV67,null);assert.equal(f.env.arrival.pointId,'region-ash-marches');assert.equal(f.env.screens.at(-1),'homeworld');
});
test('both arrival sockets clear the real beacon collider and the first ordinary step never recovers to the port spawn',()=>{
 for(const id of ['ash-marches','glass-desert']){
   const actor=api.homeworldCityArrivalV67(id);assert(actor);assert(api.isHomeworldWalkable(actor));
   for(const moveX of [-1,0,1]){
     const next=api.stepHomeworldActor(actor,{moveX,climb:1,jumpPressed:false},1/60);
     assert(api.isHomeworldWalkable(next));assert(Math.hypot(next.x-actor.x,next.y-actor.y)<10);
   }
 }
});
