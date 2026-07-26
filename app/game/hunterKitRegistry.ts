import hunterKitManifestData from "../../public/game/assets/v14/hunter-kit/manifest.json";

export type HunterKitAssetKind = "mask" | "weapon" | "trophy";
export type HunterKitResolutionTier =
  | "exact-override"
  | "family"
  | "approximation"
  | "generic";
export type HunterKitConsumer = "thumbnail" | "rig";

export const HUNTER_KIT_PRIORITY = [
  "exact-override",
  "family",
  "approximation",
  "generic",
] as const satisfies readonly HunterKitResolutionTier[];

export interface HunterKitSelectionAliases {
  exactPresetIds: readonly string[];
  familyIds: readonly string[];
  approximationIds: readonly string[];
  genericIds: readonly string[];
}

export interface HunterKitRuntimeAsset {
  id: string;
  kind: HunterKitAssetKind;
  name: string;
  work: string;
  year: number;
  sourceTier: HunterKitResolutionTier;
  sourceRecordId: string;
  promptRecordId: string;
  runtimePath: string;
  runtimeUrl: string;
  planned: boolean;
  available: boolean;
  selectionAliases: HunterKitSelectionAliases;
  futureConsumers: readonly HunterKitConsumer[];
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
  shard: string;
}

interface HunterKitManifest {
  schemaVersion: number;
  packId: string;
  packVersion: number;
  generator: string;
  assetRoot: string;
  selectionPriority: readonly HunterKitResolutionTier[];
  coverage: {
    planned: number;
    available: number;
    complete: boolean;
  };
  entries: readonly HunterKitRuntimeAsset[];
}

export interface HunterKitResolveRequest {
  kind: HunterKitAssetKind;
  assetId?: string | null;
  presetId?: string | null;
  familyId?: string | null;
  approximationId?: string | null;
  genericId?: string | null;
  includePlanned?: boolean;
}

export interface HunterKitResolution {
  asset: HunterKitRuntimeAsset;
  matchedTier: HunterKitResolutionTier;
  matchedAlias: string;
  status: "available" | "planned";
}

const manifest = hunterKitManifestData as unknown as HunterKitManifest;

export const HUNTER_KIT_MANIFEST_SUMMARY = Object.freeze({
  schemaVersion: manifest.schemaVersion,
  packId: manifest.packId,
  packVersion: manifest.packVersion,
  generator: manifest.generator,
  assetRoot: manifest.assetRoot,
  planned: manifest.coverage.planned,
  available: manifest.coverage.available,
  complete: manifest.coverage.complete,
});

export const HUNTER_KIT_ASSETS = Object.freeze(
  manifest.entries.map((entry) =>
    Object.freeze({
      ...entry,
      selectionAliases: Object.freeze({
        exactPresetIds: Object.freeze([
          ...entry.selectionAliases.exactPresetIds,
        ]),
        familyIds: Object.freeze([...entry.selectionAliases.familyIds]),
        approximationIds: Object.freeze([
          ...entry.selectionAliases.approximationIds,
        ]),
        genericIds: Object.freeze([...entry.selectionAliases.genericIds]),
      }),
      futureConsumers: Object.freeze([...entry.futureConsumers]),
    }),
  ),
) as readonly HunterKitRuntimeAsset[];

const assetsById = new Map(
  HUNTER_KIT_ASSETS.map((entry) => [entry.id, entry]),
);

const lookupByTier: Record<
  HunterKitResolutionTier,
  Map<string, HunterKitRuntimeAsset[]>
> = {
  "exact-override": new Map(),
  family: new Map(),
  approximation: new Map(),
  generic: new Map(),
};

function lookupKey(kind: HunterKitAssetKind, alias: string): string {
  return `${kind}:${alias}`;
}

function addAlias(
  tier: HunterKitResolutionTier,
  kind: HunterKitAssetKind,
  alias: string,
  asset: HunterKitRuntimeAsset,
): void {
  const key = lookupKey(kind, alias);
  const entries = lookupByTier[tier].get(key);
  if (entries) {
    entries.push(asset);
    return;
  }
  lookupByTier[tier].set(key, [asset]);
}

for (const asset of HUNTER_KIT_ASSETS) {
  for (const alias of asset.selectionAliases.exactPresetIds) {
    addAlias("exact-override", asset.kind, alias, asset);
  }
  for (const alias of asset.selectionAliases.familyIds) {
    addAlias("family", asset.kind, alias, asset);
  }
  for (const alias of asset.selectionAliases.approximationIds) {
    addAlias("approximation", asset.kind, alias, asset);
  }
  for (const alias of asset.selectionAliases.genericIds) {
    addAlias("generic", asset.kind, alias, asset);
  }
}

function isSelectable(
  asset: HunterKitRuntimeAsset,
  includePlanned: boolean,
): boolean {
  return asset.available || (includePlanned && asset.planned);
}

function asResolution(
  asset: HunterKitRuntimeAsset,
  matchedTier: HunterKitResolutionTier,
  matchedAlias: string,
): HunterKitResolution {
  return {
    asset,
    matchedTier,
    matchedAlias,
    status: asset.available ? "available" : "planned",
  };
}

export function getHunterKitAsset(
  assetId: string,
): HunterKitRuntimeAsset | null {
  return assetsById.get(assetId) ?? null;
}

export function listHunterKitAssets(options?: {
  kind?: HunterKitAssetKind;
  status?: "available" | "planned";
}): readonly HunterKitRuntimeAsset[] {
  return HUNTER_KIT_ASSETS.filter((asset) => {
    if (options?.kind && asset.kind !== options.kind) {
      return false;
    }
    if (options?.status === "available" && !asset.available) {
      return false;
    }
    if (options?.status === "planned" && (!asset.planned || asset.available)) {
      return false;
    }
    return true;
  });
}

export function resolveHunterKitAsset(
  request: HunterKitResolveRequest,
): HunterKitResolution | null {
  const includePlanned = request.includePlanned ?? false;

  if (request.assetId) {
    const directAsset = assetsById.get(request.assetId);
    if (
      directAsset?.kind === request.kind &&
      isSelectable(directAsset, includePlanned)
    ) {
      return asResolution(directAsset, "exact-override", request.assetId);
    }
  }

  const aliases: readonly [
    HunterKitResolutionTier,
    string | null | undefined,
  ][] = [
    ["exact-override", request.presetId],
    ["family", request.familyId],
    ["approximation", request.approximationId],
    ["generic", request.genericId],
  ];

  for (const [tier, alias] of aliases) {
    if (!alias) {
      continue;
    }
    const candidates =
      lookupByTier[tier].get(lookupKey(request.kind, alias)) ?? [];
    const selected = candidates.find((asset) =>
      isSelectable(asset, includePlanned),
    );
    if (selected) {
      return asResolution(selected, tier, alias);
    }
  }

  return null;
}

export function resolveHunterKitAssetForConsumer(
  request: HunterKitResolveRequest,
  consumer: HunterKitConsumer,
): HunterKitResolution | null {
  const resolution = resolveHunterKitAsset(request);
  if (!resolution?.asset.futureConsumers.includes(consumer)) {
    return null;
  }
  return resolution;
}
