"use client";

/* eslint-disable @next/next/no-img-element */

import React, {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import HunterRigPreview from "./HunterRigPreview";
import { GAME_CONTENT_VERSION, GAME_CONTENT_LABEL } from "./buildInfo";
import { COMPLETE_ARCHIVE_FORMAT, COMPLETE_ARCHIVE_MAX_BYTES, createCompleteArchive, parseCompleteArchive, prepareCompleteArchiveImport, importCompleteArchive, completeArchiveSummary, type CompleteArchiveImportPlan } from "./systems/completeArchive";
import { ARCHIVE_TRANSFER_JOURNAL_KEY } from "./systems/archiveTransferGuard";
import { recoverArchiveTransaction, withArchiveTransferLock } from "./systems/archiveTransaction";
import { useMenuGamepad } from "./useMenuGamepad";
import type {
  PitMatchCompleteResult,
  PitMatchPersistenceAck,
  PitRunTransition,
  PitStoredCircuitRuns,
  PitStoredDescentRuns,
} from "./PitCanvas";
import { matchesControlAction } from "./systems/controlBindings";
import { normalizePitReplay, type PitReplay } from "./systems/pitReplay";
import {
  clearPitReplayArchive,
  createPitReplayArchive,
  loadPitReplayArchive,
  withLatestPitReplay,
  writePitReplayArchive,
} from "./systems/pitReplayStorage";
import {
  applyPitResult,
  clearPitSave,
  createPitSave,
  getPitCircuitRun,
  getPitDescentRun,
  loadPitSave,
  persistPitCircuitRun,
  persistPitDescentRun,
  pitSaveStorageKey,
  replacePitCircuitRun,
  replacePitDescentRun,
  writePitSave,
  type PitMatchResult,
  type PitSaveV5,
} from "./systems/pitSave";
import { PIT_FIRST_EDITION_FIGHTER_IDS } from "./systems/pitFirstEdition";
import V6AtlasSprite from "./V6AtlasSprite";
import {
  DEFAULT_SHIP_ID,
  type ShipId,
} from "./shipCatalogue";
import {
  ECOLOGY_V8_BOSS_ENEMY_IDS,
  ecologyV8EnemyForId,
} from "./ecologyV8";
import {
  enemyV7IdsForMission,
  isEnemyV7RosterEncounter,
} from "./enemyRosterV7";
import { backgroundPathForBiome } from "./worldScreens";
import {
  createGalaxyNavigationState,
  type GalaxyNavigationState,
} from "./galaxyNavigation";
import {
  referencePresetForCatalogueEntry,
  type CataloguePlayableSelection,
} from "./catalogueAppearance";
import type {
  CatalogueStableId,
  CatalogueYautjaEntry,
} from "./catalogueRoster";
import type {
  TrophyWorkshopAction,
  TrophyWorkshopResult,
} from "./systems/trophyWorkshop";
import {
  V6_ALL_VISUAL_IDS,
  V6_ARMORY_RACK_ORDER,
  V6_GEAR_VISUAL_BY_ID,
  V6_LASER_VISUAL_BY_COLOR_ID,
  V6_MASK_VISUAL_BY_ID,
  V6_PLASMA_CASTER_ASSEMBLY,
  V6_PREY_GALLERY_ORDER,
  V6_RANK_AND_CASTE_ORDER,
  V6_RANK_VISUAL_BY_ID,
  V6_SHIP_VISUAL_BY_ROLE,
  V6_VISUAL_CELLS,
  V6_WEAPON_VISUAL_BY_ID,
  resolveV6TrophyVisualId,
  type V6VisualId,
} from "./v6Visuals";
import {
  HUNTER_EXPANDED_PRESETS,
  HUNTER_FILM_GROUPS,
  HUNTER_PRESET_BY_ID,
  HUNTER_PRESETS,
  appearanceForPreset,
  hunterFilmPlatePath,
  loadoutForPreset,
  playableKitForPreset,
  type HunterLorePresetId,
  type HunterMedia,
  type HunterPresetDefinition,
} from "./hunterLore";
import {
  HUNTER_ASSET_ROOT_V3,
  hunterBodyFullPath,
  hunterMaskThumbnailPath,
} from "./hunterVisuals";
import {
  getHunterKitAsset,
  listHunterKitAssets,
  resolveHunterKitAsset,
  type HunterKitResolveRequest,
} from "./hunterKitRegistry";
import {
  FRANCHISE_TROPHY_ARCHIVE_ASSETS,
  FRANCHISE_TROPHY_MANIFEST_SUMMARY,
  franchiseTrophyContinuityLabel,
  franchiseTrophyEvidenceLabel,
  franchiseTrophyMediumLabel,
} from "./franchiseTrophyRegistry";
import {
  enemyTrophyGameplayForDefinitionId,
  enemyTrophyGameplayForEnemyId,
} from "./enemyTrophyGameplayV18";
import { trophyWallVisualForDefinitionId } from "./trophyVisualRegistry";
import {
  ARMORS,
  CODEX_ENTRIES,
  DIFFICULTIES,
  GEAR,
  MISSIONS,
  WEAPONS,
} from "./data";
import {
  applyMissionResult,
  defaultSave,
  loadSaveWithStatus,
  exportSave,
  parseSaveImport,
  importSaveWithStatus,
  replaceSaveWithStatus,
  type SaveLoadFailure,
  type SaveWriteFailure,
  type SaveWriteResult,
  normalizeSave,
  reconcileSaveWrite,
  writeSaveWithStatus,
} from "./save";
import {
  GameAudio,
  type GameAudioBiome,
  type GameMusicContext,
  type GameSfxId,
} from "./sound";
import {
  effectiveArmorStats,
  effectiveGearStats,
  effectiveWeaponStats,
  purchaseUpgrade,
  quoteUpgrade,
  type UpgradePurchaseRequest,
  type UpgradeQuote,
} from "./systems/arsenal";
import {
  explorationBonuses,
  explorationForMission,
  isExplorationMission,
  mergeExplorationProgress,
} from "./systems/explorationProgress";
import {
  loadShipProgression,
  resetShipProgressionWithStatus,
} from "./systems/progression";
import {
  ACTIVE_HUNT_RUNTIME_REVISION,
  ACTIVE_HUNT_SAVE_VERSION,
  checkActiveHuntCompatibility,
  claimActiveHuntSave,
  clearActiveHuntSave,
  loadActiveHuntSave,
  writeActiveHuntSave,
  type ActiveHuntSaveV1,
  type JsonObject,
} from "./systems/activeHuntSave";
import type {
  ArmorId,
  ArmorTintId,
  BiomaskId,
  DifficultyId,
  DreadStyleId,
  DreadTintId,
  ExplorationProgress,
  GameSettings,
  GearId,
  HunterAppearance,
  HunterArmorStyleId,
  HunterBodyMorphId,
  HunterSkinId,
  LaserColorId,
  Loadout,
  MissionDefinition,
  MissionResult,
  SaveGame,
  WeaponId,
} from "./types";

import { recordGlassDesertExpedition, type HomeworldProgress, type HomeworldService } from "./systems/homeworld";
import type { GlassDesertProof } from "./systems/glassDesert";

import { advanceJusticeTime, applyJusticeAction, getJusticeStatus, getJusticeRouteControl, type JusticeProgress, type JusticeJurisdictionId } from "./systems/justice";

import { normalizeHomeworldExpeditionProof, type HomeworldExpeditionProof } from "./systems/homeworldExpedition";

const HomeworldExpedition = React.lazy(() => import("./HomeworldExpedition"));
const GlassDesertExpedition = React.lazy(() => import("./GlassDesertExpedition"));
const JusticePanel = React.lazy(() => import("./JusticePanel"));
const HomeworldHub = React.lazy(() => import("./HomeworldHub"));
const HuntCanvas = React.lazy(() => import("./HuntCanvas"));
const PitCanvas = React.lazy(() => import("./PitCanvas"));
const ShipHub = React.lazy(() => import("./ShipHub"));
const GalaxyMapPanel = React.lazy(() => import("./GalaxyMapPanel"));
const PhysicalShipDeck = React.lazy(() => import("./PhysicalShipDeck"));
const TrophyWorkshop = React.lazy(() => import("./TrophyWorkshop"));
const EnemyBestiaryV8 = React.lazy(() => import("./EnemyBestiaryV8"));
const CatalogueHunterBrowser = React.lazy(() =>
  import("./CatalogueHunterBrowser").then((module) => ({
    default: module.CatalogueHunterBrowser,
  })),
);
const ControlBindingsPanel = React.lazy(
  () => import("./ControlBindingsPanel"),
);

type Screen =
  | "title"
  | "ship"
  | "deck"
  | "homeworld"
  | "homeworld-expedition"
  | "glass-desert-expedition"
  | "justice"
  | "medbay"
  | "training"
  | "pit"
  | "map"
  | "armory"
  | "customization"
  | "trophies"
  | "codex"
  | "briefing"
  | "mission"
  | "debrief"
  | "ending";

type MapReturnScreen = Extract<Screen, "ship" | "deck" | "homeworld">;
type StationScreen = Extract<
  Screen,
  "armory" | "customization" | "trophies" | "codex" | "medbay" | "training" | "justice"
>;
type StationReturnScreen = Extract<Screen, "ship" | "deck" | "briefing" | "homeworld">;

const STABLE_BOOT_TIME = "2026-07-18T00:00:00.000Z";

interface RewardSummary {
  honor: number;
  clanMarks: number;
}

interface HuntPersistencePayload {
  snapshot: JsonObject;
  retryCheckpoint: JsonObject | null;
  elapsed: number;
}

interface ActiveHuntSession {
  ownerSaveCreatedAt: string;
  missionId: string;
  difficultyId: DifficultyId;
  encounterRun: number;
  runId: string;
  sequence: number;
  startedAt: string;
  configuration: JsonObject;
  lastPersisted: ActiveHuntSaveV1 | null;
  lastAttempted: ActiveHuntSaveV1 | null;
}

interface HuntResumePayload {
  snapshot: JsonObject;
  retryCheckpoint: JsonObject | null;
}

/** Main-save exploration never changes the hunt owner or consumes an attempt. */
function explorationWriteFailure(
  session: ActiveHuntSession,
  campaign: SaveGame,
  latest: ReturnType<typeof loadActiveHuntSave>,
): SaveWriteFailure | null {
  if (!isExplorationMission(session.missionId)) return "save-conflict";
  const progress = campaign.missionProgress[session.missionId];
  if (campaign.createdAt !== session.ownerSaveCreatedAt || !progress ||
      progress.attempts !== session.encounterRun || progress.status === "locked") {
    return "save-conflict";
  }
  if (latest.failure) {
    if (latest.failure === "storage-unavailable") return "storage-unavailable";
    if (latest.failure === "read-failed") return "read-failed";
    return "protected-save";
  }
  const sidecar = latest.save;
  if (!sidecar) return session.lastPersisted === null ? null : "save-conflict";
  return sidecar.runId !== session.runId || sidecar.sequence !== session.sequence ||
    sidecar.ownerSaveCreatedAt !== session.ownerSaveCreatedAt ||
    sidecar.missionId !== session.missionId || sidecar.encounterRun !== session.encounterRun ||
    sidecar.difficultyId !== session.difficultyId || sidecar.startedAt !== session.startedAt
    ? "save-conflict" : null;
}

function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function huntConfiguration(save: SaveGame, elapsed = 0): JsonObject {
  return {
    inventory: save.inventory as unknown as JsonObject,
    loadout: save.loadout as unknown as JsonObject,
    appearance: save.appearance as unknown as JsonObject,
    visualOptions: {
      screenShake: save.settings.screenShake,
      reducedGore: save.settings.reducedGore,
      highContrastVision: save.settings.highContrastVision,
    },
    elapsedSeconds: Math.max(0, Number.isFinite(elapsed) ? elapsed : 0),
  };
}

function normalizeHuntConfiguration(
  baseSave: SaveGame,
  sidecar: ActiveHuntSaveV1,
): SaveGame | null {
  const configuration = sidecar.configuration;
  const inventory = configuration.inventory;
  const loadout = configuration.loadout;
  const appearance = configuration.appearance;
  const visualOptions = configuration.visualOptions;
  if (
    !isJsonObject(inventory) ||
    !isJsonObject(loadout) ||
    !isJsonObject(appearance) ||
    !isJsonObject(visualOptions) ||
    typeof visualOptions.screenShake !== "boolean" ||
    typeof visualOptions.reducedGore !== "boolean" ||
    typeof visualOptions.highContrastVision !== "boolean"
  ) {
    return null;
  }

  const normalized = normalizeSave({
    ...baseSave,
    inventory,
    loadout,
    appearance,
    settings: {
      ...baseSave.settings,
      difficultyId: sidecar.difficultyId,
      screenShake: visualOptions.screenShake,
      reducedGore: visualOptions.reducedGore,
      highContrastVision: visualOptions.highContrastVision,
    },
  });
  return normalized.settings.difficultyId === sidecar.difficultyId
    ? normalized
    : null;
}

function activeHuntElapsed(sidecar: ActiveHuntSaveV1): number {
  const elapsed = sidecar.configuration.elapsedSeconds;
  return typeof elapsed === "number" && Number.isFinite(elapsed)
    ? Math.max(0, elapsed)
    : 0;
}

function createHuntRunId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `hunt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function DeferredGameScreen() {
  return (
    <section className="screen loading-screen" aria-label="Chargement du jeu">
      <p className="loading-mark" role="status" aria-live="polite">
        Chargement de l’espace de jeu…
      </p>
    </section>
  );
}

const RANK_LABELS = {
  "young-blood": "Jeune Sang",
  blooded: "Blooded",
  elite: "Élite",
  elder: "Ancien",
} as const;

const DIFFICULTY_LABELS = Object.fromEntries(
  DIFFICULTIES.map((difficulty) => [difficulty.id, difficulty.name]),
) as Record<DifficultyId, string>;

const SKIN_OPTIONS: ReadonlyArray<{
  id: HunterSkinId;
  label: string;
  detail: string;
  swatch: string;
}> = [
  {
    id: "ochre-mottle",
    label: "Ocre moucheté",
    detail: "Peau chaude du chasseur de jungle",
    swatch: "#9b7247",
  },
  {
    id: "ashen-mottle",
    label: "Cendre froide",
    detail: "Pigmentation pâle des mondes gelés",
    swatch: "#7d8580",
  },
  {
    id: "dark-mottle",
    label: "Ombre profonde",
    detail: "Motifs sombres de traque nocturne",
    swatch: "#403a31",
  },
];

function resolveAvailableMaskRuntimeUrl(
  request: HunterKitResolveRequest,
): string | undefined {
  const resolution = resolveHunterKitAsset(request);
  return resolution?.asset.available
    ? resolution.asset.runtimeUrl
    : undefined;
}

const V14_FERAL_MASK_URL = resolveAvailableMaskRuntimeUrl({
  kind: "mask",
  assetId: "mask-feral-screen",
  presetId: "feral-hunter",
  familyId: "feral",
  approximationId: "mask-skull",
});
const V14_BOAR_MASK_URL = resolveAvailableMaskRuntimeUrl({
  kind: "mask",
  assetId: "mask-boar",
  presetId: "boar",
  familyId: "lost-tribe",
  approximationId: "mask-metal",
});
const V14_SNAKE_MASK_URL = resolveAvailableMaskRuntimeUrl({
  kind: "mask",
  assetId: "mask-snake",
  presetId: "snake",
  familyId: "lost-tribe",
  approximationId: "mask-metal",
});
const V14_FALCONER_MASK_URL = resolveAvailableMaskRuntimeUrl({
  kind: "mask",
  assetId: "mask-falconer",
  presetId: "falconer",
  familyId: "super-predator",
  approximationId: "mask-angular",
});

const MASK_OPTIONS: ReadonlyArray<{
  id: BiomaskId | null;
  label: string;
  detail: string;
  image?: string;
  preferImage?: boolean;
}> = [
  { id: null, label: "Visage découvert", detail: "Biomask retiré" },
  {
    id: "jungle",
    label: "Chasseur de jungle",
    detail: "Jungle Hunter, 1987",
    image: `${HUNTER_ASSET_ROOT_V3}/masks/jungle.webp`,
  },
  {
    id: "scar",
    label: "Scar",
    detail: "Young Blood, AVP",
    image: `${HUNTER_ASSET_ROOT_V3}/masks/scar.webp`,
  },
  {
    id: "elder",
    label: "Ancien",
    detail: "Ornement de haut rang du clan",
    image: `${HUNTER_ASSET_ROOT_V3}/masks/elder.webp`,
  },
  {
    id: "city",
    label: "City Hunter",
    detail: "Bronze urbain, 1990",
    image: `${HUNTER_ASSET_ROOT_V3}/masks/city.webp`,
  },
  {
    id: "celtic",
    label: "Celtic",
    detail: "Coque cérémonielle lourde",
    image: `${HUNTER_ASSET_ROOT_V3}/masks/celtic.webp`,
  },
  {
    id: "chopper",
    label: "Chopper",
    detail: "Profil Young Blood agressif",
    image: `${HUNTER_ASSET_ROOT_V3}/masks/chopper.webp`,
  },
  {
    id: "wolf",
    label: "Wolf",
    detail: "Masque de Cleaner endommagé",
    image: `${HUNTER_ASSET_ROOT_V3}/masks/wolf.webp`,
  },
  {
    id: "feral",
    label: "Feral",
    detail: "Crâne primitif de Prey",
    image:
      V14_FERAL_MASK_URL ??
      `${HUNTER_ASSET_ROOT_V3}/masks/feral.webp`,
    preferImage: true,
  },
  {
    id: "boar",
    label: "Boar",
    detail: "Lost Tribe, Predator 2",
    image: V14_BOAR_MASK_URL,
    preferImage: Boolean(V14_BOAR_MASK_URL),
  },
  {
    id: "snake",
    label: "Snake",
    detail: "Lost Tribe, Predator 2",
    image: V14_SNAKE_MASK_URL,
    preferImage: Boolean(V14_SNAKE_MASK_URL),
  },
  {
    id: "falconer",
    label: "Falconer",
    detail: "Super Predator, Predators",
    image: V14_FALCONER_MASK_URL,
    preferImage: Boolean(V14_FALCONER_MASK_URL),
  },
  {
    id: "berserker",
    label: "Berserker",
    detail: "Couronne sombre Super Predator",
    image: `${HUNTER_ASSET_ROOT_V3}/masks/berserker.webp`,
  },
  {
    id: "fugitive",
    label: "Fugitive",
    detail: "Segmentation tactique 2018",
    image: `${HUNTER_ASSET_ROOT_V3}/masks/fugitive.webp`,
  },
  {
    id: "dek",
    label: "Dek",
    detail: "Plaque minimale de Badlands",
    image: `${HUNTER_ASSET_ROOT_V3}/masks/dek.webp`,
  },
  {
    id: "enforcer",
    label: "Enforcer",
    detail: "Motif judiciaire des comics",
    image: `${HUNTER_ASSET_ROOT_V3}/masks/enforcer.webp`,
  },
];

const V14_EXACT_MASK_ASSETS = listHunterKitAssets({
  kind: "mask",
  status: "available",
});
const V14_FERAL_SPEARGUN = getHunterKitAsset("feral-speargun");

const DREAD_OPTIONS: ReadonlyArray<{
  id: DreadStyleId;
  label: string;
  detail: string;
  image: string;
}> = [
  {
    id: "classic",
    label: "Classiques",
    detail: "Mèches libres",
    image: `${HUNTER_ASSET_ROOT_V3}/dreads/classic.webp`,
  },
  {
    id: "ringed",
    label: "Annelées",
    detail: "Anneaux de métal réguliers",
    image: `${HUNTER_ASSET_ROOT_V3}/dreads/ringed.webp`,
  },
  {
    id: "braided",
    label: "Tressées",
    detail: "Tresses de combat",
    image: `${HUNTER_ASSET_ROOT_V3}/dreads/braided.webp`,
  },
  {
    id: "veteran",
    label: "Vétéran",
    detail: "Mèche épaisse et bagues usées",
    image: `${HUNTER_ASSET_ROOT_V3}/dreads/veteran.webp`,
  },
  {
    id: "elder",
    label: "Ancien",
    detail: "Longue mèche cendrée",
    image: `${HUNTER_ASSET_ROOT_V3}/dreads/elder.webp`,
  },
  {
    id: "temple",
    label: "Tempe",
    detail: "Mèche courte articulée",
    image: `${HUNTER_ASSET_ROOT_V3}/dreads/temple.webp`,
  },
  {
    id: "feral",
    label: "Primitive",
    detail: "Liens de peau brute",
    image: `${HUNTER_ASSET_ROOT_V3}/dreads/feral.webp`,
  },
  {
    id: "huntress",
    label: "Cérémonielle",
    detail: "Tresse à bandes rouges",
    image: `${HUNTER_ASSET_ROOT_V3}/dreads/huntress.webp`,
  },
];

const BODY_OPTIONS: ReadonlyArray<{
  id: HunterBodyMorphId;
  label: string;
  detail: string;
  image: string;
}> = [
  {
    id: "classic",
    label: "Classique",
    detail: "Athlétique, films 1987–2018",
    image: hunterBodyFullPath("classic"),
  },
  {
    id: "elder",
    label: "Elder",
    detail: "Large, âgé et cicatrisé",
    image: hunterBodyFullPath("elder"),
  },
  {
    id: "super",
    label: "Super",
    detail: "Masse Berserker et cyborg",
    image: hunterBodyFullPath("super"),
  },
  {
    id: "feral",
    label: "Feral",
    detail: "Longiligne et primitif",
    image: hunterBodyFullPath("feral"),
  },
  {
    id: "huntress",
    label: "Huntress",
    detail: "Morphologie étendue licenciée",
    image: hunterBodyFullPath("huntress"),
  },
  {
    id: "young",
    label: "Young Blood",
    detail: "Jeune chasseur plus petit",
    image: hunterBodyFullPath("young"),
  },
];

const ARMOR_STYLE_OPTIONS: ReadonlyArray<{
  id: HunterArmorStyleId;
  label: string;
  detail: string;
  image: string;
}> = [
  {
    id: "classic",
    label: "Jungle",
    detail: "Harnais bronze épars",
    image: `${HUNTER_ASSET_ROOT_V3}/armor/chest-classic.webp`,
  },
  {
    id: "city",
    label: "City",
    detail: "Cuivre asymétrique et trophées",
    image: `${HUNTER_ASSET_ROOT_V3}/armor/chest-city.webp`,
  },
  {
    id: "avp",
    label: "Young Blood",
    detail: "Cuirasse cérémonielle argent",
    image: `${HUNTER_ASSET_ROOT_V3}/armor/chest-avp.webp`,
  },
  {
    id: "super",
    label: "Super",
    detail: "Plaques rouges et noires",
    image: `${HUNTER_ASSET_ROOT_V3}/armor/chest-super.webp`,
  },
  {
    id: "feral",
    label: "Primitive",
    detail: "Os, fourrure et attaches brutes",
    image: `${HUNTER_ASSET_ROOT_V3}/armor/shoulder-feral.webp`,
  },
];

const PRESET_MEDIA_LABEL: Record<HunterMedia, string> = {
  film: "Film",
  "animated-film": "Animation",
  "video-game": "Jeu",
  comic: "Comic",
  novel: "Roman",
};

const DREAD_TINT_OPTIONS: ReadonlyArray<{
  id: DreadTintId;
  label: string;
  swatch: string;
}> = [
  { id: "obsidian", label: "Obsidienne", swatch: "#17181b" },
  { id: "umber", label: "Terre d’ombre", swatch: "#4b3428" },
  { id: "ashen", label: "Cendre", swatch: "#8a8881" },
];

const ARMOR_TINT_OPTIONS: ReadonlyArray<{
  id: ArmorTintId;
  label: string;
  swatch: string;
}> = [
  { id: "gunmetal", label: "Métal canon", swatch: "#75818a" },
  { id: "bronze", label: "Bronze du clan", swatch: "#98704b" },
  { id: "obsidian", label: "Obsidienne", swatch: "#272b31" },
];

const LASER_COLOR_OPTIONS: ReadonlyArray<{
  id: LaserColorId;
  label: string;
  detail: string;
  swatch: string;
}> = [
  { id: "crimson", label: "Crimson", detail: "Triple pointeur classique", swatch: "#ff302a" },
  { id: "electric", label: "Électrique", detail: "Optique de poursuite bleue", swatch: "#2989ff" },
  { id: "amber", label: "Ambre", detail: "Spectre des anciens", swatch: "#ffb12b" },
  { id: "violet", label: "Violet", detail: "Spectre nocturne", swatch: "#b847ff" },
  { id: "cyan", label: "Cryo-cyan", detail: "Contraste des mondes glacés", swatch: "#40efff" },
];

const TROPHY_WORKSHOP_ORDER = [
  "clean",
  "prepare",
  "display",
  "rite",
] as const satisfies readonly TrophyWorkshopAction[];

const TROPHY_WORKSHOP_LABELS: Readonly<Record<TrophyWorkshopAction, string>> = {
  clean: "Nettoyer",
  prepare: "Préparer",
  display: "Exposer",
  rite: "Rite du clan",
};

function missionBackground(mission: MissionDefinition): string {
  return backgroundPathForBiome(mission.biome);
}

function targetSprite(
  mission: MissionDefinition,
): { src: string; sheet: boolean } {
  const ecologyId = ECOLOGY_V8_BOSS_ENEMY_IDS[mission.id];
  const ecologyTarget = ecologyId ? ecologyV8EnemyForId(ecologyId) : null;
  if (ecologyTarget) return { src: ecologyTarget.sheetPath, sheet: true };
  if (mission.targetKind === "beast") {
    return { src: "/game/sprites/cryostalker.webp", sheet: false };
  }
  if (mission.targetKind === "yautja") {
    return { src: "/game/sprites/bad-blood.webp", sheet: false };
  }
  return { src: "/game/sprites/v4/commandante-vey.png", sheet: false };
}

function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.max(0, Math.floor(totalSeconds % 60));
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function gradeFor(score: number): string {
  if (score >= 95) return "S";
  if (score >= 80) return "A";
  if (score >= 65) return "B";
  if (score >= 50) return "C";
  return "D";
}

function qualityLabel(result: MissionResult): string {
  if (!result.trophyQuality) return "Aucun";
  return {
    worthy: "Digne",
    blooded: "Blooded",
    elite: "Élite",
    flawless: "Sans défaut",
  }[result.trophyQuality];
}

interface PitReplayHydrationResult {
  replay: PitReplay | null;
  diagnostic: string | null;
}

function hydratePitReplayForOwner(
  ownerSaveCreatedAt: string,
): PitReplayHydrationResult {
  const loaded = loadPitReplayArchive({ ownerSaveCreatedAt });
  if (!loaded.failure) {
    return {
      replay: loaded.archive?.latestReplay ?? null,
      diagnostic: null,
    };
  }
  if (loaded.failure === "corrupt-save") {
    return {
      replay: null,
      diagnostic: "Archive replay THE PIT corrompue détectée. Elle sera réparée sous verrou au prochain match.",
    };
  }
  if (loaded.failure === "incompatible-engine") {
    return {
      replay: null,
      diagnostic: "Archive replay THE PIT créée par un ancien moteur. Elle ne sera pas relue et sera remplacée sous verrou au prochain match.",
    };
  }
  const diagnostic = {
    "future-version": "Archive replay THE PIT d’une version plus récente préservée.",
    "owner-conflict": "Archive replay THE PIT liée à une autre campagne préservée.",
    "read-failed": "Archive replay THE PIT illisible ; aucun effacement tenté.",
    "storage-unavailable": "Archive replay THE PIT indisponible pour cette session.",
  }[loaded.failure];
  return { replay: null, diagnostic };
}

function pitRunSnapshots(pitSave: PitSaveV5): {
  circuitRuns: PitStoredCircuitRuns;
  descentRuns: PitStoredDescentRuns;
} {
  return {
    circuitRuns: Object.fromEntries(
      PIT_FIRST_EDITION_FIGHTER_IDS.map((fighterId) => [
        fighterId,
        getPitCircuitRun(pitSave, fighterId),
      ]),
    ) as PitStoredCircuitRuns,
    descentRuns: Object.fromEntries(
      PIT_FIRST_EDITION_FIGHTER_IDS.map((fighterId) => [
        fighterId,
        getPitDescentRun(pitSave, fighterId),
      ]),
    ) as PitStoredDescentRuns,
  };
}

interface PitWriteLockMessages {
  readonly busy: string;
  readonly unavailable: string;
  readonly unreadable: string;
  readonly replaced: string;
  readonly browser: string;
}

interface PitWriteLockOptions {
  readonly key: string;
  readonly operation: () => PitMatchPersistenceAck;
  readonly failed: (message: string) => PitMatchPersistenceAck;
  readonly notify: (message: string) => void;
  readonly messages: PitWriteLockMessages;
}

function withPitWriteLock({
  key,
  operation,
  failed,
  notify,
  messages,
}: PitWriteLockOptions): Promise<PitMatchPersistenceAck> {
  return new Promise<PitMatchPersistenceAck>((resolve) => {
    let settled = false;
    const settle = (acknowledgement: PitMatchPersistenceAck) => {
      if (settled) return;
      settled = true;
      resolve(acknowledgement);
    };
    const fail = (message: string) => {
      notify(message);
      settle(failed(message));
    };
    const execute = () => {
      try {
        settle(operation());
      } catch {
        fail(messages.browser);
      }
    };
    const runWithFallbackLease = (retriesRemaining = 50) => {
      if (typeof window === "undefined") {
        execute();
        return;
      }
      const lockKey = key + ".write-lock";
      const retryLease = (message: string) => {
        if (retriesRemaining > 0) {
          window.setTimeout(
            () => runWithFallbackLease(retriesRemaining - 1),
            50,
          );
        } else {
          fail(message);
        }
      };
      try {
        const storage = window.localStorage;
        const now = Date.now();
        let heldUntil = 0;
        try {
          const held = JSON.parse(storage.getItem(lockKey) ?? "null") as {
            expiresAt?: unknown;
          } | null;
          heldUntil =
            held && typeof held.expiresAt === "number" ? held.expiresAt : 0;
        } catch {
          heldUntil = 0;
        }
        if (heldUntil > now) {
          retryLease(messages.busy);
          return;
        }

        const token = createHuntRunId();
        storage.setItem(
          lockKey,
          JSON.stringify({ token, expiresAt: now + 2_000 }),
        );
        const claimed = JSON.parse(storage.getItem(lockKey) ?? "null") as {
          token?: unknown;
        } | null;
        if (claimed?.token !== token) {
          retryLease(messages.unavailable);
          return;
        }

        // localStorage has no atomic compare-and-set. Let simultaneous claimants
        // settle, then verify the winning token immediately before the write.
        window.setTimeout(() => {
          let stabilized: { token?: unknown } | null;
          try {
            stabilized = JSON.parse(storage.getItem(lockKey) ?? "null") as {
              token?: unknown;
            } | null;
          } catch {
            retryLease(messages.unreadable);
            return;
          }
          if (stabilized?.token !== token) {
            retryLease(messages.replaced);
            return;
          }
          try {
            execute();
          } finally {
            try {
              const latest = JSON.parse(storage.getItem(lockKey) ?? "null") as {
                token?: unknown;
              } | null;
              if (latest?.token === token) storage.removeItem(lockKey);
            } catch {
              // The short lease expires on its own if confirmation is unavailable.
            }
          }
        }, 25);
      } catch {
        fail(messages.unavailable);
      }
    };

    if (typeof navigator !== "undefined" && navigator.locks) {
      let callbackStarted = false;
      try {
        void navigator.locks
          .request("yautja-the-pit:" + key, () => {
            callbackStarted = true;
            execute();
          })
          .catch(() => {
            if (!callbackStarted) {
              runWithFallbackLease();
              return;
            }
            fail(messages.browser);
          });
      } catch {
        runWithFallbackLease();
      }
    } else {
      runWithFallbackLease();
    }
  });
}

export default function GameClient() {
  const [screen, setScreen] = useState<Screen>("title");
  const [huntMusicContext, setHuntMusicContext] = useState<GameMusicContext | null>("exploration");
  const [hubLocation, setHubLocation] = useState<"deck" | "homeworld">("deck");
  const [justiceReturnScreen, setJusticeReturnScreen] = useState<"deck" | "homeworld" | "map">("deck");
  const [justiceJurisdiction, setJusticeJurisdiction] = useState<JusticeJurisdictionId>("homeworld");
  const [pitReturnScreen, setPitReturnScreen] = useState<"deck" | "homeworld">("deck");
  const [save, setSave] = useState<SaveGame>(() =>
    defaultSave(STABLE_BOOT_TIME),
  );
  // Runtime discoveries and terminal callbacks may occur before React commits.
  // Update this ref alongside every local save so their unions never use stale state.
  const saveRef = useRef(save);
  const expeditionOwnerRef = useRef<string | null>(null);
  const [selectedMission, setSelectedMission] =
    useState<MissionDefinition | null>(null);
  const [galaxyNavigationState, setGalaxyNavigationState] =
    useState<GalaxyNavigationState>(createGalaxyNavigationState);
  const [selectedShipId, setSelectedShipId] =
    useState<ShipId>(DEFAULT_SHIP_ID);
  const [mapReturnScreen, setMapReturnScreen] =
    useState<MapReturnScreen>("deck");
  const [stationReturnScreen, setStationReturnScreen] =
    useState<StationReturnScreen>("deck");
  const [lastResult, setLastResult] = useState<MissionResult | null>(null);
  const [lastRewardSummary, setLastRewardSummary] =
    useState<RewardSummary | null>(null);
  const [lastPitReplay, setLastPitReplay] = useState<PitReplay | null>(null);
  const [pitUnlockedCosmeticIds, setPitUnlockedCosmeticIds] = useState<string[]>([]);
  const [pitCircuitRuns, setPitCircuitRuns] = useState<PitStoredCircuitRuns>({});
  const [pitDescentRuns, setPitDescentRuns] = useState<PitStoredDescentRuns>({});
  const [resumableHunt, setResumableHunt] =
    useState<ActiveHuntSaveV1 | null>(null);
  const [huntResumePayload, setHuntResumePayload] =
    useState<HuntResumePayload | null>(null);
  const [huntRuntimeSave, setHuntRuntimeSave] =
    useState<SaveGame | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [resetArmed, setResetArmed] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [saveFailure, setSaveFailure] = useState<SaveWriteFailure | null>(null);
  const [saveLoadIssue, setSaveLoadIssue] = useState<SaveLoadFailure | null>(null);
  const [importCandidate, setImportCandidate] = useState<SaveGame | null>(null);
  const [completeImportPlan, setCompleteImportPlan] = useState<CompleteArchiveImportPlan | null>(null);
  const [archiveRecoveryIssue, setArchiveRecoveryIssue] = useState<string | null>(null);
  const [archiveTransferBusy, setArchiveTransferBusy] = useState(false);
  const archiveSelectionRef = useRef(0);
  const [saveTransferMessage, setSaveTransferMessage] = useState<string | null>(null);
  const pendingTerminalRunRef = useRef<string | null>(null);
  const [pendingHuntResult, setPendingHuntResult] = useState<{ result: MissionResult; returnToDeck: boolean } | null>(null);
  const [previewMaskWorn, setPreviewMaskWorn] = useState(true);
  const [previewGauntletOpen, setPreviewGauntletOpen] = useState(false);
  const [previewBladesExtended, setPreviewBladesExtended] = useState(false);
  const [previewAiming, setPreviewAiming] = useState(false);
  const [selectedCatalogueEntryId, setSelectedCatalogueEntryId] =
    useState<CatalogueStableId | null>(null);
  const [trophyWorkshop, setTrophyWorkshop] = useState<{
    trophyId: string;
    trophyName: string;
    trophyImageUrl?: string;
    action: TrophyWorkshopAction;
  } | null>(null);
  const gameShellRef = useRef<HTMLElement | null>(null);
  const previousScreenRef = useRef<Screen>(screen);
  const audioRef = useRef<GameAudio | null>(null);
  const activeHuntSessionRef = useRef<ActiveHuntSession | null>(null);
  const activeHuntWriteFailureRef = useRef<string | null>(null);
  const settingsDialogRef = useRef<HTMLElement | null>(null);
  const stationDialogRef = useRef<HTMLDivElement | null>(null);
  const missionSettlementRef = useRef(false);
  const [quickAccessOpen, setQuickAccessOpen] = useState(false);
  const [briefingAtAirlock, setBriefingAtAirlock] = useState(false);
  const [shipDrillActive, setShipDrillActive] = useState(false);
  const shipStationOpen = screen === "ship" || screen === "map" ||
    screen === "briefing" || screen === "armory" || screen === "customization" ||
    screen === "trophies" || screen === "codex" || screen === "medbay" ||
    screen === "training" || screen === "justice";
  const deckVisible = screen === "deck" || (shipStationOpen && hubLocation === "deck");
  const homeworldMounted = screen === "homeworld" || (hubLocation === "homeworld" && (shipStationOpen || screen === "pit" || screen === "homeworld-expedition" || screen === "glass-desert-expedition"));
  const previousMasterVolumeRef = useRef(
    save.settings.masterVolume > 0 ? save.settings.masterVolume : 0.8,
  );

  // Charge la progression de l’appareil sans toucher à localStorage au SSR.
  useEffect(() => {
    let hydrationCancelled = false;
    const hydrationTask = window.setTimeout(async () => {
      try {
        if (window.localStorage.getItem(ARCHIVE_TRANSFER_JOURNAL_KEY) !== null) {
          const recovery = await withArchiveTransferLock(() => recoverArchiveTransaction(window.localStorage));
          if (hydrationCancelled) return;
          if (!recovery.acquired || recovery.value.status === "blocked") {
            setArchiveRecoveryIssue(recovery.acquired ? recovery.value.message : recovery.reason);
            return;
          }
          setSaveTransferMessage(recovery.value.message);
        }
      } catch {
        setArchiveRecoveryIssue("Impossible de vérifier le journal des archives. Aucune sauvegarde partielle ne sera chargée.");
        return;
      }
      if (hydrationCancelled) return;
      const loaded = loadSaveWithStatus();
      const loadedSave = loaded.save;
      saveRef.current = loadedSave;
      setSave(loadedSave);
      setSaveLoadIssue(loaded.failure);
      // Never discard a real hunt merely because its campaign could not be read.
      if (!loaded.loaded && loaded.failure) {
        setSaveFailure(loaded.failure === "storage-unavailable" ? "storage-unavailable" : "protected-save");
        return;
      }
      setSelectedShipId(loadShipProgression(loadedSave).selectedShipId);
      const replayHydration = hydratePitReplayForOwner(loadedSave.createdAt);
      setLastPitReplay(replayHydration.replay);
      if (replayHydration.diagnostic) setToast(replayHydration.diagnostic);
      const activeHuntResult = loadActiveHuntSave();
      const candidate = activeHuntResult.save;
      if (candidate) {
        const mission = MISSIONS.find(({ id }) => id === candidate.missionId);
        const progress = mission
          ? loadedSave.missionProgress[mission.id]
          : null;
        const allowedDifficultyIds = DIFFICULTIES.filter(
          ({ id }) => id !== "elder" || loadedSave.storyCompleted,
        ).map(({ id }) => id);
        const compatibility =
          mission && progress
            ? checkActiveHuntCompatibility(candidate, {
                ownerSaveCreatedAt: loadedSave.createdAt,
                encounterRun: progress.attempts,
                missionAvailable: progress.status !== "locked",
                allowedMissionIds: MISSIONS.map(({ id }) => id),
                allowedDifficultyIds,
              })
            : { compatible: false as const, reason: "mission" as const };
        const normalizedConfiguration = compatibility.compatible
          ? normalizeHuntConfiguration(loadedSave, candidate)
          : null;
        if (compatibility.compatible && normalizedConfiguration) {
          setResumableHunt(candidate);
        }
      }
      // Hydration is read-only: an incompatible/future sidecar may belong to
      // another tab. Only an explicit new hunt, import or reset can replace it.
    }, 0);
    const audio = new GameAudio();
    audioRef.current = audio;
    return () => {
      hydrationCancelled = true;
      window.clearTimeout(hydrationTask);
      audio.dispose();
      audioRef.current = null;
    };
  }, []);

  useEffect(() => {
    const archiveChanged = (event: StorageEvent) => {
      if (event.key === ARCHIVE_TRANSFER_JOURNAL_KEY && event.newValue !== null) {
        setArchiveRecoveryIssue("Une autre session importe ses archives. Ce jeu est suspendu pour ne pas réécrire les anciennes données ; reprenez après vérification.");
      }
    };
    window.addEventListener("storage", archiveChanged);
    return () => window.removeEventListener("storage", archiveChanged);
  }, []);

  useEffect(() => {
    audioRef.current?.setMix({
      master: save.settings.masterVolume,
      music: save.settings.musicVolume,
      effects: save.settings.effectsVolume,
      muted: save.settings.masterVolume === 0,
    });
  }, [
    save.settings.effectsVolume,
    save.settings.masterVolume,
    save.settings.musicVolume,
  ]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const ambience: GameAudioBiome | null =
      screen === "mission" && selectedMission
        ? selectedMission.biome
        : screen === "glass-desert-expedition" ? "desert"
        : screen === "homeworld-expedition" ? "volcano"
        : screen === "title"
          ? null
          : "ship";
    if (ambience) {
      void audio.startAmbience(ambience, { fadeSeconds: 0.8 });
    } else {
      audio.stopAmbience(0.55);
    }
  }, [screen, selectedMission]);

  useEffect(() => {
    const context: GameMusicContext | null = settingsOpen ? null
      : screen === "title" ? "menu"
      : screen === "mission" ? huntMusicContext
      : screen === "homeworld-expedition" || screen === "glass-desert-expedition" ? "exploration"
      : screen === "map" ? "galaxy"
      : screen === "pit" ? "combat"
      : hubLocation === "homeworld" && (screen === "homeworld" || shipStationOpen) ? "homeworld"
      : "ship";
    const apply = () => { void audioRef.current?.setMusicContext(document.hidden ? null : context, { fadeSeconds: 0.5 }); };
    apply();
    document.addEventListener("visibilitychange", apply);
    return () => document.removeEventListener("visibilitychange", apply);
  }, [screen, settingsOpen, huntMusicContext, hubLocation, shipStationOpen]);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [screen]);

  useEffect(() => {
    if (previousScreenRef.current === screen) return;
    previousScreenRef.current = screen;
    const frame = window.requestAnimationFrame(() => {
      const activeScreen = gameShellRef.current?.querySelector<HTMLElement>(
        ":scope > .screen",
      );
      const station = stationDialogRef.current;
      const focusTarget =
        station?.querySelector<HTMLElement>("[data-screen-focus]") ??
        station?.querySelector<HTMLElement>("h1, h2") ??
        station ??
        activeScreen?.querySelector<HTMLElement>("[data-screen-focus]") ??
        activeScreen?.querySelector<HTMLElement>("h1, h2");
      if (!focusTarget) return;
      if (!focusTarget.hasAttribute("tabindex")) {
        focusTarget.setAttribute("tabindex", "-1");
      }
      focusTarget.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [screen]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    if (!settingsOpen) return;
    const previouslyFocused =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const dialog = settingsDialogRef.current;
    const focusableSelector =
      'button:not(:disabled), select:not(:disabled), input:not(:disabled), [tabindex]:not([tabindex="-1"])';
    const focusables = () =>
      dialog
        ? Array.from(
            dialog.querySelectorAll<HTMLElement>(focusableSelector),
          )
        : [];
    const frame = window.requestAnimationFrame(() => {
      focusables()[0]?.focus();
    });
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      if (event.key === "Escape") {
        if (event.repeat) return;
        event.preventDefault();
        if (archiveTransferBusy) return;
        ++archiveSelectionRef.current;
        setImportCandidate(null); setCompleteImportPlan(null);
        setSettingsOpen(false);
        setResetArmed(false);
        return;
      }
      if (event.key !== "Tab") return;
      const controls = focusables();
      if (controls.length === 0) return;
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("keydown", onKeyDown);
      previouslyFocused?.focus();
    };
  }, [settingsOpen, archiveTransferBusy]);

  useEffect(() => {
    if (screen !== "deck" || settingsOpen) return;
    const onPause = (event: KeyboardEvent) => {
      if (event.repeat || event.defaultPrevented ||
        !matchesControlAction("hunt.pause", event, save.settings.controlBindings)) return;
      event.preventDefault();
      setSettingsOpen(true);
    };
    document.addEventListener("keydown", onPause);
    return () => document.removeEventListener("keydown", onPause);
  }, [screen, settingsOpen, save.settings.controlBindings]);

  // The ship remains mounted behind installations. Only the active dialog owns
  // keyboard focus; closing it releases the same avatar at the same station.
  useEffect(() => {
    if (!shipStationOpen || settingsOpen || trophyWorkshop) return;
    const dialog = stationDialogRef.current;
    if (!dialog) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      const nestedDialog = event.target instanceof Element
        ? event.target.closest('[role="dialog"]') : null;
      if (nestedDialog && nestedDialog !== dialog) return;
      if (event.key === "Escape") {
        event.preventDefault();
        setScreen(hubLocation);
      } else if (event.key === "Tab") {
        const controls = Array.from(dialog.querySelectorAll<HTMLElement>(
          'button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]',
        )).filter((element) => element.getClientRects().length > 0);
        const first = controls[0];
        const last = controls[controls.length - 1];
        if (!first || !last) { event.preventDefault(); dialog.focus(); return; }
        if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog)) {
          event.preventDefault(); last.focus();
        } else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialog)) {
          event.preventDefault(); first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [settingsOpen, shipStationOpen, trophyWorkshop, hubLocation]);

  const playSound = useCallback(
    (
      sound:
        | "ui"
        | "select"
        | "victory"
        | "defeat"
        | "trophy",
    ) => {
      const audio = audioRef.current;
      if (!audio) return;
      void audio.unlock();
      audio[sound]();
    },
    [],
  );

  const playGameplaySound = useCallback((sound: GameSfxId) => {
    const audio = audioRef.current;
    if (!audio) return;
    // Never queue an old shot behind a delayed autoplay unlock.
    void audio.unlock();
    audio.playSfx(sound);
  }, []);

  const reconcileHuntWrite = useCallback(() => {
    const latest = loadActiveHuntSave();
    const session = activeHuntSessionRef.current;
    // setItem can succeed before its confirmation read fails. Recognize only
    // this exact attempted payload, never an arbitrary newer sequence.
    if (session?.lastAttempted && latest.save &&
        JSON.stringify(latest.save) === JSON.stringify(session.lastAttempted)) {
      session.sequence = latest.save.sequence;
      session.lastPersisted = latest.save;
    }
    return latest;
  }, []);

  const persist = useCallback((next: SaveGame) => {
    if (next.createdAt === saveRef.current.createdAt) {
      next = { ...next, exploration: mergeExplorationProgress(saveRef.current.exploration, next.exploration) };
    }
    const session = activeHuntSessionRef.current;
    if (session && isExplorationMission(session.missionId)) {
      const failure = explorationWriteFailure(session, next, reconcileHuntWrite());
      if (failure) {
        setSaveFailure(failure);
        return next;
      }
    }
    if (pendingTerminalRunRef.current) {
      const latest = loadActiveHuntSave();
      const failure: SaveWriteFailure | null = latest.failure
        ? latest.failure === "storage-unavailable" ? "storage-unavailable" : "read-failed"
        : latest.save && latest.save.runId !== pendingTerminalRunRef.current ? "save-conflict" : null;
      if (failure) {
        // A deferred reward must still own its hunt when storage becomes usable.
        // Keep the local result exportable instead of invalidating a new run.
        saveRef.current = next;
        setSave(next);
        setSaveFailure(failure);
        return next;
      }
    }
    const result = writeSaveWithStatus(next);
    saveRef.current = result.save;
    setSave(result.save);
    setSaveFailure(result.failure);
    if (result.persisted && pendingTerminalRunRef.current) {
      clearActiveHuntSave({ expectedRunId: pendingTerminalRunRef.current });
      pendingTerminalRunRef.current = null;
    }
    return result.save;
  }, [reconcileHuntWrite]);

  const recordPitMatch = useCallback((
    result: PitMatchCompleteResult,
    nextCircuitRun?: Extract<
      PitRunTransition,
      { readonly kind: "circuit-persist" }
    >["run"],
  ): Promise<PitMatchPersistenceAck> => {
    const ownerSaveCreatedAt = saveRef.current.createdAt;
    const key = pitSaveStorageKey(ownerSaveCreatedAt);
    const recordedReplay = result.replay
      ? normalizePitReplay(result.replay)
      : null;
    if (recordedReplay) setLastPitReplay(recordedReplay);
    const outcome =
      result.winnerId === null
        ? "draw"
        : result.winnerId === result.leftId
          ? "victory"
          : "defeat";
    const matchResult: PitMatchResult = {
      id: result.resultId,
      mode: result.mode,
      outcome,
      fighterId: result.leftId,
      arenaId: result.arenaId,
      roundsWon: result.leftRoundsWon,
      roundsLost: result.rightRoundsWon,
      roundsDrawn: result.roundsDrawn,
      arcadeEncounterIndex: result.arcadeEncounterIndex,
      arcadeCompleted: result.arcadeCompleted,
      circuitFightIndex: result.circuitFightIndex,
      circuitCompleted: result.circuitCompleted,
      cosmeticRewardIds: result.cosmeticRewardIds,
      completedAt: new Date().toISOString(),
    };
    const resultLabel =
      outcome === "victory" ? "Victoire" : outcome === "defeat" ? "Défaite" : "Égalité";
    const failed = (message: string): PitMatchPersistenceAck => ({
      persisted: false,
      message,
    });

    const persistResult = (): PitMatchPersistenceAck => {
      for (let attempt = 0; attempt < 3; attempt += 1) {
        const loaded = loadPitSave({
          key,
          expectedOwnerSaveCreatedAt: ownerSaveCreatedAt,
        });
        if (loaded.failure) {
          if (loaded.failure === "read-failed" && attempt < 2) continue;
          const message = loaded.failure === "owner-conflict"
            ? "Archives THE PIT liées à une autre campagne : résultat non enregistré."
            : "Archives THE PIT indisponibles : résultat non enregistré.";
          setToast(message);
          return failed(message);
        }

        const current =
          loaded.save ?? createPitSave(ownerSaveCreatedAt, matchResult.completedAt);
        const resultApplication = applyPitResult(current, matchResult);
        let nextPitSave = resultApplication.save;
        let mutationApplied = resultApplication.applied;
        if (nextCircuitRun) {
          const runApplication = persistPitCircuitRun(
            nextPitSave,
            nextCircuitRun,
            matchResult.completedAt,
          );
          nextPitSave = runApplication.save;
          mutationApplied = mutationApplied || runApplication.applied;
        }
        if (!mutationApplied) {
          setPitUnlockedCosmeticIds([...nextPitSave.unlockedCosmeticIds]);
          if (nextCircuitRun) {
            const snapshots = pitRunSnapshots(nextPitSave);
            setPitCircuitRuns(snapshots.circuitRuns);
            setPitDescentRuns(snapshots.descentRuns);
          }
          setToast(resultLabel + " THE PIT déjà enregistrée · aucun doublon créé.");
          return { persisted: true };
        }
        const written = writePitSave(nextPitSave, {
          key,
          expectedOwnerSaveCreatedAt: ownerSaveCreatedAt,
        });
        if (written.persisted && written.save) {
          setPitUnlockedCosmeticIds([...written.save.unlockedCosmeticIds]);
          if (nextCircuitRun) {
            const snapshots = pitRunSnapshots(written.save);
            setPitCircuitRuns(snapshots.circuitRuns);
            setPitDescentRuns(snapshots.descentRuns);
          }
          setToast(resultLabel + " THE PIT enregistrée · aucun gain de campagne.");
          return { persisted: true };
        }
        if (
          attempt < 2 &&
          (written.failure === "stale-sequence" ||
            written.failure === "stale-revision" ||
            written.failure === "read-failed")
        ) {
          continue;
        }
        const message = "Résultat THE PIT non confirmé par le stockage local.";
        setToast(message);
        return failed(message);
      }
      const message = "Résultat THE PIT non confirmé après plusieurs tentatives.";
      setToast(message);
      return failed(message);
    };

    const persistReplay = () => {
      if (!recordedReplay) return;
      for (let attempt = 0; attempt < 3; attempt += 1) {
        const loaded = loadPitReplayArchive({ ownerSaveCreatedAt });
        if (
          loaded.failure === "corrupt-save" ||
          loaded.failure === "incompatible-engine"
        ) {
          const cleared = clearPitReplayArchive({ ownerSaveCreatedAt });
          if (!cleared.cleared) {
            setToast(
              loaded.failure === "incompatible-engine"
                ? "Replay THE PIT conservé en mémoire ; archive d'un ancien moteur non remplacée."
                : "Replay THE PIT conservé en mémoire ; archive corrompue non supprimée.",
            );
            return;
          }
        } else if (loaded.failure) {
          if (loaded.failure === "read-failed" && attempt < 2) continue;
          setToast("Replay THE PIT conservé en mémoire ; archive locale non confirmée.");
          return;
        }
        const current = loaded.archive ??
          createPitReplayArchive(ownerSaveCreatedAt, matchResult.completedAt);
        const next = withLatestPitReplay(
          current,
          recordedReplay,
          matchResult.completedAt,
        );
        const written = writePitReplayArchive(next, { ownerSaveCreatedAt });
        if (written.persisted) return;
        if (
          attempt < 2 &&
          (written.failure === "stale-revision" ||
            written.failure === "read-failed")
        ) {
          continue;
        }
        setToast("Replay THE PIT conservé en mémoire ; archive locale non confirmée.");
        return;
      }
    };

    const persistSafely = (): PitMatchPersistenceAck => {
      if (saveRef.current.createdAt !== ownerSaveCreatedAt) {
        const message = "La campagne active a changé : résultat THE PIT non enregistré.";
        setToast(message);
        return failed(message);
      }

      let acknowledgement: PitMatchPersistenceAck;
      try {
        acknowledgement = persistResult();
      } catch {
        const message = "Résultat THE PIT conservé à l’écran, mais son écriture a échoué.";
        setToast(message);
        acknowledgement = failed(message);
      }
      try {
        persistReplay();
      } catch {
        setToast("Replay THE PIT conservé en mémoire ; archive locale non confirmée.");
      }
      return acknowledgement;
    };

    return withPitWriteLock({
      key,
      operation: persistSafely,
      failed,
      notify: setToast,
      messages: {
        busy: "Résultat THE PIT en attente : une autre session écrit les archives.",
        unavailable: "Résultat THE PIT en attente : verrou local indisponible.",
        unreadable: "Résultat THE PIT en attente : verrou local illisible.",
        replaced: "Résultat THE PIT en attente : verrou local repris par une autre session.",
        browser: "Résultat THE PIT non confirmé par le verrou navigateur.",
      },
    });
  }, []);

  const recordPitRunTransition = useCallback((
    transition: PitRunTransition,
  ): Promise<PitMatchPersistenceAck> => {
    const ownerSaveCreatedAt = saveRef.current.createdAt;
    const key = pitSaveStorageKey(ownerSaveCreatedAt);
    const failed = (message: string): PitMatchPersistenceAck => ({
      persisted: false,
      message,
    });

    const persistTransition = (): PitMatchPersistenceAck => {
      if (saveRef.current.createdAt !== ownerSaveCreatedAt) {
        const message = "La campagne active a changé : route THE PIT non enregistrée.";
        setToast(message);
        return failed(message);
      }
      for (let attempt = 0; attempt < 3; attempt += 1) {
        const loaded = loadPitSave({
          key,
          expectedOwnerSaveCreatedAt: ownerSaveCreatedAt,
        });
        if (loaded.failure) {
          if (loaded.failure === "read-failed" && attempt < 2) continue;
          const message = loaded.failure === "owner-conflict"
            ? "Archives THE PIT liées à une autre campagne : route non enregistrée."
            : "Archives THE PIT indisponibles : route non enregistrée.";
          setToast(message);
          return failed(message);
        }

        const updatedAt = new Date().toISOString();
        const current = loaded.save ?? createPitSave(ownerSaveCreatedAt, updatedAt);
        try {
          const application = transition.kind === "circuit-persist"
            ? persistPitCircuitRun(current, transition.run, updatedAt)
            : transition.kind === "circuit-replace"
              ? replacePitCircuitRun(current, transition.run, updatedAt)
              : transition.kind === "descent-persist"
                ? persistPitDescentRun(current, transition.run, updatedAt)
                : replacePitDescentRun(current, transition.run, updatedAt);

          if (!application.applied) {
            const snapshots = pitRunSnapshots(application.save);
            setPitUnlockedCosmeticIds([...application.save.unlockedCosmeticIds]);
            setPitCircuitRuns(snapshots.circuitRuns);
            setPitDescentRuns(snapshots.descentRuns);
            return { persisted: true };
          }

          const written = writePitSave(application.save, {
            key,
            expectedOwnerSaveCreatedAt: ownerSaveCreatedAt,
          });
          if (written.persisted && written.save) {
            const snapshots = pitRunSnapshots(written.save);
            setPitUnlockedCosmeticIds([...written.save.unlockedCosmeticIds]);
            setPitCircuitRuns(snapshots.circuitRuns);
            setPitDescentRuns(snapshots.descentRuns);
            setToast(
              (transition.kind.startsWith("descent") ? "Descente" : "Circuit") +
                " THE PIT enregistré · aucun gain de campagne.",
            );
            return { persisted: true };
          }
          if (
            attempt < 2 &&
            (written.failure === "stale-sequence" ||
              written.failure === "stale-revision" ||
              written.failure === "read-failed")
          ) {
            continue;
          }
          const message = "Route THE PIT non confirmée par le stockage local.";
          setToast(message);
          return failed(message);
        } catch {
          const message = "Transition THE PIT incompatible avec la sauvegarde durable.";
          setToast(message);
          return failed(message);
        }
      }
      const message = "Route THE PIT non confirmée après plusieurs tentatives.";
      setToast(message);
      return failed(message);
    };

    return withPitWriteLock({
      key,
      operation: persistTransition,
      failed,
      notify: setToast,
      messages: {
        busy: "Route THE PIT en attente : une autre session écrit les archives.",
        unavailable: "Route THE PIT en attente : verrou local indisponible.",
        unreadable: "Route THE PIT en attente : verrou local illisible.",
        replaced: "Route THE PIT en attente : verrou local repris par une autre session.",
        browser: "Route THE PIT non confirmée par le verrou navigateur.",
      },
    });
  }, []);

  // City choices are acknowledged only after durable storage confirms the write.
  // A failed write must not announce a completed investigation or apply a reward.
  const pendingSocialWriteRef = useRef<{ attempt: SaveWriteResult; updateSerialized: string } | null>(null);
  const persistSocialProgress = useCallback((update: Partial<Pick<SaveGame, "homeworld" | "justice">>): boolean => {
    const current = saveRef.current;
    if (pendingTerminalRunRef.current) {
      setToast("Termine la sauvegarde du résultat de chasse avant de poursuivre le dossier.");
      return false;
    }
    const updateSerialized = JSON.stringify({ homeworld: update.homeworld, justice: update.justice });
    const pending = pendingSocialWriteRef.current;
    if (pending) {
      const recovered = reconcileSaveWrite(pending.attempt, current.createdAt);
      if (recovered.status === "refused") {
        if (pending.attempt.save.createdAt !== current.createdAt) pendingSocialWriteRef.current = null;
        setSaveFailure(recovered.failure);
        setToast("Sauvegarde précédente non confirmée : aucune autre progression n’a été remplacée. Réessaie après vérification de la campagne.");
        return false;
      }
      pendingSocialWriteRef.current = null;
      if (recovered.status === "confirmed") {
        saveRef.current = recovered.save;
        setSave(recovered.save);
        setSaveFailure(null);
        if (pending.updateSerialized === updateSerialized) return true;
        // This request was computed before the preceding write was confirmed.
        // Refresh the caller first; never overwrite that progress with old data.
        setToast("Sauvegarde précédente récupérée. Réessaie cette nouvelle action depuis le dossier actualisé.");
        return false;
      }
    }
    const next = { ...current, ...update };
    const session = activeHuntSessionRef.current;
    if (session && isExplorationMission(session.missionId)) {
      const failure = explorationWriteFailure(session, next, reconcileHuntWrite());
      if (failure) { setSaveFailure(failure); return false; }
    }
    const result = writeSaveWithStatus(next);
    setSaveFailure(result.failure);
    if (!result.persisted) {
      if (result.failure === "write-failed") pendingSocialWriteRef.current = { attempt: result, updateSerialized };
      return false;
    }
    saveRef.current = result.save;
    setSave(result.save);
    return true;
  }, [reconcileHuntWrite]);

  const persistHomeworldProgress = useCallback((homeworld: HomeworldProgress) =>
    persistSocialProgress({ homeworld }), [persistSocialProgress]);
  const persistJusticeProgress = useCallback((justice: JusticeProgress) =>
    persistSocialProgress({ justice }), [persistSocialProgress]);

  // The shared intervention clock advances only in active hubs/navigation.
  // It never erases a warrant and does not write once per animation frame.
  useEffect(() => {
    if (settingsOpen || !["deck", "homeworld", "map", "justice"].includes(screen)) return;
    const timer = window.setInterval(() => {
      const current = saveRef.current.justice;
      if (document.hidden || current.detention || current.intervention.cooldownTicks <= 0) return;
      persistJusticeProgress(advanceJusticeTime(current, 300));
    }, 5000);
    return () => window.clearInterval(timer);
  }, [screen, settingsOpen, persistJusticeProgress]);

  const go = useCallback(
    (next: Screen) => {
      void playSound("ui");
      if (next === "deck" || next === "ship") setHubLocation("deck");
      if (next === "homeworld") setHubLocation("homeworld");
      setScreen(next);
    },
    [playSound],
  );

  const openHomeworldExpedition = useCallback((regionId: "ash-marches" | "glass-desert" = "ash-marches") => {
    if (regionId === "glass-desert") {
      if (!saveRef.current.homeworld.expeditions["ash-marches"]) {
        setToast("Rapporte d’abord la preuve des Marches de Cendre avant de suivre la route du désert."); return;
      }
      expeditionOwnerRef.current = saveRef.current.createdAt;
      go("glass-desert-expedition"); return;
    }
    if (!saveRef.current.homeworld.evidenceIds.includes("suspect-trophy")) {
      setToast("Relève d’abord la marque du trophée au port."); return;
    }
    expeditionOwnerRef.current = saveRef.current.createdAt;
    go("homeworld-expedition");
  }, [go]);

  const completeHomeworldExpedition = useCallback((raw: HomeworldExpeditionProof) => {
    const proof = normalizeHomeworldExpeditionProof(raw);
    const current = saveRef.current;
    if (!proof || expeditionOwnerRef.current !== current.createdAt ||
        !current.homeworld.evidenceIds.includes("suspect-trophy")) {
      return { persisted: false, message: "Rapport ou propriétaire de campagne incompatible. Aucun progrès n’a été ajouté." };
    }
    const previous = current.homeworld.expeditions["ash-marches"];
    const report = previous ? { ...proof, secretFound: previous.secretFound || proof.secretFound, ticks: Math.min(previous.ticks, proof.ticks) } : proof;
    const persisted = persistHomeworldProgress({ ...current.homeworld, expeditions: { ...current.homeworld.expeditions, "ash-marches": report } });
    if (persisted) setToast("Rapport des Marches conservé : le convoi confirme le transfert suspect. Aucun trophée du convoi n’est attribué au chasseur.");
    return { persisted, message: persisted ? undefined : "Écriture non confirmée. Reste à la navette et réessaie ; le rapport n’est pas encore acquis." };
  }, [persistHomeworldProgress]);

  const completeGlassDesert = useCallback((proof: GlassDesertProof) => {
    const current = saveRef.current;
    if (expeditionOwnerRef.current !== current.createdAt) return { persisted: false, message: "Le propriétaire de campagne a changé. Aucun rapport ajouté." };
    const result = recordGlassDesertExpedition(current.homeworld, proof);
    if (!result.ok) return { persisted: false, message: result.message };
    // Even an identical revisit must confirm the current durable campaign.
    const persisted = persistHomeworldProgress(result.progress);
    if (persisted) setToast(result.message);
    return { persisted, message: persisted ? undefined : "Rapport non confirmé. Reste à la navette et réessaie la sauvegarde." };
  }, [persistHomeworldProgress]);

  const openPit = useCallback(() => {
    setPitReturnScreen(screen === "homeworld" || (shipStationOpen && hubLocation === "homeworld") ? "homeworld" : "deck");
    const ownerSaveCreatedAt = saveRef.current.createdAt;
    const loaded = loadPitSave({
      key: pitSaveStorageKey(ownerSaveCreatedAt),
      expectedOwnerSaveCreatedAt: ownerSaveCreatedAt,
    });
    if (loaded.save) {
      const snapshots = pitRunSnapshots(loaded.save);
      setPitUnlockedCosmeticIds([...loaded.save.unlockedCosmeticIds]);
      setPitCircuitRuns(snapshots.circuitRuns);
      setPitDescentRuns(snapshots.descentRuns);
    } else {
      setPitUnlockedCosmeticIds([]);
      setPitCircuitRuns({});
      setPitDescentRuns({});
    }
    if (loaded.failure) {
      setToast("Progression THE PIT indisponible ; les routes et palettes restent protégées.");
    }
    go("pit");
  }, [go, screen, shipStationOpen, hubLocation]);

  const openMap = useCallback(
    (returnScreen: MapReturnScreen) => {
      setHubLocation(returnScreen === "homeworld" ? "homeworld" : "deck");
      setMapReturnScreen(returnScreen);
      go("map");
    },
    [go],
  );

  const openStationScreen = useCallback(
    (next: StationScreen, returnScreen: StationReturnScreen) => {
      setHubLocation(returnScreen === "homeworld" ? "homeworld" : "deck");
      setStationReturnScreen(returnScreen);
      if (next === "justice") setJusticeReturnScreen(returnScreen === "homeworld" ? "homeworld" : "deck");
      go(next);
    },
    [go],
  );

  const openHomeworldService = useCallback((service: HomeworldService) => {
    if (service === "justice") setJusticeJurisdiction("homeworld");
    if (service === "pit") openPit();
    else openStationScreen(service, "homeworld");
  }, [openPit, openStationScreen]);

  const chooseMission = useCallback(
    (mission: MissionDefinition) => {
      if (save.missionProgress[mission.id].status === "locked") return;
      const justice = saveRef.current.justice;
      const control = getJusticeRouteControl(justice, "clan-core");
      if (justice.intervention.stage !== "none" || justice.detention || control.kind === "identity-check" || control.kind === "summons") {
        const jurisdiction = justice.detention?.jurisdictionId ?? justice.intervention.jurisdictionId ?? "clan-core";
        if (!justice.detention && justice.intervention.stage === "none") {
          const result = applyJusticeAction(justice, { type: "request-control", jurisdictionId: jurisdiction });
          if (!result.ok || result.changed && !persistJusticeProgress(result.progress)) return;
        }
        setJusticeJurisdiction(jurisdiction);
        setJusticeReturnScreen("map");
        setScreen("justice");
        setToast("Contrôle connu sur la route : identité, contestation, reddition ou route de repli. Le dossier reste distinct de la chasse.");
        return;
      }
      void playSound("select");
      setSelectedMission(mission);
      setBriefingAtAirlock(false);
      setScreen("briefing");
    },
    [playSound, save.missionProgress, persistJusticeProgress],
  );

  const clearHuntSession = useCallback(() => {
    reconcileHuntWrite();
    const session = activeHuntSessionRef.current;
    const result = session ? clearActiveHuntSave({ expectedRunId: session.runId, expectedSequence: session.sequence }) : { cleared: true, failure: null };
    activeHuntSessionRef.current = null;
    activeHuntWriteFailureRef.current = result.failure;
    setResumableHunt(null);
    setHuntResumePayload(null);
    setHuntRuntimeSave(null);
    return result.cleared;
  }, [reconcileHuntWrite]);

  const invalidateActiveHuntPersistence = useCallback(() => {
    reconcileHuntWrite();
    const session = activeHuntSessionRef.current;
    const result = session ? clearActiveHuntSave({ expectedRunId: session.runId, expectedSequence: session.sequence }) : { cleared: true, failure: null };
    if (session) session.lastPersisted = null;
    activeHuntWriteFailureRef.current = result.failure;
    setResumableHunt(null);
  }, [reconcileHuntWrite]);

  const rejectActiveHuntResume = useCallback(() => {
    clearHuntSession();
    setSelectedMission(null);
    setScreen("title");
    setToast("La reprise de chasse était corrompue et a été écartée.");
  }, [clearHuntSession]);

  const persistActiveHunt = useCallback(
    (payload: HuntPersistencePayload): ActiveHuntSaveV1 | null => {
      const session = activeHuntSessionRef.current;
      if (!session) return null;

      if (session.lastAttempted && session.lastAttempted.sequence > session.sequence) reconcileHuntWrite();
      const sequence = session.sequence + 1;
      const configuration: JsonObject = {
        ...session.configuration,
        elapsedSeconds: Math.max(
          0,
          Number.isFinite(payload.elapsed) ? payload.elapsed : 0,
        ),
      };
      session.configuration = configuration;
      const savedAt = new Date().toISOString();
      const result = writeActiveHuntSave({
        version: ACTIVE_HUNT_SAVE_VERSION,
        runtimeRevision: ACTIVE_HUNT_RUNTIME_REVISION,
        ownerSaveCreatedAt: session.ownerSaveCreatedAt,
        missionId: session.missionId,
        difficultyId: session.difficultyId,
        encounterRun: session.encounterRun,
        runId: session.runId,
        sequence,
        startedAt: session.startedAt,
        savedAt,
        configuration,
        snapshot: payload.snapshot,
        retryCheckpoint: payload.retryCheckpoint,
      });
      if (result.persisted || result.failure === "write-failed") session.lastAttempted = result.save;
      activeHuntWriteFailureRef.current = result.failure;
      if (result.persisted && result.save) {
        session.sequence = sequence;
        session.lastPersisted = result.save;
      }
      if (result.failure === "stale-sequence" || result.failure === "stale-run" || result.failure === "protected-save") return null;
      return result.persisted ? result.save : session.lastPersisted;
    },
    [reconcileHuntWrite],
  );

  const launchMission = useCallback(() => {
    if (!selectedMission || save.missionProgress[selectedMission.id].status === "locked") return;
    // A sidecar can only survive a reload when its owning campaign snapshot is
    // durable too. Fresh profiles have not necessarily written the main save
    // yet, so establish that owner before the first hunt autosave.
    const runtimeWrite = writeSaveWithStatus(normalizeSave(save));
    const runtimeSave = runtimeWrite.save;
    if (!runtimeWrite.persisted) {
      saveRef.current = runtimeSave;
      setSave(runtimeSave);
      setSaveFailure(runtimeWrite.failure);
      activeHuntWriteFailureRef.current = runtimeWrite.failure;
      setToast("Impossible de sécuriser la progression : exportez-la ou rétablissez la sauvegarde avant de lancer une chasse.");
      return;
    }
    const now = new Date().toISOString();
    const clearResult = clearActiveHuntSave();
    if (!clearResult.cleared) {
      setToast("La chasse précédente n’a pas pu être libérée. Aucun nouveau départ n’a été lancé.");
      return;
    }
    setPendingHuntResult(null);
    missionSettlementRef.current = false;
    setLastResult(null);
    setLastRewardSummary(null);
    saveRef.current = runtimeSave;
    setSave(runtimeSave);
    setSaveFailure(runtimeWrite.failure);
    setResumableHunt(null);
    setHuntResumePayload(null);
    setHuntRuntimeSave(runtimeSave);
    activeHuntWriteFailureRef.current =
      runtimeWrite.failure ?? clearResult.failure;
    activeHuntSessionRef.current = runtimeWrite.persisted
      ? {
          ownerSaveCreatedAt: runtimeSave.createdAt,
          missionId: selectedMission.id,
          difficultyId: runtimeSave.settings.difficultyId,
          encounterRun: runtimeSave.missionProgress[selectedMission.id].attempts,
          runId: createHuntRunId(),
          sequence: 0,
          startedAt: now,
          configuration: huntConfiguration(runtimeSave),
          lastPersisted: null,
          lastAttempted: null,
        }
      : null;
    void playSound("select");
    setScreen("mission");
  }, [playSound, save, selectedMission]);

  const resumeActiveHunt = useCallback(() => {
    if (!resumableHunt) return;
    const latest = loadActiveHuntSave();
    if (!latest.save || latest.save.runId !== resumableHunt.runId || latest.save.sequence !== resumableHunt.sequence) {
      setResumableHunt(latest.save);
      setToast("La reprise a changé dans une autre session. Vérifiez la nouvelle proposition avant de reprendre.");
      return;
    }
    const mission = MISSIONS.find(({ id }) => id === resumableHunt.missionId);
    const progress = mission ? save.missionProgress[mission.id] : null;
    const allowedDifficultyIds = DIFFICULTIES.filter(
      ({ id }) => id !== "elder" || save.storyCompleted,
    ).map(({ id }) => id);
    const compatibility =
      mission && progress
        ? checkActiveHuntCompatibility(resumableHunt, {
            ownerSaveCreatedAt: save.createdAt,
            encounterRun: progress.attempts,
            missionAvailable: progress.status !== "locked",
            allowedMissionIds: MISSIONS.map(({ id }) => id),
            allowedDifficultyIds,
          })
        : { compatible: false as const, reason: "mission" as const };
    const runtimeSave = compatibility.compatible
      ? normalizeHuntConfiguration(save, resumableHunt)
      : null;
    if (!mission || !compatibility.compatible || !runtimeSave) {
      clearHuntSession();
      setToast("Cette reprise de chasse n’est plus compatible.");
      return;
    }

    const claimed = claimActiveHuntSave(resumableHunt, createHuntRunId());
    if (!claimed.persisted || !claimed.save) {
      setResumableHunt(loadActiveHuntSave().save);
      setToast("Reprise non confirmée : elle a changé dans une autre session ou le stockage est indisponible.");
      return;
    }
    const resumed = claimed.save;
    setPendingHuntResult(null);
    missionSettlementRef.current = false;
    activeHuntWriteFailureRef.current = null;
    activeHuntSessionRef.current = {
      ownerSaveCreatedAt: resumed.ownerSaveCreatedAt,
      missionId: resumed.missionId,
      difficultyId: resumed.difficultyId as DifficultyId,
      encounterRun: resumed.encounterRun,
      runId: resumed.runId,
      sequence: resumed.sequence,
      startedAt: resumed.startedAt,
      configuration: resumed.configuration,
      lastPersisted: resumed,
      lastAttempted: resumed,
    };
    setSelectedMission(mission);
    setHuntRuntimeSave(runtimeSave);
    setHuntResumePayload({
      snapshot: resumed.snapshot,
      retryCheckpoint: resumed.retryCheckpoint,
    });
    void playSound("select");
    setScreen("mission");
  }, [clearHuntSession, playSound, resumableHunt, save]);

  const suspendActiveHunt = useCallback(
    (payload: HuntPersistencePayload) => {
      const sidecar = persistActiveHunt(payload);
      const failure = activeHuntWriteFailureRef.current;
      if (!sidecar) {
        setToast(
          failure
            ? "Sauvegarde locale indisponible : la chasse reste ouverte en pause."
            : "Aucune reprise valide : la chasse reste ouverte en pause.",
        );
        return;
      }
      activeHuntSessionRef.current = null;
      setHuntResumePayload(null);
      setHuntRuntimeSave(null);
      setSelectedMission(null);
      setResumableHunt(sidecar);
      setToast(
        failure
          ? "Chasse suspendue. Le dernier autosave valide reste disponible."
          : "Chasse suspendue. La reprise est conservée sur cet appareil.",
      );
      setScreen("title");
    },
    [persistActiveHunt],
  );

  const checkHuntSessionForSettlement = useCallback(() => {
    const session = activeHuntSessionRef.current;
    if (!session) return false;
    const latest = reconcileHuntWrite();
    if (latest.failure === "read-failed" || latest.failure === "storage-unavailable") {
      activeHuntWriteFailureRef.current = latest.failure;
      setToast("Lecture des archives indisponible. Le résultat reste en attente de vérification sur cet écran.");
      return false;
    }
    const conflict = latest.save
      ? latest.save.runId !== session.runId || latest.save.sequence !== session.sequence
      : latest.failure === "future-version" || latest.failure === "invalid-save" ||
        (!latest.failure && session.lastPersisted !== null);
    if (!conflict) return true;
    // A superseded runtime must never settle rewards or retire its successor.
    setPendingHuntResult(null);
    activeHuntSessionRef.current = null;
    activeHuntWriteFailureRef.current = "stale-run";
    setHuntResumePayload(null);
    setHuntRuntimeSave(null);
    setSelectedMission(null);
    setResumableHunt(latest.save);
    setScreen("title");
    setToast("Cette chasse a été reprise ou modifiée ailleurs. Son ancienne session n’a pas remplacé la progression ; vérifiez la reprise actuelle.");
    return false;
  }, [reconcileHuntWrite]);

  const persistExplorationProgress = useCallback((progress: ExplorationProgress) => {
    const session = activeHuntSessionRef.current;
    if (!session || !isExplorationMission(session.missionId) || missionSettlementRef.current || pendingTerminalRunRef.current) return;
    const current = saveRef.current;
    const missionProgress = current.missionProgress[session.missionId];
    if (current.createdAt !== session.ownerSaveCreatedAt || !missionProgress ||
        missionProgress.attempts !== session.encounterRun || missionProgress.status === "locked") {
      setSaveFailure("save-conflict");
      return;
    }
    const exploration = mergeExplorationProgress(current.exploration, explorationForMission(session.missionId, progress));
    if (JSON.stringify(exploration) === JSON.stringify(current.exploration)) return;
    const next = { ...current, exploration };
    const failure = explorationWriteFailure(session, current, reconcileHuntWrite());
    if (failure) {
      // Transient storage failures retain discoveries in this tab. A superseded
      // owner/run must not inject its discoveries into the replacement campaign.
      if (failure === "read-failed" || failure === "storage-unavailable") {
        saveRef.current = next;
        setSave(next);
      }
      setSaveFailure(failure);
      return;
    }
    // Do not reload the campaign here: that would bless another tab's newer
    // bytes and defeat writeSaveWithStatus's optimistic concurrency check.
    const written = writeSaveWithStatus(next);
    if (written.persisted || written.failure === "write-failed" ||
        written.failure === "read-failed" || written.failure === "storage-unavailable") {
      saveRef.current = written.save;
      setSave(written.save);
    }
    setSaveFailure(written.failure);
  }, [reconcileHuntWrite]);

  const completeMission = useCallback(
    (result: MissionResult, returnToDeck = false) => {
      // Runtime callbacks can race at a terminal frame. Settle this run once.
      if (missionSettlementRef.current) return;
      if (!checkHuntSessionForSettlement()) {
        if (activeHuntSessionRef.current) setPendingHuntResult({ result, returnToDeck });
        return;
      }
      setPendingHuntResult(null);
      missionSettlementRef.current = true;
      const current = saveRef.current;
      const next = applyMissionResult(current, result);
      const written = writeSaveWithStatus(next);
      saveRef.current = written.save;
      setSave(written.save);
      setSaveFailure(written.failure);
      // Commit campaign rewards before retiring the recoverable hunt.
      if (written.persisted) {
        clearHuntSession();
      } else {
        pendingTerminalRunRef.current = activeHuntSessionRef.current?.runId ?? null;
        activeHuntSessionRef.current = null;
        setHuntResumePayload(null);
        setHuntRuntimeSave(null);
        setResumableHunt(null);
      }
      if (returnToDeck) {
        setLastResult(null);
        setLastRewardSummary(null);
        setSelectedMission(null);
        setScreen("deck");
        void playSound("ui");
        return;
      }
      setLastResult(result);
      setLastRewardSummary({
        honor: next.profile.honor - current.profile.honor,
        clanMarks: next.profile.clanMarks - current.profile.clanMarks,
      });
      setScreen(
        result.outcome === "success" &&
          !current.storyCompleted &&
          next.storyCompleted
          ? "ending"
          : "debrief",
      );
      void playSound(result.outcome === "success" ? "victory" : "defeat");
    },
    [checkHuntSessionForSettlement, clearHuntSession, playSound],
  );

  const updateSettings = useCallback(
    (patch: Partial<GameSettings>) => {
      persist({
        ...save,
        settings: {
          ...save.settings,
          ...patch,
        },
      });
    },
    [persist, save],
  );

  const selectArmor = useCallback(
    (armorId: ArmorId) => {
      if (!save.inventory.unlockedArmorIds.includes(armorId)) return;
      setSelectedCatalogueEntryId(null);
      persist({
        ...save,
        loadout: { ...save.loadout, armorId },
        appearance: { ...save.appearance, presetId: "custom" },
      });
      void playSound("select");
    },
    [persist, playSound, save],
  );

  const selectWeapon = useCallback(
    (weaponId: WeaponId) => {
      if (!save.inventory.unlockedWeaponIds.includes(weaponId)) return;
      setSelectedCatalogueEntryId(null);
      const secondary =
        weaponId === "wristblades"
          ? save.loadout.weaponIds.find((id) => id !== "wristblades") ??
            "combistick"
          : weaponId;
      persist({
        ...save,
        loadout: {
          ...save.loadout,
          weaponIds: ["wristblades", secondary],
        },
        appearance: { ...save.appearance, presetId: "custom" },
      });
      void playSound("select");
    },
    [persist, playSound, save],
  );

  const selectGear = useCallback(
    (gearId: GearId) => {
      if (!save.inventory.unlockedGearIds.includes(gearId)) return;
      setSelectedCatalogueEntryId(null);
      const other =
        save.loadout.gearIds.find((id) => id !== gearId) ?? "motion-sensor";
      persist({
        ...save,
        loadout: {
          ...save.loadout,
          gearIds: [gearId, other],
        },
        appearance: { ...save.appearance, presetId: "custom" },
      });
      void playSound("select");
    },
    [persist, playSound, save],
  );

  const purchaseEquipmentUpgrade = useCallback(
    (request: UpgradePurchaseRequest) => {
      const quote = quoteUpgrade(save, request);
      const itemName =
        request.domain === "weapon"
          ? WEAPONS.find(({ id }) => id === request.id)?.name
          : request.domain === "gear"
            ? GEAR.find(({ id }) => id === request.id)?.name
            : ARMORS.find(({ id }) => id === request.id)?.name;
      const label = itemName ?? "Équipement";

      if (!quote.canPurchase) {
        const message =
          quote.failure === "max-level"
            ? `${label} est déjà au niveau maximum.`
            : quote.failure === "insufficient-clan-marks"
              ? `${label} requiert ${quote.cost ?? 0} marques du clan.`
              : `${label} doit être déverrouillé avant son amélioration.`;
        setToast(message);
        return;
      }

      const result = purchaseUpgrade(save, request);
      if (!result.ok || result.newLevel === null) {
        setToast(`La forge n’a pas pu améliorer ${label}.`);
        return;
      }

      persist(result.save);
      setToast(
        `${label} · niveau ${result.newLevel}/2 acquis pour ${result.spentClanMarks} marques.`,
      );
      void playSound("select");
    },
    [persist, playSound, save],
  );

  const updateAppearance = useCallback(
    <Key extends keyof HunterAppearance>(
      key: Key,
      value: HunterAppearance[Key],
    ) => {
      const appearance: HunterAppearance = {
        ...save.appearance,
        [key]: value,
      };
      if (key !== "presetId") appearance.presetId = "custom";
      setSelectedCatalogueEntryId(null);
      persist({
        ...save,
        appearance,
      });
      void playSound("select");
    },
    [persist, playSound, save],
  );

  const applyShipLoadout = useCallback(
    (loadout: Loadout, appearance: HunterAppearance) => {
      setSelectedCatalogueEntryId(null);
      const persisted = persist({ ...save, loadout, appearance });
      setPreviewMaskWorn(persisted.appearance.biomaskId !== null);
      setToast(
        persisted.appearance.presetId === appearance.presetId
          ? "Configuration de chasse chargée."
          : "Configuration chargée comme chasseur personnalisé.",
      );
      void playSound("select");
    },
    [persist, playSound, save],
  );

  const selectHunterPreset = useCallback(
    (presetId: HunterLorePresetId) => {
      const preset = HUNTER_PRESETS.find((entry) => entry.id === presetId);
      if (!preset) return;
      const appearance = appearanceForPreset(presetId);
      const loadout = loadoutForPreset(presetId);

      setSelectedCatalogueEntryId(null);
      const persisted = persist({
        ...save,
        appearance,
        loadout,
      });
      setPreviewMaskWorn(appearance.biomaskId !== null);
      const exactKit =
        persisted.loadout.armorId === loadout.armorId &&
        loadout.weaponIds.every((id) =>
          persisted.loadout.weaponIds.includes(id),
        ) &&
        loadout.gearIds.every((id) => persisted.loadout.gearIds.includes(id));
      setToast(
        exactKit
          ? `${preset.name} · configuration ${preset.year} chargée.`
          : `${preset.name} · apparence chargée, équipement verrouillé remplacé.`,
      );
      void playSound("select");
    },
    [persist, playSound, save],
  );

  const selectCatalogueHunter = useCallback(
    (
      entry: CatalogueYautjaEntry,
      selection: CataloguePlayableSelection,
    ) => {
      if (typeof selection === "string") {
        selectHunterPreset(selection);
        setSelectedCatalogueEntryId(entry.id);
        return;
      }
      setSelectedCatalogueEntryId(entry.id);
      const appearance: HunterAppearance = {
        ...selection,
        laserColorId: save.appearance.laserColorId ?? "crimson",
        trophyAdornmentId:
          selection.trophyAdornmentId === "skull-spine" &&
          save.trophies.length === 0
            ? "none"
            : selection.trophyAdornmentId,
      };
      const referencePresetId = referencePresetForCatalogueEntry(entry);
      const referencePreset = HUNTER_PRESET_BY_ID[referencePresetId];
      const referenceLoadout = loadoutForPreset(referencePresetId);
      const persisted = persist({
        ...save,
        appearance,
        loadout: referenceLoadout,
      });
      setPreviewMaskWorn(appearance.biomaskId !== null);
      const exactKit =
        persisted.loadout.armorId === referenceLoadout.armorId &&
        referenceLoadout.weaponIds.every((id) =>
          persisted.loadout.weaponIds.includes(id),
        ) &&
        referenceLoadout.gearIds.every((id) =>
          persisted.loadout.gearIds.includes(id),
        );
      setToast(
        exactKit
          ? `${entry.name} · reconstruction guidée par ${referencePreset.name} (archive ${entry.id}).`
          : `${entry.name} · apparence reconstruite; arsenal verrouillé remplacé sans déblocage.`,
      );
      void playSound("select");
    },
    [persist, playSound, save, selectHunterPreset],
  );

  const completeTrophyWorkshop = useCallback(
    (result: TrophyWorkshopResult) => {
      if (!trophyWorkshop) return;
      const completedAt = new Date().toISOString();
      const trophies = save.trophies.map((trophy) => {
        if (trophy.id !== trophyWorkshop.trophyId) return trophy;
        const completedActions = [
          ...new Set([
            ...(trophy.workshop?.completedActions ?? []),
            trophyWorkshop.action,
          ]),
        ];
        return {
          ...trophy,
          workshop: {
            completedActions,
            bestScore: Math.max(trophy.workshop?.bestScore ?? 0, result.score),
            lastCompletedAt: completedAt,
          },
        };
      });
      persist({ ...save, trophies });
      setToast(
        `${trophyWorkshop.trophyName} · ${trophyWorkshop.action} réussi, grade ${result.grade}.`,
      );
      setTrophyWorkshop(null);
      void playSound("trophy");
    },
    [persist, playSound, save, trophyWorkshop],
  );

  const resetProgress = useCallback(() => {
    if (!resetArmed) {
      setResetArmed(true);
      return;
    }
    const previousOwnerSaveCreatedAt = saveRef.current.createdAt;
    const fresh = defaultSave();
    const written = replaceSaveWithStatus(fresh);
    setSaveFailure(written.failure);
    if (!written.persisted) {
      setToast("Réinitialisation non confirmée. Gardez cette session ouverte et exportez la campagne avant de réessayer.");
      return;
    }
    const shipReset = resetShipProgressionWithStatus(written.save);
    setSelectedShipId(shipReset.state.selectedShipId);
    const huntReset = clearActiveHuntSave();
    const pitReset = clearPitSave(previousOwnerSaveCreatedAt);
    const pitReplayReset = clearPitReplayArchive({
      ownerSaveCreatedAt: previousOwnerSaveCreatedAt,
    });
    clearHuntSession();
    pendingTerminalRunRef.current = null;
    setPendingHuntResult(null);
    saveRef.current = written.save;
    setSave(written.save);
    setSaveLoadIssue(null);
    setResetArmed(false);
    setSettingsOpen(false);
    setSelectedMission(null);
    setLastResult(null);
    setLastRewardSummary(null);
    setLastPitReplay(null);
    setPitUnlockedCosmeticIds([]);
    setPitCircuitRuns({});
    setPitDescentRuns({});
    setScreen("title");
    setToast(shipReset.persisted && huntReset.cleared && pitReset.cleared && pitReplayReset.cleared
      ? "Archives de chasse et du PIT réinitialisées."
      : "Campagne réinitialisée. Le nettoyage des archives annexes n’est pas confirmé ; les données d’un autre profil sont ignorées.");
  }, [clearHuntSession, resetArmed]);

  const toggleFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen();
      else setToast("Le plein écran n’est pas disponible sur cet appareil.");
    } catch { setToast("Le plein écran a été refusé par cet appareil."); }
  }, []);

  const exportCampaign = useCallback(() => {
    try {
      const blob = new Blob([exportSave(save)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `yautja-campagne-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setSaveTransferMessage("Export de la campagne préparé. La chasse active, les configurations du vaisseau et les données THE PIT ne sont pas incluses.");
    } catch { setSaveTransferMessage("Impossible de préparer cet export. Les archives locales restent intactes."); }
  }, [save]);

  const downloadArchiveFile = useCallback((serialized: string, filename: string) => {
    const url = URL.createObjectURL(new Blob([serialized], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url; link.download = filename; link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, []);

  const exportComplete = useCallback(async () => {
    if (archiveTransferBusy) return;
    setArchiveTransferBusy(true);
    try {
      const locked = await withArchiveTransferLock(() => createCompleteArchive(saveRef.current, window.localStorage));
      if (!locked.acquired) throw new Error(locked.reason);
      const result = locked.value;
      const hunt = result.archive.attachments.activeHunt;
      if (hunt && !(await import("./HuntCanvas")).isRestorableHuntArchive(hunt.snapshot, hunt.retryCheckpoint)) {
        throw new Error("Le checkpoint suspendu est illisible. Exportez la campagne légère pour la conserver.");
      }
      downloadArchiveFile(result.serialized, `yautja-integrale-${new Date().toISOString().slice(0, 10)}.json`);
      setSaveTransferMessage("Archive intégrale préparée depuis les données enregistrées. " + result.warnings.join(" "));
    } catch (error) {
      setSaveTransferMessage(error instanceof Error ? error.message : "Impossible de préparer l’archive intégrale. Les données locales restent intactes.");
    } finally { setArchiveTransferBusy(false); }
  }, [archiveTransferBusy, downloadArchiveFile]);

  const readArchiveFile = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    const selection = ++archiveSelectionRef.current;
    setImportCandidate(null); setCompleteImportPlan(null);
    if (!file || screen !== "title" || archiveTransferBusy) return;
    if (file.size > COMPLETE_ARCHIVE_MAX_BYTES) { setSaveTransferMessage("Archive trop volumineuse (3 Mio maximum pour l’intégrale)."); return; }
    setArchiveTransferBusy(true);
    try {
      const text = await file.text();
      const envelope: unknown = JSON.parse(text.replace(/^\uFEFF/, ""));
      if (isJsonObject(envelope) && envelope.format === COMPLETE_ARCHIVE_FORMAT) {
        const parsed = parseCompleteArchive(text);
        if (!parsed.archive) throw new Error("Archive intégrale refusée (" + parsed.failure + "). Aucune donnée remplacée.");
        const hunt = parsed.archive.attachments.activeHunt;
        if (hunt && !(await import("./HuntCanvas")).isRestorableHuntArchive(hunt.snapshot, hunt.retryCheckpoint)) {
          throw new Error("Le checkpoint ne peut pas être repris par cette version du jeu. Aucune donnée remplacée.");
        }
        if (selection !== archiveSelectionRef.current) return;
        setCompleteImportPlan(prepareCompleteArchiveImport(parsed.archive, window.localStorage));
        setSaveTransferMessage("Archive intégrale vérifiée. Examinez son contenu avant de confirmer le remplacement.");
      } else {
        const parsed = parseSaveImport(text);
        if (selection !== archiveSelectionRef.current) return;
        setImportCandidate(parsed.save);
        setSaveTransferMessage(parsed.save ? "Archive légère vérifiée. Confirmez son remplacement ci-dessous." : `Archive refusée (${parsed.failure}). Aucune donnée remplacée.`);
      }
    } catch (error) {
      if (selection === archiveSelectionRef.current) setSaveTransferMessage(error instanceof Error ? error.message : "Impossible de lire le fichier. Aucune donnée remplacée.");
    } finally { if (selection === archiveSelectionRef.current) setArchiveTransferBusy(false); }
  }, [archiveTransferBusy, screen]);

  const confirmCompleteImport = useCallback(async () => {
    if (!completeImportPlan || screen !== "title" || archiveTransferBusy) return;
    setArchiveTransferBusy(true);
    try {
      const result = await withArchiveTransferLock(() => importCompleteArchive(completeImportPlan, window.localStorage));
      if (!result.acquired) { setSaveTransferMessage(result.reason); return; }
      if (result.value.persisted) {
        // Reload every mounted service and its ownership observations from the
        // verified set, including the checkpoint. Never reset these sidecars.
        window.location.reload();
        return;
      }
      setSaveTransferMessage(result.value.recovery.message || "Import non confirmé. Les anciennes archives n’ont pas été remplacées.");
      setCompleteImportPlan(null);
      if (result.value.recovery.status === "blocked" || window.localStorage.getItem(ARCHIVE_TRANSFER_JOURNAL_KEY) !== null) {
        setArchiveRecoveryIssue(result.value.recovery.message || "Un import attend sa récupération.");
      }
    } catch (error) {
      setSaveTransferMessage(error instanceof Error ? error.message : "Import refusé. Aucune confirmation de remplacement.");
    } finally { setArchiveTransferBusy(false); }
  }, [archiveTransferBusy, completeImportPlan, screen]);

  const retryArchiveRecovery = useCallback(async () => {
    if (archiveTransferBusy) return;
    setArchiveTransferBusy(true);
    try {
      const result = await withArchiveTransferLock(() => recoverArchiveTransaction(window.localStorage));
      if (!result.acquired) { setArchiveRecoveryIssue(result.reason); return; }
      if (result.value.status === "blocked") setArchiveRecoveryIssue(result.value.message);
      else window.location.reload();
    } catch { setArchiveRecoveryIssue("La lecture reste indisponible. Le journal est conservé."); }
    finally { setArchiveTransferBusy(false); }
  }, [archiveTransferBusy]);

  const exportRecoveryJournal = useCallback(() => {
    try {
      const raw = window.localStorage.getItem(ARCHIVE_TRANSFER_JOURNAL_KEY);
      if (raw === null) { setSaveTransferMessage("Aucun journal local : réessayez la récupération pour recharger les archives confirmées."); return; }
      downloadArchiveFile(raw, "yautja-journal-recuperation.json");
      setSaveTransferMessage("Journal sauvegardé localement. Ce fichier de secours contient les archives avant et après import, pas un diagnostic à publier.");
    } catch { setSaveTransferMessage("Le journal n’est pas lisible. Aucun fichier incomplet n’a été préparé."); }
  }, [downloadArchiveFile]);

  const confirmImport = useCallback(() => {
    if (!importCandidate || screen !== "title" || archiveTransferBusy) return;
    let result: ReturnType<typeof importSaveWithStatus>;
    try { result = importSaveWithStatus(exportSave(importCandidate)); }
    catch { setSaveTransferMessage("Import impossible à préparer. Aucune donnée remplacée par cet import."); return; }
    if (!result.persisted || !result.save) {
      setSaveTransferMessage(`Import non confirmé (${result.failure ?? "erreur"}). Gardez cette session ouverte et exportez la campagne avant de réessayer.`);
      return;
    }
    const huntReset = clearActiveHuntSave();
    const importedPit = loadPitSave({
      key: pitSaveStorageKey(result.save.createdAt),
      expectedOwnerSaveCreatedAt: result.save.createdAt,
    });
    const importedPitSnapshots = importedPit.save
      ? pitRunSnapshots(importedPit.save)
      : null;
    const importedReplay = hydratePitReplayForOwner(result.save.createdAt);
    clearHuntSession();
    pendingTerminalRunRef.current = null;
    setPendingHuntResult(null);
    saveRef.current = result.save;
    setSave(result.save);
    setSaveFailure(null);
    setSaveLoadIssue(null);
    const shipReset = resetShipProgressionWithStatus(result.save);
    setSelectedShipId(shipReset.state.selectedShipId);
    setSelectedMission(null);
    setLastResult(null);
    setLastRewardSummary(null);
    setLastPitReplay(importedReplay.replay);
    setPitUnlockedCosmeticIds(
      importedPit.save ? [...importedPit.save.unlockedCosmeticIds] : [],
    );
    setPitCircuitRuns(importedPitSnapshots?.circuitRuns ?? {});
    setPitDescentRuns(importedPitSnapshots?.descentRuns ?? {});
    setImportCandidate(null);
    setScreen("title");
    const pitHydrationConfirmed =
      !importedPit.failure && !importedReplay.diagnostic;
    setSaveTransferMessage(
      shipReset.persisted && huntReset.cleared && pitHydrationConfirmed
        ? "Campagne importée. La chasse suspendue a été retirée ; les données THE PIT locales liées à cette campagne ont été conservées et rechargées."
        : shipReset.persisted && huntReset.cleared
          ? "Campagne importée. Les archives THE PIT locales ont été préservées, mais leur reprise automatique n’est pas confirmée."
          : "Campagne importée. Le nettoyage de la chasse suspendue ou la reprise du vaisseau n’est pas confirmé ; vérifiez l’état avant de jouer.",
    );
  }, [clearHuntSession, importCandidate, screen, archiveTransferBusy]);

  const menuBack = useCallback(() => {
    if (archiveTransferBusy || archiveRecoveryIssue) return;
    if (settingsOpen) { setSettingsOpen(false); setResetArmed(false); setImportCandidate(null); setCompleteImportPlan(null); ++archiveSelectionRef.current; setArchiveTransferBusy(false); }
    else if (pendingHuntResult) setToast("Le résultat attend sa vérification. Réessayez avant de quitter cette chasse.");
    else if (screen !== "title") go("deck");
  }, [archiveRecoveryIssue, archiveTransferBusy, go, pendingHuntResult, screen, settingsOpen]);
  const menuGamepadEnabled = Boolean(archiveRecoveryIssue) || (!trophyWorkshop && (settingsOpen || Boolean(pendingHuntResult) ||
    !["mission", "deck", "ship", "map", "training", "pit", "homeworld", "homeworld-expedition", "glass-desert-expedition"].includes(screen)));
  useMenuGamepad(gameShellRef, menuGamepadEnabled, `${screen}:${settingsOpen}:${Boolean(pendingHuntResult)}:${Boolean(archiveRecoveryIssue)}`, menuBack);

  const primaryWeapon =
    WEAPONS.find((weapon) => weapon.id === save.loadout.weaponIds[1]) ??
    WEAPONS[0];
  const activeMissionSave = huntRuntimeSave ?? save;
  const selectedArmor =
    ARMORS.find((armor) => armor.id === save.loadout.armorId) ?? ARMORS[0];
  const permanentExplorationBonus = explorationBonuses(save.exploration);
  const selectedArmorMaxEnergy = Math.round(
    effectiveArmorStats(selectedArmor.id, save.inventory.armorUpgrades[selectedArmor.id] ?? 0).maxEnergy +
      permanentExplorationBonus.maxEnergy,
  );
  const selectedGear = save.loadout.gearIds
    .map((gearId) => GEAR.find((gear) => gear.id === gearId))
    .filter(Boolean);
  const activeHunterPreset =
    save.appearance.presetId === "custom"
      ? null
      : HUNTER_PRESET_BY_ID[save.appearance.presetId];
  const activeHunterKit = activeHunterPreset
    ? playableKitForPreset(activeHunterPreset.id)
    : null;
  const trophyRecords = useMemo(
    () =>
      [...save.trophies].sort(
        (a, b) => Date.parse(b.claimedAt) - Date.parse(a.claimedAt),
      ),
    [save.trophies],
  );
  const deckTrophyDisplays = useMemo(() => trophyRecords.flatMap((trophy) => {
    const visual = trophyWallVisualForDefinitionId(trophy.definitionId) ??
      enemyTrophyGameplayForDefinitionId(trophy.definitionId);
    if (!visual) return [];
    return [{ id: trophy.id, label: visual.name, image: visual.runtimeUrl }];
  }), [trophyRecords]);
  const resumableMission = resumableHunt
    ? MISSIONS.find(({ id }) => id === resumableHunt.missionId) ?? null
    : null;

  const topBar =
    screen !== "title" && screen !== "mission" && screen !== "pit" ? (
      <TopBar
        save={save}
        onShip={() => go("deck")}
        onSettings={() => {
          void playSound("ui");
          setSettingsOpen(true);
        }}
        onFullscreen={toggleFullscreen}
      />
    ) : null;

  if (archiveRecoveryIssue) return (
    <main className="game-shell" ref={gameShellRef} data-game-content-version={GAME_CONTENT_VERSION}>
      <section className="screen panel-screen" role="alertdialog" aria-modal="true" aria-labelledby="archive-recovery-title">
        <div className="screen-safe">
          <h1 id="archive-recovery-title">Archives protégées</h1>
          <p>{archiveRecoveryIssue}</p>
          <p>Le jeu attend la vérification du transfert. Les données du journal ne sont ni effacées ni publiées.</p>
          <div className="modal-actions">
            <button type="button" className="alien-button" disabled={archiveTransferBusy} onClick={retryArchiveRecovery}>Réessayer la récupération</button>
            <button type="button" className="ghost-button" onClick={exportRecoveryJournal}>Exporter le journal de récupération</button>
            <button type="button" className="ghost-button" onClick={exportCampaign}>Exporter la campagne en mémoire</button>
          </div>
          {saveTransferMessage && <p role="status">{saveTransferMessage}</p>}
        </div>
      </section>
    </main>
  );

  return (
    <main
      ref={gameShellRef}
      className="game-shell"
      data-game-shell="yautja-long-hunt"
      data-high-contrast={
        screen === "mission"
          ? activeMissionSave.settings.highContrastVision
          : save.settings.highContrastVision
      }
      aria-label="Yautja : La Longue Chasse"
      data-game-content-version={GAME_CONTENT_VERSION}
    >
      <div inert={shipStationOpen || settingsOpen}>{topBar}</div>

      {screen === "title" && (
        <section className="screen title-screen" aria-labelledby="game-title">
          <div className="title-layout">
            <div className="title-panel">
              <p className="eyebrow">Chronique de chasse // 01</p>
              <h1 className="game-title" id="game-title">
                Yautja
                <span>La Longue Chasse</span>
              </h1>
              <p className="title-copy">
                Parcourez la galaxie depuis votre vaisseau, étudiez des proies
                dignes, choisissez l’arme juste et revenez avec un trophée — ou
                ne revenez pas.
              </p>
              <div className="title-actions">
                {resumableHunt && resumableMission && (
                  <button
                    type="button"
                    className="alien-button"
                    aria-label={`Reprendre la chasse : ${resumableMission.title}, ${formatTime(activeHuntElapsed(resumableHunt))}`}
                    onClick={resumeActiveHunt}
                  >
                    Reprendre la chasse
                    <span aria-hidden="true">
                      {" "}· {resumableMission.planetName} ·{" "}
                      {formatTime(activeHuntElapsed(resumableHunt))}
                    </span>
                  </button>
                )}
                <button
                  type="button"
                  className="alien-button"
                  onClick={() => {
                    void playSound("select");
                    setScreen("deck");
                  }}
                >
                  Jouer
                </button>
                {save.statistics.missionsStarted > 0 && (
                  <button
                    type="button"
                    className="ghost-button"
                    onClick={() => openMap("deck")}
                  >
                    Contrats
                  </button>
                )}
                <button
                  type="button"
                  className="ghost-button"
                  onClick={() => setSettingsOpen(true)}
                >
                  Réglages
                </button>
              </div>
              <p className="title-foot">
                Fan game original non commercial · clavier · manette · tactile
                <br />
                {saveFailure
                  ? "Progression temporaire : sauvegarde locale indisponible"
                  : "Sauvegarde automatique sur cet appareil"}
              </p>
            </div>
            <div className="hero-stage" aria-hidden="true">
              <HunterRigPreview
                className="hero-hunter-rig"
                appearance={save.appearance}
                armorId={save.loadout.armorId}
                weaponIds={save.loadout.weaponIds}
                gearIds={save.loadout.gearIds}
                size="clamp(320px, 44svh, 500px)"
                aiming
                bladesExtended
              />
            </div>
          </div>
        </section>
      )}

      {homeworldMounted && (
        <Suspense fallback={<DeferredGameScreen />}>
          <section className="screen panel-screen" hidden={screen === "pit" || screen === "homeworld-expedition" || screen === "glass-desert-expedition"} inert={screen !== "homeworld" || settingsOpen || trophyWorkshop !== null}>
            <div className="screen-safe">
              <div className="physical-deck-toolbar">
                <button type="button" className="ghost-button" onClick={() => openMap("homeworld")}>Carte galactique</button>
                <button type="button" className="ghost-button" onClick={() => {
                  setJusticeJurisdiction("homeworld"); openStationScreen("justice", "homeworld");
                }}>Dossier · {getJusticeStatus(save.justice).label}</button>
                <button type="button" className="ghost-button" onClick={() => go("deck")}>Rejoindre le vaisseau</button>
                <button type="button" className="ghost-button" onClick={() => setSettingsOpen(true)}>Réglages</button>
              </div>
              <HomeworldHub key={save.createdAt} save={save} selectedShipId={selectedShipId}
                suspended={screen !== "homeworld" || settingsOpen || trophyWorkshop !== null}
                onProgress={persistHomeworldProgress} onService={openHomeworldService}
                onReturnShip={() => go("deck")} onExpedition={openHomeworldExpedition} onNotify={setToast} />
            </div>
          </section>
        </Suspense>
      )}

      {screen === "homeworld-expedition" && (
        <Suspense fallback={<DeferredGameScreen />}>
          <section className="screen panel-screen">
            <div className="screen-safe">
              <HomeworldExpedition key={save.createdAt} save={save} suspended={settingsOpen}
                onComplete={completeHomeworldExpedition} onExit={() => go("homeworld")} />
            </div>
          </section>
        </Suspense>
      )}

      {screen === "glass-desert-expedition" && (
        <Suspense fallback={<DeferredGameScreen />}>
          <section className="screen panel-screen">
            <div className="screen-safe">
              <GlassDesertExpedition key={save.createdAt} save={save} suspended={settingsOpen}
                onComplete={completeGlassDesert} onExit={() => go("homeworld")} />
            </div>
          </section>
        </Suspense>
      )}

      {deckVisible && (
        <Suspense fallback={<DeferredGameScreen />}>
          <section className="screen panel-screen physical-deck-screen" inert={shipStationOpen || settingsOpen}>
            <div className="screen-safe">
              <div className="physical-deck-toolbar">
                <button type="button" className="ghost-button" aria-expanded={quickAccessOpen}
                  onClick={() => setQuickAccessOpen((open) => !open)}>
                  Accès rapide aux installations
                </button>
                <button type="button" className="ghost-button" onClick={() => go("ship")}>
                  Console du vaisseau
                </button>
                <button type="button" className="ghost-button" onClick={() => go("homeworld")}>
                  Yautja Prime · monde natal
                </button>
                <button type="button" className="ghost-button" onClick={() => {
                  setJusticeJurisdiction("homeworld"); openStationScreen("justice", "deck");
                }}>Mandats et alignement</button>
                <button type="button" className="ghost-button" onClick={openPit}>
                  THE PIT · combat
                </button>
                <button type="button" className="ghost-button" onClick={() => setSettingsOpen(true)}>
                  Pause / réglages
                </button>
              </div>
              <PhysicalShipDeck
                appearance={save.appearance}
                loadout={save.loadout}
                trophyDisplays={deckTrophyDisplays}
                rankLabel={RANK_LABELS[save.profile.rankId]}
                selectedDestination={selectedMission?.planetName}
                suspended={shipStationOpen || settingsOpen || trophyWorkshop !== null}
                showShortcuts={quickAccessOpen}
                highContrast={save.settings.highContrastVision}
                controlBindings={save.settings.controlBindings}
                onOpenMap={() => openMap("deck")}
                onOpenArmory={() => openStationScreen("armory", "deck")}
                onOpenTrophies={() => openStationScreen("trophies", "deck")}
                onOpenArchives={() => openStationScreen("codex", "deck")}
                onOpenAppearanceForge={() => openStationScreen("customization", "deck")}
                onOpenMedbay={() => openStationScreen("medbay", "deck")}
                onOpenTraining={() => openStationScreen("training", "deck")}
                onOpenAirlock={() => {
                  if (!selectedMission) { openMap("deck"); return; }
                  setBriefingAtAirlock(true);
                  go("briefing");
                }}
                onNotify={setToast}
              />
            </div>
          </section>
        </Suspense>
      )}

      {shipStationOpen && (
        <div className="ship-station-layer" data-station-screen={screen} role="dialog" aria-modal="true"
          aria-label={hubLocation === "homeworld" ? "Service du monde natal" : "Installation du vaisseau"} ref={stationDialogRef} tabIndex={-1}
          inert={settingsOpen || trophyWorkshop !== null}>
          <div className="ship-station-toolbar" inert={shipDrillActive}>
            <button type="button" className="ghost-button" onClick={() => go(hubLocation)}>
              {hubLocation === "homeworld" ? "← Retour à la cité · Échap" : "← Retour au pont · Échap"}
            </button>
            <button type="button" className="ghost-button" onClick={() => setSettingsOpen(true)}>
              Réglages
            </button>
          </div>
      {screen === "justice" && (
        <Suspense fallback={<DeferredGameScreen />}>
          <JusticePanel progress={save.justice} jurisdictionId={justiceJurisdiction}
            onProgress={persistJusticeProgress} onClose={() => go(justiceReturnScreen)} onNotify={setToast} embedded />
        </Suspense>
      )}

      {screen === "ship" && (
        <Suspense fallback={<DeferredGameScreen />}>
          <ShipHub
            embedded
            suspended={settingsOpen || trophyWorkshop !== null}
            onTrainingActiveChange={setShipDrillActive}
            save={save}
            controlBindings={save.settings.controlBindings}
            onOpenDeck={() => go("deck")}
            onOpenMap={() => openMap("ship")}
            onOpenArmory={() => openStationScreen("armory", "ship")}
            onOpenTrophies={() => openStationScreen("trophies", "ship")}
            onOpenArchives={() => openStationScreen("codex", "ship")}
            onOpenCustomization={() =>
              openStationScreen("customization", "ship")
            }
            onOpenPit={openPit}
            onApplyLoadout={applyShipLoadout}
            onSelectedShipChange={setSelectedShipId}
            onNotify={setToast}
          />
        </Suspense>
      )}

      {(screen === "medbay" || screen === "training") && (
        <Suspense fallback={<DeferredGameScreen />}>
          <section className="screen physical-medbay-entry">
            <button
              type="button"
              className="physical-medbay-entry__back ghost-button"
              onClick={() => go(hubLocation)}
            >
              {hubLocation === "homeworld" ? "← Retour à la cité" : "← Retour au pont physique"}
            </button>
            <ShipHub
              embedded
              suspended={settingsOpen || trophyWorkshop !== null}
              onTrainingActiveChange={setShipDrillActive}
              save={save}
              controlBindings={save.settings.controlBindings}
              key={screen}
              initialRoomId={screen === "training" ? "training" : "medbay"}
              onOpenDeck={() => go(hubLocation)}
              onOpenMap={() => openMap(hubLocation)}
              onOpenArmory={() => openStationScreen("armory", hubLocation)}
              onOpenTrophies={() => openStationScreen("trophies", hubLocation)}
              onOpenArchives={() => openStationScreen("codex", hubLocation)}
              onOpenCustomization={() =>
                openStationScreen("customization", hubLocation)
              }
              onOpenPit={openPit}
              onApplyLoadout={applyShipLoadout}
              onSelectedShipChange={setSelectedShipId}
              onNotify={setToast}
            />
          </section>
        </Suspense>
      )}

      {screen === "map" && (
        <Suspense fallback={<DeferredGameScreen />}>
          <GalaxyMapPanel
            suspended={settingsOpen || trophyWorkshop !== null}
            missionProgress={save.missionProgress}
            selectedShipId={selectedShipId}
            controlBindings={save.settings.controlBindings}
            initialState={galaxyNavigationState}
            onStateChange={setGalaxyNavigationState}
            onBack={() => go(mapReturnScreen)}
            onChooseMission={chooseMission}
            onVisitHomeworld={() => go("homeworld")}
            justiceControlLabel={getJusticeRouteControl(save.justice, "clan-core").label}
            onOpenJustice={() => { setJusticeJurisdiction("clan-core"); openStationScreen("justice", hubLocation); setJusticeReturnScreen("map"); }}
          />
        </Suspense>
      )}

      {screen === "briefing" && selectedMission && (
        <section
          className="screen panel-screen"
          aria-labelledby="briefing-title"
        >
          <div className="screen-safe">
            <PanelHeader
              eyebrow={`${selectedMission.planetName} // Transmission du biomask`}
              title="Préparation de chasse"
              subtitle="Le code récompense la mesure, l’observation et une proie capable de rendre les coups."
              id="briefing-heading"
              onBack={() => go("map")}
            />
            <div className="briefing-layout">
              <div className="briefing-visual">
                <img src={missionBackground(selectedMission)} alt="" />
                <div
                  className={`target-cutout ${
                    targetSprite(selectedMission).sheet ? "target-cutout-sheet" : ""
                  }`}
                >
                  <img
                    src={targetSprite(selectedMission).src}
                    alt={`Silhouette complète de ${selectedMission.targetName}`}
                  />
                </div>
                <div className="briefing-visual-copy">
                  <small>Cible Apex // niveau {selectedMission.threatLevel}</small>
                  <strong>{selectedMission.targetName}</strong>
                </div>
              </div>
              <div className="briefing-panel">
                <p className="mission-planet">{selectedMission.planetName}</p>
                <h2 id="briefing-title">{selectedMission.title}</h2>
                <p>{selectedMission.briefing}</p>
                {selectedMission.id === "jungle-vey" && (
                  <p className="source-badge">
                    Exploration permanente ·{" "}
                    {save.exploration.abilityIds.includes("aerial-boost")
                      ? "Impulsion aérienne acquise"
                      : "Impulsion aérienne à découvrir"}
                    {" · "}
                    {save.exploration.secretIds.includes("jungle-clan-cache")
                      ? "Cache du clan récupérée (+15 énergie maximale)"
                      : "Cache du clan à découvrir"}
                  </p>
                )}
                {selectedMission.id === "ice-cryostalker" && (
                  <p className="source-badge">
                    Branche de la mine facultative ·{" "}
                    {save.exploration.abilityIds.includes("aerial-boost")
                      ? "Impulsion aérienne de Vey disponible"
                      : "Impulsion aérienne de Vey requise pour cette branche seulement ; le contrat principal reste accessible"}
                    {" · "}
                    {save.exploration.secretIds.includes("ice-clan-cache")
                      ? "Cache de glace récupérée (+15 énergie maximale)"
                      : "Cache de glace à découvrir"}
                  </p>
                )}
                {isEnemyV7RosterEncounter(
                  selectedMission.id,
                  save.missionProgress[selectedMission.id].attempts,
                ) && (
                  <p className="source-badge">
                    Écologie rare ·{" "}
                    {enemyV7IdsForMission(selectedMission.id).length} espèces
                    secondaires accessibles pendant cette chasse
                  </p>
                )}
                <ul className="objective-list">
                  {selectedMission.objectives.map((objective, index) => (
                    <li key={objective.id}>
                      <span>{(index + 1).toString().padStart(2, "0")}</span>
                      <div>
                        <strong>{objective.label}</strong>
                        <small>
                          {objective.description}
                          {objective.required ? " · requis" : " · optionnel"}
                        </small>
                      </div>
                    </li>
                  ))}
                </ul>
                <section aria-labelledby="hunt-code-title">
                  <h2 id="hunt-code-title">Code de cette chasse</h2>
                  <ul className="objective-list honor-rule-list">
                    {selectedMission.honorRules.map((rule) => (
                      <li key={rule.id}>
                        <span>+{rule.bonus}</span>
                        <div>
                          <strong>{rule.label}</strong>
                          <small>
                            {rule.description}
                            {rule.violationPenalty > 0
                              ? ` · violation −${rule.violationPenalty}`
                              : ""}
                          </small>
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
                <p className="source-badge">
                  Arsenal recommandé ·{" "}
                  {
                    ARMORS.find(
                      ({ id }) => id === selectedMission.recommendedArmorId,
                    )?.name
                  }{" "}
                  ·{" "}
                  {selectedMission.recommendedWeaponIds
                    .map(
                      (id) =>
                        WEAPONS.find((weapon) => weapon.id === id)?.name ?? id,
                    )
                    .join(" / ")}
                </p>
                <div className="briefing-loadout">
                  <div>
                    <small>Armure équipée</small>
                    <strong>{selectedArmor.name}</strong>
                    <small>Énergie maximale : {selectedArmorMaxEnergy}</small>
                  </div>
                  <div>
                    <small>Arme équipée</small>
                    <strong>{primaryWeapon.name}</strong>
                  </div>
                  <div>
                    <small>Difficulté</small>
                    <strong>
                      {DIFFICULTY_LABELS[save.settings.difficultyId]}
                    </strong>
                  </div>
                </div>
                <div className="briefing-actions">
                  <button
                    type="button"
                    className="alien-button"
                    onClick={briefingAtAirlock ? launchMission : () => {
                      go("deck");
                      setToast("Destination confirmée. Rejoins le sas pour vérifier ton arsenal et partir.");
                    }}
                  >
                    {briefingAtAirlock ? "Déployer le chasseur" : "Valider la destination"}
                  </button>
                  <button
                    type="button"
                    className="ghost-button"
                    onClick={() =>
                      openStationScreen("armory", "briefing")
                    }
                  >
                    Modifier l’arsenal
                  </button>
                  {!briefingAtAirlock && (
                    <button type="button" className="ghost-button" onClick={launchMission}>
                      Départ rapide
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {screen === "armory" && (
        <section className="screen panel-screen" aria-labelledby="armory-title">
          <div className="screen-safe">
            <PanelHeader
              eyebrow="Vaisseau // Pont d’armement"
              title="Armurerie"
              subtitle="Les lames de poignet restent toujours disponibles. Choisissez une arme secondaire, une armure et deux outils de chasse."
              id="armory-title"
              onBack={() => go(stationReturnScreen)}
            />
            <section className="armory-war-room" aria-labelledby="armory-wall-title">
              <img
                className="armory-war-room-background"
                src="/game/backgrounds/armory-war-room-v6.png"
                alt="Armurerie murale du vaisseau, avec biomasks et armes suspendus"
              />
              <div className="armory-war-room-copy">
                <p className="eyebrow">Pont inférieur // Râtelier mural</p>
                <h2 id="armory-wall-title">Équipement accroché, modules séparés</h2>
                <p>
                  Biomasks, armes, gauntlet, bras articulé et canon du
                  plasmacaster disposent chacun de leur propre emplacement.
                </p>
              </div>
              <div className="armory-atlas-shelves">
                <section
                  className="armory-exact-kit"
                  aria-labelledby="armory-exact-kit-title"
                >
                  <h3 id="armory-exact-kit-title">
                    Références fidèles à la franchise
                  </h3>
                  <div
                    className="armory-module-rack hunter-kit-rack"
                    role="list"
                  >
                    {[
                      ...V14_EXACT_MASK_ASSETS,
                      ...(V14_FERAL_SPEARGUN?.available
                        ? [V14_FERAL_SPEARGUN]
                        : []),
                    ].map((asset) => (
                      <figure key={asset.id} role="listitem">
                        <img
                          src={asset.runtimeUrl}
                          alt=""
                          loading="lazy"
                        />
                        <figcaption>
                          {asset.name} · {asset.work}
                        </figcaption>
                      </figure>
                    ))}
                  </div>
                </section>
                <section aria-labelledby="armory-modules-title">
                  <h3 id="armory-modules-title">
                    Équipements complémentaires
                  </h3>
                  <div className="armory-module-rack" role="list">
                    {V6_ARMORY_RACK_ORDER.map((visualId) => (
                      <figure key={visualId} role="listitem">
                        <V6AtlasSprite id={visualId} decorative />
                        <figcaption>{V6_VISUAL_CELLS[visualId].label}</figcaption>
                      </figure>
                    ))}
                  </div>
                </section>
                <section aria-labelledby="armory-masks-title">
                  <h3 id="armory-masks-title">
                    Variantes originales du clan
                  </h3>
                  <div className="armory-module-rack armory-mask-rack" role="list">
                    {V6_ALL_VISUAL_IDS.filter(
                      (visualId) => V6_VISUAL_CELLS[visualId].kind === "mask",
                    ).map((visualId) => (
                      <figure key={visualId} role="listitem">
                        <V6AtlasSprite id={visualId} decorative />
                        <figcaption>{V6_VISUAL_CELLS[visualId].label}</figcaption>
                      </figure>
                    ))}
                  </div>
                </section>
              </div>
            </section>
            <div className="armory-layout">
              <aside className="loadout-preview" aria-label="Équipement actuel">
                <div className="loadout-rig-stage">
                  <HunterRigPreview
                    className="loadout-rig"
                    appearance={save.appearance}
                    armorId={save.loadout.armorId}
                    weaponIds={save.loadout.weaponIds}
                    gearIds={save.loadout.gearIds}
                    size="min(78%, 390px)"
                    maskWorn={
                      previewMaskWorn && save.appearance.biomaskId !== null
                    }
                    gauntletOpen={previewGauntletOpen}
                    bladesExtended={previewBladesExtended}
                    aiming={previewAiming}
                  />
                </div>
                <RigStateControls
                  maskWorn={previewMaskWorn}
                  maskAvailable={save.appearance.biomaskId !== null}
                  gauntletOpen={previewGauntletOpen}
                  bladesExtended={previewBladesExtended}
                  aiming={previewAiming}
                  onMask={() => setPreviewMaskWorn((value) => !value)}
                  onGauntlet={() =>
                    setPreviewGauntletOpen((value) => !value)
                  }
                  onBlades={() =>
                    setPreviewBladesExtended((value) => !value)
                  }
                  onAim={() => setPreviewAiming((value) => !value)}
                />
                <div className="loadout-summary">
                  <h3>Configuration active</h3>
                  <div className="loadout-tags">
                    <span>{selectedArmor.name}</span>
                    <span>Énergie maximale {selectedArmorMaxEnergy}</span>
                    <span>{primaryWeapon.name}</span>
                    {selectedGear.map((gear) => (
                      <span key={gear!.id}>{gear!.name}</span>
                    ))}
                  </div>
                </div>
              </aside>
              <div className="armory-sections">
                <ArmorySection title="Armes de chasse">
                  {WEAPONS.map((weapon) => {
                    const unlocked =
                      save.inventory.unlockedWeaponIds.includes(weapon.id);
                    const selected = save.loadout.weaponIds.includes(weapon.id);
                    const effectiveWeapon = effectiveWeaponStats(
                      weapon.id,
                      save.inventory.weaponUpgrades[weapon.id] ?? 0,
                    );
                    const upgradeQuote = quoteUpgrade(save, {
                      domain: "weapon",
                      id: weapon.id,
                    });
                    return (
                      <EquipmentCard
                        key={weapon.id}
                        type={weapon.attackType}
                        name={weapon.name}
                        description={weapon.description}
                        stats={[
                          `DMG ${Math.round(effectiveWeapon.damage)}`,
                          `PORTÉE ${Math.round(effectiveWeapon.rangePx)}`,
                          `POIDS ${weapon.weight}`,
                        ]}
                        selected={selected}
                        unlocked={unlocked}
                        lockedText={`${weapon.unlock.minimumHonor} honneur requis`}
                        onSelect={() => selectWeapon(weapon.id)}
                        upgradeQuote={upgradeQuote}
                        onUpgrade={() =>
                          purchaseEquipmentUpgrade({
                            domain: "weapon",
                            id: weapon.id,
                          })
                        }
                        visualIds={
                          weapon.id === "plasma-caster"
                            ? [
                                V6_PLASMA_CASTER_ASSEMBLY.articulatedArmId,
                                V6_PLASMA_CASTER_ASSEMBLY.cannonId,
                              ]
                            : [V6_WEAPON_VISUAL_BY_ID[weapon.id]]
                        }
                      />
                    );
                  })}
                </ArmorySection>
                <ArmorySection title="Armures de clan">
                  {ARMORS.map((armor) => {
                    const unlocked =
                      save.inventory.unlockedArmorIds.includes(armor.id);
                    const effectiveArmor = effectiveArmorStats(
                      armor.id,
                      save.inventory.armorUpgrades[armor.id] ?? 0,
                    );
                    const upgradeQuote = quoteUpgrade(save, {
                      domain: "armor",
                      id: armor.id,
                    });
                    return (
                      <EquipmentCard
                        key={armor.id}
                        type="armure"
                        name={armor.name}
                        description={armor.description}
                        stats={[
                          `PV ${Math.round(effectiveArmor.maxHealth)}`,
                          `ÉNERGIE ${Math.round(effectiveArmor.maxEnergy + permanentExplorationBonus.maxEnergy)}`,
                          `CAP. ${effectiveArmor.carryingCapacity}`,
                        ]}
                        selected={save.loadout.armorId === armor.id}
                        unlocked={unlocked}
                        lockedText={`${armor.unlock.minimumHonor} honneur requis`}
                        onSelect={() => selectArmor(armor.id)}
                        upgradeQuote={upgradeQuote}
                        onUpgrade={() =>
                          purchaseEquipmentUpgrade({
                            domain: "armor",
                            id: armor.id,
                          })
                        }
                      />
                    );
                  })}
                </ArmorySection>
                <ArmorySection title="Équipement tactique">
                  {GEAR.map((gear) => {
                    const unlocked =
                      save.inventory.unlockedGearIds.includes(gear.id);
                    const effectiveGear = effectiveGearStats(
                      gear.id,
                      save.inventory.gearUpgrades[gear.id] ?? 0,
                      save.settings.difficultyId,
                    );
                    const upgradeQuote = quoteUpgrade(save, {
                      domain: "gear",
                      id: gear.id,
                    });
                    return (
                      <EquipmentCard
                        key={gear.id}
                        type={gear.role}
                        name={gear.name}
                        description={gear.description}
                        stats={[
                          `${effectiveGear.maxCharges} CHARGES`,
                          `POIDS ${gear.weight}`,
                          `PORTÉE ${Math.round(effectiveGear.rangePx)}`,
                        ]}
                        selected={save.loadout.gearIds.includes(gear.id)}
                        unlocked={unlocked}
                        lockedText={`${gear.unlock.minimumHonor} honneur requis`}
                        onSelect={() => selectGear(gear.id)}
                        upgradeQuote={upgradeQuote}
                        onUpgrade={() =>
                          purchaseEquipmentUpgrade({
                            domain: "gear",
                            id: gear.id,
                          })
                        }
                        visualIds={[V6_GEAR_VISUAL_BY_ID[gear.id]]}
                      />
                    );
                  })}
                </ArmorySection>
              </div>
            </div>
          </div>
        </section>
      )}

      {screen === "customization" && (
        <section
          className="screen panel-screen"
          aria-labelledby="customization-title"
        >
          <div className="screen-safe">
            <PanelHeader
              eyebrow="Vaisseau // Quartier du chasseur"
              title="Personnalisation du Yautja"
              subtitle="Le biomask permet d’étudier séparément l’anatomie, le filet, les dreadlocks, les plaques, l’armement, les gantelets et les trophées."
              id="customization-title"
              onBack={() => go(stationReturnScreen)}
            />
            <div className="customization-layout">
              <aside className="customization-preview">
                <div className="customization-rig-stage">
                  <HunterRigPreview
                    className="customization-rig"
                    appearance={save.appearance}
                    armorId={save.loadout.armorId}
                    weaponIds={save.loadout.weaponIds}
                    gearIds={save.loadout.gearIds}
                    size="min(88%, 440px)"
                    maskWorn={
                      previewMaskWorn && save.appearance.biomaskId !== null
                    }
                    gauntletOpen={previewGauntletOpen}
                    bladesExtended={previewBladesExtended}
                    aiming={previewAiming}
                  />
                </div>
                <RigStateControls
                  maskWorn={previewMaskWorn}
                  maskAvailable={save.appearance.biomaskId !== null}
                  gauntletOpen={previewGauntletOpen}
                  bladesExtended={previewBladesExtended}
                  aiming={previewAiming}
                  onMask={() => setPreviewMaskWorn((value) => !value)}
                  onGauntlet={() =>
                    setPreviewGauntletOpen((value) => !value)
                  }
                  onBlades={() =>
                    setPreviewBladesExtended((value) => !value)
                  }
                  onAim={() => setPreviewAiming((value) => !value)}
                />
                <p className="customization-note">
                  Examine chaque élément séparément, puis vérifie l’apparence et
                  l’équipement du chasseur avant le départ.
                </p>
              </aside>

              <div className="customization-sections">
                <CustomizationSection
                  title="Archives cinéma"
                  detail={`${HUNTER_FILM_GROUPS.reduce((count, group) => count + group.presets.length, 0)} plaques · ${HUNTER_FILM_GROUPS.length} dossiers film par film`}
                >
                  {HUNTER_FILM_GROUPS.map((group) => (
                    <section className="hunter-film-group" key={group.work}>
                      <header>
                        <div>
                          <small>Archive {group.year}</small>
                          <h3>{group.work}</h3>
                        </div>
                        <span>{group.presets.length} plaques</span>
                      </header>
                      <div className="hunter-film-grid">
                        {group.presets.map((preset) => (
                          <HunterPresetCard
                            key={preset.id}
                            preset={preset}
                            selected={save.appearance.presetId === preset.id}
                            onSelect={selectHunterPreset}
                          />
                        ))}
                      </div>
                    </section>
                  ))}
                  <section className="hunter-film-group hunter-expanded-group">
                    <header>
                      <div>
                        <small>Continuités séparées</small>
                        <h3>Jeux, comics et romans</h3>
                      </div>
                      <span>{HUNTER_EXPANDED_PRESETS.length} chasseurs</span>
                    </header>
                    <div className="hunter-film-grid">
                      {HUNTER_EXPANDED_PRESETS.map((preset) => (
                        <HunterPresetCard
                          key={preset.id}
                          preset={preset}
                          selected={save.appearance.presetId === preset.id}
                          onSelect={selectHunterPreset}
                        />
                      ))}
                    </div>
                  </section>
                  {activeHunterPreset && (
                    <article
                      className={`hunter-preset-dossier${hunterFilmPlatePath(activeHunterPreset) ? " has-plate" : ""}`}
                      aria-live="polite"
                    >
                      {hunterFilmPlatePath(activeHunterPreset) && (
                        <figure className="hunter-preset-dossier-art">
                          <img
                            alt={`Plaque complète de ${activeHunterPreset.name}`}
                            src={hunterFilmPlatePath(activeHunterPreset) ?? ""}
                            loading="lazy"
                            onError={(event) => {
                              event.currentTarget.onerror = null;
                              event.currentTarget.src =
                                activeHunterPreset.biomaskId !== null
                                  ? hunterMaskThumbnailPath(
                                      activeHunterPreset.biomaskId,
                                    )
                                  : hunterBodyFullPath(
                                      activeHunterPreset.bodyMorphId,
                                    );
                            }}
                          />
                          <figcaption>Étude du clan · corps entier</figcaption>
                        </figure>
                      )}
                      <div>
                        <small>Dossier sélectionné</small>
                        <h3>{activeHunterPreset.name}</h3>
                        <p>{activeHunterPreset.description}</p>
                      </div>
                      <div>
                        <small>Fidélité visuelle</small>
                        <p>{activeHunterPreset.fidelityNote}</p>
                        <nav aria-label={`Sources de ${activeHunterPreset.name}`}>
                          {activeHunterPreset.sourceUrls.map(
                            (sourceUrl, sourceIndex) => (
                              <a
                                href={sourceUrl}
                                key={sourceUrl}
                                rel="noreferrer"
                                target="_blank"
                              >
                                Référence {sourceIndex + 1}
                              </a>
                            ),
                          )}
                        </nav>
                      </div>
                      {activeHunterKit && (
                        <div className="hunter-preset-kit">
                          <small>Arsenal documenté complet</small>
                          <p>
                            Armes :{" "}
                            {activeHunterPreset.signatureWeaponIds
                              .map(
                                (weaponId) =>
                                  WEAPONS.find(({ id }) => id === weaponId)?.name ??
                                  weaponId,
                              )
                              .join(" · ") || "Aucune attestée"}
                            {" · "}Outils :{" "}
                            {activeHunterPreset.signatureGearIds
                              .map(
                                (gearId) =>
                                  GEAR.find(({ id }) => id === gearId)?.name ?? gearId,
                              )
                              .join(" · ") || "Aucun attesté"}
                          </p>
                          <small>Configuration de chasse · deux armes / deux outils</small>
                          <p>
                            {activeHunterKit.loadout.weaponIds
                              .map(
                                (weaponId) =>
                                  WEAPONS.find(({ id }) => id === weaponId)?.name ??
                                  weaponId,
                              )
                              .join(" · ")}
                            {" · "}
                            {activeHunterKit.loadout.gearIds
                              .map(
                                (gearId) =>
                                  GEAR.find(({ id }) => id === gearId)?.name ?? gearId,
                              )
                              .join(" · ")}
                          </p>
                          {!activeHunterKit.isFullyDocumented && (
                            <p className="hunter-preset-runtime-warning">
                              Complément de chasse non attesté :{" "}
                              {[
                                ...activeHunterKit.supplementalWeaponIds.map(
                                  (weaponId) =>
                                    WEAPONS.find(({ id }) => id === weaponId)?.name ??
                                    weaponId,
                                ),
                                ...activeHunterKit.supplementalGearIds.map(
                                  (gearId) =>
                                    GEAR.find(({ id }) => id === gearId)?.name ?? gearId,
                                ),
                              ].join(" · ")} occupe les emplacements requis pour partir.
                            </p>
                          )}
                        </div>
                      )}
                    </article>
                  )}
                  <Suspense
                    fallback={
                      <p className="loading-mark" role="status" aria-live="polite">
                        Chargement du catalogue de chasse…
                      </p>
                    }
                  >
                    <CatalogueHunterBrowser
                      selectedEntryId={selectedCatalogueEntryId}
                      onSelect={selectCatalogueHunter}
                    />
                  </Suspense>
                </CustomizationSection>

                <CustomizationSection
                  title="Morphologie"
                  detail="Six corps nus enregistrés sur le même sol et les mêmes articulations"
                >
                  {BODY_OPTIONS.map((option) => (
                    <AppearanceOption
                      key={option.id}
                      label={option.label}
                      detail={option.detail}
                      image={option.image}
                      selected={save.appearance.bodyMorphId === option.id}
                      onSelect={() =>
                        updateAppearance("bodyMorphId", option.id)
                      }
                    />
                  ))}
                </CustomizationSection>

                <CustomizationSection
                  title="Pigmentation"
                  detail="Teinte organique de la peau mouchetée"
                >
                  {SKIN_OPTIONS.map((option) => (
                    <AppearanceOption
                      key={option.id}
                      label={option.label}
                      detail={option.detail}
                      swatch={option.swatch}
                      selected={save.appearance.skinId === option.id}
                      onSelect={() => updateAppearance("skinId", option.id)}
                    />
                  ))}
                </CustomizationSection>

                <CustomizationSection
                  title="Biomask"
                  detail="Le masque peut être porté ou retiré à tout moment"
                >
                  {MASK_OPTIONS.map((option) => (
                    <AppearanceOption
                      key={option.id ?? "unmasked"}
                      label={option.label}
                      detail={option.detail}
                      image={option.image}
                      visualId={
                        option.id === null || option.preferImage
                          ? undefined
                          : V6_MASK_VISUAL_BY_ID[option.id]
                      }
                      glyph={option.id === null ? "◌" : undefined}
                      selected={save.appearance.biomaskId === option.id}
                      onSelect={() => {
                        updateAppearance("biomaskId", option.id);
                        setPreviewMaskWorn(option.id !== null);
                      }}
                    />
                  ))}
                </CustomizationSection>

                <CustomizationSection
                  title="Spectre du laser"
                  detail="Le biomask conserve la même optique pour le plasmacaster et son réticule, dans le quartier comme en chasse"
                >
                  {LASER_COLOR_OPTIONS.map((option) => (
                    <AppearanceOption
                      key={option.id}
                      label={option.label}
                      detail={option.detail}
                      swatch={option.swatch}
                      visualId={V6_LASER_VISUAL_BY_COLOR_ID[option.id]}
                      selected={(save.appearance.laserColorId ?? "crimson") === option.id}
                      onSelect={() => updateAppearance("laserColorId", option.id)}
                    />
                  ))}
                  <figure className="laser-rank-atlas">
                    <V6AtlasSprite
                      id={V6_RANK_VISUAL_BY_ID[save.profile.rankId]}
                      label={`Insigne du rang ${RANK_LABELS[save.profile.rankId]}`}
                    />
                    <figcaption>
                      Insigne actif · {RANK_LABELS[save.profile.rankId]}
                    </figcaption>
                  </figure>
                </CustomizationSection>

                <CustomizationSection
                  title="Dreadlocks"
                  detail="Silhouette et mouvement naturel distincts"
                >
                  {DREAD_OPTIONS.map((option) => (
                    <AppearanceOption
                      key={option.id}
                      label={option.label}
                      detail={option.detail}
                      image={option.image}
                      selected={save.appearance.dreadStyleId === option.id}
                      onSelect={() =>
                        updateAppearance("dreadStyleId", option.id)
                      }
                    />
                  ))}
                </CustomizationSection>

                <CustomizationSection
                  title="Teinte des dreadlocks"
                  detail="Couleur des mèches et anneaux"
                >
                  {DREAD_TINT_OPTIONS.map((option) => (
                    <AppearanceOption
                      key={option.id}
                      label={option.label}
                      swatch={option.swatch}
                      selected={save.appearance.dreadTintId === option.id}
                      onSelect={() =>
                        updateAppearance("dreadTintId", option.id)
                      }
                    />
                  ))}
                </CustomizationSection>

                <CustomizationSection
                  title="Famille d’armure"
                  detail="Les plaques restent attachées au membre qu’elles protègent"
                >
                  {ARMOR_STYLE_OPTIONS.map((option) => (
                    <AppearanceOption
                      key={option.id}
                      label={option.label}
                      detail={option.detail}
                      image={option.image}
                      selected={save.appearance.armorStyleId === option.id}
                      onSelect={() =>
                        updateAppearance("armorStyleId", option.id)
                      }
                    />
                  ))}
                </CustomizationSection>

                <CustomizationSection
                  title="Métal de l’armure"
                  detail={`${selectedArmor.name} · la silhouette se change dans l’armurerie`}
                >
                  {ARMOR_TINT_OPTIONS.map((option) => (
                    <AppearanceOption
                      key={option.id}
                      label={option.label}
                      swatch={option.swatch}
                      selected={save.appearance.armorTintId === option.id}
                      onSelect={() =>
                        updateAppearance("armorTintId", option.id)
                      }
                    />
                  ))}
                </CustomizationSection>

                <CustomizationSection
                  title="Parure de trophée"
                  detail="Les prises physiques peuvent être portées sur l’armure"
                >
                  <AppearanceOption
                    label="Aucune parure"
                    glyph="◇"
                    selected={save.appearance.trophyAdornmentId === "none"}
                    onSelect={() =>
                      updateAppearance("trophyAdornmentId", "none")
                    }
                  />
                  <AppearanceOption
                    label="Crâne et colonne"
                    detail={
                      save.trophies.length > 0
                        ? "Prise nettoyée et montée"
                        : "Rapportez d’abord un trophée digne"
                    }
                    image="/game/assets/v2/actors/yautja/hunter/trophies/skull-spine.webp"
                    selected={
                      save.appearance.trophyAdornmentId === "skull-spine"
                    }
                    locked={save.trophies.length === 0}
                    onSelect={() =>
                      updateAppearance("trophyAdornmentId", "skull-spine")
                    }
                  />
                </CustomizationSection>
              </div>
            </div>
          </div>
        </section>
      )}

      {screen === "trophies" && (
        <section
          className="screen panel-screen"
          aria-labelledby="trophies-title"
        >
          <div className="screen-safe">
            <PanelHeader
              eyebrow="Vaisseau // Mémoire du clan"
              title="Mur des trophées"
              subtitle="Chaque prise conserve sa difficulté, sa qualité et le score de la chasse. Un trophée ne vaut que par la proie qui l’a défendu."
              id="trophies-title"
              onBack={() => go(stationReturnScreen)}
            />
            <div className="trophy-grid">
              <details className="franchise-trophy-archive">
                <summary>
                  <span>Archives de la franchise</span>
                  <strong>
                    {FRANCHISE_TROPHY_MANIFEST_SUMMARY.planned} designs
                    physiques sourcés · non jouables
                  </strong>
                </summary>
                <div className="trophy-grid franchise-trophy-archive-grid">
                  {FRANCHISE_TROPHY_ARCHIVE_ASSETS.map((asset) => {
                    const primaryAppearance = asset.appearances[0];
                    return (
                      <article
                        className="trophy-card trophy-reference-card"
                        key={asset.id}
                      >
                        <div className="trophy-art">
                          <img
                            src={asset.runtimeUrl}
                            alt=""
                            loading="lazy"
                            decoding="async"
                          />
                        </div>
                        <p className="mission-planet">
                          {primaryAppearance.work} · {primaryAppearance.year}
                          {asset.appearances.length > 1
                            ? ` · ${asset.appearances.length} apparitions`
                            : ""}
                        </p>
                        <h3>{asset.name}</h3>
                        <p>{asset.visualAnchor}</p>
                        {asset.guardrail && (
                          <p className="trophy-archive-guardrail">
                            Nomenclature : {asset.guardrail}
                          </p>
                        )}
                        <div className="trophy-tags">
                          <span>
                            {franchiseTrophyMediumLabel(
                              primaryAppearance.medium,
                            )}
                          </span>
                          <span>
                            {franchiseTrophyEvidenceLabel(
                              primaryAppearance.status,
                            )}
                          </span>
                          <span>
                            {franchiseTrophyContinuityLabel(primaryAppearance)}
                          </span>
                        </div>
                        <a
                          className="trophy-archive-source"
                          href={primaryAppearance.sourcePage}
                          rel="noreferrer"
                          target="_blank"
                        >
                          Source de l’œuvre
                        </a>
                        <span className="trophy-score">
                          DOSSIER DU CLAN · NON JOUABLE
                        </span>
                      </article>
                    );
                  })}
                </div>
              </details>
              {trophyRecords.length > 0 ? (
                trophyRecords.map((trophy) => {
                  const mission = MISSIONS.find(
                    (entry) => entry.id === trophy.missionId,
                  );
                  const exactVisual = trophyWallVisualForDefinitionId(
                    trophy.definitionId,
                  );
                  const enemyGameplayVisual =
                    enemyTrophyGameplayForDefinitionId(trophy.definitionId) ??
                    enemyTrophyGameplayForEnemyId(trophy.sourceEnemyId);
                  const missionTrophy =
                    mission?.trophy.id === trophy.definitionId
                      ? mission.trophy
                      : null;
                  const fallbackTrophyName =
                    trophy.partId === "mask"
                      ? `Biomask de ${trophy.targetName}`
                      : trophy.partId === "insignia"
                        ? `Insigne de ${trophy.targetName}`
                        : trophy.partId === "skull-and-spine"
                          ? `Crâne et colonne de ${trophy.targetName}`
                          : `Crâne de ${trophy.targetName}`;
                  const fallbackTrophyDescription =
                    trophy.partId === "mask"
                      ? "Biomask arraché à un adversaire du clan."
                      : trophy.partId === "insignia"
                        ? "Insigne tactique prélevé sur une proie digne."
                        : trophy.partId === "skull-and-spine"
                          ? "Crâne et colonne extraits après une chasse honorable."
                          : "Crâne prélevé, nettoyé et consigné dans les archives.";
                  const quality = {
                    worthy: "Digne",
                    blooded: "Blooded",
                    elite: "Élite",
                    flawless: "Sans défaut",
                  }[trophy.quality];
                  const condition = {
                    damaged: "Endommagé",
                    intact: "Intact",
                    pristine: "Parfait",
                  }[trophy.condition];
                  const completedWorkshopActions =
                    trophy.workshop?.completedActions ?? [];
                  const displayTrophyName =
                    missionTrophy?.name ??
                    exactVisual?.name ??
                    enemyGameplayVisual?.name ??
                    fallbackTrophyName;
                  const displayTrophyDescription =
                    missionTrophy?.description ??
                    exactVisual?.description ??
                    (enemyGameplayVisual
                      ? `Prise secondaire scellée après la chasse de ${trophy.targetName}.`
                      : fallbackTrophyDescription);
                  const trophyImageUrl =
                    exactVisual?.runtimeUrl ??
                    enemyGameplayVisual?.runtimeUrl;
                  return (
                    <article className="trophy-card" key={trophy.id}>
                      <div className="trophy-art" aria-hidden="true">
                        {trophyImageUrl ? (
                          <img
                            src={trophyImageUrl}
                            alt=""
                            loading="lazy"
                            decoding="async"
                          />
                        ) : (
                          <V6AtlasSprite
                            id={resolveV6TrophyVisualId(trophy)}
                            decorative
                          />
                        )}
                      </div>
                      <p className="mission-planet">
                        {mission?.planetName ?? "Monde inconnu"}
                      </p>
                      <h3>{displayTrophyName}</h3>
                      <p>{displayTrophyDescription}</p>
                      <div className="trophy-tags">
                        <span>{quality}</span>
                        <span>{condition}</span>
                        <span>{trophy.targetKind}</span>
                      </div>
                      <span className="trophy-score">
                        {trophy.score} PTS · {trophy.difficultyId.toUpperCase()}
                      </span>
                      <time dateTime={trophy.claimedAt}>
                        {new Date(trophy.claimedAt).toLocaleDateString("fr-FR")}
                      </time>
                      <div
                        className="trophy-workshop-actions"
                        aria-label={`Préparation de ${trophy.targetName}`}
                      >
                        {TROPHY_WORKSHOP_ORDER.map((action, actionIndex) => {
                          const completed = completedWorkshopActions.includes(action);
                          const prerequisite = TROPHY_WORKSHOP_ORDER[actionIndex - 1];
                          const available =
                            actionIndex === 0 ||
                            completedWorkshopActions.includes(prerequisite);
                          return (
                            <button
                              type="button"
                              key={action}
                              className={completed ? "completed" : ""}
                              disabled={!available}
                              onClick={() =>
                                setTrophyWorkshop({
                                  trophyId: trophy.id,
                                  trophyName: displayTrophyName,
                                  trophyImageUrl,
                                  action,
                                })
                              }
                            >
                              {completed ? "✓ " : ""}
                              {TROPHY_WORKSHOP_LABELS[action]}
                            </button>
                          );
                        })}
                      </div>
                    </article>
                  );
                })
              ) : (
                <article className="trophy-card empty trophy-empty-state">
                  <div>
                    <strong>MUR EN ATTENTE</strong>
                    <p>
                      Affaiblissez une proie digne, approchez son corps et
                      maintenez l’extraction pour arracher votre première prise.
                    </p>
                  </div>
                </article>
              )}
            </div>
          </div>
        </section>
      )}

      {screen === "codex" && (
        <Suspense fallback={<DeferredGameScreen />}>
          <section className="screen panel-screen" aria-labelledby="codex-title">
          <div className="screen-safe">
            <PanelHeader
              eyebrow="Biomask // Archives interprétées"
              title="Codex de chasse"
              subtitle="Les entrées distinguent le noyau de l’univers des éléments originaux créés pour cette campagne. Le code juge une chasse, pas une morale humaine."
              id="codex-title"
              onBack={() => go(stationReturnScreen)}
            />
            <EnemyBestiaryV8
              discoveredEnemyIds={save.codex.discoveredEnemyIds}
            />
            <section className="visual-codex-gallery" aria-label="Archives visuelles du clan">
              <article>
                <h2>Bestiaire</h2>
                <div className="visual-codex-sprite-grid">
                  {V6_PREY_GALLERY_ORDER.map((visualId) => (
                    <figure key={visualId}>
                      <V6AtlasSprite id={visualId} />
                      <figcaption>{V6_VISUAL_CELLS[visualId].label}</figcaption>
                    </figure>
                  ))}
                </div>
              </article>
              <article>
                <h2>Flotte du clan</h2>
                <div className="visual-codex-sprite-grid">
                  {Object.values(V6_SHIP_VISUAL_BY_ROLE).map((visualId) => (
                    <figure key={visualId}>
                      <V6AtlasSprite id={visualId} />
                      <figcaption>{V6_VISUAL_CELLS[visualId].label}</figcaption>
                    </figure>
                  ))}
                </div>
              </article>
              <article>
                <h2>Rangs et castes</h2>
                <div className="visual-codex-sprite-grid">
                  {V6_RANK_AND_CASTE_ORDER.map((visualId) => (
                    <figure key={visualId}>
                      <V6AtlasSprite id={visualId} />
                      <figcaption>{V6_VISUAL_CELLS[visualId].label}</figcaption>
                    </figure>
                  ))}
                </div>
              </article>
            </section>
            <div className="codex-grid">
              {CODEX_ENTRIES.map((entry) => {
                const unlocked =
                  save.codex.unlockedEntryIds.includes(entry.id);
                return (
                  <article className="codex-card" key={entry.id}>
                    <span className="codex-label">{entry.category}</span>
                    <h3>{unlocked ? entry.title : "SIGNAL CHIFFRÉ"}</h3>
                    <p>
                      {unlocked
                        ? entry.text
                        : "Scannez les indices puis terminez le contrat associé pour décoder cette archive."}
                    </p>
                    <span className="source-badge">
                      {entry.category === "planet" || entry.category === "prey"
                        ? "Contenu original"
                        : "Référence de franchise"}
                    </span>
                  </article>
                );
              })}
            </div>
          </div>
          </section>
        </Suspense>
      )}

        </div>
      )}

      {screen === "pit" && (
        <Suspense fallback={<DeferredGameScreen />}>
          <PitCanvas
            controlBindings={save.settings.controlBindings}
            highContrast={save.settings.highContrastVision}
            lastReplay={lastPitReplay}
            reducedGore={save.settings.reducedGore}
            screenShake={save.settings.screenShake}
            unlockedCosmeticIds={pitUnlockedCosmeticIds}
            savedCircuitRuns={pitCircuitRuns}
            savedDescentRuns={pitDescentRuns}
            onMatchComplete={recordPitMatch}
            onRunTransition={recordPitRunTransition}
            exitLabel={pitReturnScreen === "homeworld" ? "Retour à la cité" : "Retour au vaisseau"}
            onExit={() => go(pitReturnScreen)}
          />
        </Suspense>
      )}

      {screen === "mission" && selectedMission && (
        <Suspense fallback={<DeferredGameScreen />}>
          <HuntCanvas
            mission={selectedMission}
            encounterRun={save.missionProgress[selectedMission.id].attempts}
            loadout={activeMissionSave.loadout}
            inventory={activeMissionSave.inventory}
            explorationProgress={activeMissionSave.exploration}
            onExplorationProgress={persistExplorationProgress}
            appearance={activeMissionSave.appearance}
            difficulty={activeMissionSave.settings.difficultyId}
            controlBindings={activeMissionSave.settings.controlBindings}
            reducedGore={activeMissionSave.settings.reducedGore}
            screenShake={activeMissionSave.settings.screenShake}
            highContrastVision={
              activeMissionSave.settings.highContrastVision
            }
            resumeSnapshot={huntResumePayload?.snapshot ?? null}
            resumeRetryCheckpoint={
              huntResumePayload?.retryCheckpoint ?? null
            }
            onPersistHunt={persistActiveHunt}
            onSuspendHunt={suspendActiveHunt}
            onInvalidateHunt={invalidateActiveHuntPersistence}
            onResumeFailure={rejectActiveHuntResume}
            onSound={playGameplaySound}
            onMusicContext={setHuntMusicContext}
            onFinish={completeMission}
            onAbort={(result) => completeMission(result, true)}
          />
        </Suspense>
      )}

      {screen === "debrief" && lastResult && selectedMission && (
        <section className="screen debrief-screen" aria-labelledby="debrief-title">
          <div className="debrief-panel">
            <div className="grade-ring" aria-label={`Grade ${gradeFor(lastResult.score)}`}>
              {gradeFor(lastResult.score)}
            </div>
            <p className="eyebrow">
              {lastResult.outcome === "success"
                ? "Chasse accomplie"
                : "Chasse interrompue"}
            </p>
            <h1 id="debrief-title">{selectedMission.targetName}</h1>
            <p>
              {lastResult.outcome === "success"
                ? selectedMission.debrief.success
                : selectedMission.debrief.failureHint}
            </p>
            {lastResult.outcome === "success" &&
              selectedMission.debrief.nextLead && (
                <p className="source-badge">
                  Trace suivante · {selectedMission.debrief.nextLead}
                </p>
              )}
            <div className="debrief-stats">
              <DebriefStat label="Score" value={lastResult.score.toString()} />
              <DebriefStat
                label="Temps"
                value={formatTime(lastResult.elapsedSeconds)}
              />
              <DebriefStat label="Scans" value={lastResult.scans.toString()} />
              <DebriefStat
                label="Prises"
                value={lastResult.trophyClaims.length.toString()}
              />
              <DebriefStat
                label="Trophée Apex"
                value={qualityLabel(lastResult)}
              />
              <DebriefStat
                label="Honneur gagné"
                value={`${(lastRewardSummary?.honor ?? 0) >= 0 ? "+" : ""}${
                  lastRewardSummary?.honor ?? 0
                }`}
              />
              <DebriefStat
                label="Marques gagnées"
                value={`+${lastRewardSummary?.clanMarks ?? 0}`}
              />
            </div>
            {lastResult.honorEvents.length > 0 && (
              <details>
                <summary>Journal d’honneur</summary>
                <ul className="objective-list honor-event-list">
                  {lastResult.honorEvents.map((event) => (
                    <li key={event.id}>
                      <span>{event.value >= 0 ? `+${event.value}` : event.value}</span>
                      <strong>{event.label}</strong>
                    </li>
                  ))}
                </ul>
              </details>
            )}
            <div className="debrief-actions">
              <button
                type="button"
                className="alien-button"
                onClick={() => {
                  setSelectedMission(null);
                  go("deck");
                }}
              >
                Retour au vaisseau
              </button>
              <button
                type="button"
                className="ghost-button"
                onClick={launchMission}
              >
                Rejouer la chasse
              </button>
            </div>
          </div>
        </section>
      )}

      {screen === "ending" && lastResult && selectedMission && (
        <section
          className="screen debrief-screen ending-screen"
          aria-labelledby="ending-title"
        >
          <div className="debrief-panel">
            <p className="eyebrow">Chronique accomplie // Acheron-Sigma</p>
            <h1 id="ending-title">La Longue Chasse devient mémoire</h1>
            <p>{selectedMission.debrief.success}</p>
            {selectedMission.debrief.nextLead && (
              <p className="source-badge">
                Épilogue · {selectedMission.debrief.nextLead}
              </p>
            )}
            <div className="debrief-stats">
              <DebriefStat label="Grade final" value={gradeFor(lastResult.score)} />
              <DebriefStat
                label="Trophée Apex"
                value={qualityLabel(lastResult)}
              />
              <DebriefStat
                label="Honneur gagné"
                value={`${(lastRewardSummary?.honor ?? 0) >= 0 ? "+" : ""}${
                  lastRewardSummary?.honor ?? 0
                }`}
              />
              <DebriefStat label="Nouveau rite" value="Difficulté Elder" />
            </div>
            <p>
              Le rite Elder est désormais accessible. Les huit chasses restent
              rejouables avec une perception accrue, aucun relais et une seule
              charge de Medicomp.
            </p>
            <div className="debrief-actions">
              <button
                type="button"
                className="alien-button"
                onClick={() => {
                  updateSettings({ difficultyId: "elder" });
                  setSelectedMission(null);
                  openMap("deck");
                }}
              >
                Ouvrir les contrats Elder
              </button>
              <button
                type="button"
                className="ghost-button"
                onClick={() => {
                  setSelectedMission(null);
                  go("deck");
                }}
              >
                Retour au vaisseau
              </button>
            </div>
          </div>
        </section>
      )}

      {trophyWorkshop && (
        <Suspense fallback={<DeferredGameScreen />}>
          <TrophyWorkshop
            action={trophyWorkshop.action}
            trophyId={trophyWorkshop.trophyId}
            trophyName={trophyWorkshop.trophyName}
            trophyImageUrl={trophyWorkshop.trophyImageUrl}
            controlBindings={save.settings.controlBindings}
            onComplete={completeTrophyWorkshop}
            onCancel={() => setTrophyWorkshop(null)}
          />
        </Suspense>
      )}

      {settingsOpen && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target && !archiveTransferBusy) {
              setCompleteImportPlan(null); setImportCandidate(null); ++archiveSelectionRef.current;
              setSettingsOpen(false);
              setResetArmed(false);
            }
          }}
        >
          <section
            className="modal-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="settings-title"
            ref={settingsDialogRef}
          >
            <h2 id="settings-title">Réglages du biomask</h2>
            <p>
              La difficulté modifie la résistance, les dégâts et la détection
              des proies. La progression n’est jamais supprimée après un échec.
            </p>
            <div className="settings-list">
              <div className="setting-row">
                <label htmlFor="difficulty-select">Difficulté</label>
                <select
                  id="difficulty-select"
                  value={save.settings.difficultyId}
                  onChange={(event) =>
                    updateSettings({
                      difficultyId: event.target.value as DifficultyId,
                    })
                  }
                >
                  {DIFFICULTIES.map((difficulty) => (
                    <option
                      key={difficulty.id}
                      value={difficulty.id}
                      disabled={
                        difficulty.id === "elder" && !save.storyCompleted
                      }
                    >
                      {difficulty.name}
                    </option>
                  ))}
                </select>
              </div>
              <SettingToggle
                label="Audio procédural"
                checked={save.settings.masterVolume > 0}
                onChange={(checked) => {
                  if (!checked && save.settings.masterVolume > 0) {
                    previousMasterVolumeRef.current =
                      save.settings.masterVolume;
                  }
                  updateSettings({
                    masterVolume: checked
                      ? previousMasterVolumeRef.current
                      : 0,
                  });
                }}
              />
              <SettingSlider
                label="Volume musique"
                value={save.settings.musicVolume}
                onChange={(musicVolume) =>
                  updateSettings({ musicVolume })
                }
              />
              <SettingSlider
                label="Volume effets"
                value={save.settings.effectsVolume}
                onChange={(effectsVolume) =>
                  updateSettings({ effectsVolume })
                }
              />
              <SettingToggle
                label="Secousse d’écran"
                checked={save.settings.screenShake}
                onChange={(screenShake) => updateSettings({ screenShake })}
              />
              <SettingToggle
                label="Violence atténuée"
                checked={save.settings.reducedGore}
                onChange={(reducedGore) => updateSettings({ reducedGore })}
              />
              <SettingToggle
                label="Vision à contraste élevé"
                checked={save.settings.highContrastVision}
                onChange={(highContrastVision) =>
                  updateSettings({ highContrastVision })
                }
              />
              <section aria-labelledby="keyboard-controls-title">
                <h3 id="keyboard-controls-title">Commandes clavier</h3>
                <Suspense
                  fallback={
                    <p role="status" aria-live="polite">
                      Chargement des commandes…
                    </p>
                  }
                >
                  <ControlBindingsPanel
                    bindings={save.settings.controlBindings}
                    onChange={(controlBindings) =>
                      updateSettings({ controlBindings })
                    }
                  />
                </Suspense>
              </section>
            </div>
            <section className="save-transfer" aria-labelledby="save-transfer-title">
              <h3 id="save-transfer-title">Archives et récupération</h3>
              <p>L’export léger conserve la campagne, les options, l’inventaire, l’apparence, les trophées, Homeworld et la Justice. L’archive intégrale ajoute la chasse suspendue et son checkpoint, le vaisseau, ses préréglages, l’atelier, l’entraînement, l’infirmerie, THE PIT et son dernier replay.</p>
              <p>Seules les données déjà enregistrées sont transférées. La position instantanée d’une visite du hub et une expédition non rapportée ne sont pas des checkpoints sauvegardés. Aucun cloud ni envoi automatique.</p>
              <div className="modal-actions">
                <button type="button" className="ghost-button" onClick={exportCampaign}>Exporter la campagne légère</button>
                <button type="button" className="ghost-button" disabled={archiveTransferBusy} onClick={exportComplete}>Exporter l’archive intégrale</button>
                <button type="button" className="ghost-button" onClick={() => persist(save)}>Réessayer la sauvegarde</button>
              </div>
              <label className="save-import-label">Charger une archive JSON
                <input type="file" accept="application/json,.json" disabled={screen !== "title" || archiveTransferBusy} onChange={readArchiveFile} />
              </label>
              {screen !== "title" && <p>Pour remplacer les archives, suspendez la chasse éventuelle puis revenez au titre.
                {screen !== "mission" && !pendingHuntResult && <button type="button" className="ghost-button" onClick={() => { setSettingsOpen(false); setScreen("title"); }}>Revenir au titre pour importer</button>}
              </p>}
              {archiveTransferBusy && <p role="status">Vérification des archives…</p>}
              {completeImportPlan && <div className="save-import-confirm" aria-label="Prévisualisation de l’archive intégrale">
                <p><strong>{completeImportPlan.archive.campaign.profile.hunterName}</strong> · {completeImportPlan.archive.campaign.statistics.missionsCompleted} chasses terminées · contenu {completeImportPlan.archive.contentVersion}</p>
                <ul>{completeArchiveSummary(completeImportPlan.archive).map((line) => <li key={line}>{line}</li>)}</ul>
                <p>Fermez les autres fenêtres du jeu avant cette opération. Elle remplace la campagne et toutes les annexes indiquées. Une annexe absente retire la donnée correspondante pour cette campagne ; les archives THE PIT d’autres campagnes restent intactes. Exportez l’état actuel avant remplacement. Un changement local depuis cette prévisualisation annule la confirmation.</p>
                <button type="button" className="ghost-button danger" disabled={archiveTransferBusy} onClick={confirmCompleteImport}>Confirmer le remplacement intégral</button>
                <button type="button" className="ghost-button" disabled={archiveTransferBusy} onClick={() => { ++archiveSelectionRef.current; setCompleteImportPlan(null); }}>Annuler l’import intégral</button>
              </div>}
              {importCandidate && <div className="save-import-confirm">
                <p><strong>{importCandidate.profile.hunterName}</strong> · {importCandidate.statistics.missionsCompleted} chasses terminées · {formatTime(importCandidate.profile.playTimeSeconds)}</p>
                <p>Cette opération remplace la campagne actuelle et retire sa chasse suspendue. Les archives THE PIT ne sont ni importées ni supprimées ; les données locales déjà liées à cette campagne seront reprises.</p>
                <button type="button" className="ghost-button danger" onClick={confirmImport}>Confirmer le remplacement par cette archive</button>
                <button type="button" className="ghost-button" onClick={() => setImportCandidate(null)}>Annuler l’import</button>
              </div>}
              {saveTransferMessage && <p role="status">{saveTransferMessage}</p>}
              <p className="source-badge">Manette : croix ou stick pour naviguer, A pour valider, B pour revenir ; gauche/droite pour ajuster un réglage.</p>
            </section>
            <details className="game-credits">
              <summary>Crédits et statut du projet</summary>
              <p>Version de contenu {GAME_CONTENT_VERSION} · {GAME_CONTENT_LABEL}</p>
              <p>La Longue Chasse : projet original de fan inspiré de Predator. Création et intégration des visuels avec OpenAI ; ambiances et effets sonores procéduraux.</p>
              <p>Projet non commercial, sans affiliation officielle revendiquée. Les références de franchise restent identifiées dans le codex. Une diffusion commerciale et une certification sur consoles ou Steam Deck ne sont pas acquises.</p>
            </details>
            <div className="modal-actions">
              <button
                type="button"
                className="ghost-button danger"
                onClick={resetProgress}
                disabled={archiveTransferBusy}
              >
                {resetArmed
                  ? "Confirmer la réinitialisation"
                  : "Réinitialiser la progression"}
              </button>
              <button
                type="button"
                className="alien-button small"
                disabled={archiveTransferBusy}
                onClick={() => {
                  setCompleteImportPlan(null); setImportCandidate(null); ++archiveSelectionRef.current;
                  setSettingsOpen(false);
                  setResetArmed(false);
                }}
              >
                Fermer
              </button>
            </div>
          </section>
        </div>
      )}

      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}

      {pendingHuntResult && <div className="save-warning" role="alert">
        Résultat conservé en attente : la lecture des archives doit revenir avant de vérifier et enregistrer cette chasse. Gardez cet écran ouvert.
        <button type="button" onClick={() => completeMission(pendingHuntResult.result, pendingHuntResult.returnToDeck)}>Vérifier et enregistrer le résultat</button>
      </div>}
      {saveLoadIssue && !saveFailure && !pendingHuntResult && <div className="save-recovery-note" role="status">
        {saveLoadIssue === "backup-recovered" ? "Campagne récupérée depuis la copie de secours. Exportez-la par précaution." : "La lecture des archives locales nécessite votre attention dans les réglages."}
      </div>}
      {saveFailure && !pendingHuntResult && (
        <div className="save-warning" role="alert">
          {saveFailure === "save-conflict"
            ? "Une autre session a modifié la campagne. Exportez cette progression avant de recharger. Aucun écrasement automatique."
            : saveFailure === "protected-save"
              ? "Les archives existantes sont illisibles ou plus récentes et restent protégées. Importez une archive valide ou confirmez une réinitialisation."
              : "Progression conservée en mémoire seulement. Libérez le stockage puis réessayez, ou exportez la campagne avant de quitter."}
          <button type="button" onClick={() => persist(save)}>Réessayer</button>
          <button type="button" onClick={exportCampaign}>Exporter</button>
        </div>
      )}
    </main>
  );
}

function TopBar({
  save,
  onShip,
  onSettings,
  onFullscreen,
}: {
  save: SaveGame;
  onShip: () => void;
  onSettings: () => void;
  onFullscreen: () => void;
}) {
  return (
    <header className="top-bar">
      <button
        type="button"
        className="brand-lockup ghost-button"
        onClick={onShip}
        aria-label="Retour au vaisseau"
      >
        <span className="brand-rune" aria-hidden="true">
          <span>Y</span>
        </span>
        <span>La Longue Chasse</span>
      </button>
      <div className="hunter-stats" aria-label="Progression">
        <span className="stat-chip">
          <small>Rang</small>
          <strong>{RANK_LABELS[save.profile.rankId]}</strong>
        </span>
        <span className="stat-chip">
          <small>Honneur</small>
          <strong>{save.profile.honor}</strong>
        </span>
        <span className="stat-chip">
          <small>Marques</small>
          <strong>{save.profile.clanMarks}</strong>
        </span>
      </div>
      <div className="top-actions">
        <button
          type="button"
          className="icon-button"
          aria-label="Plein écran"
          onClick={onFullscreen}
        >
          ⛶
        </button>
        <button
          type="button"
          className="icon-button"
          aria-label="Réglages"
          onClick={onSettings}
        >
          ⚙
        </button>
      </div>
    </header>
  );
}

function PanelHeader({
  eyebrow,
  title,
  subtitle,
  id,
  onBack,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  id: string;
  onBack: () => void;
}) {
  return (
    <header className="panel-header">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="panel-title" id={id}>
          {title}
        </h1>
        <p className="panel-subtitle">{subtitle}</p>
      </div>
      <button type="button" className="back-button" onClick={onBack}>
        ← Retour
      </button>
    </header>
  );
}

function ArmorySection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="armory-section">
      <h2>{title}</h2>
      <div className="equipment-grid">{children}</div>
    </section>
  );
}

