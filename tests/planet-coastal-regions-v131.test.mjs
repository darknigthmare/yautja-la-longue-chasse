import assert from "node:assert/strict";
import test, { after } from "node:test";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";
const dir = await mkdtemp(join(tmpdir(), "planet-v131-coast-"));
after(() => rm(dir, { recursive: true, force: true }));
const compiled = await build({
  stdin: { contents: 'export { encodePlanetCoastalRegionsV131 } from "./app/game/planetCoastalRegionsV131";',
    resolveDir: process.cwd(), loader: "ts" },
  bundle: true, write: false, format: "esm", platform: "node", target: "es2022", logLevel: "silent",
});
const file = join(dir, "coast.mjs");
await writeFile(file, compiled.outputFiles[0].text);
const { encodePlanetCoastalRegionsV131 } = await import(pathToFileURL(file));
function masks(width = 32) {
  const size = width * width / 2;
  return { land: new Uint8ClampedArray(size * 4), regions: new Uint8ClampedArray(size * 4) };
}
function put(land,regions,width,x,y,index) {
  const off = (y * width + x) * 4;
  land[off] = 255; land[off + 3] = 255;
  regions[off] = index; regions[off + 3] = 255;
}
const indexOf = (result,width,x,y) => result[(y * width + x) * 4];

test("land IDs remain exact, oceans beyond coast range stay native", () => {
  const {land,regions} = masks();
  put(land,regions,32,10,8,0);
  put(land,regions,32,21,8,1);
  const data = encodePlanetCoastalRegionsV131(land,regions,32,16,6371,[true,true],1800);
  assert.equal(indexOf(data,32,10,8),0);
  assert.equal(indexOf(data,32,21,8),1);
  assert.equal(indexOf(data,32,10,9),0);
  assert.equal(indexOf(data,32,16,8),2);
  assert.equal(data.length,32*16*4);
});
test("longitude seam wraps but latitude does not fabricate a second pole", () => {
  const {land,regions} = masks();
  put(land,regions,32,0,8,0);
  const data = encodePlanetCoastalRegionsV131(land,regions,32,16,6371,[true,false],1800);
  assert.equal(indexOf(data,32,31,8),0);
  assert.equal(indexOf(data,32,0,8),0);
  assert.equal(indexOf(data,32,12,8),2);
});
test("coastal influence is physical kilometres, not an unscaled number of pixels", () => {
  const {land,regions} = masks();
  put(land,regions,32,8,8,0);
  const small = encodePlanetCoastalRegionsV131(land,regions,32,16,1900,[true],900);
  const huge = encodePlanetCoastalRegionsV131(land,regions,32,16,21000,[true],900);
  assert.equal(indexOf(small,32,9,8),0);
  assert.equal(indexOf(huge,32,9,8),1);
});
test("null surface choices never create new ocean materials", () => {
  const {land,regions} = masks();
  put(land,regions,32,8,8,0);
  put(land,regions,32,20,8,1);
  const data = encodePlanetCoastalRegionsV131(land,regions,32,16,1900,[false,true],1200);
  assert.equal(indexOf(data,32,8,8),0);
  assert.equal(indexOf(data,32,9,8),2);
  assert.equal(indexOf(data,32,19,8),1);
});
test("coastal transitions include a progressive distance-limited fade", () => {
  const {land,regions} = masks();
  put(land,regions,32,8,8,0);
  const result = encodePlanetCoastalRegionsV131(land,regions,32,16,1900,[true],900);
  const at = x => result[(8 * 32 + x) * 4 + 2];
  assert.equal(at(8),0);
  assert.equal(at(9),255);
  assert(at(10) > 0 && at(10) < 255);
  assert.equal(at(11),0);
});
test("forged masks and invalid physical parameters are refused", () => {
  const {land,regions} = masks();
  put(land,regions,32,5,8,9);
  assert.throws(() => encodePlanetCoastalRegionsV131(land,regions,32,16,6371,[true],900), /étrangère/);
  assert.throws(() => encodePlanetCoastalRegionsV131(land,regions,32,16,6371,[true],3200), /incompatibles/);
  assert.throws(() => encodePlanetCoastalRegionsV131(land,regions,32,8,6371,[true],900), /incompatibles/);
});
