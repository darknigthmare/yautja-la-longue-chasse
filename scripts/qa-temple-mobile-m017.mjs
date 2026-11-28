import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "playwright-core";
import { createServer } from "vite";
import { homeworldSceneSsrV78 } from "../tests/helpers/homeworld-scene-ssr-v78.mjs";
import { thresholdsCampaignRoute } from "../tests/helpers/solo-v69-played-route.mjs";
import { formationCampaignRoute } from "../tests/helpers/solo-v90-played-route.mjs";
import { stamp, templeInput, thresholdsTemple } from "../tests/helpers/solo-v70-played-route.mjs";

const { SAVE_STORAGE_KEY, parseSaveImport, exportSave } = homeworldSceneSsrV78().load("app/game/save.ts");
const earlier = thresholdsCampaignRoute().save;
const withTriad = { ...earlier, prologue: { ...earlier.prologue, templeTriadFirstM017: true } };
const prerequisites = formationCampaignRoute({ origin: withTriad, stop: "observe" }).save;
const seed = thresholdsTemple.startSoloV70Campaign(prerequisites, stamp);
assert.ok(seed);
assert.equal(seed.soloV70.receipts.length, 0);
seed.settings.masterVolume = 0;
assert.ok(parseSaveImport(exportSave(seed)).save);
const output = resolve(process.env.M017_TOUCH_OUTPUT ?? "outputs/qa-temple-mobile-m017");
const viewport = { width: 393, height: 852 };
const report = {
  source: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  admission: "Earlier chapters and V90 are completed by their production reducers. V70 has its starting state and no receipt.",
  input: "Chromium mobile emulation with real touch contacts from DevTools Protocol.",
  viewport, checks: [], pageErrors: [], passed: false,
};
await mkdir(output, { recursive: true });
let server, browser, page;
try {
  server = await createServer({ configFile: resolve("desktop/vite.config.ts"),
    server: { host: "127.0.0.1", port: 4218, strictPort: true } });
  await server.listen();
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE, args: ["--no-sandbox"] });
  const context = await browser.newContext({ viewport, isMobile: true, hasTouch: true, deviceScaleFactor: 1, reducedMotion: "reduce" });
  await context.addInitScript(({ key, snapshot }) => {
    if (sessionStorage.getItem("temple-mobile-qa")) return;
    sessionStorage.setItem("temple-mobile-qa", "1");
    localStorage.setItem(key, JSON.stringify(snapshot));
  }, { key: SAVE_STORAGE_KEY, snapshot: seed });
  page = await context.newPage();
  page.on("pageerror", err => report.pageErrors.push(err.message));
  const scene = page.locator("[data-solo-v70]");
  const canvas = scene.locator("canvas[data-solo-assets=true]");
  const read = () => canvas.evaluate(el => JSON.parse(el.dataset.soloState));
  const saved = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)), SAVE_STORAGE_KEY);
  const shot = name => page.screenshot({ path: resolve(output, name + ".png"), animations: "disabled" });
  const channel = await context.newCDPSession(page);
  const held = new Set();
  async function apply(controls) {
    if (controls.length === held.size && controls.every(key => held.has(key))) return;
    if (held.size) await channel.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    held.clear();
    if (!controls.length) return;
    const points = [];
    for (const [index, key] of controls.entries()) {
      const button = scene.locator('[data-solo-action="' + key + '"]');
      assert(await button.isEnabled(), key + " is not available on the touch panel");
      const box = await button.boundingBox();
      assert(box && box.x >= 0 && box.y >= 0 && box.x + box.width <= viewport.width + 0.5 &&
        box.y + box.height <= viewport.height + 0.5, "Touch target outside the screen: " + key);
      points.push({ x: box.x + box.width / 2, y: box.y + box.height / 2, id: index });
    }
    await channel.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: points });
    controls.forEach(key => held.add(key));
  }
  async function boot() {
    await page.locator("[data-campaign-menu]").waitFor({ timeout: 90000 });
    const campaign = page.locator('[data-menu-section="campaign"]');
    if (await campaign.isVisible()) await campaign.tap();
    await page.locator('[data-menu-action="continue"]').tap();
    await canvas.waitFor({ timeout: 90000 });
    await scene.locator('[data-solo-action="right"]').waitFor();
  }

  await page.clock.install();
  await page.goto("http://127.0.0.1:4218");
  await boot();
  assert.equal(await page.evaluate(() => matchMedia("(pointer: coarse)").matches), true);
  assert.equal((await saved()).soloV70.receipts.length, 0);
  let lastPhase = "";
  for (let index = 0; index < 5200; index++) {
    let state = await read();
    if (state.riteAdmission?.threshold) break;
    if (state.phase !== lastPhase) {
      await apply([]);
      lastPhase = state.phase;
      await page.clock.runFor(90);
      state = await read();
      report.checks.push({ phase: state.phase, room: state.room, tick: state.tick });
    }
    const alert = scene.getByRole("alert");
    if (await alert.isVisible()) throw Error(await alert.innerText());
    const action = templeInput({ ...state, previousJump: held.has("jump"),
      previousInteract: held.has("interact"), previousCommand: held.has("blade") });
    const next = [];
    if (action.move) next.push(action.move > 0 ? "right" : "left");
    if (action.jump) next.push("jump");
    if (action.command) next.push("blade");
    if (action.interact) next.push("interact");
    await apply(next);
    await page.clock.runFor(state.phase === "signs" && state.signs === 0 && state.scan >= 20 ? 15 : 50);
  }
  await apply([]);
  await page.clock.runFor(220);
  const qualified = await saved();
  const proof = qualified.soloV70.checkpoint.riteAdmission;
  assert.ok(proof?.sealedEnergy, "The three emitters must be sealed at the physical rack.");
  assert.ok(proof.threshold, "The trio must reach the quarantine threshold.");
  assert.equal(proof.sealedEnergy.positions.length, 3);
  assert.equal(proof.threshold.positions.length, 3);
  assert.ok(parseSaveImport(exportSave(qualified)).save);
  report.receipts = qualified.soloV70.receipts.map(receipt => receipt.id);
  report.proof = proof;
  await shot("01-seuil-du-temple");
  await page.reload();
  await boot();
  assert.deepEqual((await saved()).soloV70.checkpoint.riteAdmission, proof);
  assert.deepEqual((await read()).riteAdmission, proof);
  await shot("02-reprise-du-seuil");
  assert.deepEqual(report.pageErrors, []);
  report.passed = true;
} catch (err) {
  report.failure = String(err.stack ?? err);
  if (page) {
    report.view = await page.locator("body").innerText().then(s => s.slice(0, 1600)).catch(() => "");
    await page.screenshot({ path: resolve(output, "failure.png") }).catch(() => {});
  }
  throw err;
} finally {
  await writeFile(resolve(output, "report.json"), JSON.stringify(report, null, 2) + "\n");
  console.log("M017_TOUCH", JSON.stringify(report));
  await browser?.close();
  await server?.close();
}
