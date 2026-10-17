"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { pageActivitySnapshotV94 } from "./systems/pageActivityV94";
import { createShipTrainingReceiptV94, restoreShipTrainingReceiptV94, type ShipTrainingReceiptV94 } from "./systems/shipTrainingReceiptV94";
import { recordTrainingResult, TRAINING_LABELS, type ShipProgressionState, type TrainingDisciplineId } from "./systems/progression";
import { createShipTrainingRecoveryPortV94, createShipTrainingRecoveryQueueV94, type ShipTrainingRecoveryPortV94 } from "./systems/shipTrainingRecoveryV94";
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
  /** Optional port is for deterministic tests or a host-owned recovery backend. */
  recoveryPort?: ShipTrainingRecoveryPortV94 | null;
}
/** Owns one drill generation. A pending result blocks other local sidecar
 * commits. Failed local saves receive an independently confirmed recovery copy.
 * Recovery is explicit and must still pass the original sidecar checks. */
export function useShipTrainingV94(options: Options) {
  const [trainingSession, setTrainingSession] = useState<TrainingSessionV94 | null>(null);
  const [saveIssue, setSaveIssue] = useState<string | null>(null);
  const [canRetryTraining, setCanRetryTraining] = useState(false);
  const [recoveryNotice, setRecoveryNotice] = useState<string | null>(null);
  const [recoveryReady, setRecoveryReady] = useState(false);
  const [hasRecoveryCopy, setHasRecoveryCopy] = useState(false);
  const readableRecovery = useRef<string | null>(null);
  const recoveryUiSequence = useRef(0), clearingRecovery = useRef(false);
  const journal = useRef<ReturnType<typeof createShipTrainingRecoveryQueueV94> | null>(null);
  const checkingRecovery = useRef(false), recoveryBlocked = useRef(false);
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
  useEffect(() => {
    let active = true;
    const owner = options.save.createdAt;
    let port: ShipTrainingRecoveryPortV94 | null = null;
    if (!options.controlled) {
      try { port = options.recoveryPort === undefined
        ? (typeof globalThis.indexedDB === "undefined" ? null : createShipTrainingRecoveryPortV94())
        : options.recoveryPort; } catch { /* Recovery remains unavailable, not a false saved score. */ }
    }
    checkingRecovery.current = !!port;
    recoveryUiSequence.current++; clearingRecovery.current = false;
    readableRecovery.current = null;
    recoveryBlocked.current = false;
    // Changing owner retires only this UI generation, not queued backup IO.
    session.current = null; receipt.current = null; controlledUncertain.current = false;
    const queue = port ? createShipTrainingRecoveryQueueV94(owner, port) : null;
    journal.current = queue;
    void (queue ? queue.read() : Promise.resolve(null)).then(raw => {
        if (!active || !mounted.current || live.current.save.createdAt !== owner) return;
        if (!session.current) setTrainingSession(null);
        if (raw === null) {
          if (!receipt.current) {
            if (!session.current) { setSaveIssue(null); setCanRetryTraining(false); }
            setRecoveryNotice(null); setHasRecoveryCopy(false);
          }
          return;
        }
        readableRecovery.current = raw; setHasRecoveryCopy(true);
        const recovered = restoreShipTrainingReceiptV94(raw, live.current.save);
        if (!recovered) {
          recoveryBlocked.current = true;
          setRecoveryNotice("Copie de score incompatible avec cette progression, conservée sans modification. Aucun nouvel entraînement ne la remplace.");
          return;
        }
        receipt.current = recovered; setCanRetryTraining(true);
        setSaveIssue(`${TRAINING_LABELS[recovered.disciplineId]} : score ${recovered.score}/100 retrouvé. Vérifiez sa sauvegarde sans rejouer l’épreuve.`);
        setRecoveryNotice("Copie de secours retrouvée. La progression ne changera qu’après votre réessai explicite.");
      }).catch(() => {
        if (active && mounted.current) setRecoveryNotice("Copie de secours inaccessible. Les éventuels scores non confirmés restent seulement en mémoire.");
      }).finally(() => {
        if (active && mounted.current) { checkingRecovery.current = false; setRecoveryReady(true); }
      });
    return () => { active = false; };
  }, [options.save.createdAt, options.controlled, options.recoveryPort]);
  const updateRecovery = useCallback((pending: ShipTrainingReceiptV94 | null) => {
    const queue = journal.current;
    const sequence = ++recoveryUiSequence.current;
    const snapshot = pending?.recoveryCopy() ?? null;
    if (snapshot) { readableRecovery.current = JSON.stringify(snapshot); setHasRecoveryCopy(true); }
    if (pending && (!queue || !snapshot)) {
      setRecoveryNotice("Pas de copie de secours confirmée : réessayez la sauvegarde avant de quitter le vaisseau.");
      return;
    }
    if (!queue) return;
    setRecoveryNotice(pending ? "Protection du score en cours…" : "Clôture de la copie de secours…");
    void queue.replace(snapshot ? JSON.stringify(snapshot) : null).then(() => {
      if (mounted.current && journal.current === queue && sequence === recoveryUiSequence.current) {
        if (!pending) { readableRecovery.current = null; setHasRecoveryCopy(false); }
        setRecoveryNotice(pending
          ? "Copie de secours du score confirmée. Elle sera proposée au retour dans ce vaisseau, même après rechargement."
          : null);
      }
    }).catch(() => {
      if (mounted.current && journal.current === queue && sequence === recoveryUiSequence.current) setRecoveryNotice(pending
        ? "Copie de secours non confirmée ou modifiée dans une autre session. Ce score reste en mémoire ; réessayez avant de quitter."
        : "Score sauvegardé ; clôture de sa copie de secours non confirmée. Elle sera vérifiée au prochain retour.");
    });
  }, []);
  const available = useCallback(() => {
    const o = live.current;
    const root = o.rootRef.current;
    return mounted.current && !clearingRecovery.current && !checkingRecovery.current && !recoveryBlocked.current && !o.suspended && pageActivitySnapshotV94() && !!root &&
      !root.closest('[inert],[hidden],[aria-hidden="true"],[aria-disabled="true"]');
  }, []);
  const hasPendingResult = useCallback(() => clearingRecovery.current || checkingRecovery.current || recoveryBlocked.current || receipt.current !== null || controlledUncertain.current, []);
  const retryTrainingSave = useCallback(() => {
    const o = live.current, pending = receipt.current;
    if (!mounted.current || !pending || clearingRecovery.current) return;
    const result = pending.attempt(o.save, o.progression, available());
    if (result.status === "ignored") return;
    if (result.status === "pending") { setSaveIssue(result.message); notify(result.message); updateRecovery(pending); return; }
    // Consume the receipt BEFORE callbacks; a reentrant receiver cannot repeat it.
    finishing.current = true;
    updateRecovery(null);
    receipt.current = null; session.current = null; setTrainingSession(null); setSaveIssue(null); setCanRetryTraining(false);
    try {
      o.onConfirmed(result.state);
      notify(`${TRAINING_LABELS[pending.disciplineId]} : résultat ${pending.score}/100 sauvegardé.`);
    } catch { notify("Score sauvegardé, mais l’affichage du vaisseau n’a pas pu être actualisé. Rouvrez sa console."); }
    finally { finishing.current = false; }
  }, [available, notify, updateRecovery]);
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
  const exportTrainingRecovery = useCallback(() => {
    if (!mounted.current || live.current.suspended || !readableRecovery.current) return;
    let url: string | undefined;
    try {
      url = URL.createObjectURL(new Blob([readableRecovery.current], { type: "application/json" }));
      const link = document.createElement("a");
      link.href = url; link.download = "YAUTJA_score_en_attente.json"; link.click();
      // Allow the browser to consume the download before revoking its resource.
      const exportedUrl = url; setTimeout(() => URL.revokeObjectURL(exportedUrl), 1000);
      notify("Copie du score exportée. Cet export ne confirme pas sa sauvegarde dans le vaisseau.");
    } catch {
      if (url) URL.revokeObjectURL(url);
      notify("Export de la copie non confirmé. Le score et sa copie restent inchangés.");
    }
  }, [notify]);
  const discardTrainingRecovery = useCallback(async () => {
    if (!mounted.current || live.current.suspended || checkingRecovery.current || clearingRecovery.current || !readableRecovery.current) return;
    if (!window.confirm("Abandonner ce score en attente et sa copie de secours ? Exportez la copie avant de continuer. La progression déjà enregistrée ne sera pas effacée.")) return;
    const queue = journal.current, owner = live.current.save.createdAt;
    const sequence = ++recoveryUiSequence.current;
    clearingRecovery.current = true;
    try {
      if (queue) await queue.replace(null);
      if (!mounted.current || journal.current !== queue || live.current.save.createdAt !== owner) return;
      receipt.current = null; session.current = null; controlledUncertain.current = false; recoveryBlocked.current = false;
      readableRecovery.current = null; setHasRecoveryCopy(false);
      setTrainingSession(null); setSaveIssue(null); setCanRetryTraining(false);
      setRecoveryNotice("Score en attente abandonné. La progression déjà enregistrée est conservée.");
    } catch {
      if (mounted.current && sequence === recoveryUiSequence.current) setRecoveryNotice("Abandon non confirmé : la copie a changé ou reste inaccessible. Aucune progression du vaisseau effacée.");
    } finally {
      if (sequence === recoveryUiSequence.current) clearingRecovery.current = false;
    }
  }, []);
  return { trainingSession, saveIssue, canRetryTraining, requestTraining, completeAutonomousTraining,
    cancelAutonomousTraining, retryTrainingSave, hasPendingResult, recoveryReady, recoveryNotice, hasRecoveryCopy, exportTrainingRecovery, discardTrainingRecovery };
}
