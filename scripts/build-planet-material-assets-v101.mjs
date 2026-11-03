import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import sharp from "sharp";
import { build } from "esbuild";

const root = path.resolve("public/game/planets/v101");
const docs = path.resolve("docs/planet-materials-v101");
const sha = bytes => crypto.createHash("sha256").update(bytes).digest("hex");
const bundle = await build({ stdin: { contents: "export * from './app/game/systems/clanWarPlanetsV96'; export * from './app/game/systems/planetMaterialV101';", resolveDir: process.cwd() }, bundle: true, write: false, format: "esm", platform: "node", logLevel: "silent" });
const api = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString("base64")}`);
const land = [...new Set(api.WAR_PLANETS_V96.map(planet => `land-${planet.landBiome}`))];
const surface = [...new Set(api.WAR_PLANETS_V96.map(planet => `surface-${planet.surface.kind}`))];
const effects = ["clouds-cirrus", "clouds-storm", "clouds-low", "haze-dust", "haze-ash", "particles-spores", "aurora"];
const ids = [...land, ...surface, ...effects].sort();
await fs.mkdir(path.join(root, "runtime"), { recursive: true });
await fs.mkdir(docs, { recursive: true });
const materials = [];
for (const id of ids) {
  const native = path.join(root, "materials", `${id}.png`);
  const bytes = await fs.readFile(native);
  const metadata = await sharp(bytes).metadata();
  const { data, info } = await sharp(bytes).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let alphaZero = 0, alphaPartial = 0, alphaOpaque = 0;
  for (let offset = 3; offset < data.length; offset += 4) {
    if (data[offset] === 0) alphaZero++;
    else if (data[offset] === 255) alphaOpaque++;
    else alphaPartial++;
  }
  if (metadata.width !== metadata.height || metadata.width < 1024) throw new Error(`${id}: native size`);
  if (effects.includes(id) && (alphaPartial === 0 || alphaZero === 0)) throw new Error(`${id}: atmospheric overlay requires transparent and partially transparent pixels`);
  if (!effects.includes(id) && alphaOpaque !== info.width * info.height) throw new Error(`${id}: base material must be opaque`);
  // Technical runtime derivative only: no crop, recoloring, compositing or
  // modification of the native source. Shader performs all visual layering.
  const runtimeBytes = await sharp(bytes).resize(512, 512, { fit: "fill" }).webp({ quality: 88, alphaQuality: 100, effort: 6 }).toBuffer();
  const runtimePath = path.join(root, "runtime", `${id}.webp`);
  await fs.writeFile(runtimePath, runtimeBytes);
  materials.push({ id, role: effects.includes(id) ? "atmospheric-overlay" : id.startsWith("land-") ? "land-material" : "intercontinental-material", source: `materials/${id}.png`, runtime: `runtime/${id}.webp`, width: metadata.width, height: metadata.height, channels: metadata.channels, sourceSha256: sha(bytes), sourceBytes: bytes.length, runtimeWidth: 512, runtimeHeight: 512, runtimeSha256: sha(runtimeBytes), runtimeBytes: runtimeBytes.length, alpha: { transparent: alphaZero, partial: alphaPartial, opaque: alphaOpaque } });
}
if (materials.length !== 30 || land.length !== 13 || surface.length !== 10) throw new Error("Unexpected family inventory");
const planets = api.WAR_PLANETS_V96.map(planet => ({ id: planet.id, name: planet.name, style: planet.style, landBiome: planet.landBiome, surface: planet.surface, seed: planet.seed, continentCount: planet.landmasses.length, regions: planet.regions.length, territories: planet.territories.length, landFraction: planet.landFraction, recipe: api.planetMaterialRecipeV101(planet) }));
const manifest = { version: "v101", created: "2026-10-21", basedOn: "536ac53335e440747f6eccedd2cd757d1f817a99", title: "Matières modulaires des 30 planètes de guerre des clans", sourceColorSpace: "sRGB", nativeGeneration: "image_gen built-in", sourcePolicy: "Unmodified native generated PNGs. Prompts and visual reviews in docs/planet-materials-v101.", runtimePolicy: "512 square WebP, quality 88, alpha quality 100. Resampling/encoding only; source PNGs unchanged.", mapping: "World-space triplanar mirrored sampling; exact V97 landmass geometry. Native tile edges are not certified seamless.", atmosphere: "Artistic Rayleigh/Mie-style limb and twilight approximation in a separate shader layer, not a physically measured scattering simulation.", layers: api.PLANET_MATERIAL_LAYERS_V101, sourceBytes: materials.reduce((n, m) => n + m.sourceBytes, 0), runtimeBytes: materials.reduce((n, m) => n + m.runtimeBytes, 0), materials, planets };
await fs.writeFile(path.join(root, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
await fs.writeFile(path.join(docs, "asset-audit.json"), JSON.stringify({ date: "2026-10-21", ok: true, counts: { planets: planets.length, land: land.length, surface: surface.length, atmospheric: effects.length, native: materials.length, runtime: materials.length }, sourceBytes: manifest.sourceBytes, runtimeBytes: manifest.runtimeBytes, materials }, null, 2) + "\n");
console.log(JSON.stringify({ planets: planets.length, materials: materials.length, sourceBytes: manifest.sourceBytes, runtimeBytes: manifest.runtimeBytes }));
