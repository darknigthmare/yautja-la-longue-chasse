import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright-core';
import {campaignFixture,enterCampaignDeck} from './campaign-browser-helpers.mjs';
import {choosePitFighter,choosePitStage,closePitSelectionOptions,openPitPause} from './pit-selection-browser-helpers.mjs';
import {verifyPitStoryIntroSamplesV61} from './lib/pit-stage-story-observation-v61.mjs';

const url=process.env.V61_STORY_QA_URL??'http://127.0.0.1:4177',version=process.env.V61_STORY_QA_VERSION??'V61';
const output=path.resolve(process.env.V61_STORY_QA_OUTPUT??'work-local/v61/qa/story-application');await fs.mkdir(output,{recursive:true});
const manifest=JSON.parse(await fs.readFile('app/game/data/pitStageStoryV61.json','utf8'));
const requested=(process.env.V61_STORY_QA_TARGETS??'all').split(','),cases=(process.env.V61_STORY_QA_CASES??'desktop,reduced,mobile,retry').split(',');
const targets=manifest.stages.filter(s=>s.events.every(e=>e.trigger!=='narrative-cue')&&(requested.includes('all')||requested.includes(s.stageId)||requested.includes(s.stageId.slice(6,9))));assert(targets.length);
const sourceFiles=['app/game/data/pitStageStoryV61.json','app/game/data/pitStageLifeV61.json','app/globals.css','app/game/PitCanvas.tsx','app/game/pitArenaRendering.ts','app/game/pitStageStoryV61.ts','app/game/pitStageStoryDirectorV61.ts','app/game/pitStageStoryRenderingV61.ts','app/game/pitStageLifeRenderingV61.ts','scripts/verify-pit-stage-story-v61.mjs','scripts/lib/pit-stage-story-observation-v61.mjs'];
const sha=value=>createHash('sha256').update(value).digest('hex');
const readHashes=async()=>Object.fromEntries(await Promise.all(sourceFiles.map(async p=>[p,sha(await fs.readFile(p))]))),sourceHashes=await readHashes();
const temp=path.resolve('work-local/v61/browser-temp');await fs.mkdir(temp,{recursive:true});process.env.TEMP=temp;process.env.TMP=temp;
let browser,context,page,intentionalFailure=null;const checks=[],captures=[],errors=[],httpFailures=[],failedRequests=[];let requests=[];
function observe(stages){
  const sources=new Map(stages.flatMap(s=>s.events.map(e=>[e.src,e]))),original=CanvasRenderingContext2D.prototype.drawImage;
  const store=window.__storyV61={draws:[],samples:[],invalid:[],last:'',seen:new Set()};
  store.read=()=>{const root=document.querySelector('[data-pit-immersive]'),canvas=root?.querySelector('canvas[data-pit-stage-story-v61-stage]');return {
    phase:root?.dataset.pitCombatPhase,presentation:root?.dataset.pitPresentationPhase,round:Number(root?.dataset.pitPresentationRound),
    frame:Number(root?.querySelector('[data-pit-frame]')?.dataset.pitFrame),timer:Number(root?.dataset.pitTimerFrames),paused:root?.dataset.pitPaused,
    stage:canvas?.dataset.pitStageStoryV61Stage,actors:Number(canvas?.dataset.pitStageStoryV61Actors),events:JSON.parse(canvas?.dataset.pitStageStoryV61Events||'[]'),
    missing:JSON.parse(canvas?.dataset.pitStageStoryV61Missing||'[]'),replaced:JSON.parse(canvas?.dataset.pitStageStoryV61Replaced||'[]'),
    ambient:JSON.parse(canvas?.dataset.pitStageLifeV61Events||'[]').concat(JSON.parse(canvas?.dataset.pitStageLifeV60Events||'[]')),
    art:canvas?.dataset.pitArenaArtStatus,positions:JSON.parse(canvas?.dataset.pitFighterPositions||'[]')};};
  CanvasRenderingContext2D.prototype.drawImage=function(...args){const result=original.apply(this,args);
    if(!this.canvas.matches?.('canvas[data-pit-fighter-positions]')||!(args[0] instanceof HTMLImageElement)||args.length!==9)return result;
    const src=new URL(args[0].currentSrc||args[0].src,location.href).pathname,event=sources.get(src);if(!event)return result;
    const rect=args.slice(1,5),nativeFrame=event.frames.findIndex(f=>f.rect.every((n,i)=>n===rect[i])),dest=args.slice(5),matrix=this.getTransform();
    if(nativeFrame<0||Math.abs(dest[2]/rect[2]-dest[3]/rect[3])>1e-6||matrix.a<=0||matrix.d<=0)store.invalid.push({src,rect,dest});
    const key=src+':'+nativeFrame;if(!store.seen.has(key)){store.seen.add(key);store.draws.push({src,nativeFrame,rect,dest});}return result;};
  setInterval(()=>{const state=store.read();if(!state.stage)return;const key=JSON.stringify([state.phase,state.presentation,state.round,state.paused,state.events]);if(key!==store.last&&store.samples.length<10000){store.samples.push(state);store.last=key;}},16);
}
const read=()=>page.evaluate(()=>window.__storyV61.read());
const evidence=()=>page.evaluate(()=>({draws:window.__storyV61.draws,samples:window.__storyV61.samples,invalid:window.__storyV61.invalid}));
async function shot(name){const file=path.join(output,name+'.png');await page.screenshot({path:file});captures.push({file,sha256:sha(await fs.readFile(file)),visualReview:'pending-separate-inspection'});}
async function open(stage,{reduced=false,mobile=false,block=false}={}){
  context=await browser.newContext({viewport:mobile?{width:844,height:390}:{width:1280,height:720},isMobile:mobile,hasTouch:mobile,reducedMotion:reduced?'reduce':'no-preference'});
  const fixture=structuredClone(await campaignFixture());fixture.save.settings.screenShake=false;
  await context.addInitScript(({key,save})=>localStorage.setItem(key,JSON.stringify(save)),fixture);await context.addInitScript(observe,manifest.stages);
  page=await context.newPage();page.setDefaultTimeout(60000);await page.clock.install();requests=[];
  intentionalFailure=block?stage.events[0].src:null;let blocked=block,intentionalFailures=0;
  if(block)await context.route('**'+intentionalFailure,async route=>{if(blocked){intentionalFailures++;await route.fulfill({status:503,body:'Intentional QA native asset failure'});}else await route.continue();});
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&!(intentionalFailure&&m.text().includes('503')))errors.push(m.text());});
  page.on('request',r=>requests.push(new URL(r.url()).pathname));
  page.on('response',r=>{const src=new URL(r.url()).pathname;if(r.status()>=400&&!(r.status()===503&&src===intentionalFailure))httpFailures.push({src,status:r.status()});});
  page.on('requestfailed',r=>{if(!r.failure()?.errorText.includes('ERR_ABORTED'))failedRequests.push({url:r.url(),error:r.failure()?.errorText});});
  await enterCampaignDeck(page,{url});assert.equal(await page.locator('[data-game-content-version]').first().getAttribute('data-game-content-version'),version);
  await page.getByRole('button',{name:'THE PIT · combat',exact:true}).click();await closePitSelectionOptions(page);
  await page.getByRole('radio',{name:/^Versus local/}).click();await closePitSelectionOptions(page);
  await choosePitFighter(page,'jungle-hunter');await page.locator('[data-pit-selection-confirm]').click();await choosePitFighter(page,'city-hunter');await page.locator('[data-pit-selection-confirm]').click();
  await choosePitStage(page,stage.stageId);
  if(block){await page.waitForFunction(()=>document.querySelector('[data-pit-stage-preview]')?.dataset.previewStatus==='failed');assert(await page.locator('[data-pit-selection-confirm]').isDisabled());assert.equal(await page.locator('[data-pit-immersive]').count(),0);await shot(stage.stageId+'-503');blocked=false;await page.getByRole('button',{name:'Réessayer l’aperçu',exact:true}).click();}
  await page.waitForFunction(id=>document.querySelector('[data-pit-stage-preview]')?.dataset.pitStagePreview===id&&document.querySelector('[data-pit-stage-preview]')?.dataset.previewStatus==='ready',stage.stageId);
  const start=requests.length;await page.clock.pauseAt(new Date((await page.evaluate(()=>Date.now()))+50));
  await page.locator('[data-pit-selection-confirm]').click();
  for(let i=0;i<500;i++){await page.clock.runFor(16);const s=await read();if(s.stage===stage.stageId&&s.art==='bitmap')break;}
  const loaded=await read();assert.equal(loaded.stage,stage.stageId);assert.equal(loaded.art,'bitmap');assert.deepEqual(loaded.missing,[]);
  assert(requests.slice(start).filter(p=>p.includes('/v61/pit-story/')).every(p=>stage.events.some(e=>e.src===p)),'Only selected story clips load');
  for(const event of stage.events)assert(requests.includes(event.src),'Native conditional PNG was requested');
  return {intentionalFailures};
}
async function untilFight(stage){
  for(let i=0;i<80;i++){const state=await read();if(state.presentation==='fight'){assert.equal(state.phase,'round');return state;}assert(state.events.every(e=>!e.active),'Intro/countdown cannot trigger a gesture');await page.clock.runFor(100);}
  throw Error(stage.stageId+': countdown did not finish');
}
async function produceRoundResult(){
  await page.locator('[data-pit-immersive]').focus();await page.keyboard.down('ArrowRight');
  try{for(let i=0;i<150;i++){
    await page.keyboard.down('KeyL');await page.clock.runFor(160);await page.keyboard.up('KeyL');
    if((await read()).phase!=='round')return;
    await page.clock.runFor(240);if((await read()).phase!=='round')return;
  }}finally{await page.keyboard.up('KeyL');await page.keyboard.up('ArrowRight');}
  throw Error('Public keyboard attacks did not finish the real round');
}
async function verify(stage,{reduced=false,mobile=false,block=false}={}){
  const label=stage.stageId+(reduced?'-reduced':mobile?'-mobile':block?'-retry':'-desktop');console.log(JSON.stringify({progress:'actual-story-flow',label}));
  const transport=await open(stage,{reduced,mobile,block});const beforeStorage=await page.evaluate(()=>JSON.stringify(localStorage));
  await untilFight(stage);const trigger=stage.events[0].trigger;
  if(trigger!=='round-start'){
    assert((await read()).events.every(e=>!e.active),'End-round gesture is absent during live combat');await produceRoundResult();
    if(trigger==='match-end')for(let round=0;round<5&&(await read()).phase!=='match-over';round++){
      assert((await read()).events.every(e=>!e.active),'After-duel gesture is absent after an intermediate round');
      await untilFight(stage);await produceRoundResult();
    }
  }
  let current=await read();assert(current.events.some(e=>e.active),`${label}: real gesture activated`);
  if(trigger==='round-victory')assert(current.presentation==='round-result','Victory comes from a resolved real round');
  let menuClickDuringToast=false,toastControlClearance=null;
  if(trigger==='match-end'){
      assert(await page.locator('.toast').isVisible(),'Regression check must run while the real victory status is still visible');
      toastControlClearance=await page.evaluate(()=>{
        const box=node=>{const r=node.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom};};
        const toast=box(document.querySelector('.toast'));
        const controls=[...document.querySelectorAll('[data-pit-menu-button], [aria-label="Commandes tactiles"] button')]
          .filter(node=>node.getBoundingClientRect().width>0).map(node=>({label:node.getAttribute('aria-label')||node.textContent,rect:box(node)}));
        return {toast,controls,overlapping:controls.filter(({rect:r})=>toast.x<r.right&&toast.right>r.x&&toast.y<r.bottom&&toast.bottom>r.y),
          withinViewport:toast.x>=0&&toast.y>=0&&toast.right<=innerWidth&&toast.bottom<=innerHeight};
      });
      assert.deepEqual(toastControlClearance.overlapping,[],'The status must leave MENU and all touch controls visually uncovered');
      assert(toastControlClearance.withinViewport,'The match status remains within the actual viewport');
      assert(await page.locator('[data-pit-menu-button]').evaluate(button=>{const rect=button.getBoundingClientRect(),target=document.elementFromPoint(rect.x+rect.width/2,rect.y+rect.height/2);return target===button||button.contains(target);}),
        'The real menu click target must remain reachable while the status toast is visible');
      await shot(label+'-status-layout');
  }
  if(!reduced&&!mobile&&!block){
    await openPitPause(page);const paused=await read();assert.equal(paused.paused,'true');await page.clock.runFor(950);assert.deepEqual(await read(),paused);await shot(label+'-paused');
    menuClickDuringToast=trigger==='match-end';
    await page.locator('[data-pit-resume]').click();await page.clock.runFor(32);assert.equal((await read()).paused,'false');
  }
  let captured=false;
  for(let i=0;i<180;i++){
    current=await read();if(!captured&&current.events.some(e=>e.active&&(reduced||e.nativeFrame>=3))){await shot(label+'-active');captured=true;}
    if(current.events.every(e=>!e.active))break;
    await page.clock.runFor(16);
  }
  assert(captured);assert((await read()).events.every(e=>!e.active),'One-shot releases after its native frames');
  const observed=await evidence();assert.deepEqual(observed.invalid,[]);
  const mixedTransitionSamples=verifyPitStoryIntroSamplesV61(observed.samples.filter(sample=>sample.stage===stage.stageId),stage.events);
  for(const event of stage.events){const frames=[...new Set(observed.draws.filter(d=>d.src===event.src).map(d=>d.nativeFrame))].sort((a,b)=>a-b);
    assert.deepEqual(frames,reduced?[event.reducedMotionFrame]:event.frames.map((_,i)=>i),`${event.id}: actual six source cells drawn`);
    for(const sample of observed.samples.filter(s=>s.stage===stage.stageId)){
      assert.deepEqual(sample.missing,[]);
      if(sample.replaced.includes(event.replacesAmbientEventId))assert(sample.ambient.every(a=>a.eventId!==event.replacesAmbientEventId),'Original body absent while new gesture draws');
    }
  }
  const savedBytesUnchanged=await page.evaluate(()=>JSON.stringify(localStorage))===beforeStorage;
  if(trigger!=='match-end')assert(savedBytesUnchanged,'A round gesture changes no saved bytes');
  if(mobile){assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await shot(label+'-layout');}
  const result={label,stageId:stage.stageId,reduced,mobile,retry:block,transport,nativeFrames:observed.draws,samples:observed.samples,mixedTransitionSamples,keyboardResolvedRound:trigger!=='round-start',keyboardResolvedMatch:trigger==='match-end',savedBytesUnchanged,menuClickDuringToast,toastControlClearance,
    persistenceNote:trigger==='match-end'?'A legitimately completed local duel may persist its normal replay/result; the gesture director has no storage access.':null};checks.push(result);
  await fs.writeFile(path.join(output,label+'.json'),JSON.stringify(result,null,2)+'\n');await context.close();context=null;page=null;console.log(JSON.stringify({passed:true,label}));
}
try{
  browser=await chromium.launch({channel:'chrome',headless:true});
  if(cases.includes('desktop'))for(const stage of targets)await verify(stage);
  const representative=targets.find(s=>s.events[0].trigger==='round-start')??targets[0];
  if(cases.includes('reduced'))await verify(representative,{reduced:true});
  if(cases.includes('mobile'))await verify(targets[0],{mobile:true});
  if(cases.includes('retry'))await verify(representative,{block:true});
  assert.deepEqual(errors,[]);assert.deepEqual(httpFailures,[]);assert.deepEqual(failedRequests,[]);assert.deepEqual(await readHashes(),sourceHashes,'Sources changed during run; final gate must be rerun on frozen build');
  const report={result:'PASS',surface:'full-application-public-roster-stage-real-keyboard-round',checkedAt:new Date().toISOString(),url,version,targets:targets.map(s=>s.stageId),cases,sourceHashes,checks,captures,errors,httpFailures,failedRequests,
    limits:['Browser clock controls real timers only; no combat state, engine event or result is injected.','Narrative scenarios without callers are not exercised or claimed.','Mobile is Chromium emulation.','Composition acceptance is a separate actual image review.']};
  await fs.writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({result:'PASS',output,checks:checks.length}));
}catch(error){if(page)await shot('failure').catch(()=>{});await fs.writeFile(path.join(output,'failure.json'),JSON.stringify({result:'FAIL',error:String(error),stack:error.stack,checks,captures,sourceHashes,errors,httpFailures,failedRequests,state:page?await read().catch(()=>null):null,evidence:page?await evidence().catch(()=>null):null},null,2)+'\n');console.error(error);process.exitCode=1;}
finally{await context?.close().catch(()=>{});await browser?.close();}
