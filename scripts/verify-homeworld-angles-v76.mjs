import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import {chromium} from 'playwright-core';
import {homeworldQaModelV64} from './homeworld-qa-model-v64.mjs';
import {homeworldNavigatorV66} from './homeworld-navigation-browser-v66.mjs';
import {firstTracksCompleted,p} from '../tests/helpers/solo-v67-campaign-route.mjs';

const url=process.env.V76_QA_URL??'http://127.0.0.1:4192';
const output=process.env.V76_ANGLES_QA_OUTPUT??process.env.V76_QA_OUTPUT??'work-local/v76/qa/angles-local';
const expectedVersion=process.env.YAUTJA_QA_EXPECTED_VERSION??'V76';
await fs.mkdir(output,{recursive:true});
const api=homeworldQaModelV64(process.cwd(),['homeworldCity.ts','homeworldSpatialCodex.ts','homeworldInteriorsV64.ts','homeworldArchitectureArtV76.ts','homeworldGeometryV64.ts']);
const identities=Object.entries(api.HOMEWORLD_ARCHITECTURE_IDENTITIES_V76);
assert.equal(identities.length,6);assert.equal(api.HOMEWORLD_BUILDINGS.length,43);
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1000}}),checks=[],captures=[],errors=[],httpFailures=[];
page.setDefaultTimeout(60000);page.on('pageerror',error=>errors.push(error.message));
page.on('response',response=>{if(response.status()>=400)httpFailures.push({url:response.url(),status:response.status()});});
let nav;
const record=async check=>{checks.push(check);await fs.writeFile(output+'/progress.json',JSON.stringify({status:'RUNNING',url,expectedVersion,checks,captures,errors,httpFailures},null,2));console.log(JSON.stringify({checked:checks.length,id:check.id??null,name:check.name}));};
const capture=async name=>{await page.locator('[data-homeworld-hub] img').evaluateAll(images=>Promise.all(images.map(image=>image.decode())));const file=output+'/'+name+'.png';await page.screenshot({path:file});captures.push(file);};
async function metrology(building){
 const art=building.art,f=art.groundFrame;assert(f,'integrated native orientation '+building.id);
 assert.equal(await page.locator('[data-homeworld-viewport]').getAttribute('data-homeworld-active-door'),building.id);
 const gateLabels=await page.locator('[data-homeworld-region-connection-v72] > span:not([data-homeworld-prop-id])').evaluateAll(nodes=>nodes.map(n=>({text:n.textContent,visibility:getComputedStyle(n).visibility})));
 assert(gateLabels.every(n=>n.visibility==='hidden'),'regional gateway captions must give priority to the actual active doorway');
 const gates=await page.locator('[data-homeworld-prop-id^="gateway-v72:"]').evaluateAll(nodes=>nodes.map(n=>({id:n.dataset.homeworldPropId,visibility:getComputedStyle(n).visibility})));
 assert(gates.every(n=>n.visibility==='visible'),'caption priority must preserve native gateway imagery');
 const facade=page.locator('[data-building-id="'+building.id+'"]'),source=facade.locator(':scope > img');
 assert.equal(await facade.getAttribute('data-building-native-source'),art.src);assert.equal(Number(await facade.getAttribute('data-building-orientation-v76')),f.yawDegrees);
 await source.evaluate(image=>image.decode());
 const sourceState=await source.evaluate(image=>{
  const transforms=[];for(let element=image;element&&!element.hasAttribute('data-homeworld-viewport');element=element.parentElement){
   const css=getComputedStyle(element),matrix=css.transform==='none'?null:new DOMMatrixReadOnly(css.transform);
   transforms.push({tag:element.tagName,transform:css.transform,rotate:css.rotate,scale:css.scale,matrix:matrix?{a:matrix.a,b:matrix.b,c:matrix.c,d:matrix.d}:null});
  }
  return{width:image.naturalWidth,height:image.naturalHeight,transforms};
 });
 assert.equal(sourceState.width,art.sourceWidth);assert.equal(sourceState.height,art.sourceHeight);
 // Ancestor camera translation/uniform zoom is allowed. The native building
 // itself and every ancestor must not rotate, mirror, skew or stretch it.
 assert.equal(sourceState.transforms[0].transform,'none');assert.equal(sourceState.transforms[1].transform,'none');
 for(const css of sourceState.transforms){assert(['none','0deg'].includes(css.rotate),'native art cannot be rotated: '+JSON.stringify(css));assert.equal(css.scale,'none','no individual CSS scale');if(css.matrix){assert(Math.abs(css.matrix.b)<1e-8&&Math.abs(css.matrix.c)<1e-8,'no skew/rotation');assert(css.matrix.a>0&&Math.abs(css.matrix.a-css.matrix.d)<1e-8,'no mirror/nonuniform scale');}}
 const rect=await source.boundingBox(),scale=rect.width/art.sourceWidth;assert(Math.abs(rect.height-art.sourceHeight*scale)<.03,'uniform native raster scale '+building.id);
 const marker=await page.locator('[data-painted-door-id="'+building.id+'"]').evaluate(element=>{const r=element.getBoundingClientRect();return{x:r.x,y:r.y};});
 const threshold={x:rect.x+art.threshold.x*scale,y:rect.y+art.threshold.y*scale};
 assert(Math.abs(marker.x-threshold.x)<.04&&Math.abs(marker.y-threshold.y)<.04,'painted socket and actual ground marker diverge '+building.id);
 const nativeFront={left:{x:rect.x+f.frontLeft.x*scale,y:rect.y+f.frontLeft.y*scale},right:{x:rect.x+f.frontRight.x*scale,y:rect.y+f.frontRight.y*scale}};
 const yaw=Math.atan2((nativeFront.right.y-nativeFront.left.y)/api.HOMEWORLD_GEOMETRY_V64.depthScale,nativeFront.right.x-nativeFront.left.x)*180/Math.PI;
 assert(Math.abs(yaw-f.yawDegrees)<1e-8,'orientation must come from native supports');
 const frame=api.homeworldBuildingGroundFrameV76(building),zoom=scale/api.homeworldBuildingSpriteScaleV64(building),centre=api.homeworldProjectGroundV64(building);
 for(const[name,pixel]of [['frontLeft',nativeFront.left],['frontRight',nativeFront.right]]){const ground=api.homeworldProjectGroundV64(frame[name]);assert(Math.abs(pixel.x-marker.x-(ground.x-centre.x)*zoom)<.05&&Math.abs(pixel.y-marker.y-(ground.y-centre.y)*zoom)<.05,'true source contact must agree with oriented collision '+name);}
 const door=api.homeworldBuildingDoorwayV64(building);assert(door.clearWidth>=90&&door.clearHeight>=128,'useful native doorway must fit an adult');
 assert(Math.abs(Math.hypot(door.approach.x-building.x,door.approach.y-building.y)-70)<1e-8,'approach follows native normal');
 return{nativeSource:art.src,sourceState,rect,screenScale:scale,nativeFront,marker,threshold,measuredYaw:yaw,door,physicalPolygon:frame.polygon,gateLabels,gates};
}
async function walkTo(building){
 await nav.exitRoom();await nav.focus();const start=await nav.position(),door=api.homeworldBuildingDoorwayV64(building),route=api.homeworldSpatialRoute(start,door.approach);
 assert.equal(route.status,'reachable','actual oriented approach route '+building.id);await nav.follow(route.points);
 assert.equal(api.nearestHomeworldDoor(await nav.position())?.id,building.id);return{start,approach:door.approach,distance:route.distance,noTeleport:true};
}
async function enterAndExit(building,capturePrefix){
 await page.keyboard.press('KeyE');await nav.tick(110);
 assert.equal(await page.locator('[data-homeworld-hub]').getAttribute('data-homeworld-interior-id'),building.id);
 const room=api.homeworldInteriorForBuildingV64(building.id);assert.equal(await page.locator('[data-homeworld-secondary-interior-v74="'+building.id+'"]').count(),1);assert.equal(await page.locator('[data-homeworld-interior-zone-v74]').count(),room.zones.length);
 await capture(capturePrefix+'-interior');await nav.exitRoom();assert.equal(await page.locator('[data-homeworld-hub]').getAttribute('data-homeworld-interior-id'),null);
 return{preservedInterior:room.secondaryLayoutV74.archetype,zoneCount:room.zones.length,actualKeyboardExit:true};
}
try{
 await page.addInitScript(({key,save})=>{localStorage.setItem(key,JSON.stringify(save));},{key:p.SAVE_STORAGE_KEY,save:firstTracksCompleted()});
 await page.clock.install();await page.goto(url,{waitUntil:'domcontentloaded'});await page.getByRole('button',{name:/^Continuer/}).click();
 await page.locator('[data-homeworld-hub][data-homeworld-motion-ready="true"]').waitFor();assert.equal(await page.locator('main').getAttribute('data-game-content-version'),expectedVersion);
 await page.clock.pauseAt(await page.evaluate(()=>Date.now()+150));nav=homeworldNavigatorV66(page,api,{waypointTolerance:3,driverTickMs:16,pulseInputs:true});await nav.focus();
 const pending=identities.map(([id,r])=>{const building=api.HOMEWORLD_BUILDINGS.find(b=>b.id===id);assert.equal(building.art.src,r.art.src,'final city must use V76 '+id);return building;});
 while(pending.length){
  const here=await nav.position();pending.sort((a,b)=>Math.hypot(a.x-here.x,a.y-here.y)-Math.hypot(b.x-here.x,b.y-here.y));const building=pending.shift();
  const route=await walkTo(building),native=await metrology(building);await capture(building.id+'-native-angle');
  const interior=await enterAndExit(building,building.id);await record({name:'six-actual-keyboard-approaches-doors-exits-and-native-angled-metrology',id:building.id,...route,...native,...interior});
 }
 const port=api.HOMEWORLD_BUILDINGS.find(b=>b.id==='dock-control');await walkTo(port);await page.setViewportSize({width:393,height:852});await nav.tick(120);await nav.focus();
 const native=await metrology(port),viewport=await page.locator('[data-homeworld-viewport]').boundingBox(),actor=await page.locator('[data-homeworld-actor] [data-homeworld-unblooded-v72]').boundingBox();
 assert(viewport&&actor);assert(actor.x>=viewport.x&&actor.x+actor.width<=viewport.x+viewport.width&&actor.y>=viewport.y&&actor.y+actor.height<=viewport.y+viewport.height,'native protagonist is fully visible in port portrait');
 await capture('dock-control-mobile-native-angle');const mobileInterior=await enterAndExit(port,'dock-control-mobile');
 await record({name:'mobile393x852-port-native-angle-actor-and-keyboard-entry-exit',id:port.id,...native,...mobileInterior,viewport,actor});
 await page.setViewportSize({width:1440,height:1000});await nav.tick(120);await nav.release();
 await page.getByRole('button',{name:/Atlas de la cité/}).click();await nav.tick(96);await page.getByRole('button',{name:'Codex des éléments',exact:true}).click();await nav.tick(64);
 const codex=[];for(const[id,r]of identities){
  const recordId='v76-facade:'+id;await page.getByRole('searchbox',{name:'Rechercher',exact:true}).fill(recordId);await page.locator('[data-homeworld-element-id="'+recordId+'"]').click();
  const detail=page.locator('[data-homeworld-element-detail="'+recordId+'"]');await detail.waitFor();const text=await detail.innerText();
  assert(text.includes(r.art.groundFrame.yawDegrees.toFixed(2)+'°'));assert(text.includes('PNG natif sans rotation, miroir ou étirement'));assert(text.includes(r.art.src));assert(text.includes('CRÉATION ORIGINALE DU PROJET'));
  const polygon=detail.locator('figure svg polygon');assert.equal(await polygon.count(),1,'codex must show real rotated physical footprint');codex.push({id:recordId,yaw:r.art.groundFrame.yawDegrees,polygon:await polygon.getAttribute('points')});
 }
 await capture('native-angle-codex');await page.getByRole('button',{name:'Fermer l’atlas',exact:true}).click();await nav.tick(64);
 await record({name:'all-six-native-orientations-and-real-oriented-footprints-readable-in-codex',records:codex});
 for(const[,r]of identities){const response=await page.request.get(new URL(r.art.src,url).href);assert.equal(response.status(),200);assert.equal(crypto.createHash('sha256').update(await response.body()).digest('hex'),r.art.sha256);}
 await record({name:'all-six-served-native-PNG-HTTP200-and-byte-exact-SHA',count:6});
 assert.equal(api.HOMEWORLD_INTERIORS_V64.filter(room=>room.secondaryLayoutV74).length,37);assert.deepEqual(errors,[]);assert.deepEqual(httpFailures,[]);
 await fs.writeFile(output+'/report.json',JSON.stringify({status:'PASS',url,expectedVersion,checks,captures,errors,httpFailures,notes:['Seeded completed prologue prerequisite; every street/door/interior step uses actual keyboard runtime, never position injection.','Native yaw is measured at true supports; fixed35deg camera and uniform zoom only.','Six original adapted civic architectures, not a canonical city reproduction.','All37 secondary interiors/43 city doors are preserved; complete traversal coverage is tested in the separate37-interior recipe.']},null,2));
 console.log(JSON.stringify({status:'PASS',checks:checks.length,captures:captures.length,report:output+'/report.json'}));
}catch(error){
 const file=output+'/failure.png';await page.screenshot({path:file}).catch(()=>{});captures.push(file);await fs.writeFile(output+'/report.json',JSON.stringify({status:'FAIL',url,expectedVersion,checks,captures,errors,httpFailures,error:error.stack},null,2));throw error;
}finally{await browser.close();}
