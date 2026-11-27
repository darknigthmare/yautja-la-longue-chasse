import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "playwright-core";
import { createServer } from "vite";
import { desert, p } from "../tests/helpers/youth-patrol-played-route.mjs";
import { homeworldSceneSsrV78 } from "../tests/helpers/homeworld-scene-ssr-v78.mjs";
const qa = homeworldSceneSsrV78();

const workshopsApi = qa.load("app/game/systems/youthWorkshopV174.ts");
const { YOUTH_MEDICOMP } = qa.load("app/game/systems/youthMedicompV172.ts");

function trainedSave({ reports = 6, treatment = true } = {}) {
  const save = structuredClone(desert.save);
  const state = save.youthTraining.checkpoint;
  // Old youth progress is physically replayed by the fixture. For the new
  // admission gate, these are separately tested, normalized workshop reports.
  const workshop = {
    version: 1, active: null, maskProfile: "contrast",
    reports: workshopsApi.YOUTH_WORKSHOP_RANGES.slice(0, reports).map(([route], n) => ({
      route, tick: state.milestones["youth-camp-duel"] + n + 1, failures: 0,
    })),
  };
  state.workshopV174 = workshop;
  save.youthTraining.equipment.workshop = workshopsApi.youthWorkshopEquipment(workshop);
  if (treatment) state.medicompV172 = {
    version: 1, route: "prepared", stage: "complete",
    treatedTicks: YOUTH_MEDICOMP.duration, alertCleared: true,
  };
  assert.ok(p.normalizeYouthCampaign(save.youthTraining));
  return save;
}


const engine = qa.load("app/game/systems/homeworldRegionalLoopM014.ts");
const spaces = qa.load("app/game/systems/homeworldInteriorsV64.ts");
const world = qa.load("app/game/systems/homeworldWorldV77.ts");
const geometry = qa.load("app/game/systems/homeworldGeometryV64.ts");
const location = qa.load("app/game/systems/homeworldLocationV77.ts");
const owner = trainedSave();
const building = world.HOMEWORLD_BUILDINGS_V77.find(item => item.id === "training-hall");
const room = spaces.homeworldInteriorForBuildingV64(building.id);
const service = room.points.find(item => item.pointId === "training-service");
const entrance = geometry.homeworldBuildingDoorwayV64(building).approach;
const nearby = [32, 40, 48, 56].flatMap(d => [[0,d],[d,0],[-d,0],[0,-d]])
  .map(([x,y]) => ({ x: service.x+x, y: service.y+y }))
  .find(spot => spaces.isHomeworldInteriorWalkableV64(room, spot) &&
      spaces.nearestHomeworldInteriorTargetV64(room, spot)?.pointId === "training-service");
