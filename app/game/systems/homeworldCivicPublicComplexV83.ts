import type { HomeworldInteriorV64 } from './homeworldInteriorsV64';
import type { HomeworldInteriorPartitionV72, HomeworldInteriorZoneV72 } from './homeworldFunctionalInteriorsV72';
import type { HomeworldFurnitureInstanceV72 } from './homeworldFurnitureV72';
import type { HomeworldInteriorDecorInstanceV76 } from './homeworldInteriorDecorV76';
import { homeworldStreetDecorPolygonV83, type HomeworldStreetDecorPropV83 } from './homeworldStreetDecorV83';

export interface HomeworldCivicPublicComplexV83 {
  version: 'V83'; kind: 'market' | 'forge' | 'clan';
  purpose: string;
  passages: readonly { id: string; x: number; y: number; width: number; orientation: 'horizontal' | 'vertical' }[];
  activities: readonly { id: string; label: string; zoneId: string; status: 'scenery-existing-services-only' }[];
  nativeProps: readonly HomeworldStreetDecorPropV83[];
  validation: 'implemented-not-verified';
  lore: 'original-public-complex-in-preserved-envelope';
}
type Pose = readonly [x: number, y: number];

/** Local interior contact uses the same native polygon as drawing and codex.
 * Zero-width/depth queries are supported without adding imaginary body size. */
export function homeworldInteriorNativePolygonTouchesV83(polygon: readonly { x: number; y: number }[], point: { x: number; y: number }, body: { halfWidth: number; halfDepth: number }): boolean {
  const rectangle = [{ x: point.x - body.halfWidth, y: point.y - body.halfDepth },
    { x: point.x + body.halfWidth, y: point.y - body.halfDepth },
    { x: point.x + body.halfWidth, y: point.y + body.halfDepth },
    { x: point.x - body.halfWidth, y: point.y + body.halfDepth }];
    for (const shape of [polygon, rectangle]) for (let index = 0; index < shape.length; index++) {
      const a = shape[index], b = shape[(index + 1) % shape.length], nx = a.y - b.y, ny = b.x - a.x;
      if (!nx && !ny) continue;
      const nativeProjection = polygon.map(p => p.x * nx + p.y * ny), actorProjection = rectangle.map(p => p.x * nx + p.y * ny);
      if (Math.max(...nativeProjection) <= Math.min(...actorProjection) || Math.max(...actorProjection) <= Math.min(...nativeProjection)) return false;
    }
    return true;
}
export function homeworldInteriorNativeTouchesV83(room: HomeworldInteriorV64, point: { x: number; y: number }, body: { halfWidth: number; halfDepth: number }): boolean {
  return (room.publicComplexV83?.nativeProps ?? []).some(item => homeworldInteriorNativePolygonTouchesV83(homeworldStreetDecorPolygonV83(item), point, body));
}

/** Three different public plans within their existing exterior envelopes.
 * IDs of services and older fixtures are retained; an activity label describes
 * scenery, not a new crafting/healing/collection action. No QA is asserted. */
