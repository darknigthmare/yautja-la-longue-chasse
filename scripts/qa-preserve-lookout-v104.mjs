/** Local browser recipe. Fixtures are explicit; movement, jumps and interaction
 * go through the real mounted game. Existing browser profiles are never used. */
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { build } from "esbuild";
import { chromium } from "playwright-core";
import { campaignFixture, enterCampaignDeck } from "./campaign-browser-helpers.mjs";

const baseUrl = process.env.YAUTJA_QA_BASE_URL ?? "http://127.0.0.1:3101";
assert(["127.0.0.1", "localhost"].includes(new URL(baseUrl).hostname));
const output = path.resolve(process.env.YAUTJA_PRESERVE_V104_OUTPUT ?? "outputs/qa-preserve-v104/dev");
const reserveKey = "yautja-main-menu-bonus.v81.reserve";
await fs.mkdir(output, { recursive: true });
const sha = bytes => createHash("sha256").update(bytes).digest("hex");
const sourcePaths = ["app/game/systems/gameReserveV66.ts", "app/game/systems/gameReserveLookoutV104.ts", "app/game/systems/gameReserveTacticalV98.ts", "app/game/GameReserveV66.tsx", "app/game/GameReserveEntryV66.tsx", "app/game/GameReserveEntryV104.module.css", "app/game/GameReserveV66.module.css", "app/game/GameReserveTacticalV98.tsx", "app/game/gameReserveV66Rendering.ts", "app/game/MainMenuBonusModesV81.tsx"];
const snapshot = () => Promise.all(sourcePaths.map(async file => ({ file, sha256: sha(await fs.readFile(file)) })));
const sourceBefore = await snapshot();
const compiled = await build({ stdin: { contents: "import * as reserve from './app/game/systems/gameReserveV66'; window.__preserveLookoutQaV104=reserve;", loader: "ts", resolveDir: process.cwd() }, bundle: true, write: false, format: "iife", platform: "browser", target: "es2022", logLevel: "silent" });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE_PATH ?? "/usr/bin/chromium", headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage", "--mute-audio"] });
const contexts = [], checks = [], captures = [], fixtures = [], route = [], errors = [];
const check = (name, result) => { assert(result, name); checks.push({ name, status: "PASS" }); console.log(JSON.stringify({ check: name, status: "PASS" })); };
const canvas = page => page.locator("canvas[data-reserve-tick]");
const view = page => canvas(page).evaluate(node => ({ ...node.dataset }));
const disk = page => page.evaluate(key => JSON.parse(localStorage.getItem(key) ?? "null")?.state, reserveKey);
const diskRaw = page => page.evaluate(key => localStorage.getItem(key), reserveKey);
const createPage = async ({ clock = false, mobile = false } = {}) => {
  const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 }, reducedMotion: "reduce" });
  contexts.push(context);
  const page = await context.newPage(); page.setDefaultTimeout(30000);
  if (clock) await page.clock.install();
  page.on("pageerror", error => errors.push({ url: page.url(), message: error.message }));
  return page;
};
const capture = async (page, file, locator = page) => {
  await locator.screenshot({ path: path.join(output, file) });
  captures.push({ file, sha256: sha(await fs.readFile(path.join(output, file))), viewport: page.viewportSize() });
};
async function title(page) {
  await page.goto(baseUrl, { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.locator('[data-campaign-menu="main"]').waitFor();
}
async function entry(page, protectedProfile = false) {
  await title(page);
  await page.locator('[data-main-menu-mode="game-reserve"]').click();
  await page.getByRole("button", { name: "Accéder malgré les spoilers", exact: true }).click();
  await page.locator('[data-main-menu-bonus-entry="game-reserve"]').waitFor();
  if (!protectedProfile) await page.locator("[data-bonus-start]:not(:disabled)").waitFor();
}
async function mounted(page) {
  await page.locator("[data-bonus-start]").click();
  await page.waitForFunction(() => document.querySelector("canvas[data-reserve-assets]")?.getAttribute("data-reserve-assets") === "true");
}
async function seed(page, kind) {
  await title(page); await page.addScriptTag({ content: compiled.outputFiles[0].text });
  const receipt = await page.evaluate(({ key, kind }) => {
    const api = window.__preserveLookoutQaV104;
    const state = kind === "legacy" ? api.createGameReserveV66(104) : api.createGameReserveV104(104);
    if (kind === "quiet") for (const human of state.humans) { human.hp = 0; human.status = "down"; human.downAt = 0; human.moving = false; }
    if (kind !== "future" && !api.normalizeGameReserveV66(state)) throw Error("QA fixture rejected by the runtime normalizer");
    if (kind === "future") state.version = 3;
    localStorage.setItem(key, JSON.stringify({ version: 1, state }));
    return { kind, version: state.version, reserveId: state.reserveId, start: state.player, visited: state.visited, humansAlreadyDown: state.humans.filter(h => h.status === "down").length };
  }, { key: reserveKey, kind });
  fixtures.push(receipt);
}
async function walk(page, target) {
  let data = await view(page);
  const direction = target > Number(data.reserveX) ? 1 : -1, key = direction > 0 ? "ArrowRight" : "ArrowLeft";
  await canvas(page).focus(); await page.keyboard.down(key);
  for (let count = 0; count < 300 && (target - Number(data.reserveX)) * direction > 0; count++) {
    const remaining = Math.abs(target - Number(data.reserveX));
    await page.clock.runFor(Math.min(180, Math.max(17, Math.floor((remaining - 1) / 3.8) * 1000 / 60)));
    data = await view(page); route.push({ tick: Number(data.reserveTick), x: Number(data.reserveX), y: Number(data.reserveY), sector: data.reserveSector, input: direction > 0 ? "right" : "left" });
    assert.equal(data.reserveStatus, "active", "the geometry fixture remains active during real movement");
  }
  await page.keyboard.up(key); await page.clock.runFor(32);
  // A17ms clock slice can straddle two60Hz frames. Correct its small endpoint
  // overshoot with real opposite input; never assign the player's coordinates.
  for (let correction = 0; correction < 6; correction++) {
    data = await view(page);
    if (Math.abs(Number(data.reserveX) - target) < 5) break;
    const correctionKey = target > Number(data.reserveX) ? "ArrowRight" : "ArrowLeft";
    await page.keyboard.down(correctionKey); await page.clock.runFor(17); await page.keyboard.up(correctionKey); await page.clock.runFor(32);
    data = await view(page); route.push({ tick: Number(data.reserveTick), x: Number(data.reserveX), y: Number(data.reserveY), sector: data.reserveSector, input: correctionKey === "ArrowRight" ? "correct-right" : "correct-left" });
  }
  assert(Math.abs(Number((await view(page)).reserveX) - target) < 5, `physical walk reaches ${target}`);
}
async function jump(page, landingY, move = false) {
  await canvas(page).focus();
  if (move) await page.keyboard.down("ArrowRight");
  await page.keyboard.down("Space"); await page.clock.runFor(32); await page.keyboard.up("Space");
  let data = await view(page), landed = false;
  for (let count = 0; count < 90; count++) {
    await page.clock.runFor(17); data = await view(page);
    route.push({ tick: Number(data.reserveTick), x: Number(data.reserveX), y: Number(data.reserveY), sector: data.reserveSector, input: move ? "jump-right" : "jump" });
    if (Number(data.reserveY) === landingY && Number(data.reserveVy) === 0) { landed = true; break; }
  }
  if (move) await page.keyboard.up("ArrowRight");
  await page.clock.runFor(32);
  assert(landed, `the real jump lands on the ${landingY}-unit branch`);
}

try {
  const ordinary = await createPage();
  await entry(ordinary);
  check("The ordinary free-menu choice defaults to the historical three-sector expedition", await ordinary.locator("[data-reserve-expedition-choice]").inputValue() === "1");
  await ordinary.locator("[data-reserve-expedition-choice]").selectOption("2");
  await capture(ordinary, "choice-v2-desktop.png");
  await mounted(ordinary);
  check("Explicit V2 selection creates the four-sector expedition with the eight original living combatants", (await disk(ordinary)).version === 2 && (await disk(ordinary)).humans.filter(h => h.status === "active").length === 8 && (await view(ordinary)).reserveWorldWidth === "6400");
  await ordinary.getByRole("button", { name: "Commencer l’expédition", exact: true }).click();
  await ordinary.waitForFunction(() => Number(document.querySelector("canvas[data-reserve-tick]")?.getAttribute("data-reserve-tick")) >= 2);
  await canvas(ordinary).focus(); await ordinary.keyboard.down("ArrowRight"); await ordinary.waitForTimeout(400); await ordinary.keyboard.up("ArrowRight");
  check("Normal keyboard input moves the V2 actor", Number((await view(ordinary)).reserveX) > 125);
  await ordinary.setViewportSize({ width: 844, height: 390 });
  await ordinary.getByRole("button", { name: "Tactile", exact: true }).click();
  const touch = ordinary.locator('[data-reserve-action="right"]'), bounds = await touch.boundingBox(); assert(bounds);
  const beforeTouch = Number((await view(ordinary)).reserveX);
  await ordinary.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2); await ordinary.mouse.down(); await ordinary.waitForTimeout(400); await ordinary.mouse.up();
  check("The real V2 touch-control pointer path moves the hunter", Number((await view(ordinary)).reserveX) > beforeTouch + 10);
  check("All eight touch targets fit the landscape viewport and are at least44px", await ordinary.locator("[data-reserve-action]").evaluateAll(nodes => nodes.length === 8 && nodes.every(node => { const r = node.getBoundingClientRect(); return r.width >= 44 && r.height >= 44 && r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight; })));
  await capture(ordinary, "v2-landscape-touch.png");
  await ordinary.getByRole("button", { name: "Pause", exact: true }).click();
  await ordinary.getByRole("button", { name: "Sauvegarder et revenir au dossier", exact: true }).click();
  check("The played V2 checkpoint returns to its independent free profile", await ordinary.locator('[data-main-menu-bonus-entry="game-reserve"]').count() === 1 && (await disk(ordinary)).version === 2);

  const legacy = await createPage(); await seed(legacy, "legacy"); await entry(legacy);
  const oldRaw = await diskRaw(legacy);
  await legacy.getByRole("button", { name: "Nouvelle expédition libre…", exact: true }).click();
  await legacy.locator("[data-reserve-expedition-choice]").selectOption("2");
  await legacy.getByRole("button", { name: "Conserver l’expédition", exact: true }).click();
  check("Cancelling an explicit V2 replacement preserves the V1 document byte for byte", await diskRaw(legacy) === oldRaw);
  await mounted(legacy);
  check("Resuming V1 retains the4800-unit world and three sectors", (await view(legacy)).reserveVersion === "1" && (await view(legacy)).reserveWorldWidth === "4800" && await legacy.locator("[data-reserve-notebook][data-sector-count='3']").count() === 1);
  await capture(legacy, "legacy-v1-preserved.png");

  const campaign = await createPage(), campaignSeed = await campaignFixture();
  fixtures.push({ kind: "legacy-adult-campaign-entry", description: "Isolated legacy adult defaultSave fixture, not a campaign rite played in this browser", owner: campaignSeed.save.createdAt });
  await enterCampaignDeck(campaign, { url: baseUrl });
  await campaign.getByRole("button", { name: "Dossier de campagne", exact: true }).click();
  await campaign.getByRole("button", { name: "Mondes et réserves", exact: true }).click();
  check("The ordinary campaign dossier also defaults a new expedition to V1", await campaign.locator("[data-reserve-expedition-choice]").inputValue() === "1");
  await campaign.locator("[data-reserve-expedition-choice]").selectOption("2");
  await campaign.locator("[data-game-reserve-start]").click();
  await campaign.waitForFunction(() => document.querySelector("[data-game-reserve-campaign] canvas")?.getAttribute("data-reserve-assets") === "true");
  const campaignState = await campaign.evaluate(key => JSON.parse(localStorage.getItem(key)), campaignSeed.key);
  check("The dossier selection reaches the real campaign callback and stores an explicit V2 checkpoint", campaignState.gameReserveV66.version === 2 && campaignState.gameReserveV66.reserveId === "vharuun-lookout-expedition" && campaignState.createdAt === campaignSeed.save.createdAt);
  check("Campaign launch does not mint or overwrite an independent free profile", await diskRaw(campaign) === null);
  await capture(campaign, "campaign-v2-entry.png", campaign.getByRole("dialog"));

  const protectedPage = await createPage(); await seed(protectedPage, "future");
  const futureRaw = await diskRaw(protectedPage); await entry(protectedPage, true);
  await protectedPage.locator('[data-main-menu-bonus-entry="game-reserve"] [role="alert"]').waitFor();
  check("A future expedition remains protected and cannot be overwritten by the new choice", await protectedPage.locator("[data-bonus-start]").isDisabled() && await diskRaw(protectedPage) === futureRaw);

  const played = await createPage({ clock: true }); await seed(played, "quiet"); await entry(played); await mounted(played);
  await played.clock.pauseAt(new Date(await played.evaluate(() => Date.now() + 100)));
  await played.getByRole("button", { name: "Commencer l’expédition", exact: true }).click({ force: true }); await played.clock.runFor(160);
  await walk(played, 4620); await jump(played, 360);
  await walk(played, 4830); await jump(played, 300, true);
  await walk(played, 5190); await jump(played, 345, true);
  await walk(played, 5550); await jump(played, 280, true);
  await walk(played, 5840);
  let data = await view(played);
  check("The actor physically traverses all four sectors and jumps onto the280-unit lookout", data.reserveSector === "beacon-ridge" && Number(data.reserveY) === 280 && Number(data.reserveVy) === 0 && new Set(route.map(sample => sample.sector)).size === 4);
  await capture(played, "ridge-before-survey.png");
  await canvas(played).focus(); await played.keyboard.down("KeyE"); await played.clock.runFor(1000);
  check("Survey work is a real unfinished channel after one second", (await view(played)).reserveChannel === "survey" && Number((await view(played)).reserveChannelTicks) > 20 && (await view(played)).reserveSurvey === "pending");
  await capture(played, "ridge-survey-in-progress.png");
  await played.clock.runFor(1200); await played.keyboard.up("KeyE"); await played.clock.runFor(64);
  check("Holding the physical upper interaction completes the survey", Number.isFinite(Number((await view(played)).reserveSurvey)));
  await capture(played, "ridge-survey-recorded.png");
  await played.getByRole("button", { name: "Ouvrir le carnet de traque et suspendre la chasse", exact: true }).click({ force: true }); await played.clock.runFor(96);
  const surveyed = await disk(played), surveyedRaw = await diskRaw(played);
  check("The notebook checkpoints the exact local survey and four physical visits", surveyed.lookout.recordedAt !== null && surveyed.lookout.hunterY === 280 && Math.abs(surveyed.lookout.hunterX - 5840) <= 30 && JSON.stringify(surveyed.visited) === "[0,1,2,3]");
  check("The notebook uses four sectors and keeps distant ship inventories uninspected", await played.locator('[data-reserve-notebook][data-sector-count="4"]').count() === 1 && await played.locator('[data-reserve-escape][data-escape-phase="unknown"]').count() === 2);
  const pausedTick = (await view(played)).reserveTick; await played.clock.runFor(600);
  check("Reading the notebook pauses the real expedition", (await view(played)).reserveTick === pausedTick && await diskRaw(played) === surveyedRaw);
  await capture(played, "survey-notebook-desktop.png", played.getByRole("dialog"));
  await played.setViewportSize({ width: 390, height: 844 }); await played.clock.runFor(96);
  await played.locator("[data-reserve-notebook] h2").scrollIntoViewIfNeeded();
  check("The four-sector notebook fits a390px viewport", await played.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await capture(played, "survey-notebook-mobile.png");
  await played.clock.resume(); await entry(played); await mounted(played);
  check("Reload restores the exact V2 checkpoint and its recorded observation", await diskRaw(played) === surveyedRaw && (await view(played)).reserveVersion === "2" && Number((await view(played)).reserveX) === Math.round(surveyed.player.x));
  await played.setViewportSize({ width: 1440, height: 1000 });
  await played.clock.pauseAt(new Date(await played.evaluate(() => Date.now() + 100)));
  await played.getByRole("button", { name: "Reprendre la chasse", exact: true }).click({ force: true }); await played.clock.runFor(160);
  await walk(played, 115);
  await canvas(played).focus(); await played.keyboard.down("KeyE"); await played.clock.runFor(1200); await played.keyboard.up("KeyE"); await played.clock.runFor(64);
  const returned = await disk(played);
  check("The survey returns to extraction through real leftward movement and its final channel", returned.status === "returned" && Math.abs(returned.player.x - 115) < 5 && JSON.stringify(returned.lookout) === JSON.stringify(surveyed.lookout));
  check("The durable outcome contains no campaign inventory, rank or honor reward", !Object.hasOwn(returned, "inventory") && !Object.hasOwn(returned, "rankId") && !Object.hasOwn(returned, "honor"));
  await played.locator("[data-reserve-notebook-summary]").click({ force: true }); await played.clock.runFor(64);
  check("The closed expedition reports its completed survey without offering field actions", await played.locator("[data-reserve-survey='recorded']").innerText().then(text => text.includes("Relevé rapporté à l’extraction")) && await played.locator("[data-reserve-next-action='none']").count() === 1);
  await capture(played, "survey-returned-outcome.png", played.getByRole("dialog"));
  check("No JavaScript error occurred in the isolated browser journeys", errors.length === 0);
  const sourceAfter = await snapshot(); check("Preserve runtime sources remained unchanged during the recipe", JSON.stringify(sourceBefore) === JSON.stringify(sourceAfter));
  const report = { status: "PASS", baseUrl, checks, fixtures, captures, route, errors, sourceBefore, sourceAfter,
    outcomes: { surveyed: { tick: surveyed.tick, player: surveyed.player, visited: surveyed.visited, lookout: surveyed.lookout }, returned: { tick: returned.tick, status: returned.status, player: returned.player, visited: returned.visited, lookout: returned.lookout } },
    scope: "Real local mounted menu and Canvas. Ordinary V2 starts with eight live combatants. The full geometry/survey/return journey starts at extraction with eight already-down humans in an explicit normalized fixture; no player coordinate, visit or result is assigned during the journey. The browser clock advances real60Hz frames. Static captures require visual inspection. This does not certify a played combat victory, all80sectors,100combatants, canonical fidelity, campaign rewards or deployment." };
  await fs.writeFile(path.join(output, "result.json"), JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify({ status: "PASS", checks: checks.length, captures: captures.length, routeSamples: route.length, output }));
} catch (error) {
  await fs.writeFile(path.join(output, "failure.json"), JSON.stringify({ status: "FAIL", error: error.stack, checks, fixtures, captures, route, errors }, null, 2) + "\n");
  throw error;
} finally { await Promise.allSettled(contexts.map(context => context.close())); await browser.close(); }
