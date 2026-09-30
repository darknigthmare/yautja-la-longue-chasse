import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import {chromium} from 'playwright-core';
import {campaignFixture,enterCampaignDeck} from './campaign-browser-helpers.mjs';
import {selectPitMatch,closePitSelectionOptions,openPitPause,resumePitFight} from './pit-selection-browser-helpers.mjs';

const url=process.env.V57_LIFE_QA_URL||'http://127.0.0.1:4176';
const version=process.env.V57_LIFE_QA_VERSION||'V57';
const output=process.env.V57_LIFE_QA_OUTPUT||'work-local/v57/qa/arena-life';
const temp=path.resolve('work-local/v57/browser-temp');await fs.mkdir(temp,{recursive:true});process.env.TEMP=temp;process.env.TMP=temp;await fs.mkdir(output,{recursive:true});
const bundle=await build({stdin:{contents:'export * from "./app/game/pitArenaLifeEvents"; export * from "./app/game/pitArenaLife"; export {PIT_ROUND_FRAMES,PIT_ARENAS} from "./app/game/systems/pitCombat";',resolveDir:process.cwd()},bundle:true,write:false,format:'esm',platform:'node',logLevel:'silent'});
const api=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const checks=[],captures=[],errors=[],consoleErrors=[],httpFailures=[],bouts=[];
let browser,context,page;
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const record=(name,details={})=>{checks.push({name,...details});console.log(JSON.stringify({check:name,passed:true}));};
async function shot(name){const file=path.join(output,name+'.png');await page.screenshot({path:file});captures.push({file:path.basename(file),sha256:digest(await fs.readFile(file)),visualReview:'pending-actual-image-inspection'});}
const read=()=>page.evaluate(()=>window.__pitLifeV57.read());
const storage=()=>page.evaluate(()=>JSON.stringify(Object.fromEntries(Object.entries(localStorage).sort(([a],[b])=>a.localeCompare(b)))));

/** Observe the real source cells and public UI only; never replace inputs, game clocks or state. */
function observeLife(){
  const original=CanvasRenderingContext2D.prototype.drawImage;
  const evidence=window.__pitLifeV57={samples:[],draws:[],read:()=>{
    const root=document.querySelector('[data-pit-immersive]'),canvas=root?.querySelector('canvas[data-pit-fighter-positions]');
    return {frame:Number(root?.querySelector('[data-pit-frame]')?.dataset.pitFrame),phase:root?.dataset.pitCombatPhase,presentation:root?.dataset.pitPresentationPhase,
      elapsed:Number(root?.dataset.pitPresentationElapsedMs),round:Number(root?.dataset.pitPresentationRound),timer:Number(root?.dataset.pitTimerFrames),
      frames:JSON.parse(canvas?.dataset.pitArenaLifeFrames||'[]'),actors:Number(canvas?.dataset.pitArenaLifeActors),scene:canvas?.dataset.pitSceneArenaId,
      art:canvas?.dataset.pitArenaArtStatus,missing:Number(canvas?.dataset.pitArenaMissingAssets)};
  }};
  CanvasRenderingContext2D.prototype.drawImage=function(...args){const result=original.apply(this,args),image=args[0];
    if(!this.canvas.matches?.('canvas[data-pit-fighter-positions]')||!(image instanceof HTMLImageElement)||args.length!==9||!image.src.endsWith('/game/sprites/v54/pit-life/yautja-spectators.png'))return result;
    if(evidence.draws.length<15000){const m=this.getTransform();evidence.draws.push({src:new URL(image.src,location.href).pathname,source:args.slice(1,5),dest:args.slice(5),transform:{a:m.a,d:m.d,f:m.f},height:this.canvas.height,zoom:Number(this.canvas.dataset.pitCameraZoom),centerY:Number(this.canvas.dataset.pitCameraCenterY)});}return result;
  };
  setInterval(()=>{const next=evidence.read(),last=evidence.samples.at(-1);if(next.actors===2&&evidence.samples.length<6000&&(!last||JSON.stringify(next)!==JSON.stringify(last)))evidence.samples.push(next);},40);
}

