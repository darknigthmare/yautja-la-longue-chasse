import { HUNT_MELEE_DODGE_SPEED, HUNT_MELEE_PARRY_ACTIVE_SECONDS } from './huntMeleeCombat';

/** Court simulations keep their health local; only the enclosing mandate may grant its campaign reward. */
export const WOLF_CASTLE_COMBAT_VERSION = 2 as const;
export const WOLF_CASTLE_COMBAT_ARENA = Object.freeze({ minX: 200, maxX: 1400, minY: 550, maxY: 640 });
export const WOLF_CASTLE_COMBAT_ENCOUNTERS = [
  { id: 'threshold-guard', name: 'Sentinelle du Seuil', lesson: 'L’estoc est annoncé en or. Pare au dernier instant ou quitte sa trajectoire.', health: 66, speed: 125, windupMs: 1050, recoveryMs: 920, damage: 20, reach: 168 },
  { id: 'sweep-guard', name: 'Gardien du Cercle', lesson: 'Le balayage rouge traverse la garde. Esquive hors du cercle puis contre-attaque.', health: 88, speed: 148, windupMs: 1150, recoveryMs: 1000, damage: 26, reach: 185 },
  { id: 'court-master', name: 'Maître de la Cour', lesson: 'Observe la couleur : estoc à parer, balayage à esquiver. Frappe pendant sa récupération.', health: 110, speed: 168, windupMs: 860, recoveryMs: 800, damage: 30, reach: 185 },
] as const;
/** One authored opponent, with three postures. This is game fiction, not a canonical character. */
export const WOLF_CASTLE_DUNGEON_PHASES = [
  { id: 'mandate-warden', name: 'Sentinelle du mandat', phaseName: 'Garde du seuil', lesson: 'L’estoc fixe sa trajectoire. Pare face à la sentinelle, puis frappe dans l’ouverture.', health: 88, speed: 145, windupMs: 1040, recoveryMs: 1000, damage: 18, reach: 172 },
  { id: 'mandate-warden', name: 'Sentinelle du mandat', phaseName: 'Cercle de défense', lesson: 'La sentinelle élargit sa garde. Le balayage traverse la parade : esquive et reviens au contact.', health: 110, speed: 160, windupMs: 1070, recoveryMs: 940, damage: 24, reach: 192 },
  { id: 'mandate-warden', name: 'Sentinelle du mandat', phaseName: 'Dernière veille', lesson: 'Estoc et balayage alternent. Lis chaque annonce : aucune santé n’est rendue entre les phases.', health: 132, speed: 178, windupMs: 840, recoveryMs: 870, damage: 28, reach: 186 },
] as const;
export type WolfCastleCombatScenario = 'training' | 'dungeon';
export type WolfCastleCombatCommand = 'attack' | 'parry' | 'evade';
export type WolfCastleCombatStatus = 'active' | 'intermission' | 'victory' | 'defeat' | 'abandoned';
export type WolfCastleCombatEvent = 'begin' | 'attack' | 'hit' | 'miss' | 'parry' | 'evade' | 'hurt' | 'exhausted' | 'intermission' | 'victory' | 'defeat' | 'abandoned';
export interface WolfCastleCombatInput { moveX: number; moveY: number; attack: boolean; parry: boolean; evade: boolean }
export interface WolfCastleCombatPlayer {
  x: number; y: number; facing: -1 | 1; health: number; stamina: number;
  attackMs: number; attackResolved: boolean; attackCooldownMs: number;
  parryMs: number; evadeMs: number; evadeX: number; evadeY: number; defenseCooldownMs: number; hurtMs: number;
}
export interface WolfCastleCombatEnemy {
  x: number; y: number; facing: -1 | 1; health: number;
  phase: 'approach' | 'windup' | 'recovery' | 'down'; phaseMs: number;
  strike: 'thrust' | 'sweep'; targetX: number; targetY: number; sequence: number; staggerMs: number;
}
export interface WolfCastleCombatState {
  version: 2; scenario: WolfCastleCombatScenario; status: WolfCastleCombatStatus; attempt: number; encounterIndex: number; elapsedMs: number;
  player: WolfCastleCombatPlayer; enemy: WolfCastleCombatEnemy;
  stats: { hits: number; parries: number; evades: number; damageTaken: number };
  dossier: { victories: number; bestTimeMs: number | null; bestDamageTaken: number | null };
  event: { kind: WolfCastleCombatEvent; sequence: number; remainingMs: number };
}
export interface WolfCastleCombatInspection {
  status: 'absent' | 'valid' | 'invalid-save' | 'future-version'; state: WolfCastleCombatState | null; reason: string | null;
}

