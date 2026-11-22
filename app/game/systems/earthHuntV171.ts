import type { SaveGame } from '../types';
import { getChronicleRank } from './clanChronicle';
import { shipReceiptV161 } from './shipReceiptV161';

export const EARTH_CONTRACT_V171 = {
  id: 'T-CT-01A',
  title: 'L’ivoire rouge',
  site: 'Okavango',
  prey: 'Konrad Lisle',
} as const;

export type EarthHuntAccessV171 = { allowed: true } | { allowed: false; reason: string };

export function getEarthHuntAccessV171(
  save: Pick<SaveGame, 'createdAt' | 'profile' | 'prologue' | 'shipAcquisitionV89'>,
  firstInterstellarComplete: boolean,
): EarthHuntAccessV171 {
  const rank = save.prologue ? getChronicleRank(save.prologue.chronicle) : null;
  if (rank !== 'blooded' && rank !== 'elite' && rank !== 'elder' && rank !== 'ancient') {
    return { allowed: false, reason: 'La reconnaissance Blooded de la chronique est requise.' };
  }
  if (shipReceiptV161(save).status !== 'owned') {
    return { allowed: false, reason: 'Concluez l’acquisition du vaisseau personnel au chantier naval (R2-M021).' };
  }
  if (!firstInterstellarComplete) {
    return { allowed: false, reason: 'Regagnez le vaisseau après le premier trajet interstellaire (R2-M023).' };
  }
  return { allowed: true };
}

export const EARTH_OKAVANGO_MAP_V171 = [
  '~~~~~~~~~~~~',
  '~~r...g....~',
  '~~.r.g.c.B.~',
  '~~r..s...c.~',
  '~~===~~~..X~',
  '~~P...l.L..~',
  '~~~..ll....~',
  '~~~~~~~~~~~~',
] as const;

export const EARTH_OKAVANGO_TERRAIN_V171 = {
  '~': { kind: 'water', name: 'Chenal profond' },
  '.': { kind: 'plain', name: 'Rive' },
  r: { kind: 'tracks', name: 'Roseaux' },
  g: { kind: 'cover', name: 'Herbes hautes' },
  c: { kind: 'camp', name: 'Camp de Lisle' },
  B: { kind: 'island', name: 'Île du baobab' },
  s: { kind: 'cover', name: 'Couvert' },
  '=': { kind: 'ford', name: 'Gué saisonnier' },
  X: { kind: 'extraction', name: 'Zone d’extraction' },
  P: { kind: 'papyrus', name: 'Îlot de papyrus' },
  l: { kind: 'lions', name: 'Plaine des lions' },
  L: { kind: 'lions', name: 'Dépôt de la plaine' },
} as const;

type Point = readonly [x: number, y: number];
type Direction = 'north' | 'south' | 'west' | 'east';
type SimpleAction = 'scan' | 'listen' | 'cloak' | 'jam' | 'strike' | 'spare' | 'finish'
  | 'harvest' | 'clean' | 'extract' | 'report' | 'retry';
export type EarthHuntActionV171 =
  | { kind: 'deploy'; site: 'papyrus' | 'lions' }
  | { kind: 'move'; direction: Direction }
  | { kind: SimpleAction };

export type EarthHuntStateV171 = {
  version: 1;
  owner: string;
  actions: EarthHuntActionV171[];
};

const DIRECTIONS: Record<Direction, Point> = {
  north: [0, -1],
  south: [0, 1],
  west: [-1, 0],
  east: [1, 0],
};
const START: Record<'papyrus' | 'lions', Point> = { papyrus: [2, 5], lions: [8, 5] };
const TRACES: readonly Point[] = [[2, 3], [3, 2], [2, 1]];
export const EARTH_OKAVANGO_PORTERS_V171: readonly Point[] = [[7, 2], [9, 3]];
const PATROL: readonly Point[] = [[5, 2], [5, 3], [6, 3], [6, 2]];
const LISLE: readonly Point[] = [[9, 2], [9, 2], [10, 2], [10, 3]];
const EXTRACTION: Point = [10, 4];
const RADIO: Point = [7, 2];
export const EARTH_OKAVANGO_CAMERA_V171: Point = [9, 3];
const MAX_ACTIONS = 5_000;
const SEND_TURNS = 4;
const EXTRACTION_TURNS = 16;

