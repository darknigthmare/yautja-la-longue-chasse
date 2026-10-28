import {HOMEWORLD_STREET_COMPOSITION_INPUT_V92,HOMEWORLD_STREET_COMPOSITION_PROPS_V92} from './homeworldStreetCompositionMountV92';
import {homeworldStreetCompositionPolygonV92,homeworldStreetCompositionUsageV92,homeworldStreetCompositionSafetyV92} from './homeworldStreetCompositionV92';
import {configureHomeworldPublicPlacesV112} from './homeworldPublicPlacesV112';
import type {HomeworldStreetCompositionInputV92} from './homeworldStreetCompositionV92';

/** Every older contact, operator face, warm reserve, resident route and native
 * facade keeps priority. The registry never searches or moves a refusal. */
export const HOMEWORLD_PUBLIC_PLACE_INPUT_V112:HomeworldStreetCompositionInputV92={
  ...HOMEWORLD_STREET_COMPOSITION_INPUT_V92,
  reserves:[...HOMEWORLD_STREET_COMPOSITION_INPUT_V92.reserves,
    ...HOMEWORLD_STREET_COMPOSITION_PROPS_V92.flatMap(item=>[
      homeworldStreetCompositionPolygonV92(item),homeworldStreetCompositionUsageV92(item),homeworldStreetCompositionSafetyV92(item),
    ].flatMap((polygon,index)=>polygon?[{id:'preserved-v92:'+item.id+':'+index,levelId:item.levelId,polygon}]:[])),
  ],
};
configureHomeworldPublicPlacesV112(HOMEWORLD_PUBLIC_PLACE_INPUT_V112);
export {HOMEWORLD_PUBLIC_PLACES_V112,HOMEWORLD_PUBLIC_PLACE_REFUSALS_V112} from './homeworldPublicPlacesV112';
