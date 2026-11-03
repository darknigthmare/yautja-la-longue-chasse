import {useRef} from 'react';
import {HOMEWORLD_ARCHIVE_PLAQUE_V109 as b,HOMEWORLD_ARCHIVE_PLAQUE_LINES_V109} from './systems/homeworldArchivePlaqueDefinitionV109';
import type {HomeworldArchivePlaqueV109} from './systems/homeworldArchivePlaqueLedgerV109';
import type {ArchivePlaqueActionV109} from './systems/homeworldArchivePlaqueV109';
import {archivePlaqueObjectiveV109,ArchivePlaqueMapV109,ArchivePlaqueNativePreviewV109} from './HomeworldArchivePlaqueV109';
import {ArchivePlaqueProvenanceV110} from './HomeworldArchivePlaqueRecordV110';
import styles from './HomeworldArchivePlaqueV109.module.css';

export default function HomeworldArchivePlaqueV111({ledger,disabled,message,onAction,onClose}:{ledger:HomeworldArchivePlaqueV109;disabled:boolean;message:string;onAction(action:ArchivePlaqueActionV109,revision:number):boolean;onClose():void}){
 const ref=useRef<HTMLElement>(null),r=ledger.receipt,lastLine=HOMEWORLD_ARCHIVE_PLAQUE_LINES_V109.find(l=>l.id===r?.lineIds.at(-1));
 const act=(action:ArchivePlaqueActionV109,close=false)=>{ref.current?.focus({preventScroll:true});if(onAction(action,ledger.revision)&&close)onClose();};
 return <section ref={ref} tabIndex={-1} className={styles.scene} data-homeworld-plaque-scene-v109 data-plaque-phase-v109={r?.phase??'offer'}>
  <p>La plaque locale K-17 porte un nom de travail. L’empreinte voisine reste une autre pièce : sa présence ne suffit pas à attribuer ce passage à ce nom.</p>
  <ArchivePlaqueMapV109 ledger={ledger}/>
  {lastLine&&<article className={styles.line} data-plaque-source-line-v109={lastLine.id}><small>Dernier échange confirmé au poste</small><strong>{lastLine.speaker}</strong><p>{lastLine.text}</p></article>}
  <p>{archivePlaqueObjectiveV109(ledger)}</p>
  <div className={styles.objects}>{b.objects.filter(o=>o.id!=='fragment'||r?.resumeSpoken).map(d=><article key={d.id} className={styles.object}><ArchivePlaqueNativePreviewV109 id={d.id}/><strong>{d.label}</strong><ArchivePlaqueProvenanceV110 ledger={ledger} id={d.id}/>{d.id==='fragment'&&<p>Candidat conservé à part ; aucune réparation certifiée.</p>}</article>)}</div>
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
  <details className={styles.source}><summary>Origine de cette étude</summary><p>Les pièces K-17 appartiennent à ce poste. Les dossiers A/B et le contenant C de l’autre archiviste restent des études distinctes : leurs dépôts ne déplacent aucune pièce K-17.</p><p>Poste et objets locaux originaux, avec trois régions natives indépendantes d’un atlas transparent. K-17 est une désignation opérationnelle ; aucune personne canonique ni lignée ne lui est attribuée. Le fragment reste un candidat distinct et le bord n’est jamais déclaré réparé.</p><p>Quatre dessins natifs de discussion ont été réalisés pour l’archiviste : écoute, explication, désignation des surfaces séparées et conclusion. Ils gardent une seule orientation et ne montrent aucune marche ni manipulation d’objet par le PNJ.</p><small>Scène de dialogue V6!383 · Choix788/789 · Répliques3183–3190</small></details>
 </section>;
}
