import './homeworldStreetCompositionMountV92';
import type { HomeworldVec2 } from './homeworldCity';
import type { HomeworldProgress } from './homeworld';
import { homeworldResidentPoseV77, type HomeworldLevelV77 } from './homeworldWorldV77';
import { HOMEWORLD_URBAN_EXTRAS_V78, type HomeworldUrbanExtraV78 } from './homeworldUrbanPopulationV78';
import { homeworldResidentOccludedV100 } from './homeworldResidentVisibilityV100';
import { homeworldRouteSegmentV77 } from './homeworldNavigationV77';
import { homeworldResidentPlacesV75 } from './homeworldResidentConversationsV75';
import { homeworldCivilianRoutineV84 } from './homeworldCivilianRoutinesV84';

/** The accepted, already rendered people keep their original IDs, costumes,
 * routes, pauses and non-solid bodies. This adapter adds only a local dialogue;
 * it does not append their IDs to the historical saved-visit registries. */
export const HOMEWORLD_STREET_CONTACTS_V100 = HOMEWORLD_URBAN_EXTRAS_V78;
const byId = new Map(HOMEWORLD_STREET_CONTACTS_V100.map(contact => [contact.id, contact]));
export const HOMEWORLD_STREET_CONTACT_RADIUS_V100 = 96;
export const HOMEWORLD_STREET_TOPICS_V100 = [
  { id: 'work', label: 'Ton travail' },
  { id: 'rhythm', label: 'Ta prochaine halte' },
  { id: 'places', label: 'Mes repères du quartier' },
] as const;
export type HomeworldStreetTopicV100 = typeof HOMEWORLD_STREET_TOPICS_V100[number]['id'];
export interface HomeworldStreetContextV100 {
  actor: HomeworldVec2;
  levelId: HomeworldLevelV77;
  seconds: number;
  interiorId?: string | null;
  inTransit?: boolean;
  suspended?: boolean;
}

export function homeworldStreetContactV100(id: unknown): HomeworldUrbanExtraV78 | null {
  return typeof id === 'string' ? byId.get(id) ?? null : null;
}

/** Recomputed at the input event, not trusted from a rendered button. The
 * same full-body V77 segment test checks the entire short approach, including
 * the live V84/V92 decoration and the actor's actual ground plane. */
export function homeworldStreetContactReachedV100(id: unknown, context: HomeworldStreetContextV100): HomeworldUrbanExtraV78 | null {
  const contact = homeworldStreetContactV100(id);
  if (!contact || context.suspended || context.inTransit || context.interiorId || contact.levelId !== context.levelId ||
    ![context.actor.x, context.actor.y, context.seconds].every(Number.isFinite) || context.seconds < 0) return null;
  const pose = homeworldResidentPoseV77(contact, context.seconds);
  if (Math.hypot(pose.x - context.actor.x, pose.y - context.actor.y) >= HOMEWORLD_STREET_CONTACT_RADIUS_V100 ||
    homeworldResidentOccludedV100(contact.levelId, pose) || !homeworldRouteSegmentV77(contact.levelId, context.actor, pose)) return null;
  return contact;
}

export function nearestHomeworldStreetContactV100(context: HomeworldStreetContextV100): HomeworldUrbanExtraV78 | null {
  let best: HomeworldUrbanExtraV78 | null = null, distance = Infinity;
  for (const contact of HOMEWORLD_STREET_CONTACTS_V100) {
    if (contact.levelId !== context.levelId) continue;
    const pose = homeworldResidentPoseV77(contact, context.seconds), next = Math.hypot(pose.x - context.actor.x, pose.y - context.actor.y);
    if (next < distance && homeworldStreetContactReachedV100(contact.id, context)) { best = contact; distance = next; }
  }
  return best;
}

/** Advice can point only within a district already acknowledged as visited.
 * It cannot reveal a region, a hidden reserve, a witness or a quest condition. */
