/** Actual browser test of the V136 client UI and its real SVG source assets.
 * This runs locally on the GitHub Actions runner only. No online or user saves.
 * Browser actions verify 54 entries, independent art, covered lids and local image privacy. */
import assert from "node:assert/strict";
import {createServer} from "node:http";
import {readFile,mkdir} from "node:fs/promises";
import {existsSync} from "node:fs";
import {fileURLToPath} from "node:url";
import path from "node:path";
import {build} from "esbuild";
import {chromium} from "playwright-core";
import sharp from "sharp";

const root=fileURLToPath(new URL("../",import.meta.url));
const compiled=await build({
  absWorkingDir:root,entryPoints:["tests/browser/gauntlet-v136.fixture.tsx"],
  bundle:true,write:false,platform:"browser",format:"iife",outdir:"gauntlet-qa",
  jsx:"automatic",loader:{".module.css":"local-css"},
});
const outputs=new Map(compiled.outputFiles.map(file=>[path.basename(file.path),file.contents]));
const js=[...outputs.entries()].find(([name])=>name.endsWith(".js"));
const css=[...outputs.entries()].find(([name])=>name.endsWith(".css"));
assert.ok(js,"The visual QA React bundle must compile");
assert.ok(css,"The CSS Modules must be compiled for real visual QA");
const html=`<!doctype html><html lang="fr"><head><meta charset="UTF-8"/><title>Gauntlet QA V136</title><link rel="stylesheet" href="/visual.css"><style>html,body{margin:0;min-height:100%;background:#09151d}</style></head><body><div id="root"></div><script src="/visual.js"></script></body></html>`;
const contentType=new Map([[".svg","image/svg+xml"],[".js","text/javascript"],[".css","text/css"]]);
const allowedRoot=path.join(root,"public","game","assets");
const server=createServer(async (req,res)=>{
  try{
    const url=new URL(req.url||"/","http://127.0.0.1");
    if(url.pathname==="/"){res.writeHead(200,{"content-type":"text/html; charset=utf-8"});res.end(html);return;}
    if(url.pathname==="/visual.js"){res.writeHead(200,{"content-type":"text/javascript"});res.end(js[1]);return;}
    if(url.pathname==="/visual.css"){res.writeHead(200,{"content-type":"text/css"});res.end(css[1]);return;}
    if(!url.pathname.startsWith("/game/assets/")){res.writeHead(404);res.end();return;}
    const file=path.resolve(root,"public",url.pathname.slice(1));
    if(!file.startsWith(allowedRoot+path.sep)||!existsSync(file)){res.writeHead(404);res.end();return;}
    const data=await readFile(file);
    res.writeHead(200,{"content-type":contentType.get(path.extname(file))||"application/octet-stream"});
    res.end(data);
  }catch(error){res.writeHead(500);res.end(String(error));}
});
let browser=null;
const events=[];
try{
 await new Promise((resolve,reject)=>{server.once("error",reject);server.listen(0,"127.0.0.1",resolve);});
 const addr=server.address();
 assert.ok(addr&&typeof addr==="object");
 const chrome=process.env.QA_CHROME_PATH||
  ["/usr/bin/google-chrome","/usr/bin/google-chrome-stable","/opt/google/chrome/chrome","/usr/bin/chromium"].find(existsSync);
 browser=await chromium.launch({
   ...(chrome?{executablePath:chrome}:{}),
   headless:true,args:["--no-sandbox","--disable-dev-shm-usage"],
 });
 const page=await browser.newPage({viewport:{width:1250,height:860},acceptDownloads:false});
 page.on("pageerror",err=>events.push("ERROR: "+err.message));
 const serverOrigin=`http://127.0.0.1:${addr.port}`;
 const failedAssets=[];
 page.on("response",r=>{if(r.url().includes("/game/assets/")&&r.status()>=400)failedAssets.push(r.url());});
 await page.goto(serverOrigin+"/",{waitUntil:"networkidle"});
 await page.getByRole("heading",{name:"54 gauntlets à comparer"}).waitFor({timeout:15000});
 assert.equal(await page.locator("main[data-testid='gauntlet-visual-qa-v136']").count(),1);
 const choices=page.locator("section[aria-label='Catalogue des 54 modèles'] button[aria-pressed]");
 assert.equal(await choices.count(),12,"Catalog is paginated at 12");
 await page.getByRole("searchbox",{name:"Recherche"}).fill("lost-boar");
 assert.equal(await page.locator("section[aria-label='Catalogue des 54 modèles'] button[aria-pressed]").count(),1);
 await page.locator("section[aria-label='Catalogue des 54 modèles'] button[aria-pressed]").first().click();
 await page.locator("svg[data-testid='gauntlet-archive-study-v136'][data-model='lost-boar']").waitFor();
 assert.equal(await page.locator("svg[data-model='lost-boar'] image").count(),4);
 await page.getByRole("checkbox",{name:"Afficher Coque"}).uncheck();
 assert.equal(await page.locator("svg[data-model='lost-boar'] image").count(),3,"Hiding shell must remove the source layer");
 await page.getByRole("button",{name:"Afficher tous les calques"}).click();
 assert.equal(await page.locator("svg[data-model='lost-boar'] image").count(),4);
 await page.getByRole("button",{name:"Refermer les capots"}).click();
 assert.equal(await page.locator("svg[data-model='lost-boar'][data-cover-open='false']").count(),1);
 await page.getByRole("button",{name:"Comparer deux gauntlets"}).click();
 await page.getByRole("combobox",{name:"Second modèle"}).selectOption("wolf");
 assert.equal(await page.locator("svg[data-model='wolf']").count(),1);
 await mkdir(path.join(root,"outputs"),{recursive:true});
 await page.screenshot({path:path.join(root,"outputs/gauntlet-browser-v136-comparison.png"),fullPage:true});
 assert.equal(await page.locator("svg[data-model='lost-boar']").count(),1);
 await page.getByRole("button",{name:"Vue simple"}).click();
 const image=await sharp({create:{width:32,height:32,channels:4,background:{r:255,g:255,b:255,alpha:1}}}).png().toBuffer();
 await page.getByRole("button",{name:"Effacer la référence"}).count().then(x=>assert.equal(x,0));
 await page.getByRole("searchbox",{name:"Recherche"}).fill("");
 await page.locator('input[type="file"]').setInputFiles({name:"reference-test.png",mimeType:"image/png",buffer:image});
 await page.getByText("Comparaison locale : reference-test.png").waitFor();
 assert.equal(await page.locator("img[alt^='Photogramme ou photo de référence']").count(),1);
 await page.getByRole("button",{name:"Effacer la référence"}).click();
 assert.equal(await page.locator("img[alt^='Photogramme ou photo de référence']").count(),0);
 await page.screenshot({path:path.join(root,"outputs/gauntlet-browser-v136-single.png"),fullPage:true});
 assert.equal(failedAssets.length,0,"The actual model layer sources must load as images");
 assert.deepEqual(events,[],"The actual UI must not throw JavaScript exceptions");
 console.log(JSON.stringify({mode:"actual Chromium React QA fixture",checks:12,artworkSources:219,previewedModels:["jungle-hunter","lost-boar","wolf"],pageErrors:events,failedAssets,status:"PASS"},null,2));
}finally{
 await browser?.close();
 await new Promise(resolve=>server.close(resolve));
}
