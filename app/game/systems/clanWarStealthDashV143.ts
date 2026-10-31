import type {WarRulesV6} from "./clanWarBibleV6";
import {commandStealthV115,type WarOperationsStateV115,
 type WarOperationsUpdateV115,type StealthCommandV115} from "./clanWarOperationsV115";
import {warMissionTerrainV116,warTerrainCellBlockedV116} from "./clanWarMissionTerrainV116";

export type WarStealthDashDirectionV143="up"|"down"|"left"|"right";
/**
 * The two steps EACH consume a real V115 stealth tick and EACH move the
 * physical guard. Two additional battery points are paid at the start.
 * Never skip two cells in one simulation tick, suppress a guard, use a new
 * ability attributed to film canon, or manufacture a mission receipt.
 */
export function commandWarStealthDashV143(
 s:WarOperationsStateV115,direction:WarStealthDashDirectionV143,
 rules:WarRulesV6,
):WarOperationsUpdateV115 {
 const fail=(message:string):WarOperationsUpdateV115=>({state:s,accepted:false,message});
 const mission=s.active,actor=mission?.stealth;
 if(s.sourceSha!==rules.metadata.sha256||mission?.mode!=="stealth"||!actor)
  return fail("Une infiltration V6 active est nécessaire.");
 if(!["up","down","left","right"].includes(direction))
  return fail("Direction de progression invalide.");
 if(actor.dashUsed||actor.cloaked||actor.energy<2)
  return fail("Sprint déjà utilisé, camouflage actif ou énergie insuffisante (2).");
 const terrain=warMissionTerrainV116(mission.targetId,rules);
 const dx=direction==="right"?1:direction==="left"?-1:0;
 const dy=direction==="down"?1:direction==="up"?-1:0;
 if(warTerrainCellBlockedV116(terrain,actor.x+dx,actor.y+dy)||
   warTerrainCellBlockedV116(terrain,actor.x+2*dx,actor.y+2*dy))
  return fail("Deux cases réelles consécutives et libres sont nécessaires au sprint.");
 let state:WarOperationsStateV115={...s,active:{...mission,
  stealth:{...actor,energy:actor.energy-2,dashUsed:true}}};
 let traversed=0;
 for(let i=0;i<2;i++){
  if(state.active?.mode!=="stealth")break; // defeat/finish/retreat already reported
  const step=commandStealthV115(state,direction as StealthCommandV115,rules);
  if(!step.accepted)break;
  state=step.state;traversed++;
  if(!state.active)break;
 }
 if(!traversed)return fail("Le sprint n'a pu être exécuté.");
 return {accepted:true,state,message:
  "Sprint V143 : "+traversed+" cases physiques, "+traversed+
  " réaction(s) de patrouille, 2 points d'énergie engagés. "+
  (state.active?"La mission reste en cours.":"Une issue réelle de mission a été enregistrée.")};
}
