import assert from "node:assert/strict";
import test from "node:test";
import path from "node:path";
import { APP_ORIGIN, CSP, isAppRoute, isAppUrl, resolveAppFile } from "../desktop/protocol.mjs";

const root = path.resolve("tmp/desktop-security-fixture");
test("desktop serves all local game routes and encoded assets", () => {
  for (const route of ["/", "/pit-lab", "/rig-lab/", "/pit-lab?view=1"]) {
    assert.equal(resolveAppFile(root, APP_ORIGIN + route), path.join(root, "index.html"));
    assert.equal(isAppRoute(APP_ORIGIN + route), true);
  }
  assert.equal(resolveAppFile(root, APP_ORIGIN + "/game/a%20b.webp"), path.join(root, "game", "a b.webp"));
  assert.equal(resolveAppFile(root, APP_ORIGIN + "/assets/main.js", "HEAD"), path.join(root, "assets", "main.js"));
});
test("desktop rejects foreign schemes, credentials, ports and write methods", () => {
  for (const value of ["https://game/", "file:///C:/secrets", "yautja://evil/", "yautja://game.evil/", "yautja://x@game/", "yautja://game:80/"]) {
    assert.equal(isAppUrl(value), false, value);
    assert.equal(resolveAppFile(root, value), null, value);
  }
  for (const method of ["POST", "PUT", "DELETE", "OPTIONS"]) assert.equal(resolveAppFile(root, APP_ORIGIN + "/", method), null);
});
test("desktop does not expose repository files or traversal paths", () => {
  for (const value of ["/.env.local", "/main.mjs", "/package.json", "/private-dlc/foo", "/game/%2e%2e%2f.env", "/game/%5c..%5csecrets", "/game/C%3a/secrets", "/game/%00.png", "/game/%zz.png", "/game/../../.env"]) {
    assert.equal(resolveAppFile(root, APP_ORIGIN + value), null, value);
  }
  assert.equal(isAppRoute(APP_ORIGIN + "/game/test.webp"), false);
  assert.match(CSP, /script-src 'self'/);
  assert.doesNotMatch(CSP, /unsafe-eval|https:/);
  assert.match(CSP, /frame-src 'none'/);
});
