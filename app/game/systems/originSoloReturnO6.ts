import type { SaveGame } from '../types';
import { originOfSaveV151, type OriginStateV151 } from './originsV151';
import { isHomeworldRegionIdV68, type HomeworldRegionIdV68, type HomeworldRegionStateV68 } from './homeworldRegionsV68';
import { inspectEliteRecognition } from './eliteRecognitionV174';
import { inspectQuatzaRij, QUATZA_INPUT, QUATZA_TICK_LIMIT, createQuatzaFrame, replayQuatzaAttempt, stepQuatza, quatzaCampaignMatchesSave } from './quatzaRij';

const posts = {
  quiet: { x: 380, y: 531, label: 'Faire halte au retour de la traque' },
  'rinse-blades': { x: 169, y: 460, label: 'Nettoyer les lames de la traque' },
  'empty-support': { x: 169, y: 460, label: 'Montrer le support resté vide' },
  'pack-kit': { x: 590, y: 460, label: 'Ranger le paquetage de la traque' },
  victory: { x: 274, y: 313, label: 'Raconter l’ouverture décisive' },
  limit: { x: 480, y: 313, label: 'Raconter la limite rencontrée' },
} as const;

export const SOLO_RETURN_POSTS_O6 = posts;
export type SoloReturnOrderO6 = keyof typeof posts;
export type SoloReturnEvidenceO6 = {
  soloAttempt: number; traceTicks: number; kit: 'care' | 'mobility';
  response: 'care-used' | 'mobility-used' | 'charge'; saarReturn: number;
};
export type SoloReturnRecordO6 = {
  version: 1; ownerCreatedAt: string; regionId: HomeworldRegionIdV68;
  evidence: SoloReturnEvidenceO6; orders: SoloReturnOrderO6[];
};

const isRecord = (raw: unknown): raw is Record<string, unknown> => raw !== null && typeof raw === 'object' && !Array.isArray(raw);
const isInteger = (raw: unknown, min: number, max: number): raw is number =>
  typeof raw === 'number' && Number.isInteger(raw) && raw >= min && raw <= max;

export const isSoloReturnOrderO6 = (value: string): value is SoloReturnOrderO6 => Object.hasOwn(posts, value);

function sameEvidence(a: SoloReturnEvidenceO6, b: SoloReturnEvidenceO6) {
  return a.soloAttempt === b.soloAttempt && a.traceTicks === b.traceTicks && a.kit === b.kit &&
    a.response === b.response && a.saarReturn === b.saarReturn;
}

export function normalizeSoloReturnO6(raw: unknown): SoloReturnRecordO6 | null {
  if (!isRecord(raw) || Object.keys(raw).length !== 5 || raw.version !== 1 ||
      typeof raw.ownerCreatedAt !== 'string' || !Number.isFinite(Date.parse(raw.ownerCreatedAt)) ||
      !isHomeworldRegionIdV68(raw.regionId) || !isRecord(raw.evidence) || !Array.isArray(raw.orders)) return null;
  const { ownerCreatedAt, regionId, orders } = raw;
  const { soloAttempt, traceTicks, kit, response, saarReturn } = raw.evidence;
  if (Object.keys(raw.evidence).length !== 5 || !isInteger(soloAttempt, 1, 16) ||
      !isInteger(traceTicks, 1, QUATZA_TICK_LIMIT) || !isInteger(saarReturn, 0, 16) ||
      (kit !== 'care' && kit !== 'mobility') ||
      (response !== 'charge' && !(response === 'care-used' && kit === 'care') &&
       !(response === 'mobility-used' && kit === 'mobility')) ||
      orders.length < 1 || orders.length > 4 || orders[0] !== 'quiet' ||
      (orders.length > 1 && orders[1] !== 'rinse-blades' && orders[1] !== 'empty-support') ||
      (orders.length > 2 && orders[2] !== 'pack-kit') ||
      (orders.length > 3 && orders[3] !== 'victory' && orders[3] !== 'limit')) return null;
  return { version: 1, ownerCreatedAt, regionId, evidence: { soloAttempt, traceTicks, kit, response, saarReturn }, orders: [...orders] };
}

export function soloReturnEvidenceO6(save: SaveGame): SoloReturnEvidenceO6 | null {
  const origin = save.originV151 ?? originOfSaveV151(undefined);
  if (origin.originId !== 'O6' || save.prologue?.status !== 'completed' ||
      !save.eliteRecognitionV174?.recognized ||
      !save.prologue.chronicle.rites.some(rite => rite.id === 'elite-recognition') ||
      !save.prologue.chronicle.evidence.some(receipt => receipt.id === 'solitary-trial') ||
      !inspectEliteRecognition(save.eliteRecognitionV174, save.createdAt).state?.recognized ||
      !quatzaCampaignMatchesSave(save)) return null;

  const { state } = inspectQuatzaRij(save.quatzaRij, save.createdAt);
  const solo = state?.expeditions.solo?.attempts;
  const attempt = solo?.at(-1);
  if (!solo || attempt?.phase !== 'delivered') return null;

  let frame = createQuatzaFrame('solo');
  let mobilityUsed = false;
  for (const input of attempt.input) {
    const next = stepQuatza('solo', frame, input);
    mobilityUsed ||= frame.phase === 'field' && frame.kit === 'mobility' && !!(input & QUATZA_INPUT.jump) &&
      frame.player.vy === 0 && next.player.vy < 0;
    frame = next;
  }
  if (!frame.kit || !frame.hide || !frame.skull || !frame.trail || frame.companions.length ||
      frame.phase !== 'delivered' || frame.beast.stage !== 'dead') return null;

  const triad = state?.expeditions.triad?.attempts;
  const triadReturn = triad?.at(-1);
  const saar = triadReturn?.phase === 'delivered'
    ? replayQuatzaAttempt('triad', triadReturn.input).companions.find(ally => ally.id === 'saar') : null;
  return {
    soloAttempt: solo.length, traceTicks: attempt.input.length, kit: frame.kit,
    response: frame.player.careSpent ? 'care-used' : mobilityUsed ? 'mobility-used' : 'charge',
    saarReturn: saar && saar.health > 0 ? triad?.length ?? 0 : 0,
  };
}

