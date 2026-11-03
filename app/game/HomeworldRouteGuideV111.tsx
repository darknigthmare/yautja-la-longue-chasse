import type {homeworldRouteGuidanceV109} from './systems/homeworldWayfindingV109';
import {homeworldWayfindingMetresV75} from './systems/homeworldWayfindingV75';
import styles from './HomeworldRouteGuideV111.module.css';

/** The guide remains a read-only aid. Arriving does not interact, resume a
 * receipt or move anything: the same mapped action still belongs to the player. */
export default function HomeworldRouteGuideV111({label,targetId,guidance,current,interactionShortcut,suspended,calculating=false,onRecalculate,onChange,onClear}:{
  label:string;targetId:string;guidance:NonNullable<ReturnType<typeof homeworldRouteGuidanceV109>>;current:boolean;
  interactionShortcut:string;suspended:boolean;calculating?:boolean;onRecalculate():void;onChange():void;onClear():void;
}){
  const waypoint='waypoint' in guidance?guidance.waypoint:undefined;
  const arrived=guidance.state==='arrived'&&current&&!suspended&&!calculating;
  const status=suspended?'Repère suspendu':calculating?'Calcul du passage en cours…':!current?'Trajet à recalculer':arrived?'À portée':guidance.stage?.interiorId?'Dans la salle':`À pied · étage ${guidance.stage?.levelId??'?'}`;
  return <aside className={styles.guide} aria-label="Itinéraire à pied dans la cité"
    data-homeworld-route-guide-v98={guidance.state} data-homeworld-route-guide-v109={guidance.state} data-homeworld-route-guide-v111={guidance.state}
    data-homeworld-route-target-v98={targetId} data-homeworld-route-paused-v98={suspended} data-homeworld-route-current-v109={current}
    data-homeworld-route-next-x-v109={waypoint?.x} data-homeworld-route-next-y-v109={waypoint?.y} data-homeworld-guide-compact-v111={arrived}>
    <div className={styles.heading}><small>{status}</small><strong title={label}>{label}</strong>
      {!arrived&&<p className={styles.direction}>{suspended?'Reprends la marche pour suivre ce repère.':calculating?'Patiente pendant le calcul du passage.':!current?'Recalcule ce trajet avant de le suivre.':guidance.direction}{current&&!suspended&&!calculating&&guidance.state!=='off-route'&&<span> · {homeworldWayfindingMetresV75(guidance.remaining)} m</span>}</p>}
    </div>
    {arrived&&<kbd className={styles.shortcut} aria-label={`Interagir sur place : ${interactionShortcut}`}>{interactionShortcut}</kbd>}
    <details className={styles.options} data-homeworld-guide-options-v111>
      <summary aria-label="Options de l’itinéraire" title="Options de l’itinéraire">⋯</summary>
      <div className={styles.panel}>
        <strong>{label}</strong><p>{!current?'Le lieu ou les charges ont changé. Recalcule depuis ta position actuelle.':guidance.instruction}</p>
        {arrived&&<p>Interagis sur place avec <kbd>{interactionShortcut}</kbd>. Le guide ne valide aucune action à ta place.</p>}
        <div className={styles.actions}><button type="button" disabled={suspended||calculating} onClick={onRecalculate}>Recalculer</button><button type="button" disabled={suspended} onClick={onChange}>Carte</button></div>
      </div>
    </details>
    <button type="button" className={styles.clear} disabled={suspended} aria-label="Effacer l’itinéraire à pied" onClick={onClear}>×</button>
  </aside>;
}
