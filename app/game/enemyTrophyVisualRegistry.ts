import enemyTrophyManifestData from "../../public/game/assets/v17/enemy-trophies/manifest.json";

export type EnemyTrophyObjectKind =
  | "hard-anatomy"
  | "soft-anatomy"
  | "botanical"
  | "equipment"
  | "relic";
export type EnemyTrophyConsumer =
  | "enemy-bestiary-v7"
  | "enemy-bestiary-v8";

export interface EnemyTrophyVisualAsset {
  id: string;
  name: string;
  objectKind: EnemyTrophyObjectKind;
  franchiseStatus: "project-original";
  enemyIds: readonly string[];
  enemyNames: readonly string[];
  rosters: readonly ("v7" | "v8")[];
  runtimePath: string;
  runtimeUrl: string;
  planned: boolean;
  available: boolean;
  consumers: readonly EnemyTrophyConsumer[];
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

interface EnemyTrophyManifest {
  schemaVersion: number;
  packId: string;
  packVersion: number;
  generator: string;
  assetRoot: string;
  enemyCoverage: number;
  distinctTrophyCoverage: number;
  coverage: {
    planned: number;
    available: number;
    complete: boolean;
  };
  entries: readonly EnemyTrophyVisualAsset[];
}

const manifest = enemyTrophyManifestData as unknown as EnemyTrophyManifest;

export const ENEMY_TROPHY_MANIFEST_SUMMARY = Object.freeze({
  schemaVersion: manifest.schemaVersion,
  packId: manifest.packId,
  packVersion: manifest.packVersion,
  generator: manifest.generator,
  assetRoot: manifest.assetRoot,
  enemyCoverage: manifest.enemyCoverage,
  distinctTrophyCoverage: manifest.distinctTrophyCoverage,
  planned: manifest.coverage.planned,
  available: manifest.coverage.available,
  complete: manifest.coverage.complete,
});

export const ENEMY_TROPHY_VISUALS = Object.freeze(
  manifest.entries.map((entry) =>
    Object.freeze({
      ...entry,
      enemyIds: Object.freeze([...entry.enemyIds]),
      enemyNames: Object.freeze([...entry.enemyNames]),
      rosters: Object.freeze([...entry.rosters]),
      consumers: Object.freeze([...entry.consumers]),
    }),
  ),
) as readonly EnemyTrophyVisualAsset[];

const visualsByEnemyId = new Map<string, EnemyTrophyVisualAsset>();
for (const visual of ENEMY_TROPHY_VISUALS) {
  for (const enemyId of visual.enemyIds) {
    visualsByEnemyId.set(enemyId, visual);
  }
}

export function enemyTrophyVisualForEnemyId(
  enemyId: string | null | undefined,
  consumer?: EnemyTrophyConsumer,
): EnemyTrophyVisualAsset | null {
  if (!enemyId) {
    return null;
  }
  const visual = visualsByEnemyId.get(enemyId);
  if (!visual?.available) {
    return null;
  }
  if (consumer && !visual.consumers.includes(consumer)) {
    return null;
  }
  return visual;
}
