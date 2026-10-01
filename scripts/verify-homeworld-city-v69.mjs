import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import {chromium} from 'playwright-core';
import {homeworldQaModelV64} from './homeworld-qa-model-v64.mjs';
import {homeworldNavigatorV66} from './homeworld-navigation-browser-v66.mjs';
import {firstTracksCompleted,p} from '../tests/helpers/solo-v67-campaign-route.mjs';
const url=process.env.V69_QA_URL??'http://127.0.0.1:4187',output=process.env.V69_CITY_QA_OUTPUT??'work-local/v69/qa/city';
await fs.mkdir(output,{recursive:true});
const api=homeworldQaModelV64(process.cwd(),['homeworldCity.ts','homeworldInteriorsV64.ts','homeworldSpatialCodex.ts','homeworldLifeV69.ts']);
const save=firstTracksCompleted(),browser=await chromium.launch({channel:'chrome',headless:true});
const context=await browser.newContext({viewport:{width:1440,height:950}}),page=await context.newPage(),checks=[],captures=[],errors=[],failures=[];
page.setDefaultTimeout(60000);page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)failures.push({url:r.url(),status:r.status()});});
async function capture(name){const path=output+'/'+name+'.jpg';await page.screenshot({path,type:'jpeg',quality:90});captures.push(path);}
try {
  await page.addInitScript(({key,save})=>{if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(save));},{key:p.SAVE_STORAGE_KEY,save});
  await page.goto(url,{waitUntil:'networkidle'});await page.getByRole('button',{name:/^Continuer/}).click();await page.locator('[data-homeworld-hub]').waitFor();
  assert.equal(await page.locator('main').getAttribute('data-game-content-version'),'V69');
  await page.locator('[data-homeworld-hub] img').evaluateAll(imgs=>Promise.all(imgs.map(i=>i.decode())));
  await page.clock.install();await page.clock.pauseAt(await page.evaluate(()=>Date.now()+150));
  const nav=homeworldNavigatorV66(page,api);await nav.focus();await capture('city-inhabited-port');
  assert.equal(api.HOMEWORLD_RESIDENTS_V69.length,98);
  for(const id of ['memory','temple']) {
    const prop=api.HOMEWORLD_PROPS.find(p=>p.id==='life-v69-brazier-'+id),from=await nav.position();
    let route;
    // Furniture is solid. Find a genuine nearby street instead of retaining
    // an offset chosen before the final native furniture placement.
    for(const [dx,dy] of [[110,70],[0,100],[-110,70],[0,170],[180,100],[-180,100]]) {
      const target={x:prop.x+dx,y:prop.y+dy};
      if(!api.isHomeworldWalkable(target)) continue;
      const candidate=api.homeworldSpatialRoute(from,target);
      if(candidate.status==='reachable'){route=candidate;break;}
    }
    assert(route,'The final prop has a physically accessible street approach');await nav.follow(route.points);
    const view=page.locator('[data-homeworld-prop-id="'+prop.id+'"]');assert(await view.isVisible());
    const box=await view.boundingBox();assert(box.width>50&&box.width<220&&box.height>50&&box.height<220,'Native prop remains at adult scale');
    await capture(id+'-native-brazier');checks.push({name:'physical-native-brazier',district:id,box,routeDistance:route.distance});
  }
  const r=api.HOMEWORLD_NEW_RESIDENTS_V69.find(r=>r.districtId==='temple'),pose=api.homeworldResidentPoseV69(r,Number(await page.locator('[data-homeworld-viewport]').getAttribute('data-city-seconds'))||0);
  // A safe nearby street, reached with actual keyboard movement, shows the new crowd.
  const route=api.homeworldSpatialRoute(await nav.position(),pose);assert.equal(route.status,'reachable');await nav.follow(route.points);
  await capture('city-new-residents');
  const count=await page.locator('[data-homeworld-resident]').count();assert(count>0&&count<98,'City-wide population is culled before modular rendering');
  const before=await page.locator('[data-homeworld-resident]').evaluateAll(nodes=>Object.fromEntries(nodes.map(n=>[n.dataset.homeworldResident,{x:+n.dataset.x,y:+n.dataset.y}])));
  await nav.tick(6000);const after=await page.locator('[data-homeworld-resident]').evaluateAll(nodes=>Object.fromEntries(nodes.map(n=>[n.dataset.homeworldResident,{x:+n.dataset.x,y:+n.dataset.y}])));
  assert(Object.keys(before).some(id=>after[id]&&Math.hypot(after[id].x-before[id].x,after[id].y-before[id].y)>10));
  checks.push({name:'native-inhabitants-culling-and-routines',visibleResidents:count});
  await nav.openPoint('market-service');assert(await page.locator('[data-contracts-v68]').isVisible());await capture('younger-market-board');await nav.closeDialog();
  await page.setViewportSize({width:393,height:852});await nav.focus();await capture('portrait-city');
  assert.equal(await page.locator('[data-homeworld-hub] button').evaluateAll(nodes=>nodes.filter(n=>n.getBoundingClientRect().width&&n.getBoundingClientRect().height).some(n=>{const r=n.getBoundingClientRect();return r.x<-.5||r.right>394;})),false,'HUD has no horizontally clipped buttons');
  const response=await page.request.get(url+'/game/homeworld/v69/clan-brazier.png');assert.equal(response.status(),200);
  const sha256=crypto.createHash('sha256').update(await response.body()).digest('hex');
  assert.equal(sha256,'c41a36b9fb94489f21fd2157800666809a0342787781fce982ac622cc0b9f0bb');
  checks.push({name:'native-art-bytes-and-mobile-hud',sha256});assert.deepEqual(errors,[]);assert.deepEqual(failures,[]);
  await fs.writeFile(output+'/report.json',JSON.stringify({status:'PASS',url,checks,captures,errors,failures,limits:'Earlier nursery/youth/First Tracks are declared model-played prerequisites, not browser-played here. All current city routes use actual keyboard input. Body images and procedural dread motion are reused; no new full walking atlas or canon city map is claimed.'},null,2));
  console.log(JSON.stringify({status:'PASS',checks:checks.length,captures:captures.length,output}));
}catch(error){await capture('failure').catch(()=>{});await fs.writeFile(output+'/report.json',JSON.stringify({status:'FAIL',url,error:String(error),checks,captures,errors,failures},null,2));throw error;}
finally{await browser.close();}
