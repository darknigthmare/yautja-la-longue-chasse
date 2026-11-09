import assert from "node:assert/strict";
import {build} from "esbuild";
import {createServer} from "vite";
import {chromium} from "playwright-core";
const built=await build({stdin:{contents:[
 "export * from './app/game/systems/clanWarOperationsV115';",
 "export * from './app/game/systems/clanWarParallelModesV138';",
 "export * from './app/game/systems/clanWarBibleV6';",
].join("\n"),resolveDir:process.cwd()},bundle:true,write:false,platform:"node",format:"esm",target:"es2022"});
const api=await import("data:text/javascript;base64,"+Buffer.from(built.outputFiles[0].text).toString("base64"));
const rules=api.DEFAULT_WAR_RULES_V6,base=api.createWarOperationsV115(rules),team=base.teams[0];
const site=rules.territories.find(t=>t.id!==base.baseId&&!api.warMissionEligibleV115(base,rules,t.id,[team.id]));
assert.ok(site);
const started=api.beginWarOperationV115(base,"outer",site.id,[team.id],rules,Date.now()-1000);
assert.equal(started.accepted,true,started.message);
const storage="yautja.clan-war.v115.operations.fenced.v2",raw=JSON.stringify(started.state);
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
 await page.goto(`http://127.0.0.1:${address.port}/tests/browser/outer-inspection.html`);
 const button=page.getByRole("button",{name:/^Inspecter le passage actuel/});
 await button.waitFor();await button.click();
 await page.waitForFunction(key=>Boolean(JSON.parse(localStorage.getItem(key)||"{}").outer?.[0]?.passageCheck),storage);
 const saved=JSON.parse(await page.evaluate(key=>localStorage.getItem(key),storage));
 assert.equal(saved.rav,started.state.rav-1);
 assert.equal(saved.outer[0].passageCheck.paidRav,1);
 assert.equal(saved.outer[0].passageCheck.passageId,started.state.outer[0].routeIds[0]);
 assert.equal(saved.reports.length,0);
 await page.reload();await page.getByText("1 RAV engagé.",{exact:false}).first().waitFor();
 assert.equal(await button.count(),0);
 assert.equal(await page.evaluate(()=>localStorage.getItem("yautja-long-hunt.save")),"campaign-sentinel");
 await page.getByRole("button",{name:"Rappeler l'équipe"}).click();
 await page.waitForFunction(key=>Boolean(JSON.parse(localStorage.getItem(key)||"{}").outer?.[0]?.recall),storage);
 const recalled=JSON.parse(await page.evaluate(key=>localStorage.getItem(key),storage));
 assert.ok(recalled.outer[0].recall);
 assert.equal(recalled.outer[0].passageCheck.paidRav,1);
 await page.reload();await page.getByText("Retour au clan",{exact:false}).waitFor();
 assert.deepEqual(errors,[]);
 await context.close();
 // Freeze the app clock so the real bulletin and late-recall path can be
 // exercised without depending on machine speed or prematurely settling.
 const fixed=1700000040000,old=api.beginWarOperationV115(base,"outer",site.id,[team.id],rules,fixed-36000);
 assert.equal(old.accepted,true,old.message);
 const mission=old.state.outer[0],sent=api.requestWarOuterSignalV138(old.state,mission.id,mission.startedAt+20800,rules);
 assert.equal(sent.accepted,true,sent.message);
 const context2=await browser.newContext();
 await context2.addInitScript(({storage,raw,fixed})=>{
  Date.now=()=>fixed;
  if(localStorage.getItem(storage)===null)localStorage.setItem(storage,raw);
 },{storage,raw:JSON.stringify(sent.state),fixed});
 const page2=await context2.newPage(),errors2=[];
 page2.on("pageerror",error=>errors2.push(error.message));
 await page2.goto(`http://127.0.0.1:${address.port}/tests/browser/outer-inspection.html`);
 await page2.getByText("Transmission V138",{exact:false}).waitFor();
 await page2.getByRole("button",{name:"Rappeler l'équipe"}).click();
 await page2.waitForFunction(key=>Boolean(JSON.parse(localStorage.getItem(key)||"{}").outer?.[0]?.recall),storage);
 const recall2=await page2.evaluate(key=>localStorage.getItem(key),storage);
 assert.ok(api.readWarOperationsV115(recall2,rules));
 await page2.reload();
 await page2.getByText("Transmission V138",{exact:false}).waitFor();
 await page2.getByText("Retour au clan",{exact:false}).waitFor();
 assert.deepEqual(errors2,[]);
 await context2.close();
 console.log(JSON.stringify({result:"passed",chromium:browser.version(),scope:"Vite isolated component fixture",checks:["one paid inspection","no instant report","reload","recall and reload","signal then late recall and reload","campaign sentinel","no page errors"]}));
}finally{if(browser)await browser.close();await server.close();}
