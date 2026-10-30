import assert from "node:assert/strict";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright-core";
import sharp from "sharp";

const baseUrl = process.env.YAUTJA_QA_BASE_URL ?? "http://127.0.0.1:3101";
const output = path.resolve(process.env.YAUTJA_PLANET_V124_QA_OUTPUT ?? "outputs/qa-planet-modular-v124");
await mkdir(output, { recursive: true });
const checks = [], errors = [];
const check = (label, truth) => { assert.ok(truth, label); checks.push(label); };

function zipEntries(bytes) {
  const files = new Map();
  let offset = 0;
  while (offset + 30 < bytes.length && bytes.readUInt32LE(offset) === 0x04034b50) {
    const size = bytes.readUInt32LE(offset + 18);
    const nameLength = bytes.readUInt16LE(offset + 26);
    const extraLength = bytes.readUInt16LE(offset + 28);
    const name = bytes.toString("utf8", offset + 30, offset + 30 + nameLength);
    const start = offset + 30 + nameLength + extraLength;
    assert(start + size <= bytes.length, "stored ZIP member is complete");
    files.set(name, bytes.subarray(start, start + size));
    offset = start + size;
  }
  assert(files.size > 0 && files.size <= 16, "ZIP contains bounded member count");
  return files;
}

const browser = await chromium.launch({
  ...(process.env.CHROMIUM_EXECUTABLE_PATH
    ? { executablePath: process.env.CHROMIUM_EXECUTABLE_PATH }
    : { channel: process.env.AUDIT_CHROME_CHANNEL ?? "chrome" }),
  headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage", "--enable-unsafe-swiftshader", "--use-gl=angle", "--use-angle=swiftshader"],
});
const context = await browser.newContext({ viewport: { width: 1440, height: 1050 }, acceptDownloads: true, reducedMotion: "reduce" });
const page = await context.newPage();
page.on("pageerror", error => errors.push(error.message));

