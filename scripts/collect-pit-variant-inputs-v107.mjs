/** Measured historical Pit and reference inputs; no delivery promotion. */
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {createHash} from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const HISTORICAL={path:'docs/v106-workstreams.json'};
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const read=file=>fs.readFile(path.join(ROOT,file));
const json=async file=>JSON.parse(await read(file));
const compile=registry=>build({stdin:{contents:registry.runtimeModules.map(row=>`import * as ${row.id} from ${JSON.stringify('./'+row.path)}; export {${row.id}};`).join('\n'),resolveDir:ROOT},absWorkingDir:ROOT,bundle:true,write:false,metafile:true,platform:'node',format:'esm',logLevel:'silent'});

/** Available before status promotion so the root can bound its public freeze. */
export async function collectVariantInputsV107(){
 const bundled=await compile({runtimeModules:[{id:'variants',path:'app/game/pitWorkbookVariantCapabilitiesV107.ts'}]});
 const api=(await import('data:text/javascript;base64,'+Buffer.from(bundled.outputFiles[0].text).toString('base64'))).variants;
 const historical=await json(HISTORICAL.path),assets=new Map(historical.assets.map(row=>[row.path,{path:row.path,sha256:row.sha256,scope:'Inherited measured V106 public input; no new pixels.'}]));
 const capabilities=['feral-hunter','scar'].map(id=>api.getPitWorkbookVariantCapabilitiesV107(id));
 capabilities.push(api.getPitWorkbookVariantCapabilitiesV107('scar','scar-avec-casque-6a0a69930d'));
 for(const capability of capabilities)for(const entry of [...capability.nativeActions,...capability.nativeClips])for(const page of entry.pages)assets.set('public'+page.src,{path:'public'+page.src,sha256:page.sha256,width:page.width,height:page.height,scope:'Existing native drawing with exact appearance, clip and independent facings. No mechanical/full-kit admission.'});
 for(const reference of api.PIT_WORKBOOK_STATIC_VARIANT_REFERENCES_V107){assert.equal(reference.frameCount,1);assert.equal(reference.animated,false);assert.equal(reference.nativeFacing,'right');assets.set('public'+reference.src,{path:'public'+reference.src,sha256:reference.sha256,width:reference.width,height:reference.height,scope:'Existing one-frame right-facing V44 reference portrait. This is not a left-facing drawing, native animation, inventory state or complete kit.'});}
 const audit=await json('docs/v107-open-workstreams-audit.json');
 for(const input of audit.inputs.filter(row=>row.path.startsWith('public/')))assets.set(input.path,{...input,scope:'Existing source reference or derived icon pinned by the V107 audit; no animation admitted.'});
 const rows=await Promise.all([...assets.values()].sort((a,b)=>a.path.localeCompare(b.path)).map(async asset=>{const bytes=await read(asset.path);assert.equal(sha(bytes),asset.sha256,'Public asset changed: '+asset.path);if(asset.width){assert.equal(bytes.readUInt32BE(16),asset.width);assert.equal(bytes.readUInt32BE(20),asset.height);}return {...asset,bytes:bytes.length};}));
 assert.equal(capabilities[0].nativeActions.length,26);assert.equal(capabilities[1].nativeActions.length,26);assert.equal(capabilities[2].nativeClips.length,7);
 return {schemaVersion:1,status:'INPUTS_ONLY',assets:rows,capabilities,imports:Object.keys(bundled.metafile.inputs).filter(file=>file!=='<stdin>')};
}

