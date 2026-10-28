import {huntStructuralBarrierV94,type HuntBarrierPlatformV94} from "./huntStructuralBarrierV94.ts";
import {tryCarrySpecimenV112,type FieldSpecimenV112} from "./harvestInventoryV112.ts";
import type {ArmorId} from "../types";

export interface FieldStashEntryV112 {specimenId:string;x:number;y:number;fallSpeed:number}
export interface FieldStashStateV112 {
  specimensV112?:FieldSpecimenV112[];
  stashedSpecimensV112?:FieldStashEntryV112[];
}
export interface FieldStashActorV112 {
  x:number;y:number;width:number;height:number;grounded:boolean;climbing:boolean;health:number;
}
export interface FieldStashWorldV112 {
  width:number;floorY:number;platforms:readonly HuntBarrierPlatformV94[];
}
export const FIELD_STASH_REACH_V112=110;
const number=(v:unknown):v is number=>typeof v==="number"&&Number.isFinite(v)&&Math.abs(v)<1e8;
/** The canonical harvested stock never shrinks when deposited: consumed anatomy
 * remains consumed. Only one optional world position moves its physical item. */
export function carriedFieldSpecimensV112(state:FieldStashStateV112|null|undefined):FieldSpecimenV112[] {
  const stashed=new Set((state?.stashedSpecimensV112??[]).map(e=>e.specimenId));
  return (state?.specimensV112??[]).filter(item=>!stashed.has(item.id));
}
export function normalizeFieldStashesV112(raw:unknown,items:readonly FieldSpecimenV112[]):FieldStashEntryV112[]|null {
  if(raw===undefined)return [];
  if(!Array.isArray(raw)||raw.length>384)return null;
  const entries:FieldStashEntryV112[]=[];
  for(const value of raw){
    if(!value||typeof value!=="object")return null;
    const e=value as FieldStashEntryV112;
    if(typeof e.specimenId!=="string"||!items.some(i=>i.id===e.specimenId)||entries.some(i=>i.specimenId===e.specimenId)||
      !number(e.x)||!number(e.y)||!number(e.fallSpeed)||e.fallSpeed<0||e.fallSpeed>1200)return null;
    entries.push({specimenId:e.specimenId,x:e.x,y:e.y,fallSpeed:e.fallSpeed});
  }
  return entries;
}
export function fieldStashGeometryValidV112(state:FieldStashStateV112,world:FieldStashWorldV112):boolean {
  const entries=normalizeFieldStashesV112(state.stashedSpecimensV112,state.specimensV112??[]);
  return !!entries&&entries.every(e=>e.x>=6&&e.x<=world.width-6&&e.y>=-10000&&e.y<=world.floorY+1e-6&&
    !world.platforms.some(p=>p.collision==="solid"&&e.x>p.x+1e-6&&e.x<p.x+p.width-1e-6&&e.y>p.y+1e-6&&e.y<p.y+p.height-1e-6));
}
export function fieldStashCanTakeV112(state:FieldStashStateV112,specimenId:string,actor:FieldStashActorV112,
  world:FieldStashWorldV112,armorId:ArmorId,depotFreeSlots=256):boolean {
  const entry=state.stashedSpecimensV112?.find(e=>e.specimenId===specimenId);
  const item=state.specimensV112?.find(i=>i.id===specimenId),carried=carriedFieldSpecimensV112(state);
  if(!entry||!item||!Number.isFinite(actor.health)||actor.health<=0||actor.grounded!==true||actor.climbing!==false||
    ![actor.x,actor.y,actor.width,actor.height,entry.x,entry.y].every(Number.isFinite)||
    actor.width<=0||actor.height<=0||Math.abs(entry.fallSpeed)>.01||carried.length>=depotFreeSlots)return false;
  const at={x:actor.x+actor.width/2,y:actor.y+actor.height/2},target={x:entry.x,y:entry.y-6};
  return Math.hypot(at.x-target.x,at.y-target.y)<=FIELD_STASH_REACH_V112&&
    !huntStructuralBarrierV94(at,target,world.platforms)&&tryCarrySpecimenV112(carried,item,armorId).ok;
}
export function moveFieldSpecimenV112<T extends FieldStashStateV112>(state:T,action:"drop"|"take",specimenId:string,
  actor:FieldStashActorV112,world:FieldStashWorldV112,armorId:ArmorId,
  options:{suspended:boolean;operationActive:boolean;depotFreeSlots?:number}):{accepted:boolean;state:T;message:string} {
  const refuse=(message:string)=>({accepted:false,state,message});
  if(options.suspended||options.operationActive||!Number.isFinite(actor.health)||actor.health<=0||actor.grounded!==true||actor.climbing!==false||
    ![actor.x,actor.y,actor.width,actor.height].every(Number.isFinite)||actor.width<=0||actor.height<=0)
    return refuse("Un appui stable et les mains libres sont nécessaires pour manipuler une prise.");
  const item=state.specimensV112?.find(i=>i.id===specimenId);
  if(!item)return refuse("Cette prise n'appartient pas à la chasse.");
  const entries=state.stashedSpecimensV112??[],stored=entries.find(e=>e.specimenId===specimenId);
  if(action==="drop"){
    if(stored)return refuse("Cette prise est déjà déposée.");
    const x=Math.max(6,Math.min(world.width-6,actor.x+actor.width/2)),y=actor.y+actor.height;
    if(huntStructuralBarrierV94({x,y:y-6},{x,y:y-6},world.platforms))return refuse("Pas d'espace libre pour déposer cette prise.");
    return {accepted:true,message:"Prise déposée ici. Elle reste unique et ne suivra pas votre extraction ; revenez la reprendre.",
      state:{...state,stashedSpecimensV112:[...entries,{specimenId:item.id,x,y,fallSpeed:0}]}};
  }
  if(action!=="take"||!stored)return refuse("Aucune prise déposée à reprendre.");
  if(!fieldStashCanTakeV112(state,specimenId,actor,world,armorId,options.depotFreeSlots??256))
    return refuse("Approchez la prise posée avec un appui et un sac assez libre ; aucune reprise à travers une paroi.");
  return {accepted:true,message:"Prise reprise dans le sac, sans second prélèvement ni usure d'outil.",
    state:{...state,stashedSpecimensV112:entries.filter(e=>e.specimenId!==specimenId)}};
}
/** Vertical swept contact keeps a deposited item on the ledge where it was put.
 * If a support disappears it falls, instead of remaining anchored in mid-air. */
