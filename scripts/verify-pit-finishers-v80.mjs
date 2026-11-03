import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
import {homeworldSceneSsrV78} from '../tests/helpers/homeworld-scene-ssr-v78.mjs';
import {selectPitMatch,openPitSelectionOptions,closePitSelectionOptions} from './pit-selection-browser-helpers.mjs';

const base=process.env.V80_QA_BASE||'http://localhost:4204';
const output=path.resolve(process.env.V80_QA_OUTPUT||'work-local/v80/qa/pit-finishers-local');
assert(output.startsWith(path.resolve('work-local/v80/qa')+path.sep),'V80 output must be new and isolated');
assert(!fs.existsSync(path.join(output,'report.json')),'Preserve existing evidence; choose a new output directory');
const publicRun=base.startsWith('https:'),candidateId=process.env.V80_CANDIDATE_ID||'v80-local';
const sourceSha=process.env.V80_EXPECTED_SOURCE_SHA||null;
const startedAt=new Date().toISOString();
const expectedOrigin=process.env.V80_EXPECTED_PRODUCTION_ORIGIN||'https://yautja-la-longue-chasse.vercel.app';
let deployment=null;
if(publicRun){
 assert.equal(new URL(base).origin,expectedOrigin,'HTTPS must use the explicitly named production alias');
 assert(sourceSha&&/^[0-9a-f]{40}$/.test(sourceSha));assert(process.env.V80_CANDIDATE_ID);
 assert(process.env.V80_DEPLOYMENT_FILE,'HTTPS needs an immutable provider READY observation');
 deployment=JSON.parse(fs.readFileSync(process.env.V80_DEPLOYMENT_FILE,'utf8'));
 assert.equal(deployment.state??deployment.readyState??deployment.deployment?.readyState,'READY');
 assert.equal(deployment.sha??deployment.sourceSha??deployment.gitSource?.sha??deployment.deployment?.gitSource?.sha??deployment.deployment?.meta?.githubCommitSha,sourceSha);
 const observedAt=deployment.checkedAt??deployment.observedAt;
 assert(Number.isFinite(Date.parse(observedAt))&&Date.parse(observedAt)<=Date.parse(startedAt),'READY must have been observed before this fresh QA run');
 assert((deployment.aliases??deployment.deployment?.alias??[]).includes(new URL(base).hostname),'Provider observation must name this alias');
}
fs.mkdirSync(output,{recursive:true});
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const sourceFiles=['app/game/PitCanvas.tsx','app/game/PitFinisherHudV80.tsx','app/game/PitFinishersV80.module.css','app/globals.css','app/game/pitFinisherRenderingV80.ts','app/game/systems/pitFinishersV80.ts','app/game/data/pitFinishersV80.json','app/game/systems/pitCombat.ts','app/game/systems/pitReplay.ts','app/game/systems/pitSave.ts','app/game/systems/pitReplayStorage.ts','app/game/GameClient.tsx','app/game/buildInfo.ts'];
const snapshot=()=>Object.fromEntries(sourceFiles.map(file=>[file,hash(fs.readFileSync(file))]));
const blobBindings=publicRun?sourceFiles.map(file=>{
 const blob=execFileSync('git',['show',`${sourceSha}:${file}`]),workspace=fs.readFileSync(file);
 const normalizedBlob=blob.toString('utf8').replaceAll('\r\n','\n'),normalizedWorkspace=workspace.toString('utf8').replaceAll('\r\n','\n');
 assert.equal(normalizedWorkspace,normalizedBlob,`Workspace source differs from exact published commit: ${file}`);
 return{file,commit:sourceSha,blobSha256:hash(blob),blobBytes:blob.length,workspaceSha256:hash(workspace),workspaceBytes:workspace.length,
  normalizedSha256:hash(Buffer.from(normalizedBlob)),allowedNormalization:'CRLF_TO_LF_ONLY'};
}):[];
const report={version:'V80',candidateId,expectedSourceSha:sourceSha,expectedOrigin,base,startedAt,kind:publicRun?'actual-HTTPS-GameClient':'actual-framework-GameClient',deployment,blobBindings,
 fixtures:['Fresh defaultSave legacy deck in owned incognito context; not a campaign played to completion.','Playwright clock controls real RAF/timers after assets ready. Each combat engine tick and KO comes from actual keyboard inputs; no HP, actor, match phase, winner, result, replay or finishing-state injection.','No hardware gamepad claim. Four choices use real UI/keyboard; gamepad remains separately model-tested.'],sourceBefore:snapshot(),checks:[],captures:[],contexts:[],transitions:[]};
