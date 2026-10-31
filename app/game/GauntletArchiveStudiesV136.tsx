"use client";

import {useId} from "react";
import {gauntletByIdV132,type GauntletDefinitionV132} from "./systems/clanWarGauntletCatalogV132";
import styles from "./GauntletArchiveStudiesV136.module.css";

const KNOWN = new Set(["jungle-hunter","city-hunter","wolf","feral","dek"]);
const LAYERS = ["01-arm.svg","02-shell.svg","03-interface.svg","04-lid.svg"] as const;

/** These 49 silhouettes are DISTINCT self-authored concepts for unlockable
 * clan workshop replicas. They MUST NOT be called faithful 1:1 movie props.
 * This split allows an art director to replace each layer without code edits. */
export function isGauntletArchiveStudyV136(id:string):boolean {
  return !KNOWN.has(id) && !!gauntletByIdV132(id);
}
export const GAUNTLET_ARCHIVE_STUDY_LAYERS_V136 = LAYERS;

export default function GauntletArchiveStudiesV136({entry,coverOpen=true}:{
  entry:GauntletDefinitionV132;coverOpen?:boolean;
}){
  const titleId=useId();
  const base=`/game/assets/v136/gauntlets/${entry.id}/`;
  return <svg viewBox="0 0 540 290" width="540" height="290" className={styles.art}
    role="img" focusable="false" aria-labelledby={titleId}
    data-testid="gauntlet-archive-study-v136" data-model={entry.id}
    data-source-status={entry.evidence} data-fidelity="original-concept-not-film"
    data-cover-open={coverOpen}>
    <title id={titleId}>{entry.name} · prototype original, non validé 1:1</title>
    <g aria-hidden="true">
      <image href={base+LAYERS[0]} width="540" height="290"/>
      <image href={base+LAYERS[1]} width="540" height="290"/>
      <image href={base+LAYERS[2]} width="540" height="290"/>
      <image href={base+LAYERS[3]} width="540" height="290"
        className={styles.lid} data-cover-position={coverOpen?"open":"closed"}/>
    </g>
  </svg>;
}
