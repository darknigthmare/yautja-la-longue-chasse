"use client";

import { useEffect, useRef, useState } from "react";
import { planWarRouteV6, type WarRulesV6 } from "./systems/clanWarBibleV6";
import { warMissionTerrainV116 } from "./systems/clanWarMissionTerrainV116";
import { warSourceRtsScenarioV119, warRtsScriptedEligibilityV119,
  type WarSourceRtsScenarioIdV119,
} from "./systems/clanWarRtsScenariosV119";
import {
  WAR_OPERATIONS_STORAGE_V115, beginWarOperationV115, commandRtsV115, commandStealthV115,
  createWarOperationsV115, deployAssaultUnitV115, issueWarRtsRealtimeOrderV115,
  upgradeWarAssaultApV117, issueWarAssaultSpecialV117,
  queueWarRecruitmentV115, settleWarRecruitmentsV115,
  queueWarTreatmentV116, settleWarTreatmentsV116, cancelWarTreatmentV116,
  leaveWarOperationV115, readWarOperationsV115, stepWarRtsRealtimeV115, toggleWarRtsRealtimeV115,
  settleWarOuterOpsV115, recallWarOuterMissionV116, stepAssaultV115, warMissionEligibleV115, warOuterSecondsRemainingV115,
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
const formatTime = (seconds:number) => String(Math.floor(seconds / 60)).padStart(2,"0")+":"+String(seconds%60).padStart(2,"0");
type Props={rules:WarRulesV6;active?:boolean;persist?:boolean};

export default function ClanWarOperationsV115({rules,active=true,persist=false}:Props) {
  const [world,setWorld]=useState<WarOperationsStateV115>(()=>createWarOperationsV115(rules));
  const worldRef=useRef(world);
  const knownArchiveBytesRef=useRef<string|null>(null);
  const [hydrated,setHydrated]=useState(false),[blocked,setBlocked]=useState(false);
  const [storageIssue,setStorageIssue]=useState(""),[message,setMessage]=useState("Choisissez votre théâtre, vos équipes, puis le type d'opération.");
  const [mode,setMode]=useState<WarMissionModeV115>("assault"),[focus,setFocus]=useState<OuterFocusV115>("recon");
  const [targetId,setTargetId]=useState(rules.territories[1]?.id??"");
  const [selectedIds,setSelectedIds]=useState<string[]>([]);
  const [rtsSelectedId,setRtsSelectedId]=useState("");
  const [rtsScenarioId,setRtsScenarioId]=useState<"free"|WarSourceRtsScenarioIdV119>("free");
  const [recruitUnitId,setRecruitUnitId]=useState(rules.units[8]?.id??rules.units[0]?.id??"");
  const [careMemberId,setCareMemberId]=useState("");
  const [careMedicTeamId,setCareMedicTeamId]=useState("");
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
          knownArchiveBytesRef.current=raw;
          if(raw) {
            const parsed=readWarOperationsV115(raw,rules);
          knownArchiveBytesRef.current=raw;
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

  useEffect(()=>{
    if(!persist) return;
    const externalChange=(event:StorageEvent)=>{
      if((event.key===WAR_OPERATIONS_STORAGE_V115||event.key===null) &&
        event.newValue!==knownArchiveBytesRef.current){
        setBlocked(true);
        setStorageIssue("Front mis à jour depuis un autre onglet : opérations suspendues pour éviter tout écrasement.");
      }
    };
    window.addEventListener("storage",externalChange);
    return ()=>window.removeEventListener("storage",externalChange);
  },[persist]);

  function commit(update:WarOperationsUpdateV115) {
    setMessage(update.message);
    if(!update.accepted || blocked || !hydrated) return;
    if(persist) {
      try {
        const currentBytes=window.localStorage.getItem(WAR_OPERATIONS_STORAGE_V115);
        if(currentBytes!==knownArchiveBytesRef.current){
          setBlocked(true);
          setStorageIssue("Conflit de sauvegarde : un autre onglet a modifié le front. Rechargez pour consulter les dernières données ; aucun écrasement effectué.");
          return;
        }
        const updatedBytes=JSON.stringify(update.state);
        window.localStorage.setItem(WAR_OPERATIONS_STORAGE_V115,updatedBytes);
        knownArchiveBytesRef.current=updatedBytes;
      } catch {
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
      const current=worldRef.current;
      if(current.pendingRecruits?.some(order=>stamp>=order.dueAt)) commit(settleWarRecruitmentsV115(current,stamp,rules));
      const latest=worldRef.current;
      if(latest.pendingTreatments?.some(order=>stamp>=order.dueAt)) commit(settleWarTreatmentsV116(latest,stamp,rules));
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

  const scenarioIssue=mode==="rts"&&rtsScenarioId!=="free"?
    warRtsScriptedEligibilityV119(rtsScenarioId,rules,targetId,
      selectedIds.map(id=>world.teams.find(team=>team.id===id)?.unitId??"")):null;
  const scenarioBrief=mode==="rts"&&rtsScenarioId!=="free"?warSourceRtsScenarioV119(rtsScenarioId,rules):null;
  const requestIssue=hydrated?
    warMissionEligibleV115(world,rules,targetId,selectedIds)??scenarioIssue:"Chargement de l'archive";
  const target=rules.territories.find(site=>site.id===targetId);
  const recruitUnit=rules.units.find(unit=>unit.id===recruitUnitId);
  const woundedMembers=world.teams.flatMap(team=>team.members.filter(member=>member.status==="wounded")
    .map(member=>({member,team}))).filter(item=>!world.assignments[item.team.id]);
  const freeMedics=world.teams.filter(team=>team.unitId==="W3-U18"&&!world.assignments[team.id]&&
    team.members.some(member=>member.status==="fit"));
  const carePatient=woundedMembers.find(item=>item.member.id===careMemberId);
  const careMedic=freeMedics.find(team=>team.id===careMedicTeamId);
  const careFee=rules.units.find(unit=>unit.id==="W3-U18")?.upkeepRav??0;
  const missionPc=selectedIds.reduce((pc,id)=>pc+(rules.units.find(unit=>unit.id===world.teams.find(team=>team.id===id)?.unitId)?.commandPoints??0),0);
  const routePreview=missionPc>0&&missionPc<=rules.parameters.pc_cap_1?planWarRouteV6(world.baseId,targetId,missionPc,[],rules):null;
  const current=world.active;
  const assault=current?.mode==="assault"?current.assault:undefined;
  const stealth=current?.mode==="stealth"?current.stealth:undefined;
  const rts=current?.mode==="rts"?current.rts:undefined;
  const missionTerrain=current?warMissionTerrainV116(current.targetId,rules):null;
  const available=world.teams.filter(team=>!world.assignments[team.id] && team.members.some(member=>member.status==="fit"));
  const teamsById=(teamId:string)=>rules.units.find(unit=>unit.id===world.teams.find(team=>team.id===teamId)?.unitId)?.name ?? teamId;

  function start() {
    const result=beginWarOperationV115(worldRef.current,mode,targetId,selectedIds,rules,Date.now(),focus,
      mode==="rts"&&rtsScenarioId!=="free"?rtsScenarioId:null);
    if(result.accepted && mode==="rts") {
      setRtsSelectedId(result.state.active?.teamIds[0]??"");
      const enabled=toggleWarRtsRealtimeV115(result.state,true);
      commit(enabled.accepted?{...enabled,message:"Déploiement RTS confirmé. Le temps réel est actif : donnez vos ordres."}:result);
    } else commit(result);
  }
  function reset() {
    if(!window.confirm("Remplacer uniquement les mandats d'exercice V115 ? Les archives V3, V6 et la campagne ne seront pas modifiées.")) return;
    const next=createWarOperationsV115(rules);
    if(persist) {
      try {
        const encoded=JSON.stringify(next);
        window.localStorage.setItem(WAR_OPERATIONS_STORAGE_V115,encoded);
        knownArchiveBytesRef.current=encoded;
      } catch {setStorageIssue("Impossible de remplacer l'archive ; aucune donnée effacée.");return;}
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
        {mode==="rts"&&<div className={styles.sourceScenario}>
          <label>Objectif RTS
            <select value={rtsScenarioId} onChange={event=>setRtsScenarioId(event.target.value as "free"|WarSourceRtsScenarioIdV119)}>
              <option value="free">Escarmouche libre · balise</option>
              {(["W3-RTS01","W3-RTS02"] as const).map(id=>{
                const source=warSourceRtsScenarioV119(id,rules);
                return source?<option value={id} key={id}>{id} · {source.title}</option>:null;
              })}
            </select>
          </label>
          {scenarioBrief&&<div className={styles.brief}><strong>{scenarioBrief.id} · {scenarioBrief.title}</strong>
            <p>{scenarioBrief.situation}</p><p><strong>Objectif :</strong> {scenarioBrief.completion}</p>
            <p><strong>Riposte attendue :</strong> {scenarioBrief.enemyPlan}</p>
            <small>Épreuve fonctionnelle 9 × 6 uniquement ; la carte W3-MAP01 complète et son scénario cinématique restent à réaliser.</small>
          </div>}
        </div>}
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

    <section className={styles.reinforcements} aria-label="Registre de recrutement V6">
      <div><h4>Renforts de clan · catalogue V6 complet</h4>
        <p>Trente formations sont disponibles depuis les fiches W3-U. Les volontaires arrivent seulement après leur délai de recrutement et avec de nouvelles identités, jamais avec l&apos;expérience d&apos;un vétéran.</p></div>
      <div className={styles.recruitControls}>
        <label>Former un nouveau détachement
          <select value={recruitUnitId} disabled={blocked} onChange={event=>setRecruitUnitId(event.target.value)}>
            {rules.units.map(unit=><option key={unit.id} value={unit.id}>{unit.id} · {unit.name} · {unit.recruitmentRav} RAV</option>)}
          </select>
        </label>
        <button type="button" disabled={blocked||!recruitUnit||world.rav<recruitUnit.recruitmentRav||
          world.teams.length+(world.pendingRecruits?.length??0)>=16||(world.pendingRecruits?.length??0)>=4}
          onClick={()=>commit(queueWarRecruitmentV115(worldRef.current,recruitUnitId,Date.now(),rules))}>
          Recruter · {recruitUnit?.recruitmentRav??"?"} RAV
        </button>
      </div>
      {recruitUnit&&<p className={styles.explain}>{recruitUnit.name} · {recruitUnit.fullMembers} membre(s) · {recruitUnit.commandPoints} PC ·
        {recruitUnit.upkeepRav} RAV d&apos;entretien par opération · arrivée après {recruitUnit.delayTurns} tour(s) source
        ({Math.max(1,recruitUnit.delayTurns)*15} secondes d&apos;exercice).</p>}
      {(world.pendingRecruits??[]).map(order=><p className={styles.recruitOrder} key={order.id}>
        {order.id} · {rules.units.find(unit=>unit.id===order.unitId)?.name??order.unitId} · arrivée dans
        {formatTime(Math.max(0,Math.ceil((order.dueAt-now)/1000)))}
      </p>)}
      <p className={styles.explain}>Équipes formées en renfort : {(world.recruitedTeamIds??[]).length}. Coût et délai de base issus de la Bible V6 ; conversion des tours en secondes propre à ce prototype.</p>
    </section>

    <section className={styles.medicalPanel} aria-label="Relève et récupération des blessés V6">
      <h4>Triage du clan · récupération des blessures légères</h4>
      <p>Les participants blessés restent identifiés, avec leur expérience antérieure. Leur retour exige une équipe de soigneur de terrain W3-U18 réellement recrutée, disponible, des RAV et 45 secondes de traitement. Ce délai est propre à l&apos;exercice ; aucune blessure majeure ne guérit automatiquement.</p>
      <div className={styles.medicalControls}>
        <label>Personne blessée à relever
          <select value={careMemberId} disabled={blocked} onChange={event=>setCareMemberId(event.target.value)}>
            <option value="">Choisir un blessé disponible</option>
            {woundedMembers.map(({member,team})=><option key={member.id} value={member.id}>{team.id} · {member.id} · XP {member.xp}</option>)}
          </select>
        </label>
        <label>Soigneur de terrain recruté
          <select value={careMedicTeamId} disabled={blocked} onChange={event=>setCareMedicTeamId(event.target.value)}>
            <option value="">Choisir un soigneur W3-U18 libre</option>
            {freeMedics.map(team=><option key={team.id} value={team.id}>{team.id} · {team.members.filter(member=>member.status==="fit").length} apte(s)</option>)}
          </select>
        </label>
        <button type="button" disabled={blocked||!carePatient||!careMedic||
          carePatient.team.id===careMedic.id||world.rav<careFee||(world.pendingTreatments?.length??0)>=2}
          onClick={()=>commit(queueWarTreatmentV116(worldRef.current,carePatient?.team.id??"",
            careMemberId,careMedicTeamId,Date.now(),rules))}>Engager les soins · {careFee} RAV</button>
      </div>
      <p className={styles.explain}>Un traitement immobilise les deux équipes, bloque les doubles missions et conserve les identités. La guérison exige une échéance réelle et un membre soigneur encore apte.</p>
      {(world.pendingTreatments??[]).map(order=><div className={styles.treatmentOrder} key={order.id}>
        <span><strong>{order.id}</strong> · {order.memberId} pris en charge par {order.medicTeamId} ·
          {formatTime(Math.max(0,Math.ceil((order.dueAt-now)/1000)))} restant</span>
        <button type="button" disabled={blocked} onClick={()=>commit(cancelWarTreatmentV116(worldRef.current,order.id))}>Interrompre sans remboursement</button>
      </div>)}
      {!world.teams.some(team=>team.members.some(member=>member.status==="wounded"))&&<p className={styles.explain}>Aucune blessure légère actuellement enregistrée.</p>}
      {(world.treatmentReceipts??[]).length>0&&<p className={styles.explain}>{world.treatmentReceipts?.length} traitement(s) validé(s), chacun clôturé une seule fois.</p>}
    </section>

    {current && <section className={styles.battle} aria-label="Mission jouable active" data-mode={current.mode}>
      <div className={styles.battleHeader}><div><span className={styles.overline}>{current.id} · {current.targetId} · action {current.tick}</span>
        <h4>{modeLabels[current.mode]}</h4></div>
        <button type="button" disabled={blocked} onClick={()=>commit(leaveWarOperationV115(worldRef.current,rules))}>Ordonner le repli</button></div>

      {assault && <div>
        <p>Points d&apos;assaut <strong>{assault.ap} AP</strong> · Cadence <strong>niveau {assault.apLevel??1}/3</strong> · Réserve maximale <strong>{100+((assault.apLevel??1)-1)*35} AP</strong> · Rempart allié <strong>{assault.ownBase}/80</strong> · Rempart adverse <strong>{assault.rivalBase}/80</strong>. Les équipes avancent et engagent automatiquement ; vous décidez du moment du déploiement.</p>
        <div className={styles.cards}>
          <button type="button" disabled={blocked||(assault.apLevel??1)>=3||assault.ap<((assault.apLevel??1)===1?35:55)}
            onClick={()=>commit(upgradeWarAssaultApV117(worldRef.current))}>
            {(assault.apLevel??1)>=3?"Cadence maximale atteinte":"Accélérer la coordination AP · "+((assault.apLevel??1)===1?35:55)+" AP"}
          </button>
          <p className={styles.explain}>Cette montée de cadence ne recrute personne ; elle augmente uniquement le rythme des ordres sur cette simulation.</p>
        </div>
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
        <div className={styles.cards}>
          {current.teamIds.filter(id=>assault.launched.includes(id)).map(id=><button type="button" key={"special-"+id}
            disabled={blocked||assault.ap<20||(assault.usedSpecials??[]).includes(id)||!assault.actors.some(actor=>actor.teamId===id&&actor.hp>0)}
            onClick={()=>commit(issueWarAssaultSpecialV117(worldRef.current,id,rules))}>
            {teamsById(id)} · feu concentré (20 AP){(assault.usedSpecials??[]).includes(id)?" · utilisé":""}
          </button>)}
        </div>
        <p className={styles.explain}>Action coordonnée limitée à une fois par détachement survivant, uniquement si une cible adverse se trouve dans sa portée V6. Aucun nouveau projectile ou équipement n&apos;est créé.</p>
        <p className={styles.explain}>Art temporaire schématique : aucun sprite de film ou de Predator: Hunting Grounds n&apos;est faussement déclaré intégré.</p>
      </div>}

      {stealth && <div>
        <p>Rejoindre le relais (7,1), le désactiver, puis rejoindre l&apos;extraction (1,4). Alerte <strong>{stealth.alarm}/3</strong> · énergie de camouflage <strong>{stealth.energy}/5</strong> · relais <strong>{stealth.sabotaged?"neutralisé":"actif"}</strong>.</p>
        <p className={styles.explain}>Terrain régional : {missionTerrain?.title} · {missionTerrain?.ground} · obstacle : {missionTerrain?.wallLabel}.</p>
        <div className={styles.grid} style={{gridTemplateColumns:"repeat(9,minmax(0,1fr))"}} role="img" aria-label="Plan d'infiltration : X pisteur, G garde, R relais, E extraction, obstacles">
          {Array.from({length:54},(_,index)=>{
            const x=index%9,y=Math.floor(index/9),wall=Boolean(missionTerrain?.walls.includes(x+","+y));
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
        <p className={styles.explain}>Théâtre : {missionTerrain?.title} · {missionTerrain?.ground} · couverts : {missionTerrain?.coverLabel}. Les murs interrompent les trajets et les lignes de tir.</p>
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
            onClick={()=>{const actor=rts.actors.find(unit=>unit.teamId===rtsSelectedId);if(actor)commit(issueWarRtsRealtimeOrderV115(worldRef.current,rtsSelectedId,actor.x,actor.y,"hold",rules));}}>
            Tenir la position et utiliser le couvert</button>}
        </div>
        <div className={styles.grid} style={{gridTemplateColumns:"repeat(9,minmax(0,1fr))"}} role="group" aria-label="Champ de bataille tactique 9 colonnes par 6 lignes">
          {Array.from({length:54},(_,index)=>{
            const x=index%9,y=Math.floor(index/9),actor=rts.actors.find(item=>item.x===x&&item.y===y);
            const objective=x===7&&y===3,wall=Boolean(missionTerrain?.walls.includes(x+","+y)),
              cover=Boolean(missionTerrain?.cover.includes(x+","+y)),
              mark=actor?(actor.side==="ally"?"Y":"R"):objective?"◎":wall?"▥":cover?"▤":"·";
            return <button key={index} type="button" disabled={blocked||!rtsSelectedId||wall}
              className={styles.cell} data-wall={wall} data-actor={actor?.side??""} data-objective={objective} data-cover={cover}
              title={"Position "+x+","+y+(actor?" · "+actor.unitId+" · PV "+actor.hp:"")}
              aria-label={"Case "+x+","+y+" · "+(actor?.side==="ally"?"allié":actor?.side==="rival"?"adversaire":objective?"objectif":"libre")}
              onClick={()=>commit(rts.realtime?
                issueWarRtsRealtimeOrderV115(worldRef.current,rtsSelectedId,x,y,actor?.side==="rival"?"attack":"advance",rules):
                commandRtsV115(worldRef.current,rtsSelectedId,x,y,rules))}>{mark}</button>;
          })}
        </div>
        <p className={styles.explain}>Y = unité alliée, R = opposition d&apos;exercice, ◎ = balise, ▤ = couvert, ▥ = obstacle. Une position couverte ou un ordre de tenue réduit les dégâts reçus en temps réel. Les pions représentent des équipes identifiées, pas des recrues gratuites.</p>
      </div>}
    </section>}

    <section className={styles.delegated}>
      <h4>Outer Ops · opérations en attente ({world.outer.length}/3)</h4>
      <p>Le délai utilise l&apos;heure de l&apos;appareil. Un rappel ne téléporte pas l&apos;équipe : son trajet de retour est décompté jusqu&apos;au rapport final.</p>
      {world.outer.length?world.outer.map(order=><div className={styles.delegatedOrder} key={order.id}>
        <strong>{order.id} · {focusLabels[order.focus]}</strong>
        <span>{order.targetId} · {order.teamIds.map(teamsById).join(", ")}</span>
        <span>{order.recall?"Retour au clan":"Rapport de mission"} dans {formatTime(warOuterSecondsRemainingV115(order,now))} · {order.routeIds.length} passage(s)</span>
        {order.recall ? <small className={styles.explain}>Rappel transmis : équipe toujours engagée jusqu&apos;à l&apos;arrivée.</small> : <button type="button" disabled={blocked||now<order.startedAt||now>=order.dueAt} onClick={()=>commit(recallWarOuterMissionV116(worldRef.current,order.id,Date.now(),rules))}>Rappeler l&apos;équipe</button>}
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
