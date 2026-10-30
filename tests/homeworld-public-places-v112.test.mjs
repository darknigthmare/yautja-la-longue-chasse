import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {homeworldSceneSsrV78} from './helpers/homeworld-scene-ssr-v78.mjs';

const qa=homeworldSceneSsrV78(),load=name=>qa.load('app/game/systems/'+name+'.ts');
const mount=load('homeworldPublicPlacesMountV112'),places=load('homeworldPublicPlacesV112');
const world=load('homeworldWorldV77'),civic=load('homeworldCivicWorldV80'),geometry=load('homeworldGeometryV64');
const nav=load('homeworldNavigationV77');
const center=polygon=>({x:polygon.reduce((sum,p)=>sum+p.x,0)/polygon.length,y:polygon.reduce((sum,p)=>sum+p.y,0)/polygon.length});

test('V112 admits six fixed places, retains four explicit refusals, and recompiles without colliding against itself',()=>{
  assert.equal(places.HOMEWORLD_PUBLIC_PLACE_CANDIDATES_V112.length,10);
  assert.equal(places.HOMEWORLD_PUBLIC_PLACES_V112.length,6);
  assert.equal(places.HOMEWORLD_PUBLIC_PLACE_REFUSALS_V112.length,4);
  const all=new Set([...places.HOMEWORLD_PUBLIC_PLACES_V112,...places.HOMEWORLD_PUBLIC_PLACE_REFUSALS_V112].map(item=>item.id));
  assert.equal(all.size,10);
  assert(places.HOMEWORLD_PUBLIC_PLACE_REFUSALS_V112.some(item=>item.reason.includes('stable-supplies')),'a retained civilian path wins over a proposed marker');
  assert(places.HOMEWORLD_PUBLIC_PLACE_REFUSALS_V112.some(item=>item.reason.includes('glass-desert:right')),'a gateway support stays solid');
  assert(places.HOMEWORLD_PUBLIC_PLACE_REFUSALS_V112.some(item=>item.reason.includes('port-return:cargo-rack-right')),'the cargo operator face stays reserved');
  const repeat=places.compileHomeworldPublicPlacesV112(mount.HOMEWORLD_PUBLIC_PLACE_INPUT_V112);
  assert.deepEqual(repeat.accepted,places.HOMEWORLD_PUBLIC_PLACES_V112);
  assert.deepEqual(repeat.refusals,places.HOMEWORLD_PUBLIC_PLACE_REFUSALS_V112);
  assert.equal(load('homeworldStreetCompositionV92').HOMEWORLD_STREET_COMPOSITION_PROPS_V92.length,23);
});

test('every admitted contact is supported and solid on its own floor while the actual operator body and route stay free',()=>{
  const origin={levelId:'0',point:world.HOMEWORLD_SPACEPORT_V77.spawn};
  for (const item of places.HOMEWORLD_PUBLIC_PLACES_V112) {
    const polygon=places.homeworldPublicPlacePolygonV112(item),at=center(polygon);
    for (let i=0;i<polygon.length;i++) {
      const a=polygon[i],b=polygon[(i+1)%polygon.length],steps=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)/4));
      for (let step=0;step<=steps;step++) assert(mount.HOMEWORLD_PUBLIC_PLACE_INPUT_V112.terrain(item.levelId,{x:a.x+(b.x-a.x)*step/steps,y:a.y+(b.y-a.y)*step/steps},{halfWidth:0,halfDepth:0}),item.id+' native edge support');
    }
    assert.equal(places.homeworldPublicPlaceCollisionV112(item.levelId,at,{halfWidth:0,halfDepth:0}),item.id);
    assert.equal(world.homeworldCollisionV77(item.levelId,at,{halfWidth:0,halfDepth:0})?.id,item.id);
    assert.notEqual(world.homeworldCollisionBeforePublicPlacesV112(item.levelId,at,{halfWidth:0,halfDepth:0})?.id,item.id,'the explicit previous collision view excludes only the new place');
    assert.equal(civic.homeworldCivicWalkableV80(item.levelId,at),false,'a rendered native prop must stop the real movement model');
    for (const level of world.HOMEWORLD_LEVELS_V77.filter(level=>level.id!==item.levelId)) assert.equal(places.homeworldPublicPlaceCollisionV112(level.id,at),null);
    const usage=places.homeworldPublicPlaceUsageV112(item);
    if (usage) {
      const target=center(usage);
      assert(civic.homeworldCivicWalkableV80(item.levelId,target,{halfWidth:28,halfDepth:18}),item.id+' operator body');
      const route=nav.homeworldWorldRouteV77(origin,{levelId:item.levelId,point:target});
      assert.equal(route.status,'reachable',item.id+' operator is not isolated behind locally clear scenery');
      for (const segment of route.segments) if (segment.points) for (let i=1;i<segment.points.length;i++) assert(nav.homeworldRouteSegmentV77(segment.levelId,segment.points[i-1],segment.points[i]));
    }
  }
  const preserved=load('homeworldStreetCompositionV92');
  for (const item of preserved.HOMEWORLD_STREET_COMPOSITION_PROPS_V92) {
    const at=center(preserved.homeworldStreetCompositionPolygonV92(item));
    assert.deepEqual(world.homeworldCollisionBeforePublicPlacesV112(item.levelId,at,{halfWidth:0,halfDepth:0}),world.homeworldCollisionV77(item.levelId,at,{halfWidth:0,halfDepth:0}),'a previous-view query cannot remove retained V92 solids');
  }
});

