/** The lift first lets the hunter step onto its fixed floor, then raises that
 * floor. The existing total duration is preserved. A cabin must not drift
 * sideways along the shaft because activation accepts a nearby approach. */
export function homeworldTransitFractionsV82(kind:'stairs'|'ramp'|'lift',elapsed:number,duration:number){
 const t=Math.max(0,Math.min(1,elapsed/duration));
 return kind==='lift'?{boarding:Math.min(1,t/.08),travel:Math.max(0,(t-.08)/.92)}:{boarding:t,travel:t};
}
