import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const [canvasSource, runtimeDataSource, availabilityDataSource, builderSource, packageJson] = await Promise.all([
  readFile(path.join(projectRoot, "app/game/HuntCanvas.tsx"), "utf8"),
  readFile(
    path.join(projectRoot, "app/game/environmentPropRuntimeData.ts"),
    "utf8",
  ),
  readFile(
    path.join(projectRoot, "app/game/environmentPropAvailabilityData.ts"),
    "utf8",
  ),
  readFile(
    path.join(projectRoot, "scripts/build-biome-decor-v19-manifests.mjs"),
    "utf8",
  ),
  readFile(path.join(projectRoot, "package.json"), "utf8").then(JSON.parse),
]);

test("HuntCanvas renders and lazily streams V19 gameplay and decor props", () => {
  for (const marker of [
    "environmentGameplayPropForGeometryId",
    "environmentPropRuntimeUrlsForSector",
    "drawEnvironmentGameplayProp",
    "drawEnvironmentDecorPass",
    '"world-back"',
    '"actor-occluder"',
    "preloadEnvironmentAroundScreen(game.worldScreenId)",
    "assets.environmentProps[url] = image",
    "encounterRun",
  ]) {
    assert.ok(canvasSource.includes(marker), `missing Canvas marker: ${marker}`);
  }
});

test("generated runtime data contains no source-production fields", () => {
  for (const generatedSource of [
    runtimeDataSource,
    availabilityDataSource,
  ]) {
    assert.doesNotMatch(
      generatedSource,
      /Primary request:|Originality:|art-source\/|masterPath|promptSha256|chromaKey/,
    );
  }
});

test("the complete QA command builds, audits and tests biome decor V19", () => {
  assert.equal(
    packageJson.scripts["biome-decor:v19:runtime-data"],
    "node scripts/build-biome-decor-v19-manifests.mjs --runtime-data-only",
  );
  assert.ok(
    packageJson.scripts.qa.includes("npm run biome-decor:v19:manifests"),
  );
  assert.ok(packageJson.scripts.qa.includes("npm run biome-decor:v19:audit"));
  assert.ok(
    packageJson.scripts.qa.indexOf("npm run biome-decor:v19:manifests") <
      packageJson.scripts.qa.indexOf("npm run build"),
  );
  assert.match(builderSource, /availableIds\.length !== ENVIRONMENT_PROP_SPECS\.length/);
  assert.match(builderSource, /Manquants par biome/);
  assert.match(builderSource, /Premiers IDs manquants/);
});
