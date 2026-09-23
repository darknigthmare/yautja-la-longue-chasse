import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { chromium } from "playwright-core";
import { campaignFixture, enterCampaignDeck } from "./campaign-browser-helpers.mjs";
import { choosePitFighter, choosePitStage } from "./pit-selection-browser-helpers.mjs";

const url = process.env.V50_SELECTION_QA_URL || "http://127.0.0.1:4174";
const output = process.env.V50_SELECTION_QA_OUTPUT || "outputs/qa-commercial-audit/v50/selection-browser-qa";
await fs.mkdir(output, {recursive:true});
const checks=[], errors=[], responses=[];let browser,activePage;
const record=(name, evidence={})=>checks.push({name,...evidence});
async function fresh(options={}) {
 const context=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:"no-preference",...options});
 const page=await context.newPage();activePage=page;page.setDefaultTimeout(45000);
 page.on("pageerror",error=>errors.push(error.message.slice(0,1000)));
 page.on("response",r=>{if(r.status()>=400)responses.push({url:r.url(),status:r.status()});});
 // This is generated from published defaultSave constants, never from a player's save.
 const fixture=structuredClone(await campaignFixture());
 await page.addInitScript(({key,save})=>localStorage.setItem(key,JSON.stringify(save)),fixture);
 await page.addInitScript(()=>{const state={connected:false,buttons:Array(17).fill(false),axes:[0,0,0,0]};window.__qaPitMenuPad=state;
  Object.defineProperty(navigator,"getGamepads",{configurable:true,value:()=>state.connected?[{id:"QA selection controller",index:0,connected:true,mapping:"standard",timestamp:performance.now(),axes:state.axes,buttons:state.buttons.map(pressed=>({pressed,touched:pressed,value:pressed?1:0}))}]:[]});});
 await enterCampaignDeck(page,{url});await page.getByRole("button",{name:"THE PIT · combat",exact:true}).click();
 await page.locator('[data-pit-selection-screen="immersive"]').waitFor();
 await page.locator('[data-selection-side="player"] img[data-art-ready="true"]').waitFor();
 // Check the original regression immediately, before the entrance animation
 // settles; geometry itself is measured only once screen-in has finished.
 const entry=await page.evaluate(()=>{const b=document.querySelector('[data-pit-selection-confirm]'),r=b.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return {toast:Array.from(document.querySelectorAll('.toast')).some(e=>e.getClientRects().length>0),confirm:hit===b||b.contains(hit)};});
 assert.equal(entry.toast,false);assert.equal(entry.confirm,true);
 await page.waitForFunction(()=>{const r=document.querySelector('[data-pit-selection-screen]')?.getBoundingClientRect();return r&&r.x===0&&r.y===0&&r.width===innerWidth&&r.height===innerHeight;});
 return {context,page};
}
async function viewport(page) {
 const result=await page.evaluate(()=>{const root=document.querySelector('[data-pit-selection-screen]'),flow=document.querySelector('[data-pit-selection-immersive]'),confirm=document.querySelector('[data-pit-selection-confirm]'),grid=document.querySelector('[role=listbox]');
  const box=e=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom,right:r.right};};const b=confirm.getBoundingClientRect(),hit=document.elementFromPoint(b.x+b.width/2,b.y+b.height/2);
  const reachable=e=>{const r=e.getBoundingClientRect(),h=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return r.x>=0&&r.right<=innerWidth+1&&r.y>=0&&r.bottom<=innerHeight+1&&(h===e||e.contains(h));};
  return {viewport:{width:innerWidth,height:innerHeight},root:box(root),rootScrollTop:root.scrollTop,header:box(root.querySelector("header")),flow:box(flow),confirm:box(confirm),grid:box(grid),confirmUnobstructed:hit===confirm||confirm.contains(hit),optionsReachable:reachable(document.querySelector('[data-pit-options-open]')),returnReachable:reachable(confirm.parentElement.querySelector('button')),visibleToasts:Array.from(document.querySelectorAll(".toast")).filter(e=>e.getClientRects().length>0).map(e=>e.textContent),documentWidth:document.documentElement.scrollWidth,scrollY,background:getComputedStyle(document.querySelector('[class*="selectionBackdrop"]')).backgroundImage};});
 assert.equal(result.rootScrollTop,0);assert.equal(result.header.y,0);assert.equal(result.root.x,0);assert.equal(result.root.y,0);assert.equal(result.root.width,result.viewport.width);assert.equal(result.root.height,result.viewport.height);
 assert(result.documentWidth<=result.viewport.width+1);assert.equal(result.scrollY,0);assert(result.confirm.bottom<=result.viewport.height+1);assert.deepEqual(result.visibleToasts,[]);assert(result.confirmUnobstructed);assert(result.optionsReachable);assert(result.returnReachable);assert(result.grid.height>=44);assert.match(result.background,/url\(/);
 return result;
}
async function capture(page,name) {
 await page.locator('[data-pit-selection-immersive] img').evaluateAll(images=>Promise.all(images.map(img=>img.decode().catch(()=>{}))));
 await page.screenshot({path:output+"/"+name+".png"});
}
async function pad(page,index) {await page.evaluate(index=>window.__qaPitMenuPad.buttons[index]=true,index);await page.waitForTimeout(140);await page.evaluate(index=>window.__qaPitMenuPad.buttons[index]=false,index);await page.waitForTimeout(140);}
async function enterStage(page,player="jungle-hunter",opponent="city-hunter") {
 await page.getByRole("radio",{name:/^Versus local/}).click();
 await choosePitFighter(page,player);await page.locator('[data-pit-selection-confirm]').click();
 await choosePitFighter(page,opponent);await page.locator('[data-pit-selection-confirm]').click();
 await page.locator('[data-pit-selection-step="stage"]').waitFor();
 await choosePitStage(page,"the-pit");await page.waitForFunction(()=>document.querySelector('[data-pit-stage-preview]')?.dataset.previewStatus==="ready");
}
try {
 browser=await chromium.launch({channel:"chrome",headless:true});
 const desktop=await fresh();const page=desktop.page;
 record("desktop-viewport-composition",{layout:await viewport(page)});await capture(page,"desktop-roster");
 const count=Number(await page.locator('[data-pit-roster-total]').getAttribute('data-pit-roster-total'));
 assert(count>=195);assert((await page.locator('[data-pit-roster-total] [role=option]').count())<=24);
 await page.locator('[data-pit-roster-page-next]').click();assert.equal(await page.locator('[data-pit-roster-page]').getAttribute('data-pit-roster-page'),"2");
 const identity=await page.locator('[data-selection-side="player"] article').getAttribute('data-fighter-id');
 await page.locator('[data-pit-roster-search]').fill("aucun-chasseur-qa-000");assert.equal(await page.locator('[data-pit-roster-filtered]').getAttribute('data-pit-roster-filtered'),"0");
 assert.equal(await page.locator('[data-selection-side="player"] article').getAttribute('data-fighter-id'),identity);
 await page.locator('[data-pit-roster-search]').fill("");record("paged-roster-search-preserves-selection",{identities:count,maximumMounted:24});
 await page.locator('[data-pit-options-open]').click();assert(await page.locator('[data-pit-selection-options]').evaluate(d=>d.matches(':modal')));
 for(let i=0;i<24;i++){await page.keyboard.press('Tab');assert(await page.locator('[data-pit-selection-options]').evaluate(d=>d.contains(document.activeElement)));}
 await capture(page,"options-modal");await page.keyboard.press('Escape');assert.equal(await page.locator('[data-pit-selection-options]').evaluate(d=>d.open),false);
 assert.equal(await page.locator('[data-pit-options-open]').evaluate(e=>document.activeElement===e),true);
 record("options-native-modal-focus-escape");
 await page.evaluate(()=>window.__qaPitMenuPad.connected=true);await page.waitForTimeout(200);await pad(page,9);
 assert(await page.locator('[data-pit-selection-options]').evaluate(d=>d.open));await pad(page,1);assert.equal(await page.locator('[data-pit-selection-options]').evaluate(d=>d.open),false);
 assert(await page.locator('[data-pit-selection-screen]').isVisible());await page.evaluate(()=>window.__qaPitMenuPad.connected=false);
 record("gamepad-start-b-return-without-leaving-pit",{physicalHardware:false});
 await choosePitFighter(page,"jungle-hunter");
 for (const [modeName,brief] of [[/^Arcade individuel/,/^Parcours Arcade de/],[/^Circuit du clan/,/^Circuit du clan de/],[/^Descente/,/^Descente de/]]) {
  await page.getByRole("radio",{name:modeName}).click();await page.locator('[data-pit-options-open]').click();
  const panel=page.getByRole("complementary",{name:brief});await panel.scrollIntoViewIfNeeded();assert(await panel.isVisible());
  await page.locator('[data-pit-options-close]').click();assert(await page.locator('[data-pit-selection-screen]').isVisible());
 }
 record("arcade-circuit-descent-briefings-remain-accessible");
 await page.getByRole("radio",{name:/^Versus local/}).click();await choosePitFighter(page,"user-ahab");
 const variants=await page.locator('[data-pit-variant-select] option').evaluateAll(items=>items.map(i=>({id:i.value,label:i.textContent})));
 assert(variants.length>=2);await page.locator('[data-pit-variant-select]').selectOption(variants[1].id);
 await page.waitForFunction(id=>document.querySelector('[data-selection-side="player"] article')?.dataset.fighterVariant===id&&document.querySelector('[data-selection-side="player"] img')?.dataset.artReady==='true',variants[1].id);
 assert.equal(await page.locator('[data-selection-side="player"] article').getAttribute('data-fighter-id'),"user-ahab");
 await page.locator('[data-pit-variant-select]').selectOption('ahab-avec-casque-0c8ceb1c95');
 await page.locator('[data-selection-side="player"] img[data-art-ready="true"]').waitFor();await capture(page,"ahab-variants");record("variants-share-one-roster-identity",{variants:variants.length});
 await page.locator('[data-selection-side="player"] [data-pit-fighter-profile] summary').click();await page.keyboard.press('Escape');
 assert.equal(await page.locator('[data-selection-side="player"] [data-pit-fighter-profile]').evaluate(d=>d.open),false);assert(await page.locator('[data-pit-selection-screen]').isVisible());record("profile-escape-does-not-leave-selection");
 await page.locator('[data-pit-selection-confirm]').click();await choosePitFighter(page,"city-hunter");
 const right=page.locator('[data-selection-side="opponent"] img');await right.waitFor({state:'visible'});
 assert.equal(await right.getAttribute('data-facing'),'left');assert.equal(await right.getAttribute('data-native-facing'),'left');assert.deepEqual(await right.evaluate(e=>{const m=new DOMMatrixReadOnly(getComputedStyle(e).transform);return [m.a,m.b,m.c,m.d,m.e,m.f];}),[1,0,0,1,0,0]);
 const opponentLayout=await viewport(page);await capture(page,"opponent-native-left");record("opponent-faces-player-with-native-left-city-portrait",{layout:opponentLayout});
 await page.locator('[data-pit-selection-confirm]').click();await choosePitStage(page,"the-pit");await page.waitForFunction(()=>document.querySelector('[data-pit-stage-preview]')?.dataset.previewStatus==='ready');
 const planes=(await page.locator('[data-pit-stage-preview]').getAttribute('data-preview-planes')).split(',');assert.equal(new Set(planes).size,6);
 assert.equal(await page.locator('canvas[data-pit-frame]').count(),0);record("stage-after-fighters-real-six-plane-preview",{planes,layout:await viewport(page)});await capture(page,"desktop-stage");
 await page.locator('[data-pit-selection-confirm]').click();await page.waitForFunction(()=>Number(document.querySelector('[data-pit-frame]')?.dataset.pitFrame)>3);await page.keyboard.press('Escape');assert(await page.locator('[data-pit-pause-menu]').isVisible());record("selected-duel-launches-into-v49-pause");await desktop.context.close();
 const portrait=await fresh({viewport:{width:390,height:844},isMobile:true,hasTouch:true});record("portrait-roster-controls-reachable",{layout:await viewport(portrait.page)});await capture(portrait.page,"portrait-roster");
 await enterStage(portrait.page);record("portrait-stage-controls-reachable",{layout:await viewport(portrait.page)});await capture(portrait.page,"portrait-stage");await portrait.context.close();
 const landscape=await fresh({viewport:{width:640,height:360},isMobile:true,hasTouch:true});record("landscape-roster-controls-reachable",{layout:await viewport(landscape.page)});await capture(landscape.page,"landscape-roster");
 await enterStage(landscape.page);assert((await landscape.page.locator('[data-pit-stage-preview]').boundingBox()).height>=72);record("landscape-stage-controls-reachable",{layout:await viewport(landscape.page)});await capture(landscape.page,"landscape-stage");await landscape.context.close();
 const zoom=await fresh({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 await zoom.page.addStyleTag({content:'html {font-size:200% !important}'});
 await capture(zoom.page,"portrait-text-200");
 record("portrait-text-200-roster-controls-reachable",{layout:await viewport(zoom.page)});
 await zoom.page.locator('[data-pit-options-open]').click();assert(await zoom.page.locator('[data-pit-options-close]').isVisible());await zoom.page.locator('[data-pit-options-close]').click();
 await enterStage(zoom.page);await capture(zoom.page,"portrait-stage-text-200");record("portrait-text-200-stage-controls-reachable",{layout:await viewport(zoom.page)});await zoom.context.close();
 assert.deepEqual(errors,[]);assert.deepEqual(responses,[]);
 await fs.writeFile(output+'/report.json',JSON.stringify({passed:true,url,checkedAt:new Date().toISOString(),checks,errors,responses,limits:['Chrome desktop and emulated touch; controller API is virtual, no physical hardware certification.','DefaultSave fixture is generated from code constants in an isolated context. No player save, fighter position, combat clock or engine state is injected.','Only bounded thumbnail pages mount; large portraits intentionally load only for the two selected fighters.']},null,2)+'\n');
 console.log(JSON.stringify({passed:true,checks:checks.length,output}));
}catch(error){await activePage?.screenshot({path:output+'/failure.png'}).catch(()=>{});await fs.writeFile(output+'/failure.json',JSON.stringify({error:String(error).slice(0,2000),checks,errors,responses},null,2));console.error(String(error).slice(0,500));process.exitCode=1;}
finally{await browser?.close();}
