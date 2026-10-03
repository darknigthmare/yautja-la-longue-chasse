import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import {chromium} from 'playwright-core';
import {homeworldQaModelV64} from './homeworld-qa-model-v64.mjs';
import {homeworldNavigatorV77} from './homeworld-navigation-browser-v77.mjs';
import {homeworldRegionNavigatorV68} from './homeworld-region-navigation-v68.mjs';
import {firstTracksCompleted,p} from '../tests/helpers/solo-v67-campaign-route.mjs';

const url=process.env.V77_FAUNA_QA_URL??'http://127.0.0.1:4195';
const output=process.env.V77_FAUNA_QA_OUTPUT??'work-local/v77/qa/fauna';
const api=homeworldQaModelV64(process.cwd(),['homeworldWorldV77.ts','homeworldNavigationV77.ts','homeworldGeometryV64.ts','homeworldInteriorsV64.ts','homeworldRegionsV68.ts','homeworldFaunaV77.ts']);
const browser=await chromium.launch({channel:'chrome',headless:true});
const checks=[],captures=[],errors=[],httpFailures=[];let page;
await fs.mkdir(output,{recursive:true});
async function shot(name){const target=output+'/'+name+'.png';await page.screenshot({path:target});captures.push(target);}
async function settleVisible(locator){
  // Suspense can finish fetching a lazy screen after a controlled RAF pulse.
  // Advance the real page clock until that screen mounts; do not replace it.
  for(let i=0;i<300;i++){if(await locator.isVisible())return;await page.clock.runFor(100);await new Promise(resolve=>setTimeout(resolve,25));}
  await locator.waitFor({timeout:1000});
}
function watch(target){target.setDefaultTimeout(60000);target.on('pageerror',error=>errors.push(error.message));target.on('response',response=>{if(response.status()>=400)httpFailures.push({url:response.url(),status:response.status()});});}
async function start(context,save){
  page=await context.newPage();watch(page);
  await page.addInitScript(({key,save})=>localStorage.setItem(key,JSON.stringify(save)),{key:p.SAVE_STORAGE_KEY,save});
  await page.clock.install();await page.goto(url,{waitUntil:'networkidle'});await page.getByRole('button',{name:/^Continuer/}).click();
  await page.locator('main[data-game-content-version="V77"]').waitFor();
}
const sceneSnapshot=()=>page.locator('[data-homeworld-region-v68]').evaluate(root=>({tick:root.dataset.stateTick,
  actor:Array.from(root.querySelectorAll('[data-region-player]')).map(n=>({x:n.dataset.x,y:n.dataset.y})),
  sprites:Array.from(root.querySelectorAll('[data-homeworld-fauna-v77] [data-homeworld-prop-id]')).map(n=>({id:n.dataset.homeworldPropId,style:n.getAttribute('style')}))}));
