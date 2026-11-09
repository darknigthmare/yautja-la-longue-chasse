/** V144: true ClanWarPanelV85 plus the actual V13 SaveGame writer.
 * A seeded QA trophy is an EXPLICIT fixture, not earned user progression.
 * Proves clicking the real armory, award, equip, war turn, reload and second tab.
 * Not complete GameClient navigation, remote-cloud sync, or film 1:1 QA. */
import assert from "node:assert/strict";
import {createServer} from "node:http";
import {readFile,mkdir,writeFile} from "node:fs/promises";
import {resolve,sep,extname} from "node:path";
import {fileURLToPath} from "node:url";
import {build} from "esbuild";
import {chromium} from "playwright-core";
const root=fileURLToPath(new URL("../",import.meta.url));
const publicRoot=resolve(root,"public");
const output=resolve(root,process.env.GAUNTLET_CAMPAIGN_OUTPUT||"outputs/gauntlet-campaign-v144");
const SAVE_KEY="yautja-long-hunt.save";
const WAR_KEY="yautja.clan-war.v85.free.v1";
const bundle=await build({absWorkingDir:root,
  entryPoints:["tests/browser/gauntlet-campaign-v144.fixture.tsx"],
  bundle:true,platform:"browser",format:"iife",jsx:"automatic",
  outfile:"campaign-v144.js",write:false,logLevel:"warning",
  plugins:[{name:"static-next-image-for-local-qa",setup(compilation){
    compilation.onResolve({filter:new RegExp("^next/image$")},()=>({path:"qa-image",namespace:"qa-image"}));
    compilation.onLoad({filter:/.*/,namespace:"qa-image"},()=>({
      loader:"tsx",resolveDir:root,
      contents:`import React from "react"; export default function QaImage({src,alt,width,height,loading,style}){
        return <img src={typeof src==="string"?src:src?.src} alt={alt||""} width={width} height={height}
          loading={loading} style={style}/>;}`,
    }));
  }}],
});
const js=bundle.outputFiles.find(x=>x.path.endsWith(".js"))?.contents;
const css=bundle.outputFiles.find(x=>x.path.endsWith(".css"))?.contents;
assert.ok(js&&css);
const html=`<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>V144 Gauntlet campaign and war QA</title><style>body{margin:0;background:#0c1a21;color:#e7f6e9;font:14px system-ui}*{box-sizing:border-box}button,input,select{min-height:38px}</style><link rel="stylesheet" href="/gauntlet-v144.css"></head><body><div id="root"></div><script src="/gauntlet-v144.js"></script></body></html>`;
let served=0;
const server=createServer(async(req,res)=>{
  try{
    const p=decodeURIComponent(new URL(req.url??"/","http://127.0.0.1").pathname);
    if(p==="/"){res.writeHead(200,{"content-type":"text/html;charset=utf-8"});res.end(html);return;}
    if(p==="/gauntlet-v144.js"){res.writeHead(200,{"content-type":"application/javascript;charset=utf-8"});res.end(js);return;}
    if(p==="/gauntlet-v144.css"){res.writeHead(200,{"content-type":"text/css;charset=utf-8"});res.end(css);return;}
    if(p==="/favicon.ico"){res.writeHead(204);res.end();return;}
    if((p.startsWith("/game/assets/")||p.startsWith("/sprites/"))&&[".svg",".webp",".png",".jpeg",".jpg"].some(e=>p.endsWith(e))){
      const full=resolve(publicRoot,p.slice(1));
      if(!full.startsWith(publicRoot+sep)){res.writeHead(403);res.end();return;}
      try{const data=await readFile(full),ext=extname(full);
        const mime=ext===".svg"?"image/svg+xml":ext===".webp"?"image/webp":ext===".png"?"image/png":"image/jpeg";
        res.writeHead(200,{"content-type":mime});served++;res.end(data);
      }catch{res.writeHead(404);res.end("optional graphic missing in sparse test");}
      return;
    }
    res.writeHead(404);res.end();
  }catch(e){res.writeHead(404);res.end(String(e));}
});
const passes=[],errors=[];let browser,started=false;
const pass=(check,detail)=>passes.push({check,status:"PASS",detail});
try{
  await mkdir(output,{recursive:true});
  await new Promise((ok,fail)=>{server.once("error",fail);server.listen(0,"127.0.0.1",ok);});
  started=true;const address=server.address();
  assert.ok(address&&typeof address==="object");
  browser=await chromium.launch({...(process.env.AUDIT_CHROME_EXECUTABLE
    ? {executablePath:process.env.AUDIT_CHROME_EXECUTABLE}
    : {channel:process.env.AUDIT_CHROME_CHANNEL||"chrome"}),headless:true});
  const ctx=await browser.newContext({viewport:{width:1366,height:900},locale:"fr-FR"});
  const page=await ctx.newPage();page.setDefaultTimeout(25000);
  page.on("pageerror",e=>errors.push(e.message));
  const url=`http://127.0.0.1:${address.port}/`;
  await page.goto(url,{waitUntil:"domcontentloaded"});
  const state=page.locator('[data-testid="v144-fixture-state"]');
  await state.waitFor({timeout:40000});
  const study=await state.getAttribute("data-study-id");
  const other=await state.getAttribute("data-other-id");
  assert.ok(study&&other&&study!==other);
  const panel=page.locator('[data-clan-war-v85="free-profile"]');
  await panel.waitFor({timeout:40000});
  const atlas=page.locator('[data-testid="clan-war-shared-atlas-v131"]');
  assert.equal(await atlas.count(),1);
  assert.equal(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)||"null")?.gauntletV134?.claimedStudies?.length,SAVE_KEY),0);
  const initialWar=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)||"null")?.turn??1,WAR_KEY);
  pass("Real panel and V13 seeded test campaign mounted",{
    study,other,initialWar,simulation:"production",source:"seeded QA trophy"});
  const projection=page.getByRole("dialog",{name:"Projection du commandement",exact:true});
  async function openProjection(){
    await panel.locator('[data-command-open="settings"]').click();
    await projection.waitFor({state:"visible"});
  }
  await openProjection();
  const locker=projection.locator('[data-testid="gauntlet-locker-v132"]');
  await locker.locator("summary").click();
  const search=locker.getByRole("searchbox",{name:"Rechercher un modèle"});
  await search.fill(other);
  const locked=locker.locator(`[data-gauntlet-model="${other}"]`);
  await locked.waitFor({state:"visible"});
  assert.equal(await locked.getAttribute("data-unlocked"),"false");
  assert.equal(await locked.getByRole("button",{name:/verrouillé/}).isDisabled(),true);
  pass("Unclaimed other study cannot be equipped",other);
  await search.fill(study);
  const card=locker.locator(`[data-gauntlet-model="${study}"]`);
  await card.waitFor({state:"visible"});
  assert.equal(await card.getAttribute("data-unlocked"),"false");
  await card.getByRole("button",{name:"Fiche"}).click();
  const award=locker.getByRole("button",{name:"Valider l'étude et débloquer"});
  await award.waitFor({state:"visible"});
  assert.equal(await award.isEnabled(),true);
  await page.screenshot({path:resolve(output,"01-unclaimed-study-ready.png"),fullPage:false});
  await award.click();
  await page.waitForFunction(({key,id})=>{
    try{return JSON.parse(localStorage.getItem(key)||"{}").gauntletV134?.claimedStudies?.includes(id)===true;}catch{return false;}
  },{key:SAVE_KEY,id:study},{timeout:30000});
  assert.equal(await card.getAttribute("data-unlocked"),"true");
  assert.equal(await state.getAttribute("data-claims"),"1");
  assert.equal(await state.getAttribute("data-writes"),"1");
  pass("Real claimed study records one durable V13 archive write",study);
  const equip=card.getByRole("button",{name:/Équiper/});
  await equip.click();
  await page.waitForFunction(({key,id})=>{
    try{return JSON.parse(localStorage.getItem(key)||"{}").gauntletV134?.equippedId===id;}catch{return false;}
  },{key:SAVE_KEY,id:study},{timeout:30000});
  assert.equal(await state.getAttribute("data-gauntlet-save"),study);
  assert.equal(await state.getAttribute("data-writes"),"2");
  assert.equal(await panel.locator('[data-testid="clan-war-gauntlet-v131"]').getAttribute("data-gauntlet-model"),study);
  assert.equal(await atlas.count(),1);
  assert.equal(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)||"null")?.turn??1,WAR_KEY),initialWar);
  await page.keyboard.press("Escape");
  await projection.waitFor({state:"hidden"});
  await page.screenshot({path:resolve(output,"02-study-equipped-shared-atlas.png"),fullPage:false});
  pass("Challenge gauntlet equips in real holographic war panel without war mutations",{model:study,warTurn:initialWar});
  await openProjection();
  await search.fill(other);
  const stillLocked=locker.locator(`[data-gauntlet-model="${other}"]`);
  await stillLocked.waitFor({state:"visible"});
  assert.equal(await stillLocked.getAttribute("data-unlocked"),"false");
  await search.fill(study);
  await card.getByRole("button",{name:"Fiche"}).click();
  assert.equal(await locker.getByRole("button",{name:"Dossier déjà validé"}).isDisabled(),true);
  pass("One-time claim and independent unopened study remain protected",{claimed:study,locked:other});
  await page.reload({waitUntil:"domcontentloaded"});
  await state.waitFor();
  await panel.waitFor();
  await page.waitForFunction(id=>document.querySelector('[data-testid="clan-war-gauntlet-v131"]')?.getAttribute("data-gauntlet-model")===id,study);
  assert.equal(await state.getAttribute("data-claims"),"1");
  assert.equal(await state.getAttribute("data-gauntlet-save"),study);
  assert.equal(await atlas.count(),1);
  assert.equal(await page.evaluate(k=>JSON.parse(localStorage.getItem(k)||"null")?.turn??1,WAR_KEY),initialWar);
  await page.screenshot({path:resolve(output,"03-reloaded-campaign-preserves-study.png"),fullPage:false});
  pass("After reload, archive identity and clan war turn both survive",{study,warTurn:initialWar});
  // Another tab manipulates ONLY its non-authoritative preference, not the
  // official campaign. Such an attempt cannot grant a second study.
  const second=await ctx.newPage();
  await second.goto(url,{waitUntil:"domcontentloaded"});
  await second.locator('[data-testid="v144-fixture-state"]').waitFor();
  const owner=await state.getAttribute("data-qa-owner");
  assert.ok(owner);
  const preferenceKey="yautja.clan-war.gauntlet.equip.v1."+encodeURIComponent(owner).slice(0,256);
  await second.evaluate(({k,h,id})=>localStorage.setItem(k,JSON.stringify({schema:1,hunter:h,equipped:id})),
    {k:preferenceKey,h:owner,id:other});
  await page.waitForTimeout(250);
  assert.equal(await panel.locator('[data-testid="clan-war-gauntlet-v131"]').getAttribute("data-gauntlet-model"),study);
  assert.equal(await state.getAttribute("data-claims"),"1");
  assert.equal(await page.evaluate(k=>JSON.parse(localStorage.getItem(k)||"null")?.gauntletV134?.equippedId,SAVE_KEY),study);
  pass("Second tab local preference cannot fabricate an unearned challenge",{
    attempt:other,authoritative:study});
  const result={
    schema:144,
    scope:"Production ClanWarPanelV85 + V13 SaveGame writer with artificially seeded trophy QA facts; not complete GameClient navigation or actual earned player rewards",
    studyClaimed:study,unearnedStudy:other,warTurnPreserved:initialWar,
    warAtlasCopies:1,passes,passCount:passes.length,
    servedStaticAssets:served,errors,
    liveWarGameRulesModified:false,certifiedFilmOneToOne:0,
  };
  await writeFile(resolve(output,"real-campaign-gauntlet-evidence.json"),JSON.stringify(result,null,2)+"\n");
  assert.equal(passes.length,7);
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify(result,null,2));
  await second.close();await ctx.close();
}finally{
  await browser?.close();
  if(started)await new Promise(ok=>server.close(ok));
}
