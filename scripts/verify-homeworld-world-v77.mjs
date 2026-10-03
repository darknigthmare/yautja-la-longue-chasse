import assert from 'node:assert/strict';
import fs from 'node:fs/promises';import crypto from 'node:crypto';
import {chromium} from 'playwright-core';
import {homeworldQaModelV64} from './homeworld-qa-model-v64.mjs';
import {homeworldNavigatorV77} from './homeworld-navigation-browser-v77.mjs';
import {firstTracksCompleted,p} from '../tests/helpers/solo-v67-campaign-route.mjs';

const url=(process.env.V77_WORLD_QA_URL??'http://127.0.0.1:4195').replace(/\/$/,''),output=process.env.V77_WORLD_QA_OUTPUT??'work-local/v77/qa/world-local';
await fs.mkdir(output,{recursive:true});
const api=homeworldQaModelV64(process.cwd(),['homeworldWorldV77.ts','homeworldNavigationV77.ts','homeworldGeometryV64.ts','homeworldInteriorsV64.ts','homeworldConnectorArtV77.ts','homeworldLavaPlacementV77.ts']);
const browser=await chromium.launch({channel:'chrome',headless:true}),context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage();
page.setDefaultTimeout(120000);const checks=[],captures=[],errors=[],failures=[],paths=[];
page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)failures.push({url:r.url(),status:r.status()});});
const capture=async name=>{const file=output+'/'+name+'.jpg';await page.screenshot({path:file,type:'jpeg',quality:92});captures.push(file);console.log('capture '+name);};
const actual=async()=>({point:await nav.position(),floor:await nav.floor(),elevation:await nav.elevation(),clock:await page.locator('[data-homeworld-viewport]').getAttribute('data-city-seconds')});
const durable=()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)??'null'),p.SAVE_STORAGE_KEY);
const youthNative=()=>page.locator('[data-homeworld-unblooded-v72][data-motion-version="74"]').evaluate(node=>({clip:node.getAttribute('data-homeworld-unblooded-v72'),pose:node.getAttribute('data-native-pose'),direction:node.getAttribute('data-native-direction'),source:node.getAttribute('data-native-source'),distance:node.closest('[data-homeworld-actor]').getAttribute('data-youth-distance-v74')}));
async function unobstructed(button,name){
 const hit=await button.evaluate(node=>{const r=node.getBoundingClientRect(),target=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2),style=getComputedStyle(node),viewport=document.querySelector('[data-homeworld-viewport]').getBoundingClientRect();return{matches:target?.closest('button')===node,actual:target?.outerHTML.slice(0,1000),position:style.position,zIndex:style.zIndex,box:{left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height},viewport:{left:viewport.left,top:viewport.top,right:viewport.right,bottom:viewport.bottom},world:getComputedStyle(document.querySelector('[data-homeworld-camera-mode]')).pointerEvents,points:[...document.querySelectorAll('[data-world-point-v77]')].map(p=>({id:p.dataset.worldPointV77,pointerEvents:getComputedStyle(p).pointerEvents}))};});
 checks.push({name:'actual-public-button-hit-test',button:name,hit});assert.equal(hit.matches,true,name+' must receive the ordinary pointer at its visible centre');assert.equal(hit.world,'none');assert(hit.points.every(p=>p.pointerEvents==='none'));
 if(name==='Atlas'){assert.equal(hit.position,'absolute');assert(Number(hit.zIndex)>=7,'Atlas is painted in the real HUD above decor and labels');assert(hit.box.left>=hit.viewport.left&&hit.box.right<=hit.viewport.right&&hit.box.top>=hit.viewport.top&&hit.box.bottom<=hit.viewport.bottom);assert(hit.box.width>=100&&hit.box.height>=36,'Atlas keeps a legible bounded HUD target');}
}
let nav;
async function settleVisible(locator){
 // Controlled clocks survive navigation. Pulse the real browser RAF while
 // lazy React mounts and native decoding settle; a plain wait cannot do that.
 for(let attempt=0;attempt<600;attempt++){if(await locator.isVisible())return;await page.clock.runFor(100);await new Promise(resolve=>setTimeout(resolve,25));}
 throw Error('Actual game surface did not become ready after bounded real RAF pulses');
}
async function boot(){
 await page.clock.resume();
 await page.goto(url,{waitUntil:'networkidle'});await page.clock.runFor(250);
 await page.getByRole('button',{name:/^Continuer/}).click();
 await settleVisible(page.locator('[data-homeworld-hub][data-homeworld-motion-ready="true"]'));
 assert.equal(await page.locator('main').getAttribute('data-game-content-version'),process.env.YAUTJA_QA_EXPECTED_VERSION??'V77');
 await page.clock.pauseAt(await page.evaluate(()=>Date.now()+150));nav=homeworldNavigatorV77(page,api);await nav.focus();
}
async function nativePaint(id,art){
 const node=id==='council-stair'?page.locator('[data-homeworld-vertical-connector-v77="council-stair"]'):page.locator('[data-homeworld-prop-id="'+id+'"]');
 await node.waitFor();const paint=await node.evaluate((node,art)=>{
  const image=node instanceof HTMLImageElement?node:node.querySelector('img'),box=node.getBoundingClientRect(),viewport=document.querySelector('[data-homeworld-viewport]').getBoundingClientRect();
  const sx=box.width/art.sourceRect.width,sy=box.height/art.sourceRect.height;
  const alpha={left:box.left+art.alphaBounds.x*sx,top:box.top+art.alphaBounds.y*sy,right:box.left+(art.alphaBounds.x+art.alphaBounds.width)*sx,bottom:box.top+(art.alphaBounds.y+art.alphaBounds.height)*sy};
  const css=getComputedStyle(node),world=node.closest('[data-homeworld-camera-mode]'),worldTransform=world?getComputedStyle(world).transform:null;
  const matrix=world?new DOMMatrixReadOnly(worldTransform):new DOMMatrixReadOnly();
  return{src:image.getAttribute('src'),decoded:image.complete&&image.naturalWidth===art.sourceWidth&&image.naturalHeight===art.sourceHeight,visible:image.checkVisibility(),transform:getComputedStyle(image).transform,
   inlineWidth:node.style.width,inlineHeight:node.style.height,computedWidth:css.width,computedHeight:css.height,boxWidth:box.width,boxHeight:box.height,worldTransform,matrix:{a:matrix.a,b:matrix.b,c:matrix.c,d:matrix.d},
   visibleWidth:Math.max(0,Math.min(alpha.right,viewport.right)-Math.max(alpha.left,viewport.left)),visibleHeight:Math.max(0,Math.min(alpha.bottom,viewport.bottom)-Math.max(alpha.top,viewport.top)),sx,sy,alpha};
 },art);
 checks.push({name:'native-visible-alpha',id,paint});
 assert.equal(paint.src,art.src);assert(paint.decoded&&paint.visible&&paint.visibleWidth>=16&&paint.visibleHeight>=16,'Actual painted native silhouette visible within the viewport');
 assert.equal(paint.transform,'none');assert.equal(paint.matrix.b,0);assert.equal(paint.matrix.c,0);assert.equal(paint.matrix.a,paint.matrix.d,'The camera itself must remain uniform without skew/rotation');
 const width=Number.parseFloat(paint.inlineWidth),height=Number.parseFloat(paint.inlineHeight),zoom=paint.matrix.a;
 // Chrome serializes CSS dimensions to six significant digits and quantizes
 // the layout dimensions to1/64 CSS px before the camera's uniform scale.
 // First reject non-uniform authored dimensions; then allow only those exact
 // serialization/layout budgets in the measured viewport bbox.
 const serializedHalfUlp=value=>Math.pow(10,Math.floor(Math.log10(Math.abs(value)))-5)/2;
 const authoredRatioBudget=serializedHalfUlp(width)/art.sourceRect.width+serializedHalfUlp(height)/art.sourceRect.height+Number.EPSILON*4;
 const bboxBudget={width:(1/64+serializedHalfUlp(width))*zoom+.0001,height:(1/64+serializedHalfUlp(height))*zoom+.0001};
 checks.at(-1).paint.budgets={authoredRatioBudget,bboxBudget,observedRatioDelta:Math.abs(paint.sx-paint.sy)};
 assert(Math.abs(width/art.sourceRect.width-height/art.sourceRect.height)<=authoredRatioBudget,'Authored CSS native dimensions must have one uniform scale');
 assert(Math.abs(paint.boxWidth-width*zoom)<=bboxBudget.width,'Actual native width matches uniform CSS scale within Chrome layout quantum');
 assert(Math.abs(paint.boxHeight-height*zoom)<=bboxBudget.height,'Actual native height matches uniform CSS scale within Chrome layout quantum');
}
try{
 await page.addInitScript(({key,save})=>{if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(save));},{key:p.SAVE_STORAGE_KEY,save:firstTracksCompleted()});
 await page.clock.install();await boot();const spawn=await actual();assert.equal(spawn.floor,'0');assert(Math.hypot(spawn.point.x-7780,spawn.point.y-4480)<3);await capture('01-port-east-native');
 let paused=false;const councilNativePoses=new Set();
 for(const connector of api.HOMEWORLD_CONNECTORS_V77){
  console.log('walk toward '+connector.id);const plan=await nav.reach(connector.from);paths.push({connectorId:connector.id,plan});
  if(connector.id==='council-stair'){await nativePaint(connector.id,api.HOMEWORLD_COUNCIL_STAIR_ART_V77);await capture('02-council-flat-lower-landing');}
  const result=await nav.connect(connector.id,false,{onSample:async sample=>{
   if(connector.id!=='council-stair'||!await page.locator('[data-homeworld-hub]').getAttribute('data-homeworld-transit-v77'))return;
   const native=await youthNative();assert.equal(native.clip,'walk');assert.equal(native.direction,'n');councilNativePoses.add(native.pose);
   if(paused||sample.elapsed<connector.duration/2)return;paused=true;await capture('03-council-native-walk-half-height');
   await page.getByRole('button',{name:'Pause',exact:true}).click();await nav.tick(64);const before=await actual(),stored=await durable(),pausedNative=await youthNative();await nav.tick(1600);assert.deepEqual(await actual(),before);assert.deepEqual(await durable(),stored);assert.deepEqual(await youthNative(),pausedNative);await capture('04-council-transit-paused');
   await page.getByRole('button',{name:'Reprendre',exact:true}).click();await nav.focus();checks.push({name:'stair-pause-actual-height-clock-save-frozen',before});
  }});
  checks.push({name:'physical-connector',connectorId:connector.id,from:result.from,to:result.to,samples:result.samples});await capture('level-'+connector.id);assert(api.homeworldWalkableV77(await nav.floor(),await nav.position()));
  if(connector.id==='council-stair'||connector.id==='acropolis-stair'){
   const building=api.HOMEWORLD_BUILDINGS_V77.find(b=>b.id===(connector.id==='council-stair'?'enforcer-bastion':'throne-audience'));assert(building);
   await nav.reach({levelId:building.levelId,point:api.homeworldBuildingDoorwayV64(building).approach});await capture(connector.id==='council-stair'?'council-upper-existing-frontage':'palace-existing-audience-frontage');
  }
 }
 assert(paused,'Real mid-height pause was exercised');
 assert(councilNativePoses.size>=3,'Actual resolved stair travel selects several native walk drawings');checks.push({name:'actual-council-native-walk-distance-pose-pause',poses:[...councilNativePoses]});
 const beforeAtlas=await actual(),saveAtlas=await durable(),atlasButton=page.getByRole('button',{name:/^Atlas de la cité/});await unobstructed(atlasButton,'Atlas');await capture('atlas-visible-desktop-hud');await atlasButton.click();
 await page.getByRole('button',{name:/^\+2 ·/}).click();await nav.tick(1000);assert.deepEqual(await actual(),beforeAtlas);assert.deepEqual(await durable(),saveAtlas);await capture('atlas-inspection-no-floor-change');
 await page.keyboard.press('Escape');await nav.tick(80);await nav.focus();checks.push({name:'atlas-inspection-read-only',before:beforeAtlas});
 const beforeReperes=await actual(),saveReperes=await durable(),reperesButton=page.getByRole('button',{name:'Repères',exact:true});await unobstructed(reperesButton,'Repères');await reperesButton.click();await page.getByRole('button',{name:/^0 ·/}).click();await nav.tick(1000);assert.deepEqual(await actual(),beforeReperes);assert.deepEqual(await durable(),saveReperes);await capture('reperes-inspection-no-floor-change');await page.keyboard.press('Escape');await nav.tick(80);await nav.focus();checks.push({name:'reperes-inspection-read-only',before:beforeReperes});
 await page.setViewportSize({width:393,height:852});await nav.tick(120);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);await unobstructed(page.getByRole('button',{name:/^Atlas de la cité/}),'Atlas');await capture('mobile-physical-floor-atlas-visible');await page.setViewportSize({width:1440,height:1000});await nav.tick(100);await nav.focus();
 const clan=api.HOMEWORLD_BUILDINGS_V77.find(b=>b.id==='clan-lodge');await nav.reach({levelId:clan.levelId,point:api.homeworldBuildingDoorwayV64(clan).approach});await capture('clan-lodge-current-native-frontage');
 const coast=api.HOMEWORLD_REGIONAL_DOCKS_V77.find(d=>d.regionId==='leviathan-coast');await nav.reach({levelId:coast.levelId,point:coast.point});await capture('western-coastal-trail-physical-endpoint');
 await nav.reach({levelId:'0',point:api.HOMEWORLD_LAVA_DOCK_V77});await nav.tick(100);
 for(const base of api.HOMEWORLD_LAVA_BASES_V77)await nativePaint(base.id,api.homeworldLavaArtV77(base.artId));await nativePaint('lava-skiff-v77',api.homeworldLavaArtV77('lava-transit-skiff'));await capture('lava-native-two-statues-deck-ferryman');
 await page.emulateMedia({reducedMotion:'reduce'});await nav.tick(120);const flux=()=>page.locator('[data-homeworld-lava-surface-v77] path[stroke-dashoffset]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('stroke-dashoffset')));
 const motion=await flux();assert(motion.length>0);await nav.tick(1000);assert.deepEqual(await flux(),motion);checks.push({name:'system-reduced-motion-stops-decorative-lava',offsets:motion});await page.emulateMedia({reducedMotion:'no-preference'});
 for(const art of[api.HOMEWORLD_COUNCIL_STAIR_ART_V77,...api.HOMEWORLD_LAVA_ART_V77]){const response=await page.request.get(url+art.src);assert.equal(response.status(),200);const sha=crypto.createHash('sha256').update(await response.body()).digest('hex');assert.equal(sha,art.sha256);checks.push({name:'native-http-sha',src:art.src,sha256:sha});}
 await nav.openPoint('memory-service');await nav.closeDialog();const roomBefore=await actual(),interiorBefore=await nav.room();assert.equal(api.homeworldInteriorForPointV64('memory-service').buildingId,'memory-vault');assert.equal(interiorBefore,'memory-vault');
 await page.getByRole('button',{name:'Enregistrer la position',exact:true}).click();await nav.tick(96);const checkpoint=(await durable()).homeworld.locationV77;assert.equal(checkpoint.interiorId,'memory-vault');assert.equal(checkpoint.levelId,roomBefore.floor);assert(Math.hypot(checkpoint.local.x-roomBefore.point.x,checkpoint.local.y-roomBefore.point.y)<3);await capture('memory-vault-real-interior-save');
 await boot();assert.equal(await nav.room(),interiorBefore);assert.equal(await nav.floor(),roomBefore.floor);assert(Math.hypot((await nav.position()).x-roomBefore.point.x,(await nav.position()).y-roomBefore.point.y)<3);checks.push({name:'real-reload-interior-local-checkpoint',checkpoint});
 await nav.exitRoom();assert.equal(await nav.room(),null);assert.equal(await nav.floor(),roomBefore.floor);checks.push({name:'room-exit-retains-real-exterior-floor'});
 // The final route leaves the real Hub through its production callback. No
 // mocked permission/callback or in-flight save mutation can certify the ride.
 await nav.reach({levelId:'0',point:api.HOMEWORLD_LAVA_DOCK_V77});await nav.release();await page.keyboard.press('KeyE');await nav.tick(96);
 const board=page.locator('button[data-homeworld-region-v68="thermal-caves"]');await board.waitFor();assert(await board.isEnabled(),'The played initial fixture really permits this region');
 const beforeRide=await durable();await board.click();await nav.tick(96);await nav.focus();
 assert.equal(await page.locator('[data-homeworld-hub]').getAttribute('data-homeworld-skiff-v77'),'thermal-caves');const rideSamples=[],ridePaint=[];let ridePaused=false;
 const rideCheck={name:'actual-skiff-atomic-active-passenger-deck',frames:ridePaint};checks.push(rideCheck);
 for(let elapsed=0;elapsed<12480;elapsed+=80){
  await nav.tick(80);
  // One DOM read certifies the same visible ride frame. Completed callbacks
  // may retain a suspended Hub under lazy-region Suspense; that hidden scene
  // is no longer a passenger on an active boat and cannot certify the ride.
  const paint=await page.evaluate(()=>{const hub=document.querySelector('[data-homeworld-hub]'),actor=hub?.querySelector('[data-homeworld-actor]'),deck=hub?.querySelector('[data-homeworld-prop-id="lava-skiff-v77"]'),native=actor?.querySelector('[data-homeworld-unblooded-v72]');const visible=!!hub?.checkVisibility(),active=hub?.getAttribute('data-homeworld-skiff-v77')==='thermal-caves';if(!visible||!active)return{visible,active,hubPresent:!!hub};const matrix=new DOMMatrixReadOnly(getComputedStyle(actor).transform);return{visible,active,point:{x:Number(actor.dataset.x),y:Number(actor.dataset.y)},anchor:{x:matrix.e,y:matrix.f},deck:{left:parseFloat(deck.style.left),top:parseFloat(deck.style.top),width:parseFloat(deck.style.width)},nativeClip:native?.getAttribute('data-homeworld-unblooded-v72')};});
  ridePaint.push(paint);if(!paint.visible||!paint.active)break;
  const {point,anchor,deck}=paint;assert(api.homeworldSkiffFootOnDeckV77(point,point),'Moving boat keeps the whole passenger support inside its native deck');rideSamples.push(point);assert.equal(paint.nativeClip,'idle','A boat passenger uses the original idle pose, not foot locomotion');
  const art=api.homeworldLavaArtV77('lava-transit-skiff'),scale=deck.width/art.sourceRect.width;
  assert(Math.abs(anchor.x-(deck.left+art.pivot.x*scale))<.01&&Math.abs(anchor.y-(deck.top+art.pivot.y*scale))<.01,'Actual DOM feet remain on the measured deck pivot');
  if(elapsed>=3200&&!ridePaused){ridePaused=true;await capture('canyon-skiff-real-ride-active-deck-feet');await page.getByRole('button',{name:'Pause',exact:true}).click();await nav.tick(64);const frozen=await actual(),stored=await durable();await nav.tick(1600);assert.deepEqual(await actual(),frozen);assert.deepEqual(await durable(),stored);await capture('canyon-skiff-real-ride-paused');await page.getByRole('button',{name:'Reprendre',exact:true}).click();await nav.focus();}
 }
 assert(ridePaused);assert(rideSamples.length>=120,'At least9.6seconds of actual80ms active passenger samples precede the region callback');for(let i=1;i<rideSamples.length;i++)assert(Math.hypot(rideSamples[i].x-rideSamples[i-1].x,rideSamples[i].y-rideSamples[i-1].y)<20,'Actual boat ride is continuous');
 await settleVisible(page.locator('section[data-homeworld-region-v68="thermal-caves"]'));const afterRide=await durable();assert.equal(afterRide.homeworldRegionV68.regionId,'thermal-caves');
 for(const key of['createdAt','profile','inventory','trophies'])assert.deepEqual(afterRide[key],beforeRide[key],'A crossing cannot create '+key);
 checks.push({name:'real-skiff-physical-deck-pause-continuous-gated-region-callback',samples:rideSamples});await capture('canyon-real-region-arrival');
 assert.deepEqual(errors,[]);assert.deepEqual(failures,[]);
 await fs.writeFile(output+'/report.json',JSON.stringify({status:'PASS',url,checks,paths,routes:nav.routes,captures,errors,failures,limits:'Seven real public-keyboard connectors, east spawn, native Council stair and lava objects, one mobile floor, mid-height pause, read-only atlas, exact HTTP SHA and one interior reload. Six connector final native images, dedicated Council/palace architecture, eight parallax layers and complete NPC/mount/skiff native action sheets remain incomplete; the current civilian and fixed boat sources are reused honestly.'},null,2));
 console.log(JSON.stringify({status:'PASS',checks:checks.length,captures:captures.length,output}));
}catch(error){await capture('failure').catch(()=>{});await fs.writeFile(output+'/report.json',JSON.stringify({status:'FAIL',url,error:String(error),checks,paths,routes:nav?.routes,captures,errors,failures},null,2));throw error;}
finally{await browser.close();}
