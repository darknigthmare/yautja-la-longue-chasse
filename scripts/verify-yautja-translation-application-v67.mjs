import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {chromium} from 'playwright-core';
import {enterCampaignDeck} from './campaign-browser-helpers.mjs';
import {homeworldQaModelV64} from './homeworld-qa-model-v64.mjs';
import {homeworldNavigatorV66} from './homeworld-navigation-browser-v66.mjs';
import {p,env,now,patrolRoute,patrolInput} from '../tests/helpers/youth-patrol-played-route.mjs';
const url=process.env.V67_QA_URL??'http://127.0.0.1:4186',output=process.env.V67_TRANSLATION_APPLICATION_OUTPUT??'work-local/v67/qa/translation-application';
await fs.mkdir(output,{recursive:true});
const api=homeworldQaModelV64(process.cwd(),['homeworldCity.ts','homeworldSpatialCodex.ts','homeworldInteriorsV64.ts']);
const played=patrolRoute({stop:'patrol-ambush'});let young=played.save,state=played.state;
for(let n=0;n<4000;n++){
 const result=p.stepYouthTraining(state,patrolInput(state),env);
 if(result.state.phase==='patrol-assessment')break;
 state=result.state;young=result.receipts.length?p.withYouthProgress(young,result.receipts,state,now):p.withYouthCheckpoint(young,state);assert(young);
}
assert.equal(young.youthTraining.checkpoint.phase,'patrol-ambush');assert.equal(p.stepYouthTraining(state,patrolInput(state),env).state.phase,'patrol-assessment');
await fs.writeFile(path.join(output,'played-engine-before-assessment-fixture.json'),JSON.stringify(young,null,2));
const browser=await chromium.launch({channel:'chrome',headless:true});const checks=[],captures=[],errors=[],routes=[];let page;
for(const signal of ['SIGINT','SIGTERM'])process.once(signal,()=>{void browser.close().finally(()=>process.exit(130));});
const capture=async name=>{const file=path.join(output,name+'.jpg');await page.screenshot({path:file,type:'jpeg',quality:86});captures.push(file);};
try{
 const context=await browser.newContext({viewport:{width:1440,height:1000}});page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.emulateMedia({reducedMotion:'no-preference'});
 await enterCampaignDeck(page,{url});assert.equal(await page.locator('main[data-game-content-version]').getAttribute('data-game-content-version'),'V67');await page.getByRole('button',{name:'Yautja Prime · monde natal',exact:true}).click();
 await page.locator('[data-homeworld-actor]').waitFor({state:'attached'});await page.locator('[data-homeworld-hub] img').evaluateAll(images=>Promise.all(images.map(i=>i.decode())));
 await page.clock.install();await page.clock.pauseAt(new Date(Date.now()+100));const nav=homeworldNavigatorV66(page,api);
 console.log('V67 loaded; physical city routes begin');
 for(const [point,selector,label]of[['training-service','[data-side-story-v66]','story'],['medbay-service','[data-npc-missions-v66]','npc']]){
  await nav.openPoint(point);const panel=page.locator(selector),effect=panel.locator('[data-yautja-translation-v67]').first();await effect.waitFor();
  const greeting=page.locator('[data-homeworld-hub] [role="dialog"] > p [data-yautja-translation-v67]').first();
  assert((await greeting.locator('[lang="fr"]').textContent()).length>20);assert.equal(await greeting.getAttribute('data-translation-complete'),'false');
  assert.equal(await effect.getAttribute('data-translation-complete'),'false');assert((await effect.locator('[lang="fr"]').textContent()).length>30);assert(await panel.getByRole('button',{name:/^Accepter/}).isEnabled());
  await capture(label+'-decoding');const read=effect.locator('[data-translation-skip]');assert.notEqual(await read.getAttribute('data-youth-control'),null);
  await read.focus();await page.keyboard.press('Enter');await nav.tick(32);assert.equal(await effect.getAttribute('data-translation-complete'),'true');
  assert.equal(await page.locator(':focus').textContent(),'Texte affiché');await nav.tick(1800);assert.equal(await effect.getAttribute('data-translation-complete'),'true');
  await page.setViewportSize({width:393,height:852});await nav.tick(80);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await capture(label+'-mobile-readable');
  await page.setViewportSize({width:1440,height:1000});await nav.tick(80);checks.push(label+': physical doorway/NPC, actual Hub greeting and dialogue, accessible French, enabled action before completion, keyboard skip/focus and mobile reading');
 }
 console.log('City greetings, story and NPC reading verified');
 routes.push(...nav.routes);await context.close();
 const yc=await browser.newContext({viewport:{width:1280,height:900}});page=await yc.newPage();page.on('pageerror',e=>errors.push(e.message));await page.emulateMedia({reducedMotion:'no-preference'});
 await page.addInitScript(save=>localStorage.setItem('yautja-long-hunt.save',JSON.stringify(save)),young);
 await page.goto(url,{waitUntil:'networkidle'});console.log('Youth menu loaded');await page.getByRole('button',{name:/^Continuer/}).click({timeout:20000});console.log('Youth Continue clicked');await page.clock.install();await page.clock.pauseAt(new Date(Date.now()+100));
 const canvas=page.locator('canvas[data-youth-stage]');
 const mountedBy=Date.now()+60000;while(await canvas.count()===0&&Date.now()<mountedBy){await page.clock.runFor(17);await new Promise(resolve=>setTimeout(resolve,50));}
 assert.equal(await canvas.count(),1);console.log('Youth canvas mounted');
 const loadedBy=Date.now()+120000;while(await canvas.getAttribute('data-youth-assets')!=='true'&&Date.now()<loadedBy){await page.clock.runFor(17);await new Promise(resolve=>setTimeout(resolve,50));}
 assert.equal(await canvas.getAttribute('data-youth-assets'),'true');console.log('Youth assets ready');await canvas.focus();
 for(let n=0;n<12&&await canvas.getAttribute('data-youth-phase')!=='patrol-assessment';n++)await page.clock.runFor(34);
 assert.equal(await canvas.getAttribute('data-youth-phase'),'patrol-assessment');
 const assessment=page.locator('[data-youth-patrol-assessment] [data-yautja-translation-v67]');await assessment.waitFor();await capture('youth-assessment-decoding');
 const before=Number(await canvas.getAttribute('data-youth-tick'));await assessment.locator('[data-translation-skip]').focus();await page.keyboard.press('Enter');await page.clock.runFor(200);
 assert.equal(await assessment.getAttribute('data-translation-complete'),'true');assert.equal(await canvas.getAttribute('data-youth-paused'),'false');assert(Number(await canvas.getAttribute('data-youth-tick'))>before);
 assert.equal(await page.getByRole('dialog',{name:'Formation en pause',exact:true}).count(),0);checks.push('Actual youth assessment entered by the live engine from its last played ambush checkpoint; reading skip does not pause the canvas; simulation ticks continue');
 await page.getByRole('button',{name:'Pause et commandes',exact:true}).click();await page.clock.runFor(100);const tick=await canvas.getAttribute('data-youth-tick');await page.clock.runFor(300);assert.equal(await canvas.getAttribute('data-youth-tick'),tick);
 await capture('youth-pause-menu');await page.getByRole('button',{name:'Reprendre la formation',exact:true}).click();await page.clock.runFor(100);assert.equal(await canvas.getAttribute('data-youth-paused'),'false');
 checks.push('Existing youth pause menu still freezes progression and restores the canvas after reading');await yc.close();
 assert.deepEqual(errors,[]);await fs.writeFile(path.join(output,'report.json'),JSON.stringify({status:'PASS',url,checks,captures,routes,errors,scope:'Actual compiled V67 app. Adult baseline fixture and model-played youth checkpoint imported only before gameplay. Physical city walking/doors and actual live-engine transition from the last ambush checkpoint to assessment; not full youth campaign replay.',visualReview:'pending'},null,2));console.log(JSON.stringify({status:'PASS',checks:checks.length,captures:captures.length,output}));
}catch(error){await page?.screenshot({path:path.join(output,'failure.jpg'),type:'jpeg'}).catch(()=>{});await fs.writeFile(path.join(output,'report.json'),JSON.stringify({status:'FAIL',url,error:error.stack,checks,captures,routes,errors},null,2));throw error;}
finally{await browser.close();}
