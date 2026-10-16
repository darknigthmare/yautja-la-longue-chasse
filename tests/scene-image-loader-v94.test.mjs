import test from 'node:test';
import assert from 'node:assert/strict';
import {preloadSceneImagesV94} from '../app/game/systems/nativeImagePreloadV94.ts';
async function fixture(run,decode=async()=>{}){
 const oldImage=globalThis.Image,oldFetch=globalThis.fetch,images=[],handles=[];
 class ImageFixture{src='';naturalWidth=80;naturalHeight=60;decoding='';constructor(){images.push(this);}decode(){return decode(this);}removeAttribute(){this.detached=true;this.src='';}}
 globalThis.Image=ImageFixture;
 try{await run({images,load(options){const h=preloadSceneImagesV94(options);handles.push(h);return h;}});}
 finally{handles.forEach(h=>h.cancel());await Promise.all(handles.map(h=>h.done));globalThis.Image=oldImage;globalThis.fetch=oldFetch;}
}
test('scene loader deduplicates URLs but never rewrites source identity',()=>fixture(async({images,load})=>{
 const urls=['/a.png','/b.png','/a.png'],reports=[];await load({urls,onProgress:p=>reports.push(p)}).done;
 assert.deepEqual(images.map(i=>i.src),['/a.png','/b.png']);assert.deepEqual(urls,['/a.png','/b.png','/a.png']);assert.deepEqual(reports.at(-1),{ready:true,error:null,loaded:2,total:2});
}));
test('scene loader preserves the exact known-fauna validator',()=>fixture(async({load})=>{
 const calls=[],reports=[];await load({urls:['/fauna.png'],validateDimensions:(...args)=>{calls.push(args);return false;},onProgress:p=>reports.push(p)}).done;
 assert.deepEqual(calls,[['/fauna.png',80,60]]);assert.equal(reports.at(-1).ready,false);assert.match(reports.at(-1).error,/Dimensions/);
}));
for(const dimension of ['naturalWidth','naturalHeight'])test(`scene loader rejects an empty ${dimension}`,()=>fixture(async({load})=>{
 const reports=[];await load({urls:['/zero.png'],onProgress:p=>reports.push(p)}).done;assert.equal(reports.at(-1).ready,false);
},async image=>{image[dimension]=0;}));
test('a stalled scene decoder is bounded and cannot leave loading forever',()=>fixture(async({images,load})=>{
 const reports=[];await load({urls:['/stalled.png'],timeoutMs:15,onProgress:p=>reports.push(p)}).done;
 assert.match(reports.at(-1).error,/Délai/);assert.equal(images[0].detached,true);assert.equal(reports.at(-1).ready,false);
},()=>new Promise(()=>{})));
test('cancelling a scene batch settles without publishing a late ready state',()=>fixture(async({images,load})=>{
 const reports=[];const batch=load({urls:Array.from({length:14},(_,i)=>`/${i}.png`),onProgress:p=>reports.push(p)});batch.cancel();await batch.done;
 assert.equal(images.length,6);assert(images.every(i=>i.detached));assert.equal(reports.length,1);
},()=>new Promise(()=>{})));
test('a refused cache refresh cannot be admitted through old pixels',()=>fixture(async({images,load})=>{
 globalThis.fetch=async()=>({ok:false,status:503});const reports=[];await load({urls:['/retry.png'],reload:true,onProgress:p=>reports.push(p)}).done;
 assert.equal(images.length,0);assert.equal(reports.at(-1).ready,false);assert.ok(reports.at(-1).error);
}));
test('a stalled refresh body is cancelled under the same resource deadline',()=>fixture(async({images,load})=>{
 let signal;globalThis.fetch=async(_,{signal:s})=>{signal=s;return{ok:true,arrayBuffer:()=>new Promise(()=>{})};};const reports=[];
 await load({urls:['/body.png'],reload:true,timeoutMs:15,onProgress:p=>reports.push(p)}).done;assert.equal(signal.aborted,true);assert.equal(images.length,0);assert.match(reports.at(-1).error,/Délai/);
}));
test('a separate retry can recover without carrying the previous error',()=>fixture(async({load})=>{
 const reports=[];await load({urls:['/retry.png'],validateDimensions:()=>false,onProgress:p=>reports.push(p)}).done;assert.equal(reports.at(-1).ready,false);
 await load({urls:['/retry.png'],onProgress:p=>reports.push(p)}).done;assert.equal(reports.at(-1).ready,true);assert.equal(reports.at(-1).error,null);
}));
