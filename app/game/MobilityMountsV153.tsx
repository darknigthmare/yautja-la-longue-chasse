"use client";
import {useState} from 'react';
import type {SaveGame} from './types';
import {
  createMountsV153, mountProfileV153, mountCareQuoteV153, mountExerciseRefusalV153,
  KHA_RHA_ADOPTION_MARKS_V153, MOUNT_EXERCISES_V153, MOUNT_CONDITIONS_V153, MOUNT_CONDITION_LABELS_V153, MOUNT_SESSION_GAIN_CAP_V153,
  type MountConditionV153, type MountOrderV153, type MountWriterV153,
} from './systems/mobility/mountsV153';
import {MOUNT_RIDE_MIN_BOND_V156,mountRideRefusalV156,createMountRidesV156,type MountRideWriterV156} from './systems/mobility/mountRidingV156';
import {mountExpeditionV153} from './systems/mobility/mountExpeditionsV153';
import MountExpeditionRouteV153,{MountExpeditionPortraitV153} from './MountExpeditionV153';
import styles from './MobilityGarage.module.css';

export interface MobilityMountsV153Props {save:SaveGame;mountId:string;allowed:boolean;onCommand?:MountWriterV153;onRideCommand?:MountRideWriterV156;onMessage:(message:string)=>void}

