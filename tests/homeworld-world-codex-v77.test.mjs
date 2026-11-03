import test from 'node:test';import assert from 'node:assert/strict';
import {homeworldQaModelV64} from '../scripts/homeworld-qa-model-v64.mjs';
const a=homeworldQaModelV64(process.cwd(),['homeworldWorldV77.ts','homeworldWorldCodexV77.ts','homeworldConnectorArtV77.ts','homeworldCity.ts','homeworldContextCodexV71.ts']);

test('native Council record reports measured alpha width and exact physical landing/rail models',()=>{
 const connector=a.HOMEWORLD_CONNECTORS_V77.find(c=>c.id==='council-stair'),p=a.homeworldCouncilStairPlacementV77({...connector.from,elevation:0},{...connector.to,elevation:520});
 const record=a.HOMEWORLD_WORLD_CODEX_V77.find(r=>r.id==='connector-v77:council-stair');assert.equal(record.dimensions.width,p.painted.width);assert.equal(record.dimensions.height,520);assert.equal(record.footprint,null,'a whole multi-level image is not a ground wall');
 const rails=a.homeworldCouncilStairRailsV77({...connector.from,elevation:0},{...connector.to,elevation:520});
 for(const rail of rails){const r=a.HOMEWORLD_COUNCIL_SUPPORT_CODEX_V77.find(r=>r.id===rail.id);assert.deepEqual(r.footprint,{left:rail.left,right:rail.right,top:rail.top,bottom:rail.bottom});assert.equal(r.dimensions.width,26);assert.equal(r.dimensions.depth,84);assert.equal(a.homeworldCollisionV77(rail.levelId,{x:(rail.left+rail.right)/2,y:(rail.top+rail.bottom)/2}).id,r.id);}
 for(const [index,side]of[connector.from,connector.to].entries()){const r=a.HOMEWORLD_COUNCIL_SUPPORT_CODEX_V77.find(r=>r.id==='council-landing-v77:'+index);assert.deepEqual(r.dimensions,{width:676,depth:216,height:0});assert.deepEqual(r.position,{...side.point,z:a.homeworldLevelV77(side.levelId).elevation});assert(a.homeworldTerrainV77(side.levelId,side.point,{halfWidth:330,halfDepth:100}));}
});

test('only explicitly new world ground records are added and every polygon is the actual rendered/motor polygon',()=>{
 const old=new Set([...a.HOMEWORLD_DISTRICTS,...a.HOMEWORLD_STREETS].map(g=>g.id));
 const expected=a.HOMEWORLD_GROUND_V77.filter(g=>!old.has(g.id)),records=a.HOMEWORLD_WORLD_CODEX_V77.filter(r=>r.id.startsWith('ground-v77:'));assert.equal(records.length,expected.length);
 for(const ground of expected){const r=records.find(r=>r.id==='ground-v77:'+ground.id);assert(r);assert.deepEqual(r.footprint.polygon,ground.polygon);assert.equal(r.position.z,a.homeworldLevelV77(ground.levelId).elevation);assert.equal(r.dimensions.width,Math.max(...ground.polygon.map(p=>p.x))-Math.min(...ground.polygon.map(p=>p.x)));assert.equal(r.dimensions.depth,Math.max(...ground.polygon.map(p=>p.y))-Math.min(...ground.polygon.map(p=>p.y)));}
 for(const id of old)assert(!records.some(r=>r.id==='ground-v77:'+id),'the original floor record is not duplicated: '+id);
});

test('actual complete codex has unique IDs and every new physical record link resolves to a real aggregate item',()=>{
 const records=a.HOMEWORLD_ALL_ELEMENT_CODEX_V71,ids=new Set(records.map(r=>r.id));assert.equal(ids.size,records.length);
 for(const r of a.HOMEWORLD_WORLD_CODEX_V77){assert(ids.has(r.id));for(const id of r.associatedElementIds??[])assert(ids.has(id),r.id+' missing '+id);}
});
