import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import {chromium} from 'playwright-core';
import {homeworldQaModelV64} from './homeworld-qa-model-v64.mjs';
import {homeworldNavigatorV66} from './homeworld-navigation-browser-v66.mjs';
import {firstTracksCompleted,p} from '../tests/helpers/solo-v67-campaign-route.mjs';
const url=(process.env.V75_LANDSCAPE_QA_URL??'http://127.0.0.1:4192').replace(/\/$/,''),output=process.env.V75_LANDSCAPE_QA_OUTPUT??'work-local/v75/qa/landscape-local';
const naturalDevHydration=process.env.V75_QA_NATURAL_HYDRATION==='1';
await fs.mkdir(output,{recursive:true});
const api=homeworldQaModelV64(process.cwd(),['homeworldCity.ts','homeworldSpatialCodex.ts','homeworldOutskirtsV71.ts','homeworldOutskirtsArtV71.ts','homeworldLandscapeV75.ts','homeworldRegionConnectionsV72.ts']);
const browser=await chromium.launch({channel:'chrome',headless:true}),context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage();
const checks=[],captures=[],errors=[],failures=[],routes=[];
page.setDefaultTimeout(90000);page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)failures.push({url:r.url(),status:r.status()});});
const capture=async name=>{const file=output+'/'+name+'.jpg';await page.screenshot({path:file,type:'jpeg',quality:90});captures.push(file);};
async function inspectLandscape(name){
  const floor=page.locator('[data-homeworld-landscape-floor="v75"]');assert.equal(await floor.count(),1);
  const coverage=await floor.evaluate(node=>{const r=node.getBoundingClientRect(),v=document.querySelector('[data-homeworld-viewport]').getBoundingClientRect();return{floor:{left:r.left,top:r.top,right:r.right,bottom:r.bottom},viewport:{left:v.left,top:v.top,right:v.right,bottom:v.bottom},width:Number(node.getAttribute('width')),depth:Number(node.getAttribute('height')),transform:getComputedStyle(node).transform};});
  assert(coverage.floor.left<=coverage.viewport.left+1&&coverage.floor.right>=coverage.viewport.right-1,'natural floor covers full camera width');
  assert(coverage.floor.top<=coverage.viewport.top+1&&coverage.floor.bottom>=coverage.viewport.bottom-1,'natural floor also covers northern camera without black strip');
  assert(coverage.width*coverage.depth<api.HOMEWORLD_LANDSCAPE_BOUNDS_V75.width*api.HOMEWORLD_LANDSCAPE_BOUNDS_V75.depth/5);
  assert(coverage.transform.includes('0.573576'),'one ground projection');
  const natives=await page.locator('[data-homeworld-prop-id^="landscape-v75-"]').evaluateAll(nodes=>nodes.map(node=>({id:node.dataset.homeworldPropId,rect:node.dataset.nativeSourceRect,art:node.dataset.homeworldArtId,opacity:getComputedStyle(node).opacity,zIndex:Number(getComputedStyle(node).zIndex),image:node.querySelector('img').getAttribute('src')})));
  assert(natives.length>0&&natives.length<api.HOMEWORLD_LANDSCAPE_MODULES_V75.length,'actual camera-culling of new separate modules');
  for(const native of natives){const scenery=api.HOMEWORLD_LANDSCAPE_MODULES_V75.find(m=>m.id===native.id);assert(scenery);const art=api.HOMEWORLD_OUTSKIRTS_ART_V71[scenery.artId],r=art.sourceRect;
    assert.equal(native.rect,[r.x,r.y,r.width,r.height].join(','));assert.equal(native.image,art.src);assert.equal(native.zIndex,Math.round(Math.max(1,scenery.y)));
  }
  const patches=await page.locator('[data-homeworld-landscape-patch-v75]').evaluateAll(nodes=>nodes.map(n=>({id:n.dataset.homeworldLandscapePatchV75,material:n.dataset.landscapeMaterial,region:n.dataset.landscapeRegion})));
  assert(patches.length>0,'local natural ecotones are separate surfaces');
  const annotations=await page.locator('[data-homeworld-region-connection-v72] > span:not([data-homeworld-prop-id])').evaluateAll(nodes=>{
    const viewport=document.querySelector('[data-homeworld-viewport]').getBoundingClientRect();
    const overlap=(a,b)=>a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;
    const props=[...document.querySelectorAll('[data-homeworld-prop-id]')].map(prop=>({id:prop.dataset.homeworldPropId,rect:prop.getBoundingClientRect(),zIndex:Number(getComputedStyle(prop).zIndex),opacity:Number(getComputedStyle(prop).opacity)}));
    return nodes.filter(node=>overlap(node.getBoundingClientRect(),viewport)).map(node=>({
      regionId:node.parentElement.dataset.homeworldRegionConnectionV72,
      text:node.textContent,permission:node.querySelector('em')?.textContent??'',
      zIndex:Number(getComputedStyle(node).zIndex),
      intersectingProps:props.filter(prop=>prop.opacity>0&&overlap(prop.rect,node.getBoundingClientRect())).map(({id,zIndex})=>({id,zIndex})),
    }));
  });
  assert(annotations.length>0,'regional annotations remain mounted and visible in the real camera');
  for(const annotation of annotations){
    assert(Number.isFinite(annotation.zIndex)&&annotation.zIndex>=10000,'navigation annotation layer sits above depth-sorted scenery');
    for(const prop of annotation.intersectingProps)assert(annotation.zIndex>prop.zIndex,annotation.regionId+' annotation must not be hidden by '+prop.id);
  }
  if(name==='forbidden-reserve-modular-shoulders'){
    const reserve=annotations.find(annotation=>annotation.regionId==='forbidden-reserve');assert(reserve);
    assert(reserve.permission.length>15,'the actual required-permission explanation remains present');
    assert(reserve.intersectingProps.length>0,'Reserve capture exercises scenery overlap, not an empty label');
  }
  await capture(name);checks.push({name:'native-modular-landscape-camera-view',view:name,coverage,mounted:natives.length,natives,patches,annotations});
}
try{
  await page.addInitScript(({key,save})=>{if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(save));},{key:p.SAVE_STORAGE_KEY,save:firstTracksCompleted()});
  if(!naturalDevHydration)await page.clock.install();await page.goto(url,{waitUntil:'networkidle'});
  // The public frontend schedules archive migration on a zero-delay timer.
  // Advance our installed test clock before waiting for its enabled button,
  // especially after a fresh dev/StrictMode mount. No store/game bypass.
  if(naturalDevHydration){
    await page.waitForFunction(()=>[...document.querySelectorAll('button')].some(button=>/^Continuer/.test(button.textContent??'')&&!button.disabled));
    // Take the clock before entering the GameSession/World RAF, rather than
    // resetting performance timestamps of a city loop already in progress.
    await page.clock.install();
  }else await page.clock.runFor(250);
  await page.getByRole('button',{name:/^Continuer/}).click();
  await page.locator('[data-homeworld-hub][data-homeworld-motion-ready="true"]').waitFor({timeout:120000});
  assert.equal(await page.locator('main').getAttribute('data-game-content-version'),process.env.YAUTJA_QA_EXPECTED_VERSION??'V75');
  await page.clock.pauseAt(await page.evaluate(()=>Date.now()+150));const nav=homeworldNavigatorV66(page,api);await nav.focus();
  for(const regionId of ['glass-desert','thermal-caves','forbidden-reserve','luminous-marshes','cold-crown','storm-chain','pillar-jungle','first-city-ruins','leviathan-coast','ash-marches']){
    const connection=api.homeworldConnectionByRegionV72(regionId),from=await nav.position(),route=api.homeworldSpatialRoute(from,connection.arrival);
    assert.equal(route.status,'reachable');await nav.follow(route.points);await nav.tick(100);
    // Asset decoding is for screenshots only, AFTER the built-in motion-ready
    // gate and real public movement. Never replace the runtime load contract.
    await page.locator('[data-homeworld-hub] img').evaluateAll(images=>Promise.all(images.map(image=>image.decode())));
    await page.locator('[data-homeworld-landscape-native-material]').evaluateAll(nodes=>Promise.all(nodes.map(node=>{const image=new Image();image.src=node.href.baseVal;return image.decode();})));
    await inspectLandscape(regionId+'-modular-shoulders');
    assert(Math.hypot((await nav.position()).x-connection.arrival.x,(await nav.position()).y-connection.arrival.y)<11);
    routes.push({regionId,from,to:await nav.position(),distance:route.distance,publicKeyboard:true,newPermission:false});
    if(regionId==='pillar-jungle'){
      await page.setViewportSize({width:393,height:852});await nav.tick(100);await nav.focus();await inspectLandscape('pillar-jungle-northern-relief-portrait');
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
      await page.setViewportSize({width:1440,height:1000});await nav.tick(100);await nav.focus();
    }
  }
  await page.getByRole('button',{name:/^Atlas de la cité/}).click();await page.getByRole('button',{name:'Codex des éléments',exact:true}).click();
  const beforeSave=await page.evaluate(key=>localStorage.getItem(key),p.SAVE_STORAGE_KEY),beforeActor=await nav.position(),beforeClock=await page.locator('[data-homeworld-viewport]').getAttribute('data-city-seconds');
  for(const id of ['floor:landscape-v75','landscape-floor-v75:thermal-caves',api.HOMEWORLD_LANDSCAPE_MODULES_V75[0].id]){
    await page.getByRole('searchbox',{name:'Rechercher',exact:true}).fill(id);await page.locator('[data-homeworld-element-id="'+id+'"]').click();
    const detail=page.locator('[data-homeworld-element-detail="'+id+'"]');assert.equal(await detail.count(),1);
    assert((await detail.textContent()).toLowerCase().includes('original'));await capture(id.replaceAll(':','-')+'-linked-codex');
  }
  await nav.tick(1200);assert.deepEqual(await nav.position(),beforeActor);assert.equal(await page.locator('[data-homeworld-viewport]').getAttribute('data-city-seconds'),beforeClock);
  assert.equal(await page.evaluate(key=>localStorage.getItem(key),p.SAVE_STORAGE_KEY),beforeSave,'landscape codex is read-only');
  checks.push({name:'landscape-linked-codex-read-only',records:3});
  for(const source of[api.HOMEWORLD_LANDSCAPE_GROUND_V75,api.HOMEWORLD_OUTSKIRTS_GROUND_V71,Object.values(api.HOMEWORLD_OUTSKIRTS_ART_V71)[0]]){
    const response=await page.request.get(url+source.src);assert.equal(response.status(),200);const hash=crypto.createHash('sha256').update(await response.body()).digest('hex');assert.equal(hash,source.sha256);
    checks.push({name:'native-existing-and-new-png-bytes',src:source.src,sha256:hash});
  }
  assert.deepEqual(errors,[]);assert.deepEqual(failures,[]);
  await fs.writeFile(output+'/report.json',JSON.stringify({status:'PASS',url,checks,routes,captures,errors,failures,limits:'Ten existing gates approached by real keyboard with campaign prerequisites in isolated QA storage. New natural modules never change walking floor, collisions, permissions or saves. All212supports/14patches covered by model tests, not each manually visited. Original plateau ecology, not canonical 1:1 planetary geography. Native texture periodicity requested, not mathematically certified.'},null,2)+'\n');
  console.log(JSON.stringify({status:'PASS',checks:checks.length,routes:routes.length,captures:captures.length,output}));
}catch(error){await capture('failure').catch(()=>{});await fs.writeFile(output+'/report.json',JSON.stringify({status:'FAIL',url,error:String(error),checks,routes,captures,errors,failures},null,2)+'\n');throw error;}
finally{await browser.close();}
