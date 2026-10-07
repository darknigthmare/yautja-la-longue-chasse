import {homeworldStreetDecorWorldInputV84} from './homeworldWorldV77';
import {HOMEWORLD_CIVIC_PROPS_V80,homeworldCivicPolygonV80} from './homeworldCivicDecorV80';
import {HOMEWORLD_URBAN_PROPS_V78,HOMEWORLD_CITY_GENERATED_PROPS_V78} from './homeworldStreetModulesV78';
import {HOMEWORLD_URBAN_EXTRAS_V78} from './homeworldUrbanPopulationV78';
import {homeworldCourtPolygonV80} from './homeworldCourtArtV80';
import {homeworldCityNativePolygonV78} from './homeworldCityNativePlacementV78';
import {homeworldUsageEnvelopesV81} from './homeworldUsageEnvelopesV81';
import {homeworldUrbanRectV78,homeworldUrbanCorridorV78} from './homeworldUrbanLayoutV78';
import {HOMEWORLD_STREET_DECOR_PROPS_V83,homeworldStreetDecorPolygonV83,homeworldStreetDecorUsageV83} from './homeworldStreetDecorV83';
import {configureHomeworldStreetDecorV84,type HomeworldStreetDecorReserveV84} from './homeworldStreetDecorV84';

/** Mount after the older runtime collections, without importing their live
 * values into World. Existing furniture and declared use faces win over every
 * new V84 candidate; rejected placements remain in their authoring catalogue. */
const existing=[
 ...HOMEWORLD_CIVIC_PROPS_V80.map(p=>({id:p.id,artId:p.artId,levelId:p.levelId,polygon:homeworldCivicPolygonV80(p)})),
 ...HOMEWORLD_URBAN_PROPS_V78.map(p=>({id:p.id,artId:p.artId,levelId:p.levelId,polygon:homeworldCourtPolygonV80(p)})),
 ...HOMEWORLD_CITY_GENERATED_PROPS_V78.map(p=>({id:p.id,artId:p.artId,levelId:p.levelId,polygon:homeworldCityNativePolygonV78(p)})),
];
const reserves:HomeworldStreetDecorReserveV84[]=[
 ...existing.flatMap(p=>{const use=homeworldUsageEnvelopesV81(p.artId,p.polygon).usage;
  return[{id:'preserved-native:'+p.id,levelId:p.levelId,polygon:p.polygon},...(use?[{id:'preserved-native-use:'+p.id,levelId:p.levelId,polygon:homeworldUrbanRectV78(use.left,use.top,use.right,use.bottom)}]:[])];
 }),
 ...HOMEWORLD_STREET_DECOR_PROPS_V83.flatMap(p=>{const use=homeworldStreetDecorUsageV83(p);
  return[{id:'preserved-street-v83:'+p.id,levelId:p.levelId,polygon:homeworldStreetDecorPolygonV83(p)},...(use?[{id:'preserved-street-use-v83:'+p.id,levelId:p.levelId,polygon:use}]:[])];
 }),
 ...HOMEWORLD_URBAN_EXTRAS_V78.flatMap(r=>r.path.slice(1).map((p,index)=>({id:'preserved-extra:'+r.id+':'+index,levelId:r.levelId,polygon:homeworldUrbanCorridorV78(r.path[index],p,48,38)}))),
];
export const HOMEWORLD_STREET_DECOR_INPUT_V84=homeworldStreetDecorWorldInputV84(reserves);
configureHomeworldStreetDecorV84(HOMEWORLD_STREET_DECOR_INPUT_V84);
export {HOMEWORLD_STREET_DECOR_PROPS_V84,HOMEWORLD_STREET_DECOR_REFUSALS_V84} from './homeworldStreetDecorV84';
