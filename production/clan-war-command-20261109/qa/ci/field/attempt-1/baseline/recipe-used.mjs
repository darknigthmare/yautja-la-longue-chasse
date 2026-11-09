/** Browser interaction regression for the committed original prototype props.
 * Exercises production components, native V6 scenarios and actual layout.
 * --bundle-only proves compilation only, never browser interaction or art approval. */
import assert from "node:assert/strict";
import {createServer} from "node:http";
import {mkdir,readFile,writeFile} from "node:fs/promises";
import {resolve} from "node:path";
import {fileURLToPath} from "node:url";
import {build} from "esbuild";
import {chromium} from "playwright-core";

const root=fileURLToPath(new URL("../",import.meta.url));
const out=resolve(root,process.env.CLAN_FIELD_QA_OUTPUT||"outputs/clan-field-20261103");
const key="yautja.clan-war.v115.operations.fenced.v2";
const bundle=await build({absWorkingDir:root,
  entryPoints:["tests/browser/clan-field-20261103.fixture.tsx"],bundle:true,
  platform:"browser",format:"iife",jsx:"automatic",write:false,
  outfile:"field-20261103.js",logLevel:"warning"});
const js=bundle.outputFiles.find(file=>file.path.endsWith(".js"))?.contents;
const css=bundle.outputFiles.find(file=>file.path.endsWith(".css"))?.contents;
assert.ok(js&&css,"Both production panels and their CSS must bundle");
await mkdir(out,{recursive:true});
if(process.argv.includes("--bundle-only")){
  await writeFile(resolve(out,"bundle-check.json"),JSON.stringify({
    status:"BUNDLE_ONLY",browserExecuted:false,artisticApproval:false,
    javascriptBytes:js.length,cssBytes:css.length,
  },null,2)+"\n");
  console.log("Field QA bundle compiled; browser interactions were NOT executed.");
}else{
  await runBrowser();
}

