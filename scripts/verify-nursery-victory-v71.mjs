import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { chromium } from "playwright-core";

const url = process.env.V71_NURSERY_QA_URL || "http://127.0.0.1:4187";
const output = process.env.V71_NURSERY_QA_OUTPUT || "work-local/v71/qa/nursery-victory";
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const checks = [], errors = [], failures = [], captures = [];
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.setDefaultTimeout(60000);
page.on("pageerror", error => errors.push(error.message));
page.on("response", response => { if (response.status() >= 400) failures.push({ status: response.status(), url: response.url() }); });
const canvas = page.locator("[data-nursery-prologue] canvas");
const phase = value => page.locator(`canvas[data-nursery-phase="${value}"]`);
const snapshot = () => canvas.evaluate(node => ({ phase: node.dataset.nurseryPhase, tick: Number(node.dataset.nurseryTick),
  positions: node.dataset.nurseryPositions.split(",").map(Number), poses: node.dataset.nurseryPoses.split(","),
  victory: node.dataset.nurseryVictory, victoryTick: Number(node.dataset.nurseryVictoryTick) }));
async function capture(target, name, actualCanvas = false) {
  const file = `${output}/${name}.png`;
  if (actualCanvas) {
    const painted = await target.locator("[data-nursery-prologue] canvas").evaluate(node => {
      if (node.dataset.nurseryAssets !== "true") return false;
      const context = node.getContext("2d");
      let detailed = 0;
      for (const fx of [0.2, 0.4, 0.6, 0.8]) for (const fy of [0.2, 0.4, 0.6, 0.8]) {
        const pixel = context.getImageData(Math.floor(node.width * fx), Math.floor(node.height * fy), 1, 1).data;
        if (pixel[0] + pixel[1] + pixel[2] > 60) detailed++;
      }
      return detailed >= 10;
    });
    assert.equal(painted, true, "Native canvas capture requires decoded art and painted scenery, not the loading-black frame.");
    const data = await target.locator("[data-nursery-prologue] canvas").evaluate(node => node.toDataURL("image/png"));
    await fs.writeFile(file, Buffer.from(data.split(",")[1], "base64"));
  } else await target.screenshot({ path: file });
  captures.push(file);
}

