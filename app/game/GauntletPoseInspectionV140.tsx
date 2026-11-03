"use client";

import {useState} from "react";
import HunterRigPreview from "./HunterRigPreview";
import {DEFAULT_CHROMATICS_V113} from "./hunterChromaticsV113";
import type {HunterAppearance,HunterBodyMorphId} from "./types";
import type {HunterRigFacing,HunterRigPose} from "./hunterRig";
import styles from "./GauntletPoseInspectionV140.module.css";

/** Local visual QA only: these are the real production rig and V139 assets.
 * This is NOT an approval of model proportions or a test of full gameplay.
 * The props are kept separate from SaveGame, and no rewards can be earned here.
 */
export const GAUNTLET_POSES_V140:readonly HunterRigPose[]=[
  "idle","run","jump","fall","climb","extract",
];
export const GAUNTLET_MORPHS_V140:readonly HunterBodyMorphId[]=[
  "classic","young","elder","super","feral","huntress",
];
const QA_APPEARANCE:HunterAppearance={
  presetId:"jungle-hunter",bodyMorphId:"classic",headStyleId:"legacy-clan",
  skinId:"ochre-mottle",biomaskId:"jungle",dreadStyleId:"classic",
  dreadTintId:"obsidian",armorStyleId:"classic",armorTintId:"bronze",
  chromaticsV113:{...DEFAULT_CHROMATICS_V113},
  trophyAdornmentId:"none",laserColorId:"crimson",
};

export default function GauntletPoseInspectionV140({modelId,coverOpen=false}:{
  modelId:string;coverOpen?:boolean;
}){
  const [pose,setPose]=useState<HunterRigPose>("idle");
  const [morph,setMorph]=useState<HunterBodyMorphId>("classic");
  const [facing,setFacing]=useState<HunterRigFacing>(1);
  const [phase,setPhase]=useState(.25);
  const [coverState,setCoverState]=useState({source:coverOpen,isOpen:coverOpen});
  const [bladesExtended,setBladesExtended]=useState(false);
  const [debugBones,setDebugBones]=useState(false);
  // A changed parent command resets the lid; unrelated renders keep its local toggle.
  if(coverState.source!==coverOpen){
    setCoverState({source:coverOpen,isOpen:coverOpen});
  }
  const isOpen=coverState.isOpen;
  const appearance:HunterAppearance={
    ...QA_APPEARANCE,bodyMorphId:morph,
    armorStyleId:morph==="feral"?"feral":"classic",
    dreadStyleId:morph==="feral"?"feral":morph==="huntress"?"huntress":"classic",
  };
  return <section className={styles.lab} aria-label="Analyse des poses réelles du chasseur"
      data-testid="gauntlet-pose-inspection-v140" data-model={modelId}
      data-rig-pose={pose} data-rig-morph={morph} data-rig-facing={facing}
      data-rig-lid={isOpen?"open":"closed"} data-source-status="original-rig-blockout-unapproved">
    <header><h3>Test des attaches sur le vrai rig du chasseur</h3>
      <p>Cette animation utilise le composant <code>HunterRigPreview</code> du jeu, pas seulement
      un schéma de poignet. Les six poses et morphologies sont des scénarios de QA ;
      la correspondance exacte avec les accessoires des films n&apos;est pas validée.</p></header>
    <div className={styles.controls}>
      <label>Pose
        <select value={pose} onChange={event=>setPose(event.currentTarget.value as HunterRigPose)}>
          {GAUNTLET_POSES_V140.map(p=><option key={p} value={p}>{p}</option>)}
        </select>
      </label>
      <label>Morphologie
        <select value={morph} onChange={event=>setMorph(event.currentTarget.value as HunterBodyMorphId)}>
          {GAUNTLET_MORPHS_V140.map(m=><option key={m} value={m}>{m}</option>)}
        </select>
      </label>
      <label>Phase de mouvement · {Math.round(phase*100)} %
        <input type="range" min="0" max="100" step="5" value={Math.round(phase*100)}
          onChange={event=>setPhase(Number(event.currentTarget.value)/100)}/>
      </label>
      <button type="button" aria-pressed={facing===-1} onClick={()=>setFacing(v=>v===1?-1:1)}>
        Orientation : {facing===1?"droite":"gauche"}
      </button>
      <button type="button" aria-pressed={isOpen} onClick={()=>setCoverState(v=>({...v,isOpen:!v.isOpen}))}>
        {isOpen?"Fermer le capot du rig":"Ouvrir le capot du rig"}
      </button>
      <button type="button" aria-pressed={bladesExtended} onClick={()=>setBladesExtended(v=>!v)}>
        {bladesExtended?"Rentrer les lames opposées":"Déployer les lames opposées"}
      </button>
      <button type="button" aria-pressed={debugBones} onClick={()=>setDebugBones(v=>!v)}>
        {debugBones?"Masquer les articulations":"Afficher les articulations"}
      </button>
    </div>
    <div className={styles.preview} data-testid="gauntlet-real-rig-stage-v140">
      <HunterRigPreview
        appearance={appearance} armorId="hunter" weaponIds={["wristblades","plasma-caster"]}
        gearIds={[]} gauntletVariantId={modelId} gauntletOpen={isOpen}
        bladesExtended={bladesExtended} maskWorn={false}
        pose={pose} phase={phase} facing={facing}
        speed={pose==="run"?260:0}
        verticalVelocity={pose==="fall"?480:0}
        extractionProgress={pose==="extract"?phase:0}
        debugBones={debugBones} size="min(72vw, 370px)"
      />
    </div>
    <p className={styles.disclaimer}>Prototype de rig individuel, os de l&apos;avant-bras arrière
      séparé des lames de l&apos;avant-bras avant. Les matériaux, collisions avec
      les autres pièces et poses définitives exigent une revue visuelle humaine.</p>
  </section>;
}
