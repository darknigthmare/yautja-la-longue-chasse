/** Decode the eighteen native images served by the common compiled origin.
 * The contact sheet is an inspection fixture, not a played gallery journey. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright-core';
const baseUrl=process.env.YAUTJA_QA_BASE_URL??'http://127.0.0.1:3101';
assert.ok(['127.0.0.1','localhost'].includes(new URL(baseUrl).hostname));
const buildId=process.env.YAUTJA_QA_BUILD_ID,runtimeCommit=process.env.YAUTJA_QA_RUNTIME_COMMIT;
assert.ok(buildId);assert.match(runtimeCommit??'',/^[a-f0-9]{40}$/);
const output=process.env.YAUTJA_ENFORCER_QA_OUTPUT??'outputs/qa-v107/enforcer-alternatives';
await fs.mkdir(output,{recursive:true});
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const registryPath='app/game/data/enforcerAlternativesV107.json',registry=JSON.parse(await fs.readFile(registryPath,'utf8'));
const sourcePaths=[registryPath,'app/game/systems/recentSpriteLibraryV85.ts','app/game/RecentSpriteLibraryV85.tsx','scripts/qa-enforcer-alternatives-v107.mjs',...registry.assets.map(row=>row.sourcePath)];
const snapshot=()=>Promise.all(sourcePaths.map(async file=>{const bytes=await fs.readFile(file);return{path:file,sha256:sha(bytes),bytes:bytes.length};}));
const sourceBefore=await snapshot(),captures=[],decodes=[],browserErrors=[];
const browser=await chromium.launch({executablePath:process.env.AUDIT_CHROME_EXECUTABLE??'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
try{
 const context=await browser.newContext({viewport:{width:1440,height:1100}}),page=await context.newPage();
 page.on('pageerror',error=>browserErrors.push(error.message));
 const response=await page.goto(baseUrl,{waitUntil:'domcontentloaded',timeout:120000});
 assert.equal(response.status(),200);assert.ok((await response.text()).includes(buildId));
 const servedBuilds=[{url:response.url(),status:200,expectedBuildId:buildId,foundInHtml:true}];
 for(const row of registry.assets){
  const http=await context.request.get(new URL(row.src,baseUrl).href);assert.equal(http.status(),200);
  const bytes=await http.body();assert.equal(sha(bytes),row.sha256);assert.equal(bytes.length,row.bytes);
  const decoded=await page.evaluate(async row=>{const image=new Image();image.src=row.src;await image.decode();return{id:row.identityId,width:image.naturalWidth,height:image.naturalHeight,complete:image.complete};},row);
  assert.deepEqual([decoded.width,decoded.height,decoded.complete],[1024,1536,true]);decodes.push({...decoded,sha256:row.sha256,httpStatus:200});
 }
 const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 for(let index=0;index<3;index++){
  const rows=registry.assets.slice(index*6,index*6+6);
  await page.setContent('<!doctype html><meta charset="utf-8"><title>V107 · inspection des poses natives</title><style>body{margin:0;background:#111b22;color:#f0ead9;font:16px system-ui;padding:20px}h1{font-size:22px}main{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}figure{margin:0;background:repeating-conic-gradient(#28323c 0% 25%,#222a32 0% 50%) 50%/22px 22px;border:1px solid #52616a;border-radius:10px;overflow:hidden}img{width:100%;height:390px;object-fit:contain}figcaption{padding:10px;background:#17212a;font-size:13px}small{display:block;color:#bfcbd3}@media(max-width:600px){main{grid-template-columns:repeat(2,1fr)}img{height:250px}}</style><h1>18 poses alternatives · mêmes identités · lot '+(index+1)+'/3</h1><p>Images natives inchangées ; variations du projet, poses fixes, fidélité canonique non certifiée.</p><main>'+rows.map(row=>'<figure><img src="'+escape(new URL(row.src,baseUrl).href)+'" alt="'+escape(row.groupLabel)+'"><figcaption>'+escape(row.groupLabel)+'<small>'+escape(row.identityId)+'</small></figcaption></figure>').join('')+'</main>');
  await page.locator('img').evaluateAll(images=>Promise.all(images.map(image=>image.decode())));
  const file='contact-'+(index+1)+'.png';await page.screenshot({path:path.join(output,file),fullPage:true});const bytes=await fs.readFile(path.join(output,file));captures.push({file,sha256:sha(bytes),bytes:bytes.length});
 }
 await page.setViewportSize({width:390,height:844});await page.locator('img').evaluateAll(images=>Promise.all(images.map(image=>image.decode())));
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 const file='mobile-contact.png';await page.screenshot({path:path.join(output,file),fullPage:true});const bytes=await fs.readFile(path.join(output,file));captures.push({file,sha256:sha(bytes),bytes:bytes.length});
 const sourceAfter=await snapshot();assert.deepEqual(sourceAfter,sourceBefore);assert.deepEqual(browserErrors,[]);
 const report={schemaVersion:1,release:'V107',status:'PASS_NATIVE_ASSETS',scope:'Eighteen native static alternative poses decoded and HTTP-hashed from the common compiled origin. Inspection contact sheet only; no claim of a played production gallery, animation, new identity or campaign placement.',runtimeCommit,buildId,servedBuilds,decodes,captures,sourceBefore,sourceAfter,browserErrors,newStableIdentities:0,reusedStableIdentities:18};
 await fs.writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,decoded:decodes.length,captures:captures.length,buildId}));
}finally{await browser.close();}
