"use client";

/* eslint-disable @next/next/no-img-element -- generated ship art has per-master dimensions */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { controlActionShortcut } from "./controlBindingLabels";
import HunterRigPreview from "./HunterRigPreview";
import TrainingDrill from "./TrainingDrill";
import {
  DEFAULT_SHIP_ID,
  SHIP_CATALOGUE,
  SHIP_CATALOGUE_PAGE_SIZE,
  shipProfileAssetPath,
  shipForId,
  shipTopAssetPath,
  type ShipId,
  type ShipMedia,
} from "./shipCatalogue";
import {
  DEFAULT_CONTROL_BINDINGS,
  matchingControlActions,
  type ControlBindings,
} from "./systems/controlBindings";
import {
  TRAINING_LABELS,
  TROPHY_METHOD_LABELS,
  TROPHY_SPECIES_LABELS,
  createDefaultShipProgression,
  evaluateShipAvailability,
  evaluateClanProgression,
  isShipUnlocked,
  loadLoadoutPreset,
  loadShipProgression,
  recordTrainingResult,
  resolveMedbayTreatment,
  saveLoadoutPreset,
  selectShip,
  startMedbayTreatment,
  synchronizeShipProgression,
  unlockAvailableShips,
  writeShipProgression,
  type ShipLoadoutSlotId,
  type ShipProgressionState,
  type ShipRoomId,
  type TrainingDisciplineId,
} from "./systems/progression";
import type {
  HunterAppearance,
  Loadout,
  SaveGame,
} from "./types";

export interface ShipRoomDefinition {
  id: ShipRoomId;
  glyph: string;
  label: string;
  shortLabel: string;
  description: string;
}

export const SHIP_ROOMS: readonly ShipRoomDefinition[] = [
  {
    id: "bridge-map",
    glyph: "◉",
    label: "Pont et carte galactique",
    shortLabel: "Pont",
    description:
      "Choisir une proie, suivre le rang du clan et préparer la prochaine route.",
  },
  {
    id: "armory",
    glyph: "⌁",
    label: "Armurerie",
    shortLabel: "Armurerie",
    description:
      "Assembler armes, armures, outils et apparence dans quatre loadouts.",
  },
  {
    id: "hangar",
    glyph: "▱",
    label: "Hangar et console de flotte",
    shortLabel: "Hangar",
    description:
      "Inspecter les coques, consulter les annexes et choisir le vaisseau actif.",
  },
  {
    id: "trophy-hall",
    glyph: "◇",
    label: "Salle des trophées",
    shortLabel: "Trophées",
    description:
      "Consigner la méthode, nettoyer, monter et exposer chaque prise.",
  },
  {
    id: "medbay",
    glyph: "✚",
    label: "Medbay",
    shortLabel: "Medbay",
    description:
      "Traiter les blessures entre deux chasses sans altérer la sauvegarde de mission.",
  },
  {
    id: "training",
    glyph: "⌖",
    label: "Salle d’entraînement",
    shortLabel: "Entraînement",
    description:
      "Éprouver ciblage, mobilité, camouflage et armes rituelles.",
  },
  {
    id: "archives",
    glyph: "⌬",
    label: "Archives du clan",
    shortLabel: "Archives",
    description:
      "Relire le codex, les rites accomplis et les statistiques de chasse.",
  },
] as const;

interface HubActionDefinition {
  id: string;
  label: string;
  detail: string;
  disabled?: boolean;
  run: () => void | Promise<void>;
}

export interface ShipHubProps {
  save: SaveGame;
  controlBindings?: ControlBindings;
  /** Omit for a self-persisting sidecar; provide for controlled integration. */
  progression?: ShipProgressionState;
  initialRoomId?: ShipRoomId;
  /** Embedded installations return to the physical deck instead of the legacy bridge. */
  embedded?: boolean;
  /** Prevent controls from reaching an installation behind settings or another modal. */
  suspended?: boolean;
  onTrainingActiveChange?: (active: boolean) => void;
  autoFocus?: boolean;
  gamepadEnabled?: boolean;
  onProgressionChange?: (state: ShipProgressionState) => void;
  onSelectedShipChange?: (shipId: ShipId) => void;
  onRoomChange?: (roomId: ShipRoomId) => void;
  onOpenDeck?: () => void;
  onOpenMap: () => void;
  onOpenArmory: () => void;
  onOpenTrophies: () => void;
  onOpenArchives: () => void;
  onOpenCustomization: () => void;
  onApplyLoadout?: (
    loadout: Loadout,
    appearance: HunterAppearance,
  ) => void;
  /**
   * Return a score when an external drill completes. Without this callback,
   * the hub opens its autonomous, playable training drill.
   */
  onTrainingRequested?: (
    disciplineId: TrainingDisciplineId,
  ) => number | void | Promise<number | void>;
  onNotify?: (message: string) => void;
}

const STAGE_LABELS: Readonly<
  Record<ShipProgressionState["trophies"][number]["stage"], string>
> = {
  raw: "Brut",
  cleaning: "Nettoyage",
  cleaned: "Nettoyé",
  mounting: "Montage",
  mounted: "Monté",
  displayed: "Exposé",
};

const SLOT_ORDER: readonly ShipLoadoutSlotId[] = [
  "hunt-1",
  "hunt-2",
  "hunt-3",
  "hunt-4",
];

interface TrainingSession {
  disciplineId: TrainingDisciplineId;
  seed: number;
}

function roomIndex(roomId: ShipRoomId): number {
  return Math.max(
    0,
    SHIP_ROOMS.findIndex(({ id }) => id === roomId),
  );
}

function percent(value: number): string {
  return `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%`;
}

function formatDuration(seconds: number): string {
  const whole = Math.max(0, Math.ceil(seconds));
  const minutes = Math.floor(whole / 60);
  const remainder = whole % 60;
  return minutes > 0
    ? `${minutes} min ${remainder.toString().padStart(2, "0")} s`
    : `${remainder} s`;
}

