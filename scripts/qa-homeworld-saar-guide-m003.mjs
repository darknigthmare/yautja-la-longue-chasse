import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "playwright-core";
import { createServer } from "vite";
import { childhoodAdmissionV175, childhoodStorage, qaChildhood } from "../tests/helpers/homeworld-childhood-v175.mjs";

const seed = childhoodAdmissionV175();
const city = qaChildhood.load("app/game/systems/youthCityErrandV172.ts");
const guide = qaChildhood.load("app/game/systems/youthCityGuideM003.ts");
const location = qaChildhood.load("app/game/systems/homeworldLocationV77.ts");
const route = guide.saarGuidePathM003();
assert.equal(route.status, "reachable", JSON.stringify(route));
const start = guide.SAAR_GUIDE_MARKS_M003[0].position;
const level = guide.SAAR_GUIDE_LEVEL_M003;
seed.homeworld.locationV77 = location.createHomeworldCheckpointV77(seed.createdAt, level, start, null, start);
assert(location.resolveHomeworldLocationV77(seed.homeworld.locationV77, seed.createdAt).restored);
seed.homeworld.youthCityErrandV172 = city.startYouthCityErrandV172(seed.createdAt, "escort", true, true);
seed.settings.masterVolume = 0;

const storageKey = childhoodStorage.SAVE_STORAGE_KEY;
const output = resolve("outputs/qa-homeworld-saar-guide-m003");
const report = {
  commit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  prerequisites: "The actual nursery reducer prepares a young campaign. The city reducer starts escorted delivery at its exterior audience checkpoint.",
  route, checks: [], errors: [], passed: false,
};
await mkdir(output, { recursive: true });
let server, browser, page;
try {
  server = await createServer({ configFile: resolve("desktop/vite.config.ts"), server: { host: "127.0.0.1", port: 4277, strictPort: true } });
  await server.listen();
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE, args: ["--no-sandbox"] });
  const context = await browser.newContext({ viewport: { width: 1360, height: 980 }, reducedMotion: "reduce" });
  await context.addInitScript(({ key, campaign }) => {
    if (sessionStorage.getItem("m003SaarReady")) return;
    sessionStorage.setItem("m003SaarReady", "1");
    localStorage.setItem(key, JSON.stringify(campaign));
  }, { key: storageKey, campaign: seed });
  page = await context.newPage();
  page.setDefaultTimeout(20000);
  page.on("pageerror", error => report.errors.push(error.message));
  const home = page.locator('[data-homeworld-hub][data-homeworld-motion-ready="true"][data-homeworld-level-v77="+2"]');
  const viewport = home.locator("[data-homeworld-viewport]");
  const player = viewport.locator("[data-homeworld-actor]");
  const saar = viewport.locator("[data-homeworld-saar-m003]");
  const prompt = viewport.locator("[data-homeworld-saar-action]");
  const read = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)).homeworld, storageKey);
  async function continueCampaign() {
    await page.locator("[data-campaign-menu]").waitFor({ timeout: 90000 });
    const campaign = page.locator('[data-menu-section="campaign"]');
    if (await campaign.isVisible()) await campaign.click();
    await page.locator('[data-menu-action="continue"]').click();
    await home.waitFor({ timeout: 90000 });
    await viewport.focus();
  }
  async function waitStage(stage) {
    await page.waitForFunction(({ storageKey, stage }) =>
      JSON.parse(localStorage.getItem(storageKey)).homeworld.youthCityErrandV172.guideM003 === stage, { storageKey, stage });
  }
  const spot = locator => locator.evaluate(node => ({ x: Number(node.dataset.x), y: Number(node.dataset.y) }));
  async function walkTo(point, tolerance = 12) {
    for (let attempt = 0; attempt < 250; attempt++) {
      const position = await spot(player), dx = point.x - position.x, dy = point.y - position.y;
      if (Math.hypot(dx, dy) <= tolerance) return;
      const moves = [];
      if (Math.abs(dx) > 6) moves.push({ key: dx > 0 ? "ArrowRight" : "ArrowLeft", duration: Math.abs(dx) * 1000 / 330 });
      if (Math.abs(dy) > 6) moves.push({ key: dy > 0 ? "ArrowDown" : "ArrowUp", duration: Math.abs(dy) * 1000 / 260 });
      for (const action of moves) await page.keyboard.down(action.key);
      await page.waitForTimeout(Math.max(28, Math.min(165, ...moves.map(action => action.duration))));
      for (const action of moves) await page.keyboard.up(action.key);
    }
    assert.fail("The player could not walk to the next waypoint " + JSON.stringify({ wanted: point, at: await spot(player) }));
  }

  await page.goto("http://127.0.0.1:4277");
  await continueCampaign();
  await prompt.getByText("Retrouver Saar au seuil de l’audience").waitFor();
  const firstSaar = await spot(saar);
  await viewport.screenshot({ path: resolve(output, "saar-au-seuil.png"), animations: "disabled" });
  await page.keyboard.press("KeyE");
  await waitStage(1);
  assert.equal((await read()).locationV77.levelId, level);
  const guidedSaar = await spot(saar);
  assert(Math.hypot(firstSaar.x - guidedSaar.x, firstSaar.y - guidedSaar.y) > 30);
  await page.reload();
  await continueCampaign();
  assert.equal((await read()).youthCityErrandV172.guideM003, 1);
  assert.deepEqual(await spot(saar), guidedSaar);
  report.checks.push("Saar attend au vrai seuil, l’interaction enregistre le départ et le joueur reprend au même repère.");
  for (const turn of route.points.slice(1)) await walkTo(turn);
  await prompt.getByText("Faire le point avec Saar au degré monumental").waitFor();
  await viewport.screenshot({ path: resolve(output, "saar-au-degre.png"), animations: "disabled" });
  await page.keyboard.press("KeyE");
  await waitStage(2);
  await saar.waitFor({ state: "detached" });
  assert(city.walkYouthCityDeliveryV176((await read()).youthCityErrandV172, "east"));
  await page.keyboard.press("KeyE");
  await page.locator('[data-homeworld-transit-v77="acropolis-stair"]').waitFor();
  report.checks.push("Déplacement par les touches sur le parvis, deuxième repère sauvegardé et escalier natif toujours accessible.");
  assert.deepEqual(report.errors, []);
  report.passed = true;
} finally {
  if (!report.passed && page) {
    report.screen = (await page.locator("body").innerText().catch(() => "")).slice(0, 2400);
    await page.screenshot({ path: resolve(output, "failure.png"), animations: "disabled" }).catch(() => {});
  }
  console.log("M003_SAAR_BROWSER", JSON.stringify(report));
  await browser?.close();
  await server?.close();
  await writeFile(resolve(output, "report.json"), JSON.stringify(report, null, 2) + "\n");
}
