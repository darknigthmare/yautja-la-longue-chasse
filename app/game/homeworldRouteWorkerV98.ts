import { homeworldRoutePlanV98, type HomeworldRouteOriginV98 } from './systems/homeworldWayfindingV98';
import type { SaveGame } from './types';

/** Collision-heavy searches run off the UI thread. The host owns one worker,
 * validates the campaign identity, and can terminate any abandoned request. */
globalThis.onmessage = (event: MessageEvent<{ save: SaveGame; origin: HomeworldRouteOriginV98; destinationId: string }>) => {
  try {
    const { save, origin, destinationId } = event.data;
    globalThis.postMessage({ plan: homeworldRoutePlanV98(save, origin, destinationId) });
  } catch {
    globalThis.postMessage({ error: 'Le calcul du passage a échoué. Réessaie depuis une rue ou un palier.' });
  }
};
