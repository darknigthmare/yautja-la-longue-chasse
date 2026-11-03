import { HOMEWORLD_RESIDENTS_V69, homeworldResidentPoseV69 } from './homeworldLifeV69';
import { homeworldCivilianArtV72, homeworldResidentRoleV72 } from './homeworldIdentityV72';
import type { HomeworldElementRecordV64 } from './homeworldElementCodexV64';

/** Catalogue the real inhabitants and their existing routes. The initial pose
 * is a time-zero reference, never a new spawn, fixed obstacle or save field. */
export const HOMEWORLD_POPULATION_CODEX_V74: readonly (HomeworldElementRecordV64 & {
  associatedElementIds: readonly string[];
})[] = HOMEWORLD_RESIDENTS_V69.map(resident => {
  const role = homeworldResidentRoleV72(resident);
  const art = homeworldCivilianArtV72(role);
  const pose = homeworldResidentPoseV69(resident, 0);
  const height = resident.morphId === 'young' ? 82 : 100;
  return {
    id: `resident-v74:${resident.id}`,
    label: resident.name ?? `${resident.role} · ${resident.id}`,
    category: 'npc', districtId: resident.districtId, spaceId: 'world',
    position: { x: pose.x, y: pose.y, z: 0 },
    dimensions: { width: 32, depth: 20, height },
    footprint: null, door: null, lore: 'original-adaptation', source: [],
    asset: art.src,
    associatedElementIds: [`district:${resident.districtId}`, `civilian-motion-v74:${role}`],
    constraints: [
      `Identité stable ${resident.id} ; fonction locale ${resident.role} ; costume natif ${role}.`,
      `Position de référence à l'horloge zéro : ${pose.x.toFixed(2)} ; ${pose.y.toFixed(2)}. La pose réelle suit l'horloge de cité, ce n'est pas un point fixe.`,
      `Trajet réel : ${resident.path.map(point => `${point.x} ; ${point.y}`).join(' → ')}. Vitesse ${resident.speed} unités/s, attente ${resident.dwellSeconds}s, phase ${resident.phaseSeconds}s.`,
      `Hauteur de rendu ${height} unités, pieds au pivot natif ; pose et animation sont suspendues par la même pause de cité.`,
      'Habitant mobile et corps visuel non bloquant : cette fiche ne crée aucun nouveau volume solide ni changement de circulation.',
      'Portrait de repos conservé ; les cellules de marche et leur métrologie figurent dans la fiche de cycle associée.',
      'Habitant original de ce clan, sans identité canonique prétendue. Parler ne donne ni rang, arme, trophée ou preuve gratuits.',
    ],
  };
});
