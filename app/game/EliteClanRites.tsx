"use client";

import { useState } from "react";
import TrainingDrill from "./TrainingDrill";
import {
  canEnterEliteClanRites, completedEliteClanRites, ELITE_CLAN_TRIALS, type EliteClanTrialId,
} from "./systems/eliteClanRitesV175";
import {
  ELITE_RECOGNITION_POSTS, canEnterEliteRecognition, inspectEliteRecognition, type EliteRecognitionCommand,
  type EliteRecognitionResponse, type EliteRecognitionSave,
} from "./systems/eliteRecognitionV174";
import type { TrainingDrillTrace } from "./systems/trainingDrill";
import styles from "./EliteRecognition.module.css";

const Criteria: Record<EliteClanTrialId, string> = {
  blades: "Réussis huit gestes sur dix. Montre une frappe et une parade.",
  plasma: "Réussis huit gestes sur dix. Tire sur une cible et retiens le tir devant une silhouette protégée.",
  hunt: "Réussis trois gestes par phase. Montre les lames, le tir et sa retenue.",
};

export default function EliteClanRites({ save, suspended, onCommand, onClose, onOpenRecognition }: {
  save: EliteRecognitionSave;
  suspended: boolean;
  onCommand: (command: EliteRecognitionCommand) => EliteRecognitionResponse;
  onClose: () => void;
  onOpenRecognition: () => void;
}) {
  const state = inspectEliteRecognition(save.eliteRecognitionV174, save.createdAt).state;
  const [active, setActive] = useState<EliteClanTrialId | null>(null);
  const [pending, setPending] = useState<TrainingDrillTrace | null>(null);
  const [message, setMessage] = useState("");
  const receipts = state?.trials ?? [];
  const next = ELITE_CLAN_TRIALS[receipts.length];
  const trial = ELITE_CLAN_TRIALS.find(item => item.id === active);
  const eligible = canEnterEliteClanRites(save);
  const recordTrial = (trace: TrainingDrillTrace) => {
    if (!trial) return;
    const result = onCommand({ expectedRevision: state?.revision ?? 0, position: ELITE_RECOGNITION_POSTS.entry,
      operation: { type: "trial", id: trial.id, trace } });
    setMessage(result.message);
    if (result.retryable) {
      setPending(trace);
      return;
    }
    setPending(null);
    setActive(null);
  };

  return <section className={styles.scene} aria-labelledby="elite-clan-rites-heading"
    data-elite-clan-rites={completedEliteClanRites(receipts) ? "complete" : "training"}>
    <header className={styles.header}>
      <h3 id="elite-clan-rites-heading">Les rites du clan</h3>
      <button type="button" onClick={onClose}>Fermer les épreuves</button>
    </header>
    <ol>
      {ELITE_CLAN_TRIALS.map(item => <li key={item.id}>
        {item.label} · {receipts.some(receipt => receipt.id === item.id) ? "Consigné" : next?.id === item.id ? "À jouer" : "Épreuve suivante"}
      </li>)}
    </ol>
    {!eligible && next && <p>Le vétéran attend la reconnaissance Blooded, les huit retours de chasse et une carrière sans gel.</p>}
    {eligible && next && <div className={styles.controls}>
      <p>{Criteria[next.id]}</p>
      <button type="button" data-elite-clan-trial={next.id} disabled={suspended}
        onClick={() => { setMessage(""); setActive(next.id); }}>Commencer l’épreuve</button>
    </div>}
    {!next && <p data-elite-clan-rites-receipt>Le chef du clan a consigné les trois épreuves L‑06.</p>}
    {!next && canEnterEliteRecognition(save) &&
      <button type="button" onClick={onOpenRecognition}>Rejoindre les témoins</button>}
    {!trial && message && <p role="status">{message}</p>}
    {trial && <TrainingDrill disciplineId={trial.disciplineId} seed={trial.seed} clanPlasma={trial.clanPlasma}
      suspended={suspended || !eligible} onTrace={recordTrial}
      saveIssue={pending ? message : null} onRetrySave={pending ? () => recordTrial(pending) : undefined}
      onCancel={() => { setPending(null); setActive(null); setMessage(""); }} />}
  </section>;
}
