"use client";

/* eslint-disable @next/next/no-img-element -- scene layers use registered local raster art */

import { memo, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import HunterRigPreview from './HunterRigPreview';
import { HUNTER_RIG_CANVAS } from './hunterRig';
import { shipForId } from './shipCatalogue';
import { backgroundSourceRectForBiome, getWorldScreenAtX } from './worldScreens';
import type { HunterAppearance, Loadout } from './types';
import type { SceneAudioPort } from './systems/sceneAudio';
import { useMenuGamepad } from './useMenuGamepad';
import { PlanetArrivalAudio } from './systems/planetArrivalAudio';
import { ARRIVAL_SPRITES, carrierArtForShip, planetArtForDestination } from './systems/planetArrivalArt';
import { ARRIVAL_STAGE, arrivalCarrierPose, arrivalFlightPose, arrivalGroundCamera, attachmentToStage, fitArrivalStage } from './systems/planetArrivalSpatial';
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
  const [systemReducedMotion, setSystemReducedMotion] = useState(false);
  const [pauseReason, setPauseReason] = useState('');
  const [stageFit, setStageFit] = useState(() => fitArrivalStage(0, 0));
  const callbackRef = useRef({ onCheckpoint, onHandoff, onExit, suspended, checkpointBlocked });
  const sources = useMemo(() => planetArrivalAssets(state), [state]);
  const sourceKey = sources ? Object.values(sources).join('|') : '';
  const destination = useMemo(() => planetArrivalDestination(state.missionId), [state.missionId]);
  const landing = planetArrivalLanding(state);
  const groundFrame = useMemo(() => backgroundSourceRectForBiome(state.biomeId,
    getWorldScreenAtX(state.missionId, landing.spawnX).layers.background.band), [state.biomeId, state.missionId, landing.spawnX]);
  const motionReduced = reducedMotion || systemReducedMotion;

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
    audioDirectorRef.current?.sync(timeline, !loading && !suspended && !checkpointBlocked && !document.hidden);
  }, [createSceneAudio, timeline, loading, suspended, checkpointBlocked]);

  const publish = useCallback((next: PlanetArrivalState) => {
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
      const current = timelineRef.current;
      if (current.status === 'prepared' && !document.hidden && !callbackRef.current.suspended && !callbackRef.current.checkpointBlocked) {
        checkpoint(startPlanetArrival(current));
      }
    });
    return () => { cancelled = true; clearTimeout(timeout); for (const image of images) { image.onload = null; image.onerror = null; } };
  }, [sourceKey, checkpoint]);

  // Preloading may finish while the campaign's short autosave owns storage.
  // Start this new arrival once that write releases; a resumed run stays paused.
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

  const assetFailed = (path: string) => setFailedAssets(previous => previous.includes(path) ? previous : [...previous, path]);
  const shot = planetArrivalShotAt(timeline.elapsedMs);
  const p = shot.progress;
  const progress = timeline.elapsedMs / PLANET_ARRIVAL_DURATION_MS;
  const landed = shot.id === 'landing' || shot.id === 'egress';
  const atmospheric = shot.id === 'atmosphere';
  const carrierVisible = shot.id === 'carrier' || shot.id === 'release';
  const flightVisible = shot.id === 'release' || shot.id === 'descent' || atmospheric;
  const terminal = timeline.status === 'handoff-pending' || timeline.status === 'recoverable-error' || timeline.status === 'complete';
  const paused = timeline.status === 'paused' || timeline.status === 'prepared';
  const showOverlay = paused || terminal || loading;
  const planetVisible = !landed && !atmospheric && shot.id !== 'orbit' && shot.id !== 'title';
  const carrierArt = carrierArtForShip(state.personalShipId);
  const carrierHeight = CARRIER_WIDTH * carrierArt.height / carrierArt.width;
  // Mirror a left-facing source, then rotate the complete hull and its sockets.
  // Rotating the source by 180 degrees would put the ship upside down.
  const carrierFacing = carrierArt.nose.x < carrierArt.tail.x ? -1 : 1;
  const carrierHeading = angleBetween({ x: carrierArt.tail.x * carrierFacing, y: carrierArt.tail.y },
    { x: carrierArt.nose.x * carrierFacing, y: carrierArt.nose.y }, carrierArt.width, carrierArt.height);
  const carrierPose = arrivalCarrierPose(shot.id, motionReduced ? .5 : p);
  const carrierRotation = carrierPose.angle - carrierHeading;
  const launchPose = arrivalCarrierPose('release', 0);
  const launchOrigin = attachmentToStage({ ...launchPose, angle: launchPose.angle - carrierHeading },
    (carrierArt.release.x - .5) * CARRIER_WIDTH * carrierFacing, (carrierArt.release.y - .5) * carrierHeight);
  const flightPose = arrivalFlightPose(shot.id, motionReduced ? .55 : p, launchOrigin);
  const flightHeight = FLIGHT_WIDTH * ARRIVAL_SPRITES.podFlight.height / ARRIVAL_SPRITES.podFlight.width;
  const flightHeading = angleBetween(ARRIVAL_SPRITES.podFlight.tail, ARRIVAL_SPRITES.podFlight.nose,
    ARRIVAL_SPRITES.podFlight.width, ARRIVAL_SPRITES.podFlight.height);
  const planetArt = planetArtForDestination(state.destinationId);
  const fallProgress = shot.id === 'landing' ? clamp01(p / PLANET_ARRIVAL_CONTACT_PROGRESS) : 1;
  // Accelerate into contact; an ease-out before impact made the crash hover.
  const groundProgress = fallProgress * fallProgress;
  // Reduced motion cuts directly to the grounded pose at the same impact cue.
  const surfaceContact = shot.id === 'egress' || (shot.id === 'landing' && p >= PLANET_ARRIVAL_CONTACT_PROGRESS);
  const impactAge = timeline.elapsedMs - (49_000 + 8_000 * PLANET_ARRIVAL_CONTACT_PROGRESS);
  const dustOpacity = motionReduced ? .16 : clamp01(impactAge / 100) * clamp01(1 - impactAge / 2_600);
  const dustScale = motionReduced ? 1 : .65 + clamp01(impactAge / 1_800) * .85;
  const doorOpen = shot.id === 'egress' ? motionReduced ? 1 : smooth(p / .28) : 0;
  // The hunter appears only once the physical hinged panel has cleared the exit.
  const egress = shot.id === 'egress' ? smooth((p - .30) / .55) : 0;
  const hunterOpacity = shot.id === 'egress' ? motionReduced ? 1 : clamp01((p - .30) / .10) : 0;
  const cameraReveal = motionReduced ? 1 : shot.id === 'egress' ? smooth((p - .55) / .45) : 0;
  const hunterCenterX = mix(landing.capsuleX + 12, landing.spawnX + landing.hunterWidth / 2, egress);
  const hunterWidth = landing.hunterHeight * HUNTER_RIG_CANVAS.width / HUNTER_RIG_CANVAS.height;
  const groundCamera = arrivalGroundCamera(cameraReveal, landing.floorY);
  const capsuleHeight = landing.capsuleWidth * ARRIVAL_SPRITES.podGround.height / ARRIVAL_SPRITES.podGround.width;
  const doorWidth = landing.capsuleWidth * ARRIVAL_SPRITES.podDoor.widthInGround;
  const doorHeight = doorWidth * ARRIVAL_SPRITES.podDoor.height / ARRIVAL_SPRITES.podDoor.width;
  const titleOpacity = shot.id === 'title' ? motionReduced ? 1 : Math.min(clamp01(p * 4), clamp01((1 - p) * 5)) : 0;
  const sceneStyle = { '--arrival-accent': destination?.mission.palette.accent ?? '#d4ad73' } as CSSProperties;

  const layer = (path: string | undefined, className: string, style?: CSSProperties, alt = '') => path && !failedAssets.includes(path)
    ? <img src={path} className={className} style={style} alt={alt} draggable={false} onError={() => assetFailed(path)} /> : null;

  const anchor = (name: string, x = 0, y = 0) => <span className={styles.spatialAnchor} data-arrival-anchor={name} style={{ left: x, top: y }} />;
  const effect = (kind: 'releaseJet' | 'heatTrail', source: 'pod-tail' | 'pod-nose', width: number, opacity: number) => {
    const art = ARRIVAL_SPRITES[kind];
    const socket = source === 'pod-tail' ? ARRIVAL_SPRITES.podFlight.tail : ARRIVAL_SPRITES.podFlight.nose;
    const height = width * art.height / art.width;
    const artHeading = angleBetween(art.origin, art.end, art.width, art.height);
    return <div className={styles.effectSocket} data-arrival-vfx-source={source}
      style={{ left: socket.x * FLIGHT_WIDTH, top: socket.y * flightHeight, opacity }}>
      <div className={styles.effectRotation} style={{ transform: `rotate(${180 + flightHeading - artHeading}deg)` }}>
        <div className={styles.effectSprite} style={{ width, height, left: -art.origin.x * width, top: -art.origin.y * height }}>
          {layer(sources?.[kind], styles.fullAsset)}
          {anchor(kind === 'heatTrail' ? 'trail-origin' : 'release-origin', art.origin.x * width, art.origin.y * height)}
          {anchor(kind === 'heatTrail' ? 'trail-end' : 'release-end', art.end.x * width, art.end.y * height)}
        </div>
      </div>
    </div>;
  };

  return (
    <section ref={rootRef} className={styles.arrival} style={sceneStyle} aria-label={`Arrivée sur ${state.destinationDisplayName}`}
      aria-hidden={suspended || undefined} onKeyDownCapture={keyDown}
      onPointerDownCapture={() => { keyboardArmedRef.current = true; if (!suspended && !checkpointBlocked) audioDirectorRef.current?.unlock(); }}
      data-arrival-run={state.runId} data-arrival-shot={shot.id} data-arrival-status={timeline.status}
      data-arrival-elapsed={Math.round(timeline.elapsedMs)} data-arrival-reduced-motion={motionReduced}>
      <header className={styles.header}>
        <div><p className={styles.eyebrow}>TRAJECTOIRE D’INSERTION</p><h1>{state.destinationDisplayName}</h1><p className={styles.missionName}>{destination?.mission.title}</p></div>
        <div className={styles.shipIdentity}><span>VAISSEAU ENGAGÉ</span><strong>{shipForId(state.personalShipId).name}</strong><small>{destination?.system.name}</small></div>
      </header>

      <div ref={sceneRef} className={styles.scene} role="group" aria-label={`${shot.label}. Destination ${state.destinationDisplayName}.`}
        data-arrival-scene="true" data-arrival-planet={state.destinationId} data-arrival-ship={state.personalShipId} data-arrival-contact={surfaceContact}>
        <div className={styles.stage} data-arrival-stage="true" aria-hidden="true"
          style={{ width: ARRIVAL_STAGE.width, height: ARRIVAL_STAGE.height, transform: `translate(${stageFit.left}px, ${stageFit.top}px) scale(${stageFit.scale})` }}>
        <div className={styles.spaceBackdrop} aria-hidden="true">{layer(sources?.space, styles.cover, { opacity: .85 })}</div>
        {planetVisible && <div className={styles.planet} aria-hidden="true" style={{ left: motionReduced ? '70%' : percent(shot.id === 'descent' ? mix(73, 68, p) : 73), top: motionReduced ? '31%' : percent(shot.id === 'descent' ? mix(12, 3, p) : 12), width: motionReduced ? '55%' : percent(shot.id === 'descent' ? mix(56, 145, smooth(p)) : 56),
          aspectRatio: planetArt ? planetArt.radiusX * planetArt.width / (planetArt.radiusY * planetArt.height) : 1 }}>
          {planetArt && sources?.planet && !failedAssets.includes(sources.planet) ? <svg className={styles.planetImage} data-arrival-planet-image={sources.planet}
            viewBox={`${(planetArt.center.x - planetArt.radiusX) * planetArt.width} ${(planetArt.center.y - planetArt.radiusY) * planetArt.height} ${2 * planetArt.radiusX * planetArt.width} ${2 * planetArt.radiusY * planetArt.height}`}
            preserveAspectRatio="none">
            <image href={sources.planet} width={planetArt.width} height={planetArt.height} onError={() => assetFailed(sources.planet)} />
          </svg> : layer(sources?.planet, styles.planetImage)}
        </div>}
        {carrierVisible && <div className={styles.carrier} data-arrival-carrier="true" style={{ left: carrierPose.x, top: carrierPose.y, width: CARRIER_WIDTH, height: carrierHeight,
          transform: `translate(-50%,-50%) rotate(${carrierRotation}deg) scale(${carrierPose.scale})` }}>
          <div className={styles.carrierArt} style={{ transform: `scaleX(${carrierFacing})` }}>
            {layer(sources?.carrier, styles.fullAsset)}
            {anchor('carrier-nose', carrierArt.nose.x * CARRIER_WIDTH, carrierArt.nose.y * carrierHeight)}
            {anchor('carrier-tail', carrierArt.tail.x * CARRIER_WIDTH, carrierArt.tail.y * carrierHeight)}
            {anchor('carrier-release', carrierArt.release.x * CARRIER_WIDTH, carrierArt.release.y * carrierHeight)}
          </div>
        </div>}
        {atmospheric && <div className={styles.atmosphere}>
          {layer(sources?.clouds, styles.atmosphereClouds, { transform: motionReduced ? 'none' : `translate(${-p * 42}px, ${-p * 30}px) scale(1.15)` })}
        </div>}
        {flightVisible && <div className={styles.flyingPod} data-arrival-flight-pod="true" style={{ left: flightPose.x, top: flightPose.y, width: FLIGHT_WIDTH, height: flightHeight,
          zIndex: shot.id === 'release' ? 3 : 5, transform: `translate(-50%,-50%) rotate(${flightPose.angle - flightHeading}deg) scale(${flightPose.scale})` }}>
          {shot.id === 'release' && !motionReduced && effect('releaseJet', 'pod-tail', 180, clamp01(1 - p / .24))}
          {atmospheric && effect('heatTrail', 'pod-nose', 310, motionReduced ? .65 : .68 + .18 * Math.sin(p * Math.PI))}
          {layer(sources?.podFlight, styles.podFlightImage)}
          {anchor('pod-nose', ARRIVAL_SPRITES.podFlight.nose.x * FLIGHT_WIDTH, ARRIVAL_SPRITES.podFlight.nose.y * flightHeight)}
          {anchor('pod-tail', ARRIVAL_SPRITES.podFlight.tail.x * FLIGHT_WIDTH, ARRIVAL_SPRITES.podFlight.tail.y * flightHeight)}
        </div>}
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
          {anchor('ground-capsule-reference', landing.capsuleX, landing.floorY)}
          <div className={styles.groundActors}>
          {landed && <div className={styles.groundShadow} style={{ left: landing.capsuleX, top: landing.floorY, width: 92, height: 15,
            opacity: motionReduced ? .32 : .4 * fallProgress ** 4, transform: `translate(-50%,-50%) scale(${motionReduced ? 1 : mix(.35, 1, fallProgress)})` }} />}
          {landed && (!motionReduced || surfaceContact) && <div className={styles.groundPod} data-arrival-ground-pod="true" style={{ left: landing.capsuleX,
            top: motionReduced ? landing.floorY : mix(-190, landing.floorY, groundProgress), width: landing.capsuleWidth, height: capsuleHeight,
            transform: `translate(-${ARRIVAL_SPRITES.podGround.foot.x * 100}%,-${ARRIVAL_SPRITES.podGround.foot.y * 100}%)` }}>
            {layer(sources?.podGround, styles.fullAsset)}
            {anchor('pod-ground', ARRIVAL_SPRITES.podGround.foot.x * landing.capsuleWidth, ARRIVAL_SPRITES.podGround.foot.y * capsuleHeight)}
            <div className={styles.doorSocket} style={{ left: ARRIVAL_SPRITES.podGround.doorHinge.x * landing.capsuleWidth,
              top: ARRIVAL_SPRITES.podGround.doorHinge.y * capsuleHeight }}>
              {anchor('door-hinge-reference')}
              <div className={styles.doorRotation} style={{ transform: `perspective(600px) rotateX(${108 * doorOpen}deg)` }}>
                <div className={styles.podDoor} style={{ width: doorWidth, height: doorHeight,
                  left: -ARRIVAL_SPRITES.podDoor.hinge.x * doorWidth, top: -ARRIVAL_SPRITES.podDoor.hinge.y * doorHeight }}>
                  {layer(sources?.podDoor, styles.fullAsset)}
                  {anchor('door-hinge', ARRIVAL_SPRITES.podDoor.hinge.x * doorWidth, ARRIVAL_SPRITES.podDoor.hinge.y * doorHeight)}
                </div>
              </div>
            </div>
          </div>}
          {landed && surfaceContact && <div className={styles.dustSocket} style={{ left: landing.capsuleX, top: landing.floorY, opacity: dustOpacity, transform: `scale(${dustScale})` }}>
            <div className={styles.impactDust} style={{ width: 340, height: 340 * ARRIVAL_SPRITES.impactDust.height / ARRIVAL_SPRITES.impactDust.width,
              transform: `translate(-${ARRIVAL_SPRITES.impactDust.foot.x * 100}%,-${ARRIVAL_SPRITES.impactDust.foot.y * 100}%)` }}>
              {layer(sources?.impactDust, styles.fullAsset)}
              {anchor('dust-ground', ARRIVAL_SPRITES.impactDust.foot.x * 340, ARRIVAL_SPRITES.impactDust.foot.y * 340 * ARRIVAL_SPRITES.impactDust.height / ARRIVAL_SPRITES.impactDust.width)}
            </div>
          </div>}
          <div className={styles.groundShadow} style={{ left: motionReduced ? landing.spawnX + landing.hunterWidth / 2 : hunterCenterX,
            top: landing.floorY, width: 48, height: 8, opacity: hunterOpacity * .45, transform: 'translate(-50%,-50%)' }} />
          {/* Always mounted, including orbit: the actual selected rig preloads its own layers. */}
          <div className={styles.hunter} data-arrival-hunter={appearance.presetId} data-arrival-spawn={state.spawnId}
            style={{ left: motionReduced ? landing.spawnX + landing.hunterWidth / 2 : hunterCenterX, top: landing.floorY,
              width: hunterWidth, opacity: hunterOpacity, transform: `translate(-50%, -${HUNTER_RIG_CANVAS.groundY / HUNTER_RIG_CANVAS.height * 100}%)` }}>
            <ArrivalHunter appearance={appearance} armorId={loadout.armorId} weaponIds={loadout.weaponIds} gearIds={loadout.gearIds}
              gauntletVariantId={gauntletVariantId} size="100%" style={ARRIVAL_RIG_STYLE} pose={!motionReduced && egress > 0 && egress < 1 ? 'run' : 'idle'}
              phase={motionReduced || shot.id !== 'egress' ? 0 : timeline.elapsedMs / 800} speed={!motionReduced && egress > 0 && egress < 1 ? 65 : 0} facing={1} />
            {anchor('hunter-feet', hunterWidth / 2, landing.hunterHeight * HUNTER_RIG_CANVAS.groundY / HUNTER_RIG_CANVAS.height)}
          </div>
          </div>
          </div>
        </div>

        <div className={styles.vignette} aria-hidden="true" />
        <div className={styles.letterboxTop} aria-hidden="true" /><div className={styles.letterboxBottom} aria-hidden="true" />
        </div>
        {shot.id === 'title' && <div className={styles.titleCard} style={{ opacity: titleOpacity, transform: `translate(-50%,-50%) scale(${motionReduced ? 1 : mix(1.06, 1, p)})` }} aria-hidden="true"><span>{destination?.system.name}</span><strong>{state.destinationDisplayName}</strong><small>{destination?.mission.subtitle}</small></div>}
        {!showOverlay && <div className={styles.shotCaption}><span>{String(shot.index + 1).padStart(2, '0')} / 08</span><p>{shot.label}</p></div>}

        {showOverlay && <div className={styles.overlay} role="group" aria-labelledby="arrival-pause-title">
          <div className={styles.overlayPanel}>
            <p className={styles.eyebrow}>{loading ? 'PRÉPARATION DE L’ARRIVÉE' : terminal ? 'RELAIS VERS LA CHASSE' : 'SÉQUENCE EN PAUSE'}</p>
            <h2 id="arrival-pause-title">{loading ? 'Destination verrouillée' : busy ? 'Insertion en cours…' : timeline.status === 'complete' ? 'Arrivée confirmée' : terminal ? 'Prêt à rejoindre la surface' : 'La chasse peut attendre'}</h2>
            <p>{loading ? 'Chargement du vaisseau, de la capsule et du terrain.' : error || (terminal ? 'La mission commence après confirmation de la sauvegarde.' : pauseReason || 'Reprends l’arrivée ou rejoins directement la surface.')}</p>
            {!loading && !terminal && <button ref={primaryRef} type="button" className={styles.primaryButton} disabled={suspended || checkpointBlocked || busy} onClick={resume}>Reprendre l’arrivée</button>}
            {!loading && terminal && timeline.status !== 'complete' && <button ref={primaryRef} type="button" className={styles.primaryButton} disabled={suspended || checkpointBlocked || busy} onClick={() => { void handoff(); }}>{busy ? 'Confirmation…' : 'Réessayer le départ'}</button>}
            {!busy && timeline.status !== 'complete' && <button type="button" className={styles.quietButton} disabled={suspended || checkpointBlocked} onClick={exit}>Enregistrer et revenir au menu</button>}
          </div>
        </div>}
      </div>

      <footer className={styles.footer}>
        <div className={styles.progressGroup}><div className={styles.progressLabels}><span>{shot.label}</span><span>{Math.floor(timeline.elapsedMs / 1_000)} / 62 s</span></div>
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
