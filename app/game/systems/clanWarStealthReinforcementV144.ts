import type {WarRulesV6} from "./clanWarBibleV6";
import type {WarOperationsStateV115,WarOperationsUpdateV115} from "./clanWarOperationsV115";
import {commandStealthV115} from "./clanWarOperationsV115";
import {warMissionTerrainV116,warTerrainCellBlockedV116} from "./clanWarMissionTerrainV116";

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
 if(stealth.alarm<1||stealth.reinforcementIssued||stealth.supportGuard)
  return fail("Patrouille renforcée possible une seule fois après une première alerte.");
 const map=warMissionTerrainV116(mission.targetId,rules);
 const candidates=[{x:7,y:2},{x:4,y:2},{x:7,y:3},{x:4,y:1},
  {x:6,y:3},{x:5,y:1}];
 const entrance=candidates.find(p=>!warTerrainCellBlockedV116(map,p.x,p.y)&&
  Math.abs(p.x-stealth.guardX)+Math.abs(p.y-(stealth.guardY??2))>=2);
 if(!entrance)return fail("Aucune entrée physique libre pour une deuxième patrouille.");
 const supportGuard={x:entrance.x,y:entrance.y,direction:-1 as const};
 const next={...state,active:{...mission,stealth:{...stealth,
  supportGuard,reinforcementIssued:true}}};
 const advanced=commandStealthV115(next,"wait",rules);
 return advanced.accepted?{...advanced,message:"Alerte renforcée : "+
  "un second garde entre physiquement sur la carte et patrouille à chaque tour. "+
  advanced.message}:advanced;
}
