'use client';

/* eslint-disable @next/next/no-img-element -- preserve measured native incident props */
import { memo, useMemo } from 'react';
import type { SaveGame } from './types';
import type { ClanShipRoomId } from './systems/clanShipDocking';
import { CLAN_SHIP_INCIDENT_ART } from './clanShipIncidentArt';
import {
  CLAN_SHIP_INCIDENTS, clanShipIncidentInReach, clanShipIncidentNext, clanShipIncidentVariant, clanShipIncidentView, inspectClanShipIncidents,
  type ClanShipIncidentCommand, type ClanShipIncidentObservation, type ClanShipIncidentTarget,
} from './systems/clanShipIncidents';
import { ClanShipIncidentActions } from './ClanShipIncidentPanel';
import styles from './ClanShipIncidentScene.module.css';

export default memo(function ClanShipIncidentScene({ save, roomId, position, suspended, onNavigate, onAction }: {
  save: SaveGame; roomId: ClanShipRoomId; position: ClanShipIncidentObservation; suspended: boolean;
  onNavigate: (target: ClanShipIncidentTarget) => void; onAction: (command: ClanShipIncidentCommand) => void;
}) {
  const state = useMemo(() => inspectClanShipIncidents(save.clanShipIncidents, save.createdAt).state, [save.clanShipIncidents, save.createdAt]);
  if (!state) return null;
  return <>{CLAN_SHIP_INCIDENTS.map(definition => {
    const view = clanShipIncidentView(state, definition.id), variant = clanShipIncidentVariant(save.createdAt, definition.id), next = clanShipIncidentNext(view);
    if (!view.accepted) return null;
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
