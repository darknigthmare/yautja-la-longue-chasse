'use client';

import { memo, useRef, useState } from 'react';
import type { SaveGame } from './types';
import type { ClanShipRoomId } from './systems/clanShipDocking';
import HomeworldNpcSpriteV84 from './HomeworldNpcSpriteV84';
import { useMenuGamepad } from './useMenuGamepad';
import {
  actClanShipReturnEscort, clanShipReturnEscortInReach, clanShipReturnEscortTarget,
  evaluateClanShipReturnEscortOffer, inspectClanShipReturnEscort,
  type ClanShipReturnEscortAction, type ClanShipReturnEscortCommand,
  type ClanShipReturnEscortObservation, type ClanShipReturnEscortState, type ClanShipReturnEscortTarget,
} from './systems/clanShipReturnEscort';
import styles from './ClanShipReturnEscortScene.module.css';

export interface ClanShipReturnEscortControlled {
  save: SaveGame;
  onAction: (action: ClanShipReturnEscortAction, observation: ClanShipReturnEscortObservation) => boolean;
  /** Reconcile a refused/uncertain write without claiming another movement. */
  onRetry: () => boolean;
  checkpointFailed: boolean;
}

const labels = {
  accepted: 'Choisir la voie et le poste', prepared: 'Rejoindre l’équipe au hangar',
  escorting: 'Accompagner l’équipe', 'at-medical': 'Présenter le relevé au conseil', reported: 'Retour consigné',
};

/** These are the existing individual hunter drawings, moved by the physical
 * controller. No additional walk animation or recruited companion is implied. */
export default memo(function ClanShipReturnEscortScene({ state, roomId }: {
  state: ClanShipReturnEscortState | null; roomId: ClanShipRoomId;
}) {
  if (!state) return null;
  return <>{state.actors.filter(actor => actor.roomId === roomId).map((actor, index) =>
    <div key={actor.id} className={styles.actor} role="img" aria-label={`Membre ${index + 1} de l’équipe de retour`}
      data-return-escort-actor={actor.id} data-return-escort-room={actor.roomId}
      data-return-escort-x={actor.x.toFixed(3)} data-return-escort-y={actor.y.toFixed(3)}
      data-return-escort-motion="translated-static-source"
      style={{ left: actor.x, top: actor.y, zIndex: Math.round(actor.y) }}>
      <span className={styles.shadow} aria-hidden="true" />
      <HomeworldNpcSpriteV84 npcId={`clan-ship-return:${actor.id}`} role="hunter" height={174} facing={actor.facing} />
      <span className={styles.actorLabel}>ÉQUIPE · {index + 1}</span>
    </div>)}
  </>;
});

