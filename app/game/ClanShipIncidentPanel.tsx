'use client';

import { memo, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { SaveGame } from './types';
import { useMenuGamepad } from './useMenuGamepad';
import ClanShipTrophyTelemetry from './ClanShipTrophyTelemetry';
import { CLAN_SHIP_INTERIOR_ROOMS } from './systems/clanShipInterior';
import {
  CLAN_SHIP_INCIDENTS, actClanShipIncident, actClanShipTrophyHearing, clanShipIncidentInReach, clanShipIncidentNext,
  clanShipIncidentVariant, clanShipIncidentView, evaluateClanShipIncidentOffer, evaluateClanShipIncidentPresence, inspectClanShipIncidents,
  type ClanShipIncidentAction, type ClanShipIncidentCommand, type ClanShipIncidentObservation,
  type ClanShipIncidentTarget, type ClanShipIncidentView,
} from './systems/clanShipIncidents';
import { CLAN_SHIP_TROPHY_CASE, CLAN_SHIP_TROPHY_CONCLUSIONS, clanShipTrophyConclusion } from './systems/clanShipTrophyCase';
import {
  CLAN_SHIP_TROPHY_TELEMETRY, clanShipTrophyHearingNext, clanShipTrophyHearingPresence, clanShipTrophyHearingView, inspectClanShipTrophyHearing,
  type ClanShipTrophyHearingAction, type ClanShipTrophyHearingCommand,
} from './systems/clanShipTrophyHearing';
import styles from './ClanShipIncidentPanel.module.css';

export interface ClanShipIncidentControlled {
  save: SaveGame;
  onAction: (action: ClanShipIncidentAction, observation: ClanShipIncidentObservation) => boolean;
  onHearingAction?: (action: ClanShipTrophyHearingAction, observation: ClanShipIncidentObservation) => boolean;
}

export function submitClanShipTrophyHearing(controlled: ClanShipIncidentControlled, command: ClanShipTrophyHearingCommand,
  observation: ClanShipIncidentObservation | null, active: boolean): { accepted: boolean; message: string } {
  if (!controlled.onHearingAction) return { accepted: false, message: 'L’audience attend le registre de campagne.' };
  const action = { ...command, ownerCreatedAt: controlled.save.createdAt,
    expectedRevision: controlled.save.clanShipTrophyHearing?.revision ?? 0 } as ClanShipTrophyHearingAction;
  const result = actClanShipTrophyHearing(action, { save: controlled.save, active, observation });
  if (!result.accepted || !observation) return { accepted: false, message: result.message };
  if (!result.changed) return { accepted: true, message: result.message };
  return controlled.onHearingAction(action, observation) ? { accepted: true, message: result.message }
    : { accepted: false, message: 'L’audience n’a pas été enregistrée. Consulte l’état de sauvegarde puis reprends depuis le dossier relu.' };
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
  if (next.type === 'conclude-provenance') return <div className={styles.conclusions} aria-label="Conclusions motivées du dossier C-37">
    {CLAN_SHIP_TROPHY_CONCLUSIONS.map(choice => <button type="button" key={choice.id} disabled={disabled}
      data-incident-action={`contested-trophy:conclude-provenance:${choice.id}`}
      onClick={() => onAction({ incidentId: 'contested-trophy', type: 'conclude-provenance', conclusion: choice.id })}>
      <strong>{choice.label}</strong><span>{choice.reason}</span>
    </button>)}
  </div>;
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

export function ClanShipTrophyEvidence({ view }: { view: ClanShipIncidentView }) {
  const trophy = view.trophy;
  if (!trophy) return null;
  const conclusion = clanShipTrophyConclusion(trophy.conclusion);
  return <section className={styles.evidence} aria-label="Preuves conservées du trophée C-37" data-trophy-case-evidence>
    <dl className={styles.readings}>
      <div><dt>Support C-37</dt><dd data-trophy-clue="support">{trophy.supportRead ? CLAN_SHIP_TROPHY_CASE.support : 'Strie et ligature à examiner à la galerie.'}</dd></div>
      <div><dt>Relevé de chasse</dt><dd data-trophy-clue="hunt">{trophy.huntReportRead ? CLAN_SHIP_TROPHY_CASE.huntReport : 'C-37/01 à consulter à la console des archives.'}</dd></div>
      <div><dt>Relevé de transfert</dt><dd data-trophy-clue="transfer">{trophy.transferRecordRead ? CLAN_SHIP_TROPHY_CASE.transferRecord : 'C-37/02 à consulter au catalogue de la galerie.'}</dd></div>
      <div><dt>Témoignage conservé</dt><dd data-trophy-clue="testimony">{trophy.testimonyHeard ? CLAN_SHIP_TROPHY_CASE.testimony : 'Balafre de Cendre doit être présent pour être entendu.'}</dd></div>
    </dl>
    {trophy.reviewRequired && <p className={styles.note} data-trophy-review={trophy.reviewRequired}>La proposition reste ouverte. Relis {trophy.reviewRequired === 'hunt-report' ? 'C-37/01 aux archives' : 'C-37/02 à la galerie'} ; les preuves déjà obtenues sont conservées.</p>}
    {conclusion && 'plaque' in conclusion && <div className={styles.chronicle} data-trophy-conclusion={conclusion.id}>
      <strong>Chronique du dossier C-37</strong><p>{conclusion.plaque}</p>
      <small>Motif inscrit : {conclusion.reason}</small>
      {trophy.traceReaction && <blockquote data-trophy-reaction="cold-trace"><small>Réponse enregistrée aux archives du dossier</small>{conclusion.traceReply}</blockquote>}
      {trophy.veteranReaction ? <blockquote data-trophy-reaction="ash-scar"><small>Réponse enregistrée lors de la présentation</small>{conclusion.veteranReply}</blockquote>
        : <p>Le relevé attend encore la réponse de Balafre avant clôture.</p>}
    </div>}
  </section>;
}

export default memo(function ClanShipIncidentPanel({ controlled, suspended, position, observe, onNavigate, onExit }: {
  controlled: ClanShipIncidentControlled; suspended: boolean; position: ClanShipIncidentObservation;
  observe: () => ClanShipIncidentObservation | null; onNavigate: (target: ClanShipIncidentTarget) => void;
  onExit?: () => void;
}) {
  const [open, setOpen] = useState(false), [status, setStatus] = useState('');
  const [focused, setFocused] = useState(false);
  const rootRef = useRef<HTMLDetailsElement>(null);
  const pendingFocusRef = useRef(false);
  const { save } = controlled;
  const exit = () => { setFocused(false); if (rootRef.current) rootRef.current.open = false; onExit?.(); };
  useMenuGamepad(rootRef, open && focused && !suspended, `${save.createdAt}:clan-incidents`, exit);
  useLayoutEffect(() => {
    if (!pendingFocusRef.current || suspended) return;
    pendingFocusRef.current = false;
    const root = rootRef.current;
    const count = clanShipTrophyHearingView(save.clanShipTrophyHearing).recordedSampleIds.length;
    const nextSample = CLAN_SHIP_TROPHY_TELEMETRY[count]?.id;
    const target = root?.querySelector<HTMLElement>('[data-trophy-hearing-action]:not(:disabled)') ??
      (nextSample ? root?.querySelector<HTMLElement>(`[data-telemetry-select="${nextSample}"]:not(:disabled)`) : null) ??
      root?.querySelector<HTMLElement>('[data-clan-incident="contested-trophy"] [data-incident-action]:not(:disabled)') ??
      root?.querySelector<HTMLElement>('[data-clan-incident="contested-trophy"] [data-incident-guide]:not(:disabled)');
    target?.focus({ preventScroll: true });
  }, [save.clanShipTrophyHearing, save.clanShipIncidents?.revision, suspended]);
  const inspected = useMemo(() => inspectClanShipIncidents(save.clanShipIncidents, save.createdAt), [save.clanShipIncidents, save.createdAt]);
  const inspectedHearing = useMemo(() => inspectClanShipTrophyHearing(save.clanShipTrophyHearing, save.createdAt), [save.clanShipTrophyHearing, save.createdAt]);
  const hearing = clanShipTrophyHearingView(inspectedHearing.state);
  const protectedHearing = inspectedHearing.status === 'invalid-save' || inspectedHearing.status === 'future-version';
  const protectedState = inspected.status === 'invalid-save' || inspected.status === 'future-version';
  const views = CLAN_SHIP_INCIDENTS.map(definition => clanShipIncidentView(inspected.state, definition.id));
  const ongoing = views.filter(view => view.accepted && view.completedRevision === null).length;
  const act = (command: ClanShipIncidentCommand) => {
    const result = submitClanShipIncident(controlled, command, observe(), !suspended && !protectedState);
    pendingFocusRef.current = result.accepted && command.incidentId === 'contested-trophy'; setStatus(result.message);
  };
  const actHearing = (command: ClanShipTrophyHearingCommand) => {
    const result = submitClanShipTrophyHearing(controlled, command, observe(), !suspended && !protectedState && !protectedHearing);
    pendingFocusRef.current = result.accepted; setStatus(result.message);
  };
  const navigate = (target: ClanShipIncidentTarget) => { setFocused(false); onNavigate(target); onExit?.(); };
  return <details ref={rootRef} className={styles.panel} data-clan-incident-panel onToggle={event => setOpen(event.currentTarget.open)}
    onFocusCapture={() => setFocused(true)} onBlurCapture={event => {
      if (!(event.relatedTarget instanceof Node) || !event.currentTarget.contains(event.relatedTarget)) setFocused(false);
    }} onKeyDown={event => { if (event.key === 'Escape' && !suspended) { event.preventDefault(); event.stopPropagation(); exit(); } }}>
    <summary><span>Incidents du bord <small>Confinement, circuits et mémoire du clan</small></span><span>{ongoing} intervention{ongoing > 1 ? 's' : ''} en cours</span></summary>
    {open && <div className={styles.body}>
      {onExit && <button type="button" disabled={suspended} onClick={exit}>Reprendre le déplacement · B / Échap</button>}
      <p className={styles.lead}>Les indices et commandes appartiennent aux objets du pont. Rejoins leur point de contrôle puis confirme l’action à portée. Une erreur conserve un passage sûr et un dossier reprenable.</p>
      {protectedState && <p className={styles.failure}>Le registre doit être récupéré avant une intervention.</p>}
      <div className={styles.grid}>{CLAN_SHIP_INCIDENTS.map((definition, index) => {
        const view = views[index], next = clanShipIncidentNext(view, save), variant = clanShipIncidentVariant(save.createdAt, definition.id);
        const offer = evaluateClanShipIncidentOffer(save, definition.id), near = !!next && clanShipIncidentInReach(position, next.target);
        const presence = next ? evaluateClanShipIncidentPresence(save, definition.id, next.type) : { allowed: true, reason: '' };
        const hearingNext = definition.id === 'contested-trophy' && controlled.onHearingAction ? clanShipTrophyHearingNext(save) : null;
        const hearingNear = !!hearingNext && clanShipIncidentInReach(position, hearingNext.target);
        const hearingPresence = definition.id === 'contested-trophy' && hearing.gathered && !hearing.completed ? clanShipTrophyHearingPresence(save) : null;
        const active = !suspended && !protectedState && (definition.id !== 'contested-trophy' || !protectedHearing) && (view.accepted || offer.allowed) && presence.allowed;
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
            </dl> : definition.id === 'contested-trophy' ? <ClanShipTrophyEvidence view={view} /> : <>
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
            {view.faults > 0 && <p className={styles.note}>{definition.id === 'contested-trophy'
              ? `${view.faults} proposition${view.faults > 1 ? 's' : ''} renvoyée${view.faults > 1 ? 's' : ''} aux preuves. Aucun trophée de ta collection n’a été déplacé.`
              : `${view.faults} test${view.faults > 1 ? 's' : ''} repris. Les indices et le composant déjà obtenus restent conservés.`}</p>}
          </>}
          {definition.id === 'contested-trophy' && inspectedHearing.state && <section className={styles.hearing}
            data-trophy-hearing-phase={hearing.completed ? 'completed' : hearing.concluded ? 'concluded' : hearing.ready ? 'ready' : hearing.gathered ? 'gathered' : 'inviting'}>
            <strong>Audience devant le support C-37</strong>
            <ul>{(['ash-scar', 'cold-trace'] as const).map(id => <li key={id} data-hearing-invited={id}>
              {id === 'ash-scar' ? 'Balafre de Cendre' : 'Trace Froide'} · {hearing.invitedWitnessIds.includes(id) ? 'invitation confirmée' : 'à inviter à son poste'}
            </li>)}</ul>
            <p>{hearing.completed ? 'Restitution commune consignée. Les témoins ont repris leur poste.' : hearing.gathered
              ? 'Les deux invitations sont confirmées. Les témoins disponibles t’attendent à la galerie pour relire les traces ensemble.'
              : 'Invite chaque témoin en personne, puis retrouve-les à la galerie.'}</p>
            {hearingPresence && !hearingPresence.allowed && <p className={styles.failure}>{hearingPresence.reason}</p>}
          </section>}
          {definition.id === 'contested-trophy' && protectedHearing && <p className={styles.failure}>Le registre d’audience doit être récupéré avant de poursuivre ce dossier.</p>}
          {hearingNext ? <div className={styles.next} data-clan-trophy-hearing><strong>{hearingNext.label}</strong>
            <p>{hearingNext.target.label} · {CLAN_SHIP_INTERIOR_ROOMS[hearingNext.target.roomId].label}</p>
            <button type="button" disabled={suspended || protectedState || protectedHearing} data-hearing-guide
              data-incident-guide={hearingNext.target.id} onClick={() => navigate(hearingNext.target)}>
              {position.roomId === hearingNext.target.roomId ? `Approcher : ${hearingNext.target.label}` : `Rejoindre : ${CLAN_SHIP_INTERIOR_ROOMS[hearingNext.target.roomId].label}`}</button>
            {hearingNext.command.type === 'invite' ? <button type="button" disabled={suspended || protectedState || protectedHearing || !hearingNear}
              data-trophy-hearing-action={`invite:${hearingNext.command.witnessId}`} onClick={() => actHearing(hearingNext.command)}>{hearingNext.label}</button>
              : <ClanShipTrophyTelemetry recordedSampleIds={hearing.recordedSampleIds} disabled={suspended || protectedState || protectedHearing || !hearingNear || !!hearingPresence && !hearingPresence.allowed}
                onRecord={sampleId => actHearing({ type: 'record-sample', sampleId })} />}
            {!hearingNear && <small>L’invitation et la lecture attendent ta présence à ce poste.</small>}
          </div> : next ? <div className={styles.next}><strong>{next.label}</strong><p>{next.target.label} · {CLAN_SHIP_INTERIOR_ROOMS[next.target.roomId].label}</p>
            <button type="button" disabled={suspended || protectedState} data-incident-guide={next.target.id} onClick={() => navigate(next.target)}>
              {position.roomId === next.target.roomId ? `Approcher : ${next.target.label}` : `Rejoindre : ${CLAN_SHIP_INTERIOR_ROOMS[next.target.roomId].label}`}</button>
            <ClanShipIncidentActions view={view} disabled={!active || !near} onAction={act} />
            {!presence.allowed && <small>{presence.reason}</small>}
            {!near && <small>La commande attend ta présence devant cet objet.</small>}
          </div> : <p className={styles.success}>Dossier contrôlé · {definition.reward} marques déjà attribuées. L’état du lieu reste enregistré.</p>}
          {view.lastMessage && <p className={styles.latest}>{view.lastMessage}</p>}
        </article>;
      })}</div>
      <p className={styles.status} role="status" aria-live="polite">{status || 'La fermeture des panneaux ou le départ du pont conserve la progression sans faire avancer les tests.'}</p>
    </div>}
  </details>;
});
