import trophyManifestData from "../../public/game/assets/v15/trophies/manifest.json";

export type TrophyWallPartId =
  | "skull"
  | "skull-and-spine"
  | "mask"
  | "insignia";

export interface TrophyWallVisualAsset {
  id: string;
  definitionId: string;
  name: string;
  description: string;
  targetName: string;
  partId: TrophyWallPartId;
  franchiseStatus: "project-original";
  runtimePath: string;
  runtimeUrl: string;
  planned: boolean;
  available: boolean;
  consumers: readonly ["trophy-wall"];
  sourceMetadata: {
    bytes: number;
    width: number;
    height: number;
    sha256: string;
  };
  metadata: {
    bytes: number;
    width: number;
    height: number;
    channels: number;
    sha256: string;
  };
  validation: {
    alpha: boolean;
    cornerAlpha: readonly number[];
    bounds: readonly number[];
    padding: {
      left: number;
      top: number;
      right: number;
      bottom: number;
    };
    visibleRatio: number;
    transparentRatio: number;
    partialAlphaPixels: number;
    visibleGreenRatio: number;
  };
  inspection: {
    status: "passed" | "planned";
    notes: string;
  };
}

interface TrophyWallManifest {
  schemaVersion: number;
  packId: string;
  packVersion: number;
  generator: string;
  assetRoot: string;
  coverage: {
    planned: number;
    available: number;
    complete: boolean;
  };
  entries: readonly TrophyWallVisualAsset[];
}

const manifest = trophyManifestData as unknown as TrophyWallManifest;

export const TROPHY_WALL_MANIFEST_SUMMARY = Object.freeze({
  schemaVersion: manifest.schemaVersion,
  packId: manifest.packId,
  packVersion: manifest.packVersion,
  generator: manifest.generator,
  assetRoot: manifest.assetRoot,
  planned: manifest.coverage.planned,
  available: manifest.coverage.available,
  complete: manifest.coverage.complete,
});

export const TROPHY_WALL_VISUALS = Object.freeze(
  manifest.entries.map((entry) =>
    Object.freeze({
      ...entry,
      consumers: Object.freeze([...entry.consumers]),
    }),
  ),
) as readonly TrophyWallVisualAsset[];

const visualsByDefinitionId = new Map(
  TROPHY_WALL_VISUALS.map((entry) => [entry.definitionId, entry]),
);

export function trophyWallVisualForDefinitionId(
  definitionId: string | null | undefined,
): TrophyWallVisualAsset | null {
  if (!definitionId) {
    return null;
  }
  const visual = visualsByDefinitionId.get(definitionId);
  return visual?.available && visual.consumers.includes("trophy-wall")
    ? visual
    : null;
}
