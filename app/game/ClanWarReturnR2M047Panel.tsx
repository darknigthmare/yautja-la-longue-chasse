"use client";

import { useEffect, useRef } from 'react';
import { warReturnView, type WarReturnOrder, type WarReturnRecord } from './systems/warReturnR2M047';
import styles from './ClanWarReturnR2M047Panel.module.css';

const LOCATIONS = [
  { id: 'landing', name: 'Zone de débarquement' },
  { id: 'veterans', name: 'Poste du Talus' },
  { id: 'bridge', name: 'Pont de service' },
  { id: 'depot', name: 'Dépôt du talus' },
  { id: 'far-bank', name: 'Rive opposée' },
  { id: 'aid', name: 'Poste de soins' },
  { id: 'bend', name: 'Coude du sentier' },
  { id: 'refuge', name: 'Refuge de relève' },
] as const;

export default function ClanWarReturnR2M047Panel({ war, blocked, disabled, onOrder }: {
  war: WarReturnRecord | undefined;
  blocked: boolean;
  disabled: boolean;
  onOrder: (order: WarReturnOrder) => void;
}) {
  const view = warReturnView(war?.orders ?? []);
  const current = LOCATIONS.find(location => location.id === view.location);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const firstOrderRef = useRef<HTMLButtonElement>(null);
  const orderCount = war?.orders.length ?? 0;
  const previousCount = useRef(orderCount);
  useEffect(() => {
    if (orderCount === previousCount.current) return;
    previousCount.current = orderCount;
    const next = view.complete ? headingRef.current : firstOrderRef.current;
    next?.focus({ preventScroll: true });
  }, [orderCount, view.complete]);
  return <section className={styles.scene} aria-labelledby="war-return-title"
    data-war-return-location={war ? view.location : 'aboard'}
    data-war-return-choice={view.choice} data-war-return-completed={view.complete}>
    <header className={styles.heading}>
      <div><h3 ref={headingRef} tabIndex={-1} id="war-return-title">Ce que la guerre laisse au retour</h3><p>Passe des Cendres · Front de Korthas</p></div>
      <span>{view.complete ? 'Rapport consigné' : war ? current?.name : 'Hangar du Clan Ship'}</span>
    </header>
    {war && <ol className={styles.map} aria-label="Repères de la Passe des Cendres" data-bridge-restored={war.orders.includes('test-crossing')}>
      {LOCATIONS.map(location => <li key={location.id} data-location={location.id}
        aria-current={current?.id === location.id ? 'location' : undefined}>
        <span className={styles.marker} aria-hidden="true" />{location.name}
      </li>)}
    </ol>}
    <p className={styles.note} aria-live="polite">{view.note}</p>
    {blocked && !view.complete && <p>Termine l’opération active avant de reprendre la visite.</p>}
    {view.options.length > 0 && <div className={styles.orders}>
      {view.options.map(([order, label], index) => <button key={order} ref={index === 0 ? firstOrderRef : undefined} type="button" disabled={disabled || blocked}
        data-war-return-order={order} onClick={() => onOrder(order)}>{label}</button>)}
    </div>}
  </section>;
}
