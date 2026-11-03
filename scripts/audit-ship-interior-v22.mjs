import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import sharp from "sharp";
import ts from "typescript";

const root = "art-source/v22/ship-interior";
const runtimeRoot = "public/game/ship-interior/v22";
const registryPath = "app/game/shipInteriorV22.ts";
const expected = ["floor-edge", "gantry", "service-ladder", "medbay-bed", "armory-rack", "archive-terminal", "forge-station"];
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const [manifest, pack, preparation, registrySource] = await Promise.all([
  readFile(root + "/manifest.json", "utf8").then(JSON.parse),
  readFile(root + "/generation-prompts.json", "utf8").then(JSON.parse),
  readFile(root + "/alpha-preparation.json", "utf8").then(JSON.parse),
  readFile(registryPath, "utf8"),
]);

assert.equal(preparation.status, "prepared", "Alpha preparation is not complete");
assert.equal(preparation.sourcesPreserved, true, "Generated sources must be preserved");
for (const [label, document] of Object.entries({ manifest, pack, preparation })) {
  assert.deepEqual(document.assets.map((asset) => asset.id).sort(), [...expected].sort(), label + ": expected exactly the seven V22 modules");
}
assert.equal(new Set(manifest.assets.map((asset) => asset.runtime.sha256)).size, expected.length, "Different modules unexpectedly share the same bitmap");
assert.equal(new Set(pack.assets.map((asset) => asset.prompt)).size, expected.length, "Modules must have separate generation prompts");
assert.ok(!/(?:art-source[\\/]|generated_images|[A-Za-z]:[\\/]Users[\\/])/i.test(registrySource), "Private production paths must not enter the runtime registry");