async function start(stage,{mobile=false,reduced=false}={}){
  context=await browser.newContext({viewport:mobile?{width:844,height:390}:{width:1280,height:720},hasTouch:mobile,isMobile:mobile,reducedMotion:reduced?'reduce':'no-preference'});
  const fixture=structuredClone(await campaignFixture());fixture.save.settings.screenShake=false;
  await context.addInitScript(({key,save})=>localStorage.setItem(key,JSON.stringify(save)),fixture);await context.addInitScript(observeLife);
  page=await context.newPage();page.setDefaultTimeout(45000);page.on('pageerror',error=>errors.push(error.message));page.on('response',r=>{if(r.status()>=400)httpFailures.push({url:r.url(),status:r.status()});});
  page.on('console',async message=>{if(message.type()!=='error')return;const entry={text:message.text(),location:message.location(),arguments:[]};consoleErrors.push(entry);
    entry.arguments=await Promise.all(message.args().map(arg=>arg.evaluate(value=>value instanceof Error?{name:value.name,message:value.message,stack:value.stack}:String(value)).catch(()=>null)));});
  await enterCampaignDeck(page,{url});assert.equal(await page.locator('[data-game-content-version]').first().getAttribute('data-game-content-version'),version);
  await page.getByRole('button',{name:'THE PIT · combat',exact:true}).click();await closePitSelectionOptions(page);await page.getByRole('radio',{name:/^Versus local/}).click();await closePitSelectionOptions(page);
  const before=await storage();await selectPitMatch(page,{player:'original-mutated-yautja',opponent:'original-arid-ermit-yautja',arena:stage});
  await page.waitForFunction(()=>document.querySelector('[data-pit-immersive]')?.dataset.pitPresentationPhase==='fight');
  await page.waitForFunction(()=>window.__pitLifeV57.read().actors===2);
  const initial=await read();assert.equal(initial.scene,stage);assert.equal(initial.art,'bitmap');assert.equal(initial.missing,0);
  return before;
}

async function awaitPhase(phase){await page.waitForFunction(phase=>window.__pitLifeV57.read().presentation===phase,phase);}
async function defeatRound(){
  for(let attempt=0;attempt<16;attempt++){
    const current=await read();if(current.phase!=='round')return;
    await page.keyboard.down('ArrowRight');
    try{await page.waitForFunction(()=>{const canvas=document.querySelector('canvas[data-pit-fighter-positions]'),positions=JSON.parse(canvas?.dataset.pitFighterPositions||'[]');return positions.length===2&&Math.abs(positions[1].x-positions[0].x)<=64;},null,{timeout:8000});}finally{await page.keyboard.up('ArrowRight');}
    await page.keyboard.press('KeyL',{delay:120});
    const outcome=await page.waitForFunction(()=>window.__pitLifeV57.read().phase!=='round',null,{timeout:1050}).then(()=>true,()=>false);
    if(outcome)return;
  }
  throw new Error('Real heavy strikes did not finish the round within16 attempts');
}

function auditEvidence(evidence,stage,reduced){
  assert(evidence.draws.length>20,'Real native observer cells were drawn');
  const frames=new Set(evidence.draws.map(d=>d.source[0]/512+d.source[1]/512*3));
  if(reduced)assert.deepEqual([...frames],[0]);else assert(frames.size>=5,'At least five existing drawings actually rendered');
  const sheet=api.PIT_ARENA_LIFE_SHEETS.find(s=>s.id==='yautja-spectators');let maxGroundError=0;
  for(const draw of evidence.draws){
    assert.equal(draw.src,sheet.src);assert.deepEqual(draw.source.slice(2),[512,512]);
    const index=draw.source[0]/512+draw.source[1]/512*3,pivot=sheet.nativePivots[index];assert(pivot);assert(draw.transform.d>0);
    if(!Number.isFinite(draw.zoom)||!Number.isFinite(draw.centerY))continue;
    const actual=draw.transform.f+draw.transform.d*(draw.dest[1]+draw.dest[3]*pivot[1]/512),floor=draw.height/2+(api.PIT_ARENAS[stage].groundY-draw.centerY)*draw.zoom;
    maxGroundError=Math.max(maxGroundError,Math.abs(actual-floor));
  }
  assert(maxGroundError<.03,'Native contact pivots meet the floor within the public camera readout rounding');
  assert(evidence.draws.some(d=>d.transform.a<0)&&evidence.draws.some(d=>d.transform.a>0),'The two anonymous groups face inward');
  const normal=evidence.samples.filter(s=>s.phase==='round'&&s.presentation==='fight'&&s.round===1&&s.frame>4);
  assert(normal.length>15);let exact=0;
  for(const sample of normal){
    const expected=api.getPitArenaLifeCast(stage).map(actor=>api.getPitArenaLifeEventPose(stage,actor.id,{round:sample.round,phase:sample.phase,roundFrame:api.PIT_ROUND_FRAMES-sample.timer},reduced).nativeFrame);
    if(JSON.stringify(expected)===JSON.stringify(sample.frames))exact++;
  }
  // React commits and its canvas effect can straddle an observation at a cell boundary.
  assert(exact/normal.length>.95,'Observed cells follow the deterministic director, not the obsolete continuous loop');
  return {nativeDraws:evidence.draws.length,nativeFrames:[...frames],maxGroundError,matchedSchedule:exact,scheduleSamples:normal.length};
}

