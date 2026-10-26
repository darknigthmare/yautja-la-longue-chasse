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
import {archiveContinuationRouteV111} from '../tests/helpers/archive-continuation-v111-route.mjs';
import {snapshotRuntimeV111} from './snapshot-runtime-v111.mjs';
import {createLegacyArrivalRecoveryV111} from '../tests/helpers/arrival-recovery-v111-route.mjs';

const baseUrl=process.env.YAUTJA_QA_BASE_URL??'http://127.0.0.1:3103';
const mode=['development','exploratory'].includes(process.env.YAUTJA_QA_MODE)?'development':'compiled-app';
const buildId=process.env.YAUTJA_QA_BUILD_ID??null,runtimeCommit=process.env.YAUTJA_QA_RUNTIME_COMMIT??null;
assert(['127.0.0.1','localhost'].includes(new URL(baseUrl).hostname),'Only a local app may receive QA fixtures');
if(mode==='compiled-app')assert(buildId&&/^[a-f0-9]{40}$/.test(runtimeCommit??''),'Compiled journeys require exact build and runtime commit identities');
const output=path.resolve(process.env.YAUTJA_HOMEWORLD_V111_OUTPUT??'outputs/qa-v111/homeworld-continuation');
await fs.mkdir(output,{recursive:true});
assert.equal((await fs.readdir(output)).length,0,'Use a fresh output directory; previous raw attempts must remain intact');
const journeys=mode==='development'&&process.env.YAUTJA_QA_JOURNEYS?process.env.YAUTJA_QA_JOURNEYS.split(','):['Continuation','Recovery','MobileGuide','LegacyA'];
assert(journeys.length&&new Set(journeys).size===journeys.length&&journeys.every(value=>['Continuation','Recovery','MobileGuide','LegacyA'].includes(value)));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const model=archivePlaqueRouteV109(),station=model.b;
const snapshot=async()=>(await snapshotRuntimeV111()).entries.map(({path:file,...pin})=>({file,...pin}));
const sourceBefore=await snapshot();
const bootstrap=await build({stdin:{contents:"import * as saves from './app/game/save';import * as slots from './app/game/systems/campaignSlots';import * as location from './app/game/systems/homeworldLocationV77';window.__continuationQaV111={...saves,...slots,...location};",resolveDir:process.cwd(),loader:'ts'},bundle:true,write:false,platform:'browser',format:'iife',target:'es2022',logLevel:'silent'});
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
  await page.exposeFunction('__recordWorkerFailureV111',error=>workerErrors.push({journey:kind,...error}));
  await context.addInitScript(()=>{
    const NativeWorker=window.Worker;
    // Passive diagnostics retain native construction, computation, dispatch,
    // errors and termination. No event is cancelled or result substituted.
    window.Worker=class extends NativeWorker {
      constructor(url,options){
        try{super(url,options);}catch(error){
          void window.__recordWorkerFailureV111({kind:'constructor',url:String(url),message:String(error),stack:error?.stack??null});
          throw error;
        }
        this.addEventListener('error',event=>{
          void window.__recordWorkerFailureV111({kind:'error-event',url:String(url),message:event.message,filename:event.filename,lineno:event.lineno,colno:event.colno});
        });
      }
    };
  });
  await page.clock.install();let pausedClock=false;
  const disk=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('yautja-long-hunt.save')??'null'));
  const actor=()=>page.locator('[data-homeworld-actor]').evaluate(element=>({x:Number(element.dataset.x),y:Number(element.dataset.y),level:element.dataset.homeworldLevelV77}));
  const baseLedger=async()=>(await disk()).homeworld.archivePlaqueV109;
  const continuation=async()=>(await disk()).homeworld.archiveContinuationV111;
  const receipt=async()=>{const s=await disk();return s.homeworld.archiveContinuationV111?.receipt?.study?.receipt??s.homeworld.archivePlaqueV109?.receipt;};
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
  async function postClick(name){const host=await scene.count()?scene:page.getByRole('dialog');await host.getByRole('button',{name,exact:true}).click();await tick();}
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
  async function closePost(){await postClick('Revenir au quai');}
  async function inspectNativeArchivistConversation(){
    const portrait=page.locator('[data-homeworld-archivist-portrait-v111]');
    await portrait.waitFor();
    const motion=portrait.locator('[data-homeworld-archivist-motion-v111]');
    await waitUntil(async()=>await motion.getAttribute('data-archivist-native-ready')==='true','all four native archivist sources admitted and decoded');
    const manifest=JSON.parse(await fs.readFile('app/game/data/homeworldArchivistMotionV111.json','utf8'));
    const decoded=await page.evaluate(async frames=>Promise.all(frames.map(async frame=>{const image=new Image();image.src=frame.src;await image.decode();return{id:frame.id,src:frame.src,width:image.naturalWidth,height:image.naturalHeight};})),manifest.frames);
    check('Archivist conversation decodes all four original native source PNGs',decoded.length===4&&decoded.every((frame,index)=>frame.width===manifest.frames[index].sourceWidth&&frame.height===manifest.frames[index].sourceHeight));
    const drawing=()=>portrait.locator('[data-homeworld-archivist-frame-v111]');
    const visible=async()=>drawing().evaluate((image,frames)=>{
      const frame=frames.find(frame=>frame.id===image.dataset.homeworldArchivistFrameV111),rect=image.getBoundingClientRect(),host=image.closest('[data-homeworld-archivist-portrait-v111]'),box=host.getBoundingClientRect();
      const point={x:rect.left+rect.width*(frame.alphaBounds.x+frame.alphaBounds.width/2)/frame.sourceWidth,y:rect.top+rect.height*(frame.alphaBounds.y+frame.alphaBounds.height*.35)/frame.sourceHeight};
      const top=document.elementFromPoint(point.x,point.y);
      return{frame:frame.id,elapsed:Number(image.dataset.homeworldArchivistElapsedV111),src:image.dataset.nativeSource,mirrored:image.dataset.nativeMirrorV111,point,rect:{left:rect.left,top:rect.top,width:rect.width,height:rect.height},portrait:{left:box.left,top:box.top,width:box.width,height:box.height},hit:top?.tagName??null,visible:rect.width>0&&rect.height>0&&point.x>=box.left&&point.x<=box.right&&point.y>=box.top&&point.y<=box.bottom&&point.x>=0&&point.x<=innerWidth&&point.y>=0&&point.y<=innerHeight&&!!top&&(host.contains(top)||top===host.closest('[role="dialog"]'))};
    },manifest.frames);
    const initial=await visible();observations.push({journey:kind,kind:'native-archivist-visible-source',...initial,decoded});
    check('Archivist portrait shows the actual native drawing inside the visible dialogue',initial.visible&&initial.mirrored==='false'&&manifest.frames.some(frame=>frame.src===initial.src));
    await page.emulateMedia({reducedMotion:'no-preference'});await tick(35);
    await waitUntil(async()=>await drawing().getAttribute('data-homeworld-archivist-frame-v111')==='explain','bounded native explanation pose');
    const explained=await visible();check('Archivist actual bounded clock selects a second distinct painted pose',explained.visible&&explained.frame==='explain'&&explained.elapsed>=220&&explained.elapsed<520);
    await capture('00-native-explanation-pose',portrait);
    await waitUntil(async()=>await drawing().getAttribute('data-homeworld-archivist-frame-v111')==='indicate','bounded native indication pose');
    const indicated=await visible();check('Archivist conversation reaches its independently drawn indication pose',indicated.visible&&indicated.src!==explained.src&&indicated.frame==='indicate');
    await capture('00-native-indication-pose',portrait);
    fixtures.push({journey:kind,description:'Synthetic window blur event delivered to the real page activity and native animation listeners; no React clock, pose or component state is set.'});
    await page.evaluate(()=>window.dispatchEvent(new Event('blur')));await tick();
    const paused=await drawing().getAttribute('data-homeworld-archivist-elapsed-v111');await tick(450);
    check('Archivist native conversation freezes its exact elapsed clock on inactivity',await motion.getAttribute('data-archivist-paused-v111')==='true'&&await drawing().getAttribute('data-homeworld-archivist-elapsed-v111')===paused);
    await page.emulateMedia({reducedMotion:'reduce'});await enter();await interact();
    const restored=page.locator('[data-homeworld-archivist-portrait-v111] [data-homeworld-archivist-motion-v111]');
    await waitUntil(async()=>await restored.getAttribute('data-archivist-native-ready')==='true','reloaded native conversation readiness');
    await tick(900);
    check('Archivist reduced-motion conversation remains on its actual listening drawing',await restored.getAttribute('data-archivist-reduced-motion-v111')==='true'&&await restored.locator('img').getAttribute('data-homeworld-archivist-frame-v111')==='listen');
  }
  async function startBase(option){
    await interact();if(kind==='Continuation')await inspectNativeArchivistConversation();await postClick(option==='A'?'Chercher une preuve située · A':'Conserver les deux traces séparées · B');
    await postClick('Écouter l’archiviste');await postClick('Recevoir l’accord pour les pièces K-17');await postClick('Commencer l’étude à pied');
  }
  async function place(id){
    await walk('archive-plaque-object-'+id+'-v109');
    await interact();await interact();await interact();
    check(kind+' '+id+' is observed, its provenance copied and physically picked up',(await receipt()).carrier===id&&(await receipt()).provenances.includes(id));
    await walk('archive-plaque-support-'+id+'-v109');await interact();
    check(kind+' '+id+' reaches its own separate surface by actual keyboard carry',(await receipt()).objects.find(object=>object.id===id).place==='support'&&(await receipt()).carrier===null);
  }
  async function finishBaseB(){
    await startBase('B');await place('plaque');await place('trace');
    await walk('archive-plaque-support-plaque-v109');await interact();
    check('B conclusion requires the two physically deposited traces',(await receipt()).phase==='return');
    await walk(station.npcId);await interact();await postClick('Rapporter les pièces et le constat');
    check('B actual report preserves the unexamined fragment and completed deferred receipt',(await receipt()).phase==='completed'&&(await receipt()).option==='B'&&(await receipt()).objects[2].place==='source'&&!(await receipt()).failureSpoken);
  }
  async function startContinuation(){
    await interact();
    const panel=page.locator('[data-homeworld-continuation-v111]');
    await panel.waitFor();
    for(const action of ['open','choose-a','reply']){
      await panel.locator(`[data-continuation-action-v111="${action}"]`).click();await tick();
    }
    if(kind==='Continuation'){
      const beforeConsent=JSON.stringify(await continuation()),originalB=JSON.stringify(await baseLedger());
      await quotaGuard(()=>panel.locator('[data-continuation-action-v111="authorize"]').click());
      check('Continuation refused consent preserves both its prior episode and immutable B',JSON.stringify(await continuation())===beforeConsent&&JSON.stringify(await baseLedger())===originalB);
      await closePost();
      await page.locator('[data-homeworld-continuation-journal-v111]').getByRole('button',{name:'Réessayer l’enregistrement de la continuation',exact:true}).click();await tick();
      await interact();await panel.waitFor();
      check('Continuation write recovery does not grant the refused consent automatically',(await continuation()).receipt.phase==='ready'&&!(await continuation()).receipt.ownerConsent);
    }
    await panel.locator('[data-continuation-action-v111="authorize"]').click();await tick();
    const beforeStart=await continuation();
    check(kind+' new approach is separately chosen and consented before any study starts',beforeStart?.receipt?.phase==='ready'&&beforeStart.receipt.ownerConsent&&beforeStart.receipt.study===null);
    await panel.locator('[data-continuation-action-v111="start"]').click();await tick();
    if(await scene.count())await closePost();
    check(kind+' continuation starts with the original two deposits and copied provenance',(await receipt()).phase==='working'&&(await receipt()).option==='A'&&(await receipt()).objects.slice(0,2).every(object=>object.place==='support')&&(await receipt()).provenances.includes('plaque')&&(await receipt()).provenances.includes('trace'));
  }
  async function finishA(){
    await walk('archive-plaque-support-plaque-v109');await interact();await interact();
    check(kind+' the missing edge and incompatible supports are actually observed',(await receipt()).edgeObserved&&(await receipt()).mismatchObserved);
    await walk(station.npcId);await interact();await postClick('Rapporter les appuis incompatibles');
    check(kind+' the actual incompatible comparison precedes its spoken failure',(await receipt()).failureSpoken);
    await postClick('Interrompre et garder les deux traces séparées');await interact();await postClick('Reprendre l’étude conservée');
    check(kind+' the new voluntary reprise preserves both distinct surfaces',(await receipt()).resumeSpoken&&(await receipt()).objects.slice(0,2).every(object=>object.place==='support'));
    await closePost();await place('fragment');await walk('archive-plaque-support-plaque-v109');await interact();
    check(kind+' the real fragment remains a separate compared candidate',(await receipt()).fragmentCompared&&(await receipt()).objects.every(object=>object.place==='support')&&!Object.hasOwn(await receipt(),'repaired'));
    await interact();await walk(station.npcId);await interact();await postClick('Rapporter les pièces et le constat');
    check(kind+' actual final report completes the study with no invented repair',(await receipt()).phase==='completed'&&(await receipt()).fragmentCompared&&!Object.hasOwn(await receipt(),'lineage'));
  }
  async function quotaGuard(action){
    const before=await disk(),position=await actor();
    await page.evaluate(()=>{
      window.__originalStorageSetV111=Storage.prototype.setItem;
      Storage.prototype.setItem=function(key,value){if(key==='yautja-long-hunt.save')throw new DOMException('Declared QA storage capacity refusal','QuotaExceededError');return window.__originalStorageSetV111.call(this,key,value);};
    });
    fixtures.push({journey:kind,description:'Declared QuotaExceededError fixture on the campaign save write only. It exercises the real durable writer and UI refusal; no React state, actor or operation action is substituted.'});
    try{await action();await tick();check(kind+' refused durable write changes neither save nor actor',JSON.stringify(await disk())===JSON.stringify(before)&&Math.hypot((await actor()).x-position.x,(await actor()).y-position.y)<.001);}
    finally{await page.evaluate(()=>{Storage.prototype.setItem=window.__originalStorageSetV111;delete window.__originalStorageSetV111;});await tick();}
  }

  try{
    const source=firstTracksCompleted();
    const prepared=kind==='Recovery'?createLegacyArrivalRecoveryV111(source.createdAt):kind==='MobileGuide'?archiveContinuationRouteV111(source.createdAt).state():null;
    const recoveryRoom=kind==='Recovery'?model.qa.load('app/game/systems/homeworldInteriorsV64.ts').homeworldInteriorForBuildingV64(prepared.building.id):null;
    const origin=kind==='Recovery'?recoveryRoom.spawn:station.post;
    await title();await page.addScriptTag({content:bootstrap.outputFiles[0].text});
    const fixture=await page.evaluate(async({source,origin,kind,prepared,interiorId})=>{
      const api=window.__continuationQaV111,currentDefaults=api.defaultSave(source.createdAt);
      const save=api.normalizeSave({...currentDefaults,...source,inventory:{...currentDefaults.inventory,...source.inventory,fieldToolIds:['flaying-tool']}});
      save.profile.hunterName='QA V111 · '+kind;save.settings.masterVolume=0;save.homeworld.visitedDistrictIds=['port'];
      const exterior=kind==='Recovery'?prepared.approach:origin;
      save.homeworld.locationV77=kind==='Recovery'?prepared.checkpoint:api.createHomeworldCheckpointV77(save.createdAt,'0',origin,interiorId,exterior);
      if(kind==='Recovery')save.homeworld.cargoV108=prepared.ledger;
      if(kind==='MobileGuide')save.homeworld.archivePlaqueV109=prepared.base;
      if(!api.parseSaveImport(JSON.stringify(save)).save)throw Error('Declared initial V111 campaign fixture rejected');
      localStorage.setItem(api.SAVE_STORAGE_KEY,JSON.stringify(save));
      const migrated=await api.migrateLegacyCampaignSlot();if(!migrated.ok)throw Error(migrated.message);
      const write=await api.saveCampaignCheckpoint(1,{kind:'manual',index:1,location:'homeworld',expectedRevision:api.loadCampaignSlots().slots[0].revision});if(!write.ok)throw Error(write.message);
      return{journey:kind,owner:save.createdAt,origin,exterior,initialInteriorId:interiorId,profile:save.profile,inventory:save.inventory,preOwnedFieldToolIds:[...save.inventory.fieldToolIds],trophies:save.trophies,initialPlaque:save.homeworld.archivePlaqueV109??null,initialCargo:save.homeworld.cargoV108??null};
    },{source,origin,kind,prepared,interiorId:recoveryRoom?.buildingId??null});
    fixtures.push({...fixture,description:(kind==='Recovery'?'Precondition: a real603-step cargo model prepares the narrow load on a doorway approach; an old authored-centre interior checkpoint is then explicitly seeded. This is a legacy recovery fixture, not a claim that these preparation steps were played in the browser.':kind==='MobileGuide'?'Precondition: the complete real V109 model plays B and conserves its two deposits and report. Only this prior B is seeded for the compact guide journey; continuation consent, route Worker and mobile controls are played in the browser.':'Only an empty known-port campaign checkpoint is seeded. Every observation, consent, copied provenance, carry, report and continuation below is actual UI play.')+' A flaying-tool is explicitly seeded as already owned using the current defaultSave; no tool purchase or reward is played or claimed.'});
    await enter();
    if(kind==='Continuation'){
      check('Continuation begins with no seeded study',!(await baseLedger())?.receipt&&!(await continuation())?.receipt);
      await finishBaseB();
      const completedDialog=page.getByRole('dialog'),firstRecord=completedDialog.locator('[data-homeworld-first-archive-record-v111]'),firstSummary=firstRecord.locator(':scope > summary');
      await completedDialog.focus();
      for(let attempt=0;attempt<24&&!await firstSummary.evaluate(element=>document.activeElement===element);attempt++){await page.keyboard.press('Tab');await tick(25);}
      check('Continuation dialogue keyboard focus reaches the conserved first record',await firstSummary.evaluate(element=>document.activeElement===element));
      await page.keyboard.press('Enter');await tick();
      check('Continuation conserved first record opens through actual keyboard input',await firstRecord.evaluate(element=>element.open));
      await capture('01-conserved-b-keyboard-record',completedDialog);
      await firstSummary.focus();await page.keyboard.press('Space');await tick();
      check('Continuation conserved first record closes without altering the completed B',!await firstRecord.evaluate(element=>element.open)&&(await baseLedger()).receipt.phase==='completed');
      await capture('01-completed-deferred-b',completedDialog);
      await closePost();await page.getByRole('button',{name:'Enregistrer la position',exact:true}).click();await tick();
      const baseJson=JSON.stringify(await baseLedger()),base=await baseLedger();await enter();
      check('B ordinary Continue preserves the complete deferred receipt byte-exact',JSON.stringify(await baseLedger())===baseJson);
      await startContinuation();
      check('Continuation keeps a byte-exact immutable B receipt and its existing physical deposits',(await continuation()).receipt.baseLedgerJson===baseJson&&JSON.stringify(await baseLedger())===baseJson&&JSON.stringify((await receipt()).objects)===JSON.stringify(base.receipt.objects));
      await capture('02-new-consented-continuation',page.locator('[data-homeworld-viewport]'));
      await page.getByRole('button',{name:'Pause',exact:true}).click();await tick();
      check('Continuation actual pause interrupts only the active study',(await receipt()).phase==='interrupted'&&JSON.stringify(await baseLedger())===baseJson);
      await page.getByRole('button',{name:'Reprendre',exact:true}).click();await tick();await resumeLocal();
      await page.getByRole('button',{name:'Enregistrer la position',exact:true}).click();await tick();const before=await continuation();await enter();
      const after=await continuation(),expectedInterrupted=structuredClone(before);
      // Ordinary Continue deliberately interrupts an active operation once.
      // Every consent, observation, physical piece and original B must survive.
      expectedInterrupted.revision++;expectedInterrupted.receipt.study.revision++;
      expectedInterrupted.receipt.study.receipt.resumePhase=before.receipt.study.receipt.phase;
      expectedInterrupted.receipt.study.receipt.phase='interrupted';expectedInterrupted.receipt.study.receipt.interruptedCount++;
      observations.push({journey:kind,kind:'ordinary-continue-interruption',before,after});
      check('Continuation ordinary Continue interrupts once and preserves every study field and original B',JSON.stringify(after)===JSON.stringify(expectedInterrupted)&&JSON.stringify(await baseLedger())===baseJson);
      await resumeLocal();await finishA();
      check('Completed continuation never rewrites the deferred B or duplicates its two deposits',JSON.stringify(await baseLedger())===baseJson&&(await continuation()).receipt.baseLedgerJson===baseJson&&JSON.stringify((await receipt()).objects.slice(0,2))===JSON.stringify(base.receipt.objects.slice(0,2)));
      const done=await disk();check('Continuation awards no profile, inventory or trophy reward',JSON.stringify(done.profile)===JSON.stringify(fixture.profile)&&JSON.stringify(done.inventory)===JSON.stringify(fixture.inventory)&&JSON.stringify(done.trophies)===JSON.stringify(fixture.trophies));
      await capture('03-completed-independent-a',page.getByRole('dialog'));await closePost();await enter();
      check('Completed continuation persists through ordinary Continue',(await receipt()).phase==='completed'&&JSON.stringify(await baseLedger())===baseJson);
    }else if(kind==='LegacyA'){
      await startBase('A');await place('plaque');await place('trace');await finishA();
      check('Legacy direct A stays independent of the new continuation field',!(await continuation())?.receipt&&(await baseLedger()).receipt.option==='A'&&(await baseLedger()).receipt.phase==='completed');
      await capture('01-direct-a-completed',page.getByRole('dialog'));await closePost();await enter();
      check('Legacy direct A still resumes its completed three distinct physical pieces',(await receipt()).phase==='completed'&&(await receipt()).objects.every(object=>object.place==='support'));
    }else if(kind==='MobileGuide'){
      const baseJson=JSON.stringify(await baseLedger());await startContinuation();
      await page.setViewportSize({width:390,height:844});await tick();
      const atlas=await openAtlas();
      // Opening the actual Atlas safely interrupts active field work. Read the
      // current objective after that transition, exactly as the UI does.
      const policy=model.qa.load('app/game/systems/homeworldObjectivesV111.ts').homeworldCurrentObjectiveV111(await disk());
      check('Mobile objective selects the current continuation rather than the completed B',policy?.destinationId?.startsWith('objective-continuation-'));
      await atlas.getByRole('button',{name:'Objectif actuel',exact:true}).click();await tick();
      check('Mobile real Atlas selects the continuation step',await atlas.locator(`[data-map-landmark-detail-v83="${policy.destinationId}"]`).count()===1);
      await atlas.getByRole('button',{name:'Suivre ce repère à pied',exact:true}).click();await waitUntil(async()=>await atlas.count()===0,'mobile continuation Worker result');await focus();await followGuide(policy.destinationId);
      const guide=page.locator(`[data-homeworld-route-guide-v111][data-homeworld-route-target-v98="${policy.destinationId}"]`);
      check('Mobile arrived guide is compact without obscuring the whole terrain',await guide.getAttribute('data-homeworld-guide-compact-v111')==='true'&&await guide.evaluate(element=>element.getBoundingClientRect().height<=120)&&await page.locator('[data-homeworld-viewport]').evaluate(element=>element.getBoundingClientRect().height>=100));
      const options=guide.locator('[data-homeworld-guide-options-v111]');
      check('Mobile guide keeps optional actions collapsed until requested',!await options.evaluate(element=>element.open));
      await capture('01-compact-arrived-guide',page.locator('[data-homeworld-hub]'));
      await options.locator('summary').focus();await page.keyboard.press('Enter');await tick();
      check('Mobile guide options are actually reachable with44px controls',await options.evaluate(element=>element.open)&&await options.locator('summary').evaluate(element=>element.getBoundingClientRect().height>=44)&&await options.getByRole('button').evaluateAll(buttons=>buttons.length>0&&buttons.every(button=>button.getBoundingClientRect().height>=44)));
      await capture('02-requested-route-options',page.locator('[data-homeworld-hub]'));
      const layout=await guide.evaluate(element=>{
        const box=target=>{const rect=target.getBoundingClientRect();return{left:rect.left,top:rect.top,right:rect.right,bottom:rect.bottom,width:rect.width,height:rect.height};};
        const disclosure=element.querySelector('[data-homeworld-guide-options-v111]'),panel=disclosure.querySelector(':scope > div'),style=getComputedStyle(element),disclosureStyle=getComputedStyle(disclosure),summary=disclosure.querySelector(':scope > summary');
        return{guide:box(element),viewport:box(element.closest('[data-homeworld-viewport]')),heading:box(element.querySelector(':scope > div')),summary:box(summary),clear:box(element.querySelector(':scope > button')),panel:box(panel),scrollport:box(disclosure),availableWidth:element.getBoundingClientRect().width-parseFloat(style.paddingLeft)-parseFloat(style.paddingRight)-parseFloat(style.borderLeftWidth)-parseFloat(style.borderRightWidth),scrollHeight:disclosure.scrollHeight,clientHeight:disclosure.clientHeight,computed:{display:style.display,gridTemplateRows:style.gridTemplateRows,alignItems:style.alignItems,disclosureAlignSelf:disclosureStyle.alignSelf,disclosureHeight:disclosureStyle.height,disclosureOverflowY:disclosureStyle.overflowY}};
      });
      observations.push({journey:kind,kind:'mobile-guide-expanded-layout',...layout});
      check('Mobile requested route panel spans the available width without overlapping its heading',Math.abs(layout.panel.width-layout.availableWidth)<=2&&layout.scrollport.top>=Math.max(layout.heading.bottom,layout.summary.bottom,layout.clear.bottom)-1&&layout.scrollport.bottom<=layout.guide.bottom&&layout.guide.top>=layout.viewport.top&&layout.guide.bottom<=layout.viewport.bottom);
      for(const [name,selector] of [['title',':scope > div > strong'],['instruction',':scope > div > p:first-of-type']]){
        const actual=await options.locator(selector).evaluate(element=>{const rect=element.getBoundingClientRect(),points=[{x:rect.left+2,y:rect.top+2},{x:rect.right-2,y:rect.top+2},{x:rect.left+2,y:rect.bottom-2},{x:rect.right-2,y:rect.bottom-2}];return{text:element.textContent,rect:{left:rect.left,top:rect.top,right:rect.right,bottom:rect.bottom},points:points.map(point=>{const hit=document.elementFromPoint(point.x,point.y);return{...point,hit:hit?.tagName??null,visible:point.x>=0&&point.x<=innerWidth&&point.y>=0&&point.y<=innerHeight&&!!hit&&(hit===element||element.contains(hit))};})};});
        observations.push({journey:kind,kind:'mobile-guide-open-'+name,...actual});
        check('Mobile opened route options show the complete '+name+' without viewport clipping',actual.points.every(point=>point.visible));
      }
      for(const name of ['Recalculer','Carte']){
        await page.keyboard.press('Tab');await tick();
        const button=options.getByRole('button',{name,exact:true});
        const actual=await button.evaluate(element=>{const rect=element.getBoundingClientRect(),point={x:rect.left+rect.width/2,y:rect.top+rect.height/2},hit=document.elementFromPoint(point.x,point.y);return{name:element.textContent,focused:document.activeElement===element,height:rect.height,point,visible:point.x>=0&&point.x<=innerWidth&&point.y>=0&&point.y<=innerHeight&&!!hit&&(hit===element||element.contains(hit))};});
        observations.push({journey:kind,kind:'mobile-guide-keyboard-action',...actual});
        check('Mobile '+name+' option receives real keyboard focus and has a visible44px hit target',actual.focused&&actual.visible&&actual.height>=44);
      }
      // The requested panel sits above its compact guide. Preserve the whole
      // hub so the screenshot includes the actually visible optional actions.
      await capture('03-keyboard-route-options',page.locator('[data-homeworld-hub]'));await options.locator('summary').focus();await page.keyboard.press('Space');await tick();
      check('Mobile guide native disclosure opens and closes through actual keyboard input',!await options.evaluate(element=>element.open)&&await options.locator('summary').evaluate(element=>document.activeElement===element));
      check('Mobile guide never resumes the interrupted study or mutates the original B',(await receipt()).phase==='interrupted'&&!(await receipt()).edgeObserved&&JSON.stringify(await baseLedger())===baseJson);
    }else{
      const panel=page.locator('[data-homeworld-recovery-v111]'),savedCargo=JSON.stringify((await disk()).homeworld.cargoV108);
      const pathToExit=model.qa.load('app/game/systems/homeworldWayfindingV75.ts').homeworldWayfindingInteriorRouteV75(recoveryRoom,await actor(),'exit');assert.equal(pathToExit.status,'reachable');await focus();for(const point of pathToExit.points.slice(1))await steer(point,12);
      await page.getByRole('button',{name:'Enregistrer la position',exact:true}).click();await tick();
      await interact();await panel.waitFor();
      const before=await disk(),checkpointJson=JSON.stringify(before.homeworld.locationV77),beforeActor=await actor();
      await panel.locator('[data-recovery-action-v111="prepare"]').click();await tick();
      check('Recovery preview does not move the actor or rewrite its durable checkpoint',JSON.stringify((await disk()).homeworld.locationV77)===checkpointJson&&Math.hypot((await actor()).x-beforeActor.x,(await actor()).y-beforeActor.y)<.001);
      await capture('01-explicit-recovery-preview',panel);
      await quotaGuard(()=>panel.locator('[data-recovery-action-v111="confirm"]').click());
      check('Recovery restored capacity retains the same checkpoint until explicit retry',JSON.stringify((await disk()).homeworld.locationV77)===checkpointJson&&await panel.locator('[data-recovery-action-v111="retry"]').isEnabled());
      await panel.locator('[data-recovery-action-v111="retry"]').click();await tick();
      const recovered=await disk(),where=await actor(),recovery=recovered.homeworld.arrivalRecoveryV111;
      check('Recovery explicit restoration returns to the genuinely preserved exterior point',recovered.homeworld.locationV77.interiorId===null&&where.level==='0'&&Math.hypot(where.x-before.homeworld.cargoV108.receipt.last.x,where.y-before.homeworld.cargoV108.receipt.last.y)<.01);
      check('Recovery never relocates the cargo, changes owners or credits new walking',JSON.stringify(recovered.homeworld.cargoV108)===savedCargo);
      const operations=model.qa.load('app/game/systems/homeworldArrivalRecoveryLedgerV111.ts').homeworldArrivalRecoveryLedgersV111;
      check('Recovery backs up every operation document byte-exact and preserves them all',recovery?.receipt?.originalLedgersJson===JSON.stringify(operations(before.homeworld))&&JSON.stringify(operations(recovered.homeworld))===JSON.stringify(operations(before.homeworld)));
      check('Recovery awards no profile, inventory or trophy reward',JSON.stringify(recovered.profile)===JSON.stringify(before.profile)&&JSON.stringify(recovered.inventory)===JSON.stringify(before.inventory)&&JSON.stringify(recovered.trophies)===JSON.stringify(before.trophies));
      check('Recovery keeps a durable backup of the original blocked checkpoint',!!recovery&&recovery.receipt?.originalCheckpointJson===checkpointJson);
      await capture('02-confirmed-exterior-restoration',page.locator('[data-homeworld-hub]'));
      const preserved=structuredClone(recovered.homeworld.locationV77);await enter();
      check('Recovery ordinary Continue retains the restored checkpoint and unchanged cargo',JSON.stringify((await disk()).homeworld.locationV77)===JSON.stringify(preserved)&&JSON.stringify((await disk()).homeworld.cargoV108)===savedCargo);
      const returned=await actor();await focus();await page.keyboard.down('ArrowRight');await tick(100);await page.keyboard.up('ArrowRight');await tick();
      check('Recovery restored exterior permits ordinary keyboard movement',Math.hypot((await actor()).x-returned.x,(await actor()).y-returned.y)>1);
    }
    const finalSave=await disk();
    check(kind+' durable Homeworld save preserves its explicitly pre-owned flaying tool',JSON.stringify(finalSave.inventory.fieldToolIds)==='["flaying-tool"]'&&JSON.stringify(finalSave.inventory.fieldToolIds)===JSON.stringify(fixture.preOwnedFieldToolIds));
    observations.push({journey:kind,kind:'final-durable-save',save:finalSave,actor:await actor()});
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
    scope:'Four actual local UI journeys: empty-checkpoint B then a separately consented A continuation with the original deferred receipt byte-exact; explicitly confirmed restoration from a declared old blocked interior checkpoint to its genuinely retained exterior point; real Worker routing and compact optional mobile guide controls; direct original A compatibility. Initial cargo/B model fixtures and injected write-capacity refusals are explicitly declared. Restoration is not simulated exit walking and credits no walk or cargo movement. The four native conversation drawings are verified only for this archivist, one facing and one bounded dialogue gesture, including inactivity and reduced-motion behavior; no manipulation animation, complete artistic target or canonical fidelity is claimed.',
    invocation:{command:'node scripts/qa-homeworld-continuation-v111.mjs',environment:{YAUTJA_QA_BASE_URL:baseUrl,YAUTJA_QA_MODE:mode,YAUTJA_QA_RUNTIME_COMMIT:runtimeCommit,YAUTJA_QA_BUILD_ID:buildId,YAUTJA_QA_JOURNEYS:journeys.join(','),YAUTJA_HOMEWORLD_V111_OUTPUT:output}},
    instrumentation:'Native Worker subclass adds passive constructor/ErrorEvent diagnostics only. Failed network requests and every browser console.error are retained without filtering; ordinary navigation aborts remain recorded without being claimed as application exceptions.',
    checks,captures,fixtures,observations,servedBuilds,errors,consoleErrors,workerErrors,requestsFailed,sourceBefore,sourceAfter,completedAt:new Date().toISOString()},null,2)+'\n');
  console.log(JSON.stringify({status,checks:checks.length,captures:captures.length,output}));
}
if(failure)process.exitCode=1;