assert.ok(nearby, "reachable training station");
owner.homeworld.locationV77 = location.createHomeworldCheckpointV77(owner.createdAt, building.levelId, nearby, building.id, entrance);
assert.ok(location.resolveHomeworldLocationV77(owner.homeworld.locationV77, owner.createdAt).restored);
owner.settings.masterVolume = 0;
const checked = p.parseSaveImport(p.exportSave(owner));
assert.ok(checked.save, checked.failure);
const key = p.SAVE_STORAGE_KEY;
const root = "http://127.0.0.1:4218";
const output = resolve("outputs/qa-homeworld-regional-loop-m014");
await mkdir(output, { recursive: true });
const result = { completed: false, reports: [], pagedErrors: [] };
let server, browser, page;
try {
  server = await createServer({ configFile: resolve("desktop/vite.config.ts"), server: { host: "127.0.0.1", port: 4218, strictPort: true } });
  await server.listen();
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE, args: ["--no-sandbox"] });
  const ctx = await browser.newContext({ viewport: { width: 1320, height: 920 }, reducedMotion: "reduce" });
  await ctx.addInitScript(({key, owner}) => {
    if (sessionStorage.getItem("regionalCourseM014QA")) return;
    sessionStorage.setItem("regionalCourseM014QA", "1");
    localStorage.setItem(key, JSON.stringify(owner));
  }, { key, owner: checked.save });
  page = await ctx.newPage();
  page.on("pageerror", error => result.pagedErrors.push(error.message));
  page.setDefaultTimeout(30000);
  const scene = page.locator("[data-regional-loop-m014]");
  const button = id => scene.locator('[data-regional-action-m014="' + id + '"]');
  const saved = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)), key);
  const loop = async () => (await saved()).homeworld.regionalLoopM014;
  const boot = async () => {
    await page.locator("[data-campaign-menu]").waitFor({ timeout: 90000 });
    const campaign = page.locator('[data-menu-section="campaign"]');
    if (await campaign.isVisible()) await campaign.click();
    await page.locator('[data-menu-action="continue"]').click();
    await page.locator("[data-campaign-session]").waitFor({ timeout: 90000 });
  };
  const teacher = async () => {
    await page.locator('[data-homeworld-interior-target="point"]').click({ timeout: 100000 });
    return page.locator("[data-homeworld-regional-loop-m014]");
  };
  const act = async (name, usingKeyboard = false) => {
    const revision = (await loop()).revision;
    if (usingKeyboard) await scene.press(name === "forward" ? "ArrowRight" : "ArrowLeft");
    else await button(name).click();
    await page.waitForFunction(({ key, revision }) => JSON.parse(localStorage.getItem(key)).homeworld.regionalLoopM014?.revision === revision+1, { key, revision });
  };
  const crossing = async route => {
    await act("choose-" + route);
    await act("forward", true);
    await act("forward");
    assert.ok(await button("forward").isDisabled());
    const terrain = engine.REGIONAL_LOOP_M014[(await loop()).reports.length];
    await act(terrain[route].tool);
    while ((await loop()).passage.position < engine.LOOP_M014_LAST) {
      await act("forward");
      if ((await loop()).passage.position === engine.LOOP_M014_RESOURCE) await act("sample");
    }
    return terrain;
  };
  await page.goto(root);
  await boot();
  await (await teacher()).click();
  await scene.waitFor();
  for (const [index, terrain] of engine.REGIONAL_LOOP_M014.entries()) {
    if (index === 1) {
      await crossing("sheltered");
      await act("observe");
      assert.equal((await loop()).passage.observation, "alert");
      while ((await loop()).passage.position) await act("back");
      await act("retry");
      assert.equal((await loop()).reports.length, 1);
    }
    const route = index === 1 ? "high" : "sheltered";
    await crossing(route);
    if (index === 0) {
      await page.reload();
      await boot();
      await scene.waitFor();
      assert.equal((await loop()).passage.position, engine.LOOP_M014_LAST);
      assert.equal((await loop()).passage.sample, true);
    }
    for (let n = 0; n < terrain[route].quiet; n++) await act("wait");
    await act("observe");
    await scene.screenshot({ path: resolve(output, terrain.id + ".png"), animations: "disabled" });
    while ((await loop()).passage.position) await act("back");
    await act("report");
    assert.deepEqual((await loop()).reports[index], { route, sample: true });
    result.reports.push([terrain.id, route]);
  }
  assert.equal((await loop()).phase, "return-to-instructor");
  await button("city").click();
  await (await teacher()).click();
  await page.locator("[data-regional-loop-m014-complete]").waitFor();
  assert.equal((await loop()).phase, "complete");
  assert.equal(p.getChronicleRank((await saved()).prologue.chronicle), "unblooded");
  await page.reload();
  await boot();
  await teacher();
  assert.equal(await page.locator("[data-regional-loop-m014-complete]").count(), 1);
  assert.deepEqual(result.pagedErrors, []);
  result.completed = true;
} finally {
  if (!result.completed && page) {
    result.visible = (await page.locator("body").innerText().catch(() => "")).slice(0, 3000);
    await page.screenshot({ path: resolve(output, "failed.png"), animations: "disabled" }).catch(() => {});
  }
  console.log("REGIONAL_LOOP_M014_BROWSER", JSON.stringify(result));
  await browser?.close();
  await server?.close();
  await writeFile(resolve(output, "report.json"), JSON.stringify(result, null, 2) + "\n");
}
