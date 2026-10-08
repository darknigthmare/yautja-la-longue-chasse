import test from 'node:test';
import assert from 'node:assert/strict';
import {homeworldSceneSsrV78} from './helpers/homeworld-scene-ssr-v78.mjs';

const qa=homeworldSceneSsrV78(),systems='app/game/systems/';
const world=qa.load(systems+'homeworldWorldV77.ts'),urban=qa.load(systems+'homeworldStreetModulesV78.ts');
const facades=qa.load(systems+'homeworldUrbanFacadesV78.ts'),layers=qa.load(systems+'homeworldVisualLayersV78.ts');
const geo=qa.load(systems+'homeworldGeometryV64.ts'),location=qa.load(systems+'homeworldLocationV77.ts');
const layout=qa.load(systems+'homeworldUrbanLayoutV78.ts'),population=qa.load(systems+'homeworldUrbanPopulationV78.ts');
const authored=qa.load(systems+'homeworldAuthoredLotsV81.ts'),courtArt=qa.load(systems+'homeworldCourtArtV80.ts');
const scene='app/game/HomeworldWorldSceneV77.tsx';
const props={actor:{x:3980,y:3940},levelId:'-1A',camera:{x:-500,y:-2500,viewWidth:12000,viewHeight:12000},seconds:0,activeDoorId:null,activePointId:null};
const tags=(html,attribute)=>[...html.matchAll(new RegExp('<[^>]+\\b'+attribute+'="([^"]*)"[^>]*>','g'))];
const tagFor=(html,attribute,id)=>tags(html,attribute).find(match=>match[1]===id)?.[0];
const depthOf=tag=>Number(/(?:^|;)z-index:([^;" ]+)/.exec(/style="([^"]*)"/.exec(tag)?.[1]??'')?.[1]);
const styleOf=tag=>Object.fromEntries((/style="([^"]*)"/.exec(tag)?.[1]??'').split(';').filter(Boolean).map(s=>{const i=s.indexOf(':');return[s.slice(0,i),s.slice(i+1)];}));
function assertMountedCourts(html,levelId){
 const actual=tags(html,'data-homeworld-prop-id').filter(m=>/^urban-v(?:78|81):/.test(m[1]));
 const expected=urban.HOMEWORLD_URBAN_PROPS_V78.filter(p=>p.levelId===levelId);
 assert.equal(actual.length,expected.length,'each accepted authored court prop mounts exactly once');
 assert.deepEqual(new Set(actual.map(m=>m[1])),new Set(expected.map(p=>p.id)));
 for(const item of expected){
  const tag=tagFor(html,'data-homeworld-prop-id',item.id),s=styleOf(tag),paint=urban.homeworldUrbanNativePlacementV78(item),art=courtArt.HOMEWORLD_COURT_ART_V80[item.artId];
  // Renderer and placement associate scale multiplication differently. Allow
  // only floating-point rounding (four epsilons), never a pixel-sized drift.
  for(const key of ['left','top','width','height']){
   const rendered=parseFloat(s[key]),expected=paint[key],rounding=Number.EPSILON*4*Math.max(1,Math.abs(rendered),Math.abs(expected));
   assert(Math.abs(rendered-expected)<=rounding,item.id+' '+key+' must match the measured placement');
  }
  assert(Math.abs(parseFloat(s.width)/art.sourceRect.width-parseFloat(s.height)/art.sourceRect.height)<1e-12,item.id+' uniform scale');
  assert.equal(Number(s['z-index']),layers.homeworldSceneDepthV78(item.y,world.homeworldLevelV77(item.levelId).elevation));
  const start=html.indexOf(tag),node=html.slice(start,html.indexOf('</span>',start));
  assert(node.includes('src="'+art.src+'"'));assert(node.includes('data-native-source-rect="'+[art.sourceRect.x,art.sourceRect.y,art.sourceRect.width,art.sourceRect.height].join(',')+'"'));
  assert.doesNotMatch(node,/rotate\(|scaleX\(-1\)/);
 }
 for(const rejected of urban.HOMEWORLD_URBAN_PROP_REJECTIONS_V78)assert(!tagFor(html,'data-homeworld-prop-id',rejected.id),'a refused prop cannot acquire an invisible or unsupported mount');
}

test('actual SSR paints all eight native facade solids and every accepted authored low-quarter prop together, without inventing doors',()=>{
 const html=qa.render(scene,props);
 assert.equal(tags(html,'data-building-decoration-v78').length,8);
 assertMountedCourts(html,'-1A');
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

test('actual SSR suppresses unrelated-floor facades and mounts exactly the accepted authored port props on floor zero',()=>{
 const html=qa.render(scene,{...props,levelId:'0',actor:world.HOMEWORLD_SPACEPORT_V77.spawn});
 const ids=tags(html,'data-building-id').map(m=>m[1]);
 assert.deepEqual(new Set(ids),new Set(world.HOMEWORLD_BUILDINGS_V77.filter(b=>b.levelId==='0').map(b=>b.id)));
 assertMountedCourts(html,'0');
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

test('all authored court candidates remain accounted for as mounted or explicitly refused',()=>{
 const sourceIds=authored.HOMEWORLD_AUTHORED_COURTS_V81.flatMap(c=>c.props.map(p=>'urban-v81:'+c.id+':'+p.name));
 const accepted=urban.HOMEWORLD_URBAN_PROPS_V78.map(p=>p.id),rejected=urban.HOMEWORLD_URBAN_PROP_REJECTIONS_V78.map(p=>p.id);
 assert.equal(sourceIds.length,28,'the authored source retains its complete set of distinct court uses');
 assert.deepEqual(new Set(urban.HOMEWORLD_URBAN_PROP_CANDIDATES_V78.map(p=>p.id)),new Set(sourceIds));
 assert.equal(new Set([...accepted,...rejected]).size,accepted.length+rejected.length,'accepted/refused sets cannot overlap or contain duplicates');
 assert.deepEqual(new Set([...accepted,...rejected]),new Set(sourceIds),'no authored decor disappears from the placement contract');
 for(const item of urban.HOMEWORLD_URBAN_PROP_REJECTIONS_V78)assert(item.reason,item.id+' must expose its support or clearance refusal');
});

test('complete internal codex includes exactly all current source records without applying legacy port relocation twice',()=>{
 const urbanRecords=qa.load(systems+'homeworldUrbanCodexV78.ts').HOMEWORLD_URBAN_CODEX_V78;
 const all=qa.load(systems+'homeworldContextCodexV71.ts').HOMEWORLD_ALL_ELEMENT_CODEX_V71;
 const constituentIds=[...facades.HOMEWORLD_URBAN_FACADES_V78,...urban.HOMEWORLD_URBAN_PROPS_V78,...layout.HOMEWORLD_URBAN_GROUND_V78,...population.HOMEWORLD_URBAN_EXTRAS_V78,...layout.HOMEWORLD_URBAN_LOTS_V78].map(p=>p.id);
 assert.equal(urbanRecords.length,constituentIds.length);
 assert.equal(new Set(urbanRecords.map(r=>r.id)).size,urbanRecords.length);
 assert.deepEqual(new Set(urbanRecords.map(r=>r.id)),new Set(constituentIds),'facades, mounted props, support grounds, population and authored lots all retain codex entries');
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
