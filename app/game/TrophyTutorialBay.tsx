'use client';

/* eslint-disable @next/next/no-img-element -- preserved game artwork with explicit ground anchors */
import { useCallback, useEffect, useId, useRef, useState, type PointerEvent, type ReactNode } from 'react';
import HunterRigPreview from './HunterRigPreview';
import { HUNTER_RIG_CANVAS } from './hunterRig';
import { useHomeworldReducedMotionV77 } from './useHomeworldReducedMotionV77';
import type { SaveGame } from './types';
import {
  actTrophyTutorialV6, createTrophyTutorialV6, inspectTrophyTutorialV6, planTrophyTutorialPathV6,
  stepTrophyTutorialPathV6, stepTrophyTutorialV6, trophyTutorialInReachV6, trophyTutorialObservedViewsV6,
  trophyTutorialStationV6, trophyTutorialStepV6, TROPHY_TUTORIAL_METRICS_V6 as METRICS,
  TROPHY_TUTORIAL_STATIONS_V6, TROPHY_TUTORIAL_STEPS_V6,
  type TrophyTutorialGestureV6, type TrophyTutorialPointV6, type TrophyTutorialStateV6,
} from './systems/trophyTutorialV6';
import styles from './TrophyTutorialBay.module.css';

export interface TrophyTutorialBayProps {
  owner: string;
  save: Pick<SaveGame, 'appearance' | 'loadout'>;
  initialState?: unknown;
  /** The campaign owner validates CAS and writes the actual SaveGame. Returning
   * false leaves the previous stable gesture visible and retryable. */
  onCheckpoint: (candidate: TrophyTutorialStateV6) => boolean;
  onExit: () => void;
  suspended?: boolean;
}

export default function TrophyTutorialBay(props: TrophyTutorialBayProps) {
  return <TrophyTutorialSession key={props.owner} {...props} />;
}

