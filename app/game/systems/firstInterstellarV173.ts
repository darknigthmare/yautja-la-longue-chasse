import type { SaveGame } from '../types';
import type { ShipId } from '../shipCatalogue';
import { shipReceiptV161 } from './shipReceiptV161';
import {
  createShipFlightV87,
  stepShipFlightV87,
  type ShipFlightActionV87,
  type ShipFlightRouteV87,
  type ShipFlightStateV87,
} from './shipFlightV87';
import { normalizeSpaceRoutesV159, spaceBaseV159 } from './spaceRoutesV159';

export const FIRST_INTERSTELLAR_V173 = {
  missionId: 'R2-M023',
  destination: spaceBaseV159('SPACE-BASE-01')!,
  relay: spaceBaseV159('SPACE-BASE-02')!,
  hangar: ['Pont de préparation', 'Passerelle', 'Vestibule', 'Sas', 'Siège de pilotage'],
  quay: ['Pont', 'Sas', 'Passerelle', 'Quai des arrivées', 'Dépôt des départs', 'Salle des routes'],
} as const;

const ROUTES = {
  direct: [-1, 1, 0],
  stopover: [1, -2, 1],
} as const;

type Route = keyof typeof ROUTES;
type Direction = -1 | 1;
type Phase = 'plan' | 'hangar' | 'travel' | 'approach' | 'quay' | 'returned';
type MooringActionV173 = Exclude<ShipFlightActionV87, { type: 'return-route' | 'route' | 'confirm-route' }>;

export type FirstInterstellarActionV173 =
  | { kind: 'plan'; route: Route }
  | { kind: 'walk' | 'steer'; direction: Direction }
  | { kind: 'mooring'; action: MooringActionV173 }
  | { kind: 'launch' | 'beacon' | 'relay' };

export type FirstInterstellarStateV173 = {
  version: 1;
  owner: string;
  hullInstanceId: string;
  actions: FirstInterstellarActionV173[];
};

export type FirstInterstellarViewV173 = {
  phase: Phase;
  route: Route | null;
  position: number;
  bearing: number;
  passingBeacon: number;
  targetBearing: number | null;
  relayLogged: boolean;
  visitedDestination: string | null;
  flight: ShipFlightStateV87 | null;
};

type ShipSave = Pick<SaveGame, 'createdAt' | 'profile' | 'prologue' | 'shipAcquisitionV89' | 'clanShipDocking' | 'spaceRoutesV159'>;
export type FirstInterstellarAccessV173 =
  | { allowed: true; owner: string; hullInstanceId: string; shipId: ShipId }
  | { allowed: false; reason: string };

export function firstInterstellarAccessV173(
  save: ShipSave,
  selectedShip: ShipId,
  preflightReady: boolean,
  state: unknown,
): FirstInterstellarAccessV173 {
  const receipt = shipReceiptV161(save).receipt;
  if (!receipt || receipt.shipId !== selectedShip) {
    return { allowed: false, reason: 'Prenez le vaisseau dont le chantier vous a remis les droits (R2-M021).' };
  }
  if (save.clanShipDocking && save.clanShipDocking.status !== 'free-flight') {
    return { allowed: false, reason: 'Désamarrez la coque avant son premier trajet.' };
  }
  if (normalizeSpaceRoutesV159(save.spaceRoutesV159, save.createdAt)?.trip) {
    return { allowed: false, reason: 'Terminez la route spatiale déjà engagée.' };
  }
  const checkpoint = inspectFirstInterstellarV173(state, save.createdAt);
  if (checkpoint.status === 'invalid' || checkpoint.status === 'future-version'
      || (checkpoint.state && checkpoint.state.hullInstanceId !== receipt.instanceId)) {
    return { allowed: false, reason: 'Le relevé de trajet ne correspond pas à cette coque.' };
  }
  if ((checkpoint.view.phase === 'plan' || checkpoint.view.phase === 'hangar') && !preflightReady) {
    return { allowed: false, reason: 'Les huit postes du prévol doivent être inspectés (R2-M022).' };
  }
  return { allowed: true, owner: save.createdAt, hullInstanceId: receipt.instanceId, shipId: selectedShip };
}

