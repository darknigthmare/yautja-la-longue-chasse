import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { build } from "esbuild";
import { chromium } from "playwright-core";
import { createInquiryFixture } from "../tests/fixtures/homeworld-inquiry.mjs";

// Only prerequisites are seeded in an isolated profile before launch. Every
// inquiry stage below uses the real UI, keyboard movement and acknowledged save.
const compile = async file => {
  const bundle = await build({ entryPoints: [file], bundle: true, write: false, format: "esm", platform: "node" });
  return import("data:text/javascript;base64," + Buffer.from(bundle.outputFiles[0].text).toString("base64"));
};
const city = await compile("app/game/systems/homeworld.ts"), saves = await compile("app/game/save.ts");
const seed = saves.defaultSave("2026-09-20T12:00:00.000Z");
seed.homeworld = createInquiryFixture(city, { beacon: "disable", witness: "protect" });
const seedSlots = new Map();
const seeded = saves.writeSaveWithStatus(seed, { getItem: key => seedSlots.get(key) ?? null,
  setItem: (key, value) => seedSlots.set(key, value), removeItem: key => seedSlots.delete(key) }, "yautja-long-hunt.save");
assert.equal(seeded.persisted, true);
const serializedSeed = seedSlots.get("yautja-long-hunt.save");
const root = await fs.realpath(process.cwd());
const target = new URL(process.env.V42_QA_URL || "http://127.0.0.1:4174");
assert(["http:", "https:"].includes(target.protocol) && !target.username && !target.password && !target.search && !target.hash);
const base = target.href.replace(/\/+$/, "");
const expectedVersion = process.env.V42_QA_EXPECTED_VERSION || "V42";
const output = path.resolve(root, process.env.V42_HOMEWORLD_QA_OUTPUT || "work/v42/homeworld-inquiry-qa");
const relative = path.relative(root, output);
assert(relative && !relative.startsWith("..") && !path.isAbsolute(relative));
let directory = root;
for (const part of relative.split(path.sep)) {
  directory = path.join(directory, part);
  await fs.mkdir(directory).catch(error => { if (error.code !== "EEXIST") throw error; });
  const stat = await fs.lstat(directory);
  assert(stat.isDirectory() && !stat.isSymbolicLink() && path.relative(directory, await fs.realpath(directory)) === "", "Output cannot traverse links.");
}
const errors = [], failures = [], checks = [], routeEvidence = [];
const report = { passed: false, expectedVersion, checkedAt: new Date().toISOString(), url: base, checks, routeEvidence, errors, failures,
  scope: "Explicit isolated prerequisite fixture: validated Ash/Glass reports and first audience, not replayed expeditions. All five inquiry stages use real physical movement and UI. Only the primary slot setItem is fault-injected after seeding; no actor or progress injection during the route. Virtual gamepad is not physical hardware certification." };
