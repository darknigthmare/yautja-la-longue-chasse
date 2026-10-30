/** Isolated actual React Atlas and real module Worker. Cargo fixtures are
 * produced by the real operation model; fixture controls exercise parent
 * changes only. This is not a played campaign or a production art recipe. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import {chromium} from 'playwright-core';
import {cargoRouteV108} from '../tests/helpers/cargo-v108-route.mjs';
import {reportGithubActionsFailure} from './lib/github-actions-annotation.mjs';

const root=fileURLToPath(new URL('../',import.meta.url)),outputRoot=path.resolve(process.env.YAUTJA_ATLAS_V109_OUTPUT??'outputs/qa-v109-atlas-integration');
await fs.mkdir(outputRoot,{recursive:true});
const output=await fs.mkdtemp(path.join(outputRoot,'run-'));
const baselineHost=process.env.YAUTJA_ATLAS_V109_BASELINE_HOST;
const hostFile=path.join(root,'app/game/HomeworldWorldMapV77.tsx');
const plugins=baselineHost?[{name:'explicit-atlas-host-baseline',setup(builder){builder.onLoad({filter:/HomeworldWorldMapV77\.tsx$/},async args=>{
 if(args.path!==hostFile)throw Error('Unexpected Atlas baseline source '+args.path);
 return {contents:await fs.readFile(baselineHost,'utf8'),loader:'tsx'};
});}}]:[];
const f=cargoRouteV108('2026-10-25T10:00:00.000Z'),initial=structuredClone(f.state());
f.start();f.walkTo(f.b.lots[0].stand);f.action('take-wide');f.walkTo({x:6850,y:5590});f.action('interrupt');f.action('park');
const saves=f.qa.load('app/game/save.ts'),saved=saves.defaultSave(f.owner);saved.homeworld.visitedDistrictIds=['port'];saved.homeworld.cargoV108=structuredClone(f.state().ledger);
const groundChanged=structuredClone(saved);groundChanged.homeworld.cargoV108=initial.ledger;
const foreign=structuredClone(saved);foreign.createdAt='2026-10-26T10:00:00.000Z';foreign.homeworld.cargoV108=undefined;
const fixture={save:saved,groundChanged,foreign,origin:{actor:f.b.passage.start,levelId:'0',interiorId:null},otherOrigin:{actor:{x:5000,y:3600},levelId:'+1',interiorId:null},targetId:f.b.npcId};
const bundle=await build({entryPoints:[path.join(root,'tests/browser/homeworld-atlas-v109.fixture.tsx')],bundle:true,write:false,outdir:path.join(root,'outputs/qa-v109-atlas-build'),format:'esm',platform:'browser',jsx:'automatic',define:{'process.env.NODE_ENV':'"production"'},logLevel:'silent',plugins});
const workerFile=path.join(root,'app/game/homeworldRouteWorkerV111.ts');
const worker=await build({entryPoints:[workerFile],bundle:true,write:false,format:'esm',platform:'browser',logLevel:'silent'});
const js=bundle.outputFiles.find(file=>file.path.endsWith('.js')).contents,css=bundle.outputFiles.find(file=>file.path.endsWith('.css'))?.contents??'',workerJs=worker.outputFiles[0].contents;
const server=http.createServer((req,res)=>{
 if(req.url==='/fixture.js'){res.setHeader('Content-Type','text/javascript');res.end(js);}
 else if(req.url==='/fixture.css'){res.setHeader('Content-Type','text/css');res.end(css);}
 else if(req.url==='/homeworldRouteWorkerV111.ts'){res.setHeader('Content-Type','text/javascript');res.end(workerJs);}
 else if(req.url==='/'){res.setHeader('Content-Type','text/html');res.end('<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Atlas V109 integration</title><link rel="icon" href="data:,"><link rel="stylesheet" href="/fixture.css"><div id="root"></div><script>window.__atlasFixturesV109='+JSON.stringify(fixture).replaceAll('<','\\u003c')+'</script><script type="module" src="/fixture.js"></script>');}
 else{res.writeHead(404);res.end('Not found');}
});
await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
const origin='http://127.0.0.1:'+server.address().port,checks=[],errors=[],consoleErrors=[],httpErrors=[],captures=[];let browser,failure;
const sha=value=>createHash('sha256').update(value).digest('hex');await fs.mkdir(output,{recursive:true});
const sourceFiles=['app/game/HomeworldWorldMapV77.tsx','app/game/homeworldRouteWorkerV111.ts','app/game/systems/homeworldCourtArtV80.ts','app/game/systems/homeworldCivicDecorV80.ts','tests/browser/homeworld-atlas-v109.fixture.tsx','scripts/qa-homeworld-atlas-browser-v109.mjs'];
const sources=await Promise.all(sourceFiles.map(async file=>({path:file,sha256:sha(await fs.readFile(baselineHost&&path.join(root,file)===hostFile?baselineHost:path.join(root,file)))})));
async function check(name,run){const context=await browser.newContext({viewport:{width:1200,height:1000},reducedMotion:'reduce'}),page=await context.newPage();page.setDefaultTimeout(30000);page.on('pageerror',e=>errors.push(e.message));
 page.on('console',entry=>{if(entry.type()==='error')consoleErrors.push(entry.text());});page.on('response',response=>{if(response.status()>=400)httpErrors.push({url:response.url(),status:response.status()});});
 try{await context.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());await page.goto(origin);await page.getByRole('dialog',{name:'Carte des étages de la cité'}).waitFor();await run(page);checks.push({name,status:'PASS'});console.log('PASS '+name);}
 catch(error){checks.push({name,status:'FAIL',error:String(error)});failure??=error;await page.evaluate(()=>window.__atlasResumeFramesV113?.()).catch(()=>{});await page.screenshot({path:path.join(output,'failure-'+checks.length+'.png')}).catch(()=>{});console.error('FAIL '+name+': '+error.message);}
 finally{await context.close();}}
const follow=async page=>{await page.locator(`[data-map-landmark-v83="${f.b.npcId}"]`).click();await page.getByRole('button',{name:'Suivre ce repère à pied',exact:true}).click();};
async function capture(page,name,locator=page){const file=name+'.png';await locator.screenshot({path:path.join(output,file)});const bytes=await fs.readFile(path.join(output,file));captures.push({file,sha256:sha(bytes),bytes:bytes.length});}
async function holdWorker(page){await page.evaluate(()=>{const Native=window.Worker;window.__atlasNativeWorkerV109=Native;window.__atlasMessagesV109=[];window.__atlasTerminatedV109=0;
 window.Worker=class extends Native{addEventListener(type,listener,options){if(type!=='message')return super.addEventListener(type,listener,options);return super.addEventListener(type,event=>window.__atlasMessagesV109.push(()=>typeof listener==='function'?listener.call(this,event):listener.handleEvent(event)),options);}terminate(){window.__atlasTerminatedV109++;return super.terminate();}};});await follow(page);await page.waitForFunction(()=>window.__atlasMessagesV109.length>0);}
const release=page=>page.evaluate(()=>window.__atlasFlushV113(()=>{for(const dispatch of window.__atlasMessagesV109.splice(0))dispatch();}));
const holdFrames=page=>page.evaluate(()=>{
 const request=window.requestAnimationFrame.bind(window),cancel=window.cancelAnimationFrame.bind(window),pending=new Map();let next=0;
 window.requestAnimationFrame=callback=>{const id=--next;pending.set(id,callback);return id;};
 window.cancelAnimationFrame=id=>{if(!pending.delete(id))cancel(id);};
 window.__atlasResumeFramesV113=()=>{window.requestAnimationFrame=request;window.cancelAnimationFrame=cancel;const callbacks=[...pending.values()];pending.clear();window.__atlasFlushV113(()=>{for(const callback of callbacks)callback(performance.now());});};
});
const resumeFrames=page=>page.evaluate(()=>window.__atlasResumeFramesV113());
const assertNoRoute=async page=>{assert.equal(await page.locator('[data-homeworld-route-map-v98]').count(),0);assert.equal(await page.locator('[data-homeworld-route-guide-v111]').count(),0);};
async function openGuideOptions(page){const options=page.locator('[data-homeworld-guide-options-v111]');if(await options.getAttribute('open')===null)await options.locator('summary').click();}
async function openGuideMap(page){await openGuideOptions(page);await page.getByRole('button',{name:'Carte',exact:true}).click();}
try{
 const executable=process.env.CHROMIUM_EXECUTABLE_PATH??process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH??process.env.AUDIT_CHROME_EXECUTABLE;
 browser=await chromium.launch({headless:true,...(executable?{executablePath:executable}:process.env.AUDIT_CHROME_CHANNEL?{channel:process.env.AUDIT_CHROME_CHANNEL}:{executablePath:'/usr/bin/chromium'}),args:['--no-sandbox','--disable-dev-shm-usage']});
 await check('Actual module Worker returns a cargo-aware route and the atlas draws confirmed independent lot polygons',async page=>{await follow(page);await page.locator('[data-homeworld-route-guide-v109="walking"]').waitFor();assert.equal(await page.locator('[data-homeworld-route-guide-v109]').getAttribute('data-homeworld-route-current-v109'),'true');await openGuideMap(page);assert.equal(await page.locator('[data-map-cargo-lot-v109]').count(),2);const line=page.locator('[data-homeworld-route-map-v98] polyline').first();await line.waitFor();assert((await line.getAttribute('points')).split(' ').length>2);await page.getByRole('button',{name:'Agrandir le trajet à pied',exact:true}).click();const map=page.locator('svg[data-homeworld-map-focus-v109="route"]');assert(Number((await map.getAttribute('viewBox')).split(' ')[2])<2000);await capture(page,'actual-worker-cargo-detour',map);});
 await check('An actual deferred Worker result is discarded after confirmed ground placements change',async page=>{await holdWorker(page);await page.getByRole('button',{name:'Changer les lots confirmés · fixture',exact:true}).click();await page.waitForFunction(()=>window.__atlasTerminatedV109>0);await release(page);assert.equal(await page.locator('[data-homeworld-route-map-v98]').count(),0);assert.equal(await page.locator('[data-homeworld-route-guide-v109]').count(),0);assert.equal(await page.locator('[data-map-cargo-lot-v109][data-placement="ground"]').count(),0);});
 await check('An old owner response cannot display a route after another campaign slot is selected',async page=>{await holdWorker(page);await page.getByRole('button',{name:'Changer de partie · fixture',exact:true}).click();await page.waitForFunction(()=>window.__atlasTerminatedV109>0);await release(page);assert.equal(await page.locator('[data-homeworld-route-map-v98]').count(),0);assert.equal(await page.locator('[data-homeworld-route-guide-v109]').count(),0);});
 await check('A floor change invalidates the pending native Worker and its late response',async page=>{await holdWorker(page);await page.getByRole('button',{name:'Changer de lieu · fixture',exact:true}).click();await page.waitForFunction(()=>window.__atlasTerminatedV109>0);await release(page);assert.equal(await page.locator('[data-homeworld-route-map-v98]').count(),0);});
 await check('User cancellation terminates a pending actual worker and cannot be undone by its delayed response',async page=>{await holdWorker(page);await page.getByRole('button',{name:'Annuler le calcul',exact:true}).click();await release(page);assert.equal(await page.locator('[data-homeworld-route-map-v98]').count(),0);assert.equal(await page.locator('[data-homeworld-route-guide-v109]').count(),0);});
 await check('Parent suspension and unmount stop work instead of publishing a hidden route',async page=>{await holdWorker(page);await page.getByRole('button',{name:'Suspendre le parent · fixture',exact:true}).click();await page.waitForFunction(()=>window.__atlasTerminatedV109>0);await page.getByRole('button',{name:'Démonter le parent · fixture',exact:true}).click();await release(page);assert.equal(await page.locator('[data-homeworld-route-guide-v109]').count(),0);});
 await check('Existing guide becomes off-route and removes the old polyline after a real parent placement update',async page=>{await follow(page);await page.locator('[data-homeworld-route-guide-v109="walking"]').waitFor();await page.getByRole('button',{name:'Changer les lots confirmés · fixture',exact:true}).click();await page.locator('[data-homeworld-route-guide-v109="off-route"]').waitFor();assert.equal(await page.locator('[data-homeworld-route-guide-v109]').getAttribute('data-homeworld-route-current-v109'),'false');await openGuideOptions(page);assert.match(await page.locator('[data-homeworld-route-guide-v109]').innerText(),/Le lieu ou les charges ont changé/);await openGuideMap(page);assert.equal(await page.locator('[data-homeworld-route-map-v98]').count(),0);});
 for(const [name,close] of [
  ['close button',page=>page.getByRole('button',{name:'Fermer la carte',exact:true}).click()],
  ['Escape',page=>page.getByRole('dialog',{name:'Carte des étages de la cité'}).press('Escape')],
  ['external parent closure',page=>page.getByRole('button',{name:'Fermer depuis le parent · fixture',exact:true}).click()],
 ])await check('A native response released before the cancellation frame cannot revive the route after '+name,async page=>{
  await holdWorker(page);await holdFrames(page);await close(page);
  await page.locator('main[data-atlas-open="false"]').waitFor();await release(page);await assertNoRoute(page);
  assert((await page.evaluate(()=>window.__atlasTerminatedV109))>0);await resumeFrames(page);await assertNoRoute(page);
 });
 await check('Closing and reopening before an animation frame does not revive the old native request',async page=>{
  await holdWorker(page);await holdFrames(page);await page.getByRole('button',{name:'Fermer depuis le parent · fixture',exact:true}).click();
  await page.locator('main[data-atlas-open="false"]').waitFor();await page.getByRole('button',{name:'Ouvrir depuis le parent · fixture',exact:true}).click();
  await page.getByRole('dialog',{name:'Carte des étages de la cité'}).waitFor();await release(page);await assertNoRoute(page);await resumeFrames(page);
  await page.getByRole('button',{name:'Suivre ce repère à pied',exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:'Suivre ce repère à pied',exact:true}).isEnabled(),true);
 });
 await check('Committed parent suspension rejects native delivery before the deferred UI frame',async page=>{
  await holdWorker(page);await holdFrames(page);await page.getByRole('button',{name:'Suspendre le parent · fixture',exact:true}).click();
  await page.locator('main[data-atlas-suspended="true"]').waitFor();await release(page);await assertNoRoute(page);
  assert((await page.evaluate(()=>window.__atlasTerminatedV109))>0);await resumeFrames(page);
  await page.getByRole('button',{name:'Reprendre le parent · fixture',exact:true}).click();await follow(page);
  await page.waitForFunction(()=>window.__atlasMessagesV109.length>0);await release(page);await page.locator('[data-homeworld-route-guide-v111="walking"]').waitFor();
 });
 await check('An intentional recalculation from the closed guide still accepts the next native response',async page=>{
  await holdWorker(page);await release(page);await page.locator('[data-homeworld-route-guide-v111="walking"]').waitFor();
  await openGuideOptions(page);await page.getByRole('button',{name:'Recalculer',exact:true}).click();
  await page.waitForFunction(()=>window.__atlasMessagesV109.length>0);await release(page);
  assert.equal(await page.locator('main').getAttribute('data-atlas-open'),'false');assert.equal(await page.locator('[data-homeworld-route-guide-v111]').getAttribute('data-homeworld-route-current-v109'),'true');
  assert.equal(await page.getByRole('button',{name:'Recalculer',exact:true}).isEnabled(),true);
 });
 await check('A390px atlas keeps its register and cancellation controls inside the viewport',async page=>{await page.setViewportSize({width:390,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.locator('[data-homeworld-cargo-register-v109] summary').click();assert.equal(await page.locator('[data-homeworld-cargo-register-v109] li').count(),2);await capture(page,'mobile-cargo-register');});
 checks.push({name:'No uncaught browser exceptions, console errors or HTTP failures',status:errors.length||consoleErrors.length||httpErrors.length?'FAIL':'PASS'});assert.deepEqual(errors,[]);assert.deepEqual(consoleErrors,[]);assert.deepEqual(httpErrors,[]);
}catch(error){failure??=error;console.error(error);}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));await fs.writeFile(path.join(output,'result.json'),JSON.stringify({status:failure?'FAIL':'PASS',variant:baselineHost?'baseline-host':'working-tree',sources,scope:'Isolated actual React Atlas and current V111 module Worker. Prepared model-played cargo placements, direct fixture parent updates, and explicitly deferred native Worker delivery and animation frames test browser lifecycle boundaries; no campaign victory, production build or art admission is claimed.',checks,captures,errors,consoleErrors,httpErrors,fixtureIO:['Model-played initial carried/parked cargo checkpoint','Fixture parent changes for owner, floor, suspension and confirmed lot placements','Actual Worker message delivery delayed after computation; no route result or model outcome is fabricated','Animation frames may be held after a native response is ready to exercise cancellation before its UI update']},null,2)+'\n');console.log('Report: '+path.join(output,'result.json'));}
if(failure)reportGithubActionsFailure('Current Homeworld Atlas Worker integration',failure);
if(failure)process.exitCode=1;
