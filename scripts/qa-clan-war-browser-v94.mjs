/** Actual free-clan-war panel and stores, isolated localhost storage and native
 * locks. Static art uses a placeholder; this is not the campaign/visual audit. */
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';
import {chromium} from 'playwright-core';
const root=fileURLToPath(new URL('../',import.meta.url));
const compiled=await build({entryPoints:[path.join(root,'tests/browser/clan-war-v94.fixture.tsx')],bundle:true,write:false,outdir:path.join(root,'outputs/qa-clan-war-v94-build'),format:'esm',platform:'browser',jsx:'automatic',logLevel:'silent',define:{'process.env.NODE_ENV':'"production"'},plugins:[{name:'test-static-next-image',setup(b){
 b.onResolve({filter:/^next\/image$/},()=>({path:'image',namespace:'static-test-image'}));
 b.onLoad({filter:/.*/,namespace:'static-test-image'},()=>({contents:`import React from 'react'; export default function Image({unoptimized,priority,fill, ...props}) { return React.createElement('img',props); }`,loader:'js',resolveDir:root}));
}}]});
const js=compiled.outputFiles.find(f=>f.path.endsWith('.js')).contents,css=compiled.outputFiles.find(f=>f.path.endsWith('.css'))?.contents??'';
const pixel=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==','base64');
const server=http.createServer((req,res)=>{
 if(req.url==='/fixture.js'){res.setHeader('Content-Type','text/javascript; charset=utf-8');res.end(js);}
 else if(req.url==='/fixture.css'){res.setHeader('Content-Type','text/css; charset=utf-8');res.end(css);}
 else if(req.url.startsWith('/game/')){res.setHeader('Content-Type','image/png');res.end(pixel);}
 else if(req.url==='/'){res.setHeader('Content-Type','text/html; charset=utf-8');res.end('<!doctype html><title>Clan war QA</title><link rel="stylesheet" href="/fixture.css"><div id="root"></div><script type="module" src="/fixture.js"></script>');}
 else {res.writeHead(404);res.end();}
});
await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
const origin=`http://127.0.0.1:${server.address().port}`,results=[],errors=[];
let browser;
try{
 browser=await chromium.launch({headless:process.env.AUDIT_CHROME_HEADED!=='1',...(process.env.AUDIT_CHROME_EXECUTABLE?{executablePath:process.env.AUDIT_CHROME_EXECUTABLE}:process.env.AUDIT_CHROME_CHANNEL?{channel:process.env.AUDIT_CHROME_CHANNEL}:{})});
 async function check(name,run){const ctx=await browser.newContext({viewport:{width:1200,height:900}});await ctx.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
  const page=await ctx.newPage();page.setDefaultTimeout(6000);page.on('pageerror',e=>errors.push(e.message));
  try{await page.goto(origin);await page.waitForFunction(()=>window.__warApiV94&&window.__warUiV94);await page.bringToFront();await run(page,ctx);results.push({name,status:'PASS'});console.log('PASS '+name);}
  catch(e){results.push({name,status:'FAIL',error:e.message});console.error('FAIL '+name+': '+e.message);}
  finally{await ctx.close();}
 }
 async function prepare(page){
  for(const name of ['Exercice V3 · canyon','Grimper à la corniche · observer les signaux','Rejoindre la maintenance par la rampe','Préserver le refuge · réserve propre et détour','Atteindre le poste et transmettre le renseignement','Sceller le manifeste et prendre le commandement'])await page.getByRole('button',{name,exact:true}).click();
  await page.waitForFunction(()=>JSON.parse(localStorage.getItem(window.__warApiV94.CANYON_STORAGE_KEY_V85)||'null')?.phase==='battle');
 }
 const seconds=page=>page.evaluate(()=>JSON.parse(localStorage.getItem(window.__warApiV94.CANYON_STORAGE_KEY_V85)).seconds);
 await check('played preparation writes the canyon and survives reload without touching campaign bytes',async page=>{
  await page.evaluate(()=>localStorage.setItem('yautja-long-hunt.save','campaign-sentinel'));await prepare(page);
  await page.getByRole('button',{name:'Avancer d’une seconde',exact:true}).click();await page.waitForFunction(()=>JSON.parse(localStorage.getItem(window.__warApiV94.CANYON_STORAGE_KEY_V85)).seconds===1);
  await page.reload();await page.getByRole('button',{name:'Exercice V3 · canyon',exact:true}).click();assert.equal(await seconds(page),1);assert.equal(await page.evaluate(()=>localStorage.getItem('yautja-long-hunt.save')),'campaign-sentinel');
 });
 await check('parent suspension and an inert settings overlay stop the actual tactical clock',async page=>{
  await prepare(page);await page.getByRole('button',{name:'Reprendre le temps',exact:true}).click();await page.waitForFunction(()=>JSON.parse(localStorage.getItem(window.__warApiV94.CANYON_STORAGE_KEY_V85)).seconds>=1);
  await page.evaluate(()=>window.__warUiV94.suspend(true));const stopped=await seconds(page);await page.waitForTimeout(1200);assert.equal(await seconds(page),stopped);
  await page.evaluate(()=>{window.__warUiV94.suspend(false);window.__warUiV94.overlay(true);});await page.waitForTimeout(1200);assert.equal(await seconds(page),stopped);
  await page.evaluate(()=>window.__warUiV94.overlay(false));await page.waitForFunction(n=>JSON.parse(localStorage.getItem(window.__warApiV94.CANYON_STORAGE_KEY_V85)).seconds>n,stopped);
 });
 await check('focus loss stops the clock before React cleanup; focus return resumes without catch-up',async(page,ctx)=>{
  // Playwright normally forces every target to look focused. Disable that
  // override; document.hasFocus and focus/blur now come from Chrome itself.
  const protocol=await ctx.newCDPSession(page);await protocol.send('Emulation.setFocusEmulationEnabled',{enabled:false});
  await prepare(page);await page.getByRole('button',{name:'Reprendre le temps',exact:true}).click();await page.waitForFunction(()=>JSON.parse(localStorage.getItem(window.__warApiV94.CANYON_STORAGE_KEY_V85)).seconds>=1);
  assert.equal(process.env.AUDIT_CHROME_HEADED,'1','Native focus scenario requires headed Chrome; run under xvfb-run in CI.');const other=await ctx.newPage();await other.goto('about:blank');await other.bringToFront();await page.waitForFunction(()=>!document.hasFocus());
  const stopped=await seconds(page);await page.waitForTimeout(1800);assert.equal(await seconds(page),stopped);
  await page.bringToFront();await page.waitForFunction(()=>document.hasFocus());await page.waitForTimeout(250);assert.equal(await seconds(page),stopped);
  await page.waitForFunction(n=>JSON.parse(localStorage.getItem(window.__warApiV94.CANYON_STORAGE_KEY_V85)).seconds===n+1,stopped);
 });
 await check('a returned formation is replaced by an available selection instead of blocking orders',async page=>{
  await page.evaluate(()=>{const a=window.__warApiV94;let c=a.createCanyonV85();for(const act of ['corniche','maintenance','preserve','poste'])c=a.canyonPreparationV85(c,act);c=a.engageCanyonV85(c,a.CANYON_PRESET_V85);c=a.orderCanyonFormationV85(c,c.formations[0].id,'extract',96,0).state;for(let n=0;n<16;n++)c=a.stepCanyonV85(c);if(!c.formations[0].extraction)throw Error('fixture must have extracted first formation');localStorage.setItem(a.CANYON_STORAGE_KEY_V85,JSON.stringify(c));});
  await page.reload();await page.getByRole('button',{name:'Exercice V3 · canyon',exact:true}).click();assert.equal(await page.getByRole('button',{name:'Transmettre l’ordre',exact:true}).isEnabled(),true);const expected=await page.evaluate(()=>JSON.parse(localStorage.getItem(window.__warApiV94.CANYON_STORAGE_KEY_V85)).formations.find(f=>!f.extraction).id);assert.equal(await page.getByRole('combobox',{name:/^Formation/}).inputValue(),expected);
 });
 await check('dropped archive writes show an unconfirmed result and retry saves it without duplicate rewards',async page=>{
  await prepare(page);await page.getByRole('button',{name:'Déclarer le repli',exact:true}).click();await page.waitForFunction(()=>JSON.parse(localStorage.getItem(window.__warApiV94.CANYON_STORAGE_KEY_V85)).phase==='debrief');
  await page.evaluate(()=>{window.__originalSetV94=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k!==window.__warApiV94.CANYON_STORAGE_KEY_V85)window.__originalSetV94.call(this,k,v);};});
  await page.getByRole('button',{name:'Archiver le résultat une fois',exact:true}).click();await page.getByRole('button',{name:'Résultat en mémoire · sauvegarde non confirmée',exact:true}).waitFor();assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem(window.__warApiV94.CANYON_STORAGE_KEY_V85)).committed),false);
  const retry=page.getByRole('button',{name:'Réessayer la sauvegarde des exercices',exact:true});await retry.waitFor();assert.equal(await retry.isEnabled(),true);await page.evaluate(()=>{Storage.prototype.setItem=window.__originalSetV94;});await retry.click();await page.getByRole('button',{name:'Résultat déjà archivé',exact:true}).waitFor();assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem(window.__warApiV94.CANYON_STORAGE_KEY_V85)).committed),true);
 });
 await check('two live stores use native locks and cannot overwrite one another from a stale snapshot',async(page,ctx)=>{
  const second=await ctx.newPage();await second.goto(origin);await second.waitForFunction(()=>window.__warApiV94);
  for(const p of [page,second])await p.evaluate(async()=>{const a=window.__warApiV94;window.__writeTraceV94=[];const trace=(action,key,raw)=>{if(key===a.WAR_STORAGE_KEY_V85)window.__writeTraceV94.push({action,raw,time:Date.now()});};window.__sessionV94=a.createWarSessionV85(()=>({getItem(key){const raw=localStorage.getItem(key);trace('read',key,raw);return raw;},setItem(key,raw){trace('write',key,raw);localStorage.setItem(key,raw);}}));window.__sessionV94.subscribe(()=>{});await window.__sessionV94.whenSettled();if(!window.__sessionV94.getSnapshot().loaded)throw Error('Unhydrated test store');});
  const runs=await Promise.all([page.evaluate(async()=>{const s=window.__sessionV94;s.setSimulation(v=>({...v,turn:7}));await s.whenSettled();return s.getSnapshot().persistedWar;}),second.evaluate(async()=>{const s=window.__sessionV94;s.setSimulation(v=>({...v,turn:9}));await s.whenSettled();return s.getSnapshot().persistedWar;})]);
  const traces=await Promise.all([page,second].map(p=>p.evaluate(()=>({trace:window.__writeTraceV94,snapshot:window.__sessionV94.getSnapshot(),disk:localStorage.getItem(window.__warApiV94.WAR_STORAGE_KEY_V85)}))));console.log('CONCURRENCY_TRACE '+JSON.stringify({runs,traces:traces.map(t=>({writes:t.trace.filter(e=>e.action==='write').length,turn:t.snapshot.simulation.turn,persisted:t.snapshot.persistedWar,message:t.snapshot.storageMessage}))}));assert.equal(runs.filter(Boolean).length,1);assert.ok([7,9].includes(await page.evaluate(()=>JSON.parse(localStorage.getItem(window.__warApiV94.WAR_STORAGE_KEY_V85)).turn)));
 });
 await check('new bytes arriving while a native lock is held are refused before a delayed write',async(page,ctx)=>{
  const second=await ctx.newPage();await second.goto(origin);await second.waitForFunction(()=>window.__warApiV94);
  await second.evaluate(()=>{window.__lockHeldV94=false;window.__lockDoneV94=navigator.locks.request('yautja-full-archive-transfer',()=>new Promise(resolve=>{window.__releaseV94=resolve;window.__lockHeldV94=true;}));});await second.waitForFunction(()=>window.__lockHeldV94);
  await page.evaluate(async()=>{const a=window.__warApiV94;window.__sessionV94=a.createWarSessionV85(()=>localStorage);window.__sessionV94.subscribe(()=>{});await window.__sessionV94.whenSettled();window.__sessionV94.setSimulation(v=>({...v,turn:2}));});
  await second.evaluate(()=>localStorage.setItem(window.__warApiV94.WAR_STORAGE_KEY_V85,'foreign-protected-bytes'));
  await second.evaluate(async()=>{window.__releaseV94();await window.__lockDoneV94;});const result=await page.evaluate(async()=>{await window.__sessionV94.whenSettled();return{raw:localStorage.getItem(window.__warApiV94.WAR_STORAGE_KEY_V85),saved:window.__sessionV94.getSnapshot().persistedWar};});assert.equal(result.raw,'foreign-protected-bytes');assert.equal(result.saved,false);
 });
 await check('unmount cancels the tactical timer rather than advancing an invisible battle',async page=>{
  await prepare(page);await page.getByRole('button',{name:'Reprendre le temps',exact:true}).click();await page.waitForFunction(()=>JSON.parse(localStorage.getItem(window.__warApiV94.CANYON_STORAGE_KEY_V85)).seconds>=1);await page.evaluate(()=>window.__warUiV94.unmount());const stopped=await seconds(page);await page.waitForTimeout(1200);assert.equal(await seconds(page),stopped);
 });
 results.push({name:'No uncaught browser exceptions',status:errors.length?'FAIL':'PASS',errors});
 const report={scope:'Actual free exercise panel/stores, native Web Locks and localStorage; fixture profile and placeholder art; not a played campaign',browser:browser.version(),results};
 await fs.mkdir(path.join(root,'outputs/qa-audit-v94'),{recursive:true});await fs.writeFile(path.join(root,'outputs/qa-audit-v94/clan-war-browser.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));if(results.some(r=>r.status!=='PASS'))process.exitCode=1;
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
