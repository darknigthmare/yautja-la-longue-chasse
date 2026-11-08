'use client';

import { memo, useMemo, useState } from 'react';
import type { SaveGame } from './types';
import { CLAN_SHIP_INTERIOR_ROOMS } from './systems/clanShipInterior';
import {
  CLAN_SHIP_INCIDENTS, actClanShipIncident, clanShipIncidentInReach, clanShipIncidentNext,
  clanShipIncidentVariant, clanShipIncidentView, evaluateClanShipIncidentOffer, inspectClanShipIncidents,
  type ClanShipIncidentAction, type ClanShipIncidentCommand, type ClanShipIncidentObservation,
  type ClanShipIncidentTarget, type ClanShipIncidentView,
} from './systems/clanShipIncidents';
import styles from './ClanShipIncidentPanel.module.css';

export interface ClanShipIncidentControlled {
  save: SaveGame;
  onAction: (action: ClanShipIncidentAction, observation: ClanShipIncidentObservation) => boolean;
}
/** A shared nonoptimistic dispatch for both world objects and the accessible
 * journal. A successful reducer is not a successful campaign write. */
export function submitClanShipIncident(controlled: ClanShipIncidentControlled, command: ClanShipIncidentCommand,
  observation: ClanShipIncidentObservation | null, active: boolean): { accepted: boolean; message: string } {
  const action = { ...command, ownerCreatedAt: controlled.save.createdAt, expectedRevision: controlled.save.clanShipIncidents?.revision ?? 0 } as ClanShipIncidentAction;
  const result = actClanShipIncident(action, { save: controlled.save, active, observation });
  if (!result.accepted || !observation) return { accepted: false, message: result.message };
  if (!result.changed) return { accepted: true, message: result.message };
  return controlled.onAction(action, observation) ? { accepted: true, message: result.message }
    : { accepted: false, message: 'La campagne n’a pas confirmé l’intervention. Consulte l’état de sauvegarde puis reprends depuis le dossier relu.' };
}

export function ClanShipIncidentActions({ view, disabled, onAction }: {
  view: ClanShipIncidentView; disabled: boolean; onAction: (command: ClanShipIncidentCommand) => void;
}) {
  const next = clanShipIncidentNext(view);
  if (!next) return null;
  if (next.type === 'isolate' || next.type === 'restore-circuit') {
    const type = next.type;
    return <div className={styles.branches}>{(['A', 'B'] as const).map(branch => <button type="button" key={branch}
      disabled={disabled || type === 'restore-circuit' && view.restored.includes(branch)}
      data-incident-action={`${view.id}:${type}:${branch}`} onClick={() => onAction({ incidentId: view.id, type, branch })}>
      {type === 'isolate' ? 'Isoler' : 'Rétablir'} {branch}{type === 'restore-circuit' && view.restored.includes(branch) ? ' · stable' : ''}</button>)}</div>;
  }
  const type = next.type;
  return <button type="button" disabled={disabled} data-incident-action={`${view.id}:${type}`}
    onClick={() => onAction({ incidentId: view.id, type })}>{next.label}</button>;
}

