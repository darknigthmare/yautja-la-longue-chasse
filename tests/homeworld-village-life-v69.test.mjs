import assert from 'node:assert/strict';
import { test } from 'node:test';
import { build } from 'esbuild';
import { access } from 'node:fs/promises';
import { regionGroundRouteV68 } from '../scripts/homeworld-region-navigation-v68.mjs';

const bundle = await build({ stdin: { contents: "export * from './app/game/systems/homeworldVillageLifeV69';export * from './app/game/systems/homeworldRegionsV68';export * from './app/game/systems/homeworldGeometryV64';export * from './app/game/systems/homeworldArtV64';export * from './app/game/systems/homeworldCharacterPlacementV64';", resolveDir: process.cwd() }, bundle: true, write: false, platform: 'node', format: 'esm', logLevel: 'silent' });
const api = await import('data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const separation = (a,b) => Math.hypot(a.x-b.x,a.y-b.y);
function advance(state,target) {
  for(let count=0;count<18000;count++) {
    const dx=target.x-state.actor.x,dy=target.y-state.actor.y;
    if(Math.hypot(dx,dy)<4) { assert(api.normalizeHomeworldRegionV68(state)); return state; }
    const length=Math.hypot(dx/330,dy/260);
    state=api.stepHomeworldRegionV68(state,{x:dx/330/length,y:dy/260/length});
  }
  throw Error('Real walking cannot reach '+JSON.stringify(target));
}
function walk(state,target) {
  for(const p of regionGroundRouteV68(api,state.regionId,state.zone,state.actor,target,state.tick,state.buildingId).slice(1))state=advance(state,p);
  return state;
}

for(const id of api.HOMEWORLD_REGION_IDS_V68) test(`${id}: eighteen safe routines, four local activities and old checkpoint geometry`, async()=>{
  const life=api.HOMEWORLD_VILLAGE_LIFE_V69[id],definition=api.HOMEWORLD_REGIONS_V68[id];
  assert.equal(life.residents.length,18);assert.equal(life.scenes.length,4);assert.equal(life.props.length,18);
  assert.equal(new Set(life.residents.map(n=>n.id)).size,18);
  let state=api.createHomeworldRegionV68(id,'life-v69-physical',true);
  for(const n of life.residents) {
    assert(n.greeting.length>100);assert(n.speed>=20&&n.speed<=40);assert(n.dwellSeconds>=4);
    const placement=api.homeworldModularPlacementV64(n.morphId,'reference',n.morphId==='young'?82:100);assert(placement&&placement.height>0);
    for(const p of n.path)state=walk(state,p);
    for(let tick=0;tick<18000;tick+=29) {
      const p=api.homeworldVillageResidentPoseV69(id,n,tick);assert(api.isHomeworldRegionWalkableV68(id,'village',p,tick),`${n.id}: whole-body routine at ${tick}`);
      const yieldPose=api.homeworldVillageResidentPoseV69(id,n,tick,p);assert(api.isHomeworldRegionWalkableV68(id,'village',yieldPose,tick),'Courtesy step stays on supported floor');
      assert(separation(p,yieldPose)<=78.001,'No teleport beyond a short lateral courtesy step');
      assert.deepEqual(api.homeworldVillageResidentPoseV69(id,n,tick),p,'Frozen tick gives unchanged pose');
    }
  }
  assert.deepEqual(state.traces,[]);assert.deepEqual(state.eventReceipts,[]);assert.deepEqual(state.greeted,[],'Ambient attendance claims no encounter, hunt or contract proof');
  assert.deepEqual(api.normalizeHomeworldRegionV68(state),state,'Walking through new crowds preserves a V68 checkpoint exactly');
  for(const b of definition.buildings) {
    const approach={x:b.x,y:b.y+70};state=walk(state,approach);
    assert.equal(api.homeworldRegionInteractionV68(state)?.id,b.id,'All legacy door approaches remain usable');
  }
  for(const p of life.props) {
    const art=api.HOMEWORLD_PROP_ART_V64[p.artId],building=definition.buildings.find(b=>b.id===p.buildingId),f=api.homeworldBuildingFootprintV64(building);
    await access('public'+art.src);
    assert(p.x-art.footprintWorld.width/2>=f.left&&p.x+art.footprintWorld.width/2<=f.right&&p.y-art.footprintWorld.depth>=f.top&&p.y<=f.bottom,'Complete new object rests within an already solid foundation');
    assert(Math.abs(p.x-building.x)-art.footprintWorld.width/2>api.homeworldBuildingDoorwayV64(building).clearWidth/2+14,'Additional facade objects never mask the painted doorway');
    assert.equal(api.regionCollisionV68(id,p),building.id,'No new object occupies a formerly saved walkable position');
    assert.equal(p.collisionPolicy,'existing-building-footprint');assert.equal(p.depth,building.y+1,'Front ledge composition renders in front of its original facade');
  }
});

test('life culling uses projected bounds while native source placements retain full height',()=>{
  const rect={left:0,top:0,right:900,bottom:750},d=api.HOMEWORLD_GEOMETRY_V64.depthScale;
  assert(api.homeworldVillageLifeVisibleV69({x:950,y:1000},rect,d));
  assert(!api.homeworldVillageLifeVisibleV69({x:4000,y:1000},rect,d));
  assert(!api.homeworldVillageLifeVisibleV69({x:500,y:3900},rect,d));
  for(const id of api.HOMEWORLD_REGION_IDS_V68) {
    const n=api.HOMEWORLD_VILLAGE_LIFE_V69[id].residents[0],p=api.homeworldVillageResidentPoseV69(id,n,600);
    assert.equal(api.nearestHomeworldVillageResidentV69(id,600,p)?.id,n.id);
  }
});

test('activity names and dialogues differ across all ten original communities',()=>{
  const scenes=Object.values(api.HOMEWORLD_VILLAGE_LIFE_V69).flatMap(l=>l.scenes),names=new Set(scenes.map(s=>s.name));
  assert(names.size>=36);assert(scenes.every(s=>s.nativeStation&&s.description.length>100));
  const reserve=api.HOMEWORLD_VILLAGE_LIFE_V69['forbidden-reserve'];
  assert(reserve.scenes.every(s=>/extérieur|enclos|sas/.test(s.description)),'Reserve civilian activities do not release imported wildlife');
});
