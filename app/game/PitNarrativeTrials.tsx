'use client';
/* eslint-disable @next/next/no-img-element -- roster icons are existing local bitmap resources. */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ControlBindings } from './systems/controlBindings';
import PitCanvas from './PitCanvas';
import PitStagePreview, { type PitStagePreviewStatus } from './PitStagePreview';
import { PIT_ARENAS, PIT_FIGHTERS, type PitArenaId } from './systems/pitCombat';
import { getPitRosterIcon } from './pitRosterIcons';
import { PIT_NARRATIVE_TRIALS_V57, resolvePitNarrativeOutcome, type PitNarrativeOutcome, type PitNarrativeResultInput } from './systems/pitNarrativeTrialsV57';
import { pitNarrativeOutcomeDescription, resolvePitNarrativePresentation } from './systems/pitNarrativePresentationV58';
import { useMenuGamepad } from './useMenuGamepad';
import styles from './PitNarrativeTrials.module.css';

interface Props {
  controlBindings: ControlBindings;
  highContrast: boolean;
  reducedGore: boolean;
  screenShake: boolean;
  onExit: () => void;
}

export default function PitNarrativeTrials({ controlBindings, highContrast, reducedGore, screenShake, onExit }: Props) {
  const [selectedId, setSelectedId] = useState(PIT_NARRATIVE_TRIALS_V57[0].id);
  const [phase, setPhase] = useState<'briefing' | 'duel' | 'result'>('briefing');
  const [attempt, setAttempt] = useState(0);
  const [outcome, setOutcome] = useState<PitNarrativeOutcome | null>(null);
  const [preview, setPreview] = useState<{ id: PitArenaId; status: PitStagePreviewStatus } | null>(null);
  const [previewRetry, setPreviewRetry] = useState(0);
  const [notice, setNotice] = useState('');
  const trial = PIT_NARRATIVE_TRIALS_V57.find(item => item.id === selectedId)!;
  const presentation = resolvePitNarrativePresentation(trial, reducedGore);
  const rootRef = useRef<HTMLElement>(null);
  const resultRef = useRef<Exclude<PitNarrativeOutcome, 'abandoned'> | null>(null);
  const ready = preview?.id === trial.arenaId && preview.status === 'ready';
  const reportPreview = useCallback((id: PitArenaId, status: PitStagePreviewStatus) => setPreview({ id, status }), []);
  const back = useCallback(() => { if (phase === 'result') { setPhase('briefing'); setOutcome(null); } else onExit(); }, [phase, onExit]);
  useMenuGamepad(rootRef, phase !== 'duel', `pit-narrative:${phase}:${selectedId}`, back);
  useEffect(() => { if (phase !== 'duel') {
    const primary = rootRef.current?.querySelector<HTMLButtonElement>('[data-narrative-primary]');
    (primary && !primary.disabled ? primary : rootRef.current)?.focus();
  } }, [phase]);
  const begin = () => {
    if (!ready) return;
    resultRef.current = null; setOutcome(null); setNotice(''); setAttempt(value => value + 1); setPhase('duel');
  };
  const finishMatch = useCallback((result: PitNarrativeResultInput) => {
    const resolved = resolvePitNarrativeOutcome(trial, result);
    if (!resolved) { setNotice('Le résultat ne correspond pas à cette épreuve. Aucun succès n’est attribué.'); return; }
    resultRef.current = resolved;
    // This dedicated callback never acknowledges or requests a durable save.
  }, [trial]);
  const leaveDuel = useCallback(() => { setOutcome(resultRef.current ?? 'abandoned'); setPhase('result'); }, []);

  if (phase === 'duel') return <PitCanvas key={`${trial.id}:${attempt}`} narrativeEncounter={trial}
    controlBindings={controlBindings} highContrast={highContrast} reducedGore={presentation.reducedGore} screenShake={screenShake}
    onNarrativeComplete={finishMatch} onExit={leaveDuel} exitLabel="Retour au récit" />;

  return <section ref={rootRef} className={styles.root} data-screen-focus data-pit-narrative-trials data-narrative-phase={phase}
    data-narrative-trial={trial.id} data-narrative-outcome={outcome ?? ''} data-high-contrast={highContrast} tabIndex={-1}
    aria-labelledby="pit-narrative-title" onKeyDown={event => { if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); back(); } }}>
    <header className={styles.header}><div><span>THE PIT · CHRONIQUES ALTERNATIVES</span><h2 id="pit-narrative-title">Épreuves narratives</h2></div>
      <button type="button" onClick={onExit}>Retour à The Pit</button></header>
    <div className={styles.layout}>
      <nav className={styles.trials} aria-label="Rencontres de rival">
        {PIT_NARRATIVE_TRIALS_V57.map(item => {
          const icon = getPitRosterIcon(item.leftId);
          return <button key={item.id} type="button" data-narrative-choice={item.id} aria-pressed={trial.id === item.id}
            onClick={() => { setSelectedId(item.id); setOutcome(null); setPhase('briefing'); resultRef.current = null; setNotice(''); }}>
            {icon ? <img src={icon.src} width={icon.width} height={icon.height} alt="" /> : null}
            <span><strong>{PIT_FIGHTERS[item.leftId].name}</strong><small>{item.title}</small></span>
          </button>;
        })}
        <p>Quatre confrontations tirées de l’étape 7/8 du classeur. Les mini-campagnes complètes restent à produire.</p>
      </nav>
      <article className={styles.scene}>
        <div className={styles.preview}><PitStagePreview key={`${trial.id}:${previewRetry}`} arenaId={trial.arenaId} reducedMotion={true} highContrast={highContrast} onStatus={reportPreview} /></div>
        <div className={styles.sceneContent}>
          <span className={styles.badge}>EXTRAIT · ÉTAPE 7 / 8</span><h3>{trial.title}</h3>
          <p className={styles.versus}>{PIT_FIGHTERS[trial.leftId].name} <span>contre</span> {PIT_FIGHTERS[trial.rightId].name}</p>
          <p className={styles.venue}>{PIT_ARENAS[trial.arenaId].name}</p>
          <p className={styles.continuity}>{trial.continuity}</p>
          {presentation.nonLethalTrial ? <p className={styles.limit} data-narrative-combat-policy="non-lethal-clan-trial">
            Épreuve non létale : un KO ou une décision au chronomètre tranche la manche, sans mort dans ce récit. Les impacts sont représentés par des anneaux dorés. Votre réglage de violence reste inchangé pour les autres combats.
          </p> : null}
          {phase === 'result' ? <div className={styles.result} role="status">
            <h4>{outcome === 'victory' ? 'Épreuve remportée' : outcome === 'defeat' ? 'Le rival l’emporte' : outcome === 'draw' ? 'Duel indécis' : 'Épreuve interrompue'}</h4>
            <p>{pitNarrativeOutcomeDescription(trial, outcome)}</p>
            {outcome === 'victory' ? <strong>{trial.conclusion}</strong> : null}
          </div> : <p className={styles.brief}>{trial.briefing}</p>}
          {notice ? <p role="alert">{notice}</p> : null}
          <div className={styles.actions}><button type="button" className={styles.primary} data-narrative-primary disabled={!ready} onClick={begin}>
            {!ready ? preview?.status === 'failed' ? 'Décor indisponible' : 'Préparation du décor…' : phase === 'result' ? 'Rejouer cette rencontre' : 'Lancer l’épreuve'}</button>
            {preview?.id === trial.arenaId && preview.status === 'failed' ? <button type="button" onClick={() => setPreviewRetry(value => value + 1)}>Recharger les plans</button> : null}
            {phase === 'result' ? <button type="button" onClick={() => { setPhase('briefing'); setOutcome(null); }}>Relire le contexte</button> : null}</div>
          <p className={styles.limit}>Duel CPU adapté · présentation avec les poses disponibles, sans cinématique dédiée ni finition létale. Résultat conservé seulement durant cette visite ; aucun gain d’honneur, objet, cosmétique ou progression Arcade.</p>
          <details className={styles.sources}><summary>Source et éléments encore manquants</summary><p>{trial.limitation}</p>
            <p>Les étapes 1–6 et 8, le stage spécial à objectifs et les séquences de récit du classeur ne sont pas déclarés accomplis.</p>
            <p>THE_PIT_BIBLE_COMBATTANTS_STAGES_V54.xlsx · {trial.source.sheet}!{trial.source.encounterCell} · contexte {trial.source.contextCells}. Règles 16_REGLES!C29:D29 et C36:D37.</p>
            {trial.combatPolicy ? <p>Épreuve de clan adaptée : {trial.combatPolicy.sources.join(' · ')}. Cette présentation conserve les règles de combat ; elle n’ajoute ni animation de clémence ni remise d’objet.</p> : null}
            {trial.source.stageMapping ? <p>{trial.source.stageMapping}</p> : null}</details>
        </div>
      </article>
    </div>
  </section>;
}
