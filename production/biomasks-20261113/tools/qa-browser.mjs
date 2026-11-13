/** Native mask candidate and inventory review; no raster export or game state. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
const root=fileURLToPath(new URL('../../../',import.meta.url));
const raw=await fs.readFile(path.join(root,'public/game/biomasks-20261113/manifest.json'));
const pack=JSON.parse(raw.toString('utf8'));
const output=path.join(root,'production/biomasks-20261113/qa/browser');
await fs.mkdir(output,{recursive:true});
const checks=[],errors=[],failed=[];
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH || '/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const page=await browser.newPage({viewport:{width:1440,height:1100}});
page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)failed.push({url:r.url(),status:r.status()});});page.setDefaultTimeout(15000);
async function check(name,action){try{checks.push({name,passed:true,...(await action() || {})});}catch(e){checks.push({name,passed:false,error:e.message});}}
async function visibleReady(){await page.waitForFunction(()=>[...document.querySelectorAll('#grid canvas')].filter(c=>c.getBoundingClientRect().top<innerHeight+350 && c.getBoundingClientRect().bottom>-350).every(c=>c.dataset.rendered==='true'));}
const expected=(rows,kind,priority)=>rows.filter(r=>(kind==='all'||r.inventoryCategories.includes(kind))&&(priority==='all'||(priority==='other'?!['P0','P1'].includes(r.priority):r.priority===priority))).length;
try{
 await page.goto((process.env.BIOMASK_QA_ORIGIN || 'http://127.0.0.1:8783')+'/game/biomasks-20261113/review.html',{waitUntil:'networkidle'});
 await check('Embedded manifest, 13 native candidates and 110 distinct inventory rows agree',async()=>{
  assert.deepEqual(JSON.parse(await page.locator('#pack-data').textContent()),pack);assert.equal(pack.assets.length,13);assert.equal(pack.inventory.length,110);
  assert.equal(await page.locator('#grid article').count(),13);assert.equal(await page.locator('#inventory-rows tr').count(),110);
  assert.equal(pack.canonCertified,false);assert.equal(pack.allMasksGenerated,false);return{assets:13,inventoryEntries:110};
 });
 await check('Every candidate rectangle renders transparent surroundings and opaque visible material',async()=>{
  const samples=[];
  for(const a of pack.assets){
   const canvas=page.locator('canvas[data-asset-id="'+a.id+'"]');await canvas.scrollIntoViewIfNeeded();await page.waitForFunction(id=>document.querySelector('canvas[data-asset-id="'+id+'"]')?.dataset.rendered==='true',a.id);
   const counts=await canvas.evaluate(c=>{const px=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let zero=0,solid=0;for(let i=3;i<px.length;i+=4){if(px[i]===0)zero++;if(px[i]>=240)solid++;}return{transparent:zero,solid};});
   assert.ok(counts.transparent>100&&counts.solid>100,a.id);samples.push({id:a.id,...counts});
  }
  return{rendered:samples.length,samples};
 });
 await check('Source categories and P0/P1 priorities filter both the inventory and actual candidate cards',async()=>{
  const results=[];
  for(const kind of ['canonical','original','nomask','alias','unknown','all']){
   await page.locator('#inventory-filter').selectOption(kind);
   assert.equal(await page.locator('#inventory-rows tr').count(),expected(pack.inventory,kind,'all'));
   assert.equal(await page.locator('#grid article').count(),expected(pack.assets,kind,'all'));
   if(kind==='nomask')assert.equal(await page.locator('#grid article').count(),0);
   results.push({kind,rows:await page.locator('#inventory-rows tr').count(),cards:await page.locator('#grid article').count()});
  }
  for(const priority of ['P0','P1','other','all']){
   await page.locator('#priority-filter').selectOption(priority);assert.equal(await page.locator('#inventory-rows tr').count(),expected(pack.inventory,'all',priority));assert.equal(await page.locator('#grid article').count(),expected(pack.assets,'all',priority));
  }
  return{results};
 });
 await check('Search finds mask identity, reports empty results and keeps unsupported Emissary ungenerated',async()=>{
  await page.locator('#search').fill('no-such-mask-xyz');assert.equal(await page.locator('#grid article').count(),0);assert.ok(await page.locator('#empty').isVisible());
  await page.locator('#search').fill('Emissary');assert.equal(await page.locator('#grid article').count(),0);assert.ok(await page.locator('#inventory-rows tr').count()>0);
  await page.locator('#search').fill('Ravager');assert.equal(await page.locator('#grid article').count(),1);await visibleReady();await page.screenshot({path:path.join(output,'ravager.png')});
  await page.locator('#search').fill('');
 });
 await check('Checkerboard, dark and terrain backgrounds plus alpha bounds and pivots compose the native images',async()=>{
  await page.evaluate(()=>scrollTo(0,0));
  for(const bg of ['checker','dark','game']){await page.locator('#background').selectOption(bg);assert.equal(await page.locator('body').getAttribute('data-background'),bg);}
  await page.locator('#show-bounds').check();await page.locator('#show-pivots').check();await visibleReady();await page.screenshot({path:path.join(output,'masks-terrain-pivots.png')});
  await page.locator('#show-bounds').uncheck();await page.locator('#show-pivots').uncheck();await page.locator('#background').selectOption('checker');await page.locator('#inventory-panel').evaluate(d=>d.open=false);await page.screenshot({path:path.join(output,'masks-checkerboard.png')});
 });
 await check('Keyboard details open the whole native PNG, expose provenance and restore focus',async()=>{
  const button=page.locator('#grid article').first().getByRole('button');await button.focus();await page.keyboard.press('Enter');assert.ok(await page.locator('#details').isVisible());
  await page.waitForFunction(()=>document.querySelector('#details img')?.complete&&document.querySelector('#details img').naturalWidth>0);assert.deepEqual(await page.locator('#details img').evaluate(i=>[i.naturalWidth,i.naturalHeight]),[1254,1254]);
  assert.ok((await page.locator('#detail-body').textContent()).includes('SHA'));await page.screenshot({path:path.join(output,'mask-provenance.png')});await page.keyboard.press('Escape');assert.ok(await button.evaluate(b=>b===document.activeElement));
 });
 await check('320 and 390 pixel screens contain controls, mask details and the scrollable inventory',async()=>{
  for(const width of [320,390]){
   await page.setViewportSize({width,height:844});await page.locator('#search').fill('Ravager');await visibleReady();await page.evaluate(()=>scrollTo(0,0));
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'page overflow at '+width);
   const button=page.locator('#grid article').first().getByRole('button');await button.click();assert.ok(await page.locator('#details').evaluate(d=>d.getBoundingClientRect().left>=0&&d.getBoundingClientRect().right<=innerWidth));await page.keyboard.press('Escape');
   await page.locator('#inventory-panel').evaluate(d=>d.open=true);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'inventory page overflow at '+width);await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:path.join(output,'mobile-'+width+'.png'),fullPage:true});
  }
 });
 await check('No page exception, missing image or game storage write',async()=>{assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);assert.equal((await page.evaluate(()=>window.__P0_SPRITE_REVIEW__.getStats())).errors,0);assert.deepEqual(await page.evaluate(()=>({local:localStorage.length,session:sessionStorage.length})),{local:0,session:0});});
}finally{
 const report={scope:'Mask candidate gallery and source inventory only; no canonical fidelity, human art, runtime or animation certification',manifestSha256:createHash('sha256').update(raw).digest('hex'),browser:browser.version(),counts:pack.counts,passed:checks.length===8&&checks.every(c=>c.passed),checks,errors,failedRequests:failed};
 await fs.writeFile(path.join(output,'verification.json'),JSON.stringify(report,null,2)+'\n');await browser.close();console.log(JSON.stringify({passed:report.passed,checks:checks.map(c=>({name:c.name,passed:c.passed,error:c.error})),output},null,2));if(!report.passed)process.exitCode=1;
}