function EquipmentCard({
  type,
  name,
  description,
  stats,
  selected,
  unlocked,
  lockedText,
  onSelect,
  upgradeQuote,
  onUpgrade,
  visualIds = [],
}: {
  type: string;
  name: string;
  description: string;
  stats: string[];
  selected: boolean;
  unlocked: boolean;
  lockedText: string;
  onSelect: () => void;
  upgradeQuote: UpgradeQuote;
  onUpgrade: () => void;
  visualIds?: readonly V6VisualId[];
}) {
  const upgradeState =
    upgradeQuote.nextLevel === null
      ? "NIVEAU MAXIMUM"
      : `NIVEAU ${upgradeQuote.currentLevel}/2 · ${upgradeQuote.cost ?? 0} MARQUES`;
  const upgradeAction =
    upgradeQuote.nextLevel === null
      ? "Amélioration maximale"
      : !upgradeQuote.unlocked
        ? "Amélioration verrouillée"
        : upgradeQuote.canPurchase
          ? `Améliorer au niveau ${upgradeQuote.nextLevel}`
          : `Solde insuffisant · ${upgradeQuote.cost ?? 0} marques`;

  return (
    <article
      className={`equipment-card${selected ? " selected" : ""}${!unlocked ? " locked" : ""}`}
      style={{ display: "flex", flexDirection: "column" }}
    >
      <p className="equipment-type">{type}</p>
      {visualIds.length > 0 ? (
        <div className="equipment-card-visuals" aria-hidden="true">
          {visualIds.map((visualId) => (
            <V6AtlasSprite key={visualId} id={visualId} decorative />
          ))}
        </div>
      ) : null}
      <h3>{name}</h3>
      <p>{description}</p>
      <div className="equipment-stats">
        {stats.map((stat) => (
          <span key={stat}>{stat}</span>
        ))}
      </div>
      <p
        className="equipment-type"
        aria-label={`Amélioration de ${name}`}
      >
        Forge · {upgradeState}
      </p>
      <div
        style={{
          display: "grid",
          gap: 6,
          marginTop: "auto",
          paddingTop: 12,
        }}
      >
        <button
          type="button"
          className="equipment-select"
          disabled={!unlocked}
          onClick={onSelect}
          style={{ position: "static", width: "100%" }}
        >
          {!unlocked ? lockedText : selected ? "Équipé" : "Équiper"}
        </button>
        <button
          type="button"
          className="equipment-select"
          disabled={!upgradeQuote.canPurchase}
          onClick={onUpgrade}
          style={{ position: "static", width: "100%" }}
        >
          {upgradeAction}
        </button>
      </div>
    </article>
  );
}

