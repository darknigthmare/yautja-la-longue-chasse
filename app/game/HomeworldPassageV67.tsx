"use client";
/* eslint-disable @next/next/no-img-element -- unmodified native landscape, bridge and character artwork */
import { useCallback, useEffect, useRef, useState, type PointerEvent } from 'react';
import type { SaveGame } from './types';
import type { HomeworldPlayableRegionId } from './systems/homeworld';
import { homeworldHeroPlate } from './systems/homeworldCity';
import { HOMEWORLD_GEOMETRY_V64, homeworldProjectGroundV64 } from './systems/homeworldGeometryV64';
import { HOMEWORLD_GROUND_ART_V64, HOMEWORLD_PROP_ART_V64 } from './systems/homeworldArtV64';
import { homeworldModularPlacementV64, homeworldPortraitPlacementV64 } from './systems/homeworldCharacterPlacementV64';
import { createHomeworldGamepadState, stepHomeworldGamepad } from './systems/homeworldInput';
import { matchesControlAction } from './systems/controlBindings';
import { controlActionShortcut } from './controlBindingLabels';
import { HOMEWORLD_PASSAGES_V67, HOMEWORLD_PASSAGE_BRIDGE_V67, canEnterHomeworldPassageV67, createHomeworldPassageV67, normalizeHomeworldPassageV67, stepHomeworldPassageV67, homeworldPassageInteractionV67, homeworldPassageLengthV67, homeworldPassageMetresV67, homeworldPassagePropsV67, type HomeworldPassageDirectionV67, type HomeworldPassageStateV67 } from './systems/homeworldPassageV67';
import HomeworldModularHunter from './HomeworldModularHunter';
import HomeworldNativePropV64 from './HomeworldNativePropV64';
import styles from './HomeworldPassageV67.module.css';

export interface HomeworldPassageV67Props {
  save: SaveGame; regionId: HomeworldPlayableRegionId; checkpoint?: unknown;
  direction?: HomeworldPassageDirectionV67; suspended?: boolean;
  onCheckpoint(state: HomeworldPassageStateV67): boolean;
  onReachBiome(regionId: HomeworldPlayableRegionId): boolean | void;
  onReachCity(): boolean | void;
  onOpenSettings?(): void;
}
const labels = [['left', '←'], ['up', '↑'], ['down', '↓'], ['right', '→']] as const;
type Movement = typeof labels[number][0];
const movementActions = ['hunt.moveLeft', 'hunt.moveRight', 'hunt.moveUp', 'hunt.moveDown'] as const;

