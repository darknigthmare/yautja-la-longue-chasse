"use client";
import {useMemo,useState} from "react";
import type {WarRulesV6} from "./systems/clanWarBibleV6";
import {
 WAR_SOURCE_RTS_IDS_V129,createWarRtsMissionStateV129,
 commandWarRtsSourceMissionV129,type WarRtsMissionStateV129,
} from "./systems/clanWarRtsSourceMissionsV129";
import {
 warMapLineOfSightV128,type WarMissionMapActionV128,
} from "./systems/clanWarSourceMapsV128";
import styles from "./ClanWarRtsMissionStudyV129.module.css";

const actions:readonly {id:WarMissionMapActionV128;label:string}[]=[
 {id:"up",label:"↑ Haut"},{id:"left",label:"← Gauche"},
 {id:"down",label:"↓ Bas"},{id:"right",label:"→ Droite"},
 {id:"observe",label:"Observer"},{id:"interact",label:"Interagir avec l'étape"},
 {id:"wait",label:"Attendre / tenir le poste"},{id:"attack",label:"Attaquer la cible visible"},
 {id:"cloak",label:"Activer / couper camouflage"},{id:"power",label:"Alimenter le mécanisme"},
 {id:"stabilize",label:"Stabiliser la pression"},{id:"retreat",label:"Repli vers l'extraction"},
];
const distance=(a:{x:number;y:number},b:{x:number;y:number})=>
 Math.abs(a.x-b.x)+Math.abs(a.y-b.y);
