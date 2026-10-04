import { HOMEWORLD_BUILDINGS } from './homeworldCity';
import { HOMEWORLD_NATIVE_CATALOGUE_V81, homeworldBuildingIdentityV81 } from './homeworldNativeArchitectureV81';
import { homeworldBuildingFootprintV64, homeworldBuildingDoorwayV64, homeworldBuildingSpriteScaleV64 } from './homeworldGeometryV64';
import type { HomeworldElementRecordV64 } from './homeworldElementCodexV64';

/** Nine placed volumes, not eleven interchangeable buildings: landscape and
 * paving sources have separate consumers. The measured native hull is the same
 * foundation as the actual collider, door and render source. */
export const HOMEWORLD_NATIVE_ARCHITECTURE_CODEX_V81: readonly HomeworldElementRecordV64[] = Object.entries(HOMEWORLD_NATIVE_CATALOGUE_V81.buildings)
  .map(([buildingId, assetId]) => {
    const building = HOMEWORLD_BUILDINGS.find(candidate => candidate.id === buildingId)!;
    const identity = homeworldBuildingIdentityV81(buildingId)!;
    const source = HOMEWORLD_NATIVE_CATALOGUE_V81.assets[assetId as keyof typeof HOMEWORLD_NATIVE_CATALOGUE_V81.assets];
    const art = building.art, scale = homeworldBuildingSpriteScaleV64(building);
    return { id: `v81-facade:${buildingId}`, label: `${identity.title} · ${building.label}`, category: 'building',
      districtId: building.districtId, spaceId: 'world', lore: 'original-adaptation',
      position: { x: building.x, y: building.y, z: 0 }, dimensions: { ...building.footprint, height: building.wallHeight },
      footprint: homeworldBuildingFootprintV64(building), door: homeworldBuildingDoorwayV64(building), asset: art.src,
      source: [{ label: 'OpenAI · source native V81 préservée', url: art.src,
        note: `${source.measurement.tool}; original ${source.measurement.sourceOriginal}; PNG ${art.sourceWidth} × ${art.sourceHeight}; SHA256 ${art.sha256}. ${source.measurement.animation}.` }],
      constraints: [`Rôle local ${identity.role}. Construction originale compatible avec le jeu ; ni plan canonique, ni monarchie universelle ou rite officiel affirmé.`,
        `Enveloppe physique ${building.footprint.width} × ${building.footprint.depth}; hauteur verticale ${building.wallHeight}. Le polygone de fondation de la fiche est le hull réel utilisé par la collision.`,
        `Source entière ${art.sourceWidth} × ${art.sourceHeight}; pivot de seuil ${JSON.stringify(art.threshold)}; alpha ${JSON.stringify(art.alphaBounds)}; échelle uniforme ${scale} u/px.`,
        art.groundSupportPixelsV81?.length ? `Appuis mesurés ${JSON.stringify(art.groundSupportPixelsV81)} dans le PNG ; polygone projeté une fois à la même échelle, sans rectangle de collision fictif.`
          : 'Façade frontale : le segment natif de fondation et la profondeur réelle produisent le même volume solide dans le moteur.',
        `Orientation native ${art.groundFrame?.yawDegrees ?? 0}° ; caméra yaw0/pitch35 inchangée, aucun miroir ou rotation CSS de la façade.`,
        'Seuil, jambages, approche et intérieur appartiennent au bâtiment existant ; aucun nouveau service, gain, accès royal ou objet collectable.',
        'Illustration statique native. Les anciennes sources V72/V75/V76 restent préservées comme archives et ne remplacent pas ce volume runtime.'],
    } satisfies HomeworldElementRecordV64;
  });