/** Parse the explicit data contract without executing application code. */
function literal(node) {
  if (ts.isAsExpression(node) || ts.isParenthesizedExpression(node) || ts.isSatisfiesExpression(node)) return literal(node.expression);
  if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) &&
    ts.isIdentifier(node.expression.expression) && node.expression.expression.text === "Object" &&
    node.expression.name.text === "freeze" && node.arguments.length === 1) return literal(node.arguments[0]);
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
  if (ts.isNumericLiteral(node)) return Number(node.text);
  if (ts.isObjectLiteralExpression(node)) {
    const entries = node.properties.map((property) => {
      assert.ok(ts.isPropertyAssignment(property), "Ship art contract requires explicit properties");
      assert.ok(ts.isIdentifier(property.name) || ts.isStringLiteral(property.name), "Unsupported ship art property");
      return [property.name.text, literal(property.initializer)];
    });
    assert.equal(new Set(entries.map(([key]) => key)).size, entries.length, "Duplicate ship art property");
    return Object.fromEntries(entries);
  }
  throw new Error("Ship art contract contains a non-literal value");
}
const registryAst = ts.createSourceFile(registryPath, registrySource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
const declaration = registryAst.statements.filter(ts.isVariableStatement)
  .flatMap((statement) => [...statement.declarationList.declarations])
  .find((entry) => ts.isIdentifier(entry.name) && entry.name.text === "SHIP_LEVEL_ART_V22");
assert.ok(declaration?.initializer, "SHIP_LEVEL_ART_V22 contract is missing");
const registry = Object.values(literal(declaration.initializer));
assert.equal(registry.length, expected.length, "Unexpected runtime registration count");
assert.equal(new Set(registry.map((entry) => entry.src)).size, expected.length, "Duplicate runtime art URL");

async function verifyFile(record, label, format) {
  assert.ok(record && typeof record.path === "string" && /^[a-f0-9]{64}$/.test(record.sha256), label + ": valid path and SHA-256 required");
  const bytes = await readFile(record.path);
  const meta = await sharp(bytes).metadata();
  assert.equal(hash(bytes), record.sha256, label + ": bytes differ from the recorded hash");
  assert.equal(meta.format, format, label + ": unexpected format");
  assert.ok(meta.width > 0 && meta.height > 0, label + ": invalid dimensions");
  if (record.bytes !== undefined) assert.equal(bytes.length, record.bytes, label + ": byte length differs");
  if (record.width !== undefined) assert.equal(meta.width, record.width, label + ": width differs");
  if (record.height !== undefined) assert.equal(meta.height, record.height, label + ": height differs");
  return { bytes, meta };
}
async function rgba(bytes) {
  return sharp(bytes).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
}
function inspectAlpha({ data, info }) {
  assert.equal(info.channels, 4, "RGBA expected for alpha inspection");
  let transparent = 0, opaque = 0, left = info.width, top = info.height, right = -1, bottom = -1;
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
  const prepared = preparation.assets.find((entry) => entry.id === asset.id);
  assert.ok(typeof job.prompt === "string" && job.prompt.trim().length > 0, asset.id + ": generation prompt is missing");
  assert.equal(job.alphaRequired, true, asset.id + ": all V22 modules require alpha");
  assert.equal(asset.generatedSource.path, job.source, asset.id + ": generated source differs from its generation record");
  assert.ok(asset.generatedSource.path.startsWith(root + "/") && !asset.generatedSource.path.includes(".."), asset.id + ": generated source must be preserved in this pack");
  assert.equal(asset.master.path, root + "/" + asset.id + ".png", asset.id + ": unexpected master path");
  assert.notEqual(asset.generatedSource.path, asset.master.path, asset.id + ": preserve the generated source separately from its prepared master");
  assert.equal(asset.runtime.path, runtimeRoot + "/" + asset.id + ".webp", asset.id + ": unexpected runtime path");
  assert.equal(asset.runtime.url, "/" + asset.runtime.path.slice("public/".length), asset.id + ": URL differs from the runtime file");
  const [generated, master, runtime] = await Promise.all([
    verifyFile(asset.generatedSource, asset.id + " generated", "png"),
    verifyFile(asset.master, asset.id + " master", "png"),
    verifyFile(asset.runtime, asset.id + " runtime", "webp"),
  ]);
  assert.equal(master.meta.width, generated.meta.width, asset.id + ": alpha preparation changed source width");
  assert.equal(master.meta.height, generated.meta.height, asset.id + ": alpha preparation changed source height");
  assert.equal(runtime.meta.width, master.meta.width, asset.id + ": runtime resized width");
  assert.equal(runtime.meta.height, master.meta.height, asset.id + ": runtime resized height");
  assert.equal(master.meta.hasAlpha, true, asset.id + ": master requires actual alpha");
  assert.equal(runtime.meta.hasAlpha, true, asset.id + ": runtime requires actual alpha");
  assert.equal(asset.runtime.hasAlpha, true, asset.id + ": recorded alpha metadata differs");

  const registration = registry.find((entry) => entry.src === asset.runtime.url);
  assert.ok(registration, asset.id + ": missing runtime registration");
  assert.equal(registration.sourceWidth, runtime.meta.width, asset.id + ": registered source width differs");
  assert.equal(registration.sourceHeight, runtime.meta.height, asset.id + ": registered source height differs");
  assert.ok(Number.isFinite(registration.width) && registration.width > 0 && Number.isFinite(registration.height) && registration.height > 0, asset.id + ": invalid world dimensions");
  assert.ok(registration.pivot && Number.isFinite(registration.pivot.x) && Number.isFinite(registration.pivot.y), asset.id + ": finite pivot required");
  assert.ok(registration.pivot.x >= 0 && registration.pivot.x <= registration.width && registration.pivot.y >= 0 && registration.pivot.y <= registration.height, asset.id + ": pivot lies outside world dimensions");
  assert.equal(registration.sizeBasis, "alpha-bounds", asset.id + ": nominal dimensions must describe the painted silhouette");
  assert.ok(registration.alphaBounds && Object.values(registration.alphaBounds).every(Number.isInteger), asset.id + ": integer source alpha bounds required");
  assert.ok(registration.alphaBounds.width > 0 && registration.alphaBounds.height > 0, asset.id + ": empty registered alpha bounds");
  const sourceRatio = registration.alphaBounds.width / registration.alphaBounds.height;
  const displayRatio = registration.width / registration.height;
  assert.ok(Math.abs(displayRatio / sourceRatio - 1) < 0.01, asset.id + ": nominal display ratio distorts the painted silhouette by more than 1%");
  const topLeft = asset.id === "floor-edge" || asset.id === "gantry";
  const structure = topLeft || asset.id === "service-ladder";
  assert.deepEqual(registration.pivot, topLeft ? { x: 0, y: 0 } : { x: registration.width / 2, y: registration.height }, asset.id + ": incorrect structural or furniture pivot");
  assert.equal(registration.layer, structure ? "structure" : "fixtures", asset.id + ": incorrect depth layer");
  if (asset.id === "floor-edge") assert.ok(Math.abs(registration.height - 20) < 1e-7, "Floor edge cross-section must match its 20-unit visual band");
  if (asset.id === "gantry") assert.ok(Math.abs(registration.height - 16) < 1e-7, "Gantry cross-section must match its 16-unit visual band");
  if (asset.id === "service-ladder") assert.ok(Math.abs(registration.width - 56) < 1e-7, "Ladder cross-section must match its 56-unit visual band");

  const [masterRgba, runtimeRgba, sourceRgba] = await Promise.all([rgba(master.bytes), rgba(runtime.bytes), rgba(generated.bytes)]);
  assert.equal(prepared.source, asset.generatedSource.path, asset.id + ": alpha preparation points to another generated source");
  assert.equal(prepared.master, asset.master.path, asset.id + ": alpha preparation points to another master");
  assert.equal(prepared.sourceSha256, asset.generatedSource.sha256, asset.id + ": alpha preparation source hash differs");
  assert.equal(prepared.rgbUnchanged, true, asset.id + ": preparation must declare RGB preservation");
  assert.equal(prepared.sourceUnchanged, true, asset.id + ": preparation must declare original source preservation");
  for (let offset = 0; offset < masterRgba.data.length; offset += 4) {
    assert.ok(masterRgba.data[offset] === sourceRgba.data[offset] && masterRgba.data[offset + 1] === sourceRgba.data[offset + 1] && masterRgba.data[offset + 2] === sourceRgba.data[offset + 2], asset.id + ": alpha preparation repainted source RGB pixels");
    assert.equal(runtimeRgba.data[offset + 3], masterRgba.data[offset + 3], asset.id + ": WebP changed the prepared alpha silhouette");
  }
  const alpha = inspectAlpha(runtimeRgba);
  assert.deepEqual(alpha, asset.alpha, asset.id + ": recorded alpha statistics differ from real pixels");
  assert.deepEqual(registration.alphaBounds, alpha.bounds, asset.id + ": runtime alpha bounds differ");
  assert.deepEqual(prepared.alphaBounds, alpha.bounds, asset.id + ": preparation alpha bounds differ");
  assert.equal(prepared.width, runtimeRgba.info.width, asset.id + ": preparation width differs");
  assert.equal(prepared.height, runtimeRgba.info.height, asset.id + ": preparation height differs");
  assert.equal(prepared.transparentPixels, alpha.transparent, asset.id + ": preparation transparency count differs");
  assert.equal(prepared.opaquePixels, alpha.opaque, asset.id + ": preparation opaque count differs");
  const { data, info } = runtimeRgba;
  for (const [x, y] of [[0, 0], [info.width - 1, 0], [0, info.height - 1], [info.width - 1, info.height - 1]]) {
    assert.equal(data[(y * info.width + x) * 4 + 3], 0, asset.id + ": nontransparent exterior corner");
  }
  assert.ok(alpha.transparent > info.width * info.height * 0.05, asset.id + ": insufficient empty alpha");
  assert.ok(alpha.opaque > info.width * info.height * 0.05, asset.id + ": insufficient solid object pixels");
  assert.ok(alpha.bounds.width > 0 && alpha.bounds.height > 0, asset.id + ": empty silhouette");
  report.push({ id: asset.id, width: info.width, height: info.height, alpha, pivot: registration.pivot, layer: registration.layer });
  total += runtime.bytes.length;
}
assert.ok(total < 3_000_000, "V22 ship bitmap runtime budget exceeds 3 MB");
console.log(JSON.stringify({
  status: "technical-validation-passed", modules: expected.length, transparentModules: report, runtimeBytes: total,
  sourceMasterRuntimeHashesVerified: true, registryDimensionsAndPivotsVerified: true,
  sourceRgbUnchanged: true, preparedAlphaPreserved: true, alphaBoundsVerified: true,
  visualInspection: "Separate required check; this script does not certify artistic cleanup, tile joins, ladder openings or gameplay alignment.",
}, null, 2));
