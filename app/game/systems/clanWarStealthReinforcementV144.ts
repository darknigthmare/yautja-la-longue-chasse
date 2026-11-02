import type {WarRulesV6} from "./clanWarBibleV6";
import type {WarOperationsStateV115,WarOperationsUpdateV115} from "./clanWarOperationsV115";
import {commandStealthV115} from "./clanWarOperationsV115";
import {warMissionTerrainV116} from "./clanWarMissionTerrainV116";
import {chooseStealthSupportGuard} from "./clanWarStealthGuardPlacement";

/** Legacy saves without an identified rule need an explicit choice on resume. */
export function setStealthReinforcementMode(state:WarOperationsStateV115,rules:WarRulesV6,
 mode:"manual"|"decoy"):WarOperationsUpdateV115{
 const mission=state.active,s=mission?.stealth;
 const ambiguous=s?.reinforcementMode===undefined&&!s?.supportGuard&&!s?.reinforcementIssued;
 if(mission?.mode!=="stealth"||!s||state.sourceSha!==rules.metadata.sha256||
   (!ambiguous&&(s.alarm>0||s.decoyUsed||s.supportGuard||s.reinforcementIssued))||
   (mode!=="manual"&&mode!=="decoy"))
  return {state,accepted:false,message:"Choisissez la règle avant la première alerte ou diversion."};
 return {state:{...state,active:{...mission,stealth:{...s,reinforcementMode:mode}}},
  accepted:true,message:mode==="decoy"?"Renfort après diversion activé.":"Renfort manuel activé."};
}

/** Explicit optional alarm escalation for the player's harder W3 exercise.
 * A second guard arrives from a walkable patrol boundary (not through a
 * wall) and moves during the same regular one-tick patrol response. The
 * previous V115 save and all standard missions remain unchanged. */
export function commandWarStealthAlertReinforcementV144(
 state:WarOperationsStateV115,rules:WarRulesV6,
):WarOperationsUpdateV115{
 const mission=state.active,stealth=mission?.stealth;
 const fail=(message:string):WarOperationsUpdateV115=>({state,accepted:false,message});
 if(mission?.mode!=="stealth"||!stealth||state.sourceSha!==rules.metadata.sha256)
  return fail("Une infiltration V6 active est indispensable.");
 if(stealth.reinforcementMode===undefined||stealth.reinforcementMode==="decoy"||stealth.alarm<1||stealth.reinforcementIssued||stealth.supportGuard)
  return fail("Patrouille renforcée possible une seule fois après une première alerte.");
 const map=warMissionTerrainV116(mission.targetId,rules);
 const entrance=chooseStealthSupportGuard(map,{x:stealth.guardX,y:stealth.guardY??2},stealth);
 if(!entrance)return fail("Aucune entrée physique libre pour une deuxième patrouille.");
 const supportGuard=entrance;
 const next={...state,active:{...mission,stealth:{...stealth,
  supportGuard,reinforcementIssued:true}}};
 const advanced=commandStealthV115(next,"wait",rules);
 return advanced.accepted?{...advanced,message:"Alerte renforcée : "+
  "un second garde entre physiquement sur la carte et patrouille à chaque tour. "+
  advanced.message}:advanced;
}
