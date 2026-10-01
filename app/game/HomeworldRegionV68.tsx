'use client';
/* eslint-disable @next/next/no-img-element -- unmodified native ground, architectural modules and animation cells */
import { useCallback, useEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react';
import type { SaveGame } from './types';
import { HOMEWORLD_GEOMETRY_V64, homeworldProjectGroundV64, homeworldBuildingSpritePlacementV64 } from './systems/homeworldGeometryV64';
import { HOMEWORLD_BUILDING_ART_V64, HOMEWORLD_GROUND_ART_V64, HOMEWORLD_PROP_ART_V64, HOMEWORLD_INTERIOR_ART_V64 } from './systems/homeworldArtV64';
import { homeworldInteriorShellV64 } from './systems/homeworldInteriorShellV64';
import { HOMEWORLD_PASSAGE_BRIDGE_V67 } from './systems/homeworldPassageV67';
import { homeworldHeroPlate } from './systems/homeworldCity';
import { homeworldPortraitPlacementV64, homeworldModularPlacementV64 } from './systems/homeworldCharacterPlacementV64';
import { createHomeworldGamepadState, stepHomeworldGamepad } from './systems/homeworldInput';
import { matchesControlAction } from './systems/controlBindings';
import { controlActionShortcut } from './controlBindingLabels';
import { HOMEWORLD_REGIONS_V68, HOMEWORLD_REGION_TRAIL_V68, HOMEWORLD_REGION_TRACES_V68, HOMEWORLD_REGION_HAZARD_V68, HOMEWORLD_REGION_INTERIOR_V68, HOMEWORLD_VILLAGE_WORLD_V68, HOMEWORLD_VILLAGE_PERIMETER_V68, HOMEWORLD_REGION_FIELD_PERIMETER_V68, REGION_FAUNA_ART_V68, REGION_WARD_IDS_V68, REGION_WARD_POSTS_V68, canEnterHomeworldRegionV68, createHomeworldRegionV68, normalizeHomeworldRegionV68, acknowledgeHomeworldRegionEventV68, stepHomeworldRegionV68, homeworldRegionInteractionV68, regionInteractionDialogueV68, regionObjectiveV68, regionResidentPositionV68, regionBridgesV68, regionHazardPhaseV68, homeworldRegionRouteMetresV68, homeworldRegionInteriorPropsV68, type HomeworldRegionIdV68, type HomeworldRegionStateV68, type RegionFieldEventV68 } from './systems/homeworldRegionsV68';
import HomeworldNativePropV64 from './HomeworldNativePropV64';
import HomeworldModularHunter from './HomeworldModularHunter';
import YautjaTranslationV67 from './YautjaTranslationV67';
import styles from './HomeworldRegionV68.module.css';

export interface HomeworldRegionV68Props {
  save: SaveGame; regionId: HomeworldRegionIdV68; checkpoint?: unknown; startAtVillage?: boolean; suspended?: boolean;
  onCheckpoint(state: HomeworldRegionStateV68): boolean;
  /** Atomically acknowledge this exact field event and store its pending checkpoint. */
  onFieldEvent?(event: RegionFieldEventV68, state: HomeworldRegionStateV68): boolean;
  onReachCity(state?: HomeworldRegionStateV68): boolean | void;
  onOpenSettings?(): void;
}
const axes = [['left', '←'], ['up', '↑'], ['down', '↓'], ['right', '→']] as const;
type Move = typeof axes[number][0];
const actions = ['hunt.moveLeft', 'hunt.moveRight', 'hunt.moveUp', 'hunt.moveDown'] as const;
const project = homeworldProjectGroundV64;

export default function HomeworldRegionV68(props: HomeworldRegionV68Props) {
  const { regionId, save, suspended = false } = props, definition = HOMEWORLD_REGIONS_V68[regionId];
  const [state, setState] = useState(() => props.checkpoint == null ? createHomeworldRegionV68(regionId, `${regionId}-${Date.now()}`, props.startAtVillage) : normalizeHomeworldRegionV68(props.checkpoint));
  const current = useRef(state), latest = useRef(props), held = useRef(new Set<string>()), touch = useRef(new Set<Move>()), interact = useRef(false), gamepad = useRef(createHomeworldGamepadState());
  const [paused, setPaused] = useState(true), pauseRef = useRef(true), [ready, setReady] = useState(false), readyRef = useRef(false);
  const [notice, setNotice] = useState(''), noticeRef = useRef(''), [error, setError] = useState(''), [artError, setArtError] = useState(''), [artAttempt, setArtAttempt] = useState(0);
  const [size, setSize] = useState({ width: 1200, height: 720 });
  const viewport = useRef<HTMLDivElement>(null), scene = useRef<HTMLDivElement>(null), panel = useRef<HTMLDivElement>(null), exiting = useRef(false);
  const gate = canEnterHomeworldRegionV68(save, regionId), modal = paused || !ready || !!notice || !!error || !gate.allowed || state?.status === 'at-city';
  useEffect(() => { latest.current = props; }, [props]);
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
  const pause = useCallback(() => { freeze(); if (current.current?.status === 'walking' && !current.current.pendingFieldEvent) persist(current.current); }, [freeze, persist]);
  const resume = useCallback(() => {
    const s = current.current;
    if (!s || s.status !== 'walking' || !readyRef.current || latest.current.suspended || !canEnterHomeworldRegionV68(latest.current.save, s.regionId).allowed) return;
    const acknowledged = s.pendingFieldEvent ? field(s) : persist(s) ? s : null;
    if (!acknowledged) return;
    clear(); noticeRef.current = ''; setNotice(''); pauseRef.current = false; setPaused(false); requestAnimationFrame(() => viewport.current?.focus({ preventScroll: true }));
  }, [clear, field, persist]);
  const leave = useCallback((s: HomeworldRegionStateV68) => {
    if (exiting.current || latest.current.suspended) return;
    exiting.current = true; freeze();
    let success: boolean | void = false;
    try { success = latest.current.onReachCity(structuredClone(s)); } catch { success = false; }
    if (success === false) { exiting.current = false; setError('Le retour à la cité n’a pas été enregistré. Ton arrivée est conservée ; réessaie.'); }
  }, [freeze]);
  useEffect(() => {
    const el = viewport.current; if (!el) return;
    const resize = new ResizeObserver(() => { const b = el.getBoundingClientRect(); if (b.width && b.height) setSize({ width: b.width, height: b.height }); });
    resize.observe(el); return () => resize.disconnect();
  }, []);
  useEffect(() => {
    let cancelled = false; readyRef.current = false;
    const urls = [...new Set([definition.panorama, HOMEWORLD_GROUND_ART_V64.src, HOMEWORLD_INTERIOR_ART_V64.north.src, HOMEWORLD_PASSAGE_BRIDGE_V67.src, ...Object.values(HOMEWORLD_BUILDING_ART_V64).map(a => a.src), ...Object.values(HOMEWORLD_PROP_ART_V64).map(a => a.src), REGION_FAUNA_ART_V68[regionId]?.src, ...Array.from(scene.current?.querySelectorAll('img') ?? [], img => img.src)].filter((s): s is string => !!s))];
    Promise.all(urls.map(src => new Promise<void>((resolve, reject) => { const img = new Image(); img.onload = () => img.naturalWidth ? resolve() : reject(new Error(src)); img.onerror = () => reject(new Error(src)); img.src = src; }))).then(() => { if (!cancelled) { readyRef.current = true; setReady(true); setArtError(''); } }).catch(() => { if (!cancelled) { setArtError('Un décor ne s’est pas chargé. La traversée reste en pause.'); setReady(false); } });
    return () => { cancelled = true; };
  }, [definition.panorama, regionId, artAttempt]);
  useEffect(() => {
    const blur = () => pause(), hidden = () => { if (document.hidden) pause(); };
    window.addEventListener('blur', blur); window.addEventListener('gamepaddisconnected', blur); document.addEventListener('visibilitychange', hidden);
    return () => { window.removeEventListener('blur', blur); window.removeEventListener('gamepaddisconnected', blur); document.removeEventListener('visibilitychange', hidden); };
  }, [pause]);
  useEffect(() => { if (suspended) { clear(); pauseRef.current = true; const f = requestAnimationFrame(pause); return () => cancelAnimationFrame(f); } }, [suspended, pause, clear]);
  useEffect(() => {
    if (!modal || suspended) return;
    const dialog = panel.current; if (!dialog) return;
    const buttons = () => Array.from(dialog.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'));
    const initial = () => (buttons()[0] ?? dialog).focus(); initial();
    const contain = (e: FocusEvent) => { if (!latest.current.suspended && e.target instanceof Node && !dialog.contains(e.target)) initial(); };
    const tab = (e: KeyboardEvent) => { if (e.key !== 'Tab' || latest.current.suspended) return; e.preventDefault(); const targets = buttons(), index = targets.indexOf(document.activeElement as HTMLButtonElement); (targets[(index + (e.shiftKey ? -1 : 1) + targets.length) % targets.length] ?? dialog).focus(); };
    document.addEventListener('focusin', contain); document.addEventListener('keydown', tab);
    return () => { document.removeEventListener('focusin', contain); document.removeEventListener('keydown', tab); };
  }, [modal, suspended, ready, error, notice]);
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (latest.current.suspended || e.target instanceof HTMLElement && e.target.closest('input,textarea,select,[contenteditable="true"]')) return;
      const b = latest.current.save.settings.controlBindings;
      if (matchesControlAction('hunt.pause', e, b)) { e.preventDefault(); if (!e.repeat) { if (pauseRef.current) resume(); else pause(); } return; }
      if (pauseRef.current || e.target instanceof HTMLElement && e.target.closest('button')) return;
      if (actions.some(a => matchesControlAction(a, e, b))) { e.preventDefault(); held.current.add(e.code); }
      if (matchesControlAction('hunt.interact', e, b)) { e.preventDefault(); if (!e.repeat) interact.current = true; }
    };
    const up = (e: KeyboardEvent) => held.current.delete(e.code);
    window.addEventListener('keydown', down); window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); clear(); };
  }, [pause, resume, clear]);
  useEffect(() => {
    let frame = 0, last = 0, accumulator = 0;
    const loop = (time: number) => {
      const delta = last ? Math.min(.05, (time - last) / 1000) : 0; last = time;
      const blocked = latest.current.suspended || !readyRef.current || !canEnterHomeworldRegionV68(latest.current.save, regionId).allowed;
      const controller = navigator.getGamepads?.().find(p => p?.connected) ?? null;
      const sample = stepHomeworldGamepad(gamepad.current, controller, blocked ? 'inactive' : pauseRef.current ? 'paused' : 'world'); gamepad.current = sample.state;
      if (sample.actions.pause) { if (pauseRef.current) resume(); else pause(); }
      if (blocked || pauseRef.current || !current.current) accumulator = 0;
      else {
        accumulator += delta;
        const active = (action: typeof actions[number]) => [...held.current].some(code => matchesControlAction(action, code, latest.current.save.settings.controlBindings));
        while (accumulator >= 1 / 60 && !pauseRef.current && current.current) {
          accumulator -= 1 / 60;
          const before = current.current, interaction = interact.current || sample.actions.confirm ? homeworldRegionInteractionV68(before) : null;
          const next = stepHomeworldRegionV68(before, { x: Number(active('hunt.moveRight') || touch.current.has('right') || sample.movement.right) - Number(active('hunt.moveLeft') || touch.current.has('left') || sample.movement.left), y: Number(active('hunt.moveDown') || touch.current.has('down') || sample.movement.down) - Number(active('hunt.moveUp') || touch.current.has('up') || sample.movement.up), interact: interact.current || sample.actions.confirm });
          interact.current = false; current.current = next;
          if (next.tick % 2 === 0 || next.zone !== before.zone || next.pendingFieldEvent) setState(next);
          if (next.pendingFieldEvent) { if (!field(next)) break; }
          if (next.status === 'at-city') { setState(next); leave(next); break; }
          if (next.zone !== before.zone) { setState(next); if (!persist(next)) break; }
          const text = interaction ? regionInteractionDialogueV68(current.current ?? next, interaction) : '';
          if (text && interaction?.kind !== 'fauna') { noticeRef.current = text; setNotice(text); freeze(); if (!current.current?.pendingFieldEvent && current.current) persist(current.current); break; }
          if (next.tick % 180 === 0 && !persist(current.current ?? next)) break;
        }
      }
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop); return () => cancelAnimationFrame(frame);
  }, [regionId, freeze, field, leave, persist, pause, resume]);

  if (!state || state.regionId !== regionId) return <section className={styles.root}><div className={styles.dialog}><h2>Ce point de reprise ne correspond pas à cette route</h2><p>La sauvegarde est conservée. Reviens à la cité pour choisir ton trajet.</p><button onClick={() => props.onReachCity()}>Retour à la cité</button></div></section>;
  const d = HOMEWORLD_GEOMETRY_V64.depthScale, position = project(state.actor), zoom = Math.min(.98, Math.max(.6, size.height / 720));
  const world = state.zone === 'passage' ? { width: 18700, depth: 3300 } : state.zone === 'interior' ? HOMEWORLD_REGION_INTERIOR_V68 : HOMEWORLD_VILLAGE_WORLD_V68;
  const camera = { x: world.width * zoom < size.width ? -(size.width - world.width * zoom) / 2 : Math.max(0, Math.min(world.width * zoom - size.width, position.x * zoom - size.width / 2)), y: state.zone === 'interior' && world.depth * d * zoom < size.height - 240 ? -(size.height - world.depth * d * zoom) / 2 : Math.max(-180, Math.min(world.depth * d * zoom - size.height + 190, position.y * zoom - size.height * .66)) };
  const interaction = homeworldRegionInteractionV68(state), hero = homeworldHeroPlate(save.appearance.presetId), appearance = save.appearance;
  const playerPlacement = hero.exactPreset ? homeworldPortraitPlacementV64(hero.plateId, hero.src, 100) : homeworldModularPlacementV64(save.appearance.bodyMorphId, appearance.headStyleId, 100);
  const hazard = regionHazardPhaseV68(state.tick), fauna = REGION_FAUNA_ART_V68[regionId], f = state.fauna;
  const interiorShell = state.zone === 'interior' ? homeworldInteriorShellV64({ buildingId: `v68-${regionId}-${state.buildingId}`, width: 710, depth: 650 }) : null;
  const bridge = HOMEWORLD_PASSAGE_BRIDGE_V67, bridgeScale = bridge.width / (bridge.deck.right - bridge.deck.left);
  const pointer = (move: Move, pressed: boolean, e: PointerEvent<HTMLButtonElement>) => { e.preventDefault(); if (pressed && !modal && !suspended) { e.currentTarget.setPointerCapture(e.pointerId); touch.current.add(move); } else touch.current.delete(move); };
  const drawActor = (id: string, x: number, y: number, morph: typeof save.appearance.bodyMorphId, dread: typeof save.appearance.dreadStyleId, moving = false) => {
    const p = project({ x, y }), placement = homeworldModularPlacementV64(morph, 'reference', morph === 'young' ? 82 : 100);
    return <span key={id} className={styles.actor} data-region-resident={id} style={{ left: p.x, top: p.y, zIndex: Math.round(y) }}><i className={styles.shadow} /><HomeworldModularHunter morphId={morph} dreadStyleId={dread} style={placement ?? { width: 100, height: 100, top: -100 }} motionPhase={state.tick / 60} speed={moving ? 38 : 0} /></span>;
  };
  return <section className={styles.root} data-homeworld-region-v68={regionId} data-zone={state.zone} data-interior-building={state.buildingId ?? undefined} data-state-tick={state.tick} style={{ '--region-accent': definition.accent, '--region-ground': definition.groundColor } as CSSProperties} inert={suspended}>
    <div className={styles.panorama} aria-hidden="true" style={{ backgroundImage: `url("${definition.panorama}")`, transform: `translateX(${-Math.min(90, state.actor.x / 210)}px)` }} />
    <header className={styles.header} inert={modal}><div><span>{definition.clan}</span><h1>{state.zone === 'passage' ? definition.routeTitle : definition.village}</h1></div><div><button onClick={pause}>Pause</button>{props.onOpenSettings && <button onClick={props.onOpenSettings}>Réglages</button>}</div></header>
    <div className={styles.viewport} ref={viewport} tabIndex={0} aria-label={`Explorer ${definition.name}`} inert={modal}>
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
        {state.zone === 'passage' && <>
          {regionBridgesV68(regionId).flatMap((b, n) => Array.from({ length: b.modules }, (_, i) => { const p = project({ x: b.x + i * bridge.width, y: b.y }); return <img key={`${n}-${i}`} className={styles.bridge} data-region-bridge={`${n}-${i}`} src={bridge.src} alt="" draggable={false} style={{ left: p.x - bridge.deck.left * bridgeScale, top: p.y - (bridge.deck.back + bridge.deck.front) / 2 * bridgeScale, width: bridge.sourceWidth * bridgeScale, height: bridge.sourceHeight * bridgeScale }} />; }))}
          {definition.route.map((p, n) => { const v = project(p); return <span key={n} className={styles.waypoint} style={{ left: v.x, top: v.y + 18 }}><b>{n === definition.route.length - 1 ? definition.village : p.name}</b><small>{Math.round(n / (definition.route.length - 1) * homeworldRegionRouteMetresV68(regionId))} m</small></span>; })}
        </>}
        {state.zone === 'village' && <>
          {definition.buildings.map(b => { const placement = homeworldBuildingSpritePlacementV64(b); return <span key={b.id} data-region-building={b.id} className={styles.building} style={{ ...placement, zIndex: Math.round(b.y), opacity: state.actor.y < b.y && Math.abs(state.actor.x - b.x) < b.width / 2 + 70 ? .42 : 1 }}><img alt="" draggable={false} src={b.art.src} /><span>{b.label}</span></span>; })}
          {definition.props.map(p => { const ground = project(p); return <HomeworldNativePropV64 key={p.id} id={`${regionId}-${p.id}`} artId={p.artId} art={HOMEWORLD_PROP_ART_V64[p.artId]} x={ground.x} y={ground.y} depth={p.y} />; })}
          {definition.residents.map(n => { const p = regionResidentPositionV68(n, state.tick); return drawActor(n.id, p.x, p.y, n.morphId, n.dreadStyleId, n.route.length > 1); })}
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
          <span className={styles.waypoint} style={{ left: 380, top: 620 * d }}><b>Sortie</b></span>
        </>}
        <span className={styles.actor} data-region-player data-x={state.actor.x} data-y={state.actor.y} style={{ left: position.x, top: position.y, zIndex: Math.round(state.actor.y) }}><i className={styles.shadow} />{hero.exactPreset && playerPlacement ? <img src={hero.src} alt="" draggable={false} style={{ ...playerPlacement, position: 'absolute', transform: `scaleX(${state.actor.facing})` }} /> : <HomeworldModularHunter morphId={save.appearance.bodyMorphId} dreadStyleId={save.appearance.dreadStyleId} appearance={appearance} motionPhase={state.tick / 60} speed={Math.hypot(state.actor.vx, state.actor.vy)} style={{ ...(playerPlacement ?? { width: 100, height: 100, top: -100 }), position: 'absolute', transform: `scaleX(${state.actor.facing})` }} />}</span>
      </div>
    </div>
    <aside className={styles.objective} inert={modal}><b>{regionObjectiveV68(state)}</b><span>{state.zone === 'village' ? `${state.visitedBuildings.length}/12 lieux visités · ${state.greeted.length}/12 habitants rencontrés` : state.zone === 'passage' ? `${Math.round(state.walked * .023)} m parcourus · ${state.routeVisited.length}/${definition.route.length} bornes` : definition.buildings.find(b => b.id === state.buildingId)?.label}</span></aside>
    <footer className={styles.controls} inert={modal}><div>{axes.map(([id, label]) => <button key={id} aria-label={`Marcher ${id}`} onPointerDown={e => pointer(id, true, e)} onPointerUp={e => pointer(id, false, e)} onPointerCancel={e => pointer(id, false, e)} onLostPointerCapture={() => touch.current.delete(id)}>{label}</button>)}</div><button disabled={!interaction} data-region-interact onPointerDown={e => { e.preventDefault(); interact.current = true; }}>{interaction?.label ?? 'Approche un lieu ou un habitant'} <small>{controlActionShortcut('hunt.interact', save.settings.controlBindings)}</small></button><small>{controlActionShortcut('hunt.pause', save.settings.controlBindings)} · Pause</small></footer>
    {modal && <div className={styles.backdrop}><div className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="region-v68-title" tabIndex={-1} ref={panel}><span>{definition.name}</span><h2 id="region-v68-title">{error ? 'Reprise conservée' : notice ? 'Paroles du clan' : !gate.allowed ? 'Départ accompagné requis' : state.status === 'at-city' ? 'La cité est devant toi' : state.zone === 'passage' ? definition.routeTitle : definition.village}</h2>{notice ? <YautjaTranslationV67 text={notice} /> : <p>{error || artError || (!gate.allowed ? gate.reason : !ready ? 'Les abords du territoire se dévoilent…' : state.zone === 'passage' ? `Suis les bornes jusqu’au village. La corniche mesure environ ${Math.round(homeworldRegionRouteMetresV68(regionId))} mètres ; tu peux revenir sur tes pas.` : definition.introduction)}</p>}{!ready && artError && <button onClick={() => setArtAttempt(n => n + 1)}>Recharger le décor</button>}{gate.allowed && ready && state.status === 'walking' && <button data-region-resume onClick={resume}>{error ? 'Réessayer la sauvegarde' : notice ? 'Poursuivre' : 'Reprendre la marche'}</button>}{state.status === 'at-city' && <button onClick={() => leave(state)}>Entrer dans la cité</button>}{props.onOpenSettings && <button onClick={props.onOpenSettings}>Réglages</button>}{!gate.allowed && <button onClick={() => props.onReachCity()}>Retour à la cité</button>}</div></div>}
  </section>;
}
