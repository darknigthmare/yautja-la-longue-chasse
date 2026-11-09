import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import {chromium} from 'playwright-core';
import {mobilityQaGuidance} from './mobility-qa-driver.mjs';

// MOB-001: the mounted production GameClient, its physical forge and its real
// campaign writer. Only the initial adult checkpoint and explicit Storage
// fault injection are fixtures. No clock, callback, reducer or DOM is replaced.
const root=process.cwd();
const url=process.env.MOBILITY_CAMPAIGN_QA_URL??'http://127.0.0.1:3150';
assert(['127.0.0.1','localhost'].includes(new URL(url).hostname));
const probe=process.argv.includes('--probe');
const out=path.resolve(process.env.MOBILITY_CAMPAIGN_QA_OUTPUT??'outputs/mobility-campaign-20261109');
await fs.mkdir(out,{recursive:true});
await fs.writeFile(path.join(out,'run.lock'),new Date().toISOString()+'\n',{flag:'wx'});
await fs.copyFile('scripts/qa-mobility-campaign-20261109.mjs',path.join(out,'recipe-used.mjs'));
const sha=raw=>createHash('sha256').update(raw).digest('hex');
const sourcePaths=[
  'app/game/GameClient.tsx','app/game/HomeworldHub.tsx','app/game/MobilityGarage.tsx',
  'app/game/MobilityGarage.module.css','app/game/MobilityDrivingYard.tsx','app/game/save.ts','app/game/types.ts',
  ...['access','catalogue','controller','controls','course','ledger','workshop'].map(name=>`app/game/systems/mobility/${name}.ts`),
  'scripts/qa-mobility-campaign-20261109.mjs','scripts/mobility-qa-driver.mjs',
];
const identity=async()=>({buildId:(await fs.readFile('.next/BUILD_ID','utf8')).trim(),
  sources:await Promise.all(sourcePaths.map(async file=>({file,sha256:sha(await fs.readFile(file))})))});
const sourceBefore=await identity();
const contents=[
  "export * from './app/game/save.ts';",
  "export * from './app/game/systems/campaignSlots.ts';",
  "export {HOMEWORLD_BUILDINGS_V77} from './app/game/systems/homeworldWorldV77.ts';",
  "export {homeworldBuildingDoorwayV64} from './app/game/systems/homeworldGeometryV64.ts';",
  "export {homeworldInteriorForBuildingV64,isHomeworldInteriorWalkableV64,nearestHomeworldInteriorTargetV64} from './app/game/systems/homeworldInteriorsV64.ts';",
  "export {homeworldCivicWalkableV80} from './app/game/systems/homeworldCivicWorldV80.ts';",
  "export {resolveHomeworldLocationV77} from './app/game/systems/homeworldLocationV77.ts';",
].join('\n');
const nodeBundle=await build({stdin:{contents,resolveDir:root},bundle:true,format:'esm',platform:'node',write:false,logLevel:'silent'});
const domain=await import('data:text/javascript;base64,'+Buffer.from(nodeBundle.outputFiles[0].text).toString('base64'));
const browserBundle=await build({stdin:{contents,resolveDir:root},bundle:true,format:'iife',globalName:'__mobilityInitialCampaignApi',platform:'browser',write:false,logLevel:'silent'});
const owner='2026-11-09T17:00:00.000Z';
const save=domain.defaultSave(owner);
save.profile.hunterName='QA mobilité · préconditions déclarées';
save.profile.honor=300;save.profile.rankId='blooded';save.profile.clanMarks=10000;
save.settings.masterVolume=0;
const building=domain.HOMEWORLD_BUILDINGS_V77.find(item=>item.id==='deep-forge');
assert(building);
const door=domain.homeworldBuildingDoorwayV64(building);
const room=domain.homeworldInteriorForBuildingV64(building.id);
const counter=room.points.find(item=>item.pointId==='forge-service');
// The service is a solid person/workbench. Plan a walked approach inside its
// actual 64-unit interaction range, never a path through the painted table.
function interiorCounterRoute(start){
  const queue=[{...start,previous:null}],seen=new Set([`${start.x}:${start.y}`]);
  let end=null;
  for(let i=0;i<queue.length;i++){
    const at=queue[i],target=domain.nearestHomeworldInteriorTargetV64(room,at);
    if(target?.kind==='point'&&target.pointId==='forge-service'&&Math.hypot(at.x-target.position.x,at.y-target.position.y)<56){end=at;break;}
    for(const[dx,dy]of [[8,0],[-8,0],[0,8],[0,-8]]){
      const next={x:at.x+dx,y:at.y+dy,previous:at},key=`${next.x}:${next.y}`;
      if(!seen.has(key)&&domain.isHomeworldInteriorWalkableV64(room,next,{halfWidth:32,halfDepth:22})){seen.add(key);queue.push(next);}
    }
  }
  assert(end,'The real service must have a reachable body-sized approach.');
  const nodes=[];for(let at=end;at;at=at.previous)nodes.unshift({x:at.x,y:at.y});
  const turns=nodes.filter((node,index)=>index===0||index===nodes.length-1||
    Math.sign(node.x-nodes[index-1].x)!==Math.sign(nodes[index+1].x-node.x)||
    Math.sign(node.y-nodes[index-1].y)!==Math.sign(nodes[index+1].y-node.y));
  return {nodes,turns};
}
const normal=door.normal??{x:0,y:1};
const candidates=[64,48,32,16,0].map(distance=>({x:door.approach.x+normal.x*distance,y:door.approach.y+normal.y*distance}));
const start=candidates.find(point=>domain.homeworldCivicWalkableV80(building.levelId,point));
assert(start,'The disclosed starting checkpoint must stand on supported free ground.');
save.homeworld.locationV77={version:1,layoutRevision:1,ownerCreatedAt:owner,levelId:building.levelId,
  exterior:start,interiorId:null,local:null};
