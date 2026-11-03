import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { chromium } from "playwright-core";
import { campaignFixture, enterCampaignDeck } from "./campaign-browser-helpers.mjs";
import { selectPitMatch } from "./pit-selection-browser-helpers.mjs";

const url = process.env.V49_IMMERSIVE_QA_URL || "http://127.0.0.1:4174";
const output = process.env.V49_IMMERSIVE_QA_OUTPUT || "outputs/qa-commercial-audit/v49/immersive-browser-qa";
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const checks = [], errors = [], responses = [], contentVersions = [];
let activePage;
async function pageFor(options = {}) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, reducedMotion: "no-preference", ...options });
  const page = await context.newPage(); activePage = page; page.setDefaultTimeout(45000);
  page.on("pageerror", error => errors.push(error.message));
  page.on("response", response => { if (response.status() >= 400) responses.push({ status: response.status(), url: response.url() }); });
  const fixture = structuredClone(await campaignFixture()); fixture.save.settings.screenShake = false;
  await page.addInitScript(({key,save}) => localStorage.setItem(key, JSON.stringify(save)), fixture);
  await page.addInitScript(() => {
    const state = { connected: false, buttons: Array(17).fill(false), axes: [0,0,0,0] };
    window.__qaPad = state;
    Object.defineProperty(navigator, "getGamepads", { configurable: true, value: () => state.connected ? [{ id:"QA virtual controller", index:0, connected:true, mapping:"standard", timestamp:performance.now(), axes:state.axes, buttons:state.buttons.map(pressed=>({pressed,touched:pressed,value:pressed?1:0})) }] : [] });
  });
  await enterCampaignDeck(page, { url });
  const contentVersion = await page.locator('[data-game-content-version]').first().getAttribute('data-game-content-version');
  contentVersions.push(contentVersion);
  if (process.env.PIT_QA_EXPECTED_VERSION) assert.equal(contentVersion, process.env.PIT_QA_EXPECTED_VERSION, 'Regression QA must target the requested build');
  await page.getByRole("button", { name: "THE PIT · combat", exact: true }).click();
  return {page,context};
}
async function enterMatch(page, mode = "Versus local") {
  await page.getByRole("radio", {name:new RegExp("^"+mode)}).click();
  await selectPitMatch(page,{player:"jungle-hunter",opponent:"city-hunter",arena:"the-pit"});
  await page.locator("[data-pit-match-loading]").waitFor({state:"detached"});
  await page.locator('[data-pit-immersive="true"]').waitFor();
  // A match now has a real intro/countdown gate; never send inputs before COMBAT.
  await page.waitForFunction(() => {
    const root = document.querySelector('[data-pit-presentation-phase]');
    return (!root || (root.dataset.pitPresentationPhase === 'fight' && root.dataset.pitPresentationBlocked === 'false')) &&
      Number(document.querySelector('[data-pit-frame]')?.dataset.pitFrame) > 3;
  });
}
const frame = page => page.locator("[data-pit-frame]").getAttribute("data-pit-frame").then(Number);
const position = page => page.locator("canvas[data-pit-fighter-positions]").evaluate(canvas=>JSON.parse(canvas.dataset.pitFighterPositions)[0]);
async function expectFrozen(page) { const start=await frame(page); await page.waitForTimeout(350); assert.equal(await frame(page),start); return start; }
async function resume(page) { await page.locator("[data-pit-resume]").click(); await page.locator('[data-pit-paused="false"]').waitFor(); await page.waitForFunction(()=>document.activeElement?.getAttribute("aria-label")==="Combat THE PIT"); }
async function bounds(page) { return page.evaluate(()=>{ const root=document.querySelector("[data-pit-immersive]"),canvas=root.querySelector("canvas"),hud=document.querySelector("[data-pit-hud]"); const rect=el=>{ const r=el.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};};return {viewport:{width:innerWidth,height:innerHeight},root:rect(root),canvas:rect(canvas),hud:rect(hud),scroll:{html:document.documentElement.scrollWidth,body:document.body.scrollWidth,root:root.scrollWidth},objectFit:getComputedStyle(canvas).objectFit};}); }
function assertViewport(box) { assert.deepEqual(box.root,{x:0,y:0,width:box.viewport.width,height:box.viewport.height}); assert.deepEqual(box.canvas,box.root); assert.equal(box.objectFit,"contain"); assert(box.hud.x>=0&&box.hud.y>=0&&box.hud.x+box.hud.width<=box.viewport.width); assert(box.scroll.root<=box.viewport.width); }
async function holdTouch(page,name,until) { const button=page.getByRole("button",{name,exact:true});const b=await button.boundingBox();assert(b);const cdp=await page.context().newCDPSession(page);try{await cdp.send("Input.dispatchTouchEvent",{type:"touchStart",touchPoints:[{x:b.x+b.width/2,y:b.y+b.height/2}]});await until();}finally{await cdp.send("Input.dispatchTouchEvent",{type:"touchEnd",touchPoints:[]});await cdp.detach();} }
try {
  const {page,context}=await pageFor();
  await enterMatch(page);
  const desktop=await bounds(page);assertViewport(desktop);
  assert.doesNotMatch(await page.locator('[data-pit-hud]').innerText(), /\b(IDLE|STARTUP|RECOVERY|ACTIVE|HITSTUN)\b/, "technical phases stay in training only");
  assert.equal(await page.locator('[data-pit-pause-menu]').isVisible(),false);
  assert.equal(await page.locator('[aria-label="État des visuels de combat"]').isVisible(),false);
  assert.equal(await page.getByRole("button",{name:"Commandes",exact:true}).count(),0);
  assert.equal(await page.locator('[data-pit-hud] [role="progressbar"]').count(),4);
  await page.screenshot({path:output+"/desktop-fight.png"});
  checks.push({name:"viewport-scene-and-integrated-hud",desktop,secondaryPanelsHidden:true});

  await page.keyboard.press("Escape");await page.locator('[data-pit-pause-menu]').waitFor({state:"visible"});
  const pausedFrame=await expectFrozen(page);
  const noticeHiddenBefore=await page.locator('[data-pit-announcement]').getAttribute('hidden');
  await page.getByRole("button",{name:"Commandes",exact:true}).click();
  await page.getByText("JOUEUR 1 · PROFIL THE PIT",{exact:true}).waitFor();
  for(let i=0;i<18;i++){await page.keyboard.press("Tab");assert(await page.evaluate(()=>Boolean(document.activeElement.closest('[data-pit-pause-menu]'))));}
  await page.keyboard.press("Shift+Tab");assert(await page.evaluate(()=>Boolean(document.activeElement.closest('[data-pit-pause-menu]'))));
  const cameraControl=page.locator('[data-pit-camera-control]');await cameraControl.click();
  assert.equal(await cameraControl.getAttribute("aria-pressed"),"false");await expectFrozen(page);
  assert.equal(await page.locator('[data-pit-announcement]').getAttribute('hidden'),noticeHiddenBefore,"notice lifetime follows paused simulation, not wall time");
  await page.screenshot({path:output+"/pause-menu.png"});
  checks.push({name:"real-pause-focus-trap-help-camera",pausedFrame});

  await page.locator('[data-pit-fullscreen]').click();
  await page.waitForFunction(()=>Boolean(document.fullscreenElement));
  assert.equal(await page.evaluate(()=>document.fullscreenElement?.getAttribute("aria-label")),"Combat THE PIT");
  await page.locator('[data-pit-fullscreen]').click();await page.waitForFunction(()=>document.fullscreenElement===null);await expectFrozen(page);
  await resume(page);const resumed=await frame(page);await page.waitForFunction(start=>Number(document.querySelector('[data-pit-frame]').dataset.pitFrame)>start,resumed);
  await page.waitForFunction(()=>document.querySelector('[data-pit-announcement]')?.hidden === true);
  checks.push({name:"gesture-native-fullscreen-and-safe-exit",entered:true,exitPaused:true,noticeExpiresInSimulation:true});

  await page.keyboard.down("ArrowRight");await page.waitForTimeout(150);await page.keyboard.press("Escape");await expectFrozen(page);await resume(page);
  const neutral=await position(page);await page.waitForTimeout(250);assert.equal((await position(page)).x,neutral.x,"held key cannot resume stale movement");
  await page.keyboard.up("ArrowRight");await page.keyboard.down("ArrowRight");await page.waitForTimeout(150);await page.keyboard.up("ArrowRight");assert((await position(page)).x>neutral.x);
  await page.evaluate(()=>window.dispatchEvent(new Event("blur")));await page.locator('[data-pit-paused="true"]').waitFor();await expectFrozen(page);await resume(page);
  checks.push({name:"neutral-input-after-resume-and-window-blur",staleHeldKeyIgnored:true});

  await page.evaluate(()=>{window.__qaPad.connected=true;});await page.waitForTimeout(120);
  await page.evaluate(()=>{window.__qaPad.buttons[9]=true;});await page.locator('[data-pit-paused="true"]').waitFor();await expectFrozen(page);
  await page.evaluate(()=>{window.__qaPad.buttons[9]=false;});await page.waitForTimeout(120);
  await page.evaluate(()=>{window.__qaPad.buttons[1]=true;});await page.locator('[data-pit-paused="false"]').waitFor();
  await page.evaluate(()=>{window.__qaPad.buttons[1]=false;});await page.waitForTimeout(100);
  await page.evaluate(()=>{window.__qaPad.connected=false;const event=new Event("gamepaddisconnected");Object.defineProperty(event,"gamepad",{value:{id:"QA virtual controller",index:0}});window.dispatchEvent(event);});
  await page.locator('[data-pit-paused="true"]').waitFor();await expectFrozen(page);
  checks.push({name:"virtual-gamepad-start-resume-disconnect",physicalHardware:false});

  await page.getByRole("button",{name:"Retour à la sélection",exact:true}).click();
  await page.locator('[data-pit-selection-step="fighters"]').waitFor();
  await enterMatch(page,"Entraînement");
  const beforeLab=await bounds(page);await page.getByRole("button",{name:"Labo",exact:true}).click();
  const lab=page.getByRole("complementary",{name:"Laboratoire d’entraînement"});await lab.waitFor();
  assert.deepEqual((await bounds(page)).canvas,beforeLab.canvas,"laboratory cannot shrink the arena");
  await lab.getByRole("button",{name:"Geler la simulation",exact:true}).click();const labFrame=await expectFrozen(page);
  await lab.getByRole("button",{name:"Avancer d’un tick",exact:true}).click();await page.waitForFunction(start=>Number(document.querySelector('[data-pit-frame]').dataset.pitFrame)===start+1,labFrame);await expectFrozen(page);
  await page.screenshot({path:output+"/training-overlay.png"});await lab.getByRole("button",{name:"Fermer le laboratoire",exact:true}).click();
  checks.push({name:"training-tools-overlay-and-single-tick",canvasUnchanged:true,labFrame});
  await page.keyboard.press("Escape");await page.getByRole("button",{name:"Retour au vaisseau",exact:true}).click();
  await page.locator('[data-campaign-session][data-campaign-location="deck"]').waitFor();
  const restored=await page.evaluate(()=>({html:document.documentElement.style.overflow,body:document.body.style.overflow,overscroll:document.body.style.overscrollBehavior}));
  assert.deepEqual(restored,{html:"",body:"",overscroll:""});checks.push({name:"campaign-return-restores-document-styles",restored});
  await context.close();

  const mobile=await pageFor({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1});
  await enterMatch(mobile.page);
  const portrait=await bounds(mobile.page);assertViewport(portrait);
  const buttons=await mobile.page.getByRole("group").count();void buttons;
  const touchTargets=await mobile.page.locator('[aria-label="Commandes tactiles"] button').evaluateAll(buttons=>buttons.map(button=>{const b=button.getBoundingClientRect();return {name:button.getAttribute("aria-label"),x:b.x,y:b.y,width:b.width,height:b.height};}));
  assert(touchTargets.every(b=>b.width>=44&&b.height>=44&&b.x>=0&&b.y>=0&&b.x+b.width<=390&&b.y+b.height<=844),JSON.stringify(touchTargets));
  const start=await position(mobile.page);await holdTouch(mobile.page,"▶",()=>mobile.page.waitForFunction(x=>JSON.parse(document.querySelector("canvas[data-pit-fighter-positions]").dataset.pitFighterPositions)[0].x>x+20,start.x));
  await mobile.page.screenshot({path:output+"/portrait-touch.png"});checks.push({name:"portrait-touch-fight-without-page-scroll",portrait,touchTargets});

  await mobile.page.setViewportSize({width:640,height:360});await mobile.page.waitForTimeout(120);const landscape=await bounds(mobile.page);assertViewport(landscape);
  const landscapeTargets=await mobile.page.locator('[aria-label="Commandes tactiles"] button').evaluateAll(buttons=>buttons.map(button=>{const b=button.getBoundingClientRect();return {x:b.x,y:b.y,width:b.width,height:b.height};}));
  assert(landscapeTargets.every(b=>b.width>=44&&b.height>=44&&b.x>=0&&b.y>=0&&b.x+b.width<=640&&b.y+b.height<=360),JSON.stringify(landscapeTargets));
  await mobile.page.screenshot({path:output+"/landscape-touch.png"});checks.push({name:"landscape-touch-safe-targets",landscape});

  await mobile.page.locator('[data-pit-menu-button]').click();await mobile.page.setViewportSize({width:320,height:568});
  await mobile.page.addStyleTag({content:"html { font-size: 200% !important; }"});
  await mobile.page.getByRole("button",{name:"Commandes",exact:true}).click();
  await mobile.page.getByRole("button",{name:"Retour à la sélection",exact:true}).scrollIntoViewIfNeeded();
  const menuBox=await mobile.page.locator('[data-pit-pause-menu]').evaluate(el=>({width:el.clientWidth,scrollWidth:el.scrollWidth,height:el.clientHeight,scrollHeight:el.scrollHeight}));assert(menuBox.scrollWidth<=menuBox.width+1,JSON.stringify(menuBox));
  await expectFrozen(mobile.page);await mobile.page.screenshot({path:output+"/menu-200-percent.png"});
  await mobile.page.locator('[data-pit-resume]').click();await mobile.page.locator('[data-pit-paused="false"]').waitFor();
  checks.push({name:"small-screen-200-percent-text-scrollable-pause",menuBox});await mobile.context.close();

  assert.deepEqual(errors,[]);assert.deepEqual(responses,[]);
  const report={passed:true,checkedAt:new Date().toISOString(),url,contentVersions:[...new Set(contentVersions)],checks,errors,responses,limits:["Native fullscreen tested in Chrome headless via a real button gesture; other browsers may refuse and retain viewport mode.","Physical controller not tested; virtual Gamepad API exercises Start/B and disconnection.","16:9 artwork is preserved without cropping; portrait and ultrawide screens have intentional unused border space."]};
  await fs.writeFile(output+"/report.json",JSON.stringify(report,null,2)+"\n");console.log(JSON.stringify(report));
} catch(error) {await activePage?.screenshot({path:output+"/failure.png",fullPage:true}).catch(()=>{});await fs.writeFile(output+"/failure.json",JSON.stringify({error:String(error),checks,errors,responses,body:await activePage?.locator("body").innerText().catch(()=>null)},null,2));throw error;}
finally {await browser.close();}
