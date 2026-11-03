/** Isolated recovery API qualification, NOT a wired GameClient or played rite.
 * Synthetic operation/profile; actual save writer, IndexedDB and browser pages. */
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { chromium } from 'playwright-core';
const root = fileURLToPath(new URL('../', import.meta.url));
const entry = `
import * as save from './app/game/save';
import * as receipt from './app/game/systems/trophyWorkshopCommitV94';
import * as journal from './app/game/systems/trophyWorkshopRecoveryV94';
const a={...save,...receipt,...journal};
window.__trophyRecoveryAPI=a;
const state={writes:0,fault:'none',readFails:0};
const get=Storage.prototype.getItem, set=Storage.prototype.setItem;
Storage.prototype.getItem=function(key){if(this===localStorage&&key===a.SAVE_STORAGE_KEY&&state.readFails){state.readFails--;throw Error('Injected readback failure');}return get.call(this,key);};
Storage.prototype.setItem=function(key,value){if(this===localStorage&&key===a.SAVE_STORAGE_KEY){state.writes++;if(state.fault==='drop')return;if(state.fault==='quota')throw Error('Injected quota');}set.call(this,key,value);if(this===localStorage&&key===a.SAVE_STORAGE_KEY&&state.fault==='readback')state.readFails=1;};
const owner='2026-10-16T00:00:00.000Z',completedAt='2026-10-16T12:00:00.000Z';
window.__trophyRecoveryQA={state,owner,completedAt,seed(action){
 const seed=a.defaultSave(owner);
 seed.trophies=[{id:'claim-v94',definitionId:'trophy-vey',targetName:'Prise de test',targetKind:'human',partId:'insignia',condition:'pristine',quality:'elite',missionId:'jungle-vey',difficultyId:'elite',score:200,claimedAt:owner}];
 if(action!=='clean')seed.trophies[0].workshop={completedActions:['clean','prepare','display'].slice(0,['clean','prepare','display','rite'].indexOf(action)),bestScore:500,lastCompletedAt:owner};
 const result=a.writeSaveWithStatus(seed);if(!result.persisted)throw Error('Fixture seed rejected');
 state.writes=0;return result.save;
},async pending(action,fault){
 const base=this.seed(action),r=a.createTrophyWorkshopCommitV94(base,{trophyId:'claim-v94',trophyName:'Prise de test',action},{action,score:450,accuracy:.9,mistakes:0,elapsedSeconds:10,grade:'elite'},undefined,completedAt);
 state.fault=fault;const outcome=r.run(base,true);state.fault='none';
 if(outcome.status!=='pending')throw Error('Expected injected write refusal');
 const q=a.createTrophyWorkshopRecoveryQueueV94(owner,a.createTrophyWorkshopRecoveryPortV94());await q.read();
 const raw=JSON.stringify(r.recoveryCopy());await q.replace(raw);this.receipt=r;this.base=base;
 return {raw,writes:state.writes,primary:localStorage.getItem(a.SAVE_STORAGE_KEY)};
},async restore(){
 const current=a.loadSaveWithStatus().save,q=a.createTrophyWorkshopRecoveryQueueV94(owner,a.createTrophyWorkshopRecoveryPortV94());
 const raw=await q.read(),r=a.restoreTrophyWorkshopCommitV94(raw,current);
 if(!r)throw Error('Valid recovery refused');this.current=current;this.restored=r;this.queue=q;
 return {writes:state.writes,current,raw};
}};
`;
const compiled = await build({ stdin: { contents: entry, resolveDir: root, loader: 'ts' }, bundle: true, write: false, platform: 'browser', format: 'esm', logLevel: 'silent' });
const js = compiled.outputFiles[0].contents;
const server = http.createServer((req, res) => {
  if (req.url === '/fixture.js') { res.setHeader('Content-Type', 'text/javascript; charset=utf-8'); res.end(js); }
  else if (req.url === '/') { res.setHeader('Content-Type', 'text/html; charset=utf-8'); res.end('<!doctype html><title>Trophy recovery API QA</title><script type="module" src="/fixture.js"></script>'); }
  else { res.writeHead(404); res.end(); }
});
await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
const origin = `http://127.0.0.1:${server.address().port}`, results = [], errors = [];
let browser;
try {
  browser = await chromium.launch({ headless: true, ...(process.env.AUDIT_CHROME_EXECUTABLE ? { executablePath: process.env.AUDIT_CHROME_EXECUTABLE } : process.env.AUDIT_CHROME_CHANNEL ? { channel: process.env.AUDIT_CHROME_CHANNEL } : {}) });
  async function ready(page) { await page.goto(origin); await page.waitForFunction(() => window.__trophyRecoveryQA); }
  async function scenario(name, run) {
    const context = await browser.newContext();
    await context.route('**/*', route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
    context.on('page', page => page.on('pageerror', error => errors.push(error.message)));
    const page = await context.newPage(); page.setDefaultTimeout(7000);
    try { await ready(page); await run(page, context); results.push({name, status:'PASS'}); console.log(`PASS ${name}`); }
    catch (error) { results.push({name, status:'FAIL', error:String(error)}); console.error(`FAIL ${name}: ${error}`); }
    finally { await context.close(); }
  }
  for (const action of ['clean', 'prepare', 'display', 'rite']) await scenario(`${action}: native journal survives reload and explicit retry writes one result`, async page => {
    const pending = await page.evaluate(action => window.__trophyRecoveryQA.pending(action, 'drop'), action);
    assert.equal(pending.writes, 1);
    await ready(page);
    const recovered = await page.evaluate(() => window.__trophyRecoveryQA.restore());
    assert.equal(recovered.writes, 0, 'restoration cannot itself grant progress');
    assert.equal(recovered.raw, pending.raw);
    const result = await page.evaluate(async () => { const q=window.__trophyRecoveryQA,r=q.restored.run(q.current,true);await q.queue.replace(null);return{outcome:r,writes:q.state.writes,again:q.restored.run(r.save,true).status,backup:await q.queue.read()}; });
    assert.equal(result.outcome.status, 'confirmed'); assert.equal(result.writes, 1); assert.equal(result.again, 'ignored'); assert.equal(result.backup, null);
    assert.equal(result.outcome.save.trophies[0].workshop.lastCompletedAt, '2026-10-16T12:00:00.000Z');
    assert.equal(result.outcome.save.trophies[0].workshop.completedActions.filter(x=>x===action).length, 1);
  });
  await scenario('write-before-readback failure is recognized after reload without another primary write', async page => {
    await page.evaluate(() => window.__trophyRecoveryQA.pending('clean','readback')); await ready(page);
    await page.evaluate(() => window.__trophyRecoveryQA.restore());
    const result = await page.evaluate(() => {const q=window.__trophyRecoveryQA;return{outcome:q.restored.run(q.current,true),writes:q.state.writes};});
    assert.equal(result.outcome.status,'confirmed');assert.equal(result.writes,0);
  });
  await scenario('backup left after confirmed retry never duplicates a rite on later recovery', async page => {
    await page.evaluate(() => window.__trophyRecoveryQA.pending('clean','drop'));
    const status=await page.evaluate(()=>{const q=window.__trophyRecoveryQA;return q.receipt.run(q.base,true).status;});assert.equal(status,'confirmed');
    await ready(page);await page.evaluate(()=>window.__trophyRecoveryQA.restore());
    const r=await page.evaluate(()=>{const q=window.__trophyRecoveryQA;return{status:q.restored.run(q.current,true).status,writes:q.state.writes};});
    assert.equal(r.status,'confirmed');assert.equal(r.writes,0);
  });
  await scenario('another campaign update is preserved byte for byte by recovery inspection', async page => {
    await page.evaluate(()=>window.__trophyRecoveryQA.pending('clean','drop'));
    const expected=await page.evaluate(()=>{const a=window.__trophyRecoveryAPI,s=JSON.parse(localStorage.getItem(a.SAVE_STORAGE_KEY));s.statistics.totalScans=673;const raw=JSON.stringify(s);localStorage.setItem(a.SAVE_STORAGE_KEY,raw);return raw;});
    await ready(page);await page.evaluate(()=>window.__trophyRecoveryQA.restore());
    const r=await page.evaluate(()=>{const a=window.__trophyRecoveryAPI,q=window.__trophyRecoveryQA;return{status:q.restored.run(q.current,true).status,writes:q.state.writes,raw:localStorage.getItem(a.SAVE_STORAGE_KEY)};});
    assert.equal(r.status,'pending');assert.equal(r.writes,0);assert.equal(r.raw,expected);
  });
  await scenario('two native queues cannot replace or erase a competing journal copy', async (page, context) => {
    const second=await context.newPage();await ready(second);
    for(const p of [page,second])await p.evaluate(async()=>{const a=window.__trophyRecoveryAPI;window.__queue=a.createTrophyWorkshopRecoveryQueueV94(window.__trophyRecoveryQA.owner,a.createTrophyWorkshopRecoveryPortV94());await window.__queue.read();});
    const attempts=await Promise.all([page,second].map((p,i)=>p.evaluate(async i=>{try{await window.__queue.replace(`copy-${i}`);return true;}catch{return false;}},i)));
    assert.equal(attempts.filter(Boolean).length,1);
    const loser=attempts[0]?second:page;
    assert.equal(await loser.evaluate(async()=>{try{await window.__queue.replace(null);return true;}catch{return false;}}),false);
    const raw=await page.evaluate(()=>window.__trophyRecoveryAPI.createTrophyWorkshopRecoveryPortV94().read(window.__trophyRecoveryQA.owner));
    assert.equal(raw,attempts[0]?'copy-0':'copy-1');
  });
  await scenario('aborted native journal transaction is not acknowledged as a backup', async page => {
    const result=await page.evaluate(async()=>{const a=window.__trophyRecoveryAPI,o=window.__trophyRecoveryQA.owner,p=a.createTrophyWorkshopRecoveryPortV94();await p.read(o);const original=IDBDatabase.prototype.transaction;
      IDBDatabase.prototype.transaction=function(...args){const t=original.apply(this,args);if(this.name===a.TROPHY_WORKSHOP_RECOVERY_DB_V94&&args[1]==='readwrite')queueMicrotask(()=>{try{t.abort();}catch{}});return t;};
      let accepted=false;try{await p.replace(o,null,'pending');accepted=true;}catch{}finally{IDBDatabase.prototype.transaction=original;}
      return{accepted,raw:await p.read(o)};
    });assert.equal(result.accepted,false);assert.equal(result.raw,null);
  });
  await scenario('denied IndexedDB never falls back to writing campaign storage', async page => {
    const r=await page.evaluate(async()=>{const a=window.__trophyRecoveryAPI;Object.defineProperty(window,'indexedDB',{configurable:true,get(){throw Error('Injected denial');}});try{await a.createTrophyWorkshopRecoveryPortV94().read(window.__trophyRecoveryQA.owner);return{accepted:true};}catch{return{accepted:false,writes:window.__trophyRecoveryQA.state.writes};}});
    assert.equal(r.accepted,false);assert.equal(r.writes,0);
  });
  await scenario('future journal database remains at its original version', async page => {
    const r=await page.evaluate(async()=>{const a=window.__trophyRecoveryAPI;await new Promise((resolve,reject)=>{const request=indexedDB.open(a.TROPHY_WORKSHOP_RECOVERY_DB_V94,2);request.onupgradeneeded=()=>request.result.createObjectStore('future');request.onerror=()=>reject(request.error);request.onsuccess=()=>{request.result.close();resolve();};});let accepted=false;try{await a.createTrophyWorkshopRecoveryPortV94().read(window.__trophyRecoveryQA.owner);accepted=true;}catch{}const version=await new Promise((resolve,reject)=>{const request=indexedDB.open(a.TROPHY_WORKSHOP_RECOVERY_DB_V94);request.onerror=()=>reject(request.error);request.onsuccess=()=>{const v=request.result.version;request.result.close();resolve(v);};});return{accepted,version};});
    assert.equal(r.accepted,false);assert.equal(r.version,2);
  });
  const report={scope:'Trophy recovery domain and native journal only; synthetic rite result/profile. GameClient integration is NOT published and no played-rite claim is made.',browser:browser.version(),results,errors};
  await fs.mkdir(path.join(root,'outputs/qa-audit-v94'),{recursive:true});
  await fs.writeFile(path.join(root,'outputs/qa-audit-v94/trophy-recovery-domain-browser.json'),JSON.stringify(report,null,2));
  console.log(JSON.stringify(report,null,2));
  if(errors.length||results.some(r=>r.status!=='PASS'))process.exitCode=1;
} finally { await browser?.close();await new Promise(resolve=>server.close(resolve)); }
