/** V152 — real RTS tick + Web Lock multi-tab integration.
 * Boots the production ClanWarOperationsV115 UI and V6 sources. We do NOT
 * simulate combat or write a fake game-state archive in this test.
 * Scope: cooperating tabs in a single browser. Not cloud/PvP/canon 1:1.
 */
import assert from "node:assert/strict";
import {createServer} from "node:http";
import {mkdir,writeFile} from "node:fs/promises";
import {resolve} from "node:path";
import {fileURLToPath} from "node:url";
import {build} from "esbuild";
import {chromium} from "playwright-core";

const root=fileURLToPath(new URL("../",import.meta.url));
const output=resolve(root,"outputs/clan-war-v152-rts-lock");
const key="yautja.clan-war.v115.operations.fenced.v2";
const hunterKey="v152-unrelated-hunter-save";
const lockName="yautja.clan-war.v115.operations.fenced.v2.write";
const bundle=await build({absWorkingDir:root,
  entryPoints:["tests/browser/clan-war-v151-four-modes.fixture.tsx"],
  bundle:true,platform:"browser",format:"iife",jsx:"automatic",write:false,
  outfile:"v152.js",logLevel:"warning"});
const js=bundle.outputFiles.find(f=>f.path.endsWith(".js"))?.contents;
const css=bundle.outputFiles.find(f=>f.path.endsWith(".css"))?.contents;
assert.ok(js&&css,"Real four-mode V115 CSS and JS must bundle");
const html=`<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>V152 · RTS véritable et Web Lock</title><style>body{color:#e8faf0;background:#0d1e24;font:14px system-ui;margin:0}*{box-sizing:border-box}button,select{min-height:38px}</style><link rel="stylesheet" href="/v152.css"></head><body><div id="root"></div><script src="/v152.js"></script></body></html>`;
const server=createServer((req,res)=>{
  const pathname=new URL(req.url??"/","http://localhost").pathname;
  if(pathname==="/"){res.writeHead(200,{"content-type":"text/html;charset=utf-8"});res.end(html);return;}
  if(pathname==="/v152.js"){res.writeHead(200,{"content-type":"text/javascript;charset=utf-8"});res.end(js);return;}
  if(pathname==="/v152.css"){res.writeHead(200,{"content-type":"text/css;charset=utf-8"});res.end(css);return;}
  if(pathname==="/favicon.ico"){res.writeHead(204);res.end();return;}
  res.writeHead(404);res.end("No fake missions, no generated media");
});
const checks=[],pageErrors=[];
const pass=(name,detail)=>{checks.push({name,status:"PASS",detail});console.log("[V152 PASS] "+name);};
const op=page=>page.locator('[data-testid="clan-operations-v115"]');
const read=page=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)||"null"),key);
const raw=page=>page.evaluate(key=>localStorage.getItem(key),key);
let browser,online=false,held=false;
try{
  await mkdir(output,{recursive:true});
  await new Promise((ok,fail)=>{server.once("error",fail);server.listen(0,"127.0.0.1",ok);});
  online=true;const addr=server.address();
  assert.ok(addr&&typeof addr==="object");
  browser=await chromium.launch(process.env.AUDIT_CHROME_EXECUTABLE?
    {executablePath:process.env.AUDIT_CHROME_EXECUTABLE,headless:true}:
    {channel:process.env.AUDIT_CHROME_CHANNEL||"chrome",headless:true});
  const ctx=await browser.newContext({locale:"fr-FR",viewport:{width:1320,height:900}});
  const url=`http://127.0.0.1:${addr.port}/`;
  const a=await ctx.newPage(),b=await ctx.newPage();
  for(const [name,page] of [["A",a],["B",b]]){
    page.setDefaultTimeout(25000);
    page.on("pageerror",error=>pageErrors.push(name+": "+error.message));
    await page.goto(url,{waitUntil:"domcontentloaded"});
    await op(page).waitFor({timeout:35000});
  }
  await a.evaluate(key=>localStorage.setItem(key,"hunter-profile-unchanged"),hunterKey);
  assert.equal(await read(a),null);
  assert.equal(await read(b),null);
  pass("Two actual V115 panels mount with one independent V6 archive",{tabs:2});

  await a.bringToFront();
  const lab=a.locator('[data-testid="v147-actual-four-mode-lab"]');
  const target=await lab.getAttribute("data-legal-target");
  const team=await lab.getAttribute("data-legal-team");
  assert.ok(target&&team);
  await op(a).getByRole("button",{name:/^Bataille totale/}).click();
  await op(a).getByRole("combobox",{name:"Territoire de la Bible V6"}).selectOption(target);
  const choices=op(a).locator('input[type="checkbox"]');
  for(let i=await choices.count()-1;i>=1;i--)if(await choices.nth(i).isChecked())await choices.nth(i).uncheck();
  if(!await choices.first().isChecked())await choices.first().check();
  const launch=op(a).getByRole("button",{name:/^Lancer :/});
  assert.equal(await launch.isEnabled(),true,"Actual W3/V6 route is required");
  await launch.click();
  await a.waitForFunction(k=>{
    const s=JSON.parse(localStorage.getItem(k)||"null");
    return s?.serial===1&&s.active?.mode==="rts"&&s.active?.rts?.realtime===true;
  },key,{timeout:22000});
  const initial=await read(a);
  assert.equal(initial.active.mode,"rts");
  assert.equal(initial.assignments[team],"W115-OPS-0001");
  assert.equal(initial.active.targetId,target);
  assert.equal(initial.active.rts.realtime,true);
  const initialRav=initial.rav;
  pass("Real RTS auto-start activates genuine realtime combat and spends RAV once",
    {serial:initial.serial,target,team,rav:initialRav});
  await a.screenshot({path:resolve(output,"01-actual-rts-start.png"),fullPage:false});

  // The second live browser tab deliberately holds the native cross-tab lock.
  // Its V115 panel can be stale, yet Web Locks remain available to this tab.
  await b.evaluate(name=>{
    window.v152Held=false;
    void navigator.locks.request(name,()=>{
      window.v152Held=true;
      return new Promise(resolve=>{window.v152Release=resolve;});
    });
  },lockName);
  await b.waitForFunction(()=>window.v152Held===true,{timeout:9000});
  held=true;
  await a.bringToFront();
  const frozen=await read(a);
  assert.equal(frozen.active?.mode,"rts","RTS must be running when lock freezes");
  const frozenRaw=await raw(a);
  await a.waitForTimeout(2500);
  assert.equal(await raw(a),frozenRaw,"Shared Web Lock must freeze native realtime RTS ticks");
  assert.equal((await read(a)).active.tick,frozen.active.tick);
  await a.screenshot({path:resolve(output,"02-rts-locked-clock-frozen.png"),fullPage:false});
  pass("Realtime RTS timer cannot write even one tick while sibling holds Web Lock",
    {frozenTick:frozen.active.tick,durationMs:2500});

  await b.evaluate(()=>window.v152Release());
  held=false;
  await a.waitForFunction(({key,tick})=>{
    const state=JSON.parse(localStorage.getItem(key)||"null");
    return state?.active?.mode==="rts"&&state.active.tick>tick || state?.reports?.length>0;
  },{key,tick:frozen.active.tick},{timeout:11000});
  const resumed=await read(a);
  assert.equal(resumed.serial,1,"Lock resume must not start a duplicate mission");
  assert.equal(resumed.rav,initialRav,"Repeated ticks must not charge RAV again");
  assert.equal(resumed.assignments[team],resumed.active?.id ?? undefined);
  pass("After lock release RTS advances from same run and keeps exact initial RAV debit",
    {serial:resumed.serial,fromTick:frozen.active.tick,toTick:resumed.active?.tick??null,reports:resumed.reports.length});
  await a.screenshot({path:resolve(output,"03-rts-realtime-resumed.png"),fullPage:false});

  // Disable real-time cleanly before reloading the second tab. This avoids
  // intentionally running two background timers during the reload inspection.
  if(resumed.active?.mode==="rts"){
    await op(a).getByRole("button",{name:"Passer en ordres alternés"}).click();
    await a.waitForFunction(k=>{
      const state=JSON.parse(localStorage.getItem(k)||"null");
      return state?.active?.mode==="rts"&&state.active.rts?.realtime===false;
    },key,{timeout:11000});
    pass("Switching to alternating orders persists with the same RTS mission",
      {mode:"rts",realtime:false});
    await b.bringToFront();
    await op(b).getByRole("alert").filter({hasText:/Front V115 modifié/}).waitFor({timeout:15000});
    assert.equal(await op(b).getByRole("button",{name:"Réinitialiser V115 uniquement"}).isDisabled(),true);
    const latestBytes=await raw(b);
    await b.reload({waitUntil:"domcontentloaded"});
    await op(b).waitFor();
    await b.waitForFunction(()=>{
      const area=document.querySelector('[data-testid="clan-operations-v115"]');
      return area?.textContent?.includes("Passer en ordres alternés")===false &&
        area?.textContent?.includes("Activer la bataille en temps réel");
    },null,{timeout:12000});
    assert.equal(await raw(b),latestBytes);
    assert.equal(await op(b).getByRole("button",{name:"Réinitialiser V115 uniquement"}).isEnabled(),true);
    pass("Stale RTS tab reloads authoritative alternating-mode archive without reset",
      {sameArchive:true});
    await b.screenshot({path:resolve(output,"04-rts-stale-reload.png"),fullPage:false});
  }
  assert.equal(await a.evaluate(k=>localStorage.getItem(k),hunterKey),"hunter-profile-unchanged");
  assert.deepEqual(pageErrors,[]);
  const report={schema:152,runKind:"actual V115 RTS in two cooperating Chromium tabs",
    artOneToOneApproved:0,otherDevicesTested:false,cloudTested:false,fullGameClientTested:false,
    checks,sourceSha:initial.sourceSha,mode:"rts",target,team,
    campaingSaveUnchanged:true,errors:pageErrors};
  await writeFile(resolve(output,"v152-real-rts-web-lock-evidence.json"),JSON.stringify(report,null,2)+"\n");
  console.log(JSON.stringify({checks:checks.length,errors:pageErrors.length,
    reportedMission:initial.active.id,artCertifiedOneToOne:0},null,2));
  await ctx.close();
}finally{
  if(held&&browser) {
    // Context cleanup also releases pending Web Locks.
  }
  await browser?.close();
  if(online){server.closeAllConnections();await new Promise(done=>server.close(done));}
}
