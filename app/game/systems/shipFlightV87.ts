import source from '../data/shipFlightSourceV87.json';

/** Discrete controls are the workbook's accessibility variant. The displayed
 * distances and speeds are game scales, never physical franchise specifications. */
export const SHIP_FLIGHT_SOURCE_V87 = source;
export const SHIP_FLIGHT_VERSION_V87 = 1 as const;
export type ShipFlightPhaseV87 = 'alignment' | 'approach' | 'locks' | 'berthed' | 'return-route' | 'return-alignment' | 'return-approach' | 'return-locks' | 'returned';
export interface ShipFlightStateV87 {
  version: 1; ownerSaveCreatedAt: string; operationId: string; revision: number;
  sourceSha256: string;
  phase: ShipFlightPhaseV87; lateral: number; distance: number; speed: number;
  locks: [boolean, boolean]; ring: number; route: [string, string, string];
  sourceReceipts: string[]; setbacks: number;
}
export type ShipFlightActionV87 = { type: 'lateral'; direction: -1 | 1 } | { type: 'align' } |
  { type: 'speed'; direction: -1 | 1 } | { type: 'advance' } | { type: 'retreat' } |
  { type: 'lock'; index: 0 | 1 } | { type: 'ring'; direction: -1 | 1 } | { type: 'berth' } |
  { type: 'return-route' } | { type: 'route'; slot: 0 | 1 | 2; node: string } | { type: 'confirm-route' };
export interface ShipFlightRouteV87 { originId: string; relayId: string; destinationId: string }
export interface ShipFlightResultV87 { state: ShipFlightStateV87; accepted: boolean; changed: boolean; message: string }
export interface ShipFlightKeyboardInputV87 {
  key: string; open: boolean; paused: boolean; checkpointValid: boolean;
  documentFocused: boolean; documentVisible: boolean; consoleFocused: boolean;
  /** Exact event target, not a child button/select with native key behavior. */
  targetIsConsole: boolean; repeat: boolean; modified: boolean; defaultPrevented: boolean;
}
export const SHIP_FLIGHT_KEYBOARD_HELP_V87: Readonly<Record<ShipFlightPhaseV87, string>> = {
  alignment: 'Poste sélectionné : ← / → déplacer les balises ; Entrée maintenir l’alignement.',
  approach: 'Poste sélectionné : ↑ propulsion, ↓ freinage ; Entrée avancer d’un cran ; R reculer au point sûr.',
  locks: 'Poste sélectionné : 1 attache gauche, 2 attache droite ; ↑ / ↓ serrer ou desserrer la bague ; Entrée confirmer l’arrimage.',
  berthed: 'Poste sélectionné : Entrée préparer la route de retour.',
  'return-route': 'Tab rejoint les trois listes ; leurs flèches restent natives. Sélectionnez site, relais et quai, puis revenez au poste et pressez Entrée pour confirmer.',
  'return-alignment': 'Poste sélectionné : ← / → aligner les balises du retour ; Entrée maintenir l’alignement.',
  'return-approach': 'Poste sélectionné : ↑ propulsion, ↓ freinage ; Entrée avancer d’un cran ; R reculer au point sûr.',
  'return-locks': 'Poste sélectionné : 1 attache gauche, 2 attache droite ; ↑ / ↓ régler la bague ; Entrée confirmer le second arrimage.',
  returned: 'Retour arrimé. Les boutons et la fermeture de l’exercice restent accessibles avec Tab.',
};
/** Deliberately local to the focused console. Native controls elsewhere keep
 * their Enter/click and arrows; a held key never repeats a discrete gesture. */
