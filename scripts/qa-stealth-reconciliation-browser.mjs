// Builds the exact PR #57 source, plays its public commands, then exercises the
// current V115 component in Chromium. Generated saves are test saves, not user archives.
import assert from "node:assert/strict";
import {execFileSync} from "node:child_process";
import {createHash} from "node:crypto";
import path from "node:path";
import {build} from "esbuild";
import {createServer} from "vite";
import {chromium} from "playwright-core";

const sha="f25cd7a33e04f789e7c6df231ccad9116a50b38c";
const listing=execFileSync("git",["ls-tree","-r",sha,"--","app/game"],{encoding:"utf8",maxBuffer:20_000_000});
const blobs=new Map(listing.trim().split("\n").map(line=>{
 const m=line.match(/^\d+ blob ([0-9a-f]{40})\t(.*)$/);return m?[m[2],m[1]]:null;
}).filter(Boolean));
const env={...process.env,GIT_NO_LAZY_FETCH:"1"};
function blob(file){
 let bytes;
 try {bytes=execFileSync("git",["show",`${sha}:${file}`],{env,stdio:["ignore","pipe","ignore"],maxBuffer:20_000_000});}
 catch {bytes=execFileSync("curl",["--fail","--silent","--show-error","--location","--max-time","30",`https://raw.githubusercontent.com/darknigthmare/yautja-la-longue-chasse/${sha}/${file}`],{maxBuffer:20_000_000});}
 const hash=createHash("sha1").update(`blob ${bytes.length}\0`).update(bytes).digest("hex");
 assert.equal(hash,blobs.get(file),`PR #57 source blob mismatch: ${file}`);
 return bytes;
}
const compiled=await build({stdin:{contents:"import * as api from 'git:app/game/systems/clanWarOperationsV115.ts'; import * as bible from 'git:app/game/systems/clanWarBibleV6.ts'; export {api,bible};"},
 bundle:true,write:false,format:"esm",platform:"node",logLevel:"silent",plugins:[{name:"pr57-git",setup(b){
 b.onResolve({filter:/^git:/},args=>({path:args.path.slice(4),namespace:"pr57"}));
 b.onResolve({filter:/^\.{1,2}\//,namespace:"pr57"},args=>{
  const name=path.posix.normalize(path.posix.join(path.posix.dirname(args.importer),args.path));
  const found=[name,`${name}.ts`,`${name}.tsx`,`${name}.json`,`${name}/index.ts`].find(p=>blobs.has(p));
  if(!found)throw new Error(`Missing PR #57 source: ${name}`);
  return {path:found,namespace:"pr57"};
 });
 b.onLoad({filter:/.*/,namespace:"pr57"},args=>({contents:blob(args.path),loader:args.path.endsWith(".json")?"json":args.path.endsWith(".tsx")?"tsx":"ts"}));
 }}]});
