type ProjectedPoint={x:number;y:number};

/** Paint layout only: the exact exposed-edge quad and its physical support
 * remain V81. The original bitmap has an architectural cornice near its top;
 * vertically tiling it creates another bridge below the actual floor edge.
 * A face-local tile spans the entire quad, so only its first native row paints.
 * Pixels keep one uniform scale and horizontal repetition; no shear/rotation. */
export function homeworldFoundationPaintV90(a:ProjectedPoint,b:ProjectedPoint,drop:number,
 source:{sourceWidth:number;sourceHeight:number}){
 const width=1050,imageHeight=source.sourceHeight*width/source.sourceWidth;
 const left=Math.min(a.x,b.x),top=Math.min(a.y,b.y),faceHeight=Math.abs(b.y-a.y)+drop;
 return{left,top,width,imageHeight,rowHeight:Math.max(imageHeight,faceHeight)+1,
  faceHeight,transform:`translate(${left} ${top})`};
}
