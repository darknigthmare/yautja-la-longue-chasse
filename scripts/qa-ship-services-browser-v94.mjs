/** Actual controlled ShipHub services; a fixture host delays its
 * acknowledgement and uses the native writer. No real remote account. */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {build} from 'esbuild';
import {chromium} from 'playwright-core';
const root=fileURLToPath(new URL('../',import.meta.url));
const bundle=await build({absWorkingDir:root,entryPoints:['tests/browser/ship-training-ack-v94.fixture.tsx'],bundle:true,write:false,outdir:'outputs/ship-training-build',jsx:'automatic',platform:'browser',format:'esm',logLevel:'silent',plugins:[{name:'image-fixture',setup(b){b.onResolve({filter:/^next\/image$/},()=>({path:'image',namespace:'fixture'}));b.onLoad({filter:/.*/,namespace:'fixture'},()=>({contents:"import React from 'react';export default function Image({unoptimized,priority,fill,...props}){return React.createElement('img',props)}",loader:'js',resolveDir:root}));}}]});
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
  try{await page.goto(origin);await page.bringToFront();await page.waitForFunction(()=>window.__ackQa?.ready);await page.getByRole('button',{name:/Ciblage/}).waitFor();await page.waitForFunction(()=>![...document.querySelectorAll("button")].find(b=>b.textContent.includes("Ciblage"))?.disabled);await run(page);results.push({name,status:'PASS'});console.log('PASS '+name);}
  catch(e){results.push({name,status:'FAIL',error:String(e)});console.error('FAIL '+name+': '+e);}
  finally{await context.close();}}
 const paint=page=>page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
 const disk=page=>page.evaluate(()=>JSON.parse(localStorage.getItem(window.__ackQa.sidecarKey)));
 const writes=page=>page.evaluate(()=>window.__ackQa.writes.length);
 async function enter(page,room,action){
  await page.getByRole('button',{name:room,exact:true}).click();
  await page.getByRole('button',{name:new RegExp(action)}).click();
  await page.locator('[data-ship-service-issue]').waitFor();
 }
 for(const [room,action,field] of [
  ['Armurerie','Enregistrer dans','loadoutPresets'],
  ['Medbay','Traitement des blessures','minor-wounds'],
  ['Medbay','Neutralisation acide','acid-burn'],
  ['Medbay','Recalibrage neural','neural-shock'],
 ])await scenario(`${action}: no success before a matching service acknowledgement`,async page=>{
  const before=await disk(page);await enter(page,room,action);
  assert.equal(await writes(page),0);assert.equal(await page.evaluate(()=>window.__ackQa.calls),1);
  await page.getByRole('button',{name:new RegExp(action)}).click();await paint(page);
  assert.equal(await page.evaluate(()=>window.__ackQa.calls),1,'duplicate service input must not be sent twice');
  assert.equal((await page.evaluate(()=>window.__ackQa.notifications)).some(x=>x.includes('sauvegarde confirmée')),false);
  await page.evaluate(()=>window.__ackQa.reply('confirm'));await paint(page);
  assert.equal(await writes(page),1);const after=await disk(page);
  if(field==='loadoutPresets'){assert.notEqual(after.loadoutPresets[0].loadout,null);assert.deepEqual(after.training,before.training);}
  else {assert.equal(after.medbay.status,'treating');assert.equal(after.medbay.treatmentId,field);}
  assert.match((await page.evaluate(()=>window.__ackQa.notifications)).at(-1),/sauvegarde confirmée par le gestionnaire/);
 });
 for(const mode of ['reject','invalid','write-then-reject'])await scenario(`service ${mode} preserves uncertainty and blocks another service or training`,async page=>{
  await enter(page,'Armurerie','Enregistrer dans');await page.evaluate(m=>window.__ackQa.reply(m),mode);
  await page.locator('[data-ship-service-issue]').filter({hasText:'transmission externe non confirmée'}).waitFor();
  await page.getByRole('button',{name:/Enregistrer dans/}).click();
  await page.getByRole('button',{name:'Medbay',exact:true}).click();await page.getByRole('button',{name:/Traitement des blessures/}).click();
  await page.getByRole('button',{name:'Entraînement',exact:true}).click();await page.getByRole('button',{name:/Ciblage/}).click();await paint(page);
  assert.equal(await page.evaluate(()=>window.__ackQa.calls),1);assert.equal(await writes(page),mode==='write-then-reject'?1:0);
  assert.equal(await page.locator('.training-drill-panel').count(),0);
 });
 await scenario('legacy void service receiver never claims treatment is saved',async page=>{
  await enter(page,'Medbay','Traitement des blessures');await page.evaluate(()=>window.__ackQa.reply('void'));await paint(page);
  assert.equal(await writes(page),0);assert.match((await page.evaluate(()=>window.__ackQa.notifications)).at(-1),/sauvegarde non vérifiée/);
  assert.equal((await disk(page)).medbay.status,'ready');
 });
 await scenario('a removed service panel cannot publish its late host acknowledgement',async page=>{
  await enter(page,'Armurerie','Enregistrer dans');await page.evaluate(()=>window.__ackQa.show(false));await paint(page);
  const before=await page.evaluate(()=>window.__ackQa.notifications.length);await page.evaluate(()=>window.__ackQa.reply('confirm'));await paint(page);
  assert.equal(await writes(page),1,'already-dispatched host operation may finish');assert.equal(await page.evaluate(()=>window.__ackQa.notifications.length),before);
  assert.equal(await page.locator('[data-ship-service-issue]').count(),0);
 });
 await scenario('service timeout remains reviewable and a valid late acknowledgement settles once',async page=>{
  await enter(page,'Armurerie','Enregistrer dans');await page.locator('[data-ship-service-issue]').filter({hasText:'ne répond pas'}).waitFor({timeout:22000});
  await page.getByRole('button',{name:/Enregistrer dans/}).click();await paint(page);assert.equal(await page.evaluate(()=>window.__ackQa.calls),1);
  await page.evaluate(()=>window.__ackQa.reply('confirm'));await paint(page);assert.equal(await writes(page),1);
  assert.equal(await page.locator('[data-ship-service-issue]').count(),0);
 });
 const report={scope:'Actual ShipHub non-training services and native host writer; synthetic profile/art, not full campaign or live remote backend QA',results,errors};
 await mkdir(path.join(root,'outputs/qa-v94'),{recursive:true});await writeFile(path.join(root,'outputs/qa-v94/ship-services.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
 assert.equal(results.filter(r=>r.status==='FAIL').length,0);assert.deepEqual(errors,[]);
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
