'use client';
/* eslint-disable @next/next/no-img-element -- preserve the native supplied character plates. */
import { useCallback, useEffect, useRef, useState, type ComponentProps } from 'react';
import PitCanvas from './PitCanvas';
import PitExtensionPortrait from './PitExtensionPortrait';
import PitStagePreview, { type PitStagePreviewStatus } from './PitStagePreview';
import { getPitCombatBitmapArtDefinition } from './pitCombatBitmapArt';
import { getPitRosterIcon } from './pitRosterIcons';
import { PIT_ARENAS, type PitArenaId } from './systems/pitCombat';
import { getPitFighterProfile, isPitExpansionFighterId, type PitVersusFighterId } from './systems/pitRosterExpansion';
import {
  PIT_CHARACTER_CHRONICLE_ROUTES_V79, PIT_CHARACTER_CHRONICLE_MAX_RESULTS_V79, advancePitCharacterChronicleV79, applyPitCharacterChronicleResultV79,
  checkpointPitCharacterChronicleV79, createPitCharacterChronicleRunV79, getPitCharacterChronicleEncounterV79,
  getPitCharacterChronicleRouteV79, getPitCharacterChronicleStatusV79, parsePitCharacterChronicleRunV79,
  pitCharacterChronicleStorageKeyV79, serializePitCharacterChronicleRunV79,
  type PitCharacterChronicleCuratedIdV79, type PitCharacterChronicleRunV79,
} from './systems/pitCharacterChroniclesV79';
import type { PitNarrativeResultInput } from './systems/pitNarrativeTrialsV57';
import { useMenuGamepad } from './useMenuGamepad';
import styles from './PitExperienceV79.module.css';

type Props = ComponentProps<typeof PitCanvas> & { ownerSaveCreatedAt: string };

/** The original versus controller is unmounted while reading. No combat input
 * listener or gamepad loop remains behind these menus or a second duel. */
export default function PitExperienceV79({ ownerSaveCreatedAt, ...pitProps }: Props) {
  const [selected, setSelected] = useState<PitVersusFighterId | null>(null);
  const [lastFighter, setLastFighter] = useState<PitVersusFighterId | undefined>();
  const choose = (id: PitVersusFighterId) => { setLastFighter(id); setSelected(id); };
  return selected === null ? <PitCanvas {...pitProps} initialLeftId={lastFighter ?? pitProps.initialLeftId} onOpenCharacterChronicle={choose} />
    : <PitCharacterChronicleControllerV79 key={ownerSaveCreatedAt} ownerSaveCreatedAt={ownerSaveCreatedAt}
      selectedId={selected} onChoose={choose} onBack={() => setSelected(null)} pitProps={pitProps} />;
}

function storageKey(owner: string, fighter: PitCharacterChronicleCuratedIdV79) {
  return `${pitCharacterChronicleStorageKeyV79(owner)}.${fighter}`;
}

