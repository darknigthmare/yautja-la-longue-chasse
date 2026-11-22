'use client';

import { useId, useMemo, useState, type KeyboardEvent } from 'react';
import ShipFlightDrillV87 from './ShipFlightDrillV87';
import styles from './EarthHuntV171.module.css';
import {
  FIRST_INTERSTELLAR_V173,
  firstInterstellarRouteV173,
  inspectFirstInterstellarV173,
  type FirstInterstellarAccessV173,
  type FirstInterstellarActionV173,
  type FirstInterstellarStateV173,
} from './systems/firstInterstellarV173';

type Props = {
  owner: string;
  state: FirstInterstellarStateV173 | null;
  access: FirstInterstellarAccessV173;
  onAction: (action: FirstInterstellarActionV173) => {
    accepted: boolean;
    message: string;
    state: FirstInterstellarStateV173 | null;
  };
  onExit: () => void;
  onOpenSettings?: () => void;
};
const bearings = [-2, -1, 0, 1, 2];

export default function FirstInterstellarV173({ owner, state, access, onAction, onExit, onOpenSettings }: Props) {
  const heading = useId();
  const { view } = useMemo(() => inspectFirstInterstellarV173(state, owner), [state, owner]);
  const [message, setMessage] = useState('');
  const send = (action: FirstInterstellarActionV173) => setMessage(onAction(action).message);
  const hangar = view.phase === 'hangar';
  const lane = hangar ? FIRST_INTERSTELLAR_V173.hangar : FIRST_INTERSTELLAR_V173.quay;
  const walk = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    if (!event.repeat) send({ kind: 'walk', direction: event.key === 'ArrowRight' ? 1 : -1 });
  };

  return (
    <section className={styles.scene} aria-labelledby={heading} data-first-interstellar={view.phase}>
      <header className={styles.header}>
        <div>
          <p>{FIRST_INTERSTELLAR_V173.missionId}</p>
          <h1 id={heading}>Le premier trajet entre les mondes</h1>
        </div>
        <div className={styles.commands}>
          <button type="button" onClick={onExit}>{view.phase === 'returned' ? 'Rejoindre le pont' : 'Fermer le poste'}</button>
          {onOpenSettings && <button type="button" onClick={onOpenSettings}>Réglages</button>}
        </div>
      </header>
      <div className={styles.panel}>
        {!access.allowed ? <p role="status">{access.reason}</p> : (
          <>
            {view.phase === 'plan' && (
              <>
                <h2>Destination · {FIRST_INTERSTELLAR_V173.destination.title}</h2>
                <p>Les huit postes du prévol sont prêts. Choisissez le couloir avant de traverser le sas.</p>
                <div className={styles.commands}>
                  <button type="button" onClick={() => send({ kind: 'plan', route: 'direct' })}>Route directe</button>
                  <button type="button" onClick={() => send({ kind: 'plan', route: 'stopover' })}>
                    Escale · {FIRST_INTERSTELLAR_V173.relay.title}
                  </button>
                </div>
              </>
            )}
            {(view.phase === 'hangar' || view.phase === 'quay') && (
              <>
                <h2>{hangar ? 'Accès au sas' : FIRST_INTERSTELLAR_V173.destination.title}</h2>
                <p>{hangar ? 'Traversez le sas pour prendre le poste de pilotage.'
                  : view.visitedDestination ? 'Regagnez le pont de la coque.' : 'Descendez sur le quai et gagnez la Salle des routes.'}</p>
                <div className={styles.corridor} tabIndex={0} onKeyDown={walk} aria-label="Passage à pied, flèches gauche et droite">
                  <ol>
                    {lane.map((name, index) => (
                      <li key={name} aria-current={index === view.position ? 'location' : undefined}>
                        <span className={styles.corridorMarker} aria-hidden="true">
                          {index === view.position ? '●' : (name.startsWith('Dépôt') ? '▣' : '·')}
                        </span>
                        {name}
                      </li>
                    ))}
                  </ol>
                </div>
                <div className={styles.commands}>
                  <button type="button" disabled={view.position === 0} onClick={() => send({ kind: 'walk', direction: -1 })}>Reculer</button>
                  <button type="button" disabled={view.position === lane.length - 1}
                    onClick={() => send({ kind: 'walk', direction: 1 })}>Avancer</button>
                  {hangar && view.position === lane.length - 1 && (
                    <button type="button" onClick={() => send({ kind: 'launch' })}>Prendre le départ</button>
                  )}
                </div>
              </>
            )}
            {view.phase === 'travel' && (
              <>
                <h2>Suivi des balises · {view.passingBeacon} / 3</h2>
                <div className={styles.corridor} aria-label={'Cap actuel ' + view.bearing + ', balise ' + view.targetBearing}>
                  <ol>
                    {bearings.map(bearing => (
                      <li key={bearing} aria-current={bearing === view.bearing ? 'location' : undefined}>
                        <span className={styles.corridorMarker} aria-hidden="true">{bearing === view.targetBearing ? '◆' : '·'}</span>
                        {bearing}
                      </li>
                    ))}
                  </ol>
                </div>
                <div className={styles.commands}>
                  <button type="button" disabled={view.bearing <= -2}
                    onClick={() => send({ kind: 'steer', direction: -1 })}>Bâbord</button>
                  <button type="button" disabled={view.bearing >= 2}
                    onClick={() => send({ kind: 'steer', direction: 1 })}>Tribord</button>
                  {view.route === 'stopover' && view.passingBeacon === 1 && !view.relayLogged ? (
                    <button type="button" onClick={() => send({ kind: 'relay' })}>Confirmer l’escale</button>
                  ) : (
                    <button type="button" onClick={() => send({ kind: 'beacon' })}>Franchir la balise</button>
                  )}
                </div>
              </>
            )}
            {view.phase === 'approach' && view.flight && view.route && (
              <ShipFlightDrillV87 ownerSaveCreatedAt={owner} shipId={access.shipId} controlled={{
                state: view.flight,
                route: firstInterstellarRouteV173(view.route),
                onAction: action => {
                  const current = view.flight!;
                  if (action.type === 'return-route' || action.type === 'route' || action.type === 'confirm-route') {
                    return { accepted: false, changed: false, state: current, message: 'Le quai est devant la coque.' };
                  }
                  const result = onAction({ kind: 'mooring', action });
                  const next = result.accepted ? inspectFirstInterstellarV173(result.state, owner).view.flight : null;
                  if (result.accepted) setMessage(result.message);
                  return { ...result, state: next ?? current, changed: Boolean(next) };
                },
              }} />
            )}
            {view.phase === 'returned' && (
              <>
                <h2>Trajet consigné</h2>
                <p>Débarquement à la {FIRST_INTERSTELLAR_V173.destination.title}, puis retour à bord.</p>
              </>
            )}
            <p className={styles.feedback} aria-live="polite">{message}</p>
          </>
        )}
      </div>
    </section>
  );
}
