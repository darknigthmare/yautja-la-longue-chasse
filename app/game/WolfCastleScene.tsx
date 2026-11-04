"use client";

/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import HunterRigPreview from './HunterRigPreview';
import { controlActionShortcut } from './controlBindingLabels';
import { shipForId, shipProfileAssetPath } from './shipCatalogue';
import { DEFAULT_CONTROL_BINDINGS, matchesControlAction, type ControlBindings } from './systems/controlBindings';
import type { HunterAppearance, Loadout } from './types';
import { useMenuGamepad } from './useMenuGamepad';
import { wolfCastleSpriteImageFrame } from './systems/wolfCastleArt';
import { wolfCastleCombatSpriteFrame, wolfCastleRuntimeAsset } from './systems/wolfCastleRuntimeArt';
import { WolfCastleAudio } from './systems/wolfCastleAudio';
import type { SceneAudioPort } from './systems/sceneAudio';
import {
  WOLF_CASTLE_COMBAT_ARENA, WOLF_CASTLE_COMBAT_ENCOUNTERS, stepWolfCastleCombat,
  wolfCastleCombatEventLabel, wolfCastleCombatPending, wolfCastleCombatStrikeArea, wolfCastleCombatSpec,
  type WolfCastleCombatCommand, type WolfCastleCombatState,
} from './systems/wolfCastleCombat';
import {
  WOLF_CASTLE_ART_ROOT, WOLF_CASTLE_ROOMS, WOLF_CASTLE_SEALS, WOLF_CASTLE_WORLD,
  actWolfCastle, applyWolfCastleCheckpoint, isWolfCastlePointWalkable, stepWolfCastleActor,
  wolfCastleNearestStation, wolfCastleObjective, wolfCastleRoom, wolfCastleRoute, wolfCastleWalkPath,
  wolfCastleActiveCombat, wolfCastleDungeonObjective,
  type WolfCastleAction, type WolfCastleCheckpoint, type WolfCastlePoint, type WolfCastlePosition, type WolfCastleProp, type WolfCastleRoomId,
  type WolfCastleStation, type WolfCastleVisit,
} from './systems/wolfCastle';
import styles from './WolfCastleScene.module.css';

export interface WolfCastleSceneProps {
  visit: WolfCastleVisit;
  appearance: HunterAppearance;
  loadout: Loadout;
  createSceneAudio?: () => SceneAudioPort | null;
  suspended?: boolean;
  /** Short autosave owns storage; freeze without treating it as a failed write. */
  checkpointBlocked?: boolean;
  reducedMotion?: boolean;
  highContrast?: boolean;
  gamepadEnabled?: boolean;
  controlBindings?: ControlBindings;
  /** Return true only after the parent has durably committed and published the next visit. */
  onAction: (action: WolfCastleAction) => boolean | Promise<boolean>;
  /** Synchronous acknowledgement also works on blur/pagehide, before navigation. */
  onCheckpoint: (checkpoint: WolfCastleCheckpoint) => boolean;
  /** The current room remains in the campaign; this is not a departure. */
  onMenu: () => void;
}

type CastleCommit = (action: WolfCastleAction) => Promise<boolean>;
type CastleCheckpoint = (position: WolfCastlePosition, combat: WolfCastleCombatState | null, dungeonCombat?: WolfCastleCombatState | null) => boolean;
type CastleMotion = WolfCastlePoint & { phase: number; facing: -1 | 1; moving: boolean };
type HeldDirection = 'left' | 'right' | 'up' | 'down';
type CastleDialog = WolfCastleStation | 'map' | 'mandate' | null;
const SEAL_LABELS = ['Seuil', 'Zénith', 'Retour'];
const clamp = (value: number, low: number, high: number) => Math.max(low, Math.min(high, value));
const blankHeld = () => ({ left: false, right: false, up: false, down: false });

function useCastleAudio(createSceneAudio: WolfCastleSceneProps['createSceneAudio'], initialVisit: WolfCastleVisit) {
  const directorRef = useRef<WolfCastleAudio | null>(null);
  const latestRef = useRef({ visit: initialVisit, combat: wolfCastleActiveCombat(initialVisit), enabled: false });
  // One director owns the whole visit, including cues across room changes.
  const syncAudio = useCallback((visit: WolfCastleVisit, combat: WolfCastleCombatState | null, enabled: boolean) => {
    latestRef.current = { visit, combat, enabled };
    directorRef.current?.sync(visit, combat, enabled && !document.hidden);
  }, []);
  const motionAudio = useCallback((visit: WolfCastleVisit, from: WolfCastlePoint, to: WolfCastlePoint, enabled: boolean) => {
    directorRef.current?.motion(visit, from, to, enabled && !document.hidden);
  }, []);
  const confirmedActionAudio = useCallback((before: WolfCastleVisit, action: WolfCastleAction, after: WolfCastleVisit) => {
    directorRef.current?.confirmedAction(before, action, after);
  }, []);
  useEffect(() => {
    const voice = createSceneAudio?.();
    if (!voice) return;
    const latest = latestRef.current;
    const director = new WolfCastleAudio(voice, { ...latest.visit, combat: latest.combat });
    directorRef.current = director;
    director.sync(latest.visit, latest.combat, latest.enabled && !document.hidden);
    return () => { director.dispose(); if (directorRef.current === director) directorRef.current = null; };
  }, [createSceneAudio]);
  const suspendAudio = useCallback(() => { directorRef.current?.suspend(); }, []);
  const unlockAudio = useCallback(() => { if (!document.hidden) directorRef.current?.unlock(); }, []);
  useEffect(() => {
    const hide = () => { if (document.hidden) suspendAudio(); };
    window.addEventListener('blur', suspendAudio);
    window.addEventListener('pagehide', suspendAudio);
    document.addEventListener('visibilitychange', hide);
    return () => {
      window.removeEventListener('blur', suspendAudio);
      window.removeEventListener('pagehide', suspendAudio);
      document.removeEventListener('visibilitychange', hide);
    };
  }, [suspendAudio]);
  return { syncAudio, motionAudio, confirmedActionAudio, suspendAudio, unlockAudio };
}
type CastleAudioController = ReturnType<typeof useCastleAudio>;

export default function WolfCastleScene({ visit, appearance, loadout, createSceneAudio, suspended = false, checkpointBlocked = false, reducedMotion = false,
  highContrast = false, gamepadEnabled = true, controlBindings = DEFAULT_CONTROL_BINDINGS, onAction, onCheckpoint, onMenu }: WolfCastleSceneProps) {
  const rootRef = useRef<HTMLElement>(null);
  const visitRef = useRef(visit);
  const flushRef = useRef<() => boolean>(() => true);
  const pendingRef = useRef(false);
  const mountedRef = useRef(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ text: string; error: boolean; action: WolfCastleAction['type'] } | null>(null);
  const audio = useCastleAudio(createSceneAudio, visit);
  const { syncAudio, confirmedActionAudio, suspendAudio } = audio;
  const audioAllowedRef = useRef(!suspended && !checkpointBlocked);
  useLayoutEffect(() => { audioAllowedRef.current = !suspended && !checkpointBlocked; }, [checkpointBlocked, suspended]);
  const aboard = visit.status === 'aboard';
  const currentRoom = wolfCastleRoom(visit.roomId);

  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);
  useLayoutEffect(() => {
    if (visit.ownerCreatedAt !== visitRef.current.ownerCreatedAt || visit.revision >= visitRef.current.revision) visitRef.current = visit;
  }, [visit]);

  const checkpoint = useCallback<CastleCheckpoint>((position, combat, dungeonCombat) => {
    const current = visitRef.current;
    const value: WolfCastleCheckpoint = { ownerCreatedAt: current.ownerCreatedAt, personalShipId: current.personalShipId,
      roomId: current.roomId, expectedRevision: current.revision, position, combat,
      ...(dungeonCombat === undefined ? {} : { dungeonCombat }) };
    const result = applyWolfCastleCheckpoint(current, value, { ownerCreatedAt: current.ownerCreatedAt, personalShipId: current.personalShipId });
    if (!result.accepted) return false;
    if (!result.changed) return true;
    let accepted = false;
    try { accepted = onCheckpoint(value); } catch { accepted = false; }
    // The parent publishes synchronously, but React may not render its new prop
    // until after a following menu or round action. Keep the acknowledged lease.
    if (accepted) visitRef.current = result.state;
    return accepted;
  }, [onCheckpoint]);

  const registerFlush = useCallback((flush: () => boolean) => {
    flushRef.current = flush;
    return () => { if (flushRef.current === flush) flushRef.current = () => true; };
  }, []);

  const commit = useCallback(async (action: WolfCastleAction) => {
    if (suspended || checkpointBlocked || pendingRef.current) return false;
    if (!flushRef.current()) return false;
    const current = visitRef.current;
    const result = actWolfCastle(current, action, { ownerCreatedAt: current.ownerCreatedAt, personalShipId: current.personalShipId });
    if (!result.accepted || !result.changed) {
      setNotice({ text: result.message, error: !result.accepted, action: action.type });
      return result.accepted;
    }
    pendingRef.current = true;
    setBusy(true);
    let accepted = false;
    try {
      accepted = await onAction(action);
      if (accepted) {
        visitRef.current = result.state;
        if (mountedRef.current && audioAllowedRef.current && !document.hidden && document.hasFocus()) {
          syncAudio(result.state, wolfCastleActiveCombat(result.state), true);
        } else suspendAudio();
        confirmedActionAudio(current, action, result.state);
      }
    }
    catch { accepted = false; }
    finally {
      pendingRef.current = false;
      if (mountedRef.current) {
        setBusy(false);
        setNotice(accepted ? { text: result.message, error: false, action: action.type }
          : { text: 'L’escale n’a pas pu être enregistrée. Ta position est conservée ; réessaie.', error: true, action: action.type });
      }
    }
    return accepted;
  }, [checkpointBlocked, confirmedActionAudio, onAction, suspendAudio, suspended, syncAudio]);

  const menu = useCallback(() => { if (!suspended && !checkpointBlocked && !pendingRef.current && flushRef.current()) onMenu(); }, [checkpointBlocked, onMenu, suspended]);
  useMenuGamepad(rootRef, !aboard && !suspended && !checkpointBlocked && !busy && gamepadEnabled, `wolf-castle-${visit.status}`, menu);

  const activeCombat = wolfCastleActiveCombat(visit);
  const combatResult = aboard && visit.roomId === 'royal-court' && activeCombat &&
    (activeCombat.status === 'victory' || activeCombat.status === 'defeat') ? wolfCastleCombatEventLabel(activeCombat) : null;
  // A terminal checkpoint supersedes the round-start notice, but never a
  // useful error or a later action performed while exploring the castle.
  const resultReplacesNotice = !notice || (!notice.error && ['start-combat', 'next-combat', 'start-dungeon-combat', 'next-dungeon-phase', 'retry-dungeon'].includes(notice.action));
  const footerMessage = combatResult && resultReplacesNotice ? combatResult : notice?.text ?? wolfCastleObjective(visit);

  return <section ref={rootRef} className={`${styles.castle} ${highContrast ? styles.highContrast : ''} ${reducedMotion ? styles.reducedMotion : ''}`}
    aria-label="Château du Roi — système Wolf" aria-hidden={suspended || undefined} inert={suspended || undefined}
    data-wolf-castle-status={visit.status} data-wolf-castle-room={visit.roomId} data-wolf-castle-mode={visit.mode}
    data-wolf-dungeon-status={visit.dungeon?.status ?? 'none'} data-wolf-dungeon-reward={visit.dungeon?.reward.claimed ?? false}
    onKeyDown={event => {
      if (!aboard && !suspended && !event.repeat && matchesControlAction('hunt.pause', event, controlBindings)) {
        event.preventDefault(); event.stopPropagation(); menu();
      }
    }}>
    <header className={styles.header}>
      <div><span className={styles.eyebrow}>SYSTÈME WOLF</span><h1>Château du Roi</h1></div>
      <div className={styles.location}><span>{aboard ? currentRoom.name : visit.status === 'approach' ? 'En approche orbitale' : 'À bord de ton vaisseau'}</span><small>{aboard ? `${visit.visitedRooms.length} / ${WOLF_CASTLE_ROOMS.length} salles explorées` : shipForId(visit.personalShipId).name}</small></div>
      <button type="button" className={styles.quietButton} disabled={suspended || busy || checkpointBlocked} onClick={menu} data-wolf-castle-menu>Menu</button>
    </header>
    {aboard ? <CastleInterior key={`${visit.ownerCreatedAt}:${visit.roomId}:${visit.entryFrom ?? 'berth'}`}
      visit={visit} appearance={appearance} loadout={loadout} suspended={suspended || busy || checkpointBlocked} pauseRequested={suspended} checkpointBlocked={checkpointBlocked}
      audio={audio}
      reducedMotion={reducedMotion} gamepadEnabled={gamepadEnabled} controlBindings={controlBindings}
      commit={commit} checkpoint={checkpoint} registerFlush={registerFlush} onMenu={menu} />
      : <CastleApproach visit={visit} busy={busy || suspended || checkpointBlocked} audio={audio} commit={commit} />}
    <footer className={`${styles.status} ${notice?.error ? styles.error : ''}`} role={notice?.error ? 'alert' : 'status'} aria-live="polite">
      <span>{busy ? 'Enregistrement de l’escale…' : footerMessage}</span>
      <small>{aboard ? 'Ton vaisseau reste dans la baie royale.' : 'Forteresse orbitale · Destination de campagne'}</small>
    </footer>
  </section>;
}

