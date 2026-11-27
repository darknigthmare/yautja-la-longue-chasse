"use client";
/* eslint-disable @next/next/no-img-element -- archive PNG plates must keep their full framing. */
import { useState } from "react";
import Link from "next/link";
import extension from "../../../content/the-pit/les-masques-brises/extension.v1.json";
import art from "../../../content/the-pit/les-masques-brises/art-index.v1.json";
import styles from "../../game/PitMasksBrokenPrologue.module.css";

const categories = [
  ["fighters", "Chasseurs"], ["stages", "Lieux"], ["enemies", "Ennemis"],
  ["bosses", "Adversaires"], ["props", "Objets"], ["projectiles", "Projectiles"],
] as const;
const illustrations = new Map(art.images.map(entry => [entry.id, entry]));
const relatedNames = new Map(categories.flatMap(([key]) => extension[key].map(entry => [entry.id, entry.name] as const)));

function searchable(value: string) {
  return value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

export default function PitMasksBrokenCatalog() {
  const [category, setCategory] = useState<(typeof categories)[number][0]>("fighters");
  const [query, setQuery] = useState("");
  const [illustrated, setIllustrated] = useState(false);
  const needle = searchable(query.trim());
  const results = extension[category].filter(entry =>
    (!illustrated || illustrations.has(entry.id)) &&
    searchable([entry.id, entry.name, entry.summary, entry.gameplayRole].join(" ")).includes(needle));

  return <main className={styles.root} data-pit-masks-catalog>
    <header className={styles.header}>
      <div><p>Atelier du Pit</p><h1>Les Masques Brisés</h1></div>
      <Link href="/pit-lab">Retour à l’atelier</Link>
    </header>
    <p>Registre de conception. Les dessins documentent les silhouettes, les lieux et les objets en préparation.</p>
    <div className={styles.controls} aria-label="Catégorie du registre">
      {categories.map(([key, label]) =>
        <button key={key} type="button" aria-pressed={key === category}
          onClick={() => setCategory(key)}>{label}</button>)}
    </div>
    <div className={styles.controls}>
      <label>Rechercher une fiche <input value={query} onChange={event => setQuery(event.target.value)} /></label>
      <label><input type="checkbox" checked={illustrated} onChange={event => setIllustrated(event.target.checked)} /> Avec illustration</label>
    </div>
    <p role="status" data-pit-masks-catalog-count>{results.length} fiche{results.length === 1 ? "" : "s"}</p>
    <div className={styles.gallery}>
      {results.map(entry => {
        const image = illustrations.get(entry.id);
        const stages = "stageIDs" in entry ? entry.stageIDs : [];
        return <article key={entry.id} className={styles.rack} data-pit-masks-catalog-card={entry.id}>
          {image && <img loading="lazy" src={image.publicPath} alt={entry.name} />}
          <h2>{entry.name}</h2>
          <p>{entry.summary}</p>
          <details>
            <summary>Lire la fiche</summary>
            <p>{entry.gameplayRole}</p>
            <p>{entry.counterplay}</p>
            {stages.length > 0 && <p>{stages.map(id => relatedNames.get(id) ?? id).join(" · ")}</p>}
          </details>
        </article>;
      })}
    </div>
    <section className={styles.dossier} aria-labelledby="pit-masks-acts">
      <h2 id="pit-masks-acts">Les cinq actes</h2>
      {extension.campaign.map(act => <details key={act.id} data-pit-masks-catalog-act={act.id}>
        <summary>{act.name}</summary><p>{act.objective}</p><ol>
          {act.stageIDs.map(id => <li key={id}>{relatedNames.get(id) ?? id}</li>)}
        </ol>
      </details>)}
    </section>
  </main>;
}
