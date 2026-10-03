/** V77 culture model, mounted only at authored safe Homeworld tables.
 * C'ntlip is attested in the expanded fiction. Serving quantities, safe sites,
 * recovery duration and these NPC memories are authored game adaptations.
 * This module never changes rank, honor, combat stats, quest proofs or stock.
 * A caller must commit state + serving deduction atomically before animating. */
export const CNTLIP_SOURCE_V77 = {
  share: 'https://chatgpt.com/share/6ac06565-6054-83eb-9cc0-9767b85d49d1',
  encyclopedia: 'https://avp.fandom.com/wiki/C%27ntlip',
  comparison: 'https://www.avpcentral.com/yautja-drinking-habits',
  citedWork: 'Aliens vs. Predator: Prey (1994), page 34',
  verification: 'secondary-corroborated; primary book page not directly examined',
} as const;

export const CNTLIP_CODEX_V77 = {
  id: 'culture-cntlip', category: 'Culture > Gastronomie > Boissons', title: 'C’ntlip',
  known: [
    'Breuvage intoxicant yautja mentionné dans les romans de l’univers étendu.',
    'Décrit comme ardent ; ses effets brouillent les sensations.',
    'Dachande évoque son demi-frère Nei’hman-de en se souvenant de la boisson.',
  ],
  unknown: ['Ingrédients et recette précis.', 'Dosage biologique universel.', 'Récipient ou rituel obligatoire pour tous les clans.'],
  adaptation: 'Les doses, durées, lieux de service et souvenirs locaux ci-dessous appartiennent à La Longue Chasse.',
} as const;

export const CNTLIP_SITES_V77 = [
  { id: 'clan-common', buildingId: 'clan-lodge', label: 'Table des délégations', stockSource: 'clan-hospitality', wakeSiteId: 'clan-common' },
  { id: 'market-halt', buildingId: 'market-canopy', label: 'Halte des échanges', stockSource: 'clan-hospitality', wakeSiteId: 'market-halt' },
  { id: 'pit-rest', buildingId: 'pit-gate', label: 'Repos après les Chroniques', stockSource: 'clan-hospitality', wakeSiteId: 'pit-rest' },
  { id: 'council-gathering', buildingId: 'throne-audience', label: 'Accueil des délégations de la cour', stockSource: 'clan-hospitality', wakeSiteId: 'council-gathering' },
  { id: 'ship-mess', buildingId: null, label: 'Mess personnel équipé', stockSource: 'owned-ship-store', wakeSiteId: 'ship-mess' },
] as const;
export type CntlipSiteIdV77 = typeof CNTLIP_SITES_V77[number]['id'];
export const CNTLIP_MEMORIES_V77 = [
  { id: 'healer-empty-place', participantId: 'clan-table-healer', siteId: 'clan-common', minimumRank: 'young-blood', title: 'Une place à préserver', text: 'La soigneuse de relève explique pourquoi la maison laisse le passage libre pour ceux qui reviennent blessés. Ce personnage et ce récit sont des créations locales du jeu, sans soin gratuit.' },
  { id: 'artisan-object-history', participantId: 'market-table-artisan', siteId: 'market-halt', minimumRank: 'young-blood', title: 'Ce qu’un objet raconte', text: 'L’artisane des délégations distingue le récipient transmis de la prise personnelle. Posséder un objet ne donne pas l’histoire de son ancien porteur. Personnage et scène originaux.' },
  { id: 'steward-after-chronicles', participantId: 'pit-table-attendant', siteId: 'pit-rest', minimumRank: 'young-blood', title: 'Après les Chroniques', text: 'Le préposé à la halte raconte le travail des personnes qui préparent les arènes. Les Chroniques sont des reconstitutions, distinctes des vraies chasses. Ce préposé est un personnage original.' },
  { id: 'leader-weight-of-name', participantId: 'court-table-herald', siteId: 'council-gathering', minimumRank: 'elite', title: 'Le poids d’un nom', text: 'Le porte-parole décrit les obligations de la cour locale envers ses délégations. Il ne parle ni à la place du chef, ni au nom de tous les Yautja. Personnage et récit originaux du jeu.' },
] as const;
export type CntlipMemoryIdV77 = typeof CNTLIP_MEMORIES_V77[number]['id'];
export type CntlipRankV77 = 'youngling' | 'unblooded' | 'young-blood' | 'blooded' | 'elite' | 'elder' | 'ancient';
const ranks: readonly CntlipRankV77[] = ['youngling', 'unblooded', 'young-blood', 'blooded', 'elite', 'elder', 'ancient'];

