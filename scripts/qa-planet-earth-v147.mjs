import assert from "node:assert/strict";
import {mkdir,readFile,writeFile} from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import {chromium} from "playwright-core";

const origin=process.env.YAUTJA_QA_BASE_URL??"http://127.0.0.1:3101";
const output=path.resolve(process.env.YAUTJA_PLANET_EARTH_V147_QA_OUTPUT??"outputs/qa-planet-earth-v147");
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
let report;
try{
  await page.goto(origin+"/planet-generator-v103",{waitUntil:"domcontentloaded",timeout:90000});
  const generator=page.getByTestId("planet-generator-v103").filter({visible:true});
  await generator.waitFor();
  const code=await generator.getAttribute("data-preview-planet-code");
  const earth=generator.getByTestId("planet-earth-reference-v147");
  await earth.getByTestId("planet-earth-toggle-v147").click();
  await page.waitForFunction(()=>document.querySelector('[data-testid="planet-earth-reference-v147"]')
    ?.getAttribute("data-render-status")==="ready",null,{timeout:60000});
  check("V147 source opens only on user action, without generating or overwriting an alien world",
    (await generator.getAttribute("data-preview-planet-code"))===code &&
    (await earth.getAttribute("data-source-scale"))==="110m");
  check("V147 source describes 127 real Earth land polygons",
    (await earth.getByTestId("planet-earth-source-stats-v147").innerText()).includes("127 polygones"));
  const settings=earth.getByTestId("planet-film-setting-v148");
  check("V148 official canon registry records terrestrial and alien movie settings separately",
    (await settings.count())===5 &&
    (await earth.locator('[data-testid="planet-film-setting-v148"][data-world="earth"]').count())===3 &&
    (await earth.locator('[data-testid="planet-film-setting-v148"][data-world="unidentified-alien"]').count())===2);
  check("V148 only city-level Predator 2 is a GPS point, not a regional or alien film",
    (await earth.getByTestId("planet-earth-film-pin-v148").count())===1 &&
    (await earth.getByTestId("planet-earth-film-pin-v148").first().getAttribute("data-film"))==="predator-2-1990");

  const canvas=earth.getByTestId("planet-earth-canvas-v147");
  const sample=async(lon,lat)=>canvas.evaluate((node,geo)=>{
    const x=Math.max(0,Math.min(node.width-1,Math.round((geo.lon+180)/360*node.width)));
    const y=Math.max(0,Math.min(node.height-1,Math.round((90-geo.lat)/180*node.height)));
    return [...node.getContext("2d").getImageData(x,y,1,1).data];
  },{lon,lat});
  const paris=await sample(2.35,48.85),pacific=await sample(-150,0);
  check("V147 Earth planisphere has true Europe land and Pacific ocean pixels",
    paris[1]>paris[2] && pacific[2]>pacific[1] && paris[3]===255 && pacific[3]===255);
  await earth.screenshot({path:path.join(output,"earth-planisphere-desktop.png")});

  await earth.getByTestId("planet-earth-projection-v147").selectOption("globe");
  await page.waitForFunction(()=>document.querySelector('[data-testid="planet-earth-reference-v147"]')
    ?.getAttribute("data-render-status")==="ready" &&
    document.querySelector('[data-testid="planet-earth-reference-v147"]')
      ?.getAttribute("data-projection")==="globe",null,{timeout:60000});
  const center=()=>canvas.evaluate(node=>({
    midpoint:[...node.getContext("2d").getImageData(Math.floor(node.width/2),Math.floor(node.height/2),1,1).data],
    corner:[...node.getContext("2d").getImageData(0,0,1,1).data],
  }));
  const euro=await center();
  check("V147 geographic globe follows the same inverse geodesic projection as V101",
    euro.midpoint[1]>euro.midpoint[2] && euro.corner[3]===0);
  await earth.getByTestId("planet-earth-camera-v147").selectOption("oceania");
  await page.waitForFunction(()=>document.querySelector('[data-testid="planet-earth-reference-v147"]')
    ?.getAttribute("data-render-status")==="ready",null,{timeout:60000});
  check("V148 true orthographic projection hides Los Angeles on the opposite hemisphere",
    (await earth.getByTestId("planet-earth-film-pin-v148").count())===0);
  await earth.getByTestId("planet-earth-camera-v147").selectOption("pacific");
  await page.waitForFunction(()=>document.querySelector('[data-testid="planet-earth-reference-v147"]')
    ?.getAttribute("data-render-status")==="ready",null,{timeout:60000});
  const ocean=await center();
  check("V147 moving to the Pacific shows ocean instead of European land on the same globe",
    ocean.midpoint[2]>ocean.midpoint[1] && ocean.midpoint[3]===255);
  check("V148 only the actual city-centre Los Angeles marker reappears when its hemisphere is visible",
    (await earth.getByTestId("planet-earth-film-pin-v148").count())===1);
  await earth.screenshot({path:path.join(output,"earth-globe-pacific-desktop.png")});

  const waiting=page.waitForEvent("download",{timeout:60000});
  await earth.getByTestId("planet-earth-png-v147").click();
  const image=await waiting, pngPath=path.join(output,image.suggestedFilename());
  await image.saveAs(pngPath);
  const meta=await sharp(pngPath).metadata();
  check("V147 exports the actual currently selected orthographic Earth PNG",
    meta.width===512 && meta.height===512 && meta.format==="png");

  const waitingGeo=page.waitForEvent("download",{timeout:60000});
  await earth.getByTestId("planet-earth-geojson-v147").click();
  const geo=await waitingGeo, geoPath=path.join(output,geo.suggestedFilename());
  await geo.saveAs(geoPath);
  const raw=JSON.parse(await readFile(geoPath,"utf8"));
  check("V147 portable Natural Earth GeoJSON remains independent from fictional planets",
    raw.type==="FeatureCollection" && raw.features.length===127 &&
    raw.features.every(f=>f.geometry.type==="Polygon") &&
    (await generator.getAttribute("data-preview-planet-code"))===code);

  await page.setViewportSize({width:390,height:844});
  await earth.screenshot({path:path.join(output,"earth-globe-mobile.png")});
  check("V147 Earth reference is operable on mobile without modifying any war code",
    await earth.getByTestId("planet-earth-png-v147").isEnabled() &&
    (await generator.getAttribute("data-preview-planet-code"))===code &&
    errors.length===0);
  report={passed:true,checks,worldCode:code,errors};
}catch(error){
  report={passed:false,checks,errors,error:String(error),stack:error?.stack};
  await page.screenshot({path:path.join(output,"failure.png"),fullPage:true}).catch(()=>{});
}finally{
  await writeFile(path.join(output,"result.json"),JSON.stringify(report,null,2)+"\n");
  await browser.close();
}
if(!report.passed){console.error(report);process.exitCode=1;}
else console.log("PASS V147 Earth reference: "+checks.length+" browser checks");
