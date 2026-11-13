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
const namespace='biomasks-dual-20261113';
const publicRoot=path.join(root,'public');
const manifestRaw=await fs.readFile(path.join(publicRoot,'game',namespace,'manifest.json'));
const pack=JSON.parse(manifestRaw.toString('utf8'));
const output=process.env.DUAL_MASK_QA_OUTPUT||path.join(root,'production',namespace,'qa/browser');
await fs.mkdir(output,{recursive:true});
const checks=[],errors=[],failedRequests=[];
let server=null,origin=process.env.DUAL_MASK_QA_ORIGIN;
if(!origin){
 server=http.createServer(async(req,res)=>{
  try{
   const requested=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
   const file=path.resolve(publicRoot,'.'+requested);
   if(!file.startsWith(publicRoot+path.sep)){res.writeHead(403);res.end();return;}
   const data=await fs.readFile(file);
   const type={'.html':'text/html; charset=utf-8','.json':'application/json','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml'}[path.extname(file)]||'application/octet-stream';
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
  const stats=window.__DUAL_MASK_REVIEW__?.getStats(),images=[...document.querySelectorAll('#grid img')];
  return stats&&stats.renderedPairs>0&&images.length===stats.renderedPairs*2&&images.every(i=>i.complete&&i.naturalWidth>0);
 });
 await page.locator('#grid img').evaluateAll(images=>Promise.all(images.map(image=>image.decode())));
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
}
async function identity(id){await page.locator('#identity-filter').selectOption(id);await ready();}
try{
 await page.goto(origin+'/game/'+namespace+'/review.html',{waitUntil:'networkidle'});await ready();
 await check('Embedded manifest separates original A copies, B generations, aliases and remaining identities',async()=>{
  assert.deepEqual(JSON.parse(await page.locator('#pack-data').textContent()),pack);
  assert.equal(pack.pairs.length,46);assert.equal(pack.counts.versionACopies,46);assert.equal(pack.counts.newImageGenPngs+pack.counts.reusedBRepresentations,46);assert.equal(pack.counts.completeCandidatePairs,46);
  assert.equal(pack.pairs.filter(p=>p.versionB.newImageGeneration).length,pack.counts.newImageGenPngs);
  for(const pair of pack.pairs.filter(p=>!p.versionB.newImageGeneration)){assert.equal(pair.versionB.mode,'source-reuse');assert.equal(pair.versionA.sha256,pair.versionB.sha256);assert.ok(pair.versionB.reuseReason);}
  assert.equal(pack.aliases.length,13);assert.equal(pack.remainingCanonicalTargets.length,46);assert.equal(pack.originalTrophiesWithoutSource.length,2);
  assert.equal(pack.counts.newlyCoveredCanonicalNames,0);assert.equal(pack.allP0Closed,false);assert.equal(pack.canonCertified,false);assert.equal(pack.humanArtValidated,false);
  assert.equal(await page.locator('#remaining-rows tr').count(),46);assert.equal(await page.locator('#alias-rows tr').count(),13);
  assert.ok((await page.locator('#remaining-panel').textContent()).includes('indéterminé'));
  return{availableSourceRecords:46,candidatePairs:46,reusedA:46,newB:pack.counts.newImageGenPngs,reusedB:pack.counts.reusedBRepresentations,aliases:13,remainingCanonicalNames:46,unreferencedOriginalTrophies:2};
 });
 await check('All paginated images decode with native dimensions, genuine alpha and exact HTTP byte pins',async()=>{
  const visited=new Set(),samples=[];
  for(let n=0;n<4;n++){
   await ready();const ids=await page.evaluate(()=>window.__DUAL_MASK_REVIEW__.getCurrentPairIds());
   for(const id of ids){
    assert.ok(!visited.has(id));visited.add(id);const pair=pack.pairs.find(p=>p.id===id);
    for(const version of ['A','B']){
     const asset=pair['version'+version],image=page.locator('#grid img[data-asset-id="'+id+'"][data-version="'+version+'"]');
     assert.deepEqual(await image.evaluate(i=>[i.naturalWidth,i.naturalHeight]),[asset.width,asset.height]);
     const response=await page.request.get(origin+asset.url);assert.ok(response.ok());
     const bytes=await response.body();assert.equal(createHash('sha256').update(bytes).digest('hex'),asset.sha256);
     if(version==='A'){
      const original=await page.request.get(origin+'/'+asset.originalSource.path.replace(/^public\//,''));assert.ok(original.ok());
      assert.equal(createHash('sha256').update(await original.body()).digest('hex'),asset.sha256);
     }
     const alpha=await image.evaluate(i=>{const c=document.createElement('canvas');c.width=i.naturalWidth;c.height=i.naturalHeight;const ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(i,0,0);const pixels=ctx.getImageData(0,0,c.width,c.height).data;let transparent=0,solid=0;for(let k=3;k<pixels.length;k+=4){if(pixels[k]===0)transparent++;if(pixels[k]>=240)solid++;}c.width=0;c.height=0;return{transparent,solid};});
     assert.ok(alpha.transparent>0&&alpha.solid>0,id+' '+version);samples.push({id,version,...alpha});
    }
   }
   if(n<3)await page.locator('#next').click();
  }
  assert.equal(visited.size,46);assert.ok(await page.locator('#next').isDisabled());
  return{pairsVisited:visited.size,representationsDecoded:samples.length,samples};
 });
 await check('Family, every identity and all aliases select their actual existing A/B pair',async()=>{
  const families=[...new Set(pack.pairs.map(p=>p.originGroup))];
  for(const family of families){await page.locator('#family-filter').selectOption(family);await ready();const ids=await page.evaluate(()=>window.__DUAL_MASK_REVIEW__.getCurrentPairIds());assert.ok(ids.every(id=>pack.pairs.find(p=>p.id===id).originGroup===family));}
  for(const pair of pack.pairs){await identity(pair.id);assert.equal(await page.locator('#grid article').count(),1);assert.equal(await page.locator('#grid article').getAttribute('data-pair-id'),pair.id);}
  for(const alias of pack.aliases){await identity('alias:'+alias.id);assert.equal(await page.locator('#grid article').getAttribute('data-pair-id'),alias.pairId);assert.equal(await page.locator('#grid img').count(),2);assert.ok(await page.locator('#alias-notice').isVisible());}
  await identity('all');
  return{families:families.length,identities:46,aliases:13};
 });
 await check('Visible alpha-bounds scale normalizes tiny A sources with B using CSS only',async()=>{
  const tiny=pack.pairs.find(p=>p.versionA.height===384&&p.id.startsWith('concept-'));
  assert.ok(tiny);await identity(tiny.id);
  await page.locator('#show-bounds').check();
  for(const size of ['96','360']){
   await page.locator('#image-size').fill(size);await page.locator('#image-size').dispatchEvent('input');await ready();
   const records=await page.locator('#grid .frame').evaluateAll(frames=>frames.map(f=>{const b=f.querySelector('.bounds').getBoundingClientRect(),r=f.getBoundingClientRect(),i=f.querySelector('img');return{scale:Number(f.dataset.displayScale),native:[i.naturalWidth,i.naturalHeight],boundsInside:b.left>=r.left-1&&b.right<=r.right+1&&b.top>=r.top-1&&b.bottom<=r.bottom+1,bounds:[b.width,b.height],frame:[r.width,r.height]};}));
   assert.equal(records.length,2);assert.ok(records.every(r=>r.boundsInside));assert.ok(records[0].scale>records[1].scale);
   assert.deepEqual(records[0].native,[tiny.versionA.width,tiny.versionA.height]);
  }
  for(const value of ['dark','light','terrain','checker']){await page.locator('#background').selectOption(value);assert.equal(await page.locator('body').getAttribute('data-background'),value);}
  await page.locator('#show-bounds').check();await page.locator('#show-pivots').check();assert.equal(await page.locator('#grid .bounds:visible').count(),2);
  await page.screenshot({path:path.join(output,'tiny-original-visible-bounds.png')});
  await page.locator('#show-bounds').uncheck();await page.locator('#show-pivots').uncheck();await identity('mk-01-jungle');await page.screenshot({path:path.join(output,'jungle-original-phg-comparison.png')});
  await identity('all');await page.screenshot({path:path.join(output,'paginated-original-phg-comparison.png')});
 });
 await check('Keyboard opens source details and Escape restores focus without changing data',async()=>{
  await identity('mk-01-jungle');const button=page.locator('button[data-details="mk-01-jungle"]');await button.focus();await page.keyboard.press('Enter');assert.ok(await page.locator('#details').isVisible());
  await page.waitForFunction(()=>{const images=[...document.querySelectorAll('#detail-body img')];return images.length===2&&images.every(i=>i.complete&&i.naturalWidth>0);});
  const body=await page.locator('#detail-body').textContent();assert.ok(body.includes('SHA256 A')&&body.includes('SHA256 B'));assert.ok(body.includes('Non certifié / non validé / non intégré'));
  await page.screenshot({path:path.join(output,'source-limit-drawer.png')});await page.keyboard.press('Escape');assert.ok(await button.evaluate(b=>b===document.activeElement));
 });
 await check('Partial and hybrid source qualifications stay visible alongside original project scopes',async()=>{
  const partial=pack.pairs.filter(p=>p.partialReferenceView),hybrid=pack.pairs.filter(p=>p.hybridStudy);
  assert.equal(partial.length,1);assert.equal(partial[0].id,'mk-30-emissary');assert.equal(hybrid.length,1);assert.equal(hybrid[0].id,'mask-feral-screen-original');
  for(const pair of [...partial,...hybrid]){await identity(pair.id);assert.ok((await page.locator('#grid article').textContent()).includes(pair.scopeLabel));}
  await identity('mk-30-emissary');await page.screenshot({path:path.join(output,'partial-emissary-pair.png')});
  await page.locator('#remaining-panel summary').click();assert.equal(await page.locator('#remaining-rows tr:visible').count(),46);await page.locator('#remaining-panel summary').click();
 });
 await check('320 and 390 pixel screens keep controls, pairs, drawer and expanded tables inside the viewport',async()=>{
  for(const width of [320,390]){
   await page.setViewportSize({width,height:844});await identity('all');assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'cards overflow '+width);
   await page.locator('#remaining-panel').evaluate(d=>d.open=true);await page.locator('#alias-panel').evaluate(d=>d.open=true);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'table overflow '+width);
   await page.locator('#remaining-panel').evaluate(d=>d.open=false);await page.locator('#alias-panel').evaluate(d=>d.open=false);
   await identity('phg-captured');await page.locator('button[data-details="phg-captured"]').click();assert.ok(await page.locator('#details').evaluate(d=>d.getBoundingClientRect().left>=0&&d.getBoundingClientRect().right<=innerWidth));await page.keyboard.press('Escape');
   await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:path.join(output,'mobile-'+width+'-captured.png'),fullPage:true});
  }
 });
 await check('No missing files, JavaScript exceptions, external images or game-storage writes occur',async()=>{
  assert.deepEqual(errors,[]);assert.deepEqual(failedRequests,[]);assert.equal(await page.evaluate(()=>window.__DUAL_MASK_REVIEW__.getStats().errors),0);
  assert.deepEqual(await page.evaluate(()=>({local:localStorage.length,session:sessionStorage.length})),{local:0,session:0});
  assert.deepEqual(await page.locator('img').evaluateAll(images=>images.filter(i=>new URL(i.src).origin!==location.origin).map(i=>i.src)),[]);
  assert.ok(!(await page.locator('body').textContent()).includes('[object Object]'));
 });
}finally{
 const report={scope:'Static A/B review gallery only; not canonical, human-art, runtime or animation approval',manifestSha256:createHash('sha256').update(manifestRaw).digest('hex'),browser:browser.version(),counts:pack.counts,passed:checks.length===8&&checks.every(c=>c.passed),checks,errors,failedRequests};
 await fs.writeFile(path.join(output,'verification.json'),JSON.stringify(report,null,2)+'\n');await browser.close();if(server)await new Promise(resolve=>server.close(resolve));
 console.log(JSON.stringify({passed:report.passed,checks:checks.map(c=>({name:c.name,passed:c.passed,error:c.error})),output},null,2));if(!report.passed)process.exitCode=1;
}
