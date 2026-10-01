import life from '../data/homeworldLifeV68.json';
import type { HunterBodyMorphId } from '../types';
import type { HomeworldVec2 } from './homeworldCity';
export interface HomeworldResidentV68 {
  id: string; districtId: string; role: string; morphId: HunterBodyMorphId;
  path: HomeworldVec2[]; speed: number; dwellSeconds: number; phaseSeconds: number;
}
export const HOMEWORLD_RESIDENTS_V68 = life.population as HomeworldResidentV68[];
/** The city clock freezes with menus, focus loss and settings. Routes were
 * sampled against the real city footprint; no moving citizen crosses a wall.
 * Bitmap compositions translate along short routes; these are not new sheets. */
export function homeworldResidentPoseV68(resident: HomeworldResidentV68, seconds: number) {
  const start = resident.path[0], end = resident.path.at(-1)!;
  const distance = Math.hypot(end.x - start.x, end.y - start.y);
  if (!distance) return { ...start, facing: 1 as const, moving: false, progress: 0 };
  const travel = distance / resident.speed, cycle = travel * 2 + resident.dwellSeconds * 2;
  const time = ((Math.max(0, seconds) + resident.phaseSeconds) % cycle + cycle) % cycle;
  const outbound = time < travel + resident.dwellSeconds;
  const progress = outbound ? Math.min(1, time / travel) : Math.max(0, 1 - (time - travel - resident.dwellSeconds) / travel);
  return { x: start.x + (end.x - start.x) * progress, y: start.y + (end.y - start.y) * progress,
    facing: ((end.x >= start.x ? 1 : -1) * (outbound ? 1 : -1)) as 1 | -1,
    moving: outbound ? time < travel : time < travel * 2 + resident.dwellSeconds, progress };
}
export function nearestHomeworldResidentV68(actor: HomeworldVec2, seconds: number, radius = 82) {
  let nearest: HomeworldResidentV68 | null = null, best = radius;
  for (const resident of HOMEWORLD_RESIDENTS_V68) {
    const p = homeworldResidentPoseV68(resident, seconds), d = Math.hypot(actor.x - p.x, actor.y - p.y);
    if (d < best) { nearest = resident; best = d; }
  }
  return nearest;
}
export function homeworldResidentDialogueV68(resident: HomeworldResidentV68) {
  const stories: Record<string, string> = {
    port: 'Les grands appareils restent en orbite. Les porteurs acheminent les caisses vers les navettes ; laisse libre la voie de chargement.',
    market: 'Les demandes des clans passent par l’artisane, dans l’armurerie du marché. Une prime porte sur un relevé précis : ne rapporte pas la prise d’un autre.',
    forges: 'Une lame se règle à la main, puis s’éprouve. Nous réutilisons les matériaux des convois ; les marques distinguent chaque commande.',
    clans: 'Les délégations habitent près de la maison des soins. Chaque village garde ses chemins et ses usages ; les paroles de cette cité ne lient pas tous les clans.',
    memory: 'La conservatrice compare les marques aux archives. Un ancien récit peut expliquer une piste, mais seule ta chasse devient ton exploit.',
    terraces: 'Les aspirants s’entraînent avec leur maître. Une cohorte revient ensemble ; le rang ne se gagne pas en laissant un compagnon derrière.',
    temple: 'La gardienne reconnaît les rites accomplis. Les portes du sanctuaire ne transforment pas un récit en preuve.',
    arenas: 'Les duels attirent les visiteurs. Les Chroniques de la Fosse restent des reconstitutions ; elles ne remplacent pas la chasse du clan.',
    undercity: 'Les galeries sont habitées aussi. Écoute plusieurs témoins avant de donner un nom à une accusation.',
    enforcers: 'Une intervention s’appuie sur des faits. Les gardiens de la Réserve demandent un dossier et une observation avant toute accusation.',
    citadel: 'Les émissaires attendent la réponse de cette cour. Hors des murs, les villages disposent de leurs propres anciens.',
    'convoy-works': 'Les convois passent par les ateliers de transit. Les caisses scellées doivent rejoindre leur destinataire, pas une salle de trophées.',
    'rampart-walk': 'Les sentiers du rempart relient les routes hautes. Sur les ponts, reste entre les deux rives du tablier et conserve ta route de retour.',
    esplanade: 'Le héraut attend des récits vérifiables. L’honneur ne se vend pas avec les matériaux et les parures.',
  };
  return stories[resident.districtId] ?? 'Les villages accueillent les chasseurs de passage. Respecte les chemins et écoute ceux qui les connaissent.';
}
