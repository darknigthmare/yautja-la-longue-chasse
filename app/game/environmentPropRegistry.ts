import {
  ENVIRONMENT_PROP_BIOME_IDS,
  ENVIRONMENT_PROP_RUNTIME_ASSETS,
  type EnvironmentPropBiomeId,
  type EnvironmentPropRole,
  type EnvironmentPropRuntimeAsset,
} from "./environmentPropRuntimeData";
import type { MissionId } from "./types";
import { worldBlueprintFor } from "./systems/worldBlueprints";
import {
  WORLD_SCREENS_BY_MISSION,
  type WorldScreenFeature,
  type WorldScreenFeatureKind,
  type WorldScreenGameplayRole,
} from "./worldScreens";

export {
  ENVIRONMENT_PROP_RUNTIME_ASSETS,
} from "./environmentPropRuntimeData";
export type {
  EnvironmentPropRuntimeAsset,
} from "./environmentPropRuntimeData";

/**
 * Runtime registry backed only by the generated, sanitized V19 data module.
 *
 * Source masters, prompts, subjects and chroma metadata deliberately do not
 * cross this boundary. Feature resolution and sector streaming remain stable
 * when the production catalogue is regenerated.
 */

export const ENVIRONMENT_PROPS_PER_BIOME = 100 as const;
export const ENVIRONMENT_GAMEPLAY_PROPS_PER_BIOME = 18 as const;
export const ENVIRONMENT_DECOR_PROPS_PER_BIOME = 20 as const;

const WORLD_FLOOR_Y = 624;
const DECOR_EDGE_CLEARANCE = 72;

export type EnvironmentPropRenderPass =
  | "world-back"
  | "world-gameplay"
  | "actor-occluder";

export interface EnvironmentGameplayPropAssignment {
  missionId: MissionId;
  biomeId: EnvironmentPropBiomeId;
  screenId: string;
  featureId: string;
  geometryId: string;
  featureRole: WorldScreenGameplayRole;
  featureKind: WorldScreenFeatureKind;
  renderPass: "world-gameplay";
  asset: EnvironmentPropRuntimeAsset;
}

export interface EnvironmentLegacyGeometryPropAssignment {
  missionId: MissionId;
  biomeId: EnvironmentPropBiomeId;
  screenId: string;
  geometryId: string;
  geometryRole: Exclude<EnvironmentPropRole, "decoration">;
  renderPass: "world-gameplay";
  source: "legacy-world-geometry";
  asset: EnvironmentPropRuntimeAsset;
}

export type EnvironmentGeometryPropAssignment =
  | EnvironmentGameplayPropAssignment
  | EnvironmentLegacyGeometryPropAssignment;

export interface EnvironmentDecorPropPlacement {
  id: string;
  missionId: MissionId;
  biomeId: EnvironmentPropBiomeId;
  screenId: string;
  asset: EnvironmentPropRuntimeAsset;
  x: number;
  anchorY: number;
  anchor: "floor" | "ceiling";
  scale: number;
  opacity: number;
  mirrored: boolean;
  estimatedWidth: number;
  renderPass: "world-back" | "actor-occluder";
  collision: "none";
}

export interface EnvironmentPropCullWindow {
  left: number;
  right: number;
  overscan?: number;
}

const FEATURE_ROLE_TO_PROP_ROLE: Readonly<
  Record<WorldScreenGameplayRole, EnvironmentPropRole>
> = {
  platform: "platform",
  climb: "climbable",
  water: "surface",
  hazard: "hazard",
  cover: "cover",
  tracking: "surface",
};

type FeatureArchetypeHints = Readonly<
  Record<
    EnvironmentPropBiomeId,
    Readonly<Partial<Record<WorldScreenFeatureKind, readonly string[]>>>
  >
>;

/**
 * Explicit semantic bridge between room-plan kinds and catalogue archetypes.
 * There is intentionally no generic fallback: a new room kind must be
 * classified here before it can silently receive an unrelated visual.
 */