function CastleApproach({ visit, busy, audio, commit }: { visit: WolfCastleVisit; busy: boolean; audio: CastleAudioController; commit: CastleCommit }) {
  const firstRef = useRef<HTMLButtonElement>(null);
  const { syncAudio, unlockAudio } = audio;
  useLayoutEffect(() => { syncAudio(visit, wolfCastleActiveCombat(visit), !busy); }, [busy, syncAudio, visit]);
  useEffect(() => { if (!busy) firstRef.current?.focus({ preventScroll: true }); }, [busy]);
  return <div className={styles.approach} onPointerDownCapture={unlockAudio} onKeyDownCapture={event => { if (!event.repeat) unlockAudio(); }}>
    <div className={styles.orbitArt} aria-label="Forteresse orbitale et vaisseau personnel">
      <div className={styles.orbitPlanet} aria-hidden="true" />
      <img src={wolfCastleRuntimeAsset(`${WOLF_CASTLE_ART_ROOT}castle-exterior.png`)} alt="La forteresse pyramidale du Predator King en orbite du système Wolf" className={styles.exterior} draggable={false} />
      <div className={styles.approachShip}><img src={shipProfileAssetPath(visit.personalShipId)} alt={`Ton vaisseau : ${shipForId(visit.personalShipId).name}`} draggable={false} /><span>TON VAISSEAU</span></div>
      <span className={styles.orbitCaption}>CHÂTEAU ORBITAL DU ROI</span>
    </div>
    <div className={styles.approachBrief}>
      <span className={styles.eyebrow}>LIAISON À LA BAIE ROYALE</span>
      <h2>{visit.status === 'approach' ? 'Le château t’attend.' : 'L’escale est terminée.'}</h2>
      <p>{visit.invitationId ? 'Une invitation t’attend à la salle d’audience. Traverse la galerie, présente-toi au pied du trône, puis rejoins le conseil.' : 'Explore la forteresse, ses archives et sa cour d’épreuve. La baie garde ton vaisseau prêt pour le retour.'}</p>
      <dl className={styles.approachDetails}><div><dt>Destination</dt><dd>Système Wolf</dd></div><div><dt>Visite</dt><dd>{visit.mode === 'audience' ? 'Audience royale' : visit.mode === 'trial' ? 'Épreuve des trois sceaux' : 'Exploration de la forteresse'}</dd></div><div><dt>Vaisseau personnel</dt><dd>{shipForId(visit.personalShipId).name}</dd></div></dl>
      <button ref={firstRef} type="button" className={styles.primaryButton} disabled={busy} data-wolf-castle-action={visit.status === 'approach' ? 'board' : 'approach'}
        onClick={() => void commit({ type: visit.status === 'approach' ? 'board' : 'approach' })}>{visit.status === 'approach' ? 'Amarrer et entrer dans le château' : 'Approcher de nouveau'}</button>
      {visit.status === 'approach' && <button type="button" className={styles.quietButton} disabled={busy} data-wolf-castle-action="depart" onClick={() => void commit({ type: 'depart' })}>Annuler l’approche</button>}
    </div>
  </div>;
}

interface CastleInteriorProps {
  visit: WolfCastleVisit;
  appearance: HunterAppearance;
  loadout: Loadout;
  audio: CastleAudioController;
  suspended: boolean;
  pauseRequested: boolean;
  checkpointBlocked: boolean;
  reducedMotion: boolean;
  gamepadEnabled: boolean;
  controlBindings: ControlBindings;
  commit: CastleCommit;
  checkpoint: CastleCheckpoint;
  registerFlush: (flush: () => boolean) => () => void;
  onMenu: () => void;
}

