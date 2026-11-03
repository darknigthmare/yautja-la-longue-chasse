import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { build } from "esbuild";
import { chromium } from "playwright-core";

// Isolated browser seeded only with the archive of a real V47 nursery victory.
// Routes plan keyboard input; no actor, greetings, exercise proof or queue is injected.
const base = process.env.V51_HOMEWORLD_QA_URL || "http://127.0.0.1:4174";
const output = process.env.V51_HOMEWORLD_QA_OUTPUT || "outputs/qa-commercial-audit/v51/homeworld-youth-entry-browser-qa";
const archivePath = process.env.V51_PLAYED_ARCHIVE || "work/v47/nursery-scene-browser-qa/played-campaign-storage.json";
const storage = JSON.parse(await fs.readFile(archivePath, "utf8"));
const original = JSON.parse(storage["yautja-long-hunt.save"]);
assert.equal(original.prologue.status, "completed");
assert.equal(original.prologue.checkpoint.winner, "player");
assert.equal(original.homeworld.greetedNpcIds.length, 0, "Played archive must precede both actual NPC greetings");
assert.equal(original.youthTraining ?? null, null);
async function moduleAt(name) {
  const result = await build({ entryPoints: ["app/game/systems/" + name + ".ts"], bundle: true, write: false, format: "esm", platform: "node", target: "es2022" });
  return import("data:text/javascript;base64," + Buffer.from(result.outputFiles[0].text).toString("base64"));
}
const city = await moduleAt("homeworldCity"), world = await moduleAt("homeworld");
await fs.mkdir(output, { recursive: true });
const checks = [], errors = [], failures = [], routeEvidence = [];
const report = { passed: false, checkedAt: new Date().toISOString(), url: base, archivePath, checks, errors, failures, routeEvidence,
  scope: "Real keyboard route after a genuinely played nursery archive. Only primary-slot writes adding district visits receive QuotaExceededError; greetings remain writable. This is targeted fault injection, not a global full-storage certification. No actor, queue or achievement injection." };
