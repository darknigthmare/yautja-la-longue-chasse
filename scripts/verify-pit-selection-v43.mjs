import { returnPitSelection } from "./pit-selection-browser-helpers.mjs";
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { build } from 'esbuild';
import { chromium } from 'playwright-core';
import { selectPitMatch, choosePitStage } from './pit-selection-browser-helpers.mjs';
import { enterCampaignDeck } from './campaign-browser-helpers.mjs';

const base=process.env.V43_QA_URL||'http://127.0.0.1:4174';
const output=process.env.V43_SELECTION_QA_OUTPUT||'work/v43/selection-qa';
await fs.mkdir(output,{recursive:true});
const built=await build({stdin:{contents:"export {PIT_SCREEN_ARENA_WORKS,getPitScreenArenaMetadata} from './app/game/systems/pitScreenArenas.ts'; export {PIT_ARCADE_LADDERS} from './app/game/systems/pitArcade.ts'; export {PIT_ARENA_IDS} from './app/game/systems/pitCombat.ts'; export {PIT_VERSUS_FIGHTER_IDS} from './app/game/systems/pitRosterExpansion.ts';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',write:false,logLevel:'silent'});
const {PIT_SCREEN_ARENA_WORKS,getPitScreenArenaMetadata,PIT_ARCADE_LADDERS,PIT_ARENA_IDS,PIT_VERSUS_FIGHTER_IDS}=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));
const errors=[],failures=[],checks=[];
const browser=await chromium.launch({channel:'chrome',headless:true});let page;
function watch(p){p.setDefaultTimeout(30000);p.on('pageerror',error=>errors.push(error.message));p.on('response',response=>{if(response.status()>=400)failures.push({url:response.url(),status:response.status()});});}
async function enter(p){await enterCampaignDeck(p,{url:base});await p.getByRole('button',{name:'THE PIT · combat',exact:true}).click();await p.locator('[data-pit-selection-step="fighters"]').waitFor();}
async function confirm(p){await p.locator('[data-pit-selection-confirm]').click();}
async function portraitsReady(p){await p.waitForFunction(()=>Array.from(document.querySelectorAll('[data-selection-side] canvas[data-pit-extension-portrait]')).every(canvas=>canvas.dataset.pitExtensionPortrait==='authored-idle-pose'));await p.locator('[data-selection-side] img').evaluateAll(images=>Promise.all(images.map(image=>image.decode())));}
async function previewReady(p,id){await p.locator(`[data-pit-stage-preview${id?'="'+id+'"':''}][data-preview-status="ready"]`).waitFor();}
const storage=p=>p.evaluate(()=>JSON.stringify(Object.fromEntries(Object.entries(localStorage).sort(([a],[b])=>a.localeCompare(b)))));
try{
  page=await browser.newPage({viewport:{width:1280,height:900}});watch(page);await enter(page);
  const before=await storage(page);
  await page.getByRole('radio',{name:/Versus local/}).click();
  let flow=page.locator('[data-pit-selection-step]');
  assert.equal(Number(await flow.locator('[data-pit-roster-total]').getAttribute('data-pit-roster-total')),PIT_VERSUS_FIGHTER_IDS.length);
  assert((await flow.locator('[role="option"]').count())<=24);
  await flow.locator('[data-choice-id="tracker"]').click();
  await page.keyboard.press('ArrowRight');
  assert.notEqual(await flow.locator('[role="option"][aria-selected="true"]').getAttribute('data-choice-id'),'tracker');
  await flow.locator('[data-choice-id="tracker"]').click();await page.keyboard.press('Enter');
  await page.locator('[data-pit-selection-slot="opponent"]').waitFor();
  assert(await flow.locator('[data-choice-id="tracker"]').isDisabled());
  await flow.locator('[data-choice-id="city-hunter"]').click();
  const right=flow.locator('[data-selection-side="opponent"] img[data-facing="left"]');
  assert.equal(await right.getAttribute('data-native-facing'),'left','City Hunter opponent uses his authored left portrait');
  await portraitsReady(page);await flow.evaluate(element=>element.scrollIntoView({block:'start'}));await page.screenshot({path:output+'/roster-desktop.png'});await page.keyboard.press('Enter');
  await page.locator('[data-pit-selection-step="stage"]').waitFor();await previewReady(page);
  assert.equal(Number(await flow.locator('[data-pit-stage-total]').getAttribute('data-pit-stage-total')),PIT_ARENA_IDS.length,'gallery uses the real runtime roster');
  assert((await flow.getByRole('listbox',{name:'Arènes disponibles',exact:true}).getByRole('option').count())<=24,'mounted gallery is bounded');
  const canvas=page.locator('[data-pit-stage-preview]');assert.equal(await canvas.getAttribute('data-preview-planes'),'P0,P1,P2,P3,P4,P5');
  const initialCamera=await canvas.getAttribute('data-preview-camera-x');await page.waitForTimeout(250);
  assert.notEqual(await canvas.getAttribute('data-preview-camera-x'),initialCamera,'actual parallax camera moves');
  const family=flow.getByRole('combobox',{name:'Collection de stages',exact:true});
  const work=flow.getByRole('combobox',{name:'Œuvre du stage',exact:true});
  const expectedCounts={original:100,film:27,game:9};
  for(const [kind,count] of Object.entries(expectedCounts)){
    await family.selectOption(kind);await previewReady(page);
    assert.equal(Number(await flow.locator('[data-pit-stage-filtered]').getAttribute('data-pit-stage-filtered')),count);
    assert((await flow.getByRole('listbox',{name:'Arènes disponibles',exact:true}).getByRole('option').count())<=24);
    if(kind!=='original')for(const item of PIT_SCREEN_ARENA_WORKS.filter(item=>item.kind===kind)){
      await work.selectOption(item.id);await previewReady(page);
      const options=flow.locator('[role="option"]');assert.equal(await options.count(),3,item.title+' has three stages');
      for(const id of await options.evaluateAll(nodes=>nodes.map(n=>n.dataset.choiceId)))assert.equal(getPitScreenArenaMetadata(id)?.workId,item.id);
      await options.first().focus();await page.keyboard.press('ArrowRight');await previewReady(page);
      assert.equal(getPitScreenArenaMetadata(await flow.getByRole('listbox',{name:'Arènes disponibles',exact:true}).getByRole('option',{selected:true}).getAttribute('data-choice-id'))?.workId,item.id);
    }
    checks.push({name:'stage-family-filter',kind,count});
  }
  await family.selectOption('all');await previewReady(page);
  assert.equal(Number(await flow.locator('[data-pit-stage-filtered]').getAttribute('data-pit-stage-filtered')),136);
  await family.selectOption('film');await work.selectOption('all');await previewReady(page);
  await flow.locator('[data-pit-stage-page-next]').click();await previewReady(page);
  assert.equal(await flow.locator('[role="option"]').count(),3,'27 film scenes paginate as24+3');
  await flow.screenshot({path:output+'/stage-film-filter.png'});
  await family.selectOption('all');await previewReady(page);
  const chosenArena=PIT_ARENA_IDS.at(-1);
  await choosePitStage(page,chosenArena);await previewReady(page,chosenArena);
  await flow.screenshot({path:output+'/stage-desktop.png'});
  await page.getByRole('button',{name:/Retour aux combattants/}).click();
  assert.equal(await flow.locator('[data-selection-side="player"] [data-fighter-id]').getAttribute('data-fighter-id'),'tracker');
  assert.equal(await flow.locator('[data-selection-side="opponent"] [data-fighter-id]').getAttribute('data-fighter-id'),'city-hunter');
  await confirm(page);await previewReady(page,chosenArena);
  assert.equal(await storage(page),before,'selection must not mutate save bytes');
  checks.push({name:'roster-stage-keyboard',fighters:PIT_VERSUS_FIGHTER_IDS.length,stages:PIT_ARENA_IDS.length,separateConfirmations:true,duplicateDisabled:true,authoredOpponentLeft:true,returnPreservesChoices:true,saveBytesUnchanged:true,parallaxPlanes:6});
  await confirm(page);await page.locator(`canvas[data-pit-arena-id="${chosenArena}"][data-pit-arena-art-status="bitmap"]`).waitFor();
  await page.locator('[data-pit-match-loading]').waitFor({state:'detached'});
  await page.locator('canvas[data-pit-arena-id]').screenshot({path:output+'/selected-stage-combat.png'});
  assert.equal(await page.locator('[data-pit-bitmap-slot="0"]').getAttribute('data-pit-bitmap-id'),'tracker');
  checks.push({name:'selected-stage-launched',arena:chosenArena});
  await returnPitSelection(page);
  // Existing progression modes remain selectable and keep their imposed encounter.
  await page.locator('[data-choice-id="jungle-hunter"]').click();
  for(const mode of ['Arcade individuel','Circuit du clan','Descente']){
    await page.getByRole('radio',{name:new RegExp('^'+mode)}).click();await confirm(page);await confirm(page);await previewReady(page);
    assert.equal(await page.locator('[data-pit-selection-step="stage"] [role="option"]:not(:disabled)').count(),1,mode+' stage imposed');
    assert(await page.getByRole('combobox',{name:'Collection de stages',exact:true}).isDisabled());
    assert(await page.getByRole('combobox',{name:'Œuvre du stage',exact:true}).isDisabled());
    if(mode==='Descente'){
      await page.locator('[data-pit-selection-step="stage"] [role="option"]:not(:disabled)').focus();await page.keyboard.press('ArrowRight');
      await page.locator('[data-pit-selection-slot="opponent"][data-pit-selection-step="fighters"]').waitFor();
      await confirm(page);await previewReady(page);
      checks.push({name:'descent-branch-reconfirmation',playerPreserved:true,rivalReconfirmed:true});
    }
    checks.push({name:'progression-stage-imposed',mode});
  }
  // Loading the imposed Arcade opponent cannot start the simulation underneath a missing image bank.
  await page.getByRole('radio',{name:/Versus local/}).click();
  const actualArcadeOpponent=PIT_ARCADE_LADDERS['city-hunter'].encounters[0].opponentId;
  const spare=PIT_VERSUS_FIGHTER_IDS.find(id=>id!=='city-hunter'&&id!==actualArcadeOpponent);
  await selectPitMatch(page,{player:'city-hunter',opponent:spare,launch:false});
  await page.getByRole('radio',{name:/^Arcade individuel/}).click();
  await confirm(page);await confirm(page);await previewReady(page);
  await page.route('**/game/**',async route=>{await new Promise(resolve=>setTimeout(resolve,2200));await route.continue();});
  await confirm(page);await page.locator('[data-pit-match-loading="true"]').waitFor();
  const loadingFrame=await page.locator('[data-pit-frame]').getAttribute('data-pit-frame');
  await page.waitForTimeout(1100);assert.equal(await page.locator('[data-pit-frame]').getAttribute('data-pit-frame'),loadingFrame,'simulation is paused while assets load');
  await page.screenshot({path:output+'/loading.png'});
  await page.locator('[data-pit-match-loading]').waitFor({state:'detached'});await page.unroute('**/game/**');
  checks.push({name:'explicit-match-loading',simulationGate:true});
  await page.close();page=null;

  const mobileContext=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,reducedMotion:'reduce'});
  page=await mobileContext.newPage();watch(page);await enter(page);flow=page.locator('[data-pit-selection-step]');
  await flow.locator('[data-choice-id="city-hunter"]').tap();await page.locator('[data-pit-selection-confirm]').tap();
  await flow.locator('[data-choice-id="jungle-hunter"]').tap();
  await portraitsReady(page);await flow.evaluate(element=>element.scrollIntoView({block:'start'}));await page.screenshot({path:output+'/roster-mobile.png'});await page.locator('[data-pit-selection-confirm]').scrollIntoViewIfNeeded();await page.screenshot({path:output+'/roster-mobile-actions.png'});await page.locator('[data-pit-selection-confirm]').tap();await previewReady(page);
  const motion=await page.locator('[data-pit-stage-preview]').getAttribute('data-preview-frame');await page.waitForTimeout(220);
  assert.equal(await page.locator('[data-pit-stage-preview]').getAttribute('data-preview-frame'),motion,'reduced motion preview remains fixed');
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  assert(await flow.evaluate(element=>element.scrollWidth<=element.clientWidth+1));
  await flow.screenshot({path:output+'/stage-mobile.png'});
  checks.push({name:'mobile-touch-and-reduced-motion',width:390,noOverflow:true,physicalDeviceCertified:false});
  await mobileContext.close();page=null;

  page=await browser.newPage({viewport:{width:1280,height:900}});watch(page);
  await page.addInitScript(()=>{window.__selectionPad={id:'V43 virtual standard pad',index:0,connected:true,mapping:'standard',axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,touched:false,value:0}))};Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>[window.__selectionPad,null,null,null]});});
  await enter(page);
  const tapPad=async index=>{await page.waitForTimeout(100);await page.evaluate(index=>window.__selectionPad.buttons[index]={pressed:true,touched:true,value:1},index);await page.waitForTimeout(140);await page.evaluate(index=>window.__selectionPad.buttons[index]={pressed:false,touched:false,value:0},index);await page.waitForTimeout(100);};
  const first=await page.locator('[role="option"][aria-selected="true"]').getAttribute('data-choice-id');await tapPad(15);
  assert.notEqual(await page.locator('[role="option"][aria-selected="true"]').getAttribute('data-choice-id'),first);
  await tapPad(0);await page.locator('[data-pit-selection-slot="opponent"]').waitFor();await tapPad(0);await page.locator('[data-pit-selection-step="stage"]').waitFor();
  await tapPad(1);await page.locator('[data-pit-selection-step="fighters"]').waitFor();
  await tapPad(5);assert.equal(await page.getByRole('radio',{name:/Versus local/}).getAttribute('aria-checked'),'true');
  checks.push({name:'gamepad-selection',directions:true,separateAConfirmations:true,bReturns:true,shoulderModeSwitch:true,physicalControllerCertified:false});
  await confirm(page);await confirm(page);await previewReady(page);
  const failedStage=PIT_ARENA_IDS.at(-1);await choosePitStage(page,failedStage);await previewReady(page,failedStage);const tile=page.locator(`[data-choice-id="${failedStage}"]`);
  const blockedImage=await tile.locator('img').getAttribute('src');
  await choosePitStage(page,PIT_ARENA_IDS[0]);await previewReady(page);
  await page.route('**'+blockedImage,route=>route.abort('failed'));await choosePitStage(page,failedStage);
  await page.locator(`[data-pit-stage-preview="${failedStage}"][data-preview-status="failed"]`).waitFor();
  assert(await page.locator('[data-pit-selection-confirm]').isDisabled());
  await page.screenshot({path:output+'/preview-failure.png'});
  await page.unroute('**'+blockedImage);await page.getByRole('button',{name:'Réessayer l’aperçu',exact:true}).click();await previewReady(page,failedStage);
  assert(await page.locator('[data-pit-selection-confirm]').isEnabled());
  checks.push({name:'preview-failure-retry',failedStage,blockedLaunch:true,retryRecovered:true});
  // A failed durable route selection locks identity edits but keeps the exact transition retryable.
  await page.getByRole('radio',{name:/^Duel CPU/}).click();
  await page.locator('[data-pit-selection-step] [data-choice-id="jungle-hunter"]').click();
  await page.getByRole('radio',{name:/^Circuit du clan/}).click();
  await confirm(page);await confirm(page);await previewReady(page);
  const routeBefore=await storage(page);
  await page.evaluate(()=>{window.__v42SetItem=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key.startsWith('yautja-long-hunt.the-pit'))throw new DOMException('V43 simulated quota failure','QuotaExceededError');return window.__v42SetItem.call(this,key,value);};});
  await confirm(page);
  const retry=page.getByRole('button',{name:/^RÉESSAYER L’ENREGISTREMENT/});await retry.waitFor();
  assert(await retry.isEnabled(),'failed save must keep a usable retry CTA');
  assert.equal(await page.locator('[data-pit-selection-step] [role="option"]:not(:disabled)').count(),0,'failed transition keeps all stage choices locked');
  assert.equal(await page.locator('canvas[data-pit-arena-id]').count(),0,'no live fight before durable save');
  assert.equal(await storage(page),routeBefore,'failed write must not change saved bytes');
  await page.evaluate(()=>{Storage.prototype.setItem=window.__v42SetItem;delete window.__v42SetItem;});
  await retry.click();await page.locator('canvas[data-pit-arena-id]').waitFor();await page.locator('[data-pit-match-loading]').waitFor({state:'detached'});
  checks.push({name:'route-persistence-failure-retry',mode:'circuit',choicesLocked:true,noPrematureFight:true,failedSaveBytesUnchanged:true,retryLaunched:true});
  assert.deepEqual(errors,[]);assert.deepEqual(failures,[]);
  const report={passed:true,checkedAt:new Date().toISOString(),url:base,checks,errors,failures,browserClosed:true};
  await fs.writeFile(output+'/report.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
}catch(error){if(page){await page.screenshot({path:output+'/failure.png',fullPage:true}).catch(()=>{});await fs.writeFile(output+'/failure.json',JSON.stringify({error:String(error),checks,errors,failures,body:await page.locator('body').innerText().catch(()=>null)},null,2));}throw error;}finally{await browser.close();}
