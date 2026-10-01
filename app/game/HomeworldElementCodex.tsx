"use client";

import { useMemo, useState } from "react";
import { HOMEWORLD_ELEMENT_CODEX_V64, type HomeworldElementRecordV64 } from "./systems/homeworldElementCodexV64";
import styles from "./HomeworldElementCodex.module.css";

const categories: Record<string, string> = {
  district: "Quartiers", street: "Rues", building: "Bâtiments", door: "Portes",
  prop: "Mobilier", npc: "Habitants", service: "Interactions", ship: "Spatioport", interior: "Intérieurs",
  floor: "Sols", panel: "Panneaux muraux",
};
const units = (value: number) => Number.isFinite(value) ? Math.round(value * 10) / 10 : "—";
const point = (value: { x: number; y: number }) => `${units(value.x)} ; ${units(value.y)}`;

/** Read-only inspector. Geometry comes from the same records as movement and art. */
export default function HomeworldElementCodex() {
  const [category, setCategory] = useState("all");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const records = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("fr");
    return HOMEWORLD_ELEMENT_CODEX_V64.filter(record => (category === "all" || record.category === category) &&
      (!needle || `${record.label} ${record.id} ${record.districtId} ${record.spaceId}`.toLocaleLowerCase("fr").includes(needle)));
  }, [category, query]);
  const selected = records.find(record => record.id === selectedId) ?? records[0];
  const cycleCategory = (direction: number) => setCategory(current => {
    const ids = ["all", ...Object.keys(categories)];
    return ids[(ids.indexOf(current) + direction + ids.length) % ids.length];
  });
  return <section className={styles.root} aria-label="Codex des éléments de la cité" data-homeworld-element-codex="v64">
    <p className={styles.notice}>Un même registre pilote le plan, les empreintes et ce codex. Les positions sont des coordonnées au sol ; la caméra les projette à 35°. Les silhouettes gardent leurs proportions.</p>
    <div className={styles.filters}>
      <label>Rechercher<input aria-label="Rechercher" type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Nom, lieu ou identifiant…" /></label>
      <label>Famille<select aria-label="Famille" value={category} onChange={event => setCategory(event.target.value)}>
        <option value="all">Tous les éléments</option>
        {Object.entries(categories).map(([id, label]) => <option key={id} value={id}>{label} ({HOMEWORLD_ELEMENT_CODEX_V64.filter(record => record.category === id).length})</option>)}
      </select></label>
      <button type="button" aria-label="Famille précédente" onClick={() => cycleCategory(-1)}>‹</button>
      <button type="button" aria-label="Famille suivante" onClick={() => cycleCategory(1)}>›</button>
      <output aria-live="polite">{records.length} / {HOMEWORLD_ELEMENT_CODEX_V64.length} éléments</output>
    </div>
    <div className={styles.body}>
      <nav className={styles.list} aria-label="Éléments répertoriés">
        {records.map(record => <button type="button" key={record.id} aria-pressed={selected?.id === record.id} onClick={() => setSelectedId(record.id)} data-homeworld-element-id={record.id}>
          <strong>{record.label}</strong><span>{categories[record.category] ?? record.category} · {record.spaceId}</span>
        </button>)}
        {!records.length && <p>Aucun élément ne correspond. Change le filtre ou la recherche.</p>}
      </nav>
      {selected && <article className={styles.record} data-homeworld-element-detail={selected.id}>
        <header><div><small>{selected.id}</small><h4>{selected.label}</h4></div><span className={styles.badge}>{selected.lore === "licensed-reference-adaptation" ? "MOTIF RÉFÉRENCÉ · ADAPTATION" : "CRÉATION ORIGINALE DU PROJET"}</span></header>
        <div className={styles.geometry}>
          <ElementFootprint record={selected} />
          <dl>
            <dt>Espace / quartier</dt><dd>{selected.spaceId} / {selected.districtId || "—"}</dd>
            <dt>Position X ; Y ; Z</dt><dd>{point(selected.position)} ; {units(selected.position.z)}</dd>
            <dt>Largeur × profondeur × hauteur</dt><dd>{units(selected.dimensions.width)} × {units(selected.dimensions.depth)} × {units(selected.dimensions.height)} u.</dd>
            <dt>Repère d’échelle</dt><dd>Chasseur adulte : 100 u. ≈ 2,3 m. Échelle de travail du projet.</dd>
            <dt>Projection</dt><dd>Orthographique · façade sud · sol Y × sin(35°) ; hauteurs verticales non comprimées.</dd>
            {selected.door && <><dt>Seuil / approche</dt><dd>{point(selected.door.threshold)} / {point(selected.door.approach)}</dd><dt>Passage libre</dt><dd>{units(selected.door.clearWidth)} × {units(selected.door.clearHeight)} u.</dd></>}
          </dl>
        </div>
        {selected.asset && <p className={styles.asset}><strong>Image utilisée</strong><code>{selected.asset}</code></p>}
        <h5>Règles de placement</h5><ul>{selected.constraints.map((rule, index) => <li key={`${selected.id}-${index}`}>{rule}</li>)}</ul>
        <aside className={styles.sources}><h5>Références et portée du lore</h5>
          <p>La disposition de cette cité et ses institutions sont une adaptation originale. Une référence de matériau, de motif ou d’objet ne rend pas canonique l’ensemble du lieu.</p>
          {selected.source.length ? selected.source.map((source, index) => <div key={`${source.url}-${index}`}><a href={source.url} target="_blank" rel="noreferrer">{source.label} ↗</a><p>{source.note}</p></div>) : <p>Aucune référence officielle précise attribuée à cet élément. Ne pas le présenter comme une reproduction 1:1.</p>}
        </aside>
      </article>}
    </div>
  </section>;
}

