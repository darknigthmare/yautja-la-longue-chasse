import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { chromium } from "playwright-core";

const baseUrl = process.env.YAUTJA_QA_BASE_URL ?? "http://127.0.0.1:3101";
const output = path.resolve(process.env.YAUTJA_PLANET_V128_QA_OUTPUT ?? "outputs/qa-planet-regional-kit-v128");
await mkdir(output, { recursive: true });
const checks = [], errors = [];
function check(label, condition) { assert.ok(condition, label); checks.push(label); }

function storedZip(bytes) {
  const files = new Map();
  let offset = 0;
  while (offset + 30 <= bytes.length && bytes.readUInt32LE(offset) === 0x04034b50) {
    const size = bytes.readUInt32LE(offset + 18), length = bytes.readUInt16LE(offset + 26);
    const extra = bytes.readUInt16LE(offset + 28);
    const name = bytes.toString("utf8", offset + 30, offset + 30 + length);
    const from = offset + 30 + length + extra;
    assert(from + size <= bytes.length, "Every ZIP file is complete");
    assert(!files.has(name), "No duplicate ZIP path");
    files.set(name, bytes.subarray(from, from + size)); offset = from + size;
  }
  check("ZIP32 preserves a bounded independent asset inventory", files.size >= 7 && files.size <= 16);
  return files;
}

