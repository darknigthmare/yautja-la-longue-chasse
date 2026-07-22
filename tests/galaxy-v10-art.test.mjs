import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import sharp from "sharp";

const hash = (buffer) => createHash("sha256").update(buffer).digest("hex");

test("V10 keeps both OpenAI navigation backgrounds and their optimized exports", async () => {
  for (const manifestPath of [
    "art-source/v10/galaxy-navigation/manifest.json",
    "art-source/v10/galaxy-navigation/sector-nebula-manifest.json",
  ]) {
    const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
    const [master, runtime] = await Promise.all([
      readFile(manifest.asset.master),
      readFile(manifest.asset.runtime),
    ]);
    const [masterMeta, runtimeMeta] = await Promise.all([
      sharp(master).metadata(),
      sharp(runtime).metadata(),
    ]);

    assert.match(manifest.generator, /OpenAI/);
    assert.equal(hash(master), manifest.asset.masterSha256);
    assert.equal(hash(runtime), manifest.asset.runtimeSha256);
    assert.deepEqual(
      [masterMeta.width, masterMeta.height, masterMeta.format],
      [1672, 941, "png"],
    );
    assert.deepEqual(
      [runtimeMeta.width, runtimeMeta.height, runtimeMeta.format],
      [1672, 941, "webp"],
    );
    assert.ok(runtime.byteLength >= 200_000 && runtime.byteLength <= 500_000);
  }
});

test("V10 exposes 24 separate planet portraits and 20 separate auxiliary portraits", async () => {
  const [planetAtlasManifest, planetManifest, auxiliaryAtlasManifest, auxiliaryManifest] = await Promise.all([
    readFile("art-source/v10/galaxy-navigation/planets-24-manifest.json", "utf8").then(JSON.parse),
    readFile("art-source/v10/galaxy-navigation/planet-portraits-manifest.json", "utf8").then(JSON.parse),
    readFile("art-source/v10/galaxy-navigation/auxiliary-objects-manifest.json", "utf8").then(JSON.parse),
    readFile("art-source/v10/galaxy-navigation/auxiliary-portraits-manifest.json", "utf8").then(JSON.parse),
  ]);

  assert.match(planetAtlasManifest.generator, /OpenAI/);
  assert.match(auxiliaryAtlasManifest.generator, /OpenAI/);
  assert.equal(planetAtlasManifest.asset.layout.planetCount, 24);
  assert.equal(auxiliaryAtlasManifest.asset.grid.objectCount, 12);
  assert.equal(planetManifest.count, 24);
  assert.equal(auxiliaryManifest.count, 20);
  assert.equal(new Set(planetManifest.portraits.map(({ planetId }) => planetId)).size, 24);
  assert.equal(new Set(auxiliaryManifest.portraits.map(({ bodyId }) => bodyId)).size, 20);

  for (const portrait of [...planetManifest.portraits, ...auxiliaryManifest.portraits]) {
    const buffer = await readFile(portrait.runtime);
    const metadata = await sharp(buffer).metadata();
    const expectedSize = "planetId" in portrait ? 256 : 384;
    assert.equal(hash(buffer), portrait.sha256, portrait.runtime);
    assert.deepEqual(
      [metadata.width, metadata.height, metadata.format],
      [expectedSize, expectedSize, "webp"],
      portrait.runtime,
    );
  }
});

test("V10 map uses real visual registries and a cropped clan ship sprite", async () => {
  const [component, visuals] = await Promise.all([
    readFile("app/game/GalaxyMapPanel.tsx", "utf8"),
    readFile("app/game/galaxyVisuals.ts", "utf8"),
  ]);

  assert.match(component, /data-galaxy-v10-level=\{state\.level\}/);
  assert.match(component, /galaxy-v10-spatial-map/);
  assert.match(component, /galaxy-v10-dossier/);
  assert.match(component, /V6_SHIP_VISUAL_BY_ROLE\.huntTravel/);
  assert.match(component, /galaxyBodyVisualPath\(body\)/);
  assert.match(component, /engageGalaxyAutopilot/);
  assert.match(component, /stepGalaxyFlight/);
  assert.match(component, /navigator\.getGamepads/);
  assert.match(component, /data-flight-x/);
  assert.match(component, /event\.code === "KeyE"/);
  assert.doesNotMatch(component, /BODY_GLYPHS|galaxy-chart|galaxy-map-layout/);

  assert.match(visuals, /GALAXY_V10_PLANET_IDS/);
  assert.match(visuals, /GALAXY_V10_AUXILIARY_IDS/);
  assert.match(visuals, /\/game\/backgrounds\/v10\/galaxy-overview-v10\.webp/);
  assert.match(visuals, /\/game\/backgrounds\/v10\/sector-nebula-v10\.webp/);
  assert.match(visuals, /\/game\/backgrounds\/v9\/galaxy-sector-v9\.webp/);
});
