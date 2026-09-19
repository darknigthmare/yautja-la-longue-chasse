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
const target = new URL(process.env.V40_QA_URL || "http://127.0.0.1:4174");
assert(["http:", "https:"].includes(target.protocol) && !target.username && !target.password && !target.search && !target.hash);
const base = target.href.replace(/\/+$/, "");
const expectedVersion = process.env.V40_QA_EXPECTED_VERSION || "V40";
const output = path.resolve(root, process.env.V40_ASH_QA_OUTPUT || "work/v40/ash-input-qa");
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
  scope: "Real city-to-Ash expedition route, isolated profile and virtual pad in slot 2; no saved-state injection, no hardware controller certification. Unit callbacks separately cover report failure/saving states." };
const browser = await chromium.launch({ channel: "chrome", headless: true });
let page;
try {
  page = await browser.newPage({ viewport: { width: 1280, height: 900 }, acceptDownloads: false });
  page.setDefaultTimeout(20000);
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", entry => { if (entry.type() === "error") errors.push(entry.text()); });
  page.on("response", response => { if (response.status() >= 400) failures.push({ url: response.url(), status: response.status() }); });
  await page.addInitScript(() => {
    window.__ashQaPad = { connected: false, id: "Ash V40 virtual QA", index: 2,
      axes: [0, 0], buttons: Array.from({ length: 16 }, () => ({ pressed: false, touched: false, value: 0 })) };
    Object.defineProperty(navigator, "getGamepads", { configurable: true, value: () => [null, null, window.__ashQaPad] });
  });
  await page.clock.install();
  await page.goto(base, { waitUntil: "networkidle", timeout: 120000 });
  await page.locator('[data-game-content-version="' + expectedVersion + '"]').waitFor();
  await page.getByRole("button", { name: "Jouer", exact: true }).click();
  await page.getByRole("button", { name: "Yautja Prime · monde natal", exact: true }).click();
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


  const inspect = city.HOMEWORLD_POINT_POSITIONS["suspect-trophy-point"];
  await walkTo(inspect, 45);
  await hub.getByRole("button", { name: "Interagir avec le point proche", exact: true }).click();
  await hub.getByRole("dialog").getByRole("heading", { name: "Trophée du convoi", exact: true }).waitFor();
  await hub.getByRole("button", { name: "Revenir à la cité", exact: true }).click();
  await walkTo(city.HOMEWORLD_POINT_POSITIONS["region-ash-marches"], 45);
  await hub.getByRole("button", { name: "Interagir avec le point proche", exact: true }).click();
  await hub.getByRole("button", { name: "Partir vers les Marches de Cendre", exact: true }).click();
  const expedition = page.locator('[data-homeworld-expedition="ash-marches"]');
  await expedition.waitFor(); await page.clock.runFor(180); await expedition.focus(); await page.clock.runFor(50);
  checks.push("Entered the city, physically reached and inspected the convoy trophy, then used the real unlocked Ash door; no seeded progression.");
  const actor = () => expedition.evaluate(element => ({ x: Number(element.dataset.actorX), y: Number(element.dataset.actorY) }));
  const sample = (x = 0, buttons = [], y = 0) => page.evaluate(({ x, y, buttons }) => {
    const pad = window.__ashQaPad; pad.connected = true; pad.axes = [x, y];
    pad.buttons.forEach((button, index) => { button.pressed = buttons.includes(index); button.touched = button.pressed; button.value = Number(button.pressed); });
  }, { x, y, buttons });
  const tick = (ms = 100) => page.clock.runFor(ms);
  const release = async () => { await sample(); await tick(64); };
  const preserved = async (before, reason) => assert.deepEqual(await actor(), before, reason);
  const dialog = expedition.getByRole("dialog");
  const campaign = () => page.evaluate(() => { const save = JSON.parse(localStorage.getItem("yautja-long-hunt.save"));
    return { profile: save.profile, inventory: save.inventory, trophies: save.trophies, homeworld: save.homeworld }; });
  const beforeSave = await campaign();
  const entry = await actor();
  await sample(1, [0, 3]); await tick(160); await preserved(entry, "Held inputs at controller connection cannot move/jump/interact");
  await release(); await sample(1); await tick(120); await release();
  assert((await actor()).x > entry.x + 20, "Slot-two controller moves the real actor");
  checks.push("Connected pad in slot 2: held connection inputs blocked, neutral then intentional stick moves actor.");

  await sample(0, [9]); await tick(120); await dialog.waitFor(); const pausedAt = await actor();
  await release(); await sample(0, [9]); await tick(90); await dialog.waitFor({ state: "hidden" });
  await sample(1, [9]); await tick(120); await preserved(pausedAt, "Held Start/stick cannot replay after resume");
  await release();
  checks.push("Start pauses and resumes after release, without replaying a held direction.");

  await sample(0, [1, 0]); await tick(150); await dialog.getByRole("button", { name: "Continuer l’expédition", exact: true }).waitFor();
  const modalAt = await actor();
  await release(); await sample(0, [13]); await tick(80);
  assert(await dialog.getByRole("button", { name: "Abandonner et rentrer", exact: true }).evaluate(element => element === document.activeElement));
  await release(); await sample(0, [13]); await tick(80);
  assert(await dialog.getByRole("button", { name: "Continuer l’expédition", exact: true }).evaluate(element => element === document.activeElement));
  await release(); await sample(0, [0]); await tick(130); await dialog.waitFor({ state: "hidden" });
  await preserved(modalAt, "A used to continue cannot jump on the terrain");
  await release(); await sample(0, [1]); await tick(90); await dialog.waitFor();
  await release(); await sample(1, [1]); await tick(130); await dialog.waitFor({ state: "hidden" });
  await preserved(modalAt, "B cancel cannot leak a held direction"); await release();
  checks.push("B opens confirmation safely, Down cycles real choices, A continues once and B cancels without movement or auto-abandon.");

  const settings = page.getByRole("button", { name: "Réglages", exact: true }).first();
  await settings.focus(); const focusAt = await actor(); await sample(1, [0]); await tick(100);
  await expedition.focus(); await tick(130); await preserved(focusAt, "Returning from outside focus needs neutral"); await release();
  await settings.click(); await page.getByRole("heading", { name: "Réglages du biomask", exact: true }).waitFor();
  await sample(1); await tick(120); await preserved(focusAt, "Settings suspend the expedition");
  // Use the shipped control editor, not storage mutation, to remap pause.
  await page.getByRole("button", { name: "Modifier : Pause", exact: true }).click();
  await page.keyboard.press("p");
  await page.getByRole("button", { name: "Fermer", exact: true }).click();
  await expedition.focus(); await tick(130); await preserved(focusAt, "Settings return still requires neutral"); await release();
  await page.keyboard.press("p"); await tick(80); await dialog.waitFor();
  await page.keyboard.down("p"); await tick(80); await dialog.waitFor({ state: "hidden" });
  await page.keyboard.down("p"); await tick(80); assert.equal(await dialog.count(), 0, "Repeated P cannot toggle pause");
  await page.keyboard.up("p"); await release();
  checks.push("Outside focus/settings cannot control expedition; P remapped through real UI pauses/resumes even from focused modal button, repeat ignored.");

  await page.evaluate(() => window.dispatchEvent(new Event("blur"))); await tick(80); await dialog.waitFor();
  await release(); await sample(0, [9]); await tick(100); await dialog.waitFor({ state: "hidden" }); await release();
  await expedition.focus();
  // Reach the first trace by real movement; this also verifies that the unchanged
  // objective scanner/interact commands still work after the dialog transitions.
  for (let i = 0; i < 100 && Math.abs((await actor()).x - 450) > 4; i++) {
    const x = (await actor()).x; await sample(Math.sign(450 - x)); await tick(Math.min(80, Math.max(17, Math.abs(450 - x) / 300 * 1000)));
  }
  await release(); assert(Math.abs((await actor()).x - 450) < 8);
  await sample(0, [2, 3]); await tick(100); await release();
  assert(await expedition.getByText("✓ Piste réelle", { exact: true }).isVisible());
  assert.deepEqual(await campaign(), beforeSave, "Unreported excursion cannot award campaign inventory/trophies/progression");
  checks.push("Window inactivity resumes intentionally; real movement plus X/Y inspect the nearby true trail, without awarding an unreported mission.");
  await page.screenshot({ path: path.join(output, "ash-controls-1280.png"), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 }); await tick(100);
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "390px overflow");
  await page.screenshot({ path: path.join(output, "ash-controls-390.png"), fullPage: true });
  await sample(0, [1]); await tick(100); await dialog.waitFor(); await release();
  await sample(0, [13]); await tick(80); await release(); await sample(0, [0]); await tick(100);
  await expedition.waitFor({ state: "hidden" }); await viewport.waitFor();
  assert.deepEqual(await campaign(), beforeSave, "Explicit abandoning preserves already durable progression and does not award an Ash report");
  checks.push("At 390px no horizontal overflow; deliberate B → Down → A abandons and returns to the actual city, preserving durable progression.");
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
