"use client";

import { useMemo, useState } from "react";
import type { WarPlanetV96 } from "./systems/clanWarPlanetsV96";
import type { PlanetRegionalMaterialKitV128 } from "./systems/clanWarRegionalMaterialKitV128";
import { auditPlanetPreflightV149 } from "./systems/clanWarPlanetPreflightV149";
import styles from "./PlanetPreflightV149.module.css";

/** Visible inspection only. A failed preflight never repairs or overwrites the
 * player's canonical world or an in-progress war simulation. */
export default function PlanetPreflightV149({
  planet, regionalKit = null,
}: { planet: WarPlanetV96; regionalKit?: PlanetRegionalMaterialKitV128 | null }) {
  const [expanded,setExpanded]=useState(false);
  const [notice,setNotice]=useState("");
  const report=useMemo(()=>auditPlanetPreflightV149(planet,regionalKit),[planet,regionalKit]);

  const exportReport=()=>{
    try{
      const blob=new Blob([JSON.stringify(report,null,2)+"\n"],{type:"application/json"});
      const url=URL.createObjectURL(blob);
      const anchor=document.createElement("a");anchor.href=url;
      anchor.download=planet.id+"-preflight-v149.json";
      document.body.appendChild(anchor);
      try{anchor.click();}
      finally{anchor.remove();window.setTimeout(()=>URL.revokeObjectURL(url),30000);}
      setNotice("Rapport d'intégrité exporté sans modification de la planète.");
    }catch{setNotice("Export du contrôle de cohérence indisponible.");}
  };
  return <section className={styles.panel} data-testid="planet-preflight-v149"
    data-world-code={planet.id} data-error-count={report.errors}
    data-warning-count={report.warnings} data-status={report.status}>
    <button type="button" className={styles.toggle}
      data-testid="planet-preflight-toggle-v149" aria-expanded={expanded}
      onClick={()=>setExpanded(value=>!value)}>
      {expanded?"Masquer le contrôle":"Vérifier l’intégrité de cette planète"}
    </button>
    <p>Contrôle de cohérence : régions, territoires, routes de guerre, masses terrestres, bassins et éventuel kit de matières. Aucune correction automatique.</p>
    <div className={styles.summary}>
      <span><strong>{report.errors}</strong> anomalie{report.errors>1?"s":""} structurelle{report.errors>1?"s":""}</span>
      <span><strong>{report.warnings}</strong> avertissement{report.warnings>1?"s":""} environnemental{report.warnings>1?"s":""}</span>
      <span>{report.checked.territories} territoires · {report.checked.regions} régions · {report.checked.routes} routes</span>
    </div>
    {expanded&&<div className={styles.body}>
      <p data-testid="planet-preflight-summary-v149">Statut : {report.status==="structural-errors"
        ? "anomalies structurelles détectées"
        :report.status==="review-advised"
          ?"structure vérifiée, climat ou lore à documenter":"aucune anomalie structurelle détectée"}.
        Cette vérification n’est pas une certification géographique ou artistique 1:1.</p>
      <div className={styles.actions}>
        <button type="button" data-testid="planet-preflight-export-v149"
          onClick={exportReport}>Exporter le contrôle JSON</button>
      </div>
      {report.issues.length===0?<p>Aucune anomalie identifiée par les règles automatisées actuellement disponibles.</p>:
      <ol className={styles.issues}>
        {report.issues.slice(0,60).map((issue,i)=><li key={issue.code+"-"+i}
          data-severity={issue.severity} data-code={issue.code}>
          <strong>{issue.severity==="error"?"Structure":"À documenter"} · {issue.code}</strong>
          <span>{issue.target??"Planète"} : {issue.explanation}</span>
        </li>)}
      </ol>}
      {report.issues.length>60&&<p>{report.issues.length-60} autres diagnostics sont détaillés dans le JSON exporté.</p>}
      <ul className={styles.limitations}>{report.limitations.map(line=><li key={line}>{line}</li>)}</ul>
      <p role="status">{notice}</p>
    </div>}
  </section>;
}
