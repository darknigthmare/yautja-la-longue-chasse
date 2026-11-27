import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "playwright-core";
import { createServer } from "vite";
import { childhoodAdmissionV175, childhoodStorage, qaChildhood } from "../tests/helpers/homeworld-childhood-v175.mjs";

const seed = childhoodAdmissionV175();
const city = qaChildhood.load("app/game/systems/youthCityErrandV172.ts");
const world = qaChildhood.load("app/game/systems/homeworldWorldV77.ts");
const rooms = qaChildhood.load("app/game/systems/homeworldInteriorsV64.ts");
const geometry = qaChildhood.load("app/game/systems/homeworldGeometryV64.ts");
const location = qaChildhood.load("app/game/systems/homeworldLocationV77.ts");
const hall = rooms.homeworldInteriorForBuildingV64("deep-forge");
const building = world.HOMEWORLD_BUILDINGS_V77.find(candidate => candidate.id === hall.buildingId);
const point = hall.points.find(candidate => candidate.pointId === "forge-service");
const nearby = Array.from({ length: 58 }, (_, index) => ({ x: point.x, y: point.y + 7 + index })).find(position =>
  rooms.isHomeworldInteriorWalkableV64(hall, position) && rooms.nearestHomeworldInteriorTargetV64(hall, position)?.pointId === point.pointId);
assert(nearby);
const door = geometry.homeworldBuildingDoorwayV64(building).approach;
seed.homeworld.locationV77 = location.createHomeworldCheckpointV77(seed.createdAt, building.levelId, nearby, hall.buildingId, door);
assert(location.resolveHomeworldLocationV77(seed.homeworld.locationV77, seed.createdAt).restored);
seed.homeworld.youthCityErrandV172 = city.startYouthCityErrandV172(seed.createdAt, "escort", true);
seed.settings.masterVolume = 0;

const storageKey = childhoodStorage.SAVE_STORAGE_KEY;
const output = resolve("outputs/qa-homeworld-youth-city-delivery-v176");
const report = {
  commit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  prerequisites: "A genuinely completed nursery and the city reducer establish a new errand. The Homeworld checkpoint is sampled beside the native forge service.",
  checks: [], errors: [], passed: false,
};
await mkdir(output, { recursive: true });
let server, browser, page;
try {
  server = await createServer({
    configFile: resolve("desktop/vite.config.ts"),
    server: { host: "127.0.0.1", port: 4276, strictPort: true },
  });
  await server.listen();
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE, args: ["--no-sandbox"] });
  const context = await browser.newContext({ viewport: { width: 1360, height: 980 }, reducedMotion: "reduce" });
  await context.addInitScript(({ key, campaign }) => {
    if (sessionStorage.getItem("m003ForgeReady")) return;
    sessionStorage.setItem("m003ForgeReady", "1");
    localStorage.setItem(key, JSON.stringify(campaign));
  }, { key: storageKey, campaign: seed });
  page = await context.newPage();
  page.setDefaultTimeout(30000);
  page.on("pageerror", error => report.errors.push(error.message));
  const passage = page.locator("[data-youth-city-delivery]");
  const handIn = page.locator('[data-r2-m003-stop="forge-service"]');
  const read = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)).homeworld.youthCityErrandV172, storageKey);
  const terrain = passage.getByRole("group", { name: "Terrain du passage de livraison" });
  async function openService() {
    await page.locator("[data-campaign-menu]").waitFor({ timeout: 90000 });
    const campaign = page.locator('[data-menu-section="campaign"]');
    if (await campaign.isVisible()) await campaign.click();
    await page.locator('[data-menu-action="continue"]').click();
    const home = page.locator('[data-homeworld-hub][data-homeworld-motion-ready="true"][data-homeworld-interior-id="deep-forge"]');
    await home.waitFor({ timeout: 90000 });
    await home.locator("[data-homeworld-viewport]").focus();
    await page.keyboard.press("KeyE");
    await passage.waitFor();
  }
  async function step(command, key) {
    const revision = (await read()).delivery.revision;
    if (key) {
      await terrain.focus();
      await page.keyboard.press(key);
    } else {
      await passage.locator('[data-youth-city-step="' + command + '"]').click();
    }
    await page.waitForFunction(({ storageKey, revision }) =>
      JSON.parse(localStorage.getItem(storageKey)).homeworld.youthCityErrandV172.delivery.revision === revision + 1, { storageKey, revision });
    return city.youthCityDeliveryPositionV176(await read());
  }
  await page.goto("http://127.0.0.1:4276");
  await openService();
  assert(await handIn.isDisabled());
  await step("east", "ArrowRight");
  assert.deepEqual(await step("east"), { x: 2, lane: "main" });
  await passage.locator('[data-youth-city-step="east"]').click();
  assert.equal((await read()).delivery.revision, 2);
  assert(await handIn.isDisabled());
  await passage.screenshot({ path: resolve(output, "passage-bloque.png"), animations: "disabled" });
  report.checks.push("Le chariot arrête le pas et la forge refuse une remise prématurée.");
  assert.deepEqual(await step("side", "ArrowUp"), { x: 2, lane: "side" });
  await step("east");
  await page.reload();
  await openService();
  assert.deepEqual(city.youthCityDeliveryPositionV176(await read()), { x: 3, lane: "side" });
  for (const command of ["east", "east", "side", "east", "east"]) await step(command);
  assert.deepEqual(city.youthCityDeliveryPositionV176(await read()), { x: 7, lane: "main" });
  assert(await handIn.isEnabled());
  await passage.screenshot({ path: resolve(output, "comptoir.png"), animations: "disabled" });
  await handIn.click();
  await handIn.waitFor({ state: "detached" });
  assert.equal(city.nextYouthCityStopV172(await read()), "memory-service");
  assert(!city.youthCityCarriesPieceV172(await read()));
  report.checks.push("Détour au clavier et au panneau, reprise après reload, retour sur la voie principale et remise validée.");
  assert.deepEqual(report.errors, []);
  report.passed = true;
} finally {
  if (!report.passed && page) {
    report.screen = (await page.locator("body").innerText().catch(() => "")).slice(0, 2200);
    await page.screenshot({ path: resolve(output, "failure.png"), animations: "disabled" }).catch(() => {});
  }
  console.log("M003_BROWSER", JSON.stringify(report));
  await browser?.close();
  await server?.close();
  await writeFile(resolve(output, "report.json"), JSON.stringify(report, null, 2) + "\n");
}
