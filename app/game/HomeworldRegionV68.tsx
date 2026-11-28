'use client';
/* eslint-disable @next/next/no-img-element -- unmodified native ground, architectural modules and animation cells */
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent, type ReactNode } from 'react';
import type { SaveGame } from './types';
import { homeworldRegionNames, yautjaLocalLabel } from './systems/yautjaPlaceNames';
import { HOMEWORLD_GEOMETRY_V64, homeworldProjectGroundV64, homeworldBuildingSpritePlacementV64 } from './systems/homeworldGeometryV64';
import { HOMEWORLD_BUILDING_ART_V64, HOMEWORLD_GROUND_ART_V64, HOMEWORLD_PROP_ART_V64, HOMEWORLD_INTERIOR_ART_V64 } from './systems/homeworldArtV64';
import { homeworldInteriorShellV64 } from './systems/homeworldInteriorShellV64';
import { HOMEWORLD_PASSAGE_BRIDGE_V67 } from './systems/homeworldPassageV67';
import { homeworldHeroPlate } from './systems/homeworldCity';
import { usesHomeworldYouthAppearanceV69, HOMEWORLD_YOUTH_PLATE_V69 } from './systems/homeworldAccessV69';
import { homeworldPortraitPlacementV64, homeworldModularPlacementV64 } from './systems/homeworldCharacterPlacementV64';
import { createHomeworldGamepadState, stepHomeworldGamepad } from './systems/homeworldInput';
import { preloadSceneImagesV94 } from './systems/nativeImagePreloadV94';
import { matchesControlAction } from './systems/controlBindings';
import { controlActionShortcut } from './controlBindingLabels';
import { HOMEWORLD_REGIONS_V68, HOMEWORLD_REGION_TRAIL_V68, HOMEWORLD_REGION_TRACES_V68, HOMEWORLD_REGION_HAZARD_V68, HOMEWORLD_REGION_INTERIOR_V68, HOMEWORLD_VILLAGE_WORLD_V68, HOMEWORLD_VILLAGE_PERIMETER_V68, HOMEWORLD_REGION_FIELD_PERIMETER_V68, REGION_FAUNA_ART_V68, REGION_WARD_IDS_V68, REGION_WARD_POSTS_V68, canEnterHomeworldRegionV68, createHomeworldRegionV68, normalizeHomeworldRegionV68, acknowledgeHomeworldRegionEventV68, stepHomeworldRegionV68, homeworldRegionInteractionV68, regionInteractionDialogueV68, regionObjectiveV68, regionResidentPositionV68, regionBridgesV68, regionHazardPhaseV68, homeworldRegionRouteMetresV68, homeworldRegionInteriorPropsV68, type HomeworldRegionIdV68, type HomeworldRegionStateV68, type RegionFieldEventV68 } from './systems/homeworldRegionsV68';
import HomeworldNativePropV64 from './HomeworldNativePropV64';
import HomeworldFaunaDisplayV77 from './HomeworldFaunaDisplayV77';
import {homeworldFaunaSourceUrlsV77,homeworldFaunaDimensionsV77} from './systems/homeworldFaunaV77';
import HomeworldModularHunter from './HomeworldModularHunter';
import HomeworldRegionalWatchV86 from './HomeworldRegionalWatchV86';
import HomeworldBibleCultureHostV86 from './HomeworldBibleCultureHostV86';
import BibleSceneCulturalV86 from './BibleSceneCulturalV86';
import {BIBLE_CULTURAL_BINDING_V86,bibleCulturalContextV86,bibleCulturalNearbyV86,defaultBibleSceneLedgerV86,type BibleSceneActionV86,type BibleSceneResultV86} from './systems/bibleSceneCulturalV86';
import HomeworldNpcSpriteV84 from './HomeworldNpcSpriteV84';
import HomeworldVillageLifeV69 from './HomeworldVillageLifeV69';
import { HOMEWORLD_VILLAGE_LIFE_V69, nearestHomeworldVillageResidentV69 } from './systems/homeworldVillageLifeV69';
import { HOMEWORLD_VILLAGE_ACTIVITIES_V70, createVillageActivitySessionV70, nearestVillageActivityV70, stepVillageActivityV70 } from './systems/homeworldVillageActivitiesV70';
import { villageDestinationsV70, villageGroundRouteV70, villageRouteRemainingV70 } from './systems/homeworldVillageRoutesV70';
import { contractRegionNarrativesV70 } from './systems/homeworldContractNarrativeV70';
import HomeworldVillageAtlasV70 from './HomeworldVillageAtlasV70';
import { villageFacadeFadedV70, villagePaintOccludedV70 } from './systems/homeworldVillageOcclusionV70';
import YautjaTranslationV67 from './YautjaTranslationV67';
import { houseForBuildingV149 } from './systems/residenceV149';
import { createOriginV151 } from './systems/originsV151';
import { trainingYardViewO6, type TrainingYardOrderO6 } from './systems/originTrainingYardO6';
import { continuationViewO6, type ContinuationOrderO6 } from './systems/originContinuationO6';
import { legacyDepartureViewR2 } from './systems/legacyFinaleR2';
import type { DepartureOrderO6 } from './systems/originDepartureO6';
import { soloReturnEvidenceO6, soloReturnViewO6, type SoloReturnOrderO6 } from './systems/originSoloReturnO6';
import yardStyles from './OriginTrainingYardO6.module.css';
import styles from './HomeworldRegionV68.module.css';

export interface HomeworldRegionV68Props {
  save: SaveGame; regionId: HomeworldRegionIdV68; checkpoint?: unknown; startAtVillage?: boolean; suspended?: boolean;
  gauntletVariantId?: string;
  /** Fresh durable ledger from the host; presentation cannot acknowledge proof. */
  contractsValue?: unknown;
  onCheckpoint(state: HomeworldRegionStateV68): boolean;
  /** Atomically acknowledge this exact field event and store its pending checkpoint. */
  onFieldEvent?(event: RegionFieldEventV68, state: HomeworldRegionStateV68): boolean;
  onBibleSceneAction?(action: BibleSceneActionV86, state: HomeworldRegionStateV68): BibleSceneResultV86;
  onOpenHaltEpilogue?(state: HomeworldRegionStateV68): boolean;
  onTrainingYardO6?(order: TrainingYardOrderO6 | ContinuationOrderO6 | SoloReturnOrderO6 | DepartureOrderO6, state: HomeworldRegionStateV68): boolean;
  onReachCity(state?: HomeworldRegionStateV68): boolean | void;
  onOpenSettings?(): void;
  /** V149: residence panel for a Demeure the player stands in (null when it holds no house). */
  residenceV149?(buildingId: string, disabled: boolean, threshold?: boolean): ReactNode;
  /** V150: guests of the player's house at this tick (village walk or seated inside). */
  guestsV150?(view: { regionId: string; runId: string; tick: number; zone: string; buildingId: string | null }): readonly { residentId: string; x: number; y: number; inside: boolean; moving: boolean; label: string }[];
  /** V158: voie mission played on this route (null when none applies here). */
  pathMissionV158?(disabled: boolean): ReactNode;
}
const axes = [['left', '←'], ['up', '↑'], ['down', '↓'], ['right', '→']] as const;
type Move = typeof axes[number][0];
const actions = ['hunt.moveLeft', 'hunt.moveRight', 'hunt.moveUp', 'hunt.moveDown'] as const;
const project = homeworldProjectGroundV64;
const defaultYardOrigin = createOriginV151('O6', 'legacy-default');
function currentYard(save: SaveGame, state: HomeworldRegionStateV68) {
  const origin = save.originV151 ?? defaultYardOrigin;
  const context = { rankId: save.profile.rankId, regionAllowed: (id: string) => canEnterHomeworldRegionV68(save, id).allowed };
  const yard = trainingYardViewO6(origin, save.residenceV149, state, context);
  return { yard, continuation: yard && !yard.next ? continuationViewO6(save, origin, state, context, yard) : null };
}

