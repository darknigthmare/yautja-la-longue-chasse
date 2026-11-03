import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright-core';
import {campaignFixture,enterCampaignDeck} from './campaign-browser-helpers.mjs';
import {choosePitFighter,choosePitStage,closePitSelectionOptions,returnPitSelection,openPitPause} from './pit-selection-browser-helpers.mjs';
const url=process.env.V65_STATIC_APP_URL??'http://127.0.0.1:4182',version=process.env.V65_STATIC_APP_VERSION??'V65';
const output=path.resolve(process.env.V65_STATIC_APP_OUTPUT??'work-local/v65/qa/stages/application');
const temp=path.resolve(process.env.V65_STATIC_QA_TEMP??'work-local/v65/browser-temp');
await fs.mkdir(output,{recursive:true});await fs.mkdir(temp,{recursive:true});process.env.TEMP=temp;process.env.TMP=temp;
const read=async file=>JSON.parse(await fs.readFile(file,'utf8')),sha=b=>createHash('sha256').update(b).digest('hex');
const data=await read('app/game/data/pitStageCompositionV65.json'),base=await read('app/game/pitArenaProductionData.generated.json');
const targets=data.stages.map(entry=>({...entry,runtimeId:base.stages.find(s=>s.catalogueId===entry.stageId).legacyRuntimeArenaId??entry.stageId}));assert.equal(targets.length,6);
const sources=['app/game/data/pitStageCompositionV65.json','app/game/pitStageCompositionV65.ts','app/game/pitArenaProduction.ts','app/game/pitArenaRendering.ts','app/game/PitCanvas.tsx','scripts/verify-pit-static-application-v65.mjs'];
const sourceHashes=async()=>Object.fromEntries(await Promise.all(sources.map(async file=>[file,sha(await fs.readFile(file))])));const before=await sourceHashes();
const checks=[],captures=[],errors=[],httpFailures=[];let browser,context,page,blockedPath=null;
function observe(entries){
 const table=entries.flatMap(e=>e.planes.map(p=>({stageId:e.stageId,plane:p.id,src:p.assets[0].frames[0].path,crop:p.assets[0].sourceCrop??p.assets[0].frames[0].generation.contentBounds})));
 const original=CanvasRenderingContext2D.prototype.drawImage,records=new Map();
 window.__v65StaticEvidence={records,read:()=>{const canvas=document.querySelector('canvas[data-pit-fighter-positions]'),root=document.querySelector('[data-pit-immersive]');return {stage:canvas?.dataset.pitSceneArenaId,art:canvas?.dataset.pitArenaArtStatus,planes:canvas?.dataset.pitArenaPlanes,missing:Number(canvas?.dataset.pitArenaMissingAssets),positions:JSON.parse(canvas?.dataset.pitFighterPositions??'[]'),zoom:Number(canvas?.dataset.pitCameraZoom),centerY:Number(canvas?.dataset.pitCameraCenterY),frame:Number(root?.querySelector('[data-pit-frame]')?.dataset.pitFrame),phase:root?.dataset.pitPresentationPhase,paused:root?.dataset.pitPaused};}};
 CanvasRenderingContext2D.prototype.drawImage=function(image,...args){const result=original.call(this,image,...args);if(!this.canvas.matches?.('canvas[data-pit-fighter-positions]')||!(image instanceof HTMLImageElement)||args.length!==8)return result;
  const src=new URL(image.src,location.href).pathname,source=table.find(e=>e.src===src&&[e.crop.x,e.crop.y,e.crop.width,e.crop.height].every((n,i)=>n===args[i]));if(!source)return result;
  const t=this.getTransform(),uniform=Math.abs(args[6]/args[2]-args[7]/args[3])<1e-6&&Math.abs(t.a-t.d)<1e-6;
  records.set(source.stageId+':'+source.plane,{...source,uniform,args,matrix:[t.a,t.b,t.c,t.d,t.e,t.f]});return result;};
}
const state=()=>page.evaluate(()=>window.__v65StaticEvidence.read());
const storage=()=>page.evaluate(()=>JSON.stringify(Object.fromEntries(Object.entries(localStorage).sort(([a],[b])=>a.localeCompare(b)))));
async function shot(name){const file=path.join(output,name+'.png');await page.screenshot({path:file});captures.push({name,file,sha256:sha(await fs.readFile(file))});}
function record(name,detail={}){checks.push({name,...detail});console.log(JSON.stringify({passed:true,name}));}
async function createContext({mobile=false,reduced=false}={}){
 context=await browser.newContext({viewport:mobile?{width:844,height:390}:{width:1280,height:720},isMobile:mobile,hasTouch:mobile,reducedMotion:reduced?'reduce':'no-preference'});
 const fixture=structuredClone(await campaignFixture());fixture.save.settings.screenShake=false;await context.addInitScript(({key,save})=>localStorage.setItem(key,JSON.stringify(save)),fixture);await context.addInitScript(observe,targets);
 page=await context.newPage();page.setDefaultTimeout(90000);await page.clock.install();
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&!(blockedPath&&m.text().includes('503')))errors.push(m.text());});page.on('response',r=>{const p=new URL(r.url()).pathname;if(r.status()>=400&&!(r.status()===503&&p===blockedPath))httpFailures.push({path:p,status:r.status()});});
}
async function selection(){await enterCampaignDeck(page,{url});assert.equal(await page.locator('[data-game-content-version]').first().getAttribute('data-game-content-version'),version);await page.getByRole('button',{name:'THE PIT · combat',exact:true}).click();await closePitSelectionOptions(page);await page.getByRole('radio',{name:/^Versus local/}).click();await closePitSelectionOptions(page);}
async function choose(target){await choosePitFighter(page,'jungle-hunter');await page.locator('[data-pit-selection-confirm]').click();await choosePitFighter(page,'city-hunter');await page.locator('[data-pit-selection-confirm]').click();await choosePitStage(page,target.runtimeId);}
async function launch(target){await page.waitForFunction(id=>document.querySelector('[data-pit-stage-preview]')?.dataset.pitStagePreview===id&&document.querySelector('[data-pit-stage-preview]')?.dataset.previewStatus==='ready',target.runtimeId);await page.waitForFunction(()=>!document.querySelector('[data-pit-selection-confirm]')?.disabled);await page.locator('[data-pit-selection-confirm]').click();await page.waitForFunction(()=>document.querySelector('[data-pit-immersive]')?.dataset.pitPresentationPhase==='fight');await page.locator('[data-pit-immersive]').focus();await page.clock.pauseAt(new Date(await page.evaluate(()=>Date.now())+100));await page.clock.runFor(32);const s=await state();assert.equal(s.stage,target.runtimeId);assert.equal(s.art,'bitmap');assert.equal(s.planes,'P0,P1,P2,P3,P4,P5');assert.equal(s.missing,0);const drawings=await page.evaluate(()=>[...window.__v65StaticEvidence.records.values()]);assert.deepEqual(drawings.filter(d=>d.stageId===target.stageId).map(d=>d.plane).sort(),['P0','P1','P2','P3','P5']);assert(drawings.every(d=>d.uniform));return drawings.filter(d=>d.stageId===target.stageId);}
try{
 browser=await chromium.launch({channel:'chrome',headless:true});await createContext();await selection();
 for(const target of targets){const saved=await storage();await choose(target);await shot(target.stageId+'-selection');const drawings=await launch(target);await shot(target.stageId+'-combat');
  if(target===targets[0]){const initial=await state();await page.keyboard.down('ArrowLeft');await page.keyboard.down('Numpad6');try{for(let i=0;i<95;i++){await page.clock.runFor(32);const current=await state();if(Math.abs(current.positions[0].x-current.positions[1].x)>650)break;}}finally{await page.keyboard.up('ArrowLeft');await page.keyboard.up('Numpad6');}await page.clock.runFor(64);const apart=await state();assert(Math.abs(apart.positions[0].x-apart.positions[1].x)>650);assert(apart.zoom<initial.zoom);await shot('fighters-apart-camera');record('dynamic-camera',{initial,apart});
   await openPitPause(page);const paused=await state();await page.clock.runFor(1000);assert.deepEqual(await state(),paused);await page.locator('[data-pit-resume]').click();await page.clock.runFor(64);record('pause-preserves-stage');}
  assert.equal(await storage(),saved);record(target.stageId,{drawings,savedBytesUnchanged:true});await page.clock.resume();await returnPitSelection(page);
 }await context.close();context=null;page=null;
 for(const mode of ['reduced','mobile']){await createContext({mobile:mode==='mobile',reduced:mode==='reduced'});await selection();const target=mode==='mobile'?targets.at(-1):targets[0];await choose(target);await launch(target);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await shot(mode+'-landscape');if(mode==='mobile'){await page.setViewportSize({width:390,height:844});await page.clock.runFor(32);await shot('mobile-portrait');assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}record(mode,{stageId:target.stageId});await context.close();context=null;page=null;}
 const target=targets[0];blockedPath=target.planes[1].assets[0].frames[0].path;await createContext();let blocked=true,failureCount=0;await page.route('**'+blockedPath,route=>{if(blocked){failureCount++;return route.fulfill({status:503,contentType:'text/plain',body:'Intentional V65 static atlas failure for isolated QA'});}return route.continue();});await selection();await choose(target);await page.waitForFunction(()=>document.querySelector('[data-pit-stage-preview]')?.dataset.previewStatus==='failed');assert(await page.locator('[data-pit-selection-confirm]').isDisabled());assert.equal(await page.locator('[data-pit-immersive]').count(),0);await shot('required-atlas-503');blocked=false;await page.getByRole('button',{name:'Réessayer l’aperçu',exact:true}).click();await launch(target);await shot('required-atlas-recovered');record('required-atlas-503-retry',{failureCount,blockedPath});
 assert.deepEqual(errors,[]);assert.deepEqual(httpFailures,[]);assert.deepEqual(await sourceHashes(),before);
 const report={status:'PASS',url,version,checkedAt:new Date().toISOString(),surface:'real-roster-stage-duel-flow',targets:targets.map(t=>t.stageId),checks,captures,errors,httpFailures,sourceHashes:before,manualVisualReview:'pending',limits:['Isolated browser profiles use a QA campaign fixture; user saves are not modified.','Browser clock controls elapsed time; real input and normal simulation are used.','No new stage animation is claimed.','Mobile is emulated Chromium, not hardware verification.']};
 await fs.writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:'PASS',checks:checks.length,output}));
}catch(error){await shot('failure').catch(()=>{});await fs.writeFile(path.join(output,'failure.json'),JSON.stringify({error:String(error),stack:error.stack,checks,captures,errors,httpFailures,state:await state().catch(()=>null)},null,2)+'\n');console.error(error);process.exitCode=1;}
finally{await context?.close().catch(()=>{});await browser?.close();}
