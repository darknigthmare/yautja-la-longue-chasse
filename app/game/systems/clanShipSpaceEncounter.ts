/**
 * Original, bounded tactical encounters commanded from the Clan Ship table.
 * The values below balance a game: they do not document AVP ship specifications.
 * The campaign owns access, room checks and the durable write/reward receipt.
 */
export const CLAN_SHIP_SPACE_VERSION = 1 as const;
export const CLAN_SHIP_SPACE_MAX_TURNS = 16;
export const CLAN_SHIP_SPACE_MAX_ENERGY = 8;
export const CLAN_SHIP_SPACE_KINDS = ['interception', 'escort', 'recovery'] as const;
export const CLAN_SHIP_SPACE_CREW_ROLES = ['navigator', 'armorer', 'medic', 'tracker', 'veteran', 'warden'] as const;
export const CLAN_SHIP_SPACE_ORDERS = ['scan', 'manoeuvre', 'recharge', 'brace', 'disrupt', 'fire', 'board', 'extract', 'withdraw'] as const;

export type ClanShipSpaceKind = (typeof CLAN_SHIP_SPACE_KINDS)[number];
export type ClanShipSpaceCrewRole = (typeof CLAN_SHIP_SPACE_CREW_ROLES)[number];
export type ClanShipSpaceOrder = (typeof CLAN_SHIP_SPACE_ORDERS)[number];
export type ClanShipSpaceStatus = 'active' | 'victory' | 'defeat' | 'withdrawn';

/** Each order is a complete turn. Closing the table never advances this clock. */
export interface ClanShipSpaceEncounter {
  version: 1;
  kind: ClanShipSpaceKind;
  status: ClanShipSpaceStatus;
  turn: number;
  /** Crew roles are fixed at departure, not changed by loading another room. */
  crewRoles: ClanShipSpaceCrewRole[];
  formationIntegrity: number;
  energy: number;
  hostileIntegrity: number;
  hostileDrive: number;
  /** 0 = distant, 1 = tactical range, 2 = close formation/boarding range. */
  range: 0 | 1 | 2;
  scanLevel: 0 | 1 | 2;
  assetIntegrity: number;
  objectiveProgress: number;
  /** At most 16 orders. Replaying these validates every saved derived value. */
  history: ClanShipSpaceOrder[];
}

export interface ClanShipSpaceCommand {
  type: ClanShipSpaceOrder;
  expectedTurn: number;
}

export type ClanShipSpaceRefusal =
  | 'invalid-state' | 'future-version' | 'invalid-command' | 'turn-mismatch'
  | 'operation-ended' | 'insufficient-energy' | 'intel-required' | 'range-required'
  | 'target-not-disabled' | 'objective-incomplete' | 'unavailable-order' | 'no-change';

export interface ClanShipSpaceResult {
  accepted: boolean;
  changed: boolean;
  state: ClanShipSpaceEncounter;
  reason: ClanShipSpaceRefusal | null;
  message: string;
}

export interface ClanShipSpaceInspection {
  status: 'absent' | 'valid' | 'invalid-save' | 'future-version';
  state: ClanShipSpaceEncounter | null;
  reason: string | null;
}

export const CLAN_SHIP_SPACE_SCENARIOS: Readonly<Record<ClanShipSpaceKind, {
  title: string; briefing: string; objective: string; assetLabel: string;
}>> = {
  interception: {
    title: 'Interception du signal hostile',
    briefing: 'Un bâtiment armé suit les routes du clan. Identifie sa signature et intercepte-le avant qu’il ne transmette la position du convoi.',
    objective: 'Neutraliser le bâtiment ou couper ses moteurs puis envoyer une équipe d’abordage.',
    assetLabel: 'Route du clan',
  },
  escort: {
    title: 'Écran de retour',
    briefing: 'Des chasseurs regagnent le vaisseau après une expédition. Couvre leur passage pendant qu’un assaillant cherche à isoler le transport.',
    objective: 'Identifier le contact, rejoindre la couverture, protéger 3 segments de route puis extraire le transport.',
    assetLabel: 'Transport allié',
  },
  recovery: {
    title: 'Capsule dans les débris',
    briefing: 'Une capsule de l’expédition dérive entre les débris. Un bâtiment hostile verrouille la zone : ouvre un passage pour l’équipe de récupération.',
    objective: 'Analyser le contact, neutraliser sa propulsion ou l’affaiblir, aborder à courte portée puis extraire la capsule.',
    assetLabel: 'Capsule à récupérer',
  },
};

