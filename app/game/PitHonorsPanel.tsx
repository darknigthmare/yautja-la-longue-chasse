"use client";

import { useId, useMemo, useState, useSyncExternalStore } from "react";
import { loadPitSave, pitSaveStorageKey, type PitSaveLoadFailure, type PitSaveLoadResult } from "./systems/pitSave";
import { buildPitRewardSlotsV1 } from "./systems/pitContentAccessV1";
import styles from "./PitHonorsPanel.module.css";

type Snapshot = { loading: true } | { loading: false; result: PitSaveLoadResult };
const SERVER_SNAPSHOT: Snapshot = { loading: true };
const FAILURE_LABELS: Record<PitSaveLoadFailure, string> = {
  "storage-unavailable": "Stockage indisponible : les distinctions ne peuvent pas être vérifiées.",
  "read-failed": "Lecture impossible : les archives THE PIT restent intactes.",
  "corrupt-save": "Archive THE PIT endommagée : aucune distinction n’est affichée comme acquise.",
  "future-version": "Cette archive provient d’une version plus récente du jeu.",
  "owner-conflict": "Cette archive appartient à une autre campagne. Ses distinctions restent privées.",
};

/** Read-only external store. Stable snapshots prevent render loops; no sidecar is repaired or created. */
function createHonorsStore(owner: string) {
  let fingerprint = "";
  let snapshot: Snapshot = SERVER_SNAPSHOT;
  const listeners = new Set<() => void>();
  const read = () => {
    let result: PitSaveLoadResult;
    try { result = loadPitSave({ key: pitSaveStorageKey(owner), expectedOwnerSaveCreatedAt: owner }); }
    catch { result = { save: null, loaded: false, failure: "owner-conflict" }; }
    const nextFingerprint = JSON.stringify(result);
    if (nextFingerprint !== fingerprint) {
      fingerprint = nextFingerprint;
      snapshot = { loading: false, result };
    }
    return snapshot;
  };
  const refresh = () => { read(); for (const listener of listeners) listener(); };
  const subscribe = (listener: () => void) => {
    listeners.add(listener);
    const onStorage = (event: StorageEvent) => {
      if (event.key === null || event.key === pitSaveStorageKey(owner)) refresh();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", refresh);
    return () => { listeners.delete(listener); window.removeEventListener("storage", onStorage); window.removeEventListener("focus", refresh); };
  };
  return { read, subscribe, refresh };
}

const SOURCE_LABELS = { arcade: "Arcade", circuit: "Circuit du clan", descent: "Descente" } as const;

/** Original interface clasp. It does not claim to reproduce a canonical glyph. */
function HonorSeal({ earned }: { earned: boolean }) {
  return <svg viewBox="0 0 64 64" className={styles.seal} aria-hidden="true" focusable="false" data-pit-honor-seal={earned ? "open" : "sealed"}>
    <path d="M32 3 57 17 57 47 32 61 7 47 7 17Z" fill="none" stroke="currentColor" strokeWidth="1.5" />
    <path d={earned ? "M15 14 25 20 25 28 17 32 10 28 M49 14 39 20 39 28 47 32 54 28 M22 52 27 42 37 42 42 52" : "M17 13 29 20 29 30 20 35 10 29 M47 13 35 20 35 30 44 35 54 29 M21 52 27 39 37 39 43 52"} fill="currentColor" opacity={earned ? ".8" : ".45"} />
    {earned ? <path d="m23 33 6 6 13-15" fill="none" stroke="currentColor" strokeWidth="3" /> : <><path d="M27 30v-4a5 5 0 0 1 10 0v4" fill="none" stroke="currentColor" strokeWidth="2" /><rect x="24" y="30" width="16" height="13" rx="1" fill="currentColor" /><path d="M32 34v5" stroke="#0b130f" strokeWidth="2" /></>}
  </svg>;
}

export default function PitHonorsPanel({ owner, onOpenPit }: { owner: string; onOpenPit: () => void }) {
  const titleId = useId();
  const store = useMemo(() => createHonorsStore(owner), [owner]);
  const snapshot = useSyncExternalStore(store.subscribe, store.read, () => SERVER_SNAPSHOT);
  const [onlyEarned, setOnlyEarned] = useState(false);
  const honors = useMemo(() => buildPitRewardSlotsV1(snapshot.loading ? null : snapshot.result.save, owner), [snapshot, owner]);
  const failure = snapshot.loading ? null : snapshot.result.failure;
  const readable = !snapshot.loading && !failure && honors.status !== "invalid" && honors.status !== "owner-conflict";
  const entries = honors.entries.filter(entry => !onlyEarned || entry.honor.earned);
  return <section className={styles.panel} aria-labelledby={titleId} data-pit-honors="v38" data-pit-content-access="v1" data-honors-status={snapshot.loading ? "loading" : failure ?? honors.status}>
    <header className={styles.header}>
      <div><p className={styles.eyebrow}>VAISSEAU · DISTINCTIONS DE L’ARÈNE</p><h2 id={titleId}>Distinctions THE PIT</h2><p>Les récompenses de cette campagne, conservées dans vos archives THE PIT.</p></div>
      <button type="button" onClick={onOpenPit}>Rejoindre THE PIT</button>
    </header>
    {snapshot.loading ? <p role="status">Lecture des archives…</p> : !readable ? <div role="status" className={styles.notice}><p>{failure ? FAILURE_LABELS[failure] : "Archive invalide ou propriétaire incompatible : aucun acquis n’est présenté."}</p><button type="button" onClick={store.refresh}>Réessayer la lecture</button></div> : <>
      <div className={styles.controls}>
        <p role="status"><strong>{honors.earnedCount} / {honors.totalCount}</strong> distinctions obtenues</p>
        <label><input type="checkbox" checked={onlyEarned} onChange={event => setOnlyEarned(event.target.checked)} /> Seulement les distinctions obtenues</label>
      </div>
      {entries.length === 0 ? <div className={styles.notice}><p>Aucune distinction obtenue pour cette campagne. Terminez les objectifs Arcade, Circuit ou Descente pour enrichir ce registre.</p><button type="button" onClick={() => setOnlyEarned(false)}>Voir les conditions</button></div> : <div className={styles.grid}>
        {entries.map(({ honor: entry, access }) => <article key={entry.id} className={styles.card} data-pit-honor={entry.id} data-earned={entry.earned}
          data-access-right={access.right} data-access-visual={access.visual} data-access-installation={access.installation} data-access-compatibility={access.compatibility}>
          <div className={styles.cardHeading}><HonorSeal earned={entry.earned} /><div><p className={styles.eyebrow}>{SOURCE_LABELS[entry.source]}</p><p className={styles.accessStatus}>{access.statusLabel}</p></div></div>
          <h3>{access.label}</h3><p>{entry.description}</p>
          {entry.palette && <div className={[styles.palette, access.visual !== "revealed" ? styles.paletteSilhouette : ""].join(" ")} aria-label={access.visual === "revealed" ? "Couleurs de la distinction" : "Palette scellée · débloquer la distinction pour révéler ses couleurs"}>
            {Object.entries(entry.palette).map(([name, color]) => <span key={name} style={access.visual === "revealed" ? { backgroundColor: color } : undefined} title={access.visual === "revealed" ? color : undefined} />)}
          </div>}
          <p className={styles.condition}>{access.conditionLabel}</p>
          <progress value={entry.progress.current} max={entry.progress.total} aria-label={access.label + " · " + entry.progress.label} />
          <small>{entry.progress.label}</small>
        </article>)}
      </div>}
    </>}
    <p className={styles.footnote}>Consultation sans écriture. Les distinctions ne donnent ni honneur, ni équipement, ni trophée de chasse. Les palettes affichent leurs couleurs ; elles ne remplacent pas les costumes dessinés.</p>
  </section>;
}
