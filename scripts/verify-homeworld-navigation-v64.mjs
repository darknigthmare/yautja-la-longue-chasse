import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium} from 'playwright-core';
import {campaignFixture,enterCampaignDeck} from './campaign-browser-helpers.mjs';

const url=process.env.V64_QA_URL??'http://127.0.0.1:4182';
const output=process.env.V64_NAV_QA_OUTPUT??'work-local/v64/qa/navigation';
await fs.mkdir(output,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const errors=[],checks=[];
let page;
try {
  for(const viewport of [{width:1440,height:1000},{width:393,height:852},{width:844,height:390}]) {
    page=await browser.newPage({viewport,reducedMotion:'reduce'});
    page.on('pageerror',error=>errors.push(error.message));
    const fixture=await campaignFixture();
    await page.addInitScript(({key,save})=>localStorage.setItem(key,JSON.stringify(save)),fixture);
    await enterCampaignDeck(page,{url});
    await page.getByRole('button',{name:'Yautja Prime · monde natal',exact:true}).click();
    const hub=page.locator('[data-homeworld-hub]'),city=hub.locator('[data-homeworld-viewport]');
    await city.waitFor();
    const position=()=>hub.locator('[data-homeworld-actor]').evaluate(node=>({x:node.dataset.x,y:node.dataset.y}));
    await hub.getByRole('button',{name:'Pause',exact:true}).click();
    await hub.getByRole('button',{name:'Reprendre',exact:true}).click();
    await hub.getByRole('button',{name:'Navigation',exact:true}).click();
    let dialog=page.getByRole('dialog',{name:'Navigation de la cité',exact:true});
    await dialog.waitFor();
    const before=await position();await page.keyboard.press('ArrowRight');await page.waitForTimeout(150);
    assert.deepEqual(await position(),before,'navigation must not move the actor');
    await dialog.getByRole('button',{name:'Réglages',exact:true}).click();
    const settings=page.getByRole('dialog',{name:'Réglages du biomask',exact:true});await settings.waitFor();
    await page.keyboard.press('Escape');await settings.waitFor({state:'hidden'});await hub.waitFor();
    assert.deepEqual(await position(),before,'settings must preserve the city position');
    for(const [button,station] of [[/^Dossier ·/,'justice'],['Carte galactique','map']]) {
      await hub.getByRole('button',{name:'Navigation',exact:true}).click();
      dialog=page.getByRole('dialog',{name:'Navigation de la cité',exact:true});
      await dialog.getByRole('button',{name:button,exact:typeof button==='string'}).click();
      const layer=page.locator(`[data-station-screen="${station}"]`);await layer.waitFor();
      assert.equal(await hub.isVisible(),false,'the city must not cover its service');
      await layer.getByRole('button',{name:/Retour à la cité · Échap/}).click();await hub.waitFor();
      assert.deepEqual(await position(),before,'service round-trip preserves city position');
    }
    await page.locator('.toast').waitFor({state:'hidden',timeout:5000});
    await page.waitForFunction(()=>{const hub=document.querySelector('[data-homeworld-hub]');return hub&&getComputedStyle(hub).position==='fixed';},undefined,{timeout:60000});
    await page.waitForLoadState('networkidle');
    const bounds=await hub.evaluate(node=>{const r=node.getBoundingClientRect();return {top:r.top,bottom:r.bottom,left:r.left,right:r.right,height:innerHeight,width:innerWidth};});
    assert(bounds.top>=0&&bounds.bottom<=bounds.height+1&&bounds.left>=0&&bounds.right<=bounds.width+1,JSON.stringify(bounds));
    await page.screenshot({path:`${output}/${viewport.width}x${viewport.height}.png`});
    await hub.getByRole('button',{name:'Navigation',exact:true}).click();
    await page.getByRole('dialog',{name:'Navigation de la cité',exact:true}).getByRole('button',{name:'Rejoindre le vaisseau',exact:true}).click();
    await page.locator('[data-campaign-location="deck"]').waitFor();assert.equal(await hub.isVisible(),false);
    checks.push({viewport,settings:true,justice:true,map:true,returnShip:true,positionPreserved:true,bounds});
    await page.close();
  }
  assert.deepEqual(errors,[]);
  await fs.writeFile(`${output}/report.json`,JSON.stringify({status:'PASS',url,checks,errors,scope:'Real UI clicks, isolated legacy campaign fixture, three viewport sizes; no player storage touched.'},null,2)+'\n');
  console.log(JSON.stringify({status:'PASS',checks:checks.length,output}));
} catch(error) {
  if(page&&!page.isClosed())await page.screenshot({path:`${output}/failure.png`}).catch(()=>{});
  await fs.writeFile(`${output}/failure.json`,JSON.stringify({error:String(error),checks,errors},null,2));throw error;
} finally {await browser.close();}
