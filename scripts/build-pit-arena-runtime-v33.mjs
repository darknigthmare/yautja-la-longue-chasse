import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const PIT_ARENA_SOURCE_PATH = "art-source/v33/pit-arenas/production-manifest.json";
export const PIT_ARENA_RUNTIME_PATH = "app/game/pitArenaProductionData.generated.json";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]));
  return value;
}
function box(value) {
  return { x: value.x, y: value.y, width: value.width, height: value.height };
}
function hasReference(value) {
  return typeof value === "string" && value.length > 0;
}

/** Explicit allow-list: private prompts, receipt contents and archive paths never enter the client bundle. */
export function projectPitArenaRuntimeData(source) {
  assert.equal(source.schemaVersion, 1);
  assert.equal(source.production, "v33-pit-independent-arena-art");
  return {
    schemaVersion: source.schemaVersion,
    production: source.production,
    sourceManifestSha256: createHash("sha256").update(JSON.stringify(canonical(source))).digest("hex"),
    sourceNote: "Projection runtime. Les sources de génération et preuves complètes restent dans le manifeste local de production.",
    stages: source.stages.map(stage => ({
      number: stage.number,
      catalogueId: stage.catalogueId,
      assetDirectory: stage.assetDirectory,
      name: stage.name,
      setting: stage.setting,
      wave: stage.wave,
      legacyRuntimeArenaId: stage.legacyRuntimeArenaId,
      legacyRuntimeStatus: stage.legacyRuntimeStatus,
      sourceConfirmation: stage.sourceConfirmation,
      runtimeEnabled: stage.runtimeEnabled,
      planes: stage.planes.map(plane => ({
        id: plane.id,
        role: plane.role,
        nominalParallax: plane.nominalParallax,
        status: plane.status,
        subplanSpecification: plane.subplanSpecification,
        assets: plane.assets.map(asset => ({
          id: asset.id,
          role: asset.role,
          ...(asset.drawOrder === undefined ? {} : { drawOrder: asset.drawOrder }),
          alphaRequired: asset.alphaRequired,
          requiredForRuntime: asset.requiredForRuntime,
          mode: asset.mode,
          ...(asset.sourceCrop ? { sourceCrop: box(asset.sourceCrop) } : {}),
          ...(asset.anchorToGround === undefined ? {} : { anchorToGround: asset.anchorToGround }),
          parallax: asset.parallax,
          opacity: asset.opacity,
          placements: asset.placements.map(box),
          animation: asset.animation ? { fps: asset.animation.fps, reducedMotionFrame: asset.animation.reducedMotionFrame, loop: asset.animation.loop } : null,
          frames: asset.frames.map(frame => ({
            path: frame.path,
            status: frame.status,
            generation: frame.generation ? {
              generator: frame.generation.generator,
              sourceRecorded: hasReference(frame.generation.source),
              sha256: frame.generation.sha256,
              width: frame.generation.width,
              height: frame.generation.height,
              hasAlpha: frame.generation.hasAlpha,
              contentBounds: box(frame.generation.contentBounds),
            } : null,
            review: frame.review ? {
              evidenceRecorded: hasReference(frame.review.evidence),
              coherence: frame.review.coherence,
              layout: frame.review.layout,
              alpha: frame.review.alpha,
            } : null,
            integration: frame.integration ? { evidenceRecorded: hasReference(frame.integration.evidence) } : null,
          })),
        })),
      })),
    })),
  };
}

export function serializePitArenaRuntimeData(source) {
  return JSON.stringify(projectPitArenaRuntimeData(source)) + "\n";
}

async function readSource(projectRoot) {
  return JSON.parse(await fs.readFile(path.join(projectRoot, PIT_ARENA_SOURCE_PATH), "utf8"));
}

// Authoring-only validation: a runtime attestation is never accepted in place of the actual source evidence.
export async function verifyPitArenaSourceReferences(source, projectRoot = root) {
  const evidence = new Set();
  for (const stage of source.stages) for (const plane of stage.planes) for (const asset of plane.assets) for (const frame of asset.frames) {
    if (frame.status === "planned") continue;
    assert(hasReference(frame.generation?.source), "Missing original generation receipt: " + frame.path);
    evidence.add(frame.generation.source);
    if (frame.status === "reviewed" || frame.status === "integrated") {
      assert(hasReference(frame.review?.evidence), "Missing original review: " + frame.path);
      evidence.add(frame.review.evidence);
    }
    if (frame.status === "integrated") {
      assert(hasReference(frame.integration?.evidence), "Missing original integration proof: " + frame.path);
      evidence.add(frame.integration.evidence);
    }
  }
  for (const relative of evidence) {
    assert(/^(art-source|docs)\//.test(relative) && !relative.split(/[\\/]/).includes("..") && !path.isAbsolute(relative), "Unexpected private evidence location: " + relative);
    await fs.access(path.join(projectRoot, relative));
  }
}

/** This check runs locally/CI with the archives; deployed builds consume only the already generated JSON. */
export async function checkPitArenaRuntimeData(projectRoot = root) {
  const source = await readSource(projectRoot);
  await verifyPitArenaSourceReferences(source, projectRoot);
  const expected = serializePitArenaRuntimeData(source);
  const actual = await fs.readFile(path.join(projectRoot, PIT_ARENA_RUNTIME_PATH), "utf8");
  assert.equal(actual.replaceAll("\r\n", "\n"), expected, "Stale PIT runtime projection. Run node scripts/build-pit-arena-runtime-v33.mjs, review and commit the generated JSON.");
  return { source, bytes: Buffer.byteLength(actual), sourceManifestSha256: projectPitArenaRuntimeData(source).sourceManifestSha256 };
}

export async function buildPitArenaRuntimeData(projectRoot = root) {
  const source = await readSource(projectRoot);
  await verifyPitArenaSourceReferences(source, projectRoot);
  const output = serializePitArenaRuntimeData(source);
  const destination = path.join(projectRoot, PIT_ARENA_RUNTIME_PATH);
  const previous = await fs.readFile(destination, "utf8").catch(error => { if (error.code === "ENOENT") return null; throw error; });
  if (previous !== output) await fs.writeFile(destination, output);
  return { changed: previous !== output, bytes: Buffer.byteLength(output) };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const check = process.argv.includes("--check");
  const result = check ? await checkPitArenaRuntimeData() : await buildPitArenaRuntimeData();
  console.log(JSON.stringify({ result: "PASS", operation: check ? "check" : "build", output: PIT_ARENA_RUNTIME_PATH, bytes: result.bytes, ...(check ? { sourceManifestSha256: result.sourceManifestSha256 } : { changed: result.changed }) }));
}
