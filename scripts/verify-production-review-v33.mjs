import { chromium } from 'playwright-core';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const base=process.env.V33_QA_URL||'http://localhost:4173';
const url=base+'/game/assets/v33/production-review/index.html';
const output=process.env.V33_REVIEW_QA_OUTPUT||'work/v33/review-qa';await fs.mkdir(output,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});const errors=[];
try{
 const page=await browser.newPage({viewport:{width:1280,height:900}});page.on('pageerror',error=>errors.push(error.message));
 await page.goto(url,{waitUntil:'networkidle'});
 const manifest=await (await page.request.get(base+'/game/assets/v33/production-review/manifest.json')).json();
 assert(manifest.entries.length>=35);const canvas=page.locator('#canvas');
 for(const entry of manifest.entries){
  await page.locator('#asset').selectOption(entry.id);
  await page.waitForFunction(id=>{const c=document.getElementById('canvas');return c?.dataset.assetId===id&&c.dataset.loaded==='true';},entry.id);
  assert.equal(await page.locator('#error').innerText(),'');
  assert((await page.locator('#digest').innerText()).includes(entry.sha256));
  if(entry.status==='rejected')assert.equal(await page.locator('#play').isDisabled(),true);
 }
 const moto=manifest.entries.find(entry=>entry.id==='moto-antigrav-chasse-stabilizers-v2-v33');assert(moto);
 await page.locator('#asset').selectOption(moto.id);await page.waitForFunction(id=>document.getElementById('canvas')?.dataset.assetId===id,moto.id);
 await page.locator('#view').selectOption('frames');assert.equal(await page.locator('#play').isEnabled(),true);
 const poseScreens=[];
 for(const facing of ['right','left']){
  await page.locator('#facing').selectOption(facing);
  for(let index=0;index<4;index++){assert.equal(await canvas.getAttribute('data-frame'),String(index));poseScreens.push(await canvas.screenshot());await page.locator('#next').click();}
 }
 assert.equal(new Set(poseScreens.map(buffer=>buffer.toString('base64'))).size,8);
 await page.locator('#background').selectOption('light');await page.screenshot({path:output+'/moto-light-review.png',fullPage:true});
 await page.locator('#play').click();await page.waitForTimeout(210);assert.equal(await page.locator('#play').innerText(),'Pause');await page.locator('#play').click();
 const fx=manifest.entries.find(entry=>entry.id==='moto-propulsion-fx');assert(fx);
 await page.locator('#asset').selectOption(fx.id);await page.waitForFunction(id=>document.getElementById('canvas')?.dataset.assetId===id,fx.id);
 await page.locator('#view').selectOption('frames');const fxScreens=[];
 for(const facing of ['right','left']){
  await page.locator('#facing').selectOption(facing);
  for(let index=0;index<4;index++){assert.equal(await canvas.getAttribute('data-frame'),String(index));fxScreens.push(await canvas.screenshot());await page.locator('#next').click();}
 }
 assert.equal(new Set(fxScreens.map(buffer=>buffer.toString('base64'))).size,8);
 await page.screenshot({path:output+'/propulsion-light-review.png',fullPage:true});
 await page.setViewportSize({width:390,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:output+'/mobile.png',fullPage:true});
 // A failed image load clears old pixels, digest and playback instead of retaining stale art.
 const failureEntry=manifest.entries.find(entry=>entry.category==='arena');const target=base+failureEntry.src;
 await page.route(target,route=>route.fulfill({status:404,contentType:'text/plain',body:'Intentional V33 QA missing asset'}));
 await page.locator('#asset').selectOption(failureEntry.id);await page.locator('#error').filter({hasText:'PNG indisponible'}).waitFor();
 assert.equal(await canvas.getAttribute('data-loaded'),'false');assert.equal(await page.locator('#digest').innerText(),'');assert.equal(await page.locator('#play').isDisabled(),true);
 await page.unroute(target);await page.locator('#asset').selectOption(moto.id);await page.locator('#asset').selectOption(failureEntry.id);
 await page.waitForFunction(id=>{const c=document.getElementById('canvas');return c?.dataset.assetId===id&&c.dataset.loaded==='true';},failureEntry.id);
 assert.deepEqual(errors,[]);
 const result={passed:true,checkedAt:new Date().toISOString(),url,loadedAndShaVerified:manifest.entries.length,vehicleReviewDistinctFrames:8,propulsionReviewDistinctFrames:8,mobileNoOverflow:true,missingAssetClearsStaleState:true,missingAssetRecovers:true,errors};
 await fs.writeFile(output+'/browser-qa.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}finally{await browser.close();}
