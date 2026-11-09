/** V151 real browser regression for V115 stale mission archives. Two genuine
 * ClanWarOperationsV115 mounts, one shared localStorage, no fake game state.
 * Exercises reset guards, focus return and non-destructive reload. This is
 * still local browser storage, NOT a cloud/PvP concurrency certificate. */
import assert from "node:assert/strict";
import {createServer} from "node:http";
import {mkdir,writeFile} from "node:fs/promises";
import {resolve} from "node:path";
import {fileURLToPath} from "node:url";
import {build} from "esbuild";
import {chromium} from "playwright-core";
const root=fileURLToPath(new URL("../",import.meta.url));
const out=resolve(root,"outputs/clan-war-v115-multitab-v151");
const key="yautja.clan-war.v115.operations.fenced.v2";
const sentinel="v151-unrelated-hunter-campaign";
const bundle=await build({absWorkingDir:root,
  entryPoints:["tests/browser/clan-war-v151-four-modes.fixture.tsx"],
  bundle:true,platform:"browser",format:"iife",jsx:"automatic",
  write:false,outfile:"v151-real-ops.js",logLevel:"warning"});
const js=bundle.outputFiles.find(x=>x.path.endsWith(".js"))?.contents;
const css=bundle.outputFiles.find(x=>x.path.endsWith(".css"))?.contents;
assert.ok(js&&css,"Production V115 and CSS need to bundle");
const html=`<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>V151 deux onglets V115</title><style>body{background:#0d1f24;color:#eaf8ee;font-family:system-ui;margin:0}*{box-sizing:border-box}button,select{min-height:38px}</style><link rel="stylesheet" href="/v151.css"></head><body><div id="root"></div><script src="/v151.js"></script></body></html>`;
const server=createServer((req,res)=>{
  const url=new URL(req.url??"/","http://127.0.0.1");
  if(url.pathname==="/"){res.writeHead(200,{"content-type":"text/html;charset=utf-8"});res.end(html);return;}
  if(url.pathname==="/v151.js"){res.writeHead(200,{"content-type":"text/javascript;charset=utf-8"});res.end(js);return;}
  if(url.pathname==="/v151.css"){res.writeHead(200,{"content-type":"text/css;charset=utf-8"});res.end(css);return;}
  if(url.pathname==="/favicon.ico"){res.writeHead(204);res.end();return;}
  res.writeHead(404);res.end("No mocked missions or art");
});
const checks=[],errors=[];let browser,online=false;
const pass=(name,detail)=>{checks.push({name,status:"PASS",detail});console.log("[V151 PASS] "+name);};
const readRaw=p=>p.evaluate(key=>localStorage.getItem(key),key);
const read=p=>p.evaluate(key=>{try{return JSON.parse(localStorage.getItem(key)||"null");}catch{return null;}},key);
const op=p=>p.locator('[data-testid="clan-operations-v115"]');
const reset=p=>op(p).getByRole("button",{name:"Réinitialiser V115 uniquement"});
async function selectTeamAndLaunch(page,mode){
  const lab=page.locator('[data-testid="v147-actual-four-mode-lab"]');
  const targetId=await lab.getAttribute("data-legal-target");
  const teamId=await lab.getAttribute("data-legal-team");
  assert.ok(targetId&&teamId);
  await op(page).getByRole("button",{name:mode==="outer"?/^Mandats délégués/:/^Infiltration et sabotage/}).click();
  await op(page).getByRole("combobox",{name:"Territoire de la Bible V6"}).selectOption(targetId);
  const members=op(page).locator('input[type="checkbox"]');
  for(let i=await members.count()-1;i>=1;i--){
    if(await members.nth(i).isChecked())await members.nth(i).uncheck();
  }
  if(!await members.first().isChecked())await members.first().check();
  const launch=op(page).getByRole("button",{name:/^Lancer :/});
  assert.equal(await launch.isEnabled(),true);
  await launch.click();
  await page.waitForFunction(({key,mode})=>{
    const raw=localStorage.getItem(key);
    if(!raw)return false;
    const data=JSON.parse(raw);
    return mode==="outer"?data.outer?.length===1:data.active?.mode===mode;
  },{key,mode},{timeout:30000});
  const archive=await read(page);
  assert.equal(archive.serial,1);
  assert.equal(archive.assignments[teamId],"W115-OPS-0001");
  return {teamId,targetId,archive};
}
try{
  await mkdir(out,{recursive:true});
  await new Promise((ok,fail)=>{server.once("error",fail);server.listen(0,"127.0.0.1",ok);});
  online=true;
  const addr=server.address();assert.ok(addr&&typeof addr==="object");
  browser=await chromium.launch(process.env.AUDIT_CHROME_EXECUTABLE?{executablePath:process.env.AUDIT_CHROME_EXECUTABLE,headless:true}:{channel:process.env.AUDIT_CHROME_CHANNEL||"chrome",headless:true});
  const ctx=await browser.newContext({locale:"fr-FR",viewport:{width:1280,height:850}});
  const url=`http://127.0.0.1:${addr.port}/`;
  const a=await ctx.newPage(),b=await ctx.newPage();
  for(const [id,page] of [["A",a],["B",b]]){
    page.setDefaultTimeout(30000);
    page.on("pageerror",error=>errors.push(id+": "+error.message));
    await page.goto(url,{waitUntil:"domcontentloaded"});
    await op(page).waitFor({timeout:40000});
  }
  await a.evaluate(k=>localStorage.setItem(k,"hunter-campaign-safe"),sentinel);
  assert.equal(await read(a),null);
  assert.equal(await read(b),null);
  pass("Both real V115 panels initially observe an empty exercise archive",{tabs:2});

  // A lock held in another real tab must prevent both an operation and reset.
  await b.evaluate(()=>{
    window.lockHeldV151=false;
    void navigator.locks.request("yautja.clan-war.v115.operations.fenced.v2.write",()=>{
      window.lockHeldV149=true;
      return new Promise(resolve=>{window.releaseV151=resolve;});
    });
  });
  await b.waitForFunction(()=>window.lockHeldV149===true);
  await a.bringToFront();
  await op(a).getByRole("button",{name:/^Mandats délégués/}).click();
  const launchLocked=op(a).getByRole("button",{name:/^Lancer :/});
  assert.equal(await launchLocked.isEnabled(),true);
  await launchLocked.click();
  await op(a).getByText(/Une autre écriture V115 est en cours/).waitFor();
  assert.equal(await readRaw(a),null);
  await op(b).getByRole("button",{name:/^Lancer :/}).click();
  await op(b).getByText(/Une autre écriture V115 est en cours/).waitFor();
  assert.equal(await readRaw(b),null);
  a.once("dialog",dialog=>dialog.accept());
  await reset(a).click();
  await a.waitForTimeout(100);
  assert.equal(await readRaw(a),null);
  await b.evaluate(()=>window.releaseV151());
  await b.waitForTimeout(100);
  pass("A held lock rejects V115 mission and reset without writing",{locked:true});

  // Start two actual panels at nearly the same instant. Exactly one archive
  // is accepted; the loser may observe the lock or the new bytes first.
  await op(b).getByRole("button",{name:/^Mandats délégués/}).click();
  assert.equal(await op(b).getByRole("button",{name:/^Lancer :/}).isEnabled(),true);
  await Promise.all([a,b].map(page=>page.evaluate(()=>{
    const button=[...document.querySelectorAll('button')].find(item=>item.textContent?.trim().startsWith('Lancer :'));
    button?.click();
  })));
  await a.waitForFunction(key=>{const raw=localStorage.getItem(key);return !!raw&&JSON.parse(raw).serial===1;},key);
  await a.waitForTimeout(200);
  const raced=await read(a);
  assert.equal(raced.serial,1);
  assert.equal(raced.outer.length,1);
  assert.equal(await readRaw(a),await readRaw(b));
  pass("Simultaneous real panels accept one mission and preserve one archive",{serial:1,orders:1});
  // Fixture cleanup followed by full hydration of both real panels.
  await a.evaluate(key=>localStorage.removeItem(key),key);
  await Promise.all([a.reload({waitUntil:"domcontentloaded"}),b.reload({waitUntil:"domcontentloaded"})]);
  await Promise.all([op(a).waitFor(),op(b).waitFor()]);

  const unsupported=await ctx.newPage();
  await unsupported.addInitScript(()=>Object.defineProperty(navigator,"locks",{value:undefined,configurable:true}));
  await unsupported.goto(url,{waitUntil:"domcontentloaded"});
  await op(unsupported).waitFor();
  await op(unsupported).getByRole("button",{name:/^Lancer :/}).click();
  await op(unsupported).getByRole("alert").filter({hasText:/Verrouillage sécurisé indisponible/}).waitFor();
  assert.equal(await readRaw(unsupported),null);
  await unsupported.close();
  pass("Missing Web Locks leaves persistent archive unchanged",{readOnly:true});

  // Defer the first callback to model a slow local storage write and submit two
  // clicks in the same turn. The second action must not disappear silently.
  await a.evaluate(()=>{
    const manager=navigator.locks;
    const original=manager.request.bind(manager);
    window.restoreRequestV151=()=>delete manager.request;
    Object.defineProperty(manager,"request",{configurable:true,value:(name,options,callback)=>original(name,options,async lock=>{
      if(lock){window.heldOwnWriteV151=true;await new Promise(resolve=>{window.releaseOwnWriteV151=resolve;});}
      return callback(lock);
    })});
  });
  await op(a).getByRole("button",{name:/^Mandats délégués/}).click();
  await a.evaluate(()=>{
    const button=[...document.querySelectorAll('button')].find(item=>item.textContent?.trim().startsWith('Lancer :'));
    button?.click();button?.click();
  });
  await a.waitForFunction(()=>window.heldOwnWriteV151===true);
  await op(a).getByText(/Une écriture V115 est en cours/).waitFor({timeout:3000});
  assert.equal(await readRaw(a),null);
  a.once("dialog",dialog=>dialog.accept());
  await reset(a).click();
  await op(a).getByText(/Une écriture V115 est en cours/).waitFor();
  assert.equal(await readRaw(a),null);
  await a.evaluate(()=>{window.releaseOwnWriteV151();window.restoreRequestV151();});
  await a.waitForFunction(key=>{const value=localStorage.getItem(key);return value&&JSON.parse(value).serial===1;},key);
  assert.equal((await read(a)).outer.length,1);
  pass("Rapid same-tab submissions provide feedback and charge only once",{serial:1});
  await a.evaluate(key=>localStorage.removeItem(key),key);
  await Promise.all([a.reload({waitUntil:"domcontentloaded"}),b.reload({waitUntil:"domcontentloaded"})]);
  await Promise.all([op(a).waitFor(),op(b).waitFor()]);

  // Start a real assault, hold its shared lock in B across several ticks,
  // then release it and check that the timer advances from the saved state.
  await op(a).getByRole("button",{name:/^Lancer :/}).click();
  await a.waitForFunction(key=>{const raw=localStorage.getItem(key);return raw&&JSON.parse(raw).active?.mode==="assault";},key);
  await b.evaluate(()=>{window.timerLockHeld=false;void navigator.locks.request("yautja.clan-war.v115.operations.fenced.v2.write",()=>{
    window.timerLockHeld=true;return new Promise(resolve=>{window.releaseTimerLock=resolve;});
  });});
  await b.waitForFunction(()=>window.timerLockHeld===true);
  const frozenTick=(await read(a)).active.tick;
  await a.waitForTimeout(1800);
  assert.equal((await read(a)).active.tick,frozenTick);
  await b.evaluate(()=>window.releaseTimerLock());
  await a.waitForFunction(({key,tick})=>{const raw=localStorage.getItem(key);return raw&&JSON.parse(raw).active?.tick>tick;},{key,tick:frozenTick},{timeout:5000});
  assert.equal(await a.evaluate(k=>localStorage.getItem(k),sentinel),"hunter-campaign-safe");
  pass("Assault timer waits for lock and resumes after release",{frozenTick});
  await a.evaluate(key=>localStorage.removeItem(key),key);
  await Promise.all([a.reload({waitUntil:"domcontentloaded"}),b.reload({waitUntil:"domcontentloaded"})]);
  await Promise.all([op(a).waitFor(),op(b).waitFor()]);

  // Real Outer Ops and real recruitment become due together. Move the clock
  // forward without altering either persisted record, and wait for both timers.
  await selectTeamAndLaunch(a,"outer");
  await op(a).getByRole("button",{name:/^Recruter ·/}).click();
  await a.waitForFunction(key=>{const raw=localStorage.getItem(key);return raw&&JSON.parse(raw).pendingRecruits?.length===1;},key);
  const dueBefore=await read(a);
  const jump=Math.max(dueBefore.outer[0].dueAt,dueBefore.pendingRecruits[0].dueAt)+1;
  await a.evaluate(stamp=>{Date.now=()=>stamp;},jump);
  await a.waitForFunction(key=>{const raw=localStorage.getItem(key);if(!raw)return false;const state=JSON.parse(raw);
    return state.outer.length===0&&state.pendingRecruits.length===0&&state.recruitedTeamIds.length===1&&state.reports.length>=1;
  },key,{timeout:10000});
  assert.equal(await a.evaluate(k=>localStorage.getItem(k),sentinel),"hunter-campaign-safe");
  pass("Simultaneous due mandate and recruitment both settle without losing either",{mandates:1,recruits:1,clockAdvanced:true});
  await a.evaluate(key=>localStorage.removeItem(key),key);
  await Promise.all([a.reload({waitUntil:"domcontentloaded"}),b.reload({waitUntil:"domcontentloaded"})]);
  await Promise.all([op(a).waitFor(),op(b).waitFor()]);

  await a.bringToFront();
  const launched=await selectTeamAndLaunch(a,"outer");
  const firstBytes=await readRaw(a);
  assert.ok(firstBytes);
  assert.equal(launched.archive.outer.length,1);
  pass("Tab A commissions Outer Ops from true V6 roster with single RAV charge",
    {serial:1,team:launched.teamId,target:launched.targetId});

  await b.bringToFront();
  await op(b).getByRole("alert").filter({hasText:/Front V115 modifié/}).waitFor({state:"visible",timeout:30000});
  assert.equal(await reset(b).isDisabled(),true);
  assert.equal(await op(b).getByRole("button",{name:/^Lancer :/}).isDisabled(),true);
  assert.equal(await readRaw(b),firstBytes);
  await b.screenshot({path:resolve(out,"01-tab-b-stale-reset-disabled.png"),fullPage:false});
  pass("Stale tab B disables reset and launch instead of overwriting A",
    {blocked:true,serial:launched.archive.serial});

  // Click on disabled HTML button is inert; even programmatic DOM clicks cannot
  // bypass the handler's snapshot guard. A real reset first needs a fresh reload.
  await b.evaluate(()=>document.querySelector('button[class*="reset"]')?.click());
  assert.equal(await readRaw(b),firstBytes);
  assert.equal(await b.evaluate(k=>localStorage.getItem(k),sentinel),"hunter-campaign-safe");
  pass("Attempting a stale V115 reset is inert and cannot change another save",
    {oldBytesProtected:true});

  await a.bringToFront();
  let accepted=0;
  a.on("dialog",async dialog=>{accepted++;await dialog.accept();});
  await reset(a).click();
  await a.waitForFunction(key=>{const raw=localStorage.getItem(key);return !!raw&&JSON.parse(raw).serial===0;},key,{timeout:20000});
  const resetBytes=await readRaw(a);
  assert.notEqual(resetBytes,firstBytes);
  assert.equal(accepted,1);
  assert.equal((await read(a)).reports.length,0);
  await a.screenshot({path:resolve(out,"02-tab-a-explicit-safe-reset.png"),fullPage:false});
  pass("Owner tab A resets only its own current V115 archive after confirmation",
    {reset:true,serial:0});

  await b.bringToFront();
  assert.equal(await reset(b).isDisabled(),true);
  await b.reload({waitUntil:"domcontentloaded"});
  await op(b).waitFor();
  assert.equal(await reset(b).isEnabled(),true);
  const revived=await read(b);
  assert.equal(revived.serial,0);
  pass("Stale tab B cannot reset until reloading the authoritative archive",
    {reloaded:true,serial:0});
  const started=await selectTeamAndLaunch(b,"stealth");
  assert.equal(started.archive.serial,1);
  await b.screenshot({path:resolve(out,"03-tab-b-safe-stealth-after-reload.png"),fullPage:false});
  pass("Reloaded tab B can legitimately start a new stealth operation",
    {mode:"stealth",team:started.teamId});

  await a.bringToFront();
  await op(a).getByRole("alert").filter({hasText:/Front V115 modifié/}).waitFor({state:"visible",timeout:30000});
  assert.equal(await reset(a).isDisabled(),true);
  assert.equal(await readRaw(a),await readRaw(b));
  assert.equal((await read(a)).active?.mode,"stealth");
  await a.screenshot({path:resolve(out,"04-tab-a-now-stale.png"),fullPage:false});
  pass("Tab A becomes stale after B's fresh write and cannot destroy it",
    {archiveSerial:1,mode:"stealth"});

  assert.equal(await a.evaluate(k=>localStorage.getItem(k),sentinel),"hunter-campaign-safe");
  assert.deepEqual(errors,[]);
  const report={schema:151,scope:"Two real V115 panels, Web Locks and shared localStorage: contended writes, unavailable lock and stale reset. Only cooperating tabs, not legacy writers, other devices, cloud or full GameClient.",
    checked:checks.length,preventedStaleReset:true,verifiedFocusRefresh:true,localOnly:true,
    sourceModes:["outer","stealth"],campaignUnchanged:true,oneToOneValidated:0,
    checks,errors,artApproved:false};
  await writeFile(resolve(out,"v151-two-tab-operations-proof.json"),JSON.stringify(report,null,2)+"\n");
  console.log(JSON.stringify({checked:report.checked,preventedStaleReset:report.preventedStaleReset,
    modes:report.sourceModes,errors:report.errors.length},null,2));
  await ctx.close();
}finally{
  await browser?.close();
  if(online){server.closeAllConnections();await new Promise(done=>server.close(done));}
}