export const CLAN_SHIP_SPACE_CREW_EFFECTS: Readonly<Record<ClanShipSpaceCrewRole, {
  label: string; effect: string;
}>> = {
  navigator: { label: 'Navigation', effect: 'La première manœuvre atteint directement la portée rapprochée.' },
  armorer: { label: 'Armurerie', effect: 'Les tirs et la neutralisation infligent 10 points supplémentaires.' },
  medic: { label: 'Soins', effect: 'Les pertes subies par la formation sont réduites de 2 points par tour.' },
  tracker: { label: 'Pistage', effect: 'Une seule analyse révèle l’identification et la solution d’abordage.' },
  veteran: { label: 'Vétéran', effect: 'La coordination réduit les pertes de la formation de 2 points par tour.' },
  warden: { label: 'Confinement', effect: 'L’abordage coûte 1 énergie ; le transport ou la capsule perd 2 points de moins par attaque.' },
};

const ORDER_LABELS: Readonly<Record<ClanShipSpaceOrder, string>> = {
  scan: 'Analyser le contact', manoeuvre: 'Manœuvrer', recharge: 'Répartir l’énergie', brace: 'Former un écran',
  disrupt: 'Neutraliser les moteurs', fire: 'Tir concentré', board: 'Envoyer l’abordage',
  extract: 'Extraire l’équipe', withdraw: 'Rompre le contact',
};
const ORDER_DETAILS: Readonly<Record<ClanShipSpaceOrder, string>> = {
  scan: 'Révèle la signature, puis prépare la solution d’abordage. Le contact réagit pendant l’analyse.',
  manoeuvre: 'Resserre la formation et réduit les pertes de ce tour. À portée courte, revient en couverture tactique.',
  recharge: 'Récupère 4 unités d’énergie. L’exposition accrue rend la prochaine attaque plus dangereuse.',
  brace: 'Récupère jusqu’à 2 unités d’énergie et couvre le groupe. En escorte, protège un segment après identification et rapprochement.',
  disrupt: 'Endommage la propulsion du contact identifié. À 0, l’adversaire est neutralisé et l’abordage devient possible.',
  fire: 'Frappe le bâtiment identifié. En interception, sa neutralisation complète conclut l’opération.',
  board: 'À courte portée, engage l’équipe après une analyse complète et une neutralisation suffisante.',
  extract: 'Récupère le transport ou la capsule lorsque son objectif est sécurisé.',
  withdraw: 'Rappelle la formation. L’opération se termine sans victoire ni récompense.',
};
const STATE_KEYS = [
  'version', 'kind', 'status', 'turn', 'crewRoles', 'formationIntegrity', 'energy', 'hostileIntegrity',
  'hostileDrive', 'range', 'scanLevel', 'assetIntegrity', 'objectiveProgress', 'history',
] as const;
const DERIVED_KEYS = ['status', 'turn', 'formationIntegrity', 'energy', 'hostileIntegrity', 'hostileDrive', 'range', 'scanLevel', 'assetIntegrity', 'objectiveProgress'] as const;

function record(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}
function exactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  return Reflect.ownKeys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));
}
function isKind(value: unknown): value is ClanShipSpaceKind {
  return CLAN_SHIP_SPACE_KINDS.some(kind => kind === value);
}
function isOrder(value: unknown): value is ClanShipSpaceOrder {
  return CLAN_SHIP_SPACE_ORDERS.some(order => order === value);
}
function validCrewRoles(value: unknown): value is ClanShipSpaceCrewRole[] {
  return Array.isArray(value) && value.length <= CLAN_SHIP_SPACE_CREW_ROLES.length &&
    Array.from(value).every(role => CLAN_SHIP_SPACE_CREW_ROLES.some(known => known === role)) && new Set(value).size === value.length;
}
function hasCrew(state: ClanShipSpaceEncounter, role: ClanShipSpaceCrewRole): boolean {
  return state.crewRoles.includes(role);
}
function initialState(kind: ClanShipSpaceKind, crewRoles: readonly ClanShipSpaceCrewRole[]): ClanShipSpaceEncounter {
  return {
    version: CLAN_SHIP_SPACE_VERSION, kind, status: 'active', turn: 0,
    crewRoles: CLAN_SHIP_SPACE_CREW_ROLES.filter(role => crewRoles.includes(role)),
    formationIntegrity: 100, energy: 5, hostileIntegrity: 100, hostileDrive: 100,
    range: 0, scanLevel: 0, assetIntegrity: 100, objectiveProgress: 0, history: [],
  };
}

