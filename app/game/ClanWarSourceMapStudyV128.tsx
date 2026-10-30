"use client";
import {useState} from "react";
import type {WarRulesV6} from "./systems/clanWarBibleV6";
import {
 createWarMapPracticeV128,commandWarMapPracticeV128,
 warMapLineOfSightV128,type WarMissionMapActionV128,
} from "./systems/clanWarSourceMapsV128";
import styles from "./ClanWarSourceMapStudyV128.module.css";
const ids=Array.from({length:12},(_,i)=>"W3-MAP"+String(i+1).padStart(2,"0"));
const ACTIONS:{id:WarMissionMapActionV128;label:string}[]=[
 {id:"up",label:"↑ Haut"},{id:"left",label:"← Gauche"},
 {id:"down",label:"↓ Bas"},{id:"right",label:"→ Droite"},
 {id:"observe",label:"Observer"},{id:"interact",label:"Interagir"},
 {id:"attack",label:"Attaquer"},{id:"cloak",label:"Camouflage"},
 {id:"wait",label:"Attendre"},{id:"power",label:"Couper / remettre le courant"},
 {id:"stabilize",label:"Stabiliser le sas"},
 {id:"retreat",label:"Se replier"},
];
export default function ClanWarSourceMapStudyV128({rules}:{rules:WarRulesV6}){
 const [state,setState]=useState(()=>createWarMapPracticeV128("W3-MAP01",rules));
 const [warning,setWarning]=useState("");
 const map=state.map;
 const visibleEnemies=state.enemies.filter(e=>e.hp>0&&
  Math.abs(e.x-state.player.x)+Math.abs(e.y-state.player.y)<=7&&
  warMapLineOfSightV128(map,state.player,e));
 function choose(id:string){
  try{setState(createWarMapPracticeV128(id,rules));setWarning("");}
  catch(error){setWarning(error instanceof Error?error.message:"Carte indisponible.");}
 }
 function action(id:WarMissionMapActionV128){
  const result=commandWarMapPracticeV128(state,id);
  if(result.accepted){setState(result.state);setWarning("");}
  else setWarning(result.message);
 }
 const n=21;
 return <section className={styles.root} aria-label="Études jouables des cartes W3-MAP" data-testid="source-map-study-v128">
  <p className={styles.eyebrow}>BIBLE V6 · ÉTUDES DE TERRAINS TACTIQUES</p>
  <h3>12 cartes W3 aux dimensions de leur fiche source</h3>
  <p>Déplacez un chasseur sur une vraie grille, évitez les obstacles, observez le terrain, interagissez avec le dispositif puis revenez à l&apos;extraction. Les ennemis ne traversent pas les murs et n&apos;apparaissent pas s&apos;ils sont hors de vue.</p>
  <label className={styles.select}>Carte à étudier
   <select value={map.id} onChange={event=>choose(event.target.value)}>
    {ids.map(id=>{
     const entry=rules.entries.find(e=>e.sheet==="Cartes des escarmouches"&&e.id===id);
     return entry?<option key={id} value={id}>{id} · {entry.title}</option>:null;
    })}
   </select>
  </label>
  <div className={styles.metrics}>
   <span>{map.width} × {map.height} cases</span><span>PV {state.player.hp}</span>
   <span>Camouflage {state.player.energy}/7</span><span>Alerte {state.alarm}/5</span>
   <span>Tour {state.turn}</span><span>{visibleEnemies.length} adversaire(s) visibles</span>
  </div>
  <div className={styles.layout}>
   <div className={styles.mapScroll}>
    <svg viewBox={"0 0 "+map.width*n+" "+map.height*n} role="img"
      aria-label={"Carte tactique "+map.name+" avec cases de terrain, extraction, objectif et patrouilles visibles"}>
     {map.tiles.map(t=><rect key={t.x+"-"+t.y} x={t.x*n} y={t.y*n} width={n} height={n}
       className={styles.tile} data-kind={t.kind} stroke="#13261e" strokeWidth=".6"/>)}
     {map.landmarks.map((landmark,index)=><g key={landmark.id}>
       <title>{landmark.name} · cellule W3 de référence {landmark.sourceColumn}</title>
       <text x={landmark.at.x*n+n/2} y={landmark.at.y*n+8}
         textAnchor="middle" fill="#f4d89a" fontSize="9">{index+1}</text>
     </g>)}
     <rect x={map.goal.x*n} y={map.goal.y*n} width={n} height={n}
       fill="none" stroke="#ffe2a7" strokeWidth="2"/>
     <rect x={map.extraction.x*n} y={map.extraction.y*n} width={n} height={n}
       fill="none" stroke="#d7d58b" strokeWidth="2"/>
     <text x={map.observation.x*n+n/2} y={map.observation.y*n+15}
       fill="#e3f1c6" textAnchor="middle" fontSize="14">△</text>
     <text x={map.goal.x*n+n/2} y={map.goal.y*n+15} fill="#ffe2ab"
       textAnchor="middle" fontSize="15">◎</text>
     <text x={map.extraction.x*n+n/2} y={map.extraction.y*n+15} fill="#fff2b6"
       textAnchor="middle" fontSize="14">↥</text>
     {visibleEnemies.map(e=><g key={e.id}>
      <circle cx={e.x*n+n/2} cy={e.y*n+n/2} r="8" fill="#aa6348"/>
      <text x={e.x*n+n/2} y={e.y*n+15} fill="#ffefde" fontSize="13" textAnchor="middle">R</text>
     </g>)}
     <circle cx={state.player.x*n+n/2} cy={state.player.y*n+n/2} r="9"
       fill="#318870" stroke={state.player.cloaked?"#d8f3e1":"#f3db92"} strokeWidth="2"/>
     <text x={state.player.x*n+n/2} y={state.player.y*n+15}
       fill="#fff6d8" textAnchor="middle" fontSize="13">Y</text>
    </svg>
    <p className={styles.legend}>Y : chasseur · R : adversaire observé · △ : observation · 1-3 : structures · ◎ : objectif · ↥ : sortie · vert : sol · sombre : obstacle · jaune : couvert · bleu : eau · rouge : lave.</p>
   </div>
   <div className={styles.sidebar}>
    <h4>{map.name}</h4><p>{map.biome} · monde de la Bible <strong>{map.planetName} ({map.planetId} / {map.worldCode})</strong></p>
    <p><strong>Couche physique :</strong> {map.worldStratum==="orbital-vessel"?"Coque / liaison orbitale, non traversable directement depuis la surface":
      map.worldStratum==="subsurface"?"Galerie intérieure sous le climat de surface":"Surface de planète"}.</p>
    <p><strong>Accès en véritable campagne :</strong> {map.accessGate}</p>
    <p><strong>Accès :</strong> {map.sourceSituation}</p>
    <p><strong>Chemins :</strong> {map.sourceGeometry}</p>
    <p><strong>Structures implantées :</strong> {map.landmarks.map((lm,i)=>(i+1)+". "+lm.name+" ("+lm.at.x+","+lm.at.y+")").join(" · ")}</p>
    <p><strong>Événement :</strong> {map.sourceEvent} · type {map.eventClass}</p>
    <p><strong>Point de reconnaissance :</strong> {map.observation.x},{map.observation.y} · portes motorisées {map.poweredDoors.length}</p>
    <p><strong>Objectif :</strong> {map.sourceObjective}</p>
    <p><strong>Évacuation :</strong> {map.sourceExtraction}</p>
    <div className={styles.actions}>{ACTIONS.map(({id,label})=>
      <button type="button" key={id} disabled={Boolean(state.report)}
       onClick={()=>action(id)}>{label}</button>)}
     <button type="button" onClick={()=>choose(map.id)}>Recommencer</button>
    </div>
    <p className={styles.status} role="status">{warning||state.lastMessage}</p>
    <p>{state.player.observed?"Accès reconnus":"Accès à observer"} · {state.objectiveDone?"Dispositif confirmé":"Dispositif non activé"} · courant {state.power?"présent":"coupé"}{map.id==="W3-MAP12"?" · pression "+(state.airlockStable?"stabilisée":"à stabiliser"):""}.</p>
    {state.report&&<div className={styles.result}>
      <h5>Résultat : {state.report.outcome}</h5>
      <p>{state.report.notes}</p>
      <small>{state.report.id} · aucune conquête ni butin de campagne</small>
    </div>}
    <details><summary>Journal et source</summary>
     <ol>{state.log.slice(-20).map((item,index)=><li key={index}>{item}</li>)}</ol>
     <p>Cellules du classeur : {map.sourceCells.join(" · ")}</p>
     <p>{map.sourceCover}</p>
    </details>
   </div>
  </div>
  <p className={styles.footer}>Étude procédurale fidèle aux **dimensions et objectifs écrits W3**. Elle ne remplace ni les véritables 24 scénarios RTS terminés ni les décors et sprites 1:1 de la franchise ; les sauvegardes de campagne ne sont jamais modifiées.</p>
 </section>;
}
