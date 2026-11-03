/** V146: 30 REAL planet switches, per-theatre turns and IndexedDB fences.
 * Browser mounts the actual ClanWarPanelV85, V95 atlas, persistence and native
 * selectors; only Next's decorative image wrapper is substituted.
 * This does not test cloud/PvP nor certify film art.
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
const out=resolve(root,"outputs/clan-war-30-planets-v146");
const bundle=await build({
  absWorkingDir:root,entryPoints:["tests/browser/clan-war-v143.fixture.tsx"],
  bundle:true,platform:"browser",format:"iife",jsx:"automatic",
  outfile:"real-30-worlds-v146.js",write:false,logLevel:"warning",
  plugins:[{
    name:"qa-static-next-image-only",
    setup(compilation){
      compilation.onResolve({filter:/^next\/image$/},()=>({path:"qa-static-image",namespace:"qa-image"}));
      compilation.onLoad({filter:/.*/,namespace:"qa-image"},()=>({
        loader:"tsx",resolveDir:root,contents:`import React from "react";
export default function QAStaticImage({src,alt,width,height,loading,style}){
  return <img src={typeof src==="string"?src:src?.src} alt={alt||""}
   width={width} height={height} loading={loading} style={style}/>;
}`,
      }));
    },
  }],
});
const js=bundle.outputFiles.find(f=>f.path.endsWith(".js"))?.contents;
const css=bundle.outputFiles.find(f=>f.path.endsWith(".css"))?.contents;
assert.ok(js&&css,"Production war UI must compile into JS and CSS");
const html=`<!doctype html><html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>V146 – 30 vrais mondes</title><style>body{margin:0;background:#0c1e23;color:#f3fbf7;font:14px system-ui}*{box-sizing:border-box}button,select{min-height:38px}</style><link rel="stylesheet" href="/worlds-v146.css"></head><body><div id="root"></div><script src="/worlds-v146.js"></script></body></html>`;
let optionalLoads=0;const unavailable=[];
const server=createServer(async(req,res)=>{
  try{
    const pathname=decodeURIComponent(new URL(req.url??"/","http://127.0.0.1").pathname);
    if(pathname==="/"){res.writeHead(200,{"content-type":"text/html;charset=utf-8"});res.end(html);return;}
    if(pathname==="/worlds-v146.js"){res.writeHead(200,{"content-type":"text/javascript;charset=utf-8"});res.end(js);return;}
    if(pathname==="/worlds-v146.css"){res.writeHead(200,{"content-type":"text/css;charset=utf-8"});res.end(css);return;}
    if(pathname==="/favicon.ico"){res.writeHead(204);res.end();return;}
    if((pathname.startsWith("/game/assets/")||pathname.startsWith("/sprites/"))&&
      [".svg",".webp",".png",".jpg",".jpeg"].some(ext=>pathname.endsWith(ext))){
      const path=resolve(publicRoot,pathname.slice(1));
      if(!path.startsWith(publicRoot+sep)){res.writeHead(403);res.end();return;}
      try{
        const data=await readFile(path);
        const ext=extname(path);
        const type=ext===".svg"?"image/svg+xml":ext===".webp"?"image/webp":ext===".png"?"image/png":"image/jpeg";
        optionalLoads++;res.writeHead(200,{"content-type":type});res.end(data);
      }catch{
        if(unavailable.length<20)unavailable.push(pathname);
        res.writeHead(404);res.end("optional image absent from sparse QA checkout");
      }
      return;
    }
    res.writeHead(404);res.end("missing path");
  }catch(e){res.writeHead(404);res.end(String(e));}
});
const warKey=id=>id==="korthas"?"yautja.clan-war.v85.free.v1":`yautja.clan-war.v96.planet.${id}.free.v1`;
const sentinel="unrelated-campaign-qa-v146";
const results=[],errors=[];
const pass=(name,detail)=>{results.push({name,status:"PASS",detail});console.log("[V146 PASS] "+name);};
let browser,started=false;
async function readFence(page,key){
  return page.evaluate(key=>new Promise((resolveFence,reject)=>{
    const request=indexedDB.open("yautja.clan-war.v94.fences",1);
    request.onerror=()=>reject(new Error("IDB open failed"));
    request.onsuccess=()=>{
      const db=request.result;
      const tx=db.transaction("intents","readonly");
      const query=tx.objectStore("intents").get(key);
      query.onerror=()=>{db.close();reject(new Error("IDB read failed"));};
      query.onsuccess=()=>{const value=query.result??null;db.close();resolveFence(value);};
    };
  }),key);
}
async function turnOf(page,key){
  return page.evaluate(key=>{try{return JSON.parse(localStorage.getItem(key)||"null")?.turn??null;}catch{return null;}},key);
}
async function commitTurn(page,key){
  const review=page.locator('[data-testid="war-end-turn-review-v143"]');
  await review.waitFor({state:"visible",timeout:25000});
  await review.click();
  const confirm=page.locator('[data-testid="war-end-turn-commit-v143"]');
  await confirm.waitFor({state:"visible",timeout:25000});
  await confirm.click();
  await page.waitForFunction(k=>{try{return JSON.parse(localStorage.getItem(k)||"null")?.turn===2;}catch{return false;}},key,{timeout:35000});
}
try{
  await mkdir(out,{recursive:true});
  await new Promise((ok,fail)=>{server.once("error",fail);server.listen(0,"127.0.0.1",ok);});
  started=true;
  const addr=server.address();
  assert.ok(addr&&typeof addr==="object");
  browser=await chromium.launch({channel:process.env.AUDIT_CHROME_CHANNEL||"chrome",headless:true});
  const context=await browser.newContext({viewport:{width:1280,height:850},locale:"fr-FR"});
  const page=await context.newPage();
  page.setDefaultTimeout(30000);
  page.on("pageerror",e=>errors.push(e.message));
  await page.goto(`http://127.0.0.1:${addr.port}/`,{waitUntil:"domcontentloaded"});
  const panel=page.locator('[data-clan-war-v85="free-profile"]');
  await panel.waitFor({timeout:40000});
  const selection=page.getByRole("combobox",{name:"Planète active"});
  await selection.waitFor();
  const ids=await selection.locator("optgroup").first().locator("option").evaluateAll(items=>items.map(item=>item.value));
  assert.equal(ids.length,30);
  assert.equal(new Set(ids).size,30);
  assert.equal(ids[0],"korthas");
  assert.equal(ids[1],"thalassa");
  await page.evaluate((key)=>localStorage.setItem(key,"campaign-safe"),sentinel);
  pass("Real campaign planet selector exposes exactly thirty distinct source theaters",ids);

  // First sweep advances a full turn and persists 30 REAL planet simulations.
  // The production component has an in-memory session limit of 24. Scanning
  // all thirty in one mounted panel exercises that cache-eviction boundary.
  const rows=[],samples=new Set([ids[0],ids[1],ids[3],ids[9],ids[22],ids[25],ids[29]]);
  for(let index=0;index<ids.length;index++){
    const id=ids[index],key=warKey(id);
    if(index>0)await selection.selectOption(id);
    const world=page.locator('[data-testid="war-planet-selector-v96"]');
    await page.waitForFunction(id=>document.querySelector('[data-testid="war-planet-selector-v96"]')?.getAttribute("data-active-planet")===id,id,{timeout:35000});
    await page.waitForFunction(()=>!!document.querySelector('[data-testid="war-end-turn-review-v143"]'));
    assert.equal(await world.getAttribute("data-active-planet"),id);
    assert.equal(await selection.inputValue(),id);
    assert.equal(await panel.locator('[data-testid="clan-war-shared-atlas-v131"]').count(),1);
    assert.equal(await panel.getAttribute("data-war-campaign-write"),"none");
    assert.equal(await turnOf(page,key),null,`Unexpected prior archive for ${id}`);
    await commitTurn(page,key);
    const raw=await page.evaluate(key=>localStorage.getItem(key),key);
    assert.ok(raw,"Real planetary LS archive must exist");
    const archive=JSON.parse(raw);
    assert.equal(archive.turn,2,id);
    assert.equal(archive.planetId??"korthas",id);
    const fence=await readFence(page,key);
    assert.ok(fence&&fence.phase==="confirmed",`Fence not confirmed for ${id}`);
    assert.equal(JSON.parse(fence.after).turn,2,id);
    assert.equal(JSON.parse(fence.after).planetId??"korthas",id);
    rows.push({id,key,turn:archive.turn,revision:archive.revision,
      fencePhase:fence.phase,fencePlanet:JSON.parse(fence.after).planetId??"korthas",
      storedBytes:raw.length});
    if(samples.has(id))await page.screenshot({path:resolve(out,`01-${String(index+1).padStart(2,"0")}-${id}-turn-2.png`),fullPage:false});
    if((index+1)%10===0)console.log(`V146 native 30-world sweep: ${index+1}/30 confirmed`);
  }
  assert.equal(rows.length,30);
  assert.equal(new Set(rows.map(r=>r.key)).size,30);
  pass("30/30 real worlds advanced and committed their OWN turn-2 LS and IndexedDB fence",{worlds:30,uniqueKeys:30});
  // All 30 have now exceeded the 24-slot live session cap. Revisit the
  // archived worlds in reverse order to ensure rehydration never resets them.
  for(const id of [...ids].reverse()){
    await selection.selectOption(id);
    await page.waitForFunction(id=>document.querySelector('[data-testid="war-planet-selector-v96"]')?.getAttribute("data-active-planet")===id,id,{timeout:35000});
    const world=page.locator('[data-testid="war-planet-selector-v96"]');
    await world.locator("text=Tour 02").first().waitFor({timeout:35000});
    assert.equal(await turnOf(page,warKey(id)),2);
    assert.equal(await panel.locator('[data-testid="clan-war-shared-atlas-v131"]').count(),1);
    assert.equal(await panel.locator('[data-testid="clan-war-foreign-tab-conflict-v144"]').count(),0);
  }
  pass("30/30 archived worlds re-open at turn 2 across the 24-session eviction boundary",{reverseRevisit:30});
  const finalSentinel=await page.evaluate(k=>localStorage.getItem(k),sentinel);
  assert.equal(finalSentinel,"campaign-safe");
  pass("Planetary war browsing never mutates another campaign save",finalSentinel);
  assert.deepEqual(errors,[],"React page errors in true war UI");
  const report={schema:146,
    scope:"One REAL ClanWarPanelV85 with WAR_PLANETS_V96 30-world selector and 30 per-world IndexedDB fences. All runs are local standalone QA, not full GameClient travel, not PvP/cloud.",
    inspected:rows.length,turnsPersisted:rows.filter(r=>r.turn===2).length,
    IDBConfirmed:rows.filter(r=>r.fencePhase==="confirmed").length,
    cacheEvictionRevisited:30,campaignWrites:0,oneToOneArtApproved:0,
    testType:"real browser production panel + source maps, not game-menu navigation",
    worlds:rows,checks:results,errors,missingOptionalArt:unavailable,optionalAssetsServed:optionalLoads,
  };
  await writeFile(resolve(out,"30-worlds-browser-proof.json"),JSON.stringify(report,null,2)+"\n");
  console.log(JSON.stringify({summary:{inspected:report.inspected,
    turnsPersisted:report.turnsPersisted,IDBConfirmed:report.IDBConfirmed,
    revisited:report.cacheEvictionRevisited,errors:report.errors.length},
    checks:report.checks},null,2));
  await context.close();
}finally{
  await browser?.close();
  if(started){server.closeAllConnections();await new Promise(done=>server.close(done));}
}
