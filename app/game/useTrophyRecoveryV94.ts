"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SaveGame } from "./types";
import type { SaveWriteFailure } from "./save";
import { restoreTrophyWorkshopCommitV94, type TrophyWorkshopCommitV94 } from "./systems/trophyWorkshopCommitV94";
import { createTrophyWorkshopRecoveryPortV94, createTrophyWorkshopRecoveryQueueV94,
  type TrophyWorkshopRecoveryPortV94 } from "./systems/trophyWorkshopRecoveryV94";

interface Options {
  owner: string;
  enabled: boolean;
  saveRef: { current: SaveGame };
  pendingRef: { current: TrophyWorkshopCommitV94 | null };
  setPending: (receipt: TrophyWorkshopCommitV94 | null) => void;
  setFailure: (failure: SaveWriteFailure | null) => void;
  closeWorkshop: () => void;
  port?: TrophyWorkshopRecoveryPortV94;
}
interface RecoveryView {
  owner: string; ready: boolean; busy: boolean; incompatible: boolean; raw: string | null; message: string;
}
const emptyView = (owner: string): RecoveryView => ({ owner, ready: false, busy: false, incompatible: false, raw: null, message: "" });
interface Session {
  owner: string; active: boolean; ready: boolean; count: number; id: string | null; raw: string | null;
  receipt: TrophyWorkshopCommitV94 | null;
  queue: ReturnType<typeof createTrophyWorkshopRecoveryQueueV94>;
}

/** Independent recovery copy, never a second automatic campaign writer. The
 * original parent alone accepts the result on an explicit, validated retry. */
