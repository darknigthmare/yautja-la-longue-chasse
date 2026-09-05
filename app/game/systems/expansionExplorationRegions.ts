import type {
  BiomeId,
  ExplorationAbilityId,
  ExplorationProgress,
  MissionId,
} from "../types";
import { mergeExplorationProgress, normalizeExplorationProgress } from "./explorationProgress";
import type {
  ClimbableKind,
  HazardKind,
  RouteId,
  SurfaceMaterial,
  WorldBlueprint,
  WorldClimbable,
  WorldHazard,
  WorldPlatform,
  WorldRect,
} from "./worldBlueprints";

export const EXPANSION_EXPLORATION_MISSION_IDS = [
  "volcano-bad-blood",
  "swamp-hydra",
  "desert-sandmaw",
  "ocean-leviathan",
  "fungal-hivemind",
  "ruins-ancient-guardian",
] as const satisfies readonly MissionId[];

export type ExpansionExplorationMissionId =
  (typeof EXPANSION_EXPLORATION_MISSION_IDS)[number];

export interface ExpansionRegionRoom extends WorldRect {
  id: string;
  label: string;
  level: "lower" | "upper" | "vault";
}

interface ExpansionRegionCopy {
  regionLabel: string;
  abilityLabel: string;
  moduleLabel: string;
  gateLabel: string;
  secretLabel: string;
  shortcutLabel: string;
  hazardLabel: string;
  apexTrace: string;
  acquireMessage: string;
  gateMessage: string;
  secretMessage: string;
  shortcutMessage: string;
}

interface ExpansionRegionLayout {
  replacementSpan: Readonly<{ minX: number; maxX: number }>;
  moduleFloorY: number;
  vaultFloorY: number;
  starter: Readonly<WorldRect>;
  upperFloor: Readonly<WorldRect>;
  module: Readonly<WorldRect>;
  gate: Readonly<WorldRect>;
  bridge: Readonly<WorldRect>;
  vaultFloor: Readonly<WorldRect>;
  secret: Readonly<WorldRect>;
  hatch: Readonly<WorldRect>;
  outerWall: Readonly<WorldRect>;
  returnClimbable: Readonly<WorldRect>;
  hazard: Readonly<WorldRect>;
}

export interface ExpansionRegionSpec {
  missionId: ExpansionExplorationMissionId;
  biome: Exclude<BiomeId, "jungle" | "ice">;
  prefix: string;
  abilityId: Exclude<ExplorationAbilityId, "aerial-boost">;
  gateId: string;
  secretId: string;
  shortcutId: string;
  shortcutRequirement: ExplorationAbilityId;
  shortcutOriginMissionId: MissionId;
  routeId: RouteId;
  material: SurfaceMaterial;
  climbableKind: ClimbableKind;
  hazardKind: HazardKind;
  layout: ExpansionRegionLayout;
  rooms: readonly ExpansionRegionRoom[];
  copy: ExpansionRegionCopy;
}

const rect = (x: number, y: number, width: number, height: number): Readonly<WorldRect> =>
  ({ x, y, width, height });

function rooms(
  prefix: string,
  labels: readonly [string, string, string, string],
  layout: ExpansionRegionLayout,
): readonly ExpansionRegionRoom[] {
  return [
    {
      id: `${prefix}-approach`, label: labels[0], level: "lower",
      x: layout.replacementSpan.minX, y: 0,
      width: layout.upperFloor.x - layout.replacementSpan.minX,
      height: 624,
    },
    {
      id: `${prefix}-ascent`, label: labels[1], level: "upper",
      x: layout.upperFloor.x, y: 0,
      width: layout.gate.x - layout.upperFloor.x,
      height: layout.moduleFloorY,
    },
    {
      id: `${prefix}-vault`, label: labels[2], level: "vault",
      x: layout.gate.x, y: 0,
      width: layout.hatch.x + layout.hatch.width - layout.gate.x,
      height: layout.vaultFloorY,
    },
    {
      id: `${prefix}-return`, label: labels[3], level: "lower",
      x: layout.hatch.x, y: layout.vaultFloorY,
      width: layout.replacementSpan.maxX - layout.hatch.x,
      height: 624 - layout.vaultFloorY,
    },
  ];
}

function spec(
  definition: Omit<ExpansionRegionSpec, "rooms"> & {
    roomLabels: readonly [string, string, string, string];
  },
): ExpansionRegionSpec {
  const { roomLabels, ...region } = definition;
  return { ...region, rooms: rooms(region.prefix, roomLabels, region.layout) };
}

