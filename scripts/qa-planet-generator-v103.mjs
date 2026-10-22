import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { chromium } from "playwright-core";
import sharp from "sharp";

// Uses the real editor, atlas and strategic panel. Storage failures are injected
// only in an isolated context; no game state or rendering is mocked.
const baseUrl = process.env.YAUTJA_QA_BASE_URL ?? "http://127.0.0.1:3101";
const output = path.resolve(process.env.YAUTJA_GENERATOR_V103_QA_OUTPUT ?? "outputs/qa-planet-generator-v103");
const reportPath = path.resolve(process.env.YAUTJA_GENERATOR_V103_QA_REPORT ?? "docs/planet-generator-v103/ui-qa.json");
const catalogueKey = "yautja.clan-war.v103.generated-catalog", legacyKey = "yautja.clan-war.v102.generated-catalog";
const archiveKey = id => `yautja.clan-war.v96.planet.${id}.free.v1`;
const digest = value => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const checks = [], errors = [], consoleErrors = [], contexts = [];
const check = (name, condition) => { assert.ok(condition, name); checks.push(name); };
const generator = page => page.getByTestId("planet-generator-v103").filter({ visible: true });
const preview = page => generator(page).getByTestId("clan-war-atlas-v95");
const panel = page => page.locator('[data-clan-war-v85="free-profile"]');
const selector = page => panel(page).getByTestId("war-planet-selector-v96");
const code = page => generator(page).getAttribute("data-preview-planet-code");
const geometry = atlas => atlas.getByTestId("war-planet-coastlines").locator("path").evaluateAll(items => items.map(item => item.getAttribute("d")));
const rawArchive = (page, id) => page.evaluate(key => localStorage.getItem(key), archiveKey(id));
const values = page => generator(page).locator("[data-generator-field]").evaluateAll(items => Object.fromEntries(items.map(item => [item.dataset.generatorField, item.querySelector("select,input:not([type=checkbox])").value])));
await fs.mkdir(output, { recursive: true }); await fs.mkdir(path.dirname(reportPath), { recursive: true });
const browser = await chromium.launch({
  ...(process.env.CHROMIUM_EXECUTABLE_PATH ? { executablePath: process.env.CHROMIUM_EXECUTABLE_PATH } : { channel: process.env.AUDIT_CHROME_CHANNEL ?? "chrome" }), headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--enable-unsafe-swiftshader", "--use-gl=angle", "--use-angle=swiftshader"],
});

