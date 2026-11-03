import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import { chromium } from "playwright-core";

// Read the authored collision model only to plan keyboard routes; never inject
// actor coordinates, campaign progression or render state into the browser.
const bundle = await build({ entryPoints: [fileURLToPath(new URL("../app/game/systems/homeworldCity.ts", import.meta.url))],
  bundle: true, write: false, format: "esm", platform: "node", target: "es2022" });
const city = await import("data:text/javascript;base64," + Buffer.from(bundle.outputFiles[0].text).toString("base64"));
const root = await fs.realpath(process.cwd());
const url = new URL(process.env.V38_QA_URL || "http://127.0.0.1:4174");
assert(["http:", "https:"].includes(url.protocol) && !url.username && !url.password && !url.search && !url.hash);
const base = url.href.replace(/\/+$/, "");
const output = path.resolve(root, process.env.V38_HOMEWORLD_QA_OUTPUT || "work/v38/homeworld-props-qa");
const relative = path.relative(root, output);
assert(relative && !relative.startsWith("..") && !path.isAbsolute(relative));
let directory = root;
for (const part of relative.split(path.sep)) {
  directory = path.join(directory, part);
  await fs.mkdir(directory).catch(error => { if (error.code !== "EEXIST") throw error; });
  const stat = await fs.lstat(directory);
  assert(stat.isDirectory() && !stat.isSymbolicLink() && path.relative(directory, await fs.realpath(directory)) === "", "Output must not traverse links.");
}

const errors = [], failures = [], checks = [], routeEvidence = [];
const report = { passed: false, version: "V38", checkedAt: new Date().toISOString(), url: base, checks, routeEvidence, errors, failures,
  limitation: "Isolated browser profile; keyboard movement with a controlled clock. Not a hardware frame-rate or physical gamepad test." };
