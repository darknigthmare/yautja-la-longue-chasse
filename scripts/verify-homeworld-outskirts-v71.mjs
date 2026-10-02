import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import {chromium} from 'playwright-core';
import {homeworldQaModelV64} from './homeworld-qa-model-v64.mjs';
import {homeworldNavigatorV66} from './homeworld-navigation-browser-v66.mjs';
import {firstTracksCompleted,p} from '../tests/helpers/solo-v67-campaign-route.mjs';
const url=process.env.V71_QA_URL??'http://127.0.0.1:4187';
const output=process.env.V71_OUTSKIRTS_QA_OUTPUT??'work-local/v71/qa/outskirts';
await fs.mkdir(output,{recursive:true});
const api=homeworldQaModelV64(process.cwd(),['homeworldCity.ts','homeworldInteriorsV64.ts','homeworldSpatialCodex.ts',
  'homeworldOutskirtsV71.ts','homeworldOutskirtsArtV71.ts','homeworldContextCodexV71.ts']);
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1000}}),checks=[],captures=[],errors=[],failures=[];
page.setDefaultTimeout(60000);page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)failures.push({url:r.url(),status:r.status()});});
const saved=()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),p.SAVE_STORAGE_KEY);
const decode=async()=>{
  await page.locator('[data-homeworld-hub] img').evaluateAll(imgs=>Promise.all(imgs.map(i=>i.decode())));
  await page.locator('[data-homeworld-outskirts-floor] image').evaluateAll(images=>Promise.all(images.map(node=>{const image=new Image();image.src=node.href.baseVal;return image.decode();})));
};
const capture=async name=>{
  await decode();const path=output+'/'+name+'.jpg';await page.screenshot({path,type:'jpeg',quality:90});captures.push(path);
  const snapshot=await page.locator('[data-homeworld-hub]').evaluate(hub=>{
    const rect=node=>{const r=node.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};};
    const viewport=hub.querySelector('[data-homeworld-viewport]'),actor=hub.querySelector('[data-homeworld-actor]');
    return {citySeconds:viewport?.getAttribute('data-city-seconds'),viewport:viewport&&rect(viewport),actor:actor&&{x:Number(actor.dataset.x),y:Number(actor.dataset.y)},
      residents:[...hub.querySelectorAll('[data-homeworld-resident]')].map(node=>({id:node.dataset.homeworldResident,x:Number(node.dataset.x),y:Number(node.dataset.y),zIndex:getComputedStyle(node).zIndex,groundAnchor:rect(node)})),
      buildings:[...hub.querySelectorAll('[data-building-id]')].map(node=>({id:node.dataset.buildingId,occluded:node.dataset.occluded,opacity:getComputedStyle(node).opacity,zIndex:getComputedStyle(node).zIndex,paintBox:rect(node)}))};
  });
  await fs.writeFile(output+'/'+name+'.scene.json',JSON.stringify(snapshot,null,2));
};
async function inspectNative(label){
  const count=await page.locator('[data-homeworld-prop-id^="outskirts-v71-"]').count();
  assert(count>0&&count<api.HOMEWORLD_OUTSKIRTS_MODULES_V71.length,'camera culls independently mounted environment sprites');
  const floor=page.locator('[data-homeworld-outskirts-floor="v71"]');assert.equal(await floor.count(),1);
  const transform=await floor.evaluate(e=>getComputedStyle(e).transform);assert(transform.includes('0.573576'),'one ground projection, unchanged upright image scales');
  const floorSize=await floor.evaluate(e=>({width:Number(e.getAttribute('width')),depth:Number(e.getAttribute('height'))}));
  const viewport=await page.locator('[data-homeworld-viewport]').boundingBox();
  assert(floorSize.width<viewport.width/api.HOMEWORLD_GEOMETRY_V64.zoom+1000,'actual ground raster is limited to camera, including portrait');
  assert(floorSize.width*floorSize.depth<api.HOMEWORLD_OUTSKIRTS_BOUNDS_V71.width*api.HOMEWORLD_OUTSKIRTS_BOUNDS_V71.depth/4);
  const metadata=await page.locator('[data-homeworld-prop-id^="outskirts-v71-"]').evaluateAll(nodes=>nodes.map(node=>({id:node.dataset.homeworldPropId,art:node.dataset.homeworldArtId,source:node.dataset.nativeSourceRect,box:{width:node.getBoundingClientRect().width,height:node.getBoundingClientRect().height}})));
  for(const native of metadata){
    const placement=api.HOMEWORLD_OUTSKIRTS_MODULES_V71.find(item=>item.id===native.id),art=api.HOMEWORLD_OUTSKIRTS_ART_V71[placement.artId],r=art.sourceRect;
    assert.equal(native.source,[r.x,r.y,r.width,r.height].join(','),'actual native crop matches final source, including wall/thicket isolation');
    assert(native.box.width>25&&native.box.height>25);
  }
  checks.push({name:'actual-modular-floor-culling-and-native-art',view:label,mounted:count,families:[...new Set(metadata.map(m=>m.art))],transform,floorSize});
  await capture(label);
}
try{
  await page.addInitScript(({key,save})=>{if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(save));},{key:p.SAVE_STORAGE_KEY,save:firstTracksCompleted()});
  await page.goto(url,{waitUntil:'networkidle'});await page.getByRole('button',{name:/^Continuer/}).click();await page.locator('[data-homeworld-hub]').waitFor();
  assert.equal(await page.locator('main').getAttribute('data-game-content-version'),'V71');
  await page.clock.install();await page.clock.pauseAt(await page.evaluate(()=>Date.now()+150));
  const nav=homeworldNavigatorV66(page,api);await nav.focus();await inspectNative('port-grounded-surroundings');
  for(const buildingId of ['memory-vault','rampart-watch']){
    const building=api.HOMEWORLD_BUILDINGS.find(b=>b.id===buildingId),door=api.homeworldBuildingDoorwayV64(building),from=await nav.position();
    const route=api.homeworldSpatialRoute(from,door.approach);assert.equal(route.status,'reachable');await nav.follow(route.points);
    assert.equal(api.nearestHomeworldDoor(await nav.position())?.id,buildingId);
    await nav.tick(400);await inspectNative(buildingId+'-physical-arrival');
    checks.push({name:'preserved-public-keyboard-route',buildingId,distance:route.distance,position:await nav.position(),noTeleport:true});
  }
  await page.getByRole('button',{name:/^Atlas de la cité/}).click();await page.getByRole('button',{name:'Codex des éléments',exact:true}).click();
  const frozen=await page.locator('[data-homeworld-viewport]').getAttribute('data-city-seconds'),before=await saved(),position=await nav.position();
  const assemblyId='assembly-v71:residence-port-1',building=api.HOMEWORLD_BUILDINGS.find(b=>b.id==='residence-port-1');
  await page.getByRole('searchbox',{name:'Rechercher',exact:true}).fill(assemblyId);
  await page.locator('[data-homeworld-element-id="'+assemblyId+'"]').click();
  assert.equal(await page.locator('[data-homeworld-element-detail="'+assemblyId+'"]').count(),1);
  assert((await page.locator('[data-homeworld-element-detail="'+assemblyId+'"]').textContent()).includes('intérieur utile'));
  await capture('connected-real-house-context-desktop');
  await nav.tick(1500);assert.equal(await page.locator('[data-homeworld-viewport]').getAttribute('data-city-seconds'),frozen);
  assert.deepEqual(await nav.position(),position);assert.deepEqual(await saved(),before,'read-only codex grants and saves nothing');
  await page.setViewportSize({width:393,height:852});
  await page.locator('[data-homeworld-element-detail="'+assemblyId+'"]').getByRole('heading',{level:4}).scrollIntoViewIfNeeded();
  await capture('connected-real-house-context-portrait');
  assert.equal(await page.getByRole('dialog').evaluate(e=>e.scrollWidth>e.clientWidth+1),false,'context links and text fit portrait');
  await page.locator('[data-homeworld-element-detail="'+assemblyId+'"]').getByRole('heading',{name:'Éléments associés',exact:true}).scrollIntoViewIfNeeded();
  await capture('connected-real-house-associated-links-portrait');
  await page.locator('[data-homeworld-element-detail="'+assemblyId+'"]').getByRole('button',{name:building.label,exact:true}).click();
  assert.equal(await page.locator('[data-homeworld-element-detail="'+building.id+'"]').count(),1,'associated link reaches real facade record');
  await page.getByRole('button',{name:'Fermer l’atlas',exact:true}).click();await page.getByRole('dialog').waitFor({state:'hidden'});
  await nav.tick(100);await nav.focus();
  // A narrow camera can correctly cull every outside prop while the hero is in
  // a wide public street. Walk to a nearby public edge for the portrait art view.
  if(!await page.locator('[data-homeworld-prop-id^="outskirts-v71-"]').count()){
    const from=await nav.position(),viewport=await page.locator('[data-homeworld-viewport]').boundingBox();
    const width=viewport.width/api.HOMEWORLD_GEOMETRY_V64.zoom,height=viewport.height/api.HOMEWORLD_GEOMETRY_V64.zoom;
    const candidates=[];
    for(let dx=-640;dx<=640;dx+=80)for(let dy=-640;dy<=640;dy+=80){
      const target={x:from.x+dx,y:from.y+dy};if(!api.isHomeworldWalkable(target))continue;
      const camera={x:Math.max(0,Math.min(api.HOMEWORLD_WORLD.width-width,target.x-width*.5)),
        y:Math.max(-160,Math.min(api.HOMEWORLD_WORLD.height*api.HOMEWORLD_GEOMETRY_V64.depthScale-height,target.y*api.HOMEWORLD_GEOMETRY_V64.depthScale-height*.62)),width,height};
      const visible=api.HOMEWORLD_OUTSKIRTS_MODULES_V71.filter(module=>api.homeworldOutskirtsVisibleV71(module,camera)).length;
      if(visible>1)candidates.push({target,distance:Math.hypot(dx,dy)});
    }
    candidates.sort((a,b)=>a.distance-b.distance);let edgeRoute;
    for(const candidate of candidates){const route=api.homeworldSpatialRoute(from,candidate.target);if(route.status==='reachable'){edgeRoute=route;break;}}
    assert(edgeRoute,'A reachable public edge shows the separate natural scenery in portrait');
    await nav.follow(edgeRoute.points);await nav.tick(300);
    checks.push({name:'portrait-public-edge-keyboard-route',from,to:await nav.position(),distance:edgeRoute.distance,noTeleport:true});
  }
  await inspectNative('rampart-environment-portrait');
  await page.setViewportSize({width:1440,height:1000});await nav.focus();
  const door=api.homeworldBuildingDoorwayV64(building),route=api.homeworldSpatialRoute(await nav.position(),door.approach);assert.equal(route.status,'reachable');
  await nav.follow(route.points);await page.keyboard.press('KeyE');await nav.tick(100);
  assert.equal(await page.locator('[data-homeworld-hub]').getAttribute('data-homeworld-interior-id'),building.id);
  assert.equal(await page.locator('[data-homeworld-outskirts-floor]').count(),0,'outdoor layer unmounted inside proportionate room');
  await capture('real-house-interior-proportion-and-furnishings');
  const room=api.homeworldInteriorForBuildingV64(building.id);assert(room.width<=building.footprint.width&&room.depth<=building.footprint.depth);
  checks.push({name:'connected-context-read-only-mobile-and-real-interior',buildingId:building.id,interior:{width:room.width,depth:room.depth,props:room.props.length},publicRouteDistance:route.distance});
  for(const asset of [api.HOMEWORLD_OUTSKIRTS_GROUND_V71,...Object.values(api.HOMEWORLD_OUTSKIRTS_ART_V71)].filter((a,i,list)=>list.findIndex(b=>b.src===a.src)===i)){
    const response=await page.request.get(url+asset.src);assert.equal(response.status(),200);const hash=crypto.createHash('sha256').update(await response.body()).digest('hex');assert.equal(hash,asset.sha256);
    checks.push({name:'unchanged-native-openai-http-bytes',src:asset.src,sha256:hash});
  }
  assert.deepEqual(errors,[]);assert.deepEqual(failures,[]);
  await fs.writeFile(output+'/report.json',JSON.stringify({status:'PASS',url,checks,captures,errors,failures,
    limits:'Earlier nursery/youth/First Tracks are declared model-played prerequisites. Three city views and real house access are reached through public keyboard movement. The natural outskirts remain non-walkable; all 139 objects have model placement coverage but are not each individually visited. Art is an original adaptation, not a canonical 1:1 city or new walking animation.'},null,2));
  console.log(JSON.stringify({status:'PASS',checks:checks.length,captures:captures.length,output}));
}catch(error){await capture('failure').catch(()=>{});await fs.writeFile(output+'/report.json',JSON.stringify({status:'FAIL',url,error:String(error),checks,captures,errors,failures},null,2));throw error;}
finally{await browser.close();}
