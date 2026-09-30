import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import {chromium} from 'playwright-core';
import {campaignFixture,enterCampaignDeck} from './campaign-browser-helpers.mjs';
import {choosePitFighter,choosePitStage,closePitSelectionOptions,openPitPause} from './pit-selection-browser-helpers.mjs';

const url=process.env.V61_HYDRA_QA_URL||'http://127.0.0.1:4177';
const output=process.env.V61_HYDRA_QA_OUTPUT||'work-local/v61/qa/hydra-exclusion-final';
const version=process.env.V61_HYDRA_QA_VERSION||'V61';
const stageId='arena-169-extinction-front',playerId='user-extinction-hydra',opponentId='city-hunter';
const manifest=JSON.parse(await fs.readFile('app/game/data/pitStageLifeV61.json','utf8'));
const stage=manifest.stages.find(stage=>stage.stageId===stageId);
assert(stage&&stage.events.length===3,'assembled arena169 must contain three native events');
const excluded=stage.events.find(event=>event.id==='life-02');
assert(excluded?.excludedFighterIds?.includes(playerId),'Hydra background has an explicit fighter-identity exclusion');
const retained=stage.events.filter(event=>event.id!==excluded.id);
assert.equal(retained.length,2);assert(retained.every(event=>event.frames.length===6&&!event.idleVisibility));
const compiled=await build({stdin:{contents:'export {getPitStageLifeScheduleV60} from "./app/game/pitStageLifeDirectorV60";export {PIT_ROUND_FRAMES} from "./app/game/systems/pitCombat";',resolveDir:process.cwd()},bundle:true,write:false,format:'esm',platform:'node',logLevel:'silent'});
const timing=await import('data:text/javascript;base64,'+Buffer.from(compiled.outputFiles[0].text).toString('base64'));
const sha=value=>createHash('sha256').update(value).digest('hex');
const files=['app/game/data/pitStageLifeV61.json','app/game/pitStageStoryV61.ts','app/game/pitStageLifeRenderingV61.ts','app/game/pitStageLifeDirectorV60.ts','app/game/pitArenaRendering.ts','app/game/PitCanvas.tsx','scripts/verify-pit-hydra-exclusion-v61.mjs'];
const hashes=async()=>Object.fromEntries(await Promise.all(files.map(async file=>[file,sha(await fs.readFile(file))])));
const sourceHashes=await hashes(),checks=[],captures=[],errors=[],httpFailures=[],failedRequests=[];
const temporary=path.resolve('work-local/v61/browser-temp');
await fs.mkdir(temporary,{recursive:true});await fs.mkdir(output,{recursive:true});process.env.TEMP=temporary;process.env.TMP=temporary;
let browser,context,page;