export function createClanShipSpaceEncounter(
  kind: ClanShipSpaceKind,
  crewRoles: readonly ClanShipSpaceCrewRole[] = [],
): ClanShipSpaceEncounter {
  if (!isKind(kind) || !validCrewRoles(crewRoles)) throw new TypeError('Scénario spatial ou rôles d’équipage inconnus.');
  return initialState(kind, crewRoles);
}

export interface ClanShipSpaceIntent {
  id: 'acquire' | 'volley' | 'flank' | 'disabled';
  label: string;
  detail: string;
}

/** Public, predictable enemy intent: the player chooses a counter, not a timer. */
export function clanShipSpaceEnemyIntent(state: ClanShipSpaceEncounter): ClanShipSpaceIntent {
  if (state.hostileDrive === 0 || state.hostileIntegrity === 0 || state.status !== 'active') {
    return { id: 'disabled', label: 'Contact neutralisé', detail: 'Aucune nouvelle attaque du contact.' };
  }
  if (state.turn % 3 === 0) return { id: 'acquire', label: 'Acquisition de cible', detail: 'L’assaillant cherche une solution de tir. Profite de cette fenêtre pour analyser ou recharger.' };
  if (state.turn % 3 === 1) return { id: 'volley', label: 'Salve imminente', detail: 'Une salve menace la formation. Manœuvrer ou former un écran réduit les pertes de ce tour.' };
  return { id: 'flank', label: 'Contournement', detail: 'Le contact cherche le transport ou la capsule. Un écran protège l’objectif.' };
}

export interface ClanShipSpaceOrderAvailability {
  available: boolean;
  label: string;
  detail: string;
  cost: number;
  reason: ClanShipSpaceRefusal | null;
  message: string | null;
}

export function clanShipSpaceOrderAvailability(state: ClanShipSpaceEncounter, order: ClanShipSpaceOrder): ClanShipSpaceOrderAvailability {
  const cost = order === 'scan' || order === 'manoeuvre' ? 1 : order === 'fire' || order === 'disrupt' ? 3
    : order === 'extract' ? 2 : order === 'board' ? hasCrew(state, 'warden') ? 1 : 2 : 0;
  const base = { label: ORDER_LABELS[order], detail: ORDER_DETAILS[order], cost };
  const denied = (reason: ClanShipSpaceRefusal, message: string): ClanShipSpaceOrderAvailability => ({ ...base, available: false, reason, message });
  if (state.status !== 'active') return denied('operation-ended', 'Cette opération est terminée.');
  if (order === 'withdraw') return { ...base, available: true, reason: null, message: null };
  if (order === 'scan' && state.scanLevel === 2) return denied('no-change', 'Analyse complète : signature et approche connues.');
  if (order === 'recharge' && state.energy === CLAN_SHIP_SPACE_MAX_ENERGY) return denied('no-change', 'La réserve d’énergie est pleine.');
  if (order === 'disrupt' || order === 'fire') {
    if (state.scanLevel === 0) return denied('intel-required', 'Analyse le contact avant de choisir un tir.');
    if (state.range === 0) return denied('range-required', 'Manœuvre à portée tactique.');
    if (state.hostileDrive === 0 || state.hostileIntegrity === 0) return denied('no-change', 'Le contact est déjà neutralisé.');
  }
  if (order === 'board') {
    if (state.kind === 'escort') return denied('unavailable-order', 'Cette mission exige de couvrir puis d’extraire le transport.');
    if (state.objectiveProgress === 2) return denied('no-change', 'L’équipe a récupéré la capsule ; lance l’extraction.');
    if (state.scanLevel !== 2) return denied('intel-required', 'Deux niveaux d’analyse sont nécessaires à l’abordage.');
    if (state.range !== 2) return denied('range-required', 'L’abordage exige une formation rapprochée.');
    if (state.hostileDrive > 20 && state.hostileIntegrity > 35) return denied('target-not-disabled', 'Réduis la propulsion à 20 ou l’intégrité du contact à 35.');
  }
  if (order === 'extract') {
    if (state.kind === 'interception') return denied('unavailable-order', 'Neutralise le contact ou mène l’abordage.');
    if (state.kind === 'escort' && state.objectiveProgress !== 3) return denied('objective-incomplete', 'Protège 3 segments avec un écran ou une manœuvre, après identification et rapprochement.');
    if (state.kind === 'recovery' && state.objectiveProgress !== 2) return denied('objective-incomplete', 'L’équipe doit d’abord récupérer la capsule par abordage.');
  }
  if (state.energy < cost) return denied('insufficient-energy', `Il faut ${cost} unités d’énergie. Forme un écran ou répartis l’énergie.`);
  return { ...base, available: true, reason: null, message: null };
}

