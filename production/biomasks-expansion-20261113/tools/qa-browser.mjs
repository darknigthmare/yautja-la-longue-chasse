#!/usr/bin/env node
/** Native files stay untouched: browser transforms and screenshots are review evidence only. */
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
const namespace='biomasks-expansion-20261113';
const publicRoot=path.join(root,'public');
const manifestRaw=await fs.readFile(path.join(publicRoot,'game',namespace,'manifest.json'));
const pack=JSON.parse(manifestRaw.toString('utf8'));
const output=process.env.MASK_EXPANSION_QA_OUTPUT||path.join(root,'production',namespace,'qa/browser');
await fs.mkdir(output,{recursive:true});
const checks=[],errors=[],failedRequests=[];
let server=null,origin=process.env.MASK_EXPANSION_QA_ORIGIN;
if(!origin){
 server=http.createServer(async(req,res)=>{
  try{
   const requested=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
   const file=path.resolve(publicRoot,'.'+requested);
   if(!file.startsWith(publicRoot+path.sep)){res.writeHead(403);res.end();return;}
   const data=await fs.readFile(file);
   const type={'.html':'text/html; charset=utf-8','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml'}[path.extname(file)]||'application/octet-stream';
   res.writeHead(200,{'Content-Type':type,'Cache-Control':'no-store'});res.end(data);
  }catch{res.writeHead(404);res.end();}
 });
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
 origin='http://127.0.0.1:'+server.address().port;
}
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const page=await browser.newPage({viewport:{width:1440,height:1120}});
page.setDefaultTimeout(20000);
page.on('pageerror',e=>errors.push(e.message));
page.on('response',r=>{if(r.status()>=400)failedRequests.push({url:r.url(),status:r.status()});});
async function check(name,action){try{checks.push({name,passed:true,...(await action()||{})});}catch(error){checks.push({name,passed:false,error:error.message});}}
async function ready(){
 await page.waitForFunction(()=>{
  const stats=window.__MASK_EXPANSION_REVIEW__?.getStats(),images=[...document.querySelectorAll('#grid img')];
  return stats&&stats.renderedPairs>0&&images.length===stats.renderedPairs*2&&images.every(i=>i.complete&&i.naturalWidth>0);
 });
 await page.locator('#grid img').evaluateAll(images=>Promise.all(images.map(image=>image.decode())));
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
}
async function identity(id){await page.locator('#identity-filter').selectOption(id);await ready();}
try{
 await page.goto(origin+'/game/'+namespace+'/review.html',{waitUntil:'networkidle'});await ready();
 await check('Manifest separates exact community references, generated A/B, source photographs and46 still-open canonical targets',async()=>{
  assert.deepEqual(JSON.parse(await page.locator('#pack-data').textContent()),pack);
  assert.equal(pack.pairs.length,pack.counts.sourceDesignRecords);assert.equal(pack.counts.completeCandidatePairs,pack.pairs.length);
  assert.equal(pack.counts.versionACopies,9);assert.equal(pack.counts.communitySourceRecords,9);
  assert.equal(pack.counts.newAGenerations,pack.pairs.filter(p=>p.versionA.newImageGeneration).length);
  assert.equal(pack.counts.newBGenerations,pack.pairs.length);assert.equal(pack.counts.newImageGenPngs,pack.counts.newAGenerations+pack.counts.newBGenerations);
  assert.equal(pack.counts.byteCompleteComparisons,20);assert.equal(pack.counts.reviewedWithoutMajorDeviationPairs,19);assert.equal(pack.counts.provisionalReviewOnlyPairs,1);assert.equal(pack.counts.provisionalImageGenPngs,1);
  assert.equal(pack.remainingCanonicalTargets.length,46);assert.equal(pack.counts.newlyCertifiedCanonicalNames,0);
  for(const p of pack.pairs){assert.equal(p.canonCertified,false);assert.equal(p.humanArtValidated,false);assert.equal(p.runtimeIntegrated,false);assert.equal(p.versionB.newImageGeneration,true);assert.notEqual(p.versionA.sha256,p.versionB.sha256);}
  assert.equal(await page.locator('#remaining-rows tr').count(),46);assert.equal(pack.allMasksGenerated,false);assert.equal(pack.allP0Closed,false);
  return{pairs:pack.pairs.length,newA:pack.counts.newAGenerations,newB:pack.counts.newBGenerations,exactA:9,remainingCanonicalNames:46};
 });
 await check('All A/B images decode at native dimensions, match HTTP SHA and preserve their declared alpha semantics',async()=>{
  const visited=new Set(),samples=[];const pages=Math.ceil(pack.pairs.length/8);
  for(let n=0;n<pages;n++){
   await ready();const ids=await page.evaluate(()=>window.__MASK_EXPANSION_REVIEW__.getCurrentPairIds());
   for(const id of ids){assert.ok(!visited.has(id));visited.add(id);const pair=pack.pairs.find(p=>p.id===id);
    for(const version of ['A','B']){
     const asset=pair['version'+version],img=page.locator('#grid img[data-asset-id="'+id+'"][data-version="'+version+'"]');
     assert.deepEqual(await img.evaluate(i=>[i.naturalWidth,i.naturalHeight]),[asset.width,asset.height]);
     const response=await page.request.get(origin+asset.url);assert.ok(response.ok());assert.equal(createHash('sha256').update(await response.body()).digest('hex'),asset.sha256);
     if(asset.byteExactSourceCopy){const source=await fs.readFile(path.join(root,asset.originalSource.path));assert.equal(createHash('sha256').update(source).digest('hex'),asset.sha256);}
     const alpha=await img.evaluate(i=>{const c=document.createElement('canvas');c.width=i.naturalWidth;c.height=i.naturalHeight;const x=c.getContext('2d',{willReadFrequently:true});x.drawImage(i,0,0);const d=x.getImageData(0,0,c.width,c.height).data;let transparent=0,solid=0;for(let k=3;k<d.length;k+=4){if(d[k]===0)transparent++;if(d[k]>=240)solid++;}c.width=0;c.height=0;return{transparent,solid};});
     if(asset.newImageGeneration)assert.ok(alpha.transparent>0&&alpha.solid>0,id+' '+version);else assert.equal(alpha.transparent,0,'RGB community capture remains opaque');samples.push({id,version,...alpha});
    }
   }
   if(n<pages-1)await page.locator('#next').click();
  }
  assert.equal(visited.size,pack.pairs.length);assert.ok(await page.locator('#next').isDisabled());return{representationsDecoded:samples.length,samples};
 });
 await check('Family filters, every identity and variant-to-prior-base table remain consistent',async()=>{
  for(const family of [...new Set(pack.pairs.map(p=>p.originGroup))]){await page.locator('#family-filter').selectOption(family);await ready();const ids=await page.evaluate(()=>window.__MASK_EXPANSION_REVIEW__.getCurrentPairIds());assert.ok(ids.every(id=>pack.pairs.find(p=>p.id===id).originGroup===family));}
  for(const p of pack.pairs){await identity(p.id);assert.equal(await page.locator('#grid article').count(),1);assert.equal(await page.locator('#grid article').getAttribute('data-pair-id'),p.id);}
  assert.equal(await page.locator('#variant-rows tr').count(),pack.pairs.filter(p=>p.baseAlreadyRepresented).length);assert.equal(pack.pairs.filter(p=>p.baseAlreadyRepresented).length,2);
  await identity('all');
 });
 await check('96/360px visible-mask and complete-A modes change CSS framing without changing native files or B scale',async()=>{
  await identity('predator_12');await page.locator('#show-bounds').check();
  for(const size of ['96','360']){
   await page.locator('#image-size').fill(size);await page.locator('#image-size').dispatchEvent('input');await ready();
   const records=await page.locator('#grid .frame').evaluateAll(frames=>frames.map(f=>{const b=f.querySelector('.bounds').getBoundingClientRect(),r=f.getBoundingClientRect(),i=f.querySelector('img');return{scale:Number(f.dataset.displayScale),native:[i.naturalWidth,i.naturalHeight],inside:b.left>=r.left-1&&b.right<=r.right+1&&b.top>=r.top-1&&b.bottom<=r.bottom+1};}));
   assert.ok(records.every(r=>r.inside));assert.deepEqual(records[0].native,[256,257]);assert.ok(records[0].scale>records[1].scale);
  }
  await page.screenshot({path:path.join(output,'community-visible-mask-bounds.png')});
  const before=await page.locator('#grid .frame[data-version="B"]').getAttribute('data-display-scale');await page.locator('#source-framing').selectOption('full');
  assert.equal(await page.locator('#grid .frame[data-version="A"]').getAttribute('data-framing'),'full');assert.equal(await page.locator('#grid .frame[data-version="B"]').getAttribute('data-display-scale'),before);
  await page.screenshot({path:path.join(output,'community-complete-reference.png')});await page.locator('#source-framing').selectOption('mask');
  for(const background of ['dark','light','terrain','checker']){await page.locator('#background').selectOption(background);assert.equal(await page.locator('body').getAttribute('data-background'),background);}
  await page.locator('#show-bounds').uncheck();await identity('all');await page.screenshot({path:path.join(output,'paginated-comparison.png')});
 });
 await check('Keyboard drawer preserves source qualifications, native R photographs and Escape focus return',async()=>{
  const p=pack.pairs.find(p=>p.referenceImages.length);assert.ok(p);await identity(p.id);const button=page.locator('button[data-details="'+p.id+'"]');await button.focus();await page.keyboard.press('Enter');assert.ok(await page.locator('#details').isVisible());
  await page.waitForFunction(()=>[...document.querySelectorAll('#detail-body img')].every(i=>i.complete&&i.naturalWidth>0));await page.locator('#detail-body img').evaluateAll(images=>Promise.all(images.map(i=>i.decode())));
  assert.ok((await page.locator('#detail-body').textContent()).includes('Non certifié / non validé / non intégré'));
  for(const r of p.referenceImages){const response=await page.request.get(origin+r.url);assert.ok(response.ok());assert.equal(createHash('sha256').update(await response.body()).digest('hex'),r.sha256);assert.equal(createHash('sha256').update(await fs.readFile(path.join(root,r.originalSource.path))).digest('hex'),r.sha256);}
  assert.equal(await page.locator('#detail-body img[data-version="R"]').count(),p.referenceImages.length);await page.screenshot({path:path.join(output,'prototype-source-drawer.png')});
  await page.keyboard.press('Escape');assert.ok(await button.evaluate(b=>b===document.activeElement));
 });
 await check('Prototype, edition and secondary-source limitations remain visible and the46 old names stay open',async()=>{
  for(const p of pack.pairs){await identity(p.id);assert.ok((await page.locator('#grid article').textContent()).includes(p.scopeLabel));}
  const kwei=pack.pairs.find(p=>p.id==='neca-kwei-prototype');assert.ok(kwei);assert.equal(kwei.sourceClass,'official-photo-prototype');assert.equal(kwei.versionA.renderMode,'imagegen');assert.ok(kwei.limitations.some(t=>t.includes('mk-48-kwei')));
  const nightstorm=pack.pairs.find(p=>p.id==='neca-nightstorm-series-10');assert.ok(nightstorm);assert.equal(nightstorm.partialReferenceView,true);assert.equal(nightstorm.representationScope,'partial-visible-rigid-mask');assert.ok(nightstorm.scopeLabel.includes('partiel'));assert.ok(nightstorm.limitations.some(t=>t.includes('biologique')));
  const vapor=pack.pairs.find(p=>p.id==='predator_17');assert.equal(vapor.provisionalReviewOnly,true);assert.equal(vapor.versionB.productionReady,false);assert.equal(vapor.versionB.geometryDeviationOpen,true);assert.equal(vapor.versionB.rejectedForFaithfulRelease,true);await identity(vapor.id);assert.ok((await page.locator('#grid .provisional-alert').textContent()).includes('refusé pour une version fidèle'));await page.screenshot({path:path.join(output,'vapor-provisional-comparison.png')});await page.locator('button[data-details="predator_17"]').click();assert.ok((await page.locator('#detail-body .provisional-alert').textContent()).includes('réserve majeure ouverte'));await page.keyboard.press('Escape');
  await identity(kwei.id);await page.screenshot({path:path.join(output,'kwei-prototype-pair.png')});await page.locator('#remaining-panel').evaluate(d=>d.open=true);assert.equal(await page.locator('#remaining-rows tr:visible').count(),46);await page.locator('#remaining-panel').evaluate(d=>d.open=false);
 });
 await check('320/390px controls, cards, source photographs, drawer and expanded tables stay within the viewport',async()=>{
  for(const width of [320,390]){
   await page.setViewportSize({width,height:844});await identity('all');assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'card overflow '+width);
   await page.locator('#remaining-panel').evaluate(d=>d.open=true);await page.locator('#variant-panel').evaluate(d=>d.open=true);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'table overflow '+width);await page.locator('#remaining-panel').evaluate(d=>d.open=false);await page.locator('#variant-panel').evaluate(d=>d.open=false);
   await identity('neca-kwei-prototype');await page.locator('button[data-details="neca-kwei-prototype"]').click();assert.ok(await page.locator('#details').evaluate(d=>d.getBoundingClientRect().left>=0&&d.getBoundingClientRect().right<=innerWidth));await page.keyboard.press('Escape');await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:path.join(output,'mobile-'+width+'-prototype.png'),fullPage:true});
  }
 });
 await check('No missing files, JS errors, external image requests or game-storage writes occur',async()=>{
  assert.deepEqual(errors,[]);assert.deepEqual(failedRequests,[]);assert.equal(await page.evaluate(()=>window.__MASK_EXPANSION_REVIEW__.getStats().errors),0);assert.deepEqual(await page.evaluate(()=>({local:localStorage.length,session:sessionStorage.length})),{local:0,session:0});assert.deepEqual(await page.locator('img').evaluateAll(images=>images.filter(i=>new URL(i.src).origin!==location.origin).map(i=>i.src)),[]);assert.ok(!(await page.locator('body').textContent()).includes('[object Object]'));
 });
}finally{
 const report={scope:'Static source-qualified review gallery; not canonical, human-art, runtime or animation validation',manifestSha256:createHash('sha256').update(manifestRaw).digest('hex'),browser:browser.version(),counts:pack.counts,passed:checks.length===8&&checks.every(c=>c.passed),checks,errors,failedRequests};await fs.writeFile(path.join(output,'verification.json'),JSON.stringify(report,null,2)+'\n');await browser.close();if(server)await new Promise(resolve=>server.close(resolve));console.log(JSON.stringify({passed:report.passed,checks:checks.map(c=>({name:c.name,passed:c.passed,error:c.error})),output},null,2));if(!report.passed)process.exitCode=1;
}