/** Passive observation only: all real drawImage arguments and return values are preserved. */
function observeHydra(stage){
 const sources=new Map(stage.events.map(event=>[event.src,event]));
 const original=CanvasRenderingContext2D.prototype.drawImage;
 const evidence=window.__hydraExclusionV61={recording:false,draws:[],forbiddenDraws:[],invalidDraws:[],samples:[],keys:new Set(),last:''};
 evidence.read=()=>{const root=document.querySelector('[data-pit-immersive]'),canvas=root?.querySelector('canvas[data-pit-fighter-positions]');return{
  frame:Number(root?.querySelector('[data-pit-frame]')?.dataset.pitFrame),timer:Number(root?.dataset.pitTimerFrames),round:Number(root?.dataset.pitPresentationRound),
  phase:root?.dataset.pitCombatPhase,presentation:root?.dataset.pitPresentationPhase,paused:root?.dataset.pitPaused,
  stage:canvas?.dataset.pitStageLifeV61Stage,actors:Number(canvas?.dataset.pitStageLifeV61Actors),art:canvas?.dataset.pitArenaArtStatus,
  events:JSON.parse(canvas?.dataset.pitStageLifeV61Events||'[]'),missing:JSON.parse(canvas?.dataset.pitStageLifeV61Missing||'[]'),
  positions:JSON.parse(canvas?.dataset.pitFighterPositions||'[]'),
  fighters:[...root?.querySelectorAll('[data-pit-bitmap-id]')??[]].map(node=>({id:node.dataset.pitBitmapId,status:node.dataset.pitBitmapStatus}))
 };};
 CanvasRenderingContext2D.prototype.drawImage=function(...args){
  const result=original.apply(this,args);
  if(!evidence.recording||!this.canvas.closest?.('[data-pit-immersive]')||!(args[0] instanceof HTMLImageElement))return result;
  const src=new URL(args[0].currentSrc||args[0].src,location.href).pathname;
  if(src.includes('/arena-169-extinction-front/life-02.png')&&evidence.forbiddenDraws.length<40)evidence.forbiddenDraws.push({src,args:args.slice(1)});
  const event=sources.get(src);if(!event)return result;
  const rect=args.slice(1,5),destination=args.slice(5),transform=this.getTransform();
  const nativeFrame=args.length===9?event.frames.findIndex(frame=>frame.rect.every((n,i)=>n===rect[i])):-1;
  const valid=nativeFrame>=0&&destination[2]>0&&destination[3]>0&&Math.abs(destination[2]/rect[2]-destination[3]/rect[3])<.000001&&transform.a>0&&transform.d>0;
  if(!valid&&evidence.invalidDraws.length<40)evidence.invalidDraws.push({src,rect,destination});
  const key=src+':'+nativeFrame;if(!evidence.keys.has(key)){evidence.keys.add(key);evidence.draws.push({eventId:event.id,src,nativeFrame,rect,destination,valid});}
  return result;
 };
 setInterval(()=>{if(!evidence.recording)return;const state=evidence.read();if(state.stage!==stage.stageId||state.phase!=='round'||state.presentation!=='fight')return;
  const key=JSON.stringify([state.frame,state.paused,state.events.map(e=>[e.eventId,e.nativeFrame,e.active])]);
  if(key!==evidence.last&&evidence.samples.length<10000){evidence.last=key;evidence.samples.push(state);}
 },16);
}
const read=()=>page.evaluate(()=>window.__hydraExclusionV61.read());
const observed=()=>page.evaluate(()=>{const e=window.__hydraExclusionV61;return{draws:e.draws,forbiddenDraws:e.forbiddenDraws,invalidDraws:e.invalidDraws,samples:e.samples};});
const storage=()=>page.evaluate(()=>JSON.stringify(Object.fromEntries(Object.entries(localStorage).sort(([a],[b])=>a.localeCompare(b)))));
function record(name,details={}){checks.push({name,...details});console.log(JSON.stringify({passed:true,name}));}
async function shot(name){const file=path.join(output,name+'.png');await page.screenshot({path:file});captures.push({file:path.basename(file),sha256:sha(await fs.readFile(file)),visualReview:'pending-separate-image-inspection'});}
function assertExclusion(state){
 assert.equal(state.stage,stageId);assert.equal(state.actors,2);assert.deepEqual(state.missing,[]);assert.equal(state.art,'bitmap');
 assert.deepEqual(state.events.map(event=>event.eventId).sort(),retained.map(event=>event.id).sort());
 assert(state.events.every(event=>event.drawn&&!event.src.endsWith('/life-02.png')));
}
async function advanceTo(target){let previous=await read(),stalled=0;for(let step=0;timing.PIT_ROUND_FRAMES-previous.timer<target&&step<500;step++){
 assert.equal(previous.phase,'round');await page.clock.runFor(Math.max(32,Math.min(2000,Math.ceil((target-(timing.PIT_ROUND_FRAMES-previous.timer))*1000/60))));
 const next=await read();stalled=next.frame>previous.frame?0:stalled+1;assert(stalled<12,'real combat advances through public browser clock');assertExclusion(next);previous=next;
 }assert(timing.PIT_ROUND_FRAMES-previous.timer>=target);return previous;}

