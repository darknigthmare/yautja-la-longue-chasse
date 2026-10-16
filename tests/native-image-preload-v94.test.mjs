import test from 'node:test';
import assert from 'node:assert/strict';
import {preloadNativeImagesV94} from '../app/game/systems/nativeImagePreloadV94.ts';

const source = (id = 'one') => ({src: `/game/${id}.png`, sourceWidth: 20, sourceHeight: 30});
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const deferred = () => { let resolve, reject; const promise = new Promise((a,b) => {resolve = a; reject = b;}); return {promise,resolve,reject}; };
async function fixture(run, decode = async () => {}) {
  const originalImage = globalThis.Image, originalFetch = globalThis.fetch, images = [];
  class FakeImage {
    naturalWidth = 20; naturalHeight = 30; src = ''; decoding = '';
    constructor() { images.push(this); }
    decode() { return decode(this); }
    removeAttribute(name) { if (name === 'src') { this.src = ''; this.detached = true; } }
  }
  globalThis.Image = FakeImage;
  const handles = [];
  try { await run({images, load(options) { const h = preloadNativeImagesV94(options); handles.push(h); return h; }}); }
  finally { for (const h of handles) h.cancel(); await Promise.all(handles.map(h => h.done)); globalThis.Image = originalImage; globalThis.fetch = originalFetch; }
}

