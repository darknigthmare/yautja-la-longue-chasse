import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import {chromium} from 'playwright-core';
import {campaignFixture, enterCampaignDeck} from './campaign-browser-helpers.mjs';
import {choosePitFighter, choosePitStage, closePitSelectionOptions, openPitPause, resumePitFight} from './pit-selection-browser-helpers.mjs';

const url=process.env.V55_STAGES_QA_URL||'http://127.0.0.1:4174';
const output=process.env.V55_STAGES_QA_OUTPUT||'work-local/v56/stage-selection-browser-qa';
const temp=process.env.V55_STAGES_QA_TEMP||path.resolve('work-local/v56/temp');
if(await fs.stat(temp).then(s=>s.isDirectory()).catch(()=>false)){process.env.TEMP=temp;process.env.TMP=temp;}
const version=process.env.V55_STAGES_QA_VERSION||'V56', checks=[], errors=[], httpFailures=[], nonReadRequests=[], captures=[], bouts=[], recommendations=[];
const digest=value=>createHash('sha256').update(value).digest('hex');
const record=(name,details={})=>{checks.push({name,...details});console.log(JSON.stringify({check:name,passed:true}));};
let browser,page,activeContext;
await fs.mkdir(output,{recursive:true});
// Current roster export is source-data evidence, never a claim that every identity was fought.
const bundle=await build({stdin:{contents:'export { PIT_CHARACTER_STAGE_COVERAGE } from "./app/game/systems/pitCharacterStages.ts"; export { PIT_ARENAS, PIT_ARENA_IDS } from "./app/game/systems/pitCombat.ts"; export { PIT_SPRITE_SHEET_REGISTRY } from "./app/game/pitSpriteSheetRegistry.ts";',resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',write:false,logLevel:'silent'});
const api=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const plan=JSON.parse(await fs.readFile('docs/v55-stage-plan.json','utf8'));
const stages=plan.stages.filter(s=>s.number>=139&&s.number<=161).sort((a,b)=>a.number-b.number);
const coverage=api.PIT_CHARACTER_STAGE_COVERAGE;
const rosterCount=198;
const fighters=[{id:'city-hunter',variant:'city-hunter-avec-casque-12136078fe'},{id:'scar',variant:'scar-avec-casque-6a0a69930d'}];
const representatives=[139,140,141,143,145,153,157,160];
assert.equal(new Set(representatives.map(number=>stages.find(stage=>stage.number===number)?.moduleProfile)).size,8,'The selected duel sample must cover eight distinct composition profiles before launching the browser');
const recommendationIds=['theta','user-prince','user-hashori','user-albino','user-clan-leader','user-samourai-yautja-en-armure-ecarlate'];
const storage=()=>page.evaluate(()=>JSON.stringify(Object.fromEntries(Object.entries(localStorage).sort(([a],[b])=>a.localeCompare(b)))));
const read=()=>page.evaluate(()=>{
 const root=document.querySelector('[data-pit-immersive]'),c=root?.querySelector('canvas[data-pit-fighter-positions]');
 return {phase:root?.dataset.pitPresentationPhase,blocked:root?.dataset.pitPresentationBlocked,slot:Number(root?.dataset.pitPresentationFighterSlot),countdown:Number(root?.dataset.pitPresentationCountdown),frame:Number(root?.querySelector('[data-pit-frame]')?.dataset.pitFrame),positions:JSON.parse(c?.dataset.pitFighterPositions||'[]'),scene:c?.dataset.pitSceneArenaId,art:c?.dataset.pitArenaArtStatus,missing:Number(c?.dataset.pitArenaMissingAssets),zoom:Number(c?.dataset.pitCameraZoom),centerX:Number(c?.dataset.pitCameraCenterX),cameraMode:c?.dataset.pitCameraMode,statuses:[...document.querySelectorAll('[data-pit-bitmap-status]')].map(n=>({slot:Number(n.dataset.pitBitmapSlot),status:n.dataset.pitBitmapStatus,variant:n.dataset.pitBitmapVariant}))};
});
async function shot(name){const file=path.join(output,name+'.png');await page.screenshot({path:file});captures.push({file:path.basename(file),sha256:digest(await fs.readFile(file)),visualReview:'pending-human-or-agent-image-inspection'});}
async function fit(){const state=await page.evaluate(()=>({viewport:[innerWidth,innerHeight],scrollWidth:document.documentElement.scrollWidth,canvas:(()=>{const c=document.querySelector('canvas[data-pit-fighter-positions]')||document.querySelector('[data-pit-stage-preview]');if(!c)return null;const r=c.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom};})()}));assert(state.scrollWidth<=state.viewport[0]+1,'No horizontal page overflow');assert(state.canvas&&state.canvas.width>100&&state.canvas.height>60);assert(state.canvas.x>=-1&&state.canvas.right<=state.viewport[0]+1,'Actual scene must fit horizontally');return state;}

// Passive observation only: call the original draw first and read its source alpha.
// No engine, HP, timeline, camera, storage or gameplay function is patched.
function installObserver(){
 const original=CanvasRenderingContext2D.prototype.drawImage,sources=new WeakMap(),supportCache=new WeakMap();
 window.__pitV55Evidence={draws:[],phases:[],stageSources:{}};
 function support(image,rect){
  let cells=supportCache.get(image);if(!cells){cells=new Map();supportCache.set(image,cells);}const key=rect.join(',');if(cells.has(key))return cells.get(key);
  const c=document.createElement('canvas');c.width=rect[2];c.height=rect[3];const ctx=c.getContext('2d',{willReadFrequently:true});
  original.call(ctx,image,...rect,0,0,c.width,c.height);const data=ctx.getImageData(0,0,c.width,c.height).data;let edge=null;
  for(let y=c.height-1;y>=0;y--){let n=0;for(let x=0;x<c.width;x++)if(data[(y*c.width+x)*4+3]>=128)n++;if(n>=Math.max(2,Math.min(8,Math.ceil(c.width*.003)))){edge=y+1;break;}}
  c.width=c.height=0;cells.set(key,edge);return edge;
 }
 CanvasRenderingContext2D.prototype.drawImage=function(...args){
  const result=original.apply(this,args),image=args[0],source=image instanceof HTMLImageElement?image.currentSrc||image.src:sources.get(image),e=window.__pitV55Evidence;
  if(source&&args.length===3)sources.set(this.canvas,source);
  if(source&&this.canvas.matches?.('[data-pit-stage-preview]')){const id=this.canvas.dataset.pitStagePreview;e.stageSources[id]??=[];const pathname=new URL(source,location.href).pathname;if(!e.stageSources[id].includes(pathname))e.stageSources[id].push(pathname);}
  if(!this.canvas.matches?.('canvas[data-pit-fighter-positions]'))return result;
  const root=document.querySelector('[data-pit-immersive]'),phase=root?.dataset.pitPresentationPhase,slot=Number(root?.dataset.pitPresentationFighterSlot),countdown=Number(root?.dataset.pitPresentationCountdown);
  const previous=e.phases.at(-1);if(!previous||previous.phase!==phase||previous.slot!==slot||previous.countdown!==countdown)e.phases.push({phase,slot,countdown,frame:Number(root?.querySelector('[data-pit-frame]')?.dataset.pitFrame)});
  if(source&&args.length===9&&/\/game\/sprites\/v(?:51|52|53)\/pit\//.test(source)&&e.draws.length<14000){const m=this.getTransform();e.draws.push({src:new URL(source,location.href).pathname,rect:args.slice(1,5),destination:args.slice(5),supportEdge:support(image,args.slice(1,5)),phase,transform:{a:m.a,b:m.b,c:m.c,d:m.d}});}
  return result;
 };
}
async function newPage(mobile=false){
 assert(!activeContext,'One QA context at a time');
 activeContext=await browser.newContext({viewport:mobile?{width:844,height:390}:{width:1280,height:720},hasTouch:mobile,isMobile:mobile,reducedMotion:'no-preference'});
 const fixture=structuredClone(await campaignFixture());fixture.save.settings.screenShake=false;
 await activeContext.addInitScript(({key,save})=>localStorage.setItem(key,JSON.stringify(save)),fixture);
 await activeContext.addInitScript(installObserver);page=await activeContext.newPage();page.setDefaultTimeout(45000);
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)httpFailures.push({status:r.status(),url:r.url()});});
 page.on('request',r=>{if(!['GET','HEAD','OPTIONS'].includes(r.method())&&new URL(r.url()).origin===new URL(url).origin)nonReadRequests.push({method:r.method(),path:new URL(r.url()).pathname});});
 await enterCampaignDeck(page,{url});assert.equal(await page.locator('[data-game-content-version]').first().getAttribute('data-game-content-version'),version);
 await page.getByRole('button',{name:'THE PIT · combat',exact:true}).click();await closePitSelectionOptions(page);await page.getByRole('radio',{name:/^Versus local/}).click();await closePitSelectionOptions(page);
 return storage();
}
async function closePage(before,label){const after=await storage();assert.equal(after,before,label+': all localStorage bytes must stay unchanged');record(label+'-save-conservation',{sha256:digest(before),keys:Object.keys(JSON.parse(before)),allBytesUnchanged:true});await activeContext.close();activeContext=null;page=null;}
async function selectPair(player=fighters[0].id){
 for(const [slot,id] of [player,fighters[1].id].entries()){
  await choosePitFighter(page,id);const known=fighters.find(f=>f.id===id);if(known)await page.locator('[data-pit-variant-select]').selectOption(known.variant);
  await page.locator('[data-pit-selection-confirm]').click();
  if(slot===0)await page.locator('[data-pit-selection-step="fighters"]').waitFor();
 }
 await page.locator('[data-pit-selection-step="stage"]').waitFor();
}
async function ready(id){await page.waitForFunction(id=>{const c=document.querySelector('[data-pit-stage-preview]');return c?.dataset.pitStagePreview===id&&c.dataset.previewStatus==='ready';},id);await page.locator('[data-pit-scene-assets]').waitFor({state:'detached'});assert(await page.locator('[data-pit-selection-confirm]').isEnabled());}
async function thumbnails(){await page.waitForFunction(()=>[...document.querySelectorAll('[data-pit-stage-total] img')].filter(img=>{const r=img.getBoundingClientRect();return r.width&&r.height&&r.bottom>0&&r.top<innerHeight&&r.right>0&&r.left<innerWidth;}).every(img=>img.complete&&img.naturalWidth>0));}
async function retryBanks(stage,independentParent){
 const before=await newPage();await selectPair();const pattern='**'+stage.p0.publicPath;
 await page.route(pattern,r=>r.abort('failed'));await choosePitStage(page,stage.id);
 const retryPreview=page.getByRole('button',{name:'Réessayer l’aperçu',exact:true});await retryPreview.waitFor();await page.locator('[data-pit-scene-assets="failed"]').waitFor();
 assert(await page.locator('[data-pit-selection-confirm]').isDisabled());assert.equal(await page.locator('[data-pit-immersive]').count(),0);await page.unroute(pattern);
 if(independentParent){
  // Real browser accessibility preference restarts the child preview only.
  // No bank, combat ref or engine state is injected.
  await page.emulateMedia({reducedMotion:'reduce'});await page.waitForFunction(()=>document.querySelector('[data-pit-stage-preview]')?.dataset.previewStatus==='ready');
  await page.locator('[data-pit-scene-assets="failed"]').waitFor();assert(await page.locator('[data-pit-selection-confirm]').isDisabled());
  const retryParent=page.getByRole('button',{name:'Réessayer les plans du combat',exact:true});assert(await retryParent.isVisible());await shot('independent-parent-bank-failed');await retryParent.click();await ready(stage.id);
 }else{await shot('preview-bank-failed');await retryPreview.click();await ready(stage.id);}
 record(independentParent?'retry-independent-parent-bank':'retry-preview-and-parent-banks',{stageId:stage.id,abortedAsset:stage.p0.publicPath,launchBlocked:true,recovered:true});await closePage(before,independentParent?'parent-retry':'preview-retry');
}
function validateGrounding(draws,arena){
 return fighters.map((fighter,slot)=>{
  const definition=api.PIT_SPRITE_SHEET_REGISTRY.find(d=>d.variantId===fighter.variant&&d.atlas.clips.some(c=>c.id==='pit.presentation.intro'));
  const clip=definition.atlas.clips.find(c=>c.id==='pit.presentation.intro'&&c.facing===(slot===0?'right':'left')),f=clip.frames.at(-1),src=definition.atlas.pages.find(p=>p.id===f.pageId).src;
  const observed=draws.filter(d=>d.phase==='fight'&&d.src===src&&JSON.stringify(d.rect)===JSON.stringify(f.rect));assert(observed.length>0,'Held native drawing must really draw for slot'+slot);
  const gaps=observed.map(d=>{assert(Number.isFinite(d.supportEdge));assert(d.transform.a>0&&d.transform.d>0&&d.transform.b===0&&d.transform.c===0,'No native mirroring');return Math.abs(d.destination[1]+d.supportEdge*d.destination[3]/d.rect[3]-arena.groundY);});
  assert(Math.max(...gaps)<=.6,'Opaque feet must meet the rendered support plane');return {slot,variant:fighter.variant,observedDraws:observed.length,maxGap:Math.max(...gaps),src,rect:f.rect};
 });
}
try{
 assert.deepEqual(stages.map(s=>s.number),Array.from({length:23},(_,i)=>139+i),'Wait for the complete V55 plan before executing');
 assert.equal(plan.associations.length,195,'V55 historical source plan remains at195');
 assert.equal(coverage.length,rosterCount);assert.equal(new Set(coverage.map(e=>e.fighterId)).size,rosterCount);
 for(const id of ['original-arid-ermit-yautja','original-mutated-yautja','guest-amengi-female'])assert(coverage.some(entry=>entry.fighterId===id));
 for(const entry of coverage){assert(['character-setting','work-setting','original-exhibition'].includes(entry.classification));assert(['resolved','primary-limited','original-selected'].includes(entry.sourceStatus));assert(api.PIT_ARENA_IDS.includes(entry.stageId),'Recommended arena must be activated: '+entry.fighterId);assert.equal(entry.exactGeometryCertified,false);}
 for(const stage of stages)assert(api.PIT_ARENA_IDS.includes(stage.id),'Wait for renderer activation: '+stage.id);
 await fs.writeFile(path.join(output,'roster-module-coverage.json'),JSON.stringify({provenance:'Bundled current source export, not browser played-match evidence',historicalV55Associations:plan.associations.length,entries:coverage},null,2));record('module-current-explicit-associations',{count:rosterCount,historicalV55:195,geometryCertified:false});
 browser=await chromium.launch({channel:process.env.V55_STAGES_QA_BROWSER_CHANNEL||'chrome',headless:true});
 let before=await newPage();
 const seen=new Set();const roster=page.locator('[data-pit-roster-total]');assert.equal(Number(await roster.getAttribute('data-pit-roster-total')),rosterCount);
 for(let n=0;n<30;n++){
  for(const id of await roster.getByRole('option').evaluateAll(nodes=>nodes.map(n=>n.dataset.choiceId)))seen.add(id);
  const next=page.locator('[data-pit-roster-page-next]');if(!(await next.count())||await next.isDisabled())break;await next.click();
 }
 assert.deepEqual([...seen].sort(),coverage.map(e=>e.fighterId).sort());record('browser-current-roster-icons',{count:seen.size,evidence:'Every current roster page read; no claim that every identity was fought'});
 await selectPair();
 for(const stage of stages){
  await choosePitStage(page,stage.id);await ready(stage.id);
  const first=await page.locator('[data-pit-stage-preview]').evaluate(c=>({planes:c.dataset.previewPlanes.split(','),frame:Number(c.dataset.previewFrame),cameraX:Number(c.dataset.previewCameraX)}));
  assert.deepEqual([...new Set(first.planes)].sort(),['P0','P1','P2','P3','P4','P5']);await page.waitForTimeout(170);
  const later=await page.locator('[data-pit-stage-preview]').evaluate(c=>({frame:Number(c.dataset.previewFrame),cameraX:Number(c.dataset.previewCameraX)}));assert(later.frame>first.frame);assert.notEqual(later.cameraX,first.cameraX);
  const sources=await page.evaluate(id=>window.__pitV55Evidence.stageSources[id]||[],stage.id);assert(sources.includes(stage.p0.publicPath),'The exact new P0 must actually draw');
  if(stage.kind!=='original'){assert.match(await page.locator('[data-pit-screen-reference]').innerText(),/Réinterprétation latérale 2D/);const href=await page.locator('[data-pit-screen-reference] a').getAttribute('href');assert.equal(href,stage.reference.sources[0]);}
  else assert.match(await page.locator('[data-pit-original-exhibition]').innerText(),/Exposition originale/);
  await thumbnails();await fit();await shot(stage.id+'-preview');record('preview-'+stage.number,{stageId:stage.id,profile:stage.moduleProfile,planes:first.planes,exactP0Observed:true,cameraMoves:true});
 }
 await page.setViewportSize({width:844,height:390});for(const number of [142,147,161]){const s=stages.find(s=>s.number===number);await choosePitStage(page,s.id);await ready(s.id);await fit();await shot(s.id+'-mobile-preview');}record('mobile-three-stage-previews',{viewport:[844,390],numbers:[142,147,161],scope:'Viewport layout, not physical handset'});
 await closePage(before,'all-stage-previews');
 await retryBanks(stages[0],false);await retryBanks(stages[0],true);
 for(const fighterId of recommendationIds){
  before=await newPage();await selectPair(fighterId);const expected=coverage.find(e=>e.fighterId===fighterId),note=page.locator('[data-pit-character-stage]');
  assert.equal(await note.getAttribute('data-pit-stage-classification'),expected.classification);assert.equal(await note.getAttribute('data-pit-stage-source-status'),expected.sourceStatus);
  const text=await note.innerText();assert(text.includes(expected.reason));if(expected.sourceStatus==='primary-limited')assert.match(text,/Sources primaires limitées/);if(expected.classification==='original-exhibition')assert.match(text,/Exposition originale choisie/);
  const button=page.locator(`[data-pit-recommended-stage="${expected.stageId}"]`);if(await button.isEnabled())await button.click();await ready(expected.stageId);await shot('recommendation-'+fighterId);
  recommendations.push({fighterId,stageId:expected.stageId,classification:expected.classification,sourceStatus:expected.sourceStatus,displayedReason:text});record('recommendation-'+fighterId,{stageId:expected.stageId,classification:expected.classification,sourceStatus:expected.sourceStatus});await closePage(before,'recommendation-'+fighterId);
 }
 for(const [index,number] of representatives.entries()){
  const stage=stages.find(s=>s.number===number),mobile=index===representatives.length-1;before=await newPage(mobile);await selectPair();await choosePitStage(page,stage.id);await ready(stage.id);
  await page.evaluate(()=>{window.__pitV55Evidence.draws=[];window.__pitV55Evidence.phases=[];});
  if(mobile)await page.locator('[data-pit-selection-confirm]').tap();else await page.locator('[data-pit-selection-confirm]').click();
  await page.locator('[data-pit-match-loading]').waitFor({state:'detached'});await page.waitForFunction(()=>document.querySelector('[data-pit-immersive]')?.dataset.pitPresentationPhase==='intro-left');
  await shot(stage.id+'-intro');await page.waitForFunction(()=>{const r=document.querySelector('[data-pit-immersive]');return r?.dataset.pitPresentationPhase==='fight'&&r.dataset.pitPresentationBlocked==='false'&&Number(r.querySelector('[data-pit-frame]')?.dataset.pitFrame)>12;});
  const phases=await page.evaluate(()=>window.__pitV55Evidence.phases);for(const [slot,phase] of ['intro-left','intro-right'].entries())assert(phases.some(p=>p.phase===phase&&p.slot===slot),'Both character intros must play');for(const count of [3,2,1])assert(phases.some(p=>p.phase==='countdown'&&p.countdown===count),'Countdown '+count+' must be observed');
  const initial=await read();assert.equal(initial.scene,stage.id);assert.equal(initial.art,'bitmap');assert.equal(initial.missing,0);assert(initial.positions.every(p=>p.y===0));assert.deepEqual(initial.statuses.map(s=>s.variant),fighters.map(f=>f.variant));
  const grounding=validateGrounding(await page.evaluate(()=>window.__pitV55Evidence.draws),api.PIT_ARENAS[stage.id]);await fit();await shot(stage.id+'-duel-grounded');
  await page.keyboard.down('ArrowLeft');await page.keyboard.down('Numpad6');await page.waitForTimeout(1000);await page.keyboard.up('ArrowLeft');await page.keyboard.up('Numpad6');await page.waitForTimeout(350);
  const apart=await read();assert(apart.positions[0].x<initial.positions[0].x&&apart.positions[1].x>initial.positions[1].x,'Both players must retreat through real input');assert(apart.zoom<initial.zoom-.01,'Follow camera must widen as fighters separate');await shot(stage.id+'-camera-wide');
  await openPitPause(page);const frozen=await read();await page.waitForTimeout(250);const still=await read();assert.equal(still.frame,frozen.frame);assert.deepEqual(still.positions,frozen.positions);assert.equal(still.zoom,frozen.zoom);await resumePitFight(page);
  bouts.push({stageId:stage.id,profile:stage.moduleProfile,mobile,phases,initial,apart,grounding,pauseFrozen:true});record('real-duel-'+number,{profile:stage.moduleProfile,mobile,intros:2,countdown:[3,2,1],nativeGroundedSides:2,cameraWidened:true,pauseFrozen:true});await closePage(before,'duel-'+number);
 }
 assert.equal(bouts.length,8);assert.equal(new Set(bouts.map(b=>b.profile)).size,8,'Eight different composition profiles are required');assert.deepEqual(errors,[]);assert.deepEqual(httpFailures,[]);assert.deepEqual(nonReadRequests,[]);
 const report={status:'PASS',version,url,checkedAt:new Date().toISOString(),browser:'Installed Chrome, one isolated context at a time',fixture:'Synthetic defaultSave generated by local source; no user profile, account, token or private save imported',counts:{moduleIdentities:rosterCount,browserRosterIcons:rosterCount,historicalV55Associations:plan.associations.length,newStagePreviews:23,mobileExtraPreviews:3,recommendations:recommendations.length,realDuels:bouts.length,profileSamples:new Set(bouts.map(b=>b.profile)).size},checks,recommendations,bouts,errors,httpFailures,nonReadRequests,allLocalStorageBytesUnchanged:true,limitations:['198 counts exported associations and browsed icons; the historical V55 source plan remains195. This is not198 played fights.','Only eight representative stages were fought; all23 new stages were previewed.','Mobile is Chromium viewport/touch emulation, not a physical device.','Foot alpha checks target City/Scar exact masked held poses; prop geometry is covered by the separate renderer audit.','Captures require explicit visual inspection; an automatic PASS does not imply that inspection occurred.'],captures};
 await fs.writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n');await fs.writeFile(path.join(output,'manifest.json'),JSON.stringify({version,url,report:'report.json',captures,visualInspectionComplete:false},null,2)+'\n');console.log(JSON.stringify({status:'PASS',checks:checks.length,counts:report.counts,output}));
}catch(error){if(page)await shot('failure').catch(()=>{});await fs.writeFile(path.join(output,'failure.json'),JSON.stringify({error:String(error),stack:error.stack,checks,errors,httpFailures,nonReadRequests,bouts,recommendations,captures,state:page?await read().catch(()=>null):null,body:page?await page.locator('body').innerText().catch(()=>null):null},null,2));console.error(error);process.exitCode=1;}
finally{if(page){await page.keyboard.up('ArrowLeft').catch(()=>{});await page.keyboard.up('Numpad6').catch(()=>{});}await activeContext?.close().catch(()=>{});await browser?.close();}
