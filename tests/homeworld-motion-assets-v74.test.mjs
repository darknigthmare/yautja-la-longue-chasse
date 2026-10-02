import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs/promises';
import {build} from 'esbuild';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
const bundle=await build({stdin:{contents:"export * from './app/game/useHomeworldMotionAssetsV74.ts';",resolveDir:process.cwd()},bundle:true,write:false,platform:'node',format:'esm',external:['react']});
// Keep React a real package import in the SSR check; the browser loader alone
// gets a deterministic Image/fetch fixture for network/lifecycle failures.
const artifact=new URL('../work-local/v74/motion-assets-test-'+process.pid+'.mjs',import.meta.url);
await fs.mkdir(new URL('../work-local/v74/',import.meta.url),{recursive:true});await fs.writeFile(artifact,bundle.outputFiles[0].text);
const api=await import(artifact.href+'?test');await fs.unlink(artifact);
const metadata=api.homeworldMotionSourcesV74(true),sizes=new Map();
for(const source of metadata){const bytes=await fs.readFile('public'+source.src);assert.equal(bytes.readUInt32BE(12),0x49484452);sizes.set(source.src,{width:bytes.readUInt32BE(16),height:bytes.readUInt32BE(20)});}

async function withImages(run,{reject=null,wrong=null,deferred=false,fetcher=null}={}){
  const originalImage=globalThis.Image,originalFetch=globalThis.fetch,images=[];
  class ImageFixture{
    src='';decoding='';naturalWidth=0;naturalHeight=0;removed=false;
    constructor(){images.push(this);}
    decode(){
      const size=sizes.get(this.src);assert(size,'only active local PNG originals');
      this.naturalWidth=size.width+(wrong===this.src?1:0);this.naturalHeight=size.height;
      if(deferred)return new Promise((resolve,reject)=>{this.finish=resolve;this.fail=reject;});
      return reject===this.src?Promise.reject(new Error('Network error')):Promise.resolve();
    }
    removeAttribute(name){assert.equal(name,'src');this.removed=true;this.fail?.(new Error('Cancelled'));
      this.src='';}
  }
  globalThis.Image=ImageFixture;if(fetcher)globalThis.fetch=fetcher;
  try{return await run(images);}finally{globalThis.Image=originalImage;globalThis.fetch=originalFetch;}
}

test('source set matches eight active civilian PNGs plus sixteen native youth direction sources with unchanged actual dimensions',()=>{
  const adults=api.homeworldMotionSourcesV74(false);assert.equal(adults.length,8);assert.equal(metadata.length,24);
  assert.equal(new Set(metadata.map(source=>source.src)).size,24);
  for(const source of metadata){const size=sizes.get(source.src);assert.equal(size.width,source.sourceWidth);assert.equal(size.height,source.sourceHeight);assert.match(source.src,/^\/game\/homeworld\/v74\/.+\.png$/);}
});

test('SSR is initially blocked and reports the correct total without touching browser resources',()=>{
  function View({youth}){const state=api.useHomeworldMotionAssetsV74({youth});return React.createElement('output',{'data-ready':String(state.ready),'data-total':state.total,'data-loaded':state.loaded,'data-error':state.error??''});}
  for(const[youth,total]of[[false,8],[true,24]]){const html=renderToStaticMarkup(React.createElement(View,{youth}));assert(html.includes('data-ready="false"'));assert(html.includes('data-total="'+total+'"'));assert(html.includes('data-loaded="0"'));}
});

test('ready is published only after every selected image decodes, with monotonic progress and no retained image bank',async()=>{
  await withImages(async images=>{
    const progress=[],loading=api.preloadHomeworldMotionAssetsV74({youth:true,onProgress:state=>progress.push(state)});
    assert.equal(images.length,24);await loading.done;
    assert.deepEqual(progress.map(p=>p.loaded),Array.from({length:24},(_,i)=>i+1));
    assert(progress.slice(0,-1).every(p=>p.ready===false&&p.error===null));assert.deepEqual(progress.at(-1),{ready:true,error:null,loaded:24,total:24});
    assert(images.every(image=>image.decoding==='async'));assert(!('images'in loading),'no retained bank returned');
    loading.cancel();assert(images.every(image=>!image.removed),'completed Images are not retained by cancellation closures');
  });
});

test('a missing source keeps controls unready even after all other images finish, with readable French error',async()=>{
  const source=metadata[0].src;
  await withImages(async()=>{
    const progress=[],loading=api.preloadHomeworldMotionAssetsV74({youth:false,onProgress:p=>progress.push(p)});await loading.done;
    assert(progress.every(p=>!p.ready));assert.equal(progress.at(-1).loaded,7);assert.equal(progress.at(-1).total,8);
    assert(progress.at(-1).error.includes(source));assert.match(progress.at(-1).error,/Impossible de charger ou de décoder/);
  },{reject:source});
});

test('incorrect dimensions are rejected after decode rather than allowing a wrong atlas into the gameplay',async()=>{
  const source=metadata[0].src;
  await withImages(async()=>{
    const progress=[],loading=api.preloadHomeworldMotionAssetsV74({youth:false,onProgress:p=>progress.push(p)});await loading.done;
    assert(!progress.at(-1).ready);assert.equal(progress.at(-1).loaded,7);assert.match(progress.at(-1).error,/Dimensions d’animation incompatibles/);assert.match(progress.at(-1).error,/Attendues 1254×1254, reçues 1255×1254/);
  },{wrong:source});
});

test('retry reloads the exact original static URLs then decodes them successfully; no nonce or renderer URL divergence',async()=>{
  const requests=[];
  await withImages(async images=>{
    const progress=[],loading=api.preloadHomeworldMotionAssetsV74({youth:false,reload:true,onProgress:p=>progress.push(p)});await loading.done;
    assert.equal(requests.length,8);assert.deepEqual(requests.map(r=>r.src),api.homeworldMotionSourcesV74(false).map(s=>s.src));
    assert(requests.every(r=>r.cache==='reload'&&r.signal instanceof AbortSignal));
    assert.deepEqual(images.map(image=>image.src),requests.map(r=>r.src));assert.deepEqual(progress.at(-1),{ready:true,error:null,loaded:8,total:8});
  },{fetcher:async(src,options)=>{requests.push({src,...options});return {ok:true,status:200,arrayBuffer:async()=>new ArrayBuffer(0)};}});
});

test('unmount cancellation detaches pending Images and ignores later decode resolutions without publishing progress',async()=>{
  await withImages(async images=>{
    const progress=[],loading=api.preloadHomeworldMotionAssetsV74({youth:true,onProgress:p=>progress.push(p)});
    assert.equal(images.length,24);loading.cancel();await loading.done;
    assert(images.every(image=>image.removed));assert.deepEqual(progress,[]);
    for(const image of images)image.finish?.();await Promise.resolve();assert.deepEqual(progress,[]);
  },{deferred:true});
});

test('unmount cancellation aborts retry fetches before any Image is made and produces no stale error',async()=>{
  const signals=[];
  await withImages(async images=>{
    const progress=[],loading=api.preloadHomeworldMotionAssetsV74({youth:false,reload:true,onProgress:p=>progress.push(p)});
    loading.cancel();await loading.done;assert.equal(images.length,0);assert.equal(signals.length,8);assert(signals.every(signal=>signal.aborted));assert.deepEqual(progress,[]);
  },{fetcher:async(src,{signal})=>{assert(sizes.has(src));signals.push(signal);return new Promise((resolve,reject)=>signal.addEventListener('abort',()=>reject(new Error('Abort')),{once:true}));}});
});