/** MOB-012 : recrutement explicite, séances de lien, peur, fatigue, blessures et soins d'une monture. */
export default function MobilityMountsV153({save,mountId,allowed,onCommand,onRideCommand,onMessage}:MobilityMountsV153Props){
 const [condition,setCondition]=useState<MountConditionV153>('calm');
 const profile=mountProfileV153(mountId);
 if(!profile)return null;
 const state=save.mountsV153??createMountsV153(save.createdAt);
 const can=allowed&&!!onCommand;
 // Identifiant d'événement : la révision confirmée est unique et croissante.
 const eventId=`ev-r${state.revision}`;
 const order=(action:MountOrderV153)=>{if(!can||!onCommand)return;const r=onCommand({...action,ownerCreatedAt:save.createdAt,expectedRevision:state.revision} as Parameters<MountWriterV153>[0]);onMessage(r.message);};
 const mount=state.mounts.find(m=>m.id===profile.id);
 const expedition=mountExpeditionV153(profile.id);
 const conflict=state.trial&&!state.mounts.some(m=>m.id===state.trial?.mountId)&&state.trial.mountId!==profile.id;
 const trial=state.trial?.mountId===profile.id?state.trial:null;
 const session=state.session?.mountId===profile.id?state.session:null;
 const reactions=profile.reactions.length?<ul>{profile.reactions.map(r=><li key={r.trigger}>« {r.source} » → {r.reaction==='panic'?'panique':'refus'}{r.bondBelow!==null?` sous BOND ${r.bondBelow}`:''}{r.repeated!==null?` à la ${r.repeated}e exposition de la séance`:''}. <span className={styles.hint}>Proposé : {r.proposed}</span></li>)}</ul>:<p className={styles.hint}>Aucune peur ni refus explicite dans la fiche de cette monture.</p>;
 return <section className={styles.notice} aria-label="Monture biologique" data-mount-panel={profile.id} data-mount-status={mount?'recruited':trial?trial.status:'none'}>
  <strong>Monture biologique · lien, fatigue, blessures</strong>
  <p>Aucun animal n’est attribué par défaut. Le BOND (0–100) progresse de {MOUNT_SESSION_GAIN_CAP_V153} points au plus par séance ; le lien ne fait pas tomber la fatigue ; les soins ne sont pas une réparation.</p>
  {expedition&&<MountExpeditionPortraitV153 path={expedition.portrait} name={profile.name}/>}
  <h4>Peurs et refus</h4>{reactions}
  {!mount&&profile.recruitment===null&&<p className={styles.tag} data-mount-recruitment="unavailable">Voie de recrutement non implémentée : {profile.acquisition}</p>}
  {!mount&&profile.recruitment==='trust-exercises'&&<div data-mount-recruitment="trust-exercises">
   <h4>{expedition?.title??'Recrutement : trois exercices de confiance'}</h4>
   <p>Source : « {profile.acquisition} »</p>
   {!expedition&&<p className={styles.hint}>Proposé : la quête « Premier lien » n’existe pas encore ; l’approche d’un jeune adulte au comptoir des Forges remplace sa capture. Le contenu des trois exercices est proposé.</p>}
   {conflict&&<p className={styles.hint}>Une autre approche est ouverte. Termine-la ou quitte-la dans sa fiche.</p>}
   {!trial&&<button type="button" data-mount-begin={profile.id} disabled={!can||!!conflict} onClick={()=>order({type:'begin-trial',mountId:profile.id})}>{expedition?'Ouvrir le parcours':'Approcher un jeune adulte'}</button>}
   {trial&&expedition&&<MountExpeditionRouteV153 expedition={expedition} trial={trial} can={can} eventId={eventId} order={order}/>}
   {trial&&!expedition&&<ol>{profile.trustExercises.map((ex,i)=>{const done=i<trial.passed.length,current=i===trial.passed.length&&trial.status==='open';return <li key={ex.id} data-trust-exercise={ex.id} data-trust-state={done?'passed':current?'current':'locked'}><strong>{ex.label}</strong> {done?'· réussi':current?'':'· à venir'}<br/><small className={styles.hint}>{ex.source}</small>{current&&<div className={styles.actions}>{ex.options.map(o=><button key={o.id} disabled={!can} onClick={()=>order({type:'trust-exercise',trialId:trial.id,exerciseId:ex.id,optionId:o.id,eventId})}>{o.label}</button>)}</div>}</li>;})}</ol>}
   {trial&&<>
    <p>Tentatives : {trial.attempts} · réussis : {trial.passed.length}/{profile.trustExercises.length}</p>
    <button type="button" disabled={!can} onClick={()=>order({type:'leave-trial',trialId:trial.id})}>Quitter l’approche</button>
   </>}
   {trial?.status==='complete'&&<>
    <div className={styles.actions}>
     <button disabled={!can} onClick={()=>order({type:'recruit',mountId:profile.id,trialId:trial.id})}>Confirmer le recrutement de {profile.name}</button>
     {profile.id==='kha_rha'&&<button type="button" data-mount-adoption={profile.id} disabled={!can||save.profile.clanMarks<KHA_RHA_ADOPTION_MARKS_V153} onClick={()=>order({type:'adopt',mountId:profile.id,trialId:trial.id,expectedCost:KHA_RHA_ADOPTION_MARKS_V153})}>Adopter à l’élevage · {KHA_RHA_ADOPTION_MARKS_V153} marques</button>}
    </div>
    {profile.id==='kha_rha'&&<>
     <p className={styles.hint}>L’adoption finance l’élevage des Forges. Le lien avec l’animal commence à zéro et se construit pendant les séances.</p>
     {save.profile.clanMarks<KHA_RHA_ADOPTION_MARKS_V153&&<p className={styles.hint}>Il manque {KHA_RHA_ADOPTION_MARKS_V153-save.profile.clanMarks} marques pour l’adoption.</p>}
    </>}
   </>}
  </div>}
  {mount&&<div data-mount-recruited={mount.id}>
   {mount.proof.adoptionMarks!==undefined&&<p data-mount-adoption-receipt={mount.proof.adoptionMarks}>Adopté à l’élevage des Forges · {mount.proof.adoptionMarks} marques</p>}
   <dl className={styles.metrics}><div><dt>BOND</dt><dd data-mount-bond={mount.bond}>{mount.bond} / 100</dd></div><div><dt>Fatigue</dt><dd data-mount-fatigue={mount.fatigue}>{mount.fatigue} / 100</dd></div><div><dt>Blessures</dt><dd data-mount-injury={mount.injury}>{mount.injury} / 100</dd></div><div><dt>Séances</dt><dd>{mount.sessions}</dd></div></dl>
   {!session?<div className={styles.actions}>
    <button disabled={!can||!!state.session} onClick={()=>order({type:'open-session',mountId:mount.id})}>Ouvrir une séance de lien</button>
    {(()=>{const refusal=mountRideRefusalV156(state,mount.id);const rides=save.mountRidesV156??createMountRidesV156(save.createdAt);return <button data-mount-ride-start={refusal?'refused':'ready'} title={refusal??undefined} disabled={!allowed||!onRideCommand||!!refusal||!!rides.active} onClick={()=>{if(!onRideCommand)return;const r=onRideCommand({type:'mount',mountId:mount.id,ownerCreatedAt:save.createdAt,expectedRevision:rides.revision});onMessage(r.message);}}>Monter · aire des convois</button>;})()}
    {(()=>{const cost=mountCareQuoteV153(state,mount.id);return <button disabled={!can||cost===null||save.profile.clanMarks<(cost??Infinity)} onClick={()=>order({type:'care',mountId:mount.id,expectedCost:cost!})}>{cost===null?'Soins / repos · inutiles':`Soigner / reposer · ${cost} marques`}</button>;})()}
   </div>:<div data-mount-session={session.id}>
    <p>Séance {session.id} · BOND gagné {session.gain}/{MOUNT_SESSION_GAIN_CAP_V153}</p>
    <label htmlFor="mount-condition">Conditions de l’exercice</label> <select id="mount-condition" value={condition} disabled={!can} onChange={(e:{target:{value:string}})=>setCondition(e.target.value as MountConditionV153)}>{MOUNT_CONDITIONS_V153.map(c=><option key={c} value={c}>{MOUNT_CONDITION_LABELS_V153[c]}</option>)}</select>
    <p className={styles.hint}>Proposé : les conditions sont choisies ici en attendant les zones réelles (MOB-010).</p>
    <div className={styles.actions}>{MOUNT_EXERCISES_V153.map(ex=>{const locked=mount.bond<ex.minBond;const refusal=locked?null:mountExerciseRefusalV153(mount,ex);return <button key={ex.id} data-mount-exercise={ex.id} disabled={!can||locked} title={refusal??undefined} onClick={()=>order({type:'exercise',sessionId:session.id,exerciseId:ex.id,condition,eventId})}>{ex.label}{locked?` · BOND ${ex.minBond} requis`:` · fatigue +${ex.fatigue}`}</button>;})}
     <button onClick={()=>order({type:'close-session',sessionId:session.id})} disabled={!can}>Clore la séance</button></div>
   </div>}
   {!session&&(()=>{const refusal=mountRideRefusalV156(state,mount.id);return <p className={styles.hint} data-mount-ride-refusal={refusal?'yes':'no'}>{refusal??'Prêt à être monté sur l’aire des convois.'} Seuil de monte : BOND {MOUNT_RIDE_MIN_BOND_V156} (seuil de monte repris des fiches V6).</p>;})()}
   {save.mountRidesV156?.lastReport?.mountId===mount.id&&(()=>{const r=save.mountRidesV156!.lastReport!;return <p className={styles.hint} data-mount-ride-report={r.result}>Dernière sortie montée : {r.result==='passed'?`circuit réussi · séance ${r.sessionId} · BOND +${r.bondGain}`:r.result==='recovered'?'ramené en main · aucun BOND':'retour sans circuit complet · aucun BOND'} · fatigue {r.fatigue} · blessures {r.injury} · {r.impacts} choc(s).</p>;})()}
   {state.lastSession?.mountId===mount.id&&<p className={styles.hint}>Dernière séance {state.lastSession.id} : {state.lastSession.outcome==='interrupted'?'interrompue':'close'} · BOND +{state.lastSession.gain}.</p>}
  </div>}
  {!onCommand&&<p className={styles.hint}>Écriture des montures indisponible dans cette vue.</p>}
 </section>;
}
