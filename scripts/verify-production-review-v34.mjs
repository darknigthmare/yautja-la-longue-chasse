import { chromium } from 'playwright-core';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const base=process.env.V34_QA_URL||'http://localhost:4173';
const url=base+'/game/assets/v34/production-review/index.html';
const output=process.env.V34_REVIEW_QA_OUTPUT||'work/v34/review-qa';await fs.mkdir(output,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});const errors=[];
try{
 const page=await browser.newPage({viewport:{width:1280,height:900}});page.on('pageerror',error=>errors.push(error.message));
 await page.addInitScript(() => {
  const original = CanvasRenderingContext2D.prototype.drawImage;
  CanvasRenderingContext2D.prototype.drawImage = function (...args) {
    if (this.canvas.id === 'canvas' && args.length === 9) window.__v34Draw = args.slice(5);
    return original.apply(this,args);
  };
 });
 await page.goto(url,{waitUntil:'networkidle'});
 const manifest=await (await page.request.get(base+'/game/assets/v34/production-review/manifest.json')).json();
 assert(manifest.entries.length>=35);const canvas=page.locator('#canvas');
 for(const entry of manifest.entries){
  await page.locator('#asset').selectOption(entry.id);
  await page.waitForFunction(id=>{const c=document.getElementById('canvas');return c?.dataset.assetId===id&&c.dataset.loaded==='true';},entry.id);
  assert.equal(await page.locator('#error').innerText(),'');
  assert((await page.locator('#digest').innerText()).includes(entry.sha256));
  if(entry.status==='rejected')assert.equal(await page.locator('#play').isDisabled(),true);
 }
 const newVehicleChecks=[];
 for(const entry of manifest.entries.filter(item=>item.category==='vehicle'&&item.id.startsWith('v34-')&&item.frames.length>=4&&item.status!=='rejected')){
  await page.locator('#asset').selectOption(entry.id);await page.waitForFunction(id=>document.getElementById('canvas')?.dataset.assetId===id,entry.id);
  await page.locator('#view').selectOption('frames');const screenshots=[];
  for(const facing of [...new Set(entry.frames.map(frame=>frame.facing))]){
   await page.locator('#facing').selectOption(facing);const count=entry.frames.filter(frame=>frame.facing===facing).length;
   for(let index=0;index<count;index++){
    assert.equal(await canvas.getAttribute('data-frame'),String(index));
    const bounds=await page.evaluate(()=>window.__v34Draw);assert(bounds&&bounds.length===4);
    const[x,y,w,h]=bounds;assert(x>=23.9&&y>=23.9&&x+w<=1176.1&&y+h<=776.1,'Review clips image: '+entry.id);
    screenshots.push(await canvas.screenshot());await page.locator('#next').click();
   }
  }
  assert.equal(new Set(screenshots.map(buffer=>buffer.toString('base64'))).size,entry.frames.length,'Repeated review pose: '+entry.id);
  await page.screenshot({path:output+'/'+entry.id+'.png',fullPage:true});
  newVehicleChecks.push({id:entry.id,distinctReviewFrames:screenshots.length,pivotFramingInsideCanvas:true,acceptedRuntimeClip:false});
 }
 await page.locator('#search').fill('this-asset-does-not-exist-v34');
 await page.waitForFunction(()=>document.getElementById('asset').options.length===0);
 assert.equal(await canvas.getAttribute('data-loaded'),'false');assert.equal(await page.locator('#digest').innerText(),'');assert.equal(await page.locator('#source').getAttribute('href'),null);
 await page.locator('#search').fill('blade-fighter');
 assert((await page.locator('#asset option').count())>0);
 assert(await page.locator('#asset option').evaluateAll(options=>options.every(option=>option.value.includes('blade-fighter'))));
 await page.locator('#status-filter').selectOption('rejected');
 const rejectedIds=await page.locator('#asset option').evaluateAll(options=>options.map(option=>option.value));
 assert(rejectedIds.length>0&&rejectedIds.every(id=>manifest.entries.find(entry=>entry.id===id)?.status==='rejected'));
 await page.locator('#search').fill('');await page.locator('#status-filter').selectOption('all');
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
 const result={passed:true,checkedAt:new Date().toISOString(),url,loadedAndShaVerified:manifest.entries.length,vehicleReviewDistinctFrames:8,propulsionReviewDistinctFrames:8,newVehicleChecks,searchAndStatusFilters:true,emptySearchClearsStaleState:true,mobileNoOverflow:true,missingAssetClearsStaleState:true,missingAssetRecovers:true,errors};
 await fs.writeFile(output+'/browser-qa.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}finally{await browser.close();}