const browser = await chromium.launch({ channel: "chrome", headless: true });
let page;
try {
  page = await browser.newPage({ viewport: { width: 1280, height: 900 }, acceptDownloads: false });
  page.setDefaultTimeout(20000);
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", entry => { if (entry.type() === "error") errors.push(entry.text()); });
  page.on("response", response => { if (response.status() >= 400) failures.push({ url: response.url(), status: response.status() }); });
  await page.addInitScript(serializedSeed => {
    if (!sessionStorage.getItem("v42-inquiry-fixture-initialized")) {
      localStorage.setItem("yautja-long-hunt.save", serializedSeed);
      sessionStorage.setItem("v42-inquiry-fixture-initialized", "true");
    }
    const nativeSetItem = Storage.prototype.setItem;
    window.__homeworldInquiryQa = { blocked: false, failed: [], successful: [] };
    Storage.prototype.setItem = function (key, value) {
      const qa = window.__homeworldInquiryQa;
      if (this === localStorage && key === "yautja-long-hunt.save") {
        let inquiry = null;
        try { inquiry = JSON.parse(value).homeworld?.inquiry ?? null; } catch { /* Diagnostics do not change native semantics. */ }
        if (qa.blocked) { qa.failed.push(inquiry); throw new DOMException("QA: campaign slot write refused", "QuotaExceededError"); }
        const result = nativeSetItem.call(this, key, value); qa.successful.push(inquiry); return result;
      }
      return nativeSetItem.call(this, key, value);
    };
    window.__homeworldInquiryPad = { connected: false, id: "Homeworld V42 inquiry virtual QA", index: 1,
      axes: [0, 0], buttons: Array.from({ length: 16 }, () => ({ pressed: false, touched: false, value: 0 })) };
    Object.defineProperty(navigator, "getGamepads", { configurable: true, value: () => [null, window.__homeworldInquiryPad] });
  }, serializedSeed);
  await page.clock.install();
  await page.goto(base, { waitUntil: "networkidle", timeout: 120000 });
  const enterCity = async () => {
    await page.locator('[data-game-content-version="' + expectedVersion + '"]').waitFor();
    await page.getByRole("button", { name: "Jouer", exact: true }).click();
    await page.getByRole("button", { name: "Yautja Prime · monde natal", exact: true }).click();
  };
  await enterCity();
  const hub = page.locator("[data-homeworld-hub]");
  const viewport = page.getByRole("group", { name: "Cité jouable en perspective 2.5D", exact: true });
  await viewport.waitFor(); await page.clock.runFor(180); await viewport.focus(); await page.clock.runFor(50);
  const position = () => page.locator("[data-homeworld-actor]").evaluate(element => ({ x: Number(element.dataset.x), y: Number(element.dataset.y) }));
  const safeFootprint = { halfWidth: city.HOMEWORLD_ACTOR.halfWidth + 10, halfDepth: city.HOMEWORLD_ACTOR.halfDepth + 10 };
  const segmentClear = (a, b, safe = true) => {
    const count = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 6));
    for (let i = 0; i <= count; i += 1) if (!city.isHomeworldWalkable({ x: a.x + (b.x - a.x) * i / count, y: a.y + (b.y - a.y) * i / count }, safe ? safeFootprint : undefined)) return false;
    return true;
  };
  const route = (start, target, tolerance) => {
    const cell = 25, columns = Math.ceil(city.HOMEWORLD_WORLD.width / cell), rows = Math.ceil(city.HOMEWORLD_WORLD.height / cell);
    const key = point => point.y * columns + point.x;
    const origins = [];
    for (let dx = -3; dx <= 3; dx++) for (let dy = -3; dy <= 3; dy++) {
      const candidate = { x: Math.round(start.x / cell) + dx, y: Math.round(start.y / cell) + dy };
      const point = { x: candidate.x * cell, y: candidate.y * cell };
      if (city.isHomeworldWalkable(point, safeFootprint) && segmentClear(start, point, false)) origins.push(candidate);
    }
    origins.sort((a, b) => Math.hypot(a.x * cell - start.x, a.y * cell - start.y) - Math.hypot(b.x * cell - start.x, b.y * cell - start.y));
    const startCell = origins[0]; assert(startCell, "No safe grid departure from actual actor position");
    const queue = [startCell], visited = new Map([[key(startCell), null]]);
    let end;
    for (let cursor = 0; cursor < queue.length; cursor += 1) {
      const point = queue[cursor], worldPoint = { x: point.x * cell, y: point.y * cell };
      if (Math.hypot(worldPoint.x - target.x, worldPoint.y - target.y) <= tolerance) { end = point; break; }
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
        const next = { x: point.x + dx, y: point.y + dy };
        if (next.x < 0 || next.y < 0 || next.x >= columns || next.y >= rows || visited.has(key(next))) continue;
        if (!segmentClear(worldPoint, { x: next.x * cell, y: next.y * cell })) continue;
        visited.set(key(next), point); queue.push(next);
      }
    }
    assert(end, "No collision-safe keyboard route to " + JSON.stringify(target));
    const points = [];
    for (let point = end; point; point = visited.get(key(point))) points.unshift({ x: point.x * cell, y: point.y * cell });
    const simplified = [];
    let anchor = start, cursor = 0;
    while (cursor < points.length) {
      let next = cursor;
      while (next + 1 < points.length && segmentClear(anchor, points[next + 1])) next += 1;
      simplified.push(points[next]); anchor = points[next]; cursor = next + 1;
    }
    return simplified;
  };
  const walkTo = async (target, tolerance = 20) => {
    const start = await position();
    const planned = route(start, target, tolerance);
    const points = [];
    let segmentStart = start;
    for (const endpoint of planned) {
      // Short targets keep real digital inputs close to the collision-tested
      // segment even though horizontal and depth movement have different speeds.
      const count = Math.max(1, Math.ceil(Math.hypot(endpoint.x - segmentStart.x, endpoint.y - segmentStart.y) / 25));
      for (let i = 1; i <= count; i += 1) points.push({ x: segmentStart.x + (endpoint.x - segmentStart.x) * i / count, y: segmentStart.y + (endpoint.y - segmentStart.y) * i / count });
      segmentStart = endpoint;
    }
    await page.bringToFront(); await viewport.focus(); await page.clock.runFor(64);
    assert(await page.evaluate(() => document.hasFocus()), "Keyboard route requires real document focus");
    for (const point of points) {
      for (let attempt = 0; attempt < 160; attempt += 1) {
        const current = await position(), dx = point.x - current.x, dy = point.y - current.y;
        if (Math.hypot(dx, dy) < 9) break;
        const keys = [];
        if (Math.abs(dx) > 5) keys.push(dx > 0 ? "ArrowRight" : "ArrowLeft");
        if (Math.abs(dy) > 5) keys.push(dy > 0 ? "ArrowDown" : "ArrowUp");
        const duration = Math.max(16, Math.min(100, Math.max(Math.abs(dx) / 330, Math.abs(dy) / 260) * 1000));
        for (const key of keys) await page.keyboard.down(key);
        await page.clock.runFor(duration);
        for (const key of keys) await page.keyboard.up(key);
        await page.clock.runFor(34);
        if (attempt === 159) throw new Error(`Keyboard route blocked at ${JSON.stringify(await position())}; target ${JSON.stringify(point)}`);
      }
    }
    const end = await position();
    assert(Math.hypot(end.x - target.x, end.y - target.y) <= tolerance + 12, "Keyboard target not reached");
    assert(city.isHomeworldWalkable(end), "Actual actor remains inside the collision-safe city");
    routeEvidence.push({ from: start, target, actual: end, waypoints: points.length });
  };




  const tick = (ms = 100) => page.clock.runFor(ms);
  const readSave = () => page.evaluate(() => JSON.parse(localStorage.getItem("yautja-long-hunt.save")));
  const storageLog = () => page.evaluate(() => structuredClone(window.__homeworldInquiryQa));
  const dialog = hub.getByRole("dialog");
  const inquiryPanel = dialog.getByRole("region", { name: "Contre-enquête du convoi", exact: true });
  const closeDialog = async () => {
    await dialog.getByRole("button", { name: "Revenir à la cité", exact: true }).click();
    await dialog.waitFor({ state: "hidden" }); await tick(80);
  };
  const openPoint = async id => {
    await walkTo(city.HOMEWORLD_POINT_POSITIONS[id], 70);
    assert.equal(city.nearestHomeworldPoint(await position())?.id, id, "Actual actor reaches this NPC, not a remote journal action");
    await hub.getByRole("button", { name: "Interagir avec le point proche", exact: true }).click();
    await dialog.waitFor(); await tick(80); await inquiryPanel.waitFor();
  };
  const sample = (buttons = []) => page.evaluate(buttons => {
    const pad = window.__homeworldInquiryPad; pad.connected = true;
    pad.buttons.forEach((button, index) => { button.pressed = buttons.includes(index); button.touched = button.pressed; button.value = Number(button.pressed); });
  }, buttons);
  const release = async () => { await sample(); await tick(64); };
  const original = await readSave();
  assert.equal(original.homeworld.inquiry.convoyReviewed, false);
  assert.equal(original.homeworld.audienceOutcome, "protected-witness");
  checks.push("Prerequisite reports and first audience are explicitly seeded only in this isolated QA profile; inquiry begins at zero and all later progression is UI-driven.");

  await openPoint("dock-officer-point");
  const beforeWrong = await storageLog();
  await inquiryPanel.getByRole("button", { name: "Le rapport nomme le commanditaire.", exact: true }).click(); await tick(100);
  assert.equal((await readSave()).homeworld.inquiry.convoyReviewed, false);
  assert.match(await dialog.innerText(), /pas l’identité de son commanditaire/);
  assert.equal((await storageLog()).successful.length, beforeWrong.successful.length, "Wrong deduction never writes a completed step");
  checks.push("At the physically reached dock officer, a false conclusion receives specific feedback without saving progress.");

  const correct = inquiryPanel.getByRole("button", { name: "Les deux pistes révèlent une tentative de dissimulation.", exact: true });
  const serializedBeforeRefusal = await page.evaluate(() => localStorage.getItem("yautja-long-hunt.save"));
  await page.evaluate(() => { window.__homeworldInquiryQa.blocked = true; });
  await correct.click(); await tick(100);
  assert.equal((await storageLog()).failed.length, 1);
  assert.equal(await page.evaluate(() => localStorage.getItem("yautja-long-hunt.save")), serializedBeforeRefusal);
  assert(await correct.isVisible()); assert.match(await dialog.innerText(), /Sauvegarde impossible/);
  await tick(3200); assert.equal((await storageLog()).failed.length, 1, "No frame retries");
  await page.screenshot({ path: path.join(output, "inquiry-refused-1280.png"), fullPage: true });
  await page.evaluate(() => { window.__homeworldInquiryQa.blocked = false; });
  const writesBeforeRetry = (await storageLog()).successful.length;
  await correct.focus(); await page.keyboard.press("Enter"); await tick(150);
  assert.equal((await readSave()).homeworld.inquiry.convoyReviewed, true);
  assert.equal((await storageLog()).successful.length, writesBeforeRetry + 1);
  assert.equal(await correct.count(), 0);
  checks.push("A targeted real slot refusal keeps the current option and serialized save unchanged; explicit keyboard retry after recovery advances once.");
  await closeDialog();

  await openPoint("memory-register-point");
  assert.match(await inquiryPanel.innerText(), /coupé la balise/);
  await inquiryPanel.getByRole("button", { name: "Un détournement documenté ; le responsable reste à établir.", exact: true }).click(); await tick(120);
  assert.equal((await readSave()).homeworld.inquiry.archiveReviewed, true);
  await closeDialog();

  await openPoint("enforcer-point");
  const protect = inquiryPanel.getByRole("button", { name: "Protéger la source du témoignage", exact: true });
  assert.match(await inquiryPanel.innerText(), /L’emplacement du refuge n’entre pas/);
  assert.match(await inquiryPanel.innerText(), /Recouper la chaîne/);
  await tick(2800);
  await page.screenshot({ path: path.join(output, "inquiry-branch-choice-1280.png"), fullPage: true });
  await dialog.focus(); await release(); await sample([13]); await tick(80);
  assert(await protect.evaluate(element => document.activeElement === element), "Virtual pad Down reaches the first inquiry option");
  await release(); await sample([0]); await tick(200);
  assert.equal((await readSave()).homeworld.inquiry.approach, "protect-source");
  assert(await dialog.isVisible(), "Held A cannot activate a following service or close the dialog");
  await release(); await closeDialog();
  checks.push("Physical archive and Enforcer visits validate the preserved beacon choice and an explained irreversible branch, selected by virtual pad Down/A.");

  await openPoint("witness-point");
  await inquiryPanel.getByRole("button", { name: "Consigner le témoignage anonymisé", exact: true }).click(); await tick(100);
  assert.equal((await readSave()).homeworld.inquiry.followupVerified, true);
  await closeDialog();
  await openPoint("audience-point");
  assert.match(await inquiryPanel.innerText(), /Aucun jugement Bad Blood, promotion ou trophée/);
  await inquiryPanel.getByRole("button", { name: "Remettre le complément vérifié", exact: true }).click(); await tick(100);
  const completed = await readSave(); assert.equal(completed.homeworld.inquiry.audienceFiled, true);
  assert.match(await inquiryPanel.innerText(), /témoignage anonymisé/);
  assert.equal(await inquiryPanel.getByRole("button").count(), 0, "Completed inquiry has no repeat award/action");
  for (const key of ["profile", "inventory", "trophies", "justice", "missionProgress", "createdAt"]) assert.deepEqual(completed[key], original[key]);
  for (const key of ["expeditions", "evidenceIds", "witnessChoice", "audienceOutcome"]) assert.deepEqual(completed.homeworld[key], original.homeworld[key]);
  checks.push("The protected-source branch physically returns to the witness and royal audience; completion preserves prior reports, choice, rank, inventory, trophies and justice.");
  await closeDialog();

  await page.setViewportSize({ width: 390, height: 844 }); await tick(200);
  await hub.getByRole("button", { name: "Journal de la cité", exact: true }).click(); await dialog.waitFor(); await tick(2800);
  assert.match(await dialog.innerText(), /5\/5/);
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "390px inquiry journal must not overflow horizontally");
  await page.screenshot({ path: path.join(output, "inquiry-completed-journal-390.png"), fullPage: true });
  const firstLog = await storageLog();
  report.storageProof = { refusedAttempts: firstLog.failed.length, explicitRecoveryWrites: 1,
    completion: completed.homeworld.inquiry, originalWitness: completed.homeworld.witnessChoice, originalBeacon: completed.homeworld.expeditions["glass-desert"].beaconDisposition };

  await page.reload({ waitUntil: "networkidle", timeout: 120000 }); await enterCity(); await viewport.waitFor(); await tick(180);
  const reloaded = await readSave(); assert.deepEqual(reloaded.homeworld.inquiry, completed.homeworld.inquiry);
  assert.deepEqual(reloaded.homeworld.expeditions, completed.homeworld.expeditions);
  assert.equal(await hub.locator('[data-homeworld-inquiry-step="complete"]').count(), 1);
  await hub.getByRole("button", { name: "Journal de la cité", exact: true }).click(); await dialog.waitFor();
  assert.match(await dialog.innerText(), /5\/5/);
  checks.push("390px journal shows 5/5 with no horizontal overflow; real reload retains the exact branch, completion, old reports and conclusion without reseeding.");
  assert.deepEqual(errors, []); assert.deepEqual(failures, []);
  report.passed = true; console.log(JSON.stringify({ passed: true, checks, routeEvidence, output }));
} catch (error) {
  report.failure = String(error?.stack || error);
  if (page) report.focusAtFailure = await page.evaluate(() => ({ documentFocus: document.hasFocus(), hidden: document.hidden, active: document.activeElement?.outerHTML.slice(0, 500) })).catch(() => null);
  if (page) await page.screenshot({ path: path.join(output, "failure.png"), fullPage: true }).catch(() => {});
  throw error;
} finally {
  await fs.writeFile(path.join(output, "report.json"), JSON.stringify(report, null, 2));
  await browser.close();
}
