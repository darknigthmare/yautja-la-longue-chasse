import type {WarRulesV6} from "./clanWarBibleV6";
import type {WarMissionActorV115} from "./clanWarOperationsV115";

/** V141 assault exchange — pure and order-independent. Original game rule:
 * each fighter alive at tick start may act once, even if downed by that
 * simultaneous exchange. No ranged hits through other enemy formations,
 * teleportation, campaign XP or new units. */
export interface WarAssaultContactV141 {
 actors:WarMissionActorV115[];
 ownBaseDamage:number;rivalBaseDamage:number;
 shots:{attackerId:string;targetId:string;damage:number}[];
 advancements:{actorId:string;from:number;to:number}[];
}
const clamp=(x:number,min:number,max:number)=>Math.max(min,Math.min(max,x));
const sourceUnit=(rules:WarRulesV6,id:string)=>rules.units.find(u=>u.id===id);

export function warAssaultContactV141(
 original:readonly WarMissionActorV115[],rules:WarRulesV6,
 heldUntil:Readonly<Record<string,number>>,tick:number,
):WarAssaultContactV141{
 const alive=original.filter(a=>a.hp>0);
 const harm=new Map<string,number>();
 const shots:WarAssaultContactV141["shots"]=[];
 const movers:{actor:WarMissionActorV115;speed:number}[]=[];
 for(const actor of alive){
  const unit=sourceUnit(rules,actor.unitId);
  const range=clamp((unit?.range??1)*2+3,5,22);
  const hostile=alive.filter(other=>other.side!==actor.side&&other.hp>0)
   .sort((a,b)=>Math.abs(actor.x-a.x)-Math.abs(actor.x-b.x)||a.id.localeCompare(b.id))[0];
  if(hostile&&Math.abs(actor.x-hostile.x)<=range){
   const damage=clamp(Math.ceil((unit?.attack??3)/3),2,15);
   harm.set(hostile.id,(harm.get(hostile.id)??0)+damage);
   shots.push({attackerId:actor.id,targetId:hostile.id,damage});
  }else if(!(actor.side==="ally"&&actor.teamId&&
     (heldUntil[actor.teamId]??0)>tick)){
   movers.push({actor,speed:clamp(2+(unit?.mobility??1)*.25,2,5)});
  }
 }
 const next=original.map(a=>({...a,hp:Math.max(0,a.hp-(harm.get(a.id)??0))}));
 const amendments=new Map<string,number>();
 const moving=new Set(movers.map(x=>x.actor.id));
 // Players behind their own line do not overtake a defender. Their
 // deployment x=5 may coincide; distinct destinations are reserved.
 const reserved=new Set(next.filter(a=>a.hp>0&&!moving.has(a.id)).map(a=>a.x));
 movers.sort((a,b)=>a.actor.side===b.actor.side?
  (a.actor.side==="ally"?b.actor.x-a.actor.x:a.actor.x-b.actor.x)||
  a.actor.id.localeCompare(b.actor.id):
  a.actor.side.localeCompare(b.actor.side));
 for(const {actor,speed} of movers){
  const dir=actor.side==="ally"?1:-1;
  let to=clamp(actor.x+dir*speed,6,94);
  const blockers=alive.filter(a=>a.id!==actor.id&&
    (a.x-actor.x)*dir>0&&(a.x-to)*dir<=0);
  if(blockers.length){
   const near=blockers.sort((a,b)=>Math.abs(a.x-actor.x)-Math.abs(b.x-actor.x))[0];
   to=dir===1?Math.min(to,near.x-1):Math.max(to,near.x+1);
  }
  // Contested landing squares are disallowed instead of stacking units.
  // A 0.5 m line gap is enough for the small 1D simulation sprites.
  while((to-actor.x)*dir>0&&reserved.has(to))to-=dir*.5;
  to=(to-actor.x)*dir>0?to:actor.x;
  amendments.set(actor.id,to);reserved.add(to);
 }
 let ownBaseDamage=0,rivalBaseDamage=0;
 for(const actor of next){
  if(amendments.has(actor.id))actor.x=amendments.get(actor.id)!;
  if(actor.hp<=0)continue;
  const unit=sourceUnit(rules,actor.unitId);
  const damage=clamp(Math.ceil((unit?.attack??3)/3),2,15)*3;
  // Existing base-contact rule. The 1D edge cannot be crossed.
  if(actor.side==="ally"&&actor.x>=94){rivalBaseDamage+=damage;actor.x=94;}
  else if(actor.side==="rival"&&actor.x<=6){ownBaseDamage+=damage;actor.x=6;}
 }
 return {actors:next,ownBaseDamage,rivalBaseDamage,shots,advancements:
  movers.map(({actor})=>({actorId:actor.id,from:actor.x,
   to:amendments.get(actor.id)??actor.x}))};
}
