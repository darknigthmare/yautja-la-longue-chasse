import facades from '../data/homeworldArchitectureArtV76.json';
import interior from '../data/homeworldInteriorDecorArtV76.json';
import exterior from '../data/homeworldExteriorArtV76.json';
import {HOMEWORLD_FURNITURE_ART_V72} from './homeworldFurnitureV72';

/** Only immutable URL/size metadata is held here. New physical scenery must
 * decode before controls resume, so a cold PNG cannot hide a solid obstacle. */
export const HOMEWORLD_SCENE_ASSETS_V76=[...new Map([
  ...Object.values(facades).map(identity=>identity.art),...Object.values(interior),...Object.values(exterior),...Object.values(HOMEWORLD_FURNITURE_ART_V72),
].map(art=>[art.src,{src:art.src,sourceWidth:art.sourceWidth,sourceHeight:art.sourceHeight,kind:'scene' as const}])).values()];
