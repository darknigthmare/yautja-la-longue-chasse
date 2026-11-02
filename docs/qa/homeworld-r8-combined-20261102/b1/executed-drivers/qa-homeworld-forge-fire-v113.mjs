/** Targeted native reuse recipe, derived from the historical R6 driver.
 * Initial campaign/location and the two network refusals are declared fixtures.
 * This is never a complete Homeworld domain or human-artistic certificate. */
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import {chromium} from 'playwright-core';
import {homeworldQaModelV64} from './homeworld-qa-model-v64.mjs';

const driver='scripts/qa-homeworld-forge-fire-v113.mjs';
const root=fileURLToPath(new URL('..',import.meta.url));
const baseUrl=process.env.YAUTJA_QA_BASE_URL??'http://127.0.0.1:3105';
assert(['127.0.0.1','localhost'].includes(new URL(baseUrl).hostname),'Campaign fixtures are local only');
const requestedMode=process.env.YAUTJA_QA_MODE??'development';
assert(['compiled-app','development','exploratory'].includes(requestedMode),'Unknown QA mode');
const mode=requestedMode==='compiled-app'?'compiled-app':'development';
const buildId=process.env.YAUTJA_QA_BUILD_ID??null,runtimeCommit=process.env.YAUTJA_QA_RUNTIME_COMMIT??null;
if(mode==='compiled-app'){
 assert(typeof buildId==='string'&&buildId.trim()===buildId&&buildId.length>0&&buildId!=='development','Compiled QA requires the real non-development Build ID');
 assert.match(runtimeCommit??'',/^[a-f0-9]{40}$/,'Compiled QA requires the exact runtime commit');
}
const output=path.resolve(process.env.YAUTJA_FORGE_OUTPUT??path.join(root,'outputs/qa-v113/forge-fire'));
// Legacy played-route fixture modules resolve their local TS inputs from cwd.
// Import them only after the portable root and compiled-mode guards are known.
process.chdir(root);
const {firstTracksCompleted}=await import('../tests/helpers/solo-v67-campaign-route.mjs');
await fs.mkdir(output,{recursive:true});assert.equal((await fs.readdir(output)).length,0,'Preserve every previous attempt');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const sourceFiles=['app/game/HomeworldForgeFireV113.tsx','app/game/systems/homeworldForgeFireV113.ts','app/game/HomeworldWorldSceneV77.tsx','app/game/systems/homeworldWorldV77.ts','tests/helpers/solo-v67-campaign-route.mjs',driver];
const snapshot=()=>Promise.all(sourceFiles.map(async file=>{const bytes=await fs.readFile(path.join(root,file));return{file,bytes:bytes.length,sha256:sha(bytes)};}));
const sourceBefore=await snapshot(),driverPin=sourceBefore.find(row=>row.file===driver);
const api=homeworldQaModelV64(root,['homeworldForgeFireV113.ts']);
const definition=api.HOMEWORLD_FORGE_FIRE_V113,frames=api.HOMEWORLD_FORGE_FIRE_FRAMES_V113;
assert.equal(frames.length,6);
const assetFiles=[...frames.map(frame=>({file:'public'+frame.src,expectedSha256:frame.sha256})),{file:'public'+definition.buildingSource}];
const snapshotAssets=()=>Promise.all(assetFiles.map(async row=>{const bytes=await fs.readFile(path.join(root,row.file)),hash=sha(bytes);if(row.expectedSha256)assert.equal(hash,row.expectedSha256,'Native flame bytes differ from their retained binding');return{file:row.file,bytes:bytes.length,sha256:hash};}));
const assetsBefore=await snapshotAssets();
function htmlBuildIdentity(html){
 const observedBuildIds=[...new Set([...html.matchAll(/(?:\\)*"(?:buildId|b)(?:\\)*"\s*:\s*(?:\\)*"([^"\\]+)(?:\\)*"/g)].map(row=>row[1]))];
 return{expectedBuildId:buildId,observedBuildIds,observedBuildId:observedBuildIds.length===1?observedBuildIds[0]:null,
  foundInHtml:!!buildId&&html.includes(buildId),buildIdVerified:!!buildId&&observedBuildIds.length===1&&observedBuildIds[0]===buildId&&html.includes(buildId)};
}
const bootstrap=await build({stdin:{contents:"import * as saves from './app/game/save';import * as slots from './app/game/systems/campaignSlots';import * as location from './app/game/systems/homeworldLocationV77';window.__forgeContext={...saves,...slots,...location};",resolveDir:root,loader:'ts'},bundle:true,write:false,format:'iife',platform:'browser',target:'es2022',logLevel:'silent'});
const captures=[],responses=[];
const report={schemaVersion:1,release:'V113',domain:'Homeworld Forge fire V113',completeRecipe:false,
 driver:driverPin,startedAt:new Date().toISOString(),baseUrl,output,
 production:{mode,runtimeCommit,buildId,servedBuilds:responses},
 invocation:{command:'node '+driver,environment:{YAUTJA_QA_MODE:mode,YAUTJA_QA_BASE_URL:baseUrl,YAUTJA_QA_BUILD_ID:buildId,YAUTJA_QA_RUNTIME_COMMIT:runtimeCommit,YAUTJA_FORGE_OUTPUT:output}},
 scope:'Targeted actual native building render with a declared completed-First-Tracks campaign/location fixture and two consumed network-refusal fixtures. No played approach, crafting completion, complete Homeworld certification or human artistic admission is claimed.',
 sourceObservationScope:'Five local application/fixture inputs plus this driver and the seven native asset bytes are observed. This is not the complete served runtime inventory.',
 sourceBefore,assetsBefore,checks:[],captures,screenshots:captures,responses,pageErrors:[],consoleErrors:[],workerErrors:[],requestFailures:[],httpErrors:[],routeErrors:[],
 declaredNetworkRefusals:[
  {id:'missing-flame',phase:'missing-flame',path:frames[2].src,error:'failed',scope:'Only this original native image is aborted; the real existing facade must remain painted.'},
  {id:'missing-facade',phase:'missing-facade',path:definition.buildingSource,error:'failed',scope:'Only the real facade atlas is aborted. This checks absence of orphan fire during loading, not successful global readiness or recovery.'},
 ],networkRefusalObservations:[],frameObservations:[]};
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE_PATH??'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage','--mute-audio']});
const context=await browser.newContext({viewport:{width:1440,height:1050},reducedMotion:'no-preference',serviceWorkers:'block'}),page=await context.newPage();
let phase='ordinary',requestSequence=0;
const requests=new WeakMap(),refusedRequests=new WeakMap();
const requestInfo=request=>{
 let info=requests.get(request);
 if(!info){info={id:++requestSequence,phase,url:request.url(),method:request.method(),resourceType:request.resourceType()};requests.set(request,info);}
 return info;
};
page.setDefaultTimeout(45000);
page.on('request',request=>requestInfo(request));
page.on('pageerror',error=>report.pageErrors.push({phase,message:error.message,stack:error.stack??null}));
page.on('console',message=>{if(message.type()==='error')report.consoleErrors.push({phase,text:message.text(),location:message.location()});});
page.on('requestfailed',request=>report.requestFailures.push({...requestInfo(request),failure:request.failure(),declaredRefusal:refusedRequests.get(request)??null}));
page.on('response',response=>{if(response.status()>=400)report.httpErrors.push({...requestInfo(response.request()),status:response.status()});});
await page.exposeFunction('__forgeWorkerErrorV113',error=>report.workerErrors.push({phase,...error}));
await context.addInitScript(()=>{const NativeWorker=window.Worker;window.Worker=class extends NativeWorker{
 constructor(url,options){try{super(url,options);}catch(error){void window.__forgeWorkerErrorV113({kind:'constructor',url:String(url),message:String(error)});throw error;}
  this.addEventListener('error',event=>void window.__forgeWorkerErrorV113({kind:'event',url:String(url),message:event.message}));}
 };});