function HunterPresetCard({
  preset,
  selected,
  onSelect,
}: {
  preset: HunterPresetDefinition;
  selected: boolean;
  onSelect: (presetId: HunterLorePresetId) => void;
}) {
  const fallbackImage = preset.biomaskId
    ? hunterMaskThumbnailPath(preset.biomaskId)
    : hunterBodyFullPath(preset.bodyMorphId);
  const plateImage = hunterFilmPlatePath(preset);
  const continuity =
    preset.isArchetype
      ? "ARCHÉTYPE FILM"
      : preset.work.includes("scènes supprimées")
      ? "SCÈNE SUPPRIMÉE"
      : preset.continuity === "canon"
        ? "CANON FILM"
        : preset.continuity === "crossover"
          ? "CROSSOVER"
          : "UNIVERS ÉTENDU";

  return (
    <button
      type="button"
      className={`hunter-preset-card${selected ? " selected" : ""}${plateImage ? " has-film-plate" : ""}`}
      aria-pressed={selected}
      onClick={() => onSelect(preset.id)}
      title={preset.fidelityNote}
    >
      <span className="hunter-preset-art">
        <img
          src={plateImage ?? fallbackImage}
          alt={
            plateImage
              ? `${preset.name}, silhouette complète fidèle à ${preset.work}`
              : `Portrait d’archive de ${preset.name}`
          }
          loading="lazy"
          onError={(event) => {
            if (event.currentTarget.src.endsWith(fallbackImage)) return;
            event.currentTarget.src = fallbackImage;
          }}
        />
      </span>
      <span className="hunter-preset-copy">
        <small>
          {PRESET_MEDIA_LABEL[preset.media]} · {preset.year}
        </small>
        <strong>{preset.name}</strong>
        <em>{preset.work}</em>
      </span>
      <span className="hunter-preset-continuity">
        {preset.textInterpretation ? "INTERPRÉTATION TEXTE" : continuity}
      </span>
    </button>
  );
}