try{
 browser=await chromium.launch({channel:process.env.V61_HYDRA_QA_CHANNEL||'chrome',headless:true});
 context=await browser.newContext({viewport:{width:1280,height:720},reducedMotion:'no-preference'});
 const fixture=structuredClone(await campaignFixture());fixture.save.settings.screenShake=false;
 await context.addInitScript(({key,save})=>localStorage.setItem(key,JSON.stringify(save)),fixture);
 await context.addInitScript(observeHydra,stage);page=await context.newPage();page.setDefaultTimeout(60000);await page.clock.install();
 page.on('pageerror',error=>errors.push(error.message));page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
 page.on('response',response=>{if(response.status()>=400)httpFailures.push({path:new URL(response.url()).pathname,status:response.status()});});
 page.on('requestfailed',request=>{const reason=request.failure()?.errorText||'';if(!reason.includes('ERR_ABORTED'))failedRequests.push({url:request.url(),reason});});
 await enterCampaignDeck(page,{url});assert.equal(await page.locator('[data-game-content-version]').first().getAttribute('data-game-content-version'),version);
 await page.getByRole('button',{name:'THE PIT · combat',exact:true}).click();await closePitSelectionOptions(page);
 await page.getByRole('radio',{name:/^Versus local/}).click();await closePitSelectionOptions(page);const baseline=await storage();
 for(const fighter of [playerId,opponentId]){await choosePitFighter(page,fighter);assert.equal(await page.locator(`[role="option"][data-choice-id="${fighter}"]`).getAttribute('aria-selected'),'true');await page.locator('[data-pit-selection-confirm]').click();}
 await choosePitStage(page,stageId);await page.waitForFunction(id=>document.querySelector('[data-pit-stage-preview]')?.dataset.pitStagePreview===id&&document.querySelector('[data-pit-stage-preview]')?.dataset.previewStatus==='ready',stageId);
 await page.waitForFunction(()=>!document.querySelector('[data-pit-scene-assets]')&&!document.querySelector('[data-pit-selection-confirm]')?.disabled);
 await shot('hydra-roster-stage-selected');record('real-roster-hydra-versus-city-hunter',{playerId,opponentId,stageId});
 await page.evaluate(()=>{window.__hydraExclusionV61.recording=true;});await page.locator('[data-pit-selection-confirm]').click();
 await page.waitForFunction(()=>document.querySelector('[data-pit-immersive]')?.dataset.pitPresentationPhase==='fight');
 await page.waitForFunction(id=>document.querySelector('canvas[data-pit-stage-life-v61-stage]')?.dataset.pitStageLifeV61Stage===id,stageId);
 await page.locator('[data-pit-immersive]').focus();await page.clock.pauseAt(new Date((await page.evaluate(()=>Date.now()))+100));await page.clock.runFor(32);
 let state=await read();assertExclusion(state);assert.deepEqual(state.fighters.map(f=>f.id),[playerId,opponentId]);assert(state.fighters.every(f=>!['loading','missing'].includes(f.status)));
 record('hydra-present-only-as-selected-fighter',{fighters:state.fighters,backgroundActors:state.actors,retainedEventIds:state.events.map(e=>e.eventId)});await shot('hydra-combat-no-background-double');
 const beforeMove=state;await page.keyboard.down('ArrowLeft');try{await page.clock.runFor(500);}finally{await page.keyboard.up('ArrowLeft');}await page.clock.runFor(32);
 state=await read();assert(state.frame>beforeMove.frame&&state.timer<beforeMove.timer);assert(state.positions[0].x<beforeMove.positions[0].x-8,'public left input moves the Hydra fighter');assertExclusion(state);
 record('hydra-combat-remains-playable',{before:beforeMove.positions,after:state.positions});
 const schedule=timing.getPitStageLifeScheduleV60(stageId,1,0),hydraOccurrence=schedule.bag.indexOf(stage.events.indexOf(excluded));
 assert(hydraOccurrence>=0);await advanceTo(schedule.firstDelay+schedule.starts[hydraOccurrence]+Math.ceil(3*60/excluded.fps));await shot('hydra-excluded-during-its-scheduled-gesture');
 record('hydra-excluded-even-at-own-ambient-occurrence',{hydraOccurrence,schedule});
 await advanceTo(schedule.firstDelay+schedule.starts[2]+180);
 const evidence=await observed();assert(evidence.samples.length>20);assert.deepEqual(evidence.forbiddenDraws,[],'no V60 or V61 Hydra decor PNG is drawn in real combat');assert.deepEqual(evidence.invalidDraws,[]);
 for(const sample of evidence.samples)assertExclusion(sample);
 const nativeFrames=retained.map(event=>{const seen=[...new Set(evidence.draws.filter(draw=>draw.eventId===event.id).map(draw=>draw.nativeFrame))].sort((a,b)=>a-b);assert.deepEqual(seen,[0,1,2,3,4,5]);return{eventId:event.id,src:event.src,seen};});
 record('two-retained-native-animations-play-all-six-drawings',{nativeFrames,samples:evidence.samples.length,forbiddenHydraDraws:0});
 await openPitPause(page);const paused=await read();assert.equal(paused.paused,'true');await page.clock.runFor(950);assert.deepEqual(await read(),paused,'pause holds real combat and both native backgrounds');await shot('hydra-paused');
 await page.locator('[data-pit-resume]').click();await page.clock.runFor(80);const resumed=await read();assert.equal(resumed.paused,'false');assert(resumed.frame>paused.frame);assert.equal(await page.evaluate(()=>document.activeElement?.getAttribute('aria-label')),'Combat THE PIT');assertExclusion(resumed);
 record('pause-and-resume',{pausedFrame:paused.frame,resumedFrame:resumed.frame});assert.equal(await storage(),baseline);record('exhibition-save-bytes-unchanged');
 assert.deepEqual(errors,[]);assert.deepEqual(httpFailures,[]);assert.deepEqual(failedRequests,[]);assert.deepEqual(await hashes(),sourceHashes,'runtime and recipe files remain unchanged during QA');
 const finalEvidence=await observed();assert.deepEqual(finalEvidence.forbiddenDraws,[]);await fs.writeFile(path.join(output,'evidence.json'),JSON.stringify(finalEvidence,null,2)+'\n');
 const report={status:'PASS',checkedAt:new Date().toISOString(),url,version,surface:'real-public-roster-and-local-versus-combat',stageId,playerId,opponentId,expectedBackgroundActors:2,excludedEventId:excluded.id,forbiddenHydraDraws:0,sourceHashes,checks,captures,errors,httpFailures,failedRequests,limitations:['Isolated campaign save fixture only; combat state, renderer output and schedules were never injected or changed.','Browser clock advances the normal simulation.','Downloaded decor assets may still preload; this recipe proves their draw exclusion, not their network suppression.','Screenshots require independent visual review.']};
 await fs.writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:'PASS',output,checks:checks.length}));
}catch(error){if(page)await shot('failure').catch(()=>{});await fs.writeFile(path.join(output,'failure.json'),JSON.stringify({status:'FAIL',error:String(error),stack:error.stack,url,sourceHashes,checks,captures,errors,httpFailures,failedRequests,state:page?await read().catch(()=>null):null,evidence:page?await observed().catch(()=>null):null},null,2)+'\n');console.error(error);process.exitCode=1;}
finally{await context?.close().catch(()=>{});await browser?.close();}
