"use client";

import { useEffect, useRef, useState } from "react";
import { planWarRouteV6, type WarRulesV6 } from "./systems/clanWarBibleV6";
import {
  WAR_OPERATIONS_STORAGE_V115, beginWarOperationV115, commandRtsV115, commandStealthV115,
  createWarOperationsV115, deployAssaultUnitV115, issueWarRtsRealtimeOrderV115,
  leaveWarOperationV115, readWarOperationsV115, stepWarRtsRealtimeV115, toggleWarRtsRealtimeV115,
  WAR_RTS_COVER_V115,
  settleWarOuterOpsV115, stepAssaultV115, warMissionEligibleV115, warOuterSecondsRemainingV115,
  type WarMissionModeV115, type OuterFocusV115, type WarOperationsStateV115,
  type WarOperationsUpdateV115,
} from "./systems/clanWarOperationsV115";
import styles from "./ClanWarOperationsV115.module.css";

const modeLabels: Record<WarMissionModeV115, string> = {
  assault: "Assaut latéral · déploiement AP", outer: "Mandats délégués · rapport différé",
  stealth: "Infiltration et sabotage", rts: "Bataille totale · commandement RTS",
};
const focusLabels: Record<OuterFocusV115, string> = {
  recon: "Reconnaissance", intercept: "Interception", escort: "Protection de passage",
};
const walls = new Set(["3,2","3,3","5,3","6,4"]);
const formatTime = (seconds:number) => String(Math.floor(seconds / 60)).padStart(2,"0")+":"+String(seconds%60).padStart(2,"0");
type Props={rules:WarRulesV6;active?:boolean;persist?:boolean};