export default function HomeworldRegionV68(props: HomeworldRegionV68Props) {
  const { regionId, save, suspended = false } = props, definition = HOMEWORLD_REGIONS_V68[regionId];
  const names = homeworldRegionNames(regionId);
  const regionLabel = names ? yautjaLocalLabel(names.region) : definition.name;
  const villageLabel = names ? yautjaLocalLabel(names.village) : definition.village;
  const clanLabel = names ? yautjaLocalLabel(names.clan) : definition.clan;
  const youthWelcome = usesHomeworldYouthAppearanceV69(save), hero = youthWelcome ? HOMEWORLD_YOUTH_PLATE_V69 : homeworldHeroPlate(save.appearance.presetId);
  const [state, setState] = useState(() => props.checkpoint == null ? createHomeworldRegionV68(regionId, `${regionId}-${Date.now()}`, props.startAtVillage) : normalizeHomeworldRegionV68(props.checkpoint));
  const current = useRef(state), latest = useRef(props), held = useRef(new Set<string>()), touch = useRef(new Set<Move>()), interact = useRef(false), gamepad = useRef(createHomeworldGamepadState());
  const [paused, setPaused] = useState(true), pauseRef = useRef(true), [ready, setReady] = useState(false), readyRef = useRef(false);
  const [notice, setNotice] = useState(''), noticeRef = useRef(''), [error, setError] = useState(''), [artError, setArtError] = useState(''), [artAttempt, setArtAttempt] = useState(0);
  const [yardMessage, setYardMessage] = useState('');
  const [departureWriteFailed, setDepartureWriteFailed] = useState(false);
  const [noticeFromGuide, setNoticeFromGuide] = useState(false);
  const [size, setSize] = useState({ width: 1200, height: 720 });
  const [localPanel, setLocalPanel] = useState<string | null>(null);
  const bibleOpenRef=useRef(false),[bibleMessage,setBibleMessage]=useState(''),[focused,setFocused]=useState(true);
  const [activitySession, setActivitySession] = useState(() => createVillageActivitySessionV70(state?.runId ?? ''));
  const [navigation, setNavigation] = useState<{ id: string; points: { x: number; y: number }[] } | null>(null);
  const [navigationError, setNavigationError] = useState('');
  const narratives = useMemo(() => contractRegionNarrativesV70(props.contractsValue, { regionId, runId: state?.runId ?? '', suspended: suspended || !!error }), [props.contractsValue, regionId, state?.runId, suspended, error]);
  const viewport = useRef<HTMLDivElement>(null), scene = useRef<HTMLDivElement>(null), panel = useRef<HTMLDivElement>(null), exiting = useRef(false);
  const gate = canEnterHomeworldRegionV68(save, regionId), modal = paused || !ready || !!notice || !!error || !gate.allowed || state?.status === 'at-city';
  const soloEvidence = useMemo(() => soloReturnEvidenceO6(save), [save]);
  const soloEvidenceRef = useRef(soloEvidence);
  useEffect(() => { latest.current = props; soloEvidenceRef.current = soloEvidence; }, [props, soloEvidence]);
  const clear = useCallback(() => { held.current.clear(); touch.current.clear(); interact.current = false; gamepad.current = createHomeworldGamepadState(); }, []);
  const freeze = useCallback(() => { clear(); pauseRef.current = true; setPaused(true); }, [clear]);
  const persist = useCallback((next: HomeworldRegionStateV68) => {
    if (next.status === 'at-city') return false;
    let success = false;
    try { success = latest.current.onCheckpoint(structuredClone(next)); } catch { success = false; }
    if (!success) { freeze(); setError('La sauvegarde n’a pas pu être écrite. Ta position reste ici ; réessaie avant de repartir.'); }
    else setError('');
    return success;
  }, [freeze]);
  const field = useCallback((next: HomeworldRegionStateV68) => {
    if (!next.pendingFieldEvent) return persist(next) ? next : null;
    const acknowledged = acknowledgeHomeworldRegionEventV68(next);
    let success = false;
    try { success = latest.current.onFieldEvent ? latest.current.onFieldEvent(structuredClone(next.pendingFieldEvent), structuredClone(next)) : latest.current.onCheckpoint(acknowledged); } catch { success = false; }
    if (!success) { freeze(); setError('Le relevé est conservé ici, mais sa remise n’a pas été enregistrée. Réessaie la même remise.'); return null; }
    setError(''); current.current = acknowledged; setState(acknowledged); return acknowledged;
  }, [freeze, persist]);
  const bibleAction=useCallback((action:BibleSceneActionV86):BibleSceneResultV86=>{
    const s=current.current,p=latest.current;
    const result=s&&p.onBibleSceneAction?p.onBibleSceneAction(action,structuredClone(s)):
      {ok:false,changed:false,ledger:p.save.homeworld.bibleScenesV86??defaultBibleSceneLedgerV86(p.save.createdAt),message:'Cette halte ne peut pas être enregistrée.'};
    setBibleMessage(result.message);return result;
  },[]);
  const pause = useCallback(() => { freeze();
    if(bibleOpenRef.current){bibleAction({type:'interrupt'});return;}
    if (current.current?.status === 'walking' && !current.current.pendingFieldEvent) persist(current.current);
  }, [freeze, persist,bibleAction]);
  const resume = useCallback(() => {
    const s = current.current;
    if (document.hidden || !document.hasFocus() || !s || s.status !== 'walking' || !readyRef.current || latest.current.suspended || !canEnterHomeworldRegionV68(latest.current.save, s.regionId).allowed) return;
    if(bibleOpenRef.current){if(!bibleAction({type:'interrupt'}).ok)return;bibleOpenRef.current=false;}
    const acknowledged = s.pendingFieldEvent ? field(s) : persist(s) ? s : null;
    if (!acknowledged) return;
    clear(); noticeRef.current = ''; setNotice(''); setNoticeFromGuide(false); setLocalPanel(null); setNavigationError(''); pauseRef.current = false; setPaused(false); requestAnimationFrame(() => viewport.current?.focus({ preventScroll: true }));
  }, [clear, field, persist,bibleAction]);
  const leave = useCallback((s: HomeworldRegionStateV68) => {
    if (exiting.current || latest.current.suspended) return;
    exiting.current = true; freeze();
    let success: boolean | void = false;
    try { success = latest.current.onReachCity(structuredClone(s)); } catch { success = false; }
    if (success === false) { exiting.current = false; setError('Le retour à la cité n’a pas été enregistré. Ton arrivée est conservée ; réessaie.'); }
  }, [freeze]);
  const openAtlas = useCallback(() => {
    const s = current.current;
    if (!s || s.zone !== 'village' || s.status !== 'walking' || latest.current.suspended || !readyRef.current || s.pendingFieldEvent) return;
    freeze(); if (persist(s)) { noticeRef.current = ''; setNotice(''); setLocalPanel('atlas'); setNavigationError(''); }
  }, [freeze, persist]);
  const commitDeparture = useCallback((order: DepartureOrderO6) => {
    const live = current.current, host = latest.current;
    if (!live || host.suspended || pauseRef.current || !readyRef.current || !host.onTrainingYardO6 ||
        !legacyDepartureViewR2(host.save, live)?.actions.some(action => action.order === order && action.near)) return false;
    const stopped = { ...live, actor: { ...live.actor, vx: 0, vy: 0 } };
    clear();
    current.current = stopped;
    setState(stopped);
    setDepartureWriteFailed(!host.onTrainingYardO6(order, stopped));
    return true;
  }, [clear]);
  const openResidenceThreshold = useCallback(() => {
    const live = current.current;
    if (!live || live.status !== 'walking' || live.pendingFieldEvent || latest.current.suspended ||
        !readyRef.current || homeworldRegionInteractionV68(live)?.kind !== 'exit-interior') return;
    const houseId = houseForBuildingV149(live.regionId, live.buildingId)?.id;
    const residence = latest.current.save.residenceV149;
    if (!houseId || (residence?.activeResidenceId !== houseId && residence?.transfer?.toHouseId !== houseId)) return;
    freeze();
    if (persist(live)) { noticeRef.current = ''; setNotice(''); setLocalPanel('residence-threshold'); }
  }, [freeze, persist]);
  const chooseDestination = useCallback((id: string) => {
    const s = current.current;
    if (!s || s.zone !== 'village' || latest.current.suspended || !readyRef.current || !canEnterHomeworldRegionV68(latest.current.save, regionId).allowed || s.pendingFieldEvent) return;
    const destination = villageDestinationsV70(regionId).find(d => d.id === id), points = destination && villageGroundRouteV70(regionId, s.actor, destination);
    if (!points) { setNavigationError('Cette approche ne rejoint pas ta position actuelle. Reviens sur le chemin du village.'); return; }
    setNavigation({ id, points }); resume();
  }, [regionId, resume]);
  const openBible=useCallback(()=>{
    const s=current.current;
    if(!s||!bibleCulturalNearbyV86(s)||!latest.current.onBibleSceneAction||latest.current.suspended||!readyRef.current||s.pendingFieldEvent)return;
    // Freeze both input and physical velocity before taking a durable snapshot.
    freeze();const stopped={...s,actor:{...s.actor,vx:0,vy:0}};
    current.current=stopped;setState(stopped);
    if(persist(stopped)){bibleOpenRef.current=true;noticeRef.current='';setNotice('');setBibleMessage('');setLocalPanel('bible-v86');}
  },[freeze,persist]);
  useEffect(() => {
    const el = viewport.current; if (!el) return;
    const resize = new ResizeObserver(() => { const b = el.getBoundingClientRect(); if (b.width && b.height) setSize({ width: b.width, height: b.height }); });
    resize.observe(el); return () => resize.disconnect();
  }, []);
  useEffect(() => {
    readyRef.current = false;
    const urls = [...new Set([definition.panorama, youthWelcome ? HOMEWORLD_YOUTH_PLATE_V69.src : undefined, HOMEWORLD_GROUND_ART_V64.src, HOMEWORLD_INTERIOR_ART_V64.north.src, HOMEWORLD_PASSAGE_BRIDGE_V67.src, ...Object.values(HOMEWORLD_BUILDING_ART_V64).map(a => a.src), ...Object.values(HOMEWORLD_PROP_ART_V64).map(a => a.src), REGION_FAUNA_ART_V68[regionId]?.src, ...homeworldFaunaSourceUrlsV77(regionId), ...Array.from(scene.current?.querySelectorAll('img') ?? [], img => img.src)].filter((s): s is string => !!s))];
    const preload = preloadSceneImagesV94({ urls, reload: artAttempt > 0,
      validateDimensions: homeworldFaunaDimensionsV77,
      onProgress: progress => {
        readyRef.current = progress.ready;
        setReady(progress.ready); setArtError(progress.error ?? '');
      },
    });
    return () => { readyRef.current = false; preload.cancel(); };
  }, [definition.panorama, youthWelcome, regionId, artAttempt]);
  useEffect(() => {
    const blur = () => {setFocused(false);pause();}, focus=()=>setFocused(!document.hidden&&document.hasFocus()), hidden = () => { if (document.hidden) blur();else focus(); };
    focus();window.addEventListener('focus',focus);
    window.addEventListener('blur', blur); window.addEventListener('gamepaddisconnected', blur); document.addEventListener('visibilitychange', hidden);
    return () => { window.removeEventListener('focus',focus);window.removeEventListener('blur', blur); window.removeEventListener('gamepaddisconnected', blur); document.removeEventListener('visibilitychange', hidden); };
  }, [pause]);
  useEffect(() => { if (suspended) { clear(); pauseRef.current = true; const f = requestAnimationFrame(pause); return () => cancelAnimationFrame(f); } }, [suspended, pause, clear]);
  useEffect(() => {
    if (!modal || suspended) return;
    const dialog = panel.current; if (!dialog) return;
    const buttons = () => Array.from(dialog.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'));
    const initial = () => (buttons()[0] ?? dialog).focus(); initial();
    const contain = (e: FocusEvent) => { if (!latest.current.suspended && e.target instanceof Node && !dialog.contains(e.target)) initial(); };
    const tab = (e: KeyboardEvent) => { if (e.key !== 'Tab' || latest.current.suspended) return; e.preventDefault(); const targets = buttons(), index = targets.indexOf(document.activeElement as HTMLButtonElement); const nextIndex = index < 0 ? e.shiftKey ? targets.length - 1 : 0 : (index + (e.shiftKey ? -1 : 1) + targets.length) % targets.length; (targets[nextIndex] ?? dialog).focus(); };
    document.addEventListener('focusin', contain); document.addEventListener('keydown', tab);
    return () => { document.removeEventListener('focusin', contain); document.removeEventListener('keydown', tab); };
  }, [modal, suspended, ready, error, notice, localPanel]);
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (document.hidden || !document.hasFocus() || latest.current.suspended || e.target instanceof HTMLElement && e.target.closest('input,textarea,select,[contenteditable="true"]')) return;
      const b = latest.current.save.settings.controlBindings;
      if (matchesControlAction('hunt.pause', e, b)) { e.preventDefault(); if (!e.repeat) { if (pauseRef.current) resume(); else pause(); } return; }
      if (pauseRef.current || e.target instanceof HTMLElement && e.target.closest('button')) return;
      if (actions.some(a => matchesControlAction(a, e, b))) { e.preventDefault(); if (!e.repeat || held.current.has(e.code)) held.current.add(e.code); }
      if (matchesControlAction('hunt.interact', e, b)) { e.preventDefault(); if (!e.repeat) interact.current = true; }
    };
    const up = (e: KeyboardEvent) => held.current.delete(e.code);
    window.addEventListener('keydown', down); window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); clear(); };
  }, [pause, resume, clear]);
  useEffect(() => {
    let frame = 0, last = 0, accumulator = 0;
    const visitsAt = (checkpoint: HomeworldRegionStateV68) => latest.current.guestsV150?.(checkpoint) ?? [];
    const loop = (time: number) => {
      const delta = last ? Math.min(.05, (time - last) / 1000) : 0; last = time;
      const inactive = document.hidden || !document.hasFocus();
      if (inactive && !pauseRef.current) pause();
      const blocked = inactive || latest.current.suspended || !readyRef.current || !canEnterHomeworldRegionV68(latest.current.save, regionId).allowed;
      let controller: Gamepad | null = null;
      try { controller = navigator.getGamepads?.().find(p => p?.connected) ?? null; }
      catch { /* A controller error must not stop the region simulation. */ }
      const sample = stepHomeworldGamepad(gamepad.current, controller, blocked ? 'inactive' : pauseRef.current ? 'paused' : 'world'); gamepad.current = sample.state;
      if (sample.actions.pause) { if (pauseRef.current) resume(); else pause(); }
      if (blocked || pauseRef.current || !current.current) { accumulator = 0; interact.current = false; }
      else {
        // A gamepad edge belongs to one simulation step, not one render frame.
        // Queue it across sub-tick frames; catch-up steps consume it only once.
        if (sample.actions.confirm) interact.current = true;
        accumulator += delta;
        const active = (action: typeof actions[number]) => [...held.current].some(code => matchesControlAction(action, code, latest.current.save.settings.controlBindings));
        while (accumulator >= 1 / 60 && !pauseRef.current && current.current) {
          accumulator -= 1 / 60;
          const confirm = interact.current; interact.current = false;
          const before = current.current, interaction = confirm ? homeworldRegionInteractionV68(before, visitsAt(before)) : null;
          if ((confirm) && bibleCulturalNearbyV86(before) && latest.current.onBibleSceneAction) { openBible(); break; }
          if (confirm && latest.current.onTrainingYardO6) {
            const departure = legacyDepartureViewR2(latest.current.save, before);
            if (departure?.passing && interaction?.kind === 'exit-interior') break;
            const next = departure?.actions[0];
            if (next?.near && commitDeparture(next.order)) break;
          }
          if (confirm && before.zone === 'interior' && latest.current.onTrainingYardO6) {
            const { yard, continuation } = currentYard(latest.current.save, before);
            const practice = continuation?.practice?.next ? continuation.practice : null;
            const hall = soloReturnViewO6(latest.current.save, before, soloEvidenceRef.current)?.active;
            const active = hall ? { next: hall.order, near: hall.near, post: hall }
              : continuation?.next ? continuation : practice ?? yard;
            if (active?.near && active.next) {
              const stopped = { ...before, actor: { ...before.actor, vx: 0, vy: 0 } };
              clear();
              current.current = stopped;
              setState(stopped);
              const done = latest.current.onTrainingYardO6(active.next, stopped);
              setYardMessage(done ? (hall ?? continuation?.post ?? practice?.post)?.report ??
                (active.next === 'threshold' ? 'Le circuit d’exercice est prêt dans cette demeure.'
                  : 'Geste confirmé. Rejoins le repère suivant.')
                : 'Le geste attend une sauvegarde confirmée. Réessaie au même repère.');
              break;
            }
          }
          const activity = !interaction && before.zone === 'village' && (confirm) ? nearestVillageActivityV70(regionId, before.actor) : null;
          const villageResident = !interaction && !activity && before.zone === 'village' && (confirm) ? nearestHomeworldVillageResidentV69(regionId, before.tick, before.actor) : null;
          const next = stepHomeworldRegionV68(before, { x: Number(active('hunt.moveRight') || touch.current.has('right') || sample.movement.right) - Number(active('hunt.moveLeft') || touch.current.has('left') || sample.movement.left), y: Number(active('hunt.moveDown') || touch.current.has('down') || sample.movement.down) - Number(active('hunt.moveUp') || touch.current.has('up') || sample.movement.up), interact: !activity && !villageResident && confirm }, false, visitsAt);
          current.current = next;
          if (next.tick % 2 === 0 || next.zone !== before.zone || next.pendingFieldEvent) setState(next);
          if (next.pendingFieldEvent) { if (!field(next)) break; }
          if (next.status === 'at-city') { setState(next); leave(next); break; }
          if (next.zone !== before.zone) { setState(next); if (!persist(next)) break; }
          if (activity || interaction?.kind === 'service') {
            freeze(); if (persist(current.current ?? next)) { setLocalPanel(activity?.id ?? 'interior'); noticeRef.current = ''; setNotice(''); } break;
          }
          const text = interaction ? regionInteractionDialogueV68(current.current ?? next, interaction) : villageResident?.greeting ?? '';
          if (text && interaction?.kind !== 'fauna') { noticeRef.current = text; setNotice(text); setNoticeFromGuide(interaction?.kind === 'resident' && interaction.id === 'guide'); freeze(); if (!current.current?.pendingFieldEvent && current.current) persist(current.current); break; }
          if (next.tick % 180 === 0 && !persist(current.current ?? next)) break;
        }
      }
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop); return () => cancelAnimationFrame(frame);
  }, [regionId, freeze, field, leave, persist, pause, resume, openBible, clear, commitDeparture]);

  if (!state || state.regionId !== regionId) return <section className={styles.root}><div className={styles.dialog}><h2>Ce point de reprise ne correspond pas à cette route</h2><p>La sauvegarde est conservée. Reviens à la cité pour choisir ton trajet.</p><button onClick={() => props.onReachCity()}>Retour à la cité</button></div></section>;
  const d = HOMEWORLD_GEOMETRY_V64.depthScale, position = project(state.actor), zoom = Math.min(.98, Math.max(.6, size.height / 720));
  const world = state.zone === 'passage' ? { width: 18700, depth: 3300 } : state.zone === 'interior' ? HOMEWORLD_REGION_INTERIOR_V68 : HOMEWORLD_VILLAGE_WORLD_V68;
  const camera = { x: world.width * zoom < size.width ? -(size.width - world.width * zoom) / 2 : Math.max(0, Math.min(world.width * zoom - size.width, position.x * zoom - size.width / 2)), y: state.zone === 'interior' && world.depth * d * zoom < size.height - 240 ? -(size.height - world.depth * d * zoom) / 2 : Math.max(-180, Math.min(world.depth * d * zoom - size.height + 190, position.y * zoom - size.height * .66)) };
  const guests = props.guestsV150?.(state) ?? [];
  const interaction = homeworldRegionInteractionV68(state, guests), activity = !interaction && state.zone === 'village' ? nearestVillageActivityV70(regionId, state.actor) : null, villageResident = !interaction && !activity && state.zone === 'village' ? nearestHomeworldVillageResidentV69(regionId, state.tick, state.actor) : null, appearance = save.appearance;
  const bibleNearby=!!props.onBibleSceneAction&&bibleCulturalNearbyV86(state),b=BIBLE_CULTURAL_BINDING_V86;
  const bibleContext=bibleCulturalContextV86({save,ownerSaveCreatedAt:save.createdAt,region:state,sceneActive:localPanel==='bible-v86'&&ready&&!error,
    focused,suspended,host:regionId===b.regionId&&state.zone==='village'?{id:b.npcId,present:true,alive:true,conscious:true}:null,
    table:regionId===b.regionId&&state.zone==='village'?{id:b.tableId,...b.table}:null});
  const selectedActivity = HOMEWORLD_VILLAGE_ACTIVITIES_V70[regionId].find(a => a.id === localPanel), activityProgress = selectedActivity ? activitySession.progress[selectedActivity.id] ?? 0 : 0;
  const destination = navigation && villageDestinationsV70(regionId).find(d => d.id === navigation.id), routeProgress = navigation && state.zone === 'village' ? villageRouteRemainingV70(navigation.points, state.actor) : null;
  const serviceBuilding = definition.buildings.find(b => b.id === state.buildingId);
  const thresholdHouse = interaction?.kind === 'exit-interior' ? houseForBuildingV149(regionId, state.buildingId) : null;
  const residence = save.residenceV149;
  const residenceThreshold = !!thresholdHouse && (residence?.activeResidenceId === thresholdHouse.id ||
    residence?.transfer?.toHouseId === thresholdHouse.id);
  const carriesResidence = residence?.transfer?.stage === 'in-transit' &&
    residence.objects.some(object => object.location.kind === 'transfer');
  const { yard, continuation } = state.zone === 'interior' && props.onTrainingYardO6
    ? currentYard(save, state) : { yard: null, continuation: null };
  const practice = continuation?.practice;
  const departure = props.onTrainingYardO6 ? legacyDepartureViewR2(save, state) : null;
  const departureMain = departure?.actions[0];
  const departureAlternative = departure?.actions[1];
  const soloReturn = props.onTrainingYardO6 ? soloReturnViewO6(save, state, soloEvidence) : null;
  const yardAction = soloReturn?.active ? { near: true, post: soloReturn.active } :
    continuation?.next ? continuation : practice?.next ? practice : yard;
  const cordage = continuation?.orders.includes('stow') ? 'folded' : continuation?.orders.includes('lift') ? 'raised'
    : continuation?.orders.includes('anchor') ? 'taut' : continuation?.orders.includes('welcome') ? 'loose' : null;
  const localAllowed = !suspended && !error && ready && gate.allowed && state.status === 'walking' && !state.pendingFieldEvent;
  const playerPlacement = youthWelcome || hero.exactPreset ? homeworldPortraitPlacementV64(hero.plateId, hero.src, youthWelcome ? HOMEWORLD_YOUTH_PLATE_V69.physicalHeight : 100) : homeworldModularPlacementV64(save.appearance.bodyMorphId, appearance.headStyleId, 100);
  const hazard = regionHazardPhaseV68(state.tick), fauna = REGION_FAUNA_ART_V68[regionId], f = state.fauna;
  const interiorShell = state.zone === 'interior' ? homeworldInteriorShellV64({ buildingId: `v68-${regionId}-${state.buildingId}`, width: 710, depth: 650 }) : null;
  const bridge = HOMEWORLD_PASSAGE_BRIDGE_V67, bridgeScale = bridge.width / (bridge.deck.right - bridge.deck.left);
  const pointer = (move: Move, pressed: boolean, e: PointerEvent<HTMLButtonElement>) => { e.preventDefault(); if (pressed && !modal && !suspended) { e.currentTarget.setPointerCapture(e.pointerId); touch.current.add(move); } else touch.current.delete(move); };
  const drawActor = (id: string, x: number, y: number, morph: typeof save.appearance.bodyMorphId, dread: typeof save.appearance.dreadStyleId, moving = false, resident?: typeof definition.residents[number]) => {
    if (state.zone === 'village' && villagePaintOccludedV70(definition.buildings, { x, y }, state.actor, { actorHeight: youthWelcome ? 82 : 100 })) return null;
    const p = project({ x, y }), placement = homeworldModularPlacementV64(morph, 'reference', morph === 'young' ? 82 : 100);
    const modular=<HomeworldModularHunter morphId={morph} dreadStyleId={dread} style={placement ?? { width: 100, height: 100, top: -100 }} motionPhase={state.tick / 60} speed={moving ? 38 : 0} />;
    const original=<HomeworldNpcSpriteV84 npcId={id} regionId={regionId} height={morph === 'young' ? 82 : 100} moving={moving} preserveNativeMotion={moving||morph!=='classic'}>{modular}</HomeworldNpcSpriteV84>;
    return <span key={id} className={styles.actor} data-region-resident={id} style={{ left: p.x, top: p.y, zIndex: Math.round(y) }}><i className={styles.shadow} />{resident?<HomeworldRegionalWatchV86 query={{regionId,clanName:definition.clan,resident,moving}}>{original}</HomeworldRegionalWatchV86>:original}</span>;
  };
  return <section className={styles.root} data-homeworld-region-v68={regionId} data-zone={state.zone} data-interior-building={state.buildingId ?? undefined} data-state-tick={state.tick} style={{ '--region-accent': definition.accent, '--region-ground': definition.groundColor } as CSSProperties} inert={suspended}>
    <div className={styles.panorama} aria-hidden="true" style={{ backgroundImage: `url("${definition.panorama}")`, transform: `translateX(${-Math.min(90, state.actor.x / 210)}px)` }} />
    <header className={styles.header} inert={modal}><div><span>{clanLabel}</span><h1>{state.zone === 'passage' ? regionLabel : villageLabel}</h1>{state.zone === 'passage' && <small>{definition.routeTitle}</small>}</div><div>{state.zone === 'village' && <button data-village-open-atlas-v70 onClick={openAtlas}>Plan du village</button>}<button onClick={pause}>Pause</button>{props.onOpenSettings && <button onClick={props.onOpenSettings}>Réglages</button>}</div></header>
    <div className={styles.viewport} ref={viewport} tabIndex={0} aria-label={`Explorer ${regionLabel}`} inert={modal}>
      <div className={styles.world} ref={scene} style={{ width: world.width, height: world.depth * d + 700, transform: `translate(${-camera.x}px, ${-camera.y}px) scale(${zoom})` }}>
        <svg className={styles.floor} width={world.width} height={world.depth * d + 500} aria-hidden="true"><defs><pattern id={`stone-${regionId}`} width="220" height="220" patternUnits="userSpaceOnUse"><image href={HOMEWORLD_GROUND_ART_V64.src} width="220" height="220" /></pattern></defs><g transform={`scale(1 ${d})`}>
          {state.zone === 'passage' ? <polyline points={definition.route.map(p => `${p.x},${p.y}`).join(' ')} fill="none" stroke={`url(#stone-${regionId})`} strokeWidth="320" strokeLinejoin="round" strokeLinecap="round" /> : state.zone === 'village' ? <>
            <polygon points={HOMEWORLD_VILLAGE_PERIMETER_V68.map(p => `${p.x},${p.y}`).join(' ')} fill={definition.groundColor} stroke="#69675a" strokeWidth="12" />
            <polygon points={HOMEWORLD_VILLAGE_PERIMETER_V68.map(p => `${p.x},${p.y}`).join(' ')} fill={`url(#stone-${regionId})`} opacity=".5" />
            {definition.buildings.map(b => <rect key={b.id} x={b.x - b.width / 2 - 60} y={b.y - b.footprint.depth - 40} width={b.width + 120} height={b.footprint.depth + 170} rx="25" fill={`url(#stone-${regionId})`} stroke={definition.accent} strokeWidth="3" strokeOpacity=".3" />)}
            <ellipse cx="2010" cy="2050" rx="620" ry="440" fill={`url(#stone-${regionId})`} stroke={definition.accent} strokeOpacity=".5" strokeWidth="8" />
            <path d="M520 2800L1300 2800L1900 2140L2880 2100L3900 2300 M1800 500L1800 1450L1950 1880 M850 1820L3150 1820 M1900 2450L1900 3350" stroke={`url(#stone-${regionId})`} strokeWidth="175" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            <polyline points={HOMEWORLD_REGION_TRAIL_V68.map(p => `${p.x},${p.y}`).join(' ')} fill="none" stroke={`url(#stone-${regionId})`} strokeWidth="380" strokeLinejoin="round" />
            <polygon points={HOMEWORLD_REGION_FIELD_PERIMETER_V68.map(p => `${p.x},${p.y}`).join(' ')} fill={`url(#stone-${regionId})`} />
          </> : <rect x="25" y="35" width="710" height="650" rx="12" fill={`url(#stone-${regionId})`} />}
        </g></svg>
        {state.zone === 'village' && navigation && <svg className={styles.localRoute} width={world.width} height={world.depth * d} aria-hidden="true" data-village-route-v70={navigation.id}><g transform={`scale(1 ${d})`}><polyline points={navigation.points.map(p => `${p.x},${p.y}`).join(' ')} fill="none" stroke="#efd698" strokeWidth="9" strokeDasharray="24 24" />{destination && <ellipse cx={destination.x} cy={destination.y} rx="65" ry="65" fill="none" stroke="#efd698" strokeWidth="8" />}</g></svg>}
        {state.zone === 'passage' && <>
          <HomeworldFaunaDisplayV77 regionId={regionId} tick={state.tick} groundColor={definition.groundColor} />
          {regionBridgesV68(regionId).flatMap((b, n) => Array.from({ length: b.modules }, (_, i) => { const p = project({ x: b.x + i * bridge.width, y: b.y }); return <img key={`${n}-${i}`} className={styles.bridge} data-region-bridge={`${n}-${i}`} src={bridge.src} alt="" draggable={false} style={{ left: p.x - bridge.deck.left * bridgeScale, top: p.y - (bridge.deck.back + bridge.deck.front) / 2 * bridgeScale, width: bridge.sourceWidth * bridgeScale, height: bridge.sourceHeight * bridgeScale }} />; }))}
          {definition.route.map((p, n) => { const v = project(p); return <span key={n} className={styles.waypoint} style={{ left: v.x, top: v.y + 18 }}><b>{n === definition.route.length - 1 ? villageLabel : p.name}</b><small>{Math.round(n / (definition.route.length - 1) * homeworldRegionRouteMetresV68(regionId))} m</small></span>; })}
        </>}
        {state.zone === 'village' && <>
          {definition.buildings.map(b => { const placement = homeworldBuildingSpritePlacementV64(b); return <span key={b.id} data-region-building={b.id} className={styles.building} style={{ ...placement, zIndex: Math.round(b.y), opacity: villageFacadeFadedV70(b, state.actor, youthWelcome ? 82 : 100) ? .42 : 1 }}><img alt="" draggable={false} src={b.art.src} /><span>{b.label}</span></span>; })}
          {definition.props.filter(p => !villagePaintOccludedV70(definition.buildings, p, state.actor, { actorHeight: youthWelcome ? 82 : 100 })).map(p => { const ground = project(p); return <HomeworldNativePropV64 key={p.id} id={`${regionId}-${p.id}`} artId={p.artId} art={HOMEWORLD_PROP_ART_V64[p.artId]} x={ground.x} y={ground.y} depth={p.y} />; })}
          {definition.residents.filter(n => !guests.some(g => g.residentId === n.id)).map(n => { const p = regionResidentPositionV68(n, state.tick); return drawActor(n.id, p.x, p.y, n.morphId, n.dreadStyleId, n.route.length > 1, n); })}
          {guests.filter(g => !g.inside).map(g => { const n = definition.residents.find(r => r.id === g.residentId); return n ? <span key={`guest-${g.residentId}`} data-residence-guest-v150={g.residentId}>{drawActor(`guest-${n.id}`, g.x, g.y, n.morphId, n.dreadStyleId, g.moving, n)}</span> : null; })}
          {props.onBibleSceneAction&&<HomeworldBibleCultureHostV86 regionId={regionId} tick={state.tick} />}
          <HomeworldVillageLifeV69 regionId={regionId} tick={state.tick} actor={state.actor} actorHeight={youthWelcome ? 82 : 100} activityProgress={activitySession.progress} rect={{ left: camera.x / zoom, top: camera.y / zoom, right: (camera.x + size.width) / zoom, bottom: (camera.y + size.height) / zoom }} />
          {HOMEWORLD_REGION_TRACES_V68.map((p, n) => { const v = project(p); return <span key={p.id} className={`${styles.trace} ${state.traces.includes(p.id) ? styles.collected : ''}`} data-region-trace={p.id} style={{ left: v.x, top: v.y }}><i /><b>{p.label}</b><small>{definition.traceNotes[n]}</small></span>; })}
          {REGION_WARD_IDS_V68.includes(regionId) && REGION_WARD_POSTS_V68.map(p => { const v = project(p); return <span key={p.id} data-region-ward={p.id}><HomeworldNativePropV64 id={`${regionId}-${p.id}`} artId="beacon" art={HOMEWORLD_PROP_ART_V64.beacon} x={v.x} y={v.y} depth={p.y} /><b className={styles.waypoint} style={{ left: v.x, top: v.y + 8 }}>{state.protectedPosts.includes(p.id) ? 'Fixée' : 'À fixer'}</b></span>; })}
          <span className={styles.hazard} data-region-hazard={hazard} style={{ left: HOMEWORLD_REGION_HAZARD_V68.x - 340, top: (HOMEWORLD_REGION_HAZARD_V68.y - 340) * d, width: 680, height: 680 * d, opacity: hazard === 'calm' ? .14 : hazard === 'warning' ? .55 : .85 }}><span>{definition.hazard} · {hazard === 'warning' ? 'Écarte-toi' : hazard === 'active' ? 'Danger' : 'Accalmie'}</span></span>
          {fauna && f.phase !== 'retreated' && <span className={styles.fauna} data-region-fauna={f.phase} data-x={f.x} data-y={f.y} data-phase-ticks={f.ticks} data-evaded={f.evaded} data-touches={f.touches} style={{ left: f.x - 128, top: f.y * d - 185 - fauna.altitude, zIndex: Math.round(f.y), backgroundImage: `url("${fauna.src}")`, backgroundPosition: `${-(f.phase === 'warning' ? 3 : f.phase === 'charge' ? 1 + Math.floor(state.tick / 10) % 2 : 0) * 256}px 0`, transform: f.phase === 'charge' && regionId !== 'leviathan-coast' ? 'scaleX(-1)' : undefined }}><b style={{ transform: f.phase === 'charge' && regionId !== 'leviathan-coast' ? 'scaleX(-1)' : undefined }}>{fauna.name}</b></span>}
          {f.phase === 'warning' && <span className={styles.chargeLine} style={{ left: 6860, top: (f.targetY - 78) * d, width: 740, height: 156 * d }}>Axe de la charge</span>}
          <span className={styles.waypoint} style={{ left: 520, top: 2800 * d + 16 }}><b>Retour à la cité</b></span>
        </>}
        {state.zone === 'interior' && <>
          {interiorShell?.groups.map(group => <span key={group.side} className={styles.interiorPanels} data-region-interior-panels={group.side} style={{ ...group.clip, left: group.clip.left + 25, top: group.clip.top + 35 * d }}>{group.panels.map(panel => <HomeworldNativePropV64 key={panel.id} id={panel.id} artId={panel.artId} art={panel.art} x={panel.localPaintPivot.x} y={panel.localPaintPivot.y} depth={group.side === 'north' ? 0 : panel.groundPivot.y} />)}</span>)}
          {homeworldRegionInteriorPropsV68(state.buildingId).map(prop => { const p = project(prop); return <HomeworldNativePropV64 key={prop.id} id={prop.id} artId={prop.artId} art={HOMEWORLD_PROP_ART_V64[prop.artId]} x={p.x} y={p.y} depth={prop.y} />; })}
          {guests.filter(g => g.inside).map(g => { const n = definition.residents.find(r => r.id === g.residentId); return n ? <span key={`guest-${g.residentId}`} data-residence-guest-v150={g.residentId} data-guest-inside>{drawActor(`guest-${n.id}`, g.x, g.y, n.morphId, n.dreadStyleId, false, n)}</span> : null; })}
          {soloReturn && <>
            {soloReturn.support !== 'empty' && <span className={yardStyles.returnBlades} data-o6-return-blades={soloReturn.support}
              role="img" aria-label="Lames de la traque" style={{ left: 145, top: 390 * d, zIndex: 392 }}><i/><i/></span>}
            {soloReturn.kitStowed && <span className={yardStyles.returnWrap} data-o6-return-kit
              role="img" aria-label="Paquetage rangé" style={{ left: 630, top: 390 * d, zIndex: 391 }} />}
            {soloReturn.saar && <>
              {drawActor('origin-o6-saar', 380, 346, 'elder', 'elder')}
              <span className={styles.waypoint} data-o6-return-saar style={{ left: 380, top: 346 * d + 14 }}><b>Saar</b></span>
            </>}
            {soloReturn.options.map(post => <span key={post.order} className={styles.waypoint} data-o6-return-post={post.order}
              style={{ left: post.x, top: post.y * d }}><b>{post.label}</b></span>)}
          </>}
          {yard?.orders.includes('support') && <span className={yardStyles.support} aria-label="Appui d’exercice" role="img"
            data-o6-yard-support style={{ left: 145, top: 390 * d, zIndex: 391 }} />}
          {yard?.orders.includes('rack') && <span className={yardStyles.rack} aria-label="Râtelier d’exercice mural" role="img"
            data-o6-yard-rack data-o6-rack-open={continuation?.rackOpen || undefined}
            style={{ left: 630, top: 390 * d, zIndex: 389 }}><i/><i/><i/></span>}
          {cordage && <span className={yardStyles.cordage} data-o6-cordage={cordage} role="img"
            aria-label={cordage === 'folded' ? 'Filet rangé' : 'Filet d’exercice'}
            style={{ left: cordage === 'raised' ? 585 : 217, top: (cordage === 'raised' ? 381 : 479) * d, zIndex: 400 }} />}
          {continuation?.visitor && <>
            {drawActor('origin-o6-yena', continuation.visitor.x, continuation.visitor.y, 'huntress', 'huntress')}
            <span className={styles.waypoint} data-o6-yena-visit
              style={{ left: continuation.visitor.x, top: continuation.visitor.y * d + 14 }}><b>Yena</b></span>
          </>}
          {practice?.student && <>
            {drawActor('origin-o6-novice', practice.student.x, practice.student.y, 'young', 'classic', practice.walking)}
            <span className={styles.waypoint} data-o6-practice-novice data-student-x={Math.round(practice.student.x)}
              style={{ left: practice.student.x, top: practice.student.y * d + 14 }}><b>Novice</b></span>
            {practice.hasStaff && <span className={yardStyles.practiceStaff} data-o6-practice-staff
              role="img" aria-label="Bâton court"
              style={{ left: practice.student.x + 16, top: practice.student.y * d - 35, zIndex: Math.round(practice.student.y) + 1 }} />}
          </>}
          {practice?.post && <span className={styles.waypoint} data-o6-practice-post={practice.next}
            style={{ left: practice.post.x, top: practice.post.y * d }}><b>{practice.post.label}</b></span>}
          {continuation?.orders.includes('transmission') && <span className={styles.waypoint}
            data-o6-plan-transmission style={{ left: 613, top: 511 * d }}><b>Place du coffre</b></span>}
          {continuation?.post && <span className={styles.waypoint} data-o6-continuation-post={continuation.next}
            style={{ left: continuation.post.x, top: continuation.post.y * d }}><b>{continuation.post.label}</b></span>}
          {yard?.post && <span className={styles.waypoint} data-o6-yard-post={yard.next}
            style={{ left: yard.post.x, top: yard.post.y * d }}><b>{yard.post.label}</b></span>}
          <span className={styles.waypoint} style={{ left: 380, top: 620 * d }}><b>Sortie</b></span>
        </>}
        {departure?.student && <span data-o6-departure-actor data-moving={departure.walking}>
          {drawActor('origin-o6-departing-novice', departure.student.x, departure.student.y, 'young', 'classic', departure.walking)}
          <span className={styles.waypoint} style={{ left: departure.student.x, top: departure.student.y * d + 14 }}><b>Novice</b></span>
        </span>}
        {departure?.actions.map(post => <span key={post.order} data-o6-departure-post={post.order}
          data-x={post.x} data-y={post.y} className={styles.waypoint} style={{ left: post.x, top: post.y * d }}>
          <b>{post.order === 'departure-escort' ? 'Croisement' : post.order === 'departure-stay' ? 'Banc' : 'Départ du novice'}</b>
        </span>)}
        {carriesResidence && <span data-residence-cargo><HomeworldNativePropV64 id="residence-cargo" artId="chest"
          art={HOMEWORLD_PROP_ART_V64.chest} x={position.x - 62} y={position.y + 6} depth={state.actor.y + 1} /></span>}
        <span className={styles.actor} data-region-player data-youth-appearance={youthWelcome} data-x={state.actor.x} data-y={state.actor.y} style={{ left: position.x, top: position.y, zIndex: Math.round(state.actor.y) }}><i className={styles.shadow} />{(youthWelcome || hero.exactPreset) && playerPlacement ? <img src={hero.src} alt="" draggable={false} style={{ ...playerPlacement, position: 'absolute', transform: `scaleX(${state.actor.facing})` }} /> : <HomeworldModularHunter morphId={save.appearance.bodyMorphId} dreadStyleId={save.appearance.dreadStyleId} appearance={appearance} showArmor armorId={save.loadout.armorId} hasWristblades={save.loadout.weaponIds.includes("wristblades")} gauntletVariantId={props.gauntletVariantId} motionPhase={state.tick / 60} speed={Math.hypot(state.actor.vx, state.actor.vy)} style={{ ...(playerPlacement ?? { width: 100, height: 100, top: -100 }), position: 'absolute', transform: `scaleX(${state.actor.facing})` }} />}</span>
      </div>
    </div>
    <aside className={styles.objective} inert={modal}>
      <b>{narratives[0]?.instruction ?? regionObjectiveV68(state)}</b>
      {state.skiffArrivalW3S09 && <span data-w3-s09-arrival={state.skiffArrivalW3S09.runId}
        data-w3-s09-vessel={state.skiffArrivalW3S09.vessel} data-w3-s09-pilot={state.skiffArrivalW3S09.pilot}>
        Passeur du canyon volcanique · arrivée aux Grottes consignée.
      </span>}
      {regionId===b.regionId&&props.onBibleSceneAction&&state.zone==='village'&&<span>Halte des Crêtes : table de la place, après le relevé remis au guide.{bibleNearby?' Arrête-toi puis interagis.':''}</span>}
      {destination && routeProgress && <span data-village-route-instruction-v70>{destination.name} · {routeProgress.arrived ? 'Approche atteinte : interagir sur place' : routeProgress.offRoute ? 'Reviens aux repères tracés au sol' : `${routeProgress.metres} m à pied`}</span>}
      {soloReturn && <span data-o6-solo-return={soloReturn.final ?? soloReturn.options[0]?.order}
        data-o6-return-support={soloReturn.support} role="status">
        {soloReturn.account || yardMessage || (soloReturn.options.length === 2
          ? 'Raconte une victoire ou une limite de la traque.'
          : soloReturn.options[0]?.label)}
      </span>}
      {yard && <span data-o6-training-yard={yard.houseId} data-o6-yard-stage={yard.next ?? 'ready'} role="status">
        {yard.post ? yard.post.label : 'Circuit d’exercice prêt'}{!continuation && yardMessage && ' · ' + yardMessage}
      </span>}
      {continuation && <span data-o6-origin-continuation={continuation.houseId}
        data-o6-origin-stage={continuation.next ?? 'ready'} role="status">
        {continuation.next ? yardMessage || continuation.post?.label :
          continuation.rackOpen ? 'Râtelier ouvert' : 'Les trois préparations sont repérées.'}
      </span>}
      {practice && <span data-o6-practice-stage={practice.next ?? 'complete'} role="status">
        {(practice.next === 'listen-novice' ? practice.post?.label : yardMessage || practice.post?.label) ||
          'Le novice a terminé son essai.'}
      </span>}
      {departure && <span role="status" data-o6-departure={departure.stage}
        data-o6-departure-resolved={departure.resolved} data-o6-departure-success={departure.success}
        data-o6-departure-passing={departure.passing}>
        {departureWriteFailed ? 'Le geste attend une sauvegarde confirmée. Réessaie ici.' :
          departure.passing ? 'Le novice franchit le seuil.' : departure.line}
      </span>}
      {props.pathMissionV158 && <div style={{ pointerEvents: 'auto' }}>{props.pathMissionV158(!localAllowed)}</div>}
      <span>{state.zone === 'village' ? `${state.visitedBuildings.length}/12 lieux visités · ${state.greeted.length}/12 témoins rencontrés · ${definition.residents.length + HOMEWORLD_VILLAGE_LIFE_V69[regionId].residents.length} habitants` : state.zone === 'passage' ? `${Math.round(state.walked * .023)} m parcourus · ${state.routeVisited.length}/${definition.route.length} bornes` : serviceBuilding?.label}</span>
    </aside>
    <footer className={styles.controls} inert={modal}><div>{axes.map(([id, label]) => <button key={id} aria-label={`Marcher ${id}`} onPointerDown={e => pointer(id, true, e)} onPointerUp={e => pointer(id, false, e)} onPointerCancel={e => pointer(id, false, e)} onLostPointerCapture={() => touch.current.delete(id)}>{label}</button>)}</div><button disabled={(departure?.passing && interaction?.kind === 'exit-interior') ||
        (!departureMain?.near && !yardAction?.near && !bibleNearby && !interaction && !activity && !villageResident)} data-region-interact onPointerDown={e => { e.preventDefault(); interact.current = true; }}>
        {departureMain?.near ? departureMain.label : yardAction?.near && yardAction.post ? yardAction.post.label :
          bibleNearby ? 'Parler à l’hôte de la halte' : interaction?.label ?? (activity ? `Participer : ${activity.name}` : villageResident ? `Parler : ${villageResident.name}` : 'Approche un lieu ou un habitant')} <small>{controlActionShortcut('hunt.interact', save.settings.controlBindings)}</small></button>
      {departureAlternative?.near && <button type="button" data-o6-departure-alternative={departureAlternative.order}
        disabled={!localAllowed} onClick={() => commitDeparture(departureAlternative.order)}>{departureAlternative.label}</button>}
      {residenceThreshold && props.residenceV149 && <button type="button" data-residence-open-threshold
        disabled={!localAllowed} onClick={openResidenceThreshold}>Au seuil de la demeure</button>}
      <small>{controlActionShortcut('hunt.pause', save.settings.controlBindings)} · Pause</small></footer>
    {modal && <div className={styles.backdrop}><div className={`${styles.dialog} ${localPanel === 'atlas' ? styles.atlasDialog : ''}`} role="dialog" aria-modal="true" aria-labelledby="region-v68-title" tabIndex={-1} ref={panel}>
      <span>{regionLabel}</span><h2 id="region-v68-title">{error ? 'Reprise conservée' : localPanel === 'atlas' ? 'Chemins du village' : selectedActivity ? selectedActivity.name : localPanel === 'residence-threshold' ? 'Au seuil de la résidence' : localPanel === 'interior' ? serviceBuilding?.label : notice ? 'Paroles du clan' : !gate.allowed ? 'Départ accompagné requis' : state.status === 'at-city' ? 'La cité est devant toi' : state.zone === 'passage' ? definition.routeTitle : villageLabel}</h2>
      {error ? <p>{error}</p> : localPanel === 'bible-v86' ?
        <BibleSceneCulturalV86 ledger={save.homeworld.bibleScenesV86} context={bibleContext} onAction={bibleAction}
          message={bibleMessage} onClose={() => { bibleOpenRef.current = false; resume(); }}
          onOpenHaltEpilogue={props.onOpenHaltEpilogue ? () => {
            const live = current.current;
            if (!live || !props.onOpenHaltEpilogue?.(structuredClone(live))) {
              setBibleMessage("La position au refuge doit être confirmée avant de revoir le trajet.");
            }
          } : undefined} /> : localPanel === 'atlas' ? <HomeworldVillageAtlasV70 regionId={regionId} actor={state.actor} disabled={!localAllowed} onChoose={chooseDestination} /> : selectedActivity ? <div data-village-service-v70={selectedActivity.id} data-service-progress={activityProgress}>
        <p>{selectedActivity.description}</p><p className={styles.serviceInstruction}>{activityProgress >= 3 ? selectedActivity.completion : `${activityProgress + 1}/3 · ${selectedActivity.steps[activityProgress]}`}</p>
        {activityProgress < 3 && <div className={styles.serviceChoices}>{selectedActivity.choices.map((choice, i) => <button key={choice} data-village-activity-choice-v70={i} disabled={!localAllowed} onClick={() => setActivitySession(previous => stepVillageActivityV70(previous, current.current ?? state, selectedActivity.id, i, localAllowed))}>{choice}</button>)}</div>}
        {activityProgress < 3 && <p role="status">{activitySession.feedback[selectedActivity.id]}</p>}
        {activityProgress >= 3 && <button data-village-service-route-v70 disabled={!localAllowed} onClick={() => chooseDestination(selectedActivity.destinationId)}>Voir le chemin : {villageDestinationsV70(regionId).find(d => d.id === selectedActivity.destinationId)?.name}</button>}
        <small>Geste local pendant cette visite. Les relevés de terrain et les contrats se font séparément auprès du guide.</small>
      </div> : localPanel === 'residence-threshold' && state.buildingId ? props.residenceV149?.(state.buildingId, !localAllowed, true)
        : localPanel === 'interior' ? <div data-village-interior-service-v70={state.buildingId}>
        <p>{serviceBuilding?.role === 'forge' ? 'Les balises et les outils demeurent aux ateliers. Le poste de calibration extérieur permet de comparer les lectures avant une sortie.' : serviceBuilding?.role === 'clinic' ? 'La maison des soins protège les retours. Observe les avertissements du territoire et interromps une sortie lorsque sa lecture devient incertaine.' : serviceBuilding?.role === 'archive' ? 'Les récits gardent leurs auteurs. Une préparation au village ne vaut ni trophée, ni preuve de terrain ; le guide ne confirme que les relevés réellement remis.' : serviceBuilding?.role === 'hall' ? 'La maison commune rassemble les chemins du clan. Les demeures, les ateliers et les soins ont chacun leur approche ; le poste extérieur reste séparé des rues.' : 'Cette demeure reste celle de ses habitants. Les coffrets et les outils ne sont pas des prises à emporter.'}</p>
        <p><b>Danger du territoire : {definition.hazard}.</b> Les avertissements concernent le poste extérieur, pas les services civils.</p>
        {narratives.map(n => <p key={n.id}><b>{n.title}</b><br />{n.instruction}{n.confirmedReport && <><br />{n.confirmedReport}</>}</p>)}
        {serviceBuilding?.role === 'residence' && state.buildingId && props.residenceV149?.(state.buildingId, !localAllowed)}
        <p>Ressors par le seuil au sud, puis consulte le plan du village pour préparer ton chemin.</p>
      </div> : notice ? <><YautjaTranslationV67 text={notice} />{noticeFromGuide && narratives.map(n => <p key={n.id}>{n.instruction}{n.confirmedReport && <><br />{n.confirmedReport}</>}</p>)}</> : <p>{artError || (!gate.allowed ? gate.reason : !ready ? 'Les abords du territoire se dévoilent…' : state.zone === 'passage' ? `Suis les bornes jusqu’au village. La corniche mesure environ ${Math.round(homeworldRegionRouteMetresV68(regionId))} mètres ; tu peux revenir sur tes pas.` : definition.introduction)}</p>}
      {navigationError && <p role="alert">{navigationError}</p>}
      {!ready && artError && <button onClick={() => setArtAttempt(n => n + 1)}>Recharger le décor</button>}
      {gate.allowed && ready && state.status === 'walking' && (localPanel!=='bible-v86'||!!error) && <button data-region-resume onClick={resume}>{error ? 'Réessayer la sauvegarde' : notice || localPanel ? 'Poursuivre' : 'Reprendre la marche'}</button>}
      {state.status === 'at-city' && <button onClick={() => leave(state)}>Entrer dans la cité</button>}{props.onOpenSettings && <button onClick={props.onOpenSettings}>Réglages</button>}{!gate.allowed && <button onClick={() => props.onReachCity()}>Retour à la cité</button>}
    </div></div>}
  </section>;
}
