import type {HomeworldArrivalRecoveryPlanV111} from './systems/homeworldArrivalRecoveryV111';
import styles from './HomeworldArchivePlaqueV109.module.css';

export default function HomeworldArrivalRecoveryV111({plan,message,writeRefused,disabled,onPrepare,onConfirm,onClose}:{plan:HomeworldArrivalRecoveryPlanV111|null;message:string;writeRefused:boolean;disabled:boolean;onPrepare():void;onConfirm(key:string):void;onClose():void}){
  return <section className={styles.scene} data-homeworld-recovery-v111>
    <p>Une charge occupe le point extérieur conservé par cet ancien intérieur. Tu peux consulter le dernier point extérieur enregistré lors de la manutention.</p>
    {plan&&<>
      <p>Point conservé du quai : <strong>{Math.round(plan.to.x)}, {Math.round(plan.to.y)}</strong>.</p>
      <p>Restaurer ce point y remet ton personnage. L’ancien point intérieur et ses relevés seront conservés avec la restauration. Les charges et leurs propriétaires restent à leur place ; aucune marche, récompense ou étape de mission ne sera ajoutée.</p>
    </>}
    <div className={styles.actions}>
      {!plan&&<button disabled={disabled} data-recovery-action-v111="prepare" onClick={onPrepare}>Consulter le point extérieur conservé</button>}
      {plan&&<button disabled={disabled} data-recovery-action-v111={writeRefused?'retry':'confirm'} onClick={()=>onConfirm(plan.key)}>{writeRefused?'Réessayer la restauration':'Restaurer ce point extérieur'}</button>}
      <button data-recovery-action-v111="cancel" onClick={onClose}>Rester dans l’intérieur</button>
    </div>
    {message&&<p role="status" className={styles.message}>{message}</p>}
  </section>;
}
