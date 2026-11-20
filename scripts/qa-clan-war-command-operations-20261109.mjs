/** Actual operations UI, real Web Locks/IDB and original W3 rules. No reducer or clock patches. */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';
import {chromium} from 'playwright-core';
const root=fileURLToPath(new URL('../',import.meta.url));
const out=path.resolve(root,process.env.COMMAND_OPERATIONS_OUTPUT||'production/clan-war-command-20261109/qa/operations/attempt-1');
await fs.mkdir(out,{recursive:true});await fs.writeFile(path.join(out,'run.lock'),new Date().toISOString()+'\n',{flag:'wx'});
await fs.copyFile(fileURLToPath(import.meta.url),path.join(out,'recipe-used.mjs'));
const sha=value=>createHash('sha256').update(value).digest('hex');
const domainBuild=await build({stdin:{contents:"export {DEFAULT_WAR_RULES_V6} from './app/game/systems/clanWarBibleV6';export {createWarOperationsV115,commandStealthV115} from './app/game/systems/clanWarOperationsV115';",resolveDir:root},bundle:true,platform:'node',format:'esm',write:false,logLevel:'warning'});
const domain=await import('data:text/javascript;base64,'+Buffer.from(domainBuild.outputFiles[0].contents).toString('base64'));
const startingWorld=domain.createWarOperationsV115(domain.DEFAULT_WAR_RULES_V6);
const firstTeamUpkeep=domain.DEFAULT_WAR_RULES_V6.units.find(unit=>unit.id===startingWorld.teams[0].unitId).upkeepRav;
const sourceNames=['app/game/ClanWarOperationsV115.tsx','app/game/ClanWarOperationsV115.module.css','app/game/ClanWarCommandOverlay.tsx','app/game/ClanWarCommandOverlay.module.css','app/game/systems/clanWarOperationsArchive.ts','app/game/systems/clanWarOperationsV115.ts','app/game/systems/clanWarFenceV94.ts','app/game/systems/clanWarStealthAcousticsV115.ts','app/game/systems/sceneAudio.ts','app/game/audioFiles.ts','app/game/sound.ts','tests/browser/clan-war-v151-four-modes.fixture.tsx','public/audio/manifest.json','public/audio/sfx/footstep/v54.wav','scripts/qa-clan-war-command-operations-20261109.mjs'];
const footstepPath='/audio/sfx/footstep/v54.wav';
const footstepEntry=JSON.parse(await fs.readFile(path.join(root,'public/audio/manifest.json'),'utf8')).entries.find(entry=>entry.id==='footstep');
const footstep=footstepEntry.sources.find(source=>new URL(source.url,'http://localhost').pathname===footstepPath);
const stealthMoves={up:'↑ Nord',left:'← Ouest',down:'↓ Sud',right:'→ Est',wait:'Attendre / récupérer énergie'};
function findListenRoute(start){
 const queue=[{world:start,route:[]}],seen=new Set();
 for(let index=0;index<queue.length;index++){
  const {world,route}=queue[index];
  if(!world.active || route.length>12)continue;
  const key=JSON.stringify(world.active.stealth)+':'+world.active.tick;
  if(seen.has(key))continue;
  seen.add(key);
  const result=domain.commandStealthV115(world,'listen',domain.DEFAULT_WAR_RULES_V6);
  if(result.listenCue)return {route,cue:result.listenCue};
  if(route.length===12)continue;
  for(const move of Object.keys(stealthMoves)){
   const next=domain.commandStealthV115(world,move,domain.DEFAULT_WAR_RULES_V6);
   if(next.accepted&&next.state.active?.mode==='stealth')queue.push({world:next.state,route:[...route,move]});
  }
 }
 throw new Error('No covered, audible patrol reached through legal actions');
}
const source=async()=>Object.fromEntries(await Promise.all(sourceNames.map(async name=>[name,sha(await fs.readFile(path.join(root,name)))])));
const report={schemaVersion:1,scope:'Actual production operations component and shared dialog, esbuild host with original W3 rules. Real browser events, localStorage, IDB and Web Locks. Not full GameClient, campaign, physical-controller or canonical-art certification.',checks:[],screenshots:[],errors:[],httpErrors:[],sourceBefore:await source(),canonicalKey:'yautja.clan-war.v115.operations.fenced.v2'};
const pass=(name,detail={})=>report.checks.push({name,passed:true,...detail});
const bundle=await build({absWorkingDir:root,entryPoints:['tests/browser/clan-war-v151-four-modes.fixture.tsx'],bundle:true,platform:'browser',format:'iife',jsx:'automatic',write:false,outfile:'command.js',logLevel:'warning'});
const js=bundle.outputFiles.find(f=>f.path.endsWith('.js')).contents,css=bundle.outputFiles.find(f=>f.path.endsWith('.css')).contents;
report.bundle={jsSha256:sha(js),cssSha256:sha(css)};
const html='<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Commandement des mandats</title><link rel="stylesheet" href="/command.css"><style>body{margin:0;background:#080f10;color:#e4eadf;font:14px system-ui}main{max-width:1440px;margin:auto}h1{margin:0;padding:12px;font:11px ui-monospace,monospace;color:#8b9e8c}*{box-sizing:border-box}</style></head><body><div id="root"></div><script src="/command.js"></script></body></html>';
const server=createServer(async(req,res)=>{
 const pathname=new URL(req.url??'/','http://localhost').pathname;
 if(pathname==='/'){res.writeHead(200,{'content-type':'text/html;charset=utf-8'});res.end(html);return;}
 if(pathname==='/command.js'){res.writeHead(200,{'content-type':'text/javascript'});res.end(js);return;}
 if(pathname==='/command.css'){res.writeHead(200,{'content-type':'text/css'});res.end(css);return;}
 if(pathname==='/favicon.ico'){res.writeHead(204);res.end();return;}
 const filename=path.resolve(root,'public','.'+decodeURIComponent(pathname));
 if(!filename.startsWith(path.join(root,'public')+path.sep)){res.writeHead(403);res.end();return;}
 try{const bytes=await fs.readFile(filename);res.writeHead(200,{'content-type':filename.endsWith('.svg')?'image/svg+xml':filename.endsWith('.png')?'image/png':filename.endsWith('.wav')?'audio/wav':filename.endsWith('.json')?'application/json':'application/octet-stream'});res.end(bytes);}catch{res.writeHead(404);res.end();}
});
let browser,context,page;
try{
 await new Promise((ok,fail)=>{server.once('error',fail);server.listen(0,'127.0.0.1',ok);});
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});report.browserVersion=browser.version();
 context=await browser.newContext({viewport:{width:1440,height:1000},locale:'fr-FR'});page=await context.newPage();page.setDefaultTimeout(20000);
 page.on('pageerror',e=>report.errors.push(e.message));page.on('response',r=>{if(r.status()>=400)report.httpErrors.push({url:r.url(),status:r.status()});});
 const url='http://127.0.0.1:'+server.address().port;report.url=url;await page.goto(url,{waitUntil:'networkidle'});
 const operations=page.locator('[data-testid="clan-operations-v115"]');await operations.waitFor();
 await operations.locator('[data-war-command="briefing"]').waitFor();
 await page.evaluate(()=>localStorage.setItem('independent-campaign-check','campaign-source-unchanged'));
 const archive=()=>page.evaluate(key=>localStorage.getItem(key),report.canonicalKey);
 assert.equal(await archive(),null);pass('Mount and command desks never initialize a war archive');
 const screenshot=async name=>{await page.screenshot({path:path.join(out,name)});report.screenshots.push({filename:name,sha256:sha(await fs.readFile(path.join(out,name))),opened:false});};
 await screenshot('01-command-desktop.png');
 for(const [id,title] of [['recruitment','Renforts de clan'],['medical','Triage du clan'],['reports','Comptes rendus'],['archive','Archives et règles']]){
  const trigger=operations.locator(`[data-war-command="${id}"]`);await trigger.click();
  const dialog=page.getByRole('dialog',{name:title,exact:true});await dialog.waitFor();
  assert.equal(await dialog.evaluate(el=>el.contains(document.activeElement)),true);
  await page.keyboard.press('Shift+Tab');await page.keyboard.press('Tab');assert.equal(await dialog.evaluate(el=>el.contains(document.activeElement)),true);
  await page.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});
  assert.equal(await trigger.evaluate(el=>el===document.activeElement),true);assert.equal(await archive(),null);
  pass(`${title}: native focus is confined, Escape restores trigger and no model is written`);
 }
 await operations.locator('[data-war-command="briefing"]').click();
 let dialog=page.getByRole('dialog',{name:'Préparer un mandat',exact:true});await dialog.waitFor();
 assert.equal(await dialog.locator('[data-war-briefing-panel="mode"]').isVisible(),true);
 assert.equal(await dialog.locator('[data-war-briefing-panel="target"]').isVisible(),false);
 await dialog.getByRole('button',{name:'Bataille totale · commandement RTS',exact:true}).click();
 await dialog.locator('[data-war-briefing-step-button="target"]').click();
 const lab=page.locator('[data-testid="v147-actual-four-mode-lab"]'),target=await lab.getAttribute('data-legal-target');
 assert.ok(target);await dialog.getByRole('combobox',{name:'Territoire de la Bible V6',exact:true}).selectOption(target);
 await dialog.locator('[data-war-briefing-step-button="teams"]').click();
 for(const choice of await dialog.locator('input[type="checkbox"]').all())await choice.uncheck();
 await dialog.locator('input[type="checkbox"]').first().check();
 assert.equal(await dialog.getByRole('button',{name:/^Lancer :/}).isEnabled(),true);
 await screenshot('01b-briefing-teams-desktop.png');
 await page.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});assert.equal(await archive(),null);
 pass('Briefing steps retain native selections, and cancellation never debits RAV');
 await operations.locator('[data-war-command="briefing"]').click();await dialog.waitFor();
 await dialog.locator('[data-war-briefing-step-button="teams"]').click();
 assert.equal(await dialog.locator('input[type="checkbox"]').first().isChecked(),true);
 await dialog.getByRole('button',{name:/^Lancer :/}).click();await dialog.waitFor({state:'hidden'});
 await page.waitForFunction(key=>{const value=JSON.parse(localStorage.getItem(key)||'null');return value?.active?.mode==='rts';},report.canonicalKey);
 const started=JSON.parse(await archive());assert.equal(started.rav,Number(await lab.getAttribute('data-initial-rav'))-firstTeamUpkeep);
 const missionId=started.active.id;assert.ok(missionId);await operations.getByRole('region',{name:'Mission jouable active'}).waitFor();
 pass('Briefing launches through the real V2 archive, spends exactly the selected unit’s source upkeep and reveals actual RTS terrain',{missionId,rav:started.rav,sourceUpkeepRav:firstTeamUpkeep});
 await screenshot('02-rts-field-desktop.png');
 await operations.getByRole('button',{name:'Passer en ordres alternés',exact:true}).click();
 await page.waitForFunction(key=>JSON.parse(localStorage.getItem(key)||'null')?.active?.rts?.realtime===false,report.canonicalKey);
 await operations.getByRole('button',{name:'Activer la bataille en temps réel',exact:true}).waitFor();
 pass('Actual player input pauses realtime through the original persistent RTS command');
 for(const width of [390,320]){
  await page.setViewportSize({width,height:844});
  const overflow=await operations.evaluate(el=>({scroll:el.scrollWidth,client:el.clientWidth}));assert.ok(overflow.scroll<=overflow.client+1,JSON.stringify(overflow));
  await operations.locator('[data-war-command="medical"]').click();
  dialog=page.getByRole('dialog',{name:'Triage du clan',exact:true});await dialog.waitFor();
  await dialog.evaluate(element=>Promise.all(element.getAnimations().map(animation=>animation.finished.catch(()=>{}))));
  const bounds=await dialog.boundingBox();assert.ok(bounds.x>=-1&&bounds.x+bounds.width<=width+1);
  assert.equal(await dialog.getByRole('button',{name:/Fermer :/}).isVisible(),true);
  await screenshot(`03-triage-${width}.png`);await page.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});
  assert.equal(JSON.parse(await archive()).active.id,missionId);
  pass(`${width}px: command HUD and drawer fit viewport; closing preserves actual mission`);
  await operations.locator('[data-war-command="briefing"]').click();dialog=page.getByRole('dialog',{name:'Préparer un mandat',exact:true});await dialog.waitFor();
  await dialog.locator('[data-war-briefing-step-button="teams"]').click();
  await dialog.evaluate(element=>Promise.all(element.getAnimations({subtree:true}).map(animation=>animation.finished.catch(()=>{}))));
  const briefingSize=await dialog.evaluate(el=>({scroll:el.scrollWidth,client:el.clientWidth}));assert.ok(briefingSize.scroll<=briefingSize.client+1,JSON.stringify(briefingSize));
  assert.equal(await dialog.getByRole('button',{name:/^Lancer :/}).isEnabled(),false);await screenshot(`05-briefing-${width}.png`);
  await page.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});assert.equal(JSON.parse(await archive()).active.id,missionId);
  pass(`${width}px: briefing remains readable and cannot relaunch an occupied playable slot`);
 }
 assert.equal(await page.evaluate(()=>localStorage.getItem('independent-campaign-check')),'campaign-source-unchanged');
 pass('Every command-menu interaction preserves unrelated campaign bytes');
 const beforeReload=JSON.parse(await archive());await page.reload({waitUntil:'networkidle'});await operations.locator('[data-war-command="briefing"]').waitFor();
 const reloaded=JSON.parse(await archive());assert.equal(reloaded.active.id,missionId);assert.equal(reloaded.rav,beforeReload.rav);
 assert.equal(await operations.getByRole('region',{name:'Mission jouable active'}).isVisible(),true);assert.equal(await page.getByRole('dialog').count(),0);
 pass('Reload restores the actual paused field and mission identity without reopening a drawer or debiting RAV again');
 await context.close();context=await browser.newContext({viewport:{width:1440,height:1000},locale:'fr-FR'});page=await context.newPage();page.setDefaultTimeout(20000);
 page.on('pageerror',e=>report.errors.push(e.message));page.on('response',r=>{if(r.status()>=400)report.httpErrors.push({url:r.url(),status:r.status()});});
 await page.addInitScript(expectedBytes=>{
  const decoded=new WeakSet(),outputs=new WeakMap();
  const probe={decoded:false,played:[]};
  window.stealthAudioProbe=probe;
  const decode=AudioContext.prototype.decodeAudioData;
  AudioContext.prototype.decodeAudioData=function(bytes,...args){
   const footstep=bytes.byteLength===expectedBytes;
   const result=decode.call(this,bytes,...args);
   if(footstep)void result.then(buffer=>{decoded.add(buffer);probe.decoded=true;},()=>{});
   return result;
  };
  const connect=AudioNode.prototype.connect;
  AudioNode.prototype.connect=function(target,...args){
   const result=connect.call(this,target,...args);
   if(target instanceof AudioNode)outputs.set(this,target);
   return result;
  };
  const start=AudioBufferSourceNode.prototype.start;
  AudioBufferSourceNode.prototype.start=function(...args){
   const result=start.apply(this,args);
   if(decoded.has(this.buffer)){
    const filter=outputs.get(this),envelope=outputs.get(filter),panner=outputs.get(envelope);
    probe.played.push({type:filter?.type??null,lowpassHz:filter?.frequency?.value??null,
     pan:panner?.pan?.value??null,sharedBus:Boolean(panner&&outputs.get(panner) instanceof GainNode)});
   }
   return result;
  };
 },footstep.bytes);
 await page.goto(url,{waitUntil:'networkidle'});
 const sampleResponse=page.waitForResponse(response=>new URL(response.url()).pathname===footstepPath&&response.ok());
 const stealthOperations=page.locator('[data-testid="clan-operations-v115"]');await stealthOperations.locator('[data-war-mode-card="stealth"]').click();
 dialog=page.getByRole('dialog',{name:'Préparer un mandat',exact:true});await dialog.waitFor();
 await dialog.getByRole('combobox',{name:'Territoire de la Bible V6',exact:true}).selectOption(target);
 await dialog.locator('[data-war-briefing-step-button="teams"]').click();for(const choice of await dialog.locator('input[type="checkbox"]').all())await choice.uncheck();
 await dialog.locator('input[type="checkbox"]').first().check();
 await dialog.getByRole('button',{name:/^Lancer :/}).click();await dialog.waitFor({state:'hidden'});
 await page.waitForFunction(key=>JSON.parse(localStorage.getItem(key)||'null')?.active?.mode==='stealth',report.canonicalKey);
 const stealthMap=stealthOperations.getByRole('group',{name:'Carte et commandes d’infiltration',exact:true});
 const readout=stealthOperations.locator('[data-war-field-mode="stealth"]').getByRole('status');
 const descriptions=(await stealthMap.getAttribute('aria-describedby')).split(' ');
 assert.equal(await readout.getAttribute('id'),descriptions[1]);
 assert.match(await stealthOperations.locator('[id='+JSON.stringify(descriptions[0])+']').textContent(),/Tab quitte la carte/);
 assert.equal(await readout.getAttribute('aria-atomic'),'true');
 const declaredGuards=async()=>((await readout.textContent()).match(/(?:Patrouille|Renfort) en \(/g)??[]).length;
 const renderedGuards=()=>stealthMap.locator('[data-actor="rival"]').count();
 assert.equal(await declaredGuards(),await renderedGuards());
 await stealthMap.focus();
 await page.keyboard.press('Tab');
 assert.equal(await stealthMap.evaluate(el=>el===document.activeElement),false);
 await page.keyboard.press('Shift+Tab');
 assert.equal(await stealthMap.evaluate(el=>el===document.activeElement&&getComputedStyle(el).outlineStyle==='solid'),true);
 let stealthBefore=JSON.parse(await archive());
 const {x,y}=stealthBefore.active.stealth;
 const initialMap=await readout.textContent();
 assert.ok(initialMap.includes(`Pisteur en (${x}, ${y}).`));
 assert.match(initialMap,/haut passage/);
 await page.keyboard.press('ArrowUp');
 await page.waitForFunction(({key,tick,y})=>{
  const active=JSON.parse(localStorage.getItem(key)||'null')?.active;
  return active?.tick===tick+1&&active.stealth.y===y-1;
 },{key:report.canonicalKey,tick:stealthBefore.active.tick,y});
 await page.waitForFunction(({id,position})=>document.getElementById(id)?.textContent?.includes(position),
  {id:descriptions[1],position:`Pisteur en (${x}, ${y-1}).`});
 assert.equal(await declaredGuards(),await renderedGuards());
 pass('Native tab order and arrow command expose the position, focus and visual patrol information on the real stealth field');
 await stealthOperations.locator('[data-war-command="reports"]').click();dialog=page.getByRole('dialog',{name:'Comptes rendus',exact:true});await dialog.waitFor();
 const coveredRaw=await archive();await stealthMap.focus();
 assert.equal(await dialog.evaluate(el=>el.contains(document.activeElement)),true);
 await page.keyboard.press('.');await page.keyboard.press('ArrowRight');
 assert.equal(await archive(),coveredRaw);pass('Tactical keyboard events never traverse an open native command drawer');
 await page.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});await stealthMap.focus();stealthBefore=JSON.parse(await archive());await page.keyboard.press('Space');
 await page.waitForFunction(({key,tick})=>JSON.parse(localStorage.getItem(key)||'null')?.active?.tick===tick+1,{key:report.canonicalKey,tick:stealthBefore.active.tick});
 pass('Closing the drawer restores a usable native stealth field without resetting its mission');
 await screenshot('04-stealth-field-desktop.png');
 const sample=await sampleResponse;
 assert.equal(sha(await sample.body()),footstep.sha256);
 await page.waitForFunction(()=>window.stealthAudioProbe.decoded);
 const listen=stealthOperations.getByRole('button',{name:'Écouter la patrouille (1 énergie)',exact:true});
 const listeningRoute=findListenRoute(JSON.parse(await archive()));
 for(const move of listeningRoute.route){
  const previous=JSON.parse(await archive()).active.tick;
  await stealthOperations.getByRole('button',{name:stealthMoves[move],exact:true}).click();
  await page.waitForFunction(({key,tick})=>JSON.parse(localStorage.getItem(key)||'null')?.active?.tick===tick+1,
   {key:report.canonicalKey,tick:previous});
 }
 assert.equal(await listen.isEnabled(),true);
 const audioState=()=>page.evaluate(()=>window.stealthAudioProbe.played);
 assert.equal((await audioState()).length,0);
 const beforeListen=await archive();
 await page.evaluate(key=>new Promise((held,reject)=>{
  let finish;
  const release=new Promise(resolve=>{finish=resolve;});
  const request=navigator.locks.request(key+'.write',()=>{held();return release;});
  window.releaseStealthAudioLock=()=>{finish();return request;};
  void request.catch(reject);
 }),report.canonicalKey);
 try {
  await listen.click();
  await stealthOperations.getByText('Une autre écriture V115 est en cours ; réessayez.',{exact:true}).waitFor();
  assert.equal(await archive(),beforeListen);
  assert.equal((await audioState()).length,0);
 } finally {
  await page.evaluate(()=>window.releaseStealthAudioLock());
 }
 const tickBeforeListen=JSON.parse(beforeListen).active.tick;
 await listen.click();
 await page.waitForFunction(({key,tick})=>JSON.parse(localStorage.getItem(key)||'null')?.active?.tick===tick+1,
  {key:report.canonicalKey,tick:tickBeforeListen});
 await page.waitForFunction(()=>window.stealthAudioProbe.played.length===1);
 assert.equal(JSON.parse(await archive()).active.stealth.heardBearing,listeningRoute.cue.bearing);
 const [played]=await audioState();
 assert.equal(played.type,'lowpass');
 assert.equal(played.lowpassHz,listeningRoute.cue.lowpassHz);
 assert.ok(Math.abs(played.pan-listeningRoute.cue.pan)<.00001);
 assert.equal(played.sharedBus,true);
 pass('The native listen gesture schedules the verified WAV through the shared spatial effects graph only after a successful archive write',
  {asset:footstepPath,sha256:footstep.sha256,bearing:listeningRoute.cue.bearing,steps:listeningRoute.route.length});
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.httpErrors,[]);pass('No page or resource errors');
 report.sourceAfter=await source();assert.deepEqual(report.sourceAfter,report.sourceBefore);pass('Sources and shared overlay remain byte-identical during native run');
 report.passed=true;
}catch(error){report.passed=false;report.failure={message:error.message,stack:error.stack};if(page)await page.screenshot({path:path.join(out,'failure.png')}).catch(()=>{});throw error;}
finally{await fs.writeFile(path.join(out,'report.browser-run.json'),JSON.stringify(report,null,2)+'\n');await context?.close();await browser?.close();await new Promise(ok=>server.close(ok));console.log(JSON.stringify({passed:report.passed,checks:report.checks.length,out}));}