export default function ShipHub({
  save,
  controlBindings = DEFAULT_CONTROL_BINDINGS,
  progression: controlledProgression,
  initialRoomId = "bridge-map",
  embedded = false,
  suspended = false,
  onTrainingActiveChange,
  autoFocus = true,
  gamepadEnabled = true,
  onProgressionChange,
  onSelectedShipChange,
  onRoomChange,
  onOpenDeck,
  onOpenMap,
  onOpenArmory,
  onOpenTrophies,
  onOpenArchives,
  onOpenCustomization,
  onApplyLoadout,
  onTrainingRequested,
  onNotify,
}: ShipHubProps) {
  const [activeRoomId, setActiveRoomId] =
    useState<ShipRoomId>(initialRoomId);
  const [actionIndex, setActionIndex] = useState(0);
  const [hangarMedia, setHangarMedia] = useState<ShipMedia | "all">("all");
  const [hangarPage, setHangarPage] = useState(0);
  const [inspectedShipId, setInspectedShipId] =
    useState<ShipId>(controlledProgression?.selectedShipId ?? DEFAULT_SHIP_ID);
  const [localProgression, setLocalProgression] =
    useState<ShipProgressionState>(() =>
      createDefaultShipProgression(save, save.updatedAt),
    );
  const [statusMessage, setStatusMessage] = useState(
    "Console du vaisseau prête.",
  );
  const [trainingSession, setTrainingSession] =
    useState<TrainingSession | null>(null);
  const rootRef = useRef<HTMLElement | null>(null);
  const actionButtonRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const gamepadStateRef = useRef({ previous: Array.from({ length: 6 }, () => false), ready: false });

  // A nested drill owns focus and input; let the host disable its outer toolbar.
  useEffect(() => {
    onTrainingActiveChange?.(trainingSession !== null);
    return () => onTrainingActiveChange?.(false);
  }, [onTrainingActiveChange, trainingSession]);

  const progression =
    controlledProgression ?? localProgression;
  const selectedShipSyncRef = useRef(progression.selectedShipId);

  const notify = useCallback(
    (message: string) => {
      setStatusMessage(message);
      onNotify?.(message);
    },
    [onNotify],
  );

  const commitProgression = useCallback(
    (candidate: ShipProgressionState) => {
      const synchronized = synchronizeShipProgression(candidate, save);
      const snapshot =
        controlledProgression === undefined
          ? writeShipProgression(synchronized, save)
          : synchronized;
      if (controlledProgression === undefined) {
        setLocalProgression(snapshot);
      }
      onProgressionChange?.(snapshot);
      onSelectedShipChange?.(snapshot.selectedShipId);
      return snapshot;
    },
    [
      controlledProgression,
      onProgressionChange,
      onSelectedShipChange,
      save,
    ],
  );

  useEffect(() => {
    if (controlledProgression !== undefined) return;
    const hydrationTask = window.setTimeout(() => {
      const loaded = loadShipProgression(save);
      setLocalProgression(loaded);
      onProgressionChange?.(loaded);
      onSelectedShipChange?.(loaded.selectedShipId);
    }, 0);
    return () => window.clearTimeout(hydrationTask);
  }, [
    controlledProgression,
    onProgressionChange,
    onSelectedShipChange,
    save,
  ]);

  useEffect(() => {
    if (!autoFocus || suspended) return;
    rootRef.current?.focus({ preventScroll: true });
  }, [autoFocus, suspended]);

  useEffect(() => {
    if (selectedShipSyncRef.current === progression.selectedShipId) return;
    selectedShipSyncRef.current = progression.selectedShipId;
    setInspectedShipId(progression.selectedShipId);
    setHangarMedia("all");
    const selectedIndex = SHIP_CATALOGUE.findIndex(
      ({ id }) => id === progression.selectedShipId,
    );
    setHangarPage(
      Math.max(0, Math.floor(selectedIndex / SHIP_CATALOGUE_PAGE_SIZE)),
    );
  }, [progression.selectedShipId]);

  useEffect(() => {
    // Trophy preparation is exclusively resolved by TrophyWorkshop. The hub
    // clock remains useful for the medbay sidecar, but can no longer advance
    // legacy cleaning or mounting timers behind the mini-game.
    if (progression.medbay.status !== "treating") return;
    const timer = window.setInterval(() => {
      const tick = Date.now();
      const next = resolveMedbayTreatment(
        progression,
        new Date(tick).toISOString(),
      );
      if (next !== progression) {
        commitProgression(next);
      }
    }, 1_000);
    return () => window.clearInterval(timer);
  }, [
    commitProgression,
    progression.medbay.status,
    progression.trophies,
    progression,
  ]);

  const clan = useMemo(
    () => evaluateClanProgression(save, progression),
    [progression, save],
  );
  const activeRoom = SHIP_ROOMS[roomIndex(activeRoomId)];
  const hangarFilteredShips = useMemo(
    () =>
      hangarMedia === "all"
        ? SHIP_CATALOGUE
        : SHIP_CATALOGUE.filter(({ media }) => media === hangarMedia),
    [hangarMedia],
  );
  const hangarPageCount = Math.max(
    1,
    Math.ceil(hangarFilteredShips.length / SHIP_CATALOGUE_PAGE_SIZE),
  );
  const safeHangarPage = Math.min(hangarPage, hangarPageCount - 1);
  const visibleHangarShips = useMemo(
    () =>
      hangarFilteredShips.slice(
        safeHangarPage * SHIP_CATALOGUE_PAGE_SIZE,
        (safeHangarPage + 1) * SHIP_CATALOGUE_PAGE_SIZE,
      ),
    [hangarFilteredShips, safeHangarPage],
  );

  const selectRoom = useCallback(
    (roomId: ShipRoomId) => {
      setActiveRoomId(roomId);
      setActionIndex(0);
      onRoomChange?.(roomId);
      notify(`${SHIP_ROOMS[roomIndex(roomId)].label} sélectionné.`);
    },
    [notify, onRoomChange],
  );

  const moveRoom = useCallback(
    (direction: -1 | 1) => {
      const index = roomIndex(activeRoomId);
      const nextIndex =
        (index + direction + SHIP_ROOMS.length) % SHIP_ROOMS.length;
      selectRoom(SHIP_ROOMS[nextIndex].id);
    },
    [activeRoomId, selectRoom],
  );

  const recordCompletedTraining = useCallback(
    (disciplineId: TrainingDisciplineId, score: number) => {
      const next = recordTrainingResult(
        progression,
        disciplineId,
        score,
      );
      const recordedScore = next.training[disciplineId].lastScore;
      commitProgression(next);
      notify(
        `${TRAINING_LABELS[disciplineId]} : résultat ${recordedScore}/100 consigné.`,
      );
    },
    [commitProgression, notify, progression],
  );

  const requestTraining = useCallback(
    async (disciplineId: TrainingDisciplineId) => {
      if (!onTrainingRequested) {
        const record = progression.training[disciplineId];
        setTrainingSession({
          disciplineId,
          seed: record.attempts,
        });
        notify(
          `${TRAINING_LABELS[disciplineId]} : épreuve autonome prête.`,
        );
        return;
      }

      try {
        const externalScore = await onTrainingRequested(disciplineId);
        if (
          typeof externalScore === "number" &&
          Number.isFinite(externalScore)
        ) {
          recordCompletedTraining(disciplineId, externalScore);
        } else {
          notify(
            `${TRAINING_LABELS[disciplineId]} : aucun résultat externe consigné.`,
          );
        }
      } catch {
        notify(
          `${TRAINING_LABELS[disciplineId]} : épreuve externe indisponible.`,
        );
      }
    },
    [
      notify,
      onTrainingRequested,
      progression.training,
      recordCompletedTraining,
    ],
  );

  const completeAutonomousTraining = useCallback(
    (score: number) => {
      if (!trainingSession) return;
      recordCompletedTraining(trainingSession.disciplineId, score);
      setTrainingSession(null);
    },
    [recordCompletedTraining, trainingSession],
  );

  const cancelAutonomousTraining = useCallback(() => {
    if (!trainingSession) return;
    notify(
      `${TRAINING_LABELS[trainingSession.disciplineId]} : épreuve abandonnée, aucun score consigné.`,
    );
    setTrainingSession(null);
  }, [notify, trainingSession]);

  const actions = useMemo<HubActionDefinition[]>(() => {
    const firstEmptyPreset =
      progression.loadoutPresets.find(({ loadout }) => loadout === null) ??
      progression.loadoutPresets[0];

    if (activeRoomId === "bridge-map") {
      return [
        ...(onOpenDeck
          ? [
              {
                id: "explore-physical-deck",
                label: "Explorer physiquement le vaisseau",
                detail: "Marcher jusqu’aux consoles, grimper et interagir sur le pont.",
                run: onOpenDeck,
              },
            ]
          : []),
        {
          id: "open-map",
          label: "Ouvrir la carte galactique",
          detail: "Étudier les contrats et choisir une proie digne.",
          run: onOpenMap,
        },
        {
          id: "review-rites",
          label: "Consulter la progression du clan",
          detail: `${clan.completedRites.length} rite(s) accompli(s) · prestige ${clan.prestige}`,
          run: () => selectRoom("archives"),
        },
      ];
    }

    if (activeRoomId === "armory") {
      const presetActions = progression.loadoutPresets
        .filter(
          (
            preset,
          ): preset is typeof preset & {
            loadout: Loadout;
            appearance: HunterAppearance;
          } => preset.loadout !== null && preset.appearance !== null,
        )
        .map<HubActionDefinition>((preset) => ({
          id: `apply-${preset.id}`,
          label: `Charger « ${preset.name} »`,
          detail: `${preset.loadout.armorId} · ${preset.loadout.weaponIds.join(" / ")}`,
          disabled: !onApplyLoadout,
          run: () => {
            const snapshot = loadLoadoutPreset(
              progression,
              preset.id,
            );
            if (!snapshot || !onApplyLoadout) return;
            onApplyLoadout(snapshot.loadout, snapshot.appearance);
            notify(`${preset.name} chargé depuis l’armurerie.`);
          },
        }));
      return [
        {
          id: "open-armory",
          label: "Modifier l’équipement actif",
          detail: "Armes, armure, améliorations et capacité d’emport.",
          run: onOpenArmory,
        },
        {
          id: "open-customization",
          label: "Personnaliser le chasseur",
          detail: "Corps, biomask, dreads, plaques et parures.",
          run: onOpenCustomization,
        },
        {
          id: "save-loadout",
          label: `Enregistrer dans ${firstEmptyPreset.name}`,
          detail: "Mémoriser ensemble loadout et apparence.",
          run: () => {
            commitProgression(
              saveLoadoutPreset(
                progression,
                firstEmptyPreset.id,
                firstEmptyPreset.name,
                save.loadout,
                save.appearance,
              ),
            );
            notify(`${firstEmptyPreset.name} enregistré.`);
          },
        },
        ...presetActions,
      ];
    }

    if (activeRoomId === "hangar") {
      const mediaLabels: Readonly<Record<ShipMedia | "all", string>> = {
        all: "Tous",
        film: "Films",
        game: "Jeux",
        comic: "Comics",
        novel: "Romans",
        collectible: "Produits dérivés",
        project: "Créations du projet",
      };
      const filterActions = (
        [
          "all",
          "film",
          "game",
          "comic",
          "novel",
          "collectible",
          "project",
        ] as const
      ).map<HubActionDefinition>((media) => ({
        id: `hangar-filter-${media}`,
        label: `${media === hangarMedia ? "● " : ""}${mediaLabels[media]}`,
        detail: `Filtrer le registre de flotte : ${mediaLabels[media].toLowerCase()}.`,
        run: () => {
          setHangarMedia(media);
          setHangarPage(0);
          const firstMatch =
            media === "all"
              ? SHIP_CATALOGUE[0]
              : SHIP_CATALOGUE.find((ship) => ship.media === media);
          if (firstMatch) setInspectedShipId(firstMatch.id);
        },
      }));
      const pageActions: HubActionDefinition[] =
        hangarPageCount > 1
          ? [
              {
                id: "hangar-page-previous",
                label: "Page précédente",
                detail: `Page ${safeHangarPage + 1}/${hangarPageCount}`,
                disabled: safeHangarPage === 0,
                run: () => {
                  const nextPage = Math.max(0, safeHangarPage - 1);
                  setHangarPage(nextPage);
                  const firstShip =
                    hangarFilteredShips[
                      nextPage * SHIP_CATALOGUE_PAGE_SIZE
                    ];
                  if (firstShip) setInspectedShipId(firstShip.id);
                },
              },
              {
                id: "hangar-page-next",
                label: "Page suivante",
                detail: `Page ${safeHangarPage + 1}/${hangarPageCount}`,
                disabled: safeHangarPage >= hangarPageCount - 1,
                run: () => {
                  const nextPage = Math.min(
                    hangarPageCount - 1,
                    safeHangarPage + 1,
                  );
                  setHangarPage(nextPage);
                  const firstShip =
                    hangarFilteredShips[
                      nextPage * SHIP_CATALOGUE_PAGE_SIZE
                    ];
                  if (firstShip) setInspectedShipId(firstShip.id);
                },
              },
            ]
          : [];
      const shipActions = visibleHangarShips.map<HubActionDefinition>(
        (ship) => {
          const availability = evaluateShipAvailability(
            progression,
            save,
            ship.id,
          );
          const unlocked = isShipUnlocked(progression, ship.id);
          const selected = progression.selectedShipId === ship.id;
          const canSelect =
            ship.selectable && (unlocked || availability.requirementsMet);
          return {
            id: `hangar-select-${ship.id}`,
            label: selected
              ? `Vaisseau actif · ${ship.shortName}`
              : canSelect
                ? `Sélectionner · ${ship.shortName}`
                : `Inspecter · ${ship.shortName}`,
            detail: !ship.selectable
              ? `${ship.originLabel} · ${ship.deckNote}`
              : canSelect
                ? `${ship.originLabel} · ${ship.kind} · ${ship.aliases.join(" / ")}`
                : `Verrouillé · ${availability.unmetLabels.join(" · ")}`,
            run: () => {
              setInspectedShipId(ship.id);
              if (!ship.selectable) {
                notify(`${ship.name} affiché comme entrée annexe.`);
                return;
              }
              if (selected) {
                notify(`${ship.name} est déjà le vaisseau actif.`);
                return;
              }
              const reconciled = unlockAvailableShips(progression, save);
              const next = selectShip(reconciled, ship.id);
              if (next === progression || next.selectedShipId !== ship.id) {
                notify(`${ship.name} reste verrouillé ; sa fiche est consultable.`);
                return;
              }
              commitProgression(next);
              notify(`${ship.name} devient le vaisseau actif.`);
            },
          };
        },
      );
      return [...filterActions, ...pageActions, ...shipActions];
    }

    if (activeRoomId === "trophy-hall") {
      return [
        {
          id: "open-trophy-ledger",
          label: "Ouvrir l’atelier des trophées",
          detail: `${save.trophies.length} trophée(s) · nettoyage, montage, exposition et rite disposent chacun d’une épreuve rituelle.`,
          run: onOpenTrophies,
        },
      ];
    }

    if (activeRoomId === "medbay") {
      const treating = progression.medbay.status === "treating";
      return [
        {
          id: "minor-treatment",
          label: "Traitement des blessures",
          detail: treating
            ? "Un protocole médical est déjà en cours."
            : "Cycle de régénération court · 30 secondes.",
          disabled: treating,
          run: () => {
            commitProgression(
              startMedbayTreatment(
                progression,
                "minor-wounds",
                30,
              ),
            );
            notify("Cycle médical court engagé.");
          },
        },
        {
          id: "acid-treatment",
          label: "Neutralisation acide",
          detail: treating
            ? "Un protocole médical est déjà en cours."
            : "Décontamination profonde · 90 secondes.",
          disabled: treating,
          run: () => {
            commitProgression(
              startMedbayTreatment(
                progression,
                "acid-burn",
                90,
              ),
            );
            notify("Décontamination acide engagée.");
          },
        },
        {
          id: "neural-treatment",
          label: "Recalibrage neural",
          detail: treating
            ? "Un protocole médical est déjà en cours."
            : "Réparer les interfaces biomask · 60 secondes.",
          disabled: treating,
          run: () => {
            commitProgression(
              startMedbayTreatment(
                progression,
                "neural-shock",
                60,
              ),
            );
            notify("Recalibrage neural engagé.");
          },
        },
      ];
    }

    if (activeRoomId === "training") {
      return (
        Object.keys(TRAINING_LABELS) as TrainingDisciplineId[]
      ).map((disciplineId) => ({
        id: `train-${disciplineId}`,
        label: TRAINING_LABELS[disciplineId],
        detail: `Record ${progression.training[disciplineId].bestScore}/100 · ${progression.training[disciplineId].attempts} essai(s)`,
        run: () => requestTraining(disciplineId),
      }));
    }

    return [
      {
        id: "open-archives",
        label: "Ouvrir le codex du biomask",
        detail: `${save.codex.unlockedEntryIds.length} entrée(s) décodée(s).`,
        run: onOpenArchives,
      },
      {
        id: "return-bridge",
        label: "Retourner au pont",
        detail: "Reprendre la navigation du vaisseau.",
        run: () => selectRoom("bridge-map"),
      },
    ];
  }, [
    activeRoomId,
    clan.completedRites.length,
    clan.prestige,
    commitProgression,
    hangarFilteredShips,
    hangarMedia,
    hangarPageCount,
    notify,
    onApplyLoadout,
    onOpenDeck,
    onOpenArchives,
    onOpenArmory,
    onOpenCustomization,
    onOpenMap,
    onOpenTrophies,
    progression,
    requestTraining,
    safeHangarPage,
    save,
    selectRoom,
    visibleHangarShips,
  ]);
  const safeActionIndex = Math.min(
    actionIndex,
    Math.max(0, actions.length - 1),
  );

  const focusAction = useCallback(
    (nextIndex: number) => {
      const count = actions.length;
      if (count === 0) return;
      const normalized = (nextIndex + count) % count;
      setActionIndex(normalized);
      actionButtonRefs.current[normalized]?.focus({
        preventScroll: true,
      });
    },
    [actions.length],
  );

  const invokeAction = useCallback(
    (index: number) => {
      const action = actions[index];
      if (!action || action.disabled) return;
      void action.run();
    },
    [actions],
  );

  useEffect(() => {
    if (
      !gamepadEnabled ||
      suspended ||
      trainingSession !== null ||
      typeof navigator === "undefined"
    ) {
      gamepadStateRef.current = { previous: Array.from({ length: 6 }, () => false), ready: false };
      return;
    }
    let animationFrame = 0;

    const poll = () => {
      const root = rootRef.current;
      const focused =
        root !== null &&
        !document.hidden && document.hasFocus() &&
        document.activeElement !== null &&
        root.contains(document.activeElement);
      const gamepad = focused
        ? navigator.getGamepads?.().find(Boolean)
        : null;
      if (gamepad) {
        const current = [
          Boolean(gamepad.buttons[14]?.pressed) ||
            (gamepad.axes[0] ?? 0) < -0.65,
          Boolean(gamepad.buttons[15]?.pressed) ||
            (gamepad.axes[0] ?? 0) > 0.65,
          Boolean(gamepad.buttons[12]?.pressed) ||
            (gamepad.axes[1] ?? 0) < -0.65,
          Boolean(gamepad.buttons[13]?.pressed) ||
            (gamepad.axes[1] ?? 0) > 0.65,
          Boolean(gamepad.buttons[0]?.pressed),
          Boolean(gamepad.buttons[1]?.pressed),
        ];
        const state = gamepadStateRef.current;
        // Render-driven effect restarts must not turn a held button into a new
        // press. Regaining focus also requires the pad to return to neutral.
        if (!state.ready) {
          state.ready = current.every((pressed) => !pressed);
        } else {
          const previous = state.previous;
          if (current[0] && !previous[0]) moveRoom(-1);
          if (current[1] && !previous[1]) moveRoom(1);
          if (current[2] && !previous[2])
            focusAction(safeActionIndex - 1);
          if (current[3] && !previous[3])
            focusAction(safeActionIndex + 1);
          if (current[4] && !previous[4])
            invokeAction(safeActionIndex);
          if (current[5] && !previous[5]) {
            if (embedded && onOpenDeck) {
              onOpenDeck();
            } else if (activeRoomId === "bridge-map") {
              root?.focus({ preventScroll: true });
            } else {
              selectRoom("bridge-map");
            }
          }
        }
        state.previous = current;
      } else {
        gamepadStateRef.current = { previous: Array.from({ length: 6 }, () => false), ready: false };
      }
      animationFrame = window.requestAnimationFrame(poll);
    };
    animationFrame = window.requestAnimationFrame(poll);
    return () => window.cancelAnimationFrame(animationFrame);
  }, [
    activeRoomId,
    embedded,
    onOpenDeck,
    focusAction,
    gamepadEnabled,
    invokeAction,
    moveRoom,
    safeActionIndex,
    selectRoom,
    suspended,
    trainingSession,
  ]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLElement>) => {
      if (suspended || trainingSession !== null) return;
      if (event.repeat || event.defaultPrevented) return;
      const target = event.target;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLSelectElement ||
        target instanceof HTMLTextAreaElement
      ) {
        return;
      }
      if (
        target instanceof HTMLButtonElement &&
        (event.key === "Enter" || event.key === " ")
      ) {
        return;
      }
      const actions = matchingControlActions(
        "shipHub",
        event.nativeEvent,
        controlBindings,
      );
      if (actions.includes("shipHub.previousRoom")) {
        event.preventDefault();
        moveRoom(-1);
      } else if (actions.includes("shipHub.nextRoom")) {
        event.preventDefault();
        moveRoom(1);
      } else if (actions.includes("shipHub.previousAction")) {
        event.preventDefault();
        focusAction(safeActionIndex - 1);
      } else if (actions.includes("shipHub.nextAction")) {
        event.preventDefault();
        focusAction(safeActionIndex + 1);
      } else if (actions.includes("shipHub.activate")) {
        if (target instanceof HTMLButtonElement) {
          event.preventDefault();
          target.click();
        } else {
          event.preventDefault();
          invokeAction(safeActionIndex);
        }
      } else if (actions.includes("shipHub.returnToBridge")) {
        event.preventDefault();
        if (embedded && onOpenDeck) {
          event.stopPropagation();
          onOpenDeck();
        } else {
          selectRoom("bridge-map");
        }
      } else if (actions.includes("shipHub.firstRoom")) {
        event.preventDefault();
        selectRoom(SHIP_ROOMS[0].id);
      } else if (actions.includes("shipHub.lastRoom")) {
        event.preventDefault();
        selectRoom(SHIP_ROOMS.at(-1)?.id ?? "archives");
      }
    },
    [
      focusAction,
      controlBindings,
      embedded,
      onOpenDeck,
      invokeAction,
      moveRoom,
      safeActionIndex,
      selectRoom,
      suspended,
      trainingSession,
    ],
  );

  return (
    <section
      ref={rootRef}
      className="screen hub-screen"
      aria-labelledby="ship-hub-title"
      aria-describedby="ship-hub-help"
      data-ship-room={activeRoomId}
      data-ship-embedded={embedded || undefined}
      data-screen-focus
      tabIndex={0}
      style={{
        backgroundImage:
          'linear-gradient(90deg, rgba(2, 4, 3, 0.94) 0%, rgba(2, 4, 3, 0.36) 52%, rgba(2, 4, 3, 0.68) 100%), linear-gradient(0deg, rgba(0, 0, 0, 0.9), transparent 48%), url("/game/backgrounds/ship-hub-v4.webp")',
      }}
      onKeyDown={handleKeyDown}
      onPointerDown={(event) => {
        if (event.currentTarget === event.target) {
          event.currentTarget.focus({ preventScroll: true });
        }
      }}
    >
      <div className="hub-stage">
        <header style={styles.header}>
          <div>
            <p className="eyebrow">Vaisseau de chasse // Réseau du clan</p>
            <h1 id="ship-hub-title" className="panel-title">
              {activeRoom.label}
            </h1>
            <p className="panel-subtitle">{activeRoom.description}</p>
          </div>
          <div style={styles.rankBlock} aria-label="Progression du clan">
            <small>Rang {clan.rankLabel}</small>
            <strong>{clan.honor} honneur</strong>
            <span>{clan.prestige} prestige</span>
          </div>
        </header>

        <nav
          aria-label="Salles du vaisseau"
          style={styles.roomNavigation}
        >
          {SHIP_ROOMS.map((room) => (
            <button
              key={room.id}
              type="button"
              className={`hub-action${room.id === activeRoomId ? " selected" : ""}`}
              aria-current={
                room.id === activeRoomId ? "page" : undefined
              }
              onClick={() => selectRoom(room.id)}
              style={styles.roomButton}
            >
              <span className="hub-action-icon" aria-hidden="true">
                {room.glyph}
              </span>
              <span>
                <strong>{room.shortLabel}</strong>
              </span>
            </button>
          ))}
        </nav>

        <div style={styles.contentGrid}>
          <div className="hub-room-panel" style={styles.roomPanel}>
            <RoomSummary
              roomId={activeRoomId}
              save={save}
              progression={progression}
              clan={clan}
              inspectedShipId={inspectedShipId}
            />
          </div>

          <div>
            <p className="hub-message">
              <strong>ACTIONS DE SALLE</strong>
            </p>
            <div className="hub-nav" aria-label="Actions disponibles">
              {actions.map((action, index) => (
                <button
                  key={action.id}
                  ref={(node) => {
                    actionButtonRefs.current[index] = node;
                  }}
                  type="button"
                  className={`hub-action${index === safeActionIndex ? " selected" : ""}`}
                  disabled={action.disabled}
                  onFocus={() => setActionIndex(index)}
                  onClick={() => invokeAction(index)}
                  style={styles.actionButton}
                >
                  <span className="hub-action-icon" aria-hidden="true">
                    {activeRoom.glyph}
                  </span>
                  <span>
                    <strong>{action.label}</strong>
                    <small>{action.detail}</small>
                  </span>
                  <span className="hub-action-arrow" aria-hidden="true">
                    ›
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <HunterRigPreview
          className="hub-hunter-rig"
          appearance={save.appearance}
          armorId={save.loadout.armorId}
          weaponIds={save.loadout.weaponIds}
          gearIds={save.loadout.gearIds}
          size="clamp(270px, 30vw, 410px)"
        />

        <footer style={styles.footer}>
          <p id="ship-hub-help">
            Clavier : {controlActionShortcut("shipHub.previousRoom", controlBindings)} / {controlActionShortcut("shipHub.nextRoom", controlBindings)} pour les salles, {controlActionShortcut("shipHub.previousAction", controlBindings)} / {controlActionShortcut("shipHub.nextAction", controlBindings)} puis {controlActionShortcut("shipHub.activate", controlBindings)} pour les actions. Manette : croix directionnelle, A pour
            confirmer, B pour le pont. Les boutons restent tactiles.
          </p>
          <p role="status" aria-live="polite">
            {statusMessage}
          </p>
        </footer>
      </div>
      {trainingSession ? (
        <TrainingDrill
          disciplineId={trainingSession.disciplineId}
          seed={trainingSession.seed}
          controlBindings={controlBindings}
          onComplete={completeAutonomousTraining}
          onCancel={cancelAutonomousTraining}
        />
      ) : null}
    </section>
  );
}

function RoomSummary({
  roomId,
  save,
  progression,
  clan,
  inspectedShipId,
}: {
  roomId: ShipRoomId;
  save: SaveGame;
  progression: ShipProgressionState;
  clan: ReturnType<typeof evaluateClanProgression>;
  inspectedShipId: ShipId;
}) {
  if (roomId === "bridge-map") {
    return (
      <>
        <SummaryHeading
          title="Route de la Longue Chasse"
          detail={
            clan.nextRankLabel
              ? `Prochain rang : ${clan.nextRankLabel} à ${clan.honorForNextRank} honneur.`
              : "Le rang d’Ancien est atteint ; les rites restent ouverts."
          }
        />
        <ProgressMeter
          label={`Progression ${clan.rankLabel}`}
          ratio={clan.rankProgress}
        />
        <StatGrid
          values={[
            ["Missions", save.statistics.missionsCompleted.toString()],
            ["Trophées", save.trophies.length.toString()],
            ["Rites", clan.completedRites.length.toString()],
            ["Série", save.statistics.currentHuntStreak.toString()],
          ]}
        />
      </>
    );
  }

  if (roomId === "armory") {
    return (
      <>
        <SummaryHeading
          title="Configurations enregistrées"
          detail="Chaque emplacement mémorise simultanément équipement et apparence."
        />
        <div style={styles.cardList}>
          {SLOT_ORDER.map((slotId) => {
            const preset = progression.loadoutPresets.find(
              ({ id }) => id === slotId,
            );
            return (
              <article className="equipment-card" key={slotId}>
                <p className="equipment-type">{slotId.toUpperCase()}</p>
                <h3>{preset?.name ?? slotId}</h3>
                <p>
                  {preset?.loadout
                    ? `${preset.loadout.armorId} · ${preset.loadout.weaponIds.join(" / ")}`
                    : "Emplacement libre"}
                </p>
              </article>
            );
          })}
        </div>
      </>
    );
  }

  if (roomId === "hangar") {
    const inspectedShip = shipForId(inspectedShipId);
    const isActive = progression.selectedShipId === inspectedShip.id;
    const fidelityLabel =
      inspectedShip.visualConfidence === "reference-locked"
        ? "Références visuelles verrouillées"
        : inspectedShip.visualConfidence === "source-guided-approximation"
          ? "Étude guidée par sources · approximation non canonique"
        : inspectedShip.visualConfidence === "project-original"
          ? "Création originale du projet · non canonique"
        : inspectedShip.visualConfidence === "silhouette-inferred"
          ? "Silhouette fidèle · dessus reconstruit"
          : "Création textuelle du projet";
    const selectableCount = SHIP_CATALOGUE.filter(
      ({ selectable }) => selectable,
    ).length;
    const auxiliaryCount = SHIP_CATALOGUE.length - selectableCount;
    return (
      <>
        <SummaryHeading
          title={inspectedShip.name}
          detail={`${inspectedShip.originLabel} · ${inspectedShip.description}`}
        />
        <article className="equipment-card">
          <p className="equipment-type">
            {isActive ? "VAISSEAU ACTIF" : "FICHE DE FLOTTE"}
          </p>
          <h3>{inspectedShip.shortName}</h3>
          <p>{inspectedShip.deckNote}</p>
          <p>
            Alias : {inspectedShip.aliases.join(" · ")}
            <br />
            Fidélité : {fidelityLabel}
          </p>
        </article>
        <div
          className="ship-visual-comparison"
          aria-label={`Comparaison des vues de ${inspectedShip.name}`}
        >
          <figure>
            <img
              src={shipProfileAssetPath(inspectedShip.id)}
              alt={`Profil de ${inspectedShip.name}`}
              draggable={false}
            />
            <figcaption>
              Profil / trois-quarts · étude de référence
            </figcaption>
          </figure>
          <figure>
            <img
              src={shipTopAssetPath(inspectedShip.id)}
              alt={`Vue de dessus de ${inspectedShip.name}`}
              draggable={false}
            />
            <figcaption>
              Vue zénithale orthographique · étude de référence
            </figcaption>
          </figure>
        </div>
        {inspectedShip.provenance.supplementalAssets.map((supplemental) => (
          <div key={supplemental.id}>
            <article className="equipment-card">
              <p className="equipment-type">ÉTUDE NON CANONIQUE</p>
              <h3>{supplemental.label}</h3>
              <p>{supplemental.note}</p>
            </article>
            <div
              className="ship-visual-comparison"
              aria-label={`Archives visuelles originales de ${inspectedShip.name}`}
            >
              <figure>
                <img
                  src={supplemental.profileRuntimeAssetPath}
                  alt={`Ancien profil original de ${inspectedShip.name}`}
                  draggable={false}
                />
                <figcaption>Étude indépendante · profil</figcaption>
              </figure>
              <figure>
                <img
                  src={supplemental.topRuntimeAssetPath}
                  alt={`Ancienne vue de dessus originale de ${inspectedShip.name}`}
                  draggable={false}
                />
                <figcaption>Étude indépendante · vue zénithale</figcaption>
              </figure>
            </div>
          </div>
        ))}
        <StatGrid
          values={[
            ["Débloqués", progression.unlockedShipIds.length.toString()],
            ["Sélectionnables", selectableCount.toString()],
            ["Annexes", auxiliaryCount.toString()],
            ["Catalogue", SHIP_CATALOGUE.length.toString()],
          ]}
        />
      </>
    );
  }

  if (roomId === "trophy-hall") {
    return (
      <>
        <SummaryHeading
          title="Atelier et alcôves"
          detail="Chaque étape se valide dans l’atelier jouable ; ce registre latéral conserve les anciennes prises et leurs alcôves."
        />
        <div style={styles.cardList}>
          {progression.trophies.length > 0 ? (
            progression.trophies.slice(0, 6).map((trophy) => {
              const workRatio =
                trophy.stage === "cleaning"
                  ? trophy.cleaningSeconds /
                    trophy.requiredCleaningSeconds
                  : trophy.stage === "mounting"
                    ? trophy.mountingSeconds /
                      trophy.requiredMountingSeconds
                    : trophy.stage === "raw"
                      ? 0
                      : 1;
              return (
                <article className="trophy-card" key={trophy.claimId}>
                  <p className="mission-planet">
                    {TROPHY_SPECIES_LABELS[trophy.speciesId]}
                  </p>
                  <h3>{trophy.targetName}</h3>
                  <p>
                    {STAGE_LABELS[trophy.stage]} ·{" "}
                    {TROPHY_METHOD_LABELS[trophy.huntMethodId]}
                  </p>
                  {(trophy.stage === "cleaning" ||
                    trophy.stage === "mounting") && (
                    <ProgressMeter
                      label={STAGE_LABELS[trophy.stage]}
                      ratio={workRatio}
                    />
                  )}
                </article>
              );
            })
          ) : (
            <p>Aucune prise n’a encore franchi le sas du vaisseau.</p>
          )}
        </div>
      </>
    );
  }

  if (roomId === "medbay") {
    const remaining =
      progression.medbay.status === "treating" &&
      progression.medbay.completesAt
        ? Math.max(
            0,
            (Date.parse(progression.medbay.completesAt) -
              Date.parse(progression.updatedAt)) /
              1_000,
          )
        : 0;
    return (
      <>
        <SummaryHeading
          title={
            progression.medbay.status === "treating"
              ? "Protocole en cours"
              : "Systèmes médicaux prêts"
          }
          detail={
            progression.medbay.status === "treating"
              ? `${progression.medbay.treatmentId} · ${formatDuration(remaining)} restantes`
              : "Les soins du vaisseau n’écrivent jamais de santé transitoire dans la sauvegarde."
          }
        />
        <StatGrid
          values={[
            [
              "Traitements",
              progression.medbay.treatmentsCompleted.toString(),
            ],
            [
              "Second Winds",
              save.statistics.secondWindsUsed.toString(),
            ],
          ]}
        />
      </>
    );
  }

  if (roomId === "training") {
    return (
      <>
        <SummaryHeading
          title="Registre d’entraînement"
          detail="Les records sont conservés dans la progression du vaisseau."
        />
        <div style={styles.cardList}>
          {Object.values(progression.training).map((record) => (
            <article className="equipment-card" key={record.disciplineId}>
              <p className="equipment-type">
                {record.attempts} ESSAI(S)
              </p>
              <h3>{TRAINING_LABELS[record.disciplineId]}</h3>
              <p>Record {record.bestScore}/100</p>
            </article>
          ))}
        </div>
      </>
    );
  }

  return (
    <>
      <SummaryHeading
        title="Rites et mémoire"
        detail={`${save.codex.unlockedEntryIds.length} archives décodées · ${clan.completedRites.length} rites accomplis.`}
      />
      <div style={styles.cardList}>
        {[...clan.completedRites, ...clan.pendingRites].map((rite) => (
          <article className="codex-card" key={rite.id}>
            <span className="codex-label">
              {rite.completed ? "ACCOMPLI" : "EN COURS"}
            </span>
            <h3>{rite.name}</h3>
            <p>{rite.description}</p>
            <ProgressMeter label="Rite" ratio={rite.ratio} />
          </article>
        ))}
      </div>
    </>
  );
}

function SummaryHeading({
  title,
  detail,
}: {
  title: string;
  detail: string;
}) {
  return (
    <header style={styles.summaryHeader}>
      <p className="eyebrow">Console locale</p>
      <h2>{title}</h2>
      <p>{detail}</p>
    </header>
  );
}

function ProgressMeter({
  label,
  ratio,
}: {
  label: string;
  ratio: number;
}) {
  return (
    <div
      className="campaign-progress"
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(ratio * 100)}
      style={styles.progress}
    >
      <div className="progress-caption">
        <span>{label}</span>
        <span>{percent(ratio)}</span>
      </div>
      <div className="progress-track" aria-hidden="true">
        <span style={{ width: percent(ratio) }} />
      </div>
    </div>
  );
}

function StatGrid({
  values,
}: {
  values: ReadonlyArray<readonly [string, string]>;
}) {
  return (
    <div style={styles.statGrid}>
      {values.map(([label, value]) => (
        <span className="meta-cell" key={label}>
          <small>{label}</small>
          <strong>{value}</strong>
        </span>
      ))}
    </div>
  );
}

const styles = {
  header: {
    display: "flex",
    justifyContent: "space-between",
    gap: "1rem",
    alignItems: "flex-start",
    maxWidth: "76rem",
    margin: "0 auto 1rem",
  },
  rankBlock: {
    display: "grid",
    gap: "0.2rem",
    minWidth: "10rem",
    padding: "0.8rem 1rem",
    border: "1px solid color-mix(in srgb, var(--accent, #61f2d2) 45%, transparent)",
    background: "rgba(3, 12, 12, 0.82)",
    textAlign: "right",
  },
  roomNavigation: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(8.5rem, 1fr))",
    gap: "0.55rem",
    maxWidth: "76rem",
    margin: "0 auto 1rem",
  },
  roomButton: {
    minHeight: "4.5rem",
    touchAction: "manipulation",
  },
  contentGrid: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1.25fr) minmax(18rem, 0.75fr)",
    gap: "1rem",
    maxWidth: "76rem",
    margin: "0 auto",
    alignItems: "start",
  },
  roomPanel: {
    minHeight: "24rem",
    padding: "1rem",
    border: "1px solid rgba(109, 226, 204, 0.22)",
    background:
      "linear-gradient(145deg, rgba(7, 25, 24, 0.92), rgba(3, 9, 10, 0.9))",
    overflow: "auto",
  },
  actionButton: {
    width: "100%",
    touchAction: "manipulation",
  },
  cardList: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(13rem, 1fr))",
    gap: "0.75rem",
  },
  summaryHeader: {
    marginBottom: "1rem",
  },
  progress: {
    position: "static",
    width: "100%",
    margin: "0.75rem 0",
  },
  statGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(7rem, 1fr))",
    gap: "0.6rem",
    marginTop: "1rem",
  },
  footer: {
    display: "flex",
    justifyContent: "space-between",
    gap: "1rem",
    maxWidth: "76rem",
    margin: "1rem auto 0",
    fontSize: "0.78rem",
    color: "var(--muted, #8da59f)",
  },
} as const;
