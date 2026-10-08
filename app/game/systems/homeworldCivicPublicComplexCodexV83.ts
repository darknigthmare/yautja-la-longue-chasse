import { HOMEWORLD_BUILDINGS } from './homeworldCity';
import { HOMEWORLD_INTERIORS_V64 } from './homeworldInteriorsV64';
import type { HomeworldElementRecordV64 } from './homeworldElementCodexV64';
import { HOMEWORLD_STREET_DECOR_ART_V83, homeworldStreetDecorPolygonV83, homeworldStreetDecorUsageV83 } from './homeworldStreetDecorV83';

/** These descriptions use the final live plans. They describe authored public
 * spaces and intended passages, not additional actions or successful QA. Native
 * furniture, oriented decor and panels retain their individual V64/V72/V76
 * records, derived from those same final placements. */
export const HOMEWORLD_CIVIC_PUBLIC_COMPLEX_CODEX_V83: readonly HomeworldElementRecordV64[] = HOMEWORLD_INTERIORS_V64
  .filter(room => room.publicComplexV83)
  .flatMap(room => {
    const complex = room.publicComplexV83!, building = HOMEWORLD_BUILDINGS.find(item => item.id === room.buildingId)!;
    const common = { districtId: building.districtId, spaceId: room.buildingId,
      lore: 'original-adaptation' as const, door: null, asset: null, source: [] };
    const validation = 'Reprise V89 : tests du modèle exécutés sur les 43 intérieurs actifs avec demi-largeur/profondeur 24/14 puis marge 28/18 ; supports, services, sorties et repères contrôlés. Lint, TypeScript et compilation locale passent. Aspect navigateur, mobile, production jouée et fidélité 1:1 non certifiés.';
    const records: HomeworldElementRecordV64[] = [{ ...common, id: `v83-public-complex:${room.buildingId}`,
      label: room.title, category: 'interior', position: { x: 0, y: 0, z: 0 },
      dimensions: { width: room.width, depth: room.depth, height: building.wallHeight }, footprint: null,
      constraints: [complex.purpose, validation,
        `Enveloppe extérieure ${building.footprint.width} × ${building.footprint.depth} ; surface intérieure conservée ${room.width} × ${room.depth}.`,
        `${room.zones?.length ?? 0} zones fonctionnelles, ${room.partitions?.length ?? 0} parois basses existantes repositionnées et ${complex.passages.length} traversées composées.`,
        `Décor natif individuel : ${room.props.length} props historiques, ${room.furniture?.length ?? 0} meubles, ${room.orientedDecorV76?.length ?? 0} modules orientés et ${complex.nativeProps.length} comptoir ou établi natif V83.`,
        'Les anciens IDs des meubles, zones, cloisons et services sont conservés ; des modules environnementaux supplémentaires ne donnent aucun accès, récompense ou interaction.',
        'Apparition, sortie, points de service et conditions de progression inchangés. Les collisions utilisent les props et cloisons réels ; cette fiche ne modifie pas le moteur.',
        'Les angles latéraux et diagonaux proviennent des PNG natifs V76 ; aucune chaise générique tournée ou étirée ne simule un autre angle.',
        ...(complex.kind === 'clan' ? ['C’ntlip : table clan-lodge-v72-role-east à 403.5 ; 90, hôte clan-table-healer à 330 ; 130 et approche à 404 ; 130, inchangés. Le nouveau décor ne simule aucun rite ou soin automatique.'] : []),
        'Composition publique originale dans la ville du jeu ; aucune mesure officielle, arme canonique nouvelle ou reproduction 1:1 affirmée.'] }];
    for (const item of complex.nativeProps) {
      const art = HOMEWORLD_STREET_DECOR_ART_V83[item.artId], polygon = homeworldStreetDecorPolygonV83(item), usage = homeworldStreetDecorUsageV83(item);
      const footprint = { left: Math.min(...polygon.map(p => p.x)), right: Math.max(...polygon.map(p => p.x)),
        top: Math.min(...polygon.map(p => p.y)), bottom: Math.max(...polygon.map(p => p.y)), polygon };
      records.push({ ...common, id: item.id, label: item.label, category: 'prop', position: { x: item.x, y: item.y, z: 0 },
        dimensions: { width: footprint.right - footprint.left, depth: footprint.bottom - footprint.top, height: art.heightWorld * item.scale },
        footprint, asset: art.src, source: [{ label: 'Mobilier natif OpenAI V83', url: art.src,
          note: `SHA256 ${art.sha256}. Source ${art.sourceWidth} × ${art.sourceHeight}, cellule ${JSON.stringify(art.sourceRect)} ; ${art.metrology}.` }],
        constraints: [item.purpose, validation,
          `Angle natif ${art.facing} ; pivot pixel ${JSON.stringify(art.pivot)} ; échelle uniforme ×${item.scale}. Aucun miroir, étirement ou rotation CSS.`,
          'Hull de contact dérivé des appuis de la source et déprojeté à 35° ; collision polygonale du corps, tri de profondeur et codex utilisent le même placement local.',
          `Bord d’usage ${JSON.stringify(art.workingEdge)} ; bande d’usage composée ${JSON.stringify(usage)}. Elle décrit l’intention, sans revendication de contrôle corporel ou visuel.`,
          'Le dessin et ses objets fusionnés forment une seule source et une seule instance ; ils ne sont pas comptés comme plusieurs sprites individuels.',
          'Décor statique non interactif ; aucun nouveau service, outil collectable, fabrication, rang ou récompense.'] });
    }
    for (const passage of complex.passages) {
      const horizontal = passage.orientation === 'horizontal';
      records.push({ ...common, id: `v83-public-passage:${passage.id}`, label: `Traversée composée · ${passage.id}`,
        category: 'floor', position: { x: passage.x, y: passage.y, z: 0 },
        dimensions: { width: horizontal ? passage.width : 12, depth: horizontal ? 12 : passage.width, height: 0 },
        footprint: null, constraints: [validation,
          `Repère de traversée ${passage.orientation}, largeur de composition ${passage.width} unités. Ce repère n’est ni une porte ni un nouveau plancher physique.`,
          'Aucun bloqueur, téléporteur ou action associé. Les volumes des meubles et parois environnants déterminent le passage réel.',
          'Le centre de ce repère est atteint depuis le spawn avec le corps entier et sa marge ; chaque unité des arêtes du parcours est contrôlée. La largeur de composition ne certifie pas une largeur libre intégrale.'] });
    }
    for (const activity of complex.activities) {
      const zone = room.zones!.find(item => item.id === activity.zoneId)!;
      records.push({ ...common, id: `v83-public-activity:${activity.id}`, label: activity.label,
        category: 'interior', position: { x: zone.x, y: zone.y, z: 0 },
        dimensions: { width: zone.width, depth: zone.depth, height: building.wallHeight }, footprint: null,
        constraints: [validation, `Zone réelle v72-zone:${zone.id} ; état ${activity.status}.`,
          'L’activité indique la fonction visuelle du mobilier ; elle ne déclenche pas une fabrication, un achat, un soin, un dialogue ou une consommation supplémentaire.',
          'Les interactions déjà produites restent exclusivement celles des points de service historiques et de leurs conditions.'] });
    }
    return records;
  });