async function newPage(viewport = { width: 1440, height: 1080 }) {
  const context = await browser.newContext({ viewport, reducedMotion: "reduce", acceptDownloads: true }); contexts.push(context);
  const page = await context.newPage(); page.setDefaultTimeout(30000);
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => { if (message.type() === "error") consoleErrors.push(message.text()); });
  return page;
}
async function visit(page) {
  await page.goto(`${baseUrl}/planet-generator-v103`, { waitUntil: "domcontentloaded", timeout: 90000 });
  await generator(page).waitFor();
  await generator(page).getByTestId("planet-generator-quicklook-v103").scrollIntoViewIfNeeded();
  await generator(page).getByTestId("planet-generator-quicklook-v103").locator('canvas[data-render-status="ready"], canvas[data-render-status="fallback"]').waitFor({ timeout: 90000 });
}
async function section(page, id) {
  const details = generator(page).locator(`[data-generator-section="${id}"]`);
  if (await details.getAttribute("open") === null) await details.locator("summary").press("Enter");
}
async function edit(page, label, value) { await generator(page).getByRole("combobox", { name: label, exact: true }).selectOption(String(value)); }
async function lock(page, label, checked = true) { await generator(page).getByRole("checkbox", { name: `Conserver : ${label}`, exact: true }).setChecked(checked); }
async function apply(page) {
  await generator(page).getByRole("button", { name: "Générer l’aperçu", exact: true }).press("Enter");
  await page.waitForFunction(() => [...document.querySelectorAll('[data-testid="planet-generator-v103"]')].find(item => !item.closest("[hidden]"))?.getAttribute("data-draft-modified") === "false");
}
async function importCode(page, value) {
  await generator(page).getByRole("textbox", { name: "Importer un code de monde", exact: true }).fill(value);
  await generator(page).getByRole("button", { name: "Retrouver le monde", exact: true }).press("Enter");
}
async function map(atlas) {
  await atlas.getByRole("button", { name: "▱ Planisphère", exact: true }).press("Enter");
  await atlas.locator('canvas[data-projection="map"]').scrollIntoViewIfNeeded();
  await atlas.locator('canvas[data-render-status="ready"][data-projection="map"]').waitFor({ timeout: 90000 });
}
async function download(page, name, filename) {
  const waiting = page.waitForEvent("download", { timeout: 90000 });
  await generator(page).getByRole("button", { name, exact: true }).click();
  const file = await waiting, filePath = path.join(output, filename ?? file.suggestedFilename()); await file.saveAs(filePath); return filePath;
}
async function exportLand(page, filename) {
  const controls = generator(page).getByTestId("planet-layer-export-v102");
  if (await controls.getAttribute("open") === null) await controls.locator("summary").press("Enter");
  await controls.getByRole("combobox", { name: "Calque", exact: true }).selectOption("land");
  return download(page, "Télécharger le PNG", filename);
}
async function resolveTurn(page, id, turn) {
  await panel(page).getByRole("button", { name: "Fin de préparation · relire avant résolution", exact: true }).click();
  await panel(page).getByRole("button", { name: "Confirmer et résoudre le tour", exact: true }).click();
  await page.waitForFunction(({ key, turn }) => JSON.parse(localStorage.getItem(key) ?? "null")?.turn === turn, { key: archiveKey(id), turn });
  await selector(page).getByText("Archive locale confirmée", { exact: true }).waitFor();
}
async function choose(page, id) {
  await selector(page).getByRole("combobox", { name: "Planète active", exact: true }).selectOption(id);
  await page.waitForFunction(value => document.querySelector('[data-clan-war-v85="free-profile"] [data-testid="war-planet-selector-v96"]')?.getAttribute("data-active-planet") === value, id);
}
async function checkWaterHit(page, atlas) {
  await atlas.locator('svg[viewBox="0 0 960 620"]').scrollIntoViewIfNeeded();
  const selected = await atlas.locator('g[data-source="true"]').getAttribute("data-territory-id");
  const point = await atlas.getByTestId("war-planet-inland-surfaces").locator("path").evaluateAll(paths => {
    for (const shape of paths) {
      const box = shape.getBBox(), matrix = shape.getScreenCTM();
      for (let y = 1; y < 10; y++) for (let x = 1; x < 10; x++) {
        const local = new DOMPoint(box.x + box.width * x / 10, box.y + box.height * y / 10);
        if (!shape.isPointInFill(local)) continue;
        const screen = local.matrixTransform(matrix);
        if (document.elementFromPoint(screen.x, screen.y)?.closest("[data-hydrology-id]") === shape) return { x: screen.x, y: screen.y, id: shape.getAttribute("data-hydrology-id") };
      }
    }
    return null;
  });
  assert.ok(point, "a real internal surface is reachable on the map");
  await page.mouse.click(point.x, point.y);
  check("clicking a visible inland basin does not select the territory underneath", await atlas.locator('g[data-source="true"]').getAttribute("data-territory-id") === selected);
  return point.id;
}

