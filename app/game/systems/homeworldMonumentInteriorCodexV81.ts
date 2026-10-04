import { HOMEWORLD_INTERIORS_V64 } from './homeworldInteriorsV64';
import { HOMEWORLD_BUILDINGS } from './homeworldCity';
import { HOMEWORLD_FURNITURE_ART_V72, homeworldFurnitureFootprintV72 } from './homeworldFurnitureV72';
import { HOMEWORLD_INTERIOR_DECOR_ART_V76, homeworldInteriorDecorBoundsV76 } from './homeworldInteriorDecorV76';
import { homeworldCivilianArtV72 } from './homeworldIdentityV72';
import type { HomeworldElementRecordV64 } from './homeworldElementCodexV64';

/** Exact public-complex records. V72 already enumerates palace walls, zones and
 * furniture; this collection supplements those records without duplicating IDs.
 * Nothing here is a canonical map, a new service, a private suite or a reward. */
export const HOMEWORLD_MONUMENT_INTERIOR_CODEX_V81: readonly HomeworldElementRecordV64[] = HOMEWORLD_INTERIORS_V64
  .filter(room => room.monumentLayoutV81)
  .flatMap(room => {
    const building = HOMEWORLD_BUILDINGS.find(candidate => candidate.id === room.buildingId)!;
    const layout = room.monumentLayoutV81!;
    const common = { districtId: building.districtId, spaceId: room.buildingId, lore: 'original-adaptation' as const, door: null,
      source: [{ label: 'Plan monumental public V81 du jeu', url: '/game/homeworld/v64/interior-panels.png',
        note: 'Disposition originale. Volumes réels et appuis mesurés dans les modèles de collision, pas plan officiel de Yautja Prime.' }] };
    const records: HomeworldElementRecordV64[] = [{ ...common, id: `v81-monument:${room.buildingId}`, label: room.title, category: 'interior',
      position: { x: 0, y: 0, z: 0 }, dimensions: { width: room.width, depth: room.depth, height: building.wallHeight },
      footprint: { left: 0, right: room.width, top: 0, bottom: room.depth }, asset: null,
      constraints: [room.description,
        `Enveloppe extérieure ${layout.exteriorEnvelope.width} × ${layout.exteriorEnvelope.depth}; intérieur utile ${room.width} × ${room.depth}.`,
        `${room.zones?.length ?? 0} espaces publics et ${layout.passages.length} passages de 200 unités, reliés par le déplacement réel.`,
        'Les suites privées et les étages non produits ne sont pas simulés. Identifiants des services, éligibilité et progression conservés.'] }];
    for (const passage of layout.passages) records.push({ ...common, id: `v81-passage:${passage.id}`, label: `Passage · ${room.title}`, category: 'door',
      position: { x: passage.x, y: passage.y, z: 0 },
      dimensions: { width: passage.orientation === 'horizontal' ? passage.width : 16, depth: passage.orientation === 'vertical' ? passage.width : 16, height: 128 },
      footprint: null, asset: null, door: { threshold: { x: passage.x, y: passage.y }, approach: { x: passage.x, y: passage.y }, clearWidth: passage.width, clearHeight: 128 },
      constraints: ['Ouverture réelle entre les cloisons en coupe ; aucune porte factice ou téléportation.',
        `Largeur ${passage.width} unités ; accès contrôlé avec le corps entier et quatre unités de marge.`,
        'Le passage n’ajoute aucune action, autorisation royale, preuve, récompense ou rang.'] });
    if (room.buildingId === 'rite-sanctum') {
      for (const wall of room.partitions ?? []) records.push({ ...common, id: `v81-partition:${wall.id}`, label: `Paroi en coupe · ${room.title}`, category: 'panel',
        position: { x: wall.x, y: wall.y, z: 0 }, dimensions: { width: wall.width, depth: wall.depth, height: wall.cutawayHeight },
        footprint: { left: wall.x, right: wall.x + wall.width, top: wall.y, bottom: wall.y + wall.depth }, asset: '/game/homeworld/v64/interior-panels.png',
        constraints: ['Paroi native basse en coupe, clips indépendants sans étirement.', 'Même empreinte au sol pour le dessin et la collision.',
          'Les trois passages du Conseil sont définis dans leurs fiches ; aucun mur invisible ajouté.'] });
      for (const zone of room.zones ?? []) records.push({ ...common, id: `v81-zone:${zone.id}`, label: zone.label, category: 'interior',
        position: { x: zone.x, y: zone.y, z: 0 }, dimensions: { width: zone.width, depth: zone.depth, height: building.wallHeight },
        footprint: { left: zone.x, right: zone.x + zone.width, top: zone.y, bottom: zone.y + zone.depth }, asset: null,
        constraints: ['Espace public relié à pied au vestibule dans l’enveloppe réelle.', 'Une limite de zone ne crée aucune barrière invisible.',
          'Organisation originale de cette cité ; aucun rite ou modèle de conseil universel affirmé.'] });
      for (const item of room.furniture ?? []) {
        const art = HOMEWORLD_FURNITURE_ART_V72[item.artId], scale = item.scale ?? 1;
        records.push({ ...common, id: `v81-furniture:${item.id}`, label: `${item.artId} · ${room.title}`, category: 'prop',
          position: { x: item.x, y: item.y, z: 0 }, dimensions: { width: art.footprintWorld.width * scale, depth: art.footprintWorld.depth * scale, height: art.heightWorld * scale },
          footprint: homeworldFurnitureFootprintV72(item), asset: art.src,
          constraints: [art.lore, `Cellule native ${JSON.stringify(art.sourceRect)}; pivot ${JSON.stringify(art.pivot)}; échelle uniforme ${scale}; SHA256 ${art.sha256}.`,
            'Support physique réel derrière le pivot avant, sans passage à travers le mobilier.', 'Mobilier indépendant ; aucun objet récupérable ni nouveau service.'] });
      }
    }
    for (const item of room.monumentDecorV81 ?? []) {
      const art = HOMEWORLD_INTERIOR_DECOR_ART_V76[item.artId], bounds = homeworldInteriorDecorBoundsV76(item);
      records.push({ ...common, id: item.id, label: art.label, category: 'prop', position: { x: item.x, y: item.y, z: 0 },
        dimensions: { width: bounds.right - bounds.left, depth: bounds.bottom - bounds.top, height: art.heightWorld * item.scale },
        footprint: bounds, asset: art.src, constraints: [item.purpose,
          `Orientation native ${art.orientation}; échelle uniforme ${item.scale}, aucun miroir ou rotation CSS; SHA256 ${art.sha256}.`,
          `Pivot natif ${JSON.stringify(art.pivot)} ; appuis asymétriques mesurés dans le PNG.`,
          'Appui réel solide testé avec meubles, cloisons, passages et marge du corps entier. Aucun gain implicite.'] });
    }
    for (const npc of room.monumentInhabitantsV81 ?? []) {
      const art = homeworldCivilianArtV72(npc.role);
      records.push({ ...common, id: `npc:${npc.id}`, label: npc.label, category: 'npc', position: { x: npc.x, y: npc.y, z: 0 },
        dimensions: { width: 32, depth: 20, height: 100 }, footprint: { left: npc.x - 16, right: npc.x + 16, top: npc.y - 10, bottom: npc.y + 10 }, asset: art.src,
        constraints: [`Identité native ${npc.role}, cellule ${JSON.stringify(art.sourceRect)}, pieds au pivot peint.`,
          'Présence stationnaire non interactive ; illustration native au repos, aucun nouveau clip de geste ou dialogue.',
          'Corps solide contrôlé avec les vrais meubles et murs ; placé hors de l’axe de circulation.',
          'Personnage contextuel anonyme, sans mission, récompense, service ni rang créé.'] });
    }
    return records;
  });