function PitCharacterChronicleControllerV79({ ownerSaveCreatedAt, selectedId, onChoose, onBack, pitProps }: {
  ownerSaveCreatedAt: string; selectedId: PitVersusFighterId; onChoose: (id: PitVersusFighterId) => void;
  onBack: () => void; pitProps: ComponentProps<typeof PitCanvas>;
}) {
  const [run, setRun] = useState<PitCharacterChronicleRunV79 | null>(null);
  const [loadedId, setLoadedId] = useState<PitVersusFighterId | null>(null);
  const [notice, setNotice] = useState('');
  const [hasCheckpoint, setHasCheckpoint] = useState(false);
  const [confirmRestart, setConfirmRestart] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [previewRetry, setPreviewRetry] = useState(0);
  const [preview, setPreview] = useState<{ id: PitArenaId; status: PitStagePreviewStatus } | null>(null);
  const root = useRef<HTMLElement>(null);
  const completedDuel = useRef<PitCharacterChronicleRunV79 | null>(null);
  const alive = useRef(true);
  const route = getPitCharacterChronicleRouteV79(selectedId);
  const currentRun = loadedId === selectedId ? run : null;
  const inDuel = currentRun?.phase === 'fight';
  const back = useCallback(() => { if (confirmRestart) setConfirmRestart(false); else onBack(); }, [confirmRestart, onBack]);
  useMenuGamepad(root, !inDuel, `pit-chronicle:${selectedId}:${currentRun?.phase ?? 'archive'}:${confirmRestart}`, back);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  useEffect(() => {
    let cancelled = false;
    // Reading browser storage is hydration, not derived React state. Publish
    // its snapshot asynchronously and cancel it when the selected owner changes.
    queueMicrotask(() => {
    if (cancelled) return;
    const selectedRoute = getPitCharacterChronicleRouteV79(selectedId);
    let restored: PitCharacterChronicleRunV79 | null = null;
    let message = '';
    let exists = false;
    if (selectedRoute) {
      try {
        const serialized = localStorage.getItem(storageKey(ownerSaveCreatedAt, selectedRoute.fighterId));
        if (serialized !== null) {
          exists = true;
          restored = parsePitCharacterChronicleRunV79(serialized, ownerSaveCreatedAt);
          if (restored?.fighterId !== selectedRoute.fighterId) restored = null;
          message = restored ? 'Chronique locale retrouvée.' : 'Checkpoint incompatible : il est conservé, mais ne sera pas repris.';
        }
      } catch { message = 'Stockage local indisponible : la chronique peut être jouée durant cette visite.'; }
    }
    completedDuel.current = null; setRun(restored); setLoadedId(selectedId); setNotice(message); setConfirmRestart(false); setHasCheckpoint(exists);
    });
    return () => { cancelled = true; };
  }, [selectedId, ownerSaveCreatedAt]);
  useEffect(() => {
    if (inDuel) return;
    const scope = root.current?.querySelector<HTMLElement>('[role="alertdialog"]') ?? root.current;
    (scope?.querySelector<HTMLElement>('[data-chronicle-primary]:not(:disabled)') ?? scope)?.focus();
  }, [selectedId, loadedId, currentRun?.phase, currentRun?.page, confirmRestart, inDuel]);
  const reportPreview = useCallback((id: PitArenaId, status: PitStagePreviewStatus) => setPreview({ id, status }), []);
  const store = (next: PitCharacterChronicleRunV79) => {
    try {
      const key = storageKey(ownerSaveCreatedAt, next.fighterId), serialized = serializePitCharacterChronicleRunV79(next);
      localStorage.setItem(key, serialized);
      if (localStorage.getItem(key) !== serialized) throw Error('Checkpoint non confirmé.');
      setHasCheckpoint(true);
      setNotice('Checkpoint enregistré sur cet appareil.');
    } catch { setNotice('Checkpoint non enregistré. Le parcours reste disponible durant cette visite ; réessayez la sauvegarde avant de quitter.'); }
  };
  const update = (next: PitCharacterChronicleRunV79) => { setRun(next); store(next); };
  const start = () => {
    if (!route) return;
    const id = typeof crypto.randomUUID === 'function' ? `chronicle-${crypto.randomUUID()}` : `chronicle-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    update(createPitCharacterChronicleRunV79(route.fighterId, ownerSaveCreatedAt, id)); setConfirmRestart(false);
  };
  const encounter = currentRun ? getPitCharacterChronicleEncounterV79(currentRun) : null;
  const resultLimitReached = currentRun?.phase === 'pre' && currentRun.results.length >= PIT_CHARACTER_CHRONICLE_MAX_RESULTS_V79;
  const ready = !currentRun || currentRun.phase !== 'pre' || (preview?.id === encounter?.arenaId && preview?.status === 'ready');
  const advance = () => {
    if (!currentRun || !ready || resultLimitReached) return;
    completedDuel.current = null;
    if (currentRun.phase === 'pre') setAttempt(value => value + 1);
    update(advancePitCharacterChronicleV79(currentRun));
  };
  const finishMatch = (result: PitNarrativeResultInput) => {
    if (!alive.current || !currentRun || !encounter) return;
    const resolved = applyPitCharacterChronicleResultV79(completedDuel.current ?? currentRun,
      { ...result, runId: currentRun.runId, encounterId: encounter.id });
    // Persist the result immediately but keep the child mounted through its KO
    // and victory presentation. Only its explicit Exit returns to the next scene.
    completedDuel.current = resolved.run;
    store(resolved.run);
  };
  const leaveDuel = () => {
    if (!currentRun) return;
    update(completedDuel.current ?? checkpointPitCharacterChronicleV79(currentRun)); completedDuel.current = null;
  };
  if (inDuel && encounter && currentRun) return <PitCanvas key={`${currentRun.runId}:${encounter.id}:${attempt}`}
    narrativeEncounter={encounter} controlBindings={pitProps.controlBindings} highContrast={pitProps.highContrast}
    reducedGore={true} screenShake={pitProps.screenShake} onNarrativeComplete={finishMatch}
    onExit={leaveDuel} exitLabel="Suite de la chronique" />;

  return <section ref={root} className={styles.root} tabIndex={-1} data-screen-focus data-pit-character-chronicles
    data-chronicle-phase={currentRun?.phase ?? 'archive'} data-chronicle-fighter={selectedId} data-high-contrast={pitProps.highContrast}
    aria-labelledby="pit-character-chronicle-title" onKeyDown={event => {
      if (event.key === 'Escape') { event.stopPropagation(); event.preventDefault(); back(); }
      if (confirmRestart && event.key === 'Tab') {
        const buttons = Array.from(root.current?.querySelectorAll<HTMLButtonElement>('[role="alertdialog"] button') ?? []);
        const first = buttons[0], last = buttons.at(-1);
        if (first && last && (event.shiftKey ? document.activeElement === first : document.activeElement === last)) {
          event.preventDefault(); (event.shiftKey ? last : first).focus();
        }
      }
    }}>
    <div className={styles.content} inert={confirmRestart}>
    <header className={styles.header}><div><span>THE PIT · MÉMOIRES DU CERCLE</span><h2 id="pit-character-chronicle-title">Chroniques des chasseurs</h2></div>
      <button type="button" onClick={onBack}>Retour au roster</button></header>
    <nav className={styles.routes} aria-label="Chroniques jouables">
      {PIT_CHARACTER_CHRONICLE_ROUTES_V79.map(item => {
        const icon = getPitRosterIcon(item.fighterId) ?? getPitCombatBitmapArtDefinition(item.fighterId);
        return <button type="button" key={item.id} aria-pressed={selectedId === item.fighterId} onClick={() => onChoose(item.fighterId)}>
          {icon ? <img src={icon.src} width={icon.width} height={icon.height} alt="" /> : <div className={styles.routePortrait} aria-hidden="true"><PitExtensionPortrait fighterId={item.fighterId} facing="right" framing="full-body" /></div>}
          <span>{getPitFighterProfile(item.fighterId).name}<small>3 duels · {item.title}</small></span></button>;
      })}
    </nav>
    <PitCharacterChronicleSceneV79 key={`${selectedId}:${previewRetry}`} fighterId={selectedId} run={currentRun} highContrast={pitProps.highContrast} onPreview={reportPreview} />
    <div className={styles.controls}>
      {route ? <>
        {currentRun && !['finished', 'failed'].includes(currentRun.phase)
          ? <button type="button" data-chronicle-primary disabled={!ready || resultLimitReached} onClick={advance}>
            {resultLimitReached ? 'Registre des tentatives complet' : currentRun.phase === 'pre' ? ready ? 'Entrer dans le cercle' : 'Préparation du décor…' : currentRun.phase === 'defeat' ? 'Reprendre l’épreuve' : 'Continuer le récit'}</button>
          : <button type="button" data-chronicle-primary disabled={loadedId !== selectedId} onClick={() => currentRun || hasCheckpoint ? setConfirmRestart(true) : start()}>{currentRun ? 'Rejouer la chronique' : 'Commencer la chronique'}</button>}
        {currentRun ? <><button type="button" onClick={() => store(currentRun)}>Sauvegarder le checkpoint</button>
          <button type="button" onClick={() => setConfirmRestart(true)}>Recommencer</button></> : null}
        {currentRun?.phase === 'pre' && preview?.id === encounter?.arenaId && preview?.status === 'failed'
          ? <button type="button" data-chronicle-preview-retry onClick={() => { setPreview(null); setPreviewRetry(value => value + 1); }}>Recharger le décor</button> : null}
      </> : <p>Cette fiche est consultable. Son parcours personnel n’est pas encore produit.</p>}
      {resultLimitReached ? <p role="alert">Cette tentative a atteint la limite de 24 résultats. Le checkpoint reste conservé ; choisissez Recommencer pour ouvrir un nouveau parcours.</p> : null}
      <p role="status" aria-live="polite">{notice || 'Quatre parcours originaux illustrés. Sauvegarde locale séparée par partie et par personnage, sans gain de campagne ni synchronisation du compte.'}</p>
    </div>
    </div>
    {confirmRestart ? <div className={styles.modal}><div role="alertdialog" aria-modal="true" aria-labelledby="chronicle-restart-title" tabIndex={-1}>
      <h3 id="chronicle-restart-title">Recommencer cette chronique ?</h3><p>Le checkpoint de {getPitFighterProfile(selectedId).name} sera remplacé. Les autres chroniques et votre campagne sont conservées.</p>
      <button type="button" data-chronicle-primary onClick={() => setConfirmRestart(false)}>Conserver le parcours</button>
      <button type="button" onClick={start}>Recommencer depuis le début</button></div></div> : null}
  </section>;
}

/** A real stage/portrait composition, shared by the UI and SSR contract checks.
 * These native images are preserved; this is not a freshly painted cinematic. */
export function PitCharacterChronicleSceneV79({ fighterId, run, highContrast, onPreview }: {
  fighterId: PitVersusFighterId; run: PitCharacterChronicleRunV79 | null; highContrast: boolean;
  onPreview: (id: PitArenaId, status: PitStagePreviewStatus) => void;
}) {
  const status = getPitCharacterChronicleStatusV79(fighterId)!;
  const route = status.route;
  const panel = run && route ? run.phase === 'intro' ? route.intro[run.page] : run.phase === 'outro' ? route.outro[run.page] : null : null;
  const duel = run && route ? route.encounters[run.phase === 'post' ? run.encounterIndex - 1 : Math.min(run.encounterIndex, route.encounters.length - 1)] : null;
  const arenaId = panel?.arenaId ?? duel?.arenaId ?? route?.intro[0].arenaId;
  const focusId = panel?.focusId ?? fighterId;
  const portrait = getPitCombatBitmapArtDefinition(focusId);
  const title = panel?.title ?? (run?.phase === 'finished' ? 'Le cercle conserve votre récit' : run?.phase === 'failed' ? 'Le parcours s’arrête ici' : run?.phase === 'defeat' ? 'Le rival a pris l’avantage' : duel?.title ?? route?.title ?? status.name);
  const text = panel?.text ?? (run?.phase === 'post' ? duel?.after : run?.phase === 'pre' ? duel?.before
    : run?.phase === 'finished' ? 'Les trois rencontres sont remportées. Vous pouvez relire cette chronique ou en choisir une autre.'
      : run?.phase === 'failed' ? 'Les deux reprises ont été utilisées. Une nouvelle tentative recommencera au premier tableau.'
        : run?.phase === 'defeat' ? `Le duel est terminé. Il reste ${run.continuesRemaining} reprise${run.continuesRemaining === 1 ? '' : 's'} après cette tentative.` : status.biography);
  return <article className={styles.scene} data-chronicle-scene={run?.phase ?? 'archive'}>
    {arenaId ? <div className={styles.landscape} aria-hidden="true"><PitStagePreview arenaId={arenaId} reducedMotion={true} highContrast={highContrast} onStatus={onPreview} /></div> : null}
    {portrait ? <img className={styles.portrait} src={portrait.src} width={portrait.width} height={portrait.height} alt={`Portrait original fourni de ${getPitFighterProfile(focusId).name}`} data-native-chronicle-portrait={focusId} />
      : isPitExpansionFighterId(focusId) ? <div className={styles.atlasPortrait} data-native-chronicle-portrait={focusId}><PitExtensionPortrait fighterId={focusId} facing="right" framing="full-body" /></div> : null}
    <div className={styles.text}>
      <span className={styles.kicker}>{route ? 'RECONSTITUTION ORIGINALE · HORS CANON' : 'ARCHIVE · CHRONIQUE À PRODUIRE'}</span>
      <h3>{title}</h3><p className={styles.body}>{text}</p>
      {run?.phase === 'pre' && duel ? <blockquote className={styles.challenge}>« {duel.challenge} »</blockquote> : null}
      {arenaId ? <p className={styles.venue}>{PIT_ARENAS[arenaId].name}</p> : null}
      {run && route ? <ol className={styles.progress} aria-label="Rencontres de la chronique">{route.encounters.map((item, index) =>
        <li key={item.id} data-complete={index < run.encounterIndex} aria-current={index === run.encounterIndex ? 'step' : undefined}>{index + 1}. {item.title}</li>)}</ol> : null}
      <details className={styles.sources}><summary>Identité, continuité et illustrations</summary>
        <p>{status.sourceWork}</p><p>{route?.continuity}</p><p>{status.limitation}</p>
        <p>Illustrations composées avec les plans et portraits déjà présents. Les duels de chronique utilisent une présentation non létale ; les poses manquantes ne deviennent pas des animations dessinées.</p>
        {route?.biographySources.map(source => <a key={source.url} href={source.url} target="_blank" rel="noreferrer">{source.title}</a>)}
      </details>
    </div>
  </article>;
}
