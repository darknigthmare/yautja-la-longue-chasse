import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

const root = fileURLToPath(new URL("../", import.meta.url));
const require = createRequire(import.meta.url);
const renderer = build({
  stdin: {
    contents: `
      export { default as PieceZoneLayer } from "./app/game/PieceZoneLayerV148.tsx";
      export { default as ChromaticSurface } from "./app/game/ChromaticSurfaceV113.tsx";
      export { pieceCanvasSourceV148 } from "./app/game/hunterPieceZonesV148.ts";
    `,
    resolveDir: root,
    loader: "ts",
  },
  bundle: true,
  packages: "external",
  format: "cjs",
  platform: "node",
  jsx: "automatic",
  write: false,
}).then(result => {
  const module = { exports: {} };
  new Function("require", "module", "exports", result.outputFiles[0].text)(require, module, module.exports);
  return module.exports;
});

const colors = { primary: "#b43215", secondary: null, accent: null, light: null };
const base = createElement("span", { "data-authored-plate": "" });
const placement = { x: 64, y: 96, width: 128, height: 192 };

test("zone plate exposes the original while the browser prepares the recolour", async () => {
  const { PieceZoneLayer } = await renderer;
  const markup = renderToStaticMarkup(createElement(PieceZoneLayer, {
    src: "/mask.webp", piece: "biomask", base, colors, placement,
  }));
  assert.match(markup, /data-authored-plate=""/);
  assert.match(markup, /<canvas width="256" height="384"[^>]*data-piece-zones-v148="biomask"[^>]*display:none/);
  const uncoloured = renderToStaticMarkup(createElement(PieceZoneLayer, {
    src: "/mask.webp", piece: "biomask", base, colors: null,
  }));
  assert.equal(uncoloured, renderToStaticMarkup(base));
});

test("V113 masks still position their pigment in the authored rig frame", async () => {
  const { ChromaticSurface } = await renderer;
  const markup = renderToStaticMarkup(createElement(ChromaticSurface, {
    maskPath: "/mask.webp", channel: "biomask", piece: "biomask", base, placement,
    appearance: { chromaticsV113: { maskHex: "#b43215" } },
  }));
  assert.match(markup, /data-authored-plate=""/);
  assert.match(markup, /data-chromatic-channel="biomask" style="position:absolute;inset:0;width:100%;height:100%/);
  assert.match(markup, /left:25%;top:25%;width:50%;height:50%/);
});

test("the shared recolour preserves fractional source alpha, placement and filter", async () => {
  const { pieceCanvasSourceV148 } = await renderer;
  const pixels = { data: new Uint8ClampedArray(256 * 384 * 4) };
  pixels.data.set([68, 80, 92, 128, 128, 140, 152, 220, 220, 232, 244, 255]);
  const drawCalls = [];
  const context = {
    filter: "none",
    drawImage(...args) { drawCalls.push([this.filter, ...args]); },
    getImageData() { return pixels; },
    putImageData(result) { assert.equal(result, pixels); },
  };
  const canvas = { getContext: () => context };
  const source = {};
  const previousDocument = globalThis.document;
  globalThis.document = { createElement: () => canvas };
  try {
    assert.equal(pieceCanvasSourceV148(source, colors, placement, "brightness(.7)"), canvas);
    assert.deepEqual(drawCalls, [["brightness(.7)", source, 64, 96, 128, 192]]);
    assert.notDeepEqual([...pixels.data.slice(0, 12)], [68, 80, 92, 128, 128, 140, 152, 220, 220, 232, 244, 255]);
    assert.deepEqual([pixels.data[3], pixels.data[7], pixels.data[11], pixels.data[15]], [128, 220, 255, 0]);
  } finally {
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
  }
});