function CastleInterior({ visit, appearance, loadout, audio, suspended, pauseRequested, checkpointBlocked, reducedMotion, gamepadEnabled, controlBindings, commit, checkpoint, registerFlush, onMenu }: CastleInteriorProps) {
  const room = wolfCastleRoom(visit.roomId);
  const rootRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const [motion, setMotion] = useState<CastleMotion>(() => ({ ...visit.position, phase: 0, moving: false }));
  const motionRef = useRef(motion);
  const [combat, setCombat] = useState(() => wolfCastleActiveCombat(visit));
  const combatRef = useRef(combat);
  const trainingCombatRef = useRef(visit.combat);
  const liveVisitRef = useRef(visit);
  useLayoutEffect(() => { liveVisitRef.current = visit; trainingCombatRef.current = visit.combat; }, [visit]);
  const [combatPaused, setCombatPaused] = useState(() => wolfCastleCombatPending(wolfCastleActiveCombat(visit)));
  const pausedRef = useRef(combatPaused);
  const [dismissedResult, setDismissedResult] = useState(() => {
    const previous = wolfCastleActiveCombat(visit);
    return previous?.scenario === 'training' && !wolfCastleCombatPending(previous) &&
      (visit.dungeon?.status === 'accepted' || visit.dungeon?.status === 'ready')
      ? `${previous.scenario}:${previous.attempt}:${previous.encounterIndex}:${previous.status}` : '';
  });
  const [saveError, setSaveError] = useState(false);
  const saveBlockedRef = useRef(false);
  const checkpointBlockedRef = useRef(checkpointBlocked);
  const deferredCheckpointRef = useRef(false);
  const commandRef = useRef({ attack: false, parry: false, evade: false });
  const keysDownRef = useRef(new Set<string>());
  const controlBindingsRef = useRef(controlBindings);
  const [dimensions, setDimensions] = useState({ width: 1100, height: 480 });
  const [dialog, setDialog] = useState<CastleDialog>(null);
  const [waypoint, setWaypoint] = useState<WolfCastleStation | null>(null);
  const [guidance, setGuidance] = useState('');
  const heldRef = useRef(blankHeld());
  const pathRef = useRef<WolfCastlePoint[]>([]);
  const activeRef = useRef(false);
  const gamepadReadyRef = useRef(false);
  const actionRef = useRef<() => void>(() => {});
  const menuRef = useRef(onMenu);
  const mapRef = useRef<() => void>(() => {});
  const flushLatestRef = useRef<() => boolean>(() => true);
  const dungeonCombat = combat?.scenario === 'dungeon';
  const combatTitle = dungeonCombat ? 'Le Verrou de Wolf' : 'Épreuve des trois gardes';
  const combatResultKey = combat ? `${combat.scenario}:${combat.attempt}:${combat.encounterIndex}:${combat.status}` : '';
  const combatVisible = visit.roomId === 'royal-court' && Boolean(combat && combat.status !== 'abandoned' &&
    (wolfCastleCombatPending(combat) || dismissedResult !== combatResultKey));
  const combatVisibleRef = useRef(combatVisible);
  const wasSuspendedRef = useRef(pauseRequested);
  const resultOverlay = combatVisible && combat?.status !== 'active';
  const combatOverlay = combatVisible && (combatPaused || resultOverlay);
  const { syncAudio, motionAudio, suspendAudio, unlockAudio } = audio;
  const audioEnabled = !suspended && !dialog && !saveError && (!combatVisible || !combatPaused);
  useLayoutEffect(() => { syncAudio(visit, combat, audioEnabled); }, [audioEnabled, combat, syncAudio, visit]);
  const nearest = combatVisible ? null : wolfCastleNearestStation(visit.roomId, motion);
  const cameraHeight = combatVisible && dimensions.width < 720 ? 540 : WOLF_CASTLE_WORLD.height;
  const baseCameraWidth = clamp(dimensions.width / dimensions.height * cameraHeight, 430, WOLF_CASTLE_WORLD.width);
  const cameraWidth = combatVisible && combat ? Math.max(baseCameraWidth, Math.min(1100, Math.abs(combat.enemy.x - motion.x) + 410)) : baseCameraWidth;
  const cameraFocus = combatVisible && combat ? (motion.x + combat.enemy.x) / 2 : motion.x;
  const cameraX = clamp(cameraFocus - cameraWidth / 2, 0, WOLF_CASTLE_WORLD.width - cameraWidth);
  const titleId = useId();

  const clearInput = useCallback(() => {
    heldRef.current = blankHeld();
    commandRef.current = { attack: false, parry: false, evade: false };
    keysDownRef.current.clear();
    pathRef.current = [];
    gamepadReadyRef.current = false;
  }, []);

  useLayoutEffect(() => {
    // The save writer normalizes settings into fresh objects at every
    // checkpoint. Only an actual remapping invalidates live input and routes.
    if (JSON.stringify(controlBindingsRef.current) !== JSON.stringify(controlBindings)) clearInput();
    controlBindingsRef.current = controlBindings;
  }, [clearInput, controlBindings]);

  const flush = useCallback(() => {
    if (checkpointBlockedRef.current) { deferredCheckpointRef.current = true; return false; }
    const { x, y, facing } = motionRef.current;
    const live = combatRef.current;
    const accepted = live?.scenario === 'dungeon'
      ? checkpoint({ x, y, facing }, trainingCombatRef.current, live)
      : checkpoint({ x, y, facing }, live);
    deferredCheckpointRef.current = false;
    saveBlockedRef.current = !accepted;
    setSaveError(!accepted);
    if (!accepted) { activeRef.current = false; clearInput(); }
    return accepted;
  }, [checkpoint, clearInput]);

  useLayoutEffect(() => {
    flushLatestRef.current = flush;
    return registerFlush(flush);
  }, [flush, registerFlush]);

  useLayoutEffect(() => {
    checkpointBlockedRef.current = checkpointBlocked;
    if (!checkpointBlocked && deferredCheckpointRef.current) flushLatestRef.current();
  }, [checkpointBlocked]);

  const pauseCombat = useCallback(() => {
    suspendAudio();
    if (combatRef.current?.status === 'active') {
      pausedRef.current = true; setCombatPaused(true);
    }
    activeRef.current = false; clearInput(); flushLatestRef.current();
  }, [clearInput, suspendAudio]);

  const resumeCombat = useCallback(() => {
    if (suspended || !flushLatestRef.current()) return;
    clearInput(); pausedRef.current = false; setCombatPaused(false);
    rootRef.current?.focus({ preventScroll: true });
  }, [clearInput, suspended]);

  const issueCombatCommand = useCallback((command: WolfCastleCombatCommand) => {
    if (!activeRef.current || !combatVisibleRef.current || combatRef.current?.status !== 'active') return;
    commandRef.current[command] = true;
    rootRef.current?.focus({ preventScroll: true });
  }, []);

  // A checkpoint publication must not rewind a frame already simulated locally.
  // Only a new attempt/round or an explicit abandonment replaces the live engine.
  useLayoutEffect(() => {
    const next = wolfCastleActiveCombat(visit), current = combatRef.current;
    if (next?.scenario !== current?.scenario || next?.attempt !== current?.attempt || next?.encounterIndex !== current?.encounterIndex ||
      (next?.status === 'abandoned' && current?.status !== 'abandoned')) {
      combatRef.current = next; setCombat(next);
      motionRef.current = { ...visit.position, phase: 0, moving: false }; setMotion(motionRef.current);
      clearInput();
    }
  }, [clearInput, visit]);

  const closeDialog = useCallback(() => {
    if (suspended) return;
    clearInput(); setDialog(null);
    rootRef.current?.focus({ preventScroll: true });
  }, [clearInput, suspended]);

  const showDialog = useCallback((value: Exclude<CastleDialog, null>) => {
    if (suspended || combatVisible || !flushLatestRef.current()) return;
    activeRef.current = false; clearInput(); setDialog(value);
  }, [clearInput, combatVisible, suspended]);

  const interact = useCallback((station?: WolfCastleStation | null) => {
    if (suspended || dialog || combatVisible || saveBlockedRef.current) return;
    const candidate = station ?? wolfCastleNearestStation(visit.roomId, motionRef.current);
    if (!candidate || Math.hypot(candidate.x - motionRef.current.x, candidate.y - motionRef.current.y) > WOLF_CASTLE_WORLD.interactionRadius) return;
    clearInput();
    if (candidate.kind === 'door' && candidate.targetRoom) { void commit({ type: 'move-room', roomId: candidate.targetRoom }); return; }
    if (candidate.kind === 'seal' && candidate.sealId) { void commit({ type: 'activate-seal', sealId: candidate.sealId }); return; }
    showDialog(candidate);
  }, [clearInput, combatVisible, commit, dialog, showDialog, suspended, visit.roomId]);

  const selectStation = useCallback((station: WolfCastleStation) => {
    if (suspended || dialog || combatVisible || saveBlockedRef.current) return;
    rootRef.current?.focus({ preventScroll: true });
    if (Math.hypot(station.x - motionRef.current.x, station.y - motionRef.current.y) <= WOLF_CASTLE_WORLD.interactionRadius) { interact(station); return; }
    const route = wolfCastleWalkPath(visit.roomId, motionRef.current, station);
    pathRef.current = route;
    setWaypoint(station);
    setGuidance(route.length ? `Rejoindre : ${station.label}` : 'Rejoins le passage central pour contourner le socle.');
  }, [combatVisible, dialog, interact, suspended, visit.roomId]);

  const guideToRoom = useCallback((target: WolfCastleRoomId) => {
    if (suspended || combatVisible || saveBlockedRef.current) return;
    const route = wolfCastleRoute(visit.roomId, target);
    const exit = room.stations.find(station => station.targetRoom === route[1]);
    clearInput(); setDialog(null);
    rootRef.current?.focus({ preventScroll: true });
    if (!exit) { setGuidance('Tu te trouves déjà dans cette salle.'); return; }
    pathRef.current = wolfCastleWalkPath(visit.roomId, motionRef.current, exit);
    setWaypoint(exit);
    setGuidance(`Vers ${wolfCastleRoom(target).name} : ${route.slice(1).map(id => wolfCastleRoom(id).name).join(' → ')}`);
  }, [clearInput, combatVisible, room.stations, suspended, visit.roomId]);

  useLayoutEffect(() => {
    combatVisibleRef.current = combatVisible;
    pausedRef.current = combatPaused;
    activeRef.current = !suspended && !dialog && !saveError && (!combatVisible || (combat?.status === 'active' && !combatPaused));
    actionRef.current = () => interact();
    menuRef.current = onMenu;
    mapRef.current = () => showDialog('map');
    if (!activeRef.current && !(checkpointBlocked && !pauseRequested && !dialog && !saveError)) clearInput();
  }, [checkpointBlocked, clearInput, combat?.status, combatPaused, combatVisible, dialog, interact, onMenu, pauseRequested, saveError, showDialog, suspended]);

  useLayoutEffect(() => {
    if (pauseRequested && !wasSuspendedRef.current) pauseCombat();
    wasSuspendedRef.current = pauseRequested;
  }, [pauseCombat, pauseRequested]);

  useEffect(() => {
    rootRef.current?.focus({ preventScroll: true });
    const element = viewportRef.current;
    if (!element || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(entries => {
      const box = entries[0]?.contentRect;
      if (box && box.width > 0 && box.height > 0) setDimensions({ width: box.width, height: box.height });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if ((!dialog && !combatOverlay && !saveError) || suspended) return;
    dialogRef.current?.querySelector<HTMLElement>('button:not(:disabled)')?.focus({ preventScroll: true });
  }, [combatOverlay, dialog, saveError, suspended]);

  useMenuGamepad(dialogRef, Boolean(dialog || combatOverlay || saveError) && !suspended && gamepadEnabled,
    `wolf-dialog-${typeof dialog === 'string' ? dialog : dialog?.id}-${combat?.status}-${combatPaused}-${saveError}`,
    dialog ? closeDialog : onMenu);

  useEffect(() => {
    const change = (event: KeyboardEvent, pressed: boolean) => {
      const bindings = controlBindingsRef.current;
      if (!pressed) {
        keysDownRef.current.delete(event.code);
        for (const [direction, action] of [['left', 'hunt.moveLeft'], ['right', 'hunt.moveRight'], ['up', 'hunt.moveUp'], ['down', 'hunt.moveDown']] as const) {
          if (matchesControlAction(action, event, bindings)) heldRef.current[direction] = false;
        }
        return;
      }
      const root = rootRef.current;
      if (!activeRef.current || document.hidden || !root?.contains(document.activeElement) || event.defaultPrevented ||
          (event.target instanceof Element && event.target.closest('input, textarea, select, [contenteditable="true"]'))) return;
      // Ignore the repeat from a key held across an entrance, modal, or save.
      if (event.repeat) { if (Object.values(heldRef.current).some(Boolean)) event.preventDefault(); return; }
      if (keysDownRef.current.has(event.code)) return;
      keysDownRef.current.add(event.code);
      for (const [direction, action] of [['left', 'hunt.moveLeft'], ['right', 'hunt.moveRight'], ['up', 'hunt.moveUp'], ['down', 'hunt.moveDown']] as const) {
        if (matchesControlAction(action, event, bindings)) {
          pathRef.current = []; heldRef.current[direction] = true; event.preventDefault(); return;
        }
      }
      if (combatVisibleRef.current && combatRef.current?.status === 'active') {
        for (const [command, action] of [['attack', 'hunt.melee'], ['parry', 'hunt.weaponPrimary'], ['evade', 'hunt.jump']] as const) {
          if (matchesControlAction(action, event, bindings)) { event.preventDefault(); event.stopPropagation(); issueCombatCommand(command); return; }
        }
      }
      if (matchesControlAction('hunt.interact', event, bindings)) { event.preventDefault(); event.stopPropagation(); actionRef.current(); }
      else if (matchesControlAction('hunt.pause', event, bindings)) { event.preventDefault(); event.stopPropagation(); clearInput(); menuRef.current(); }
    };
    const down = (event: KeyboardEvent) => change(event, true), up = (event: KeyboardEvent) => change(event, false);
    const visibility = () => { if (document.hidden) pauseCombat(); };
    window.addEventListener('keydown', down); window.addEventListener('keyup', up);
    window.addEventListener('blur', pauseCombat); window.addEventListener('pagehide', pauseCombat);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      window.removeEventListener('keydown', down); window.removeEventListener('keyup', up);
      window.removeEventListener('blur', pauseCombat); window.removeEventListener('pagehide', pauseCombat);
      document.removeEventListener('visibilitychange', visibility); clearInput();
    };
  }, [clearInput, issueCombatCommand, pauseCombat]);

  useEffect(() => {
    let request = 0, lastTime = performance.now(), lastCheckpoint = lastTime, padIdentity = '';
    let previousConfirm = false, previousBack = false, previousMap = false, previousParry = false, previousEvade = false;
    const frame = (now: number) => {
      const elapsed = Math.max(0, now - lastTime), delta = Math.min(50, elapsed); lastTime = now;
      request = requestAnimationFrame(frame);
      // Storage owns a short freeze, not a new input context. Keep the route,
      // held directions and gamepad edges while still consuming wall-clock time.
      // Blur, menus, remapping and failed writes retain their explicit resets.
      if (checkpointBlockedRef.current && !wasSuspendedRef.current && !saveBlockedRef.current &&
          !document.hidden && document.hasFocus() && rootRef.current?.contains(document.activeElement)) return;
      if (!activeRef.current || document.hidden || !document.hasFocus() || !rootRef.current?.contains(document.activeElement)) {
        motionAudio(liveVisitRef.current, motionRef.current, motionRef.current, false);
        if (activeRef.current && combatVisibleRef.current && combatRef.current?.status === 'active' && !pausedRef.current) pauseCombat();
        clearInput(); previousConfirm = previousBack = previousMap = previousParry = previousEvade = false;
        if (motionRef.current.moving) { motionRef.current = { ...motionRef.current, moving: false }; setMotion(motionRef.current); }
        return;
      }
      if (elapsed > 1000 && combatVisibleRef.current) { pauseCombat(); return; }
      let axisX = 0, axisY = 0;
      if (gamepadEnabled) {
        let pad: Gamepad | null | undefined;
        try { pad = Array.from(navigator.getGamepads?.() ?? []).find(candidate => candidate?.connected); } catch { /* Keyboard and pointer remain available. */ }
        if (pad) {
          const identity = `${pad.index}:${pad.id}`;
          if (identity !== padIdentity) { padIdentity = identity; gamepadReadyRef.current = false; }
          const pressed = (index: number) => pad.buttons[index]?.pressed ?? false;
          const x = Number.isFinite(pad.axes[0]) ? pad.axes[0] : 0, y = Number.isFinite(pad.axes[1]) ? pad.axes[1] : 0;
          const neutral = Math.abs(x) < .22 && Math.abs(y) < .22 && !pad.buttons.some(button => button.pressed);
          if (!gamepadReadyRef.current) { if (neutral) gamepadReadyRef.current = true; }
          else {
            axisX = Math.abs(x) > .22 ? x : Number(pressed(15)) - Number(pressed(14));
            axisY = Math.abs(y) > .22 ? y : Number(pressed(13)) - Number(pressed(12));
            const fighting = combatVisibleRef.current;
            const confirm = pressed(0), back = pressed(9) || (!fighting && pressed(1)), map = pressed(2);
            const parry = pressed(3), evade = pressed(1);
            if (back && !previousBack) { activeRef.current = false; clearInput(); menuRef.current(); }
            else if (fighting) {
              if (map && !previousMap) issueCombatCommand('attack');
              if (parry && !previousParry) issueCombatCommand('parry');
              if (evade && !previousEvade) issueCombatCommand('evade');
            } else if (confirm && !previousConfirm) actionRef.current();
            else if (map && !previousMap) mapRef.current();
            previousConfirm = confirm; previousBack = back; previousMap = map; previousParry = parry; previousEvade = evade;
          }
        } else { padIdentity = ''; gamepadReadyRef.current = false; previousConfirm = previousBack = previousMap = previousParry = previousEvade = false; }
      }
      if (!activeRef.current) return;
      const held = heldRef.current;
      let x = Number(held.right) - Number(held.left) + axisX, y = Number(held.down) - Number(held.up) + axisY;
      if (Math.hypot(x, y) > .01) pathRef.current = [];
      else {
        const target = pathRef.current[0];
        if (target) {
          const distance = Math.hypot(target.x - motionRef.current.x, target.y - motionRef.current.y);
          if (distance < 4) pathRef.current.shift();
          else {
            const speedDistance = WOLF_CASTLE_WORLD.actorSpeed * delta / 1000;
            const length = Math.max(distance, speedDistance, .01);
            x = (target.x - motionRef.current.x) / length; y = (target.y - motionRef.current.y) / length;
          }
        }
      }
      const old = motionRef.current;
      if (combatVisibleRef.current && combatRef.current?.status === 'active') {
        motionAudio(liveVisitRef.current, old, old, false);
        const previous = combatRef.current;
        const next = stepWolfCastleCombat(previous, { moveX: x, moveY: y, ...commandRef.current }, delta);
        commandRef.current = { attack: false, parry: false, evade: false };
        combatRef.current = next; setCombat(next);
        const moving = Math.hypot(next.player.x - old.x, next.player.y - old.y) > .02;
        motionRef.current = { x: next.player.x, y: next.player.y, facing: next.player.facing, moving,
          phase: moving ? old.phase + delta / 1000 : old.phase };
        setMotion(motionRef.current);
        if (next.status !== 'active') { activeRef.current = false; clearInput(); flushLatestRef.current(); lastCheckpoint = now; }
        else if (now - lastCheckpoint >= 2000) { flushLatestRef.current(); lastCheckpoint = now; }
        return;
      }
      const next = stepWolfCastleActor(visit.roomId, old, { x, y }, delta);
      motionAudio(liveVisitRef.current, old, next, true);
      const moving = Math.hypot(next.x - old.x, next.y - old.y) > .02;
      if (moving || old.moving !== moving) {
        motionRef.current = { ...next, moving, phase: moving ? old.phase + delta / 1000 : old.phase, facing: Math.abs(x) > .05 ? (x < 0 ? -1 : 1) : old.facing };
        setMotion(motionRef.current);
        if (!moving || now - lastCheckpoint >= 2000) { flushLatestRef.current(); lastCheckpoint = now; }
      }
    };
    request = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(request);
  }, [clearInput, gamepadEnabled, issueCombatCommand, motionAudio, pauseCombat, visit.roomId]);

  const floorPointer = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (suspended || dialog || combatOverlay || saveError || event.button !== 0 || (event.target instanceof Element && event.target.closest('[data-castle-station]'))) return;
    const svg = svgRef.current, transform = svg?.getScreenCTM();
    if (!svg || !transform) return;
    const point = svg.createSVGPoint(); point.x = event.clientX; point.y = event.clientY;
    const worldPoint = point.matrixTransform(transform.inverse());
    const { floor, actorRadius } = WOLF_CASTLE_WORLD;
    const target = combatVisible
      ? { x: clamp(worldPoint.x, WOLF_CASTLE_COMBAT_ARENA.minX, WOLF_CASTLE_COMBAT_ARENA.maxX), y: clamp(worldPoint.y, WOLF_CASTLE_COMBAT_ARENA.minY, WOLF_CASTLE_COMBAT_ARENA.maxY) }
      : { x: clamp(worldPoint.x, floor.x + actorRadius + 1, floor.x + floor.width - actorRadius - 1), y: clamp(worldPoint.y, floor.y + actorRadius + 1, floor.y + floor.height - actorRadius - 1) };
    if (!isWolfCastlePointWalkable(visit.roomId, target)) { setGuidance('Ce socle occupe le sol. Vise le passage devant lui.'); return; }
    pathRef.current = wolfCastleWalkPath(visit.roomId, motionRef.current, target);
    setWaypoint(null); setGuidance(''); rootRef.current?.focus({ preventScroll: true });
  };

  const heldTouch = (direction: HeldDirection, pressed: boolean, focusScene = true) => {
    if (pressed && (suspended || dialog || combatOverlay || saveError)) return;
    heldRef.current[direction] = pressed;
    if (pressed) { pathRef.current = []; if (focusScene) rootRef.current?.focus({ preventScroll: true }); }
  };
  const dialogAction = async (action: WolfCastleAction) => {
    if (await commit(action)) {
      if (['start-combat', 'next-combat', 'start-dungeon-combat', 'next-dungeon-phase', 'retry-dungeon'].includes(action.type)) {
        pausedRef.current = false; setCombatPaused(false); setDismissedResult('');
      }
      clearInput(); setDialog(null); rootRef.current?.focus({ preventScroll: true });
    }
  };
  const dismissCombat = (target?: WolfCastleRoomId) => {
    if (suspended || !combat || wolfCastleCombatPending(combat) || !flush()) return;
    setDismissedResult(combatResultKey); clearInput(); rootRef.current?.focus({ preventScroll: true });
    if (target) {
      const route = wolfCastleRoute(visit.roomId, target);
      const exit = room.stations.find(station => station.targetRoom === route[1]);
      if (exit) {
        pathRef.current = wolfCastleWalkPath(visit.roomId, motionRef.current, exit);
        setWaypoint(exit);
        setGuidance(`Vers ${wolfCastleRoom(target).name} : ${route.slice(1).map(id => wolfCastleRoom(id).name).join(' → ')}`);
      }
    }
  };
  const combatPlayer = combatVisible ? combat?.player : undefined;
  const hunterWidth = combatVisible ? 124 : 110;
  const overlayOpen = Boolean(dialog || combatOverlay || saveError);

  return <div ref={rootRef} className={styles.interior} tabIndex={-1} data-wolf-castle-interior
    data-wolf-castle-x={motion.x.toFixed(1)} data-wolf-castle-y={motion.y.toFixed(1)} data-wolf-castle-moving={motion.moving}
    onPointerDownCapture={unlockAudio} onKeyDownCapture={event => { if (!event.repeat) unlockAudio(); }}
    data-wolf-combat-status={combatVisible ? combat?.status : undefined} data-wolf-combat-encounter={combatVisible ? combat?.encounterIndex : undefined}
    data-wolf-combat-scenario={combatVisible ? combat?.scenario : undefined}
    data-wolf-combat-paused={combatVisible ? combatPaused : undefined} data-wolf-combat-elapsed={combatVisible ? combat?.elapsedMs.toFixed(1) : undefined}
    data-wolf-combat-player-health={combatVisible ? combat?.player.health : undefined} data-wolf-combat-enemy-health={combatVisible ? combat?.enemy.health : undefined}
    data-wolf-combat-player-x={combatVisible ? combat?.player.x.toFixed(1) : undefined} data-wolf-combat-player-y={combatVisible ? combat?.player.y.toFixed(1) : undefined}
    data-wolf-combat-player-facing={combatVisible ? combat?.player.facing : undefined} data-wolf-combat-enemy-x={combatVisible ? combat?.enemy.x.toFixed(1) : undefined}
    data-wolf-combat-enemy-y={combatVisible ? combat?.enemy.y.toFixed(1) : undefined} data-wolf-combat-enemy-phase={combatVisible ? combat?.enemy.phase : undefined}
    data-wolf-combat-enemy-ms={combatVisible ? combat?.enemy.phaseMs.toFixed(1) : undefined} data-wolf-combat-enemy-strike={combatVisible ? combat?.enemy.strike : undefined}
    data-wolf-combat-player-attack-ms={combatVisible ? combat?.player.attackMs.toFixed(1) : undefined}
    data-wolf-combat-attack-cooldown-ms={combatVisible ? combat?.player.attackCooldownMs.toFixed(1) : undefined}
    data-wolf-combat-defense-cooldown-ms={combatVisible ? combat?.player.defenseCooldownMs.toFixed(1) : undefined}
    data-wolf-castle-save-error={saveError || undefined}
    onKeyDown={event => {
      if (!overlayOpen || suspended) return;
      if (matchesControlAction('hunt.pause', event, controlBindings) && !event.repeat) { event.preventDefault(); event.stopPropagation(); if (dialog && !saveError) closeDialog(); else onMenu(); }
      if (event.key === 'Tab') {
        const controls = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], [tabindex="0"]') ?? []);
        const index = controls.indexOf(document.activeElement as HTMLElement);
        if (controls.length && ((event.shiftKey && index <= 0) || (!event.shiftKey && (index === controls.length - 1 || index === -1)))) {
          event.preventDefault(); controls[event.shiftKey ? controls.length - 1 : 0]?.focus();
        }
      }
    }}>
    <div className={styles.objective}><span className={styles.eyebrow}>{visit.dungeon && !['completed', 'abandoned'].includes(visit.dungeon.status) ? 'MANDAT ROYAL' : 'OBJECTIF'}</span><p>{combatVisible && combat ? wolfCastleCombatSpec(combat).lesson : wolfCastleDungeonObjective(visit) ?? wolfCastleObjective(visit)}</p></div>
    <div className={styles.playArea} inert={overlayOpen || undefined}>
      {combatVisible && combat && <CastleCombatHud combat={combat} />}
      <div ref={viewportRef} className={styles.viewport}>
        <svg ref={svgRef} className={styles.scene} viewBox={`${cameraX} ${WOLF_CASTLE_WORLD.height - cameraHeight} ${cameraWidth} ${cameraHeight}`}
          preserveAspectRatio="xMidYMid meet" role="group" aria-label={`${room.name} : sol, portes et installations interactives`}
          data-wolf-castle-x={motion.x.toFixed(1)} data-wolf-castle-y={motion.y.toFixed(1)} onPointerDown={floorPointer}>
          <title>{room.name}</title>
          <image href={wolfCastleRuntimeAsset(`${WOLF_CASTLE_ART_ROOT}${room.background}.png`)} x="0" y="0" width="1600" height="720" preserveAspectRatio="xMidYMax slice" aria-hidden="true" />
          <rect x="0" y="0" width="1600" height="720" fill="#000" opacity=".12" pointerEvents="none" />
          {combatVisible && combat && <CastleCombatTelegraph combat={combat} />}
          {visit.roomId === 'royal-berth' && <g pointerEvents="none" aria-label="Ton vaisseau personnel reste amarré">
            <ellipse cx="760" cy="520" rx="300" ry="26" fill="#000" opacity=".55" />
            <image href={shipProfileAssetPath(visit.personalShipId)} x="458" y="222" width="630" height="300" preserveAspectRatio="xMidYMid meet" />
          </g>}
          {room.stations.filter(station => station.kind === 'door').map(station => <g key={station.id} aria-hidden="true" pointerEvents="none">
            <rect x={station.x - 46} y={station.y - 211} width="92" height="210" fill="#030707" opacity=".9" />
            <image href={wolfCastleRuntimeAsset(`${WOLF_CASTLE_ART_ROOT}airlock-leaf.png`)} {...wolfCastleSpriteImageFrame('airlock-leaf', station.x, station.y, 108, 204)} opacity={nearest?.id === station.id ? .22 : .72} preserveAspectRatio="none" />
            <image href={wolfCastleRuntimeAsset(`${WOLF_CASTLE_ART_ROOT}airlock-frame.png`)} {...wolfCastleSpriteImageFrame('airlock-frame', station.x, station.y + 6, 200, 280)} preserveAspectRatio="none" />
          </g>)}
          <g pointerEvents="none" aria-hidden="true">
            {[...room.props].sort(propDepthOrder).filter(item => (item.depthY ?? item.y) <= motion.y).map(item => <CastleProp key={item.id} prop={item} />)}
          </g>
          {waypoint && !combatVisible && <g pointerEvents="none" aria-hidden="true"><ellipse cx={waypoint.x} cy={waypoint.y + 3} rx="38" ry="10" fill="none" stroke="#f5c78c" strokeWidth="2" strokeDasharray="5 5" /><path d={`M${waypoint.x - 8} ${waypoint.y - 50}l8 8 8-8`} stroke="#f5c78c" strokeWidth="3" fill="none" /></g>}
          {combatVisible && combat && combat.enemy.y <= motion.y && <CastleCombatGuard combat={combat} reducedMotion={reducedMotion} />}
          <g pointerEvents="none" data-castle-hunter data-castle-hunter-preset={appearance.presetId}>
            <ellipse cx={motion.x} cy={motion.y + 2} rx="27" ry="7" fill="#000" opacity=".65" />
            <foreignObject x={motion.x - hunterWidth / 2} y={motion.y - 366 * hunterWidth / 256} width={hunterWidth} height={384 * hunterWidth / 256} overflow="visible">
              <HunterRigPreview appearance={appearance} armorId={loadout.armorId} weaponIds={loadout.weaponIds} gearIds={loadout.gearIds} size={hunterWidth}
                pose={!reducedMotion && combatPlayer && combatPlayer.evadeMs > 0 ? 'jump' : motion.moving && !suspended && !overlayOpen && !reducedMotion ? 'run' : 'idle'}
                phase={reducedMotion ? 0 : motion.phase} facing={motion.facing} speed={motion.moving && !suspended && !overlayOpen ? WOLF_CASTLE_WORLD.actorSpeed : 0}
                bladesExtended={Boolean(combatPlayer && (combatPlayer.attackMs > 0 || combatPlayer.parryMs > 0))} aiming={Boolean(combatPlayer && combatPlayer.parryMs > 0)}
                label="Ton chasseur équipé dans le château" style={{ display: 'block', filter: `drop-shadow(0 2px 3px #000)${combatPlayer && combatPlayer.hurtMs > 0 ? ' sepia(.5)' : ''}` }} />
            </foreignObject>
            {combatPlayer && combatPlayer.attackMs > 0 && <path d={`M${motion.x + motion.facing * 18} ${motion.y - 118}Q${motion.x + motion.facing * 140} ${motion.y - 145} ${motion.x + motion.facing * 145} ${motion.y - 58}`} fill="none" stroke="#f7e7bd" strokeWidth="5" opacity=".8" />}
            {combatPlayer && combatPlayer.parryMs > 0 && <path d={`M${motion.x + motion.facing * 38} ${motion.y - 135}Q${motion.x + motion.facing * 90} ${motion.y - 80} ${motion.x + motion.facing * 38} ${motion.y - 25}`} fill="none" stroke="#a9e3ef" strokeWidth="6" />}
          </g>
          {combatVisible && combat && combat.enemy.y > motion.y && <CastleCombatGuard combat={combat} reducedMotion={reducedMotion} />}
          <g pointerEvents="none" aria-hidden="true">{[...room.props].sort(propDepthOrder).filter(item => (item.depthY ?? item.y) > motion.y).map(item => <CastleProp key={item.id} prop={item} />)}</g>
          {!combatVisible && room.stations.map(station => {
            const inRange = nearest?.id === station.id;
            const lit = station.kind === 'seal' && visit.trial.status !== 'idle' && WOLF_CASTLE_SEALS.indexOf(station.sealId!) < visit.trial.progress;
            return <g key={station.id} role="button" tabIndex={suspended || dialog ? -1 : 0} data-castle-station={station.id}
              aria-label={`${inRange ? 'Interagir' : 'Rejoindre'} : ${station.label}`} aria-disabled={suspended} className={styles.station}
              onClick={event => { event.stopPropagation(); selectStation(station); }}
              onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); event.stopPropagation(); if (!event.repeat) selectStation(station); } }}>
              <rect x={station.x - 68} y={station.y - 115} width="136" height="143" fill="transparent" />
              <ellipse cx={station.x} cy={station.y + 4} rx={inRange ? 49 : 33} ry={inRange ? 11 : 8} fill={lit ? '#9bd7c0' : inRange ? '#f5c78c' : '#b8c8be'} opacity={inRange ? .27 : .12} />
              <path d={`M${station.x - 34} ${station.y + 4}h-10v-8 M${station.x + 34} ${station.y + 4}h10v-8`} fill="none" stroke={lit ? '#9bd7c0' : inRange ? '#ffd99a' : '#b8c8be'} strokeWidth={inRange ? 3 : 2} />
              {station.kind === 'seal' && <text x={station.x} y={station.y - 58} className={styles.sealLabel} textAnchor="middle" fill={lit ? '#aef0ce' : '#e7d7b3'}>{lit ? '✓ ' : ''}{station.label.replace('Sceau du ', '')}</text>}
              {inRange && <text x={station.x} y={station.y - 134} textAnchor="middle" className={styles.interactionLabel}>{controlActionShortcut('hunt.interact', controlBindings)} · {station.kind === 'door' ? 'TRAVERSER' : station.kind === 'seal' ? 'ACTIVER' : 'INTERAGIR'}</text>}
            </g>;
          })}
          {!reducedMotion && <image href={wolfCastleRuntimeAsset(`${WOLF_CASTLE_ART_ROOT}low-fog.png`)} x={cameraX} y="590" width={cameraWidth} height="115" preserveAspectRatio="none" opacity=".1" pointerEvents="none" className={styles.fog} />}
        </svg>
        <div className={styles.sceneCaption}><span>{String(WOLF_CASTLE_ROOMS.findIndex(entry => entry.id === room.id) + 1).padStart(2, '0')}</span><strong>{combatVisible ? combatTitle : room.name}</strong><small>{combatVisible ? dungeonCombat ? 'Mandat royal · Gardien du sceau' : 'Coups d’entraînement · Aucun équipement consommé' : room.subtitle}</small></div>
      </div>
      <div className={styles.controls}>
        <div className={styles.dpad} aria-label="Déplacement tactile">
          {(['up', 'left', 'right', 'down'] as HeldDirection[]).map(direction => <button key={direction} type="button" className={styles[direction]} disabled={suspended}
            aria-label={`Marcher ${direction === 'up' ? 'vers le fond' : direction === 'down' ? 'vers l’avant' : direction === 'left' ? 'à gauche' : 'à droite'}`}
            onPointerDown={event => { event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); heldTouch(direction, true); }}
            onPointerUp={() => heldTouch(direction, false)} onPointerCancel={() => heldTouch(direction, false)} onLostPointerCapture={() => heldTouch(direction, false)}
            onKeyDown={event => { if ((event.key === ' ' || event.key === 'Enter') && !event.repeat) { event.preventDefault(); heldTouch(direction, true, false); } }}
            onKeyUp={event => { if (event.key === ' ' || event.key === 'Enter') { event.preventDefault(); heldTouch(direction, false); } }}
            onBlur={() => heldTouch(direction, false)}>{direction === 'up' ? '↑' : direction === 'down' ? '↓' : direction === 'left' ? '←' : '→'}</button>)}
        </div>
        {combatVisible ? <div className={styles.combatActions} aria-label="Commandes de l’épreuve">
          {([['attack', 'Frapper', 'hunt.melee', 'X'], ['parry', 'Parer', 'hunt.weaponPrimary', 'Y'], ['evade', 'Esquiver', 'hunt.jump', 'B']] as const).map(([command, label, action, pad]) =>
            <button key={command} type="button" disabled={suspended} className={command === 'attack' ? styles.primaryButton : styles.quietButton}
              data-wolf-combat-command={command} onClick={() => issueCombatCommand(command)}><strong>{label}</strong><small>{controlActionShortcut(action, controlBindings)} · {pad}</small></button>)}
        </div> : <div className={styles.contextActions}>
          <button type="button" className={styles.primaryButton} disabled={suspended || !nearest} data-wolf-castle-interact={nearest?.id ?? ''} onClick={() => interact()}>
            <span className={styles.key}>{controlActionShortcut('hunt.interact', controlBindings)}</span>{nearest?.label ?? 'Approche une installation'}</button>
          <p className={styles.guidance}>{guidance || 'Clique sur le sol pour marcher. Les installations s’utilisent à portée.'}</p>
        </div>}
        {combatVisible ? <div className={styles.utilityActions}>
          <button type="button" className={styles.quietButton} disabled={suspended} onClick={pauseCombat} data-wolf-combat-pause>{dungeonCombat ? 'Pause du mandat' : 'Pause de l’épreuve'}</button>
          {!dungeonCombat && <button type="button" className={styles.quietButton} disabled={suspended} data-wolf-castle-action={overlayOpen ? undefined : 'abandon-combat'} onClick={() => void dialogAction({ type: 'abandon-combat' })}>Interrompre l’épreuve</button>}
        </div> : <div className={styles.utilityActions}><button type="button" className={styles.quietButton} disabled={suspended} onClick={() => showDialog('map')} data-wolf-castle-map>Plan du château</button><button type="button" className={styles.quietButton} disabled={suspended} onClick={() => showDialog('mandate')} data-wolf-dungeon-journal>Mandat royal</button><button type="button" className={styles.quietButton} disabled={suspended} onClick={() => guideToRoom('royal-berth')}>Guider vers la baie</button></div>}
      </div>
      {!combatVisible && <nav className={styles.nearbyLinks} aria-label="Portes et installations de la salle">
        {room.stations.map(station => <button key={station.id} type="button" disabled={suspended} aria-pressed={waypoint?.id === station.id} data-wolf-castle-target={station.id} onClick={() => selectStation(station)}>{station.kind === 'door' ? '↗ ' : ''}{station.label}</button>)}
      </nav>}
      <p className={styles.shortcuts}>{controlActionShortcut('hunt.moveLeft', controlBindings)} / {controlActionShortcut('hunt.moveRight', controlBindings)} · Marcher <span>{controlActionShortcut('hunt.moveUp', controlBindings)} / {controlActionShortcut('hunt.moveDown', controlBindings)} · Profondeur</span>{combatVisible ? <span>Stick · Déplacement — X · Frapper — Y · Parer — B · Esquiver</span> : <><span>A · Interagir</span><span>X · Plan</span></>}<span>{controlActionShortcut('hunt.pause', controlBindings)} / Start · Menu</span></p>
    </div>
    {saveError ? <div className={styles.modalBackdrop}>
      <div ref={dialogRef} role="alertdialog" aria-modal="true" aria-labelledby={titleId} className={styles.dialog} data-wolf-castle-dialog="save-error">
        <span className={styles.eyebrow}>REPRISE NON ENREGISTRÉE</span><h2 id={titleId}>L’escale est suspendue.</h2>
        <p>Le stockage n’a pas confirmé la dernière position ou l’épreuve. La scène conserve ton état actuel. Réessaie l’enregistrement avant de poursuivre ou de quitter.</p>
        <button type="button" className={styles.primaryButton} disabled={suspended} data-wolf-castle-save-retry onClick={() => { if (flush()) rootRef.current?.focus({ preventScroll: true }); }}>Réessayer l’enregistrement</button>
      </div>
    </div> : combatOverlay && combat ? <div className={styles.modalBackdrop}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={titleId} className={styles.dialog} data-wolf-castle-dialog="combat-result">
        <span className={styles.eyebrow}>{combatTitle.toUpperCase()} · TENTATIVE {combat.attempt}</span>
        <h2 id={titleId}>{combat.status === 'active' ? dungeonCombat ? 'La sentinelle attend ton signal.' : 'L’épreuve attend ton signal.' : combat.status === 'intermission' ? dungeonCombat ? 'La sentinelle change de posture.' : 'Garde dépassée.' : combat.status === 'victory' ? dungeonCombat ? 'Le verrou est maîtrisé.' : 'Les trois gardes sont dépassées.' : dungeonCombat ? 'La sentinelle t’a repoussé.' : 'Le maître interrompt l’épreuve.'}</h2>
        <p>{combat.status === 'active' ? 'Reprends exactement à la position et au temps conservés. Les attaques restent suspendues tant que tu n’as pas repris.' : combat.status === 'intermission' ? dungeonCombat ? 'Prends le temps de lire la prochaine posture. Ton endurance revient, mais ta vitalité ne se régénère pas entre les phases.' : 'Prends ton souffle. La prochaine rencontre rend jusqu’à 25 points de vitalité et toute ton endurance.' : combat.status === 'victory' ? dungeonCombat ? 'Les trois postures de la sentinelle sont maîtrisées. Rejoins l’audience pour remettre ton mandat et recevoir deux marques de clan. La victoire seule n’a encore attribué aucune marque.' : 'La cour consigne cette victoire dans ton dossier. Tu peux parcourir le château ou recommencer les trois rencontres.' : dungeonCombat ? 'Les trois repères restent acquis. Une nouvelle tentative recommence le combat à sa première phase, avec toute ta vitalité. Ton dossier d’entraînement reste conservé.' : 'Cette épreuve est un entraînement : ton équipement et ta campagne restent disponibles. Recommence à la première garde ou reviens à la cour.'}</p>
        <dl className={styles.combatResults}><div><dt>{dungeonCombat ? 'Postures maîtrisées' : 'Rencontres'}</dt><dd>{combat.status === 'victory' ? 3 : combat.status === 'intermission' ? combat.encounterIndex + 1 : combat.encounterIndex} / 3</dd></div><div><dt>Temps</dt><dd>{(combat.elapsedMs / 1000).toFixed(1)} s</dd></div><div><dt>Parades</dt><dd>{combat.stats.parries}</dd></div><div><dt>Dégâts reçus</dt><dd>{combat.stats.damageTaken}</dd></div></dl>
        <div className={styles.dialogActions}>
          {combat.status === 'active' ? <button type="button" className={styles.primaryButton} disabled={suspended} data-wolf-combat-resume onClick={resumeCombat}>{dungeonCombat ? 'Reprendre le mandat' : 'Reprendre l’épreuve'}</button>
            : combat.status === 'intermission' ? <button type="button" className={styles.primaryButton} disabled={suspended} data-wolf-castle-action={dungeonCombat ? 'next-dungeon-phase' : 'next-combat'} onClick={() => void dialogAction({ type: dungeonCombat ? 'next-dungeon-phase' : 'next-combat' })}>{dungeonCombat ? 'Engager la posture suivante' : 'Affronter la prochaine garde'}</button>
              : dungeonCombat && combat.status === 'victory' ? <button type="button" className={styles.primaryButton} disabled={suspended} data-wolf-dungeon-return onClick={() => dismissCombat('royal-audience')}>Retourner à l’audience</button>
                : <button type="button" className={styles.primaryButton} disabled={suspended || combat.attempt >= 9999} data-wolf-castle-action={dungeonCombat ? 'retry-dungeon' : 'start-combat'} onClick={() => void dialogAction({ type: dungeonCombat ? 'retry-dungeon' : 'start-combat' })}>{dungeonCombat ? 'Réessayer le mandat' : 'Recommencer l’épreuve de combat'}</button>}
          {wolfCastleCombatPending(combat) ? <button type="button" className={styles.quietButton} disabled={suspended} data-wolf-castle-action={dungeonCombat ? 'abandon-dungeon' : 'abandon-combat'} onClick={() => void dialogAction({ type: dungeonCombat ? 'abandon-dungeon' : 'abandon-combat' })}>{dungeonCombat ? 'Abandonner le mandat' : 'Interrompre l’épreuve'}</button>
            : <button type="button" className={styles.quietButton} disabled={suspended} onClick={() => dismissCombat()}>Revenir à la cour</button>}
        </div>
        {dungeonCombat && wolfCastleCombatPending(combat) && <p className={styles.dialogNote}>Abandonner ferme cette tentative sans récompense. Tes repères restent conservés ; une reprise du mandat se demande à l’audience.</p>}
      </div>
    </div> : dialog && <div className={styles.modalBackdrop}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={titleId} className={styles.dialog} data-wolf-castle-dialog={typeof dialog === 'string' ? dialog : dialog.kind}>
        <div className={styles.dialogHeading}><span className={styles.eyebrow}>{dialog === 'map' ? 'PARCOURS INTÉRIEUR' : dialog === 'mandate' ? 'MANDAT ROYAL' : room.name}</span><button type="button" className={styles.quietButton} disabled={suspended} onClick={closeDialog} aria-label="Fermer la consultation">Fermer</button></div>
        <h2 id={titleId}>{dialog === 'map' ? 'Plan du château' : dialog === 'mandate' ? 'Le Verrou de Wolf' : dialog.label}</h2>
        {dialog === 'map' ? <>
          <p>Choisis une salle pour baliser la prochaine porte du parcours. Le chasseur rejoint la porte à pied.</p>
          <div className={styles.roomMap}>{WOLF_CASTLE_ROOMS.map(entry => <button key={entry.id} type="button" disabled={suspended} data-wolf-castle-map-room={entry.id} aria-current={entry.id === visit.roomId ? 'location' : undefined}
            onClick={() => guideToRoom(entry.id)}><span>{String(WOLF_CASTLE_ROOMS.indexOf(entry) + 1).padStart(2, '0')}</span><strong>{entry.name}</strong><small>{entry.id === visit.roomId ? 'Tu es ici' : visit.visitedRooms.includes(entry.id) ? 'Explorée' : 'À découvrir'}</small></button>)}</div>
          <p className={styles.dialogNote}>Chemin de retour : {wolfCastleRoute(visit.roomId, 'royal-berth').map(id => wolfCastleRoom(id).name).join(' → ')}</p>
        </> : dialog === 'mandate' ? <CastleDungeonJournal visit={visit} suspended={suspended} action={dialogAction} guide={guideToRoom} />
          : <><CastleDungeonStation station={dialog} visit={visit} suspended={suspended} action={dialogAction} />
            <StationDialog station={dialog} visit={visit} suspended={suspended} action={dialogAction} close={closeDialog} /></>}
      </div>
    </div>}
  </div>;
}