function CustomizationSection({
  title,
  detail,
  children,
}: {
  title: string;
  detail: string;
  children: React.ReactNode;
}) {
  return (
    <section className="customization-section">
      <header>
        <h2>{title}</h2>
        <p>{detail}</p>
      </header>
      <div className="appearance-options">{children}</div>
    </section>
  );
}

function AppearanceOption({
  label,
  detail,
  image,
  visualId,
  glyph,
  swatch,
  selected,
  locked = false,
  onSelect,
}: {
  label: string;
  detail?: string;
  image?: string;
  visualId?: V6VisualId;
  glyph?: string;
  swatch?: string;
  selected: boolean;
  locked?: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      className={`appearance-option${selected ? " selected" : ""}`}
      aria-pressed={selected}
      disabled={locked}
      onClick={onSelect}
    >
      <span className="appearance-option-art" aria-hidden="true">
        {visualId ? (
          <V6AtlasSprite id={visualId} decorative />
        ) : image ? (
          <img src={image} alt="" />
        ) : null}
        {swatch ? (
          <i
            className="appearance-swatch"
            style={{ backgroundColor: swatch }}
          />
        ) : null}
        {!visualId && !image && !swatch ? <b>{glyph ?? "Y"}</b> : null}
      </span>
      <span className="appearance-option-copy">
        <strong>{label}</strong>
        {detail ? <small>{detail}</small> : null}
      </span>
      <span className="appearance-option-state" aria-hidden="true">
        {locked ? "VERROUILLÉ" : selected ? "ACTIF" : "+"}
      </span>
    </button>
  );
}

