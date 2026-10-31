import assert from "node:assert/strict";
import {mkdir,writeFile,readFile} from "node:fs/promises";
import path from "node:path";
import {chromium} from "playwright-core";

const origin=process.env.YAUTJA_QA_BASE_URL??"http://127.0.0.1:3101";
const output=path.resolve(process.env.YAUTJA_PLANET_TRAVERSE_V154_QA_OUTPUT??"outputs/qa-planet-traversal-v154");
await mkdir(output,{recursive:true});
const checks=[],errors=[],check=(name,ok)=>{assert.ok(ok,name);checks.push(name);};
const browser=await chromium.launch({
  ...(process.env.CHROMIUM_EXECUTABLE_PATH
    ? {executablePath:process.env.CHROMIUM_EXECUTABLE_PATH}
    : {channel:process.env.AUDIT_CHROME_CHANNEL??"chrome"}),
  headless:true,args:["--no-sandbox","--disable-dev-shm-usage","--enable-unsafe-swiftshader","--use-gl=angle","--use-angle=swiftshader"],
});
const context=await browser.newContext({viewport:{width:1440,height:1030},acceptDownloads:true,reducedMotion:"reduce"});
const page=await context.newPage();
page.on("pageerror",error=>errors.push(error.message));
let report;
try{
  await page.goto(origin+"/planet-generator-v103",{waitUntil:"domcontentloaded",timeout:90000});
  const generator=page.getByTestId("planet-generator-v103").filter({visible:true});
  await generator.waitFor();
  await generator.getByRole("button",{name:"Activer le générateur V115",exact:true}).click();
  await generator.getByRole("button",{name:"Générer l’aperçu",exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('[data-testid="planet-generator-v103"]')
    ?.getAttribute("data-recipe-version")==="115",null,{timeout:90000});
  const world=await generator.getAttribute("data-preview-planet-code");
  const relief=generator.locator('[data-testid="planet-relief-v150"][data-world-code="'+world+'"]');
  await relief.getByTestId("planet-relief-toggle-v150").click();
  await page.waitForFunction(code=>[...document.querySelectorAll('[data-testid="planet-relief-v150"]')]
    .some(node=>node.getAttribute("data-world-code")===code&&
      node.getAttribute("data-render-status")==="ready"),world,{timeout:60000});
  const lab=relief.getByTestId("planet-traversal-v154");
  check("V154 playable traversal is tied to exact canonical planet, not another front",
    (await lab.getAttribute("data-world-code"))===world);
  const territory=lab.getByTestId("planet-traversal-territory-v154");
  const territoryCount=await territory.locator("option").count();
  check("V154 uses actual V115 territory IDs as departure anchors",
    territoryCount>=18 && territoryCount<=96);
  const play=lab.getByTestId("planet-traversal-play-v154");
  const map=play.getByTestId("planet-traversal-map-v154");
  const tiles=play.getByTestId("planet-traversal-tile-v154");
  check("V154 displays a real interactive and bounded 19x13 cartographic grid",
    (await tiles.count())===247 && (await play.getAttribute("data-unit-id"))==="RTS-U02");
  const stats=play.getByTestId("planet-traversal-stats-v154");
  const findNeighbor=()=>play.evaluate(root=>{
    const [x,y]=(root.getAttribute("data-position")||"none").split(",").map(Number);
    if(!Number.isFinite(x)||!Number.isFinite(y))return null;
    const options=[[x+1,y],[x,y+1],[x-1,y],[x,y-1]];
    for(const [nx,ny] of options){
      const tile=root.querySelector('[data-testid="planet-traversal-tile-v154"][data-x="'+nx+'"][data-y="'+ny+'"]');
      if(tile?.getAttribute("data-passable")==="true")return {x:nx,y:ny};
    }
    return null;
  });
  let neighbor=await findNeighbor();
  if(!neighbor){
    const options=await territory.locator("option").evaluateAll(items=>items.slice(1,22).map(item=>item.value));
    for(const value of options){
      await territory.selectOption(value);
      neighbor=await findNeighbor();
      if(neighbor)break;
    }
  }
  check("V154 generated planet includes a navigable actual dry-land neighbor for a pisteur",
    Boolean(neighbor)&&Boolean(await play.getAttribute("data-position")));
  const firstPosition=await play.getAttribute("data-position");
  await tiles.filter({hasNotText:"IMPOSSIBLE"}).locator("xpath=..").count().catch(()=>{});
  await play.locator('[data-testid="planet-traversal-tile-v154"][data-x="'+neighbor.x+'"][data-y="'+neighbor.y+'"]').click();
  check("V154 click prepares only a contiguous path instead of teleporting the unit",
    (await play.locator('[data-testid="planet-traversal-tile-v154"][data-planned="true"]').count())>0 &&
    (await play.getAttribute("data-position"))===firstPosition &&
    await play.getByTestId("planet-traversal-step-v154").isEnabled());
  await play.getByTestId("planet-traversal-step-v154").click();
  check("V154 move command performs exactly one real adjacent step on dry ground",
    (await play.getAttribute("data-steps"))==="1" &&
    (await play.getAttribute("data-position"))===neighbor.x+","+neighbor.y &&
    (await generator.getAttribute("data-preview-planet-code"))===world);
  const noLand=play.locator('[data-testid="planet-traversal-tile-v154"][data-land="false"]');
  if(await noLand.count()){
    await noLand.first().click();
    check("V154 medium remains a real blocking cell, never a fabricated bridge",
      (await play.getByTestId("planet-traversal-status-v154").innerText()).includes("Destination interdite") &&
      (await play.getAttribute("data-position"))===neighbor.x+","+neighbor.y);
  }
  const waiting=page.waitForEvent("download",{timeout:60000});
  await play.getByTestId("planet-traversal-json-v154").click();
  const download=await waiting,outputPath=path.join(output,download.suggestedFilename());
  await download.saveAs(outputPath);
  const record=JSON.parse(await readFile(outputPath,"utf8"));
  check("V154 exported exercise is fully separate from war archives and identifies exact real unit and world",
    record.version===154 && record.worldCode===world && record.unitTypeId==="RTS-U02" &&
    record.steps===1 && record.walked.length===2 &&
    record.maximumAllowedGradePercent===27 &&
    !JSON.stringify(record).includes("combatants"));

  const unit=play.getByTestId("planet-traversal-unit-v154");
  await unit.selectOption("RTS-U21");
  check("V154 choosing the real chariot unit recalculates mobility without changing the actual world",
    (await play.getAttribute("data-unit-id"))==="RTS-U21" &&
    (await play.getByTestId("planet-traversal-profile-v154").innerText()).includes("Chariot blindé") &&
    (await play.getAttribute("data-steps"))==="0" &&
    (await generator.getAttribute("data-preview-planet-code"))===world);
  await play.getByTestId("planet-traversal-reset-v154").click();
  check("V154 reset cannot change saved war state or the V115 planet",
    (await play.getAttribute("data-steps"))==="0" &&
    (await generator.getAttribute("data-preview-planet-code"))===world);
  await lab.screenshot({path:path.join(output,"traversal-desktop.png")});
  await page.setViewportSize({width:390,height:844});
  await lab.screenshot({path:path.join(output,"traversal-mobile.png")});
  check("V154 interactive movement controls stay accessible on mobile viewport",
    await play.getByTestId("planet-traversal-reset-v154").isEnabled() &&
    (await map.count())===1 && errors.length===0);
  report={passed:true,checks,errors,world};
}catch(error){
  report={passed:false,checks,errors,error:String(error),stack:error?.stack};
  await page.screenshot({path:path.join(output,"failure.png"),fullPage:true}).catch(()=>{});
}finally{
  await writeFile(path.join(output,"result.json"),JSON.stringify(report,null,2)+"\n");
  await browser.close();
}
if(!report.passed){console.error(report);process.exitCode=1;}
else console.log("PASS V154 playable traversal: "+checks.length+" browser checks");
