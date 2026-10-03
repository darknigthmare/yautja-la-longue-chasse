import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {build} from 'esbuild';
import {chromium} from 'playwright-core';
import {homeworldNavigatorV66} from './homeworld-navigation-browser-v66.mjs';

// A dedicated disposable browser context, never a user profile. Fixture data
// declares the adult legacy/checkpoint prerequisite BEFORE the app loads. All
// movement, hospitality, consumption and persistence then use the real app.
const url=process.env.V77_QA_URL??'http://127.0.0.1:4195';
const output=process.env.V77_CNTLIP_QA_OUTPUT??'work-local/v77/qa/cntlip-gameclient';
await fs.mkdir(output,{recursive:true});
const bundled=await build({stdin:{contents:`export * from './app/game/save';
export * from './app/game/systems/homeworld';
export * from './app/game/systems/homeworldInteriorsV64';
export * from './app/game/systems/homeworldGeometryV64';
export * from './app/game/systems/homeworldWorldV77';
export * from './app/game/systems/homeworldLocationV77';
export * from './app/game/systems/homeworldCntlipPhysicalV77';
export * from './app/game/systems/cntlipV77';`,resolveDir:process.cwd()},bundle:true,write:false,platform:'node',format:'esm',logLevel:'silent'});
const api=await import('data:text/javascript;base64,'+Buffer.from(bundled.outputFiles[0].text).toString('base64'));
const key=api.SAVE_STORAGE_KEY;
const checks=[],captures=[],errors=[],network=[],routes=[];
const browser=await chromium.launch({channel:process.env.QA_BROWSER_CHANNEL??'chrome',headless:true});
let page;
const saveRead=()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key);
const ledgerRead=async()=>(await saveRead()).homeworld.cntlipV77;
const capture=async name=>{const file=path.join(output,name+'.png');await page.screenshot({path:file});captures.push(file);};
const unchangedGame=(before,after)=>{
  for(const field of ['inventory','trophies','missionProgress','justice','loadout','statistics'])assert.deepEqual(after[field],before[field],field);
  for(const field of ['rankId','honor','clanMarks'])assert.equal(after.profile[field],before.profile[field],field);
  for(const field of ['contractsV68','npcMissionsV66','sideStoryV66','inquiry','evidenceIds','audienceOutcome','relations'])assert.deepEqual(after.homeworld[field],before.homeworld[field],field);
};

function fixture(host,index){
  let save=api.defaultSave(`2026-10-03T16:00:0${index}.000Z`);
  save.profile.hunterName='QA C’ntlip V77 · '+host.siteId;
  const room=api.homeworldInteriorForBuildingV64(host.buildingId);
  const building=api.HOMEWORLD_BUILDINGS_V77.find(item=>item.id===host.buildingId);
  const doorway=api.homeworldBuildingDoorwayV64(building);
  if(host.siteId==='council-gathering'){
    // This case has an explicitly pre-existing Elite/audience prerequisite.
    // The test never represents these model preconditions as played rewards.
    save.profile.honor=api.RANK_THRESHOLDS.elite;
    save.profile.rankId='elite';
    for(const evidence of api.HOMEWORLD_EVIDENCE)save.homeworld=api.applyHomeworldAction(save.homeworld,{type:'inspect',evidenceId:evidence.id},{rankId:'elite',ownedTrophyCount:0}).progress;
    save.homeworld=api.applyHomeworldAction(save.homeworld,{type:'choose-witness',choice:'investigate'},{rankId:'elite',ownedTrophyCount:0}).progress;
    save.homeworld=api.applyHomeworldAction(save.homeworld,{type:'audience'},{rankId:'elite',ownedTrophyCount:0}).progress;
  }
  save.homeworld.locationV77={version:1,layoutRevision:1,ownerCreatedAt:save.createdAt,levelId:building.levelId,
    exterior:doorway.approach,interiorId:room.buildingId,local:room.spawn};
  const parsed=api.parseSaveImport(JSON.stringify(save));assert(parsed.save,parsed.message);
  assert.equal(api.resolveHomeworldLocationV77(parsed.save.homeworld.locationV77,save.createdAt).restored,true);
  return{key,save:parsed.save,host,room,levelId:building.levelId};
}

