"use client";

import { useEffect, useId, useRef } from 'react';
import type { ClanShipRoomId } from './systems/clanShipDocking';
import { CLAN_SHIP_INTERIOR_ROOMS } from './systems/clanShipInterior';
import {
  ANCIENT_DEBT_POSTS, ANCIENT_HEARING_AUDIENCE, ANCIENT_SERVICE_POSTS, ancientHearingView,
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
  'recover-debt': ANCIENT_DEBT_POSTS[0].label,
  'prepare-aid': ANCIENT_DEBT_POSTS[1].label,
  'deliver-aid': ANCIENT_DEBT_POSTS[2].label,
  'first-relief': ANCIENT_SERVICE_POSTS[0].label,
  'review-crossing': ANCIENT_SERVICE_POSTS[1].label,
  'second-relief': ANCIENT_SERVICE_POSTS[2].label,
  'review-teaching': ANCIENT_SERVICE_POSTS[3].label,
  'third-relief': ANCIENT_SERVICE_POSTS[4].label,
  recognize: 'Prononcer le rite de reconnaissance Ancient',
};

export default function AncientHearingR2M056Panel({ state, roomId, evidence, armorerPresent, narrativeElder, disabled, onOrder, onNavigate }: {
  state?: AncientHearingRecord;
  roomId: ClanShipRoomId;
  evidence: LongMemoryEvidence;
  armorerPresent: boolean;
  narrativeElder: boolean;
  disabled: boolean;
  onOrder: (order: AncientHearingOrder) => void;
  onNavigate: (room: ClanShipRoomId) => void;
}) {
  const id = useId();
  const root = useRef<HTMLElement>(null);
  const revision = state?.orders.length ?? 0;
  const previous = useRef(revision);
  const view = ancientHearingView(state?.orders ?? [], armorerPresent, narrativeElder);
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
    data-r2-m056-count={view.collected.length} data-r2-m056-audience={view.audience} data-r2-m056-prepared={view.ready}
    data-r2-m056-debt={view.debtSettled} data-r2-m056-years={view.years} data-r2-m056-recognized={view.recognized}>
    <h3 id={id} tabIndex={-1}>{view.recognized ? 'Reconnaissance Ancient' : 'Vers la reconnaissance Ancient'}</h3>
    {view.ready && audience
      ? <div className={styles.receipt}>
          <p>{audience.label}. {view.recognized ? 'La reconnaissance Ancient est inscrite dans la chronique.'
            : !view.debtSettled ? 'Les archives ont conservé l’engagement de remettre en état le passage d’Oseris-IV. Rouvre son registre pour savoir quel appui envoyer à la garde.'
              : !narrativeElder ? 'L’aide est arrivée à la garde. Reviens après la reconnaissance Elder pour suivre les relèves du clan.'
                : 'L’aide est arrivée à la garde. Observe les relèves successives avant de revenir au lieu des témoignages.'}</p>
          {view.years > 0 && <p>{view.years} ans écoulés depuis le début des relèves.</p>}
          {state?.orders.includes('review-crossing') && <p>La garde signe le nouveau passage. Les voyageurs l’utilisent à chaque relève.</p>}
          {state?.orders.includes('review-teaching') && <p>Le volontaire a transmis la méthode de l’atelier à son équipe. La relève sait désormais réparer ses propres appuis.</p>}
        </div>
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
