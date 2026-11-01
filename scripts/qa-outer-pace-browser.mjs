import assert from "node:assert/strict";
import {build} from "esbuild";
import {createServer} from "vite";
import {chromium} from "playwright-core";
const built=await build({stdin:{contents:[
 "export * from './app/game/systems/clanWarOperationsV115';",
 "export * from './app/game/systems/clanWarBibleV6';",
].join("\n"),resolveDir:process.cwd()},bundle:true,write:false,platform:"node",format:"esm",target:"es2022"});
const api=await import("data:text/javascript;base64,"+Buffer.from(built.outputFiles[0].text).toString("base64"));
const rules=api.DEFAULT_WAR_RULES_V6,base=api.createWarOperationsV115(rules),team=base.teams[0];
const site=rules.territories.find(t=>t.id!==base.baseId&&!api.warMissionEligibleV115(base,rules,t.id,[team.id]));
assert.ok(site);
const started=api.beginWarOperationV115(base,"outer",site.id,[team.id],rules,Date.now());
assert.equal(started.accepted,true,started.message);
const storage="yautja.clan-war.v115.operations.free.v1",raw=JSON.stringify(started.state);
const server=await createServer({configFile:false,publicDir:false,define:{"process.env":"{}"},
 esbuild:{jsx:"automatic"},server:{host:"127.0.0.1",port:0},appType:"spa"});
let browser;
try{
 await server.listen();const address=server.httpServer.address();
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE_PATH??"/usr/bin/chromium",
  headless:true,args:["--no-sandbox","--disable-dev-shm-usage"]});
 const context=await browser.newContext();
 await context.addInitScript(({storage,raw})=>{
  if(localStorage.getItem(storage)===null)localStorage.setItem(storage,raw);
  if(localStorage.getItem("yautja-long-hunt.save")===null)localStorage.setItem("yautja-long-hunt.save","campaign-sentinel");
 },{storage,raw});
 const page=await context.newPage(),errors=[];
 page.on("pageerror",error=>errors.push(error.message));
 await page.goto(`http://127.0.0.1:${address.port}/tests/browser/outer-pace.html`);
 const button=page.getByRole("button",{name:/^Marche forcée/});
 await button.waitFor();
 // A real second tab holds the common V115 lock while the player orders the
 // pace. Refusal must preserve every byte and leave the order retryable.
 const other=await context.newPage();
 await other.goto(`http://127.0.0.1:${address.port}/tests/browser/outer-pace.html`);
 await other.getByRole("button",{name:/^Marche forcée/}).waitFor();
 await other.evaluate(()=>{window.qaOuterLockHeld=false;void navigator.locks.request(
  "yautja.clan-war.v115.operations.free.v1.write",()=>{window.qaOuterLockHeld=true;
   return new Promise(resolve=>{window.qaReleaseOuterLock=resolve;});});});
 await other.waitForFunction(()=>window.qaOuterLockHeld===true);
 await button.click();
 await page.getByText("Une autre écriture V115 est en cours ; réessayez.").waitFor();
 assert.equal(await page.evaluate(key=>localStorage.getItem(key),storage),raw,
  "a held lock must not spend RAV or mutate a paced order");
 await other.evaluate(()=>window.qaReleaseOuterLock());
 await other.waitForFunction(async()=>!(await navigator.locks.query()).held.some(
  lock=>lock.name==="yautja.clan-war.v115.operations.free.v1.write"));
 await button.click();
 await page.waitForFunction(key=>{const s=localStorage.getItem(key);return s&&JSON.parse(s).outer[0]?.forcedPace;},storage);
 const saved=JSON.parse(await page.evaluate(key=>localStorage.getItem(key),storage));
 assert.equal(saved.rav,started.state.rav-3);
 assert.equal(saved.outer[0].dueAt,started.state.outer[0].dueAt-8000);
 assert.equal(saved.outer[0].forcedPace.paidRav,3);
 assert.equal(saved.reports.length,0);
 // Stale second tab must not charge the same march again.
 await other.bringToFront();
 await other.getByText(/Front V115 modifié dans un autre onglet/).waitFor();
 const staleButton=other.getByRole("button",{name:/^Marche forcée/});
 assert.equal(await staleButton.isDisabled(),true);
 assert.equal(JSON.parse(await page.evaluate(key=>localStorage.getItem(key),storage)).rav,started.state.rav-3);
 await page.reload();await page.getByText("Marche forcée : 3 RAV engagés",{exact:false}).waitFor();
 assert.equal(await button.count(),0);
 assert.equal(await page.evaluate(()=>localStorage.getItem("yautja-long-hunt.save")),"campaign-sentinel");
 await page.getByRole("button",{name:"Rappeler l'équipe"}).click();
 await page.waitForFunction(key=>{const s=localStorage.getItem(key);return s&&JSON.parse(s).outer[0]?.recall;},storage);
 const recalled=JSON.parse(await page.evaluate(key=>localStorage.getItem(key),storage));
 assert.ok(recalled.outer[0].recall);
 assert.equal(recalled.outer[0].forcedPace.paidRav,3);
 assert.equal(recalled.reports.length,0);
 assert.deepEqual(errors,[]);
 console.log(JSON.stringify({result:"passed",chromium:browser.version(),scope:"Vite isolated component fixture",checks:["held-lock refusal and retry","single charge despite stale second tab","paid pace","no instant report","reload","recall","campaign sentinel","no page errors"]}));
 await context.close();
}finally{if(browser)await browser.close();await server.close();}
