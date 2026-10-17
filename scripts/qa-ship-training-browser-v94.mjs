/** Real ShipHub + TrainingDrill + native localStorage; synthetic campaign and
 * substituted images. No whole campaign or hardware qualification. */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {build} from 'esbuild';
import {chromium} from 'playwright-core';
const root=fileURLToPath(new URL('../',import.meta.url));
const bundle=await build({absWorkingDir:root,entryPoints:['tests/browser/ship-training-v94.fixture.tsx'],bundle:true,write:false,outdir:'outputs/ship-training-build',jsx:'automatic',platform:'browser',format:'esm',logLevel:'silent',plugins:[{name:'image-fixture',setup(b){b.onResolve({filter:/^next\/image$/},()=>({path:'image',namespace:'fixture'}));b.onLoad({filter:/.*/,namespace:'fixture'},()=>({contents:"import React from 'react';export default function Image({unoptimized,priority,fill,...props}){return React.createElement('img',props)}",loader:'js',resolveDir:root}));}}]});
const js=bundle.outputFiles.find(f=>f.path.endsWith('.js')).contents,css=bundle.outputFiles.find(f=>f.path.endsWith('.css'))?.contents??'';
const pixel=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==','base64');
const server=createServer((req,res)=>{
 if(req.url==='/fixture.js'){res.writeHead(200,{'Content-Type':'text/javascript; charset=utf-8'});res.end(js);}
 else if(req.url==='/fixture.css'){res.writeHead(200,{'Content-Type':'text/css; charset=utf-8'});res.end(css);}
 else if(req.url.startsWith('/game/')){res.writeHead(200,{'Content-Type':'image/png'});res.end(pixel);}
 else if(req.url==='/'){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end('<!doctype html><html lang="fr"><meta charset="utf-8"><title>Ship training QA</title><link rel="stylesheet" href="/fixture.css"><body><div id="root"></div><script type="module" src="/fixture.js"></script></body></html>');}
 else{res.writeHead(404);res.end();}
});
let browser;const results=[],errors=[];
try{
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});const origin=`http://127.0.0.1:${server.address().port}`;
 browser=await chromium.launch({...process.env.AUDIT_CHROME_EXECUTABLE?{executablePath:process.env.AUDIT_CHROME_EXECUTABLE}:process.env.AUDIT_CHROME_CHANNEL?{channel:process.env.AUDIT_CHROME_CHANNEL}:{},headless:true});
 async function scenario(name,run){const context=await browser.newContext({viewport:{width:1100,height:1000}});await context.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());const page=await context.newPage();page.setDefaultTimeout(7000);page.on('pageerror',e=>errors.push(e.message));
  try{await page.goto(origin);await page.bringToFront();await page.waitForFunction(()=>window.__shipQa?.adopted.length>0);await page.getByRole('button',{name:/Ciblage/}).waitFor();await page.waitForFunction(()=>![...document.querySelectorAll("button")].find(b=>b.textContent.includes("Ciblage"))?.disabled);await run(page);results.push({name,status:'PASS'});console.log('PASS '+name);}
  catch(e){results.push({name,status:'FAIL',error:String(e)});console.error('FAIL '+name+': '+e);}
  finally{await context.close();}}
 const paint=page=>page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
 const disk=page=>page.evaluate(()=>JSON.parse(localStorage.getItem(window.__shipQa.sidecarKey)));
 const writes=page=>page.evaluate(()=>window.__shipQa.writes.length);
 async function open(page,label='Ciblage'){await page.getByRole('button',{name:new RegExp(label)}).click();await page.getByRole('button',{name:/Commencer l’épreuve/}).click();}
 async function finish(page,mode='buttons'){
  const count=await page.locator('[aria-label="Séquence d’entraînement"] > span').count();
  for(let i=0;i<count;i++){const glyph=(await page.locator('[aria-label="Commande actuelle"] strong').first().textContent()).trim(),index={'←':0,'→':1,A:2,B:3}[glyph];assert.notEqual(index,undefined);
   if(mode==='keys'){await page.locator('.training-drill-panel').focus();await page.keyboard.press(['f','g','h','i'][index]);}
   else await page.getByRole('group',{name:'Commandes tactiles'}).getByRole('button').nth(index).click();
   await page.waitForFunction(n=>Number(document.querySelector('[aria-label="Progression de l’épreuve"]')?.getAttribute('aria-valuenow'))>=n,Math.round((i+1)/count*100));}
  assert.match(await page.locator('.training-drill-panel').textContent(),new RegExp(`${count}/${count} réponses correctes`));
  await page.getByRole('button',{name:'Consigner le résultat',exact:true}).click();await paint(page);return count;
 }
 for(const [id,label,mode] of [['targeting','Ciblage','buttons'],['wristblades','wristblades','buttons'],['cloaking','Approche camouflée','keys'],['mobility','Mobilité','buttons'],['honor-duel','Duel','buttons']])await scenario(`${id}: authored sequence reaches a confirmed native sidecar and survives reload`,async page=>{
  await open(page,label);await finish(page,mode);await page.waitForFunction(([key,id])=>JSON.parse(localStorage.getItem(key)).training[id].attempts===1,[await page.evaluate(()=>window.__shipQa.sidecarKey),id]);
  await page.waitForSelector('.training-drill-panel',{state:'detached'});assert.equal(await writes(page),1);assert.ok((await disk(page)).training[id].lastScore>=85);await page.reload();await page.waitForFunction(()=>window.__shipQa.adopted.length>0);assert.equal((await disk(page)).training[id].attempts,1);
 });
 await scenario('dropped training write keeps the result and retries once without replaying gestures',async page=>{await open(page);await page.evaluate(()=>window.__shipQa.fault('drop'));await finish(page);assert.equal((await disk(page)).training.targeting.attempts,0);await page.getByRole('button',{name:'Réessayer la sauvegarde du score',exact:true}).waitFor();const count=await writes(page);await page.waitForTimeout(400);assert.equal(await writes(page),count);await page.evaluate(()=>window.__shipQa.fault('none'));await page.getByRole('button',{name:'Réessayer la sauvegarde du score',exact:true}).click();await page.waitForSelector('.training-drill-panel',{state:'detached'});assert.equal((await disk(page)).training.targeting.attempts,1);assert.equal(await writes(page),count+1);});
 await scenario('a closed drill can reconcile a readback failure from the ship without a second write',async page=>{await open(page);await page.evaluate(()=>window.__shipQa.fault('readback'));await finish(page);await page.getByRole('button',{name:'Fermer l’épreuve',exact:true}).click();await page.getByRole('button',{name:'Réessayer la sauvegarde du score',exact:true}).waitFor();assert.equal(await writes(page),1);await page.setViewportSize({width:390,height:844});await page.getByRole('button',{name:'Réessayer la sauvegarde du score',exact:true}).click();await paint(page);assert.equal((await disk(page)).training.targeting.attempts,1);assert.equal(await writes(page),1);});
 await scenario('actual ShipHub forwards suspension and gamepad-disabled state into the drill',async page=>{await page.evaluate(()=>window.__shipQa.padEnabled(false));await open(page);await page.evaluate(()=>{window.__shipPad.buttons[1].pressed=true;window.__shipQa.pause(true);});await paint(page);const value=await page.getByRole('progressbar',{name:'Temps restant pour répondre'}).getAttribute('aria-valuenow');await page.waitForTimeout(1300);assert.equal(await page.getByRole('progressbar',{name:'Temps restant pour répondre'}).getAttribute('aria-valuenow'),value);await page.evaluate(()=>window.__shipQa.pause(false));await paint(page);assert.equal(await page.getByRole('progressbar',{name:'Progression de l’épreuve'}).getAttribute('aria-valuenow'),'0');});
 await scenario('an external score received after leaving the actual ShipHub cannot write',async page=>{await page.evaluate(()=>window.__shipQa.external(true));await paint(page);await page.getByRole('button',{name:/Ciblage/}).click();await page.waitForFunction(()=>window.__shipQa.externalCalls===1);await page.evaluate(()=>window.__shipQa.show(false));await paint(page);await page.evaluate(()=>window.__shipQa.resolve(95));await page.waitForTimeout(200);assert.equal(await writes(page),0);});
 await scenario('cancelled external request cannot write or replace the next active exercise',async page=>{await page.evaluate(()=>window.__shipQa.external(true));await paint(page);await page.getByRole('button',{name:/Ciblage/}).click();await page.getByRole('button',{name:'Annuler l’attente',exact:true}).click();await page.evaluate(()=>{window.__shipQa.external(false);window.__shipQa.resolve(99);});await paint(page);assert.equal(await writes(page),0);await open(page,'Mobilité');assert.equal(await page.locator('.training-drill-panel').count(),1);});
 await scenario('failed loadout and medbay writes do not announce successful actions',async page=>{const before=await disk(page);await page.evaluate(()=>window.__shipQa.fault('drop'));await page.getByRole('button',{name:'Armurerie',exact:true}).click();await page.getByRole('button',{name:/Enregistrer dans/}).click();assert.match((await page.evaluate(()=>window.__shipQa.notifications)).at(-1),/non confirmée/);assert.deepEqual((await disk(page)).loadoutPresets,before.loadoutPresets);await page.getByRole('button',{name:'Medbay',exact:true}).click();await page.getByRole('button',{name:/Traitement des blessures/}).click();assert.match((await page.evaluate(()=>window.__shipQa.notifications)).at(-1),/non confirmée/);assert.equal((await disk(page)).medbay.status,'ready');});

 await scenario('a throwing opening and success observer cannot strand an external score',async page=>{
  await page.evaluate(()=>{window.__shipQa.external(true);window.__shipQa.throwNotifications=true;});await paint(page);
  await page.getByRole('button',{name:/Ciblage/}).click();await page.waitForFunction(()=>window.__shipQa.externalCalls===1);
  await page.evaluate(()=>window.__shipQa.resolve(91));await page.waitForSelector('[aria-label="Épreuve externe"]',{state:'detached'});
  assert.equal((await disk(page)).training.targeting.attempts,1);assert.equal(await writes(page),1);
  assert.match((await page.evaluate(()=>window.__shipQa.notifications)).at(-1),/sauvegardé/);
 });
 await scenario('played score survives a throwing warning observer and explicit save retry',async page=>{
  await open(page);await page.evaluate(()=>{window.__shipQa.fault('drop');window.__shipQa.throwNotifications=true;});await finish(page);
  assert.equal((await disk(page)).training.targeting.attempts,0);
  const retry=page.getByRole('button',{name:'Réessayer la sauvegarde du score',exact:true});await retry.waitFor();
  const before=await writes(page);await page.evaluate(()=>window.__shipQa.fault('none'));await retry.click();
  await page.waitForSelector('.training-drill-panel',{state:'detached'});assert.equal((await disk(page)).training.targeting.attempts,1);assert.equal(await writes(page),before+1);
 });
 await scenario('a disconnected controller in an earlier slot cannot hide the live controller',async page=>{
  await page.locator('[data-ship-room]').focus();await page.evaluate(()=>{
   const dead={...window.__shipPad,connected:false,index:0},live={...window.__shipPad,index:3,id:'Live QA'};
   window.__liveShipPad=live;Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>[dead,null,null,live]});
  });await paint(page);await page.evaluate(()=>{window.__liveShipPad.buttons[1].pressed=true;});await paint(page);
  assert.equal(await page.locator('[data-ship-room]').getAttribute('data-ship-room'),'bridge-map');assert.equal(await writes(page),0);
 });
 await scenario('Back wins over simultaneous room navigation and activation in the actual hub',async page=>{
  await page.locator('[data-ship-room]').focus();await paint(page);
  await page.evaluate(()=>{for(const i of [0,1,15])window.__shipPad.buttons[i].pressed=true;});await paint(page);
  assert.equal(await page.locator('[data-ship-room]').getAttribute('data-ship-room'),'bridge-map');assert.equal(await page.locator('.training-drill-panel').count(),0);
  assert.equal(await writes(page),0);await page.waitForTimeout(150);assert.equal(await page.locator('.training-drill-panel').count(),0);
 });
 await scenario('nonfinite axes and a held replacement controller cannot trigger a room or drill',async page=>{
  await page.locator('[data-ship-room]').focus();await paint(page);
  await page.evaluate(()=>{window.__shipPad.axes=[Infinity,-Infinity];});await paint(page);
  assert.equal(await page.locator('[data-ship-room]').getAttribute('data-ship-room'),'training');
  await page.evaluate(()=>{window.__shipPad.axes=[0,0];window.__shipPad.id='Replacement QA';window.__shipPad.index=4;window.__shipPad.buttons[0].pressed=true;});await paint(page);
  assert.equal(await page.locator('.training-drill-panel').count(),0);
  await page.evaluate(()=>{window.__shipPad.buttons[0].pressed=false;});await paint(page);
  await page.evaluate(()=>{window.__shipPad.buttons[0].pressed=true;});await page.waitForSelector('.training-drill-panel');assert.equal(await writes(page),0);
 });

 const backup=page=>page.evaluate(()=>window.__shipQa.recovery().read(window.__shipQa.owner));
 const waitBackup=async page=>{await page.locator('[data-training-recovery]').filter({hasText:'Copie de secours du score confirmée'}).waitFor();assert.ok(await backup(page));};
 await scenario('a played pending score survives a full reload and saves exactly once on explicit recovery',async page=>{
  await open(page);await page.evaluate(()=>window.__shipQa.fault('drop'));await finish(page);await waitBackup(page);
  const saved=JSON.parse(await backup(page));assert.equal((await disk(page)).training.targeting.attempts,0);
  await page.reload();await page.getByRole('button',{name:'Réessayer la sauvegarde du score',exact:true}).waitFor();assert.equal(await writes(page),0);assert.equal((await disk(page)).training.targeting.attempts,0);
  await page.setViewportSize({width:390,height:844});await page.getByRole('button',{name:'Réessayer la sauvegarde du score',exact:true}).click();
  await page.waitForFunction(()=>JSON.parse(localStorage.getItem(window.__shipQa.sidecarKey)).training.targeting.attempts===1);assert.equal(await writes(page),1);assert.equal((await disk(page)).training.targeting.lastCompletedAt,saved.completedAt);
  await page.waitForFunction(async()=>await window.__shipQa.recovery().read(window.__shipQa.owner)===null);
 });
 await scenario('closing the browser page and reopening its profile retains the pending authored score',async page=>{
  await open(page,'Mobilité');await page.evaluate(()=>window.__shipQa.fault('drop'));await finish(page);await waitBackup(page);const context=page.context();await page.close();
  const next=await context.newPage();next.on('pageerror',e=>errors.push(e.message));await next.goto(origin);await next.bringToFront();
  await next.getByRole('button',{name:'Réessayer la sauvegarde du score',exact:true}).waitFor();assert.equal((await disk(next)).training.mobility.attempts,0);assert.equal(await writes(next),0);
  await next.getByRole('button',{name:'Réessayer la sauvegarde du score',exact:true}).click();await next.waitForFunction(()=>JSON.parse(localStorage.getItem(window.__shipQa.sidecarKey)).training.mobility.attempts===1);assert.equal(await writes(next),1);
 });
 await scenario('written-before-readback-failure is acknowledged after reload with zero duplicate sidecar writes',async page=>{
  await open(page);await page.evaluate(()=>window.__shipQa.fault('readback'));await finish(page);await waitBackup(page);assert.equal(await writes(page),1);
  await page.reload();await page.getByRole('button',{name:'Réessayer la sauvegarde du score',exact:true}).waitFor();assert.equal(await writes(page),0);
  await page.getByRole('button',{name:'Réessayer la sauvegarde du score',exact:true}).click();await page.waitForFunction(async()=>await window.__shipQa.recovery().read(window.__shipQa.owner)===null);
  assert.equal((await disk(page)).training.targeting.attempts,1);assert.equal(await writes(page),0);
 });
 await scenario('leaving and reopening ShipHub recovers its unconfirmed score without another drill',async page=>{
  await open(page);await page.evaluate(()=>window.__shipQa.fault('drop'));await finish(page);await waitBackup(page);
  await page.evaluate(()=>window.__shipQa.show(false));await paint(page);await page.evaluate(()=>{window.__shipQa.fault('none');window.__shipQa.show(true);});
  await page.getByRole('button',{name:'Réessayer la sauvegarde du score',exact:true}).waitFor();assert.equal(await page.locator('.training-drill-panel').count(),0);
  await page.getByRole('button',{name:'Réessayer la sauvegarde du score',exact:true}).click();await page.waitForFunction(()=>JSON.parse(localStorage.getItem(window.__shipQa.sidecarKey)).training.targeting.attempts===1);
 });
 await scenario('foreign concurrent recovery bytes cannot be overwritten or removed by a stale console',async page=>{
  const raw=JSON.stringify({version:999,protected:true});await page.evaluate(raw=>window.__shipQa.recovery().replace(window.__shipQa.owner,null,raw),raw);
  await open(page);await page.evaluate(()=>window.__shipQa.fault('drop'));await finish(page);
  await page.locator('[data-training-recovery]').filter({hasText:'non confirmée ou modifiée'}).waitFor();assert.equal(await backup(page),raw);
  await page.getByRole('button',{name:'Fermer l’épreuve',exact:true}).click();page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'Abandonner cette reprise',exact:true}).click();
  await page.locator('[data-training-recovery]').filter({hasText:'Abandon non confirmé'}).waitFor();assert.equal(await backup(page),raw);
 });
 await scenario('incompatible backup can be exported and explicitly abandoned without changing the ship',async page=>{
  const raw='{"format":"future","version":999}';await page.evaluate(raw=>window.__shipQa.recovery().replace(window.__shipQa.owner,null,raw),raw);await page.reload();
  await page.getByRole('button',{name:'Exporter la copie du score',exact:true}).waitFor();const before=await disk(page);const download=page.waitForEvent('download');await page.getByRole('button',{name:'Exporter la copie du score',exact:true}).click();const artifact=await download;
  let bytes='';for await(const chunk of await artifact.createReadStream())bytes+=chunk.toString();assert.equal(bytes,raw);
  page.once('dialog',d=>d.dismiss());await page.getByRole('button',{name:'Abandonner cette reprise',exact:true}).click();assert.equal(await backup(page),raw);
  page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'Abandonner cette reprise',exact:true}).click();await page.waitForFunction(async()=>await window.__shipQa.recovery().read(window.__shipQa.owner)===null);
  assert.deepEqual(await disk(page),before);assert.equal(await writes(page),0);await open(page);assert.equal(await page.locator('.training-drill-panel').count(),1);
 });
 await scenario('native recovery journal rejects two simultaneous competing backups and stale cleanup',async page=>{
  const second=await page.context().newPage();await second.goto(origin);await second.waitForFunction(()=>window.__shipQa);
  const runs=await Promise.all([page.evaluate(()=>window.__shipQa.recovery().replace(window.__shipQa.owner,null,'first').then(()=>true,()=>false)),second.evaluate(()=>window.__shipQa.recovery().replace(window.__shipQa.owner,null,'second').then(()=>true,()=>false))]);
  assert.equal(runs.filter(Boolean).length,1);const winner=await backup(page);const failed=await page.evaluate(expected=>window.__shipQa.recovery().replace(window.__shipQa.owner,expected,null).then(()=>false,()=>true),winner==='first'?'second':'first');assert.equal(failed,true);assert.equal(await backup(page),winner);
 });

 await scenario('a denied native recovery API reports memory-only protection and leaves primary retry usable',async page=>{
  await open(page);await page.evaluate(()=>{window.__shipQa.fault('drop');window.__savedIdbDescriptor=Object.getOwnPropertyDescriptor(globalThis,'indexedDB');Object.defineProperty(globalThis,'indexedDB',{configurable:true,get(){throw new DOMException('Denied','SecurityError');}});});await finish(page);
  await page.locator('[data-training-recovery]').filter({hasText:'non confirmée ou modifiée'}).waitFor();assert.equal((await disk(page)).training.targeting.attempts,0);
  await page.evaluate(()=>{Object.defineProperty(globalThis,'indexedDB',window.__savedIdbDescriptor);window.__shipQa.fault('none');});
  await page.getByRole('button',{name:'Réessayer la sauvegarde du score',exact:true}).click();await page.waitForSelector('.training-drill-panel',{state:'detached'});assert.equal((await disk(page)).training.targeting.attempts,1);
 });
 await scenario('an aborted native journal transaction is not a confirmed backup',async page=>{
  await open(page);await page.evaluate(()=>{window.__shipQa.fault('drop');window.__originalRecoveryPut=IDBObjectStore.prototype.put;IDBObjectStore.prototype.put=function(...args){if(this.transaction.db.name===window.__shipQa.recoveryDB){this.transaction.abort();throw new DOMException('Abort','AbortError');}return window.__originalRecoveryPut.apply(this,args);};});await finish(page);
  await page.locator('[data-training-recovery]').filter({hasText:'non confirmée ou modifiée'}).waitFor();assert.equal(await backup(page),null);
  await page.evaluate(()=>{IDBObjectStore.prototype.put=window.__originalRecoveryPut;window.__shipQa.fault('none');});await page.getByRole('button',{name:'Réessayer la sauvegarde du score',exact:true}).click();await page.waitForSelector('.training-drill-panel',{state:'detached'});assert.equal((await disk(page)).training.targeting.attempts,1);
 });
 await scenario('a future native journal database is preserved instead of downgraded',async page=>{
  await page.evaluate(()=>new Promise((resolve,reject)=>{const r=indexedDB.open(window.__shipQa.recoveryDB,2);r.onerror=()=>reject(r.error);r.onupgradeneeded=()=>{r.result.createObjectStore('future-protected').put('untouched','sentinel');};r.onsuccess=()=>{r.result.close();resolve();};}));await page.reload();
  await page.locator('[data-training-recovery]').filter({hasText:'inaccessible'}).waitFor();const value=await page.evaluate(()=>new Promise((resolve,reject)=>{const r=indexedDB.open(window.__shipQa.recoveryDB);r.onerror=()=>reject(r.error);r.onsuccess=()=>{const db=r.result,tx=db.transaction('future-protected');const read=tx.objectStore('future-protected').get('sentinel');read.onsuccess=()=>resolve(read.result);tx.oncomplete=()=>db.close();};}));assert.equal(value,'untouched');assert.equal(await writes(page),0);
 });
 await scenario('another tab changing the ship archive blocks stale in-hub writes',async page=>{
  const second=await page.context().newPage();await second.goto(origin);await second.waitForFunction(()=>window.__shipQa);
  await second.evaluate(()=>{const key=window.__shipQa.sidecarKey;localStorage.setItem(key,localStorage.getItem(key)+' ');});
  await page.getByRole('alert').filter({hasText:'Une autre session a changé les archives'}).waitFor();
  const before=await writes(page);
  await page.getByRole('button',{name:'Armurerie',exact:true}).click();
  const savePreset=page.getByRole('button',{name:/Enregistrer dans/});
  assert.equal(await savePreset.isDisabled(),true,'a stale console must disable the save action');
  await page.waitForTimeout(150);
  assert.equal(await writes(page),before,'a stale console cannot write a loadout after a storage event');
 });
 const report={scope:'Actual ShipHub and TrainingDrill, native localStorage and synthetic profile, substituted art; not full-game or cross-tab training qualification',browser:browser.version(),results,errors};await mkdir(path.join(root,'outputs/qa-audit-v94'),{recursive:true});await writeFile(path.join(root,'outputs/qa-audit-v94/ship-training-browser.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));assert.equal(results.filter(v=>v.status!=='PASS').length,0);assert.deepEqual(errors,[]);
}finally{await browser?.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
