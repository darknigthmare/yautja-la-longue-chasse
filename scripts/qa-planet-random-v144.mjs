import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright-core";

const baseUrl = process.env.YAUTJA_QA_BASE_URL ?? "http://127.0.0.1:3101";
const output = path.resolve(process.env.YAUTJA_PLANET_RANDOM_V144_QA_OUTPUT ?? "outputs/qa-planet-random-v144");
await mkdir(output, { recursive: true });
const checks = [], errors = [];
const check = (label, value) => { assert.ok(value, label); checks.push(label); };
const browser = await chromium.launch({
  ...(process.env.CHROMIUM_EXECUTABLE_PATH
    ? { executablePath: process.env.CHROMIUM_EXECUTABLE_PATH }
    : { channel: process.env.AUDIT_CHROME_CHANNEL ?? "chrome" }),
  headless: true,
  args: ["--no-sandbox","--disable-dev-shm-usage","--enable-unsafe-swiftshader","--use-gl=angle","--use-angle=swiftshader"],
});
const context = await browser.newContext({ viewport: { width: 1440, height: 1050 }, reducedMotion: "reduce" });
const page = await context.newPage();
page.on("pageerror", error => errors.push(error.message));
let result;
try {
  await page.goto(baseUrl + "/planet-generator-v103", { waitUntil: "domcontentloaded", timeout: 90000 });
  const generator = page.getByTestId("planet-generator-v103").filter({ visible: true });
  await generator.waitFor();
  const originalCode = await generator.getAttribute("data-preview-planet-code");

  const snapshot = () => generator.evaluate(element => {
    const original = Object.fromEntries([...element.querySelectorAll("[data-generator-field]")].map(node => [
      node.getAttribute("data-generator-field"),
      node.querySelector("select")?.value ?? node.querySelector('input:not([type="checkbox"])')?.value,
    ]));
    const advanced = Object.fromEntries([...element.querySelectorAll("[data-generator-advanced-field]")].map(node => [
      node.getAttribute("data-generator-advanced-field"), node.querySelector("select")?.value,
    ]));
    return { original, advanced, worldCode: element.getAttribute("data-preview-planet-code") };
  });
  const sameOtherFields = (before, after, allowed) => Object.keys(before)
    .every(field => allowed.includes(field) || before[field] === after[field]);

  const headerGlobal = generator.getByTestId("planet-random-global-v144");
  const buttonGlobal = headerGlobal.getByTestId("planet-random-all-v144");
  check("V144 has one visible global random button even before V115 is enabled",
    await buttonGlobal.isVisible() && (await buttonGlobal.innerText()).includes("V103"));
  const beforeLegacy = await snapshot();
  await buttonGlobal.click();
  const afterLegacy = await snapshot();
  check("V144 global V103 roll changes the seed and current draft, not the planet preview",
    afterLegacy.original.seed !== beforeLegacy.original.seed &&
    afterLegacy.worldCode === originalCode && Object.keys(afterLegacy.advanced).length === 0);

  await generator.getByRole("button", { name: "Activer le générateur V115", exact: true }).click();
  const advancedPanel = generator.getByTestId("planet-generator-v115-modules");
  await advancedPanel.waitFor({ state: "visible" });
  check("V144 active V115 exposes all six real advanced fields",
    Object.keys((await snapshot()).advanced).length === 6);
  check("V144 four real V103 sections have dedicated random controls",
    (await generator.getByTestId("planet-random-section-v144").count()) === 4);
  check("V144 advanced section offers global, size, shape and texture rolls",
    (await advancedPanel.getByTestId("planet-random-advanced-v144").locator("button").count()) === 4);

  const geography = generator.locator('[data-generator-section="geography"]');
  if ((await geography.getAttribute("open")) === null) await geography.locator("summary").click();
  const lockTerritories = geography.getByRole("checkbox", { name: "Conserver : Nombre de territoires" });
  await lockTerritories.check();
  const fixedTerritories = (await snapshot()).original.territoryCount;
  const landSection = generator.locator('[data-generator-section="land"]');
  if ((await landSection.getAttribute("open")) === null) await landSection.locator("summary").click();
  await landSection.getByRole("checkbox", { name: "Conserver : Terres dominantes" }).check();
  const fixedBiome = (await snapshot()).original.landBiome;
  const sizePanel = generator.locator('[data-generator-advanced-field="planetSize"]');
  const lockSize = sizePanel.getByRole("checkbox", { name: "Conserver : Rayon de la planète" });
  await lockSize.check();
  const fixedSize = (await snapshot()).advanced.planetSize;
  check("V144 advanced per-field random button is disabled while its setting is locked",
    await sizePanel.getByRole("button", { name: "Tirer au hasard : Rayon de la planète" }).isDisabled());

  for (const sectionId of ["geography","land","surface","atmosphere"]) {
    const section = generator.locator('[data-generator-section="' + sectionId + '"]');
    if ((await section.getAttribute("open")) === null) await section.locator("summary").click();
    const before = await snapshot();
    await section.getByTestId("planet-random-section-v144").click();
    const after = await snapshot();
    const fields = {
      geography: ["territoryCount","regionCount","landform","arrangement","landCoverage","coast","territoryStyle","regionBalance"],
      land: ["landBiome","biomeDiversity","landVariant","landScale","landContrast","landPalette"],
      surface: ["surface","hydrology","surfaceVariant","surfaceScale","surfaceContrast","surfacePalette"],
      atmosphere: ["atmosphere"],
    }[sectionId];
    check("V144 scope " + sectionId + " modifies only its own unlocked original fields",
      sameOtherFields(before.original,after.original,fields) &&
      JSON.stringify(before.advanced) === JSON.stringify(after.advanced) &&
      Object.keys(after.original).some(field => fields.includes(field) && before.original[field] !== after.original[field]) &&
      after.worldCode === originalCode);
    check("V144 scope " + sectionId + " preserves manually locked territory and biome values",
      after.original.territoryCount === fixedTerritories && after.original.landBiome === fixedBiome);
  }

  const advancedButtons = advancedPanel.getByTestId("planet-random-advanced-v144");
  const beforeShapes = await snapshot();
  await advancedButtons.getByTestId("planet-random-v115-shapes-v144").click();
  const afterShapes = await snapshot();
  check("V144 V115 shape group changes all three templates but not materials, size or V103",
    ["islandShape","continentShape","regionShape"].every(field => beforeShapes.advanced[field] !== afterShapes.advanced[field]) &&
    sameOtherFields(beforeShapes.advanced,afterShapes.advanced,["islandShape","continentShape","regionShape"]) &&
    JSON.stringify(beforeShapes.original) === JSON.stringify(afterShapes.original));

  const landTexture = generator.locator('[data-generator-advanced-field="landMaterial"]');
  await landTexture.getByRole("checkbox", { name: "Conserver : Texture des terres" }).check();
  const beforeMaterials = await snapshot();
  await advancedButtons.getByTestId("planet-random-v115-materials-v144").click();
  const afterMaterials = await snapshot();
  check("V144 V115 material section changes only the unlocked liquid detail texture",
    afterMaterials.advanced.landMaterial === beforeMaterials.advanced.landMaterial &&
    afterMaterials.advanced.liquidMaterial !== beforeMaterials.advanced.liquidMaterial &&
    sameOtherFields(beforeMaterials.advanced,afterMaterials.advanced,["liquidMaterial"]));

  check("V144 size section disables when its only field is locked",
    await advancedButtons.getByTestId("planet-random-v115-size-v144").isDisabled());
  await lockSize.uncheck();
  const beforeSize = (await snapshot()).advanced.planetSize;
  await advancedButtons.getByTestId("planet-random-v115-size-v144").click();
  check("V144 size section changes physical radius without regenerating the war",
    (await snapshot()).advanced.planetSize !== beforeSize &&
    (await generator.getAttribute("data-preview-planet-code")) === originalCode);
  await lockSize.check();

  const beforeAll = await snapshot();
  await buttonGlobal.click();
  const afterAll = await snapshot();
  check("V144 global roll now includes active V115 and changes V103 seed", afterAll.original.seed !== beforeAll.original.seed &&
    ["islandShape","continentShape","regionShape","liquidMaterial"].some(field => afterAll.advanced[field] !== beforeAll.advanced[field]));
  check("V144 global roll respects V103 and V115 locks simultaneously",
    afterAll.original.territoryCount === fixedTerritories &&
    afterAll.original.landBiome === fixedBiome &&
    afterAll.advanced.planetSize === beforeAll.advanced.planetSize &&
    afterAll.advanced.landMaterial === beforeMaterials.advanced.landMaterial);
  check("V144 global roll preserves N >= 3R for the gameplay map",
    Number(afterAll.original.territoryCount) >= 3 * Number(afterAll.original.regionCount));
  check("V144 all random changes are still only a draft before generation",
    afterAll.worldCode === originalCode &&
    (await generator.getAttribute("data-draft-modified")) === "true");

  const island = generator.locator('[data-generator-advanced-field="islandShape"]');
  const beforeIsland = await snapshot();
  await island.getByRole("button", { name: "Tirer au hasard : Forme des îles" }).click();
  const afterIsland = await snapshot();
  check("V144 individual V115 random changes only the chosen shape",
    beforeIsland.advanced.islandShape !== afterIsland.advanced.islandShape &&
    sameOtherFields(beforeIsland.advanced,afterIsland.advanced,["islandShape"]) &&
    JSON.stringify(beforeIsland.original) === JSON.stringify(afterIsland.original));
  check("V144 no browser runtime errors after V103/V115 randomization", errors.length === 0);
  await generator.getByTestId("planet-generator-v115-modules").screenshot({ path: path.join(output,"random-v115-desktop.png") });

  await page.setViewportSize({ width: 390, height: 844 });
  check("V144 mobile global button is operable", await buttonGlobal.isEnabled());
  await buttonGlobal.screenshot({ path: path.join(output,"random-global-mobile.png") });

  await generator.getByRole("button", { name: "Générer l’aperçu", exact: true }).click();
  await page.waitForFunction(previous => {
    const root = document.querySelector('[data-testid="planet-generator-v103"]');
    return root?.getAttribute("data-recipe-version") === "115" &&
      root?.getAttribute("data-preview-planet-code")?.startsWith("proc-v115-") &&
      root?.getAttribute("data-preview-planet-code") !== previous;
  }, originalCode, { timeout: 120000 });
  const created = await generator.getAttribute("data-preview-planet-code");
  check("V144 explicitly generated an independent canonical V115 world", created !== originalCode &&
    created.startsWith("proc-v115-") && !(await generator.getAttribute("data-draft-modified") === "true"));
  check("V144 generated world retains valid region and territory limits", (await generator.locator('[data-testid="planet-strategic-dossier-v114"]').count()) > 0 &&
    errors.length === 0);

  result = { passed:true, oldWorld:originalCode, newWorld:created, checks, errors };
} catch (error) {
  result = { passed:false,checks,errors,error:String(error),stack:error?.stack };
  await page.screenshot({ path:path.join(output,"failure.png"),fullPage:true }).catch(()=>{});
} finally {
  await writeFile(path.join(output,"result.json"),JSON.stringify(result,null,2)+"\n");
  await browser.close();
}
if (!result.passed) { console.error(result); process.exitCode=1; }
else console.log("PASS V144 random editor: "+checks.length+" browser checks");
