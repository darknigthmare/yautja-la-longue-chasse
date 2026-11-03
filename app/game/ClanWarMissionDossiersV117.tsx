"use client";

import { useMemo, useState } from "react";
import type { WarRulesV6 } from "./systems/clanWarBibleV6";
import { warSourceRtsScenarioV119, type WarSourceRtsScenarioIdV119 } from "./systems/clanWarRtsScenariosV119";
import {
  searchWarMissionDossiersV117, warMissionDossiersV117, warSourceModeLabelV117,
  type WarMissionSourceKindV117, type WarSourceMissionFilterV117,
} from "./systems/clanWarMissionDossiersV117";
import styles from "./ClanWarMissionDossiersV117.module.css";

export default function ClanWarMissionDossiersV117({
  rules, onOpenSandbox, onOpenSourceRts,
}: {rules:WarRulesV6;onOpenSandbox?:()=>void;onOpenSourceRts?:(id:WarSourceRtsScenarioIdV119)=>void}) {
  const catalog=useMemo(()=>warMissionDossiersV117(rules),[rules]);
  const [filter,setFilter]=useState<WarSourceMissionFilterV117>("all");
  const [query,setQuery]=useState("");
  const [picked,setPicked]=useState("");
  const [sourceView,setSourceView]=useState<"missions"|"campaigns"|"clans">("missions");
  const filtered=useMemo(()=>searchWarMissionDossiersV117(catalog,query,filter),[catalog,query,filter]);
  const playableRtsCount=catalog.missions.filter(mission=>mission.kind==="rts"&&warSourceRtsScenarioV119(mission.id,rules)).length;
  const selected=catalog.missions.find(item=>item.id===picked&&filtered.some(a=>a.id===item.id))??filtered[0];
  const route=selected?.mapId?catalog.maps.find(item=>item.id===selected.mapId):null;
  const tacticalPilot=selected?.kind==="rts"?warSourceRtsScenarioV119(selected.id,rules):null;
  const campaign=selected?.parentId?catalog.campaigns.find(item=>item.id===selected.parentId):null;
  const visibleCampaigns=catalog.campaigns.filter(item=>!query||[item.id,item.title,item.premise,item.mapId].join(" ").toLowerCase().includes(query.toLowerCase()));
  return <section className={styles.root} data-testid="clan-mission-dossiers-v117" aria-label="Dossiers de missions de guerre tirés des sources V6">
    <header className={styles.header}>
      <div><p className={styles.eyebrow}>BIBLE V6 · MANDATS ET THÉÂTRES SOURCÉS</p><h3>Dossiers narratifs, RTS et guerres de clans</h3>
        <p>Ces fiches proviennent des cellules des classeurs W3/W5, sans réécriture de leur objectif. Elles servent de cahier des charges aux futures missions véritablement jouables.</p></div>
    </header>
    <p className={styles.notice} role="note"><strong>État : dossiers de conception, pas missions terminées.</strong> Le mode d&apos;exercice V115 est jouable séparément, mais ne prétend pas exécuter les scènes, dialogues, scripts et conséquences décrits ici. Les clans W3 sont des créations de la Bible du jeu, pas des factions toutes attestées dans les films.</p>
    <div className={styles.metrics}>
      <span><strong>{catalog.missions.filter(item=>item.kind==="narrative").length}</strong> missions narratives</span>
      <span><strong>{catalog.missions.filter(item=>item.kind==="rts").length}</strong> scénarios RTS documentés</span>
      <span><strong>{playableRtsCount}</strong> épreuves RTS tactiques disponibles</span>
      <span><strong>{24-playableRtsCount}</strong> missions RTS restant à mettre en scène</span>
      <span><strong>{catalog.missions.filter(item=>item.kind==="three-mode").length}</strong> missions trois vues</span>
      <span><strong>{catalog.campaigns.length}</strong> campagnes</span>
      <span><strong>{catalog.maps.length}</strong> cartes</span>
      <span><strong>{catalog.doctrines.length}</strong> doctrines</span>
    </div>
    <nav className={styles.tabs} aria-label="Types de dossiers de guerre">
      {([["missions","Missions détaillées"],["campaigns","Campagnes et trois vues"],["clans","Doctrines et accords"]] as const)
        .map(([id,label])=><button type="button" key={id} aria-pressed={sourceView===id} onClick={()=>setSourceView(id)}>{label}</button>)}
    </nav>
    <label className={styles.search}>Rechercher un titre, identifiant, objectif ou lieu
      <input type="search" maxLength={130} value={query} onChange={event=>setQuery(event.target.value)} placeholder="W3-N01, W3-MAP02, extraction, sabotage…" />
    </label>
    {sourceView==="missions" && <>
      <div className={styles.filters}>
        {([["all","Toutes"],["narrative","Récits W3"],["rts","RTS W3"],["three-mode","Trois vues W5"]] as [WarSourceMissionFilterV117,string][]).map(([kind,label])=>
          <button type="button" key={kind} aria-pressed={filter===kind} onClick={()=>setFilter(kind)}>{label}</button>)}
        <span>{filtered.length} fiche(s)</span>
      </div>
      <div className={styles.twoColumns}>
        <div className={styles.missionList} role="group" aria-label="Liste des missions documentées">
          {filtered.map(item=><button type="button" key={item.id} aria-pressed={selected?.id===item.id} onClick={()=>setPicked(item.id)}>
            <small>{item.id} · {item.originalMode} · {item.mapId??item.parentId??"lieu narratif"}</small>
            <strong>{item.title}</strong>
          </button>)}
          {!filtered.length&&<p>Aucune mission trouvée dans les cellules de cette source.</p>}
        </div>
        <div className={styles.detail} aria-live="polite">
          {selected ? <>
            <p className={styles.eyebrow}>{selected.id} · {selected.sheet} · ligne {selected.row}</p>
            <h4>{selected.title}</h4>
            <p><strong>Format documenté :</strong> {selected.originalMode} · mode d&apos;exercice voisin : {warSourceModeLabelV117(selected.recommendedMode)}</p>
            <dl className={styles.fields}>
              <div><dt>Situation</dt><dd>{selected.situation}</dd></div>
              <div><dt>Parcours et interactions</dt><dd>{selected.approach}</dd></div>
              <div><dt>Décision proposée</dt><dd>{selected.choice}</dd></div>
              <div><dt>Résultat attendu</dt><dd>{selected.completion}</dd></div>
              <div><dt>Repli et échec</dt><dd>{selected.retreat}</dd></div>
              <div><dt>Continuité des modes</dt><dd>{selected.continuity}</dd></div>
              <div><dt>XP/conséquence écrite</dt><dd>{selected.rewardText}</dd></div>
            </dl>
            {campaign&&<div className={styles.sourceArea}><h5>Campagne liée : {campaign.title}</h5><p>{campaign.premise}</p><p>{campaign.finale}</p>
              <p><strong>Équipes conseillées :</strong> {campaign.recommendedUnits.join(", ")||"non renseignées"}</p>
              <div className={styles.related}>{campaign.missionIds.map(id=><button type="button" key={id} onClick={()=>{setQuery("");setFilter("all");setPicked(id);}}>{id}</button>)}</div></div>}
            {route&&<div className={styles.sourceArea}><h5>Carte liée : {route.id} · {route.title}</h5><p>Dimensions décrites : {route.width} × {route.height}</p>
              <p><strong>Géométrie :</strong> {route.geometry}</p><p><strong>Couverts :</strong> {route.cover}</p><p><strong>Événements :</strong> {route.events}</p>
              <p><strong>Objectifs :</strong> {route.objectives}</p></div>}
            <div className={styles.provenance}><strong>{selected.provenance}</strong>
              <span>Cellules : {selected.sourceCells.join(" · ")}</span>
              <span>SHA de classeur déclaré : {catalog.sourceSha}</span>
            </div>
            {tacticalPilot&&onOpenSourceRts&&<div className={styles.sourceArea}>
              <p><strong>Épreuve tactique partielle disponible :</strong> {tacticalPilot.id} — {tacticalPilot.objectiveKind==="cargo-escort"?
                "guet observé et transport de charge":
                tacticalPilot.objectiveKind==="guard-relief"?
                  "tenue du guet et arrivée de relève":"régulateur livré puis filtre réparé par les artisans"}.
                Le plan 9 × 6 ne remplace pas la carte W3-MAP01 complète.</p>
              <button type="button" className={styles.sandbox} onClick={()=>onOpenSourceRts(tacticalPilot.id)}>
                Préparer cet objectif jouable (épreuve W3)
              </button>
            </div>}
            {onOpenSandbox && <button type="button" className={styles.sandbox} onClick={onOpenSandbox}>Ouvrir les exercices des quatre modes (scénarios distincts)</button>}
          </> : <p>Aucune fiche à afficher.</p>}
        </div>
      </div>
    </>}
    {sourceView==="campaigns" && <div className={styles.campaigns}>
      {visibleCampaigns.map(campaign=><article key={campaign.id}>
        <p className={styles.eyebrow}>{campaign.id} · {campaign.mapId}</p><h4>{campaign.title}</h4><p>{campaign.premise}</p>
        <p><strong>Finale :</strong> {campaign.finale}</p><p><strong>Unités W3 liées :</strong> {campaign.recommendedUnits.join(" · ")}</p>
        <div className={styles.related}>{campaign.missionIds.map((id,index)=><button type="button" key={id}
          onClick={()=>{setSourceView("missions");setFilter("all");setQuery("");setPicked(id);}}>Chapitre {index+1} · {id}</button>)}</div>
        <small>{campaign.provenance} · {campaign.sourceCells.join(", ")}</small>
      </article>)}
    </div>}
    {sourceView==="clans" && <div className={styles.clans}>
      <div><h4>Doctrines W3 — règles et limites propres à chaque clan</h4>
        {catalog.doctrines.map(clan=><details key={clan.id} className={styles.doctrine}>
          <summary>{clan.id} · {clan.title} · {clan.specialty}</summary>
          <p><strong>Tactique :</strong> {clan.tactic}</p>
          <p><strong>Restrictions locales :</strong> {clan.boundaries}</p>
          <p><strong>Faiblesses :</strong> {clan.weaknesses}</p>
          <small>{clan.provenance}</small>
        </details>)}
      </div>
      <div><h4>Accords spécifiques entre clans</h4>
        {catalog.diplomacy.map(item=><details key={item.id} className={styles.doctrine}>
          <summary>{item.id} · {item.title}</summary>
          <p><strong>Parties :</strong> {item.parties.join(" / ")}</p>
          <p>{item.terms}</p><p><strong>Restrictions :</strong> {item.restrictions}</p>
          <p><strong>Conséquences :</strong> {item.consequences}</p>
          <small>{item.provenance}</small>
        </details>)}
      </div>
    </div>}
    {catalog.missingReferences.length>0 &&
      <details className={styles.missing}><summary>{catalog.missingReferences.length} référence(s) absente(s) dans la source</summary>
        <p>Ces identifiants ne sont pas complétés par des lieux, personnages ou unités inventés.</p>
        {catalog.missingReferences.map((issue,i)=><p key={i}>{issue}</p>)}</details>}
    <p className={styles.footer}>Source : {catalog.workbook}. Une fiche de scénario, même complète en texte, ne remplace pas une scène parcourable avec ennemis, objets, dialogue, sortie et reçus effectifs.</p>
  </section>;
}
