import type { ClanShipNpcId } from './systems/clanShipOperations';
import type { HomeworldNpcVariantRoleV84 } from './systems/homeworldNpcVariantsV84';

/** Original clan characters reuse individual, stationary Yautja drawings.
 * These assignments do not imply new canonical characters or walk cycles. */
export const CLAN_SHIP_CREW_ART_ROLES: Record<ClanShipNpcId, HomeworldNpcVariantRoleV84> = {
  'ash-scar': 'instructor',
  'star-watch': 'dock-officer',
  'iron-claw': 'forge-master',
  'cold-trace': 'guide',
  'black-suture': 'healer',
  'threshold-guard': 'guard',
};

export const clanShipCrewArtIdentity = (id: ClanShipNpcId): string => `clan-ship-crew:${id}`;
