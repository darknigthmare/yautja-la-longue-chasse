'use client';

/* eslint-disable @next/next/no-img-element -- the board is a local unmodified native game asset */
import { useState } from 'react';
import YautjaTranslationV67 from './YautjaTranslationV67';
import { HOMEWORLD_ALL_CONTRACTS_V69, CONTRACT_REGIONS_V68, contractRegionNameV68, homeworldContractsJournalV68, contractRequirementsV69,
  isHomeworldContractsV68, normalizeHomeworldContractsV68, type ContractActionV68, type ContractCategoryV68,
  type ContractRegionIdV68 } from './systems/homeworldContractsV68';
import styles from './HomeworldContractsV68.module.css';

type CategoryFilterV69 = ContractCategoryV68 | 'all' | 'chain';
const CATEGORIES: readonly { id: CategoryFilterV69; label: string }[] = [
  { id: 'all', label: 'Toutes' }, { id: 'tracking', label: 'Pistage' }, { id: 'challenge', label: 'Défis de chasse' },
  { id: 'protection', label: 'Protection' }, { id: 'recovery', label: 'Récupération' }, { id: 'npc', label: 'Demandes personnelles' },
  { id: 'chain', label: 'Circuits du clan' },
];
const CATEGORY_NAMES = Object.fromEntries(CATEGORIES.map(item => [item.id, item.label]));

/** Presentation only. The parent revalidates position and durably saves the
 * proposed model state before any UI completion or wallet acknowledgement. */
export default function HomeworldContractsV68({ value, npcId, eligible, disabled, reducedMotion = false, onAction }: {
  value: unknown; npcId: string | null | undefined; eligible: boolean; disabled: boolean; reducedMotion?: boolean;
  onAction(action: ContractActionV68): void;
}) {
  const [category, setCategory] = useState<CategoryFilterV69>('all');
  const [region, setRegion] = useState<ContractRegionIdV68 | 'all'>('all');
  const [journalOnly, setJournalOnly] = useState(false);
  const state = normalizeHomeworldContractsV68(value);
  const journal = homeworldContractsJournalV68(state);
  const known = value === undefined || isHomeworldContractsV68(value);
  const offered = HOMEWORLD_ALL_CONTRACTS_V69.filter(item => item.giverNpcId === npcId);
  if (!offered.length) return null;
  const board = npcId === 'market-artisan';
  const visible = offered.filter(item => (category === 'all' || category === 'chain' && !!item.chain || item.category === category)
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
        const requirements = contractRequirementsV69(state, definition.id);
        const phase = !entry ? requirements.met ? 'offer' : 'locked' : entry.status === 'completed' ? 'completed' : entry.status === 'abandoned' ? 'abandoned' : active?.ready ? 'return' : 'field';
        const status = phase === 'offer' ? 'Disponible' : phase === 'locked' ? 'Remise préalable requise' : phase === 'completed' ? 'Rapport remis' : phase === 'abandoned' ? 'Mise de côté' : phase === 'return' ? 'À remettre' : 'Suivie';
        return <article className={styles.card} key={definition.id} data-contract-id={definition.id} data-contract-phase={phase}>
          <div className={styles.cardTop}><span>{definition.chain ? 'Circuit du clan' : CATEGORY_NAMES[definition.category]}</span><strong>{definition.rewardMarks} marques de clan</strong></div>
          {definition.chain && <p className={styles.chainLabel} data-contract-chain-v69={definition.chain.id}>{definition.chain.title} · chapitre {definition.chain.chapter}/{definition.chain.total}</p>}
          <h5>{definition.title}</h5><p className={styles.region}>{definition.objectives.map(objective => contractRegionNameV68(objective.regionId)).join(' → ')}</p>
          <p><YautjaTranslationV67 text={definition.brief} paused={disabled} reducedMotion={reducedMotion} /></p>
          {definition.chain && <><p className={styles.relation}>{definition.chain.relation}</p>
            <ol className={styles.itinerary} aria-label="Itinéraire dans l’ordre">
              {definition.objectives.map((objective, index) => <li key={objective.regionId} data-contract-route-state={active?.route[index].status ?? (phase === 'completed' ? 'confirmed' : index === 0 ? 'field' : 'later')}>
                <strong>{index + 1}. {contractRegionNameV68(objective.regionId)}</strong><span>{objective.text}</span>
              </li>)}
            </ol></>}
          {phase === 'locked' && <p className={styles.requirement} data-contract-prerequisite-v69>{requirements.message}</p>}
          <p className={styles.restriction}>{definition.restriction}</p>
          <div className={styles.status}><span>{status}</span>{active && <span>{active.completedStages}/{active.totalStages} retours confirmés</span>}</div>
          {active && <p className={styles.objective}><strong>Destination :</strong> {active.destination.label}<br /><strong>{active.nextAction} :</strong> {active.objective}</p>}
          <div className={styles.actions}>
            {phase === 'offer' && <button type="button" disabled={blockActions} data-contract-action="accept" onClick={() => onAction({ kind: 'accept', contractId: definition.id })}>Suivre cette demande</button>}
            {phase === 'locked' && <button type="button" disabled data-contract-action="accept">Rapport précédent requis</button>}
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
    <div className={styles.circuits} aria-label="Relations et circuits du clan" data-contract-chains-journal-v69>
      {journal.chains.map(chain => <article key={chain.id}><strong>{chain.title}</strong><span>{chain.completed}/{chain.total} remises au commanditaire</span>
        {chain.next ? <p><strong>{chain.completed ? 'Suite débloquée' : 'Premier chapitre'} :</strong> {chain.next.title}<br />Rejoins {chain.next.giverName} en personne.</p>
          : <p>{chain.completed === chain.total ? 'Circuit clos. Les remises restent inscrites.' : 'Termine et remets la demande suivie pour ouvrir la suite.'}</p>}
      </article>)}
    </div>
    {!journal.active.length ? <p>Aucune demande suivie. Rencontre les habitants ou consulte le tableau à l’échoppe du marché.</p>
      : <ul>{journal.active.map(item => <li key={item.id} data-contract-journal-id={item.id}>
        <strong>{item.title}</strong><span>{item.completedStages}/{item.totalStages} retours confirmés</span>
        <p data-contract-destination-v69><strong>Destination :</strong> {item.destination.label}<br /><strong>{item.nextAction} :</strong> {item.objective}</p>
        {item.chain && <p className={styles.relation}>{item.chain.title} · {item.chain.chapter}/{item.chain.total}<br />{item.relation}</p>}
      </li>)}</ul>}
  </section>;
}
