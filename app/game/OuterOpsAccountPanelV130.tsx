"use client";
/** CW130-NET-006 / 012 · Outer Ops mandates held by the account authority.
 * Rendered only with a configured authority URL and a signed-in cloud account;
 * otherwise the local Outer Ops panel stays the only mode. */
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { CLOUD_SESSION_KEY_V71, parseCloudSessionV71, type CloudSessionV71 } from "./systems/cloudAccountRestV71";
import {
  createOuterOpsAccountClientV130, outerOpsAccountAvailableV130, outerOpsOrderV130, OuterOpsAccountErrorV130,
  OUTER_OPS_ACCOUNT_URL_V130, type OuterOpsOrderKindV130, type OuterOpsStateV130,
} from "./systems/outerOpsAccountClientV130";
import styles from "./OuterOpsAccountPanelV130.module.css";

const outcomeLabels: Record<string, string> = { victory: "victoire", defeat: "défaite", retreat: "repli" };
const seconds = (ms: number) => {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return Math.floor(total / 60) + ":" + String(total % 60).padStart(2, "0");
};
const readStoredSession = () => {
  try { return window.localStorage.getItem(CLOUD_SESSION_KEY_V71); } catch { return null; }
};
const subscribeSession = (notify: () => void) => {
  const changed = (event: StorageEvent) => { if (event.key === CLOUD_SESSION_KEY_V71) notify(); };
  window.addEventListener("storage", changed);
  return () => window.removeEventListener("storage", changed);
};
/** Same snapshot, same id: a repeated click is refused by the authority as a duplicate. */
const orderId = (state: OuterOpsStateV130) => "ui-" + state.revision + "-" + state.nextSequence;

export interface OuterOpsAccountPanelV130Props {
  /** Authority URL; defaults to the build configuration. */
  url?: string | null;
  /** Polling period for the authoritative snapshot. */
  refreshMs?: number;
}

export default function OuterOpsAccountPanelV130({ url = OUTER_OPS_ACCOUNT_URL_V130, refreshMs = 5000 }: OuterOpsAccountPanelV130Props) {
  const storedSession = useSyncExternalStore(subscribeSession, readStoredSession, () => null);
  const session: CloudSessionV71 | null = useMemo(() => parseCloudSessionV71(storedSession), [storedSession]);
  const [state, setState] = useState<OuterOpsStateV130 | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [received, setReceived] = useState(0);
  const [now, setNow] = useState(0);
  const seenRevision = useRef<number | null>(null);
  const api = useMemo(() => createOuterOpsAccountClientV130(url), [url]);

  const available = outerOpsAccountAvailableV130(url, session);
  const reload = useCallback(async () => {
    if (!session) return;
    try {
      const next = await api.state(session);
      const at = Date.now();
      // A server-side change (settlement, another device) makes the last order message stale.
      if (seenRevision.current !== null && seenRevision.current !== next.revision) setMessage("");
      seenRevision.current = next.revision;
      setState(next); setReceived(at); setNow(at);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Serveur des mandats indisponible.");
    }
  }, [api, session]);

  useEffect(() => {
    if (!available) return;
    const first = window.setTimeout(() => { void reload(); }, 0);
    const timer = window.setInterval(() => { void reload(); }, refreshMs);
    const clock = window.setInterval(() => setNow(Date.now()), 1000);
    return () => { window.clearTimeout(first); window.clearInterval(timer); window.clearInterval(clock); };
  }, [available, reload, refreshMs]);

  const send = useCallback(async (kind: OuterOpsOrderKindV130, fields: Record<string, unknown>) => {
    if (!session || !state || busy) return;
    setBusy(true);
    try {
      const result = await api.order(session, outerOpsOrderV130(state, kind, fields, orderId(state)));
      const at = Date.now();
      seenRevision.current = result.state.revision;
      setState(result.state); setReceived(at); setNow(at);
      setMessage(result.message);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Ordre non confirmé.");
      if (error instanceof OuterOpsAccountErrorV130 && error.code === "state-changed") await reload();
    } finally {
      setBusy(false);
    }
  }, [api, busy, reload, session, state]);

  if (!available) return null;
  const elapsed = received && now > received ? now - received : 0;
  return <section className={styles.panel} aria-labelledby="outer-ops-account-v130" data-outer-ops-account-v130="true">
    <h4 id="outer-ops-account-v130">Mandats du compte · serveur</h4>
    <p className={styles.explain}>Le serveur fixe l&apos;heure, le départ, les incidents, le rappel et le reçu. Changer l&apos;horloge de l&apos;appareil reste sans effet.</p>
    {state ? <>
      <p className={styles.summary}>RAV {state.rav} · révision {state.revision} · {state.operations.length} mandat(s) en cours · {state.receipts.length} reçu(s) signé(s)</p>
      {state.operations.map(operation => <article key={operation.id} className={styles.operation}>
        <strong>{operation.targetId}</strong>
        <span>{operation.recall ? "Retour au clan" : "Rapport"} dans {seconds(operation.remainingMs - elapsed)}</span>
        <div className={styles.actions}>
          {operation.incident ? <>
            <button type="button" disabled={busy} onClick={() => void send("incident", { operationId: operation.id, decision: "secure" })}>Sécuriser le passage</button>
            <button type="button" disabled={busy} onClick={() => void send("incident", { operationId: operation.id, decision: "detour" })}>Contourner</button>
          </> : null}
          {!operation.recall ? <button type="button" disabled={busy} onClick={() => void send("recall", { operationId: operation.id })}>Rappeler</button> : null}
        </div>
      </article>)}
      {state.suggestedDispatch ? <button type="button" className={styles.dispatch} disabled={busy}
        onClick={() => void send("start", { ...state.suggestedDispatch })}>
        Confier {state.suggestedDispatch.targetId} à {state.suggestedDispatch.teamIds.join(", ")} (reconnaissance)
      </button> : <p className={styles.explain}>Aucun détachement libre pour un nouveau mandat.</p>}
      {state.receipts.length ? <ul className={styles.receipts} aria-label="Derniers reçus signés">
        {state.receipts.slice(-3).reverse().map(receipt => <li key={receipt.operationId}>
          {receipt.operationId} · {outcomeLabels[receipt.report.outcome ?? ""] ?? "rapport"} · signé {receipt.signature.slice(0, 8)}…
        </li>)}
      </ul> : null}
    </> : <p className={styles.explain}>Lecture de l&apos;état du serveur…</p>}
    {message ? <p role="status" className={styles.status}>{message}</p> : null}
  </section>;
}
