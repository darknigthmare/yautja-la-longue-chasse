/** V147: four REAL V115 gameplay modes in Chromium with actual V6 missions.
 * Each mode runs in a new isolated browser context (not a fake simulation),
 * persists its exercise archive, and resumes from an actual page reload.
 * This does NOT map W3-K locations onto extraterrestrial V85 planets.
 */
import assert from "node:assert/strict";
import {createServer} from "node:http";
import {mkdir,writeFile} from "node:fs/promises";
import {resolve} from "node:path";
import {fileURLToPath} from "node:url";
import {build} from "esbuild";
import {chromium} from "playwright-core";
const root=fileURLToPath(new URL("../",import.meta.url));
const out=resolve(root,"outputs/clan-war-four-modes-v147");
const key="yautja.clan-war.v115.operations.fenced.v2";
const sentinel="yautja.v147.unrelated-campaign-safe";
const bundle=await build({
  absWorkingDir:root,entryPoints:["tests/browser/clan-war-v147-four-modes.fixture.tsx"],
  bundle:true,platform:"browser",format:"iife",jsx:"automatic",write:false,
  outfile:"four-v147.js",logLevel:"warning",
});
const js=bundle.outputFiles.find(f=>f.path.endsWith(".js"))?.contents;
const css=bundle.outputFiles.find(f=>f.path.endsWith(".css"))?.contents;
assert.ok(js&&css,"Real V115 React and CSS must compile");
const html=`<!doctype html><html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>V147: quatre modes réels</title><style>body{margin:0;background:#0d1f24;color:#eff9f5;font:14px system-ui}*{box-sizing:border-box}button,select{min-height:38px}</style><link rel="stylesheet" href="/v147.css"></head><body><div id="root"></div><script src="/v147.js"></script></body></html>`;
const server=createServer((req,res)=>{
 const path=new URL(req.url??"/","http://127.0.0.1").pathname;
 if(path==="/"){res.writeHead(200,{"content-type":"text/html;charset=utf-8"});res.end(html);return;}
 if(path==="/v147.js"){res.writeHead(200,{"content-type":"text/javascript;charset=utf-8"});res.end(js);return;}
 if(path==="/v147.css"){res.writeHead(200,{"content-type":"text/css;charset=utf-8"});res.end(css);return;}
 if(path==="/favicon.ico"){res.writeHead(204);res.end();return;}
 res.writeHead(404);res.end("Unavailable (no game asset was mocked)");
});
const modes=[
 {id:"assault",button:/^Assaut latéral/,caption:"Assaut latéral"},
 {id:"outer",button:/^Mandats délégués/,caption:"Opérations déléguées"},
 {id:"stealth",button:/^Infiltration et sabotage/,caption:"Infiltration"},
 {id:"rts",button:/^Bataille totale/,caption:"RTS"},
];
const checks=[],errors=[];
let browser,started=false;
const readArchive=page=>page.evaluate(key=>{try{return JSON.parse(localStorage.getItem(key)||"null");}catch{return null;}},key);
const pass=(name,detail)=>{checks.push({name,status:"PASS",detail});console.log("[V147 PASS] "+name);};
try{
 await mkdir(out,{recursive:true});
 await new Promise((ok,fail)=>{server.once("error",fail);server.listen(0,"127.0.0.1",ok);});
 started=true;
 const addr=server.address();assert.ok(addr&&typeof addr==="object");
 const url=`http://127.0.0.1:${addr.port}/`;
 browser=await chromium.launch({channel:process.env.AUDIT_CHROME_CHANNEL||"chrome",headless:true});
 for(const plan of modes){
   const context=await browser.newContext({locale:"fr-FR",viewport:{width:1280,height:850}});
   const page=await context.newPage();page.setDefaultTimeout(30000);
   page.on("pageerror",error=>errors.push(plan.id+": "+error.message));
   await page.goto(url,{waitUntil:"domcontentloaded"});
   const lab=page.locator('[data-testid="v147-actual-four-mode-lab"]');
   const op=lab.locator('[data-testid="clan-operations-v115"]');
   await op.waitFor();
   const targetId=await lab.getAttribute("data-legal-target");
   const teamId=await lab.getAttribute("data-legal-team");
   const initialRav=Number(await lab.getAttribute("data-initial-rav"));
   assert.ok(targetId&&teamId&&Number.isFinite(initialRav));
   await page.evaluate(key=>localStorage.setItem(key,"campaign-stays-unchanged"),sentinel);
   assert.equal(await readArchive(page),null);
   await op.getByRole("button",{name:plan.button}).click();
   await op.getByRole("combobox",{name:"Territoire de la Bible V6"}).selectOption(targetId);
   const members=op.locator('input[type="checkbox"]');
   const count=await members.count();
   assert.ok(count>=1,`Missing team roster in ${plan.id}`);
   for(let index=count-1;index>=1;index--){
     if(await members.nth(index).isChecked())await members.nth(index).uncheck();
   }
   if(!await members.first().isChecked())await members.first().check();
   const launch=op.getByRole("button",{name:/^Lancer :/});
   assert.equal(await launch.isEnabled(),true,`Invalid real V6 route for ${plan.id}`);
   assert.equal(await op.locator('[data-testid="clan-operations-gauntlet-v133"]').getAttribute("data-current-mode"),plan.id);
   await launch.click();
   await page.waitForFunction(({id,key})=>{
      const raw=localStorage.getItem(key);
      if(!raw)return false;
      try{const state=JSON.parse(raw);return id==="outer"
        ?state.outer?.length===1:state.active?.mode===id;}catch{return false;}
   },{id:plan.id,key},{timeout:30000});
   const saved=await readArchive(page);
   assert.equal(saved.version,1);assert.equal(saved.context,"free");
   assert.ok(saved.rav<=initialRav);
   assert.equal(saved.assignments[teamId],"W115-OPS-0001");
   assert.equal(saved.serial,1);
   assert.equal(saved.reports.length,0);
   if(plan.id==="outer")assert.equal(saved.outer[0].targetId,targetId);
   else assert.equal(saved.active.targetId,targetId);
   assert.equal(await page.evaluate(s=>localStorage.getItem(s),sentinel),"campaign-stays-unchanged");
   await page.screenshot({path:resolve(out,`01-${plan.id}-native-gameplay.png`),fullPage:false});
   pass("Real "+plan.caption+" launches one V6 operation with identified troops and a single RAV debit",
      {mode:plan.id,team:teamId,target:targetId,archive:"V115 only"});
   // After reload the UI must show the SAVED mode, NOT default to Assault.
   await page.reload({waitUntil:"domcontentloaded"});
   await op.waitFor();
   await page.waitForFunction(id=>{
     const root=document.querySelector('[data-testid="clan-operations-gauntlet-v133"]');
     return root?.getAttribute("data-current-mode")===id;
   },plan.id,{timeout:25000});
   assert.equal(await op.getByRole("combobox",{name:"Territoire de la Bible V6"}).inputValue(),targetId);
   const resumed=await readArchive(page);
   assert.equal(resumed.serial,1);
   assert.equal(resumed.rav,saved.rav);
   if(plan.id==="outer")assert.equal(resumed.outer.length,1);
   else assert.equal(resumed.active.mode,plan.id);
   await page.screenshot({path:resolve(out,`02-${plan.id}-resumed-archive.png`),fullPage:false});
   pass("Real "+plan.caption+" resumes with correct mission mode and target, not an Assault UI reset",
     {mode:plan.id,target:targetId,serial:resumed.serial});
   if(plan.id==="stealth"){
     const oldClock=resumed.clock;
     const move=op.getByRole("button",{name:"↑ Nord"});
     await move.click();
     await page.waitForFunction(({old,key})=>{
       try{return JSON.parse(localStorage.getItem(key)||"{}").clock>old;}catch{return false;}
     },{old:oldClock,key},{timeout:12000});
     assert.equal((await readArchive(page)).active.mode,"stealth");
     pass("Real stealth movement after resuming advances exactly the same saved exercise",true);
     const frozen=JSON.stringify(await readArchive(page));
     await page.getByRole("button",{name:"wolf",exact:true}).click();
     assert.equal(await op.locator('[data-testid="clan-operations-gauntlet-v133"]').getAttribute("data-gauntlet-model"),"wolf");
     assert.equal(JSON.stringify(await readArchive(page)),frozen,"Cosmetic change altered gameplay archive");
     pass("Gauntlet Wolf cosmetic HUD changes WITHOUT any stealth/war archive mutation",true);
   }
   await context.close();
 }
 assert.deepEqual(errors,[]);
 assert.equal(checks.filter(c=>c.name.includes("launches")).length,4);
 assert.equal(checks.filter(c=>c.name.includes("resumes")).length,4);
 const result={
   schema:147,scope:"Four REAL ClanWarOperationsV115 mini-gameplays using source V6 and browser persistence. Not an adapter for 30 V85 planets, not full GameClient menus.",
   uniqueModes:modes.map(m=>m.id),modeLaunches:4,resumes:4,
   unrelatedCampaignWrites:0,oneToOneArtValidated:0,checks,errors,
 };
 await writeFile(resolve(out,"v147-4-mode-browser-proof.json"),JSON.stringify(result,null,2)+"\n");
 console.log(JSON.stringify({modes:result.uniqueModes,launches:4,resumes:4,errors:0},null,2));
}finally{
 await browser?.close();
 if(started){server.closeAllConnections();await new Promise(ok=>server.close(ok));}
}