/** Continuous local space, genuine walking and safe screen handoff. It never writes storage itself. */
export default function HomeworldPassageV67(props: HomeworldPassageV67Props) {
  const { save, regionId, suspended = false } = props, definition = HOMEWORLD_PASSAGES_V67[regionId];
  const [state, setState] = useState(() => props.checkpoint == null ? createHomeworldPassageV67(regionId, props.direction) : normalizeHomeworldPassageV67(props.checkpoint));
  const stateRef = useRef(state), latest = useRef(props), held = useRef(new Set<string>());
  const touch = useRef(new Set<Movement>()), interact = useRef(false), pad = useRef(createHomeworldGamepadState());
  const [paused, setPaused] = useState(true), pausedRef = useRef(true);
  const [storageError, setStorageError] = useState(''), [artError, setArtError] = useState(''), [ready, setReady] = useState(false), readyRef = useRef(false);
  const [artAttempt, setArtAttempt] = useState(0), [codex, setCodex] = useState(false), codexRef = useRef(false);
  const [size, setSize] = useState({ width: 1200, height: 700 });
  const viewport = useRef<HTMLDivElement>(null), scene = useRef<HTMLDivElement>(null), panel = useRef<HTMLDivElement>(null), exiting = useRef(false);
  const bindings = save.settings.controlBindings, gate = canEnterHomeworldPassageV67(save, regionId);
  const modalOpen = Boolean(state && (paused || !ready || !gate.allowed || codex || state.status !== 'travelling'));
  useEffect(() => { latest.current = props; }, [props]);
  const clear = useCallback(() => { held.current.clear(); touch.current.clear(); interact.current = false; pad.current = createHomeworldGamepadState(); }, []);
  const persist = useCallback((next: HomeworldPassageStateV67) => {
    let saved = false;
    try { saved = latest.current.onCheckpoint(structuredClone(next)); } catch { saved = false; }
    if (!saved) { clear(); pausedRef.current = true; setPaused(true); setStorageError('Écriture impossible. Ta position reste conservée ici ; réessaie avant de quitter.'); }
    else setStorageError('');
    return saved;
  }, [clear]);
  const pause = useCallback(() => { clear(); pausedRef.current = true; setPaused(true); if (stateRef.current) persist(stateRef.current); }, [clear, persist]);
  const closeCodex = useCallback(() => { codexRef.current = false; setCodex(false); pause(); }, [pause]);
  const resume = useCallback(() => {
    const current = stateRef.current;
    if (!current || !readyRef.current || latest.current.suspended || !canEnterHomeworldPassageV67(latest.current.save, current.regionId).allowed || !persist(current)) return;
    clear(); pausedRef.current = false; setPaused(false); setCodex(false); codexRef.current = false;
    requestAnimationFrame(() => viewport.current?.focus({ preventScroll: true }));
  }, [clear, persist]);
  const leave = useCallback((current: HomeworldPassageStateV67) => {
    if (exiting.current || latest.current.suspended || !persist(current)) return;
    exiting.current = true; clear(); pausedRef.current = true; setPaused(true);
    let result: boolean | void = false;
    try { result = current.status === 'at-biome' ? latest.current.onReachBiome(current.regionId) : latest.current.onReachCity(); } catch { result = false; }
    if (result === false) { exiting.current = false; setStorageError('Le changement de zone a été refusé. Ta position et ton arrivée sont conservées ; réessaie.'); }
  }, [clear, persist]);
  useEffect(() => {
    const element = viewport.current; if (!element) return;
    const observer = new ResizeObserver(() => { const box = element.getBoundingClientRect(); if (box.width && box.height) setSize({ width: box.width, height: box.height }); });
    observer.observe(element); return () => observer.disconnect();
  }, []);
  useEffect(() => {
    let cancelled = false; readyRef.current = false;
    const urls = [...new Set([definition.panorama, HOMEWORLD_PASSAGE_BRIDGE_V67.src, HOMEWORLD_GROUND_ART_V64.src, HOMEWORLD_PROP_ART_V64.beacon.src, ...Array.from(scene.current?.querySelectorAll('img') ?? [], image => image.src)])];
    Promise.all(urls.map(src => new Promise<void>((resolve, reject) => { const image = new Image(); image.onload = () => image.naturalWidth > 0 ? resolve() : reject(new Error(src)); image.onerror = () => reject(new Error(src)); image.src = src; })))
      .then(() => { if (!cancelled) { readyRef.current = true; setReady(true); setArtError(''); } })
      .catch(() => { if (!cancelled) { setReady(false); setArtError('Une image native manque. Le trajet reste en pause : aucun décor de remplacement n’est inventé.'); } });
    return () => { cancelled = true; };
  }, [definition.panorama, artAttempt]);
  useEffect(() => {
    const blur = () => pause(); const hidden = () => { if (document.hidden) pause(); };
    window.addEventListener('blur', blur); window.addEventListener('gamepaddisconnected', blur); document.addEventListener('visibilitychange', hidden);
    return () => { window.removeEventListener('blur', blur); window.removeEventListener('gamepaddisconnected', blur); document.removeEventListener('visibilitychange', hidden); };
  }, [pause]);
  useEffect(() => { if (suspended) { clear(); pausedRef.current = true; const frame = requestAnimationFrame(pause); return () => cancelAnimationFrame(frame); } }, [suspended, clear, pause]);
  useEffect(() => {
    if (suspended) return;
    if (!modalOpen) { viewport.current?.focus({ preventScroll: true }); return; }
    const dialog = panel.current; if (!dialog) return;
    const targets = () => Array.from(dialog.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'));
    const focusFirst = () => (codex ? dialog : targets()[0] ?? dialog).focus();
    focusFirst();
    const containFocus = (event: FocusEvent) => { if (!latest.current.suspended && event.target instanceof Node && !dialog.contains(event.target)) focusFirst(); };
    const tab = (event: KeyboardEvent) => {
      if (event.key !== 'Tab' || latest.current.suspended) return;
      const buttons = targets(), index = buttons.indexOf(document.activeElement as HTMLButtonElement);
      event.preventDefault();
      const nextIndex = index < 0 ? event.shiftKey ? buttons.length - 1 : 0 : (index + (event.shiftKey ? -1 : 1) + buttons.length) % buttons.length;
      (buttons[nextIndex] ?? dialog).focus();
    };
    document.addEventListener('focusin', containFocus); document.addEventListener('keydown', tab);
    return () => { document.removeEventListener('focusin', containFocus); document.removeEventListener('keydown', tab); };
  }, [modalOpen, codex, suspended, ready]);
  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      const bindings = latest.current.save.settings.controlBindings;
      if (latest.current.suspended || event.target instanceof HTMLElement && event.target.closest('input,textarea,select,[contenteditable="true"]')) return;
      if (codexRef.current && (event.key === 'Escape' || matchesControlAction('hunt.pause', event, bindings))) { event.preventDefault(); if (!event.repeat) closeCodex(); return; }
      if (matchesControlAction('hunt.pause', event, bindings)) { event.preventDefault(); if (!event.repeat) { if (pausedRef.current && !codexRef.current) resume(); else pause(); } return; }
      if (event.target instanceof HTMLElement && event.target.closest('button') || pausedRef.current || codexRef.current) return;
      if (movementActions.some(action => matchesControlAction(action, event, bindings))) { event.preventDefault(); if (!event.repeat || held.current.has(event.code)) held.current.add(event.code); }
      if (matchesControlAction('hunt.interact', event, bindings)) { event.preventDefault(); if (!event.repeat) interact.current = true; }
    };
    const keyup = (event: KeyboardEvent) => { held.current.delete(event.code); };
    window.addEventListener('keydown', keydown); window.addEventListener('keyup', keyup);
    return () => { window.removeEventListener('keydown', keydown); window.removeEventListener('keyup', keyup); clear(); };
  }, [clear, closeCodex, pause, resume]);
  useEffect(() => {
    let frame = 0, last = 0, accumulator = 0, renderTick = 0;
    const loop = (time: number) => {
      const elapsed = last ? Math.min(.05, (time - last) / 1000) : 0; last = time;
      const blocked = latest.current.suspended || !readyRef.current || !canEnterHomeworldPassageV67(latest.current.save, regionId).allowed;
      const controller = navigator.getGamepads?.().find(p => p?.connected) ?? null;
      const sample = stepHomeworldGamepad(pad.current, controller, blocked ? 'inactive' : pausedRef.current || codexRef.current ? 'paused' : 'world'); pad.current = sample.state;
      if (sample.actions.pause) { if (pausedRef.current && !codexRef.current) resume(); else pause(); }
      if (blocked || pausedRef.current || codexRef.current || !stateRef.current) accumulator = 0;
      else {
        accumulator += elapsed;
        const active = (action: typeof movementActions[number]) => [...held.current].some(code => matchesControlAction(action, code, latest.current.save.settings.controlBindings));
        while (accumulator >= 1 / 60 && !pausedRef.current) {
          accumulator -= 1 / 60;
          const previous = stateRef.current!;
          const next = stepHomeworldPassageV67(previous, {
            x: Number(active('hunt.moveRight') || touch.current.has('right') || sample.movement.right) - Number(active('hunt.moveLeft') || touch.current.has('left') || sample.movement.left),
            y: Number(active('hunt.moveDown') || touch.current.has('down') || sample.movement.down) - Number(active('hunt.moveUp') || touch.current.has('up') || sample.movement.up),
            interact: interact.current || sample.actions.confirm,
          });
          interact.current = false; stateRef.current = next;
          if (++renderTick % 2 === 0 || next.status !== previous.status) setState(next);
          if (next.status !== 'travelling') { setState(next); leave(next); break; }
          if (next.tick % 180 === 0 && !persist(next)) { setState(next); break; }
        }
      }
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop); return () => cancelAnimationFrame(frame);
  }, [regionId, leave, pause, persist, resume]);

  if (!state || state.regionId !== regionId) return <section className={styles.root} data-homeworld-passage-v67={regionId}><div className={styles.blocked}><h2>Point de passage incompatible</h2><p>La sauvegarde est conservée. Ce format n’est pas remplacé par un nouveau départ.</p><button onClick={() => props.onReachCity()}>Revenir à la cité sans écraser ce point</button></div></section>;
  const actor = state.actor, position = homeworldProjectGroundV64(actor), zoom = Math.min(.96, Math.max(.58, size.height / 650));
  const cameraX = Math.max(0, Math.min(definition.world.width - size.width / zoom, actor.x - size.width / zoom * .42));
  const cameraY = position.y - size.height / zoom * .62;
  const hero = homeworldHeroPlate(save.appearance.presetId), modular = hero.status === 'custom-modular-body';
  const placement = modular ? homeworldModularPlacementV64(save.appearance.bodyMorphId, save.appearance.headStyleId) : homeworldPortraitPlacementV64(hero.plateId, hero.src);
  const b = HOMEWORLD_PASSAGE_BRIDGE_V67, bridgeScale = b.width / (b.deck.right - b.deck.left), depthScale = HOMEWORLD_GEOMETRY_V64.depthScale;
  const interaction = homeworldPassageInteractionV67(state), targetIndex = state.visited.at(-1)! + (state.direction === 'outbound' ? 1 : -1);
  const target = definition.nodes[targetIndex] ?? definition.nodes[state.visited.at(-1)!];
  const current = definition.nodes[state.visited.at(-1)!], total = homeworldPassageLengthV67(regionId), travelled = homeworldPassageMetresV67(state.walked);
  const points = definition.nodes.map(p => `${p.x},${p.y}`).join(' '), maskId = `passage-mask-${regionId}`, tileId = `passage-tile-${regionId}`;
  const wallMaskId = `passage-wall-mask-${regionId}`, wallTileId = `passage-wall-tile-${regionId}`, slabHeight = 270;
  const pointerDown = (event: PointerEvent<HTMLButtonElement>, movement: Movement) => { event.preventDefault(); if (pausedRef.current || !readyRef.current) return; event.currentTarget.setPointerCapture(event.pointerId); touch.current.add(movement); viewport.current?.focus({ preventScroll: true }); };
  const release = (movement: Movement) => touch.current.delete(movement);
  return <section className={styles.root} data-homeworld-passage-v67={regionId} data-passage-status={state.status} data-passage-paused={paused || suspended} data-passage-assets={ready} data-passage-x={Math.round(actor.x)} data-passage-y={Math.round(actor.y)} data-passage-tick={state.tick}>
    <header className={styles.header} inert={modalOpen || suspended}><div><small>HOMEWORLD · PASSAGE EXTÉRIEUR</small><h2>{definition.title}</h2></div><button onClick={() => { pause(); codexRef.current = true; setCodex(true); }}>Codex du passage</button><button onClick={paused ? resume : pause}>{paused ? 'Reprendre' : 'Pause'}</button></header>
    <div ref={viewport} className={styles.viewport} inert={modalOpen || suspended} tabIndex={0} role="group" aria-label={`Parcours 2.5D vers ${definition.destination}`} onPointerDown={event => { if (!(event.target instanceof HTMLElement && event.target.closest('button'))) viewport.current?.focus({ preventScroll: true }); }}>
      <img className={styles.panorama} src={definition.panorama} alt="" draggable={false} style={{ transform: `translateX(${-Math.min(80, cameraX / Math.max(1, definition.world.width - size.width / zoom) * 80)}px)` }} />
      <div ref={scene} className={styles.world} aria-hidden="true" style={{ width: definition.world.width, height: definition.world.depth * depthScale, transform: `translate(${-cameraX * zoom}px,${-cameraY * zoom}px) scale(${zoom})` }}>
        {/* Geometric basalt substructure reuses the native pavement material. It is not a newly generated facade bitmap. */}
        <svg className={styles.substructure} width={definition.world.width} height={definition.world.depth * depthScale + slabHeight + 160}>
          <defs><pattern id={wallTileId} width="210" height="210" patternUnits="userSpaceOnUse"><image href={HOMEWORLD_GROUND_ART_V64.src} width="210" height="210" /></pattern>
            <mask id={wallMaskId} maskUnits="userSpaceOnUse" x="0" y="0" width={definition.world.width} height={definition.world.depth * depthScale + slabHeight + 160}><rect width="100%" height="100%" fill="white" />{definition.bridges.map((bridge, index) => <rect key={index} x={bridge.x} y="0" width={bridge.modules * b.width} height="3000" fill="black" />)}</mask></defs>
          <g mask={`url(#${wallMaskId})`}>
            {definition.nodes.map((point, index) => <g key={`abutment-${index}`}><rect x={point.x - 150} y={point.y * depthScale} width="300" height={slabHeight} fill={`url(#${wallTileId})`} /><ellipse cx={point.x} cy={point.y * depthScale + slabHeight} rx="150" ry={150 * depthScale} fill={`url(#${wallTileId})`} /><rect x={point.x - 150} y={point.y * depthScale} width="300" height={slabHeight} fill="#090c0990" /><ellipse cx={point.x} cy={point.y * depthScale + slabHeight} rx="150" ry={150 * depthScale} fill="#090c0990" /></g>)}
            {definition.nodes.slice(1).map((point, index) => {
              const previous = definition.nodes[index], dx = point.x - previous.x, dy = point.y - previous.y, length = Math.hypot(dx, dy);
              const nx = -dy / length * 150, ny = dx / length * 150;
              const x1 = previous.x + nx, y1 = (previous.y + ny) * depthScale, x2 = point.x + nx, y2 = (point.y + ny) * depthScale;
              const face = `${x1},${y1} ${x2},${y2} ${x2},${y2 + slabHeight} ${x1},${y1 + slabHeight}`;
              return <g key={`face-${index}`}><polygon points={face} fill={`url(#${wallTileId})`} /><polygon points={face} fill="#14181288" /><path d={`M${x1} ${y1 + 12}L${x2} ${y2 + 12} M${x1} ${y1 + slabHeight}L${x2} ${y2 + slabHeight}`} fill="none" stroke="#a4936d66" strokeWidth="5" /></g>;
            })}
          </g>
        </svg>
        <svg className={styles.floor} width={definition.world.width} height={definition.world.depth} style={{ transform: `scaleY(${depthScale})` }}>
          <defs><pattern id={tileId} width="180" height="180" patternUnits="userSpaceOnUse"><image href={HOMEWORLD_GROUND_ART_V64.src} width="180" height="180" /></pattern>
            <mask id={maskId} maskUnits="userSpaceOnUse" x="0" y="0" width={definition.world.width} height={definition.world.depth}><rect width="100%" height="100%" fill="white" />{definition.bridges.map((bridge, index) => <rect key={index} x={bridge.x} y={bridge.y - 180} width={bridge.modules * b.width} height="360" fill="black" />)}</mask></defs>
          <g mask={`url(#${maskId})`}><polyline points={points} fill="none" stroke="#282722" strokeWidth="324" strokeLinejoin="round" strokeLinecap="round" /><polyline points={points} fill="none" stroke={`url(#${tileId})`} strokeWidth="300" strokeLinejoin="round" strokeLinecap="round" /></g>
        </svg>
        {definition.bridges.flatMap((bridge, i) => Array.from({ length: bridge.modules }, (_, n) => <img key={`${i}-${n}`} className={styles.bridge} data-passage-bridge={`${i}-${n}`} src={b.src} alt="" draggable={false} style={{ left: bridge.x + n * b.width - b.deck.left * bridgeScale, top: bridge.y * depthScale - (b.deck.back + b.deck.front) / 2 * bridgeScale, width: b.sourceWidth * bridgeScale, height: b.sourceHeight * bridgeScale }} />))}
        {homeworldPassagePropsV67(regionId).map(prop => <HomeworldNativePropV64 key={prop.id} id={`passage-${prop.id}`} artId="beacon" art={HOMEWORLD_PROP_ART_V64.beacon} x={prop.x} y={prop.y * depthScale} depth={prop.y} />)}
        {definition.nodes.map((point, index) => <span key={index} className={styles.landmark} style={{ left: point.x, top: (point.y - 240) * depthScale }}>{point.title}</span>)}
        <div className={styles.actor} data-passage-actor style={{ left: position.x, top: position.y, zIndex: Math.round(actor.y) }}>
          <span className={styles.shadow} /><span style={{ position: 'absolute', transform: `scaleX(${actor.facing})` }}>
            {modular ? <HomeworldModularHunter morphId={save.appearance.bodyMorphId} dreadStyleId={save.appearance.dreadStyleId} appearance={save.appearance} motionPhase={state.tick / 60} speed={Math.hypot(actor.vx, actor.vy)} style={{ position: 'absolute', ...(placement ?? { left: -36, top: -100, width: 72, height: 100 }) }} />
              : <img src={hero.src} alt="" draggable={false} style={{ position: 'absolute', ...(placement ?? { left: -36, top: -100, width: 72, height: 100 }) }} />}
          </span>
        </div>
      </div>
      <div className={styles.hud}><strong>{state.direction === 'outbound' ? `Vers ${definition.destination}` : 'Retour vers la cité'}</strong><span>{current.title} · {Math.round(travelled)} m parcourus</span><small>Prochain repère : {target.title} {target.x >= actor.x ? '→' : '←'}{Math.abs(target.y - actor.y) > 160 ? target.y > actor.y ? ' ↓' : ' ↑' : ''}</small></div>
      <div className={styles.prompt}>{interaction ? `${controlActionShortcut('hunt.interact', bindings)} · ${interaction === 'city' ? 'Rejoindre la cité' : `Entrer dans ${definition.destination}`}` : 'Suivre le chemin et les bornes · Aucun déplacement automatique'}</div>
    </div>
    <nav className={styles.controls} inert={modalOpen || suspended} aria-label="Commandes du passage">{labels.map(([movement, label]) => <button key={movement} data-passage-move={movement} aria-label={`Marcher ${movement === 'left' ? 'à gauche' : movement === 'right' ? 'à droite' : movement === 'up' ? 'vers le haut' : 'vers le bas'}`} onPointerDown={event => pointerDown(event, movement)} onPointerUp={() => release(movement)} onPointerCancel={() => release(movement)} onLostPointerCapture={() => release(movement)}>{label}</button>)}<button disabled={!interaction || paused || suspended} onClick={() => { interact.current = true; viewport.current?.focus({ preventScroll: true }); }}>Interagir</button><span>Marche {controlActionShortcut('hunt.moveLeft', bindings)} / {controlActionShortcut('hunt.moveRight', bindings)} · profondeur {controlActionShortcut('hunt.moveUp', bindings)} / {controlActionShortcut('hunt.moveDown', bindings)}</span></nav>
    {modalOpen && <div className={styles.overlay} inert={suspended}><div ref={panel} className={styles.panel} tabIndex={-1} role="dialog" aria-modal="true" aria-label={codex ? 'Codex du passage' : 'Passage en pause'}>
      <small>ROUTE ORIGINALE DU JEU · {Math.round(homeworldPassageMetresV67(total))} MÈTRES</small><h2>{codex ? 'Géographie et construction' : state.status === 'travelling' ? state.tick ? 'Marche suspendue' : definition.title : 'Seuil atteint'}</h2>
      {codex ? <><p>Deux chaussées raccordent physiquement la cité aux deux enquêtes déjà jouables. Elles ne représentent pas une carte canonique de Yautja Prime. Les huit autres régions prévues restent non livrées.</p><dl><dt>Perspective</dt><dd>Orthographique, angle de 35°. Le sol reçoit la projection ; les personnages et ouvrages gardent des proportions uniformes.</dd><dt>Échelle</dt><dd>Adulte : 100 unités = 2,3 m. Tablier : 1 200 unités de long par module, profondeur issue de ses pixels natifs. Les piles restent sous la marche.</dd><dt>Assemblage</dt><dd>Un panorama unique ; chaussée indépendante ; six modules de pont ; balises supportées par les accotements et personnage sur des plans séparés. Les coordonnées du codex suivent celles des collisions.</dd></dl><ol>{definition.nodes.map(n => <li key={n.title}><b>{n.title}</b> — {n.note}</li>)}</ol><p>Le personnage réutilise son dessin natif ou sa composition modulaire. Aucune animation complète inédite n’est revendiquée.</p></>
        : <p>{state.status === 'travelling' ? `${current.note} Le trajet se parcourt au clavier, à la manette ou au tactile. La pause conserve ta position ; elle ne te téléporte pas.` : 'L’arrivée physique est enregistrée avant de changer de zone. Ce passage ne termine aucune mission et ne confère aucune récompense.'}</p>}
      {!gate.allowed && <p role="alert">{gate.reason}</p>}{artError && <p role="alert">{artError}</p>}{storageError && <p role="alert">{storageError}</p>}{!ready && !artError && <p>Chargement des images natives…</p>}
      <div className={styles.actions}>{artError ? <button onClick={() => setArtAttempt(n => n + 1)}>Réessayer les images</button> : state.status === 'travelling' ? <button disabled={!ready || !gate.allowed || suspended} onClick={resume}>{storageError ? 'Réessayer la sauvegarde et reprendre' : state.tick ? 'Reprendre la marche' : 'Commencer la marche'}</button> : <button disabled={suspended} onClick={() => leave(stateRef.current!)}>Réessayer le passage</button>}
        {props.onOpenSettings && <button onClick={() => { pause(); if (stateRef.current && persist(stateRef.current)) props.onOpenSettings?.(); }}>Réglages</button>}
        {codex && <button onClick={closeCodex}>Fermer le codex</button>}
        {interaction === 'city' && <button disabled={suspended} onClick={() => { const next = stepHomeworldPassageV67(stateRef.current!, { interact: true }); stateRef.current = next; setState(next); leave(next); }}>Rejoindre la cité</button>}
      </div>
    </div></div>}
  </section>;
}
