import { HOMEWORLD_BUILDINGS } from './homeworldCity';
import { HOMEWORLD_INTERIORS_V64 } from './homeworldInteriorsV64';
import { homeworldPortNativePropArtV84, homeworldPortNativePolygonV84, homeworldPortNativeUsageV84 } from './homeworldPortPublicComplexV84';
import type { HomeworldElementRecordV64 } from './homeworldElementCodexV64';

/** Exact final port plans; V74 records already derive the same current
 * furniture, low partitions, zones and traversal IDs. These entries add the
 * public-complex intent, native polygons and honest non-action descriptions. */
export const HOMEWORLD_PORT_PUBLIC_COMPLEX_CODEX_V84: readonly HomeworldElementRecordV64[] = HOMEWORLD_INTERIORS_V64
  .filter(room => room.portComplexV84)
  .flatMap(room => {
    const layout = room.portComplexV84!, building = HOMEWORLD_BUILDINGS.find(item => item.id === room.buildingId)!;
    const common = { districtId: building.districtId, spaceId: room.buildingId,
      lore: 'original-adaptation' as const, door: null, source: [], asset: null };
    const validation = 'Reprise V89 : tests du modèle exécutés sur les 43 intérieurs actifs avec demi-largeur/profondeur 24/14 puis marge 28/18 ; supports, services, sorties et repères contrôlés. Lint, TypeScript et compilation locale passent. Aspect navigateur, mobile, production jouée et fidélité 1:1 non certifiés.';
    const records: HomeworldElementRecordV64[] = [{ ...common, id: `v84-port-complex:${room.buildingId}`,
      label: room.title, category: 'interior', position: { x: 0, y: 0, z: 0 },
      dimensions: { width: room.width, depth: room.depth, height: building.wallHeight }, footprint: null,
      constraints: [layout.purpose, validation,
        `Enveloppe extérieure ${building.footprint.width} × ${building.footprint.depth} et intérieur ${room.width} × ${room.depth} conservés.`,
        `${room.zones?.length ?? 0} espaces, ${room.partitions?.length ?? 0} cloisons basses, ${layout.passages.length} repères de traversée. Leurs IDs et volumes actuels figurent dans les fiches V74 associées.`,
        `${room.furniture?.length ?? 0} cellules de mobilier V72, ${room.orientedDecorV76?.length ?? 0} instances orientées V76 et ${layout.nativeProps.length} props natifs V83/V84 montés.`,
        'Props, services, preuve, points, conditions de progression, spawn, exit et bâtiment sont ceux du système historique ; leurs IDs ne sont pas remplacés.',
        'Les nouveaux noms d’activité décrivent le décor, pas un atelier interactif, un service de transport, un objet récupérable, un soin ou une récompense.',
        ...(layout.kind === 'dock' ? ['Officier dock-officer-point à108/144 et preuve suspect-trophy-point à410/172, inchangés. Le stockage ajouté ne contient pas de nouvelle pièce d’enquête.'] : []),
        'Les repères de traversée sont atteints par le test de flood4unités ; leur largeur affichée décrit la composition, pas une largeur libre intégrale ou une qualité esthétique certifiée.',
        'Aménagement original compatible avec la ville du jeu ; aucun véhicule, plan officiel, dimension canonique ou fidélité1:1 affirmé.'] }];
    for (const item of layout.nativeProps) {
      const art = homeworldPortNativePropArtV84(item), polygon = homeworldPortNativePolygonV84(item), usage = homeworldPortNativeUsageV84(item);
      const footprint = { left: Math.min(...polygon.map(p => p.x)), right: Math.max(...polygon.map(p => p.x)),
        top: Math.min(...polygon.map(p => p.y)), bottom: Math.max(...polygon.map(p => p.y)), polygon };
      records.push({ ...common, id: item.id, label: item.label, category: 'prop', position: { x: item.x, y: item.y, z: 0 },
        dimensions: { width: footprint.right - footprint.left, depth: footprint.bottom - footprint.top, height: art.heightWorld * item.scale }, footprint,
        asset: art.src, source: [{ label: `Source native OpenAI ${item.sourceVersion}`, url: art.src,
          note: `SHA256 ${art.sha256} ; source ${art.sourceWidth} × ${art.sourceHeight}, cellule ${JSON.stringify(art.sourceRect)}, ${art.metrology}.` }],
        constraints: [item.purpose, validation,
          `Face observée ${art.facing}, pivot pixel ${JSON.stringify(art.pivot)}, échelle uniforme ×${item.scale}. Rendu natif sans rotation, miroir ou étirement.`,
          'Contacts source déprojetés une fois ; hull polygonal local partagé entre collision du corps, renderer, profondeur au sol et codex.',
          `Bande d’usage composée ${JSON.stringify(usage)}. La face de travail indique une intention, pas une approche contrôlée ou une animation d’action produite.`,
          'Le dessin et ses accessoires fusionnés restent une seule source et une seule instance. Objet environnemental statique non interactif.'] });
    }
    for (const activity of layout.activities) {
      const zone = room.zones!.find(item => item.id === activity.zoneId)!;
      records.push({ ...common, id: `v84-port-activity:${activity.id}`, label: activity.label, category: 'interior',
        position: { x: zone.x, y: zone.y, z: 0 }, dimensions: { width: zone.width, depth: zone.depth, height: building.wallHeight }, footprint: null,
        constraints: [validation, `Zone actuelle v74-zone:${zone.id} ; état ${activity.status}.`,
          'Fonction visuelle du mobilier uniquement ; aucun agent supplémentaire, contrôle de cargaison, commande, livraison ou maintenance jouable ajouté.',
          'Les seules interactions demeurent celles des points historiques et de leurs conditions de campagne.'] });
    }
    return records;
  });
