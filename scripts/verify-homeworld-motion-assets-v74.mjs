import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium} from 'playwright-core';
import {homeworldQaModelV64} from './homeworld-qa-model-v64.mjs';
import {firstTracksCompleted,p} from '../tests/helpers/solo-v67-campaign-route.mjs';

const url=process.env.V74_MOTION_ASSETS_QA_URL??'http://127.0.0.1:4192';
const output=process.env.V74_MOTION_ASSETS_QA_OUTPUT??'work-local/v74/qa/motion-assets';
const version=process.env.YAUTJA_QA_EXPECTED_VERSION??'V74';
const api=homeworldQaModelV64(process.cwd(),['homeworldYouthMotionV74.ts','homeworldSceneAssetsV76.ts']);
const missing=process.env.V76_SCENE_ASSET_FAILURE==='1'
  ?api.HOMEWORLD_SCENE_ASSETS_V76.find(source=>source.src.endsWith('/interior/rack-lateral.png')).src
  :api.HOMEWORLD_YOUTH_MOTION_ART_V74.sources['nw-opposite'].src;
await fs.mkdir(output,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage();
const checks=[],captures=[],errors=[],requests=[];let deny=true;
page.setDefaultTimeout(60000);page.on('pageerror',error=>errors.push(error.message));
await page.route('**'+missing,async route=>{requests.push({url:route.request().url(),denied:deny});if(deny)await route.abort('failed');else await route.continue();});
const snapshot=()=>page.evaluate(key=>{
  const viewport=document.querySelector('[data-homeworld-viewport]'),actor=document.querySelector('[data-homeworld-actor]');
  return {save:localStorage.getItem(key),x:actor.dataset.x,y:actor.dataset.y,seconds:viewport.dataset.citySeconds,distance:actor.dataset.youthDistanceV74};
},p.SAVE_STORAGE_KEY);
const capture=async name=>{const file=output+'/'+name+'.png';await page.screenshot({path:file});captures.push(file);};
try{
  await page.addInitScript(({key,save})=>{if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(save));},{key:p.SAVE_STORAGE_KEY,save:firstTracksCompleted()});
  await page.clock.install();await page.goto(url,{waitUntil:'networkidle'});await page.getByRole('button',{name:/^Continuer/}).click();
  const hub=page.locator('[data-homeworld-hub]');await hub.waitFor();assert.equal(await page.locator('main').getAttribute('data-game-content-version'),version);
  const alert=page.locator('[data-homeworld-motion-loading-v74][role="alert"]');await alert.waitFor();
  assert.equal(await hub.getAttribute('data-homeworld-motion-ready'),'false');assert((await alert.innerText()).includes(missing));
  assert.equal(await page.locator('[data-homeworld-unblooded-v72][data-motion-version="74"]').count(),0,'prepared V72 idle is used, no blank V74 frame');
  assert.equal(await page.locator('[data-homeworld-unblooded-v72="idle"]').count(),1);
  await page.clock.pauseAt(await page.evaluate(()=>Date.now()+30));
  const frozen=await snapshot();await page.locator('[data-homeworld-viewport]').focus();await page.keyboard.down('ArrowRight');await page.clock.runFor(1200);await page.keyboard.up('ArrowRight');
  assert.deepEqual(await snapshot(),frozen,'resource error freezes position, gait travel, city clock and durable save');await capture('missing-animation-visible-error-and-safe-idle');
  checks.push({name:'real-missing-png-uses-safe-idle-and-freezes-controls-world-save',source:missing,noRuntimeReplacement:true});
  deny=false;await page.getByRole('button',{name:'Réessayer les animations',exact:true}).click();
  await page.locator('[data-homeworld-hub][data-homeworld-motion-ready="true"]').waitFor();
  assert.equal(await page.locator('[data-homeworld-motion-loading-v74]').count(),0);assert.deepEqual(await snapshot(),frozen,'retry itself does not persist or advance gameplay');
  assert(requests.some(request=>request.denied)&&requests.some(request=>!request.denied),'retry really requests the previously failed original PNG URL');
  assert(requests.every(request=>new URL(request.url).pathname===missing&&new URL(request.url).search===''),'same original image path, no nonce/background mismatch');
  const native=page.locator('[data-homeworld-unblooded-v72][data-motion-version="74"]');assert.equal(await native.count(),1);await capture('original-png-retry-all-native-animations-ready');
  checks.push({name:'real-original-png-retry-recovers-without-save-loss',requests:[...requests]});
  await page.locator('[data-homeworld-viewport]').focus();await page.keyboard.down('ArrowRight');await page.clock.runFor(120);await page.keyboard.up('ArrowRight');
  const after=await snapshot();assert(Number(after.x)>Number(frozen.x),'controls resume after actual decode success');assert(Number(after.distance)>Number(frozen.distance),'distance-owned gait resumes');
  const src=await native.getAttribute('data-native-source');assert(src&&Object.values(api.HOMEWORLD_YOUTH_MOTION_ART_V74.sources).some(source=>source.src===src));
  const source=Object.values(api.HOMEWORLD_YOUTH_MOTION_ART_V74.sources).find(source=>source.src===src);
  const natural=await page.evaluate(async src=>{const image=new Image();image.src=src;await image.decode();return {width:image.naturalWidth,height:image.naturalHeight};},src);
  assert.deepEqual(natural,{width:source.sourceWidth,height:source.sourceHeight});await capture('first-native-step-after-recovery');
  checks.push({name:'first-actual-native-step-remains-decoded-and-movement-resumes',src,natural});
  assert.deepEqual(errors,[]);
  await fs.writeFile(output+'/report.json',JSON.stringify({status:'PASS',version,url,checks,captures,errors,requests,
    limits:'An isolated model-tested post-campaign prerequisite profile is seeded. The failure is a real browser PNG request abort, not a replacement runtime/physics function. Retry uses the original static URL; movement, clock, gait distance and save freeze are verified in the actual game.'},null,2));
  console.log(JSON.stringify({status:'PASS',checks:checks.length,captures:captures.length,output}));
}catch(error){await capture('failure').catch(()=>{});await fs.writeFile(output+'/report.json',JSON.stringify({status:'FAIL',version,url,error:String(error),checks,captures,errors,requests},null,2));throw error;}
finally{await browser.close();}
