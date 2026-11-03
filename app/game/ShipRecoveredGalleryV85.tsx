"use client";

/* eslint-disable @next/next/no-img-element -- the supplied PNGs retain their source canvases */

import { useEffect, useMemo, useRef, useState } from "react";
import recovered from "./data/shipRecoveredAssetsV85.json";
import driveLatest from "./data/driveLatestSpritesV85.json";
import type { ShipId } from "./shipCatalogue";
import styles from "./ShipRecoveredGalleryV85.module.css";

interface RecoveredShipArt {
  id: string; title: string; src: string; width: number; height: number;
  group: string; viewLabel: string; relatedShipIds: readonly string[];
}
const RECOVERED_VIEWS: readonly RecoveredShipArt[] = [
  ...recovered.entries,
  ...driveLatest.assets.filter(entry => entry.kind === "ship").map(entry => ({
    id: entry.id, title: entry.label, src: entry.src, width: entry.width, height: entry.height,
    group: "Drive_20261007",
    viewLabel: entry.label.endsWith("dessus") ? "Vue du dessus" : entry.label.endsWith("face") ? "Vue de face" : "Vue de côté",
    // AVP landing craft stays unassigned: a landing craft is not a drop pod.
    relatedShipIds: entry.label.startsWith("Predator 1987") ? ["classic-predator-spaceship"] :
      entry.label.startsWith("Predator 2 NECA") ? ["lost-tribe-spaceship"] :
      entry.label.startsWith("AVP 2004 mothership") ? ["avp-predator-mothership"] : [],
  })),
];
const GROUP_LABELS: Readonly<Record<string, string>> = {
  Collector: "Collector",
  Killer_of_Killers: "Killer of Killers",
  Badlands: "Badlands",
  Judge_Dredd: "Judge Dredd",
  Blade_Fighter: "Blade Fighter",
  Autres: "À identifier",
  Drive_20261007: "Drive · vues du 7 octobre",
};

/** Successive authored views remain inspectable without inventing hull ownership. */
export default function ShipRecoveredGalleryV85({ shipId, suspended = false, onActiveChange }: { shipId: ShipId; suspended?: boolean; onActiveChange?: (active: boolean) => void }) {
  const [filter, setFilter] = useState("selected");
  const [opened, setOpened] = useState<RecoveredShipArt | null>(null);
  const dialog = useRef<HTMLDialogElement | null>(null);
  const groups = useMemo(() => [...new Set(RECOVERED_VIEWS.map(entry => entry.group))], []);
  const associated = useMemo(() => RECOVERED_VIEWS.filter(entry => entry.relatedShipIds.includes(shipId)), [shipId]);
  const entries = useMemo(() => filter === "selected" ? associated :
    filter === "all" ? RECOVERED_VIEWS : RECOVERED_VIEWS.filter(entry => entry.group === filter), [associated, filter]);

  useEffect(() => {
    const element = dialog.current;
    if (opened && !suspended && element && !element.open) element.showModal();
    else if ((!opened || suspended) && element?.open) element.close();
  }, [opened, suspended]);
  useEffect(() => {
    onActiveChange?.(opened !== null && !suspended);
    return () => onActiveChange?.(false);
  }, [opened, suspended, onActiveChange]);

  return <section className={styles.gallery} aria-labelledby="ship-recovered-title" data-recovered-ships="v85" inert={suspended}>
    <header className={styles.header}>
      <div><p className="eyebrow">ATELIER DE COQUES · COLLECTION DES 6 ET 7 OCTOBRE</p><h3 id="ship-recovered-title">Nouvelles études de vaisseaux</h3></div>
      <span>{RECOVERED_VIEWS.length} images</span>
    </header>
    <div className={styles.filters} role="group" aria-label="Filtrer les études de vaisseaux">
      <button type="button" aria-pressed={filter === "selected"} onClick={() => setFilter("selected")}>Cette fiche ({associated.length})</button>
      <button type="button" aria-pressed={filter === "all"} onClick={() => setFilter("all")}>Toute la collection</button>
      {groups.map(group => <button key={group} type="button" aria-pressed={filter === group} onClick={() => setFilter(group)}>{GROUP_LABELS[group] ?? group}</button>)}
    </div>
    {entries.length ? <div className={styles.grid}>
      {entries.map(entry => <figure key={entry.id} className={styles.card}>
        <button type="button" className={styles.imageButton} aria-label={`Agrandir : ${entry.title}`} onClick={() => setOpened(entry)}>
          <img src={entry.src} alt={entry.title} width={entry.width} height={entry.height} loading="lazy" decoding="async" draggable={false} />
        </button>
        <figcaption><strong>{entry.title}</strong><span>{GROUP_LABELS[entry.group] ?? entry.group} · {entry.viewLabel}</span>
          {entry.relatedShipIds.length === 0 && <small>Identité précise à confirmer</small>}</figcaption>
      </figure>)}
    </div> : <p className={styles.empty}>Cette coque n’a pas d’étude attribuée dans ce lot. <button type="button" onClick={() => setFilter("all")}>Ouvrir la collection</button></p>}
    <details className={styles.source}><summary>Origine des vues et des corrections</summary>
      <p>Images générées et récupérées dans la collection du projet. Plusieurs vues sont des corrections successives du même sujet. Les vues absentes des œuvres peuvent être reconstruites ; leur fidélité 1:1 reste à établir.</p>
    </details>
    <dialog ref={dialog} className={styles.dialog} onClose={() => setOpened(null)} onKeyDown={event => event.stopPropagation()} aria-labelledby="ship-recovered-dialog-title">
      {opened && <><header><div><h3 id="ship-recovered-dialog-title">{opened.title}</h3><p>{GROUP_LABELS[opened.group] ?? opened.group} · {opened.viewLabel}</p></div>
        <button type="button" autoFocus onClick={() => dialog.current?.close()} aria-label="Fermer la vue agrandie">Fermer</button></header>
        <img src={opened.src} alt={opened.title} width={opened.width} height={opened.height} draggable={false} />
      </>}
    </dialog>
  </section>;
}
