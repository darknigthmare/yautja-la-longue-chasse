/** V145: the REAL ClanWarPanelV85 and createWarSessionV85 in Chrome.
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
const out=resolve(root,"outputs/clan-war-multitab-v144");
const WAR_KEY="yautja.clan-war.v85.free.v1";
const SENTINEL="unrelated-campaign-stays-untouched-v144";
const THALASSA_KEY="yautja.clan-war.v96.planet.thalassa.free.v1";
const bundle=await build({
  absWorkingDir:root,entryPoints:["tests/browser/clan-war-v143.fixture.tsx"],
  bundle:true,platform:"browser",format:"iife",jsx:"automatic",
  outfile:"clan-war-v143.js",write:false,logLevel:"warning",
  plugins:[{
    name:"qa-static-next-image-only",
    setup(compilation){
      compilation.onResolve({filter:new RegExp("^next/image$")},()=>({path:"qa-static-image",namespace:"qa-image"}));
      compilation.onLoad({filter:/.*/,namespace:"qa-image"},()=>({
        loader:"tsx",resolveDir:root,
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
const html=`<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>V144 real multi-tab war QA</title><style>body{margin:0;background:#0d1d22;color:#effaf0;font:14px system-ui}*{box-sizing:border-box}button,select{min-height:38px}</style><link rel="stylesheet" href="/war-v143.css"></head><body><div id="root"></div><script src="/war-v143.js"></script></body></html>`;
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
const pass=(name,detail)=>{checks.push({name,status:"PASS",detail});console.log("[V144 PASS] "+name);};
const getTurn=async(page,key=WAR_KEY)=>page.evaluate(key=>{
  try{return JSON.parse(localStorage.getItem(key)||"null")?.turn??null;}catch{return null;}
},key);
async function getFence(page,key=WAR_KEY){
  let timeout;
  try{return await Promise.race([page.evaluate(key=>new Promise((resolveFence,reject)=>{
    const request=indexedDB.open("yautja.clan-war.v94.fences",1);
    request.onerror=()=>reject(new Error("IDB open failed"));
    request.onsuccess=()=>{
      const db=request.result;
      const tx=db.transaction("intents","readonly");
      const read=tx.objectStore("intents").get(key);
      read.onerror=()=>{db.close();reject(new Error("IDB record read failed"));};
      read.onsuccess=()=>{db.close();resolveFence(read.result??null);};
    };
  }),key),new Promise((_,reject)=>{timeout=setTimeout(()=>reject(new Error("IndexedDB fence read timed out in browser QA")),15000);})]);}
  finally{clearTimeout(timeout);}
}
async function commitTurn(page){
  const review=page.locator('[data-testid="war-end-turn-review-v143"]');
  await review.waitFor({state:"visible"});
  await review.click();
  const commit=page.locator('[data-testid="war-end-turn-commit-v143"]');
  await commit.waitFor({state:"visible"});
  await commit.click();
}
try{
  await mkdir(out,{recursive:true});
  await new Promise((ok,fail)=>{server.once("error",fail);server.listen(0,"127.0.0.1",ok)});
  started=true;
  const address=server.address();
  assert.ok(address&&typeof address==="object");
  browser=await chromium.launch({channel:process.env.AUDIT_CHROME_CHANNEL||"chrome",headless:true});
  const context=await browser.newContext({viewport:{width:1320,height:870},locale:"fr-FR"});
  const url=`http://127.0.0.1:${address.port}/`;
  const a=await context.newPage();
  a.setDefaultTimeout(30000);
  a.on("pageerror",e=>browserErrors.push("A: "+e.message));
  await a.goto(url,{waitUntil:"domcontentloaded"});
  const panelA=a.locator('[data-clan-war-v85="free-profile"]');
  await panelA.waitFor({timeout:40000});
  await a.waitForFunction(()=>!!document.querySelector('[data-testid="war-end-turn-review-v143"]'));
  await a.evaluate(({key,value})=>localStorage.setItem(key,value),{key:SENTINEL,value:"campaign-safe"});
  const b=await context.newPage();
  b.setDefaultTimeout(30000);
  b.on("pageerror",e=>browserErrors.push("B: "+e.message));
  await b.goto(url,{waitUntil:"domcontentloaded"});
  const panelB=b.locator('[data-clan-war-v85="free-profile"]');
  await panelB.waitFor({timeout:40000});
  // A third real panel owns its own Thalassa simulation and IDB fence.
  const c=await context.newPage();
  c.setDefaultTimeout(30000);
  c.on("pageerror",e=>browserErrors.push("C: "+e.message));
  await c.goto(url+"?planet=thalassa",{waitUntil:"domcontentloaded"});
  const panelC=c.locator('[data-clan-war-v85="free-profile"]');
  await panelC.waitFor({timeout:40000});
  await c.locator("h3").filter({hasText:"Thalassa · tour 1"}).first().waitFor({timeout:40000});
  assert.equal(await panelC.getAttribute("data-war-campaign-write"),"none");
  assert.equal(await panelC.locator('[data-testid="clan-war-shared-atlas-v131"]').count(),1);
  pass("Two Korthas tabs and a third Thalassa tab mount independent live theatre graphs",{K:2,T:1});
  assert.equal(await panelA.getAttribute("data-war-campaign-write"),"none");
  assert.equal(await panelB.getAttribute("data-war-campaign-write"),"none");
  assert.equal(await panelA.locator('[data-testid="clan-war-shared-atlas-v131"]').count(),1);
  assert.equal(await panelB.locator('[data-testid="clan-war-shared-atlas-v131"]').count(),1);
  pass("Two genuine production war panel instances hydrate the same Korthas front",{tabA:1,tabB:1});
  await a.bringToFront();
  await commitTurn(a);
  await a.waitForFunction(key=>{
    try{return JSON.parse(localStorage.getItem(key)||"null")?.turn===2;}catch{return false;}
  },WAR_KEY,{timeout:35000});
  assert.equal(await getTurn(a),2);
  await b.bringToFront();
  const stale=b.locator('[data-testid="clan-war-foreign-tab-conflict-v144"]');
  await stale.waitFor({state:"visible",timeout:25000});
  assert.match(await stale.innerText(),/autre onglet/);
  assert.equal(await b.locator('[data-testid="war-end-turn-review-v143"]').isDisabled(),true);
  assert.equal(await getTurn(b),2);
  await c.bringToFront();
  assert.equal(await c.locator('[data-testid="clan-war-foreign-tab-conflict-v144"]').count(),0);
  assert.equal(await c.locator('[data-testid="war-end-turn-review-v143"]').isDisabled(),false);
  assert.equal(await getTurn(c,THALASSA_KEY),null);
  await commitTurn(c);
  await c.waitForFunction(key=>{
    try{return JSON.parse(localStorage.getItem(key)||"null")?.turn===2;}catch{return false;}
  },THALASSA_KEY,{timeout:35000});
  assert.equal(await getTurn(c,THALASSA_KEY),2);
  assert.equal(await getTurn(c,WAR_KEY),2);
  await c.screenshot({path:resolve(out,"01b-thalassa-turn-2-korthas-remains-2.png"),fullPage:false});
  pass("Thalassa advances its own front without unlocking or mutating stale Korthas B",{K:2,T:2});
  await b.bringToFront();
  await b.screenshot({path:resolve(out,"01-tab-b-stale-front-locked.png"),fullPage:false});
  pass("Passive storage event or focus check locks the stale second tab before any write",{newTurn:2,alert:true});
  let unexpectedDialogs=0;
  b.on("dialog",async dialog=>{unexpectedDialogs++;await dialog.dismiss();});
  await b.getByRole("button",{name:"Nouvel exercice"}).click();
  assert.equal(unexpectedDialogs,0,"Stale tab must reject destructive reset before confirmation");
  const impossible=await b.evaluate(()=>{
    const button=document.querySelector('[data-testid="war-end-turn-review-v143"]');
    button?.click(); return button?.disabled??false;
  });
  assert.equal(impossible,true,"Stale review must remain blocked");
  assert.equal(await getTurn(a),2);
  assert.equal(await b.evaluate(k=>localStorage.getItem(k),SENTINEL),"campaign-safe");
  pass("Stale tab rejects turn review and destructive reset without modifying its parent's save",{noResetDialog:true,turn:2});
  const firstFence=await getFence(b);
  assert.ok(firstFence&&firstFence.phase==="confirmed");
  assert.equal(JSON.parse(firstFence.after).turn,2);
  await b.reload({waitUntil:"domcontentloaded"});
  await panelB.waitFor({timeout:40000});
  await b.waitForFunction(()=>document.querySelector('[data-clan-war-v85="free-profile"]')?.textContent?.includes("tour 2"),null,{timeout:35000});
  assert.equal(await stale.count(),0);
  assert.equal(await b.locator('[data-testid="war-end-turn-review-v143"]').isDisabled(),false);
  await commitTurn(b);
  await b.waitForFunction(key=>{
    try{return JSON.parse(localStorage.getItem(key)||"null")?.turn===3;}catch{return false;}
  },WAR_KEY,{timeout:35000});
  assert.equal(await getTurn(b),3);
  await b.screenshot({path:resolve(out,"02-tab-b-reopened-safe-turn-3.png"),fullPage:false});
  pass("Reopening stale tab recovers the new confirmed archive and can safely make the next turn",{turn:3});
  await a.bringToFront();
  const staleA=a.locator('[data-testid="clan-war-foreign-tab-conflict-v144"]');
  await staleA.waitFor({state:"visible",timeout:25000});
  assert.equal(await a.locator('[data-testid="war-end-turn-review-v143"]').isDisabled(),true);
  assert.equal(await getTurn(a),3);
  const secondFence=await getFence(a);
  assert.ok(secondFence&&secondFence.phase==="confirmed");
  assert.equal(JSON.parse(secondFence.after).turn,3);
  assert.equal(await a.evaluate(k=>localStorage.getItem(k),SENTINEL),"campaign-safe");
  await c.bringToFront();
  assert.equal(await c.locator('[data-testid="clan-war-foreign-tab-conflict-v144"]').count(),0);
  assert.equal(await c.locator('[data-testid="war-end-turn-review-v143"]').isDisabled(),false);
  assert.equal(await getTurn(c,THALASSA_KEY),2);
  assert.equal(await getTurn(c,WAR_KEY),3);
  const thalassaFence=await getFence(c,THALASSA_KEY);
  assert.ok(thalassaFence&&thalassaFence.phase==="confirmed");
  assert.equal(JSON.parse(thalassaFence.after).planetId,"thalassa");
  assert.equal(JSON.parse(thalassaFence.after).turn,2);
  assert.notEqual(thalassaFence.token,secondFence.token);
  await c.screenshot({path:resolve(out,"03b-thalassa-isolated-after-korthas-turn-3.png"),fullPage:false});
  await a.bringToFront();
  await a.screenshot({path:resolve(out,"03-tab-a-now-stale-after-tab-b.png"),fullPage:false});
  pass("Original tab becomes read-only after other tab's safe turn; IDB fence matches final mirror",{turn:3,fence:"confirmed"});
  await a.reload({waitUntil:"domcontentloaded"});
  await panelA.waitFor({timeout:40000});
  await a.waitForFunction(()=>document.querySelector('[data-clan-war-v85="free-profile"]')?.textContent?.includes("tour 3"),null,{timeout:35000});
  assert.equal(await staleA.count(),0);
  assert.equal(await a.evaluate(k=>localStorage.getItem(k),SENTINEL),"campaign-safe");
  await a.screenshot({path:resolve(out,"04-reopen-original-tab-turn-3.png"),fullPage:false});
  pass("Returning to the original tab reloads real turn 3 with one atlas, no stale banner",{turn:3});
  assert.deepEqual(browserErrors,[]);
  assert.equal(checks.length,8);
  const report={
    schema:145,
    scope:"Three REAL ClanWarPanelV85 mounts (two Korthas, one Thalassa) in one Chrome context sharing localStorage+IndexedDB. No cloud or GameClient menu navigation, no 1:1 art approval.",
    independentThalassaTurn:2,threeTabMultiPlanetCoverage:true,
    checks,actualTurn:3,foreignTabOverwritePrevented:true,idbFenceFinalPhase:"confirmed",
    unrelatedCampaignValue:"campaign-safe",oneToOneApproved:0,fullCampaignTested:false,
    browserErrors,loadedOptionalStaticAssets:servedAssets,
    missingOptionalStaticAssets:unavailable.slice(0,20),
  };
  await writeFile(resolve(out,"two-tab-war-evidence.json"),JSON.stringify(report,null,2)+"\n");
  console.log(JSON.stringify(report,null,2));
  await context.close();
}finally{
  await browser?.close();
  if(started){server.closeAllConnections();await new Promise(resolveClose=>server.close(resolveClose));}
}