export const CNTLIP_QUEST_OUTLINES_V77 = [
  { id: 'empty-vessel', title: 'Le récipient vide', status: 'outline-not-playable', prerequisite: 'Real NPC invitation and an authored unfinished hunt, neither supplied by drinking.' },
  { id: 'last-cup', title: 'La dernière coupe', status: 'outline-not-playable', prerequisite: 'Actual permanent companion death receipt; never infer a death from absence.' },
  { id: 'three-clan-banquet', title: 'Le banquet des trois clans', status: 'outline-not-playable', prerequisite: 'Authored joint threat and three existing delegations.' },
  { id: 'unusual-harvest', title: 'Une récolte inhabituelle', status: 'outline-not-playable', prerequisite: 'Original clan ingredients, explicitly not a canonical recipe.' },
] as const;

export interface CntlipMemoryReceiptV77 { memoryId: CntlipMemoryIdV77; servingNumber: number; siteId: CntlipSiteIdV77 }
export interface CntlipPendingV77 { siteId: CntlipSiteIdV77; elapsedMs: number; servingNumber: number; memoryId: CntlipMemoryIdV77 | null }
export interface CntlipStateV77 {
  version: 1; knownLore: boolean; totalServings: number; activeDoses: number;
  /** Narrative elapsed time, deliberately distinct from actual playTimeSeconds. */
  worldElapsedMs: number;
  memories: CntlipMemoryReceiptV77[];
  pending: CntlipPendingV77 | null;
}
export interface CntlipContextV77 {
  /** Derived from actual scene and actor coordinates, never action payload. */
  place: 'homeworld' | 'ship' | 'combat' | 'other';
  siteId: CntlipSiteIdV77 | null; buildingId: string | null;
  siteDistance: number; actorStationary: boolean; seated: boolean;
  safe: boolean; inCombat: boolean; sceneActive: boolean; rank: CntlipRankV77;
  participants: readonly { id: string; siteId: CntlipSiteIdV77; distanceToSite: number; availableForConversation: boolean }[];
  servingStock: number; ownsShipMess: boolean; ownsBeverageStock: boolean;
  audienceAlreadyGranted: boolean;
}
export type CntlipActionV77 =
  | { type: 'learn' }
  | { type: 'start-serving'; memoryId?: CntlipMemoryIdV77 }
  | { type: 'advance-serving'; elapsedMs: number }
  | { type: 'cancel-serving' }
  | { type: 'rest' };
export interface CntlipResultV77 {
  ok: boolean; changed: boolean; state: CntlipStateV77; message: string;
  consumesServings: 0 | 1; worldMsAdded: number;
  outcome: 'none' | 'pour' | 'sip' | 'shared-memory' | 'wake' | 'cancelled';
  wakeSiteId: CntlipSiteIdV77 | null;
}

const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const int = (v: unknown, min: number, max: number): v is number => typeof v === 'number' && Number.isSafeInteger(v) && v >= min && v <= max;
const siteFor = (id: unknown) => CNTLIP_SITES_V77.find(site => site.id === id);
const memoryFor = (id: unknown) => CNTLIP_MEMORIES_V77.find(memory => memory.id === id);
const keysOnly = (value: Record<string, unknown>, keys: readonly string[]) => Object.keys(value).every(key => keys.includes(key));
export function defaultCntlipV77(): CntlipStateV77 {
  return { version: 1, knownLore: false, totalServings: 0, activeDoses: 0, worldElapsedMs: 0, memories: [], pending: null };
}

/** Legacy absence is supported; malformed/future data is rejected, not silently
 * replaced with a clean state that could refund or erase consumed servings. */
