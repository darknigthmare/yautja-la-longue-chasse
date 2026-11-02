/** Bounded visual/interaction comparison, never a V112 production certificate.
 * Every camera starts at an explicitly declared supported campaign checkpoint.
 * Walking and the dock door below use the real keyboard/Worker/UI afterward. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';
import {chromium} from 'playwright-core';
import {homeworldQaModelV64} from './homeworld-qa-model-v64.mjs';

const driver='scripts/qa-homeworld-marsh-ground-joints-v113.mjs';
const root=fileURLToPath(new URL('..',import.meta.url)),baseUrl=process.env.YAUTJA_QA_BASE_URL??'http://127.0.0.1:3105';
assert(['127.0.0.1','localhost'].includes(new URL(baseUrl).hostname));
const requestedMode=process.env.YAUTJA_QA_MODE??'development';
assert(['compiled-app','development','exploratory'].includes(requestedMode),'Unknown QA mode');
const mode=requestedMode==='compiled-app'?'compiled-app':'development';
const buildId=process.env.YAUTJA_QA_BUILD_ID??null,runtimeCommit=process.env.YAUTJA_QA_RUNTIME_COMMIT??null;
if(mode==='compiled-app'){
 assert(typeof buildId==='string'&&buildId.trim()===buildId&&buildId.length>0&&buildId!=='development','Compiled QA requires the real non-development Build ID');
 assert.match(runtimeCommit??'',/^[a-f0-9]{40}$/,'Compiled QA requires the exact runtime commit');
}
const phase=process.env.YAUTJA_MARSH_PHASE??'after';assert(['before','after'].includes(phase));
const output=path.resolve(process.env.YAUTJA_MARSH_OUTPUT??path.join(root,'outputs/qa-v113/marsh-ground-joints-'+phase));
// Legacy played-route fixture modules resolve their local TS inputs from cwd.
// Import them only after the portable root and compiled-mode guards are known.
process.chdir(root);
const {firstTracksCompleted}=await import('../tests/helpers/solo-v67-campaign-route.mjs');
await fs.mkdir(output,{recursive:true});assert.equal((await fs.readdir(output)).length,0,'Preserve every previous attempt');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const sourceFiles=['app/game/HomeworldWorldSceneV77.tsx','app/game/systems/homeworldWorldV77.ts','app/game/systems/homeworldMarshGroundJointsV113.ts','app/game/systems/homeworldGeometryRecoveryV112.ts','tests/helpers/solo-v67-campaign-route.mjs',driver];
const snapshot=()=>Promise.all(sourceFiles.map(async file=>{const bytes=await fs.readFile(path.join(root,file));return{file,bytes:bytes.length,sha256:sha(bytes)};}));
const sourceBefore=await snapshot();
const driverPin=sourceBefore.find(row=>row.file===driver);
// Next embeds the build token in escaped Flight strings as well as ordinary
// JSON. Match its complete value, rather than a substring or a build label.
function htmlBuildIdentity(html){
 const observedBuildIds=[...new Set([...html.matchAll(/(?:\\)*"(?:buildId|b)(?:\\)*"\s*:\s*(?:\\)*"([^"\\]+)(?:\\)*"/g)].map(row=>row[1]))];
 return{expectedBuildId:buildId,observedBuildIds,observedBuildId:observedBuildIds.length===1?observedBuildIds[0]:null,
  foundInHtml:!!buildId&&html.includes(buildId),buildIdVerified:!!buildId&&observedBuildIds.length===1&&observedBuildIds[0]===buildId&&html.includes(buildId)};
}
const api=homeworldQaModelV64(root,['homeworldCivicWorldV80.ts','homeworldGeometryV64.ts','homeworldWorldV77.ts','homeworldMarshGroundJointsV113.ts','homeworldInteriorsV64.ts','homeworldPublicLifeV112.ts']);
const bootstrap=await build({stdin:{contents:"import * as save from './app/game/save';import * as slots from './app/game/systems/campaignSlots';import * as location from './app/game/systems/homeworldLocationV77';window.__marshFixtureV113={...save,...slots,...location};",resolveDir:root,loader:'ts'},bundle:true,write:false,format:'iife',platform:'browser',target:'es2022',logLevel:'silent'});
const checks=[],captures=[],fixtures=[],responses=[],errors=[],consoleErrors=[],workerErrors=[],requestsFailed=[],httpErrors=[];
const check=(name,ok,detail)=>{checks.push({name,status:ok?'PASS':'FAIL',detail});assert(ok,name);console.log('PASS '+name);};
const browser=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage','--mute-audio']});
let failure=null,scenariosCompleted=false;
async function scenario(name,point,width=1440,height=1050,run){
 assert(api.homeworldCivicWalkableV80('0',point),'Supported declared camera fixture');
 const context=await browser.newContext({viewport:{width,height},reducedMotion:'reduce'}),page=await context.newPage();page.setDefaultTimeout(45000);
 page.on('pageerror',e=>errors.push({scenario:name,message:e.message}));
 page.on('console',m=>{if(m.type()==='error')consoleErrors.push({scenario:name,message:m.text()});});
 page.on('requestfailed',r=>requestsFailed.push({scenario:name,url:r.url(),failure:r.failure()}));
 page.on('response',r=>{if(r.status()>=400)httpErrors.push({scenario:name,url:r.url(),status:r.status()});});
 await page.exposeFunction('__marshWorkerErrorV113',e=>workerErrors.push({scenario:name,...e}));
 await context.addInitScript(()=>{const WorkerClass=window.Worker;window.Worker=class extends WorkerClass{
  constructor(url,options){try{super(url,options);}catch(e){void window.__marshWorkerErrorV113({kind:'constructor',url:String(url),message:String(e)});throw e;}
   this.addEventListener('error',e=>void window.__marshWorkerErrorV113({kind:'event',message:e.message}));}
 };});
 await page.clock.install();
 const tick=async(ms=60)=>{await page.clock.runFor(ms);await new Promise(resolve=>setTimeout(resolve,2));};
 const actor=()=>page.locator('[data-homeworld-actor]').evaluate(e=>({x:Number(e.dataset.x),y:Number(e.dataset.y)}));
 const focus=async()=>{await page.locator('[data-homeworld-viewport]').focus();await tick(35);};
 async function title(){
  const response=await page.goto(baseUrl,{waitUntil:'domcontentloaded',timeout:120000});assert(response?.ok());
  const html=await response.text(),identity=htmlBuildIdentity(html);
  responses.push({scenario:name,url:response.url(),status:response.status(),htmlSha256:sha(html),...identity});
  if(mode==='compiled-app')assert(identity.buildIdVerified,'Served HTML must identify the exact requested compiled build');
  await page.locator('[data-campaign-menu="main"]').waitFor({timeout:120000});
 }
 async function capture(label){
  await tick();check(name+' actual scene remains visible',await page.locator('[data-homeworld-hub]').isVisible()&&await page.getByText('Build Error',{exact:true}).count()===0);
  const file=name+'-'+label+'.png';await page.screenshot({path:path.join(output,file)});const bytes=await fs.readFile(path.join(output,file));
  const camera=await page.locator('[data-homeworld-camera-mode]').evaluate(e=>({zoom:e.dataset.homeworldCameraZoom,style:e.getAttribute('style')}));
  captures.push({file,bytes:bytes.length,sha256:sha(bytes),camera,actor:await actor()});
 }
 async function steer(target,allowBlocked=false){let held=[],prior=null,stalled=0;await focus();try{for(let i=0;i<1800;i++){
  const p=await actor(),dx=target.x-p.x,dy=target.y-p.y;if(Math.hypot(dx,dy)<=5)return{...p,arrived:true,steps:i};
  stalled=prior&&Math.hypot(p.x-prior.x,p.y-prior.y)<.05?stalled+1:0;prior=p;
  if(stalled>90){if(allowBlocked)return{...p,arrived:false,blocked:true,steps:i};throw Error('Real native crossing is blocked: '+JSON.stringify({target,p}));}
  const keys=[...(Math.abs(dx)>1?[dx>0?'ArrowRight':'ArrowLeft']:[]),...(Math.abs(dy)>1?[dy>0?'ArrowDown':'ArrowUp']:[])];
  for(const key of held)if(!keys.includes(key))await page.keyboard.up(key);for(const key of keys)if(!held.includes(key))await page.keyboard.down(key);held=keys;
  await tick(Math.hypot(dx,dy)<30?17:10);if(Math.hypot(dx,dy)<30){for(const key of held)await page.keyboard.up(key);held=[];await tick(45);}
 }throw Error('Bounded native lane walk timed out');}finally{for(const key of held)await page.keyboard.up(key);await tick(45);}}
 async function guideToDoor(){
  const target='building:dock-control';await page.locator('[data-world-atlas-button-v77]').click();await tick();const atlas=page.getByRole('dialog',{name:'Carte des étages de la cité',exact:true});
  await atlas.getByRole('searchbox').fill('');await atlas.locator(`[data-map-landmark-v83="${target}"]`).click();await tick();await atlas.getByRole('button',{name:'Suivre ce repère à pied',exact:true}).click();
  const guide=page.locator(`[data-homeworld-route-guide-v109][data-homeworld-route-target-v98="${target}"]`);await guide.waitFor();await focus();
  let walked=0,prior=await actor();
  for(let i=0;i<2500;i++){
   const p=await actor();walked+=Math.hypot(p.x-prior.x,p.y-prior.y);prior=p;
   const g=await guide.evaluate(e=>({state:e.dataset.homeworldRouteGuideV109,current:e.dataset.homeworldRouteCurrentV109,x:Number(e.dataset.homeworldRouteNextXV109),y:Number(e.dataset.homeworldRouteNextYV109)}));
   assert.equal(g.current,'true');assert.notEqual(g.state,'off-route');if(g.state==='arrived')return{walked,steps:i,actor:p};
   if(!Number.isFinite(g.x)||!Number.isFinite(g.y)){await tick();continue;}
   const keys=[...(Math.abs(g.x-p.x)>1?[g.x>p.x?'ArrowRight':'ArrowLeft']:[]),...(Math.abs(g.y-p.y)>1?[g.y>p.y?'ArrowDown':'ArrowUp']:[])];
   try{for(const key of keys)await page.keyboard.down(key);await tick(17);}finally{for(const key of keys)await page.keyboard.up(key);await tick(45);}
  }throw Error('Bounded real Worker guide timed out');
 }
 try{
  await title();await page.addScriptTag({content:bootstrap.outputFiles[0].text});
  await page.evaluate(async({source,point,name})=>{
   const q=window.__marshFixtureV113,defaults=q.defaultSave(source.createdAt),save=q.normalizeSave({...defaults,...source,inventory:{...defaults.inventory,...source.inventory,fieldToolIds:['flaying-tool']}});
   save.profile.hunterName=('Marsh V113 '+name).slice(0,32);save.settings.masterVolume=0;save.homeworld.visitedDistrictIds=['port','market','forges','memory','terraces','temple','enforcers','citadel','undercity'];
   save.homeworld.locationV77=q.createHomeworldCheckpointV77(save.createdAt,'0',point,null,point);
   if(!q.parseSaveImport(JSON.stringify(save)).save)throw Error('Invalid declared camera fixture');
   localStorage.setItem(q.SAVE_STORAGE_KEY,JSON.stringify(save));const migration=await q.migrateLegacyCampaignSlot();if(!migration.ok)throw Error(migration.message);
   const saved=await q.saveCampaignCheckpoint(1,{kind:'manual',index:1,location:'homeworld',expectedRevision:q.loadCampaignSlots().slots[0].revision});if(!saved.ok)throw Error(saved.message);
  },{source:firstTracksCompleted(),point,name});
  fixtures.push({name,point,levelId:'0',width,height,scope:'Declared normalized checkpoint only; not travel between cameras or played First Tracks'});
  await title();await page.getByRole('button',{name:/^Continuer/}).click();await page.locator('[data-homeworld-hub][data-homeworld-motion-ready="true"]').waitFor({timeout:120000});
  await page.clock.pauseAt(await page.evaluate(()=>Date.now()+1000));await focus();
  const p=await actor();check(name+' restores exact declared physical checkpoint',Math.hypot(p.x-point.x,p.y-point.y)<=2,{expected:point,actual:p});
  const count=await page.locator('[data-world-ground-id-v77^="ground-joint-v113:"]').count();check(name+' mounts expected comparison renderer',phase==='before'?count===0:count>0,{phase,count});
  await capture('camera');if(run)await run({page,tick,actor,focus,capture,steer,guideToDoor});
 }catch(error){
  try{const file=name+'-failed-state.png';await page.screenshot({path:path.join(output,file)});const bytes=await fs.readFile(path.join(output,file));captures.push({file,bytes:bytes.length,sha256:sha(bytes),failureState:true});}catch{}
  throw error;
 }finally{await context.close();}
}
try{
 for(const [name,point,width,height]of[
  ['central',{x:6473,y:2800}],['rampart-upper-end',{x:6300,y:2200}],['rampart-lower-end',{x:6300,y:3350}],
  ['dock-upper-end',{x:6500,y:2500}],['dock-lower-end',{x:6500,y:3120}],['central-mobile',{x:6473,y:2800},390,844],
 ])await scenario(name,point,width,height);
 for(const route of[
  {name:'cross-rampart-upper',from:{x:6175,y:2500},to:{x:6080,y:2500}},
  {name:'cross-rampart-lower',from:{x:6175,y:3250},to:{x:6050,y:3250}},
  {name:'cross-dock-road',from:{x:6600,y:2700},to:{x:6750,y:2700}},
 ])await scenario(route.name,route.from,1440,1050,async f=>{
  const start=await f.actor(),outward=await f.steer(route.to,phase==='before');
  check(route.name+' actual physical crossing follows served geometry',phase==='before'?outward.blocked&&!outward.arrived:outward.arrived,{phase,start,target:route.to,outward});
  const returned=await f.steer(start);check(route.name+' native return reaches the original side',returned.arrived,{start,returned});await f.capture('returned');
 });
 const circuit=api.HOMEWORLD_PUBLIC_LIFE_V112.find(row=>row.id.endsWith(':marsh-watch'));
 await scenario('marsh-watch-return',circuit.path[0],1440,1050,async f=>{
  const start=await f.actor(),end=circuit.path.at(-1);await f.steer(end);const there=await f.actor();check('real marsh-watch lane outward traversal',Math.hypot(there.x-start.x,there.y-start.y)>180,{start,there});
  await f.steer(start);check('real marsh-watch lane return traversal',Math.hypot((await f.actor()).x-start.x,(await f.actor()).y-start.y)<=6);await f.capture('returned');
 });
 await scenario('dock-door',{x:6473,y:2800},1440,1050,async f=>{
  const guided=await f.guideToDoor();check('real Worker reaches the retained dock door',guided.walked>300&&await f.page.locator('[data-homeworld-door-id="dock-control"]').count()===1,guided);
  await f.capture('door-approach');await f.focus();await f.page.keyboard.press('KeyE');await f.tick(200);
  await f.page.locator('[data-homeworld-hub][data-homeworld-interior-id="dock-control"]').waitFor();check('real E enters retained dock-control interior',true);await f.capture('entered');
  const room=api.homeworldInteriorForBuildingV64('dock-control');await f.steer({x:room.exit.x,y:room.exit.y-8});
  check('retained dock exit is actually reachable',await f.page.locator('[data-homeworld-interior-target="exit"]').count()===1);
  await f.focus();await f.page.keyboard.press('KeyE');await f.tick(200);await f.page.locator('[data-homeworld-hub]:not([data-homeworld-interior-id])').waitFor();
  check('real E returns through the retained dock door',true);await f.capture('returned-outside');
 });
 scenariosCompleted=true;
}catch(error){failure={message:error.message,stack:error.stack};}
finally{
 try{await browser.close();}catch(error){failure??={message:error.message,stack:error.stack};}
 let sourceAfter=[];
 try{
  sourceAfter=await snapshot();assert.deepEqual(sourceBefore,sourceAfter,'Observed local QA inputs changed during the recipe');
  if(scenariosCompleted){
   check('no page error',errors.length===0,errors);check('no console.error',consoleErrors.length===0,consoleErrors);check('no Worker error',workerErrors.length===0,workerErrors);check('no failed request',requestsFailed.length===0,requestsFailed);check('no HTTP error',httpErrors.length===0,httpErrors);
  }
  if(!failure){assert.equal(checks.length,57,'All 57 targeted criteria must complete');assert.equal(captures.length,18,'All 18 targeted captures must complete');}
 }catch(error){failure??={message:error.message,stack:error.stack};}
 const result={schemaVersion:1,release:'V113',domain:'Homeworld marsh ground joints V113',completeRecipe:false,
  status:failure?'FAIL':mode==='compiled-app'?'PASS_TARGETED_COMPILED_APP':'PASS_TARGETED_EXPLORATORY',phase,baseUrl,
  production:{mode,runtimeCommit,buildId,servedBuilds:responses},driver:driverPin,
  invocation:{command:'node '+driver,environment:{YAUTJA_QA_MODE:mode,YAUTJA_QA_BASE_URL:baseUrl,YAUTJA_QA_BUILD_ID:buildId,YAUTJA_QA_RUNTIME_COMMIT:runtimeCommit,YAUTJA_MARSH_PHASE:phase,YAUTJA_MARSH_OUTPUT:output}},
  scope:'Bounded comparison at six declared cameras, three real fissure crossings/returns (old-layout refusal expected only in before), native marsh-watch return and Worker-guided dock-door entry/exit. Initial checkpoints are explicit fixtures. This is not a complete Homeworld campaign or V112 production certificate; no artwork validated status.',
  sourceObservationScope:'Five local application/fixture inputs plus this driver are fingerprinted. This is not the complete served runtime inventory. In before, these local V113 comparison inputs are not claimed as the separately identified baseline server sources.',
  sourceBefore,sourceAfter,fixtures,responses,checks,captures,errors,consoleErrors,workerErrors,requestsFailed,httpErrors,failure};
 await fs.writeFile(path.join(output,'result.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({status:result.status,checks:checks.length,captures:captures.length,output,failure}));if(failure)process.exitCode=1;
}
