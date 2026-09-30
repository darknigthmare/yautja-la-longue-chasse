import corrections from "./data/pitStageCompositionV63.json";
import type { PitArenaProductionAsset, PitArenaProductionFrame } from "./pitArenaProduction";

export interface PitStageCompositionCorrectionV63 {
  readonly stageId: string; readonly assetId: string; readonly sourceSha256: string;
  readonly frame?: PitArenaProductionFrame;
  readonly placements?: PitArenaProductionAsset["placements"];
  readonly sourceCrop?: PitArenaProductionAsset["sourceCrop"];
}
export const PIT_STAGE_COMPOSITION_V63 = corrections as unknown as { readonly schemaVersion: 1; readonly release: "V63"; readonly corrections: readonly PitStageCompositionCorrectionV63[] };

/** Source manifests remain immutable. Each replacement binds one owned asset to its reviewed original SHA. */
export function applyPitStageCompositionV63(stageId: string, asset: PitArenaProductionAsset): PitArenaProductionAsset {
  const entries = PIT_STAGE_COMPOSITION_V63.corrections.filter(c => c.stageId === stageId && c.assetId === asset.id);
  if (!entries.length) return asset;
  const entry = entries[0];
  if (entries.length !== 1 || asset.frames.length !== 1 || asset.frames[0].generation?.sha256 !== entry.sourceSha256) return asset;
  if (entry.frame && (!new RegExp(`^/game/sprites/v63/pit-arenas/${stageId}/[a-z0-9-]+\\.png$`).test(entry.frame.path)
    || entry.frame.generation?.generator !== "openai-imagegen" || entry.frame.generation.width !== asset.frames[0].generation.width
    || entry.frame.generation.height !== asset.frames[0].generation.height)) throw new Error(`Invalid V63 composition replacement: ${stageId}/${asset.id}`);
  if (entry.placements && (entry.placements.length !== asset.placements.length || entry.placements.some(p => ![p.x, p.y, p.width, p.height].every(Number.isFinite)
    || p.width <= 0 || p.height <= 0))) throw new Error(`Invalid V63 placement correction: ${stageId}/${asset.id}`);
  const crop = entry.sourceCrop, dimensions = asset.frames[0].generation;
  if (crop && (!dimensions || ![crop.x, crop.y, crop.width, crop.height].every(Number.isInteger) || crop.x < 0 || crop.y < 0
    || crop.width <= 0 || crop.height <= 0 || crop.x + crop.width > dimensions.width || crop.y + crop.height > dimensions.height)) throw new Error(`Invalid V63 native crop: ${stageId}/${asset.id}`);
  return { ...asset, frames: entry.frame ? [entry.frame] : asset.frames, placements: entry.placements ?? asset.placements,
    ...(crop ? { sourceCrop: crop } : {}) };
}
