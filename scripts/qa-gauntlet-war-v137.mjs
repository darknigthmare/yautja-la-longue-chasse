/** Browser smoke of the PRODUCTION ClanWarGauntletV131 wrapper with a child
 * state witness (not a fake WarSimulationV85). This proves presentation changes
 * do not remount the atlas slot; never claims the complete campaign was tested. */
import assert from "node:assert/strict";
import {createServer} from "node:http";
import {mkdir,readFile,writeFile} from "node:fs/promises";
import {resolve,sep} from "node:path";
import {fileURLToPath} from "node:url";
import {build} from "esbuild";
import {chromium} from "playwright-core";

const root=fileURLToPath(new URL("../",import.meta.url));
const out=resolve(root,"outputs/gauntlet-v137-war-browser");
const compiled=await build({absWorkingDir:root,entryPoints:["tests/browser/gauntlet-war-v137.fixture.tsx"],
  bundle:true,write:false,jsx:"automatic",platform:"browser",format:"iife",outfile:"war-fixture.js"});
const script=compiled.outputFiles.find(f=>f.path.endsWith(".js"))?.contents;
const css=compiled.outputFiles.find(f=>f.path.endsWith(".css"))?.contents;
assert.ok(script&&css);
const publicRoot=resolve(root,"public");
const html=`<!doctype html><html lang="fr"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>Shared atlas QA</title><style>body{margin:0;background:#10191f;color:#fff;font-family:sans-serif}main{padding:12px}button,input{min-height:40px}</style><link rel="stylesheet" href="/war.css"></head><body><div id="root"></div><script src="/war.js"></script></body></html>`;
const server=createServer(async (req,res)=>{
  const p=new URL(req.url??"/","http://127.0.0.1").pathname;
  if(p==="/"){res.writeHead(200,{"content-type":"text/html"});res.end(html);return;}
  if(p==="/war.js"){res.writeHead(200,{"content-type":"application/javascript"});res.end(script);return;}
  if(p==="/war.css"){res.writeHead(200,{"content-type":"text/css"});res.end(css);return;}
  if(p==="/favicon.ico"){res.writeHead(204);res.end();return;}
  if(p.startsWith("/game/assets/")&&p.endsWith(".svg")){
    const path=resolve(publicRoot,p.slice(1));
    if(!path.startsWith(publicRoot+sep)){res.writeHead(403);res.end();return;}
    try{const body=await readFile(path);res.writeHead(200,{"content-type":"image/svg+xml"});res.end(body);}
    catch{res.writeHead(404);res.end();}
    return;
  }
  res.writeHead(404);res.end();
});
let browser,opened=false;const results=[],errors=[];
try{
  await mkdir(out,{recursive:true});
  await new Promise((ok,fail)=>{server.once("error",fail);server.listen(0,"127.0.0.1",ok);});
  opened=true;const port=server.address().port;
  browser=await chromium.launch({channel:process.env.AUDIT_CHROME_CHANNEL||"chrome",headless:true});
  const page=await browser.newPage({viewport:{width:1366,height:900},deviceScaleFactor:1,locale:"fr-FR"});
  page.on("pageerror",e=>errors.push(e.message));
  page.on("console",e=>{if(e.type()==="error")errors.push(e.text());});
  await page.goto(`http://127.0.0.1:${port}/`,{waitUntil:"networkidle"});
  const stage=page.locator('[data-testid="clan-war-gauntlet-v131"]');
  await stage.waitFor();
  assert.equal(await stage.getAttribute("data-war-presentation"),"gauntlet");
  assert.equal(await stage.getAttribute("data-gauntlet-model"),"jungle-hunter");
  assert.equal(await page.locator('[data-testid="clan-war-shared-atlas-v131"]').count(),1);
  const camera=page.locator('[data-testid="atlas-camera-witness-v137"]');
  await camera.fill("CAMERA-ZOOM-88");
  await page.getByRole("button",{name:/Ajouter ordre témoin/}).click();
  assert.match(await page.getByRole("button",{name:/Ajouter ordre témoin/}).innerText(),/1/);
  await page.screenshot({path:resolve(out,"01-true-wrapper-hologram.png"),fullPage:false});
  results.push({test:"Real holographic wrapper retains one child atlas",status:"PASS"});
  await page.getByRole("button",{name:"Vue classique"}).click();
  assert.equal(await stage.getAttribute("data-war-presentation"),"classic");
  assert.equal(await stage.locator(":scope > div").first().isVisible(),false);
  assert.equal(await camera.inputValue(),"CAMERA-ZOOM-88");
  assert.match(await page.getByRole("button",{name:/Ajouter ordre témoin/}).innerText(),/1/);
  await page.screenshot({path:resolve(out,"02-true-wrapper-classic.png"),fullPage:false});
  results.push({test:"View switch hides only decoration, not mounted atlas or camera input",status:"PASS"});
  await page.getByRole("button",{name:"Wolf"}).click();
  assert.equal(await stage.getAttribute("data-gauntlet-model"),"wolf");
  const wolfColor=await stage.evaluate(e=>getComputedStyle(e).getPropertyValue("--holo-accent"));
  await page.getByRole("button",{name:"Vue holographique"}).click();
  assert.equal(await camera.inputValue(),"CAMERA-ZOOM-88");
  assert.match(await page.getByRole("button",{name:/Ajouter ordre témoin/}).innerText(),/1/);
  await page.getByRole("button",{name:/Ajouter ordre témoin/}).click();
  assert.match(await page.getByRole("button",{name:/Ajouter ordre témoin/}).innerText(),/2/);
  await page.screenshot({path:resolve(out,"03-wolf-hologram-same-atlas.png"),fullPage:false});
  results.push({test:"Actual gauntlet selection re-skins but does not reset child state",status:"PASS",wolfColor});
  await page.getByRole("button",{name:"Lost Shaman"}).click();
  assert.equal(await stage.getAttribute("data-gauntlet-model"),"lost-shaman");
  assert.equal(await stage.locator('[data-testid="gauntlet-archive-study-v136"]').count(),1);
  assert.equal(await camera.inputValue(),"CAMERA-ZOOM-88");
  await page.screenshot({path:resolve(out,"04-original-study-same-atlas.png"),fullPage:false});
  results.push({test:"Original non-canon study also preserves same interactive atlas",status:"PASS"});
  await page.setViewportSize({width:390,height:844});
  const metrics=await page.evaluate(()=>({actual:document.documentElement.scrollWidth,viewport:innerWidth}));
  assert.ok(metrics.actual<=metrics.viewport+3,JSON.stringify(metrics));
  await page.screenshot({path:resolve(out,"05-mobile-war-projection.png"),fullPage:false});
  results.push({test:"Mobile gauntlet/atlas wrapper fits a 390px viewport",status:"PASS",metrics});
  assert.deepEqual(errors,[]);
  const evidence={schema:137,scope:"Actual production gauntlet wrapper with state witness, not WarSimulationV85 or full campaign",
    checked:"two views, three gauntlets, camera input, child orders, mobile",
    result:"PASS",results,errors,filmOneToOneCertified:0};
  await writeFile(resolve(out,"war-wrapper-evidence.json"),JSON.stringify(evidence,null,2)+"\n");
  console.log(JSON.stringify(evidence,null,2));
}finally{
  await browser?.close();
  if(opened)await new Promise(done=>server.close(done));
}
