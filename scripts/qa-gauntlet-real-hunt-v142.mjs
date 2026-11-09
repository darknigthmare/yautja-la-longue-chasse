/** V142 real interactive HuntCanvas + native sidecar + two-tab resume.
 * This mounts the actual 12k-line production hunt engine with a seeded QA
 * campaign, but not GameClient's whole narrative/menu navigation. */
import assert from "node:assert/strict";
import {createServer} from "node:http";
import {readFile,mkdir,writeFile} from "node:fs/promises";
import {resolve,sep,extname} from "node:path";
import {fileURLToPath} from "node:url";
import {build} from "esbuild";
import {chromium} from "playwright-core";

const root=fileURLToPath(new URL("../",import.meta.url));
const publicRoot=resolve(root,"public");
const output=resolve(root,process.env.HUNT_GAUNTLET_V142_OUTPUT??"outputs/gauntlet-real-hunt-v142");
const app=await build({
  absWorkingDir:root,entryPoints:["tests/browser/gauntlet-real-hunt-v142.fixture.tsx"],
  bundle:true,platform:"browser",format:"iife",jsx:"automatic",
  outfile:"real-hunt-v142.js",logLevel:"warning",write:false,
});
const js=app.outputFiles.find(x=>x.path.endsWith(".js"))?.contents;
const css=app.outputFiles.find(x=>x.path.endsWith(".css"))?.contents;
assert.ok(js&&css,"Actual HuntCanvas fixture bundles JS and real CSS modules");
const html=`<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>V142 Native HuntCanvas + V1 Save</title><style>body{margin:0;color:#e8faf0;background:#0d1720;font-family:system-ui}*{box-sizing:border-box}button{padding:7px 12px;min-height:40px}</style><link rel="stylesheet" href="/real-hunt-v142.css"></head><body><div id="root"></div><script src="/real-hunt-v142.js"></script></body></html>`;
const served=new Map(),bad=[];
const server=createServer(async(req,res)=>{
  try{
    const url=new URL(req.url??"/","http://127.0.0.1");
    const p=decodeURIComponent(url.pathname);
    if(p==="/"){res.writeHead(200,{"content-type":"text/html; charset=utf-8"});res.end(html);return;}
    if(p==="/real-hunt-v142.js"){res.writeHead(200,{"content-type":"text/javascript; charset=utf-8"});res.end(js);return;}
    if(p==="/real-hunt-v142.css"){res.writeHead(200,{"content-type":"text/css; charset=utf-8"});res.end(css);return;}
    if(p==="/favicon.ico"){res.writeHead(204);res.end();return;}
    if(p.startsWith("/game/assets/")&&/\.(webp|svg|png|jpg|jpeg)$/.test(p)){
      const path=resolve(publicRoot,p.slice(1));
      if(!path.startsWith(publicRoot+sep)){res.writeHead(403);res.end();return;}
      try{
        const file=await readFile(path);
        const ext=extname(path),mime=ext===".svg"?"image/svg+xml":ext===".webp"?"image/webp":ext===".png"?"image/png":"image/jpeg";
        served.set(p,(served.get(p)||0)+1);
        res.writeHead(200,{"content-type":mime,"cache-control":"no-store"});
        res.end(file);
      }catch{
        // Sparse checkout excludes most unrelated gigabyte world art;
        // do NOT fake a successful film/biome asset or a gameplay claim.
        if(bad.length<250)bad.push(p);
        res.writeHead(404,{"content-type":"text/plain"});res.end("asset unavailable in sparse QA checkout");
      }
      return;
    }
    res.writeHead(404);res.end("Not found");
  }catch(e){res.writeHead(404);res.end(String(e));}
});
let browser,online=false;
const errors=[],checks=[];
function pass(name,detail){checks.push({name,status:"PASS",detail});}
async function installDrawAudit(page){
 await page.addInitScript(()=>{
   window.__drawnGauntletsV142=[];
   const original=CanvasRenderingContext2D.prototype.drawImage;
   CanvasRenderingContext2D.prototype.drawImage=function(...args){
     const element=args[0];
     const src=element?.currentSrc||element?.src;
     if(typeof src==="string"&&(/\/rig-gauntlets\//.test(src)||/\/equipment\/registered\/gauntlet-/.test(src))){
       if(window.__drawnGauntletsV142.length<12000)window.__drawnGauntletsV142.push(src);
     }
     return original.apply(this,args);
   };
 });
 page.on("pageerror",e=>errors.push(e.message));
}
const auditDraw=(id,part)=>async page=>{
 return page.waitForFunction(({id,part})=>(window.__drawnGauntletsV142||[]).some(p=>p.includes(`/rig-gauntlets/${id}/${part}.svg`)),
 {id,part},{timeout:20000});
};
try{
 await mkdir(output,{recursive:true});
 await new Promise((ok,fail)=>{server.once("error",fail);server.listen(0,"127.0.0.1",ok)});
 online=true;
 const address=server.address();assert.ok(address&&typeof address==="object");
 const origin=`http://127.0.0.1:${address.port}`;
 browser=await chromium.launch({channel:process.env.AUDIT_CHROME_CHANNEL||"chrome",headless:true});
 const ctx=await browser.newContext({viewport:{width:1366,height:900},locale:"fr-FR"});
 const first=await ctx.newPage();
 first.setDefaultTimeout(20000);
 await installDrawAudit(first);
 await first.goto(origin,{waitUntil:"domcontentloaded"});
 const lab=first.locator('[data-testid="real-hunt-v142-fixture"]');
 await lab.waitFor();
 assert.equal(await lab.getAttribute("data-stage"),"mission");
 assert.equal(await lab.getAttribute("data-canvas-variant"),"wolf");
 await first.getByRole("button",{name:"Commencer la chasse"}).click({timeout:45000});
 await auditDraw("wolf","base")(first);
 await auditDraw("wolf","lid")(first);
 await first.screenshot({path:resolve(output,"01-wolf-in-real-hunt.png"),fullPage:false});
 pass("Real production jungle HuntCanvas draws two Wolf sprites",{mission:"jungle-vey",model:"wolf",parts:["base","lid"]});

 await first.getByRole("button",{name:/Mettre en pause/}).click();
 await first.getByRole("button",{name:"Suspendre et sauvegarder"}).click();
 await first.waitForFunction(()=>document.querySelector('[data-testid="real-hunt-v142-fixture"]')?.getAttribute("data-stage")==="suspended");
 const sidecar=await first.evaluate(()=>JSON.parse(localStorage.getItem("yautja-long-hunt.active-hunt")));
 assert.equal(sidecar.version,1);
 assert.equal(sidecar.configuration.gauntletVariantId,"wolf");
 assert.equal(sidecar.ownerSaveCreatedAt,"2026-10-31T15:45:00.000Z");
 assert.ok(sidecar.snapshot && typeof sidecar.snapshot==="object" &&
   Object.keys(sidecar.snapshot).length>0,"Native hunt save must contain a genuine nonempty checkpoint");
 assert.ok(sidecar.snapshot!==sidecar.configuration,"Snapshot may not be substituted by cosmetic configuration");
 assert.ok(Number.isInteger(sidecar.sequence)&&sidecar.sequence>0);
 const beforeSequence=sidecar.sequence;
 pass("Real suspend button writes owner-scoped V1 sidecar with captured Wolf identity",{sequence:sidecar.sequence,version:sidecar.version});

 // Second tab intentionally changes the NEXT hunt's local cosmetic setting.
 const other=await ctx.newPage();
 await other.goto(origin,{waitUntil:"domcontentloaded"});
 await other.getByRole("button",{name:"Équiper Feral pour la prochaine chasse"}).click();
 assert.equal(await other.locator('[data-testid="real-hunt-v142-fixture"]').getAttribute("data-equipped"),"feral");
 await other.close();
 await first.reload({waitUntil:"domcontentloaded"});
 assert.equal(await lab.getAttribute("data-equipped"),"feral");
 assert.equal(await lab.getAttribute("data-stage"),"suspended");
 await first.getByRole("button",{name:"Reprendre la mission suspendue"}).click();
 await first.waitForFunction(()=>document.querySelector('[data-testid="real-hunt-v142-fixture"]')?.getAttribute("data-stage")==="mission");
 assert.equal(await lab.getAttribute("data-canvas-variant"),"wolf");
 await auditDraw("wolf","base")(first);
 await auditDraw("wolf","lid")(first);
 const resumed=await first.evaluate(()=>JSON.parse(localStorage.getItem("yautja-long-hunt.active-hunt")));
 assert.notEqual(resumed.runId,sidecar.runId);
 assert.equal(resumed.configuration.gauntletVariantId,"wolf");
 assert.ok(resumed.sequence>=beforeSequence);
 await first.screenshot({path:resolve(output,"02-wolf-restored-despite-feral-in-other-tab.png"),fullPage:false});
 pass("Real cross-tab Feral change does not override a resumed Wolf hunt",{
  before:sidecar.configuration.gauntletVariantId,currentNextPreference:"feral",after:resumed.configuration.gauntletVariantId,
  resumedRunRotated:resumed.runId!==sidecar.runId
 });
 await ctx.close();

 // Fresh isolated browser session deliberately blocks Wolf's base SVG,
 // so the real production loader must request its old V3 backup image.
 const isolated=await browser.newContext({viewport:{width:1024,height:760},locale:"fr-FR"});
 const fallbackPage=await isolated.newPage();
 await installDrawAudit(fallbackPage);
 let blocked=0;
 await fallbackPage.route("**/rig-gauntlets/wolf/base.svg",route=>{
   blocked++;return route.fulfill({status:404,contentType:"text/plain",body:"controlled missing V139 base"});
 });
 await fallbackPage.goto(origin,{waitUntil:"domcontentloaded"});
 await fallbackPage.getByRole("button",{name:"Commencer la chasse"}).click({timeout:45000});
 await fallbackPage.waitForFunction(()=>window.__drawnGauntletsV142?.some(s=>s.includes("/equipment/registered/gauntlet-base.webp")),{timeout:20000});
 await auditDraw("wolf","lid")(fallbackPage);
 assert.equal(blocked,1);
 await fallbackPage.screenshot({path:resolve(output,"03-missing-wolf-base-v3-fallback.png"),fullPage:false});
 pass("Controlled missing V139 SVG triggers real HuntCanvas V3 fallback",{
  requested:"wolf/base.svg",fallback:"gauntlet-base.webp",lidStillWolf:true,
 });
 await isolated.close();

 const v139hits=Object.entries(Object.fromEntries(served)).filter(([path])=>path.includes("/rig-gauntlets/"));
 const nonArt=bad.filter(x=>!x.includes("/rig-gauntlets/"));
 const report={
  version:142,scope:"Production HuntCanvas mounted in an isolated seeded jungle mission; actual V1 sidecar and two browser tabs; not the full GameClient campaign navigation",
  cases:checks,results:checks.length,gauntletAssetHits:v139hits,excludedMissingWorldAssets:nonArt.slice(0,20),
  mediaFailuresInSparseCheckout:nonArt.length,deliberatelyBlockedGauntletCount:1,
  browserErrors:errors,oneToOneFilmApproved:0,allMissionsTested:false,
 };
 await writeFile(resolve(output,"v142-real-hunt-browser-evidence.json"),JSON.stringify(report,null,2)+"\n");
 assert.equal(errors.length,0,JSON.stringify(errors));
 assert.equal(checks.length,4);
 console.log(JSON.stringify(report,null,2));
}finally{
 await browser?.close();
 if(online)await new Promise(ok=>server.close(ok));
}
