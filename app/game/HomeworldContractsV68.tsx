'use client';

/* eslint-disable @next/next/no-img-element -- the board is a local unmodified native game asset */
import { useState } from 'react';
import YautjaTranslationV67 from './YautjaTranslationV67';
import { HOMEWORLD_CONTRACTS_V68, CONTRACT_REGIONS_V68, contractRegionNameV68, homeworldContractsJournalV68,
  isHomeworldContractsV68, normalizeHomeworldContractsV68, type ContractActionV68, type ContractCategoryV68,
  type ContractRegionIdV68 } from './systems/homeworldContractsV68';
import styles from './HomeworldContractsV68.module.css';

const CATEGORIES: readonly { id: ContractCategoryV68 | 'all'; label: string }[] = [
  { id: 'all', label: 'Toutes' }, { id: 'tracking', label: 'Pistage' }, { id: 'challenge', label: 'Défis de chasse' },
  { id: 'protection', label: 'Protection' }, { id: 'recovery', label: 'Récupération' }, { id: 'npc', label: 'Demandes personnelles' },
];
const CATEGORY_NAMES = Object.fromEntries(CATEGORIES.map(item => [item.id, item.label]));

/** Presentation only. The parent revalidates position and durably saves the
 * proposed model state before any UI completion or wallet acknowledgement. */