export function resolveShipFlightKeyboardV87(phase: ShipFlightPhaseV87, input: ShipFlightKeyboardInputV87): ShipFlightActionV87 | null {
  if (!input || !input.open || input.paused || !input.checkpointValid || !input.documentFocused || !input.documentVisible ||
    !input.consoleFocused || !input.targetIsConsole || input.repeat || input.modified || input.defaultPrevented) return null;
  if (phase === 'alignment' || phase === 'return-alignment') {
    if (input.key === 'ArrowLeft') return { type: 'lateral', direction: -1 };
    if (input.key === 'ArrowRight') return { type: 'lateral', direction: 1 };
    if (input.key === 'Enter') return { type: 'align' };
  } else if (phase === 'approach' || phase === 'return-approach') {
    if (input.key === 'ArrowUp') return { type: 'speed', direction: 1 };
    if (input.key === 'ArrowDown') return { type: 'speed', direction: -1 };
    if (input.key === 'Enter') return { type: 'advance' };
    if (input.key === 'r' || input.key === 'R') return { type: 'retreat' };
  } else if (phase === 'locks' || phase === 'return-locks') {
    if (input.key === '1') return { type: 'lock', index: 0 };
    if (input.key === '2') return { type: 'lock', index: 1 };
    if (input.key === 'ArrowUp') return { type: 'ring', direction: 1 };
    if (input.key === 'ArrowDown') return { type: 'ring', direction: -1 };
    if (input.key === 'Enter') return { type: 'berth' };
  } else if (phase === 'berthed' && input.key === 'Enter') return { type: 'return-route' };
  else if (phase === 'return-route' && input.key === 'Enter') return { type: 'confirm-route' };
  return null;
}
const record = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const identity = (value: unknown): value is string => typeof value === 'string' && value.length > 0 && value.length <= 160 && !/[\x00-\x1f]/.test(value);
const integer = (value: unknown, min: number, max: number): value is number => Number.isSafeInteger(value) && Number(value) >= min && Number(value) <= max;
const phases: readonly ShipFlightPhaseV87[] = ['alignment', 'approach', 'locks', 'berthed', 'return-route', 'return-alignment', 'return-approach', 'return-locks', 'returned'];
const allowedReceipts = ['FLIGHT5-01:outward', 'FLIGHT5-02:outward', 'FLIGHT5-03:outward', 'FLIGHT5-11:return', 'FLIGHT5-01:return', 'FLIGHT5-02:return', 'FLIGHT5-03:return'];
export function createShipFlightV87(ownerSaveCreatedAt: string, operationId: string): ShipFlightStateV87 {
  if (!identity(ownerSaveCreatedAt) || !identity(operationId)) throw new Error('Identité de manœuvre absente.');
  return { version: 1, sourceSha256: source.source.sha256, ownerSaveCreatedAt, operationId, revision: 0, phase: 'alignment', lateral: 3, distance: 100, speed: 3,
    locks: [false, false], ring: 0, route: ['', '', ''], sourceReceipts: [], setbacks: 0 };
}
/** Present-but-invalid checkpoints must be preserved by the parent, never reset. */
export function normalizeShipFlightV87(value: unknown, ownerSaveCreatedAt?: string): ShipFlightStateV87 | null {
  if (!record(value) || value.version !== 1 || value.sourceSha256 !== source.source.sha256 || !identity(value.ownerSaveCreatedAt) || !identity(value.operationId) ||
    (ownerSaveCreatedAt !== undefined && value.ownerSaveCreatedAt !== ownerSaveCreatedAt) || !integer(value.revision, 0, 100000) ||
    !phases.includes(value.phase as ShipFlightPhaseV87) || !integer(value.lateral, -6, 6) || !integer(value.distance, 0, 100) ||
    !integer(value.speed, 0, 3) || !integer(value.ring, 0, 2) || !integer(value.setbacks, 0, 10000) ||
    !Array.isArray(value.locks) || value.locks.length !== 2 || value.locks.some(v => typeof v !== 'boolean') ||
    !Array.isArray(value.route) || value.route.length !== 3 || value.route.some(v => v !== '' && !identity(v)) ||
    !Array.isArray(value.sourceReceipts) || value.sourceReceipts.length > 7 || value.sourceReceipts.some(v => !allowedReceipts.includes(String(v))) ||
    new Set(value.sourceReceipts).size !== value.sourceReceipts.length) return null;
  const phase = value.phase as ShipFlightPhaseV87, receipts = value.sourceReceipts as string[];
  const requiredCount = [0, 1, 2, 3, 3, 4, 5, 6, 7][phases.indexOf(phase)];
  if (receipts.join('|') !== allowedReceipts.slice(0, requiredCount).join('|')) return null;
  const completedOutward = phases.indexOf(phase) >= phases.indexOf('berthed');
  const returning = phases.indexOf(phase) >= phases.indexOf('return-alignment');
  if ((phase === 'approach' || phase === 'locks' || phase === 'berthed' || phase === 'return-approach' || phase === 'return-locks' || phase === 'returned') && value.lateral !== 0) return null;
  if ((phase === 'locks' || phase === 'berthed' || phase === 'return-locks' || phase === 'returned') && (value.distance !== 0 || value.speed !== 0)) return null;
  if ((phase === 'berthed' || phase === 'returned') && (!value.locks.every(Boolean) || value.ring !== 2)) return null;
  if (completedOutward && !['FLIGHT5-01:outward', 'FLIGHT5-02:outward', 'FLIGHT5-03:outward'].every(v => receipts.includes(v))) return null;
  if (returning && (!receipts.includes('FLIGHT5-11:return') || value.route.some(v => v === '') || new Set(value.route).size !== 3)) return null;
  if (phase === 'returned' && !['FLIGHT5-01:return', 'FLIGHT5-02:return', 'FLIGHT5-03:return'].every(v => receipts.includes(v))) return null;
  return { version: 1, sourceSha256: source.source.sha256, ownerSaveCreatedAt: value.ownerSaveCreatedAt, operationId: value.operationId, revision: value.revision,
    phase, lateral: value.lateral, distance: value.distance, speed: value.speed, locks: [...value.locks] as [boolean, boolean],
    ring: value.ring, route: [...value.route] as [string, string, string], sourceReceipts: [...receipts], setbacks: value.setbacks };
}
export function stepShipFlightV87(current: ShipFlightStateV87, action: ShipFlightActionV87, route: ShipFlightRouteV87): ShipFlightResultV87 {
  const valid = normalizeShipFlightV87(current), refused = (message: string): ShipFlightResultV87 => ({ state: current, accepted: false, changed: false, message });
  if (!valid || !record(action)) return refused('Checkpoint de manœuvre invalide.');
  if (![route.originId, route.relayId, route.destinationId].every(identity) || new Set(Object.values(route)).size !== 3) return refused('La route demande trois lieux distincts établis.');
  if (current.revision >= 100000) return refused('La limite de ce registre de manœuvre est atteinte.');
  const next = { ...valid, locks: [...valid.locks] as [boolean, boolean], route: [...valid.route] as [string, string, string], sourceReceipts: [...valid.sourceReceipts] };
  const returning = next.phase.startsWith('return-'), suffix = returning ? 'return' : 'outward';
  const add = (id: string) => { if (!next.sourceReceipts.includes(id)) next.sourceReceipts.push(id); };
  let message = '';
  if (action.type === 'lateral' && (next.phase === 'alignment' || next.phase === 'return-alignment') && [-1, 1].includes(action.direction)) {
    next.lateral = Math.max(-6, Math.min(6, next.lateral + action.direction)); message = 'Repère latéral déplacé.';
  } else if (action.type === 'align' && (next.phase === 'alignment' || next.phase === 'return-alignment')) {
    if (next.lateral !== 0) return refused('Superposez les deux balises avant de maintenir l’alignement.');
    next.phase = returning ? 'return-approach' : 'approach'; add(`FLIGHT5-01:${suffix}`); message = 'Alignement maintenu : réglez la vitesse de fermeture.';
  } else if (action.type === 'speed' && (next.phase === 'approach' || next.phase === 'return-approach') && [-1, 1].includes(action.direction)) {
    next.speed = Math.max(0, Math.min(3, next.speed + action.direction)); message = 'Vitesse de fermeture ajustée.';
  } else if (action.type === 'advance' && (next.phase === 'approach' || next.phase === 'return-approach')) {
    if (!next.speed) return refused('La coque est à l’arrêt : engagez un cran de propulsion pour approcher.');
    if (next.distance <= next.speed * 10 && next.speed > 1) {
      next.distance = Math.min(100, next.distance + 20); next.speed = 0; next.setbacks = Math.min(10000, next.setbacks + 1);
      message = 'Fermeture trop rapide : recul contrôlé vers le point sûr. La charge reste à bord.';
    } else {
      next.distance = Math.max(0, next.distance - next.speed * 10);
      if (next.distance === 0) { next.speed = 0; next.phase = returning ? 'return-locks' : 'locks'; add(`FLIGHT5-02:${suffix}`); message = 'Coque stable devant le quai : engagez les deux attaches.'; }
      else message = 'Approche continue : le quai se rapproche dans le même couloir.';
    }
  } else if (action.type === 'retreat' && (next.phase === 'approach' || next.phase === 'return-approach')) {
    next.distance = Math.min(100, next.distance + 10); next.speed = 0; message = 'Recul contrôlé ; alignement conservé.';
  } else if (action.type === 'lock' && (next.phase === 'locks' || next.phase === 'return-locks') && [0, 1].includes(action.index)) {
    if (next.ring > 0) return refused('Ramenez la bague au cran libre avant de modifier une attache.');
    next.locks[action.index] = !next.locks[action.index]; message = next.locks[action.index] ? `Attache ${action.index + 1} engagée.` : `Attache ${action.index + 1} libérée.`;
  } else if (action.type === 'ring' && (next.phase === 'locks' || next.phase === 'return-locks') && [-1, 1].includes(action.direction)) {
    if (action.direction === 1 && !next.locks.every(Boolean)) return refused('Les deux attaches doivent être engagées avant la bague.');
    next.ring = Math.max(0, Math.min(2, next.ring + action.direction)); message = 'Bague de verrouillage déplacée.';
  } else if (action.type === 'berth' && (next.phase === 'locks' || next.phase === 'return-locks')) {
    if (!next.locks.every(Boolean) || next.ring !== 2) return refused('Confirmez les deux appuis et les deux crans de la bague.');
    next.phase = returning ? 'returned' : 'berthed'; add(`FLIGHT5-03:${suffix}`); message = returning ? 'Coque arrimée au quai d’origine ; dispositions de retour à consigner.' : 'Coque arrimée au quai de destination.';
  } else if (action.type === 'return-route' && next.phase === 'berthed') {
    next.phase = 'return-route'; next.route = ['', '', '']; message = 'Reliez le site actuel, le relais réel et le quai d’origine.';
  } else if (action.type === 'route' && next.phase === 'return-route' && [0, 1, 2].includes(action.slot) && [route.originId, route.relayId, route.destinationId].includes(action.node)) {
    next.route[action.slot] = action.node; message = 'Plaque de route placée.';
  } else if (action.type === 'confirm-route' && next.phase === 'return-route') {
    if (next.route.join('|') !== [route.destinationId, route.relayId, route.originId].join('|')) return refused('La liaison continue doit partir du site actuel, passer par le relais puis rejoindre le quai d’origine.');
    next.phase = 'return-alignment'; next.lateral = -3; next.distance = 100; next.speed = 3; next.locks = [false, false]; next.ring = 0;
    add('FLIGHT5-11:return'); message = 'Route de retour reliée : reprenez l’approche du quai d’origine.';
  } else return refused('Ce geste ne correspond pas à la phase actuelle.');
  const changed = JSON.stringify(next) !== JSON.stringify(valid);
  if (changed) next.revision++;
  return { state: changed ? next : current, accepted: true, changed, message };
}