assert(domain.resolveHomeworldLocationV77(save.homeworld.locationV77,owner).restored);
assert.equal(save.mobilityV1,undefined);
assert.equal(domain.parseSaveImport(JSON.stringify(save)).failure,null);
await fs.writeFile(path.join(out,'initial-save.json'),JSON.stringify(save,null,2)+'\n');
await fs.writeFile(path.join(out,'fixture-disclosure.json'),JSON.stringify({owner,adultHistoricalCampaign:true,
  prologue:save.prologue,rank:save.profile.rankId,honor:save.profile.honor,clanMarks:10000,
  startingExterior:start,doorApproach:door.approach,forgeCounter:counter,initialMobilityLedger:null,
  initialPermit:false,initialOwnedVehicles:0,seededMobilityResults:0,fullCampaignFromZeroPlayed:false,
  initialCampaignSlot:'Created by the actual migrateLegacyCampaignSlot and saveCampaignCheckpoint APIs before the first played session.',
  faultInjection:'Two explicit native Storage.setItem quota failures, on the purchase and the first owned drive write only. All other calls delegate unchanged.',
},null,2)+'\n');
const report={schemaVersion:1,startedAt:new Date().toISOString(),url,probe,passed:false,
  qualification:probe?'PROBE_ONLY':'PENDING',scope:'Actual Next/GameClient → exterior forge approach → interior service → garage → native training and owned sortie → homeworld. Declared initial adult checkpoint; not a complete campaign from nursery.',
  sourceBefore,checks:[],screenshots:[],servedScripts:[],errors:[],consoleErrors:[],httpErrors:[],requestFailures:[],assets:[],
  physicalController:false,humanArtValidated:false};
