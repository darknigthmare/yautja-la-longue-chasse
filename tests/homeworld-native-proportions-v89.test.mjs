import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {homeworldQaModelV64} from '../scripts/homeworld-qa-model-v64.mjs';

const api=homeworldQaModelV64(process.cwd(),['homeworldWorldV77.ts','homeworldCity.ts','homeworldGeometryV64.ts','homeworldInteriorsV64.ts','homeworldNativeArchitectureV81.ts','homeworldNativeArchitectureCodexV81.ts','homeworldPlacementGrammarV81.ts','homeworldContextCodexV71.ts']);
const home=api.HOMEWORLD_BUILDINGS_V77.find(b=>b.id==='residence-terraces-1');
const near=(a,b)=>assert(Math.abs(a-b)<1e-8,`${a} != ${b}`);

test('all43 active rooms fit their current exterior; the preserved terrace room reproduces the former native mismatch',()=>{
 const room=api.homeworldInteriorForBuildingV64(home.id),source=api.HOMEWORLD_NATIVE_CATALOGUE_V81.assets['clan-residence-left'];
 assert.equal(room.width,408);assert.equal(room.depth,228);
 assert(room.width>source.width,'the original400u replacement really was narrower than its preserved408u room');
 assert.equal(source.width,400);assert.equal(source.depth,300,'immutable source catalogue remains intact');
 for(const building of api.HOMEWORLD_BUILDINGS_V77){const interior=api.homeworldInteriorForBuildingV64(building.id);
  assert(interior.width<building.footprint.width&&interior.depth<building.footprint.depth,building.id+' current envelope');
 }
 assert.equal(home.footprint.width-room.width,32,'retain the original total wall allowance');
 assert.deepEqual(home.footprint,{width:440,depth:330});
 for(const id of ['residence-esplanade-2','residence-clans-1','residence-market-2']){
  const building=api.HOMEWORLD_BUILDINGS_V77.find(b=>b.id===id);assert.deepEqual(building.footprint,{width:400,depth:300},id+' shares the source, not the larger instance');
 }
});

test('the11/10 terrace instance uses unchanged pixels and uniformly projected support, doorway and codex',()=>{
 const source=api.HOMEWORLD_NATIVE_CATALOGUE_V81.assets['clan-residence-left'],a=source.art;
 assert.deepEqual(home.art,a);assert.equal(crypto.createHash('sha256').update(fs.readFileSync('public'+a.src)).digest('hex'),a.sha256);
 const old={...home,x:2270,y:2180,width:400,footprint:{width:400,depth:300}};
 const scale=api.homeworldBuildingSpriteScaleV64(home),oldScale=api.homeworldBuildingSpriteScaleV64(old),image=api.homeworldBuildingSpritePlacementV64(home);
 near(scale/oldScale,11/10);near(image.width/a.sourceWidth,image.height/a.sourceHeight);
 near(image.left+a.threshold.x*scale,home.x);near(image.top+a.threshold.y*scale,home.y*api.HOMEWORLD_GEOMETRY_V64.depthScale);
 const polygon=api.homeworldBuildingGroundFrameV76(home).polygon;
 a.groundSupportPixelsV81.forEach((p,i)=>{const projected=api.homeworldProjectGroundV64(polygon[i]);near(projected.x,image.left+p.x*scale);near(projected.y,image.top+p.y*scale);});
 const door=api.homeworldBuildingDoorwayV64(home),oldDoor=api.homeworldBuildingDoorwayV64(old);
 near(door.clearWidth/oldDoor.clearWidth,11/10);near(door.clearHeight/oldDoor.clearHeight,11/10);assert(door.clearWidth>=80&&door.clearHeight>=128);
 const record=api.HOMEWORLD_NATIVE_ARCHITECTURE_CODEX_V81.find(r=>r.id==='v81-facade:'+home.id);
 assert.equal(record.dimensions.width,440);assert.equal(record.dimensions.depth,330);assert.deepEqual(record.footprint.polygon,polygon);
});

test('uniform enlargement requires the real20u east/north move and preserves whole-body front access',()=>{
 const neighbor=api.HOMEWORLD_BUILDINGS_V77.find(b=>b.id==='residence-terraces-3');
 const unmoved={...home,x:2270,y:2180};
 assert(api.homeworldBuildingFootprintsOverlapV76(unmoved,neighbor),'enlargement alone would genuinely overlap the neighbor');
 assert.deepEqual({x:home.x,y:home.y},{x:2290,y:2160});
 for(const b of api.HOMEWORLD_BUILDINGS_V77.filter(b=>b.levelId===home.levelId&&b.id!==home.id))assert(!api.homeworldBuildingFootprintsOverlapV76(home,b),b.id+' same-floor SAT');
 const approach=api.homeworldBuildingDoorwayV64(home).approach;
 assert(api.homeworldWalkableV77(home.levelId,approach,{halfWidth:36,halfDepth:26}));
 assert.equal(api.nearestHomeworldDoorV77(home.levelId,approach)?.id,home.id);
 assert.deepEqual(api.auditHomeworldPlacementV81().errors,[],'native solids, usages, doors, civilians and structural bearings stay protected');
});

test('the original citadel brazier was inside the live palace; the same complete base now sits on its real upper terrace',()=>{
 const original=api.HOMEWORLD_PROPS.find(p=>p.id==='life-v69-brazier-citadel'),active=api.HOMEWORLD_PROPS_V77.find(p=>p.id===original.id);
 const oldCenter={x:original.x,y:original.y-original.footprint.halfDepth};
 assert.equal(api.homeworldCollisionV77('+2',oldCenter,{halfWidth:0,halfDepth:0})?.id,'throne-audience','reproduce the real historical prop buried in the actual V81 palace');
 assert.equal(active.levelId,'+2');assert.deepEqual({x:active.x,y:active.y},{x:4110,y:1100});
 for(const key of ['id','artId','asset','width','height','plane','footprint'])assert.deepEqual(active[key],original[key],key+' preserved');
 const center={x:active.x,y:active.y-active.footprint.halfDepth};
 assert(api.homeworldTerrainV77(active.levelId,center,active.footprint),'whole96×50 base has genuine physical support');
 for(const b of api.HOMEWORLD_BUILDINGS_V77.filter(b=>b.levelId===active.levelId))assert(!api.homeworldBuildingTouchesV76(b,center,active.footprint),b.id+' native masonry');
 assert.equal(api.homeworldCollisionV77(active.levelId,center,{halfWidth:0,halfDepth:0})?.id,active.id,'the brazier owns its collider instead of a hidden palace wall');
 const record=api.HOMEWORLD_ALL_ELEMENT_CODEX_V71.find(r=>r.id==='prop:'+active.id);
 assert.deepEqual(record.position,{x:active.x,y:active.y,z:1080},'live codex follows the same pose and real upper level');
 near(record.footprint.left,active.x-active.footprint.halfWidth);near(record.footprint.top,active.y-active.footprint.halfDepth*2);
 const palace=api.HOMEWORLD_BUILDINGS_V77.find(b=>b.id==='throne-audience'),edge=api.homeworldBuildingFootprintV64(palace).bottom;
 assert(center.y-active.footprint.halfDepth-edge>55,'real56u clearance behind the whole base, not only its pivot');
});
