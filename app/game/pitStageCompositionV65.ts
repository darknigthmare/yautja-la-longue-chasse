import data from "./data/pitStageCompositionV65.json";
import historicalData from "./pitArenaProductionData.generated.json";
import type { PitArenaProductionAsset, PitArenaProductionPlane, PitArenaProductionPlacement } from "./pitArenaProduction";

export interface PitStageCompositionV65Entry {
  readonly stageId: string;
  readonly sourceAssets: readonly { readonly planeId: string; readonly assetId: string; readonly hashes: readonly string[] }[];
  readonly planes: readonly PitArenaProductionPlane[];
  readonly floorCorrections: readonly { readonly assetId: string; readonly sourceCrop: PitArenaProductionPlacement; readonly height: number; readonly librarySource?: { readonly stageId: string; readonly assetId: string; readonly sha256: string } }[];
}
export interface PitStageCompositionV65Manifest {
  readonly schemaVersion: 1;
  readonly release: "V65";
  readonly stages: readonly PitStageCompositionV65Entry[];
}
export const PIT_STAGE_COMPOSITION_V65 = data as unknown as PitStageCompositionV65Manifest;
const replacedPlanes = ["P0", "P1", "P2", "P3", "P5"] as const;
const hash = /^[a-f0-9]{64}$/;
const rectangle = (r: PitArenaProductionPlacement) => r && [r.x, r.y, r.width, r.height].every(Number.isFinite) && r.width > 0 && r.height > 0;
const cropWithin = (r: PitArenaProductionPlacement, width: number, height: number) => rectangle(r)
  && [r.x, r.y, r.width, r.height].every(Number.isInteger) && r.x >= 0 && r.y >= 0 && r.x + r.width <= width && r.y + r.height <= height;

/** A versioned presentation overlay; old files, source manifests, combat IDs and simulation remain untouched. */
export function applyPitStageCompositionV65(stageId: string, original: readonly PitArenaProductionPlane[], manifest = PIT_STAGE_COMPOSITION_V65): readonly PitArenaProductionPlane[] {
  const entries = manifest.stages.filter(entry => entry.stageId === stageId);
  if (!entries.length) return original;
  const entry = entries[0];
  const fail = (): never => { throw new Error(`Invalid V65 static stage composition: ${stageId}`); };
  if (manifest.schemaVersion !== 1 || manifest.release !== "V65" || entries.length !== 1) fail();
  const sourceAssets = original.flatMap(plane => plane.assets.map(asset => ({ planeId: plane.id, assetId: asset.id, hashes: asset.frames.map(frame => frame.generation?.sha256) })));
  // A changed historical source must be reviewed again; never silently apply a patch to an unrelated kit.
  if (JSON.stringify(sourceAssets) !== JSON.stringify(entry.sourceAssets)) return original;
  if (entry.planes.length !== 5 || replacedPlanes.some(id => entry.planes.filter(plane => plane.id === id).length !== 1)) fail();
  const nativePaths = new Set<string>();
  const frameByPath = new Map<string, string>();
  const nativeCrops: PitArenaProductionPlacement[] = [];
  for (const plane of entry.planes) {
    if (plane.assets.length !== 1 || plane.status !== "integrated") fail();
    const asset = plane.assets[0], frame = asset.frames[0], generation = frame?.generation;
    if (asset.frames.length !== 1 || !generation || generation.generator !== "openai-imagegen" || !hash.test(generation.sha256)
      || !generation.sourceRecorded || ![generation.width, generation.height].every(n => Number.isInteger(n) && n > 0)
      || !cropWithin(generation.contentBounds, generation.width, generation.height)
      || !new RegExp(`^/game/sprites/v65/pit-arenas/${stageId}/(?:p0-depth|static-modules)\\.png$`).test(frame.path)
      || frame.status !== "integrated" || !frame.review?.coherence || !frame.review.layout || !frame.review.alpha || !frame.review.evidenceRecorded
      || !frame.integration?.evidenceRecorded || asset.animation !== null || asset.ambientMotion || asset.libraryRef
      || !asset.requiredForRuntime || asset.opacity <= 0 || asset.opacity > 1 || !Number.isFinite(asset.opacity)
      || !asset.placements.length || !asset.placements.every(rectangle) || !Number.isFinite(asset.parallax) || asset.parallax < 0 || asset.parallax > 1.1) fail();
    if (plane.id === "P0") {
      if (asset.mode !== "cover" || asset.alphaRequired || !frame.path.endsWith("/p0-depth.png") || asset.placements.length !== 1) fail();
    } else {
      if (asset.mode !== "module" || !asset.alphaRequired || !generation!.hasAlpha || !frame.path.endsWith("/static-modules.png")
        || !asset.sourceCrop || !cropWithin(asset.sourceCrop, generation!.width, generation!.height)) fail();
      nativeCrops.push(asset.sourceCrop!);
    }
    nativePaths.add(frame.path);
    const encodedFrame = JSON.stringify(frame);
    if (frameByPath.has(frame.path) && frameByPath.get(frame.path) !== encodedFrame) fail();
    frameByPath.set(frame.path, encodedFrame);
  }
  if (nativePaths.size !== 2 || nativeCrops.some((a, i) => nativeCrops.slice(i + 1).some(b => a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y))) fail();
  const floor = original.find(plane => plane.id === "P4");
  if (!floor || entry.floorCorrections.length !== floor.assets.length || new Set(entry.floorCorrections.map(c => c.assetId)).size !== floor.assets.length) fail();
  const correctedFloor: PitArenaProductionPlane = { ...floor!, assets: floor!.assets.map(asset => {
    const correction = entry.floorCorrections.find(c => c.assetId === asset.id);
    let material = asset;
    if (correction?.librarySource) {
      const ref = correction.librarySource;
      const shared = historicalData.stages.find(stage => stage.catalogueId === ref.stageId)?.planes.find(plane => plane.id === "P4")?.assets.find(candidate => candidate.id === ref.assetId) as unknown as PitArenaProductionAsset | undefined;
      if (!shared || shared.frames.length !== 1 || shared.frames[0].generation?.sha256 !== ref.sha256 || !hash.test(ref.sha256)
        || shared.mode !== asset.mode || shared.animation || shared.ambientMotion) fail();
      material = shared!;
    }
    const dimensions = material.frames[0].generation;
    if (!correction || !dimensions || asset.frames.length !== 1 || !["repeat-x", "strip-x"].includes(asset.mode)
      || !cropWithin(correction.sourceCrop, dimensions.width, dimensions.height) || !Number.isFinite(correction.height) || correction.height < 1 || correction.height > 300) fail();
    return { ...asset, frames: material.frames, libraryRef: correction?.librarySource ? `${correction.librarySource.stageId}/${correction.librarySource.assetId}` : asset.libraryRef, sourceCrop: correction!.sourceCrop, placements: asset.placements.map(p => ({ ...p, height: correction!.height })) } as PitArenaProductionAsset;
  }) };
  return original.map(plane => plane.id === "P4" ? correctedFloor : entry.planes.find(replacement => replacement.id === plane.id)!);
}
