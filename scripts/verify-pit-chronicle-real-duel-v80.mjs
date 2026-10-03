/** One unmodified eight-duel-route encounter, never eight fabricated wins.
 * defaultSave opens an isolated GameClient deck; the chronicle is started,
 * played, settled and restored through its real public UI. */
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
import {homeworldSceneSsrV78} from '../tests/helpers/homeworld-scene-ssr-v78.mjs';
import {openPitPause,resumePitFight} from './pit-selection-browser-helpers.mjs';
import {qaContractV80,snapshotSourcesV80,requireVersionV80,hardErrorsV80,outputWithinQaV80,hashV80} from './public-qa-contract-v80.mjs';

const base=process.env.V80_QA_BASE||'http://localhost:4204';
const cdp=process.env.V80_CDP||'http://127.0.0.1:58680';
const cdpUrl=new URL(cdp);assert.ok(['localhost','127.0.0.1'].includes(cdpUrl.hostname)&&cdpUrl.protocol==='http:'&&!cdpUrl.username&&!cdpUrl.password,'CDP stays on the explicitly assigned local QA Chrome');
const output=path.resolve(process.env.V80_QA_OUTPUT||'work-local/v80/qa/chronicle-real-duel-final-local');
outputWithinQaV80(output);const contract=qaContractV80(base,output);fs.mkdirSync(output,{recursive:true});
const loader=homeworldSceneSsrV78(),C=loader.load('app/game/systems/pitCharacterChroniclesV79.ts'),S=loader.load('app/game/save.ts');
const owner='2026-10-03T19:00:00.000Z',fixture=S.defaultSave(owner);fixture.settings.screenShake=false;
const route=C.getPitCharacterChronicleRouteV79('greyback',2);assert.equal(route.encounters.length,8);
const runKey=C.pitCharacterChronicleStorageKeyV79(owner,2)+'.greyback';
const sourceFiles=['app/globals.css','app/game/buildInfo.ts','app/game/GameClient.tsx','app/game/save.ts','app/game/types.ts',
 'app/game/PitExperienceV79.tsx','app/game/PitExperienceV79.module.css','app/game/systems/pitCharacterChroniclesV79.ts',
 'app/game/systems/pitCharacterChronicleDataV80.ts','app/game/data/pitChronicleSeedsV80.ts',
 'app/game/PitCanvas.tsx','app/game/PitFinisherHudV80.tsx','app/game/PitFinishersV80.module.css','app/game/systems/pitFinishersV80.ts'];
const report={...contract,base,isolation:{...contract.isolation,cdpEndpoint:cdp},kind:'real-GameClient-one-chronicle-CPU-duel',sourceFiles,
 fixtures:['One fresh incognito context, real GameClient, explicit defaultSave deck-entry fixture. Not a prologue played to completion.',
  'No legacy or V80 chronicle checkpoint is preseeded; the three opening panels and first encounter are entered through the UI.',
  'Only the initial campaign fixture is seeded once per fresh page session. Reload does not reset campaign data or chronicle receipts.',
  'Keyboard movement approaches the real CPU without attacks. Real KO or native round clock determines the match; a genuine loss is acceptable.',
  'No HP, actor position, objective, combat phase, winner, simulation time or result is injected. No synthetic receipt is applied.'],
 limits:['One first encounter of the Greyback content-version-2 route only, not all eight duels or 201 stories won.',
  'A nonlethal presentation with shipped art is not a newly drawn native finisher animation or a canonical story event.',
  'Desktop Chromium browser gameplay only; no physical gamepad, mobile handset, cloud sync or user save is certified.',
  'Public commit/READY binding is required separately when the configured base is HTTPS; local runs are not a public release gate.'],
 checks:[],captures:[],contexts:[],errors:[]};
report.sourceBefore=snapshotSourcesV80(sourceFiles,contract);
const persist=()=>fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n');
const check=(name,detail={})=>{report.checks.push({name,detail,at:new Date().toISOString()});persist();console.log('PASS '+name);};
const browser=await chromium.connectOverCDP(cdp);let context,page,held=null;

