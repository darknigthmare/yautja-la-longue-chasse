"use client";

import { useEffect, useRef } from 'react';
import type { SaveGame } from './types';
import HomeworldModularHunter from './HomeworldModularHunter';
import { OSERIS_RETURN_TERRAIN_R2_M053 as terrain, oserisReturnView, type OserisReturnOrder, type OserisReturnRecord } from './systems/oserisReturnR2M053';
import styles from './OserisReturnR2M053Panel.module.css';

const x = (position: number) => (position - terrain.viewStart) / (terrain.viewEnd - terrain.viewStart) * 100;
const y = (position: number) => position / terrain.height * 100;
const left = (position: number) => `${x(position)}%`;
const top = (position: number) => `${y(position)}%`;
const width = (start: number, length: number) => `${x(start + length) - x(start)}%`;
const platform = (part: { x: number; y: number; width: number }) =>
  ({ left: left(part.x), top: top(part.y), width: width(part.x, part.width) });

export default function OserisReturnR2M053Panel({ save, record, disabled, onOrder }: {
  save: SaveGame;
  record: OserisReturnRecord | undefined;
  disabled: boolean;
  onOrder(order: OserisReturnOrder): void;
}) {
  const orders = record?.orders ?? [];
  const view = oserisReturnView(orders);
  const firstOption = useRef<HTMLButtonElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const count = useRef(orders.length);
  useEffect(() => {
    if (count.current === orders.length) return;
    count.current = orders.length;
    (view.complete ? heading.current : firstOption.current)?.focus({ preventScroll: true });
  }, [orders.length, view.complete]);
  return <section className={styles.panel} aria-labelledby="oseris-return-title" data-oseris-return
    data-oseris-return-pos={view.position?.x} data-oseris-return-choice={view.choice} data-oseris-return-complete={view.complete}>
    <h3 id="oseris-return-title" ref={heading} tabIndex={-1}>Un ancien terrain a changé</h3>
    <p>Oseris-IV · Tranchée inondée</p>
    {view.position && !view.complete && <div className={styles.terrain} aria-label={view.position.label} role="img"
      data-oseris-terrain style={{ backgroundImage: `url("${terrain.background}")` }}>
      <span className={styles.ground} style={{ top: top(terrain.floorY) }} />
      <span className={styles.water} style={platform(terrain.trench)} />
      <span className={styles.crown} style={platform(terrain.canopy)} />
      <span className={styles.ledge} style={platform(terrain.escape)} />
      <span className={styles.vine} style={{ left: left(terrain.vine.x + terrain.vine.width / 2),
        top: top(terrain.vine.y), height: top(terrain.vine.height) }} />
      {orders.includes('compare') && <span className={styles.archive} data-oseris-old-route
        style={{ left: left(terrain.trench.x), width: width(terrain.trench.x, terrain.trench.width), top: top(terrain.floorY - 20) }} />}
      {orders.includes('place-markers') && <><span className={styles.marker} style={{ left: left(terrain.trench.x + 20), top: top(terrain.trench.y) }} />
        <span className={styles.marker} style={{ left: left(terrain.trench.x + terrain.trench.width - 50), top: top(terrain.trench.y) }} /></>}
      <span className={styles.hunter} style={{ left: left(view.position.x), top: top(view.position.y) }}>
        <HomeworldModularHunter morphId={save.appearance.bodyMorphId} dreadStyleId={save.appearance.dreadStyleId}
          appearance={save.appearance} showArmor armorId={save.loadout.armorId} />
      </span>
    </div>}
    {orders.includes('compare') && !view.complete && <p className={styles.legend}>Pointillés ocre · relevé de la chasse d’origine</p>}
    <p role="status" aria-live="polite">{view.position && !view.complete && <strong>{view.position.label} · </strong>}{view.note}</p>
    {view.options.length > 0 && <div className={styles.actions}>{view.options.map(([id, label], index) =>
      <button key={id} type="button" ref={index === 0 ? firstOption : undefined} disabled={disabled}
        data-oseris-return-order={id} onClick={() => onOrder(id)}>{label}</button>)}</div>}
  </section>;
}
