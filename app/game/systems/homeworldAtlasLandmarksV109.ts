import type { SaveGame } from '../types';
import { homeworldAtlasLandmarksV83, type HomeworldAtlasLandmarkV83 } from './homeworldAtlasLandmarksV83';
import { homeworldArchivePlaqueLandmarksV109 } from './homeworldArchivePlaqueLandmarksV109';
import { homeworldCargoMapLotsV109 } from './homeworldNavigationV109';
import { HOMEWORLD_CARGO_V108 } from './homeworldCargoDefinitionV108';

/** New live landmarks extend the historical atlas; they never alter its
 * records or reveal an unvisited district. */
export function homeworldAtlasLandmarksV109(save?: SaveGame): readonly HomeworldAtlasLandmarkV83[] {
  const cargo: HomeworldAtlasLandmarkV83[] = save?.homeworld.visitedDistrictIds.includes('port')
    ? homeworldCargoMapLotsV109(save.homeworld.cargoV108).filter(lot => lot.place !== 'carried').map(lot => {
      const definition = HOMEWORLD_CARGO_V108.lots.find(item => item.id === lot.id)!;
      const stand = lot.place === 'source' ? definition.stand : { x: lot.x, y: lot.y + 60 };
      return { id: 'cargo-lot-' + lot.id + '-v109', label: lot.label, detail: 'Emplacement confirmé du lot identifié ; une seule charge se porte à la fois.',
        levelId: '0', district: 'Quai', category: 'evidence', buildingId: null, pointId: null, regionId: null,
        position: { x: stand.x, y: stand.y - 55 }, access: 'open', reason: 'Le guide rejoint le lot sans le prendre, le déplacer ou changer son propriétaire.',
        keywords: ['cargaison', 'lot', lot.id === 'wide' ? 'large' : 'étroit'] };
    }) : [];
  return [...homeworldAtlasLandmarksV83(save), ...cargo, ...homeworldArchivePlaqueLandmarksV109(save)];
}
