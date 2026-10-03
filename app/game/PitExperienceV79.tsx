'use client';
/* eslint-disable @next/next/no-img-element -- preserve the native supplied character plates. */
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ComponentProps } from 'react';
import PitCanvas from './PitCanvas';
import PitExtensionPortrait from './PitExtensionPortrait';
import PitStagePreview, { type PitStagePreviewStatus } from './PitStagePreview';
import { getPitCombatBitmapArtDefinition } from './pitCombatBitmapArt';
import { getPitRosterIcon } from './pitRosterIcons';
import { PIT_ARENAS, type PitArenaId } from './systems/pitCombat';
import { getPitFighterProfile, isPitExpansionFighterId, type PitVersusFighterId } from './systems/pitRosterExpansion';
import {
  PIT_CHARACTER_CHRONICLE_ROUTES_V79, PIT_CHARACTER_CHRONICLE_ROUTES_V80, PIT_CHARACTER_CHRONICLE_MAX_RESULTS_V79, advancePitCharacterChronicleV79, applyPitCharacterChronicleResultV79,
  checkpointPitCharacterChronicleV79, createPitCharacterChronicleRunV79, getPitCharacterChronicleEncounterV79,
  getPitCharacterChronicleRouteV79, getPitCharacterChronicleStatusV79, parsePitCharacterChronicleRunV79,
  getPitCharacterChronicleGalleryAccessV80,
  pitCharacterChronicleStorageKeyV79, serializePitCharacterChronicleRunV79,
  type PitCharacterChronicleCuratedIdV79, type PitCharacterChronicleRunV79,
} from './systems/pitCharacterChroniclesV79';
import type { PitNarrativeResultInput } from './systems/pitNarrativeTrialsV57';
import { useMenuGamepad } from './useMenuGamepad';
import styles from './PitExperienceV79.module.css';

type Props = ComponentProps<typeof PitCanvas> & { ownerSaveCreatedAt: string };
function subscribeCompactRoster(notify: () => void) {
  const media = window.matchMedia('(max-width: 760px)');
  media.addEventListener('change', notify); return () => media.removeEventListener('change', notify);
}
const compactRosterSnapshot = () => window.matchMedia('(max-width: 760px)').matches;
const desktopRosterSnapshot = () => false;

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

function storageKey(owner: string, fighter: PitCharacterChronicleCuratedIdV79, version: 1 | 2) {
  return `${pitCharacterChronicleStorageKeyV79(owner, version)}.${fighter}`;
}