const MAX_TIME = 86_400_000;
const PARRY_MS = HUNT_MELEE_PARRY_ACTIVE_SECONDS * 1000 + 100; // Royal practice offers a wider timing window than a hunt.
const DODGE_MS = 220;
const ATTACK_MS = 390;
const ATTACK_RELEASE_MS = 250;
const clamp = (n: number, low: number, high: number) => Math.min(high, Math.max(low, n));
const finite = (n: unknown, low: number, high: number): n is number => typeof n === 'number' && Number.isFinite(n) && n >= low && n <= high;
const integer = (n: unknown, low: number, high: number): n is number => finite(n, low, high) && Number.isSafeInteger(n);
const record = (v: unknown): v is Record<string, unknown> => Boolean(v) && typeof v === 'object' && !Array.isArray(v) && [Object.prototype, null].includes(Object.getPrototypeOf(v));
const keys = (v: Record<string, unknown>, expected: string[]) => Object.keys(v).length === expected.length && expected.every(k => Object.hasOwn(v, k));
const direction = (v: unknown): v is -1 | 1 => v === -1 || v === 1;
const inside = (x: unknown, y: unknown) => finite(x, WOLF_CASTLE_COMBAT_ARENA.minX, WOLF_CASTLE_COMBAT_ARENA.maxX) && finite(y, WOLF_CASTLE_COMBAT_ARENA.minY, WOLF_CASTLE_COMBAT_ARENA.maxY);

function newPlayer(health = 100): WolfCastleCombatPlayer {
  return { x: 550, y: 610, facing: 1, health, stamina: 100, attackMs: 0, attackResolved: true, attackCooldownMs: 0,
    parryMs: 0, evadeMs: 0, evadeX: 0, evadeY: 0, defenseCooldownMs: 0, hurtMs: 0 };
}
export function wolfCastleCombatSpec(state: Pick<WolfCastleCombatState, 'scenario' | 'encounterIndex'>) {
  return state.scenario === 'dungeon' ? WOLF_CASTLE_DUNGEON_PHASES[state.encounterIndex] : WOLF_CASTLE_COMBAT_ENCOUNTERS[state.encounterIndex];
}
function newEnemy(index: number, scenario: WolfCastleCombatScenario): WolfCastleCombatEnemy {
  return { x: 1050, y: 610, facing: -1, health: wolfCastleCombatSpec({ scenario, encounterIndex: index }).health,
    phase: 'approach', phaseMs: 0, strike: index === 1 ? 'sweep' : 'thrust', targetX: 550, targetY: 610, sequence: 0, staggerMs: 0 };
}
export function createWolfCastleCombat(previous: WolfCastleCombatState | null = null, scenario: WolfCastleCombatScenario = 'training'): WolfCastleCombatState {
  if (!['training', 'dungeon'].includes(scenario) || (previous && (inspectWolfCastleCombat(previous).status !== 'valid' ||
    (previous.scenario ?? 'training') !== scenario || ['active', 'intermission'].includes(previous.status) || previous.attempt >= 9999))) {
    throw new TypeError('L’épreuve précédente doit être terminée avant de recommencer.');
  }
  return { version: WOLF_CASTLE_COMBAT_VERSION, scenario, status: 'active', attempt: (previous?.attempt ?? 0) + 1, encounterIndex: 0, elapsedMs: 0,
    player: newPlayer(), enemy: newEnemy(0, scenario), stats: { hits: 0, parries: 0, evades: 0, damageTaken: 0 },
    dossier: previous ? { ...previous.dossier } : { victories: 0, bestTimeMs: null, bestDamageTaken: null },
    event: { kind: 'begin', sequence: 0, remainingMs: 1800 } };
}

