"use client";

import { useId } from "react";
import styles from "./GauntletKnownHuntersV135.module.css";

export type KnownHunterGauntletV135 = "city-hunter" | "wolf" | "feral" | "dek";
const FAMILIES: Readonly<Record<KnownHunterGauntletV135,{
  label:string; source:string; geometry:"four-vertical"|"five-vertical"|"bone-etched"|"circular-scanner";
}>> = {
  "city-hunter":{label:"City Hunter (1990)",source:"Predator 2 / Propstore wrist device",
    geometry:"four-vertical"},
  wolf:{label:"Wolf (2007)",source:"Aliens vs. Predator: Requiem left gauntlet / reference photographs",
    geometry:"five-vertical"},
  feral:{label:"Feral (2022)",source:"Prey / bone-coloured bracer reference",
    geometry:"bone-etched"},
  dek:{label:"Dek (2025)",source:"Predator: Badlands / Yautja gauntlet scanner references",
    geometry:"circular-scanner"},
};
const LAYERS=["01-forearm.svg","02-shell.svg","03-panel.svg","04-cover.svg"] as const;
export const KNOWN_HUNTER_GAUNTLETS_V135 = Object.freeze(Object.keys(FAMILIES) as KnownHunterGauntletV135[]);
export const KNOWN_HUNTER_V135_LAYERS = LAYERS;
export function isKnownHunterGauntletV135(id:string):id is KnownHunterGauntletV135 {
  return Object.prototype.hasOwnProperty.call(FAMILIES,id);
}


export default function GauntletKnownHuntersV135({variant,coverOpen=true}:{
  variant:KnownHunterGauntletV135;
  coverOpen?:boolean;
}){
  const id=useId().replace(/[^a-zA-Z0-9_-]/g,"");
  const model=FAMILIES[variant];
  const root=`/game/assets/v135/gauntlets/${variant}/`;
  return <svg viewBox="0 0 540 290" width="540" height="290"
    className={styles.art} role="img" focusable="false"
    data-testid="gauntlet-known-hunter-v135" data-model={variant}
    data-geometry={model.geometry} data-source-status="film-informed-vector-blockout"
    data-fidelity="unapproved" data-cover-open={coverOpen}>
    <title id={id+"-title"}>{model.label} · étude modulaire de gauntlet</title>
    <desc id={id+"-desc"}>Quatre calques SVG indépendants. Référence : {model.source}. Proportions, matériaux et animations non certifiés 1:1.</desc>
    <g aria-hidden="true">
      <image href={root+LAYERS[0]} width="540" height="290"/>
      <image href={root+LAYERS[1]} width="540" height="290"/>
      <image href={root+LAYERS[2]} width="540" height="290"/>
      <image href={root+LAYERS[3]} width="540" height="290"
        className={styles.cover} data-cover-position={coverOpen?"open":"closed"}/>
    </g>
  </svg>;
}
