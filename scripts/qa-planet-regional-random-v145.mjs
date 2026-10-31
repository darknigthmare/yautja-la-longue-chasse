import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright-core";
const baseUrl = process.env.YAUTJA_QA_BASE_URL ?? "http://127.0.0.1:3101";
const output = path.resolve(process.env.YAUTJA_PLANET_RANDOM_V145_QA_OUTPUT ?? "outputs/qa-planet-regional-random-v145");
await mkdir(output,{recursive:true});
const checks=[],errors=[];
const check=(label,passed)=>{assert.ok(passed,label);checks.push(label);};
const browser=await chromium.launch({
  ...(process.env.CHROMIUM_EXECUTABLE_PATH
    ? { executablePath:process.env.CHROMIUM_EXECUTABLE_PATH }
    : { channel:process.env.AUDIT_CHROME_CHANNEL??"chrome" }),
  headless:true,args:["--no-sandbox","--disable-dev-shm-usage","--enable-unsafe-swiftshader","--use-gl=angle","--use-angle=swiftshader"],
});
const context=await browser.newContext({viewport:{width:1440,height:1050},acceptDownloads:true,reducedMotion:"reduce"});
const page=await context.newPage();
page.on("pageerror",error=>errors.push(error.message));
let result;
try {
  await page.goto(baseUrl+"/planet-generator-v103",{waitUntil:"domcontentloaded",timeout:90000});
  const generator=page.getByTestId("planet-generator-v103").filter({visible:true});
  await generator.waitFor();
  await generator.getByRole("button",{name:"Activer le générateur V115",exact:true}).click();
  await generator.getByRole("button",{name:"Générer l’aperçu",exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('[data-testid="planet-generator-v103"]')
    ?.getAttribute("data-recipe-version")==="115",null,{timeout:90000});
  const worldCode=await generator.getAttribute("data-preview-planet-code");
  const exporter=generator.getByTestId("planet-layer-export-v102");
  await exporter.locator("summary").click();
  const kit=exporter.getByTestId("planet-regional-kit-v128");
  await kit.waitFor({state:"visible"});
  const selectRegion=kit.getByRole("combobox",{name:"Région de la planète"});
  const selectLand=kit.getByRole("combobox",{name:"Sol compatible avec le biome"});
  const selectSurface=kit.getByRole("combobox",{name:"Milieu complémentaire compatible"});
  const regionIds=await selectRegion.locator("option").evaluateAll(nodes=>nodes.map(node=>node.value));
  const panel=kit.getByTestId("planet-regional-random-v145");
  check("V145 materials editor supplies global and region/domain random controls",
    regionIds.length>=3&&(await panel.locator("button").count())===6);
  async function snapshot() {
    const byRegion={};
    for(const regionId of regionIds){
      await selectRegion.selectOption(regionId);
      byRegion[regionId]={ land:await selectLand.inputValue(),surface:await selectSurface.inputValue() };
    }
    return byRegion;
  }
  const changes=(a,b,domain)=>regionIds.filter(regionId=>a[regionId][domain]!==b[regionId][domain]);
  const first=regionIds[0],second=regionIds[1];
  await selectRegion.selectOption(first);
  await panel.getByTestId("planet-region-lock-land-v145").check();
  const initial=await snapshot();
  await panel.getByTestId("planet-region-random-global-v145").click();
  const global=await snapshot();
  check("V145 global random changes all other regional land sources and keeps locked source",
    global[first].land===initial[first].land &&
    changes(initial,global,"land").length===regionIds.length-1);
  check("V145 random content does not change the canonical V115 planet code",
    (await generator.getAttribute("data-preview-planet-code"))===worldCode);

  await selectRegion.selectOption(second);
  const secondBefore=await snapshot();
  await selectRegion.selectOption(second);
  await panel.getByTestId("planet-region-random-selected-v145").click();
  const secondAfter=await snapshot();
  check("V145 per-region random edits only the selected regional kit entry",
    regionIds.every(id=>id===second ||
      JSON.stringify(secondBefore[id])===JSON.stringify(secondAfter[id])) &&
    JSON.stringify(secondBefore[second])!==JSON.stringify(secondAfter[second]));
  await selectRegion.selectOption(first);
  check("V145 land lock belongs to the first region only",
    await panel.getByTestId("planet-region-lock-land-v145").isChecked());
  await selectRegion.selectOption(second);
  check("V145 switching region restores its independent lock state",
    !(await panel.getByTestId("planet-region-lock-land-v145").isChecked()));
  await panel.getByTestId("planet-region-lock-surface-v145").check();
  check("V145 an individual locked liquid material cannot be randomized accidentally",
    await panel.getByTestId("planet-region-random-surface-v145").isDisabled());
  await panel.getByTestId("planet-region-lock-surface-v145").uncheck();

  const beforeLand=await snapshot();
  await panel.getByTestId("planet-region-random-all-land-v145").click();
  const afterLand=await snapshot();
  check("V145 all-solids action preserves every ocean material",
    regionIds.every(id=>beforeLand[id].surface===afterLand[id].surface));
  check("V145 all-solids action preserves first region's land lock",
    beforeLand[first].land===afterLand[first].land &&
    changes(beforeLand,afterLand,"land").length===regionIds.length-1);

  const beforeSea=await snapshot();
  await panel.getByTestId("planet-region-random-all-surface-v145").click();
  const afterSea=await snapshot();
  check("V145 all-media action never changes continental land textures",
    regionIds.every(id=>beforeSea[id].land===afterSea[id].land));
  check("V145 all-media action changes only existing compatible surface slots",
    changes(beforeSea,afterSea,"surface").length>0);

  await selectRegion.selectOption(second);
  const priorSecondLand=await selectLand.inputValue();
  await panel.getByTestId("planet-region-random-land-v145").click();
  check("V145 selected land action varies only its compatible terrestrial source",
    (await selectLand.inputValue())!==priorSecondLand);
  const priorSecondSea=await selectSurface.inputValue();
  await panel.getByTestId("planet-region-random-surface-v145").click();
  check("V145 selected sea action varies only its compatible medium source",
    (await selectSurface.inputValue())!==priorSecondSea);

  await selectRegion.selectOption(first);
  const alternatives=await selectLand.locator("option").evaluateAll(nodes=>nodes.map(node=>node.value));
  const initialLocked=await selectLand.inputValue();
  await selectLand.selectOption(alternatives.find(id=>id!==initialLocked));
  check("V145 random lock does not block the user's intentional manual texture change",
    (await selectLand.inputValue())!==initialLocked &&
    await panel.getByTestId("planet-region-lock-land-v145").isChecked());

  const downloadPromise=page.waitForEvent("download",{timeout:60000});
  await kit.getByTestId("planet-region-kit-json-v128").click();
  const download=await downloadPromise;
  const file=path.join(output,download.suggestedFilename());
  await download.saveAs(file);
  const manifest=JSON.parse(await readFile(file,"utf8"));
  check("V145 exports an unchanged, valid V128 regional kit schema",
    manifest.format==="yautja-planet-regional-material-kit" &&
    manifest.version===128 && manifest.worldCode===worldCode &&
    manifest.entries.length===regionIds.length &&
    manifest.entries.every((entry,i)=>entry.regionId===regionIds[i] &&
      typeof entry.landMaterialId==="string" && Number.isInteger(entry.seed)));
  await panel.screenshot({path:path.join(output,"regional-random-desktop.png")});
  await page.setViewportSize({width:390,height:844});
  check("V145 global regional controls remain usable on mobile",
    await panel.getByTestId("planet-region-random-global-v145").isEnabled());
  await panel.screenshot({path:path.join(output,"regional-random-mobile.png")});
  check("V145 browser scenario preserves world identity and produces no runtime errors",
    errors.length===0 &&
    (await generator.getAttribute("data-preview-planet-code"))===worldCode);
  result={passed:true,checks,worldCode,errors};
}catch(error){
  result={passed:false,checks,errors,error:String(error),stack:error?.stack};
  await page.screenshot({path:path.join(output,"failure.png"),fullPage:true}).catch(()=>{});
}finally{
  await writeFile(path.join(output,"result.json"),JSON.stringify(result,null,2)+"\n");
  await browser.close();
}
if(!result.passed){console.error(result);process.exitCode=1;}
else console.log("PASS V145 regional random kit: "+checks.length+" browser checks");
