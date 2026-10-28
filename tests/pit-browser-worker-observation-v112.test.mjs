import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs/promises';
import ts from 'typescript';
import vm from 'node:vm';
const source=ts.createSourceFile('qa-pit-backward-throws-v112.mjs',await fs.readFile('scripts/qa-pit-backward-throws-v112.mjs','utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
let initialize, collect;
const visit=node=>{
 if(ts.isCallExpression(node)&&node.expression.getText(source)==='context.addInitScript')initialize=node.arguments[0].getText(source);
 if(ts.isFunctionDeclaration(node)&&node.name?.text==='collectWorkerErrors')collect=node.getText(source);
 ts.forEachChild(node,visit);
};visit(source);assert(initialize&&collect);
function install(NativeWorker){
 const window={Worker:NativeWorker};
 const sandbox={window,localStorage:{setItem(){}},navigator:{},CanvasRenderingContext2D:class{drawImage(){}},URL,HTMLImageElement:class{},Set,WeakMap};
 vm.runInNewContext('('+initialize+')({profile:{},nativePaths:[]})',sandbox);return window;
}
test('the actual browser initializer records and rethrows a native Worker constructor failure even when the app catches it',()=>{
 const failure=new Error('native Worker construction failed'),window=install(class{constructor(){throw failure;}});
 let caught;try{new window.Worker('/actual-worker.js');}catch(error){caught=error;}
 assert.strictEqual(caught,failure);assert.equal(window.__pitBackwardThrowQaV112.workerErrors.length,1);
 assert.equal(window.__pitBackwardThrowQaV112.workerErrors[0].kind,'constructor');
 assert.equal(window.__pitBackwardThrowQaV112.workerErrors[0].message,failure.message);
 assert.equal(window.__pitBackwardThrowQaV112.workerErrors[0].url,'/actual-worker.js');
});
test('actual native error listeners stay attached and retain the unfiltered asynchronous Worker failure',()=>{
 const window=install(class{listeners=new Map();addEventListener(name,listener){this.listeners.set(name,listener);}}),worker=new window.Worker('/async-worker.js');
 worker.listeners.get('error')({message:'async Worker fault',filename:'/async-worker.js',lineno:12});
 assert.equal(window.__pitBackwardThrowQaV112.workerErrors.length,1);assert.equal(window.__pitBackwardThrowQaV112.workerErrors[0].kind,'error');
 assert.equal(window.__pitBackwardThrowQaV112.workerErrors[0].message,'async Worker fault');
});
test('the actual final collector captures early-abort records once and refuses an unobservable open page',async()=>{
 const records=[{kind:'constructor',message:'caught by app'}],page={isClosed:()=>false,evaluate:async()=>records};
 const context={pages:()=>[page]},workerErrors=[],errors=[],observedWorkerCounts=new WeakMap();
 const compiled={};vm.runInNewContext(collect+';globalThis.execute=collectWorkerErrors;',Object.assign(compiled,{contexts:[context],workerErrors,errors,observedWorkerCounts}));
 await compiled.execute();await compiled.execute();assert.deepEqual(workerErrors,records);assert.deepEqual(errors,[]);
 page.evaluate=async()=>{throw Error('page observation unavailable');};await compiled.execute();assert.equal(errors.length,1);assert.equal(errors[0].kind,'worker-observation-error');
 const outerFinally=source.statements.filter(ts.isTryStatement).find(node=>node.finallyBlock);
 assert(outerFinally.finallyBlock.statements.some(node=>node.getText(source)==='await collectWorkerErrors();'),'An early aborted main try must reach the actual collector before browser cleanup');
});