type TerrainMark = keyof typeof EARTH_OKAVANGO_TERRAIN_V171;
type Outcome = 'hunted' | 'spared';
type Phase = 'registry' | 'field' | 'extracted' | 'reported' | 'failed';
type Guard = 'calm' | 'alert' | 'jammed' | 'defeated' | 'transmitted';
type LislePhase = 0 | 1 | 2 | 3;
type FieldActionResult = { ok: true; message: string } | { ok: false; message: string };

export type EarthHuntViewV171 = {
  phase: Phase;
  position: Point;
  turn: number;
  hp: number;
  traces: number[];
  marksVisible: boolean;
  radioHeard: boolean;
  flooded: boolean;
  cloak: boolean;
  guard: Guard;
  guardPosition: Point;
  sendTurns: number;
  lislePhase: LislePhase;
  lislePosition: Point;
  outcome: Outcome | null;
  trophy: boolean;
  cameraDestroyed: boolean;
  exposedTrack: boolean;
  extractionTurns: number;
  index: number;
  afterAction: string;
};

function initialView(): EarthHuntViewV171 {
  return {
    phase: 'registry', position: START.papyrus, turn: 0, hp: 5,
    traces: [], marksVisible: false, radioHeard: false, flooded: false, cloak: false,
    guard: 'calm', guardPosition: PATROL[0], sendTurns: 0, lislePhase: 0, lislePosition: LISLE[0],
    outcome: null, trophy: false, cameraDestroyed: false, exposedTrack: false, extractionTurns: 0, index: 0,
    afterAction: '',
  };
}

function terrain(point: Point): TerrainMark {
  return (EARTH_OKAVANGO_MAP_V171[point[1]]?.[point[0]] ?? '~') as TerrainMark;
}

function distance(a: Point, b: Point) {
  return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]);
}

function adjustIndex(view: EarthHuntViewV171, delta: number) {
  view.index = Math.max(0, Math.min(20, view.index + delta));
}

function finishTurn(view: EarthHuntViewV171) {
  if (view.phase !== 'field') return;
  view.turn += 1;
  const cover = ['r', 'g', 's'].includes(terrain(view.position));
  if (view.guard === 'calm' || view.guard === 'jammed') {
    view.guardPosition = PATROL[view.turn % PATROL.length];
  }
  if (view.guard === 'calm' && !view.cloak && !cover && distance(view.position, view.guardPosition) <= 2) {
    view.guard = 'alert';
    view.sendTurns = SEND_TURNS;
    view.afterAction = 'Un garde vous a vu. Brouillez son téléphone avant la transmission.';
  } else if (view.guard === 'alert') {
    view.sendTurns -= 1;
    if (view.sendTurns === 0) {
      view.guard = 'transmitted';
      adjustIndex(view, 8);
      view.afterAction = 'L’image est sortie du site. L’Indice de Discrétion monte de 8.';
    }
  }
  const lisleDistance = distance(view.position, view.lislePosition);
  const dogsNearby = view.lislePhase === 1 && lisleDistance <= 1;
  const lisleHasLineOfSight = !view.cloak && lisleDistance <= 2;
  if (!cover && view.radioHeard && !view.outcome && view.lislePhase < 3
      && (dogsNearby || lisleHasLineOfSight)) {
    view.hp -= 1;
  }
  if (terrain(view.position) === 'l' && view.turn % 3 === 0 && !view.cloak) {
    view.hp -= 1;
    view.afterAction = 'Les lions vous ont repéré dans les herbes.';
  }
  if (view.outcome) view.extractionTurns -= 1;
  if (view.hp <= 0 || (view.outcome && view.extractionTurns <= 0)) {
    view.phase = 'failed';
    view.afterAction = view.hp <= 0 ? 'Vous êtes tombé dans le delta.' : 'La fenêtre d’extraction est fermée.';
  }
}

