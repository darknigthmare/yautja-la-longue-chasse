"use client";

import { useState } from 'react';
import type { SaveGame } from './types';
import type { ClanShipRoomId } from './systems/clanShipDocking';
import { CLAN_SHIP_INTERIOR_ROOMS } from './systems/clanShipInterior';
import {
  CLAN_SHIP_INCIDENTS, clanShipIncidentTarget, evaluateClanShipIncident, getClanShipIncidentStep,
  type ClanShipIncidentAction, type ClanShipIncidentId, type ClanShipIncidentsState,
} from './systems/clanShipIncidents';
import styles from './ClanShipOperationsPanel.module.css';

interface Props {
  state: ClanShipIncidentsState;
  save: SaveGame;
  roomId: ClanShipRoomId;
  suspended: boolean;
  onAction: (action: ClanShipIncidentAction) => boolean;
  onNavigate: (roomId: ClanShipRoomId) => void;
}

/** Mission orders are issued here; physical evidence is gathered in Interior. */
export default function ClanShipIncidentsBoard({ state, save, roomId, suspended, onAction, onNavigate }: Props) {
  const [selectedId, setSelectedId] = useState<ClanShipIncidentId>(state.activeIncident?.incidentId ?? 'seal-discrepancy');
  const [feedback, setFeedback] = useState('');
  const selected = CLAN_SHIP_INCIDENTS.find(incident => incident.id === selectedId)!;
  const selectedAccess = evaluateClanShipIncident(state, selectedId, save);
  const active = CLAN_SHIP_INCIDENTS.find(incident => incident.id === state.activeIncident?.incidentId);
  const step = getClanShipIncidentStep(state);
  const target = step ? clanShipIncidentTarget(step.targetId) : null;
  const completed = new Set(state.completedIncidents.map(receipt => receipt.incidentId));
  const canIssue = roomId === 'conseil' || roomId === selected.originRoomId;
  const act = (action: ClanShipIncidentAction) => {
    if (suspended) return;
    setFeedback(onAction(action) ? 'Dossier actualisé. Rejoins l’objet indiqué sur le pont.'
      : 'L’intervention attend confirmation. Consulte le message du bord puis réessaie.');
  };

  return <section aria-label="Interventions et vie à bord" data-clan-incidents-board data-clan-incidents-revision={state.revision}>
    <div className={styles.sectionLead}>
      <span className={styles.eyebrow}>VIE À BORD</span><h3>Le clan compte sur ceux qui restent au pont.</h3>
      <p>Une cargaison à vérifier, un relais à réparer, un récit à éclaircir, un retour à préparer. Accepte une intervention, approche les objets indiqués et confronte les indices recueillis dans les salles.</p>
    </div>
    {active && state.activeIncident && step && target && <article className={styles.activeContract} data-clan-active-incident={active.id}>
      <span className={styles.eyebrow}>INTERVENTION EN COURS</span><h3>{active.name}</h3>
      <div className={styles.step}><strong>{step.label}</strong><p>{step.description}</p>
        <span>{CLAN_SHIP_INTERIOR_ROOMS[target.roomId].label} · étape {state.activeIncident.stepIndex + 1} / {active.steps.length}</span>
        <button type="button" className={styles.primary} disabled={suspended} data-clan-incident-route={target.roomId}
          onClick={() => onNavigate(target.roomId)}>Rejoindre l’objet sur le pont</button>
      </div>
      {state.activeIncident.stepIndex > 0 && <details className={styles.incidentEvidence}>
        <summary>Relire les indices et interventions enregistrés</summary>
        <ol className={styles.missionSteps}>{active.steps.slice(0, state.activeIncident.stepIndex).map(previous =>
          <li key={previous.id}><strong>{previous.label}</strong><span>{previous.evidence}</span></li>)}</ol>
      </details>}
      {active.id === 'return-transfer' && <p className={styles.notice}>Accompagne le chasseur jusqu’aux soins. Les passages confirmés servent de points de reprise ; attends qu’il te rejoigne avant de franchir la porte.</p>}
      <button type="button" className={styles.quiet} disabled={suspended} data-clan-cancel-incident
        onClick={() => act({ type: 'cancel-incident', expectedRevision: state.revision })}>Interrompre cette intervention sans récompense</button>
    </article>}
    <div className={styles.operationLayout}>
      <section className={styles.catalogue} aria-label="Dossiers d’intervention">
        {CLAN_SHIP_INCIDENTS.map(incident => {
          const access = evaluateClanShipIncident(state, incident.id, save);
          return <button key={incident.id} type="button" disabled={suspended} className={styles.contractCard}
            aria-pressed={selectedId === incident.id} data-clan-incident-card={incident.id} onClick={() => setSelectedId(incident.id)}>
            <span>Intervention à bord</span><strong>{incident.name}</strong><small>{incident.summary}</small>
            <em>{completed.has(incident.id) ? 'Accomplie' : active?.id === incident.id ? 'En cours' : access.allowed ? 'Disponible' : 'Condition à remplir'}</em>
          </button>;
        })}
      </section>
      <article className={styles.briefing} data-clan-incident-detail={selected.id}>
        <span className={styles.eyebrow}>DOSSIER DU BORD</span><h3>{selected.name}</h3><p>{selected.briefing}</p>
        <dl><div><dt>Premier poste</dt><dd>{CLAN_SHIP_INTERIOR_ROOMS[selected.originRoomId].label}</dd></div>
          <div><dt>Récompense unique</dt><dd>{selected.clanMarksReward} marques de clan, après la dernière étape confirmée</dd></div>
          <div><dt>Interventions</dt><dd>{selected.steps.length} étapes dans le vaisseau</dd></div>
        </dl>
        <p className={styles.availability}>{selectedAccess.reason}</p>
        {canIssue ? <button type="button" className={styles.primary} disabled={suspended || !selectedAccess.allowed}
          data-clan-start-incident={selected.id} onClick={() => act({ type: 'start-incident', incidentId: selected.id, expectedRevision: state.revision })}>
          {completed.has(selected.id) ? 'Dossier accompli' : active?.id === selected.id ? 'Intervention en cours' : 'Accepter cette intervention'}
        </button> : <button type="button" className={styles.secondary} disabled={suspended} data-clan-incident-issue-route={selected.originRoomId}
          onClick={() => onNavigate(selected.originRoomId)}>Rejoindre le premier poste</button>}
      </article>
    </div>
    <p role="status" aria-live="polite">{feedback}</p>
  </section>;
}
