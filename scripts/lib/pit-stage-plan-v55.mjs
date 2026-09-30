import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs/promises';
import {createHash,randomUUID} from 'node:crypto';
import sharp from 'sharp';
import os from 'node:os';
import {arenaCompositionDigest,libraryEntryFromOriginal} from './pit-arena-composition-v42.mjs';
import {inspectPitArenaImage} from '../pit-arena-image-metadata.mjs';

export const V55_PLAN_PATH='docs/v55-stage-plan.json';
export const V55_RECEIPTS_PATH='art-source/v55/pit-stages/source-records.json';
export const V55_RUNTIME_PATH='app/game/systems/pitLoreStagesV55.generated.json';
export const V55_VISUAL_PATH='docs/v55-stage-composition-visual-review.json';
const generic=(owner,floor=owner)=>({P2:owner,P3:owner,P4:floor,P5:owner});
/** Real module owners, never recursive aliases or invented textures. */
export const V55_MODULE_PROFILES={
 jungle:{...generic(101),description:'Troncs, racines, sol terreux et feuillage tropical.'},
 forest:{...generic(113),description:'Troncs dénudés, pierres et bois mort, terre forestière.'},
 metal:{...generic(104),description:'Montants industriels, malle métallique, plancher acier et câbles.'},
 'urban-roof':{P2:104,P3:{owner:104,plane:'P5'},P4:104,P5:104,description:'Supports techniques et câbles discrets sur toiture humaine, sans caisse ou temple.'},
 'nature-mineral':{P2:null,P3:null,P4:101,P5:'atmosphere',description:'Escarpements et pierres nues natifs dédiés, sans architecture ou bois mort.',requiresNativeModules:true},
 'clean-interior':{P2:null,P3:null,P4:104,P5:'atmosphere',description:'Architecture et mobilier humains sobres, natifs dédiés, sans caisses militaires.',requiresNativeModules:true},
 organic:{P2:null,P3:null,P4:104,P5:'atmosphere',description:'Nervures et conduits organiques natifs dédiés, sans accessoires humains.',requiresNativeModules:true},
 stone:{...generic(122),description:'Piliers et blocs de pierre, dalles, bords architecturaux.'},
 ice:{...generic(113,116),description:'Bois mort et branches, véritable dalle glacée indépendante.'},
 'dry-earth':{P2:122,P3:113,P4:101,P5:122,description:'Terre sèche et éléments minéraux ; ne prétend pas fournir une tuile de sable pur.'},
 ritual:{...generic(1),description:'Architecture rituelle, braseros et sol basaltique.'},
 archive:{...generic(2),description:'Vitrines et trophées anonymes, dalle de galerie.'},
 forge:{...generic(10),description:'Structures et accessoires de forge du projet.'},
 dock:{...generic(9),description:'Éléments des quais du projet, plateforme portuaire.'},
 abyss:{...generic(7),description:'Supports et accessoires du pont abyssal du projet.'},
 temple:{...generic(8),description:'Supports et fragments des ruines du projet.'},
 observatory:{...generic(18),description:'Structures et accessoires de l’observatoire du projet.'},
 roof:{...generic(117),description:'Poteaux, tuiles et avant-toits : uniquement pour un cadre architectural compatible.'},
};
export const V55_CLASSIFICATIONS=['character-setting','work-setting','original-exhibition'];
export const V55_SOURCE_STATUSES=['resolved','primary-limited','original-selected'];
const nonempty=value=>typeof value==='string'&&value.trim().length>0;
const sourcesValid=urls=>Array.isArray(urls)&&urls.every(url=>{try{const u=new URL(url);return u.protocol==='https:'&&!u.username&&!u.password;}catch{return false;}});
const isWithin=(root,file)=>{const relative=path.relative(root,file);return relative!==''&&!relative.startsWith('..'+path.sep)&&relative!=='..'&&!path.isAbsolute(relative);};
async function assertSafeV55Destination(projectRoot,destination){
 const publicRoot=await fs.realpath(path.resolve(projectRoot,'public'));
 let parent=destination;
 while(true){
  try{const actual=await fs.realpath(parent);assert(isWithin(publicRoot,actual),'PNG output escapes the physical public root through a link');return;}
  catch(error){if(error.code!=='ENOENT')throw error;const next=path.dirname(parent);assert.notEqual(next,parent);parent=next;}
 }
}
export function validateV55Plan(plan,{existingStages=[],rosterIds,completeAssociations=true}={}){
 assert.equal(plan?.schemaVersion,1);assert.equal(plan.release,'V55');assert(Array.isArray(plan.stages)&&plan.stages.length>0);
 const ids=new Set(existingStages.map(s=>s.catalogueId)),numbers=new Set(existingStages.map(s=>s.number));
 for(const s of plan.stages){
  assert(Number.isInteger(s.number)&&s.number>=139&&s.number<=999,'New catalogue numbers start at139');
  assert(typeof s.id==='string'&&new RegExp('^arena-'+String(s.number).padStart(3,'0')+'-[a-z0-9]+(?:-[a-z0-9]+)*$').test(s.id),'Exact immutable number/id binding');
  assert(!ids.has(s.id)&&!numbers.has(s.number),'Duplicate stage identity');ids.add(s.id);numbers.add(s.number);
  for(const key of['name','workId','workTitle','setting'])assert(nonempty(s[key]),'Missing '+key);
  assert(['film','game','comic','novel','original'].includes(s.kind));
  assert(Object.hasOwn(V55_MODULE_PROFILES,s.moduleProfile),'Unknown or unproduced module profile '+s.moduleProfile);
  assert(s.palette&&['sky','ground','accent'].every(k=>/^#[0-9a-f]{6}$/i.test(s.palette[k])));
  assert(V55_CLASSIFICATIONS.includes(s.reference?.classification)&&nonempty(s.reference?.claim));
  assert(sourcesValid(s.reference.sources));
  assert.equal(s.kind==='original',s.reference.classification==='original-exhibition','An original exhibition must be labelled original in both metadata and source classification');
  if(s.kind!=='original')assert(s.reference.sources.length>0,'Attested/work settings need primary source references');
  assert.equal(s.p0?.publicPath,`/game/sprites/v55/pit-arenas/${s.id}/p0-depth.png`,'P0 belongs to its exact dedicated directory');assert(nonempty(s.p0.sourceRecordId));
  if(s.floor){
   assert(['pavement','sand','organic','earth','ice','metal'].includes(s.floor.material));
   const owner=s.floor.ownerStageId??s.id;
   assert.equal(s.floor.publicPath,`/game/sprites/v55/pit-arenas/${owner}/p4-floor.png`);
   assert(nonempty(s.floor.sourceRecordId));
   assert(s.floor.placement?.width>=256&&s.floor.placement?.width<=1920&&s.floor.placement?.height>=110&&s.floor.placement?.height<=400);
   if(s.floor.sourceCrop)assert(['x','y','width','height'].every(k=>Number.isInteger(s.floor.sourceCrop[k])&&s.floor.sourceCrop[k]>=(k==='x'||k==='y'?0:1)));
  }
  if(V55_MODULE_PROFILES[s.moduleProfile].requiresNativeModules){
   assert(s.modules,'This environment needs actually produced native modules');
   for(const plane of['P2','P3']){const m=s.modules[plane];assert(m&&nonempty(m.sourceRecordId));assert.equal(m.publicPath,`/game/sprites/v55/pit-arenas/${m.ownerStageId??s.id}/${plane.toLowerCase()}-module.png`);if(m.sourceCrop)assert(['x','y','width','height'].every(k=>Number.isInteger(m.sourceCrop[k])&&m.sourceCrop[k]>=(k==='x'||k==='y'?0:1)));}
   const material={'nature-mineral':'sand','clean-interior':'pavement',organic:'organic'}[s.moduleProfile];assert.equal(s.floor?.material,material,'The physical floor must match this native environment');
  }
 }
 for(const s of plan.stages)if(s.floor?.ownerStageId){
  const owner=plan.stages.find(o=>o.id===s.floor.ownerStageId);assert(owner&&owner.number<s.number&&!owner.floor?.ownerStageId,'Shared floor must name an earlier, original owner');
  assert.deepEqual({...s.floor,ownerStageId:undefined,placement:undefined},{...owner.floor,ownerStageId:undefined,placement:undefined},'Shared floor keeps exact material, crop and original receipt');
 }
 for(const s of plan.stages)for(const plane of['P2','P3'])if(s.modules?.[plane]?.ownerStageId){
  const m=s.modules[plane],owner=plan.stages.find(o=>o.id===m.ownerStageId);assert(owner&&owner.number<s.number&&!owner.modules?.[plane]?.ownerStageId,'Native module must name an earlier original owner');
  assert.deepEqual({...m,ownerStageId:undefined},{...owner.modules[plane],ownerStageId:undefined},'Native module aliases keep the original receipt and source crop');
 }
 assert(Array.isArray(plan.associations));const fighters=new Set();
 const venues=new Set([...plan.stages.map(s=>s.id),...existingStages.filter(s=>s.runtimeEnabled).map(s=>s.legacyRuntimeArenaId??s.runtimeExtension?.arenaId).filter(Boolean)]);
 for(const a of plan.associations){
  assert(nonempty(a.fighterId)&&!fighters.has(a.fighterId),'One explicit recommendation per identity');fighters.add(a.fighterId);
  if(rosterIds)assert(rosterIds.includes(a.fighterId),'Unknown fighter '+a.fighterId);
  assert(venues.has(a.stageId),'Unknown recommended venue '+a.stageId);
  assert(V55_CLASSIFICATIONS.includes(a.classification)&&V55_SOURCE_STATUSES.includes(a.sourceStatus));
  assert(nonempty(a.reason)&&a.reason.length>=20);assert(sourcesValid(a.sourceUrls));
  if(a.classification==='original-exhibition')assert.equal(a.sourceStatus,'original-selected');
  else{assert.notEqual(a.sourceStatus,'original-selected');assert(a.sourceUrls.length>0,'A source-limited association still needs the referenced primary source');assert.notEqual(plan.stages.find(s=>s.id===a.stageId)?.kind,'original','An original stage cannot become an attested location through a fighter association');}
 }
 if(completeAssociations&&rosterIds){assert.equal(fighters.size,rosterIds.length);assert(rosterIds.every(id=>fighters.has(id)),'All selectable identities require an explicit decision, including original exhibitions');}
 return plan;
}

export function v55RuntimeProjection(plan){
 return {schemaVersion:1,release:'V55',stages:plan.stages.map(s=>({id:s.id,catalogueNumber:s.number,name:s.name,kind:s.kind,workId:s.workId,workTitle:s.workTitle,setting:s.setting,palette:s.palette,referenceStatus:s.reference.classification,sourceUrl:s.reference.sources[0]??null,sourceUrls:s.reference.sources,sourceClaim:s.reference.claim,dedicatedFighters:plan.associations.filter(a=>a.stageId===s.id&&a.classification==='character-setting').map(a=>a.fighterId)})),associations:plan.associations};
}

function originalAsset(manifest,ownerNumber,assetId){
 const owner=manifest.stages.find(s=>s.number===ownerNumber),asset=owner?.planes.flatMap(p=>p.assets).find(a=>a.id===assetId);
 assert(owner&&asset&&!asset.libraryRef,'Shared module must name an original owner: '+ownerNumber+'/'+assetId);
 return {owner,asset};
}
function shareAsset(manifest,ownerNumber,assetId){
 const {owner,asset}=originalAsset(manifest,ownerNumber,assetId),entry=libraryEntryFromOriginal(owner,asset);
 manifest.sharedLibrary??=[];const previous=manifest.sharedLibrary.find(e=>e.id===entry.id);
 if(previous)assert.deepEqual(previous,entry,'Existing library receipt cannot be rewritten');else manifest.sharedLibrary.push(entry);
 return {...structuredClone(asset),libraryRef:entry.id};
}
function sharedPlane(manifest,source,id){
 const ownerNumber=typeof source==='number'?source:source.owner,sourceId=typeof source==='number'?id:source.plane;
 const plane=manifest.stages.find(s=>s.number===ownerNumber)?.planes.find(p=>p.id===sourceId);assert(plane,'Missing owner plane '+ownerNumber+'/'+sourceId);
 // Large central structures and lamps are not copied blindly into every new setting.
 const modules=['P2','P3'].includes(id)?plane.assets.filter(a=>!a.id.includes('central')&&!a.id.includes('light')&&!a.id.includes('lamp')&&!a.animation).slice(0,2):plane.assets;
 assert(modules.length);const assets=modules.map(a=>{
  if(!a.libraryRef)return shareAsset(manifest,ownerNumber,a.id);
  const entry=manifest.sharedLibrary.find(e=>e.id===a.libraryRef),owner=manifest.stages.find(s=>s.catalogueId===entry?.sourceCatalogueId);assert(entry&&owner,'Existing alias must identify its direct original owner');
  const registered=shareAsset(manifest,owner.number,entry.sourceAssetId);
  return {...structuredClone(a),libraryRef:registered.libraryRef};
 });
 if(ownerNumber===1&&['P2','P3'].includes(id))for(const asset of assets)asset.anchorToGround=true;
 if(id==='P5')for(const asset of assets)if(asset.verticalAlign==='top')for(const placement of asset.placements)placement.y=Math.min(placement.y,-85);
 if(sourceId!==id)for(const asset of assets){asset.id=id.toLowerCase()+'-'+asset.id;asset.parallax=.82;asset.opacity=.6;asset.verticalAlign='top';asset.placements=[{x:85,y:-85,width:90,height:180},{x:785,y:-85,width:90,height:180}];}
 return {...structuredClone(plane),id,assets};
}

/** Measurements only. No source pixel, crop, or canonical library receipt is changed. */
export async function measureVisibleAssetContact(asset,projectRoot=process.cwd(),cache=new Map()){
 const frame=asset.frames[0],crop=asset.sourceCrop??frame.generation.contentBounds,key=frame.path+JSON.stringify(crop);if(!cache.has(key))cache.set(key,(async()=>{
  const {data,info}=await sharp(path.resolve(projectRoot,'public','.'+frame.path)).ensureAlpha().raw().toBuffer({resolveWithObject:true});let bottom=-1;
  assert(['x','y','width','height'].every(k=>Number.isInteger(crop[k])&&crop[k]>=(k==='x'||k==='y'?0:1))&&crop.x+crop.width<=info.width&&crop.y+crop.height<=info.height,'Source crop must stay strictly inside its native PNG');
  for(let y=crop.y;y<crop.y+crop.height;y++)for(let x=crop.x;x<crop.x+crop.width;x++)if(data[(y*info.width+x)*info.channels+info.channels-1]>=16)bottom=Math.max(bottom,y);
  assert(bottom>=crop.y,'No visible grounded prop');return {path:frame.path,crop,visibleBottomExclusive:bottom+1,alphaThreshold:16};
 })());return cache.get(key);
}
export function calibrateGroundedPlacements(asset,measurement){
 if(!asset.anchorToGround||asset.mode!=='module')return;
 const source=asset.sourceCrop??asset.frames[0].generation.contentBounds;
 const residue=Math.max(0,source.y+source.height-measurement.visibleBottomExclusive);
 for(const p of asset.placements)p.y+=residue*Math.min(p.width/source.width,p.height/source.height);
}

async function verifiedV55Frame(spec,assetSpec,records,projectRoot,kind){
 assert.equal(new Set(records.map(r=>r.id)).size,records.length,'Duplicate source receipt');
 const record=records.find(r=>r.id===assetSpec.sourceRecordId);assert(record&&record.arenaId===spec.id,'Receipt identity mismatch');
 assert.equal(record.generator,'openai-imagegen');assert.equal(record.visualReviewed,true);assert(nonempty(record.reviewNotes)&&record.reviewNotes.length>=20,'Actual visual review required');
 assert(nonempty(record.toolSource)&&/[\\/]\.codex[\\/]generated_images[\\/]/.test(record.toolSource)&&/^exec-[a-f0-9-]+\.png$/i.test(path.basename(record.toolSource)),'Use the exact actual OpenAI output, not an invented authoring image');
 assert(!record.toolSource.split(/[\\/]/).includes('..'),'Source traversal is forbidden');
 const logicalRoot=path.resolve(process.env.CODEX_HOME??path.join(os.homedir(),'.codex'),'generated_images');
 const logicalFile=path.resolve(record.toolSource),relative=path.relative(logicalRoot,logicalFile).split(path.sep);
 assert(isWithin(logicalRoot,logicalFile)&&relative.length===2&&/^[a-f0-9-]{36}$/i.test(relative[0]),'Use the exact OpenAI conversation output path');
 // This installation moves conversation output directories through explicit NTFS junctions.
 // Resolve that specific directory, then reject per-file links escaping its real location.
 const outputRoot=await fs.realpath(path.join(logicalRoot,relative[0])),sourceFile=await fs.realpath(logicalFile);
 assert(isWithin(outputRoot,sourceFile),'The native source must remain inside its actual OpenAI conversation output directory');
 const bytes=await fs.readFile(sourceFile),sha256=createHash('sha256').update(bytes).digest('hex'),meta=await sharp(bytes).metadata();
 if(record.publicPath!==undefined)assert.equal(record.publicPath,assetSpec.publicPath);
 if(record.sha256!==undefined)assert.equal(record.sha256,sha256,'Archived source hash must match actual native bytes');
 for(const key of['width','height'])if(record[key]!==undefined)assert.equal(record[key],meta[key],'Archived native dimension mismatch');
 assert(meta.format==='png');
 if(kind==='module')assert(meta.width>=256&&meta.height>=128&&meta.hasAlpha,'A native independent module with alpha is required');
 else assert(meta.width>=960&&meta.width>meta.height&&meta.height>=(kind==='p0'?540:64),'A complete native landscape PNG is required');
 const destination=path.resolve(projectRoot,'public','.'+assetSpec.publicPath),safeRoot=path.resolve(projectRoot,'public/game/sprites/v55/pit-arenas')+path.sep;
 assert(destination.startsWith(safeRoot));await assertSafeV55Destination(projectRoot,destination);await fs.mkdir(path.dirname(destination),{recursive:true});
 const existing=await fs.readFile(destination).catch(error=>{if(error.code==='ENOENT')return null;throw error;});
 if(existing)assert.equal(createHash('sha256').update(existing).digest('hex'),sha256,'Never overwrite another image silently');else await fs.writeFile(destination,bytes);
 const measured=await inspectPitArenaImage(destination,{alphaThreshold:16});
 if(kind==='module')assert(measured.transparentPixels>meta.width*meta.height*.05,'An alpha channel with an opaque painted backdrop is not a modular cutout');
 return {path:assetSpec.publicPath,status:'reviewed',generation:{generator:'openai-imagegen',source:V55_RECEIPTS_PATH,sha256,width:meta.width,height:meta.height,hasAlpha:Boolean(meta.hasAlpha),contentBounds:measured.contentBounds},review:{evidence:V55_RECEIPTS_PATH,coherence:true,layout:true,alpha:true},integration:null};
}
export const verifiedV55P0=(spec,records,projectRoot=process.cwd())=>verifiedV55Frame(spec,spec.p0,records,projectRoot,'p0');

/** Inspect every native row: an opaque contact edge alone can hide holes below it. */
export async function measureV55FloorCoverage(asset,projectRoot=process.cwd()){
 const crop=asset.sourceCrop??asset.frames[0].generation.contentBounds;
 const {data,info}=await sharp(path.resolve(projectRoot,'public','.'+asset.frames[0].path)).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 assert(crop.x>=0&&crop.y>=0&&crop.x+crop.width<=info.width&&crop.y+crop.height<=info.height);
 let minimumRowOpaqueRatio=1,topRowOpaqueRatio=0;
 for(let y=crop.y;y<crop.y+crop.height;y++){
  let opaque=0;for(let x=crop.x;x<crop.x+crop.width;x++)if(data[(y*info.width+x)*info.channels+info.channels-1]>=250)opaque++;
  const ratio=opaque/crop.width;if(y===crop.y)topRowOpaqueRatio=ratio;minimumRowOpaqueRatio=Math.min(minimumRowOpaqueRatio,ratio);
 }
 return {path:asset.frames[0].path,crop,topRowOpaqueRatio,minimumRowOpaqueRatio};
}

export async function buildV55Floor(spec,manifest,records,projectRoot=process.cwd()){
 const floor=spec.floor;assert(floor);
 let asset;
 if(floor.ownerStageId){const owner=manifest.stages.find(s=>s.catalogueId===floor.ownerStageId);assert(owner);asset=shareAsset(manifest,owner.number,'p4-floor');}
 else{
  const frame=await verifiedV55Frame(spec,floor,records,projectRoot,'floor');
  asset={id:'p4-floor',role:'Sol '+floor.material+' OpenAI indépendant',alphaRequired:false,requiredForRuntime:true,mode:'repeat-x',parallax:1,opacity:1,placements:[],animation:null,...(floor.sourceCrop?{sourceCrop:floor.sourceCrop}:{}),frames:[frame]};
 }
 const crop=asset.sourceCrop??asset.frames[0].generation.contentBounds;
 const coverage=await measureV55FloorCoverage(asset,projectRoot);
 assert(coverage.minimumRowOpaqueRatio>=.98,'Every floor row must be opaque, including the exact physical contact edge');
 assert(crop.height/crop.width*floor.placement.width>=180,'The native floor ratio must cover the lower screen at zoom 0.8 without stretching');
 asset.placements=[{x:0,y:430,...floor.placement}];
 return {id:'P4',role:'Sol physique natif indépendant',nominalParallax:1,status:'reviewed',subplanSpecification:'proposed-original',assets:[asset]};
}

async function nativeV55ModulePlane(spec,id,manifest,records,projectRoot){
 const moduleSpec=spec.modules?.[id];assert(moduleSpec,'Missing produced module '+id);let asset;
 if(moduleSpec.ownerStageId){const owner=manifest.stages.find(s=>s.catalogueId===moduleSpec.ownerStageId);assert(owner);asset=shareAsset(manifest,owner.number,id.toLowerCase()+'-module');}
 else{const frame=await verifiedV55Frame(spec,moduleSpec,records,projectRoot,'module');asset={id:id.toLowerCase()+'-module',role:'Module natif indépendant '+spec.moduleProfile,alphaRequired:true,requiredForRuntime:true,mode:'module',anchorToGround:true,parallax:id==='P2'?.62:.85,opacity:id==='P2'?.82:1,placements:[],animation:null,...(moduleSpec.sourceCrop?{sourceCrop:moduleSpec.sourceCrop}:{}),frames:[frame]};}
 asset.placements=id==='P2'?[{x:-110,y:70,width:265,height:360},{x:805,y:70,width:265,height:360}]:[{x:45,y:360,width:145,height:70},{x:775,y:360,width:145,height:70}];
 return {id,role:'Module natif dédié au milieu',nominalParallax:asset.parallax,status:'reviewed',subplanSpecification:'proposed-original',assets:[asset]};
}

export async function composeV55Stage(spec,manifest,p0,{projectRoot=process.cwd(),measurementCache=new Map(),records=[]}={}){
 const profile=V55_MODULE_PROFILES[spec.moduleProfile];assert(profile);
 const haze=shareAsset(manifest,1,'p0-b-vault-haze');delete haze.ambientMotion;
 Object.assign(haze,{id:'p1-atmosphere',parallax:.12,opacity:.12,placements:[{x:-100,y:190,width:1160,height:150}]});
 const planes=[{id:'P0',role:'Profondeur dédiée : interprétation latérale originale',nominalParallax:.05,status:'reviewed',subplanSpecification:'proposed-original',assets:[{id:'p0-depth',role:'PNG OpenAI dédié au lieu',alphaRequired:false,requiredForRuntime:true,mode:'cover',parallax:.05,opacity:1,placements:[{x:0,y:0,width:960,height:540}],animation:null,frames:[p0]}]},
  {id:'P1',role:'Atmosphère alpha indépendante',nominalParallax:.12,status:'integrated',subplanSpecification:'proposed-original',assets:[haze]}];
 for(const id of['P2','P3','P4','P5']){
  if(profile[id]===null)planes.push(await nativeV55ModulePlane(spec,id,manifest,records,projectRoot));
  else if(profile[id]==='atmosphere'){const atmosphere=structuredClone(haze);Object.assign(atmosphere,{id:'p5-near-atmosphere',parallax:1.08,opacity:.06,placements:[{x:-40,y:385,width:1040,height:90}]});planes.push({id,role:'Brume proche alpha discrète',nominalParallax:1.08,status:'integrated',subplanSpecification:'proposed-original',assets:[atmosphere]});}
  else planes.push(sharedPlane(manifest,profile[id],id));
 }
 const contactMeasurements=[];
 for(const plane of planes)for(const asset of plane.assets)if(asset.anchorToGround&&asset.mode==='module'){
  const measured=await measureVisibleAssetContact(asset,projectRoot,measurementCache),authoredBottoms=asset.placements.map(p=>p.y+p.height);calibrateGroundedPlacements(asset,measured);contactMeasurements.push({plane:plane.id,assetId:asset.id,...measured,authoredBottoms});
 }
 if(spec.floor)planes[4]=await buildV55Floor(spec,manifest,records,projectRoot);
 const stage={number:spec.number,catalogueId:spec.id,assetDirectory:`/game/sprites/v55/pit-arenas/${spec.id}`,name:spec.name,setting:spec.setting,wave:'v55-character-stage-coverage',legacyRuntimeArenaId:null,legacyRuntimeStatus:'concept',sourceConfirmation:'confirmed',runtimeEnabled:false,compositionContract:'v55-character-lore-shared-library-compositions',authoringPlanDigest:createHash('sha256').update(JSON.stringify(spec)).digest('hex'),screenReference:{kind:spec.kind,workId:spec.workId,classification:spec.reference.classification,sourceUrls:spec.reference.sources,fidelityClaim:'original-lateral-layout-not-shot-exact'},moduleProfile:spec.moduleProfile,contactMeasurements,planes};
 return stage;
}

export function validateV55Promotion(stage,renderer,visual){
 const digest=arenaCompositionDigest(stage);assert.equal(renderer.result,'PASS');assert.equal(renderer.arenaId,stage.catalogueId);assert.equal(renderer.compositionDigest,digest);
 assert(renderer.loaded.independentKit&&renderer.loaded.images===renderer.loaded.expectedImages);assert.deepEqual(renderer.loaded.failed,[]);assert.deepEqual(renderer.errors,[]);assert.deepEqual(renderer.failedRequests,[]);
 assert(renderer.mobileNoOverflow&&renderer.scenarios.length>=8&&renderer.scenarios.every(s=>s.planes.length===6&&!s.missing.length&&s.unchangedState&&s.unchangedCamera&&s.fighters.every(Boolean)&&s.groundedPropsVerified&&s.floorCoversScreen&&s.hangingPropsAnchored));
 assert.equal(new Set(renderer.scenarios.map(s=>s.name)).size,renderer.scenarios.length,'Repeated identical scenario names cannot replace distinct camera coverage');
 assert(renderer.floorEvidence?.length>0&&renderer.floorEvidence.every(f=>f.topRowOpaqueRatio>=.98&&f.minimumRowOpaqueRatio>=.98),'The complete native floor needs its own measured opacity evidence');
 assert(visual?.accepted===true&&visual.compositionDigest===digest&&visual.captures?.length>=3&&nonempty(visual.notes)&&visual.notes.length>=20,'Human visual review must match this precise composition');
 return digest;
}

/** Re-read native public bytes at both renderer qualification and final promotion. */
export async function verifyV55StageBytes(stage,projectRoot=process.cwd()){
 const checked=new Map();
 for(const frame of stage.planes.flatMap(p=>p.assets.flatMap(a=>a.frames))){
  assert(/^\/game\/sprites\/v(?:33|34|42|43|54|55)\/pit-arenas\/[a-z0-9/-]+\.png$/.test(frame.path)&&!frame.path.includes('..'),'Invalid public source path');
  const expected=frame.generation;assert(expected?.sha256);
  let actual=checked.get(frame.path);
  if(!actual){const bytes=await fs.readFile(path.resolve(projectRoot,'public','.'+frame.path)),meta=await sharp(bytes).metadata();actual={path:frame.path,sha256:createHash('sha256').update(bytes).digest('hex'),width:meta.width,height:meta.height,hasAlpha:Boolean(meta.hasAlpha),format:meta.format};checked.set(frame.path,actual);}
  assert.equal(actual.format,'png');for(const key of['sha256','width','height','hasAlpha'])assert.equal(actual[key],expected[key],'Native public image differs from its receipt: '+frame.path+'/'+key);
 }
 return [...checked.values()];
}

/** Prepare all outputs first; a failed rename restores the previous files without rewriting them. */
export async function writeV55Artifacts(outputs,io=fs){
 const suffix='.v55-'+randomUUID(),records=outputs.map(([destination,content])=>({destination,content,temporary:destination+suffix+'.tmp',backup:destination+suffix+'.bak',backedUp:false,installed:false}));
 try{
  for(const r of records)await io.writeFile(r.temporary,r.content,{flag:'wx'});
  for(const r of records){
   try{await io.rename(r.destination,r.backup);r.backedUp=true;}catch(error){if(error.code!=='ENOENT')throw error;}
   await io.rename(r.temporary,r.destination);r.installed=true;
  }
 }catch(error){
  for(const r of [...records].reverse()){
   if(r.backedUp)await io.rename(r.backup,r.destination);
   else if(r.installed)await io.unlink(r.destination);
  }throw error;
 }finally{
  for(const r of records)await io.unlink(r.temporary).catch(error=>{if(error.code!=='ENOENT')throw error;});
 }
 for(const r of records)if(r.backedUp)await io.unlink(r.backup);
}
