import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import sharp from "sharp";
import ts from "typescript";

const root = "art-source/v21/ship-interior";
const manifest = JSON.parse(await readFile(root + "/manifest.json", "utf8"));
const pack = JSON.parse(await readFile(root + "/generation-prompts.json", "utf8"));
const registrySource = await readFile("app/game/shipInteriorKit.ts", "utf8");
const preparation = JSON.parse(await readFile(root + "/alpha-preparation.json", "utf8"));
assert.equal(preparation.status, "prepared");
assert.equal(preparation.sourcesPreserved, true);
const expected = ["wall-sanctum", "wall-machinery", "wall-observatory", "door-frame", "door-leaf", "foreground-rib", "console-navigation"];
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");

assert.deepEqual(manifest.assets.map((asset) => asset.id).sort(), [...expected].sort());
assert.deepEqual(pack.assets.map((asset) => asset.id).sort(), [...expected].sort());
assert.deepEqual(preparation.assets.map((asset) => asset.id).sort(), expected.filter((id) => !id.startsWith("wall-")).sort());
assert.equal(new Set(manifest.assets.map((asset) => asset.runtime.sha256)).size, expected.length, "Different kit modules unexpectedly share the same bitmap");

/** Read the literal runtime contract without executing any application code. */
function literal(node) {
  if (ts.isAsExpression(node) || ts.isParenthesizedExpression(node) || ts.isSatisfiesExpression(node)) return literal(node.expression);
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
  if (ts.isNumericLiteral(node)) return Number(node.text);
  if (ts.isObjectLiteralExpression(node)) {
    return Object.fromEntries(node.properties.map((property) => {
      assert.ok(ts.isPropertyAssignment(property), "Ship art contract must contain explicit properties");
      assert.ok(ts.isIdentifier(property.name) || ts.isStringLiteral(property.name), "Unsupported ship art property");
      return [property.name.text, literal(property.initializer)];
    }));
  }
  throw new Error("Ship art contract contains a non-literal value");
}
const registryAst = ts.createSourceFile("shipInteriorKit.ts", registrySource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
const registryDeclaration = registryAst.statements.filter(ts.isVariableStatement)
  .flatMap((statement) => [...statement.declarationList.declarations])
  .find((declaration) => ts.isIdentifier(declaration.name) && declaration.name.text === "SHIP_LEVEL_ART");
assert.ok(registryDeclaration?.initializer, "SHIP_LEVEL_ART contract is missing");
const registry = Object.values(literal(registryDeclaration.initializer));
assert.equal(registry.length, expected.length, "Unexpected runtime art registration count");
assert.equal(new Set(registry.map((entry) => entry.src)).size, expected.length, "Duplicate runtime art URL");

async function verifyFile(record, label, format) {
  const bytes = await readFile(record.path);
  const meta = await sharp(bytes).metadata();
  assert.equal(hash(bytes), record.sha256, label + ": source bytes differ from the recorded hash");
  assert.equal(meta.format, format, label + ": unexpected image format");
  if (record.bytes !== undefined) assert.equal(bytes.length, record.bytes, label + ": recorded byte length differs");
  if (record.width !== undefined) assert.equal(meta.width, record.width, label + ": recorded width differs");
  if (record.height !== undefined) assert.equal(meta.height, record.height, label + ": recorded height differs");
  return { bytes, meta };
}

async function alphaPixels(bytes) {
  return sharp(bytes).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
}
function analyzeAlpha({ data, info }) {
  assert.equal(info.channels, 4, "RGBA expected for alpha inspection");
  let transparent = 0;
  let opaque = 0;
  let left = info.width;
  let top = info.height;
  let right = -1;
  let bottom = -1;
  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      const alpha = data[(y * info.width + x) * 4 + 3];
      if (alpha === 0) transparent += 1;
      if (alpha === 255) opaque += 1;
      if (alpha > 8) {
        left = Math.min(left, x); top = Math.min(top, y);
        right = Math.max(right, x); bottom = Math.max(bottom, y);
      }
    }
  }
  return { transparent, opaque, bounds: { x: left, y: top, width: right - left + 1, height: bottom - top + 1 } };
}