function field(view: EarthHuntViewV171, action: EarthHuntActionV171): FieldActionResult {
  const deny = (message: string): FieldActionResult => ({ ok: false, message });
  let message: string;
  switch (action.kind) {
    case 'move': {
      const [dx, dy] = DIRECTIONS[action.direction];
      const next: Point = [view.position[0] + dx, view.position[1] + dy];
      const mark = terrain(next);
      if (mark === '~' || (mark === '=' && view.flooded)) return deny('Le chenal est trop profond ici.');
      view.position = next;
      message = EARTH_OKAVANGO_TERRAIN_V171[mark].name;
      break;
    }
    case 'scan': {
      const before = view.traces.length;
      TRACES.forEach((point, index) => {
        if (distance(view.position, point) <= 1 && !view.traces.includes(index)) view.traces.push(index);
      });
      view.marksVisible = true;
      message = view.traces.length > before
        ? 'Traces relevées : ' + view.traces.length + ' sur 3.'
        : 'Analyse du biomask : triangle pour les armes, cercle pour les porteurs désarmés.';
      break;
    }
    case 'listen':
      if (view.radioHeard || view.traces.length < 3 || distance(view.position, RADIO) > 1) {
        return deny('Repérez les trois indices, puis approchez la radio du camp.');
      }
      view.radioHeard = true;
      view.flooded = true;
      message = '« Personne ne quitte l’île tant que le bateau n’est pas chargé. » L’eau recouvre le gué.';
      break;
    case 'cloak':
      view.cloak = !view.cloak;
      message = view.cloak ? 'Camouflage actif.' : 'Camouflage coupé.';
      break;
    case 'jam':
      if (view.guard !== 'alert' || distance(view.position, view.guardPosition) > 2) {
        return deny('Aucun téléphone en cours de transmission à portée.');
      }
      view.guard = 'jammed';
      view.sendTurns = 0;
      adjustIndex(view, -3);
      message = 'Téléphone neutralisé avant l’envoi.';
      break;
    case 'strike':
      if (!view.marksVisible) return deny('Identifiez d’abord les proies au biomask.');
      if (distance(view.position, view.lislePosition) <= 1 && !view.outcome && view.lislePhase < 3) {
        if (!view.radioHeard) return deny('Écoutez la radio pour confirmer la cible.');
        if (view.lislePhase === 0) {
          view.lislePhase = 1;
          message = 'Lisle quitte son abri. Ses chiens rabattent la rive.';
        } else if (view.lislePhase === 1) {
          view.lislePhase = 2;
          view.cloak = false;
          message = 'Une fusée éclaire les roseaux. Lisle se replie vers le bateau.';
        } else {
          view.lislePhase = 3;
          message = 'Lisle lâche son arme. Choisissez le sort de la proie.';
        }
        view.lislePosition = LISLE[view.lislePhase];
      } else if (distance(view.position, view.guardPosition) <= 1 && view.guard !== 'defeated') {
        view.exposedTrack = true;
        view.guard = 'defeated';
        view.sendTurns = 0;
        message = 'Garde armé maîtrisé. Son corps doit être dissimulé.';
      } else if (EARTH_OKAVANGO_PORTERS_V171.some(point => distance(view.position, point) <= 1)) {
        return deny('Porteur désarmé : les marques du biomask le protègent.');
      } else {
        return deny('Aucune proie à la lame à portée.');
      }
      break;
    case 'spare':
    case 'finish':
      if (view.lislePhase !== 3 || view.outcome || distance(view.position, view.lislePosition) > 1) {
        return deny('Rejoignez Lisle pour faire votre choix.');
      }
      view.outcome = action.kind === 'spare' ? 'spared' : 'hunted';
      view.extractionTurns = EXTRACTION_TURNS + 1;
      if (view.outcome === 'spared') adjustIndex(view, 3);
      message = view.outcome === 'spared' ? 'Lisle est épargné. Il restera témoin.' : 'Lisle est vaincu. Son trophée peut être prélevé.';
      break;
    case 'harvest':
      if (view.outcome !== 'hunted' || view.trophy || distance(view.position, view.lislePosition) > 1) {
        return deny('Approchez-vous de la dépouille de Lisle pour prélever son trophée.');
      }
      view.cloak = false;
      view.trophy = true;
      message = 'Crâne de Lisle prélevé. Camouflage coupé pendant le geste.';
      break;
    case 'clean': {
      let cleaned = false;
      if (distance(view.position, EARTH_OKAVANGO_CAMERA_V171) <= 1 && !view.cameraDestroyed) {
        view.cameraDestroyed = true;
        adjustIndex(view, -3);
        cleaned = true;
      }
      if (distance(view.position, view.guardPosition) <= 1 && view.exposedTrack) {
        view.exposedTrack = false;
        cleaned = true;
      }
      if (!cleaned) return deny('Aucune trace à nettoyer à portée.');
      message = 'Traces nettoyées dans ce secteur.';
      break;
    }
    case 'extract':
      if (!view.outcome || (view.outcome === 'hunted' && !view.trophy)) {
        return deny('Terminez la chasse et prenez le trophée avant le départ.');
      }
      if (distance(view.position, EXTRACTION) !== 0) return deny('Rejoignez le point d’extraction.');
      if (view.exposedTrack) adjustIndex(view, 2);
      if (!view.cameraDestroyed && view.guard !== 'transmitted') adjustIndex(view, 8);
      if (!view.exposedTrack && view.cameraDestroyed && view.guard !== 'transmitted' && view.outcome !== 'spared') {
        adjustIndex(view, -5);
      }
      view.phase = 'extracted';
      message = 'Amarrage réussi. Déposez votre rapport au vaisseau.';
      break;
    default:
      return deny('Cette action est indisponible au sol.');
  }
  view.afterAction = '';
  finishTurn(view);
  return { ok: true, message: view.afterAction || message };
}

