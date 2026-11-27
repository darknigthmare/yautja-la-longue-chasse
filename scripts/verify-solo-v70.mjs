import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium} from 'playwright-core';
import {homeworldQaModelV64} from './homeworld-qa-model-v64.mjs';
import {homeworldNavigatorV66} from './homeworld-navigation-browser-v66.mjs';
import {thresholdsCampaignRoute} from '../tests/helpers/solo-v69-played-route.mjs';
import {p} from '../tests/helpers/solo-v67-campaign-route.mjs';
import {templeCampaignRoute,templeInput,templeMechanismInput} from '../tests/helpers/solo-v70-played-route.mjs';
const mechanisms=process.env.V70_BELVEDERE_ROUTE==='mechanisms';
const reconnection=process.env.V70_QA_RECONNECTION==='1';
const focused=mechanisms||reconnection;

const url=process.env.V70_QA_URL??'http://127.0.0.1:4187',output=process.env.V70_SOLO_QA_OUTPUT??'work-local/v70/qa/solo-local';
const thresholdSave=thresholdsCampaignRoute().save;
const original=focused?templeCampaignRoute({origin:thresholdSave,stop:reconnection?'configuration':'belvedere'}).save:thresholdSave;
const key='yautja-long-hunt.save';
const fixture=new Map([[key,JSON.stringify(original)]]),store={getItem:k=>fixture.get(k)??null,setItem:(k,v)=>fixture.set(k,v),removeItem:k=>fixture.delete(k)};
const descriptor=Object.getOwnPropertyDescriptor(globalThis,'navigator');Object.defineProperty(globalThis,'navigator',{configurable:true,value:{locks:{request:async(_name,_options,cb)=>cb({})}}});
try{assert((await p.migrateLegacyCampaignSlot(store)).ok);const slot=JSON.parse(store.getItem(p.campaignSlotStorageKey(1)));assert((await p.saveCampaignCheckpoint(1,{kind:'auto',expectedRevision:slot.revision,location:'homeworld'},store)).ok);}finally{if(descriptor)Object.defineProperty(globalThis,'navigator',descriptor);else delete globalThis.navigator;}
await fs.mkdir(output,{recursive:true});const browser=await chromium.launch({channel:'chrome',headless:true}),page=await browser.newPage({viewport:{width:1280,height:800}});page.setDefaultTimeout(60000);
const errors=[],failures=[],checks=[],captures=[],keys=new Set();page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)failures.push({url:r.url(),status:r.status()});});
const canvas=page.locator('[data-solo-v70] canvas'),screen=page.locator('[data-solo-v70]'),saved=()=>page.evaluate(k=>JSON.parse(localStorage.getItem(k)),key);
const read=async()=>canvas.evaluate(e=>({...JSON.parse(e.dataset.soloState),paused:e.dataset.soloPaused==='true'}));
const capture=async name=>{const path=output+'/'+name+'.jpg';await page.screenshot({path,type:'jpeg',quality:88});captures.push(path);};
async function apply(desired){for(const k of keys)if(!desired.has(k)){await page.keyboard.up(k);keys.delete(k);}for(const k of desired)if(!keys.has(k)){await page.keyboard.down(k);keys.add(k);}}
const bindings=original.settings.controlBindings,action={left:bindings['pit.p1MoveLeft'][0],right:bindings['pit.p1MoveRight'][0],jump:bindings['pit.p1Jump'][0],command:bindings['pit.p1AttackMedium'][0],interact:bindings['pit.p1Resource'][0]};
async function waitAssets(){for(let n=0;n<80&&await canvas.getAttribute('data-solo-assets')!=='true';n++){await page.waitForTimeout(100);await page.clock.runFor(100);}assert.equal(await canvas.getAttribute('data-solo-assets'),'true');}
async function resumeFromMenu(destination){
 const menu=page.locator('[data-campaign-menu]');
 await menu.waitFor({timeout:120000});
 const campaign=page.locator('[data-menu-section="campaign"]');
 if(await campaign.isVisible())await campaign.click();
 await page.locator('[data-menu-action="continue"]').click();
 const play=page.getByRole('button',{name:'Jouer',exact:true});
 await play.or(destination).first().waitFor({timeout:120000});
 if(await play.isVisible())await play.click();
 await destination.waitFor({timeout:120000});
}
try{
 await page.goto(url,{waitUntil:'networkidle',timeout:120000});await page.evaluate(entries=>{if(localStorage.length)throw Error('Fresh isolated browser required');for(const[k,v]of entries)localStorage.setItem(k,v);},[...fixture]);await page.reload({waitUntil:'networkidle'});
 const hub=page.locator('[data-homeworld-hub]');
 await resumeFromMenu(focused?canvas:hub);
 await page.clock.install();await page.clock.pauseAt(await page.evaluate(()=>Date.now()+1000));await page.clock.runFor(200);
 if(!focused){
   const nav=homeworldNavigatorV66(page,homeworldQaModelV64());await nav.openPoint('training-service');await page.locator('[data-solo-v70-enter]').waitFor();await capture('01-physical-mentor-after-V69');await page.locator('[data-solo-v70-enter]').click();checks.push({name:'after-V69-model-fixture-only-physical-mentor-entry',routes:nav.routes});
 }
 await canvas.waitFor();await page.clock.runFor(200);await waitAssets();await canvas.focus();
 let previousPhase='',previousRoom=-1,quota=false,resumed=false,portrait=false,settings=false,expired=false,padChecked=false,energyChecked=false,i=0;
 for(;i<8000;i++){
  let s=await read();if(s.phase==='complete'||mechanisms&&s.room===5||reconnection&&s.room===7&&s.phase==='separation')break;
  if(s.phase!==previousPhase){await apply(new Set());await page.clock.runFor(80);previousPhase=s.phase;await capture('phase-'+s.phase);s=await read();}
  if(s.room!==previousRoom){previousRoom=s.room;await page.clock.runFor(100);await capture('room-'+s.configuration+'-'+s.room);}
  if(reconnection && s.phase === 'configuration' && s.room === 7 && s.scan >= 25 &&
      !checks.some(check => check.name === 'nef-physical-preview')) {
   assert.equal(await screen.getAttribute('data-temple-nef'), 'warning');
   assert.equal(s.configuration, 1);
   assert.match(await screen.locator('[data-temple-nef-countdown]').textContent(), /Passerelles dans 2 s/);
   await capture('nef-glyph-before-deployment');
   checks.push({name:'nef-physical-preview', scan:s.scan});
  }
  if(s.phase==='signs'&&s.room===2&&s.signs===0&&s.scan>=27&&!quota&&!s.paused){
   await page.evaluate(k=>{window.__templeSetItem=Storage.prototype.setItem;Storage.prototype.setItem=function(name,value){if(name===k)throw new DOMException('QA isolated quota','QuotaExceededError');return window.__templeSetItem.call(this,name,value);};},key);
   await page.clock.runFor(120);await screen.getByRole('alert').waitFor();const frozen=await read(),old=await saved();assert.equal(frozen.signs,1,'first sign reaches immediate physical checkpoint');assert.equal(old.soloV70.checkpoint.signs,0);await page.clock.runFor(1200);const after=await read();for(const k of ['tick','player','companions','scan','signs'])assert.deepEqual(after[k],frozen[k]);
   await capture('quota-first-sign-retained');
   const exportButton=page.getByRole('button',{name:'Exporter la progression confirmée',exact:true});await exportButton.waitFor();assert(await page.getByRole('button',{name:'Réessayer',exact:true}).isDisabled());assert.match(await page.locator('body').innerText(),/Cet export contient uniquement la dernière progression confirmée/);
   const downloadPromise=page.waitForEvent('download');await exportButton.click();const download=await downloadPromise,path=output+'/quota-confirmed-progression.json';await download.saveAs(path);const exported=p.parseSaveImport(await fs.readFile(path,'utf8'));assert(exported.save);assert.equal(exported.save.soloV70.checkpoint.signs,0);assert.equal((await read()).signs,1);checks.push({name:'quota-export-clearly-downloads-confirmed-checkpoint-only-pending-sign-retained',download:path,confirmedSigns:0,pendingSigns:1});
   await apply(new Set());await page.evaluate(()=>{Storage.prototype.setItem=window.__templeSetItem;});await screen.getByRole('button',{name:'Reprendre',exact:true}).click();await page.clock.runFor(100);assert.equal((await saved()).soloV70.checkpoint.signs,1);await canvas.focus();quota=true;checks.push({name:'first-platform-sign-checkpoint-quota-freeze-and-exact-retry',tick:frozen.tick,x:frozen.player.x,y:frozen.player.y});continue;
  }
  if(s.phase==='signs'&&s.signs===1&&!portrait&&!s.paused){
   await apply(new Set());await page.setViewportSize({width:393,height:852});await page.getByRole('button',{name:'Tactile',exact:true}).click();await page.clock.runFor(80);await capture('portrait-tribune-native-art-controls');const boxes=await screen.locator('button:visible').evaluateAll(nodes=>nodes.map(n=>{const b=n.getBoundingClientRect();return{label:n.textContent,x:b.x,y:b.y,right:b.right,bottom:b.bottom,height:b.height};}));assert(boxes.every(b=>b.x>=0&&b.y>=0&&b.right<=394&&b.bottom<=853&&b.height>=44));const before=await read(),b=await page.locator('[data-solo-action="left"]').boundingBox();assert(b);const cdp=await page.context().newCDPSession(page);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:b.x+b.width/2,y:b.y+b.height/2}]});await page.clock.runFor(200);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.clock.runFor(80);assert((await read()).player.x<before.player.x-5);await cdp.detach();await page.setViewportSize({width:1280,height:800});await canvas.focus();portrait=true;checks.push({name:'portrait-fullscreen-tribune-and-real-touch-movement',boxes});continue;
  }
  if(s.phase==='arsenal'&&s.room===3&&s.inputArmed&&!padChecked&&!s.paused){
   await apply(new Set());const before=await read();await page.evaluate(()=>{window.__templeGetPads=navigator.getGamepads.bind(navigator);navigator.getGamepads=()=>[{id:'QA standard pad',index:0,connected:true,mapping:'standard',timestamp:performance.now(),axes:[.8,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,touched:false,value:0}))}];});await page.clock.runFor(200);assert((await read()).player.x>before.player.x+5);await page.evaluate(()=>{navigator.getGamepads=window.__templeGetPads;});await page.clock.runFor(80);await screen.getByRole('button',{name:'Reprendre',exact:true}).click();await page.clock.runFor(80);await canvas.focus();padChecked=true;checks.push({name:'standard-gamepad-sampled-motion-and-disconnection-pause'});continue;
  }
  if(s.phase==='arsenal'&&s.room===3&&s.riteAdmission?.sealedEnergy&&!energyChecked){
   await apply(new Set());await page.clock.runFor(100);
   const observed=(await saved()).soloV70.checkpoint.riteAdmission.sealedEnergy;
   assert.deepEqual(observed,s.riteAdmission.sealedEnergy);
   assert.equal(await screen.getAttribute('data-temple-energy'),'sealed');
   await capture('arsenal-three-emitters-sealed');energyChecked=true;
   checks.push({name:'three-emitters-sealed-at-physical-rack',...observed});
  }
  if(mechanisms&&s.phase==='belvedere'&&s.room===4&&s.belvedereLever&&!checks.some(check=>check.name==='belvedere-counterweight-and-two-plates')){
   const savedLever=(await saved()).soloV70.checkpoint.belvedereLever;
   assert.deepEqual(savedLever,s.belvedereLever);
   assert.equal(s.companionMode,'follow');
   await capture('belvedere-lower-route-open');
   checks.push({name:'belvedere-counterweight-and-two-plates',...savedLever});
   await apply(new Set());await page.clock.resume();await page.reload({waitUntil:'networkidle'});
   await resumeFromMenu(canvas);
   await page.clock.pauseAt(await page.evaluate(()=>Date.now()+1000));await page.clock.runFor(100);
   await waitAssets();await canvas.focus();
   assert.deepEqual((await read()).belvedereLever,savedLever);
   checks.push({name:'belvedere-reloaded-after-counterweight'});
   continue;
  }
  if(s.phase==='counterweight'&&s.room===5&&s.liftTicks>=60&&!resumed&&!s.paused){
   await capture('counterweight-mid-lift-native-contact');await apply(new Set());await page.getByRole('button',{name:'Pause',exact:true}).click();await page.clock.runFor(100);const frozen=await read();assert(frozen.liftTicks>=60);assert(frozen.liftTicks<100);await page.clock.runFor(1000);assert.equal((await read()).tick,frozen.tick);await capture('counterweight-mid-lift-frozen');await screen.getByRole('button',{name:'Sauvegarder et quitter',exact:true}).click();await page.clock.runFor(100);assert.equal((await saved()).soloV70.checkpoint.liftTicks,frozen.liftTicks);
   await page.clock.resume();await page.reload({waitUntil:'networkidle'});await resumeFromMenu(canvas);await page.waitForFunction(()=>document.querySelector('[data-solo-v70] canvas')?.dataset.soloAssets==='true',null,{timeout:120000});await page.clock.pauseAt(await page.evaluate(()=>Date.now()+1000));await page.clock.runFor(100);const cold=await read();assert.equal(cold.phase,'counterweight');assert.equal(cold.room,5);assert(cold.liftTicks>=frozen.liftTicks);assert.equal((await saved()).soloV70.receipts.length,6);await canvas.focus();resumed=true;checks.push({name:'moving-counterweight-cold-resume-and-six-prior-receipts',lift:frozen.liftTicks});continue;
  }
  if(s.phase==='drone'&&s.room===8&&!settings&&!s.paused){
   await apply(new Set());await page.getByRole('button',{name:'Pause',exact:true}).click();await page.clock.runFor(80);await screen.getByRole('button',{name:'Réglages',exact:true}).click();await page.clock.runFor(120);const dialog=page.getByRole('dialog',{name:'Réglages du biomask'});await dialog.waitFor();const frozen=await read();await page.clock.runFor(1600);const after=await read();for(const k of ['tick','player','drone','acid','health','companions'])assert.deepEqual(after[k],frozen[k]);await capture('drone-settings-frozen');await dialog.getByRole('button',{name:'Fermer',exact:true}).click();await page.clock.runFor(80);await screen.getByRole('button',{name:'Reprendre',exact:true}).click();await page.clock.runFor(80);await canvas.focus();settings=true;checks.push({name:'settings-freeze-real-drone-hazards-and-physical-clock',tick:frozen.tick});continue;
  }
  if(s.phase==='drone'&&s.room===8&&s.drone.mode==='recover'&&!captures.some(x=>x.endsWith('drone-native-recovery.jpg')))await capture('drone-native-recovery');
  if(s.phase==='quarantine'&&s.valveTimer>0&&!expired&&!s.paused){await apply(new Set());await page.clock.runFor(10300);const after=await read();assert.equal(after.valveTimer,0);assert.equal(after.phase,'quarantine');assert.equal(after.drone.hp,0);assert.equal((await saved()).soloV70.receipts.length,11);await capture('local-quarantine-window-expired-corpse-kept');expired=true;checks.push({name:'local-valve-expiration-retry-preserves-drone-and-prior-receipts'});continue;}
  if(s.paused&&await screen.getByRole('alert').isVisible())throw Error('Unexpected durable refusal: '+await screen.getByRole('alert').innerText());
  if(s.paused||!s.inputArmed){await apply(new Set());await canvas.focus();await page.clock.runFor(100);continue;}
  const input=(mechanisms?templeMechanismInput:templeInput)({...s,previousJump:keys.has(action.jump),previousInteract:keys.has(action.interact),previousCommand:keys.has(action.command)}),desired=new Set();if(input.move)desired.add(input.move<0?action.left:action.right);if(input.jump)desired.add(action.jump);if(input.command)desired.add(action.command);if(input.interact)desired.add(action.interact);await apply(desired);await page.clock.runFor(s.phase==='signs'&&s.signs===0&&s.scan>=20?15:50);
 }
 if(reconnection){
   assert(i<8000,'the Nef reconnects through the real console');
   await apply(new Set());
   await page.clock.runFor(120);
   const next=await saved();
   assert.equal(next.soloV70.checkpoint.configuration,2);
   assert.equal(next.soloV70.receipts.at(-1).id,'second-configuration');
   assert.equal(await screen.getAttribute('data-temple-nef'),'deployed');
   await apply(new Set([action.right]));
   for(let step=0;step<70&&(await read()).player.x<393;step++) await page.clock.runFor(16);
   assert((await read()).player.x>=393 && (await read()).player.x<406);
   await apply(new Set([action.right,action.jump]));
   await page.clock.runFor(100);
   await apply(new Set([action.right]));
   for(let step=0;step<70&&(await read()).player.x<478;step++) await page.clock.runFor(16);
   await apply(new Set());
   await page.clock.runFor(480);
   const supported=await read();
   assert.equal(supported.player.y,367);
   await capture('nef-physical-support-after-deployment');
   await screen.getByRole('button',{name:'Pause',exact:true}).click();
   await page.clock.runFor(120);
   assert.equal((await saved()).soloV70.checkpoint.player.y,367);
   await page.clock.resume();
   await page.reload({waitUntil:'networkidle'});
   await resumeFromMenu(canvas);
   await page.clock.pauseAt(await page.evaluate(()=>Date.now()+1000));
   await page.clock.runFor(160);
   await waitAssets();
   assert.equal((await read()).player.y,367);
   assert.equal((await saved()).soloV70.checkpoint.configuration,2);
   assert.equal(await screen.getAttribute('data-temple-nef'),'deployed');
   assert.deepEqual((await saved()).prologue.chronicle, original.prologue.chronicle);
   assert(checks.some(check=>check.name==='nef-physical-preview'));
   assert.deepEqual(errors,[]);
   await capture('nef-support-retained-after-cold-reload');
   checks.push({name:'nef-support-retained-after-cold-reload', y:367});
   await fs.writeFile(output+'/report.json',JSON.stringify({status:'PASS',url,checks,captures,errors,failures},null,2));
   console.log(JSON.stringify({status:'PASS',checks:checks.length,captures:captures.length,output}));
 }else if(mechanisms){
   assert(i<8000,'actual Belvedere crossing completes');
   await apply(new Set());await page.clock.runFor(150);
   const result=await saved(),state=result.soloV70.checkpoint;
   assert.equal(state.room,5);assert.equal(state.lastDoor.from,4);
   assert.equal(result.soloV70.receipts.at(-1).id,'belvedere-serviced');
   assert.deepEqual(state.belvedereLever?.positions,checks.find(check=>check.name==='belvedere-counterweight-and-two-plates')?.positions);
   assert.equal(p.getChronicleRank(result.prologue.chronicle),'young-blood');
   assert(p.parseSaveImport(JSON.stringify(result)).save);
   await capture('belvedere-floor-portal-to-counterweight');
   assert.deepEqual(errors,[]);
   const report={status:'PASS',url,checks,captures,errors,failures,
     limits:'Started from the Belvedere checkpoint earned with the production reducers. Chrome played position changes, the companion signal, the hold, cold reload and the lower passage.'};
   await fs.writeFile(output+'/report.json',JSON.stringify(report,null,2));
   console.log(JSON.stringify({status:'PASS',checks:checks.length,captures:captures.length,output}));
 }else{
 assert(i<8000,'actual playable temple completes');await apply(new Set());await page.clock.runFor(200);await page.waitForFunction(k=>JSON.parse(localStorage.getItem(k))?.soloV70?.status==='completed',key);const complete=await saved();assert.equal(complete.soloV70.receipts.length,15);assert.equal(p.getChronicleRank(complete.prologue.chronicle),'young-blood');assert.equal(complete.soloV70.checkpoint.configuration,3);assert(complete.soloV70.checkpoint.visited.every(Boolean));assert.equal(complete.soloV70.checkpoint.drone.hp,0);assert(complete.soloV70.checkpoint.drone.hits>=5);assert(complete.soloV70.checkpoint.walked>=18000);
 const admission=complete.soloV70.checkpoint.riteAdmission;
 assert.equal(admission.threshold.configuration,2);
 assert.equal(admission.threshold.tick,complete.soloV70.checkpoint.milestones['quarantine-valves']);
 assert(admission.threshold.positions.slice(1).every(x=>Math.abs(x-admission.threshold.positions[0])<185));
 assert.equal(await screen.getAttribute('data-temple-threshold'),'triad-confirmed');
 checks.push({name:'three-hunters-confirmed-at-changing-threshold',...admission.threshold});
 for(const field of ['prologue','youthTraining','soloV66','soloV67','soloV68','soloV69','inventory','statistics','loadout'])assert.deepEqual(complete[field],original[field]);assert(p.parseSaveImport(JSON.stringify(complete)).save);await capture('temple-opening-complete-no-Blooded');await page.locator('[data-solo-return]').click();await page.clock.runFor(200);await page.locator('[data-homeworld-hub]').waitFor();await page.clock.resume();await page.reload({waitUntil:'networkidle'});await resumeFromMenu(hub);assert.equal((await saved()).soloV70.receipts.length,15);await page.waitForTimeout(700);await capture('durable-city-return');
 await hub.getByRole('button',{name:'Navigation',exact:true}).click();const welcome=hub.locator('[data-unblooded-welcome]');await welcome.waitFor();assert.match(await welcome.locator('h2').innerText(),/Young Blood.*Temple/);assert.match(await welcome.innerText(),/aucun.*rang Blooded|Blooded.*(reste|n.est pas)|restent.*Blooded/i);await capture('young-blood-temple-welcome-after-reload');checks.push({name:'15-receipts-nine-rooms-three-configurations-real-drone-and-durable-city-return-no-Blooded'});
 assert(quota&&resumed&&portrait&&settings&&expired&&padChecked&&energyChecked);assert.deepEqual(errors,[]);assert.deepEqual(failures,[]);const report={status:'PASS',url,checks,captures,errors,failures,limits:'Fresh isolated browser, initial after-V69 fixture played through prior models only. Entire V70 played with keyboard, real touch events and a declared mocked standard gamepad; no current-chapter actor coordinates, counters or receipts injected. One declared storage-quota injection. Native original temple architecture and existing authored six-pose drone/hunter art reused. Act I only: deeper rooms, queen, triad individual hunts, full purge and Blooded remain unimplemented. Audio hooks configured, but auditory quality is not judged from screenshots.'};await fs.writeFile(output+'/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify({status:'PASS',checks:checks.length,captures:captures.length,output}));
 }
}catch(error){await capture('failure').catch(()=>{});const lastPhysicalState=await canvas.evaluate(e=>({...e.dataset})).catch(()=>null),lastDurableState=await saved().then(s=>s.soloV70).catch(()=>null);await fs.writeFile(output+'/report.json',JSON.stringify({status:'FAIL',url,error:String(error),lastPhysicalState,lastDurableState,checks,captures,errors,failures},null,2));throw error;}finally{await browser.close();}
