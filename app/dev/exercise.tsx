"use client";

import { lazy, Suspense, useCallback, useRef, useState } from "react";
import type { SaveGame } from "../game/types";
import type { GameAudio, GameSfxId } from "../game/sound";
import type { SceneAudioPort } from "../game/systems/sceneAudio";
import { advanceCampaignCoopLobby, type CampaignCoopLobby, type CampaignCoopLobbyCommand } from "../game/systems/campaignCoopLobby";
import { commitEliteRecognition } from "../game/systems/eliteRecognitionV174";
import { createSoloV70State } from "../game/systems/firstHuntSoloV70";
import { actMobility } from "../game/systems/mobility/ledger";
import { actMountsV153 } from "../game/systems/mobility/mountsV153";
import { actMountRideV156 } from "../game/systems/mobility/mountRidingV156";
import type { CustomizationApplyV146 } from "../game/HunterPieceForgeV146";
import type { SoloV68RecognitionAudio } from "../game/FirstHuntSoloV68";
import { createDevRecognitionCheckpoint } from "./exercise-fixtures";
import type { DevExercise } from "./updates";
import styles from "./session.module.css";

const CampaignCoopExercisePanel = lazy(() => import("../game/CampaignCoopExercisePanel"));
const EliteClanRites = lazy(() => import("../game/EliteClanRites"));
const FirstHuntSoloV68 = lazy(() => import("../game/FirstHuntSoloV68"));
const FirstHuntSoloV70 = lazy(() => import("../game/FirstHuntSoloV70"));
const HunterPieceForgeV146 = lazy(() => import("../game/HunterPieceForgeV146"));
const MobilityGarage = lazy(() => import("../game/MobilityGarage"));
const WarpEpochsPanelV165 = lazy(() => import("../game/WarpEpochsPanelV165"));

const COOP_ROOM = "d".repeat(32);
const COOP_TIME = Date.UTC(2000, 0, 2);
const COOP_PLAYERS = ["Hôte", "Pisteur", "Soutien"].map((name, index) => ({
  name, proof: String(index + 1).repeat(64),
  ownerCreatedAt: new Date(Date.UTC(2000, 0, 1, 0, index)).toISOString(),
  slotId: index + 1,
}));

function newCoopRoom() {
  const [host, ...guests] = COOP_PLAYERS;
  let room: CampaignCoopLobby | null = null;
  const perform = (command: CampaignCoopLobbyCommand, proof = host.proof) => {
    const update = advanceCampaignCoopLobby(room, command, proof, COOP_PLAYERS, COOP_TIME);
    if (!update.ok) throw new Error("Le trio de test ne peut pas être préparé.");
    room = update.room;
    return room;
  };
  perform({ type: "open", roomId: COOP_ROOM, owner: host });
  for (const guest of guests) {
    const ticket = guest.proof;
    perform({ type: "invite", roomId: COOP_ROOM, invitationHash: ticket });
    perform({ type: "request", roomId: COOP_ROOM, owner: guest, invitationHash: ticket }, guest.proof);
    perform({ type: "admit", roomId: COOP_ROOM, guest: { ...guest, ticket } });
  }
  if (!room) throw new Error("Le salon de test est absent.");
  return room as CampaignCoopLobby;
}

function CoopExercise({ suspended }: { suspended: boolean }) {
  const [room, setRoom] = useState(newCoopRoom);
  const [proof, setProof] = useState(COOP_PLAYERS[0].proof);
  const [notice, setNotice] = useState("");
  return <div className={styles.form}>
    <label>Poste incarné
      <select value={proof} onChange={event => setProof(event.target.value)} data-dev-coop-role>
        {COOP_PLAYERS.map(player => <option key={player.proof} value={player.proof}>{player.name}</option>)}
      </select>
    </label>
    <CampaignCoopExercisePanel room={room} players={COOP_PLAYERS} proof={proof} disabled={suspended}
      run={command => {
        const update = advanceCampaignCoopLobby(room, command, proof, COOP_PLAYERS, COOP_TIME);
        if (update.ok) { setRoom(update.room); setNotice(""); return; }
        const reasons = {
          assignment: "Ce geste appartient à un autre poste.",
          order: "Le trio attend un autre geste.",
          route: "Cette voie n’est plus fraîche. Relis les traces.",
          support: "La prise cède sous la charge. Essaie l’autre appui.",
        } as const;
        setNotice(update.reason in reasons ? reasons[update.reason as keyof typeof reasons] : "Le registre refuse ce geste.");
      }} />
    {notice && <p role="status">{notice}</p>}
  </div>;
}

interface Props {
  exercise: DevExercise;
  save: SaveGame;
  readSave: () => SaveGame;
  replaceSave: (next: SaveGame) => void;
  suspended: boolean;
  ensureAudio: () => GameAudio | null;
  createSceneAudio: () => SceneAudioPort | null;
  onSound: (id: GameSfxId) => void;
  onRecognitionAudio: (state: SoloV68RecognitionAudio) => void;
  onNotify: (message: string) => void;
  onClose: () => void;
  onOpenSettings: () => void;
  onOpenCradle: () => void;
}

