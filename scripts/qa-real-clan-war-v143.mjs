/** V143: the REAL ClanWarPanelV85 and createWarSessionV85 in Chrome.
 * We keep the production war simulation, one live V95 atlas and IDB/LS
 * persistence. Only Next's decorative <Image> wrapper is replaced in this
 * standalone fixture; no game rules are mocked.
 */
import assert from "node:assert/strict";
import {createServer} from "node:http";
import {readFile,mkdir,writeFile} from "node:fs/promises";
import {resolve,sep,extname} from "node:path";
import {fileURLToPath} from "node:url";
import {build} from "esbuild";
import {chromium} from "playwright-core";

const root=fileURLToPath(new URL("../",import.meta.url));
const publicRoot=resolve(root,"public");
const out=resolve(root,"outputs/clan-war-real-panel-v143");
const WAR_KEY="yautja.clan-war.v85.free.v1";
const PRESENTATION_KEY="yautja.clan-war.presentation.v1";
const SENTINEL="unrelated-campaign-stays-untouched-v143";
const bundle=await build({
  absWorkingDir:root,entryPoints:["tests/browser/clan-war-v143.fixture.tsx"],
  bundle:true,platform:"browser",format:"iife",jsx:"automatic",
  outfile:"clan-war-v143.js",write:false,logLevel:"warning",
  plugins:[{
    name:"qa-static-next-image-only",
    setup(compilation){
      compilation.onResolve({filter:new RegExp("^next/image$")},()=>({path:"qa-static-image",namespace:"qa-image"}));
      compilation.onLoad({filter:/.*/,namespace:"qa-image"},()=>({
        loader:"tsx",
        contents:`import React from "react";
export default function QAStaticImage({src,alt,width,height,loading,style}) {
  return <img src={typeof src==="string"?src:src?.src} alt={alt||""}
    width={width} height={height} loading={loading} style={style}/>;
}`,
      }));
    },
  }],
});
const js=bundle.outputFiles.find(f=>f.path.endsWith(".js"))?.contents;
const css=bundle.outputFiles.find(f=>f.path.endsWith(".css"))?.contents;
assert.ok(js&&css,"The real war panel must bundle its React and CSS modules");
const html=`<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>V143 real clan war panel QA</title><style>body{margin:0;background:#0d1d22;color:#effaf0;font:14px system-ui}*{box-sizing:border-box}button,select{min-height:38px}</style><link rel="stylesheet" href="/war-v143.css"></head><body><div id="root"></div><script src="/war-v143.js"></script></body></html>`;
let servedAssets=0;const unavailable=[];
const server=createServer(async(req,res)=>{
  try{
    const p=decodeURIComponent(new URL(req.url??"/","http://127.0.0.1").pathname);
    if(p==="/"){res.writeHead(200,{"content-type":"text/html;charset=utf-8"});res.end(html);return;}
    if(p==="/war-v143.js"){res.writeHead(200,{"content-type":"text/javascript;charset=utf-8"});res.end(js);return;}
    if(p==="/war-v143.css"){res.writeHead(200,{"content-type":"text/css;charset=utf-8"});res.end(css);return;}
    if(p==="/favicon.ico"){res.writeHead(204);res.end();return;}
    if((p.startsWith("/game/assets/")||p.startsWith("/sprites/")) && [".svg",".webp",".png",".jpg",".jpeg"].some(ext=>p.endsWith(ext))){
      const full=resolve(publicRoot,p.slice(1));
      if(!full.startsWith(publicRoot+sep)){res.writeHead(403);res.end();return;}
      try{
        const file=await readFile(full);
        const e=extname(full),mime=e===".svg"?"image/svg+xml":e===".webp"?"image/webp":e===".png"?"image/png":"image/jpeg";
        servedAssets++;res.writeHead(200,{"content-type":mime,"cache-control":"no-store"});res.end(file);
      }catch{
        if(unavailable.length<35)unavailable.push(p);
        res.writeHead(404);res.end("optional static asset unavailable in sparse QA");
      }
      return;
    }
    res.writeHead(404);res.end();
  }catch(e){res.writeHead(404);res.end(String(e));}
});
const checks=[],browserErrors=[];
let browser,started=false;
const pass=(name,detail)=>checks.push({name,status:"PASS",detail});
try{
  await mkdir(out,{recursive:true});
  await new Promise((ok,fail)=>{server.once("error",fail);server.listen(0,"127.0.0.1",ok)});
  started=true;
  const address=server.address();
  assert.ok(address&&typeof address==="object");
  browser=await chromium.launch({channel:process.env.AUDIT_CHROME_CHANNEL||"chrome",headless:true});
  const ctx=await browser.newContext({viewport:{width:1366,height:900},locale:"fr-FR"});
  const page=await ctx.newPage();
  page.setDefaultTimeout(25000);
  page.on("pageerror",e=>browserErrors.push(e.message));
  await page.addInitScript(({key,value})=>localStorage.setItem(key,value),{key:SENTINEL,value:"campaign-safe"});
  await page.goto(`http://127.0.0.1:${address.port}/`,{waitUntil:"domcontentloaded"});
  const panel=page.locator('[data-clan-war-v85="free-profile"]');
  await panel.waitFor({timeout:40000});
  const atlas=page.locator('[data-testid="clan-war-shared-atlas-v131"]');
  assert.equal(await atlas.count(),1);
  assert.equal(await panel.getAttribute("data-war-campaign-write"),"none");
  assert.equal(await panel.getAttribute("data-war-presentation"),"gauntlet");
  assert.equal(await panel.locator('[data-testid="clan-war-gauntlet-v131"]').count(),1);
  await page.evaluate(()=>{window.__v143SharedAtlasElement=document.querySelector('[data-testid="clan-war-shared-atlas-v131"]');});
  await page.screenshot({path:resolve(out,"01-real-korthas-hologram.png"),fullPage:false});
  pass("Production ClanWarPanelV85 and V95 atlas loaded",{presentation:"gauntlet",oneAtlas:true});

  await page.getByRole("button",{name:"Vue stratégique classique"}).click();
  assert.equal(await panel.getAttribute("data-war-presentation"),"classic");
  assert.equal(await page.evaluate(()=>window.__v143SharedAtlasElement===document.querySelector('[data-testid="clan-war-shared-atlas-v131"]')),true);
  await page.getByRole("button",{name:"Gauntlet holographique"}).click();
  assert.equal(await panel.getAttribute("data-war-presentation"),"gauntlet");
  assert.equal(await page.evaluate(()=>window.__v143SharedAtlasElement===document.querySelector('[data-testid="clan-war-shared-atlas-v131"]')),true);
  await page.screenshot({path:resolve(out,"02-real-atlas-not-remounted.png"),fullPage:false});
  pass("Hologram/classic switch does not remount the true V95 atlas",{stateKept:true});

  const review=page.locator('[data-testid="war-end-turn-review-v143"]');
  await review.waitFor({state:"visible"});
  await review.click();
  const commit=page.locator('[data-testid="war-end-turn-commit-v143"]');
  await commit.waitFor({state:"visible"});
  // DOM double click in the same JS task. Both handlers run, but the second
  // sees the new session revision or pendingWrites and must be denied.
  await commit.evaluate(button=>{button.click();button.click();});
  await page.waitForFunction(key=>{
    try{return JSON.parse(localStorage.getItem(key)||"null")?.turn===2;}catch{return false;}
  },WAR_KEY,{timeout:35000});
  const war=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)||"null"),WAR_KEY);
  assert.equal(war.turn,2);
  assert.equal(war.revision,1);
  assert.equal(await page.evaluate(k=>localStorage.getItem(k),SENTINEL),"campaign-safe");
  await page.screenshot({path:resolve(out,"03-real-turn-2-after-double-click.png"),fullPage:false});
  pass("Real tour resolution survives two rapid click events without a duplicate turn",
    {turn:war.turn,revision:war.revision,unrelatedCampaignUnchanged:true});

  await page.reload({waitUntil:"domcontentloaded"});
  await panel.waitFor({timeout:40000});
  await page.waitForFunction(()=>document.querySelector('[data-clan-war-v85="free-profile"]')?.textContent?.includes("tour 2"),null,{timeout:35000});
  assert.equal(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)||"null")?.turn,WAR_KEY),2);
  assert.equal(await atlas.count(),1);
  await page.screenshot({path:resolve(out,"04-real-reloaded-front-turn-2.png"),fullPage:false});
  pass("Actual strategy exercise archive hydrates after page reload",{turn:2});

  const planetPicker=page.locator('[data-testid="war-planet-selector-v96"] select').first();
  const alternate=await planetPicker.evaluate(el=>([...el.options].map(x=>x.value).find(x=>x&&x!=="korthas")||null));
  assert.ok(alternate,"A distinct second war planet must exist");
  await planetPicker.selectOption(alternate);
  await page.waitForFunction(id=>document.querySelector('[data-testid="war-planet-selector-v96"]')?.getAttribute("data-active-planet")===id,alternate);
  assert.match(await panel.locator('h3').allTextContents().then(x=>x.join(" ")),/tour 1/);
  await planetPicker.selectOption("korthas");
  await page.waitForFunction(()=>document.querySelector('[data-testid="war-planet-selector-v96"]')?.getAttribute("data-active-planet")==="korthas");
  assert.match(await panel.locator('h3').allTextContents().then(x=>x.join(" ")),/tour 2/);
  assert.equal(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)||"null")?.turn,WAR_KEY),2);
  await page.screenshot({path:resolve(out,"05-real-planet-switch-preserves-korthas.png"),fullPage:false});
  pass("Different planets retain independent strategy sessions",{otherPlanet:alternate,korthasTurn:2});

  await page.getByRole("button",{name:"Vue stratégique classique"}).click();
  await page.reload({waitUntil:"domcontentloaded"});
  await panel.waitFor({timeout:40000});
  await page.waitForFunction(()=>document.querySelector('[data-clan-war-v85="free-profile"]')?.getAttribute("data-war-presentation")==="classic");
  assert.equal(await page.evaluate(key=>localStorage.getItem(key),PRESENTATION_KEY),"classic");
  assert.equal(await page.evaluate(key=>localStorage.getItem(key),SENTINEL),"campaign-safe");
  pass("Classic presentation persisted without modifying unrelated campaign bytes",{choice:"classic",warTurn:2});

  const report={
    schema:143,
    scope:"Real ClanWarPanelV85 + WarSessionV85 + V95 atlas in a seeded local browser fixture; not full GameClient navigation or 1:1 visual certification",
    checks,checkCount:checks.length,
    actualWarTurn:2,duplicateAdvancePrevented:true,
    loadedStaticAssets:servedAssets,unavailableOptionalAssets:unavailable.slice(0,20),
    browserErrors,filmOneToOneApproved:0,fullCampaignTested:false,
  };
  await writeFile(resolve(out,"real-war-panel-evidence.json"),JSON.stringify(report,null,2)+"\n");
  assert.equal(checks.length,6);
  assert.deepEqual(browserErrors,[]);
  console.log(JSON.stringify(report,null,2));
  await ctx.close();
}finally{
  await browser?.close();
  if(started)await new Promise(ok=>server.close(ok));
}