export function normalizeCntlipV77(value: unknown): CntlipStateV77 | null {
  if (value === undefined) return defaultCntlipV77();
  if (!record(value) || !keysOnly(value, ['version', 'knownLore', 'totalServings', 'activeDoses', 'worldElapsedMs', 'memories', 'pending']) || value.version !== 1 || typeof value.knownLore !== 'boolean' ||
      !int(value.totalServings, 0, 10_000) || !int(value.activeDoses, 0, Math.min(3, value.totalServings)) || !int(value.worldElapsedMs, 0, 31_536_000_000) || !Array.isArray(value.memories) || value.memories.length > CNTLIP_MEMORIES_V77.length) return null;
  const memories: CntlipMemoryReceiptV77[] = [];
  const numbers = new Set<number>();
  for (const raw of value.memories) {
    if (!record(raw) || !keysOnly(raw, ['memoryId', 'servingNumber', 'siteId'])) return null;
    const memory = memoryFor(raw.memoryId);
    if (!memory || raw.siteId !== memory.siteId || !int(raw.servingNumber, 1, value.totalServings) || memories.some(receipt => receipt.memoryId === memory.id) || numbers.has(raw.servingNumber)) return null;
    numbers.add(raw.servingNumber); memories.push({ memoryId: memory.id, servingNumber: raw.servingNumber, siteId: memory.siteId });
  }
  let pending: CntlipPendingV77 | null = null;
  if (value.pending !== null) {
    const raw = value.pending;
    if (!record(raw) || !keysOnly(raw, ['siteId', 'elapsedMs', 'servingNumber', 'memoryId']) || !siteFor(raw.siteId) || !int(raw.elapsedMs, 0, 2_999) || raw.servingNumber !== value.totalServings || !int(raw.servingNumber, 1, 10_000) || value.activeDoses > value.totalServings - 1) return null;
    const memory = raw.memoryId === null ? null : memoryFor(raw.memoryId);
    if (raw.memoryId !== null && !memory || memory && memory.siteId !== raw.siteId || numbers.has(raw.servingNumber)) return null;
    pending = { siteId: raw.siteId as CntlipSiteIdV77, elapsedMs: raw.elapsedMs, servingNumber: raw.servingNumber, memoryId: memory?.id ?? null };
  }
  return { version: 1, knownLore: value.knownLore, totalServings: value.totalServings, activeDoses: value.activeDoses, worldElapsedMs: value.worldElapsedMs, memories, pending };
}

export function cntlipSafeSiteV77(context: CntlipContextV77) {
  const site = siteFor(context.siteId);
  if (!site || !context.sceneActive || !context.safe || context.inCombat || !context.actorStationary || !Number.isFinite(context.siteDistance) || context.siteDistance < 0 || context.siteDistance > 70) return null;
  if (site.id === 'ship-mess') return context.place === 'ship' && context.buildingId === null && context.ownsShipMess && context.ownsBeverageStock ? site : null;
  if (context.place !== 'homeworld' || context.buildingId !== site.buildingId) return null;
  if (site.id === 'council-gathering' && !context.audienceAlreadyGranted) return null;
  return site;
}
function hasRank(rank: CntlipRankV77, minimum: CntlipRankV77) {
  return ranks.indexOf(rank) >= ranks.indexOf(minimum);
}
function participantPresent(context: CntlipContextV77, participantId: string, siteId: CntlipSiteIdV77) {
  return context.participants.some(participant => participant.id === participantId && participant.siteId === siteId && participant.availableForConversation &&
    Number.isFinite(participant.distanceToSite) && participant.distanceToSite >= 0 && participant.distanceToSite <= 140);
}
export function cntlipAvailableMemoriesV77(context: CntlipContextV77) {
  const site = cntlipSafeSiteV77(context);
  return CNTLIP_MEMORIES_V77.filter(memory => site && memory.siteId === site.id && participantPresent(context, memory.participantId, site.id) && hasRank(context.rank, memory.minimumRank));
}

