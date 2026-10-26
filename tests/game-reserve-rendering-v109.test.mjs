import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs/promises';
import {build} from 'esbuild';
const bundle=await build({stdin:{contents:"export * from './app/game/gameReserveV66Rendering';export * from './app/game/systems/gameReserveV66';export * from './app/game/systems/gameReserveExpeditionV109';",resolveDir:process.cwd()},bundle:true,write:false,platform:'node',format:'esm',logLevel:'silent'});
const api=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
function dimensions(b){
 if(b.toString('hex',0,8)==='89504e470d0a1a0a')return[b.readUInt32BE(16),b.readUInt32BE(20)];
 assert.equal(b.toString('ascii',0,4),'RIFF');assert.equal(b.toString('ascii',8,12),'WEBP');
 for(let offset=12;offset+8<=b.length;){const type=b.toString('ascii',offset,offset+4),length=b.readUInt32LE(offset+4),p=offset+8;if(type==='VP8X')return[1+b.readUIntLE(p+4,3),1+b.readUIntLE(p+7,3)];if(type==='VP8L'){assert.equal(b[p],0x2f);const bits=b.readUInt32LE(p+1);return[1+(bits&0x3fff),1+((bits>>>14)&0x3fff)];}if(type==='VP8 ')return[b.readUInt16LE(p+6)&0x3fff,b.readUInt16LE(p+8)&0x3fff];offset=p+length+(length%2);}
 throw Error('Unsupported native image header');
}
const sources=new Set([...Object.values(api.GAME_RESERVE_V66_ART),...api.GAME_RESERVE_CATALOGUE_V109.flatMap(d=>Object.values(d.art))]);
const actual=new Map(await Promise.all([...sources].map(async src=>[src,dimensions(await fs.readFile('public'+src))])));
async function withImages(run){const old=Object.getOwnPropertyDescriptor(globalThis,'Image'),requests=[],overrides=new Map();class NativeHeaderImage{set src(src){this._src=src;requests.push(src);queueMicrotask(()=>{const size=overrides.get(src)??actual.get(src);if(!size){this.onerror?.();return;}[this.naturalWidth,this.naturalHeight]=size;this.onload?.();});}get src(){return this._src;}}Object.defineProperty(globalThis,'Image',{configurable:true,value:NativeHeaderImage});try{await run({requests,overrides});}finally{if(old)Object.defineProperty(globalThis,'Image',old);else delete globalThis.Image;}}

test('the loader requests the exact native assets of each chosen biome and rejects wrong decoded dimensions until a genuine retry',async()=>withImages(async({requests,overrides})=>{
 for(const definition of api.GAME_RESERVE_CATALOGUE_V109){const state=api.createGameReserveV109(109,definition.id);requests.length=0;const bank=await api.loadGameReserveV66Art(state);assert.equal(bank.background.src,definition.art.background);assert.equal(bank.branch.src,definition.art.ledge);assert.equal(bank.industrialPlatform.src,definition.art.gantry);assert.equal(bank.ferns.src,definition.art.cover);assert.equal(requests.length,10);for(const other of api.GAME_RESERVE_CATALOGUE_V109.filter(d=>d!==definition))assert(!requests.includes(other.art.background));
  for(const src of Object.values(definition.art)){overrides.set(src,[1,1]);await assert.rejects(api.loadGameReserveV66Art(state),/Décor natif incompatible/);overrides.delete(src);const retry=await api.loadGameReserveV66Art(state);assert.equal(retry.background.src,definition.art.background);assert.deepEqual([retry.background.naturalWidth,retry.background.naturalHeight],actual.get(definition.art.background));}
 }
}));

test('the actual renderer places each native prop at the physical surface or cover with its measured alpha crop and unchanged aspect ratio',async()=>withImages(async()=>{
 for(const definition of api.GAME_RESERVE_CATALOGUE_V109){const state=api.createGameReserveV109(109,definition.id),bank=await api.loadGameReserveV66Art(state),draws=[];const ctx=new Proxy({canvas:{width:1440,height:540},drawImage:(...args)=>draws.push(args),measureText:text=>({width:text.length*7}),createLinearGradient:()=>({addColorStop(){}})}, {get:(target,key)=>key in target?target[key]:()=>{},set:(target,key,value)=>{target[key]=value;return true;}});api.drawGameReserveV66(ctx,state,bank,true);
  const platforms=draws.filter(call=>call[0]===bank.branch||call[0]===bank.industrialPlatform),covers=draws.filter(call=>call[0]===bank.ferns);assert.equal(platforms.length,definition.platforms.length);assert.equal(covers.length,definition.cover.length);
  for(const [index,call]of platforms.entries()){const p=definition.platforms[index],im=call[0];assert.deepEqual(call.slice(1,5),[24,24,im.naturalWidth-48,im.naturalHeight-48]);assert.deepEqual(call.slice(5,8),[p.x,p.y,p.w]);assert(Math.abs(call[7]/call[8]-call[3]/call[4])<1e-12);}
  for(const [index,call]of covers.entries()){const c=definition.cover[index],im=call[0];assert.deepEqual(call.slice(1,5),[24,24,im.naturalWidth-48,im.naturalHeight-48]);assert.deepEqual(call.slice(5),[c.x,c.top,c.w,438-c.top]);assert(Math.abs(call[7]/call[8]-call[3]/call[4])<1e-12);assert.equal(api.gameReserveV66LineClear(c.x-10,387,c.x+c.w+10,387,state),false);}
 }
}));