function ElementFootprint({ record }: { record: HomeworldElementRecordV64 }) {
  const footprint = record.footprint;
  if (!footprint) return <div className={styles.noPlan}>Élément sans empreinte bloquante propre.</div>;
  const width = Math.max(1, footprint.right - footprint.left), depth = Math.max(1, footprint.bottom - footprint.top);
  const margin = Math.max(width, depth) * .18 + 24;
  const door = record.door;
  const left = Math.min(footprint.left, door?.approach.x ?? footprint.left) - margin;
  const top = Math.min(footprint.top, door?.approach.y ?? footprint.top) - margin;
  const right = Math.max(footprint.right, door?.approach.x ?? footprint.right) + margin;
  const bottom = Math.max(footprint.bottom, door?.approach.y ?? footprint.bottom) + margin;
  const scale = Math.max(right - left, bottom - top);
  return <figure className={styles.plan}><svg viewBox={`${left} ${top} ${right - left} ${bottom - top}`} role="img" aria-label={`Empreinte au sol de ${record.label}, vue en plan ; seuil et approche en or.`}>
    <rect x={footprint.left} y={footprint.top} width={width} height={depth} rx={scale * .012} fill="#43564d" stroke="#a9c4aa" strokeWidth={scale * .009} />
    {door && <><path d={`M${door.approach.x} ${door.approach.y} L${door.threshold.x} ${door.threshold.y}`} fill="none" stroke="#f4cd83" strokeWidth={scale * .016} strokeDasharray={`${scale * .018} ${scale * .018}`} />
      <path d={`M${door.threshold.x - door.clearWidth / 2} ${door.threshold.y} h${door.clearWidth}`} fill="none" stroke="#fff0c0" strokeWidth={scale * .023} />
      <circle cx={door.approach.x} cy={door.approach.y} r={scale * .021} fill="#f4cd83" /></>}
    <text x={left + scale * .03} y={top + scale * .055} fill="#afc7bd" fontSize={scale * .043}>N ↑</text>
  </svg><figcaption>Vue en plan · vert : empreinte · or : accès. La perspective à l’écran est calculée séparément.</figcaption></figure>;
}
