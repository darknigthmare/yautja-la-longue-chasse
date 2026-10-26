/** Real local application journeys. Initial campaign and cargo-model fixtures
 * are explicitly recorded; browser checks never count those as played input. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import {chromium} from 'playwright-core';
import {firstTracksCompleted} from '../tests/helpers/solo-v67-campaign-route.mjs';
import {archivePlaqueRouteV109} from '../tests/helpers/archive-plaque-v109-route.mjs';
import {createBlockedCouncilArrivalV110} from '../tests/helpers/cargo-council-v110-route.mjs';
import {createOccupiedDoorwayV110} from '../tests/helpers/cargo-doorway-v110-route.mjs';

const baseUrl=process.env.YAUTJA_QA_BASE_URL??'http://127.0.0.1:3103';
const mode=['development','exploratory'].includes(process.env.YAUTJA_QA_MODE)?'development':'compiled-app';
const buildId=process.env.YAUTJA_QA_BUILD_ID??null,runtimeCommit=process.env.YAUTJA_QA_RUNTIME_COMMIT??null;
assert(['127.0.0.1','localhost'].includes(new URL(baseUrl).hostname),'Only a local app may receive QA fixtures');
if(mode==='compiled-app')assert(buildId&&/^[a-f0-9]{40}$/.test(runtimeCommit??''),'Compiled journeys require exact build and runtime commit identities');
const output=path.resolve(process.env.YAUTJA_HOMEWORLD_V110_OUTPUT??'outputs/qa-v110/homeworld-coherence');
await fs.mkdir(output,{recursive:true});
assert.equal((await fs.readdir(output)).length,0,'Use a fresh output directory; previous raw attempts must remain intact');
const journeys=mode==='development'&&process.env.YAUTJA_QA_JOURNEYS?process.env.YAUTJA_QA_JOURNEYS.split(','):['K17','Residents','BlockedArrival','Doorway'];
assert(journeys.length&&new Set(journeys).size===journeys.length&&journeys.every(value=>['K17','Residents','BlockedArrival','Doorway'].includes(value)));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const model=archivePlaqueRouteV109(),station=model.b;
async function appSources(directory){
  const files=[];
  for(const entry of await fs.readdir(directory,{withFileTypes:true})){
    const file=path.join(directory,entry.name);
    if(entry.isDirectory())files.push(...await appSources(file));
    else if(/\.(?:ts|tsx|json|css)$/.test(file))files.push(file);
  }
  return files;
}
const fixedSourceFiles=['scripts/qa-homeworld-coherence-v110.mjs',
  'tests/helpers/solo-v67-campaign-route.mjs','tests/helpers/archive-plaque-v109-route.mjs',
  'tests/helpers/cargo-v108-route.mjs','tests/helpers/cargo-council-v110-route.mjs',
  'tests/helpers/cargo-doorway-v110-route.mjs',
  'tests/helpers/homeworld-scene-ssr-v78.mjs','package.json','package-lock.json','next.config.ts',
  'public/game/homeworld/v109/archive-plaque-atlas-v109.png'];
const snapshot=async()=>Promise.all([...await appSources('app'),...fixedSourceFiles].sort().map(async file=>{const bytes=await fs.readFile(file);return{file,sha256:sha(bytes),bytes:bytes.length};}));
const sourceBefore=await snapshot();
const bootstrap=await build({stdin:{contents:"import * as saves from './app/game/save';import * as slots from './app/game/systems/campaignSlots';import * as location from './app/game/systems/homeworldLocationV77';window.__coherenceQaV110={...saves,...slots,...location};",resolveDir:process.cwd(),loader:'ts'},bundle:true,write:false,platform:'browser',format:'iife',target:'es2022',logLevel:'silent'});
const checks=[],captures=[],errors=[],consoleErrors=[],workerErrors=[],requestsFailed=[],fixtures=[],observations=[],servedBuilds=[];
let failure=null;
const check=(name,ok,detail)=>{
  checks.push({name,status:ok?'PASS':'FAIL',...(detail===undefined?{}:{detail})});
  console.log(`${ok?'PASS':'FAIL'} ${name}`);assert.ok(ok,name);
};
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE_PATH??process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH??'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage','--mute-audio']});

async function journey(kind){
  const context=await browser.newContext({viewport:{width:1440,height:1050},reducedMotion:'reduce'});
  const page=await context.newPage();page.setDefaultTimeout(30000);
  page.on('pageerror',error=>errors.push({journey:kind,message:error.message,stack:error.stack??null,url:page.url()}));
  page.on('console',message=>{if(message.type()==='error')consoleErrors.push({journey:kind,text:message.text(),location:message.location(),url:page.url()});});
  page.on('requestfailed',request=>requestsFailed.push({journey:kind,url:request.url(),method:request.method(),resourceType:request.resourceType(),failure:request.failure()}));
  await page.exposeFunction('__recordWorkerFailureV110',error=>workerErrors.push({journey:kind,...error}));
  await context.addInitScript(()=>{
    const NativeWorker=window.Worker;
    // Passive diagnostics retain native construction, computation, dispatch,
    // errors and termination. No event is cancelled or result substituted.
    window.Worker=class extends NativeWorker {
      constructor(url,options){
        try{super(url,options);}catch(error){
          void window.__recordWorkerFailureV110({kind:'constructor',url:String(url),message:String(error),stack:error?.stack??null});
          throw error;
        }
        this.addEventListener('error',event=>{
          void window.__recordWorkerFailureV110({kind:'error-event',url:String(url),message:event.message,filename:event.filename,lineno:event.lineno,colno:event.colno});
        });
      }
    };
  });
  await page.clock.install();let pausedClock=false;
  const disk=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('yautja-long-hunt.save')??'null'));
  const actor=()=>page.locator('[data-homeworld-actor]').evaluate(element=>({x:Number(element.dataset.x),y:Number(element.dataset.y),level:element.dataset.homeworldLevelV77}));
  const receipt=async()=>(await disk()).homeworld.archivePlaqueV109?.receipt;
  const journal=page.locator('[data-homeworld-plaque-journal-v109]');
  const scene=page.locator('[data-homeworld-plaque-scene-v109]');
  async function tick(milliseconds=60){await page.clock.runFor(milliseconds);await new Promise(resolve=>setTimeout(resolve,2));}
  async function focus(){await page.locator('[data-homeworld-viewport]').focus();await tick(35);}
  async function title(){
    const response=await page.goto(baseUrl,{waitUntil:'domcontentloaded',timeout:120000});assert(response?.ok());
    const html=await response.text(),foundInHtml=!!buildId&&html.includes(buildId);
    servedBuilds.push({journey:kind,status:response.status(),expectedBuildId:buildId,foundInHtml,htmlSha256:sha(html),url:response.url()});
    if(mode==='compiled-app')assert(foundInHtml,'The served HTML must identify the requested compiled build');
    await page.locator('[data-campaign-menu="main"]').waitFor({timeout:120000});
  }
  async function enter(){
    if(pausedClock){await page.clock.resume();pausedClock=false;}
    await title();
    await waitUntil(async()=>!await page.getByRole('button',{name:/^Continuer/}).isDisabled(),'campaign menu refresh after fixture or ordinary Continue');
    await page.getByRole('button',{name:/^Continuer/}).click();
    await page.locator('[data-homeworld-hub][data-homeworld-motion-ready="true"]').waitFor({timeout:120000});
    await page.clock.pauseAt(await page.evaluate(()=>Date.now()+1000));pausedClock=true;
    await page.bringToFront();await focus();
  }
  async function capture(name,locator=page){
    await tick();const file=`${kind.toLowerCase()}-${name}.png`;
    await locator.screenshot({path:path.join(output,file)});const bytes=await fs.readFile(path.join(output,file));
    captures.push({file,sha256:sha(bytes),bytes:bytes.length});
  }
  async function interact(){await focus();await page.keyboard.press('KeyE');await tick();}
  async function postClick(name){await scene.getByRole('button',{name,exact:true}).click();await tick();}
  async function resumeLocal(){
    const r=await receipt();
    if(r?.phase==='interrupted'&&!(r.failureSpoken&&!r.resumeSpoken)){
      await journal.getByRole('button',{name:'Reprendre l’étude ici',exact:true}).click();await tick();
    }
  }
  async function waitUntil(test,label,limit=400){
    for(let attempt=0;attempt<limit;attempt++){if(await test())return;await tick(30);await new Promise(resolve=>setTimeout(resolve,12));}
    throw Error('Bounded UI wait failed: '+label);
  }
  async function openAtlas(){
    await page.locator('[data-world-atlas-button-v77]').click();await tick();
    return page.getByRole('dialog',{name:'Carte des étages de la cité',exact:true});
  }
  async function selectGuide(id){
    const atlas=await openAtlas();await atlas.getByRole('searchbox').fill('');await tick();
    await atlas.locator(`[data-map-landmark-v83="${id}"]`).click();await tick();
    await atlas.getByRole('button',{name:'Suivre ce repère à pied',exact:true}).click();
    await waitUntil(async()=>await atlas.count()===0,'actual Worker result for '+id);
    await resumeLocal();await focus();
  }
  async function steer(target,tolerance=12){
    let held=[],last=null,stalled=0;
    try{
      for(let attempt=0;attempt<2200;attempt++){
        const p=await actor(),dx=target.x-p.x,dy=target.y-p.y;
        if(Math.hypot(dx,dy)<=tolerance)return;
        stalled=last&&Math.hypot(p.x-last.x,p.y-last.y)<.05?stalled+1:0;last=p;
        if(stalled>100)throw Error('Actual keyboard walk stalled: '+JSON.stringify({target,p}));
        const wanted=[...(Math.abs(dx)>1?[dx>0?'ArrowRight':'ArrowLeft']:[]),...(Math.abs(dy)>1?[dy>0?'ArrowDown':'ArrowUp']:[])];
        for(const key of held)if(!wanted.includes(key))await page.keyboard.up(key);
        for(const key of wanted)if(!held.includes(key))await page.keyboard.down(key);
        held=wanted;await tick(10);
      }
      throw Error('Bounded actual keyboard walk timed out: '+JSON.stringify({target,actor:await actor()}));
    }finally{for(const key of held)await page.keyboard.up(key);await tick(45);}
  }
  async function nativeWalk(target){
    const start=await actor(),route=model.nav.homeworldWalkRouteV109('0',start,target);
    assert.equal(route.status,'reachable','The intended QA walking sockets must form a real native route');
    observations.push({journey:kind,kind:'offline-native-planned-keyboard-route',start,target,points:route.points,distance:route.distance,limit:'Planning supplies only steering targets. Every displacement is ordinary browser keyboard input.'});
    await focus();for(const point of route.points.slice(1))await steer(point,12);
  }
  async function followGuide(id){
    const guide=page.locator(`[data-homeworld-route-guide-v109][data-homeworld-route-target-v98="${id}"]`);
    let held=[],last=null,stalled=0;
    try{
      for(let attempt=0;attempt<2500;attempt++){
        const p=await actor();assert.equal(await guide.count(),1,'The actual visible guide must remain present');
        const state=await guide.evaluate(element=>({state:element.dataset.homeworldRouteGuideV109,current:element.dataset.homeworldRouteCurrentV109,x:Number(element.dataset.homeworldRouteNextXV109),y:Number(element.dataset.homeworldRouteNextYV109)}));
        if(state.state==='arrived')return;
        assert(state.current==='true'&&state.state!=='off-route','The displayed route must remain current: '+JSON.stringify({id,p,state}));
        if(!Number.isFinite(state.x)||!Number.isFinite(state.y)){await tick(60);continue;}
        stalled=last&&Math.hypot(p.x-last.x,p.y-last.y)<.05?stalled+1:0;last=p;
        if(stalled>100)throw Error('Actual guide walk stalled: '+JSON.stringify({id,p,state}));
        const dx=state.x-p.x,dy=state.y-p.y;
        const wanted=[...(Math.abs(dx)>1?[dx>0?'ArrowRight':'ArrowLeft']:[]),...(Math.abs(dy)>1?[dy>0?'ArrowDown':'ArrowUp']:[])];
        for(const key of held)if(!wanted.includes(key))await page.keyboard.up(key);
        for(const key of wanted)if(!held.includes(key))await page.keyboard.down(key);
        held=wanted;
        if(Math.hypot(dx,dy)<30){
          // The visible actor is rendered at30Hz. Release between final
          // keyboard pulses so a precise3u resume is not overshot while the
          // controller still reads the previous rendered position.
          await tick(17);for(const key of held)await page.keyboard.up(key);held=[];await tick(45);
        }else await tick(10);
      }
      throw Error('Bounded actual Worker-guided walk timed out: '+id);
    }finally{for(const key of held)await page.keyboard.up(key);await tick(45);}
  }
  async function walk(id){await selectGuide(id);await followGuide(id);}
  async function openRecord(){
    const detail=journal.locator('[data-plaque-record-journal-v110]');
    if(!await detail.evaluate(element=>element.open))await detail.locator('summary').click();
    await tick();return detail;
  }
  async function captureRecord(name){
    const detail=await openRecord();
    await capture(name+'-map',detail.locator('[data-plaque-map-v110]'));
    await capture(name+'-plaque-facts',detail.locator('[data-plaque-provenance-v110="plaque"]').locator('..'));
  }

  try{
    const source=firstTracksCompleted(),played=kind==='BlockedArrival'?createBlockedCouncilArrivalV110(source.createdAt):kind==='Doorway'?createOccupiedDoorwayV110(source.createdAt):null;
    const origin=kind==='K17'?station.post:kind==='Residents'?{x:6925,y:3474.5}:kind==='Doorway'?{x:played.actor.x,y:played.actor.y}:played.council.to.point;
    const level=kind==='BlockedArrival'?played.council.to.levelId:'0';
    await title();await page.addScriptTag({content:bootstrap.outputFiles[0].text});
    const fixture=await page.evaluate(async({source,origin,level,kind,cargo})=>{
      const api=window.__coherenceQaV110,save=api.normalizeSave(source);
      save.profile.hunterName='QA V110 · '+kind;save.settings.masterVolume=0;save.homeworld.visitedDistrictIds=['port'];
      save.homeworld.locationV77=api.createHomeworldCheckpointV77(save.createdAt,level,origin,null,origin);
      if(cargo)save.homeworld.cargoV108=cargo;
      if(!api.parseSaveImport(JSON.stringify(save)).save)throw Error('Declared initial campaign fixture rejected');
      localStorage.setItem(api.SAVE_STORAGE_KEY,JSON.stringify(save));
      const migrated=await api.migrateLegacyCampaignSlot();if(!migrated.ok)throw Error(migrated.message);
      const write=await api.saveCampaignCheckpoint(1,{kind:'manual',index:1,location:'homeworld',expectedRevision:api.loadCampaignSlots().slots[0].revision});
      if(!write.ok)throw Error(write.message);
      return{journey:kind,origin,level,owner:save.createdAt,profile:save.profile,inventory:save.inventory,trophies:save.trophies,initialCargo:cargo??null,seededSlotCatalog:api.loadCampaignSlots()};
    },{source,origin,level,kind,cargo:played?.ledger??null});
    fixtures.push({...fixture,description:kind==='BlockedArrival'?'Precondition: real cargo-model consent, pickup, 1418 native motor steps and park place the wide lot at the lower council landing. The campaign actor starts at the upper landing by declared checkpoint fixture; climbing there is not claimed as a browser action.':kind==='Doorway'?'Precondition: real cargo-model consent, wide-load placement in its compatible rack, narrow-load pickup, native walking, park and safe side approach use603 additional motor steps. The saved campaign starts at the resulting actual free point31.5u from residence-port-2 doorway. These exterior cargo steps are model fixture preparation, not browser play.':'Initial known port campaign checkpoint only. No K-17 action, conversation, carried object, delivered evidence or outcome is seeded.',...(played?{modelSteps:played.ticks,modelDistance:played.distance,modelParkedActor:played.actor}:{} )});
    await enter();

    if(kind==='K17'){
      check('K17 begins with no seeded plaque operation',!(await receipt()));
      await interact();await postClick('Chercher une preuve située · A');await postClick('Écouter l’archiviste');await postClick('Recevoir l’accord pour les pièces K-17');await postClick('Commencer l’étude à pied');
      check('K17 present archivist consent and source choice are actually played',(await receipt()).ownerConsent&&(await receipt()).option==='A');
      await walk('archive-plaque-object-plaque-v109');
      for(let action=0;action<3;action++)await interact();
      check('K17 actual observation, copied provenance and pickup precede carrying',(await receipt()).carrier==='plaque'&&(await receipt()).observations.includes('plaque')&&(await receipt()).provenances.includes('plaque'));
      let record=await openRecord();
      check('K17 carried record distinguishes observed discovery from current position',await record.locator('[data-plaque-provenance-v110="plaque"]').innerText().then(text=>text.includes('7760, 5260')&&text.includes('Emplacement actuel')&&text.includes('porté avec son relevé')));
      check('K17 unexamined candidate fragment is absent from record and map',await record.locator('[data-plaque-provenance-v110="fragment"]').count()===0&&await record.locator('[data-plaque-map-object-v109="fragment"]').count()===0);
      check('K17 open desktop record preserves an actual playable terrain viewport',await page.locator('[data-homeworld-viewport]').evaluate(element=>element.getBoundingClientRect().height>=180));
      const beforeOpenWalk=await actor();await focus();await page.keyboard.down('ArrowLeft');await tick(60);await page.keyboard.up('ArrowLeft');await tick();
      check('K17 actual keyboard walking remains possible while the record stays open',await record.evaluate(element=>element.open)&&Math.hypot((await actor()).x-beforeOpenWalk.x,(await actor()).y-beforeOpenWalk.y)>1);
      await captureRecord('01-carried-record');await capture('02-native-carried-plaque',page.locator('[data-homeworld-viewport]'));
      await page.getByRole('button',{name:'Pause',exact:true}).click();await tick();
      check('K17 actual pause keeps the carried piece and interrupts work',(await receipt()).phase==='interrupted'&&(await receipt()).carrier==='plaque');
      check('K17 paused resume action is disabled',await journal.getByRole('button',{name:'Reprendre l’étude ici',exact:true}).isDisabled());
      await page.getByRole('button',{name:'Reprendre',exact:true}).click();await tick();await resumeLocal();
      await page.getByRole('button',{name:'Enregistrer la position',exact:true}).click();await tick();
      const beforeReload=await receipt(),positionBeforeReload=await actor();await enter();
      check('K17 ordinary Continue restores the exact carried piece and local checkpoint',JSON.stringify((await receipt()).objects)===JSON.stringify(beforeReload.objects)&&Math.hypot((await actor()).x-positionBeforeReload.x,(await actor()).y-positionBeforeReload.y)<=1.5);
      await resumeLocal();await nativeWalk({x:7380,y:5350});
      await journal.getByRole('button',{name:'Interrompre et conserver les pièces',exact:true}).click();await tick();
      await journal.getByRole('button',{name:'Poser la pièce au sol ici',exact:true}).click();await tick();
      const parked=await receipt(),piece=parked.objects.find(object=>object.id==='plaque');
      check('K17 actual keyboard carry then park leaves a real piece outside the local map',piece.place==='ground'&&piece.x<7440&&parked.carrier===null);
      record=await openRecord();
      check('K17 map retains an outside marker and actual numerical placement',await record.locator('[data-plaque-map-object-v109="plaque"][data-plaque-map-outside-v110="true"]').count()===1&&(await record.locator('[data-plaque-record-position-v110="plaque"]').innerText()).includes(`${Math.round(piece.x)}, ${Math.round(piece.y)}`));
      check('K17 parked provenance retains the original observed discovery',(await record.locator('[data-plaque-provenance-v110="plaque"]').innerText()).includes('7760, 5260'));
      await captureRecord('03-outside-parked-record');
      await page.getByRole('button',{name:'Enregistrer la position',exact:true}).click();await tick();await enter();
      check('K17 ordinary Continue restores the parked piece without moving it',JSON.stringify((await receipt()).objects)===JSON.stringify(parked.objects)&&(await receipt()).phase==='interrupted');
      await nativeWalk(station.post);
      const atlas=await openAtlas();await atlas.getByRole('button',{name:'Objectif actuel',exact:true}).click();await tick();
      const destination='objective-plaque-resume-v110';
      check('K17 actual Atlas chooses the current interrupted study rather than the introduction',await atlas.locator('[data-homeworld-current-objective-v110="plaque"]').count()===1&&await atlas.locator(`[data-map-landmark-detail-v83="${destination}"]`).count()===1);
      await capture('04-operation-aware-atlas',atlas);
      await atlas.getByRole('button',{name:'Suivre ce repère à pied',exact:true}).click();await waitUntil(async()=>await atlas.count()===0,'V110 current-objective Worker');await focus();await followGuide(destination);
      const arrived=await actor();
      check('K17 actual current-objective Worker guide reaches the exact preserved point',Math.hypot(arrived.x-parked.last.x,arrived.y-parked.last.y)<=3);
      check('K17 route guidance never resumes or moves a piece by itself',(await receipt()).phase==='interrupted'&&JSON.stringify((await receipt()).objects)===JSON.stringify(parked.objects));
      await capture('05-preserved-point-arrival',page.locator('[data-homeworld-viewport]'));
      await resumeLocal();
      const oldGuide=page.locator(`[data-homeworld-route-target-v98="${destination}"]`);
      await waitUntil(async()=>await oldGuide.count()===0||await oldGuide.getAttribute('data-homeworld-route-current-v109')==='false','completed resume invalidates or removes its old objective route');
      const resumedReceipt=await receipt(),currentObjective=model.qa.load('app/game/systems/homeworldObjectivesV110.ts').homeworldCurrentObjectiveV110(await disk());
      observations.push({journey:kind,kind:'current-policy-read-after-actual-voluntary-resume',currentObjectiveId:currentObjective?.destinationId??null,oldGuideCount:await oldGuide.count(),receiptPhase:resumedReceipt.phase});
      check('K17 voluntary resume invalidates the old current-objective destination',resumedReceipt.phase==='working'&&currentObjective?.operation==='plaque'&&currentObjective.destinationId!==destination&&await page.locator(`[data-homeworld-route-target-v98="${destination}"][data-homeworld-route-current-v109="true"]`).count()===0);
      await interact();check('K17 the same parked piece is picked up with its original provenance',(await receipt()).carrier==='plaque'&&(await receipt()).provenances.includes('plaque'));
      await walk('archive-plaque-support-plaque-v109');await interact();
      check('K17 recovered original piece is physically deposited on its separate surface',(await receipt()).objects[0].place==='support'&&(await receipt()).carrier===null);
      await page.setViewportSize({width:390,height:844});await tick();record=await openRecord();
      check('K17 mobile record has no page overflow and an accessible disclosure',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)&&await record.locator('summary').evaluate(element=>element.getBoundingClientRect().height>=44));
      check('K17 open mobile record preserves a real terrain viewport',await page.locator('[data-homeworld-viewport]').evaluate(element=>element.getBoundingClientRect().height>=100));
      const beforeMobileWalk=await actor();await focus();await page.keyboard.down('ArrowLeft');await tick(60);await page.keyboard.up('ArrowLeft');await tick();
      check('K17 actual keyboard movement still works with the mobile record open',await record.evaluate(element=>element.open)&&Math.hypot((await actor()).x-beforeMobileWalk.x,(await actor()).y-beforeMobileWalk.y)>1);
      await captureRecord('06-mobile-recovered-record');await capture('07-mobile-terrain-and-record',page.locator('[data-homeworld-hub]'));
    }else if(kind==='Residents'){
      const id='resident-port-3';await interact();const conversation=page.locator(`[data-homeworld-conversation-v75="${id}"]`);
      check('Resident normal nearby interaction opens the actual visible Convoyeur',await conversation.count()===1);
      await conversation.getByRole('button',{name:'Les lieux proches',exact:true}).click();await tick();
      const advice=conversation.locator('[data-homeworld-resident-landmark="building:dock-control"]');
      check('Resident normal subject click shows only a known local public destination',await advice.count()===1&&await conversation.locator('[data-homeworld-resident-landmark]').count()===1);
      await capture('01-normal-known-place-advice',page.getByRole('dialog'));
      const beforeSuspension=JSON.stringify((await disk()).homeworld);
      // A declared input event fixture exercises the real blur handler while
      // retaining the modal. No React state, component callback or save is set.
      fixtures.push({journey:kind,description:'Synthetic window blur event only, delivered through the actual registered browser event listener. This verifies inactivity suspension, not an inaccessible pause-button pointer click behind a modal.'});
      await page.evaluate(()=>window.dispatchEvent(new Event('blur')));await tick();
      check('Resident inactivity suspension disables all subjects and retained advice',await conversation.getByRole('button').evaluateAll(buttons=>buttons.length===4&&buttons.every(button=>button.disabled)));
      await advice.evaluate(button=>button.click());await tick();
      check('Resident disabled advice cannot open Atlas or alter durable Homeworld progress',await page.getByRole('dialog',{name:'Carte des étages de la cité',exact:true}).count()===0&&JSON.stringify((await disk()).homeworld)===beforeSuspension);
      await capture('02-suspended-advice',page.getByRole('dialog'));
      await enter();await interact();const reopened=page.locator(`[data-homeworld-conversation-v75="${id}"]`);
      await reopened.getByRole('button',{name:'Les lieux proches',exact:true}).click();await tick();
      const beforeAdvice=await disk();
      await reopened.locator('[data-homeworld-resident-landmark="building:dock-control"]').click();await tick();
      const atlas=page.getByRole('dialog',{name:'Carte des étages de la cité',exact:true});await atlas.waitFor();
      check('Resident ordinary advice click opens the existing destination in the real Atlas',await atlas.locator('[data-map-landmark-detail-v83="building:dock-control"]').count()===1);
      const afterAdvice=await disk();
      check('Resident advice creates no discovery, permission, inventory, trophy or profile reward',JSON.stringify(afterAdvice.homeworld.visitedDistrictIds)===JSON.stringify(beforeAdvice.homeworld.visitedDistrictIds)&&JSON.stringify(afterAdvice.profile)===JSON.stringify(beforeAdvice.profile)&&JSON.stringify(afterAdvice.inventory)===JSON.stringify(beforeAdvice.inventory)&&JSON.stringify(afterAdvice.trophies)===JSON.stringify(beforeAdvice.trophies));
      await capture('03-advice-atlas',atlas);await atlas.getByRole('button',{name:'Fermer la carte',exact:true}).click();await tick();
      await nativeWalk({x:7500,y:3474.5});const far=await actor();await interact();
      check('Resident actual movement out of reach prevents reopening the old speaker',Math.hypot(far.x-6925,far.y-3434.5)>100&&await page.locator(`[data-homeworld-conversation-v75="${id}"]`).count()===0);
      await capture('04-out-of-reach-no-old-speaker',page.locator('[data-homeworld-viewport]'));
    }else if(kind==='BlockedArrival'){
      const before=await disk(),savedCargo=JSON.stringify(before.homeworld.cargoV108),start=await actor();
      check('Arrival precondition is the genuine model-played parked load and upper checkpoint',played.ticks===1418&&played.distance>7100&&start.level===played.council.to.levelId&&Math.hypot(start.x-played.council.to.point.x,start.y-played.council.to.point.y)<=1.5);
      await interact();
      check('Arrival actual interaction begins the authored council stair descent',await page.locator('[data-homeworld-hub][data-homeworld-transit-v77="council-stair"]').count()===1);
      await tick(3900);await capture('01-actual-descent',page.locator('[data-homeworld-viewport]'));
      await tick(5000);await waitUntil(async()=>await page.locator('[data-homeworld-hub][data-homeworld-transit-v77]').count()===0,'occupied final landing admission');
      const refused=await actor();
      check('Arrival blocked by a real load returns to the exact safe departure',refused.level===start.level&&Math.hypot(refused.x-start.x,refused.y-start.y)<=.01);
      const notification=page.locator('.toast[role="status"]');
      check('Arrival refusal is visibly announced to the player',await notification.isVisible()&&(await notification.innerText()).includes('Le palier est occupé par une charge'));
      check('Arrival refusal leaves both load owners and positions byte-exact',JSON.stringify((await disk()).homeworld.cargoV108)===savedCargo);
      await capture('02-refused-safe-upper-landing');
      await focus();await page.keyboard.down('ArrowRight');await tick(120);await page.keyboard.up('ArrowRight');await tick();
      const egress=await actor();check('Arrival retained departure permits real ordinary walking',egress.level===start.level&&Math.hypot(egress.x-refused.x,egress.y-refused.y)>1);
      observations.push({journey:kind,kind:'actual-ui-refused-arrival',start,refused,egress,cargoUnchanged:JSON.stringify((await disk()).homeworld.cargoV108)===savedCargo});
    }else{
      const before=await disk(),savedCargo=JSON.stringify(before.homeworld.cargoV108);
      const room=model.qa.load('app/game/systems/homeworldInteriorsV64.ts').homeworldInteriorForBuildingV64(played.building.id);
      assert(room);
      check('Doorway precondition uses the603-step real cargo placement and a supported side approach',played.ticks===603&&Math.abs(Math.hypot(played.actor.x-played.approach.x,played.actor.y-played.approach.y)-31.5)<.001&&Math.hypot((await actor()).x-played.actor.x,(await actor()).y-played.actor.y)<=1);
      await capture('01-real-free-side-entry',page.locator('[data-homeworld-viewport]'));
      await interact();
      await waitUntil(async()=>await page.locator(`[data-homeworld-hub][data-homeworld-interior-id="${played.building.id}"]`).count()===1,'actual domestic doorway entry');
      let checkpoint=(await disk()).homeworld.locationV77;
      check('Doorway actual entry retains the physically free exterior anchor instead of the occupied centre',checkpoint.interiorId===played.building.id&&Math.hypot(checkpoint.exterior.x-played.actor.x,checkpoint.exterior.y-played.actor.y)<1e-7&&Math.hypot(checkpoint.exterior.x-played.approach.x,checkpoint.exterior.y-played.approach.y)>31);
      check('Doorway entry leaves both real cargo owners and positions byte-exact',JSON.stringify((await disk()).homeworld.cargoV108)===savedCargo);
      await capture('02-entered-domestic-room',page.locator('[data-homeworld-viewport]'));
      await page.getByRole('button',{name:'Enregistrer la position',exact:true}).click();await tick();
      const preserved=structuredClone((await disk()).homeworld.locationV77);await enter();checkpoint=(await disk()).homeworld.locationV77;
      check('Doorway normal Continue restores the room and exact safe exterior anchor',checkpoint.interiorId===played.building.id&&JSON.stringify(checkpoint.exterior)===JSON.stringify(preserved.exterior)&&await page.locator(`[data-homeworld-hub][data-homeworld-interior-id="${played.building.id}"]`).count()===1);
      const interiorRoute=model.qa.load('app/game/systems/homeworldWayfindingV75.ts').homeworldWayfindingInteriorRouteV75(room,await actor(),'exit');
      assert.equal(interiorRoute.status,'reachable');await focus();for(const point of interiorRoute.points.slice(1))await steer(point,12);
      await interact();await waitUntil(async()=>await page.locator('[data-homeworld-hub][data-homeworld-interior-id]').count()===0,'actual doorway exit');
      checkpoint=(await disk()).homeworld.locationV77;
      check('Doorway actual walked exit returns to the exact preserved free anchor',checkpoint.interiorId===null&&JSON.stringify(checkpoint.exterior)===JSON.stringify(preserved.exterior));
      check('Doorway round trip never relocates a parked load or returns its ownership',JSON.stringify((await disk()).homeworld.cargoV108)===savedCargo);
      await capture('03-returned-to-safe-anchor',page.locator('[data-homeworld-viewport]'));
      const returned=await actor();await focus();await page.keyboard.down('ArrowDown');await tick(100);await page.keyboard.up('ArrowDown');await tick();
      check('Doorway returned exterior allows ordinary keyboard egress',Math.hypot((await actor()).x-returned.x,(await actor()).y-returned.y)>1);
      observations.push({journey:kind,kind:'actual-ui-interior-round-trip',preserved,returned,afterEgress:await actor(),cargoUnchanged:JSON.stringify((await disk()).homeworld.cargoV108)===savedCargo});
    }
    observations.push({journey:kind,kind:'final-durable-save',save:await disk(),actor:await actor()});
  }catch(error){
    observations.push({journey:kind,kind:'failure-visible-state',text:await page.locator('body').innerText().catch(()=>null),storage:await page.evaluate(()=>Object.fromEntries(Object.keys(localStorage).map(key=>[key,localStorage.getItem(key)]))).catch(()=>null)});
    await capture('failure').catch(()=>{});throw error;
  }finally{await context.close();}
}

try{
  for(const name of journeys)await journey(name);
  check('No uncaught browser exceptions',errors.length===0,errors);
  check('No unfiltered browser console errors',consoleErrors.length===0,consoleErrors);
  check('No native Worker construction or error events',workerErrors.length===0,workerErrors);
}catch(error){failure=error;checks.push({name:error.message,status:'FAIL'});console.error(error);}
finally{
  const sourceAfter=await snapshot();
  if(JSON.stringify(sourceBefore)!==JSON.stringify(sourceAfter)){
    failure??=Error('Executed sources changed during the browser journeys');checks.push({name:'Executed sources unchanged',status:'FAIL'});
  }else check('Executed sources unchanged',true);
  await browser.close();
  const status=failure?'FAIL':mode==='compiled-app'?'PASS':'PASS_EXPLORATORY';
  await fs.writeFile(path.join(output,'result.json'),JSON.stringify({status,mode,runtimeCommit,buildId,baseUrl,
    scope:'Actual local application: K-17 consent, observation, copied provenance, native keyboard carry/park outside map, pause, ordinary Continue, voluntary recovery and current-objective Atlas Worker route; an actual nearby resident subject/advice interaction plus declared blur input suspension and physical out-of-reach refusal; actual council-stair descent refused by a precondition load placed through the real offline cargo model; actual domestic doorway entry, save/Continue and walked exit retain the genuinely free side anchor beside another precondition parked load. No complete ROLE03 investigation, new body animation, cargo campaign completion or canon fidelity is certified.',
    invocation:{command:'node scripts/qa-homeworld-coherence-v110.mjs',environment:{YAUTJA_QA_BASE_URL:baseUrl,YAUTJA_QA_MODE:mode,YAUTJA_QA_RUNTIME_COMMIT:runtimeCommit,YAUTJA_QA_BUILD_ID:buildId,YAUTJA_QA_JOURNEYS:journeys.join(','),YAUTJA_HOMEWORLD_V110_OUTPUT:output}},
    instrumentation:'Native Worker subclass adds passive constructor/ErrorEvent diagnostics only. Failed network requests and every browser console.error are retained without filtering; ordinary navigation aborts are recorded without being claimed as application exceptions.',
    checks,captures,fixtures,observations,servedBuilds,errors,consoleErrors,workerErrors,requestsFailed,sourceBefore,sourceAfter,completedAt:new Date().toISOString()},null,2)+'\n');
  console.log(JSON.stringify({status,checks:checks.length,captures:captures.length,output}));
}
if(failure)process.exitCode=1;
