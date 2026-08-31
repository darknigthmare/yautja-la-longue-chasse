import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve, sep } from "node:path";
import { after, test } from "node:test";
import { tryServeStatic } from "vinext/server/prod-server";
import { installWindowsStaticCacheCompatibility } from "../scripts/windows-static-cache.mjs";

const { StaticFileCache } = await import(new URL("./server/static-file-cache.js", import.meta.resolve("vinext")));
const temporaryRoot = await mkdtemp(join(tmpdir(), "yautja-production-cache-"));
const fixturePath = "/game/ship-interior/v20/corridor-wall.webp";
const fixtureBytes = Buffer.from("controlled static cache test image fixture");
await mkdir(join(temporaryRoot, "game", "ship-interior", "v20"), { recursive: true });
await mkdir(join(temporaryRoot, ".vite"), { recursive: true });
await writeFile(join(temporaryRoot, "game", "ship-interior", "v20", "corridor-wall.webp"), fixtureBytes);
await writeFile(join(temporaryRoot, ".vite", "manifest.json"), '{"privateBuildMetadata":true}');

// Constrain cleanup to the directory created for this test, including on Windows.
after(async () => {
  const absolute = resolve(temporaryRoot);
  assert.ok(absolute.startsWith(resolve(tmpdir()) + sep));
  assert.ok(absolute.split(sep).at(-1).startsWith("yautja-production-cache-"));
  await rm(absolute, { recursive: true, force: true });
});

function responseSpy() {
  return {
    status: null,
    headers: null,
    ended: false,
    writeHead(status, headers) { this.status = status; this.headers = headers; },
    end() { this.ended = true; },
  };
}

test("production assets resolve from URL paths through the real vinext cache without exposing build metadata", async () => {
  const cache = await StaticFileCache.create(temporaryRoot);
  const originalLookup = StaticFileCache.prototype.lookup;
  installWindowsStaticCacheCompatibility(StaticFileCache, "linux");
  assert.equal(StaticFileCache.prototype.lookup, originalLookup, "non-Windows startup stays unchanged");

  if (process.platform === "win32") {
    assert.equal(cache.lookup(fixturePath), undefined, "reproduce vinext 0.0.50 slash/cache mismatch");
    assert.ok(cache.lookup("/" + fixturePath.slice(1).replaceAll("/", "\\")), "file exists under the native cache key");
  }
  installWindowsStaticCacheCompatibility(StaticFileCache, "win32");
  const patchedLookup = StaticFileCache.prototype.lookup;
  installWindowsStaticCacheCompatibility(StaticFileCache, "win32");
  assert.equal(StaticFileCache.prototype.lookup, patchedLookup, "installation is idempotent");

  const entry = cache.lookup(fixturePath);
  assert.ok(entry, "a public URL resolves its existing cached file");
  assert.equal(entry.original.headers["Content-Type"], "image/webp");
  assert.equal(entry.original.size, fixtureBytes.length);
  assert.equal(cache.lookup("/game/absent.webp"), undefined);

  for (const rejected of [
    "/", "/.vite", "/.vite/manifest.json", "/.vite\\manifest.json",
    "//.vite/manifest.json", "/game/../.vite/manifest.json",
    "/game/./ship-interior/v20/corridor-wall.webp",
  ]) {
    assert.equal(cache.lookup(rejected), undefined, `${rejected}: internal or noncanonical path rejected`);
  }

  const response = responseSpy();
  const served = await tryServeStatic(
    { method: "HEAD", headers: {} }, response, temporaryRoot, fixturePath,
    false, cache, { "X-QA-Fixture": "cache" }, 200,
  );
  assert.equal(served, true);
  assert.equal(response.status, 200);
  assert.equal(response.headers["Content-Type"], "image/webp");
  assert.equal(response.headers["Content-Length"], String(fixtureBytes.length));
  assert.equal(response.headers["X-QA-Fixture"], "cache");
  assert.equal(response.ended, true);

  const notModified = responseSpy();
  assert.equal(await tryServeStatic(
    { method: "HEAD", headers: { "if-none-match": entry.etag } },
    notModified, temporaryRoot, fixturePath, false, cache,
  ), true);
  assert.equal(notModified.status, 304, "normal vinext conditional caching survives the compatibility fix");
  assert.equal(notModified.ended, true);

  const denied = responseSpy();
  assert.equal(await tryServeStatic(
    { method: "HEAD", headers: {} }, denied, temporaryRoot, "/.vite/manifest.json",
    false, cache,
  ), false);
  assert.equal(denied.status, null);
});