test('empty batches are ready immediately and done settles', async () => {
  const reports = [], handle = preloadNativeImagesV94({sources: [], onProgress: p => reports.push(p)});
  await handle.done; assert.deepEqual(reports, [{ready:true,error:null,loaded:0,total:0}]);
});
test('exact dimensions and original URL produce a ready batch', async () => fixture(async ({images,load}) => {
  const reports = []; await load({sources:[source()],onProgress:p=>reports.push(p)}).done;
  assert.equal(images[0].src,source().src); assert.equal(images[0].decoding,'async');
  assert.deepEqual(reports.at(-1),{ready:true,error:null,loaded:1,total:1}); assert.equal(reports[0].ready,false);
}));
test('incorrect dimensions never admit an image', async () => fixture(async ({load}) => {
  const reports=[]; await load({sources:[{...source(),sourceWidth:21,kind:'scene'}],onProgress:p=>reports.push(p)}).done;
  assert.match(reports.at(-1).error,/Dimensions de décor incompatibles/); assert.equal(reports.at(-1).loaded,0); assert.equal(reports.at(-1).ready,false);
}));
test('decode rejection is reported without unhandled rejection', async () => fixture(async ({load}) => {
  const reports=[]; await load({sources:[source()],onProgress:p=>reports.push(p)}).done;
  assert.match(reports.at(-1).error,/Impossible de charger ou de décoder/);
},async()=>{throw new Error('decoder failed');}));
test('concurrent decoder count is bounded, queued images eventually load', async () => {
  let active=0,max=0;
  await fixture(async ({load,images})=>{
    const reports=[]; await load({sources:Array.from({length:19},(_,i)=>source(String(i))),concurrency:3,onProgress:p=>reports.push(p)}).done;
    assert.equal(max,3); assert.equal(images.length,19); assert.equal(reports.at(-1).loaded,19); assert.equal(reports.at(-1).ready,true);
  },async()=>{active++;max=Math.max(max,active);await sleep(2);active--;});
});
test('a stalled decode times out, detaches and settles done', async () => fixture(async ({load,images})=>{
  const reports=[]; await load({sources:[source()],timeoutMs:12,onProgress:p=>reports.push(p)}).done;
  assert.match(reports.at(-1).error,/Délai de chargement dépassé/); assert.equal(images[0].detached,true); assert.equal(reports.at(-1).ready,false);
},()=>new Promise(()=>{})));
test('cancel settles even when decode never settles and publishes no late progress', async () => fixture(async ({load,images})=>{
  const reports=[]; const handle=load({sources:Array.from({length:20},(_,i)=>source(String(i))),concurrency:2,onProgress:p=>reports.push(p)});
  handle.cancel(); await handle.done; assert.equal(images.length,2); assert.equal(reports.length,1);
  assert.ok(images.every(image=>image.detached)); handle.cancel();
},()=>new Promise(()=>{})));
test('retry refreshes exactly the renderer URL rather than a query variant', async () => fixture(async ({load,images})=>{
  const calls=[]; globalThis.fetch=async(url,options)=>{calls.push({url,options});return {ok:true,arrayBuffer:async()=>new ArrayBuffer(0)};};
  await load({sources:[source()],reload:true,onProgress:()=>{}}).done;
  assert.equal(calls[0].url,source().src); assert.equal(calls[0].options.cache,'reload'); assert.equal(images[0].src,source().src);
}));
test('non-retry loading does not duplicate image fetches through fetch()', async () => fixture(async ({load})=>{
  globalThis.fetch=()=>{throw new Error('unexpected fetch');};const reports=[];
  await load({sources:[source()],onProgress:p=>reports.push(p)}).done; assert.equal(reports.at(-1).ready,true);
}));
test('HTTP errors on retry cannot be admitted by a stale image cache', async () => fixture(async ({load,images})=>{
  globalThis.fetch=async()=>({ok:false,status:404}); const reports=[];
  await load({sources:[source()],reload:true,onProgress:p=>reports.push(p)}).done;
  assert.equal(images.length,0); assert.equal(reports.at(-1).ready,false); assert.ok(reports.at(-1).error);
}));
test('a stalled retry fetch is aborted by the same end-to-end deadline', async () => fixture(async ({load,images})=>{
  let signal;globalThis.fetch=async(_,options)=>{signal=options.signal;return new Promise(()=>{});};const reports=[];
  await load({sources:[source()],reload:true,timeoutMs:12,onProgress:p=>reports.push(p)}).done;
  assert.equal(signal.aborted,true);assert.equal(images.length,0);assert.match(reports.at(-1).error,/Délai/);
}));
test('a stalled response body is also bounded', async () => fixture(async ({load,images})=>{
  globalThis.fetch=async()=>({ok:true,arrayBuffer:()=>new Promise(()=>{})});const reports=[];
  await load({sources:[source()],reload:true,timeoutMs:12,onProgress:p=>reports.push(p)}).done;
  assert.equal(images.length,0);assert.match(reports.at(-1).error,/Délai/);
}));
test('late decoder resolution cannot revive a cancelled attempt', async () => {
  const d=deferred(); await fixture(async ({load})=>{
    const reports=[], h=load({sources:[source()],onProgress:p=>reports.push(p)});h.cancel();await h.done;d.resolve();await sleep(0);
    assert.equal(reports.length,1); assert.equal(reports[0].loaded,0);
  },()=>d.promise);
});
test('late retry response cannot construct an image after cancellation', async () => fixture(async ({load,images})=>{
  const d=deferred();globalThis.fetch=()=>d.promise;
  const h=load({sources:[source()],reload:true,onProgress:()=>{}});h.cancel();await h.done;
  d.resolve({ok:true,arrayBuffer:async()=>new ArrayBuffer(0)});await sleep(0);assert.equal(images.length,0);
}));
test('an error is retained when later assets load successfully', async () => fixture(async ({load})=>{
  const reports=[];await load({sources:[{...source('bad'),sourceWidth:99},source('good')],concurrency:1,onProgress:p=>reports.push(p)}).done;
  assert.equal(reports.at(-1).loaded,1);assert.equal(reports.at(-1).ready,false);assert.match(reports.at(-1).error,/Dimensions/);
}));
test('separate attempts never reuse a prior error', async () => fixture(async ({load})=>{
  const first=[],second=[];await load({sources:[{...source(),sourceWidth:99}],onProgress:p=>first.push(p)}).done;
  await load({sources:[source()],onProgress:p=>second.push(p)}).done;
  assert.ok(first.at(-1).error);assert.equal(second.at(-1).error,null);assert.equal(second.at(-1).ready,true);
}));
test('invalid concurrency cannot leave the batch permanently pending', async () => fixture(async ({load})=>{
  for(const concurrency of [0,-2,NaN,Infinity]){const reports=[];await load({sources:[source()],concurrency,onProgress:p=>reports.push(p)}).done;assert.equal(reports.at(-1).ready,true);}
}));