export function homeworldStreetPlacesV100(contact: HomeworldUrbanExtraV78, progress: Pick<HomeworldProgress, 'visitedDistrictIds'>) {
  return progress.visitedDistrictIds.includes(contact.districtId) ? homeworldResidentPlacesV75(contact) : [];
}

const work = {
  'dock-officer': 'Je fais le relais entre les porteurs. Une charge confiée garde son destinataire ; le porteur ne la transforme pas en prise personnelle.',
  courier: 'Je transmets les consignes d’une équipe à l’autre. Avant de repartir, j’attends que mon destinataire soit disponible ; je ne décide pas à sa place.',
  artisan: 'Je prépare les pièces destinées à notre équipe. Une parure et un outil n’ont pas le même usage, et chaque demande garde son propriétaire.',
  'forge-master': 'Je porte les matériaux de l’atelier. Je les garde séparés des pièces finies jusqu’à leur remise, puis je reprends le même passage.',
  witness: 'Je parle de ce que j’ai observé ici. Les récits transmis par d’autres restent distincts de mon témoignage ; je ne les présente pas comme mes propres faits.',
  healer: 'J’attends le retour des équipes pour recevoir leurs besoins. On ne remplace pas un examen par un récit de chasse, et une discussion ne suffit pas à traiter une blessure.',
  guard: 'Je surveille ce passage sans le barrer aux habitants. Une relève se fait auprès des personnes présentes ; voir une tenue ne donne aucun ordre sur son porteur.',
} as const;

function workText(contact: HomeworldUrbanExtraV78) {
  if (contact.role === 'Aspirant') return 'Je rejoins cette équipe pour écouter les consignes et apprendre à garder le passage libre. Mon trajet dans le quartier ne remplace pas les épreuves auprès de mon maître.';
  if (contact.id === 'urban-v84:stable-supplies') return 'Je prépare les fournitures des montures et les remets à leur équipe. Chaque animal garde ses soigneurs ; ce poste ne remet pas une monture à un visiteur.';
  if (contact.id === 'urban-v84:stable-harness') return 'Je vérifie les demandes de harnais et attends leur remise. Nous séparons les pièces à reprendre de celles prêtes à repartir avec les soigneurs.';
  if (contact.id === 'urban-v84:kennel-return') return 'Je reçois les consignes des équipes qui reviennent au chenil. Les chiens de chasse restent avec leurs responsables ; les regarder ne les attribue pas à un visiteur.';
  if (contact.id === 'urban-v84:kennel-care') return 'Je reçois les besoins des chiens de chasse avant leur prochain départ. Le calme et le passage libre permettent aux responsables de travailler auprès d’eux.';
  return work[contact.civilianRole as keyof typeof work] ?? 'Je fais le relais avec les personnes de mon équipe. Nos tâches et nos responsabilités restent locales à ce quartier.';
}

export function homeworldStreetConversationV100(contact: HomeworldUrbanExtraV78, topic: HomeworldStreetTopicV100, seconds: number, youth: boolean): string {
  if (topic === 'work') return `${youth ? 'Tu es encore en formation : observe les équipes sans couper leur passage.' : 'Les équipes reçoivent aussi les chasseurs de passage ; chacun garde la responsabilité de sa charge.'} ${workText(contact)}`;
  if (topic === 'places') return 'Nous pouvons relire les repères des quartiers que tu as déjà parcourus. Rejoins leur porte à pied et adresse-toi à la personne sur place pour toute demande.';
  const pose = homeworldResidentPoseV77(contact, seconds), routine = homeworldCivilianRoutineV84(contact);
  if (pose.moving) return `${pose.phaseLabel}. Je garde ce passage jusqu’à ma prochaine halte, puis je reviens par le même chemin. ${routine.groupLabel ? 'Mon équipe : ' + routine.groupLabel + '.' : ''}`;
  return `${pose.phaseLabel}. J’attends ici avant de reprendre le même passage. ${routine.groupLabel ? 'Mon équipe : ' + routine.groupLabel + '.' : ''}`;
}