test('the retained native bytes, scale, source orientation, projected foot and depth drive the actual six-instance renderer',()=>{
  const camera={x:-2000,y:-2000,viewWidth:18000,viewHeight:18000};
  const props={actor:world.HOMEWORLD_SPACEPORT_V77.spawn,levelId:'0',paintedLevels:['0'],camera};
  const html=qa.render('app/game/HomeworldPublicPlacesV112.tsx',props);
  const tags=[...html.matchAll(/<span[^>]*data-homeworld-prop-id="([^"]+)"[^>]*>/g)];
  assert.equal(tags.length,6);
  for (const item of places.HOMEWORLD_PUBLIC_PLACES_V112) {
    const art=places.HOMEWORLD_PUBLIC_PLACE_ART_V112[item.artId],raw=fs.readFileSync('public'+art.src);
    assert.equal(createHash('sha256').update(raw).digest('hex'),art.sha256);
    assert.equal(raw.readUInt32BE(16),art.sourceWidth);assert.equal(raw.readUInt32BE(20),art.sourceHeight);
    const tag=tags.find(match=>match[1]===item.id)?.[0];assert(tag,item.id);
    const scale=art.heightWorld*item.scale/art.alphaBounds.height,point=geometry.homeworldProjectGroundV64(item,world.homeworldLevelV77(item.levelId).elevation);
    assert(tag.includes('left:'+(point.x-art.pivot.x*scale)+'px'));
    assert(tag.includes('top:'+(point.y-art.pivot.y*scale)+'px'));
    assert(tag.includes('width:'+(art.sourceRect.width*scale)+'px'));
    assert(tag.includes('height:'+(art.sourceRect.height*scale)+'px'));
    assert(tag.includes('z-index:'+Math.round(item.y)));
  }
  assert(!html.includes('rotate(')&&!html.includes('scaleX(-1)'));
  const other=qa.render('app/game/HomeworldPublicPlacesV112.tsx',{...props,levelId:'+1',paintedLevels:['+1']});
  assert(!other.includes('data-homeworld-prop-id='),'a place cannot float onto another floor');
});

test('the real actor walks then stops against a visible V112 place without teleporting and every retained door approach remains free',()=>{
  let witness=null;
  for (const item of places.HOMEWORLD_PUBLIC_PLACES_V112) {
    const polygon=places.homeworldPublicPlacePolygonV112(item),at=center(polygon);
    const start={...world.createHomeworldWorldActorV77(),x:Math.max(...polygon.map(p=>p.x))+84,y:at.y};
    if (!civic.homeworldCivicWalkableV80(item.levelId,start)) continue;
    let actor=start;
    for (let i=0;i<90;i++) {
      const previous=actor;
      actor=civic.stepHomeworldCivicActorV80(actor,{moveX:-1,climb:0,jumpPressed:false},1/60,item.levelId);
      assert(civic.homeworldCivicWalkableV80(item.levelId,actor));
      assert(Math.hypot(actor.x-previous.x,actor.y-previous.y)<=330/60+.0001);
    }
    if (actor.x<start.x-10&&actor.x>at.x) {witness={item,actor};break;}
  }
  assert(witness,'motor must meet an actual admitted place after walking');
  for (const building of world.HOMEWORLD_BUILDINGS_V77) assert(civic.homeworldCivicWalkableV80(building.levelId,geometry.homeworldBuildingDoorwayV64(building).approach),building.id+' full-body doorway');
  for (const connector of world.HOMEWORLD_CONNECTORS_V77) for (const socket of [connector.from,connector.to]) assert(civic.homeworldCivicWalkableV80(socket.levelId,socket.point),connector.id+' landing');
});
