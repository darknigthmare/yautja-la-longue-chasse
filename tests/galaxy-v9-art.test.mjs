import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import sharp from "sharp";

const manifestPath = "art-source/v9/galaxy/manifest.json";
const masterPath = "art-source/v9/galaxy/openai-galaxy-sector-master.png";
const runtimePath = "public/game/backgrounds/v9/galaxy-sector-v9.webp";

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

test("V9 galaxy background keeps its OpenAI master and optimized runtime export", async () => {
  const [manifestBuffer, masterBuffer, runtimeBuffer] = await Promise.all([
    readFile(manifestPath),
    readFile(masterPath),
    readFile(runtimePath),
  ]);
  const manifest = JSON.parse(manifestBuffer.toString("utf8"));
  const [master, runtime] = await Promise.all([
    sharp(masterBuffer).metadata(),
    sharp(runtimeBuffer).metadata(),
  ]);

  assert.equal(manifest.schemaVersion, 1);
  assert.match(manifest.generator, /OpenAI/);
  assert.deepEqual(
    { width: master.width, height: master.height, format: master.format },
    { width: 1586, height: 992, format: "png" },
  );
  assert.deepEqual(
    { width: runtime.width, height: runtime.height, format: runtime.format },
    { width: 1586, height: 992, format: "webp" },
  );
  assert.equal(sha256(masterBuffer), manifest.asset.masterSha256);
  assert.equal(sha256(runtimeBuffer), manifest.asset.runtimeSha256);
  assert.ok(runtimeBuffer.byteLength >= 100_000, "runtime texture retains detail");
  assert.ok(runtimeBuffer.byteLength <= 500_000, "runtime texture stays web-friendly");
});

test("V9 star field remains available as a fallback without reviving the old table map", async () => {
  const [component, styles] = await Promise.all([
    readFile("app/game/GalaxyMapPanel.tsx", "utf8"),
    readFile("app/globals.css", "utf8"),
  ]);

  assert.match(component, /GALAXY_NAVIGATION\.sectorCount/);
  assert.match(component, /GALAXY_NAVIGATION\.systemCount/);
  assert.match(component, /GALAXY_NAVIGATION\.bodyCount/);
  assert.match(component, /galaxy-v10-spatial-map/);
  assert.match(component, /galaxy-v10-star/);
  assert.match(component, /Aucun contrat validé/);
  assert.match(component, /Résultats du scanner/);
  assert.match(component, /navigator\.getGamepads/);
  assert.match(component, /onKeyDown/);
  assert.match(component, /onClick/);
  assert.doesNotMatch(
    component,
    /MISSION_BY_ID\[selection\.planet\.missions\[0\]\.id\]/,
    "missionless bodies must never be dereferenced as contracts",
  );

  assert.match(styles, /\/game\/backgrounds\/v9\/galaxy-sector-v9\.webp/);
  assert.match(styles, /\.galaxy-v10-stage/);
  assert.match(styles, /\.galaxy-v10-node\.kind-gas-giant/);
  assert.match(styles, /\.galaxy-v10-node\.kind-asteroid-belt/);
  assert.match(styles, /@media \(max-width: 760px\)[\s\S]*galaxy-v10-stage/);
});