export default function ClanWarOperationsV115({rules,active=true,persist=false}:Props) {
  const [world,setWorld]=useState<WarOperationsStateV115>(()=>createWarOperationsV115(rules));
  const worldRef=useRef(world);
  const [hydrated,setHydrated]=useState(false),[blocked,setBlocked]=useState(false);
  const [storageIssue,setStorageIssue]=useState(""),[message,setMessage]=useState("Choisissez votre théâtre, vos équipes, puis le type d'opération.");
  const [mode,setMode]=useState<WarMissionModeV115>("assault"),[focus,setFocus]=useState<OuterFocusV115>("recon");
  const [targetId,setTargetId]=useState(rules.territories[1]?.id??"");
  const [selectedIds,setSelectedIds]=useState<string[]>([]);
  const [rtsSelectedId,setRtsSelectedId]=useState("");
  const [now,setNow]=useState(0);
  const defaultSource=rules.metadata.sha256;

  useEffect(()=>{
    // Loading an external browser archive is an asynchronous subscription
    // event, never a cascading synchronous render during effect setup.
    const ticket=window.setTimeout(()=>{
      let current=createWarOperationsV115(rules),lock=false,issue="";
      if(persist) {
        try {
          const raw=window.localStorage.getItem(WAR_OPERATIONS_STORAGE_V115);
          if(raw) {
            const parsed=readWarOperationsV115(raw,rules);
            if(parsed) current=parsed;
            else {lock=true;issue="Archive V115 illisible ou incompatible : octets conservés, aucune réécriture autorisée.";}
          }
        } catch {lock=true;issue="Stockage indisponible : archive existante préservée. Les opérations sont verrouillées.";}
      }
      worldRef.current=current;setWorld(current);setBlocked(lock);setStorageIssue(issue);
      setSelectedIds(current.teams.slice(0,2).map(team=>team.id));setTargetId(rules.territories[1]?.id??"");
      setHydrated(true);setNow(Date.now());
    },0);
    return ()=>window.clearTimeout(ticket);
  },[rules,persist,defaultSource]);

  function commit(update:WarOperationsUpdateV115) {
    setMessage(update.message);
    if(!update.accepted || blocked || !hydrated) return;
    if(persist) {
      try {window.localStorage.setItem(WAR_OPERATIONS_STORAGE_V115,JSON.stringify(update.state));}
      catch {
        setBlocked(true);
        setStorageIssue("Échec de sauvegarde : l'ancienne archive n'a pas été remplacée. Réessayez avec un espace de stockage disponible.");
        return;
      }
    }
    worldRef.current=update.state;setWorld(update.state);
  }
  useEffect(()=>{
    if(!active || !hydrated || blocked || world.active?.mode!=="assault") return;
    const timer=window.setInterval(()=>{
      const state=worldRef.current;
      if(state.active?.mode==="assault") commit(stepAssaultV115(state,rules));
    },700);
    return ()=>window.clearInterval(timer);
    // The mission ID, not the actor positions, owns this timer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[active,hydrated,blocked,world.active?.id,world.active?.mode,rules,persist]);

  useEffect(()=>{
    if(!active || !hydrated || blocked) return;
    function check() {
      const stamp=Date.now();setNow(stamp);
      const state=worldRef.current;
      if(state.outer.some(order=>stamp>=order.dueAt)) commit(settleWarOuterOpsV115(state,stamp,rules));
    }
    check();const timer=window.setInterval(check,1000);
    return ()=>window.clearInterval(timer);
    // Read clock and save only while this panel is visible; dueAt survives closing it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[active,hydrated,blocked,rules,persist]);

  useEffect(()=>{
    if(!active||!hydrated||blocked||world.active?.mode!=="rts"||!world.active.rts?.realtime) return;
    const timer=window.setInterval(()=>{
      const state=worldRef.current;
      if(state.active?.mode==="rts"&&state.active.rts?.realtime) commit(stepWarRtsRealtimeV115(state,rules));
    },1000);
    return ()=>window.clearInterval(timer);
    // The operation id owns this interval, not every actor's live position.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[active,hydrated,blocked,world.active?.id,world.active?.rts?.realtime,rules,persist]);

  const requestIssue=hydrated ? warMissionEligibleV115(world,rules,targetId,selectedIds) : "Chargement de l'archive";
  const target=rules.territories.find(site=>site.id===targetId);
  const missionPc=selectedIds.reduce((pc,id)=>pc+(rules.units.find(unit=>unit.id===world.teams.find(team=>team.id===id)?.unitId)?.commandPoints??0),0);
  const routePreview=missionPc>0&&missionPc<=rules.parameters.pc_cap_1?planWarRouteV6(world.baseId,targetId,missionPc,[],rules):null;
  const current=world.active;
  const assault=current?.mode==="assault"?current.assault:undefined;
  const stealth=current?.mode==="stealth"?current.stealth:undefined;
  const rts=current?.mode==="rts"?current.rts:undefined;
  const available=world.teams.filter(team=>!world.assignments[team.id] && team.members.some(member=>member.status==="fit"));
  const teamsById=(teamId:string)=>rules.units.find(unit=>unit.id===world.teams.find(team=>team.id===teamId)?.unitId)?.name ?? teamId;

  function start() {
    const result=beginWarOperationV115(worldRef.current,mode,targetId,selectedIds,rules,Date.now(),focus);
    if(result.accepted && mode==="rts") {
      const enabled=toggleWarRtsRealtimeV115(result.state,true);
      commit(enabled.accepted?{...enabled,message:"Déploiement RTS confirmé. Le temps réel est actif : donnez vos ordres."}:result);
    } else commit(result);
  }
  function reset() {
    if(!window.confirm("Remplacer uniquement les mandats d'exercice V115 ? Les archives V3, V6 et la campagne ne seront pas modifiées.")) return;
    const next=createWarOperationsV115(rules);
    if(persist) {
      try {window.localStorage.setItem(WAR_OPERATIONS_STORAGE_V115,JSON.stringify(next));}
      catch {setStorageIssue("Impossible de remplacer l'archive ; aucune donnée effacée.");return;}
    }
    worldRef.current=next;setWorld(next);setBlocked(false);setStorageIssue("");setHydrated(true);
    setMessage("Exercice V115 réinitialisé explicitement.");
  }

  if(!hydrated) return <section className={styles.root} role="status">Lecture des mandats V115 et de leur archive…</section>;
  return <section className={styles.root} data-testid="clan-operations-v115" data-war-campaign-write="none" aria-label="Opérations de clan, exercice V115">
    <div className={styles.intro}>
      <div><span className={styles.overline}>CONSEIL DES MANDATS · EXERCICE V115</span><h3>Quatre façons de mener la guerre</h3>
      <p>Une même équipe identifiable peut être envoyée en assaut latéral, en opération déléguée, en infiltration ou en bataille tactique. Les blessures, l&apos;expérience, les renseignements et les rapports suivent la même archive d&apos;exercice.</p></div>
      <button type="button" className={styles.reset} onClick={reset}>Réinitialiser V115 uniquement</button>
    </div>
    <p className={styles.disclaimer}>Les unités, passages, coûts RAV et gains d&apos;expérience proviennent de la Bible V6. Les chronomètres, jauges AP, déplacements et IA de ces minijeux sont des paramètres de prototype, sans identité canonique ajoutée. Les victoires n&apos;annexent aucun site V85, ne délivrent aucun trophée et ne modifient pas la chasse principale.</p>
    {storageIssue && <p role="alert" className={styles.warning}>{storageIssue}</p>}
    <div className={styles.metrics}>
      <div>RAV de l&apos;exercice<strong>{world.rav}</strong></div>
      <div>Vacations simulées<strong>{world.clock}</strong></div>
      <div>Équipes libres<strong>{available.length}/{world.teams.length}</strong></div>
      <div>Rapports enregistrés<strong>{world.reports.length}</strong></div>
    </div>
    <p className={styles.message} role="status" aria-live="polite">{message}</p>
    <div className={styles.selector}>
      <fieldset disabled={blocked}>
        <legend>1. Choisir un mode</legend>
        <div className={styles.modes}>{(Object.keys(modeLabels) as WarMissionModeV115[]).map(key=>
          <button key={key} type="button" aria-pressed={mode===key} onClick={()=>setMode(key)}>{modeLabels[key]}</button>)}</div>
      </fieldset>
      <fieldset disabled={blocked}>
        <legend>2. Mandat territorial et renseignements</legend>
        <label>Territoire de la Bible V6
          <select value={targetId} onChange={event=>setTargetId(event.target.value)}>
            {rules.territories.filter(site=>site.id!==world.baseId).map(site=><option key={site.id} value={site.id}>{site.id} · {site.name}</option>)}
          </select>
        </label>
        {target && <><p className={styles.explain}><strong>{target.name}</strong> · {target.region} · défense de terrain {target.terrainDefense} · renseignement {world.intelIds.includes(target.id)?"obtenu":"non confirmé"} · pression d&apos;exercice {world.pressure[target.id]??0}.</p>
          <details className={styles.brief}><summary>Ordre territorial · Bible V6</summary>
            <p><strong>Mission :</strong> {target.objective}</p><p><strong>Reconnaissance :</strong> {target.reconnaissance}</p>
            <p><strong>Contrôle :</strong> {target.control}</p><p><strong>Vie locale :</strong> {target.life}</p><p><strong>Repli :</strong> {target.retreat}</p>
          </details></>}
        {mode==="outer" && <label>Consigne du détachement
          <select value={focus} onChange={event=>setFocus(event.target.value as OuterFocusV115)}>
            {(Object.keys(focusLabels) as OuterFocusV115[]).map(key=><option value={key} key={key}>{focusLabels[key]}</option>)}
          </select>
        </label>}
      </fieldset>
      <fieldset disabled={blocked}>
        <legend>3. Affecter jusqu&apos;à {mode==="stealth"?"deux":"quatre"} équipes existantes</legend>
        <div className={styles.roster}>
          {world.teams.map(team=>{
            const unit=rules.units.find(item=>item.id===team.unitId);
            const engaged=world.assignments[team.id],chosen=selectedIds.includes(team.id);
            const fit=team.members.filter(member=>member.status==="fit").length;
            return <label key={team.id} className={styles.team} data-engaged={Boolean(engaged)}>
              <span><input type="checkbox" checked={chosen} disabled={(!chosen&&Boolean(engaged))||(!chosen&&fit===0)} onChange={event=>setSelectedIds(list=>event.target.checked?[...list,team.id]:list.filter(id=>id!==team.id))}/>
                <strong>{unit?.name??team.unitId}</strong><small>{team.id} · {unit?.commandPoints} PC · {unit?.upkeepRav} RAV</small></span>
              <small>{unit?.role} · ATQ {unit?.attack} · DEF {unit?.defense} · MOB {unit?.mobility}</small>
              <small>{fit}/{team.members.length} aptes · fatigue {team.fatigue} · {engaged?"engagé "+engaged:"disponible"}</small>
            </label>;
          })}
        </div>
      </fieldset>
    </div>
    <div className={styles.launch}>
      <p>{requestIssue ?? "Ordre admissible : RAV débités une seule fois, détachements immobilisés jusqu'au rapport."}
        {routePreview && <small className={styles.path}>Passages V6 : {routePreview.passageIds.join(" → ")||"sur place"} · coût de mouvement {routePreview.cost} · {missionPc} PC</small>}</p>
      <button type="button" disabled={blocked||Boolean(requestIssue)||((mode!=="outer")&&Boolean(current))||(mode==="outer"&&world.outer.length>=3)||(mode==="stealth"&&selectedIds.length>2)} onClick={start}>Lancer : {modeLabels[mode]}</button>
    </div>

    {current && <section className={styles.battle} aria-label="Mission jouable active" data-mode={current.mode}>
      <div className={styles.battleHeader}><div><span className={styles.overline}>{current.id} · {current.targetId} · action {current.tick}</span>
        <h4>{modeLabels[current.mode]}</h4></div>
        <button type="button" disabled={blocked} onClick={()=>commit(leaveWarOperationV115(worldRef.current,rules))}>Ordonner le repli</button></div>

      {assault && <div>
        <p>Points d&apos;assaut <strong>{assault.ap} AP</strong> · Rempart allié <strong>{assault.ownBase}/80</strong> · Rempart adverse <strong>{assault.rivalBase}/80</strong>. Les équipes avancent et engagent automatiquement ; vous décidez du moment du déploiement.</p>
        <svg className={styles.sideScene} viewBox="0 0 1000 220" role="img" aria-label="Vue de côté du champ de bataille, bastions et unités">
          <rect width="1000" height="220" fill="#172825"/>
          <path d="M0 175 H1000" stroke="#8d856d" strokeWidth="4"/>
          {Array.from({length:12},(_,index)=><path key={index} d={"M"+(index*88)+" 175 l35 -50 l26 50"} stroke="#486057" strokeWidth="1.5" fill="none"/>)}
          <rect x="8" y="72" width="45" height="103" fill="#667c76" stroke="#d0d3a8" strokeWidth="3"/>
          <rect x="947" y="72" width="45" height="103" fill="#805b50" stroke="#e7ae87" strokeWidth="3"/>
          {assault.actors.map(actor=><g key={actor.id} transform={"translate("+(18+actor.x*9.6)+",142)"}>
            <circle r="15" fill={actor.side==="ally"?"#8aa79b":"#ba7a69"} stroke="#f0e4c6" strokeWidth="2"/>
            <path d="M-8 13 L-12 29 M8 13 L12 29 M-15 -5 L-26 2 M15 -5 L26 2" stroke="#eee1bd" strokeWidth="4"/>
            <title>{actor.side==="ally"?teamsById(actor.teamId??""):"Opposition d'exercice"} · vie {Math.max(0,actor.hp)}</title>
          </g>)}
          <text x="14" y="24" fill="#e9e2b8" fontSize="19">HALTE</text><text x="887" y="24" fill="#e9c9b4" fontSize="19">RELAIS</text>
        </svg>
        <div className={styles.cards}>{current.teamIds.map(id=>{
          const team=world.teams.find(item=>item.id===id)!;
          const unit=rules.units.find(item=>item.id===team.unitId)!;
          const cost=Math.max(8,Math.min(72,unit.commandPoints*8));
          return <button type="button" key={id} disabled={blocked||assault.launched.includes(id)||assault.ap<cost}
            onClick={()=>commit(deployAssaultUnitV115(worldRef.current,id,rules))}>
            {unit.name} · {cost} AP {assault.launched.includes(id)?"· déployée":""}</button>;
        })}</div>
        <p className={styles.explain}>Art temporaire schématique : aucun sprite de film ou de Predator: Hunting Grounds n&apos;est faussement déclaré intégré.</p>
      </div>}

      {stealth && <div>
        <p>Rejoindre le relais (7,1), le désactiver, puis rejoindre l&apos;extraction (1,4). Alerte <strong>{stealth.alarm}/3</strong> · énergie de camouflage <strong>{stealth.energy}/5</strong> · relais <strong>{stealth.sabotaged?"neutralisé":"actif"}</strong>.</p>
        <div className={styles.grid} style={{gridTemplateColumns:"repeat(9,minmax(0,1fr))"}} role="img" aria-label="Plan d'infiltration : X pisteur, G garde, R relais, E extraction, obstacles">
          {Array.from({length:54},(_,index)=>{
            const x=index%9,y=Math.floor(index/9),wall=walls.has(x+","+y);
            const mark=stealth.x===x&&stealth.y===y?"X":stealth.guardX===x&&y===2?"G":x===7&&y===1?"R":x===1&&y===4?"E":wall?"▥":"·";
            return <span className={styles.cell} data-wall={wall} data-actor={mark==="X"?"ally":mark==="G"?"rival":""} key={index} title={"Case "+x+","+y}>{mark}</span>;
          })}
        </div>
        <div className={styles.stealthControls}>{(["up","left","down","right","cloak","interact"] as const).map(action=>
          <button type="button" key={action} disabled={blocked} onClick={()=>commit(commandStealthV115(worldRef.current,action,rules))}>
            {({up:"↑ Nord",left:"← Ouest",down:"↓ Sud",right:"→ Est",cloak:stealth.cloaked?"Désactiver camouflage":"Camouflage optique",interact:"Saboter le relais"} as Record<string,string>)[action]}</button>)}</div>
        <p className={styles.explain}>La patrouille réagit à la position et au sabotage. Le camouflage protège à distance mais possède une réserve finie ; aucune exécution déshonorante n&apos;est requise.</p>
      </div>}

      {rts && <div>
        <p>Choisissez un détachement, puis désignez une position ou une cible. En temps réel, les équipes avancent et échangent des tirs automatiquement ; en tactique alternée, chaque clic exécute un ordre et une riposte. La balise est en (7,3).</p>
        <div className={styles.cards}><button type="button" disabled={blocked}
          aria-pressed={Boolean(rts.realtime)} onClick={()=>commit(toggleWarRtsRealtimeV115(worldRef.current,!rts.realtime))}>
          {rts.realtime?"Passer en ordres alternés":"Activer la bataille en temps réel"}
        </button>
        <span className={styles.explain}>Tenue <strong>{rts.hold}/{rts.realtime?3:2}</strong> · {rts.realtime?"Simulation active toutes les secondes":"Une réponse par commande"}</span></div>
        <div className={styles.cards}>
          {rts.actors.filter(unit=>unit.side==="ally").map(unit=><button type="button" key={unit.id}
            aria-pressed={rtsSelectedId===unit.teamId} disabled={blocked}
            onClick={()=>setRtsSelectedId(unit.teamId??"")}>{teamsById(unit.teamId??"")} · PV {unit.hp}</button>)}
          {rts.realtime && <button type="button" disabled={blocked||!rts.actors.some(unit=>unit.teamId===rtsSelectedId)}
            onClick={()=>{const actor=rts.actors.find(unit=>unit.teamId===rtsSelectedId);if(actor)commit(issueWarRtsRealtimeOrderV115(worldRef.current,rtsSelectedId,actor.x,actor.y,"hold"));}}>
            Tenir la position et utiliser le couvert</button>}
        </div>
        <div className={styles.grid} style={{gridTemplateColumns:"repeat(9,minmax(0,1fr))"}} role="group" aria-label="Champ de bataille tactique 9 colonnes par 6 lignes">
          {Array.from({length:54},(_,index)=>{
            const x=index%9,y=Math.floor(index/9),actor=rts.actors.find(item=>item.x===x&&item.y===y);
            const objective=x===7&&y===3,cover=WAR_RTS_COVER_V115.some(tile=>tile===x+","+y),mark=actor?(actor.side==="ally"?"Y":"R"):objective?"◎":cover?"▤":"·";
            return <button key={index} type="button" disabled={blocked||!rtsSelectedId}
              className={styles.cell} data-actor={actor?.side??""} data-objective={objective} data-cover={cover}
              title={"Position "+x+","+y+(actor?" · "+actor.unitId+" · PV "+actor.hp:"")}
              aria-label={"Case "+x+","+y+" · "+(actor?.side==="ally"?"allié":actor?.side==="rival"?"adversaire":objective?"objectif":"libre")}
              onClick={()=>commit(rts.realtime?
                issueWarRtsRealtimeOrderV115(worldRef.current,rtsSelectedId,x,y,actor?.side==="rival"?"attack":"advance"):
                commandRtsV115(worldRef.current,rtsSelectedId,x,y,rules))}>{mark}</button>;
          })}
        </div>
        <p className={styles.explain}>Y = unité alliée, R = opposition d&apos;exercice, ◎ = balise, ▤ = couvert. Une position couverte ou un ordre de tenue réduit les dégâts reçus en temps réel. Les pions représentent des équipes identifiées, pas des recrues gratuites.</p>
      </div>}
    </section>}

    <section className={styles.delegated}>
      <h4>Outer Ops · opérations en attente ({world.outer.length}/3)</h4>
      <p>Le délai utilise l&apos;heure de l&apos;appareil, même après fermeture du panneau. La résolution est calculée au retour dans le jeu et un identifiant empêche le double rapport.</p>
      {world.outer.length?world.outer.map(order=><div className={styles.delegatedOrder} key={order.id}>
        <strong>{order.id} · {focusLabels[order.focus]}</strong>
        <span>{order.targetId} · {order.teamIds.map(teamsById).join(", ")}</span>
        <span>Rapport attendu dans {formatTime(warOuterSecondsRemainingV115(order,now))} · {order.routeIds.length} passage(s)</span>
      </div>):<p>Aucune équipe actuellement déléguée.</p>}
      <button type="button" disabled={blocked||!world.outer.some(order=>now>=order.dueAt)}
        onClick={()=>commit(settleWarOuterOpsV115(worldRef.current,Date.now(),rules))}>Recevoir les rapports arrivés</button>
    </section>
    <section className={styles.reports}>
      <h4>Chronique de guerre et conséquences enregistrées</h4>
      <p>Renseignements : {world.intelIds.length} · relais sabotés : {world.weakenedIds.length} · itinéraires escortés : {world.escortedIds.length}. La pression n&apos;est pas une annexion : il faut encore les ordres de conquête et une garnison dans le moteur stratégique.</p>
      <ol>{world.reports.slice(-16).reverse().map(report=><li key={report.id}>
        <strong>{report.id} · {report.outcome==="victory"?"Succès":report.outcome==="retreat"?"Repli":"Échec"}</strong>
        <span>{report.mode==="outer"?focusLabels[report.focus??"recon"]:modeLabels[report.mode]} · {report.targetId} · vacation {report.clock}</span>
        <p>{report.summary}</p>
        {report.engagementLog?.length ? <details className={styles.debriefDetails}><summary>Journal opérationnel · {report.engagementLog.length} phases</summary>
          <ol>{report.engagementLog.map((item,index)=><li key={report.id+"-"+index}>{item}</li>)}</ol></details>:null}
        <small>Équipes : {report.teamIds.join(", ")} · Blessés : {report.woundedIds.length?report.woundedIds.join(", "):"aucun déclaré"} · Source : {report.sourceIds.join(", ")}</small>
      </li>)}</ol>
      {!world.reports.length && <p>Aucun résultat pour cet exercice.</p>}
    </section>
  </section>;
}
