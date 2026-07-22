import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import sharp from "sharp";

const manifestPath = "art-source/v11/system-backgrounds/manifest.json";
const sha256 = (buffer) => createHash("sha256").update(buffer).digest("hex");

test("V11 keeps one distinct OpenAI background for every mapped system", async () => {
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  assert.equal(manifest.schemaVersion, 1);
  assert.match(manifest.generator, /OpenAI/);
  assert.equal(manifest.count, 12);
  assert.equal(manifest.assets.length, 12);
  assert.equal(new Set(manifest.assets.map(({ systemId }) => systemId)).size, 12);
  assert.equal(new Set(manifest.assets.map(({ backgroundKey }) => backgroundKey)).size, 12);

  const runtimeHashes = new Set();
  for (const asset of manifest.assets) {
    const [master, runtime] = await Promise.all([
      readFile(asset.master),
      readFile(asset.runtime),
    ]);
    const [masterMetadata, runtimeMetadata] = await Promise.all([
      sharp(master).metadata(),
      sharp(runtime).metadata(),
    ]);
    assert.equal(sha256(master), asset.masterSha256, asset.systemId);
    assert.equal(sha256(runtime), asset.runtimeSha256, asset.systemId);
    assert.deepEqual(
      [masterMetadata.width, masterMetadata.height, masterMetadata.format],
      [1672, 941, "png"],
      asset.systemId,
    );
    assert.deepEqual(
      [runtimeMetadata.width, runtimeMetadata.height, runtimeMetadata.format],
      [1672, 941, "webp"],
      asset.systemId,
    );
    assert.equal(runtime.byteLength, asset.runtimeBytes, asset.systemId);
    assert.ok(runtime.byteLength >= 50_000, `${asset.systemId}: texture retains detail`);
    assert.ok(runtime.byteLength <= 400_000, `${asset.systemId}: texture stays web-friendly`);
    assert.equal(runtimeHashes.has(asset.runtimeSha256), false, `${asset.systemId}: background must be unique`);
    runtimeHashes.add(asset.runtimeSha256);
    assert.match(asset.prompt, /No interface, text, watermark/);
  }
  assert.equal(runtimeHashes.size, 12);
});

test("V11 renderer binds every system key and uses exact authored orbital ellipses", async () => {
  const [manifestSource, registrySource, visualSource, componentSource, styleSource] = await Promise.all([
    readFile(manifestPath, "utf8"),
    readFile("app/game/galaxyRegistry.ts", "utf8"),
    readFile("app/game/galaxyVisuals.ts", "utf8"),
    readFile("app/game/GalaxyMapPanel.tsx", "utf8"),
    readFile("app/globals.css", "utf8"),
  ]);
  const manifest = JSON.parse(manifestSource);

  for (const asset of manifest.assets) {
    assert.match(registrySource, new RegExp(asset.backgroundKey));
    assert.match(visualSource, new RegExp(asset.backgroundKey));
    assert.match(visualSource, new RegExp(asset.runtime.replace("public", "")));
  }

  assert.match(componentSource, /galaxySystemBackgroundPath\(selection\.system\)/);
  assert.match(componentSource, /selection\.system\.bodies\.map/);
  assert.match(componentSource, /galaxyOrbitRingGeometry\(body\.orbit\)/);
  assert.match(componentSource, /data-orbit-radius=\{body\.orbit\.radius\}/);
  assert.match(componentSource, /data-flight-x=\{flight\.position\.x\}/);
  assert.match(componentSource, /isGalaxyFlightNear\(flight\.position, activeFlightPosition, 4\.5\)/);
  assert.match(componentSource, /Entrer dans la destination/);
  assert.doesNotMatch(componentSource, /\[29, 43, 58, 73, 87\]/);
  assert.doesNotMatch(componentSource, /level === "system"[\s\S]{0,180}Math\.PI \* 2 \* index/);
  assert.match(styleSource, /width: var\(--orbit-width\)/);
  assert.match(styleSource, /height: var\(--orbit-height\)/);
  assert.match(styleSource, /left: 40%/);
});

test("V11 exposes deterministic asset rebuilding through the project scripts", async () => {
  const [packageSource, buildSource] = await Promise.all([
    readFile("package.json", "utf8"),
    readFile("scripts/build-galaxy-v11-system-backgrounds.mjs", "utf8"),
  ]);
  assert.match(packageSource, /galaxy-v11:build-backgrounds/);
  assert.match(buildSource, /sharp\(master\)/);
  assert.match(buildSource, /webp\(\{ quality: 82/);
  assert.match(buildSource, /Galaxy V11 system backgrounds/);
});
