import { homeworldRoutePlanV109, type HomeworldRouteOriginV109 } from './systems/homeworldWayfindingV109';
import { homeworldCargoGeometryKeyV109 } from './systems/homeworldNavigationV109';
import type { SaveGame } from './types';

globalThis.onmessage = (event: MessageEvent<{ save: SaveGame; origin: HomeworldRouteOriginV109; destinationId: string; geometryKey: string }>) => {
  try {
    const { save, origin, destinationId, geometryKey } = event.data;
    if (geometryKey !== homeworldCargoGeometryKeyV109(save.homeworld.cargoV108)) throw new Error('snapshot');
    globalThis.postMessage({ plan: homeworldRoutePlanV109(save, origin, destinationId) });
  } catch {
    globalThis.postMessage({ error: 'Le calcul du passage a échoué. Réessaie depuis une rue ou un palier.' });
  }
};
