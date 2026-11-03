import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {chromium} from 'playwright-core';
import {homeworldQaModelV64} from './homeworld-qa-model-v64.mjs';
import {homeworldNavigatorV66} from './homeworld-navigation-browser-v66.mjs';
import {campaignFixture,enterCampaignDeck} from './campaign-browser-helpers.mjs';

const url=process.env.V66_QA_URL??'http://localhost:4184';
const output=process.env.V66_SIDE_QA_OUTPUT??'work-local/v66/qa/side-story';
const branches=process.env.V66_SIDE_QA_BRANCH?[process.env.V66_SIDE_QA_BRANCH]:['supervised-correction','recorded-review'];
await fs.mkdir(output,{recursive:true});
const api=homeworldQaModelV64(process.cwd(),['homeworldCity.ts','homeworldSpatialCodex.ts','homeworldInteriorsV64.ts','homeworldSideStoryV66.ts','homeworldNpcMissionsV66.ts']);
const browser=await chromium.launch({channel:'chrome',headless:true});
const checks=[],captures=[],routes=[],errors=[],events=[];let page;
const fixedFields=['profile','inventory','trophies','justice','loadout','missionProgress','codex','exploration'];
async function capture(name){const target=path.join(output,name+'.jpg');await page.screenshot({path:target,type:'jpeg',quality:86});captures.push(target);}
try{
 for(const branch of branches){
  const context=await browser.newContext({viewport:{width:1440,height:1000}});page=await context.newPage();
  page.on('pageerror',error=>errors.push({branch,message:error.message}));
  page.on('console',message=>{if(/Fast Refresh|HMR|reload/i.test(message.text()))events.push({branch,at:new Date().toISOString(),message:message.text()});});
  await page.addInitScript(()=>{window.__v66Pad={id:'QA controller',index:0,connected:true,mapping:'standard',timestamp:0,axes:[0,0],buttons:Array.from({length:16},()=>({pressed:false,touched:false,value:0}))};Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>[window.__v66Pad]});const original=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){
   if(window.__v66RefuseSave&&key==='yautja-long-hunt.save')throw new DOMException('Deliberate isolated QA refusal','QuotaExceededError');
   return original.call(this,key,value);
  };});
  const fixture=await campaignFixture();
  const saved=()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),fixture.key);
  await enterCampaignDeck(page,{url});assert.equal(await page.locator('main[data-game-content-version]').getAttribute('data-game-content-version'),'V66');await page.getByRole('button',{name:'Yautja Prime · monde natal',exact:true}).click();
  await page.locator('[data-homeworld-actor]').waitFor({state:'attached'});
  await page.locator('[data-homeworld-hub] img').evaluateAll(images=>Promise.all(images.map(image=>image.decode())));
  await page.clock.install();await page.clock.pauseAt(new Date(Date.now()+1000));
  const nav=homeworldNavigatorV66(page,api);await nav.focus();
  const baseline=await saved();assert.equal(baseline.homeworld.sideStoryV66.accepted,false);
  const story=()=>page.locator('[data-side-story-v66]');
  const click=async(name)=>{await story().getByRole('button',{name,exact:true}).click({force:true});await nav.tick(96);};
  const step=async(expected,count)=>{assert.equal(await story().getAttribute('data-side-story-v66'),expected);assert.equal(Number(await story().getAttribute('data-side-story-checkpoints')),count);};
  const at=async(id)=>{console.log(branch+' walking to '+id);await nav.openPoint(id);await nav.tick(100);};
  const wrong=async(label,expected,count)=>{const before=(await saved()).homeworld.sideStoryV66;await click(label);await step(expected,count);assert.deepEqual((await saved()).homeworld.sideStoryV66,before);};
  await at('training-service');await step('invitation',0);await capture(branch+'-01-offer');
  await page.evaluate(()=>window.__v66RefuseSave=true);await click('Accepter d’examiner la déclaration');
  assert.equal((await saved()).homeworld.sideStoryV66.accepted,false);await step('invitation',0);
  assert.match(await story().innerText(),/Écriture non confirmée/);await capture(branch+'-02-write-refusal');
  await page.evaluate(()=>window.__v66RefuseSave=false);await click('Accepter d’examiner la déclaration');await step('inspection',1);
  checks.push({branch,check:'Storage refusal preserves unaccepted story; same physical interaction retries successfully',status:'PASS'});
  await at('forge-service');
  for(const [index,clue]of api.SIDE_STORY_CLUES_V66.entries()){await click(clue.label);await step(index===2?'archive':'inspection',index+2);}
  const notes=story().getByRole('button',{name:'Relire les indices conservés · 3/3',exact:true});await notes.focus();
  await page.evaluate(()=>window.__v66Pad.buttons[0].pressed=true);await nav.tick(96);await page.evaluate(()=>window.__v66Pad.buttons[0].pressed=false);await nav.tick(96);
  assert.equal(await notes.getAttribute('aria-expanded'),'true','Controller confirm opens saved observations');
  await notes.focus();await page.keyboard.press('Enter');await nav.tick(96);assert.equal(await notes.getAttribute('aria-expanded'),'false','Keyboard can close saved observations');
  await capture(branch+'-03-three-observations');
  await at('memory-register-point');await click('Consulter les trois relevés');await step('chronology',5);
  const beforeChronology=(await saved()).homeworld.sideStoryV66;
  await story().locator('[data-side-story-confirm-chronology]').click({force:true});await nav.tick(96);
  assert.deepEqual((await saved()).homeworld.sideStoryV66,beforeChronology);await step('chronology',5);
  await capture(branch+'-04-chronology-error');
  await page.setViewportSize({width:393,height:852});await nav.tick(100);await capture(branch+'-05-chronology-mobile');
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'No mobile page overflow');
  for(const id of ['claimed-return','blank-issued'])await story().locator(`[data-side-story-record="${id}"]`).getByRole('button',{name:/^Monter/}).click({force:true});
  await nav.tick(96);assert.deepEqual(await story().locator('[data-side-story-record]').evaluateAll(nodes=>nodes.map(node=>node.dataset.sideStoryRecord)),['claimed-return','blank-issued','mark-requested']);
  await story().locator('[data-side-story-confirm-chronology]').click({force:true});await nav.tick(96);await step('deduction',6);
  await page.setViewportSize({width:1440,height:1000});await nav.tick(100);
  await wrong('Le novice doit automatiquement devenir Bad Blood.','deduction',6);
  await click('Cette pièce n’authentifie pas la chasse déclarée.');await step('testimony',7);
  checks.push({branch,check:'Three independent material observations, ordered register puzzle and bounded inference; wrong answers persist nothing',status:'PASS'});
  await at('training-service');await click('Consigner la réponse transmise par l’instructeur');await step('decision',8);await capture(branch+'-06-decision');
  await click(branch==='supervised-correction'?'Choisir la rectification encadrée':'Choisir l’examen institutionnel');await step(branch==='supervised-correction'?'correction':'review',9);
  assert.equal((await saved()).homeworld.sideStoryV66.resolution,branch);
  if(branch==='supervised-correction'){
   await at('temple-point');await click('Prise de chasse');await click('Trophée reconnu');
   const before=(await saved()).homeworld.sideStoryV66;
   await story().locator('[data-side-story-confirm-correction]').click({force:true});await nav.tick(96);
   assert.deepEqual((await saved()).homeworld.sideStoryV66,before);await capture(branch+'-07-correction-error');
   await click('Moulage d’exercice');await click('Chasse non authentifiée');
   await story().locator('[data-side-story-confirm-correction]').click({force:true});await nav.tick(96);
  }else{
   await at('enforcer-point');await wrong('Joindre une condamnation déjà rédigée.','review',9);
   await capture(branch+'-07-deposition-error');await click('Conserver les faits ; limiter la conclusion à cette déclaration.');
  }
  await step('closure',10);assert.equal((await saved()).homeworld.sideStoryV66.completed,false);
  await at('training-service');await click('Confirmer la suite donnée au dossier');await step('complete',11);await capture(branch+'-08-complete');
  const finished=await saved();for(const key of fixedFields)assert.deepEqual(finished[key],baseline[key],key+' unchanged');
  assert.equal(finished.homeworld.sideStoryV66.completed,true);assert.equal(finished.homeworld.sideStoryV66.resolution,branch);
  await fs.writeFile(path.join(output,branch+'-played-save.json'),JSON.stringify(finished,null,2));
  checks.push({branch,check:'Six physical meetings, eleven acknowledged checkpoints, branch consequence retained without rewards',status:'PASS',checkpoints:11,meetings:6});
  routes.push({branch,records:nav.routes});
  // Let lazy imports and their actual timers settle during navigation. A paused
  // simulation clock must not strand React's loading boundary after reload.
  await page.clock.resume();await page.reload({waitUntil:'networkidle'});
  const reloaded=await saved();assert.deepEqual(reloaded.homeworld.sideStoryV66,finished.homeworld.sideStoryV66);
  await page.getByRole('button',{name:/^Continuer/}).click();
  await page.waitForFunction(()=>document.querySelector('[data-homeworld-actor]')||document.querySelector('[data-campaign-session][data-campaign-location="deck"]'),null,{timeout:60000});
  // The campaign may correctly restore its last location directly to Homeworld.
  if(!await page.locator('[data-homeworld-hub]').count())await page.getByRole('button',{name:'Yautja Prime · monde natal',exact:true}).click();
  await page.locator('[data-homeworld-actor]').waitFor({state:'attached'});
  await page.clock.pauseAt(new Date((await page.evaluate(()=>Date.now()))+1000));
  const reNav=homeworldNavigatorV66(page,api);await reNav.openPoint('training-service');await step('complete',11);
  await capture(branch+'-09-revisited-after-reload');
  checks.push({branch,check:'Actual page reload and walked revisit retain the final consequence; no replayable reward action',status:'PASS'});
  routes.push({branch:branch+'-reload',records:reNav.routes});
  await context.close();
 }
 assert.deepEqual(errors,[]);
 await fs.writeFile(path.join(output,'report.json'),JSON.stringify({status:'PASS',url,checks,captures,routes,errors,events,
  scope:'Real keyboard navigation, physical doors/interlocutors and UI actions. Isolated legacy adult fixture begins with empty V66 story. No expedition or main-campaign completion claimed.',visualReview:'pending'},null,2));
 console.log(JSON.stringify({status:'PASS',checks:checks.length,captures:captures.length,output}));
}catch(error){
 if(page&&!page.isClosed())await page.screenshot({path:path.join(output,'failure.jpg'),type:'jpeg',quality:86}).catch(()=>{});
 await fs.writeFile(path.join(output,'report.json'),JSON.stringify({status:'FAIL',url,error:error.stack,checks,captures,routes,errors,events},null,2));throw error;
}finally{await browser.close();}
