import type {FieldStashStateV112} from "./systems/fieldStashV112";
/** Original procedural field pouch. The same world position drives its glyph,
 * pickup range and checkpoint; there is no independent decorative pickup. */
export function drawFieldStashesV112(context:CanvasRenderingContext2D,state:FieldStashStateV112):void{
  for(const entry of state.stashedSpecimensV112??[]){
    const item=state.specimensV112?.find(i=>i.id===entry.specimenId);if(!item)continue;
    context.save();context.translate(entry.x,entry.y);
    context.fillStyle="#09251dcc";context.beginPath();context.ellipse(0,1,14,4,0,0,Math.PI*2);context.fill();
    context.fillStyle="#9d8b55";context.strokeStyle="#f6e4b0";context.lineWidth=1.6;
    context.beginPath();context.moveTo(-8,-1);context.lineTo(-10,-14);context.quadraticCurveTo(0,-22,10,-14);
    context.lineTo(8,-1);context.closePath();context.fill();context.stroke();
    context.strokeStyle="#233b2b";context.beginPath();context.moveTo(-8,-13);context.lineTo(8,-13);
    context.moveTo(0,-17);context.lineTo(0,-4);context.stroke();
    context.fillStyle="#eff4c9";context.font="bold 10px system-ui, sans-serif";context.textAlign="center";
    context.fillText("SAC",0,-27);context.restore();
  }
}
