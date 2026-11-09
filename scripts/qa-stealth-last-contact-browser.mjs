// A played PR55 test archive, created from Git-verified source, is NOT a user's archive.
import assert from "node:assert/strict";
import {execFileSync} from "node:child_process";
import {createHash} from "node:crypto";
import path from "node:path";
import {build} from "esbuild";
import {createServer} from "vite";
import {chromium} from "playwright-core";

const sha="fa0322800d5c51e16a4dd56ef6d0fc80d8020394";
const lines=execFileSync("git",["ls-tree","-r",sha,"--","app/game"],{encoding:"utf8",maxBuffer:20_000_000});
const blobs=new Map(lines.trim().split("\n").map(line=>{
 const m=line.match(/^\d+ blob ([0-9a-f]{40})\t(.*)$/);return m?[m[2],m[1]]:null;
}).filter(Boolean));
function source(file){
 let bytes;
 try{bytes=execFileSync("git",["show",`${sha}:${file}`],{env:{...process.env,GIT_NO_LAZY_FETCH:"1"},stdio:["ignore","pipe","ignore"],maxBuffer:20_000_000});}
 catch{bytes=execFileSync("curl",["--fail","--silent","--show-error","--location","--max-time","30",`https://raw.githubusercontent.com/darknigthmare/yautja-la-longue-chasse/${sha}/${file}`],{maxBuffer:20_000_000});}
 assert.equal(createHash("sha1").update(`blob ${bytes.length}\0`).update(bytes).digest("hex"),blobs.get(file));
 return bytes;
}
const bundle=await build({stdin:{contents:"import * as api from 'git:app/game/systems/clanWarOperationsV115.ts'; import * as bible from 'git:app/game/systems/clanWarBibleV6.ts'; export {api,bible};"},
 bundle:true,write:false,format:"esm",platform:"node",logLevel:"silent",plugins:[{name:"pr55",setup(b){
 b.onResolve({filter:/^git:/},a=>({path:a.path.slice(4),namespace:"pr55"}));
 b.onResolve({filter:/^\.{1,2}\//,namespace:"pr55"},a=>{
  const name=path.posix.normalize(path.posix.join(path.posix.dirname(a.importer),a.path));
  const file=[name,`${name}.ts`,`${name}.tsx`,`${name}.json`,`${name}/index.ts`].find(p=>blobs.has(p));
  if(!file)throw new Error(`Missing PR55 source ${name}`);return {path:file,namespace:"pr55"};
 });
 b.onLoad({filter:/.*/,namespace:"pr55"},a=>({contents:source(a.path),loader:a.path.endsWith(".json")?"json":a.path.endsWith(".tsx")?"tsx":"ts"}));
 }}]});
const old=await import("data:text/javascript;base64,"+Buffer.from(bundle.outputFiles[0].contents).toString("base64"));
const {api,bible}=old,rules=bible.DEFAULT_WAR_RULES_V6,base=api.createWarOperationsV115(rules),team=base.teams[0].id;
const site=rules.territories.find(t=>t.id!==base.baseId&&!api.warMissionEligibleV115(base,rules,t.id,[team]));
const launch=api.beginWarOperationV115(base,"stealth",site.id,[team],rules,1000);
assert.equal(launch.accepted,true,launch.message);
const queue=[launch.state],seen=new Set();let found;
for(let i=0;i<queue.length&&i<12000&&!found;i++){
 const s=queue[i].active?.stealth;if(!s)continue;
 const key=JSON.stringify([s.x,s.y,s.guardX,s.guardY,s.guardDirection,s.alarm,s.energy,s.cloaked]);
 if(seen.has(key))continue;seen.add(key);if(queue[i].active.tick>=16)continue;
 for(const action of ["up","down","left","right","wait"]){
  const next=api.commandStealthV115(queue[i],action,rules);
  if(next.accepted&&next.state.active?.stealth?.guardInvestigation){found=next.state;break;}
  if(next.accepted&&next.state.active?.mode==="stealth")queue.push(next.state);
 }
}
assert.ok(found,`No playable PR55 observed contact in ${seen.size} states`);
const raw=JSON.stringify(found),key="yautja.clan-war.v115.operations.fenced.v2";
assert.ok(api.readWarOperationsV115(raw,rules));
const server=await createServer({configFile:false,publicDir:false,define:{"process.env":"{}"},esbuild:{jsx:"automatic"},server:{host:"127.0.0.1",port:0},appType:"spa"});
let browser;
try{
 await server.listen();browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE_PATH??"/usr/bin/chromium",headless:true,args:["--no-sandbox","--disable-dev-shm-usage"]});
 const context=await browser.newContext(),errors=[];
 await context.addInitScript(({key,raw})=>{if(localStorage.getItem(key)===null)localStorage.setItem(key,raw);},{key,raw});
 const page=await context.newPage();page.on("pageerror",e=>errors.push(e.message));
 await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/tests/browser/stealth-reconciliation.html`);
 await page.getByText("Rejoindre le relais",{exact:false}).waitFor();
 assert.equal(await page.evaluate(key=>localStorage.getItem(key),key),raw);
 await page.getByText("Cette archive ne précise pas",{exact:false}).waitFor();
 await page.getByLabel("Règle de renfort :").selectOption("manual");
 const selected=JSON.parse(await page.evaluate(key=>localStorage.getItem(key),key));
 assert.deepEqual(selected.active.stealth.guardInvestigation,found.active.stealth.guardInvestigation);
 await page.getByRole("button",{name:"Camouflage optique",exact:true}).click();
 // The PR71 Web Lock commits this action asynchronously. A click does not
 // imply localStorage has been durably updated. Poll the REAL validated V115
 // archive until the first memory tick is persisted; never inject test state.
 await page.waitForFunction(({key,previousClock,expected})=>{
   const raw=localStorage.getItem(key);
   if(!raw)return false;
   try{
     const current=JSON.parse(raw);
     return current.clock===previousClock+1 &&
       current.active?.stealth?.guardInvestigation?.turns===expected;
   }catch{return false;}
 },{key,previousClock:found.clock,expected:1},{timeout:30000});
 const updated=JSON.parse(await page.evaluate(key=>localStorage.getItem(key),key));
 assert.equal(updated.clock,found.clock+1);
 assert.deepEqual(updated.active.stealth.guardInvestigation,{...found.active.stealth.guardInvestigation,turns:1});
 await page.reload();await page.getByText("Rejoindre le relais",{exact:false}).waitFor();
 assert.deepEqual(JSON.parse(await page.evaluate(key=>localStorage.getItem(key),key)).active.stealth.guardInvestigation,updated.active.stealth.guardInvestigation);
 assert.deepEqual(errors,[]);await context.close();
 console.log(JSON.stringify({sourceCommit:sha,source:"runtime-generated PR55 test archive, not historical player data",states:seen.size,contactTick:found.active.tick,chromium:browser.version(),checks:"choice preserves original investigation; cloak decrements memory; reload"}));
}finally{if(browser)await browser.close();await server.close();}
