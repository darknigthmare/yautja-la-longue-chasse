/** Native IndexedDB + localStorage + Web Locks, actual free-exercise stores.
 * Synthetic states on an isolated loopback origin, not played campaign QA. */
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs/promises';
import {build} from 'esbuild';
import {chromium} from 'playwright-core';
const compiled=await build({stdin:{contents:`import * as s from './app/game/systems/clanWarSessionV85';import * as f from './app/game/systems/clanWarFenceV94';import * as w from './app/game/systems/clanWarV85';import * as c from './app/game/systems/clanWarCanyonV85';Object.assign(window,{qa:{...s,...f,...w,...c}});`,resolveDir:process.cwd()},bundle:true,write:false,platform:'browser',format:'iife',logLevel:'silent'});
const server=http.createServer((req,res)=>{res.setHeader('Content-Type',req.url==='/fixture.js'?'text/javascript; charset=utf-8':'text/html; charset=utf-8');res.end(req.url==='/fixture.js'?compiled.outputFiles[0].contents:'<!doctype html><title>Native exercise persistence</title><script src="/fixture.js"></script>');});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin=`http://127.0.0.1:${server.address().port}`,results=[],errors=[];let browser;
try{
 browser=await chromium.launch(process.env.AUDIT_CHROME_EXECUTABLE?{executablePath:process.env.AUDIT_CHROME_EXECUTABLE}:{channel:process.env.AUDIT_CHROME_CHANNEL||'chrome'});
 async function context(){const ctx=await browser.newContext();await ctx.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());return ctx;}
 async function page(ctx){const p=await ctx.newPage();p.on('pageerror',e=>errors.push(e.message));await p.goto(origin);await p.waitForFunction(()=>window.qa);return p;}
 async function mount(p){await p.evaluate(async()=>{window.session=qa.createWarSessionV85(()=>localStorage);session.subscribe(()=>{});await session.whenSettled();if(!session.getSnapshot().loaded)throw Error('unhydrated');});}
 async function check(name,fn){const ctx=await context();try{const p=await page(ctx);await fn(p,ctx);results.push({name,status:'PASS'});console.log('PASS '+name);}catch(e){results.push({name,status:'FAIL',error:e.message});console.error('FAIL '+name+': '+e.message);}finally{await ctx.close();}}
 const races={simulation:0,canyon:0,selection:0};
 for(let n=0;n<100;n++){
  const ctx=await context();try{
   const pages=await Promise.all([page(ctx),page(ctx)]);await Promise.all(pages.map(mount));
   for(const domain of Object.keys(races)){
    const attempts=await Promise.all(pages.map((p,index)=>p.evaluate(async({domain,index})=>{
     if(domain==='simulation')session.setSimulation(v=>({...v,turn:index?9:7}));
     if(domain==='canyon')session.setCanyon(v=>({...v,seconds:index?9:7}));
     if(domain==='selection')session.setSelection({'RTS-U01':index?3:2});
     await session.whenSettled();const s=session.getSnapshot();return s[domain==='simulation'?'persistedWar':domain==='canyon'?'persistedCanyon':'persistedComposition'];
    },{domain,index})));
    assert.equal(attempts.filter(Boolean).length,1,`${domain} race ${n} must have exactly one writer`);races[domain]++;
   }
  }catch(e){results.push({name:`native races round ${n}`,status:'FAIL',error:e.message});console.error(e.message);break;}finally{await ctx.close();}
 }
 for(const [domain,count]of Object.entries(races))results.push({name:`${domain}: 100 actual store races, exactly one confirmed writer per round`,status:count===100?'PASS':'FAIL',count});
 await check('an interrupted mirror reloads the intended state read-only and repairs it without restarting',async p=>{
  await mount(p);await p.evaluate(async()=>{window.nativeSet=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k!==qa.WAR_STORAGE_KEY_V85)nativeSet.call(this,k,v);};session.setSimulation(v=>({...v,turn:7}));await session.whenSettled();if(session.getSnapshot().persistedWar)throw Error('false confirmation');});
  await p.reload();await p.waitForFunction(()=>window.qa);await mount(p);
  const before=await p.evaluate(()=>({turn:session.getSnapshot().simulation.turn,raw:localStorage.getItem(qa.WAR_STORAGE_KEY_V85),retry:session.getSnapshot().canRetryPersistence}));assert.deepEqual(before,{turn:7,raw:null,retry:true});
  await p.evaluate(async()=>{session.retryPersistence();await session.whenSettled();});assert.equal(await p.evaluate(()=>session.getSnapshot().persistedWar),true);assert.equal(await p.evaluate(()=>JSON.parse(localStorage.getItem(qa.WAR_STORAGE_KEY_V85)).turn),7);
 });
 await check('native transaction abort cannot authorize localStorage and a later explicit retry recovers',async p=>{
  await mount(p);await p.evaluate(async()=>{window.originalPut=IDBObjectStore.prototype.put;IDBObjectStore.prototype.put=function(...args){const r=originalPut.apply(this,args);this.transaction.abort();return r;};session.setSimulation(v=>({...v,turn:7}));await session.whenSettled();});
  assert.equal(await p.evaluate(()=>localStorage.getItem(qa.WAR_STORAGE_KEY_V85)),null);assert.equal(await p.evaluate(()=>session.getSnapshot().persistedWar),false);
  await p.evaluate(async()=>{IDBObjectStore.prototype.put=originalPut;session.retryPersistence();await session.whenSettled();});assert.equal(await p.evaluate(()=>session.getSnapshot().persistedWar),true);
 });
 await check('native final-confirmation abort retains a readable intent and never duplicates the mirror write',async p=>{
  await p.evaluate(async()=>{const port=qa.createWarFencePortV94(),confirm=port.confirm;port.confirm=async()=>{throw Error('confirmation refused');};window.session=qa.createWarSessionV85(()=>localStorage,undefined,port);session.subscribe(()=>{});await session.whenSettled();window.writeCount=0;const set=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k===qa.WAR_STORAGE_KEY_V85)writeCount++;set.call(this,k,v);};session.setSimulation(v=>({...v,turn:7}));await session.whenSettled();port.confirm=confirm;});
  assert.equal(await p.evaluate(()=>session.getSnapshot().persistedWar),false);await mount(p);await p.evaluate(async()=>{session.retryPersistence();await session.whenSettled();});assert.equal(await p.evaluate(()=>session.getSnapshot().persistedWar),true);assert.equal(await p.evaluate(()=>writeCount),1);
 });
 await check('a future local archive remains byte-identical despite a previous fence',async p=>{
  await mount(p);await p.evaluate(async()=>{session.setSimulation(v=>({...v,turn:7}));await session.whenSettled();localStorage.setItem(qa.WAR_STORAGE_KEY_V85,'{"version":999,"protected":true}');});await p.reload();await p.waitForFunction(()=>window.qa);await mount(p);
  await p.evaluate(async()=>{session.setSimulation(v=>({...v,turn:9}));session.retryPersistence();await session.whenSettled();});assert.equal(await p.evaluate(()=>localStorage.getItem(qa.WAR_STORAGE_KEY_V85)),'{"version":999,"protected":true}');
 });
 await check('a denied IndexedDB getter cannot cause fallback writes to the legacy mirror',async p=>{
  await p.evaluate(()=>Object.defineProperty(window,'indexedDB',{configurable:true,get(){throw new DOMException('denied','SecurityError');}}));await mount(p);await p.evaluate(async()=>{session.setSimulation(v=>({...v,turn:7}));session.retryPersistence();await session.whenSettled();});assert.equal(await p.evaluate(()=>session.getSnapshot().simulation.turn),7);assert.equal(await p.evaluate(()=>localStorage.getItem(qa.WAR_STORAGE_KEY_V85)),null);
 });
 await check('a future fence database cannot be downgraded or bypassed',async p=>{
  await p.evaluate(()=>new Promise((resolve,reject)=>{const o=indexedDB.open(qa.WAR_FENCE_DATABASE_V94,2);o.onupgradeneeded=()=>o.result.createObjectStore('future');o.onsuccess=()=>{o.result.close();resolve();};o.onerror=()=>reject(o.error);}));await mount(p);await p.evaluate(async()=>{session.setSimulation(v=>({...v,turn:7}));await session.whenSettled();});assert.equal(await p.evaluate(()=>session.getSnapshot().persistedWar),false);assert.equal(await p.evaluate(()=>localStorage.getItem(qa.WAR_STORAGE_KEY_V85)),null);
 });
 await check('fenced exercises never touch campaign or owned ship/PIT archives',async p=>{
  const sentinels={'yautja-long-hunt.save':'campaign','yautja-long-hunt.save.backup':'backup','yautja-long-hunt.ship-progression':'ship','yautja-long-hunt.the-pit.test':'pit'};await p.evaluate(v=>Object.entries(v).forEach(([k,s])=>localStorage.setItem(k,s)),sentinels);await mount(p);await p.evaluate(async()=>{session.setSimulation(v=>({...v,turn:7}));session.setCanyon(v=>({...v,seconds:2}));session.setSelection({'RTS-U01':3});await session.whenSettled();});assert.deepEqual(await p.evaluate(keys=>Object.fromEntries(keys.map(k=>[k,localStorage.getItem(k)])),Object.keys(sentinels)),sentinels);
 });
 results.push({name:'No uncaught browser exceptions',status:errors.length?'FAIL':'PASS',errors});
 const report={scope:'Actual free-exercise stores; native browser persistence on synthetic local data, not played campaign or hardware QA',browser:browser.version(),results};await fs.mkdir('outputs/qa-audit-v94',{recursive:true});await fs.writeFile('outputs/qa-audit-v94/clan-fence-browser.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));assert.ok(results.every(r=>r.status==='PASS'));
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
