/** Bounded actual inputs for V107 before promotion; no proof/master cycles. */
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {createHash} from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import sharp from 'sharp';
import {collectRuntimeInputsV106} from './collect-v106-runtime-inputs.mjs';
import {collectVariantInputsV107} from './collect-pit-variant-inputs-v107.mjs';
export const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const SCRIPT='scripts/collect-v107-runtime-inputs.mjs';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const local=file=>typeof file==='string'&&!path.isAbsolute(file)&&!file.includes('\\')&&file.split('/').every(part=>part&&part!=='.'&&part!=='..');
const read=file=>fs.readFile(path.join(ROOT,file));
const fingerprint=files=>Promise.all([...new Set(files)].sort().map(async file=>{assert.ok(local(file));const bytes=await read(file);return {path:file,sha256:sha(bytes),bytes:bytes.length};}));
const ENTRY=`export {PIT_WORKBOOK_CONCLUSION_SCENE_REGISTRY_V107} from './app/game/pitWorkbookRegistryV107';
export {SPECIALIZED_ASSETS_V107,SPECIALIZED_AUDIO_V107} from './app/game/systems/clanWarSpecializedV107';
export {GAME_RESERVE_V66_ART} from './app/game/gameReserveV66Rendering';
export {HOMEWORLD_ARCHIVE_COMPARISON_V107} from './app/game/systems/homeworldArchiveComparisonDefinitionV107';
export {default as decor} from './app/game/data/homeworldNativeDecorV80.json';`;

export async function collectRuntimeInputsV107({additionalAssets=[]}={}){
 assert.ok(Array.isArray(additionalAssets));
 const [legacy,variants,compiled]=await Promise.all([collectRuntimeInputsV106(),collectVariantInputsV107(),build({stdin:{contents:ENTRY,resolveDir:ROOT},absWorkingDir:ROOT,bundle:true,metafile:true,write:false,platform:'node',format:'esm',logLevel:'silent'})]);
 const imports=Object.keys(compiled.metafile.inputs).filter(file=>file!=='<stdin>'),before=await fingerprint(imports);
 const api=await import('data:text/javascript;base64,'+Buffer.from(compiled.outputFiles[0].text).toString('base64'));
 const assets=new Map();
 const add=row=>{assert.ok(local(row.path)&&row.path.startsWith('public/'),'Bounded public input required');const previous=assets.get(row.path);if(previous?.sha256&&row.sha256)assert.equal(previous.sha256,row.sha256,'Conflicting public input: '+row.path);assets.set(row.path,{...previous,...row});};
 for(const row of [...legacy.assets,...variants.assets])add(row);
 for(const definition of api.PIT_WORKBOOK_CONCLUSION_SCENE_REGISTRY_V107)for(const page of definition.atlas.pages){const previous=assets.get('public'+page.src);assert.ok(previous,'Conclusion page must belong to a real historical admission: '+page.src);assert.equal(previous.width,page.width);assert.equal(previous.height,page.height);}
 const comparison=api.HOMEWORLD_ARCHIVE_COMPARISON_V107;
 for(const artId of [comparison.evidence.artId,comparison.table.artId,...comparison.references.map(row=>row.artId)]){const art=api.decor.assets[artId.split(':').at(-1)];assert.ok(art&&art.status==='MEASURED_NATIVE');add({path:'public'+art.src,sha256:art.sha256,width:art.sourceWidth,height:art.sourceHeight,scope:'Reused measured Homeworld case/lectern for local comparison, no named historical plaque or newly authored animation.'});}
 for(const src of Object.values(api.SPECIALIZED_ASSETS_V107))add({path:'public'+src,scope:'Existing native reference reused in separate specialized exercise; no campaign acquisition or new animation.'});
 for(const audio of api.SPECIALIZED_AUDIO_V107)add({path:'public'+audio.src,sha256:audio.sha256,scope:'Actual situated audio file reused in exercise; no invented fauna, weather recording or voice.'});
 for(const [id,src]of Object.entries(api.GAME_RESERVE_V66_ART))add({path:'public'+src,scope:'Existing Preserve '+id+' image reused by the expedition; three shared human atlases do not admit H001–H100 or new native character art.'});
 for(const row of additionalAssets){assert.match(row.sha256??'',/^[a-f0-9]{64}$/,'Additional public input must be pinned');assert.ok(Number.isSafeInteger(row.bytes)&&row.bytes>0);add({...row,scope:row.scope??'Additional root-pinned public input; no delivery admission inferred.'});}
 const rows=await Promise.all([...assets.values()].sort((a,b)=>a.path.localeCompare(b.path)).map(async asset=>{
  const bytes=await read(asset.path),digest=sha(bytes);if(asset.sha256)assert.equal(digest,asset.sha256,'Native/public asset changed: '+asset.path);if(asset.bytes!==undefined)assert.equal(bytes.length,asset.bytes);
  let dimensions={};
  if(/\.(png|webp)$/.test(asset.path)){const metadata=await sharp(bytes).metadata();assert.ok(metadata.width&&metadata.height);if(asset.width)assert.equal(metadata.width,asset.width);if(asset.height)assert.equal(metadata.height,asset.height);dimensions={width:metadata.width,height:metadata.height,mediaType:'image/'+metadata.format};}
  else if(asset.path.endsWith('.wav')){assert.equal(bytes.subarray(0,4).toString(),'RIFF');assert.equal(bytes.subarray(8,12).toString(),'WAVE');dimensions={mediaType:'audio/wav'};}
  else if(asset.path.endsWith('.json')){JSON.parse(bytes);dimensions={mediaType:'application/json'};}
  return {...asset,...dimensions,sha256:digest,bytes:bytes.length};
 }));
 assert.deepEqual(await fingerprint(imports),before,'Runtime definitions changed during collection');
 const inputs=await fingerprint([...legacy.inputs.map(row=>row.path),...variants.imports,...imports,SCRIPT,'scripts/collect-pit-variant-inputs-v107.mjs',...rows.map(row=>row.path)]);
 assert.ok(inputs.every(row=>!row.path.startsWith('docs/')),'Pre-freeze inputs must not depend on proof/master documents');
 return {schemaVersion:1,status:'INPUTS_ONLY',scope:'V106 bounded sources plus actual Pit variant/conclusion, Homeworld study, Clans image/audio and Preserve image inputs. Historical references and original/static project art are distinct; no new BODY, inventory, campaign, gameplay or browser admission.',assets:rows,inputs,variantCapabilities:variants.capabilities};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){assert.equal(process.argv.length,2,'Usage: node scripts/collect-v107-runtime-inputs.mjs');console.log(JSON.stringify(await collectRuntimeInputsV107(),null,2));}
