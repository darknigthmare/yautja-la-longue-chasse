import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright-core';
import { enterCampaignDeck } from './campaign-browser-helpers.mjs';

const url = process.env.V62_QA_URL ?? 'http://127.0.0.1:4182';
const out = process.env.V62_MORPH_QA_OUTPUT_DIR ?? 'work-local/v62/qa/heads';
const output = `${out}/forge-morph-thumbnails.png`;
const reportPath = process.env.V62_MORPH_QA_REPORT ?? 'docs/v62-morph-thumbnails-qa.json';
await fs.mkdir(out,{recursive:true});await fs.mkdir(path.dirname(reportPath),{recursive:true});
const browser = await chromium.launch({channel:'chrome',headless:true});
const page = await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
const errors = [], failed = [];
page.on('pageerror', error => errors.push(error.message));
page.on('response', response => { if(response.status() >= 400 && /\/game\//.test(response.url())) failed.push({url:response.url(),status:response.status()}); });
try {
  await enterCampaignDeck(page,{url});
  await page.getByRole('button',{name:'Accès rapide aux installations',exact:true}).click();
  const details = page.locator('.ship-level-accessibility').filter({has:page.locator('summary',{hasText:'Accès direct aux interfaces'})});
  if(await details.getAttribute('open') === null) await details.locator('summary').click();
  await details.getByRole('button',{name:/^PARURES/}).click();
  await page.getByRole('heading',{name:'Personnalisation du Yautja',exact:true}).waitFor();
  const section = page.locator('.customization-section').filter({has:page.getByRole('heading',{name:'Morphologie',exact:true})});
  assert.equal(await section.locator('button').count(),6);
  await section.scrollIntoViewIfNeeded();
  await section.locator('img').evaluateAll(async images => {
    await Promise.all(images.map(async image => { if(!image.complete) await new Promise((resolve,reject) => { image.addEventListener('load',resolve,{once:true});image.addEventListener('error',reject,{once:true}); }); assertImage(image); }));
    function assertImage(image) { if(!image.naturalWidth) throw Error(`Image missing: ${image.src}`); }
  });
  const choices = await section.locator('button').evaluateAll(options => options.map(option => {
    const model = option.querySelector('[data-modular-homeworld-character]');
    const head = option.querySelector('[data-homeworld-body-part="head"]');
    const art = option.querySelector('.appearance-option-art');
    const rect = element => {const r=element.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};};
    return {morph:model.dataset.bodyMorph,label:option.querySelector('strong').textContent,modelRect:rect(model),artRect:rect(art),headRect:rect(head),head:head.getAttribute('src'),headLoaded:head.complete && head.naturalWidth>0,imageCount:option.querySelectorAll('img').length,allImagesLoaded:[...option.querySelectorAll('img')].every(img=>img.complete && img.naturalWidth>0),legacyHeadImages:[...option.querySelectorAll('img')].filter(img=>/\/body\/[^/]+\/(full\.webp|parts\/head\.webp)$/.test(img.getAttribute('src'))).map(img=>img.getAttribute('src'))};
  }));
  assert.deepEqual(choices.map(choice=>choice.morph),['classic','elder','super','feral','huntress','young']);
  for(const choice of choices) {
    const family = ['young','huntress'].includes(choice.morph) ? 'classic' : choice.morph;
    assert.equal(choice.head,`/game/sprites/v62/heads/${family}-head.png`);
    assert(choice.allImagesLoaded && choice.headLoaded);
    assert(choice.modelRect.width>0 && choice.modelRect.height>0 && choice.headRect.width>0 && choice.headRect.height>0);
    assert.deepEqual(choice.legacyHeadImages,[]);
    const a=choice.artRect,h=choice.headRect;
    assert(h.x>=a.x-.5 && h.y>=a.y-.5 && h.x+h.width<=a.x+a.width+.5 && h.y+h.height<=a.y+a.height+.5,`${choice.morph}: head cropped`);
  }
  await section.screenshot({path:output});
  assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);
  const report={status:'PASS',url,scope:'Real forge morphology options in isolated campaign fixture; no user save altered.',choices,screenshot:output,errors,failed,visualInspection:'pending'};
  await fs.writeFile(reportPath,JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report,null,2));
} catch(error) { await page.screenshot({path:`${out}/forge-morph-thumbnails-failure.png`}).catch(()=>{});throw error; }
finally {await browser.close();}