function advance(view: EarthHuntViewV171, action: EarthHuntActionV171): FieldActionResult {
  if (view.phase === 'registry' && action.kind === 'deploy') {
    view.phase = 'field';
    view.position = START[action.site];
    return { ok: true, message: 'Saar : « Repérez les traces. Celui qui porte sans arme ne se chasse pas. »' };
  }
  if (view.phase === 'field') return field(view, action);
  if (view.phase === 'extracted' && action.kind === 'report') {
    view.phase = 'reported';
    return { ok: true, message: 'Rapport versé au Registre terrestre.' };
  }
  if (view.phase === 'failed' && action.kind === 'retry') {
    Object.assign(view, { ...initialView(), index: view.index });
    return { ok: true, message: 'Retour au Registre. L’Indice de Discrétion est conservé.' };
  }
  return { ok: false, message: 'Cette action est indisponible à ce stade de la chasse.' };
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseAction(raw: unknown): EarthHuntActionV171 | null {
  if (!record(raw)) return null;
  if (raw.kind === 'deploy' && (raw.site === 'papyrus' || raw.site === 'lions')) {
    return { kind: raw.kind, site: raw.site };
  }
  if (raw.kind === 'move') {
    const direction = raw.direction;
    if (direction === 'north' || direction === 'east' || direction === 'south' || direction === 'west') {
      return { kind: raw.kind, direction };
    }
  }
  switch (raw.kind) {
    case 'scan': case 'listen': case 'cloak': case 'jam': case 'strike': case 'spare': case 'finish':
    case 'harvest': case 'clean': case 'extract': case 'report': case 'retry':
      return { kind: raw.kind };
    default:
      return null;
  }
}

type Inspection = {
  status: 'absent' | 'valid' | 'invalid' | 'future-version';
  state: EarthHuntStateV171 | null;
  view: EarthHuntViewV171;
};

export function inspectEarthHuntV171(raw: unknown, owner: string): Inspection {
  const view = initialView();
  if (raw === null || raw === undefined) return { status: 'absent', state: null, view };
  if (record(raw) && typeof raw.version === 'number' && raw.version > 1) {
    return { status: 'future-version', state: null, view };
  }
  const invalid: Inspection = { status: 'invalid', state: null, view: initialView() };
  if (!record(raw) || raw.version !== 1 || raw.owner !== owner || !Number.isFinite(Date.parse(owner))
      || !Array.isArray(raw.actions) || raw.actions.length > MAX_ACTIONS) return invalid;
  const actions: EarthHuntActionV171[] = [];
  for (const entry of raw.actions) {
    const action = parseAction(entry);
    if (!action || !advance(view, action).ok) return invalid;
    actions.push(action);
  }
  return { status: 'valid', state: { version: 1, owner, actions }, view };
}

export function applyEarthHuntActionV171(
  raw: unknown,
  owner: string,
  action: EarthHuntActionV171,
  access: EarthHuntAccessV171,
): { accepted: boolean; state: EarthHuntStateV171 | null; message: string } {
  const saved = inspectEarthHuntV171(raw, owner);
  const reject = (message: string) => ({ accepted: false, state: saved.state, message });
  if (!access.allowed) return reject(access.reason);
  if (saved.status === 'invalid' || saved.status === 'future-version' || !Number.isFinite(Date.parse(owner))) {
    return reject('Ce relevé terrestre ne correspond pas à cette campagne.');
  }
  const actions = saved.state?.actions ?? [];
  if (actions.length >= MAX_ACTIONS) return reject('Le journal de terrain est arrivé à sa limite.');
  const command = parseAction(action);
  if (!command) return reject('Action terrestre inconnue.');
  const result = advance(saved.view, command);
  if (!result.ok) return reject(result.message);
  return {
    accepted: true, state: { version: 1, owner, actions: [...actions, command] }, message: result.message,
  };
}
