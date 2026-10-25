import {useId,useRef} from 'react';
import {HOMEWORLD_ARCHIVE_PLAQUE_V109 as b,HOMEWORLD_ARCHIVE_PLAQUE_ART_V109 as art,HOMEWORLD_ARCHIVE_PLAQUE_LINES_V109,type ArchivePlaqueIdV109} from './systems/homeworldArchivePlaqueDefinitionV109';
import type {HomeworldArchivePlaqueV109} from './systems/homeworldArchivePlaqueLedgerV109';
import type {ArchivePlaqueActionV109} from './systems/homeworldArchivePlaqueV109';
import styles from './HomeworldArchivePlaqueV109.module.css';

export function archivePlaqueObjectiveV109(ledger:HomeworldArchivePlaqueV109){
 const r=ledger.receipt;if(!r)return 'Rejoins le poste K-17 pour examiner la plaque et l’empreinte distincte.';
 if(r.phase==='completed')return 'Pièces conservées séparément ; auteur de l’empreinte et lien de lignée non établis.';
 if(r.phase==='interrupted')return r.failureSpoken&&!r.resumeSpoken?'Reviens à l’archiviste pour reprendre le bord manquant.':'Reprends au dernier point confirmé, avec les mêmes objets.';
 if(r.phase==='offer'||r.phase==='choice')return 'Choisis une approche puis écoute sa réponse.';
 if(r.phase==='ready')return r.ownerConsent?'Pars relever les deux objets à pied.':'Reçois l’accord avant de déplacer ces pièces locales.';
 if(r.phase==='return')return 'Rapporte à l’archiviste le constat obtenu à pied.';
 if(r.carrier)return 'Porte une seule pièce et son relevé vers sa surface séparée.';
 const missing=r.objects.slice(0,2).find(o=>o.place!=='support');if(missing)return 'Relève '+b.objects.find(d=>d.id===missing.id)!.label.toLowerCase()+', copie son lieu et porte-la sur sa surface.';
 if(r.option==='B')return 'Les deux traces sont séparées. Conserve ce constat à la surface de la plaque.';
 if(!r.edgeObserved)return 'Observe le bord réellement manquant sur la plaque déposée.';
 if(!r.mismatchObserved)return 'Compare les deux appuis sans déplacer ni forcer les pièces.';
 if(!r.failureSpoken)return 'Rapporte l’écart constaté à l’archiviste.';
 if(!r.resumeSpoken)return 'Interromps l’étude, puis reparle à l’archiviste pour la reprise.';
 if(r.objects[2].place!=='support')return 'Retrouve le fragment candidat, relève son lieu et garde-le séparé.';
 return r.fragmentCompared?'Conserve le constat à la surface de la plaque, puis reviens au poste.':'Examine le fragment candidat depuis la surface de la plaque.';
}
export function archivePlaqueNextTargetV109(ledger:HomeworldArchivePlaqueV109){
 const r=ledger.receipt;if(r?.phase==='interrupted')return r.failureSpoken&&!r.resumeSpoken?b.npcId:'archive-plaque-resume-v109';
 if(!r||['offer','choice','ready','return','completed'].includes(r.phase)||r.mismatchObserved&&!r.failureSpoken||r.failureSpoken&&!r.resumeSpoken)return b.npcId;
 if(r.carrier)return 'archive-plaque-support-'+r.carrier+'-v109';
 const first=r.objects.slice(0,2).find(o=>o.place!=='support');if(first)return 'archive-plaque-object-'+first.id+'-v109';
 if(r.resumeSpoken&&r.objects[2].place!=='support')return 'archive-plaque-object-fragment-v109';
 return 'archive-plaque-support-plaque-v109';
}
export function ArchivePlaqueNativePreviewV109({id}:{id:ArchivePlaqueIdV109}){const frame=art.frames[id],clipId=useId();return <span className={styles.preview}><svg viewBox={`0 0 ${frame.width} ${frame.height}`} role="img" aria-label={b.objects.find(o=>o.id===id)!.label}><defs><clipPath id={clipId}><rect width={frame.width} height={frame.height}/></clipPath></defs><g clipPath={`url(#${clipId})`}><image href={art.src} x={-frame.x} y={-frame.y} width={art.width} height={art.height}/></g></svg></span>;}
export function ArchivePlaqueMapV109({ledger}:{ledger:HomeworldArchivePlaqueV109}){const objects=ledger.receipt?.objects??b.objects.map(o=>({id:o.id,...o.origin,place:'source'}));return <svg viewBox="7440 5180 540 410" className={styles.map} role="img" aria-label="Poste K-17, pièces indépendantes et surfaces séparées du quai"><title>Étude locale K-17 · positions conservées</title>{b.supports.map(s=><g key={s.id}><rect x={s.x-27} y={s.y-14} width="54" height="28"/><text x={s.x} y={s.y+35} textAnchor="middle">{s.id==='plaque'?'Plaque':s.id==='trace'?'Empreinte':'Fragment'}</text></g>)}<circle cx={b.post.x} cy={b.post.y} r="10"/><text x={b.post.x+14} y={b.post.y+5}>Archiviste</text>{objects.map(o=>o.id==='fragment'&&!ledger.receipt?.resumeSpoken?null:<circle key={o.id} cx={o.x} cy={o.y} r="8" data-plaque-map-object-v109={o.id}><title>{`${b.objects.find(d=>d.id===o.id)!.label} · ${o.place}`}</title></circle>)}</svg>;}
export default function HomeworldArchivePlaqueV109({ledger,disabled,message,onAction,onClose}:{ledger:HomeworldArchivePlaqueV109;disabled:boolean;message:string;onAction(action:ArchivePlaqueActionV109,revision:number):boolean;onClose():void}){
 const ref=useRef<HTMLElement>(null),r=ledger.receipt,lastLine=HOMEWORLD_ARCHIVE_PLAQUE_LINES_V109.find(l=>l.id===r?.lineIds.at(-1));
 const act=(action:ArchivePlaqueActionV109,close=false)=>{ref.current?.focus({preventScroll:true});if(onAction(action,ledger.revision)&&close)onClose();};
 return <section ref={ref} tabIndex={-1} className={styles.scene} data-homeworld-plaque-scene-v109 data-plaque-phase-v109={r?.phase??'offer'}>
  <p>La plaque locale K-17 porte un nom de travail. L’empreinte voisine reste une autre pièce : sa présence ne suffit pas à attribuer ce passage à ce nom.</p>
  <ArchivePlaqueMapV109 ledger={ledger}/>
  {lastLine&&<article className={styles.line} data-plaque-source-line-v109={lastLine.id}><small>Dernier échange confirmé au poste</small><strong>{lastLine.speaker}</strong><p>{lastLine.text}</p></article>}
  <p>{archivePlaqueObjectiveV109(ledger)}</p>
  <div className={styles.objects}>{b.objects.filter(o=>o.id!=='fragment'||r?.resumeSpoken).map(d=>{const o=r?.objects.find(o=>o.id===d.id);return <article key={d.id} className={styles.object}><ArchivePlaqueNativePreviewV109 id={d.id}/><strong>{d.label}</strong><p>{o?.place==='support'?'Sur sa surface séparée':o?.place==='carried'?'Porté avec son relevé':o?.place==='ground'?'Conservé au sol':'Lieu à relever avant déplacement'}</p><p>{r?.observations.includes(d.id)?'Observé sur place':'Observation à faire'} · {r?.provenances.includes(d.id)?'Lieu copié':'Lieu non copié'}</p>{d.id==='fragment'&&<p>Candidat conservé à part ; aucune réparation certifiée.</p>}</article>;})}</div>
  <div className={styles.actions}>
   {r?.phase==='offer'&&<><button disabled={disabled} onClick={()=>act('choose-a')}>Chercher une preuve située · A</button><button disabled={disabled} onClick={()=>act('choose-b')}>Conserver les deux traces séparées · B</button></>}
   {r?.phase==='choice'&&<button disabled={disabled} onClick={()=>act('reply')}>Écouter l’archiviste</button>}
   {r?.phase==='ready'&&(!r.ownerConsent?<button disabled={disabled} onClick={()=>act('authorize')}>Recevoir l’accord pour les pièces K-17</button>:<button disabled={disabled} onClick={()=>act('start',true)}>Commencer l’étude à pied</button>)}
   {r?.phase==='working'&&r.mismatchObserved&&!r.failureSpoken&&<button disabled={disabled} onClick={()=>act('report-mismatch')}>Rapporter les appuis incompatibles</button>}
   {r?.phase==='working'&&r.failureSpoken&&!r.resumeSpoken&&<button disabled={disabled} onClick={()=>act('interrupt',true)}>Interrompre et garder les deux traces séparées</button>}
   {r?.phase==='interrupted'&&<button disabled={disabled} onClick={()=>act('resume')}>Reprendre l’étude conservée</button>}
   {r?.phase==='return'&&<button disabled={disabled} onClick={()=>act('report')}>Rapporter les pièces et le constat</button>}
   <button onClick={onClose}>Revenir au quai</button>
  </div>
  {message&&<p className={styles.message} role="status">{message}</p>}
  <details className={styles.source}><summary>Origine de cette étude</summary><p>Poste et objets locaux originaux, avec trois régions natives indépendantes d’un atlas transparent. K-17 est une désignation opérationnelle ; aucune personne canonique ni lignée ne lui est attribuée. Le fragment reste un candidat distinct et le bord n’est jamais déclaré réparé.</p><p>Le corps de l’archiviste réutilise les dessins existants. Aucun nouveau geste de main, de parole ou de manipulation du PNJ n’est certifié.</p><small>Scène de dialogue V6!383 · Choix788/789 · Répliques3183–3190</small></details>
 </section>;
}
export function HomeworldArchivePlaqueJournalV109({ledger,actor,blocked,writePaused,message,onAction,onRetry,onGuide}:{ledger:HomeworldArchivePlaqueV109;actor:{x:number;y:number};blocked:boolean;writePaused:boolean;message:string;onAction(action:ArchivePlaqueActionV109,revision:number):boolean;onRetry():void;onGuide(id:string):void}){
 const r=ledger.receipt;if(!r&&!writePaused)return null;
 return <aside className={styles.journal} aria-label="Carnet des pièces K-17" data-homeworld-plaque-journal-v109 data-plaque-phase-v109={r?.phase??'offer'}><strong>Étude K-17 · pièces séparées</strong><span>{archivePlaqueObjectiveV109(ledger)}</span>{r?.carrier&&<span>Pièce portée : {b.objects.find(o=>o.id===r.carrier)!.label}</span>}
  {r?.phase==='interrupted'&&!(r.failureSpoken&&!r.resumeSpoken)&&<button disabled={blocked||writePaused||Math.hypot(actor.x-r.last.x,actor.y-r.last.y)>4} onClick={()=>onAction('resume',ledger.revision)}>Reprendre l’étude ici</button>}
  {r?.phase==='interrupted'&&r.carrier&&<button disabled={blocked||writePaused} onClick={()=>onAction('park',ledger.revision)}>Poser la pièce au sol ici</button>}
  {r&&['working','return'].includes(r.phase)&&<button disabled={blocked||writePaused} onClick={()=>onAction('interrupt',ledger.revision)}>Interrompre et conserver les pièces</button>}
  {r&&r.phase!=='completed'&&<button disabled={blocked||writePaused} onClick={()=>onGuide(archivePlaqueNextTargetV109(ledger))}>Afficher le prochain repère à pied</button>}
  {writePaused&&<button onClick={onRetry}>Réessayer l’enregistrement K-17</button>}{message&&<span role="status">{message}</span>}
 </aside>;
}