export function inspectWolfCastleCombat(raw: unknown): WolfCastleCombatInspection {
  const invalid = (reason: string): WolfCastleCombatInspection => ({ status: 'invalid-save', state: null, reason });
  if (raw === null || raw === undefined) return { status: 'absent', state: null, reason: null };
  if (!record(raw)) return invalid('combat-record');
  if (integer(raw.version, WOLF_CASTLE_COMBAT_VERSION + 1, Number.MAX_SAFE_INTEGER)) return { status: 'future-version', state: null, reason: 'combat-version' };
  const legacy = raw.version === 1;
  const fields = ['version', 'status', 'attempt', 'encounterIndex', 'elapsedMs', 'player', 'enemy', 'stats', 'dossier', 'event'];
  if ((!legacy && raw.version !== WOLF_CASTLE_COMBAT_VERSION) || !keys(raw, legacy ? fields : [...fields, 'scenario'])) return invalid('combat-fields');
  const scenario = legacy ? 'training' : raw.scenario;
  if (scenario !== 'training' && scenario !== 'dungeon') return invalid('combat-scenario');
  if (!['active', 'intermission', 'victory', 'defeat', 'abandoned'].includes(raw.status as string) || !integer(raw.attempt, 1, 9999) ||
    !integer(raw.encounterIndex, 0, 2) || !finite(raw.elapsedMs, 0, MAX_TIME)) return invalid('combat-progress');
  const p = raw.player, e = raw.enemy, s = raw.stats, d = raw.dossier, event = raw.event;
  if (!record(p) || !keys(p, ['x', 'y', 'facing', 'health', 'stamina', 'attackMs', 'attackResolved', 'attackCooldownMs', 'parryMs', 'evadeMs', 'evadeX', 'evadeY', 'defenseCooldownMs', 'hurtMs']) ||
    !inside(p.x, p.y) || !direction(p.facing) || !finite(p.health, 0, 100) || !finite(p.stamina, 0, 100) ||
    !finite(p.attackMs, 0, ATTACK_MS) || typeof p.attackResolved !== 'boolean' || !finite(p.attackCooldownMs, 0, 530) ||
    !finite(p.parryMs, 0, PARRY_MS) || !finite(p.evadeMs, 0, DODGE_MS) || !finite(p.evadeX, -1, 1) || !finite(p.evadeY, -1, 1) ||
    !finite(p.defenseCooldownMs, 0, 700) || !finite(p.hurtMs, 0, 500)) return invalid('combat-player');
  if ((p.attackMs === 0 && !p.attackResolved) || (p.parryMs > 0 && p.evadeMs > 0) ||
    (p.evadeMs > 0 && Math.abs(Math.hypot(p.evadeX, p.evadeY) - 1) > .00001)) return invalid('combat-player-phase');
  if (!record(e) || !keys(e, ['x', 'y', 'facing', 'health', 'phase', 'phaseMs', 'strike', 'targetX', 'targetY', 'sequence', 'staggerMs']) ||
    !inside(e.x, e.y) || !direction(e.facing) || !finite(e.health, 0, wolfCastleCombatSpec({ scenario, encounterIndex: raw.encounterIndex }).health) ||
    !['approach', 'windup', 'recovery', 'down'].includes(e.phase as string) || !finite(e.phaseMs, 0, 1700) ||
    !['thrust', 'sweep'].includes(e.strike as string) || !inside(e.targetX, e.targetY) || !integer(e.sequence, 0, 1_000_000) || !finite(e.staggerMs, 0, 1400)) return invalid('combat-enemy');
  if ((e.phase === 'down') !== (e.health === 0) || (e.phase === 'windup' && e.phaseMs <= 0) || (e.phase === 'approach' && e.phaseMs !== 0)) return invalid('combat-enemy-phase');
  if (!record(s) || !keys(s, ['hits', 'parries', 'evades', 'damageTaken']) || !integer(s.hits, 0, 1_000_000) || !integer(s.parries, 0, 1_000_000) ||
    !integer(s.evades, 0, 1_000_000) || !finite(s.damageTaken, 0, 1_000_000)) return invalid('combat-stats');
  if (!record(d) || !keys(d, ['victories', 'bestTimeMs', 'bestDamageTaken']) || !integer(d.victories, 0, raw.attempt) ||
    (d.bestTimeMs !== null && !finite(d.bestTimeMs, 1, MAX_TIME)) || (d.bestDamageTaken !== null && !finite(d.bestDamageTaken, 0, 1_000_000)) ||
    ((d.victories === 0) !== (d.bestTimeMs === null)) || ((d.victories === 0) !== (d.bestDamageTaken === null))) return invalid('combat-dossier');
  if (!record(event) || !keys(event, ['kind', 'sequence', 'remainingMs']) ||
    !['begin', 'attack', 'hit', 'miss', 'parry', 'evade', 'hurt', 'exhausted', 'intermission', 'victory', 'defeat', 'abandoned'].includes(event.kind as string) ||
    !integer(event.sequence, 0, 1_000_000) || !finite(event.remainingMs, 0, 1800)) return invalid('combat-event');
  if ((raw.status === 'active' && (p.health <= 0 || e.health <= 0)) ||
    (raw.status === 'intermission' && (raw.encounterIndex === 2 || p.health <= 0 || e.health !== 0)) ||
    (raw.status === 'victory' && (raw.encounterIndex !== 2 || p.health <= 0 || e.health !== 0 || d.victories === 0)) ||
    (raw.status === 'defeat' && (p.health !== 0 || e.health <= 0))) return invalid('combat-result');
  return { status: 'valid', state: { ...raw, version: WOLF_CASTLE_COMBAT_VERSION, scenario, player: { ...p }, enemy: { ...e }, stats: { ...s }, dossier: { ...d }, event: { ...event } } as unknown as WolfCastleCombatState, reason: null };
}