const VOLCANO_LAYOUT: ExpansionRegionLayout = {
  replacementSpan: { minX: 360, maxX: 1_580 }, moduleFloorY: 326, vaultFloorY: 410,
  starter: rect(470, 508, 220, 22), upperFloor: rect(690, 326, 340, 24),
  module: rect(820, 270, 52, 56), gate: rect(1_030, 0, 30, 434),
  bridge: rect(1_060, 326, 140, 24), vaultFloor: rect(1_200, 410, 200, 24),
  secret: rect(1_270, 354, 52, 56), hatch: rect(1_400, 410, 120, 24),
  outerWall: rect(1_520, 0, 28, 434), returnClimbable: rect(1_438, 220, 44, 404),
  hazard: rect(890, 210, 170, 116),
};

const SWAMP_LAYOUT: ExpansionRegionLayout = {
  replacementSpan: { minX: 340, maxX: 1_660 }, moduleFloorY: 350, vaultFloorY: 476,
  // 182 px from the starter: the jungle boost is a physical prerequisite,
  // not an arbitrary refusal after a normal jump already reaches the module.
  starter: rect(450, 532, 250, 22), upperFloor: rect(650, 350, 400, 24),
  module: rect(730, 294, 54, 56), gate: rect(1_050, 0, 30, 500),
  bridge: rect(1_080, 350, 150, 24), vaultFloor: rect(1_230, 476, 220, 24),
  secret: rect(1_315, 420, 54, 56), hatch: rect(1_450, 476, 120, 24),
  outerWall: rect(1_570, 0, 28, 500), returnClimbable: rect(1_488, 250, 44, 374),
  hazard: rect(790, 234, 290, 116),
};

const DESERT_LAYOUT: ExpansionRegionLayout = {
  replacementSpan: { minX: 420, maxX: 1_780 }, moduleFloorY: 300, vaultFloorY: 390,
  starter: rect(520, 510, 250, 22), upperFloor: rect(770, 300, 350, 24),
  module: rect(900, 244, 54, 56), gate: rect(1_120, 0, 30, 414),
  bridge: rect(1_150, 300, 240, 24), vaultFloor: rect(1_390, 390, 170, 24),
  secret: rect(1_455, 334, 54, 56), hatch: rect(1_560, 390, 120, 24),
  outerWall: rect(1_680, 0, 28, 414), returnClimbable: rect(1_598, 200, 44, 424),
  hazard: rect(1_100, 184, 310, 116),
};

const OCEAN_LAYOUT: ExpansionRegionLayout = {
  replacementSpan: { minX: 320, maxX: 1_600 }, moduleFloorY: 320, vaultFloorY: 470,
  // 174 px from the starter is above the 139 px ordinary jump apex.
  starter: rect(430, 494, 230, 22), upperFloor: rect(660, 320, 260, 24),
  module: rect(760, 264, 54, 56), gate: rect(920, 0, 30, 494),
  bridge: rect(950, 320, 200, 24), vaultFloor: rect(1_150, 470, 210, 24),
  secret: rect(1_225, 414, 54, 56), hatch: rect(1_360, 470, 120, 24),
  outerWall: rect(1_480, 0, 28, 494), returnClimbable: rect(1_398, 190, 44, 434),
  hazard: rect(860, 204, 290, 116),
};

const FUNGAL_LAYOUT: ExpansionRegionLayout = {
  replacementSpan: { minX: 380, maxX: 1_680 }, moduleFloorY: 280, vaultFloorY: 380,
  starter: rect(490, 500, 230, 22), upperFloor: rect(720, 280, 360, 24),
  module: rect(850, 224, 54, 56), gate: rect(1_080, 0, 30, 404),
  bridge: rect(1_110, 280, 150, 24), vaultFloor: rect(1_260, 380, 190, 24),
  secret: rect(1_325, 324, 54, 56), hatch: rect(1_450, 380, 120, 24),
  outerWall: rect(1_570, 0, 28, 404), returnClimbable: rect(1_488, 180, 44, 444),
  hazard: rect(900, 164, 210, 116),
};

const RUINS_LAYOUT: ExpansionRegionLayout = {
  replacementSpan: { minX: 400, maxX: 1_800 }, moduleFloorY: 320, vaultFloorY: 410,
  starter: rect(510, 500, 240, 22), upperFloor: rect(750, 320, 370, 24),
  module: rect(900, 264, 54, 56), gate: rect(1_120, 0, 30, 434),
  bridge: rect(1_150, 320, 260, 24), vaultFloor: rect(1_410, 410, 190, 24),
  secret: rect(1_475, 354, 54, 56), hatch: rect(1_600, 410, 120, 24),
  outerWall: rect(1_720, 0, 28, 434), returnClimbable: rect(1_638, 170, 44, 454),
  hazard: rect(1_030, 204, 120, 116),
};

export const EXPANSION_EXPLORATION_SPECS: Readonly<
  Record<ExpansionExplorationMissionId, ExpansionRegionSpec>
