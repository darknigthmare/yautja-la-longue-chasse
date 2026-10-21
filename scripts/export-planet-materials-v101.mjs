/** Render the modular planet kit through the same WebGL renderer as the game.
 * Start the app, then run:
 * YAUTJA_PLANET_MATERIAL_URL=http://127.0.0.1:3101 \
 * CHROMIUM_EXECUTABLE_PATH=/path/to/chromium node scripts/export-planet-materials-v101.mjs
 * --resume reuses files only when the source fingerprint and file hashes match.
 * --planet=korthas limits an initial smoke run; a subsequent --resume finishes it.
 */
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { chromium } from "playwright-core";
import sharp from "sharp";

const root = process.cwd();
const base = (process.env.YAUTJA_PLANET_MATERIAL_URL || "http://127.0.0.1:3101").replace(/\/$/, "");
const output = path.resolve(process.env.YAUTJA_PLANET_MATERIAL_EXPORT_OUTPUT || "public/game/planets/v101");
const manifestPath = path.join(output, "exports.json");
const resume = process.argv.includes("--resume");
const onlyPlanet = process.argv.find(argument => argument.startsWith("--planet="))?.slice(9);
const hash = bytes => createHash("sha256").update(bytes).digest("hex");
const nativeManifest = JSON.parse(await fs.readFile(path.join(root, "public/game/planets/v101/manifest.json"), "utf8"));
const sourcePaths = [
  "app/game/planetMaterialRendererV101.ts", "app/game/systems/planetMaterialV101.ts",
  "app/game/systems/clanWarPlanetsV96.ts", "app/game/systems/clanWarCoastlinesV97.ts",
  "app/planet-materials-v101/review.tsx",
];
async function fingerprint() {
  const files = await fs.readdir(path.join(root, "public/game/planets/v101/materials"));
  const all = [...sourcePaths, ...files.filter(file => file.endsWith(".png")).sort().map(file => `public/game/planets/v101/materials/${file}`)];
  const hashes = [];
  for (const file of all) hashes.push([file, hash(await fs.readFile(path.join(root, file)))]);
  return hash(JSON.stringify(hashes));
}
const sourceFingerprint = await fingerprint();
let previous;
try { previous = JSON.parse(await fs.readFile(manifestPath, "utf8")); } catch (error) { if (error.code !== "ENOENT") throw error; }
if (resume && previous) assert.equal(previous.sourceFingerprint, sourceFingerprint, "Source files changed; rerun without --resume to regenerate affected exports.");

