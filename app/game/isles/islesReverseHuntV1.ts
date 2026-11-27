/** The Isles V1 · Chasse inversée on Verdant, solo (MODE_THE_ISLES section 13.3).
 * One Yautja (the player) against 4 to 6 humans driven by the AI. Rules come from
 * app/game/data/islesReverseHuntV1.json. The state advances in place and deterministically
 * from its seed: the same seed and inputs give the same match. */
import {heightAtV1, isWalkableV1, kindAtV1, markerV1, tileAtV1, tileCenterV1, type IslesMapV1} from "./islesMapV1";
import {createIslesActorV1, stepIslesActorV1, type IslesActorV1, type IslesCloakTuningV1, type IslesMoveInputV1, type IslesMovementTuningV1} from "./islesMovementV1";
import {findPathV1, nearestWalkableV1} from "./islesPathV1";

export type ReverseRoleIdV1 = "tracker" | "marksman" | "demolition" | "medic" | "radio" | "warden";
export type ReversePieceIdV1 = "radio" | "battery" | "flares";

export interface ReverseRoleRulesV1 {
  name: string; weapon: string; color: string; damage: number; range: number; fireSeconds: number; accuracy: number; speed: number;
  traceSeconds?: number; traceCooldown?: number; traceRange?: number; markSeconds?: number; traps?: number; trapDamage?: number;
  trapRadius?: number; reviveFactor?: number; flares?: number; flareSeconds?: number; flareRadius?: number; callFactor?: number;
  jamSeconds?: number; jamRange?: number; repelRange?: number;
}

/** Shape of islesReverseHuntV1.json. */
export interface ReverseHuntRulesV1 {
  durationSeconds: number;
  phases: {arrivalEnd: number; searchEnd: number; callFrom: number; lastStand: number};
  teamSize: number; teamSizeRange: [number, number];
  roles: Record<ReverseRoleIdV1, ReverseRoleRulesV1>;
  roleOrder: ReverseRoleIdV1[];
  names: string[];
  humanHealth: number;
  downed: {bleedSeconds: number; reviveSeconds: number; reviveRadius: number; pistolDamage: number; pistolRange: number; pistolSeconds: number};
  surrender: {disarmSeconds: number; extractionWeight: number; healthBelow: number; chance: number};
  trophy: {minSeconds: number; maxSeconds: number; range: number};
  selfDestruct: {countdownSeconds: number; radius: number; offerSeconds: number};
  duel: {offerSeconds: number; humanDamage: number; humanStrikeSeconds: number; humanHealth: number};
  yautja: {health: number; strikeDamage: number; strikeRange: number; strikeArcDot: number; strikeSeconds: number; plasmaDamage: number;
    plasmaRange: number; plasmaConeDot: number; plasmaHeat: number; plasmaCoolPerSecond: number; plasmaOverheat: number; plasmaSeconds: number};
  perception: {coneDot: number; range: number; cloakedStillRange: number; cloakedMovingRange: number; revealedRange: number; nightFactor: number;
    rainCloakFactor: number; memorySeconds: number; eyeHeight: number; bushCover: number; shareRange: number; cloakedHitFactor: number};
  extraction: {callSeconds: number; arrivalSeconds: number; boardRadius: number; callRadius: number; piecesRadius: number; planeHits: number};
  pieces: {id: ReversePieceIdV1; name: string; marker: string}[];
  pickupRadius: number;
  wildlife: {count: number; health: number; damage: number; attackSeconds: number; aggroRange: number; speed: number; fleeRange: number};
  weather: {nightChance: number; rainChance: number};
  honor: {armedKill: number; trophy: number; perfect: number};
  score: {escaped: number; held: number};
}

export type HumanStatusV1 = "active" | "downed" | "dead" | "trophy" | "escaped";

export interface ReverseHumanV1 {
  id: string; role: ReverseRoleIdV1; name: string;
  x: number; z: number; facing: number;
  health: number;
  status: HumanStatusV1;
  armed: boolean;
  /** Seconds left before a surrendered human may pick up a weapon again; > 0 means surrendered. */
  disarmedFor: number;
  /** Surrendered at least once in the match (counts half at the extraction while unarmed). */
  surrendered: boolean;
  surrenderDecided: boolean;
  carrying: ReversePieceIdV1 | null;
  goal: string;
  path: [number, number][];
  pathTarget: string;
  bleed: number;
  revive: number;
  fireTimer: number;
  abilityTimer: number;
  trapsLeft: number;
  flaresLeft: number;
  jamUsed: boolean;
  seenAt: number;
  escapedUnarmed: boolean;
  duelist: boolean;
}

export interface ReversePieceV1 { id: ReversePieceIdV1; name: string; x: number; z: number; positionIndex: number; found: boolean; carrier: string | null; candidates: {x: number; z: number}[]; searched: boolean[] }

export interface ReverseWildV1 { id: string; x: number; z: number; facing: number; health: number; attackTimer: number; wanderX: number; wanderZ: number; fleeing: number; repelled: boolean }

export type ReverseOutcomeKindV1 = "fuite" | "tenir" | "abattu" | "autodestruction" | "autodestruction-parfaite" | "chasse" | "chasse-parfaite" | "faute" | "duel";

export interface ReverseOutcomeV1 { winner: "humans" | "yautja"; kind: ReverseOutcomeKindV1; humanScore: number; honor: number; escaped: number; alive: number }