> = {
  "volcano-bad-blood": spec({
    missionId: "volcano-bad-blood", biome: "volcano", prefix: "volcano-forge",
    abilityId: "thermal-resistance", gateId: "volcano-heat-seal",
    secretId: "volcano-blooded-skull", shortcutId: "volcano-acid-return",
    shortcutRequirement: "acid-protection", shortcutOriginMissionId: "swamp-hydra",
    routeId: "volcano-forge-route", material: "obsidian", climbableKind: "chain", hazardKind: "heat-burst",
    layout: VOLCANO_LAYOUT,
    roomLabels: ["Corniche des scories", "Cheminée d’épreuve", "Forge des Crânes", "Chaîne des purges"],
    copy: {
      regionLabel: "Forge secondaire du Brasier", abilityLabel: "Résistance thermique",
      moduleLabel: "Sceau calorique", gateLabel: "Purge des évents",
      secretLabel: "Crâne vitrifié du Sang-Mêlé", shortcutLabel: "Chaîne rongée",
      hazardLabel: "Souffle de fournaise", apexTrace: "Entailles de poignet dans l’obsidienne chaude.",
      acquireMessage: "Sceau calorique accordé : la résistance thermique stabilise les évents proches.",
      gateMessage: "Évents purgés. Le pont de forge mène au trophée vitrifié.",
      secretMessage: "Crâne vitrifié récupéré : énergie maximale +5.",
      shortcutMessage: "L’acide a libéré la chaîne de purge : raccourci permanent ouvert.",
    },
  }),
  "swamp-hydra": spec({
    missionId: "swamp-hydra", biome: "swamp", prefix: "swamp-brood",
    abilityId: "acid-protection", gateId: "swamp-acid-sluice",
    secretId: "swamp-hydra-fang", shortcutId: "swamp-cut-root",
    shortcutRequirement: "cutting-blade", shortcutOriginMissionId: "desert-sandmaw",
    routeId: "swamp-brood-route", material: "root", climbableKind: "vine", hazardKind: "acid-bloom",
    layout: SWAMP_LAYOUT,
    roomLabels: ["Vasière des mues", "Racine creuse", "Nid caustique", "Liane de retour"],
    copy: {
      regionLabel: "Nid secondaire de l’Hydre", abilityLabel: "Protection acide",
      moduleLabel: "Glande neutralisante", gateLabel: "Vanne caustique",
      secretLabel: "Croc de l’Hydre juvénile", shortcutLabel: "Racine ligaturée",
      hazardLabel: "Bassin d’acide", apexTrace: "Trois sillons convergent vers la mue centrale.",
      acquireMessage: "Glande neutralisante fixée : la protection acide permet de traverser le bassin.",
      gateMessage: "Vanne caustique drainée. La racine-voute mène au croc rituel.",
      secretMessage: "Croc de l’Hydre récupéré : énergie maximale +5.",
      shortcutMessage: "La lame de coupe tranche la racine ligaturée : raccourci permanent ouvert.",
    },
  }),
  "desert-sandmaw": spec({
    missionId: "desert-sandmaw", biome: "desert", prefix: "desert-crypt",
    abilityId: "cutting-blade", gateId: "desert-tether-gate",
    secretId: "desert-glass-disc", shortcutId: "desert-flooded-well",
    shortcutRequirement: "aquatic-respirator", shortcutOriginMissionId: "ocean-leviathan",
    routeId: "desert-crypt-route", material: "stone", climbableKind: "rope", hazardKind: "sand-collapse",
    layout: DESERT_LAYOUT,
    roomLabels: ["Éboulis chantant", "Hauban des vents", "Crypte de verre", "Puits enseveli"],
    copy: {
      regionLabel: "Crypte secondaire de Serekh", abilityLabel: "Lame de coupe",
      moduleLabel: "Affûteur moléculaire", gateLabel: "Haubans de la passerelle",
      secretLabel: "Disque de verre noir", shortcutLabel: "Puits noyé",
      hazardLabel: "Dalle d’effondrement", apexTrace: "Vibrations lourdes sous les plaques de silice.",
      acquireMessage: "Lame de coupe calibrée : les haubans blindés peuvent être sectionnés.",
      gateMessage: "Haubans coupés. La passerelle tombe en place vers la crypte.",
      secretMessage: "Disque de verre noir récupéré : énergie maximale +5.",
      shortcutMessage: "Le respirateur permet de remonter le puits noyé : raccourci permanent ouvert.",
    },
  }),
  "ocean-leviathan": spec({
    missionId: "ocean-leviathan", biome: "ocean", prefix: "ocean-pressure",
    abilityId: "aquatic-respirator", gateId: "ocean-pressure-lock",
    secretId: "ocean-leviathan-pearl", shortcutId: "ocean-spore-vent",
    shortcutRequirement: "spore-vision", shortcutOriginMissionId: "fungal-hivemind",
    routeId: "ocean-pressure-route", material: "coral", climbableKind: "ladder", hazardKind: "abyssal-vent",
    layout: OCEAN_LAYOUT,
    roomLabels: ["Dalle des marées", "Cloche noyée", "Chambre abyssale", "Échelle de ballast"],
    copy: {
      regionLabel: "Chambre secondaire du Léviathan", abilityLabel: "Respirateur aquatique",
      moduleLabel: "Branchies de chasse", gateLabel: "Sas de pression",
      secretLabel: "Perle mandibulaire", shortcutLabel: "Évent aveugle",
      hazardLabel: "Décompression abyssale", apexTrace: "Impacts circulaires dans le corail blindé.",
      acquireMessage: "Respirateur aquatique scellé : la cloche noyée peut être pressurisée.",
      gateMessage: "Sas équilibré. Le courant ouvre la chambre de la perle.",
      secretMessage: "Perle mandibulaire récupérée : énergie maximale +5.",
      shortcutMessage: "La vision des spores révèle le courant de l’évent : raccourci permanent ouvert.",
    },
  }),
  "fungal-hivemind": spec({
    missionId: "fungal-hivemind", biome: "fungal", prefix: "fungal-memory",
    abilityId: "spore-vision", gateId: "fungal-memory-membrane",
    secretId: "fungal-elder-spore", shortcutId: "fungal-ancient-lattice",
    shortcutRequirement: "ancient-tech-detection", shortcutOriginMissionId: "ruins-ancient-guardian",
    routeId: "fungal-memory-route", material: "mycelium", climbableKind: "vine", hazardKind: "spore-cloud",
    layout: FUNGAL_LAYOUT,
    roomLabels: ["Tapis des dormeurs", "Lamelles aveugles", "Mémoire fructifiée", "Filament ancestral"],
    copy: {
      regionLabel: "Mémoire secondaire de Mycora", abilityLabel: "Vision des spores",
      moduleLabel: "Lentille mycélienne", gateLabel: "Membrane mnésique",
      secretLabel: "Spore de l’Ancien", shortcutLabel: "Treillis antique",
      hazardLabel: "Nuage hallucinogène", apexTrace: "Le réseau répète une silhouette trop grande pour la ruche.",
      acquireMessage: "Lentille mycélienne accordée : la vision des spores distingue la membrane vivante.",
      gateMessage: "Membrane révélée puis ouverte. Le filament conduit à la spore de l’Ancien.",
      secretMessage: "Spore de l’Ancien récupérée : énergie maximale +5.",
      shortcutMessage: "La détection antique réveille le treillis : raccourci permanent ouvert.",
    },
  }),
  "ruins-ancient-guardian": spec({
    missionId: "ruins-ancient-guardian", biome: "ruins", prefix: "ruins-oracle",
    abilityId: "ancient-tech-detection", gateId: "ruins-phase-grid",
    secretId: "ruins-guardian-shard", shortcutId: "ruins-gravity-chain",
    shortcutRequirement: "ancient-tech-detection", shortcutOriginMissionId: "ruins-ancient-guardian",
    routeId: "ruins-oracle-route", material: "ruin", climbableKind: "chain", hazardKind: "laser-grid",
    layout: RUINS_LAYOUT,
    roomLabels: ["Vestibule muet", "Faille de gravité", "Oracle fragmenté", "Chaîne orbitale"],
    copy: {
      regionLabel: "Oracle secondaire d’Acheron", abilityLabel: "Détection de technologie ancienne",
      moduleLabel: "Prisme d’arpentage", gateLabel: "Grille de phase",
      secretLabel: "Éclat du Gardien", shortcutLabel: "Ancre gravitationnelle",
      hazardLabel: "Réseau laser", apexTrace: "Une séquence de pas se termine au milieu du vide.",
      acquireMessage: "Prisme accordé : la technologie ancienne et ses failles de phase deviennent visibles.",
      gateMessage: "Grille phasée. Le pont d’obsidienne rejoint l’oracle fragmenté.",
      secretMessage: "Éclat du Gardien récupéré : énergie maximale +5.",
      shortcutMessage: "Ancre gravitationnelle synchronisée : raccourci permanent ouvert.",
    },
  }),
};

