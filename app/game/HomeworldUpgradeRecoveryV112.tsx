import type {HomeworldGeometryRecoveryPlanV112} from './systems/homeworldGeometryRecoveryV112';
import {homeworldWayfindingMetresV75} from './systems/homeworldWayfindingV75';
import styles from './HomeworldUpgradeRecoveryV112.module.css';

const labels:Record<string,string>={cartographyV104:'Liaison du port',cartographyV105:'Relevé du viaduc',archiveV106:'Dossiers séparés',archiveComparisonV107:'Étude du contenant C',cargoV108:'Manutention du quai',archivePlaqueV109:'Étude K-17',archiveContinuationV111:'Continuation K-17'};

/** A new local geometry migration requires an explicit player confirmation.
 * This preview never claims walking or a formerly recorded safe position. */
export default function HomeworldUpgradeRecoveryV112({plan,message,writeRefused,disabled,onPrepare,onConfirm,onCancel}:{
  plan:HomeworldGeometryRecoveryPlanV112|null;message:string;writeRefused:boolean;disabled:boolean;
  onPrepare():void;onConfirm(key:string):void;onCancel():void;
}){
  return <section role="region" aria-label="Restauration après le nouvel aménagement" data-homeworld-upgrade-recovery-v112 className={styles.panel}>
    <header className={styles.heading}><small>La cité a été réaménagée</small><strong>Retrouver un point libre</strong></header>
    <div className={styles.body}>
      <p>Du mobilier occupe un ancien point ou une pièce. La partie reste en pause. Un point libre est proposé à moins de {homeworldWayfindingMetresV75(96)} mètres de chaque emplacement obstrué.</p>
      {plan&&<>
        <p>{plan.movesActor?'Ton personnage rejoint le point libre proposé, à côté du mobilier.':'Ton personnage reste à sa position actuelle. Seuls les points de reprise ou pièces obstrués sont restaurés.'}</p>
        <details className={styles.details}><summary>{plan.migrations.length} élément{plan.migrations.length>1?'s':''} à restaurer</summary>
          <ul>{plan.migrations.map((item,index)=><li key={index} data-upgrade-recovery-from-v112={`${item.from.x},${item.from.y}`} data-upgrade-recovery-to-v112={`${item.to.x},${item.to.y}`}>
            <strong>{item.kind==='checkpoint'?'Personnage':item.kind==='ground-object'?'Pièce au sol':'Point de reprise'}{item.ledgerKey?' · '+labels[item.ledgerKey]:''}</strong>
            <span>À {homeworldWayfindingMetresV75(Math.hypot(item.to.x-item.from.x,item.to.y-item.from.y))} mètres, à côté du mobilier.</span>
          </li>)}</ul>
          <p>Les pièces portées liées à un point de reprise le suivent. Aucun autre objet n’est déplacé.</p>
        </details>
        <p>Le point de sauvegarde et les documents seront copiés exactement. Tes provenances, accords et distances sont conservés ; aucune récompense n’est ajoutée.</p>
      </>}
      <p className={styles.note}>Le point proposé est nouveau : cette restauration ne comptera pas comme une marche. Les études se reprennent ensuite volontairement.</p>
      {message&&<p role="status" className={styles.status}>{message}</p>}
    </div>
    <div className={styles.actions}>
      {!plan&&<button type="button" disabled={disabled} data-upgrade-recovery-action-v112="prepare" onClick={onPrepare}>Consulter la restauration locale</button>}
      {plan&&<button type="button" disabled={disabled} data-upgrade-recovery-action-v112={writeRefused?'retry':'confirm'} onClick={()=>onConfirm(plan.key)}>{writeRefused?'Réessayer la restauration':'Restaurer à côté du mobilier'}</button>}
      <button type="button" className={styles.secondary} disabled={disabled} data-upgrade-recovery-action-v112="cancel" onClick={onCancel}>Conserver la partie en pause</button>
    </div>
  </section>;
}