function event(state: WolfCastleCombatState, kind: WolfCastleCombatEvent, duration = 900) {
  state.event = { kind, sequence: Math.min(1_000_000, state.event.sequence + 1), remainingMs: duration };
}
export function advanceWolfCastleCombatEncounter(state: WolfCastleCombatState): WolfCastleCombatState {
  if (inspectWolfCastleCombat(state).status !== 'valid' || state.status !== 'intermission' || state.encounterIndex >= 2) return state;
  const index = state.encounterIndex + 1;
  const next: WolfCastleCombatState = { ...state, status: 'active', encounterIndex: index,
    player: newPlayer(state.scenario === 'dungeon' ? state.player.health : Math.min(100, state.player.health + 25)), enemy: newEnemy(index, state.scenario ?? 'training'), event: { ...state.event } };
  event(next, 'begin', 1800);
  return next;
}
export function abandonWolfCastleCombat(state: WolfCastleCombatState): WolfCastleCombatState {
  if (inspectWolfCastleCombat(state).status !== 'valid' || !['active', 'intermission'].includes(state.status)) return state;
  const next = { ...state, status: 'abandoned' as const, event: { ...state.event } }; event(next, 'abandoned', 1800); return next;
}
export function wolfCastleCombatPending(state: WolfCastleCombatState | null): boolean {
  return Boolean(state && (state.status === 'active' || state.status === 'intermission'));
}

/** The visible shape and the hit test share this exact locked footprint. */
export function wolfCastleCombatStrikeArea(state: WolfCastleCombatState) {
  const e = state.enemy, spec = wolfCastleCombatSpec(state);
  return e.strike === 'sweep'
    ? { x: e.x, y: e.y, radiusX: spec.reach, radiusY: 82, shape: 'ellipse' as const }
    : { x: e.x + e.facing * spec.reach / 2, y: e.targetY, radiusX: spec.reach / 2 + 19, radiusY: 28, shape: 'rect' as const };
}
export function wolfCastleCombatInStrike(state: WolfCastleCombatState): boolean {
  const area = wolfCastleCombatStrikeArea(state), p = state.player;
  return area.shape === 'rect' ? Math.abs(p.x - area.x) <= area.radiusX && Math.abs(p.y - area.y) <= area.radiusY
    : ((p.x - area.x) / area.radiusX) ** 2 + ((p.y - area.y) / area.radiusY) ** 2 <= 1;
}

