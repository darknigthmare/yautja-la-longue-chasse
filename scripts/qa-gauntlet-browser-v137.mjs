/** Browser QA V137: real Chromium interaction against the exact shared V136
 * gauntlet React component and SVG layers. No game saves, clan orders, or cloud.
 * This is NOT a film 1:1 verification or a full campaign walkthrough. */
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import { chromium } from "playwright-core";

const root=fileURLToPath(new URL("../",import.meta.url));
const outputDir=resolve(root,process.env.GAUNTLET_BROWSER_QA_OUTPUT??"outputs/gauntlet-v137-browser");
const catalogue=JSON.parse(await readFile(resolve(root,"app/game/data/clanWarGauntletCatalogV132.json"),"utf8")).catalog;
assert.equal(catalogue.length,54);
const compiled=await build({
  absWorkingDir:root,entryPoints:["tests/browser/gauntlet-v136.fixture.tsx"],
  bundle:true,write:false,jsx:"automatic",platform:"browser",format:"iife",outfile:"fixture.js",
  logLevel:"warning",loader:{".svg":"text"},
});
const bundle=compiled.outputFiles.find(f=>f.path.endsWith(".js"))?.contents;
const stylesheet=compiled.outputFiles.find(f=>f.path.endsWith(".css"))?.contents;
assert.ok(bundle && stylesheet,"React fixture must bundle JS and real CSS module styles");
const originSuffix="/game/assets/";
const publicRoot=resolve(root,"public");
const html=`<!doctype html><html lang="fr"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><title>Yautja gauntlet V137 browser QA</title><style>body{margin:0}*{box-sizing:border-box}</style><link rel="stylesheet" href="/fixture.css"></head><body><div id="root"></div><script src="/fixture.js"></script></body></html>`;
let spriteRequests=0;
const server=createServer(async (req,res)=>{
  try{
    const parsed=new URL(req.url??"/","http://127.0.0.1");
    const p=decodeURIComponent(parsed.pathname);
    if(p==="/"){res.writeHead(200,{"content-type":"text/html;charset=utf-8"});res.end(html);return;}
    if(p==="/fixture.js"){res.writeHead(200,{"content-type":"application/javascript;charset=utf-8"});res.end(bundle);return;}
    if(p==="/fixture.css"){res.writeHead(200,{"content-type":"text/css;charset=utf-8"});res.end(stylesheet);return;}
    if(p==="/favicon.ico"){res.writeHead(204);res.end();return;}
    if(p.startsWith(originSuffix)&&p.endsWith(".svg")){
      const target=resolve(publicRoot,p.slice(1));
      if(!target.startsWith(publicRoot+sep)){res.writeHead(403);res.end();return;}
      const file=await readFile(target);
      spriteRequests++;
      res.writeHead(200,{"content-type":"image/svg+xml;charset=utf-8","cache-control":"no-store"});
      res.end(file);return;
    }
    res.writeHead(404);res.end("not found");
  }catch(error){
    res.writeHead(404);res.end(String(error));
  }
});
let browser=null,served=false,failures=[];
const results=[];
const pass=(name,detail)=>results.push({name,status:"PASS",detail});
async function shot(page,name){
  await page.screenshot({path:resolve(outputDir,name+".png"),fullPage:false});
}
try{
  await mkdir(outputDir,{recursive:true});
  await new Promise((resolveListen,reject)=>{
    server.once("error",reject);server.listen(0,"127.0.0.1",resolveListen);
  });
  served=true;
  const address=server.address();assert.ok(address&&typeof address==="object");
  const url=`http://127.0.0.1:${address.port}/`;
  browser=await chromium.launch({channel:process.env.AUDIT_CHROME_CHANNEL||"chrome",headless:true});
  const page=await browser.newPage({viewport:{width:1366,height:900},deviceScaleFactor:1,locale:"fr-FR"});
  page.on("pageerror",e=>failures.push(e.message));
  page.on("console",m=>{if(m.type()==="error")failures.push(m.text());});
  page.on("response",response=>{
    if(response.url().includes("/game/assets/")&&response.status()!==200) failures.push("HTTP "+response.status()+" "+response.url());
  });
  await page.goto(url,{waitUntil:"networkidle"});
  await page.locator('[data-testid="gauntlet-visual-qa-v136"]').waitFor();
  assert.match(await page.locator("h1").innerText(),/54 gauntlets/);
  assert.equal(await page.locator('[data-art-model="jungle-hunter"]').count(),1);
  pass("Desktop gallery mounts real React and source SVG components","54 catalogue models");
  await shot(page,"01-desktop-jungle-open");
  const close=page.getByRole("button",{name:"Refermer les capots"});
  await close.click();
  assert.equal(await page.locator('[data-art-model="jungle-hunter"] svg[data-cover-open="false"]').count(),1);
  await shot(page,"02-desktop-jungle-closed");
  page.getByRole("button",{name:"Ouvrir les capots"}).focus();
  await page.keyboard.press("Enter");
  assert.equal(await page.locator('[data-art-model="jungle-hunter"] svg[data-cover-open="true"]').count(),1);
  pass("Keyboard Enter and pointer operate an actual animated lid","open/closed state and accessible button");
  await page.getByRole("button",{name:"Comparer deux gauntlets"}).click();
  const pick=page.getByLabel("Second modèle");
  await pick.selectOption("wolf");
  assert.equal(await page.locator('[data-art-model="wolf"]').count(),1);
  assert.equal(await page.locator(".comparison").count(),0); // CSS module hashes class names
  assert.equal(await page.locator('[data-art-model="jungle-hunter"]').count(),1);
  await shot(page,"03-desktop-jungle-vs-wolf");
  pass("Comparison mode renders two different real source gauntlets","Jungle Hunter / Wolf");
  await page.getByRole("button",{name:"Vue simple"}).click();
  const search=page.getByRole("searchbox",{name:"Recherche"});
  await search.fill("shaman");
  const shaman=page.locator('button[aria-pressed][class*="modelChoice"]');
  assert.equal(await shaman.count(),1);
  await shaman.click();
  assert.equal(await page.locator('[data-art-model="lost-shaman"]').count(),1);
  await shot(page,"04-desktop-lost-shaman-original-concept");
  assert.equal(await page.locator('[data-art-model="lost-shaman"] svg[data-fidelity="original-concept-not-film"]').count(),1);
  pass("Original non-canon individual study can be filtered and selected","Lost Shaman, source provenance retained");
  await search.fill("");
  const categories=page.getByRole("combobox",{name:"Provenance",exact:true});
  await categories.selectOption("comic");
  assert.equal(await page.locator('button[aria-pressed][class*="modelChoice"]').count(),1);
  await categories.selectOption("all");
  pass("Catalog filtering respects declared original sources","comic and all");
  const slider=page.getByRole("slider",{name:/Zoom/});
  await slider.focus();await page.keyboard.press("ArrowRight");
  assert.match(await page.getByLabel(/Zoom/).locator("..").innerText(),/105/);
  pass("Keyboard-adjustable zoom","105%");
  await page.setViewportSize({width:390,height:844});
  await page.getByRole("button",{name:"Comparer deux gauntlets"}).click();
  await page.getByLabel("Second modèle").selectOption("dek");
  await page.waitForTimeout(150);
  const dimensions=await page.evaluate(()=>({scrollWidth:document.documentElement.scrollWidth,viewport:innerWidth}));
  assert.ok(dimensions.scrollWidth<=dimensions.viewport+3,JSON.stringify(dimensions));
  await shot(page,"05-mobile-compare-jungle-orig");
  pass("Mobile responsive 390px layout without horizontal overflow",dimensions);
  await page.emulateMedia({reducedMotion:"reduce"});
  const lid=page.locator('svg[data-art-model], svg[data-testid="gauntlet-archive-study-v136"] image[data-cover-position]').first();
  if(await lid.count()){
    const duration=await lid.evaluate(el=>getComputedStyle(el).transitionDuration);
    assert.ok(duration==="0s"||duration==="none",duration);
    pass("Motion reduction respected","CSS lid transition suppressed");
  }
  const evidence={
    schema:137,
    scope:"Real browser interactions for a standalone source-art gallery, NOT full game or 1:1 film validation",
    chromeChannel:process.env.AUDIT_CHROME_CHANNEL||"chrome",
    checkedModels:54,svgSourcesExpected:219,
    httpSpriteRequests: spriteRequests, results,errors:failures,
    reviewedFilmFrames:0,certifiedOneToOne:0,saveWrites:0,
    screenshotFiles:["01-desktop-jungle-open.png","02-desktop-jungle-closed.png",
      "03-desktop-jungle-vs-wolf.png","04-desktop-lost-shaman-original-concept.png","05-mobile-compare-jungle-orig.png"],
  };
  await writeFile(resolve(outputDir,"browser-qa-manifest.json"),JSON.stringify(evidence,null,2)+"\n");
  assert.deepEqual(failures,[],"Unexpected browser errors");
  assert.ok(spriteRequests>=15,"Expected real SVG loads from the served public asset folders");
  console.log(JSON.stringify(evidence,null,2));
}finally{
  await browser?.close();
  if(served)await new Promise(done=>server.close(done));
}