export function applyCntlipV77(raw: unknown, action: CntlipActionV77, context: CntlipContextV77): CntlipResultV77 {
  const valid = normalizeCntlipV77(raw);
  const state = valid ?? defaultCntlipV77();
  const result = (ok: boolean, changed: boolean, message: string, extra: Partial<CntlipResultV77> = {}): CntlipResultV77 => ({ ok, changed, state, message, consumesServings: 0, worldMsAdded: 0, outcome: 'none', wakeSiteId: null, ...extra });
  if (!valid) return result(false, false, 'Données C’ntlip incompatibles : aucune écriture ni consommation.');
  if (!record(action)) return result(false, false, 'Interaction inconnue.');
  if (action.type === 'cancel-serving') {
    if (!state.pending) return result(true, false, 'Aucune préparation en cours.');
    state.pending = null;
    return result(true, true, 'La coupe préparée reste utilisée ; aucun souvenir ni effet supplémentaire.', { outcome: 'cancelled' });
  }
  if (!context.sceneActive) return result(false, false, 'La scène est en pause ; le geste et le temps du monde restent figés.');
  const site = cntlipSafeSiteV77(context);
  if (!site) {
    if (action.type === 'advance-serving' && state.pending) {
      state.pending = null;
      return result(false, true, 'La scène est interrompue hors du lieu sûr. Aucun effet ou souvenir gagné.', { outcome: 'cancelled' });
    }
    return result(false, false, 'Rejoins physiquement une table accueillante dans une zone sûre.');
  }
  if (action.type === 'learn') {
    if (state.knownLore) return result(true, false, 'Les données connues et les usages locaux restent distincts.');
    state.knownLore = true;
    return result(true, true, 'C’ntlip : breuvage yautja. La recette de ce clan n’est pas un fait canonique.');
  }
  if (!context.seated) return result(false, false, 'Installe-toi à la table avant de préparer une coupe ou te reposer.');
  if (action.type === 'start-serving') {
    if (state.pending) return result(false, false, 'Une coupe est déjà en préparation.');
    if (!hasRank(context.rank, 'young-blood')) return result(false, false, 'Tu peux observer et écouter la culture du clan ; cette interaction est réservée aux chasseurs de notre parcours.');
    if (!int(context.servingStock, 1, 10_000) || state.totalServings >= 10_000) return result(false, false, 'Aucune portion disponible. Le mess ne crée pas la boisson ou les réserves.');
    const memory = action.memoryId === undefined ? null : memoryFor(action.memoryId);
    if (action.memoryId !== undefined && (!memory || memory.siteId !== site.id || !participantPresent(context, memory.participantId, site.id) || !hasRank(context.rank, memory.minimumRank))) return result(false, false, 'Cet interlocuteur ou ce récit n’est pas disponible ici.');
    state.totalServings += 1;
    state.knownLore = true;
    state.pending = { siteId: site.id, elapsedMs: 0, servingNumber: state.totalServings, memoryId: memory?.id ?? null };
    return result(true, true, 'Une portion est préparée. Le geste doit aller à son terme.', { consumesServings: 1, outcome: 'pour' });
  }
  if (action.type === 'advance-serving') {
    if (!int(action.elapsedMs, 1, 1_000)) return result(false, false, 'Pas de temps de scène invalide.');
    if (!state.pending || state.pending.siteId !== site.id) return result(false, false, 'Aucune coupe préparée à cette table.');
    if (!hasRank(context.rank, 'young-blood')) return result(false, false, 'Le parcours actuel ne permet pas cette consommation.');
    const elapsed = state.pending.elapsedMs + action.elapsedMs;
    if (elapsed < 3_000) {
      state.pending.elapsedMs = elapsed;
      return result(true, true, 'Préparation et geste en cours.');
    }
    const pending = state.pending;
    state.pending = null;
    if (state.activeDoses === 3) {
      state.activeDoses = 0;
      const previousWorldMs = state.worldElapsedMs;
      state.worldElapsedMs = Math.min(31_536_000_000, previousWorldMs + 7_200_000);
      return result(true, true, 'Le temps passe. Tu reprends tes sens dans le lieu sûr où tu étais installé.', { outcome: 'wake', worldMsAdded: state.worldElapsedMs - previousWorldMs, wakeSiteId: site.wakeSiteId });
    }
    state.activeDoses += 1;
    const memory = memoryFor(pending.memoryId);
    if (memory && participantPresent(context, memory.participantId, site.id) && !state.memories.some(receipt => receipt.memoryId === memory.id)) {
      state.memories.push({ memoryId: memory.id, servingNumber: pending.servingNumber, siteId: site.id });
      return result(true, true, memory.text, { outcome: 'shared-memory' });
    }
    return result(true, true, 'Une coupe partagée avec les lieux ; aucun gain de combat, d’honneur ou de rang.', { outcome: 'sip' });
  }
  if (action.type === 'rest') {
    if (state.pending) return result(false, false, 'Termine ou interromps d’abord la préparation.');
    if (state.activeDoses === 0) return result(true, false, 'Tu es déjà reposé.');
    state.activeDoses = 0;
    const previousWorldMs = state.worldElapsedMs;
    state.worldElapsedMs = Math.min(31_536_000_000, previousWorldMs + 7_200_000);
    return result(true, true, 'Tu choisis une halte. Deux heures de récit passent ; cela ne compte pas comme deux heures jouées.', { outcome: 'wake', worldMsAdded: state.worldElapsedMs - previousWorldMs, wakeSiteId: site.wakeSiteId });
  }
  return result(false, false, 'Interaction inconnue.');
}

