import productionManifestJson from "./pitArenaProductionData.generated.json";
import type { PitArenaId } from "./systems/pitCombat";

export type PitArenaProductionStatus = "planned" | "generated" | "reviewed" | "integrated";
export type PitArenaProductionPlaneId = "P0" | "P1" | "P2" | "P3" | "P4" | "P5";
export interface PitArenaProductionFrame {
  readonly path: string;
  readonly status: PitArenaProductionStatus;
  readonly generation: null | {
    readonly generator: "openai-imagegen";
    /** Local production records carry a path; the deployable projection only carries its checked attestation. */
    readonly source?: string;
    readonly sourceRecorded?: boolean;
    readonly sha256: string;
    readonly width: number;
    readonly height: number;
    readonly hasAlpha: boolean;
    readonly contentBounds: { readonly x: number; readonly y: number; readonly width: number; readonly height: number };
  };
  readonly review: null | {
    readonly evidence?: string;
    readonly evidenceRecorded?: boolean;
    readonly coherence: true;
    readonly layout: true;
    readonly alpha: true;
  };
  readonly integration: null | { readonly evidence?: string; readonly evidenceRecorded?: boolean };
}
export interface PitArenaProductionPlacement {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}
export interface PitArenaProductionAsset {
  readonly id: string;
  readonly role: string;
  readonly drawOrder?: number;
  /** Authoring-only contour brief; omitted from the runtime projection. */
  readonly contour?: string;
  readonly alphaRequired: boolean;
  readonly requiredForRuntime: boolean;
  readonly mode: "cover" | "module" | "repeat-x" | "strip-x";
  readonly sourceCrop?: PitArenaProductionPlacement;
  /** Keep a floor-mounted prop vertically attached while its horizontal depth remains independent. */
  readonly anchorToGround?: boolean;
  readonly parallax: number;
  readonly opacity: number;
  readonly placements: readonly PitArenaProductionPlacement[];
  readonly animation: null | { readonly fps: number; readonly reducedMotionFrame: number; readonly loop: true };
  readonly frames: readonly PitArenaProductionFrame[];
}
export interface PitArenaProductionPlane {
  readonly id: PitArenaProductionPlaneId;
  readonly role: string;
  readonly nominalParallax: number;
  readonly status: PitArenaProductionStatus;
  readonly subplanSpecification: "pending-conversation" | "proposed-original" | "source-confirmed";
  readonly assets: readonly PitArenaProductionAsset[];
}
export interface PitArenaProductionStage {
  readonly number: number;
  readonly catalogueId: string;
  readonly assetDirectory: string;
  readonly name: string;
  readonly setting: string;
  readonly wave: string;
  readonly legacyRuntimeArenaId: PitArenaId | null;
  readonly legacyRuntimeStatus: "playable" | "concept";
  readonly sourceConfirmation: "pending-dedicated-conversation" | "confirmed";
  readonly runtimeEnabled: boolean;
  readonly planes: readonly PitArenaProductionPlane[];
}
export interface PitArenaProductionManifest {
  readonly schemaVersion: 1;
  readonly production: "v33-pit-independent-arena-art";
  readonly sourceNote: string;
  readonly stages: readonly PitArenaProductionStage[];
}
export interface PitArenaProductionKit {
  readonly catalogueId: string;
  readonly arenaId: PitArenaId;
  readonly planes: readonly PitArenaProductionPlane[];
  readonly paths: readonly string[];
  readonly requiredPaths: readonly string[];
}

export const PIT_ARENA_PRODUCTION_MANIFEST = productionManifestJson as unknown as PitArenaProductionManifest;
const PLANE_IDS: readonly PitArenaProductionPlaneId[] = ["P0", "P1", "P2", "P3", "P4", "P5"];
const STATUS_RANK: Record<PitArenaProductionStatus, number> = { planned: 0, generated: 1, reviewed: 2, integrated: 3 };

/** Readiness is based on each real image's provenance and review, never its filename. */
export function isPitArenaProductionFrameReviewed(frame: PitArenaProductionFrame, alphaRequired: boolean): boolean {
  const evidence = frame.generation;
  return (frame.status === "reviewed" || frame.status === "integrated")
    && evidence?.generator === "openai-imagegen"
    && (evidence.sourceRecorded === true || (typeof evidence.source === "string" && evidence.source.length > 0))
    && /^[a-f0-9]{64}$/.test(evidence.sha256)
    && Number.isInteger(evidence.width) && evidence.width > 0
    && Number.isInteger(evidence.height) && evidence.height > 0
    && evidence.contentBounds !== undefined
    && [evidence.contentBounds.x, evidence.contentBounds.y, evidence.contentBounds.width, evidence.contentBounds.height].every(Number.isInteger)
    && evidence.contentBounds.x >= 0 && evidence.contentBounds.y >= 0
    && evidence.contentBounds.width > 0 && evidence.contentBounds.height > 0
    && evidence.contentBounds.x + evidence.contentBounds.width <= evidence.width
    && evidence.contentBounds.y + evidence.contentBounds.height <= evidence.height
    && (!alphaRequired || evidence.hasAlpha === true)
    && frame.review?.coherence === true && frame.review.layout === true && frame.review.alpha === true
    && (frame.review.evidenceRecorded === true || (typeof frame.review.evidence === "string" && frame.review.evidence.length > 0))
    && (frame.status !== "integrated" || frame.integration?.evidenceRecorded === true
      || (typeof frame.integration?.evidence === "string" && frame.integration.evidence.length > 0));
}

