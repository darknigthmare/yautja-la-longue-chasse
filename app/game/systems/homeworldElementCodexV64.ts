/** Exhaustive placement catalogue, derived from the live collision/render models.
 * This city is an original adaptation; no canonical map or measurements are asserted. */
import { HOMEWORLD_POINTS, HOMEWORLD_NPCS } from './homeworld';
import { HOMEWORLD_BUILDINGS, HOMEWORLD_DISTRICTS, HOMEWORLD_STREETS, HOMEWORLD_PROPS,
  HOMEWORLD_SPACEPORT_V64, HOMEWORLD_OUTDOOR_POINT_ART_V64, homeworldNpcPlate } from './homeworldCity';
import { HOMEWORLD_PROP_ART_V64, HOMEWORLD_GROUND_ART_V64, HOMEWORLD_TRANSPORT_ART_V64 } from './homeworldArtV64';
import { HOMEWORLD_GEOMETRY_V64, homeworldBuildingDoorwayV64, homeworldBuildingFootprintV64 } from './homeworldGeometryV64';
import { HOMEWORLD_INTERIORS_V64, homeworldInteriorForPointV64, homeworldInteriorPropArtIdV64,
  homeworldInteriorPointPropV64, homeworldInteriorTrophySlotsV64 } from './homeworldInteriorsV64';
import { homeworldInteriorShellV64 } from './homeworldInteriorShellV64';
import {HOMEWORLD_NPC_ROLES_V72,homeworldCivilianArtV72} from './homeworldIdentityV72';

