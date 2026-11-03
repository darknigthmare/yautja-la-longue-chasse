import test from 'node:test';
import assert from 'node:assert/strict';
import {auditHomeworldSpatialV112} from '../scripts/audit-homeworld-spatial-v112.mjs';
import {homeworldSceneSsrV78} from './helpers/homeworld-scene-ssr-v78.mjs';

const qa=homeworldSceneSsrV78(),load=name=>qa.load('app/game/systems/'+name+'.ts');
const world=load('homeworldWorldV77'),geometry=load('homeworldGeometryV64');
const support=load('homeworldFoundationSupportsV112'),urban=load('homeworldStreetModulesV78');
const city=load('homeworldCity');

test('V112 reproduces six unsupported retained foundations then supports every native edge of all 51 facades',()=>{
  const result=auditHomeworldSpatialV112();
  assert.equal(result.buildings,51);assert.equal(result.interactiveBuildings,43);assert.equal(result.closedFacades,8);
  assert(result.edgeSamples>15000,'scan must cover the whole city, not just six witness points');
  assert.deepEqual(new Set(result.unsupportedBefore.map(row=>row.id)),new Set(support.HOMEWORLD_FOUNDATION_BUILDING_IDS_V112));
  assert(result.unsupportedBefore.every(row=>row.unsupportedSamples>0));
  assert.deepEqual(result.unsupportedAfter,[]);assert.deepEqual(result.foundationOverlaps,[]);
  assert.equal(result.addedPlinths.length,6);assert.deepEqual(result.addedPlinthOverlapsWithOtherBuildings,[]);
});

test('foundation lips remain local to retained solids on their true floor and never relocate a threshold or make a whole outside district walkable',()=>{
  const plinths=support.homeworldFoundationSupportsV112(world.HOMEWORLD_BUILDINGS_V77);
  for (const item of plinths) {
    const building=world.HOMEWORLD_BUILDINGS_V77.find(row=>row.id===item.buildingId),before=JSON.stringify(building);
    const contact=geometry.homeworldBuildingGroundFrameV76(building).polygon;
    const min=key=>Math.min(...contact.map(point=>point[key])),max=key=>Math.max(...contact.map(point=>point[key]));
    assert.equal(item.levelId,building.levelId);assert.equal(item.levelId,'0');
    for (const point of item.polygon) {
      assert(point.x>=min('x')-16&&point.x<=max('x')+16);
      assert(point.y>=min('y')-16&&point.y<=max('y')+16);
      assert(urban.homeworldUrbanTerrainV78(item.levelId,point,{halfWidth:0,halfDepth:0}) ||
        city.pointInHomeworldPolygon({x:point.x+.00001,y:point.y+.00001},item.polygon),'ground union must include its actual structural support');
    }
    const center={x:contact.reduce((sum,p)=>sum+p.x,0)/contact.length,y:contact.reduce((sum,p)=>sum+p.y,0)/contact.length};
    assert.equal(world.homeworldPreservedCollisionV77(item.levelId,center,{halfWidth:2,halfDepth:2})?.id,building.id,'support must not remove native building collision');
    assert.equal(JSON.stringify(building),before);
    const far={x:max('x')+100,y:max('y')+100};
    assert(!city.pointInHomeworldPolygon(far,item.polygon),'a local foundation cannot grant a broad outside route');
  }
});

test('the real world draw pass paints the exact six physical plinth polygons and shares exposed foundation extraction',()=>{
  const camera={x:-2000,y:-2000,viewWidth:18000,viewHeight:18000};
  const html=qa.render('app/game/HomeworldWorldSceneV77.tsx',{actor:world.HOMEWORLD_SPACEPORT_V77.spawn,levelId:'0',camera,seconds:0,activeDoorId:null,activePointId:null});
  const d=geometry.HOMEWORLD_GEOMETRY_V64.depthScale;
  for (const item of support.homeworldFoundationSupportsV112(world.HOMEWORLD_BUILDINGS_V77)) {
    const tag=[...html.matchAll(/<polygon[^>]+>/g)].find(match=>match[0].includes('data-world-ground-id-v77="'+item.id+'"'))?.[0];
    assert(tag,item.id+' is physical terrain and must be visibly paved');
    assert(tag.includes('points="'+item.polygon.map(point=>`${point.x},${point.y*d}`).join(' ')+'"'));
  }
  const backdrop=load('homeworldBackdropV81');
  for (const edge of backdrop.HOMEWORLD_EXPOSED_EDGES_V81['0'].filter(edge=>edge.id.startsWith('foundation-v112:'))) {
    assert(html.includes('data-homeworld-exposed-ground-edge-v81="'+edge.id+'"'),'exposed masonry must follow the same support');
  }
});
