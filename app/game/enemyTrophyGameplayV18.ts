import enemyTrophyGameplayManifestData from "../../public/game/assets/v18/enemy-trophy-gameplay/manifest.json";

export type EnemyTrophyGameplayObjectKind =
  | "hard-anatomy"
  | "soft-anatomy"
  | "botanical"
  | "equipment"
  | "relic";

export type EnemyTrophyGameplayPartId =
  | "skull"
  | "skull-and-spine"
  | "mask"
  | "insignia";

export type EnemyTrophyGameplayConsumer =
  | "hunt-canvas"
  | "trophy-wall"
  | "trophy-workshop";

export interface EnemyTrophyGameplayV18Asset {
  id: string;
  definitionId: string;
  name: string;
  objectKind: EnemyTrophyGameplayObjectKind;
  partId: EnemyTrophyGameplayPartId;
  franchiseStatus: "project-original";
  enemyIds: readonly string[];
  enemyNames: readonly string[];
  rosters: readonly ("v7" | "v8")[];
  runtimePath: string;
  runtimeUrl: string;
  planned: boolean;
  available: boolean;
  consumers: readonly EnemyTrophyGameplayConsumer[];
  source: {
    packId: "enemy-trophies-v17";
    definitionId: string;
    sha256: string;
  };
  transform: {
    mode: "audited-bounds-resize-and-center";
    sourceCrop: {
      left: number;
      top: number;
      width: number;
      height: number;
    };
    targetContent: {
      width: number;
      height: number;
    };
    canvas: {
      width: number;
      height: number;
    };
    kernel: "nearest";
    format: "lossless-webp";
    encoderEffort: number;
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
    status: "passed";
    notes: string;
  };
}

interface EnemyTrophyGameplayV18Manifest {
  schemaVersion: number;
  packId: string;
  packVersion: number;
  generator: string;
  assetRoot: string;
  coverage: {
    definitions: number;
    enemyIds: number;
    planned: number;
    available: number;
    complete: boolean;
  };
  build: {
    kind: "mechanical-runtime-derivative";
    sourcePackId: "enemy-trophies-v17";
    sourcePackVersion: 17;
    maxDimension: number;
    contentMaxDimension: number;
    transparentCanvas: boolean;
    format: "lossless-webp";
    encoderEffort: number;
    buildConcurrency: number;
    deterministic: boolean;
  };
  entries: readonly EnemyTrophyGameplayV18Asset[];
}

const manifest =
  enemyTrophyGameplayManifestData as unknown as EnemyTrophyGameplayV18Manifest;

export const ENEMY_TROPHY_GAMEPLAY_V18_SUMMARY = Object.freeze({
  schemaVersion: manifest.schemaVersion,
  packId: manifest.packId,
  packVersion: manifest.packVersion,
  generator: manifest.generator,
  assetRoot: manifest.assetRoot,
  sourcePackId: manifest.build.sourcePackId,
  definitions: manifest.coverage.definitions,
  enemyIds: manifest.coverage.enemyIds,
  planned: manifest.coverage.planned,
  available: manifest.coverage.available,
  complete: manifest.coverage.complete,
  maxDimension: manifest.build.maxDimension,
  contentMaxDimension: manifest.build.contentMaxDimension,
  transparentCanvas: manifest.build.transparentCanvas,
  deterministic: manifest.build.deterministic,
});

export const ENEMY_TROPHY_GAMEPLAY_V18_COVERAGE = Object.freeze({
  definitions: manifest.coverage.definitions,
  enemyIds: manifest.coverage.enemyIds,
  planned: manifest.coverage.planned,
  available: manifest.coverage.available,
  complete: manifest.coverage.complete,
});

export const ENEMY_TROPHY_GAMEPLAY_V18_ASSETS = Object.freeze(
  manifest.entries.map((entry) =>
    Object.freeze({
      ...entry,
      enemyIds: Object.freeze([...entry.enemyIds]),
      enemyNames: Object.freeze([...entry.enemyNames]),
      rosters: Object.freeze([...entry.rosters]),
      consumers: Object.freeze([...entry.consumers]),
    }),
  ),
) as readonly EnemyTrophyGameplayV18Asset[];

const gameplayByEnemyId = new Map<string, EnemyTrophyGameplayV18Asset>();
const gameplayByDefinitionId = new Map<
  string,
  EnemyTrophyGameplayV18Asset
>();

for (const asset of ENEMY_TROPHY_GAMEPLAY_V18_ASSETS) {
  gameplayByDefinitionId.set(asset.definitionId, asset);
  for (const enemyId of asset.enemyIds) {
    gameplayByEnemyId.set(enemyId, asset);
  }
}

export function enemyTrophyGameplayForEnemyId(
  enemyId: string | null | undefined,
): EnemyTrophyGameplayV18Asset | null {
  if (!enemyId) {
    return null;
  }
  const asset = gameplayByEnemyId.get(enemyId);
  return asset?.available ? asset : null;
}

export function enemyTrophyGameplayForDefinitionId(
  definitionId: string | null | undefined,
): EnemyTrophyGameplayV18Asset | null {
  if (!definitionId) {
    return null;
  }
  const asset = gameplayByDefinitionId.get(definitionId);
  return asset?.available ? asset : null;
}
