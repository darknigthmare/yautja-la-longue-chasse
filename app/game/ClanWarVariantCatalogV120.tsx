"use client";
import { useMemo, useState } from "react";
import {
  CLAN_WAR_VARIANTS_V120, countClanWarVariantsV120, exportClanWarVariantsCsvV120,
  exportClanWarVariantsJsonV120, searchClanWarVariantsV120,
  type ClanWarVariantModeV120, type ClanWarVariantFamilyV120,
} from "./systems/clanWarVariantsV120";
import styles from "./ClanWarVariantCatalogV120.module.css";

type ModeFilter = ClanWarVariantModeV120 | "all";
type FamilyFilter = ClanWarVariantFamilyV120 | "all";
const LABEL_MODE:Record<ClanWarVariantModeV120,string>={
  assault:"Assaut latéral",outer:"Outer Ops / rapports",stealth:"Infiltration / sabotage",rts:"RTS total",
};
const LABEL_FAMILY:Record<ClanWarVariantFamilyV120,string>={
  original:"100 créations originales",lore:"100 contextes Yautja compatibles",homage:"100 clins d’œil de lieux connus",
};
const PAGE_SIZE=12;
function saveCatalogFile(filename:string,type:string,text:string){
  const blob=new Blob([text],{type});
  const url=URL.createObjectURL(blob);
  const link=document.createElement("a");link.href=url;link.download=filename;
  document.body.appendChild(link);link.click();link.remove();
  window.setTimeout(()=>URL.revokeObjectURL(url),1000);
}
export default function ClanWarVariantCatalogV120(){
  const [mode,setMode]=useState<ModeFilter>("all");
  const [family,setFamily]=useState<FamilyFilter>("all");
  const [query,setQuery]=useState("");
  const [page,setPage]=useState(0);
  const [picked,setPicked]=useState("");
  const [showAssets,setShowAssets]=useState(false);
  const filtered=useMemo(()=>searchClanWarVariantsV120(query,mode,family),[query,mode,family]);
  const pages=Math.max(1,Math.ceil(filtered.length/PAGE_SIZE));
  const currentPage=Math.min(page,pages-1);
  const visible=filtered.slice(currentPage*PAGE_SIZE,(currentPage+1)*PAGE_SIZE);
  const selected=visible.find(item=>item.id===picked)??visible[0];
  const counts=useMemo(()=>countClanWarVariantsV120(),[]);
  const format=(n:number)=>n.toLocaleString("fr-FR");

  return <section className={styles.root} aria-label="Catalogue des 1 200 variantes de guerres de clans" data-testid="clan-war-v120-catalog">
    <header className={styles.header}>
      <span className={styles.overline}>DOSSIERS DE GUERRE · V120 · INVENTAIRE DE DESIGN</span>
      <h3>1 200 variantes de missions, quatre gameplays</h3>
      <p>Pour chaque gameplay, 100 créations originales, 100 situations inspirées d&apos;usages Yautja documentés ou compatibles, et 100 évocations de lieux reconnaissables. Chaque fiche possède son terrain, ses contraintes, son objectif, sa sortie et ses besoins en sprites.</p>
    </header>
    <p className={styles.truth}><strong>Statut : concepts détaillés, pas 1 200 niveaux jouables.</strong> Les quatre mécaniques d&apos;exercice V115 existent séparément. Les cartes, événements et scripts propres à ces variantes doivent encore être construits et testés. Aucun scénario n&apos;annexe une planète, ne donne de trophée, ni ne devient canon par sa présence dans le catalogue.</p>
    <div className={styles.stats}>
      <div><small>Variantes complètes</small><strong>1 200</strong></div>
      <div><small>Gameplays</small><strong>4</strong></div>
      <div><small>Familles par gameplay</small><strong>3 × 100</strong></div>
      <div><small>Inspirations de lieux</small><strong>100</strong></div>
    </div>
    <div className={styles.matrix} role="table" aria-label="Répartition des variantes par gameplay et famille">
      <div className={styles.matrixHead} role="row"><span role="columnheader">Gameplay</span><span role="columnheader">Originales</span><span role="columnheader">Lore</span><span role="columnheader">Clins d’œil</span></div>
      {(["assault","outer","stealth","rts"] as const).map(key=>
        <div role="row" key={key}><strong role="rowheader">{LABEL_MODE[key]}</strong>
          <span role="cell">{counts[key].original}</span><span role="cell">{counts[key].lore}</span><span role="cell">{counts[key].homage}</span>
        </div>)}
    </div>
    <div className={styles.tools}>
      <label>Type de gameplay
        <select value={mode} onChange={event=>{setMode(event.target.value as ModeFilter);setPage(0);setPicked("");}}>
          <option value="all">Tous les gameplays</option>
          {(["assault","outer","stealth","rts"] as const).map(k=><option value={k} key={k}>{LABEL_MODE[k]}</option>)}
        </select>
      </label>
      <label>Famille de missions
        <select value={family} onChange={event=>{setFamily(event.target.value as FamilyFilter);setPage(0);setPicked("");}}>
          <option value="all">Les trois familles</option>
          {(["original","lore","homage"] as const).map(k=><option key={k} value={k}>{LABEL_FAMILY[k]}</option>)}
        </select>
      </label>
      <label>Recherche dans les lieux et objectifs
        <input type="search" maxLength={150} value={query} onChange={event=>{setQuery(event.target.value);setPage(0);setPicked("");}}
          placeholder="Ex. geyser, W3, Los Angeles, escorte…" />
      </label>
    </div>
    <div className={styles.actions}>
      <p><strong>{format(filtered.length)}</strong> variante(s) correspondante(s) · page {currentPage+1}/{pages}</p>
      <button type="button" onClick={()=>saveCatalogFile("Yautja_ClanWar_V120_1200.csv","text/csv;charset=utf-8",
        exportClanWarVariantsCsvV120(CLAN_WAR_VARIANTS_V120))}>Exporter les 1 200 en CSV</button>
      <button type="button" onClick={()=>saveCatalogFile("Yautja_ClanWar_V120_1200.json","application/json;charset=utf-8",
        exportClanWarVariantsJsonV120(CLAN_WAR_VARIANTS_V120))}>Exporter JSON complet</button>
      <button type="button" disabled={!filtered.length} onClick={()=>saveCatalogFile("Yautja_ClanWar_V120_selection.csv","text/csv;charset=utf-8",
        exportClanWarVariantsCsvV120(filtered))}>Exporter la sélection</button>
    </div>
    <div className={styles.layout}>
      <div className={styles.browse} aria-label="Variantes visibles">
        {visible.map(item=><button type="button" key={item.id} aria-pressed={selected?.id===item.id}
          onClick={()=>setPicked(item.id)}>
          <small>{item.id} · {LABEL_MODE[item.mode]} · {item.threatLevel}/5</small>
          <strong>{item.title}</strong>
          <span>{LABEL_FAMILY[item.family]} · {item.biome} · {item.weather}</span>
        </button>)}
        {!visible.length&&<p>Aucun contrat ne correspond à cette recherche.</p>}
      </div>
      <article className={styles.details} aria-live="polite">
        {selected ? <>
          <p className={styles.overline}>{selected.id} · concept V120 · difficulté {selected.threatLevel}/5</p>
          <h4>{selected.title}</h4>
          <p className={styles.story}>{selected.narrativeHook}</p>
          <dl className={styles.fields}>
            <div><dt>Monde et secteur</dt><dd>{selected.world} · {selected.region} · {selected.site}</dd></div>
            <div><dt>Type de décor</dt><dd>{selected.biome} · {selected.geometry}</dd></div>
            <div><dt>Matières de sol et zones liquides</dt><dd>{selected.terrain} / {selected.liquid}</dd></div>
            <div><dt>Météo, lumière, palette</dt><dd>{selected.weather} · {selected.light} · {selected.palette}</dd></div>
            <div><dt>Objectif principal</dt><dd>{selected.objective}</dd></div>
            <div><dt>Objectif annexe et retournement</dt><dd>{selected.secondary}</dd></div>
            <div><dt>Actions interactives</dt><dd>{selected.interaction}</dd></div>
            <div><dt>Réaction des adversaires</dt><dd>{selected.enemyBehavior}</dd></div>
            <div><dt>Événement variable</dt><dd>{selected.complication}</dd></div>
            <div><dt>Conditions d&apos;échec et repli</dt><dd>{selected.failure} {selected.withdrawal}</dd></div>
            <div><dt>Modèle de carte</dt><dd>{selected.routeOrLayout}</dd></div>
            <div><dt>Effet stratégique prévu</dt><dd>{selected.strategicConsequence}</dd></div>
            <div><dt>Mécanique centrale</dt><dd>{selected.primaryMechanic}</dd></div>
            <div><dt>Durée cible</dt><dd>{selected.suggestedMinutes} minutes de design · équipes : {selected.mandatoryRoles.join(", ")}</dd></div>
          </dl>
          <div className={styles.provenance}><strong>Fidélité et provenance</strong><p>{selected.continuity}</p>
            <p>{selected.canonStatus}</p>
            {selected.inspiration&&<p>Référence d&apos;inspiration : {selected.inspiration} ({selected.inspirationClass})</p>}
            {selected.referenceUrl&&<p><a href={selected.referenceUrl} target="_blank" rel="noopener noreferrer">Consulter une référence officielle de cette inspiration</a></p>}
          </div>
          <button type="button" onClick={()=>setShowAssets(x=>!x)} aria-expanded={showAssets}> {showAssets?"Masquer":"Afficher"} les besoins artistiques</button>
          {showAssets&&<ul className={styles.assets}>{selected.assetsNeeded.map((asset,i)=><li key={i}>{asset}</li>)}</ul>}
        </>:<p>Aucun dossier sélectionné.</p>}
      </article>
    </div>
    <nav className={styles.pager} aria-label="Pagination des variantes">
      <button type="button" disabled={currentPage===0} onClick={()=>{setPage(0);setPicked("");}}>Première</button>
      <button type="button" disabled={currentPage===0} onClick={()=>{setPage(x=>Math.max(0,x-1));setPicked("");}}>Précédente</button>
      <span>Page {currentPage+1} / {pages}</span>
      <button type="button" disabled={currentPage>=pages-1} onClick={()=>{setPage(x=>Math.min(pages-1,x+1));setPicked("");}}>Suivante</button>
      <button type="button" disabled={currentPage>=pages-1} onClick={()=>{setPage(pages-1);setPicked("");}}>Dernière</button>
    </nav>
    <footer className={styles.footer}>Ce générateur est déterministe : même catalogue V120 à chaque chargement. Les références de films, comics et jeux servent d&apos;inspiration explicitement marquée ; les 1 200 missions restent des propositions originales à intégrer, équilibrer et tester avant d&apos;être rendues jouables.</footer>
  </section>;
}
