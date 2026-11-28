import type { ClanShipNpcId } from './clanShipOperations';

/** Noms originaux du projet et épithètes françaises employées à bord. */
export const CLAN_SHIP_CREW_NAMES = {
  'ash-scar': 'Dhar’sek « Balafre de Cendre »',
  'star-watch': 'Osh’veli « Veille des Astres »',
  'iron-claw': 'Korr’dhak « Griffe de Fer »',
  'cold-trace': 'Kesh’var « Trace Froide »',
  'black-suture': 'Nha’serk « Suture Noire »',
  'threshold-guard': 'Thar’zek « Garde du Seuil »',
} as const satisfies Record<ClanShipNpcId, string>;
