"use client";

import { useMemo, useState } from "react";
import {
  clanWarVariantCountsV120, searchClanWarVariantsV120, drawUnseenClanWarVariantV120,
  type ClanWarVariantFamilyV120, type ClanWarVariantModeV120,
} from "./systems/clanWarVariantAtlasV120";
import styles from "./ClanWarVariantAtlasV120.module.css";

const MODE_LABELS:Record<ClanWarVariantModeV120,string> = {
  assault:"Assaut latéral",outer:"Outer Ops",stealth:"Infiltration / sabotage",rts:"RTS de guerre totale",
};
const FAMILY_LABELS:Record<ClanWarVariantFamilyV120,string> = {
  original:"Créations originales",lore:"Extrapolations lore Yautja",homage:"Clins d’œil aux lieux connus",
};
const CSV_COLUMNS = [
  ["id","ID"],["mode","Gameplay"],["family","Famille"],["title","Mission"],["settingName","Lieu"],
  ["referenceName","Référence"],["referenceWork","Œuvre de référence"],
  ["environment.biome","Biome"],["environment.terrain","Sol"],["environment.liquid","Zone liquide"],
  ["environment.layout","Géométrie"],["environment.weather","Météo"],
  ["environment.environmentalHazard","Danger"],["environment.powerFailure","Sans électricité"],
  ["operation.primaryObjective","Objectif"],["operation.secondaryObjective","Objectif secondaire"],
  ["operation.gameplayHook","Mécanique"],["operation.twist","Événement"],
  ["operation.failure","Échec"],["operation.victoryProof","Preuve de réussite"],
  ["operation.fallback","Solution alternative"],["operation.extraction","Extraction"],
  ["production.gameplayBackend","Moteur"],["status","Statut"],
] as const;
function fieldValue(value:unknown,path:string):string {
  const valueObject=value as Record<string,unknown>;
  const result=path.split(".").reduce<unknown>((item,key)=>
    item&&typeof item==="object"?(item as Record<string,unknown>)[key]:undefined,valueObject);
  return Array.isArray(result)?result.join(" | "):result==null?"":String(result);
}
function csvCell(value:string) {
  // Prevent spreadsheet-formula injection when a future editable source
  // begins with an Excel executable character.
  const safe=/^[\s]*[=+\-@]/.test(value)?"'"+value:value;
  return '"'+safe.replace(/"/g,'""')+'"';
}
const pageSize=12;

export default function ClanWarVariantAtlasV120({onOpenPrototype}:{onOpenPrototype?:()=>void}) {
  const [mode,setMode]=useState<ClanWarVariantModeV120|"all">("all");
  const [family,setFamily]=useState<ClanWarVariantFamilyV120|"all">("all");
  const [query,setQuery]=useState("");
  const [page,setPage]=useState(0);
  const [picked,setPicked]=useState("");
  const [drawnIds,setDrawnIds]=useState<string[]>([]);
  const counts=useMemo(()=>clanWarVariantCountsV120(),[]);
  const entries=useMemo(()=>searchClanWarVariantsV120(query,mode,family),[query,mode,family]);
  const unseenCount=entries.filter(item=>!drawnIds.includes(item.id)).length;
  const maxPage=Math.max(0,Math.ceil(entries.length/pageSize)-1);
  const currentPage=Math.min(page,maxPage);
  const visible=entries.slice(currentPage*pageSize,(currentPage+1)*pageSize);
  const chosen=entries.find(row=>row.id===picked)??visible[0]??null;
  function drawNewVariant(){
    const result=drawUnseenClanWarVariantV120(Date.now(),drawnIds,mode,family,query);
    if(!result)return;
    setDrawnIds(previous=>[...previous,result.id]);
    setPicked(result.id);
    setPage(Math.floor(entries.findIndex(item=>item.id===result.id)/pageSize));
  }
  function downloadCSV() {
    const header=CSV_COLUMNS.map(([,label])=>csvCell(label)).join(";");
    const lines=entries.map(row=>CSV_COLUMNS.map(([key])=>csvCell(fieldValue(row,key))).join(";"));
    const file=new Blob(["\uFEFF",header,"\r\n",lines.join("\r\n")],{type:"text/csv;charset=utf-8"});
    const url=URL.createObjectURL(file);
    const link=document.createElement("a");
    link.href=url;link.download="Yautja_Guerre_Clans_V120_"+mode+"_"+family+"_"+entries.length+".csv";
    document.body.appendChild(link);link.click();link.remove();
    window.setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  function downloadJSON() {
    const file=new Blob([JSON.stringify({
      schema:120,status:"design-only",total:entries.length,
      filteredBy:{mode,family,query},variants:entries,
    },null,2)+"\n"],{type:"application/json;charset=utf-8"});
    const url=URL.createObjectURL(file);
    const link=document.createElement("a");
    link.href=url;link.download="Yautja_Guerre_Clans_V120_"+mode+"_"+family+"_"+entries.length+".json";
    document.body.appendChild(link);link.click();link.remove();
    window.setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  return <section className={styles.root} data-testid="clan-war-variants-v120" data-content-only="true" aria-label="Atlas des 1 200 variantes de guerre de clans">
    <header className={styles.header}>
      <div>
        <p className={styles.eyebrow}>ARCHIVES DES MANDATS · V120 · TERRITOIRES ET SCÉNARIOS</p>
        <h3>1 200 variantes de guerres de clans</h3>
        <p>Quatre façons de jouer, trois familles narratives, cent contextes par combinaison : chaque fiche a un lieu, un décor, une mission, un danger et une solution de repli distincts.</p>
      </div>
      <button type="button" onClick={downloadCSV} disabled={!entries.length}>Exporter le tableau CSV ({entries.length})</button>
      <button type="button" onClick={downloadJSON} disabled={!entries.length}>Exporter JSON complet ({entries.length})</button>
    </header>
    <p className={styles.warning} role="note"><strong>Catalogue de conception uniquement.</strong> Ces 1 200 variantes ne sont pas 1 200 missions exécutables : elles définissent le contenu à mettre en scène, les sprites à produire et les contrôles à ajouter. Les clins d&apos;œil aux monuments sont des reconstructions extraterrestres imaginées ; les références de films, comics et jeux n&apos;attestent pas les conflits décrits. Aucun personnage, territoire ou trophée n&apos;est débloqué par ce catalogue.</p>
    <div className={styles.summary}>
      <div><strong>{counts.total}</strong><span>Fiches distinctes</span></div>
      {(["assault","outer","stealth","rts"] as const).map(key=><div key={key}><strong>{counts[key+":original"]+counts[key+":lore"]+counts[key+":homage"]}</strong><span>{MODE_LABELS[key]}</span></div>)}
    </div>
    <div className={styles.controls}>
      <label>Gameplay
        <select value={mode} onChange={event=>{setMode(event.target.value as typeof mode);setPage(0);setPicked("");}}>
          <option value="all">Tous les gameplays (1 200)</option>
          {(Object.keys(MODE_LABELS) as ClanWarVariantModeV120[]).map(key=><option key={key} value={key}>{MODE_LABELS[key]} (300)</option>)}
        </select>
      </label>
      <label>Origine
        <select value={family} onChange={event=>{setFamily(event.target.value as typeof family);setPage(0);setPicked("");}}>
          <option value="all">Toutes les familles</option>
          {(Object.keys(FAMILY_LABELS) as ClanWarVariantFamilyV120[]).map(key=><option key={key} value={key}>{FAMILY_LABELS[key]} (100 par gameplay)</option>)}
        </select>
      </label>
      <label>Rechercher un lieu, un danger, un objectif ou un ID
        <input type="search" maxLength={140} value={query} placeholder="W3, marais, Carcassonne, relais, extraction…"
          onChange={event=>{setQuery(event.target.value);setPage(0);setPicked("");}}/>
      </label>
    </div>
    <div className={styles.meta}><span><strong>{entries.length}</strong> mission(s) correspondant aux filtres.</span>
      <span>Page {currentPage+1} / {maxPage+1}</span>
    </div>
    <div className={styles.draw}>
      <span>{unseenCount} variantes non encore tirées parmi les filtres actuels.</span>
      <button type="button" disabled={unseenCount===0} onClick={drawNewVariant}>Tirer une mission sans répétition</button>
      <button type="button" disabled={!drawnIds.length} onClick={()=>setDrawnIds([])}>Réinitialiser les tirages</button>
      <small>Le tirage ne répète pas une fiche pendant cette ouverture du catalogue ; il ne lance aucun combat et ne modifie pas la campagne.</small>
    </div>
    <div className={styles.columns}>
      <div className={styles.results} role="group" aria-label="Liste des variantes">
        {visible.map(row=><button key={row.id} type="button" aria-pressed={chosen?.id===row.id}
          onClick={()=>setPicked(row.id)}>
          <small>{row.id} · {MODE_LABELS[row.mode]} · {FAMILY_LABELS[row.family]}</small>
          <strong>{row.operation.missionType}</strong>
          <span>{row.settingName}</span>
          <small>{row.environment.biome} · {row.operation.lengthClass} · menace {row.operation.threat}/5</small>
        </button>)}
        {!entries.length&&<p>Aucune variante ne correspond à cette recherche.</p>}
        <div className={styles.pageControls}>
          <button type="button" disabled={currentPage===0} onClick={()=>{setPage(0);setPicked("");}}>Début</button>
          <button type="button" disabled={currentPage===0} onClick={()=>{setPage(Math.max(0,currentPage-1));setPicked("");}}>Précédent</button>
          <button type="button" disabled={currentPage>=maxPage} onClick={()=>{setPage(Math.min(maxPage,currentPage+1));setPicked("");}}>Suivant</button>
          <button type="button" disabled={currentPage>=maxPage} onClick={()=>{setPage(maxPage);setPicked("");}}>Fin</button>
        </div>
      </div>
      <article className={styles.detail} aria-live="polite">
        {chosen?<><p className={styles.eyebrow}>{chosen.id} · PROPOSITION DE GAMEPLAY</p>
          <h4>{chosen.title}</h4>
          <p>{chosen.inspirationNote}</p>
          <div className={styles.detailGrid}>
            <div><strong>Lieu</strong><p>{chosen.settingName}</p></div>
            <div><strong>Atmosphère</strong><p>{chosen.environment.biome} · {chosen.environment.weather} · {chosen.environment.timeOfDay}</p></div>
            <div><strong>Sol et liquide</strong><p>{chosen.environment.terrain} · {chosen.environment.liquid}</p></div>
            <div><strong>Architecture</strong><p>{chosen.environment.layout}</p></div>
            <div><strong>Ciel et relief</strong><p>{chosen.environment.sky} · {chosen.environment.altitude}</p></div>
            <div><strong>Couvert</strong><p>{chosen.environment.cover}</p></div>
          </div>
          <h5>Mission et conditions</h5>
          <dl className={styles.dossier}>
            <div><dt>Préparation</dt><dd>{chosen.operation.setup}</dd></div>
            <div><dt>Objectif principal</dt><dd>{chosen.operation.primaryObjective}</dd></div>
            <div><dt>Objectif secondaire</dt><dd>{chosen.operation.secondaryObjective}</dd></div>
            <div><dt>Mécanique spécifique</dt><dd>{chosen.operation.gameplayHook}</dd></div>
            <div><dt>Événement dynamique</dt><dd>{chosen.operation.twist}</dd></div>
            <div><dt>Réaction du terrain</dt><dd>{chosen.environment.hazardsReaction}</dd></div>
            <div><dt>Si le courant est coupé</dt><dd>{chosen.environment.powerFailure}</dd></div>
            <div><dt>Échec</dt><dd>{chosen.operation.failure}</dd></div>
            <div><dt>Preuve de victoire</dt><dd>{chosen.operation.victoryProof}</dd></div>
            <div><dt>Plan de repli</dt><dd>{chosen.operation.fallback}</dd></div>
            <div><dt>Extraction</dt><dd>{chosen.operation.extraction}</dd></div>
          </dl>
          <h5>Quatre temps de l&apos;opération</h5>
          <ol className={styles.phases}>{chosen.operation.dynamicPhases.map((phase,index)=><li key={index}>{phase}</li>)}</ol>
          <details className={styles.assets}><summary>Éléments à créer avant intégration</summary>
            <p><strong>Sprites :</strong> {chosen.production.neededSprites.join(" · ")}</p>
            <p><strong>Tiles :</strong> {chosen.production.neededTiles.join(" · ")}</p>
            <p><strong>Systèmes à développer :</strong> {chosen.production.missingSystems.join(" · ")}</p>
            <p><strong>Gabarit planète :</strong> {chosen.environment.worldSize} · {chosen.environment.mapScaleHint} · {chosen.environment.territoryShapeRequest} · {chosen.environment.islandShapeRequest}. Ces formes sont des demandes, pas des fichiers déjà intégrés.</p>
            <p><strong>Moteur envisagé :</strong> {chosen.production.gameplayBackend} · identifiant de reçu prévu : {chosen.operation.resultReceipt}</p>
          </details>
          {onOpenPrototype&&<button type="button" onClick={onOpenPrototype} className={styles.prototype}>
            Ouvrir le simulateur de base (ne lance pas cette variante)
          </button>}
        </>:<p>Sélectionnez une variante dans la liste.</p>}
      </article>
    </div>
  </section>;
}