export interface ReverseHuntStateV1 {
  seed: number;
  rng: number;
  time: number;
  night: boolean;
  rain: boolean;
  yautja: {
    actor: IslesActorV1;
    health: number;
    heat: number;
    overheated: boolean;
    strikeTimer: number;
    plasmaTimer: number;
    trophy: {humanId: string; progress: number; needed: number} | null;
    honor: number;
    jammedFor: number;
    selfDestruct: {phase: "none" | "offered" | "counting" | "done"; timer: number};
    duel: {phase: "none" | "offered" | "active" | "done"; humanId: string | null; timer: number};
  };
  humans: ReverseHumanV1[];
  pieces: ReversePieceV1[];
  mast: {x: number; z: number};
  extraction: {phase: "none" | "calling" | "inbound" | "landed" | "gone"; progress: number; callerId: string | null; eta: number; planeHits: number; x: number; z: number};
  /** Team knowledge of the Yautja (sight, trace, mark). */
  known: {x: number; z: number; at: number; marked: number} | null;
  traps: {x: number; z: number; armed: boolean}[];
  flares: {x: number; z: number; until: number}[];
  wildlife: ReverseWildV1[];
  log: {at: number; text: string}[];
  outcome: ReverseOutcomeV1 | null;
}

export interface ReverseHuntInputV1 extends IslesMoveInputV1 {
  strike: boolean;
  plasma: boolean;
  trophyHeld: boolean;
  selfDestruct: boolean;
  acceptDuel: boolean;
}

export interface ReverseTuningV1 { movement: IslesMovementTuningV1; cloak: IslesCloakTuningV1 }

