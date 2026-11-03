import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium} from 'playwright-core';
import {homeworldQaModelV64} from './homeworld-qa-model-v64.mjs';
import {homeworldNavigatorV66} from './homeworld-navigation-browser-v66.mjs';
import {firstTracksCompleted,p} from '../tests/helpers/solo-v67-campaign-route.mjs';

const url=process.env.V75_QA_URL??'http://127.0.0.1:4192';
const output=process.env.V75_CONVERSATIONS_QA_OUTPUT??'work-local/v75/qa/conversations-local';
const natural=process.env.V75_QA_NATURAL_HYDRATION==='1';
const api=homeworldQaModelV64(process.cwd(),['homeworld.ts','homeworldCity.ts','homeworldSpatialCodex.ts','homeworldLifeV69.ts','homeworldInteriorsV64.ts','homeworldResidentConversationsV75.ts','homeworldWayfindingV75.ts']);
await fs.mkdir(output,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1000}}),checks=[],captures=[],errors=[],failures=[];
page.setDefaultTimeout(90000);page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)failures.push({url:r.url(),status:r.status()});});
const snapshot=()=>page.locator('[data-homeworld-viewport]').getAttribute('data-city-seconds');
const saved=()=>page.evaluate(key=>localStorage.getItem(key),p.SAVE_STORAGE_KEY);
const capture=async name=>{const file=output+'/'+name+'.jpg';await page.screenshot({path:file,type:'jpeg',quality:90});captures.push(file);};
let nav;

// Follow live citizen positions through actual walking. A route sampled before
// movement is only an approach, so re-evaluate the current clock and nearest
// interaction after arrival rather than freezing or replacing the actor.
async function meetCitizen(){
  for(let attempt=0;attempt<16;attempt++){
    const actor=await nav.position(),seconds=Number(await snapshot());
    const nearby=api.nearestHomeworldResidentV69(actor,seconds);
    if(nearby&&!api.nearestHomeworldDoor(actor)&&!api.nearestHomeworldPoint(actor)){
      await nav.release();await page.keyboard.press('KeyE');await nav.tick(96);await page.locator('[data-homeworld-conversation-v75]').waitFor();return nearby;
    }
    const candidates=api.HOMEWORLD_RESIDENTS_V69.map(resident=>({resident,pose:api.homeworldResidentPoseV69(resident,seconds)}))
      .sort((a,b)=>Math.hypot(a.pose.x-actor.x,a.pose.y-actor.y)-Math.hypot(b.pose.x-actor.x,b.pose.y-actor.y)).slice(0,16);
    const routes=candidates.flatMap(({resident,pose})=>{
      // Keep away from door/service priority zones when approaching a citizen.
      return [[0,0],[36,0],[-36,0],[0,36],[0,-36]].flatMap(([dx,dy])=>{
        const target={x:pose.x+dx,y:pose.y+dy};
        if(api.nearestHomeworldDoor(target)||api.nearestHomeworldPoint(target)||!api.nearestHomeworldResidentV69(target,seconds))return[];
        const route=api.homeworldSpatialRoute(actor,target);return route.status==='reachable'?[{route,residentId:resident.id}]:[];
      });
    }).sort((a,b)=>a.route.distance-b.route.distance);
    assert(routes.length,'An actual citizen is physically approachable');
    await nav.follow(routes[0].route.points);await nav.tick(100);
  }
  throw Error('No live civilian conversation reached within the physical approach budget');
}