const browser = await chromium.launch({
  ...(process.env.CHROMIUM_EXECUTABLE_PATH
    ? { executablePath: process.env.CHROMIUM_EXECUTABLE_PATH }
    : { channel: process.env.AUDIT_CHROME_CHANNEL ?? "chrome" }),
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--enable-unsafe-swiftshader", "--use-gl=angle", "--use-angle=swiftshader"],
});
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true, reducedMotion: "reduce" });
const page = await context.newPage();
page.on("pageerror", error => errors.push(error.message));
let result = null;
try {
  await page.goto(baseUrl + "/planet-generator-v103", { waitUntil: "domcontentloaded", timeout: 90000 });
  const generator = page.getByTestId("planet-generator-v103").filter({ visible: true });
  await generator.waitFor();
  await generator.getByRole("button", { name: "Activer le générateur V115", exact: true }).click();
  await generator.getByRole("button", { name: "Générer l’aperçu", exact: true }).click();
  await page.waitForFunction(() => [...document.querySelectorAll('[data-testid="planet-generator-v103"]')]
    .some(el => !el.closest("[hidden]") && el.getAttribute("data-recipe-version") === "115"), null, { timeout: 90000 });
  const code = await generator.getAttribute("data-preview-planet-code");
  check("The region kit acts on a canonical V115 world", code?.startsWith("proc-v115-"));

  const exporter = generator.getByTestId("planet-layer-export-v102");
  await exporter.locator("summary").click();
  check("V130 adds land and liquid studies to the texture selector",
    (await exporter.getByTestId("planet-extra-materials-v125").locator("select").first().locator("option").count()) === 48);
  const kit = exporter.getByTestId("planet-regional-kit-v128");
  await kit.waitFor({ state: "visible" });
  const regionSelect = kit.getByRole("combobox", { name: "Région de la planète" });
  const landSelect = kit.getByRole("combobox", { name: "Sol compatible avec le biome" });
  const surfaceSelect = kit.getByRole("combobox", { name: "Milieu complémentaire compatible" });
  const regions = await regionSelect.locator("option").evaluateAll(items => items.map(item => item.value));
  check("Kit lists actual planet regions", regions.length >= 3);
  const availableLand = await landSelect.locator("option").evaluateAll(items => items.map(item => item.value));
  check("Kit presents at least two region-compatible land textures", availableLand.length >= 2);
  const initialLand = await landSelect.inputValue();
  const otherLand = availableLand.find(id => id !== initialLand);
  await landSelect.selectOption(otherLand);
  await regionSelect.selectOption(regions[1]);
  await regionSelect.selectOption(regions[0]);
  check("Each region retains its independently selected land material", (await landSelect.inputValue()) === otherLand);
  check("Editor never changes the world code", (await generator.getAttribute("data-preview-planet-code")) === code);
  const jsonDownload = page.waitForEvent("download", { timeout: 45000 });
  await kit.getByTestId("planet-region-kit-json-v128").click();
  const jsonFile = await jsonDownload;
  const jsonPath = path.join(output, jsonFile.suggestedFilename());
  await jsonFile.saveAs(jsonPath);
  const jsonKit = JSON.parse((await readFile(jsonPath)).toString("utf8"));
  check("JSON sidecar belongs to the current world only", jsonKit.worldCode === code && jsonKit.entries.length === regions.length);
  check("Regional albedo preview paints a real canvas", await kit.getByTestId("planet-regional-material-preview-v128")
    .evaluate(canvas => { const rgba = canvas.getContext("2d")?.getImageData(0, 0, canvas.width, canvas.height).data;
      return rgba && rgba.some((byte, index) => index % 4 === 3 && byte > 0); }));
  await landSelect.selectOption(initialLand);
  check("Regional material edit changes only the draft choice", (await landSelect.inputValue()) === initialLand);
  await kit.getByTestId("planet-region-kit-import-v128").setInputFiles(jsonPath);
  await page.waitForFunction(([expected]) => [...document.querySelectorAll('[data-testid="planet-regional-kit-v128"] select')]
    .some(select => select.value === expected), [otherLand], { timeout: 10000 });
  check("Valid regional JSON restores independently edited material", (await landSelect.inputValue()) === otherLand);
  await kit.getByTestId("planet-region-kit-import-v128").setInputFiles({
    name: "foreign-planet.json", mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify({ ...jsonKit, worldCode: "proc-v115-foreign-planet" })),
  });
  await page.waitForFunction(() => document.querySelector('[data-testid="planet-layer-export-v102"] [role="status"]')
    ?.textContent?.includes("ne correspond pas"), null, { timeout: 10000 });
  check("Foreign regional sidecar is refused without changing current choices", (await landSelect.inputValue()) === otherLand);
  await kit.getByTestId("planet-regional-preview-toggle-v129").click();
  const preview = kit.getByTestId("planet-regional-preview-v129");
  await preview.waitFor({ state: "visible" });
  await page.waitForFunction(() => document.querySelector('[data-testid="planet-regional-preview-v129"]')
    ?.getAttribute("data-render-status") === "ready", null, { timeout: 45000 });
  const visual = preview.getByTestId("planet-regional-visual-v129");
  check("V131 uses the PBR shader on Chromium's GPU", (await preview.getAttribute("data-render-mode")) === "pbr-v131");
  const coastDownload = page.waitForEvent("download", { timeout: 45000 });
  await preview.getByTestId("planet-regional-coast-mask-v131").click();
  const coastFile = await coastDownload;
  const coastPath = path.join(output, coastFile.suggestedFilename());
  await coastFile.saveAs(coastPath);
  const coastRaw = await sharp(coastPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let empty = 0, saturated = 0, fading = 0;
  for (let i = 2; i < coastRaw.data.length; i += 4) {
    const blue = coastRaw.data[i];
    if (!blue) empty++;
    else if (blue === 255) saturated++;
    else fading++;
  }
  check("V131 exports an independent 512x256 coastal mask PNG",
    coastRaw.info.width === 512 && coastRaw.info.height === 256);
  check("V131 mask has native sea, fully textured coast and smooth transition pixels",
    empty > 0 && saturated > 0 && fading > 0);
  const signature = await visual.evaluate(canvas => {
    const pixels = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height).data;
    let digest = 2166136261;
    for (let index = 0; index < pixels.length; index += 32) digest = Math.imul(digest ^ pixels[index], 16777619) >>> 0;
    return digest;
  });
  await landSelect.selectOption(initialLand);
  await page.waitForFunction(previous => {
    const parent = document.querySelector('[data-testid="planet-regional-preview-v129"]');
    if (parent?.getAttribute("data-render-status") !== "ready") return false;
    const canvas = parent.querySelector('canvas[data-testid="planet-regional-visual-v129"]');
    if (!canvas) return false;
    const pixels = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height).data;
    let digest = 2166136261;
    for (let index = 0; index < pixels.length; index += 32) digest = Math.imul(digest ^ pixels[index], 16777619) >>> 0;
    return digest !== previous;
  }, signature, { timeout: 45000 });
  check("Regional change visibly affects the map without changing the world code",
    (await generator.getAttribute("data-preview-planet-code")) === code);
  await preview.getByTestId("planet-regional-projection-v129").selectOption("globe");
  await page.waitForFunction(() => {
    const node = document.querySelector('[data-testid="planet-regional-preview-v129"]');
    return node?.getAttribute("data-render-status") === "ready" &&
      node.querySelector('canvas[data-testid="planet-regional-visual-v129"]')?.width === 384;
  }, null, { timeout: 45000 });
  check("The regional shader also renders a real 3D globe", await visual.evaluate(canvas => {
    const pixels = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height).data;
    return pixels.some((value, index) => index % 4 === 3 && value > 0);
  }));
  await preview.getByTestId("planet-regional-projection-v129").selectOption("map");
  await page.waitForFunction(() => document.querySelector('[data-testid="planet-regional-preview-v129"]')
    ?.getAttribute("data-render-status") === "ready", null, { timeout: 45000 });
  check("V131 preserves canonical planet identity", (await generator.getAttribute("data-preview-planet-code")) === code);
  const liveCanvas = generator.getByTestId("planet-generator-quicklook-v103").getByTestId("planet-material-v101");
  await liveCanvas.scrollIntoViewIfNeeded();
  await page.waitForFunction(() => document.querySelector('[data-testid="planet-generator-quicklook-v103"] canvas')
    ?.getAttribute("data-render-status") === "ready", null, { timeout: 60000 });
  const nativePixels = await liveCanvas.evaluate(canvas =>
    Array.from(canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height).data));
  await kit.getByTestId("planet-main-apply-v133").click();
  await liveCanvas.scrollIntoViewIfNeeded();
  await page.waitForFunction(() => document.querySelector('[data-testid="planet-main-kit-status-v133"]')
    ?.textContent?.includes("appliquées"), null, { timeout: 60000 });
  await page.waitForFunction(() => document.querySelector('[data-testid="planet-generator-quicklook-v103"] canvas')
    ?.getAttribute("data-render-status") === "ready" &&
    document.querySelector('[data-testid="planet-generator-quicklook-v103"] canvas')
    ?.getAttribute("data-regional-kit-applied") === "true", null, { timeout: 60000 });
  await page.waitForFunction(previous => {
    const canvas = document.querySelector('[data-testid="planet-generator-quicklook-v103"] canvas');
    if (!canvas || canvas.getAttribute("data-render-status") !== "ready") return false;
    const pixels = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height).data;
    return pixels.some((value,index) => value !== previous[index]);
  }, nativePixels, { timeout: 60000 });
  check("Explicit V133 application changes the actual main preview", true);
  await kit.getByTestId("planet-main-reset-v133").click();
  await liveCanvas.scrollIntoViewIfNeeded();
  await page.waitForFunction(() => document.querySelector('[data-testid="planet-generator-quicklook-v103"] canvas')
    ?.getAttribute("data-render-status") === "ready" &&
    document.querySelector('[data-testid="planet-generator-quicklook-v103"] canvas')
    ?.getAttribute("data-regional-kit-applied") === "false", null, { timeout: 60000 });
  check("Main renderer can restore the native recipe without changing the world code",
    (await generator.getAttribute("data-preview-planet-code")) === code);
  const surfaceOptions = await surfaceSelect.locator("option").evaluateAll(items => items.map(item => item.value));
  if (surfaceOptions.filter(Boolean).length >= 2) {
    const initialSurface = await surfaceSelect.inputValue();
    const replacement = surfaceOptions.filter(Boolean).find(value => value !== initialSurface);
    check("V131 can select two biome-compatible liquid materials", Boolean(replacement));
    const baseline = await visual.evaluate(canvas => Array.from(canvas.getContext("2d")
      .getImageData(0, 0, canvas.width, canvas.height).data));
    await surfaceSelect.selectOption(replacement);
    await page.waitForFunction(previous => {
      const panel = document.querySelector('[data-testid="planet-regional-preview-v129"]');
      if (panel?.getAttribute("data-render-status") !== "ready") return false;
      const canvas = panel.querySelector('canvas[data-testid="planet-regional-visual-v129"]');
      if (!canvas) return false;
      const rgba = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height).data;
      for (let i = 0; i < rgba.length; i += 4) {
        if (rgba[i] !== previous[i] || rgba[i + 1] !== previous[i + 1] || rgba[i + 2] !== previous[i + 2]) return true;
      }
      return false;
    }, baseline, { timeout: 60000 });
    check("Regional liquid selection changes actual map pixels", (await generator.getAttribute("data-preview-planet-code")) === code);
    await preview.screenshot({ path: path.join(output, "after-v131-pbr-coastal-map.png") });
    await surfaceSelect.selectOption(initialSurface);
  }
  await preview.getByTestId("planet-regional-quality-v131").selectOption("albedo");
  const expectedAlbedoMode = jsonKit.entries.some(entry => entry.surfaceMaterialId !== null)
    ? "albedo-coastal-v135" : "albedo-v129";
  await page.waitForFunction(expected => document.querySelector('[data-testid="planet-regional-preview-v129"]')
    ?.getAttribute("data-render-mode") === expected, expectedAlbedoMode, { timeout: 60000 });
  check("V135 albedo preserves valid geographic surface choices or uses legacy land fallback",
    (await generator.getAttribute("data-preview-planet-code")) === code);
  if (expectedAlbedoMode === "albedo-coastal-v135") {
    const ids = await surfaceSelect.locator("option").evaluateAll(nodes => nodes.map(node => node.value).filter(Boolean));
    if (ids.length > 1) {
      const beforeSurface = await surfaceSelect.inputValue();
      const nextSurface = ids.find(id => id !== beforeSurface);
      const originalPixels = await visual.evaluate(canvas => Array.from(canvas.getContext("2d")
        .getImageData(0, 0, canvas.width, canvas.height).data));
      await surfaceSelect.selectOption(nextSurface);
      await page.waitForFunction(previous => {
        const panel = document.querySelector('[data-testid="planet-regional-preview-v129"]');
        if (panel?.getAttribute("data-render-mode") !== "albedo-coastal-v135") return false;
        const canvas = panel.querySelector('canvas[data-testid="planet-regional-visual-v129"]');
        if (!canvas) return false;
        const rgba = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height).data;
        return rgba.some((value,index) => value !== previous[index]);
      }, originalPixels, { timeout: 60000 });
      check("V135 albedo sea material selection visibly changes the actual planisphere", true);
      await surfaceSelect.selectOption(beforeSurface);
    }
  }
  await preview.getByTestId("planet-regional-quality-v131").selectOption("pbr");
  await page.waitForFunction(() => document.querySelector('[data-testid="planet-regional-preview-v129"]')
    ?.getAttribute("data-render-mode") === "pbr-v131", null, { timeout: 60000 });
  await preview.getByTestId("planet-regional-projection-v129").selectOption("globe");
  await page.waitForFunction(() => document.querySelector('[data-testid="planet-regional-preview-v129"]')
    ?.getAttribute("data-render-status") === "ready", null, { timeout: 60000 });
  await preview.screenshot({ path: path.join(output, "after-v131-pbr-globe.png") });
  await preview.getByTestId("planet-regional-projection-v129").selectOption("map");
  await page.waitForFunction(() => document.querySelector('[data-testid="planet-regional-preview-v129"]')
    ?.getAttribute("data-render-status") === "ready", null, { timeout: 60000 });

  const hasSupplementalSurface = (await surfaceSelect.locator("option").count()) > 1;
  check("Surface selection reports whether this biome can support fluid details", hasSupplementalSurface || await surfaceSelect.isDisabled());

  const maskBuffers = [];
  for (const regionId of regions.slice(0, 2)) {
    await regionSelect.selectOption(regionId);
    const downloadEvent = page.waitForEvent("download", { timeout: 180000 });
    await kit.getByTestId("planet-region-kit-export-v128").click();
    const download = await downloadEvent;
    const filename = path.join(output, download.suggestedFilename());
    await download.saveAs(filename);
    const zip = storedZip(await readFile(filename));
    const manifest = JSON.parse(zip.get("manifest.json").toString("utf8"));
    check("Manifest binds kit to exact world and chosen region", manifest.worldCode === code && manifest.regionId === regionId && manifest.version === 128);
    check("Export carries a real land texture source", manifest.land.id.startsWith("land-"));
    check("Manifest describes all source channels", manifest.files.length === 5 || manifest.files.length === 10);
    check("ZIP supplies all land PBR channels", ["albedo", "height", "normal", "roughness", "emissive"]
      .every(channel => zip.has("land-" + channel + ".png")));
    const land = await sharp(zip.get("land-normal.png")).metadata();
    check("Normal texture is 256 by 256", land.width === 256 && land.height === 256);
    const raw = await sharp(zip.get("region-mask-map.png")).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    check("Region mask is equirectangular 512 by 256", raw.info.width === 512 && raw.info.height === 256);
    const occupied = raw.data.filter((byte, index) => index % 4 === 3 && byte === 255).length;
    check("Each chosen region yields visible pixels and transparent exterior", occupied > 0 && occupied < 512 * 256);
    maskBuffers.push(raw.data);
    check("Export still does not change the game world", (await generator.getAttribute("data-preview-planet-code")) === code);
  }
  let overlap = 0;
  for (let index = 3; index < maskBuffers[0].length; index += 4) {
    if (maskBuffers[0][index] > 0 && maskBuffers[1][index] > 0) overlap++;
  }
  check("Two distinct region masks do not overlap", overlap === 0);

  // V134: explicit device-only storage, reversible profile imports and
  // application of identical quality/physical coast range across views.
  await regionSelect.selectOption(regions[0]);
  const priorLand = await landSelect.inputValue();
  const editedLand = (await landSelect.locator("option").evaluateAll(options => options.map(x => x.value)))
    .find(value => value !== priorLand);
  check("V134 test region has an alternate material", Boolean(editedLand));
  await landSelect.selectOption(editedLand);
  await preview.getByTestId("planet-regional-quality-v131").selectOption("albedo");
  await preview.getByTestId("planet-regional-coastal-v131").selectOption("1800");
  await kit.getByTestId("planet-visual-save-v134").click();
  const visualStorageKey = "yautja:planet-visual-profile:v134:" + encodeURIComponent(code);
  const storedV134 = await page.evaluate(key => {
    const source = window.localStorage.getItem(key);
    return source ? JSON.parse(source) : null;
  }, visualStorageKey);
  check("V134 stores only exact-world visuals and not war progress", storedV134?.version === 134 &&
    storedV134.worldCode === code && storedV134.kit.entries[0].landMaterialId === editedLand &&
    storedV134.quality === "albedo" && storedV134.coastalInfluenceKm === 1800 &&
    !JSON.stringify(storedV134).includes("combatants"));
  await landSelect.selectOption(priorLand);
  await preview.getByTestId("planet-regional-quality-v131").selectOption("pbr");
  await preview.getByTestId("planet-regional-coastal-v131").selectOption("300");
  await kit.getByTestId("planet-visual-restore-v134").click();
  await page.waitForFunction(expected => {
    const editor = document.querySelector('[data-testid="planet-regional-kit-v128"]');
    return editor?.querySelector('select[id$="-kit-land"]')?.value === expected &&
      editor.querySelector('[data-testid="planet-regional-quality-v131"]')?.value === "albedo" &&
      editor.querySelector('[data-testid="planet-regional-coastal-v131"]')?.value === "1800";
  }, editedLand, { timeout: 15000 });
  check("V134 restores all visual fields without changing the planet", (await generator.getAttribute("data-preview-planet-code")) === code);
  const profileExportEvent = page.waitForEvent("download", { timeout: 45000 });
  await kit.getByTestId("planet-visual-export-v134").click();
  const profileDownload = await profileExportEvent;
  const profileFile = path.join(output, profileDownload.suggestedFilename());
  await profileDownload.saveAs(profileFile);
  const exportedV134 = JSON.parse((await readFile(profileFile)).toString("utf8"));
  check("V134 portable JSON contains the same validated sidecar", exportedV134.version === 134 &&
    exportedV134.worldCode === code && exportedV134.kit.entries[0].landMaterialId === editedLand);
  await landSelect.selectOption(priorLand);
  await kit.getByTestId("planet-region-kit-import-v128").setInputFiles(profileFile);
  await page.waitForFunction(expected => {
    const editor = document.querySelector('[data-testid="planet-regional-kit-v128"]');
    return editor?.querySelector('select[id$="-kit-land"]')?.value === expected;
  }, editedLand, { timeout: 15000 });
  check("V134 portable JSON reimports through the existing V128 file picker",
    (await preview.getByTestId("planet-regional-coastal-v131").inputValue()) === "1800");

  // A damaged local file must be rejected, not silently replace a valid draft.
  await page.evaluate(key => window.localStorage.setItem(key, "{invalid"), visualStorageKey);
  await kit.getByTestId("planet-visual-restore-v134").click();
  check("V134 rejects malformed device storage without altering draft",
    (await landSelect.inputValue()) === editedLand &&
    (await kit.getByTestId("planet-visual-storage-status-v134").innerText()).includes("rejetées"));
  await kit.getByTestId("planet-visual-save-v134").click();

  // A second tab simulates reload with the same browser storage. The world
  // must be regenerated canonically, not cloned by mutating the source object.
  const restoredTab = await context.newPage();
  await restoredTab.goto(baseUrl + "/planet-generator-v103", { waitUntil: "domcontentloaded", timeout: 90000 });
  const restoredGenerator = restoredTab.getByTestId("planet-generator-v103").filter({ visible: true });
  await restoredGenerator.getByRole("button", { name: "Activer le générateur V115", exact: true }).click();
  await restoredGenerator.getByRole("button", { name: "Générer l’aperçu", exact: true }).click();
  await restoredTab.waitForFunction(() => [...document.querySelectorAll('[data-testid="planet-generator-v103"]')]
    .some(el => !el.closest("[hidden]") && el.getAttribute("data-recipe-version") === "115"), null, { timeout: 90000 });
  check("V134 reload regenerates the exact same canonical world",
    (await restoredGenerator.getAttribute("data-preview-planet-code")) === code);
  const restoredExporter = restoredGenerator.getByTestId("planet-layer-export-v102");
  await restoredExporter.locator("summary").click();
  const restoredKit = restoredExporter.getByTestId("planet-regional-kit-v128");
  await restoredTab.waitForFunction(() => document.querySelector('[data-testid="planet-visual-storage-status-v134"]')
    ?.textContent?.includes("conservé"), null, { timeout: 15000 });
  check("V134 auto-restores the local material after reload, without applying it to the war",
    (await restoredKit.getByRole("combobox", { name: "Sol compatible avec le biome" }).inputValue()) === editedLand &&
    (await restoredGenerator.getByTestId("planet-main-kit-status-v133").innerText()).includes("native"));
  await restoredKit.getByTestId("planet-regional-preview-toggle-v129").click();
  check("V134 restores the shared PBR quality and coastal scale after reload",
    (await restoredKit.getByTestId("planet-regional-quality-v131").inputValue()) === "albedo" &&
    (await restoredKit.getByTestId("planet-regional-coastal-v131").inputValue()) === "1800");
  await restoredTab.close();

  await kit.getByTestId("planet-visual-delete-v134").click();
  check("V134 deletion only clears the local key, not the live draft or the planet",
    await page.evaluate(key => window.localStorage.getItem(key) === null, visualStorageKey) &&
    (await landSelect.inputValue()) === editedLand &&
    (await generator.getAttribute("data-preview-planet-code")) === code);

  await kit.screenshot({ path: path.join(output, "after-v128-regional-kit-desktop.png") });
  await page.setViewportSize({ width: 390, height: 844 });
  await kit.screenshot({ path: path.join(output, "after-v128-regional-kit-mobile.png") });
  check("Mobile region kit remains operable", await kit.getByTestId("planet-region-kit-export-v128").isEnabled());
  check("No browser runtime errors", errors.length === 0);
  result = { pass: true, worldCode: code, checks, errors, regionsSampled: regions.slice(0, 2) };
} catch (error) {
  result = { pass: false, checks, errors, error: String(error), stack: error?.stack };
  await page.screenshot({ path: path.join(output, "failure.png"), fullPage: true }).catch(() => {});
} finally {
  await writeFile(path.join(output, "result.json"), JSON.stringify(result, null, 2) + "\n");
  await browser.close();
}
if (!result.pass) { console.error(result); process.exitCode = 1; }
else console.log("PASS V128 regional kit: " + result.checks.length + " browser checks");