function nextRandom(state: {rng: number}): number {
  let t = (state.rng = (state.rng + 0x6d2b79f5) >>> 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

const distance = (a: {x: number; z: number}, b: {x: number; z: number}) => Math.hypot(a.x - b.x, a.z - b.z);
const say = (state: ReverseHuntStateV1, text: string) => { state.log.push({at: state.time, text}); if (state.log.length > 60) state.log.shift(); };

/** Builds a match: picks the roles, the positions of the 3 pieces, the weather and the wildlife from the seed. */
export function createReverseHuntV1(map: IslesMapV1, rules: ReverseHuntRulesV1, tuning: ReverseTuningV1, seed: number, teamSize = rules.teamSize): ReverseHuntStateV1 {
  const size = Math.min(rules.teamSizeRange[1], Math.max(rules.teamSizeRange[0], teamSize));
  const state = {rng: seed >>> 0} as ReverseHuntStateV1;
  const roles = [...rules.roleOrder];
  for (let i = roles.length - 1; i > 0; i--) { const j = Math.floor(nextRandom(state) * (i + 1)); [roles[i], roles[j]] = [roles[j], roles[i]]; }
  const team = roles.slice(0, size);
  const arrival = markerV1(map, "humanArrival");
  const humans: ReverseHumanV1[] = team.map((role, i) => {
    const angle = (i / size) * Math.PI * 2;
    const spot = nearestWalkableV1(map, ...tileAtV1(map, arrival.x + Math.cos(angle) * 2.5, arrival.z - 2 + Math.sin(angle) * 2)) ?? tileAtV1(map, arrival.x, arrival.z);
    const at = tileCenterV1(map, spot[0], spot[1]);
    const r = rules.roles[role];
    return {id: "h" + i, role, name: rules.names[i % rules.names.length], x: at.x, z: at.z, facing: Math.PI, health: rules.humanHealth,
      status: "active", armed: true, disarmedFor: 0, surrendered: false, surrenderDecided: false, carrying: null, goal: "arrivée",
      path: [], pathTarget: "", bleed: 0, revive: 0, fireTimer: 0, abilityTimer: 0, trapsLeft: r.traps ?? 0, flaresLeft: r.flares ?? 0,
      jamUsed: false, seenAt: -1, escapedUnarmed: false, duelist: false};
  });
  const pieces: ReversePieceV1[] = rules.pieces.map(piece => {
    const points = map.markers[piece.marker];
    const positionIndex = Math.floor(nextRandom(state) * points.length);
    const candidates = points.map(([x, z]) => tileCenterV1(map, x, z));
    return {id: piece.id, name: piece.name, ...candidates[positionIndex], positionIndex, found: false, carrier: null, candidates, searched: candidates.map(() => false)};
  });
  const drop = markerV1(map, "yautjaDrop");
  const night = nextRandom(state) < rules.weather.nightChance;
  const rain = nextRandom(state) < rules.weather.rainChance;
  const wildlife: ReverseWildV1[] = [];
  for (let i = 0; i < rules.wildlife.count; i++) {
    for (let attempt = 0; attempt < 50; attempt++) {
      const tx = 8 + Math.floor(nextRandom(state) * (map.width - 16)), tz = 8 + Math.floor(nextRandom(state) * (map.depth - 16));
      const at = tileCenterV1(map, tx, tz);
      if (isWalkableV1(map, tx, tz) && distance(at, arrival) > 40 && distance(at, drop) > 30) {
        wildlife.push({id: "jaguar-" + i, ...at, facing: 0, health: rules.wildlife.health, attackTimer: 0, wanderX: at.x, wanderZ: at.z, fleeing: 0, repelled: false});
        break;
      }
    }
  }
  const extraction = markerV1(map, "extraction");
  Object.assign(state, {
    seed, time: 0, night, rain,
    yautja: {actor: createIslesActorV1(map, drop.x, drop.z, tuning.cloak), health: rules.yautja.health, heat: 0, overheated: false,
      strikeTimer: 0, plasmaTimer: 0, trophy: null, honor: 0, jammedFor: 0,
      selfDestruct: {phase: "none", timer: 0}, duel: {phase: "none", humanId: null, timer: 0}},
    humans, pieces, mast: markerV1(map, "radioMast"),
    extraction: {phase: "none", progress: 0, callerId: null, eta: 0, planeHits: 0, x: extraction.x, z: extraction.z},
    known: null, traps: [], flares: [], wildlife, log: [], outcome: null,
  } satisfies Omit<ReverseHuntStateV1, "rng">);
  say(state, "L’équipe débarque au village : " + humans.map(h => rules.roles[h.role].name).join(", ") + ".");
  say(state, (night ? "Nuit" : "Jour") + (rain ? " de pluie" : " sans pluie") + " sur Verdant.");
  return state;
}

/** Line of sight on the tile columns, from a human's eye to a point; bushes hide what is below their cover. */
export function lineOfSightV1(map: IslesMapV1, from: {x: number; y: number; z: number}, to: {x: number; y: number; z: number}, bushCover: number): boolean {
  const length = Math.hypot(to.x - from.x, to.z - from.z);
  const steps = Math.max(1, Math.ceil(length / 0.5));
  for (let i = 1; i < steps; i++) {
    const k = i / steps;
    const x = from.x + (to.x - from.x) * k, y = from.y + (to.y - from.y) * k, z = from.z + (to.z - from.z) * k;
    const [tx, tz] = tileAtV1(map, x, z);
    const kind = kindAtV1(map, tx, tz);
    const top = kind === "bush" ? bushCover : heightAtV1(map, tx, tz);
    if (y < top) return false;
  }
  return true;
}

/** Distance at which a human notices the Yautja, from its cloak, motion, water and the weather. */
export function detectionRangeV1(state: ReverseHuntStateV1, rules: ReverseHuntRulesV1): number {
  const p = rules.perception, a = state.yautja.actor;
  const moving = Math.hypot(a.vx, a.vz) > 0.6;
  let range = a.revealSeconds > 0 || a.swimming || a.wading ? p.revealedRange : a.cloaked ? (moving ? p.cloakedMovingRange : p.cloakedStillRange) : p.range;
  if (a.cloaked && state.rain) range *= p.rainCloakFactor;
  if (state.night && !a.cloaked) range *= p.nightFactor;
  const lit = state.flares.some(flare => flare.until > state.time && distance(flare, a) < (rules.roles.medic.flareRadius ?? 0));
  if (lit) range = Math.max(range, p.range);
  return range;
}

function canSee(state: ReverseHuntStateV1, map: IslesMapV1, rules: ReverseHuntRulesV1, human: ReverseHumanV1): boolean {
  const a = state.yautja.actor;
  const d = distance(human, a);
  if (d > detectionRangeV1(state, rules)) return false;
  const dx = (a.x - human.x) / (d || 1), dz = (a.z - human.z) / (d || 1);
  const ahead = Math.sin(human.facing) * dx + Math.cos(human.facing) * dz;
  if (d > 3 && ahead < rules.perception.coneDot) return false;
  return lineOfSightV1(map, {x: human.x, y: rules.perception.eyeHeight, z: human.z}, {x: a.x, y: a.y + 1.2, z: a.z}, rules.perception.bushCover);
}

const alive = (h: ReverseHumanV1) => h.status === "active" || h.status === "downed";
const armedActive = (h: ReverseHumanV1) => h.status === "active" && h.armed && h.disarmedFor <= 0;

function damageYautja(state: ReverseHuntStateV1, amount: number, source: string) {
  const y = state.yautja;
  if (y.health <= 0 || state.outcome) return;
  y.health = Math.max(0, y.health - amount);
  if (y.health <= 0) {
    y.selfDestruct = {phase: "offered", timer: 0};
    y.trophy = null;
    say(state, "Le Yautja s’effondre (" + source + "). Autodestruction possible.");
  }
}

function eliminate(state: ReverseHuntStateV1, rules: ReverseHuntRulesV1, human: ReverseHumanV1, status: "dead" | "trophy", armedAtBlow: boolean) {
  human.status = status;
  human.health = 0;
  dropPiece(state, human);
  if (status === "trophy") state.yautja.honor += rules.honor.trophy;
  if (armedAtBlow) state.yautja.honor += rules.honor.armedKill;
  say(state, human.name + (status === "trophy" ? " : trophée prélevé." : " est mort."));
}

function dropPiece(state: ReverseHuntStateV1, human: ReverseHumanV1) {
  if (!human.carrying) return;
  const piece = state.pieces.find(item => item.id === human.carrying)!;
  piece.carrier = null; piece.x = human.x; piece.z = human.z;
  human.carrying = null;
}

/** The Yautja hurts a human. Hurting a surrendered human is a grave fault that loses the match at once. */
function hurtHuman(state: ReverseHuntStateV1, rules: ReverseHuntRulesV1, human: ReverseHumanV1, amount: number) {
  if (human.disarmedFor > 0 || (!human.armed && human.status === "active")) {
    state.yautja.honor = 0;
    finish(state, rules, {winner: "humans", kind: "faute"});
    say(state, "Faute grave : " + human.name + " s’était rendu.");
    return;
  }
  const armedAtBlow = human.armed;
  if (human.status === "downed") { eliminate(state, rules, human, "dead", armedAtBlow); return; }
  human.health -= amount;
  if (human.health <= 0) {
    human.health = 0; human.status = "downed"; human.bleed = rules.downed.bleedSeconds; human.revive = 0;
    dropPiece(state, human);
    say(state, human.name + " est à terre.");
  }
}

function finish(state: ReverseHuntStateV1, rules: ReverseHuntRulesV1, partial: {winner: "humans" | "yautja"; kind: ReverseOutcomeKindV1}) {
  if (state.outcome) return;
  const escapedHumans = state.humans.filter(h => h.status === "escaped");
  const escapedWeight = escapedHumans.reduce((sum, h) => sum + (h.escapedUnarmed ? rules.surrender.extractionWeight : 1), 0);
  const living = state.humans.filter(alive).length;
  const humanScore = Math.round(escapedWeight * rules.score.escaped + (partial.kind === "tenir" ? living * rules.score.held : 0));
  if (partial.kind === "chasse-parfaite") state.yautja.honor += rules.honor.perfect;
  state.outcome = {...partial, humanScore, honor: state.yautja.honor, escaped: escapedHumans.length, alive: living};
  say(state, partial.winner === "humans" ? "Victoire des humains (" + partial.kind + ")." : "Victoire du Yautja (" + partial.kind + ").");
}

/** Plans a path once per goal key; a reached or unreachable goal is not planned again until the key changes. */
function goTo(map: IslesMapV1, human: ReverseHumanV1, target: {x: number; z: number}, key: string) {
  if (human.pathTarget === key) return;
  const [tx, tz] = tileAtV1(map, target.x, target.z);
  const goal = nearestWalkableV1(map, tx, tz) ?? [tx, tz];
  const start = nearestWalkableV1(map, ...tileAtV1(map, human.x, human.z)) ?? tileAtV1(map, human.x, human.z);
  human.path = findPathV1(map, start, goal) ?? [];
  human.pathTarget = key;
}

function walk(map: IslesMapV1, human: ReverseHumanV1, speed: number, dt: number, target?: {x: number; z: number}) {
  let budget = speed * dt;
  if (!human.path.length && target) {
    // Last metres, off the tile centres.
    const d = distance(human, target);
    if (d > 0.05 && d < 3) {
      const k = Math.min(1, budget / d), nx = human.x + (target.x - human.x) * k, nz = human.z + (target.z - human.z) * k;
      if (isWalkableV1(map, ...tileAtV1(map, nx, nz))) { human.facing = Math.atan2(target.x - human.x, target.z - human.z); human.x = nx; human.z = nz; }
    }
    return;
  }
  while (budget > 1e-6 && human.path.length) {
    const next = tileCenterV1(map, human.path[0][0], human.path[0][1]);
    const d = distance(human, next);
    if (d < 0.05) { human.path.shift(); continue; }
    const k = Math.min(1, budget / d);
    human.facing = Math.atan2(next.x - human.x, next.z - human.z);
    human.x += (next.x - human.x) * k; human.z += (next.z - human.z) * k;
    budget -= d * k;
    if (k >= 1) human.path.shift();
  }
}

function humanSpeed(map: IslesMapV1, rules: ReverseHuntRulesV1, human: ReverseHumanV1): number {
  const [tx, tz] = tileAtV1(map, human.x, human.z);
  return rules.roles[human.role].speed * (kindAtV1(map, tx, tz) === "ford" ? 0.6 : 1);
}

/** One AI decision and movement step for every human. */
function stepHumans(state: ReverseHuntStateV1, map: IslesMapV1, rules: ReverseHuntRulesV1, dt: number) {
  const a = state.yautja.actor, y = state.yautja;
  const yautjaUp = y.health > 0;
  const radioLink = state.humans.some(h => h.role === "radio" && alive(h));
  for (const human of state.humans) {
    if (human.status === "dead" || human.status === "trophy" || human.status === "escaped") continue;
    const role = rules.roles[human.role];
    human.fireTimer = Math.max(0, human.fireTimer - dt);
    human.abilityTimer = Math.max(0, human.abilityTimer - dt);
    if (human.disarmedFor > 0) {
      human.disarmedFor = Math.max(0, human.disarmedFor - dt);
      if (human.disarmedFor === 0) { human.armed = true; say(state, human.name + " reprend une arme."); }
    }
    if (human.status === "downed") {
      human.bleed -= dt;
      if (human.bleed <= 0) { eliminate(state, rules, human, "dead", false); continue; }
      if (yautjaUp && distance(human, a) < rules.downed.pistolRange && human.fireTimer <= 0 && canSee(state, map, rules, human)) {
        human.fireTimer = rules.downed.pistolSeconds;
        if (nextRandom(state) < 0.4) damageYautja(state, rules.downed.pistolDamage, human.name + " au pistolet");
      }
      continue;
    }
    // Perception and the shared picture of the hunter.
    if (yautjaUp && canSee(state, map, rules, human)) {
      human.seenAt = state.time;
      const share = radioLink || state.humans.some(o => o !== human && alive(o) && distance(o, human) < rules.perception.shareRange);
      if (share || !state.known) state.known = {x: a.x, z: a.z, at: state.time, marked: state.known?.marked ?? 0};
      if (human.role === "marksman" && a.cloaked && (state.known?.marked ?? 0) < state.time) {
        state.known = {x: a.x, z: a.z, at: state.time, marked: state.time + (role.markSeconds ?? 0)};
        say(state, human.name + " marque une distorsion.");
      }
      if (human.role === "radio" && !human.jamUsed && distance(human, a) < (role.jamRange ?? 0)) {
        human.jamUsed = true; y.jammedFor = role.jamSeconds ?? 0; say(state, human.name + " brouille le biomask.");
      }
      if (human.role === "medic" && human.flaresLeft > 0 && a.cloaked) {
        human.flaresLeft--; state.flares.push({x: human.x, z: human.z, until: state.time + (role.flareSeconds ?? 0)});
        say(state, human.name + " tire une fusée éclairante.");
      }
    }
    if (human.role === "tracker" && yautjaUp && human.abilityTimer <= 0 && distance(human, a) < (role.traceRange ?? 0) && state.time > rules.phases.arrivalEnd) {
      human.abilityTimer = role.traceCooldown ?? 30;
      state.known = {x: a.x, z: a.z, at: state.time, marked: state.time + (role.traceSeconds ?? 0)};
      say(state, human.name + " lit les traces du Yautja.");
    }
    if (state.known && (state.known.marked > state.time || state.known.at === state.time)) state.known.at = state.time;
    const knownFresh = state.known && state.time - state.known.at < rules.perception.memorySeconds;
    const threat = yautjaUp && knownFresh ? state.known! : null;

    // Surrender when alone, hurt and the hunter is close (decided once per human).
    if (human.armed && !human.surrenderDecided && human.health < rules.surrender.healthBelow && threat && distance(human, threat) < 12 &&
        !state.humans.some(o => o !== human && armedActive(o) && distance(o, human) < 15)) {
      human.surrenderDecided = true;
      if (nextRandom(state) < rules.surrender.chance) {
        human.armed = false; human.surrendered = true; human.disarmedFor = rules.surrender.disarmSeconds; dropPiece(state, human);
        say(state, human.name + " jette son arme et se rend.");
      }
    }

    // Decide a goal.
    const speed = humanSpeed(map, rules, human);
    const landed = state.extraction.phase === "landed";
    const downedAlly = state.humans.find(o => o.status === "downed" && distance(o, human) < 30);
    let moveTarget: {x: number; z: number} | null = null, key = "";
    let shooting = false;
    const duelActive = y.duel.phase === "active" && y.duel.humanId === human.id;

    if (duelActive) {
      human.goal = "duel"; moveTarget = a; key = "duel:" + Math.round(a.x) + "," + Math.round(a.z);
      if (distance(human, a) < 2 && human.fireTimer <= 0) { human.fireTimer = rules.duel.humanStrikeSeconds; damageYautja(state, rules.duel.humanDamage, "duel"); }
    } else if (landed) {
      human.goal = "embarquer"; moveTarget = state.extraction; key = "extraction";
    } else if (threat && human.armed && human.disarmedFor <= 0 && distance(human, threat) < role.range + 6) {
      human.goal = "combat";
      const d = distance(human, a);
      human.facing = Math.atan2(threat.x - human.x, threat.z - human.z);
      const seesNow = human.seenAt === state.time;
      if (seesNow && d <= role.range) {
        shooting = true;
        if (human.fireTimer <= 0) {
          human.fireTimer = role.fireSeconds;
          const chance = role.accuracy * (a.cloaked ? rules.perception.cloakedHitFactor : 1) * (1 - 0.5 * d / role.range);
          if (nextRandom(state) < chance) damageYautja(state, role.damage, human.name + " (" + role.weapon + ")");
        }
      } else if (human.health < 35 && d < 10) {
        human.goal = "repli";
        const allies = state.humans.filter(o => o !== human && armedActive(o));
        moveTarget = allies.length ? {x: allies.reduce((s, o) => s + o.x, 0) / allies.length, z: allies.reduce((s, o) => s + o.z, 0) / allies.length} : state.mast;
        key = "repli";
      } else {
        moveTarget = threat; key = "chasse:" + Math.round(threat.x / 4) + "," + Math.round(threat.z / 4);
      }
    } else if (downedAlly && (human.role === "medic" || !threat)) {
      human.goal = "relever " + downedAlly.name; moveTarget = downedAlly; key = "revive:" + downedAlly.id;
      if (distance(human, downedAlly) < rules.downed.reviveRadius) {
        moveTarget = null;
        downedAlly.revive += dt * (human.role === "medic" ? rules.roles.medic.reviveFactor ?? 1 : 1);
        if (downedAlly.revive >= rules.downed.reviveSeconds) {
          downedAlly.status = "active"; downedAlly.health = 35; downedAlly.revive = 0; say(state, human.name + " relève " + downedAlly.name + ".");
        }
      }
    } else {
      ({moveTarget, key} = objective(state, map, rules, human));
    }
    if (!shooting && moveTarget) {
      goTo(map, human, moveTarget, key);
      if (distance(human, moveTarget) > 0.8) walk(map, human, speed, dt, moveTarget);
    }
    // Pick up a piece lying here.
    if (human.armed && human.disarmedFor <= 0 && !human.carrying && !landed) {
      for (const piece of state.pieces) {
        if (!piece.carrier && distance(piece, human) < rules.pickupRadius) {
          piece.carrier = human.id; piece.found = true; human.carrying = piece.id; human.path = []; human.pathTarget = "";
          say(state, human.name + " trouve " + piece.name + ".");
          break;
        }
      }
    }
    // Mark empty candidate spots as searched.
    for (const piece of state.pieces) piece.candidates.forEach((spot, i) => {
      if (!piece.searched[i] && distance(spot, human) < rules.pickupRadius && (piece.found || i !== piece.positionIndex)) piece.searched[i] = true;
    });
    // Demolition sets traps near the mast and the pieces.
    const nearObjective = distance(human, state.mast) < 8 || state.pieces.some(p => p.candidates.some(c => distance(c, human) < 6));
    if (human.role === "demolition" && human.trapsLeft > 0 && nearObjective && !state.traps.some(t => distance(t, human) < 6) &&
        nextRandom(state) < dt / 4) {
      human.trapsLeft--; state.traps.push({x: human.x, z: human.z, armed: true}); say(state, human.name + " pose un piège.");
    }
    // Board the plane.
    if (landed && distance(human, state.extraction) < rules.extraction.boardRadius) {
      human.status = "escaped"; human.escapedUnarmed = !human.armed; dropPiece(state, human);
      say(state, human.name + " embarque dans l’hydravion.");
    }
  }
}

/** The team plan: search the pieces, bring them to the radio mast, call, then wait for the plane. */
function objective(state: ReverseHuntStateV1, map: IslesMapV1, rules: ReverseHuntRulesV1, human: ReverseHumanV1): {moveTarget: {x: number; z: number} | null; key: string} {
  const ext = state.extraction;
  if (ext.phase === "inbound") { human.goal = "rejoindre l’hydravion"; return {moveTarget: ext, key: "extraction"}; }
  if (human.carrying || (state.pieces.every(p => p.found) && ext.phase !== "gone")) {
    const allAtMast = state.pieces.every(p => p.carrier && distance(state.humans.find(h => h.id === p.carrier)!, state.mast) < rules.extraction.piecesRadius);
    human.goal = "garder la radio";
    if (allAtMast && ext.phase === "none") {
      const caller = state.humans.find(h => h.role === "radio" && armedActive(h)) ?? state.humans.find(h => armedActive(h) && distance(h, state.mast) < rules.extraction.piecesRadius);
      if (caller?.id === human.id) {
        human.goal = "appeler l’extraction";
        if (distance(human, state.mast) < rules.extraction.callRadius) {
          ext.callerId = human.id;
          return {moveTarget: null, key: ""};
        }
      }
    }
    return {moveTarget: state.mast, key: "mast"};
  }
  // Searchers: each human looks for the piece of its index, the rest go with them.
  const pending = state.pieces.filter(p => !p.found);
  if (!pending.length) { human.goal = "tenir"; return {moveTarget: state.mast, key: "mast"}; }
  const order = state.humans.indexOf(human);
  const piece = pending[order % pending.length];
  const spot = piece.candidates.findIndex((_, i) => !piece.searched[i]);
  const target = spot >= 0 ? piece.candidates[spot] : {x: piece.x, z: piece.z};
  if (state.time >= rules.phases.lastStand && !state.pieces.every(p => p.found)) { human.goal = "tenir"; return {moveTarget: state.mast, key: "mast"}; }
  human.goal = "chercher " + piece.name;
  return {moveTarget: target, key: "piece:" + piece.id + ":" + spot};
}

function stepExtraction(state: ReverseHuntStateV1, rules: ReverseHuntRulesV1, dt: number) {
  const ext = state.extraction;
  if (ext.phase === "none" || ext.phase === "calling") {
    const caller = state.humans.find(h => h.id === ext.callerId);
    const valid = caller && armedActive(caller) && distance(caller, state.mast) < rules.extraction.callRadius &&
      state.pieces.every(p => p.carrier && distance(state.humans.find(h => h.id === p.carrier)!, state.mast) < rules.extraction.piecesRadius);
    if (valid) {
      if (ext.phase === "none") say(state, caller.name + " appelle l’extraction.");
      ext.phase = "calling";
      ext.progress += dt * (caller.role === "radio" ? rules.roles.radio.callFactor ?? 1 : 1);
      if (ext.progress >= rules.extraction.callSeconds) {
        ext.phase = "inbound"; ext.eta = rules.extraction.arrivalSeconds; say(state, "L’hydravion arrive dans " + rules.extraction.arrivalSeconds + " s.");
      }
    } else {
      ext.callerId = null;
      if (ext.phase === "calling") ext.phase = "none";
    }
  } else if (ext.phase === "inbound") {
    ext.eta -= dt;
    if (ext.eta <= 0) { ext.phase = "landed"; say(state, "L’hydravion se pose sur le fleuve."); }
  }
}

function stepWildlife(state: ReverseHuntStateV1, map: IslesMapV1, rules: ReverseHuntRulesV1, dt: number) {
  const w = rules.wildlife, a = state.yautja.actor;
  for (const beast of state.wildlife) {
    if (beast.health <= 0) continue;
    beast.attackTimer = Math.max(0, beast.attackTimer - dt);
    beast.fleeing = Math.max(0, beast.fleeing - dt);
    const warden = state.humans.find(h => h.role === "warden" && h.status === "active" && distance(h, beast) < (rules.roles.warden.repelRange ?? 0));
    if (warden && beast.fleeing <= 0) {
      if (!beast.repelled) say(state, warden.name + " fait fuir un jaguar.");
      beast.fleeing = 6; beast.repelled = true;
    }
    const targets: {x: number; z: number; hit: () => void}[] = [];
    if (state.yautja.health > 0) targets.push({x: a.x, z: a.z, hit: () => damageYautja(state, w.damage, "jaguar")});
    for (const h of state.humans) if (h.status === "active") targets.push({x: h.x, z: h.z, hit: () => hurtByBeast(state, rules, h, w.damage)});
    const nearest = targets.sort((p, q) => distance(p, beast) - distance(q, beast))[0];
    let goal = {x: beast.wanderX, z: beast.wanderZ};
    if (beast.fleeing > 0 && warden) goal = {x: beast.x + (beast.x - warden.x), z: beast.z + (beast.z - warden.z)};
    else if (nearest && distance(nearest, beast) < w.aggroRange) {
      goal = nearest;
      if (distance(nearest, beast) < 1.4 && beast.attackTimer <= 0) { beast.attackTimer = w.attackSeconds; nearest.hit(); }
    } else if (distance(goal, beast) < 1 || nextRandom(state) < dt / 8) {
      beast.wanderX = Math.min(map.width * 2 - 4, Math.max(4, beast.x + (nextRandom(state) - 0.5) * 24));
      beast.wanderZ = Math.min(map.depth * 2 - 4, Math.max(4, beast.z + (nextRandom(state) - 0.5) * 24));
    }
    const d = distance(goal, beast);
    if (d > 0.5) {
      const nx = beast.x + (goal.x - beast.x) / d * w.speed * dt, nz = beast.z + (goal.z - beast.z) / d * w.speed * dt;
      if (isWalkableV1(map, ...tileAtV1(map, nx, nz))) { beast.x = nx; beast.z = nz; beast.facing = Math.atan2(goal.x - beast.x, goal.z - beast.z); }
      else { beast.wanderX = beast.x; beast.wanderZ = beast.z; }
    }
  }
}

function hurtByBeast(state: ReverseHuntStateV1, rules: ReverseHuntRulesV1, human: ReverseHumanV1, amount: number) {
  human.health -= amount;
  if (human.health <= 0) { human.health = 0; human.status = "downed"; human.bleed = rules.downed.bleedSeconds; dropPiece(state, human); say(state, human.name + " est à terre (jaguar)."); }
}

/** Nearest human in front of the Yautja within a range and a cone. */
function targetAhead(state: ReverseHuntStateV1, range: number, coneDot: number, filter: (h: ReverseHumanV1) => boolean): ReverseHumanV1 | null {
  const a = state.yautja.actor;
  let best: ReverseHumanV1 | null = null, bestD = Infinity;
  for (const h of state.humans) {
    if (!filter(h)) continue;
    const d = distance(h, a);
    if (d > range) continue;
    const ahead = d < 0.6 ? 1 : (Math.sin(a.facing) * (h.x - a.x) + Math.cos(a.facing) * (h.z - a.z)) / d;
    if (ahead < coneDot) continue;
    if (d < bestD) { best = h; bestD = d; }
  }
  return best;
}

/** Advances the match by dt seconds with the player's input. */
export function stepReverseHuntV1(state: ReverseHuntStateV1, input: ReverseHuntInputV1, map: IslesMapV1, rules: ReverseHuntRulesV1,
  tuning: ReverseTuningV1, rawDt: number): ReverseHuntStateV1 {
  if (state.outcome) return state;
  const dt = Math.min(Math.max(rawDt, 0), 0.05);
  state.time += dt;
  const y = state.yautja, Y = rules.yautja;
  y.strikeTimer = Math.max(0, y.strikeTimer - dt);
  y.plasmaTimer = Math.max(0, y.plasmaTimer - dt);
  y.jammedFor = Math.max(0, y.jammedFor - dt);
  y.heat = Math.max(0, y.heat - Y.plasmaCoolPerSecond * dt);
  if (y.overheated && y.heat <= 0) y.overheated = false;

  if (y.health > 0) {
    const taking = y.trophy !== null;
    const move = taking ? {...input, moveX: 0, moveZ: 0, jump: false, cloak: false} : input;
    const stepped = stepIslesActorV1(y.actor, move, map, tuning.movement, tuning.cloak, dt);
    y.actor = stepped.actor;
    if (taking && y.actor.cloaked) y.actor = {...y.actor, cloaked: false};
    const a = y.actor;
    // Traps.
    for (const trap of state.traps) {
      if (trap.armed && Math.hypot(trap.x - a.x, trap.z - a.z) < (rules.roles.demolition.trapRadius ?? 1) && a.y < 0.5) {
        trap.armed = false; damageYautja(state, rules.roles.demolition.trapDamage ?? 0, "piège");
        y.actor = {...y.actor, cloaked: false, revealSeconds: 3};
        state.known = {x: a.x, z: a.z, at: state.time, marked: state.time + 4};
        say(state, "Un piège se déclenche sous le Yautja.");
      }
    }
    // Duel offer when one armed human is left.
    const armed = state.humans.filter(armedActive);
    if (y.duel.phase === "none" && armed.length === 1 && state.humans.filter(alive).length >= 1 && state.time > rules.phases.arrivalEnd) {
      y.duel = {phase: "offered", humanId: armed[0].id, timer: rules.duel.offerSeconds};
      say(state, armed[0].name + " défie le Yautja en duel (Y pour accepter).");
    }
    if (y.duel.phase === "offered") {
      y.duel.timer -= dt;
      if (input.acceptDuel) {
        y.duel.phase = "active"; y.actor = {...y.actor, cloaked: false};
        const duelist = state.humans.find(h => h.id === y.duel.humanId)!;
        duelist.duelist = true; duelist.health = Math.max(duelist.health, rules.duel.humanHealth);
        say(state, "Duel accepté : masque et armes à distance retirés.");
      } else if (y.duel.timer <= 0) y.duel.phase = "done";
    }
    const dueling = y.duel.phase === "active";
    if (dueling && y.actor.cloaked) y.actor = {...y.actor, cloaked: false};
    // Strike.
    if (input.strike && y.strikeTimer <= 0 && !taking) {
      y.strikeTimer = Y.strikeSeconds;
      const reachable = (h: ReverseHumanV1) => h.status === "active" || h.status === "downed";
      // Aim goes to fighters first; a surrendered human is struck only when nobody else is in reach.
      const target = targetAhead(state, Y.strikeRange, Y.strikeArcDot, h => reachable(h) && h.disarmedFor <= 0) ??
        targetAhead(state, Y.strikeRange, Y.strikeArcDot, reachable);
      if (target && (!dueling || target.id === y.duel.humanId)) hurtHuman(state, rules, target, Y.strikeDamage);
      const beast = state.wildlife.find(b => b.health > 0 && Math.hypot(b.x - a.x, b.z - a.z) < Y.strikeRange);
      if (beast) { beast.health -= Y.strikeDamage; if (beast.health <= 0) say(state, "Le Yautja abat un jaguar."); }
    }
    // Plasma (overheats).
    if (input.plasma && !dueling && y.plasmaTimer <= 0 && !y.overheated && !taking) {
      y.plasmaTimer = Y.plasmaSeconds; y.heat += Y.plasmaHeat;
      if (y.heat >= Y.plasmaOverheat) { y.overheated = true; say(state, "Le canon plasma surchauffe."); }
      state.known = {x: a.x, z: a.z, at: state.time, marked: state.known?.marked ?? 0};
      const target = targetAhead(state, Y.plasmaRange, Y.plasmaConeDot, h => (h.status === "active" || h.status === "downed") && h.disarmedFor <= 0);
      if (target && lineOfSightV1(map, {x: a.x, y: a.y + 1.8, z: a.z}, {x: target.x, y: 1.2, z: target.z}, 0)) hurtHuman(state, rules, target, Y.plasmaDamage);
      else if (state.extraction.phase === "landed" && Math.hypot(state.extraction.x - a.x, state.extraction.z - a.z) < Y.plasmaRange) {
        state.extraction.planeHits++;
        if (state.extraction.planeHits >= rules.extraction.planeHits) {
          state.extraction = {...state.extraction, phase: "none", progress: 0, callerId: null, planeHits: 0};
          say(state, "L’hydravion redécolle sous le feu : il faut le rappeler.");
        }
      }
    }
    // Trophy (6 to 12 s, cloak off).
    if (input.trophyHeld && !state.outcome) {
      if (!y.trophy) {
        const down = state.humans.find(h => h.status === "downed" && Math.hypot(h.x - a.x, h.z - a.z) < rules.trophy.range);
        if (down) {
          const needed = rules.trophy.minSeconds + nextRandom(state) * (rules.trophy.maxSeconds - rules.trophy.minSeconds);
          y.trophy = {humanId: down.id, progress: 0, needed};
          y.actor = {...y.actor, cloaked: false};
          say(state, "Prélèvement du trophée de " + down.name + ".");
        }
      }
      if (y.trophy) {
        const human = state.humans.find(h => h.id === y.trophy!.humanId)!;
        if (human.status !== "downed") y.trophy = null;
        else {
          y.trophy.progress += dt;
          if (y.trophy.progress >= y.trophy.needed) { eliminate(state, rules, human, "trophy", true); y.trophy = null; }
        }
      }
    } else y.trophy = null;
  } else {
    const sd = y.selfDestruct;
    if (sd.phase === "offered") {
      sd.timer += dt;
      if (input.selfDestruct) { sd.phase = "counting"; sd.timer = rules.selfDestruct.countdownSeconds; say(state, "Autodestruction : 10 s pour sortir du rayon."); }
      else if (sd.timer >= rules.selfDestruct.offerSeconds) { sd.phase = "done"; finish(state, rules, {winner: "humans", kind: "abattu"}); }
    } else if (sd.phase === "counting") {
      sd.timer -= dt;
      if (sd.timer <= 0) {
        sd.phase = "done";
        const caught = state.humans.filter(h => alive(h) && Math.hypot(h.x - y.actor.x, h.z - y.actor.z) < rules.selfDestruct.radius);
        for (const h of caught) { h.status = "dead"; h.health = 0; dropPiece(state, h); }
        say(state, caught.length ? caught.length + " humain(s) emporté(s) par l’explosion." : "Tous les humains sont sortis du rayon.");
        if (!caught.length) finish(state, rules, {winner: "humans", kind: "autodestruction-parfaite"});
        else if (state.humans.some(alive) || state.humans.some(h => h.status === "escaped")) finish(state, rules, {winner: "humans", kind: "autodestruction"});
        else finish(state, rules, {winner: "yautja", kind: "autodestruction"});
      }
    }
  }
  if (state.outcome) return state;

  stepHumans(state, map, rules, dt);
  if (state.outcome) return state;
  stepExtraction(state, rules, dt);
  stepWildlife(state, map, rules, dt);

  // Self-destruct: the AI runs out of the blast radius.
  if (y.selfDestruct.phase === "counting") {
    for (const h of state.humans) if (h.status === "active") {
      const d = Math.hypot(h.x - y.actor.x, h.z - y.actor.z) || 1;
      const away = {x: h.x + (h.x - y.actor.x) / d * 30, z: h.z + (h.z - y.actor.z) / d * 30};
      goTo(map, h, away, "fuir l’explosion"); walk(map, h, humanSpeed(map, rules, h) * 1.2, dt);
    }
  }
  // Duel won by the human: he flees automatically.
  const duelist = state.humans.find(h => h.duelist);
  if (y.duel.phase === "active" && duelist && y.health <= 0 && y.selfDestruct.phase !== "counting") {
    duelist.status = "escaped"; y.duel.phase = "done"; finish(state, rules, {winner: "humans", kind: "duel"});
    return state;
  }

  // End conditions.
  const living = state.humans.filter(alive);
  const escaped = state.humans.filter(h => h.status === "escaped");
  if (state.extraction.phase === "landed" && escaped.length && !living.some(h => h.status === "active")) {
    finish(state, rules, {winner: "humans", kind: "fuite"});
  } else if (!living.length && y.selfDestruct.phase !== "counting") {
    if (escaped.length) finish(state, rules, {winner: "humans", kind: "fuite"});
    else finish(state, rules, {winner: "yautja", kind: state.humans.every(h => h.status === "trophy") ? "chasse-parfaite" : "chasse"});
  } else if (state.time >= rules.durationSeconds) {
    if (escaped.length) finish(state, rules, {winner: "humans", kind: "fuite"});
    else if (living.length >= 2) finish(state, rules, {winner: "humans", kind: "tenir"});
    else finish(state, rules, {winner: "yautja", kind: "chasse"});
  }
  return state;
}

/** Labels of the phase shown on the HUD (section 13.3, « Déroulé d’une partie »). */
export function reversePhaseLabelV1(state: ReverseHuntStateV1, rules: ReverseHuntRulesV1): string {
  if (state.time < rules.phases.arrivalEnd) return "Arrivée";
  if (state.time < rules.phases.searchEnd) return "Recherche des pièces";
  if (state.time < rules.phases.lastStand) return "Chasse";
  return "Dernières minutes";
}
