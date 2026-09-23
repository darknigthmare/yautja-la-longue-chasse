import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {inspectPitArenaImage} from './pit-arena-image-metadata.mjs';
import {buildPitArenaRuntimeData} from './build-pit-arena-runtime-v33.mjs';
import {libraryEntryFromOriginal,arenaCompositionDigest} from './lib/pit-arena-composition-v42.mjs';
import {parseArenaNumbers,manifestPath,planPath,assertHistoricalArenasUnchanged,resolveV43AssetFile,invalidateScreenCompositionApproval,orderScreenArenaAssembly,resolveV43ReceiptFile} from './lib/pit-screen-arena-v43.mjs';

const argument=process.argv.indexOf('--ids');assert(argument>=0,'Explicit --ids required');
const ids=parseArenaNumbers(process.argv[argument+1]);
const plan=JSON.parse(await fs.readFile(planPath,'utf8'));
const manifest=JSON.parse(await fs.readFile(manifestPath,'utf8'));
await assertHistoricalArenasUnchanged(manifest);manifest.sharedLibrary??=[];
const measurements=new Map();
async function originalAsset(stage,spec){
 const assetId=spec.assetId,receiptPath=`art-source/v43/pit-arenas/${stage.catalogueId}/receipt-${assetId}.json`;
 const receiptFile=await resolveV43ReceiptFile(stage.catalogueId,assetId);
 const receipt=JSON.parse(await fs.readFile(receiptFile,'utf8'));
 assert.equal(receipt.accepted,true);assert.notEqual(receipt.excludedFromCoverage,true);assert.equal(receipt.generator,'openai-imagegen');assert.equal(receipt.arenaId,stage.catalogueId);
 const file=await resolveV43AssetFile(stage.catalogueId,assetId,receipt.publicPath);
 assert.equal(receipt.archivedSource,'public'+receipt.publicPath,'V43 original must be the exact immutable public PNG');
 assert(typeof receipt.prompt==='string'&&receipt.prompt.trim().length>30,'Actual generation prompt missing');
 assert(['md','json'].some(extension=>receipt.reviewEvidence===`art-source/v43/pit-arenas/${stage.catalogueId}/review-${assetId}.${extension}`),'Review must identify this exact owned image');await fs.access(receipt.reviewEvidence);
 const measured=await inspectPitArenaImage(file,{alphaThreshold:1});measurements.set(receipt.publicPath,measured);
 for(const key of ['sha256','width','height','hasAlpha','contentBounds'])assert.deepEqual(measured[key],receipt[key],`Receipt measurement mismatch: ${assetId}/${key}`);
 const alphaRequired=assetId!=='p0-depth';
 assert(measured.visiblePixels>0);
 if(alphaRequired)assert(measured.hasAlpha&&measured.transparentPixels>0,'Independent module requires real alpha');
 else {const {data,info}=await sharp(file).ensureAlpha().raw().toBuffer({resolveWithObject:true});for(let p=3;p<data.length;p+=info.channels)assert.equal(data[p],255,'P0 must be opaque');}
 const asset={id:assetId,role:alphaRequired?'Module indépendant OpenAI adapté au lieu':'Profondeur OpenAI adaptée au lieu de référence',alphaRequired,requiredForRuntime:true,mode:spec.mode,parallax:spec.parallax,opacity:spec.opacity,placements:spec.placements,animation:null,
  ...Object.fromEntries(['sourceCrop','anchorToGround','verticalAlign','drawOrder'].filter(k=>spec[k]!==undefined).map(k=>[k,spec[k]])),
  frames:[{path:receipt.publicPath,status:'reviewed',generation:{generator:'openai-imagegen',source:receiptPath,...Object.fromEntries(['sha256','width','height','hasAlpha','contentBounds'].map(k=>[k,measured[k]]))},review:{evidence:receipt.reviewEvidence,coherence:true,layout:true,alpha:true},integration:null}]};
 if(asset.mode==='repeat-x'){
  assert.equal(spec.plane,'P4');assert.equal(spec.parallax,1);
  const crop=asset.sourceCrop??measured.contentBounds;
  assert(Object.values(crop).every(Number.isInteger)&&crop.x>=0&&crop.y>=0&&crop.width>0&&crop.height>0&&crop.x+crop.width<=measured.width&&crop.y+crop.height<=measured.height,'Invalid floor crop');
  const {data,info}=await sharp(file).ensureAlpha().raw().toBuffer({resolveWithObject:true});let opaque=0;
  for(let x=crop.x;x<crop.x+crop.width;x++)if(data[(crop.y*info.width+x)*info.channels+3]>=250)opaque++;
  assert(opaque/crop.width>=.98,'Floor top must contact fighters without alpha margin');
 }
 return asset;
}
const results=[];
// Dependencies are explicit: the owner must be assembled first, never synthesized from another stage.
for(const number of orderScreenArenaAssembly(ids,plan.entries)){
 const spec=plan.entries.find(e=>e.number===number),stage=manifest.stages.find(s=>s.number===number);
 assert(spec&&stage&&stage.catalogueId===spec.catalogueId);
 assert(spec.modules.length>=5&&['P1','P2','P3','P4','P5'].every(id=>spec.modules.some(m=>m.plane===id)),'All five independent foreground/depth planes must be curated before assembly');
 // Explicit revision revokes approvals: old screenshots never certify changed pixels.
 invalidateScreenCompositionApproval(stage,process.argv.includes('--revise-reviewed-composition'));
 for(const plane of stage.planes){plane.assets=[];plane.status='reviewed';}
 stage.planes[0].assets.push(await originalAsset(stage,{assetId:'p0-depth',mode:'cover',parallax:.05,opacity:1,placements:[spec.p0Placement]}));
 for(const chosen of spec.modules){
  const plane=stage.planes.find(p=>p.id===chosen.plane);assert(plane&&plane.id!=='P0');
  let asset;
  if(chosen.sourceCatalogueId===stage.catalogueId){assert.equal(chosen.sourceAssetId,chosen.assetId);asset=await originalAsset(stage,chosen);}
  else {
   const origin=manifest.stages.find(s=>s.catalogueId===chosen.sourceCatalogueId);assert(origin,'Missing original owner');
   const matches=origin.planes.flatMap(p=>p.assets).filter(a=>a.id===chosen.sourceAssetId);assert.equal(matches.length,1);const original=matches[0];
   assert(!original.libraryRef&&original.frames.every(f=>['reviewed','integrated'].includes(f.status)&&f.generation&&f.review),'Unreviewed/recursive source');
   const entry=libraryEntryFromOriginal(origin,original),prior=manifest.sharedLibrary.find(e=>e.id===entry.id);
   if(prior)assert.deepEqual(prior,entry);else manifest.sharedLibrary.push(entry);
   asset=structuredClone(original);asset.id=chosen.assetId;asset.libraryRef=entry.id;
   assert.equal(chosen.mode,original.mode);assert.deepEqual(chosen.sourceCrop,original.sourceCrop,'Shared crop cannot silently change source contract');
   for(const key of ['parallax','opacity','placements','anchorToGround','verticalAlign','drawOrder'])if(chosen[key]!==undefined)asset[key]=chosen[key];
   for(const frame of asset.frames){frame.status='reviewed';frame.integration=null;}
  }
  plane.assets.push(asset);
 }
 assert(stage.planes.every(p=>p.assets.length));
 results.push({number,arenaId:stage.catalogueId,digest:arenaCompositionDigest(stage),images:new Set(stage.planes.flatMap(p=>p.assets.flatMap(a=>a.frames.map(f=>f.path)))).size,runtimeEnabled:false});
}
await assertHistoricalArenasUnchanged(manifest);
await fs.writeFile(manifestPath,JSON.stringify(manifest,null,2)+'\n');await buildPitArenaRuntimeData();
console.log(JSON.stringify({assembled:results,historical100Unchanged:true}));