export function stepFieldStashesV112<T extends FieldStashStateV112>(state:T,world:FieldStashWorldV112,delta:number):T {
  if(!Number.isFinite(delta)||delta<=0||delta>.1||!state.stashedSpecimensV112?.length)return state;
  let changed=false;
  const entries=state.stashedSpecimensV112.map(entry=>{
    const supported=entry.y>=world.floorY-1e-6||world.platforms.some(p=>
      entry.x+6>p.x&&entry.x-6<p.x+p.width&&Math.abs(entry.y-p.y)<=1e-6);
    if(supported&&entry.fallSpeed===0)return entry;
    const speed=Math.min(1200,entry.fallSpeed+1850*delta),nextY=Math.min(world.floorY,entry.y+speed*delta);
    let landing=nextY>=world.floorY?world.floorY:Infinity;
    for(const p of world.platforms){
      if(entry.x+6<=p.x||entry.x-6>=p.x+p.width||entry.y>p.y+1e-6||nextY<p.y)continue;
      landing=Math.min(landing,p.y);
    }
    const y=Number.isFinite(landing)?landing:nextY,fallSpeed=Number.isFinite(landing)?0:speed;
    if(y===entry.y&&fallSpeed===entry.fallSpeed)return entry;
    changed=true;return {...entry,y,fallSpeed};
  });
  return changed?{...state,stashedSpecimensV112:entries}:state;
}
