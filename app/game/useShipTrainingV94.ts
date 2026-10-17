"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { pageActivitySnapshotV94 } from "./systems/pageActivityV94";
import { createShipTrainingReceiptV94, type ShipTrainingReceiptV94 } from "./systems/shipTrainingReceiptV94";
import { recordTrainingResult, TRAINING_LABELS, type ShipProgressionState, type TrainingDisciplineId } from "./systems/progression";
import type { SaveGame } from "./types";

interface TrainingSessionV94 { id: number; owner: string; disciplineId: TrainingDisciplineId; seed: number; external: boolean }
interface Options {
  save: SaveGame;
  progression: ShipProgressionState;
  controlled: boolean;
  suspended: boolean;
  rootRef: { current: HTMLElement | null };
  onConfirmed: (state: ShipProgressionState) => void;
  onDelegated?: (state: ShipProgressionState) => void;
  onTrainingRequested?: (disciplineId: TrainingDisciplineId) => number | void | Promise<number | void>;
  notify: (message: string) => void;
}
/** Owns one drill generation. A pending result blocks other local sidecar
 * commits, but is not persisted by closing or reloading the application. */
export function useShipTrainingV94(options: Options) {
  const [trainingSession, setTrainingSession] = useState<TrainingSessionV94 | null>(null);
  const [saveIssue, setSaveIssue] = useState<string | null>(null);
  const [canRetryTraining, setCanRetryTraining] = useState(false);
  const live = useRef(options), mounted = useRef(false), nextId = useRef(0);
  const session = useRef<TrainingSessionV94 | null>(null);
  const receipt = useRef<ShipTrainingReceiptV94 | null>(null);
  const claimed = useRef(false), controlledUncertain = useRef(false), finishing = useRef(false);
  useEffect(() => { live.current = options; });
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; session.current = null; };
  }, []);
  // Notifications are presentation only. Their errors must never cancel a
  // provider, erase a receipt or change the acknowledgement of a saved score.
  const notify = useCallback((message: string) => {
    try { live.current.notify(message); } catch { /* Keep authoritative session state and receipt intact. */ }
  }, []);
  const available = useCallback(() => {
    const o = live.current;
    const root = o.rootRef.current;
    return mounted.current && !o.suspended && pageActivitySnapshotV94() && !!root &&
      !root.closest('[inert],[hidden],[aria-hidden="true"],[aria-disabled="true"]');
  }, []);
  const hasPendingResult = useCallback(() => receipt.current !== null || controlledUncertain.current, []);
  const retryTrainingSave = useCallback(() => {
    const o = live.current, pending = receipt.current;
    if (!mounted.current || !pending) return;
    const result = pending.attempt(o.save, o.progression, available());
    if (result.status === "ignored") return;
    if (result.status === "pending") { setSaveIssue(result.message); notify(result.message); return; }
    // Consume the receipt BEFORE callbacks; a reentrant receiver cannot repeat it.
    finishing.current = true;
    receipt.current = null; session.current = null; setTrainingSession(null); setSaveIssue(null); setCanRetryTraining(false);
    try {
      o.onConfirmed(result.state);
      notify(`${TRAINING_LABELS[pending.disciplineId]} : résultat ${pending.score}/100 sauvegardé.`);
    } catch { notify("Score sauvegardé, mais l’affichage du vaisseau n’a pas pu être actualisé. Rouvrez sa console."); }
    finally { finishing.current = false; }
  }, [available, notify]);
  const acceptScore = useCallback((id: number, score: number) => {
    const o = live.current, active = session.current;
    if (!mounted.current || !active || active.id !== id || active.owner !== o.save.createdAt || claimed.current) return;
    if (!Number.isInteger(score) || score < 0 || score > 100) {
      session.current = null; setTrainingSession(null); notify("Résultat d’entraînement invalide : aucun score consigné."); return;
    }
    claimed.current = true;
    if (o.controlled) {
      // A void notification is not a durable acknowledgement. Never touch the
      // local sidecar or retry an external receiver that may already have written.
      try {
        if (!o.onDelegated) throw new Error("No controlled receiver");
        o.onDelegated(recordTrainingResult(o.progression, active.disciplineId, score));
        notify(`${TRAINING_LABELS[active.disciplineId]} : résultat ${score}/100 transmis au gestionnaire externe, sauvegarde non vérifiée.`);
        session.current = null; setTrainingSession(null);
      } catch {
        controlledUncertain.current = true;
        setSaveIssue("Transmission externe non confirmée. Aucun renvoi automatique ; le score ne sera pas compté deux fois par ce panneau.");
      }
      return;
    }
    receipt.current = createShipTrainingReceiptV94(o.save, o.progression, active.disciplineId, score);
    if (!receipt.current) { setSaveIssue("Résultat non consigné : progression incompatible. Aucun déblocage accordé."); return; }
    setCanRetryTraining(true);
    retryTrainingSave();
  }, [notify, retryTrainingSave]);
  const requestTraining = useCallback(async (disciplineId: TrainingDisciplineId) => {
    const o = live.current;
    if (!available() || finishing.current || session.current || hasPendingResult() || !Object.hasOwn(TRAINING_LABELS, disciplineId) ||
        o.progression.ownerSaveCreatedAt !== o.save.createdAt) return;
    const active: TrainingSessionV94 = { id: ++nextId.current, owner: o.save.createdAt, disciplineId,
      seed: o.progression.training[disciplineId].attempts, external: !!o.onTrainingRequested };
    session.current = active; claimed.current = false; setSaveIssue(null); setTrainingSession(active);
    notify(`${TRAINING_LABELS[disciplineId]} : ${active.external ? "épreuve externe en attente" : "épreuve autonome prête"}.`);
    if (!o.onTrainingRequested) return;
    // An observer can synchronously cancel/unmount while presenting the start.
    // Do not start an external operation once that generation lost ownership.
    if (!mounted.current || session.current !== active || live.current.save.createdAt !== active.owner) return;
    try {
      const score = await o.onTrainingRequested(disciplineId);
      if (!mounted.current || session.current?.id !== active.id || live.current.save.createdAt !== active.owner) return;
      if (typeof score === "number") acceptScore(active.id, score);
      else { session.current = null; setTrainingSession(null); notify("Épreuve externe terminée sans score ; aucune tentative consignée."); }
    } catch {
      if (!mounted.current || session.current?.id !== active.id || live.current.save.createdAt !== active.owner) return;
      session.current = null; setTrainingSession(null); notify("Épreuve externe indisponible ; aucune tentative consignée.");
    }
  }, [acceptScore, available, hasPendingResult, notify]);
  const completeAutonomousTraining = useCallback((score: number) => {
    if (trainingSession && !trainingSession.external) acceptScore(trainingSession.id, score);
  }, [acceptScore, trainingSession]);
  const cancelAutonomousTraining = useCallback(() => {
    if (!mounted.current || !session.current) return;
    session.current = null; setTrainingSession(null);
    notify(hasPendingResult()
      ? "Score toujours en mémoire. Réessayez sa sauvegarde avant de quitter le vaisseau."
      : "Épreuve abandonnée ; aucun score consigné.");
  }, [hasPendingResult, notify]);
  return { trainingSession, saveIssue, canRetryTraining, requestTraining, completeAutonomousTraining,
    cancelAutonomousTraining, retryTrainingSave, hasPendingResult };
}
