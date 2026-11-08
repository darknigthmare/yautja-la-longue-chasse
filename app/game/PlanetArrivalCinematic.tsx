"use client";

/* eslint-disable @next/next/no-img-element -- scene layers use registered local raster art */

import { Fragment, memo, useCallback, useEffect, useId, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react';
import HunterRigPreview from './HunterRigPreview';
import { HUNTER_RIG_CANVAS } from './hunterRig';
import { shipForId } from './shipCatalogue';
import { backgroundSourceRectForBiome, getWorldScreenAtX } from './worldScreens';
import type { HunterAppearance, Loadout } from './types';
import type { SceneAudioPort } from './systems/sceneAudio';
import { useMenuGamepad } from './useMenuGamepad';
import { PlanetArrivalAudio } from './systems/planetArrivalAudio';
import { ARRIVAL_COMPLETION_SPRITES, ARRIVAL_SPRITES, arrivalImpactArtForBiome, carrierArtForShip, planetArtForDestination } from './systems/planetArrivalArt';
import { ARRIVAL_STAGE, arrivalCarrierPose, arrivalFormationFlightPose, arrivalGroundCamera, arrivalInsertionShipPose,
  arrivalShipGroundPose, arrivalSurfaceShipGeometry, attachmentToStage, fitArrivalStage } from './systems/planetArrivalSpatial';
import { ARRIVAL_CONTACT_MS, arrivalEffectsFrame, arrivalFormationSlots, arrivalHunterEgress,
  arrivalLightGradient, arrivalLighting, arrivalRgba, arrivalShipCloakFrame, arrivalShotLabel } from './systems/planetArrivalPresentation';
import { arrivalBatchGroundFrame, arrivalBiomeFragments, arrivalFootContacts } from './systems/planetArrivalVfx';
import { arrivalVfxArtForBiome, type ArrivalVfxArt } from './systems/planetArrivalVfxArt';
import { ARRIVAL_POD_FLIGHT_CORE_CLIP, ARRIVAL_POD_FLIGHT_PANEL_CLIPS, ARRIVAL_POD_FLIGHT_PANELS,
  arrivalPodEntryFrame, arrivalPodPanelAngle } from './systems/planetArrivalPodFlight';
import { ARRIVAL_POD_SPRITES } from './systems/planetArrivalPodArt';
import { arrivalShipMotionAssetPaths, arrivalShipMotionFrame, arrivalShipViewRegistration, arrivalShipViewSlots,
  type ArrivalShipViewTransform } from './systems/planetArrivalShipMotion';
import { ARRIVAL_SHIP_ENGINE_ART, arrivalShipEffectAssetPaths, arrivalShipEngineAperture,
  arrivalShipEngineFrame } from './systems/planetArrivalShipEffects';
import { DEFAULT_PLAN, EXPEDITION_MEMBER_SIZE, expeditionMemberAppearance, expeditionMemberLoadout, normalizePlanetInsertionPlan,
  type ExpeditionMemberId } from './systems/planetInsertion';
import {
  PLANET_ARRIVAL_CONTACT_PROGRESS, PLANET_ARRIVAL_DURATION_MS, PLANET_ARRIVAL_SHOTS, advancePlanetArrival,
  completePlanetArrivalHandoff, failPlanetArrivalHandoff, pausePlanetArrival,
  planetArrivalAssets, planetArrivalDestination, planetArrivalLanding,
  planetArrivalShotAt, requestPlanetArrivalHandoff, resumePlanetArrival, startPlanetArrival,
  type PlanetArrivalState,
} from './systems/planetArrival';
import styles from './PlanetArrivalCinematic.module.css';

export interface PlanetArrivalCinematicProps {
  /** Remount with key={state.runId}; this run owns the presentation until handoff. */
  state: PlanetArrivalState;
  appearance: HunterAppearance;
  loadout: Loadout;
  gauntletVariantId?: string;
  /** Called only from an effect; the campaign's existing mix owns every sound. */
  createSceneAudio?: () => SceneAudioPort | null;
  suspended?: boolean;
  /** A short campaign autosave owns storage, without requesting a user pause. */
  checkpointBlocked?: boolean;
  reducedMotion?: boolean;
  /** True only after the owning campaign write has been confirmed. */
  onCheckpoint: (state: PlanetArrivalState) => boolean;
  /** Natural end and Skip both use this callback, guarded against duplicate calls. */
  onHandoff: (state: PlanetArrivalState) => boolean | Promise<boolean>;
  onExit: () => void;
}

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
const mix = (from: number, to: number, progress: number) => from + (to - from) * clamp01(progress);
const smooth = (progress: number) => { const p = clamp01(progress); return p * p * (3 - 2 * p); };
const percent = (value: number) => `${value}%`;
const CARRIER_WIDTH = 550;
const FLIGHT_WIDTH = 112;
const CARRIER_REVEAL_MS = PLANET_ARRIVAL_SHOTS.find(shot => shot.id === 'carrier')!.startMs;
const angleBetween = (from: { x: number; y: number }, to: { x: number; y: number }, width: number, height: number) =>
  Math.atan2((to.y - from.y) * height, (to.x - from.x) * width) * 180 / Math.PI;
// The selected rig is preloaded from orbit but animates only once the door opens.
// Memoization avoids rebuilding its many image layers during the other seven shots.
const ArrivalHunter = memo(HunterRigPreview);
const ARRIVAL_RIG_STYLE: CSSProperties = { display: 'block' };

export default function PlanetArrivalCinematic({ state, appearance, loadout, gauntletVariantId,
  createSceneAudio, suspended = false, checkpointBlocked = false, reducedMotion = false, onCheckpoint, onHandoff, onExit }: PlanetArrivalCinematicProps) {
  const [timeline, setTimeline] = useState(() => resumePlanetArrival(state));
  const timelineRef = useRef(timeline);
  const mountedRef = useRef(false);
  const busyRef = useRef(false);
  const lastFrameRef = useRef<number | null>(null);
  const rootRef = useRef<HTMLElement>(null);
  const sceneRef = useRef<HTMLDivElement>(null);
  const primaryRef = useRef<HTMLButtonElement>(null);
  const keyboardArmedRef = useRef(false);
  const keyboardDownRef = useRef(new Set<string>());
  const audioDirectorRef = useRef<PlanetArrivalAudio | null>(null);
  const audioResumeRef = useRef({ runId: state.runId, elapsedMs: state.elapsedMs });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [failedAssets, setFailedAssets] = useState<readonly string[]>([]);
  const [unavailableShipViews, setUnavailableShipViews] = useState<readonly string[]>(() => arrivalShipMotionAssetPaths(state.personalShipId));
  // Availability is captured before the first moving hull is shown. A late
  // network response must not change its perspective halfway through a shot.
  const shipViewAvailabilityLockedRef = useRef(false);
  const [systemReducedMotion, setSystemReducedMotion] = useState(false);
  const [pauseReason, setPauseReason] = useState('');
  const [stageFit, setStageFit] = useState(() => fitArrivalStage(0, 0));
  const hunterPortalId = `arrival-portal-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const cloakFilterId = `arrival-cloak-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const podClipId = `arrival-pod-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const callbackRef = useRef({ onCheckpoint, onHandoff, onExit, suspended, checkpointBlocked });
  const sources = useMemo(() => planetArrivalAssets(state), [state]);
  const sourceKey = sources ? Object.values(sources).join('|') : '';
  const shipViewPaths = useMemo(() => arrivalShipMotionAssetPaths(state.personalShipId), [state.personalShipId]);
  const shipViewKey = shipViewPaths.join('|');
  const shipEffectKey = arrivalShipEffectAssetPaths(state.personalShipId).join('|');
  const destination = useMemo(() => planetArrivalDestination(state.missionId), [state.missionId]);
  const landing = planetArrivalLanding(state);
  const groundFrame = useMemo(() => backgroundSourceRectForBiome(state.biomeId,
    getWorldScreenAtX(state.missionId, landing.spawnX).layers.background.band), [state.biomeId, state.missionId, landing.spawnX]);
  const motionReduced = reducedMotion || systemReducedMotion;
  const insertion = normalizePlanetInsertionPlan(state.insertion) ?? DEFAULT_PLAN;
  const shipInsertion = insertion.method === 'ship';
  const formation = arrivalFormationSlots(insertion.team);
  const companionLooks = useMemo(() => ({ karhek: expeditionMemberAppearance('karhek'), saketh: expeditionMemberAppearance('saketh') }), []);
  const companionKits = useMemo(() => ({ karhek: expeditionMemberLoadout('karhek'), saketh: expeditionMemberLoadout('saketh') }), []);

  // One film plane, uniformly scaled on every viewport. A portrait layout must
  // never stretch a trajectory, an asset or its attachment points independently.
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    const update = () => {
      const next = fitArrivalStage(scene.clientWidth, scene.clientHeight);
      setStageFit(previous => previous.scale === next.scale && previous.left === next.left && previous.top === next.top ? previous : next);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(scene);
    return () => observer.disconnect();
  }, []);

  useEffect(() => { callbackRef.current = { onCheckpoint, onHandoff, onExit, suspended, checkpointBlocked }; }, [onCheckpoint, onHandoff, onExit, suspended, checkpointBlocked]);
  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);

  useEffect(() => {
    const voice = createSceneAudio?.();
    if (!voice) return;
    const saved = audioResumeRef.current;
    const director = new PlanetArrivalAudio(voice, {
      runId: saved.runId, elapsedMs: Math.max(saved.elapsedMs, timelineRef.current.elapsedMs),
    });
    audioDirectorRef.current = director;
    return () => { director.dispose(); if (audioDirectorRef.current === director) audioDirectorRef.current = null; };
  }, [createSceneAudio]);

  useEffect(() => {
    audioDirectorRef.current?.sync(timeline, !loading && !suspended && !checkpointBlocked && !document.hidden, motionReduced);
  }, [createSceneAudio, timeline, loading, suspended, checkpointBlocked, motionReduced]);

  const publish = useCallback((next: PlanetArrivalState) => {
    if (next.status === 'playing' && next.elapsedMs >= CARRIER_REVEAL_MS) shipViewAvailabilityLockedRef.current = true;
    timelineRef.current = next;
    if (mountedRef.current) setTimeline(next);
  }, []);

  const checkpoint = useCallback((next: PlanetArrivalState): boolean => {
    let accepted = false;
    try { accepted = callbackRef.current.onCheckpoint(next); } catch { /* Retain the local pause and offer a retry. */ }
    if (!mountedRef.current) return accepted;
    if (!accepted) {
      audioDirectorRef.current?.suspend();
      publish(pausePlanetArrival(next));
      setError('L’arrivée n’a pas pu être enregistrée. Rétablis la sauvegarde puis réessaie.');
      setPauseReason('La séquence est suspendue pour conserver ta mission.');
      return false;
    }
    setError('');
    publish(next);
    return true;
  }, [publish]);

  const handoff = useCallback(async (incoming?: PlanetArrivalState) => {
    if (busyRef.current || callbackRef.current.suspended || callbackRef.current.checkpointBlocked || !mountedRef.current) return;
    const current = incoming ?? timelineRef.current;
    if (current.status === 'complete') return;
    const pending = requestPlanetArrivalHandoff(current, current.completedBy ?? 'skipped');
    if (pending.status !== 'handoff-pending') return;
    busyRef.current = true;
    audioDirectorRef.current?.suspend();
    setBusy(true);
    setError('');
    publish(pending);
    lastFrameRef.current = null;
    let completed = false;
    try { completed = await callbackRef.current.onHandoff(pending); }
    catch { /* The campaign owner decides whether the transaction is durable. */ }
    if (!mountedRef.current) return;
    busyRef.current = false;
    setBusy(false);
    if (completed) publish(completePlanetArrivalHandoff(pending));
    else {
      publish(failPlanetArrivalHandoff(pending));
      setError('Le passage vers la chasse n’a pas été confirmé. Ta destination et ta mission sont conservées.');
    }
  }, [publish]);

  const pause = useCallback((reason = 'La mission attend ton signal.') => {
    const current = timelineRef.current;
    if (busyRef.current || current.status !== 'playing') return;
    audioDirectorRef.current?.suspend();
    lastFrameRef.current = null;
    keyboardArmedRef.current = false;
    setPauseReason(reason);
    // Settings / archive writes temporarily own the campaign. Freeze locally
    // without issuing a forbidden concurrent write; Resume confirms this time.
    if (callbackRef.current.suspended || callbackRef.current.checkpointBlocked) publish(pausePlanetArrival(current));
    else checkpoint(pausePlanetArrival(current));
  }, [checkpoint, publish]);

  const resume = useCallback(() => {
    if (busyRef.current || callbackRef.current.suspended || callbackRef.current.checkpointBlocked || document.hidden || loading) return;
    const current = timelineRef.current;
    if (current.status !== 'paused' && current.status !== 'prepared') return;
    audioDirectorRef.current?.unlock();
    lastFrameRef.current = null;
    setPauseReason('');
    checkpoint(startPlanetArrival(current));
  }, [checkpoint, loading]);

  const exit = useCallback(() => {
    if (busyRef.current || callbackRef.current.suspended || callbackRef.current.checkpointBlocked) return;
    audioDirectorRef.current?.suspend();
    lastFrameRef.current = null;
    const current = timelineRef.current;
    const next = pausePlanetArrival(current);
    if (checkpoint(next)) callbackRef.current.onExit();
  }, [checkpoint]);

  const back = useCallback(() => {
    if (callbackRef.current.suspended || callbackRef.current.checkpointBlocked || busyRef.current) return;
    if (timelineRef.current.status === 'playing') pause();
    else if (timelineRef.current.status === 'paused' || timelineRef.current.status === 'prepared') resume();
  }, [pause, resume]);

  useMenuGamepad(rootRef, !suspended && !checkpointBlocked && !busy, `arrival:${state.runId}:${timeline.status}:${loading ? 'loading' : 'ready'}`, back);

  // Optional views are decoded opportunistically, independently of the required
  // montage art. The coherent view family is enabled as a whole; a partial
  // family could otherwise pop from fallback to a later angle. Failure or a slow
  // response retains this hull's own profile without delaying the loading gate.
  useEffect(() => {
    let cancelled = false;
    let timeout = 0;
    const paths = shipViewKey.split('|').filter(Boolean);
    const ready = new Set<string>();
    const images: HTMLImageElement[] = [];
    const pending = paths.map(path => new Promise<void>(resolve => {
      const image = new Image();
      image.decoding = 'async';
      images.push(image);
      let settled = false;
      const finish = async (loaded: boolean) => {
        if (settled) return;
        settled = true;
        if (loaded) {
          try { await image.decode(); } catch { /* A usable decoded image may already be cached. */ }
          if (image.complete && image.naturalWidth > 0 && image.naturalHeight > 0) ready.add(path);
        }
        resolve();
      };
      image.onload = () => { void finish(true); };
      image.onerror = () => { void finish(false); };
      image.src = path;
      if (image.complete) void finish(image.naturalWidth > 0);
    }));
    void Promise.race([
      Promise.all(pending),
      new Promise<void>(resolve => { timeout = window.setTimeout(resolve, 8_000); }),
    ]).then(() => {
      clearTimeout(timeout);
      if (cancelled || !mountedRef.current || shipViewAvailabilityLockedRef.current) return;
      setUnavailableShipViews(paths.every(path => ready.has(path)) ? [] : paths);
    });
    return () => { cancelled = true; clearTimeout(timeout); for (const image of images) { image.onload = null; image.onerror = null; } };
  }, [shipViewKey, state.runId]);

  // Engine light is optional and cannot disable a valid hull family or hold the
  // loading gate. Preloading gives its two independent sprites time to decode
  // before the rear aperture becomes visible during departure.
  useEffect(() => {
    const images = shipEffectKey.split('|').filter(Boolean).map(path => {
      const image = new Image(); image.decoding = 'async'; image.src = path; return image;
    });
    return () => { for (const image of images) { image.onload = null; image.onerror = null; } };
  }, [shipEffectKey]);

  // All montage layers load before active time starts. Missing images never
  // block an exit or cause a substitute hull/planet to be displayed.
  useEffect(() => {
    let cancelled = false;
    const paths = sourceKey.split('|').filter(Boolean);
    const images: HTMLImageElement[] = [];
    const failures = new Set<string>();
    let timeout = 0;
    const pending = paths.map(path => new Promise<void>(resolve => {
      const image = new Image();
      images.push(image);
      image.onload = () => resolve();
      image.onerror = () => { failures.add(path); resolve(); };
      image.src = path;
      if (image.complete) { if (!image.naturalWidth) failures.add(path); resolve(); }
    }));
    void Promise.race([
      Promise.all(pending),
      new Promise<void>(resolve => { timeout = window.setTimeout(resolve, 8_000); }),
    ]).then(() => {
      if (cancelled || !mountedRef.current) return;
      for (const image of images) if (!image.complete || !image.naturalWidth) failures.add(image.getAttribute('src') ?? '');
      setFailedAssets([...failures].filter(Boolean));
      setLoading(false);
      lastFrameRef.current = null;
    });
    return () => { cancelled = true; clearTimeout(timeout); for (const image of images) { image.onload = null; image.onerror = null; } };
  }, [sourceKey, checkpoint]);

  // Start only after loading=false commits: an older loading RAF must not see
  // a playing timeline and pause it before its cleanup. A short autosave may
  // also own storage; wait for its release. A resumed run stays paused.
  useEffect(() => {
    if (!loading && !suspended && !checkpointBlocked && !document.hidden && timelineRef.current.status === 'prepared') {
      checkpoint(startPlanetArrival(timelineRef.current));
    }
  }, [loading, suspended, checkpointBlocked, checkpoint]);

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const change = () => setSystemReducedMotion(query.matches);
    const frame = requestAnimationFrame(change);
    query.addEventListener('change', change);
    return () => { cancelAnimationFrame(frame); query.removeEventListener('change', change); };
  }, []);

  useEffect(() => {
    const hidden = () => { if (document.hidden) pause('Tu as quitté la fenêtre. Reprends quand tu es prêt.'); };
    const blur = () => { keyboardDownRef.current.clear(); keyboardArmedRef.current = false; pause('La fenêtre est inactive. La séquence attend ton retour.'); };
    const keyup = (event: globalThis.KeyboardEvent) => {
      if (!['Escape', 'Space', 'Enter'].includes(event.code)) return;
      // A confirmation held on the preceding screen must not activate the
      // newly focused button when released after the transition.
      if (!keyboardArmedRef.current) event.preventDefault();
      keyboardDownRef.current.delete(event.code);
      if (keyboardDownRef.current.size === 0) keyboardArmedRef.current = true;
    };
    document.addEventListener('visibilitychange', hidden);
    window.addEventListener('blur', blur);
    window.addEventListener('keyup', keyup, true);
    return () => { document.removeEventListener('visibilitychange', hidden); window.removeEventListener('blur', blur); window.removeEventListener('keyup', keyup, true); };
  }, [pause]);

  useEffect(() => {
    let frame = 0;
    const tick = (now: number) => {
      frame = requestAnimationFrame(tick);
      if (suspended || loading || document.hidden) {
        lastFrameRef.current = null;
        if (timelineRef.current.status === 'playing') pause(suspended ? 'La séquence est suspendue.' : 'La fenêtre est inactive.');
        return;
      }
      if (checkpointBlocked) { lastFrameRef.current = null; return; }
      const previous = lastFrameRef.current;
      lastFrameRef.current = now;
      if (previous === null || busyRef.current || timelineRef.current.status !== 'playing') return;
      const before = timelineRef.current;
      const next = advancePlanetArrival(before, now - previous);
      if (next === before) return;
      if (next.status === 'handoff-pending') { void handoff(next); return; }
      if (next.status === 'paused') { setPauseReason('Une longue interruption a suspendu l’arrivée.'); checkpoint(next); return; }
      if (planetArrivalShotAt(before.elapsedMs).id !== planetArrivalShotAt(next.elapsedMs).id) checkpoint(next);
      else publish(next);
    };
    frame = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(frame); lastFrameRef.current = null; };
  }, [suspended, checkpointBlocked, loading, pause, checkpoint, handoff, publish]);

  useEffect(() => {
    if (suspended || loading) return;
    const frame = requestAnimationFrame(() => primaryRef.current?.focus({ preventScroll: true }));
    return () => cancelAnimationFrame(frame);
  }, [timeline.status, suspended, loading]);

  const keyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (!['Escape', 'Space', 'Enter'].includes(event.code)) return;
    // A fresh press after a pointer launch is valid immediately. A held key
    // only generates repeats, which stay blocked until release.
    if (!event.repeat && keyboardDownRef.current.size === 0) keyboardArmedRef.current = true;
    keyboardDownRef.current.add(event.code);
    if (event.repeat || suspended || checkpointBlocked || busy || !keyboardArmedRef.current) {
      event.preventDefault(); event.stopPropagation(); return;
    }
    audioDirectorRef.current?.unlock();
    if (event.code === 'Escape') { event.preventDefault(); event.stopPropagation(); back(); }
  };

  const assetFailed = (path: string) => {
    if (shipViewPaths.includes(path)) {
      setUnavailableShipViews(previous => previous.length === shipViewPaths.length ? previous : shipViewPaths);
    } else setFailedAssets(previous => previous.includes(path) ? previous : [...previous, path]);
  };
  const shot = planetArrivalShotAt(timeline.elapsedMs);
  const leadPodEntry = arrivalPodEntryFrame(timeline.elapsedMs, motionReduced);
  const shotLabel = !shipInsertion && shot.id === 'atmosphere' ? leadPodEntry.label
    : arrivalShotLabel(shot.id, shot.label, insertion.method);
  const p = shot.progress;
  const progress = timeline.elapsedMs / PLANET_ARRIVAL_DURATION_MS;
  const landed = shot.id === 'landing' || shot.id === 'egress';
  const atmospheric = shot.id === 'atmosphere';
  const carrierVisible = shot.id === 'carrier' || shot.id === 'release' || shipInsertion && (shot.id === 'descent' || atmospheric);
  const flightVisible = !shipInsertion && (shot.id === 'release' || shot.id === 'descent' || atmospheric);
  const terminal = timeline.status === 'handoff-pending' || timeline.status === 'recoverable-error' || timeline.status === 'complete';
  const paused = timeline.status === 'paused' || timeline.status === 'prepared';
  const showOverlay = paused || terminal || loading;
  const planetVisible = !landed && !atmospheric && shot.id !== 'orbit' && shot.id !== 'title';
  // Flight views have their own full-canvas sockets. Ground contact and the
  // historical launch origins retain the original profile's calibration.
  const baseCarrierArt = carrierArtForShip(state.personalShipId);
  const baseCarrierHeight = CARRIER_WIDTH * baseCarrierArt.height / baseCarrierArt.width;
  const baseCarrierFacing = baseCarrierArt.nose.x < baseCarrierArt.tail.x ? -1 : 1;
  const baseCarrierHeading = angleBetween({ x: baseCarrierArt.tail.x * baseCarrierFacing, y: baseCarrierArt.tail.y },
    { x: baseCarrierArt.nose.x * baseCarrierFacing, y: baseCarrierArt.nose.y }, baseCarrierArt.width, baseCarrierArt.height);
  const shipMotion = arrivalShipMotionFrame(state.personalShipId, timeline.elapsedMs, insertion.method, motionReduced, unavailableShipViews);
  const carrierArt = shipMotion.art;
  const carrierHeight = CARRIER_WIDTH * carrierArt.height / carrierArt.width;
  // Mirror a left-facing source, then rotate the complete hull and its sockets.
  // Rotating the source by 180 degrees would put the ship upside down.
  const carrierFacing = carrierArt.nose.x < carrierArt.tail.x ? -1 : 1;
  const carrierHeading = angleBetween({ x: carrierArt.tail.x * carrierFacing, y: carrierArt.tail.y },
    { x: carrierArt.nose.x * carrierFacing, y: carrierArt.nose.y }, carrierArt.width, carrierArt.height);
  const carrierPose = shipInsertion ? arrivalInsertionShipPose(shot.id, motionReduced ? .5 : p)
    : arrivalCarrierPose(shot.id, motionReduced ? .5 : p);
  const carrierRotation = carrierPose.angle - carrierHeading;
  const carrierPivot = { x: carrierFacing < 0 ? 1 - shipMotion.pivot.x : shipMotion.pivot.x, y: shipMotion.pivot.y };
  const dominantShipView = shipMotion.to && shipMotion.mix >= .5 ? shipMotion.to : shipMotion.from;
  const flightHeight = FLIGHT_WIDTH * ARRIVAL_SPRITES.podFlight.height / ARRIVAL_SPRITES.podFlight.width;
  const flightHeading = angleBetween(ARRIVAL_SPRITES.podFlight.tail, ARRIVAL_SPRITES.podFlight.nose,
    ARRIVAL_SPRITES.podFlight.width, ARRIVAL_SPRITES.podFlight.height);
  const planetArt = planetArtForDestination(state.destinationId);
  // Reduced motion cuts directly to the grounded pose at the same impact cue.
  const surfaceContact = shot.id === 'egress' || (shot.id === 'landing' && p >= PLANET_ARRIVAL_CONTACT_PROGRESS);
  const doorOpen = shot.id === 'egress' ? motionReduced ? 1 : smooth(p / .28) : 0;
  const cameraReveal = motionReduced ? 1 : shot.id === 'egress' ? smooth((p - .55) / .45) : 0;
  const groundCamera = arrivalGroundCamera(cameraReveal, landing.floorY, shipInsertion ? 1.2 : 2.25);
  const shipGround = arrivalSurfaceShipGeometry(baseCarrierArt, baseCarrierFacing, landing.floorY);
  const shipGroundPose = arrivalShipGroundPose(shot.id === 'landing' ? p : 1,
    shipGround.contact, PLANET_ARRIVAL_CONTACT_PROGRESS, motionReduced);
  const shipShadow = attachmentToStage(shipGroundPose,
    (.5 - shipGround.foot.x) * shipGround.width, (.5 - shipGround.foot.y) * shipGround.height);
  const capsuleHeight = landing.capsuleWidth * ARRIVAL_SPRITES.podGround.height / ARRIVAL_SPRITES.podGround.width;
  const capsuleOrigin = {
    x: landing.capsuleX - ARRIVAL_SPRITES.podGround.foot.x * landing.capsuleWidth,
    y: landing.floorY - ARRIVAL_SPRITES.podGround.foot.y * capsuleHeight,
  };
  const threshold = {
    x: capsuleOrigin.x + ARRIVAL_SPRITES.podGround.threshold.x * landing.capsuleWidth,
    y: capsuleOrigin.y + ARRIVAL_SPRITES.podGround.threshold.y * capsuleHeight,
  };
  const doorWidth = landing.capsuleWidth * ARRIVAL_SPRITES.podDoor.widthInGround;
  const doorHeight = doorWidth * ARRIVAL_SPRITES.podDoor.height / ARRIVAL_SPRITES.podDoor.width;
  const titleOpacity = shot.id === 'title' ? motionReduced ? 1 : Math.min(clamp01(p * 4), clamp01((1 - p) * 5)) : 0;
  const sceneStyle = { '--arrival-accent': destination?.mission.palette.accent ?? '#d4ad73' } as CSSProperties;
  const lighting = arrivalLighting(state.biomeId, shot.id, timeline.elapsedMs, motionReduced);
  const shipCloak = arrivalShipCloakFrame(timeline.elapsedMs, insertion, motionReduced);
  const shipEngine = arrivalShipEngineFrame(timeline.elapsedMs, insertion.method, motionReduced, shipCloak.strength);
  const impactArt = arrivalImpactArtForBiome(state.biomeId);
  const materialArt = arrivalVfxArtForBiome(state.biomeId);
  const shipGroundEffects = arrivalBatchGroundFrame(timeline.elapsedMs, motionReduced);

  const layer = (path: string | undefined, className: string, style?: CSSProperties, alt = '') => path && !failedAssets.includes(path)
    ? <img src={path} className={className} style={style} alt={alt} draggable={false} onError={() => assetFailed(path)} /> : null;

  const litLayer = (path: string | undefined, className: string, role: string, rotation = 0, mirrored = false, fillAngle = 32,
    opening = doorOpen, podHeat?: number, painted = true) => {
    if (!path || failedAssets.includes(path)) return null;
    const faceLighting = role === 'hatch-interior'
      ? { ...lighting, keyStrength: lighting.keyStrength * .35, fillStrength: lighting.fillStrength * .65 }
      : podHeat === undefined ? lighting : { ...lighting, heat: podHeat };
    const light = arrivalLightGradient(faceLighting, rotation, mirrored, fillAngle,
      role.startsWith('flight-pod') ? ARRIVAL_SPRITES.podFlight.nose : undefined);
    return <div className={`${styles.litSprite} ${className}`} data-arrival-lit={painted ? role : undefined}
      data-arrival-light-source={painted ? path : undefined} data-arrival-light-environment={painted ? lighting.environment : undefined}
      data-arrival-light-world-angle={painted ? lighting.keyAngle : undefined} data-arrival-light-local-angle={painted ? light.localKeyAngle : undefined}
      data-arrival-light-rotation={painted ? rotation : undefined} data-arrival-light-mirrored={painted ? mirrored : undefined}>
      {layer(path, styles.fullAsset, { filter: `brightness(${lighting.brightness * (role === 'hatch' ? 1 - opening * .16 : role === 'hatch-interior' ? .7 : 1)}) saturate(.88)` })}
      <div className={styles.surfaceLight} data-arrival-light-mask={painted ? 'true' : undefined} style={{
        background: light.background, maskImage: `url("${path}")`, WebkitMaskImage: `url("${path}")`,
      }} />
    </div>;
  };

  const shipLayer = (role: 'carrier' | 'ground-ship', rotation: number, fillAngle = 32) => {
    if (!sources) return null;
    const grounded = role === 'ground-ship';
    const pivot = grounded ? { x: .5, y: .5 } : shipMotion.pivot;
    const width = grounded ? shipGround.width : CARRIER_WIDTH;
    const height = grounded ? shipGround.height : carrierHeight;
    const mirrored = (grounded ? baseCarrierFacing : carrierFacing) < 0;
    const entries = grounded ? [{ view: { ...shipMotion.from, id: 'profile' as const,
      path: sources.carrier, art: baseCarrierArt, pivot }, opacity: 1 }]
      : [{ view: shipMotion.from, opacity: 1 - shipMotion.mix },
        ...(shipMotion.to ? [{ view: shipMotion.to, opacity: shipMotion.mix }] : [])];
    const visible = entries.filter(entry => entry.opacity > 0 && !failedAssets.includes(entry.view.path));
    // Stable keyed paint slots preserve each real <img> when its view returns.
    // Inactive slots are retained at zero opacity, outside the painted selectors.
    const paintSlots = grounded || motionReduced ? visible
      : arrivalShipViewSlots(shipMotion, unavailableShipViews).filter(entry => !failedAssets.includes(entry.view.path));
    // Camera variants register their own full-canvas pivot onto the shared
    // moving pivot. Paint, lighting, refraction and rim receive the same offset.
    const registration = (view: typeof shipMotion.from): CSSProperties => {
      const transform: ArrivalShipViewTransform = grounded ? { translateX: 0, translateY: 0, rotationDeg: 0, scale: 1 }
        : arrivalShipViewRegistration(shipMotion, view);
      return {
        transformOrigin: `${view.pivot.x * 100}% ${view.pivot.y * 100}%`,
        transform: `translate(${transform.translateX * width}px, ${transform.translateY * height}px) rotate(${transform.rotationDeg}deg) scale(${transform.scale})` +
          (transform.sourceScale ? ` scale(${transform.sourceScale.x}, ${transform.sourceScale.y})` : ''),
      };
    };
    const engineLayers = (view: typeof shipMotion.from, part: 'core' | 'plume') => {
      const aperture = grounded ? null : arrivalShipEngineAperture(view.id);
      if (!aperture || shipEngine.power <= 0) return null;
      const art = ARRIVAL_SHIP_ENGINE_ART[part];
      if (failedAssets.includes(art.path)) return null;
      const pixelScale = width / view.art.width;
      const spriteWidth = part === 'core'
        ? aperture.width / ARRIVAL_SHIP_ENGINE_ART.core.visibleWidth * art.width * pixelScale : shipEngine.plumeWidth;
      const spriteHeight = part === 'core'
        ? aperture.height / ARRIVAL_SHIP_ENGINE_ART.core.visibleHeight * art.height * pixelScale
        : spriteWidth * art.height / art.width;
      const opacity = part === 'core' ? shipEngine.coreOpacity : shipEngine.plumeOpacity;
      return view.exhaust.filter(socket => socket.visibility > 0).map(socket => <div key={`${part}:${socket.id}`}
        className={part === 'core' ? styles.shipEngineCore : styles.shipEnginePlume}
        data-arrival-engine={part} data-arrival-engine-view={view.id} data-arrival-engine-socket={socket.id}
        data-arrival-engine-power={shipEngine.power} data-arrival-engine-angle={socket.angle}
        data-arrival-engine-source={art.path}
        style={{ left: socket.point.x * width, top: socket.point.y * height,
          opacity: opacity * socket.visibility, transform: `rotate(${socket.angle}deg)` }}>
        <span className={styles.spatialAnchor} data-arrival-engine-origin={part} style={{ left: 0, top: 0 }} />
        <div className={styles.effectSprite} style={{ width: spriteWidth, height: spriteHeight,
          left: -art.origin.x * spriteWidth, top: -art.origin.y * spriteHeight }}>
          {layer(art.path, styles.fullAsset)}
        </div>
      </div>);
    };
    const hull = <div className={styles.shipViewStack}>
      {paintSlots.map(({ view, opacity }) => <div key={view.id} className={styles.shipViewPaint}
        data-arrival-ship-view-layer={opacity > 0 ? view.id : undefined}
        data-arrival-retained-view={opacity === 0 ? view.id : undefined}
        data-arrival-ship-view-path={view.path}
        data-arrival-ship-view-opacity={opacity} data-arrival-ship-view-calibration={view.calibration}
        style={{ ...registration(view), opacity }}>
        <span className={styles.spatialAnchor} data-arrival-view-anchor="nose"
          style={{ left: view.art.nose.x * width, top: view.art.nose.y * height }} />
        <span className={styles.spatialAnchor} data-arrival-view-anchor="tail"
          style={{ left: view.art.tail.x * width, top: view.art.tail.y * height }} />
        {opacity > 0 && engineLayers(view, 'plume')}
        {litLayer(view.path, styles.fullAsset, role,
          rotation + (grounded ? 0 : arrivalShipViewRegistration(shipMotion, view).rotationDeg * (mirrored ? -1 : 1)),
          mirrored, fillAngle, doorOpen, undefined, opacity > 0)}
        {opacity > 0 && engineLayers(view, 'core')}
      </div>)}
    </div>;
    if (!shipCloak.requested || !visible.length) return hull;
    return <div className={styles.shipOptics} data-arrival-cloak-hull={role}>
      <div className={styles.shipHull} data-arrival-cloak-body="true" style={{ opacity: shipCloak.hullOpacity }}>{hull}</div>
      {shipCloak.strength > 0 && visible.map(({ view, opacity }) => <Fragment key={view.id}>
        <div className={styles.shipRefraction} data-arrival-cloak-refraction={view.path}
          data-arrival-cloak-view={view.id} style={{ ...registration(view),
          opacity: shipCloak.refractionOpacity * opacity, maskImage: `url("${view.path}")`, WebkitMaskImage: `url("${view.path}")`,
          backdropFilter: `url("#${cloakFilterId}-lens") blur(.65px)`,
          WebkitBackdropFilter: `url("#${cloakFilterId}-lens") blur(.65px)`,
        }} />
        <svg className={styles.shipCloakRim} data-arrival-cloak-rim={view.path}
          data-arrival-cloak-view={view.id} style={{ ...registration(view), opacity: shipCloak.rimOpacity * opacity }}
          preserveAspectRatio={!grounded && arrivalShipViewRegistration(shipMotion, view).sourceScale ? 'none' : undefined}
          viewBox={`0 0 ${view.art.width} ${view.art.height}`}>
          <image href={view.path} width={view.art.width} height={view.art.height} filter={`url(#${cloakFilterId}-rim)`}
            onError={() => assetFailed(view.path)} />
        </svg>
      </Fragment>)}
    </div>;
  };

  const anchor = (name: string, x = 0, y = 0) => <span className={styles.spatialAnchor} data-arrival-anchor={name} style={{ left: x, top: y }} />;
  type FormationSlot = ReturnType<typeof arrivalFormationSlots>[number];
  const slotAnchor = (slot: FormationSlot, name: string, x = 0, y = 0) =>
    anchor(slot.index ? `${slot.id}-${name}` : name, x, y);
  const materialEffect = (family: 'impact-settle' | 'ship-ground-wash' | 'foot-contact', art: ArrivalVfxArt,
    x: number, y: number, width: number, opacity: number, scale: number, member = 'ship', contactMs?: number) => {
    if (opacity <= 0 || failedAssets.includes(art.path)) return null;
    const height = width * art.height / art.width;
    return <div key={`${family}:${member}:${contactMs ?? 0}`} className={styles.materialSocket}
      data-arrival-batch-vfx={family} data-arrival-member={member} data-arrival-vfx-biome={state.biomeId}
      data-arrival-vfx-x={x} data-arrival-vfx-y={y} data-arrival-vfx-contact-ms={contactMs}
      data-arrival-vfx-anchor-x={art.anchor.x} data-arrival-vfx-anchor-y={art.anchor.y}
      style={{ left: x, top: y, opacity, transform: `scale(${scale})`,
        zIndex: family === 'ship-ground-wash' ? 3 : family === 'foot-contact' ? 8 : 5 }}>
      <div className={styles.materialSprite} style={{ width, height,
        left: -art.anchor.x * width, top: -art.anchor.y * height,
        filter: `brightness(${lighting.brightness}) saturate(.9)` }}>
        {layer(art.path, styles.fullAsset)}
      </div>
    </div>;
  };
  // Full-canvas registration preserves each existing lamp position. Screen
  // blending adds restrained emission without darkening the surrounding scene.
  const flightParts = (paint: (part: string, rotation: number) => ReactNode, opening: number,
    slot?: FormationSlot, independentCore = false) => <>
    <div className={styles.podFlightCore} data-arrival-pod-core={slot ? 'true' : undefined}
      data-arrival-pod-core-mode={slot ? independentCore ? 'independent' : 'partitioned' : undefined}
      style={{ clipPath: independentCore ? undefined : `url("#${podClipId}-core")` }}>{paint('core', 0)}</div>
    {ARRIVAL_POD_FLIGHT_PANELS.map(panel => {
      const angle = arrivalPodPanelAngle(panel, opening);
      return <div key={panel.id} className={styles.podFlightPanel}
        data-arrival-pod-shutter={slot ? panel.id : undefined}
        data-arrival-shutter-angle={slot ? angle : undefined}
        data-arrival-member={slot?.id}
        style={{ clipPath: `url("#${podClipId}-${panel.id}")`,
          transformOrigin: `${panel.hinge.x * 100}% ${panel.hinge.y * 100}%`, transform: `rotate(${angle}deg)` }}>
        {paint(`${panel.id}-shutter`, angle)}
        {slot && slotAnchor(slot, `shutter-${panel.id}-hinge`, panel.hinge.x * FLIGHT_WIDTH, panel.hinge.y * flightHeight)}
      </div>;
    })}
  </>;
  const podGlow = (slot: FormationSlot, kind: 'flight' | 'ground', opening = 1) => {
    const path = kind === 'flight' ? sources?.podFlightGlow : sources?.podGroundGlow;
    return path && !failedAssets.includes(path) ? <div className={styles.podGlow}
      data-arrival-batch-vfx={`pod-${kind}-glow`} data-arrival-member={slot.id}
      data-arrival-vfx-biome={state.biomeId} style={{ opacity: kind === 'flight' ? .28 : .32 }}>
      {kind === 'flight' ? flightParts(() => layer(path, styles.fullAsset), opening) : layer(path, styles.fullAsset)}
    </div> : null;
  };
  const effect = (slot: FormationSlot, kind: 'releaseJet' | 'heatTrail', source: 'pod-tail' | 'pod-nose',
    width: number, opacity: number, flutterScale = 1) => {
    const art = kind === 'heatTrail' ? ARRIVAL_POD_SPRITES.plasmaWake : ARRIVAL_SPRITES.releaseJet;
    const path = kind === 'heatTrail' ? sources?.podPlasmaWake : sources?.releaseJet;
    const socket = source === 'pod-tail' ? ARRIVAL_SPRITES.podFlight.tail : ARRIVAL_SPRITES.podFlight.nose;
    const height = width * art.height / art.width;
    const artHeading = angleBetween(art.origin, art.end, art.width, art.height);
    return <div className={styles.effectSocket} data-arrival-vfx-source={source} data-arrival-member={slot.id}
      style={{ left: socket.x * FLIGHT_WIDTH, top: socket.y * flightHeight, opacity }}>
      <div className={styles.effectRotation} style={{ transform: `rotate(${180 + flightHeading - artHeading}deg) scaleX(${flutterScale})` }}>
        <div className={styles.effectSprite} style={{ width, height, left: -art.origin.x * width, top: -art.origin.y * height }}>
          {layer(path, styles.fullAsset)}
          {slotAnchor(slot, kind === 'heatTrail' ? 'trail-origin' : 'release-origin', art.origin.x * width, art.origin.y * height)}
          {slotAnchor(slot, kind === 'heatTrail' ? 'trail-end' : 'release-end', art.end.x * width, art.end.y * height)}
        </div>
      </div>
    </div>;
  };

  const renderGroundPod = (slot: FormationSlot) => {
    const localTime = timeline.elapsedMs - slot.delayMs;
    const localVisible = landed && localTime >= PLANET_ARRIVAL_SHOTS[6].startMs;
    const localContact = localTime >= ARRIVAL_CONTACT_MS;
    const podX = landing.capsuleX + slot.offsetX;
    const podFall = clamp01((localTime - PLANET_ARRIVAL_SHOTS[6].startMs) /
      (ARRIVAL_CONTACT_MS - PLANET_ARRIVAL_SHOTS[6].startMs));
    const podDoorOpen = localTime < PLANET_ARRIVAL_SHOTS[7].startMs ? 0
      : motionReduced ? 1 : smooth((localTime - PLANET_ARRIVAL_SHOTS[7].startMs) / 1_400);
    const localEffects = arrivalEffectsFrame(localTime, motionReduced);
    const groundEffects = arrivalBatchGroundFrame(localTime, motionReduced);
    const localDebris = arrivalBiomeFragments(localEffects.impactAge, state.seed + slot.index, state.biomeId, motionReduced);
    return <Fragment key={slot.id}>
      {slotAnchor(slot, 'ground-capsule-reference', podX, landing.floorY)}
      {slotAnchor(slot, 'capsule-threshold', threshold.x + slot.offsetX, threshold.y)}
          {localVisible && <div className={styles.floorLight} data-arrival-floor-light="true" style={{ left: podX + 12, top: landing.floorY,
            opacity: localEffects.interiorLight + localEffects.impactLight,
            background: `radial-gradient(ellipse,${arrivalRgba(lighting.key, .8)},rgba(255,153,75,.3) 45%,transparent 72%)` }} />}
          {localVisible && localContact && localEffects.shockOpacity > 0 && <div className={styles.impactRing}
            data-arrival-impact-ring="true" style={{ left: podX, top: landing.floorY, opacity: localEffects.shockOpacity,
              transform: `translate(-50%,-50%) scale(${.25 + localEffects.shockProgress * 1.3})`, borderColor: arrivalRgba(lighting.dust, .8) }} />}
          {localVisible && <div className={styles.groundShadow} style={{ left: podX, top: landing.floorY, width: 92, height: 15,
            opacity: motionReduced ? .32 : .4 * podFall ** 4, transform: `translate(-50%,-50%) scale(${motionReduced ? 1 : mix(.35, 1, podFall)})` }} />}
          {localVisible && (!motionReduced || localContact) && <div className={styles.groundPod} data-arrival-ground-pod="true" data-arrival-member={slot.id} style={{ left: podX,
            top: motionReduced ? landing.floorY : mix(-190, landing.floorY, podFall * podFall), width: landing.capsuleWidth, height: capsuleHeight,
            transform: `translate(-${ARRIVAL_SPRITES.podGround.foot.x * 100}%,-${ARRIVAL_SPRITES.podGround.foot.y * 100}%)` }}>
            {litLayer(sources?.podGround, styles.fullAsset, 'ground-pod')}
            {podGlow(slot, 'ground')}
            <div className={styles.cabinLight} style={{ opacity: localEffects.interiorLight }} />
            {slotAnchor(slot, 'pod-ground', ARRIVAL_SPRITES.podGround.foot.x * landing.capsuleWidth, ARRIVAL_SPRITES.podGround.foot.y * capsuleHeight)}
            <div className={styles.doorSocket} style={{ left: ARRIVAL_SPRITES.podGround.doorHinge.x * landing.capsuleWidth,
              top: ARRIVAL_SPRITES.podGround.doorHinge.y * capsuleHeight }}>
              {slotAnchor(slot, 'door-hinge-reference')}
              <div className={styles.doorRotation} style={{ transform: `perspective(600px) rotateX(${108 * podDoorOpen}deg)` }}>
                <div className={styles.podDoor} style={{ width: doorWidth, height: doorHeight,
                  left: -ARRIVAL_SPRITES.podDoor.hinge.x * doorWidth, top: -ARRIVAL_SPRITES.podDoor.hinge.y * doorHeight }}>
                  <div className={styles.hatchFace} data-arrival-hatch-face="exterior">
                    {litLayer(sources?.podDoor, styles.fullAsset, 'hatch', 0, false, 32, podDoorOpen)}
                  </div>
                  <div className={`${styles.hatchFace} ${styles.hatchInterior}`} data-arrival-hatch-face="interior">
                    <div className={styles.hatchInteriorRegistration} style={{
                      maskImage: sources?.podDoor ? `url("${sources.podDoor}")` : undefined,
                      WebkitMaskImage: sources?.podDoor ? `url("${sources.podDoor}")` : undefined,
                    }}>
                      {litLayer(sources?.podDoorInterior, styles.fullAsset, 'hatch-interior')}
                    </div>
                  </div>
                  {slotAnchor(slot, 'door-hinge', ARRIVAL_SPRITES.podDoor.hinge.x * doorWidth, ARRIVAL_SPRITES.podDoor.hinge.y * doorHeight)}
                </div>
              </div>
            </div>
            {localEffects.ventOpacity > 0 && (['left', 'right'] as const).map(side => {
              const art = ARRIVAL_COMPLETION_SPRITES.vapor;
              const socket = ARRIVAL_COMPLETION_SPRITES.vents[side];
              const width = 110;
              const height = width * art.height / art.width;
              return <div key={side} className={styles.ventSocket} data-arrival-vent={side} data-arrival-member={slot.id}
                style={{ left: socket.x * landing.capsuleWidth, top: socket.y * capsuleHeight, opacity: localEffects.ventOpacity }}>
                {slotAnchor(slot, `vent-${side}`)}
                <div className={styles.vaporRotation} style={{ transform: `scale(${localEffects.ventScale}) scaleX(${side === 'left' ? -1 : 1})` }}>
                  <div className={styles.vaporSprite} style={{ width, height, left: -art.origin.x * width, top: -art.origin.y * height,
                    filter: `brightness(${lighting.brightness}) saturate(.4)` }}>
                    {layer(sources?.vapor, styles.fullAsset, { opacity: 1 - localEffects.ventThinMix })}
                    {layer(sources?.vaporThin, styles.vaporThin, { opacity: localEffects.ventThinMix })}
                    {slotAnchor(slot, `vapor-${side}-origin`, art.origin.x * width, art.origin.y * height)}
                  </div>
                </div>
              </div>;
            })}
          </div>}
          {localVisible && localContact && <div className={styles.dustSocket}
            data-arrival-batch-vfx="impact-front" data-arrival-member={slot.id} data-arrival-vfx-biome={state.biomeId}
            data-arrival-vfx-x={podX} data-arrival-vfx-y={landing.floorY}
            data-arrival-vfx-anchor-x={impactArt.foot.x} data-arrival-vfx-anchor-y={impactArt.foot.y}
            style={{ left: podX, top: landing.floorY, opacity: groundEffects.frontOpacity, transform: `scale(${groundEffects.frontScale})` }}>
            <div className={styles.impactDust} data-arrival-impact-material={impactArt.material} data-arrival-member={slot.id}
              style={{ width: 340, height: 340 * impactArt.height / impactArt.width,
                transform: `translate(-${impactArt.foot.x * 100}%,-${impactArt.foot.y * 100}%)` }}>
              {litLayer(sources?.impactDust, styles.fullAsset, 'impact-dust')}
              {slotAnchor(slot, 'dust-ground', impactArt.foot.x * 340, impactArt.foot.y * 340 * impactArt.height / impactArt.width)}
            </div>
          </div>}
          {localVisible && localContact && materialEffect('impact-settle', materialArt.settle,
            podX, landing.floorY, 360, groundEffects.settleOpacity, groundEffects.settleScale, slot.id)}
          {localVisible && localDebris.map(piece => <div key={piece.id} className={styles.debrisSocket}
            data-arrival-debris={piece.id} data-arrival-member={slot.id}
            data-arrival-batch-vfx="fragment" data-arrival-vfx-biome={state.biomeId} data-arrival-vfx-variant={piece.variant}
            data-arrival-vfx-x={podX + piece.x} data-arrival-vfx-y={landing.floorY + piece.y}
            data-arrival-vfx-support-offset={piece.supportOffset} data-arrival-vfx-support-y={landing.floorY + piece.supportY}
            style={{ left: podX + piece.x, top: landing.floorY + piece.y,
              opacity: piece.opacity, transform: `rotate(${piece.angle}deg)` }}>
            <div className={styles.debrisSprite} style={{ width: piece.width, height: piece.height,
              left: -piece.art.anchor.x * piece.width,
              top: -piece.art.anchor.y * piece.height,
              filter: `brightness(${lighting.brightness})` }}>
              {layer(piece.art.path, styles.fullAsset)}
            </div>
          </div>)}
    </Fragment>;
  };

  const renderHunter = (slot: FormationSlot) => {
    const hunterTime = timeline.elapsedMs - slot.delayMs;
    const hunterHeight = slot.index ? EXPEDITION_MEMBER_SIZE.height : landing.hunterHeight;
    const hunterWidth = hunterHeight * HUNTER_RIG_CANVAS.width / HUNTER_RIG_CANVAS.height;
    const hunterGroundY = hunterHeight * HUNTER_RIG_CANVAS.groundY / HUNTER_RIG_CANVAS.height;
    const destinationX = landing.spawnX + landing.hunterWidth / 2 + slot.offsetX;
    const sourceThreshold = shipInsertion ? shipGround.exit : { x: threshold.x + slot.offsetX, y: threshold.y };
    const direction = destinationX >= sourceThreshold.x ? 1 : -1;
    const hunterGeometry = {
      threshold: sourceThreshold, floorY: landing.floorY,
      clearanceX: shipInsertion ? sourceThreshold.x + direction * Math.min(60, Math.abs(destinationX - sourceThreshold.x) * .4)
        : landing.capsuleX + slot.offsetX + landing.capsuleWidth * .42,
      destinationX,
    };
    const hunterPose = arrivalHunterEgress(hunterTime, hunterGeometry, motionReduced);
    const footContacts = arrivalFootContacts(hunterTime, hunterGeometry, motionReduced);
    const memberId = slot.id as ExpeditionMemberId;
    const look = slot.index ? companionLooks[memberId] : appearance;
    const kit = slot.index ? companionKits[memberId] : loadout;
    const clipId = `${hunterPortalId}-${slot.id}`;
    const hunterPortalActive = hunterPose.portalReveal < 1 && hunterPose.opacity > 0;
    const interiorLight = shipInsertion ? 0 : arrivalEffectsFrame(hunterTime, motionReduced).interiorLight;
    const doorwayClip = ARRIVAL_SPRITES.podGround.doorway.map(point => {
      const x = capsuleOrigin.x + slot.offsetX + point.x * landing.capsuleWidth;
      const y = capsuleOrigin.y + point.y * capsuleHeight;
      return `${(x - hunterPose.x) / hunterPose.scale + hunterWidth / 2},${(y - hunterPose.y) / hunterPose.scale + hunterGroundY}`;
    }).join(' ');
    return <Fragment key={slot.id}>
      {slotAnchor(slot, 'hunter-support', hunterPose.x, hunterPose.y)}
      {shipInsertion && slotAnchor(slot, 'ship-egress-threshold', sourceThreshold.x, sourceThreshold.y)}
      <div className={styles.groundShadow} style={{ left: hunterPose.x,
        top: landing.floorY, width: 48 * hunterPose.scale, height: 8,
        opacity: hunterPose.opacity * .45 * clamp01(1 - (landing.floorY - hunterPose.y) / (shipInsertion ? 180 : 80)), transform: 'translate(-50%,-50%)' }} />
      {landed && hunterPose.opacity > 0 && footContacts.map(contact => materialEffect('foot-contact', materialArt.foot,
        contact.x, contact.y, contact.width, contact.opacity, contact.scale, slot.id, contact.atMs + slot.delayMs))}
      <svg className={styles.clipDefinitions} width="0" height="0" aria-hidden="true" focusable="false">
        <defs><clipPath id={clipId} clipPathUnits="userSpaceOnUse">
          {shipInsertion ? <rect x={-4} y={mix(hunterGroundY, -4, hunterPose.portalReveal)}
            width={hunterWidth + 8} height={hunterHeight * 3} /> : <>
            <polygon points={doorwayClip} />
            <rect x={mix(hunterWidth + 4, -4, hunterPose.portalReveal)} y={-hunterHeight}
              width={hunterWidth * 3} height={hunterHeight * 3} />
          </>}
        </clipPath></defs>
      </svg>
      {/* All selected rigs preload from orbit; only their saved egress clocks move them. */}
      <div className={styles.hunter} data-arrival-hunter={slot.index ? slot.id : appearance.presetId}
        data-arrival-member={slot.id} data-arrival-member-name={slot.name}
        data-arrival-spawn={slot.index ? `${state.spawnId}:${slot.id}` : state.spawnId}
        data-arrival-hunter-stage={hunterPose.stage} data-arrival-hunter-contact={hunterPose.contact}
        data-arrival-hunter-portal={hunterPortalActive ? 'active' : 'clear'}
        style={{ left: hunterPose.x, top: hunterPose.y,
          width: hunterWidth, opacity: hunterPose.opacity,
          transform: `translate(-50%, -${HUNTER_RIG_CANVAS.groundY / HUNTER_RIG_CANVAS.height * 100}%) scale(${hunterPose.scale})`,
          transformOrigin: `50% ${HUNTER_RIG_CANVAS.groundY / HUNTER_RIG_CANVAS.height * 100}%`,
          clipPath: hunterPortalActive ? `url(#${clipId})` : undefined,
          filter: `brightness(${lighting.brightness + interiorLight * .25}) saturate(.9) drop-shadow(-.6px -.8px 1px ${arrivalRgba(lighting.key, .16)})` }}>
        <ArrivalHunter appearance={look} armorId={kit.armorId} weaponIds={kit.weaponIds} gearIds={kit.gearIds}
          gauntletVariantId={slot.index ? undefined : gauntletVariantId} size="100%" style={ARRIVAL_RIG_STYLE} pose={hunterPose.pose}
          phase={hunterPose.phase} speed={hunterPose.speed} verticalVelocity={hunterPose.verticalVelocity} facing={hunterPose.facing} />
        {slotAnchor(slot, 'hunter-feet', hunterWidth / 2, hunterGroundY)}
        {slot.index > 0 && <span className={styles.memberLabel} style={{ color: slot.color ?? undefined }}>{slot.name}</span>}
      </div>
    </Fragment>;
  };

  return (
    <section ref={rootRef} className={styles.arrival} style={sceneStyle} aria-label={`Arrivée sur ${state.destinationDisplayName}`}
      aria-hidden={suspended || undefined} onKeyDownCapture={keyDown}
      onPointerDownCapture={() => { keyboardArmedRef.current = true; if (!suspended && !checkpointBlocked) audioDirectorRef.current?.unlock(); }}
      data-arrival-run={state.runId} data-arrival-shot={shot.id} data-arrival-status={timeline.status}
      data-arrival-elapsed={Math.round(timeline.elapsedMs)} data-arrival-reduced-motion={motionReduced}
      data-arrival-elapsed-exact={timeline.elapsedMs}
      data-arrival-ship-motion-ready={shipViewPaths.length - unavailableShipViews.length}
      data-arrival-ship-motion-unavailable={unavailableShipViews.length}
      data-arrival-method={insertion.method} data-arrival-team={insertion.team} data-arrival-ship-cloak={shipCloak.requested}>
      <header className={styles.header}>
        <div><p className={styles.eyebrow}>TRAJECTOIRE D’INSERTION</p><h1>{state.destinationDisplayName}</h1><p className={styles.missionName}>{destination?.mission.title}</p></div>
        <div className={styles.shipIdentity}><span>VAISSEAU ENGAGÉ</span><strong>{shipForId(state.personalShipId).name}</strong><small>{destination?.system.name}</small>
          {shipCloak.requested && <small className={styles.cloakStatus}>{shipCloak.phase === 'active' ? 'Camouflage optique actif'
            : shipCloak.phase === 'releasing' ? 'Désactivation du camouflage' : 'Camouflage désactivé'}</small>}
        </div>
      </header>

      <div ref={sceneRef} className={styles.scene} role="group" aria-label={`${shotLabel}. Destination ${state.destinationDisplayName}.`}
        data-arrival-scene="true" data-arrival-planet={state.destinationId} data-arrival-ship={state.personalShipId} data-arrival-contact={surfaceContact}
        data-arrival-ship-cloak={shipCloak.requested} data-arrival-cloak-phase={shipCloak.phase}>
        <div className={styles.stage} data-arrival-stage="true" aria-hidden="true"
          style={{ width: ARRIVAL_STAGE.width, height: ARRIVAL_STAGE.height, transform: `translate(${stageFit.left}px, ${stageFit.top}px) scale(${stageFit.scale})` }}>
        {!shipInsertion && <svg className={styles.clipDefinitions} aria-hidden="true">
          <defs>
            <clipPath id={`${podClipId}-core`} clipPathUnits="objectBoundingBox">
              <path d={ARRIVAL_POD_FLIGHT_CORE_CLIP} clipRule="evenodd" fillRule="evenodd" />
            </clipPath>
            {ARRIVAL_POD_FLIGHT_PANELS.map(panel => <clipPath key={panel.id}
              id={`${podClipId}-${panel.id}`} clipPathUnits="objectBoundingBox">
              <path d={ARRIVAL_POD_FLIGHT_PANEL_CLIPS[panel.id]} />
            </clipPath>)}
          </defs>
        </svg>}
        {shipCloak.requested && <svg className={styles.clipDefinitions} aria-hidden="true">
          <defs>
            <filter id={`${cloakFilterId}-lens`} x="-3%" y="-3%" width="106%" height="106%" colorInterpolationFilters="sRGB">
              <feTurbulence type="fractalNoise" baseFrequency=".017 .055" numOctaves="1" seed={state.seed % 97}
                stitchTiles="stitch" result="cloak-noise" />
              <feOffset in="cloak-noise" dx={shipCloak.noiseOffsetX} dy={shipCloak.noiseOffsetY} result="cloak-field" />
              <feDisplacementMap in="SourceGraphic" in2="cloak-field" scale={shipCloak.distortionScale} xChannelSelector="R" yChannelSelector="G" />
            </filter>
            <filter id={`${cloakFilterId}-rim`} x="-3%" y="-3%" width="106%" height="106%" colorInterpolationFilters="sRGB">
              <feMorphology in="SourceAlpha" operator="dilate" radius={baseCarrierArt.width * .0018} result="expanded" />
              <feComposite in="expanded" in2="SourceAlpha" operator="out" result="outline" />
              <feFlood floodColor="#b0d5d8" result="rim-color" />
              <feComposite in="rim-color" in2="outline" operator="in" />
            </filter>
          </defs>
        </svg>}
        <div className={styles.spaceBackdrop} aria-hidden="true">{layer(sources?.space, styles.cover, { opacity: .85,
          transform: motionReduced ? 'none' : `translate(${-Math.min(timeline.elapsedMs, 41_000) / 4_000}px, ${Math.min(timeline.elapsedMs, 41_000) / 8_000}px) scale(1.04)` })}</div>
        {!landed && !atmospheric && <div className={styles.orbitalLight} />}
        {planetVisible && <div className={styles.planet} aria-hidden="true" style={{ left: motionReduced ? '70%' : percent(shot.id === 'descent' ? mix(73, 68, p) : 73), top: motionReduced ? '31%' : percent(shot.id === 'descent' ? mix(12, 3, p) : 12), width: motionReduced ? '55%' : percent(shot.id === 'descent' ? mix(56, 145, smooth(p)) : 56),
          aspectRatio: planetArt ? planetArt.radiusX * planetArt.width / (planetArt.radiusY * planetArt.height) : 1 }}>
          {planetArt && sources?.planet && !failedAssets.includes(sources.planet) ? <svg className={styles.planetImage} data-arrival-planet-image={sources.planet}
            viewBox={`${(planetArt.center.x - planetArt.radiusX) * planetArt.width} ${(planetArt.center.y - planetArt.radiusY) * planetArt.height} ${2 * planetArt.radiusX * planetArt.width} ${2 * planetArt.radiusY * planetArt.height}`}
            preserveAspectRatio="none">
            <image href={sources.planet} width={planetArt.width} height={planetArt.height} onError={() => assetFailed(sources.planet)} />
          </svg> : layer(sources?.planet, styles.planetImage)}
        </div>}
        {carrierVisible && <div className={styles.carrier} data-arrival-carrier="true"
          data-arrival-cloak-strength={shipInsertion ? shipCloak.strength : undefined}
          data-arrival-ship-view={dominantShipView.id} data-arrival-ship-view-from={shipMotion.from.id}
          data-arrival-ship-view-to={shipMotion.to?.id ?? ''} data-arrival-ship-view-mix={shipMotion.mix}
          data-arrival-ship-view-path={dominantShipView.path} data-arrival-ship-view-fallback={shipMotion.fallback}
          data-arrival-ship-view-calibration={dominantShipView.calibration}
          data-arrival-ship-view-pivot-x={carrierPivot.x} data-arrival-ship-view-pivot-y={carrierPivot.y}
          style={{ left: carrierPose.x, top: carrierPose.y, width: CARRIER_WIDTH, height: carrierHeight,
          transformOrigin: `${carrierPivot.x * 100}% ${carrierPivot.y * 100}%`,
          transform: `translate(-${carrierPivot.x * 100}%,-${carrierPivot.y * 100}%) rotate(${carrierRotation}deg) scale(${carrierPose.scale})` }}>
          <div className={styles.carrierArt} style={{ transform: `scaleX(${carrierFacing})` }}>
            {shipLayer('carrier', carrierRotation,
              Math.atan2(ARRIVAL_STAGE.height * .12 - carrierPose.y, ARRIVAL_STAGE.width * .73 - carrierPose.x) * 180 / Math.PI)}
            {anchor('carrier-nose', carrierArt.nose.x * CARRIER_WIDTH, carrierArt.nose.y * carrierHeight)}
            {anchor('carrier-tail', carrierArt.tail.x * CARRIER_WIDTH, carrierArt.tail.y * carrierHeight)}
            {anchor('carrier-release', carrierArt.release.x * CARRIER_WIDTH, carrierArt.release.y * carrierHeight)}
            {anchor('carrier-pivot', shipMotion.pivot.x * CARRIER_WIDTH, shipMotion.pivot.y * carrierHeight)}
          </div>
        </div>}
        {atmospheric && <div className={styles.atmosphere} style={{ backgroundColor: '#101923',
          backgroundImage: `linear-gradient(170deg,${arrivalRgba(lighting.haze, .5)},${arrivalRgba(lighting.fill, .18)} 65%,#060c12)` }}>
          {layer(sources?.clouds, styles.atmosphereClouds, { transform: motionReduced ? 'none' : `translate(${-p * 42}px, ${-p * 30}px) scale(1.15)` })}
          <div className={styles.atmosphereTint} style={{ background: `linear-gradient(180deg,${arrivalRgba(lighting.haze, .35)},${arrivalRgba(lighting.fill, .25)})` }} />
        </div>}
        {flightVisible && formation.map(slot => {
          const launchPose = arrivalCarrierPose('release', slot.delayMs / 8_000);
          const launchOrigin = attachmentToStage({ ...launchPose, angle: launchPose.angle - baseCarrierHeading },
            (baseCarrierArt.release.x - .5) * CARRIER_WIDTH * baseCarrierFacing, (baseCarrierArt.release.y - .5) * baseCarrierHeight);
          const flightPose = arrivalFormationFlightPose(shot.id, motionReduced ? .5 : p, launchOrigin, slot.index, slot.delayMs);
          if (!flightPose.visible) return null;
          const releaseAge = p * 8_000 - slot.delayMs;
          const entry = arrivalPodEntryFrame(timeline.elapsedMs - slot.delayMs, motionReduced);
          const rotation = flightPose.angle - flightHeading;
          const independentCore = Boolean(sources?.podFlightCore && !failedAssets.includes(sources.podFlightCore));
          const bow = ARRIVAL_POD_SPRITES.bowShock;
          const bowWidth = 44, bowHeight = bowWidth * bow.height / bow.width;
          return <div key={slot.id} className={styles.flyingPod} data-arrival-flight-pod="true" data-arrival-member={slot.id}
            data-arrival-launch-x={launchOrigin.x} data-arrival-launch-y={launchOrigin.y}
            data-arrival-launch-ms={23_000 + slot.delayMs} data-arrival-launch-view="profile"
            data-arrival-pod-elapsed={timeline.elapsedMs - slot.delayMs}
            data-arrival-pod-phase={entry.phase} data-arrival-pod-shutters={entry.shutters}
            data-arrival-pod-deployment={entry.shuttersOpen} data-arrival-pod-heat={entry.heat}
            data-arrival-pod-hull-heat={entry.hullHeat}
            style={{ left: flightPose.x, top: flightPose.y, width: FLIGHT_WIDTH, height: flightHeight,
              zIndex: shot.id === 'release' ? 3 : 5,
              transform: `translate(-50%,-50%) rotate(${rotation}deg) scale(${flightPose.scale})` }}>
            {shot.id === 'release' && !motionReduced && effect(slot, 'releaseJet', 'pod-tail', 180, clamp01(1 - releaseAge / 1_920))}
            {atmospheric && effect(slot, 'heatTrail', 'pod-nose', entry.trailWidth, entry.trailOpacity, entry.flutterScale)}
            <div className={styles.podFlightImage} data-arrival-pod-assembly="true">
              {flightParts((part, panelRotation) => litLayer(part === 'core' && independentCore ? sources?.podFlightCore : sources?.podFlight,
                styles.fullAsset, part === 'core' ? 'flight-pod' : `flight-pod-${part}`,
                rotation + panelRotation, false, 32, 0, entry.hullHeat), entry.shuttersOpen, slot, independentCore)}
            </div>
            {podGlow(slot, 'flight', entry.shuttersOpen)}
            {atmospheric && <div className={styles.podBowShock} data-arrival-pod-bow-shock="true"
              style={{ left: ARRIVAL_SPRITES.podFlight.nose.x * FLIGHT_WIDTH,
                top: ARRIVAL_SPRITES.podFlight.nose.y * flightHeight, opacity: entry.bowShockOpacity,
                transform: `rotate(${flightHeading}deg) scaleX(${entry.flutterScale})` }}>
              <div className={styles.effectSprite} style={{ width: bowWidth, height: bowHeight,
                left: -bow.origin.x * bowWidth, top: -bow.origin.y * bowHeight }}>
                {layer(sources?.podBowShock, styles.fullAsset)}
                {slotAnchor(slot, 'bow-shock-origin', bow.origin.x * bowWidth, bow.origin.y * bowHeight)}
                {slotAnchor(slot, 'bow-shock-forward', (bow.origin.x + .12) * bowWidth, bow.origin.y * bowHeight)}
              </div>
            </div>}
            {slotAnchor(slot, 'pod-nose', ARRIVAL_SPRITES.podFlight.nose.x * FLIGHT_WIDTH, ARRIVAL_SPRITES.podFlight.nose.y * flightHeight)}
            {slotAnchor(slot, 'pod-tail', ARRIVAL_SPRITES.podFlight.tail.x * FLIGHT_WIDTH, ARRIVAL_SPRITES.podFlight.tail.y * flightHeight)}
            {ARRIVAL_POD_FLIGHT_PANELS.map(panel => <Fragment key={panel.id}>
              {slotAnchor(slot, `shutter-${panel.id}-socket`, panel.hinge.x * FLIGHT_WIDTH, panel.hinge.y * flightHeight)}
            </Fragment>)}
          </div>;
        })}
        {atmospheric && <div className={styles.nearClouds}>
          {layer(sources?.clouds, styles.nearCloudImage, { opacity: motionReduced ? .12 : .12 + .08 * Math.sin(p * Math.PI),
            transform: motionReduced ? 'scale(1.65)' : `translate(${-p * 180}px, ${-p * 120}px) scale(1.65)` })}
        </div>}

        <div className={styles.groundScene} aria-hidden="true" style={{ opacity: landed ? 1 : 0 }}>
          <div className={styles.groundCamera} data-arrival-ground-camera="true"
            style={{ transform: `translate(${groundCamera.x}px, ${groundCamera.y}px) scale(${groundCamera.scale})` }}>
          {sources?.ground && !failedAssets.includes(sources.ground) && <svg className={styles.groundBackground}
            viewBox={`${groundFrame.x} ${groundFrame.y} ${groundFrame.width} ${groundFrame.height}`} preserveAspectRatio="xMinYMid slice"
            data-arrival-ground-frame={`${groundFrame.x},${groundFrame.y},${groundFrame.width},${groundFrame.height}`}>
            <image href={sources.ground} width={groundFrame.sourceWidth} height={groundFrame.sourceHeight} onError={() => assetFailed(sources.ground)} />
          </svg>}
          <div className={styles.groundShade} />
          <div className={styles.groundPlane} style={{ top: landing.floorY }} />
          {anchor('ground-reference', 0, landing.floorY)}
          <div className={styles.groundActors}>
          {!shipInsertion && formation.map(renderGroundPod)}
          {shipInsertion && landed && <>
            {anchor('ship-ground-reference', shipGround.contact.x, landing.floorY)}
            {materialEffect('ship-ground-wash', materialArt.wash, shipGround.contact.x, landing.floorY,
              Math.max(360, Math.min(720, shipGround.width * 1.12)), shipGroundEffects.washOpacity, shipGroundEffects.washScale)}
            <div className={styles.groundShadow} data-arrival-ship-shadow="true"
              style={{ left: shipShadow.x, top: landing.floorY, width: shipGround.width * .72, height: 36,
                opacity: .48 * shipGroundPose.descent ** 2,
                transform: `translate(-50%,-50%) scale(${mix(.4, 1, shipGroundPose.descent)})` }} />
            {(!motionReduced || shipGroundPose.contact) && <div className={styles.groundShip}
              data-arrival-ground-ship={state.personalShipId} data-arrival-ship-contact={shipGroundPose.contact}
              data-arrival-ship-view="profile" data-arrival-ship-view-path={sources?.carrier}
              data-arrival-cloak-strength={shipCloak.strength}
              style={{ left: shipGroundPose.x, top: shipGroundPose.y, width: shipGround.width, height: shipGround.height,
                transformOrigin: `${shipGround.foot.x * 100}% ${shipGround.foot.y * 100}%`,
                transform: `translate(-${shipGround.foot.x * 100}%,-${shipGround.foot.y * 100}%) rotate(${shipGroundPose.angle}deg)` }}>
              <div className={styles.carrierArt} style={{ transform: `scaleX(${baseCarrierFacing})` }}>
                {shipLayer('ground-ship', shipGroundPose.angle)}
                {anchor('ship-ground-contact', baseCarrierArt.groundContact.x * shipGround.width, baseCarrierArt.groundContact.y * shipGround.height)}
                {anchor('ship-ground-exit', baseCarrierArt.groundExit.x * shipGround.width, baseCarrierArt.groundExit.y * shipGround.height)}
              </div>
            </div>}
          </>}
          {formation.map(renderHunter)}
          </div>
          </div>
        </div>

        <div className={styles.vignette} aria-hidden="true" />
        <div className={styles.letterboxTop} aria-hidden="true" /><div className={styles.letterboxBottom} aria-hidden="true" />
        </div>
        {shot.id === 'title' && <div className={styles.titleCard} style={{ opacity: titleOpacity, transform: `translate(-50%,-50%) scale(${motionReduced ? 1 : mix(1.06, 1, p)})` }} aria-hidden="true"><span>{destination?.system.name}</span><strong>{state.destinationDisplayName}</strong><small>{destination?.mission.subtitle}</small></div>}
        {!showOverlay && <div className={styles.shotCaption}><span>{String(shot.index + 1).padStart(2, '0')} / 08</span><p>{shotLabel}</p></div>}

        {showOverlay && <div className={styles.overlay} role="group" aria-labelledby="arrival-pause-title">
          <div className={styles.overlayPanel}>
            <p className={styles.eyebrow}>{loading ? 'PRÉPARATION DE L’ARRIVÉE' : terminal ? 'RELAIS VERS LA CHASSE' : 'SÉQUENCE EN PAUSE'}</p>
            <h2 id="arrival-pause-title">{loading ? 'Destination verrouillée' : busy ? 'Insertion en cours…' : timeline.status === 'complete' ? 'Arrivée confirmée' : terminal ? 'Prêt à rejoindre la surface' : 'La chasse peut attendre'}</h2>
            <p>{loading ? shipInsertion ? 'Chargement du vaisseau, des chasseurs et du terrain.' : 'Chargement du vaisseau, des capsules et du terrain.'
              : error || (terminal ? 'La mission commence après confirmation de la sauvegarde.' : pauseReason || 'Reprends l’arrivée ou rejoins directement la surface.')}</p>
            {!loading && !terminal && <button ref={primaryRef} type="button" className={styles.primaryButton} disabled={suspended || checkpointBlocked || busy} onClick={resume}>Reprendre l’arrivée</button>}
            {!loading && terminal && timeline.status !== 'complete' && <button ref={primaryRef} type="button" className={styles.primaryButton} disabled={suspended || checkpointBlocked || busy} onClick={() => { void handoff(); }}>{busy ? 'Confirmation…' : 'Réessayer le départ'}</button>}
            {!busy && timeline.status !== 'complete' && <button type="button" className={styles.quietButton} disabled={suspended || checkpointBlocked} onClick={exit}>Enregistrer et revenir au menu</button>}
          </div>
        </div>}
      </div>

      <footer className={styles.footer}>
        <div className={styles.progressGroup}><div className={styles.progressLabels}><span>{shotLabel}</span><span>{Math.floor(timeline.elapsedMs / 1_000)} / 62 s</span></div>
          <div className={styles.progressTrack} role="progressbar" aria-label="Progression de l’arrivée" aria-valuemin={0} aria-valuemax={62} aria-valuenow={Math.floor(timeline.elapsedMs / 1_000)}><span style={{ width: percent(progress * 100) }} />
            {PLANET_ARRIVAL_SHOTS.slice(1).map(item => <i key={item.id} style={{ left: percent(item.startMs / PLANET_ARRIVAL_DURATION_MS * 100) }} />)}</div>
          <p className={styles.assistiveNote} role="status" aria-live="polite">{error || (failedAssets.length ? 'Certains visuels sont indisponibles. Tu peux passer l’arrivée et rejoindre ta mission.' : motionReduced ? 'Mouvements réduits : tableaux fixes, durée et destination conservées.' : 'Échap : pause · Manette : naviguer et confirmer')}</p>
        </div>
        <div className={styles.controls}>
          {!showOverlay && <button ref={primaryRef} type="button" className={styles.quietButton} disabled={suspended || checkpointBlocked || busy} onClick={() => pause()}>Pause</button>}
          <button type="button" className={styles.skipButton} disabled={suspended || checkpointBlocked || busy || terminal} onClick={() => { void handoff(); }}>Passer l’arrivée <span aria-hidden="true">›</span></button>
        </div>
      </footer>
    </section>
  );
}