function RigStateControls({
  maskWorn,
  maskAvailable,
  gauntletOpen,
  bladesExtended,
  aiming,
  onMask,
  onGauntlet,
  onBlades,
  onAim,
}: {
  maskWorn: boolean;
  maskAvailable: boolean;
  gauntletOpen: boolean;
  bladesExtended: boolean;
  aiming: boolean;
  onMask: () => void;
  onGauntlet: () => void;
  onBlades: () => void;
  onAim: () => void;
}) {
  const actions = [
    {
      id: "mask",
      label: maskWorn ? "Retirer mask" : "Porter mask",
      active: maskWorn,
      disabled: !maskAvailable,
      onClick: onMask,
    },
    {
      id: "gauntlet",
      label: gauntletOpen ? "Fermer gant" : "Ouvrir gant",
      active: gauntletOpen,
      disabled: false,
      onClick: onGauntlet,
    },
    {
      id: "blades",
      label: bladesExtended ? "Rentrer griffes" : "Sortir griffes",
      active: bladesExtended,
      disabled: false,
      onClick: onBlades,
    },
    {
      id: "aim",
      label: aiming ? "Relâcher visée" : "Cadrer plasma",
      active: aiming,
      disabled: false,
      onClick: onAim,
    },
  ];

  return (
    <div className="rig-state-controls" aria-label="Essai des éléments mobiles">
      {actions.map((action) => (
        <button
          key={action.id}
          type="button"
          className={action.active ? "active" : ""}
          aria-pressed={action.active}
          disabled={action.disabled}
          onClick={action.onClick}
        >
          {action.label}
        </button>
      ))}
    </div>
  );
}

function DebriefStat({ label, value }: { label: string; value: string }) {
  return (
    <span className="debrief-stat">
      <small>{label}</small>
      <strong>{value}</strong>
    </span>
  );
}

function SettingToggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="setting-row">
      <span>{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
    </label>
  );
}

function SettingSlider({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  const percentage = Math.round(value * 100);
  return (
    <label className="setting-row">
      <span>{label}</span>
      <span
        style={{
          display: "flex",
          minWidth: 180,
          alignItems: "center",
          gap: 10,
        }}
      >
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={value}
          aria-valuetext={`${percentage} %`}
          onChange={(event) => onChange(Number(event.target.value))}
          style={{ width: "100%", accentColor: "var(--blood)" }}
        />
        <output style={{ minWidth: 42, textAlign: "right" }}>
          {percentage} %
        </output>
      </span>
    </label>
  );
}