const browser = await chromium.launch({ channel: "chrome", headless: true });
let page;
try {
  page = await browser.newPage({ viewport: { width: 1280, height: 900 }, acceptDownloads: false });
  page.setDefaultTimeout(20000);
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
  page.on("response", response => { if (response.status() >= 400) failures.push({ url: response.url(), status: response.status() }); });
  page.on("requestfailed", request => { const error = request.failure()?.errorText ?? "unknown";
    if (!error.includes("ERR_ABORTED")) failures.push({ url: request.url(), error }); });
  await page.goto(base, { waitUntil: "networkidle", timeout: 120000 });
  await page.locator('[data-game-content-version="V38"]').waitFor();
  await page.getByRole("button", { name: "Jouer", exact: true }).click();
  await page.getByRole("button", { name: "Yautja Prime · monde natal", exact: true }).click();
  const hub = page.locator("[data-homeworld-hub]");
  const viewport = page.getByRole("group", { name: "Cité jouable en perspective 2.5D", exact: true });
  await viewport.waitFor();
  assert.equal(await hub.locator("img[data-prop-id]").count(), 11);
  assert.equal(await page.locator("[data-nextjs-dialog], .vite-error-overlay").count(), 0);
  checks.push("Entered the playable city from the real game menu, without seeded save data.");

  const measureProps = async () => {
    const measurements = await hub.evaluate(async (element, props) => {
      const cached = new Map();
      const results = [];
      for (const prop of props) {
        const img = element.querySelector('img[data-prop-id="' + prop.id + '"]');
        await img.decode();
        if (!img.complete || img.naturalWidth === 0) throw new Error("Image not loaded: " + prop.id);
        let bounds = cached.get(img.currentSrc);
        if (!bounds) {
          const canvas = document.createElement("canvas");
          canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
          const context = canvas.getContext("2d", { willReadFrequently: true });
          context.drawImage(img, 0, 0);
          const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
          let x0 = canvas.width, y0 = canvas.height, x1 = -1, y1 = -1, transparent = 0, painted = 0;
          for (let y = 0; y < canvas.height; y += 1) for (let x = 0; x < canvas.width; x += 1) {
            const alpha = pixels[(y * canvas.width + x) * 4 + 3];
            if (alpha === 0) transparent += 1;
            if (alpha <= 8) continue;
            painted += 1; x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
          }
          bounds = { x: x0, y: y0, width: x1 - x0 + 1, height: y1 - y0 + 1, transparent, painted };
          cached.set(img.currentSrc, bounds);
          canvas.width = canvas.height = 0;
        }
        const rect = img.getBoundingClientRect(), world = img.parentElement.getBoundingClientRect(), style = getComputedStyle(img);
        const scaleX = rect.width / img.naturalWidth, scaleY = rect.height / img.naturalHeight;
        results.push({ id: prop.id, source: new URL(img.currentSrc).pathname, plane: img.dataset.plane,
          naturalWidth: img.naturalWidth, naturalHeight: img.naturalHeight, bounds,
          centerError: rect.left + (bounds.x + bounds.width / 2) * scaleX - (world.left + prop.x),
          bottomError: rect.top + (bounds.y + bounds.height) * scaleY - (world.top + prop.y),
          ratioError: scaleX - scaleY,
          paintedWidth: bounds.width * scaleX, paintedHeight: bounds.height * scaleY,
          zIndex: Number(style.zIndex), opacity: Number(style.opacity), objectFit: style.objectFit,
          fullSourceFits: Math.abs(rect.width / rect.height - img.naturalWidth / img.naturalHeight) < .001,
        });
      }
      return results;
    }, city.HOMEWORLD_PROPS);
    for (const entry of measurements) {
      const prop = city.HOMEWORLD_PROPS.find(candidate => candidate.id === entry.id);
      assert(entry.bounds.transparent > 0 && entry.bounds.painted > 0, `${entry.id}: real alpha required`);
      assert(Math.abs(entry.centerError) < .08 && Math.abs(entry.bottomError) < .08, `${entry.id}: alpha anchor ${entry.centerError}, ${entry.bottomError}`);
      assert(Math.abs(entry.ratioError) < .0001 && entry.fullSourceFits, `${entry.id}: no stretch/crop`);
      assert(entry.paintedWidth <= prop.width + .08 && entry.paintedHeight <= prop.height + .08);
      assert.equal(entry.zIndex, Math.round(prop.y) - (prop.plane === "rear" ? 180 : 0));
    }
    return measurements;
  };
  report.desktopProps = await measureProps();
  checks.push("All eleven DOM sprites decode with nonempty alpha; actual painted center/bottom, aspect, size and depth match authored sockets.");
  await page.screenshot({ path: path.join(output, "city-entry-1280.png"), fullPage: true });
  await page.clock.install();

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

  await walkTo({ x: 2675, y: 1360 }, 20);
  await page.clock.runFor(200);
  const gantry = hub.locator('[data-prop-id="training-gantry"]');
  assert(await gantry.evaluate(img => { const a = img.getBoundingClientRect(), b = document.querySelector('[role="group"][aria-label="Cité jouable en perspective 2.5D"]').getBoundingClientRect(); return a.right > b.left && a.left < b.right && a.bottom > b.top && a.top < b.bottom; }));
  await page.screenshot({ path: path.join(output, "gantry-1280.png"), fullPage: true });
  checks.push("Reached the corrected gantry through physical keyboard movement and the unchanged city collision model.");

  const front = hub.locator('[data-prop-id="arena-rib"]');
  assert.equal(await front.getAttribute("data-faded"), "false");
  await walkTo({ x: 2750, y: 850 }, 30);
  await page.clock.runFor(220);
  assert.equal(await front.getAttribute("data-faded"), "true");
  await front.evaluate(async img => { await Promise.all(img.getAnimations().map(animation => animation.finished)); });
  report.nearOpacity = Number(await front.evaluate(img => getComputedStyle(img).opacity));
  assert(Math.abs(report.nearOpacity - .14) < .02);
  assert(city.shouldFadeHomeworldForeground(city.HOMEWORLD_PROPS.find(prop => prop.id === "arena-rib"), await position()));
  await page.screenshot({ path: path.join(output, "foreground-near-1280.png"), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.clock.runFor(250);
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "390px document overflow");
  report.mobileProps = await measureProps();
  await page.screenshot({ path: path.join(output, "foreground-near-390.png"), fullPage: true });
  const beforeTouch = await position();
  const leftButton = page.getByRole("button", { name: "Marcher à gauche", exact: true });
  await leftButton.focus(); await page.keyboard.down("Space"); await page.clock.runFor(120); await page.keyboard.up("Space"); await page.clock.runFor(34);
  const afterTouch = await position();
  assert(afterTouch.x < beforeTouch.x - 10, "Mobile control produces real movement");
  await walkTo({ x: 2525, y: 925 }, 25);
  await page.clock.runFor(250);
  assert.equal(await front.getAttribute("data-faded"), "false");
  await front.evaluate(async img => { await Promise.all(img.getAnimations().map(animation => animation.finished)); });
  report.farOpacity = Number(await front.evaluate(img => getComputedStyle(img).opacity));
  assert(Math.abs(report.farOpacity - .7) < .02);
  await page.screenshot({ path: path.join(output, "foreground-far-390.png"), fullPage: true });
  checks.push("Foreground rib fades near the real actor and restores when walking away; 390px layout, all eleven anchors, and mobile movement control verified.");

  const pause = hub.getByRole("button", { name: "Pause", exact: true });
  await pause.click(); const pausedAt = await position();
  await viewport.focus(); await page.keyboard.down("ArrowRight"); await page.clock.runFor(160); await page.keyboard.up("ArrowRight");
  assert.deepEqual(await position(), pausedAt, "Pause must stop city movement");
  await hub.getByRole("button", { name: "Reprendre l’exploration", exact: true }).click();
  await page.clock.runFor(64);
  checks.push("Pause still blocks held keyboard movement and resumes normally.");
  assert.deepEqual(errors, []); assert.deepEqual(failures, []);
  report.passed = true;
  console.log(JSON.stringify({ passed: true, checks, routes: routeEvidence.length, measuredProps: 11, screenshots: 5, output }));
} catch (error) {
  report.failure = String(error?.stack || error);
  if (page) await page.screenshot({ path: path.join(output, "failure.png"), fullPage: true }).catch(() => {});
  throw error;
} finally {
  await fs.writeFile(path.join(output, "report.json"), JSON.stringify(report, null, 2));
  await browser.close();
}
