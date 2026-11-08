'use client';

/* eslint-disable @next/next/no-img-element -- preserve measured native incident props */
import { memo, useMemo } from 'react';
import type { SaveGame } from './types';
import type { ClanShipRoomId } from './systems/clanShipDocking';
import { CLAN_SHIP_INCIDENT_ART } from './clanShipIncidentArt';
import {
  CLAN_SHIP_INCIDENTS, clanShipIncidentInReach, clanShipIncidentNext, clanShipIncidentVariant, clanShipIncidentView, evaluateClanShipIncidentPresence, inspectClanShipIncidents,
  type ClanShipIncidentCommand, type ClanShipIncidentObservation, type ClanShipIncidentTarget, type ClanShipIncidentView,
} from './systems/clanShipIncidents';
import { CLAN_SHIP_TROPHY_CASE, clanShipTrophyConclusion } from './systems/clanShipTrophyCase';
import { ClanShipIncidentActions } from './ClanShipIncidentPanel';
import styles from './ClanShipIncidentScene.module.css';

export default memo(function ClanShipIncidentScene({ save, roomId, position, suspended, onNavigate, onAction }: {
  save: SaveGame; roomId: ClanShipRoomId; position: ClanShipIncidentObservation; suspended: boolean;
  onNavigate: (target: ClanShipIncidentTarget) => void; onAction: (command: ClanShipIncidentCommand) => void;
}) {
  const state = useMemo(() => inspectClanShipIncidents(save.clanShipIncidents, save.createdAt).state, [save.clanShipIncidents, save.createdAt]);
  if (!state) return null;
  return <>{CLAN_SHIP_INCIDENTS.map(definition => {
    const view = clanShipIncidentView(state, definition.id), variant = clanShipIncidentVariant(save.createdAt, definition.id), next = clanShipIncidentNext(view, save);
    if (!view.accepted) return null;
    if (definition.id === 'contested-trophy') return <TrophyIncidentScene key={definition.id} save={save} view={view} roomId={roomId}
      position={position} suspended={suspended} onNavigate={onNavigate} onAction={onAction} />;
    const sealed = definition.id === 'sealed-lot';
    const atProp = roomId === (sealed ? 'hangar' : 'conseil');
    const art = sealed ? CLAN_SHIP_INCIDENT_ART.sealedIsolator : CLAN_SHIP_INCIDENT_ART.twinCircuitRelay;
    const x = sealed ? 1060 : 350, y = sealed ? 560 : 550, width = sealed ? 110 : 105, height = sealed ? 210 : 205;
    const scale = Math.min(width / art.alphaBounds.width, height / art.alphaBounds.height);
    const near = !!next && clanShipIncidentInReach(position, next.target);
    return <div key={definition.id} className={styles.incident} data-clan-incident-world={definition.id}>
      {atProp && <div className={styles.prop} data-clan-incident-prop={definition.id} data-incident-complete={view.completedRevision !== null}
        style={{ left: x, top: y, zIndex: y }}>
        <img src={art.src} alt="" draggable={false} decoding="async" style={{ position: 'absolute', left: -art.pivot.x * scale, top: -art.pivot.y * scale,
          width: art.sourceWidth * scale, height: art.sourceHeight * scale, maxWidth: 'none' }} />
        <div className={styles.readout}>
          <strong>{sealed ? `Lot ${variant.lotCode}` : 'Relais R-2'}</strong>
          {sealed ? <><span>{view.completedRevision ? 'FERMETURE CONTRÔLÉE' : 'TÉMOIN FERMÉ / RETOUR OUVERT'}</span>
            <div className={styles.lamps}>{(['A', 'B'] as const).map(branch => <span key={branch} data-isolated={view.isolatedBranch === branch} data-wrong={view.chosenBranch === branch && !view.isolatedBranch}>Isolateur {branch}<i /></span>)}</div>
            <em>{view.completedRevision ? 'Restriction levée' : view.pressureChecked ? 'Pression nulle · fermeture attendue' : 'Lot restreint · coursive libre'}</em></>
            : <><div className={styles.lamps}>{(['A', 'B'] as const).map(branch => <span key={branch} data-stable={view.restored.includes(branch)} data-isolated={view.isolatedBranch === branch && !view.restored.includes(branch)}>
              {branch}<i /><small>{variant.cycles[branch]}</small></span>)}</div>
              <em>{view.restored.length}/2 circuits stables · {view.component === 'installed' ? 'R-2 en place' : 'composant à remplacer'}</em></>}
        </div>
      </div>}
      {roomId === 'armurerie' && !sealed && view.isolatedBranch && <div className={styles.component} data-incident-component={view.component} style={{ left: 1010, top: 574, zIndex: 581 }}>
        <strong>CASIER R-2</strong><span>{view.component === 'absent' ? 'Composant réservé · 1 pièce' : view.component === 'carried' ? 'Composant prélevé' : 'Composant installé au relais'}</span>
      </div>}
      {roomId === 'soins' && sealed && view.isolatedBranch && <div className={styles.component} data-incident-pressure={view.pressureChecked ? 'zero' : 'unchecked'} style={{ left: 1030, top: 548, zIndex: 551 }}>
        <strong>PRESSION DU LOT</strong><span>{view.pressureChecked ? '0 · mesure enregistrée' : 'Contrôle en attente'}</span>
      </div>}
      {next?.target.roomId === roomId && <div className={styles.target} style={{ left: next.target.x, top: next.target.y + 10, zIndex: 900 }} data-incident-world-target={next.target.id}>
        <button type="button" disabled={suspended} data-incident-object-approach={next.target.id} onClick={() => onNavigate(next.target)}>{next.target.label} · {near ? 'à portée' : 'approcher'}</button>
        {near && <ClanShipIncidentActions view={view} disabled={suspended} onAction={onAction} />}
      </div>}
    </div>;
  })}</>;
});

