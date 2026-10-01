import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium } from 'playwright-core';
import { campaignFixture } from './campaign-browser-helpers.mjs';
import { homeworldQaModelV64 } from './homeworld-qa-model-v64.mjs';
import { homeworldRegionNavigatorV68 } from './homeworld-region-navigation-v68.mjs';

const url=process.env.V69_QA_URL??'http://127.0.0.1:4187',output=process.env.V69_VILLAGE_QA_OUTPUT??'work-local/v69/qa/villages';
await fs.mkdir(output,{recursive:true});
const api=homeworldQaModelV64(process.cwd(),['homeworldRegionsV68.ts','homeworldVillageLifeV69.ts','homeworldGeometryV64.ts']);
const selected=process.env.V69_VILLAGE_REGIONS?.split(',')??api.HOMEWORLD_REGION_IDS_V68;
assert(selected.length&&selected.every(id=>api.HOMEWORLD_REGION_IDS_V68.includes(id)));
const base=await campaignFixture(),browser=await chromium.launch({channel:'chrome',headless:true}),checks=[],captures=[],errors=[],failures=[];
let page;
async function capture(name){const file=output+'/'+name+'.jpg';await page.screenshot({path:file,type:'jpeg',quality:87});captures.push(file);}
try{
  for(const id of selected){
    const context=await browser.newContext({viewport:{width:1440,height:950},reducedMotion:'reduce'});page=await context.newPage();page.setDefaultTimeout(60000);
    page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)failures.push({url:r.url(),status:r.status()});});
    const fixture=structuredClone(base);fixture.save.homeworldRegionV68=api.createHomeworldRegionV68(id,'v69-life-'+id,true);
    if(id==='forbidden-reserve'){
      fixture.save.homeworld.expeditions['ash-marches']={expeditionId:'ash-marches',trueTrailInspected:true,falseTrailRejected:true,obstacleMoved:true,convoyRecovered:true,shortcutOpened:true,secretFound:false,ticks:7250};
      fixture.save.homeworld.expeditions['glass-desert']={expeditionId:'glass-desert',terrainSurveyed:true,transportLogRecovered:true,diversionCorroborated:true,safePassageOpened:true,crossingRoute:'stepping-stones',beaconDisposition:'preserve',secretFound:false,ticks:9000};
    }
    await page.addInitScript(({key,save})=>{if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(save));},fixture);
    await page.clock.install();await page.goto(url,{waitUntil:'networkidle'});await page.getByRole('button',{name:/^Continuer/}).click();
    const root=page.locator('[data-homeworld-region-v68]');await root.waitFor();await page.locator('[data-region-resume]').waitFor();
    await page.clock.pauseAt(await page.evaluate(()=>Date.now()+150));const nav=homeworldRegionNavigatorV68(page,api);await nav.resume();
    assert.equal(await root.getAttribute('data-homeworld-region-v68'),id);assert.equal(await root.locator('[data-region-building]').count(),12);
    const life=api.HOMEWORLD_VILLAGE_LIFE_V69[id],resident=life.residents[0];
    await nav.walkTo(resident.path[0]);await capture(id+'-activity');
    const crowd=await root.locator('[data-region-village-resident-v69]').count();assert(crowd>0&&crowd<18,'Additional population is actually culled by camera bounds');
    const before=await root.locator('[data-region-village-resident-v69]').evaluateAll(nodes=>Object.fromEntries(nodes.map(n=>[n.dataset.regionVillageResidentV69,{x:Number(n.dataset.lifeX),y:Number(n.dataset.lifeY)}])));
    await nav.tick(7000);const after=await root.locator('[data-region-village-resident-v69]').evaluateAll(nodes=>Object.fromEntries(nodes.map(n=>[n.dataset.regionVillageResidentV69,{x:Number(n.dataset.lifeX),y:Number(n.dataset.lifeY)}])));
    assert(Object.keys(before).some(id=>after[id]&&Math.hypot(after[id].x-before[id].x,after[id].y-before[id].y)>12),'Native residents visibly follow their routes');
    await page.getByRole('button',{name:'Pause',exact:true}).click();const paused=Number(await root.getAttribute('data-state-tick'));await nav.tick(2500);assert.equal(Number(await root.getAttribute('data-state-tick')),paused,'Village routines freeze with game pause');await nav.resume();
    // Search a non-service resident by public walking only. Existing doors and
    // the twelve V68 proof witnesses always keep their interaction priority.
    let talked=false;
    for(const n of life.residents){
      const tick=Number(await root.getAttribute('data-state-tick')),pose=api.homeworldVillageResidentPoseV69(id,n,tick);
      await nav.walkTo(pose);const button=root.locator('[data-region-interact]');
      const label=await button.innerText();
      if(life.residents.some(r=>label.includes(r.name))){await nav.interact();assert(await root.getByRole('dialog').isVisible());await capture(id+'-inhabitant-dialogue');talked=true;await nav.resume();break;}
    }
    assert(talked,'A new local inhabitant can be reached and heard');
    for(const buildingId of ['house-n-0','house-n-1']){
      const house=api.HOMEWORLD_REGIONS_V68[id].buildings.find(b=>b.id===buildingId);
      await nav.walkTo({x:house.x,y:house.y+115});await capture(id+'-'+buildingId+'-props');
    }
    const hall=api.HOMEWORLD_REGIONS_V68[id].buildings.find(b=>b.id==='hall');await nav.walkTo({x:hall.x,y:hall.y+70});await nav.interact();assert.equal(await root.getAttribute('data-zone'),'interior');
    await capture(id+'-interior-open');
    await nav.walkTo({x:380,y:310});await nav.interact();assert(await root.getByRole('dialog').isVisible());await capture(id+'-interior-service');await nav.resume();
    await nav.walkTo(api.HOMEWORLD_REGION_INTERIOR_V68.entry);await nav.interact();assert.equal(await root.getAttribute('data-zone'),'village');
    const stored=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),fixture.key);
    assert(api.normalizeHomeworldRegionV68(stored.homeworldRegionV68),'Updated crowd cannot corrupt a legacy checkpoint');
    assert.deepEqual(stored.homeworldRegionV68.eventReceipts,[],'Activity conversations do not mint field proof');
    assert.deepEqual(stored.homeworldRegionV68.greeted,[],'A new ambient conversation cannot claim an existing V68 witness encounter');
    await root.locator('img').evaluateAll(imgs=>Promise.all(imgs.map(i=>i.decode())));assert(await root.locator('img').evaluateAll(imgs=>imgs.every(i=>i.complete&&i.naturalWidth>0)));
    checks.push({id,status:'PASS',totalPopulation:30,additionalResidents:18,visibleAdditional:crowd,activities:4,props:18,talked,routes:nav.routes});await context.close();
  }
  assert.deepEqual(errors,[]);assert.deepEqual(failures,[]);
  await fs.writeFile(output+'/report.json',JSON.stringify({status:'PASS',url,checks,captures,errors,failures,scope:'Isolated V68 village checkpoint fixtures, then real keyboard movement, pause, resident conversation, door, service and exit. No injected movement or field proof. Not a full connector/contract playthrough; those are separate recipes.'},null,2));
  console.log(JSON.stringify({status:'PASS',villages:checks.length,captures:captures.length,output}));
}catch(error){await capture('failure').catch(()=>{});await fs.writeFile(output+'/report.json',JSON.stringify({status:'FAIL',url,error:String(error),checks,captures,errors,failures},null,2));throw error;}finally{await browser.close();}
