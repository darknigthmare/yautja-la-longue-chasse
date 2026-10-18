"use client";
/* eslint-disable @next/next/no-img-element -- unchanged supplied PNG references */
import { useState } from "react";
import { recentFaunaVariantsV85, type RecentSpriteSourceV85 } from "./systems/recentSpriteLibraryV85";
import styles from "./HomeworldFaunaCatalogueV77.module.css";

const SPECIES = [
  { id: "kalisk", label: "Kalisk" }, { id: "bud", label: "Bud" },
  { id: "bone-bison", label: "Bone Bison" }, { id: "vulture", label: "Vulture" },
  { id: "luna-bug", label: "Luna Bug" }, { id: "spray-snake", label: "Spray Snake" },
  { id: "exploding-worm", label: "Exploding Worm" }, { id: "squirt", label: "Squirt" },
] as const;

function SpeciesSources({ label, sources }: { label: string; sources: readonly RecentSpriteSourceV85[] }) {
  const [selectedId, setSelectedId] = useState(() => [...sources].reverse().find(source => source.preferredVersion)?.id ?? sources[0]?.id ?? "");
  const [failedId, setFailedId] = useState("");
  const art = sources.find(source => source.id === selectedId) ?? sources[0];
  if (!art) return null;
  return <article className={styles.card} data-recent-fauna-species-v85={label}>
    <h4>{label}</h4>
    <label className={styles.selector}>Pose ou variante conservée
      <select value={art.id} onChange={event => setSelectedId(event.target.value)}>
        {sources.map(source => <option key={source.id} value={source.id}>{source.label}{source.preferredVersion ? "" : " · historique"}</option>)}
      </select>
    </label>
    <figure className={styles.figure}>
      <img key={art.id} src={art.src} alt={art.label} width={art.width} height={art.height} loading="lazy" decoding="async"
        hidden={failedId === art.id} onError={() => setFailedId(art.id)} />
      {failedId === art.id && <p role="status">Cette source n’est pas disponible à son emplacement. Aucune autre espèce ne la remplace.</p>}
      <figcaption>Source native · une pose fixe</figcaption>
    </figure>
    <p>{art.label}</p><p>{art.sourceNote}</p>
    <dl><div><dt>Version et statut</dt><dd>{art.version} · {art.sourceStatus}</dd></div>
      <div><dt>Pixels d’origine</dt><dd>{art.width} × {art.height}</dd></div></dl>
    <a href={art.src} target="_blank" rel="noreferrer">Voir cette image originale</a>
  </article>;
}

/** These static references are separate from scans, spawns and recruitment. */
export default function RecentFaunaReferencesV85() {
  return <details className={styles.references} data-recent-fauna-references-v85>
    <summary>Badlands · nouvelles poses et corrections des packs V7 à V14</summary>
    <p>Les âges, états et poses restent des variantes distinctes. Consulter ces images ne recrute aucun compagnon et ne change ni les animations de marche ni les ennemis de la campagne.</p>
    <div className={styles.grid}>{SPECIES.map(species => <SpeciesSources key={species.id} label={species.label} sources={recentFaunaVariantsV85(species.id)} />)}</div>
  </details>;
}
