import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import {chromium} from 'playwright-core';

// A short, explicitly replayed real GameClient save. This does not repeat or
// relabel the 29-check end-to-end run on build nItYejsE7HSH4L0ykJM5K.
const root=process.cwd(),url=process.env.MOBILITY_NOTICE_QA_URL??'http://127.0.0.1:3154';
assert(['127.0.0.1','localhost'].includes(new URL(url).hostname));
const out=path.resolve(process.env.MOBILITY_NOTICE_QA_OUTPUT??'outputs/mobility-notice-smoke-20261109');
await fs.mkdir(out,{recursive:true});await fs.writeFile(path.join(out,'run.lock'),new Date().toISOString()+'\n',{flag:'wx'});
await fs.copyFile('scripts/qa-mobility-notice-smoke-20261109.mjs',path.join(out,'recipe-used.mjs'));
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const fixturePath='production/clan-war-command-20261109/qa/mobility/campaign-attempt-2/final-save.json';
const fixtureBytes=await fs.readFile(fixturePath),fixture=JSON.parse(fixtureBytes);
assert(fixture.mobilityV1?.owned.length===1&&fixture.mobilityV1.recoveryCount===1&&!fixture.mobilityV1.active);
await fs.writeFile(path.join(out,'initial-replayed-save.json'),fixtureBytes);
const sources=['app/game/GameClient.tsx','app/game/HomeworldHub.tsx','app/game/MobilityGarage.tsx',
  'app/game/MobilityGarage.module.css','app/game/MobilityDrivingYard.tsx','app/game/save.ts','app/game/types.ts',
  'app/game/systems/mobility/ledger.ts','app/game/systems/mobility/controller.ts','app/game/systems/mobility/course.ts',
  'scripts/qa-mobility-notice-smoke-20261109.mjs'];
const identity=async()=>({buildId:(await fs.readFile('.next/BUILD_ID','utf8')).trim(),
  sources:await Promise.all(sources.map(async file=>({file,sha256:hash(await fs.readFile(file))})))});
const before=await identity();
const source="export * from './app/game/save.ts';export * from './app/game/systems/campaignSlots.ts';";
const nodeBundle=await build({stdin:{contents:source,resolveDir:root},bundle:true,platform:'node',format:'esm',write:false,logLevel:'silent'});
const api=await import('data:text/javascript;base64,'+Buffer.from(nodeBundle.outputFiles[0].text).toString('base64'));
assert.equal(api.parseSaveImport(JSON.stringify(fixture)).failure,null);
const browserBundle=await build({stdin:{contents:source,resolveDir:root},bundle:true,platform:'browser',format:'iife',globalName:'__mobilityNoticeInitialApi',write:false,logLevel:'silent'});
const report={schemaVersion:1,startedAt:new Date().toISOString(),url,passed:false,sourceBefore:before,
  scope:'Short real GameClient notice regression from the actually earned final save of campaign-attempt-2. No full 29-check campaign rerun, physical controller or art qualification.',
  fixture:{path:fixturePath,sha256:hash(fixtureBytes),owner:fixture.createdAt,earnedOnBuild:'nItYejsE7HSH4L0ykJM5K',
    disclosedReplay:true,replayedExistingEarnedResults:true,fabricatedNewResults:false,
    initialMarks:fixture.profile.clanMarks,initialRecoveryDebt:fixture.mobilityV1.recoveryDebt},
  checks:[],screenshots:[],servedScripts:[],servedStyles:[],errors:[],consoleErrors:[],httpErrors:[],requestFailures:[]};