function tableRoute(room,start,host){
  const id=p=>p.x+','+p.y,queue=[start],previous=new Map(),seen=new Set([id(start)]),body={halfWidth:28,halfDepth:18};
  let last=null;
  for(let i=0;i<queue.length;i++){
    const p=queue[i];
    if(api.homeworldCntlipReachedV77(room,p)?.id===host.id&&Math.hypot(p.x-host.approach.x,p.y-host.approach.y)<9){last=p;break;}
    for(const [dx,dy]of[[8,0],[-8,0],[0,8],[0,-8]]){
      const next={x:p.x+dx,y:p.y+dy},name=id(next);if(seen.has(name))continue;
      let safe=true;for(let n=1;n<=8;n++)if(!api.isHomeworldInteriorWalkableV64(room,{x:p.x+dx*n/8,y:p.y+dy*n/8},body)){safe=false;break;}
      if(safe){seen.add(name);previous.set(name,p);queue.push(next);}
    }
  }
  assert(last,'actual body route to '+host.id);const points=[last];while(previous.has(id(points.at(-1))))points.push(previous.get(id(points.at(-1))));return points.reverse();
}

async function openApp(f,navigate=true){
  if(navigate)await page.goto(url,{waitUntil:'networkidle',timeout:120000});
  await page.getByRole('button',{name:/^Continuer/}).click();
  await page.locator('[data-campaign-session][data-campaign-location="deck"],[data-campaign-session][data-campaign-location="homeworld"]').waitFor({timeout:60000});
  assert.equal(await page.locator('main[data-game-content-version]').getAttribute('data-game-content-version'),'V77');
  // A durable V77 checkpoint returns straight to the actual Homeworld room.
  // A first migrated legacy entry may still open on deck. Both are public
  // routes; never force a deck detour over the correctly restored location.
  if(await page.locator('[data-campaign-session]').getAttribute('data-campaign-location')==='deck')
    await page.getByRole('button',{name:'Yautja Prime · monde natal',exact:true}).click();
  await page.locator('[data-homeworld-hub][data-homeworld-motion-ready="true"]').waitFor({timeout:90000});
  assert.equal(await page.locator('[data-homeworld-hub]').getAttribute('data-homeworld-interior-id'),f.host.buildingId);
  assert.equal(await page.locator('[data-homeworld-hub]').getAttribute('data-homeworld-level-v77'),f.levelId);
  await page.locator('[data-homeworld-hub] img').evaluateAll(images=>Promise.all(images.map(image=>image.decode())));
  await page.bringToFront();
}
const widget=()=>page.locator('[data-cntlip-site-v77]');
const openTable=async city=>{await city.focus();await page.getByRole('button',{name:/Halte ·/}).click();await widget().waitFor({state:'visible'});};
const closeTable=async()=>{await widget().getByRole('button',{name:'Repartir sans autre coupe · préparation conservée en pause',exact:true}).click();await widget().waitFor({state:'hidden'});};
const invite=()=>widget().getByRole('button',{name:'Recevoir l’invitation de l’hôte · quatre portions une seule fois',exact:true}).click();
const sit=()=>widget().getByRole('button',{name:'Prendre place auprès de la table',exact:true}).click();
const fault=enabled=>page.evaluate(enabled=>{window.__cntlipQaRefuseSave=enabled;},enabled);

