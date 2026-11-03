import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {homeworldQaModelV64} from '../scripts/homeworld-qa-model-v64.mjs';
import {measureHomeworldOpaqueRowsV76,measureHomeworldOpacityManifestV76} from '../scripts/measure-homeworld-opacity-v76.mjs';

const a=homeworldQaModelV64(process.cwd(),['homeworldArchitectureArtV76.ts','homeworldGeometryV64.ts','homeworldCity.ts','homeworldLifeV69.ts']);
const records=Object.entries(a.HOMEWORLD_ARCHITECTURE_IDENTITIES_V76);
function buildingFor(id,art){return {id,x:1280,y:4480,width:570,height:500,footprint:{width:570,depth:340},art};}
function worldAtPixel(building,x,y){
 const position=a.homeworldBuildingSpritePlacementV64(building),scale=a.homeworldBuildingSpriteScaleV64(building);
 return a.homeworldUnprojectGroundV64({x:position.left+x*scale,y:position.top+y*scale});
}
function bodyAlphaCount(data,info,x,y,halfWidth,height){
 let count=0;
 for(let py=Math.max(0,Math.floor(y-height));py<=Math.min(info.height-1,Math.floor(y));py++)
  for(let px=Math.max(0,Math.floor(x-halfWidth));px<=Math.min(info.width-1,Math.floor(x+halfWidth));px++)
   if(data[(py*info.width+px)*4+3]>=24)count++;
 return count;
}

for(const [id,record]of records)test('every native alpha pixel agrees with deterministic opaque row runs · '+id,async()=>{
 const art=record.art,bytes=await fs.readFile('public'+art.src);
 assert.equal(createHash('sha256').update(bytes).digest('hex'),art.sha256);
 assert.equal(record.measurement.alphaThreshold,200,'foundation metrology stays unchanged');
 assert.equal(record.measurement.opaqueAlphaThresholdV76,24,'paint opacity has its own threshold');
 const {data,info}=await sharp(bytes).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 assert.equal(art.opaqueRowsV76.length,info.height);
 let disagreement=0,holes=0;
 for(let y=0;y<info.height;y++){
  const row=art.opaqueRowsV76[y],expanded=new Uint8Array(info.width);assert.equal(row.length%2,0);
  if(row.length>2)holes++;
  for(let i=0;i<row.length;i+=2){assert(row[i]>=0&&row[i]<row[i+1]&&row[i+1]<=info.width);if(i)assert(row[i]>row[i-1]);expanded.fill(1,row[i],row[i+1]);}
  for(let x=0;x<info.width;x++)if(expanded[x]!==Number(data[(y*info.width+x)*4+3]>=24))disagreement++;
 }
 assert.equal(disagreement,0,'transparent holes, antialias edges and painted runs must match source pixels');assert(holes>0,'do not replace silhouette with a row bounding box');
 const measured=await measureHomeworldOpaqueRowsV76('public'+art.src,art);
 assert.deepEqual(measured.opaqueRowsV76,art.opaqueRowsV76);
 const building=buildingFor(id,art),opaque={x:Math.floor(art.threshold.x),y:Math.floor(art.threshold.y)-30};
 assert(data[(opaque.y*info.width+opaque.x)*4+3]>=24,'real native doorway paint');
 assert(a.homeworldBuildingCoversPaintV76(building,worldAtPixel(building,opaque.x+.5,opaque.y+.5)));
 for(const p of [{x:.5,y:.5},{x:info.width-.5,y:.5},{x:.5,y:info.height-.5},{x:info.width-.5,y:info.height-.5}]){
  assert.equal(data[(Math.floor(p.y)*info.width+Math.floor(p.x))*4+3],0);
  assert.equal(a.homeworldBuildingCoversPaintV76(building,worldAtPixel(building,p.x,p.y)),false);
 }
});

test('real atlas boundaries are local to sourceRect and cannot see opaque pixels outside the cell',async()=>{
 const art=records[0][1].art,rect={x:800,y:350,width:300,height:400};
 const shiftedPoint=p=>({x:p.x-rect.x,y:p.y-rect.y});
 const crop={...art,sourceRect:rect,threshold:shiftedPoint(art.threshold),foundationFront:{...art.foundationFront,left:art.foundationFront.left-rect.x,right:art.foundationFront.right-rect.x,y:art.foundationFront.y-rect.y},
  groundFrame:{...art.groundFrame,frontLeft:shiftedPoint(art.groundFrame.frontLeft),frontRight:shiftedPoint(art.groundFrame.frontRight),doorLeft:shiftedPoint(art.groundFrame.doorLeft),doorRight:shiftedPoint(art.groundFrame.doorRight)},alphaBounds:{x:0,y:0,width:rect.width,height:rect.height}};
 const result=await measureHomeworldOpaqueRowsV76('public'+art.src,crop);crop.opaqueRowsV76=result.opaqueRowsV76;
 assert.equal(crop.opaqueRowsV76.length,400);assert(crop.opaqueRowsV76.every(row=>row.every(x=>x>=0&&x<=300)));
 const building=buildingFor('crop-actual-native-door',crop);
 assert(a.homeworldBuildingCoversPaintV76(building,worldAtPixel(building,100.5,200.5)));
 for(const p of [{x:-.5,y:200.5},{x:300.5,y:200.5},{x:100.5,y:-.5},{x:100.5,y:400.5}])assert.equal(a.homeworldBuildingCoversPaintV76(building,worldAtPixel(building,p.x,p.y)),false);
});