function CastleProp({ prop }: { prop: WolfCastleProp }) {
  return <image href={wolfCastleRuntimeAsset(prop.asset)} {...wolfCastleSpriteImageFrame(prop.asset, prop.x, prop.y, prop.width, prop.height)} preserveAspectRatio="none" data-castle-prop={prop.id} />;
}

function propDepthOrder(a: WolfCastleProp, b: WolfCastleProp) {
  return (a.depthY ?? a.y) - (b.depthY ?? b.y);
}

function CastleCombatHud({ combat }: { combat: WolfCastleCombatState }) {
  const spec = wolfCastleCombatSpec(combat);
  const winding = combat.enemy.phase === 'windup';
  const anticipation = winding ? 1 - combat.enemy.phaseMs / spec.windupMs : 0;
  return <div className={styles.combatHud}>
    <div className={styles.combatIdentity}><span className={styles.eyebrow}>{combat.scenario === 'dungeon' ? 'PHASE' : 'RENCONTRE'} {combat.encounterIndex + 1} / 3</span><strong>{spec.name}{'phaseName' in spec ? ` · ${spec.phaseName}` : ''}</strong><small>{Math.floor(combat.elapsedMs / 1000)} s</small></div>
    <div className={styles.combatMeters}>
      <div><div className={styles.meterLabel}><span>Ton chasseur</span><strong>{combat.player.health} / 100</strong></div>
        <div className={styles.healthTrack} role="progressbar" aria-label="Vitalité du chasseur dans l’épreuve" aria-valuemin={0} aria-valuemax={100} aria-valuenow={combat.player.health}><span style={{ width: `${combat.player.health}%` }} /></div>
        <div className={styles.staminaTrack} role="progressbar" aria-label="Endurance" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(combat.player.stamina)}><span style={{ width: `${combat.player.stamina}%` }} /></div></div>
      <div><div className={styles.meterLabel}><span>{combat.scenario === 'dungeon' ? 'Sentinelle' : 'Garde'}</span><strong>{combat.enemy.health} / {spec.health}</strong></div>
        <div className={`${styles.healthTrack} ${styles.enemyTrack}`} role="progressbar" aria-label={combat.scenario === 'dungeon' ? 'Vitalité de la sentinelle' : 'Vitalité de la garde'} aria-valuemin={0} aria-valuemax={spec.health} aria-valuenow={combat.enemy.health}><span style={{ width: `${combat.enemy.health / spec.health * 100}%` }} /></div>
        <div className={`${styles.windupTrack} ${combat.enemy.strike === 'sweep' ? styles.sweepTrack : ''}`} aria-hidden="true"><span style={{ width: `${anticipation * 100}%` }} /></div></div>
    </div>
    <div className={styles.combatReadout}><strong className={winding && combat.enemy.strike === 'sweep' ? styles.sweepText : ''}>{winding ? combat.enemy.strike === 'thrust' ? 'ESTOC — pare ou esquive' : 'BALAYAGE — esquive' : combat.enemy.phase === 'recovery' ? 'OUVERTURE — contre-attaque' : 'Garde ta distance'}</strong>
      <span role="status" aria-live="polite">{combat.event.remainingMs > 0 ? wolfCastleCombatEventLabel(combat) : 'L’or se pare. Le rouge s’esquive.'}</span></div>
  </div>;
}

