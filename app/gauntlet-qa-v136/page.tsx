"use client";
/* eslint-disable @next/next/no-img-element -- user-owned blob URL is never fetched by Next image optimization */

import {useEffect,useMemo,useRef,useState} from "react";
import {GAUNTLET_CATALOG_V132,GAUNTLET_EVIDENCE_LABELS_V132,type GauntletDefinitionV132} from "../game/systems/clanWarGauntletCatalogV132";
import JungleHunterLayeredV134 from "../game/JungleHunterLayeredV134";
import GauntletKnownHuntersV135,{isKnownHunterGauntletV135} from "../game/GauntletKnownHuntersV135";
import GauntletArchiveStudiesV136,{isGauntletArchiveStudyV136} from "../game/GauntletArchiveStudiesV136";
import styles from "./GauntletVisualQaV136.module.css";

const PAGE_SIZE=12;
const ART_PARTS_V136=[
 {id:"arm",label:"Avant-bras"},{id:"shell",label:"Coque"},{id:"panel",label:"Commandes"},
 {id:"lid",label:"Capot"},{id:"hinge",label:"Charnière"},{id:"emitter",label:"Émetteur"},
 {id:"beam",label:"Faisceau"},
] as const;
const mediumNames:Record<string,string>={
  cinema:"Films",animation:"Animation",game:"PHG", "video-game":"Autres jeux",comic:"Comics",
};
function Art({model,coverOpen,hiddenParts}:{model:GauntletDefinitionV132;coverOpen:boolean;hiddenParts:readonly string[]}){
  if(model.id==="jungle-hunter")return <JungleHunterLayeredV134 coverOpen={coverOpen} hiddenParts={hiddenParts}/>;
  if(isKnownHunterGauntletV135(model.id))return <GauntletKnownHuntersV135 variant={model.id} coverOpen={coverOpen} hiddenParts={hiddenParts}/>;
  if(isGauntletArchiveStudyV136(model.id))return <GauntletArchiveStudiesV136 entry={model} coverOpen={coverOpen} hiddenParts={hiddenParts}/>;

  return null;
}
function SourceNote({model}:{model:GauntletDefinitionV132}){
  const grounded=model.id==="jungle-hunter"||isKnownHunterGauntletV135(model.id);
  return <section className={styles.proof} aria-label="Provenance et statut artistique">
    <strong>{model.name}</strong>
    <small>{mediumNames[model.medium]??model.medium} · {GAUNTLET_EVIDENCE_LABELS_V132[model.evidence]}</small>
    <p>{model.artBrief}</p>
    <p>{grounded
      ? "Étude graphique fondée sur des références de conception ou d'accessoires, non approuvée en 1:1."
      : "Concept de reconstitution originale créé pour ce personnage. Ses formes et glyphes ne sont pas canoniques."}</p>
    <p>{model.notes}</p>
    <a href={model.sourceUrl} target="_blank" rel="noopener noreferrer">Consulter la source indiquée</a>
  </section>;
}
/** Read-only QA: do not mount a war simulation or write to SaveGame. */
export default function GauntletVisualQaV136(){
  const [selected,setSelected]=useState("jungle-hunter");
  const [second,setSecond]=useState("city-hunter");
  const [compare,setCompare]=useState(false);
  const [open,setOpen]=useState(true);
  const [query,setQuery]=useState("");
  const [medium,setMedium]=useState("all");
  const [page,setPage]=useState(0);
  const [zoom,setZoom]=useState(100);
  const [hiddenParts,setHiddenParts]=useState<string[]>([]);
  const [referenceUrl,setReferenceUrl]=useState<string|null>(null);
  const [referenceName,setReferenceName]=useState("");
  const [overlay,setOverlay]=useState(true);
  const [overlayOpacity,setOverlayOpacity]=useState(48);
  const [imageIssue,setImageIssue]=useState("");
  const referenceObjectUrl=useRef<string|null>(null);
  useEffect(()=>()=>{
    if(referenceObjectUrl.current)URL.revokeObjectURL(referenceObjectUrl.current);
    referenceObjectUrl.current=null;
  },[]);
  function handleReferenceFile(file:File|null){
    if(!file)return;
    if(!["image/png","image/jpeg","image/webp"].includes(file.type) || file.size>12*1024*1024){
      setImageIssue("Choisissez un PNG, JPEG ou WebP inférieur à 12 Mo.");return;
    }
    const object=URL.createObjectURL(file);
    if(referenceObjectUrl.current)URL.revokeObjectURL(referenceObjectUrl.current);
    referenceObjectUrl.current=object;
    setReferenceUrl(object);
    setReferenceName(file.name.slice(0,120));
    setImageIssue("");
    setOverlay(true);
  }
  function clearReference(){
    if(referenceObjectUrl.current)URL.revokeObjectURL(referenceObjectUrl.current);
    referenceObjectUrl.current=null;setReferenceUrl(null);setReferenceName("");
  }
  const filtered=useMemo(()=>GAUNTLET_CATALOG_V132.filter(m=>
    (medium==="all"||m.medium===medium) &&
    (`${m.name} ${m.id} ${m.artBrief}`.toLocaleLowerCase("fr").includes(query.toLocaleLowerCase("fr")))
  ),[medium,query]);
  const maxPages=Math.max(1,Math.ceil(filtered.length/PAGE_SIZE));
  const currentPage=Math.min(page,maxPages-1);
  const active=GAUNTLET_CATALOG_V132.find(m=>m.id===selected)??GAUNTLET_CATALOG_V132[0];
  const other=GAUNTLET_CATALOG_V132.find(m=>m.id===second)??GAUNTLET_CATALOG_V132[1];
  const displayed=filtered.slice(currentPage*PAGE_SIZE,(currentPage+1)*PAGE_SIZE);
  return <main className={styles.page} data-testid="gauntlet-visual-qa-v136">
    <header className={styles.heading}>
      <span>YAUTJA · ATELIER D&apos;AUDIT GRAPHIQUE</span>
      <h1>54 gauntlets à comparer</h1>
      <p>Cinq études de référence et 49 études originales individualisées. Toutes sont des prototypes non homologués 1:1 ; cette galerie ne modifie jamais la sauvegarde ou la guerre des clans.</p>
      <div className={styles.metrics}><span>54 modèles</span><span>219 calques SVG</span><span>0 modèles certifiés 1:1</span></div>
    </header>
    <section className={styles.toolbar} aria-label="Contrôles de comparaison et de filtrage">
      <label>Référence visuelle personnelle
        <input type="file" accept="image/png,image/jpeg,image/webp" aria-label="Importer une image de référence locale" onChange={e=>{handleReferenceFile(e.currentTarget.files?.[0]??null);e.currentTarget.value="";}}/>
      </label>
      <label>Recherche
        <input type="search" maxLength={100} value={query} onChange={e=>{setQuery(e.currentTarget.value);setPage(0);}} placeholder="Scar, Lost Tribe, PHG, Dek…"/>
      </label>
      <label>Provenance
        <select value={medium} onChange={e=>{setMedium(e.currentTarget.value);setPage(0);}}>
          <option value="all">Toutes les sources</option>
          {Object.entries(mediumNames).map(([id,label])=><option value={id} key={id}>{label}</option>)}
        </select>
      </label>
      <button type="button" aria-pressed={compare} onClick={()=>setCompare(x=>!x)}>{compare?"Vue simple":"Comparer deux gauntlets"}</button>
      <button type="button" aria-pressed={open} onClick={()=>setOpen(x=>!x)}>{open?"Refermer les capots":"Ouvrir les capots"}</button>
      <label>Zoom · {zoom} %
        <input type="range" min="70" max="150" step="5" value={zoom} onChange={e=>setZoom(Number(e.currentTarget.value))}/>
      </label>
      {referenceUrl && <>
        <button type="button" aria-pressed={overlay} onClick={()=>setOverlay(x=>!x)}>{overlay?"Masquer référence":"Afficher référence"}</button>
        <label>Opacité superposition · {overlayOpacity} %
          <input type="range" min="0" max="100" step="5" value={overlayOpacity} onChange={e=>setOverlayOpacity(Number(e.currentTarget.value))}/>
        </label>
        <button type="button" onClick={clearReference}>Effacer la référence</button>
      </>}
    </section>
    <fieldset className={styles.partControls} aria-label="Calques graphiques indépendants">
      <legend>Inspection de calques (masquer ou afficher)</legend>
      {ART_PARTS_V136.filter(p=>["arm","shell","panel","lid"].includes(p.id)||
        active.id==="jungle-hunter"||compare&&other.id==="jungle-hunter").map(part=><label key={part.id}>
        <input type="checkbox" checked={!hiddenParts.includes(part.id)} aria-label={`Afficher ${part.label}`}
          onChange={e=>{const checked=e.currentTarget.checked;setHiddenParts(old=>checked?old.filter(x=>x!==part.id):[...old,part.id]);}}/>
        {part.label}
      </label>)}
      <button type="button" disabled={hiddenParts.length===0} onClick={()=>setHiddenParts([])}>Afficher tous les calques</button>
    </fieldset>
    {imageIssue && <p className={styles.fileWarning} role="alert">{imageIssue}</p>}
    {referenceUrl && <p className={styles.localNote} role="status">Comparaison locale : {referenceName}. Fichier gardé uniquement dans ce navigateur ; aucun envoi au serveur.</p>}
    {compare&&<div className={styles.comparePicker}>
      <label>Second modèle
        <select value={second} onChange={e=>setSecond(e.currentTarget.value)}>
          {GAUNTLET_CATALOG_V132.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
      </label>
    </div>}
    <section className={compare?styles.comparison:styles.single} aria-label="Visualisation des modèles">
      {[active,...(compare?[other]:[])].map((model,i)=><article className={styles.artCard} data-art-model={model.id} key={i}>
        <div className={styles.modelHeadline}><h2>{model.name}</h2>
          <small>{i===0?"Principal":"Comparaison"} · {open?"capot ouvert":"capot fermé"}</small></div>
        <div className={styles.stage}>
          <div className={styles.zoom} style={{width:`${zoom}%`}}><Art model={model} coverOpen={open} hiddenParts={hiddenParts}/></div>
          {i===0&&referenceUrl&&overlay&&<img className={styles.filmOverlay} src={referenceUrl}
            style={{opacity:overlayOpacity/100}} alt="Photogramme ou photo de référence ajoutée uniquement sur cet appareil"/>}
        </div>
        <SourceNote model={model}/>
      </article>)}
    </section>
    <section className={styles.catalog} aria-label="Catalogue des 54 modèles">
      <div className={styles.catalogHeading}><h2>Inventaire navigable</h2><p role="status">{filtered.length} modèles · page {currentPage+1}/{maxPages}</p></div>
      <div className={styles.cards}>
        {displayed.map(entry=><button className={styles.modelChoice} key={entry.id} type="button"
          aria-pressed={entry.id===active.id} onClick={()=>setSelected(entry.id)}>
          <strong>{entry.name}</strong>
          <small>{mediumNames[entry.medium]??entry.medium} · {GAUNTLET_EVIDENCE_LABELS_V132[entry.evidence]}</small>
          <span>{entry.id==="jungle-hunter"||isKnownHunterGauntletV135(entry.id)?"Références à confronter":"Concept non canonique"}</span>
        </button>)}
      </div>
      {filtered.length===0&&<p>Aucun modèle trouvé.</p>}
      <div className={styles.pagination}>
        <button type="button" disabled={currentPage===0} onClick={()=>setPage(p=>Math.max(0,p-1))}>Précédent</button>
        <span>{currentPage+1} / {maxPages}</span>
        <button type="button" disabled={currentPage>=maxPages-1} onClick={()=>setPage(p=>p+1)}>Suivant</button>
      </div>
    </section>
    <footer>Validation visuelle à effectuer sur des photogrammes vérifiés des films et des fichiers sources des jeux. Vous pouvez superposer une photo personnelle sans transfert réseau. Les images de personnages ne constituent pas automatiquement une preuve de leur gauntlet exact.</footer>
  </main>;
}