function applyOrder(state: ClanShipSpaceEncounter, order: ClanShipSpaceOrder): ClanShipSpaceResult {
  const availability = clanShipSpaceOrderAvailability(state, order);
  if (!availability.available) return { accepted: false, changed: false, state, reason: availability.reason, message: availability.message! };
  const next: ClanShipSpaceEncounter = {
    ...state, crewRoles: [...state.crewRoles], history: [...state.history, order],
    turn: state.turn + 1, energy: state.energy - availability.cost,
  };
  const intent = clanShipSpaceEnemyIntent(state);
  const fragments: string[] = [];
  if (order === 'withdraw') {
    next.status = 'withdrawn';
    return { accepted: true, changed: true, state: next, reason: null, message: 'Contact rompu. La formation revient sans victoire attribuée.' };
  }
  if (order === 'scan') {
    next.scanLevel = Math.min(2, state.scanLevel + (hasCrew(state, 'tracker') ? 2 : 1)) as 1 | 2;
    fragments.push(next.scanLevel === 2 ? 'Solution d’abordage calculée.' : 'Signature hostile identifiée.');
  }
  if (order === 'manoeuvre') {
    next.range = state.range === 2 ? 1 : hasCrew(state, 'navigator') ? 2 : (state.range + 1) as 1 | 2;
    fragments.push(next.range === 2 ? 'Formation rapprochée en place.' : 'Formation à portée tactique.');
  }
  if (order === 'recharge' || order === 'brace') {
    const restored = Math.min(CLAN_SHIP_SPACE_MAX_ENERGY - state.energy, order === 'recharge' ? 4 : 2);
    next.energy = state.energy + restored;
    fragments.push(order === 'brace' ? `Écran défensif établi ; ${restored} énergie récupérée.` : `${restored} énergie récupérée ; la formation s’expose.`);
  }
  if (order === 'disrupt') {
    const damage = 40 + (hasCrew(state, 'armorer') ? 10 : 0);
    next.hostileDrive = Math.max(0, state.hostileDrive - damage);
    next.hostileIntegrity = Math.max(0, state.hostileIntegrity - 4);
    fragments.push(`Propulsion hostile réduite à ${next.hostileDrive}.`);
  }
  if (order === 'fire') {
    const damage = 32 + state.scanLevel * 4 + (hasCrew(state, 'armorer') ? 10 : 0);
    next.hostileIntegrity = Math.max(0, state.hostileIntegrity - damage);
    if (next.hostileIntegrity === 0) next.hostileDrive = 0;
    fragments.push(`Intégrité du contact réduite à ${next.hostileIntegrity}.`);
  }
  if (state.kind === 'escort' && state.scanLevel > 0 && next.range > 0 && (order === 'brace' || order === 'manoeuvre')) {
    next.objectiveProgress = Math.min(3, state.objectiveProgress + 1);
    fragments.push(`Segment protégé : ${next.objectiveProgress}/3.`);
  }
  if (order === 'board') {
    next.hostileDrive = 0;
    next.objectiveProgress = state.kind === 'recovery' ? 2 : 3;
    fragments.push(state.kind === 'recovery' ? 'Capsule récupérée. L’équipe attend le signal d’extraction.' : 'Le bâtiment est maîtrisé ; ses relevés sont récupérés.');
  }
  if (order === 'extract' || (state.kind === 'interception' && (order === 'board' || next.hostileIntegrity === 0))) {
    next.status = 'victory';
    if (order === 'extract') next.objectiveProgress = 3;
    fragments.push('Objectif sécurisé. L’opération est réussie.');
  }
  // A completed extraction/boarding is resolved before the enemy can strike
  // again. Otherwise the same deterministic response survives every reload.
  if (next.status === 'active' && next.hostileDrive > 0 && next.hostileIntegrity > 0) {
    let formationLoss = intent.id === 'acquire' ? 8 : intent.id === 'volley' ? 19 : 14;
    let assetLoss = state.kind === 'interception' ? 0 : intent.id === 'acquire' ? 3 : intent.id === 'volley' ? 8 : 13;
    if (state.turn >= 9) { formationLoss += 4; if (assetLoss > 0) assetLoss += 2; }
    if (next.hostileDrive <= 20 || next.hostileIntegrity <= 35) { formationLoss = Math.ceil(formationLoss / 2); assetLoss = Math.ceil(assetLoss / 2); }
    if (order === 'brace') { formationLoss = Math.ceil(formationLoss * .35); assetLoss = Math.ceil(assetLoss * .3); }
    if (order === 'manoeuvre') { formationLoss = Math.ceil(formationLoss * .55); assetLoss = Math.ceil(assetLoss * .7); }
    if (order === 'recharge') formationLoss = Math.ceil(formationLoss * 1.25);
    formationLoss = Math.max(0, formationLoss - (hasCrew(state, 'medic') ? 2 : 0) - (hasCrew(state, 'veteran') ? 2 : 0));
    assetLoss = Math.max(0, assetLoss - (hasCrew(state, 'warden') ? 2 : 0));
    next.formationIntegrity = Math.max(0, state.formationIntegrity - formationLoss);
    next.assetIntegrity = Math.max(0, state.assetIntegrity - assetLoss);
    fragments.push(`Réaction hostile : −${formationLoss} formation${assetLoss > 0 ? `, −${assetLoss} objectif` : ''}.`);
  }
  if (next.status === 'active' && (next.formationIntegrity === 0 || next.assetIntegrity === 0 || next.turn === CLAN_SHIP_SPACE_MAX_TURNS)) {
    next.status = 'defeat';
    fragments.push(next.turn === CLAN_SHIP_SPACE_MAX_TURNS && next.formationIntegrity > 0 && next.assetIntegrity > 0
      ? 'La fenêtre d’opération s’est refermée. Repli sans récompense.'
      : 'La formation ou son objectif ne peut plus poursuivre. Repli sans récompense.');
  }
  return { accepted: true, changed: true, state: next, reason: null, message: fragments.join(' ') };
}

