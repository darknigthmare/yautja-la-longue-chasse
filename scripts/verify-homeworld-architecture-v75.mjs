import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import {chromium} from 'playwright-core';
import {homeworldQaModelV64} from './homeworld-qa-model-v64.mjs';
import {homeworldNavigatorV66} from './homeworld-navigation-browser-v66.mjs';
import {firstTracksCompleted,p} from '../tests/helpers/solo-v67-campaign-route.mjs';

const url=process.env.V75_ARCHITECTURE_QA_URL??'http://localhost:4193';
const output=process.env.V75_ARCHITECTURE_QA_OUTPUT??'work-local/v75/qa/architecture-candidate';
const expectedVersion=process.env.YAUTJA_QA_EXPECTED_VERSION??'V75';
await fs.mkdir(output,{recursive:true});
const api=homeworldQaModelV64(process.cwd(),['homeworldCity.ts','homeworldSpatialCodex.ts','homeworldInteriorsV64.ts','homeworldArchitectureArtV75.ts','homeworldArchitectureV75.ts','homeworldFurnitureV72.ts','homeworldGeometryV64.ts']);
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1000}}),checks=[],captures=[],errors=[],httpFailures=[];
page.setDefaultTimeout(60000);page.on('pageerror',error=>errors.push(error.message));page.on('response',response=>{if(response.status()>=400)httpFailures.push({url:response.url(),status:response.status()});});
let nav;
const capture=async name=>{await page.locator('[data-homeworld-hub] img').evaluateAll(images=>Promise.all(images.map(image=>image.decode())));const file=output+'/'+name+'.png';await page.screenshot({path:file});captures.push(file);};
async function nativeFrontage(building){
 const activeDoorId=await page.locator('[data-homeworld-viewport]').getAttribute('data-homeworld-active-door');
 assert.equal(activeDoorId,building.id,'active doorway must scope regional annotations: '+building.id);
 const regionalDirections=await page.locator('[data-homeworld-direction-sign-v72] > span:not([data-homeworld-prop-id])').evaluateAll(elements=>elements.map(element=>({regionId:element.parentElement.getAttribute('data-homeworld-direction-sign-v72'),visibility:getComputedStyle(element).visibility,text:element.textContent})));
 const regionalNativeBeacons=await page.locator('[data-homeworld-direction-sign-v72] > span[data-homeworld-prop-id]').evaluateAll(elements=>elements.map(element=>({regionId:element.parentElement.getAttribute('data-homeworld-direction-sign-v72'),propId:element.getAttribute('data-homeworld-prop-id'),visibility:getComputedStyle(element).visibility,imageLoaded:element.querySelector('img')?.naturalWidth>0})));
 if(building.id==='market-canopy')assert(regionalDirections.length>0,'market desktop/mobile must exercise mounted regional direction annotations');
 for(const direction of regionalDirections)assert.equal(direction.visibility,'hidden','regional direction overlaps active doorway '+building.id+': '+JSON.stringify(direction));
 assert.equal(regionalNativeBeacons.length,regionalDirections.length,'each mounted regional direction retains its separate native beacon');
 for(const beacon of regionalNativeBeacons){assert.equal(beacon.visibility,'visible','door priority must not hide native beacon '+building.id+': '+JSON.stringify(beacon));assert(beacon.imageLoaded,'native regional beacon image must be loaded: '+beacon.propId);}
 const facade=page.locator('[data-building-id="'+building.id+'"]');
 assert.equal(await facade.getAttribute('data-building-native-source'),building.art.src);
 const source=facade.locator(':scope > img');await source.evaluate(image=>image.decode());
 assert.equal(await source.evaluate(image=>image.naturalWidth),building.art.sourceWidth);assert.equal(await source.evaluate(image=>image.naturalHeight),building.art.sourceHeight);
 const imageRect=await source.boundingBox(),scale=imageRect.width/building.art.sourceWidth;
 assert(Math.abs(imageRect.height-building.art.sourceHeight*scale)<.03,'native facade aspect ratio: '+building.id+' '+JSON.stringify(imageRect));
 const zoom=scale/api.homeworldBuildingSpriteScaleV64(building);
 for(const item of api.HOMEWORLD_FRONTAGE_ITEMS_V75.filter(item=>item.buildingId===building.id)){
  const element=page.locator('[data-homeworld-prop-id="'+item.id+'"]'),rect=await element.boundingBox(),art=api.HOMEWORLD_FURNITURE_ART_V72[item.artId];
  assert(rect,'separate mounted frontage '+item.id);const fixtureScale=rect.width/art.sourceRect.width;
  assert(Math.abs(rect.height-art.sourceRect.height*fixtureScale)<.02,'native fitting aspect ratio: '+item.id+' '+JSON.stringify(rect));
  const anchorX=imageRect.x+building.art.threshold.x*scale+(item.x-building.x)*zoom;
  const anchorY=imageRect.y+building.art.threshold.y*scale+(item.y-building.y)*api.HOMEWORLD_GEOMETRY_V64.depthScale*zoom;
  assert(Math.abs(rect.y+art.pivot.y*fixtureScale-anchorY)<.1&&Math.abs(rect.x+art.pivot.x*fixtureScale-anchorX)<.1,item.id+' native feet float relative to their measured ground placement');
  const footprint=api.homeworldFurnitureFootprintV72(item);assert(!api.isHomeworldWalkable({x:(footprint.left+footprint.right)/2,y:(footprint.top+footprint.bottom)/2}));
 }
 return {activeDoorId,regionalDirections,regionalNativeBeacons,paintedDoor:api.homeworldBuildingDoorwayV64(building),nativeSource:building.art.src,fixtureIds:api.HOMEWORLD_FRONTAGE_ITEMS_V75.filter(item=>item.buildingId===building.id).map(item=>item.id)};
}
async function walkTo(building){
 await nav.exitRoom();await nav.focus();const start=await nav.position(),door=api.homeworldBuildingDoorwayV64(building),route=api.homeworldSpatialRoute(start,door.approach);
 assert.equal(route.status,'reachable');await nav.follow(route.points);assert.equal(api.nearestHomeworldDoor(await nav.position())?.id,building.id);
 return {distance:route.distance,start,approach:door.approach,noTeleport:true};
}
try{
 await page.addInitScript(({key,save})=>{if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(save));},{key:p.SAVE_STORAGE_KEY,save:firstTracksCompleted()});
 await page.clock.install();await page.goto(url,{waitUntil:'domcontentloaded'});
 await page.getByRole('button',{name:/^Continuer/}).click();await page.locator('[data-homeworld-hub][data-homeworld-motion-ready="true"]').waitFor();
 assert.equal(await page.locator('main').getAttribute('data-game-content-version'),expectedVersion);
 await page.clock.pauseAt(await page.evaluate(()=>Date.now()+150));nav=homeworldNavigatorV66(page,api,{waypointTolerance:3,driverTickMs:16,pulseInputs:true});await nav.focus();
 const pending=Object.keys(api.HOMEWORLD_ARCHITECTURE_IDENTITIES_V75).map(id=>api.HOMEWORLD_BUILDINGS.find(b=>b.id===id));
 while(pending.length){
  await nav.exitRoom();const here=await nav.position();pending.sort((a,b)=>Math.hypot(a.x-here.x,a.y-here.y)-Math.hypot(b.x-here.x,b.y-here.y));
  const building=pending.shift(),route=await walkTo(building),native=await nativeFrontage(building);
  await capture(building.id+'-native-frontage');
  await page.keyboard.press('KeyE');await nav.tick(110);assert.equal(await page.locator('[data-homeworld-hub]').getAttribute('data-homeworld-interior-id'),building.id);
  const room=api.homeworldInteriorForBuildingV64(building.id);assert.equal(await page.locator('[data-homeworld-secondary-interior-v74="'+building.id+'"]').count(),1);
  assert.equal(await page.locator('[data-homeworld-interior-zone-v74]').count(),room.zones.length);
  checks.push({name:'actual-keyboard-door-native-facade-foundation-and-fixtures',id:building.id,...route,...native,preservedInterior:room.secondaryLayoutV74.archetype});
  await fs.writeFile(output+'/progress.json',JSON.stringify({status:'RUNNING',url,expectedVersion,checks,captures,errors,httpFailures},null,2));
  console.log(JSON.stringify({facade:building.id,checked:checks.length,total:13}));
 }
 await nav.exitRoom();
 for(const id of ['residence-port-1','residence-port-2','residence-market-1']){
  const building=api.HOMEWORLD_BUILDINGS.find(b=>b.id===id),route=await walkTo(building),native=await nativeFrontage(building);
  await capture(id+'-native-frontage');checks.push({name:'unchanged-domestic-architecture-native-fitting',id,...route,...native});
 }
 const building=api.HOMEWORLD_BUILDINGS.find(b=>b.id==='market-canopy');await walkTo(building);
 await page.setViewportSize({width:393,height:852});await nav.tick(120);await nav.focus();const mobileNative=await nativeFrontage(building);
 const viewport=await page.locator('[data-homeworld-viewport]').boundingBox(),actor=await page.locator('[data-homeworld-actor] [data-homeworld-unblooded-v72]').boundingBox();
 assert(viewport&&actor);assert(actor.x>=viewport.x&&actor.x+actor.width<=viewport.x+viewport.width&&actor.y>=viewport.y&&actor.y+actor.height<=viewport.y+viewport.height,'native actor remains entirely visible on mobile');
 await capture('market-canopy-mobile-native-frontage');checks.push({name:'mobile-native-facade-fittings-and-actor-visibility',...mobileNative,viewport,actor});
 for(const identity of Object.values(api.HOMEWORLD_ARCHITECTURE_IDENTITIES_V75)){
  const response=await page.request.get(new URL(identity.art.src,url).href);assert.equal(response.status(),200);
  assert.equal(crypto.createHash('sha256').update(await response.body()).digest('hex'),identity.art.sha256);
 }
 checks.push({name:'all13-served-native-sources-HTTP200-and-byte-exact-SHA',count:13});
 assert.deepEqual(errors,[]);assert.deepEqual(httpFailures,[]);
 await fs.writeFile(output+'/report.json',JSON.stringify({status:'PASS',url,expectedVersion,checks,captures,errors,httpFailures,notes:['Campaign prerequisite fixture; walks, doors and native imagery use actual browser runtime.','Desktop13secondary services plus3unchanged houses and mobile market; full37layout validation is a separate recipe.','Original local-city architecture, not a canonical1:1 map.']},null,2));
 console.log(JSON.stringify({status:'PASS',checks:checks.length,captures:captures.length,report:output+'/report.json'}));
}catch(error){
 const failure=output+'/failure.png';await page.screenshot({path:failure}).catch(()=>{});captures.push(failure);
 await fs.writeFile(output+'/report.json',JSON.stringify({status:'FAIL',url,expectedVersion,checks,captures,errors,httpFailures,error:error.stack},null,2));throw error;
}finally{await browser.close();}