function CastleCombatTelegraph({ combat }: { combat: WolfCastleCombatState }) {
  const arena = WOLF_CASTLE_COMBAT_ARENA;
  const area = wolfCastleCombatStrikeArea(combat);
  const colour = combat.enemy.strike === 'sweep' ? '#ff917d' : '#f7cf75';
  const winding = combat.enemy.phase === 'windup';
  return <g pointerEvents="none" aria-hidden="true">
    <rect x={arena.minX - 22} y={arena.minY - 12} width={arena.maxX - arena.minX + 44} height={arena.maxY - arena.minY + 24} rx="24" fill="#a9823d" fillOpacity=".045" stroke="#dec38c" strokeOpacity=".3" strokeWidth="2" strokeDasharray="14 9" />
    {winding && <g fill={colour} fillOpacity=".24" stroke={colour} strokeWidth="3" data-wolf-combat-strike-area={area.shape}>
      {area.shape === 'ellipse' ? <ellipse cx={area.x} cy={area.y} rx={area.radiusX} ry={area.radiusY} />
        : <rect x={area.x - area.radiusX} y={area.y - area.radiusY} width={area.radiusX * 2} height={area.radiusY * 2} rx="4" />}
      <text x={combat.enemy.x} y={combat.enemy.y - 235} textAnchor="middle" fillOpacity="1" stroke="#090907" strokeWidth="4" paintOrder="stroke" fontSize="16" fontWeight="750">{combat.enemy.strike === 'sweep' ? 'BALAYAGE' : 'ESTOC'}</text>
    </g>}
  </g>;
}

