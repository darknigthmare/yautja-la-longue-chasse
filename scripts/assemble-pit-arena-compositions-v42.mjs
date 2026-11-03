import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {buildPitArenaRuntimeData} from './build-pit-arena-runtime-v33.mjs';
import {parseArenaNumbers,libraryEntryFromOriginal,arenaCompositionDigest,assertV42P0Path,resolveV42P0File} from './lib/pit-arena-composition-v42.mjs';

const ids=parseArenaNumbers(process.argv[process.argv.indexOf('--ids')+1]);
const plan=JSON.parse(await fs.readFile(process.env.V42_ARENA_PLAN??'art-source/v42/pit-arenas/composition-plan.json','utf8'));
const manifestPath='art-source/v33/pit-arenas/production-manifest.json';
const manifest=JSON.parse(await fs.readFile(manifestPath,'utf8'));
const originalTwenty=JSON.stringify(manifest.stages.slice(0,20));
manifest.sharedLibrary??=[];
const results=[];
for(const number of ids){
 const spec=plan.entries.find(e=>e.number===number),stage=manifest.stages.find(s=>s.number===number);
 assert(spec&&stage&&spec.catalogueId===stage.catalogueId);
 assertV42P0Path(stage.catalogueId,spec.outputPath);
 assert(!stage.runtimeEnabled,'Refusing to replace an enabled composition');
 const receiptPath=`art-source/v42/pit-arenas/${stage.catalogueId}/receipt-p0-depth.json`;
 const receipt=JSON.parse(await fs.readFile(receiptPath,'utf8'));
 assert.equal(receipt.accepted,true);assert.equal(receipt.generator,'openai-imagegen');
 assert.equal(receipt.arenaId,stage.catalogueId);assert.equal(receipt.publicPath,spec.outputPath);
 const publicFile=await resolveV42P0File(stage.catalogueId,receipt.publicPath);
 assert(/^(docs|art-source)\//.test(receipt.reviewEvidence??'')&&!receipt.reviewEvidence.includes('..'),'Real P0 art review required');
 await fs.access(receipt.reviewEvidence);
 assert(/^(art-source|public\/game\/sprites\/v42)\//.test(receipt.archivedSource??'')&&!receipt.archivedSource.includes('..')&&!path.isAbsolute(receipt.archivedSource));
 if(receipt.archivedSource.startsWith('public/'))assert.equal(receipt.archivedSource,'public'+receipt.publicPath,'Public archive must be the same verified P0');
 const archiveFile=receipt.archivedSource.startsWith('public/')?publicFile:receipt.archivedSource;
 for(const file of [publicFile,archiveFile]){
  const bytes=await fs.readFile(file);
  assert.equal(createHash('sha256').update(bytes).digest('hex'),receipt.sha256,'P0 source/public hash mismatch');
  const info=await sharp(bytes).metadata();assert.equal(info.width,receipt.width);assert.equal(info.height,receipt.height);
 }
 const {data,info}=await sharp(publicFile).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 for(let i=3;i<data.length;i+=info.channels)assert.equal(data[i],255,'P0 must be fully opaque');
 stage.assetDirectory=path.posix.dirname(receipt.publicPath);
 stage.runtimeEnabled=false;delete stage.runtimeExtension;
 stage.compositionContract='v42-explicit-shared-library-compositions';
 stage.signatureBacklog=spec.signatureNeeds;
 for(const plane of stage.planes){plane.assets=[];plane.status='reviewed';plane.subplanSpecification='proposed-original';if(plane.id==='P4')plane.nominalParallax=1;}
 stage.planes[0].assets.push({id:'p0-depth',role:'Profondeur originale propre à cette composition',alphaRequired:false,requiredForRuntime:true,
  mode:'cover',parallax:.05,opacity:1,placements:[spec.p0Placement??{x:-160,y:-100,width:1280,height:700}],animation:null,
  frames:[{path:receipt.publicPath,status:'reviewed',generation:{generator:'openai-imagegen',source:receiptPath,
   sha256:receipt.sha256,width:receipt.width,height:receipt.height,hasAlpha:receipt.hasAlpha,contentBounds:receipt.contentBounds},
   review:{evidence:receipt.reviewEvidence,coherence:true,layout:true,alpha:true},integration:null}]});
 for(const chosen of spec.curatedModules){
  const origin=manifest.stages.find(s=>s.catalogueId===chosen.sourceCatalogueId);
  assert(origin&&origin.number<=20,'Library source must be a preserved reviewed kit');
  const original=origin.planes.flatMap(p=>p.assets).find(a=>a.id===chosen.sourceAssetId);
  assert(original);assert(original.frames.every(f=>f.status==='integrated'&&f.generation&&f.review));
  assert.deepEqual(original.frames.map(f=>f.generation.sha256),chosen.sourceSha256);
  const entry=libraryEntryFromOriginal(origin,original);assert.equal(entry.id,chosen.libraryRef);
  const prior=manifest.sharedLibrary.find(e=>e.id===entry.id);if(prior)assert.deepEqual(prior,entry);else manifest.sharedLibrary.push(entry);
  const asset=structuredClone(original);asset.id=chosen.plane.toLowerCase()+'-'+original.id;asset.libraryRef=entry.id;
  asset.placements=chosen.placements;asset.parallax=chosen.parallax;asset.opacity=chosen.opacity;asset.requiredForRuntime=true;
  if(chosen.anchorToGround!==undefined)asset.anchorToGround=chosen.anchorToGround;
  if(chosen.ambientMotion)asset.ambientMotion=structuredClone(chosen.ambientMotion);
  for(const f of asset.frames){f.status='reviewed';f.integration=null;}
  stage.planes.find(p=>p.id===chosen.plane).assets.push(asset);
 }
 assert(stage.planes.every(p=>p.assets.length));
 results.push({number,id:stage.catalogueId,images:new Set(stage.planes.flatMap(p=>p.assets.flatMap(a=>a.frames.map(f=>f.path)))).size,
  modules:stage.planes.reduce((n,p)=>n+p.assets.length,0),digest:arenaCompositionDigest(stage),runtimeEnabled:false});
}
assert.equal(JSON.stringify(manifest.stages.slice(0,20)),originalTwenty,'Historical twenty changed');
await fs.writeFile(manifestPath,JSON.stringify(manifest,null,2)+'\n');
await buildPitArenaRuntimeData();
console.log(JSON.stringify({assembled:results,sharedLibraryEntries:manifest.sharedLibrary.length}));