const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, acceptDownloads: false });
page.setDefaultTimeout(45000);
page.on("pageerror", error => errors.push(error.message));
page.on("response", response => { if (response.status() >= 400) failures.push({ url: response.url(), status: response.status() }); });
const saved = () => page.evaluate(() => JSON.parse(localStorage.getItem("yautja-long-hunt.save")));
try {
  await page.addInitScript(() => {
    const nativeSet = Storage.prototype.setItem, nativeGet = Storage.prototype.getItem;
    window.__v51VisitFault = { blocked: true, refused: [], accepted: [] };
    Storage.prototype.setItem = function (key, value) {
      if (this === localStorage && key === "yautja-long-hunt.save") {
        let previous, incoming;
        try { previous = JSON.parse(nativeGet.call(this, key)); incoming = JSON.parse(value); } catch { /* Preserve native semantics. */ }
        const added = incoming?.createdAt === previous?.createdAt && Array.isArray(incoming?.homeworld?.visitedDistrictIds)
          ? incoming.homeworld.visitedDistrictIds.filter(id => !previous.homeworld.visitedDistrictIds.includes(id)) : [];
        if (added.length && window.__v51VisitFault.blocked) {
          window.__v51VisitFault.refused.push([...added]);
          throw new DOMException("V51 QA: new district write refused", "QuotaExceededError");
        }
        const result = nativeSet.call(this, key, value);
        if (added.length) window.__v51VisitFault.accepted.push([...added]);
        return result;
      }
      return nativeSet.call(this, key, value);
    };
  });
  await page.goto(base, { waitUntil: "networkidle", timeout: 120000 });
  await page.evaluate(entries => { localStorage.clear(); for (const [key, value] of Object.entries(entries)) localStorage.setItem(key, value); }, storage);
  await page.reload({ waitUntil: "networkidle" });
  await page.getByRole("button", { name: /^Continuer/ }).click();
  const hub = page.locator("[data-homeworld-hub]"); await hub.waitFor();
  const viewport = page.getByRole("group", { name: "Cité jouable en perspective 2.5D", exact: true });
  await page.locator('[data-unblooded-objective="chief"]').waitFor();
  await page.clock.install();
  const position = () => page.locator("[data-homeworld-actor]").evaluate(element => ({ x: Number(element.dataset.x), y: Number(element.dataset.y) }));
  const segmentClear = (a, b) => {
    const count = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 6));
    // Leave clearance for discrete keyboard steps and rounded DOM observations.
    for (let i = 0; i <= count; i += 1) {
      const point={x:a.x+(b.x-a.x)*i/count,y:a.y+(b.y-a.y)*i/count};
      const margin=Math.min(14,Math.hypot(point.x-a.x,point.y-a.y));
      if(!city.isHomeworldWalkable(point,{halfWidth:city.HOMEWORLD_ACTOR.halfWidth+margin,halfDepth:city.HOMEWORLD_ACTOR.halfDepth+margin}))return false;
    }
    return true;
  };
  const route = (start, target, tolerance) => {
    const cell = 25, columns = Math.ceil(city.HOMEWORLD_WORLD.width / cell), rows = Math.ceil(city.HOMEWORLD_WORLD.height / cell);
    const key = point => point.y * columns + point.x;
    const rounded = {x:Math.round(start.x/cell),y:Math.round(start.y/cell)};
    const candidates=[];
    for(let dx=-2;dx<=2;dx++)for(let dy=-2;dy<=2;dy++)candidates.push({x:rounded.x+dx,y:rounded.y+dy});
    const startCell=candidates.sort((a,b)=>Math.hypot(a.x*cell-start.x,a.y*cell-start.y)-Math.hypot(b.x*cell-start.x,b.y*cell-start.y)).find(p=>city.isHomeworldWalkable({x:p.x*cell,y:p.y*cell},{halfWidth:city.HOMEWORLD_ACTOR.halfWidth+14,halfDepth:city.HOMEWORLD_ACTOR.halfDepth+14})&&segmentClear(start,{x:p.x*cell,y:p.y*cell}));
    assert(startCell,"No safe nearby route origin");
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
        if (Math.abs(dx) > 2) keys.push(dx > 0 ? "ArrowRight" : "ArrowLeft");
        if (Math.abs(dy) > 2) keys.push(dy > 0 ? "ArrowDown" : "ArrowUp");
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



  const approach = async id => {
    const target = world.HOMEWORLD_POINTS.find(point => point.id === id); assert(target);
    await walkTo(target, 65); await page.clock.runFor(100);
    assert.equal(world.nearestHomeworldPoint(await position())?.id, id);
    await page.keyboard.press("e"); await page.clock.runFor(100);
    await hub.getByRole("dialog").waitFor();
  };
  const close = async () => {
    await hub.getByRole("button", { name: "Revenir à la cité", exact: true }).click();
    await page.clock.runFor(100);
  };
  await approach("audience-point");
  await page.locator('[data-unblooded-objective="mentor"]').waitFor(); await close();
  await approach("training-service");
  await page.locator('[data-unblooded-objective="training"]').waitFor();
  const before = await saved();
  assert(before.homeworld.greetedNpcIds.includes("hunt-king"));
  assert(before.homeworld.greetedNpcIds.includes("terrace-instructor"));
  assert.deepEqual(before.homeworld.visitedDistrictIds, original.homeworld.visitedDistrictIds);
  assert.equal(before.youthTraining ?? null, null);
  assert.deepEqual(before.prologue.chronicle, original.prologue.chronicle);
  assert.deepEqual(before.loadout, original.loadout);
  const fault = await page.evaluate(() => structuredClone(window.__v51VisitFault));
  assert(fault.refused.length > 0);
  const dialog = hub.getByRole("dialog");
  const retry = dialog.getByRole("button", { name: "Réessayer l’enregistrement des visites", exact: true });
  await retry.waitFor();
  checks.push({ name: "real-chief-and-mentor-with-refused-visits", routes: routeEvidence.length, refusedWrites: fault.refused.length, noFalseEquipmentOrTraining: true });

  await page.evaluate(() => { window.__v51VisitFault.blocked = false; });
  await page.clock.runFor(3200);
  const beforeBlockedEntry = await page.evaluate(() => localStorage.getItem("yautja-long-hunt.save"));
  await dialog.locator("[data-youth-enter-dojo]").click(); await page.clock.runFor(120);
  assert.equal(await page.locator("[data-youth-training]").count(), 0);
  assert(await dialog.isVisible());
  assert.match(await dialog.innerText(), /Des visites de quartiers restent non enregistrées/);
  assert.equal(await page.evaluate(() => localStorage.getItem("yautja-long-hunt.save")), beforeBlockedEntry);
  assert.deepEqual(await page.evaluate(() => window.__v51VisitFault.accepted), []);
  await page.screenshot({ path: path.join(output, "pending-visits-block-youth.png"), fullPage: true });
  checks.push({ name: "storage-restored-but-entry-still-preserves-pending-queue", noWrite: true, cityStillMounted: true });

  await page.clock.runFor(3200);
  const actual = await position();
  await retry.focus(); await page.keyboard.press("Enter"); await page.clock.runFor(120);
  await retry.waitFor({ state: "hidden" });
  assert(await dialog.isVisible());
  assert.deepEqual(await position(), actual);
  const recovered = await saved();
  const expectedVisits = [...new Set([...before.homeworld.visitedDistrictIds, ...fault.refused.flat()])].sort();
  assert.deepEqual([...recovered.homeworld.visitedDistrictIds].sort(), expectedVisits);
  assert.deepEqual({ ...recovered.homeworld, visitedDistrictIds: [] }, { ...before.homeworld, visitedDistrictIds: [] });
  assert.equal(recovered.youthTraining ?? null, null);
  assert.deepEqual(recovered.prologue.chronicle, before.prologue.chronicle);
  assert.deepEqual(recovered.loadout, before.loadout);
  checks.push({ name: "explicit-retry-stores-every-actual-visit-without-fake-progress", expectedVisits, positionUnchanged: true });

  await page.clock.runFor(3200);
  await dialog.locator("[data-youth-enter-dojo]").click(); await page.clock.runFor(150);
  await page.locator("[data-youth-training]").waitFor();
  // The transition can mount before its atlas finishes loading. The public
  // acceptance run must capture decoded scene art, not the loading overlay.
  await page.locator("[data-youth-training]").getByText("Chargement du dojo…", { exact: true }).waitFor({ state: "hidden" });
  await page.clock.runFor(180);
  await page.locator('canvas[data-youth-assets="true"]').waitFor();
  assert.equal(await page.locator('canvas[data-youth-assets="true"]').getAttribute("data-youth-phase"), "dojo-move");
  assert.equal(await hub.count(), 0, "The real youth transition now safely unmounts the city");
  const after = await saved();
  assert.deepEqual(after.homeworld, recovered.homeworld);
  assert.equal(after.youthTraining.status, "active");
  assert.equal(after.youthTraining.receipts.length, 0);
  assert.equal(after.youthTraining.equipment.wristblade, false);
  assert.equal(after.youthTraining.equipment.biomask, false);
  assert.deepEqual(after.prologue.chronicle, before.prologue.chronicle);
  assert.deepEqual(after.loadout, before.loadout);
  await page.screenshot({ path: path.join(output, "dojo-after-durable-visit-recovery.png"), fullPage: true });
  checks.push({ name: "dojo-enters-only-after-acknowledgement", phase: after.youthTraining.checkpoint.phase, sceneArtReady: true, visitsPreserved: true, noExercisesOrEquipmentGranted: true });
  assert.deepEqual(errors, []); assert.deepEqual(failures, []);
  report.storageProof = await page.evaluate(() => structuredClone(window.__v51VisitFault));
  report.passed = true;
  console.log(JSON.stringify({ passed: true, checks: checks.length, errors, failures }));
} catch (error) {
  report.error = String(error);
  await page.screenshot({ path: path.join(output, "failure.png"), fullPage: true }).catch(() => {});
  throw error;
} finally {
  await fs.writeFile(path.join(output, "report.json"), JSON.stringify(report, null, 2) + "\n");
  await browser.close();
}