export function homeworldCivicPublicComplexV83(room: HomeworldInteriorV64): HomeworldInteriorV64 {
  if (!['market-armory', 'deep-forge', 'clan-lodge'].includes(room.buildingId)) return room;
  const prefix = room.buildingId;
  const extraFurniture: HomeworldFurnitureInstanceV72[] = [];
  const extraDecor: HomeworldInteriorDecorInstanceV76[] = [];
  const nativeProps: HomeworldStreetDecorPropV83[] = [];
  const native = (suffix: string, artId: string, x: number, y: number, scale: number, label: string, purpose: string) => {
    nativeProps.push({ id: `${prefix}-v83-${suffix}`, artId, x, y, scale, label, purpose,
      levelId: '0', districtId: prefix === 'market-armory' ? 'market' : 'forges', buildingId: prefix,
      interactive: false, solid: true });
  };
  const furnish = (suffix: string, artId: HomeworldFurnitureInstanceV72['artId'], x: number, y: number, scale: number) => {
    extraFurniture.push({ id: `${prefix}-v83-${suffix}`, artId, x, y, scale });
  };
  const oriented = (suffix: string, artId: HomeworldInteriorDecorInstanceV76['artId'], x: number, y: number, scale: number, purpose: string) => {
    extraDecor.push({ id: `${prefix}-v83-${suffix}`, artId, x, y, scale, solid: true, purpose,
      placement: 'v83-authored-public-complex-implemented-not-verified' });
  };
  const zone = (id: string, label: string, x: number, y: number, width: number, depth: number): HomeworldInteriorZoneV72 => ({
    id: `${prefix}-${id}`, label, x, y, width, depth,
  });
  const wall = (index: number, x: number, y: number, width: number, depth: number): HomeworldInteriorPartitionV72 => ({
    id: room.partitions![index].id, x, y, width, depth, orientation: width > depth ? 'horizontal' : 'vertical', cutawayHeight: 36,
  });
  const passage = (suffix: string, x: number, y: number, width: number, orientation: 'horizontal' | 'vertical' = 'horizontal') => ({
    id: `${prefix}-v83-${suffix}`, x, y, width, orientation,
  });
  let kind: HomeworldCivicPublicComplexV83['kind'];
  let title: string, purpose: string;
  let zones: HomeworldInteriorZoneV72[], partitions: HomeworldInteriorPartitionV72[];
  let furniturePoses: Readonly<Record<string, Pose>>, propPoses: readonly Pose[], decorPoses: readonly Pose[];
  let passages: HomeworldCivicPublicComplexV83['passages'];
  if (prefix === 'market-armory') {
    kind = 'market'; title = 'Marché · halle d’équipement des délégations';
    purpose = 'Parures et échanges à l’ouest, réserve et préparation à l’est, comptoir de réception et halle traversante au centre. L’artisane et l’équipement conservent leurs conditions existantes.';
    zones = [zone('foyer', 'Accueil des délégations', 20, 290, 498, 58),
      zone('west', 'Parures et présentation de l’artisane', 20, 20, 178, 160),
      zone('east', 'Réserve et préparation des équipements', 354, 20, 164, 166),
      zone('v83-hall', 'Halle publique traversante', 198, 20, 156, 268),
      zone('v83-reception', 'Réception et préparation des échanges', 20, 212, 178, 68)];
    partitions = [wall(0, 20, 186, 44, 12), wall(1, 332, 20, 12, 64),
      wall(2, 482, 200, 36, 12), wall(3, 20, 30, 12, 24)];
    furniturePoses = { 'role-west': [124, 84], 'role-east': [404, 84],
      'foyer-light-west': [44, 120], 'foyer-light-east': [505, 230], 'banner-east': [400, 164] };
    propPoses = [[82, 344], [481, 336], [44, 164], [486, 182]];
    decorPoses = [[32, 293], [512, 272], [504, 80]];
    furnish('reception-register', 'register-desk', 134, 230, .55);
    native('stock-counter', 'merchant-counter-left', 416, 216, .85, 'Comptoir latéral de préparation',
      'Comptoir natif à angle gauche dans l’aile de préparation des équipements ; face d’échange vers la halle, aucune vente ou récompense supplémentaire.');
    furnish('stock-standard', 'clan-banner', 502, 124, .36);
    oriented('departure-case', 'chest-diagonal', 377, 350, .48,
      'Contenant fermé des équipements en attente dans la bande de départ ; aucun objet récupérable ni équipement supplémentaire.');
    passages = [passage('central-hall', 269, 196, 168), passage('artisan-approach', 134.5, 166, 144), passage('stock-branch', 402, 196, 168)];
  } else if (prefix === 'deep-forge') {
    kind = 'forge'; title = 'Forge · préparation, inspection et matériaux';
    purpose = 'Poste de l’artisan, préparation des parures et réserve scellée desservent une allée publique distincte de la manutention. Aucune arme canonique inventée, fabrication gratuite ou matière collectable ajoutée.';
    zones = [zone('foyer', 'Allée publique des commandes', 208, 20, 146, 268),
      zone('west', 'Inspection et réglage de l’artisan', 20, 20, 188, 124),
      zone('east', 'Réserve des matériaux et outils', 354, 20, 164, 134),
      zone('v83-preparation', 'Préparation des parures', 20, 164, 188, 70),
      zone('v83-loading', 'Manutention des lots fermés', 354, 174, 164, 114)];
    partitions = [wall(0, 20, 224, 64, 12), wall(1, 196, 20, 12, 70),
      wall(2, 458, 156, 60, 12), wall(3, 364, 234, 44, 12)];
    furniturePoses = { 'role-west': [124, 74], 'role-east': [403.5, 90],
      'foyer-light-west': [58, 214], 'foyer-light-east': [504, 250], 'banner-east': [399, 145] };
    propPoses = [[54, 282], [480, 282], [42, 160], [488, 212]];
    decorPoses = [[496, 74], [512, 142]];
    native('preparation-bench', 'forge-bench-right', 126, 194, .85, 'Établi latéral de préparation',
      'Établi natif à angle droit dans la bande de préparation des parures ; l’artisan historique reste l’unique service de fabrication.');
    furnish('loading-crates', 'convoy-crates', 400, 216, .65);
    furnish('sealed-preparation-stock', 'sealed-jars', 400, 280, .45);
    oriented('inspection-case', 'chest-diagonal', 124, 298, .4,
      'Contenant fermé de l’inspection des parures ; le poste de forge existant reste l’unique service de fabrication.');
    passages = [passage('public-traverse', 269, 154, 144), passage('inspection-approach', 134.5, 144, 144), passage('loading-branch', 402, 236, 160)];
  } else {
    kind = 'clan'; title = 'Loge des clans · soins, accueil et repos';
    purpose = 'Aile des soins, salle commune, repos latéral et rangement des délégations sont distincts. La table, l’hôte et l’approche C’ntlip existants restent aux coordonnées V77 ; entrer ne soigne pas et ne crée aucun rite.';
    zones = [zone('foyer', 'Traverse des délégations', 208, 20, 108, 388),
      zone('west', 'Aile publique des soins', 20, 20, 212, 196),
      zone('east', 'Salle commune et table de relève', 316, 20, 202, 196),
      zone('v83-supplies', 'Réserves de l’accueil', 20, 244, 196, 164),
      zone('v83-rest', 'Alcôve de repos des visiteurs', 352, 244, 166, 164)];
    partitions = [wall(0, 20, 216, 44, 12), wall(1, 232, 20, 12, 128),
      wall(2, 482, 216, 36, 12), wall(3, 316, 232, 12, 32)];
    furniturePoses = { 'role-west': [134.5, 100], 'role-east': [403.5, 90],
      'foyer-light-west': [44, 198], 'foyer-light-east': [505, 194], 'banner-east': [205, 198] };
    propPoses = [[68, 396], [344, 396], [44, 264], [491, 372]];
    decorPoses = [[126, 318], [512, 48], [40, 358]];
    furnish('visitor-rest', 'treatment-couch', 466, 306, .55);
    furnish('care-containers', 'sealed-jars', 218, 300, .4);
    // Keep the V77 host/table socket reachable from the public traverse.
    // This rack belongs beside visitor rest, outside the table's approach.
    furnish('visitor-parures', 'clothing-rack', 400, 341, .55);
    furnish('care-veille', 'resin-lantern', 48, 120, .42);
    oriented('communal-case', 'chest-diagonal', 414, 412, .42,
      'Contenant fermé de la salle commune, sans consommation simulée ou récompense.');
    oriented('welcome-lateral-rack', 'rack-lateral', 217, 388, .65,
      'Rangement latéral de l’accueil des délégations, sans dossier ou service nouveau.');
    passages = [passage('care-entry', 146, 216, 164), passage('communal-entry', 404, 216, 160), passage('rest-branch', 324, 338, 148, 'vertical')];
  }
  const furniture = (room.furniture ?? []).map(item => {
    const pose = furniturePoses[item.id.replace(`${prefix}-v72-`, '')];
    return pose ? { ...item, x: pose[0], y: pose[1] } : item;
  });
  const props = room.props.map((item, index) => {
    const pose = propPoses[index]; return pose ? { ...item, x: pose[0], y: pose[1] } : item;
  });
  const orientedDecorV76 = [...(room.orientedDecorV76 ?? []).map((item, index) => {
    const pose = decorPoses[index]; return !pose ? item : { ...item,
      x: pose[0], y: pose[1], placement: 'v83-authored-public-complex-implemented-not-verified',
      purpose: `${title} · ${item.purpose.slice(item.purpose.indexOf(' · ') + 3)}` };
  }), ...extraDecor];
  return { ...room, title, description: `${purpose} Cinq zones publiques composent l’enveloppe existante ; les fonctions supplémentaires sont visuelles et non interactives.`,
    furniture: [...furniture, ...extraFurniture], props, orientedDecorV76, zones, partitions,
    publicComplexV83: { version: 'V83', kind, purpose, passages, nativeProps,
      activities: zones.map(item => ({ id: `${item.id}-activity`, label: item.label, zoneId: item.id, status: 'scenery-existing-services-only' })),
      validation: 'implemented-not-verified', lore: 'original-public-complex-in-preserved-envelope' } };
}
