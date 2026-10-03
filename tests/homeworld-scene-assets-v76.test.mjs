import assert from 'node:assert/strict';import test from 'node:test';import fs from 'node:fs/promises';import {build} from 'esbuild';
const bundle=await build({stdin:{contents:"export * from './app/game/useHomeworldMotionAssetsV74.ts';export * from './app/game/systems/homeworldSceneAssetsV76.ts';",resolveDir:process.cwd()},bundle:true,write:false,platform:'node',format:'esm',external:['react']});
const file=new URL('../work-local/v76/scene-assets-test-'+process.pid+'.mjs',import.meta.url);
await fs.mkdir(new URL('../work-local/v76/',import.meta.url),{recursive:true});await fs.writeFile(file,bundle.outputFiles[0].text);
const api=await import(file.href);await fs.unlink(file);
const sources=api.HOMEWORLD_SCENE_ASSETS_V76,sizes=new Map();
for(const source of [...api.homeworldMotionSourcesV74(true),...sources]){
 const bytes=await fs.readFile('public'+source.src);sizes.set(source.src,{width:bytes.readUInt32BE(16),height:bytes.readUInt32BE(20)});
}
async function images(run,{missing=null,wrong=null,fetcher=null}={}){
 const priorImage=globalThis.Image,priorFetch=globalThis.fetch,created=[];
 globalThis.Image=class{src='';decoding='';constructor(){created.push(this)}async decode(){
  const size=sizes.get(this.src);assert(size,'only real selected PNG URLs');this.naturalWidth=size.width+(wrong===this.src?1:0);this.naturalHeight=size.height;
  if(this.src===missing)throw Error('failed request');}removeAttribute(name){assert.equal(name,'src');this.src='';}};
 if(fetcher)globalThis.fetch=fetcher;
 try{return await run(created)}finally{globalThis.Image=priorImage;globalThis.fetch=priorFetch;}
}
test('fourteen new physical-scene PNGs and the shared furniture kit use unique URLs and verified native dimensions',()=>{
 assert.equal(sources.length,15);assert.equal(new Set(sources.map(s=>s.src)).size,15);assert.equal(sources.filter(s=>s.src.startsWith('/game/homeworld/v76/')).length,14);
 for(const source of sources){assert.equal(source.kind,'scene');assert.match(source.src,/^\/game\/homeworld\/v(72|76)\//);assert.deepEqual(sizes.get(source.src),{width:source.sourceWidth,height:source.sourceHeight});}
});
test('controls become ready only after cold animation and solid scenery decode, including one deduplicated URL',async()=>{
 await images(async created=>{const progress=[],load=api.preloadHomeworldMotionAssetsV74({youth:true,additionalSources:[...sources,sources[0]],onProgress:p=>progress.push(p)});await load.done;
  assert.equal(created.length,39);assert.equal(progress.length,39);assert(progress.slice(0,-1).every(p=>!p.ready));assert.deepEqual(progress.at(-1),{ready:true,error:null,loaded:39,total:39});load.cancel();});
});
test('a missing solid shelf freezes readiness with a decor-specific error and retries the identical URLs',async()=>{
 const missing=sources.find(s=>s.src.endsWith('/interior/rack-lateral.png')).src,progress=[];
 await images(async()=>{await api.preloadHomeworldMotionAssetsV74({youth:false,additionalSources:sources,onProgress:p=>progress.push(p)}).done;},{missing});
 assert(progress.every(p=>!p.ready));assert.equal(progress.at(-1).loaded,22);assert.match(progress.at(-1).error,/décor natif/);assert(progress.at(-1).error.includes(missing));
 const requests=[],recovery=[];
 await images(async()=>{await api.preloadHomeworldMotionAssetsV74({youth:false,additionalSources:sources,reload:true,onProgress:p=>recovery.push(p)}).done;},
  {fetcher:async(src,options)=>{requests.push({src,...options});return{ok:true,status:200,arrayBuffer:async()=>new ArrayBuffer(0)}}});
 assert.equal(requests.length,23);assert(requests.every(r=>r.cache==='reload'&&!r.src.includes('?')));assert(requests.some(r=>r.src===missing));assert.deepEqual(recovery.at(-1),{ready:true,error:null,loaded:23,total:23});
});
test('a wrong scene dimension is rejected after decode before it can hide or shift a collider',async()=>{
 const wrong=sources[0].src,progress=[];await images(async()=>{await api.preloadHomeworldMotionAssetsV74({youth:false,additionalSources:sources,onProgress:p=>progress.push(p)}).done;},{wrong});
 assert(!progress.at(-1).ready);assert.equal(progress.at(-1).loaded,22);assert.match(progress.at(-1).error,/Dimensions de décor incompatibles/);assert(progress.at(-1).error.includes(wrong));
});
