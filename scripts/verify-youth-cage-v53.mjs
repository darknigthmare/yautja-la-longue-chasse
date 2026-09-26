import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright-core";
import { createDesktopHomeworldDriver } from "./desktop-youth-patrol-v52.mjs";
const base = process.env.V53_QA_URL || "http://127.0.0.1:4174";
const output = process.env.V53_CAGE_QA_OUTPUT || "outputs/qa-commercial-audit/v53/youth/cage-browser-qa";
const archivePath = process.env.V53_PATROL_ARCHIVE || "outputs/qa-commercial-audit/v52/youth/public-patrol-browser-qa/patrol-return-played-storage.json";
const storage = JSON.parse(await fs.readFile(archivePath,"utf8")), key="yautja-long-hunt.save", original=JSON.parse(storage[key]);
assert.equal(original.youthTraining.checkpoint.phase,"patrol-complete");assert.equal(original.youthTraining.receipts.length,16);
await fs.mkdir(output,{recursive:true});
const checks=[], errors=[],failures=[], phases=new Set(), countdown=new Set();
const browser=await chromium.launch({channel:"chrome",headless:true});
const page=await browser.newPage({viewport:{width:1280,height:720}});page.setDefaultTimeout(45000);
page.on("pageerror",e=>errors.push(e.message));page.on("response",r=>{if(r.status()>=400)failures.push({url:r.url(),status:r.status()});});
const saved=()=>page.evaluate(k=>JSON.parse(localStorage.getItem(k)),key);
const exportStorage=async name=>fs.writeFile(path.join(output,name),JSON.stringify(await page.evaluate(()=>Object.fromEntries(Object.keys(localStorage).filter(k=>k.includes("yautja")).map(k=>[k,localStorage.getItem(k)]))),null,2));
let routeEvidence=[];
try {
 await page.goto(base,{waitUntil:"networkidle",timeout:120000});
 await page.evaluate(entries=>{if(Object.keys(localStorage).some(k=>k.startsWith("yautja")))throw new Error("Isolated fresh QA profile required");for(const[k,v]of Object.entries(entries))localStorage.setItem(k,v);},storage);
 await page.reload({waitUntil:"networkidle"});await page.getByRole("button",{name:/^Continuer/}).click();await page.locator("[data-homeworld-hub]").waitFor();await page.clock.install();
 const city=await createDesktopHomeworldDriver(page);await city.approach("training-service");routeEvidence=city.routeEvidence;
 await page.getByRole("button",{name:"Préparer le premier duel de la Fosse",exact:true}).click();
 const canvas=page.locator("canvas[data-youth-stage]");await canvas.waitFor();await page.clock.runFor(500);
 await page.waitForFunction(()=>document.querySelector("canvas[data-youth-stage]")?.dataset.youthAssets==="true",null,{timeout:120000});
 await canvas.focus();await page.clock.runFor(150);
 const state=()=>canvas.evaluate(n=>({phase:n.dataset.youthPhase,tick:Number(n.dataset.youthTick),phaseTick:Number(n.dataset.youthPhaseTick),x:Number(n.dataset.youthPositions.split(",")[0]),rx:Number(n.dataset.youthPositions.split(",")[1]),y:Number(n.dataset.youthY),vy:Number(n.dataset.youthVy),facing:Number(n.dataset.youthFacing),action:n.dataset.youthPose,rivalAction:n.dataset.youthRivalPose,rivalActionTick:Number(n.dataset.youthRivalActionTick),armed:n.dataset.youthArmed==="true",paused:n.dataset.youthPaused==="true",target:n.dataset.youthTarget===""?null:Number(n.dataset.youthTarget),cage:n.dataset.youthCage?JSON.parse(n.dataset.youthCage):null,health:n.dataset.youthComposure.split(",").map(Number)}));
 const initial=await state();await page.clock.runFor(1000);assert.equal((await state()).tick,initial.tick);assert.equal(initial.phase,"patrol-complete");
 checks.push({name:"real-V52-archive-explicit-cage-choice",archivePath,previousProofs:16,automaticDeparture:false,physicallyVisitedMentor:true});
 await page.locator("[data-youth-cage-departure]").click();await page.clock.runFor(200);assert.equal((await state()).phase,"cage-briefing");
 const bindings=original.settings.controlBindings, keys=new Set();
 const action={left:bindings["pit.p1MoveLeft"][0],right:bindings["pit.p1MoveRight"][0],light:bindings["pit.p1AttackLight"][0],jump:bindings["pit.p1Jump"][0],interact:bindings["pit.p1Resource"][0]};
 const apply=async desired=>{for(const k of keys)if(!desired.has(k)){await page.keyboard.up(k);keys.delete(k);}for(const k of desired)if(!keys.has(k)){await page.keyboard.down(k);keys.add(k);}};
 let previousPhase="",failed=false,reloaded=false,firstAttempt=true,heldBoundary=false,iterations=0;
 for(;iterations<3000;iterations++) {
  const s=await state();phases.add(s.phase);if(s.phase==="cage-complete")break;
  if(previousPhase!==s.phase){await apply(new Set());await page.clock.runFor(100);previousPhase=s.phase;await page.screenshot({path:path.join(output,s.phase+".png"),fullPage:true});}
  if(s.paused||!s.armed){await apply(new Set());await canvas.focus();await page.clock.runFor(100);continue;}
  if(s.phase==="cage-countdown") {
   countdown.add(await page.locator("[data-youth-cage-signal] strong").innerText());
   assert.deepEqual(s.health,[100,100]);
   if(s.phaseTick>165&&!heldBoundary){
    await apply(new Set([action.light]));await page.clock.runFor(600);assert.equal((await state()).phase,"cage-duel");
    const frozen=await state();await page.clock.runFor(500);assert.equal((await state()).tick,frozen.tick);assert.deepEqual((await state()).health,[100,100]);
    await apply(new Set());await page.clock.runFor(100);heldBoundary=true;
    checks.push({name:"native-introduction-3-2-1-and-neutral-fight-gate",countdown:[...countdown],heldAttackCannotStartCombat:true});continue;
   }
  }
  if(s.phase==="cage-duel"&&!reloaded&&s.rivalAction==="jab"&&s.rivalActionTick<20){
   await apply(new Set());await page.keyboard.press("Escape");await page.clock.runFor(100);const paused=await state();
   await page.clock.runFor(2500);assert.equal((await state()).tick,paused.tick);assert.deepEqual((await state()).cage,paused.cage);
   await page.screenshot({path:path.join(output,"cage-duel-paused.png"),fullPage:true});
   await page.getByRole("button",{name:"Enregistrer et revenir au menu",exact:true}).click();await page.clock.runFor(100);
   const durable=(await saved()).youthTraining.checkpoint;assert.equal(durable.tick,paused.tick);assert.deepEqual(durable.cage,paused.cage);
   await exportStorage("cage-duel-played-storage.json");await page.clock.resume();await page.reload({waitUntil:"networkidle"});await page.getByRole("button",{name:/^Continuer/}).click();
   await page.locator('canvas[data-youth-assets="true"]').waitFor({timeout:120000});await canvas.focus();await page.clock.pauseAt(await page.evaluate(()=>Date.now()+1000));await page.clock.runFor(100);
   assert.equal((await state()).phase,"cage-duel");assert.equal((await saved()).youthTraining.receipts.length,17);
   checks.push({name:"duel-pause-save-cold-resume",frozenTick:paused.tick,exactDurableCheckpoint:true,previousProofs:17});reloaded=true;continue;
  }
  if(s.phase==="cage-defeat"){
   await apply(new Set());assert.equal(s.health[0],0);assert.equal((await saved()).youthTraining.receipts.length,17);assert.equal(s.cage.insignia,false);
   await page.screenshot({path:path.join(output,"cage-defeat-readable.png"),fullPage:true});await exportStorage("cage-defeat-played-storage.json");
   await page.locator("[data-youth-cage-retry]").click();await page.clock.runFor(200);assert.equal((await state()).phase,"cage-intro");assert.equal((await state()).cage.attempts,2);
   checks.push({name:"real-passive-defeat-and-fresh-retry",lostProofs:0,attempts:2,freeReward:false});failed=true;firstAttempt=false;continue;
  }
  const current=await state(),desired=new Set();
  if(["cage-briefing","cage-reward","cage-return"].includes(current.phase)){
   const delta=current.target-current.x;if(Math.abs(delta)>18)desired.add(delta<0?action.left:action.right);else if(!keys.has(action.interact))desired.add(action.interact);
  }
  if(current.phase==="cage-duel"&&!firstAttempt){
   const d=current.rx-current.x,facing=d<0?-1:1;
   if(current.action==="idle"&&Math.abs(d)<61&&current.facing===facing){if(!keys.has(action.light))desired.add(action.light);}
   else if(Math.abs(d)>59||current.facing!==facing)desired.add(facing<0?action.left:action.right);
  }
  await apply(desired);await page.clock.runFor(50);
 }
 await apply(new Set());await page.clock.runFor(200);assert(iterations<3000);assert(failed&&reloaded&&heldBoundary);assert.deepEqual([...countdown].sort(),["1","2","3"]);
 const completed=await saved();assert.equal(completed.youthTraining.checkpoint.phase,"cage-complete");assert.equal(completed.youthTraining.receipts.length,20);assert.equal(new Set(completed.youthTraining.receipts.map(r=>r.id)).size,20);assert.equal(completed.youthTraining.checkpoint.cage.insignia,true);assert.equal(completed.youthTraining.checkpoint.cage.attempts,2);
 assert.deepEqual(completed.youthTraining.receipts.slice(0,16),original.youthTraining.receipts);
 for(const k of["inventory","loadout","statistics","prologue"])assert.deepEqual(completed[k],original[k],k);
 assert.equal(completed.profile.honor,original.profile.honor);assert.deepEqual(completed.youthTraining.equipment,original.youthTraining.equipment);
 await exportStorage("cage-return-played-storage.json");await page.screenshot({path:path.join(output,"cage-returned-insignia.png"),fullPage:true});
 checks.push({name:"physical-nonlethal-victory-reward-and-exit",phases:[...phases],newProofs:4,uniqueProofs:20,cosmeticOnly:true,noAdultRankShipEquipment:true});
 await page.locator("[data-youth-cage-return]").click();await page.clock.runFor(200);await page.locator("[data-homeworld-hub]").waitFor();
 await page.clock.resume();await page.reload({waitUntil:"networkidle"});await page.getByRole("button",{name:/^Continuer/}).click();await page.locator('[data-unblooded-objective="cage-returned"]').waitFor();
 assert.equal((await saved()).youthTraining.receipts.length,20);await page.screenshot({path:path.join(output,"cage-homeworld-durable.png"),fullPage:true});
 checks.push({name:"durable-city-return-no-duplicate-insignia",coldReload:true,proofs:20});
 assert.deepEqual(errors,[]);assert.deepEqual(failures,[]);
 await fs.writeFile(path.join(output,"report.json"),JSON.stringify({passed:true,base,checks,routeEvidence,errors,failures,limitation:"Isolated browser, genuine played V52 archive imported only before gameplay. Keyboard inputs and public HUD observations only; no coordinates, health or proofs injected. Original youth adaptation; 16 native opponent poses, not 16 full animation cycles."},null,2));console.log(JSON.stringify({passed:true,checks:checks.length}));
}catch(error){await page.screenshot({path:path.join(output,"failure.png"),fullPage:true}).catch(()=>{});await fs.writeFile(path.join(output,"report.json"),JSON.stringify({passed:false,base,checks,routeEvidence,errors,failures,error:String(error)},null,2));throw error;}finally{await browser.close();}
