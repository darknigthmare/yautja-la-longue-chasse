import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium } from 'playwright-core';
import { campaignFixture, enterCampaignDeck } from './campaign-browser-helpers.mjs';
import { homeworldQaModelV64 } from './homeworld-qa-model-v64.mjs';
import { homeworldNavigatorV66 } from './homeworld-navigation-browser-v66.mjs';
import { homeworldRegionNavigatorV68 } from './homeworld-region-navigation-v68.mjs';
const url = process.env.V68_QA_URL ?? 'http://127.0.0.1:4186';
const output = process.env.V68_VISUAL_QA_OUTPUT ?? 'work-local/v68/qa/visuals';
await fs.mkdir(output,{recursive:true});
const api = homeworldQaModelV64(process.cwd(), ['homeworldCity.ts','homeworldInteriorsV64.ts','homeworldSpatialCodex.ts','homeworldRegionsV68.ts','homeworldLifeV68.ts']);
const selectedRegions = process.env.V68_VISUAL_REGIONS?.split(',') ?? api.HOMEWORLD_REGION_IDS_V68;
assert(selectedRegions.length && selectedRegions.every(id=>api.HOMEWORLD_REGION_IDS_V68.includes(id)), 'Only real village IDs can be selected');
const base = await campaignFixture(), captures=[], checks=[], errors=[], failures=[];
const browser = await chromium.launch({channel:'chrome',headless:true});
let page;
async function capture(name){const file=output+'/'+name+'.jpg';await page.screenshot({path:file,type:'jpeg',quality:88});captures.push(file);}
const observe=page=>{page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)failures.push({url:r.url(),status:r.status()});});};
try {
  const ctx=await browser.newContext({viewport:{width:1440,height:950}});page=await ctx.newPage();page.setDefaultTimeout(60000);observe(page);
  await enterCampaignDeck(page,{url}); await page.getByRole('button',{name:'Yautja Prime · monde natal',exact:true}).click();
  await page.locator('[data-homeworld-hub]').waitFor(); await page.locator('[data-homeworld-hub] img').evaluateAll(imgs=>Promise.all(imgs.map(i=>i.decode())));
  assert.equal(await page.locator('main').getAttribute('data-game-content-version'),'V68');
  await page.clock.install();await page.clock.pauseAt(await page.evaluate(()=>Date.now()+150));
  const nav=homeworldNavigatorV66(page,api); await nav.focus();await nav.tick(500);await capture('city-inhabited-port');
  const residents=await page.locator('[data-homeworld-resident]').count(); assert(residents>0 && residents<56,'Visible population is culled from city-wide routines');
  await nav.openPoint('market-service'); assert(await page.locator('[data-contracts-v68]').isVisible());await capture('clan-hunt-board');
  await nav.closeDialog();assert(await page.locator('[data-homeworld-hunt-board-v68]').isVisible());await capture('terminal-in-armory');
  checks.push({name:'city-native-population-and-physical-hunt-board',visibleResidents:residents,routes:nav.routes});await ctx.close();
  for(const id of selectedRegions){
    const context=await browser.newContext({viewport:{width:1440,height:950}});page=await context.newPage();page.setDefaultTimeout(60000);observe(page);
    const fixture=structuredClone(base);fixture.save.homeworldRegionV68=api.createHomeworldRegionV68(id,'visual-'+id,true);
    if(id==='forbidden-reserve'){
      fixture.save.homeworld.expeditions['ash-marches']={expeditionId:'ash-marches',trueTrailInspected:true,falseTrailRejected:true,obstacleMoved:true,convoyRecovered:true,shortcutOpened:true,secretFound:false,ticks:7250};
      fixture.save.homeworld.expeditions['glass-desert']={expeditionId:'glass-desert',terrainSurveyed:true,transportLogRecovered:true,diversionCorroborated:true,safePassageOpened:true,crossingRoute:'stepping-stones',beaconDisposition:'preserve',secretFound:false,ticks:9000};
    }
    await page.addInitScript(({key,save})=>{if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(save));},fixture);
    await page.clock.install(); await page.goto(url,{waitUntil:'networkidle'});await page.getByRole('button',{name:/^Continuer/}).click();
    const root=page.locator('[data-homeworld-region-v68]'); await root.waitFor(); await page.locator('[data-region-resume]').waitFor();
    await page.clock.pauseAt(await page.evaluate(()=>Date.now()+150));const n=homeworldRegionNavigatorV68(page,api);await n.resume();
    await page.locator('[data-homeworld-region-v68] img').evaluateAll(imgs=>Promise.all(imgs.map(i=>i.decode())));await capture(id+'-village');
    assert.equal(await page.locator('[data-region-building]').count(),12);assert.equal(await page.locator('[data-region-resident]').count(),12);
    const b=api.HOMEWORLD_REGIONS_V68[id].buildings.find(b=>b.id==='hall'),target=api.homeworldBuildingDoorwayV64(b).approach;
    await n.walkTo(target);await capture(id+'-door');await n.interact();assert.equal(await root.getAttribute('data-zone'),'interior');
    await capture(id+'-interior');await n.walkTo({x:380,y:310});await n.interact();assert(await root.getByRole('dialog').isVisible());
    await capture(id+'-clan-dialogue');
    const loaded=await root.locator('img').evaluateAll(imgs=>imgs.every(i=>i.complete && i.naturalWidth>0));assert(loaded,'All rendered native images loaded');
    checks.push({name:'village-door-interior-and-clan-dialogue',id,buildings:12,residents:12,loaded,routes:n.routes});await context.close();
  }
  assert.deepEqual(errors,[]);assert.deepEqual(failures,[]);
  const report={status:'PASS',url,selectedRegions,checks,captures,errors,failures,limits:'Fresh isolated contexts. Selected visual fixtures begin at the village threshold using the real constructor, no completion proofs. All subsequent door/interior/dialogue paths use keyboard movement. Full connector and hunting-contract traversal are verified separately. No new full-body walking atlas claimed.'};
  await fs.writeFile(output+'/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify({status:'PASS',checks:checks.length,captures:captures.length,output}));
}catch(e){await capture('failure').catch(()=>{});await fs.writeFile(output+'/report.json',JSON.stringify({status:'FAIL',url,error:String(e),checks,captures,errors,failures},null,2));throw e;}finally{await browser.close();}
