import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright-core";
const base = process.env.V53_QA_URL || "http://127.0.0.1:4174", output = process.env.V53_CAGE_TOUCH_QA_OUTPUT || "outputs/qa-commercial-audit/v53/youth/cage-touch-layout-browser-qa";
const archivePath = process.env.V53_CAGE_ARCHIVE || "outputs/qa-commercial-audit/v53/youth/cage-browser-qa/cage-duel-played-storage.json";
const storage = JSON.parse(await fs.readFile(archivePath, "utf8")), key = "yautja-long-hunt.save", original = JSON.parse(storage[key]);
assert.equal(original.youthTraining.checkpoint.phase, "cage-duel"); assert.equal(original.youthTraining.receipts.length, 17);
await fs.mkdir(output, { recursive: true }); const checks = [], errors = [], failures = [];
const browser = await chromium.launch({ channel: "chrome", headless: true }); let current;
try {
for (const viewport of [{ width: 390, height: 844 }, { width: 640, height: 360 }]) {
 const label = `${viewport.width}x${viewport.height}`, context = await browser.newContext({ viewport, hasTouch: true, isMobile: true }), page = await context.newPage(); current = page; page.setDefaultTimeout(45000);
 page.on("pageerror", e => errors.push(e.message)); page.on("response", r => { if (r.status() >= 400) failures.push({ url: r.url(), status: r.status() }); });
 await page.goto(base, { waitUntil: "networkidle" }); await page.evaluate(entries => { if(Object.keys(localStorage).some(k=>k.startsWith("yautja")))throw new Error("Fresh isolated profile required"); for (const [k,v] of Object.entries(entries)) localStorage.setItem(k,v); }, storage);
 await page.reload({ waitUntil: "networkidle" }); await page.getByRole("button", { name: /^Continuer/ }).click();
 const canvas = page.locator('canvas[data-youth-stage][data-youth-assets="true"]'); await canvas.waitFor({ timeout:120000 });
 await page.clock.install(); await page.clock.pauseAt(await page.evaluate(() => Date.now() + 100)); await canvas.focus(); await page.clock.runFor(100);
 const state = () => canvas.evaluate(node => ({ phase: node.dataset.youthPhase, tick: Number(node.dataset.youthTick), x: Number(node.dataset.youthPositions.split(",")[0]), rx:Number(node.dataset.youthPositions.split(",")[1]),action:node.dataset.youthPose,facing:Number(node.dataset.youthFacing), y: Number(node.dataset.youthY), vy: Number(node.dataset.youthVy), armed: node.dataset.youthArmed === "true", paused: node.dataset.youthPaused === "true", target: node.dataset.youthTarget === "" ? null : Number(node.dataset.youthTarget), cage: node.dataset.youthCage ? JSON.parse(node.dataset.youthCage) : null }));
 const saved = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)),key);
 const visibleControl = async locator => { await locator.scrollIntoViewIfNeeded(); const box = await locator.boundingBox(); assert(box && box.x >= 0 && box.y >= 0 && box.x+box.width <= viewport.width+1 && box.y+box.height <= viewport.height+1, `control outside viewport ${label}: ${JSON.stringify(box)}`); assert(box.width>=43 && box.height>=43, "target is at least 44px"); const top = await locator.evaluate(el => { const r=el.getBoundingClientRect(); return el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)); }); assert(top,"control is not occluded"); return box; };
 const cdp = await context.newCDPSession(page);
 const holdTouch = async (locator, ms) => { const b=await visibleControl(locator), point={x:b.x+b.width/2,y:b.y+b.height/2}; await cdp.send("Input.dispatchTouchEvent",{type:"touchStart",touchPoints:[point]}); await page.clock.runFor(ms); await cdp.send("Input.dispatchTouchEvent",{type:"touchEnd",touchPoints:[]}); await page.clock.runFor(34); };
 for(const action of ["blade"])assert.equal(await page.locator(`[data-youth-action="${action}"]`).isDisabled(),true);
 for(const action of ["left","right","jump","light","throw","dodge","interact"])await visibleControl(page.locator(`[data-youth-action="${action}"]`));
 // The genuine checkpoint can resume beside a striking rival. A fresh jump
 // during hitstun is intentionally refused; test input only when acting is legal.
 const waitForActionable = async () => {
  await page.clock.runFor(34); // Prior touchEnd is released for two sampled frames.
  for(let n=0;n<120;n++) {
   const s=await state();assert.equal(s.phase,"cage-duel","the touch precondition must remain a live duel");
   if(s.armed&&!s.paused&&s.action==="idle"&&s.y===430&&s.vy===0)return;
   await page.clock.runFor(17);
  }
  assert.fail("No grounded idle state reached before the fresh touch");
 };
 await waitForActionable();
 const before=await state();await holdTouch(page.locator('[data-youth-action="left"]'),150);const moved=await state();assert(moved.x<before.x-10,JSON.stringify({before,moved}));assert.equal(moved.paused,false);
 await waitForActionable();await holdTouch(page.locator('[data-youth-action="jump"]'),100);assert((await state()).y<430);await page.screenshot({path:path.join(output,label+"-touch-gameplay.png"),fullPage:true});
 checks.push({name:"touch-move-jump-and-controls",viewport,move:moved.x-before.x,noPauseOnTouch:true,bladeControlDisabled:true});
 await page.getByRole("button",{name:"Pause et commandes",exact:true}).tap();await page.clock.runFor(100);
 const dialog=page.getByRole("dialog",{name:"Formation en pause",exact:true});await dialog.waitFor();const paused=await state();await page.clock.runFor(3000);assert.equal((await state()).tick,paused.tick);
 const count=await dialog.locator("button:not(:disabled)").count();for(let n=0;n<count+1;n++){await page.keyboard.press("Tab");assert(await dialog.evaluate(el=>el.contains(document.activeElement)),"keyboard focus trapped in pause");}
 await visibleControl(page.getByRole("button",{name:"Reprendre la formation",exact:true}));await page.screenshot({path:path.join(output,label+"-pause.png"),fullPage:true});
 await page.getByRole("button",{name:"Reprendre la formation",exact:true}).tap();await page.clock.runFor(100);assert(await canvas.evaluate(el=>document.activeElement===el));
 checks.push({name:"pause-focus-and-clock",viewport,clockFrozen:true,keyboardTrap:true,returnFocusCanvas:true});
 for(let n=0;n<40&&(await state()).phase!=="cage-defeat";n++)await page.clock.runFor(500);
 assert.equal((await state()).phase,"cage-defeat");assert.equal((await saved()).youthTraining.receipts.length,17);
 const retry=page.locator("[data-youth-cage-retry]");await visibleControl(retry);await page.screenshot({path:path.join(output,label+"-defeat.png"),fullPage:true});await retry.tap();await page.clock.runFor(200);assert.equal((await state()).phase,"cage-intro");assert.equal((await state()).cage.attempts,2);
 checks.push({name:"real-defeat-and-touch-retry",viewport,previousProofsRetained:17,retryVisible:true});
 const bindings=original.settings.controlBindings,keys=new Set(),actionKey={left:bindings["pit.p1MoveLeft"][0],right:bindings["pit.p1MoveRight"][0],light:bindings["pit.p1AttackLight"][0],jump:bindings["pit.p1Jump"][0],interact:bindings["pit.p1Resource"][0]};
 const applyKeys=async desired=>{for(const k of keys)if(!desired.has(k)){await page.keyboard.up(k);keys.delete(k);}for(const k of desired)if(!keys.has(k)){await page.keyboard.down(k);keys.add(k);}};
 for(let n=0;n<2000&&(await state()).phase!=="cage-complete";n++){
  const s=await state();if(s.paused||!s.armed){await applyKeys(new Set());await canvas.focus();await page.clock.runFor(100);continue;}assert.notEqual(s.phase,"cage-defeat","played retry should survive");
  const desired=new Set();
  if(["cage-reward","cage-return"].includes(s.phase)) {const delta=s.target-s.x;if(Math.abs(delta)>18)desired.add(delta<0?actionKey.left:actionKey.right);else if(!keys.has(actionKey.interact))desired.add(actionKey.interact);}
  if(s.phase==="cage-duel") {const d=s.rx-s.x,facing=d<0?-1:1;if(s.action==="idle"&&Math.abs(d)<61&&s.facing===facing){if(!keys.has(actionKey.light))desired.add(actionKey.light);}else if(Math.abs(d)>59||s.facing!==facing)desired.add(facing<0?actionKey.left:actionKey.right);}
  await applyKeys(desired);await page.clock.runFor(50);
 }
 await applyKeys(new Set());await page.clock.runFor(100);assert.equal((await state()).phase,"cage-complete");assert.equal((await saved()).youthTraining.receipts.length,20);
 const exit=page.getByRole("button",{name:"Revenir dans la cité après la Fosse",exact:true});await visibleControl(exit);await page.screenshot({path:path.join(output,label+"-insignia-return.png"),fullPage:true});
 const overflow=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));assert(overflow.scroll<=overflow.width+1);
 await exit.tap();await page.clock.runFor(100);await page.locator("[data-homeworld-hub]").waitFor();checks.push({name:"played-victory-insignia-and-touch-return",viewport,proofs:20,returnControlVisible:true,horizontalOverflow:false});await context.close();current=null;
}
assert.deepEqual(errors,[]);assert.deepEqual(failures,[]);await fs.writeFile(path.join(output,"report.json"),JSON.stringify({passed:true,base,archivePath,checks,errors,failures,limitations:["Mobile Chromium touch emulation, not a physical phone.","Only a genuinely played duel checkpoint imported at start; all subsequent progression played through controls.","Keyboard used to finish after actual touch movement, jump, pause, retry and return checks."]},null,2));console.log(JSON.stringify({passed:true,checks:checks.length}));
}catch(error){await current?.screenshot({path:path.join(output,"failure.png"),fullPage:true}).catch(()=>{});await fs.writeFile(path.join(output,"report.json"),JSON.stringify({passed:false,base,checks,errors,failures,error:String(error)},null,2));throw error;}finally{await browser.close();}
