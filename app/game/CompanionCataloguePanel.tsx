"use client";

import { useId, useState } from "react";
import catalogue from "./data/companionCatalogueV56.json";
import {
  canCompanionAppearAboard,
  type CompanionAboardAssignment,
  type CompanionShipContext,
} from "./systems/clanChronicle";
import styles from "./CompanionCataloguePanel.module.css";

interface Props {
  /** Evidence from a future recruitment flow, never created by browsing this catalogue. */
  assignments?: Readonly<Record<string, CompanionAboardAssignment>>;
  shipContext?: CompanionShipContext;
}

/** Read-only reference register. It does not write a save, recruit or spawn an occupant. */
export default function CompanionCataloguePanel({ assignments, shipContext }: Props) {
  const [selectedId, setSelectedId] = useState(catalogue.entries[0].id);
  const titleId = useId();
  const selected = catalogue.entries.find(entry => entry.id === selectedId) ?? catalogue.entries[0];
  const aboard = canCompanionAppearAboard(assignments?.[selected.id], shipContext);
  const original = selected.origin === "user-original";

  return <section className={styles.catalogue} aria-labelledby={titleId}
    data-companion-catalogue="v56" data-companion-write-policy="read-only">
    <header className={styles.heading}>
      <div><p className={styles.eyebrow}>REGISTRE DU CLAN · COMPAGNONS</p>
        <h3 id={titleId}>Les créatures de la chasse</h3></div>
      <span className={styles.count}>11 fiches · 11 poses</span>
    </header>
    <p className={styles.notice}>Dix créations originales et une interprétation fournie du PredDog de 2018.
      Les images sont intégrées à ce registre ; les missions de rencontre et de recrutement ne sont pas produites.
      Aucun de ces dessins n’est présenté comme le chien de Tracker de 2010.</p>

    <div className={styles.viewer}>
      <figure className={styles.portrait}>
        <img key={selected.id} src={selected.imagePath} alt={selected.description}
          width={selected.width} height={selected.height} decoding="async" />
        <figcaption>POSE FOURNIE · VUE {selected.facing === "left" ? "VERS LA GAUCHE" : "VERS LA DROITE"}</figcaption>
      </figure>
      <div className={styles.detail} aria-live="polite" aria-atomic="true">
        <span className={styles.origin}>{original ? "Création originale utilisateur" : "PredDog 2018 · interprétation utilisateur"}</span>
        <h4>{selected.name}</h4>
        <p>{selected.description}</p>
        <dl className={styles.facts}>
          <div><dt>Dessin</dt><dd>1 pose fixe détourée</dd></div>
          <div><dt>Animations natives</dt><dd>Aucune produite</dd></div>
          <div><dt>Recrutement</dt><dd>Mission à produire</dd></div>
          <div><dt>Présence à bord</dt><dd>{aboard ? "Conditions d’affectation remplies" : "Non autorisée · aucune affectation validée"}</dd></div>
        </dl>
        <p className={styles.provenance}>Source conservée : {selected.sourceName}.
          Détourage OpenAI, sans nouvelle pose. Fidélité au dessin recherchée, réplique cinéma 1:1 non certifiée.</p>
        <a className={styles.sourceLink} href={encodeURI(selected.sourcePath)} download={selected.sourceName}>Télécharger l’original fourni</a>
      </div>
    </div>

    <div className={styles.roster} role="group" aria-label="Choisir une fiche de compagnon">
      {catalogue.entries.map((entry, index) => <button key={entry.id} type="button"
        aria-pressed={selectedId === entry.id} onClick={() => setSelectedId(entry.id)}
        className={styles.card} data-companion-id={entry.id}>
        <span className={styles.number}>{String(index + 1).padStart(2, "0")}</span>
        <img src={entry.imagePath} alt="" width={entry.width} height={entry.height} loading="lazy" decoding="async" />
        <span className={styles.cardName}>{entry.name}</span>
      </button>)}
    </div>

    <aside className={styles.contract} data-companion-aboard-contract="canCompanionAppearAboard">
      <h4>Une rencontre ne vaut pas une affectation</h4>
      <p>La règle du vaisseau exige un recrutement réel, un allié disponible, une affectation active au bon vaisseau,
        un module installé et compatible, puis un réaménagement terminé au port. Le vaisseau doit être physiquement disponible.
        Un compagnon déployé sur le terrain n’apparaît pas simultanément à bord.</p>
      <p>Ce registre consulte cette règle ; ouvrir une fiche ne crée aucune de ces preuves, aucune cabine et aucun occupant.</p>
    </aside>
  </section>;
}
