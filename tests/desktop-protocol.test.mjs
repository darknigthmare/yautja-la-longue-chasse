import assert from "node:assert/strict";
import test from "node:test";
import path from "node:path";
import { APP_ORIGIN, CSP, isAppRoute, isAppUrl, resolveAppFile, parseAudioByteRange } from "../desktop/protocol.mjs";

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

test("desktop permits local audio inventory and supported encodings, without exposing markers or private files", () => {
  assert.equal(resolveAppFile(root, APP_ORIGIN + "/audio/manifest.json"), path.join(root,"audio","manifest.json"));
  for (const extension of ["ogg","mp3","m4a","wav","flac","aac","webm","opus"]) assert.equal(resolveAppFile(root, APP_ORIGIN + "/audio/music/menu/track." + extension + "?v=123"), path.join(root,"audio","music","menu","track." + extension));
  for (const name of ["/audio/.env", "/audio/music/menu/missing.txt", "/audio/../main.mjs", "/audio/%2e%2e%2fmain.mjs"]) assert.equal(resolveAppFile(root,APP_ORIGIN+name),null);
});
test("local audio ranges support complete, suffix and open ranges, rejecting malformed or impossible requests", () => {
  assert.equal(parseAudioByteRange(null,100),null);
  assert.deepEqual(parseAudioByteRange("bytes=10-19",100),{start:10,end:19});
  assert.deepEqual(parseAudioByteRange("bytes=90-",100),{start:90,end:99});
  assert.deepEqual(parseAudioByteRange("bytes=-10",100),{start:90,end:99});
  assert.deepEqual(parseAudioByteRange("bytes=90-900",100),{start:90,end:99});
  for(const value of ["bytes=100-","bytes=9-2","bytes=-0","bytes=-","bytes=0-1,3-4","other=0-2"])assert.equal(parseAudioByteRange(value,100),false);
});
