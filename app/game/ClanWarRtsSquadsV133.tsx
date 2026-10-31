"use client";
import {useMemo,useState} from "react";
import type {WarRulesV6} from "./systems/clanWarBibleV6";
import {
 createWarRtsSquadsV133,draftWarRtsSquadV133,removeWarRtsSquadV133,
 launchWarRtsSquadsV133,commandWarRtsSquadsV133,visibleWarRtsEnemiesV133,
 planWarRtsRallyV134,commandWarRtsRallyV134,commandWarRtsSuppressV135,commandWarRtsOverwatchV136,commandWarRtsBraceV137,
 type WarRtsSquadsStateV133,type WarRtsSquadOrderV133,
} from "./systems/clanWarRtsSquadsV133";
import {WAR_SOURCE_RTS_IDS_V129} from "./systems/clanWarRtsSourceMissionsV129";
import {warMapLineOfSightV128} from "./systems/clanWarSourceMapsV128";
import styles from "./ClanWarRtsSquadsV133.module.css";

const d=(a:{x:number;y:number},b:{x:number;y:number})=>Math.abs(a.x-b.x)+Math.abs(a.y-b.y);
const direct=[
 {id:"up",label:"↑ Haut"},{id:"left",label:"← Gauche"},
 {id:"down",label:"↓ Bas"},{id:"right",label:"→ Droite"},
] as const;
const colorFor=(s:string)=>s==="active"?"#82d7b0":s==="down"?"#df8b88":"#c5c9c4";