try {
  await page.goto(url, { waitUntil: "networkidle", timeout: 120000 });
  await page.getByRole("button", { name: /^Nouvelle partie/ }).click();
  await page.getByLabel("Nom du chasseur").fill("QA Victoire V71");
  await page.getByRole("button", { name: /^Créer la partie 1/ }).click();
  await phase("prompt").waitFor({ timeout: 120000 });
  await canvas.focus(); await page.keyboard.press("z", { delay: 80 }); await phase("ready").waitFor();
  await page.keyboard.down("Enter"); await phase("duel").waitFor(); await page.keyboard.up("Enter");
  await canvas.focus();
  let moving = null, punchedAt = -100;
  const deadline = Date.now() + 90000;
  while (Date.now() < deadline) {
    const state = await snapshot(); if (state.phase !== "duel") break;
    const delta = state.positions[1] - state.positions[0];
    const direction = Math.abs(delta) > 44 ? delta > 0 ? "ArrowRight" : "ArrowLeft" : null;
    if (moving !== direction) {
      if (moving) await page.keyboard.up(moving);
      if (direction) await page.keyboard.down(direction);
      moving = direction;
    }
    if (Math.abs(delta) <= 72 && ["idle", "walk"].includes(state.poses[0]) && state.tick - punchedAt >= 27) {
      await page.keyboard.press("j", { delay: 50 }); punchedAt = state.tick;
    }
    await page.waitForTimeout(20);
  }
  if (moving) await page.keyboard.up(moving);
  assert.equal((await snapshot()).phase, "ko", "The full fresh game must win by real keyboard combat.");
  assert.equal((await snapshot()).victory, "none", "No wide-shot victory is pasted on the combat shot.");
  await capture(page, "desktop-nonlethal-ko");
  checks.push("Fresh campaign: actual keyboard nursery duel won, without seeded state, fabricated hit points or injected receipts.");
  // Observe the real rendered phase before it starts, then activate the existing
  // visible Pause button. This avoids a browser-protocol round trip consuming
  // the first drawing's 20-tick window; it never changes simulation or saves.
  await page.evaluate(() => {
    const node = document.querySelector("[data-nursery-prologue] canvas");
    const observer = new MutationObserver(() => {
      if (node?.dataset.nurseryPhase !== "village-reveal" ||
          node.dataset.nurseryVictory !== "youngling-arm-raised-rival-ko" ||
          Number(node.dataset.nurseryVictoryTick) < 8) return;
      const button = [...document.querySelectorAll("[data-nursery-prologue] button")]
        .find(candidate => candidate.textContent.trim() === "Pause et commandes" && !candidate.disabled);
      if (!button) return;
      observer.disconnect();
      button.click();
    });
    observer.observe(node, { attributes: true, attributeFilter: ["data-nursery-phase", "data-nursery-victory", "data-nursery-victory-tick"] });
  });
  await phase("village-reveal").waitFor();
  await page.getByRole("dialog", { name: "Prologue en pause", exact: true }).waitFor();
  const first = await snapshot();
  assert.ok(first.victoryTick >= 8 && first.victoryTick < 20, "Authentic UI pause freezes the first native drawing's observed 8..19-tick window.");
  await capture(page, "desktop-village-first-native-gesture", true);
  await page.waitForTimeout(400); assert.deepEqual(await snapshot(), first);
  await page.getByRole("button", { name: "Reprendre le prologue", exact: true }).click();
  await canvas.focus();
  await page.waitForFunction(() => Number(document.querySelector("[data-nursery-prologue] canvas")?.dataset.nurseryVictoryTick) >= 45);
  await capture(page, "desktop-village-raised-arm");
  await page.keyboard.press("Escape");
  await page.getByRole("dialog", { name: "Prologue en pause", exact: true }).waitFor();
  await capture(page, "desktop-village-raised-arm-native-canvas", true);
  const frozen = await snapshot(); await page.waitForTimeout(400); assert.deepEqual(await snapshot(), frozen);
  const storage = await page.evaluate(() => Object.fromEntries(Object.keys(localStorage).filter(key => key.toLowerCase().includes("yautja")).map(key => [key, localStorage.getItem(key)])));
  await fs.writeFile(`${output}/keyboard-won-village-checkpoint.json`, JSON.stringify(storage, null, 2));
  checks.push("Native first and raised-arm drawings observed; rival stays prone; pause freezes the actual scene clock and its camera.");

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, reducedMotion: "reduce" });
  mobile.setDefaultTimeout(60000);
  mobile.on("pageerror", error => errors.push(error.message));
  mobile.on("response", response => { if (response.status() >= 400) failures.push({ status: response.status(), url: response.url() }); });
  await mobile.addInitScript(storage => { for (const [key, value] of Object.entries(storage)) localStorage.setItem(key, value); }, storage);
  await mobile.goto(url, { waitUntil: "networkidle", timeout: 120000 });
  await mobile.getByRole("button", { name: /^Continuer/ }).click();
  const mobileCanvas = mobile.locator('canvas[data-nursery-phase="village-reveal"]');
  await mobileCanvas.waitFor({ timeout: 120000 });
  await mobile.waitForFunction(() => {
    const node = document.querySelector("[data-nursery-prologue] canvas");
    return node?.dataset.nurseryAssets === "true" && node.dataset.nurseryVictory === "youngling-arm-raised-rival-ko";
  });
  assert.equal(await mobile.locator("[data-nursery-prologue]").getAttribute("data-reduced-motion"), "true");
  assert.equal(await mobileCanvas.getAttribute("data-nursery-victory-tick"), "240");
  await capture(mobile, "mobile-reduced-motion-wide-victory");
  await capture(mobile, "mobile-reduced-motion-native-canvas", true);
  checks.push("Mobile portrait resumes the genuine keyboard-won checkpoint; reduced-motion victory pose and camera are static.");
  await mobile.close();

  await page.getByRole("button", { name: "Reprendre le prologue", exact: true }).click();
  await canvas.focus();
  await page.waitForFunction(() => {
    const node = document.querySelector("[data-nursery-prologue] canvas");
    return node?.dataset.nurseryPhase === "village-reveal" && Number(node.dataset.nurseryVictoryTick) >= 165;
  });
  await capture(page, "desktop-full-reveal-arena-and-moon");
  await phase("moon-title").waitFor();
  assert.equal((await snapshot()).victory, "none", "The sky-only moon title must not draw floating arena actors.");
  await capture(page, "moon-title-without-floating-actors");
  await page.waitForFunction(() => !document.querySelector("[data-nursery-prologue]"), null, { timeout: 60000 });
  checks.push("Wide village celebration is followed by the original moon title and the genuine next chapter, without extra rank or ship.");
  assert.deepEqual(errors, []); assert.deepEqual(failures, []);
  await fs.writeFile(`${output}/report.json`, JSON.stringify({ status: "PASS", url, at: new Date().toISOString(), firstDrawingObserved: true, firstNativeDrawingState: first, checks, captures, errors, failures,
    limits: "The fresh nursery duel was browser-played. Mobile uses its actually saved victory checkpoint. Existing native V47 art is preserved; the gesture has two distinct bitmap drawings, not a newly generated longer atlas. No canonical map or complete game claim." }, null, 2));
  console.log(JSON.stringify({ status: "PASS", checks, captures }));
} catch (error) {
  await capture(page, "failure").catch(() => {});
  await fs.writeFile(`${output}/report.json`, JSON.stringify({ status: "FAIL", url, error: String(error), checks, captures, errors, failures }, null, 2));
  console.error(error); process.exitCode = 1;
} finally { await browser.close(); }