/** The authored workbench and catalogue remain the actual support objects.
 * These exact inscription overlays are evidence, not a new trophy asset. */
function TrophyIncidentScene({ save, view, roomId, position, suspended, onNavigate, onAction }: {
  save: SaveGame; view: ClanShipIncidentView; roomId: ClanShipRoomId; position: ClanShipIncidentObservation; suspended: boolean;
  onNavigate: (target: ClanShipIncidentTarget) => void; onAction: (command: ClanShipIncidentCommand) => void;
}) {
  const trophy = view.trophy!, next = clanShipIncidentNext(view, save), conclusion = clanShipTrophyConclusion(trophy.conclusion);
  const near = !!next && clanShipIncidentInReach(position, next.target);
  const presence = next ? evaluateClanShipIncidentPresence(save, view.id, next.type) : { allowed: true, reason: '' };
  const choices = next?.type === 'conclude-provenance';
  const sharedObject = next && (['sealed-lot', 'relay-fault'] as const).some(id => {
    const otherView = clanShipIncidentView(save.clanShipIncidents, id), other = clanShipIncidentNext(otherView, save);
    return otherView.accepted && other?.target.roomId === next.target.roomId && Math.abs(other.target.x - next.target.x) < 280;
  });
  return <div className={styles.incident} data-clan-incident-world="contested-trophy">
    {roomId === 'trophees' && <>
      <div className={styles.trophySupport} data-clan-incident-prop="contested-trophy" data-trophy-plaque={trophy.conclusion ?? 'disputed'}
        data-incident-complete={view.completedRevision !== null} style={{ left: 820, top: 580, zIndex: 581 }}>
        <strong>SUPPORT {CLAN_SHIP_TROPHY_CASE.id}</strong>
        <svg viewBox="0 0 180 58" role="img" aria-label="Strie B-17 sous la ligature de transport T-04">
          <rect x="5" y="3" width="170" height="50" rx="5" fill="#374140" stroke="#a7aa88" />
          <path d="M35 14V44M48 14L36 27M48 31L36 44" fill="none" stroke="#e5d9b2" strokeWidth="3" />
          <text x="58" y="34" fill="#f0e9ca" fontSize="17">B-17</text>
          <path d="M126 3V53M132 3V53" stroke="#bd8e4d" strokeWidth="4" />
          <text x="141" y="32" fill="#efd1a1" fontSize="11">T-04</text>
        </svg>
        <span>Strie de base · ligature ajoutée</span>
        {conclusion && 'plaque' in conclusion ? <p>{view.completedRevision ? 'Inscription confirmée' : 'Inscription soumise'} : {conclusion.plaque}</p>
          : <p>Provenance à confronter aux deux relevés.</p>}
      </div>
      <div className={styles.component} data-trophy-record="transfer" style={{ left: 400, top: 508, zIndex: 566 }}>
        <strong>C-37/02 · TRANSFERT</strong><span>{trophy.transferRecordRead ? 'Portage T-04 · relevé conservé' : 'Registre du retour à comparer'}</span>
      </div>
    </>}
    {roomId === 'archives' && <div className={styles.component} data-trophy-record="hunt" style={{ left: 390, top: 498, zIndex: 556 }}>
      <strong>C-37/01 · CHASSE</strong><span>{trophy.huntReportRead ? 'Prélèvement B-17 · relevé conservé' : 'Rapport antérieur au transfert'}</span>
    </div>}
    {next?.target.roomId === roomId && <div className={`${styles.target} ${choices ? styles.trophyChoices : ''}`}
      style={{ left: next.target.x, top: next.target.y + (choices && near ? -280 : sharedObject ? -110 : 10), zIndex: 900 }} data-incident-world-target={next.target.id}>
      <button type="button" disabled={suspended} data-incident-object-approach={next.target.id} onClick={() => onNavigate(next.target)}>
        {next.target.label} · {near ? 'à portée' : 'approcher'}</button>
      {near && <ClanShipIncidentActions view={view} disabled={suspended || !presence.allowed} onAction={onAction} />}
      {!presence.allowed && <small className={styles.absent}>{presence.reason}</small>}
    </div>}
  </div>;
}
