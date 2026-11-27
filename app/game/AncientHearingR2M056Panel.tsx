"use client";

import { useEffect, useId, useRef } from 'react';
import type { ClanShipRoomId } from './systems/clanShipDocking';
import { CLAN_SHIP_INTERIOR_ROOMS } from './systems/clanShipInterior';
import {
  ANCIENT_HEARING_AUDIENCE, ancientHearingView,
  type AncientHearingOrder, type AncientHearingRecord,
} from './systems/ancientHearingR2M056';
import { MEMORY_LABELS, MEMORY_ROOMS, MEMORY_TRACKS, type LongMemoryEvidence } from './systems/longMemoryR2M055';
import styles from './LongMemoryR2M055Panel.module.css';

const ORDER_LABELS: Record<AncientHearingOrder, string> = {
  'open-register': 'Ouvrir le registre des témoignages',
  'read-hunt': 'Joindre le relevé du retour à Oseris-IV',
  'read-workshop': 'Joindre la fiche remise par l’armurerie',
  'hear-armorer': 'Écouter Griffe de Fer à son poste',
  'read-teaching': 'Joindre le relevé du successeur',
  'choose-local': ANCIENT_HEARING_AUDIENCE.local.label,
  'choose-intimate': ANCIENT_HEARING_AUDIENCE.intimate.label,
  'reserve-post': 'Réserver ce lieu et déposer le registre',
};

export default function AncientHearingR2M056Panel({ state, roomId, evidence, armorerPresent, disabled, onOrder, onNavigate }: {
  state?: AncientHearingRecord;
  roomId: ClanShipRoomId;
  evidence: LongMemoryEvidence;
  armorerPresent: boolean;
  disabled: boolean;
  onOrder: (order: AncientHearingOrder) => void;
  onNavigate: (room: ClanShipRoomId) => void;
}) {
  const id = useId();
  const root = useRef<HTMLElement>(null);
  const revision = state?.orders.length ?? 0;
  const previous = useRef(revision);
  const view = ancientHearingView(state?.orders ?? [], armorerPresent);
  const localTrack = MEMORY_TRACKS.find(track => MEMORY_ROOMS[track] === roomId);
  const testimony = localTrack ? evidence[localTrack] : null;
  const localOrders = view.options.filter(option => option.room === roomId);
  const destinations = [...new Set(view.options.map(option => option.room))].filter(room => room !== roomId);
  const audience = view.audience ? ANCIENT_HEARING_AUDIENCE[view.audience] : null;

  useEffect(() => {
    if (previous.current === revision) return;
    previous.current = revision;
    const option = root.current?.querySelector<HTMLElement>(
      '[data-r2-m056-order]:not(:disabled), [data-r2-m056-route]:not(:disabled)',
    );
    (option ?? root.current?.querySelector('h3'))?.focus({ preventScroll: true });
  }, [revision]);

  return <section ref={root} aria-labelledby={id} className={styles.scene} data-r2-m056
    data-r2-m056-count={view.collected.length} data-r2-m056-audience={view.audience} data-r2-m056-prepared={view.ready}>
    <h3 id={id} tabIndex={-1}>Préparer la reconnaissance Ancient</h3>
    {view.ready && audience
      ? <p className={styles.receipt}>Le registre est déposé. {audience.label}. Le rite attend encore les preuves d’ancienneté et le règlement des anciennes dettes.</p>
      : <p>{!state ? 'La transmission du volontaire est consignée. Aux archives, ouvre le registre des actes à présenter.'
        : audience ? 'Prends le registre et rejoins le lieu choisi.'
        : view.collected.length === MEMORY_TRACKS.length ? 'Choisis aux archives qui pourra consulter les témoignages.'
        : 'Consulte les trois postes où ces actes ont laissé une trace.'}</p>}
    {state && <ul aria-label="Témoignages retenus">
      {MEMORY_TRACKS.map(track => <li key={track}>
        {MEMORY_LABELS[track]} · {view.collected.includes(track)
          ? track === 'collective' && view.heardArmorer ? 'témoignage de Griffe de Fer' : 'relevé consigné'
          : 'à consulter'}
      </li>)}
    </ul>}
    {!view.ready && state && testimony && localTrack && <div className={styles.current}>
      <h4>{MEMORY_LABELS[localTrack]}</h4>
      <p>{testimony.consequence}</p>
      {localTrack === 'collective' && !armorerPresent && <p>Le registre conserve la fiche remise à l’atelier.</p>}
    </div>}
    {view.heardArmorer && roomId === 'armurerie' && armorerPresent && <blockquote data-r2-m056-armorer>
      <p>« La pièce a tenu quand tu me l’as rendue. Je garde le réglage à l’atelier et j’en répondrai devant les témoins que tu choisiras. »</p>
      <footer>Griffe de Fer</footer>
    </blockquote>}
    {localOrders.length + destinations.length > 0 && <div className={styles.actions}>
      {localOrders.map(({ order }) => <button key={order} type="button" disabled={disabled}
        data-r2-m056-order={order} onClick={() => onOrder(order)}>{ORDER_LABELS[order]}</button>)}
      {destinations.map(room => <button key={room} type="button" disabled={disabled}
        data-r2-m056-route={room} onClick={() => onNavigate(room)}>Rejoindre {CLAN_SHIP_INTERIOR_ROOMS[room].label}</button>)}
    </div>}
  </section>;
}
