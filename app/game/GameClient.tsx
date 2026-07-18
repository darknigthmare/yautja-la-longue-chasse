"use client";

/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import HuntCanvas from "./HuntCanvas";
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
  DifficultyId,
  GameSettings,
  GearId,
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

function missionBackground(mission: MissionDefinition): string {
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
  const audioRef = useRef<GameAudio | null>(null);

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
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(timeout);
  }, [toast]);

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
              <img
                className="hero-hunter"
                src="/game/sprites/hunter.webp"
                alt=""
              />
              <span className="laser-sight">
                <i />
                <i />
                <i />
              </span>
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
            <img
              className="hub-hunter"
              src="/game/sprites/hunter.webp"
              alt=""
              aria-hidden="true"
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
                <img src="/game/sprites/hunter.webp" alt="Chasseur Yautja" />
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
              {MISSIONS.map((mission) => {
                const records = save.trophies
                  .filter((trophy) => trophy.missionId === mission.id)
                  .sort((a, b) => b.score - a.score);
                const best = records[0];
                return best ? (
                  <article className="trophy-card" key={mission.id}>
                    <div className="trophy-skull" aria-hidden="true">
                      {mission.targetKind === "human"
                        ? "☠"
                        : mission.targetKind === "beast"
                          ? "♜"
                          : "◈"}
                    </div>
                    <p className="mission-planet">{mission.planetName}</p>
                    <h3>{mission.trophy.name}</h3>
                    <p>{mission.trophy.description}</p>
                    <span className="trophy-score">
                      {best.quality.toUpperCase()} · {best.score} PTS
                    </span>
                  </article>
                ) : (
                  <article className="trophy-card empty" key={mission.id}>
                    <div>
                      <strong>EMPLACEMENT {mission.order}</strong>
                      <p>La proie attend encore son chasseur.</p>
                    </div>
                  </article>
                );
              })}
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
          difficulty={save.settings.difficultyId}
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
                value={qualityLabel(lastResult)}
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