function CastleCombatGuard({ combat, reducedMotion }: { combat: WolfCastleCombatState; reducedMotion: boolean }) {
  const enemy = combat.enemy, spec = wolfCastleCombatSpec(combat);
  const pose = enemy.phase === 'windup' ? 'windup' : enemy.phase === 'recovery' && enemy.phaseMs > spec.recoveryMs - 210 ? 'lunge' : 'ready';
  const { asset, ...frame } = wolfCastleCombatSpriteFrame(pose, 0, 0, 184);
  const down = enemy.phase === 'down';
  const bob = !reducedMotion && enemy.phase === 'approach' ? Math.sin(combat.elapsedMs / 110) * 1.5 : 0;
  return <g pointerEvents="none" aria-label={`${spec.name} : ${down ? 'rencontre terminée' : enemy.phase === 'windup' ? 'prépare sa frappe' : enemy.phase === 'recovery' ? 'récupération' : 'avance'}`} data-wolf-combat-guard-pose={pose}>
    <ellipse cx={enemy.x} cy={enemy.y + 3} rx="34" ry="9" fill="#000" opacity=".65" />
    <g transform={`translate(${enemy.x} ${enemy.y + bob}) scale(${enemy.facing === -1 ? 1 : -1} 1)`} opacity={down ? .42 : 1}>
      <image href={asset} {...frame} preserveAspectRatio="none" />
    </g>
    {enemy.staggerMs > 0 && <ellipse cx={enemy.x} cy={enemy.y - 170} rx="28" ry="8" stroke="#bfe4ec" fill="none" strokeWidth="3" />}
  </g>;
}