/** Called once by the castle RAF. Hidden time is never caught up; no clock or listener lives here. */
export function stepWolfCastleCombat(source: WolfCastleCombatState, input: WolfCastleCombatInput, deltaMs: number): WolfCastleCombatState {
  if (source.status !== 'active' || !finite(deltaMs, 0, Number.MAX_VALUE) || deltaMs <= 0 ||
    !Number.isFinite(input.moveX) || !Number.isFinite(input.moveY)) return source;
  const dt = Math.min(deltaMs, 50);
  const state: WolfCastleCombatState = { ...source, player: { ...source.player }, enemy: { ...source.enemy },
    stats: { ...source.stats }, dossier: { ...source.dossier }, event: { ...source.event } };
  const p = state.player, e = state.enemy, spec = wolfCastleCombatSpec(state);
  state.elapsedMs = Math.min(MAX_TIME, state.elapsedMs + dt);
  state.event.remainingMs = Math.max(0, state.event.remainingMs - dt);
  p.attackCooldownMs = Math.max(0, p.attackCooldownMs - dt);
  p.defenseCooldownMs = Math.max(0, p.defenseCooldownMs - dt);
  p.hurtMs = Math.max(0, p.hurtMs - dt);
  p.stamina = Math.min(100, p.stamina + dt * .024);
  let moveX = clamp(input.moveX, -1, 1), moveY = clamp(input.moveY, -1, 1);
  const length = Math.max(1, Math.hypot(moveX, moveY)); moveX /= length; moveY /= length;
  if (p.hurtMs === 0 && p.evadeMs === 0 && p.attackMs === 0) {
    if (input.evade && p.defenseCooldownMs === 0) {
      if (p.stamina >= 26) {
        const length = Math.hypot(moveX, moveY);
        p.evadeX = length > .01 ? moveX / length : p.x <= e.x ? -1 : 1; p.evadeY = length > .01 ? moveY / length : 0;
        p.evadeMs = DODGE_MS; p.parryMs = 0; p.defenseCooldownMs = 700; p.stamina -= 26; state.stats.evades++; event(state, 'evade', 400);
      } else event(state, 'exhausted');
    } else if (input.parry && p.defenseCooldownMs === 0) {
      if (p.stamina >= 18) { p.parryMs = PARRY_MS; p.defenseCooldownMs = 580; p.stamina -= 18; }
      else event(state, 'exhausted');
    } else if (input.attack && p.attackCooldownMs === 0 && p.parryMs === 0) {
      if (p.stamina >= 13) { p.attackMs = ATTACK_MS; p.attackResolved = false; p.attackCooldownMs = 530; p.stamina -= 13; event(state, 'attack', 350); }
      else event(state, 'exhausted');
    }
  }
  if (Math.abs(moveX) > .05 && p.evadeMs === 0) p.facing = moveX < 0 ? -1 : 1;
  const movement = p.evadeMs > 0 ? { x: p.evadeX, y: p.evadeY, speed: HUNT_MELEE_DODGE_SPEED }
    : { x: moveX, y: moveY, speed: 270 * (p.attackMs > 0 ? .45 : p.parryMs > 0 ? .2 : p.hurtMs > 0 ? .35 : 1) };
  p.x = clamp(p.x + movement.x * movement.speed * dt / 1000, WOLF_CASTLE_COMBAT_ARENA.minX, WOLF_CASTLE_COMBAT_ARENA.maxX);
  p.y = clamp(p.y + movement.y * movement.speed * dt / 1000, WOLF_CASTLE_COMBAT_ARENA.minY, WOLF_CASTLE_COMBAT_ARENA.maxY);
  const beforeAttack = p.attackMs;
  p.attackMs = Math.max(0, p.attackMs - dt);
  if (!p.attackResolved && beforeAttack > ATTACK_RELEASE_MS && p.attackMs <= ATTACK_RELEASE_MS) {
    p.attackResolved = true;
    const dx = e.x - p.x, dy = e.y - p.y;
    if (Math.abs(dx) <= 153 && Math.abs(dy) <= 46 && (Math.abs(dx) < 12 || Math.sign(dx) === p.facing)) {
      const vulnerable = e.phase === 'recovery' || e.staggerMs > 0;
      const damage = vulnerable ? 24 : 13;
      e.health = Math.max(0, e.health - damage); state.stats.hits++; e.staggerMs = Math.max(e.staggerMs, vulnerable ? 240 : 90); event(state, 'hit');
    } else event(state, 'miss', 500);
  }
  if (e.health <= 0) {
    e.health = 0; e.phase = 'down'; e.phaseMs = 0; e.staggerMs = 0;
    state.status = state.encounterIndex < 2 ? 'intermission' : 'victory';
    if (state.status === 'victory') {
      state.dossier.victories++;
      state.dossier.bestTimeMs = Math.min(state.dossier.bestTimeMs ?? Infinity, state.elapsedMs);
      state.dossier.bestDamageTaken = Math.min(state.dossier.bestDamageTaken ?? Infinity, state.stats.damageTaken);
    }
    event(state, state.status, 1800); return state;
  }
  if (e.staggerMs > 0) e.staggerMs = Math.max(0, e.staggerMs - dt);
  else if (e.phase === 'approach') {
    const dx = p.x - e.x, dy = p.y - e.y, distance = Math.hypot(dx, dy);
    if (Math.abs(dx) > 1) e.facing = dx < 0 ? -1 : 1;
    if (distance > 125 || Math.abs(dy) > 22) {
      const amount = Math.min(distance, spec.speed * dt / 1000);
      e.x = clamp(e.x + dx / Math.max(1, distance) * amount, WOLF_CASTLE_COMBAT_ARENA.minX, WOLF_CASTLE_COMBAT_ARENA.maxX);
      e.y = clamp(e.y + dy / Math.max(1, distance) * amount, WOLF_CASTLE_COMBAT_ARENA.minY, WOLF_CASTLE_COMBAT_ARENA.maxY);
    } else {
      e.sequence++;
      e.strike = state.encounterIndex === 1 || (state.encounterIndex === 2 && e.sequence % 2 === 0) ? 'sweep' : 'thrust';
      e.targetX = p.x; e.targetY = p.y; e.phase = 'windup'; e.phaseMs = spec.windupMs;
    }
  } else if (e.phase === 'windup') {
    e.phaseMs = Math.max(0, e.phaseMs - dt);
    if (e.phaseMs === 0) {
      if (wolfCastleCombatInStrike(state) && p.evadeMs <= 0) {
        const facingEnemy = Math.abs(e.x - p.x) < 12 || Math.sign(e.x - p.x) === p.facing;
        if (e.strike === 'thrust' && p.parryMs > 0 && facingEnemy) {
          state.stats.parries++; p.stamina = Math.min(100, p.stamina + 12); e.staggerMs = 600; event(state, 'parry', 1000);
        } else {
          const damage = Math.min(p.health, spec.damage); p.health -= damage; state.stats.damageTaken += damage; p.hurtMs = 500;
          p.attackMs = 0; p.attackResolved = true; event(state, 'hurt');
        }
      }
      e.phase = 'recovery'; e.phaseMs = spec.recoveryMs;
    }
  } else if (e.phase === 'recovery') {
    e.phaseMs = Math.max(0, e.phaseMs - dt);
    if (e.phaseMs === 0) e.phase = 'approach';
  }
  // Separate bodies on the floor. Dodge may pass a guard; ordinary walking cannot.
  const separation = Math.hypot(p.x - e.x, (p.y - e.y) * 2);
  if (p.evadeMs <= 0 && separation < 53) {
    const side = p.x < e.x ? -1 : 1;
    const target = e.x + side * 53;
    p.x = clamp(target, WOLF_CASTLE_COMBAT_ARENA.minX, WOLF_CASTLE_COMBAT_ARENA.maxX);
    // At a wall the player's body cannot be pushed farther out; leave the
    // required clearance by shifting the guard back into the arena instead.
    if (p.x !== target) e.x = clamp(p.x - side * 53, WOLF_CASTLE_COMBAT_ARENA.minX, WOLF_CASTLE_COMBAT_ARENA.maxX);
  }
  p.parryMs = Math.max(0, p.parryMs - dt); p.evadeMs = Math.max(0, p.evadeMs - dt);
  if (p.health <= 0) { p.health = 0; state.status = 'defeat'; event(state, 'defeat', 1800); }
  return state;
}

