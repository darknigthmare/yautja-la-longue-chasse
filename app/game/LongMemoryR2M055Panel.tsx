"use client";

import { useEffect, useId, useRef } from 'react';
import { YOUTH_ART_MANIFEST } from './youthArtManifest';
import type { ClanShipRoomId } from './systems/clanShipDocking';
import { CLAN_SHIP_INTERIOR_ROOMS } from './systems/clanShipInterior';
import {
  MEMORY_LABELS, MEMORY_ROOMS, MEMORY_TRACKS, longMemoryView,
  type LongMemoryEvidence, type LongMemoryOrder, type LongMemoryRecord,
} from './systems/longMemoryR2M055';
import styles from './LongMemoryR2M055Panel.module.css';

const novice = YOUTH_ART_MANIFEST.actors.player.left;
const [x, y, width, height] = novice.clips.idle.frames[0].rect;

export default function LongMemoryR2M055Panel({ state, evidence, roomId, disabled, onAction, onNavigate }: {
  state?: LongMemoryRecord;
  evidence: LongMemoryEvidence;
  roomId: ClanShipRoomId;
  disabled: boolean;
  onAction: (order: LongMemoryOrder) => void;
  onNavigate: (room: ClanShipRoomId) => void;
}) {
  const id = useId();
  const root = useRef<HTMLElement>(null);
  const orders = state?.orders ?? [];
  const count = useRef(orders.length);
  const view = longMemoryView(orders);
  const localTrack = MEMORY_TRACKS.find(track => MEMORY_ROOMS[track] === roomId);
  const comparison = localTrack && evidence[localTrack];
  const localOrder = view.options.find(item => item.room === roomId);
  const destinations = [...new Set(view.options.map(item => item.room))].filter(room => room !== roomId);
  const prepared = orders.includes('prepare');

  useEffect(() => {
    if (count.current === orders.length) return;
    count.current = orders.length;
    const next = root.current?.querySelector<HTMLElement>('[data-r2-m055-order]:not(:disabled), [data-r2-m055-route]:not(:disabled)')
      ?? root.current?.querySelector<HTMLElement>('h3');
    next?.focus({ preventScroll: true });
  }, [orders.length]);

  const orderLabel = localOrder?.id === 'begin' ? 'Ouvrir le relevé des trois lieux'
    : localOrder?.id === 'prepare' ? comparison?.preparation
    : localOrder?.id === 'handover' ? comparison?.handover
    : localOrder?.id.startsWith('choose-') && localOrder.track ? 'Choisir · ' + MEMORY_LABELS[localOrder.track]
    : 'Confronter le souvenir et sa conséquence';

  return <section ref={root} aria-labelledby={id} className={styles.scene} data-r2-m055
    data-r2-m055-compared={view.comparisons.length} data-r2-m055-complete={view.complete} data-r2-m055-choice={view.choice}>
    <h3 id={id} tabIndex={-1}>L’épreuve de la longue mémoire</h3>
    {view.complete && view.choice ? <p className={styles.receipt}>
      Le volontaire a reçu la transmission « {MEMORY_LABELS[view.choice]} ». Les trois comparaisons sont consignées.
    </p> : <>
      {!state ? <p>Les archives ouvrent le parcours des trois lieux où ton passage a laissé une conséquence.</p>
        : <p role="status">{view.choice
          ? 'Prépare cette transmission et remets-la au volontaire à son poste.'
          : view.comparisons.length === MEMORY_TRACKS.length
            ? 'Choisis le geste à transmettre à l’un des trois postes.'
            : 'Compare le souvenir et son effet actuel à chacun des trois postes.'}</p>}
      {state && comparison && localTrack && <div className={styles.comparison} data-r2-m055-comparison={localTrack}>
        <div>
          <h4>Souvenir</h4>
          <p>{comparison.past}</p>
        </div>
        <div className={styles.current}>
          <h4>Conséquence</h4>
          <p>{comparison.consequence}</p>
        </div>
      </div>}
      {view.choice && view.choice === localTrack && <figure className={styles.witness} data-r2-m055-witness
        data-r2-m055-prepared={prepared}>
        <span aria-hidden="true" className={styles.avatar}>
          <span style={{ width, height, backgroundImage: 'url(' + novice.src + ')', backgroundPosition: -x + 'px ' + -y + 'px' }} />
        </span>
        <figcaption>{prepared ? 'Le volontaire attend la remise au poste.' : 'Le volontaire vient apprendre ton geste.'}</figcaption>
      </figure>}
      <div className={styles.actions}>
        {localOrder && <button type="button" disabled={disabled} data-r2-m055-order={localOrder.id}
          onClick={() => onAction(localOrder.id)}>{orderLabel}</button>}
        {destinations.map(room => <button key={room} type="button" disabled={disabled} data-r2-m055-route={room}
          onClick={() => onNavigate(room)}>Rejoindre {CLAN_SHIP_INTERIOR_ROOMS[room].label}</button>)}
      </div>
    </>}
  </section>;
}
