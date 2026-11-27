import type { SoloV70State, SoloV70TrioObservation } from './firstHuntSoloV70';

export const SOLO_V70_FULL_ROOMS_M017 = [
  { name: 'Puits de Résine', level: 'Profondeurs', scene: 'dojo', platforms: [[350, 372, 180], [538, 321, 220]] },
  { name: 'Chambre de Confinement', level: 'Profondeurs', scene: 'quarters', platforms: [[305, 361, 210], [725, 351, 195]] },
  { name: 'Nef de la Reine', level: 'Profondeurs', scene: 'dojo', platforms: [[300, 370, 198], [520, 316, 285]] },
  { name: 'Sas de Purge', level: 'Profondeurs', scene: 'quarters', platforms: [[305, 361, 155], [810, 363, 140]] },
] as const;

export type SoloV70DepthProofM017 = 'eggs-observed' | 'resin-anchor' | 'containment-screen' | 'royal-lock' | 'vent-purge';
export interface SoloV70DepthExtensionM017 {
  observations: Partial<Record<SoloV70DepthProofM017, SoloV70TrioObservation>>;
  purgeStartedAt: number | null;
}

interface DepthPostM017 {
  id: SoloV70DepthProofM017;
  room: number;
  x: number;
  y: number;
  holdTicks: number;
  plates?: readonly [number, number];
  label: string;
  instruction: string;
}

export const SOLO_V70_DEPTH_POSTS_M017: readonly DepthPostM017[] = [
  { id: 'eggs-observed', room: 10, x: 950, y: 430, holdTicks: 45, label: 'Lire les traces près des œufs',
    instruction: 'Réunis Saar et Vek au glyphe des œufs. Maintiens Interaction pour relever les traces sans toucher aux coques.' },
  { id: 'resin-anchor', room: 11, x: 645, y: 321, holdTicks: 48, plates: [480, 825], label: 'Armer l’ancre de rappel',
    instruction: 'Donne le Signal pour placer les deux appuis. Monte au-dessus du puits de résine et maintiens Interaction à l’ancre.' },
  { id: 'containment-screen', room: 12, x: 640, y: 430, holdTicks: 50, plates: [486, 810], label: 'Fermer la grille de secours',
    instruction: 'Donne le Signal à Saar et Vek. Leurs plaques tiennent la grille pendant que tu verrouilles le levier bas.' },
  { id: 'royal-lock', room: 13, x: 675, y: 316, holdTicks: 54, label: 'Verrouiller le foyer royal',
    instruction: 'Rejoins la console haute avec la triade, puis maintiens Interaction. Le verrou isole la loge royale et libère le sas.' },
  { id: 'vent-purge', room: 14, x: 700, y: 430, holdTicks: 45, label: 'Purger la conduite du sas',
    instruction: 'Rassemble la triade à la vanne aval et maintiens Interaction avant la fermeture. La commande amont permet de rouvrir la conduite.' },
];
export const SOLO_V70_PURGE_M017 = { x: 205, y: 430, holdTicks: 32, duration: 420 } as const;
export const SOLO_V70_FINAL_THRESHOLD_M017 = { room: 14, x: 974, holdTicks: 45 } as const;
export const soloV70DepthPostM017 = (room: number) => SOLO_V70_DEPTH_POSTS_M017.find(post => post.room === room);
export function soloV70PurgeRemainingM017(s: Pick<SoloV70State, 'depthsM017' | 'tick'>): number {
  const extension = s.depthsM017?.extension;
  if (extension?.purgeStartedAt == null || extension.observations['vent-purge']) return 0;
  return Math.max(0, SOLO_V70_PURGE_M017.duration - (s.tick - extension.purgeStartedAt));
}
export const soloV70DepthAppuisM017 = (positions: readonly number[], plates: readonly [number, number]) =>
  positions.length === 2 && positions.every((x, index) => Math.abs(x - plates[index]) < 5);
