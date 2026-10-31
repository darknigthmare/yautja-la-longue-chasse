import React,{useState} from "react";
import {createRoot} from "react-dom/client";
import ClanWarOperationsV115 from "../../app/game/ClanWarOperationsV115";
import {DEFAULT_WAR_RULES_V6} from "../../app/game/systems/clanWarBibleV6";
import {createWarOperationsV115,warMissionEligibleV115} from "../../app/game/systems/clanWarOperationsV115";

/** REAL V115 component + true V6 rules, not a fake combat system.
 * This is an independent exercise: no SaveGame, planets or medals are mutated. */
const rules=DEFAULT_WAR_RULES_V6;
const state=createWarOperationsV115(rules);
const lead=state.teams[0]?.id??"";
const target=rules.territories.find(site=>site.id!==state.baseId &&
    warMissionEligibleV115(state,rules,site.id,[lead])===null)?.id??"";
if(!lead||!target)throw new Error("No valid real V6 mission/team for V147 QA");
function Fixture(){
 const [gauntlet,setGauntlet]=useState("jungle-hunter");
 return <main data-testid="v147-actual-four-mode-lab" data-legal-team={lead} data-legal-target={target} data-initial-rav={state.rav}>
   <h1>V147 · quatre gameplays réels V115</h1>
   <p>Exercice V6 indépendant, sans récompense de chasse ni annexion de planète V85.</p>
   <div role="group" aria-label="Gauntlets de comparaison">
     {["jungle-hunter","wolf","feral"].map(id=>
       <button key={id} type="button" aria-pressed={gauntlet===id}
         onClick={()=>setGauntlet(id)}>{id}</button>)}
   </div>
   <ClanWarOperationsV115 rules={rules} active persist holographic gauntletId={gauntlet}/>
 </main>;
}
const element=document.getElementById("root");
if(!element)throw new Error("QA root absent");
createRoot(element).render(<Fixture/>);
