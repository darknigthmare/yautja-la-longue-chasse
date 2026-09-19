import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { build } from "esbuild";
import { chromium } from "playwright-core";

// The existing collision model only plans real keyboard input. No actor,
// progression, mission proof or save is injected into this isolated browser.
const bundle = await build({ entryPoints: ["app/game/systems/homeworldCity.ts"], bundle: true, write: false, format: "esm", platform: "node" });
const city = await import("data:text/javascript;base64," + Buffer.from(bundle.outputFiles[0].text).toString("base64"));
const root = await fs.realpath(process.cwd());
const target = new URL(process.env.V41_QA_URL || "http://127.0.0.1:4174");
assert(["http:", "https:"].includes(target.protocol) && !target.username && !target.password && !target.search && !target.hash);
const base = target.href.replace(/\/+$/, "");
const expectedVersion = process.env.V41_QA_EXPECTED_VERSION || "V41";
const output = path.resolve(root, process.env.V41_HOMEWORLD_QA_OUTPUT || "work/v41/homeworld-recovery-qa");
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
  scope: "Fresh isolated campaign; real city movement and trophy inspection. Only setItem on the campaign primary slot is fault-injected. No actor/progression/save injection; virtual gamepad is not physical hardware certification." };
const browser = await chromium.launch({ channel: "chrome", headless: true });
let page;
try {
  page = await browser.newPage({ viewport: { width: 1280, height: 900 }, acceptDownloads: false });
  page.setDefaultTimeout(20000);
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", entry => { if (entry.type() === "error") errors.push(entry.text()); });
  page.on("response", response => { if (response.status() >= 400) failures.push({ url: response.url(), status: response.status() }); });
  await page.addInitScript(() => {
    const nativeSetItem = Storage.prototype.setItem;
    window.__homeworldRecoveryQa = { blocked: false, failedVisits: [], successfulVisits: [] };
    Storage.prototype.setItem = function (key, value) {
      const qa = window.__homeworldRecoveryQa;
      if (this === localStorage && key === "yautja-long-hunt.save") {
        let visited = [];
        try { visited = JSON.parse(value).homeworld?.visitedDistrictIds ?? []; } catch { /* Diagnostic only; keep native semantics. */ }
        if (qa.blocked) {
          qa.failedVisits.push([...visited]);
          throw new DOMException("QA: campaign slot write refused", "QuotaExceededError");
        }
        const result = nativeSetItem.call(this, key, value);
        qa.successfulVisits.push([...visited]);
        return result;
      }
      return nativeSetItem.call(this, key, value);
    };
    window.__homeworldRecoveryPad = { connected: false, id: "Homeworld V41 recovery virtual QA", index: 1,
      axes: [0, 0], buttons: Array.from({ length: 16 }, () => ({ pressed: false, touched: false, value: 0 })) };
    Object.defineProperty(navigator, "getGamepads", { configurable: true, value: () => [null, window.__homeworldRecoveryPad] });
  });
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
  const segmentClear = (a, b) => {
    const count = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 6));
    for (let i = 0; i <= count; i += 1) if (!city.isHomeworldWalkable({ x: a.x + (b.x - a.x) * i / count, y: a.y + (b.y - a.y) * i / count })) return false;
    return true;
  };
  const route = (start, target, tolerance) => {
    const cell = 25, columns = Math.ceil(city.HOMEWORLD_WORLD.width / cell), rows = Math.ceil(city.HOMEWORLD_WORLD.height / cell);
    const key = point => point.y * columns + point.x;
    const startCell = { x: Math.round(start.x / cell), y: Math.round(start.y / cell) };
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
    await viewport.focus();
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
  const storageLog = () => page.evaluate(() => structuredClone(window.__homeworldRecoveryQa));
  const stableProgress = save => ({ createdAt: save.createdAt, profile: save.profile, inventory: save.inventory,
    trophies: save.trophies, homeworld: { ...save.homeworld, visitedDistrictIds: [] } });
  const retry = hub.getByRole("button", { name: "Réessayer l’enregistrement des visites", exact: true });
  const sample = (buttons = []) => page.evaluate(buttons => {
    const pad = window.__homeworldRecoveryPad; pad.connected = true;
    pad.buttons.forEach((button, index) => { button.pressed = buttons.includes(index); button.touched = button.pressed; button.value = Number(button.pressed); });
  }, buttons);
  const release = async () => { await sample(); await tick(64); };
  await walkTo(city.HOMEWORLD_POINT_POSITIONS["suspect-trophy-point"], 45);
  await hub.getByRole("button", { name: "Interagir avec le point proche", exact: true }).click();
  await hub.getByRole("dialog").getByRole("heading", { name: "Trophée du convoi", exact: true }).waitFor();
  await hub.getByRole("button", { name: "Revenir à la cité", exact: true }).click(); await tick(80);
  const before = await readSave();
  assert(before.homeworld.visitedDistrictIds.includes("port"));
  assert(before.homeworld.evidenceIds.includes("suspect-trophy"));
  assert(!before.homeworld.visitedDistrictIds.includes("market"));
  const serializedBeforeFailure = await page.evaluate(() => localStorage.getItem("yautja-long-hunt.save"));
  checks.push("Fresh campaign enters the real city, records Port and inspects the actual convoy trophy before fault injection; no seeded state.");

  await page.evaluate(() => { window.__homeworldRecoveryQa.blocked = true; });
  await walkTo({ x: 1750, y: 2000 }, 40); await tick(100);
  assert.equal(city.districtAtHomeworldPosition(await position()).id, "market");
  await retry.waitFor();
  assert(await hub.getByText(/1 visite de quartier non enregistrée/).isVisible());
  assert.equal(await page.evaluate(() => localStorage.getItem("yautja-long-hunt.save")), serializedBeforeFailure);
  const refused = await storageLog();
  assert(refused.failedVisits.length >= 1 && refused.failedVisits.some(ids => ids.includes("market")));
  const pendingAt = await position();
  await tick(3200);
  assert.equal((await storageLog()).failedVisits.length, refused.failedVisits.length, "No 60Hz retry loop while standing in the refused district");
  assert.deepEqual(await position(), pendingAt);
  checks.push("Physical crossing into Market reaches actual save refusal: pending notice appears, durable slot remains unchanged, no retry loop across 3.2 seconds.");
  await page.screenshot({ path: path.join(output, "homeworld-recovery-refused-1280.png"), fullPage: true });

  await retry.focus(); await page.keyboard.press("Enter"); await tick(100);
  assert.equal((await storageLog()).failedVisits.length, refused.failedVisits.length + 1, "One keyboard retry means one attempted write");
  await retry.waitFor(); assert(await hub.getByText(/1 visite de quartier non enregistrée/).isVisible());
  assert.equal(await hub.getByText("Visites de quartiers enregistrées.", { exact: true }).count(), 0);
  assert.equal(await page.evaluate(() => localStorage.getItem("yautja-long-hunt.save")), serializedBeforeFailure);
  checks.push("Keyboard retry while storage still refuses remains pending, attempts once, announces no successful visit and leaves the slot unchanged.");
  await page.setViewportSize({ width: 390, height: 844 }); await tick(120);
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "390px pending notice overflow");
  await page.screenshot({ path: path.join(output, "homeworld-recovery-pending-toast-390.png"), fullPage: true });
  // The existing shell toast expires after 2600ms. Preserve its transient
  // overlap separately, then prove the persistent recovery button is actionable.
  await tick(2800);
  assert.equal((await storageLog()).failedVisits.length, refused.failedVisits.length + 1);
  await retry.click({ trial: true });
  await page.screenshot({ path: path.join(output, "homeworld-recovery-pending-390.png"), fullPage: true });

  await hub.getByRole("button", { name: "Journal de la cité", exact: true }).focus(); await page.keyboard.press("Enter"); await tick(80);
  const dialog = hub.getByRole("dialog"); await dialog.waitFor();
  const dialogRetry = dialog.getByRole("button", { name: "Réessayer l’enregistrement des visites", exact: true }); await dialogRetry.waitFor();
  await release(); await sample([13]); await tick(80);
  assert(await dialogRetry.evaluate(element => document.activeElement === element), "Pad Down reaches recovery from the dialog container");
  await release();
  const successfulBefore = (await storageLog()).successfulVisits.length;
  await page.evaluate(() => { window.__homeworldRecoveryQa.blocked = false; });
  await sample([0]); await tick(240);
  assert.equal(await retry.count(), 0, "Both retry buttons disappear only after acknowledgement");
  assert(await dialog.isVisible(), "Held A after recovery cannot close the journal");
  assert(await dialog.evaluate(element => document.activeElement === element), "Focus survives removal of the acknowledged retry button");
  const after = await readSave(), successfulAfter = (await storageLog()).successfulVisits.length;
  assert.equal(successfulAfter, successfulBefore + 1, "Exactly one durable campaign write for recovery");
  assert.deepEqual(after.homeworld.visitedDistrictIds, [...before.homeworld.visitedDistrictIds, "market"]);
  assert.deepEqual(stableProgress(after), stableProgress(before), "Retry preserves evidence, profile, inventory, trophies, relations and expedition reports");
  assert(await hub.getByText("Visites de quartiers enregistrées.", { exact: true }).count() >= 1);
  checks.push("Storage restored: actual gamepad Down/A retries successfully once, removes pending buttons, preserves useful focus and cannot activate the next action with held A.");
  await release(); await sample([1]); await tick(100); await dialog.waitFor({ state: "hidden" }); await release();
  await tick(3200);
  assert.equal((await storageLog()).successfulVisits.length, successfulAfter, "No extra successful replay after acknowledgement");
  assert.deepEqual(await position(), pendingAt, "Recovery never changes city actor position");
  report.storageProof = { refusedAttempts: (await storageLog()).failedVisits.length, recoveryWrites: successfulAfter - successfulBefore,
    beforeVisited: before.homeworld.visitedDistrictIds, afterVisited: after.homeworld.visitedDistrictIds, sourceMutation: false };
  checks.push("Recovered Market visit is unique, pre-existing trophy evidence and all non-visit progression stay intact; no further save loop or actor reset.");

  await page.reload({ waitUntil: "networkidle", timeout: 120000 });
  await enterCity(); await viewport.waitFor(); await tick(180); await viewport.focus(); await tick(100);
  const reloaded = await readSave();
  assert.deepEqual(reloaded.homeworld.visitedDistrictIds, after.homeworld.visitedDistrictIds);
  assert.deepEqual(stableProgress(reloaded), stableProgress(after));
  assert.equal(await retry.count(), 0);
  assert.equal(await hub.getByRole("img", { name: /Plan de la cité : 2 quartiers visités sur/ }).count(), 1);
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "390px recovered overflow");
  await tick(2800);
  await page.screenshot({ path: path.join(output, "homeworld-recovery-reloaded-390.png"), fullPage: true });
  checks.push("Real page reload retains exactly Port+Market, prior evidence and campaign identity, with no pending visit or horizontal overflow at 390px.");
  assert.deepEqual(errors, []); assert.deepEqual(failures, []);
  report.passed = true; console.log(JSON.stringify({ passed: true, checks, output }));
} catch (error) {
  report.failure = String(error?.stack || error);
  if (page) await page.screenshot({ path: path.join(output, "failure.png"), fullPage: true }).catch(() => {});
  throw error;
} finally {
  await fs.writeFile(path.join(output, "report.json"), JSON.stringify(report, null, 2));
  await browser.close();
}
