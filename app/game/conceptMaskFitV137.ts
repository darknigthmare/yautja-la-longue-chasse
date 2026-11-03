/** V137: source-verified 256×384 alpha bounds for original V133 concept masks.
 * Entire bitmap placement only: no resizing and no official PHG UV claims.
 * Values derived from the seven published, SHA-pinned RGBA WebP sprites.
 */
import {conceptBiomaskV133} from "./conceptBiomasksV133.ts";
type Bounds={left:number;top:number;right:number;bottom:number};
export const CONCEPT_MASK_ALPHA_BOUNDS_V137:Readonly<Record<string,Bounds>>=Object.freeze({
 "concept-v133-requiem":{left:80,top:17,right:158,bottom:99},
 "concept-v133-nova":{left:79,top:17,right:158,bottom:98},
 "concept-v133-instinct":{left:78,top:17,right:158,bottom:97},
 "concept-v133-glypic":{left:78,top:17,right:158,bottom:98},
 "concept-v133-tyrant":{left:78,top:17,right:158,bottom:97},
 "concept-v133-warlord":{left:80,top:17,right:156,bottom:97},
 "concept-v133-paroxysm":{left:78,top:17,right:158,bottom:98},
});
export function conceptMaskRigPlacementV137(id:unknown){
 if(!conceptBiomaskV133(id))return null;
 const b=CONCEPT_MASK_ALPHA_BOUNDS_V137[String(id)];
 if(!b)return null;
 return {x:Math.round(147-(b.left+b.right)/2),
   y:Math.round(60-(b.top+b.bottom)/2),width:256,height:384};
}
export function conceptMaskAlignedBoundsV137(id:unknown){
 const p=conceptMaskRigPlacementV137(id),b=CONCEPT_MASK_ALPHA_BOUNDS_V137[String(id)];
 return p&&b?{left:b.left+p.x,right:b.right+p.x,top:b.top+p.y,bottom:b.bottom+p.y}:null;
}
