import authored from '../data/homeworldPublicPlacesV112.json';
import {HOMEWORLD_STREET_COMPOSITION_ART_V92,compileHomeworldStreetCompositionV92,
  type HomeworldStreetCompositionInputV92,type HomeworldStreetCompositionPropV92} from './homeworldStreetCompositionV92';
import {homeworldStreetDecorPolygonV84,homeworldStreetDecorUsageV84,homeworldStreetDecorSafetyV84} from './homeworldStreetDecorV84';
import {homeworldStreetDecorOverlapV83} from './homeworldStreetDecorV83';
import type {HomeworldLevelV77} from './homeworldWorldV77';

type Point={readonly x:number;readonly y:number};
export type HomeworldPublicPlaceV112=HomeworldStreetCompositionPropV92;
export const HOMEWORLD_PUBLIC_PLACE_ART_V112=HOMEWORLD_STREET_COMPOSITION_ART_V92;
export const HOMEWORLD_PUBLIC_PLACE_CANDIDATES_V112:readonly HomeworldPublicPlaceV112[]=authored.placements.map(item=>({
  ...item,levelId:item.levelId as HomeworldLevelV77,interactive:false,solid:true,
}));
export const HOMEWORLD_PUBLIC_PLACE_COMPOSITIONS_V112=authored.compositions;
export const homeworldPublicPlacePolygonV112=(item:HomeworldPublicPlaceV112)=>homeworldStreetDecorPolygonV84(item,HOMEWORLD_PUBLIC_PLACE_ART_V112);
export const homeworldPublicPlaceUsageV112=(item:HomeworldPublicPlaceV112)=>homeworldStreetDecorUsageV84(item,HOMEWORLD_PUBLIC_PLACE_ART_V112);
export const homeworldPublicPlaceSafetyV112=(item:HomeworldPublicPlaceV112)=>homeworldStreetDecorSafetyV84(item,HOMEWORLD_PUBLIC_PLACE_ART_V112);

export let HOMEWORLD_PUBLIC_PLACES_V112:readonly HomeworldPublicPlaceV112[]=[];
export let HOMEWORLD_PUBLIC_PLACE_REFUSALS_V112:readonly {id:string;reason:string}[]=[];
let initialized=false;
const contacts=new Map<string,readonly Point[]>();

export function compileHomeworldPublicPlacesV112(input:HomeworldStreetCompositionInputV92,
  candidates:readonly HomeworldPublicPlaceV112[]=HOMEWORLD_PUBLIC_PLACE_CANDIDATES_V112) {
  return compileHomeworldStreetCompositionV92(input,candidates);
}

/** The late provider mounts exact candidates after all earlier native places.
 * World may import this collision registry without importing the mount and
 * therefore without reading an incompletely initialized World collection. */
export function configureHomeworldPublicPlacesV112(input:HomeworldStreetCompositionInputV92) {
  if (initialized) return;
  initialized=true;
  const result=compileHomeworldPublicPlacesV112(input);
  HOMEWORLD_PUBLIC_PLACES_V112=result.accepted;
  HOMEWORLD_PUBLIC_PLACE_REFUSALS_V112=result.refusals;
  for (const item of result.accepted) contacts.set(item.id,homeworldPublicPlacePolygonV112(item));
}

export function homeworldPublicPlaceCollisionV112(levelId:HomeworldLevelV77,point:Point,
  body={halfWidth:24,halfDepth:14}):string|null {
  for (const item of HOMEWORLD_PUBLIC_PLACES_V112) {
    if (item.levelId!==levelId) continue;
    const polygon=contacts.get(item.id)!;
    if (!body.halfWidth && !body.halfDepth) {
      let positive=false,negative=false;
      for (let i=0;i<polygon.length;i++) {
        const a=polygon[i],b=polygon[(i+1)%polygon.length];
        const side=(b.x-a.x)*(point.y-a.y)-(b.y-a.y)*(point.x-a.x);
        if (side>1e-8) positive=true;
        else if (side< -1e-8) negative=true;
      }
      if (!positive || !negative) return item.id;
    } else if (homeworldStreetDecorOverlapV83(polygon,[
      {x:point.x-body.halfWidth,y:point.y-body.halfDepth},
      {x:point.x+body.halfWidth,y:point.y-body.halfDepth},
      {x:point.x+body.halfWidth,y:point.y+body.halfDepth},
      {x:point.x-body.halfWidth,y:point.y+body.halfDepth},
    ])) return item.id;
  }
  return null;
}
