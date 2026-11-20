'use client';

import styles from './HomeworldContractsV68.module.css';
import { MINOR_ARC_CHARACTERS_V160, minorArcsJournalV160, type MinorArcAccessSaveV160, type MinorArcActionV160,
  type MinorArcPhaseV160 } from './systems/minorArcsV160';

const PHASE_LABELS: Record<MinorArcPhaseV160, string> = {
  locked: 'Verrouillée', offer: 'Disponible', field: 'Suivie', return: 'À remettre', completed: 'Issue enregistrée',
  abandoned: 'Mise de côté', 'not-implemented': 'Non implémentée', unavailable: 'Registre illisible',
};
const characterName = (id: string) => {
  const character = MINOR_ARC_CHARACTERS_V160.find(item => item.id === id);
  return character ? `${character.name}${character.status === 'proposé' ? ' (proposé)' : ''}` : id;
};

/** Présentation seulement. Le parent revalide la position et sauvegarde avant toute annonce. */
export default function HomeworldMinorArcsV160({ save, npcId, disabled, onAction }: {
  save: MinorArcAccessSaveV160; npcId: string | null | undefined; disabled: boolean; onAction(action: MinorArcActionV160): void;
}) {
  const journal = minorArcsJournalV160(save);
  // Le commanditaire de la première étape présente tout son arc, étapes suivantes comprises.
  const arc = journal.arcs.find(item => item.views.some(view => !!npcId && view.stage.giver?.npcId === npcId));
  if (!arc) return null;
  const views = arc.views;
  return <section className={styles.root} aria-label={arc.title} data-minor-arcs-v160={arc.id}>
    <header className={styles.header}><div>
      <span className={styles.eyebrow}>Missions proposées · bible de campagne</span>
      <h4>{arc.title}</h4>
      <p>Débloqué après le rang Blooded. {arc.completed}/{arc.views.length} issues enregistrées. Les personnages marqués « proposé » ne sont pas canon.</p>
    </div></header>
    {!journal.writable && <p role="alert" className={styles.notice}>Le registre des mini-arcs de cette sauvegarde ne peut pas être modifié.</p>}
    <div className={styles.cards}>
      {views.map(({ stage, phase, reason, steps, nextAction, outcomeText }) => <article key={stage.id} className={styles.card}
        data-minor-arc-stage={stage.id} data-minor-arc-phase={phase} data-contract-phase={phase === 'not-implemented' ? 'locked' : phase}>
        <div className={styles.cardTop}><span>{stage.id} · mission proposée</span><strong>{PHASE_LABELS[phase]}</strong></div>
        <h5>{stage.title}</h5>
        <p className={styles.region}>{stage.characters.map(characterName).join(' · ')}</p>
        <p>{stage.bible.conduct}</p>
        <p className={styles.relation}><strong>Issue prévue :</strong> {stage.bible.outcome}</p>
        {stage.giver && <p className={styles.restriction}>Lieu (proposé) : {stage.giver.place}.</p>}
        {stage.adaptation && <p className={styles.restriction} data-minor-arc-adaptation>Adaptation (proposée) : {stage.adaptation}</p>}
        {!!steps.length && <ol className={styles.itinerary} aria-label="Étapes dans l’ordre">
          {steps.map((step, index) => <li key={index} data-contract-route-state={step.status}><strong>{index + 1}.</strong><span>{step.text}</span></li>)}
        </ol>}
        {reason && <p className={styles.requirement} data-minor-arc-reason>{reason}</p>}
        {nextAction && <p className={styles.objective}><strong>Prochaine action :</strong> {nextAction}</p>}
        {outcomeText && <p className={styles.completed} data-minor-arc-outcome>{outcomeText}</p>}
        <div className={styles.actions}>
          {phase === 'offer' && <button type="button" disabled={disabled} data-minor-arc-action="accept" onClick={() => onAction({ kind: 'accept', stageId: stage.id })}>Accepter l’épreuve</button>}
          {phase === 'abandoned' && <button type="button" disabled={disabled} data-minor-arc-action="resume" onClick={() => onAction({ kind: 'resume', stageId: stage.id })}>Reprendre · tout refaire</button>}
          {phase === 'return' && <button type="button" disabled={disabled} data-minor-arc-action="deliver" onClick={() => onAction({ kind: 'deliver', stageId: stage.id })}>Remettre l’épreuve</button>}
          {(phase === 'field' || phase === 'return') && <button type="button" className={styles.secondary} disabled={disabled} data-minor-arc-action="abandon" onClick={() => onAction({ kind: 'abandon', stageId: stage.id })}>Mettre de côté</button>}
        </div>
      </article>)}
    </div>
  </section>;
}

export function HomeworldMinorArcsJournalV160({ save }: { save: MinorArcAccessSaveV160 }) {
  const journal = minorArcsJournalV160(save);
  return <section className={styles.journal} aria-label="Mini-arcs des clans" data-minor-arcs-journal-v160>
    <h4>Mini-arcs des clans</h4>
    <ul>{journal.arcs.map(arc => <li key={arc.id} data-minor-arc-journal={arc.id}>
      <strong>{arc.title} · {arc.completed}/{arc.views.length}</strong>
      {arc.views.map(view => <span key={view.stage.id} data-minor-arc-journal-stage={view.stage.id} data-minor-arc-phase={view.phase}>
        {view.stage.id} {view.stage.title} — {PHASE_LABELS[view.phase]}{view.nextAction ? ` · ${view.nextAction}` : ''}{view.phase === 'offer' && view.stage.giver ? ` · ${view.stage.giver.place}` : ''}</span>)}
    </li>)}</ul>
  </section>;
}
