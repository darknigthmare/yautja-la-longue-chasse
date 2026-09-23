import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';

export const manifestPath='art-source/v33/pit-arenas/production-manifest.json';
export const planPath='art-source/v43/pit-arenas/composition-plan.json';
export function parseArenaNumbers(value){
 const numbers=value==='all'?Array.from({length:36},(_,i)=>i+101):String(value??'').split(',').map(Number);
 assert(numbers.length&&numbers.every(n=>Number.isInteger(n)&&n>=101&&n<=136),'Use V43 screen arena numbers 101..136, comma separated, or all');
 assert.equal(new Set(numbers).size,numbers.length,'Duplicate arena number');return numbers;
}
export async function assertHistoricalArenasUnchanged(manifest){
 const baseline=JSON.parse(await fs.readFile('art-source/v43/pit-arenas/historical-baseline.json','utf8'));
 assert.equal(manifest.stages.slice(0,100).length,baseline.count);
 assert.equal(createHash('sha256').update(JSON.stringify(manifest.stages.slice(0,100))).digest('hex'),baseline.sha256,'Historical 100 arenas changed');
}
export function assertV43AssetPath(catalogueId,assetId,publicPath){
 assert(/^arena-1(?:0[1-9]|[12][0-9]|3[0-6])-[a-z0-9]+(?:-[a-z0-9]+)*$/.test(catalogueId),'Invalid V43 screen arena identifier');
 assert(/^p[0-5]-[a-z0-9]+(?:-[a-z0-9]+)*$/.test(assetId),'Invalid V43 asset identifier');
 assert.equal(publicPath,`/game/sprites/v43/pit-arenas/${catalogueId}/${assetId}.png`,'Asset path must name its exact owned V43 PNG');
}
export async function resolveV43AssetFile(catalogueId,assetId,publicPath,realpath=fs.realpath){
 assertV43AssetPath(catalogueId,assetId,publicPath);
 const root=await realpath('public/game/sprites/v43');
 const file=await realpath('public'+publicPath);
 // The root junction is deliberate. No descendant link may remap an owned filename.
 assert.equal(path.normalize(file).toLowerCase(),path.resolve(root,'pit-arenas',catalogueId,assetId+'.png').toLowerCase(),'Asset escapes/remaps its dedicated physical V43 path');
 return file;
}
export function createPlannedScreenStage(definition){
 const factors=[.05,.12,.24,.43,1,1.08];
 return {number:definition.catalogueNumber,catalogueId:definition.id,assetDirectory:`/game/sprites/v43/pit-arenas/${definition.id}`,
  name:definition.name,setting:definition.setting,wave:definition.kind==='game'?'screen-reference-games':'screen-reference-films',legacyRuntimeArenaId:null,legacyRuntimeStatus:'concept',
  sourceConfirmation:'confirmed',runtimeEnabled:false,compositionContract:'v43-screen-reference-shared-library-compositions',
  screenReference:{kind:definition.kind,workId:definition.workId,fidelityClaim:definition.fidelityClaim,referenceStatus:definition.referenceStatus},
  planes:factors.map((factor,i)=>({id:'P'+i,role:i===0?'Profondeur adaptée du lieu référencé':'Module indépendant à composer après revue',nominalParallax:factor,status:'planned',subplanSpecification:'proposed-original',
   assets:[{id:i===0?'p0-depth':`p${i}-module-pending`,role:'À produire et vérifier',alphaRequired:i!==0,requiredForRuntime:true,mode:i===0?'cover':i===4?'repeat-x':'module',parallax:factor,opacity:1,placements:[{x:0,y:i===4?430:0,width:960,height:i===4?50:540}],animation:null,
    frames:[{path:`/game/sprites/v43/pit-arenas/${definition.id}/p${i}-${i===0?'depth':'module-pending'}.png`,status:'planned',generation:null,review:null,integration:null}]}]}))};
}

/** Pixel/layout revisions require an explicit opt-in and revoke every old runtime proof. */
export function invalidateScreenCompositionApproval(stage,explicitRevision=false){
 assert(Number.isInteger(stage.number)&&stage.number>=101&&stage.number<=136,'Only additive screen compositions may be revised');
 assert(!stage.runtimeEnabled||explicitRevision,'Cannot replace enabled composition without explicit review invalidation');
 stage.runtimeEnabled=false;delete stage.runtimeExtension;delete stage.compositionVisualReview;
}

/** Assemble requested original owners before their instances, including owners with larger IDs. */
export function orderScreenArenaAssembly(numbers,entries){
 const selected=new Set(numbers),visiting=new Set(),done=new Set(),ordered=[];
 const visit=number=>{if(done.has(number))return;assert(!visiting.has(number),'Cyclic screen module ownership');visiting.add(number);
  const spec=entries.find(e=>e.number===number);assert(spec,'Missing composition plan');
  for(const chosenAsset of spec.modules){const owner=entries.find(e=>e.catalogueId===chosenAsset.sourceCatalogueId);if(owner&&owner.number!==number&&selected.has(owner.number))visit(owner.number);}
  visiting.delete(number);done.add(number);ordered.push(number);
 };for(const number of [...numbers].sort((a,b)=>a-b))visit(number);return ordered;
}

export async function resolveV43ReceiptFile(catalogueId,assetId,realpath=fs.realpath){
 // Validate the two path segments before any filesystem call, including the root lookup.
 assertV43AssetPath(catalogueId,assetId,`/game/sprites/v43/pit-arenas/${catalogueId}/${assetId}.png`);
 const root=await realpath('art-source/v43/pit-arenas');
 const file=await realpath(`art-source/v43/pit-arenas/${catalogueId}/receipt-${assetId}.json`);
 assert.equal(path.normalize(file).toLowerCase(),path.resolve(root,catalogueId,'receipt-'+assetId+'.json').toLowerCase(),'Receipt escapes/remaps its dedicated physical V43 path');
 return file;
}
