import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import {homeworldQaModelV64} from '../scripts/homeworld-qa-model-v64.mjs';
import {inspectHomeworldArchitecturePngV76} from '../scripts/measure-homeworld-architecture-v76.mjs';

const api=homeworldQaModelV64(process.cwd(),['homeworldArchitectureArtV76.ts','homeworldGeometryV64.ts']);
const records=Object.entries(api.HOMEWORLD_ARCHITECTURE_IDENTITIES_V76);
const ids=['convoy-workshop','dock-control','rite-sanctum','trophy-mausoleum','rampart-watch','convoy-store'];
const close=(actual,expected,message)=>assert(Math.abs(actual-expected)<1e-8,message+': '+actual+' / '+expected);

test('six native original views alternate measured ground angles, with no shared city dependency or unknown fallback',async()=>{
 assert.deepEqual(records.map(([id])=>id),ids);assert.equal(api.homeworldBuildingIdentityV76('unknown-building'),null);
 assert.equal(api.homeworldBuildingIdentityV76('hunt-citadel'),null);assert.equal(api.homeworldBuildingIdentityV76('residence-port-1'),null);
 const source=await fs.readFile('app/game/systems/homeworldArchitectureArtV76.ts','utf8');assert(!source.includes("from './homeworldCity'"));
 for(const[id,r]of records){assert.equal(api.homeworldBuildingIdentityV76(id),r);assert.equal(r.depth,340);assert.equal(r.lore,'original-adaptation');assert.equal(r.measurement.logicalOverride,null);}
});

for(const[id,r]of records)test('native pixels, opaque cavity, true ground contacts and minimum useful opening · '+id,async()=>{
 const art=r.art,f=art.groundFrame,m=r.measurement,result=await inspectHomeworldArchitecturePngV76('public'+art.src,art,m);
 assert.equal(result.sha256,art.sha256);assert.equal(result.sourceWidth,art.sourceWidth);assert.equal(result.sourceHeight,art.sourceHeight);
 assert.deepEqual(result.alphaBounds,art.alphaBounds);assert.deepEqual(result.corners,[0,0,0,0]);assert(result.transparentPixelRatio>.3);
 close(result.transparentPixelRatio,m.transparentPixelRatio,'native transparency provenance');
 assert.equal(m.alphaThreshold,200);assert.equal(f.doorClearHeightPixels,Math.min(f.doorLeft.y-m.jambTops[0].y,f.doorRight.y-m.jambTops[1].y));
 assert.deepEqual(art.threshold,{x:(f.doorLeft.x+f.doorRight.x)/2,y:(f.doorLeft.y+f.doorRight.y)/2});
 assert.deepEqual(art.foundationFront,{left:f.frontLeft.x,right:f.frontRight.x,y:(f.frontLeft.y+f.frontRight.y)/2});
 assert.equal(result.supportPoints.length,4);
 for(const p of result.supportPoints){assert(p.rgba[3]>200,id+' actual painted support '+p.name);assert.equal(p.bottomAlphaY,p.y,id+' contact is native alpha edge '+p.name);}
 assert.equal(result.opaqueCavityProbes.length,9);
 for(let i=0;i<result.opaqueCavityProbes.length;i++){const p=result.opaqueCavityProbes[i];assert(p.rgba[3]>=245,id+' opaque cavity '+JSON.stringify(p));if(i%3===1)assert(Math.max(...p.rgba.slice(0,3))<75,id+' recessed dark centre');}
 assert.equal(result.floorEdgeProbes.length,5);
 for(const p of result.floorEdgeProbes){assert(p.deviation<=1,id+' floor must end at real threshold line '+JSON.stringify(p));assert(p.inside[3]>=245);assert(p.outside[3]<=5,id+' no invented painted ground beyond floor edge');}
 close(result.yawDegrees,f.yawDegrees,'native derived angle');assert(Math.abs(f.yawDegrees)>=18&&Math.abs(f.yawDegrees)<=30,'approximately25deg, truthful measured angle');
 assert.equal(Math.sign(f.yawDegrees),Math.sign(m.requestedYawDegrees));assert.equal(m.observedSide,f.yawDegrees<0?'left':'right');
 assert(result.clearWidthWorld>=90,id+' actual useful aperture width');assert(result.clearHeightWorld>=128,id+' actual minimum upright jamb height');
});