const expansionMissionSet = new Set<string>(EXPANSION_EXPLORATION_MISSION_IDS);

export function isExpansionExplorationMission(
  missionId: unknown,
): missionId is ExpansionExplorationMissionId {
  return typeof missionId === "string" && expansionMissionSet.has(missionId);
}

export function expansionExplorationSpec(
  missionId: unknown,
): ExpansionRegionSpec | null {
  return isExpansionExplorationMission(missionId)
    ? EXPANSION_EXPLORATION_SPECS[missionId]
    : null;
}

function validBody(body: WorldRect): boolean {
  return [body.x, body.y, body.width, body.height].every(Number.isFinite)
    && body.width > 0 && body.height > 0;
}

function horizontalDistance(a: WorldRect, b: WorldRect): number {
  return Math.max(0, a.x - b.x - b.width, b.x - a.x - a.width);
}

function near(a: WorldRect, b: WorldRect, radius = 44): boolean {
  const vertical = Math.max(0, a.y - b.y - b.height, b.y - a.y - a.height);
  return Math.hypot(horizontalDistance(a, b), vertical) <= radius;
}

function onFloor(body: WorldRect, floorY: number): boolean {
  const feet = body.y + body.height;
  return body.y < floorY && feet >= floorY - 24 && feet <= floorY + 4;
}

