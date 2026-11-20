"use client";
import {useState} from 'react';
import type {SaveGame} from './types';
import {
  createMountsV153, mountProfileV153, mountCareQuoteV153, mountExerciseRefusalV153,
  MOUNT_EXERCISES_V153, MOUNT_CONDITIONS_V153, MOUNT_CONDITION_LABELS_V153, MOUNT_SESSION_GAIN_CAP_V153,
  type MountConditionV153, type MountOrderV153, type MountWriterV153,
} from './systems/mobility/mountsV153';
import styles from './MobilityGarage.module.css';

export interface MobilityMountsV153Props {save:SaveGame;mountId:string;allowed:boolean;onCommand?:MountWriterV153;onMessage:(message:string)=>void}

/** MOB-012 : recrutement explicite, séances de lien, peur, fatigue, blessures et soins d'une monture. */
export default function MobilityMountsV153({save,mountId,allowed,onCommand,onMessage}:MobilityMountsV153Props){
 const [condition,setCondition]=useState<MountConditionV153>('calm');
 const profile=mountProfileV153(mountId);
 if(!profile)return null;
 const state=save.mountsV153??createMountsV153(save.createdAt);
 const can=allowed&&!!onCommand;
 // Identifiant d'événement : la révision confirmée est unique et croissante.
 const eventId=`ev-r${state.revision}`;
 const order=(action:MountOrderV153)=>{if(!can||!onCommand)return;const r=onCommand({...action,ownerCreatedAt:save.createdAt,expectedRevision:state.revision} as Parameters<MountWriterV153>[0]);onMessage(r.message);};
 const mount=state.mounts.find(m=>m.id===profile.id);
 const trial=state.trial?.mountId===profile.id?state.trial:null;
 const session=state.session?.mountId===profile.id?state.session:null;
 const reactions=profile.reactions.length?<ul>{profile.reactions.map(r=><li key={r.trigger}>« {r.source} » → {r.reaction==='panic'?'panique':'refus'}{r.bondBelow!==null?` sous BOND ${r.bondBelow}`:''}{r.repeated!==null?` à la ${r.repeated}e exposition de la séance`:''}. <span className={styles.hint}>Proposé : {r.proposed}</span></li>)}</ul>:<p className={styles.hint}>Aucune peur ni refus explicite dans la fiche de cette monture.</p>;
 return <section className={styles.notice} aria-label="Monture biologique" data-mount-panel={profile.id} data-mount-status={mount?'recruited':trial?trial.status:'none'}>
  <strong>Monture biologique · lien, fatigue, blessures</strong>
  <p>Aucun animal n’est attribué par défaut. Le BOND (0–100) progresse de {MOUNT_SESSION_GAIN_CAP_V153} points au plus par séance ; le lien ne fait pas tomber la fatigue ; les soins ne sont pas une réparation.</p>
  <h4>Peurs et refus</h4>{reactions}
  {!mount&&profile.recruitment===null&&<p className={styles.tag} data-mount-recruitment="unavailable">Voie de recrutement non implémentée : {profile.acquisition}</p>}
  {!mount&&profile.recruitment==='trust-exercises'&&<div data-mount-recruitment="trust-exercises">
   <h4>Recrutement : trois exercices de confiance</h4>
   <p>Source : « {profile.acquisition} »</p>
   <p className={styles.hint}>Proposé : la quête « Premier lien » n’existe pas encore ; l’approche d’un jeune adulte au comptoir des Forges remplace sa capture. Le contenu des trois exercices est proposé.</p>
   {!trial&&<button disabled={!can} onClick={()=>order({type:'begin-trial',mountId:profile.id})}>Approcher un jeune adulte</button>}
   {trial&&<ol>{profile.trustExercises.map((ex,i)=>{const done=i<trial.passed.length,current=i===trial.passed.length&&trial.status==='open';return <li key={ex.id} data-trust-exercise={ex.id} data-trust-state={done?'passed':current?'current':'locked'}><strong>{ex.label}</strong> {done?'· réussi':current?'':'· à venir'}<br/><small className={styles.hint}>{ex.source}</small>{current&&<div className={styles.actions}>{ex.options.map(o=><button key={o.id} disabled={!can} onClick={()=>order({type:'trust-exercise',trialId:trial.id,exerciseId:ex.id,optionId:o.id,eventId})}>{o.label}</button>)}</div>}</li>;})}</ol>}
   {trial&&<p>Tentatives : {trial.attempts} · réussis : {trial.passed.length}/{profile.trustExercises.length}</p>}
   {trial?.status==='complete'&&<button disabled={!can} onClick={()=>order({type:'recruit',mountId:profile.id,trialId:trial.id})}>Confirmer le recrutement de {profile.name}</button>}
  </div>}
  {mount&&<div data-mount-recruited={mount.id}>
   <dl className={styles.metrics}><div><dt>BOND</dt><dd data-mount-bond={mount.bond}>{mount.bond} / 100</dd></div><div><dt>Fatigue</dt><dd data-mount-fatigue={mount.fatigue}>{mount.fatigue} / 100</dd></div><div><dt>Blessures</dt><dd data-mount-injury={mount.injury}>{mount.injury} / 100</dd></div><div><dt>Séances</dt><dd>{mount.sessions}</dd></div></dl>
   {!session?<div className={styles.actions}>
    <button disabled={!can||!!state.session} onClick={()=>order({type:'open-session',mountId:mount.id})}>Ouvrir une séance de lien</button>
    {(()=>{const cost=mountCareQuoteV153(state,mount.id);return <button disabled={!can||cost===null||save.profile.clanMarks<(cost??Infinity)} onClick={()=>order({type:'care',mountId:mount.id,expectedCost:cost!})}>{cost===null?'Soins / repos · inutiles':`Soigner / reposer · ${cost} marques`}</button>;})()}
   </div>:<div data-mount-session={session.id}>
    <p>Séance {session.id} · BOND gagné {session.gain}/{MOUNT_SESSION_GAIN_CAP_V153}</p>
    <label htmlFor="mount-condition">Conditions de l’exercice</label> <select id="mount-condition" value={condition} disabled={!can} onChange={(e:{target:{value:string}})=>setCondition(e.target.value as MountConditionV153)}>{MOUNT_CONDITIONS_V153.map(c=><option key={c} value={c}>{MOUNT_CONDITION_LABELS_V153[c]}</option>)}</select>
    <p className={styles.hint}>Proposé : les conditions sont choisies ici en attendant les zones réelles (MOB-010).</p>
    <div className={styles.actions}>{MOUNT_EXERCISES_V153.map(ex=>{const locked=mount.bond<ex.minBond;const refusal=locked?null:mountExerciseRefusalV153(mount,ex);return <button key={ex.id} data-mount-exercise={ex.id} disabled={!can||locked} title={refusal??undefined} onClick={()=>order({type:'exercise',sessionId:session.id,exerciseId:ex.id,condition,eventId})}>{ex.label}{locked?` · BOND ${ex.minBond} requis`:` · fatigue +${ex.fatigue}`}</button>;})}
     <button onClick={()=>order({type:'close-session',sessionId:session.id})} disabled={!can}>Clore la séance</button></div>
   </div>}
   {state.lastSession?.mountId===mount.id&&<p className={styles.hint}>Dernière séance {state.lastSession.id} : {state.lastSession.outcome==='interrupted'?'interrompue':'close'} · BOND +{state.lastSession.gain}.</p>}
  </div>}
  {!onCommand&&<p className={styles.hint}>Écriture des montures indisponible dans cette vue.</p>}
 </section>;
}
