import { HOMEWORLD_INTERIORS_V64 } from './homeworldInteriorsV64';
import { HOMEWORLD_BUILDINGS } from './homeworldCity';
import { HOMEWORLD_FURNITURE_ART_V72, homeworldFurnitureFootprintV72 } from './homeworldFurnitureV72';
import { HOMEWORLD_INTERIOR_DECOR_ART_V76, homeworldInteriorDecorBoundsV76 } from './homeworldInteriorDecorV76';
import type { HomeworldElementRecordV64 } from './homeworldElementCodexV64';

/** Placement data comes from the same additive public models as rendering and
 * collision. This catalogue records implementation, not completed QA. No old
 * native file, fixture identity or interaction binding is replaced. */
export const HOMEWORLD_PUBLIC_FITTINGS_CODEX_V82: readonly HomeworldElementRecordV64[] = HOMEWORLD_INTERIORS_V64
  .filter(room => room.publicFittingsV82)
  .flatMap(room => {
    const fittings = room.publicFittingsV82!, building = HOMEWORLD_BUILDINGS.find(candidate => candidate.id === room.buildingId)!;
    const common = { districtId: building.districtId, spaceId: room.buildingId, lore: 'original-adaptation' as const, door: null };
    const validation = 'Lot implémenté, non vérifié : aucun test, audit, lint, compilation ou examen navigateur de ces nouveaux placements n’a été exécuté.';
    const records: HomeworldElementRecordV64[] = [{ ...common, id: `v82-public-fittings:${room.buildingId}`,
      label: `Mobilier public · ${room.title}`, category: 'interior', position: { x: 0, y: 0, z: 0 },
      dimensions: { width: room.width, depth: room.depth, height: building.wallHeight }, footprint: null, asset: null,
      source: [], constraints: [fittings.purpose, validation,
        'Ajout dans l’enveloppe utile existante, sans agrandissement, déplacement de cloison, changement de porte ou d’ancre de reprise.',
        'Tableaux de mobilier historiques et sources natives conservés. Les fiches propres à ce lot détaillent chaque support, usage et orientation.',
        'La galerie reste liée aux trophées possédés ; les contenants de stockage ne produisent ni trophée, dossier, preuve, équipement ou rang.',
        'Composition locale originale, sans affirmation de coutume universelle ou de reproduction canonique 1:1.'] }];
    for (const item of fittings.furniture) {
      const art = HOMEWORLD_FURNITURE_ART_V72[item.artId], scale = item.scale ?? 1;
      records.push({ ...common, id: item.id, label: item.label, category: 'prop', position: { x: item.x, y: item.y, z: 0 },
        dimensions: { width: art.footprintWorld.width * scale, depth: art.footprintWorld.depth * scale, height: art.heightWorld * scale },
        footprint: homeworldFurnitureFootprintV72(item), asset: art.src,
        source: [{ label: 'Mobilier natif V72 conservé', url: art.src,
          note: `Cellule ${JSON.stringify(art.sourceRect)}; SHA256 ${art.sha256}. Source historique réemployée sans édition.` }],
        constraints: [item.purpose, `Groupe fonctionnel ${item.group}.`, validation,
          `Pivot avant ${JSON.stringify(art.pivot)}; échelle uniforme ${scale}; silhouette verticale native, projetée au sol une fois.`,
          'Rectangle arrière au pivot utilisé par la collision réelle. Le tri au sol et l’atténuation du mobilier suivent le renderer natif existant.',
          'Objet purement environnemental, non interactif ; aucun point de service ou accès supplémentaire.'] });
    }
    for (const item of fittings.decor) {
      const art = HOMEWORLD_INTERIOR_DECOR_ART_V76[item.artId], bounds = homeworldInteriorDecorBoundsV76(item);
      records.push({ ...common, id: item.id, label: `${art.label} · ${room.title}`, category: 'prop', position: { x: item.x, y: item.y, z: 0 },
        dimensions: { width: bounds.right - bounds.left, depth: bounds.bottom - bounds.top, height: art.heightWorld * item.scale },
        footprint: bounds, asset: art.src,
        source: [{ label: 'Vue orientée native V76 conservée', url: art.src,
          note: `Cellule ${JSON.stringify(art.sourceRect)}; appuis ${JSON.stringify(art.groundSupportPixels)}; SHA256 ${art.sha256}.` }],
        constraints: [item.purpose, validation,
          `Orientation peinte ${art.orientation}; pivot natif ${JSON.stringify(art.pivot)}; échelle uniforme ${item.scale}, sans rotation ou miroir CSS.`,
          'Support asymétrique issu de la source native, partagé par le placement, la collision et le dessin.',
          'Rangement fermé décoratif : aucun contenu de quête inventé ou récompense implicite.',
          'Position originale locale dans la bande de mobilier ; les circuits et points de service existants ne sont pas déplacés.'] });
    }
    return records;
  });