await fs.writeFile(path.join(out,'fixture-disclosure.json'),JSON.stringify(report.fixture,null,2)+'\n');
const check=(name,ok,detail)=>{assert(ok,name);report.checks.push({name,passed:true,...(detail===undefined?{}:{detail})});console.log('PASS',name);};
const jobs=[];let browser,page;
const shot=async name=>{const data=await page.screenshot({path:path.join(out,name+'.png'),fullPage:false});report.screenshots.push({filename:name+'.png',sha256:hash(data),inspected:false});};
try{
  browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH??'/usr/bin/chromium',args:['--disable-dev-shm-usage']});
  report.browserVersion=browser.version();
  const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
  page=await context.newPage();page.setDefaultTimeout(30000);
  page.on('pageerror',error=>report.errors.push(error.message));
  page.on('console',message=>{if(message.type()==='error')report.consoleErrors.push(message.text());});
  page.on('requestfailed',request=>report.requestFailures.push({url:request.url(),failure:request.failure()}));
  page.on('response',response=>{
    const pathname=new URL(response.url()).pathname,type=response.request().resourceType();
    if(response.status()>=400)report.httpErrors.push({pathname,status:response.status()});
    if(['script','stylesheet'].includes(type)&&pathname.startsWith('/_next/static/')&&response.status()<400)
      jobs.push((async()=>{const bytes=await response.body(),file='.next/'+pathname.slice('/_next/'.length),disk=await fs.readFile(file);
        (type==='script'?report.servedScripts:report.servedStyles).push({pathname,file,sha256:hash(bytes),matchesBuiltFile:hash(bytes)===hash(disk)});
      })().catch(error=>report.errors.push(error.message)));
  });
  await page.goto(url,{waitUntil:'networkidle',timeout:120000});
  await page.addScriptTag({content:browserBundle.outputFiles[0].text});
  await page.evaluate(async({fixture,key})=>{
    const api=window.__mobilityNoticeInitialApi;
    localStorage.setItem(key,JSON.stringify(fixture));const result=await api.migrateLegacyCampaignSlot();
    if(!result.ok)throw Error(result.message);
    const checkpoint=await api.saveCampaignCheckpoint(1,{kind:'manual',index:1,location:'homeworld',expectedRevision:api.loadCampaignSlots().slots[0].revision});
    if(!checkpoint.ok)throw Error(checkpoint.message);
  },{fixture,key:api.SAVE_STORAGE_KEY});
  await page.reload({waitUntil:'networkidle'});
  await page.locator('[data-campaign-menu]').waitFor();
  const campaign=page.locator('[data-menu-section="campaign"]');if(await campaign.isVisible())await campaign.click();
  await page.locator('[data-menu-action="continue"]').click();await page.locator('[data-campaign-session]').waitFor({timeout:90000});
  await page.bringToFront();await page.locator('[data-homeworld-hub][data-homeworld-motion-ready="true"]').waitFor({timeout:90000});
  await page.locator('[data-homeworld-interior-target="point"]').click();
  await page.getByRole('button',{name:'Ouvrir le comptoir et le garage',exact:true}).click();
  const garage=page.locator('[data-mobility-garage]');await garage.waitFor();
  const stored=()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),api.SAVE_STORAGE_KEY);
  const click=name=>page.getByRole('button',{name,exact:true}).click();
  check('the declared earned campaign replays without replacing its profile or mobility',
    JSON.stringify((await stored()).profile)===JSON.stringify(fixture.profile)&&JSON.stringify((await stored()).mobilityV1)===JSON.stringify(fixture.mobilityV1));
  const debt=(await stored()).mobilityV1.recoveryDebt;assert(debt>0);
  await click(`Régler le remorquage · ${debt} marques`);
  check('replayed recovery debt is explicitly paid exactly once',
    (await stored()).profile.clanMarks===fixture.profile.clanMarks-debt&&(await stored()).mobilityV1.recoveryDebt===0);
  await click('Sortir sur l’aire');const yard=page.locator('[data-mobility-yard]');await yard.waitFor();
  const notice=()=>yard.locator('[role="status"]').last().innerText();
  const forward=fixture.settings.controlBindings['hunt.moveUp'][0];
  await click('Reprendre la conduite');await page.keyboard.down(forward);await page.waitForTimeout(800);await page.keyboard.up(forward);
  await click('Pause et enregistrer');
  check('manual pause announces paused and durably recorded controls',
    await yard.getAttribute('data-paused')==='true'&&await notice()==='Conduite en pause · dernières commandes enregistrées.');
  check('manual pause no longer announces an active drive',!(await notice()).includes('Conduite active'));
  await yard.locator('[role="status"]').last().scrollIntoViewIfNeeded();await shot('01-pause-confirmed');
  const confirmed=await stored();assert(confirmed.mobilityV1.active.course.tick>0);
  await page.evaluate(key=>{
    const original=Storage.prototype.setItem;window.__mobilityNoticeFault={armed:true,rejections:[]};
    Storage.prototype.setItem=function(name,value){
      if(name===key&&window.__mobilityNoticeFault.armed){
        const next=JSON.parse(value),previous=JSON.parse(localStorage.getItem(key));
        if(next.mobilityV1?.active?.course.tick>previous.mobilityV1?.active?.course.tick){
          window.__mobilityNoticeFault.armed=false;
          window.__mobilityNoticeFault.rejections.push({beforeRevision:previous.mobilityV1.revision,beforeTick:previous.mobilityV1.active.course.tick,attemptedTick:next.mobilityV1.active.course.tick});
          throw new DOMException('Declared notice smoke drive quota failure','QuotaExceededError');
        }
      }
      return original.call(this,name,value);
    };
  },api.SAVE_STORAGE_KEY);
  await click('Reprendre la conduite');await page.keyboard.down(forward);
  await page.getByRole('button',{name:'Réessayer la même écriture',exact:true}).waitFor();await page.keyboard.up(forward);
  check('a real failed drive write remains paused and honestly unconfirmed',
    await yard.getAttribute('data-paused')==='true'&&(await notice()).startsWith('Écriture non confirmée'));
  check('the refused write retains the exact prior mobility and balance',
    JSON.stringify((await stored()).mobilityV1)===JSON.stringify(confirmed.mobilityV1)&&(await stored()).profile.clanMarks===confirmed.profile.clanMarks);
  report.quotaObservation=await page.evaluate(()=>window.__mobilityNoticeFault);
  await yard.locator('[role="status"]').last().scrollIntoViewIfNeeded();await shot('02-refused-write');
  await click('Réessayer la même écriture');
  check('successful retry replaces the failure notice with the actual writer acknowledgement',await notice()==='Conduite sauvegardée.');
  check('successful retry removes the unconfirmed sequence alert and enables explicit resume',
    await yard.getByRole('alert').count()===0&&await page.getByRole('button',{name:'Reprendre la conduite',exact:true}).isEnabled());
  check('the obsolete global save failure is cleared after the acknowledgement',
    await page.getByText(/Progression conservée en mémoire seulement/).count()===0);
  const after=await stored(),failure=report.quotaObservation.rejections[0];
  check('successful retry confirms the same buffered tick with one revision',
    report.quotaObservation.rejections.length===1&&after.mobilityV1.active.course.tick===failure.attemptedTick&&after.mobilityV1.revision===failure.beforeRevision+1);
  const frozen=JSON.stringify(after.mobilityV1);await page.waitForTimeout(700);
  check('acknowledged paused state and notice remain stable without replay',
    JSON.stringify((await stored()).mobilityV1)===frozen&&await notice()==='Conduite sauvegardée.');
  const expectedProfile={...fixture.profile,clanMarks:fixture.profile.clanMarks-debt,playTimeSeconds:after.profile.playTimeSeconds};
  check('notice updates preserve every profile field except the explicitly paid debt and time',JSON.stringify(after.profile)===JSON.stringify(expectedProfile));
  check('notice updates invent no unrelated mission, trophy, inventory or extra vehicle',
    ['missionProgress','trophies','inventory'].every(field=>JSON.stringify(after[field])===JSON.stringify(fixture[field]))&&after.mobilityV1.owned.length===fixture.mobilityV1.owned.length);
  report.finalSave=after;await fs.writeFile(path.join(out,'final-save.json'),JSON.stringify(after,null,2)+'\n');
  await yard.locator('[role="status"]').last().scrollIntoViewIfNeeded();await shot('03-retry-acknowledged');
  report.passed=true;
}catch(error){
  report.failure={message:error.message,stack:error.stack};console.error(error);
  if(page){report.failureObservation=await page.evaluate(key=>({campaign:JSON.parse(localStorage.getItem(key)??'null'),notices:[...document.querySelectorAll('[data-mobility-garage] [role="status"]')].map(element=>element.textContent),fault:window.__mobilityNoticeFault??null}),api.SAVE_STORAGE_KEY).catch(()=>null);await shot('failure').catch(()=>{});}
}finally{
  await Promise.allSettled(jobs);report.sourceAfter=await identity();report.sourceBeforeAfterEqual=JSON.stringify(report.sourceBefore)===JSON.stringify(report.sourceAfter);
  if(!report.sourceBeforeAfterEqual||[...report.servedScripts,...report.servedStyles].some(item=>!item.matchesBuiltFile)||report.errors.length||report.consoleErrors.length||report.httpErrors.length||report.requestFailures.length)report.passed=false;
  report.endedAt=new Date().toISOString();await fs.writeFile(path.join(out,'report.browser-run.json'),JSON.stringify(report,null,2)+'\n');
  if(browser)await browser.close();
}
console.log(JSON.stringify({passed:report.passed,checks:report.checks.length,failure:report.failure,output:out}));process.exitCode=report.passed?0:1;
