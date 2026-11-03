import React,{useState} from "react";
import {createRoot} from "react-dom/client";
import GauntletPoseInspectionV140 from "../../app/game/GauntletPoseInspectionV140";
import {GAUNTLET_CATALOG_V132} from "../../app/game/systems/clanWarGauntletCatalogV132";

function PoseFixture(){
  const [id,setId]=useState("jungle-hunter");
  return <main style={{maxWidth:1080,margin:"0 auto",padding:16}}>
    <h1>V140 · rig Yautja réel, banc de poses</h1>
    <p>Inspection source, pas de simulation de guerre, ni certification 1:1.</p>
    <label>Modèle
      <select value={id} onChange={e=>setId(e.currentTarget.value)} data-testid="rig-model-picker-v140">
        {GAUNTLET_CATALOG_V132.map(model=><option key={model.id} value={model.id}>{model.name}</option>)}
      </select>
    </label>
    <GauntletPoseInspectionV140 modelId={id}/>
  </main>;
}
const mount=document.getElementById("root");
if(!mount)throw Error("Missing QA mount");
createRoot(mount).render(<PoseFixture/>);
