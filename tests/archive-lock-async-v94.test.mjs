import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
const b=await build({entryPoints:['app/game/systems/archiveTransaction.ts'],bundle:true,write:false,platform:'node',format:'esm',logLevel:'silent'});
const {withArchiveTransferLock}=await import('data:text/javascript;base64,'+Buffer.from(b.outputFiles[0].text).toString('base64'));
async function environment(locks,run){const before=Object.getOwnPropertyDescriptor(globalThis,'navigator');Object.defineProperty(globalThis,'navigator',{configurable:true,value:locks});try{await run();}finally{if(before)Object.defineProperty(globalThis,'navigator',before);else delete globalThis.navigator;}}
test('native-shaped manager retains an asynchronous operation until it settles',async()=>{
 let tail=Promise.resolve(),release;const order=[];
 const locks={request(_name,_options,callback){const r=tail.then(()=>callback({name:'yautja-full-archive-transfer',mode:'exclusive'}));tail=r.then(()=>{});return r;}};
 await environment({locks},async()=>{const first=withArchiveTransferLock(async()=>{order.push('first-start');await new Promise(r=>release=r);order.push('first-end');return 42;});const second=withArchiveTransferLock(()=>{order.push('second');return false;});
 while(!release)await Promise.resolve();await Promise.resolve();assert.deepEqual(order,['first-start']);release();assert.deepEqual(await first,{acquired:true,value:42});assert.deepEqual(await second,{acquired:true,value:false});assert.deepEqual(order,['first-start','first-end','second']);});
});
test('acquisition deadline cannot turn an already-running asynchronous operation into a false refusal',async()=>{
 let aborted=false;await environment({locks:{request(_n,options,callback){options.signal.addEventListener('abort',()=>aborted=true);return callback({});}}},async()=>{const r=await withArchiveTransferLock(async()=>{await new Promise(r=>setTimeout(r,25));return 7;},5);assert.deepEqual(r,{acquired:true,value:7});assert.equal(aborted,false);});
});
test('an asynchronous exception is reported as uncertain, never as a guaranteed absence of writes',async()=>{
 await environment({locks:{request:(_n,_o,cb)=>cb({})}},async()=>{const r=await withArchiveTransferLock(async()=>{throw Error('private details');});assert.equal(r.acquired,false);assert.match(r.reason,/n’est pas confirmée/);assert.doesNotMatch(r.reason,/private details|Aucune modification/);});
});
test('a denied navigator.locks getter refuses without executing the operation',async()=>{
 await environment(Object.defineProperty({},'locks',{get(){throw Error('denied');}}),async()=>{let calls=0;const r=await withArchiveTransferLock(()=>calls++);assert.equal(r.acquired,false);assert.equal(calls,0);});
});