try{
  await page.addInitScript(({key,save})=>{if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(save));},{key:p.SAVE_STORAGE_KEY,save:firstTracksCompleted()});
  if(!natural)await page.clock.install();await page.goto(url,{waitUntil:'networkidle'});
  await page.getByRole('button',{name:/^Continuer/}).waitFor();
  await page.waitForFunction(()=>[...document.querySelectorAll('button')].some(b=>b.textContent?.startsWith('Continuer')&&!b.disabled));
  if(natural)await page.clock.install();
  await page.getByRole('button',{name:/^Continuer/}).click();await page.locator('[data-homeworld-hub][data-homeworld-motion-ready="true"]').waitFor({timeout:120000});
  assert.equal(await page.locator('main').getAttribute('data-game-content-version'),process.env.YAUTJA_QA_EXPECTED_VERSION??'V75');
  await page.clock.pauseAt(await page.evaluate(()=>Date.now()+150));nav=homeworldNavigatorV66(page,api);await nav.focus();
  // Leave an unrelated finder filter behind. A later explicit civilian tip
  // must select its own real building, not the previous region result.
  await page.getByRole('button',{name:'Repères',exact:true}).click();
  const previousFinder=page.getByRole('dialog',{name:'Repères pratiques',exact:true});await previousFinder.waitFor();
  await previousFinder.getByRole('button',{name:'Sorties',exact:true}).click();await previousFinder.getByRole('searchbox').fill('jungle');
  await page.keyboard.press('Escape');await nav.tick(120);await nav.focus();
  const resident=await meetCitizen(),conversation=page.locator('[data-homeworld-conversation-v75]');
  assert.equal(await conversation.getAttribute('data-homeworld-conversation-v75'),resident.id);
  checks.push({name:'civilian-met-through-public-keyboard-movement',id:resident.id,districtId:resident.districtId,actor:await nav.position()});
  const beforeActor=await nav.position(),beforeSave=await saved(),beforeTime=await snapshot();
  for(const topic of api.HOMEWORLD_RESIDENT_TOPICS_V75){
    await conversation.getByRole('button',{name:topic.label,exact:true}).click();await nav.tick(150);
    assert.equal(await conversation.locator('[data-homeworld-conversation-topic]').getAttribute('data-homeworld-conversation-topic'),topic.id);
    const text=conversation.locator('[data-homeworld-conversation-topic]');
    assert((await text.textContent()).length>90);
    await capture('civilian-topic-'+topic.id);
  }
  await nav.tick(1000);assert.deepEqual(await nav.position(),beforeActor);assert.equal(await saved(),beforeSave);assert.equal(await snapshot(),beforeTime);
  checks.push({name:'three-topics-freeze-city-and-do-not-write-save',topics:3});
  await page.setViewportSize({width:393,height:852});await nav.tick(100);
  await conversation.getByRole('button',{name:'Les lieux proches',exact:true}).click();
  const place=api.homeworldResidentPlacesV75(resident)[0],destination=conversation.locator('[data-homeworld-resident-landmark="'+place.id+'"]');
  assert.equal(await destination.count(),1);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
  await capture('portrait-civilian-local-directions');
  await destination.click();await nav.tick(150);
  const finder=page.getByRole('dialog',{name:'Repères pratiques',exact:true});await finder.waitFor();
  assert.equal(await finder.locator('[data-wayfinding-detail]').getAttribute('data-wayfinding-detail'),place.id);
  assert.equal(await finder.getByRole('searchbox').inputValue(),'');
  assert.equal(await finder.getByRole('button',{name:'Tous',exact:true}).getAttribute('aria-pressed'),'true');
  assert.deepEqual(await nav.position(),beforeActor);assert.equal(await saved(),beforeSave);
  assert.equal(await conversation.count(),0,'A landmark closes the resident modal before opening the finder');
  await capture('portrait-civilian-real-landmark-detail');
  await finder.getByRole('button',{name:'Suivre à pied ce repère',exact:true}).scrollIntoViewIfNeeded();
  await finder.getByRole('button',{name:'Suivre à pied ce repère',exact:true}).click();await nav.tick(150);
  assert.equal(await page.locator('[data-homeworld-wayfinding-guide]').getAttribute('data-wayfinding-target'),place.id);
  assert.deepEqual(await nav.position(),beforeActor);
  await page.setViewportSize({width:1440,height:1000});await nav.tick(100);await nav.focus();
  const plan=api.homeworldWayfindingPlanV75(firstTracksCompleted(),await nav.position(),null,place.id);
  assert.equal(plan.status,'reachable');assert.equal(plan.stages.length,1);
  await nav.follow(plan.stages[0].route.points);await nav.tick(450);
  assert.equal(await page.locator('[data-homeworld-wayfinding-guide]').getAttribute('data-homeworld-wayfinding-guide'),'arrived');
  assert.equal(api.nearestHomeworldDoor(await nav.position())?.id,place.buildingId);
  await capture('civilian-recommended-door-reached-on-foot');
  await nav.release();await page.keyboard.press('KeyE');await nav.tick(96);assert.equal(await page.locator('[data-homeworld-hub]').getAttribute('data-homeworld-interior-id'),place.buildingId);
  await capture('civilian-recommended-interior-entered');
  checks.push({name:'portrait-local-advice-selects-real-target-then-public-keyboard-door-and-room',target:place.id,buildingId:place.buildingId});
  assert.deepEqual(errors,[]);assert.deepEqual(failures,[]);
  await fs.writeFile(output+'/report.json',JSON.stringify({status:'PASS',url,checks,captures,errors,failures,limits:'One actual civilian conversation, three topics and a recommended local door exercised in an isolated campaign fixture. All98 civilian districts additionally covered by model tests. No claim of 98 manual conversations or canonical universal Yautja customs.'},null,2)+'\n');
  console.log(JSON.stringify({status:'PASS',checks:checks.length,captures:captures.length,output}));
}catch(error){await capture('FAIL').catch(()=>{});await fs.writeFile(output+'/report.json',JSON.stringify({status:'FAIL',url,error:String(error),checks,captures,errors,failures},null,2)+'\n');throw error;}
finally{await browser.close();}
