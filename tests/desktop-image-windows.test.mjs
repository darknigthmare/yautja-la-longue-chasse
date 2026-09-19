import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { APP_ORIGIN, APP_DOCUMENT_ROUTES, appRoutePath, appRasterPath, appWindowPath, appDownloadKind } from "../desktop/protocol.mjs";

test("all delivered gallery originals can open as images without becoming application routes", async () => {
  const catalogue = JSON.parse(await fs.readFile(new URL("../app/game/tribeArtV37.json", import.meta.url), "utf8"));
  assert.equal(catalogue.assets.length, 204);
  for (const asset of catalogue.assets) {
    assert.equal(appWindowPath(APP_ORIGIN + asset.src), asset.src);
    assert.equal(appRasterPath(APP_ORIGIN + asset.src), asset.src);
    assert.equal(appRoutePath(APP_ORIGIN + asset.src), null);
    assert.equal(appDownloadKind(APP_ORIGIN + asset.src), "image");
  }
});

test("raster window policy allows only local game PNG/WebP/JPEG paths", () => {
  for (const name of ["/game/image.png", "/game/image.webp", "/game/image.jpg", "/game/image.JPEG", "/game/name%20with%20space.webp"]) {
    assert.equal(appRasterPath(APP_ORIGIN + name + "?v=41#preview"), name);
  }
  for (const suffix of ["/game/image.svg", "/game/image.js", "/game/image.html", "/game/image.json", "/game/image.webp.html", "/assets/image.webp", "/game/%2e%2e%2fprivate.png", "/game/%5csecret.png", "/game/C%3asecret.png", "/game/%00.png", "/game/%zz.png"]) {
    assert.equal(appWindowPath(APP_ORIGIN + suffix), null, suffix);
  }
  for (const prefix of ["https://game", "yautja://evil", "yautja://game.evil", "yautja://user@game", "yautja://game:80"]) assert.equal(appWindowPath(prefix + "/game/image.png"), null);
  for (const value of ["file:///C:/game/image.webp", "javascript:alert(1)", "data:image/svg+xml,<svg/>", "blob:yautja://game/image"]) assert.equal(appWindowPath(value), null);
});

test("the fixed document allowlist remains unchanged; arbitrary local HTML is still denied", () => {
  for (const route of ["/", "/pit-lab", "/rig-lab", ...APP_DOCUMENT_ROUTES]) {
    assert.equal(appWindowPath(APP_ORIGIN + route), route);
    assert.equal(appRasterPath(APP_ORIGIN + route), null);
  }
  assert.equal(appWindowPath(APP_ORIGIN + "/game/arbitrary/index.html"), null);
});