function PitCharacterChronicleControllerV79({ ownerSaveCreatedAt, selectedId, onChoose, onBack, pitProps }: {
  ownerSaveCreatedAt: string; selectedId: PitVersusFighterId; onChoose: (id: PitVersusFighterId) => void;
  onBack: () => void; pitProps: ComponentProps<typeof PitCanvas>;
}) {
  const [run, setRun] = useState<PitCharacterChronicleRunV79 | null>(null);
  const [contentVersion, setContentVersion] = useState<1 | 2>(2);
  const [loadedVersion, setLoadedVersion] = useState<1 | 2 | null>(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [rosterPage, setRosterPage] = useState(0);
  const [catalogueOpen, setCatalogueOpen] = useState(false);
  const [reviewPanel, setReviewPanel] = useState<{ phase: 'intro' | 'outro'; page: number } | null>(null);
  const compactRoster = useSyncExternalStore(subscribeCompactRoster, compactRosterSnapshot, desktopRosterSnapshot);
  const pageSize = compactRoster ? 6 : 24;
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
  const route = getPitCharacterChronicleRouteV79(selectedId, contentVersion);
  const currentRun = loadedId === selectedId && loadedVersion === contentVersion ? run : null;
  const folded = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('fr');
  const filteredRoutes = useMemo(() => PIT_CHARACTER_CHRONICLE_ROUTES_V80.filter(item => {
    const profile = getPitFighterProfile(item.fighterId);
    return (filter === 'all' || item.biographyEvidence === filter)
      && folded(`${profile.name} ${item.title} ${profile.sourceWork}`).includes(folded(query));
  }), [query, filter]);
  const pageCount = Math.max(1, Math.ceil(filteredRoutes.length / pageSize));
  const page = Math.min(rosterPage, pageCount - 1);
  const visibleRoutes = filteredRoutes.slice(page * pageSize, page * pageSize + pageSize);
  const legacyAvailable = PIT_CHARACTER_CHRONICLE_ROUTES_V79.some(item => item.fighterId === selectedId);
  const endingEarned = getPitCharacterChronicleGalleryAccessV80(currentRun).outro;
  const inDuel = currentRun?.phase === 'fight';
  const back = useCallback(() => { if (confirmRestart) setConfirmRestart(false); else if (reviewPanel) setReviewPanel(null); else onBack(); }, [confirmRestart, reviewPanel, onBack]);
  useMenuGamepad(root, !inDuel, `pit-chronicle:${selectedId}:${contentVersion}:${currentRun?.phase ?? 'archive'}:${reviewPanel?.phase ?? ''}:${reviewPanel?.page ?? ''}:${page}:${confirmRestart}`, back);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  useEffect(() => {
    let cancelled = false;
    // Reading browser storage is hydration, not derived React state. Publish
    // its snapshot asynchronously and cancel it when the selected owner changes.
    queueMicrotask(() => {
    if (cancelled) return;
    const selectedRoute = getPitCharacterChronicleRouteV79(selectedId, contentVersion);
    let restored: PitCharacterChronicleRunV79 | null = null;
    let message = '';
    let exists = false;
    if (selectedRoute) {
      try {
        const serialized = localStorage.getItem(storageKey(ownerSaveCreatedAt, selectedRoute.fighterId, contentVersion));
        if (serialized !== null) {
          exists = true;
          restored = parsePitCharacterChronicleRunV79(serialized, ownerSaveCreatedAt);
          if (restored?.fighterId !== selectedRoute.fighterId || restored?.contentVersion !== contentVersion) restored = null;
          message = restored ? 'Chronique locale retrouvée.' : 'Checkpoint incompatible : il est conservé, mais ne sera pas repris.';
        }
      } catch { message = 'Stockage local indisponible : la chronique peut être jouée durant cette visite.'; }
    }
    completedDuel.current = null; setRun(restored); setLoadedId(selectedId); setLoadedVersion(contentVersion); setReviewPanel(null); setNotice(message); setConfirmRestart(false); setHasCheckpoint(exists);
    });
    return () => { cancelled = true; };
  }, [selectedId, ownerSaveCreatedAt, contentVersion]);
  useEffect(() => {
    if (inDuel) return;
    const scope = root.current?.querySelector<HTMLElement>('[role="alertdialog"]') ?? root.current;
    (scope?.querySelector<HTMLElement>('[data-chronicle-primary]:not(:disabled)') ?? scope)?.focus();
  }, [selectedId, loadedId, currentRun?.phase, currentRun?.page, reviewPanel, confirmRestart, inDuel]);
  const reportPreview = useCallback((id: PitArenaId, status: PitStagePreviewStatus) => setPreview({ id, status }), []);
  const store = (next: PitCharacterChronicleRunV79) => {
    try {
      const key = storageKey(ownerSaveCreatedAt, next.fighterId, next.contentVersion), serialized = serializePitCharacterChronicleRunV79(next);
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
    update(createPitCharacterChronicleRunV79(route.fighterId, ownerSaveCreatedAt, id, contentVersion)); setReviewPanel(null); setConfirmRestart(false);
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
    {currentRun ? <button type="button" aria-expanded={catalogueOpen} aria-controls="pit-chronicle-catalogue" onClick={() => setCatalogueOpen(value => !value)}>{catalogueOpen ? 'Revenir au récit' : 'Choisir un autre chasseur'}</button> : null}
    {!currentRun || catalogueOpen ? <div id="pit-chronicle-catalogue" data-chronicle-catalogue>
    <div className={styles.catalogueTools}>
      <label>Rechercher un chasseur, une œuvre ou une chronique<input type="search" value={query} onChange={event => { setQuery(event.target.value); setRosterPage(0); }} /></label>
      <label>Provenance de l’identité<select value={filter} onChange={event => { setFilter(event.target.value); setRosterPage(0); }}>
        <option value="all">Tous les profils</option><option value="primary-summary">Résumé à référence primaire</option>
        <option value="project-original">Créations du projet / attribution V56</option><option value="roster-attribution">Identités attribuées au roster</option>
      </select></label>
      <p role="status">{filteredRoutes.length} / {PIT_CHARACTER_CHRONICLE_ROUTES_V80.length} chroniques · page {page + 1} / {pageCount}</p>
      <button type="button" disabled={page === 0} onClick={() => setRosterPage(page - 1)}>Page précédente</button>
      <button type="button" disabled={page + 1 >= pageCount} onClick={() => setRosterPage(page + 1)}>Page suivante</button>
      <button type="button" disabled={!filteredRoutes.some(item => item.fighterId === selectedId)} onClick={() => setRosterPage(Math.floor(filteredRoutes.findIndex(item => item.fighterId === selectedId) / pageSize))}>Afficher la sélection</button>
    </div>
    <nav className={styles.routes} aria-label="Chroniques jouables">
      {visibleRoutes.map(item => {
        const icon = getPitRosterIcon(item.fighterId) ?? getPitCombatBitmapArtDefinition(item.fighterId);
        return <button type="button" key={item.id} aria-pressed={selectedId === item.fighterId && contentVersion === 2} onClick={() => { setCatalogueOpen(false); setContentVersion(2); onChoose(item.fighterId); }}>
          {icon ? <img loading="lazy" decoding="async" src={icon.src} width={icon.width} height={icon.height} alt="" /> : <div className={styles.routePortrait} aria-hidden="true">Portrait sur la fiche</div>}
          <span>{getPitFighterProfile(item.fighterId).name}<small>{item.encounters.length} duels · {item.title}</small></span></button>;
      })}
    </nav>
    </div> : null}
    {legacyAvailable ? <div className={styles.edition}><button type="button" aria-pressed={contentVersion === 2} onClick={() => setContentVersion(2)}>Chronique V80 · 8 duels</button>
      <button type="button" aria-pressed={contentVersion === 1} onClick={() => setContentVersion(1)}>Parcours V79 conservé · 3 duels / ancien checkpoint</button></div> : null}
    <PitCharacterChronicleSceneV79 key={`${selectedId}:${previewRetry}:${contentVersion}`} fighterId={selectedId} run={currentRun} contentVersion={contentVersion} reviewPanel={reviewPanel} highContrast={pitProps.highContrast} onPreview={reportPreview} />
    <div className={styles.controls}>
      {reviewPanel && route ? <>
        <button type="button" data-chronicle-primary disabled={reviewPanel.page === 0} onClick={() => setReviewPanel({ ...reviewPanel, page: reviewPanel.page - 1 })}>Tableau précédent</button>
        <button type="button" disabled={reviewPanel.page + 1 >= route[reviewPanel.phase].length} onClick={() => setReviewPanel({ ...reviewPanel, page: reviewPanel.page + 1 })}>Tableau suivant</button>
        <button type="button" onClick={() => setReviewPanel(null)}>Revenir au checkpoint</button>
      </> : route ? <>
        {currentRun && !['finished', 'failed'].includes(currentRun.phase)
          ? <button type="button" data-chronicle-primary disabled={!ready || resultLimitReached} onClick={advance}>
            {resultLimitReached ? 'Registre des tentatives complet' : currentRun.phase === 'pre' ? ready ? 'Entrer dans le cercle' : 'Préparation du décor…' : currentRun.phase === 'defeat' ? 'Reprendre l’épreuve' : 'Continuer le récit'}</button>
          : <button type="button" data-chronicle-primary disabled={loadedId !== selectedId || loadedVersion !== contentVersion} onClick={() => currentRun || hasCheckpoint ? setConfirmRestart(true) : start()}>{currentRun ? 'Rejouer la chronique' : 'Commencer la chronique'}</button>}
        {currentRun ? <><button type="button" onClick={() => store(currentRun)}>Sauvegarder le checkpoint</button>
          <button type="button" onClick={() => setConfirmRestart(true)}>Recommencer</button>
          <button type="button" onClick={() => setReviewPanel({ phase: 'intro', page: 0 })}>Galerie · introduction découverte</button>
          <button type="button" disabled={!endingEarned} onClick={() => { if (endingEarned) setReviewPanel({ phase: 'outro', page: 0 }); }}>Galerie · {endingEarned ? 'fin gagnée' : `fin verrouillée · ${currentRun.encounterIndex}/${route.encounters.length}`}</button></> : null}
        {currentRun?.phase === 'pre' && preview?.id === encounter?.arenaId && preview?.status === 'failed'
          ? <button type="button" data-chronicle-preview-retry onClick={() => { setPreview(null); setPreviewRetry(value => value + 1); }}>Recharger le décor</button> : null}
      </> : <p>Cette fiche est consultable. Son parcours personnel n’est pas encore produit.</p>}
      {resultLimitReached ? <p role="alert">Cette tentative a atteint la limite de 24 résultats. Le checkpoint reste conservé ; choisissez Recommencer pour ouvrir un nouveau parcours.</p> : null}
      <p role="status" aria-live="polite">{notice || '201 intrigues originales · 8 duels chacune · tableaux composés avec les images existantes. Les quatre anciens parcours gardent leurs checkpoints séparés. Aucun gain de campagne ni synchronisation du compte.'}</p>
    </div>
    </div>
    {confirmRestart ? <div className={styles.modal}><div role="alertdialog" aria-modal="true" aria-labelledby="chronicle-restart-title" tabIndex={-1}>
      <h3 id="chronicle-restart-title">Recommencer cette chronique ?</h3><p>Le checkpoint V{contentVersion === 1 ? '79' : '80'} de {getPitFighterProfile(selectedId).name} sera remplacé. L’autre édition, les autres chroniques et votre campagne sont conservées.</p>
      <button type="button" data-chronicle-primary onClick={() => setConfirmRestart(false)}>Conserver le parcours</button>
      <button type="button" onClick={start}>Recommencer depuis le début</button></div></div> : null}
  </section>;
}

/** A real stage/portrait composition, shared by the UI and SSR contract checks.
 * These native images are preserved; this is not a freshly painted cinematic. */
export function PitCharacterChronicleSceneV79({ fighterId, run, contentVersion = 2, reviewPanel, highContrast, onPreview }: {
  fighterId: PitVersusFighterId; run: PitCharacterChronicleRunV79 | null; highContrast: boolean;
  contentVersion?: 1 | 2; reviewPanel?: { phase: 'intro' | 'outro'; page: number } | null;
  onPreview: (id: PitArenaId, status: PitStagePreviewStatus) => void;
}) {
  const status = getPitCharacterChronicleStatusV79(fighterId, run?.contentVersion ?? contentVersion)!;
  const route = status.route;
  const gallery = reviewPanel && run && route && getPitCharacterChronicleGalleryAccessV80(run)[reviewPanel.phase] ? reviewPanel : null;
  const panel = gallery && route ? route[gallery.phase][gallery.page] : run && route ? run.phase === 'intro' ? route.intro[run.page] : run.phase === 'outro' ? route.outro[run.page] : null : null;
  const duel = run && route ? route.encounters[run.phase === 'post' ? run.encounterIndex - 1 : Math.min(run.encounterIndex, route.encounters.length - 1)] : null;
  const arenaId = panel?.arenaId ?? duel?.arenaId ?? route?.intro[0].arenaId;
  const focusId = panel?.focusId ?? fighterId;
  const portrait = getPitCombatBitmapArtDefinition(focusId);
  const title = panel?.title ?? (run?.phase === 'finished' ? 'Le cercle conserve votre récit' : run?.phase === 'failed' ? 'Le parcours s’arrête ici' : run?.phase === 'defeat' ? 'Le rival a pris l’avantage' : duel?.title ?? route?.title ?? status.name);
  const text = panel?.text ?? (run?.phase === 'post' ? duel?.after : run?.phase === 'pre' ? duel?.before
    : run?.phase === 'finished' ? `Les ${route?.encounters.length} rencontres sont remportées. Vous pouvez relire cette chronique ou en choisir une autre.`
      : run?.phase === 'failed' ? 'Les deux reprises ont été utilisées. Une nouvelle tentative recommencera au premier tableau.'
        : run?.phase === 'defeat' ? `Le duel est terminé. Il reste ${run.continuesRemaining} reprise${run.continuesRemaining === 1 ? '' : 's'} après cette tentative.` : status.biography);
  return <article className={styles.scene} data-chronicle-scene={gallery ? `gallery-${gallery.phase}` : run?.phase ?? 'archive'} data-camera={panel?.camera ?? 'wide'}>
    {panel?.fullScene ? <img className={styles.fullScene} src={panel.fullScene.src} width={panel.fullScene.width} height={panel.fullScene.height} alt={panel.fullScene.alt} data-native-chronicle-fullscene={panel.fullScene.sha256} />
      : arenaId ? <div className={styles.landscape} aria-hidden="true"><PitStagePreview arenaId={arenaId} reducedMotion={true} highContrast={highContrast} onStatus={onPreview} /></div> : null}
    {!panel?.fullScene && portrait ? <img className={styles.portrait} src={portrait.src} width={portrait.width} height={portrait.height} alt={`Portrait natif de ${getPitFighterProfile(focusId).name}`} data-native-chronicle-portrait={focusId} />
      : !panel?.fullScene && isPitExpansionFighterId(focusId) ? <div className={styles.atlasPortrait} data-native-chronicle-portrait={focusId}><PitExtensionPortrait fighterId={focusId} facing="right" framing="full-body" /></div> : null}
    <div className={styles.text}>
      <span className={styles.kicker}>{route ? 'RECONSTITUTION ORIGINALE · HORS CANON' : 'ARCHIVE · CHRONIQUE À PRODUIRE'}</span>
      <span className={styles.provenance}>{status.provenance === 'primary-summary' ? 'IDENTITÉ · RÉSUMÉ À RÉFÉRENCE PRIMAIRE' : status.provenance === 'project-original' ? 'IDENTITÉ · CRÉATION / ATTRIBUTION DU PROJET' : 'IDENTITÉ FOURNIE · BIOGRAPHIE NON CERTIFIÉE'}</span>
      <h3>{title}</h3><p className={styles.body}>{text}</p>
      {!gallery && run?.phase === 'pre' && duel ? <blockquote className={styles.challenge}>« {duel.challenge} »</blockquote> : null}
      {arenaId ? <p className={styles.venue}>{PIT_ARENAS[arenaId].name}</p> : null}
      {run && route ? <ol className={styles.progress} aria-label="Rencontres de la chronique">{route.encounters.map((item, index) =>
        <li key={item.id} data-complete={index < run.encounterIndex} aria-current={index === run.encounterIndex ? 'step' : undefined}>{index + 1}. {item.title}</li>)}</ol> : null}
      <details className={styles.sources}><summary>Identité, continuité et illustrations</summary>
        <p>{status.sourceWork}</p><p>{status.biography}</p><p>{route?.familyNote}</p><p>{route?.rivalReason}</p><p>{route?.continuity}</p><p>{status.limitation}</p>
        <p>Illustrations composées avec les plans et portraits déjà présents. Les duels de chronique utilisent une présentation non létale ; les poses manquantes ne deviennent pas des animations dessinées.</p>
        {route?.biographySources.map(source => <a key={source.url} href={source.url} target="_blank" rel="noreferrer">{source.title}</a>)}
      </details>
    </div>
  </article>;
}