export function wolfCastleCombatEventLabel(state: WolfCastleCombatState): string {
  if (state.scenario === 'dungeon') {
    if (state.event.kind === 'begin') return WOLF_CASTLE_DUNGEON_PHASES[state.encounterIndex].phaseName;
    if (state.event.kind === 'intermission') return 'La sentinelle change de posture. Reprends ton souffle avant la phase suivante.';
    if (state.event.kind === 'victory') return 'Sentinelle maîtrisée. Rapporte le mandat à l’audience.';
    if (state.event.kind === 'defeat') return 'Mandat interrompu : retente l’affrontement ou abandonne. Les repères explorés sont conservés.';
    if (state.event.kind === 'abandoned') return 'Mandat abandonné. Aucune récompense accordée.';
  }
  return { begin: 'Observe la garde et prends ta distance.', attack: 'Frappe engagée', hit: 'Frappe au contact', miss: 'Hors de portée',
    parry: 'Parade réussie — ouverture !', evade: 'Esquive', hurt: 'Touché — reprends ta distance', exhausted: 'Reprends ton souffle',
    intermission: 'Garde dépassée. La cour t’accorde un répit.', victory: 'Les trois gardes sont dépassées. Épreuve consignée.',
    defeat: 'Le maître interrompt l’épreuve. Tu peux recommencer.', abandoned: 'Épreuve interrompue à ta demande.' }[state.event.kind];
}