export default memo(function ClanShipIncidentPanel({ controlled, suspended, position, observe, onNavigate }: {
  controlled: ClanShipIncidentControlled; suspended: boolean; position: ClanShipIncidentObservation;
  observe: () => ClanShipIncidentObservation | null; onNavigate: (target: ClanShipIncidentTarget) => void;
}) {
  const [open, setOpen] = useState(false), [status, setStatus] = useState('');
  const { save } = controlled;
  const inspected = useMemo(() => inspectClanShipIncidents(save.clanShipIncidents, save.createdAt), [save.clanShipIncidents, save.createdAt]);
  const protectedState = inspected.status === 'invalid-save' || inspected.status === 'future-version';
  const views = CLAN_SHIP_INCIDENTS.map(definition => clanShipIncidentView(inspected.state, definition.id));
  const ongoing = views.filter(view => view.accepted && view.completedRevision === null).length;
  const act = (command: ClanShipIncidentCommand) => setStatus(submitClanShipIncident(controlled, command, observe(), !suspended && !protectedState).message);
  return <details className={styles.panel} data-clan-incident-panel onToggle={event => setOpen(event.currentTarget.open)}>
    <summary><span>Incidents du bord <small>Confinement et circuits</small></span><span>{ongoing} intervention{ongoing > 1 ? 's' : ''} en cours</span></summary>
    {open && <div className={styles.body}>
      <p className={styles.lead}>Les indices et commandes appartiennent aux objets du pont. Rejoins leur point de contrôle puis confirme l’action à portée. Une erreur conserve un passage sûr et un dossier reprenable.</p>
      {protectedState && <p className={styles.failure}>Le registre doit être récupéré avant une intervention.</p>}
      <div className={styles.grid}>{CLAN_SHIP_INCIDENTS.map((definition, index) => {
        const view = views[index], next = clanShipIncidentNext(view), variant = clanShipIncidentVariant(save.createdAt, definition.id);
        const offer = evaluateClanShipIncidentOffer(save, definition.id), near = !!next && clanShipIncidentInReach(position, next.target);
        const active = !suspended && !protectedState && (view.accepted || offer.allowed);
        return <article key={definition.id} className={styles.card} data-clan-incident={definition.id}
          data-incident-complete={view.completedRevision !== null} data-incident-faults={view.faults}>
          <header><span className={styles.eyebrow}>{definition.reference} · {view.completedRevision !== null ? 'RÉSOLU' : view.accepted ? 'INTERVENTION EN COURS' : 'DOSSIER DE BORD'}</span>
            <h3>{definition.name}</h3><p>{definition.briefing}</p></header>
          {!view.accepted ? <p className={styles.note}>{offer.reason} Gratification unique : {definition.reward} marques.</p> : <>
            {definition.id === 'sealed-lot' ? <dl className={styles.readings}>
              <div><dt>Témoin du lot</dt><dd>{view.witness ? `${variant.lotCode} · fermé / retour ouvert` : 'À relever au boîtier'}</dd></div>
              <div><dt>Identité confirmée</dt><dd>{view.reference ? `Conduite ${variant.branch} ; isolateur ${variant.other} pour un autre lot` : 'À lire aux archives'}</dd></div>
              <div><dt>Diagnostic</dt><dd>{view.diagnosticCurrent ? 'Rapproché du registre' : view.reference ? 'À revalider après erreur' : 'En attente'}</dd></div>
              <div><dt>Isolateur</dt><dd>{view.isolatedBranch ? `${view.isolatedBranch} · isolé` : view.chosenBranch ? `${view.chosenBranch} · refusé` : 'Aucun'}</dd></div>
              <div><dt>Pression résiduelle</dt><dd>{view.pressureChecked ? '0 · contrôle médical enregistré' : 'Mesure requise aux soins'}</dd></div>
              <div><dt>Lot</dt><dd>{view.completedRevision ? 'Restriction levée · fermeture contrôlée' : 'Sous restriction · coursive libre'}</dd></div>
            </dl> : <>
              <div className={styles.circuits}>{(['A', 'B'] as const).map(branch => <div key={branch} data-incident-circuit={branch} data-circuit-stable={view.restored.includes(branch)}>
                <strong>Circuit {branch}</strong><span>{view.witness ? variant.cycles[branch] : 'Mesure à relever'}</span>
                <em>{view.restored.includes(branch) ? 'Stable' : view.isolatedBranch === branch ? 'Isolé' : 'À contrôler'}</em>
              </div>)}</div>
              <dl className={styles.readings}>
                <div><dt>Référence</dt><dd>{view.reference ? `Isoler ${variant.branch} ; rétablir ${variant.other} puis ${variant.branch}` : 'Cycle témoin à comparer aux archives'}</dd></div>
                <div><dt>Composant R-2</dt><dd>{view.component === 'absent' ? 'Au casier de l’armurerie' : view.component === 'carried' ? 'Prélevé · à installer' : 'Installé · aucun nouveau prélèvement'}</dd></div>
                <div><dt>Circuits rétablis</dt><dd>{view.restored.length} / 2</dd></div>
              </dl>
            </>}
            {view.faults > 0 && <p className={styles.note}>{view.faults} test{view.faults > 1 ? 's' : ''} repris. Les indices et le composant déjà obtenus restent conservés.</p>}
          </>}
          {next ? <div className={styles.next}><strong>{next.label}</strong><p>{next.target.label} · {CLAN_SHIP_INTERIOR_ROOMS[next.target.roomId].label}</p>
            <button type="button" disabled={suspended || protectedState} data-incident-guide={next.target.id} onClick={() => onNavigate(next.target)}>
              {position.roomId === next.target.roomId ? `Approcher : ${next.target.label}` : `Rejoindre : ${CLAN_SHIP_INTERIOR_ROOMS[next.target.roomId].label}`}</button>
            <ClanShipIncidentActions view={view} disabled={!active || !near} onAction={act} />
            {!near && <small>La commande attend ta présence devant cet objet.</small>}
          </div> : <p className={styles.success}>Dossier contrôlé · {definition.reward} marques déjà attribuées. L’état du lieu reste enregistré.</p>}
          {view.lastMessage && <p className={styles.latest}>{view.lastMessage}</p>}
        </article>;
      })}</div>
      <p className={styles.status} role="status" aria-live="polite">{status || 'La fermeture des panneaux ou le départ du pont conserve la progression sans faire avancer les tests.'}</p>
    </div>}
  </details>;
});