export function expansionRegionRoomAt(
  missionId: unknown,
  playerX: number,
  playerY: number,
): ExpansionRegionRoom | null {
  const region = expansionExplorationSpec(missionId);
  if (!region || !Number.isFinite(playerX) || !Number.isFinite(playerY)) return null;
  return region.rooms.find((room) => playerX >= room.x && playerX < room.x + room.width
    && playerY >= room.y && playerY < room.y + room.height) ?? null;
}

export function discoverExpansionRegionRooms(
  missionId: unknown,
  progress: ExplorationProgress,
  body: WorldRect,
): ExplorationProgress {
  const room = validBody(body)
    ? expansionRegionRoomAt(
      missionId,
      body.x + body.width / 2,
      body.y + body.height / 2,
    )
    : null;
  return mergeExplorationProgress(progress, {
    discoveredRoomIds: room ? [room.id] : [],
  });
}

function platform(
  spec: ExpansionRegionSpec,
  id: string,
  bounds: Readonly<WorldRect>,
  collision: WorldPlatform["collision"] = "solid",
): WorldPlatform {
  return {
    ...bounds,
    id,
    material: spec.material,
    routeId: spec.routeId,
    collision,
    noiseMultiplier: spec.biome === "ocean" ? 0.82 : spec.biome === "desert" ? 1.18 : 1,
    trackPersistence: spec.biome === "swamp" ? 0.32 : spec.biome === "volcano" ? 0.03 : 0.12,
  };
}

export function expansionRegionPlatforms(
  missionId: unknown,
  progress: ExplorationProgress,
): WorldPlatform[] {
  const spec = expansionExplorationSpec(missionId);
  if (!spec) return [];
  const state = normalizeExplorationProgress(progress);
  const { layout } = spec;
  const gateOpen = state.openedGateIds.includes(spec.gateId);
  const shortcutOpen = state.openedGateIds.includes(spec.shortcutId);
  return [
    platform(spec, `${spec.prefix}-starter`, layout.starter, "one-way"),
    platform(spec, `${spec.prefix}-upper-floor`, layout.upperFloor),
    platform(spec, `${spec.prefix}-module-plinth`, {
      x: layout.module.x - 10,
      y: layout.module.y + layout.module.height - 12,
      width: layout.module.width + 20,
      height: 12,
    }, "one-way"),
    // The vault has a continuous underside even before its elevated bridge
    // deploys. Otherwise a boosted jump from the story floor enters behind
    // the closed gate through the empty bridge span.
    platform(spec, `${spec.prefix}-vault-underfloor`, {
      x: layout.gate.x + layout.gate.width,
      y: layout.vaultFloorY,
      width: layout.vaultFloor.x - layout.gate.x - layout.gate.width,
      height: layout.vaultFloor.height,
    }),
    platform(spec, `${spec.prefix}-vault-floor`, layout.vaultFloor),
    platform(spec, `${spec.prefix}-relic-plinth`, {
      x: layout.secret.x - 10,
      y: layout.secret.y + layout.secret.height - 12,
      width: layout.secret.width + 20,
      height: 12,
    }, "one-way"),
    platform(spec, `${spec.prefix}-outer-wall`, layout.outerWall),
    ...(gateOpen
      ? [platform(spec, `${spec.prefix}-deployed-route`, layout.bridge, "one-way")]
      : [platform(spec, spec.gateId, layout.gate)]),
    ...(!shortcutOpen ? [platform(spec, spec.shortcutId, layout.hatch)] : []),
  ];
}

export function expansionRegionClimbables(
  missionId: unknown,
  progress: ExplorationProgress,
): WorldClimbable[] {
  const spec = expansionExplorationSpec(missionId);
  if (!spec || !normalizeExplorationProgress(progress).openedGateIds.includes(spec.shortcutId)) {
    return [];
  }
  const { layout } = spec;
  return [{
    ...layout.returnClimbable,
    id: `${spec.prefix}-return-${spec.climbableKind}`,
    kind: spec.climbableKind,
    routeId: spec.routeId,
    climbSpeedMultiplier: spec.climbableKind === "chain" ? 0.86 : 1.02,
    staminaPerSecond: spec.climbableKind === "vine" ? 3 : 1,
    dismounts: [
      { x: layout.hatch.x - 70, y: layout.vaultFloorY },
      { x: layout.hatch.x + layout.hatch.width + 16, y: 624 },
    ],
  }];
}

