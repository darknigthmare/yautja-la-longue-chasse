import React from "react";
import {createRoot} from "react-dom/client";
import EnemyBestiaryV8 from "../../app/game/EnemyBestiaryV8";
import {CatalogueHunterBrowser} from "../../app/game/CatalogueHunterBrowser";
function App(){
 return <><EnemyBestiaryV8 discoveredEnemyIds={[]}/><CatalogueHunterBrowser initialQuery="Jungle" pageSize={100} onSelect={()=>{throw Error("Sélection non demandée");}}/></>;
}
createRoot(document.getElementById("root")!).render(<App/>);
