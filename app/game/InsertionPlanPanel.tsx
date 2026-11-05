'use client';

import { shipForId, type ShipId } from './shipCatalogue';
import type { MissionId } from './types';
import { EXPEDITION_CARE_COST, TRIO_MEMBERS, expeditionTrioReady, planetInsertionPressure,
  shipSupportsSurfaceInsertion, triadRecommendedForMission, type ExpeditionMemberId,
  type ExpeditionRoster, type PlanetInsertionPlan } from './systems/planetInsertion';
import styles from './InsertionPlanPanel.module.css';

interface Props {
  plan: PlanetInsertionPlan;
  missionId: MissionId;
  shipId: ShipId;
  ownerCreatedAt: string;
  roster?: ExpeditionRoster | null;
  clanMarks: number;
  campaignAccess: { allowed: boolean; reason: string };
  busy: boolean;
  onChange: (plan: PlanetInsertionPlan) => void;
  onAssign: (id: ExpeditionMemberId) => void;
  onCare: (id: ExpeditionMemberId, expectedAvailability: 'recovering' | 'missing') => void;
}

export default function InsertionPlanPanel({ plan, missionId, shipId, ownerCreatedAt, roster, clanMarks,
  campaignAccess, busy, onChange, onAssign, onCare }: Props) {
  const pressure = planetInsertionPressure(plan);
  const surfaceCapable = shipSupportsSurfaceInsertion(shipId);
  const ready = expeditionTrioReady(roster, ownerCreatedAt, shipId);
  const ship = shipForId(shipId);
  return <section className={styles.panel} aria-labelledby="insertion-title" data-insertion-plan={`${plan.method}-${plan.team}`}>
    <header><span>Préparation de l’incursion</span><h2 id="insertion-title">Choisir l’approche</h2>
      <p>Vaisseau sélectionné : <strong>{ship.name}</strong></p></header>
    <fieldset disabled={busy} className={styles.choices}>
      <legend>Insertion</legend>
      <label data-selected={plan.method === 'pod'}><input type="radio" name="insertion-method" value="pod"
        checked={plan.method === 'pod'} onChange={() => onChange({ ...plan, method: 'pod' })} />
        <span><strong>Capsule</strong><small>Signature limitée. Le vaisseau reste en altitude.</small></span></label>
      <label data-selected={plan.method === 'ship'}><input type="radio" name="insertion-method" value="ship"
        checked={plan.method === 'ship'} disabled={!campaignAccess.allowed || !surfaceCapable}
        onChange={() => onChange({ ...plan, method: 'ship' })} />
        <span><strong>Poser le vaisseau</strong><small>{surfaceCapable
          ? 'Débarquement direct. Le bruit et la coque révèlent la zone d’arrivée.'
          : 'Cette coque reste en orbite. Choisis une coque compatible pour te poser.'}</small></span></label>
    </fieldset>
    <fieldset disabled={busy} className={styles.choices}>
      <legend>Équipe de chasse</legend>
      <label data-selected={plan.team === 'solo'}><input type="radio" name="insertion-team" value="solo"
        checked={plan.team === 'solo'} onChange={() => onChange({ ...plan, team: 'solo' })} />
        <span><strong>Chasseur seul</strong><small>Approche autonome et empreinte réduite.</small></span></label>
      <label data-selected={plan.team === 'triad'}><input type="radio" name="insertion-team" value="triad"
        checked={plan.team === 'triad'} disabled={!campaignAccess.allowed} onChange={() => onChange({ ...plan, team: 'triad' })} />
        <span><strong>Incursion du trio</strong><small>Ton chasseur, Ka’rhek et Sa’keth. Progression et extraction en groupe.</small></span></label>
    </fieldset>
    {!campaignAccess.allowed && <p className={styles.notice}>{campaignAccess.reason}</p>}
    {triadRecommendedForMission(missionId) && <p className={styles.recommendation}>Le trio est conseillé pour cette cible. Le départ en solo reste possible.</p>}
    <div className={styles.pressure} aria-live="polite" aria-atomic="true">
      <strong>{plan.method === 'ship' ? 'Zone d’arrivée signalée' : plan.team === 'triad' ? 'Trois signatures de descente' : 'Approche discrète'}</strong>
      <p>{pressure.extraPatrols > 0
        ? `Jusqu’à ${pressure.extraPatrols} ennemis supplémentaires sur des positions praticables, et ${pressure.searchSeconds} secondes de recherche autour de l’insertion.`
        : 'Aucune patrouille ajoutée par l’insertion. Les rencontres habituelles restent présentes.'}</p>
      {plan.method === 'ship' && <p>Les ennemis connaissent le point d’atterrissage. Romps leur ligne de vue et quitte la zone pour reprendre l’avantage.</p>}
    </div>
    {campaignAccess.allowed && <div className={styles.roster} aria-label="Préparation des compagnons">
      {TRIO_MEMBERS.map(member => {
        const entry = roster?.members.find(candidate => candidate.id === member.id);
        const assigned = entry?.assignedShipId === shipId;
        const unavailable = entry && entry.availability !== 'ready';
        const careCost = unavailable ? EXPEDITION_CARE_COST[entry.availability as 'recovering' | 'missing'] : 0;
        return <article key={member.id} data-expedition-member={member.id} data-availability={entry?.availability ?? 'unrecruited'}>
          <h3>{member.name}<small>{member.role}</small></h3>
          <p>{!entry ? member.invitation : entry.availability === 'missing' ? 'Resté sur le terrain. Un rapatriement du clan est nécessaire avant les soins.'
            : entry.availability === 'recovering' ? 'Rapatrié, en attente de soins avant le prochain départ.'
              : assigned ? 'Prêt à embarquer dans le vaisseau sélectionné.' : 'Disponible, à affecter au vaisseau sélectionné.'}</p>
          {unavailable ? <button type="button" className="ghost-button" disabled={busy || clanMarks < careCost}
            onClick={() => onCare(member.id, entry.availability as 'recovering' | 'missing')}>
            {entry.availability === 'missing' ? 'Rapatriement du clan' : 'Soins à bord'} · {careCost} marques
          </button> : !assigned ? <button type="button" className="ghost-button" disabled={busy} onClick={() => onAssign(member.id)}>
            {entry ? 'Affecter au vaisseau' : `Recruter ${member.name}`}
          </button> : <span className={styles.ready}>Affectation confirmée</span>}
        </article>;
      })}
      {plan.team === 'triad' && !ready && <p className={styles.notice}>Prépare les deux compagnons et affecte-les à cette coque pour partir en trio.</p>}
      <p className={styles.care}>En mission : ordres de suivi ou d’attente, assistance au combat et stabilisation avec une charge de médicomp. Rassemble les trois chasseurs au point d’extraction. Solde : {clanMarks} marques.</p>
    </div>}
  </section>;
}
