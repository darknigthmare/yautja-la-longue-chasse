import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';

const root='/workspace/yautja-homeworld-marsh-20261102',require=createRequire(path.join(root,'package.json'));
const {build}=require('esbuild'),{chromium}=require('playwright-core');
const {firstTracksCompleted}=await import(pathToFileURL(path.join(root,'tests/helpers/solo-v67-campaign-route.mjs')));
const base='http://127.0.0.1:3105',output=await fs.mkdtemp('/workspace/native-forge-production-20261102/context-run-');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const files=['app/game/HomeworldForgeFireV113.tsx','app/game/systems/homeworldForgeFireV113.ts','app/game/HomeworldWorldSceneV77.tsx'];
const snapshot=()=>Promise.all(files.map(async file=>{const bytes=await fs.readFile(path.join(root,file));return{path:file,bytes:bytes.length,sha256:sha(bytes)};}));
const bootstrap=await build({stdin:{contents:"import * as saves from './app/game/save';import * as slots from './app/game/systems/campaignSlots';import * as location from './app/game/systems/homeworldLocationV77';window.__forgeContext={...saves,...slots,...location};",resolveDir:root,loader:'ts'},bundle:true,write:false,format:'iife',platform:'browser',target:'es2022',logLevel:'silent'});
const report={driver:{path:import.meta.url,sha256:sha(await fs.readFile(new URL(import.meta.url)))},scope:'Development Next app on3105, actual native building render with declared completed-first-tracks campaign/location fixture. No journey, crafting completion or human art admission is claimed.',startedAt:new Date().toISOString(),base,output,sourceBefore:await snapshot(),checks:[],screenshots:[],pageErrors:[],consoleErrors:[],requestFailures:[],httpErrors:[]};
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--mute-audio']});
const context=await browser.newContext({viewport:{width:1440,height:1050},reducedMotion:'no-preference',serviceWorkers:'block'}),page=await context.newPage();
page.setDefaultTimeout(45000);page.on('pageerror',e=>report.pageErrors.push(String(e)));page.on('console',m=>{if(m.type()==='error')report.consoleErrors.push(m.text());});page.on('requestfailed',r=>report.requestFailures.push({url:r.url(),failure:r.failure()}));page.on('response',r=>{if(r.status()>=400)report.httpErrors.push({url:r.url(),status:r.status()});});
const check=(name,ok,detail)=>{report.checks.push({name,status:ok?'PASS':'FAIL',detail});assert(ok,name);};
const fire=page.locator('[data-homeworld-forge-fire-v113="deep-forge"]'),building=page.locator('[data-building-id="deep-forge"]');
const tick=ms=>page.clock.runFor(ms);
const capture=async(name,target=building)=>{const file=path.join(output,name+'.png');await target.screenshot({path:file,animations:'allow'});const bytes=await fs.readFile(file);report.screenshots.push({name,path:file,bytes:bytes.length,sha256:sha(bytes)});};
async function enter(){await page.getByRole('button',{name:/^Continuer/}).click();await page.locator('[data-homeworld-hub][data-homeworld-motion-ready="true"]').waitFor({timeout:120000});await page.bringToFront();await page.locator('[data-homeworld-viewport]').focus();await page.locator('[data-homeworld-viewport]').click({position:{x:700,y:420}});}
try{
  await page.clock.install();
  const response=await page.goto(base,{waitUntil:'domcontentloaded',timeout:120000});check('actual local Next page responds',response?.ok(),{status:response?.status()});
  await page.locator('[data-campaign-menu="main"]').waitFor({timeout:120000});await page.addScriptTag({content:bootstrap.outputFiles[0].text});
  await page.evaluate(async source=>{
    const q=window.__forgeContext,defaults=q.defaultSave(source.createdAt),save=q.normalizeSave({...defaults,...source,inventory:{...defaults.inventory,...source.inventory,fieldToolIds:['flaying-tool']}});
    save.profile.hunterName='Forge context fixture';save.settings.masterVolume=0;save.homeworld.visitedDistrictIds=['port','market','forges','memory','undercity'];
    const origin={x:3080,y:3000};save.homeworld.locationV77=q.createHomeworldCheckpointV77(save.createdAt,'0',origin,null,origin);
    if(!q.parseSaveImport(JSON.stringify(save)).save)throw Error('Invalid declared forge campaign fixture');
    localStorage.setItem(q.SAVE_STORAGE_KEY,JSON.stringify(save));const migrated=await q.migrateLegacyCampaignSlot();if(!migrated.ok)throw Error(migrated.message);
    const saved=await q.saveCampaignCheckpoint(1,{kind:'manual',index:1,location:'homeworld',expectedRevision:q.loadCampaignSlots().slots[0].revision});if(!saved.ok)throw Error(saved.message);
  },firstTracksCompleted());
  report.fixture={source:'firstTracksCompleted()',location:{x:3080,y:3000,levelId:'0'},playedApproach:false};
  await page.reload({waitUntil:'domcontentloaded'});await page.locator('[data-campaign-menu="main"]').waitFor();await enter();await fire.waitFor({timeout:120000});
  await page.clock.pauseAt(await page.evaluate(()=>Date.now()+1000));
  report.native=await fire.evaluate(e=>({source:e.dataset.forgeNativeSource,status:e.dataset.forgeArtStatus,frame:e.dataset.forgeNativeFrame,viewBox:e.getAttribute('viewBox'),rect:e.getBoundingClientRect().toJSON(),parentRect:e.parentElement.getBoundingClientRect().toJSON(),parentOpacity:getComputedStyle(e.parentElement).opacity,ownOpacity:getComputedStyle(e).opacity}));
  check('native child uses exact parent building extent without multiplying opacity',Math.abs(report.native.rect.width-report.native.parentRect.width)<.1&&Math.abs(report.native.rect.height-report.native.parentRect.height)<.1&&report.native.ownOpacity==='1',report.native);
  await capture('00-context',page);
  const seen=new Set();
  for(let attempt=0;attempt<20&&seen.size<6;attempt++){
    await tick(130);const index=Number(await fire.getAttribute('data-forge-native-frame'));
    if(!seen.has(index)){seen.add(index);await capture('frame-'+index);}
  }
  check('six distinct native flame drawings are painted on the actual building',seen.size===6,{frames:[...seen]});
  await page.getByRole('button',{name:'Pause',exact:true}).click();await tick(150);const pausedFrame=await fire.getAttribute('data-forge-native-frame');await tick(2000);check('game pause holds native frame',pausedFrame===await fire.getAttribute('data-forge-native-frame'),{frame:pausedFrame});await capture('pause');
  await page.getByRole('button',{name:'Reprendre',exact:true}).click();await page.locator('[data-homeworld-viewport]').focus();await tick(180);
  await page.emulateMedia({reducedMotion:'reduce'});await tick(180);check('reduced motion holds first native drawing',await fire.getAttribute('data-forge-native-frame')==='0');await capture('reduced-motion');
  await page.route('**/p3-c-brazier-flame-f02.png',route=>route.abort('failed'));report.deliberateFailure='p3-c-brazier-flame-f02.png';
  await page.clock.resume();await page.reload({waitUntil:'domcontentloaded'});await page.locator('[data-campaign-menu="main"]').waitFor();await enter();await page.waitForTimeout(1200);
  check('a missing native flame retains the existing static building and omits overlay',await building.count()===1&&await fire.count()===0);await capture('missing-resource-static');
  await page.unroute('**/p3-c-brazier-flame-f02.png');
  await page.route('**/v72/civic-identity-atlas.png',route=>route.abort('failed'));
  report.deliberateBaseFailure='civic-identity-atlas.png';
  await page.reload({waitUntil:'domcontentloaded'});await page.locator('[data-campaign-menu="main"]').waitFor();
  await page.getByRole('button',{name:/^Continuer/}).click();await page.locator('[data-homeworld-hub]').waitFor();await page.waitForTimeout(1500);
  check('missing facade atlas prevents orphan flame',await fire.count()===0);await capture('missing-facade-no-orphan-fire',page);

}catch(error){report.failure=String(error);process.exitCode=1;
  report.failureVisibleText=await page.locator('body').innerText().catch(()=>null);
  await capture('failure-visible-state',page).catch(e=>{report.failureCaptureError=String(e);});
}
finally{report.sourceAfter=await snapshot();report.sourceUnchanged=JSON.stringify(report.sourceBefore)===JSON.stringify(report.sourceAfter);report.endedAt=new Date().toISOString();await fs.writeFile(path.join(output,'result.json'),JSON.stringify(report,null,2)+'\n');await browser.close();console.log(JSON.stringify({output,checks:report.checks,failure:report.failure??null,pageErrors:report.pageErrors.length,httpErrors:report.httpErrors.length,sourceUnchanged:report.sourceUnchanged}));}