const check=(name,ok,detail)=>{assert(ok,name);report.checks.push({name,passed:true,...(detail===undefined?{}:{detail})});console.log('PASS',name);};
const assetPaths=new Set(),scriptJobs=[];
let browser,page,context;
const key=domain.SAVE_STORAGE_KEY;
async function shot(filename){const bytes=await page.screenshot({path:path.join(out,filename+'.png'),fullPage:false});report.screenshots.push({filename:filename+'.png',sha256:sha(bytes),inspected:false});}
try{
  browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH??'/usr/bin/chromium',args:['--disable-dev-shm-usage']});
  report.browserVersion=browser.version();
  context=await browser.newContext({viewport:{width:1440,height:1000},hasTouch:true,reducedMotion:'reduce'});
  page=await context.newPage();page.setDefaultTimeout(30000);
  page.on('pageerror',error=>report.errors.push({message:error.message,stack:error.stack}));
  page.on('console',message=>{if(message.type()==='error')report.consoleErrors.push(message.text());});
  page.on('requestfailed',request=>report.requestFailures.push({url:request.url(),failure:request.failure()}));
  page.on('request',request=>{const p=new URL(request.url()).pathname;if(p.startsWith('/game/'))assetPaths.add(p);});
  page.on('response',response=>{
    const pathname=new URL(response.url()).pathname;
    if(response.status()>=400)report.httpErrors.push({pathname,status:response.status()});
    if(response.request().resourceType()==='script'&&pathname.startsWith('/_next/static/')&&response.status()<400){
      scriptJobs.push((async()=>{const body=await response.body(),file='.next/'+pathname.slice('/_next/'.length);
        const disk=await fs.readFile(file);report.servedScripts.push({pathname,file,sha256:sha(body),matchesBuiltFile:sha(body)===sha(disk)});
      })().catch(error=>report.errors.push({stage:'served-script-proof',message:error.message})));
    }
  });
  await page.goto(url,{waitUntil:'networkidle',timeout:120000});
  await page.addScriptTag({content:browserBundle.outputFiles[0].text});
  const seeded=await page.evaluate(async({save,key})=>{
    const api=window.__mobilityInitialCampaignApi;
    localStorage.setItem(key,JSON.stringify(save));
    const migrated=await api.migrateLegacyCampaignSlot();
    if(!migrated.ok)throw Error(migrated.message);
    const result=await api.saveCampaignCheckpoint(1,{kind:'manual',index:1,location:'homeworld',expectedRevision:api.loadCampaignSlots().slots[0].revision});
    if(!result.ok)throw Error(result.message);
    return {migrated:true,checkpointed:true};
  },{save,key});
  check('initial real campaign slot migrated and checkpointed before playing',seeded.migrated&&seeded.checkpointed);
  await page.reload({waitUntil:'networkidle'});
  const stored=()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key);
  const click=(name,exact=true)=>page.getByRole('button',{name,exact}).click();
  async function continueCampaign(){
    await page.locator('[data-campaign-menu]').waitFor();
    const campaign=page.locator('[data-menu-section="campaign"]');if(await campaign.isVisible())await campaign.click();
    await page.locator('[data-menu-action="continue"]').click();
    await page.locator('[data-campaign-session]').waitFor({timeout:90000});await page.bringToFront();
    await page.waitForFunction(()=>document.querySelector('[data-homeworld-hub][data-homeworld-motion-ready="true"]')||
      document.body.innerText.includes('Sprites indisponibles'),null,{timeout:90000});
    assert(await page.locator('[data-homeworld-hub]').getAttribute('data-homeworld-motion-ready')==='true',
      'Native Homeworld asset loader refused an unavailable sprite; do not bypass its readiness gate.');
  }
  const actor=()=>page.locator('[data-homeworld-actor]').evaluate(element=>({x:Number(element.dataset.x),y:Number(element.dataset.y)}));
  const [up,down,left,right]=['hunt.moveUp','hunt.moveDown','hunt.moveLeft','hunt.moveRight'].map(id=>save.settings.controlBindings[id][0]);
  async function walk(target){
    await page.locator('[data-homeworld-viewport]').focus();
    let held=new Set();const samples=[],begin=Date.now();
    try{
      while(Date.now()-begin<30000){
        const at=await actor();samples.push(at);const dx=target.x-at.x,dy=target.y-at.y;
        if(Math.hypot(dx,dy)<12)break;
        const desired=new Set();if(Math.abs(dx)>7)desired.add(dx>0?right:left);if(Math.abs(dy)>7)desired.add(dy>0?down:up);
        for(const key of held)if(!desired.has(key))await page.keyboard.up(key);
        for(const key of desired)if(!held.has(key))await page.keyboard.down(key);
        held=desired;await page.waitForTimeout(65);
      }
    }finally{for(const key of held)await page.keyboard.up(key);}
    await page.waitForTimeout(180);const at=await actor();
    assert(Math.hypot(at.x-target.x,at.y-target.y)<24,`Native walk did not reach ${JSON.stringify(target)}: ${JSON.stringify(at)}`);
    return samples;
  }
  await continueCampaign();
  check('GameClient resumes the disclosed exterior on the actual homeworld',await page.locator('[data-homeworld-hub]').getAttribute('data-homeworld-interior-id')===null);
  await shot('01-exterior-before-forge');
  const exteriorWalk=await walk(door.approach);
  await page.locator('[data-homeworld-door-id="deep-forge"]').click();
  await page.locator('[data-homeworld-hub][data-homeworld-interior-id="deep-forge"]').waitFor();
  check('actual forge door changes the native physical room',true,{outsideSamples:exteriorWalk});
  const approach=interiorCounterRoute(await actor()),counterWalk=[];
  for(const waypoint of approach.turns.slice(1))counterWalk.push(...await walk(waypoint));
  report.forgeApproach=approach;
  check('counter is reached by native walking inside the actual forge',counterWalk.length>1&&Math.hypot(counterWalk[0].x-counter.x,counterWalk[0].y-counter.y)>50,{samples:counterWalk});
  await page.locator('[data-homeworld-interior-target="point"]').click();
  await page.locator('[data-mobility-forge-entry]').waitFor();await shot('02-physical-forge-counter');
  await click('Ouvrir le comptoir et le garage');await page.locator('[data-mobility-garage]').waitFor();
  check('physical counter opens the mounted campaign garage with all fifty models',await page.locator('[role="listitem"]').count()===50);
  let disk=await stored();
  check('opening the actual garage grants no permit, property or free ledger',!disk.mobilityV1&&disk.profile.clanMarks===10000);
  check('counter checkpoint belongs to this campaign and remains physically in reach',disk.homeworld.locationV77.ownerCreatedAt===owner&&disk.homeworld.locationV77.interiorId==='deep-forge'&&Math.hypot(disk.homeworld.locationV77.local.x-counter.x,disk.homeworld.locationV77.local.y-counter.y)<64);
  await shot('03-campaign-garage');
  if(probe){report.qualification='PROBE_ONLY';report.passed=true;}
  else{
    await click('Prendre le Grav-Sled de formation');let yard=page.locator('[data-mobility-yard]');await yard.waitFor();
    check('actual campaign loan is recorded and starts paused',(await stored()).mobilityV1.active.loaned&&await yard.getAttribute('data-paused')==='true');
    await click('Reprendre la conduite');
    const [forward,turnLeft,turnRight,brake,interact]=['hunt.moveUp','hunt.moveLeft','hunt.moveRight','hunt.jump','hunt.interact'].map(id=>save.settings.controlBindings[id][0]);
    let stage=0,held=new Set();const begin=Date.now(),route=[];
    try{
      while(Date.now()-begin<150000){
        const at=await yard.evaluate(element=>Object.fromEntries(['x','y','heading','speed','checkpoint','cargo','tick'].map(name=>[name,Number(element.getAttribute('data-'+name))])));
        const guide=mobilityQaGuidance(at,stage),desired=new Set();
        if(guide.throttle)desired.add(forward);if(guide.steer)desired.add(guide.steer>0?turnRight:turnLeft);if(guide.brake)desired.add(brake);if(guide.interact)desired.add(interact);
        if(guide.advance){if(stage===1){if(at.cargo===25)stage++;}else if(stage===5){if((await stored()).mobilityV1.active.course.cargoDelivered)break;}else stage++;}
        for(const key of held)if(!desired.has(key))await page.keyboard.up(key);
        for(const key of desired)if(!held.has(key))await page.keyboard.down(key);
        held=desired;if(route.length===0||route.at(-1).tick+30<=at.tick)route.push({stage,...at});await page.waitForTimeout(55);
      }
    }finally{for(const key of held)await page.keyboard.up(key);}
    await click('Pause et enregistrer');disk=await stored();
    check('native training crosses three ordered beacons and returns real cargo',disk.mobilityV1.active.course.checkpoint===3&&disk.mobilityV1.active.course.cargoDelivered,{route});
    await shot('04-training-complete-before-return');await click('Remiser au garage');disk=await stored();
    check('actual garage return earns only the permit and unclaimed training hand-over',disk.mobilityV1.active===null&&disk.mobilityV1.circulationPermit&&disk.mobilityV1.owned.length===0&&disk.mobilityV1.trainingReward?.status==='available'&&disk.profile.clanMarks===10000&&disk.profile.honor===300);
    await page.evaluate(key=>{
      const original=Storage.prototype.setItem;
      window.__mobilityWriteFault={armed:null,failed:[],successful:[]};
      Storage.prototype.setItem=function(name,value){
        const fault=window.__mobilityWriteFault;
        if(name===key){
          const next=JSON.parse(value),old=JSON.parse(localStorage.getItem(key));
          const purchase=fault.armed==='purchase'&&next.mobilityV1?.owned.some(vehicle=>vehicle.id==='clan_hoverbike')&&!old.mobilityV1?.owned.some(vehicle=>vehicle.id==='clan_hoverbike');
          const drive=fault.armed==='drive'&&next.mobilityV1?.active?.course.tick>old.mobilityV1?.active?.course.tick;
          if(purchase||drive){fault.failed.push({kind:fault.armed,beforeRevision:old.mobilityV1?.revision,attemptedRevision:next.mobilityV1?.revision,beforeTick:old.mobilityV1?.active?.course.tick,attemptedTick:next.mobilityV1?.active?.course.tick});fault.armed=null;throw new DOMException('Declared mobility QA quota failure','QuotaExceededError');}
          const result=original.call(this,name,value);fault.successful.push({revision:next.mobilityV1?.revision,tick:next.mobilityV1?.active?.course.tick,marks:next.profile.clanMarks});return result;
        }
        return original.call(this,name,value);
      };
    },key);
    const beforeBuy=await page.evaluate(key=>localStorage.getItem(key),key);
    await page.evaluate(()=>{window.__mobilityWriteFault.armed='purchase';});
    await click('Confirmer l’achat · 420 marques');
    check('a native purchase quota failure preserves the exact previous campaign bytes',await page.evaluate(key=>localStorage.getItem(key),key)===beforeBuy);
    check('failed purchase announces no owned vehicle and no debit',!(await stored()).mobilityV1.owned.length&&(await stored()).profile.clanMarks===10000&&await page.locator('[data-mobility-owned-count="0"]').isVisible());
    await shot('05-purchase-refused');await click('Confirmer l’achat · 420 marques');disk=await stored();
    check('retry confirms one purchase and one exact debit through the campaign owner',disk.profile.clanMarks===9580&&disk.mobilityV1.owned.length===1&&disk.mobilityV1.owned[0].id==='clan_hoverbike');
    await click('Sortir sur l’aire');yard=page.locator('[data-mobility-yard]');await yard.waitFor();
    await page.evaluate(()=>{window.__mobilityWriteFault.armed='drive';});
    const beforeDrive=(await stored()).mobilityV1;
    await click('Reprendre la conduite');await page.keyboard.down(forward);
    await page.getByRole('button',{name:'Réessayer la même écriture',exact:true}).waitFor();await page.keyboard.up(forward);
    disk=await stored();
    check('failed owned movement pauses with the confirmed tick and revision intact',disk.mobilityV1.revision===beforeDrive.revision&&disk.mobilityV1.active.course.tick===beforeDrive.active.course.tick&&await yard.getAttribute('data-paused')==='true');
    const failure=await page.evaluate(()=>window.__mobilityWriteFault.failed.at(-1));
    await shot('06-drive-write-refused');await click('Réessayer la même écriture');
    disk=await stored();
    check('same buffered movement retries once without re-simulation or skipped revision',disk.mobilityV1.revision===failure.beforeRevision+1&&disk.mobilityV1.active.course.tick===failure.attemptedTick);
    const frozen=JSON.stringify(disk.mobilityV1);await page.waitForTimeout(700);
    check('pause after successful retry preserves exact campaign mobility bytes',JSON.stringify((await stored()).mobilityV1)===frozen);
    await shot('07-drive-reconciled');
    await page.reload({waitUntil:'networkidle'});await continueCampaign();
    await page.locator('[data-homeworld-interior-target="point"]').click();await click('Ouvrir le comptoir et le garage');
    yard=page.locator('[data-mobility-yard]');await yard.waitFor();
    check('ordinary Continue and physical counter reopen the exact sortie paused',JSON.stringify((await stored()).mobilityV1)===frozen&&await yard.getAttribute('data-paused')==='true');
    await page.setViewportSize({width:390,height:844});
    check('native campaign driving controls fit the narrow viewport',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));
    await shot('08-paused-sortie-after-continue-mobile');
    await click('Retour de sécurité');await click('Confirmer la récupération');disk=await stored();
    check('explicit recovery closes the owned sortie once and retains consumed condition and energy',disk.mobilityV1.active===null&&disk.mobilityV1.recoveryDebt>=20&&disk.mobilityV1.recoveryCount===1&&disk.mobilityV1.owned[0].energy<100&&disk.mobilityV1.owned[0].condition<100);
    await click('Retour au comptoir des Forges');await page.locator('[data-homeworld-hub]').waitFor();
    check('actual return brings the same hunter back to the same physical forge counter',await page.locator('[data-homeworld-hub]').getAttribute('data-homeworld-interior-id')==='deep-forge'&&(await stored()).mobilityV1.active===null);
    await shot('09-returned-to-physical-forge');
    report.finalSave=await stored();await fs.writeFile(path.join(out,'final-save.json'),JSON.stringify(report.finalSave,null,2)+'\n');
    check('final saved campaign parses with the real importer',domain.parseSaveImport(JSON.stringify(report.finalSave)).failure===null);
    report.qualification='PENDING_VISUAL_INSPECTION';report.passed=true;
  }
}catch(error){report.failure={message:error.message,stack:error.stack};console.error(error);if(page)await shot('failure').catch(()=>{});}
finally{
  await Promise.allSettled(scriptJobs);report.assets=[...assetPaths].sort();
  report.sourceAfter=await identity();report.sourceBeforeAfterEqual=JSON.stringify(report.sourceBefore)===JSON.stringify(report.sourceAfter);
  if(!report.sourceBeforeAfterEqual){report.passed=false;report.failure??={message:'Target source/build changed during recipe.'};}
  if(report.servedScripts.some(item=>!item.matchesBuiltFile)||report.errors.length||report.consoleErrors.length||report.httpErrors.length||report.requestFailures.length)report.passed=false;
  report.endedAt=new Date().toISOString();
  await fs.writeFile(path.join(out,'report.browser-run.json'),JSON.stringify(report,null,2)+'\n');
  if(browser)await browser.close();
}
console.log(JSON.stringify({passed:report.passed,probe,checks:report.checks.length,failure:report.failure,output:out}));
process.exitCode=report.passed?0:1;
