import type { HomeworldInteriorV64 } from './homeworldInteriorsV64';
import type { HomeworldFurnitureInstanceV72 } from './homeworldFurnitureV72';
import type { HomeworldInteriorDecorInstanceV76 } from './homeworldInteriorDecorV76';

export interface HomeworldPublicFurnitureV82 extends HomeworldFurnitureInstanceV72 {
  label: string; purpose: string; group: string;
}
export interface HomeworldPublicFittingsV82 {
  version: 'V82';
  purpose: string;
  furniture: readonly HomeworldPublicFurnitureV82[];
  decor: readonly HomeworldInteriorDecorInstanceV76[];
  validation: 'implemented-not-verified';
  lore: 'original-local-public-furnishing';
}

/** Authored fittings with V89 ground-placement clearance corrections. Keep every
 * native fixture identity, public floor, partition, service point and save anchor.
 * New positions are local unprojected ground coordinates, never CSS offsets.
 * Model clearance is tested separately; visual review is not asserted here. */
export function homeworldPublicFittingsV82(room: HomeworldInteriorV64): HomeworldInteriorV64 {
  const furniture: HomeworldPublicFurnitureV82[] = [];
  const decor: HomeworldInteriorDecorInstanceV76[] = [];
  const addFurniture = (suffix: string, artId: HomeworldFurnitureInstanceV72['artId'], x: number, y: number, scale: number,
    label: string, purpose: string, group: string) => furniture.push({ id: `${room.buildingId}-v82-${suffix}`, artId, x, y, scale, label, purpose, group });
  const addDecor = (suffix: string, artId: HomeworldInteriorDecorInstanceV76['artId'], x: number, y: number, scale: number, purpose: string) => decor.push({
    id: `${room.buildingId}-v82-${suffix}`, artId, x, y, scale, solid: true, purpose,
    placement: 'v82-authored-public-fittings-implemented-not-verified',
  });
  let purpose: string;
  switch (room.buildingId) {
    case 'trophy-mausoleum':
      purpose = 'Éclairage des réserves et contenants de préparation de la galerie ; les huit emplacements muraux continuent de recevoir exclusivement les trophées acquis.';
      addFurniture('register-lamp', 'resin-lantern', 180, 65, .45, 'Veille du registre',
        'Éclairage du mobilier de consultation existant, sans créer un autre registre interactif.', 'consultation');
      addFurniture('sealed-maintenance-containers', 'sealed-jars', 510, 145, .36, 'Contenants de conservation',
        'Réserve locale de conservation. Aucun crâne, relique, dossier de quête ni récompense n’est montré ou accordé.', 'conservation');
      addDecor('west-preparation-case', 'chest-diagonal', 182, 298, .5,
        'Contenant fermé de préparation des supports d’exposition, déposé dans la bande latérale du vestibule ; ce n’est pas un trophée.');
      addDecor('east-preparation-case', 'chest-diagonal', 416, 298, .5,
        'Contenant fermé des accessoires de consultation, distinct du service des Grandes Chasses et de ses gains.');
      break;
    case 'training-hall':
      purpose = 'Réserves des parures, marque de la travée de préparation et contenants du vestibule ; le maître et les exercices existants conservent leurs conditions.';
      addFurniture('preparation-containers', 'sealed-jars', 226, 224, .5, 'Contenants des exercices',
        'Rangement de préparation derrière la branche occidentale ; aucune arme canonique inventée ou équipement donné.', 'preparation');
      addFurniture('preparation-standard', 'clan-banner', 344, 224, .28, 'Marque locale de la travée',
        'Tentures du bâtiment local. Les glyphes peints restent des motifs originaux du jeu, pas une langue officielle reconstituée.', 'preparation');
      addDecor('west-vestibule-case', 'chest-diagonal', 201, 316, .42,
        'Contenant fermé des protections et accessoires d’exercice ; laissé sur le côté du vestibule, sans nouveau menu d’équipement.');
      addDecor('east-vestibule-case', 'chest-diagonal', 398, 316, .42,
        'Contenant fermé de la travée des aspirants ; le passage d’entrée et l’interaction avec le maître restent distincts.');
      break;
    case 'memory-vault':
      purpose = 'Réserves scellées, mobilier de consultation et contenants du vestibule ; seuls les dossiers et services déjà produits restent consultables.';
      addFurniture('west-register-containers', 'sealed-jars', 226, 314, .48, 'Réserve du registre',
        'Contenants fermés associés au bureau existant ; aucune nouvelle preuve ou information de quête n’est accordée.', 'registres');
      addFurniture('east-record-containers', 'sealed-jars', 486, 220, .45, 'Réserve des consultations',
        'Contenants latéraux hors de la console des archives. Leur contenu n’est pas simulé.', 'archives');
      addFurniture('west-record-standard', 'clan-banner', 224, 356, .45, 'Marque de la travée des registres',
        'Repère local original, sans attribuer un emblème officiel à un clan connu.', 'registres');
      addFurniture('consultation-desk', 'register-desk', 148, 319, .46, 'Poste de consultation du vestibule',
        'Mobilier non interactif où préparer une consultation ; ne duplique pas le gardien, la console ou les dossiers existants.', 'consultation');
      addDecor('east-consultation-case', 'chest-diagonal', 420, 422, .4,
        'Contenant fermé de la consultation dans la bande latérale du vestibule, sans dossier factice ou objet récupérable.');
      break;
    default:
      return room;
  }
  // Move the original rack, retaining its native image, scale and purpose. Its
  // old corner pose sealed the whole-body approach beside the west register.
  const orientedDecorV76 = room.buildingId === 'memory-vault'
    ? room.orientedDecorV76?.map(item => item.id === 'memory-vault-v76-0' ? { ...item, x: 48, y: 130 } : item)
    : room.orientedDecorV76;
  return { ...room, orientedDecorV76, publicFittingsV82: { version: 'V82', purpose, furniture, decor,
    validation: 'implemented-not-verified', lore: 'original-local-public-furnishing' } };
}
