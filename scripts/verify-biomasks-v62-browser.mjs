import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium } from 'playwright-core';
import { enterCampaignDeck, campaignFixture } from './campaign-browser-helpers.mjs';
import { REFERENCE_BIOMASKS_V62, PRESERVED_BIOMASKS_V62 } from '../app/game/biomaskCatalogueV62.ts';

const url=process.env.V62_QA_URL ?? 'http://127.0.0.1:4182';
const out='work-local/v62/qa/masks/browser';await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
const errors=[],failed=[],choices=[];
page.on('pageerror',error=>errors.push(error.message));
page.on('response',response=>{if(response.status()>=400 && /\/game\//.test(response.url()))failed.push({url:response.url(),status:response.status()});});
const fixture=await campaignFixture();
async function openStation(name){
  const quick=page.getByRole('button',{name:'Accès rapide aux installations',exact:true});
  if(await quick.getAttribute('aria-expanded')!=='true') await quick.click();
  const details=page.locator('.ship-level-accessibility').filter({has:page.locator('summary',{hasText:'Accès direct aux interfaces'})});
  if(await details.getAttribute('open')===null) await details.locator('summary').click();
  await details.getByRole('button',{name:new RegExp('^'+name)}).click();
}
async function openForge(){
  await openStation('PARURES');
  await page.getByRole('heading',{name:'Personnalisation du Yautja',exact:true}).waitFor();
}
try{
  await enterCampaignDeck(page,{url});await openForge();
  const maskSection=page.locator('.customization-section').filter({has:page.getByRole('heading',{name:'Biomask',exact:true})});
  assert.equal(await maskSection.count(),1);
  const rig=page.locator('.customization-rig[data-hunter-rig]');
  for(const entry of [...REFERENCE_BIOMASKS_V62,...PRESERVED_BIOMASKS_V62,{id:'elder',label:'Couronne des Ancêtres',legacyMaskId:'elder'}]){
    const option=maskSection.getByRole('button').filter({has:page.locator('strong',{hasText:entry.label})});
    assert.equal(await option.count(),1,entry.id);
    await option.click();await page.waitForFunction(id=>document.querySelector('.customization-rig')?.getAttribute('data-mask')===id,entry.id);
    assert.equal(await option.getAttribute('aria-pressed'),'true');
    const maskImage=rig.locator(`[data-rig-slot="mask-${entry.id}"]`);
    await maskImage.waitFor();
    await page.waitForFunction(id=>{const img=document.querySelector(`.customization-rig [data-rig-slot="mask-${id}"]`);return img?.complete && img.naturalWidth>0;},entry.id);
    const thumbnail=await option.locator('img').getAttribute('src');
    const expected=entry.legacyMaskId?`/game/assets/v3/actors/yautja/hunter/masks/${entry.legacyMaskId}.webp`:`/game/sprites/v62/masks/${entry.id}.png`;
    assert.equal(thumbnail,expected);
    assert.equal(await option.locator('[data-v6-visual]').count(),0);
    if(!entry.legacyMaskId){
      assert.equal(await maskImage.getAttribute('src'),expected);
      await rig.screenshot({path:`${out}/rig-${entry.id}.png`});
      await page.getByRole('button',{name:'Retirer mask',exact:true}).click();
      assert.equal(await rig.locator(`[data-rig-slot="mask-${entry.id}"]`).count(),0);
      await page.getByRole('button',{name:'Porter mask',exact:true}).click();
      await rig.locator(`[data-rig-slot="mask-${entry.id}"]`).waitFor();
    }
    choices.push({id:entry.id,label:entry.label,thumbnail,rig:await maskImage.getAttribute('src'),selected:true,toggle:!entry.legacyMaskId});
  }
  const preserved=maskSection.getByRole('button').filter({has:page.locator('strong',{hasText:'Voile d’argent'})});await preserved.click();
  await page.waitForFunction(({key,id})=>JSON.parse(localStorage.getItem(key)??'null')?.appearance?.biomaskId===id,{key:fixture.key,id:'clan-voile-argent'});
  await page.reload({waitUntil:'networkidle'});await page.getByRole('button',{name:/^Continuer/}).click();
  await page.locator('[data-campaign-session][data-campaign-location="deck"]').waitFor();await openForge();
  assert.equal(await page.locator('.customization-rig').getAttribute('data-mask'),'clan-voile-argent');
  await page.locator('.customization-rig').screenshot({path:`${out}/preserved-after-reload.png`});
  // Native mask selection must also survive a real save/reload.
  await page.locator('.customization-section').filter({has:page.getByRole('heading',{name:'Biomask',exact:true})}).getByRole('button').filter({has:page.locator('strong',{hasText:'Jungle Hunter'})}).click();
  await page.waitForFunction(({key})=>JSON.parse(localStorage.getItem(key)??'null')?.appearance?.biomaskId==='jungle',{key:fixture.key});
  await page.reload({waitUntil:'networkidle'});await page.getByRole('button',{name:/^Continuer/}).click();await page.locator('[data-campaign-session][data-campaign-location="deck"]').waitFor();await openForge();
  assert.equal(await page.locator('.customization-rig').getAttribute('data-mask'),'jungle');
  await page.screenshot({path:`${out}/forge-after-reload.png`});
  await page.getByRole('button',{name:'← Retour au pont · Échap',exact:true}).click();
  await openStation('ARMURERIE');
  await page.getByRole('heading',{name:'Armurerie',exact:true}).waitFor();
  assert.equal(await page.locator('.armory-exact-kit img[src^="/game/sprites/v62/masks/"]').count(),14);
  assert.equal(await page.locator('.armory-mask-rack img[src^="/game/assets/v14/hunter-kit/masks/"]').count(),4);
  for(const img of await page.locator('.armory-exact-kit img, .armory-mask-rack img').all()) {
    await img.scrollIntoViewIfNeeded();
    await img.evaluate(async image=>{if(!image.complete)await new Promise((resolve,reject)=>{image.addEventListener('load',resolve,{once:true});image.addEventListener('error',reject,{once:true});});if(!image.naturalWidth)throw Error('Mask gallery image did not load');});
  }
  await page.locator('.armory-exact-kit h3').scrollIntoViewIfNeeded();
  await page.locator('.armory-atlas-shelves').screenshot({path:`${out}/armory.png`});
  await page.locator('.armory-mask-rack figure').first().scrollIntoViewIfNeeded();
  await page.locator('.armory-atlas-shelves').screenshot({path:`${out}/preserved-gallery.png`});
  assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);
  const report={url,choices,maskCount:14,preservedChoices:12,oldGalleryMasks:4,toggleChecks:14,reloads:['clan-voile-argent','jungle'],errors,failed,passed:true};
  await fs.writeFile('docs/v62-biomask-browser-qa.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
}catch(error){await page.screenshot({path:`${out}/failure.png`}).catch(()=>{});console.error((await page.locator('body').innerText()).slice(-6000));throw error;}finally{await browser.close();}
