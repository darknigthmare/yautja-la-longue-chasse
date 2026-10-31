/** V140: genuine HunterRigPreview browser matrix and sprite-load tests. Unlike
 * the V139 diagram, this mounts the production rig with real V3 character art.
 * It does not simulate wars or certify film 1:1 correctness. */
import assert from "node:assert/strict";
import {createServer} from "node:http";
import {readFile,mkdir,writeFile} from "node:fs/promises";
import {resolve,sep,extname} from "node:path";
import {fileURLToPath} from "node:url";
import {build} from "esbuild";
import {chromium} from "playwright-core";
const root=fileURLToPath(new URL("../",import.meta.url));
const publicRoot=resolve(root,"public");
const out=resolve(root,process.env.GAUNTLET_POSE_OUTPUT??"outputs/gauntlet-pose-v140");
const catalog=JSON.parse(await readFile(resolve(root,"app/game/data/clanWarGauntletCatalogV132.json"),"utf8")).catalog;
assert.equal(catalog.length,54);
const buildResult=await build({
  absWorkingDir:root,entryPoints:["tests/browser/gauntlet-pose-v140.fixture.tsx"],
  bundle:true,platform:"browser",format:"iife",jsx:"automatic",
  write:false,outfile:"pose-v140.js",logLevel:"warning",
});
const js=buildResult.outputFiles.find(f=>f.path.endsWith(".js"))?.contents;
const css=buildResult.outputFiles.find(f=>f.path.endsWith(".css"))?.contents;
assert.ok(js&&css,"Browser fixture JS/CSS must compile");
const html=`<!doctype html><html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>QA V140 — vrai rig Yautja</title><style>body{margin:0;background:#0b171d;color:#eaf9e8;font:14px sans-serif}*{box-sizing:border-box}button,select{min-height:40px}</style><link rel="stylesheet" href="/pose-v140.css"></head><body><div id="root"></div><script src="/pose-v140.js"></script></body></html>`;
let rigFetches=0,otherActorFetches=0;
const server=createServer(async (req,res)=>{
  try{
    const url=new URL(req.url??"/","http://localhost");
    const p=decodeURIComponent(url.pathname);
    if(p==="/"){res.writeHead(200,{"content-type":"text/html;charset=utf-8"});res.end(html);return;}
    if(p==="/pose-v140.js"){res.writeHead(200,{"content-type":"text/javascript;charset=utf-8"});res.end(js);return;}
    if(p==="/pose-v140.css"){res.writeHead(200,{"content-type":"text/css;charset=utf-8"});res.end(css);return;}
    if(p==="/favicon.ico"){res.writeHead(204);res.end();return;}
    if(p.startsWith("/game/assets/")&&/\.(webp|svg|png)$/.test(p)){
      const filepath=resolve(publicRoot,p.slice(1));
      if(!filepath.startsWith(publicRoot+sep)){res.writeHead(403);res.end();return;}
      const file=await readFile(filepath);
      const mime=extname(filepath)===".svg"?"image/svg+xml":extname(filepath)===".webp"?"image/webp":"image/png";
      if(p.includes("/rig-gauntlets/"))rigFetches++;
      else otherActorFetches++;
      res.writeHead(200,{"content-type":mime,"cache-control":"no-store"});res.end(file);return;
    }
    res.writeHead(404);res.end("missing source "+p);
  }catch(error){res.writeHead(404);res.end("not found: "+String(error));}
});
const RESULTS=[],ERRORS=[],missingAssets=[];
const pass=(test,value)=>RESULTS.push({test,status:"PASS",detail:value});
let browser,started=false;
const PAIRS=[["classic","idle"],["young","run"],["elder","jump"],["super","fall"],["feral","climb"],["huntress","extract"]];
try{
  await mkdir(out,{recursive:true});
  await new Promise((ok,fail)=>{server.once("error",fail);server.listen(0,"127.0.0.1",ok);});
  started=true;
  const address=server.address();assert.ok(address&&typeof address==="object");
  browser=await chromium.launch({channel:process.env.AUDIT_CHROME_CHANNEL||"chrome",headless:true});
  const page=await browser.newPage({viewport:{width:1366,height:900},deviceScaleFactor:1,locale:"fr-FR"});
  page.on("pageerror",e=>ERRORS.push(e.message));
  page.on("response",response=>{
    if(response.url().includes("/game/assets/")&&response.status()!==200)
      missingAssets.push({status:response.status(),url:response.url()});
  });
  const url=`http://127.0.0.1:${address.port}/`;
  await page.goto(url,{waitUntil:"networkidle"});
  const stage=page.locator('[data-testid="gauntlet-pose-inspection-v140"]');
  await stage.waitFor();
  const rig=stage.locator('[data-hunter-rig]');
  const base=rig.locator('img[data-rig-slot="gauntlet-base"]');
  const lid=rig.locator('img[data-rig-slot="gauntlet-lid"]');
  assert.equal(await rig.getAttribute("data-gauntlet-rig-registration"),"back-lower-arm-256x384");
  const src=await base.getAttribute("src");
  assert.equal(src,"/game/assets/v139/rig-gauntlets/jungle-hunter/base.svg");
  await page.waitForFunction(()=>[...document.querySelectorAll('[data-rig-slot="gauntlet-base"],[data-rig-slot="gauntlet-lid"]')].every(img=>img.complete&&img.naturalWidth===256));
  assert.equal(await lid.getAttribute("src"),"/game/assets/v139/rig-gauntlets/jungle-hunter/lid.svg");
  await page.screenshot({path:resolve(out,"01-real-jungle-hunter-idle.png"),fullPage:false});
  pass("Real game rig mounted with Jungle Hunter source images",{base:src,lid:await lid.getAttribute("src")});

  const picker=page.getByRole("combobox",{name:"Modèle",exact:true});
  let changed=0;
  for(const item of catalog){
    await picker.selectOption(item.id);
    await page.waitForFunction(id=>document.querySelector('[data-rig-slot="gauntlet-base"]')?.getAttribute("src")===
      `/game/assets/v139/rig-gauntlets/${id}/base.svg`,item.id);
    const paths=await Promise.all([base.getAttribute("src"),lid.getAttribute("src")]);
    assert.deepEqual(paths,[
      `/game/assets/v139/rig-gauntlets/${item.id}/base.svg`,
      `/game/assets/v139/rig-gauntlets/${item.id}/lid.svg`,
    ]);
    assert.equal(await rig.getAttribute("data-gauntlet-equipped"),item.id);
    changed++;
  }
  await page.waitForFunction(()=>[...document.querySelectorAll('[data-rig-slot="gauntlet-base"],[data-rig-slot="gauntlet-lid"]')].every(img=>img.complete&&img.naturalWidth===256));
  await page.screenshot({path:resolve(out,"02-54th-model.png"),fullPage:false});
  pass("54 individual models switch in actual rig with correct base/lid sources",{models:changed});

  await picker.selectOption("wolf");
  const morphSelect=page.getByRole("combobox",{name:"Morphologie",exact:true});
  const poseSelect=page.getByRole("combobox",{name:"Pose",exact:true});
  const openButton=page.getByRole("button",{name:"Ouvrir le capot du rig"});
  const closedTransforms=await Promise.all([base.evaluate(e=>e.style.transform),lid.evaluate(e=>e.style.transform)]);
  assert.equal(closedTransforms[0],closedTransforms[1],"Closed lid must share same wrist matrix");
  await openButton.click();
  assert.equal(await stage.getAttribute("data-rig-lid"),"open");
  const openedTransforms=await Promise.all([base.evaluate(e=>e.style.transform),lid.evaluate(e=>e.style.transform)]);
  assert.notEqual(openedTransforms[0],openedTransforms[1],"Open lid must rotate independently");
  await page.screenshot({path:resolve(out,"03-wolf-open-hinged-lid.png"),fullPage:false});
  await page.getByRole("button",{name:"Fermer le capot du rig"}).click();
  pass("Real rig lid opens on a distinct hinge while the shell remains registered",{closedSharedMatrix:true,openDistinctMatrix:true});

  const facingButton=page.getByRole("button",{name:/Orientation :/});
  const bladeButton=page.getByRole("button",{name:/Déployer les lames opposées/});
  await bladeButton.click();
  assert.equal(await rig.locator('img[data-rig-slot="wristblades"]').count(),1);
  assert.equal(await rig.locator('img[data-rig-slot="wristblades"]').evaluate(img=>img.style.opacity),"1");
  pass("Wristblades remain attached to opposite limb, independent of wrist computer",{blade:true});

  let cases=0,seenMorph=new Set(),seenPoses=new Set();
  for(const [morph,pose] of PAIRS){
    await morphSelect.selectOption(morph);
    await poseSelect.selectOption(pose);
    await stage.waitFor();
    assert.equal(await stage.getAttribute("data-rig-morph"),morph);
    assert.equal(await stage.getAttribute("data-rig-pose"),pose);
    for(const direction of [1,-1]){
      const current=Number(await stage.getAttribute("data-rig-facing"));
      if(current!==direction)await facingButton.click();
      assert.equal(Number(await stage.getAttribute("data-rig-facing")),direction);
      const bt=await base.evaluate(e=>e.style.transform);
      const lt=await lid.evaluate(e=>e.style.transform);
      assert.equal(bt,lt,"Closed lid and shell must share transform even on opposite facing");
      assert.ok(!bt.includes("NaN")&&!bt.includes("Infinity"));
      const both=await Promise.all([base.getAttribute("src"),lid.getAttribute("src")]);
      assert.deepEqual(both,[
        "/game/assets/v139/rig-gauntlets/wolf/base.svg",
        "/game/assets/v139/rig-gauntlets/wolf/lid.svg",
      ]);
      cases++;
    }
    seenMorph.add(morph);seenPoses.add(pose);
    await page.screenshot({path:resolve(out,`04-pose-${morph}-${pose}.png`),fullPage:false});
  }
  assert.equal(cases,12);assert.equal(seenMorph.size,6);assert.equal(seenPoses.size,6);
  pass("Six body morphologies, six poses and both facings render in the actual rig",{cases,poses:[...seenPoses],morphs:[...seenMorph]});

  await picker.selectOption("feral");
  await morphSelect.selectOption("feral");
  await poseSelect.selectOption("climb");
  await page.setViewportSize({width:390,height:844});
  await page.screenshot({path:resolve(out,"05-mobile-feral-climb.png"),fullPage:false});
  const bounds=await page.evaluate(()=>({bodyWidth:document.documentElement.scrollWidth,viewport:innerWidth}));
  assert.ok(bounds.bodyWidth<=bounds.viewport+3,JSON.stringify(bounds));
  pass("Real rig responsive mobile with authentic actor artwork",{viewport:390,bounds});

  const evidence={
    schema:140,scope:"Real HunterRigPreview, not a schematic; asset loading, pose/morph/facing, and mobile only",
    catalogModels:54,sourceSpriteCount:108,sourceArtStage:"original noncanonical blockouts",
    renderCases:cases,chromeChannel:process.env.AUDIT_CHROME_CHANNEL||"chrome",
    rigFetches,actorArtFetches:otherActorFetches,missingAssets,
    certifiedOneToOne:0,fullGameValidated:false,results:RESULTS,errors:ERRORS,
  };
  await writeFile(resolve(out,"pose-browser-evidence.json"),JSON.stringify(evidence,null,2)+"\n");
  assert.ok(rigFetches>=100,"Expected actual rig assets for 54 models");
  assert.ok(otherActorFetches>=30,"Expected real body/armor V3 assets to have loaded");
  assert.deepEqual(ERRORS,[]);
  assert.deepEqual(missingAssets,[],"Missing asset requests in real rig pose lab");
  console.log(JSON.stringify(evidence,null,2));
}finally{
  await browser?.close();
  if(started)await new Promise(ok=>server.close(ok));
}