/** Derived from unique completed scenes, not a farmable global clan reward. */
export function cntlipAffinitiesV77(value: unknown): Readonly<Record<string, number>> {
  const state = normalizeCntlipV77(value);
  if (!state) return {};
  return Object.fromEntries(CNTLIP_MEMORIES_V77.map(memory => [memory.participantId, state.memories.some(receipt => receipt.memoryId === memory.id) ? 1 : 0]));
}
export function cntlipEffectsV77(value: unknown, options: { safe: boolean; inCombat: boolean; reducedMotion: boolean; bioMaskWorn: boolean }) {
  const dose = options.safe && !options.inCombat ? normalizeCntlipV77(value)?.activeDoses ?? 0 : 0;
  return {
    peripheralOpacity: options.reducedMotion ? 0 : dose === 3 ? .12 : dose === 2 ? .06 : 0,
    breathGain: dose > 0 ? 1.025 : 1,
    bioMaskNoise: !options.reducedMotion && options.bioMaskWorn && dose === 3 ? .14 : 0,
    movementMultiplier: dose === 3 ? .94 : 1,
  } as const;
}

/** Runtime checkpoints must match an actual allowed action, not simply satisfy
 * the import schema. This is not cryptographic save tamper protection. */
export function validateCntlipTransitionV77(previous: unknown, proposed: unknown, action: CntlipActionV77, context: CntlipContextV77) {
  const before = normalizeCntlipV77(previous), after = normalizeCntlipV77(proposed);
  if (!before || !after) return false;
  const expected = applyCntlipV77(before, action, context);
  return expected.changed && JSON.stringify(expected.state) === JSON.stringify(after);
}

/** Reuse the game's durable callback. Do not call it twice or announce a scene
 * before it returns true. Inventory ownership remains the adapter's concern. */
export function transactCntlipV77(previous: unknown, action: CntlipActionV77, context: CntlipContextV77,
  commit: (transaction: { state: CntlipStateV77; stockAfter: number; consumesServings: 0 | 1 }) => boolean): CntlipResultV77 {
  const result = applyCntlipV77(previous, action, context);
  if (!result.changed) return result;
  if (!int(context.servingStock, 0, 10_000) || context.servingStock < result.consumesServings) return { ...result, ok: false, changed: false, state: normalizeCntlipV77(previous) ?? defaultCntlipV77(), outcome: 'none', consumesServings: 0, worldMsAdded: 0, wakeSiteId: null, message: 'Réserve incohérente : aucune écriture.' };
  let written = false;
  try { written = commit({ state: result.state, stockAfter: context.servingStock - result.consumesServings, consumesServings: result.consumesServings }) === true; } catch { written = false; }
  if (written) return result;
  return { ...result, ok: false, changed: false, state: normalizeCntlipV77(previous) ?? defaultCntlipV77(), outcome: 'none', consumesServings: 0, worldMsAdded: 0, wakeSiteId: null, message: 'Sauvegarde impossible : aucune coupe, ellipse ou relation n’a été validée.' };
}
