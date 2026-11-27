import type { OriginStateV151 } from './originsV151';
import type { HomeworldRegionStateV68 } from './homeworldRegionsV68';
import { houseForBuildingV149, houseV149, residenceAccessV149, RESIDENCE_HOUSES_V149,
  type ResidenceContextV149, type ResidenceStateV149 } from './residenceV149';

export const TRAINING_YARD_ORDERS_O6 = ['support', 'rack', 'aisle', 'threshold'] as const;
export type TrainingYardOrderO6 = (typeof TRAINING_YARD_ORDERS_O6)[number];

export const TRAINING_YARD_POSTS_O6 = {
  support: { x: 169, y: 460, label: 'Caler l’appui sur le banc latéral' },
  rack: { x: 590, y: 460, label: 'Fixer le râtelier d’exercice au mur' },
  aisle: { x: 380, y: 469, label: 'Contrôler le passage central' },
  threshold: { x: 380, y: 574, label: 'Vérifier le retour jusqu’au seuil' },
} satisfies Record<TrainingYardOrderO6, { x: number; y: number; label: string }>;

export interface TrainingYardRecordO6 {
  version: 1;
  houses: Partial<Record<string, TrainingYardOrderO6[]>>;
}

export function normalizeTrainingYardO6(raw: unknown): TrainingYardRecordO6 | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw) || Reflect.ownKeys(raw).length !== 2) return null;
  const { version, houses } = raw as Partial<TrainingYardRecordO6>;
  if (version !== 1 || !houses || typeof houses !== 'object' || Array.isArray(houses)) return null;
  const entries = Object.entries(houses);
  if (!entries.length || entries.length > RESIDENCE_HOUSES_V149.length) return null;
  const accepted: TrainingYardRecordO6['houses'] = {};
  for (const [id, orders] of entries) {
    if (!houseV149(id) || !Array.isArray(orders) || !orders.length || orders.length > TRAINING_YARD_ORDERS_O6.length ||
        !Array.from(orders).every((order, index) => order === TRAINING_YARD_ORDERS_O6[index])) return null;
    accepted[id] = [...orders];
  }
  return { version: 1, houses: accepted };
}

export function trainingYardViewO6(
  origin: OriginStateV151, residence: ResidenceStateV149 | null | undefined,
  region: HomeworldRegionStateV68, context: Pick<ResidenceContextV149, 'rankId' | 'regionAllowed'>,
) {
  if (origin.originId !== 'O6' || !residence || region.zone !== 'interior' || region.status !== 'walking' || region.pendingFieldEvent) return null;
  const house = houseForBuildingV149(region.regionId, region.buildingId);
  if (!house || residence.activeResidenceId !== house.id ||
      !residenceAccessV149(residence, house.id, { ...context, atHouseId: house.id }).furnish) return null;
  const orders = origin.trainingYardO6?.houses[house.id] ?? [];
  const next = TRAINING_YARD_ORDERS_O6[orders.length] ?? null;
  const post = next && TRAINING_YARD_POSTS_O6[next];
  const near = !!post && region.actor.grounded && Math.hypot(region.actor.x - post.x, region.actor.y - post.y) <= 39;
  return { houseId: house.id, orders, next, post, near };
}

export function applyTrainingYardO6(
  origin: OriginStateV151, residence: ResidenceStateV149 | null | undefined,
  region: HomeworldRegionStateV68, context: Pick<ResidenceContextV149, 'rankId' | 'regionAllowed'>,
  order: TrainingYardOrderO6,
): OriginStateV151 | null {
  const view = trainingYardViewO6(origin, residence, region, context);
  if (!view?.near || view.next !== order) return null;
  return { ...origin, trainingYardO6: { version: 1, houses: {
    ...origin.trainingYardO6?.houses, [view.houseId]: [...view.orders, order],
  } } };
}