function TrophyTutorialSession({ owner, save, initialState, onCheckpoint, onExit, suspended = false }: TrophyTutorialBayProps) {
  const [inspection] = useState(() => inspectTrophyTutorialV6(initialState, owner));
  const [state, setState] = useState(() => inspection.state ?? (inspection.status === 'absent' ? createTrophyTutorialV6(owner) : null));
  const [notice, setNotice] = useState(() => {
    const restored = inspection.state;
    if (!restored || !restored.events.length) return 'L’artisan t’attend près de la niche. Le modèle est pédagogique ; aucune chasse ni récompense n’est supposée.';
    if (restored.completedSteps === 3) return 'Artisan : « Le contexte est relevé. Il reste le berceau et le vrai transport. »';
    if (restored.completedSteps === 8 && trophyTutorialObservedViewsV6(restored).includes('face')) return 'Artisan : « La face est observée. Reprenons le profil puis le revers. »';
    if (restored.completedSteps === 16) return 'Artisan : « La plaque est prête. Il reste à porter, fixer et éprouver la dernière place. »';
    const previous = TROPHY_TUTORIAL_STEPS_V6[restored.completedSteps - 1];
    return previous ? `Artisan : « ${previous.reply} »` : 'Le dernier poste confirmé est conservé.';
  });
  const [moving, setMoving] = useState(false);
  const [navigating, setNavigating] = useState(false);
  const [viewport, setViewport] = useState({ width: 1000, height: 490 });
  const sceneRef = useRef<HTMLDivElement>(null);
  const live = useRef(state), keys = useRef(new Set<string>()), path = useRef<TrophyTutorialPointV6[]>([]);
  const reducedMotion = useHomeworldReducedMotionV77();
  const current = state ? trophyTutorialStepV6(state) : null;
  const ready = state ? trophyTutorialInReachV6(state) : false;
  const publish = useCallback((next: TrophyTutorialStateV6) => { live.current = next; setState(next); }, []);
  const stop = useCallback(() => { keys.current.clear(); path.current = []; setMoving(false); setNavigating(false); }, []);
  const approach = useCallback((point: TrophyTutorialPointV6) => {
    if (suspended || !live.current) return;
    const nextPath = planTrophyTutorialPathV6(live.current, point);
    path.current = nextPath; keys.current.clear(); setNavigating(nextPath.length > 0);
    setNotice(nextPath.length ? 'Rejoins le poste par le passage. Le geste reste à confirmer à portée.' : 'Cet emplacement est occupé. Choisis un point libre du passage.');
    sceneRef.current?.focus({ preventScroll: true });
  }, [suspended]);
  const complete = useCallback((gesture: TrophyTutorialGestureV6) => {
    if (suspended || !live.current || document.visibilityState !== 'visible' || !document.hasFocus()) return;
    stop();
    const result = actTrophyTutorialV6(live.current, gesture);
    if (!result.accepted) { setNotice(result.message); return; }
    // A failed campaign write never advances the object or the stable step.
    let accepted = false;
    try { accepted = onCheckpoint(result.state) === true; } catch { /* Parent owns recovery; keep the current stable state. */ }
    if (!accepted) { setNotice('Le geste attend son enregistrement. Le dernier poste confirmé est conservé ; réessaie sans quitter l’atelier.'); return; }
    publish(result.state); setNotice(`Artisan : « ${result.message} »`);
    sceneRef.current?.focus({ preventScroll: true });
  }, [onCheckpoint, publish, stop, suspended]);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    const observer = new ResizeObserver(([entry]) => setViewport({ width: entry.contentRect.width, height: entry.contentRect.height }));
    observer.observe(scene);
    return () => observer.disconnect();
  }, [inspection.status]);
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene || !live.current) return;
    const held = keys.current;
    let frame = 0, previous = 0, lastPublish = 0, dirty = false;
    const active = () => !suspended && document.visibilityState === 'visible' && document.hasFocus();
    const clear = () => { held.clear(); path.current = []; previous = 0; setMoving(false); setNavigating(false); };
    const down = (event: KeyboardEvent) => {
      if (!active() || event.target !== scene || event.altKey || event.ctrlKey || event.metaKey) return;
      const key = event.key.toLowerCase();
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd', 'z', 'q'].includes(key)) {
        event.preventDefault(); path.current = []; setNavigating(false); held.add(key);
      } else if (key === 'escape') { event.preventDefault(); clear(); }
    };
    const up = (event: KeyboardEvent) => held.delete(event.key.toLowerCase());
    const tick = (now: number) => {
      frame = requestAnimationFrame(tick);
      if (!active()) { clear(); return; }
      const seconds = previous ? Math.min((now - previous) / 1000, METRICS.maxFrameSeconds) : 0;
      previous = now;
      const dx = Number(held.has('d') || held.has('arrowright')) - Number(held.has('a') || held.has('q') || held.has('arrowleft'));
      const dy = Number(held.has('s') || held.has('arrowdown')) - Number(held.has('w') || held.has('z') || held.has('arrowup'));
      const before = live.current;
      if (!before) return;
      let next = before;
      if (dx || dy) { path.current = []; next = stepTrophyTutorialV6(before, { x: dx, y: dy }, seconds); }
      else if (path.current.length) {
        const result = stepTrophyTutorialPathV6(before, path.current, seconds);
        next = result.state; path.current = result.remaining;
        if (!result.remaining.length) { setNavigating(false); setNotice('Poste atteint. Les manipulations sont disponibles à portée.'); }
      }
      const hasMoved = next.walked > before.walked;
      setMoving(hasMoved);
      if (next !== before) { live.current = next; dirty = true; }
      if (dirty && (now - lastPublish >= 32 || !hasMoved)) { setState(next); lastPublish = now; dirty = false; }
    };
    scene.addEventListener('keydown', down);
    window.addEventListener('keyup', up); window.addEventListener('blur', clear); document.addEventListener('visibilitychange', clear);
    frame = requestAnimationFrame(tick);
    if (!suspended) scene.focus({ preventScroll: true });
    return () => { cancelAnimationFrame(frame); clear(); scene.removeEventListener('keydown', down); window.removeEventListener('keyup', up); window.removeEventListener('blur', clear); document.removeEventListener('visibilitychange', clear); };
  }, [inspection.status, suspended]);

  if (!state) return <section className={styles.root} data-trophy-tutorial-blocked={inspection.status}>
    <h2>Journal d’atelier indisponible</h2><p>{inspection.reason}</p>
    <p>Le modèle existant est conservé. Aucune reprise à zéro n’a été effectuée.</p>
    <button type="button" onClick={onExit}>Revenir à l’atelier</button>
  </section>;
  const scale = Math.max(0.64, viewport.width / METRICS.width, viewport.height / METRICS.height);
  const cameraX = Math.min(0, Math.max(viewport.width - METRICS.width * scale, viewport.width / 2 - state.actor.x * scale));
  const cameraY = Math.min(0, Math.max(viewport.height - METRICS.height * scale, viewport.height * 0.8 - state.actor.y * scale));
  const carried = state.objectLocation.startsWith('carried');
  const objectStation = TROPHY_TUTORIAL_STATIONS_V6.find(s => s.id === state.objectLocation) ?? trophyTutorialStationV6('field');
  const objectPoint = carried ? { x: state.actor.x + state.actor.facing * 26, y: state.actor.y - 42 } : { x: objectStation.point.x, y: objectStation.point.y - 37 };
  const actorWidth = 88, actorFoot = HUNTER_RIG_CANVAS.groundY / HUNTER_RIG_CANVAS.width * actorWidth;
  const clickGround = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || suspended) return;
    const box = event.currentTarget.getBoundingClientRect();
    approach({ x: (event.clientX - box.left - cameraX) / scale, y: (event.clientY - box.top - cameraY) / scale });
  };
  return <section className={styles.root} data-trophy-tutorial-v6 data-trophy-tutorial-step={state.completedSteps} data-trophy-tutorial-revision={state.revision}
    data-trophy-tutorial-object={state.objectId} data-trophy-tutorial-location={state.objectLocation}
    data-trophy-tutorial-x={state.actor.x.toFixed(2)} data-trophy-tutorial-y={state.actor.y.toFixed(2)} data-trophy-tutorial-walked={state.walked.toFixed(2)}>
    <header className={styles.header}>
      <div><p className={styles.eyebrow}>L’atelier · modèle pédagogique</p><h2>{current ? current.mission : 'Exposition achevée'}</h2></div>
      <span className={styles.progress} aria-label={`${state.completedSteps} gestes confirmés sur 18`}>{String(state.completedSteps).padStart(2, '0')} / 18</span>
      <button type="button" onClick={() => { stop(); onExit(); }}>Revenir au poste</button>
    </header>
    <div className={styles.viewport} ref={sceneRef} role="group" tabIndex={0} aria-label="Atelier : toucher le sol ou utiliser les flèches pour marcher" onPointerDown={clickGround} data-trophy-tutorial-viewport>
      <div className={styles.world} style={{ width: METRICS.width, height: METRICS.height, transform: `translate(${cameraX}px,${cameraY}px) scale(${scale})` }}>
        <img className={styles.background} src="/game/sprites/v33/pit-arenas/trophy-hall/p0-a-archive-depth.png" width={1536} height={1024} alt="" draggable={false} />
        <div className={styles.floor} />
        {[550, 1000].map(x => <img key={x} className={styles.bench} style={{ left: x, top: 395, zIndex: 395 }} src="/game/clan-ship/props/trophy-workbench-v1.webp" alt="" width={1024} height={603} draggable={false} />)}
        <div className={styles.cabinet} style={{ left: 140, top: 395, zIndex: 395 }} data-cabinet-complete={state.completedSteps === 18}><span /><span /></div>
        <div className={styles.rail} style={{ left: 770, top: 497 }} />
        {TROPHY_TUTORIAL_STATIONS_V6.map(station => <div key={station.id} className={styles.marker} data-active={current?.station === station.id}
          style={{ left: station.point.x, top: station.point.y + 10 }}><span>{station.label}</span></div>)}
        <div className={styles.actor} style={{ left: state.actor.x, top: state.actor.y, zIndex: Math.round(state.actor.y) }}>
          <span className={styles.shadow} /><HunterRigPreview appearance={save.appearance} armorId={save.loadout.armorId} weaponIds={save.loadout.weaponIds}
            gearIds={save.loadout.gearIds} size={actorWidth} facing={state.actor.facing} phase={reducedMotion ? 0 : state.walked / 130 % 1}
            pose={!suspended && moving && !reducedMotion ? 'run' : 'idle'} speed={!suspended && moving ? METRICS.speed : 0}
            style={{ position: 'absolute', left: -actorWidth / 2, top: -actorFoot }} />
        </div>
        <div className={styles.worldModel} style={{ left: objectPoint.x, top: objectPoint.y, zIndex: carried ? Math.round(state.actor.y) + 1 : Math.round(objectStation.point.y) }}>
          <TeachingModel step={state.completedSteps} /><span>{state.completedSteps >= 6 && state.completedSteps <= 7 ? 'CONTENANT · MODÈLE' : 'MODÈLE LOCAL'}</span>
        </div>
      </div>
      {suspended && <div className={styles.veil}>Atelier en pause</div>}
    </div>
    <p className={styles.help}>Toucher le sol : marcher · Flèches / ZQSD / WASD · Échap : arrêter. Les gestes confirmés reprennent au dernier poste stable.</p>
    <div className={styles.objective}>
      <div><span className={styles.eyebrow}>{current ? `Geste ${current.number} · ${trophyTutorialStationV6(current.station).label}` : 'TR-M01 · TR-M02 · TR-M03'}</span><h3>{current?.title ?? 'Un seul modèle, une seule place'}</h3><p>{current?.instruction ?? 'Le modèle est exposé au cabinet. Sa provenance et ses indices sont conservés, sans attribuer de chasse ni de rang.'}</p></div>
      {current && !ready && <button type="button" data-trophy-tutorial-approach disabled={suspended || navigating} onClick={() => approach(trophyTutorialStationV6(current.station).point)}>{navigating ? 'En route…' : 'Rejoindre le poste'}</button>}
    </div>
    {current && ready && <GesturePanel key={current.number} step={current.number} suspended={suspended}
      observedViews={trophyTutorialObservedViewsV6(state)} onObserveView={view => complete({ step: 9, partial: 'view', values: { view } })}
      onComplete={values => complete({ step: current.number, values })} />}
    <p className={styles.notice} role="status" aria-live="polite" data-trophy-tutorial-notice>{notice}</p>
    <details className={styles.journal}><summary>Journal des postes confirmés ({state.completedSteps}/18)</summary>
      {state.events.length ? <ol>{state.events.map(event => <li key={event.step}>{TROPHY_TUTORIAL_STEPS_V6[event.step - 1].mission} · {TROPHY_TUTORIAL_STEPS_V6[event.step - 1].title}</li>)}</ol> : <p>Aucun geste encore confirmé.</p>}
    </details>
  </section>;
}

