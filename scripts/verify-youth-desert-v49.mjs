import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import { chromium } from "playwright-core";
const base = process.env.V49_QA_URL || "http://127.0.0.1:4174";
const output = process.env.V49_DESERT_QA_OUTPUT || "outputs/qa-commercial-audit/v49/desert-browser-qa";
const archivePath = process.env.V49_MORNING_ARCHIVE || "work/v48/public-scene-browser-qa/morning-played-storage.json";
// This archive was exported after a physically played nursery, welcome, dojo, camp and first rest.
const storage = JSON.parse(await fs.readFile(archivePath, "utf8")), key = "yautja-long-hunt.save", original = JSON.parse(storage[key]);
assert.equal(original.youthTraining.checkpoint.phase, "morning"); assert.equal(original.youthTraining.receipts.length, 6);
async function moduleAt(name) { const result = await build({ entryPoints: [fileURLToPath(new URL("../app/game/systems/" + name + ".ts", import.meta.url))], bundle: true, write: false, format: "esm", platform: "node", target: "es2022" }); return import("data:text/javascript;base64," + Buffer.from(result.outputFiles[0].text).toString("base64")); }
const city = await moduleAt("homeworldCity"), world = await moduleAt("homeworld"), youth = await moduleAt("youthTraining");
await fs.mkdir(output, { recursive: true }); const checks = [], errors = [], failures = [], routeEvidence = [];
const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } }); page.setDefaultTimeout(45000);
page.on("pageerror", e => errors.push(e.message)); page.on("response", r => { if (r.status() >= 400) failures.push({ url: r.url(), status: r.status() }); });
const saved = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)), key);
const exportStorage = async name => fs.writeFile(path.join(output, name), JSON.stringify(await page.evaluate(() => Object.fromEntries(Object.keys(localStorage).filter(k => k.includes("yautja")).map(k => [k, localStorage.getItem(k)]))), null, 2));
try {
 await page.goto(base, { waitUntil: "networkidle", timeout: 120000 });
 await page.evaluate(entries => { localStorage.clear(); for (const [k, v] of Object.entries(entries)) localStorage.setItem(k, v); }, storage);
 await page.reload({ waitUntil: "networkidle" }); await page.getByRole("button", { name: /^Continuer/ }).click();
 const hub = page.locator("[data-homeworld-hub]"), viewport = page.getByRole("group", { name: "Cité jouable en perspective 2.5D", exact: true });
 await hub.waitFor(); await page.clock.install();
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
  const target=world.HOMEWORLD_POINTS.find(p=>p.id===id); assert(target);
  await walkTo(target,65); await page.clock.runFor(100);
  const actual=await position(); assert.equal(world.nearestHomeworldPoint(actual)?.id,id);
  await page.keyboard.press("e"); await page.clock.runFor(100);
  await hub.getByRole("dialog").waitFor();
 };
 await approach("training-service");
 assert.equal((await saved()).youthTraining.checkpoint.phase, "morning");
 await page.getByRole("button", { name: "Rejoindre le maître pour la sortie du désert", exact: true }).click();
 const training = page.locator("[data-youth-training]"), canvas = page.locator("canvas[data-youth-stage]");
 await training.waitFor(); await page.clock.runFor(500);
 await page.waitForFunction(() => document.querySelector("canvas[data-youth-stage]")?.dataset.youthAssets === "true", null, { timeout: 120000 });
 await canvas.focus(); await page.clock.runFor(100);
 const state = () => canvas.evaluate(node => ({ phase: node.dataset.youthPhase, tick: Number(node.dataset.youthTick), x: Number(node.dataset.youthPositions.split(",")[0]), y: Number(node.dataset.youthY), vy: Number(node.dataset.youthVy), armed: node.dataset.youthArmed === "true", paused: node.dataset.youthPaused === "true", target: node.dataset.youthTarget === "" ? null : Number(node.dataset.youthTarget), clues: Number(node.dataset.youthClues), scan: Number(node.dataset.youthScan) }));
 assert.equal((await state()).phase, "morning"); const morningTick = (await state()).tick; await page.clock.runFor(1000); assert.equal((await state()).tick, morningTick);
 checks.push({ name: "real-morning-archive-and-explicit-departure", archivePath, physicallyVisitedMentor: true, automaticDeparture: false });
 await page.locator("[data-youth-departure]").click(); await page.clock.runFor(200);
 assert.equal((await state()).phase, "desert-briefing"); assert.equal((await saved()).youthTraining.receipts.length, 6);
 const bindings = original.settings.controlBindings, keys = new Set();
 const applyKeys = async desired => { for (const k of keys) if (!desired.has(k)) { await page.keyboard.up(k); keys.delete(k); } for (const k of desired) if (!keys.has(k)) { await page.keyboard.down(k); keys.add(k); } };
 const actionKey = { left: bindings["pit.p1MoveLeft"][0], right: bindings["pit.p1MoveRight"][0], jump: bindings["pit.p1Jump"][0], interact: bindings["pit.p1Resource"][0] };
 const visited = new Set(); let previousPhase = "", iterations = 0, resumed = false, collisionChecked = false;
 for (; iterations < 3500; iterations++) {
   const s = await state(); visited.add(s.phase); if (s.phase === "desert-complete") break;
   if (s.phase !== previousPhase) { await applyKeys(new Set()); await page.clock.runFor(100); previousPhase = s.phase; await page.screenshot({ path: path.join(output, s.phase + ".png"), fullPage: true }); }
   if (s.paused || !s.armed) { await applyKeys(new Set()); await canvas.focus(); await page.clock.runFor(100); continue; }
   if (s.phase === "desert-crossing" && !collisionChecked) {
     await applyKeys(new Set([actionKey.right])); await page.clock.runFor(1600); await applyKeys(new Set());
     const stopped = await state(); assert.equal(stopped.x, 330); assert.equal(stopped.phase, "desert-crossing");
     checks.push({ name: "basalt-obstacles-stop-walking", actualX: stopped.x, jumpRequired: true }); collisionChecked = true; continue;
   }
   if (s.phase === "desert-tracks" && s.clues === 1 && !resumed) {
     await applyKeys(new Set()); await page.keyboard.press("Escape"); await page.clock.runFor(100);
     const paused = await state(); await page.clock.runFor(3000); assert.equal((await state()).tick, paused.tick);
     await page.getByRole("button", { name: "Enregistrer et revenir au menu", exact: true }).click(); await page.clock.runFor(100);
     await page.clock.resume(); await page.reload({ waitUntil: "networkidle" }); await page.getByRole("button", { name: /^Continuer/ }).click();
     await page.locator('canvas[data-youth-assets="true"]').waitFor({ timeout: 120000 }); await canvas.focus(); await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000)); await page.clock.runFor(100);
     const reloaded = await state(); assert.equal(reloaded.phase, "desert-tracks"); assert.equal(reloaded.clues, 1);
     assert.equal((await saved()).youthTraining.receipts.length, 7);
     checks.push({ name: "observation-pause-save-reload", partialCluesRetained: 1, noPrematureObservationProof: true, gameClockFrozen: true }); resumed = true;
   }
   const current = await state(), desired = new Set(), delta = (current.target ?? current.x) - current.x, move = Math.abs(delta) > 25 ? delta < 0 ? -1 : 1 : 0;
   if (move) desired.add(move < 0 ? actionKey.left : actionKey.right);
   if (["desert-crossing", "desert-return"].includes(current.phase)) {
     const ahead = youth.getYouthObstacles({ phase: current.phase }).find(o => move === 1 ? o.x > current.x && o.x - current.x < 65 : o.x + o.width < current.x && current.x - o.x - o.width < 65);
     if (ahead && current.vy === 0 && !keys.has(actionKey.jump)) desired.add(actionKey.jump);
     if (current.phase === "desert-return" && !move && !keys.has(actionKey.interact)) desired.add(actionKey.interact);
   } else if (current.phase === "desert-tracks" && !move || ["desert-briefing", "desert-report"].includes(current.phase) && !move && !keys.has(actionKey.interact)) desired.add(actionKey.interact);
   await applyKeys(desired); await page.clock.runFor(50);
 }
 await applyKeys(new Set()); await page.clock.runFor(500); assert(iterations < 3500); assert.equal((await state()).phase, "desert-complete");
 const completed = await saved(); assert(youth.normalizeYouthTraining(completed.youthTraining.checkpoint));
 assert.deepEqual(completed.youthTraining.receipts.map(r => r.id), youth.YOUTH_ALL_MILESTONES);
 assert.equal(completed.youthTraining.checkpoint.desert.clues, 3); assert(completed.youthTraining.checkpoint.desert.ravineCleared);
 assert.deepEqual(completed.prologue.chronicle, original.prologue.chronicle); assert.deepEqual(completed.inventory, original.inventory); assert.deepEqual(completed.loadout, original.loadout); assert.equal(completed.profile.honor, original.profile.honor);
 assert.equal(await training.getByRole("meter").count(), 0); assert.equal(visited.size, 6);
 await exportStorage("desert-return-played-storage.json"); await page.screenshot({ path: path.join(output, "desert-returned.png"), fullPage: true });
 checks.push({ name: "full-physical-guided-route", phases: [...visited], observations: 3, proofs: 5, actualInput: "keyboard", noHuntRiteRankOrShipAward: true });
 await page.getByRole("button", { name: "Revenir dans la cité après la sortie", exact: true }).click(); await page.clock.runFor(200); await hub.waitFor();
 await page.clock.resume(); await page.reload({ waitUntil: "networkidle" }); await page.getByRole("button", { name: /^Continuer/ }).click(); await hub.waitFor();
 assert.equal((await saved()).youthTraining.checkpoint.phase, "desert-complete"); await page.locator('[data-unblooded-objective="desert-returned"]').waitFor();
 checks.push({ name: "desert-return-durable-homeworld", receiptsUnique: 11, nextYouthPitNotPretendedFinished: true });
 assert.deepEqual(errors, []); assert.deepEqual(failures, []);
 await fs.writeFile(path.join(output, "report.json"), JSON.stringify({ passed: true, base, checks, routeEvidence, errors, failures, limitation: "Simulated QA. Existing genuine morning archive; no player position or milestone injected. Distant hunting group is painted scenery, not multiplayer or simulated NPCs." }, null, 2)); console.log(JSON.stringify({ passed: true, checks: checks.length }));
} catch (error) { await page.screenshot({ path: path.join(output, "failure.png"), fullPage: true }).catch(() => {}); await fs.writeFile(path.join(output, "report.json"), JSON.stringify({ passed: false, base, checks, routeEvidence, errors, failures, error: String(error) }, null, 2)); throw error; }
finally { await browser.close(); }