let page, worldSmall, worldLarge, worldLegacy, pngResult, hydrologyHit, failure;
try {
  console.log("QA V103: drafts, per-module randomization, locks and presets");
  page = await newPage(); await visit(page);
  const initial = await code(page);
  check("the editor exposes four independent sections and all 22 lockable recipe fields", await generator(page).locator("[data-generator-section]").count() === 4 && await generator(page).getByRole("checkbox", { name: /^Conserver :/, includeHidden: true }).count() === 22);
  await edit(page, "Nombre de régions", 3); await edit(page, "Nombre de territoires", 18);
  check("incompatible region counts are explicitly unavailable on an 18-territory front", await generator(page).getByRole("combobox", { name: "Nombre de régions", exact: true }).locator('option[value="12"]').isDisabled());
  await generator(page).getByRole("textbox", { name: "Graine du monde", exact: true }).fill("Les rivages d’Émeraude");
  await lock(page, "Graine du monde"); await lock(page, "Nombre de territoires"); await lock(page, "Nombre de régions");
  await section(page, "land"); await section(page, "surface");
  await edit(page, "Palette des sols", "ochre"); await lock(page, "Palette des sols");
  await edit(page, "Palette des mers", "amber"); await lock(page, "Palette des mers");
  const lockedBefore = await values(page);
  await generator(page).getByRole("button", { name: "Base extraterrestre", exact: true }).press("Enter");
  let current = await values(page);
  check("the extraterrestrial base preserves seed, both counts and independently locked palettes", ["seed", "territoryCount", "regionCount", "landPalette", "surfacePalette"].every(field => current[field] === lockedBefore[field]) && current.landVariant === "alien" && current.surfaceVariant === "alien");
  await generator(page).getByRole("button", { name: "Mélanger les réglages", exact: true }).press("Enter");
  current = await values(page);
  check("global randomization honors every active lock and leaves the applied world unchanged", ["seed", "territoryCount", "regionCount", "landPalette", "surfacePalette"].every(field => current[field] === lockedBefore[field]) && await code(page) === initial);
  const moduleBefore = await values(page);
  await generator(page).getByRole("button", { name: "Tirer au hasard : Dessin des côtes", exact: true }).press("Enter");
  current = await values(page);
  check("a per-module draw changes only the chosen coastline setting", current.coast !== moduleBefore.coast && Object.keys(current).every(field => field === "coast" || current[field] === moduleBefore[field]));
  await lock(page, "Palette des sols", false); await lock(page, "Palette des mers", false);
  await generator(page).getByRole("button", { name: "Base terrestre", exact: true }).press("Enter");
  current = await values(page);
  check("the terrestrial base provides independent land and sea textures and retains a locked small format", current.landVariant === "earthlike" && current.surfaceVariant === "earthlike" && current.surface === "water" && current.territoryCount === "18" && current.regionCount === "3");
  check("all preset and modular changes remain an explicit draft", await code(page) === initial && await generator(page).getAttribute("data-draft-modified") === "true");
  await apply(page); await map(preview(page));
  const smallGeometry = digest(await geometry(preview(page)));
  check("the applied small world contains 18 actual map territories and three regional dossiers", await preview(page).locator('svg g[role="button"][data-territory-id]').count() === 18 && await generator(page).locator("article[data-region-id]").count() === 3);
  hydrologyHit = await checkWaterHit(page, preview(page));

  console.log("QA V103: visible palette change, independent PNG and shareable recipes");
  const beforePng = await exportLand(page, "small-land-verdant.png");
  await edit(page, "Palette des sols", "violet"); await apply(page); worldSmall = await code(page); await map(preview(page));
  const afterPng = await exportLand(page, "small-land-violet.png");
  const beforePixels = await sharp(beforePng).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const afterPixels = await sharp(afterPng).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let changedPixels = 0, alphaChanges = 0, transparent = 0;
  for (let index = 0; index < beforePixels.data.length; index += 4) {
    if (beforePixels.data[index + 3] !== afterPixels.data[index + 3]) alphaChanges++;
    if (afterPixels.data[index + 3] === 0) transparent++;
    if (beforePixels.data[index + 3] > 0 && Math.max(...[0, 1, 2].map(offset => Math.abs(beforePixels.data[index + offset] - afterPixels.data[index + offset]))) > 5) changedPixels++;
  }
  pngResult = { width: afterPixels.info.width, height: afterPixels.info.height, changedPixels, alphaChanges, transparent };
  check("the soil palette visibly changes exported pixels without moving coasts or changing the land alpha", changedPixels > 3000 && alphaChanges === 0 && transparent > 10000 && afterPixels.info.width === 1024 && afterPixels.info.height === 512 && digest(await geometry(preview(page))) === smallGeometry);
  await preview(page).screenshot({ path: path.join(output, "small-terrestrial-atlas.png") });
  const smallJsonPath = await download(page, "Télécharger la fiche", "small-world.json");
  const smallFile = JSON.parse(await fs.readFile(smallJsonPath, "utf8"));
  check("the exported file records the applied V103 recipe and actual regional descriptions", smallFile.version === 103 && smallFile.code === worldSmall && smallFile.recipe.territoryCount === 18 && smallFile.recipe.regionCount === 3 && smallFile.recipe.landPalette === "violet" && smallFile.regions.length === 3);
  await generator(page).getByRole("button", { name: "Mémoriser ce monde", exact: true }).click();
  await edit(page, "Nombre de territoires", 96); await edit(page, "Nombre de régions", 12);
  await edit(page, "Répartition des terres", "shattered"); await edit(page, "Taille des régions", "uneven");
  await generator(page).getByRole("textbox", { name: "Graine du monde", exact: true }).fill("Les cent veilleurs");
  await apply(page); worldLarge = await code(page); await map(preview(page));
  check("the applied large world contains 96 real territories and 12 variable regional dossiers", await preview(page).locator('svg g[role="button"][data-territory-id]').count() === 96 && await generator(page).locator("article[data-region-id]").count() === 12);
  const largeJsonPath = await download(page, "Télécharger la fiche", "large-world.json");
  const largeBytes = await fs.readFile(largeJsonPath), largeFile = JSON.parse(largeBytes);
  check("a 96-territory fragmented-world export stays below its own import bound and stores hydrology descriptions", largeBytes.length <= 65536 && largeFile.hydrology.features.length > 0 && largeFile.hydrology.features.every(feature => !Object.hasOwn(feature, "points")));
  await generator(page).getByRole("button", { name: "Mémoriser ce monde", exact: true }).click();
  const fileInput = generator(page).getByLabel("Ou importer une fiche", { exact: true });
  await fileInput.setInputFiles({ name: "mismatched.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify({ ...largeFile, version: 102 })) });
  await generator(page).getByText("Le code et les paramètres de cette fiche ne correspondent pas.", { exact: true }).waitFor();
  check("a mismatched version is rejected without replacing the preview", await code(page) === worldLarge);
  await fileInput.setInputFiles(smallJsonPath); await generator(page).getByText("Fiche importée. Le monde conserve sa version et sa géographie d’origine.", { exact: true }).waitFor();
  check("a V103 JSON round trip restores the exact small-world code and geometry", await code(page) === worldSmall && digest(await geometry(preview(page))) === smallGeometry);
  await fileInput.setInputFiles(largeJsonPath); await page.waitForFunction(value => document.querySelector('[data-testid="planet-generator-v103"]')?.getAttribute("data-preview-planet-code") === value, worldLarge);
  check("the largest tested exported recipe imports unchanged", await code(page) === worldLarge);
  await generator(page).getByRole("button", { name: "Copier le code", exact: true }).click();
  check("a shared code remains directly available even when clipboard permission is unavailable", await generator(page).getByRole("textbox", { name: "Code du monde", exact: true }).inputValue() === worldLarge);
  await page.evaluate(() => scrollTo(0, 0)); await page.screenshot({ path: path.join(output, "desktop-generator.png"), fullPage: false });
  await map(preview(page)); await preview(page).screenshot({ path: path.join(output, "large-fragmented-atlas.png") });

  console.log("QA V103: real small/large fronts, orders and isolated archives");
  await importCode(page, worldSmall);
  await generator(page).getByRole("textbox", { name: "Graine du monde", exact: true }).fill("Ce brouillon ne doit pas ouvrir");
  await generator(page).getByRole("button", { name: "Ouvrir ce front", exact: true }).press("Enter"); await selector(page).waitFor();
  check("opening a front uses the applied small world rather than an edited draft", await selector(page).getAttribute("data-active-planet") === worldSmall);
  await resolveTurn(page, worldSmall, 2);
  const smallState = JSON.parse(await rawArchive(page, worldSmall));
  check("the live small front saves exactly 18 territory states", Object.keys(smallState.territories).length === 18 && smallState.turn === 2);
  const actor = smallState.combatants.find(item => item.factionId === "CON-F01" && !item.garrison && item.status === "fit" && item.trainingUntilTurn === null && smallState.stocks[item.territoryId].s >= 1 && smallState.stocks[item.territoryId].i >= 1);
  assert.ok(actor, "a mobile actor exists in the generated deployment");
  const liveAtlas = panel(page).getByTestId("clan-war-atlas-v95"); await map(liveAtlas);
  await liveAtlas.locator(`svg g[data-territory-id="${actor.territoryId}"]`).press("Enter");
  const command = panel(page).getByRole("complementary", { name: "Commandement du territoire", exact: true });
  await command.getByRole("combobox", { name: "Ordre", exact: true }).selectOption("recon");
  await command.getByRole("checkbox", { name: new RegExp(`^${actor.id} ·`) }).check();
  await command.getByRole("button", { name: "Réserver l’ordre", exact: true }).click();
  await page.waitForFunction(key => JSON.parse(localStorage.getItem(key) ?? "null")?.orders.some(order => order.kind === "recon"), archiveKey(worldSmall));
  await resolveTurn(page, worldSmall, 3);
  const smallRaw = await rawArchive(page, worldSmall);
  check("a real reconnaissance order resolves on a variable generated front", JSON.parse(smallRaw).observations.length > 0);
  await choose(page, worldLarge); await resolveTurn(page, worldLarge, 2);
  const largeRaw = await rawArchive(page, worldLarge), largeState = JSON.parse(largeRaw);
  check("the live 96-territory front has its own exact archive and leaves the small campaign unchanged", Object.keys(largeState.territories).length === 96 && largeState.turn === 2 && await rawArchive(page, worldSmall) === smallRaw);
  check("the picker keeps thirty historical worlds separate from both variable-size discoveries", await selector(page).locator('optgroup[label="Les 30 mondes répertoriés"] option').count() === 30 && await selector(page).locator('optgroup[label="Mondes découverts"] option').count() === 2);
  await page.reload({ waitUntil: "domcontentloaded" }); await generator(page).waitFor(); await importCode(page, worldLarge);
  await generator(page).getByRole("button", { name: "Ouvrir ce front", exact: true }).click(); await selector(page).waitFor();
  check("reopening the large world after reload resumes its original saved state", await rawArchive(page, worldLarge) === largeRaw && /Tour 02/.test((await selector(page).innerText()).replace(/\s+/g, " ")));
  await choose(page, worldSmall);
  check("switching back restores the independently advanced small front", await rawArchive(page, worldSmall) === smallRaw && /Tour 03/.test((await selector(page).innerText()).replace(/\s+/g, " ")));

  console.log("QA V103: exact legacy world, archive and explicit variant action");
  await page.goto(`${baseUrl}/planet-generator-v102`, { waitUntil: "domcontentloaded", timeout: 90000 });
  const oldEditor = page.getByTestId("planet-generator-v102"); await oldEditor.waitFor();
  await oldEditor.locator("canvas").scrollIntoViewIfNeeded();
  await oldEditor.locator('canvas[data-render-status="ready"], canvas[data-render-status="fallback"]').waitFor({ timeout: 90000 });
  worldLegacy = await oldEditor.getAttribute("data-preview-planet-code");
  const oldAtlas = oldEditor.getByTestId("clan-war-atlas-v95"); await map(oldAtlas);
  const legacyGeometry = digest(await geometry(oldAtlas));
  await oldEditor.getByRole("button", { name: "Ouvrir ce front", exact: true }).click(); await selector(page).waitFor(); await resolveTurn(page, worldLegacy, 2);
  const legacyRaw = await rawArchive(page, worldLegacy), legacyCatalog = await page.evaluate(key => localStorage.getItem(key), legacyKey);
  await visit(page); await importCode(page, worldLegacy); await map(preview(page));
  check("a legacy code renders the exact original V102 coastlines and remains protected from implicit conversion", await code(page) === worldLegacy && digest(await geometry(preview(page))) === legacyGeometry && await generator(page).getByTestId("planet-legacy-recipe-v103").count() === 1 && await generator(page).getByRole("textbox", { name: "Graine du monde", exact: true }).count() === 0);
  const legacyFile = JSON.parse(await fs.readFile(await download(page, "Télécharger la fiche", "legacy-world.json"), "utf8"));
  check("the new editor exports a legacy recipe with version 102 and its exact original code", legacyFile.version === 102 && legacyFile.recipe.version === 102 && legacyFile.code === worldLegacy);
  await generator(page).getByLabel("Ou importer une fiche", { exact: true }).setInputFiles({ name: "legacy-roundtrip.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(legacyFile)) });
  await generator(page).getByText("Fiche importée. Le monde conserve sa version et sa géographie d’origine.", { exact: true }).waitFor();
  await generator(page).getByRole("button", { name: "Ouvrir ce front", exact: true }).click(); await selector(page).waitFor();
  check("legacy reopening through the new editor resumes its archive byte for byte and preserves the old catalogue", await rawArchive(page, worldLegacy) === legacyRaw && await page.evaluate(key => localStorage.getItem(key), legacyKey) === legacyCatalog && /Tour 02/.test((await selector(page).innerText()).replace(/\s+/g, " ")));
  await panel(page).getByRole("button", { name: "Retour", exact: true }).click();
  await generator(page).getByRole("button", { name: "Préparer une variante", exact: true }).press("Enter");
  check("explicit legacy editing prepares a V103 draft while leaving the original preview and archive unchanged", await code(page) === worldLegacy && await generator(page).getAttribute("data-draft-modified") === "true" && await rawArchive(page, worldLegacy) === legacyRaw);
  await apply(page);
  check("generating the prepared variant produces a separate code without rewriting the old war", (await code(page)).startsWith("proc-v103-") && await code(page) !== worldLegacy && await rawArchive(page, worldLegacy) === legacyRaw);

  console.log("QA V103: phone-sized controls, keyboard atlas and storage refusal");
  const mobile = await newPage({ width: 390, height: 844 }); await visit(mobile);
  await generator(mobile).getByRole("button", { name: "Base extraterrestre", exact: true }).press("Enter");
  await generator(mobile).getByRole("textbox", { name: "Graine du monde", exact: true }).fill("Les falaises d’ambre");
  await generator(mobile).getByRole("textbox", { name: "Graine du monde", exact: true }).press("Enter");
  check("the phone form accepts keyboard-only generation with a modular base", await generator(mobile).getAttribute("data-draft-modified") === "false");
  await mobile.evaluate(() => scrollTo(0, 0)); await mobile.screenshot({ path: path.join(output, "mobile-generator.png"), fullPage: false });
  await importCode(mobile, worldLarge); await map(preview(mobile));
  const directory = preview(mobile).locator("details").filter({ has: mobile.locator("summary", { hasText: "Liste des territoires" }) });
  await directory.locator("summary").press("Enter");
  check("all 96 territories remain accessible through the mobile keyboard directory", await directory.getByRole("button").count() === 96);
  await directory.getByRole("button").last().press("Space");
  check("keyboard selection reaches the last territory and its actual regional description", await preview(mobile).locator('g[data-territory-id="CON-T96"]').getAttribute("data-source") === "true" && await generator(mobile).locator('article[data-active-region="true"]').count() === 1);
  await directory.locator("summary").press("Enter");
  check("the 390px large-world layout has no horizontal page overflow", await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await preview(mobile).screenshot({ path: path.join(output, "mobile-large-atlas.png") });

  const denied = await newPage();
  const oldIndex = JSON.stringify({ version: 102, ids: [worldLegacy] });
  await denied.addInitScript(({ key, legacyKey, oldIndex }) => {
    localStorage.setItem(legacyKey, oldIndex);
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (target, value) { if (target === key) throw new DOMException("Quota reached", "QuotaExceededError"); return original.call(this, target, value); };
  }, { key: catalogueKey, legacyKey, oldIndex });
  await visit(denied); const deniedCode = await code(denied);
  await generator(denied).getByRole("button", { name: "Ouvrir ce front", exact: true }).click();
  check("catalogue write refusal retains the preview and preserves the old index without silently opening a front", await panel(denied).count() === 0 && await generator(denied).getByRole("button", { name: "Ouvrir avec ce code sans mémoriser le raccourci", exact: true }).isVisible() && await denied.evaluate(key => localStorage.getItem(key), legacyKey) === oldIndex);
  await generator(denied).getByRole("button", { name: "Ouvrir avec ce code sans mémoriser le raccourci", exact: true }).click(); await selector(denied).waitFor();
  check("explicit memory-only opening uses the same variable-format world code", await selector(denied).getAttribute("data-active-planet") === deniedCode);
  check("all journeys are free from browser runtime and hydration errors", errors.length === 0 && !consoleErrors.some(error => /hydration|hydrating|uncaught|react error/i.test(error)));
} catch (error) {
  failure = error instanceof Error ? error.stack : String(error);
  if (page) await page.screenshot({ path: path.join(output, "failure.png"), fullPage: false }).catch(() => {});
} finally {
  await fs.writeFile(reportPath, JSON.stringify({ route: "/planet-generator-v103", checkedAt: new Date().toISOString(), viewport: [1440, 1080], mobileViewport: [390, 844], worldSmall, worldLarge, worldLegacy, pngResult, hydrologyHit, checks, errors, consoleErrors, passed: !failure, ...(failure ? { failure } : {}) }, null, 2) + "\n");
  await Promise.all(contexts.map(context => context.close())); await browser.close();
}
if (failure) throw new Error(failure);
console.log(JSON.stringify({ passed: true, checks: checks.length, report: path.relative(process.cwd(), reportPath), output: path.relative(process.cwd(), output) }));
