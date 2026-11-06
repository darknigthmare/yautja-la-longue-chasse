'use client';

import { shipForId, type ShipId } from './shipCatalogue';
import type { MissionId } from './types';
import { EXPEDITION_CARE_COST, TRIO_MEMBERS, expeditionTrioReady, planetInsertionPressure,
  shipSupportsSurfaceInsertion, triadRecommendedForMission, type ExpeditionMemberId,
  type ExpeditionRoster, type PlanetInsertionPlan } from './systems/planetInsertion';
import { SHIP_INSERTION_ENERGY, shipInsertionCharge, type ShipInsertionEnergy } from './systems/shipInsertionEnergy';
import styles from './InsertionPlanPanel.module.css';

interface Props {
  plan: PlanetInsertionPlan;
  missionId: MissionId;
  shipId: ShipId;
  ownerCreatedAt: string;
  roster?: ExpeditionRoster | null;
  clanMarks: number;
  shipEnergy?: ShipInsertionEnergy | null;
  onRecharge: (shipId: ShipId, expectedCharge: number) => void;
  campaignAccess: { allowed: boolean; reason: string };
  busy: boolean;
  onChange: (plan: PlanetInsertionPlan) => void;
  onRecruit: (id: ExpeditionMemberId) => void;
  onAssign: (id: ExpeditionMemberId, expectedShipId: ShipId) => void;
  onReserve: (id: ExpeditionMemberId, expectedShipId: ShipId) => void;
  onCare: (id: ExpeditionMemberId, expectedAvailability: 'recovering' | 'missing') => void;
}

