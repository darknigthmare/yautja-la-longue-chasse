"use client";

import {useId} from "react";
import styles from "./JungleHunterLayeredV134.module.css";

/** Separately replaceable source layers. Their proportions still require
 * comparison with 1987 source frames; this is a production blockout, not a
 * film-certified 1:1 asset. Using the same layer set in armory and war avoids drift. */
const ROOT="/game/assets/v134/gauntlets/jungle-hunter/";
const ASSETS={
  arm:"01-arm.svg",housing:"02-housing.svg",glyphs:"03-display-glyphs.svg",
  hinge:"04-hinge.svg",lid:"05-lid.svg",emitter:"06-emitter.svg",beam:"07-beam.svg",
} as const;
export const JUNGLE_HUNTER_LAYERS_V134=Object.freeze(ASSETS);
export default function JungleHunterLayeredV134({coverOpen=true,showBeam=true,hiddenParts=[]}:{
  coverOpen?:boolean;showBeam?:boolean;hiddenParts?:readonly string[];
}){
  const unique=useId().replace(/[^a-zA-Z0-9_-]/g,"");
  return <svg viewBox="0 0 540 290" width="540" height="290" className={styles.art}
    role="img" aria-label="Étude vectorielle du gauntlet Jungle Hunter, ordinateur du poignet gauche et cinq rangées de glyphes rouges"
    data-testid="jungle-hunter-layered-v134" data-fidelity="blockout-unapproved" data-cover-open={coverOpen}>
    <title id={unique+"-title"}>Jungle Hunter · étude modulaire de gauntlet</title>
    <desc id={unique+"-desc"}>Sept calques SVG indépendants, cinq rangées rouges et capot articulé. Proportions et glyphes soumis à validation 1:1.</desc>
    <g aria-hidden="true">
      {!hiddenParts.includes("arm")&&<image href={ROOT+ASSETS.arm} width="540" height="290"/>}
      {!hiddenParts.includes("shell")&&<image href={ROOT+ASSETS.housing} width="540" height="290"/>}
      {!hiddenParts.includes("panel")&&<image href={ROOT+ASSETS.glyphs} width="540" height="290"/>}
      {!hiddenParts.includes("hinge")&&<image href={ROOT+ASSETS.hinge} width="540" height="290"/>}
      {!hiddenParts.includes("lid")&&<image href={ROOT+ASSETS.lid} className={styles.lid} data-cover-position={coverOpen?"open":"closed"} width="540" height="290"/>}
      {!hiddenParts.includes("emitter")&&<image href={ROOT+ASSETS.emitter} width="540" height="290"/>}
      {showBeam&&!hiddenParts.includes("beam")&&<image href={ROOT+ASSETS.beam} width="540" height="290"/>}
    </g>
  </svg>;
}
