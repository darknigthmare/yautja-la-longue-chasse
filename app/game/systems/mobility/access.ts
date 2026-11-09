import type { SaveGame } from '../../types';
import { HOMEWORLD_INTERIORS_V64, nearestHomeworldInteriorTargetV64 } from '../homeworldInteriorsV64';
import { evaluateClanShipAccess } from '../clanShipOperations';
/** The commercial service belongs to the existing forge counter, not a global menu. */
export function atMobilityForge(save: Pick<SaveGame,'homeworld'|'createdAt'|'prologue'>): boolean {
  if (!evaluateClanShipAccess(save).allowed) return false;
  const p=save.homeworld.locationV77;
  if (!p || p.ownerCreatedAt!==save.createdAt || p.interiorId!=='deep-forge' || !p.local) return false;
  const room=HOMEWORLD_INTERIORS_V64.find(r=>r.buildingId==='deep-forge');
  const target=room?nearestHomeworldInteriorTargetV64(room,p.local):null;
  return target?.kind==='point' && target.pointId==='forge-service';
}