const persist=()=>fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(report,null,2));
const check=(name,detail={})=>{report.checks.push({name,detail,at:new Date().toISOString()});persist();console.log('PASS '+name);};
const loader=homeworldSceneSsrV78(),saveApi=loader.load('app/game/save.ts'),pitSaveApi=loader.load('app/game/systems/pitSave.ts'),pitReplayApi=loader.load('app/game/systems/pitReplayStorage.ts');
const browser=await chromium.connectOverCDP(process.env.V80_CDP||'http://127.0.0.1:58677');
const contexts=[];let currentPage,sequence=0;
function read(){
 const root=document.querySelector('[data-pit-immersive]'),canvas=root?.querySelector('canvas[data-pit-fighter-positions]');
 const visibleRect=node=>{if(!node)return null;const r=node.getBoundingClientRect();return r.width>0&&r.height>0?{left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height}:null;};
 const finishingControls=[...root?.querySelectorAll('button[data-pit-finisher-choice],button[data-pit-finisher-skip],button[data-pit-menu-button]')||[]].map(node=>{
  const r=node.getBoundingClientRect(),hit=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);
  return{kind:node.hasAttribute('data-pit-finisher-skip')?'skip':node.hasAttribute('data-pit-menu-button')?'menu':'choice',choice:node.dataset.pitFinisherChoice,
   disabled:node.disabled,left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height,
   insideViewport:r.left>=0&&r.top>=0&&r.right<=innerWidth&&r.bottom<=innerHeight,centerHit:!!hit&&(hit===node||node.contains(hit))};
 });
 return{phase:root?.dataset.pitCombatPhase,presentation:root?.dataset.pitPresentationPhase,frame:Number(root?.querySelector('[data-pit-frame]')?.dataset.pitFrame),round:Number(root?.dataset.pitPresentationRound),
  positions:JSON.parse(canvas?.dataset.pitFighterPositions||'[]'),hp:[...root?.querySelectorAll('[role="progressbar"][aria-label^="Vie de"]')||[]].map(node=>Number(node.getAttribute('aria-valuenow'))),
  finisher:canvas?.dataset.pitFinisherPhase,family:canvas?.dataset.pitFinisherFamily,choice:canvas?.dataset.pitFinisherChoice,paused:root?.dataset.pitPaused,
  nonlethal:root?.querySelector('[data-pit-finisher-hud]')?.dataset.nonlethal,resultDialogs:root?.querySelectorAll('[aria-labelledby="pit-result"]').length??0,
  touchControlsCount:root?.querySelectorAll('[aria-label="Commandes tactiles"]').length??0,finishingControls,
  finishingHudRect:visibleRect(root?.querySelector('[data-pit-finisher-hud]')),toastRect:visibleRect(document.querySelector('.game-shell > .toast')),
  contentVersion:document.querySelector('[data-game-content-version]')?.dataset.gameContentVersion,stageMissing:Number(canvas?.dataset.pitArenaMissingAssets),stageStatus:canvas?.dataset.pitArenaArtStatus,
  bitmapStatuses:[...root?.querySelectorAll('[data-pit-bitmap-status]')||[]].map(node=>({slot:Number(node.dataset.pitBitmapSlot),id:node.dataset.pitBitmapId,status:node.dataset.pitBitmapStatus})),
  storage:Object.fromEntries(Object.keys(localStorage).filter(key=>key.startsWith('yautja-long-hunt.the-pit.')).map(key=>[key,JSON.parse(localStorage.getItem(key))]))};
}
async function tick(page,ms=100){await page.clock.runFor(ms);await new Promise(resolve=>setTimeout(resolve,3));}
async function capture(page,label){
 const filename=String(++sequence).padStart(2,'0')+'-'+label+'.png',filepath=path.join(output,filename);
 const state=await page.evaluate(read);
 if(label!=='FAIL'){
  assert.equal(state.contentVersion,'V80');assert.equal(state.stageMissing,0);assert.equal(state.stageStatus,'bitmap');
  assert.equal(state.bitmapStatuses.length,2);assert(state.bitmapStatuses.every(item=>!['loading','missing','none'].includes(item.status)));
  if(state.phase==='match-over')assert.equal(state.touchControlsCount,0,'Combat touch pads are unmounted during finishing and results');
  if(state.nonlethal!==undefined&&state.paused==='false'){
   for(const control of state.finishingControls){assert(control.insideViewport,'Every finishing control remains within the real viewport');if(!control.disabled)assert(control.centerHit,'A real finishing control center must not be intercepted');}
   const skip=state.finishingControls.find(c=>c.kind==='skip'),menu=state.finishingControls.find(c=>c.kind==='menu');assert(skip&&menu,'Skip and pause remain present');
   const overlap=Math.max(0,Math.min(skip.right,menu.right)-Math.max(skip.left,menu.left))*Math.max(0,Math.min(skip.bottom,menu.bottom)-Math.max(skip.top,menu.top));assert.equal(overlap,0,'Skip and MENU must not paint over each other');
  }
  if(state.toastRect&&state.finishingHudRect){const toast=state.toastRect,hud=state.finishingHudRect;const toastOverlap=Math.max(0,Math.min(toast.right,hud.right)-Math.max(toast.left,hud.left))*Math.max(0,Math.min(toast.bottom,hud.bottom)-Math.max(toast.top,hud.top));assert.equal(toastOverlap,0,'Victory status must not paint over the actual finishing HUD, including pause');}
 }
 await page.screenshot({path:filepath,fullPage:true});report.captures.push({filename,filepath,label,diagnosticOnly:label==='FAIL',capturedAt:new Date().toISOString(),sha256:hash(fs.readFileSync(filepath)),contentVersion:state.contentVersion,state,visuallyReviewed:false});persist();
}
async function until(page,predicate,limit=15000){for(let ms=0;ms<=limit;ms+=100){const state=await page.evaluate(read);if(predicate(state))return state;await tick(page);}throw Error('Real UI state did not settle: '+JSON.stringify(await page.evaluate(read)));}
async function input(page,code,ms=25){await page.keyboard.down(code);await tick(page,ms);await page.keyboard.up(code);}
async function pause(page){await page.locator('[data-pit-menu-button]').click();await tick(page,25);await page.locator('[data-pit-pause-menu]').waitFor({state:'visible'});}
async function resume(page){await page.locator('[data-pit-pause-menu] [data-pit-resume]').click();await tick(page,25);await page.waitForFunction(()=>document.activeElement?.getAttribute('aria-label')==='Combat THE PIT');}
async function duel(page,winner,cpu=false){
 let movement=null;
 for(let ms=0;ms<180000;ms+=150){
  const state=await page.evaluate(read);if(state.phase==='match-over'){if(movement)await page.keyboard.up(movement);return state;}
  const delta=(state.positions[1-winner]?.x??0)-(state.positions[winner]?.x??0);
  const next=state.presentation==='fight'&&Math.abs(delta)>62?(winner===0?(delta>0?'ArrowRight':'ArrowLeft'):(delta>0?'Numpad6':'Numpad4')):null;
  if(next!==movement){if(movement)await page.keyboard.up(movement);if(next)await page.keyboard.down(next);movement=next;}
  if(!cpu&&state.presentation==='fight'&&Math.abs(delta)<=64)await input(page,winner===0?'KeyL':'Numpad5');
  await tick(page,150);
 }
 throw Error('No genuine final KO within180s browser time');
}
async function launch(spec){
 const context=await browser.newContext({viewport:spec.mobile?{width:390,height:844}:{width:1440,height:900},isMobile:!!spec.mobile,hasTouch:!!spec.mobile,reducedMotion:spec.reducedMotion?'reduce':'no-preference'});contexts.push(context);
 const page=await context.newPage();currentPage=page;page.setDefaultTimeout(60000);const errors=[];
 page.on('pageerror',error=>errors.push({kind:'pageerror',text:error.message,at:new Date().toISOString()}));page.on('response',response=>{if(response.status()>=400)errors.push({kind:'http',status:response.status(),url:response.url(),at:new Date().toISOString()});});
 page.on('console',message=>{if(message.type()==='error')errors.push({kind:'console',text:message.text(),at:new Date().toISOString()});});
 page.on('requestfailed',request=>errors.push({kind:'requestfailed',url:request.url(),resourceType:request.resourceType(),text:request.failure()?.errorText,at:new Date().toISOString()}));
 report.contexts.push({label:spec.name,errors});
 const save=saveApi.defaultSave(new Date().toISOString());save.settings.reducedGore=!!spec.reducedGore;save.settings.screenShake=false;
 await context.addInitScript(({key,save})=>localStorage.setItem(key,JSON.stringify(save)),{key:saveApi.SAVE_STORAGE_KEY,save});
 report.transitions.push({context:spec.name,kind:'document-navigation',url:base,at:new Date().toISOString(),allowance:'Only net::ERR_ABORTED for a document navigating to this exact URL within this transition; all other errors fail.'});
 await page.goto(base,{waitUntil:'networkidle',timeout:120000});await page.getByRole('button',{name:/^Continuer/}).click();
 await page.locator('[data-campaign-session][data-campaign-location="deck"]').waitFor();
 await page.getByRole('button',{name:'THE PIT · combat',exact:true}).click();
 await page.locator('[data-pit-character-chronicle-open]').waitFor();
 const actualVersion=await page.locator('[data-game-content-version]').first().getAttribute('data-game-content-version');assert.equal(actualVersion,'V80');report.actualVersion=actualVersion;
 await page.getByRole('radio',{name:spec.cpu?/^Duel CPU/:/^Versus local/}).click();
 await openPitSelectionOptions(page);await page.locator('[data-pit-finisher-mode]').selectOption(spec.off?'off':'stylized');await closePitSelectionOptions(page);
 await selectPitMatch(page,{player:'jungle-hunter',opponent:'city-hunter',arena:'the-pit'});
 await page.locator('[data-pit-immersive]').waitFor();await page.locator('[data-pit-match-loading]').waitFor({state:'detached'});
 await page.bringToFront();await page.locator('[data-pit-immersive]').focus();
 const now=await page.evaluate(()=>Date.now());await page.clock.install({time:now});await page.clock.pauseAt(now);
 return{page,context,errors,ownerCreatedAt:save.createdAt};
}
try{
 const cases=[0,1,2,3].map(choice=>({name:'choice-'+choice,choice,winner:choice===3?1:0,mobile:choice===2,reducedGore:choice===2,reducedMotion:choice===2}));
 cases.push({name:'skip',skip:true,winner:0},{name:'timeout',timeout:true,winner:0},{name:'cpu-winner',cpu:true,winner:0},{name:'disabled',off:true,winner:0});
 for(const spec of cases){
  const {page,context,errors,ownerCreatedAt}=await launch(spec);const terminal=await duel(page,spec.winner,spec.cpu);
  assert(terminal.hp.some(hp=>hp===0)&&terminal.hp.some(hp=>hp>0),'Real KO, not timeout');
  await until(page,state=>spec.off?state.resultDialogs===1:state.finisher==='window');
  if(!spec.off){
   const windowState=await page.evaluate(read);assert.equal(windowState.resultDialogs,0);await capture(page,spec.name+'-window');
   await pause(page);const frozen=await page.evaluate(read);await tick(page,900);const afterPause=await page.evaluate(read);
   // Transient GameClient status may expire during pause; every simulation,
   // receipt and control field remains compared, and visible geometry is gated.
   assert.deepEqual({...afterPause,toastRect:null},{...frozen,toastRect:null});await capture(page,spec.name+'-pause');await resume(page);
   check(spec.name+' pause freezes engine and finishing phase');
   if(spec.skip)await page.locator('[data-pit-finisher-skip]').click();
   else if(spec.timeout)await tick(page,5200);
   else if(spec.cpu){await until(page,state=>state.finisher==='signature');await capture(page,spec.name+'-signature');}
   else{
    await page.locator(`button[data-pit-finisher-choice="${spec.choice}"]`).click();await until(page,state=>state.finisher==='signature');
    const scene=await page.evaluate(read);assert.equal(scene.choice,String(spec.choice));assert.equal(scene.nonlethal,spec.reducedGore?'true':'false');assert.equal(scene.frame,terminal.frame);assert.deepEqual(scene.hp,terminal.hp);
    await tick(page,700);await capture(page,spec.name+'-signature');check(spec.name+' actual choice starts, unchanged KO frame/HP and explicit gore policy');
   }
  }
  await until(page,state=>state.resultDialogs===1,20000);const result=await page.evaluate(read);assert.equal(result.frame,terminal.frame);assert.deepEqual(result.hp,terminal.hp);await capture(page,spec.name+'-result');
  const statsKey=pitSaveApi.pitSaveStorageKey(ownerCreatedAt),replayKey=pitReplayApi.pitReplayStorageKey(ownerCreatedAt);
  assert.deepEqual(Object.keys(result.storage).sort(),[statsKey,replayKey].sort(),'Only the actual owner stats and recorded replay sidecars exist');
  const stats=result.storage[statsKey],recordedReplay=result.storage[replayKey];
  assert.equal(stats.ownerSaveCreatedAt,ownerCreatedAt);assert.equal(stats.sequence,1);assert.equal(stats.appliedResultIds.length,1);
  assert.equal(recordedReplay.ownerSaveCreatedAt,ownerCreatedAt);assert(recordedReplay.latestReplay,'A real recorded replay must accompany the actual match');
  await tick(page,1000);assert.deepEqual((await page.evaluate(read)).storage,result.storage);check(spec.name+' real final result applied once and not changed by finishing clock',{terminal,result});
  if(spec.off){
   await page.getByRole('button',{name:'Revoir le duel',exact:true}).click();await page.locator('[data-pit-match-loading]').waitFor({state:'detached'});
   await until(page,state=>state.phase==='match-over',180000);await until(page,state=>state.resultDialogs===1,15000);
   const replay=await page.evaluate(read);assert.equal(replay.finisher,'complete');assert.deepEqual(replay.storage,result.storage);await capture(page,'replay-no-finisher');check('real recorded replay does not play or persist finishing again');
  }
  const hardErrors=errors.filter(error=>{
   const allowed=error.kind==='requestfailed'&&error.text==='net::ERR_ABORTED'&&error.resourceType==='document'&&report.transitions.some(transition=>transition.context===spec.name&&transition.kind==='document-navigation'&&transition.url===error.url&&Math.abs(Date.parse(error.at)-Date.parse(transition.at))<5000);
   if(allowed)error.documentedTransitionAbort=true;return !allowed;
  });
  assert.deepEqual(hardErrors,[],'No real page/console/request/HTTP errors except explicitly documented aborted document navigation');await context.close();
 }
 report.sourceAfter=snapshot();assert.deepEqual(report.sourceAfter,report.sourceBefore,'Sources changed during QA');report.status='PASS';
}catch(error){report.status='FAIL';report.failure={message:error.message,stack:error.stack};if(currentPage&&!currentPage.isClosed())await capture(currentPage,'FAIL').catch(()=>{});process.exitCode=1;}
finally{for(const context of contexts)await context.close().catch(()=>{});report.finishedAt=new Date().toISOString();report.allOwnedContextsClosed=contexts.every(context=>!browser.contexts().includes(context));persist();await browser.close();console.log(JSON.stringify({status:report.status,checks:report.checks.length,captures:report.captures.length,output}));}