const MANDATE_OBJECTIVES = [
  { key: 'archives', room: 'royal-archives', label: 'Séquence des archives', detail: 'Relever le protocole sur le terminal.' },
  { key: 'gallery', room: 'royal-gallery', label: 'Marque de la galerie', detail: 'Examiner le repère porté par les socles.' },
  { key: 'council', room: 'royal-council', label: 'Confirmation du conseil', detail: 'Vérifier la concordance à la table tactique.' },
] as const;

function CastleDungeonJournal({ visit, suspended, action, guide }: {
  visit: WolfCastleVisit; suspended: boolean; action: (command: WolfCastleAction) => Promise<void>; guide: (room: WolfCastleRoomId) => void;
}) {
  const dungeon = visit.dungeon;
  const nextObjective = MANDATE_OBJECTIVES.find(objective => !dungeon?.objectives[objective.key]);
  const target: WolfCastleRoomId = !dungeon || dungeon.status === 'abandoned'
    ? visit.audience === 'pending' || visit.audience === 'deferred' ? 'royal-council' : 'royal-audience'
    : dungeon.status === 'completed' ? 'royal-berth'
      : dungeon.status === 'victory' ? 'royal-audience'
        : dungeon.status === 'accepted' ? nextObjective?.room ?? 'royal-court' : 'royal-court';
  return <div data-wolf-dungeon-journal-content>
    <p>Le conseil te confie la vérification du protocole royal. Relève ses trois repères, puis maîtrise les trois postures de la sentinelle dans la cour. Le mandat se remet ensuite au pied de l’estrade.</p>
    <div className={styles.mandateMeta}><span>3 repères</span><span>3 postures</span><strong>2 marques de clan à la remise</strong></div>
    <ol className={styles.mandateChecklist} aria-label="Objectifs du mandat">
      {MANDATE_OBJECTIVES.map(objective => <li key={objective.key} data-complete={dungeon?.objectives[objective.key] ?? false} data-wolf-dungeon-objective={objective.key}>
        <span aria-hidden="true">{dungeon?.objectives[objective.key] ? '✓' : '○'}</span><div><strong>{objective.label}</strong><small>{objective.detail}</small></div>
      </li>)}
      <li data-complete={dungeon?.status === 'victory' || dungeon?.status === 'completed'}><span aria-hidden="true">{dungeon?.status === 'victory' || dungeon?.status === 'completed' ? '✓' : '○'}</span><div><strong>Sentinelle du mandat</strong><small>Une seule adversaire, trois postures. La vitalité reste conservée entre les phases.</small></div></li>
      <li data-complete={dungeon?.reward.claimed ?? false}><span aria-hidden="true">{dungeon?.reward.claimed ? '✓' : '○'}</span><div><strong>Remise à l’audience</strong><small>{dungeon?.reward.claimed ? 'Deux marques de clan accordées. Mandat accompli.' : 'La récompense attend la victoire et la remise du mandat.'}</small></div></li>
    </ol>
    <p className={styles.dialogNote}>{wolfCastleDungeonObjective(visit) ?? (visit.audience === 'accepted' ? 'Ton accord est consigné. Retourne à l’audience pour recevoir ce mandat.' : 'Présente ton invitation à l’audience, puis consigne ton accord au conseil pour recevoir ce mandat.')}</p>
    <div className={styles.dialogActions}>
      <button type="button" className={styles.primaryButton} disabled={suspended} data-wolf-dungeon-guide onClick={() => guide(target)}>Guider vers {wolfCastleRoom(target).name.toLowerCase()}</button>
      {dungeon && ['accepted', 'ready', 'failed'].includes(dungeon.status) && <button type="button" className={styles.quietButton} disabled={suspended} data-wolf-castle-action="abandon-dungeon" onClick={() => void action({ type: 'abandon-dungeon' })}>Abandonner le mandat</button>}
    </div>
    {dungeon && ['accepted', 'ready', 'failed'].includes(dungeon.status) && <p className={styles.dialogNote}>Abandonner conserve les repères et ferme la tentative sans récompense. Tu pourras demander la reprise à l’audience.</p>}
  </div>;
}

