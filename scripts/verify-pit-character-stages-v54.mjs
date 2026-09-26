import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium} from 'playwright-core';
import {enterCampaignDeck} from './campaign-browser-helpers.mjs';
import {selectPitMatch,openPitPause,resumePitFight} from './pit-selection-browser-helpers.mjs';

const url=process.env.V54_STAGES_QA_URL||'http://127.0.0.1:4174';
const output=process.env.V54_STAGES_QA_OUTPUT||'outputs/qa-commercial-audit/v54/character-stages';
await fs.mkdir(output,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const cases=[
 {id:'arena-137-concrete-jungle-neonopolis',player:'scarface',actors:0,recommendation:true},
 {id:'arena-138-avp-ryushi-prosperity-wells',player:'machiko-noguchi',actors:1,recommendation:true,missing:true},
 {id:'arena-016-terrasse-des-jeunes-sangs',player:'jungle-hunter',actors:2},
 {id:'arena-035-fosse-des-cent-masques',player:'jungle-hunter',actors:2,parentRetry:true},
];
const checks=[],errors=[],responses=[];let page;
const saveBytes=()=>page.evaluate(()=>JSON.stringify(Object.fromEntries(Object.entries(localStorage).sort(([a],[b])=>a.localeCompare(b)))));
const canvas=()=>page.locator('canvas[data-pit-scene-arena-id]');
const snapshot=()=>page.evaluate(()=>{const c=document.querySelector('canvas[data-pit-scene-arena-id]');return {frame:Number(document.querySelector('[data-pit-frame]')?.dataset.pitFrame),actors:Number(c?.dataset.pitArenaLifeActors),cells:JSON.parse(c?.dataset.pitArenaLifeFrames||'[]')};});
try{
 for(const entry of cases){
  const context=await browser.newContext({viewport:{width:1280,height:720}});page=await context.newPage();page.setDefaultTimeout(45000);
  page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)responses.push({status:r.status(),url:r.url()});});
  await enterCampaignDeck(page,{url});assert.equal(await page.locator('[data-game-content-version]').first().getAttribute('data-game-content-version'),'V54');
  await page.getByRole('button',{name:'THE PIT · combat',exact:true}).click();await page.getByRole('radio',{name:/^Versus local/}).click();
  if(entry.parentRetry)await page.route('**/game/sprites/v54/pit-life/yautja-spectators.png',r=>r.abort('failed'));
  await selectPitMatch(page,{player:entry.player,opponent:'city-hunter',arena:entry.recommendation||entry.parentRetry?'the-pit':entry.id,launch:false});
  const blocked='/game/sprites/v54/pit-life/colony-watchers.png';
  if(entry.missing)await page.route('**'+blocked,r=>r.abort('failed'));
  if(entry.recommendation){
   assert.equal(await page.locator('[data-pit-character-stage]').getAttribute('data-pit-character-stage'),'dedicated-lateral-adaptation');
   await page.locator(`[data-pit-recommended-stage="${entry.id}"]`).click();
   assert.match(await page.locator('[data-pit-screen-reference]').innerText(),/Réinterprétation latérale 2D/);
   assert.match(await page.locator('[data-pit-screen-reference] a').getAttribute('href'),/^https:\/\/(store\.necaonline|titanbooks)\.com\//);
   checks.push({name:entry.player+'-explicit-stage-recommendation',arena:entry.id,sourceLinked:true,exactGeometryClaim:false});
  }
  if(entry.missing){
   const retry=page.getByRole('button',{name:'Réessayer l’aperçu',exact:true});await retry.waitFor();
   assert(await page.locator('[data-pit-selection-confirm]').isDisabled());assert.equal(await page.locator('[data-pit-immersive]').count(),0);
   await page.screenshot({path:output+'/'+entry.id+'-missing-image.png'});await page.unroute('**'+blocked);await retry.click();
   await page.waitForFunction(()=>document.querySelector('[data-pit-stage-preview]')?.dataset.previewStatus==='ready');
   checks.push({name:'colony-native-sheet-missing-retry',blocked,launchBlocked:true,recovered:true});
   await page.getByRole('combobox',{name:'Collection de stages',exact:true}).selectOption('comic');
   const options=page.getByRole('listbox',{name:'Arènes disponibles',exact:true}).getByRole('option');
   assert.equal(await options.count(),1);assert.equal(await options.first().getAttribute('data-choice-id'),entry.id);
   checks.push({name:'comic-stage-filter',onlyStage:entry.id});
  }
  if(entry.parentRetry){
   const {choosePitStage}=await import('./pit-selection-browser-helpers.mjs');await choosePitStage(page,entry.id);
   await page.getByRole('button',{name:'Réessayer l’aperçu',exact:true}).waitFor();await page.locator('[data-pit-scene-assets="failed"]').waitFor();
   await page.unroute('**/game/sprites/v54/pit-life/yautja-spectators.png');
   // OS accessibility preference restarts the child preview effect, not the parent's scene request.
   // This creates the real independent-bank race without injecting game state or touching saves.
   await page.emulateMedia({reducedMotion:'reduce'});
   await page.waitForFunction(()=>document.querySelector('[data-pit-stage-preview]')?.dataset.previewStatus==='ready');
   assert(await page.locator('[data-pit-selection-confirm]').isDisabled());
   const retry=page.getByRole('button',{name:'Réessayer les plans du combat',exact:true});assert(await retry.isVisible());
   await page.screenshot({path:output+'/'+entry.id+'-parent-failed-preview-ready.png'});await retry.click();
   await page.locator('[data-pit-scene-assets]').waitFor({state:'detached'});assert(await page.locator('[data-pit-selection-confirm]').isEnabled());
   await page.emulateMedia({reducedMotion:'no-preference'});
   checks.push({name:'independent-parent-bank-retry',previewReadyWhileParentFailed:true,launchBlocked:true,parentRetryVisible:true,recovered:true});
  }
  await page.waitForFunction(id=>document.querySelector('[data-pit-stage-preview]')?.dataset.pitStagePreview===id&&document.querySelector('[data-pit-stage-preview]')?.dataset.previewStatus==='ready',entry.id);
  await page.screenshot({path:output+'/'+entry.id+'-selection.png'});assert(await page.locator('[data-pit-selection-confirm]').isEnabled());
  await page.locator('[data-pit-selection-confirm]').click();await page.locator('[data-pit-match-loading]').waitFor({state:'detached'});
  await page.waitForFunction(()=>{const root=document.querySelector('[data-pit-presentation-phase]');return root?.dataset.pitPresentationPhase==='fight'&&root.dataset.pitPresentationBlocked==='false'&&Number(root.querySelector('[data-pit-frame]')?.dataset.pitFrame)>3;});
  assert.equal(await canvas().getAttribute('data-pit-scene-arena-id'),entry.id);assert.equal(await canvas().getAttribute('data-pit-arena-art-status'),'bitmap');
  assert.equal(Number(await canvas().getAttribute('data-pit-arena-life-actors')),entry.actors);
  const saved=await saveBytes();await page.screenshot({path:output+'/'+entry.id+'-fight.png'});
  checks.push({name:entry.id+'-live-duel',actors:entry.actors,bitmap:true,introGatePassed:true});
  if(entry.actors){
   const cells=new Set();for(let sample=0;sample<32&&cells.size<6;sample++){const s=await snapshot();assert.equal(s.actors,entry.actors);assert.equal(s.cells.length,entry.actors);cells.add(s.cells[0]);await page.waitForTimeout(120);}
   assert.deepEqual([...cells].sort(),[0,1,2,3,4,5]);
   await openPitPause(page);const frozen=await snapshot();await page.waitForTimeout(650);assert.deepEqual(await snapshot(),frozen,'Pause must freeze the same native cells and simulation clock');
   await page.screenshot({path:output+'/'+entry.id+'-paused.png'});await resumePitFight(page);
   await page.waitForFunction(old=>Number(document.querySelector('[data-pit-frame]')?.dataset.pitFrame)>old,frozen.frame);
   assert.equal(await saveBytes(),saved,'Background actors must not mutate campaign, awards or statistics');
   checks.push({name:entry.id+'-six-native-poses-and-pause',cells:[...cells].sort(),pausedFrame:frozen.frame,saveUnchanged:true});
  }
  if(entry.recommendation){
   await page.setViewportSize({width:844,height:390});await page.waitForTimeout(200);
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   await page.screenshot({path:output+'/'+entry.id+'-landscape-mobile.png'});
  }
  await context.close();page=null;
 }
 assert.deepEqual(errors,[]);assert.deepEqual(responses,[]);
 await fs.writeFile(output+'/report.json',JSON.stringify({passed:true,checkedAt:new Date().toISOString(),url,version:'V54',browser:'installed Chrome, isolated contexts',checks,errors,responses,scope:'Four real UI-selected duels; two dedicated lateral adaptations, three background casts, no combat state injection. Intentional missing PNG request aborted once; six native poses and pause verified.'},null,2)+'\n');
 console.log(JSON.stringify({passed:true,checks:checks.length,output}));
}catch(error){if(page)await page.screenshot({path:output+'/failure.png',fullPage:true}).catch(()=>{});await fs.writeFile(output+'/failure.json',JSON.stringify({error:String(error),checks,errors,responses,body:await page?.locator('body').innerText().catch(()=>null)},null,2));console.error(String(error).slice(0,1000));process.exitCode=1;}
finally{await browser.close();}
