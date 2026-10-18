import native from '../data/homeworldInteriorDecorArtV76.json';
import placements from '../data/homeworldInteriorDecorPlacementsV76.json';
import type {HomeworldNativeSpriteCellV64} from '../HomeworldNativePropV64';
import type {HomeworldInteriorV64} from './homeworldInteriorsV64';

/** Independent V76 IDs: older furniture IDs, source pixels and services stay intact. */
export type HomeworldInteriorDecorArtIdV76=keyof typeof native;
export interface HomeworldInteriorDecorArtV76 extends HomeworldNativeSpriteCellV64{
  readonly scaleWorldPerPixel:number;
  readonly groundBoundsWorld:{readonly left:number;readonly right:number;readonly top:number;readonly bottom:number};
  readonly groundSupportPixels:{readonly left:number;readonly right:number;readonly top:number;readonly bottom:number};
  readonly orientation:string;readonly sha256:string;readonly label:string;readonly purpose:string;
  readonly alphaThreshold:number;readonly measurement:string;readonly lore:string;
  readonly camera:{readonly yaw:number;readonly pitch:number;readonly projection:string;readonly objectOrientation:string};
  readonly provenance:{readonly tool:string;readonly sourceFile:string;readonly reference:string;readonly pixels:string;readonly selection:string};
}
export const HOMEWORLD_INTERIOR_DECOR_ART_V76:Readonly<Record<HomeworldInteriorDecorArtIdV76,HomeworldInteriorDecorArtV76>>=native;
export interface HomeworldInteriorDecorInstanceV76{
  readonly id:string;readonly artId:HomeworldInteriorDecorArtIdV76;
  /** Unprojected anchor of the source's frontmost measured support. */
  readonly x:number;readonly y:number;readonly scale:number;
  readonly solid:boolean;readonly purpose:string;readonly placement:string;
}
export function homeworldInteriorDecorBoundsV76(item:HomeworldInteriorDecorInstanceV76){
  const b=HOMEWORLD_INTERIOR_DECOR_ART_V76[item.artId].groundBoundsWorld,s=item.scale;
  return{left:item.x+b.left*s,right:item.x+b.right*s,top:item.y+b.top*s,bottom:item.y+b.bottom*s};
}
export function homeworldInteriorDecorTouchesV76(item:HomeworldInteriorDecorInstanceV76,p:{x:number;y:number},actor={halfWidth:24,halfDepth:14}){
  if(!item.solid)return false;const b=homeworldInteriorDecorBoundsV76(item);
  return p.x+actor.halfWidth>b.left&&p.x-actor.halfWidth<b.right&&p.y+actor.halfDepth>b.top&&p.y-actor.halfDepth<b.bottom;
}
/** Authoring is offline, deterministic and route-validated; never place randomly at runtime. */
export function homeworldDecoratedInteriorV76(room:HomeworldInteriorV64):HomeworldInteriorV64{
  const authored=placements[room.buildingId as keyof typeof placements]??[];
  return{...room,orientedDecorV76:authored as readonly HomeworldInteriorDecorInstanceV76[]};
}
export function homeworldInteriorDecorCodexV76(room:HomeworldInteriorV64){
  return(room.orientedDecorV76??[]).map(item=>{
    const art=HOMEWORLD_INTERIOR_DECOR_ART_V76[item.artId];return{id:item.id,buildingId:room.buildingId,
      label:art.label,purpose:item.purpose,lore:art.lore,orientation:art.orientation,anchor:{x:item.x,y:item.y},
      groundBounds:homeworldInteriorDecorBoundsV76(item),pivotPixels:art.pivot,sourceRect:art.sourceRect,
      scale:item.scale,uniformScaleWorldPerPixel:art.scaleWorldPerPixel*item.scale,solid:item.solid,
      sha256:art.sha256,src:art.src,camera:art.camera,measurement:art.measurement,
      clearance:room.portComplexV84?'V84 authored port-complex placements implemented, not tested or visually reviewed.':
        room.publicComplexV83?'V83 authored public-complex placements implemented, not tested or visually reviewed.':
        'Every existing point, zone, exit and passage validated with full actor footprint plus four units.',
      interaction:'Pure scenery: no reward, collection, healing, rank or service.'};
  });
}
