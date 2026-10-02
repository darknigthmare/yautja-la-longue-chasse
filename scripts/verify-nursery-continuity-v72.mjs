import assert from "node:assert/strict";
import fs from "node:fs/promises";
import crypto from "node:crypto";
import { chromium } from "playwright-core";

const url = process.env.V72_NURSERY_QA_URL || "http://127.0.0.1:4192";
const output = process.env.V72_NURSERY_QA_OUTPUT || "work-local/v72/qa/nursery-continuity";
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const checks = [], captures = [], errors = [], failures = [];
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
let active = await context.newPage();
function observe(page, controlledMissingArt = false) {
  page.setDefaultTimeout(60000); page.on("pageerror", e => errors.push(e.message));
  page.on("response", r => { if (r.status() >= 400 && !(controlledMissingArt && r.url().includes("clan-audience-hall.png"))) failures.push({ url: r.url(), status: r.status() }); });
}
const canvas = page => page.locator("[data-nursery-prologue] canvas");
const phase = (page, value) => page.locator(`canvas[data-nursery-phase="${value}"]`);
const storage = page => page.evaluate(() => Object.fromEntries(Object.keys(localStorage).filter(k => k.toLowerCase().includes("yautja")).map(k => [k, localStorage.getItem(k)])));
const snapshot = page => canvas(page).evaluate(n => ({ phase: n.dataset.nurseryPhase, tick: Number(n.dataset.nurseryTick),
  story: n.dataset.nurseryStory, positions: n.dataset.nurseryPositions.split(",").map(Number), poses: n.dataset.nurseryPoses.split(","),
  shot: n.dataset.nurseryShot, ceremony: n.dataset.nurseryCeremony, assets: n.dataset.nurseryAssets,
  paused: n.dataset.nurseryPaused, visible: !document.hidden }));