try{
  browser=await chromium.launch({channel:process.env.V57_LIFE_QA_BROWSER_CHANNEL||'chrome',headless:true});
  for(const [index,stage] of api.PIT_DIRECTED_LIFE_ARENAS.entries()){
    const before=await start(stage,{mobile:index===1}),timings=api.getPitArenaLifeCast(stage).map(a=>api.getPitArenaLifeEventTiming(stage,a.id,1));
    await page.waitForFunction(()=>{const s=window.__pitLifeV57.read();return s.frame>=250&&s.frames.every(f=>f===0);});await shot(stage+'-calm');
    const eventTarget=Math.min(...timings.map(t=>t.intervalFrames))+45;
    await page.waitForFunction(target=>{const s=window.__pitLifeV57.read();return s.frame>=target&&s.frames.some(f=>f!==0);},eventTarget,{timeout:32000});
    await shot(stage+'-native-posture-event');await openPitPause(page);const paused=await read();await page.waitForTimeout(350);const held=await read();assert.equal(held.frame,paused.frame);assert.deepEqual(held.frames,paused.frames);await shot(stage+'-pause');await resumePitFight(page);
    await page.waitForFunction(target=>window.__pitLifeV57.read().frame>=target,Math.max(...timings.map(t=>t.intervalFrames))+145,{timeout:32000});
    await defeatRound();await awaitPhase('round-result');await page.waitForFunction(()=>window.__pitLifeV57.read().frames.some(f=>f!==0));await shot(stage+'-round-result');
    if(index===0){await awaitPhase('fight');await defeatRound();await awaitPhase('match-result');await page.waitForFunction(()=>window.__pitLifeV57.read().frames.some(f=>f!==0));await shot(stage+'-match-result');
      await openPitPause(page);const finalPaused=await read();await page.waitForTimeout(350);assert.equal((await read()).elapsed,finalPaused.elapsed);assert.deepEqual((await read()).frames,finalPaused.frames);await resumePitFight(page);
      await page.waitForFunction(()=>{const s=window.__pitLifeV57.read();return s.presentation==='match-result'&&s.elapsed>=2000&&s.frames.every(f=>f===0);});await shot(stage+'-result-return-to-rest');}
    const evidence=await page.evaluate(()=>({samples:window.__pitLifeV57.samples,draws:window.__pitLifeV57.draws})),details=auditEvidence(evidence,stage,false);
    assert(evidence.samples.some(s=>s.phase==='round-over'&&s.frames.some(f=>f!==0)));assert.equal(await storage(),before);await fs.writeFile(path.join(output,stage+'-evidence.json'),JSON.stringify(evidence,null,2));
    const layout=await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth}));assert(layout.scrollWidth<=layout.width+1);
    bouts.push({stage,mobile:index===1,reducedMotion:false,...details});record('directed-observers-'+stage,details);await context.close();context=null;page=null;
  }
  const stage=api.PIT_DIRECTED_LIFE_ARENAS[0],before=await start(stage,{reduced:true});await page.waitForTimeout(2000);await shot('reduced-motion-calm');
  const evidence=await page.evaluate(()=>({samples:window.__pitLifeV57.samples,draws:window.__pitLifeV57.draws})),details=auditEvidence(evidence,stage,true);assert.equal(await storage(),before);record('reduced-motion-native-pose-zero',details);
  await fs.writeFile(path.join(output,'reduced-motion-evidence.json'),JSON.stringify(evidence,null,2));assert.deepEqual(errors,[]);assert.deepEqual(httpFailures,[]);
  assert.deepEqual(consoleErrors,[]);
  await fs.writeFile(path.join(output,'report.json'),JSON.stringify({status:'PASS',version,url,checkedAt:new Date().toISOString(),checks,bouts,captures,errors,consoleErrors,httpFailures,saveBytesUnchanged:true,limitations:['Two authored original exhibition venues only; no additional crowd cast or new animation drawings.','Match-result uses the existing pausable presentation clock; live-round cadence uses simulation ticks.','Mobile is Chromium landscape emulation, not a physical device.','Captures need separate actual visual inspection.']},null,2)+'\n');console.log(JSON.stringify({status:'PASS',output}));
}catch(error){if(page)await shot('failure').catch(()=>{});await fs.writeFile(path.join(output,'failure.json'),JSON.stringify({error:String(error),stack:error.stack,checks,bouts,captures,errors,consoleErrors,httpFailures,state:page?await read().catch(()=>null):null},null,2));console.error(error);process.exitCode=1;}
finally{if(page)await page.keyboard.up('ArrowRight').catch(()=>{});await context?.close().catch(()=>{});await browser?.close();}
