import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
const root='/workspace/yautja-la-longue-chasse';
const {build}=await import(pathToFileURL(root+'/node_modules/esbuild/lib/main.js'));
const {chromium}=await import(pathToFileURL(root+'/node_modules/playwright-core/index.mjs'));
const output=root+'/production/p0p1-20261109/qa/phg/diagnostic-isolation';
await fs.mkdir(output,{recursive:true});
await fs.writeFile(output+'/run.lock',new Date().toISOString(),{flag:'wx'});
const bundle=await build({stdin:{contents:"export {defaultSave,SAVE_STORAGE_KEY} from './app/game/save'; export {appearanceForPreset,loadoutForPreset} from './app/game/hunterLore'; export {Y_A_U_T_J_A_DECALS_V133} from './app/game/yautjaDecalsV133';",resolveDir:root},bundle:true,platform:'node',format:'esm',write:false,logLevel:'silent'});
const api=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const initial=api.defaultSave('2026-11-09T14:00:00.000Z'); initial.settings.masterVolume=0;initial.appearance=api.appearanceForPreset('samurai');initial.loadout=api.loadoutForPreset('samurai');
const report={startedAt:new Date().toISOString(),scope:'Native diagnostic isolation; initial Samurai only, all edits through real controls. No DOM visibility/style modifications.',buildId:(await fs.readFile(root+'/.next/BUILD_ID','utf8')).trim(),stages:[],errors:[]};
await fs.writeFile(output+'/initial.json',JSON.stringify(initial,null,2));
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true});
try{
 const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
 await context.addInitScript(({key,save})=>{if(!['http:','https:'].includes(location.protocol)||sessionStorage.getItem('phg-isolation'))return;localStorage.setItem(key,JSON.stringify(save));sessionStorage.setItem('phg-isolation','1');},{key:api.SAVE_STORAGE_KEY,save:initial});
 const page=await context.newPage();page.setDefaultTimeout(30000);page.on('pageerror',e=>report.errors.push(e.message));
 await page.goto('http://127.0.0.1:3121',{waitUntil:'networkidle'});
 if(await page.locator('[data-menu-section="campaign"]').isVisible())await page.locator('[data-menu-section="campaign"]').click();
 await page.locator('[data-menu-action="continue"]').click();await page.locator('[data-campaign-session]').waitFor();
 await page.getByRole('button',{name:'Console du vaisseau',exact:true}).click();
 const ship=page.locator('[data-ship-room]');await ship.waitFor();
 await ship.getByRole('navigation',{name:'Salles du vaisseau'}).getByRole('button',{name:'Armurerie',exact:true}).click();
 await ship.getByRole('button',{name:/Personnaliser le chasseur/}).click();
 const forge=page.locator('[data-hunter-chromatics-v113]');await forge.waitFor();
 const rig=page.locator('.customization-preview [data-hunter-rig]');
 const saved=()=>page.evaluate(key=>localStorage.getItem(key),api.SAVE_STORAGE_KEY);
 const capture=async name=>{
  await rig.scrollIntoViewIfNeeded();await rig.locator('img').evaluateAll(images=>Promise.all(images.map(image=>image.complete?undefined:image.decode().catch(()=>undefined))));
  const file=name+'.png';await rig.screenshot({path:output+'/'+file});
  const dom=await rig.evaluate(element=>{
   const rect=element.getBoundingClientRect();
   const info=node=>{const s=getComputedStyle(node),r=node.getBoundingClientRect();return{tag:node.tagName,data:{...node.dataset},src:node.currentSrc||node.src||null,mask:s.maskImage,clip:s.clipPath,transform:s.transform,zIndex:s.zIndex,background:s.backgroundImage,color:s.backgroundColor,opacity:s.opacity,position:s.position,bbox:{x:r.x-rect.x,y:r.y-rect.y,width:r.width,height:r.height},style:node.getAttribute('style'),ancestors:Array.from((function*(n){for(let p=n.parentElement;p&&p!==element;p=p.parentElement)yield p;})(node)).map(p=>({data:{...p.dataset},clip:getComputedStyle(p).clipPath,transform:getComputedStyle(p).transform}))};};
   return{rig:{data:{...element.dataset},width:rect.width,height:rect.height},layers:Array.from(element.querySelectorAll('[data-chromatic-channel],[data-rig-slot],[data-rig-placement],[data-yautja-decal-zone],[data-rig-armor-wrap],[data-decal-mask-owner-v139]')).map(info)};
  });
  await fs.writeFile(output+'/'+name+'-dom.json',JSON.stringify(dom,null,2));await fs.writeFile(output+'/'+name+'-save.json',await saved());
  report.stages.push({name,file,sha256:createHash('sha256').update(await fs.readFile(output+'/'+file)).digest('hex'),layers:dom.layers.length});
  console.log('CAPTURE',name);await fs.writeFile(output+'/report.partial.json',JSON.stringify(report,null,2));
 };
 const commit=async()=>{const before=await saved();await forge.getByRole('button',{name:'Valider les couleurs et matières',exact:true}).click();await page.waitForFunction(({key,before})=>localStorage.getItem(key)!==before,{key:api.SAVE_STORAGE_KEY,before});};
 await capture('00-native');
 await forge.locator('#chromatic-color-armor').fill('#556677');await commit();await capture('01-armor-pigment-only');
 const options=await forge.locator('#chromatic-mask-material-v131 option').evaluateAll(items=>items.map(i=>({value:i.value,label:i.textContent})));const nova=options.find(o=>/Nova/.test(o.label));assert.ok(nova);
 await forge.locator('#chromatic-mask-material-v131').selectOption(nova.value);await commit();await capture('02-nova-no-decals');
 let step=3;for(const zone of ['face','body','armor','biomask']){const item=api.Y_A_U_T_J_A_DECALS_V133.find(d=>d.zone===zone);await forge.locator('#decal-v133-'+zone).selectOption(item.id);await commit();await capture(String(step++).padStart(2,'0')+'-add-'+zone);}
 report.passed=true;await context.close();
}catch(error){report.passed=false;report.failure=error.stack;process.exitCode=1;console.error(error)}finally{report.finishedAt=new Date().toISOString();await fs.writeFile(output+'/report.json',JSON.stringify(report,null,2));await browser.close();}
