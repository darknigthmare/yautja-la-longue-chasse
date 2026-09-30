import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium} from 'playwright-core';
import {campaignFixture,enterCampaignDeck} from './campaign-browser-helpers.mjs';
const url=process.env.V63_QA_URL??'http://127.0.0.1:4182';
const output=process.env.V63_HUNTER_QA_OUTPUT??'work-local/v63/qa/hunter-choice';
await fs.mkdir(output,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const errors=[],failed=[],checks=[];let page;
async function openForge(page){
 await page.getByRole('button',{name:'Accès rapide aux installations',exact:true}).click();
 const details=page.locator('.ship-level-accessibility').filter({has:page.locator('summary',{hasText:'Accès direct aux interfaces'})});
 if(await details.getAttribute('open')===null)await details.locator('summary').click();
 await details.getByRole('button',{name:/^PARURES/}).click();
 await page.getByRole('heading',{name:'Personnalisation du Yautja',exact:true}).waitFor();
 return page.locator('.customization-section').filter({has:page.getByRole('heading',{name:'Tête du chasseur',exact:true})});
}
try{
 page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400&&/\/game\//.test(r.url()))failed.push({url:r.url(),status:r.status()});});
 await enterCampaignDeck(page,{url});const section=await openForge(page);
 assert.equal(await section.locator('button').count(),2);
 const fixture=await campaignFixture();
 for(const style of ['legacy-clan','reference','legacy-clan']){
  await section.locator('button').filter({has:page.locator(`[data-head-choice="${style}"]`)}).click();
  await page.waitForFunction(({key,style})=>JSON.parse(localStorage.getItem(key))?.appearance?.headStyleId===style,{key:fixture.key,style});
  const heads=await page.locator('[data-hunter-rig] [data-rig-slot="body-head"]').evaluateAll(images=>images.map(i=>i.getAttribute('src')));
  assert(heads.length>0);for(const head of heads)assert.match(head,style==='reference'?/\/v62\/heads\//:/\/parts\/head\.webp$/);
  checks.push({style,heads,persisted:true});
 }
 await section.scrollIntoViewIfNeeded();await page.screenshot({path:output+'/forge-legacy-choice.png'});
 await page.reload({waitUntil:'networkidle'});await page.getByRole('button',{name:/^Continuer/}).click();
 await page.locator('[data-campaign-session][data-campaign-location="deck"]').waitFor({timeout:60000});
 const reopened=await openForge(page);
 const oldButton=reopened.locator('button').filter({has:page.locator('[data-head-choice="legacy-clan"]')});
 assert.equal(await oldButton.getAttribute('aria-pressed'),'true');
 const stored=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),fixture.key);
 assert.equal(stored.appearance.headStyleId,'legacy-clan');assert.equal(stored.appearance.presetId,'custom');
 await reopened.scrollIntoViewIfNeeded();await page.screenshot({path:output+'/forge-legacy-reloaded.png'});
 assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);
 await fs.writeFile(output+'/report.json',JSON.stringify({status:'PASS',url,scope:'Real forge selection and campaign reload in isolated browser; no user save changed.',checks,reloadPersists:true,preset:'custom',errors,failed},null,2)+'\n');console.log(JSON.stringify({status:'PASS',checks:checks.length,reloadPersists:true}));
}catch(error){await page?.screenshot({path:output+'/failure.png'}).catch(()=>{});throw error;}finally{await browser.close();}
