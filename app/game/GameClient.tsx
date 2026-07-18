"use client";

/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import HunterRigPreview from "./HunterRigPreview";
import HuntCanvas from "./HuntCanvas";
import {
  HUNTER_PRESET_BY_ID,
  HUNTER_PRESETS,
  appearanceForPreset,
  type HunterLorePresetId,
  type HunterMedia,
} from "./hunterLore";
import {
  HUNTER_ASSET_ROOT_V3,
  hunterBodyFullPath,
} from "./hunterVisuals";
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
import { GameAudio } from "./sound";
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
  MissionDefinition,
  MissionResult,
  SaveGame,
  WeaponId,
} from "./types";

type Screen =
  | "title"
  | "ship"
  | "map"
  | "armory"
  | "customization"
  | "trophies"
  | "codex"
  | "briefing"
  | "mission"
  | "debrief";

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

const MASK_OPTIONS: ReadonlyArray<{
  id: BiomaskId | null;
  label: string;
  detail: string;
  image?: string;
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
    image: `${HUNTER_ASSET_ROOT_V3}/masks/feral.webp`,
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

function missionBackground(mission: MissionDefinition): string {
  if (mission.biome === "jungle") {
    return "/game/assets/v2/environments/jungle/layers/far-lake.webp";
  }
  if (mission.biome === "volcano") return "/game/backgrounds/volcanic.webp";
  return `/game/backgrounds/${mission.biome}.webp`;
}

function targetSprite(mission: MissionDefinition): string {
  if (mission.targetKind === "beast") return "/game/sprites/cryostalker.webp";
  if (mission.targetKind === "yautja") return "/game/sprites/bad-blood.webp";
  return "/game/sprites/mercenary.webp";
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
  const [lastResult, setLastResult] = useState<MissionResult | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [resetArmed, setResetArmed] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [previewMaskWorn, setPreviewMaskWorn] = useState(true);
  const [previewGauntletOpen, setPreviewGauntletOpen] = useState(false);
  const [previewBladesExtended, setPreviewBladesExtended] = useState(false);
  const [previewAiming, setPreviewAiming] = useState(false);
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
    audioRef.current?.setMuted(save.settings.masterVolume === 0);
  }, [save.settings.masterVolume]);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
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
      persist({
        ...save,
        loadout: { ...save.loadout, armorId },
      });
      void playSound("select");
    },
    [persist, playSound, save],
  );

  const selectWeapon = useCallback(
    (weaponId: WeaponId) => {
      if (!save.inventory.unlockedWeaponIds.includes(weaponId)) return;
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
      });
      void playSound("select");
    },
    [persist, playSound, save],
  );

  const selectGear = useCallback(
    (gearId: GearId) => {
      if (!save.inventory.unlockedGearIds.includes(gearId)) return;
      const other =
        save.loadout.gearIds.find((id) => id !== gearId) ?? "motion-sensor";
      persist({
        ...save,
        loadout: {
          ...save.loadout,
          gearIds: [gearId, other],
        },
      });
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
      persist({
        ...save,
        appearance,
      });
      void playSound("select");
    },
    [persist, playSound, save],
  );

  const selectHunterPreset = useCallback(
    (presetId: HunterLorePresetId) => {
      const preset = HUNTER_PRESETS.find((entry) => entry.id === presetId);
      if (!preset) return;
      const appearance = appearanceForPreset(presetId);
      if (
        appearance.trophyAdornmentId === "skull-spine" &&
        save.trophies.length === 0
      ) {
        appearance.trophyAdornmentId = "none";
      }
      const armorId = save.inventory.unlockedArmorIds.includes(
        preset.recommendedArmorId,
      )
        ? preset.recommendedArmorId
        : save.loadout.armorId;
      const signatureSecondary = preset.signatureWeaponIds.find(
        (weaponId) =>
          weaponId !== "wristblades" &&
          save.inventory.unlockedWeaponIds.includes(weaponId),
      );
      const signatureGearIds = preset.signatureGearIds.filter((gearId) =>
        save.inventory.unlockedGearIds.includes(gearId),
      );
      const resolvedGearIds = [
        ...new Set([...signatureGearIds, ...save.loadout.gearIds]),
      ].slice(0, 2) as [GearId, GearId];

      persist({
        ...save,
        appearance,
        loadout: {
          ...save.loadout,
          armorId,
          weaponIds: signatureSecondary
            ? ["wristblades", signatureSecondary]
            : save.loadout.weaponIds,
          gearIds:
            resolvedGearIds.length === 2
              ? resolvedGearIds
              : save.loadout.gearIds,
        },
      });
      setPreviewMaskWorn(appearance.biomaskId !== null);
      setToast(`${preset.name} · configuration ${preset.year} chargée.`);
      void playSound("select");
    },
    [persist, playSound, save],
  );

  const resetProgress = useCallback(() => {
    if (!resetArmed) {
      setResetArmed(true);
      return;
    }
    const fresh = defaultSave();
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

  const completedCount = useMemo(
    () =>
      MISSIONS.filter(
        (mission) =>
          save.missionProgress[mission.id].status === "completed",
      ).length,
    [save.missionProgress],
  );

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
                    onClick={() => go("map")}
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
        <section className="screen hub-screen" aria-labelledby="hub-title">
          <div className="hub-stage">
            <h1 className="sr-only" id="hub-title">
              Vaisseau de chasse
            </h1>
            <p className="hub-message">
              <strong>CONSOLE DU CLAN :</strong>{" "}
              {completedCount === 0
                ? "Trois signatures dignes ont été détectées. Choisissez votre première chasse."
                : completedCount < MISSIONS.length
                  ? "Votre mur porte la trace de la chasse. Une proie plus dangereuse vous attend."
                  : "Le Paria a été jugé. La Longue Chasse reste ouverte aux meilleurs scores."}
            </p>
            <HunterRigPreview
              className="hub-hunter-rig"
              appearance={save.appearance}
              armorId={save.loadout.armorId}
              weaponIds={save.loadout.weaponIds}
              gearIds={save.loadout.gearIds}
              size="clamp(330px, 36vw, 470px)"
            />
            <div className="campaign-progress">
              <p>Rite de la Longue Chasse</p>
              <div className="progress-track" aria-hidden="true">
                <span
                  style={{
                    width: `${(completedCount / MISSIONS.length) * 100}%`,
                  }}
                />
              </div>
              <div className="progress-caption">
                <span>{completedCount} trophée(s)</span>
                <span>{MISSIONS.length}</span>
              </div>
            </div>
            <nav className="hub-nav" aria-label="Zones du vaisseau">
              <HubAction
                icon="◉"
                title="Carte galactique"
                detail="Choisir une proie et un monde"
                onClick={() => go("map")}
              />
              <HubAction
                icon="⌁"
                title="Armurerie"
                detail="Armes, armure et équipement"
                onClick={() => go("armory")}
              />
              <HubAction
                icon="Y"
                title="Quartier du chasseur"
                detail="Biomask, peau, dreadlocks et parures"
                onClick={() => go("customization")}
              />
              <HubAction
                icon="◇"
                title="Mur des trophées"
                detail={`${save.trophies.length} prise(s) enregistrée(s)`}
                onClick={() => go("trophies")}
              />
              <HubAction
                icon="⌬"
                title="Archives du biomask"
                detail={`${save.codex.unlockedEntryIds.length} entrées décodées`}
                onClick={() => go("codex")}
              />
            </nav>
          </div>
        </section>
      )}

      {screen === "map" && (
        <section className="screen panel-screen" aria-labelledby="map-title">
          <div className="screen-safe">
            <PanelHeader
              eyebrow="Navigation // Cibles détectées"
              title="Carte galactique"
              subtitle="Chaque monde neutralise une force de votre technologie. Étudiez la cible avant de choisir votre arsenal."
              id="map-title"
              onBack={() => go("ship")}
            />
            <div className="mission-grid">
              {MISSIONS.map((mission) => {
                const progress = save.missionProgress[mission.id];
                const locked = progress.status === "locked";
                return (
                  <article
                    className={`mission-card${locked ? " locked" : ""}`}
                    key={mission.id}
                  >
                    <div className="mission-art">
                      <img
                        src={missionBackground(mission)}
                        alt={`Paysage de ${mission.planetName}`}
                      />
                      <span className="mission-index">
                        {mission.order.toString().padStart(2, "0")}
                      </span>
                      <span className="mission-status">
                        {locked
                          ? "Signal verrouillé"
                          : progress.status === "completed"
                            ? `Record ${progress.bestScore}`
                            : "Contrat disponible"}
                      </span>
                    </div>
                    <div className="mission-body">
                      <p className="mission-planet">{mission.planetName}</p>
                      <h2>{mission.title}</h2>
                      <p>{mission.subtitle}</p>
                      <div
                        className="threat-line"
                        aria-label={`Menace ${mission.threatLevel} sur 4`}
                      >
                        {[1, 2, 3, 4].map((level) => (
                          <span
                            className={
                              level <= mission.threatLevel ? "active" : ""
                            }
                            key={level}
                          />
                        ))}
                        <small>menace</small>
                      </div>
                      <div className="mission-meta">
                        <MetaCell label="Proie" value={mission.targetName} />
                        <MetaCell
                          label="Temps rituel"
                          value={formatTime(mission.parTimeSeconds)}
                        />
                        <MetaCell
                          label="Honneur"
                          value={`+${mission.baseRewards.honor}`}
                        />
                        <MetaCell
                          label="Marques"
                          value={`+${mission.baseRewards.clanMarks}`}
                        />
                      </div>
                      <button
                        type="button"
                        className="card-button"
                        disabled={locked}
                        onClick={() => chooseMission(mission)}
                      >
                        {locked ? "Trophée précédent requis" : "Étudier la chasse"}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>
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
                <img
                  className="target-cutout"
                  src={targetSprite(selectedMission)}
                  alt=""
                />
                <div className="briefing-visual-copy">
                  <small>Cible Apex // niveau {selectedMission.threatLevel}</small>
                  <strong>{selectedMission.targetName}</strong>
                </div>
              </div>
              <div className="briefing-panel">
                <p className="mission-planet">{selectedMission.planetName}</p>
                <h1 id="briefing-title">{selectedMission.title}</h1>
                <p>{selectedMission.briefing}</p>
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
                    onClick={() => go("armory")}
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
              onBack={() => go(selectedMission ? "briefing" : "ship")}
            />
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
                    return (
                      <EquipmentCard
                        key={weapon.id}
                        type={weapon.attackType}
                        name={weapon.name}
                        description={weapon.description}
                        stats={[
                          `DMG ${weapon.damage}`,
                          `POIDS ${weapon.weight}`,
                          `HONNEUR ${weapon.honorPower}`,
                        ]}
                        selected={selected}
                        unlocked={unlocked}
                        lockedText={`${weapon.unlock.minimumHonor} honneur requis`}
                        onSelect={() => selectWeapon(weapon.id)}
                      />
                    );
                  })}
                </ArmorySection>
                <ArmorySection title="Armures de clan">
                  {ARMORS.map((armor) => {
                    const unlocked =
                      save.inventory.unlockedArmorIds.includes(armor.id);
                    return (
                      <EquipmentCard
                        key={armor.id}
                        type="armure"
                        name={armor.name}
                        description={armor.description}
                        stats={[
                          `PV ${armor.maxHealth}`,
                          `ÉNERGIE ${armor.maxEnergy}`,
                          `CAP. ${armor.carryingCapacity}`,
                        ]}
                        selected={save.loadout.armorId === armor.id}
                        unlocked={unlocked}
                        lockedText={`${armor.unlock.minimumHonor} honneur requis`}
                        onSelect={() => selectArmor(armor.id)}
                      />
                    );
                  })}
                </ArmorySection>
                <ArmorySection title="Équipement tactique">
                  {GEAR.map((gear) => {
                    const unlocked =
                      save.inventory.unlockedGearIds.includes(gear.id);
                    return (
                      <EquipmentCard
                        key={gear.id}
                        type={gear.role}
                        name={gear.name}
                        description={gear.description}
                        stats={[
                          `${gear.charges} CHARGES`,
                          `POIDS ${gear.weight}`,
                          `PORTÉE ${gear.rangePx}`,
                        ]}
                        selected={save.loadout.gearIds.includes(gear.id)}
                        unlocked={unlocked}
                        lockedText={`${gear.unlock.minimumHonor} honneur requis`}
                        onSelect={() => selectGear(gear.id)}
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
              onBack={() => go("ship")}
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
                  title="Archives transmédia"
                  detail={`${HUNTER_PRESETS.length} chasseurs · films, crossovers, jeux, comics et roman`}
                >
                  {HUNTER_PRESETS.map((preset) => {
                    const selected = save.appearance.presetId === preset.id;
                    const previewImage = preset.biomaskId
                      ? `${HUNTER_ASSET_ROOT_V3}/masks/${preset.biomaskId}.webp`
                      : hunterBodyFullPath(preset.bodyMorphId);
                    const continuity =
                      preset.continuity === "canon"
                        ? "CANON FILM"
                        : preset.continuity === "crossover"
                          ? "CROSSOVER"
                          : "UNIVERS ÉTENDU";
                    return (
                      <button
                        type="button"
                        className={`hunter-preset-card${selected ? " selected" : ""}`}
                        aria-pressed={selected}
                        key={preset.id}
                        onClick={() => selectHunterPreset(preset.id)}
                        title={preset.fidelityNote}
                      >
                        <span className="hunter-preset-art" aria-hidden="true">
                          <img src={previewImage} alt="" />
                        </span>
                        <span className="hunter-preset-copy">
                          <small>
                            {PRESET_MEDIA_LABEL[preset.media]} · {preset.year}
                          </small>
                          <strong>{preset.name}</strong>
                          <em>{preset.work}</em>
                        </span>
                        <span className="hunter-preset-continuity">
                          {"textInterpretation" in preset &&
                          preset.textInterpretation
                            ? "INTERPRÉTATION TEXTE"
                            : continuity}
                        </span>
                      </button>
                    );
                  })}
                  {activeHunterPreset && (
                    <article
                      className="hunter-preset-dossier"
                      aria-live="polite"
                    >
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
                    </article>
                  )}
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
              onBack={() => go("ship")}
            />
            <div className="trophy-grid">
              {trophyRecords.length > 0 ? (
                trophyRecords.map((trophy) => {
                  const mission = MISSIONS.find(
                    (entry) => entry.id === trophy.missionId,
                  );
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
                  return (
                    <article className="trophy-card" key={trophy.id}>
                      <div className="trophy-art" aria-hidden="true">
                        <img
                          src={
                            trophy.partId === "mask"
                              ? "/game/assets/v2/actors/yautja/hunter/masks/scarred.webp"
                              : "/game/assets/v2/actors/yautja/hunter/trophies/skull-spine.webp"
                          }
                          alt=""
                        />
                      </div>
                      <p className="mission-planet">
                        {mission?.planetName ?? "Monde inconnu"}
                      </p>
                      <h3>{trophy.targetName}</h3>
                      <p>
                        {trophy.partId === "mask"
                          ? "Biomask arraché à un adversaire du clan."
                          : trophy.partId === "skull-and-spine"
                            ? "Crâne et colonne extraits après une chasse honorable."
                            : "Crâne prélevé, nettoyé et consigné dans les archives."}
                      </p>
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
              onBack={() => go("ship")}
            />
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
          loadout={save.loadout}
          appearance={save.appearance}
          difficulty={save.settings.difficultyId}
          reducedGore={save.settings.reducedGore}
          screenShake={save.settings.screenShake}
          onFinish={completeMission}
          onAbort={() => {
            setSelectedMission(null);
            go("map");
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

function HubAction({
  icon,
  title,
  detail,
  onClick,
}: {
  icon: string;
  title: string;
  detail: string;
  onClick: () => void;
}) {
  return (
    <button type="button" className="hub-action" onClick={onClick}>
      <span className="hub-action-icon" aria-hidden="true">
        {icon}
      </span>
      <span>
        <strong>{title}</strong>
        <small>{detail}</small>
      </span>
      <span className="hub-action-arrow" aria-hidden="true">
        ›
      </span>
    </button>
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

function MetaCell({ label, value }: { label: string; value: string }) {
  return (
    <span className="meta-cell">
      <small>{label}</small>
      <strong>{value}</strong>
    </span>
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
}: {
  type: string;
  name: string;
  description: string;
  stats: string[];
  selected: boolean;
  unlocked: boolean;
  lockedText: string;
  onSelect: () => void;
}) {
  return (
    <article
      className={`equipment-card${selected ? " selected" : ""}${!unlocked ? " locked" : ""}`}
    >
      <p className="equipment-type">{type}</p>
      <h3>{name}</h3>
      <p>{description}</p>
      <div className="equipment-stats">
        {stats.map((stat) => (
          <span key={stat}>{stat}</span>
        ))}
      </div>
      <button
        type="button"
        className="equipment-select"
        disabled={!unlocked}
        onClick={onSelect}
      >
        {!unlocked ? lockedText : selected ? "Équipé" : "Équiper"}
      </button>
    </article>
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
  glyph,
  swatch,
  selected,
  locked = false,
  onSelect,
}: {
  label: string;
  detail?: string;
  image?: string;
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
        {image ? <img src={image} alt="" /> : null}
        {swatch ? (
          <i
            className="appearance-swatch"
            style={{ backgroundColor: swatch }}
          />
        ) : null}
        {!image && !swatch ? <b>{glyph ?? "Y"}</b> : null}
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
