"use client";

import type { MountExpeditionV153 } from './systems/mobility/mountExpeditionsV153';
import type { MountOrderV153, MountTrialV153 } from './systems/mobility/mountsV153';
import styles from './MountExpeditionV153.module.css';

interface RouteProps {
  expedition: MountExpeditionV153;
  trial: MountTrialV153;
  can: boolean;
  eventId: string;
  order: (command: MountOrderV153) => void;
}

export function MountExpeditionPortraitV153({ path, name }: { path: string; name: string }) {
  // eslint-disable-next-line @next/next/no-img-element -- the native source remains available at its original resolution
  return <img src={path} alt={name + ' · portrait de référence'} width={1536} height={1024} className={styles.portrait} />;
}

export default function MountExpeditionRouteV153({ expedition, trial, can, eventId, order }: RouteProps) {
  const position = trial.fieldAt ?? 0;
  const next = expedition.stages[trial.passed.length];
  const length = expedition.stages.at(-1)!.position;
  const atStage = !!next && position === next.position;
  const landmarks = new Map(expedition.stages.map(stage => [stage.position, stage]));
  const walk = (direction: -1 | 1) => order({ type: 'step-trial', trialId: trial.id, direction });
  return <section className={styles.route} aria-label={expedition.title} data-mount-expedition data-field-position={position}>
    <p className={styles.terrain}>{expedition.route}</p>
    <div className={styles.track} aria-hidden="true">
      {Array.from({ length: length + 1 }, (_, point) => {
        const stage = landmarks.get(point);
        return <span key={point} data-position={point} data-current={point === position} data-stage={!!stage}>
          {point === 0 ? 'Départ' : stage ? expedition.stages.indexOf(stage) + 1 : '·'}
        </span>;
      })}
    </div>
    <p role="status">Position {position}/{length} · {trial.status === 'complete' ? 'Parcours terminé' : atStage ? next.label : 'Prochain poste à la position ' + next?.position}</p>
    {trial.status === 'open' && <div className={styles.actions}>
      <button type="button" disabled={!can || position === 0} data-mount-field-step="back" onClick={() => walk(-1)}>Reculer</button>
      <button type="button" disabled={!can || atStage} data-mount-field-step="forward" onClick={() => walk(1)}>Avancer</button>
    </div>}
    <ol className={styles.stages}>
      {expedition.stages.map((stage, index) => {
        const done = index < trial.passed.length;
        const current = trial.status === 'open' && next?.id === stage.id;
        return <li key={stage.id} data-trust-exercise={stage.id} data-trust-state={done ? 'passed' : current ? 'current' : 'locked'}>
          <strong>{stage.label}</strong>
          {done && <span> · Réussi</span>}
          {current && <p>{stage.source}</p>}
          {current && atStage && <div className={styles.actions}>
            {stage.options.map(option => <button type="button" key={option.id} data-mount-field-choice={option.id} disabled={!can}
              onClick={() => order({ type: 'trust-exercise', trialId: trial.id, exerciseId: stage.id, optionId: option.id, eventId })}>{option.label}</button>)}
          </div>}
        </li>;
      })}
    </ol>
  </section>;
}