try{
  for(const [index,host]of api.HOMEWORLD_CNTLIP_HOSTS_V77.entries()){
    const context=await browser.newContext({viewport:{width:1440,height:1000}});page=await context.newPage();
    page.on('pageerror',error=>errors.push({siteId:host.siteId,message:error.message}));
    page.on('response',response=>{if(response.status()>=400)network.push({siteId:host.siteId,status:response.status(),url:response.url()});});
    const f=fixture(host,index);
    await page.addInitScript(({key,save})=>{
      if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(save));
      const original=Storage.prototype.setItem;
      Storage.prototype.setItem=function(name,value){if(window.__cntlipQaRefuseSave&&name===key)throw new DOMException('Isolated QA refusal','QuotaExceededError');return original.call(this,name,value);};
    },f);
    // Install before navigation. Installing after the live RAF has captured a
    // native performance.now timestamp can reset its clock epoch and produce
    // negative dt; that falsely reports clear physical paths as immobile.
    await page.clock.install();
    await openApp(f);
    await page.clock.pauseAt(await page.evaluate(()=>Date.now()+1000));
    const city=homeworldNavigatorV66(page,api,{controlledClock:true,waypointTolerance:3,driverTickMs:16,pulseInputs:true});
    await city.focus();
    const from=await city.position(),pathToTable=tableRoute(f.room,from,host);
    await city.follow(pathToTable);await city.release();await city.tick(200);
    const reached=await city.position();assert.equal(api.homeworldCntlipReachedV77(f.room,reached)?.id,host.id);
    assert.equal(await page.locator(`[data-homeworld-cntlip-host-v77="${host.id}"]`).count(),1);
    routes.push({siteId:host.siteId,buildingId:host.buildingId,levelId:f.levelId,from,to:reached,points:pathToTable});
    await capture(`${index+1}-${host.siteId}-native-table`);
    await openTable(city);
    assert.match(await widget().innerText(),/créations originales/);
    const baseline=await saveRead();
    if(index===0){
      const untouched=await ledgerRead();await fault(true);await invite();await city.tick(64);
      assert.deepEqual(await ledgerRead(),untouched);assert.match(await widget().innerText(),/non confirmée/);
      await fault(false);
    }
    await invite();assert.equal((await ledgerRead()).stock[host.siteId],4);
    assert.equal(await widget().getByRole('button',{name:/Recevoir l’invitation/}).count(),0);
    await sit();
    const memory=api.CNTLIP_MEMORIES_V77.find(item=>item.siteId===host.siteId);
    const story=widget().getByRole('button',{name:'Partager un récit · '+memory.title,exact:true});
    if(index===0){
      const before=await ledgerRead();await fault(true);await story.click();await city.tick(64);
      assert.deepEqual(await ledgerRead(),before);await fault(false);
    }
    await story.dblclick();await closeTable();await city.tick(4000);
    const reserved=await ledgerRead();assert.equal(reserved.stock[host.siteId],3);assert.equal(reserved.state.totalServings,1);
    assert.equal(reserved.state.activeDoses,0);assert.equal(reserved.state.memories.length,0);assert.equal(reserved.state.pending.elapsedMs,0);
    checks.push({siteId:host.siteId,check:'native table reached via actual keyboard / finite invitation / double click / closed clock',status:'PASS'});
    await page.clock.resume();await page.reload({waitUntil:'networkidle',timeout:120000});await openApp(f,false);
    // Reload preserves the controlled browser clock, which may already be
    // ahead of the runner's wall clock after physically driving the approach.
    await page.clock.pauseAt(await page.evaluate(()=>Date.now()+1000));
    assert.deepEqual(await ledgerRead(),reserved);
    await openTable(city);
    if(index===0){
      // The table shell is modal. Close it through its own public button before
      // touching underlying HUD controls; do not force clicks through backdrop.
      await closeTable();
      await page.locator('[data-homeworld-hub]').getByRole('button',{name:'Pause',exact:true}).click();
      const paused=await ledgerRead();await city.tick(4000);assert.deepEqual(await ledgerRead(),paused);
      await page.locator('[data-homeworld-hub]').getByRole('button',{name:'Reprendre',exact:true}).click();
      await page.locator('[data-homeworld-hub]').getByRole('button',{name:'Navigation',exact:true}).click();
      await page.locator('[data-homeworld-hub]').getByRole('dialog').getByRole('button',{name:'Réglages',exact:true}).click();
      const suspended=await ledgerRead();await city.tick(4000);assert.deepEqual(await ledgerRead(),suspended);
      await page.getByRole('dialog',{name:'Réglages du biomask',exact:true}).getByRole('button',{name:'Fermer',exact:true}).click();
      // Homeworld's public navigation capture closes its shell when a service
      // button is used. Only close explicitly if a shell remains visible.
      const navigationBack=page.locator('[data-homeworld-hub]').getByRole('dialog').getByRole('button',{name:'Fermer la navigation',exact:true});
      if(await navigationBack.isVisible())await navigationBack.click();
      await openTable(city);
      checks.push({check:'closed pending portion survives actual Hub pause + GameClient settings suspended, then reopens once',status:'PASS',scope:'the portion is closed while these two public overlays own focus; no click through a table modal'});
    }
    await page.bringToFront();await widget().focus();assert(await page.evaluate(()=>document.hasFocus()));await city.tick(3800);
    const shared=await saveRead();assert.equal(shared.homeworld.cntlipV77.stock[host.siteId],3);assert.equal(shared.homeworld.cntlipV77.state.pending,null);
    assert.equal(shared.homeworld.cntlipV77.state.activeDoses,1);assert.equal(shared.homeworld.cntlipV77.state.memories[0].memoryId,memory.id);
    unchangedGame(baseline,shared);
    assert(await widget().getByRole('button',{name:'Partager un récit · '+memory.title+' · déjà écouté',exact:true}).count());
    if(index===0){
      const beforeRest=await saveRead();await fault(true);await widget().getByRole('button',{name:'Choisir une halte de deux heures',exact:true}).click();
      assert.deepEqual(await ledgerRead(),beforeRest.homeworld.cntlipV77);await fault(false);
      await widget().getByRole('button',{name:'Choisir une halte de deux heures',exact:true}).click();
      const rested=await saveRead();assert.equal(rested.homeworld.cntlipV77.state.worldElapsedMs,7200000);assert.equal(rested.homeworld.cntlipV77.state.activeDoses,0);
      assert.equal(rested.homeworld.cntlipV77.stock[host.siteId],3);assert.equal(rested.profile.playTimeSeconds,beforeRest.profile.playTimeSeconds);
      unchangedGame(beforeRest,rested);assert.equal(await page.locator('[data-homeworld-hub]').getAttribute('data-homeworld-interior-id'),host.buildingId);
      checks.push({check:'quota refused rest / successful same-table two-hour narrative ellipse / no gameplay time or reward',status:'PASS'});
      await page.setViewportSize({width:390,height:844});await city.tick(64);
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
      await capture('clan-cntlip-mobile-dialog');
      await closeTable();await city.focus();await page.getByRole('button',{name:'Interagir avec le point proche',exact:true}).click();
      await widget().waitFor({state:'visible'});assert.equal((await ledgerRead()).state.worldElapsedMs,7200000);
      checks.push({check:'390x844 genuine GameClient touch interact / dialogue / no horizontal overflow',status:'PASS'});
    }
    await capture(`${index+1}-${host.siteId}-shared-memory`);
    checks.push({siteId:host.siteId,check:'real GameClient reload at table / 3-second completed unique NPC memory / no rank/combat/quest reward',status:'PASS'});
    await context.close();
  }
  assert.deepEqual(errors,[]);assert.deepEqual(network,[]);
  await fs.writeFile(path.join(output,'report.json'),JSON.stringify({status:'PASS',url,checks,captures,routes,errors,network,
    fixture:'4 isolated declared adult legacy saves restored at real room spawn; all table approaches physically walked. Court case declares pre-existing Elite/audience model prerequisites, not played achievements.',
    scope:'Actual compiled GameClient and native Homeworld; no production/user campaign modified; not a port-to-city story completion; sit/pour/sip sprite atlases and dedicated audio remain absent.',visualReview:'pending'},null,2));
  console.log(JSON.stringify({status:'PASS',checks:checks.length,captures:captures.length,output}));
}catch(error){
  if(page&&!page.isClosed())await page.screenshot({path:path.join(output,'failure.png')}).catch(()=>{});
  await fs.writeFile(path.join(output,'report.json'),JSON.stringify({status:'FAIL',url,error:error.stack,checks,captures,routes,errors,network},null,2));throw error;
}finally{await browser.close();}
