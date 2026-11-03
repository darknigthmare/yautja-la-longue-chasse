/** Native IndexedDB + localStorage + Web Locks, actual free-exercise stores.
 * Synthetic states on an isolated loopback origin, not played campaign QA. */
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs/promises';
import {build} from 'esbuild';
import {chromium} from 'playwright-core';
const compiled=await build({stdin:{contents:`import * as s from './app/game/systems/clanWarSessionV85';import * as f from './app/game/systems/clanWarFenceV94';import * as w from './app/game/systems/clanWarV85';import * as c from './app/game/systems/clanWarCanyonV85';import * as p from './app/game/systems/clanWarPlanetsV96';Object.assign(window,{qa:{...s,...f,...w,...c,...p}});`,resolveDir:process.cwd()},bundle:true,write:false,platform:'browser',format:'iife',logLevel:'silent'});
const server=http.createServer((req,res)=>{res.setHeader('Content-Type',req.url==='/fixture.js'?'text/javascript; charset=utf-8':'text/html; charset=utf-8');res.end(req.url==='/fixture.js'?compiled.outputFiles[0].contents:'<!doctype html><title>Native exercise persistence</title><script src="/fixture.js"></script>');});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin=`http://127.0.0.1:${server.address().port}`,results=[],errors=[];let browser;
try{
 browser=await chromium.launch(process.env.AUDIT_CHROME_EXECUTABLE?{executablePath:process.env.AUDIT_CHROME_EXECUTABLE}:{channel:process.env.AUDIT_CHROME_CHANNEL||'chrome'});
 async function context(){const ctx=await browser.newContext();await ctx.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());return ctx;}
 async function page(ctx){const p=await ctx.newPage();p.on('pageerror',e=>errors.push(e.message));await p.goto(origin);await p.waitForFunction(()=>window.qa);return p;}
 async function mount(p){await p.evaluate(async()=>{window.session=qa.createWarSessionV85(()=>localStorage);session.subscribe(()=>{});await session.whenSettled();if(!session.getSnapshot().loaded)throw Error('unhydrated');});}
 async function mountPlanet(p,planetId){await p.evaluate(async id=>{window.session=qa.createWarSessionV85(()=>localStorage,undefined,undefined,{planetId:id});session.subscribe(()=>{});await session.whenSettled();if(!session.getSnapshot().loaded)throw Error('unhydrated planet');},planetId);}
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
 await check('all thirty planets commit native fences and reload their own turns without changing canyon or composition',async p=>{
  const written=await p.evaluate(async()=>{
   const exercises={
    [qa.CANYON_STORAGE_KEY_V85]:JSON.stringify(qa.createCanyonV85('v96-native-canyon-sentinel')),
    [qa.COMPOSITION_STORAGE_KEY_V85]:JSON.stringify({version:1,context:'free',selection:{'RTS-U01':2}}),
   };
   for(const [key,raw]of Object.entries(exercises))localStorage.setItem(key,raw);
   const nativeSet=Storage.prototype.setItem,writes=[];
   Storage.prototype.setItem=function(key,raw){writes.push(key);nativeSet.call(this,key,raw);};
   const planets=[];
   for(const [index,planet]of qa.WAR_PLANETS_V96.entries()){
    const key=qa.warPlanetStorageKeyV96(planet.id),store=qa.createWarSessionV85(()=>localStorage,undefined,undefined,{planetId:planet.id});
    const unsubscribe=store.subscribe(()=>{});await store.whenSettled();
    if(!store.getSnapshot().loaded)throw Error(planet.id+': initial hydration failed');
    store.setSimulation(current=>({...current,turn:index+2}));await store.whenSettled();
    const snapshot=store.getSnapshot(),raw=localStorage.getItem(key),fence=await qa.createWarFencePortV94().read(key);
    if(!snapshot.persistedWar||snapshot.pendingWrites!==0||!raw||!qa.validWarPlanetArchiveRawV96(raw,planet.id))throw Error(planet.id+': mirror unconfirmed');
    if(fence?.phase!=='confirmed'||fence.after!==raw)throw Error(planet.id+': native fence unconfirmed');
    planets.push({id:planet.id,key,turn:snapshot.simulation.turn});unsubscribe();
   }
   Storage.prototype.setItem=nativeSet;
   for(const [key,raw]of Object.entries(exercises))if(localStorage.getItem(key)!==raw)throw Error('Shared exercise changed: '+key);
   return {planets,writes,exercises};
  });
  assert.equal(written.planets.length,30);assert.equal(new Set(written.planets.map(planet=>planet.key)).size,30);
  assert.deepEqual(written.writes,written.planets.map(planet=>planet.key),'only one mirror write per planet, no shared exercise writes');
  await p.reload();await p.waitForFunction(()=>window.qa);
  const reloaded=await p.evaluate(async({planets,exercises})=>{
   const writes=[],nativeSet=Storage.prototype.setItem;
   Storage.prototype.setItem=function(key,raw){writes.push(key);nativeSet.call(this,key,raw);};
   const turns=[];
   for(const planet of planets){
    const before=localStorage.getItem(planet.key),store=qa.createWarSessionV85(()=>localStorage,undefined,undefined,{planetId:planet.id});
    const unsubscribe=store.subscribe(()=>{});await store.whenSettled();const snapshot=store.getSnapshot();
    if(!snapshot.loaded||!snapshot.persistedWar||snapshot.canRetryPersistence||localStorage.getItem(planet.key)!==before)throw Error(planet.id+': reload not confirmed read-only');
    turns.push({id:planet.id,key:planet.key,turn:snapshot.simulation.turn});unsubscribe();
   }
   Storage.prototype.setItem=nativeSet;
   for(const [key,raw]of Object.entries(exercises))if(localStorage.getItem(key)!==raw)throw Error('Shared exercise changed on reload: '+key);
   return {turns,writes};
  },written);
  assert.deepEqual(reloaded.turns,written.planets);assert.deepEqual(reloaded.writes,[],'hydration cannot rewrite any mirror');
 });
 await check('two stale Thalassa tabs have exactly one native writer while Vitriol stays independent',async(p,ctx)=>{
  const second=await page(ctx),pages=[p,second];await Promise.all(pages.map(tab=>mountPlanet(tab,'thalassa')));
  const attempts=await Promise.all(pages.map((tab,index)=>tab.evaluate(async turn=>{
   session.setSimulation(current=>({...current,turn}));await session.whenSettled();const snapshot=session.getSnapshot();
   return {persisted:snapshot.persistedWar,writable:snapshot.writableWar,turn:snapshot.simulation.turn};
  },index?9:7)));
  assert.equal(attempts.filter(attempt=>attempt.persisted).length,1,'exactly one native Thalassa writer');
  const loser=attempts.findIndex(attempt=>!attempt.persisted),winner=attempts.find(attempt=>attempt.persisted);
  assert.equal(attempts[loser].writable,false,'the stale contender must be blocked');
  const thalassaBefore=await p.evaluate(()=>qa.createWarFencePortV94().read(qa.warPlanetStorageKeyV96('thalassa')));
  assert.equal(thalassaBefore.phase,'confirmed');assert.equal(JSON.parse(thalassaBefore.after).turn,winner.turn);
  const independent=await pages[loser].evaluate(async()=>{
   const store=qa.createWarSessionV85(()=>localStorage,undefined,undefined,{planetId:'vitriol'});store.subscribe(()=>{});await store.whenSettled();
   store.setSimulation(current=>({...current,turn:17}));await store.whenSettled();
   const key=qa.warPlanetStorageKeyV96('vitriol'),fence=await qa.createWarFencePortV94().read(key);
   return {persisted:store.getSnapshot().persistedWar,turn:JSON.parse(localStorage.getItem(key)).turn,phase:fence?.phase};
  });
  assert.deepEqual(independent,{persisted:true,turn:17,phase:'confirmed'});
  await pages[loser].evaluate(async()=>{session.retryPersistence();await session.whenSettled();});
  assert.deepEqual(await p.evaluate(()=>qa.createWarFencePortV94().read(qa.warPlanetStorageKeyV96('thalassa'))),thalassaBefore,'another world or stale retry cannot change Thalassa authority');
  await p.reload();await p.waitForFunction(()=>window.qa);await mountPlanet(p,'thalassa');
  assert.deepEqual(await p.evaluate(()=>({turn:session.getSnapshot().simulation.turn,persisted:session.getSnapshot().persistedWar})),{turn:winner.turn,persisted:true});
  await mountPlanet(p,'vitriol');assert.deepEqual(await p.evaluate(()=>({turn:session.getSnapshot().simulation.turn,persisted:session.getSnapshot().persistedWar})),{turn:17,persisted:true});
 });
 await check('an interrupted Vitriol mirror recovers its native intent and explicitly repairs one mirror write',async p=>{
  await mountPlanet(p,'vitriol');
  const interrupted=await p.evaluate(async()=>{
   const key=qa.warPlanetStorageKeyV96('vitriol'),nativeSet=Storage.prototype.setItem;
   Storage.prototype.setItem=function(name,raw){if(name!==key)nativeSet.call(this,name,raw);};
   session.setSimulation(current=>({...current,turn:11}));await session.whenSettled();
   const fence=await qa.createWarFencePortV94().read(key);
   return {persisted:session.getSnapshot().persistedWar,raw:localStorage.getItem(key),phase:fence?.phase,intendedTurn:JSON.parse(fence.after).turn};
  });
  assert.deepEqual(interrupted,{persisted:false,raw:null,phase:'intent',intendedTurn:11});
  await p.reload();await p.waitForFunction(()=>window.qa);await mountPlanet(p,'vitriol');
  assert.deepEqual(await p.evaluate(()=>({turn:session.getSnapshot().simulation.turn,persisted:session.getSnapshot().persistedWar,retry:session.getSnapshot().canRetryPersistence,raw:localStorage.getItem(qa.warPlanetStorageKeyV96('vitriol'))})),{turn:11,persisted:false,retry:true,raw:null});
  const repaired=await p.evaluate(async()=>{
   const key=qa.warPlanetStorageKeyV96('vitriol'),nativeSet=Storage.prototype.setItem;let writes=0;
   Storage.prototype.setItem=function(name,raw){if(name===key)writes++;nativeSet.call(this,name,raw);};
   session.retryPersistence();await session.whenSettled();Storage.prototype.setItem=nativeSet;
   const fence=await qa.createWarFencePortV94().read(key);
   return {writes,persisted:session.getSnapshot().persistedWar,turn:JSON.parse(localStorage.getItem(key)).turn,phase:fence?.phase};
  });
  assert.deepEqual(repaired,{writes:1,persisted:true,turn:11,phase:'confirmed'});
  await p.reload();await p.waitForFunction(()=>window.qa);await mountPlanet(p,'vitriol');
  assert.deepEqual(await p.evaluate(()=>({turn:session.getSnapshot().simulation.turn,persisted:session.getSnapshot().persistedWar,retry:session.getSnapshot().canRetryPersistence})),{turn:11,persisted:true,retry:false});
 });
 results.push({name:'No uncaught browser exceptions',status:errors.length?'FAIL':'PASS',errors});
 const report={scope:'Actual free-exercise stores; native browser persistence on synthetic local data, not played campaign or hardware QA',browser:browser.version(),results};await fs.mkdir('outputs/qa-audit-v94',{recursive:true});await fs.writeFile('outputs/qa-audit-v94/clan-fence-browser.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));assert.ok(results.every(r=>r.status==='PASS'));
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
