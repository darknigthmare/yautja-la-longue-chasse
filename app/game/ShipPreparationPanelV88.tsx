"use client";

import { useState } from 'react';
import type { PhysicalShipStationId } from './systems/shipLevelLayout';
import type { ShipPreparationEvaluationV88, ShipPreparationObservationV88, ShipPreparationResultV88 } from './systems/shipPreparationV88';
import styles from './ShipPreparationPanelV88.module.css';

export interface ShipPreparationControlledV88 {
  evaluation: ShipPreparationEvaluationV88;
  /** Return accepted/changed only after durable campaign storage succeeds. */
  onInspect: (observation: ShipPreparationObservationV88) => ShipPreparationResultV88;
}
export default function ShipPreparationPanelV88({ controlled, stationId, suspended, observe }: {
  controlled: ShipPreparationControlledV88;
  stationId: PhysicalShipStationId | null;
  suspended: boolean;
  /** The deck supplies the current playerRef at activation, not render time. */
  observe: () => ShipPreparationObservationV88 | null;
}) {
  const [message, setMessage] = useState<string | null>(null);
  const { evaluation } = controlled;
  const fact = evaluation.facts.find(item => item.stationId === stationId);
  const complete = !!stationId && evaluation.completedStationIds.includes(stationId);
  const inspect = () => {
    if (suspended || !evaluation.writable || !fact) return;
    const actual = observe();
    if (!actual || actual.stationId !== fact.stationId) {
      setMessage('Le chasseur a quitté le poste. Rejoignez-le avant l’inspection.'); return;
    }
    const result = controlled.onInspect(actual);
    setMessage(result.message);
  };
  return <section className={styles.panel} aria-label="Inspection physique des huit postes du vaisseau" data-ship-preparation="v88">
    <header><div><p>PRÉPARATION DU VAISSEAU</p><h3>{evaluation.ready ? 'Les huit postes sont contrôlés' : `Inspection des postes · ${evaluation.inspected}/8`}</h3></div>
      <span className={evaluation.ready ? styles.ready : styles.count}>{evaluation.inspected}/8</span></header>
    <p className={styles.scope}>Coque accessible du registre courant. Ces contrôles ne remettent aucun droit de propriété et ne concluent pas l’acquisition R2-M021 ni la mission R2-M022.</p>
    <ol className={styles.posts} aria-label="Postes inspectés pour le kit et la destination actuels">
      {evaluation.facts.map(item => <li key={item.stationId} data-current={item.stationId === stationId} data-complete={evaluation.completedStationIds.includes(item.stationId)}>
        <span aria-hidden="true">{evaluation.completedStationIds.includes(item.stationId) ? '✓' : '○'}</span>{item.label}
      </li>)}
    </ol>
    {suspended && <p role="status">Inspection suspendue. Reprenez le pont pour continuer.</p>}
    {!evaluation.writable && <p role="status">{evaluation.message}</p>}
    {fact ? <article aria-label={`Contrôle du poste ${fact.label}`}>
      <h4>{fact.label}</h4>
      <ul>{fact.details.map(detail => <li key={detail}>{detail}</li>)}</ul>
      {fact.missing.length > 0 && <ul className={styles.missing}>{fact.missing.map(detail => <li key={detail}>{detail}</li>)}</ul>}
      <button type="button" disabled={suspended || !evaluation.writable || fact.missing.length > 0} onClick={inspect}>
        {complete ? 'Relire ce contrôle' : fact.gesture}
      </button>
    </article> : <p>Rejoignez une station sur le pont. Le plan pose une balise ; les accès rapides ne valident aucun contrôle.</p>}
    <p className={styles.status} role="status" aria-live="polite">{message ?? evaluation.message}</p>
  </section>;
}