for(const[id,r]of records)test('single uniform scale maps all painted supports and threshold to oriented physical volume · '+id,()=>{
 const art=r.art,f=art.groundFrame,building={id,x:1280,y:4480,width:570,height:500,footprint:{width:570,depth:340},art};
 const scale=api.homeworldBuildingSpriteScaleV64(building),placement=api.homeworldBuildingSpritePlacementV64(building),frame=api.homeworldBuildingGroundFrameV76(building);
 close(scale,placement.width/art.sourceWidth,'native horizontal scale');close(scale,placement.height/art.sourceHeight,'native vertical scale');assert(frame.angled);
 const projected=api.homeworldProjectGroundV64(building);close(placement.left+art.threshold.x*scale,projected.x,'native threshold x');close(placement.top+art.threshold.y*scale,projected.y,'native threshold y');
 for(const name of ['frontLeft','frontRight']){const ground=api.homeworldProjectGroundV64(frame[name]);close(placement.left+f[name].x*scale,ground.x,'front contact x '+name);close(placement.top+f[name].y*scale,ground.y,'front contact y '+name);}
 close(Math.hypot(frame.frontRight.x-frame.frontLeft.x,frame.frontRight.y-frame.frontLeft.y),570,'real rotated front span');close(frame.vFront-frame.vBack,340,'preserved depth');
 const door=api.homeworldBuildingDoorwayV64(building);assert(door.clearWidth>=90);assert(door.clearHeight>=128);
 for(const[name,source]of [['left',f.doorLeft],['right',f.doorRight]]){const ground=api.homeworldProjectGroundV64(door.groundOpening[name]);close(ground.x,placement.left+source.x*scale,'opening x '+name);close(ground.y,placement.top+source.y*scale,'opening y '+name);}
 close(door.approach.x-building.x,frame.normal.x*70,'real normal approach x');close(door.approach.y-building.y,frame.normal.y*70,'real normal approach y');
 const footprint=api.homeworldBuildingFootprintV64(building);assert.deepEqual(footprint.polygon,frame.polygon);
 const centre={x:(frame.polygon[0].x+frame.polygon[2].x)/2,y:(frame.polygon[0].y+frame.polygon[2].y)/2};assert(api.homeworldBuildingTouchesV76(building,centre,{halfWidth:14,halfDepth:10}),'oriented solid is physical');
});

test('all thirteen historical V75 native sources remain byte exact, including each V76 reference',async()=>{
 const prior=JSON.parse(await fs.readFile('app/game/data/homeworldArchitectureArtV75.json','utf8'));assert.equal(Object.keys(prior).length,13);
 for(const[id,r]of Object.entries(prior)){const sha=crypto.createHash('sha256').update(await fs.readFile('public'+r.art.src)).digest('hex');assert.equal(sha,r.art.sha256,id+' historical source preserved');const replacement=api.homeworldBuildingIdentityV76(id);if(replacement){assert.equal(replacement.measurement.sourceReference,r.art.src);assert.equal(replacement.measurement.sourceReferenceSha256,sha);assert.notEqual(replacement.art.sha256,sha);}}
});

test('generation provenance records every native redraw and accepted source SHA, without pretending one-pass completion',async()=>{
 const doc=JSON.parse(await fs.readFile('docs/v76-homeworld-architecture-generation.json','utf8'));
 assert.equal(doc.mode,'builtin-image_gen');assert.equal(doc.transparent,true);assert.equal(doc.callCount,13);assert.equal(doc.acceptedCount,6);
 assert.equal(doc.targets.length,6);assert.equal(doc.generationStages.length,6);
 for(const[id,r]of records){const target=doc.targets.find(t=>t.id===id),stage=doc.generationStages.find(t=>t.id===id);assert(target.prompt.length>500);assert(stage.refinement.prompt.length>500);assert(stage.initialOutput.endsWith('.png'));assert(stage.refinementOutput.endsWith('.png'));assert(stage.acceptedSource.endsWith('.png'));assert.equal(stage.sha256,r.art.sha256);assert.deepEqual(stage.groundFrame,r.art.groundFrame);assert.equal(stage.runtimeSource,r.art.src);}
 assert.equal(doc.generationStages.filter(s=>s.additionalFloorRepair).length,1);assert(doc.generationStages.find(s=>s.id==='convoy-workshop').additionalFloorRepair.prompt.length>500);
});
