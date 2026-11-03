"use client";
import type {FieldSpecimenV112} from "./systems/harvestInventoryV112";
import styles from "./FieldPackV112.module.css";
export interface FieldPackV112Props {
  carried:FieldSpecimenV112[];
  nearby:Array<{item:FieldSpecimenV112;distance:number;canTake:boolean}>;
  canDrop:boolean;
  disabled?:boolean;
  onAction(action:"drop"|"take",id:string):void;
}
export default function FieldPackV112({carried,nearby,canDrop,disabled=false,onAction}:FieldPackV112Props){
  return <section className={styles.pack} aria-labelledby="field-pack-v112-title">
    <h3 id="field-pack-v112-title">Sac de terrain et dépôts</h3>
    <p>Une prise déposée reste à cet endroit. Seules les prises dans le sac vous accompagnent à l’extraction. Les parties prélevées ne repoussent pas sur les carcasses.</p>
    {!canDrop&&<p>Rejoignez un appui stable, terminez le geste en cours et déposez la carcasse portée avant de manipuler le sac.</p>}
    <h4>Dans le sac · {carried.length}</h4>
    {carried.length===0?<p>Le sac est vide.</p>:<ul>{carried.map(item=><li key={item.id}>
      <span><strong>{item.label}</strong><br/>{item.massKg.toFixed(1)} kg · {item.volumeUnits.toFixed(1)} volumes · intégrité {item.quality}/100</span>
      <button type="button" disabled={disabled||!canDrop} onClick={()=>onAction("drop",item.id)}>Déposer · {item.label}</button>
    </li>)}</ul>}
    <h4>Dépôts à proximité · {nearby.length}</h4>
    {nearby.length===0?<p>Aucun dépôt proche. Le repère SAC dans le monde indique où revenir.</p>:<ul>{nearby.map(({item,distance,canTake})=><li key={item.id}>
      <span><strong>{item.label}</strong><br/>{Math.round(distance)} pixels · {item.massKg.toFixed(1)} kg · intégrité {item.quality}/100</span>
      <button type="button" disabled={disabled||!canTake} onClick={()=>onAction("take",item.id)}>Reprendre · {item.label}</button>
      {!canTake&&<small>Approchez à portée, gardez un appui et libérez assez de masse et de volume dans le sac.</small>}
    </li>)}</ul>}
  </section>;
}
