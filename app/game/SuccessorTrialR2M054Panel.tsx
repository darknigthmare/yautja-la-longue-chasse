"use client";

import { useEffect, useId, useRef, useState } from 'react';
import type { SaveGame } from './types';
import { GameAudio } from './sound';
import { YOUTH_ART_MANIFEST } from './youthArtManifest';
import { samePassagePoint, type PassagePoint } from './systems/elderPassageJudgmentV168';
import {
  SUCCESSOR_DIRECTIONS, SUCCESSOR_OUTCOMES, SUCCESSOR_TERRAIN, isSuccessorTerrain,
  nextSuccessorStep, successorTrialSites, successorTrialView, type SuccessorTrialOrder, type SuccessorTrialPlan,
  type SuccessorTrialRecord,
} from './systems/successorTrialR2M054';
import styles from './SuccessorTrialR2M054Panel.module.css';

export default function SuccessorTrialR2M054Panel({ save, plan, record, disabled, onOrder }: {
  save: SaveGame;
  plan: SuccessorTrialPlan;
  record: SuccessorTrialRecord | undefined;
  disabled: boolean;
  onOrder(order: SuccessorTrialOrder, position: PassagePoint): boolean;
}) {
  const title = useId();
  const orders = record?.orders ?? [];
  const view = successorTrialView(plan, orders);
  const sites = successorTrialSites(plan);
  const [position, setPosition] = useState(view.checkpoint);
  const [successorPosition, setSuccessorPosition] = useState(view.successor);
  const targetColumn = view.successor?.column;
  const targetRow = view.successor?.row;
  const board = useRef<HTMLDivElement>(null);
  const audio = useRef<GameAudio | null>(null);
  const { masterVolume, effectsVolume } = save.settings;

  useEffect(() => {
    const transport = new GameAudio();
    audio.current = transport;
    return () => {
      transport.dispose();
      audio.current = null;
    };
  }, []);

  useEffect(() => {
    audio.current?.setMix({ master: masterVolume, effects: effectsVolume, music: 0 });
  }, [masterVolume, effectsVolume]);

  useEffect(() => {
    if (disabled || targetColumn === undefined || targetRow === undefined) return;
    const destination = { column: targetColumn, row: targetRow };
    if (successorPosition && samePassagePoint(successorPosition, destination)) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const timer = window.setTimeout(() => {
      setSuccessorPosition(previous => previous
        ? nextSuccessorStep(previous, destination)
        : destination);
    }, reduced ? 25 : 160);
    return () => window.clearTimeout(timer);
  }, [disabled, successorPosition, targetColumn, targetRow]);

  const successorArrived = !view.successor || Boolean(successorPosition && samePassagePoint(successorPosition, view.successor));

  const facing = plan.side === 'west' ? 'left' : 'right';
  const actor = YOUTH_ART_MANIFEST.actors.player[facing];
  const [x, y, width, height] = actor.clips.idle.frames[0].rect;
  const optionsHere = view.options.filter(option => samePassagePoint(position, option.point));
  const walking = Boolean(record) && !view.complete && !disabled;
  const step = (direction: PassagePoint) => ({ column: position.column + direction.column, row: position.row + direction.row });
  const walk = (direction: PassagePoint) => {
    if (!walking) return;
    const target = step(direction);
    if (!isSuccessorTerrain(target)) return;
    setPosition(target);
  };
  const order = (id: SuccessorTrialOrder) => {
    if (disabled || !successorArrived || !onOrder(id, position)) return;
    const needsSignal = id === 'observe-approach' && orders.includes('delegate');
    if (needsSignal || id === 'report') {
      void audio.current?.unlock().then(() => {
        if (needsSignal) audio.current?.enemyAlert();
        else audio.current?.objective();
      });
    }
    if (id !== 'report') requestAnimationFrame(() => board.current?.focus({ preventScroll: true }));
  };

  return <section className={styles.scene} aria-labelledby={title} data-r2-m054
    data-r2-m054-danger={view.danger} data-r2-m054-complete={view.complete} data-r2-m054-route={plan.route}
    data-r2-m054-position={String(position.column) + ',' + String(position.row)}>
    <h3 id={title}>La décision du successeur</h3>
    <p role="status" aria-live="polite">{view.instruction}</p>
    {view.outcome && <p className={styles.receipt} data-r2-m054-outcome={view.outcome}>{SUCCESSOR_OUTCOMES[view.outcome]}</p>}
    {record && !view.complete && <>
      <div className={styles.board} role="region" aria-label="Terrain d’Oseris-IV à onze colonnes" tabIndex={0} ref={board}
        onKeyDown={event => {
          const direction = SUCCESSOR_DIRECTIONS.find(item => item.key === event.key);
          if (!direction) return;
          event.preventDefault();
          event.stopPropagation();
          walk(direction);
        }}>
        {SUCCESSOR_TERRAIN.flatMap((line, row) => [...line].map((terrain, column) => {
          const tile = { column, row };
          const marked = view.options.some(option => samePassagePoint(tile, option.point));
          const danger = view.danger && samePassagePoint(tile, sites.snag);
          const playerHere = samePassagePoint(tile, position);
          return <span className={styles.tile} key={row * line.length + column} aria-hidden="true"
            data-terrain={terrain === '#' ? 'wall' : 'path'} data-marker={marked || undefined}
            data-danger={danger || undefined} data-player={playerHere || undefined}>
            {marked && <span className={styles.marker}>{view.danger && samePassagePoint(tile, sites.rescue) ? '!' : '◇'}</span>}
            {danger && <span className={styles.danger}>!</span>}
          </span>;
        }))}
        {successorPosition && <span className={styles.successor} aria-hidden="true" data-r2-m054-successor
          style={{ left: (successorPosition.column + 0.5) / SUCCESSOR_TERRAIN[0].length * 100 + '%',
            top: (successorPosition.row + 0.5) / SUCCESSOR_TERRAIN.length * 100 + '%' }}>
          <span style={{ width, height, backgroundImage: 'url(' + actor.src + ')', backgroundPosition: -x + 'px ' + -y + 'px' }} />
        </span>}
        <span className={styles.player} aria-hidden="true"
          style={{ left: (position.column + 0.5) / SUCCESSOR_TERRAIN[0].length * 100 + '%',
            top: (position.row + 0.5) / SUCCESSOR_TERRAIN.length * 100 + '%' }}>◆</span>
      </div>
      <p className={styles.legend}>◆ Toi · ◇ Poste à rejoindre</p>
      <div className={styles.actions} aria-label="Déplacement">
        {SUCCESSOR_DIRECTIONS.map(direction =>
          <button key={direction.key} type="button" disabled={!walking || !isSuccessorTerrain(step(direction))}
            data-r2-m054-move={direction.key} onClick={() => walk(direction)}>
            <span aria-hidden="true">{direction.symbol} </span>{direction.label}
          </button>)}
      </div>
      <p className={styles.position} aria-live="polite">
        Position {position.column + 1}, {position.row + 1}
        {optionsHere.length ? ' · Poste atteint' : ' · ' + view.options.map(option => option.label +
          ' en ' + (option.point.column + 1) + ', ' + (option.point.row + 1)).join(' · ')}
      </p>
    </>}
    {optionsHere.length > 0 && <div className={styles.actions}>
      {optionsHere.map(option => <button key={option.id} type="button" disabled={disabled || !successorArrived}
        data-r2-m054-order={option.id} onClick={() => order(option.id)}>{option.label}</button>)}
    </div>}
  </section>;
}