/**
 * Derived values must exactly match a replay of the bounded order journal.
 * Invalid/future saves never turn into a fresh encounter or a free victory.
 * This protects local consistency; a local save is not multiplayer authority.
 */
export function inspectClanShipSpaceEncounter(raw: unknown): ClanShipSpaceInspection {
  const invalid = (reason: string): ClanShipSpaceInspection => ({ status: 'invalid-save', state: null, reason });
  if (raw === undefined || raw === null) return { status: 'absent', state: null, reason: null };
  if (!record(raw)) return invalid('invalid-record');
  if (Number.isSafeInteger(raw.version) && Number(raw.version) > CLAN_SHIP_SPACE_VERSION) return { status: 'future-version', state: null, reason: 'unsupported-version' };
  if (raw.version !== CLAN_SHIP_SPACE_VERSION) return invalid('invalid-version');
  if (!exactKeys(raw, STATE_KEYS)) return invalid('invalid-fields');
  if (!isKind(raw.kind) || !validCrewRoles(raw.crewRoles)) return invalid('invalid-scenario-or-crew');
  if (!Array.isArray(raw.history) || raw.history.length > CLAN_SHIP_SPACE_MAX_TURNS || !Array.from(raw.history).every(isOrder)) return invalid('invalid-order-journal');
  const crewRoles = raw.crewRoles;
  let restored = initialState(raw.kind, raw.crewRoles);
  if (restored.crewRoles.some((role, index) => role !== crewRoles[index])) return invalid('noncanonical-crew-order');
  for (const order of raw.history) {
    const result = applyOrder(restored, order);
    if (!result.accepted) return invalid('impossible-order-journal');
    restored = result.state;
  }
  if (DERIVED_KEYS.some(key => raw[key] !== restored[key])) return invalid('inconsistent-encounter');
  return { status: 'valid', state: restored, reason: null };
}

