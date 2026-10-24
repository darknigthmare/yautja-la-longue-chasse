/** Actual native source files used by the static catalogue and the V107 device.
 * This inventory grants neither a new identity nor an animation admission. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const registries=['enforcerProductionV611','enforcerProductionV612','enforcerProductionV613','enforcerProductionV614','npcProductionV615','enforcerAlternativesV107'];
export async function collectNativeArtInputsV107(){
 const assets=new Map(),inputs=[];
 for(const name of registries){
  const path='app/game/data/'+name+'.json',bytes=await fs.readFile(path),registry=JSON.parse(bytes);
  inputs.push({path,sha256:sha(bytes),bytes:bytes.length});
  for(const row of registry.assets){
   assert.ok(row.sourcePath.startsWith('public/game/production/')&&!row.sourcePath.includes('..'));
   const existing=assets.get(row.sourcePath);if(existing)assert.equal(existing.sha256,row.sha256);
   assets.set(row.sourcePath,{path:row.sourcePath,sha256:row.sha256,bytes:row.bytes,width:row.width,height:row.height,scope:'Native single-pose catalogue source. Alternative poses reuse stable identities; no combat, new costume or animation admission.'});
  }
 }
 // The real V107 journeys still draw the historical default movement and
 // defensive bodies. Their original V93 source pins cover exactly16 V34 pages.
 const historicalPath='app/game/data/pitPresentationPlansV93.json',historicalBytes=await fs.readFile(historicalPath);
 inputs.push({path:historicalPath,sha256:sha(historicalBytes),bytes:historicalBytes.length});
 const legacy=new Map();
 function visit(value){
  if(!value||typeof value!=='object')return;
  if(typeof value.src==='string'&&/^\/game\/sprites\/v34\/pit\/(feral-hunter|scar)\//.test(value.src)&&value.sourceSha256){
   const file='public'+value.src,previous=legacy.get(file);if(previous)assert.equal(previous,value.sourceSha256);legacy.set(file,value.sourceSha256);
  }
  for(const child of Object.values(value))if(typeof child==='object')visit(child);
 }
 visit(JSON.parse(historicalBytes));assert.equal(legacy.size,16);
 for(const [path,digest]of legacy){const bytes=await fs.readFile(path);assert.equal(sha(bytes),digest,'Historical default BODY changed: '+path);assets.set(path,{path,sha256:digest,bytes:bytes.length,scope:'Original V34 default movement/guard/hurt/combat page observed by the V107 journeys, pinned by V93. No new animation or one-to-one claim.'});}
 const path='app/game/data/pitWorkbookDeviceAnchorsV107.json',bytes=await fs.readFile(path),anchors=JSON.parse(bytes),device=anchors.shuriken.entity;
 inputs.push({path,sha256:sha(bytes),bytes:bytes.length});
 const native=await fs.readFile('public'+device.path);
 assert.equal(sha(native),device.sha256);
 assets.set('public'+device.path,{path:'public'+device.path,sha256:device.sha256,bytes:native.length,width:device.width,height:device.height,scope:device.scope});
 return {assets:[...assets.values()],inputs};
}
