import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {build} from 'esbuild';
import {serializePitArenaRuntimeData} from './build-pit-arena-runtime-v33.mjs';

const manifestPath='art-source/v33/pit-arenas/production-manifest.json';
const source=JSON.parse(await fs.readFile(manifestPath,'utf8'));
const baseline=JSON.stringify(source.stages.filter(s=>s.number<=136));
const loreModule=await build({stdin:{contents:'export * from "./app/game/systems/pitLoreStages";',resolveDir:process.cwd()},bundle:true,write:false,format:'esm',platform:'node',logLevel:'silent'});
const {PIT_LORE_STAGE_DEFINITIONS}=await import('data:text/javascript;base64,'+Buffer.from(loreModule.outputFiles[0].text).toString('base64'));
const records=JSON.parse(await fs.readFile('art-source/v54/pit-stages/source-records.json','utf8'));
source.sharedLibrary??=[];
function shared(sourceNumber,planeId){
 const stage=source.stages.find(s=>s.number===sourceNumber),plane=structuredClone(stage.planes.find(p=>p.id===planeId));
 for(const asset of plane.assets){
  assert(!asset.libraryRef,'Use the original module owner, never nested aliases');
  const id=stage.catalogueId+'/'+asset.id;
  if(!source.sharedLibrary.some(e=>e.id===id))source.sharedLibrary.push({id,sourceCatalogueId:stage.catalogueId,sourceAssetId:asset.id,frames:asset.frames.map(f=>({path:f.path,sha256:f.generation.sha256,width:f.generation.width,height:f.generation.height,hasAlpha:f.generation.hasAlpha,contentBounds:f.generation.contentBounds}))});
  asset.libraryRef=id;
 }
 return plane;
}
for(const definition of PIT_LORE_STAGE_DEFINITIONS){
 const existing=source.stages.find(s=>s.catalogueId===definition.id);
 assert(!existing?.runtimeEnabled,'Do not overwrite an enabled composition; review invalidation is required');
 const record=records.find(r=>r.arenaId===definition.id);assert(record?.visualReviewed===true&&record.toolSource,'Real generation and visual review required');
 const publicPath=`/game/sprites/v54/pit-arenas/${definition.id}/p0-depth.png`;
 const bytes=await fs.readFile('public'+publicPath),generated=await fs.readFile(record.toolSource);
 assert.equal(createHash('sha256').update(bytes).digest('hex'),createHash('sha256').update(generated).digest('hex'),'Public P0 must match the actual OpenAI generation');
 const meta=await sharp(bytes).metadata();assert(meta.width&&meta.height);
 const evidence='art-source/v54/pit-stages/source-records.json';
 const frame={path:publicPath,status:'reviewed',generation:{generator:'openai-imagegen',source:evidence,sha256:createHash('sha256').update(bytes).digest('hex'),width:meta.width,height:meta.height,hasAlpha:Boolean(meta.hasAlpha),contentBounds:{x:0,y:0,width:meta.width,height:meta.height}},review:{evidence,coherence:true,layout:true,alpha:true},integration:null};
 const p0={id:'P0',role:'Profondeur dédiée au lieu attesté, géométrie latérale originale',nominalParallax:.05,status:'reviewed',subplanSpecification:'proposed-original',assets:[{id:'p0-depth',role:'Nouveau PNG OpenAI dédié au lieu',alphaRequired:false,requiredForRuntime:true,mode:'cover',parallax:.05,opacity:1,placements:[{x:0,y:0,width:960,height:540}],animation:null,frames:[frame]}]};
 const haze=shared(1,'P0').assets.find(a=>a.id==='p0-b-vault-haze');assert(haze);delete haze.ambientMotion;
 Object.assign(haze,{id:'p1-distant-haze',role:'Brume distante partagée, aucun objet suspendu dans le ciel',parallax:.12,opacity:definition.catalogueNumber===138?.09:.18,placements:[{x:-100,y:220,width:1160,height:170}]});
 const p1={id:'P1',role:'Profondeur atmosphérique indépendante',nominalParallax:.12,status:'integrated',subplanSpecification:'proposed-original',assets:[haze]};
 const planes=[p0,p1,shared(104,'P2'),shared(104,'P3'),shared(definition.catalogueNumber===138?101:104,'P4'),shared(104,'P5')];
 for(const asset of planes[3].assets)asset.anchorToGround=true;
 if(definition.catalogueNumber===138){planes[2].assets[0].placements=[{x:-62,y:80,width:100,height:350},{x:922,y:80,width:100,height:350}];planes[3].assets[0].placements=[{x:32,y:380,width:90,height:50},{x:795,y:373,width:108,height:57}];}
 // The shared PNG/crop stays identical to its owner. Its visible alpha>=16 foot is
 // native y672, while the historical crop includes residue through y830.
 for(const asset of planes[3].assets){const source=asset.frames[0].generation.contentBounds;for(const p of asset.placements)p.y+=Math.max(0,source.y+source.height-672)*Math.min(p.width/source.width,p.height/source.height);}
 const stage={number:definition.catalogueNumber,catalogueId:definition.id,assetDirectory:`/game/sprites/v54/pit-arenas/${definition.id}`,name:definition.name,setting:definition.setting,wave:'character-lore-reference',legacyRuntimeArenaId:null,legacyRuntimeStatus:'concept',sourceConfirmation:'confirmed',runtimeEnabled:false,compositionContract:'v54-character-lore-shared-library-compositions',screenReference:{kind:definition.kind,workId:definition.workId,sourceUrl:definition.sourceUrl,fidelityClaim:'publisher-setting-attested-original-lateral-layout'},planes};
 if(existing)source.stages[source.stages.indexOf(existing)]=stage;else source.stages.push(stage);
}
assert.equal(JSON.stringify(source.stages.filter(s=>s.number<=136)),baseline,'Historical 136 stage records must remain identical');
await fs.writeFile(manifestPath,JSON.stringify(source,null,2)+'\n');
await fs.writeFile('app/game/pitArenaProductionData.generated.json',serializePitArenaRuntimeData(source));
console.log(JSON.stringify({prepared:2,runtimeEnabled:false,historical136Unchanged:true}));
