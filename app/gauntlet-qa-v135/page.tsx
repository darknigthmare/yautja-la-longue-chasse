"use client";

import {useMemo,useState} from "react";
import JungleHunterLayeredV134 from "../game/JungleHunterLayeredV134";
import GauntletKnownHuntersV135, {isKnownHunterGauntletV135} from "../game/GauntletKnownHuntersV135";
import {GAUNTLET_CATALOG_V132,GAUNTLET_EVIDENCE_LABELS_V132} from "../game/systems/clanWarGauntletCatalogV132";
import styles from "./GauntletVisualQaV135.module.css";

const MODELS=["jungle-hunter","city-hunter","wolf","feral","dek"] as const;
const cards=MODELS.map(id=>GAUNTLET_CATALOG_V132.find(x=>x.id===id)!);

function Art({id,open}:{id:string;open:boolean}){
  if(id==="jungle-hunter")return <JungleHunterLayeredV134 coverOpen={open}/>;
  if(isKnownHunterGauntletV135(id))return <GauntletKnownHuntersV135 variant={id} coverOpen={open}/>;
  return null;
}

/** Purposefully isolated QA preview: reads source art only and never edits save,
 * battle rules, the player's profile or any browser preferences. */
export default function GauntletVisualQaV135(){
  const [selected,setSelected]=useState<string>("jungle-hunter");
  const [open,setOpen]=useState(true);
  const [sideBySide,setSideBySide]=useState(false);
  const [zoom,setZoom]=useState(100);
  const model=useMemo(()=>cards.find(x=>x.id===selected)??cards[0],[selected]);
  return <main className={styles.page} data-testid="gauntlet-visual-qa-v135">
    <header className={styles.header}>
      <p>YAUTJA · ATELIER VISUEL DE VALIDATION</p>
      <h1>Cinq gauntlets à calques indépendants</h1>
      <p>Études graphiques provenant des fichiers réellement utilisés par la projection des guerres de clans. Aucun modèle n&apos;est encore certifié identique au film 1:1.</p>
      <a href="https://github.com/darknigthmare/yautja-la-longue-chasse/pull/42" target="_blank" rel="noopener noreferrer">Voir la PR et la liste de production</a>
    </header>
    <section className={styles.controls} aria-label="Commandes de comparaison">
      <fieldset><legend>Modèle</legend>
        {cards.map(x=><button key={x.id} type="button" aria-pressed={selected===x.id}
          onClick={()=>setSelected(x.id)}>{x.name}</button>)}
      </fieldset>
      <div className={styles.options}>
        <button type="button" aria-pressed={open} onClick={()=>setOpen(x=>!x)}>
          {open?"Refermer le capot":"Ouvrir le capot"}</button>
        <button type="button" aria-pressed={sideBySide} onClick={()=>setSideBySide(x=>!x)}>
          {sideBySide?"Vue individuelle":"Comparer les 5 modèles"}
        </button>
        <label>Zoom visuel · {zoom}% <input type="range" min="75" max="145" step="5" value={zoom}
          onChange={e=>setZoom(Number(e.currentTarget.value))}/></label>
      </div>
    </section>
    {sideBySide?<section className={styles.grid} aria-label="Comparaison côte à côte">
      {cards.map(x=><article key={x.id} data-art-model={x.id}>
        <h2>{x.name}</h2>
        <div className={styles.stage}><Art id={x.id} open={open}/></div>
        <p>{GAUNTLET_EVIDENCE_LABELS_V132[x.evidence]}</p>
        <p>Validation artistique : NON · source personnelle à revoir.</p>
      </article>)}
    </section>:<section className={styles.single} aria-label="Modèle étudié" data-art-model={selected}>
      <div className={styles.stage} data-zoom={zoom}>
        <div style={{width:`${zoom}%`}} className={styles.zoomFrame}><Art id={selected} open={open}/></div>
      </div>
      <article className={styles.info}>
        <h2>{model.name}</h2>
        <p><strong>Preuve actuelle :</strong> {GAUNTLET_EVIDENCE_LABELS_V132[model.evidence]}</p>
        <p><strong>Objectif graphique :</strong> {model.artBrief}</p>
        <p><strong>Limite :</strong> {model.notes}</p>
        <a href={model.sourceUrl} target="_blank" rel="noopener noreferrer">Source de référence à vérifier</a>
        <p>État : 4 ou 7 SVG indépendants selon le modèle, PNG alpha exportables, mais proportions, authenticité des inscriptions, textures et mouvements encore à homologuer.</p>
      </article>
    </section>}
    <footer><p>Le laboratoire ne touche ni aux sauvegardes ni aux résultats des batailles. Comparaison visuelle à valider humainement avant toute fusion dans la campagne.</p></footer>
  </main>;
}
