/** Native localStorage and Web Locks integration on an isolated localhost origin.
 * Seeded campaign fixtures, not a played campaign or a cloud-service test. */
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { chromium } from 'playwright-core';
const root = fileURLToPath(new URL('../', import.meta.url));
const bundle = await build({ stdin: { resolveDir: root, loader: 'ts', contents: `
import * as slots from './app/game/systems/campaignSlots';
import * as saves from './app/game/save';
import * as transaction from './app/game/systems/archiveTransaction';
import { ARCHIVE_TRANSFER_JOURNAL_KEY, archiveSessionInvalidated } from './app/game/systems/archiveTransferGuard';
window.__campaignStorageAuditV94 = {...slots,...saves,...transaction,ARCHIVE_TRANSFER_JOURNAL_KEY,archiveSessionInvalidated};
` }, bundle: true, write: false, format: 'esm', platform: 'browser', logLevel: 'silent' });
const server = http.createServer((req,res) => {
  if(req.url === '/fixture.js') { res.writeHead(200,{'Content-Type':'text/javascript','Cache-Control':'no-store'});res.end(bundle.outputFiles[0].text); }
  else if(req.url === '/') {res.writeHead(200,{'Content-Type':'text/html','Cache-Control':'no-store'});res.end('<!doctype html><title>Campaign storage integration</title><script type="module" src="/fixture.js"></script>');}
  else {res.writeHead(404);res.end();}
});
await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
const origin = `http://127.0.0.1:${server.address().port}`, results = [], errors = [];
let browser;
try {
  browser = await chromium.launch(process.env.AUDIT_CHROME_CHANNEL ? {channel:process.env.AUDIT_CHROME_CHANNEL} : {});
  const context = await browser.newContext();
  await context.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort('blockedbyclient'));
  async function open() {const page=await context.newPage();page.setDefaultTimeout(8000);page.on('pageerror',e=>errors.push(e.message));await page.goto(origin);await page.waitForFunction(()=>window.__campaignStorageAuditV94);return page;}
  const page = await open(), other = await open();
  async function seed() {
    return page.evaluate(async()=>{
      localStorage.clear();const a=window.__campaignStorageAuditV94;
      const save=a.defaultSave('2026-10-16T00:00:00.000Z');save.profile.hunterName='QA native storage';
      localStorage.setItem(a.SAVE_STORAGE_KEY,JSON.stringify(save));
      return a.migrateLegacyCampaignSlot();
    });
  }
  const snapshot = () => page.evaluate(()=>Object.fromEntries(Object.keys(localStorage).sort().map(k=>[k,localStorage.getItem(k)])));
  async function check(name,run) {
    try {
      // A prior real transfer correctly invalidates the other document for its
      // entire lifetime. Start each independent scenario with new documents;
      // never reset or bypass the production invalidation guard.
      await Promise.all([page.reload(),other.reload()]);
      await Promise.all([page.waitForFunction(()=>window.__campaignStorageAuditV94),other.waitForFunction(()=>window.__campaignStorageAuditV94)]);
      const seeded=await seed();assert.equal(seeded.ok,true,seeded.message);
      await run();results.push({name,status:'PASS'});console.log('PASS '+name);
    }
    catch(error){results.push({name,status:'FAIL',error:error.message});console.error('FAIL '+name+': '+error.message);}
  }
  await check('legacy migration preserves original owner and becomes readable in another tab',async()=>{
    const result=await other.evaluate(()=>{const a=window.__campaignStorageAuditV94;return{catalog:a.loadCampaignSlots(),save:JSON.parse(localStorage.getItem(a.SAVE_STORAGE_KEY))};});
    assert.equal(result.catalog.activeSlotId,1);assert.equal(result.save.createdAt,'2026-10-16T00:00:00.000Z');assert.equal(result.catalog.slots[0].status,'ready');
  });
  await check('manual checkpoint restores native persisted progress and keeps a safety auto',async()=>{
    const result=await page.evaluate(async()=>{
      const a=window.__campaignStorageAuditV94,rev=()=>a.loadCampaignSlots().slots[0].revision;
      const saved=await a.saveCampaignCheckpoint(1,{kind:'manual',index:1,location:'deck',expectedRevision:rev()});
      const working=JSON.parse(localStorage.getItem(a.SAVE_STORAGE_KEY));working.profile.playTimeSeconds=247;
      localStorage.setItem(a.SAVE_STORAGE_KEY,JSON.stringify(working));
      const restored=await a.activateCampaignCheckpoint(1,'manual-1',{expectedRevision:rev()});
      return{saved,restored,working:JSON.parse(localStorage.getItem(a.SAVE_STORAGE_KEY)),catalog:a.loadCampaignSlots(),journal:localStorage.getItem(a.ARCHIVE_TRANSFER_JOURNAL_KEY)};
    });
    assert.equal(result.saved.ok,true,result.saved.message);assert.equal(result.restored.ok,true,result.restored.message);
    assert.equal(result.restored.checkpoint.resumeLocation,'deck');assert.equal(result.working.profile.playTimeSeconds,0);
    assert.ok(result.catalog.slots[0].checkpoints.some(c=>c.kind==='auto'&&c.playTimeSeconds===247));assert.equal(result.journal,null);
  });
  await check('reload then Continue retains an explicit Homeworld checkpoint',async()=>{
    const saved=await page.evaluate(()=>{const a=window.__campaignStorageAuditV94;return a.saveCampaignCheckpoint(1,{kind:'manual',index:1,location:'homeworld',expectedRevision:a.loadCampaignSlots().slots[0].revision});});
    assert.equal(saved.ok,true,saved.message);
    await page.reload();await page.waitForFunction(()=>window.__campaignStorageAuditV94);
    const continued=await page.evaluate(()=>{const a=window.__campaignStorageAuditV94;return a.continueCampaignSlot(1,{expectedRevision:a.loadCampaignSlots().slots[0].revision});});
    assert.equal(continued.ok,true,continued.message);assert.equal(continued.checkpoint.resumeLocation,'homeworld');assert.equal(continued.save.createdAt,'2026-10-16T00:00:00.000Z');
  });
  await check('a stale revision from another tab is refused without modifying any bytes',async()=>{
    const observed=await page.evaluate(()=>window.__campaignStorageAuditV94.loadCampaignSlots().slots[0].revision);
    const changed=await other.evaluate(()=>{const a=window.__campaignStorageAuditV94;return a.saveCampaignCheckpoint(1,{kind:'manual',index:2,expectedRevision:a.loadCampaignSlots().slots[0].revision});});assert.equal(changed.ok,true,changed.message);
    const before=await snapshot();const result=await page.evaluate(expectedRevision=>window.__campaignStorageAuditV94.saveCampaignCheckpoint(1,{kind:'manual',index:3,expectedRevision}),observed);
    assert.equal(result.ok,false);assert.equal(result.failure,'save-conflict');assert.deepEqual(await snapshot(),before);
  });
  await check('import preview is read-only and a cross-tab modification invalidates confirmation',async()=>{
    const before=await snapshot();
    const preview=await page.evaluate(()=>{const a=window.__campaignStorageAuditV94;const prepared=a.prepareCampaignSlotImport(2,JSON.stringify(a.defaultSave('2026-10-15T00:00:00.000Z')));window.__importPreviewV94=prepared.preview;return prepared;});
    assert.equal(preview.ok,true,preview.message);assert.deepEqual(await snapshot(),before);
    await other.evaluate(()=>{const a=window.__campaignStorageAuditV94,save=JSON.parse(localStorage.getItem(a.SAVE_STORAGE_KEY));save.profile.playTimeSeconds=99;localStorage.setItem(a.SAVE_STORAGE_KEY,JSON.stringify(save));});
    const changed=await snapshot();const result=await page.evaluate(()=>window.__campaignStorageAuditV94.importCampaignSlot(window.__importPreviewV94));
    assert.equal(result.ok,false);assert.equal(result.failure,'save-conflict');assert.deepEqual(await snapshot(),changed);
  });
  await check('import archives a foreign owner without activation; explicit load then switches owners',async()=>{
    const result=await page.evaluate(async()=>{
      const a=window.__campaignStorageAuditV94,original=localStorage.getItem(a.SAVE_STORAGE_KEY);
      const p=a.prepareCampaignSlotImport(2,JSON.stringify(a.defaultSave('2026-10-15T00:00:00.000Z')));
      if(!p.ok)throw new Error(p.message);const imported=await a.importCampaignSlot(p.preview);
      const unchanged=localStorage.getItem(a.SAVE_STORAGE_KEY)===original,slot=a.loadCampaignSlots().slots[1];
      const activated=await a.activateCampaignCheckpoint(2,slot.lastCheckpointId,{expectedRevision:slot.revision});
      return{imported,unchanged,activated,owner:JSON.parse(localStorage.getItem(a.SAVE_STORAGE_KEY)).createdAt};
    });
    assert.equal(result.imported.ok,true,result.imported.message);assert.equal(result.unchanged,true);assert.equal(result.activated.ok,true,result.activated.message);assert.equal(result.owner,'2026-10-15T00:00:00.000Z');
  });
  await check('a real archive transfer invalidates the other tab until reload, even after journal cleanup',async()=>{
    const transferred=await page.evaluate(async()=>{
      const a=window.__campaignStorageAuditV94,rev=()=>a.loadCampaignSlots().slots[0].revision;
      const stored=await a.saveCampaignCheckpoint(1,{kind:'manual',index:1,location:'deck',expectedRevision:rev()});
      if(!stored.ok)throw new Error(stored.message);
      return a.activateCampaignCheckpoint(1,'manual-1',{expectedRevision:rev()});
    });
    assert.equal(transferred.ok,true,transferred.message);
    await other.waitForFunction(()=>window.__campaignStorageAuditV94.archiveSessionInvalidated());
    assert.equal(await page.evaluate(()=>localStorage.getItem(window.__campaignStorageAuditV94.ARCHIVE_TRANSFER_JOURNAL_KEY)),null);
    const before=await snapshot();
    const refused=await other.evaluate(()=>{const a=window.__campaignStorageAuditV94;return a.saveCampaignCheckpoint(1,{kind:'manual',index:2,expectedRevision:a.loadCampaignSlots().slots[0].revision});});
    assert.equal(refused.ok,false);assert.deepEqual(await snapshot(),before);
    await other.reload();await other.waitForFunction(()=>window.__campaignStorageAuditV94);
    assert.equal(await other.evaluate(()=>window.__campaignStorageAuditV94.archiveSessionInvalidated()),false);
    const retried=await other.evaluate(()=>{const a=window.__campaignStorageAuditV94;return a.saveCampaignCheckpoint(1,{kind:'manual',index:2,expectedRevision:a.loadCampaignSlots().slots[0].revision});});
    assert.equal(retried.ok,true,retried.message);
  });
  await check('native Web Locks prevent a timed-out tab from writing later; retry succeeds after release',async()=>{
    await page.evaluate(()=>{
      window.__auditLockHeldV94=false;
      window.__auditLockDoneV94=navigator.locks.request('yautja-full-archive-transfer',()=>new Promise(resolve=>{window.__auditLockHeldV94=true;window.__auditReleaseV94=resolve;}));
    });
    await page.waitForFunction(()=>window.__auditLockHeldV94);
    try {
      const denied=await other.evaluate(()=>window.__campaignStorageAuditV94.withArchiveTransferLock(()=>{localStorage.setItem('qa-lock-probe','late');return true;},40));
      assert.equal(denied.acquired,false);assert.equal(await other.evaluate(()=>localStorage.getItem('qa-lock-probe')),null);
    } finally {await page.evaluate(async()=>{window.__auditReleaseV94();await window.__auditLockDoneV94;});}
    await other.waitForTimeout(100);assert.equal(await other.evaluate(()=>localStorage.getItem('qa-lock-probe')),null);
    const retry=await other.evaluate(()=>window.__campaignStorageAuditV94.withArchiveTransferLock(()=>{localStorage.setItem('qa-lock-probe','retry');return true;}));assert.equal(retry.acquired,true);assert.equal(retry.value,true);
  });
  await check('future campaign data is not overwritten by Continue',async()=>{
    await page.evaluate(()=>{const a=window.__campaignStorageAuditV94,save=JSON.parse(localStorage.getItem(a.SAVE_STORAGE_KEY));save.version=999;localStorage.setItem(a.SAVE_STORAGE_KEY,JSON.stringify(save));});
    const before=await snapshot();const result=await page.evaluate(()=>window.__campaignStorageAuditV94.continueCampaignSlot(1,{expectedRevision:1}));
    assert.equal(result.ok,false);assert.deepEqual(await snapshot(),before);
  });
  results.push({name:'No uncaught browser exceptions',status:errors.length?'FAIL':'PASS',errors});
  const report={scope:'Native localStorage/Web Locks, seeded fixtures and actual campaign domain, isolated local origin; no full gameplay or cloud validation',browser:browser.version(),results};
  await fs.mkdir(path.join(root,'outputs','qa-audit-v94'),{recursive:true});
  await fs.writeFile(path.join(root,'outputs','qa-audit-v94','campaign-storage-browser.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
  if(results.some(row=>row.status!=='PASS'))process.exitCode=1;
} finally {await browser?.close();await new Promise(resolve=>server.close(resolve));}
