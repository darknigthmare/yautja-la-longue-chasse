import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { build } from "esbuild";
import { chromium } from "playwright-core";
import { campaignFixture, enterCampaignDeck } from "./campaign-browser-helpers.mjs";
import { choosePitFighter, choosePitStage, returnPitSelection, openPitSelectionOptions, closePitSelectionOptions } from "./pit-selection-browser-helpers.mjs";

const url = process.env.V50_AIR_QA_URL || "http://127.0.0.1:4174";
const output = process.env.V50_AIR_QA_OUTPUT || "outputs/qa-commercial-audit/v50/air-movement-browser-qa";
const variants = [
  ["user-ahab", "ahab-avec-casque-0c8ceb1c95"],
  ["wolf", "wolf-avec-casque-4261aca172"],
  ["falconer", "falconer-avec-casque-f5618ed362"],
  ["scarface", "scarface-avec-casque-bca00052d4"],
  ["enforcer", "enforcer-avec-casque-ca164d8925"],
  ["celtic", "celtic-avec-casque-0764ed4b53"],
];
const bundle = await build({ stdin: { contents: 'export {PIT_SPRITE_SHEET_REGISTRY} from "./app/game/pitSpriteSheetRegistry.ts";', resolveDir: process.cwd() },
  bundle: true, write: false, platform: "node", format: "esm", logLevel: "silent" });