type Point = { x: number; y: number };
export interface HomeworldElementRecordV64 {
  id: string; label: string;
  category: 'district' | 'street' | 'building' | 'door' | 'prop' | 'npc' | 'service' | 'ship' | 'interior' | 'floor' | 'panel';
  districtId: string; spaceId: string;
  position: Point & { z: number };
  dimensions: { width: number; depth: number; height: number };
  footprint: { left: number; right: number; top: number; bottom: number } | null;
  door: { threshold: Point; approach: Point; clearWidth: number; clearHeight: number; paintedSocket?: unknown } | null;
  lore: 'original-adaptation' | 'licensed-reference-adaptation';
  source: { label: string; url: string; note: string }[];
  constraints: string[]; asset: string | null;
}
const rectangle = (point: Point, width: number, depth: number) => ({ left: point.x - width / 2, right: point.x + width / 2, top: point.y - depth / 2, bottom: point.y + depth / 2 });
const propNames = { bench: 'Banc', chest: 'Caisse', locker: 'Casier', console: 'Console', workshop: 'Poste de travail', cot: 'Couchette', table: 'Table', 'rock-plant': 'Roche végétalisée', beacon: 'Borne', 'brazier-v69': 'Brasero du clan' };
const architectureSources = [
  { label: 'AVPR · entretien des réalisateurs', url: 'https://gizmodo.com/aliens-vs-predator-2-requiem-directors-tell-io9-about-335290', note: 'Référence de direction artistique : volumes courbes, influence aztèque et sophistication industrielle. Aucun plan ni dimension de cette ville n’en est déduit.' },
  { label: 'Alex Nice · concepts Homestead de Badlands', url: 'https://www.linkedin.com/posts/alexniceartist_predatorbadlands-yautja-predator-activity-7405352080015622144-QEtm', note: 'Concepts publiés par leur auteur : vocabulaire architectural seulement. Ces cinq bâtiments et leurs fonctions restent des créations originales.' },
];
const record = (value: Pick<HomeworldElementRecordV64, 'id' | 'label' | 'category'> & Partial<HomeworldElementRecordV64>): HomeworldElementRecordV64 => ({
  districtId: '', spaceId: 'world', position: { x: 0, y: 0, z: 0 }, dimensions: { width: 0, depth: 0, height: 0 },
  footprint: null, door: null, lore: 'original-adaptation', source: [], constraints: [], asset: null, ...value,
});
const buildings = HOMEWORLD_BUILDINGS.flatMap(building => {
  const door = homeworldBuildingDoorwayV64(building), footprint = homeworldBuildingFootprintV64(building);
  const common = { districtId: building.districtId, position: { x: building.x, y: building.y, z: 0 }, door,
    constraints: ['Façade sud. PNG natif à échelle uniforme ; seuil peint aligné sur le seuil logique.',
      'Empreinte solide au nord du seuil ; le retrait mesuré autorise seulement le passage central devant la façade.',
      'Intérieur visitable. Les conditions des services et de l’enquête restent inchangées.',
      `Métrologie : ${building.art.measurementStatus ?? 'mesure visuelle des pixels sources'}.`],
    asset: building.art.src, source: architectureSources };
  return [record({ ...common, id: building.id, label: building.label, category: 'building', footprint,
    dimensions: { ...building.footprint, height: building.wallHeight } }),
  record({ ...common, id: `door:${building.id}`, label: `Seuil · ${building.label}`, category: 'door',
    dimensions: { width: door.clearWidth, depth: door.frontOffset, height: door.clearHeight } })];
});
const points = HOMEWORLD_POINTS.map(point => {
  const room = homeworldInteriorForPointV64(point.id), local = room?.points.find(candidate => candidate.pointId === point.id) ?? point;
  return record({ id: `point:${point.id}`, label: point.label, category: 'service', districtId: point.districtId,
    spaceId: room?.buildingId ?? 'world', position: { x: local.x, y: local.y, z: 0 },
    constraints: [point.description, 'Point d’interaction sans volume propre : les corps des habitants et le mobilier ont leurs propres fiches.', room ? 'Interaction uniquement dans cette pièce ; aucune copie active sur la rue.' : 'Interaction extérieure ; aucune téléportation par le codex.'] });
});
const npcs = HOMEWORLD_POINTS.filter(point => point.npcId).map(point => {
  const room = homeworldInteriorForPointV64(point.id), local = room?.points.find(candidate => candidate.pointId === point.id) ?? point;
  const npc = HOMEWORLD_NPCS.find(candidate => candidate.id === point.npcId);
  const role=HOMEWORLD_NPC_ROLES_V72[point.npcId!],civilian=role?homeworldCivilianArtV72(role):null;
  return record({ id: `npc:${point.npcId}`, label: npc?.name ?? point.label, category: 'npc', districtId: point.districtId,
    spaceId: room?.buildingId ?? 'world', position: { x: local.x, y: local.y, z: 0 },
    dimensions: { width: 32, depth: 20, height: civilian?.heightWorld??HOMEWORLD_GEOMETRY_V64.adultHeight }, footprint: rectangle(local, 32, 20),
    asset: civilian?.src??homeworldNpcPlate(point.npcId!), constraints: [`Pieds au pivot natif et hauteur peinte de ${civilian?.heightWorld??100} unités, sans étirement.`, 'Habitant original du projet ; sa fonction ne décrit pas une institution canonique universelle.',
      ...(civilian?[`Costume civique natif dédié : ${role}. Cellule ${JSON.stringify(civilian.sourceRect)} ; SHA256 ${civilian.sha256}.`]:[])] });
});
const interiors = HOMEWORLD_INTERIORS_V64.flatMap(room => {
  const building = HOMEWORLD_BUILDINGS.find(candidate => candidate.id === room.buildingId)!;
  const shell = homeworldInteriorShellV64(room);
  return [record({ id: `interior:${room.buildingId}`, label: room.title, category: 'interior', districtId: building.districtId,
    spaceId: room.buildingId, position: { x: 0, y: 0, z: 0 }, dimensions: { width: room.width, depth: room.depth, height: building.wallHeight },
    footprint: { left: 0, right: room.width, top: 0, bottom: room.depth },
    asset: HOMEWORLD_GROUND_ART_V64.src,
    constraints: [room.description, 'Dimensions utiles inférieures à l’enveloppe du bâtiment : 32 unités réservées aux murs.', 'Ce plan réutilisable est une adaptation originale ; entrer ne donne aucune récompense.'] }),
  record({ id: `floor:${shell.floor.id}`, label: `Sol · ${room.title}`, category: 'floor', districtId: building.districtId,
    spaceId: room.buildingId, position: {x:shell.floor.x,y:shell.floor.y,z:0}, dimensions: {width:shell.floor.width,depth:shell.floor.depth,height:0},
    asset:shell.floor.art.src, constraints:['Dallage au sol, projeté une seule fois à 35° ; aucune compression des silhouettes verticales.',
      'Texture native réemployée. La limite de la pièce et les objets solides déterminent le terrain praticable.'] }),
  ...shell.groups.flatMap(group => group.panels.map(panel => record({ id:`panel:${panel.id}`, label:`Panneau ${panel.side === 'north' ? 'nord' : panel.side === 'west' ? 'ouest' : 'est'} · ${Number(panel.id.split('-').at(-1)) + 1}`,
    category:'panel',districtId:building.districtId,spaceId:room.buildingId,position:{...panel.groundPivot,z:0},dimensions:panel.dimensions,
    footprint:panel.footprint,asset:panel.art.src,constraints:[
      `Cellule ${panel.artId}, module natif de ${panel.art.moduleLengthWorld} unités ; longueur visible ${panel.visibleLength} unités.`,
      'Le module terminal reste entier et est masqué par le cadre de la pièce, sans étirement. Son pivot natif peut dépasser la portion visible.',
      'La bordure logique de la pièce porte la collision ; ces volumes visuels ne créent aucun obstacle indépendant supplémentaire.',
      `Cadre de découpe projeté : ${group.clip.left}, ${group.clip.top}, ${group.clip.width} × ${group.clip.height}.`,
      panel.side==='north' ? 'Mur nord haut conservé ; murs latéraux ouverts en coupe pour laisser voir la pièce.' : 'Paroi latérale basse en coupe, distincte de la hauteur complète du bâtiment.',
    ] }))),
  record({ id: `exit:${room.buildingId}`, label: `Sortie · ${room.title}`, category: 'door', districtId: building.districtId,
    spaceId: room.buildingId, position: { ...room.exit, z: 0 },
    door: { threshold: room.exit, approach: room.spawn, clearWidth: homeworldBuildingDoorwayV64(building).clearWidth, clearHeight: homeworldBuildingDoorwayV64(building).clearHeight },
    constraints: ['Sortie reliée à l’approche extérieure du même bâtiment.', 'Apparition et sortie séparées de 48 unités pour éviter une sortie immédiate.'] }),
  ...room.points.flatMap(point => {
    const prop = homeworldInteriorPointPropV64(point); if (!prop) return [];
    const source = prop.artId ? HOMEWORLD_PROP_ART_V64[prop.artId] : null;
    return [record({ id: `interior-station:${point.pointId}`, label: source ? 'Console de consultation' : 'Trophée suspect du convoi', category: 'prop', districtId: building.districtId,
      spaceId: room.buildingId, position: {x:prop.x,y:prop.y,z:0}, dimensions: {width:prop.halfWidth*2,depth:prop.halfDepth*2,height:source?.physicalHeightWorldEstimate ?? prop.height},
      footprint: {left:prop.x-prop.halfWidth,right:prop.x+prop.halfWidth,top:prop.y-prop.halfDepth*2,bottom:prop.y},
      asset: source?.src ?? '/game/assets/v15/trophies/trophy-ruins-ancient-guardian.webp',
      constraints: [source ? 'Console native à échelle atlas, distincte de son point d’interaction.' : 'Image historique conservée ; volume au sol40×20 estimé pour l’objet de preuve.', 'Inspecter cet objet ne donne ni nouveau trophée ni récompense.'] })];
  }),
  ...homeworldInteriorTrophySlotsV64(room).map(slot => record({ id: `trophy-slot:${slot.id}`, label: `Emplacement mural · ${slot.id.split('-').at(-1)}`, category: 'prop', districtId: building.districtId,
    spaceId: room.buildingId, position: {x:slot.x,y:slot.y,z:slot.elevation}, dimensions: {width:slot.width,depth:0,height:slot.height},
    constraints: ['Emplacement dynamique sans collision ; image déterminée uniquement par une prise déjà possédée dans la sauvegarde.', 'Capacité limitée à8expositions au mur ; le service du Héraut garde la collection complète. Ce registre n’accorde aucune prise.'] })),
  ...room.props.map(prop => { const artId = homeworldInteriorPropArtIdV64(prop.kind), art = HOMEWORLD_PROP_ART_V64[artId];
    return record({ id: `prop:${prop.id}`, label: propNames[artId], category: 'prop', districtId: building.districtId,
    spaceId: room.buildingId, position: { x: prop.x, y: prop.y, z: 0 }, dimensions: { width: prop.halfWidth * 2, depth: prop.halfDepth * 2, height: art.physicalHeightWorldEstimate * prop.height / art.heightWorld },
    footprint: { left: prop.x - prop.halfWidth, right: prop.x + prop.halfWidth, top: prop.y - prop.halfDepth * 2, bottom: prop.y }, asset: art.src,
    constraints: [`Cellule native : ${artId}. Pivot au bord avant ; échelle uniforme.`, 'Mobilier indépendant du décor ; empreinte issue du modèle de collision intérieur.', 'Habillage original, sans récompense ni interaction de service implicite.'] }); })];
});
const pad = HOMEWORLD_SPACEPORT_V64.pad, shuttle = HOMEWORLD_SPACEPORT_V64.shuttle;
export const HOMEWORLD_ELEMENT_CODEX_V64: readonly HomeworldElementRecordV64[] = [
  ...HOMEWORLD_DISTRICTS.map(d => record({ id: `district:${d.id}`, label: d.name, category: 'district', districtId: d.id,
    position: { x: d.x, y: d.y, z: 0 }, dimensions: { width: d.width, depth: d.height, height: 0 }, constraints: [d.description, 'Polygone de terrain ; la boîte de dimensions ne remplace pas sa forme réelle.'] })),
  ...HOMEWORLD_STREETS.map(street => { const xs = street.polygon.map(p => p.x), ys = street.polygon.map(p => p.y);
    const position = { x: Math.min(...xs), y: Math.min(...ys), z: 0 };
    return record({ id: `street:${street.id}`, label: street.label, category: 'street', position,
      dimensions: { width: Math.max(...xs) - position.x, depth: Math.max(...ys) - position.y, height: 0 },
      constraints: ['Terrain polygonal connecté ; empreinte complète du chasseur contrôlée à chaque pas.', 'Les dalles sont projetées comme le sol, pas comme une façade verticale.'] }); }),
  ...buildings,
  ...HOMEWORLD_PROPS.map(prop => record({ id: `prop:${prop.id}`, label: prop.artId ? propNames[prop.artId] : prop.id, category: 'prop', districtId: prop.districtId,
    position: { x: prop.x, y: prop.y, z: 0 }, dimensions: { width: (prop.footprint?.halfWidth ?? 0) * 2, depth: (prop.footprint?.halfDepth ?? 0) * 2, height: prop.artId ? HOMEWORLD_PROP_ART_V64[prop.artId].physicalHeightWorldEstimate : prop.height },
    footprint: prop.footprint ? { left: prop.x - prop.footprint.halfWidth, right: prop.x + prop.footprint.halfWidth, top: prop.y - prop.footprint.halfDepth * 2, bottom: prop.y } : null,
    asset: prop.asset, constraints: ['Cellule alpha indépendante, pivot des pieds au sol, échelle uniforme.', 'Profondeur triée par la position au sol ; aucune collision d’un ancien prop invisible.'] })),
  ...HOMEWORLD_OUTDOOR_POINT_ART_V64.map(point => { const art = HOMEWORLD_PROP_ART_V64[point.artId];
    return record({ id: `station:${point.id}`, label: `${propNames[point.artId]} · ${HOMEWORLD_POINTS.find(p=>p.id===point.id)?.label ?? point.id}`, category: 'prop',
      districtId: HOMEWORLD_POINTS.find(p=>p.id===point.id)?.districtId ?? '', position: {x:point.x,y:point.y,z:0},
      dimensions: {...art.footprintWorld,height:art.physicalHeightWorldEstimate},
      footprint: {left:point.x-point.footprint.halfWidth,right:point.x+point.footprint.halfWidth,top:point.y-point.footprint.halfDepth*2,bottom:point.y}, asset:point.asset,
      constraints: ['Objet solide au pivot avant. L’interaction correspond au point de service séparé.', 'PNG natif partagé, sans étirement ; dimensions identiques au collider.'] }); }),
  ...points, ...npcs, ...interiors,
  record({ id: pad.id, label: 'Aire de la navette locale', category: 'ship', districtId: 'port', position: { x: pad.x, y: pad.y, z: 0 }, dimensions: { width: pad.width, depth: pad.depth, height: 0 },
    asset: HOMEWORLD_TRANSPORT_ART_V64['landing-pad'].src,
    constraints: ['Dalle de sol non bloquante ; le volume de la navette est solide.', 'La réservation fait 1000 × 760 unités. Le PNG peint mesure 1000 × 719,697 unités : il est centré sans déformation.', 'La voie piétonne est distincte de l’aire d’atterrissage.'] }),
  record({ id: shuttle.id, label: 'Navette logistique du clan', category: 'ship', districtId: 'port', position: { x: shuttle.x, y: shuttle.y, z: 0 }, dimensions: { width: shuttle.width, depth: shuttle.depth, height: shuttle.height },
    footprint: { left: shuttle.x - shuttle.width / 2, right: shuttle.x + shuttle.width / 2, top: shuttle.y - shuttle.depth, bottom: shuttle.y },
    asset: HOMEWORLD_TRANSPORT_ART_V64['clan-shuttle'].src,
    constraints: ['Création originale pour la liaison locale ; pas un vaisseau canonique reproduit.', 'Hauteur physique estimée après soustraction de la profondeur projetée ; l’image native conserve ses proportions.', 'Le grand vaisseau sélectionné reste en orbite et conserve sa sélection/progression.', 'Accès par le terminal hors du pad, sans traverser la coque.'] }),
];

/** Lookup also supports source geometry audits without mutating game state. */
export const homeworldElementByIdV64 = (id: string) => HOMEWORLD_ELEMENT_CODEX_V64.find(element => element.id === id) ?? null;
