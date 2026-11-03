import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {chromium} from 'playwright-core';

// Exercise the shipped offline HTML in a real browser; do not alter PNG files.
const base=path.resolve('docs/suivi-production/v612');
const browserPath=process.argv.find(x=>x.startsWith('--browser='))?.slice(10);
if(!browserPath)throw Error('Usage: node scripts/verify-enforcer-gallery-v612.mjs --browser=<Chromium executable>');
const out=path.join(base,'gallery-preview');await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:browserPath,headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--allow-file-access-from-files']});
const page=await browser.newPage({viewport:{width:1440,height:1000}});
const errors=[],external=[];page.on('pageerror',e=>errors.push(e.message));
page.on('request',r=>{if(/^https?:/.test(r.url()))external.push(r.url());});
try{
 await page.goto(pathToFileURL(path.join(base,'index.html')).href);
 await page.locator('img').evaluateAll(images=>Promise.all(images.map(img=>{img.loading='eager';return img.decode();})));
 const loaded=await page.locator('img').evaluateAll(images=>images.map(img=>({complete:img.complete,width:img.naturalWidth,height:img.naturalHeight})));
 assert.equal(loaded.length,72);assert(loaded.every(img=>img.complete&&img.width===1024&&img.height===1536));
 const hrefs=await page.locator('a[href]').evaluateAll(links=>[...new Set(links.map(a=>a.getAttribute('href')))]);
 const localLinks=hrefs.filter(h=>!/^https?:/.test(h));
 for(const href of localLinks)assert((await fs.stat(path.resolve(base,href))).isFile(),href);
 const visible=()=>page.locator('.card:not([hidden])').count();
 assert.equal(await visible(),72);
 await page.selectOption('#group','human-accepted');assert.equal(await visible(),4);
 await page.selectOption('#lot','V6.12');assert.equal(await visible(),2);
 await page.selectOption('#variant','6');assert.equal(await visible(),1);
 assert.equal(await page.locator('.card:not([hidden])').getAttribute('data-group'),'human-accepted');
 await page.fill('#search','aucun-resultat-qa-v612');assert.equal(await visible(),0);
 assert.equal(await page.locator('#empty').isVisible(),true);
 await page.click('#reset');await page.waitForFunction(()=>[...document.querySelectorAll('.card')].filter(x=>!x.hidden).length===72);
 assert.equal(await page.inputValue('#group'),'');assert.equal(await page.inputValue('#lot'),'');assert.equal(await page.inputValue('#variant'),'');assert.equal(await page.inputValue('#search'),'');
 await page.click('#background');assert.equal(await page.getAttribute('#background','aria-pressed'),'true');
 await page.screenshot({path:path.join(out,'gallery-desktop.png')});
 const groupScreens=[];
 for(const group of ['human-accepted','four-armed','bionic','pilot-kok']){
  await page.selectOption('#group',group);await page.selectOption('#lot','V6.12');assert.equal(await visible(),2);
  await page.locator('#grid').scrollIntoViewIfNeeded();
  await page.locator('#grid').screenshot({path:path.join(out,group+'.png')});
  groupScreens.push(group+'.png');
 }
 await page.click('#reset');await page.waitForFunction(()=>[...document.querySelectorAll('.card')].filter(x=>!x.hidden).length===72);
 await page.setViewportSize({width:390,height:844});await page.evaluate(()=>scrollTo(0,0));
 const mobile=await page.evaluate(()=>({viewport:innerWidth,documentWidth:document.documentElement.scrollWidth}));
 assert(mobile.documentWidth<=mobile.viewport,'Mobile horizontal overflow');
 await page.screenshot({path:path.join(out,'gallery-mobile.png')});
 assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
 const report={passed:true,nativeImagesLoaded:loaded.length,nativeDimensions:[1024,1536],localLinksChecked:localLinks.length,
  filters:{all:72,oneGroup:4,currentGroup:2,currentVariant:1,empty:0,reset:72},backgroundToggleVerified:true,
  mobileViewport:mobile.viewport,mobileDocumentWidth:mobile.documentWidth,pageErrors:errors,externalNetworkRequests:external,
  screenshots:['gallery-desktop.png',...groupScreens,'gallery-mobile.png']};
 await fs.writeFile(path.join(out,'browser-verification.json'),JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify(report));
}finally{await browser.close();}