export function expansionRegionHazards(
  missionId: unknown,
  progress: ExplorationProgress,
): WorldHazard[] {
  const spec = expansionExplorationSpec(missionId);
  if (!spec || normalizeExplorationProgress(progress).abilityIds.includes(spec.abilityId)) {
    return [];
  }
  const cyclic = spec.biome !== "swamp" && spec.biome !== "fungal";
  return [{
    ...spec.layout.hazard,
    id: `${spec.prefix}-ability-hazard`,
    kind: spec.hazardKind,
    routeId: spec.routeId,
    damagePerSecond: spec.biome === "volcano" ? 24 : spec.biome === "ruins" ? 20 : 12,
    movementMultiplier: spec.biome === "ocean" ? 0.46 : 0.7,
    noisePerSecond: spec.biome === "fungal" ? 0.18 : 0.66,
    trackMultiplier: spec.biome === "swamp" ? 1.8 : 0.5,
    revealsCloak: spec.biome !== "desert",
    telegraphSeconds: cyclic ? 1 : 0,
    cycle: cyclic
      ? { periodSeconds: 6 + spec.layout.moduleFloorY / 200, activeSeconds: 1.6, phaseSeconds: 0.5 }
      : null,
  }];
}

function authoredRegionGeometry(id: string, spec: ExpansionRegionSpec): boolean {
  return id.startsWith(`${spec.prefix}-`) || id === spec.gateId || id === spec.shortcutId;
}

function overlapsReplacementSpan(entry: WorldRect, spec: ExpansionRegionSpec): boolean {
  return entry.x < spec.layout.replacementSpan.maxX
    && entry.x + entry.width > spec.layout.replacementSpan.minX
    && entry.y < 624;
}

/** Apply one authored optional branch while preserving the campaign floor beneath it. */
export function applyExpansionExplorationWorld(
  base: WorldBlueprint,
  progress: ExplorationProgress,
): WorldBlueprint {
  const spec = expansionExplorationSpec(base.missionId);
  if (!spec) return base;
  const keep = (entry: WorldRect & { id: string }) =>
    !authoredRegionGeometry(entry.id, spec) && !overlapsReplacementSpan(entry, spec);
  const platforms = [
    ...base.platforms.filter(keep),
    ...expansionRegionPlatforms(spec.missionId, progress),
  ];
  const climbables = [
    ...base.climbables.filter(keep),
    ...expansionRegionClimbables(spec.missionId, progress),
  ];
  const hazards = [
    ...base.hazards.filter(keep),
    ...expansionRegionHazards(spec.missionId, progress),
  ];
  const branchWaypointIds = [...platforms, ...climbables, ...hazards]
    .filter((entry) => entry.routeId === spec.routeId)
    .map((entry) => entry.id);
  const advantages = spec.biome === "swamp" || spec.biome === "fungal"
    ? ["stealth", "tracking"] as const
    : spec.biome === "desert" || spec.biome === "ocean"
      ? ["speed", "high-ground"] as const
      : ["high-ground", "ambush"] as const;
  return {
    ...base,
    platforms,
    climbables,
    hazards,
    covers: base.covers.filter(keep),
    routes: [
      ...base.routes.filter((route) => route.id !== spec.routeId),
      {
        id: spec.routeId,
        label: spec.copy.regionLabel,
        startX: spec.layout.replacementSpan.minX,
        endX: spec.layout.replacementSpan.maxX,
        waypointIds: branchWaypointIds,
        requirements: ["climb", "timed-hazard"],
        advantages,
        risk: spec.biome === "volcano" || spec.biome === "ruins" ? 3 : 2,
      },
    ],
  };
}

export interface ExpansionRegionInteraction {
  progress: ExplorationProgress;
  changed: boolean;
  message: string;
  event: "ability" | "gate" | "secret" | null;
}

