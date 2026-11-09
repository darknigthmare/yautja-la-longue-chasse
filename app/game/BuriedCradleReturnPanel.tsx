'use client';

/* eslint-disable @next/next/no-img-element -- native, previously published trophy source */
import { useId, useLayoutEffect, useRef, useState } from 'react';
import { useMenuGamepad } from './useMenuGamepad';
import type { SaveGame } from './types';
import { shipForId, type ShipId } from './shipCatalogue';
import { CRADLE_RETURN_STATIONS, cradleReturnChoice, type CradleReturnObservation, type CradleReturnOperation } from './systems/buriedCradleReturn';
import type { PhysicalShipStationId } from './systems/shipLevelLayout';
import styles from './BuriedCradleReturnPanel.module.css';

export interface BuriedCradleReturnControlled {
  save: SaveGame;
  selectedShipId: ShipId;
  onAction: (action: { type: CradleReturnOperation; expectedRevision: number }, observation: CradleReturnObservation) => boolean;
}

export default function BuriedCradleReturnPanel({ controlled, stationId, suspended, observe, onNavigate, onExit }: {
  controlled: BuriedCradleReturnControlled; stationId: PhysicalShipStationId | null; suspended: boolean;
  observe: () => CradleReturnObservation | null; onNavigate: (room: PhysicalShipStationId) => void;
  onExit?: () => void;
}) {
  const [feedback, setFeedback] = useState('');
  const [focused, setFocused] = useState(false);
  const rootRef = useRef<HTMLElement>(null);
  const pendingFocusRef = useRef(false);
  const titleId = useId();
  const state = controlled.save.buriedCradle;
  const revision = state?.returnVisit?.revision;
  useMenuGamepad(rootRef, focused && !suspended, `${controlled.save.createdAt}:${controlled.selectedShipId}`, () => {
    setFocused(false); onExit?.();
  });
  useLayoutEffect(() => {
    if (!pendingFocusRef.current || suspended) return;
    pendingFocusRef.current = false;
    const root = rootRef.current;
    const next = root?.querySelector<HTMLElement>('[data-cradle-return-action]:not(:disabled)') ??
      root?.querySelector<HTMLElement>(`[data-cradle-return-guide="${revision === 1 ? 'trophy-hall' : 'clan-archives'}"]:not(:disabled)`) ??
      root?.querySelector<HTMLElement>('button:not(:disabled)');
    (next ?? root)?.focus({ preventScroll: true });
  }, [revision, suspended]);
  if (!state || !['extracted', 'reported'].includes(state.status) || !state.returnVisit) return null;
  const visit = state.returnVisit;
  const choice = cradleReturnChoice(visit);
  const correctHull = controlled.selectedShipId === state.personalShipId;
  const ready = correctHull && !suspended && state.status === 'extracted';
  const examined = visit.revision >= 2;
  const crown = state.progress.crownClaimed;
  const act = (type: CradleReturnOperation) => {
    const observation = observe();
    if (!observation || !ready) { setFeedback('Rejoins le poste dans le vaisseau de retour pour confirmer cette étape.'); return; }
    const confirmed = controlled.onAction({ type, expectedRevision: visit.revision }, observation);
    pendingFocusRef.current = confirmed;
    setFeedback(confirmed ? 'Étape enregistrée.' : 'Étape non confirmée. Consulte le message de campagne puis réessaie.');
  };
  const navigate = (room: PhysicalShipStationId) => { if (correctHull && !suspended) { setFocused(false); onNavigate(room); } };
  const stepButton = (type: CradleReturnOperation, label: string, enabled: boolean) => <button type="button"
    data-cradle-return-action={type} disabled={!ready || !enabled || stationId !== CRADLE_RETURN_STATIONS[type]}
    onClick={() => act(type)}>{label}</button>;
  return <section ref={rootRef} className={styles.panel} aria-labelledby={titleId} tabIndex={-1} data-cradle-return-panel
    onFocusCapture={() => setFocused(true)} onBlurCapture={event => {
      if (!(event.relatedTarget instanceof Node) || !event.currentTarget.contains(event.relatedTarget)) setFocused(false);
    }} onKeyDown={event => {
      if (event.key === 'Escape' && !suspended) { event.preventDefault(); event.stopPropagation(); setFocused(false); onExit?.(); }
    }}
    data-return-revision={visit.revision} data-return-choice={choice ?? 'pending'} data-return-hull={state.personalShipId}>
    <header className={styles.header}><div><p className={styles.eyebrow}>RETOUR DE XENO PRIME</p>
      <h3 id={titleId}>Ce que la reine a changé</h3></div><span className={styles.badge}>{choice ? 'Retour consigné' : `${visit.revision} / 3 étapes`}</span>
      {onExit && <button type="button" disabled={suspended} onClick={() => { setFocused(false); onExit(); }}>Reprendre le déplacement · B / Échap</button>}</header>
    {!correctHull && <p className={styles.notice}>Le contenu de cette expédition est à bord de {shipForId(state.personalShipId).name}. Reprends cette coque pour poursuivre le retour.</p>}
    <p className={styles.intro}>{crown ? 'La crête est revenue avec toi. Avant de l’exposer, passe aux soins et examine ce que tu as retiré de la ruche.' :
      state.progress.bossDefeated ? 'La Matriarche est tombée, mais tu es revenu sans sa crête. Tu peux raconter l’affrontement et conserver tes relevés ; le support restera vide.' :
      'La ruche garde encore sa Matriarche. Tu es revenu avec ce que tu as appris de ses passages et de ses défenses. Reprends ces relevés avant d’y retourner.'}</p>
    <div className={styles.steps}>
      <article className={styles.step} data-return-step="care"><span className={styles.number}>01</span><h4>Soins de retour</h4>
        <p>{visit.revision >= 1 ? 'Nettoyage de l’équipement et contrôle des blessures consignés au poste de soin.' :
          'Rejoins la baie médicale pour traiter le retour avant de manipuler les objets de la ruche.'}</p>
        {state.snapshot && <p className={styles.detail}>Vitalité au moment de l’extraction : {Math.round(state.snapshot.run.player.health)}. Le relevé de terrain reste conservé.</p>}
        {!choice && <><button type="button" data-cradle-return-guide="medical-bay" disabled={!correctHull || suspended} onClick={() => navigate('medical-bay')}>Guider vers les soins</button>
          {stepButton('treat-return', visit.revision >= 1 ? 'Soins effectués' : 'Effectuer les soins et le nettoyage', visit.revision === 0)}</>}
      </article>
      <article className={styles.step} data-return-step="inspection"><span className={styles.number}>02</span><h4>{crown ? 'Examiner la crête' : 'Installer les relevés'}</h4>
        <p>{examined ? crown ? 'La crête repose sur le support. Les relevés de cette expédition restent à côté : ils racontent comment tu l’as obtenue.' :
          'Les relevés d’expédition sont installés. Le support de trophée reste vide.' : 'Rejoins la galerie des trophées et examine ce qui a réellement été rapporté.'}</p>
        {examined && correctHull && crown && <img className={styles.crown} src="/game/xeno-prime/berceau-v1/sprites/props_effets/100_trophee_couronne_socle.png" alt="Crête de la Matriarche sur son support" width={1254} height={1254} />}
        {examined && <dl className={styles.readings}><div><dt>Lieux relevés</dt><dd>{state.progress.visitedRoomIds.length} / 12</dd></div>
          <div><dt>Raccourcis ouverts</dt><dd>{state.progress.shortcutIds.length} / 3</dd></div>
          <div><dt>Matriarche</dt><dd>{state.progress.bossDefeated ? 'Vaincue' : 'Non vaincue'}</dd></div>
          <div><dt>Crête prélevée</dt><dd>{crown ? 'Oui' : 'Non'}</dd></div></dl>}
        {!choice && <><button type="button" data-cradle-return-guide="trophy-hall" disabled={!correctHull || suspended} onClick={() => navigate('trophy-hall')}>Guider vers l’atelier</button>
          {stepButton('inspect-return', examined ? 'Examen effectué' : crown ? 'Installer et examiner la crête' : 'Installer et examiner les relevés', visit.revision === 1)}</>}
      </article>
      <article className={styles.step} data-return-step="debrief"><span className={styles.number}>03</span><h4>Donner une suite à la chasse</h4>
        {choice ? <p className={styles.receipt}>{choice === 'clan' ? 'Ton récit attend aux archives du clan.' : 'Tu as gardé les relevés près de l’établi pour les étudier seul.'} {state.crownDelivered ? 'La crête demeure liée à cette chasse de reine.' : 'Le récit est conservé. Aucun trophée n’a été ajouté.'}</p> : <>
          <p>Tu peux laisser ton récit aux archives du clan ou reprendre seul l’affrontement à l’atelier. Montrer une prise et comprendre ce qu’elle t’a coûté ne sont pas le même choix. Ni l’un ni l’autre ne te dispense des rites.</p>
          <button type="button" data-cradle-return-guide="clan-archives" disabled={!correctHull || suspended} onClick={() => navigate('clan-archives')}>Guider vers les archives</button>
          {stepButton('present-clan', 'Présenter au clan', examined)}
          {stepButton('analyze-workshop', 'Analyser seul à l’atelier', examined)}
        </>}
      </article>
    </div>
    <p className={styles.status} role="status" aria-live="polite">{feedback || (choice ? 'Ton choix et les relevés sont conservés après rechargement.' : 'Le guidage prépare le trajet. Confirme chaque porte, puis l’intervention au poste.')} <span>Manette : Y / Triangle ouvre ce dossier ; stick ou croix directionnelle pour choisir, A / Croix pour confirmer.</span></p>
  </section>;
}