export function actClanShipSpaceEncounter(state: ClanShipSpaceEncounter, command: ClanShipSpaceCommand): ClanShipSpaceResult {
  const refused = (reason: ClanShipSpaceRefusal, message: string): ClanShipSpaceResult => ({ accepted: false, changed: false, state, reason, message });
  const inspected = inspectClanShipSpaceEncounter(state);
  if (inspected.status === 'future-version') return refused('future-version', 'Cette opération appartient à une version plus récente.');
  if (inspected.status !== 'valid') return refused('invalid-state', 'L’opération spatiale enregistrée est incohérente ; elle reste intacte.');
  if (!record(command) || !exactKeys(command, ['type', 'expectedTurn']) || !isOrder(command.type) ||
      !Number.isSafeInteger(command.expectedTurn) || command.expectedTurn < 0 || command.expectedTurn > CLAN_SHIP_SPACE_MAX_TURNS) {
    return refused('invalid-command', 'Cet ordre spatial est invalide.');
  }
  if (command.expectedTurn !== state.turn) return refused('turn-mismatch', 'Le tour a déjà changé. Consulte la situation actualisée avant de donner un ordre.');
  const result = applyOrder(inspected.state!, command.type);
  return result.accepted ? result : { ...result, state };
}

export interface ClanShipSpaceOrderPreview {
  energyChange: number;
  formationLoss: number;
  assetLoss: number;
  hostileIntegrityLoss: number;
  hostileDriveLoss: number;
  objectiveGain: number;
  outcome: ClanShipSpaceStatus;
}

/**
 * The tactical table exposes the consequences of its deterministic rules.
 * Previewing an order cannot advance, mutate or reward the saved encounter.
 * In particular, energy feedback uses the real cap and crew contributions.
 */
export function previewClanShipSpaceOrder(state: ClanShipSpaceEncounter, order: ClanShipSpaceOrder): ClanShipSpaceOrderPreview | null {
  if (!isOrder(order)) return null;
  const inspected = inspectClanShipSpaceEncounter(state);
  if (inspected.status !== 'valid') return null;
  const result = applyOrder(inspected.state!, order);
  if (!result.accepted) return null;
  return {
    energyChange: result.state.energy - state.energy,
    formationLoss: state.formationIntegrity - result.state.formationIntegrity,
    assetLoss: state.assetIntegrity - result.state.assetIntegrity,
    hostileIntegrityLoss: state.hostileIntegrity - result.state.hostileIntegrity,
    hostileDriveLoss: state.hostileDrive - result.state.hostileDrive,
    objectiveGain: result.state.objectiveProgress - state.objectiveProgress,
    outcome: result.state.status,
  };
}

/** Read-only recent messages, reconstructed without saving display strings. */
export function clanShipSpaceReports(state: ClanShipSpaceEncounter): { turn: number; order: ClanShipSpaceOrder; message: string }[] {
  let replay = initialState(state.kind, state.crewRoles);
  const reports: { turn: number; order: ClanShipSpaceOrder; message: string }[] = [];
  for (const order of state.history) {
    const result = applyOrder(replay, order);
    if (!result.accepted) break;
    replay = result.state;
    reports.push({ turn: replay.turn, order, message: result.message });
  }
  return reports.slice(-4);
}