/** Interaction is edge-driven by HuntCanvas; no held input can pay twice. */
export function interactWithExpansionRegion(
  missionId: unknown,
  progress: ExplorationProgress,
  body: WorldRect,
): ExpansionRegionInteraction | null {
  const spec = expansionExplorationSpec(missionId);
  if (!spec || !validBody(body)) return null;
  const state = normalizeExplorationProgress(progress);
  const { layout } = spec;
  const gateOpen = state.openedGateIds.includes(spec.gateId);
  const reply = (message: string): ExpansionRegionInteraction => ({
    progress: state, changed: false, message, event: null,
  });
  const unlock = (
    event: "ability" | "gate" | "secret",
    delta: Partial<ExplorationProgress>,
    message: string,
  ): ExpansionRegionInteraction => ({
    progress: mergeExplorationProgress(state, delta), changed: true, message, event,
  });

  const atModule = onFloor(body, layout.moduleFloorY) && near(body, layout.module);
  const atGate = onFloor(body, layout.moduleFloorY)
    && horizontalDistance(body, layout.gate) <= 44;
  if (atModule && !state.abilityIds.includes(spec.abilityId)) {
    if (!state.abilityIds.includes("aerial-boost")) {
      return reply("Branche facultative hors d’atteinte : l’impulsion aérienne de la jungle est requise.");
    }
    return unlock("ability", { abilityIds: [spec.abilityId] }, spec.copy.acquireMessage);
  }
  if (atGate) {
    if (!state.abilityIds.includes(spec.abilityId)) {
      return reply(`${spec.copy.gateLabel} : ${spec.copy.abilityLabel.toLocaleLowerCase("fr")} requise.`);
    }
    return gateOpen
      ? reply(`${spec.copy.gateLabel} déjà neutralisé.`)
      : unlock("gate", { openedGateIds: [spec.gateId] }, spec.copy.gateMessage);
  }
  if (atModule) return reply(`${spec.copy.abilityLabel} déjà installée.`);
  if (!onFloor(body, layout.vaultFloorY)) return null;
  const atSecret = near(body, layout.secret, 28);
  const atHatch = horizontalDistance(body, layout.hatch) <= 18;
  if (atSecret && !state.secretIds.includes(spec.secretId)) {
    if (!gateOpen) return reply(`${spec.copy.gateLabel} doit d’abord être neutralisé.`);
    return unlock("secret", { secretIds: [spec.secretId] }, spec.copy.secretMessage);
  }
  if (atHatch) {
    if (!gateOpen) return reply(`${spec.copy.gateLabel} doit d’abord être neutralisé.`);
    if (!state.abilityIds.includes(spec.shortcutRequirement)) {
      const originLabel = isExpansionExplorationMission(spec.shortcutOriginMissionId)
        ? EXPANSION_EXPLORATION_SPECS[spec.shortcutOriginMissionId].copy.regionLabel
        : "une chasse ultérieure";
      return reply(`${spec.copy.shortcutLabel} verrouillé : capacité issue de ${originLabel} requise.`);
    }
    return state.openedGateIds.includes(spec.shortcutId)
      ? reply(`${spec.copy.shortcutLabel} déjà ouvert.`)
      : unlock("gate", { openedGateIds: [spec.shortcutId] }, spec.copy.shortcutMessage);
  }
  if (atSecret) return reply(`${spec.copy.secretLabel} déjà récupéré.`);
  return null;
}

export function expansionRegionHint(
  missionId: unknown,
  progress: ExplorationProgress,
  body: WorldRect,
): string | null {
  const spec = expansionExplorationSpec(missionId);
  if (!spec || !validBody(body)) return null;
  const state = normalizeExplorationProgress(progress);
  const { layout } = spec;
  if (onFloor(body, layout.moduleFloorY) && near(body, layout.module)) {
    return state.abilityIds.includes(spec.abilityId)
      ? `${spec.copy.abilityLabel} installée : ${spec.copy.gateLabel.toLocaleLowerCase("fr")} à proximité.`
      : state.abilityIds.includes("aerial-boost")
        ? `Installer : ${spec.copy.abilityLabel}`
        : "Impulsion aérienne de la jungle requise avant cette installation facultative.";
  }
  if (onFloor(body, layout.moduleFloorY) && horizontalDistance(body, layout.gate) <= 44
    && !state.openedGateIds.includes(spec.gateId)) {
    return state.abilityIds.includes(spec.abilityId)
      ? spec.copy.gateLabel
      : `${spec.copy.gateLabel} verrouillé : ${spec.copy.abilityLabel.toLocaleLowerCase("fr")} requise`;
  }
  if (onFloor(body, layout.vaultFloorY)) {
    if (near(body, layout.secret, 28) && !state.secretIds.includes(spec.secretId)) {
      return state.openedGateIds.includes(spec.gateId)
        ? `Récupérer : ${spec.copy.secretLabel}`
        : `${spec.copy.gateLabel} doit d’abord être neutralisé.`;
    }
    if (horizontalDistance(body, layout.hatch) <= 18
      && !state.openedGateIds.includes(spec.shortcutId)) {
      if (!state.openedGateIds.includes(spec.gateId)) {
        return `${spec.copy.gateLabel} doit d’abord être neutralisé.`;
      }
      return state.abilityIds.includes(spec.shortcutRequirement)
        ? `Ouvrir le raccourci : ${spec.copy.shortcutLabel}`
        : `${spec.copy.shortcutLabel} : ${shortcutAbilityLabel(spec)} requise ; retour possible par le passage déjà ouvert.`;
    }
  }
  const room = expansionRegionRoomAt(
    missionId,
    body.x + body.width / 2,
    body.y + body.height / 2,
  );
  if (room?.id === `${spec.prefix}-approach`) {
    return state.abilityIds.includes("aerial-boost")
      ? `${spec.copy.regionLabel} : route facultative au-dessus du chemin principal.`
      : "Route haute hors d’atteinte. Le chemin principal reste ouvert.";
  }
  return null;
}