async function runBrowser(){
  const checks=[],errors=[];
  let browser,online=false;
  const html=`<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Field controls QA</title><style>body{margin:0;background:#0d1f24;color:#eef6e9;font-family:system-ui}*{box-sizing:border-box}</style><link rel="stylesheet" href="/field.css"></head><body><div id="root"></div><script src="/field.js"></script></body></html>`;
  const server=createServer(async(req,res)=>{
    const path=new URL(req.url??"/","http://127.0.0.1").pathname;
    if(path==="/"){res.writeHead(200,{"content-type":"text/html;charset=utf-8"});res.end(html);return;}
    if(path==="/field.js"){res.writeHead(200,{"content-type":"text/javascript;charset=utf-8"});res.end(js);return;}
    if(path==="/field.css"){res.writeHead(200,{"content-type":"text/css;charset=utf-8"});res.end(css);return;}
    if(path==="/favicon.ico"){res.writeHead(204);res.end();return;}
    if(/^\/game\/assets\/clan-field-20261103\/[a-z-]+\.svg$/.test(path)){
      try{const bytes=await readFile(resolve(root,"public"+path));res.writeHead(200,{"content-type":"image/svg+xml"});res.end(bytes);return;}
      catch{/* Missing committed art must remain an HTTP failure. */}
    }
    res.writeHead(404);res.end("No generated or mocked assets");
  });
  const pass=(name,detail)=>{checks.push({name,status:"PASS",detail});console.log("[FIELD PASS] "+name);};
  try{
    await new Promise((ok,fail)=>{server.once("error",fail);server.listen(0,"127.0.0.1",ok);});
    online=true;
    const address=server.address();assert.ok(address&&typeof address==="object");
    browser=await chromium.launch(process.env.AUDIT_CHROME_EXECUTABLE?
      {executablePath:process.env.AUDIT_CHROME_EXECUTABLE,headless:true}:
      {channel:process.env.AUDIT_CHROME_CHANNEL||"chrome",headless:true});
    const context=await browser.newContext({locale:"fr-FR",viewport:{width:1280,height:850}});
    const page=await context.newPage();page.setDefaultTimeout(30000);
    page.on("pageerror",error=>errors.push(error.message));
    await page.goto(`http://127.0.0.1:${address.port}/`,{waitUntil:"domcontentloaded"});
    const lab=page.getByTestId("field-20261103-lab");
    const ops=page.getByTestId("clan-operations-v115");
    const rts=page.getByTestId("war-rts-squads-v133");
    await ops.waitFor();await rts.waitFor();

    // Launch a real persisted infiltration via its normal preparation controls.
    await ops.getByRole("button",{name:/^Infiltration et sabotage/}).click();
    await ops.getByRole("combobox",{name:"Territoire de la Bible V6"}).selectOption(await lab.getAttribute("data-legal-target"));
    const teams=ops.locator('input[type="checkbox"]');
    for(let index=await teams.count()-1;index>=1;index--)if(await teams.nth(index).isChecked())await teams.nth(index).uncheck();
    if(!await teams.first().isChecked())await teams.first().check();
    await ops.getByRole("button",{name:/^Lancer :/}).click();
    await page.waitForFunction(key=>JSON.parse(localStorage.getItem(key)||"null")?.active?.mode==="stealth",key);
    const archive=()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)||"null"),key);
    const rule=ops.getByRole("combobox",{name:"Règle de renfort :"});
    if(await rule.count()&&await rule.inputValue()===""){
      await rule.selectOption("manual");
      await page.waitForFunction(key=>JSON.parse(localStorage.getItem(key)||"null")?.active?.stealth?.reinforcementMode==="manual",key);
    }
    const initial=(await archive()).active;
    assert.ok(Math.abs(initial.stealth.x-initial.stealth.guardX)+Math.abs(initial.stealth.y-(initial.stealth.guardY??2))>4,
      "The native start must exercise a guard outside visual range");
    assert.equal(await ops.locator('[data-actor="rival"]').count(),0);
    assert.equal(await ops.locator('[data-field-prop="relay-active"]').count(),1);
    pass("Stealth props leave the out-of-range guard hidden",{tick:initial.tick});

    await ops.focus();await page.keyboard.press("Space");
    await page.waitForFunction(({key,tick})=>JSON.parse(localStorage.getItem(key)||"null")?.active?.tick===tick,keyAndTick(initial.tick+1));
    await page.keyboard.down("Space");
    await page.waitForFunction(({key,tick})=>JSON.parse(localStorage.getItem(key)||"null")?.active?.tick===tick,keyAndTick(initial.tick+2));
    await page.keyboard.down("Space");await page.keyboard.up("Space");
    await page.waitForTimeout(120);
    assert.equal((await archive()).active.tick,initial.tick+2);
    pass("Stealth normal press and held key each issue one locked order; repeat is ignored",{orders:2});

    await rule.focus();await page.keyboard.press("e");
    await ops.getByRole("button",{name:"Camouflage optique",exact:true}).focus();await page.keyboard.press("e");
    await ops.focus();await ops.dispatchEvent("keydown",{key:" ",ctrlKey:true});
    await ops.dispatchEvent("keydown",{key:" ",isComposing:true});
    await page.waitForTimeout(120);
    assert.equal((await archive()).active.tick,initial.tick+2);
    pass("Stealth selects, buttons, shortcuts and IME do not dispatch a tactical order");

    const turns=()=>rts.getByText("Ordres/tours",{exact:true}).locator("..").locator("strong").innerText().then(Number);
    await rts.focus();await page.keyboard.press("Space");
    assert.equal(await turns(),0);
    await rts.getByRole("button",{name:/^Déployer \d+ détachements$/}).click();
    await rts.getByRole("spinbutton",{name:"Case X",exact:true}).waitFor();
    const map=rts.getByRole("img",{name:"Topologie tactique, détachements alliés, adversaires en ligne de vue et repères W3",exact:true});
    const visible=Number(await lab.getAttribute("data-visible-rivals"));
    assert.ok(Number(await lab.getAttribute("data-total-rivals"))>visible,"Native start must include hidden opponents");
    assert.equal(await map.locator("path").count(),visible);
    assert.equal(await map.locator('g > g > rect[stroke-width="2"]').count(),0);
    pass("RTS planning ignores keys; unobserved objective and rival positions remain hidden",{visibleRivals:visible});

    // Failed movement through the same native obstruction must remain a failure at every zoom.
    const blockedKey=await lab.getAttribute("data-blocked-key");
    const topology=()=>map.locator("rect[data-kind]").evaluateAll(tiles=>tiles.map(tile=>{
      const cell=Number(tile.getAttribute("width"));
      return [tile.getAttribute("data-kind"),Number(tile.getAttribute("x"))/cell,Number(tile.getAttribute("y"))/cell];
    }));
    const baseline=await map.boundingBox();assert.ok(baseline);
    const originalTopology=await topology();
    const positions=()=>rts.getByText(/^Ordres de .* — position \(/).innerText();
    const originalPosition=await positions();
    await rts.focus();await page.keyboard.press(blockedKey);
    assert.equal(await turns(),0);assert.equal(await positions(),originalPosition);
    await rts.getByRole("button",{name:"Réduire la carte",exact:true}).click();
    assert.equal(await rts.getByRole("button",{name:"Réduire la carte",exact:true}).isDisabled(),true);
    let dimensions=await map.boundingBox();assert.ok(dimensions);
    assert.ok(Math.abs(dimensions.width/baseline.width-.75)<.001);
    assert.ok(Math.abs(dimensions.height/baseline.height-.75)<.001);
    for(let step=0;step<9;step++)await rts.getByRole("button",{name:"Agrandir la carte",exact:true}).click();
    assert.equal(await rts.getByRole("button",{name:"Agrandir la carte",exact:true}).isDisabled(),true);
    dimensions=await map.boundingBox();assert.ok(dimensions);
    assert.ok(Math.abs(dimensions.width/baseline.width-3)<.001);
    assert.ok(Math.abs(dimensions.height/baseline.height-3)<.001);
    assert.deepEqual(await topology(),originalTopology);
    await rts.focus();await page.keyboard.press(blockedKey);
    assert.equal(await turns(),0);assert.equal(await positions(),originalPosition);
    assert.equal(await map.locator("path").count(),visible);
    await rts.getByRole("button",{name:"100 %",exact:true}).click();
    assert.equal((await map.boundingBox()).width,baseline.width);
    pass("RTS actual SVG dimensions follow 75–300% zoom without changing topology, collision or visibility",{baselineWidth:baseline.width,blockedKey});

    await rts.focus();await page.keyboard.press("Space");
    assert.equal(await turns(),1);
    await page.keyboard.down("Space");assert.equal(await turns(),2);
    await page.keyboard.down("Space");await page.keyboard.up("Space");
    assert.equal(await turns(),2);
    await rts.getByRole("spinbutton",{name:"Case X",exact:true}).focus();await page.keyboard.press("Space");
    await rts.getByRole("button",{name:"100 %",exact:true}).focus();await page.keyboard.press("e");
    await rts.focus();await rts.dispatchEvent("keydown",{key:" ",metaKey:true});
    await rts.dispatchEvent("keydown",{key:" ",isComposing:true});
    assert.equal(await turns(),2);
    assert.equal((await archive()).active.tick,initial.tick+2,"RTS inputs must not leak into the other panel");
    pass("RTS keyboard dispatches one order; repeats, focused controls, shortcuts and IME remain isolated",{orders:2});
    await rts.screenshot({path:resolve(out,"rts-controls-100-percent.png")});
    await ops.screenshot({path:resolve(out,"stealth-controls.png")});
    assert.deepEqual(errors,[]);
    await writeFile(resolve(out,"report.json"),JSON.stringify({status:"PASS",browserExecuted:true,
      artisticApproval:false,viewport:{width:1280,height:850},checks,errors},null,2)+"\n");
  }catch(error){
    await writeFile(resolve(out,"report.json"),JSON.stringify({status:"FAIL",checks,errors,
      error:error instanceof Error?error.message:String(error)},null,2)+"\n");
    throw error;
  }finally{
    if(browser)await browser.close();
    if(online)await new Promise(ok=>server.close(ok));
  }
}
function keyAndTick(tick){return {key,tick};}
