import assert from "node:assert/strict";
import test, { after } from "node:test";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";
const dir = await mkdtemp(join(tmpdir(), "planet-pbr-v131-"));
after(() => rm(dir, { recursive: true, force: true }));
const bundle = await build({
  stdin: { contents: 'export { packPlanetPbrFactorsV131 } from "./app/game/planetRegionalPbrAtlasesV131";',
    resolveDir: process.cwd(), loader: "ts" },
  bundle: true, write: false, format: "esm", platform: "node", target: "es2022", logLevel: "silent",
});
const file = join(dir, "pbr.mjs");
await writeFile(file, bundle.outputFiles[0].text);
const { packPlanetPbrFactorsV131 } = await import(pathToFileURL(file));
test("packed channels preserve height, roughness and emissive while saving samplers", () => {
  const height = Uint8ClampedArray.from([40,40,40,255,255,255,255,255]);
  const rough = Uint8ClampedArray.from([120,120,120,255,30,30,30,255]);
  const glow = Uint8ClampedArray.from([1,2,8,255,99,11,5,255]);
  const packed = packPlanetPbrFactorsV131(height,rough,glow);
  assert.deepEqual([...packed], [40,120,8,255,255,30,99,255]);
  assert.equal(height[0],40);
});
test("forged channel byte counts are refused before GPU upload", () => {
  const a = new Uint8ClampedArray(8);
  assert.throws(() => packPlanetPbrFactorsV131(a,new Uint8ClampedArray(4),a), /incompatibles/);
  assert.throws(() => packPlanetPbrFactorsV131(new Uint8ClampedArray(0),a,a), /incompatibles/);
});
