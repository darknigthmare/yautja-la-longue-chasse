import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import {chromium} from 'playwright-core';
import {homeworldQaModelV64} from './homeworld-qa-model-v64.mjs';
import {homeworldNavigatorV66} from './homeworld-navigation-browser-v66.mjs';
import {firstTracksCompleted,p} from '../tests/helpers/solo-v67-campaign-route.mjs';

const url=process.env.V72_CONNECTIONS_QA_URL??'http://127.0.0.1:4192';
const output=process.env.V72_CONNECTIONS_QA_OUTPUT??'work-local/v72/qa/connections';
await fs.mkdir(output,{recursive:true});
const api=homeworldQaModelV64(process.cwd(),['homeworld.ts','homeworldCity.ts','homeworldInteriorsV64.ts','homeworldSpatialCodex.ts',
  'homeworldRegionConnectionsV72.ts','homeworldFurnitureV72.ts','homeworldConnectionCodexV72.ts','homeworldRegionsV68.ts']);
const browser=await chromium.launch({channel:'chrome',headless:true}),context=await browser.newContext({viewport:{width:1440,height:1000}});
const page=await context.newPage(),checks=[],captures=[],errors=[],failures=[];
page.setDefaultTimeout(60000);page.on('pageerror',error=>errors.push(error.message));
page.on('response',response=>{if(response.status()>=400)failures.push({url:response.url(),status:response.status()});});
const fixture=firstTracksCompleted();
const decode=async()=>{
  await page.locator('[data-homeworld-hub] img').evaluateAll(imgs=>Promise.all(imgs.map(img=>img.decode())));
  await page.locator('[data-homeworld-connection-floor] image').evaluateAll(nodes=>Promise.all(nodes.map(node=>{const img=new Image();img.src=node.href.baseVal;return img.decode();})));
};
const capture=async name=>{
  await decode();const path=output+'/'+name+'.jpg';await page.screenshot({path,type:'jpeg',quality:90});captures.push(path);
};
const saved=()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),p.SAVE_STORAGE_KEY);
const cityReady=async()=>{await page.locator('[data-homeworld-hub]').waitFor();if(['V74','V75'].includes(process.env.YAUTJA_QA_EXPECTED_VERSION))await page.locator('[data-homeworld-hub][data-homeworld-motion-ready="true"]').waitFor({timeout:120000});};
try{
  await page.addInitScript(({key,save})=>{if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(save));},{key:p.SAVE_STORAGE_KEY,save:fixture});
  // Own RAF and performance time before mounting the game: installing a clock
  // after an existing RAF loop resets its timestamps and can fake a blocked path.
  await page.clock.install();
  await page.goto(url,{waitUntil:'networkidle'});await page.getByRole('button',{name:/^Continuer/}).click();await cityReady();
  assert.equal(await page.locator('main').getAttribute('data-game-content-version'),process.env.YAUTJA_QA_EXPECTED_VERSION??'V73');
  await page.clock.pauseAt(await page.evaluate(()=>Date.now()+150));
  const nav=homeworldNavigatorV66(page,api);await nav.focus();
  const visited=[];
  for(const regionId of ['ash-marches','leviathan-coast','first-city-ruins','pillar-jungle','storm-chain','cold-crown','luminous-marshes','forbidden-reserve','thermal-caves','glass-desert']){
    const definition=api.homeworldConnectionByRegionV72(regionId),from=await nav.position();
    const route=api.homeworldSpatialRoute(from,definition.arrival);assert.equal(route.status,'reachable',regionId+' city route');
    await nav.follow(route.points);await nav.tick(100);await decode();
    assert.equal(api.nearestHomeworldPoint(await nav.position())?.regionId,regionId);
    const scene=page.locator('[data-homeworld-region-connection-v72="'+regionId+'"]');assert.equal(await scene.count(),1);
    const native=scene.locator('[data-homeworld-prop-id="gateway-v72:'+regionId+'"]');
    const art=api.HOMEWORLD_GATEWAY_ART_V72[definition.artId],rect=art.sourceRect;
    assert.equal(await native.getAttribute('data-native-source-rect'),[rect.x,rect.y,rect.width,rect.height].join(','));
    const allowed=api.canEnterHomeworldRegionV68(fixture,regionId).allowed;
    assert.equal(await scene.getAttribute('data-connection-authorized'),String(allowed),'visible permissions follow original gates');
    await capture(regionId+'-physical-threshold');
    await page.keyboard.press('KeyE');await nav.tick(100);await page.locator('[data-homeworld-hub]').getByRole('dialog').waitFor();
    const launch=page.locator('[data-homeworld-region-v68="'+regionId+'"]');assert.equal(await launch.isEnabled(),allowed,regionId+' actual action permission');
    checks.push({name:'physical-keyboard-approach-and-native-arch',regionId,from,arrival:await nav.position(),distance:route.distance,nativeSource:await native.getAttribute('data-native-source-rect'),allowed,noTeleport:true});
    if(['ash-marches','pillar-jungle'].includes(regionId)){
      // Let genuine dynamic imports / Suspense settle before freezing physics.
      await page.clock.resume();await launch.click();const region=page.locator('section[data-homeworld-region-v68="'+regionId+'"]');await region.waitFor();
      await region.locator('[data-region-resume]').waitFor();await page.clock.pauseAt(await page.evaluate(()=>Date.now()+150));
      await page.locator('[data-region-resume]').click();await nav.tick(100);
      const viewport=region.locator('[tabindex="0"]');await viewport.focus();await page.keyboard.press('KeyE');await nav.tick(100);
      // Public E at the city-end socket commits and returns automatically.
      // The recovery button exists only if that durable handoff fails.
      await page.clock.resume();await cityReady();
      await page.clock.pauseAt(await page.evaluate(()=>Date.now()+150));await nav.tick(100);await nav.focus();
      const arrival=await nav.position();assert(Math.hypot(arrival.x-definition.arrival.x,arrival.y-definition.arrival.y)<1,regionId+' actual regional return uses same physical gate');
      await capture(regionId+'-regional-return');
      const prior=await saved();await page.clock.resume();await page.reload({waitUntil:'networkidle'});await page.getByRole('button',{name:/^Continuer/}).click();await cityReady();
      await page.clock.pauseAt(await page.evaluate(()=>Date.now()+150));
      await nav.tick(150);await nav.focus();const after=await saved(),resumed=await nav.position(),spawn=api.createHomeworldActor();
      assert.equal(after.homeworldRegionV68,null,regionId+' completed journey remains cleared after reload');
      assert.deepEqual(after.homeworld.evidenceIds,prior.homeworld.evidenceIds);assert.deepEqual(after.homeworld.contractsV68,prior.homeworld.contractsV68);
      assert.deepEqual(after.soloV66,prior.soloV66);assert.deepEqual(after.youthTraining,prior.youthTraining);
      assert(Math.hypot(resumed.x-spawn.x,resumed.y-spawn.y)<1,regionId+' hub reload resumes at its documented port spawn');
      checks.push({name:'two-sided-threshold-handoff-and-durable-ledger-reload',regionId,arrival,resumed,localDurable:true,
        limit:'Immediate regional city-end return uses the same physical gate. Reload preserves the completed journey and campaign ledger, and returns to the documented port spawn: the instantaneous hub position is not saved. No complete village or full regional journey replay claimed.'});
    }else await nav.closeDialog();
    visited.push(regionId);
  }
  assert.equal(visited.length,10);
  await page.setViewportSize({width:393,height:852});await nav.tick(100);await nav.focus();await capture('glass-desert-native-threshold-portrait');
  await page.keyboard.press('KeyE');await nav.tick(100);const mobileDialog=page.locator('[data-homeworld-hub]').getByRole('dialog');await mobileDialog.waitFor();
  assert.equal(await mobileDialog.evaluate(e=>e.scrollWidth>e.clientWidth+1),false,'authorization panel fits portrait');
  await capture('glass-desert-authorization-portrait');await nav.closeDialog();
  await page.getByRole('button',{name:/^Atlas de la cité/}).click();await page.getByRole('button',{name:'Codex des éléments',exact:true}).click();
  const before=await saved(),actor=await nav.position(),time=await page.locator('[data-homeworld-viewport]').getAttribute('data-city-seconds');
  for(const id of ['gateway-v72:glass-desert','connection-door-v72:glass-desert','connection-furniture-v72:glass-desert:0','direction-v72:glass-desert']){
    await page.getByRole('searchbox',{name:'Rechercher',exact:true}).fill(id);await page.locator('[data-homeworld-element-id="'+id+'"]').click();
    const detail=page.locator('[data-homeworld-element-detail="'+id+'"]');assert.equal(await detail.count(),1);assert((await detail.textContent()).toLowerCase().includes('original'));
    await detail.getByRole('heading',{level:4}).first().scrollIntoViewIfNeeded();await capture(id.replaceAll(':','-')+'-codex-portrait');
  }
  await nav.tick(1200);assert.equal(await page.locator('[data-homeworld-viewport]').getAttribute('data-city-seconds'),time);assert.deepEqual(await nav.position(),actor);
  assert.deepEqual(await saved(),before,'codex is read-only even on physical gate records');checks.push({name:'mobile-permission-and-linked-codex-read-only',records:4});
  for(const art of [...Object.values(api.HOMEWORLD_GATEWAY_ART_V72),...Object.values(api.HOMEWORLD_FURNITURE_ART_V72)].filter((a,i,list)=>list.findIndex(b=>b.src===a.src)===i)){
    const response=await page.request.get(url+art.src);assert.equal(response.status(),200);const hash=crypto.createHash('sha256').update(await response.body()).digest('hex');assert.equal(hash,art.sha256);
    checks.push({name:'native-openai-source-bytes',src:art.src,sha256:hash});
  }
  assert.deepEqual(errors,[]);assert.deepEqual(failures,[]);
  await fs.writeFile(output+'/report.json',JSON.stringify({status:'PASS',url,checks,captures,errors,failures,
    limits:'Earlier nursery/youth/First Tracks are model-played prerequisites in an isolated QA campaign. All ten local gates use real public keyboard movement; two immediate regional returns land at the same physical gate. Reload preserves the completed journey and campaign ledger and resumes at the documented port spawn: the instantaneous city position is not saved. This is not a replay of every full regional journey, nor canonical city geometry.'},null,2)+'\n');
  console.log(JSON.stringify({status:'PASS',checks:checks.length,captures:captures.length,output}));
}catch(error){await capture('failure').catch(()=>{});await fs.writeFile(output+'/report.json',JSON.stringify({status:'FAIL',url,error:String(error),checks,captures,errors,failures},null,2)+'\n');throw error;}
finally{await browser.close();}