try{
  if(process.env.V77_FAUNA_QA_GALLERY!=='false'){
    const context=await browser.newContext({viewport:{width:1440,height:1000}});
    await start(context,firstTracksCompleted());await page.locator('[data-homeworld-hub][data-homeworld-motion-ready="true"]').waitFor({timeout:120000});
    await page.clock.pauseAt(await page.evaluate(()=>Date.now()+150));
    const nav=homeworldNavigatorV77(page,api,{driverTickMs:16,waypointTolerance:3,pulseInputs:true});
    await nav.openPoint('memory-service');await page.getByRole('button',{name:'Accéder au service',exact:true}).click();await nav.tick(100);
    const gallery=page.locator('[data-fauna-catalogue-v77]');await settleVisible(gallery);
    assert.equal(await gallery.locator('[data-fauna-species-id]').count(),5);
    for(const art of api.HOMEWORLD_FAUNA_LATEST_V77){
      const figure=gallery.locator('[data-fauna-art-id="'+art.id+'"]');await figure.scrollIntoViewIfNeeded();
      const image=figure.locator('img');await image.evaluate(image=>image.decode());
      assert.deepEqual(await image.evaluate(n=>({w:n.naturalWidth,h:n.naturalHeight})),{w:art.sourceWidth,h:art.sourceHeight});
      assert.equal(await figure.getAttribute('data-native-animation-clips'),'0');
      const bytes=await(await page.request.get(url+art.src)).body();assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),art.sha256);
    }
    const tusks=gallery.locator('[data-fauna-species-id="'+api.homeworldFaunaArtV77('crustacean-restored-tusks-final').speciesId+'"]');
    for(const art of api.homeworldFaunaVariantsV77(api.homeworldFaunaArtV77('crustacean-restored-tusks-final').speciesId)){
      await tusks.locator('select').selectOption(art.id);await tusks.locator('img').evaluate(n=>n.decode());assert.equal(await tusks.locator('img').getAttribute('src'),art.src);
    }
    await tusks.locator('select').selectOption('crustacean-restored-tusks-final');await shot('gallery-corrected-and-preserved-variants');
    await gallery.locator('summary').click();assert.equal(await gallery.locator('[data-native-format="reference-board"]').count(),5);
    for(const board of await gallery.locator('[data-native-format="reference-board"]').all()){await board.scrollIntoViewIfNeeded();await board.locator('img').evaluate(image=>image.decode());}
    await gallery.locator('[data-native-format="reference-board"]').last().scrollIntoViewIfNeeded();await shot('whole-reference-boards');
    const failing=api.HOMEWORLD_FAUNA_LATEST_V77[1];let deny=true;const attempts=[];
    await page.route('**'+failing.src,async route=>{attempts.push({url:route.request().url(),deny});if(deny)await route.abort('failed');else await route.continue();});
    // Re-enter through the public Back button, so this is a fresh image mount.
    await page.getByRole('button',{name:/^← Retour à la cité/}).click();
    await settleVisible(page.locator('[data-homeworld-hub][data-homeworld-motion-ready="true"]'));
    // Returning from a station schedules the GameClient heading-focus RAF.
    // Let that real callback settle before assigning world keyboard focus.
    await nav.tick(250);await nav.openPoint('memory-service');
    await page.getByRole('button',{name:'Accéder au service',exact:true}).click();await nav.tick(100);
    const broken=page.locator('[data-fauna-art-id="'+failing.id+'"]');await settleVisible(broken);await broken.scrollIntoViewIfNeeded();await settleVisible(broken.getByRole('alert'));
    assert.equal(await broken.locator('img').evaluate(n=>getComputedStyle(n).visibility),'hidden');await shot('gallery-real-png-error-no-substitute');
    deny=false;await broken.getByRole('button',{name:'Réessayer cette image'}).click();await broken.locator('img').evaluate(n=>n.decode());
    await broken.getByRole('alert').waitFor({state:'detached'});assert(attempts.some(a=>a.deny)&&attempts.some(a=>!a.deny));
    assert(attempts.every(a=>new URL(a.url).pathname===failing.src&&new URL(a.url).search===''));await shot('gallery-original-url-retry');
    checks.push({name:'physical-archive-access-five-native-images-preserved-variants-whole-boards-error-retry',routes:nav.routes,attempts});await context.close();
  }
  for(const display of api.HOMEWORLD_FAUNA_DISPLAY_V77){
    const context=await browser.newContext({viewport:{width:1440,height:1000}}),save=firstTracksCompleted();
    save.homeworldRegionV68=api.createHomeworldRegionV68(display.regionId,'v77-fauna:'+display.regionId);
    await start(context,save);const root=page.locator('[data-homeworld-region-v68="'+display.regionId+'"]');await root.waitFor();
    await page.locator('[data-region-resume]').waitFor();await page.clock.pauseAt(await page.evaluate(()=>Date.now()+150));
    const nav=homeworldRegionNavigatorV68(page,api);await nav.resume();
    const first=api.HOMEWORLD_REGIONS_V68[display.regionId].route[0];await nav.walkTo({x:display.x,y:first.y});
    const scenic=root.locator('[data-homeworld-fauna-v77="'+display.id+'"]'),native=scenic.locator('[data-homeworld-prop-id="'+display.id+'"]');
    assert.equal(await scenic.getAttribute('data-native-animation-clips'),'0');const art=api.homeworldFaunaArtV77(display.artId);
    await native.locator('img').evaluate(n=>n.decode());assert.equal(await native.locator('img').getAttribute('src'),art.src);
    assert.equal(await native.getAttribute('data-native-source-rect'),Object.values(art.sourceRect).join(','));
    const visible=await native.boundingBox();assert(visible&&visible.width>20&&visible.height>20&&visible.x<1440&&visible.x+visible.width>0&&visible.y<1000&&visible.y+visible.height>0);
    const pos=await nav.position();assert(api.isHomeworldRegionWalkableV68(display.regionId,'passage',pos,Number(await root.getAttribute('data-state-tick'))));
    const before=await sceneSnapshot();await nav.tick(1400);const after=await sceneSnapshot();
    assert(Number(after.tick)>Number(before.tick));assert.deepEqual(before.actor,after.actor);
    await shot(display.regionId+'-real-walk-native-fauna');await root.getByRole('button',{name:'Pause',exact:true}).click();
    const frozen=await sceneSnapshot();await nav.tick(1800);assert.deepEqual(await sceneSnapshot(),frozen);await shot(display.regionId+'-pause-frozen');
    if(display.placementMotion==='hover-held'){
      await page.emulateMedia({reducedMotion:'reduce'});await nav.tick(50);await nav.resume();const reduced=await sceneSnapshot();await nav.tick(1900);const reducedAfter=await sceneSnapshot();
      assert.deepEqual(reduced.sprites,reducedAfter.sprites,'Reduced motion preserves every native pose/anchor');
    }
    checks.push({name:'regional-scenic-native-support-real-walk-pause-reduced-motion',region:display.regionId,source:art.src,visible,routes:nav.routes});await context.close();
  }
  assert.deepEqual(errors,[]);assert.deepEqual(httpFailures,[]);
  await fs.writeFile(output+'/report.json',JSON.stringify({status:'PASS',url,checks,captures,errors,httpFailures,limits:[
    'Isolated model-played prerequisite saves; regional fixtures resume at real route origins, not full city-to-region journeys.',
    'Five supplied held drawings and four scenic observations; no anatomical animation, mounted gait, species canon or 1:1 source fidelity certified.',
    'Real keyboard walking and PNG failure/retry; no React state replacement or player teleport.'
  ]},null,2)+'\n');console.log(JSON.stringify({status:'PASS',checks:checks.length,captures:captures.length}));
}catch(error){await shot('failure').catch(()=>{});const dom=await page?.evaluate(()=>({active:document.activeElement?.outerHTML,dialogs:Array.from(document.querySelectorAll('[role="dialog"]')).map(n=>({html:n.outerHTML.slice(0,1500),visible:n.checkVisibility()})),inert:Array.from(document.querySelectorAll('[inert]')).map(n=>n.outerHTML.slice(0,500))})).catch(()=>null);await fs.writeFile(output+'/report.json',JSON.stringify({status:'FAIL',url,error:String(error),checks,captures,errors,httpFailures,dom},null,2)+'\n');throw error;}
finally{await browser.close();}