export function useTrophyRecoveryV94(options: Options) {
  const { owner, enabled, port } = options;
  const [view, setView] = useState<RecoveryView>(() => emptyView(owner));
  const live = useRef(options), session = useRef<Session | null>(null);
  useEffect(() => { live.current = options; });
  useEffect(() => {
    if (!enabled) return;
    const context: Session = { owner, active: true, ready: false, count: 0, id: null, raw: null, receipt: null,
      queue: createTrophyWorkshopRecoveryQueueV94(owner, port ?? createTrophyWorkshopRecoveryPortV94()) };
    session.current = context;
    void context.queue.read().then(raw => {
      if (!context.active || live.current.owner !== owner) return;
      context.raw = raw; context.ready = true;
      const receipt = raw === null ? null : restoreTrophyWorkshopCommitV94(raw, live.current.saveRef.current);
      const incompatible = raw !== null && !receipt;
      const message = incompatible ? "Copie de rite incompatible : aucune campagne n’a été modifiée. Exportez-la avant de décider de l’abandonner."
        : receipt ? "Rite retrouvé dans sa copie de secours. Réessayez sa sauvegarde sans refaire les gestes. La progression n’a pas été modifiée pendant cette lecture." : "";
      if (receipt && !live.current.pendingRef.current) {
        context.id = receipt.recoveryCopy()?.id ?? null; context.receipt = receipt;
        live.current.pendingRef.current = receipt;
        live.current.setPending(receipt); live.current.setFailure("write-failed"); live.current.closeWorkshop();
      }
      setView({ owner, ready: true, busy: false, incompatible, raw, message });
    }).catch(() => {
      context.ready = true;
      if (context.active && live.current.owner === owner) setView({ ...emptyView(owner), ready: true,
        message: "Lecture des copies de rites indisponible. Aucun résultat non confirmé ne peut être annoncé récupérable après fermeture." });
    });
    return () => { context.active = false; if (session.current === context) session.current = null; };
  }, [enabled, owner, port]);

  const backup = useCallback((receipt: TrophyWorkshopCommitV94) => {
    const context = session.current;
    const copy = receipt.recoveryCopy();
    if (!context?.active || context.count > 0 || !copy || copy.owner !== context.owner || context.owner !== live.current.owner) return;
    // Never replace an incompatible or different recovered rite even when the
    // caller has a fresh in-memory success. Its pre-existing copy is protected.
    if (context.raw !== null && context.id !== copy.id) return;
    context.id = copy.id; context.receipt = receipt;
    const raw = JSON.stringify(copy);
    context.count++;
    setView(v => ({ ...v, busy: true, message: "Rite en mémoire ; copie de secours en cours, pas encore confirmée." }));
    void context.queue.replace(raw).then(() => {
      context.raw = raw;
      if (context.active && live.current.owner === context.owner) setView(v => ({ ...v, raw,
        message: "Copie de secours du rite confirmée. Elle sera proposée au retour ; le rite attend toujours son enregistrement dans la campagne." }));
    }).catch(() => {
      if (context.active && live.current.owner === context.owner) setView(v => ({ ...v,
        message: "Copie de secours non confirmée. Le rite reste en mémoire : réessayez la sauvegarde ou exportez avant de fermer l’application." }));
    }).finally(() => {
      context.count--;
      if (context.active && live.current.owner === context.owner) setView(v => ({ ...v, busy: context.count > 0 }));
    });
  }, []);

  const confirmed = useCallback((receipt: TrophyWorkshopCommitV94) => {
    const context = session.current;
    // Copies are removed only from their own observed queue, after preceding
    // backup requests. A retired UI may finish cleanup, never update its parent.
    if (!context || context.owner !== receipt.candidate().createdAt || context.receipt !== receipt || !context.id) return;
    context.count++;
    if (context.active) setView(v => ({ ...v, busy: true }));
    void context.queue.replace(null).then(() => {
      context.raw = null; context.id = null; context.receipt = null;
      if (context.active) setView(v => ({ ...v, raw: null, message: "", incompatible: false }));
    }).catch(() => {
      if (context.active) setView(v => ({ ...v, message: "Rite enregistré ; sa copie n’a pas pu être retirée. Au retour, la reprise vérifiera le résultat sans rejouer la récompense." }));
    }).finally(() => {
      context.count--;
      if (context.active) setView(v => ({ ...v, busy: context.count > 0 }));
    });
  }, []);

  const exportCopy = useCallback(() => {
    const context = session.current;
    if (!context?.raw || context.owner !== live.current.owner) return;
    try {
      const url = URL.createObjectURL(new Blob([context.raw], { type: "application/json" }));
      const link = document.createElement("a"); link.href = url; link.download = "yautja-rite-en-attente.json";
      try { link.click(); } finally { window.setTimeout(() => URL.revokeObjectURL(url), 1000); }
    } catch { setView(v => ({ ...v, message: "Export de la copie impossible. Aucun résultat ni archive n’a été supprimé." })); }
  }, []);
  const discard = useCallback(() => {
    const context = session.current;
    if (!context?.active || context.count > 0 || !context.raw || context.owner !== live.current.owner) return;
    if (!window.confirm("Abandonner uniquement cette copie de rite et son résultat en attente ? La campagne déjà enregistrée ne sera pas effacée.")) return;
    const receipt = live.current.pendingRef.current;
    context.count++;
    setView(v => ({ ...v, busy: true }));
    void context.queue.replace(null).then(() => {
      context.raw = null; context.id = null; context.receipt = null;
      if (!context.active || context.owner !== live.current.owner) return;
      if (live.current.pendingRef.current === receipt) {
        live.current.pendingRef.current = null; live.current.setPending(null);
        if (receipt) { live.current.setFailure(null); live.current.closeWorkshop(); }
      }
      setView(v => ({ ...v, incompatible: false, raw: null, message: "Copie abandonnée. La campagne enregistrée est inchangée." }));
    }).catch(() => {
      if (context.active) setView(v => ({ ...v, message: "Abandon non confirmé : la copie est protégée. Aucune campagne n’a été effacée." }));
    }).finally(() => {
      context.count--;
      if (context.active) setView(v => ({ ...v, busy: context.count > 0 }));
    });
  }, []);
  const isIdle = useCallback(() => {
    const context = session.current;
    return !!context?.active && context.ready && context.owner === live.current.owner && context.count === 0;
  }, []);
  return { ...view, ready: enabled && view.owner === owner && view.ready,
    backup, confirmed, exportCopy, discard, isIdle };
}