export function firstInterstellarRouteV173(route: Route): ShipFlightRouteV87 {
  return {
    originId: 'Hangar de départ',
    relayId: route === 'stopover' ? FIRST_INTERSTELLAR_V173.relay.title : 'Balise de navigation',
    destinationId: FIRST_INTERSTELLAR_V173.destination.title,
  };
}

const initial = (): FirstInterstellarViewV173 => ({
  phase: 'plan', route: null, position: 0, bearing: 0, passingBeacon: 0,
  targetBearing: null, relayLogged: false, visitedDestination: null, flight: null,
});

type Result = { accepted: boolean; message: string };
function advance(view: FirstInterstellarViewV173, command: FirstInterstellarActionV173, owner: string): Result {
  const refuse = (message: string): Result => ({ accepted: false, message });
  const confirm = (message: string): Result => ({ accepted: true, message });
  if (command.kind === 'plan' && view.phase === 'plan') {
    view.phase = 'hangar';
    view.route = command.route;
    view.targetBearing = ROUTES[command.route][0];
    return confirm('Route engagée au pont. Rejoignez le sas puis le siège de pilotage.');
  }
  if (!view.route) return refuse('Choisissez le trajet avant le départ.');
  if (command.kind === 'walk' && (view.phase === 'hangar' || view.phase === 'quay')) {
    const lane = view.phase === 'hangar' ? FIRST_INTERSTELLAR_V173.hangar : FIRST_INTERSTELLAR_V173.quay;
    const next = view.position + command.direction;
    if (next < 0 || next >= lane.length) return refuse('Le passage s’arrête ici.');
    view.position = next;
    if (view.phase === 'quay') {
      if (next === FIRST_INTERSTELLAR_V173.quay.length - 1) {
        view.visitedDestination = FIRST_INTERSTELLAR_V173.destination.id;
        return confirm('Salle des routes atteinte. Regagnez la coque pour consigner le trajet.');
      }
      if (next === 0 && view.visitedDestination) {
        view.phase = 'returned';
        return confirm('Retour à bord. Le premier trajet interstellaire est consigné.');
      }
    }
    return confirm(lane[next]);
  }
  if (command.kind === 'launch' && view.phase === 'hangar') {
    if (view.position !== FIRST_INTERSTELLAR_V173.hangar.length - 1) return refuse('Traversez le sas jusqu’au poste de pilotage.');
    view.phase = 'travel';
    return confirm('Départ confirmé. Ajustez le cap pour franchir la première balise.');
  }
  if (view.phase === 'travel') {
    if (command.kind === 'steer') {
      const next = view.bearing + command.direction;
      if (next < -2 || next > 2) return refuse('Butée de gouverne.');
      view.bearing = next;
      return confirm('Cap ajusté.');
    }
    if (command.kind === 'relay') {
      if (view.route !== 'stopover' || view.passingBeacon !== 1 || view.relayLogged) return refuse('Aucune escale à confirmer ici.');
      view.relayLogged = true;
      return confirm('Escale confirmée par la Halte des Trois Routes.');
    }
    if (command.kind === 'beacon') {
      if (view.route === 'stopover' && view.passingBeacon === 1 && !view.relayLogged) return refuse('Consignez l’escale avant de poursuivre.');
      if (view.bearing !== view.targetBearing) return refuse('Cap incorrect. Suivez le prochain repère.');
      view.passingBeacon += 1;
      view.targetBearing = ROUTES[view.route][view.passingBeacon] ?? null;
      if (view.passingBeacon === ROUTES[view.route].length) {
        view.flight = createShipFlightV87(owner, FIRST_INTERSTELLAR_V173.missionId);
        view.phase = 'approach';
        return confirm('Trois balises franchies. Engagez l’approche de la Couronne des Départs.');
      }
      return confirm('Balise franchie.');
    }
  }
  if (command.kind === 'mooring' && view.phase === 'approach' && view.flight) {
    const result = stepShipFlightV87(view.flight, command.action, firstInterstellarRouteV173(view.route));
    if (!result.accepted || !result.changed) return refuse(result.message);
    view.flight = result.state;
    if (result.state.phase === 'berthed') {
      view.phase = 'quay';
      view.position = 0;
      return confirm('Amarrage maintenu. Traversez le sas jusqu’à la Salle des routes.');
    }
    return confirm(result.message);
  }
  return refuse('Progression impossible à ce stade du trajet.');
}

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
function direction(value: unknown): value is Direction {
  return value === -1 || value === 1;
}
function parseMooring(value: unknown): MooringActionV173 | null {
  if (!record(value)) return null;
  switch (value.type) {
    case 'lateral': case 'speed': case 'ring':
      return direction(value.direction) ? { type: value.type, direction: value.direction } : null;
    case 'lock':
      return value.index === 0 || value.index === 1 ? { type: value.type, index: value.index } : null;
    case 'align': case 'advance': case 'retreat': case 'berth': return { type: value.type };
    default: return null;
  }
}
function parse(raw: unknown): FirstInterstellarActionV173 | null {
  if (!record(raw)) return null;
  switch (raw.kind) {
    case 'plan': return raw.route === 'direct' || raw.route === 'stopover' ? { kind: raw.kind, route: raw.route } : null;
    case 'walk': case 'steer': return direction(raw.direction) ? { kind: raw.kind, direction: raw.direction } : null;
    case 'launch': case 'beacon': case 'relay': return { kind: raw.kind };
    case 'mooring': {
      const action = parseMooring(raw.action);
      return action ? { kind: raw.kind, action } : null;
    }
    default: return null;
  }
}