function readCombat(){
 const root=document.querySelector('[data-pit-immersive]'),canvas=root?.querySelector('canvas[data-pit-fighter-positions]'),hud=root?.querySelector('[data-pit-finisher-hud]');
 return {presentation:root?.dataset.pitPresentationPhase,blocked:root?.dataset.pitPresentationBlocked,
  round:Number(root?.dataset.pitPresentationRound),countdown:Number(root?.dataset.pitPresentationCountdown),
  winnerSlot:root?.dataset.pitPresentationWinnerSlot===''?null:Number(root?.dataset.pitPresentationWinnerSlot),
  phase:root?.dataset.pitCombatPhase,frame:Number(root?.querySelector('[data-pit-frame]')?.dataset.pitFrame),
  paused:root?.dataset.pitPaused,positions:JSON.parse(canvas?.dataset.pitFighterPositions||'[]'),
  art:canvas?.dataset.pitArenaArtStatus,missing:Number(canvas?.dataset.pitArenaMissingAssets),
  scene:canvas?.dataset.pitSceneArenaId,finisher:canvas?.dataset.pitFinisherPhase,
  hudPhase:hud?.getAttribute('data-phase')||null,nonlethal:hud?.getAttribute('data-nonlethal')||null,
  terminalReady:root?.dataset.pitPresentationTerminalReady,
  hp:[...(root?.querySelectorAll('[role="progressbar"][aria-label^="Vie de"]')||[])].map(n=>Number(n.getAttribute('aria-valuenow')))};
}
async function otherStorage(){return page.evaluate(()=>Object.fromEntries(Object.keys(localStorage).filter(k=>!k.includes('the-pit-character-chronicles')).sort().map(k=>[k,localStorage.getItem(k)])));}
async function actualRun(){
 const bytes=await page.evaluate(k=>localStorage.getItem(k),runKey);
 assert.ok(bytes,'The actual UI must write its genuine chronicle checkpoint');
 const parsed=C.parsePitCharacterChronicleRunV79(bytes,owner);assert.ok(parsed,'Actual receipt must pass the production normalizer');
 assert.equal(parsed.contentVersion,2);assert.equal(parsed.fighterId,'greyback');return {bytes,run:parsed};
}
async function readyScene(){
 await page.waitForFunction(()=>document.querySelector('[data-pit-stage-preview]')?.dataset.previewStatus==='ready');
 await page.evaluate(async()=>{await Promise.all([...document.querySelectorAll('[data-native-chronicle-portrait] img,img[data-native-chronicle-portrait]')].map(i=>i.decode()));await document.fonts.ready;});
}
async function capture(label){
 const filename=String(report.captures.length+1).padStart(2,'0')+'-'+label+'.png',filepath=path.join(output,filename);
 const detail=await page.evaluate(()=>{const rect=selector=>{const n=document.querySelector(selector);if(!n)return null;const r=n.getBoundingClientRect(),s=getComputedStyle(n);return {x:r.x,y:r.y,left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height,visible:r.width>0&&r.height>0&&s.display!=='none'&&s.visibility!=='hidden',text:n.textContent};};return {contentVersion:document.querySelector('[data-game-content-version]')?.dataset.gameContentVersion,
  viewport:[innerWidth,innerHeight],documentWidth:document.documentElement.clientWidth,scrollWidth:document.documentElement.scrollWidth,
  chronicle:document.querySelector('[data-pit-character-chronicles]')?.dataset,
  body:document.querySelector('[data-chronicle-scene]')?.querySelector('p')?.textContent,
  activeCombatRoots:document.querySelectorAll('[data-pit-immersive]').length,
  conclusionText:document.querySelector('[data-pit-finisher-hud]')?.textContent||null,
  conclusionControls:{skip:rect('[data-pit-finisher-skip]'),menu:rect('[data-pit-menu-button]'),touchRows:rect('[aria-label="Commandes tactiles"]')}};});
 if(label==='genuine-nonlethal-conclusion'){
  const {skip,menu,touchRows}=detail.conclusionControls;assert.ok(skip?.visible,'Actual conclusion skip CTA is visible');
  assert.ok(skip.left>=0&&skip.top>=0&&skip.right<=detail.viewport[0]&&skip.bottom<=detail.viewport[1],'Actual conclusion skip CTA is entirely in the viewport');
  if(menu?.visible){const overlap=Math.max(0,Math.min(skip.right,menu.right)-Math.max(skip.left,menu.left))*Math.max(0,Math.min(skip.bottom,menu.bottom)-Math.max(skip.top,menu.top));assert.equal(overlap,0,'MENU no longer covers the actual conclusion skip CTA');}
  assert.ok(!touchRows?.visible,'Terminal combat pads do not remain visible over the conclusion');
 }
 assert.equal(detail.contentVersion,'V80');await page.screenshot({path:filepath,fullPage:true});
 report.captures.push({label,filename,filepath,capturedAt:new Date().toISOString(),sha256:hashV80(fs.readFileSync(filepath)),detail,combat:await page.evaluate(readCombat)});
 persist();console.log('CAPTURE '+filename);
}
async function selectGreyback(){
 await page.waitForLoadState('networkidle');
 await page.locator('[data-pit-character-chronicle-open]').click();
 const search=page.getByRole('searchbox');await search.fill('Greyback');
 await page.getByRole('navigation',{name:'Chroniques jouables'}).getByRole('button',{name:/Greyback/i}).click();
 assert.equal(await page.locator('[data-pit-character-chronicles]').getAttribute('data-chronicle-fighter'),'greyback');
}
try{
 context=await browser.newContext({viewport:{width:1440,height:900}});page=await context.newPage();page.setDefaultTimeout(60000);
 const errors=[];report.contexts.push({label:'desktop-isolated-Greyback-first-genuine-duel',errors});
 page.on('pageerror',e=>errors.push({kind:'pageerror',text:e.message}));
 page.on('console',m=>{if(m.type()==='error')errors.push({kind:'console',text:m.text()});});
 page.on('requestfailed',r=>errors.push({kind:'requestfailed',url:r.url(),error:r.failure()?.errorText}));
 page.on('response',r=>{if(r.status()>=400)errors.push({kind:'http',url:r.url(),status:r.status()});});
 await context.addInitScript(({key,save})=>{
  const marker='isolated-v80-chronicle-campaign-fixture-seeded';
  if(!sessionStorage.getItem(marker)){localStorage.setItem(key,JSON.stringify(save));sessionStorage.setItem(marker,'once');}
 },{key:S.SAVE_STORAGE_KEY,save:fixture});
 // Observe only public DOM presentation states. These QA arrays have no
 // connection to game state, inputs, phase progression or the engine clock.
 await context.addInitScript(()=>{
  window.__v80ChronicleDuelPresentations=[];let prior='';
  const observe=()=>{
   const r=document.querySelector('[data-pit-immersive]');if(!r)return;
   const c=r.querySelector('canvas[data-pit-fighter-positions]'),h=r.querySelector('[data-pit-finisher-hud]');
   const row={phase:r.dataset.pitPresentationPhase,round:Number(r.dataset.pitPresentationRound),countdown:Number(r.dataset.pitPresentationCountdown),
    blocked:r.dataset.pitPresentationBlocked,frame:Number(r.querySelector('[data-pit-frame]')?.dataset.pitFrame),
    finisher:c?.dataset.pitFinisherPhase,hudPhase:h?.getAttribute('data-phase')||null,nonlethal:h?.getAttribute('data-nonlethal')||null,
    terminalReady:r.dataset.pitPresentationTerminalReady};
   const signature=JSON.stringify({...row,frame:undefined});
   if(signature!==prior){prior=signature;window.__v80ChronicleDuelPresentations.push({...row,at:new Date().toISOString()});}
  };
  new MutationObserver(observe).observe(document,{subtree:true,childList:true,attributes:true,
   attributeFilter:['data-pit-presentation-phase','data-pit-presentation-round','data-pit-presentation-countdown','data-pit-presentation-blocked','data-pit-finisher-phase','data-phase','data-nonlethal','data-pit-presentation-terminal-ready']});
 });
 await page.goto(base,{waitUntil:'networkidle',timeout:120000});await page.getByRole('button',{name:/^Continuer/}).click();
 await page.locator('[data-campaign-session][data-campaign-location="deck"]').waitFor();await requireVersionV80(page,report,'actual GameClient deck');
 await page.getByRole('button',{name:'THE PIT · combat',exact:true}).click();await selectGreyback();
 assert.equal(await page.evaluate(k=>localStorage.getItem(k),runKey),null,'No V80 chronicle progression fixture');
 await page.getByRole('button',{name:'Commencer la chronique',exact:true}).click();
 for(let i=0;i<3;i++){
  await readyScene();assert.equal((await actualRun()).run.page,i);assert.equal((await actualRun()).run.phase,'intro');
  assert.equal(await page.locator('[data-pit-immersive]').count(),0);await capture('greyback-v80-intro-'+(i+1));await page.locator('[data-chronicle-primary]').click();
 }
 await readyScene();const prepared=(await actualRun()).run;assert.equal(prepared.phase,'pre');assert.equal(prepared.results.length,0);
 assert.equal(C.getPitCharacterChronicleRouteV79('greyback',prepared.contentVersion).encounters.length,8);
 assert.equal(await page.getByRole('button',{name:/Galerie · fin verrouillée/}).isEnabled(),false);
 await capture('greyback-v80-first-of-eight-brief');check('catalogue search selects V80 Greyback; three actual intro pages precede eight-duel route and locked ending');
 const otherBefore=await otherStorage(),campaignBefore=await page.evaluate(k=>localStorage.getItem(k),S.SAVE_STORAGE_KEY);
 await page.bringToFront();await page.locator('[data-chronicle-primary]').click();await page.locator('[data-pit-immersive]').waitFor();
 await page.locator('[data-pit-match-loading]').waitFor({state:'detached'});
 await page.waitForFunction(()=>document.querySelector('[data-pit-immersive]')?.dataset.pitPresentationPhase==='intro-left');
 await page.locator('[data-pit-immersive]').focus();await page.keyboard.press('j');await page.keyboard.press('ArrowRight');
 assert.equal((await page.evaluate(readCombat)).frame,0);await capture('genuine-duel-intro-left');
 await page.waitForFunction(()=>document.querySelector('[data-pit-immersive]')?.dataset.pitPresentationPhase==='intro-right');await capture('genuine-duel-intro-right');
 await page.waitForFunction(()=>document.querySelector('[data-pit-immersive]')?.dataset.pitPresentationPhase==='countdown');await capture('genuine-duel-countdown');
 await page.waitForFunction(()=>document.querySelector('[data-pit-immersive]')?.dataset.pitPresentationPhase==='fight');
 const introductions=await page.evaluate(()=>window.__v80ChronicleDuelPresentations);
 for(const p of ['intro-left','intro-right'])assert.ok(introductions.some(r=>r.phase===p));
 for(const n of [3,2,1])assert.ok(introductions.some(r=>r.phase==='countdown'&&r.countdown===n));
 assert.ok(introductions.filter(r=>['intro-left','intro-right','countdown'].includes(r.phase)).every(r=>r.frame===0&&r.blocked==='true'));
 check('two fighter intros and real 3/2/1 countdown block combat simulation and keyboard input',{introductions});
 await openPitPause(page);const frozen=await page.evaluate(readCombat);await page.waitForTimeout(400);assert.deepEqual(await page.evaluate(readCombat),frozen);
 await capture('genuine-duel-native-pause');await resumePitFight(page);
 await page.waitForFunction(frame=>Number(document.querySelector('[data-pit-frame]')?.dataset.pitFrame)>frame,frozen.frame);
 check('native pause freezes duel and resume restores active simulation');
 const deadline=Date.now()+240000,samples=[];let firstRoundShot=false,lastFrame=-1,stalledAt=Date.now();
 while(Date.now()<deadline){
  const state=await page.evaluate(readCombat);if(state.phase==='match-over')break;
  if(state.presentation==='round-result'&&!firstRoundShot){await capture('genuine-first-round-result');firstRoundShot=true;}
  if(state.frame!==lastFrame){lastFrame=state.frame;stalledAt=Date.now();}
  if(Date.now()-stalledAt>1500){await page.bringToFront();await page.locator('[data-pit-immersive]').focus();stalledAt=Date.now();}
  const d=state.positions.length===2?state.positions[1].x-state.positions[0].x:0;
  const next=state.presentation==='fight'&&Math.abs(d)>38?(d>0?'ArrowRight':'ArrowLeft'):null;
  if(held!==next){if(held)await page.keyboard.up(held);if(next)await page.keyboard.down(next);held=next;}
  if(!samples.length||samples.at(-1).round!==state.round||Date.now()-samples.at(-1).wallMs>10000){samples.push({wallMs:Date.now(),...state});console.log('REAL_DUEL '+JSON.stringify(state));}
  await page.waitForTimeout(80);
 }
 if(held){await page.keyboard.up(held);held=null;}
 const actualFinal=await page.evaluate(readCombat);assert.equal(actualFinal.phase,'match-over','Real CPU must settle one native match within four minutes');
 await page.locator('[data-pit-finisher-hud][data-nonlethal="true"]').waitFor();
 assert.equal(await page.getByRole('button',{name:'Lire l’issue de l’épreuve',exact:true}).count(),0,'Exit waits for actual nonlethal presentation');
 await capture('genuine-nonlethal-conclusion');
 await page.getByRole('button',{name:'Lire l’issue de l’épreuve',exact:true}).waitFor();
 const terminal=await page.evaluate(readCombat),presentations=await page.evaluate(()=>window.__v80ChronicleDuelPresentations);
 assert.equal(terminal.terminalReady,'true');assert.equal(terminal.finisher,'complete');
 for(const p of ['approach','signature','settle','complete'])assert.ok(presentations.some(r=>r.finisher===p),'Actual conclusion phase '+p);
 assert.ok(presentations.filter(r=>['window','approach','signature','settle'].includes(r.hudPhase)).every(r=>r.nonlethal==='true'));
 const saved=await actualRun();assert.equal(saved.run.results.length,1);assert.equal(saved.run.routeId,prepared.routeId);assert.equal(saved.run.runId,prepared.runId);
 const receipt=saved.run.results[0],expected=route.encounters[0];
 assert.equal(receipt.encounterId,expected.id);assert.equal(receipt.leftId,'greyback');assert.equal(receipt.rightId,expected.rightId);assert.equal(receipt.arenaId,expected.arenaId);
 assert.equal(receipt.winnerId,terminal.winnerSlot===null?null:terminal.winnerSlot===0?'greyback':expected.rightId);
 await page.waitForTimeout(500);assert.equal((await actualRun()).bytes,saved.bytes,'Terminal rendering never applies a second receipt');
 assert.equal(await page.locator('[data-pit-immersive]').count(),1);assert.deepEqual(await otherStorage(),otherBefore);
 await capture('genuine-terminal-result-one-receipt');
 await page.getByRole('button',{name:'Lire l’issue de l’épreuve',exact:true}).click();await page.locator('[data-pit-character-chronicles]').waitFor();await readyScene();
 assert.equal(await page.locator('[data-pit-immersive]').count(),0);assert.equal((await actualRun()).bytes,saved.bytes);
 assert.equal(await page.locator('[data-pit-character-chronicles]').getAttribute('data-chronicle-phase'),saved.run.phase);
 assert.equal(await page.evaluate(k=>localStorage.getItem(k),S.SAVE_STORAGE_KEY),campaignBefore);assert.deepEqual(await otherStorage(),otherBefore);
 await capture('genuine-receipt-explicit-return-to-story');
 report.realDuel={actualFinal,terminal,samples,presentations,receipt:saved.run,playedMatches:1,syntheticResults:0,
  result:saved.run.results[0].winnerId==='greyback'?'real-victory':saved.run.results[0].winnerId===null?'real-draw':'real-defeat'};
 check('one genuine receipt, nonlethal terminal presentation and explicit story return; campaign and other storage unchanged',{phase:saved.run.phase,result:report.realDuel.result,results:1});
 await page.reload({waitUntil:'networkidle'});assert.equal(await page.evaluate(k=>localStorage.getItem(k),S.SAVE_STORAGE_KEY),campaignBefore,'Reload must not reseed the fixture');
 await page.getByRole('button',{name:/^Continuer/}).click();await page.locator('[data-campaign-session][data-campaign-location="deck"]').waitFor();
 await requireVersionV80(page,report,'real full GameClient reload');await page.getByRole('button',{name:'THE PIT · combat',exact:true}).click();await selectGreyback();
 await readyScene();assert.equal((await actualRun()).bytes,saved.bytes);assert.equal(await page.locator('[data-pit-character-chronicles]').getAttribute('data-chronicle-phase'),saved.run.phase);
 assert.deepEqual(await otherStorage(),otherBefore);assert.equal(C.getPitCharacterChronicleGalleryAccessV80((await actualRun()).run).outro,false);
 await capture('genuine-one-receipt-restored-after-full-reload');
 check('actual one-duel receipt survives full GameClient reload, unchanged campaign and ending still locked',{results:1,phase:saved.run.phase});
 assert.equal(report.captures.length,13,'The fresh real-duel recipe must contain all thirteen expected captures');
 assert.equal(report.checks.length,5,'The five complete real-duel checks must all have executed');
 report.hardErrors=hardErrorsV80(report.contexts.flatMap(c=>c.errors));assert.deepEqual(report.hardErrors,[]);
 assert.deepEqual(snapshotSourcesV80(sourceFiles,contract),report.sourceBefore);report.status='PASS_ONE_REAL_CHRONICLE_DUEL_V80_PENDING_VISUAL_REVIEW';
}catch(error){report.status='FAIL';report.errors.push({text:error.stack,at:new Date().toISOString()});console.error(error);if(page&&!page.isClosed())await capture('failure').catch(()=>{});}
finally{if(held&&page&&!page.isClosed())await page.keyboard.up(held).catch(()=>{});report.sourceAfter=snapshotSourcesV80(sourceFiles,contract);report.completedAt=new Date().toISOString();persist();if(context)await context.close().catch(()=>{});console.log(JSON.stringify({status:report.status,captures:report.captures.length,checks:report.checks.length,output}));process.exit(report.status==='FAIL'?1:0);}