export const ENVIRONMENT_PROP_FEATURE_ARCHETYPE_HINTS: FeatureArchetypeHints = {
  jungle: {
    platform: [
      "root-bridge",
      "mossy-ruin-slab",
      "canopy-crown",
      "expedition-deck",
    ],
    ruin: ["mossy-ruin-slab", "root-bridge", "expedition-deck"],
    tree: [
      "buttress-trunk",
      "strangler-root-wall",
      "ruined-idol",
      "supply-palisade",
    ],
    vine: ["hanging-vine", "buttress-trunk", "field-ladder"],
    ladder: ["field-ladder", "buttress-trunk", "hanging-vine"],
    mud: ["footprint-mud", "crushed-fern-bed", "rain-puddle"],
    water: ["rain-puddle", "footprint-mud", "crushed-fern-bed"],
  },
  ice: {
    platform: [
      "glacier-shelf",
      "crystal-bridge",
      "mine-gantry",
      "frozen-wreck-deck",
    ],
    "metal-gantry": ["mine-gantry", "frozen-wreck-deck", "glacier-shelf"],
    "ice-wall": [
      "ice-wall",
      "crystal-column",
      "fractured-ice-pillar",
      "frozen-cargo-stack",
    ],
    ladder: ["crystal-column", "ice-wall", "maintenance-rope"],
    rope: ["maintenance-rope", "crystal-column", "ice-wall"],
    snowdrift: [
      "snowdrift-track",
      "frost-shard-trail",
      "black-ice",
      "frozen-cargo-stack",
      "overturned-drill",
      "fractured-ice-pillar",
    ],
    "thin-ice": ["thin-ice", "falling-icicle-zone", "cryo-steam-vent"],
  },
  volcano: {
    platform: [
      "basalt-slab",
      "aqueduct-fragment",
      "obsidian-altar",
      "chain-bridge",
    ],
    ruin: [
      "obsidian-altar",
      "aqueduct-fragment",
      "charred-idol",
      "obsidian-pylon",
      "fallen-statue",
    ],
    "basalt-column": [
      "basalt-column",
      "obsidian-pylon",
      "charred-idol",
      "fallen-statue",
    ],
    ladder: ["ritual-ladder", "basalt-column", "suspended-chain"],
    chain: ["suspended-chain", "ritual-ladder", "basalt-column"],
    lava: ["lava-seam", "heat-burst-fissure", "steam-vent"],
    "steam-vent": ["steam-vent", "heat-burst-fissure", "lava-seam"],
    mud: ["ash-track", "cooled-lava-crust", "obsidian-shard-bed"],
  },
  swamp: {
    platform: [
      "mangrove-root-platform",
      "peat-islet",
      "drowned-delta-pier",
      "floating-log",
    ],
    tree: [
      "mangrove-trunk",
      "hanging-root",
      "salvage-rope",
      "root-cathedral-buttress",
      "drowned-stump",
      "sunken-cargo-stack",
    ],
    mud: ["black-mud", "hydra-mucus-trail", "shallow-water"],
    water: ["shallow-water", "hydra-mucus-trail", "black-mud"],
    "tidal-surge": ["tidal-breakline", "suction-bog", "acid-mud-vent"],
  },
  desert: {
    platform: [
      "sandstone-ledge",
      "vitrified-glass-slab",
      "mining-gantry",
      "eroded-arch",
    ],
    "rock-face": ["canyon-rock-face", "mine-ladder", "anchor-rope"],
    sand: ["sand-track", "singing-silica-ripple", "glass-crack"],
    ruin: ["ruin-pillar", "obsidian-glass-fin", "buried-cargo"],
    "sand-collapse": [
      "collapse-crust",
      "burrow-breach-crater",
      "razor-glass-field",
    ],
  },
  ocean: {
    platform: [
      "coral-arch-shelf",
      "reef-plate",
      "drowned-station-deck",
      "clan-harpoon-perch",
    ],
    rope: ["salvage-rope", "kelp-cable", "station-ladder"],
    water: ["tide-pool", "wet-algae-track", "shallow-surf"],
    coral: ["coral-pillar", "shell-ridge", "pressure-module"],
    "rogue-wave": [
      "rogue-wave-breakline",
      "live-electrical-pylon",
      "abyssal-vent",
    ],
  },
  fungal: {
    platform: [
      "mycelial-bridge",
      "giant-cap",
      "root-membrane-shelf",
      "sterilization-gantry",
    ],
    vine: ["cord-vine", "tower-gill", "maintenance-ladder"],
    mycelium: [
      "memory-mycelium",
      "spore-dust-track",
      "nerve-filament-mat",
    ],
    tree: ["tower-stem", "puffball-barricade", "sterilizer-tank"],
    "spore-cloud": ["spore-pod", "mycelial-snare", "acid-bloom"],
  },
  ruins: {
    platform: [
      "obsidian-bridge",
      "gravity-slab",
      "sentinel-gantry",
      "prism-dais",
    ],
    ladder: ["service-ladder", "magnetic-wall-rungs", "fractured-spire"],
    obsidian: [
      "obsidian-scuff-track",
      "electrostatic-debris",
      "phase-tile",
    ],
    ruin: [
      "reactive-stela",
      "sentinel-shield-wreck",
      "prism-console-plinth",
    ],
    "gravity-pulse": [
      "gravity-pulse-emitter",
      "nanite-field-obelisk",
      "laser-grid-projector",
    ],
  },
};

