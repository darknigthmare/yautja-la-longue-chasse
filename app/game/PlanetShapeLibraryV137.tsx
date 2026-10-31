"use client";

import { useState } from "react";
import { PLANET_RADII_KM_V115, type PlanetSizeV115, type WarShapeCategoryV115 } from "./systems/clanWarShapeAtlasV115";
import { planetShapeLibraryPageV137, PLANET_SHAPE_SCALES_V137, type PlanetShapeScaleV137 } from "./systems/clanWarShapeLibraryV137";
import { planetShapePreviewPathV125 } from "./PlanetShapePreviewV125";
import styles from "./PlanetShapeLibraryV137.module.css";

const labels: Record<WarShapeCategoryV115,string> = {
  island:"Îles", continent:"Continents", region:"Régions",
};

export default function PlanetShapeLibraryV137({
  island, continent, region, planetSize, onChoose,
}: { island:number; continent:number; region:number; planetSize:PlanetSizeV115;
  onChoose:(category:WarShapeCategoryV115,index:number)=>void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [category, setCategory] = useState<WarShapeCategoryV115>("island");
  const [search, setSearch] = useState("");
  const [scale, setScale] = useState<PlanetShapeScaleV137>("all");
  const [page, setPage] = useState(0);
  const selection = { island,continent,region }[category];
  const result = planetShapeLibraryPageV137(category,search,scale,page,8);

  return <section className={styles.library} data-testid="planet-shapes-library-v137">
    <button type="button" className={styles.toggle} aria-expanded={expanded}
      data-testid="planet-shape-library-toggle-v137" onClick={()=>setExpanded(value=>!value)}>
      {expanded ? "Masquer la bibliothèque" : "Explorer les 120 formes existantes"}
    </button>
    {!expanded ? <p>40 îles, 40 continents et 40 régions : dix motifs × quatre emprises par famille.</p> :
      <div className={styles.contents}>
        <p>Choisissez un profil directement dans les 120 formes réellement utilisées par V115. La sélection modifie le brouillon ; cliquez ensuite sur « Générer l’aperçu » pour appliquer la nouvelle géographie.</p>
        <div className={styles.filters}>
          <label>Famille
            <select data-testid="planet-shape-category-v137" value={category}
              onChange={event=>{setCategory(event.target.value as WarShapeCategoryV115);setPage(0);}}>
              {(["island","continent","region"] as const).map(kind=><option key={kind} value={kind}>{labels[kind]}</option>)}
            </select>
          </label>
          <label>Rechercher un motif
            <input data-testid="planet-shape-search-v137" value={search} maxLength={100}
              placeholder="Croissant, trident, fjords…" onChange={event=>{setSearch(event.target.value);setPage(0);}}/>
          </label>
          <label>Emprise du modèle
            <select data-testid="planet-shape-scale-v137" value={scale}
              onChange={event=>{setScale(event.target.value as PlanetShapeScaleV137);setPage(0);}}>
              {PLANET_SHAPE_SCALES_V137.map(item=><option key={item} value={item}>{item==="all"?"Toutes les tailles":item}</option>)}
            </select>
          </label>
        </div>
        <p data-testid="planet-shape-count-v137">{result.total} modèle{result.total>1?"s":""} · {labels[category]} · rayon de la planète {PLANET_RADII_KM_V115[planetSize].toLocaleString("fr-FR")} km. La forme conserve sa géométrie angulaire ; les distances et surfaces physiques sont calculées par le générateur.</p>
        {result.total===0 ? <p>Aucun motif correspondant. Modifiez la recherche ou la taille.</p> :
          <div className={styles.cards}>
            {result.shapes.map(template=><article key={template.id} className={styles.card} data-selected={selection===template.index}>
              <svg viewBox="0 0 100 100" role="img" aria-label={"Contour "+template.name}>
                <path d={planetShapePreviewPathV125(category,template.index)} fill="#829e87" stroke="#d5dfb7" strokeWidth="1.2" strokeLinejoin="round"/>
              </svg>
              <strong>{template.name}</strong>
              <p>{template.description}</p>
              <button type="button" data-testid="planet-shape-select-v137" disabled={selection===template.index}
                onClick={()=>onChoose(category,template.index)}>
                {selection===template.index?"Sélection actuelle":"Appliquer cette forme"}
              </button>
            </article>)}
          </div>}
        <nav className={styles.pages} aria-label="Pages des modèles">
          <button type="button" disabled={result.page<=0} onClick={()=>setPage(value=>Math.max(0,value-1))}>Précédente</button>
          <span>Page {result.pages?result.page+1:0} / {result.pages}</span>
          <button type="button" disabled={result.pages===0||result.page+1>=result.pages}
            onClick={()=>setPage(value=>value+1)}>Suivante</button>
        </nav>
        <p className={styles.note}>Ces silhouettes ne sont pas des cartes 1:1 d’un film : les côtes et territoires jouables sont construits par le moteur géographique V115 à partir des motifs choisis.</p>
      </div>}
  </section>;
}
