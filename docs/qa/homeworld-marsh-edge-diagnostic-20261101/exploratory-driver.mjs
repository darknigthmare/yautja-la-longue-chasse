import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
const root='/workspace/yautja-la-longue-chasse';
const require=createRequire(path.join(root,'package.json'));
const {build}=require('esbuild'),{chromium}=require('playwright-core');
const {firstTracksCompleted}=await import(pathToFileURL(path.join(root,'tests/helpers/solo-v67-campaign-route.mjs')));
const output='/tmp/homeworld-dark-band-diagnostic';await fs.mkdir(output,{recursive:true});
const bootstrap=await build({stdin:{contents:"import * as saves from './app/game/save';import * as slots from './app/game/systems/campaignSlots';import * as location from './app/game/systems/homeworldLocationV77';window.__darkBandDiagnostic={...saves,...slots,...location};",resolveDir:root,loader:'ts'},bundle:true,write:false,format:'iife',platform:'browser',target:'es2022',logLevel:'silent'});
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--mute-audio']});
const context=await browser.newContext({viewport:{width:1440,height:1050},reducedMotion:'reduce'}),page=await context.newPage();
const errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(45000);
try{
  await page.goto('http://127.0.0.1:3104',{waitUntil:'domcontentloaded'});await page.locator('[data-campaign-menu="main"]').waitFor();
  await page.addScriptTag({content:bootstrap.outputFiles[0].text});
  await page.evaluate(async source=>{
    const q=window.__darkBandDiagnostic,defaults=q.defaultSave(source.createdAt),save=q.normalizeSave({...defaults,...source,inventory:{...defaults.inventory,...source.inventory,fieldToolIds:['flaying-tool']}});
    save.profile.hunterName='Diagnostic bandes visuelles';save.settings.masterVolume=0;save.homeworld.visitedDistrictIds=['port','market','forges','memory','terraces','temple','enforcers','citadel','undercity'];
    const origin={x:6473,y:2800};save.homeworld.locationV77=q.createHomeworldCheckpointV77(save.createdAt,'0',origin,null,origin);
    if(!q.parseSaveImport(JSON.stringify(save)).save)throw Error('Invalid diagnostic fixture');
    localStorage.setItem(q.SAVE_STORAGE_KEY,JSON.stringify(save));const migrated=await q.migrateLegacyCampaignSlot();if(!migrated.ok)throw Error(migrated.message);
    const saved=await q.saveCampaignCheckpoint(1,{kind:'manual',index:1,location:'homeworld',expectedRevision:q.loadCampaignSlots().slots[0].revision});if(!saved.ok)throw Error(saved.message);
  },firstTracksCompleted());
  await page.reload({waitUntil:'domcontentloaded'});await page.getByRole('button',{name:/^Continuer/}).waitFor();await page.getByRole('button',{name:/^Continuer/}).click();
  await page.locator('[data-homeworld-hub][data-homeworld-motion-ready="true"]').waitFor({timeout:120000});
  await page.locator('[data-homeworld-actor][data-moving="false"]').waitFor({state:'attached'});
  await page.evaluate(()=>Promise.all([...document.images].map(image=>image.decode().catch(()=>null))));
  await page.screenshot({path:path.join(output,'baseline.png')});
  const inspect=async()=>page.evaluate(()=>{
    const sites=[{x:414,y:400},{x:414,y:750},{x:414,y:880},{x:882,y:540},{x:882,y:650},{x:880,y:700}];
    const attrs=e=>Object.fromEntries([...e.attributes].filter(a=>a.name.startsWith('data-')).map(a=>[a.name,a.value]));
    return{world:{...attrs(document.querySelector('[data-homeworld-camera-mode]')),style:document.querySelector('[data-homeworld-camera-mode]').getAttribute('style')},
      actor:attrs(document.querySelector('[data-homeworld-actor]')),sites:sites.map(site=>({site,hits:[...document.querySelectorAll('svg polygon,svg path,svg rect')].flatMap(e=>{
        const matrix=e.getScreenCTM();if(!matrix)return[];const p=new DOMPoint(site.x,site.y).matrixTransform(matrix.inverse());
        if(!e.isPointInFill?.(p)&&!e.isPointInStroke?.(p))return[];
        const svg=e.closest('svg'),parent=e.parentElement;
        return[{tag:e.tagName,attrs:attrs(e),parentAttrs:attrs(parent),svgAttrs:attrs(svg),fill:e.getAttribute('fill'),points:e.getAttribute('points'),z:getComputedStyle(svg).zIndex,rect:svg.getBoundingClientRect().toJSON(),point:{x:p.x,y:p.y}}];
      })}))};
  });
  const before=await inspect();await fs.writeFile(path.join(output,'dom-before.json'),JSON.stringify({scope:'Exploratory local fixture; DOM visibility toggles are attribution diagnostics, not gameplay certification.',errors,before},null,2)+'\n');
  const toggles=[['without-foundations','[data-homeworld-real-foundations-v81]'],['without-natural','[data-homeworld-natural-ground-v77]'],['without-ecotones','[data-homeworld-ecotones-v112]'],['without-depth-background','[data-homeworld-depth-layer-v81="3"],[data-homeworld-depth-layer-v81="4"],[data-homeworld-depth-layer-v81="5"]'],['without-floor-filter','[data-homeworld-ground-union-v80]']];
  for(const [name,selector] of toggles){
    await page.evaluate(({selector,name})=>{for(const e of document.querySelectorAll(selector)){e.dataset.diagnosticOldStyle=e.getAttribute('style')??'';e.style[name==='without-floor-filter'?'filter':'visibility']=name==='without-floor-filter'?'none':'hidden';}}, {selector,name});
    await page.screenshot({path:path.join(output,name+'.png')});
    await page.evaluate(selector=>{for(const e of document.querySelectorAll(selector)){e.setAttribute('style',e.dataset.diagnosticOldStyle);delete e.dataset.diagnosticOldStyle;}},selector);
  }
  console.log(JSON.stringify({status:'DIAGNOSTIC_CAPTURED',output,errors,world:before.world,actor:before.actor}));
}finally{await browser.close();}