const { PIT_SPRITE_SHEET_REGISTRY } = await import("data:text/javascript;base64," + Buffer.from(bundle.outputFiles[0].text).toString("base64"));
await fs.mkdir(output, { recursive: true });
const checks = [], errors = [], responses = [];
let browser, page;
try {
  browser = await chromium.launch({ channel: "chrome", headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, reducedMotion: "no-preference" });
  const fixture = structuredClone(await campaignFixture());
  await context.addInitScript(({ key, save }) => localStorage.setItem(key, JSON.stringify(save)), fixture);
  // Passive observer only. The real drawImage implementation always runs with
  // its original receiver and arguments. No engine state, inputs or clock change.
  await context.addInitScript(() => {
    const canvasSources = new WeakMap();
    const original = CanvasRenderingContext2D.prototype.drawImage;
    const trace = { enabled: false, slot: 0, draws: [], limit: 5000 };
    window.__pitAirV50 = trace;
    CanvasRenderingContext2D.prototype.drawImage = function (...args) {
      const result = original.apply(this, args);
      const source = args[0];
      const sourceUrl = source instanceof HTMLImageElement ? source.currentSrc || source.src : canvasSources.get(source);
      if (sourceUrl && args.length === 3) canvasSources.set(this.canvas, sourceUrl);
      if (trace.enabled && sourceUrl && sourceUrl.includes("/game/sprites/v50/") && args.length === 9 &&
        this.canvas.matches?.("canvas[data-pit-fighter-positions]") && trace.draws.length < trace.limit) {
        const positions = JSON.parse(this.canvas.dataset.pitFighterPositions);
        const transform = this.getTransform();
        trace.draws.push({ at: performance.now(), src: new URL(sourceUrl, location.href).pathname,
          rect: args.slice(1, 5), destination: args.slice(5, 9), y: positions[trace.slot].y,
          transform: { a: transform.a, b: transform.b, c: transform.c, d: transform.d } });
      }
      return result;
    };
  });
  page = await context.newPage(); page.setDefaultTimeout(45000);
  page.on("pageerror", error => errors.push(error.message.slice(0, 1000)));
  page.on("response", response => { if (response.status() >= 400) responses.push({ url: response.url(), status: response.status() }); });
  await enterCampaignDeck(page, { url });
  await page.getByRole("button", { name: "THE PIT · combat", exact: true }).click();
  for (const [fighterId, variantId] of variants) for (const slot of [0, 1]) {
    const facing = slot === 0 ? "right" : "left";
    const mode = page.getByRole("radio", { name: /^Versus local/ });
    if (!(await mode.isVisible())) await openPitSelectionOptions(page);
    await mode.click(); await closePitSelectionOptions(page);
    await choosePitFighter(page, slot === 0 ? fighterId : "jungle-hunter");
    if (slot === 0) await page.locator("[data-pit-variant-select]").selectOption(variantId);
    await page.locator("[data-pit-selection-confirm]").click();
    await choosePitFighter(page, slot === 1 ? fighterId : "jungle-hunter");
    if (slot === 1) await page.locator("[data-pit-variant-select]").selectOption(variantId);
    await page.locator("[data-pit-selection-confirm]").click();
    await choosePitStage(page, "the-pit");
    await page.waitForFunction(() => document.querySelector("[data-pit-stage-preview]")?.dataset.previewStatus === "ready");
    await page.locator("[data-pit-selection-confirm]").click();
    await page.locator("[data-pit-match-loading]").waitFor({ state: "detached" });
    await page.waitForFunction(() => document.activeElement?.getAttribute("aria-label") === "Combat THE PIT" &&
      Number(document.querySelector("[data-pit-frame]")?.dataset.pitFrame) > 3);
    const bitmap = page.locator(`[data-pit-bitmap-slot="${slot}"]`);
    assert.equal(await bitmap.getAttribute("data-pit-bitmap-id"), fighterId);
    assert.equal(await bitmap.getAttribute("data-pit-bitmap-variant"), variantId);
    const position = () => page.locator("canvas[data-pit-fighter-positions]").evaluate((canvas, index) =>
      JSON.parse(canvas.dataset.pitFighterPositions)[index], slot);
    const start = await position(); assert.equal(start.y, 0);
    await page.evaluate(slot => { window.__pitAirV50.slot = slot; window.__pitAirV50.draws = []; window.__pitAirV50.enabled = true; }, slot);
    const key = slot === 0 ? "Space" : "Numpad8";
    try {
      await page.keyboard.down(key);
      await page.waitForFunction(slot => JSON.parse(document.querySelector("canvas[data-pit-fighter-positions]").dataset.pitFighterPositions)[slot].y > 0, slot);
    } finally { await page.keyboard.up(key); }
    await page.screenshot({ path: `${output}/${fighterId}-${facing}-jump.png` });
    await page.waitForFunction(slot => JSON.parse(document.querySelector("canvas[data-pit-fighter-positions]").dataset.pitFighterPositions)[slot].y === 0, slot);
    const finish = await position(); assert.equal(finish.x, start.x); assert.equal(finish.y, 0);
    const trace = await page.evaluate(() => { window.__pitAirV50.enabled = false; return window.__pitAirV50.draws; });
    assert.ok(trace.length > 0 && trace.length < 5000, "Native V50 PNG draws must be observed without overflowing the trace");
    const nativeFrames = PIT_SPRITE_SHEET_REGISTRY.filter(entry => entry.fighterId === fighterId && entry.variantId === variantId && entry.atlas.id.endsWith("-v50"))
      .flatMap(entry => entry.atlas.clips.filter(clip => clip.facing === facing && ["pit.air.jump.rise", "pit.air.jump.fall"].includes(clip.id))
        .flatMap(clip => clip.frames.map((frame, index) => ({ clipId: clip.id, index, rect: frame.rect,
          src: entry.atlas.pages.find(candidate => candidate.id === frame.pageId).src }))));
    assert.ok(nativeFrames.length > 0);
    let previousY = 0;
    const movement = trace.filter(draw => draw.y > 0).map(draw => {
      const phase = draw.y > previousY ? "rise" : draw.y < previousY ? "fall" : "same-altitude";
      previousY = draw.y;
      return { ...draw, phase };
    });
    assert.ok(movement.some(draw => draw.phase === "rise") && movement.some(draw => draw.phase === "fall"), "The observed native image must rise and fall");
    for (const frame of nativeFrames) {
      const phase = frame.clipId.endsWith("rise") ? "rise" : "fall";
      assert.ok(movement.some(draw => draw.phase === phase && draw.src === frame.src && JSON.stringify(draw.rect) === JSON.stringify(frame.rect)),
        `${fighterId} ${facing} ${frame.clipId} frame ${frame.index} must actually be drawn during its real motion phase`);
    }
    assert.ok(movement.every(draw => draw.transform.a > 0 && draw.transform.d > 0 &&
      draw.transform.a * draw.transform.d - draw.transform.b * draw.transform.c > 0), "Authored left/right images must not be mirrored by Canvas");
    let crouch = null;
    if (fighterId === "user-ahab") {
      const owner = PIT_SPRITE_SHEET_REGISTRY.find(entry => entry.fighterId === fighterId && entry.variantId === variantId && entry.atlas.id.endsWith("-v50"));
      const clip = owner.atlas.clips.find(clip => clip.id === "crouch" && clip.facing === facing);
      assert.equal(clip.frames.length, 1); assert.equal(clip.loop, false);
      const frame = clip.frames[0];
      const expected = { src: owner.atlas.pages.find(page => page.id === frame.pageId).src, rect: frame.rect };
      // The real defaults map J2 MoveDown to Numpad2; Numpad5 is heavy attack.
      const crouchKey = slot === 0 ? "ArrowDown" : "Numpad2";
      await page.evaluate(() => { window.__pitAirV50.draws = []; window.__pitAirV50.enabled = true; });
      try {
        await page.keyboard.down(crouchKey);
        await page.waitForFunction(expected => window.__pitAirV50.draws.some(draw => draw.y === 0 && draw.src === expected.src && JSON.stringify(draw.rect) === JSON.stringify(expected.rect)), expected);
        await page.screenshot({ path: `${output}/${fighterId}-${facing}-crouch.png` });
        const groundedPosition = await position();
        assert.deepEqual(groundedPosition, finish, "Crouching must keep the same ground contact and horizontal position");
        const heldDraws = await page.evaluate(() => { window.__pitAirV50.enabled = false; return window.__pitAirV50.draws; });
        assert.ok(heldDraws.length > 0 && heldDraws.length < 5000);
        assert.ok(heldDraws.every(draw => draw.y === 0 && draw.src === expected.src && JSON.stringify(draw.rect) === JSON.stringify(expected.rect)), "Only the exact native crouch drawing may be held");
        assert.ok(heldDraws.every(draw => draw.transform.a > 0 && draw.transform.d > 0 && draw.transform.a * draw.transform.d - draw.transform.b * draw.transform.c > 0));
        crouch = { input: crouchKey, expected, groundedPosition, actualV50Draws: heldDraws.length,
          heldDraws, screenshot: `${fighterId}-${facing}-crouch.png`, reviewedGroundPivot: frame.pivot };
      } finally {
        await page.keyboard.up(crouchKey);
        await page.evaluate(() => { window.__pitAirV50.enabled = false; });
      }
    }
    checks.push({ fighterId, variantId, slot, facing, input: key, start, finish,
      nativeFrames, actualV50Draws: trace.length, movement, screenshot: `${fighterId}-${facing}-jump.png`, crouch });
    await returnPitSelection(page);
  }
  assert.equal(checks.length, 12); assert.equal(checks.filter(check => check.crouch).length, 2); assert.deepEqual(errors, []); assert.deepEqual(responses, []);
  await fs.writeFile(output + "/report.json", JSON.stringify({ passed: true, checkedAt: new Date().toISOString(), url, checks, errors, responses,
    limits: ["Fresh campaign fixture only; real keyboard, actual Canvas drawImage calls and read-only DOM positions.",
      "No combat-state or clock injection. Screenshots require separate visual review.",
      "Physics may cross zero speed between ticks; no natural apex frame or complete moveset is claimed."] }, null, 2) + "\n");
  console.log(JSON.stringify({ passed: true, checks: checks.length, output }));
} catch (error) {
  if (page) await page.screenshot({ path: output + "/failure.png" }).catch(() => {});
  await fs.writeFile(output + "/failure.json", JSON.stringify({ passed: false, error: String(error), checks, errors, responses }, null, 2) + "\n");
  console.error(error); process.exitCode = 1;
} finally { await browser?.close(); }
