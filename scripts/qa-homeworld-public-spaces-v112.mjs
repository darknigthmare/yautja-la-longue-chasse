/** Complete bounded V112 Homeworld recipe. Initial checkpoints are declared
 * fixtures; every subsequent displacement, route and interaction is real UI. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import {chromium} from 'playwright-core';
import {firstTracksCompleted} from '../tests/helpers/solo-v67-campaign-route.mjs';
import {createGeometryUpgradeFixtureV112} from '../tests/helpers/homeworld-geometry-upgrade-v112-route.mjs';
import {homeworldQaModelV64} from './homeworld-qa-model-v64.mjs';
import {snapshotRuntimeV112,V112_JOURNEYS} from './snapshot-runtime-v112.mjs';

const driver='scripts/qa-homeworld-public-spaces-v112.mjs';
const requiredJourneys=V112_JOURNEYS.Homeworld;
const mode=['development','exploratory'].includes(process.env.YAUTJA_QA_MODE)?'development':'compiled-app';
const baseUrl=process.env.YAUTJA_QA_BASE_URL??'http://127.0.0.1:3103';
assert(['127.0.0.1','localhost'].includes(new URL(baseUrl).hostname),'QA campaign fixtures are local only');
const buildId=process.env.YAUTJA_QA_BUILD_ID??null,runtimeCommit=process.env.YAUTJA_QA_RUNTIME_COMMIT??null;
if(mode==='compiled-app')assert(buildId&&/^[a-f0-9]{40}$/.test(runtimeCommit??''),'Compiled QA requires the exact build and runtime commit');
const journeys=process.env.YAUTJA_QA_JOURNEYS?.split(',')??requiredJourneys;
assert(journeys.length&&new Set(journeys).size===journeys.length&&journeys.every(name=>requiredJourneys.includes(name)));
if(mode==='compiled-app')assert.deepEqual(journeys,requiredJourneys,'Only the complete Homeworld recipe can certify a compiled app');
const upgradeCaseDefinitions=[{name:'checkpoint'},{name:'remote-last',remote:true},{name:'ground-piece',groundObject:true},{name:'checkpoint-mobile',width:390,height:844},{name:'cargo-ground-piece',cargo:true,groundObject:true}];
const upgradeCaseFilter=process.env.YAUTJA_QA_UPGRADE_CASES?.split(',')??null;
if(upgradeCaseFilter){assert.equal(mode,'development','Compiled publication forbids exploratory subcase filters');assert(upgradeCaseFilter.length&&new Set(upgradeCaseFilter).size===upgradeCaseFilter.length&&upgradeCaseFilter.every(name=>upgradeCaseDefinitions.some(row=>row.name===name)));}
const output=path.resolve(process.env.YAUTJA_HOMEWORLD_V112_OUTPUT??'outputs/qa-v112/homeworld-public-spaces');
await fs.mkdir(output,{recursive:true});assert.equal((await fs.readdir(output)).length,0,'Use a fresh output directory; preserve previous attempts');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const sourceBefore=(await snapshotRuntimeV112()).entries;
const api=homeworldQaModelV64(process.cwd(),[
 'homeworldPublicLifeV112.ts','homeworldPublicPlacesV112.ts','homeworldPublicPlacesMountV112.ts',
 'homeworldFoundationSupportsV112.ts','homeworldGroundJointsV112.ts','homeworldNaturalRockFacesV112.ts','homeworldNaturalPlacementsV112.ts','homeworldGeometryRecoveryV112.ts',
 'homeworldCivicWorldV80.ts','homeworldWorldV77.ts','homeworldGeometryV64.ts','homeworldInteriorsV64.ts','homeworldObjectivesV111.ts','homeworldWayfindingV75.ts','homeworldCargoV108.ts',
]);
const centroid=polygon=>({x:polygon.reduce((sum,p)=>sum+p.x,0)/polygon.length,y:polygon.reduce((sum,p)=>sum+p.y,0)/polygon.length});
const bootstrap=await build({stdin:{contents:"import * as saves from './app/game/save';import * as slots from './app/game/systems/campaignSlots';import * as location from './app/game/systems/homeworldLocationV77';import * as recovery from './app/game/systems/homeworldGeometryRecoveryV112';window.__publicSpacesQaV112={...saves,...slots,...location,...recovery};",resolveDir:process.cwd(),loader:'ts'},bundle:true,write:false,platform:'browser',format:'iife',target:'es2022',logLevel:'silent'});
const checks=[],captures=[],fixtures=[],observations=[],servedBuilds=[],errors=[],consoleErrors=[],workerErrors=[],requestsFailed=[],completedJourneys=[],completedCases={UpgradeRecovery:[]};
const check=(name,ok,detail)=>{checks.push({name,status:ok?'PASS':'FAIL',...(detail===undefined?{}:{detail})});console.log(`${ok?'PASS':'FAIL'} ${name}`);assert(ok,name);};
let failure=null;
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE_PATH??process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH??'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage','--mute-audio']});

async function scenario(name,{point,levelId='0',interiorId=null,width=1440,height=1050,reducedMotion='no-preference',legacyUpgrade=null},run){
 const context=await browser.newContext({viewport:{width,height},reducedMotion}),page=await context.newPage();page.setDefaultTimeout(30000);
 page.on('pageerror',error=>errors.push({scenario:name,message:error.message,stack:error.stack??null,url:page.url()}));
 page.on('console',message=>{if(message.type()==='error')consoleErrors.push({scenario:name,text:message.text(),location:message.location(),url:page.url()});});
 page.on('requestfailed',request=>requestsFailed.push({scenario:name,url:request.url(),resourceType:request.resourceType(),failure:request.failure()}));
 await page.exposeFunction('__recordPublicWorkerFailureV112',error=>workerErrors.push({scenario:name,...error}));
 await context.addInitScript(()=>{const NativeWorker=window.Worker;window.Worker=class extends NativeWorker{
  constructor(url,options){try{super(url,options);}catch(error){void window.__recordPublicWorkerFailureV112({kind:'constructor',url:String(url),message:String(error)});throw error;}
   this.addEventListener('error',event=>{void window.__recordPublicWorkerFailureV112({kind:'error-event',url:String(url),message:event.message,filename:event.filename,lineno:event.lineno,colno:event.colno});});}
 };});
 await page.clock.install();
 const tick=async(milliseconds=60)=>{await page.clock.runFor(milliseconds);await new Promise(resolve=>setTimeout(resolve,2));};
 const actor=()=>page.locator('[data-homeworld-actor]').evaluate(element=>({x:Number(element.dataset.x),y:Number(element.dataset.y),level:element.dataset.homeworldLevelV77}));
 const disk=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('yautja-long-hunt.save')??'null'));
 const focus=async()=>{await page.locator('[data-homeworld-viewport]').focus();await tick(35);};
 const waitUntil=async(test,label,limit=700)=>{for(let i=0;i<limit;i++){if(await test())return;await tick(30);await new Promise(resolve=>setTimeout(resolve,12));}throw Error('Bounded UI wait failed: '+label);};
 async function title(){const response=await page.goto(baseUrl,{waitUntil:'domcontentloaded',timeout:120000});assert(response?.ok());const html=await response.text(),foundInHtml=!!buildId&&html.includes(buildId);servedBuilds.push({scenario:name,status:response.status(),expectedBuildId:buildId,foundInHtml,htmlSha256:sha(html),url:response.url()});if(mode==='compiled-app')assert(foundInHtml,'Served HTML must identify the exact requested compiled build');await page.locator('[data-campaign-menu="main"]').waitFor({timeout:120000});}
 async function capture(label){await tick();check(name+' capture retains the actual Homeworld scene without a development build overlay',await page.locator('[data-homeworld-hub]').isVisible()&&!await page.getByText('Build Error',{exact:true}).isVisible());const file=`${name}-${label}.png`;await page.screenshot({path:path.join(output,file)});const bytes=await fs.readFile(path.join(output,file));captures.push({file,bytes:bytes.length,sha256:sha(bytes)});}
 async function steer(target,tolerance=6,limit=1800){let held=[],prior=null,stalled=0;try{
  await focus();for(let n=0;n<limit;n++){
   const p=await actor(),dx=target.x-p.x,dy=target.y-p.y;if(Math.hypot(dx,dy)<=tolerance)return p;
   stalled=prior&&Math.hypot(p.x-prior.x,p.y-prior.y)<.05?stalled+1:0;prior=p;if(stalled>100)throw Error('Actual keyboard walk stalled: '+JSON.stringify({name,target,p}));
   const wanted=[...(Math.abs(dx)>1?[dx>0?'ArrowRight':'ArrowLeft']:[]),...(Math.abs(dy)>1?[dy>0?'ArrowDown':'ArrowUp']:[])];
   for(const key of held)if(!wanted.includes(key))await page.keyboard.up(key);for(const key of wanted)if(!held.includes(key))await page.keyboard.down(key);held=wanted;
   if(Math.hypot(dx,dy)<30){await tick(17);for(const key of held)await page.keyboard.up(key);held=[];await tick(45);}else await tick(10);
  }throw Error('Bounded keyboard walk timed out: '+name);
 }finally{for(const key of held)await page.keyboard.up(key);await tick(45);}}
 async function selectGuide(id){await page.locator('[data-world-atlas-button-v77]').click();await tick();const atlas=page.getByRole('dialog',{name:'Carte des étages de la cité',exact:true});await atlas.getByRole('searchbox').fill('');await tick();await atlas.locator(`[data-map-landmark-v83="${id}"]`).click();await tick();await atlas.getByRole('button',{name:'Suivre ce repère à pied',exact:true}).click();await waitUntil(async()=>await atlas.count()===0,'actual Worker response for '+id);await focus();}
 async function followGuide(id){const guide=page.locator(`[data-homeworld-route-guide-v109][data-homeworld-route-target-v98="${id}"]`);let held=[],prior=null,stalled=0,walked=0,steps=0;try{
  for(;steps<2500;steps++){
   const p=await actor();if(prior)walked+=Math.hypot(p.x-prior.x,p.y-prior.y);assert.equal(await guide.count(),1);
   const state=await guide.evaluate(element=>({state:element.dataset.homeworldRouteGuideV109,current:element.dataset.homeworldRouteCurrentV109,x:Number(element.dataset.homeworldRouteNextXV109),y:Number(element.dataset.homeworldRouteNextYV109)}));
   if(state.state==='arrived')return{actor:p,walked,steps,state};assert(state.current==='true'&&state.state!=='off-route','Actual guide must remain current: '+JSON.stringify({id,p,state}));
   if(!Number.isFinite(state.x)||!Number.isFinite(state.y)){await tick(60);continue;}
   stalled=prior&&Math.hypot(p.x-prior.x,p.y-prior.y)<.05?stalled+1:0;prior=p;if(stalled>100)throw Error('Actual Worker-guided walk stalled: '+JSON.stringify({id,p,state}));
   const dx=state.x-p.x,dy=state.y-p.y,wanted=[...(Math.abs(dx)>1?[dx>0?'ArrowRight':'ArrowLeft']:[]),...(Math.abs(dy)>1?[dy>0?'ArrowDown':'ArrowUp']:[])];
   for(const key of held)if(!wanted.includes(key))await page.keyboard.up(key);for(const key of wanted)if(!held.includes(key))await page.keyboard.down(key);held=wanted;
   if(Math.hypot(dx,dy)<30){await tick(17);for(const key of held)await page.keyboard.up(key);held=[];await tick(45);}else await tick(10);
  }throw Error('Bounded actual guide walk timed out: '+id);
 }finally{for(const key of held)await page.keyboard.up(key);await tick(45);}}
 try{
  await title();await page.addScriptTag({content:bootstrap.outputFiles[0].text});
  const room=interiorId&&api.homeworldInteriorForBuildingV64(interiorId),building=interiorId&&api.HOMEWORLD_BUILDINGS_V77.find(b=>b.id===interiorId),exterior=building?api.homeworldBuildingDoorwayV64(building).approach:point;
  assert(!interiorId||room);
  if(legacyUpgrade){assert.equal(legacyUpgrade.oldFree,true);assert.equal(legacyUpgrade.currentBlocked,true);assert(legacyUpgrade.operation==='cargo'?legacyUpgrade.oldNativeWalkSteps===473:legacyUpgrade.oldNativeWalkSteps>500);assert(api.homeworldBeforePublicPlacesWalkableV112(legacyUpgrade.affected));assert(!api.homeworldCivicWalkableV80('0',legacyUpgrade.affected));}
  else assert(interiorId?api.isHomeworldInteriorWalkableV64(room,point):api.homeworldCivicWalkableV80(levelId,point),'Declared checkpoint must already support the real body: '+name);
  const fixture=await page.evaluate(async({source,origin,levelId,interiorId,exterior,name,legacyUpgrade})=>{
   const q=window.__publicSpacesQaV112,defaults=q.defaultSave(source.createdAt),save=q.normalizeSave({...defaults,...source,inventory:{...defaults.inventory,...source.inventory,fieldToolIds:['flaying-tool']}});
   save.profile.hunterName=('QA V112 · '+name).slice(0,32);save.settings.masterVolume=0;save.homeworld.visitedDistrictIds=['port','market','forges','memory','terraces','temple','enforcers','citadel','undercity'];
   if(legacyUpgrade){if(legacyUpgrade.owner!==save.createdAt)throw Error('Historical upgrade fixture owner differs from the actual campaign');Object.assign(save.homeworld,legacyUpgrade.ledgers);save.homeworld.locationV77=structuredClone(legacyUpgrade.checkpoint);}
   else save.homeworld.locationV77=q.createHomeworldCheckpointV77(save.createdAt,levelId,origin,interiorId,exterior);
   if(!q.parseSaveImport(JSON.stringify(save)).save)throw Error('Declared V112 campaign fixture rejected');
   localStorage.setItem(q.SAVE_STORAGE_KEY,JSON.stringify(save));const migrated=await q.migrateLegacyCampaignSlot();if(!migrated.ok)throw Error(migrated.message);
   const saved=await q.saveCampaignCheckpoint(1,{kind:'manual',index:1,location:'homeworld',expectedRevision:q.loadCampaignSlots().slots[0].revision});if(!saved.ok)throw Error(saved.message);
   return{scenario:name,owner:save.createdAt,origin,levelId,interiorId,exterior,profile:save.profile,inventory:save.inventory,trophies:save.trophies,checkpointJson:JSON.stringify(save.homeworld.locationV77),ledgersJson:JSON.stringify(q.homeworldGeometryRecoveryLedgersV112(save.homeworld))};
  },{source:firstTracksCompleted(),origin:point,levelId,interiorId,exterior,name,legacyUpgrade});
  fixtures.push({...fixture,...(legacyUpgrade?{historicalUpgrade:{sourceCommit:legacyUpgrade.sourceCommit,privateSourceManifestSha256:legacyUpgrade.privateSourceManifestSha256,oldNativeWalkSteps:legacyUpgrade.oldNativeWalkSteps,oldNativeWalkDistance:legacyUpgrade.oldNativeWalkDistance,oldOperationWalked:legacyUpgrade.oldOperationWalked,ledgerKey:legacyUpgrade.ledgerKey,operation:legacyUpgrade.operation,affected:legacyUpgrade.affected,remote:legacyUpgrade.remote,groundObject:legacyUpgrade.groundObject}}:{}),description:'Declared initial checkpoint and previously completed First Tracks model campaign; not browser travel or played completion. The existing flaying tool and known districts are explicit initial facts. A legacy upgrade fixture is genuinely played in the pinned V111 private app, including its original actor/owner and recorded operation; its old supported point is intentionally obstructed only by V112 furniture. All later input below is actual UI; no React state, route result or actor is replaced.'});
  await title();await waitUntil(async()=>!await page.getByRole('button',{name:/^Continuer/}).isDisabled(),'campaign menu refresh');await page.getByRole('button',{name:/^Continuer/}).click();
  await page.locator('[data-homeworld-hub][data-homeworld-motion-ready="true"]').waitFor({timeout:120000});await page.clock.pauseAt(await page.evaluate(()=>Date.now()+1000));await page.bringToFront();await focus();
  const actual=await actor(),expectedActor=legacyUpgrade&&!api.homeworldCivicWalkableV80('0',point)?legacyUpgrade.expectedFallbackActor:point;
  check(name+(legacyUpgrade?' preserves the legacy checkpoint while holding the actual safe actor pending consent':' restores its declared physical checkpoint'),actual.level===levelId&&Math.hypot(actual.x-expectedActor.x,actual.y-expectedActor.y)<=2,{fixture:point,expectedActor,actor:actual,interiorId});
  await run({page,context,tick,actor,disk,focus,capture,steer,selectGuide,followGuide,waitUntil,fixture});
  const final=await disk();check(name+' preserves the explicitly owned tool and adds no profile/inventory/trophy reward',JSON.stringify(final.inventory)===JSON.stringify(fixture.inventory)&&JSON.stringify(final.profile)===JSON.stringify(fixture.profile)&&JSON.stringify(final.trophies)===JSON.stringify(fixture.trophies));
 }catch(error){
  try{const file=`${name}-failed-state.png`;await page.screenshot({path:path.join(output,file)});const bytes=await fs.readFile(path.join(output,file));captures.push({file,bytes:bytes.length,sha256:sha(bytes)});}catch(captureError){observations.push({scenario:name,kind:'failure-capture-unavailable',message:captureError.message});}
  observations.push({scenario:name,kind:'failure-visible-state',body:await page.locator('body').innerText().catch(()=>null),storage:await page.evaluate(()=>Object.fromEntries(Object.keys(localStorage).map(key=>[key,localStorage.getItem(key)]))).catch(()=>null)});throw error;
 }
 finally{await context.close();}
}

async function publicLife(){
 check('PublicLife admits the seven declared circuits without manufactured terrain',api.HOMEWORLD_PUBLIC_LIFE_V112.length===7&&api.HOMEWORLD_PUBLIC_LIFE_REFUSALS_V112.length===0);
 for(const[index,inhabitant]of api.HOMEWORLD_PUBLIC_LIFE_V112.entries()){
  await scenario('life-'+inhabitant.id.split(':').at(-1),{point:inhabitant.path[0],levelId:inhabitant.levelId},async f=>{
   const npc=f.page.locator(`[data-homeworld-public-life-v112="${inhabitant.id}"]`);await npc.waitFor({state:'attached'});
   const read=()=>npc.evaluate(element=>{const source=element.querySelector('[data-native-source]');return{x:Number(element.dataset.x),y:Number(element.dataset.y),level:element.dataset.worldLevelV77,moving:element.dataset.moving,phase:element.dataset.routinePhaseV112,facing:element.dataset.nativeFacing,frame:source.dataset.nativeFrame,src:source.dataset.nativeSource,transform:getComputedStyle(source).transform,foot:element.getBoundingClientRect().toJSON(),body:source.getBoundingClientRect().toJSON(),controls:element.querySelectorAll('button,input,a').length};});
   let observed=await read();await f.page.evaluate(async src=>new Promise((resolve,reject)=>{const image=new Image();image.onload=resolve;image.onerror=()=>reject(Error('Native source failed: '+src));image.src=src;if(image.complete&&image.naturalWidth)resolve();}),observed.src);
   check(inhabitant.id+' paints a real native full body on its own floor',observed.level===inhabitant.levelId&&observed.transform==='none'&&observed.controls===0&&observed.body.height>90&&observed.body.bottom>observed.foot.y-4&&observed.body.top<observed.foot.y-80,observed);
   const start=await f.actor(),end=inhabitant.path.at(-1);await f.steer(end);const after=await f.actor();check(inhabitant.id+' public lane is physically traversed without a reset',Math.hypot(after.x-start.x,after.y-start.y)>170&&Math.hypot(after.x-end.x,after.y-end.y)<=7,{start,after});
   const observationPoint=[[100,0],[-100,0],[0,80],[0,-80]].map(([x,y])=>({x:end.x+x,y:end.y+y})).find(target=>Array.from({length:51},(_,i)=>({x:end.x+(target.x-end.x)*i/50,y:end.y+(target.y-end.y)*i/50})).every(p=>api.homeworldCivicWalkableV80(inhabitant.levelId,p)));
   assert(observationPoint,'A clear physical observation point is required beside '+inhabitant.id);await f.steer(observationPoint);
   if(index===0){
    await f.page.getByRole('button',{name:'Pause',exact:true}).click();await f.tick();const paused=await read();await f.tick(1700);check('PublicLife freezes exact pose and native frame during the real Pause UI',JSON.stringify(await read())===JSON.stringify(paused));await f.page.getByRole('button',{name:'Reprendre',exact:true}).click();await f.tick();
    const reducedBefore=await read();await f.page.emulateMedia({reducedMotion:'reduce'});await f.tick(40);observed=await read();check('PublicLife reduced motion holds native frame zero without moving to another circuit',observed.frame==='0'&&Math.hypot(observed.x-reducedBefore.x,observed.y-reducedBefore.y)<=4,{before:reducedBefore,after:observed});
   }
   await f.capture('native-grounded');observations.push({scenario:inhabitant.id,placement:await read()});
  });
 }
}

function placeStand(item){
 const polygon=api.homeworldPublicPlacePolygonV112(item),center=centroid(polygon),usage=api.homeworldPublicPlaceUsageV112(item);
 const candidates=[...(usage?[centroid(usage)]:[]),...[[0,130],[130,0],[-130,0],[0,-130],[90,90],[-90,90]].map(([x,y])=>({x:center.x+x,y:center.y+y}))];
 const stand=candidates.find(p=>api.homeworldCivicWalkableV80(item.levelId,p));assert(stand,'A native place requires a supported full-body stand: '+item.id);
 const dx=stand.x-center.x,dy=stand.y-center.y,length=Math.hypot(dx,dy),start={x:stand.x+dx/length*45,y:stand.y+dy/length*45};
 assert(api.homeworldCivicWalkableV80(item.levelId,start),'Native place approach must already be supported: '+item.id);
 return{polygon,center,usage,stand,start};
}
async function publicPlaces(){
 check('PublicPlaces retains six admitted and four refused exact native placements',api.HOMEWORLD_PUBLIC_PLACES_V112.length===6&&api.HOMEWORLD_PUBLIC_PLACE_REFUSALS_V112.length===4);
 for(const item of api.HOMEWORLD_PUBLIC_PLACES_V112){const prepared=placeStand(item),art=api.HOMEWORLD_PUBLIC_PLACE_ART_V112[item.artId];
  await scenario('place-'+item.id.split(':').at(-1),{point:prepared.start,levelId:item.levelId,reducedMotion:'reduce'},async f=>{
   const prop=f.page.locator(`[data-homeworld-prop-id="${item.id}"]`);await prop.waitFor({state:'attached'});
   const painted=await prop.evaluate(async element=>{const image=element.querySelector('img');await image.decode();return{artId:element.dataset.homeworldArtId,source:image.getAttribute('src'),left:parseFloat(element.style.left),top:parseFloat(element.style.top),width:parseFloat(element.style.width),height:parseFloat(element.style.height),transform:getComputedStyle(element).transform,loaded:image.complete&&image.naturalWidth>0};});
   const scale=art.heightWorld*item.scale/art.alphaBounds.height,foot=api.homeworldProjectGroundV64(item,api.homeworldLevelV77(item.levelId).elevation);
   // CSSOM serializes long absolute coordinates to about six significant
   // digits; this tolerance stays under one hundredth of a world unit.
   check(item.id+' renderer uses the unchanged native source, uniform scale and real ground pivot',painted.loaded&&painted.source===art.src&&painted.transform==='none'&&Math.abs(painted.width/art.sourceRect.width-painted.height/art.sourceRect.height)<1e-6&&Math.abs(painted.left+art.pivot.x*scale-foot.x)<.01&&Math.abs(painted.top+art.pivot.y*scale-foot.y)<.01,painted);
   const before=await f.actor();await f.steer(prepared.stand,4);const stand=await f.actor();check(item.id+' operator or observation face remains physically accessible',Math.hypot(stand.x-before.x,stand.y-before.y)>35&&api.homeworldCivicWalkableV80(item.levelId,stand),{before,stand,usage:prepared.usage});
   await f.focus();let blocked=null,prior=stand,stationary=0;
   let keys=[];
   try{for(let step=0;step<180;step++){const current=await f.actor(),dx=prepared.center.x-current.x,dy=prepared.center.y-current.y;
    const wanted=[...(Math.abs(dx)>1?[dx>0?'ArrowRight':'ArrowLeft']:[]),...(Math.abs(dy)>1?[dy>0?'ArrowDown':'ArrowUp']:[])];
    for(const key of keys)if(!wanted.includes(key))await f.page.keyboard.up(key);for(const key of wanted)if(!keys.includes(key))await f.page.keyboard.down(key);keys=wanted;
    await f.tick(35);const p=await f.actor();stationary=Math.hypot(p.x-prior.x,p.y-prior.y)<.5?stationary+1:0;prior=p;if(stationary>=8){blocked=p;break;}
   }}finally{for(const key of keys)await f.page.keyboard.up(key);await f.tick(45);}
   // The public coordinate labels round to world units. Once stopped, read the
   // actual rendered foot transform (no walking bob) before testing contact.
   const exact=await f.page.locator('[data-homeworld-actor]').evaluate(element=>{const match=element.style.transform.match(/translate\(([-\d.e]+)px,\s*([-\d.e]+)px\)/);return match&&element.dataset.moving==='false'?{x:Number(match[1]),projectedY:Number(match[2]),elevation:Number(element.dataset.homeworldElevationV77)}:null;});
   const p=exact?{x:exact.x,y:(exact.projectedY+exact.elevation)/api.HOMEWORLD_GEOMETRY_V64.depthScale}:blocked??await f.actor(),dx=prepared.center.x-p.x,dy=prepared.center.y-p.y,length=Math.hypot(dx,dy),probe={x:p.x+dx/length*4,y:p.y+dy/length*4};
   check(item.id+' real keyboard movement is stopped by the matching native solid',!!blocked&&api.homeworldCivicWalkableV80(item.levelId,p)&&api.homeworldPublicPlaceCollisionV112(item.levelId,probe)===item.id,{blocked,probe,collision:api.homeworldCivicCollisionV80(item.levelId,probe)});
   await f.capture('native-contact-and-clearance');
  });
 }
}

async function foundations(){
 const plinths=api.homeworldFoundationSupportsV112(api.HOMEWORLD_BUILDINGS_V77);check('Foundations exposes all six exact retained support revisions',plinths.length===6);
 for(const plinth of plinths){const building=api.HOMEWORLD_BUILDINGS_V77.find(b=>b.id===plinth.buildingId),point=api.homeworldBuildingDoorwayV64(building).approach;
  await scenario('foundation-'+plinth.buildingId,{point,levelId:plinth.levelId,reducedMotion:'reduce'},async f=>{
   const floor=f.page.locator(`[data-world-ground-id-v77="${plinth.id}"]`);await floor.waitFor({state:'attached'});const rendered=await floor.getAttribute('points'),expected=plinth.polygon.map(p=>`${p.x},${p.y*api.HOMEWORLD_GEOMETRY_V64.depthScale-api.homeworldLevelV77(plinth.levelId).elevation}`).join(' ');
   check(plinth.id+' paints the exact physical support polygon below its unchanged native facade',rendered===expected&&await f.page.locator(`[data-building-id="${building.id}"]`).count()===1,{rendered,expected});
   const facade=f.page.locator(`[data-building-id="${building.id}"]`),source=await facade.getAttribute('data-building-native-source');check(plinth.id+' preserves the original facade art',source===building.art.src,{source});
   if(building.id==='trophy-mausoleum'){
    const neighbor=f.page.locator('[data-world-ground-id-v77="coast-west:1"]'),paving=await neighbor.getAttribute('fill');
    for(const joint of api.HOMEWORLD_GROUND_JOINTS_V112){
     const node=f.page.locator(`[data-world-ground-id-v77="${joint.id}"]`),expected=joint.polygon.map(p=>`${p.x},${p.y*api.HOMEWORLD_GEOMETRY_V64.depthScale}`).join(' ');
     const actual=await node.evaluate((element,witness)=>({points:element.getAttribute('points'),fill:element.getAttribute('fill'),level:element.closest('[data-homeworld-level-ground-v77]')?.dataset.homeworldLevelGroundV77,
      witnessSupported:element.isPointInFill(new DOMPoint(witness.x,witness.y))}),{x:joint.witness.x,y:joint.witness.y*api.HOMEWORLD_GEOMETRY_V64.depthScale});
     check(joint.id+' paints the exact level0 joint with the adjacent native paving and covers its original void witness',actual.points===expected&&actual.fill===paving&&actual.level==='0'&&actual.witnessSupported,actual);
     const bodies=[{halfWidth:24,halfDepth:14},{halfWidth:36,halfDepth:26}];
     check(joint.id+' supports the native body and route clearance while keeping existing solids',bodies.every(body=>api.homeworldTerrainV77('0',joint.witness,body)),{witness:joint.witness,bodies,retainedCollision:api.homeworldCivicCollisionV80('0',joint.witness)});
    }
    const internal=['forecourt-v76:trophy-mausoleum:2:12','coast-west:0:2:2'];
    check('The two inherited mausoleum joint flanks are internal after the shared floor union and leave no visible wall fragment',(await Promise.all(internal.map(id=>f.page.locator(`[data-homeworld-exposed-ground-edge-v81="${id}"]`).count()))).every(count=>count===0),{removedInternalEdges:internal});
   }
   await f.capture('supported-facade');
  });
 }
 await scenario('natural-face-causeway',{point:{x:5500,y:5400},reducedMotion:'reduce'},async f=>{
  const faces=await f.page.locator('[data-natural-rock-face-v112]').evaluateAll(elements=>elements.map(e=>({id:e.dataset.naturalRockFaceV112,connected:e.dataset.naturalFaceConnectedV112,fill:e.getAttribute('fill')})));
  check('Natural rock faces retain connected strips with individual native face-local paint',faces.length>0&&faces.every(face=>face.connected==='true'&&face.fill.includes('natural-rock-')),{visibleFaceRecords:faces.length});
  const paints=await f.page.locator('[data-natural-face-paint-v112]').evaluateAll(elements=>elements.map(e=>({id:e.dataset.naturalFacePaintV112,transform:e.getAttribute('patternTransform'),rows:e.dataset.nativeVerticalRowsV112,image:e.querySelector('image')?.getAttribute('href')})));
  check('Natural rock face patterns anchor their one native vertical row to each actual strip',paints.length===faces.length&&paints.every(p=>p.rows==='1'&&p.transform?.startsWith('translate(')&&p.image),{patterns:paints.length});
  const underlays=await f.page.locator('[data-natural-rock-underlay-v112]').evaluateAll(elements=>elements.map(element=>({id:element.dataset.naturalRockUnderlayV112,points:element.getAttribute('points'),fill:element.getAttribute('fill'),opacity:getComputedStyle(element).opacity,face:element.parentElement.querySelector(`[data-natural-rock-face-v112="${CSS.escape(element.dataset.naturalRockUnderlayV112)}"]`)?.getAttribute('points')})));
  check('Every native rock face has an opaque matching basalt support behind transparent bitmap pixels',underlays.length===faces.length&&underlays.every(row=>row.points===row.face&&row.fill==='#1c1510'&&row.opacity==='1'),{underlays:underlays.length});
  const admissions=await f.page.locator('[data-homeworld-natural-admission-v112]').getAttribute('data-homeworld-natural-admission-v112'),formations=await f.page.locator('[data-homeworld-natural-formation-v112]').count();
  check('Natural render mounts only315 preserved roots in39 formations and keeps77 explicit pavement refusals',Number(admissions)===api.HOMEWORLD_NATURAL_MODULES_V112.length&&Number(admissions)===315&&formations===api.HOMEWORLD_NATURAL_SUPPORT_TERRACES_V112.length&&formations===39&&api.HOMEWORLD_NATURAL_PLACEMENT_REFUSALS_V112.length===77,{admissions,formations});
  const refused=api.HOMEWORLD_NATURAL_PLACEMENT_REFUSALS_V112.map(r=>r.id),visibleNatural=await f.page.locator('[data-homeworld-prop-id]').evaluateAll(elements=>elements.map(e=>e.dataset.homeworldPropId));
  check('Refused natural roots leave no painted ghost over the current public paving',refused.every(id=>!visibleNatural.includes(id))&&!visibleNatural.includes('landscape-v75-203')&&!visibleNatural.includes('landscape-v75-117'));
  const witnessed=await f.page.locator('[data-natural-rock-face-v112]').evaluateAll(elements=>{
   const paving=[...document.querySelectorAll('[data-world-ground-id-v77]')];
   const pavementAt=screen=>paving.filter(floor=>{const matrix=floor.getScreenCTM();return matrix&&floor.isPointInFill(screen.matrixTransform(matrix.inverse()));}).map(floor=>floor.dataset.worldGroundIdV77);
   return elements.flatMap(element=>{
    const matrix=element.getScreenCTM();if(!matrix)return[];const local=new DOMPoint(930,470).matrixTransform(matrix.inverse());if(!element.isPointInFill(local))return[];
    const a=element.points[0],b=element.points[1],top=a.y+(b.y-a.y)*(local.x-a.x)/(b.x-a.x),count=Math.max(1,Math.ceil((local.y-top)/2));
    const maskedAtWitness=pavementAt(new DOMPoint(930,470)),intervening=[];let nativeStripContinuous=top<=local.y;
    for(let i=0;i<=count;i++){const y=top+.0001+(local.y-top-.0001)*i/count,p=new DOMPoint(local.x,y);if(!element.isPointInFill(p))nativeStripContinuous=false;const masks=pavementAt(p.matrixTransform(matrix));if(masks.length)intervening.push({y,groundIds:masks});}
    return[{id:element.dataset.naturalRockFaceV112,local:{x:local.x,y:local.y},upperEdgeY:top,samples:count+1,maskedAtWitness,interveningPaving:intervening,nativeStripContinuous}];
   });
  });
  check('The old magma-tile witness has no visible natural face detached by intervening paving',witnessed.every(face=>face.maskedAtWitness.length>0||face.nativeStripContinuous&&face.interveningPaving.length===0),{screenPoint:{x:930,y:470},faces:witnessed});
  await f.capture('unmodified-connected-rock-faces');
 });
}

async function mobility(mobileOnly=false){
 const candidates=[
  {name:'officer-desktop',interiorId:'dock-control',point:{x:173,y:164},target:'point:dock-officer-point',heading:'Officier des quais',expectPremature:true},
  {name:'mausoleum-desktop',interiorId:'trophy-mausoleum',point:{x:269,y:236},target:'point:mausoleum-service',heading:'Mausolée des Grandes Chasses'},
  {name:'officer-mobile',interiorId:'dock-control',point:{x:173,y:164},target:'point:dock-officer-point',heading:'Officier des quais',expectPremature:true,width:390,height:844},
 ],cases=candidates.filter(item=>mobileOnly?item.width===390:item.width!==390);
 for(const item of cases)await scenario('mobility-'+item.name,item,async f=>{
  await f.selectGuide(item.target);const guide=f.page.locator(`[data-homeworld-route-guide-v109][data-homeworld-route-target-v98="${item.target}"]`);
  if(item.expectPremature)check(item.name+' refuses the former arrived halo before the real interlocutor is reachable',await guide.getAttribute('data-homeworld-route-guide-v109')==='walking'&&await f.page.locator('[data-homeworld-interior-target="point"]').count()===0);
  if(item.width===390){const box=await guide.boundingBox(),viewport=await f.page.locator('[data-homeworld-viewport]').boundingBox();check('Mobile route guide stays inside the real playable terrain',!!box&&!!viewport&&box.x>=viewport.x-1&&box.y>=viewport.y-1&&box.x+box.width<=viewport.x+viewport.width+1&&box.y+box.height<=viewport.y+viewport.height+1,{box,viewport});}
  const followed=await f.followGuide(item.target);check(item.name+' real Worker guide walks to the actual available interaction',followed.steps>0&&await f.page.locator('[data-homeworld-interior-target="point"]').count()===1,followed);
  await f.focus();await f.page.keyboard.press('KeyE');await f.tick();const dialog=f.page.getByRole('dialog');await dialog.waitFor();const text=await dialog.innerText();check(item.name+' real E input opens the requested service',text.includes(item.heading),{dialog:text});await f.capture('actual-service-dialog');
  await dialog.getByRole('button',{name:'Revenir dans la salle',exact:true}).click();await f.tick();check(item.name+' returns from the service through its actual visible dialog control',await f.page.getByRole('dialog').count()===0);
 });
 if(mobileOnly)return;
 await scenario('mobility-archive-arrival',{point:{x:7350,y:5335},reducedMotion:'reduce'},async f=>{
  await f.selectGuide('archive-steward-v106');const guide=f.page.locator('[data-homeworld-route-guide-v109][data-homeworld-route-target-v98="archive-steward-v106"]');
  check('Exterior archive guide refuses the old 75-unit arrival outside the real 74-unit post',await guide.getAttribute('data-homeworld-route-guide-v109')==='walking');
  const followed=await f.followGuide('archive-steward-v106');check('Exterior archive guide walks into the real consent post',followed.steps>0&&Math.hypot(followed.actor.x-7350,followed.actor.y-5260)<=74,followed);
  await f.focus();await f.page.keyboard.press('KeyE');await f.tick();const dialog=f.page.getByRole('dialog');await dialog.waitFor();const text=await dialog.innerText();check('Exterior archive actual E input reaches its situated study exchange',/archiv|étude|récit/i.test(text),{dialog:text});await f.capture('actual-archive-post');
  await dialog.getByRole('button',{name:'Revenir au quai',exact:true}).click();await f.tick();check('Exterior archive returns to the real quay without accepting an operation',await f.page.getByRole('dialog').count()===0);
 });
}

async function upgradeRecovery(){
 const owner=firstTracksCompleted().createdAt,prefix=api.HOMEWORLD_GEOMETRY_RECOVERY_PREFIX_V112;
 const cases=upgradeCaseFilter?upgradeCaseFilter.map(name=>upgradeCaseDefinitions.find(row=>row.name===name)):upgradeCaseDefinitions;
 for(const options of cases){
  const played=await createGeometryUpgradeFixtureV112(owner,options),ledgerKey=played.ledgerKey??'archivePlaqueV109',operation=played.operation??'plaque';
  await scenario('upgrade-'+options.name,{point:played.checkpoint.exterior,legacyUpgrade:played,reducedMotion:'reduce',...(options.width?{width:options.width,height:options.height}:{})},async f=>{
   const panel=f.page.locator('[data-homeworld-upgrade-recovery-v112]');await panel.waitFor();
   const storage=()=>f.page.evaluate(()=>localStorage.getItem('yautja-long-hunt.save'));
   const documents=async()=>{const s=await f.disk();return{checkpoint:JSON.stringify(s.homeworld.locationV77),ledgers:JSON.stringify(api.homeworldGeometryRecoveryLedgersV112(s.homeworld))};};
   const backupRows=()=>f.page.evaluate(prefix=>Object.keys(localStorage).filter(key=>key.startsWith(prefix)).map(key=>({key,bytes:localStorage.getItem(key)})),prefix);
   const originalSave=await storage(),original=await documents(),initialActor=await f.actor(),initialDisk=await f.disk();
   const exactInitialActor=api.homeworldCivicWalkableV80('0',played.checkpoint.exterior)?played.checkpoint.exterior:played.expectedFallbackActor;
   const inspected=api.planHomeworldGeometryRecoveryV112({ownerCreatedAt:owner,currentOwnerCreatedAt:owner,checkpoint:initialDisk.homeworld.locationV77,ledgers:api.homeworldGeometryRecoveryLedgersV112(initialDisk.homeworld),actor:exactInitialActor,levelId:'0',interiorId:null,active:true});
   check(options.name+' historical checkpoint and seven operation documents remain exact before any consent',original.checkpoint===f.fixture.checkpointJson&&original.ledgers===f.fixture.ledgersJson&&inspected.ok,{sourceCommit:played.sourceCommit,oldNativeWalkSteps:played.oldNativeWalkSteps,oldNativeWalkDistance:played.oldNativeWalkDistance});
   const plan=inspected.plan;assert(plan);check(options.name+' every proposed migration is local and has the correct actor authority',plan.movesActor===(!options.remote&&!options.groundObject)&&plan.migrations.every(m=>Math.hypot(m.to.x-m.from.x,m.to.y-m.from.y)<=96.000001),{movesActor:plan.movesActor,migrations:plan.migrations});
   await panel.locator('[data-upgrade-recovery-action-v112="prepare"]').click();await f.tick();
   check(options.name+' the real preview writes no checkpoint, operation document or backup',await storage()===originalSave&&(await backupRows()).length===0&&JSON.stringify(await f.actor())===JSON.stringify(initialActor));
   const preview=await panel.innerText();check(options.name+' preview explicitly distinguishes local restoration from walking and retained provenance',preview.includes(`${api.homeworldWayfindingMetresV75(96)} mètres`)&&preview.includes('ne comptera pas comme une marche')&&preview.includes('copiés exactement')&&preview.includes('provenances'),{preview});
   if(options.width===390){
    const controls=()=>panel.locator('[data-upgrade-recovery-action-v112]').evaluateAll(elements=>elements.map(element=>({action:element.dataset.upgradeRecoveryActionV112,rect:element.getBoundingClientRect().toJSON()})));
    let visibleControls=await controls();check('Mobile upgrade preview keeps confirmation and cancellation visible with44px targets',visibleControls.every(({rect})=>rect.x>=0&&rect.y>=0&&rect.x+rect.width<=options.width&&rect.y+rect.height<=options.height&&rect.height>=44),{controls:visibleControls});
    const details=panel.locator('details'),summary=details.locator('summary');await summary.focus();await f.page.keyboard.press('Enter');await f.tick();
    check('Mobile upgrade details open through their actual native keyboard control',await details.evaluate(element=>element.open));
    const expandedTerrain=await f.page.locator('[data-homeworld-viewport]').boundingBox();visibleControls=await controls();
    check('Expanded mobile restoration keeps100px of terrain and both44px actions visible',expandedTerrain?.height>=100&&visibleControls.every(({rect})=>rect.height>=44&&rect.x>=0&&rect.x+rect.width<=options.width&&rect.y>=0&&rect.y+rect.height<=options.height),{terrain:expandedTerrain,controls:visibleControls});
    const scrollBody=details.locator('..'),scroll=await scrollBody.evaluate(element=>({top:element.scrollTop,height:element.clientHeight,total:element.scrollHeight}));
    if(scroll.total>scroll.height+1){await scrollBody.hover();await f.page.mouse.wheel(0,260);await f.tick(100);check('Mobile restoration details scroll natively inside the bounded panel',await scrollBody.evaluate(element=>element.scrollTop)>scroll.top);}
    await summary.focus();await f.page.keyboard.press('Enter');await f.tick();check('Mobile upgrade details close by keyboard without changing saved work',!await details.evaluate(element=>element.open)&&await storage()===originalSave);
   }
   await f.capture('explicit-migration-preview');
   await panel.locator('[data-upgrade-recovery-action-v112="cancel"]').click();await f.tick();
   check(options.name+' cancellation keeps the exact original durable campaign and current actor',await storage()===originalSave&&JSON.stringify(await f.actor())===JSON.stringify(initialActor)&&(await backupRows()).length===0);
   await panel.locator('[data-upgrade-recovery-action-v112="prepare"]').click();await f.tick();
   if(options.name==='checkpoint'){
    async function refusedWrite(kind,action){
     fixtures.push({scenario:'upgrade-checkpoint',description:kind==='backup'?'Declared QuotaExceededError only on the versioned geometry-backup key. It exercises the native copy refusal; no gameplay state is patched.':'Declared QuotaExceededError only on the real campaign save key. The confirmed exact backup may exist, but no actor or operation is accepted until the actual durable writer acknowledges.'});
     await f.page.evaluate(({kind,prefix})=>{window.__originalUpgradeSetV112=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(kind==='backup'?key.startsWith(prefix):key==='yautja-long-hunt.save')throw new DOMException('Declared QA capacity refusal','QuotaExceededError');return window.__originalUpgradeSetV112.call(this,key,value);};},{kind,prefix});
     try{await panel.locator(`[data-upgrade-recovery-action-v112="${action}"]`).click();await f.tick();check('Upgrade '+kind+' write refusal accepts no actor movement or campaign mutation',await storage()===originalSave&&JSON.stringify(await f.actor())===JSON.stringify(initialActor));check('Upgrade '+kind+' refusal exposes the actual retry control',await panel.locator('[data-upgrade-recovery-action-v112="retry"]').isVisible());}
     finally{await f.page.evaluate(()=>{Storage.prototype.setItem=window.__originalUpgradeSetV112;delete window.__originalUpgradeSetV112;});}
    }
    await refusedWrite('backup','confirm');check('Refused backup leaves no invented successful copy',(await backupRows()).length===0);
    await refusedWrite('campaign','retry');
   }
   await panel.locator(options.name==='checkpoint'?'[data-upgrade-recovery-action-v112="retry"]':'[data-upgrade-recovery-action-v112="confirm"]').click();await f.tick();await f.waitUntil(async()=>await panel.count()===0,'actual accepted geometry migration');
   const migrated=await f.disk(),current=await documents(),rows=await backupRows(),backupRow=rows.find(row=>row.key===plan.backupKey);assert(backupRow,'The actual successful backup must remain retrievable');const backup=JSON.parse(backupRow.bytes);
   check(options.name+' actual backup preserves the exact original checkpoint and seven documents',backup.originalCheckpointJson===original.checkpoint&&backup.originalLedgersJson===original.ledgers&&backup.source==='new-local-geometry-position',{backupKey:backupRow.key,changedLedgerKeys:backup.changedLedgerKeys});
   check(options.name+' actual saved migration equals the bounded preview and grants no walking',current.checkpoint===JSON.stringify(plan.checkpoint)&&current.ledgers===JSON.stringify(plan.ledgers)&&migrated.homeworld[ledgerKey].receipt.walked===played.oldOperationWalked,{checkpoint:JSON.parse(current.checkpoint),migrations:backup.migrations,walked:migrated.homeworld[ledgerKey].receipt.walked});
   const movedActor=await f.actor(),expected=plan.movesActor?plan.checkpoint.exterior:initialActor;
   check(options.name+' character moves only for its own obstructed checkpoint',Math.hypot(movedActor.x-expected.x,movedActor.y-expected.y)<=2,{before:initialActor,after:movedActor,expected,movesActor:plan.movesActor});
   if(options.groundObject){const field=operation==='cargo'?'lots':'objects',oldReceipt=played.ledgers[ledgerKey].receipt,actualReceipt=migrated.homeworld[ledgerKey].receipt,oldObject=oldReceipt[field][0],actualObject=actualReceipt[field][0],objectMigration=plan.migrations.find(m=>m.kind==='ground-object');check(options.name+' migration retains the genuine parked object, its owner and provenance',!!objectMigration&&actualObject.place==='ground'&&JSON.stringify(actualObject)===JSON.stringify({...oldObject,x:objectMigration.to.x,y:objectMigration.to.y})&&JSON.stringify(actualReceipt.provenances)===JSON.stringify(oldReceipt.provenances)&&actualReceipt.ownerConsents===oldReceipt.ownerConsents,{before:oldObject,after:actualObject});}
   const exactCurrentActor=plan.movesActor?plan.checkpoint.exterior:exactInitialActor;
   check(options.name+' final joint actor and cargo geometry remains physically free',api.homeworldCivicWalkableV80('0',exactCurrentActor)&&!api.cargoCaseCollisionV108(migrated.homeworld.cargoV108,exactCurrentActor),{actor:exactCurrentActor,cargoCollision:api.cargoCaseCollisionV108(migrated.homeworld.cargoV108,exactCurrentActor)});
   await f.capture('accepted-local-migration');
   if(plan.movesActor||operation==='cargo'){const last=migrated.homeworld[ledgerKey].receipt.last;const away=[[16,0],[-16,0],[0,16],[0,-16]].map(([x,y])=>({x:last.x+x,y:last.y+y})).find(target=>Array.from({length:9},(_,i)=>({x:last.x+(target.x-last.x)*i/8,y:last.y+(target.y-last.y)*i/8})).every(p=>api.homeworldCivicWalkableV80('0',p)&&!api.cargoCaseCollisionV108(migrated.homeworld.cargoV108,p)));assert(away,'A real short departure must remain possible after migration');const before=await f.actor();await f.steer(away,4);check(options.name+' recovered actor can really leave with all final cargo solids active',Math.hypot((await f.actor()).x-before.x,(await f.actor()).y-before.y)>8);}
   const objective=api.homeworldCurrentObjectiveV111(migrated);assert(objective?.operation===operation&&objective.interrupted,'The real current objective must identify the interrupted operation');
   await f.selectGuide(objective.destinationId);const followed=await f.followGuide(objective.destinationId);check(options.name+' real Worker guide reaches the genuinely migrated operation reprise',followed.steps>=0&&Math.hypot(followed.actor.x-migrated.homeworld[ledgerKey].receipt.last.x,followed.actor.y-migrated.homeworld[ledgerKey].receipt.last.y)<=4.5,followed);
   const resume=f.page.locator(operation==='cargo'?'[data-cargo-journal-v108]':'[data-homeworld-plaque-journal-v109]').getByRole('button',{name:operation==='cargo'?'Reprendre la manutention ici':'Reprendre l’étude ici',exact:true});await resume.click();await f.tick();const resumed=await f.disk();check(options.name+' player voluntarily resumes the real operation without invented walk or reward',resumed.homeworld[ledgerKey].receipt.phase==='working'&&resumed.homeworld[ledgerKey].receipt.walked===played.oldOperationWalked);
   await f.capture(operation==='cargo'?'voluntary-cargo-reprise':'voluntary-study-reprise');
  });completedCases.UpgradeRecovery.push(options.name);
 }
}

try{
 for(const name of journeys){await({PublicLife:publicLife,PublicPlaces:publicPlaces,Foundations:foundations,InteriorArrival:()=>mobility(),Mobile:()=>mobility(true),UpgradeRecovery:upgradeRecovery})[name]();if(name!=='UpgradeRecovery'||completedCases.UpgradeRecovery.length===upgradeCaseDefinitions.length)completedJourneys.push(name);}
 check('No uncaught browser exception',errors.length===0,errors);check('No console.error record',consoleErrors.length===0,consoleErrors);check('No native Worker construction or event error',workerErrors.length===0,workerErrors);check('No failed network request',requestsFailed.length===0,requestsFailed);
}catch(error){failure={message:error.message,stack:error.stack};console.error(error);}
finally{
 await browser.close();let sourceAfter=[],sourceSnapshotFailure=null;
 try{sourceAfter=(await snapshotRuntimeV112()).entries;}catch(error){sourceSnapshotFailure={message:error.message,stack:error.stack};failure??={message:'Final executed-source inventory check failed',cause:sourceSnapshotFailure};}
 if(JSON.stringify(sourceAfter)!==JSON.stringify(sourceBefore)){failure??={message:'Executed sources changed during the complete recipe'};checks.push({name:'Every frozen source remains byte-identical during the executed recipe',status:'FAIL'});}else checks.push({name:'Every frozen source remains byte-identical during the executed recipe',status:'PASS'});
 const completeRecipe=!upgradeCaseFilter&&JSON.stringify(completedJourneys)===JSON.stringify(requiredJourneys),status=failure?'FAIL':mode==='compiled-app'?'PASS':'PASS_EXPLORATORY';
 const environment={YAUTJA_QA_MODE:mode,YAUTJA_QA_BASE_URL:baseUrl,YAUTJA_QA_BUILD_ID:buildId,YAUTJA_QA_RUNTIME_COMMIT:runtimeCommit,YAUTJA_QA_JOURNEYS:journeys.join(','),YAUTJA_HOMEWORLD_V112_OUTPUT:output,...(upgradeCaseFilter?{YAUTJA_QA_UPGRADE_CASES:upgradeCaseFilter.join(',')}:{})};
 const raw={schemaVersion:1,release:'V112',domain:'Homeworld',status,completeRecipe,completedJourneys,completedCases,production:{mode,runtimeCommit,buildId,checksPassed:checks.filter(c=>c.status==='PASS').length,checksFailed:checks.filter(c=>c.status==='FAIL').length,browserErrors:errors.length,servedBuilds},
  scope:{resumedFrom:null,description:'Complete bounded Homeworld V112 public-space recipe: seven short native citizen circuits and real lane walking, pause/reduced motion; six original native furniture contacts and operator approaches with real collision; six retained-facade supports plus connected opaque natural rock face rendering; actual native Worker guidance and E interactions for officer, mausoleum and archive, including390px mobile; explicitly confirmed local upgrade recovery for an occupied old checkpoint, a remote interrupted last point, a genuinely parked plaque and a genuinely parked cargo lot. Exact backups, write refusals, final joint actor/cargo clearance, real departure and voluntary operation reprises are verified, with mobile keyboard/scroll/accessibility checks for the restoration preview. Each scenario starts from an explicitly declared campaign checkpoint; no travel between seeded scenarios or completion of all inherited Homeworld requirements is claimed. Geometry, native render records and unmodified captures are checked; every capture must be opened independently before compiled publication.',initialFixtures:'Previously completed First Tracks model campaign, known districts and a pre-owned flaying tool are seeded. Upgrade fixtures are genuinely played in the pinned V111 private app; their previously supported points intentionally conflict with the new V112 furniture. No React state, actor, Worker result, input handler, collision function or operation result is patched. Declared storage-capacity fixtures affect only backup or campaign writes.'},
  invocation:{command:'node '+driver,environment},checks,captures,fixtures,observations,errors,consoleErrors,workerErrors,requestsFailed,sourceBefore,sourceAfter,sourceSnapshotFailure,failure,completedAt:new Date().toISOString()};
 await fs.writeFile(path.join(output,'result.json'),JSON.stringify(raw,null,2)+'\n');console.log(JSON.stringify({status,completeRecipe,completedJourneys,checks:checks.length,captures:captures.length,output}));
}
if(failure)process.exitCode=1;
