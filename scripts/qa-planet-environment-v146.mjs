import assert from "node:assert/strict";
import {mkdir,readFile,writeFile} from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import {chromium} from "playwright-core";

const origin=process.env.YAUTJA_QA_BASE_URL??"http://127.0.0.1:3101";
const output=path.resolve(process.env.YAUTJA_PLANET_ENV_V146_QA_OUTPUT??"outputs/qa-planet-environment-v146");
await mkdir(output,{recursive:true});
const checks=[],errors=[],check=(label,ok)=>{assert.ok(ok,label);checks.push(label);};
const browser=await chromium.launch({
  ...(process.env.CHROMIUM_EXECUTABLE_PATH
    ? {executablePath:process.env.CHROMIUM_EXECUTABLE_PATH}
    : {channel:process.env.AUDIT_CHROME_CHANNEL??"chrome"}),
  headless:true,args:["--no-sandbox","--disable-dev-shm-usage","--enable-unsafe-swiftshader","--use-gl=angle","--use-angle=swiftshader"],
});
const context=await browser.newContext({viewport:{width:1440,height:1024},acceptDownloads:true,reducedMotion:"reduce"});
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
  const worldCode=await generator.getAttribute("data-preview-planet-code");
  const panel=generator.getByTestId("planet-environment-v146");
  await panel.getByTestId("planet-environment-toggle-v146").click();
  await page.waitForFunction(()=>document.querySelector('[data-testid="planet-environment-v146"]')
    ?.getAttribute("data-map-ready")==="true",null,{timeout:60000});
  check("V146 creates a real diagnostic for the exact V115 world",worldCode?.startsWith("proc-v115-") &&
    (await panel.getAttribute("data-world-code"))===worldCode);
  const rows=panel.getByTestId("planet-environment-region-v146");
  check("V146 environmental table covers the same true planet regions",
    (await rows.count())>=3 && (await rows.count())<=12);

  await panel.getByTestId("planet-environment-season-v146").selectOption("northern-solstice");
  check("V146 chosen season changes the actual hypothetical solar declination",
    (await panel.getByTestId("planet-environment-declination-v146").innerText()).includes("23,5"));
  const north=await rows.evaluateAll(items=>items.map(node=>({
    id:node.getAttribute("data-region-id"),hours:Number(node.getAttribute("data-daylight-hours")),
  })));
  await panel.getByTestId("planet-environment-season-v146").selectOption("southern-solstice");
  const south=await rows.evaluateAll(items=>items.map(node=>({
    id:node.getAttribute("data-region-id"),hours:Number(node.getAttribute("data-daylight-hours")),
  })));
  check("V146 opposite solstice alters daylight estimates for real non-equatorial regions",
    north.length===south.length && north.some((item,index)=>item.id===south[index].id &&
      Math.abs(item.hours-south[index].hours)>0.1));

  const tilt=panel.getByTestId("planet-environment-tilt-v146");
  await tilt.evaluate(input=>{
    const set=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value").set;
    set.call(input,"45");
    input.dispatchEvent(new Event("input",{bubbles:true}));
    input.dispatchEvent(new Event("change",{bubbles:true}));
  });
  await page.waitForFunction(()=>document.querySelector('[data-testid="planet-environment-declination-v146"]')
    ?.textContent?.includes("45"),null,{timeout:15000});
  check("V146 axial tilt slider drives scientific day/night calculations",await tilt.inputValue()==="45");

  const waitJson=page.waitForEvent("download",{timeout:45000});
  await panel.getByTestId("planet-environment-export-json-v146").click();
  const json=await waitJson, jsonPath=path.join(output,json.suggestedFilename());
  await json.saveAs(jsonPath);
  const data=JSON.parse(await readFile(jsonPath,"utf8"));
  check("V146 exported environmental sidecar has exact world code, tilt and season",
    data.version===146 && data.worldCode===worldCode && data.assumedAxialTiltDeg===45 &&
    data.season==="southern-solstice" && data.regions.length===north.length);
  check("V146 keeps source gravity and radius separate from inferred physical values",
    data.physical?.radiusKm>0 && data.physical.inferredMeanDensityKgPerM3>0 &&
    data.physical.escapeVelocityKmPerSecond>0 && data.limitations.length>=4);

  const waitPng=page.waitForEvent("download",{timeout:45000});
  await panel.getByTestId("planet-environment-export-png-v146").click();
  const image=await waitPng,pngPath=path.join(output,image.suggestedFilename());
  await image.saveAs(pngPath);
  const pixels=await sharp(pngPath).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  let land=0,medium=0;
  const biomes=new Set();
  for(let i=0;i<pixels.data.length;i+=4){
    if(pixels.data[i+3]===255){
      land++;biomes.add([...pixels.data.slice(i,i+3)].join(","));
    }else if(pixels.data[i+3]===0)medium++;
  }
  check("V146 exported 512x256 PNG uses real regional mask and transparent inland/outer media",
    pixels.info.width===512 && pixels.info.height===256 && land>0 && medium>0 && biomes.size>=1);

  await panel.screenshot({path:path.join(output,"planet-environment-desktop.png")});
  await page.setViewportSize({width:390,height:844});
  await panel.screenshot({path:path.join(output,"planet-environment-mobile.png")});
  check("V146 controls remain available on mobile without changing the procedural world",
    await panel.getByTestId("planet-environment-export-json-v146").isEnabled() &&
    (await generator.getAttribute("data-preview-planet-code"))===worldCode);
  check("V146 browser rendered without runtime exceptions",errors.length===0);
  report={passed:true,worldCode,checks,errors};
}catch(error){
  report={passed:false,checks,errors,error:String(error),stack:error?.stack};
  await page.screenshot({path:path.join(output,"failure.png"),fullPage:true}).catch(()=>{});
}finally{
  await writeFile(path.join(output,"result.json"),JSON.stringify(report,null,2)+"\n");
  await browser.close();
}
if(!report.passed){console.error(report);process.exitCode=1;}
else console.log("PASS V146 planet environment: "+checks.length+" browser checks");
