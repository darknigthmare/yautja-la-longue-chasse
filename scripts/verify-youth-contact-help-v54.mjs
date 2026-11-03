import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright-core";
const base = process.env.V54_QA_URL || "http://127.0.0.1:4174";
const output = process.env.V54_YOUTH_CONTACT_OUTPUT || "outputs/qa-commercial-audit/v54/youth/contact-help-browser-qa";
const archives = {
  dojo: "work/v48/youth-scene-browser-qa/dojo-start-storage.json",
  patrol: "outputs/qa-commercial-audit/v52/youth/public-patrol-browser-qa/patrol-charge-played-storage.json",
  cage: "outputs/qa-commercial-audit/v53/youth/public-cage-browser-qa/cage-duel-played-storage.json",
};
await fs.mkdir(output, { recursive: true });
const checks = [], errors = [], failures = [];
const browser = await chromium.launch({ channel: "chrome", headless: true }); let current;
const state = page => page.locator("canvas[data-youth-stage]").evaluate(n => ({ phase: n.dataset.youthPhase, x: Number(n.dataset.youthPositions.split(",")[0]), y: Number(n.dataset.youthY), vy: Number(n.dataset.youthVy), support: Number(n.dataset.youthSupportY), pose: n.dataset.youthPose, tick: Number(n.dataset.youthTick), paused: n.dataset.youthPaused === "true", armed: n.dataset.youthArmed === "true" }));
const start = async (kind, viewport) => {
  const storage = JSON.parse(await fs.readFile(archives[kind], "utf8")), saved = JSON.parse(storage["yautja-long-hunt.save"]);
  assert.equal(saved.youthTraining.checkpoint.phase, { dojo: "dojo-move", patrol: "patrol-ambush", cage: "cage-duel" }[kind]);
  const context = await browser.newContext({ viewport, hasTouch: true, isMobile: viewport.width < 800 });
  const page = await context.newPage(); current = page; page.setDefaultTimeout(45000);
  page.on("pageerror", error => errors.push(error.message)); page.on("response", response => { if (response.status() >= 400) failures.push({ url: response.url(), status: response.status() }); });
  await page.goto(base, { waitUntil: "networkidle", timeout: 120000 });
  await page.evaluate(entries => { if (Object.keys(localStorage).some(k => k.startsWith("yautja"))) throw new Error("Fresh isolated profile required"); for (const [key, value] of Object.entries(entries)) localStorage.setItem(key, value); }, storage);
  await page.reload({ waitUntil: "networkidle" }); await page.getByRole("button", { name: /^Continuer/ }).click();
  const canvas = page.locator('canvas[data-youth-stage][data-youth-assets="true"]'); await canvas.waitFor({ timeout: 120000 });
  await page.clock.install(); await page.clock.pauseAt(await page.evaluate(() => Date.now() + 100)); await canvas.focus(); await page.clock.runFor(100);
  return { page, context, canvas, bindings: saved.settings.controlBindings };
};
const pauseAndCheck = async (page, kind, label) => {
  await page.getByRole("button", { name: "Pause et commandes", exact: true }).click(); await page.clock.runFor(100);
  const dialog = page.getByRole("dialog", { name: "Formation en pause", exact: true }); await dialog.waitFor();
  const paused = await state(page); await page.clock.runFor(300); assert.equal((await state(page)).tick, paused.tick);
  const help = await dialog.locator("[data-youth-gamepad-help]").innerText(); assert.ok(!help.includes("Y lame"));
  assert.equal(await dialog.locator('[data-youth-help-action="blade"]').getAttribute("data-unavailable"), "true");
  if (kind === "patrol") { assert.ok(!help.includes("X poing")); for (const action of ["light", "throw"]) assert.equal(await dialog.locator(`[data-youth-help-action="${action}"]`).getAttribute("data-unavailable"), "true"); }
  const resume = page.getByRole("button", { name: "Reprendre la formation", exact: true }); await resume.scrollIntoViewIfNeeded();
  assert.ok(await resume.evaluate(el => { const r = el.getBoundingClientRect(); return el.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)); }));
  await page.screenshot({ path: path.join(output, `${label}-help.png`), fullPage: true });
  await resume.click(); await page.clock.runFor(100);
  assert.ok(await page.locator("canvas[data-youth-stage]").evaluate(el => document.activeElement === el));
  checks.push({ name: `${label}-context-help-pause-focus`, passed: true, help, tickFrozen: paused.tick });
};
try {
  const { page, context, canvas, bindings } = await start("dojo", { width: 1280, height: 720 });
  await pauseAndCheck(page, "dojo", "dojo");
  const left = bindings["pit.p1MoveLeft"][0], right = bindings["pit.p1MoveRight"][0], jump = bindings["pit.p1Jump"][0];
  const held = new Set();
  const keys = async desired => { for (const k of held) if (!desired.includes(k)) { await page.keyboard.up(k); held.delete(k); } for (const k of desired) if (!held.has(k)) { await page.keyboard.down(k); held.add(k); } };
  for (let i = 0; i < 500 && (await state(page)).phase === "dojo-move"; i++) {
    const s = await state(page), target = Number(await canvas.getAttribute("data-youth-target"));
    if (!s.armed || s.paused) { await keys([]); await canvas.focus(); await page.clock.runFor(100); continue; }
    await keys([s.x < target ? right : left]); await page.clock.runFor(34);
  }
  await keys([]); await page.clock.runFor(150); assert.equal((await state(page)).phase, "dojo-jump");
  for (let i = 0; i < 100 && (await state(page)).x < 418; i++) { await keys([right]); await page.clock.runFor(17); }
  await keys([]); await page.clock.runFor(34);
  await keys([right, jump]); await page.clock.runFor(100); await keys([right]);
  for (let i = 0; i < 100 && (await state(page)).x < 480; i++) await page.clock.runFor(17);
  await keys([]);
  for (let i = 0; i < 100 && ((await state(page)).y !== 380 || (await state(page)).vy !== 0); i++) await page.clock.runFor(17);
  const landed = await state(page); assert.equal(landed.y, 380); assert.equal(landed.support, 380); assert.equal(landed.pose, "idle");
  await page.screenshot({ path: path.join(output, "platform-landed-contact.png"), fullPage: true });
  checks.push({ name: "physical-jump-and-landing-selects-platform-idle", passed: true, landed, injectedPhysics: false });
  await keys([jump]); await page.clock.runFor(100); await keys([]);
  const air = await state(page); assert.ok(air.y < 380); assert.equal(air.support, 380); assert.equal(air.pose, "jump");
  await page.screenshot({ path: path.join(output, "platform-airborne-contact.png"), fullPage: true });
  checks.push({ name: "airborne-shadow-stays-on-real-platform", passed: true, air });
  await context.close();

  for (const kind of ["patrol", "cage"]) for (const viewport of [{ width: 390, height: 844 }, { width: 640, height: 360 }]) {
    const { page, context } = await start(kind, viewport), label = `${kind}-${viewport.width}x${viewport.height}`;
    const buttons = page.locator("[data-youth-action]"); assert.equal(await buttons.count(), 8);
    for (const action of kind === "patrol" ? ["light", "blade", "throw"] : ["blade"]) {
      const control = page.locator(`[data-youth-action="${action}"]`); assert.equal(await control.isDisabled(), true); assert.ok(await control.getAttribute("title"));
    }
    const boxes = await buttons.evaluateAll(elements => elements.map(el => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; }));
    assert.ok(boxes.every(b => b.width >= 43 && b.height >= 43 && b.x >= 0 && b.y >= 0 && b.x + b.width <= viewport.width + 1 && b.y + b.height <= viewport.height + 1));
    await page.screenshot({ path: path.join(output, `${label}-stage.png`), fullPage: true });
    await pauseAndCheck(page, kind, label);
    await context.close();
  }
  assert.deepEqual(errors, []); assert.deepEqual(failures, []);
} catch (error) { errors.push(error.stack || String(error)); await current?.screenshot({ path: path.join(output, "failure.png"), fullPage: true }).catch(() => {}); process.exitCode = 1; }
finally {
  await browser.close();
  await fs.writeFile(path.join(output, "report.json"), JSON.stringify({ passed: !errors.length && !failures.length, base, checks, errors, failures, browserClosed: true, scope: "Played saved archives imported before gameplay only. Actual keyboard traversal/landing, read-only canvas markers and responsive controls. No coordinates, HP, equipment or proof injected.", archives }, null, 2));
  console.log(JSON.stringify({ passed: !errors.length && !failures.length, checks: checks.length, errors, failures }));
}