function TeachingModel({ step, angle = 30, view = 'face', fragile = false, mark = false }: { step: number; angle?: number; view?: string; fragile?: boolean; mark?: boolean }) {
  const gradientId = useId();
  return <svg viewBox="0 0 220 140" role="img" aria-label={`Modèle pédagogique, ${view} ; repère et fibre détachable`} data-trophy-teaching-model>
    <defs><linearGradient id={gradientId}><stop stopColor="#7a705b" /><stop offset=".5" stopColor="#d7c8a0" /><stop offset="1" stopColor="#938168" /></linearGradient></defs>
    <ellipse cx="110" cy="122" rx="80" ry="10" fill="#020609" opacity=".55" />
    {step >= 12 && <path d="M30 117h160l-12 12H43Z" fill="#505957" stroke="#d4ac65" />}
    <path d={view === 'profile' ? 'M90 31l47 19 13 43-31 23-31-24Z' : view === 'reverse' ? 'M50 62l47-39 70 19 16 59-60 19-66-15Z' : 'M40 85l28-49 66-14 46 39-9 47-69 12-49-11Z'} fill={`url(#${gradientId})`} stroke="#e2d1aa" strokeWidth="2" />
    <path d="m82 55 28 16-17 23m17-23 24 15" stroke={mark ? '#5ce3dd' : '#625345'} strokeWidth="5" fill="none" />
    {step < 11 && <path d="M137 41q18 3 24 19" fill="none" stroke={fragile ? '#f5a96b' : '#6f9484'} strokeWidth="6" />}
    <path d="M15 115H205M24 108v14m174-14v14" stroke="#5ac8c5" strokeWidth="2" />
    {step === 15 && <path d={`M12 15L${70 + angle} 66 182 116Z`} fill="#e1cd7b" opacity=".17" />}
    {step >= 6 && step <= 7 && <rect x="25" y="25" width="170" height="100" rx="9" fill="#263b3b" fillOpacity=".88" stroke="#d5b87a" strokeWidth="4" />}
    <text x="110" y="136" textAnchor="middle" fill="#b1ded7" fontSize="9">MODÈLE · AUCUN PRÉLÈVEMENT</text>
  </svg>;
}