async function capture(page, name, native = false) {
  const path = `${output}/${name}.png`;
  if (native) {
    assert.equal(await canvas(page).getAttribute("data-nursery-assets"), "true");
    const bytes = await canvas(page).evaluate(n => n.toDataURL("image/png").split(",")[1]); await fs.writeFile(path, Buffer.from(bytes, "base64"));
  } else await page.screenshot({ path });
  captures.push(path);
}
async function card(page, id, captureName = id) {
  const pane = page.locator(`[data-nursery-story-card="${id}"]`); await pane.waitFor();
  const button = pane.locator("[data-nursery-story-continue]"); await button.waitFor();
  await page.waitForFunction(id => !document.querySelector(`[data-nursery-story-card="${id}"] [data-nursery-story-continue]`)?.disabled, id);
  assert.equal(await canvas(page).getAttribute("data-nursery-story"), id);
  if (captureName) await capture(page, captureName);
  return { pane, button };
}
async function accept(page, id, captureName = id) { const { button } = await card(page, id, captureName); await button.click(); await page.waitForTimeout(120); }
async function actualCity(page) {
  await page.locator('[data-homeworld-hub="true"]').waitFor({ timeout: 120000 });
  const nativeV74=process.env.YAUTJA_QA_EXPECTED_VERSION==='V74';
  if(nativeV74)await page.locator('[data-homeworld-hub][data-homeworld-motion-ready="true"]').waitFor({timeout:120000});
  const hero = page.locator('[data-homeworld-unblooded-v72]'); await hero.waitFor({ timeout: 120000 });
  const source = await hero.evaluate(async node => {
    const src = getComputedStyle(node).backgroundImage.match(/url\(["']?(.*?)["']?\)/)?.[1];
    const image = new Image(); image.src = src; await image.decode(); return { src, width: image.naturalWidth, height: image.naturalHeight };
  });
  assert.match(source.src, nativeV74?/\/game\/homeworld\/v74\/youth\/unblooded-[a-z-]+\.png$/:/\/game\/youth\/v48\/unblooded-(left|right)\.png$/);
  assert.equal(source.width, nativeV74?1536:1122); assert.equal(source.height, nativeV74?1024:1402);
  await page.waitForLoadState("networkidle", { timeout: 120000 });
}
async function pauseAndResume(page, name) {
  await page.getByRole("button", { name: "Pause et commandes", exact: true }).click();
  await page.getByRole("dialog", { name: "Prologue en pause", exact: true }).waitFor();
  await page.locator('canvas[data-nursery-paused="true"]').waitFor();
  const before = await snapshot(page); await capture(page, name, true); await page.waitForTimeout(350);
  assert.deepEqual(await snapshot(page), before, "Actual pause freezes narrative, physics and camera clocks.");
  await page.getByRole("button", { name: "Reprendre le prologue", exact: true }).click(); await canvas(page).focus();
}
async function wonPostlude(page, mobile = false) {
  await accept(page, "master-stop", mobile ? "mobile-master-stop" : "desktop-master-stop");
  await accept(page, "rival-recovery", mobile ? "mobile-rival-recovery" : null);
  await phase(page, "walkout").waitFor(); await page.waitForTimeout(500);
  await pauseAndResume(page, mobile ? "mobile-static-youngling-road" : "desktop-younglings-native-road");
  await accept(page, "training-ellipse", mobile ? "mobile-ellipse" : "desktop-ellipse");
  await accept(page, "city-journey", null);
  const terminal = await card(page, "arrival-terminal", mobile ? "mobile-announcement" : "desktop-announcement");
  assert.match(await terminal.button.innerText(), /QA Continuité/);
  assert.equal((await snapshot(page)).ceremony, "unblooded-after-ellipse");
  await terminal.button.click(); await phase(page, "clan-entry").waitFor(); await page.waitForTimeout(700);
  await pauseAndResume(page, mobile ? "mobile-static-unblooded-corridor" : "desktop-open-veil-unblooded-walk");
  await card(page, "clan-code", mobile ? "mobile-clan-code" : "desktop-clan-code");
  await capture(page, mobile ? "mobile-native-clan-hall" : "desktop-native-clan-hall", true);
  await accept(page, "clan-code", null); await accept(page, "clan-mentor", null);
  await card(page, "city-exit", mobile ? "mobile-city-directions" : "desktop-city-directions");
}
try {
  const page = active; observe(page);
  const response = await page.goto(url, { waitUntil: "networkidle", timeout: 120000 });
  assert.equal(response.status(), 200);
  await page.getByRole("button", { name: /^Nouvelle partie/ }).click(); await page.getByLabel("Nom du chasseur").fill("QA Continuité V72");
  await page.getByRole("button", { name: /^Créer la partie 1/ }).click();
  await phase(page, "prompt").waitFor({ timeout: 120000 });
  assert.equal(await page.locator("main").getAttribute("data-game-content-version"), process.env.YAUTJA_QA_EXPECTED_VERSION ?? "V73");
  for (const id of ["born-in-clan", "nursery-place", "mentor-briefing", "rival-oath", "duel-consent"]) {
    if (id === "mentor-briefing") {
      await card(page, id, null);
      const translation = page.locator('[data-nursery-story-card="mentor-briefing"] [data-yautja-translation-v67]');
      await translation.waitFor(); assert.equal(await translation.getAttribute("data-translation-complete"), "false");
      await page.getByRole("button", { name: "Pause et commandes", exact: true }).click();
      await page.getByRole("dialog", { name: "Prologue en pause", exact: true }).waitFor(); await page.waitForTimeout(50);
      const revealed = Number(await translation.getAttribute("data-translation-revealed"));
      await page.waitForTimeout(350); assert.equal(Number(await translation.getAttribute("data-translation-revealed")), revealed);
      assert.equal(await page.locator('[data-nursery-story-card="mentor-briefing"]').isVisible(), false);
      await page.getByRole("button", { name: "Reprendre le prologue", exact: true }).click();
      assert(Number(await translation.getAttribute("data-translation-revealed")) >= revealed);
      const readNow = translation.getByRole("button", { name: "Lire immédiatement", exact: true });
      assert((await readNow.boundingBox()).height >= 44); await readNow.click();
      assert.equal(await translation.getAttribute("data-translation-complete"), "true");
      assert.equal((await snapshot(page)).story, id, "Reading immediately must not accept the dialogue or attack.");
      checks.push("Yautja speech deciphers into French, pauses without resetting, and Lire immédiatement reveals text without accepting a scene or issuing a combat input.");
      await page.evaluate(() => {
        window.__v72BlockDialogue = true; const original = Storage.prototype.setItem;
        Storage.prototype.setItem = function(key, value) {
          let changingPage = false; try { changingPage = JSON.parse(value)?.prologue?.checkpoint?.continuityV72?.introPage === 3; } catch { /* Other keys are unaffected. */ }
          if (window.__v72BlockDialogue && changingPage) throw new DOMException("QA scene checkpoint quota", "QuotaExceededError");
          return original.call(this, key, value);
        };
      });
    }
    await accept(page, id, id === "born-in-clan" || id === "duel-consent" ? `desktop-${id}` : null);
    if (id === "mentor-briefing") {
      await page.getByRole("dialog", { name: "Prologue en pause", exact: true }).waitFor();
      const heldScene = await snapshot(page); await page.waitForTimeout(350); assert.deepEqual(await snapshot(page), heldScene);
      assert.equal(heldScene.story, "rival-oath");
      assert.equal(await page.evaluate(() => Object.keys(localStorage).map(k => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } })
        .filter(v => v?.prologue?.checkpoint?.continuityV72).every(v => v.prologue.checkpoint.continuityV72.introPage < 3)), true);
      await capture(page, "desktop-dialogue-write-refusal-keeps-scene-open");
      await page.getByRole("button", { name: "Reprendre le prologue", exact: true }).click();
      assert.equal(await page.getByRole("dialog", { name: "Prologue en pause", exact: true }).isVisible(), true);
      await page.evaluate(() => { window.__v72BlockDialogue = false; });
      await page.getByRole("button", { name: "Reprendre le prologue", exact: true }).click(); await card(page, "rival-oath", null);
      checks.push("A refused dialogue-page checkpoint pauses the real scene and retains older stored bytes; recovery durably saves the same page before allowing further narration.");
    }
  }
  checks.push("New real campaign reads clan, nursery, nonlethal rules, rival and explicit consent; no fabricated checkpoint.");
  await phase(page, "ready").waitFor(); await canvas(page).focus(); await page.keyboard.down("Enter"); await phase(page, "duel").waitFor();
  const held = await snapshot(page); await page.waitForTimeout(200); assert.deepEqual((await snapshot(page)).positions, held.positions);
  await page.keyboard.up("Enter"); await canvas(page).focus(); await page.waitForTimeout(150);
  let moving = null, punchedAt = -100, lastTick = -1, stalledAt = Date.now(); const deadline = Date.now() + 120000;
  while (Date.now() < deadline) {
    const s = await snapshot(page); if (s.phase !== "duel") break;
    if (s.tick !== lastTick) { lastTick = s.tick; stalledAt = Date.now(); }
    else if (Date.now() - stalledAt > 450) {
      // A real long frame or focus recovery disarms input. Release the actual
      // keys and let a neutral frame rearm; never change engine state.
      if (moving) await page.keyboard.up(moving); moving = null;
      await page.keyboard.up("j"); await canvas(page).focus(); await page.waitForTimeout(150); stalledAt = Date.now(); continue;
    }
    const distance = s.positions[1] - s.positions[0], direction = Math.abs(distance) > 44 ? distance > 0 ? "ArrowRight" : "ArrowLeft" : null;
    if (moving !== direction) { if (moving) await page.keyboard.up(moving); if (direction) await page.keyboard.down(direction); moving = direction; }
    if (Math.abs(distance) <= 72 && ["idle", "walk"].includes(s.poses[0]) && s.tick - punchedAt >= 27) { await page.keyboard.press("j", { delay: 50 }); punchedAt = s.tick; }
    await page.waitForTimeout(20);
  }
  if (moving) await page.keyboard.up(moving);
  assert.equal((await snapshot(page)).phase, "ko", "The actual unmodified CPU duel must be won through keyboard input.");
  await phase(page, "village-reveal").waitFor(); await page.waitForTimeout(1200); await capture(page, "desktop-genuine-wide-victory", true);
  await card(page, "master-stop", null);
  await page.getByRole("button", { name: "Pause et commandes", exact: true }).click(); await page.getByRole("dialog", { name: "Prologue en pause", exact: true }).waitFor();
  const genuineWonStorage = await storage(page); await fs.writeFile(`${output}/genuine-keyboard-won-debrief-storage.json`, JSON.stringify(genuineWonStorage, null, 2));
  await page.getByRole("button", { name: "Reprendre le prologue", exact: true }).click();
  checks.push("Real keyboard duel won; arm-raised native victory and nonlethal rival preserved; held readiness does not attack.");
  await wonPostlude(page);
  // Fault injection changes storage availability only, never phase, winner, actor positions or receipts.
  await page.evaluate(() => {
    window.__v72BlockCompletion = true; const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function(key, value) {
      let completing = false; try { completing = JSON.parse(value)?.prologue?.status === "completed"; } catch { /* Other storage keys remain unchanged. */ }
      if (window.__v72BlockCompletion && completing) throw new DOMException("QA completion quota", "QuotaExceededError");
      return original.call(this, key, value);
    };
  });
  await accept(page, "city-exit", null); await phase(page, "clan-departure").waitFor(); await page.waitForTimeout(500); await pauseAndResume(page, "desktop-walking-out-of-hall");
  const retry = page.getByRole("button", { name: "Réessayer l’enregistrement", exact: true }); await retry.waitFor({ timeout: 120000 });
  assert.equal((await snapshot(page)).phase, "complete"); await capture(page, "desktop-save-refusal-with-retry");
  assert.equal(await page.evaluate(() => Object.keys(localStorage).map(k => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } }).filter(v => v?.prologue).every(v => v.prologue.status !== "completed")), true);
  await page.evaluate(() => { window.__v72BlockCompletion = false; }); await retry.click();
  await page.waitForFunction(() => !document.querySelector("[data-nursery-prologue]"), null, { timeout: 120000 });
  await actualCity(page);
  const completed = await page.evaluate(() => Object.keys(localStorage).map(k => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } }).find(v => v?.prologue?.status === "completed"));
  assert(completed); assert.equal(completed.prologue.checkpoint.continuityV72.receptionPage, 4);
  assert.deepEqual(completed.prologue.chronicle.rites.map(r => r.id), ["nursery-recognition"]);
  assert.equal(completed.statistics.missionsCompleted, 0); await capture(page, "desktop-real-city-after-durable-completion");
  checks.push("All post-duel pages, real Youngling walkout, explicit age ellipse, named terminal, moving veil, V48 Unblooded walk, seated chief/role crowd and hall exit are linked.");
  checks.push("Final completion quota refusal leaves all stored records active; exact UI retry completes once and reaches the actual city without replaying the duel or granting hunting rites.");

  const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, reducedMotion: "reduce" });
  await mobileContext.addInitScript(st => { for (const [k, v] of Object.entries(st)) localStorage.setItem(k, v); }, genuineWonStorage);
  const mobile = active = await mobileContext.newPage(); observe(mobile); await mobile.goto(url, { waitUntil: "networkidle", timeout: 120000 });
  await mobile.getByRole("button", { name: /^Continuer/ }).click(); await phase(mobile, "debrief").waitFor({ timeout: 120000 });
  assert.equal(await mobile.locator("[data-nursery-prologue]").getAttribute("data-reduced-motion"), "true");
  await wonPostlude(mobile, true);
  assert.equal(await mobile.locator('[data-nursery-story-card="city-exit"] [data-translation-complete]').getAttribute("data-translation-complete"), "true");
  assert.equal(await canvas(mobile).evaluate(n => getComputedStyle(n).objectPosition), "50% 0%");
  const mobileCanvasBounds = await canvas(mobile).boundingBox(), mobileCardBounds = await mobile.locator('[data-nursery-story-card="city-exit"]').boundingBox();
  const paintedHeight = Math.min(mobileCanvasBounds.height, mobileCanvasBounds.width * 540 / 960);
  assert(mobileCardBounds.y >= mobileCanvasBounds.y + paintedHeight * .8, "At least the upper 80% of the mobile cinematic stays above its dialogue instead of being covered by it.");
  const target = mobile.locator('[data-nursery-story-card="city-exit"] [data-nursery-story-continue]');
  assert((await target.boundingBox()).height >= 44); assert(await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await target.tap(); await mobile.waitForFunction(() => !document.querySelector("[data-nursery-prologue]"), null, { timeout: 120000 });
  await actualCity(mobile);
  checks.push("Mobile 390x844 resumes the genuine won checkpoint, keeps the top-aligned cinematic visible above the dialogue, reads the whole welcome, uses 44px targets without horizontal overflow, and honors reduced motion.");
  await mobileContext.close();

  const faultContext = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await faultContext.addInitScript(st => { for (const [k, v] of Object.entries(st)) localStorage.setItem(k, v); }, genuineWonStorage);
  const fault = active = await faultContext.newPage(); observe(fault, true);
  await fault.route("**/game/prologue/v72/clan-audience-hall.png", r => r.fulfill({ status: 503, body: "Controlled QA asset failure" }));
  await fault.goto(url, { waitUntil: "networkidle", timeout: 120000 }); await fault.getByRole("button", { name: /^Continuer/ }).click();
  const retryArt = fault.getByRole("button", { name: "Réessayer le chargement", exact: true }); await retryArt.waitFor({ timeout: 120000 });
  const before = await snapshot(fault); assert.equal(before.phase, "debrief"); assert.equal(before.assets, "false");
  await fault.waitForTimeout(350); assert.equal((await snapshot(fault)).tick, before.tick); await capture(fault, "missing-art-on-resume-keeps-checkpoint");
  await fault.unroute("**/game/prologue/v72/clan-audience-hall.png"); await retryArt.click(); await card(fault, "master-stop", "asset-retry-restores-same-debrief");
  checks.push("A missing new PNG on a genuine resumed scene freezes that scene and exposes retry; recovering the image restores the same won checkpoint, without resetting the prologue.");
  await faultContext.close();

  const assets = [];
  for (const name of ["nursery-exit", "clan-arrival-corridor", "clan-audience-hall", "clan-chief-seated", "clan-door-veil"]) {
    const relative = `/game/prologue/v72/${name}.png`, response = await context.request.get(url + relative); assert.equal(response.status(), 200);
    const bytes = await response.body(), local = await fs.readFile("public" + relative);
    const hash = b => crypto.createHash("sha256").update(b).digest("hex"); assert.equal(hash(bytes), hash(local)); assets.push({ path: relative, bytes: bytes.length, sha256: hash(bytes) });
  }
  assert.deepEqual(errors, []); assert.deepEqual(failures, []);
  await fs.writeFile(`${output}/report.json`, JSON.stringify({ status: "PASS", url, checkedAt: new Date().toISOString(), checks, captures, assets, errors, failures,
    limits: ["Text subtitles are not voiced dialogue.", "The original clan architecture is an adaptation; no canonical map, franchise king or whole campaign completion is claimed."] }, null, 2));
  console.log(JSON.stringify({ status: "PASS", checks: checks.length, captures: captures.length, assets: assets.length }));
} catch (error) {
  if (active && !active.isClosed()) { await active.screenshot({ path: `${output}/failure.png`, fullPage: true }).catch(() => {}); await fs.writeFile(`${output}/failure-state.json`, JSON.stringify(await canvas(active).count() ? await snapshot(active).catch(() => null) : null, null, 2)); }
  await fs.writeFile(`${output}/report.json`, JSON.stringify({ status: "FAIL", url, checkedAt: new Date().toISOString(), error: String(error.stack || error), checks, captures, errors, failures }, null, 2)); throw error;
} finally { await browser.close(); }
