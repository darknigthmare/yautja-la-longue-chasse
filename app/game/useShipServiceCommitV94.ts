"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { pageActivitySnapshotV94 } from "./systems/pageActivityV94";
import {
  synchronizeShipProgression,
  writeShipProgressionWithStatus,
  type ShipProgressionState,
  type ShipProgressionWriteResult,
} from "./systems/progression";
import {
  classifyShipTrainingAcknowledgementV94,
  observeShipTrainingAcknowledgementV94,
  type ShipTrainingReceiverV94,
} from "./systems/shipTrainingAcknowledgementV94";
import type { SaveGame } from "./types";

/** Observers may be synchronous or asynchronous; neither kind owns storage. */
export function observeShipNotificationV94(observer: () => unknown): void {
  try { void Promise.resolve(observer()).catch(() => undefined); }
  catch { /* An observer cannot roll back an acknowledged write. */ }
}

interface Options {
  save: SaveGame;
  progression: ShipProgressionState;
  controlled: boolean;
  suspended: boolean;
  rootRef: { current: HTMLElement | null };
  blocked: () => boolean;
  receive?: ShipTrainingReceiverV94;
  onNativeConfirmed: (state: ShipProgressionState) => void;
  onControlledConfirmed?: (state: ShipProgressionState) => void;
  notify: (message: string) => void;
  /** Tests/hosts may supply a synchronous persistence adapter. */
  write?: typeof writeShipProgressionWithStatus;
}
interface Operation {
  owner: string;
  controlled: boolean;
  source: ShipProgressionState;
  expected: ShipProgressionState;
  label: string;
  stop?: () => void;
  confirmed?: boolean;
}

/** One non-training service owns the write boundary until its outcome is known.
 * No Promise is interpreted as success, and unknown external writes are not
 * replayed or redirected into the local sidecar. This is not a cross-tab lock.
 */
export function useShipServiceCommitV94(options: Options) {
  const live = useRef(options);
  const mounted = useRef(false);
  const operation = useRef<Operation | null>(null);
  const [issueState, updateIssue] = useState<{ owner: string; controlled: boolean; message: string } | null>(null);
  const setIssue = useCallback((message: string | null) => {
    updateIssue(message === null ? null : { owner: live.current.save.createdAt, controlled: live.current.controlled, message });
  }, []);
  useEffect(() => { live.current = options; });
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; operation.current?.stop?.(); operation.current = null; };
  }, [options.save.createdAt, options.controlled]);
  useEffect(() => {
    const pending = operation.current;
    // A native save may be followed by another click before the parent render.
    // Do not base that second operation on the just-replaced source object.
    if (pending?.confirmed && options.progression !== pending.source) operation.current = null;
  }, [options.progression]);
  const hasPending = useCallback(() => operation.current !== null, []);
  const notify = useCallback((message: string) => {
    try { live.current.notify(message); } catch { /* A display failure is not a failed write. */ }
  }, []);
  const commit = useCallback((candidate: ShipProgressionState, label = "Progression du vaisseau") => {
    const o = live.current;
    if (!mounted.current || operation.current || o.suspended || o.blocked() || !pageActivitySnapshotV94() ||
        !o.rootRef.current || o.rootRef.current.closest('[inert],[hidden],[aria-hidden="true"],[aria-disabled="true"]')) return;
    if (candidate.ownerSaveCreatedAt !== o.save.createdAt || o.progression.ownerSaveCreatedAt !== o.save.createdAt) {
      notify("Autre campagne : aucune modification du vaisseau autorisée."); return;
    }
    const expected = synchronizeShipProgression(candidate, o.save);
    const token: Operation = { owner: o.save.createdAt, controlled: o.controlled, source: o.progression,
      expected: JSON.parse(JSON.stringify(expected)) as ShipProgressionState, label };
    operation.current = token;
    const owns = () => mounted.current && operation.current === token && live.current.save.createdAt === token.owner && live.current.controlled === token.controlled;
    if (!o.controlled) {
      let result: ShipProgressionWriteResult;
      try { result = (o.write ?? writeShipProgressionWithStatus)(expected, o.save); }
      catch {
        if (!owns()) return;
        setIssue(`${label} : écriture non confirmée. Vérifiez l’archive avant de recommencer ; aucun renvoi automatique.`);
        return;
      }
      if (!owns()) return;
      if (!result.persisted) {
        operation.current = null;
        const message = `${label} : sauvegarde non confirmée. La progression affichée reste inchangée ; vérifiez le stockage avant de réessayer.`;
        setIssue(message); notify(message);
        return;
      }
      token.confirmed = true;
      setIssue(null);
      try { o.onNativeConfirmed(result.state); }
      catch { notify(`${label} sauvegardé, mais affichage non actualisé. Rouvrez le vaisseau.`); return; }
      if (owns()) notify(`${label} · sauvegarde confirmée.`);
      return;
    }
    setIssue(`${label} : confirmation du gestionnaire externe en attente. Aucun second envoi.`);
    const settle = (response: unknown, rejected: boolean) => {
      if (!owns()) return;
      token.stop?.(); token.stop = undefined;
      const status = rejected ? "uncertain" : classifyShipTrainingAcknowledgementV94(response, token.expected, live.current.save);
      if (status === "uncertain") {
        setIssue(`${label} : transmission externe non confirmée. Vérifiez le gestionnaire avant toute nouvelle modification ; aucun renvoi automatique.`);
        return;
      }
      // Legacy void observers keep their delivery contract, not a save claim.
      if (status === "unverified") {
        operation.current = null; setIssue(null);
        notify(`${label} transmis au gestionnaire externe, sauvegarde non vérifiée.`); return;
      }
      token.confirmed = true; setIssue(null);
      try { live.current.onControlledConfirmed?.(token.expected); }
      catch { notify(`${label} confirmé par le gestionnaire, mais affichage non actualisé.`); return; }
      if (owns()) {
        notify(`${label} · sauvegarde confirmée par le gestionnaire externe.`);
        // A cooperating host can already have committed its render before ACK.
        if (live.current.progression !== token.source) operation.current = null;
      }
    };
    try {
      if (!o.receive) { settle(undefined, true); return; }
      const response = o.receive(expected);
      if (response && typeof (response as Promise<unknown>).then === "function") {
        const stop = observeShipTrainingAcknowledgementV94(response as PromiseLike<unknown>, {
          onSettled: settle,
          onExpired: () => { if (owns()) setIssue(`${label} : le gestionnaire externe ne répond pas. L’écriture peut avoir eu lieu ; aucun renvoi automatique.`); },
        });
        if (owns()) token.stop = stop; else stop();
      } else settle(response, false);
    } catch { settle(undefined, true); }
  }, [notify, setIssue]);
  const issue = issueState?.owner === options.save.createdAt && issueState.controlled === options.controlled ? issueState.message : null;
  return { commit, hasPending, issue };
}
