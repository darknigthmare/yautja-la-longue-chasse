import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { chromium } from "playwright-core";
import sharp from "sharp";
import { reportGithubActionsFailure } from "./lib/github-actions-annotation.mjs";

// This journey uses the production generator and strategic panel. Only storage
// and clipboard failure fixtures are injected, in isolated browser contexts.
const baseUrl = process.env.YAUTJA_QA_BASE_URL ?? "http://127.0.0.1:3101";
const output = path.resolve(process.env.YAUTJA_GENERATOR_QA_OUTPUT ?? "outputs/qa-planet-generator-v102");
const reportPath = path.resolve(process.env.YAUTJA_GENERATOR_QA_REPORT ?? "docs/planet-generator-v102/ui-qa.json");
const catalogueKey = "yautja.clan-war.v102.generated-catalog";
const archiveKey = id => `yautja.clan-war.v96.planet.${id}.free.v1`;
const digest = value => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const checks = [], errors = [], consoleErrors = [], contexts = [];
const check = (name, condition) => { assert.ok(condition, name); checks.push(name); };
// The legacy review keeps its V102 editor; the in-game picker now opens V103.
const generator = page => page.locator('[data-testid="planet-generator-v102"], [data-testid="planet-generator-v103"]').filter({ visible: true });
const preview = page => generator(page).getByTestId("clan-war-atlas-v95");
const panel = page => page.locator('[data-clan-war-v85="free-profile"]');
const selector = page => panel(page).getByTestId("war-planet-selector-v96");
const previewCode = page => generator(page).getAttribute("data-preview-planet-code");
const geometry = page => preview(page).getByTestId("war-planet-coastlines").locator("path").evaluateAll(items => items.map(item => item.getAttribute("d")));
const rawArchive = (page, id) => page.evaluate(key => localStorage.getItem(key), archiveKey(id));
const savedState = async (page, id) => JSON.parse(await rawArchive(page, id) ?? "null");
await fs.mkdir(output, { recursive: true });
await fs.mkdir(path.dirname(reportPath), { recursive: true });

const browser = await chromium.launch({
  ...(process.env.CHROMIUM_EXECUTABLE_PATH ? { executablePath: process.env.CHROMIUM_EXECUTABLE_PATH } : { channel: process.env.AUDIT_CHROME_CHANNEL ?? "chrome" }), headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--enable-unsafe-swiftshader", "--use-gl=angle", "--use-angle=swiftshader"],
});

