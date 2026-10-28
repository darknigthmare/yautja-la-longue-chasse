import type { WorldBlueprint } from "./worldBlueprints";
import type { RiteSupportV77 } from "./ritesOfHuntV77";
import { huntStructuralBarrierV94 } from "./huntStructuralBarrierV94.ts";

/** Gameplay authoring rule: only structural tree trunks and load-bearing
 * chains in world.climbables receive sockets. Background art is never queried.
 * The socket is below the crown, reachable from the ground, with clear hanging
 * space. Narrow ropes/vines/ice/decor cannot carry a carcass. */
export const CARCASS_SOCKET_RULES_V112 = Object.freeze({
  tree:{minimumWidth:90,minimumHeight:220,maximumMass:170},
  chain:{minimumWidth:32,minimumHeight:180,maximumMass:240},
});
export const CARCASS_HANG_DROP_V112=82;
export function carcassSupportsForWorldV112(world:WorldBlueprint):RiteSupportV77[] {
  return world.climbables.flatMap(zone=>{
    const rule=zone.kind==="tree"?CARCASS_SOCKET_RULES_V112.tree:zone.kind==="chain"?CARCASS_SOCKET_RULES_V112.chain:null;
    if(!rule||zone.width<rule.minimumWidth||zone.height<rule.minimumHeight)return [];
    const x=zone.x+zone.width+32;
    const y=Math.min(world.floorY-142,zone.y+zone.height-142);
    const body={x:x-26,y:y+12,width:52,height:CARCASS_HANG_DROP_V112-12};
    if(x+26>world.width||y<(world.minY??0)||world.platforms.some(p=>p.collision==="solid"&&
      body.x<p.x+p.width&&body.x+body.width>p.x&&body.y<p.y+p.height&&body.y+body.height>p.y))return [];
    return [{id:"carcass-socket:"+zone.id,x,y,suitable:true,maximumMass:rule.maximumMass}];
  });
}
export function carcassSupportAccessibleV112(actor:{x:number;y:number},support:RiteSupportV77,world:WorldBlueprint):boolean {
  return support.suitable&&Math.hypot(actor.x-support.x,actor.y-support.y)<=180&&
    !huntStructuralBarrierV94(actor,{x:support.x,y:support.y+CARCASS_HANG_DROP_V112},world.platforms);
}
