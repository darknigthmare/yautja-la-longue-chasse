import type { DiscoveryReactionV112 } from "./systems/corpseDiscoveryV112";

export const DISCOVERY_LABELS_V112 = {
  visual:"CORPS REPÉRÉ", radio:"RADIO · CORPS", scent:"ODEUR · CORPS",
  avoid:"ÉVITEMENT", inspect:"EXAMEN", guard:"GARDE",
} as const;
/** Original vector signals are drawn in the world without downloads or preload.
 * Shape plus a readable word conveys the same meaning independently of color. */
export function discoverySignalLabelV112(reaction:DiscoveryReactionV112):string {
  return reaction.response==="investigate"?DISCOVERY_LABELS_V112[reaction.channel]:DISCOVERY_LABELS_V112[reaction.response];
}
export function drawDiscoverySignalV112(context:CanvasRenderingContext2D,reaction:DiscoveryReactionV112,x:number,y:number):void {
  context.save();context.translate(x,y);context.globalAlpha=.96;
  context.fillStyle="#10231fee";context.fillRect(-66,-13,132,26);
  context.strokeStyle=reaction.channel==="radio"?"#8bd7ff":"#f1d49a";context.lineWidth=1.8;
  context.beginPath();
  if(reaction.response!=="investigate"){
    context.arc(-51,2,3,0,Math.PI*2);
    context.moveTo(-54,-5);context.arc(-55,-5,1.4,0,Math.PI*2);
    context.moveTo(-48,-6);context.arc(-49,-6,1.4,0,Math.PI*2);
    context.moveTo(-44,-3);context.arc(-45,-3,1.4,0,Math.PI*2);
  }else if(reaction.channel==="radio"){
    context.moveTo(-54,7);context.lineTo(-54,-6);context.lineTo(-49,-10);
    context.moveTo(-50,-4);context.arc(-54,1,7,-.75,.75);
    context.moveTo(-47,-7);context.arc(-54,1,11,-.75,.75);
  }else{
    context.ellipse(-53,0,8,5,0,0,Math.PI*2);
    context.moveTo(-50,0);context.arc(-53,0,2.4,0,Math.PI*2);
  }
  context.stroke();context.fillStyle="#f3f0df";context.font="700 9px sans-serif";
  context.textAlign="left";context.fillText(discoverySignalLabelV112(reaction),-39,3,101);
  context.restore();
}
