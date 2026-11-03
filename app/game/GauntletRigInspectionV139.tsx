"use client";

import {gauntletByIdV132} from "./systems/clanWarGauntletCatalogV132";
import {gauntletRigSpriteV139} from "./systems/gauntletRigSpritesV139";
import styles from "./GauntletRigInspectionV139.module.css";

/** Local-only QA sketch, not the actual full HunterRigPreview animation:
 * both display EXACTLY the same V139 source files registered at the real
 * left-lower-forearm pivot (51, 202) in a 256 x 384 coordinate frame. */
export default function GauntletRigInspectionV139({modelId,coverOpen=true}:{
  modelId:string;coverOpen?:boolean;
}){
  const model=gauntletByIdV132(modelId)??gauntletByIdV132("jungle-hunter");
  const selectedId=model?.id??"jungle-hunter";
  return <div className={styles.wrapper} data-testid="gauntlet-rig-inspection-v139"
    data-rig-model={selectedId} data-rig-art-status="individual-vector-blockout-not-film-certified">
    <svg viewBox="0 0 256 384" width="256" height="384" className={styles.diagram}
      role="img" aria-label={`Schéma du poignet gauche pour ${model?.name??"Jungle Hunter"}, coque et capot enregistrés sur le rig`}>
      <title>Rig du poignet gauche · {model?.name??"Jungle Hunter"}</title>
      <g aria-hidden="true">
        <path d="M85 114Q70 120 57 148L48 166 37 210 39 231Q48 242 59 232L79 177 96 134Z"
          fill="#526157" stroke="#a2ab94" strokeWidth="4"/>
        <path d="M58 149 45 213M67 159 51 221" fill="none" stroke="#35493c" strokeWidth="3"/>
        <image data-rig-part="base" href={gauntletRigSpriteV139(selectedId,"base")} width="256" height="384"/>
        <g transform={coverOpen?"rotate(-64 51 202)":undefined} data-cover-position={coverOpen?"open":"closed"}>
          <image data-rig-part="lid" href={gauntletRigSpriteV139(selectedId,"lid")} width="256" height="384"/>
        </g>
        <circle cx="51" cy="202" r="2.8" fill="#ecdba7" stroke="#27322c" strokeWidth="1" opacity=".8"/>
      </g>
    </svg>
    <p><strong>Sur le vrai personnage :</strong> le module est animé par l&apos;os `armBackLower` ;
      le couvercle pivote autour de (51, 202). Les lames restent sur l&apos;autre avant-bras.</p>
    <small>Schéma de comparaison local. Ni la silhouette de l&apos;acteur ni les pièces
      individuelles ne sont approuvées en fidélité 1:1.</small>
  </div>;
}
