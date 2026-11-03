import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs/promises';
import ts from 'typescript';
import vm from 'node:vm';
import {build} from 'esbuild';
const render=ts.createSourceFile('PitCanvas.tsx',await fs.readFile('app/game/PitCanvas.tsx','utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
let predicate;
const findRender=node=>{if(ts.isConditionalExpression(node)&&node.whenTrue.getText(render).includes('Exporter le replay JSON')&&node.condition.getText(render).includes('availableReplay.engineVersion'))predicate=node.condition.getText(render);ts.forEachChild(node,findRender);};findRender(render);assert(predicate);
const bundle=await build({stdin:{contents:"export * from './app/game/systems/pitRosterExpansion';export * from './app/game/systems/pitOriginalFightersV56';",resolveDir:process.cwd()},bundle:true,write:false,format:'esm',platform:'node'});
const p=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const allowed=new Function('availableReplay','isPitExpansionFighterId','isPitOriginalFighterIdV56','return '+predicate);
const hasButton=(engineVersion,fighters=['feral-hunter','scar'])=>allowed({engineVersion,fighters},p.isPitExpansionFighterId,p.isPitOriginalFighterIdV56);
test('actual victory JSX offers export for the real unvaried Feral/ScarV17 recording and retainsV16',()=>{
 for(const fighters of [['feral-hunter','scar'],['scar','feral-hunter']]){
  assert.equal(hasButton(17,fighters),true);assert.equal(hasButton(16,fighters),true);
  assert.equal(hasButton(15,fighters),false);assert.equal(hasButton(18,fighters),false);
 }
});
test('the actual export predicate keeps previously admitted expansion and originalV56 branches intact',()=>{
 assert.equal(p.PIT_EXPANSION_FIGHTER_IDS.length,4);assert.equal(p.PIT_ORIGINAL_FIGHTER_IDS_V56.length,3);
 for(const id of [...p.PIT_EXPANSION_FIGHTER_IDS,...p.PIT_ORIGINAL_FIGHTER_IDS_V56]){
  assert(p.isPitExpansionFighterId(id)||p.isPitOriginalFighterIdV56(id));assert.equal(hasButton(11,[id,'feral-hunter']),true);
 }
});
const driver=ts.createSourceFile('qa-pit-backward-throws-v112.mjs',await fs.readFile('scripts/qa-pit-backward-throws-v112.mjs','utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
const finish=driver.statements.find(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='finishAndReplay');assert(finish);
function actualFinish({visibilityFails=false,downloadFails=false}={}){
 const events=[],state={combatPhase:'match-over',terminal:'true'},downloadFailure=new Error('actual download failed'),visibilityFailure=new Error('export button absent');
 const exportButton={waitFor:async()=>{events.push('visibility');if(visibilityFails)throw visibilityFailure;},click:async()=>{events.push('click');await new Promise(resolve=>setImmediate(resolve));}};
 const page={getByRole:()=>exportButton,waitForEvent:()=>{events.push('download');if(downloadFails)return Promise.reject(downloadFailure);throw Error('Unexpected non-failing diagnostic branch');}};
 const scope={page,read:async()=>state,check:()=>{},capture:async()=>{events.push('capture');}};
 vm.runInNewContext(finish.getText(driver)+';globalThis.execute=finishAndReplay;',scope);
 return{execute:scope.execute,events,downloadFailure,visibilityFailure};
}
test('the actual browser recipe awaits visibility before arming a download, so absent buttons enter its failure handler',async()=>{
 const x=actualFinish({visibilityFails:true});await assert.rejects(x.execute('diagnostic'),error=>error===x.visibilityFailure);
 assert.deepEqual(x.events,['capture','visibility']);
});
test('actual export click and download are awaited together, preserving a catchable failure without an orphan rejection',async()=>{
 const x=actualFinish({downloadFails:true});await assert.rejects(x.execute('diagnostic'),error=>error===x.downloadFailure);
 assert.deepEqual(x.events,['capture','visibility','download','click']);
 await new Promise(resolve=>setImmediate(resolve));
 const outer=driver.statements.find(node=>ts.isTryStatement(node)&&node.finallyBlock);
 assert(outer.catchClause&&outer.finallyBlock,'The complete executed recipe must retain its failure artifact path');
 assert(outer.tryBlock.getText(driver).includes('await finishAndReplay(label)'));
});