export default function DevExerciseScene({
  exercise, save, readSave, replaceSave, suspended, ensureAudio, createSceneAudio,
  onSound, onRecognitionAudio, onNotify, onClose, onOpenSettings, onOpenCradle,
}: Props) {
  const [recognition, setRecognition] = useState(() => ({
    revision: 0,
    checkpoint: exercise === "recognition" ? createDevRecognitionCheckpoint() : null,
  }));
  const lastRecognitionRef = useRef(recognition.checkpoint);
  const [temple] = useState(() => exercise === "temple" ? createSoloV70State(15) : null);
  const enableSound = useCallback(() => { void ensureAudio()?.unlock(); }, [ensureAudio]);
  const commitForge = (apply: CustomizationApplyV146, confirmation: string) => {
    const next = apply(readSave());
    if (!next || suspended) return false;
    replaceSave(next);
    onNotify(confirmation);
    return true;
  };

  return <section data-dev-exercise={exercise}>
    <Suspense fallback={<p role="status" className={styles.loading}>Ouverture de l’essai…</p>}>
      {exercise === "mobility" && <MobilityGarage save={save} suspended={suspended} onClose={onClose}
        createSceneAudio={createSceneAudio} onSound={onSound}
        onCommand={command => {
          const current = readSave();
          if ((suspended && command.type !== "drive") || current.mountRidesV156?.active) {
            return { accepted: false, state: current.mobilityV1 ?? null, message: "L’aire de test n’est pas disponible." };
          }
          const update = actMobility(current, command);
          if (update.accepted && update.state) replaceSave({
            ...current, mobilityV1: update.state, profile: { ...current.profile, clanMarks: update.clanMarks },
          });
          return { accepted: update.accepted, state: update.state, message: update.message };
        }}
        onMountCommand={command => {
          const current = readSave();
          if (suspended || current.mobilityV1?.active || current.mountRidesV156?.active) {
            return { accepted: false, state: current.mountsV153 ?? null, message: "L’aire de test n’est pas disponible." };
          }
          const update = actMountsV153(current, command);
          if (update.accepted && update.state) replaceSave({
            ...current, mountsV153: update.state, profile: { ...current.profile, clanMarks: update.clanMarks },
          });
          return { accepted: update.accepted, state: update.state, message: update.message };
        }}
        onRideCommand={command => {
          const current = readSave();
          if ((suspended && command.type !== "ride") || current.mobilityV1?.active) {
            return { accepted: false, state: current.mountRidesV156 ?? null, message: "L’aire de test n’est pas disponible." };
          }
          const update = actMountRideV156(current, command);
          if (update.accepted && update.rides) replaceSave({
            ...current, mountRidesV156: update.rides, ...(update.mounts ? { mountsV153: update.mounts } : {}),
          });
          return { accepted: update.accepted, state: update.rides, message: update.message };
        }} />}
      {exercise === "warp" && <WarpEpochsPanelV165 save={save} shipContext={{ personalShipAvailable: true }}
        onPersist={(warpEpochsV165, clearLegacyTantalus) => {
          replaceSave({ ...readSave(), warpEpochsV165, ...(clearLegacyTantalus ? { tantalusV164: null } : {}) });
          return true;
        }} onClose={onClose} />}
      {exercise === "rites" && <EliteClanRites save={save} suspended={suspended} onClose={onClose}
        onOpenRecognition={onClose} onOpenQueenMission={onOpenCradle}
        onCommand={command => {
          const current = readSave();
          if (suspended) return { ok: false, message: "L’essai est suspendu." };
          const outcome = commitEliteRecognition(current, command);
          if (outcome.ok) replaceSave({ ...current, eliteRecognitionV174: outcome.state,
            ...(outcome.prologue ? { prologue: outcome.prologue } : {}) });
          return outcome;
        }} />}
      {exercise === "recognition" && recognition.checkpoint && <>
        <div className={styles.actions}><button type="button" onClick={enableSound}>Activer le son de l’essai</button></div>
        <FirstHuntSoloV68 key={recognition.revision} checkpoint={recognition.checkpoint} bindings={save.settings.controlBindings}
          externallyPaused={suspended} onOpenSettings={onOpenSettings}
          onCheckpoint={state => { lastRecognitionRef.current = structuredClone(state); return true; }}
          onProgress={async (_receipts, state) => { lastRecognitionRef.current = structuredClone(state); return true; }}
          onExit={onClose} onReturnToCity={async () => { onClose(); return true; }}
          onRecognitionAudio={onRecognitionAudio} />
        <div className={styles.actions}><button type="button" disabled={suspended}
          onClick={() => {
            const checkpoint = lastRecognitionRef.current;
            setRecognition(previous => ({ revision: previous.revision + 1, checkpoint }));
          }}>Reprendre du point conservé</button></div>
      </>}
      {exercise === "temple" && temple && <FirstHuntSoloV70 checkpoint={temple} bindings={save.settings.controlBindings} continueTriad
        externallyPaused={suspended} soundEnabled={save.settings.masterVolume > 0}
        masterVolume={save.settings.masterVolume} effectsVolume={save.settings.effectsVolume}
        onOpenSettings={onOpenSettings} onCheckpoint={() => true} onProgress={async () => true}
        onExit={onClose} onReturnToCity={async () => { onClose(); return true; }} />}
      {exercise === "forge" && <HunterPieceForgeV146 save={save} disabled={suspended}
        allowEquipmentUpgrades onCommit={commitForge} onToolUpgrade={commitForge} />}
      {exercise === "coop" && <CoopExercise suspended={suspended} />}
    </Suspense>
  </section>;
}
