/** Actual workshop React UI; scripted native gestures, emulated pad, no campaign save or artwork. */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';
import {chromium} from 'playwright-core';
const root=fileURLToPath(new URL('../',import.meta.url));
const bundle=await build({absWorkingDir:root,entryPoints:['tests/browser/trophy-workshop-v94.fixture.tsx'],bundle:true,write:false,jsx:'automatic',platform:'browser'});
const server=createServer((request,response)=>{
  if(request.url==='/'){response.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});response.end('<!doctype html><html lang="fr"><meta charset="utf-8"><title>Workshop QA</title><body><div id="root"></div><script src="/fixture.js"></script></body></html>');}
  else if(request.url==='/fixture.js'){response.writeHead(200,{'Content-Type':'text/javascript'});response.end(bundle.outputFiles[0].contents);}
  else{response.writeHead(404);response.end();}
});
let browser;const results=[],errors=[];
try{
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
  const address=server.address();assert.ok(address&&typeof address==='object');
  browser=await chromium.launch(process.env.AUDIT_CHROME_CHANNEL?{channel:process.env.AUDIT_CHROME_CHANNEL}:{});
  const page=await browser.newPage();page.on('pageerror',error=>errors.push(error.message));
  await page.goto(`http://127.0.0.1:${address.port}/`);await page.bringToFront();
  await page.waitForFunction(()=>!!window.__workshopQa);
  const paint=()=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  async function reset(action='clean',held=false){await page.evaluate(([a,h])=>window.__workshopQa.reset(a,h),[action,held]);await paint();await page.waitForSelector('.trophy-workshop-panel');}
  const pad=(button,value)=>page.evaluate(([b,v])=>window.__workshopQa.pad(b,v),[button,value]);
  async function scenario(name,fn){try{await reset();await fn();results.push({name,status:'PASS'});}catch(error){results.push({name,status:'FAIL',error:String(error)});}}
  async function start(){await page.getByRole('button',{name:/Commencer la séquence/}).click();}
  async function performRemaining(){
    const count=await page.locator('[aria-label="Séquence de gestes"] > span').count();
    for(let index=0;index<count;index++){
      await page.waitForFunction(()=>{const el=document.querySelector('[aria-label="Fenêtre de synchronisation"]');const n=Number(el?.getAttribute('aria-valuenow'));return n>=45&&n<=65&&!!document.querySelector('.trophy-workshop-touch-controls button:not(:disabled)');},{},{timeout:5000});
      const glyph=await page.locator('.trophy-workshop-work-area strong').first().textContent();
      const label={'←':'Gauche','↑':'Haut','↓':'Bas','→':'Droite','A':'Valider'}[glyph?.trim()];assert.ok(label,glyph);
      await page.getByRole('button',{name:`Geste ${label}`,exact:true}).click();
      await page.waitForFunction(n=>Number(document.querySelector('[aria-label="Progression de l’atelier"]')?.getAttribute('aria-valuenow'))>=n,Math.round((index+1)/count*100));
    }
  }
  for(const action of ['clean','prepare','display','rite'])await scenario(`${action}: full native gesture sequence delivers once under continuous parent rerenders`,async()=>{
    await reset(action);await start();await performRemaining();
    await page.waitForFunction(()=>window.__workshopQa.completions.length===1,{},{timeout:2500});
    await page.waitForTimeout(650);
    const events=await page.evaluate(()=>window.__workshopQa.completions);assert.equal(events.length,1);assert.equal(events[0].result.action,action);assert.ok(events[0].generation>1);
  });
  await scenario('suspension freezes the active timing window and accepts no touch gesture',async()=>{
    await start();await page.waitForFunction(()=>Number(document.querySelector('[aria-label="Fenêtre de synchronisation"]')?.getAttribute('aria-valuenow'))>=20);
    await page.evaluate(()=>window.__workshopQa.pause(true));await paint();
    const old=await page.getByRole('progressbar',{name:'Fenêtre de synchronisation'}).getAttribute('aria-valuenow');
    await page.waitForTimeout(1500);assert.equal(await page.getByRole('progressbar',{name:'Fenêtre de synchronisation'}).getAttribute('aria-valuenow'),old);
    assert.ok(await page.getByRole('button',{name:/Geste/}).first().isDisabled());
    await page.evaluate(()=>window.__workshopQa.pause(false));await paint();await page.waitForTimeout(100);assert.ok((await page.locator('.trophy-workshop-panel').textContent()).includes('Erreurs 0/'));
  });
  await scenario('held pad on entry needs neutral; native B cancels once',async()=>{
    await reset('clean',true);await page.waitForTimeout(250);assert.equal(await page.getByRole('button',{name:/Commencer/}).count(),1);
    await pad(0,false);await paint();await pad(0,true);await paint();assert.equal(await page.getByRole('button',{name:/Commencer/}).count(),0);
    await pad(1,true);await page.waitForTimeout(150);assert.equal(await page.evaluate(()=>window.__workshopQa.cancels),1);assert.equal(await page.evaluate(()=>window.__workshopQa.completions.length),0);
  });
  await scenario('a failed attempt can restart with A, without starting on its held press',async()=>{
    await reset('display');await start();await page.getByRole('alert').waitFor({timeout:7000});
    await pad(0,true);await paint();await page.waitForTimeout(120);assert.equal(await page.getByRole('button',{name:/Commencer/}).count(),1);
    await pad(0,false);await paint();await pad(0,true);await paint();assert.equal(await page.getByRole('button',{name:/Commencer/}).count(),0);
  });
  await scenario('explicit close before delayed delivery cancels even without parent unmount',async()=>{
    await reset('display');await start();await performRemaining();await page.getByRole('button',{name:'Quitter l’atelier'}).click();
    await page.waitForTimeout(700);assert.equal(await page.evaluate(()=>window.__workshopQa.completions.length),0);assert.equal(await page.evaluate(()=>window.__workshopQa.cancels),1);
  });
  await scenario('unmount during the success presentation cannot deliver later',async()=>{
    await reset('display');await start();await performRemaining();await page.evaluate(()=>window.__workshopQa.unmount());await paint();await page.waitForTimeout(700);assert.equal(await page.evaluate(()=>window.__workshopQa.completions.length),0);
  });
  await scenario('a denied gamepad API leaves the native workshop clock and cancel button usable',async()=>{
    await page.evaluate(()=>window.__workshopQa.deny(true));await start();await page.waitForFunction(()=>Number(document.querySelector('[aria-label="Fenêtre de synchronisation"]')?.getAttribute('aria-valuenow'))>10,{},{timeout:5000});
    await page.getByRole('button',{name:'Quitter l’atelier'}).click();assert.equal(await page.evaluate(()=>window.__workshopQa.cancels),1);
  });
  console.log(JSON.stringify({scope:'Actual React workshop, four authored gesture sequences; no campaign persistence, artwork or physical controller qualification',results,errors},null,2));
  assert.equal(results.length,10);assert.equal(results.filter(result=>result.status!=='PASS').length,0);assert.deepEqual(errors,[]);
}finally{await browser?.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
