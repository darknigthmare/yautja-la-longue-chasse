/** Real drill UI and authored sequences; no injected scores or campaign saves. */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';
import {chromium} from 'playwright-core';
const root=fileURLToPath(new URL('../',import.meta.url));
const bundle=await build({absWorkingDir:root,entryPoints:['tests/browser/training-v94.fixture.tsx'],bundle:true,write:false,jsx:'automatic',platform:'browser'});
const server=createServer((req,res)=>{
  if(req.url==='/'){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end('<!doctype html><html lang="fr"><meta charset="utf-8"><title>Training QA</title><body><div id="root"></div><script src="/fixture.js"></script></body></html>');}
  else if(req.url==='/fixture.js'){res.writeHead(200,{'Content-Type':'text/javascript; charset=utf-8'});res.end(bundle.outputFiles[0].contents);}
  else{res.writeHead(404);res.end();}
});
let browser;const results=[],errors=[];
try{
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
  const addr=server.address();assert.ok(addr&&typeof addr==='object');
  browser=await chromium.launch(process.env.AUDIT_CHROME_CHANNEL?{channel:process.env.AUDIT_CHROME_CHANNEL}:{});
  const page=await browser.newPage({viewport:{width:1050,height:950}});page.on('pageerror',error=>errors.push(error.message));
  await page.goto(`http://127.0.0.1:${addr.port}/`);await page.bringToFront();await page.waitForFunction(()=>!!window.__trainingQa);
  const paint=()=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  async function reset(discipline='targeting',held=false){await page.evaluate(([d,h])=>window.__trainingQa.reset(d,h),[discipline,held]);await paint();await page.waitForSelector('.training-drill-panel');}
  async function scenario(name,fn){try{await reset();await fn();results.push({name,status:'PASS'});}catch(error){results.push({name,status:'FAIL',error:String(error)});}}
  const setPad=(index,value)=>page.evaluate(([i,v])=>window.__trainingQa.pad(i,v),[index,value]);
  const glyph=()=>page.locator('[aria-label="Commande actuelle"] strong').first().textContent();
  const progress=()=>page.getByRole('progressbar',{name:'Progression de l’épreuve'}).getAttribute('aria-valuenow');
  async function start(){await page.getByRole('button',{name:/Commencer l’épreuve/}).click();}
  async function finish(mode='buttons'){
    const count=await page.locator('[aria-label="Séquence d’entraînement"] > span').count();
    for(let index=0;index<count;index++){
      const current=(await glyph())?.trim();const actionIndex={'←':0,'→':1,A:2,B:3}[current];assert.notEqual(actionIndex,undefined);
      if(mode==='buttons')await page.getByRole('group',{name:'Commandes tactiles'}).getByRole('button').nth(actionIndex).click();
      else if(mode==='keyboard')await page.keyboard.press(['f','g','h','i'][actionIndex]);
      else{const button=[14,15,0,1][actionIndex];await setPad(button,false);await paint();await setPad(button,true);await paint();await setPad(button,false);await paint();}
      await page.waitForFunction(n=>Number(document.querySelector('[aria-label="Progression de l’épreuve"]')?.getAttribute('aria-valuenow'))>=n,Math.round((index+1)/count*100));
    }
    assert.match(await page.locator('.training-drill-panel').textContent(),new RegExp(`${count}/${count} réponses correctes`));
    assert.equal(await page.evaluate(()=>window.__trainingQa.completed.length),0);
  }
  for(const [discipline,mode] of [['targeting','buttons'],['wristblades','gamepad'],['cloaking','keyboard'],['mobility','buttons'],['honor-duel','gamepad']])await scenario(`${discipline}: all authored cues played via ${mode}; one explicit result`,async()=>{
    await reset(discipline);await start();if(mode==='keyboard')await page.locator('.training-drill-panel').focus();await finish(mode);
    await page.getByRole('button',{name:'Consigner le résultat',exact:true}).click();await paint();await page.waitForTimeout(150);
    const events=await page.evaluate(()=>window.__trainingQa.completed);assert.equal(events.length,1);assert.ok(events[0].score>=85&&events[0].score<=100);assert.ok(events[0].generation>0);
    assert.ok(await page.getByRole('button',{name:'Résultat transmis au vaisseau'}).isDisabled());
  });
  await scenario('parent suspension freezes timing and rejects touch actions',async()=>{
    await start();await page.waitForTimeout(100);await page.evaluate(()=>window.__trainingQa.pause(true));await paint();
    const before=await page.getByRole('progressbar',{name:'Temps restant pour répondre'}).getAttribute('aria-valuenow');
    await page.waitForTimeout(1500);assert.equal(await page.getByRole('progressbar',{name:'Temps restant pour répondre'}).getAttribute('aria-valuenow'),before);
    assert.ok(await page.getByRole('group',{name:'Commandes tactiles'}).getByRole('button').first().isDisabled());
    await page.evaluate(()=>window.__trainingQa.pause(false));await paint();assert.equal(await progress(),'0');
  });
  await scenario('inert ancestor cannot let the exercise run behind settings',async()=>{await start();await page.evaluate(()=>window.__trainingQa.block(true));await paint();const before=await progress();await page.waitForTimeout(1600);assert.equal(await progress(),before);await page.evaluate(()=>window.__trainingQa.block(false));await paint();assert.equal(await progress(),before);});
  await scenario('a held opening A is neutralized; B is not the abandon command',async()=>{
    await reset('targeting',true);await page.waitForTimeout(150);assert.equal(await page.getByRole('button',{name:/Commencer/}).count(),1);
    await setPad(0,false);await paint();await setPad(0,true);await paint();assert.equal(await progress(),'0');await setPad(0,false);await paint();await setPad(1,true);await paint();assert.equal(await page.evaluate(()=>window.__trainingQa.cancels),0);
  });
  await scenario('View abandons once without leaking a simultaneous A',async()=>{await start();await paint();await setPad(0,true);await setPad(8,true);await paint();await page.waitForTimeout(150);assert.equal(await page.evaluate(()=>window.__trainingQa.cancels),1);assert.equal(await page.evaluate(()=>window.__trainingQa.completed.length),0);});
  await scenario('disabled or denied gamepads cannot stop native buttons',async()=>{await page.evaluate(()=>{window.__trainingQa.enablePad(false);window.__trainingQa.deny(true);});await paint();await start();await page.waitForTimeout(100);assert.equal(await progress(),'0');await page.getByRole('button',{name:'Abandonner l’épreuve sans enregistrer de score'}).click();assert.equal(await page.evaluate(()=>window.__trainingQa.cancels),1);});
  await scenario('remapped keyboard cancels without restoring the old shortcut',async()=>{await page.locator('.training-drill-panel').focus();await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>window.__trainingQa.cancels),0);await page.keyboard.press('p');assert.equal(await page.evaluate(()=>window.__trainingQa.cancels),1);});
  await scenario('right pointer button cannot submit a gesture',async()=>{await start();await page.getByRole('group',{name:'Commandes tactiles'}).getByRole('button').first().click({button:'right'});assert.equal(await progress(),'0');});
  await scenario('unmount leaves no delayed result after the final cue',async()=>{await start();await finish();await page.evaluate(()=>window.__trainingQa.unmount());await paint();await page.waitForTimeout(200);assert.equal(await page.evaluate(()=>window.__trainingQa.completed.length),0);});
  await scenario('narrow viewport still permits beginning and abandonment',async()=>{await page.setViewportSize({width:390,height:844});await start();await page.getByRole('button',{name:'Abandonner l’épreuve sans enregistrer de score'}).click();assert.equal(await page.evaluate(()=>window.__trainingQa.cancels),1);});
  console.log(JSON.stringify({scope:'Real TrainingDrill in React StrictMode; five authored sequences, native buttons/remapped keyboard/emulated pad; not campaign persistence or physical hardware QA',results,errors},null,2));
  assert.equal(results.length,14);assert.equal(results.filter(r=>r.status!=='PASS').length,0);assert.deepEqual(errors,[]);
}finally{await browser?.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