/** A partial animation holds its first reviewed drawing; missing frames are never requested. */
export function getPitArenaProductionUsableFrames(asset: PitArenaProductionAsset): readonly PitArenaProductionFrame[] {
  if (!asset.frames[0] || !isPitArenaProductionFrameReviewed(asset.frames[0], asset.alphaRequired)) return [];
  if (asset.animation && asset.frames.length > 1 && asset.frames.every(frame => isPitArenaProductionFrameReviewed(frame, asset.alphaRequired))) {
    return asset.frames;
  }
  return [asset.frames[0]];
}

/** Concepts cannot acquire gameplay merely by having pictures; only the existing runtime mapping is accepted. */
export function resolvePitArenaProductionKit(
  arenaId: PitArenaId, manifest: PitArenaProductionManifest = PIT_ARENA_PRODUCTION_MANIFEST,
): PitArenaProductionKit | null {
  const stage = manifest.stages.find(entry => entry.legacyRuntimeArenaId === arenaId);
  if (!stage || !stage.runtimeEnabled || stage.legacyRuntimeStatus !== "playable"
    || stage.planes.length !== 6 || !PLANE_IDS.every(id => stage.planes.some(plane => plane.id === id))) return null;
  const requiredPaths: string[] = [];
  const paths = new Set<string>();
  const planes: PitArenaProductionPlane[] = [];
  for (const planeId of PLANE_IDS) {
    const plane = stage.planes.find(entry => entry.id === planeId)!;
    const assets: PitArenaProductionAsset[] = [];
    for (const asset of plane.assets) {
      const frames = getPitArenaProductionUsableFrames(asset);
      if (asset.requiredForRuntime && !frames.length) return null;
      if (!frames.length) continue;
      // A data typo must not request another arena, a remote URL, or a private source file.
      if (!frames.every(frame => frame.path.startsWith(stage.assetDirectory + "/")
        && /^\/game\/sprites\/v33\/pit-arenas\/[a-z0-9/-]+\.png$/.test(frame.path)
        && !frame.path.includes(".."))) return null;
      frames.forEach(frame => paths.add(frame.path));
      if (asset.requiredForRuntime) requiredPaths.push(frames[0].path);
      assets.push({ ...asset, frames });
    }
    if (!assets.length) return null;
    planes.push({ ...plane, assets: assets.sort((a, b) => (a.drawOrder ?? 0) - (b.drawOrder ?? 0)) });
  }
  return { catalogueId: stage.catalogueId, arenaId, planes, paths: [...paths], requiredPaths };
}

/** Counts files and documented sub-plans separately from gameplay and from six-plane targets. */
export function summarizePitArenaProduction(manifest: PitArenaProductionManifest = PIT_ARENA_PRODUCTION_MANIFEST) {
  const planes = manifest.stages.flatMap(stage => stage.planes);
  const assets = planes.flatMap(plane => plane.assets);
  const frames = assets.flatMap(asset => asset.frames);
  const counts = { planned: 0, generated: 0, reviewed: 0, integrated: 0 };
  for (const frame of frames) counts[frame.status]++;
  return {
    stages: manifest.stages.length,
    primaryPlaneTargets: planes.length,
    specifiedSubplans: assets.length,
    requestedImageFiles: frames.length,
    fileStatus: counts,
    legacyPlayable: manifest.stages.filter(stage => stage.legacyRuntimeStatus === "playable").length,
    concepts: manifest.stages.filter(stage => stage.legacyRuntimeStatus === "concept").length,
    readyRuntimeKits: manifest.stages.filter(stage => stage.legacyRuntimeArenaId && resolvePitArenaProductionKit(stage.legacyRuntimeArenaId, manifest)).length,
  };
}

export function getPitArenaProductionPlaneStatus(assets: readonly PitArenaProductionAsset[]): PitArenaProductionStatus {
  const frames = assets.flatMap(asset => asset.frames);
  if (!frames.length) return "planned";
  return frames.reduce<PitArenaProductionStatus>((least, frame) => STATUS_RANK[frame.status] < STATUS_RANK[least] ? frame.status : least, "integrated");
}
