import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import sharp from "sharp";
import { build } from "esbuild";
import { p, patrolRoute } from "./helpers/youth-patrol-played-route.mjs";
const compiled = await build({ stdin: { contents: `export * from "./app/game/youthArtManifest"; export * from "./app/game/youthTrainingRendering";`, resolveDir: process.cwd(), loader: "ts" }, bundle: true, write: false, format: "esm", platform: "node" });
const art = await import("data:text/javascript;base64," + Buffer.from(compiled.outputFiles[0].text).toString("base64"));
const manifest = art.YOUTH_ART_MANIFEST, atlas = manifest.patrolGrazer;
const images = new Map();
for (const src of art.youthArtSources(manifest)) { const meta = await sharp(path.join("public", src)).metadata(); images.set(src, { width: meta.width, height: meta.height, src }); }

test("unchanged OpenAI bitmap supplies eight visible independent native poses with calibrated ground anchors", async () => {
  const file = path.join("public", atlas.right.watch.src), bytes = await readFile(file), meta = await sharp(bytes).metadata();
  assert.equal(createHash("sha256").update(bytes).digest("hex"), "1874b2b726aa583c16bb873306a904a9eb2644942692daabbeaf51a2917a8592");
  assert.equal(meta.hasAlpha, true); assert.deepEqual([meta.width, meta.height], [1774, 887]);
  assert.deepEqual(art.validateYouthArt(manifest, images), []);
  const drawings = new Map(art.youthPatrolGrazerSprites(atlas).map(s => [s.rect.join(","), s])); assert.equal(drawings.size, 8);
  const hashes = new Set();
  for (const sprite of drawings.values()) {
    const [left, top, width, height] = sprite.rect;
    const { data, info } = await sharp(file).extract({ left, top, width, height }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    let visible = 0, minY = height, maxY = 0;
    for (let index = 3; index < data.length; index += info.channels) if (data[index] > 24) { visible++; const y = Math.floor(index / info.channels / width); minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
    assert(visible > 10000); assert(minY >= 3); assert(maxY <= height - 4); assert(Math.abs(sprite.pivot[1] - maxY) <= 2);
    hashes.add(createHash("sha256").update(data).digest("hex"));
  }
  assert.equal(hashes.size, 8); assert.equal(atlas.left.charge.length, 2); assert.equal(atlas.right.charge.length, 2);
});

test("renderer selects both charge drawings in each native direction without canvas mirroring", () => {
  const state = patrolRoute({ stop: "patrol-ambush" }).state, seen = new Set();
  for (const direction of [-1, 1]) for (const ticks of [0, 10]) {
    const copy = structuredClone(state); copy.patrol.grazer.direction = direction; copy.patrol.grazer.phase = "charge"; copy.patrol.grazer.ticks = ticks;
    const draws = [], ctx = { save() {}, restore() {}, translate() {}, rotate() {}, clearRect() {}, fillRect() {}, drawImage(...args) { draws.push(args); }, stroke() {}, beginPath() {}, moveTo() {}, lineTo() {}, setLineDash() {}, arc() {}, fill() {}, fillText() {}, scale() { assert.fail("native grazer must not be mirrored"); } };
    art.drawYouthScene(ctx, copy, { manifest, images }, false);
    const draw = draws.find(call => call[0].src === atlas.right.watch.src); assert(draw);
    const side = atlas[direction === 1 ? "right" : "left"], sprite = side.charge[ticks / 10];
    assert.deepEqual(draw.slice(1, 5), sprite.rect); seen.add(draw.slice(1, 5).join(","));
    assert.equal(draw[6] + sprite.pivot[1] * atlas.displayHeight / atlas.bodyHeight, p.YOUTH_ARENA.groundY);
  }
  assert.equal(seen.size, 4);
});

test("missing grazer source and invalid scale prevent art readiness", () => {
  const missing = new Map(images); missing.delete(atlas.right.watch.src); assert(art.validateYouthArt(manifest, missing).length);
  for (const value of [Infinity, NaN, 0, -1]) { const invalid = structuredClone(manifest); invalid.patrolGrazer.bodyHeight = value; assert(art.validateYouthArt(invalid, images).length); }
});
