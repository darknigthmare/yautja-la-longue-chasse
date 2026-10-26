import type {HomeworldArchivePlaqueV109 as PlaqueLedger} from './systems/homeworldArchivePlaqueLedgerV109';
import {ArchivePlaqueRecordsV110} from './HomeworldArchivePlaqueRecordV110';
import {HomeworldArchivePlaqueJournalV109} from './HomeworldArchivePlaqueV109';
import HomeworldArchivePlaqueV111 from './HomeworldArchivePlaqueV111';
import {HOMEWORLD_ARCHIVE_PLAQUE_LINES_V109,HOMEWORLD_ARCHIVE_PLAQUE_V109} from './systems/homeworldArchivePlaqueDefinitionV109';
import {archiveContinuationViewV111,archiveContinuationWalkedV111,type HomeworldArchiveContinuationV111} from './systems/homeworldArchiveContinuationLedgerV111';
import type {ArchiveContinuationActionV111} from './systems/homeworldArchiveContinuationV111';
import styles from './HomeworldArchivePlaqueV109.module.css';

function FirstArchiveRecordV111({base}:{base:PlaqueLedger}){
  const receipt=base.receipt,line=HOMEWORLD_ARCHIVE_PLAQUE_LINES_V109.find(value=>value.id===receipt?.lineIds.at(-1));
  return <details data-homeworld-first-archive-record-v111><summary>Premier constat conservé</summary>
    {line&&<article className={styles.line}><strong>{line.speaker}</strong><p>{line.text}</p></article>}
    <p>Ces relevés décrivent le premier constat différé, conservé avec ses deux surfaces séparées.</p>
    <ArchivePlaqueRecordsV110 ledger={base}/>
  </details>;
}

export default function HomeworldArchiveContinuationV111({ledger,base,disabled,message,onAction,onClose}:{base:PlaqueLedger;ledger:HomeworldArchiveContinuationV111;disabled:boolean;message:string;onAction(action:ArchiveContinuationActionV111,revision:number):boolean;onClose():void}){
  const r=ledger.receipt,view=archiveContinuationViewV111(ledger);
  if(r?.phase==='active'&&view)return <section data-homeworld-continuation-v111 data-continuation-phase-v111={view.receipt?.phase}>
    <p>Cette recherche reprend les deux pièces déjà déposées. Le premier constat différé reste conservé séparément.</p><p>Marche de cette continuation : {Math.floor(archiveContinuationWalkedV111(ledger))} unités. Le relevé détaillé conserve aussi la marche du premier constat.</p>
    <FirstArchiveRecordV111 base={base}/>
    <HomeworldArchivePlaqueV111 ledger={view} disabled={disabled} message={message} onClose={onClose}
      onAction={(action,revision)=>action!=='choose-b'&&revision===view.revision&&onAction(action,ledger.revision)}/>
  </section>;
  const line=HOMEWORLD_ARCHIVE_PLAQUE_LINES_V109.find(value=>value.id===(r?.lineIds.at(-1)??base.receipt?.lineIds.at(-1)));
  const act=(action:ArchiveContinuationActionV111,close=false)=>{if(!disabled&&onAction(action,ledger.revision)&&close)onClose();};
  return <section className={styles.scene} data-homeworld-continuation-v111 data-continuation-phase-v111={r?.phase??'available'}>
    <p>Tu avais choisi de conserver les deux traces pour l’instant. Elles restent sur leurs surfaces, avec leurs relevés. Tu peux maintenant demander une nouvelle recherche ; aucun dépôt n’est à recommencer.</p>
    {line&&<article className={styles.line}><strong>{line.speaker}</strong><p>{line.text}</p></article>}
    <FirstArchiveRecordV111 base={base}/>
    <div className={styles.actions}>
      {!r&&<button disabled={disabled} data-continuation-action-v111="open" onClick={()=>act('open')}>Reparler de l’étude différée</button>}
      {r?.phase==='offer'&&<button disabled={disabled} data-continuation-action-v111="choose-a" onClick={()=>act('choose-a')}>Poursuivre la recherche du bord manquant</button>}
      {r?.phase==='choice'&&<button disabled={disabled} data-continuation-action-v111="reply" onClick={()=>act('reply')}>Écouter la nouvelle approche</button>}
      {r?.phase==='ready'&&(!r.ownerConsent?<button disabled={disabled} data-continuation-action-v111="authorize" onClick={()=>act('authorize')}>Recevoir un nouvel accord pour l’étude</button>:<button disabled={disabled} data-continuation-action-v111="start" onClick={()=>act('start',true)}>Reprendre depuis les pièces conservées</button>)}
      <button onClick={onClose}>Revenir au quai</button>
    </div>
    {message&&<p role="status" className={styles.message}>{message}</p>}
  </section>;
}

export function HomeworldArchiveContinuationJournalV111({ledger,base,actor,actorInStudySpace,blocked,writePaused,message,onAction,onRetry,onGuide}:{base:PlaqueLedger;ledger:HomeworldArchiveContinuationV111;actor:{x:number;y:number};actorInStudySpace:boolean;blocked:boolean;writePaused:boolean;message:string;onAction(action:ArchiveContinuationActionV111,revision:number):boolean;onRetry():void;onGuide(id:string):void}){
  const r=ledger.receipt,view=archiveContinuationViewV111(ledger);
  if(r?.phase==='active'&&view)return <section data-homeworld-continuation-journal-v111>
    <p>Marche de cette nouvelle recherche : {Math.floor(archiveContinuationWalkedV111(ledger))} unités. Les fiches conservent aussi la marche du premier constat.</p>
    <FirstArchiveRecordV111 base={base}/>
    <HomeworldArchivePlaqueJournalV109 ledger={view} actor={actor} actorInStudySpace={actorInStudySpace} blocked={blocked} writePaused={writePaused} message={message}
      onAction={(action,revision)=>action!=='choose-b'&&revision===view.revision&&onAction(action,ledger.revision)} onRetry={onRetry} onGuide={onGuide}/>
  </section>;
  return <aside className={styles.journal} data-homeworld-continuation-journal-v111>
    <strong>Étude différée · deux traces conservées</strong>
    <FirstArchiveRecordV111 base={base}/>
    <span>Rejoins l’archiviste K-17 si tu souhaites poursuivre la recherche. Le premier constat et ses pièces restent conservés.</span>
    <button disabled={blocked||writePaused} onClick={()=>onGuide(HOMEWORLD_ARCHIVE_PLAQUE_V109.npcId)}>Rejoindre le poste K-17</button>
    {writePaused&&<button onClick={onRetry}>Réessayer l’enregistrement de la continuation</button>}
    {message&&<span role="status">{message}</span>}
  </aside>;
}