let failure = null, planetCode = "", report = null;
try {
  await page.goto(`${baseUrl}/planet-generator-v103`, { waitUntil: "domcontentloaded", timeout: 90000 });
  const generator = page.getByTestId("planet-generator-v103").filter({ visible: true });
  await generator.waitFor();
  await generator.getByRole("button", { name: "Activer le générateur V115", exact: true }).click();
  await generator.getByRole("button", { name: "Générer l’aperçu", exact: true }).click();
  await page.waitForFunction(() => [...document.querySelectorAll('[data-testid="planet-generator-v103"]')]
    .some(element => !element.closest("[hidden]") && element.getAttribute("data-recipe-version") === "115"), null, { timeout: 90000 });
  planetCode = await generator.getAttribute("data-preview-planet-code");
  check("browser preview is a genuine V115 recipe", planetCode.startsWith("proc-v115-"));

  const exporter = generator.getByTestId("planet-layer-export-v102");
  await exporter.locator("summary").click();
  await exporter.screenshot({ path: path.join(output, "after-modular-export-panel.png") });
  const select = exporter.getByRole("combobox", { name: "Calque", exact: true });
  const options = await select.locator("option").evaluateAll(elements => elements.map(item => item.value));
  check("region identity and regional material exports are present", options.includes("region-index") && options.includes("regional-atlas"));
  check("hydrology exports only show actually available features", options.includes("lake-mask") || options.includes("river-mask"));

  async function downloadLayer(layer) {
    await select.selectOption(layer);
    const waiting = page.waitForEvent("download", { timeout: 180000 });
    await exporter.getByRole("button", { name: "Télécharger le PNG", exact: true }).click();
    const download = await waiting;
    const filename = path.join(output, download.suggestedFilename());
    await download.saveAs(filename);
    return filename;
  }

  const indexPng = await downloadLayer("region-index");
  const indexRaw = await sharp(indexPng).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  check("region mask has 1024x512 map dimensions", indexRaw.info.width === 1024 && indexRaw.info.height === 512);
  let landPixels = 0, seaPixels = 0, maxId = 0;
  for (let i = 0; i < indexRaw.data.length; i += 4) {
    const r = indexRaw.data[i], a = indexRaw.data[i + 3];
    if (a > 0) { landPixels++; maxId = Math.max(maxId, r); assert(r >= 1 && r <= 12); }
    else seaPixels++;
  }
  check("mask distinguishes land from surrounding liquids without invalid region indices", landPixels > 0 && seaPixels > 0 && maxId >= 3);

  const atlasPath = await downloadLayer("regional-atlas");
  const atlasInfo = await sharp(atlasPath).metadata();
  check("V115 regional material atlas has four columns of 256-pixel tiles", atlasInfo.width === 1024 && atlasInfo.height >= 256 && atlasInfo.height <= 768);

  for (const layer of ["lake-mask", "river-mask"].filter(value => options.includes(value))) {
    const file = await downloadLayer(layer);
    const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    check(`${layer} keeps 1024x512 independent map geometry`, info.width === 1024 && info.height === 512);
    let occupied = 0;
    for (let index = 3; index < data.length; index += 4) if (data[index] !== 0) occupied++;
    check(`${layer} contains rasterized inland features rather than an empty placeholder`, occupied > 0);
  }

  const textureLab = exporter.getByTestId("planet-extra-materials-v125");
  await textureLab.getByRole("combobox", { name: "Texture complémentaire" }).selectOption("land-bioceramic");
  await textureLab.getByRole("combobox", { name: "Canal indépendant" }).selectOption("normal");
  const extraWaiting = page.waitForEvent("download", { timeout: 90000 });
  await textureLab.getByRole("button", { name: "Télécharger cette matière PNG" }).click();
  const extraDownload = await extraWaiting;
  const extraPath = path.join(output, extraDownload.suggestedFilename());
  await extraDownload.saveAs(extraPath);
  const extraRaw = await sharp(extraPath).raw().toBuffer({ resolveWithObject: true });
  check("V125 supplemental terrain normal map is a real 512-pixel bitmap",
    extraRaw.info.width === 512 && extraRaw.info.height === 512);
  check("V125 normal map contains differentiated texels",
    new Set(extraRaw.data.subarray(0, 512 * 512).filter((_, idx) => idx % 4 === 0)).size > 5);
  await textureLab.screenshot({ path: path.join(output, "after-v125-material-catalog.png") });

  const waiting = page.waitForEvent("download", { timeout: 240000 });
  await exporter.getByTestId("planet-export-pack-v114").click();
  const pack = await waiting;
  const packPath = path.join(output, pack.suggestedFilename());
  await pack.saveAs(packPath);
  const files = zipEntries(await readFile(packPath));
  check("ZIP contains all four classes of modular layers when available",
    files.has("region-index-map.png") && files.has("regional-atlas-atlas.png")
    && [...files.keys()].filter(name => name.endsWith("-mask-map.png")).length >= 1);
  const manifest = JSON.parse(files.get("manifest.json")?.toString("utf8") ?? "null");
  check("V124 ZIP keeps the canonical world code", manifest?.version === 124 && manifest.code === planetCode);
  check("V124 manifest maps actual region indices to texture tiles", manifest.modularMasks?.regions?.length >= 3
    && manifest.modularMasks.regions.every((region, index) => region.redValue === index + 1));
  check("V125 manifest records physical planet radius and 120 independent forms",
    manifest.modularMasks?.physicalIndex?.radiusKm > 0
    && manifest.modularMasks?.shapeCatalog?.length === 120);
  check("V125 manifest includes 32 independent earthlike / alien material entries",
    manifest.modularMasks?.supplementalMaterialCatalog?.length === 32);
  check("V124 manifest matches every exported file and real canvas dimensions",
    manifest.layers.every(layer => {
      const file = files.get(layer.name);
      return file && file.length > 0 && layer.width > 0 && layer.height > 0;
    }));
  check("no browser exceptions while exporting", errors.length === 0);
  report = { passed: true, planetCode, checks, layers: manifest.layers, errors };
} catch (error) {
  failure = error instanceof Error ? error.stack ?? error.message : String(error);
  report = { passed: false, planetCode, checks, errors, failure };
  await page.screenshot({ path: path.join(output, "failed-browser.png") }).catch(() => {});
} finally {
  await writeFile(path.join(output, "report.json"), JSON.stringify(report, null, 2) + "\n");
  await context.close();
  await browser.close();
}
if (failure) throw new Error(failure);
console.log(JSON.stringify({ passed: true, checks: checks.length, output }));
