import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {createHash} from 'node:crypto';
const input=process.argv[2];
assert(input,'Provide the reviewed V65 native art metadata JSON.');
const read=async file=>JSON.parse(await fs.readFile(file,'utf8'));
const art=await read(input),base=await read('app/game/pitArenaProductionData.generated.json');
const sha=b=>createHash('sha256').update(b).digest('hex');
const planeIds=['P0','P1','P2','P3','P5'];
const floorCrops={
 'arena-012-balcon-du-roi-de-la-chasse':[{x:100,y:323,width:1972,height:137},{x:100,y:371,width:1972,height:208}],
 'arena-020-trone-fracture':[{x:100,y:278,width:1972,height:98},{x:100,y:299,width:1972,height:186}],
 'ruins-tribunal':[{x:100,y:286,width:1848,height:210},{x:100,y:235,width:1972,height:194}],
};
const placements={
 P0:[{x:-160,y:-100,width:1280,height:700}],
 P1:[{x:-180,y:110,width:400,height:320},{x:750,y:145,width:390,height:285}],
 P2:[{x:-115,y:100,width:250,height:330},{x:825,y:100,width:250,height:330}],
 P3:[{x:135,y:333,width:160,height:95},{x:665,y:333,width:160,height:95}],
 P5:[{x:-200,y:430,width:280,height:180},{x:880,y:430,width:280,height:180}],
};
const factors={P0:.05,P1:.12,P2:.24,P3:.43,P5:1.08};
const rows=[],proof=[];
for(const entry of art.stages){
 const original=base.stages.find(s=>s.catalogueId===entry.stageId);assert(original);
 assert([12,20,36,50,69,76].includes(original.number),'Only the six agreed original locations');
 const frame=async source=>{
  const bytes=await fs.readFile('public'+source.src);assert.equal(sha(bytes),source.sha256);
  const meta=await sharp(bytes).metadata();assert.equal(meta.width,source.width);assert.equal(meta.height,source.height);
  assert.equal(Boolean(meta.hasAlpha),source.hasAlpha);
  return {path:source.src,status:'integrated',generation:{generator:'openai-imagegen',sourceRecorded:true,sha256:source.sha256,width:source.width,height:source.height,hasAlpha:source.hasAlpha,contentBounds:source.contentBounds},review:{evidenceRecorded:true,coherence:true,layout:true,alpha:true},integration:{evidenceRecorded:true}};
 };
 const backdrop=await frame(entry.backdrop),atlas=await frame(entry.atlas);
 const planes=planeIds.map(id=>{
  const cell=entry.cells.find(c=>c.plane===id);
  if(id!=='P0')assert(cell&&cell.sourceCrop);
  const asset={id:'v65-'+id.toLowerCase(),role:id==='P0'?'Profondeur originale V65':cell.role,
   alphaRequired:id!=='P0',requiredForRuntime:true,mode:id==='P0'?'cover':'module',parallax:factors[id],opacity:1,
   ...(cell?{sourceCrop:cell.sourceCrop}:{}),...(['P1','P2','P3'].includes(id)?{anchorToGround:true}:{}),
   placements:id==='P0'&&original.number===36?[{x:0,y:0,width:960,height:640}]
    :id==='P3'&&original.number===20?[{x:360,y:242,width:240,height:198}]
    :id==='P1'&&original.number===36?[{x:-100,y:95,width:385,height:335}]
    :id==='P1'&&original.number===69?[{x:-130,y:150,width:420,height:280}]
    :id==='P1'&&original.number===76?[{x:-140,y:155,width:400,height:275}]
    :id==='P3'&&original.number===76?[{x:80,y:358,width:250,height:70},{x:630,y:358,width:250,height:70}]
    :placements[id],animation:null,frames:[id==='P0'?backdrop:atlas]};
  return {id,role:original.planes.find(p=>p.id===id).role,nominalParallax:factors[id],status:'integrated',subplanSpecification:'proposed-original',assets:[asset]};
 });
 const floorCorrections=[];
 for(const asset of original.planes.find(p=>p.id==='P4').assets){
  const libraryStage=original.number===36?base.stages.find(s=>s.number===20):null;
  const material=libraryStage?.planes.find(p=>p.id==='P4').assets.find(a=>a.mode===asset.mode)??asset;
  const f=material.frames[0],dir=f.path.split('/').at(-2),crop=floorCrops[dir]?.[asset.mode==='repeat-x'?0:1];assert(crop);
  const bytes=await fs.readFile('public'+f.path);assert.equal(sha(bytes),f.generation.sha256);
  const {data,info}=await sharp(bytes).extract({left:crop.x,top:crop.y,width:crop.width,height:crop.height}).ensureAlpha().raw().toBuffer({resolveWithObject:true});let minAlpha=255;
  for(let i=3;i<data.length;i+=info.channels)minAlpha=Math.min(minAlpha,data[i]);assert(minAlpha>=250,'Opaque floor crop required');
  floorCorrections.push({assetId:asset.id,sourceCrop:crop,height:asset.mode==='strip-x'?240:asset.placements[0].height,...(libraryStage?{librarySource:{stageId:libraryStage.catalogueId,assetId:material.id,sha256:f.generation.sha256}}:{})});
  proof.push({stageId:entry.stageId,assetId:asset.id,source:f.path,sha256:f.generation.sha256,sourceCrop:crop,minAlpha,sourcePngEdited:false});
 }
 rows.push({stageId:entry.stageId,sourceAssets:original.planes.flatMap(p=>p.assets.map(a=>({planeId:p.id,assetId:a.id,hashes:a.frames.map(f=>f.generation.sha256)}))),planes,floorCorrections});
}
rows.sort((a,b)=>a.stageId.localeCompare(b.stageId));
await fs.writeFile('app/game/data/pitStageCompositionV65.json',JSON.stringify({schemaVersion:1,release:'V65',stages:rows},null,2)+'\n');
await fs.writeFile('docs/v65-stage-floor-proof.json',JSON.stringify({schemaVersion:1,release:'V65',rows:proof},null,2)+'\n');
console.log(JSON.stringify({stages:rows.length,newPngs:rows.length*2,newStaticDrawings:rows.length*5,newAnimations:0,sourceFloorFilesEdited:0}));
