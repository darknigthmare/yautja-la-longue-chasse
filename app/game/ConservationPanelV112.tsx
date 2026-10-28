"use client";
import {useState} from "react";
import type {PlayerInventory} from "./types";
import {enemyV7ForId} from "./enemyRosterV7";
import {ecologyV8EnemyForId} from "./ecologyV8";
import {CONSERVATION_STEPS_V112,HARVEST_DEPOT_LIMIT_V112,SPECIMEN_STAGE_LABELS_V112,
  harvestInventoryForV112,flayingToolWorkMultiplierV112,type FieldSpecimenV112} from "./systems/harvestInventoryV112";
import styles from "./ConservationPanelV112.module.css";

export type ConservationPanelActionV112 = "start" | "work" | "repair" | "archive";
export interface ConservationPanelV112Props {
  inventory: PlayerInventory;
  clanMarks: number;
  disabled?: boolean;
  onAction(action:ConservationPanelActionV112,id:string):{ok:boolean;message:string};
}
const LEGACY_PREY_LABELS_V112:Readonly<Record<string,string>>=Object.freeze({
  "rifle-soldier":"Garde armé","scout":"Éclaireur","heavy":"Garde lourd",
  "cryostalker-runner":"Cryostalker coureur","cryostalker-brute":"Cryostalker brute",
  "razor-hound":"Limier rasoir","bad-blood-initiate":"Initié Bad Blood",
});
const speciesLabelV112=(id:string)=>ecologyV8EnemyForId(id)?.name??enemyV7ForId(id)?.name??LEGACY_PREY_LABELS_V112[id]??"Proie de terrain";
function SpecimenGlyphV112({item}:{item:FieldSpecimenV112}) {
  const shape=item.partId.includes("hide")?"M18 8 28 15 38 8 44 25 38 48 18 48 12 25Z":
    item.partId.includes("tissue")?"M28 9C4 13 12 48 28 48C45 46 52 14 28 9Z":"M19 9C6 3 4 19 15 23L24 35C14 46 29 55 34 43L37 30C51 24 43 11 33 18Z";
  return <svg className={styles.glyph} viewBox="0 0 56 56" aria-hidden="true">
    <path d={shape} fill="currentColor" opacity=".3" stroke="currentColor" strokeWidth="2"/>
    <path d="M18 29h20M28 18v23" stroke="currentColor" strokeWidth="2"/>
    {item.stage==="mounted"&&<path d="M8 3h40v50H8Z" fill="none" stroke="currentColor"/>}
  </svg>;
}
export default function ConservationPanelV112({inventory,clanMarks,disabled=false,onAction}:ConservationPanelV112Props) {
  const [feedback,setFeedback]=useState("");
  const ledger=harvestInventoryForV112(inventory),owned=inventory.fieldToolIds.includes("flaying-tool");
  const act=(action:ConservationPanelActionV112,id:string)=> {
    if(disabled)return;
    const result=onAction(action,id);setFeedback(result.message);
  };
  return <section className={styles.panel} aria-labelledby="conservation-v112-title">
    <div className={styles.header}><div><p>Atelier de terrain // Conservation</p>
      <h2 id="conservation-v112-title">Préserver les prises</h2>
      <p>Nettoyage, traitement, séchage puis montage. Chaque geste compte seulement après son enregistrement. Aucun travail ne progresse pendant votre absence.</p>
    </div><strong>{ledger.specimens.length}/{HARVEST_DEPOT_LIMIT_V112} prises · {clanMarks} marques</strong></div>
    <div className={styles.tool}><div><h3>Entretien du Flaying Tool</h3>
      <p>{owned?"État "+ledger.toolCondition+"/100 · durée de travail ×"+flayingToolWorkMultiplierV112(ledger.toolCondition).toFixed(2):"Outil non acquis : disponible à l’armurerie."}</p>
      <p>Une opération achevée use de 5 points. Un geste interrompu ne coûte rien. Un outil émoussé reste utilisable ; l’affûtage au poste est gratuit.</p>
      </div><button type="button" className="button" disabled={disabled||!owned||ledger.toolCondition===100}
        onClick={()=>act("repair","flaying-tool")}>Affûter gratuitement</button></div>
    <p className={styles.legend}>Étapes : Nettoyer · 2 marques / 3 gestes → Traiter · 4 / 4 → Sécher · 3 / 5 → Monter · 5 / 3. Le coût est payé une seule fois à l’engagement de chaque étape. Jusqu’à 16 opérations en parallèle.</p>
    {feedback&&<p role="status" className={styles.feedback}>{feedback}</p>}
    {ledger.specimens.length===0?<p>Aucune prise anatomique rapportée. Prélevez une partie compatible sur une proie vaincue, puis réussissez l’extraction pour la déposer ici.</p>:
      <div className={styles.grid}>{ledger.specimens.map(item=>{
        const job=ledger.jobs.find(j=>j.specimenId===item.id&&j.status==="active");
        const next=CONSERVATION_STEPS_V112.find(s=>s.from===item.stage);
        return <article className={styles.card} key={item.id} aria-label={item.label}>
          <SpecimenGlyphV112 item={item}/>
          <div><h3>{item.label}</h3><p>{speciesLabelV112(item.speciesId)} · intégrité {item.quality}/100</p>
            <p>{item.massKg.toFixed(1)} kg · {item.volumeUnits.toFixed(1)} volumes · <strong>{SPECIMEN_STAGE_LABELS_V112[item.stage]}</strong></p>
            </div>
          {job?<div className={styles.work}>
            <label htmlFor={"conservation-progress-"+item.id}>{SPECIMEN_STAGE_LABELS_V112[job.toStage]} : {job.unitsDone}/{job.unitsRequired} gestes · {job.costPaid} marques déjà payées</label>
            <progress id={"conservation-progress-"+item.id} max={job.unitsRequired} value={job.unitsDone}/>
            <button type="button" className="button" disabled={disabled} onClick={()=>act("work",job.id)}>Effectuer un geste · {item.label}</button>
          </div>:next?<div className={styles.work}><p>{next.units} gestes manuels, sans délai réel.</p>
            <button type="button" className="button" disabled={disabled||clanMarks<next.cost||ledger.jobs.filter(j=>j.status==="active").length>=16}
              onClick={()=>act("start",item.id)}>{next.label} · {next.cost} marques · {item.label}</button></div>:
            <p className={styles.mounted}>Prise montée et exposée dans cet atelier. La collection de trophées et les rangs restent distincts.<br/><button type="button" className="button" disabled={disabled} onClick={()=>act("archive",item.id)}>Ranger en réserve · {item.label}</button><small>Libère un emplacement. La prise reste possédée dans la réserve comptée ci-dessous.</small></p>}
        </article>;
      })}</div>}
    {ledger.archive.length>0&&<div className={styles.reserve}><h3>Réserve permanente</h3><ul>{ledger.archive.map(a=><li key={a.speciesId+":"+a.partId}>{a.count} × {a.label} · {speciesLabelV112(a.speciesId)} · intégrité moyenne {Math.round(a.qualityTotal/a.count)}/100</li>)}</ul></div>}
  </section>;
}