await fs.mkdir(output, { recursive: true });
const manifest = {
  schemaVersion: 1, generatedAt: new Date().toISOString(), sourceFingerprint,
  generator: "Game WebGL renderer via Chromium canvas PNG export", sourceTextureSize: 1024,
  map: { width: 1024, height: 512, projection: "equirectangular", longitudeRange: [-180, 180], latitudeRange: [90, -90] },
  globe: { width: 512, height: 512, longitude: -25, latitude: 15, radiusFraction: 0.43 },
  alphaConvention: "PNG straight alpha; effects and land are independent RGBA layers. The surface map is the opaque underlay.",
  compositionOrder: ["surface", "land", "night", "emissive", "clouds", "weather", "aurora", "atmosphere"],
  notes: [
    "Maps and globe effects have different projections and cannot be superimposed without reprojection.",
    "The downloadable globe is the complete reference composition. Albedo excludes lighting and atmospheric layers.",
    "Atmospheric scattering is an artistic approximation. No physical height, normal or roughness maps are inferred.",
    "Some identical night or atmosphere files are intentionally reusable between planets with the same illumination or atmosphere palette.",
  ],
  complete: false, planets: resume && previous ? previous.planets : [],
};
const save = async () => fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
const executablePath = process.env.CHROMIUM_EXECUTABLE_PATH || chromium.executablePath();
const browser = await chromium.launch({ executablePath, headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage", "--enable-unsafe-swiftshader", "--use-gl=angle", "--use-angle=swiftshader"] });
const errors = [];
try {
  const context = await browser.newContext({ viewport: { width: 1024, height: 768 }, reducedMotion: "reduce" });
  const page = await context.newPage();
  page.on("pageerror", error => errors.push(error.message));
  await page.goto(`${base}/planet-materials-v101`, { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.waitForFunction(() => Boolean(window.__YAUTJA_PLANET_MATERIALS_V101__), { timeout: 120000 });
  const recipes = await page.evaluate(() => window.__YAUTJA_PLANET_MATERIALS_V101__.recipes());
  assert.equal(recipes.length, 30, "Export must cover the current thirty-world registry.");
  if (onlyPlanet) assert.ok(recipes.some(recipe => recipe.id === onlyPlanet), "Unknown --planet ID.");
  for (const recipe of recipes.filter(recipe => !onlyPlanet || recipe.id === onlyPlanet)) {
    const source = nativeManifest.planets.find(planet => planet.id === recipe.id);
    assert.ok(source, `${recipe.id}: missing source recipe`);
    const existing = manifest.planets.find(planet => planet.id === recipe.id);
    const planet = { id: recipe.id, name: source.name, biome: source.landBiome, recipe, files: [] };
    const layers = [
      ...["albedo", "land", "surface", "clouds", "weather", "mask"].map(layer => ({ file: `${layer}.png`, layer, projection: "map", width: 1024, height: 512 })),
      { file: "globe.png", layer: "composite", projection: "globe", width: 512, height: 512 },
      ...["atmosphere", "night"].map(layer => ({ file: `${layer}.png`, layer, projection: "globe", width: 512, height: 512 })),
      ...(recipe.emission > 0 ? [{ file: "emissive.png", layer: "emissive", projection: "map", width: 1024, height: 512 }] : []),
      ...(recipe.auroraOpacity > 0 ? [{ file: "aurora.png", layer: "aurora", projection: "map", width: 1024, height: 512 }] : []),
    ];
    await fs.mkdir(path.join(output, "planets", recipe.id), { recursive: true });
    for (const spec of layers) {
      const relativePath = `planets/${recipe.id}/${spec.file}`;
      const destination = path.join(output, relativePath);
      const prior = existing?.files.find(file => file.path === relativePath);
      let png;
      if (resume && prior) {
        try { const bytes = await fs.readFile(destination); if (hash(bytes) === prior.sha256) png = bytes; } catch (error) { if (error.code !== "ENOENT") throw error; }
      }
      if (!png) {
        // The renderer owns one shared GPU canvas, so export every layer sequentially.
        const data = await page.evaluate(options => window.__YAUTJA_PLANET_MATERIALS_V101__.export(options), {
          planetId: recipe.id, projection: spec.projection, layer: spec.layer, width: spec.width, height: spec.height,
          textureSize: 1024, longitude: -25, latitude: 15,
        });
        assert.ok(data.startsWith("data:image/png;base64,"), `${recipe.id}/${spec.file}: not PNG`);
        png = Buffer.from(data.slice(data.indexOf(",") + 1), "base64");
        await fs.writeFile(destination, png);
      }
      const metadata = await sharp(png).metadata();
      const { data: pixels, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      assert.equal(metadata.width, spec.width); assert.equal(metadata.height, spec.height);
      let alphaMin = 255, alphaMax = 0, transparentPixels = 0, translucentPixels = 0, opaquePixels = 0;
      for (let index = 3; index < pixels.length; index += info.channels) {
        const alpha = pixels[index]; alphaMin = Math.min(alphaMin, alpha); alphaMax = Math.max(alphaMax, alpha);
        if (alpha === 0) transparentPixels++; else if (alpha === 255) opaquePixels++; else translucentPixels++;
      }
      assert.ok(alphaMax > 0, `${recipe.id}/${spec.file}: empty export`);
      if (["land", "clouds", "weather", "atmosphere", "night", "emissive", "aurora"].includes(spec.layer)) {
        assert.ok(alphaMin < 255, `${recipe.id}/${spec.file}: alpha layer is unexpectedly opaque`);
      }
      if (spec.layer === "land" || spec.projection === "globe") assert.ok(transparentPixels > 100, `${recipe.id}/${spec.file}: missing transparent area`);
      planet.files.push({ path: relativePath, layer: spec.layer, projection: spec.projection, width: spec.width, height: spec.height,
        sha256: hash(png), bytes: png.length, channels: metadata.channels, alpha: { min: alphaMin, max: alphaMax, transparentPixels, translucentPixels, opaquePixels } });
    }
    manifest.planets = [...manifest.planets.filter(item => item.id !== recipe.id), planet].sort((a, b) => recipes.findIndex(item => item.id === a.id) - recipes.findIndex(item => item.id === b.id));
    await save();
    console.log(JSON.stringify({ planet: recipe.id, files: planet.files.length, completedPlanets: manifest.planets.length, totalPlanets: recipes.length }));
  }
  assert.equal(await fingerprint(), sourceFingerprint, "Sources changed during export; regenerate before publishing.");
  assert.deepEqual(errors, [], "Browser raised runtime errors during export.");
  for (const layer of ["albedo", "land", "mask", "composite"]) {
    const files = manifest.planets.map(planet => planet.files.find(file => file.layer === layer));
    assert.equal(new Set(files.map(file => file.sha256)).size, files.length, `Every planet needs a distinct ${layer} export.`);
  }
  manifest.complete = manifest.planets.length === recipes.length;
  manifest.totalFiles = manifest.planets.reduce((sum, planet) => sum + planet.files.length, 0);
  manifest.totalBytes = manifest.planets.reduce((sum, planet) => sum + planet.files.reduce((n, file) => n + file.bytes, 0), 0);
  manifest.validation = { browserErrors: errors, uniqueAlbedoLandMaskAndGlobe: true, alphaAndDimensionsVerified: true, sourceFingerprintStable: true };
  await save();
  const escape = value => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll('"', "&quot;");
  const cards = manifest.planets.map(planet => `<article><a href="planets/${planet.id}/globe.png"><img src="planets/${planet.id}/globe.png" width="256" height="256" loading="lazy" alt="Globe de ${escape(planet.name)}"></a><h2>${escape(planet.name)}</h2><p>${escape(planet.id)}</p><nav aria-label="Calques de ${escape(planet.name)}">${planet.files.map(file => `<a href="${file.path}" download>${escape(file.path.split("/").pop())}</a>`).join("")}</nav></article>`).join("\n");
  await fs.writeFile(path.join(output, "index.html"), `<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Yautja — 30 planètes modulaires</title><style>body{margin:0;background:#081219;color:#dae2d9;font:15px/1.6 system-ui,sans-serif}header,main,footer{max-width:1380px;margin:auto;padding:30px}h1{font-size:clamp(28px,4vw,48px);line-height:1.15;color:#e3d7b7}header p{max-width:900px}a{color:#b3d9d4}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:22px}article{background:#11232b;border:1px solid #34505c;border-radius:12px;padding:18px}article img{width:100%;height:auto;background:radial-gradient(#1a303d,#071017);border-radius:8px}article h2{margin:12px 0 0;color:#eadbbe}article p{margin:2px 0 14px;color:#9dafb5;font-size:12px}nav{display:flex;flex-wrap:wrap;gap:6px}nav a{border:1px solid #45616a;border-radius:4px;padding:4px 7px;font:11px/1.4 monospace;text-decoration:none}nav a:hover{background:#26444c}footer{color:#9eb2b8;font-size:13px}</style><header><p>YAUTJA / GUERRES DES CLANS / V101</p><h1>Les trente mondes<br>Textures et atmosphères modulaires</h1><p>Chaque planète conserve ses continents issus du jeu. Téléchargez séparément les terres, le fond de surface, les nuages, les brumes, le masque et les effets. Les cartes font 1 024 × 512 ; les globes et leurs effets font 512 × 512.</p><p><a href="exports.json">Manifeste des exports</a> · <a href="manifest.json">Sources et recettes</a></p></header><main>${cards}</main><footer>Créations du projet. Diffusion atmosphérique artistique. Les cartes planes et les calques de globe ont des projections différentes : reprojeter avant assemblage. Les PNG natifs de matière restent disponibles dans materials/.</footer></html>\n`);
  console.log(JSON.stringify({ complete: manifest.complete, planets: manifest.planets.length, files: manifest.totalFiles, bytes: manifest.totalBytes, manifest: manifestPath }));
} finally { await browser.close(); }