export function soloReturnMatchesSaveO6(save: SaveGame): boolean {
  const record = save.originV151?.soloReturnO6;
  if (!record) return true;
  const evidence = soloReturnEvidenceO6(save);
  return record.ownerCreatedAt === save.createdAt && !!evidence && sameEvidence(record.evidence, evidence) &&
    (!record.orders.includes('rinse-blades') || save.inventory.unlockedWeaponIds.includes('wristblades'));
}

export function keepsSoloReturnO6(prior: SoloReturnRecordO6 | undefined, next: SoloReturnRecordO6 | undefined): boolean {
  if (!prior) return !next || next.orders.length === 1;
  return !!next && next.ownerCreatedAt === prior.ownerCreatedAt && next.regionId === prior.regionId &&
    sameEvidence(prior.evidence, next.evidence) && next.orders.length >= prior.orders.length &&
    next.orders.length <= prior.orders.length + 1 && prior.orders.every((order, index) => next.orders[index] === order);
}

type SoloReturnOption = { order: SoloReturnOrderO6; x: number; y: number; label: string; report: string; near: boolean };

const opening = 'J’ai attendu que le Quatza-Rij récupère après sa charge. Ses flancs se sont ouverts à mes lames.';
const limits: Record<SoloReturnEvidenceO6['response'], string> = {
  'care-used': 'La charge m’a blessé. J’ai dû regagner le refuge et utiliser mon soin avant de rapporter les prises.',
  'mobility-used': 'Je me suis servi de mon kit pour sauter. Une fois au sol, je devais encore laisser passer la charge.',
  charge: 'Pendant sa charge, je ne pouvais pas ouvrir sa garde. J’ai dû attendre de pouvoir revenir à portée.',
};

export function soloReturnViewO6(save: SaveGame, region: HomeworldRegionStateV68, evidence: SoloReturnEvidenceO6 | null) {
  if (!evidence || region.zone !== 'interior' || region.buildingId !== 'hall' ||
      region.status !== 'walking' || region.pendingFieldEvent) return null;
  const record = save.originV151?.soloReturnO6;
  if (record && record.regionId !== region.regionId) return null;
  const orders = record?.orders ?? [];
  const hasBlades = save.inventory.unlockedWeaponIds.includes('wristblades');
  const heardBySaar = evidence.saarReturn > 0 && orders.length >= 3;
  const saar = heardBySaar && orders.length === 3;
  const lines = {
    quiet: 'Le bruit de la chasse s’éloigne. Rejoins le banc de la Maison commune.',
    'rinse-blades': 'Tu essuies les lames utilisées contre le Quatza-Rij et les replies.',
    'empty-support': 'Le jeu de lames ne se trouve plus parmi tes outils. Le support reste vide.',
    'pack-kit': evidence.saarReturn ? 'Le paquetage est rangé. Saar te rejoint et te demande quel moment tu retiens.' :
      'Le paquetage est rangé. Le siège de Saar reste vide. Tu peux laisser une note au registre.',
    victory: heardBySaar ? `« ${opening} » Saar te demande de retenir cette attente.` : opening,
    limit: heardBySaar ? `« ${limits[evidence.response]} » Saar t’invite à garder cette limite en mémoire.` : limits[evidence.response],
  };
  const allowed: SoloReturnOrderO6[] = orders.length === 0 ? ['quiet'] :
    orders.length === 1 ? [hasBlades ? 'rinse-blades' : 'empty-support'] :
    orders.length === 2 ? ['pack-kit'] : orders.length === 3 ? ['victory', 'limit'] : [];
  const options: SoloReturnOption[] = allowed.map(order => ({
    order, ...posts[order], report: lines[order],
    near: region.actor.grounded && Math.hypot(region.actor.x - posts[order].x, region.actor.y - posts[order].y) <= 35,
  }));
  const final = orders.at(3);
  return { options, active: options.find(option => option.near) ?? null, saar,
    support: orders.length < 3 ? (orders.includes('rinse-blades') ? 'clean' : hasBlades ? 'used' : 'empty') : 'empty',
    kitStowed: orders.includes('pack-kit'), final, account: final === 'victory' || final === 'limit' ? lines[final] : null };
}

export function applySoloReturnO6(save: SaveGame, region: HomeworldRegionStateV68, order: SoloReturnOrderO6): OriginStateV151 | null {
  const evidence = soloReturnEvidenceO6(save);
  const origin = save.originV151 ?? originOfSaveV151(undefined);
  if (!evidence || soloReturnViewO6(save, region, evidence)?.active?.order !== order) return null;
  const record: SoloReturnRecordO6 = {
    version: 1, ownerCreatedAt: save.createdAt, regionId: region.regionId, evidence,
    orders: [...(origin.soloReturnO6?.orders ?? []), order],
  };
  return { ...origin, version: 2, soloReturnO6: record };
}
