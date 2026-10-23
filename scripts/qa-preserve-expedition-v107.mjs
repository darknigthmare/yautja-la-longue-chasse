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
const output = path.resolve(process.env.YAUTJA_PRESERVE_V107_OUTPUT ?? "outputs/qa-preserve-v107/production");
const reserveKey = "yautja-main-menu-bonus.v81.reserve";
await fs.mkdir(output, { recursive: true });
const sha = bytes => createHash("sha256").update(bytes).digest("hex");
const sourcePaths = ["app/game/systems/gameReserveV66.ts", "app/game/systems/gameReserveLookoutV104.ts", "app/game/systems/gameReserveExpeditionV107.ts", "app/game/GameClient.tsx", "app/game/ClanChroniclePanel.tsx", "app/game/save.ts", "scripts/qa-preserve-expedition-v107.mjs", "app/game/systems/gameReserveTacticalV98.ts", "app/game/GameReserveV66.tsx", "app/game/GameReserveEntryV66.tsx", "app/game/GameReserveEntryV104.module.css", "app/game/GameReserveV66.module.css", "app/game/GameReserveTacticalV98.tsx", "app/game/gameReserveV66Rendering.ts", "app/game/MainMenuBonusModesV81.tsx"];
sourcePaths.push('public/game/assets/v2/environments/jungle/layers/far-lake.webp','public/game/props/v4/root-platform.png','public/game/props/v4/expedition-platform.png','public/game/props/v4/foreground-ferns.png','public/game/ship-interior/v21/wall-machinery.webp','public/game/sprites/hunter.webp','public/game/ships/v14/game-preserve-ship.webp','public/game/sprites/v7/enemies/humanoid-badblood/frontier-raider-sheet.png','public/game/sprites/v7/enemies/humanoid-badblood/colonial-marine-sheet.png','public/game/sprites/v7/enemies/humanoid-badblood/colonial-sniper-sheet.png');
const snapshot = () => Promise.all(sourcePaths.map(async file => ({ file, sha256: sha(await fs.readFile(file)) })));
const expectedBuildId = process.env.YAUTJA_QA_BUILD_ID, runtimeCommit = process.env.YAUTJA_QA_RUNTIME_COMMIT;
assert(expectedBuildId && /^[0-9a-f]{40}$/.test(runtimeCommit ?? ""), "Compiled build identity and runtime commit required");
const servedBuilds = [];
const sourceBefore = await snapshot();
const compiled = await build({ stdin: { contents: "import * as reserve from './app/game/systems/gameReserveV66'; window.__preserveExpeditionQaV107=reserve;", loader: "ts", resolveDir: process.cwd() }, bundle: true, write: false, format: "iife", platform: "browser", target: "es2022", logLevel: "silent" });
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
  const response = await page.goto(baseUrl, { waitUntil: "domcontentloaded", timeout: 120000 });
  const html = await page.content();
  servedBuilds.push({ url: page.url(), status: response?.status() ?? null, expectedBuildId, foundInHtml: html.includes(expectedBuildId), htmlSha256: sha(html) });
  assert.equal(response?.status(), 200); assert(html.includes(expectedBuildId), "The served HTML identifies the frozen compiled build");
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
    const api = window.__preserveExpeditionQaV107;
    const state = kind === "legacy" ? api.createGameReserveV66(107) : kind === "legacy-v2" ? api.createGameReserveV104(107) : api.createGameReserveV107(107);
    if (kind === "quiet") for (const human of state.humans) { human.hp = 0; human.status = "down"; human.downAt = 0; human.moving = false; }
    if (kind !== "future" && !api.normalizeGameReserveV66(state)) throw Error("QA fixture rejected by the runtime normalizer");
    if (kind === "future") state.version = 4;
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
  await ordinary.locator("[data-reserve-expedition-choice]").selectOption("3");
  await capture(ordinary, "choice-v3-desktop.png");
  await mounted(ordinary);
  check("Explicit V3 selection creates eight sectors, sixteen living adults and four physical aircraft", (await disk(ordinary)).version === 3 && (await disk(ordinary)).humans.filter(h => h.status === "active").length === 16 && (await disk(ordinary)).ships.length === 4 && (await view(ordinary)).reserveWorldWidth === "12800");
  await ordinary.getByRole("button", { name: "Commencer l’expédition", exact: true }).click();
  await ordinary.waitForFunction(() => Number(document.querySelector("canvas[data-reserve-tick]")?.getAttribute("data-reserve-tick")) >= 2);
  await canvas(ordinary).focus(); await ordinary.keyboard.down("ArrowRight"); await ordinary.waitForTimeout(400); await ordinary.keyboard.up("ArrowRight");
  check("Normal keyboard input moves the V3 actor", Number((await view(ordinary)).reserveX) > 125);
  await ordinary.setViewportSize({ width: 844, height: 390 });
  await ordinary.getByRole("button", { name: "Tactile", exact: true }).click();
  const touch = ordinary.locator('[data-reserve-action="right"]'), bounds = await touch.boundingBox(); assert(bounds);
  const beforeTouch = Number((await view(ordinary)).reserveX);
  await ordinary.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2); await ordinary.mouse.down(); await ordinary.waitForTimeout(400); await ordinary.mouse.up();
  check("The real V3 touch-control pointer path moves the hunter", Number((await view(ordinary)).reserveX) > beforeTouch + 10);
  check("All eight touch targets fit the landscape viewport and are at least44px", await ordinary.locator("[data-reserve-action]").evaluateAll(nodes => nodes.length === 8 && nodes.every(node => { const r = node.getBoundingClientRect(); return r.width >= 44 && r.height >= 44 && r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight; })));
  await capture(ordinary, "v3-landscape-touch.png");
  await ordinary.getByRole("button", { name: "Pause", exact: true }).click();
  await ordinary.getByRole("button", { name: "Sauvegarder et revenir au dossier", exact: true }).click();
  check("The played V3 checkpoint returns to its independent free profile", await ordinary.locator('[data-main-menu-bonus-entry="game-reserve"]').count() === 1 && (await disk(ordinary)).version === 3);

  const legacy = await createPage(); await seed(legacy, "legacy"); await entry(legacy);
  const oldRaw = await diskRaw(legacy);
  await legacy.getByRole("button", { name: "Nouvelle expédition libre…", exact: true }).click();
  await legacy.locator("[data-reserve-expedition-choice]").selectOption("3");
  await legacy.getByRole("button", { name: "Conserver l’expédition", exact: true }).click();
  check("Cancelling an explicit V3 replacement preserves the V1 document byte for byte", await diskRaw(legacy) === oldRaw);
  await mounted(legacy);
  check("Resuming V1 retains the4800-unit world and three sectors", (await view(legacy)).reserveVersion === "1" && (await view(legacy)).reserveWorldWidth === "4800" && await legacy.locator("[data-reserve-notebook][data-sector-count='3']").count() === 1);
  await capture(legacy, "legacy-v1-preserved.png");

  const campaign = await createPage(), campaignSeed = await campaignFixture();
  fixtures.push({ kind: "legacy-adult-campaign-entry", description: "Isolated legacy adult defaultSave fixture, not a campaign rite played in this browser", owner: campaignSeed.save.createdAt });
  await enterCampaignDeck(campaign, { url: baseUrl });
  await campaign.getByRole("button", { name: "Dossier de campagne", exact: true }).click();
  await campaign.getByRole("button", { name: "Mondes et réserves", exact: true }).click();
  check("The ordinary campaign dossier also defaults a new expedition to V1", await campaign.locator("[data-reserve-expedition-choice]").inputValue() === "1");
  await campaign.locator("[data-reserve-expedition-choice]").selectOption("3");
  await campaign.locator("[data-game-reserve-start]").click();
  await campaign.waitForFunction(() => document.querySelector("[data-game-reserve-campaign] canvas")?.getAttribute("data-reserve-assets") === "true");
  const campaignState = await campaign.evaluate(key => JSON.parse(localStorage.getItem(key)), campaignSeed.key);
  check("The dossier selection reaches the real campaign callback and stores an explicit V3 checkpoint", campaignState.gameReserveV66.version === 3 && campaignState.gameReserveV66.reserveId === "vharuun-transect-expedition" && campaignState.createdAt === campaignSeed.save.createdAt);
  check("Campaign launch does not mint or overwrite an independent free profile", await diskRaw(campaign) === null);
  await capture(campaign, "campaign-v3-entry.png", campaign.getByRole("dialog"));

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
  check("Survey work is a real unfinished channel after one second", (await view(played)).reserveChannel === "survey" && Number((await view(played)).reserveChannelTicks) > 20 && Number((await view(played)).reserveRouteRecorded) === 0);
  await capture(played, "ridge-survey-in-progress.png");
  await played.clock.runFor(1200); await played.keyboard.up("KeyE"); await played.clock.runFor(64);
  check("Holding the physical upper interaction completes the survey", (await view(played)).reserveRouteRecorded === "1");
  await capture(played, "ridge-survey-recorded.png");
  await walk(played, 7410);
  await canvas(played).focus(); await played.keyboard.down("KeyE"); await played.clock.runFor(2200); await played.keyboard.up("KeyE"); await played.clock.runFor(64);
  check("The root-basin ground post records independently through its physical channel", (await view(played)).reserveRouteRecorded === "2" && (await view(played)).reserveSector === "root-basin");
  await capture(played, "root-basin-recorded.png");
  await walk(played, 8170); await jump(played, 365);
  await walk(played, 8370); await jump(played, 294, true);
  await walk(played, 8735); await jump(played, 226, true); await walk(played, 8990);
  await canvas(played).focus(); await played.keyboard.down("KeyE"); await played.clock.runFor(2200); await played.keyboard.up("KeyE"); await played.clock.runFor(64);
  check("The third site is physically reached on the226-unit greenhouse platform", (await view(played)).reserveRouteRecorded === "3" && Number((await view(played)).reserveY) === 226);
  await capture(played, "greenhouse-upper-recorded.png");
  await walk(played, 9790); await jump(played, 350);
  await walk(played, 9970); await jump(played, 270, true);
  await walk(played, 10335); await jump(played, 325, true);
  await walk(played, 10735); await jump(played, 365, true);
  check("The quarry shelves form a distinct native jump route", (await view(played)).reserveSector === "echo-quarry" && Number((await view(played)).reserveY) === 365);
  await capture(played, "quarry-native-route.png");
  await walk(played, 12030); await jump(played, 365);
  await walk(played, 12235); await jump(played, 290, true); await walk(played, 12420);
  await canvas(played).focus(); await played.keyboard.down("KeyE"); await played.clock.runFor(2200); await played.keyboard.up("KeyE"); await played.clock.runFor(64);
  check("The eastern quay completes four separate records after eight physically traversed sectors", (await view(played)).reserveRouteRecorded === "4" && Number((await view(played)).reserveY) === 290 && new Set(route.map(sample => sample.sector)).size === 8);
  await capture(played, "eastern-quay-recorded.png");
  await played.getByRole("button", { name: "Ouvrir le carnet de traque et suspendre la chasse", exact: true }).click({ force: true }); await played.clock.runFor(96);
  const surveyed = await disk(played), surveyedRaw = await diskRaw(played);
  check("The notebook checkpoints four exact site positions and eight physical visits", surveyed.routeV107.siteRecords.every(site => site.recordedAt !== null) && JSON.stringify(surveyed.visited) === "[0,1,2,3,4,5,6,7]");
  check("The notebook uses eight sectors, sixteen roles and four uninspected distant escape circuits", await played.locator('[data-reserve-notebook][data-sector-count="8"]').count() === 1 && await played.locator('[data-reserve-escape][data-escape-phase="unknown"]').count() === 4 && await played.locator('[data-reserve-notebook]').innerText().then(text=>text.includes('0/16 rôles identifiés')));
  const pausedTick = (await view(played)).reserveTick; await played.clock.runFor(600);
  check("Reading the notebook pauses the real expedition", (await view(played)).reserveTick === pausedTick && await diskRaw(played) === surveyedRaw);
  await capture(played, "route-notebook-desktop.png", played.getByRole("dialog"));
  await played.evaluate(key => { window.__preserveOriginalSetItem = Storage.prototype.setItem; Storage.prototype.setItem = function(k,v){ if(k===key) throw new DOMException('QA quota','QuotaExceededError'); return window.__preserveOriginalSetItem.call(this,k,v); }; },reserveKey);
  await played.getByRole('button',{name:'Reprendre la chasse',exact:true}).click({force:true}); await played.clock.runFor(96);
  check("A real storage refusal blocks resumption and preserves the durable V3 document", (await view(played)).reservePaused === "true" && await diskRaw(played) === surveyedRaw && await played.getByRole('alert').innerText().then(text=>text.includes('sauvegarde')));
  await played.evaluate(()=>{Storage.prototype.setItem=window.__preserveOriginalSetItem;delete window.__preserveOriginalSetItem;});
  await played.getByRole('button',{name:'Réessayer la sauvegarde et reprendre',exact:true}).click({force:true}); await played.clock.runFor(96);
  check("Storage retry resumes the same physical V3 position and four records", (await view(played)).reservePaused === "false" && (await view(played)).reserveRouteRecorded === "4" && Math.abs(Number((await view(played)).reserveX)-surveyed.player.x)<2);
  await played.getByRole("button",{name:"Ouvrir le carnet de traque et suspendre la chasse",exact:true}).click({force:true}); await played.clock.runFor(96);
  await played.setViewportSize({ width: 390, height: 844 }); await played.clock.runFor(96);
  await played.locator("[data-reserve-notebook] h2").scrollIntoViewIfNeeded();
  check("The eight-sector notebook and four route records fit a390px viewport", await played.evaluate(() => document.documentElement.scrollWidth <= innerWidth) && await played.locator('[data-reserve-route-site]').count()===4);
  await capture(played, "route-notebook-mobile.png");
  await played.clock.resume(); await entry(played); await mounted(played);
  check("Reload restores V3, sixteen identities and all four recorded observations", (await disk(played)).version === 3 && (await disk(played)).humans.length === 16 && JSON.stringify((await disk(played)).routeV107) === JSON.stringify(surveyed.routeV107) && Number((await view(played)).reserveX) === Math.round(surveyed.player.x));
  await played.setViewportSize({ width: 1440, height: 1000 });
  await played.clock.pauseAt(new Date(await played.evaluate(() => Date.now() + 100)));
  await played.getByRole("button", { name: "Reprendre la chasse", exact: true }).click({ force: true }); await played.clock.runFor(160);
  await walk(played, 115);
  await canvas(played).focus(); await played.keyboard.down("KeyE"); await played.clock.runFor(1200); await played.keyboard.up("KeyE"); await played.clock.runFor(64);
  const returned = await disk(played);
  check("The survey returns to extraction through real leftward movement and its final channel", returned.status === "returned" && Math.abs(returned.player.x - 115) < 5 && JSON.stringify(returned.routeV107) === JSON.stringify(surveyed.routeV107));
  check("The durable outcome contains no campaign inventory, rank or honor reward", !Object.hasOwn(returned, "inventory") && !Object.hasOwn(returned, "rankId") && !Object.hasOwn(returned, "honor"));
  await played.locator("[data-reserve-notebook-summary]").click({ force: true }); await played.clock.runFor(64);
  check("The closed expedition reports its completed survey without offering field actions", await played.locator("[data-reserve-route-v107]").innerText().then(text => text.includes("4/4 relevés rapportés")) && await played.locator("[data-reserve-next-action='none']").count() === 1);
  await capture(played, "survey-returned-outcome.png", played.getByRole("dialog"));
  check("No JavaScript error occurred in the isolated browser journeys", errors.length === 0);
  const sourceAfter = await snapshot(); check("Preserve runtime sources remained unchanged during the recipe", JSON.stringify(sourceBefore) === JSON.stringify(sourceAfter));
  const report = { status: "PASS_CIBLE", mode: "compiled-app", runtimeCommit, buildId: expectedBuildId, baseUrl, production: { mode: "compiled-app", runtimeCommit, buildId: expectedBuildId, browserErrors: errors.length, checksPassed: checks.length, checksFailed: 0, servedBuilds }, checks, fixtures, captures, route, errors, sourceBefore, sourceAfter,
    outcomes: { surveyed: { tick: surveyed.tick, player: surveyed.player, visited: surveyed.visited, routeV107: surveyed.routeV107 }, returned: { tick: returned.tick, status: returned.status, player: returned.player, visited: returned.visited, routeV107: returned.routeV107 } },
    scope: "Real compiled local menu and Canvas. Ordinary V3 starts with sixteen living original adult combatants and four physical aircraft; normal keyboard and touch are exercised. Full geometry/four-site/return journey starts at extraction with all sixteen already down in an explicit normalized fixture; positions, visits and results are never assigned during the journey. Channels, refusal/retry, pause, reload and return use the mounted UI. Static captures require visual inspection. This does not certify a played combat victory, all80sectors, H001–H100 art, canonical fidelity, campaign rewards or deployment." };
  await fs.writeFile(path.join(output, "result.json"), JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify({ status: "PASS", checks: checks.length, captures: captures.length, routeSamples: route.length, output }));
} catch (error) {
  await fs.writeFile(path.join(output, "failure.json"), JSON.stringify({ status: "FAIL", error: error.stack, checks, fixtures, captures, route, errors }, null, 2) + "\n");
  throw error;
} finally { await Promise.allSettled(contexts.map(context => context.close())); await browser.close(); }
