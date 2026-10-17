/** Actual controlled ShipHub and played drills; a fixture host delays its
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
 await scenario('played drill waits for an explicit host acknowledgement and saves exactly once',async page=>{
  await open(page);await finish(page);await page.waitForFunction(()=>window.__ackQa.calls===1);
  assert.equal(await writes(page),0);assert.equal(await page.locator('.training-drill-panel').count(),1);
  await page.getByText('Enregistrement externe en cours de vérification.',{exact:false}).waitFor();
  await page.evaluate(()=>window.__ackQa.reply('confirm'));await page.waitForSelector('.training-drill-panel',{state:'detached'});
  assert.equal(await writes(page),1);assert.equal((await disk(page)).training.targeting.attempts,1);
  assert.match((await page.evaluate(()=>window.__ackQa.notifications)).at(-1),/confirmée par le gestionnaire externe/);
 });
 await scenario('legacy asynchronous void host is only reported as delivered',async page=>{
  await open(page);await finish(page);await page.evaluate(()=>window.__ackQa.reply('void'));
  await page.waitForSelector('.training-drill-panel',{state:'detached'});assert.equal(await writes(page),0);
  assert.match((await page.evaluate(()=>window.__ackQa.notifications)).at(-1),/sauvegarde non vérifiée/);
 });
 for(const mode of ['reject','invalid','write-then-reject'])await scenario(`controlled ${mode} cannot be retried as a second local write`,async page=>{
  await open(page);await finish(page);await page.evaluate(mode=>window.__ackQa.reply(mode),mode);
  await page.getByText('Transmission externe non confirmée.',{exact:false}).waitFor();
  assert.equal(await writes(page),mode==='write-then-reject'?1:0);
  assert.equal(await page.getByRole('button',{name:'Réessayer la sauvegarde du score',exact:true}).count(),0);
  await page.getByRole('button',{name:'Fermer l’épreuve',exact:true}).click();await paint(page);
  assert.equal(await page.getByRole('button',{name:/Ciblage/}).isDisabled(),true);
  assert.equal(await page.evaluate(()=>window.__ackQa.calls),1);
 });
 await scenario('closed component never reopens on a late host acknowledgement',async page=>{
  await open(page);await finish(page);await page.evaluate(()=>window.__ackQa.show(false));await paint(page);
  const count=await page.evaluate(()=>window.__ackQa.notifications.length);
  await page.evaluate(()=>window.__ackQa.reply('confirm'));await paint(page);
  assert.equal(await page.locator('.training-drill-panel').count(),0);
  assert.equal(await page.evaluate(()=>window.__ackQa.notifications.length),count);
  assert.equal(await writes(page),1,'the already-requested host write may finish, but there is no fallback second write');
 });
 const report={scope:'Actual controlled ShipHub and TrainingDrill, real gestures and local writer used by a fixture host; synthetic profile/art, not a remote-account or full-game qualification',results,errors};
 await mkdir(path.join(root,'outputs/qa-v94'),{recursive:true});await writeFile(path.join(root,'outputs/qa-v94/controlled-training.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
 assert.equal(results.filter(r=>r.status==='FAIL').length,0);assert.deepEqual(errors,[]);
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