export default function HomeworldContractsV68({ value, npcId, eligible, disabled, reducedMotion = false, onAction }: {
  value: unknown; npcId: string | null | undefined; eligible: boolean; disabled: boolean; reducedMotion?: boolean;
  onAction(action: ContractActionV68): void;
}) {
  const [category, setCategory] = useState<ContractCategoryV68 | 'all'>('all');
  const [region, setRegion] = useState<ContractRegionIdV68 | 'all'>('all');
  const [journalOnly, setJournalOnly] = useState(false);
  const state = normalizeHomeworldContractsV68(value);
  const journal = homeworldContractsJournalV68(state);
  const known = value === undefined || isHomeworldContractsV68(value);
  const offered = HOMEWORLD_CONTRACTS_V68.filter(item => item.giverNpcId === npcId);
  if (!offered.length) return null;
  const board = npcId === 'market-artisan';
  const visible = offered.filter(item => (category === 'all' || item.category === category)
    && (region === 'all' || item.objectives.some(objective => objective.regionId === region))
    && (!journalOnly || state.entries.some(entry => entry.id === item.id)));
  const blockActions = disabled || !eligible || !known;
  return <section className={styles.root} aria-label={board ? 'Tableau des chasses' : 'Demandes du clan'} data-contracts-v68>
    <header className={styles.header}>
      {board && <img src="/game/homeworld/v68/hunt-board.png" alt="" aria-hidden="true" className={styles.boardArt} />}
      <div><span className={styles.eyebrow}>{board ? 'Les routes du monde natal' : 'Une demande en personne'}</span>
        <h4>{board ? 'Tableau des chasses' : offered[0].giverName}</h4>
        <p>Les marques de clan règlent une commande. L’honneur se prouve au retour.</p>
        <div className={styles.counters}><span>{journal.completed} rapports remis</span><span>{journal.active.length} demandes suivies</span>
          <strong>{journal.marks} marques de clan gagnées</strong></div>
      </div>
    </header>
    {!eligible && <p className={styles.notice}>Ton maître prépare encore tes départs. Termine les étapes de formation qui autorisent ces sorties avant de prendre une demande.</p>}
    {!known && <p role="alert" className={styles.notice}>Le registre de cette sauvegarde ne peut pas être modifié.</p>}
    {board && <div className={styles.filters} aria-label="Filtres du tableau">
      <label>Type de demande<select value={category} disabled={disabled} onChange={event => setCategory(event.target.value as typeof category)}>
        {CATEGORIES.filter(item => item.id !== 'npc').map(item => <option value={item.id} key={item.id}>{item.label}</option>)}</select></label>
      <label>Terrain<select value={region} disabled={disabled} onChange={event => setRegion(event.target.value as typeof region)}>
        <option value="all">Tous les terrains</option>{CONTRACT_REGIONS_V68.map(id => <option key={id} value={id}>{contractRegionNameV68(id)}</option>)}</select></label>
      <button type="button" aria-pressed={journalOnly} disabled={disabled} onClick={() => setJournalOnly(current => !current)}>
        {journalOnly ? 'Voir toutes les demandes' : 'Mes demandes'}</button>
    </div>}
    <div className={styles.cards} aria-label="Demandes proposées">
      {visible.map(definition => {
        const entry = state.entries.find(item => item.id === definition.id);
        const active = journal.active.find(item => item.id === definition.id);
        const phase = !entry ? 'offer' : entry.status === 'completed' ? 'completed' : entry.status === 'abandoned' ? 'abandoned' : active?.ready ? 'return' : 'field';
        const status = phase === 'offer' ? 'Disponible' : phase === 'completed' ? 'Rapport remis' : phase === 'abandoned' ? 'Mise de côté' : phase === 'return' ? 'À remettre' : 'Suivie';
        return <article className={styles.card} key={definition.id} data-contract-id={definition.id} data-contract-phase={phase}>
          <div className={styles.cardTop}><span>{CATEGORY_NAMES[definition.category]}</span><strong>{definition.rewardMarks} marques de clan</strong></div>
          <h5>{definition.title}</h5><p className={styles.region}>{definition.objectives.map(objective => contractRegionNameV68(objective.regionId)).join(' → ')}</p>
          <p><YautjaTranslationV67 text={definition.brief} paused={disabled} reducedMotion={reducedMotion} /></p>
          <p className={styles.restriction}>{definition.restriction}</p>
          <div className={styles.status}><span>{status}</span>{active && <span>{active.completedStages}/{active.totalStages} retours confirmés</span>}</div>
          {active && <p className={styles.objective}><strong>Prochaine étape :</strong> {active.objective}</p>}
          <div className={styles.actions}>
            {phase === 'offer' && <button type="button" disabled={blockActions} data-contract-action="accept" onClick={() => onAction({ kind: 'accept', contractId: definition.id })}>Suivre cette demande</button>}
            {phase === 'abandoned' && <button type="button" disabled={blockActions} data-contract-action="resume" onClick={() => onAction({ kind: 'resume', contractId: definition.id })}>Reprendre · nouvelle sortie</button>}
            {phase === 'return' && <button type="button" disabled={blockActions} data-contract-action="deliver" onClick={() => onAction({ kind: 'deliver', contractId: definition.id })}>Remettre les rapports</button>}
            {(phase === 'field' || phase === 'return') && <button type="button" className={styles.secondary} disabled={blockActions} data-contract-action="abandon" onClick={() => onAction({ kind: 'abandon', contractId: definition.id })}>Mettre de côté</button>}
            {phase === 'completed' && <span className={styles.completed}>Marques créditées · remise terminée</span>}
          </div>
        </article>;
      })}
      {!visible.length && <p className={styles.empty}>Aucune demande ne correspond à ces filtres.</p>}
    </div>
  </section>;
}

export function HomeworldContractsJournalV68({ value }: { value: unknown }) {
  const journal = homeworldContractsJournalV68(value);
  return <section className={styles.journal} aria-label="Carnet des demandes" data-contracts-journal-v68>
    <h4>Carnet des demandes · {journal.completed} remises</h4>
    <p>{journal.marks} marques de clan gagnées par ces demandes. Ton solde disponible figure dans le HUD.</p>
    {!journal.active.length ? <p>Aucune demande suivie. Rencontre les habitants ou consulte le tableau à l’échoppe du marché.</p>
      : <ul>{journal.active.map(item => <li key={item.id} data-contract-journal-id={item.id}>
        <strong>{item.title}</strong><span>{item.completedStages}/{item.totalStages} retours confirmés</span><p>{item.objective}</p>
      </li>)}</ul>}
  </section>;
}