const old=await import("data:text/javascript;base64,"+Buffer.from(compiled.outputFiles[0].contents).toString("base64"));
const api=old.api,rules=old.bible.DEFAULT_WAR_RULES_V6;
const base=api.createWarOperationsV115(rules),team=base.teams[0].id;
const site=rules.territories.find(t=>t.id!==base.baseId&&!api.warMissionEligibleV115(base,rules,t.id,[team]));
assert.ok(site);
const started=api.beginWarOperationV115(base,"stealth",site.id,[team],rules,1000);
assert.equal(started.accepted,true,started.message);
const before=started.state;
assert.equal(api.readWarOperationsV115(JSON.stringify(before),rules)?.active?.mode,"stealth");
// Exhaustively try ordinary player actions; no direct mutation of actor/guard state.
const queue=[before],seen=new Set();let found,prior,triggerAction;
for(let i=0;i<queue.length&&i<12000&&!found;i++){
 const s=queue[i].active?.stealth;if(!s)continue;
 const key=JSON.stringify([s.x,s.y,s.guardX,s.guardY,s.guardDirection,s.alarm,s.energy,s.cloaked,s.decoyUsed,s.decoyTurns]);
 if(seen.has(key))continue;seen.add(key);
 if(s.secondGuard){found=queue[i];break;}
 if(queue[i].active.tick>=16)continue;
 for(const action of ["up","down","left","right","wait","decoy"]){
  const next=api.commandStealthV115(queue[i],action,rules);
  if(next.accepted&&next.state.active?.mode==="stealth"){
   if(next.state.active.stealth.secondGuard){prior=queue[i];found=next.state;triggerAction=action;break;}
   queue.push(next.state);
  }
 }
}
assert.ok(found,`No reachable PR #57 second guard after exploring ${seen.size} states`);
const genuineRuntimeSave=JSON.stringify(found);
assert.ok(api.readWarOperationsV115(genuineRuntimeSave,rules));
assert.ok(prior);
const legacyRaw=JSON.stringify(prior),storage="yautja.clan-war.v115.operations.fenced.v2";
const server=await createServer({configFile:false,publicDir:false,define:{"process.env":"{}"},esbuild:{jsx:"automatic"},server:{host:"127.0.0.1",port:0,strictPort:false},appType:"spa"});
let browser;
try{
 await server.listen();
 const address=server.httpServer.address();
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE_PATH??"/usr/bin/chromium",headless:true,args:["--no-sandbox","--disable-dev-shm-usage"]});
 const origin=`http://127.0.0.1:${address.port}`;
 async function pageWith(raw){
  const context=await browser.newContext();
  await context.addInitScript(({storage,raw})=>{if(localStorage.getItem(storage)===null)localStorage.setItem(storage,raw);},{storage,raw});
  const page=await context.newPage(),errors=[];
  page.on("pageerror",err=>errors.push(err.message));
  await page.goto(origin+"/tests/browser/stealth-reconciliation.html");
  await page.getByText("Rejoindre le relais",{exact:false}).waitFor();
  return {context,page,errors};
 }
 for(const mode of ["manual","decoy"]){
 const first=await pageWith(legacyRaw);
 assert.equal(await first.page.evaluate(key=>localStorage.getItem(key),storage),legacyRaw,"load must not write");
 await first.page.getByRole("alert").getByText("Cette archive ne précise pas",{exact:false}).waitFor();
 assert.equal(await first.page.getByRole("button",{name:"Attendre / récupérer énergie"}).isDisabled(),true);
 if(mode==="manual"){
  // A cooperating tab holding the common write lock must not let a legacy
  // migration overwrite bytes or silently make the unresolved choice appear saved.
  const other=await first.context.newPage();
  await other.goto(origin+"/tests/browser/stealth-reconciliation.html");
  await other.getByText("Rejoindre le relais",{exact:false}).waitFor();
  await other.evaluate(()=>{window.qaStealthLockHeld=false;void navigator.locks.request(
   "yautja.clan-war.v115.operations.fenced.v2.write",()=>{window.qaStealthLockHeld=true;
    return new Promise(resolve=>{window.qaReleaseStealthLock=resolve;});});});
  await other.waitForFunction(()=>window.qaStealthLockHeld===true);
  await first.page.getByLabel("Règle de renfort :").selectOption(mode);
  await first.page.getByText("Une autre écriture V115 est en cours ; réessayez.").waitFor();
  assert.equal(await first.page.evaluate(key=>localStorage.getItem(key),storage),legacyRaw);
  assert.equal(await first.page.getByLabel("Règle de renfort :").inputValue(),"");
  await other.evaluate(()=>window.qaReleaseStealthLock());
  await other.waitForFunction(async()=>!(await navigator.locks.query()).held.some(
   lock=>lock.name==="yautja.clan-war.v115.operations.fenced.v2.write"));
  await other.close();
 }
 await first.page.getByLabel("Règle de renfort :").selectOption(mode);
 await first.page.waitForFunction(({storage,mode})=>{
  const raw=localStorage.getItem(storage);
  return raw&&JSON.parse(raw).active?.stealth?.reinforcementMode===mode;
 },{storage,mode});
 const chosen=JSON.parse(await first.page.evaluate(key=>localStorage.getItem(key),storage));
 assert.equal(chosen.active.stealth.reinforcementMode,mode);
 const rest={...chosen.active.stealth};delete rest.reinforcementMode;
 assert.deepEqual(rest,JSON.parse(legacyRaw).active.stealth,"choice must preserve mission state");
 assert.equal(chosen.clock,prior.clock);
 assert.equal(await first.page.getByRole("button",{name:"Attendre / récupérer énergie"}).isEnabled(),true);
 await first.page.reload();
 await first.page.getByText("Rejoindre le relais",{exact:false}).waitFor();
 assert.equal(await first.page.getByLabel("Règle de renfort :").inputValue(),mode);
 assert.deepEqual(first.errors,[]);await first.context.close();
 }
 const second=await pageWith(genuineRuntimeSave);
 assert.equal(await second.page.evaluate(key=>localStorage.getItem(key),storage),genuineRuntimeSave,"legacy bytes must survive initial load");
 await second.page.getByText("Renfort déjà présent",{exact:false}).waitFor();
 assert.equal(await second.page.getByRole("button",{name:"Attendre / récupérer énergie"}).isEnabled(),true);
 await second.page.getByRole("button",{name:"Attendre / récupérer énergie"}).click();
 await second.page.waitForFunction(storage=>{
  const raw=localStorage.getItem(storage);return raw&&JSON.parse(raw).active?.stealth?.supportGuard;
 },storage);
 const converted=JSON.parse(await second.page.evaluate(key=>localStorage.getItem(key),storage));
 assert.ok(converted.active?.stealth?.supportGuard,"real action must persist migrated guard");
 const previous=found.active.stealth.secondGuard,migrated=converted.active.stealth.supportGuard;
 assert.ok(Math.abs(previous.guardX-migrated.x)+Math.abs(previous.guardY-migrated.y)<=1,
  "migrated guard may move by at most one tile on its first real action");
 assert.equal("secondGuard" in converted.active.stealth,false);
 await second.page.reload();
 await second.page.getByText("Renfort déjà présent",{exact:false}).waitFor();
 assert.deepEqual(second.errors,[]);await second.context.close();
 if(process.env.QA_GAME_CLIENT==="1"){
  const context=await browser.newContext();
  await context.addInitScript(({storage,raw})=>{if(localStorage.getItem(storage)===null)localStorage.setItem(storage,raw);},{storage,raw:legacyRaw});
  const page=await context.newPage(),errors=[];
  page.on("pageerror",err=>errors.push(err.message));
  await page.goto(origin+"/tests/browser/stealth-game-client.html",{timeout:90000});
  async function openFromMenu(){
   await page.getByRole("button",{name:"Guerres des clans",exact:false}).first().click({timeout:90000});
   await page.getByRole("button",{name:"Accéder malgré les spoilers"}).click();
   await page.getByRole("button",{name:"Bible V6 · règles actuelles"}).click({timeout:90000});
   await page.getByRole("button",{name:"Opérations jouables · 4 modes"}).click();
   await page.getByText("Rejoindre le relais",{exact:false}).waitFor();
  }
  await openFromMenu();
  assert.equal(await page.evaluate(key=>localStorage.getItem(key),storage),legacyRaw);
  await page.getByText("Cette archive ne précise pas",{exact:false}).waitFor();
  await page.getByLabel("Règle de renfort :").selectOption("decoy");
  await page.waitForFunction(storage=>{
   const raw=localStorage.getItem(storage);return raw&&JSON.parse(raw).active?.stealth?.reinforcementMode==="decoy";
  },storage);
  const state=JSON.parse(await page.evaluate(key=>localStorage.getItem(key),storage));
  assert.equal(state.active.stealth.reinforcementMode,"decoy");
  const rest={...state.active.stealth};delete rest.reinforcementMode;
  assert.deepEqual(rest,JSON.parse(legacyRaw).active.stealth);
  await page.reload({timeout:90000});await openFromMenu();
  assert.equal(await page.getByLabel("Règle de renfort :").inputValue(),"decoy");
  const actionLabels={up:"↑ Nord",down:"↓ Sud",left:"← Ouest",right:"→ Est",wait:"Attendre / récupérer énergie",decoy:"Diversion sonore (2 énergie)"};
  await page.getByRole("button",{name:actionLabels[triggerAction],exact:true}).click();
  await page.waitForFunction(storage=>{
   const raw=localStorage.getItem(storage);return raw&&JSON.parse(raw).active?.stealth?.supportGuard;
  },storage);
  const afterAction=JSON.parse(await page.evaluate(key=>localStorage.getItem(key),storage));
  assert.ok(afterAction.active?.stealth?.supportGuard,"GameClient must persist the guard after the triggering action");
  assert.equal(afterAction.active.tick,prior.active.tick+1);
  assert.equal(await page.evaluate(()=>localStorage.getItem("yautja-long-hunt.save")),null,"exercise must not write the campaign");
  assert.deepEqual(errors,[]);await context.close();
 }
 console.log(JSON.stringify({sourceCommit:sha,source:"runtime-generated from unmodified PR57 source; not a historical user archive",exploredStates:seen.size,guardTick:found.active.tick,triggerAction,gameClient:process.env.QA_GAME_CLIENT==="1",chromium:browser.version(),checks:"both ambiguous choices, no load write, state preservation, reload, original runtime guard migration and action"}));
}finally{if(browser)await browser.close();await server.close();}
