import React,{useState} from "react";
import {createRoot} from "react-dom/client";
import ClanWarGauntletV131 from "../../app/game/ClanWarGauntletV131";

function AtlasStateProof(){
  const [orders,setOrders]=useState(0);
  return <div aria-label="Un seul atlas témoin" data-testid="atlas-state-witness-v137">
    <p>Ce banc de test contient un atlas témoin à état local, PAS la campagne ni une simulation de combat.</p>
    <button type="button" onClick={()=>setOrders(c=>c+1)}>Ajouter ordre témoin : {orders}</button>
    <label>Filtre caméra conservé<input data-testid="atlas-camera-witness-v137" defaultValue="ZOOM-80"/></label>
  </div>;
}
function WarProjectionFixture(){
  const [view,setView]=useState<"gauntlet"|"classic">("gauntlet");
  const [model,setModel]=useState("jungle-hunter");
  return <main>
    <h1>Contrat de bascule holographique V137</h1>
    <p>Ce test utilise le vrai composant de présentation et un atlas témoin ; il ne touche pas les sauvegardes.</p>
    <div role="group" aria-label="Vues de la guerre">
      <button aria-pressed={view==="gauntlet"} onClick={()=>setView("gauntlet")}>Vue holographique</button>
      <button aria-pressed={view==="classic"} onClick={()=>setView("classic")}>Vue classique</button>
    </div>
    <div role="group" aria-label="Variantes de gauntlet">
      <button aria-pressed={model==="jungle-hunter"} onClick={()=>setModel("jungle-hunter")}>Jungle Hunter</button>
      <button aria-pressed={model==="wolf"} onClick={()=>setModel("wolf")}>Wolf</button>
      <button aria-pressed={model==="lost-shaman"} onClick={()=>setModel("lost-shaman")}>Lost Shaman</button>
    </div>
    <ClanWarGauntletV131 view={view} planetName="Korthas (banc de test)" turn={4}
      departure="Base témoin" destination="Front témoin" controlled={3} territories={8}
      queuedOrders={1} persisted={true} pending={false} gauntletId={model}
      readoutLabel="Rapports connus" readoutValue="2 rapports de test uniquement">
      <AtlasStateProof/>
    </ClanWarGauntletV131>
  </main>;
}
const mount=document.getElementById("root");
if(!mount)throw Error("Missing QA mount");
createRoot(mount).render(<WarProjectionFixture/>);
