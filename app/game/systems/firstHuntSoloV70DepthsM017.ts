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
  /** Les relevés à quinze salles déjà commencés n’ont pas cette rencontre. */
  gallery?: { openedAt: number | null; screened: SoloV70TrioObservation | null };
  royal?: { startedAt: number | null; evade: { tick: number; x: number; y: number } | null };
  rescue?: { pickedUp: SoloV70TrioObservation | null; delivered: SoloV70TrioObservation | null };
}

export const SOLO_V70_GALLERY_M017 = { room: 10, x: 740, y: 430, holdTicks: 40, hatchDelay: 24 } as const;

export function soloV70GalleryThreatM017(
  state: Pick<SoloV70State, 'room' | 'tick' | 'depthsM017'>,
): { x: number; y: number } | null {
  const encounter = state.depthsM017?.extension?.gallery;
  if (state.room !== SOLO_V70_GALLERY_M017.room || encounter?.openedAt == null || encounter.screened) return null;
  const travel = Math.min(1, (state.tick - encounter.openedAt) / 30);
  return { x: 858 - 72 * travel, y: 430 - 32 * Math.sin(travel * Math.PI) };
}

export const SOLO_V70_ROYAL_M017 = {
  room: 13, x: 410, y: 430, plates: [530, 815], sweep: [330, 550], coverY: 386,
  warningTicks: 72, strikeTicks: 24, recoverTicks: 48,
} as const;

export function soloV70RoyalSweepM017(startedAt: number, tick: number) {
  const { warningTicks, strikeTicks, recoverTicks } = SOLO_V70_ROYAL_M017;
  const cycle = warningTicks + strikeTicks + recoverTicks;
  const elapsed = (tick - startedAt) % cycle;
  if (elapsed < warningTicks) return { stage: 'warning', remaining: warningTicks - elapsed } as const;
  if (elapsed < warningTicks + strikeTicks) return { stage: 'strike', remaining: warningTicks + strikeTicks - elapsed } as const;
  return { stage: 'recover', remaining: cycle - elapsed } as const;
}

export function soloV70RoyalInSweepM017(x: number): boolean {
  const [left, right] = SOLO_V70_ROYAL_M017.sweep;
  return x >= left && x <= right;
}

export function soloV70RoyalStatusM017(extension: SoloV70DepthExtensionM017 | undefined, tick: number) {
  const royal = extension?.royal;
  if (!royal) return undefined;
  if (extension?.observations['royal-lock']) return { stage: 'contained' } as const;
  if (royal.evade) return { stage: 'evaded' } as const;
  if (royal.startedAt === null) return { stage: 'waiting' } as const;
  return soloV70RoyalSweepM017(royal.startedAt, tick);
}

export const SOLO_V70_RESCUE_M017 = {
  room: 14, pickup: { x: 320, y: 430, holdTicks: 36 }, relief: { x: 557, y: 430, holdTicks: 42 },
  carrySpeed: 2.2, shoulderOffset: 31,
} as const;

export function soloV70RescueTargetM017(extension: SoloV70DepthExtensionM017 | undefined) {
  if (!extension?.rescue || !extension.observations['royal-lock'] || extension.rescue.delivered) return undefined;
  return extension.rescue.pickedUp ? SOLO_V70_RESCUE_M017.relief : SOLO_V70_RESCUE_M017.pickup;
}

export const soloV70SaarCarryX = (playerX: number) =>
  Math.max(65, playerX - SOLO_V70_RESCUE_M017.shoulderOffset);

export const soloV70RescuePartyM017 = (positions: readonly number[]) =>
  positions.length === 3 && Math.abs(positions[1] - soloV70SaarCarryX(positions[0])) < .01 &&
  Math.abs(positions[2] - positions[0]) < 185;

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
export function soloV70DepthPostM017(room: number, royal = false): DepthPostM017 | undefined {
  const post = SOLO_V70_DEPTH_POSTS_M017.find(candidate => candidate.room === room);
  if (royal && post?.id === 'royal-lock') return {
    ...post, plates: SOLO_V70_ROYAL_M017.plates,
    instruction: 'Donne le Signal aux deux appuis. Rejoins la console haute et maintiens Interaction pour isoler la reine captive.',
  };
  return post;
}
export function soloV70PurgeRemainingM017(s: Pick<SoloV70State, 'depthsM017' | 'tick'>): number {
  const extension = s.depthsM017?.extension;
  if (extension?.purgeStartedAt == null || extension.observations['vent-purge']) return 0;
  return Math.max(0, SOLO_V70_PURGE_M017.duration - (s.tick - extension.purgeStartedAt));
}
export const soloV70DepthAppuisM017 = (positions: readonly number[], plates: readonly [number, number]) =>
  positions.length === 2 && positions.every((x, index) => Math.abs(x - plates[index]) < 5);
