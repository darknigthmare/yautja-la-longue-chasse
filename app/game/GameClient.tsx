"use client";

/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import HunterRigPreview from "./HunterRigPreview";
import HuntCanvas from "./HuntCanvas";
import ShipHub from "./ShipHub";
import V6AtlasSprite from "./V6AtlasSprite";
import { CatalogueHunterBrowser } from "./CatalogueHunterBrowser";
import GalaxyMapPanel from "./GalaxyMapPanel";
import PhysicalShipDeck from "./PhysicalShipDeck";
import {
  DEFAULT_SHIP_ID,
  type ShipId,
} from "./shipCatalogue";
import TrophyWorkshop from "./TrophyWorkshop";
import EnemyBestiaryV8 from "./EnemyBestiaryV8";
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
  loadSave,
  writeSave,
} from "./save";
import {
  GameAudio,
  type GameAudioBiome,
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
import { SHIP_PROGRESSION_STORAGE_KEY } from "./systems/progression";
import type {
  ArmorId,
  ArmorTintId,
  BiomaskId,
  DifficultyId,
  DreadStyleId,
  DreadTintId,
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

type Screen =
  | "title"
  | "ship"
  | "deck"
  | "medbay"
  | "map"
  | "armory"
  | "customization"
  | "trophies"
  | "codex"
  | "briefing"
  | "mission"
  | "debrief";

type MapReturnScreen = Extract<Screen, "ship" | "deck">;
type StationScreen = Extract<
  Screen,
  "armory" | "customization" | "trophies" | "codex" | "medbay"
>;
type StationReturnScreen = Extract<Screen, "ship" | "deck" | "briefing">;

const STABLE_BOOT_TIME = "2026-07-18T00:00:00.000Z";

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

export default function GameClient() {
  const [screen, setScreen] = useState<Screen>("title");
  const [save, setSave] = useState<SaveGame>(() =>
    defaultSave(STABLE_BOOT_TIME),
  );
  const [selectedMission, setSelectedMission] =
    useState<MissionDefinition | null>(null);
  const [galaxyNavigationState, setGalaxyNavigationState] =
    useState<GalaxyNavigationState>(createGalaxyNavigationState);
  const [selectedShipId, setSelectedShipId] =
    useState<ShipId>(DEFAULT_SHIP_ID);
  const [mapReturnScreen, setMapReturnScreen] =
    useState<MapReturnScreen>("ship");
  const [stationReturnScreen, setStationReturnScreen] =
    useState<StationReturnScreen>("ship");
  const [lastResult, setLastResult] = useState<MissionResult | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [resetArmed, setResetArmed] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
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
  const settingsDialogRef = useRef<HTMLElement | null>(null);

  // Charge la progression de l’appareil sans toucher à localStorage au SSR.
  useEffect(() => {
    const hydrationTask = window.setTimeout(() => setSave(loadSave()), 0);
    const audio = new GameAudio();
    audioRef.current = audio;
    return () => {
      window.clearTimeout(hydrationTask);
      audio.dispose();
      audioRef.current = null;
    };
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
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [screen]);

  useEffect(() => {
    if (previousScreenRef.current === screen) return;
    previousScreenRef.current = screen;
    const frame = window.requestAnimationFrame(() => {
      const activeScreen = gameShellRef.current?.querySelector<HTMLElement>(
        ":scope > .screen",
      );
      const focusTarget =
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
      if (event.key === "Escape") {
        event.preventDefault();
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
  }, [settingsOpen]);

  const playSound = useCallback(
    async (
      sound:
        | "ui"
        | "select"
        | "victory"
        | "defeat"
        | "trophy",
    ) => {
      const audio = audioRef.current;
      if (!audio) return;
      await audio.unlock();
      audio[sound]();
    },
    [],
  );

  const playGameplaySound = useCallback(async (sound: GameSfxId) => {
    const audio = audioRef.current;
    if (!audio) return;
    await audio.unlock();
    audio.playSfx(sound);
  }, []);

  const persist = useCallback((next: SaveGame) => {
    const persisted = writeSave(next);
    setSave(persisted);
    return persisted;
  }, []);

  const go = useCallback(
    (next: Screen) => {
      void playSound("ui");
      setScreen(next);
    },
    [playSound],
  );

  const openMap = useCallback(
    (returnScreen: MapReturnScreen) => {
      setMapReturnScreen(returnScreen);
      go("map");
    },
    [go],
  );

  const openStationScreen = useCallback(
    (next: StationScreen, returnScreen: StationReturnScreen) => {
      setStationReturnScreen(returnScreen);
      go(next);
    },
    [go],
  );

  const chooseMission = useCallback(
    (mission: MissionDefinition) => {
      if (save.missionProgress[mission.id].status === "locked") return;
      void playSound("select");
      setSelectedMission(mission);
      setScreen("briefing");
    },
    [playSound, save.missionProgress],
  );

  const launchMission = useCallback(() => {
    if (!selectedMission) return;
    void playSound("select");
    setScreen("mission");
  }, [playSound, selectedMission]);

  const completeMission = useCallback(
    (result: MissionResult) => {
      const next = applyMissionResult(save, result);
      persist(next);
      setLastResult(result);
      setScreen("debrief");
      void playSound(result.outcome === "success" ? "victory" : "defeat");
    },
    [persist, playSound, save],
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
      persist({
        ...save,
        appearance,
        loadout,
        inventory: {
          ...save.inventory,
          unlockedArmorIds: [
            ...new Set([
              ...save.inventory.unlockedArmorIds,
              preset.recommendedArmorId,
            ]),
          ],
          unlockedWeaponIds: [
            ...new Set([
              ...save.inventory.unlockedWeaponIds,
              ...preset.signatureWeaponIds,
              ...loadout.weaponIds,
            ]),
          ],
          unlockedGearIds: [
            ...new Set([
              ...save.inventory.unlockedGearIds,
              ...preset.signatureGearIds,
              ...loadout.gearIds,
            ]),
          ],
        },
      });
      setPreviewMaskWorn(appearance.biomaskId !== null);
      setToast(`${preset.name} · configuration ${preset.year} chargée.`);
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
      persist({
        ...save,
        appearance,
        loadout: referenceLoadout,
        inventory: {
          ...save.inventory,
          unlockedArmorIds: [
            ...new Set([
              ...save.inventory.unlockedArmorIds,
              referencePreset.recommendedArmorId,
            ]),
          ],
          unlockedWeaponIds: [
            ...new Set([
              ...save.inventory.unlockedWeaponIds,
              ...referencePreset.signatureWeaponIds,
              ...referenceLoadout.weaponIds,
            ]),
          ],
          unlockedGearIds: [
            ...new Set([
              ...save.inventory.unlockedGearIds,
              ...referencePreset.signatureGearIds,
              ...referenceLoadout.gearIds,
            ]),
          ],
        },
      });
      setPreviewMaskWorn(appearance.biomaskId !== null);
      setToast(
        `${entry.name} · reconstruction guidée par ${referencePreset.name} (archive ${entry.id}).`,
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
    const fresh = defaultSave();
    try {
      window.localStorage.removeItem(SHIP_PROGRESSION_STORAGE_KEY);
    } catch {
      // La sauvegarde principale reste réinitialisable si le stockage est bloqué.
    }
    persist(fresh);
    setResetArmed(false);
    setSettingsOpen(false);
    setSelectedMission(null);
    setLastResult(null);
    setScreen("title");
    setToast("Archives de chasse réinitialisées.");
  }, [persist, resetArmed]);

  const toggleFullscreen = useCallback(() => {
    if (typeof document === "undefined") return;
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void document.documentElement.requestFullscreen?.();
    }
  }, []);

  const primaryWeapon =
    WEAPONS.find((weapon) => weapon.id === save.loadout.weaponIds[1]) ??
    WEAPONS[0];
  const selectedArmor =
    ARMORS.find((armor) => armor.id === save.loadout.armorId) ?? ARMORS[0];
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

  const topBar =
    screen !== "title" && screen !== "mission" ? (
      <TopBar
        save={save}
        onShip={() => go("ship")}
        onSettings={() => {
          void playSound("ui");
          setSettingsOpen(true);
        }}
        onFullscreen={toggleFullscreen}
      />
    ) : null;

  return (
    <main
      ref={gameShellRef}
      className="game-shell"
      data-game-shell="yautja-long-hunt"
      aria-label="Yautja : La Longue Chasse"
    >
      {topBar}

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
                <button
                  type="button"
                  className="alien-button"
                  onClick={() => {
                    void playSound("select");
                    setScreen("ship");
                  }}
                >
                  Jouer
                </button>
                {save.statistics.missionsStarted > 0 && (
                  <button
                    type="button"
                    className="ghost-button"
                    onClick={() => openMap("ship")}
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
                Sauvegarde automatique sur cet appareil
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

      {screen === "ship" && (
        <ShipHub
          save={save}
          onOpenDeck={() => go("deck")}
          onOpenMap={() => openMap("ship")}
          onOpenArmory={() => openStationScreen("armory", "ship")}
          onOpenTrophies={() => openStationScreen("trophies", "ship")}
          onOpenArchives={() => openStationScreen("codex", "ship")}
          onOpenCustomization={() =>
            openStationScreen("customization", "ship")
          }
          onApplyLoadout={applyShipLoadout}
          onSelectedShipChange={setSelectedShipId}
          onNotify={setToast}
        />
      )}

      {screen === "deck" && (
        <section className="screen panel-screen physical-deck-screen">
          <div className="screen-safe">
            <button
              type="button"
              className="physical-deck-back ghost-button"
              onClick={() => go("ship")}
            >
              ← Console du vaisseau
            </button>
            <PhysicalShipDeck
              highContrast={save.settings.highContrastVision}
              onOpenMap={() => openMap("deck")}
              onOpenArmory={() => openStationScreen("armory", "deck")}
              onOpenTrophies={() => openStationScreen("trophies", "deck")}
              onOpenArchives={() => openStationScreen("codex", "deck")}
              onOpenAppearanceForge={() =>
                openStationScreen("customization", "deck")
              }
              onOpenMedbay={() => openStationScreen("medbay", "deck")}
              onNotify={setToast}
            />
          </div>
        </section>
      )}

      {screen === "medbay" && (
        <section className="screen physical-medbay-entry">
          <button
            type="button"
            className="physical-medbay-entry__back ghost-button"
            onClick={() => go("deck")}
          >
            ← Retour au pont physique
          </button>
          <ShipHub
            save={save}
            initialRoomId="medbay"
            onOpenDeck={() => go("deck")}
            onOpenMap={() => openMap("deck")}
            onOpenArmory={() => openStationScreen("armory", "deck")}
            onOpenTrophies={() => openStationScreen("trophies", "deck")}
            onOpenArchives={() => openStationScreen("codex", "deck")}
            onOpenCustomization={() =>
              openStationScreen("customization", "deck")
            }
            onApplyLoadout={applyShipLoadout}
            onSelectedShipChange={setSelectedShipId}
            onNotify={setToast}
          />
        </section>
      )}

      {screen === "map" && (
        <GalaxyMapPanel
          missionProgress={save.missionProgress}
          selectedShipId={selectedShipId}
          initialState={galaxyNavigationState}
          onStateChange={setGalaxyNavigationState}
          onBack={() => go(mapReturnScreen)}
          onChooseMission={chooseMission}
        />
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
                <h1 id="briefing-title">{selectedMission.title}</h1>
                <p>{selectedMission.briefing}</p>
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
                      {objective.label}
                    </li>
                  ))}
                </ul>
                <div className="briefing-loadout">
                  <div>
                    <small>Armure</small>
                    <strong>{selectedArmor.name}</strong>
                  </div>
                  <div>
                    <small>Arme</small>
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
                    onClick={launchMission}
                  >
                    Déployer le chasseur
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
                    Références de franchise V14
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
                    Modules de jeu supplémentaires
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
                          `ÉNERGIE ${Math.round(effectiveArmor.maxEnergy)}`,
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
              subtitle="Rig V3 atomique : anatomie, filet, dreadlocks, plaques, biomask, bras du plasmacaster, canon, tube, gantelet, lames et trophées restent séparés."
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
                    weaponIds={["plasma-caster", "wristblades"]}
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
                  Quinze textures anatomiques et huit mèches autonomes partagent
                  le même squelette 256×384. Les pivots restent identiques dans
                  l’aperçu et en mission.
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
                          <figcaption>Plaque OpenAI · corps entier</figcaption>
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
                          <small>Projection jouable · deux armes / deux outils</small>
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
                              Compromis runtime, non attesté :{" "}
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
                              ].join(" · ")} complète les slots obligatoires du moteur.
                            </p>
                          )}
                        </div>
                      )}
                    </article>
                  )}
                  <CatalogueHunterBrowser
                    selectedEntryId={selectedCatalogueEntryId}
                    onSelect={selectCatalogueHunter}
                  />
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
                  detail="Le faisceau du plasmacaster et le réticule utilisent la même optique en aperçu et en mission"
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
                  <span>Archive franchise V16</span>
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
                          ARCHIVE V16 · NON JOUABLE
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
        <section className="screen panel-screen" aria-labelledby="codex-title">
          <div className="screen-safe">
            <PanelHeader
              eyebrow="Biomask // Archives interprétées"
              title="Codex de chasse"
              subtitle="Les entrées distinguent le noyau de l’univers des éléments originaux créés pour cette campagne. Le code juge une chasse, pas une morale humaine."
              id="codex-title"
              onBack={() => go(stationReturnScreen)}
            />
            <EnemyBestiaryV8 />
            <section className="visual-codex-gallery" aria-label="Archives visuelles OpenAI V6">
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
                        : "Scannez la cible ou terminez le contrat associé pour décoder cette archive."}
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
      )}

      {screen === "mission" && selectedMission && (
        <HuntCanvas
          mission={selectedMission}
          encounterRun={save.missionProgress[selectedMission.id].attempts}
          loadout={save.loadout}
          inventory={save.inventory}
          appearance={save.appearance}
          difficulty={save.settings.difficultyId}
          reducedGore={save.settings.reducedGore}
          screenShake={save.settings.screenShake}
          highContrastVision={save.settings.highContrastVision}
          onSound={playGameplaySound}
          onFinish={completeMission}
          onAbort={(result) => {
            persist(applyMissionResult(save, result));
            setLastResult(null);
            setSelectedMission(null);
            go("ship");
          }}
        />
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
                ? "Le trophée rejoint le vaisseau. Le clan mesure désormais la valeur de cette chasse."
                : "Une proie digne ne disparaît pas. Ajustez votre arsenal et revenez."}
            </p>
            <div className="debrief-stats">
              <DebriefStat label="Score" value={lastResult.score.toString()} />
              <DebriefStat
                label="Temps"
                value={formatTime(lastResult.elapsedSeconds)}
              />
              <DebriefStat label="Scans" value={lastResult.scans.toString()} />
              <DebriefStat
                label="Trophée"
                value={
                  lastResult.trophyClaims.length > 0
                    ? `${lastResult.trophyClaims.length} · ${qualityLabel(lastResult)}`
                    : qualityLabel(lastResult)
                }
              />
            </div>
            <div className="debrief-actions">
              <button
                type="button"
                className="alien-button"
                onClick={() => {
                  setSelectedMission(null);
                  go("ship");
                }}
              >
                Retour au vaisseau
              </button>
              <button
                type="button"
                className="ghost-button"
                onClick={() => setScreen("mission")}
              >
                Rejouer la chasse
              </button>
            </div>
          </div>
        </section>
      )}

      {trophyWorkshop && (
        <TrophyWorkshop
          action={trophyWorkshop.action}
          trophyId={trophyWorkshop.trophyId}
          trophyName={trophyWorkshop.trophyName}
          trophyImageUrl={trophyWorkshop.trophyImageUrl}
          onComplete={completeTrophyWorkshop}
          onCancel={() => setTrophyWorkshop(null)}
        />
      )}

      {settingsOpen && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) {
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
                onChange={(checked) =>
                  updateSettings({ masterVolume: checked ? 0.8 : 0 })
                }
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
            </div>
            <div className="modal-actions">
              <button
                type="button"
                className="ghost-button danger"
                onClick={resetProgress}
              >
                {resetArmed
                  ? "Confirmer la réinitialisation"
                  : "Réinitialiser la progression"}
              </button>
              <button
                type="button"
                className="alien-button small"
                onClick={() => {
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
              : `Aperçu modulaire de ${preset.name}`
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
