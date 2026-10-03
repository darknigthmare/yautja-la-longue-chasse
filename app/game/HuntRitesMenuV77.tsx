'use client';
import type {HuntRiteMenuSnapshotV77} from './systems/huntRitesRuntimeV77';
import type {HuntRiteActionV77} from './systems/ritesOfHuntV77';
import styles from './HuntRitesMenuV77.module.css';
export default function HuntRitesMenuV77({menu,onOpen,onClose,onAction}:{menu:HuntRiteMenuSnapshotV77|null;
  onOpen():void;onClose():void;onAction(action:HuntRiteActionV77):void}){
  if(!menu)return null;
  return <section className={styles.root} data-hunt-rites-v77 data-corpse-id={menu.corpseId} aria-label="Rites sur la proie vaincue">
    {!menu.open?<button type="button" onClick={onOpen}>Examiner la proie vaincue</button>:<>
      <header><strong>{menu.label}</strong><button type="button" onClick={onClose} aria-label="Fermer le menu rituel">×</button></header>
      <p className={styles.warning}>La chasse continue. Dégâts ou éloignement interrompent le geste.</p>
      {menu.operation?<div role="status"><span>Geste en cours · {Math.round(menu.operation.progress*100)} %</span><progress max={1} value={menu.operation.progress}/><button type="button" onClick={onClose}>Interrompre le geste</button></div>:<div className={styles.actions}>
        <button type="button" disabled={menu.analyzed} onClick={()=>onAction('analyze')}>Analyser · 1,4 s{menu.analyzed?' · fait':''}</button>
        <button type="button" disabled={menu.marked} onClick={()=>onAction('mark')}>Marquer · 1 s{menu.marked?' · fait':''}</button>
        <button type="button" onClick={()=>onAction('leave')}>Laisser sur place</button>
        <button type="button" onClick={()=>onAction('erase')}>Effacer la trace · 1,8 s</button>
        <button type="button" disabled title="Flaying Tool réellement acquis et animation dédiée indisponibles">Dépecer · verrouillé</button>
        <button type="button" disabled title="Dépeçage terminé, appui authoré et animation dédiée indisponibles">Suspendre · verrouillé</button>
      </div>}
      <small>{menu.witnessCount} témoin{menu.witnessCount===1?'':'s'} de la marque. Aucune prise ou découverte de bestiaire accordée.</small>
    </>}
  </section>;
}
