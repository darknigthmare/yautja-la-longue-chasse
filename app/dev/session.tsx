"use client";

import { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { MISSION_BY_ID } from "../game/data";
import { DEFAULT_SHIP_ID, isShipId } from "../game/shipCatalogue";
import { GameAudio } from "../game/sound";
import { useHomeworldReducedMotionV77 } from "../game/useHomeworldReducedMotionV77";
import { actClanShipDocking, type ClanShipDockingAction } from "../game/systems/clanShipDocking";
import { actClanShipOperations, createClanShipOperations, inspectClanShipOperations, type ClanShipOperationsAction } from "../game/systems/clanShipOperations";
import { actClanShipIncidents, createClanShipIncidents, inspectClanShipIncidents, type ClanShipIncidentAction, type ClanShipIncidentPhysicalContext } from "../game/systems/clanShipIncidents";
import { completePlanetArrivalHandoff, inspectPlanetArrival, type PlanetArrivalState } from "../game/systems/planetArrival";
import { inspectPlanetArrivalRun } from "../game/systems/planetArrivalRun";
import { samePlanetInsertion } from "../game/systems/planetInsertion";
import { shipInsertionCharge } from "../game/systems/shipInsertionEnergy";
import { createDefaultShipProgression, type ShipProgressionState } from "../game/systems/progression";
import { actWolfCastle, applyWolfCastleCheckpoint, type WolfCastleAction, type WolfCastleCheckpoint } from "../game/systems/wolfCastle";
import type { HomeworldProgress } from "../game/systems/homeworld";
import type { HomeworldRegionStateV68 } from "../game/systems/homeworldRegionsV68";
import type { HuntPersistencePayload } from "../game/HuntCanvas";
import type { MissionResult, SaveGame } from "../game/types";
import { createDevArrival, createDevSave, createMemoryStorage, resolveDevDestination, type DevDestination } from "./destinations";
import DevServices, { type DevService } from "./services";
import styles from "./session.module.css";

const ShipInterior25D = lazy(() => import("../game/ShipInterior25D"));
const ClanShipHub = lazy(() => import("../game/ClanShipHub"));
const HomeworldHub = lazy(() => import("../game/HomeworldHub"));
const HomeworldRegionV68 = lazy(() => import("../game/HomeworldRegionV68"));
const HuntCanvas = lazy(() => import("../game/HuntCanvas"));
const WolfCastleScene = lazy(() => import("../game/WolfCastleScene"));
const PlanetArrivalCinematic = lazy(() => import("../game/PlanetArrivalCinematic"));

function subscribeGameFocus(notify: () => void) {
  window.addEventListener("focus", notify);
  window.addEventListener("blur", notify);
  document.addEventListener("visibilitychange", notify);
  return () => {
    window.removeEventListener("focus", notify);
    window.removeEventListener("blur", notify);
    document.removeEventListener("visibilitychange", notify);
  };
}
const readGameFocus = () => document.hasFocus() && document.visibilityState === "visible";
const serverGameFocus = () => false;

export interface DevTravelSessionProps {
  destination: DevDestination;
  onTravel: (destinationId: string) => void;
  onExit: () => void;
}

interface HuntObservation {
  x: number;
  y: number;
  elapsed: number;
  discoveredRooms: string;
  visitedScreens: string;
  insertion: string | null;
  insertionPatrols: string;
}

/** A separate owner for the production scenes. It neither loads a campaign nor
 * imports its write/slot services. Reset/travel unmounts the whole owner. */
export default function DevTravelSession({ destination, onTravel, onExit }: DevTravelSessionProps) {
  const [save, setSave] = useState(() => createDevSave(destination));
  const saveRef = useRef(save);
  const ownerRef = useRef(save.createdAt);
  const sessionAliveRef = useRef(false);
  const audioRef = useRef<GameAudio | null>(null);
  const sceneRef = useRef<HTMLDivElement>(null);
  const restoreWolfFocusRef = useRef(destination.kind === "wolf");
  const reducedMotion = useHomeworldReducedMotionV77();
  const [progression, setProgression] = useState(() => createDefaultShipProgression(save, save.createdAt));
  const [recoveryStorage] = useState(createMemoryStorage);
  const [service, setService] = useState<DevService | null>(null);
  const serviceRef = useRef<DevService | null>(null);
  const subscribeFocus = useCallback((notify: () => void) => subscribeGameFocus(() => {
    if (!sessionAliveRef.current) return;
    // Resume the shared bus before React lets a child request its room loop.
    audioRef.current?.setPaused(serviceRef.current !== null || !readGameFocus());
    notify();
  }), []);
  const gameFocused = useSyncExternalStore(subscribeFocus, readGameFocus, serverGameFocus);
  const [notice, setNotice] = useState("");
  // This native arrival/run DTO deliberately stays outside SaveGame. Later
  // campaign missions remain locked; a test never invents their prerequisites.
  const [arrivalFixture] = useState(() => destination.kind === "arrival" ? createDevArrival(destination, save) : null);
  const [arrival, setArrival] = useState(arrivalFixture?.state ?? null);
  const arrivalRef = useRef(arrival);
  const [huntRunning, setHuntRunning] = useState(true);
  // HuntCanvas creates its simulation from these props. A discovery is reported
  // back to the owner, but must not replace the active simulation's inputs.
  const [huntGeneration, setHuntGeneration] = useState(() => ({
    epoch: 0,
    runtimeSave: structuredClone(save),
  }));
  const [huntCheckpoint, setHuntCheckpoint] = useState<HuntPersistencePayload | null>(null);
  const [huntResult, setHuntResult] = useState<MissionResult | null>(null);
  const [huntObservation, setHuntObservation] = useState<HuntObservation | null>(null);
  const selectedShipId = save.wolfCastle?.personalShipId ?? save.clanShipDocking?.personalShipId ?? DEFAULT_SHIP_ID;
  const nativeSceneSuspended = service !== null || !gameFocused;
  const missionId = destination.kind === "mission" || destination.kind === "arrival" ? destination.missionId : null;
  const inHunt = destination.kind === "mission" || (destination.kind === "arrival" && arrival?.status === "complete");
  const arrivalGauntlet = typeof arrivalFixture?.run.configuration.gauntletVariantId === "string"
    ? arrivalFixture.run.configuration.gauntletVariantId : undefined;
  const arrivalShipId = arrivalFixture?.run.configuration.insertionShipId;

  useLayoutEffect(() => {
    sessionAliveRef.current = true;
    return () => {
      // Invalidate callbacks before the native children tear down their effects.
      sessionAliveRef.current = false;
      audioRef.current?.dispose();
      audioRef.current = null;
    };
  }, []);
  const createSceneAudio = useCallback(() => {
    if (!sessionAliveRef.current) return null;
    // The scene invokes this from an effect. Lazy construction also works when
    // its chunk is cached and its effect precedes the owner's passive effects.
    const audio = audioRef.current ?? new GameAudio();
    audioRef.current = audio;
    const settings = saveRef.current.settings;
    audio.setMix({ master: settings.masterVolume, music: settings.musicVolume,
      effects: settings.effectsVolume, muted: settings.masterVolume === 0 });
    audio.setPaused(serviceRef.current !== null || !readGameFocus());
    return audio.createSceneAudio();
  }, []);
  useEffect(() => {
    if (!sessionAliveRef.current) return;
    audioRef.current?.setMix({ master: save.settings.masterVolume, music: save.settings.musicVolume,
      effects: save.settings.effectsVolume, muted: save.settings.masterVolume === 0 });
    audioRef.current?.setPaused(serviceRef.current !== null || !readGameFocus());
  }, [nativeSceneSuspended, save.settings.masterVolume, save.settings.musicVolume, save.settings.effectsVolume]);
  useLayoutEffect(() => {
    if (service !== null || !gameFocused || !restoreWolfFocusRef.current || !sessionAliveRef.current) return;
    const root = sceneRef.current;
    const target = root?.querySelector<HTMLElement>('[role="dialog"] button:not(:disabled)') ??
      root?.querySelector<HTMLElement>('[data-wolf-castle-interior]') ??
      root?.querySelector<HTMLElement>('[data-wolf-castle-action="board"]:not(:disabled)');
    if (target) {
      restoreWolfFocusRef.current = false;
      target.focus({ preventScroll: true });
    }
  }, [gameFocused, service]);

  // Ref publication is synchronous because scene callbacks acknowledge a step
  // before React's next render. No acknowledgement here means durable storage.
  const replaceSave = useCallback((next: SaveGame) => {
    saveRef.current = next;
    setSave(next);
  }, []);
  const saveHomeworld = useCallback((next: HomeworldProgress) => {
    replaceSave({ ...saveRef.current, homeworld: structuredClone(next) });
    return true;
  }, [replaceSave]);
  const saveRegion = useCallback((next: HomeworldRegionStateV68) => {
    replaceSave({ ...saveRef.current, homeworldRegionV68: structuredClone(next) });
    return true;
  }, [replaceSave]);
  const receiveShipProgression = useCallback((next: ShipProgressionState) => {
    setProgression(structuredClone(next));
    // Void is the existing "delivered to host" contract. Returning persisted:
    // true would incorrectly claim a durable write for this memory-only owner.
  }, []);
  const openService = useCallback((next: DevService) => {
    if (!sessionAliveRef.current) return;
    if (destination.kind === "wolf") restoreWolfFocusRef.current = true;
    serviceRef.current = next;
    audioRef.current?.setPaused(true);
    setService(next);
  }, [destination.kind]);
  const closeService = useCallback(() => {
    if (!sessionAliveRef.current) return;
    serviceRef.current = null;
    audioRef.current?.setPaused(!readGameFocus());
    setService(null);
  }, []);
  const leaveSession = useCallback((destinationId?: string) => {
    if (!sessionAliveRef.current) return;
    sessionAliveRef.current = false;
    audioRef.current?.setPaused(true);
    if (destinationId) onTravel(destinationId);
    else onExit();
  }, [onExit, onTravel]);
  const exitSession = useCallback(() => leaveSession(), [leaveSession]);
  const returnToShip = useCallback(() => leaveSession("ship"), [leaveSession]);
  const returnToCity = useCallback(() => { onTravel("homeworld-port"); return true; }, [onTravel]);
  const visitRegion = useCallback((id: string) => {
    const target = resolveDevDestination(`region-${id}`);
    if (!target) {
      setNotice("Cette expédition conserve ses conditions de campagne. Choisis un lieu disponible dans le sélecteur de test.");
      return false;
    }
    onTravel(target.id);
    return true;
  }, [onTravel]);
  const actClanShip = useCallback((action: ClanShipDockingAction) => {
    const current = saveRef.current;
    const state = current.clanShipDocking;
    if (!state) return false;
    const result = actClanShipDocking(state, action, {
      ownerCreatedAt: current.createdAt,
      personalShipId: state.personalShipId,
    });
    if (!result.accepted) { setNotice(result.message); return false; }
    replaceSave({ ...current, clanShipDocking: result.state });
    setNotice(`${result.message} · essai temporaire`);
    if (action.type === "return-to-personal") onTravel("ship");
    return true;
  }, [onTravel, replaceSave]);
  const actClanOperations = useCallback((action: ClanShipOperationsAction): boolean => {
    const current = saveRef.current;
    if (!sessionAliveRef.current || destination.kind !== "clan" || !readGameFocus() ||
        serviceRef.current !== null || current.createdAt !== ownerRef.current || current.clanShipDocking?.status !== "aboard") return false;
    if (action.type === "accept-contract" && current.clanShipIncidents?.activeIncident) {
      setNotice("Termine ou clos l’intervention à bord avant d’accepter un autre départ."); return false;
    }
    const inspection = inspectClanShipOperations(current.clanShipOperations, current.createdAt);
    if (inspection.status === "future-version" || inspection.status === "invalid-save") return false;
    const result = actClanShipOperations(inspection.state ?? createClanShipOperations(current.createdAt), action,
      { ownerCreatedAt: current.createdAt, docking: current.clanShipDocking, campaign: current });
    if (!result.accepted) { setNotice(result.message); return false; }
    const reward = result.clanMarksReward;
    if (!Number.isSafeInteger(reward) || reward < 0 || !Number.isSafeInteger(current.profile.clanMarks) || current.profile.clanMarks < 0 ||
        current.profile.clanMarks > Number.MAX_SAFE_INTEGER - reward) return false;
    if (result.changed) replaceSave({ ...current, clanShipOperations: result.state,
      profile: { ...current.profile, clanMarks: current.profile.clanMarks + reward } });
    setNotice(`${result.message} · essai temporaire, aucune campagne modifiée`);
    return true;
  }, [destination.kind, replaceSave]);
  const actClanIncident = useCallback((action: ClanShipIncidentAction, physical?: ClanShipIncidentPhysicalContext): boolean => {
    const current = saveRef.current;
    if (!sessionAliveRef.current || destination.kind !== "clan" || !readGameFocus() || serviceRef.current !== null ||
        current.createdAt !== ownerRef.current || current.clanShipDocking?.status !== "aboard") return false;
    const inspection = inspectClanShipIncidents(current.clanShipIncidents, current.createdAt);
    const operations = inspectClanShipOperations(current.clanShipOperations, current.createdAt);
    if (inspection.status === "future-version" || inspection.status === "invalid-save" || !operations.state) return false;
    const result = actClanShipIncidents(inspection.state ?? createClanShipIncidents(current.createdAt), action,
      { ownerCreatedAt: current.createdAt, docking: current.clanShipDocking, campaign: current, operations: operations.state, ...physical });
    if (!result.accepted) { setNotice(result.message); return false; }
    const reward = result.clanMarksReward;
    if (!Number.isSafeInteger(reward) || reward < 0 || (reward > 0 && (!result.changed ||
        !Number.isSafeInteger(current.profile.clanMarks) || current.profile.clanMarks < 0 ||
        current.profile.clanMarks > Number.MAX_SAFE_INTEGER - reward))) return false;
    if (result.changed) replaceSave({ ...current, clanShipIncidents: result.state,
      ...(reward > 0 ? { profile: { ...current.profile, clanMarks: current.profile.clanMarks + reward } } : {}) });
    setNotice(`${result.message} · essai temporaire, aucune campagne modifiée`);
    return true;
  }, [destination.kind, replaceSave]);
  const actWolf = useCallback((action: WolfCastleAction) => {
    const current = saveRef.current;
    if (!sessionAliveRef.current || destination.kind !== "wolf" || !readGameFocus() ||
        serviceRef.current !== null || current.createdAt !== ownerRef.current || !current.wolfCastle) return false;
    const result = actWolfCastle(current.wolfCastle, action,
      { ownerCreatedAt: ownerRef.current, personalShipId: selectedShipId });
    if (!result.accepted) { setNotice(result.message); return false; }
    const reward = result.clanMarksReward ?? 0;
    if (!Number.isSafeInteger(reward) || reward < 0 || (reward > 0 && (!result.changed ||
        !Number.isSafeInteger(current.profile.clanMarks) || current.profile.clanMarks < 0 ||
        current.profile.clanMarks > Number.MAX_SAFE_INTEGER - reward))) {
      setNotice("Le solde temporaire ne permet pas de recevoir cette récompense. Le mandat reste disponible.");
      return false;
    }
    // Native receipt and currency change together, in this owner's memory only.
    if (result.changed) replaceSave({ ...current, wolfCastle: result.state,
      ...(reward > 0 ? { profile: { ...current.profile, clanMarks: current.profile.clanMarks + reward } } : {}) });
    setNotice(`${result.message} · essai temporaire`);
    if (result.state.status === "departed") returnToShip();
    return true;
  }, [destination.kind, replaceSave, returnToShip, selectedShipId]);
  const checkpointWolf = useCallback((checkpoint: WolfCastleCheckpoint) => {
    const current = saveRef.current;
    // A final position is valid while opening settings or losing focus. The
    // native reducer still checks owner, ship, room and the exact revision.
    if (!sessionAliveRef.current || destination.kind !== "wolf" ||
        current.createdAt !== ownerRef.current || !current.wolfCastle) return false;
    const result = applyWolfCastleCheckpoint(current.wolfCastle, checkpoint,
      { ownerCreatedAt: ownerRef.current, personalShipId: selectedShipId });
    if (result.accepted && result.changed) replaceSave({ ...current, wolfCastle: result.state });
    return result.accepted;
  }, [destination.kind, replaceSave, selectedShipId]);
  const inspectArrivalUpdate = useCallback((next: PlanetArrivalState) => {
    const current = arrivalRef.current;
    if (!sessionAliveRef.current || !arrivalFixture || !current || destination.kind !== "arrival" ||
        saveRef.current.createdAt !== ownerRef.current) return null;
    const inspected = inspectPlanetArrival(next, ownerRef.current, arrivalFixture.state.runId);
    const candidate = inspected.state;
    if (inspected.status !== "valid" || !candidate || candidate.missionId !== destination.missionId ||
        candidate.encounterRun !== arrivalFixture.state.encounterRun || candidate.personalShipId !== selectedShipId ||
        !samePlanetInsertion(candidate.insertion, arrivalFixture.state.insertion) ||
        candidate.hunterPresetId !== arrivalFixture.state.hunterPresetId || candidate.elapsedMs < current.elapsedMs ||
        (current.completedBy !== null && candidate.completedBy !== current.completedBy)) return null;
    return candidate;
  }, [arrivalFixture, destination, selectedShipId]);
  const checkpointArrival = useCallback((next: PlanetArrivalState) => {
    const candidate = inspectArrivalUpdate(next);
    const current = arrivalRef.current;
    if (!candidate || !current || current.status === "complete" || candidate.status === "complete" ||
        candidate.status === "handoff-pending" || (candidate.status === "prepared" && current.status !== "prepared")) return false;
    arrivalRef.current = candidate;
    setArrival(candidate);
    return true;
  }, [inspectArrivalUpdate]);
  const finishArrival = useCallback((next: PlanetArrivalState) => {
    const candidate = inspectArrivalUpdate(next);
    const current = arrivalRef.current;
    if (!candidate || !current || !arrivalFixture || candidate.status !== "handoff-pending") return false;
    // A repeated acknowledgement cannot create a second HuntCanvas or rewind
    // its runtime. Old owners fail the lifecycle/identity checks above.
    if (current.status === "complete") {
      return candidate.elapsedMs === current.elapsedMs && candidate.completedBy === current.completedBy;
    }
    if (serviceRef.current !== null || !readGameFocus() ||
        inspectPlanetArrivalRun(arrivalFixture.run, candidate).status !== "valid") return false;
    const completed = completePlanetArrivalHandoff(candidate);
    arrivalRef.current = completed;
    setArrival(completed);
    return true;
  }, [arrivalFixture, inspectArrivalUpdate]);
  const exitArrival = useCallback(() => {
    if (arrivalRef.current && arrivalRef.current.status !== "complete") exitSession();
  }, [exitSession]);
  const finishHunt = useCallback((result: MissionResult) => {
    setHuntResult(result);
    setHuntCheckpoint(null);
    setHuntRunning(false);
  }, []);
  // Observe only snapshots emitted by the real simulation at its own safe
  // boundaries. These diagnostics are never passed back as runtime inputs.
  const observeHunt = useCallback((payload: HuntPersistencePayload) => {
    const checkpoint = payload.snapshot.checkpoint;
    if (!checkpoint || typeof checkpoint !== "object" || Array.isArray(checkpoint)) return;
    const player = checkpoint.player;
    if (!player || typeof player !== "object" || Array.isArray(player) ||
        typeof player.x !== "number" || !Number.isFinite(player.x) ||
        typeof player.y !== "number" || !Number.isFinite(player.y) ||
        !Number.isFinite(payload.elapsed)) return;
    const exploration = checkpoint.exploration;
    const discoveredRooms = exploration && typeof exploration === "object" && !Array.isArray(exploration) &&
      Array.isArray(exploration.discoveredRoomIds) ? exploration.discoveredRoomIds.filter(value => typeof value === "string") : [];
    const visitedScreens = Array.isArray(checkpoint.visitedScreenIds)
      ? checkpoint.visitedScreenIds.filter(value => typeof value === "string") : [];
    const insertion = checkpoint.insertion && typeof checkpoint.insertion === "object" && !Array.isArray(checkpoint.insertion)
      ? checkpoint.insertion : null;
    const patrolIds = insertion && Array.isArray(insertion.patrolIds)
      ? insertion.patrolIds.filter((id): id is string => typeof id === "string") : [];
    const enemies = Array.isArray(checkpoint.enemies) ? checkpoint.enemies : [];
    const presentPatrols = patrolIds.filter(id => enemies.some(enemy => enemy && typeof enemy === "object" &&
      !Array.isArray(enemy) && enemy.id === id));
    setHuntObservation({
      x: player.x, y: player.y, elapsed: payload.elapsed,
      discoveredRooms: JSON.stringify(discoveredRooms), visitedScreens: JSON.stringify(visitedScreens),
      insertion: insertion ? JSON.stringify(insertion) : null, insertionPatrols: JSON.stringify(presentPatrols),
    });
  }, []);
  const suspendHunt = useCallback((checkpoint: HuntPersistencePayload) => {
    observeHunt(checkpoint);
    setHuntCheckpoint(structuredClone(checkpoint));
    setHuntRunning(false);
    setNotice("Chasse suspendue dans cet onglet. Tu peux reprendre cet essai ou choisir un autre lieu.");
  }, [observeHunt]);
  const beginHuntGeneration = () => {
    const runtimeSave = structuredClone(saveRef.current);
    setHuntGeneration(previous => ({ epoch: previous.epoch + 1, runtimeSave }));
    setHuntObservation(null);
    setHuntRunning(true);
    setNotice("");
  };
  const resumeHunt = () => { beginHuntGeneration(); };
  const restartHunt = () => {
    setHuntResult(null); setHuntCheckpoint(null); beginHuntGeneration();
  };

  return (
    <section className={styles.session} data-dev-session={destination.id} data-dev-kind={destination.kind}
      data-dev-stage={inHunt ? "hunt" : destination.kind}
      data-dev-arrival-run={arrival?.runId} data-dev-arrival-status={arrival?.status}
      data-dev-arrival-completed-by={arrival?.completedBy ?? undefined}
      data-dev-arrival-elapsed={arrival?.elapsedMs} data-dev-arrival-mission={arrival?.missionId}
      data-dev-insertion-method={arrivalFixture?.state.insertion?.method}
      data-dev-insertion-team={arrivalFixture?.state.insertion?.team}
      data-dev-insertion-ship-cloak={arrivalFixture ? !!arrivalFixture.state.insertion?.shipCloak : undefined}
      data-dev-insertion-energy={arrivalFixture ? shipInsertionCharge(save.shipInsertionEnergy, save.createdAt, selectedShipId) ?? undefined : undefined}
      data-dev-insertion-energy-run={typeof arrivalFixture?.run.configuration.insertionEnergyRunId === "string"
        ? arrivalFixture.run.configuration.insertionEnergyRunId : undefined}
      data-dev-hunt-generation={inHunt ? huntGeneration.epoch : undefined}
      data-dev-hunt-x={huntObservation?.x} data-dev-hunt-y={huntObservation?.y}
      data-dev-hunt-elapsed={huntObservation?.elapsed}
      data-dev-hunt-discovered-rooms={huntObservation?.discoveredRooms}
      data-dev-hunt-visited-screens={huntObservation?.visitedScreens}
      data-dev-hunt-insertion={huntObservation?.insertion ?? undefined}
      data-dev-hunt-insertion-patrols={huntObservation?.insertionPatrols}>
      <p className={styles.notice} role="status" data-dev-notice>
        {notice || "Session de test temporaire. Les déplacements et résultats de cet essai disparaissent au changement de lieu ou au rechargement."}
      </p>
      <div className={styles.viewport}>
        <div ref={sceneRef} className={styles.scene} hidden={service !== null} inert={service !== null}>
          <Suspense fallback={<div className={styles.loading} role="status">Chargement du lieu…</div>}>
            {destination.kind === "ship" && <ShipInterior25D
              appearance={save.appearance}
              loadout={save.loadout}
              rankLabel="Chasseur de test"
              selectedDestination="Accès direct aux lieux et aux chasses"
              suspended={service !== null}
              controlBindings={save.settings.controlBindings}
              showShortcuts
              onOpenMap={() => openService("map")}
              onOpenArmory={() => openService("armory")}
              onOpenTrophies={() => openService("trophies")}
              onOpenArchives={() => openService("codex")}
              onOpenAppearanceForge={() => openService("customization")}
              onOpenMedbay={() => openService("medbay")}
              onOpenTraining={() => openService("training")}
              onOpenAirlock={() => openService("airlock")}
              onNotify={setNotice}
            />}
            {destination.kind === "clan" && save.clanShipDocking && <ClanShipHub
              state={save.clanShipDocking}
              save={save}
              selectedShipId={selectedShipId}
              suspended={nativeSceneSuspended}
              temporarySession
              onAction={actClanShip}
              onOperations={actClanOperations}
              onIncident={actClanIncident}
              onService={openService}
              onExit={returnToShip}
              onOpenSettings={() => openService("settings")}
            />}
            {destination.kind === "homeworld" && <HomeworldHub
              save={save}
              selectedShipId={selectedShipId}
              suspended={service !== null}
              recoveryStorage={recoveryStorage}
              ephemeralSession
              onProgress={saveHomeworld}
              onService={openService}
              onReturnShip={returnToShip}
              onRegionV68={visitRegion}
              onExpedition={visitRegion}
              onNotify={setNotice}
            />}
            {destination.kind === "region" && <HomeworldRegionV68
              save={save}
              regionId={destination.regionId}
              checkpoint={save.homeworldRegionV68}
              startAtVillage
              contractsValue={save.homeworld.contractsV68}
              suspended={service !== null}
              onCheckpoint={saveRegion}
              onReachCity={returnToCity}
              onOpenSettings={() => openService("settings")}
            />}
            {destination.kind === "wolf" && save.wolfCastle && <WolfCastleScene
              visit={save.wolfCastle}
              appearance={save.appearance}
              loadout={save.loadout}
              createSceneAudio={createSceneAudio}
              suspended={nativeSceneSuspended}
              reducedMotion={reducedMotion}
              highContrast={save.settings.highContrastVision}
              controlBindings={save.settings.controlBindings}
              onAction={actWolf}
              onCheckpoint={checkpointWolf}
              onMenu={() => openService("settings")}
            />}
            {destination.kind === "arrival" && arrival && !inHunt && <PlanetArrivalCinematic
              key={arrival.runId}
              state={arrival}
              appearance={huntGeneration.runtimeSave.appearance}
              loadout={huntGeneration.runtimeSave.loadout}
              gauntletVariantId={arrivalGauntlet}
              createSceneAudio={createSceneAudio}
              suspended={nativeSceneSuspended}
              reducedMotion={reducedMotion}
              onCheckpoint={checkpointArrival}
              onHandoff={finishArrival}
              onExit={exitArrival}
            />}
            {inHunt && missionId && huntRunning && <HuntCanvas
              key={huntGeneration.epoch}
              mission={MISSION_BY_ID[missionId]}
              encounterRun={arrivalFixture?.state.encounterRun ?? 1}
              {...(arrivalFixture?.state.insertion ? {
                insertionPlan: arrivalFixture.state.insertion, insertionRunId: arrivalFixture.run.runId,
                insertionShipId: isShipId(arrivalShipId) ? arrivalShipId : undefined,
              } : {})}
              appearance={huntGeneration.runtimeSave.appearance}
              gauntletVariantId={arrivalGauntlet}
              loadout={huntGeneration.runtimeSave.loadout}
              inventory={huntGeneration.runtimeSave.inventory}
              difficulty={huntGeneration.runtimeSave.settings.difficultyId}
              controlBindings={huntGeneration.runtimeSave.settings.controlBindings}
              huntAccessibility={huntGeneration.runtimeSave.settings.huntAccessibility}
              reducedGore={huntGeneration.runtimeSave.settings.reducedGore}
              screenShake={huntGeneration.runtimeSave.settings.screenShake}
              highContrastVision={huntGeneration.runtimeSave.settings.highContrastVision}
              explorationProgress={huntGeneration.runtimeSave.exploration}
              onExplorationProgress={exploration => replaceSave({ ...saveRef.current, exploration })}
              resumeSnapshot={huntCheckpoint?.snapshot}
              resumeRetryCheckpoint={huntCheckpoint?.retryCheckpoint}
              onFinish={finishHunt}
              onAbort={finishHunt}
              onPersistHunt={observeHunt}
              onSuspendHunt={suspendHunt}
              onResumeFailure={() => { setHuntRunning(false); setNotice("Cet essai ne peut pas être repris. Recommence la chasse pour créer un nouveau point de test."); }}
            />}
          </Suspense>
          {inHunt && !huntRunning && <section className={styles.summary} aria-labelledby="dev-hunt-summary">
            <span className={styles.eyebrow}>CHASSE DE TEST</span>
            <h2 id="dev-hunt-summary">{huntResult ? "Essai terminé" : "Essai suspendu"}</h2>
            {huntResult ? <p>
              {huntResult.outcome === "success" ? "Extraction réussie" : huntResult.outcome === "failed" ? "Chasse échouée" : "Chasse quittée"}
              {" · "}{huntResult.score} points · {huntResult.kills} éliminations · {Math.round(huntResult.elapsedSeconds)} s.
              Aucun résultat de campagne attribué.
            </p> : <p>Le point de reprise reste dans cet onglet jusqu’au changement de lieu ou au rechargement.</p>}
            <div className={styles.actions}>
              {!huntResult && huntCheckpoint && <button type="button" onClick={resumeHunt}>Reprendre cet essai</button>}
              <button type="button" onClick={restartHunt}>Recommencer la chasse</button>
              <button type="button" onClick={exitSession}>Choisir un autre lieu</button>
              <button type="button" onClick={returnToShip}>Rejoindre mon vaisseau</button>
            </div>
          </section>}
        </div>
        {service !== null && <DevServices
          key={service}
          service={service}
          save={save}
          progression={progression}
          host={destination.kind === "clan" ? "Clan Ship AVP" : destination.kind === "homeworld" ? "Homeworld" :
            destination.kind === "wolf" ? "Château Wolf" : "Vaisseau personnel"}
          onSave={replaceSave}
          onProgressionChange={receiveShipProgression}
          onNotify={setNotice}
          onClose={closeService}
          onService={openService}
          onTravel={onTravel}
        />}
      </div>
    </section>
  );
}