export default function InsertionPlanPanel({ plan, missionId, shipId, ownerCreatedAt, roster, clanMarks, shipEnergy, onRecharge,
  campaignAccess, busy, onChange, onRecruit, onAssign, onReserve, onCare }: Props) {
  const pressure = planetInsertionPressure(plan);
  const surfaceCapable = shipSupportsSurfaceInsertion(shipId);
  const ready = expeditionTrioReady(roster, ownerCreatedAt, shipId);
  const ship = shipForId(shipId);
  const charge = shipInsertionCharge(shipEnergy, ownerCreatedAt, shipId);
  const cloakAffordable = charge !== null && charge - SHIP_INSERTION_ENERGY.cloakCost >= SHIP_INSERTION_ENERGY.safetyReserve;
  return <section className={styles.panel} aria-labelledby="insertion-title" data-insertion-plan={`${plan.method}-${plan.team}`}>
    <header><span>Préparation de l’incursion</span><h2 id="insertion-title">Choisir l’approche</h2>
      <p>Vaisseau sélectionné : <strong>{ship.name}</strong></p></header>
    <fieldset disabled={busy} className={styles.choices}>
      <legend>Insertion</legend>
      <label data-selected={plan.method === 'pod'}><input type="radio" name="insertion-method" value="pod"
        checked={plan.method === 'pod'} onChange={() => onChange({ version: 1, method: 'pod', team: plan.team })} />
        <span><strong>Capsule</strong><small>Signature limitée. Le vaisseau reste en altitude.</small></span></label>
      <label data-selected={plan.method === 'ship'}><input type="radio" name="insertion-method" value="ship"
        checked={plan.method === 'ship'} disabled={!campaignAccess.allowed || !surfaceCapable}
        onChange={() => onChange({ ...plan, method: 'ship' })} />
        <span><strong>Poser le vaisseau</strong><small>{surfaceCapable
          ? 'Débarquement direct. Le bruit et la coque révèlent la zone d’arrivée.'
          : 'Cette coque reste en orbite. Choisis une coque compatible pour te poser.'}</small></span></label>
    </fieldset>
    {plan.method === 'ship' && <fieldset disabled={busy || !campaignAccess.allowed || !surfaceCapable} className={styles.energy}>
      <legend>Camouflage d’approche</legend>
      <label><input type="checkbox" aria-label="Camouflage optique du vaisseau" checked={!!plan.shipCloak}
        disabled={!plan.shipCloak && !cloakAffordable}
        onChange={event => onChange({ version: 1, method: 'ship', team: plan.team,
          ...(event.target.checked ? { shipCloak: true } : {}) })} />
        <span><strong>Activer avant la descente</strong><small>La coque est moins visible. Les moteurs et la proximité peuvent encore signaler l’arrivée.</small></span></label>
      <p data-insertion-energy="true" data-charge={charge ?? 'unavailable'} data-after-cloak={cloakAffordable ? charge! - SHIP_INSERTION_ENERGY.cloakCost : 'unavailable'}>
        Énergie auxiliaire : <strong>{charge ?? 'indisponible'} / {SHIP_INSERTION_ENERGY.capacity}</strong>.
        {' '}Un cycle de camouflage consomme {SHIP_INSERTION_ENERGY.cloakCost} ; {SHIP_INSERTION_ENERGY.safetyReserve} restent réservés.
        {plan.shipCloak && cloakAffordable && <> Après l’approche : <strong>{charge! - SHIP_INSERTION_ENERGY.cloakCost} / {SHIP_INSERTION_ENERGY.capacity}</strong>.</>}
      </p>
      {!cloakAffordable && <p className={styles.notice}>Recharge la réserve ou pars sans camouflage. L’arrivée reste possible sans cette option.</p>}
      {charge !== null && charge < SHIP_INSERTION_ENERGY.capacity && <button type="button" className="ghost-button"
        disabled={clanMarks < SHIP_INSERTION_ENERGY.rechargeMarks} onClick={() => onRecharge(shipId, charge)}>
        Recharger le vaisseau · {SHIP_INSERTION_ENERGY.rechargeMarks} marques
      </button>}
      <p>Le cycle est débité au départ confirmé. Passer ou reprendre la cinématique ne consomme rien de plus. Le camouflage se coupe avant le posé pour le débarquement.</p>
    </fieldset>}
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
      <strong>{plan.method === 'ship' ? plan.shipCloak ? 'Signature visuelle atténuée' : 'Zone d’arrivée signalée' : plan.team === 'triad' ? 'Trois signatures de descente' : 'Approche discrète'}</strong>
      <p>{pressure.extraPatrols > 0
        ? `Jusqu’à ${pressure.extraPatrols} ennemis supplémentaires sur des positions praticables, et ${pressure.searchSeconds} secondes de recherche autour de l’insertion.`
        : 'Aucune patrouille ajoutée par l’insertion. Les rencontres habituelles restent présentes.'}</p>
      {plan.method === 'ship' && <p>{plan.shipCloak
        ? 'Le camouflage réduit les patrouilles et l’alerte initiales. Des indices d’arrivée subsistent : éloigne-toi de la zone pour reprendre l’avantage.'
        : 'Les ennemis connaissent le point d’atterrissage. Romps leur ligne de vue et quitte la zone pour reprendre l’avantage.'}</p>}
    </div>
    {campaignAccess.allowed && <div className={styles.roster} aria-label="Préparation des compagnons">
      {TRIO_MEMBERS.map(member => {
        const entry = roster?.members.find(candidate => candidate.id === member.id);
        const assigned = entry?.assignedShipId === shipId;
        const unavailable = entry && entry.availability !== 'ready';
        const careCost = unavailable ? EXPEDITION_CARE_COST[entry.availability as 'recovering' | 'missing'] : 0;
        return <article key={member.id} data-expedition-member={member.id} data-availability={entry?.availability ?? 'unrecruited'}
          data-assigned-ship={entry ? entry.assignedShipId ?? 'reserve' : 'unrecruited'}>
          <h3>{member.name}<small>{member.role}</small></h3>
          <p>{!entry ? member.invitation : entry.availability === 'missing' ? 'Resté sur le terrain. Un rapatriement du clan est nécessaire avant les soins.'
            : entry.availability === 'recovering' ? 'Rapatrié, en attente de soins avant le prochain départ.'
              : assigned ? 'Prêt à embarquer dans le vaisseau sélectionné.' : 'Disponible pour une prochaine affectation.'}</p>
          {entry && <p>{entry.assignedShipId === null
            ? 'En réserve : recruté, sans affectation à un vaisseau.'
            : `Affecté à : ${shipForId(entry.assignedShipId).name}.`}</p>}
          {assigned && <span className={styles.ready}>Affectation confirmée</span>}
          <div className={styles.rosterActions}>
            {!entry && <button type="button" className="ghost-button" disabled={busy} onClick={() => onRecruit(member.id)}>
              Recruter {member.name}
            </button>}
            {unavailable && <button type="button" className="ghost-button" disabled={busy || clanMarks < careCost}
              onClick={() => onCare(member.id, entry.availability as 'recovering' | 'missing')}>
              {entry.availability === 'missing' ? 'Rapatriement du clan' : 'Soins du clan'} · {careCost} marques
            </button>}
            {entry && !unavailable && !assigned && <button type="button" className="ghost-button" disabled={busy}
              onClick={() => onAssign(member.id, shipId)}>
              Affecter au vaisseau
            </button>}
            {entry?.assignedShipId && <button type="button" className="ghost-button" disabled={busy}
              onClick={() => onReserve(member.id, entry.assignedShipId!)}>
              Mettre en réserve
            </button>}
          </div>
        </article>;
      })}
      {plan.team === 'triad' && !ready && <p className={styles.notice}>Prépare les deux compagnons et affecte-les à cette coque pour partir en trio.</p>}
      <p className={styles.care}>Le recrutement ne crée aucune affectation de bord. Affecte chaque partenaire au vaisseau choisi avant le départ ; une mise en réserve conserve son recrutement et ses soins éventuels.
        {' '}En mission : ordres de suivi ou d’attente, assistance au combat et stabilisation avec une charge de médicomp. Rassemble les trois chasseurs au point d’extraction. Solde : {clanMarks} marques.</p>
    </div>}
  </section>;
}