let total = 0;
const report = [];
for (const asset of manifest.assets) {
  const job = pack.assets.find((entry) => entry.id === asset.id);
  const alphaRequired = !asset.id.startsWith("wall-");
  assert.equal(job.alphaRequired, alphaRequired, asset.id + ": alpha contract differs");
  assert.equal(asset.generatedSource.path, job.source, asset.id + ": generated source does not match its generation record");
  assert.equal(asset.master.path, root + "/" + asset.id + ".png", asset.id + ": unexpected master path");
  assert.equal(asset.runtime.path, "public/game/ship-interior/v21/" + asset.id + ".webp", asset.id + ": unexpected runtime path");
  assert.equal(asset.runtime.url, "/" + asset.runtime.path.slice("public/".length), asset.id + ": URL does not resolve to runtime file");
  const [generated, master, runtime] = await Promise.all([
    verifyFile(asset.generatedSource, asset.id + " generated", "png"),
    verifyFile(asset.master, asset.id + " master", "png"),
    verifyFile(asset.runtime, asset.id + " runtime", "webp"),
  ]);
  assert.equal(master.meta.width, generated.meta.width, asset.id + ": alpha preparation unexpectedly changed source width");
  assert.equal(master.meta.height, generated.meta.height, asset.id + ": alpha preparation unexpectedly changed source height");
  assert.equal(runtime.meta.width, master.meta.width, asset.id + ": runtime resized width");
  assert.equal(runtime.meta.height, master.meta.height, asset.id + ": runtime resized height");
  assert.equal(runtime.meta.hasAlpha, asset.runtime.hasAlpha, asset.id + ": recorded alpha metadata differs");

  const registration = registry.find((entry) => entry.src === asset.runtime.url);
  assert.ok(registration, asset.id + ": missing runtime registration");
  assert.equal(registration.sourceWidth, runtime.meta.width, asset.id + ": registry source width differs from the real image");
  assert.equal(registration.sourceHeight, runtime.meta.height, asset.id + ": registry source height differs from the real image");
  for (const [key, value] of Object.entries({ width: registration.width, height: registration.height })) {
    assert.ok(Number.isFinite(value) && value > 0, asset.id + ": invalid display " + key);
  }
  assert.ok(registration.pivot && Number.isFinite(registration.pivot.x) && Number.isFinite(registration.pivot.y), asset.id + ": finite pivot required");
  assert.ok(registration.pivot.x >= 0 && registration.pivot.x <= registration.width, asset.id + ": pivot outside display width");
  assert.equal(registration.pivot.y, registration.height, asset.id + ": bottom-aligned pivot required");
  assert.equal(registration.pivot.x, alphaRequired ? registration.width / 2 : 0, asset.id + ": prop or wall pivot convention differs");
  const sourceRatio = runtime.meta.width / runtime.meta.height;
  const displayRatio = registration.width / registration.height;
  assert.ok(Math.abs(displayRatio / sourceRatio - 1) < 0.01, asset.id + ": display ratio distorts the source by more than 1%");
  const expectedLayer = asset.id.startsWith("wall-") ? "background" :
    asset.id === "door-leaf" ? "interactive" :
      asset.id === "console-navigation" ? "fixtures" : "foreground";
  assert.equal(registration.layer, expectedLayer, asset.id + ": incorrect depth layer");

  if (alphaRequired) {
    assert.equal(master.meta.hasAlpha, true, asset.id + ": transparent master requires an alpha channel");
    assert.equal(runtime.meta.hasAlpha, true, asset.id + ": runtime requires actual alpha");
    const [masterRgba, runtimeRgba, sourceRgba] = await Promise.all([alphaPixels(master.bytes), alphaPixels(runtime.bytes), alphaPixels(generated.bytes)]);
    const preparationEntry = preparation.assets.find((entry) => entry.id === asset.id);
    assert.equal(preparationEntry.master, asset.master.path, asset.id + ": alpha preparation points to another master");
    assert.equal(preparationEntry.sourceSha256, asset.generatedSource.sha256, asset.id + ": alpha preparation source hash differs");
    await verifyFile({ path: preparationEntry.source, sha256: preparationEntry.sourceSha256 }, asset.id + " preserved source", "png");
    for (let offset = 0; offset < masterRgba.data.length; offset += 4) {
      assert.ok(masterRgba.data[offset] === sourceRgba.data[offset] &&
        masterRgba.data[offset + 1] === sourceRgba.data[offset + 1] &&
        masterRgba.data[offset + 2] === sourceRgba.data[offset + 2],
      asset.id + ": alpha preparation repainted source RGB pixels");
    }
    for (let offset = 3; offset < masterRgba.data.length; offset += 4) {
      assert.equal(runtimeRgba.data[offset], masterRgba.data[offset], asset.id + ": WebP changed the prepared alpha silhouette");
    }
    const alpha = analyzeAlpha(runtimeRgba);
    assert.deepEqual(alpha, asset.alpha, asset.id + ": recorded alpha statistics/bounds differ from real pixels");
    assert.deepEqual(registration.alphaBounds, alpha.bounds, asset.id + ": runtime registry alpha bounds differ");
    assert.deepEqual(preparationEntry.alphaBounds, alpha.bounds, asset.id + ": preparation alpha bounds differ");
    assert.equal(preparationEntry.width, runtimeRgba.info.width, asset.id + ": preparation width differs");
    assert.equal(preparationEntry.height, runtimeRgba.info.height, asset.id + ": preparation height differs");
    assert.equal(preparationEntry.transparentPixels, alpha.transparent, asset.id + ": preparation transparency count differs");
    assert.equal(preparationEntry.opaquePixels, alpha.opaque, asset.id + ": preparation opaque count differs");
    const { data, info } = runtimeRgba;
    const sample = (x, y) => data[(y * info.width + x) * 4 + 3];
    for (const [x, y] of [[0, 0], [info.width - 1, 0], [0, info.height - 1], [info.width - 1, info.height - 1]]) {
      assert.equal(sample(x, y), 0, asset.id + ": nontransparent exterior corner");
    }
    assert.ok(alpha.transparent > info.width * info.height * 0.05, asset.id + ": insufficient real empty alpha");
    assert.ok(alpha.opaque > info.width * info.height * 0.05, asset.id + ": insufficient solid object pixels");
    assert.ok(alpha.bounds.width > 0 && alpha.bounds.height > 0, asset.id + ": empty silhouette");
    if (asset.id === "door-frame") {
      const aperture = registration.aperture;
      assert.ok(aperture && [aperture.x, aperture.y, aperture.width, aperture.height].every(Number.isInteger), "Door aperture requires an integer source rectangle");
      assert.ok(aperture.x >= 0 && aperture.y >= 0 && aperture.width > 0 && aperture.height > 0 &&
        aperture.x + aperture.width <= info.width && aperture.y + aperture.height <= info.height, "Door aperture lies outside its source");
      let opaqueAperturePixels = 0;
      let opaqueCorePixels = 0;
      // This is a design rectangle: rounded corners and small ornamental rims may
      // remain inside its outer edge. Do not erase that artwork to fit the box.
      // Its central passage must be entirely empty, not just one sampled pixel.
      const inset = Math.ceil(Math.min(aperture.width, aperture.height) * 0.05);
      for (let y = aperture.y; y < aperture.y + aperture.height; y += 1) {
        for (let x = aperture.x; x < aperture.x + aperture.width; x += 1) {
          if (sample(x, y) <= 8) continue;
          opaqueAperturePixels += 1;
          if (x >= aperture.x + inset && x < aperture.x + aperture.width - inset &&
            y >= aperture.y + inset && y < aperture.y + aperture.height - inset) opaqueCorePixels += 1;
        }
      }
      assert.equal(opaqueCorePixels, 0, "Door aperture core is obstructed by visible pixels");
      assert.ok(opaqueAperturePixels / (aperture.width * aperture.height) <= 0.005, "Door aperture contains more than a narrow ornamental rim");
    }
    report.push({ id: asset.id, width: info.width, height: info.height, alpha, pivot: registration.pivot });
  }
  total += runtime.bytes.length;
}
assert.ok(total < 3_000_000, "Ship bitmap runtime budget exceeds 3 MB");
console.log(JSON.stringify({
  status: "technical-validation-passed", modules: expected.length, transparentProps: report,
  runtimeBytes: total, sourceMasterRuntimeHashesVerified: true, registryDimensionsAndPivotsVerified: true,
  preparedAlphaPreserved: true, sourceRgbUnchanged: true, alphaBoundsAndApertureVerified: true, visualInspection: "separate required check; this script does not certify visual cleanup",
}, null, 2));
