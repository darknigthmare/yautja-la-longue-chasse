import assert from 'node:assert/strict';
import test from 'node:test';
import {build} from 'esbuild';
const bundle=await build({stdin:{contents:'export {loadPitArenaArt,isPitArenaArtBankReady} from "./app/game/pitArenaRendering"; export {resolvePitArenaProductionKit} from "./app/game/pitArenaProduction";',resolveDir:process.cwd()},bundle:true,write:false,format:'esm',platform:'node',logLevel:'silent'});
const api=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const arena='arena-138-avp-ryushi-prosperity-wells',sheet='/game/sprites/v54/pit-life/colony-watchers.png';
test('a failed native figurant blocks its own bank even if another preview succeeds; retry creates a complete bank',async()=>{
 const previous=globalThis.Image,kit=api.resolvePitArenaProductionKit(arena);assert(kit);
 const sizes=new Map(kit.planes.flatMap(p=>p.assets.flatMap(a=>a.frames.map(f=>[f.path,[f.generation.width,f.generation.height]]))));sizes.set(sheet,[1536,1024]);
 let shouldFail=true;
 globalThis.Image=class {naturalWidth=0;naturalHeight=0;onload=null;onerror=null;set src(src){if(!src)return;const fail=shouldFail&&src===sheet;queueMicrotask(()=>{if(fail){this.onerror?.();return;}[this.naturalWidth,this.naturalHeight]=sizes.get(src)||[0,0];this.onload?.();});}};
 try{
  const failed=await api.loadPitArenaArt(arena,{timeoutMs:1000});assert.deepEqual([...failed.failedPaths],[sheet]);assert.equal(api.isPitArenaArtBankReady(failed,arena),false);
  shouldFail=false;const preview=await api.loadPitArenaArt(arena,{timeoutMs:1000});assert(api.isPitArenaArtBankReady(preview,arena));assert.equal(api.isPitArenaArtBankReady(failed,arena),false,'Separate preview cannot repair stale parent bank implicitly');
  const retry=await api.loadPitArenaArt(arena,{timeoutMs:1000});assert(api.isPitArenaArtBankReady(retry,arena));assert(retry.images.has(sheet));assert.equal(retry.images.size,retry.requestedPaths.size);assert.notEqual(retry,failed);
  assert.equal(api.isPitArenaArtBankReady(retry,'the-pit'),false,'Another arena never unblocks this match');
  const controller=new AbortController();controller.abort();const cancelled=await api.loadPitArenaArt(arena,{signal:controller.signal});assert.equal(api.isPitArenaArtBankReady(cancelled,arena),false);assert(cancelled.cancelled);
 }finally{if(previous===undefined)delete globalThis.Image;else globalThis.Image=previous;}
});