const check=(name,ok,detail)=>{report.checks.push({name,status:ok?'PASS':'FAIL',detail});assert(ok,name);console.log('PASS '+name);};
const fire=page.locator('[data-homeworld-forge-fire-v113="deep-forge"]'),building=page.locator('[data-building-id="deep-forge"]');
const tick=async ms=>{await page.clock.runFor(ms);await new Promise(resolve=>setTimeout(resolve,2));};
async function navigate(kind,label){
 const response=kind==='reload'?await page.reload({waitUntil:'domcontentloaded',timeout:120000}):await page.goto(baseUrl,{waitUntil:'domcontentloaded',timeout:120000});
 assert(response?.ok(),'The actual local Next document must load');
 const html=await response.text(),identity=htmlBuildIdentity(html);
 responses.push({navigation:label,phase,url:response.url(),status:response.status(),htmlSha256:sha(html),...identity});
 if(mode==='compiled-app')assert(identity.buildIdVerified,'Served HTML must identify the exact requested compiled build');
 return response;
}
async function capture(name,target=building){
 const file=name+'.png';await target.screenshot({path:path.join(output,file),animations:'allow'});
 const bytes=await fs.readFile(path.join(output,file));captures.push({name,file,bytes:bytes.length,sha256:sha(bytes),phase});
}
async function enter(){
 await page.getByRole('button',{name:/^Continuer/}).click();
 await page.locator('[data-homeworld-hub][data-homeworld-motion-ready="true"]').waitFor({timeout:120000});
 await page.bringToFront();await page.locator('[data-homeworld-viewport]').focus();await page.locator('[data-homeworld-viewport]').click({position:{x:700,y:420}});
}
async function readFrame(){
 const observed=await fire.evaluate(element=>({index:Number(element.dataset.forgeNativeFrame),source:element.dataset.forgeNativeSource,href:element.querySelector('g image')?.getAttribute('href')}));
 assert(Number.isInteger(observed.index)&&observed.index>=0&&observed.index<6,'Only the six retained frame indices may paint');
 assert.equal(observed.source,frames[observed.index].src);assert.equal(observed.href,frames[observed.index].src,'The actual painted image must match its native frame');
 return observed;
}
async function installRefusal(id){
 const fixture=report.declaredNetworkRefusals.find(row=>row.id===id);assert(fixture);
 const pattern=url=>url.origin===new URL(baseUrl).origin&&url.pathname===fixture.path;
 await page.route(pattern,async route=>{
  const request=route.request(),info=requestInfo(request);
  const observation={...info,id:report.networkRefusalObservations.length+1,fixtureId:id,requestId:info.id};
  refusedRequests.set(request,{fixtureId:id,observationId:observation.id});
  report.networkRefusalObservations.push(observation);
  try{await route.abort('failed');}catch(error){report.routeErrors.push({phase,fixtureId:id,message:String(error)});}
 });
 return pattern;
}
async function awaitConsumedRefusal(id){
 for(let attempt=0;attempt<250;attempt++){
  if(report.networkRefusalObservations.some(row=>row.fixtureId===id))return;
  await new Promise(resolve=>setTimeout(resolve,20));
 }
 throw Error('The declared network refusal was never actually consumed: '+id);
}
function classifyNetworkRefusals(raw){
 const aborts=new Map(raw.networkRefusalObservations.map(row=>[row.id,row]));
 const declaredFailures=[],ordinaryFailures=[],unmatchedAborts=[];
 const remainingConsole=new Map();
 raw.requestFailures.forEach((row,index)=>{
  const declared=row.declaredRefusal,abort=declared&&aborts.get(declared.observationId);
  if(abort&&abort.fixtureId===declared.fixtureId&&abort.id===declared.observationId
    &&abort.requestId===row.id&&abort.url===row.url&&abort.phase===row.phase&&row.failure?.errorText==='net::ERR_FAILED'){
   declaredFailures.push({index,fixtureId:abort.fixtureId,observationId:abort.id});
   const key=abort.phase+'\n'+abort.url,queue=remainingConsole.get(key)??[];queue.push(abort);remainingConsole.set(key,queue);
  }else ordinaryFailures.push({index,...row});
 });
 for(const abort of aborts.values())if(!declaredFailures.some(row=>row.observationId===abort.id))unmatchedAborts.push(abort);
 const declaredConsole=[],ordinaryConsole=[];
 raw.consoleErrors.forEach((row,index)=>{
  const candidates=[...remainingConsole.entries()].filter(([key,queue])=>queue.length&&key.startsWith(row.phase+'\n')
   &&(!row.location?.url||queue[0].url===row.location.url));
  if(row.text==='Failed to load resource: net::ERR_FAILED'&&candidates.length===1){
   const abort=candidates[0][1].shift();declaredConsole.push({index,fixtureId:abort.fixtureId,observationId:abort.id,matchingBasis:row.location?.url?'exact failed URL and phase':'unambiguous consumed failed-image fixture in this phase'});
  }else ordinaryConsole.push({index,...row});
 });
 return{declared:{requestFailures:declaredFailures,consoleErrors:declaredConsole},
  ordinary:{pageErrors:raw.pageErrors,consoleErrors:ordinaryConsole,workerErrors:raw.workerErrors,requestFailures:ordinaryFailures,httpErrors:raw.httpErrors,routeErrors:raw.routeErrors},
  unmatchedAborts};
}
try{
 await page.clock.install();
 const response=await navigate('goto','initial');check('actual local Next page responds',response.ok(),{status:response.status()});
 await page.locator('[data-campaign-menu="main"]').waitFor({timeout:120000});await page.addScriptTag({content:bootstrap.outputFiles[0].text});
 await page.evaluate(async source=>{
  const q=window.__forgeContext,defaults=q.defaultSave(source.createdAt),save=q.normalizeSave({...defaults,...source,inventory:{...defaults.inventory,...source.inventory,fieldToolIds:['flaying-tool']}});
  save.profile.hunterName='Forge context fixture';save.settings.masterVolume=0;save.homeworld.visitedDistrictIds=['port','market','forges','memory','undercity'];
  const origin={x:3080,y:3000};save.homeworld.locationV77=q.createHomeworldCheckpointV77(save.createdAt,'0',origin,null,origin);
  if(!q.parseSaveImport(JSON.stringify(save)).save)throw Error('Invalid declared forge campaign fixture');
  localStorage.setItem(q.SAVE_STORAGE_KEY,JSON.stringify(save));const migrated=await q.migrateLegacyCampaignSlot();if(!migrated.ok)throw Error(migrated.message);
  const saved=await q.saveCampaignCheckpoint(1,{kind:'manual',index:1,location:'homeworld',expectedRevision:q.loadCampaignSlots().slots[0].revision});if(!saved.ok)throw Error(saved.message);
 },firstTracksCompleted());
 report.fixture={source:'firstTracksCompleted()',location:{x:3080,y:3000,levelId:'0'},playedApproach:false,clock:'Declared Playwright clock; native city clock/render is observed, not replaced'};
 await navigate('reload','fixture-applied');await page.locator('[data-campaign-menu="main"]').waitFor();await enter();await fire.waitFor({timeout:120000});
 await page.clock.pauseAt(await page.evaluate(()=>Date.now()+1000));
 report.native=await fire.evaluate(element=>({source:element.dataset.forgeNativeSource,status:element.dataset.forgeArtStatus,frame:element.dataset.forgeNativeFrame,viewBox:element.getAttribute('viewBox'),rect:element.getBoundingClientRect().toJSON(),parentRect:element.parentElement.getBoundingClientRect().toJSON(),parentBuildingId:element.parentElement.dataset.buildingId,parentSource:element.parentElement.dataset.buildingNativeSource,parentOpacity:getComputedStyle(element.parentElement).opacity,ownOpacity:getComputedStyle(element).opacity}));
 assert.equal(report.native.parentBuildingId,definition.buildingId);assert.equal(report.native.parentSource,definition.buildingSource);assert.equal(report.native.viewBox,'0 0 520 512');await readFrame();
 check('native child uses exact parent building extent without multiplying opacity',Math.abs(report.native.rect.width-report.native.parentRect.width)<.1&&Math.abs(report.native.rect.height-report.native.parentRect.height)<.1&&report.native.ownOpacity==='1',report.native);
 await capture('00-context',page);
 const seen=new Set();
 for(let attempt=0;attempt<20&&seen.size<6;attempt++){
  await tick(130);const observed=await readFrame();report.frameObservations.push(observed);
  if(!seen.has(observed.index)){seen.add(observed.index);await capture('frame-'+observed.index);}
 }
 check('six distinct native flame drawings are painted on the actual building',seen.size===6&&[...seen].sort((a,b)=>a-b).every((value,index)=>value===index),{frames:[...seen]});
 await page.getByRole('button',{name:'Pause',exact:true}).click();await tick(150);const pausedFrame=await fire.getAttribute('data-forge-native-frame');await tick(2000);
 check('game pause holds native frame',pausedFrame===await fire.getAttribute('data-forge-native-frame'),{frame:pausedFrame});await capture('pause');
 await page.getByRole('button',{name:'Reprendre',exact:true}).click();await page.locator('[data-homeworld-viewport]').focus();await tick(180);assert.equal(await page.getByRole('button',{name:'Pause',exact:true}).count(),1);
 await page.emulateMedia({reducedMotion:'reduce'});await tick(180);const reducedSamples=[];
 for(let index=0;index<6;index++){await tick(130);reducedSamples.push(await readFrame());}
 check('reduced motion holds first native drawing',reducedSamples.every(row=>row.index===0),{samples:reducedSamples});await capture('reduced-motion');
 await page.waitForLoadState('networkidle',{timeout:15000});phase='missing-flame';
 const flamePattern=await installRefusal('missing-flame');await page.clock.resume();
 await navigate('reload','missing-flame');await page.locator('[data-campaign-menu="main"]').waitFor();await enter();await awaitConsumedRefusal('missing-flame');await page.waitForTimeout(1200);
 assert(await page.locator('[data-homeworld-hub]').isVisible());assert(await building.isVisible());
 const staticSource=await building.getAttribute('data-building-native-source');assert.equal(staticSource,definition.buildingSource);
 report.staticFacadeDecoded=await page.evaluate(async source=>{const image=new Image();image.src=source;await image.decode();return image.naturalWidth>0&&image.naturalHeight>0;},staticSource);assert(report.staticFacadeDecoded);
 check('a missing native flame retains the existing static building and omits overlay',await building.count()===1&&await fire.count()===0);await capture('missing-resource-static');
 await page.waitForLoadState('networkidle',{timeout:15000});await page.unroute(flamePattern);phase='ordinary-recovery';
 await navigate('reload','native-flame-restored');await page.locator('[data-campaign-menu="main"]').waitFor();await enter();await fire.waitFor({timeout:120000});report.restoredNativeFrame=await readFrame();
 await page.waitForLoadState('networkidle',{timeout:15000});phase='missing-facade';await installRefusal('missing-facade');
 await navigate('reload','missing-facade');await page.locator('[data-campaign-menu="main"]').waitFor();await page.getByRole('button',{name:/^Continuer/}).click();
 await page.locator('[data-homeworld-hub]').waitFor();await awaitConsumedRefusal('missing-facade');await page.waitForTimeout(1500);
 assert(await page.locator('[data-homeworld-hub]').isVisible());assert.equal(await building.count(),1);
 report.facadeRefusalState={motionReady:await page.locator('[data-homeworld-hub]').getAttribute('data-homeworld-motion-ready'),buildingSource:await building.getAttribute('data-building-native-source'),scope:'Observed loading/unavailable context, not a successful global-readiness recovery'};
 check('missing facade atlas prevents orphan flame',await fire.count()===0);await capture('missing-facade-no-orphan-fire',page);
 await page.waitForLoadState('networkidle',{timeout:15000});
}catch(error){
 report.failure={message:error.message,stack:error.stack};report.failureVisibleText=await page.locator('body').innerText().catch(()=>null);
 await capture('failure-visible-state',page).catch(captureError=>{report.failureCaptureError=String(captureError);});
}finally{
 try{await context.close();}catch(error){report.failure??={message:error.message,stack:error.stack};}
 try{await browser.close();}catch(error){report.failure??={message:error.message,stack:error.stack};}
 try{
  report.sourceAfter=await snapshot();report.assetsAfter=await snapshotAssets();
  assert.deepEqual(report.sourceBefore,report.sourceAfter,'Observed local QA inputs changed during the recipe');
  assert.deepEqual(report.assetsBefore,report.assetsAfter,'Observed native asset bytes changed during the recipe');
  report.sourceUnchanged=true;report.assetsUnchanged=true;
 }catch(error){report.sourceUnchanged=false;report.assetsUnchanged=false;report.failure??={message:error.message,stack:error.stack};}
 report.errorClassification=classifyNetworkRefusals(report);
 try{
  for(const rows of Object.values(report.errorClassification.ordinary))assert.equal(rows.length,0,'An ordinary error remains in the unfiltered Forge records');
  assert.deepEqual(report.errorClassification.unmatchedAborts,[],'Every declared abort must have its actual failed-request record');
  for(const fixture of report.declaredNetworkRefusals)assert(report.networkRefusalObservations.some(row=>row.fixtureId===fixture.id),'Every refusal must be actually consumed');
  if(!report.failure){assert.equal(report.checks.length,7,'All seven targeted criteria must complete');assert.equal(captures.length,11,'All eleven original captures must complete');assert.equal(new Set(captures.map(row=>row.file)).size,11);}
 }catch(error){report.failure??={message:error.message,stack:error.stack};}
 report.status=report.failure?'FAIL':mode==='compiled-app'?'PASS_TARGETED_COMPILED_APP':'PASS_TARGETED_EXPLORATORY';report.endedAt=new Date().toISOString();
 await fs.writeFile(path.join(output,'result.json'),JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({status:report.status,output,checks:report.checks.length,captures:captures.length,failure:report.failure??null,rawConsoleErrors:report.consoleErrors.length,rawRequestFailures:report.requestFailures.length,ordinaryErrors:Object.fromEntries(Object.entries(report.errorClassification.ordinary).map(([key,value])=>[key,value.length])),sourceUnchanged:report.sourceUnchanged}));
 if(report.failure)process.exitCode=1;
}