export function ClanShipReturnEscortControls({ controlled, draft, position, suspended, frozen, onNavigate, onCommand, onRetry, onExit }: {
  controlled: ClanShipReturnEscortControlled; draft: ClanShipReturnEscortState | null;
  position: ClanShipReturnEscortObservation; suspended: boolean; frozen: boolean;
  onNavigate: (target: ClanShipReturnEscortTarget) => void;
  onCommand: (command: ClanShipReturnEscortCommand) => void;
  onRetry: () => void; onExit: () => void;
}) {
  const rootRef = useRef<HTMLDetailsElement>(null);
  const [open, setOpen] = useState(false), [focused, setFocused] = useState(false);
  const save = { ...controlled.save, clanShipReturnEscort: draft };
  const inspection = inspectClanShipReturnEscort(controlled.save.clanShipReturnEscort, save.createdAt);
  const protectedState = inspection.status === 'invalid-save' || inspection.status === 'future-version';
  const offer = evaluateClanShipReturnEscortOffer(save);
  const phase = draft?.phase;
  const exit = () => { setFocused(false); if (rootRef.current) rootRef.current.open = false; onExit(); };
  useMenuGamepad(rootRef, open && focused && !suspended, `${save.createdAt}:return-escort`, exit);
  if (!draft && !offer.allowed && !protectedState && !frozen) return null;
  const commands: { command: ClanShipReturnEscortCommand; label: string }[] = !phase ? [{ command: { type: 'accept' }, label: 'Préparer le retour avec Garde du Seuil' }]
    : phase === 'accepted' ? [
      { command: { type: 'prepare-route', post: 'medical-bed' }, label: 'Voie libre · poste de contrôle médical' },
      { command: { type: 'prepare-route', post: 'medical-terminal' }, label: 'Voie libre · poste de diagnostic du retour' },
    ] : phase === 'prepared' ? [{ command: { type: 'start' }, label: 'Commencer l’accompagnement' }]
      : phase === 'escorting' ? [draft?.actors[0]?.roomId === 'hangar'
        ? { command: { type: 'transfer-room', roomId: 'soins' }, label: 'Franchir le seuil avec toute l’équipe' }
        : { command: { type: 'confirm-medical' }, label: 'Confirmer le contrôle du groupe' }]
        : phase === 'at-medical' ? [{ command: { type: 'report' }, label: 'Présenter le relevé du retour' }] : [];
  const group = phase === 'escorting' ? draft?.actors[0] : null;
  const rejoinGroup = !!group && (group.roomId !== position.roomId || Math.hypot(group.x - position.x, group.y - position.y) > 300);
  const target = rejoinGroup && group ? { roomId: group.roomId, x: group.x, y: group.y, label: 'Rejoindre l’équipe arrêtée' }
    : commands[0] ? clanShipReturnEscortTarget(save, commands[0].command) : null;
  return <details ref={rootRef} className={styles.controls} data-return-escort-panel
    data-return-escort-phase={phase ?? 'available'} data-return-escort-frozen={frozen}
    onToggle={event => setOpen(event.currentTarget.open)}
    onFocusCapture={() => setFocused(true)} onBlurCapture={event => {
      if (!(event.relatedTarget instanceof Node) || !event.currentTarget.contains(event.relatedTarget)) setFocused(false);
    }}>
    <summary>Le retour que l’on prépare · {phase ? labels[phase] : 'nouveau dossier'}</summary>
    <div className={styles.content}>
      <p>Garde du Seuil et Suture Noire préparent le contrôle d’une équipe revenue au bord. Le groupe attend si tu t’éloignes ; il doit rejoindre le passage avant de changer de salle.</p>
      <p className={styles.note}>Un arrêt reprend les dernières positions sûres confirmées, au plus une seconde de déplacement avant l’arrêt. Aucun temps ne s’écoule pour l’équipe hors de la scène.</p>
      {rejoinGroup && <p>L’équipe attend {group?.roomId === 'soins' ? 'dans la baie médicale' : 'au hangar'}. Rejoins-la avant de reprendre le passage ou le contrôle.</p>}
      {frozen && <p className={styles.failure} role="alert">Le dernier enregistrement n’est pas confirmé. Le groupe reste aux positions sauvegardées ; relis la sauvegarde avant de reprendre.</p>}
      {protectedState && <p className={styles.failure}>Ce dossier doit être récupéré avant de poursuivre ; ses données sont conservées.</p>}
      {frozen && <button type="button" disabled={suspended} data-return-escort-retry onClick={onRetry}>Relire et réessayer la sauvegarde</button>}
      {!protectedState && target && <button type="button" disabled={suspended || frozen} data-return-escort-guide
        data-return-escort-guide-target={rejoinGroup ? 'regroup' : 'step'}
        onClick={() => { exit(); onNavigate(target); }}>Approcher : {target.label}</button>}
      {!protectedState && commands.map(({ command, label }) => {
        const result = actClanShipReturnEscort({ ...command, ownerCreatedAt: save.createdAt, expectedRevision: draft?.revision ?? 0 },
          { save, active: !suspended && !frozen, observation: position });
        const key = command.type === 'prepare-route' ? `${command.type}:${command.post}` : command.type;
        const near = clanShipReturnEscortInReach(position, clanShipReturnEscortTarget(save, command));
        return <div key={key} className={styles.action}>
          <button type="button" disabled={suspended || frozen || !result.accepted} data-return-escort-command={key}
            aria-describedby={`return-escort-reason-${key.replace(':', '-')}`} onClick={() => onCommand(command)}>{label}</button>
          <span id={`return-escort-reason-${key.replace(':', '-')}`}>{result.accepted ? 'À portée · action disponible.' : near ? result.message : 'Rejoins le poste indiqué à pied avant de confirmer.'}</span>
        </div>;
      })}
      {phase === 'reported' && <p role="status">Le relevé est conservé au conseil. L’équipe reste à la baie ; ce contrôle n’accorde ni soin gratuit, ni monnaie, ni recrutement.</p>}
      <button type="button" disabled={suspended} data-return-escort-close onClick={exit}>Retour au pont</button>
    </div>
  </details>;
}
