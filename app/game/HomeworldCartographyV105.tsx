'use client';
import {useRef,useState} from 'react';
import HomeworldCartographyV104 from './HomeworldCartographyV104';
import YautjaTranslationV67 from './YautjaTranslationV67';
import {HOMEWORLD_CARTOGRAPHY_V105 as b,HOMEWORLD_CARTOGRAPHY_LINES_V105 as lines,HOMEWORLD_CARTOGRAPHY_OPTION_V105 as option,cartographyBearingsV105} from './systems/homeworldCartographyDefinitionV105';
import type {HomeworldCartographyLedgerV104} from './systems/homeworldCartographyLedgerV104';
import type {HomeworldCartographyLedgerV105} from './systems/homeworldCartographyLedgerV105';
import type {CartographyActionV104} from './systems/homeworldCartographyV104';
import type {CartographyActionV105} from './systems/homeworldCartographyV105';
import styles from './HomeworldCartographyV104.module.css';

export function HomeworldCartographyObservationV105({ledger,disabled,message,onAction,onClose,reducedMotion=false}:{ledger:HomeworldCartographyLedgerV105|undefined;disabled:boolean;message:string;onAction(action:CartographyActionV105,revision:number):boolean;onClose():void;reducedMotion?:boolean}){
 const focusRef=useRef<HTMLElement>(null),r=ledger?.receipt;
 const submit=(action:CartographyActionV105)=>{
  // A compared marker removes its button. Keep focus inside this same modal
  // before React replaces that control, so the city does not infer a blur.
  focusRef.current?.focus({preventScroll:true});return onAction(action,ledger?.revision??0);
 };
 const bearings=cartographyBearingsV105();
 return <section ref={focusRef} tabIndex={-1} className={styles.scene} data-cartography-observation-v105 data-cartography-phase={r?.phase??'absent'}>
  <p className={styles.eyebrow}>Point haut du viaduc · Terrasse +1</p>
  <p>Compare les positions des deux objets déjà connus de la cour du registre. Ce schéma mesure leur direction et leur distance depuis ta position d’observation.</p>
  <svg className={styles.map} viewBox="5950 3330 780 2050" role="img" aria-label="Schéma des deux repères connus depuis le viaduc. Aucun terrain inconnu n’est représenté.">
   <title>Viaduc, bac de basalte et lampe du registre</title>
   <circle cx={b.highPoint.x} cy={b.highPoint.y} r="48" style={{strokeWidth:8}}/><text x="6000" y="3620" style={{fontSize:140}}>Viaduc +1</text>
   {bearings.map((p,i)=><g key={p.id} data-cartography-known-object={p.id}><polyline style={{strokeWidth:12}} points={`${b.highPoint.x},${b.highPoint.y} ${p.x},${p.y}`}/><circle cx={p.x} cy={p.y} r="48" style={{strokeWidth:8}} data-reached={(r?.compared??0)>=(i===0?1:3)}/><text x={p.x+85} y={p.y+50} style={{fontSize:160}}>{i+1}</text></g>)}
  </svg>
  {bearings.map((p,i)=><p key={p.id}><strong>{i+1} · {p.label}</strong> — direction {p.bearing}°, distance {p.distance} unités. {(r?.compared??0)>=(i===0?1:3)?'Comparé.':'À comparer.'}</p>)}
  <div className={styles.actions}>
   {r?.phase==='observing'&&r.compared===0&&<button disabled={disabled} onClick={()=>submit('compare-first')}>Comparer le bac de basalte</button>}
   {r?.phase==='observing'&&r.compared===1&&<button disabled={disabled} onClick={()=>submit('compare-second')}>Comparer la lampe du registre</button>}
   {r?.phase==='observing'&&r.compared===3&&<button disabled={disabled} onClick={()=>{if(submit('date'))onClose();}}>Dater l’observation et reprendre le chemin</button>}
   <button onClick={onClose}>Revenir au viaduc</button>
  </div>
  {r?.observedAt&&<p>Observation conservée : <time dateTime={r.observedAt}>{r.observedAt.replace('T',' ').replace('.000Z',' UTC')}</time>.</p>}
  {r?.phase==='interrupted'&&<SourceLine kind="REPRISE" disabled={disabled} reducedMotion={reducedMotion}/>}
  {message&&<p className={styles.feedback} role="status">{message}</p>}
  <p className={styles.note}>Seuls ces deux repères sont consignés. Les secteurs non observés restent inconnus.</p>
 </section>;
}