function shortcutAbilityLabel(spec: ExpansionRegionSpec): string {
  if (spec.shortcutRequirement === "aerial-boost") return "impulsion aérienne";
  const origin = Object.values(EXPANSION_EXPLORATION_SPECS)
    .find((candidate) => candidate.abilityId === spec.shortcutRequirement);
  return origin?.copy.abilityLabel.toLocaleLowerCase("fr") ?? "capacité de la chasse indiquée";
}

export interface ExpansionRegionMapSnapshot {
  missionId: ExpansionExplorationMissionId;
  title: string;
  entry: { opened: boolean; label: string };
  rooms: readonly {
    id: string;
    label: string | null;
    discovered: boolean;
    current: boolean;
  }[];
  locks: readonly {
    id: string;
    label: string;
    opened: boolean;
    requires: ExplorationAbilityId;
    originMissionId: MissionId;
  }[];
  secret: { id: string; label: string | null; recovered: boolean };
  objective: string;
  reminder: string;
  danger: string;
  apexTrace: string | null;
}

/** Serializable local-map data: undiscovered room and secret names stay hidden. */
export function expansionRegionMapSnapshot(
  missionId: unknown,
  progress: ExplorationProgress,
  playerX: number,
  playerY: number,
): ExpansionRegionMapSnapshot | null {
  const spec = expansionExplorationSpec(missionId);
  if (!spec) return null;
  const state = normalizeExplorationProgress(progress);
  const discovered = new Set(state.discoveredRoomIds);
  const current = expansionRegionRoomAt(missionId, playerX, playerY);
  const gateOpen = state.openedGateIds.includes(spec.gateId);
  const secretRecovered = state.secretIds.includes(spec.secretId);
  const hasBoost = state.abilityIds.includes("aerial-boost");
  const hasAbility = state.abilityIds.includes(spec.abilityId);
  const shortcutOpen = state.openedGateIds.includes(spec.shortcutId);
  const vaultDiscovered = discovered.has(`${spec.prefix}-vault`);
  return {
    missionId: spec.missionId,
    title: spec.copy.regionLabel,
    entry: { opened: hasBoost, label: "Impulsion aérienne de la jungle" },
    rooms: spec.rooms.map((room) => ({
      id: room.id,
      label: discovered.has(room.id) ? room.label : null,
      discovered: discovered.has(room.id),
      current: room.id === current?.id,
    })),
    locks: [
      {
        id: spec.gateId,
        label: spec.copy.gateLabel,
        opened: gateOpen,
        requires: spec.abilityId,
        originMissionId: spec.missionId,
      },
      {
        id: spec.shortcutId,
        label: spec.copy.shortcutLabel,
        opened: shortcutOpen,
        requires: spec.shortcutRequirement,
        originMissionId: spec.shortcutOriginMissionId,
      },
    ],
    secret: {
      id: spec.secretId,
      // Opening the gate happens before the hunter enters the vault. Keep the
      // trophy identity and Apex clue concealed until that room is actually
      // visited (a recovered trophy remains visible for legacy saves).
      label: vaultDiscovered || secretRecovered ? spec.copy.secretLabel : null,
      recovered: secretRecovered,
    },
    objective: !hasAbility
      ? hasBoost ? spec.copy.moduleLabel : "Revenir avec l’impulsion aérienne de la jungle ; branche facultative"
      : !gateOpen ? spec.copy.gateLabel
        : !vaultDiscovered ? "Explorer la chambre au-delà du passage"
          : !secretRecovered ? spec.copy.secretLabel
            : shortcutOpen ? "Branche explorée ; reprendre la chasse sur le chemin principal"
              : state.abilityIds.includes(spec.shortcutRequirement) ? spec.copy.shortcutLabel
                : `Reprendre la chasse ; revenir avec ${shortcutAbilityLabel(spec)} pour le raccourci`,
    reminder: spec.copy.abilityLabel,
    danger: hasAbility ? `Neutralisé : ${spec.copy.hazardLabel}` : spec.copy.hazardLabel,
    apexTrace: vaultDiscovered ? spec.copy.apexTrace : null,
  };
}
