import catalogue from '../data/homeworldNativeArchitectureV81.json';
import type {HomeworldNativeBuildingArtV64} from './homeworldGeometryV64';

export interface HomeworldNativeIdentityV81 {
  title:string; role:string; depth:number; width:number;
  art:HomeworldNativeBuildingArtV64;
  lore:'LORE_COMPATIBLE_ORIGINAL';
}
/** One larger placed instance keeps the original source catalogue and pixels.
 * Its 408u preserved room needs the original 32u wall allowance; scale both
 * ground axes together so the native support, doorway and painting agree. */
export const HOMEWORLD_NATIVE_INSTANCE_SCALES_V89:Readonly<Record<string,{numerator:number;denominator:number}>>={
 'residence-terraces-1':{numerator:11,denominator:10},
};
/** Independent immutable native volumes. Their measured front plane replaces
 * the legacy painting and physical foundation together, never a CSS rotation.
 * Identifiers, doors, story services and save ownership remain unchanged. */
export function homeworldBuildingIdentityV81(id:string):HomeworldNativeIdentityV81|null {
  const assetId=(catalogue.buildings as Record<string,string>)[id];
  const identity=assetId?(catalogue.assets as unknown as Record<string,HomeworldNativeIdentityV81>)[assetId]??null:null;
  const scale=HOMEWORLD_NATIVE_INSTANCE_SCALES_V89[id];
  return identity&&scale?{...identity,width:identity.width*scale.numerator/scale.denominator,
   depth:identity.depth*scale.numerator/scale.denominator}:identity;
}
export const HOMEWORLD_NATIVE_SCENE_SOURCES_V81=Object.values(catalogue.assets).map(item=>({
  src:item.art.src,sourceWidth:item.art.sourceWidth,sourceHeight:item.art.sourceHeight,kind:'scene' as const,
}));
export const HOMEWORLD_NATIVE_CATALOGUE_V81=catalogue;
