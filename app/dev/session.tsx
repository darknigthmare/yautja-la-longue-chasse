"use client";

import { lazy, Suspense, useCallback, useRef, useState } from "react";
import { MISSION_BY_ID } from "../game/data";
import { DEFAULT_SHIP_ID } from "../game/shipCatalogue";
import { actClanShipDocking, type ClanShipDockingAction } from "../game/systems/clanShipDocking";
import { createDefaultShipProgression, type ShipProgressionState } from "../game/systems/progression";
import type { HomeworldProgress } from "../game/systems/homeworld";
import type { HomeworldRegionStateV68 } from "../game/systems/homeworldRegionsV68";
import type { HuntPersistencePayload } from "../game/HuntCanvas";
import type { MissionResult, SaveGame } from "../game/types";
import { createDevSave, createMemoryStorage, resolveDevDestination, type DevDestination } from "./destinations";
import DevServices, { type DevService } from "./services";
import styles from "./session.module.css";

const PhysicalShipDeck = lazy(() => import("../game/PhysicalShipDeck"));
const ClanShipHub = lazy(() => import("../game/ClanShipHub"));
const HomeworldHub = lazy(() => import("../game/HomeworldHub"));
const HomeworldRegionV68 = lazy(() => import("../game/HomeworldRegionV68"));
const HuntCanvas = lazy(() => import("../game/HuntCanvas"));

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
}

/** A separate owner for the production scenes. It neither loads a campaign nor
 * imports its write/slot services. Reset/travel unmounts the whole owner. */
export default function DevTravelSession({ destination, onTravel, onExit }: DevTravelSessionProps) {
  const [save, setSave] = useState(() => createDevSave(destination));
  const saveRef = useRef(save);
  const [progression, setProgression] = useState(() => createDefaultShipProgression(save, save.createdAt));
  const [recoveryStorage] = useState(createMemoryStorage);
  const [service, setService] = useState<DevService | null>(null);
  const [notice, setNotice] = useState("");
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
  const selectedShipId = save.clanShipDocking?.personalShipId ?? DEFAULT_SHIP_ID;

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
  const openService = useCallback((next: DevService) => setService(next), []);
  const closeService = useCallback(() => setService(null), []);
  const returnToShip = useCallback(() => onTravel("ship"), [onTravel]);
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
    setHuntObservation({
      x: player.x, y: player.y, elapsed: payload.elapsed,
      discoveredRooms: JSON.stringify(discoveredRooms), visitedScreens: JSON.stringify(visitedScreens),
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
      data-dev-hunt-generation={destination.kind === "mission" ? huntGeneration.epoch : undefined}
      data-dev-hunt-x={huntObservation?.x} data-dev-hunt-y={huntObservation?.y}
      data-dev-hunt-elapsed={huntObservation?.elapsed}
      data-dev-hunt-discovered-rooms={huntObservation?.discoveredRooms}
      data-dev-hunt-visited-screens={huntObservation?.visitedScreens}>
      <p className={styles.notice} role="status" data-dev-notice>
        {notice || "Session de test temporaire. Les déplacements et résultats de cet essai disparaissent au changement de lieu ou au rechargement."}
      </p>
      <div className={styles.viewport}>
        <div className={styles.scene} hidden={service !== null} inert={service !== null}>
          <Suspense fallback={<div className={styles.loading} role="status">Chargement du lieu…</div>}>
            {destination.kind === "ship" && <PhysicalShipDeck
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
              suspended={service !== null}
              onAction={actClanShip}
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
            {destination.kind === "mission" && huntRunning && <HuntCanvas
              key={huntGeneration.epoch}
              mission={MISSION_BY_ID[destination.missionId]}
              encounterRun={1}
              appearance={huntGeneration.runtimeSave.appearance}
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
          {destination.kind === "mission" && !huntRunning && <section className={styles.summary} aria-labelledby="dev-hunt-summary">
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
              <button type="button" onClick={onExit}>Choisir un autre lieu</button>
              <button type="button" onClick={returnToShip}>Rejoindre mon vaisseau</button>
            </div>
          </section>}
        </div>
        {service !== null && <DevServices
          key={service}
          service={service}
          save={save}
          progression={progression}
          host={destination.kind === "clan" ? "Clan Ship AVP" : destination.kind === "homeworld" ? "Homeworld" : "Vaisseau personnel"}
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
