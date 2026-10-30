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
