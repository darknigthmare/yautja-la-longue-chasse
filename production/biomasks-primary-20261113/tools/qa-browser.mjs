#!/usr/bin/env node
/** Exercise only this static review gallery; never write game state or image pixels. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';

const root=fileURLToPath(new URL('../../../',import.meta.url));
const require=createRequire(path.join(root,'package.json'));
const {chromium}=require('playwright-core');
const prefix='biomasks-primary-20261113';
const publicRoot=path.join(root,'public');
const raw=await fs.readFile(path.join(publicRoot,'game',prefix,'manifest.json'));
const pack=JSON.parse(raw.toString('utf8'));
const output=process.env.PRIMARY_MASK_QA_OUTPUT||path.join(root,'production',prefix,'qa/browser');
await fs.mkdir(output,{recursive:true});
const checks=[],errors=[],failed=[];
let server=null;
let origin=process.env.PRIMARY_MASK_QA_ORIGIN;
if(!origin){
 server=http.createServer(async(req,res)=>{
  try{
   const requested=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
   const file=path.resolve(publicRoot,'.'+requested);
   if(!file.startsWith(publicRoot+path.sep)){res.writeHead(403);res.end();return;}
   const data=await fs.readFile(file);
   const type={'.html':'text/html; charset=utf-8','.json':'application/json','.png':'image/png','.svg':'image/svg+xml'}[path.extname(file)]||'application/octet-stream';
   res.writeHead(200,{'Content-Type':type,'Cache-Control':'no-store'});res.end(data);
  }catch{res.writeHead(404);res.end();}
 });
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
 origin='http://127.0.0.1:'+server.address().port;
}
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const page=await browser.newPage({viewport:{width:1440,height:1120}});
page.setDefaultTimeout(15000);
page.on('pageerror',e=>errors.push(e.message));
page.on('response',r=>{if(r.status()>=400)failed.push({url:r.url(),status:r.status()});});
async function check(name,action){try{checks.push({name,passed:true,...(await action()||{})});}catch(error){checks.push({name,passed:false,error:error.message});}}
async function ready(){await page.waitForFunction(()=>{const images=[...document.querySelectorAll('#grid img')];return images.length>0&&images.every(i=>i.complete&&i.naturalWidth>0);});}
try{
 await page.goto(origin+'/game/'+prefix+'/review.html',{waitUntil:'networkidle'});
 await ready();
 await check('Embedded manifest and seven candidates preserve the remaining scope',async()=>{
  assert.deepEqual(JSON.parse(await page.locator('#pack-data').textContent()),pack);
  assert.deepEqual(pack.assets.map(a=>a.id).sort(),['captured','cleopatra','emissary','exiled','samurai','valkyrie','viking']);
  assert.equal(pack.counts.nativeFiles,7);assert.equal(pack.counts.newNamedTargets,4);assert.equal(pack.counts.improvedExistingNamedTargets,3);assert.equal(pack.remainingTargets.length,46);
  assert.equal(await page.locator('#grid article').count(),7);assert.equal(await page.locator('#remaining-rows tr').count(),46);
  assert.ok((await page.locator('#summary').textContent()).includes('46'));
  const partial=pack.assets.find(a=>a.id==='emissary');assert.equal(partial.partialReferenceView,true);assert.ok(partial.incompleteSourceElements.length>0);
  assert.deepEqual(pack.assets.filter(a=>a.partialReferenceView).map(a=>a.id),['emissary']);
  assert.ok((await page.locator('article[data-asset-id="emissary"] .partial-reference').textContent()).includes('silhouette complète'));
  return{candidateViews:7,newNamedTargets:4,improvedExistingNamedTargets:3,remainingNamedTargets:46,partialReferenceView:'emissary'};
 });
 await check('HTTP bytes, decoded dimensions and real alpha agree with each native candidate',async()=>{
  const samples=[];
  for(const asset of pack.assets){
   const url=asset.url||'/'+asset.path.replace(/^public\//,'');
   const response=await page.request.get(origin+url);assert.ok(response.ok());
   const bytes=await response.body();assert.equal(createHash('sha256').update(bytes).digest('hex'),asset.sha256);
   const image=page.locator('#grid img[data-asset-id="'+asset.id+'"]');
   assert.deepEqual(await image.evaluate(i=>[i.naturalWidth,i.naturalHeight]),[asset.width,asset.height]);
   const alpha=await image.evaluate(i=>{const c=document.createElement('canvas');c.width=i.naturalWidth;c.height=i.naturalHeight;const context=c.getContext('2d',{willReadFrequently:true});context.drawImage(i,0,0);const p=context.getImageData(0,0,c.width,c.height).data;let transparent=0,solid=0;for(let n=3;n<p.length;n+=4){if(p[n]===0)transparent++;if(p[n]>=240)solid++;}return{transparent,solid};});
   assert.ok(alpha.transparent>100&&alpha.solid>100,asset.id);samples.push({id:asset.id,...alpha});
  }
  return{samples};
 });
 await check('Every identity filters its actual new candidate and any previous candidate',async()=>{
  for(const asset of pack.assets){await page.locator('#mask-filter').selectOption(asset.id);await ready();assert.equal(await page.locator('#grid article').count(),1);assert.equal(await page.locator('#grid article').getAttribute('data-asset-id'),asset.id);assert.equal(await page.locator('#grid img').count(),asset.previousCandidate?2:1);}
  await page.locator('#mask-filter').selectOption('all');await ready();
 });
 await check('Display backgrounds, alpha bounds, pivots and size remain independent of native files',async()=>{
  for(const value of ['dark','terrain','checker']){await page.locator('#background').selectOption(value);assert.equal(await page.locator('body').getAttribute('data-background'),value);}
  await page.locator('#show-bounds').check();await page.locator('#show-pivots').check();
  assert.equal(await page.locator('.bounds:visible').count(),7);assert.equal(await page.locator('.pivot').evaluateAll(lines=>lines.filter(line=>getComputedStyle(line).display!=='none').length),14);
  await page.locator('#image-size').fill('240');await page.locator('#image-size').dispatchEvent('input');assert.equal(await page.locator('#image-size-value').textContent(),'240 px max.');
  await page.locator('#background').selectOption('terrain');await page.screenshot({path:path.join(output,'colored-mask-bounds-pivots.png')});
  await page.locator('#show-bounds').uncheck();await page.locator('#show-pivots').uncheck();await page.locator('#image-size').fill('360');await page.locator('#image-size').dispatchEvent('input');await page.locator('#background').selectOption('checker');await page.screenshot({path:path.join(output,'colored-mask-comparison.png')});
 });
 await check('Keyboard opens official source details and Escape restores focus',async()=>{
  const button=page.locator('button[data-details="samurai"]');await button.focus();await page.keyboard.press('Enter');assert.ok(await page.locator('#details').isVisible());
  await page.waitForFunction(()=>document.querySelector('[data-detail-native]')?.complete&&document.querySelector('[data-detail-native]').naturalWidth>0);
  assert.ok((await page.locator('#detail-body').textContent()).includes('SHA256'));
  assert.equal(await page.locator('#detail-body .source-reference').count(),pack.assets.find(a=>a.id==='samurai').references.length);
  for(const a of await page.locator('#detail-body .source-reference>a').all())assert.ok((await a.getAttribute('href')).startsWith('https://'));
  await page.screenshot({path:path.join(output,'official-source-drawer.png')});await page.keyboard.press('Escape');assert.ok(await button.evaluate(b=>b===document.activeElement));
 });
 await check('Remaining identities are visible without claiming an exact PNG total',async()=>{
  await page.locator('#remaining-panel summary').click();assert.equal(await page.locator('#remaining-rows tr:visible').count(),46);
  assert.ok((await page.locator('#remaining-panel').textContent()).includes('indéterminé'));await page.locator('#remaining-panel summary').click();
 });
 await check('320 and 390 pixel screens contain all cards, controls, drawer and table',async()=>{
  for(const width of [320,390]){
   await page.setViewportSize({width,height:844});await ready();await page.evaluate(()=>scrollTo(0,0));assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'overflow '+width);
   const button=page.locator('button[data-details="viking"]');await button.click();assert.ok(await page.locator('#details').evaluate(d=>d.getBoundingClientRect().left>=0&&d.getBoundingClientRect().right<=innerWidth));await page.keyboard.press('Escape');
   await page.locator('#remaining-panel').evaluate(d=>d.open=true);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'table overflow '+width);await page.locator('#remaining-panel').evaluate(d=>d.open=false);await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:path.join(output,'mobile-'+width+'.png'),fullPage:true});
  }
 });
 await check('No missing files, JavaScript exception, external image fetch or game storage write',async()=>{
  assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);assert.equal((await page.evaluate(()=>window.__PRIMARY_MASK_REVIEW__.getStats())).errors,0);
  assert.deepEqual(await page.evaluate(()=>({local:localStorage.length,session:sessionStorage.length})),{local:0,session:0});
  assert.deepEqual(await page.locator('img').evaluateAll(images=>images.filter(i=>new URL(i.src).origin!==location.origin).map(i=>i.src)),[]);
 });
}finally{
 const report={scope:'Static source-view candidate gallery only; not canonical fidelity, human art, runtime or animation certification',manifestSha256:createHash('sha256').update(raw).digest('hex'),browser:browser.version(),counts:pack.counts,passed:checks.length===8&&checks.every(c=>c.passed),checks,errors,failedRequests:failed};
 await fs.writeFile(path.join(output,'verification.json'),JSON.stringify(report,null,2)+'\n');await browser.close();if(server)await new Promise(resolve=>server.close(resolve));
 console.log(JSON.stringify({passed:report.passed,checks:checks.map(c=>({name:c.name,passed:c.passed,error:c.error})),output},null,2));if(!report.passed)process.exitCode=1;
}