test('a transparent workshop alpha-box corner does not cover either feet or the upright body',async()=>{
 const art=a.HOMEWORLD_ARCHITECTURE_IDENTITIES_V76['convoy-workshop'].art,building=buildingFor('convoy-workshop',art);
 const {data,info}=await sharp('public'+art.src).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const x=1477.5,y=179.5,scale=a.homeworldBuildingSpriteScaleV64(building),body={halfWidth:24,height:100};
 assert(x>art.alphaBounds.x&&x<art.alphaBounds.x+art.alphaBounds.width&&y>art.alphaBounds.y&&y<art.alphaBounds.y+art.alphaBounds.height,'this was inside the old alpha bounding box');
 assert.equal(bodyAlphaCount(data,info,x,y,body.halfWidth/scale,body.height/scale),0,'actual native pixels across the full upright body are transparent');
 const p=worldAtPixel(building,x,y);
 assert.equal(a.homeworldBuildingCoversPaintV76(building,p),false);
 assert.equal(a.homeworldBuildingCoversPaintV76(building,p,body),false);
 // The corresponding real doorway has visible wall pixels over the body.
 assert(a.homeworldBuildingCoversPaintV76(building,worldAtPixel(building,art.threshold.x,art.threshold.y-50),body));
});

test('convoy-works resident feet at seconds 0 and 60 are not workshop paint',async()=>{
 const building=a.HOMEWORLD_BUILDINGS.find(b=>b.id==='convoy-workshop');
 const resident=a.HOMEWORLD_RESIDENTS_V69.find(r=>r.id==='resident-v69-convoy-works-1');assert(resident);
 const {data,info}=await sharp('public'+building.art.src).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 for(const seconds of [0,60]){
  const pose=a.homeworldResidentPoseV69(resident,seconds),position=a.homeworldBuildingSpritePlacementV64(building),scale=a.homeworldBuildingSpriteScaleV64(building),p=a.homeworldProjectGroundV64(pose);
  const x=(p.x-position.left)/scale,y=(p.y-position.top)/scale;
  const alpha=x<0||y<0||x>=info.width||y>=info.height?0:data[(Math.floor(y)*info.width+Math.floor(x))*4+3];
  assert.equal(alpha,0,'resident foot does not touch actual workshop pixels at seconds '+seconds);
  assert.equal(a.homeworldBuildingCoversPaintV76(building,pose),false,'transparent resident position remains visible');
  assert.equal(a.homeworldResidentRoofOccludedV69(pose,pose),false,'roof filtering must use the actual transparent source pixels');
  assert.equal(a.nearestHomeworldResidentV69(pose,seconds)?.id,resident.id,'real civilian dialogue remains selectable at seconds '+seconds);
 }
 const coveredFoot=worldAtPixel(building,building.art.threshold.x,building.art.threshold.y-50);
 assert(a.homeworldBuildingCoversPaintV76(building,coveredFoot));
 assert(a.homeworldResidentRoofOccludedV69(coveredFoot,coveredFoot),'actual opaque paint still excludes a resident hidden behind the facade');
});

test('historical art without opaque runs keeps its alpha bounds; invalid points and outside rectangles stay uncovered',()=>{
 const legacy={...records[0][1].art};delete legacy.opaqueRowsV76;
 const building=buildingFor('legacy',legacy),inside={x:legacy.alphaBounds.x+10,y:legacy.alphaBounds.y+10};
 assert(a.homeworldBuildingCoversPaintV76(building,worldAtPixel(building,inside.x,inside.y)));
 assert.equal(a.homeworldBuildingCoversPaintV76(building,worldAtPixel(building,-1,-1)),false);
 assert.equal(a.homeworldBuildingCoversPaintV76(building,{x:NaN,y:20}),false);
 assert.equal(a.homeworldBuildingCoversPaintV76(building,{x:0,y:Infinity}),false);
 assert.equal(a.homeworldBuildingCoversPaintV76(building,worldAtPixel(building,inside.x,inside.y),{halfWidth:Infinity,height:100}),false);
 const measured=buildingFor('measured',records[0][1].art);
 assert.equal(a.homeworldBuildingCoversPaintV76(measured,worldAtPixel(measured,-100,-100),{halfWidth:24,height:100}),false);
});

test('the default measurement command verifies all six manifests without rewriting data or PNGs',async()=>{
 const file='app/game/data/homeworldArchitectureArtV76.json',before=await fs.readFile(file);
 const checked=await measureHomeworldOpacityManifestV76();assert.equal(checked.length,6);
 assert((await fs.readFile(file)).equals(before));
});