async function newPage(viewport = { width: 1440, height: 1080 }) {
  const context = await browser.newContext({ viewport, reducedMotion: "reduce", acceptDownloads: true });
  contexts.push(context);
  const page = await context.newPage(); page.setDefaultTimeout(25000);
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => { if (message.type() === "error") consoleErrors.push(message.text()); });
  return page;
}
async function visit(page) {
  await page.goto(`${baseUrl}/planet-generator-v102`, { waitUntil: "domcontentloaded", timeout: 90000 });
  await generator(page).waitFor();
  const canvas = generator(page).locator("canvas").first();
  await canvas.scrollIntoViewIfNeeded();
  await canvas.locator('xpath=self::*[@data-render-status="ready" or @data-render-status="fallback"]').waitFor({ timeout: 90000 });
}
async function apply(page) {
  await generator(page).getByRole("button", { name: "Générer l’aperçu", exact: true }).press("Enter");
  await page.waitForFunction(() => [...document.querySelectorAll('[data-testid="planet-generator-v102"], [data-testid="planet-generator-v103"]')].find(element => !element.closest("[hidden]"))?.getAttribute("data-draft-modified") === "false");
}
async function importCode(page, code) {
  await generator(page).getByRole("textbox", { name: "Importer un code de monde", exact: true }).fill(code);
  await generator(page).getByRole("button", { name: "Retrouver le monde", exact: true }).press("Enter");
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
async function download(page, buttonName, filename) {
  const waiting = page.waitForEvent("download");
  await generator(page).getByRole("button", { name: buttonName, exact: true }).click();
  const file = await waiting;
  const filePath = path.join(output, filename ?? file.suggestedFilename());
  await file.saveAs(filePath);
  return filePath;
}

let page, worldA, worldB, pngResult, failure;
try {
  console.log("QA generator: preview, modular controls and shared recipes");
  page = await newPage(); await visit(page);
  const initialCode = await previewCode(page);
  await generator(page).getByRole("textbox", { name: "Graine du monde", exact: true }).fill("Les îles des deux soleils");
  await generator(page).getByRole("combobox", { name: "Répartition des terres", exact: true }).selectOption("archipelago");
  await generator(page).getByRole("combobox", { name: "Étendue des terres", exact: true }).selectOption("low");
  await generator(page).getByRole("combobox", { name: "Dessin des côtes", exact: true }).selectOption("fjords");
  await generator(page).getByRole("combobox", { name: "Terres dominantes", exact: true }).selectOption("jungle");
  await generator(page).getByRole("combobox", { name: "Mers et milieux intermédiaires", exact: true }).selectOption("acid");
  await generator(page).getByRole("combobox", { name: "Atmosphère", exact: true }).selectOption("aurora");
  check("editing modular controls keeps the applied preview unchanged", await previewCode(page) === initialCode && await generator(page).getAttribute("data-draft-modified") === "true");
  await apply(page); worldA = await previewCode(page);
  check("explicit keyboard generation applies a new self-contained world code", worldA !== initialCode && worldA.startsWith("proc-v102-"));
  check("the atlas, six regional dossiers and landmass descriptions use the applied world", await preview(page).getAttribute("data-planet-id") === worldA && await generator(page).locator("article[data-region-id]").count() === 6 && await generator(page).getByRole("region", { name: "Continents et îles", exact: true }).locator("article").count() > 1);
  await page.screenshot({ path: path.join(output, "desktop-generator-controls.png"), fullPage: false });
  await preview(page).scrollIntoViewIfNeeded();
  await preview(page).locator('canvas[data-render-status="ready"]').waitFor({ timeout: 90000 });
  await preview(page).screenshot({ path: path.join(output, "desktop-generated-globe.png") });
  await preview(page).getByRole("button", { name: "▱ Planisphère", exact: true }).press("Enter");
  const geometryA = digest(await geometry(page));
  await preview(page).screenshot({ path: path.join(output, "desktop-generated-map.png") });
  check("the applied archipelago exposes all 36 keyboard territories", await preview(page).locator('svg g[role="button"][data-territory-id]').count() === 36);

  const jsonPath = await download(page, "Télécharger la fiche");
  const worldFile = JSON.parse(await fs.readFile(jsonPath, "utf8"));
  check("downloaded JSON contains the applied code, modular recipe and actual descriptions", worldFile.code === worldA && worldFile.recipe.landform === "archipelago" && worldFile.recipe.surface === "acid" && worldFile.recipe.atmosphere === "aurora" && worldFile.regions.length === 6 && worldFile.traits.length > 0);
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  await generator(page).getByRole("button", { name: "Copier le code", exact: true }).click();
  check("copy shares the applied world code", await page.evaluate(() => navigator.clipboard.readText()) === worldA);
  await page.evaluate(() => { Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: async () => { throw new DOMException("Denied", "NotAllowedError"); } } }); });
  await generator(page).getByRole("button", { name: "Copier le code", exact: true }).click();
  check("denied clipboard selects the code and exposes a manual copy message", await generator(page).getByRole("textbox", { name: "Code du monde", exact: true }).evaluate(element => document.activeElement === element && element.selectionStart === 0 && element.selectionEnd === element.value.length) && (await generator(page).innerText()).includes("La copie automatique est indisponible"));
  await generator(page).getByRole("button", { name: "Mémoriser ce monde", exact: true }).click();
  check("remember stores the canonical world code", await page.evaluate(({ key, code }) => JSON.parse(localStorage.getItem(key)).ids.includes(code), { key: catalogueKey, code: worldA }));

  await generator(page).getByRole("textbox", { name: "Graine du monde", exact: true }).fill("904102");
  await generator(page).getByRole("combobox", { name: "Répartition des terres", exact: true }).selectOption("supercontinent");
  await generator(page).getByRole("combobox", { name: "Étendue des terres", exact: true }).selectOption("high");
  await generator(page).getByRole("combobox", { name: "Mers et milieux intermédiaires", exact: true }).selectOption("water");
  await generator(page).getByRole("combobox", { name: "Terres dominantes", exact: true }).selectOption("snow");
  await generator(page).getByRole("combobox", { name: "Atmosphère", exact: true }).selectOption("clear");
  await apply(page); worldB = await previewCode(page);
  check("another recipe creates genuinely different rendered geography", worldA !== worldB && digest(await geometry(page)) !== geometryA);
  await generator(page).getByRole("button", { name: "Mémoriser ce monde", exact: true }).click();
  await importCode(page, "proc-v102-invalid");
  check("an invalid code leaves the last valid world intact", await previewCode(page) === worldB && (await generator(page).innerText()).includes("Ce code de monde n’est pas reconnu"));
  const fileInput = generator(page).getByLabel("Ou importer une fiche", { exact: true });
  await fileInput.setInputFiles({ name: "mismatch.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify({ ...worldFile, code: worldB })) });
  await generator(page).getByText("Le code et les paramètres de cette fiche ne correspondent pas.", { exact: true }).waitFor();
  check("a mismatched JSON recipe is rejected without changing the preview", await previewCode(page) === worldB);
  await fileInput.setInputFiles({ name: "oversized.json", mimeType: "application/json", buffer: Buffer.alloc(70000, 32) });
  await generator(page).getByText("Cette fiche est trop volumineuse. Choisissez une fiche de monde exportée ici.", { exact: true }).waitFor();
  check("JSON import is bounded and preserves the preview on failure", await previewCode(page) === worldB);
  await fileInput.setInputFiles(jsonPath);
  await generator(page).getByText("Fiche importée. Sa géographie est reconstruite à partir du code de monde.", { exact: true }).waitFor();
  check("a JSON round trip recreates the exact applied world and coastline geometry", await previewCode(page) === worldA && digest(await geometry(page)) === geometryA);
  await importCode(page, worldB); await importCode(page, worldA);
  check("code round trips preserve geography independently of local shortcuts", await previewCode(page) === worldA && digest(await geometry(page)) === geometryA);

  console.log("QA generator: independent PNG, playable fronts and archive isolation");
  const exportControls = generator(page).getByTestId("planet-layer-export-v102");
  await exportControls.locator("summary").press("Enter");
  await exportControls.getByRole("combobox", { name: "Calque", exact: true }).selectOption("land");
  const pngPath = await download(page, "Télécharger le PNG");
  const metadata = await sharp(pngPath).metadata();
  const { data, info } = await sharp(pngPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let transparent = 0, opaque = 0;
  for (let index = 3; index < data.length; index += 4) { if (data[index] === 0) transparent++; if (data[index] === 255) opaque++; }
  pngResult = { file: path.relative(process.cwd(), pngPath), width: info.width, height: info.height, channels: info.channels, hasAlpha: metadata.hasAlpha, transparent, opaque };
  check("downloaded land PNG has the advertised dimensions and a nonempty transparent sea", info.width === 1024 && info.height === 512 && metadata.hasAlpha && transparent > 10000 && opaque > 10000);
  await generator(page).getByRole("textbox", { name: "Graine du monde", exact: true }).fill("This draft must not open");
  await generator(page).getByRole("button", { name: "Ouvrir ce front", exact: true }).press("Enter");
  await selector(page).waitFor();
  check("opening uses the applied preview even when the draft has ungenerated changes", await selector(page).getAttribute("data-active-planet") === worldA);
  const activePicker = selector(page).getByRole("combobox", { name: "Planète active", exact: true });
  check("the active picker separates thirty historical worlds from two discoveries", await activePicker.locator('optgroup[label="Les 30 mondes répertoriés"] option').count() === 30 && await activePicker.locator('optgroup[label="Mondes découverts"] option').count() === 2);
  const atlas = panel(page).getByTestId("clan-war-atlas-v95");
  await atlas.getByRole("button", { name: "▱ Planisphère", exact: true }).click();
  await atlas.locator('svg g[data-territory-id="CON-T02"]').press("Enter");
  const command = panel(page).getByRole("complementary", { name: "Commandement du territoire", exact: true });
  await command.getByRole("combobox", { name: /^Ordre/ }).selectOption("recon");
  await command.getByRole("checkbox", { name: /^P08 ·/ }).check();
  await command.getByRole("button", { name: "Réserver l’ordre", exact: true }).click();
  await page.waitForFunction(key => JSON.parse(localStorage.getItem(key) ?? "null")?.orders.length === 1, archiveKey(worldA));
  await resolveTurn(page, worldA, 2);
  const rawA = await rawArchive(page, worldA);
  check("a generated front accepts a real reconnaissance order, resolves it and saves turn two", JSON.parse(rawA).planetId === worldA && JSON.parse(rawA).turn === 2 && JSON.parse(rawA).observations.length > 0);
  await choose(page, worldB);
  check("a second generated front begins with its independent turn", /Tour 01/.test((await selector(page).innerText()).replace(/\s+/g, " ")));
  await resolveTurn(page, worldB, 2); await resolveTurn(page, worldB, 3);
  check("playing a second world preserves the first world's exact archive bytes", await rawArchive(page, worldA) === rawA && (await savedState(page, worldB)).turn === 3);
  const options = await activePicker.locator("option").evaluateAll(items => items.map(item => item.value));
  const expectedNext = options[(options.indexOf(worldB) + 1) % options.length];
  await selector(page).getByRole("button", { name: "Planète suivante", exact: true }).press("Enter");
  await page.waitForFunction(value => document.querySelector('[data-clan-war-v85="free-profile"] [data-testid="war-planet-selector-v96"]')?.getAttribute("data-active-planet") === value, expectedNext);
  check("next-world navigation uses the full dynamic catalogue and restores keyboard focus", await activePicker.evaluate(element => document.activeElement === element));
  await choose(page, worldA);
  await selector(page).getByRole("button", { name: "Générer un monde", exact: true }).press("Enter");
  const embeddedGenerator = panel(page).getByTestId("planet-generator-v103");
  await embeddedGenerator.getByRole("button", { name: "Préparer une variante", exact: true }).press("Enter");
  await embeddedGenerator.getByRole("textbox", { name: "Graine du monde", exact: true }).fill("12345678");
  await embeddedGenerator.getByRole("button", { name: "Générer l’aperçu", exact: true }).press("Enter");
  check("the in-game generator previews a new world without switching the active war", await embeddedGenerator.getAttribute("data-preview-planet-code") !== worldA && await selector(page).getAttribute("data-active-planet") === worldA && await rawArchive(page, worldA) === rawA);
  await selector(page).getByRole("button", { name: "Fermer le générateur", exact: true }).press("Enter");
  await page.screenshot({ path: path.join(output, "desktop-generated-front.png"), fullPage: false });
  await page.reload({ waitUntil: "domcontentloaded" }); await generator(page).waitFor();
  await generator(page).locator("canvas").first().scrollIntoViewIfNeeded();
  await generator(page).locator('canvas[data-render-status="ready"], canvas[data-render-status="fallback"]').first().waitFor({ timeout: 90000 });
  await page.waitForFunction(() => document.querySelector('[data-testid="planet-generator-v102"] [aria-label="Mondes retrouvés"]')?.querySelectorAll("button").length === 2);
  check("both discovered world shortcuts survive a full browser-page reload", await generator(page).getByRole("region", { name: "Mondes retrouvés", exact: true }).getByRole("button").count() === 2);
  await importCode(page, worldA);
  await generator(page).getByRole("button", { name: "Ouvrir ce front", exact: true }).click();
  await selector(page).waitFor();
  check("reopening a generated code after reload restores the played front unchanged", /Tour 02/.test((await selector(page).innerText()).replace(/\s+/g, " ")) && await rawArchive(page, worldA) === rawA && (await savedState(page, worldB)).turn === 3);

  console.log("QA generator: storage failure, mobile and keyboard navigation");
  const denied = await newPage();
  await denied.addInitScript(key => {
    localStorage.setItem(key, JSON.stringify({ version: 102, ids: [] }));
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (target, value) { if (target === key) throw new DOMException("Quota reached", "QuotaExceededError"); return original.call(this, target, value); };
  }, catalogueKey);
  await visit(denied);
  const deniedCode = await previewCode(denied);
  await generator(denied).getByRole("button", { name: "Ouvrir ce front", exact: true }).click();
  const deniedDiscoveries = generator(denied).getByRole("region", { name: "Mondes retrouvés", exact: true });
  check("quota refusal never opens silently or claims that the catalogue was saved", await panel(denied).count() === 0 && (await deniedDiscoveries.innerText()).includes("Enregistrement du catalogue non confirmé") && await deniedDiscoveries.getByRole("button").count() === 1 && await denied.evaluate(key => JSON.parse(localStorage.getItem(key)).ids.length, catalogueKey) === 0);
  await generator(denied).getByRole("button", { name: "Ouvrir avec ce code sans mémoriser le raccourci", exact: true }).click();
  await selector(denied).waitFor();
  check("an explicit memory-only opening still opens the exact preview code", await selector(denied).getAttribute("data-active-planet") === deniedCode);
  const corrupt = await newPage();
  await corrupt.addInitScript(key => localStorage.setItem(key, "preserve-this-corrupt-catalogue"), catalogueKey);
  await visit(corrupt);
  await generator(corrupt).getByRole("button", { name: "Mémoriser ce monde", exact: true }).click();
  check("a malformed existing catalogue remains byte-for-byte intact", await corrupt.evaluate(key => localStorage.getItem(key), catalogueKey) === "preserve-this-corrupt-catalogue" && (await generator(corrupt).innerText()).includes("conservé sans modification"));

  const mobile = await newPage({ width: 390, height: 844 }); await visit(mobile);
  const mobileInitial = await previewCode(mobile);
  const seedInput = generator(mobile).getByRole("textbox", { name: "Graine du monde", exact: true });
  await seedInput.fill("Les falaises d’ambre"); await seedInput.press("Enter");
  check("a phone-sized form supports keyboard submission", await previewCode(mobile) !== mobileInitial && await generator(mobile).getAttribute("data-draft-modified") === "false");
  await mobile.screenshot({ path: path.join(output, "mobile-generator-controls.png"), fullPage: false });
  await preview(mobile).getByRole("button", { name: "▱ Planisphère", exact: true }).press("Enter");
  const mobileTerritory = preview(mobile).locator('svg g[data-territory-id="CON-T03"]');
  await mobileTerritory.press("Space");
  check("mobile keyboard territory selection updates the real atlas", await mobileTerritory.getAttribute("data-source") === "true" && await generator(mobile).locator('article[data-active-region="true"]').count() === 1);
  check("390px layout has no horizontal page overflow", await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await preview(mobile).screenshot({ path: path.join(output, "mobile-generated-map.png") });
  const beforeRandom = await previewCode(mobile);
  await generator(mobile).getByRole("button", { name: "Créer un autre monde", exact: true }).press("Enter");
  check("another-world action creates a fresh preview without opening a war", await previewCode(mobile) !== beforeRandom && await panel(mobile).count() === 0);

  console.log("QA generator: retained unsaved fronts and safe session limit");
  const retained = await newPage();
  await retained.addInitScript(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key.startsWith("yautja.clan-war.v96.planet.")) throw new DOMException("Archive quota reached", "QuotaExceededError");
      return original.call(this, key, value);
    };
  });
  await visit(retained);
  const retainedCodes = [];
  for (let index = 0; index < 24; index++) {
    if (index > 0) await selector(retained).getByRole("button", { name: "Générer un monde", exact: true }).click();
    const variant = generator(retained).getByRole("button", { name: "Préparer une variante", exact: true });
    if (await variant.count()) await variant.click();
    await generator(retained).getByRole("textbox", { name: "Graine du monde", exact: true }).fill(String(900000 + index));
    await apply(retained); retainedCodes.push(await previewCode(retained));
    await generator(retained).getByRole("button", { name: "Ouvrir ce front", exact: true }).click();
    await selector(retained).waitFor();
    await panel(retained).getByRole("button", { name: "Fin de préparation · relire avant résolution", exact: true }).click();
    await panel(retained).getByRole("button", { name: "Confirmer et résoudre le tour", exact: true }).click();
    await retained.waitForFunction(() => {
      const text = document.querySelector('[data-clan-war-v85="free-profile"] [data-testid="war-planet-selector-v96"]')?.textContent?.replace(/\s+/g, " ") ?? "";
      return /Tour 02/.test(text) && text.includes("Front en mémoire") && !text.includes("Enregistrement…");
    });
    if ((index + 1) % 8 === 0) console.log(`QA generator: ${index + 1} modified unsaved fronts retained`);
  }
  await selector(retained).getByRole("button", { name: "Générer un monde", exact: true }).click();
  await generator(retained).getByRole("textbox", { name: "Graine du monde", exact: true }).fill("900024");
  await apply(retained);
  const blockedCode = await previewCode(retained);
  await generator(retained).getByRole("button", { name: "Ouvrir ce front", exact: true }).click();
  await generator(retained).getByText(/^Ce front n’a pas été ouvert\. Enregistrez les progrès/).waitFor();
  check("the session cap keeps the unopenable preview, its code and the reason visible", await previewCode(retained) === blockedCode && await selector(retained).getAttribute("data-active-planet") === retainedCodes[23]);
  const retainedOptions = await selector(retained).getByRole("combobox", { name: "Planète active", exact: true }).locator("option").evaluateAll(items => items.map(item => item.value));
  const shortcutIds = await retained.evaluate(key => JSON.parse(localStorage.getItem(key)).ids, "yautja.clan-war.v103.generated-catalog");
  check("all unsaved fronts remain discoverable after the oldest shortcut leaves the bounded catalogue", retainedCodes.every(id => retainedOptions.includes(id)) && shortcutIds.length === 24 && !shortcutIds.includes(retainedCodes[0]));
  await choose(retained, retainedCodes[0]);
  check("reselecting an evicted shortcut resumes its actual unsaved progress", /Tour 02/.test((await selector(retained).innerText()).replace(/\s+/g, " ")) && await rawArchive(retained, retainedCodes[0]) === null);
  check("all exercised browser journeys are free from runtime and hydration errors", errors.length === 0 && !consoleErrors.some(error => /hydration|hydrating|uncaught|react error/i.test(error)));
} catch (error) {
  failure = error instanceof Error ? error.stack : String(error);
  reportGithubActionsFailure("Planet generator V102 browser journey", error);
  if (page) await page.screenshot({ path: path.join(output, "failure.png"), fullPage: true }).catch(() => {});
} finally {
  await fs.writeFile(reportPath, JSON.stringify({
    route: "/planet-generator-v102", viewport: [1440, 1080], mobileViewport: [390, 844],
    checkedAt: new Date().toISOString(), worldA, worldB, checks, pngResult, errors, consoleErrors,
    passed: !failure, ...(failure ? { failure } : {}),
  }, null, 2) + "\n");
  await Promise.all(contexts.map(context => context.close()));
  await browser.close();
}
if (failure) throw new Error(failure);
console.log(JSON.stringify({ passed: true, checks: checks.length, report: path.relative(process.cwd(), reportPath), output: path.relative(process.cwd(), output) }));