type Inspection = {
  status: 'absent' | 'future-version' | 'invalid' | 'valid';
  state: FirstInterstellarStateV173 | null;
  view: FirstInterstellarViewV173;
};

const MAX_ACTIONS = 5_000;
export function inspectFirstInterstellarV173(raw: unknown, owner: string): Inspection {
  const view = initial();
  if (raw === undefined || raw === null) return { status: 'absent', state: null, view };
  if (record(raw) && typeof raw.version === 'number' && raw.version > 1) return { status: 'future-version', state: null, view };
  const invalid: Inspection = { status: 'invalid', state: null, view: initial() };
  if (!record(raw) || raw.version !== 1 || raw.owner !== owner || !Number.isFinite(Date.parse(owner))
      || typeof raw.hullInstanceId !== 'string' || raw.hullInstanceId.length === 0 || raw.hullInstanceId.length > 160
      || !Array.isArray(raw.actions) || raw.actions.length > MAX_ACTIONS) return invalid;
  const actions: FirstInterstellarActionV173[] = [];
  for (const entry of raw.actions) {
    const command = parse(entry);
    if (!command || !advance(view, command, owner).accepted) return invalid;
    actions.push(command);
  }
  return { status: 'valid', state: { version: 1, owner, hullInstanceId: raw.hullInstanceId, actions }, view };
}

export function commitFirstInterstellarV173(raw: unknown, command: FirstInterstellarActionV173, access: FirstInterstellarAccessV173) {
  if (!access.allowed) return { accepted: false, state: null, message: access.reason };
  const saved = inspectFirstInterstellarV173(raw, access.owner);
  const reject = (message: string) => ({ accepted: false, state: saved.state, message });
  if (saved.status === 'invalid' || saved.status === 'future-version'
      || (saved.state && saved.state.hullInstanceId !== access.hullInstanceId)) return reject('Relevé de trajet illisible.');
  const actions = saved.state?.actions ?? [];
  if (actions.length >= MAX_ACTIONS) return reject('Le relevé de trajet atteint sa limite.');
  const parsed = parse(command);
  if (!parsed) return reject('Commande de trajet inconnue.');
  const result = advance(saved.view, parsed, access.owner);
  if (!result.accepted) return reject(result.message);
  const state: FirstInterstellarStateV173 = {
    version: 1, owner: access.owner, hullInstanceId: access.hullInstanceId, actions: [...actions, parsed],
  };
  return { ...result, state };
}

export function firstInterstellarReceiptV173(save: ShipSave, raw: unknown) {
  const receipt = shipReceiptV161(save).receipt;
  if (!receipt) return null;
  const { state, view } = inspectFirstInterstellarV173(raw, save.createdAt);
  if (!state || receipt.instanceId !== state.hullInstanceId || view.phase !== 'returned'
      || !view.visitedDestination || view.flight?.phase !== 'berthed') return null;
  return {
    missionId: FIRST_INTERSTELLAR_V173.missionId,
    firstInterstellarComplete: true as const,
    visitedDestination: view.visitedDestination,
    shipId: receipt.shipId,
  };
}