export default function ClanWarRtsMissionStudyV129({rules}:{rules:WarRulesV6}){
 const [state,setState]=useState<WarRtsMissionStateV129>(()=>createWarRtsMissionStateV129("W3-RTS01",rules));
 const [feedback,setFeedback]=useState("");
 const map=state.base.map,player=state.base.player,mission=state.mission;
 const chosenTask=mission.tasks[state.completedTaskIds.length]??null;
 const seenEnemies=useMemo(()=>state.base.enemies.filter(actor=>actor.hp>0&&
  distance(actor,player)<=7&&warMapLineOfSightV128(map,actor,player)),
 [state.base.enemies,player,map]);
 const visibleFollower=state.tracked&&
  (state.tracked.secured||distance(state.tracked,player)<=7&&
   warMapLineOfSightV128(map,state.tracked,player))?state.tracked:null;
 function selectMission(id:string){
  try{setState(createWarRtsMissionStateV129(id,rules));setFeedback("");}
  catch(e){setFeedback(e instanceof Error?e.message:"La mission source ne peut pas être ouverte.");}
 }
 function issue(action:WarMissionMapActionV128){
  const result=commandWarRtsSourceMissionV129(state,action);
  setFeedback(result.message);
  if(result.accepted)setState(result.state);
 }
 const cell=20;
 return <section className={styles.root} data-testid="w3-rts24-source-v129"
   aria-label="24 missions RTS W3 reconstruites en objectifs physiques jouables">
  <header>
   <p className={styles.eyebrow}>GUERRE DES CLANS · BIBLE V6 · SOURCE W3-RTS01 À 24</p>
   <h3>24 missions documentées — objectifs et extraction physiques</h3>
   <p>Les 24 scénarios disposent de leurs objectifs, adversaires décrits, conditions de sortie et exigences W3. Cette interface est une <strong>étude d&apos;exécution avec un chasseur</strong>, pas le RTS multi-escouades complet de la campagne.</p>
  </header>
  <div className={styles.selection}>
    <label>Mission source
      <select value={mission.id} onChange={e=>selectMission(e.target.value)}>
       {WAR_SOURCE_RTS_IDS_V129.map(id=>{
        const entry=rules.entries.find(row=>row.id===id&&/^W3-RTS\d{2}$/.test(row.id));
        return entry?<option value={id} key={id}>{id} · {entry.title}</option>:null;
       })}
      </select>
    </label>
    <button type="button" onClick={()=>selectMission(mission.id)}>Recommencer la mission</button>
  </div>
  <div className={styles.metrics}>
    <span><strong>{mission.rank}</strong> rang source</span>
    <span><strong>{mission.pcMaximum}</strong> PC max source</span>
    <span><strong>{mission.initialRav}</strong> RAV de départ source</span>
    <span><strong>{mission.mapId}</strong> carte W3</span>
    <span><strong>{mission.opponentTeams}</strong> détachements IA</span>
    <span><strong>{mission.opponentCombatants}</strong> combattants potentiels</span>
    <span><strong>{state.base.turn}</strong> tours</span>
    <span><strong>{player.hp}</strong> PV d&apos;essai</span>
  </div>
  <div className={styles.layout}>
   <div className={styles.mapPane}>
    <svg viewBox={"0 0 "+map.width*cell+" "+map.height*cell} role="img"
      aria-label={"Carte tactique "+map.name+", dispositif en trois étapes et position des combattants visibles"}>
     {map.tiles.map(t=><rect key={t.x+"-"+t.y} x={t.x*cell} y={t.y*cell}
       width={cell} height={cell} data-kind={t.kind} className={styles.tile}
       stroke="#203027" strokeWidth=".5"/>)}
     <text x={map.observation.x*cell+cell/2} y={map.observation.y*cell+14}
       fill="#e4e9c3" textAnchor="middle" fontSize="14">△</text>
     {mission.tasks.map((task,i)=>{
      const done=state.completedTaskIds.includes(task.id);
      return <g key={task.id}>
       <rect x={task.location.x*cell} y={task.location.y*cell} width={cell} height={cell}
         fill="none" stroke={done?"#70c39d":i===state.completedTaskIds.length?"#f6dd94":"#a5a5a5"}
         strokeWidth={i===state.completedTaskIds.length?2.5:1.1}/>
       <text x={task.location.x*cell+cell/2} y={task.location.y*cell+14}
         textAnchor="middle" fontSize="12" fill={done?"#e9ffde":"#f8eac9"}>{i+1}</text>
      </g>;
     })}
     <text x={map.extraction.x*cell+cell/2} y={map.extraction.y*cell+14}
       textAnchor="middle" fontSize="13" fill="#f3e3a0">↥</text>
     {visibleFollower&&<g>
      <circle cx={visibleFollower.x*cell+cell/2} cy={visibleFollower.y*cell+cell/2}
        r="8.5" stroke={visibleFollower.secured?"#f7edb2":"#ded1a0"} fill="#807541" strokeWidth="1.5"/>
      <text x={visibleFollower.x*cell+cell/2} y={visibleFollower.y*cell+14}
        textAnchor="middle" fontSize="12" fill="#faf5d9">{visibleFollower.isNeutral?"N":"C"}</text>
     </g>}
     {seenEnemies.map(actor=><g key={actor.id}>
      <circle cx={actor.x*cell+cell/2} cy={actor.y*cell+cell/2} r="8"
       fill="#b8634a"/>
      <text x={actor.x*cell+cell/2} y={actor.y*cell+14}
       textAnchor="middle" fontSize="12" fill="#ffeee0">R</text>
     </g>)}
     <circle cx={player.x*cell+cell/2} cy={player.y*cell+cell/2}
       r="9" fill="#3e9473" stroke={player.cloaked?"#e1f6f1":"#f0d69c"} strokeWidth="2"/>
     <text x={player.x*cell+cell/2} y={player.y*cell+14}
       textAnchor="middle" fill="#f4f6e3" fontSize="12">Y</text>
    </svg>
    <p className={styles.legend}>1–3 : lieux à visiter dans l&apos;ordre · △ : point de reconnaissance · Y : chasseur · R : rival visible · C : charge ou compagnon · N : témoin neutre · ↥ : extraction. Les secteurs non visibles ne révèlent pas leurs ennemis.</p>
    {visibleFollower&&<p className={styles.legend}>
      {visibleFollower.kind} · {visibleFollower.secured?"sécurisé":"à récupérer"}
      {visibleFollower.heldByPlayer?" · porté physiquement":" · marche derrière vous"} · santé {visibleFollower.hp}/8.
    </p>}
   </div>
   <aside className={styles.sidebar}>
    <p className={styles.eyebrow}>{mission.id} · {map.planetName} · {map.worldStratum}</p>
    <h4>{mission.name}</h4>
    <p><strong>Objectif exact de la Bible :</strong> {mission.sourceObjective}</p>
    <p><strong>Plan de force d&apos;essai :</strong> {mission.opponentTeams} équipes rivales initialement placées sur la carte (budget {mission.opponentBudgetPc} PC d&apos;étude). Les groupes qui n&apos;ont pas été vus ne sont pas identifiés dans le champ de bataille.</p>
    <ol className={styles.tasks}>
     {mission.tasks.map((task,i)=><li key={task.id} data-completed={state.completedTaskIds.includes(task.id)}
        data-active={state.completedTaskIds.length===i}>
        <strong>{task.title}</strong>
        <span>{task.kind} · case {task.location.x},{task.location.y}
          {task.holdTurns?" · maintien "+task.holdTurns+" tours":""}
          {task.requiresWindow?" · fenêtre météo "+task.requiresWindow:""}
          {task.requiresPressure?" · sas stabilisé obligatoire":""}
          {task.requiresPower?" · alimentation obligatoire":""}</span>
     </li>)}
    </ol>
    <p className={styles.tip}><strong>Étape actuelle :</strong> {chosenTask?
      chosenTask.title+(state.holdProgress?" — maintien "+state.holdProgress+"/"+chosenTask.holdTurns:""):
      "Trois objectifs accomplis. Revenez à la sortie avec la charge ou les alliés."}</p>
    <div className={styles.actions}>{actions.map(item=>
      <button type="button" key={item.id} disabled={state.status!=="active"}
        onClick={()=>issue(item.id)}>{item.label}</button>)}
    </div>
    <p role="status" className={styles.status}>{feedback||state.lastMessage}</p>
    <p>Accès {player.observed?"reconnus":"non reconnus"} ·
      énergie {player.energy}/7 · alerte {state.base.alarm}/5 ·
      courant {state.base.power?"présent":"coupé"} ·
      pression {state.base.airlockStable?"stable":"instable"}.</p>
    {state.base.report&&<div className={styles.report} role="status">
      <h5>Compte rendu : {state.status}</h5>
      <p>{state.base.report.notes}</p>
      <small>{state.base.report.id} · aucun territoire, trophée, XP ou stock attribué.</small>
    </div>}
    <details>
     <summary>Conception et provenance de la mission</summary>
     <p><strong>Plan adverse source :</strong> {mission.sourceEnemyPlan}</p>
     <p><strong>Actions source :</strong> {mission.sourceConditions}</p>
     <p><strong>Choix source :</strong> {mission.sourceAlternatives}</p>
     <p><strong>Preuve de réussite source :</strong> {mission.sourceVictory}</p>
     <p><strong>Échec et reprise :</strong> {mission.sourceReentry}</p>
     <p><strong>Accès en campagne :</strong> {mission.sourceCampaignLink}</p>
     <p><strong>Rôles conseillés pour futur RTS :</strong> {mission.suggestedV6Units.join(", ")}</p>
     <p><strong>Composition rivale proposée pour cette simulation :</strong> {mission.opponentUnitIds.join(", ")}, basée sur les types W3-U et le plan source, non sur une garnison canonique.</p>
     <p><strong>XP prévue dans le classeur :</strong> {mission.sourceRewardXpDesign}; aucune XP n&apos;est accordée par cette étude.</p>
     <p><strong>Cellules :</strong> {mission.sourceCells.join(", ")}</p>
     <p><strong>Origine de la fiche :</strong> {mission.sourceProvenance}</p>
    </details>
   </aside>
  </div>
  <footer className={styles.footer}>Les acteurs Yautja et objets ici sont des figurants d&apos;exercice. Les objectifs des 24 fiches sont jouables avec collisions et extraction, mais leur RTS intégral avec plusieurs escouades réelles, dialogues, cargaisons multiples, véhicules et conséquences V85/V6 n&apos;est pas terminé.</footer>
 </section>;
}
