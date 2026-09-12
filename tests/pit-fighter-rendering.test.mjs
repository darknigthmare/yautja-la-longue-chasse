import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { build } from "esbuild";
import sharp from "sharp";

const registry = build({
  entryPoints: [fileURLToPath(new URL("../app/game/pitFighterRendering.ts", import.meta.url))],
  bundle: true, format: "esm", platform: "node", target: "es2022", write: false,
}).then((result) => import("data:text/javascript;base64," + Buffer.from(result.outputFiles[0].text).toString("base64")));
const localPath = (src) => fileURLToPath(new URL("../public" + src, import.meta.url));

test("PIT rig layers refer to existing registered alpha cutouts, never opaque selection images", async () => {
  const { PIT_MODULAR_FIGHTER_IDS, getPitFighterArtLayers } = await registry;
  const paths = new Set();
  for (const id of PIT_MODULAR_FIGHTER_IDS) {
    const layers = getPitFighterArtLayers(id);
    assert.equal(layers.filter((layer) => layer.id.startsWith("body-")).length, 15);
    assert.equal(new Set(layers.map((layer) => layer.id)).size, layers.length);
    for (const layer of layers) paths.add(layer.src);
  }
  for (const src of paths) {
    const meta = await sharp(localPath(src)).metadata();
    assert.equal(meta.width, 256, src);
    assert.equal(meta.height, 384, src);
    assert.equal(meta.hasAlpha, true, src);
    assert.ok(!src.includes("v23"), src);
  }
  assert.deepEqual(getPitFighterArtLayers("wolf"), []);
  assert.deepEqual(getPitFighterArtLayers("constructor"), []);
});

test("PIT hand clips reject detached leg islands and preserve the full useful hand components", async () => {
  const { getPitFighterArtLayers } = await registry;
  const cases = [
    ["jungle-hunter", "body-hand-front", 522],
    ["jungle-hunter", "body-hand-back", 769],
    ["berserker", "body-hand-front", 902],
    ["berserker", "body-hand-back", 1052],
    ["berserker", "blades", 352],
  ];
  for (const [id, part, expectedPixels] of cases) {
    const layer = getPitFighterArtLayers(id).find((entry) => entry.id === part);
    const { data, info } = await sharp(localPath(layer.src)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    let kept = 0;
    for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
      const included = layer.clip.some(([cx, cy, width, height]) => x >= cx && x < cx + width && y >= cy && y < cy + height);
      if (included && data[(y * info.width + x) * 4 + 3] > 8) kept++;
    }
    assert.equal(kept, expectedPixels, id + " / " + part);
  }
  const superLayers = getPitFighterArtLayers("berserker");
  assert.equal(superLayers.some((layer) => layer.id.startsWith("net-")), false);
});

test("PIT loader is safe during SSR and partial profiles never render missing limbs", async () => {
  const { loadPitFighterArt, isPitFighterArtReady, drawPitModularFighter } = await registry;
  const bank = await loadPitFighterArt();
  assert.equal(bank.readyIds.size, 0);
  assert.deepEqual([...bank.failedIds], ["jungle-hunter", "berserker"]);
  const partial = {
    images: new Map(), readyIds: new Set(["jungle-hunter"]), failedIds: new Set(),
  };
  assert.equal(isPitFighterArtReady(partial, "jungle-hunter"), false);
  const context = new Proxy({}, { get() { throw new Error("Incomplete fighter must not draw any layer"); } });
  assert.equal(drawPitModularFighter(context, partial, { definitionId: "jungle-hunter" }, 0, 500), false);
});

test("PIT atelier does not silently replace the published combat art", async () => {
  const canvas = await readFile(new URL("../app/game/PitCanvas.tsx", import.meta.url), "utf8");
  assert.match(canvas, /href="\/pit-lab"/);
  assert.doesNotMatch(canvas, /drawPitModularFighter/);
});
