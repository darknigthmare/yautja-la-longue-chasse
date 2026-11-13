import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const root = fileURLToPath(new URL("../", import.meta.url));
const read = relative => readFileSync(root + relative, "utf8");
const bundle = build({
  stdin: { contents: `export * from "./app/game/hunterPieceZonesV148.ts";`, resolveDir: root, loader: "ts" },
  bundle: true, format: "esm", platform: "node", target: "es2022", write: false, loader: { ".json": "json" }, logLevel: "silent",
}).then(result => import("data:text/javascript;base64," + Buffer.from(result.outputFiles[0].text).toString("base64")));

/** A plate with a luminance ramp: 100 opaque pixels from dark to bright, plus 4 transparent ones. */
function plate() {
  const data = new Uint8ClampedArray(104 * 4);
  for (let i = 0; i < 100; i++) { const v = Math.round(20 + i * 2.2); data.set([v, v, v, 255], i * 4); }
  return data;
}
const lum = (d, i) => (0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2]) / 255;

test("V148 zones split a plate into dark, middle and bright shares", async () => {
  const m = await bundle;
  const stats = m.autoZoneStatsV148(plate());
  assert.equal(stats.opaquePixels, 100);
  assert.ok(stats.darkEdge < stats.medians[1] && stats.medians[1] < stats.brightEdge);
  assert.ok(stats.medians[0] < stats.darkEdge && stats.medians[2] > stats.brightEdge);
  for (const l of [0.05, stats.darkEdge, 0.5, stats.brightEdge, 0.95]) {
    const w = m.autoZoneWeightsV148(l, stats);
    assert.ok(Math.abs(w[0] + w[1] + w[2] - 1) < 1e-9);
  }
  assert.deepEqual(m.autoZoneWeightsV148(0.01, stats).map(Math.round), [1, 0, 0]);
  assert.deepEqual(m.autoZoneWeightsV148(0.99, stats).map(Math.round), [0, 0, 1]);
});

test("V148 each zone takes its own colour; a pale colour shows on a dark zone", async () => {
  const m = await bundle;
  const source = plate();
  const out = m.recolorPlateAutoV148(source, { primary: "#c83214", secondary: "#f0f0e0", accent: "#1040ff", light: null });
  // middle of the ramp: red dominant (primary)
  assert.ok(out[50 * 4] > out[50 * 4 + 1] + 60 && out[50 * 4] > out[50 * 4 + 2] + 60);
  // dark end: the pale secondary colour is clearly brighter than the original dark pixels
  assert.ok(lum(out, 8) > lum(source, 8) + 0.25, `dark zone stays dark: ${lum(out, 8)}`);
  // bright end: blue dominant (accent)
  assert.ok(out[96 * 4 + 2] > out[96 * 4] + 60);
  // volumes kept: inside the primary zone brighter source pixels stay brighter
  assert.ok(lum(out, 60) > lum(out, 40));
  // alpha untouched, transparent pixels untouched
  assert.equal(out[50 * 4 + 3], 255);
  assert.deepEqual([...out.slice(100 * 4)], [...source.slice(100 * 4)]);
});

test("V148 untouched zones keep the plate's pixels; overlay mode leaves them transparent", async () => {
  const m = await bundle;
  const source = plate();
  const onlyAccent = { primary: null, secondary: null, accent: "#00ff00", light: null };
  const replaced = m.recolorPlateAutoV148(source, onlyAccent);
  assert.deepEqual([...replaced.slice(40 * 4, 41 * 4)], [...source.slice(40 * 4, 41 * 4)]);
  assert.ok(replaced[97 * 4 + 1] > replaced[97 * 4] + 60);
  const overlay = m.recolorPlateAutoV148(source, onlyAccent, undefined, true);
  assert.equal(overlay[40 * 4 + 3], 0);
  assert.equal(overlay[97 * 4 + 3], 255);
  const none = m.recolorPlateAutoV148(source, { primary: null, secondary: null, accent: null, light: "#ffffff" });
  assert.deepEqual([...none], [...source]);
  assert.equal(m.hasZoneColorsV148({ primary: null, secondary: null, accent: null, light: "#fff" }), false);
});

test("V148 piece colours are read from the appearance", async () => {
  const m = await bundle;
  const appearance = { piecesV146: { gauntlet: { secondary: "#112233" }, chest: { light: "#ffffff" } } };
  assert.equal(m.pieceZoneColorsV148(appearance, "gauntlet").secondary, "#112233");
  assert.equal(m.pieceZoneColorsV148(appearance, "chest"), null);
  assert.equal(m.pieceZoneColorsV148(appearance, "caster"), null);
  assert.equal(m.pieceZoneColorsV148(null, "caster"), null);
});

test("V148 renderers use zones on every layer, including gauntlet, blades, caster and weapons", () => {
  const hunt = read("app/game/HuntCanvas.tsx");
  const preview = read("app/game/HunterRigPreview.tsx");
  const surface = read("app/game/ChromaticSurfaceV113.tsx");
  assert.match(hunt, /pieceCanvasSourceV148\(image, zoneColors/);
  for (const piece of ["gauntlet", "wristblades", "caster", "weapons"])
    assert.match(hunt, new RegExp(`pieceTint: \\{ appearance, piece: "${piece}"`), piece);
  assert.match(hunt, /state\.plasmaColorV146 \? state\.plasmaColorV146 : weaponDefinition\.color/);
  assert.match(preview, /<PieceZoneLayerV148 src=\{path\}/);
  assert.match(surface, /pieceZoneColorsV148\(appearance, piece\)/);
});
