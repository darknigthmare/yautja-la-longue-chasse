"use client";
import styles from "./HuntAccessibilityV112.module.css";
export default function HuntRitualMeterV112({progress,mode}:{progress:number;mode:"normal"|"generous"|"unlimited"}){
  const amount=Math.min(1,Math.max(0,Number.isFinite(progress)?progress:0));
  if(mode==="unlimited")return <div role="status" aria-label="Sans limite de temps par glyphe"><span className={styles.meter} aria-hidden="true"><span className={styles.meterFill} style={{width:"100%",background:"#bce8ca"}}/></span><small>Sans limite par glyphe</small></div>;
  return <span className={styles.meter} role="progressbar" aria-label={mode==="generous"?"Progression du glyphe · fenêtre large":"Progression du glyphe · fenêtre standard"} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(amount*100)}><span className={styles.meterFill} style={{width:Math.round(amount*100)+"%"}}/></span>;
}