/** Standalone, reversible study: no save mutation or territory capture. */
export default function ClanWarRtsSquadsV133({rules}:{rules:WarRulesV6}){
 const [state,setState]=useState<WarRtsSquadsStateV133>(()=>createWarRtsSquadsV133("W3-RTS01",rules));
 const [selectedId,setSelectedId]=useState<string|null>(null);
 const [unitToAdd,setUnitToAdd]=useState("W3-U01");
 const [feedback,setFeedback]=useState("");
 const [rallyTarget,setRallyTarget]=useState<{x:number;y:number}>(()=>({...state.map.observation}));
 const [rallyExcluded,setRallyExcluded]=useState<string[]>([]);
 const mission=state.mission,map=state.map;
 const current=mission.tasks[state.completedTaskIds.length]??null;
 const selected=state.squads.find(u=>u.id===selectedId)??state.squads[0];
 const rallyIds=state.squads.filter(u=>u.status==="active"&&!rallyExcluded.includes(u.id)).map(u=>u.id);
 const rallyPlan=planWarRtsRallyV134(state,rallyIds,rallyTarget);
 const enemies=useMemo(()=>visibleWarRtsEnemiesV133(state),[state]);
 const follower=state.tracked&&(state.tracked.secured||state.squads.some(u=>u.status==="active"&&d(u,state.tracked!)<=7&&
  warMapLineOfSightV128(map,u,state.tracked!)))?state.tracked:null;
 function restart(id:string){
  try{const next=createWarRtsSquadsV133(id,rules);
   setState(next);setSelectedId(null);setFeedback("");
   setRallyTarget({...next.map.observation});setRallyExcluded([]);}
  catch(e){setFeedback(e instanceof Error?e.message:"La mission V6 ne peut pas être chargée.");}
 }
 function apply(result:{state:WarRtsSquadsStateV133;accepted:boolean;message:string}){
  setFeedback(result.message);if(result.accepted)setState(result.state);
 }
 function send(cmd:WarRtsSquadOrderV133){apply(commandWarRtsSquadsV133(state,cmd));}
 function action(kind:Extract<WarRtsSquadOrderV133,{squadId:string}>["kind"]){
  if(!selected)return;
  if(kind==="move"||kind==="attack")return;
  send({kind,squadId:selected.id});
 }
 const cell=18;
 return <section className={styles.root} data-testid="war-rts-squads-v133"
  aria-label="Prototype de bataille RTS à plusieurs escouades Yautja">
  <header className={styles.header}>
   <span className={styles.eyebrow}>GUERRE DES CLANS · 4 ESCOUADES MAX · BIBLE V6</span>
   <h3>RTS W3 : détachements, ordres, combat et extraction</h3>
   <p>24 scénarios source, cartes à leurs dimensions W3, jusqu&apos;à quatre unités alliées commandées indépendamment. Il s&apos;agit d&apos;un <strong>RTS tactique au tour par tour expérimental</strong>, ni d&apos;une campagne persistante ni d&apos;un décor de film 1:1.</p>
  </header>
  <div className={styles.toolbar}>
   <label>Contrat W3
    <select value={mission.id} onChange={e=>restart(e.target.value)}>
     {WAR_SOURCE_RTS_IDS_V129.map(id=>{
      const entry=rules.entries.find(row=>row.sheet==="Scénarios RTS"&&row.id===id);
      return entry?<option key={id} value={id}>{id} · {entry.title}</option>:null;
     })}
    </select>
   </label>
   <button type="button" onClick={()=>restart(mission.id)}>Recommencer</button>
  </div>
  <div className={styles.metrics}>
   <span><strong>{state.pcCommitted} / {state.pcMaximum}</strong><small>PC engagés / plafond</small></span>
   <span><strong>{state.ravRemaining} / {state.initialRav}</strong><small>RAV d&apos;exercice</small></span>
   <span><strong>{state.squads.filter(u=>u.status==="active").length} / {state.squads.length}</strong><small>Détachements aptes</small></span>
   <span><strong>{state.turn}</strong><small>Ordres/tours</small></span>
   <span><strong>{state.overwatch?.length??0}</strong><small>Veilles actives</small></span>
   <span><strong>{state.brace?.length??0}</strong><small>Groupes retranchés</small></span>
   <span><strong>{state.completedTaskIds.length} / 3</strong><small>Preuves d&apos;objectif</small></span>
   <span><strong>{map.id}</strong><small>{map.planetName} · {map.worldStratum}</small></span>
  </div>
  {state.phase==="planning"&&<div className={styles.planning}>
   <h4>Préparer les détachements</h4>
   <p>Les unités proposées proviennent des rôles W3 du scénario. Modifier la composition respecte les coûts PC inscrits dans la Bible V6. Aucun soldat n&apos;est recruté dans la sauvegarde principale.</p>
   <div className={styles.toolbar}>
    <label>Ajouter une formation
     <select value={unitToAdd} onChange={e=>setUnitToAdd(e.target.value)}>
      {rules.units.filter(u=>u.fullMembers>0&&u.commandPoints>0).map(u=><option key={u.id} value={u.id}>
       {u.id} · {u.name} · {u.commandPoints} PC
      </option>)}
     </select>
    </label>
    <button type="button" onClick={()=>apply(draftWarRtsSquadV133(state,unitToAdd,rules))}>Ajouter</button>
    <button type="button" className={styles.primary} onClick={()=>apply(launchWarRtsSquadsV133(state))}>
     Déployer {state.squads.length} détachements
    </button>
   </div>
  </div>}
  <div className={styles.columns}>
   <div className={styles.mapBlock}>
    <h4>Carte W3 · {map.width} × {map.height} cases</h4>
    <div className={styles.mapScroll}>
     <svg viewBox={`0 0 ${map.width*cell} ${map.height*cell}`} role="img"
      aria-label="Topologie tactique, détachements alliés, adversaires en ligne de vue et repères W3">
      {map.tiles.map(t=><rect key={`${t.x}-${t.y}`} className={styles.tile} data-kind={t.kind}
       x={t.x*cell} y={t.y*cell} width={cell} height={cell} stroke="#172b26" strokeWidth=".5"/>)}
      <g aria-hidden="true">
       <text x={map.observation.x*cell+9} y={map.observation.y*cell+13} textAnchor="middle" fill="#f0df94" fontSize="12">◈</text>
       <text x={map.extraction.x*cell+9} y={map.extraction.y*cell+13} textAnchor="middle" fill="#e9e1a8" fontSize="13">↥</text>
       {(state.observed?mission.tasks:mission.tasks.slice(0,0)).map((t,i)=><g key={t.id}>
        <rect x={t.location.x*cell} y={t.location.y*cell} width={cell} height={cell}
         stroke={state.completedTaskIds.includes(t.id)?"#7edcb1":i===state.completedTaskIds.length?"#f1df93":"#95969e"}
         strokeWidth="2" fill="transparent"/>
        <text x={t.location.x*cell+9} y={t.location.y*cell+13} fontSize="11" textAnchor="middle" fill="#f2f6e4">{i+1}</text>
       </g>)}
       {follower&&<circle cx={follower.x*cell+9} cy={follower.y*cell+9} r="6.5"
        fill={follower.isNeutral?"#d4c890":"#98cadd"} stroke="#f8f1df" strokeWidth="1.5"/>}
       {enemies.map(e=><g key={e.id}>
        <path d={`M ${e.x*cell+9} ${e.y*cell+2} l 7 13 h -14 Z`} fill="#ee8c81" stroke="#ffd6c7" strokeWidth="1"/>
       </g>)}
       {state.squads.filter(u=>u.status!=="ready").map(u=><g key={u.id}>
        <circle cx={u.x*cell+9} cy={u.y*cell+9} r="7.3" fill={colorFor(u.status)}
         stroke={selected?.id===u.id?"#fff1ac":"#1c302a"} strokeWidth={selected?.id===u.id?2.5:1.2}/>
        <text x={u.x*cell+9} y={u.y*cell+12} fontSize="9" fill="#10251d" fontWeight="700" textAnchor="middle">
         {state.squads.indexOf(u)+1}
        </text>
       </g>)}
      </g>
     </svg>
    </div>
    <p className={styles.hint}>Vert : escouades, rouge : adversaires actuellement visibles, or : extraction/reconnaissance. Les positions inconnues restent masquées. Les repères d&apos;objectifs sont révélés après reconnaissance.</p>
    <div className={styles.legend}>
     <span>Électricité : <strong>{state.power?"alimentée":"coupée"}</strong></span>
     <span>Pression : <strong>{state.airlockStable?"stable":"instable"}</strong></span>
     <span>Adversaires vus : <strong>{state.intel.length}</strong></span>
     <span>Phase : <strong>{state.phase}</strong></span>
    </div>
   </div>
   <div className={styles.orders}>
    <h4>Escouades et ordres individuels</h4>
    <div className={styles.squadList}>{state.squads.map((u,i)=><div key={u.id} className={styles.squadRow}>
     <button type="button" aria-pressed={selected?.id===u.id} onClick={()=>setSelectedId(u.id)}>
      <strong>{i+1}. {u.unitId}</strong> · {u.unitName}
      <small>{u.memberCount} membres · {u.hp}/{u.maxHp} PV · {u.commandPoints} PC · portée {u.range} · {u.status}</small>
     </button>
     {state.phase==="planning"&&<button type="button" onClick={()=>apply(removeWarRtsSquadV133(state,u.id))} aria-label={`Retirer ${u.unitId}`}>×</button>}
     {state.phase==="active"&&u.status==="active"&&<label className={styles.rallyCheck}>
      <input type="checkbox" checked={!rallyExcluded.includes(u.id)}
       aria-label={`Inclure ${u.unitId} au rassemblement`}
       onChange={event=>setRallyExcluded(current=>event.target.checked?
        current.filter(id=>id!==u.id):[...current,u.id])}/>
      Groupe
     </label>}
    </div>)}</div>
    {state.phase==="active"&&<div className={styles.rallyPanel}>
     <h5>Ordre collectif · un seul tour pour toutes les escouades</h5>
     <p>Choisissez les groupes ci-dessus puis une case de rassemblement. Chaque formation parcourt au plus une case. Les obstacles, portes sans courant et adversaires restent bloquants ; les groupes ne se superposent pas.</p>
     <div className={styles.rallyControls}>
      <label>Case X<input type="number" min={0} max={map.width-1} value={rallyTarget.x}
       onChange={event=>setRallyTarget(current=>({...current,x:Math.floor(Number(event.target.value)||0)}))}/></label>
      <label>Case Y<input type="number" min={0} max={map.height-1} value={rallyTarget.y}
       onChange={event=>setRallyTarget(current=>({...current,y:Math.floor(Number(event.target.value)||0)}))}/></label>
      <button type="button" onClick={()=>setRallyTarget({...map.observation})}>Vers reconnaissance</button>
      {state.observed&&current&&<button type="button"
       onClick={()=>setRallyTarget({...current.location})}>Vers objectif identifié</button>}
      <button type="button" className={styles.primary} disabled={!rallyPlan.valid||rallyPlan.steps.length===0}
       onClick={()=>apply(commandWarRtsRallyV134(state,rallyIds,rallyTarget))}>
       Déplacer {rallyPlan.steps.length} escouade(s) · 1 tour
      </button>
     </div>
     <p className={styles.rallyStatus} role="status">{rallyPlan.reason}</p>
    </div>}
    {state.phase==="active"&&selected&&<>
     <p className={styles.selected}>Ordres de <strong>{selected.unitName}</strong> — position ({selected.x}, {selected.y})</p>
     <div className={styles.moveGrid}>{direct.map(dir=><button type="button" key={dir.id}
      disabled={selected.status!=="active"}
      onClick={()=>send({kind:"move",squadId:selected.id,direction:dir.id})}>{dir.label}</button>)}</div>
     <div className={styles.commandGrid}>
      {(["observe","interact","wait","power","stabilize","pickup","extract","retreat"] as const).map(kind=><button
       type="button" key={kind} disabled={selected.status!=="active"}
       onClick={()=>action(kind)}>{({observe:"Reconnaître",interact:"Interagir",wait:"Attendre / tenir",power:"Réseau électrique",
        stabilize:"Stabiliser sas",pickup:"Reprendre charge ou escorte",extract:"Extraire tous",retreat:"Se replier"})[kind]}</button>)}
     </div>
     <button type="button" disabled={selected.status!=="active"||state.ravRemaining<1||
      (state.overwatch??[]).some(w=>w.squadId===selected.id)}
      onClick={()=>apply(commandWarRtsOverwatchV136(state,selected.id))}>
      Veille de secteur · 1 RAV seulement si tir sur une cible visible
     </button>
     <p className={styles.hint}>Cette veille dure au maximum deux tours. Une seule réaction, à portée et visibilité réelles ; déplacer l&apos;équipe annule l&apos;ordre.</p>
     <button type="button" disabled={selected.status!=="active"||
       !map.tiles.some(tile=>tile.x===selected.x&&tile.y===selected.y&&tile.cover)||
       (state.braceIssuedIds??[]).includes(selected.id)||
       (state.overwatch??[]).some(w=>w.squadId===selected.id)}
       onClick={()=>apply(commandWarRtsBraceV137(state,selected.id))}>
       Retrancher ce groupe dans un vrai couvert · deux réactions adverses
     </button>
     <p className={styles.hint}>V137 : défense renforcée uniquement sur une case de couvert existante. Une fois par groupe et par mission ; déplacer la formation annule sa protection.</p>
     <h5>Adversaires à portée du détachement</h5>
     {enemies.length===0?<p className={styles.hint}>Aucun adversaire actuellement observé.</p>:
      <div className={styles.enemyList}>{enemies.map(e=>{
       const inRange=d(selected,e)<=selected.range&&warMapLineOfSightV128(map,selected,e);
       return <div key={e.id}>
        <button type="button" disabled={!inRange||state.ravRemaining<1||selected.status!=="active"}
         onClick={()=>send({kind:"attack",squadId:selected.id,targetId:e.id})}>
         {e.unitId} · {e.hp} PV · ({e.x},{e.y}) {inRange?"· Tir 1 RAV":"· Hors portée"}
        </button>
        <button type="button" disabled={!inRange||state.ravRemaining<2||selected.status!=="active"}
         onClick={()=>apply(commandWarRtsSuppressV135(state,selected.id,e.id))}>
         Tir de couverture (2 RAV) · bloque une riposte
        </button>
       </div>;
      })}</div>}
    </>}
    <p role="status" aria-live="polite" className={styles.feedback}>{feedback||state.lastMessage}</p>
   </div>
  </div>
  <div className={styles.objectives}>
   <h4>Trois épreuves physiques W3 · {mission.id}</h4>
   <p>{mission.sourceObjective}</p>
   <ol>{mission.tasks.map((t,i)=><li key={t.id} data-status={state.completedTaskIds.includes(t.id)?"done":current?.id===t.id?"active":"pending"}>
    <strong>{i+1}. {t.title}</strong><small>{t.kind} · {state.observed?("repère ("+t.location.x+","+t.location.y+")"):"coordonnées masquées avant reconnaissance"} · provenance {t.sourcedFrom} · {t.holdTurns??1} tick(s){t.requiresPower?" · énergie requise":""}{t.requiresPressure?" · pression requise":""}{t.requiresWindow?" · fenêtre climatique":""}</small>
   </li>)}</ol>
   {state.tracked&&<p className={styles.hint}>Protection : {state.tracked.kind} · {state.tracked.hp} PV · {state.tracked.secured?"sécurisé":"à récupérer"} · {state.tracked.carrierSquadId??"aucun responsable"}{state.tracked.isNeutral?" · personne neutre":""}.</p>}
   {state.hold&&<p>Maintien de poste : <strong>{state.hold.progress}/{state.hold.required} tours</strong>, escouade {state.hold.squadId}.</p>}
   {state.report&&<div className={styles.report} role="status"><strong>Reçu unique : {state.report.outcome}</strong>
    <p>{state.report.id}. Preuves : {state.report.completedTaskIds.length}/3, RAV restants : {state.report.remainingRav}, groupe(s) hors combat : {state.report.downSquadIds.length}, laissé(s) sur place : {state.report.leftBehindSquadIds.length}. Aucun gain sur la sauvegarde V85/V6.</p></div>}
  </div>
  <details className={styles.logs}><summary>Journal opérationnel (60 entrées maximum)</summary>
   <ol>{state.log.map((line,i)=><li key={`${i}-${line}`}>{line}</li>)}</ol>
  </details>
  <p className={styles.hint}>Fidélité : données de mission, unités et plafond PC proviennent de la Bible V6 ; le moteur reste une simulation tactique 2D originale. Les décors, animations, pertes individuelles, armes 1:1 et effets de campagne doivent encore être certifiés.</p>
 </section>;
}
