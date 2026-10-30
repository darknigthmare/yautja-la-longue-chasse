import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs/promises';
import ts from 'typescript';
import vm from 'node:vm';
import {build} from 'esbuild';
const source=ts.createSourceFile('qa-pit-backward-throws-v112.mjs',await fs.readFile('scripts/qa-pit-backward-throws-v112.mjs','utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
const declaration=source.statements.find(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='observedOutOfRangeWhiff');assert(declaration);
const bundled=await build({stdin:{contents:"export * from './app/game/systems/pitCombat';export * from './app/game/systems/pitWorkbookCombatV112';",resolveDir:process.cwd()},bundle:true,write:false,format:'esm',platform:'node'});
const api=await import('data:text/javascript;base64,'+Buffer.from(bundled.outputFiles[0].text).toString('base64'));
function actualRoutine({consume=true,stall=false,fault}={}){
 let state=api.createPitCombatState('feral-hunter','scar',{normalMoves:'workbook-v112',mode:'training'}),calls=0;
 const observations=[],checks=[];
 const read=async()=>{
  const snapshot={frame:state.frame,phase:'fight',combatPhase:state.phase,blocked:'false',throw:state.sourceThrowV112,forwardThrow:state.sourceThrowV109,
   positions:state.fighters.map(f=>({x:f.x,y:f.y})),life:state.fighters.map(f=>f.health),
   actions:state.fighters.map(f=>({phase:f.phase,workbookMove:f.action?.workbookMove??null,actionFrame:f.action?.frame??null}))};
  if(fault&&calls>=2)fault(snapshot);return snapshot;
 };
 const scope={api,read,observations,launch:async()=>{if(consume)state=api.stepPitCombat(state,[{throw:true,left:true},{}]);},
  check:(name,condition,detail)=>{checks.push({name,condition});if(!condition){const error=Error(name);error.detail=detail;throw error;}},
  page:{clock:{runFor:async ms=>{assert.equal(ms,17);calls++;if(!stall&&calls%3!==0)state=api.stepPitCombat(state);}}}};
 vm.runInNewContext(declaration.getText(source)+';globalThis.execute=observedOutOfRangeWhiff;',scope);
 return{execute:()=>scope.execute(0,'actual-observer-fixture',['feral-hunter','scar']),observations,checks,calls:()=>calls};
}
test('the actual whiff observer proves real startup and45 effective frames even when clock calls sometimes produce no simulation tick',async()=>{
 const x=actualRoutine();await x.execute();const record=x.observations[0];
 assert.equal(record.started.actions[0].workbookMove,'TH_B');assert.equal(record.started.actions[0].phase,'startup');
 assert.equal(record.effectiveFrames,45);assert.equal(record.recovered.actions[0].workbookMove,null);
 assert(x.calls()>45);assert(record.samples.some((row,index)=>index&&row.frame===record.samples[index-1].frame));
 assert(record.samples.every(row=>!row.throw&&!row.forwardThrow&&JSON.stringify(row.life)===JSON.stringify(record.before.life)));
});
test('an input never consumed by the real simulation cannot masquerade as a successful whiff',async()=>{
 const x=actualRoutine({consume:false});await assert.rejects(x.execute(),/produce TH_B startup/);
 assert.equal(x.observations[0].started,null);assert.equal(x.observations[0].recovered,null);assert(x.calls()<=18);
});
test('a capture during the observed interval is refused immediately and remains in the failure trace',async()=>{
 const x=actualRoutine({fault:s=>{s.throw={attackerSlot:0};}});await assert.rejects(x.execute(),error=>/no capture or damage/.test(error.message)&&Boolean(error.detail.state.throw));
});
test('a health change during the observed interval is refused rather than hidden by a later recovery',async()=>{
 const x=actualRoutine({fault:s=>{s.life[1]--;}});await assert.rejects(x.execute(),error=>/no capture or damage/.test(error.message)&&error.detail.state.life[1]===1009);
});
test('a stopped or blocked simulation cannot pass and cannot make the actual observer wait forever',async()=>{
 const stopped=actualRoutine({stall:true});await assert.rejects(stopped.execute(),/startup and recovery are both observed/);assert.equal(stopped.calls(),180);
 const blocked=actualRoutine({fault:s=>{s.blocked='true';}});await assert.rejects(blocked.execute(),/remains ready/);
});
test('premature idle, oversized action clocks and frame-window overruns are rejected by the actual routine',async()=>{
 for(const fault of [s=>{s.actions[0]={phase:'idle',workbookMove:null,actionFrame:null};},s=>{s.actions[0].actionFrame=45;},s=>{s.frame+=50;}]){
  const x=actualRoutine({fault});await assert.rejects(x.execute(),/before all source frames|source windows stay coherent|source-frame bound/);
 }
});
