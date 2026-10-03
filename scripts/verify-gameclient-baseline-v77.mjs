/** V77 real GameClient baseline. Connects only to an owned QA Chrome endpoint.
 * Fresh campaign is created through UI; Pit/hunt entry use declared defaultSave fixtures.
 * No actor/HP/phase/clock/checkpoint injection and no production writes. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {chromium} from 'playwright-core';
import {campaignFixture,enterCampaignDeck} from './campaign-browser-helpers.mjs';
import {choosePitFighter,choosePitStage,closePitSelectionOptions,openPitPause,resumePitFight} from './pit-selection-browser-helpers.mjs';

const argument=name=>process.argv.find(value=>value.startsWith(`--${name}=`))?.slice(name.length+3);
const url=argument('base'),cdp=argument('cdp')??'http://127.0.0.1:58677';
assert(url,'Pass --base for the confirmed V77 candidate or its HTTPS release URL');
const baseURL=new URL(url),cdpURL=new URL(cdp),loopback=hostname=>['127.0.0.1','localhost'].includes(hostname);
assert((baseURL.protocol==='http:'&&loopback(baseURL.hostname))||baseURL.protocol==='https:','Application base must be loopback HTTP or public HTTPS');
assert(loopback(cdpURL.hostname)&&['http:','https:'].includes(cdpURL.protocol),'CDP must be the owned local QA Chrome endpoint');
assert(!baseURL.username&&!baseURL.password&&!cdpURL.username&&!cdpURL.password,'Credentials are not accepted in QA URLs');
const output=path.resolve(process.env.V77_BASELINE_QA_OUTPUT??'work-local/v77/qa-baseline'),version=process.env.YAUTJA_QA_EXPECTED_VERSION??'V77';
await fs.mkdir(output,{recursive:true});
const browser=await chromium.connectOverCDP(cdp),ownedContexts=[],checks=[],captures=[],errors=[],consoleErrors=[],failures=[],nonReadRequests=[];
let active=null,exitCode=0;
const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
const report={date:'2026-10-03',version,url,cdp,checks,captures,errors,consoleErrors,failures,nonReadRequests,
  limits:['Real GameClient baseline, not a complete campaign walkthrough.','Pit/hunt deck entry uses declared synthetic defaultSave fixtures in separate contexts, not the incomplete fresh prologue.','Hunt readiness checks actual departure, empty rites ledger, pause, native suspend/resume and checkpoint ownership; no hunt victory, defeated body or rite completion is claimed.','No user browser/profile/account/private save is used.','Mobile is Chromium viewport/touch emulation, not a physical handset.','No source, health, actor, phase, engine clock or checkpoint is patched.','No deployment/production release gate is claimed.']};
const record=(name,details={})=>{checks.push({name,...details});console.log(JSON.stringify({check:name,passed:true}));};
async function ownPage(mobile=false){
 const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:900},hasTouch:mobile,isMobile:mobile});
 ownedContexts.push(context);const page=active=await context.newPage();page.setDefaultTimeout(60000);
 page.on('pageerror',error=>errors.push(String(error)));page.on('console',message=>{if(message.type()==='error')consoleErrors.push(message.text());});
 page.on('response',response=>{if(response.status()>=400)failures.push({url:response.url(),status:response.status()});});
 page.on('request',request=>{if(!['GET','HEAD','OPTIONS'].includes(request.method())&&new URL(request.url()).origin===new URL(url).origin)nonReadRequests.push({method:request.method(),url:request.url()});});
 return {context,page};
}
async function shot(page,name){const file=path.join(output,name+'.png');await page.screenshot({path:file});captures.push({file,name,sha256:sha(await fs.readFile(file)),visualReview:'pending-view-image'});}
async function contentVersion(page){assert.equal(await page.locator('[data-game-content-version]').first().getAttribute('data-game-content-version'),version);}
const nursery=page=>page.locator('[data-nursery-prologue] canvas');
const nurseryPhase=(page,phase)=>page.locator(`canvas[data-nursery-phase="${phase}"]`);
const nurseryState=page=>nursery(page).evaluate(node=>({phase:node.dataset.nurseryPhase,tick:Number(node.dataset.nurseryTick),story:node.dataset.nurseryStory,
 positions:node.dataset.nurseryPositions.split(',').map(Number),poses:node.dataset.nurseryPoses.split(','),paused:node.dataset.nurseryPaused,assets:node.dataset.nurseryAssets}));
const storage=page=>page.evaluate(()=>Object.fromEntries(Object.keys(localStorage).filter(key=>key.toLowerCase().includes('yautja')).map(key=>[key,localStorage.getItem(key)])));
async function story(page,id){const pane=page.locator(`[data-nursery-story-card="${id}"]`);await pane.waitFor();
 const immediate=pane.getByRole('button',{name:'Lire immédiatement',exact:true});if(await immediate.count()&&await immediate.isVisible())await immediate.click();
 await page.waitForFunction(id=>!document.querySelector(`[data-nursery-story-card="${id}"] [data-nursery-story-continue]`)?.disabled,id);
 assert.equal((await nurseryState(page)).story,id);return pane.locator('[data-nursery-story-continue]');}
function pitState(){const root=document.querySelector('[data-pit-immersive]'),canvas=root?.querySelector('canvas[data-pit-fighter-positions]');
 return {phase:root?.dataset.pitPresentationPhase,blocked:root?.dataset.pitPresentationBlocked,slot:Number(root?.dataset.pitPresentationFighterSlot),
  countdown:Number(root?.dataset.pitPresentationCountdown),frame:Number(root?.querySelector('[data-pit-frame]')?.dataset.pitFrame),
  paused:root?.dataset.pitPaused,positions:JSON.parse(canvas?.dataset.pitFighterPositions??'[]'),art:canvas?.dataset.pitArenaArtStatus,
  missing:Number(canvas?.dataset.pitArenaMissingAssets),scene:canvas?.dataset.pitSceneArenaId};}
async function pitPhases(page){await page.addInitScript(()=>{
 window.__v77PitPhases=[];let previous='';const observe=()=>{const root=document.querySelector('[data-pit-immersive]');if(!root)return;
  const value={phase:root.dataset.pitPresentationPhase,countdown:Number(root.dataset.pitPresentationCountdown),slot:Number(root.dataset.pitPresentationFighterSlot),
   blocked:root.dataset.pitPresentationBlocked,frame:Number(root.querySelector('[data-pit-frame]')?.dataset.pitFrame)};
  const signature=JSON.stringify(value);if(signature!==previous){window.__v77PitPhases.push(value);previous=signature;}};
 new MutationObserver(observe).observe(document,{subtree:true,childList:true,attributes:true,attributeFilter:['data-pit-presentation-phase','data-pit-presentation-countdown','data-pit-presentation-blocked']});
 });}
const activeHunt=page=>page.evaluate(()=>JSON.parse(localStorage.getItem('yautja-long-hunt.active-hunt')??'null'));
const huntAssetsReady=page=>page.waitForFunction(()=>![...document.querySelectorAll('.hunt-screen [role="status"]')].some(node=>node.textContent?.trim()==='Synchronisation du biomask…'),undefined,{timeout:120000});
async function huntReadiness(){
 const current=await ownPage(),page=current.page,fixture=structuredClone(await campaignFixture());fixture.save.settings.screenShake=false;
 await current.context.addInitScript(({key,save})=>localStorage.setItem(key,JSON.stringify(save)),fixture);
 await enterCampaignDeck(page,{url});await contentVersion(page);
 await page.getByRole('button',{name:'Accès rapide aux installations',exact:true}).click();
 await page.getByText('Accès direct aux interfaces · sans déplacement du chasseur',{exact:true}).click();
 await page.getByRole('button',{name:/^DÉPART Ouvrir l’interface$/}).click();
 for(let depth=0;depth<3;depth++){
  await page.getByRole('button',{name:'Tracer la route',exact:true}).first().click();
  await page.getByRole('button',{name:'Entrer dans la destination',exact:true}).click();
 }
 if(!await page.getByRole('button',{name:'Préparer la chasse',exact:true}).isVisible())
  await page.getByRole('navigation',{name:'Signaux orbitaux',exact:true}).getByRole('button').first().click();
 await page.getByRole('button',{name:'Préparer la chasse',exact:true}).click();
 await page.getByRole('button',{name:'Départ rapide',exact:true}).click();
 const canvas=page.locator('canvas.hunt-canvas');await canvas.waitFor({timeout:120000});
 await huntAssetsReady(page);
 await page.waitForFunction(()=>JSON.parse(localStorage.getItem('yautja-long-hunt.active-hunt')??'null')?.snapshot?.checkpoint?.huntRites?.version===1);
 const initial=await activeHunt(page);assert.equal(initial.ownerSaveCreatedAt,fixture.save.createdAt);
 assert.equal(initial.snapshot.checkpoint.huntRites.runId,`${initial.missionId}:${initial.encounterRun}`);
 assert.deepEqual(initial.snapshot.checkpoint.huntRites.corpses,[]);assert.equal(initial.snapshot.checkpoint.kills,0);
 assert.equal(await page.locator('[data-hunt-rites-v77]').count(),0,'Native mission starts with no invented corpse or ritual menu');
 await canvas.focus();await page.keyboard.press('e');assert.equal(await page.locator('[data-hunt-rites-v77]').count(),0);
 await shot(page,'13-hunt-native-departure');
 await page.getByRole('button',{name:'Mettre en pause et consulter la carte',exact:true}).click();
 const pause=page.getByRole('dialog',{name:'Chasse en pause',exact:true});await pause.waitFor();
 const frozen=await activeHunt(page);await page.waitForTimeout(650);assert.deepEqual((await activeHunt(page)).snapshot,frozen.snapshot);
 await shot(page,'14-hunt-native-pause');await pause.getByRole('button',{name:'Reprendre',exact:true}).click();
 await page.waitForTimeout(650);
 await page.getByRole('button',{name:'Mettre en pause et consulter la carte',exact:true}).click();await pause.waitFor();
 assert((await activeHunt(page)).snapshot.checkpoint.elapsed>frozen.snapshot.checkpoint.elapsed,'Native simulation advances after resume');
 await pause.getByRole('button',{name:'Suspendre et sauvegarder',exact:true}).click();
 const resume=page.getByRole('button',{name:/^Reprendre la chasse :/});await resume.waitFor();
 const suspended=await activeHunt(page),stored=await storage(page);await fs.writeFile(path.join(output,'hunt-native-suspended-storage.json'),JSON.stringify(stored,null,2));
 assert.equal(suspended.runId,initial.runId);assert.equal(suspended.ownerSaveCreatedAt,initial.ownerSaveCreatedAt);
 assert.deepEqual(suspended.snapshot.checkpoint.huntRites.corpses,[]);assert.equal(suspended.snapshot.checkpoint.kills,0);
 await shot(page,'15-hunt-native-suspended');await resume.click();await canvas.waitFor({timeout:120000});
 await huntAssetsReady(page);
 const claimed=await activeHunt(page);assert.notEqual(claimed.runId,suspended.runId,'Native resume claims a new persistence run');
 assert.equal(claimed.ownerSaveCreatedAt,suspended.ownerSaveCreatedAt);assert.equal(claimed.missionId,suspended.missionId);assert.equal(claimed.encounterRun,suspended.encounterRun);
 assert(claimed.sequence>=suspended.sequence,'Claim preserves or advances the existing checkpoint sequence');assert.deepEqual(claimed.snapshot.checkpoint.huntRites,suspended.snapshot.checkpoint.huntRites);
 assert.equal(await page.locator('[data-hunt-rites-v77]').count(),0);await shot(page,'16-hunt-native-resume');
 record('hunt-native-departure-pause-suspend-resume-owned-empty-rites-checkpoint',{fixture:'Declared isolated legacy defaultSave; no mission completion or defeated-body scenario',
  missionId:initial.missionId,encounterRun:initial.encounterRun,ownerSaveCreatedAt:initial.ownerSaveCreatedAt,initialRun:initial.runId,resumedRun:claimed.runId,
  corpseCount:claimed.snapshot.checkpoint.huntRites.corpses.length,kills:claimed.snapshot.checkpoint.kills,pausedSnapshotStable:true,nativeResumeClaimed:true});
 await current.context.close();
}

try{
 const fresh=await ownPage();await fresh.page.goto(url,{waitUntil:'networkidle',timeout:120000});
 assert.equal(Object.keys(await storage(fresh.page)).length,0,'Fresh isolated browser has no player save');
 await fresh.page.getByRole('button',{name:/^Nouvelle partie/}).click();await fresh.page.getByLabel('Nom du chasseur').fill('QA V77 Baseline');
 await shot(fresh.page,'01-new-game-desktop');await fresh.page.getByRole('button',{name:/^Créer la partie 1/}).click();
 await nurseryPhase(fresh.page,'prompt').waitFor({timeout:120000});await contentVersion(fresh.page);
 for(const id of ['born-in-clan','nursery-place','mentor-briefing','rival-oath','duel-consent']){
  const next=await story(fresh.page,id);if(id==='born-in-clan'||id==='duel-consent')await shot(fresh.page,'02-story-'+id);await next.click();}
 await nurseryPhase(fresh.page,'ready').waitFor();await fresh.page.waitForFunction(()=>document.querySelector('[data-nursery-prologue] canvas')?.dataset.nurseryAssets==='true');
 await nursery(fresh.page).focus();await shot(fresh.page,'03-prologue-ready');
 await fresh.page.getByRole('button',{name:'Pause et commandes',exact:true}).click();await fresh.page.getByRole('dialog',{name:'Prologue en pause',exact:true}).waitFor();
 await fresh.page.waitForFunction(()=>document.querySelector('[data-nursery-prologue] canvas')?.dataset.nurseryPaused==='true');
 const frozen=await nurseryState(fresh.page);await fresh.page.waitForTimeout(350);assert.deepEqual(await nurseryState(fresh.page),frozen);await shot(fresh.page,'04-prologue-pause');
 const beforeReload=await storage(fresh.page);await fs.writeFile(path.join(output,'fresh-ready-storage.json'),JSON.stringify(beforeReload,null,2));
 await fresh.page.reload({waitUntil:'networkidle'});await fresh.page.getByRole('button',{name:/^Continuer/}).click();await nurseryPhase(fresh.page,'ready').waitFor({timeout:120000});
 await fresh.page.waitForFunction(()=>document.querySelector('[data-nursery-prologue] canvas')?.dataset.nurseryAssets==='true');
 await contentVersion(fresh.page);const resumed=await nurseryState(fresh.page);assert.equal(resumed.story,frozen.story);assert.deepEqual(resumed.positions,frozen.positions);
 await shot(fresh.page,'05-real-cold-resume');record('fresh-campaign-five-lore-cards-pause-and-cold-resume',{phase:resumed.phase,positions:resumed.positions});
 if(await fresh.page.getByRole('dialog',{name:'Prologue en pause',exact:true}).isVisible())await fresh.page.getByRole('button',{name:'Reprendre le prologue',exact:true}).click();
 await nursery(fresh.page).focus();await fresh.page.keyboard.down('Enter');await nurseryPhase(fresh.page,'duel').waitFor();
 const held=await nurseryState(fresh.page);await fresh.page.waitForTimeout(200);assert.deepEqual((await nurseryState(fresh.page)).positions,held.positions);await fresh.page.keyboard.up('Enter');
 await nursery(fresh.page).focus();await fresh.page.waitForTimeout(150);
 let moving=null,lastTick=-1,stalledAt=Date.now(),punchedAt=-100;const deadline=Date.now()+180000;
 while(Date.now()<deadline){const state=await nurseryState(fresh.page);if(state.phase!=='duel')break;
  if(state.tick!==lastTick){lastTick=state.tick;stalledAt=Date.now();}else if(Date.now()-stalledAt>450){
   if(moving)await fresh.page.keyboard.up(moving);moving=null;await fresh.page.keyboard.up('j');await nursery(fresh.page).focus();await fresh.page.waitForTimeout(150);stalledAt=Date.now();continue;}
  const distance=state.positions[1]-state.positions[0],direction=Math.abs(distance)>44?distance>0?'ArrowRight':'ArrowLeft':null;
  if(moving!==direction){if(moving)await fresh.page.keyboard.up(moving);if(direction)await fresh.page.keyboard.down(direction);moving=direction;}
  if(Math.abs(distance)<=72&&['idle','walk'].includes(state.poses[0])&&state.tick-punchedAt>=27){await fresh.page.keyboard.press('j',{delay:50});punchedAt=state.tick;}
  await fresh.page.waitForTimeout(20);}
 if(moving)await fresh.page.keyboard.up(moving);assert.equal((await nurseryState(fresh.page)).phase,'ko','Win the actual unmodified duel with keyboard');
 await nurseryPhase(fresh.page,'village-reveal').waitFor();await fresh.page.waitForTimeout(500);await shot(fresh.page,'06-real-prologue-victory');
 await story(fresh.page,'master-stop');await shot(fresh.page,'07-real-prologue-debrief');
 const genuine=await storage(fresh.page);await fs.writeFile(path.join(output,'genuine-keyboard-won-storage.json'),JSON.stringify(genuine,null,2));
 record('real-keyboard-duel-won-and-nonlethal-debrief',{state:await nurseryState(fresh.page)});await fresh.context.close();

 for(const mobile of [false,true]){const current=await ownPage(mobile),page=current.page;await pitPhases(page);
  const fixture=structuredClone(await campaignFixture());fixture.save.settings.screenShake=false;
  await current.context.addInitScript(({key,save})=>localStorage.setItem(key,JSON.stringify(save)),fixture);
  await enterCampaignDeck(page,{url});await contentVersion(page);await page.getByRole('button',{name:'THE PIT · combat',exact:true}).click();
  await closePitSelectionOptions(page);await page.getByRole('radio',{name:/^Versus local/}).click();await closePitSelectionOptions(page);
  const label=mobile?'mobile':'desktop',before=await storage(page);await shot(page,`08-pit-${label}-roster`);
  for(const [slot,id] of ['city-hunter','scar'].entries()){
   await choosePitFighter(page,id);const variant=slot===0?'city-hunter-avec-casque-12136078fe':'scar-avec-casque-6a0a69930d';
   if(await page.locator('[data-pit-variant-select]').count())await page.locator('[data-pit-variant-select]').selectOption(variant);
   await page.locator('[data-pit-selection-confirm]').click();}
  await page.locator('[data-pit-selection-step="stage"]').waitFor();await choosePitStage(page,'canopy-causeway');
  await page.waitForFunction(()=>document.querySelector('[data-pit-stage-preview]')?.dataset.previewStatus==='ready',undefined,{timeout:120000});
  await page.locator('[data-pit-scene-assets]').waitFor({state:'detached',timeout:120000});await shot(page,`09-pit-${label}-stage`);
  await page.locator('[data-pit-selection-confirm]').click();await page.waitForFunction(()=>document.querySelector('[data-pit-immersive]')?.dataset.pitPresentationPhase==='intro-left');
  await shot(page,`10-pit-${label}-intro`);await page.waitForFunction(()=>document.querySelector('[data-pit-immersive]')?.dataset.pitPresentationPhase==='fight',undefined,{timeout:120000});
  const phases=await page.evaluate(()=>window.__v77PitPhases);for(const [slot,phase] of ['intro-left','intro-right'].entries())assert(phases.some(entry=>entry.phase===phase&&entry.slot===slot));
  for(const count of [3,2,1])assert(phases.some(entry=>entry.phase==='countdown'&&entry.countdown===count));
  assert(phases.filter(entry=>['intro-left','intro-right','countdown'].includes(entry.phase)).every(entry=>entry.blocked==='true'&&entry.frame===0),'Combat simulation stays blocked during intro/countdown');
  const fight=await page.evaluate(pitState);assert.equal(fight.blocked,'false');assert.equal(fight.art,'bitmap');assert.equal(fight.missing,0);assert.equal(fight.scene,'canopy-causeway');await shot(page,`11-pit-${label}-combat`);
  await openPitPause(page);const paused=await page.evaluate(pitState);await page.waitForTimeout(350);assert.deepEqual(await page.evaluate(pitState),paused);
  await shot(page,`12-pit-${label}-pause`);await resumePitFight(page);await page.waitForFunction(frame=>Number(document.querySelector('[data-pit-frame]')?.dataset.pitFrame)>frame,paused.frame);
  assert.equal(await page.locator('html').evaluate(node=>node.scrollWidth<=innerWidth+1),true,'No horizontal viewport overflow');
  assert.deepEqual(await storage(page),before,'Pit baseline preserves all campaign/sidecar bytes');
  record(`pit-${label}-real-roster-stage-two-intros-countdown-combat-pause-resume`,{phases,fight,paused,storageUnchanged:true,viewport:mobile?[390,844]:[1440,900]});await current.context.close();}
 await huntReadiness();
 assert.deepEqual(errors,[]);assert.deepEqual(consoleErrors,[]);assert.deepEqual(failures,[]);assert.deepEqual(nonReadRequests,[]);
 report.status='PASS_REAL_GAMECLIENT_BASELINE';
}catch(error){exitCode=1;report.status='FAIL';report.error=String(error.stack??error);if(active&&!active.isClosed()){await shot(active,'failure').catch(()=>{});report.lastNursery=await nurseryState(active).catch(()=>null);report.lastPit=await active.evaluate(pitState).catch(()=>null);}}
finally{for(const context of ownedContexts)await context.close().catch(()=>{});await fs.writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({status:report.status,checks:checks.length,captures:captures.length,error:report.error}));}
// Disconnect Node only. Owned Chrome stays available for the parent's QA.
process.exit(exitCode);
