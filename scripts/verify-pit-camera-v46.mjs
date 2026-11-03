import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { chromium } from "playwright-core";
import { campaignFixture, enterCampaignDeck } from "./campaign-browser-helpers.mjs";
import { selectPitMatch, openPitPause, resumePitFight } from "./pit-selection-browser-helpers.mjs";

const url = process.env.V46_CAMERA_QA_URL || "http://127.0.0.1:4174";
const output = process.env.V46_CAMERA_QA_OUTPUT || "work/v46/camera-browser-qa";
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, reducedMotion: "no-preference" });
page.setDefaultTimeout(45000);
const errors = [], responses = [], checks = [];
page.on("pageerror", error => errors.push(error.message));
page.on("response", response => { if (response.status() >= 400) responses.push({ url: response.url(), status: response.status() }); });
const camera = () => page.locator("canvas[data-pit-camera-mode]").evaluate(canvas => ({
  mode: canvas.dataset.pitCameraMode,
  zoom: Number(canvas.dataset.pitCameraZoom), targetZoom: Number(canvas.dataset.pitCameraTargetZoom),
  x: Number(canvas.dataset.pitCameraCenterX), y: Number(canvas.dataset.pitCameraCenterY),
  back: Number(canvas.dataset.pitArenaBackScale), floor: Number(canvas.dataset.pitArenaFloorScale),
  fighters: JSON.parse(canvas.dataset.pitFighterPositions),
}));
const samples = async (duration = 1000) => page.evaluate(duration => new Promise(resolve => {
  const frames = [], start = performance.now();
  function sample() {
    const canvas = document.querySelector("canvas[data-pit-camera-mode]");
    frames.push({ zoom: Number(canvas.dataset.pitCameraZoom), mode: canvas.dataset.pitCameraMode,
      x: Number(canvas.dataset.pitCameraCenterX), y: Number(canvas.dataset.pitCameraCenterY),
      fighters: JSON.parse(canvas.dataset.pitFighterPositions) });
    if (performance.now() - start < duration) requestAnimationFrame(sample); else resolve(frames);
  }
  sample();
}), duration);
async function moveUntil(key, x, direction) {
  await page.keyboard.down(key);
  try {
    await page.waitForFunction(({ x, direction }) => {
      const canvas = document.querySelector("canvas[data-pit-camera-mode]");
      const current = JSON.parse(canvas.dataset.pitFighterPositions)[0].x;
      return direction === "less" ? current <= x : current >= x;
    }, { x, direction });
  } finally { await page.keyboard.up(key); }
  await page.waitForTimeout(600);
}
try {
  const fixture = structuredClone(await campaignFixture());
  fixture.save.settings.screenShake = false;
  await page.addInitScript(({ key, save }) => localStorage.setItem(key, JSON.stringify(save)), fixture);
  await enterCampaignDeck(page, { url });
  await page.getByRole("button", { name: "THE PIT · combat", exact: true }).click();
  await page.getByRole("radio", { name: /^Versus local/ }).click();
  await selectPitMatch(page, { player: "jungle-hunter", opponent: "city-hunter", arena: "the-pit" });
  await page.locator("[data-pit-match-loading]").waitFor({ state: "detached" });
  await page.waitForTimeout(500);
  const initial = await camera();
  assert.equal(initial.mode, "follow", "disabling screen shake must not freeze the dynamic camera");
  const hud = await page.locator("[data-pit-hud]").boundingBox();
  await page.locator("canvas[data-pit-camera-mode]").screenshot({ path: output + "/initial.png" });
  await moveUntil("ArrowLeft", 90, "less");
  const far = await camera();
  assert(initial.zoom - far.zoom > 0.25, JSON.stringify({ initial, far }));
  assert(initial.x - far.x > 60, "a single retreat must pan toward that fighter");
  assert.equal(far.floor, far.zoom, "floor and fighter camera share the same scale");
  assert(Math.abs(far.back - far.floor) > 0.08, "backdrop and floor use different depth factors");
  await page.locator("canvas[data-pit-camera-mode]").screenshot({ path: output + "/far.png" });
  await moveUntil("ArrowRight", 570, "greater");
  const close = await camera();
  assert(close.zoom - far.zoom > 0.5, JSON.stringify({ close, far }));
  assert.deepEqual(await page.locator("[data-pit-hud]").boundingBox(), hud, "HUD cannot move or scale with the camera");
  await page.locator("canvas[data-pit-camera-mode]").screenshot({ path: output + "/close.png" });
  checks.push({ name: "single-retreat-and-approach", initial, far, close, screenShake: false, stableHud: true });
  await page.keyboard.down("Space");
  try {
    await page.waitForFunction(() => JSON.parse(document.querySelector("canvas[data-pit-camera-mode]").dataset.pitFighterPositions)[0].y > 20);
  } finally { await page.keyboard.up("Space"); }
  const aerial = await samples();
  assert(aerial.some(frame => frame.fighters[0].y > 20), "the real input must cause a jump");
  assert(aerial.some(frame => frame.zoom < close.zoom - 0.05), "jump framing must pull back");
  assert.deepEqual(await page.locator("[data-pit-hud]").boundingBox(), hud);
  checks.push({ name: "jump-framing", minimumZoom: Math.min(...aerial.map(frame => frame.zoom)), maximumY: Math.max(...aerial.map(frame => frame.fighters[0].y)), stableHud: true });
  const control = page.locator("[data-pit-camera-control]");
  await openPitPause(page);
  await control.click();
  await resumePitFight(page);
  await page.waitForFunction(() => document.querySelector("canvas[data-pit-camera-mode]")?.dataset.pitCameraMode === "fixed");
  const fixed = await camera();
  await moveUntil("ArrowLeft", 400, "less");
  const movedFixed = await camera();
  assert.deepEqual([movedFixed.x, movedFixed.y, movedFixed.zoom], [fixed.x, fixed.y, fixed.zoom]);
  assert.equal(await control.getAttribute("aria-pressed"), "false");
  await openPitPause(page);
  await control.click();
  await resumePitFight(page);
  await page.waitForFunction(() => document.querySelector("canvas[data-pit-camera-mode]")?.dataset.pitCameraMode === "follow");
  checks.push({ name: "explicit-fixed-camera-toggle", fixed, movedFixed, restoredFollow: true });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.waitForFunction(() => document.querySelector("canvas[data-pit-camera-mode]")?.dataset.pitCameraMode === "fixed");
  assert(await control.isDisabled());
  const reduced = await camera();
  await moveUntil("ArrowLeft", 200, "less");
  const movedReduced = await camera();
  assert.deepEqual([movedReduced.x, movedReduced.y, movedReduced.zoom], [reduced.x, reduced.y, reduced.zoom]);
  assert.equal(movedReduced.back, movedReduced.floor, "reduced motion removes relative parallax");
  checks.push({ name: "system-reduced-motion", reduced, movedReduced, fixedControlDisabled: true });
  assert.deepEqual(errors, []); assert.deepEqual(responses, []);
  const report = { passed: true, checkedAt: new Date().toISOString(), url, checks, errors, responses, limits: ["Keyboard and emulated system preference; no physical controller certification.", "Replay state invariance, crossing, all roster bounds and all arenas are covered by deterministic tests."] };
  await fs.writeFile(output + "/report.json", JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify(report));
} catch (error) {
  await page.screenshot({ path: output + "/failure.png", fullPage: true }).catch(() => {});
  await fs.writeFile(output + "/failure.json", JSON.stringify({ error: String(error), checks, errors, responses, body: await page.locator("body").innerText().catch(() => null) }, null, 2));
  throw error;
} finally { await browser.close(); }
