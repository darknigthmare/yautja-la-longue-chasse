/** Read the real V100 workbook inspector and every admitted native sequence.
 * Missing art is counted explicitly; passing inspector checks never means the
 * 104 requested orientations have all been produced. */
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { build } from "esbuild";
import { chromium } from "playwright-core";
import { choosePitFighter } from "./pit-selection-browser-helpers.mjs";

const baseUrl = process.env.YAUTJA_QA_BASE_URL ?? "http://127.0.0.1:3000";
const output = path.resolve(process.env.YAUTJA_PIT_WORKBOOK_QA_OUTPUT ?? "outputs/qa-v100/pit-workbook");
assert.ok(["127.0.0.1", "localhost"].includes(new URL(baseUrl).hostname), "Local QA target required");
await fs.mkdir(output, { recursive: true });
const hash = data => createHash("sha256").update(data).digest("hex");
const sources = ["app/game/pitWorkbookAnimationV100.ts", "app/game/data/pitWorkbookAnimationPlanV100.json", "app/game/data/pitWorkbookAnimationsV100.json", "app/pit-lab/PitWorkbookAnimationLabV100.tsx", "app/pit-lab/PitWorkbookAnimationLabV100.module.css", "app/pit-lab/PitProductionAnimationLab.tsx", "app/game/PitWorkbookAnimationViewerV100.tsx", "app/game/PitWorkbookAnimationViewerV100.module.css", "app/game/PitSelectionFlow.tsx", "app/game/pitSpriteSheetAnimation.ts", "app/game/pitSpriteSheetRegistry.ts"];
const snapshot = async () => Promise.all(sources.map(async file => ({ file, sha256: hash(await fs.readFile(file)) })));
const bundled = await build({ stdin: { contents: `export * from './app/game/pitWorkbookAnimationV100';`, resolveDir: process.cwd(), loader: "ts" }, bundle: true, write: false, format: "esm", platform: "node", target: "es2022", logLevel: "silent" });
const api = await import("data:text/javascript;base64," + Buffer.from(bundled.outputFiles[0].text).toString("base64"));
const coverage = { requestedActions: 0, requestedOrientations: 0, actionsWithArt: 0, admittedActions: 0, admittedOrientations: 0, missing: [], sequences: [] };
for (const fighter of api.PIT_WORKBOOK_PLAN_V100.fighters) for (const action of fighter.actions) {
  coverage.requestedActions++; const native = api.getPitWorkbookNativeV100(fighter.fighterId, action.id);
  if (native) {
    coverage.actionsWithArt++;
    if (["right", "left"].every(facing => api.getPitWorkbookTimelineV100(native, facing).length > 0)) coverage.admittedActions++;
  }
  for (const facing of ["right", "left"]) {
    coverage.requestedOrientations++;
    const timeline = native ? api.getPitWorkbookTimelineV100(native, facing) : [];
    const distinctSourceDrawings = new Set(timeline.map(entry => { const frame = entry.clip.frames[entry.clipFrameIndex]; return JSON.stringify([native.definition.atlas.pages.find(page => page.id === frame.pageId)?.src, frame.rect]); })).size;
    const item = { fighterId: fighter.fighterId, actionId: action.id, key: action.key, cell: action.cell, facing, timelineFrames: timeline.length, distinctSourceDrawings, link: api.getPitWorkbookCombatLinkV100(fighter.fighterId, action).status };
    if (timeline.length) { coverage.admittedOrientations++; coverage.sequences.push(item); }
    else coverage.missing.push(item);
  }
}
coverage.complete = coverage.admittedOrientations === coverage.requestedOrientations;
const uniqueDrawings = new Set(), newDrawings = new Set(), historicalDrawings = new Set();
coverage.totalTimelineFrames = 0;
for (const sequence of coverage.sequences) {
  const native = api.getPitWorkbookNativeV100(sequence.fighterId, sequence.actionId);
  for (const entry of api.getPitWorkbookTimelineV100(native, sequence.facing)) {
    coverage.totalTimelineFrames++;
    const frame = entry.clip.frames[entry.clipFrameIndex], src = native.definition.atlas.pages.find(page => page.id === frame.pageId).src;
    const key = JSON.stringify([src, frame.rect]); uniqueDrawings.add(key);
    (src.startsWith("/game/sprites/v100/") ? newDrawings : historicalDrawings).add(key);
  }
}
coverage.distinctSourceDrawings = uniqueDrawings.size;
coverage.newSourceDrawings = newDrawings.size;
coverage.historicalSourceDrawings = historicalDrawings.size;
coverage.drawingCountBasis = "Distinct served PNG path and source rectangle; held timeline frames and shared rectangles are counted once.";
const nativePages = new Set();
for (const sequence of coverage.sequences) for (const page of api.getPitWorkbookNativeV100(sequence.fighterId, sequence.actionId).definition.atlas.pages) nativePages.add(page.src);
sources.push(...[...nativePages].map(src => path.join("public", src)));
const sourceBefore = await snapshot();
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE_PATH ?? "/usr/bin/chromium", headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
const context = await browser.newContext({ viewport: { width: 1440, height: 1050 }, reducedMotion: "reduce" });
const page = await context.newPage(); page.setDefaultTimeout(30000); await page.clock.install();
const errors = [], checks = [], captures = [], served = [], observations = [], publicScenes = [], reviewedPages = new Set();
const check = (name, condition, detail) => { checks.push({ name, status: condition ? "PASS" : "FAIL", ...(detail ? { detail } : {}) }); assert.ok(condition, name); };
let clockPaused = false;
page.on("pageerror", error => errors.push({ type: "pageerror", message: error.message }));
page.on("console", message => { if (message.type() === "error") errors.push({ type: "console.error", message: message.text() }); });
await context.addInitScript(() => {
  const sources = new WeakMap(), original = CanvasRenderingContext2D.prototype.drawImage;
  window.__pitWorkbookQaV100 = { draws: [] };
  CanvasRenderingContext2D.prototype.drawImage = function (...args) {
    const result = original.apply(this, args), source = args[0];
    const src = source instanceof HTMLImageElement ? new URL(source.currentSrc || source.src, location.href).pathname : sources.get(source);
    const section = this.canvas.closest("[data-pit-workbook-v100], [data-pit-animation-viewer-v100]");
    if (!section && src) sources.set(this.canvas, src);
    if (section && src && args.length === 9 && window.__pitWorkbookQaV100.draws.length < 30000) {
      const matrix = this.getTransform();
      window.__pitWorkbookQaV100.draws.push({ src, rect: args.slice(1, 5), destination: args.slice(5), matrix: [matrix.a, matrix.b, matrix.c, matrix.d, matrix.e, matrix.f], fighterId: section.dataset.fighter, actionId: section.dataset.action, facing: section.dataset.facing, index: Number(section.dataset.drawingIndex), surface: section.hasAttribute("data-pit-workbook-v100") ? "lab" : "public" });
    }
    return result;
  };
});
const root = page.locator("[data-pit-workbook-v100]"), canvas = root.locator("canvas");
async function paint() {
  const frame = page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  if (clockPaused) await page.clock.runFor(40); await frame;
}
async function screenshot(file, target = canvas) { await paint(); await target.screenshot({ path: path.join(output, file) }); captures.push({ file, viewport: page.viewportSize() }); }
const visibleAndUncovered = locator => locator.evaluate(element => {
  const rect = element.getBoundingClientRect(), hit = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
  return rect.left >= 0 && rect.right <= innerWidth && rect.top >= 0 && rect.bottom <= innerHeight && !!hit && element.contains(hit);
});
function nativeVisibleBounds(native, frame, draw) {
  // Some reviewed studies provide only their source-cell rectangle. Checking
  // that entire rectangle is conservative: every visible pixel is contained.
  const reviewed = native.definition.visibleFrameBounds?.find(bounds => bounds.pageId === frame.pageId && bounds.rect.every((value, at) => value === frame.rect[at]))?.visibleRect;
  const visible = reviewed ?? frame.rect;
  if (!draw) return null;
  const scaleX = draw.destination[2] / draw.rect[2], scaleY = draw.destination[3] / draw.rect[3];
  const bounds = { left: draw.matrix[0] * (draw.destination[0] + (visible[0] - frame.rect[0]) * scaleX) + draw.matrix[4], top: draw.matrix[3] * (draw.destination[1] + (visible[1] - frame.rect[1]) * scaleY) + draw.matrix[5] };
  bounds.right = bounds.left + visible[2] * scaleX * draw.matrix[0]; bounds.bottom = bounds.top + visible[3] * scaleY * draw.matrix[3];
  return { ...bounds, basis: reviewed ? "reviewed-visible-rectangle" : "conservative-source-cell" };
}
const insideCanvas = (bounds, size) => bounds.left >= 0 && bounds.top >= 0 && bounds.right <= size.width && bounds.bottom <= size.height;
const currentIndex = async () => Number(await root.getAttribute("data-drawing-index"));
const pixels = async () => hash(await canvas.evaluate(element => element.toDataURL("image/png")));
const status = () => root.getAttribute("data-native-status");
async function settle(condition) {
  const deadline = Date.now() + 30000;
  while (!(await condition())) {
    assert.ok(Date.now() < deadline, "Timed out waiting for the public rendered state");
    if (clockPaused) await page.clock.runFor(32);
    await new Promise(resolve => setTimeout(resolve, 10));
  }
}
async function choose(fighterId, actionId, facing) {
  await root.locator("#workbook-v100-fighter").selectOption(fighterId);
  await settle(async () => await root.getAttribute("data-fighter") === fighterId);
  await root.locator("#workbook-v100-action").selectOption(actionId);
  await settle(async () => await root.getAttribute("data-action") === actionId);
  await root.locator("#workbook-v100-facing").selectOption(facing);
  await settle(async () => await root.getAttribute("data-facing") === facing);
  await settle(async () => await status() !== "loading");
  await paint();
}
async function publicJourney() {
  await page.clock.resume(); clockPaused = false;
  await page.setViewportSize({ width: 1440, height: 1050 });
  await page.goto(baseUrl, { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.locator('[data-campaign-menu="main"]').waitFor();
  await page.getByRole("button", { name: /^The Pit/ }).click();
  await page.getByRole("button", { name: "Accéder malgré les spoilers", exact: true }).click();
  await page.getByRole("button", { name: "Entrer dans The Pit", exact: true }).click();
  await page.locator('[data-pit-selection-step="fighters"]').waitFor();
  for (const fighter of api.PIT_WORKBOOK_PLAN_V100.fighters) {
    await choosePitFighter(page, fighter.fighterId);
    const variant = page.locator("[data-pit-variant-select]");
    await variant.selectOption("");
    const entry = page.locator(`[data-pit-animation-entry-v100="${fighter.fighterId}"]`), summary = entry.locator("summary");
    await summary.click();
    const viewer = page.locator("[data-pit-animation-viewer-v100]"), publicCanvas = viewer.locator("canvas");
    await viewer.waitFor();
    check(`${fighter.fighterId}: the public appearance panel opens a real movement reader`, await viewer.getAttribute("data-fighter") === fighter.fighterId && await viewer.getByLabel(/^Mouvement/).locator("option").count() === 26);
    const nativeSequence = coverage.sequences.find(sequence => sequence.fighterId === fighter.fighterId);
    assert.ok(nativeSequence, `${fighter.fighterId} needs at least one admitted native sequence for the public journey`);
    await viewer.getByLabel(/^Mouvement/).selectOption(nativeSequence.actionId);
    await settle(async () => await viewer.getAttribute("data-action") === nativeSequence.actionId && await viewer.getAttribute("data-status") !== "loading");
    await page.clock.pauseAt(await page.evaluate(() => Date.now() + 300)); clockPaused = true;
    for (const facing of ["right", "left"]) {
      await viewer.getByLabel(/^Direction/).selectOption(facing);
      await settle(async () => await viewer.getAttribute("data-facing") === facing); await paint();
      check(`${fighter.fighterId}/${facing}: changing direction resets the public reader to native drawing zero`, await viewer.getAttribute("data-status") === "ready" && await viewer.getAttribute("data-drawing-index") === "0");
      const native = api.getPitWorkbookNativeV100(fighter.fighterId, nativeSequence.actionId), timeline = api.getPitWorkbookTimelineV100(native, facing), hashes = [];
      for (let index = 0; index < timeline.length; index++) {
        if (index) { await viewer.getByRole("button", { name: "Image suivante", exact: true }).click(); await paint(); }
        hashes.push(hash(await publicCanvas.evaluate(element => element.toDataURL("image/png"))));
        const draw = await page.evaluate(({ fighterId, actionId, facing, index }) => window.__pitWorkbookQaV100.draws.filter(draw => draw.surface === "public" && draw.fighterId === fighterId && draw.actionId === actionId && draw.facing === facing && draw.index === index).at(-1), { fighterId: fighter.fighterId, actionId: nativeSequence.actionId, facing, index });
        const frame = timeline[index].clip.frames[timeline[index].clipFrameIndex], src = native.definition.atlas.pages.find(page => page.id === frame.pageId).src;
        check(`${fighter.fighterId}/${facing}/${index}: public stepping renders the reviewed native PNG without mirroring`, !!draw && draw.src === src && draw.rect.every((value, at) => value === frame.rect[at]) && draw.matrix[0] > 0 && draw.matrix[3] > 0 && draw.matrix[1] === 0 && draw.matrix[2] === 0);
      }
      check(`${fighter.fighterId}/${facing}: public source drawings change actual Canvas pixels`, new Set(hashes).size > 1);
      await screenshot(`${fighter.fighterId}-${facing}-public-desktop.png`, viewer);
    }
    for (const action of fighter.actions.filter(action => ["TH_F", "TH_B", "jH"].includes(action.key) || api.getPitWorkbookNativeV100(fighter.fighterId, action.id)?.admission.contextLabel)) for (const facing of ["right", "left"]) {
      const native = api.getPitWorkbookNativeV100(fighter.fighterId, action.id);
      const timeline = native ? api.getPitWorkbookTimelineV100(native, facing) : [];
      if (!timeline.length) continue;
      await viewer.getByLabel(/^Mouvement/).selectOption(action.id);
      await viewer.getByLabel(/^Direction/).selectOption(facing);
      await settle(async () => await viewer.getAttribute("data-action") === action.id && await viewer.getAttribute("data-facing") === facing && await viewer.getAttribute("data-status") === "ready");
      if (native.admission.contextLabel) check(`${fighter.fighterId}/${action.cell}/${facing}: the public study names its required narrative context`, (await viewer.innerText()).includes(native.admission.contextLabel));
      // Scar's backward-throw study uses two pivot drawings before release.
      const release = fighter.fighterId === "scar" && action.key === "TH_B" ? 4 : 3;
      const index = action.key === "jH" ? timeline.length - 1 : Math.min(release, timeline.length - 1);
      for (let next = 0; next < index; next++) { await viewer.getByRole("button", { name: "Image suivante", exact: true }).click(); await settle(async () => Number(await viewer.getAttribute("data-drawing-index")) === next + 1); }
      await paint();
      const draw = await page.evaluate(({ fighterId, actionId, facing, index }) => window.__pitWorkbookQaV100.draws.filter(draw => draw.surface === "public" && draw.fighterId === fighterId && draw.actionId === actionId && draw.facing === facing && draw.index === index).at(-1), { fighterId: fighter.fighterId, actionId: action.id, facing, index });
      const frame = timeline[index].clip.frames[timeline[index].clipFrameIndex];
      const bounds = nativeVisibleBounds(native, frame, draw);
      assert.ok(bounds, "An observed native draw is required to measure the public scene envelope");
      const size = await publicCanvas.evaluate(canvas => ({ width: canvas.width, height: canvas.height }));
      check(`${fighter.fighterId}/${action.cell}/${facing}: the complete native study fits the fixed public Canvas`, insideCanvas(bounds, size), { index, bounds, size });
      publicScenes.push({ fighterId: fighter.fighterId, actionId: action.id, facing, index, bounds, size, draw });
      await screenshot(`${fighter.fighterId}-${action.key}-${facing}-public-scene.png`, viewer);
    }
    await viewer.getByLabel(/^Mouvement/).selectOption(nativeSequence.actionId);
    await viewer.getByLabel(/^Direction/).selectOption("left");
    await settle(async () => await viewer.getAttribute("data-action") === nativeSequence.actionId && await viewer.getAttribute("data-facing") === "left" && await viewer.getAttribute("data-status") === "ready");
    await viewer.getByRole("button", { name: "Recommencer", exact: true }).click();
    await viewer.getByLabel(/^Lecture/).selectOption("0.25");
    await viewer.getByRole("button", { name: "Lire le mouvement", exact: true }).click();
    const native = api.getPitWorkbookNativeV100(fighter.fighterId, nativeSequence.actionId), timeline = api.getPitWorkbookTimelineV100(native, "left");
    for (let step = 0, limit = Math.ceil(timeline[0].durationTicks60 / 60 * 1000 / .25 / 16) + 10; step < limit && await viewer.getAttribute("data-drawing-index") === "0"; step++) await page.clock.runFor(16);
    const pause = viewer.getByRole("button", { name: "Pause", exact: true });
    check(`${fighter.fighterId}: public playback advances and exposes Pause before its terminal drawing`, Number(await viewer.getAttribute("data-drawing-index")) > 0 && Number(await viewer.getAttribute("data-drawing-index")) < timeline.length - 1 && await pause.count() === 1);
    await pause.click(); const held = await viewer.getAttribute("data-drawing-index"); await page.clock.runFor(500);
    check(`${fighter.fighterId}: public Pause holds the current native drawing`, await viewer.getAttribute("data-drawing-index") === held);
    const missing = coverage.missing.filter(sequence => sequence.fighterId === fighter.fighterId).at(-1);
    if (missing) {
      await viewer.getByLabel(/^Mouvement/).selectOption(missing.actionId);
      await settle(async () => await viewer.getAttribute("data-action") === missing.actionId); await paint();
      check(`${fighter.fighterId}: unproduced gestures remain explicitly in preparation in the public reader`, await viewer.getAttribute("data-status") === "unavailable" && await viewer.getByRole("button", { name: "Lire le mouvement", exact: true }).isDisabled() && /encore en préparation/.test(await viewer.innerText()));
    }
    await viewer.getByLabel(/^Mouvement/).selectOption(nativeSequence.actionId);
    await settle(async () => await viewer.getAttribute("data-action") === nativeSequence.actionId && await viewer.getAttribute("data-status") === "ready");
    await page.setViewportSize({ width: 390, height: 844 }); await viewer.scrollIntoViewIfNeeded(); await paint();
    await publicCanvas.scrollIntoViewIfNeeded(); await paint();
    check(`${fighter.fighterId}: native Canvas remains visible and uncovered after actual mobile panel scrolling`, await visibleAndUncovered(publicCanvas));
    await screenshot(`${fighter.fighterId}-public-mobile-canvas.png`, page);
    const mobilePlay = viewer.getByRole("button", { name: "Lire le mouvement", exact: true });
    await mobilePlay.scrollIntoViewIfNeeded(); await paint();
    check(`${fighter.fighterId}: public reader fits 390px with visible and uncovered 44px playback controls`, await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth) && await mobilePlay.evaluate(element => element.getBoundingClientRect().height >= 44) && await visibleAndUncovered(mobilePlay));
    await mobilePlay.click(); await settle(async () => await viewer.getByRole("button", { name: "Pause", exact: true }).count() === 1);
    await viewer.getByRole("button", { name: "Pause", exact: true }).click();
    await screenshot(`${fighter.fighterId}-public-mobile.png`, page);
    await viewer.getByLabel(/^Mouvement/).focus(); await page.keyboard.press("Escape"); await paint();
    check(`${fighter.fighterId}: Escape closes and unmounts the viewer and restores summary focus`, await viewer.count() === 0 && await summary.evaluate(element => document.activeElement === element));
    const costumes = await variant.locator("option").evaluateAll(options => options.map(option => option.value).filter(Boolean));
    assert.ok(costumes.length, "A supplied costume is required for the appearance isolation check");
    await variant.selectOption(costumes[0]); await paint();
    await summary.click(); await viewer.waitFor();
    check(`${fighter.fighterId}: the reader explicitly names the original appearance and preserves the selected supplied costume`, await variant.inputValue() === costumes[0] && /apparence d’origine/.test(await summary.innerText()));
    await viewer.getByLabel(/^Mouvement/).focus(); await page.keyboard.press("Escape"); await paint();
    check(`${fighter.fighterId}: closing the historical BODY study preserves the selected supplied costume`, await viewer.count() === 0 && await variant.inputValue() === costumes[0]);
    await variant.selectOption(""); await page.clock.resume(); clockPaused = false;
    await page.setViewportSize({ width: 1440, height: 1050 });
  }
}
let failure = null;
try {
  if (process.env.YAUTJA_PIT_WORKBOOK_QA_DOMAINS !== "public") {
  await page.goto(new URL("/pit-lab", baseUrl).href, { waitUntil: "domcontentloaded", timeout: 120000 }); await root.waitFor();
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 500)); clockPaused = true;
  check("Workbook inspector lists exactly the two requested historical bodies", (await root.locator("#workbook-v100-fighter option").allTextContents()).length === 2);
  for (const fighter of api.PIT_WORKBOOK_PLAN_V100.fighters) {
    await root.locator("#workbook-v100-fighter").selectOption(fighter.fighterId);
    await settle(async () => await root.getAttribute("data-fighter") === fighter.fighterId); await paint();
    check(`${fighter.fighterId}: every one of the 26 exact source cells has its own selectable row`, await root.locator("tbody [data-workbook-action]").count() === 26 && (await root.locator("#workbook-v100-action option").count()) === 26);
    for (const action of fighter.actions) {
      const row = root.locator(`[data-workbook-action="${action.id}"]`);
      check(`${fighter.fighterId}/${action.cell}: UI retains the exact source gesture identity`, await row.count() === 1 && (await row.innerText()).includes(action.cell) && (await row.innerText()).includes(action.label));
    }
  }
  const missing = coverage.missing.at(-1);
  if (missing) {
    await choose(missing.fighterId, missing.actionId, missing.facing);
    check("An unproduced source gesture has no fake animation, enabled playback or borrowed facing", ["unproduced", "missing-facing"].includes(await status()) && await root.getByRole("button", { name: "Lire le geste", exact: true }).isDisabled());
    await screenshot("workbook-unproduced-source-desktop.png", root);
  }
  const missingFacing = coverage.missing.find(sequence => api.getPitWorkbookNativeV100(sequence.fighterId, sequence.actionId));
  if (missingFacing) {
    await choose(missingFacing.fighterId, missingFacing.actionId, missingFacing.facing);
    check("A native sequence with a missing facing exposes no mirrored or borrowed replacement", await status() === "missing-facing" && await root.getByRole("button", { name: "Lire le geste", exact: true }).isDisabled());
    await screenshot("workbook-missing-facing-desktop.png", root);
  }
  for (const sequence of coverage.sequences) {
    const native = api.getPitWorkbookNativeV100(sequence.fighterId, sequence.actionId), timeline = api.getPitWorkbookTimelineV100(native, sequence.facing);
    await choose(sequence.fighterId, sequence.actionId, sequence.facing);
    check(`${sequence.fighterId}/${sequence.cell}/${sequence.facing}: real native pixels load`, await status() === "ready" && await root.getAttribute("data-combat-link") === sequence.link);
    if (native.admission.contextLabel) check(`${sequence.fighterId}/${sequence.cell}/${sequence.facing}: the source inspector names the required narrative context`, (await root.innerText()).includes(native.admission.contextLabel));
    const slider = root.locator("#workbook-v100-frame");
    const canvasSize = await canvas.evaluate(canvas => ({ width: canvas.width, height: canvas.height }));
    check(`${sequence.fighterId}/${sequence.cell}/${sequence.facing}: timeline counts real admitted frames`, Number(await slider.getAttribute("max")) === timeline.length - 1 && await currentIndex() === 0);
    const hashes = [];
    for (let index = 0; index < timeline.length; index++) {
      if (index) { await slider.focus(); await page.keyboard.press("ArrowRight"); await paint(); }
      assert.equal(await currentIndex(), index);
      hashes.push(await pixels());
      const draws = await page.evaluate(() => window.__pitWorkbookQaV100.draws);
      const draw = draws.filter(draw => draw.fighterId === sequence.fighterId && draw.actionId === sequence.actionId && draw.facing === sequence.facing && draw.index === index).at(-1);
      const frame = timeline[index].clip.frames[timeline[index].clipFrameIndex];
      const pageRecord = native.definition.atlas.pages.find(page => page.id === frame.pageId);
      check(`${sequence.fighterId}/${sequence.cell}/${sequence.facing}/${index}: native Canvas draws the exact admitted PNG and rectangle without mirror`, !!draw && draw.src === pageRecord.src && draw.rect.every((value, at) => value === frame.rect[at]) && draw.matrix[0] > 0 && draw.matrix[3] > 0 && draw.matrix[1] === 0 && draw.matrix[2] === 0);
      const visibleBounds = nativeVisibleBounds(native, frame, draw);
      if (visibleBounds) check(`${sequence.fighterId}/${sequence.cell}/${sequence.facing}/${index}: the full reviewed native drawing stays inside the lab Canvas`, insideCanvas(visibleBounds, canvasSize), { bounds: visibleBounds, canvas: canvasSize });
      observations.push({ ...sequence, index, clipId: timeline[index].clipId, frameIndex: timeline[index].clipFrameIndex, hash: hashes.at(-1), draw, visibleBounds });
      if (index === Math.floor(timeline.length / 2)) await screenshot(`${sequence.fighterId}-${sequence.key}-${sequence.facing}-native.png`);
    }
    check(`${sequence.fighterId}/${sequence.cell}/${sequence.facing}: different source drawings produce different rendered pixels`, new Set(hashes).size > 1, { frames: hashes.length, distinctCanvasPixels: new Set(hashes).size });
    await root.getByRole("button", { name: "Début", exact: true }).click();
    await root.locator("#workbook-v100-speed").selectOption("0.25");
    await root.getByRole("button", { name: "Lire le geste", exact: true }).click();
    const advanceLimit = Math.ceil(timeline[0].durationTicks60 / 60 * 1000 / .25 / 16) + 10;
    for (let step = 0; step < advanceLimit && await currentIndex() === 0; step++) await page.clock.runFor(16);
    check(`${sequence.fighterId}/${sequence.cell}/${sequence.facing}: public playback advances the actual admitted timeline`, await currentIndex() > 0);
    const pause = root.getByRole("button", { name: "Pause", exact: true });
    check(`${sequence.fighterId}/${sequence.cell}/${sequence.facing}: playback can be paused before its terminal frame`, await pause.count() === 1 && await currentIndex() < timeline.length - 1);
    await pause.click();
    const held = await currentIndex(); await page.clock.runFor(500);
    check(`${sequence.fighterId}/${sequence.cell}/${sequence.facing}: pausing holds the same real drawing`, await currentIndex() === held && await root.getByRole("button", { name: "Lire le geste", exact: true }).getAttribute("aria-pressed") === "false");
    await root.getByRole("button", { name: "Début", exact: true }).click();
    await root.getByRole("button", { name: "Lire le geste", exact: true }).click();
    const completionLimit = Math.ceil(timeline.reduce((total, frame) => total + frame.durationTicks60, 0) / 60 * 1000 / .25 / 32) + timeline.length * 6;
    for (let step = 0; step < completionLimit && await root.getByRole("button", { name: "Pause", exact: true }).count(); step++) await page.clock.runFor(32);
    check(`${sequence.fighterId}/${sequence.cell}/${sequence.facing}: playback reaches and stops on the actual final drawing`, await currentIndex() === timeline.length - 1 && await root.getByRole("button", { name: "Lire le geste", exact: true }).count() === 1 && await root.getByRole("button", { name: "Lire le geste", exact: true }).getAttribute("aria-pressed") === "false");
    const finalPixels = await pixels(); await page.clock.runFor(1000);
    check(`${sequence.fighterId}/${sequence.cell}/${sequence.facing}: the final drawing remains held without an invented loop`, await currentIndex() === timeline.length - 1 && await pixels() === finalPixels);
    const usedPages = new Set(timeline.map(entry => entry.clip.frames[entry.clipFrameIndex].pageId));
    for (const pageRecord of native.definition.atlas.pages.filter(page => usedPages.has(page.id))) {
      const expected = await fs.readFile(path.join(process.cwd(), "public", pageRecord.src));
      const admission = api.PIT_WORKBOOK_ADMISSIONS_V100.find(item => item.fighterId === sequence.fighterId && item.actionId === sequence.actionId);
      const admittedHash = admission.review.sourceHashes?.[pageRecord.src] ?? (native.definition.atlas.pages.length === 1 ? admission.review.sourceSha256 : undefined);
      const reviewKey = JSON.stringify([sequence.fighterId, sequence.actionId, pageRecord.src]);
      if (!reviewedPages.has(reviewKey)) {
        check(`${sequence.fighterId}/${sequence.cell}: native PNG matches this admission's reviewed SHA: ${pageRecord.src}`, !!admittedHash && hash(expected) === admittedHash);
        reviewedPages.add(reviewKey);
      }
      if (!served.some(item => item.src === pageRecord.src)) {
        const response = await page.request.get(new URL(pageRecord.src, baseUrl).href), actual = await response.body();
        check(`Served native PNG is byte-identical: ${pageRecord.src}`, response.ok() && hash(actual) === hash(expected));
        served.push({ src: pageRecord.src, status: response.status(), bytes: actual.length, sha256: hash(actual) });
      }
    }
  }
  await page.setViewportSize({ width: 390, height: 844 }); await root.scrollIntoViewIfNeeded(); await paint();
  check("Workbook native controls fit a 390px viewport", await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await screenshot("workbook-mobile.png", root);
  }
  await publicJourney();
  check("Workbook inspector produced no browser exception", errors.length === 0);
} catch (error) {
  failure = error;
  if (checks.at(-1)?.status !== "FAIL") checks.push({ name: error.message, status: "FAIL" });
  await page.screenshot({ path: path.join(output, "failure.png"), timeout: 5000 }).catch(() => {});
} finally {
  const sourceAfter = await snapshot(), unchanged = JSON.stringify(sourceBefore) === JSON.stringify(sourceAfter);
  if (!unchanged && process.env.YAUTJA_QA_REQUIRE_FROZEN !== "0") { failure ??= Error("Runtime source changed during QA"); checks.push({ name: "Runtime source unchanged", status: "FAIL" }); }
  const result = { status: failure ? "FAIL" : coverage.complete ? "PASS" : "PASS_WITH_OPEN_ART", scope: "Actual local workbook reader with native Canvas observation and served PNG comparison. Passing UI checks does not complete missing art or add absent move mechanics.", domains: process.env.YAUTJA_PIT_WORKBOOK_QA_DOMAINS === "public" ? ["public"] : ["lab", "public"], baseUrl, browser: browser.version(), checks, coverage, captures, served, observations, publicScenes, errors, sourceBefore, sourceAfter, sourceUnchanged: unchanged, completedAt: new Date().toISOString() };
  await fs.writeFile(path.join(output, "result.json"), JSON.stringify(result, null, 2) + "\n"); await browser.close();
  console.log(JSON.stringify({ status: result.status, checks: checks.filter(item => item.status === "PASS").length, admittedOrientations: coverage.admittedOrientations, requestedOrientations: coverage.requestedOrientations, captures: captures.length, sourceUnchanged: unchanged, errors: errors.length, output }));
}
if (failure) throw failure;