function GesturePanel({ step, suspended, observedViews, onObserveView, onComplete }: { step: number; suspended: boolean; observedViews: readonly string[]; onObserveView: (view: string) => void; onComplete: (values: Record<string, unknown>) => void }) {
  const [values, setValues] = useState<Record<string, unknown>>({ margin: 8, frameX: 20, frameY: 80, zoom: 85, leftAttachment: 45, rightAttachment: 55, rail: 0, support: 50, pattern: 20, balance: 20, angle: 70 });
  const update = (field: string, value: unknown) => setValues(v => ({ ...v, [field]: value }));
  const toggle = (field: string, value: string) => setValues(v => { const list = Array.isArray(v[field]) ? v[field] as string[] : []; return { ...v, [field]: list.includes(value) ? list.filter(x => x !== value) : [...list, value] }; });
  const checked = (field: string, value?: string) => value ? Array.isArray(values[field]) && (values[field] as string[]).includes(value) : values[field] === true;
  const check = (field: string, label: string, value?: string) => <label className={styles.check}><input type="checkbox" checked={checked(field, value)} onChange={() => value ? toggle(field, value) : update(field, !checked(field))} />{label}</label>;
  const range = (field: string, label: string, max = 100) => <label className={styles.range}>{label}<output>{String(values[field])}{field === 'angle' ? '°' : ''}</output><input aria-label={label} type="range" min="0" max={max} step="1" value={Number(values[field])} onChange={e => update(field, Number(e.target.value))} /></label>;
  const choices = (field: string, options: readonly [string, string][]) => <div className={styles.choices}>{options.map(([value, label]) => <button type="button" key={value} aria-pressed={values[field] === value} onClick={() => update(field, value)}>{label}</button>)}</div>;
  let body: ReactNode;
  switch (step) {
    case 1: body = <>{check('open', 'Ouvrir la niche')}{check('railsRead', 'Repérer les deux rails')}<div className={styles.marginGauge}><span style={{ width: `${60 + Number(values.margin)}%` }} /></div>{range('margin', 'Marge latérale', 40)}</>; break;
    case 2: body = <><div className={styles.frameView} data-trophy-tutorial-frame><span className={styles.frameGround} data-trophy-frame-reference>SOL · REPÈRE FIXE</span><TeachingModel step={2} /><i style={{ left: `${Number(values.frameX)}%`, top: `${Number(values.frameY)}%`, width: `${Number(values.zoom)}%`, height: `${Number(values.zoom)}%` }} /></div>{range('frameX', 'Cadrage horizontal')}{range('frameY', 'Cadrage vertical')}{range('zoom', 'Ouverture du cadre')}</>; break;
    case 3: body = <>{check('traces', 'Marque visible', 'visible-mark')}{check('traces', 'Repère du sol', 'ground-reference')}{check('invented', 'Supposer une victoire de chasse (non observée)')}</>; break;
    case 4: body = choices('cradle', [['narrow', 'Berceau étroit : compresse'], ['fitted', 'Berceau ajusté : appuis libres'], ['oversize', 'Berceau large : jeu excessif']]); break;
    case 5: body = <><div className={styles.attachmentView}><span style={{ left: `${Number(values.leftAttachment)}%` }} /><b>MARQUE</b><span style={{ left: `${Number(values.rightAttachment)}%` }} /></div>{range('leftAttachment', 'Attache gauche · appui 18–28')}{range('rightAttachment', 'Attache droite · appui 72–82')}</>; break;
    case 6: body = <>{choices('provenance', [['local-model', 'Modèle de l’atelier · provenance locale'], ['invented-hunt', 'Trophée de chasse · fait non établi']])}{check('closed', 'Fermer le contenant et prendre sa poignée')}</>; break;
    case 7: body = <><div className={styles.railView}><span style={{ left: `${Number(values.rail) * .7}%` }}>CAISSE · SOURCE</span></div>{range('rail', 'Glisser la caisse jusqu’à la butée')}{check('sourceVisible', 'L’étiquette de source reste visible')}</>; break;
    case 8: body = <><p className={styles.signal}>Contrôle fictif : <strong>INCONNU</strong></p>{choices('screening', [['unknown', 'Conserver le résultat inconnu'], ['safe', 'Déclarer sûr sans preuve']])}{choices('handling', [['teaching-model', 'Original fermé · travailler sur le modèle'], ['open-original', 'Ouvrir l’original non admis']])}</>; break;
    case 9: body = <><div className={styles.modelView}><TeachingModel step={9} view={String(values.view ?? observedViews.at(-1) ?? 'face')} /></div><div className={styles.choices}>{['face', 'profile', 'reverse'].map(view => <button type="button" key={view} aria-pressed={values.view === view} onClick={() => { update('view', view); if (!observedViews.includes(view)) onObserveView(view); }}>{view === 'face' ? 'Face' : view === 'profile' ? 'Profil' : 'Revers'}{observedViews.includes(view) ? ' ✓' : ''}</button>)}</div></>; break;
    case 10: body = <><div className={styles.modelView}><TeachingModel step={10} fragile={checked('fragileObserved')} mark={checked('markObserved')} /></div>{check('fragileObserved', 'Relever la fibre fragile sur l’arête')}{check('markObserved', 'Relever la marque centrale')}<button type="button" disabled={!checked('fragileObserved') || !checked('markObserved')} onClick={() => update('initialSaved', true)}>{checked('initialSaved') ? 'État initial conservé' : 'Conserver l’état initial'}</button></>; break;
    case 11: body = <>{choices('fibre', [['detachable', 'Soulever la fibre détachable prévue'], ['attached-mark', 'Arracher la marque fixée (refusé)']])}{check('indexed', 'Conserver la fibre avec l’index du modèle')}</>; break;
    case 12: body = <><div className={styles.patternView} style={{ backgroundPositionX: `${Number(values.pattern)}px` }} />{range('support', 'Appuis · repère 25')}{range('pattern', 'Motif · repère 75')}</>; break;
    case 13: body = <><div className={styles.pieces}>{[1, 2, 3].map(piece => <button type="button" key={piece} disabled={Array.isArray(values.pieces) && values.pieces.includes(piece)} onClick={() => setValues(v => ({ ...v, pieces: [...(Array.isArray(v.pieces) ? v.pieces : []), piece] }))}>Pièce {piece}</button>)}</div><p>Assemblage : {Array.isArray(values.pieces) ? values.pieces.join(' → ') : 'aucune pièce'}</p><button type="button" onClick={() => update('pieces', [])}>Détacher les pièces du modèle</button></>; break;
    case 14: body = <>{choices('base', [['compatible', 'Base adaptée aux appuis'], ['unstable', 'Base courte : porte-à-faux']])}<div className={styles.balanceView}><span style={{ transform: `rotate(${(Number(values.balance) - 50) / 2}deg)` }} /></div>{range('balance', 'Équilibre · centre 50')}</>; break;
    case 15: body = <><div className={styles.modelView}><TeachingModel step={15} angle={Number(values.angle)} mark={Number(values.angle) >= 25 && Number(values.angle) <= 35} /></div>{range('angle', 'Lumière rasante', 90)}</>; break;
    case 16: body = <>{check('plaqueFacts', 'Provenance : modèle de l’atelier', 'model-provenance')}{check('plaqueFacts', 'Marque centrale observée', 'observed-mark')}{check('plaqueFacts', 'Âge : question non résolue', 'uncertain-age')}{check('plaqueFacts', 'Victoire contre une créature (non observée)', 'invented-kill')}</>; break;
    case 17: body = <>{check('railLocks', 'Verrouiller le rail gauche', 'left')}{check('railLocks', 'Verrouiller le rail droit', 'right')}</>; break;
    case 18: {
      const cycle = Array.isArray(values.cycle) ? values.cycle : [];
      body = <><div className={styles.choices}><button type="button" disabled={cycle.length !== 0} onClick={() => update('cycle', ['closed'])}>1 · Fermer</button><button type="button" disabled={cycle.length !== 1} onClick={() => setValues(v => ({ ...v, cycle: ['closed', 'margin-checked'], margin: 20 }))}>2 · Vérifier la marge : 20</button><button type="button" disabled={cycle.length !== 2} onClick={() => update('cycle', ['closed', 'margin-checked', 'reopened'])}>3 · Rouvrir</button></div><p>{cycle.length === 0 ? 'Cabinet ouvert.' : cycle.length < 3 ? 'Cabinet fermé.' : 'Cabinet rouvert ; les rails et la marge restent libres.'}</p>{check('confirm', 'Confirmer l’exposition du modèle')}</>; break;
    }
    default: body = null;
  }
  const payload = step === 3 ? { ...values, traces: checked('invented') ? [...(Array.isArray(values.traces) ? values.traces : []), 'invented-kill'] : values.traces } : step === 9 ? { ...values, views: observedViews } : values;
  return <fieldset className={styles.manipulation} disabled={suspended} data-trophy-tutorial-manipulation={step}>
    <legend>Manipulation au poste</legend>{body}
    <button type="button" className={styles.confirm} data-trophy-tutorial-confirm onClick={() => onComplete(payload)}>Confirmer ce geste</button>
  </fieldset>;
}
