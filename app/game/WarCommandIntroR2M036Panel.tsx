"use client";

import { useEffect, useId, useRef } from 'react';
import { WAR_COMMAND_DIRECTIONS, warCommandIntroView, type WarCommandIntroOrder,
  type WarCommandIntroRecord } from './systems/warCommandIntroR2M036';
import styles from './WarCommandIntroR2M036Panel.module.css';

const TEAM_LABELS = ['Couverture', 'Progression', 'Repli'] as const;

export default function WarCommandIntroR2M036Panel({ record, disabled, onOrder }: {
  record?: WarCommandIntroRecord;
  disabled: boolean;
  onOrder(order: WarCommandIntroOrder): void;
}) {
  const title = useId();
  const root = useRef<HTMLElement>(null);
  const turn = record?.orders.length ?? 0;
  const recorded = useRef(turn);
  const view = warCommandIntroView(record);
  const { field, rts } = view;
  const map = field?.map ?? rts?.map;
  const inField = view.step === 'field';
  const base = map?.start;
  const upper = base ? Math.max(0, base.y - 9) : 0;
  const lower = base ? base.y + 9 : 0;
  const tiles = map?.tiles.filter(tile => tile.x <= 12 && tile.y >= upper && tile.y <= lower) ?? [];
  const columns = map ? Math.min(13, map.width) : 0;
  const rows = map ? Math.min(lower + 1, map.height) - upper : 0;
  const recovered = rts?.report?.outcome === 'retreat'
    ? rts.squads.filter(squad => squad.status !== 'down' && !rts.report?.leftBehindSquadIds.includes(squad.id)) : [];

  useEffect(() => {
    if (recorded.current === turn) return;
    recorded.current = turn;
    const next = root.current?.querySelector<HTMLElement>('[data-r2-m036-order]:not(:disabled)')
      ?? root.current?.querySelector<HTMLElement>('h3');
    next?.focus({ preventScroll: true });
  }, [turn]);

  return <section ref={root} aria-labelledby={title} className={styles.panel} data-r2-m036
    data-r2-m036-step={view.step} data-r2-m036-branch={view.decision ?? undefined}
    data-r2-m036-field-position={field ? field.player.x + ',' + field.player.y : undefined}>
    <h3 id={title} tabIndex={-1}>Voir le champ depuis les hauteurs</h3>
    {rts && <ul className={styles.teams} aria-label="État des formations">
      {rts.squads.map((team, index) => <li key={team.id} data-r2-m036-team={index} data-status={team.status}>
        <strong>{TEAM_LABELS[index]} · {team.unitName}</strong>
        <span>{team.status === 'evacuated' ? 'À bord' : team.status === 'down' ? 'Hors combat' : team.memberCount + ' membres au sol'}</span>
      </li>)}
    </ul>}
    {map && (view.step !== 'complete' && view.step !== 'retreat') && <>
      <div className={styles.map} role="region" aria-label={inField ? 'Passage au sol' : 'Relief tactique de la corniche'}
        tabIndex={0} style={{ gridTemplateColumns: 'repeat(' + columns + ', minmax(0, 1fr))',
          gridTemplateRows: 'repeat(' + rows + ', minmax(0, 1fr))' }}
        onKeyDown={event => {
          const direction = WAR_COMMAND_DIRECTIONS.find(item => item.key === event.key);
          if (!direction || disabled || !view.options.some(option => option.id === direction.id)) return;
          event.preventDefault();
          event.stopPropagation();
          onOrder(direction.id);
        }}>
        {tiles.map(tile => {
          const team = rts?.squads.findIndex(unit => unit.status === 'active' && unit.x === tile.x && unit.y === tile.y) ?? -1;
          const player = field && field.player.x === tile.x && field.player.y === tile.y;
          const objective = field && field.map.goal.x === tile.x && field.map.goal.y === tile.y;
          const exit = map.extraction.x === tile.x && map.extraction.y === tile.y;
          return <span key={tile.y * map.width + tile.x} aria-hidden="true" data-terrain={tile.kind}
            data-extraction={exit || undefined} data-objective={objective || undefined} data-player={player || undefined}>
            {inField ? player ? '◆' : objective ? '◇' : exit ? '⌂' : '' : team >= 0 ? team + 1 : exit ? '⌂' : ''}
          </span>;
        })}
      </div>
      <p className={styles.legend}>{inField ? '◆ Toi · ◇ Objectif · ⌂ Navette' : '1 Couverture · 2 Progression · 3 Repli · ⌂ Navette'}</p>
    </>}
    <p role="status">{view.report}</p>
    {(view.step === 'complete' || view.step === 'retreat') && recovered.length > 0 &&
      <p data-r2-m036-recovered>Formations revenues {recovered.length} · {recovered.map(team => team.unitName).join(', ')}</p>}
    {view.options.length > 0 && <div className={styles.actions}>
      {view.options.map(({ id, label }) => <button type="button" key={id} disabled={disabled}
        data-r2-m036-order={id} onClick={() => onOrder(id)}>{label}</button>)}
    </div>}
  </section>;
}
