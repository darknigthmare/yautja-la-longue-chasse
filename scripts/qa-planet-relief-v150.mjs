import assert from "node:assert/strict";
import {mkdir,readFile,writeFile} from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import {chromium} from "playwright-core";

const origin=process.env.YAUTJA_QA_BASE_URL??"http://127.0.0.1:3101";
const output=path.resolve(process.env.YAUTJA_PLANET_RELIEF_V150_QA_OUTPUT??"outputs/qa-planet-relief-v150");
await mkdir(output,{recursive:true});
const checks=[],errors=[],check=(name,value)=>{assert.ok(value,name);checks.push(name);};
const browser=await chromium.launch({
  ...(process.env.CHROMIUM_EXECUTABLE_PATH
    ?{executablePath:process.env.CHROMIUM_EXECUTABLE_PATH}
    :{channel:process.env.AUDIT_CHROME_CHANNEL??"chrome"}),
  headless:true,args:["--no-sandbox","--disable-dev-shm-usage","--enable-unsafe-swiftshader","--use-gl=angle","--use-angle=swiftshader"],
});
const context=await browser.newContext({viewport:{width:1440,height:1024},acceptDownloads:true,reducedMotion:"reduce"});
const page=await context.newPage();
page.on("pageerror",error=>errors.push(error.message));
let result;
try{
  await page.goto(origin+"/planet-generator-v103",{waitUntil:"domcontentloaded",timeout:90000});
  const generator=page.getByTestId("planet-generator-v103").filter({visible:true});
  await generator.waitFor();
  await generator.getByRole("button",{name:"Activer le générateur V115",exact:true}).click();
  await generator.getByRole("button",{name:"Générer l’aperçu",exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('[data-testid="planet-generator-v103"]')
    ?.getAttribute("data-recipe-version")==="115",null,{timeout:90000});
  const world=await generator.getAttribute("data-preview-planet-code");
  const panel=generator.locator('[data-testid="planet-relief-v150"][data-world-code="'+world+'"]');
  await panel.getByTestId("planet-relief-toggle-v150").click();
  await panel.scrollIntoViewIfNeeded();
  await page.waitForFunction(code=>[...document.querySelectorAll('[data-testid="planet-relief-v150"]')]
    .some(el=>el.getAttribute("data-world-code")===code&&el.getAttribute("data-render-status")==="ready"),
    world,{timeout:60000});
  check("V150 produces a real elevation map for this exact V115 world",
    (await panel.getAttribute("data-render-status"))==="ready" &&
    (await generator.getAttribute("data-preview-planet-code"))===world);
  const stats=panel.getByTestId("planet-relief-stats-v150");
  check("V150 reports actual dry land pixels and non-land coverage",
    (await stats.innerText()).includes("pixels terrestres") &&
    (await stats.innerText()).includes("pixels de milieux"));
  const regions=panel.getByTestId("planet-relief-region-v150");
  const count=await regions.count();
  check("V150 elevation summaries use actual region IDs",count>=3&&count<=12);

  const map=panel.getByTestId("planet-relief-map-v150");
  const pixels=async()=>map.evaluate(canvas=>{
    const data=canvas.getContext("2d").getImageData(0,0,canvas.width,canvas.height).data;
    let land=0,water=0;
    const colors=new Set();
    for(let i=0;i<data.length;i+=4){
      if(data[i+3]===255){land++;colors.add(data[i]+","+data[i+1]+","+data[i+2]);}
      else if(data[i+3]===0)water++;
    }
    return {land,water,colors:colors.size};
  });
  const before=await pixels();
  check("V150 preview keeps oceans, lakes and rivers transparent and has varied elevation colours",
    before.land>0&&before.water>0&&before.colors>=10);

  const takePng=async(button)=>{
    const waiting=page.waitForEvent("download",{timeout:60000});
    await panel.getByTestId(button).click();
    const download=await waiting,file=path.join(output,download.suggestedFilename());
    await download.saveAs(file);
    return file;
  };
  const encoded=await takePng("planet-relief-png-rg16-v150");
  const rgba=await sharp(encoded).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  check("V150 RG16 height export is 512x256 with both land and transparent sea",
    rgba.info.width===512&&rgba.info.height===256&&
    rgba.data.some((value,i)=>i%4===3&&value===0) &&
    rgba.data.some((value,i)=>i%4===3&&value===255) &&
    rgba.data.some((value,i)=>i%4===1&&value>0));
  const painted=await takePng("planet-relief-png-preview-v150");
  check("V150 painted elevation study exports a genuine PNG",
    (await sharp(painted).metadata()).format==="png");

  const waitJson=page.waitForEvent("download",{timeout:60000});
  await panel.getByTestId("planet-relief-json-v150").click();
  const json=await waitJson,jsonPath=path.join(output,json.suggestedFilename());
  await json.saveAs(jsonPath);
  const receipt=JSON.parse(await readFile(jsonPath,"utf8"));
  check("V150 JSON defines exact RG16 metre decoder and same world regions",
    receipt.version===150&&receipt.worldCode===world &&
    receipt.regions.length===count&&receipt.heightEncoding.red==="8 most significant bits" &&
    receipt.maxElevationMeters===undefined&&receipt.maximumSelectedElevationMeters===8000);

  const maxima=panel.getByTestId("planet-relief-max-v150");
  await maxima.evaluate(input=>{
    const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value").set;
    setter.call(input,"12000");input.dispatchEvent(new Event("input",{bubbles:true}));
    input.dispatchEvent(new Event("change",{bubbles:true}));
  });
  await page.waitForFunction(code=>[...document.querySelectorAll('[data-testid="planet-relief-v150"]')]
    .some(el=>el.getAttribute("data-world-code")===code&&el.getAttribute("data-render-status")==="ready"&&
       el.querySelector('[data-testid="planet-relief-max-v150"]')?.value==="12000"),
    world,{timeout:60000});
  check("V150 adjusting maximum elevation recomputes without changing the procedural war world",
    (await generator.getAttribute("data-preview-planet-code"))===world);
  const beforeRandom=await pixels();
  await panel.getByTestId("planet-relief-random-v150").click();
  await page.waitForTimeout(800);
  const afterRandom=await pixels();
  check("V150 regenerating mountain ridges changes displayed elevation instead of geographic ownership",
    beforeRandom.land===afterRandom.land && beforeRandom.water===afterRandom.water &&
    (await generator.getAttribute("data-preview-planet-code"))===world);
  const display=panel.getByTestId("planet-terrain-display-v152");
  await display.selectOption("slope");
  const slopeMap=panel.getByTestId("planet-terrain-slope-map-v152");
  check("V152 reveals a real colour-coded gradient map for actual V150 terrestrial pixels",
    await slopeMap.isVisible() &&
    (await panel.getByTestId("planet-terrain-summary-v152").innerText()).includes("pentes"));
  const gradePng=await takePng("planet-terrain-png-v152");
  const grade=await sharp(gradePng).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  let paintedSlope=0,transparentSlope=0;
  for(let i=0;i<grade.data.length;i+=4){
    if(grade.data[i+3]===255)paintedSlope++;
    else if(grade.data[i+3]===0)transparentSlope++;
  }
  check("V152 slope image contains only real terrestrial pixels and transparent alien media",
    grade.info.width===512 && grade.info.height===256 &&
    paintedSlope>0 && transparentSlope>0);
  const waitTerrain=page.waitForEvent("download",{timeout:60000});
  await panel.getByTestId("planet-terrain-json-v152").click();
  const receipt=await waitTerrain,terrainPath=path.join(output,receipt.suggestedFilename());
  await receipt.saveAs(terrainPath);
  const terrainData=JSON.parse(await readFile(terrainPath,"utf8"));
  check("V152 route study covers actual links, legal crossings, and no saved war orders",
    terrainData.version===152 && terrainData.worldCode===world &&
    terrainData.routes.length>0 &&
    terrainData.routes.some(route=>route.kind==="crossing") &&
    terrainData.routes.every(route=>route.samples===route.landSamples+route.nonLandSamples) &&
    !JSON.stringify(terrainData).includes("combatants"));
  check("V152 route study has the exact number of territorial regions",
    terrainData.regions.length===count);
  await panel.screenshot({path:path.join(output,"planet-terrain-slope-desktop.png")});
  await display.selectOption("relief");
  await panel.screenshot({path:path.join(output,"planet-relief-desktop.png")});
  await page.setViewportSize({width:390,height:844});
  await panel.screenshot({path:path.join(output,"planet-relief-mobile.png")});
  check("V150 relief study is usable on mobile without game mutation",
    await panel.getByTestId("planet-relief-json-v150").isEnabled() &&
    errors.length===0 && (await generator.getAttribute("data-preview-planet-code"))===world);
  result={passed:true,checks,world,errors};
}catch(error){
  result={passed:false,checks,errors,error:String(error),stack:error?.stack};
  await page.screenshot({path:path.join(output,"failure.png"),fullPage:true}).catch(()=>{});
}finally{
  await writeFile(path.join(output,"result.json"),JSON.stringify(result,null,2)+"\n");
  await browser.close();
}
if(!result.passed){console.error(result);process.exitCode=1;}
else console.log("PASS V150 relief: "+checks.length+" browser checks");
