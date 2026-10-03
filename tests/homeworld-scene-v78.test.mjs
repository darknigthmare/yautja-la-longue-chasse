import test from 'node:test';
import assert from 'node:assert/strict';
import {homeworldSceneSsrV78} from './helpers/homeworld-scene-ssr-v78.mjs';

const qa=homeworldSceneSsrV78(),systems='app/game/systems/';
const world=qa.load(systems+'homeworldWorldV77.ts'),urban=qa.load(systems+'homeworldStreetModulesV78.ts');
const facades=qa.load(systems+'homeworldUrbanFacadesV78.ts'),layers=qa.load(systems+'homeworldVisualLayersV78.ts');
const geo=qa.load(systems+'homeworldGeometryV64.ts'),location=qa.load(systems+'homeworldLocationV77.ts');
const scene='app/game/HomeworldWorldSceneV77.tsx';
const props={actor:{x:3980,y:3940},levelId:'-1A',camera:{x:-500,y:-2500,viewWidth:12000,viewHeight:12000},seconds:0,activeDoorId:null,activePointId:null};
const tags=(html,attribute)=>[...html.matchAll(new RegExp('<[^>]+\\b'+attribute+'="([^"]*)"[^>]*>','g'))];
const tagFor=(html,attribute,id)=>tags(html,attribute).find(match=>match[1]===id)?.[0];
const depthOf=tag=>Number(/(?:^|;)z-index:([^;" ]+)/.exec(/style="([^"]*)"/.exec(tag)?.[1]??'')?.[1]);

test('actual SSR paints all eight native facade solids and twenty-four low-quarter props together, without inventing doors',()=>{
 const html=qa.render(scene,props);
 assert.equal(tags(html,'data-building-decoration-v78').length,8);
 assert.equal(tags(html,'data-homeworld-prop-id').filter(m=>m[1].startsWith('urban-v78:')).length,24);
 for(const f of facades.HOMEWORLD_URBAN_FACADES_V78){
  const tag=tagFor(html,'data-building-id',f.id);assert(tag,f.id+' is collidable but not drawn');
  assert(tag.includes('CLOSED_SCENERY_FACADE'));assert(tag.includes(f.art.src));
  const polygon=facades.homeworldUrbanFacadePlacementV78(f).footprint;
  const point={x:polygon.reduce((sum,p)=>sum+p.x,0)/polygon.length,y:polygon.reduce((sum,p)=>sum+p.y,0)/polygon.length};
  assert.equal(urban.homeworldUrbanCollisionV78(f.levelId,point)?.id,f.id);
  assert.equal(world.nearestHomeworldDoorV77(f.levelId,point),null);
  assert(!tagFor(html,'data-painted-door-id',f.id));
 }
 for(const p of urban.HOMEWORLD_URBAN_PROPS_V78.filter(p=>p.levelId==='-1A'))assert(tagFor(html,'data-homeworld-prop-id',p.id));
 assert(!tags(html,'data-building-id').some(m=>world.HOMEWORLD_BUILDINGS_V77.find(b=>b.id===m[1])?.levelId!==undefined));
});

test('actual SSR suppresses unrelated-floor facades and mounts all twenty-eight port props on floor zero',()=>{
 const html=qa.render(scene,{...props,levelId:'0',actor:world.HOMEWORLD_SPACEPORT_V77.spawn});
 const ids=tags(html,'data-building-id').map(m=>m[1]);
 assert.deepEqual(new Set(ids),new Set(world.HOMEWORLD_BUILDINGS_V77.filter(b=>b.levelId==='0').map(b=>b.id)));
 assert.equal(tags(html,'data-homeworld-prop-id').filter(m=>m[1].startsWith('urban-v78:')).length,28);
 assert(!ids.some(id=>facades.HOMEWORLD_URBAN_FACADES_V78.some(f=>f.id===id)));
});

test('real council transit keeps both endpoint scenes above their grounds and does not restack a facade at arrival',()=>{
 const c=world.HOMEWORLD_CONNECTORS_V77.find(c=>c.id==='council-stair'),actor={...world.createHomeworldWorldActorV77(),...c.from.point};
 let transit=world.beginHomeworldTransitV77(c.from.levelId,actor);assert(transit);
 let state={actor,transit,levelId:c.from.levelId,elevation:world.homeworldLevelV77(c.from.levelId).elevation};
 for(let i=0;i<Math.ceil(c.duration/.1)+1&&state.transit;i++)state=world.stepHomeworldTransitV77(state.transit,state.actor,.1);
 assert(state.done);assert.equal(state.levelId,c.to.levelId);
 const during=qa.render(scene,{...props,actor,levelId:c.from.levelId,transit:{...transit,elapsed:c.duration/2}});
 const arrived=qa.render(scene,{...props,actor:state.actor,levelId:state.levelId});
 const id='residence-enforcers-1',tagDuring=tagFor(during,'data-building-id',id),tagAfter=tagFor(arrived,'data-building-id',id);
 assert(tagDuring&&tagAfter);assert.equal(depthOf(tagDuring),depthOf(tagAfter));
 for(const level of[c.from.levelId,c.to.levelId])assert(depthOf(tagDuring)>depthOf(tagFor(during,'data-homeworld-level-ground-v77',level)));
 for(const connector of world.HOMEWORLD_CONNECTORS_V77)for(const side of[connector.from,connector.to]){
  const elevation=world.homeworldLevelV77(side.levelId).elevation,foot=geo.homeworldProjectGroundV64(side.point,elevation);
  assert.equal(layers.homeworldSceneDepthV78(side.point.y,elevation),Math.round(foot.y/geo.HOMEWORLD_GEOMETRY_V64.depthScale));
  assert(layers.HOMEWORLD_CONNECTOR_DRAW_DEPTH_V78<layers.homeworldSceneDepthV78(side.point.y,elevation));
  assert(layers.homeworldGroundDepthV78(side.levelId,side.levelId)<layers.HOMEWORLD_CONNECTOR_DRAW_DEPTH_V78);
 }
});

test('actual atlas includes newly supported port courts and closed facade footprints while its tabs remain observational',()=>{
 const html=qa.render('app/game/HomeworldWorldMapV77.tsx',{actor:props.actor,levelId:'-1A',open:true,onOpenChange:()=>{throw Error('SSR must not dispatch navigation');}});
 assert.equal(tags(html,'data-map-scenery-facade-v78').length,8);
 assert(html.includes('bâtiment fermé, sans service interactif'));
 assert(html.includes('ils ne changent pas d’étage'));
 const port=qa.render('app/game/HomeworldWorldMapV77.tsx',{actor:world.HOMEWORLD_SPACEPORT_V77.spawn,levelId:'0',open:true,onOpenChange:()=>{throw Error('SSR must not move actor');}});
 assert(port.includes('urban-v78:port-court:1'));
});

test('new court checkpoint restores the same coordinates and owner without fabricating a visitable facade interior',()=>{
 const actor={...world.createHomeworldWorldActorV77(),x:4140,y:5075};
 assert(!world.homeworldTerrainV77('0',actor));assert(urban.homeworldUrbanWalkableV78('0',actor));
 const checkpoint=location.createHomeworldCheckpointV77('owner','0',actor,null,actor),before=JSON.stringify(checkpoint);
 const restored=location.resolveHomeworldLocationV77(checkpoint,'owner');
 assert(restored.restored);assert.deepEqual({x:restored.actor.x,y:restored.actor.y},{x:4140,y:5075});
 assert(!location.resolveHomeworldLocationV77(checkpoint,'foreign-owner').restored);
 assert.equal(JSON.stringify(checkpoint),before);
 for(const facade of facades.HOMEWORLD_URBAN_FACADES_V78){
  const counterfeit={...checkpoint,interiorId:facade.id,levelId:facade.levelId,local:{x:0,y:0}};
  assert(!location.resolveHomeworldLocationV77(counterfeit,'owner').restored);
 }
});

test('complete internal codex includes all101 V78 records without applying legacy port relocation twice',()=>{
 const urbanRecords=qa.load(systems+'homeworldUrbanCodexV78.ts').HOMEWORLD_URBAN_CODEX_V78;
 const all=qa.load(systems+'homeworldContextCodexV71.ts').HOMEWORLD_ALL_ELEMENT_CODEX_V71;
 assert.equal(urbanRecords.length,101);
 assert.equal(new Set(all.map(r=>r.id)).size,all.length);
 for(const record of urbanRecords){
  const copies=all.filter(r=>r.id===record.id);assert.equal(copies.length,1);
  assert.equal(copies[0],record,'world position must not be transformed a second time');
 }
 for(const prop of urban.HOMEWORLD_URBAN_PROPS_V78){
  const record=all.find(r=>r.id===prop.id);assert.equal(record.position.x,prop.x);assert.equal(record.position.y,prop.y);
  assert.equal(record.position.z,world.homeworldLevelV77(prop.levelId).elevation);
 }
});