function SourceLine({kind,disabled,reducedMotion}:{kind:string;disabled:boolean;reducedMotion:boolean}){
 const line=lines.find(l=>l.kind===kind&&(l.option==='A'||kind!=='CHOIX'&&kind!=='REPONSE'));
 return line?<article className={styles.line} data-cartography-source-line={line.id}><strong>{line.speaker}</strong><YautjaTranslationV67 text={line.text} paused={disabled} reducedMotion={reducedMotion}/></article>:null;
}
export default function HomeworldCartographyV105({ledger,legacy,disabled,message,legacyMessage,onAction,onLegacyAction,onClose,reducedMotion=false}:{
 ledger:HomeworldCartographyLedgerV105|undefined;legacy:HomeworldCartographyLedgerV104|undefined;disabled:boolean;message:string;legacyMessage:string;
 onAction(action:CartographyActionV105,revision:number):boolean;onLegacyAction(action:CartographyActionV104,revision:number):boolean;onClose():void;reducedMotion?:boolean;
}){
 const[showSource,setShowSource]=useState(false),focusRef=useRef<HTMLElement>(null),r=ledger?.receipt;
 if((!r||r.phase==='completed')&&legacy?.receipt&&legacy.receipt.phase!=='completed')return <HomeworldCartographyV104 ledger={legacy} disabled={disabled} message={legacyMessage} onAction={onLegacyAction} onClose={onClose} reducedMotion={reducedMotion} highPointCompleted={r?.phase==='completed'}/>;
 const submit=(action:CartographyActionV105)=>{focusRef.current?.focus({preventScroll:true});return onAction(action,ledger?.revision??0);};
 return <section ref={focusRef} tabIndex={-1} className={styles.scene} data-cartography-scene-v105={b.sceneId} data-cartography-phase={r?.phase??'offer'}>
  <p className={styles.eyebrow}>Cartographe du registre · Relevé depuis le point haut</p>
  <p>Le viaduc public de la terrasse surplombe les deux repères connus du registre. Rejoins l’escalier du Conseil, traverse le viaduc, compare le bac et la lampe au point haut, puis date l’observation avant de revenir au pupitre.</p>
  {r&&<SourceLine kind={r.phase==='choice'?'CHOIX':r.phase==='completed'?'SUCCES':r.phase==='interrupted'?'REPRISE':'REPONSE'} disabled={disabled} reducedMotion={reducedMotion}/>}
  <div className={styles.actions}>
   {!r&&<button disabled={disabled} onClick={()=>submit('choose-a')}>{legacy?.receipt?'Ouvrir un nouveau relevé depuis le point haut':'Compléter le relevé depuis le point haut'}</button>}
   {r?.phase==='choice'&&<button disabled={disabled} onClick={()=>submit('reply')}>Écouter le cartographe</button>}
   {r?.phase==='ready'&&<button disabled={disabled} onClick={()=>{if(submit('start'))onClose();}}>Partir à pied vers l’escalier du Conseil</button>}
   {r?.phase==='return'&&<button disabled={disabled} onClick={()=>submit('report')}>Présenter le relevé daté</button>}
   {r&&r.phase!=='completed'&&<button onClick={onClose}>Revenir à la cour</button>}
  </div>
  {r?.observedAt&&<p>Observation conservée : <time dateTime={r.observedAt}>{r.observedAt.replace('T',' ').replace('Z',' UTC')}</time>. Les deux repères ont été comparés sur place.</p>}
  {r&&['walking','observing','interrupted'].includes(r.phase)&&<p>Ton carnet conserve le dernier point confirmé. Reprends le parcours depuis ce point, au même étage.</p>}
  {message&&<p className={styles.feedback} role="status">{message}</p>}
  <button aria-expanded={showSource} onClick={()=>setShowSource(v=>!v)}>Origine du relevé depuis le point haut</button>
  {showSource&&<aside className={styles.source}><strong>Scène originale V6 · cartographe</strong><p>{option.action}</p><p>{option.address} · Scènes de dialogue V6!A392:Q392</p><p>Le parcours utilise le viaduc public existant de cette cité. La crête de l’ouverture originale n’est pas représentée ici. Les repères non vus restent inconnus.</p></aside>}
  {(!r||r.phase==='completed')&&<HomeworldCartographyV104 ledger={legacy} disabled={disabled} message={legacyMessage} onAction={onLegacyAction} onClose={onClose} reducedMotion={reducedMotion} highPointCompleted={r?.phase==='completed'}/>}
 </section>;
}

export function HomeworldCartographyJournalV105({ledger,blocked,message,writePaused,onResume,onRetry,onObserve,canObserve}:{ledger:HomeworldCartographyLedgerV105|undefined;blocked:boolean;message:string;writePaused:boolean;onResume():void;onRetry():void;onObserve():void;canObserve:boolean}){
 const r=ledger?.receipt,walking=r&&['walking','observing','return','interrupted'].includes(r.phase);
 if(!walking&&!writePaused)return null;
 const phase=r?.phase==='interrupted'?r.resumePhase:r?.phase;
 const instruction=phase==='return'?'Reviens par le viaduc, redescends l’escalier du Conseil, puis rejoins le pupitre du registre.':phase==='observing'?'Au point haut, compare les deux repères puis date le relevé.':r?.last.levelId==='+1'?'Suis le viaduc vers le sud-est jusqu’au point d’observation (6580,3440).':'Rejoins le pied de l’escalier du Conseil (4500,2900), puis monte vers la terrasse +1.';
 return <aside className={styles.journal} aria-label="Carnet du relevé depuis le point haut" data-cartography-journal-v105 data-cartography-status={r?.phase??'offer'}>
  <strong>{walking?r.phase==='interrupted'?'Relevé interrompu':'Relevé depuis le point haut':'Enregistrement du relevé suspendu'}</strong>
  {walking&&<><span>{instruction}</span><span>Dernier point confirmé : {Math.round(r.last.x)}, {Math.round(r.last.y)} · étage {r.last.levelId}. Deux repères comparés : {r.compared===3?2:r.compared}/2.</span></>}
  {r?.phase==='interrupted'&&<button disabled={blocked} onClick={onResume}>Reprendre au dernier point confirmé</button>}
  {r?.phase==='observing'&&<button disabled={blocked||!canObserve} onClick={onObserve}>Comparer les repères depuis le viaduc</button>}
  {writePaused&&<button onClick={onRetry}>Réessayer l’enregistrement du point haut</button>}
  {message&&<span role="status">{message}</span>}
 </aside>;
}