function CastleDungeonStation({ station, visit, suspended, action }: {
  station: WolfCastleStation; visit: WolfCastleVisit; suspended: boolean; action: (command: WolfCastleAction) => Promise<void>;
}) {
  const dungeon = visit.dungeon;
  if (station.kind === 'audience') return <section className={styles.mandateCard} aria-label="Mandat royal">
    <span className={styles.eyebrow}>MANDAT ROYAL</span><h3>Le Verrou de Wolf</h3>
    {dungeon?.status === 'completed' ? <p data-wolf-dungeon-completed>Le mandat est remis. Les deux marques de clan ont rejoint ta réserve. La sentinelle et les repères restent consignés dans ton dossier.</p>
      : dungeon?.status === 'victory' ? <><p>Les trois postures de la sentinelle sont maîtrisées. Remets ton rapport au Roi pour recevoir les deux marques de clan promises.</p><button type="button" className={styles.primaryButton} disabled={suspended} data-wolf-castle-action="extract-dungeon" onClick={() => void action({ type: 'extract-dungeon' })}>Remettre le mandat · 2 marques de clan</button></>
        : !dungeon || dungeon.status === 'abandoned' ? <><p>Relève un repère dans les archives, la galerie et le conseil. Leurs indications ouvriront l’affrontement contre la sentinelle de la cour, puis la remise de ton mandat.</p>
          {visit.invitationId && visit.audience === 'accepted' ? <button type="button" className={styles.primaryButton} disabled={suspended} data-wolf-castle-action="accept-dungeon" onClick={() => void action({ type: 'accept-dungeon' })}>{dungeon ? 'Reprendre le mandat' : 'Accepter le mandat royal'}</button>
            : <p className={styles.dialogNote}>Présente ton invitation, consigne ton accord au conseil, puis reviens recevoir le mandat.</p>}
          <p className={styles.dialogNote}>Deux marques de clan à la remise, après la victoire. {dungeon ? 'Les repères déjà relevés restent acquis.' : 'Tes anciennes consultations ne remplacent pas les trois relevés du mandat.'}</p></>
          : <p>{wolfCastleDungeonObjective(visit)}</p>}
  </section>;
  if (!dungeon || dungeon.status === 'abandoned' || dungeon.status === 'completed') return null;
  const objective = station.kind === 'archive' ? MANDATE_OBJECTIVES[0] : station.kind === 'gallery' ? MANDATE_OBJECTIVES[1] : station.kind === 'council' ? MANDATE_OBJECTIVES[2] : null;
  if (objective) {
    const done = dungeon.objectives[objective.key];
    const command: WolfCastleAction['type'] = objective.key === 'archives' ? 'inspect-dungeon-archive' : objective.key === 'gallery' ? 'inspect-dungeon-gallery' : 'inspect-dungeon-council';
    return <section className={styles.mandateCard} aria-label="Repère du mandat" data-wolf-dungeon-station={objective.key}>
      <span className={styles.eyebrow}>LE VERROU DE WOLF</span><h3>{objective.label}</h3><p>{done ? 'Ce repère est relevé et conservé dans ton mandat.' : objective.detail}</p>
      {!done && dungeon.status === 'accepted' && <button type="button" className={styles.primaryButton} disabled={suspended} data-wolf-castle-action={command} onClick={() => void action({ type: command } as WolfCastleAction)}>Relever ce repère</button>}
    </section>;
  }
  if (station.kind === 'combat') return <section className={styles.mandateCard} aria-label="Sentinelle du mandat">
    <span className={styles.eyebrow}>LE VERROU DE WOLF</span><h3>Sentinelle du mandat</h3>
    <p>{dungeon.status === 'ready' || dungeon.status === 'failed' ? 'Tes trois repères concordent. La sentinelle éprouve successivement ta parade, ton esquive et ta lecture des deux attaques. Ta vitalité ne revient pas entre les phases ; ton endurance, elle, se recharge.' : wolfCastleDungeonObjective(visit)}</p>
    {(dungeon.status === 'ready' || dungeon.status === 'failed') && <button type="button" className={styles.primaryButton} disabled={suspended || visit.trial.status === 'active' || dungeon.attempts >= 9999} data-wolf-castle-action={dungeon.status === 'failed' ? 'retry-dungeon' : 'start-dungeon-combat'} onClick={() => void action({ type: dungeon.status === 'failed' ? 'retry-dungeon' : 'start-dungeon-combat' })}>{dungeon.status === 'failed' ? 'Réessayer le mandat' : 'Affronter la sentinelle'}</button>}
    {visit.trial.status === 'active' && <p className={styles.dialogNote}>Termine ou interromps les sceaux au pupitre avant d’engager ce combat.</p>}
  </section>;
  return null;
}

function StationDialog({ station, visit, suspended, action, close }: {
  station: WolfCastleStation; visit: WolfCastleVisit; suspended: boolean; action: (command: WolfCastleAction) => Promise<void>; close: () => void;
}) {
  if (station.kind === 'departure') return <><p>Ton vaisseau est prêt. Quitter la forteresse conserve les salles explorées, ton audience et la progression des sceaux.</p><button className={styles.primaryButton} type="button" disabled={suspended} data-wolf-castle-action="depart" onClick={() => void action({ type: 'depart' })}>Rejoindre mon vaisseau personnel</button></>;
  if (station.kind === 'invitation') return <><p>{visit.invitationId ? 'Ton invitation est enregistrée. Traverse le vestibule et la galerie jusqu’à la salle d’audience. L’accès de retour reste ouvert pendant toute l’escale.' : 'Tu visites le château librement. Une invitation de campagne sera nécessaire pour présenter une audience. Les archives, le conseil et la cour restent accessibles.'}</p><p className={styles.dialogNote}>Coque amarrée : {shipForId(visit.personalShipId).name}</p><button className={styles.primaryButton} type="button" disabled={suspended} onClick={close}>Poursuivre la visite</button></>;
  if (station.kind === 'audience') return <>
    <p>{visit.invitationId === null ? 'Aucune invitation d’audience n’est enregistrée pour cette campagne. Tu peux poursuivre la visite ou rejoindre la cour d’épreuve.' : visit.audience === 'unheard' ? 'Tu avances jusqu’au pied de l’estrade. Le protocole de reconnaissance t’autorise à présenter ta chasse au conseil royal. L’audience est le premier engagement de cette escale.' : 'L’audience est consignée. La table du conseil conserve ton accord ou ta décision de différer.'}</p>
    {visit.invitationId !== null && visit.audience === 'unheard' ? <button className={styles.primaryButton} type="button" disabled={suspended} data-wolf-castle-action="hear-audience" onClick={() => void action({ type: 'hear-audience' })}>Présenter mon invitation</button> : <button className={styles.primaryButton} type="button" disabled={suspended} onClick={close}>Poursuivre</button>}
  </>;
  if (station.kind === 'council') return <>
    <p>{visit.audience === 'unheard' ? 'Le conseil attend la présentation de ton invitation à l’audience. Le passage latéral reste ouvert pour rejoindre le vestibule ou la cour.' : visit.audience === 'accepted' ? 'Ton accord au protocole de reconnaissance est consigné. Tu peux poursuivre l’exploration ou rejoindre la baie.' : 'Le protocole de reconnaissance attend ta décision. Accepter consigne ton accord pour cette campagne. Différer laisse la décision disponible à ton retour.'}</p>
    {(visit.audience === 'pending' || visit.audience === 'deferred') && <div className={styles.dialogActions}><button className={styles.primaryButton} type="button" disabled={suspended} data-wolf-castle-action="accept-audience" onClick={() => void action({ type: 'decide-audience', decision: 'accepted' })}>Consigner mon accord</button><button className={styles.quietButton} type="button" disabled={suspended} data-wolf-castle-action="defer-audience" onClick={() => void action({ type: 'decide-audience', decision: 'deferred' })}>Différer la décision</button></div>}
  </>;
  if (station.kind === 'archive') return <>
    <dl className={styles.archiveRecords}><div><dt>Lieu</dt><dd>Château orbital du Roi, système Wolf.</dd></div><div><dt>Retour</dt><dd>La galerie rejoint le vestibule, puis le sas et la baie royale.</dd></div><div><dt>Épreuve</dt><dd>Seuil → Zénith → Retour. Après le dernier sceau, le pupitre ferme la séquence.</dd></div><div><dt>Cette escale</dt><dd>{visit.visitedRooms.length} salles explorées. {visit.audience === 'accepted' ? 'Accord consigné.' : visit.audience === 'pending' ? 'Décision du conseil en attente.' : visit.audience === 'deferred' ? 'Décision différée.' : 'Audience non présentée.'}</dd></div></dl>
    <button className={styles.primaryButton} type="button" disabled={suspended} data-wolf-castle-action="read-archive" onClick={() => void action({ type: 'read-archive' })}>{visit.archiveRead ? 'Fermer les archives' : 'Consigner la consultation'}</button>
  </>;
  if (station.kind === 'combat') return <>
    <h3>Entraînement de la cour</h3>
    <p>Trois gardes se succèdent dans la cour. Leurs frappes sont annoncées au sol : pare l’estoc doré ou esquive le balayage rouge, puis frappe pendant l’ouverture. Les commandes de mêlée, d’arme et de saut deviennent ici Frapper, Parer et Esquiver.</p>
    <ol className={styles.combatLessons}>{WOLF_CASTLE_COMBAT_ENCOUNTERS.map((encounter, index) => <li key={encounter.id}><strong>{index + 1}. {encounter.name}</strong><span>{encounter.lesson}</span></li>)}</ol>
    {visit.combat && <p className={styles.dialogNote}>Dossier de cour : {visit.combat.dossier.victories} victoire{visit.combat.dossier.victories === 1 ? '' : 's'} · {visit.combat.attempt} tentative{visit.combat.attempt === 1 ? '' : 's'}{visit.combat.dossier.bestTimeMs !== null ? ` · Meilleur temps : ${(visit.combat.dossier.bestTimeMs / 1000).toFixed(1)} s` : ''}.</p>}
    {visit.trial.status === 'active' && <p>Termine les sceaux ou interromps leur séquence au pupitre avant de commencer ce combat.</p>}
    {visit.dungeon?.status === 'failed' && <p>Réessaie ou abandonne le mandat avant de reprendre l’entraînement.</p>}
    {visit.dungeon?.status === 'victory' && <p>Remets ton mandat à l’audience avant de reprendre l’entraînement.</p>}
    <div className={styles.dialogActions}><button type="button" className={styles.primaryButton} disabled={suspended || visit.trial.status === 'active' || visit.dungeon?.status === 'active' || visit.dungeon?.status === 'failed' || visit.dungeon?.status === 'victory' || (visit.combat?.attempt ?? 0) >= 9999} data-wolf-castle-action="start-combat" onClick={() => void action({ type: 'start-combat' })}>Commencer l’épreuve de combat</button><button type="button" className={styles.quietButton} disabled={suspended} onClick={close}>Poursuivre la visite</button></div>
    <p className={styles.dialogNote}>Entraînement non létal. La victoire, le temps et les dégâts reçus sont conservés dans le dossier de cette cour. Aucun consommable ni récompense de campagne n’est attribué par cet exercice.</p>
  </>;
  if (station.kind === 'trial') return <>
    <p>{visit.trial.status === 'complete' ? 'Les trois sceaux ont été liés et l’épreuve est accomplie. Tu peux recommencer le parcours ou repartir par le passage latéral.' : 'Active les sceaux dans cet ordre : Seuil, Zénith, Retour. Approche chaque balise et interagis. Un sceau hors séquence remet la combinaison à zéro. Reviens ensuite au pupitre pour conclure.'}</p>
    <ol className={styles.sealProgress} aria-label="Progression des sceaux">{SEAL_LABELS.map((label, index) => <li key={label} data-complete={visit.trial.progress > index}><span>{visit.trial.progress > index ? '✓' : index + 1}</span>{label}</li>)}</ol>
    <div className={styles.dialogActions}>
      {visit.trial.status !== 'active' ? <button className={styles.primaryButton} type="button" disabled={suspended} data-wolf-castle-action="start-trial" onClick={() => void action({ type: 'start-trial' })}>{visit.trial.status === 'complete' ? 'Recommencer l’épreuve' : 'Commencer l’épreuve'}</button>
        : visit.trial.progress === 3 ? <button className={styles.primaryButton} type="button" disabled={suspended} data-wolf-castle-action="finish-trial" onClick={() => void action({ type: 'finish-trial' })}>Sceller l’épreuve</button>
          : <button className={styles.primaryButton} type="button" disabled={suspended} onClick={close}>Rejoindre le prochain sceau</button>}
      {visit.trial.status === 'active' && <button className={styles.quietButton} type="button" disabled={suspended} data-wolf-castle-action="cancel-trial" onClick={() => void action({ type: 'cancel-trial' })}>Interrompre l’épreuve</button>}
    </div>
  </>;
  return <><p>La galerie ouvre l’axe cérémoniel vers le trône. Les socles laissent le passage central libre et les archives sont accessibles par la porte du fond.</p><button className={styles.primaryButton} type="button" disabled={suspended} onClick={close}>Poursuivre la visite</button></>;
}
