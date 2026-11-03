import {HOMEWORLD_STREET_COMPOSITION_INPUT_V92,HOMEWORLD_STREET_COMPOSITION_PROPS_V92} from './homeworldStreetCompositionMountV92';
import {homeworldStreetCompositionPolygonV92,homeworldStreetCompositionUsageV92,homeworldStreetCompositionSafetyV92} from './homeworldStreetCompositionV92';
import {configureHomeworldPublicPlacesV112} from './homeworldPublicPlacesV112';
import type {HomeworldStreetCompositionInputV92} from './homeworldStreetCompositionV92';
import {HOMEWORLD_ACTOR} from './homeworldCity';
import {HOMEWORLD_CARTOGRAPHY_V104} from './homeworldCartographyDefinitionV104';

// V104 already records a physical approach to this retained V92 planter.
// Keep the full native body and the ordinary route's 12-unit clearance;
// a new decorative marker must not occupy that earned walking destination.
const cartographyApproach=HOMEWORLD_CARTOGRAPHY_V104.waypoints[0];
const cartographyClearance={x:HOMEWORLD_ACTOR.halfWidth+12,y:HOMEWORLD_ACTOR.halfDepth+12};
const cartographyReserve={id:'native-cartography-approach:'+cartographyApproach.id,
  levelId:HOMEWORLD_CARTOGRAPHY_V104.levelId,polygon:[
    {x:cartographyApproach.x-cartographyClearance.x,y:cartographyApproach.y-cartographyClearance.y},
    {x:cartographyApproach.x+cartographyClearance.x,y:cartographyApproach.y-cartographyClearance.y},
    {x:cartographyApproach.x+cartographyClearance.x,y:cartographyApproach.y+cartographyClearance.y},
    {x:cartographyApproach.x-cartographyClearance.x,y:cartographyApproach.y+cartographyClearance.y},
  ]};
import {HOMEWORLD_ACTIVITY_ACCESS_RESERVES_V112} from './homeworldActivityAccessV112';

/** Every older contact, operator face, warm reserve, resident route and native
 * facade keeps priority. The registry never searches or moves a refusal. */
export const HOMEWORLD_PUBLIC_PLACE_INPUT_V112:HomeworldStreetCompositionInputV92={
  ...HOMEWORLD_STREET_COMPOSITION_INPUT_V92,
  reserves:[...HOMEWORLD_STREET_COMPOSITION_INPUT_V92.reserves,cartographyReserve,
    ...HOMEWORLD_ACTIVITY_ACCESS_RESERVES_V112,
    ...HOMEWORLD_STREET_COMPOSITION_PROPS_V92.flatMap(item=>[
      homeworldStreetCompositionPolygonV92(item),homeworldStreetCompositionUsageV92(item),homeworldStreetCompositionSafetyV92(item),
    ].flatMap((polygon,index)=>polygon?[{id:'preserved-v92:'+item.id+':'+index,levelId:item.levelId,polygon}]:[])),
  ],
};
configureHomeworldPublicPlacesV112(HOMEWORLD_PUBLIC_PLACE_INPUT_V112);
export {HOMEWORLD_PUBLIC_PLACES_V112,HOMEWORLD_PUBLIC_PLACE_REFUSALS_V112} from './homeworldPublicPlacesV112';
