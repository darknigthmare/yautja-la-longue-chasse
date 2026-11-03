import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium } from 'playwright-core';
import { firstTracksCompleted, p } from '../tests/helpers/solo-v67-campaign-route.mjs';
import { homeworldQaModelV64 } from './homeworld-qa-model-v64.mjs';
import { homeworldNavigatorV66 } from './homeworld-navigation-browser-v66.mjs';
import { homeworldRegionNavigatorV68 } from './homeworld-region-navigation-browser-v68.mjs';

const url=process.env.V69_QA_URL??'http://127.0.0.1:4187',output=process.env.V69_YOUTH_VILLAGE_QA_OUTPUT??'work-local/v69/qa/youth-villages';
await fs.mkdir(output,{recursive:true});
const api=homeworldQaModelV64(process.cwd(),['homeworld.ts','homeworldCity.ts','homeworldSpatialCodex.ts','homeworldInteriorsV64.ts','homeworldRegionsV68.ts','clanChronicle.ts','homeworldAccessV69.ts','homeworldCharacterPlacementV64.ts']);
const origin=firstTracksCompleted(),key=p.SAVE_STORAGE_KEY;
assert.equal(api.getChronicleRank(origin.prologue.chronicle),'unblooded');assert.equal(origin.soloV66.status,'completed');
assert(!origin.soloV67&&!origin.soloV68);assert(api.canVisitHomeworldVillagesV69(origin));assert(api.canEnterHomeworldRegionV68(origin,'ash-marches').allowed);
assert.equal(api.evaluateChronicleAccess(origin.prologue.chronicle,'personal-ship-acquisition').allowed,false);
const browser=await chromium.launch({channel:'chrome',headless:true}),context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage(),checks=[],captures=[],errors=[],failures=[];
page.setDefaultTimeout(60000);page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)failures.push({url:r.url(),status:r.status()});});
const saved=()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key);
const capture=async name=>{const file=output+'/'+name+'.jpg';await page.screenshot({path:file,type:'jpeg',quality:87});captures.push(file);};
const assertYouth=save=>{
  assert.equal(api.getChronicleRank(save.prologue.chronicle),'unblooded');
  assert(!save.soloV67&&!save.soloV68,'Visiting an ordinary village starts no later rite');
  assert.equal(api.evaluateChronicleAccess(save.prologue.chronicle,'personal-ship-acquisition').allowed,false);
  assert.deepEqual(save.prologue.chronicle,origin.prologue.chronicle,'No courtesy, route or contract acceptance can mint a rank or rite');
  assert.deepEqual(save.appearance,origin.appearance,'Visiting a region never rewrites the saved adult preset to disguise a youth rendering bug');
};
const appearanceChecks=[];
async function assertYouthPlate(space,paintedPlayer) {
  await paintedPlayer.waitFor();await paintedPlayer.evaluate(img=>img.decode());
  const actual=await paintedPlayer.evaluate(img=>({src:img.getAttribute('src'),left:parseFloat(img.style.left),top:parseFloat(img.style.top),width:parseFloat(img.style.width),height:parseFloat(img.style.height)}));
  const plate=api.HOMEWORLD_YOUTH_PLATE_V69,expected=api.homeworldPortraitPlacementV64(plate.plateId,plate.src,82);
  assert.equal(actual.src,'/game/prologue/v47/unblooded-player.png',space+' keeps the same authored youth');
  assert(expected);for(const dimension of ['left','top','width','height'])assert(Math.abs(actual[dimension]-expected[dimension])<.015,space+' retains native support point and painted stature82: '+dimension);
  appearanceChecks.push({space,source:actual.src,paintedStature:82,nativePlacement:true,savedPresetUnchanged:true});
}
try{
  await page.addInitScript(({key,save})=>{
    if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(save));
    const write=Storage.prototype.setItem;Storage.prototype.setItem=function(name,value){if(window.__youthVillageRefuseSave&&name===key)throw new DOMException('Isolated youth village QA refusal','QuotaExceededError');return write.call(this,name,value);};
  },{key,save:origin});
  await page.goto(url,{waitUntil:'networkidle',timeout:120000});await page.getByRole('button',{name:/^Continuer/}).click();
  await page.locator('[data-homeworld-hub]').waitFor();await page.locator('[data-homeworld-hub] img').evaluateAll(imgs=>Promise.all(imgs.map(i=>i.decode())));
  await assertYouthPlate('city',page.locator('[data-homeworld-actor] img').first());
  assert.equal(await page.getByRole('button',{name:'Rejoindre le vaisseau',exact:true}).count(),0);assert.equal(await page.getByRole('button',{name:'Console du vaisseau',exact:true}).count(),0);
  await page.clock.install();await page.clock.pauseAt(await page.evaluate(()=>Date.now()+150));
  const city=homeworldNavigatorV66(page,api);await city.focus();await capture('01-unblooded-city');
  await city.openPoint('market-service');const board=page.locator('[data-contracts-v68]');await board.waitFor();
  const accept=board.locator('[data-contract-id="ash-marches-track"] [data-contract-action="accept"]');assert(await accept.isEnabled());await accept.click();await city.tick(96);
  assert.equal((await saved()).homeworld.contractsV68.entries.find(c=>c.id==='ash-marches-track').status,'active');assertYouth(await saved());await capture('02-unblooded-contract');
  await city.exitRoom();await city.focus();
  const point=api.HOMEWORLD_POINTS.find(p=>p.id==='region-ash-marches'),route=api.homeworldSpatialRoute(await city.position(),{x:point.x,y:point.y+42});assert.equal(route.status,'reachable');await city.follow(route.points);
  assert.equal(api.nearestHomeworldPoint(await city.position())?.id,point.id);await page.keyboard.press('KeyE');await city.tick(96);
  await page.locator('[data-homeworld-hub]').getByRole('dialog').getByRole('button',{name:'Suivre le sentier vers le village',exact:true}).click();
  const scene=page.locator('[data-homeworld-region-v68="ash-marches"]');await scene.waitFor();
  const region=homeworldRegionNavigatorV68(page,api,{saveKey:key,controlledClock:true});await assertYouthPlate('connector',scene.locator('[data-region-player] img').first());await region.resume();await region.walkOutbound();
  assert.equal(await scene.getAttribute('data-zone'),'village');assertYouth(await saved());
  await assertYouthPlate('village',scene.locator('[data-region-player] img').first());
  const guide=api.HOMEWORLD_REGIONS_V68['ash-marches'].residents[0];await region.walkTo({x:guide.x,y:guide.y+95});await region.interact();
  assert(await scene.getByRole('dialog').isVisible());assert((await saved()).homeworldRegionV68.greeted.includes('guide'));await capture('03-unblooded-village-guide');await region.resume();
  const hall=api.HOMEWORLD_REGIONS_V68['ash-marches'].buildings.find(b=>b.id==='hall');await region.walkTo({x:hall.x,y:hall.y+70});await region.interact();assert.equal(await scene.getAttribute('data-zone'),'interior');
  await assertYouthPlate('interior',scene.locator('[data-region-player] img').first());await capture('03b-unblooded-interior');
  await region.walkTo(api.HOMEWORLD_REGION_INTERIOR_V68.entry);await region.interact();assert.equal(await scene.getAttribute('data-zone'),'village');assertYouth(await saved());
  checks.push({name:'unblooded-real-city-contract-and-village-journey',status:'PASS',rank:'unblooded',shipAcquisitionAllowed:false,interiorVisited:true,cityRoutes:city.routes,regionRoutes:region.routes});
  const beforeFailure=await page.evaluate(key=>localStorage.getItem(key),key);await page.evaluate(()=>{window.__youthVillageRefuseSave=true;});
  await scene.getByRole('button',{name:'Pause',exact:true}).click();await region.tick(96);assert(await scene.getByRole('button',{name:'Réessayer la sauvegarde',exact:true}).isVisible());
  assert.equal(await page.evaluate(key=>localStorage.getItem(key),key),beforeFailure);await region.tick(2400);assert.equal(await page.evaluate(key=>localStorage.getItem(key),key),beforeFailure);await capture('04-protected-storage-refusal');
  await page.evaluate(()=>{window.__youthVillageRefuseSave=false;});await region.resume();await region.tick(200);await scene.getByRole('button',{name:'Pause',exact:true}).click();await region.tick(96);
  const durable=await saved();assertYouth(durable);assert(api.normalizeHomeworldRegionV68(durable.homeworldRegionV68));
  await page.clock.resume();await page.reload({waitUntil:'networkidle'});await page.getByRole('button',{name:/^Continuer/}).click();await scene.waitFor();await scene.locator('[data-region-resume]').waitFor();
  const reloaded=await saved();assert.equal(reloaded.homeworldRegionV68.runId,durable.homeworldRegionV68.runId);assert.equal(reloaded.homeworldRegionV68.zone,'village');assert.equal(reloaded.homeworldRegionV68.walked,durable.homeworldRegionV68.walked);assertYouth(reloaded);
  await page.clock.pauseAt(await page.evaluate(()=>Date.now()+150));await region.resume();
  // The physical foot anchor is intentionally a zero-size span. Inspect its
  // native painted child, not the anchor's CSS box, to detect a blank scene.
  const paintedPlayer=scene.locator('[data-region-player] img').first();assert(await paintedPlayer.isVisible());
  await assertYouthPlate('cold-reload',paintedPlayer);
  const playerBox=await paintedPlayer.boundingBox();assert(playerBox&&playerBox.width>0&&playerBox.height>0&&playerBox.x<1440&&playerBox.x+playerBox.width>0&&playerBox.y<1000&&playerBox.y+playerBox.height>0);
  await capture('05-unblooded-cold-reload');
  checks.push({name:'quota-refusal-retry-and-cold-reload',status:'PASS',sameRunId:true,sameWalkedDistance:true,noBlankPage:true,unchangedRank:true});
  assert.deepEqual(errors,[]);assert.deepEqual(failures,[]);
  await fs.writeFile(output+'/report.json',JSON.stringify({status:'PASS',url,checks,appearanceChecks,captures,errors,failures,fixture:'Nursery, youth formation, patrol, cage and first tracks prerequisites come from firstTracksCompleted() through the real model integrators. They were not played in this browser run. Only city walking, contract acceptance, connector traversal, village guide, interior entry/exit, storage refusal/retry and reload were played here.'},null,2));
  console.log(JSON.stringify({status:'PASS',checks:checks.length,captures:captures.length,output}));
}catch(error){await capture('failure').catch(()=>{});await fs.writeFile(output+'/report.json',JSON.stringify({status:'FAIL',url,error:String(error),checks,appearanceChecks,captures,errors,failures},null,2));throw error;}finally{await browser.close();}