function stableHash(value: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function round(value: number, precision = 3): number {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}

const runtimeAssetsByBiome = new Map<
  EnvironmentPropBiomeId,
  readonly EnvironmentPropRuntimeAsset[]
>(
  ENVIRONMENT_PROP_BIOME_IDS.map((biomeId) => [
    biomeId,
    Object.freeze(
      ENVIRONMENT_PROP_RUNTIME_ASSETS.filter(
        (asset) => asset.biomeId === biomeId,
      ),
    ),
  ]),
);

function expectedPropRole(
  feature: Pick<WorldScreenFeature, "role">,
): EnvironmentPropRole {
  return FEATURE_ROLE_TO_PROP_ROLE[feature.role];
}

function archetypeHintsForFeature(
  biomeId: EnvironmentPropBiomeId,
  feature: Pick<WorldScreenFeature, "kind">,
): readonly string[] {
  return ENVIRONMENT_PROP_FEATURE_ARCHETYPE_HINTS[biomeId][feature.kind] ?? [];
}

export function isEnvironmentPropCompatibleWithFeature(
  biomeId: EnvironmentPropBiomeId,
  feature: Pick<WorldScreenFeature, "role" | "kind">,
  asset: Pick<
    EnvironmentPropRuntimeAsset,
    "biomeId" | "role" | "archetypeId"
  >,
): boolean {
  const hints = archetypeHintsForFeature(biomeId, feature);
  return (
    asset.biomeId === biomeId &&
    asset.role === expectedPropRole(feature) &&
    hints.includes(asset.archetypeId)
  );
}

function selectGameplayAsset(
  missionId: MissionId,
  biomeId: EnvironmentPropBiomeId,
  feature: WorldScreenFeature,
  usedAssetIds: ReadonlySet<string>,
): EnvironmentPropRuntimeAsset {
  const hints = archetypeHintsForFeature(biomeId, feature);
  if (hints.length === 0) {
    throw new RangeError(
      `${missionId}/${feature.id}: no V19 archetype mapping for ${feature.role}/${feature.kind}`,
    );
  }

  const candidates = (runtimeAssetsByBiome.get(biomeId) ?? [])
    .filter(
      (asset) =>
        !usedAssetIds.has(asset.id) &&
        isEnvironmentPropCompatibleWithFeature(biomeId, feature, asset),
    )
    .sort((left, right) => {
      const leftHint = hints.indexOf(left.archetypeId);
      const rightHint = hints.indexOf(right.archetypeId);
      return leftHint - rightHint || left.id.localeCompare(right.id);
    });

  if (candidates.length === 0) {
    throw new RangeError(
      `${missionId}/${feature.id}: no unused compatible V19 prop remains`,
    );
  }

  return candidates[
    stableHash(`${missionId}:${feature.id}:${feature.role}:${feature.kind}`) %
      candidates.length
  ];
}

function createGameplayAssignments(): readonly EnvironmentGameplayPropAssignment[] {
  const assignments: EnvironmentGameplayPropAssignment[] = [];

  for (const layout of Object.values(WORLD_SCREENS_BY_MISSION)) {
    const biomeId = layout.biome as EnvironmentPropBiomeId;
    const usedAssetIds = new Set<string>();
    const features = layout.screens.flatMap((screen) =>
      screen.features.map((feature) => ({ screen, feature })),
    );
    if (features.length !== ENVIRONMENT_GAMEPLAY_PROPS_PER_BIOME) {
      throw new RangeError(
        `${layout.missionId}: expected ${ENVIRONMENT_GAMEPLAY_PROPS_PER_BIOME} gameplay features, received ${features.length}`,
      );
    }

    for (const { screen, feature } of features) {
      const asset = selectGameplayAsset(
        layout.missionId,
        biomeId,
        feature,
        usedAssetIds,
      );
      usedAssetIds.add(asset.id);
      assignments.push(
        Object.freeze({
          missionId: layout.missionId,
          biomeId,
          screenId: screen.id,
          featureId: feature.id,
          geometryId: `feature-${feature.id}`,
          featureRole: feature.role,
          featureKind: feature.kind,
          renderPass: "world-gameplay",
          asset,
        }),
      );
    }
  }

  return Object.freeze(assignments);
}

export const ENVIRONMENT_GAMEPLAY_PROP_ASSIGNMENTS =
  createGameplayAssignments();

type PhysicalEnvironmentPropRole = Exclude<
  EnvironmentPropRole,
  "decoration"
>;

interface PhysicalWorldGeometry {
  readonly id: string;
  readonly x: number;
  readonly width: number;
}

function selectLegacyGeometryAsset(
  missionId: MissionId,
  biomeId: EnvironmentPropBiomeId,
  geometryId: string,
  geometryRole: PhysicalEnvironmentPropRole,
  usedAssetIds: ReadonlySet<string>,
): EnvironmentPropRuntimeAsset {
  const candidates = [...(runtimeAssetsByBiome.get(biomeId) ?? [])]
    .filter((asset) => asset.role === geometryRole)
    .sort((left, right) => left.id.localeCompare(right.id));
  const unusedCandidates = candidates.filter(
    (asset) => !usedAssetIds.has(asset.id),
  );
  const pool =
    unusedCandidates.length > 0 ? unusedCandidates : candidates;

  if (pool.length === 0) {
    throw new RangeError(
      `${missionId}/${geometryId}: no V19 ${geometryRole} prop exists`,
    );
  }

  return pool[
    stableHash(`${missionId}:${geometryId}:${geometryRole}`) % pool.length
  ];
}

function createLegacyGeometryAssignments(): readonly EnvironmentLegacyGeometryPropAssignment[] {
  const assignments: EnvironmentLegacyGeometryPropAssignment[] = [];

  for (const layout of Object.values(WORLD_SCREENS_BY_MISSION)) {
    const biomeId = layout.biome as EnvironmentPropBiomeId;
    const world = worldBlueprintFor(layout.missionId);
    const featureGeometryIds = new Set(
      ENVIRONMENT_GAMEPLAY_PROP_ASSIGNMENTS.filter(
        (assignment) => assignment.missionId === layout.missionId,
      ).map((assignment) => assignment.geometryId),
    );
    const usedAssetIds = new Set(
      ENVIRONMENT_GAMEPLAY_PROP_ASSIGNMENTS.filter(
        (assignment) => assignment.missionId === layout.missionId,
      ).map((assignment) => assignment.asset.id),
    );
    const geometryGroups: readonly {
      readonly role: PhysicalEnvironmentPropRole;
      readonly geometries: readonly PhysicalWorldGeometry[];
    }[] = [
      { role: "platform", geometries: world.platforms },
      { role: "climbable", geometries: world.climbables },
      { role: "cover", geometries: world.covers },
      { role: "hazard", geometries: world.hazards },
      { role: "surface", geometries: world.surfaces },
    ];

    for (const { role, geometries } of geometryGroups) {
      for (const geometry of geometries) {
        if (featureGeometryIds.has(geometry.id)) continue;

        const centerX = geometry.x + geometry.width / 2;
        const screen =
          layout.screens.find(
            (candidate, index) =>
              centerX >= candidate.startX &&
              (centerX < candidate.endX ||
                (index === layout.screens.length - 1 &&
                  centerX <= candidate.endX)),
          ) ?? null;
        if (!screen) {
          throw new RangeError(
            `${layout.missionId}/${geometry.id}: geometry center is outside every screen`,
          );
        }

        const asset = selectLegacyGeometryAsset(
          layout.missionId,
          biomeId,
          geometry.id,
          role,
          usedAssetIds,
        );
        usedAssetIds.add(asset.id);
        assignments.push(
          Object.freeze({
            missionId: layout.missionId,
            biomeId,
            screenId: screen.id,
            geometryId: geometry.id,
            geometryRole: role,
            renderPass: "world-gameplay",
            source: "legacy-world-geometry",
            asset,
          }),
        );
      }
    }
  }

  return Object.freeze(assignments);
}

export const ENVIRONMENT_LEGACY_GEOMETRY_PROP_ASSIGNMENTS =
  createLegacyGeometryAssignments();

const gameplayAssignmentByFeatureKey = new Map(
  ENVIRONMENT_GAMEPLAY_PROP_ASSIGNMENTS.map((assignment) => [
    `${assignment.missionId}:${assignment.featureId}`,
    assignment,
  ]),
);

const geometryAssignmentByGeometryKey = new Map(
  [
    ...ENVIRONMENT_GAMEPLAY_PROP_ASSIGNMENTS,
    ...ENVIRONMENT_LEGACY_GEOMETRY_PROP_ASSIGNMENTS,
  ].map((assignment) => [
    `${assignment.missionId}:${assignment.geometryId}`,
    assignment,
  ]),
);

function estimatedBaseWidth(role: EnvironmentPropRole): number {
  switch (role) {
    case "platform":
      return 300;
    case "climbable":
      return 128;
    case "cover":
      return 164;
    case "hazard":
      return 280;
    case "surface":
      return 320;
    case "decoration":
      return 176;
  }
}

function usesCeilingAnchor(asset: EnvironmentPropRuntimeAsset): boolean {
  return (
    asset.role === "decoration" &&
    (asset.archetypeId.includes("curtain") ||
      asset.archetypeId.includes("hanging"))
  );
}

function decorRenderPass(
  asset: EnvironmentPropRuntimeAsset,
): "world-back" | "actor-occluder" {
  return asset.role === "decoration" &&
    stableHash(`${asset.id}:render-pass`) % 3 === 0
    ? "actor-occluder"
    : "world-back";
}

function createDecorPlacements(): readonly EnvironmentDecorPropPlacement[] {
  const placements: EnvironmentDecorPropPlacement[] = [];

  for (const layout of Object.values(WORLD_SCREENS_BY_MISSION)) {
    const biomeId = layout.biome as EnvironmentPropBiomeId;
    const leftovers = [...(runtimeAssetsByBiome.get(biomeId) ?? [])]
      .filter((asset) => asset.role === "decoration")
      .sort(
        (left, right) =>
          stableHash(`${biomeId}:${left.id}`) -
            stableHash(`${biomeId}:${right.id}`) ||
          left.id.localeCompare(right.id),
      );

    if (leftovers.length !== ENVIRONMENT_DECOR_PROPS_PER_BIOME) {
      throw new RangeError(
        `${layout.missionId}: expected ${ENVIRONMENT_DECOR_PROPS_PER_BIOME} decor props, received ${leftovers.length}`,
      );
    }

    const assetsByScreen = layout.screens.map((_, screenIndex) =>
      leftovers.filter((__, assetIndex) => assetIndex % 6 === screenIndex),
    );
    layout.screens.forEach((screen, screenIndex) => {
      const screenAssets = assetsByScreen[screenIndex];

      screenAssets.forEach((asset, slotIndex) => {
        const hash = stableHash(`${layout.missionId}:${screen.id}:${asset.id}`);
        const evenFraction = (slotIndex + 1) / (screenAssets.length + 1);
        const anchor = usesCeilingAnchor(asset) ? "ceiling" : "floor";
        const scale = round(0.48 + ((hash >>> 16) % 29) / 100, 2);
        const renderPass = decorRenderPass(asset);
        const estimatedWidth = round(
          estimatedBaseWidth(asset.role) * scale,
        );
        const usableStart =
          screen.startX +
          Math.max(DECOR_EDGE_CLEARANCE, estimatedWidth / 2);
        const usableEnd =
          screen.endX -
          Math.max(DECOR_EDGE_CLEARANCE, estimatedWidth / 2);
        const usableSpan = usableEnd - usableStart;
        const jitter =
          (((hash >>> 8) % 2_001) / 2_000 - 0.5) *
          Math.min(28, usableSpan / (screenAssets.length + 1) / 3);

        placements.push(
          Object.freeze({
            id: `environment-decor-placement-v19-${layout.missionId}-${asset.id}`,
            missionId: layout.missionId,
            biomeId,
            screenId: screen.id,
            asset,
            x: round(
              Math.max(
                usableStart,
                Math.min(usableEnd, usableStart + usableSpan * evenFraction + jitter),
              ),
            ),
            anchorY: anchor === "ceiling" ? 18 : WORLD_FLOOR_Y,
            anchor,
            scale,
            opacity: round(
              renderPass === "actor-occluder"
                ? 0.82 + ((hash >>> 24) % 13) / 100
                : 0.66 + ((hash >>> 24) % 19) / 100,
              2,
            ),
            mirrored: (hash & 1) === 1,
            estimatedWidth,
            renderPass,
            collision: "none",
          }),
        );
      });
    });
  }

  return Object.freeze(placements);
}

export const ENVIRONMENT_DECOR_PROP_PLACEMENTS = createDecorPlacements();

const decorPlacementsBySectorKey = new Map<
  string,
  readonly EnvironmentDecorPropPlacement[]
>();
const decorPlacementsByMissionPassKey = new Map<
  string,
  readonly EnvironmentDecorPropPlacement[]
>();
for (const placement of ENVIRONMENT_DECOR_PROP_PLACEMENTS) {
  const key = `${placement.missionId}:${placement.screenId}`;
  const current = decorPlacementsBySectorKey.get(key) ?? [];
  decorPlacementsBySectorKey.set(
    key,
    Object.freeze([...current, placement]),
  );
  const missionPassKey = `${placement.missionId}:${placement.renderPass}`;
  const currentMissionPass =
    decorPlacementsByMissionPassKey.get(missionPassKey) ?? [];
  decorPlacementsByMissionPassKey.set(
    missionPassKey,
    Object.freeze([...currentMissionPass, placement]),
  );
}

export function environmentGameplayPropForFeatureId(
  missionId: MissionId,
  featureId: string,
): EnvironmentGameplayPropAssignment | null {
  return gameplayAssignmentByFeatureKey.get(`${missionId}:${featureId}`) ?? null;
}

export function environmentGameplayPropForGeometryId(
  missionId: MissionId,
  geometryId: string,
): EnvironmentGeometryPropAssignment | null {
  return (
    geometryAssignmentByGeometryKey.get(`${missionId}:${geometryId}`) ?? null
  );
}

export function environmentDecorPlacementsForSector(
  missionId: MissionId,
  screenId: string,
  renderPass?: "world-back" | "actor-occluder",
): readonly EnvironmentDecorPropPlacement[] {
  const placements =
    decorPlacementsBySectorKey.get(`${missionId}:${screenId}`) ?? [];
  return renderPass
    ? placements.filter((placement) => placement.renderPass === renderPass)
    : placements;
}

export function environmentDecorPlacementsForMission(
  missionId: MissionId,
  renderPass: "world-back" | "actor-occluder",
): readonly EnvironmentDecorPropPlacement[] {
  return (
    decorPlacementsByMissionPassKey.get(`${missionId}:${renderPass}`) ?? []
  );
}

export function cullEnvironmentDecorPlacements(
  placements: readonly EnvironmentDecorPropPlacement[],
  window: EnvironmentPropCullWindow,
): readonly EnvironmentDecorPropPlacement[] {
  if (
    !Number.isFinite(window.left) ||
    !Number.isFinite(window.right) ||
    window.left > window.right
  ) {
    throw new RangeError("Environment prop cull window is invalid");
  }
  const overscan = window.overscan ?? 160;
  if (!Number.isFinite(overscan) || overscan < 0) {
    throw new RangeError("Environment prop cull overscan is invalid");
  }

  const left = window.left - overscan;
  const right = window.right + overscan;
  return placements.filter((placement) => {
    const halfWidth = placement.estimatedWidth / 2;
    return placement.x + halfWidth >= left && placement.x - halfWidth <= right;
  });
}

export function environmentPropRuntimeUrlsForSector(
  missionId: MissionId,
  screenId: string,
): readonly string[] {
  const gameplayUrls = [
    ...ENVIRONMENT_GAMEPLAY_PROP_ASSIGNMENTS,
    ...ENVIRONMENT_LEGACY_GEOMETRY_PROP_ASSIGNMENTS,
  ]
    .filter(
      (assignment) =>
        assignment.missionId === missionId &&
        assignment.screenId === screenId,
    )
    .map((assignment) => assignment.asset.runtimeUrl);
  const decorUrls = environmentDecorPlacementsForSector(
    missionId,
    screenId,
  ).map((placement) => placement.asset.runtimeUrl);
  return Object.freeze([...new Set([...gameplayUrls, ...decorUrls])]);
}
